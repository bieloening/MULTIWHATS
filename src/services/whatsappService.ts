import { Client, LocalAuth } from 'whatsapp-web.js';

class ServicoWhatsApp {
    private conexoes: Map<string, Client>;

    constructor() {
        this.conexoes = new Map();
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

    obterConexao(id: string) {
        return this.conexoes.get(id);
    }

    listarConexoes() {
        return Array.from(this.conexoes.keys());
    }

    conectar(idConta: string): void {
        const cliente = new Client({
            authStrategy: new LocalAuth({ clientId: idConta })
        });

        cliente.on('qr', (qr) => {
            console.log(`QR Code para ${idConta}:`, qr);
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

    enviarMensagem(idConta: string, para: string, mensagem: string): void {
        const cliente = this.obterConexao(idConta);
        if (cliente) {
            cliente.sendMessage(para, mensagem).then(() => {
                console.log(`Mensagem enviada de ${idConta} para ${para}: ${mensagem}`);
            }).catch(err => {
                console.error(`Falha ao enviar mensagem de ${idConta} para ${para}:`, err);
            });
        } else {
            console.log(`Nenhuma conexão encontrada para a conta: ${idConta}`);
        }
    }
}

export default ServicoWhatsApp;