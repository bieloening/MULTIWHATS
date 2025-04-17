import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

class ServicoWhatsApp {
    private conexoes: Map<string, Client>;
    private qrCodes: Map<string, string>;
    private mensagensRecebidas: { idConta: string, mensagens: { from: string, body: string, mediaUrl?: string }[] }[];

    constructor() {
        this.conexoes = new Map();
        this.qrCodes = new Map();
        this.mensagensRecebidas = [];
    }

    adicionarConexao(id: string, cliente: Client) {
        console.log(`Adicionando conexão: ${id}`);
        this.conexoes.set(id, cliente);
        console.log('Conexões registradas atualmente:', Array.from(this.conexoes.keys()));
    }

    removerConexao(id: string) {
        console.log(`Removendo conexão: ${id}`);
        const cliente = this.conexoes.get(id);
        if (cliente) {
            cliente.destroy();
        }
        this.conexoes.delete(id);
        console.log('Conexões restantes após remoção:', Array.from(this.conexoes.keys()));
    }

    obterConexao(id: string): Client | undefined {
        return this.conexoes.get(id);
    }

    listarConexoes(): { id: string, status: string }[] {
        return Array.from(this.conexoes.entries()).map(([id, cliente]) => ({
            id,
            status: cliente.info ? 'ativo' : 'inativo',
        }));
    }

    async obterMensagens(): Promise<{ idConta: string, mensagens: { from: string, body: string, mediaUrl?: string }[] }[]> {
        return this.mensagensRecebidas;
    }

    conectar(idConta: string): void {
        console.log(`Conectando conta: ${idConta}`);
        const cliente = new Client({
            authStrategy: new LocalAuth({ clientId: idConta }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        cliente.on('qr', async (qr) => {
            console.log(`QR Code para ${idConta}:`, qr);
            const qrCodeDataURL = await QRCode.toDataURL(qr);
            this.qrCodes.set(idConta, qrCodeDataURL);
            console.log(`QR Code armazenado para ${idConta}`);
        });

        cliente.on('ready', () => {
            console.log(`Cliente ${idConta} está pronto!`);
            this.adicionarConexao(idConta, cliente); // Garante que a conexão seja registrada
            console.log('Conexões registradas:', Array.from(this.conexoes.keys()));
        });

        cliente.on('authenticated', () => {
            console.log(`Cliente ${idConta} está autenticado!`);
        });

        cliente.on('auth_failure', (msg) => {
            console.error(`Falha na autenticação do cliente ${idConta}:`, msg);
        });

        cliente.on('disconnected', (motivo) => {
            console.log(`Cliente ${idConta} desconectado:`, motivo);
            this.removerConexao(idConta);
        });

        cliente.on('message', async (msg) => {
            console.log(`Mensagem recebida de ${msg.from}: ${msg.body}`);
            let mediaUrl: string | null = null;

            if (msg.hasMedia) {
                try {
                    const media = await msg.downloadMedia();
                    if (media && media.data) {
                        if (media.mimetype && media.mimetype.includes('/')) {
                            const filePath = path.join(__dirname, 'media', `${msg.id._serialized}.${media.mimetype.split('/')[1]}`);
                            fs.writeFileSync(filePath, media.data, 'base64');
                            mediaUrl = `/media/${msg.id._serialized}.${media.mimetype.split('/')[1]}`;
                        } else {
                            console.error('Erro: Mimetype inválido ou ausente.');
                        }
                    } else {
                        console.error('Erro: Mídia retornada está vazia ou indefinida.');
                    }
                } catch (error) {
                    console.error('Erro ao baixar mídia:', error);
                }
            }

            const contaMensagens = this.mensagensRecebidas.find(m => m.idConta === idConta);
            if (contaMensagens) {
                contaMensagens.mensagens.push({ from: msg.from, body: msg.body, mediaUrl: mediaUrl || undefined });
            } else {
                this.mensagensRecebidas.push({
                    idConta,
                    mensagens: [{ from: msg.from, body: msg.body, mediaUrl: mediaUrl || undefined }]
                });
            }

            console.log(`URL da mídia: ${mediaUrl}`);
        });

        cliente.initialize();
    }

    desconectar(idConta: string): void {
        this.removerConexao(idConta);
        console.log(`Desconectado da conta WhatsApp: ${idConta}`);
    }

    async enviarMensagem(idConta: string, para: string, mensagem: string): Promise<void> {
        const cliente = this.obterConexao(idConta);
        if (cliente) {
            // Verificar o formato do número de telefone
            if (!/^\d+$/.test(para)) {
                console.error(`Número de telefone inválido: ${para}`);
                return;
            }

            try {
                await cliente.sendMessage(`${para}@c.us`, mensagem);
                console.log(`Mensagem enviada de ${idConta} para ${para}: ${mensagem}`);
            } catch (err) {
                console.error(`Falha ao enviar mensagem de ${idConta} para ${para}:`, err);
            }
        } else {
            console.log(`Nenhuma conexão encontrada para a conta: ${idConta}`);
        }
    }

    async enviarMensagemDeVoz(idConta: string, numero: string, buffer: Buffer): Promise<void> {
        const cliente = this.obterConexao(idConta);
        if (!cliente) {
            throw new Error('Conexão não encontrada.');
        }

        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const filePath = path.join(tempDir, `${Date.now()}-audio.ogg`);
        try {
            fs.writeFileSync(filePath, buffer);

            const media = MessageMedia.fromFilePath(filePath);
            await cliente.sendMessage(`${numero}@c.us`, media, { sendAudioAsVoice: true });
            console.log(`Mensagem de voz enviada com sucesso para ${numero}`);
        } catch (error) {
            console.error('Erro ao enviar mensagem de voz:', error);
            throw new Error('Erro ao enviar mensagem de voz.');
        } finally {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`Arquivo temporário removido: ${filePath}`);
            }
        }
    }

    async enviarArquivo(idConta: string, numero: string, buffer: Buffer): Promise<void> {
        const cliente = this.obterConexao(idConta);
        if (!cliente) {
            throw new Error('Conexão não encontrada.');
        }

        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, `${Date.now()}-file`);
        fs.writeFileSync(filePath, buffer);

        try {
            const media = MessageMedia.fromFilePath(filePath);
            await cliente.sendMessage(`${numero}@c.us`, media);
            console.log(`Arquivo enviado com sucesso para ${numero}`);
        } finally {
            fs.unlinkSync(filePath);
            console.log(`Arquivo de upload removido: ${filePath}`);
        }
    }

    obterQRCode(idConta: string): string | undefined {
        return this.qrCodes.get(idConta);
    }
}

export default ServicoWhatsApp;