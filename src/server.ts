import express from 'express';
import path from 'path';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import fs from 'fs';
import { rimraf } from 'rimraf'; // Atualize a importação para a versão mais recente do rimraf
import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid'; // Adicionar importação para gerar UUIDs
import ControladorIndex from './controllers/index'; // Importa o controlador
import { definirRotas } from './routes/index';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Middleware para parsing de JSON com limite aumentado
app.use(express.json({ limit: '50mb' })); // Aumenta o limite para 50 MB
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Aumenta o limite para dados codificados em URL

const controladorIndex = new ControladorIndex(); // Instancia o controlador

const PORTA = process.env.PORT || 3000;

// Define as rotas
definirRotas(app);

// Configuração do MySQL
const configuracaoBanco = {
    host: 'localhost',
    user: 'root',
    password: 'Agnus@1907',
    database: 'multiwhats'
};

const pool = mysql.createPool(configuracaoBanco);

const inicializarBanco = async () => {
    const conexao = await pool.getConnection();
    await conexao.query(`CREATE DATABASE IF NOT EXISTS ${configuracaoBanco.database}`);
    await conexao.query(`USE ${configuracaoBanco.database}`);
    await conexao.execute(`
        CREATE TABLE IF NOT EXISTS mensagens (
            id VARCHAR(255) PRIMARY KEY,
            origem VARCHAR(255),
            destino VARCHAR(255),
            corpo TEXT,
            timestamp BIGINT
        )
    `);
    conexao.release();
};

inicializarBanco().catch(console.error);

// Serve arquivos estáticos do frontend React
app.use(express.static(path.join(__dirname, '..', 'dist')));

// Define explicitamente que conexoes é um array de strings
const conexoes: { id: string, status: string }[] = [];
const clientes: { [key: string]: Client } = {};
const qrCodes: { [key: string]: string } = {};
const mensagensProcessadas: Set<string> = new Set(); // Adicione um conjunto para rastrear mensagens processadas

// Função para garantir que o diretório de autenticação exista
const garantirDiretorioAutenticacao = (id: string) => {
    const diretorioAutenticacao = path.join(__dirname, '..', '.wwebjs_auth', `session-${id}`);
    if (!fs.existsSync(diretorioAutenticacao)) {
        fs.mkdirSync(diretorioAutenticacao, { recursive: true });
    }
};

// Função para limpar o diretório de autenticação
const limparDiretorioAutenticacao = async (id: string) => {
    const diretorioAutenticacao = path.join(__dirname, '..', '.wwebjs_auth', `session-${id}`);
    if (fs.existsSync(diretorioAutenticacao)) {
        try {
            await rimraf(diretorioAutenticacao); // Use a versão assíncrona do rimraf
            console.log(`Diretório de autenticação removido: ${diretorioAutenticacao}`);
        } catch (error) {
            console.error(`Erro ao limpar o diretório de autenticação: ${error}`);
        }
    }
};

