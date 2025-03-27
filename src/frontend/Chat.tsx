import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import WaveSurfer from "wavesurfer.js";
import "./Chat.css"; // Importar o arquivo CSS

const socket = io("http://localhost:3000");

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
  const [conversaSelecionada, setConversaSelecionada] =
    useState<Conversa | null>(null);
  const [novaMensagem, setNovaMensagem] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null); // Ref para MediaRecorder
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState<number>(0); // Tempo de gravação em segundos
  const recordingInterval = useRef<NodeJS.Timeout | null>(null); // Referência para o intervalo de gravação
  const audioBlob = useRef<Blob | null>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const audioUrl = useRef<string | null>(null);
  const waveformContainerRef = useRef<HTMLDivElement | null>(null); // Ref para o contêiner do WaveSurfer
  const isMounted = useRef(true); // Flag para verificar se o componente está montado

  useEffect(() => {
    isMounted.current = true;

    // Inicializa o WaveSurfer somente após o contêiner estar disponível
    if (waveformContainerRef.current) {
      waveSurferRef.current = WaveSurfer.create({
        container: waveformContainerRef.current,
        waveColor: "#ddd",
        progressColor: "#4caf50",
        cursorColor: "#4caf50",
        height: 50,
      });
    }

    return () => {
      isMounted.current = false;

      // Limpa o WaveSurfer ao desmontar o componente
      waveSurferRef.current?.destroy();
      waveSurferRef.current = null;

      // Limpa o intervalo de gravação
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  const normalizarNumero = (numero: string): string => {
    return numero.replace("@c.us", ""); // Remove o sufixo @c.us para padronizar
  };

  const buscarHistoricoConversas = async () => {
    try {
      console.log("Buscando conexões ativas...");
      const response = await axios.get("http://localhost:3000/api/conexoes");
      const conexoesAtivas = response.data.filter(
        (conexao: { id: string; status: string }) => conexao.status === "ativo"
      );
      console.log("Conexões ativas:", conexoesAtivas);

      const conversas = await Promise.all(
        conexoesAtivas.map(async (conexao: { id: string }) => {
          console.log(
            `Buscando histórico de conversas para a conexão: ${conexao.id}`
          );
          const historicoResponse = await axios.get(
            `http://localhost:3000/api/historico-conversas/${conexao.id}`
          );
          const historico = Array.isArray(historicoResponse.data)
            ? historicoResponse.data
            : [];
          return Promise.all(
            historico.map(async (conversa: any) => {
              const [nomeContato, urlFotoPerfil] = await Promise.all([
                obterNomeContato(normalizarNumero(conversa.number)), // Normalizar o número
                obterUrlFotoPerfil(normalizarNumero(conversa.number)), // Normalizar o número
              ]);
              return {
                ...conversa,
                name: nomeContato || normalizarNumero(conversa.number), // Usar o nome ou número normalizado
                number: normalizarNumero(conversa.number), // Garantir que o número esteja normalizado
                profilePicUrl: urlFotoPerfil,
                connectionId: conexao.id,
                messages: conversa.messages.map((msg: Mensagem) => ({
                  ...msg,
                  from: normalizarNumero(msg.from), // Normalizar o número do remetente
                  isMe: msg.isMe || false,
                })),
              };
            })
          );
        })
      );

      console.log("Conversas carregadas:", conversas.flat());
      setConversas(conversas.flat()); // Combinar todas as conversas de todas as conexões
    } catch (error) {
      console.error("Erro ao buscar histórico de conversas:", error);
    }
  };

  useEffect(() => {
    buscarHistoricoConversas();

    const handleMensagemRecebida = async (mensagem: Mensagem) => {
      if (mensagem.from === "status@broadcast") {
        console.log("Mensagem ignorada: status@broadcast");
        return; // Ignorar mensagens de broadcast
      }

      console.log("Mensagem recebida:", mensagem);

      const numeroNormalizado = normalizarNumero(
        mensagem.isMe ? mensagem.idConexao : mensagem.from
      );

      const [nomeContato, urlFotoPerfil] = await Promise.all([
        obterNomeContato(numeroNormalizado),
        obterUrlFotoPerfil(numeroNormalizado),
      ]);

      setConversas((prevConversas) => {
        const conversaExistente = prevConversas.find(
          (conv) => conv.number === numeroNormalizado
        );
        if (conversaExistente) {
          console.log(
            "Conversa existente encontrada. Atualizando mensagens..."
          );
          conversaExistente.messages = [
            ...conversaExistente.messages,
            mensagem,
          ];
          return [...prevConversas];
        } else {
          console.log("Nova conversa criada para a mensagem recebida.");
          const novaConversa: Conversa = {
            id: `${Date.now()}`,
            name: nomeContato || numeroNormalizado,
            number: numeroNormalizado,
            messages: [mensagem],
            unread: mensagem.isMe ? 0 : 1,
            active: true,
            profilePicUrl: urlFotoPerfil,
            connectionId: mensagem.idConexao,
          };
          return [...prevConversas, novaConversa];
        }
      });

      setConversaSelecionada((prevConversa) => {
        if (prevConversa && prevConversa.number === numeroNormalizado) {
          return {
            ...prevConversa,
            messages: [...prevConversa.messages, mensagem],
          };
        }
        return prevConversa;
      });
    };

    socket.on("messageReceived", handleMensagemRecebida);

    return () => {
      socket.off("messageReceived", handleMensagemRecebida);
    };
  }, []);

  const obterNomeContato = async (numero: string): Promise<string | null> => {
    try {
      // Certifique-se de que o número está no formato correto
      const numeroFormatado = numero.includes("@") ? numero : `${numero}@c.us`;
      const response = await axios.get(
        `http://localhost:3000/api/nome-contato/${numeroFormatado}`
      );
      return response.data.name || null;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Erro ao obter nome do contato:", error.message);
      } else if (error instanceof Error) {
        console.error("Erro ao obter nome do contato:", error.message);
      } else {
        console.error("Erro desconhecido ao obter nome do contato:", error);
      }
      return null;
    }
  };

  const obterUrlFotoPerfil = async (
    numero: string
  ): Promise<string | undefined> => {
    try {
      // Certifique-se de que o número está no formato correto
      const numeroFormatado = numero.includes("@") ? numero : `${numero}@c.us`;
      const response = await axios.get(
        `http://localhost:3000/api/foto-perfil/${numeroFormatado}`
      );
      return response.data.profilePicUrl || undefined;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Erro ao obter foto de perfil:", error.message);
      } else if (error instanceof Error) {
        console.error("Erro ao obter foto de perfil:", error.message);
      } else {
        console.error("Erro desconhecido ao obter foto de perfil:", error);
      }
      return undefined;
    }
  };

  const enviarMensagem = async () => {
    if (novaMensagem.trim() === "" || !conversaSelecionada) return;

    try {
      const idConexao = localStorage.getItem("idConexao");
      if (!idConexao) {
        console.error("Erro: ID da conexão não encontrado no localStorage.");
        return;
      }

      console.log("Enviando mensagem com ID:", idConexao);

      const response = await axios.post("http://localhost:3000/api/mensagens", {
        idConexao,
        numero: conversaSelecionada.number,
        mensagem: novaMensagem,
      });

      if (response.status === 200) {
        const novaMsg: Mensagem = {
          idConexao,
          from: "me", // Ajustar para refletir que a mensagem foi enviada por você
          body: novaMensagem,
          timestamp: Date.now(),
          isMe: true, // Certifique-se de que a mensagem enviada é marcada como sua
        };

        setConversas((prevConversas) => {
          return prevConversas.map((conv) => {
            if (conv.number === conversaSelecionada.number) {
              return {
                ...conv,
                messages: [...conv.messages, novaMsg], // Adiciona a nova mensagem
                unread: 0, // Zera as notificações
              };
            }
            return conv;
          });
        });

        setConversaSelecionada((prevConversa) => {
          if (
            prevConversa &&
            prevConversa.number === conversaSelecionada.number
          ) {
            return {
              ...prevConversa,
              messages: [...prevConversa.messages, novaMsg], // Atualiza as mensagens da conversa selecionada
            };
          }
          return prevConversa;
        });

        setNovaMensagem("");
      } else {
        console.error("Erro ao enviar mensagem: Resposta inesperada da API", response.data);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Erro ao enviar mensagem (Axios):", error.message);
      } else if (error instanceof Error) {
        console.error("Erro ao enviar mensagem:", error.message);
      } else {
        console.error("Erro desconhecido ao enviar mensagem:", error);
      }
    }
  };

  const enviarArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!conversaSelecionada || !event.target.files?.length) return;

    const arquivo = event.target.files[0];
    const formData = new FormData();
    formData.append("file", arquivo);
    formData.append("idConexao", localStorage.getItem("idConexao") || "");
    formData.append("numero", conversaSelecionada.number);

    try {
      await axios.post("http://localhost:3000/api/enviar-arquivo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      console.log("Arquivo enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar arquivo:", error);
    }
  };

  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioBlob.current = event.data;
          const url = URL.createObjectURL(event.data);
          audioUrl.current = url;
          waveSurferRef.current?.load(url);
        }
      };

      recorder.onstop = () => {
        setRecordingTime(0);
        if (recordingInterval.current) {
          clearInterval(recordingInterval.current);
        }
      };

      recorder.start();
      mediaRecorder.current = recorder; // Armazena o MediaRecorder na ref
      setIsRecording(true);

      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
    }
  };

  const pararGravacao = () => {
    if (mediaRecorder.current) { // Verifica se mediaRecorder não é null
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const gravarAudio = () => {
    if (isRecording) {
      pararGravacao();
    } else {
      iniciarGravacao();
    }
  };

  const enviarAudio = async () => {
    if (!audioBlob.current || !conversaSelecionada) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
        const audioBase64 = reader.result?.toString().split(',')[1]; // Extrai o Base64
        if (!audioBase64) return;

        try {
            await axios.post("http://localhost:3000/api/enviar-mensagem-voz", {
                idConexao: localStorage.getItem("idConexao"),
                numero: conversaSelecionada.number,
                audioBase64,
            });
            console.log("Mensagem de voz enviada com sucesso!");
            audioBlob.current = null;
        } catch (error) {
            console.error("Erro ao enviar mensagem de voz:", error);
        }
    };

    reader.readAsDataURL(audioBlob.current);
};

  const formatarTempo = (tempo: number): string => {
    const minutos = Math.floor(tempo / 60);
    const segundos = tempo % 60;
    return `${minutos.toString().padStart(2, "0")}:${segundos
      .toString()
      .padStart(2, "0")}`;
  };

  const buscarConexoesAtivas = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/conexoes");
      const conexoesAtivas = response.data.filter(
        (conexao: { id: string; status: string }) => conexao.status === "ativo"
      );
      console.log("Conexões ativas:", conexoesAtivas);

      setConversas((prevConversas) =>
        prevConversas.map((conversa) => {
          const conexaoAtiva = conexoesAtivas.find(
            (conexao: { id: string }) => conexao.id === conversa.connectionId
          );
          if (conexaoAtiva) {
            return { ...conversa, connectionId: conexaoAtiva.id }; // Atualizar o ID da conexão
          }
          return conversa;
        })
      );
    } catch (error) {
      console.error("Erro ao buscar conexões ativas:", error);
    }
  };

  useEffect(() => {
    buscarConexoesAtivas(); // Atualizar conexões ativas ao carregar o componente
  }, []);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      enviarMensagem();
    }
  };

  const selecionarConversa = (conversa: Conversa) => {
    setConversaSelecionada(conversa);
    setConversas((prevConversas) => {
      return prevConversas.map((conv) => {
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
              key={`${conversa.id}-${index}`}
              onClick={() => selecionarConversa(conversa)}
              className={`${
                conversaSelecionada?.id === conversa.id ? "selected" : ""
              } ${conversa.unread ? "unread" : ""}`}
            >
              <div className="conversation-item">
                {conversa.profilePicUrl && (
                  <img
                    src={conversa.profilePicUrl}
                    alt="Profile"
                    className="profile-pic"
                  />
                )}
                <div className="conversation-details">
                  {conversa.name}{" "}
                  <span className="number">({conversa.number})</span>
                  <span className="last-message">
                    {conversa.messages?.[conversa.messages.length - 1]?.body ||
                      "Sem mensagens"}
                  </span>
                  <span className="timestamp">
                    {conversa.messages?.[conversa.messages.length - 1]
                      ?.timestamp
                      ? new Date(
                          conversa.messages[
                            conversa.messages.length - 1
                          ].timestamp
                        ).toLocaleTimeString()
                      : ""}
                  </span>
                </div>
                {conversa.unread > 0 && (
                  <div className="notification">{conversa.unread}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="messages-container">
        {conversaSelecionada ? (
          <>
            {/* Barra de informações do contato */}
            <div className="contact-info-bar">
              {conversaSelecionada.profilePicUrl && (
                <img
                  src={conversaSelecionada.profilePicUrl}
                  alt="Profile"
                  className="contact-profile-pic"
                />
              )}
              <div className="contact-details">
                <h3>{conversaSelecionada.name}</h3>
                <p>{conversaSelecionada.number}</p>
              </div>
            </div>

            {/* Área de mensagens */}
            <div className="messages">
              {conversaSelecionada.messages.map((mensagem, index) => (
                <div
                  key={`${mensagem.idConexao}-${index}`}
                  className={`message ${mensagem.isMe ? "sent" : "received"}`}
                >
                  <span className="message-body">{mensagem.body}</span>
                  <span className="timestamp">
                    {new Date(mensagem.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>

            <div id="waveform" ref={waveformContainerRef}></div>

            {/* Input para envio de mensagens */}
            <div className="input-container">
              {isRecording ? (
                <div className="recording-timer">
                  Gravando: {formatarTempo(recordingTime)}
                </div>
              ) : (
                <input
                  type="text"
                  value={novaMensagem}
                  onChange={(e) => setNovaMensagem(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua mensagem..."
                />
              )}
              <input
                type="file"
                id="file-input"
                style={{ display: "none" }}
                onChange={enviarArquivo}
              />
              <button onClick={gravarAudio}>
                <i className={`fas ${isRecording ? "fa-times" : "fa-microphone"}`}></i>
              </button>
              <button onClick={enviarAudio}>
                <i className="fas fa-paper-plane"></i>
              </button>
            </div>
          </>
        ) : (
          <div className="no-conversation">
            Selecione uma conversa para começar
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
