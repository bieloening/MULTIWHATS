import ControladorIndex from '../controllers/index';
import { Application } from 'express';

export function definirRotas(app: Application) {
    const controladorIndex = new ControladorIndex();

    app.get('/mensagens', controladorIndex.obterMensagens.bind(controladorIndex));
    app.post('/mensagens', (req, res, next) => controladorIndex.upload(req, res, next), controladorIndex.enviarMensagemOuMidia.bind(controladorIndex));
    app.post('/conexoes', controladorIndex.adicionarConexao.bind(controladorIndex));
    app.delete('/conexoes', controladorIndex.removerConexao.bind(controladorIndex));
    app.get('/conexoes', controladorIndex.listarConexoes.bind(controladorIndex));
    app.get('/qrcode/:idConta', controladorIndex.obterQRCode.bind(controladorIndex));
}