// Garante que o diretório de uploads existe
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Diretório de uploads criado: ${uploadDir}`);
}

// Obter todas as conexões
app.get('/api/conexoes', (req, res) => {
    console.log('GET /api/conexoes', { conexoes });
    res.json(conexoes);
});

// Adicionar uma nova conexão
app.post('/api/conexoes', (req, res) => {
    const id = uuidv4(); // Gerar um ID único
    console.log('POST /api/conexoes', { id });

    if (!conexoes.some(conexao => conexao.id === id)) {
        conexoes.push({ id, status: 'inativo' });

        // Garante que o diretório de autenticação exista
        garantirDiretorioAutenticacao(id);

        res.status(201).json({ message: 'Conexão adicionada com sucesso', id }); // Retorna o ID gerado
    } else {
        res.status(400).json({ message: 'ID da conexão já existente' });
    }
});

// Ativar uma conexão
app.post('/api/ativar', (req, res) => {
    const { id }: { id: string } = req.body;
    console.log('POST /api/ativar', id);

    const conexao = conexoes.find(conexao => conexao.id === id);
    if (conexao) {
        // Garante que o diretório de autenticação exista
        garantirDiretorioAutenticacao(id);

        // Cria um novo cliente do WhatsApp Web
        const cliente = new Client({
            authStrategy: new LocalAuth({ clientId: id })
        });

        clientes[id] = cliente;

        cliente.on('qr', (qr) => {
            console.log('QR RECEIVED', qr);
            qrcode.toDataURL(qr, (err, url) => {
                if (err) {
                    console.error('Erro ao gerar QR Code:', err);
                } else {
                    qrCodes[id] = url;
                    io.emit('qrCodeUpdated', { id, qrCode: url });
                }
            });
        });

        cliente.on('ready', () => {
            console.log('Client is ready!');
            conexao.status = 'ativo';
            io.emit('statusUpdated', { id, status: 'ativo' });
        });

        cliente.on('disconnected', async (reason) => {
            console.log('Client is disconnected!', reason);
            conexao.status = 'inativo';
            io.emit('statusUpdated', { id, status: 'inativo' });
            try {
                await cliente.logout();
            } catch (e) {
                if (e instanceof Error) {
                    console.error('Erro ao deslogar:', e.message);
                } else {
                    console.error('Erro desconhecido ao deslogar:', e);
                }
            } finally {
                try {
                    await cliente.destroy();
                } catch (e) {
                    if (e instanceof Error) {
                        console.error('Erro ao destruir cliente:', e.message);
                    } else {
                        console.error('Erro desconhecido ao destruir cliente:', e);
                    }
                }
                delete clientes[id];
            }
        });

        // Armazenar mensagens recebidas no banco de dados
        cliente.on('message', async (msg) => {
            if (msg.from === 'status@broadcast') {
                console.log('Mensagem ignorada: status@broadcast');
                return; // Ignorar mensagens de broadcast
            }

            if (!mensagensProcessadas.has(msg.id._serialized)) {
                console.log('MESSAGE RECEIVED', msg);

                const isMe = msg.from === cliente.info.wid._serialized;

                let mediaUrl: string | null = null; // Update the type to allow both string and null
                if (msg.hasMedia) {
                    try {
                        const media = await msg.downloadMedia();
                        if (media) {
                            // Salvar a mídia em um diretório local ou em um serviço de armazenamento
                            const filePath = path.join(__dirname, 'media', `${msg.id._serialized}.${media.mimetype.split('/')[1]}`);
                            fs.writeFileSync(filePath, media.data, 'base64');
                            mediaUrl = `/media/${msg.id._serialized}.${media.mimetype.split('/')[1]}`;
                        }
                    } catch (error) {
                        console.error('Erro ao baixar mídia:', error);
                    }
                }

                io.emit('messageReceived', {
                    idConexao: id,
                    from: msg.from,
                    body: msg.body,
                    timestamp: msg.timestamp,
                    isMe,
                    mediaUrl,
                });

                mensagensProcessadas.add(msg.id._serialized);

                try {
                    const conexao = await pool.getConnection();
                    const mensagemId = msg.id._serialized;

                    const [rows] = await conexao.execute(
                        'SELECT id FROM mensagens WHERE id = ?',
                        [mensagemId]
                    );

                    if ((rows as mysql.RowDataPacket[]).length === 0) {
                        await conexao.execute(
                            'INSERT INTO mensagens (id, origem, destino, corpo, timestamp) VALUES (?, ?, ?, ?, ?)',
                            [mensagemId, msg.from, msg.to, msg.body, msg.timestamp]
                        );
                    }

                    conexao.release();
                } catch (error) {
                    console.error('Erro ao salvar mensagem no banco de dados:', error);
                }
            }
        });

        cliente.initialize();

        res.status(200).json({ message: 'Conexão ativada com sucesso', qrCode: qrCodes[id] });
    } else {
        res.status(404).json({ message: 'Conexão não encontrada' });
    }
});

// Desativar uma conexão
app.post('/api/desativar', async (req, res) => {
    const { id }: { id: string } = req.body;
    console.log('POST /api/desativar', id);

    const conexao = conexoes.find(conexao => conexao.id === id);
    if (conexao) {
        if (clientes[id]) {
            try {
                await clientes[id].logout();
            } catch (e) {
                if (e instanceof Error) {
                    console.error('Erro ao deslogar:', e.message);
                } else {
                    console.error('Erro desconhecido ao deslogar:', e);
                }
            } finally {
                try {
                    await clientes[id].destroy();
                } catch (e) {
                    if (e instanceof Error) {
                        console.error('Erro ao destruir cliente:', e.message);
                    } else {
                        console.error('Erro desconhecido ao destruir cliente:', e);
                    }
                }
                delete clientes[id];
            }
        }
        conexao.status = 'inativo';
        io.emit('statusUpdated', { id, status: 'inativo' });

        // Limpa o diretório de autenticação
        await limparDiretorioAutenticacao(id);

        res.status(200).json({ message: 'Conexão desativada com sucesso' });
    } else {
        res.status(404).json({ message: 'Conexão não encontrada' });
    }
});

// Obter QR Code de uma conexão existente
app.get('/api/qrcode/:id', (req, res) => {
    const { id }: { id: string } = req.params;
    console.log('GET /api/qrcode/:id', id);

    if (conexoes.some(conexao => conexao.id === id)) {
        if (qrCodes[id]) {
            res.json({ qrCode: qrCodes[id] });
        } else {
            res.status(404).json({ message: 'QR Code não encontrado' });
        }
    } else {
        res.status(404).json({ message: 'Conexão não encontrada' });
    }
});

// Obter detalhes de uma conexão específica
app.get('/api/conexoes/:id', (req, res) => {
    const { id } = req.params;
    console.log('GET /api/conexoes/:id', id);

    const conexao = conexoes.find(conexao => conexao.id === id);
    if (conexao) {
        res.json(conexao);
    } else {
        res.status(404).json({ message: 'Conexão não encontrada' });
    }
});

// Função utilitária para validar e formatar o número
const validarNumero = (numero: string): string | null => {
    if (!numero) return null;
    // Adicionar o sufixo @c.us se não estiver presente
    if (!numero.includes('@')) {
        return `${numero}@c.us`;
    }
    return numero;
};

// Obter nome do contato
app.get('/api/nome-contato/:numero', async (req, res) => {
    const { numero } = req.params;
    console.log('GET /api/nome-contato/:numero', numero);

    const numeroValidado = validarNumero(numero);
    if (!numeroValidado) {
        console.error('Erro: Número inválido.');
        return res.status(400).json({ message: 'Número inválido.' });
    }

    const cliente = clientes[Object.keys(clientes)[0]]; // Usar o primeiro cliente disponível
    if (!cliente) {
        console.error('Erro: Nenhum cliente ativo encontrado.');
        return res.status(404).json({ message: 'Nenhum cliente ativo encontrado.' });
    }

    try {
        const contato = await cliente.getContactById(numeroValidado);
        if (!contato) {
            console.error(`Erro: Contato não encontrado para o número ${numeroValidado}.`);
            return res.status(404).json({ message: 'Contato não encontrado.' });
        }

        res.json({ name: contato.pushname || contato.name || numero });
    } catch (error) {
        if (error instanceof Error) {
            console.error('Erro ao obter nome do contato:', error.message);
        } else {
            console.error('Erro desconhecido ao obter nome do contato:', error);
        }
        res.status(500).json({ message: 'Erro ao obter nome do contato.' });
    }
});

// Obter foto de perfil do contato
app.get('/api/foto-perfil/:numero', async (req, res) => {
    const { numero } = req.params;
    console.log('GET /api/foto-perfil/:numero', numero);

    const numeroValidado = validarNumero(numero);
    if (!numeroValidado) {
        console.error('Erro: Número inválido.');
        return res.status(400).json({ message: 'Número inválido.' });
    }

    const cliente = clientes[Object.keys(clientes)[0]]; // Usar o primeiro cliente disponível
    if (!cliente) {
        console.error('Erro: Nenhum cliente ativo encontrado.');
        return res.status(404).json({ message: 'Nenhum cliente ativo encontrado.' });
    }

    try {
        const urlFotoPerfil = await cliente.getProfilePicUrl(numeroValidado);
        if (!urlFotoPerfil) {
            console.error(`Erro: Foto de perfil não encontrada para o número ${numeroValidado}.`);
            return res.status(404).json({ message: 'Foto de perfil não encontrada.' });
        }

        res.json({ profilePicUrl: urlFotoPerfil });
    } catch (error) {
        if (error instanceof Error) {
            console.error('Erro ao obter foto de perfil:', error.message);
        } else {
            console.error('Erro desconhecido ao obter foto de perfil:', error);
        }
        res.status(500).json({ message: 'Erro ao obter foto de perfil.' });
    }
});

// Ajustar a consulta SQL para recuperar mensagens enviadas e recebidas
app.get('/api/historico-conversas/:id', async (req, res) => {
    const { id } = req.params;
    console.log('GET /api/historico-conversas/:id', id);

    try {
        const conexao = await pool.getConnection();
        const [rows] = await conexao.execute(
            `SELECT * FROM mensagens 
             WHERE origem = ? OR destino = ? 
             ORDER BY timestamp ASC`,
            [id, id]
        );
        conexao.release();

        const conversas = (rows as mysql.RowDataPacket[]).reduce((acc, row) => {
            const numero = row.origem === id ? row.destino : row.origem; // Identifica o outro participante da conversa
            const numeroNormalizado = numero.replace('@c.us', ''); // Remove o sufixo @c.us para padronizar
            if (!acc[numeroNormalizado]) {
                acc[numeroNormalizado] = {
                    id: numeroNormalizado,
                    name: numeroNormalizado,
                    number: numeroNormalizado,
                    messages: [],
                    unread: 0,
                    active: false,
                    profilePicUrl: null,
                };
            }
            acc[numeroNormalizado].messages.push({
                id: row.id,
                from: row.origem.replace('@c.us', ''), // Normaliza o número do remetente
                to: row.destino.replace('@c.us', ''), // Normaliza o número do destinatário
                body: row.corpo,
                timestamp: row.timestamp,
                isMe: row.origem === id, // Identifica se a mensagem foi enviada por você
            });
            return acc;
        }, {} as { [key: string]: any });

        res.json(Object.values(conversas));
    } catch (error) {
        if (error instanceof Error) {
            console.error('Erro ao obter histórico de conversas:', error.message);
        } else {
            console.error('Erro desconhecido ao obter histórico de conversas:', error);
        }
        res.status(500).json({ message: 'Erro ao obter histórico de conversas' });
    }
});

// Remover uma conexão
app.delete('/api/conexoes', async (req, res) => {
    const { id }: { id: string } = req.body;
    console.log('DELETE /api/conexoes', id);

    if (!id) {
        console.error('Erro: ID da conta não fornecido.');
        return res.status(400).json({ message: 'ID da conta é obrigatório.' });
    }

    const index = conexoes.findIndex(conexao => conexao.id === id);
    if (index !== -1) {
        conexoes.splice(index, 1);
        if (clientes[id]) {
            try {
                await clientes[id].logout();
            } catch (e) {
                if (e instanceof Error) {
                    console.error('Erro ao deslogar:', e.message);
                } else {
                    console.error('Erro desconhecido ao deslogar:', e);
                }
            } finally {
                try {
                    await clientes[id].destroy();
                } catch (e) {
                    if (e instanceof Error) {
                        console.error('Erro ao destruir cliente:', e.message);
                    } else {
                        console.error('Erro desconhecido ao destruir cliente:', e);
                    }
                }
                delete clientes[id];
            }
        }
        delete qrCodes[id];

        // Limpa o diretório de autenticação
        await limparDiretorioAutenticacao(id);

        console.log('Conexão removida com sucesso:', id);
        res.status(200).json({ message: 'Conexão removida com sucesso' });
    } else {
        console.error('Erro: Conexão não encontrada.');
        res.status(404).json({ message: 'Conexão não encontrada.' });
    }
});

// Enviar mensagem
app.post('/api/mensagens', async (req, res) => {
    const { idConexao, numero, mensagem }: { idConexao: string, numero: string, mensagem: string } = req.body;
    console.log('POST /api/mensagens', { idConexao, numero, mensagem });

    if (!idConexao) { // Verificar se o ID da conexão é válido
        console.error('Erro: ID inválido para conexão.', { idConexao });
        return res.status(400).json({ message: 'ID inválido para conexão.' });
    }

    const cliente = clientes[idConexao];
    if (cliente) {
        try {
            const numeroFormatado = numero.includes('@c.us') ? numero : `${numero}@c.us`;
            console.log(`Enviando mensagem para ${numeroFormatado} usando ID: ${idConexao}`);
            await cliente.sendMessage(numeroFormatado, mensagem);

            const conexao = await pool.getConnection();
            const mensagemId = uuidv4(); // Gerar um ID único para a mensagem
            await conexao.execute(
                'INSERT INTO mensagens (id, origem, destino, corpo, timestamp) VALUES (?, ?, ?, ?, ?)',
                [mensagemId, idConexao, numeroFormatado, mensagem, Date.now()]
            );
            conexao.release();

            res.status(200).json({ message: 'Mensagem enviada com sucesso' });
        } catch (error) {
            if (error instanceof Error) {
                console.error('Erro ao enviar mensagem:', error.message);
            } else {
                console.error('Erro desconhecido ao enviar mensagem:', error);
            }
            res.status(500).json({ message: 'Erro ao enviar mensagem' });
        }
    } else {
        console.error('Erro: Conexão não encontrada.', { idConexao });
        res.status(404).json({ message: 'Conexão não encontrada' });
    }
});

// Servir arquivos de mídia
app.use('/media', express.static(path.join(__dirname, 'media')));

// Rota para servir o frontend React (caso seja um SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// Inicializa o servidor
httpServer.listen(PORTA, () => {
    console.log(`Servidor rodando na porta ${PORTA}`);
});