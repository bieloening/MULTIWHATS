import ServicoWhatsApp from '../services/whatsappService';
import { Request, Response } from 'express';
import multer, { Multer } from 'multer';

class ControladorIndex {
    private servicoWhatsApp: ServicoWhatsApp;
    private uploadMiddleware: Multer;

    constructor() {
        this.servicoWhatsApp = new ServicoWhatsApp();
        this.uploadMiddleware = multer({ storage: multer.memoryStorage() });
    }

    public get upload() {
        return this.uploadMiddleware.single('arquivo');
    }

    async enviarMensagem(req: Request, res: Response) {
        const { idConexao, numero, mensagem } = req.body;

        // Validação de entrada
        if (!idConexao || !numero || !mensagem) {
            return res.status(400).json({ error: 'ID da conexão, número e mensagem são obrigatórios.' });
        }

        try {
            console.log('Enviando mensagem de texto...');
            await this.servicoWhatsApp.enviarMensagem(idConexao, numero, mensagem);

            // Resposta de sucesso
            res.status(200).json({ message: 'Mensagem enviada com sucesso.' });
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);

            // Tratamento de erro detalhado
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            res.status(500).json({ error: 'Erro ao enviar mensagem.', details: errorMessage });
        }
    }

    async enviarMensagemDeVoz(req: Request, res: Response) {
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

            await this.servicoWhatsApp.enviarMensagemDeVoz(idConexao, numero, arquivo.buffer);

            res.status(200).json({ message: 'Mensagem de voz enviada com sucesso.' });
        } catch (error) {
            console.error('Erro ao enviar mensagem de voz:', error);

            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            res.status(500).json({ error: 'Erro ao enviar mensagem de voz.', details: errorMessage });
        }
    }

    async obterMensagens(req: Request, res: Response) {
        try {
            const mensagens = await this.servicoWhatsApp.obterMensagens(); // Corrigido para chamar o método
            res.status(200).json(mensagens);
        } catch (error) {
            console.error('Erro ao obter mensagens:', error);
            res.status(500).json({ error: 'Erro ao obter mensagens.' });
        }
    }

    async adicionarConexao(req: Request, res: Response) {
        const { idConta } = req.body;
        if (!idConta) {
            return res.status(400).json({ error: 'ID da conta é obrigatório' });
        }
        try {
            await this.servicoWhatsApp.conectar(idConta);
            res.status(200).json({ message: `Conexão ${idConta} adicionada com sucesso.` });
        } catch (error) {
            console.error('Erro ao adicionar conexão:', error);
            res.status(500).json({ error: 'Erro ao adicionar conexão.' });
        }
    }

    async removerConexao(req: Request, res: Response) {
        const { idConta } = req.body;
        if (!idConta) {
            return res.status(400).json({ error: 'ID da conta é obrigatório' });
        }
        try {
            await this.servicoWhatsApp.desconectar(idConta);
            res.status(200).json({ message: `Conexão ${idConta} removida com sucesso.` });
        } catch (error) {
            console.error('Erro ao remover conexão:', error);
            res.status(500).json({ error: 'Erro ao remover conexão.' });
        }
    }

    async listarConexoes(req: Request, res: Response) {
        try {
            const conexoes = await this.servicoWhatsApp.listarConexoes();
            console.log('Conexões ativas no momento:', conexoes);
            res.status(200).json(conexoes);
        } catch (error) {
            console.error('Erro ao listar conexões:', error);
            res.status(500).json({ error: 'Erro ao listar conexões.' });
        }
    }

    async obterQRCode(req: Request, res: Response) {
        const { idConta } = req.params;
        if (!idConta) {
            return res.status(400).json({ error: 'ID da conta é obrigatório.' });
        }
        try {
            const qrCode = await this.servicoWhatsApp.obterQRCode(idConta);
            if (qrCode) {
                console.log(`QR Code encontrado para ${idConta}`);
                res.status(200).send(`<img src="${qrCode}" alt="QR Code para ${idConta}">`);
            } else {
                console.log(`QR Code não encontrado para ${idConta}`);
                res.status(404).json({ error: 'QR Code não encontrado.' });
            }
        } catch (error) {
            console.error('Erro ao obter QR Code:', error);
            res.status(500).json({ error: 'Erro ao obter QR Code.' });
        }
    }
}

export default ControladorIndex;