import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import { io } from 'socket.io-client';
import './App.css'; // Importar o arquivo CSS

const socket = io('http://localhost:3000');

const Conexoes: React.FC = () => {
    const [conexoes, setConexoes] = useState<{ id: string, status: string }[]>([]);
    const [modalVisible, setModalVisible] = useState<boolean>(false);
    const [currentQrCode, setCurrentQrCode] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const history = useHistory();

    useEffect(() => {
        listarConexoes();

        socket.on('qrCodeUpdated', ({ id, qrCode }) => {
            setCurrentQrCode(qrCode);
        });

        socket.on('statusUpdated', ({ id, status }) => {
            setConexoes((prevConexoes) => prevConexoes.map(conexao => 
                conexao.id === id ? { ...conexao, status } : conexao
            ));
            if (status === 'ativo') {
                setModalVisible(false);
                setSuccessMessage(`Dispositivo conectado com sucesso!`);
                setTimeout(() => setSuccessMessage(null), 5000); // Remove a mensagem após 5 segundos
            }
        });

        return () => {
            socket.off('qrCodeUpdated');
            socket.off('statusUpdated');
        };
    }, []);

    const listarConexoes = async () => {
        console.log('Listando conexões...');
        try {
            const response = await axios.get('http://localhost:3000/api/conexoes');
            if (Array.isArray(response.data)) {
                setConexoes(response.data);
            } else {
                console.error('Unexpected response data:', response.data);
            }
        } catch (error) {
            console.error('Erro ao listar conexões:', error);
        }
    };

    const adicionarConexao = async () => {
        console.log('Adicionando nova conexão...');
        try {
            const response = await axios.post('http://localhost:3000/api/conexoes');

            if (response.status === 201) {
                console.log('Conexão adicionada com sucesso:', response.data.id);

                // Armazena o ID da conexão no localStorage
                localStorage.setItem('idConexao', response.data.id);

                listarConexoes();
            } else {
                console.error('Erro ao adicionar conexão:', response.data.message);
            }
        } catch (error) {
            console.error('Erro ao adicionar conexão:', error);
        }
    };

    const ativarConexao = async (id: string) => {
        console.log('Ativando conexão com ID:', id);
        try {
            const response = await axios.post('http://localhost:3000/api/ativar', { id });
            if (response.status === 200) {
                console.log('Conexão ativada com sucesso:', id);
                setCurrentQrCode(response.data.qrCode);

                // Armazena o ID da conexão no localStorage
                localStorage.setItem('idConexao', id);

                setConexoes((prevConexoes) =>
                    prevConexoes.map((conexao) =>
                        conexao.id === id ? { ...conexao, status: 'ativo' } : conexao
                    )
                );

                setModalVisible(true);
            } else {
                console.error('Erro ao ativar conexão:', response.data.message);
            }
        } catch (error) {
            console.error('Erro ao ativar conexão:', error);
        }
    };

    const desativarConexao = async (id: string) => {
        console.log('Desativando conexão com ID:', id);
        try {
            const response = await axios.post('http://localhost:3000/api/desativar', { id });
            if (response.status === 200) {
                console.log('Conexão desativada com sucesso:', id);
                setCurrentQrCode(null);
            } else {
                console.error('Erro ao desativar conexão:', response.data.message);
            }
        } catch (error) {
            console.error('Erro ao desativar conexão:', error);
        }
    };

    const removerConexao = async (id: string) => {
        console.log('Removendo conexão com ID:', id);
        try {
            await axios.delete(`http://localhost:3000/api/conexoes`, { data: { id } });
            console.log('Conexão removida com sucesso:', id);
            listarConexoes();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Erro ao remover conexão (Axios):', error.message);
            } else if (error instanceof Error) {
                console.error('Erro ao remover conexão:', error.message);
            } else {
                console.error('Erro desconhecido ao remover conexão:', error);
            }
        }
    };

    const handleModalClose = () => {
        setModalVisible(false);
        setCurrentQrCode(null);
    };

    const verConversas = () => {
        history.push('/chat');
    };

    return (
        <div className="app-container">
            <h1>Gerenciador de Conexões WhatsApp</h1>
            <div className="button-container">
                <button onClick={adicionarConexao}>Adicionar Conexão</button>
                <button onClick={verConversas}>Ver conversas</button>
            </div>
            <h2>Conexões</h2>
            <ul>
                {conexoes.map((conexao, index) => (
                    <li key={conexao.id}>
                        {`CONEXÃO ${index + 1}`} - {conexao.status}
                        <div>
                            {conexao.status === 'inativo' && (
                                <button onClick={() => ativarConexao(conexao.id)}>Ativar</button>
                            )}
                            {conexao.status === 'ativo' && (
                                <button onClick={() => desativarConexao(conexao.id)}>Desativar</button>
                            )}
                            <button onClick={() => removerConexao(conexao.id)}>Remover</button>
                        </div>
                    </li>
                ))}
            </ul>
            {modalVisible && currentQrCode && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close" onClick={handleModalClose}>&times;</span>
                        <h2>QR Code</h2>
                        <img src={currentQrCode} alt="QR Code" />
                    </div>
                </div>
            )}
            {successMessage && (
                <div className="success-message">
                    {successMessage}
                </div>
            )}
        </div>
    );
};

export default Conexoes;
