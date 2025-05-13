"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_1 = __importDefault(require("qrcode"));
const fs_1 = __importDefault(require("fs"));
const rimraf_1 = require("rimraf"); // Atualize a importação para a versão mais recente do rimraf
const promise_1 = __importDefault(require("mysql2/promise"));
const uuid_1 = require("uuid"); // Adicionar importação para gerar UUIDs
const index_1 = __importDefault(require("./controllers/index")); // Importa o controlador
const index_2 = require("./routes/index");
const winston_1 = __importDefault(require("winston"));
const whatsappService_1 = require("./services/whatsappService"); // Importa a função convertAudio
// Configuração do logger
const logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'logs/server.log' })
    ]
});
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer);
// Middleware para parsing de JSON com limite aumentado
app.use(express_1.default.json({ limit: '50mb' })); // Aumenta o limite para 50 MB
app.use(express_1.default.urlencoded({ limit: '50mb', extended: true })); // Aumenta o limite para dados codificados em URL
const controladorIndex = new index_1.default(); // Instancia o controlador
const PORTA = process.env.PORT || 3000;
(0, index_2.definirRotas)(app);
// Configuração do MySQL
const configuracaoBanco = {
    host: 'localhost',
    user: 'root',
    password: 'Agnus@1907',
    database: 'multiwhats'
};
const pool = promise_1.default.createPool(configuracaoBanco);
const inicializarBanco = () => __awaiter(void 0, void 0, void 0, function* () {
    const conexao = yield pool.getConnection();
    yield conexao.query(`CREATE DATABASE IF NOT EXISTS ${configuracaoBanco.database}`);
    yield conexao.query(`USE ${configuracaoBanco.database}`);
    yield conexao.execute(`
        CREATE TABLE IF NOT EXISTS mensagens (
            id VARCHAR(255) PRIMARY KEY,
            origem VARCHAR(255),
            destino VARCHAR(255),
            corpo TEXT,
            timestamp BIGINT
        )
    `);
    conexao.release();
});
inicializarBanco().catch(console.error);
// Serve arquivos estáticos do frontend React
app.use(express_1.default.static(path_1.default.join(__dirname, '../../frontend/build')));
// Define explicitamente que conexoes é um array de strings
const conexoes = []; // Conexões mantidas apenas em memória
const clientes = {};
const qrCodes = {};
const mensagensProcessadas = new Set(); // Adicione um conjunto para rastrear mensagens processadas
// Função para limpar o diretório de autenticação
const limparDiretorioAutenticacao = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const diretorioAutenticacao = path_1.default.join(__dirname, '..', '.wwebjs_auth', `session-${id}`);
    if (fs_1.default.existsSync(diretorioAutenticacao)) {
        try {
            yield (0, rimraf_1.rimraf)(diretorioAutenticacao); // Use a versão assíncrona do rimraf
            logger.info(`Diretório de autenticação removido: ${diretorioAutenticacao}`);
        }
        catch (error) {
            logger.error(`Erro ao limpar o diretório de autenticação: ${error}`);
        }
    }
});
// Garante que o diretório de mídia exista
const mediaDir = path_1.default.join(__dirname, 'media');
if (!fs_1.default.existsSync(mediaDir)) {
    fs_1.default.mkdirSync(mediaDir, { recursive: true });
}
// Garante que o diretório de uploads existe
const uploadDir = path_1.default.join(__dirname, '..', 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Diretório de uploads criado: ${uploadDir}`);
}
// Adicionar uma nova conexão
app.post('/api/conexoes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = (0, uuid_1.v4)(); // Gerar um ID único
    logger.info('POST /api/conexoes', { id });
    if (!conexoes.some(conexao => conexao.id === id)) {
        conexoes.push({ id, status: 'inativo' });
        res.status(201).json({ message: 'Conexão adicionada com sucesso', id }); // Retorna o ID gerado
    }
    else {
        res.status(400).json({ message: 'ID da conexão já existente' });
    }
}));
// Ativar uma conexão
app.post('/api/ativar', (req, res) => {
    const { id } = req.body;
    logger.info('POST /api/ativar', id);
    const conexao = conexoes.find(conexao => conexao.id === id);
    if (conexao) {
        // Cria um novo cliente do WhatsApp Web
        const pathAuth = path_1.default.join(__dirname, '../../.wwebjs_auth');
        const cliente = new whatsapp_web_js_1.Client({
            authStrategy: new whatsapp_web_js_1.LocalAuth({ clientId: id, dataPath: pathAuth })
        });
        clientes[id] = cliente;
        cliente.on('qr', (qr) => {
            logger.info('QR RECEIVED', qr);
            qrcode_1.default.toDataURL(qr, (err, url) => {
                if (err) {
                    logger.error('Erro ao gerar QR Code:', err);
                }
                else {
                    qrCodes[id] = url;
                    io.emit('qrCodeUpdated', { id, qrCode: url });
                }
            });
        });
        cliente.on('ready', () => {
            logger.info(`Cliente ${id} está pronto!`);
            conexao.status = 'ativo';
            io.emit('statusUpdated', { id, status: 'ativo' });
            logger.info('Conexões ativas no momento:', conexoes.map(c => ({ id: c.id, status: c.status })));
        });
        cliente.on('disconnected', (reason) => __awaiter(void 0, void 0, void 0, function* () {
            logger.info('Client is disconnected!', reason);
            conexao.status = 'inativo';
            io.emit('statusUpdated', { id, status: 'inativo' });
            try {
                yield cliente.logout();
            }
            catch (e) {
                logger.error('Erro ao deslogar:', e);
            }
            finally {
                try {
                    yield cliente.destroy();
                }
                catch (e) {
                    logger.error('Erro ao destruir cliente:', e);
                }
                delete clientes[id];
            }
        }));
        // Armazenar mensagens recebidas no banco de dados
        cliente.on('message', (msg) => __awaiter(void 0, void 0, void 0, function* () {
            if (msg.from === 'status@broadcast') {
                logger.info('Mensagem ignorada: status@broadcast');
                return; // Ignorar mensagens de broadcast
            }
            if (!mensagensProcessadas.has(msg.id._serialized)) {
                logger.info('MESSAGE RECEIVED', msg);
                const isMe = msg.from === cliente.info.wid._serialized;
                let mediaUrl = null; // Update the type to allow both string and null
                if (msg.hasMedia) {
                    try {
                        const media = yield msg.downloadMedia();
                        if (media) {
                            // Salvar a mídia em um diretório local ou em um serviço de armazenamento
                            // Corrige o nome do arquivo para evitar valores inválidos
                            const fileName = `${msg.id._serialized}.${media.mimetype.split('/')[1]}`;
                            const filePath = path_1.default.join(mediaDir, fileName);
                            fs_1.default.writeFileSync(filePath, media.data, 'base64');
                            mediaUrl = `/media/${fileName}`;
                        }
                    }
                    catch (error) {
                        logger.error('Erro ao baixar mídia:', error);
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
                    const conexao = yield pool.getConnection();
                    const mensagemId = msg.id._serialized;
                    const [rows] = yield conexao.execute('SELECT id FROM mensagens WHERE id = ?', [mensagemId]);
                    if (rows.length === 0) {
                        yield conexao.execute('INSERT INTO mensagens (id, origem, destino, corpo, timestamp) VALUES (?, ?, ?, ?, ?)', [mensagemId, msg.from, msg.to, msg.body, msg.timestamp]);
                    }
                    conexao.release();
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                    logger.error('Erro ao salvar mensagem no banco de dados:', errorMessage);
                }
            }
        }));
        cliente.initialize();
        res.status(200).json({ message: 'Conexão ativada com sucesso', qrCode: qrCodes[id] });
    }
    else {
        res.status(404).json({ message: 'Conexão não encontrada' });
    }
});
// Desativar uma conexão
app.post('/api/desativar', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.body;
    logger.info('POST /api/desativar', id);
    const conexao = conexoes.find(conexao => conexao.id === id);
    if (conexao) {
        if (clientes[id]) {
            try {
                yield clientes[id].logout();
            }
            catch (e) {
                logger.error('Erro ao deslogar:', e);
            }
            finally {
                try {
                    yield clientes[id].destroy();
                }
                catch (e) {
                    logger.error('Erro ao destruir cliente:', e);
                }
                delete clientes[id];
            }
        }
        conexao.status = 'inativo';
        io.emit('statusUpdated', { id, status: 'inativo' });
        // Limpa o diretório de autenticação
        yield limparDiretorioAutenticacao(id);
        res.status(200).json({ message: 'Conexão desativada com sucesso' });
    }
    else {
        res.status(404).json({ message: 'Conexão não encontrada' });
    }
}));
// Obter QR Code de uma conexão existente
app.get('/api/qrcode/:id', (req, res) => {
    const { id } = req.params;
    logger.info('GET /api/qrcode/:id', id);
    if (conexoes.some(conexao => conexao.id === id)) {
        if (qrCodes[id]) {
            res.json({ qrCode: qrCodes[id] });
        }
        else {
            res.status(404).json({ message: 'QR Code não encontrado' });
        }
    }
    else {
        res.status(404).json({ message: 'Conexão não encontrada' });
    }
});
// Obter detalhes de uma conexão específica
app.get('/api/conexoes/:id', (req, res) => {
    const { id } = req.params;
    logger.info('GET /api/conexoes/:id', id);
    const conexao = conexoes.find(conexao => conexao.id === id);
    if (conexao) {
        res.json(conexao);
    }
    else {
        res.status(404).json({ message: 'Conexão não encontrada' });
    }
});
// Rota para listar todas as conexões
app.get('/api/conexoes', (req, res) => {
    logger.info('GET /api/conexoes');
    res.json(conexoes); // Retorna todas as conexões armazenadas
});
// Função utilitária para validar e formatar o número
const validarNumero = (numero) => {
    if (!numero)
        return null;
    // Adicionar o sufixo @c.us se não estiver presente
    if (!numero.includes('@')) {
        return `${numero}@c.us`;
    }
    return numero;
};
// Obter nome do contato
app.get('/api/nome-contato/:numero', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { numero } = req.params;
    logger.info('GET /api/nome-contato/:numero', numero);
    const numeroValidado = validarNumero(numero);
    if (!numeroValidado) {
        logger.error('Erro: Número inválido.');
        return res.status(400).json({ message: 'Número inválido.' });
    }
    const cliente = clientes[Object.keys(clientes)[0]]; // Usar o primeiro cliente disponível
    if (!cliente) {
        logger.error('Erro: Nenhum cliente ativo encontrado.');
        return res.status(404).json({ message: 'Nenhum cliente ativo encontrado.' });
    }
    try {
        const contato = yield cliente.getContactById(numeroValidado);
        if (!contato) {
            logger.error(`Erro: Contato não encontrado para o número ${numeroValidado}.`);
            return res.status(404).json({ message: 'Contato não encontrado.' });
        }
        res.json({ name: contato.pushname || contato.name || numero });
    }
    catch (error) {
        if (error instanceof Error) {
            logger.error('Erro ao obter nome do contato:', error.message);
        }
        else {
            logger.error('Erro desconhecido ao obter nome do contato:', error);
        }
        res.status(500).json({ message: 'Erro ao obter nome do contato.' });
    }
}));
// Obter foto de perfil do contato
app.get('/api/foto-perfil/:numero', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { numero } = req.params;
    logger.info('GET /api/foto-perfil/:numero', numero);
    const numeroValidado = validarNumero(numero);
    if (!numeroValidado) {
        logger.error('Erro: Número inválido.');
        return res.status(400).json({ message: 'Número inválido.' });
    }
    const cliente = clientes[Object.keys(clientes)[0]]; // Usar o primeiro cliente disponível
    if (!cliente) {
        logger.error('Erro: Nenhum cliente ativo encontrado.');
        return res.status(404).json({ message: 'Nenhum cliente ativo encontrado.' });
    }
    try {
        const urlFotoPerfil = yield cliente.getProfilePicUrl(numeroValidado);
        if (!urlFotoPerfil) {
            logger.error(`Erro: Foto de perfil não encontrada para o número ${numeroValidado}.`);
            return res.status(404).json({ message: 'Foto de perfil não encontrada.' });
        }
        res.json({ profilePicUrl: urlFotoPerfil });
    }
    catch (error) {
        if (error instanceof Error) {
            logger.error('Erro ao obter foto de perfil:', error.message);
        }
        else {
            logger.error('Erro desconhecido ao obter foto de perfil:', error);
        }
        res.status(500).json({ message: 'Erro ao obter foto de perfil.' });
    }
}));
// Ajustar a consulta SQL para recuperar mensagens enviadas e recebidas
app.get('/api/historico-conversas/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    logger.info('GET /api/historico-conversas/:id', id);
    try {
        const conexao = yield pool.getConnection();
        const [rows] = yield conexao.execute(`SELECT * FROM mensagens 
             WHERE origem = ? OR destino = ? 
             ORDER BY timestamp ASC`, [id, id]);
        conexao.release();
        const conversas = rows.reduce((acc, row) => {
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
                from: row.origem.replace('@c.us', ''),
                to: row.destino.replace('@c.us', ''),
                body: row.corpo,
                timestamp: row.timestamp,
                isMe: row.origem === id, // Identifica se a mensagem foi enviada por você
            });
            return acc;
        }, {});
        res.json(Object.values(conversas));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error('Erro ao obter histórico de conversas:', errorMessage);
        res.status(500).json({ message: 'Erro ao obter histórico de conversas', details: errorMessage });
    }
}));
// Remover uma conexão
app.delete('/api/conexoes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.body;
    logger.info('DELETE /api/conexoes', id);
    if (!id) {
        logger.error('Erro: ID da conta não fornecido.');
        return res.status(400).json({ message: 'ID da conta é obrigatório.' });
    }
    const index = conexoes.findIndex(conexao => conexao.id === id);
    if (index !== -1) {
        conexoes.splice(index, 1);
        if (clientes[id]) {
            try {
                yield clientes[id].logout();
            }
            catch (e) {
                logger.error('Erro ao deslogar:', e);
            }
            finally {
                try {
                    yield clientes[id].destroy();
                }
                catch (e) {
                    logger.error('Erro ao destruir cliente:', e);
                }
                delete clientes[id];
            }
        }
        delete qrCodes[id];
        // Limpa o diretório de autenticação
        yield limparDiretorioAutenticacao(id);
        logger.info('Conexão removida com sucesso:', id);
        res.status(200).json({ message: 'Conexão removida com sucesso' });
    }
    else {
        logger.error('Erro: Conexão não encontrada.');
        res.status(404).json({ message: 'Conexão não encontrada' });
    }
}));
// Enviar mensagem de texto
app.post('/api/mensagens', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { idConexao, numero, mensagem } = req.body;
    if (!idConexao || !numero || !mensagem) {
        logger.error('Erro: ID da conexão, número e mensagem são obrigatórios.', { idConexao, numero });
        return res.status(400).json({ message: 'ID da conexão, número e mensagem são obrigatórios.' });
    }
    const cliente = clientes[idConexao];
    if (!cliente) {
        logger.error('Erro: Conexão não encontrada.', { idConexao });
        return res.status(404).json({ message: 'Conexão não encontrada' });
    }
    try {
        const numeroFormatado = numero.includes('@c.us') ? numero : `${numero}@c.us`;
        yield cliente.sendMessage(numeroFormatado, mensagem);
        logger.info(`Mensagem de texto enviada para ${numeroFormatado} usando ID: ${idConexao}`);
        res.status(200).json({ message: 'Mensagem enviada com sucesso' });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error('Erro ao enviar mensagem de texto:', errorMessage);
        res.status(500).json({ message: 'Erro ao enviar mensagem de texto', details: errorMessage });
    }
}));
app.post('/api/mensagens/voz', controladorIndex.upload, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Requisição recebida na rota /api/mensagens/voz');
    const { idConexao, numero } = req.body;
    const arquivo = req.file;
    if (!idConexao || !numero || !arquivo) {
        console.error('Erro: ID da conexão, número ou arquivo ausente.');
        return res.status(400).json({ message: 'ID da conexão, número e arquivo são obrigatórios.' });
    }
    console.log(`Arquivo recebido: ${arquivo.originalname}, Tamanho: ${arquivo.size} bytes`);
    const cliente = clientes[idConexao];
    if (!cliente) {
        return res.status(404).json({ message: 'Conexão não encontrada' });
    }
    try {
        const numeroFormatado = numero.includes('@c.us') ? numero : `${numero}@c.us`;
        // Salvar o arquivo no disco antes de processá-lo
        const tempDir = path_1.default.join(__dirname, 'temp');
        if (!fs_1.default.existsSync(tempDir)) {
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        }
        let webmFilePath = path_1.default.join(tempDir, `${Date.now()}-${arquivo.originalname}`);
        fs_1.default.writeFileSync(webmFilePath, arquivo.buffer);
        console.log(`Arquivo salvo no disco: ${webmFilePath}`);
        // Caminho para o arquivo convertido
        const mp3FilePath = path_1.default.join(tempDir, `${Date.now()}-${path_1.default.parse(arquivo.originalname).name}.mp3`);
        // Converter o arquivo para .ogg
        console.log('Iniciando a conversão do arquivo para MP3');
        try {
            yield (0, whatsappService_1.convertAudio)(webmFilePath, mp3FilePath);
            console.log(`Arquivo convertido com sucesso: ${mp3FilePath}`);
        }
        catch (error) {
            console.error('Erro durante a conversão do arquivo:', error);
            return res.status(400).json({ message: 'Erro ao converter o arquivo para .ogg.' });
        }
        // Garantir que o áudio convertido seja enviado como mensagem de voz
        const media = whatsapp_web_js_1.MessageMedia.fromFilePath(mp3FilePath);
        console.log(`Enviando mensagem de voz com o arquivo convertido: ${mp3FilePath}`);
        yield cliente.sendMessage(numeroFormatado, media, { sendAudioAsVoice: true });
        console.log(`Mensagem de voz enviada com sucesso para o número: ${numeroFormatado}`);
        // Limpar arquivos temporários
        fs_1.default.unlinkSync(webmFilePath);
        fs_1.default.unlinkSync(mp3FilePath);
        res.status(200).json({ message: 'Mensagem de voz enviada com sucesso' });
    }
    catch (error) {
        res.status(500).json({ message: 'Erro ao enviar mensagem de voz' });
    }
}));
app.use('/media', express_1.default.static(path_1.default.join(__dirname, 'media')));
app.use('/api', (req, res, next) => {
    res.status(404).json({ message: 'Endpoint da API não encontrado' });
});
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'dist', 'index.html'));
});
httpServer.listen(PORTA, () => {
    logger.info(`Servidor rodando na porta ${PORTA}`);
});
