# Architecture Documentation

This document provides a comprehensive overview of the b.sure Chatbot Grafana Panel architecture using visual diagrams.

## System Overview

```mermaid
graph TB
    User[👤 User] --> |Interacts with| GrafanaUI[🖥️ Grafana Dashboard]
    GrafanaUI --> |Contains| ChatPanel[💬 Chatbot Panel]
    ChatPanel --> |Sends questions| Backend[🔧 Go Backend]
    Backend --> |API calls| GroqAPI[🤖 Groq API]
    ChatPanel --> |Fetches data| GrafanaAPI[📊 Grafana API]

    subgraph "Plugin Components"
        ChatPanel
        Backend
    end

    subgraph "External Services"
        GroqAPI
        GrafanaAPI
    end
```

## Plugin Architecture

```mermaid
graph LR
    subgraph "Frontend (React/TypeScript)"
        A[ChatbotPanel.tsx] --> B[Theme Integration]
        A --> C[Data Extraction]
        A --> D[User Interface]
        B --> E[useTheme2 Hook]
        C --> F[Dashboard API Calls]
        D --> G[Chat Interface]
    end

    subgraph "Backend (Go)"
        H[plugin.go] --> I[Resource Handler]
        I --> J[API Key Management]
        I --> K[Request Validation]
        I --> L[Groq API Integration]
    end

    A --> |HTTP Requests| I
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant CP as ChatbotPanel
    participant GA as Grafana API
    participant GB as Go Backend
    participant GQ as Groq API

    U->>CP: Types question
    CP->>GA: GET /api/dashboards/uid/{id}
    GA-->>CP: Dashboard metadata
    CP->>CP: Extract & enrich panel data
    CP->>GB: POST /api/plugins/bsure-chatbot-panel/resources/groq-chat
    GB->>GB: Validate request & API key
    GB->>GQ: POST /openai/v1/chat/completions
    GQ-->>GB: AI response
    GB-->>CP: Formatted response
    CP-->>U: Display AI answer
```

## Component Structure

```mermaid
graph TD
    subgraph "React Component Hierarchy"
        A[ChatbotPanel] --> B[ChatbotErrorBoundary]
        B --> C[ChatbotPanelInner]
        C --> D[Chat Container]
        C --> E[Input Container]
        D --> F[Message Bubbles]
        E --> G[Text Input]
        E --> H[Send Button]
    end

    subgraph "Styling System"
        I[useTheme2] --> J[Theme-aware CSS]
        J --> K[Emotion CSS-in-JS]
        K --> D
        K --> E
    end
```

## Security Architecture

```mermaid
graph TB
    subgraph "Frontend Security"
        A[Input Validation] --> B[XSS Protection]
        B --> C[Data Sanitization]
        C --> D[Request Limits]
    end

    subgraph "Backend Security"
        E[Environment Variables] --> F[API Key Protection]
        F --> G[Request Validation]
        G --> H[Error Sanitization]
        H --> I[Rate Limiting]
    end

    subgraph "Data Flow Security"
        J[User Input] --> A
        A --> K[Sanitized Data]
        K --> G
        G --> L[Validated Request]
        L --> M[Groq API]
        M --> N[Response]
        N --> H
        H --> O[Safe Response]
    end
```

## Configuration Management

```mermaid
graph LR
    subgraph "Environment Configuration"
        A[GROQ_API_KEY] --> B[Docker Environment]
        B --> C[Go Backend]
    end

    subgraph "Panel Configuration"
        D[plugin.json] --> E[Panel Options]
        E --> F[initialChatMessage]
        E --> G[llmUsed]
        F --> H[System Prompt]
        G --> I[Model Selection]
    end

    subgraph "Build Configuration"
        J[Webpack Config] --> K[Frontend Build]
        L[Go Build] --> M[Backend Binary]
        K --> N[dist/ folder]
        M --> N
    end
```

## Development Workflow

