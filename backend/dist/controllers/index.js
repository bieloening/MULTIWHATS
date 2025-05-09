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
const whatsappService_1 = __importDefault(require("../services/whatsappService"));
const multer_1 = __importDefault(require("multer"));
// Configura o multer para armazenar arquivos na memória
const storage = multer_1.default.memoryStorage();
class ControladorIndex {
    constructor() {
        this.upload = (req, res, next) => {
            console.log('Middleware multer chamado. Verificando arquivo...');
            this.uploadMiddleware.single('arquivo')(req, res, (err) => {
                if (err) {
                    console.error('Erro no multer:', err);
                    return res.status(400).json({ message: 'Erro ao processar arquivo. Verifique o formato.' });
                }
                if (req.file) {
                    const extension = 'webm';
                    req.file.originalname = `${Date.now()}-audio.${extension}`;
                    console.log('Arquivo processado pelo multer:', req.file);
                }
                next();
            });
        };
        this.servicoWhatsApp = new whatsappService_1.default();
        this.uploadMiddleware = (0, multer_1.default)({
            storage: multer_1.default.memoryStorage(),
            fileFilter: (req, file, cb) => {
                if (file.mimetype !== 'audio/webm') {
                    return cb(new Error('Tipo de arquivo não suportado. Apenas arquivos .webm são permitidos.'));
                }
                cb(null, true);
            },
        });
    }
    enviarMensagem(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { idConexao, numero, mensagem } = req.body;
            // Validação de entrada
            if (!idConexao || !numero || !mensagem) {
                return res.status(400).json({ error: 'ID da conexão, número e mensagem são obrigatórios.' });
            }
            try {
                console.log('Enviando mensagem de texto...');
                yield this.servicoWhatsApp.enviarMensagem(idConexao, numero, mensagem);
                // Resposta de sucesso
                res.status(200).json({ message: 'Mensagem enviada com sucesso.' });
            }
            catch (error) {
                console.error('Erro ao enviar mensagem:', error);
                // Tratamento de erro detalhado
                const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                res.status(500).json({ error: 'Erro ao enviar mensagem.', details: errorMessage });
            }
        });
    }
    enviarMensagemDeVoz(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { idConexao, numero } = req.body;
            const arquivo = req.file;
            // Validação de entrada
            if (!idConexao || !numero || !arquivo) {
                return res.status(400).json({ error: 'ID da conexão, número e arquivo são obrigatórios.' });
            }
            try {
                console.log('Enviando mensagem de voz...');
                if (!arquivo.buffer) {
                    throw new Error('Arquivo de áudio inválido ou ausente.');
                }
                yield this.servicoWhatsApp.enviarMensagemDeVoz(idConexao, numero, arquivo.buffer);
                res.status(200).json({ message: 'Mensagem de voz enviada com sucesso.' });
            }
            catch (error) {
                console.error('Erro ao enviar mensagem de voz:', error);
                const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                res.status(500).json({ error: 'Erro ao enviar mensagem de voz.', details: errorMessage });
            }
        });
    }
    obterMensagens(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const mensagens = yield this.servicoWhatsApp.obterMensagens(); // Corrigido para chamar o método
                res.status(200).json(mensagens);
            }
            catch (error) {
                console.error('Erro ao obter mensagens:', error);
                res.status(500).json({ error: 'Erro ao obter mensagens.' });
            }
        });
    }
    adicionarConexao(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { idConta } = req.body;
            if (!idConta) {
                return res.status(400).json({ error: 'ID da conta é obrigatório' });
            }
            try {
                yield this.servicoWhatsApp.conectar(idConta);
                res.status(200).json({ message: `Conexão ${idConta} adicionada com sucesso.` });
            }
            catch (error) {
                console.error('Erro ao adicionar conexão:', error);
                res.status(500).json({ error: 'Erro ao adicionar conexão.' });
            }
        });
    }
    removerConexao(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { idConta } = req.body;
            if (!idConta) {
                return res.status(400).json({ error: 'ID da conta é obrigatório' });
            }
            try {
                yield this.servicoWhatsApp.desconectar(idConta);
                res.status(200).json({ message: `Conexão ${idConta} removida com sucesso.` });
            }
            catch (error) {
                console.error('Erro ao remover conexão:', error);
                res.status(500).json({ error: 'Erro ao remover conexão.' });
            }
        });
    }
    listarConexoes(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const conexoes = yield this.servicoWhatsApp.listarConexoes();
                console.log('Conexões ativas no momento:', conexoes);
                res.status(200).json(conexoes);
            }
            catch (error) {
                console.error('Erro ao listar conexões:', error);
                res.status(500).json({ error: 'Erro ao listar conexões.' });
            }
        });
    }
    obterQRCode(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const { idConta } = req.params;
            if (!idConta) {
                return res.status(400).json({ error: 'ID da conta é obrigatório.' });
            }
            try {
                const qrCode = yield this.servicoWhatsApp.obterQRCode(idConta);
                if (qrCode) {
                    console.log(`QR Code encontrado para ${idConta}`);
                    res.status(200).send(`<img src="${qrCode}" alt="QR Code para ${idConta}">`);
                }
                else {
                    console.log(`QR Code não encontrado para ${idConta}`);
                    res.status(404).json({ error: 'QR Code não encontrado.' });
                }
            }
            catch (error) {
                console.error('Erro ao obter QR Code:', error);
                res.status(500).json({ error: 'Erro ao obter QR Code.' });
            }
        });
    }
}
exports.default = ControladorIndex;
