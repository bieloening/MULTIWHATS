# README.md

# WhatsApp Customer Service Centralization

This project centralizes customer service through multiple WhatsApp connections, allowing businesses to manage customer interactions efficiently without relying on the official WhatsApp application.

Este projeto centraliza o atendimento ao cliente por meio de várias conexões do WhatsApp, permitindo que as empresas gerenciem interações com clientes de forma eficiente, sem depender do aplicativo oficial do WhatsApp.

## Project Structure

```
whatsapp-customer-service
├── src
│   ├── app.ts                # Entry point of the application
│   ├── controllers           # Contains controllers for handling requests
│   │   └── index.ts
│   ├── routes                # Defines API routes
│   │   └── index.ts
│   ├── services              # Manages WhatsApp connections
│   │   └── whatsappService.ts
│   └── types                 # Type definitions for requests and responses
│       └── index.ts
├── docker-compose.yml        # Docker configuration for the application
├── Dockerfile                # Instructions to build the Docker image
├── package.json              # npm configuration file
├── tsconfig.json             # TypeScript configuration file
└── README.md                 # Project documentation

whatsapp-customer-service
├── src
│   ├── app.ts                # Ponto de entrada da aplicação
│   ├── controllers           # Contém os controladores para lidar com requisições
│   │   └── index.ts
│   ├── routes                # Define as rotas da API
│   │   └── index.ts
│   ├── services              # Gerencia as conexões do WhatsApp
│   │   └── whatsappService.ts
│   └── types                 # Definições de tipos para requisições e respostas
│       └── index.ts
├── docker-compose.yml        # Configuração do Docker para a aplicação
├── Dockerfile                # Instruções para construir a imagem Docker
├── package.json              # Arquivo de configuração do npm
├── tsconfig.json             # Arquivo de configuração do TypeScript
└── README.md                 # Documentação do projeto

```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd whatsapp-customer-service
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Build the Docker image:**
   ```
   docker-compose build
   ```

4. **Run the application:**
   ```
   docker-compose up
   ```

## Usage

- The application exposes an API for managing customer service requests through WhatsApp.
- Use the defined routes to interact with the WhatsApp service.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

