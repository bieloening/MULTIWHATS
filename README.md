# README.md

# WhatsApp Customer Service Centralization

This project centralizes customer service through multiple WhatsApp connections, allowing businesses to manage customer interactions efficiently without relying on the official WhatsApp application.

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