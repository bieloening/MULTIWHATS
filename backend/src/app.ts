import express from 'express';
import { definirRotas } from './routes';
import path from 'path';

const app = express();
const porta = 3000;

app.use(express.json());
definirRotas(app);

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(porta, () => {
    console.log(`Servidor está rodando em http://localhost:${porta}`);
});