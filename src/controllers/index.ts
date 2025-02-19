import ServicoWhatsApp from '../services/whatsappService';
import { Request, Response } from '../types';

class ControladorIndex {
    private servicoWhatsApp: ServicoWhatsApp;

    constructor() {
        this.servicoWhatsApp = new ServicoWhatsApp();
    }

    async obterMensagens(req: Request, res: Response) {
        // Lógica para recuperar mensagens do atendimento ao cliente
        res.send("Recuperar mensagens");
    }

    async enviarMensagem(req: Request, res: Response) {
        const { idConta, para, mensagem } = req.body;
        if (!idConta || !para || !mensagem) {
            return res.status(400).json({ error: 'ID da conta, destinatário e mensagem são obrigatórios' });
        }
        try {
            await this.servicoWhatsApp.enviarMensagem(idConta, para, mensagem);
            res.send(`Mensagem enviada de ${idConta} para ${para}`);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao enviar mensagem' });
        }
    }

    async adicionarConexao(req: Request, res: Response) {
        const { idConta } = req.body;
        if (!idConta) {
            return res.status(400).json({ error: 'ID da conta é obrigatório' });
        }
        this.servicoWhatsApp.conectar(idConta);
        res.send(`Conexão ${idConta} adicionada`);
    }

    async removerConexao(req: Request, res: Response) {
        const { idConta } = req.body;
        if (!idConta) {
            return res.status(400).json({ error: 'ID da conta é obrigatório' });
        }
        this.servicoWhatsApp.desconectar(idConta);
        res.send(`Conexão ${idConta} removida`);
    }

    async listarConexoes(req: Request, res: Response) {
        const conexoes: string[] = this.servicoWhatsApp.listarConexoes();
        res.json(conexoes);
    }

    async obterQRCode(req: Request, res: Response) {
        const { idConta } = req.params;
        const qrCode = this.servicoWhatsApp.obterQRCode(idConta);
        if (qrCode) {
            console.log(`QR Code encontrado para ${idConta}`);
            res.send(`<img src="${qrCode}" alt="QR Code para ${idConta}">`);
        } else {
            console.log(`QR Code não encontrado para ${idConta}`);
            res.status(404).send('QR Code não encontrado');
        }
    }
}

export default ControladorIndex;