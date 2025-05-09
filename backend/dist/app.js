"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = require("./routes");
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const porta = 3000;
app.use(express_1.default.json());
(0, routes_1.definirRotas)(app);
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'frontend')));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '..', 'frontend', 'index.html'));
});
app.listen(porta, () => {
    console.log(`Servidor está rodando em http://localhost:${porta}`);
});
