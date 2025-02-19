import express from 'express';
import { definirRotas } from './routes';

const app = express();
const porta = 3000;

app.use(express.json());

definirRotas(app);

app.listen(porta, () => {
    console.log(`Servidor está rodando em http://localhost:${porta}`);
});