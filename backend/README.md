# Dexter AI Backend

Backend service for Dexter AI Agent with Groq AI integration and comprehensive tool support.

## Features

- **AI Integration**: Groq AI chat completions with streaming support
- **Tool Execution**: Comprehensive tool set for file operations, web scraping, and more
- **Security**: Helmet, CORS, rate limiting, and input validation
- **Logging**: Winston-based structured logging
- **Health Checks**: Built-in health monitoring
- **Docker Support**: Containerized deployment ready
- **Free Tier Optimized**: Optimized for Render's free tier deployment

## Environment Variables

Create a `.env` file or set these environment variables in Render:

```bash
# Server Configuration
NODE_ENV=production
PORT=3000

# AI Configuration
GROQ_API_KEY=your_groq_api_key_here

# CORS Configuration
CORS_ORIGIN=*

# Logging Configuration
LOG_LEVEL=info

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Health Check Configuration
HEALTH_CHECK_ENABLED=true
```

## Deployment on Render

### Free Tier Deployment

This backend is optimized for Render's free tier deployment:

- **512 MB RAM** - Sufficient for backend operations
- **0.1 CPU** - Good for basic AI and tool operations
- **750 hours/month** - Plenty for a backend service
- **Automatic sleep** - Service sleeps after 15 minutes of inactivity

### Option 1: Using render.yaml (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Connect your repository to Render
3. Render will automatically detect the `render.yaml` file and deploy your service
4. Set the `GROQ_API_KEY` environment variable in Render dashboard

### Option 2: Manual Deployment

1. Create a new Web Service in Render
2. Connect your Git repository
3. Configure the service:
   - **Build Command**: `npm ci --only=production`
   - **Start Command**: `npm start`
   - **Environment**: Docker
4. Set environment variables in the Render dashboard
5. Deploy

### Free Tier Considerations

⚠️ **Important Notes for Free Tier**:
- **Cold Starts**: First request after 15 minutes of inactivity will be slower
- **Sleep Mode**: Service automatically sleeps after 15 minutes of no traffic
- **Resource Limits**: 512MB RAM and 0.1 CPU
- **No Persistent Storage**: File system is ephemeral
- **Wake-up Time**: Service takes ~30 seconds to wake up from sleep

💡 **Tips for Free Tier**:
- Use health checks to keep the service warm
- Implement proper error handling for cold starts
- Monitor memory usage (stay under 512MB)
- Consider upgrading to paid tier for production use

## API Endpoints

### Health Check
- `GET /health` - Service health status

### AI Endpoints
- `POST /api/ai/chat` - Chat completion with Groq AI
- `POST /api/ai/stream` - Streaming chat completion
- `POST /api/ai/tools` - Tool execution with AI guidance

### Tool Endpoints
- `POST /api/tools/execute` - Execute any tool by name
- `GET /api/tools/list` - List available tools

### System Endpoints
- `GET /api/system/status` - System status and info
- `GET /api/system/logs` - Recent application logs

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. The server will be available at `http://localhost:3000`

## Docker Deployment

1. Build the Docker image:
   ```bash
   docker build -t dexter-ai-backend .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 --env-file .env dexter-ai-backend
   ```

## Tool Support

The backend supports the following tools:

- **File Operations**: read_file, edit_file, delete_file, create_file, string_replace
- **Directory Operations**: ls, file_search, glob
- **Search Operations**: grep, codebase_search
- **Web Operations**: web_search, web_scrape
- **System Operations**: bash, startup, task_agent, mcp_server
- **Development Tools**: run_linter, versioning, suggestions, deploy

## Security

- CORS protection with configurable origins
- Rate limiting to prevent abuse
- Input validation and sanitization
- Helmet.js for security headers
- Non-root user in Docker container

## Monitoring

- Health check endpoint at `/health`
- Structured logging with Winston
- Request/response logging with Morgan
- Error tracking and reporting

## Support

For issues or questions, please check the logs in Render dashboard or contact the development team. 