```mermaid
graph TD
    A[Developer] --> B{Change Type?}
    B -->|Frontend| C[Edit src/]
    B -->|Backend| D[Edit pkg/]

    C --> E[npm run dev]
    E --> F[Auto-rebuild]
    F --> G[Hot Reload]

    D --> H[npm run dev:backend]
    H --> I[Go Build]
    I --> J[docker compose restart]

    G --> K[Test in Browser]
    J --> K
    K --> L[Ready for Testing]
```

## API Integration Flow

```mermaid
graph TB
    subgraph "Data Enrichment Process"
        A[User Question] --> B[Dashboard UID Extraction]
        B --> C[Fetch Dashboard Metadata]
        C --> D[Extract Panel Information]
        D --> E[Enrich with Panel Data]
        E --> F[Sanitize Data]
        F --> G[Create System Prompt]
    end

    subgraph "AI Processing"
        G --> H[Prepare Messages Array]
        H --> I[Send to Backend]
        I --> J[Validate & Forward to Groq]
        J --> K[Receive AI Response]
        K --> L[Return to Frontend]
        L --> M[Display to User]
    end
```

## Error Handling Architecture

```mermaid
graph TB
    subgraph "Frontend Error Handling"
        A[User Action] --> B{Validation Pass?}
        B -->|No| C[Show Validation Error]
        B -->|Yes| D[Process Request]
        D --> E{Request Success?}
        E -->|No| F[Show API Error]
        E -->|Yes| G[Show Response]
    end

    subgraph "Backend Error Handling"
        H[Incoming Request] --> I{Valid Format?}
        I -->|No| J[400 Bad Request]
        I -->|Yes| K{API Key Present?}
        K -->|No| L[500 Internal Error]
        K -->|Yes| M{Groq API Success?}
        M -->|No| N[502 Bad Gateway]
        M -->|Yes| O[200 Success]
    end

    subgraph "Error Boundary"
        P[Component Error] --> Q[Error Boundary Catch]
        Q --> R[Show Retry UI]
        R --> S[User Retry Action]
        S --> A
    end
```

## Build & Deployment Pipeline

```mermaid
graph LR
    subgraph "Development Build"
        A[Source Code] --> B[Frontend Build]
        A --> C[Backend Build]
        B --> D[Webpack Dev]
        C --> E[Go Build Dev]
        D --> F[dist/ Output]
        E --> F
    end

    subgraph "Production Build"
        G[Source Code] --> H[Frontend Prod Build]
        G --> I[Backend Cross-Platform]
        H --> J[Optimized Bundle]
        I --> K[Multi-Platform Binaries]
        J --> L[Production dist/]
        K --> L
    end

    subgraph "Docker Deployment"
        M[Docker Compose] --> N[Grafana Container]
        L --> O[Plugin Mount]
        O --> N
        P[Environment Variables] --> N
    end
```

## Technology Stack

```mermaid
graph TB
    subgraph "Frontend Stack"
        A[React 18] --> B[TypeScript]
        B --> C[Emotion CSS-in-JS]
        C --> D[Grafana UI Components]
        D --> E[RxJS Observables]
    end

    subgraph "Backend Stack"
        F[Go 1.21+] --> G[Grafana Plugin SDK]
        G --> H[HTTP Client]
        H --> I[JSON Processing]
    end

    subgraph "Build Tools"
        J[Webpack 5] --> K[Babel]
        K --> L[TypeScript Compiler]
        M[Go Compiler] --> N[Cross-Platform Builds]
    end

    subgraph "External APIs"
        O[Groq API] --> P[LLM Models]
        Q[Grafana API] --> R[Dashboard Data]
    end
```

## Key Features & Capabilities

- **🔒 Enterprise Security**: API keys never exposed to frontend
- **🎨 Theme Integration**: Full support for Grafana dark/light themes
- **📊 Data Enrichment**: Automatically includes dashboard context
- **⚡ Real-time Chat**: Interactive conversation interface
- **🛡️ Input Validation**: Comprehensive XSS and injection protection
- **🔄 Error Recovery**: Graceful error handling with retry mechanisms
- **📱 Responsive Design**: Works across different screen sizes
- **♿ Accessibility**: ARIA labels and keyboard navigation support
