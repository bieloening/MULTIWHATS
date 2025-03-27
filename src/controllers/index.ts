import ServicoWhatsApp from '../services/whatsappService';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

class ControladorIndex {
    private servicoWhatsApp: ServicoWhatsApp;

    constructor() {
        this.servicoWhatsApp = new ServicoWhatsApp();
    }

    async enviarMensagemDeVoz(req: Request, res: Response) {
        const { idConexao, numero, audioBase64 } = req.body;

        if (!idConexao || !numero || !audioBase64) {
            return res.status(400).json({ error: 'ID da conexão, número e áudio são obrigatórios.' });
        }

        try {
            // Salvar o áudio temporariamente no servidor
            const audioBuffer = Buffer.from(audioBase64, 'base64');
            const filePath = path.join(__dirname, '../../temp', `${Date.now()}-audio.ogg`);
            fs.writeFileSync(filePath, audioBuffer);

            console.log(`Áudio salvo temporariamente em: ${filePath}`);

            // Enviar o áudio como mensagem de voz
            await this.servicoWhatsApp.enviarMensagemDeVoz(idConexao, numero, filePath);

            // Remover o arquivo temporário
            fs.unlinkSync(filePath);

            res.status(200).json({ message: 'Mensagem de voz enviada com sucesso.' });
        } catch (error) {
            console.error('Erro ao enviar mensagem de voz:', error);
            res.status(500).json({ error: 'Erro ao enviar mensagem de voz.' });
        }
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