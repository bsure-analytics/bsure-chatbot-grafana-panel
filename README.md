# 🧠 b.sure Chatbot Grafana Panel

A Grafana panel plugin that provides an AI-powered chat interface for analyzing dashboard data.
This plugin enriches user questions with dashboard context and sends them to Groq's LLM API for intelligent responses.

## Features

- Interactive chat interface within Grafana dashboards
- Automatic extraction and enrichment of dashboard data
- Integration with Groq API for AI-powered responses
- Configurable system prompts and LLM models
- Real-time analysis of panel data across your dashboard

## Requirements

- Grafana >= 10.4.0
- Node.js >= 22
- Groq API key

## Configuration

### API Key Configuration

The plugin supports two methods for configuring your Groq API key:

#### Production/Grafana Cloud
Configure the API key through Grafana's plugin settings:
1. Go to **Administration** → **Plugins**
2. Find **b.sure Chatbot** plugin
3. Click **Configuration**
4. In the secure configuration section, set **groqApiKey** to your Groq API token

#### Local Development
Set the environment variable on your Grafana server:
```bash
export GROQ_API_KEY="your-groq-api-key-here"
```

### Panel Configuration

The plugin provides the following configuration options in the panel editor:

- **Initial Chat Message**: System prompt to guide the AI's behavior
- **LLM Model**: Select the Groq model to use (default: llama-3.3-70b-versatile)

### Security Architecture

✅ **Secure Backend Implementation**: This plugin includes a Go backend component that securely handles API keys through Grafana's secure configuration system.
The frontend never accesses API keys directly, ensuring enterprise-grade security.

## Usage

1. **Configure API Key**: Set up your Groq API key using one of the methods above
2. **Add Panel**: Add the Chatbot Panel to your dashboard
3. **Configure Panel**: Set initial message and LLM model in panel settings
4. **Chat**: Type questions about your dashboard data in the chat interface
5. **Get Insights**: The plugin automatically enriches your question with data from all panels and provides AI-powered responses

## Development

### Prerequisites

- **Node.js**: Version 22 or higher
- **Go**: Version 1.21 or higher (for backend component)
- **npm**: Version 10.9 or higher
- **Docker**: Required for running the development server
- **Groq API Key**: Required for LLM functionality

### Quick Start

1. **Clone and install dependencies**

   ```bash
   git clone <repository-url>
   cd bsure-chatbot-grafana-panel
   npm install
   ```

2. **Set up environment variables**

   ```bash
   export GROQ_API_KEY="your-groq-api-key-here"
   ```

3. **Build the plugin (frontend + backend)**

   ```bash
   npm run dev:all
   ```

4. **Start the development server**
   ```bash
   npm run server
   ```
   Grafana will be available at http://localhost:3000

### Development Workflow

**Frontend Development:**

- `npm run dev` - Build frontend in watch mode (auto-rebuilds on changes)
- Edit files in `src/` directory
- Changes are automatically picked up by webpack

**Backend Development:**

- `npm run dev:backend` - Build backend for current platform
- Edit files in `pkg/` directory
- Restart Docker container after backend changes: `docker compose restart`

**Full Development Cycle:**

```bash
# Terminal 1: Build backend and start frontend watch
npm run dev:all

# Terminal 2: Start Grafana server
npm run server

# When making backend changes:
npm run dev:backend && docker compose restart
```

### Build Commands

- `npm run build` - Build frontend in production mode
- `npm run dev` - Build frontend in development mode with watch
- `npm run dev:backend` - Build backend for current platform
- `npm run build:backend` - Build backend for production
- `npm run build:all` - Build both frontend and backend for production
- `npm run dev:all` - Build backend and start frontend in watch mode
- `npm run package` - Build and package plugin for distribution
- `npm run clean` - Clean build artifacts

### Testing

- `npm run test` - Run tests in watch mode (requires `git init` first)
- `npm run test:ci` - Run tests once (CI mode)
- `npm run e2e` - Run E2E tests (requires server running)
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run linter and apply fixes
- `npm run typecheck` - Run TypeScript type checking

