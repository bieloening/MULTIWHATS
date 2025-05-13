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
exports.convertAudio = void 0;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const qrcode_1 = __importDefault(require("qrcode"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs_2 = require("fs");
class ServicoWhatsApp {
    constructor() {
        this.conexoes = new Map();
        this.qrCodes = new Map();
        this.mensagensRecebidas = [];
    }
    adicionarConexao(id, cliente) {
        console.log(`Adicionando conexão: ${id}`);
        this.conexoes.set(id, cliente);
        console.log('Conexões registradas atualmente:', Array.from(this.conexoes.keys()));
    }
    removerConexao(id) {
        console.log(`Removendo conexão: ${id}`);
        const cliente = this.conexoes.get(id);
        if (cliente) {
            cliente.destroy();
        }
        this.conexoes.delete(id);
        console.log('Conexões restantes após remoção:', Array.from(this.conexoes.keys()));
    }
    obterConexao(id) {
        return this.conexoes.get(id);
    }
    listarConexoes() {
        return Array.from(this.conexoes.entries()).map(([id, cliente]) => ({
            id,
            status: cliente.info ? 'ativo' : 'inativo',
        }));
    }
    obterMensagens() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.mensagensRecebidas;
        });
    }
    conectar(idConta) {
        console.log(`Conectando conta: ${idConta}`);
        const pathAuth = path_1.default.join(__dirname, '../../../.wwebjs_auth');
        const cliente = new whatsapp_web_js_1.Client({
            authStrategy: new whatsapp_web_js_1.LocalAuth({ clientId: idConta, dataPath: pathAuth }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });
        cliente.on('qr', (qr) => __awaiter(this, void 0, void 0, function* () {
            console.log(`QR Code para ${idConta}:`, qr);
            const qrCodeDataURL = yield qrcode_1.default.toDataURL(qr);
            this.qrCodes.set(idConta, qrCodeDataURL);
            console.log(`QR Code armazenado para ${idConta}`);
        }));
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
        cliente.on('message', (msg) => __awaiter(this, void 0, void 0, function* () {
            console.log(`Mensagem recebida de ${msg.from}: ${msg.body}`);
            let mediaUrl = null;
            if (msg.hasMedia) {
                try {
                    const media = yield msg.downloadMedia();
                    if (media && media.data) {
                        if (media.mimetype && media.mimetype.includes('/')) {
                            const filePath = path_1.default.join(__dirname, 'media', `${msg.id._serialized}.${media.mimetype.split('/')[1]}`);
                            fs_1.default.writeFileSync(filePath, media.data, 'base64');
                            mediaUrl = `/media/${msg.id._serialized}.${media.mimetype.split('/')[1]}`;
                        }
                        else {
                            console.error('Erro: Mimetype inválido ou ausente.');
                        }
                    }
                    else {
                        console.error('Erro: Mídia retornada está vazia ou indefinida.');
                    }
                }
                catch (error) {
                    console.error('Erro ao baixar mídia:', error);
                }
            }
            const contaMensagens = this.mensagensRecebidas.find(m => m.idConta === idConta);
            if (contaMensagens) {
                contaMensagens.mensagens.push({ from: msg.from, body: msg.body, mediaUrl: mediaUrl || undefined });
            }
            else {
                this.mensagensRecebidas.push({
                    idConta,
                    mensagens: [{ from: msg.from, body: msg.body, mediaUrl: mediaUrl || undefined }]
                });
            }
            console.log(`URL da mídia: ${mediaUrl}`);
        }));
        cliente.initialize();
    }
    desconectar(idConta) {
        this.removerConexao(idConta);
        console.log(`Desconectado da conta WhatsApp: ${idConta}`);
    }
    enviarMensagem(idConta, para, mensagem) {
        return __awaiter(this, void 0, void 0, function* () {
            const cliente = this.obterConexao(idConta);
            if (cliente) {
                // Verificar o formato do número de telefone
                if (!/^\d+$/.test(para)) {
                    console.error(`Número de telefone inválido: ${para}`);
                    return;
                }
                try {
                    yield cliente.sendMessage(`${para}@c.us`, mensagem);
                    console.log(`Mensagem enviada de ${idConta} para ${para}: ${mensagem}`);
                }
                catch (err) {
                    console.error(`Falha ao enviar mensagem de ${idConta} para ${para}:`, err);
                }
            }
            else {
                console.log(`Nenhuma conexão encontrada para a conta: ${idConta}`);
            }
        });
    }
    enviarMensagemDeVoz(idConta, numero, buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            const cliente = this.obterConexao(idConta);
            if (!cliente) {
                throw new Error('Conexão não encontrada.');
            }
            const tempDir = path_1.default.join(__dirname, '../../temp');
            if (!fs_1.default.existsSync(tempDir)) {
                console.log(`Criando diretório temporário: ${tempDir}`);
                fs_1.default.mkdirSync(tempDir, { recursive: true });
            }
            // Determinar a extensão do arquivo com base no tipo MIME
            const extension = 'webm'; // Para este caso, assumimos que o tipo é sempre webm
            const originalFilePath = path_1.default.join(tempDir, `${Date.now()}-audio.${extension}`);
            const convertedFilePath = path_1.default.join(tempDir, `${Date.now()}-audio.mp3`);
            console.log(`Arquivo original será salvo como: ${originalFilePath}`);
            console.log(`Arquivo convertido será salvo como: ${convertedFilePath}`);
            console.log(`Criando arquivo temporário: ${originalFilePath}`);
            console.log(`Tamanho do buffer recebido: ${buffer.length} bytes`);
            if (buffer.length === 0) {
                throw new Error('O buffer fornecido está vazio.');
            }
            try {
                fs_1.default.writeFileSync(originalFilePath, buffer);
                console.log(`Arquivo temporário criado com sucesso: ${originalFilePath}`);
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error(`Erro ao criar o arquivo temporário: ${error.message}`);
                }
                else {
                    console.error('Erro ao criar o arquivo temporário:', error);
                }
                throw new Error('Falha ao criar o arquivo temporário.');
            }
            const stats = fs_1.default.statSync(originalFilePath);
            console.log(`Tamanho do arquivo temporário: ${stats.size} bytes`);
            if (stats.size === 0) {
                throw new Error('O arquivo temporário criado está vazio.');
            }
            // Validação do tipo MIME
            const mimeType = 'audio/webm'; // Supondo que o tipo MIME seja conhecido
            if (mimeType !== 'audio/webm') {
                throw new Error(`Tipo MIME não suportado: ${mimeType}`);
            }
            console.log('Iniciando a conversão do arquivo...');
            try {
                yield convertAudio(originalFilePath, convertedFilePath);
                console.log('Conversão concluída com sucesso.');
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error(`Erro durante a conversão do arquivo: ${error.message}`);
                }
                else {
                    console.error('Erro desconhecido durante a conversão do arquivo:', error);
                }
                throw new Error('Falha na conversão do arquivo.');
            }
            console.log('Iniciando o envio da mensagem de voz com o arquivo convertido...');
            const media = whatsapp_web_js_1.MessageMedia.fromFilePath(convertedFilePath); // Usa o arquivo convertido
            yield cliente.sendMessage(`${numero}@c.us`, media, { sendAudioAsVoice: true });
            console.log(`Mensagem de voz enviada com sucesso para ${numero}`);
            console.log('Limpando arquivos temporários...');
            if (fs_1.default.existsSync(originalFilePath)) {
                fs_1.default.unlinkSync(originalFilePath);
                console.log(`Arquivo temporário removido: ${originalFilePath}`);
            }
            if (fs_1.default.existsSync(convertedFilePath)) {
                fs_1.default.unlinkSync(convertedFilePath);
                console.log(`Arquivo temporário removido: ${convertedFilePath}`);
            }
        });
    }
    enviarArquivo(idConta, numero, buffer) {
        return __awaiter(this, void 0, void 0, function* () {
            const cliente = this.obterConexao(idConta);
            if (!cliente) {
                throw new Error('Conexão não encontrada.');
            }
            const uploadDir = path_1.default.join(__dirname, '../../uploads');
            if (!fs_1.default.existsSync(uploadDir)) {
                fs_1.default.mkdirSync(uploadDir, { recursive: true });
            }
            const filePath = path_1.default.join(uploadDir, `${Date.now()}-file`);
            fs_1.default.writeFileSync(filePath, buffer);
            try {
                const media = whatsapp_web_js_1.MessageMedia.fromFilePath(filePath);
                yield cliente.sendMessage(`${numero}@c.us`, media);
                console.log(`Arquivo enviado com sucesso para ${numero}`);
            }
            finally {
                fs_1.default.unlinkSync(filePath);
                console.log(`Arquivo de upload removido: ${filePath}`);
            }
        });
    }
    obterQRCode(idConta) {
        return this.qrCodes.get(idConta);
    }
}
function validateFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`Arquivo não encontrado: ${filePath}`);
        }
        const stats = (0, fs_2.statSync)(filePath);
        if (stats.size === 0) {
            throw new Error(`Arquivo vazio: ${filePath}`);
        }
    });
}
function convertAudio(inputPath, outputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        yield validateFile(inputPath);
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(inputPath)
                .toFormat('mp3') // Altera o formato de saída para .mp3
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(outputPath);
        });
    });
}
exports.convertAudio = convertAudio;
exports.default = ServicoWhatsApp;
