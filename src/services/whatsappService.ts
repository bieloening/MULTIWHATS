import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';

class ServicoWhatsApp {
    private conexoes: Map<string, Client>;
    private qrCodes: Map<string, string>;

    constructor() {
        this.conexoes = new Map();
        this.qrCodes = new Map();
    }

    adicionarConexao(id: string, cliente: Client) {
        this.conexoes.set(id, cliente);
    }

    removerConexao(id: string) {
        const cliente = this.conexoes.get(id);
        if (cliente) {
            cliente.destroy();
        }
        this.conexoes.delete(id);
    }

    obterConexao(id: string): Client | undefined {
        return this.conexoes.get(id);
    }

    listarConexoes(): string[] {
        return Array.from(this.conexoes.keys());
    }

    conectar(idConta: string): void {
        console.log(`Conectando conta: ${idConta}`);
        const cliente = new Client({
            authStrategy: new LocalAuth({ clientId: idConta }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        cliente.on('qr', async (qr) => {
            console.log(`QR Code para ${idConta}:`, qr);
            const qrCodeDataURL = await QRCode.toDataURL(qr);
            this.qrCodes.set(idConta, qrCodeDataURL);
            console.log(`QR Code armazenado para ${idConta}`);
        });

        cliente.on('ready', () => {
            console.log(`Cliente ${idConta} está pronto!`);
        });

        cliente.on('authenticated', () => {
            console.log(`Cliente ${idConta} está autenticado!`);
        });

        cliente.on('auth_failure', (msg) => {
            console.error(`Falha na autenticação do cliente ${idConta}:`, msg);
        });

        cliente.on('disconnected', (motivo) => {
            console.log(`Cliente ${idConta} desconectado:`, motivo);
            this.removerConexao(idConta);
        });

        cliente.initialize();
        this.adicionarConexao(idConta, cliente);
    }

    desconectar(idConta: string): void {
        this.removerConexao(idConta);
        console.log(`Desconectado da conta WhatsApp: ${idConta}`);
    }

    async enviarMensagem(idConta: string, para: string, mensagem: string): Promise<void> {
        const cliente = this.obterConexao(idConta);
        if (cliente) {
            // Verificar o formato do número de telefone
            if (!/^\d+$/.test(para)) {
                console.error(`Número de telefone inválido: ${para}`);
                return;
            }

            try {
                await cliente.sendMessage(`${para}@c.us`, mensagem);
                console.log(`Mensagem enviada de ${idConta} para ${para}: ${mensagem}`);
            } catch (err) {
                console.error(`Falha ao enviar mensagem de ${idConta} para ${para}:`, err);
            }
        } else {
            console.log(`Nenhuma conexão encontrada para a conta: ${idConta}`);
        }
    }

    obterQRCode(idConta: string): string | undefined {
        return this.qrCodes.get(idConta);
    }
}

export default ServicoWhatsApp;