### Environment Variables

The plugin requires the following environment variable:

- **GROQ_API_KEY**: Your Groq API key for LLM access

```bash
# Set environment variable (Linux/macOS)
export GROQ_API_KEY="your-api-key-here"

# Windows PowerShell
$env:GROQ_API_KEY="your-api-key-here"
```

### Troubleshooting

**Plugin not loading:**

- Ensure backend is built: `npm run dev:backend`
- Check Docker logs: `docker compose logs`
- Verify API key is set: `echo $GROQ_API_KEY`

**Backend changes not reflecting:**

- Rebuild backend: `npm run dev:backend`
- Restart container: `docker compose restart`

**API errors:**

- Verify GROQ_API_KEY is correctly set and valid
- Check Grafana logs for backend errors

### Testing Different Grafana Versions

```bash
# Use specific Grafana version
GRAFANA_VERSION=11.3.0 npm run server

# Use Grafana Enterprise
GRAFANA_IMAGE=grafana-enterprise npm run server
```

## Plugin Distribution

### Packaging for Submission

To package the plugin for Grafana Cloud submission:

```bash
npm run package
```

This creates:
- `bsure1-chatbot-panel.zip` - Plugin archive with correct structure
- `bsure1-chatbot-panel.zip.md5` - MD5 checksum
- `bsure1-chatbot-panel.zip.sha1` - SHA1 checksum

### Plugin Signing

When distributing a Grafana plugin either within the community or privately the plugin must be signed so the Grafana application can verify its authenticity. This can be done with the `@grafana/sign-plugin` package.

_Note: It's not necessary to sign a plugin during development. The docker development environment that is scaffolded with `@grafana/create-plugin` caters for running the plugin without a signature._

### Initial steps

Before signing a plugin please read the Grafana [plugin publishing and signing criteria](https://grafana.com/legal/plugins/#plugin-publishing-and-signing-criteria) documentation carefully.

`@grafana/create-plugin` has added the necessary commands and workflows to make signing and distributing a plugin via the grafana plugins catalog as straightforward as possible.

Before signing a plugin for the first time please consult the Grafana [plugin signature levels](https://grafana.com/legal/plugins/#what-are-the-different-classifications-of-plugins) documentation to understand the differences between the types of signature level.

1. Create a [Grafana Cloud account](https://grafana.com/signup).
2. Make sure that the first part of the plugin ID matches the slug of your Grafana Cloud account.
   - _You can find the plugin ID in the `plugin.json` file inside your plugin directory. For example, if your account slug is `acmecorp`, you need to prefix the plugin ID with `acmecorp-`._
3. Create a Grafana Cloud API key with the `PluginPublisher` role.
4. Keep a record of this API key as it will be required for signing a plugin

### Signing a plugin

#### Using Github actions release workflow

If the plugin is using the github actions supplied with `@grafana/create-plugin` signing a plugin is included out of the box. The [release workflow](./.github/workflows/release.yml) can prepare everything to make submitting your plugin to Grafana as easy as possible. Before being able to sign the plugin however a secret needs adding to the Github repository.

1. Please navigate to "settings > secrets > actions" within your repo to create secrets.
2. Click "New repository secret"
3. Name the secret "GRAFANA_API_KEY"
4. Paste your Grafana Cloud API key in the Secret field
5. Click "Add secret"

##### Push a version tag

To trigger the workflow we need to push a version tag to github. This can be achieved with the following steps:

1. Run `npm version <major|minor|patch>`
2. Run `git push origin main --follow-tags`

## Learn more

Below you can find source code for existing app plugins and other related documentation.

- [Basic panel plugin example](https://github.com/grafana/grafana-plugin-examples/tree/master/examples/panel-basic#readme)
- [`plugin.json` documentation](https://grafana.com/developers/plugin-tools/reference/plugin-json)
- [How to sign a plugin?](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin)
