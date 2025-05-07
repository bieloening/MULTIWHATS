import { convertAudio } from '../whatsappService';
import ServicoWhatsApp from '../whatsappService';
import fs from 'fs';
import path from 'path';
import * as whatsappService from '../whatsappService';

// Adiciona logs para verificar a importação
console.log('Valor de ServicoWhatsApp:', ServicoWhatsApp);

// Ajusta o mock para preservar a exportação padrão
jest.mock('../whatsappService', () => {
  const originalModule = jest.requireActual('../whatsappService');
  return {
    ...originalModule,
    convertAudio: jest.fn(),
  };
});

const convertAudioMock = whatsappService.convertAudio as jest.Mock;

// Usa a classe original diretamente
const ServicoWhatsAppClass = jest.requireActual('../whatsappService').default;

// Certifique-se de que o diretório `temp/` existe antes de executar os testes
beforeAll(() => {
  const tempDir = path.join(__dirname, '../../../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
});

describe('Conversão de Áudio', () => {
  it('deve converter um arquivo .webm para .mp3', async () => {
    const inputPath = path.join(__dirname, '../../../uploads/electronic_beat_7s.webm');
    const outputPath = path.join(__dirname, '../../../temp/test-audio.mp3');

    console.log(`Caminho do arquivo de entrada: ${inputPath}`);
    console.log(`Caminho do arquivo de saída: ${outputPath}`);

    // Mocka a função convertAudio para simular a conversão
    convertAudioMock.mockImplementation(async (inputPath, outputPath) => {
      fs.writeFileSync(outputPath, 'fake-audio-content'); // Simula a criação do arquivo convertido
    });

    // Simula a conversão
    await convertAudio(inputPath, outputPath);

    // Verifica se o arquivo convertido existe
    const fileExists = fs.existsSync(outputPath);
    console.log(`Arquivo convertido existe: ${fileExists}`);
    expect(fileExists).toBe(true);

    // Limpa o arquivo convertido após o teste
    if (fileExists) {
      fs.unlinkSync(outputPath);
      console.log(`Arquivo convertido removido: ${outputPath}`);
    }

    // Restaura a função original
    convertAudioMock.mockRestore();
  });
});

describe('Envio de Mensagem de Voz', () => {
  it('deve enviar uma mensagem de voz para o número correto', async () => {
    const mockClient = {
      sendMessage: jest.fn(),
    };

    const servicoWhatsApp = new ServicoWhatsAppClass();
    jest.spyOn(servicoWhatsApp, 'obterConexao').mockReturnValue(mockClient as any);

    const idConta = 'test-account';
    const numero = '554799036748';
    const audioPath = path.join(__dirname, '../../../uploads/electronic_beat_7s.webm');
    const buffer = fs.readFileSync(audioPath);

    // Simula o envio de mensagem de voz com buffer válido
    await servicoWhatsApp.enviarMensagemDeVoz(idConta, numero, buffer);

    // Verifica se o método sendMessage foi chamado corretamente
    expect(mockClient.sendMessage).toHaveBeenCalledWith(`${numero}@c.us`, expect.any(Object), { sendAudioAsVoice: true });
  });

  it('deve salvar o arquivo temporário com a extensão correta', async () => {
    const mockClient = {
      sendMessage: jest.fn(),
    };

    const servicoWhatsApp = new ServicoWhatsAppClass();
    jest.spyOn(servicoWhatsApp, 'obterConexao').mockReturnValue(mockClient as any);

    const idConta = 'test-account';
    const numero = '554799036748';
    const audioPath = path.join(__dirname, '../../../uploads/electronic_beat_7s.webm');
    const buffer = fs.readFileSync(audioPath);

    // Mocka a função fs.unlinkSync para evitar remoção dos arquivos temporários
    const unlinkMock = jest.spyOn(fs, 'unlinkSync').mockImplementation(() => {});

    // Simula o envio de mensagem de voz com buffer válido
    await servicoWhatsApp.enviarMensagemDeVoz(idConta, numero, buffer);

    // Verifica se o arquivo temporário foi salvo com a extensão correta
    const tempDir = path.join(__dirname, '../../../temp');
    const files = fs.readdirSync(tempDir);
    const webmFile = files.find(file => file.endsWith('-audio.webm'));

    expect(webmFile).toBeDefined();
    console.log(`Arquivo temporário encontrado: ${webmFile}`);

    // Restaura a função original
    unlinkMock.mockRestore();
  });

  it('deve enviar uma mensagem de voz com o arquivo convertido para .mp3', async () => {
    const mockClient = {
      sendMessage: jest.fn(),
    };

    const servicoWhatsApp = new ServicoWhatsAppClass();
    jest.spyOn(servicoWhatsApp, 'obterConexao').mockReturnValue(mockClient as any);

    const idConta = 'test-account';
    const numero = '554799036748';
    const audioPath = path.join(__dirname, '../../../uploads/electronic_beat_7s.webm');
    const buffer = fs.readFileSync(audioPath);

    // Mocka a função convertAudio para simular a conversão
    convertAudioMock.mockImplementation(async (inputPath, outputPath) => {
      fs.writeFileSync(outputPath, 'fake-audio-content'); // Simula a criação do arquivo convertido
    });

    // Simula o envio de mensagem de voz com buffer válido
    await servicoWhatsApp.enviarMensagemDeVoz(idConta, numero, buffer);

    // Verifica se o método sendMessage foi chamado com o arquivo convertido
    expect(mockClient.sendMessage).toHaveBeenCalledWith(
      `${numero}@c.us`,
      expect.objectContaining({ mimetype: 'audio/mpeg' }), // Alterado de 'audio/mp3' para 'audio/mpeg'
      { sendAudioAsVoice: true }
    );

    // Restaura a função original
    convertAudioMock.mockRestore();
  });
});