# Usa a imagem oficial do Node.js
FROM node:18

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos package.json e package-lock.json para instalar dependências
COPY package*.json ./

# Instala as dependências do projeto
RUN npm install

# Copia todo o código do projeto para dentro do container
COPY . .

# Compila o código TypeScript
RUN npm run build

# Expõe a porta 3000 para comunicação externa
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]