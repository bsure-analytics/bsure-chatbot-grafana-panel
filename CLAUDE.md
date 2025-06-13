# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Grafana panel plugin that provides an AI chat interface powered by Groq API. The plugin enriches user questions with dashboard data and sends them to an LLM for contextual responses.

## Development Practices

### Commit Messages

- For changes that don't affect observable behavior (documentation, formatting, etc.), append `[skip ci]` to the commit message
- **Never mention Claude as co-author** in commit messages

### Git Operations

- **Never push without permission**: Only push commits when explicitly asked to do so
- Commits can be made freely, but pushing requires explicit user request

### Code Style

- **Alphabetical ordering**: Keep dictionary keys, constants, imports, and other collections in alphabetical order where possible
- This applies to: object fields, import statements, .gitignore entries, etc.
- Improves maintainability and reduces merge conflicts
- **Markdown formatting**: Always include empty lines after headings in Markdown files
- **File endings**:
  - All Javascript and Typescript source files must end with a newline character
  - Markdown files should end with a newline

## Development Commands

### Setup for Local Development

**Prerequisites:**

- Node.js >= 22
- Go >= 1.21
- Mage build tool: `go install github.com/magefile/mage@latest`
- Docker and Docker Compose

**Quick Start:**

1. `npm install` - Install frontend dependencies
2. `export GROQ_API_KEY="your-api-key-here"` - Set API key environment variable
3. `npm run build:all` - Build backend and frontend once for production
4. `npm run dev:all` - Build backend once and start frontend in watch mode for development
5. `npm run server` - Start Grafana with the plugin loaded (in separate terminal)

### Build Commands

- `npm install` - Install frontend dependencies
- `npm run dev` - Build frontend in development mode with watch
- `npm run build` - Build frontend for production
- `npm run dev:backend` - Build backend for current platform
- `npm run build:backend` - Build backend for all platforms
- `npm run build:all` - Build both frontend and backend
- `npm run clean` - Clean dist directory
- `npm run server` - Run Grafana instance with plugin using Docker

### Development Workflow

1. **First-time setup:**

   ```bash
   npm install
   npm run dev:all  # Builds backend, then starts frontend in watch mode
   ```

2. **Start development server (in separate terminal):**

   ```bash
   export GROQ_API_KEY="your-groq-api-key"
   npm run server
   ```

   Grafana will be available at http://localhost:3000

3. **During development:**

   - Frontend changes: Automatically rebuilt by `npm run dev:all` watch mode
   - Backend changes: Run `npm run dev:backend`
   - Restart Docker container to pick up backend changes

4. **Environment Variables:**
   - Set `GROQ_API_KEY` in your shell before starting Docker
   - The Docker container inherits environment variables from the host

### Testing & Quality

- `npm run test` - Run tests in watch mode (requires git init)
- `npm run test:ci` - Run tests once (CI mode)
- `npm run e2e` - Run end-to-end tests with Playwright (requires running server)
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues and format with Prettier
- `npm run typecheck` - Run TypeScript type checking

### Plugin Distribution

- `npm run sign` - Sign the plugin for distribution

## Architecture

### Plugin Structure

The plugin follows Grafana's panel plugin architecture:

- **Entry Point**: `src/module.ts` - Defines the panel plugin and configuration options
- **Main Component**: `src/components/ChatbotPanel.tsx` - React component that renders the chat interface
- **Plugin Metadata**: `src/plugin.json` - Contains plugin metadata and dependencies

### Key Features

1. **Chat Interface**: Interactive chat UI that captures user questions
2. **Dashboard Data Enrichment**: Extracts data from all panels in the current dashboard
3. **Groq API Integration**: Sends enriched queries to Groq's LLM API
4. **Configuration Options**:
   - `initialChatMessage`: System prompt for the LLM
   - `llmUsed`: Model name (default: llama-3.3-70b-versatile)
   - `GROQ_API_KEY`: Environment variable for Groq API key (backend implementation required)

### Data Flow

1. User enters a question in the chat interface
2. Plugin extracts data from all panels in the dashboard (excluding itself)
3. Data is enriched with panel metadata (title, description, type)
4. Question + enriched data is sent to Groq API
5. Response is displayed in the chat interface

### Important Implementation Details

- The plugin uses `getBackendSrv()` from `@grafana/runtime` to fetch dashboard data
- Chat history is maintained in component state for conversation context
- The plugin requires Grafana >= 10.4.0 and Node.js >= 22
- TypeScript configuration extends Grafana's base configuration
- Webpack is used for bundling with custom configuration in `.config/webpack/`
- Data enrichment logic is in `extractAndEnrichData()` function in ChatbotPanel.tsx
- Panel options are defined in `src/module.ts` with three key configuration fields
- Dashboard data is sanitized before sending to LLM to prevent injection attacks
- Input validation and error handling are implemented throughout

### Security Considerations

- **API Key Security**: Uses `GROQ_API_KEY` environment variable on the server accessed via Go backend component
- **Backend Implementation**: Plugin includes Go backend component that:
  - Provides secure `/groq-chat` resource endpoint
  - Accesses `GROQ_API_KEY` environment variable server-side
  - Handles API calls securely without exposing credentials to frontend
- **Data Sanitization**: All dashboard data is sanitized before sending to external LLM API
- **Input Validation**: User messages are validated and limited in length
- **Error Handling**: Comprehensive error handling prevents information disclosure

### Testing Requirements

- Jest tests require `git init` to be run first for watch mode
- E2E tests with Playwright require the server to be running (`npm run server`)
- Use `npm run test:ci` for one-time test runs in CI environments
- Specific Grafana versions can be tested with `GRAFANA_VERSION=11.3.0 npm run server`
