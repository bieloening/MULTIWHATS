import ServicoWhatsApp from '../services/whatsappService';
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'; // Importa o binário estático do ffmpeg
import fs from 'fs';

class ControladorIndex {
    private servicoWhatsApp: ServicoWhatsApp;

    constructor() {
        this.servicoWhatsApp = new ServicoWhatsApp();

        // Configura o caminho do ffmpeg para usar o binário estático
        ffmpeg.setFfmpegPath(ffmpegInstaller.path);
        console.log(`ffmpeg configurado para usar o binário em: ${ffmpegInstaller.path}`);

        // Adiciona o caminho do ffmpeg ao PATH do sistema
        process.env.PATH = `${path.dirname(ffmpegInstaller.path)}${path.delimiter}${process.env.PATH}`;
        console.log(`PATH atualizado: ${process.env.PATH}`);

        // Verifica se o binário do ffmpeg é acessível
        ffmpeg().getAvailableFormats((err, formats) => {
            if (err) {
                console.error('Erro ao verificar o ffmpeg:', err);
            } else {
                console.log('ffmpeg está funcionando corretamente. Formatos disponíveis:', formats);
            }
        });
    }

    // Configuração do multer para upload de arquivos
    private upload = multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                const uploadPath = path.join(__dirname, '../../uploads');
                cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
                cb(null, `${uniqueSuffix}-${file.originalname}`);
            },
        }),
        fileFilter: (req, file, cb) => {
            if (file.mimetype.startsWith('audio/')) {
                cb(null, true);
            } else {
                cb(new Error('Apenas arquivos de áudio são permitidos.'));
            }
        },
    }).single('file');

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

    async enviarAudio(req: Request, res: Response) {
        console.log('Requisição recebida no endpoint /api/enviar-audio');
        this.upload(req, res, async (err) => {
            if (err) {
                console.error('Erro ao fazer upload do áudio:', err);
                return res.status(400).json({ error: 'Erro ao fazer upload do áudio.' });
            }

            if (!req.file) {
                console.error('Nenhum arquivo foi enviado.');
                return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
            }

            const { idConexao, numero } = req.body;
            console.log('Dados recebidos:', { idConexao, numero, file: req.file });

            if (!idConexao || !numero) {
                console.error('ID da conexão ou número não fornecido.');
                return res.status(400).json({ error: 'ID da conexão e número são obrigatórios.' });
            }

            try {
                const inputPath = req.file.path;
                const outputPath = inputPath.replace(/\.\w+$/, '.ogg'); // Substitui a extensão pelo formato OGG

                console.log(`Convertendo áudio para OGG: ${outputPath}`);

                // Converte o arquivo para OGG usando ffmpeg
                await new Promise<void>((resolve, reject) => {
                    ffmpeg(inputPath)
                        .output(outputPath)
                        .audioCodec('libopus') // Codec necessário para o WhatsApp
                        .on('start', (commandLine) => {
                            console.log(`Comando ffmpeg iniciado: ${commandLine}`);
                        })
                        .on('end', () => {
                            console.log(`Áudio convertido com sucesso: ${outputPath}`);
                            resolve();
                        })
                        .on('error', (error) => {
                            console.error('Erro ao converter áudio:', error);
                            reject(error);
                        })
                        .run();
                });

                // Enviar o áudio convertido como mensagem de voz
                console.log(`Enviando áudio convertido para o número ${numero}...`);
                await this.servicoWhatsApp.enviarAudio(idConexao, numero, outputPath, true);

                res.status(200).json({ message: 'Áudio enviado com sucesso.' });
            } catch (error) {
                console.error('Erro ao processar áudio:', error);

                // Verifica se o arquivo de saída foi criado e remove em caso de erro
                const outputPath = req.file.path.replace(/\.\w+$/, '.ogg');
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                    console.log(`Arquivo de saída removido: ${outputPath}`);
                }

                res.status(500).json({ error: 'Erro ao processar áudio.' });
            }
        });
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