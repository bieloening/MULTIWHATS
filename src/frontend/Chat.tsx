import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import './Chat.css'; // Importar o arquivo CSS

const socket = io('http://localhost:3000');

interface Mensagem {
    idConexao: string; // Renomeado de "id" para "idConexao"
    from: string;
    body: string;
    timestamp: number;
    isMe?: boolean; // Adicionado campo isMe
}

interface Conversa {
    id: string;
    name: string;
    number: string;
    messages: Mensagem[]; // Atualizado para refletir a mudança na interface Mensagem
    unread: number;
    active: boolean;
    profilePicUrl?: string;
    connectionId: string; // Certifique-se de que o connectionId seja configurado corretamente
}

const Chat: React.FC = () => {
    const [conversas, setConversas] = useState<Conversa[]>([]);
    const [conversaSelecionada, setConversaSelecionada] = useState<Conversa | null>(null);
    const [novaMensagem, setNovaMensagem] = useState<string>('');

    const buscarHistoricoConversas = async () => {
        try {
            console.log('Buscando conexões ativas...');
            const response = await axios.get('http://localhost:3000/api/conexoes');
            const conexoesAtivas = response.data.filter((conexao: { id: string; status: string }) => conexao.status === 'ativo');
            console.log('Conexões ativas:', conexoesAtivas);

            const conversas = await Promise.all(
                conexoesAtivas.map(async (conexao: { id: string }) => {
                    console.log(`Buscando histórico de conversas para a conexão: ${conexao.id}`);
                    const historicoResponse = await axios.get(`http://localhost:3000/api/historico-conversas/${conexao.id}`);
                    const historico = Array.isArray(historicoResponse.data) ? historicoResponse.data : [];
                    return Promise.all(
                        historico.map(async (conversa: any) => {
                            const [nomeContato, urlFotoPerfil] = await Promise.all([
                                obterNomeContato(conversa.number), // Obter o nome do contato
                                obterUrlFotoPerfil(conversa.number), // Obter a foto de perfil
                            ]);
                            return {
                                ...conversa,
                                name: nomeContato || conversa.number, // Associar o nome do contato
                                profilePicUrl: urlFotoPerfil, // Associar a foto de perfil
                                connectionId: conexao.id,
                                messages: conversa.messages.map((msg: Mensagem) => ({
                                    ...msg,
                                    isMe: msg.isMe || false, // Certifique-se de que o campo isMe está presente
                                })),
                            };
                        })
                    );
                })
            );

            console.log('Conversas carregadas:', conversas.flat());
            setConversas(conversas.flat()); // Combinar todas as conversas de todas as conexões
        } catch (error) {
            console.error('Erro ao buscar histórico de conversas:', error);
        }
    };

    useEffect(() => {
        buscarHistoricoConversas();

        const handleMensagemRecebida = async (mensagem: Mensagem) => {
            console.log('Mensagem recebida:', mensagem);
            if (mensagem.from.includes('broadcast')) {
                console.log('Mensagem ignorada (broadcast).');
                return;
            }

            const [nomeContato, urlFotoPerfil] = await Promise.all([
                obterNomeContato(mensagem.from), // Obter o nome do contato
                obterUrlFotoPerfil(mensagem.from), // Obter a foto de perfil
            ]);

            setConversas((prevConversas) => {
                const conversaExistente = prevConversas.find(conv => conv.number === mensagem.from.replace('@c.us', ''));
                if (conversaExistente) {
                    console.log('Conversa existente encontrada. Atualizando mensagens...');
                    // Adiciona a nova mensagem sem sobrescrever as existentes
                    conversaExistente.messages = [...conversaExistente.messages, { ...mensagem, isMe: false }];
                    conversaExistente.unread += 1;
                    return [...prevConversas];
                } else {
                    console.log('Nova conversa criada para a mensagem recebida.');
                    const novaConversa: Conversa = {
                        id: `${Date.now()}`, // Gerar um ID único para a conversa
                        name: nomeContato || mensagem.from.replace('@c.us', ''), // Usar o nome do contato ou o número
                        number: mensagem.from.replace('@c.us', ''),
                        messages: [
                            {
                                ...mensagem,
                                isMe: false, // Certifique-se de que a mensagem recebida é marcada como não sendo sua
                            },
                        ],
                        unread: 1,
                        active: true,
                        profilePicUrl: urlFotoPerfil, // Associar a foto de perfil
                        connectionId: mensagem.idConexao,
                    };
                    return [...prevConversas, novaConversa];
                }
            });
        };

        socket.on('messageReceived', handleMensagemRecebida);

        return () => {
            socket.off('messageReceived', handleMensagemRecebida);
        };
    }, []);

    const obterNomeContato = async (numero: string): Promise<string | null> => {
        try {
            // Certifique-se de que o número está no formato correto
            const numeroFormatado = numero.includes('@') ? numero : `${numero}@c.us`;
            const response = await axios.get(`http://localhost:3000/api/nome-contato/${numeroFormatado}`);
            return response.data.name || null;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Erro ao obter nome do contato:', error.message);
            } else if (error instanceof Error) {
                console.error('Erro ao obter nome do contato:', error.message);
            } else {
                console.error('Erro desconhecido ao obter nome do contato:', error);
            }
            return null;
        }
    };

    const obterUrlFotoPerfil = async (numero: string): Promise<string | undefined> => {
        try {
            // Certifique-se de que o número está no formato correto
            const numeroFormatado = numero.includes('@') ? numero : `${numero}@c.us`;
            const response = await axios.get(`http://localhost:3000/api/foto-perfil/${numeroFormatado}`);
            return response.data.profilePicUrl || undefined;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Erro ao obter foto de perfil:', error.message);
            } else if (error instanceof Error) {
                console.error('Erro ao obter foto de perfil:', error.message);
            } else {
                console.error('Erro desconhecido ao obter foto de perfil:', error);
            }
            return undefined;
        }
    };

    const enviarMensagem = async () => {
        if (novaMensagem.trim() === '' || !conversaSelecionada) return;

        try {
            const idConexao = localStorage.getItem('idConexao');
            if (!idConexao) {
                console.error('Erro: ID da conexão não encontrado no localStorage.');
                return;
            }

            console.log('Enviando mensagem com ID:', idConexao);

            await axios.post('http://localhost:3000/api/mensagens', {
                idConexao,
                numero: conversaSelecionada.number,
                mensagem: novaMensagem,
            });

            const novaMsg: Mensagem = {
                idConexao,
                from: 'me',
                body: novaMensagem,
                timestamp: Date.now(),
                isMe: true, // Adicionado campo isMe
            };

            setConversas((prevConversas) => {
                const conv = prevConversas.find(conv => conv.id === conversaSelecionada.id);
                if (conv) {
                    // Adiciona a nova mensagem sem sobrescrever as existentes
                    conv.messages = [...conv.messages, novaMsg];
                    conv.unread = 0;
                }
                return [...prevConversas];
            });

            setNovaMensagem('');
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
        }
    };

    const buscarConexoesAtivas = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/conexoes');
            const conexoesAtivas = response.data.filter((conexao: { id: string; status: string }) => conexao.status === 'ativo');
            console.log('Conexões ativas:', conexoesAtivas);

            setConversas((prevConversas) =>
                prevConversas.map((conversa) => {
                    const conexaoAtiva = conexoesAtivas.find((conexao: { id: string }) => conexao.id === conversa.connectionId);
                    if (conexaoAtiva) {
                        return { ...conversa, connectionId: conexaoAtiva.id }; // Atualizar o ID da conexão
                    }
                    return conversa;
                })
            );
        } catch (error) {
            console.error('Erro ao buscar conexões ativas:', error);
        }
    };

    useEffect(() => {
        buscarConexoesAtivas(); // Atualizar conexões ativas ao carregar o componente
    }, []);

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            enviarMensagem();
        }
    };

    const selecionarConversa = (conversa: Conversa) => {
        setConversaSelecionada(conversa);
        setConversas((prevConversas) => {
            return prevConversas.map(conv => {
                if (conv.number === conversa.number) {
                    return { ...conv, unread: 0 }; // Zerar notificações, mas manter na fila
                }
                return conv;
            });
        });
    };

    return (
        <div className="chat-container">
            <div className="conversation-list">
                <h2>Conversas</h2>
                <ul>
                    {conversas.map((conversa, index) => (
                        <li
                            key={`${conversa.id}-${index}`} // Garante que a chave seja única combinando o ID e o índice
                            onClick={() => selecionarConversa(conversa)}
                            className={`${conversaSelecionada?.id === conversa.id ? 'selected' : ''} ${conversa.unread ? 'unread' : ''}`}
                        >
                            <div className="conversation-item">
                                {conversa.profilePicUrl && (
                                    <img src={conversa.profilePicUrl} alt="Profile" className="profile-pic" />
                                )}
                                <div className="conversation-details">
                                    {conversa.name} <span className="number">({conversa.number})</span>
                                    <span className="last-message">
                                        {conversa.messages?.[conversa.messages.length - 1]?.body || 'Sem mensagens'}
                                    </span>
                                    <span className="timestamp">
                                        {conversa.messages?.[conversa.messages.length - 1]?.timestamp
                                            ? new Date(conversa.messages[conversa.messages.length - 1].timestamp).toLocaleTimeString()
                                            : ''}
                                    </span>
                                </div>
                                {conversa.unread > 0 && (
                                    <div className="notification">
                                        {conversa.unread}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="messages-container">
                {conversaSelecionada ? (
                    <>
                        <div className="messages">
                            {conversaSelecionada.messages.map((mensagem, index) => (
                                <div
                                    key={`${mensagem.idConexao}-${index}`} // Garante que a chave seja única combinando o ID da conexão e o índice
                                    className={`message ${mensagem.isMe ? 'sent' : 'received'}`} // Use o campo isMe para diferenciar mensagens
                                >
                                    <span className="message-body">{mensagem.body}</span>
                                    <span className="timestamp">{new Date(mensagem.timestamp).toLocaleTimeString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="input-container">
                            <input
                                type="text"
                                value={novaMensagem}
                                onChange={(e) => setNovaMensagem(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Digite sua mensagem..."
                            />
                            <button onClick={enviarMensagem}>Enviar</button>
                        </div>
                    </>
                ) : (
                    <div className="no-conversation">Selecione uma conversa para começar</div>
                )}
            </div>
        </div>
    );
};

export default Chat;
