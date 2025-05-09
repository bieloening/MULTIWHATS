# WhatsApp Customer Service Centralization

This project centralizes customer service through multiple WhatsApp connections, allowing businesses to manage customer interactions efficiently without relying on the official WhatsApp application.

Este projeto centraliza o atendimento ao cliente por meio de várias conexões do WhatsApp, permitindo que as empresas gerenciem interações com clientes de forma eficiente, sem depender do aplicativo oficial do WhatsApp.

## Project Structure

```
whatsapp-customer-service
├── frontend                # Contains the React frontend code
│   ├── src                 # Frontend source code (components, styles, etc.)
│   │   ├── App.tsx
│   │   ├── Chat.tsx
│   │   ├── Conexoes.tsx
│   │   ├── index.tsx
│   │   ├── App.css
│   │   └── Chat.css
│   ├── public              # Static files and HTML for the frontend
│   │   └── index.html
│   └── tsconfig.json       # TypeScript config for frontend
├── backend                 # Contains the Node.js backend code
│   ├── src
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── controllers
│   │   │   └── index.ts
│   │   ├── routes
│   │   │   └── index.ts
│   │   ├── services
│   │   │   ├── whatsappService.ts
│   │   │   └── __tests__
│   │   │       └── whatsappService.test.ts
│   │   └── types
│   │       └── index.ts
│   └── tsconfig.json       # TypeScript config for backend
├── logs                    # Directory for server logs
├── temp                    # Directory for temporary files
├── uploads                 # Directory for uploaded files
├── docker-compose.yml      # Docker configuration for the application
├── Dockerfile              # Instructions to build the Docker image
├── package.json            # npm configuration file
├── tsconfig.json           # (optional, if using a base tsconfig)
└── README.md               # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```sh
   git clone <repository-url>
   cd whatsapp-customer-service
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Build the Docker image:**
   ```sh
   docker-compose build
   ```

4. **Run the application:**
   ```sh
   docker-compose up
   ```

## Usage

- The application exposes an API for managing customer service requests through WhatsApp.
- Use the defined routes to interact with the WhatsApp service.

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

