import ControladorIndex from '../controllers/index';

export function definirRotas(app) {
    const controladorIndex = new ControladorIndex();

    app.get('/mensagens', controladorIndex.obterMensagens.bind(controladorIndex));
    app.post('/mensagens', controladorIndex.enviarMensagem.bind(controladorIndex));
    app.post('/conexoes', controladorIndex.adicionarConexao.bind(controladorIndex));
    app.delete('/conexoes', controladorIndex.removerConexao.bind(controladorIndex));
    app.get('/conexoes', controladorIndex.listarConexoes.bind(controladorIndex));
    app.get('/qrcode/:idConta', controladorIndex.obterQRCode.bind(controladorIndex));
}