# Difrai

AI-powered code review tool that integrates with GitHub webhooks. Difrai acts as a Principal Software Architect and Security Expert to provide deep, actionable feedback on your GitHub commits.

## Features

- **Automated Code Review**: Analyzes git diffs for security vulnerabilities, architectural integrity, maintainability, and scalability.
- **GitHub Integration**: Responds automatically to GitHub push events via webhooks.
- **Multi-Provider AI**: Supports OpenAI and OpenRouter (allowing for models like Claude, GPT, Gemini, Llama, etc.).
- **Multi-Channel Notifications**:
  - **Email**: Send summary reports via SMTP.
  - **Microsoft Teams**: Send notifications to a Teams channel via Incoming Webhooks.
- **Structured Feedback**: Findings are categorized by severity (Critical, Warning, Info) and include specific code suggestions.

## Prerequisites

- Node.js (v20 or higher recommended)
- A GitHub Personal Access Token (PAT)
- An OpenAI or OpenRouter API Key
- (Optional) SMTP credentials for email notifications
- (Optional) MS Teams Webhook URL for Teams notifications

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/difrai.git
cd difrai
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory and fill in the required values. You can use `.env.example` as a template.

```bash
cp .env.example .env
```

Key configuration:
- `GITHUB_TOKEN`: Your GitHub PAT.
- `GITHUB_WEBHOOK_SECRET`: A secret string used to validate payloads from GitHub.
- `OPENAI_API_KEY` or `OPEN_ROUTER_API_KEY`: At least one is required.

### 4. Setup GitHub Webhook

1. Go to your GitHub repository settings.
2. Select **Webhooks** -> **Add webhook**.
3. **Payload URL**: `https://your-server-url/webhooks/github`
4. **Content type**: `application/json`
5. **Secret**: Use the same string as `GITHUB_WEBHOOK_SECRET` in your `.env`.

## Development

Run the project in development mode with hot-reloading:

```bash
npm run dev
```

## Production

Build and start the production server:

```bash
npm run build
npm run start
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `GITHUB_TOKEN` | GitHub Personal Access Token | Required |
| `GITHUB_WEBHOOK_SECRET`| Secret for GitHub webhook validation | Required |
| `OPENAI_API_KEY` | OpenAI API Key | Optional* |
| `OPEN_ROUTER_API_KEY` | OpenRouter API Key | Optional* |
| `AI_MODEL` | AI Model to use (e.g., `gpt-4o`) | `gpt-4o` |
| `EMAIL_ENABLED` | Enable email notifications (`true`/`false`) | `false` |
| `TEAMS_ENABLED` | Enable Teams notifications (`true`/`false`) | `false` |
| `EMAIL_HOST` | SMTP Host | - |
| `EMAIL_PORT` | SMTP Port | - |
| `EMAIL_USER` | SMTP User | - |
| `EMAIL_PASS` | SMTP Password | - |
| `EMAIL_FROM` | "From" email address | - |
| `EMAIL_TO` | Recipient email address | - |
| `TEAMS_WEBHOOK_URL` | MS Teams Incoming Webhook URL | - |

*\*Either `OPENAI_API_KEY` or `OPEN_ROUTER_API_KEY` must be provided.*

## License

This project is open-source and available under the MIT License.
