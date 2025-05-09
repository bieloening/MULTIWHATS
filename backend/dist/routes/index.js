"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.definirRotas = void 0;
const index_1 = __importDefault(require("../controllers/index"));
function definirRotas(app) {
    const controladorIndex = new index_1.default();
    app.get('/mensagens', controladorIndex.obterMensagens.bind(controladorIndex));
    app.post('/mensagens', controladorIndex.enviarMensagem.bind(controladorIndex));
    app.post('/mensagens/voz', (req, res, next) => controladorIndex.upload(req, res, next), controladorIndex.enviarMensagemDeVoz.bind(controladorIndex));
    app.post('/conexoes', controladorIndex.adicionarConexao.bind(controladorIndex));
    app.delete('/conexoes', controladorIndex.removerConexao.bind(controladorIndex));
    app.get('/conexoes', controladorIndex.listarConexoes.bind(controladorIndex));
    app.get('/qrcode/:idConta', controladorIndex.obterQRCode.bind(controladorIndex));
}
exports.definirRotas = definirRotas;
