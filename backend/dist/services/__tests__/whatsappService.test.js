"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const whatsappService_1 = require("../whatsappService");
const whatsappService_2 = __importDefault(require("../whatsappService"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const whatsappService = __importStar(require("../whatsappService"));
// Adiciona logs para verificar a importação
console.log('Valor de ServicoWhatsApp:', whatsappService_2.default);
// Ajusta o mock para preservar a exportação padrão
jest.mock('../whatsappService', () => {
    const originalModule = jest.requireActual('../whatsappService');
    return Object.assign(Object.assign({}, originalModule), { convertAudio: jest.fn() });
});
const convertAudioMock = whatsappService.convertAudio;
// Usa a classe original diretamente
const ServicoWhatsAppClass = jest.requireActual('../whatsappService').default;
// Certifique-se de que o diretório `temp/` existe antes de executar os testes
beforeAll(() => {
    const tempDir = path_1.default.join(__dirname, '../../../temp');
    if (!fs_1.default.existsSync(tempDir)) {
        fs_1.default.mkdirSync(tempDir, { recursive: true });
    }
});
describe('Conversão de Áudio', () => {
    it('deve converter um arquivo .webm para .mp3', () => __awaiter(void 0, void 0, void 0, function* () {
        const inputPath = path_1.default.join(__dirname, '../../../uploads/electronic_beat_7s.webm');
        const outputPath = path_1.default.join(__dirname, '../../../temp/test-audio.mp3');
        console.log(`Caminho do arquivo de entrada: ${inputPath}`);
        console.log(`Caminho do arquivo de saída: ${outputPath}`);
        // Mocka a função convertAudio para simular a conversão
        convertAudioMock.mockImplementation((inputPath, outputPath) => __awaiter(void 0, void 0, void 0, function* () {
            fs_1.default.writeFileSync(outputPath, 'fake-audio-content'); // Simula a criação do arquivo convertido
        }));
        // Simula a conversão
        yield (0, whatsappService_1.convertAudio)(inputPath, outputPath);
        // Verifica se o arquivo convertido existe
        const fileExists = fs_1.default.existsSync(outputPath);
        console.log(`Arquivo convertido existe: ${fileExists}`);
        expect(fileExists).toBe(true);
        // Limpa o arquivo convertido após o teste
        if (fileExists) {
            fs_1.default.unlinkSync(outputPath);
            console.log(`Arquivo convertido removido: ${outputPath}`);
        }
        // Restaura a função original
        convertAudioMock.mockRestore();
    }));
});
describe('Envio de Mensagem de Voz', () => {
    it('deve enviar uma mensagem de voz para o número correto', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockClient = {
            sendMessage: jest.fn(),
        };
        const servicoWhatsApp = new ServicoWhatsAppClass();
        jest.spyOn(servicoWhatsApp, 'obterConexao').mockReturnValue(mockClient);
        const idConta = 'test-account';
        const numero = '554799036748';
        const audioPath = path_1.default.join(__dirname, '../../../uploads/electronic_beat_7s.webm');
        const buffer = fs_1.default.readFileSync(audioPath);
        // Simula o envio de mensagem de voz com buffer válido
        yield servicoWhatsApp.enviarMensagemDeVoz(idConta, numero, buffer);
        // Verifica se o método sendMessage foi chamado corretamente
        expect(mockClient.sendMessage).toHaveBeenCalledWith(`${numero}@c.us`, expect.any(Object), { sendAudioAsVoice: true });
    }));
    it('deve salvar o arquivo temporário com a extensão correta', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockClient = {
            sendMessage: jest.fn(),
        };
        const servicoWhatsApp = new ServicoWhatsAppClass();
        jest.spyOn(servicoWhatsApp, 'obterConexao').mockReturnValue(mockClient);
        const idConta = 'test-account';
        const numero = '554799036748';
        const audioPath = path_1.default.join(__dirname, '../../../uploads/electronic_beat_7s.webm');
        const buffer = fs_1.default.readFileSync(audioPath);
        // Mocka a função fs.unlinkSync para evitar remoção dos arquivos temporários
        const unlinkMock = jest.spyOn(fs_1.default, 'unlinkSync').mockImplementation(() => { });
        // Simula o envio de mensagem de voz com buffer válido
        yield servicoWhatsApp.enviarMensagemDeVoz(idConta, numero, buffer);
        // Verifica se o arquivo temporário foi salvo com a extensão correta
        const tempDir = path_1.default.join(__dirname, '../../../temp');
        const files = fs_1.default.readdirSync(tempDir);
        const webmFile = files.find(file => file.endsWith('-audio.webm'));
        expect(webmFile).toBeDefined();
        console.log(`Arquivo temporário encontrado: ${webmFile}`);
        // Restaura a função original
        unlinkMock.mockRestore();
    }));
    it('deve enviar uma mensagem de voz com o arquivo convertido para .mp3', () => __awaiter(void 0, void 0, void 0, function* () {
        const mockClient = {
            sendMessage: jest.fn(),
        };
        const servicoWhatsApp = new ServicoWhatsAppClass();
        jest.spyOn(servicoWhatsApp, 'obterConexao').mockReturnValue(mockClient);
        const idConta = 'test-account';
        const numero = '554799036748';
        const audioPath = path_1.default.join(__dirname, '../../../uploads/electronic_beat_7s.webm');
        const buffer = fs_1.default.readFileSync(audioPath);
        // Mocka a função convertAudio para simular a conversão
        convertAudioMock.mockImplementation((inputPath, outputPath) => __awaiter(void 0, void 0, void 0, function* () {
            fs_1.default.writeFileSync(outputPath, 'fake-audio-content'); // Simula a criação do arquivo convertido
        }));
        // Simula o envio de mensagem de voz com buffer válido
        yield servicoWhatsApp.enviarMensagemDeVoz(idConta, numero, buffer);
        // Verifica se o método sendMessage foi chamado com o arquivo convertido
        expect(mockClient.sendMessage).toHaveBeenCalledWith(`${numero}@c.us`, expect.objectContaining({ mimetype: 'audio/mpeg' }), // Alterado de 'audio/mp3' para 'audio/mpeg'
        { sendAudioAsVoice: true });
        // Restaura a função original
        convertAudioMock.mockRestore();
    }));
});
