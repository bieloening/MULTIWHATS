import ServicoWhatsApp from '../services/whatsappService';

class ControladorIndex {
    private servicoWhatsApp: ServicoWhatsApp;

    constructor() {
        this.servicoWhatsApp = new ServicoWhatsApp();
    }

    async obterMensagens(req, res) {
        // Lógica para recuperar mensagens do atendimento ao cliente
        res.send("Recuperar mensagens");
    }

    async enviarMensagem(req, res) {
        const { idConta, para, mensagem } = req.body;
        this.servicoWhatsApp.enviarMensagem(idConta, para, mensagem);
        res.send(`Mensagem enviada de ${idConta} para ${para}`);
    }

    async adicionarConexao(req, res) {
        const { id } = req.body;
        this.servicoWhatsApp.conectar(id);
        res.send(`Conexão ${id} adicionada`);
    }

    async removerConexao(req, res) {
        const { id } = req.body;
        this.servicoWhatsApp.desconectar(id);
        res.send(`Conexão ${id} removida`);
    }

    async listarConexoes(req, res) {
        const conexoes = this.servicoWhatsApp.listarConexoes();
        res.send(conexoes);
    }
}

export default ControladorIndex;