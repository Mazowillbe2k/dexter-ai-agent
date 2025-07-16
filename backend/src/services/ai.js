const { Groq } = require('groq-sdk');
const { logger } = require('../utils/logger');

class AIService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    this.logger = logger;
  }

  async createChatCompletion(messages, options = {}) {
    try {
      this.logger.info('Creating chat completion with Groq', { 
        messageCount: messages.length,
        model: options.model || 'qwen/qwen3-32b'
      });

      const chatCompletion = await this.groq.chat.completions.create({
        messages: messages,
        model: options.model || 'qwen/qwen3-32b',
        temperature: options.temperature || 0.6,
        max_completion_tokens: options.max_completion_tokens || 40960,
        top_p: options.top_p || 0.95,
        stream: options.stream || false,
        reasoning_effort: options.reasoning_effort || 'default',
        stop: options.stop || null
      });

      if (options.stream) {
        return chatCompletion;
      } else {
        return chatCompletion.choices[0]?.message?.content || '';
      }
    } catch (error) {
      this.logger.error('Groq chat completion failed', { error: error.message });
      throw error;
    }
  }

  async streamChatCompletion(messages, options = {}) {
    try {
      this.logger.info('Starting stream chat completion', { 
        messageCount: messages.length 
      });

      const streamOptions = {
        ...options,
        stream: true
      };

      const chatCompletion = await this.createChatCompletion(messages, streamOptions);
      
      let fullContent = '';
      for await (const chunk of chatCompletion) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;
        process.stdout.write(content);
      }

      return fullContent;
    } catch (error) {
      this.logger.error('Stream chat completion failed', { error: error.message });
      throw error;
    }
  }

  async processUserMessage(message, context = {}, tools = []) {
    try {
      this.logger.info('Processing user message', { 
        messageLength: message.length,
        hasContext: Object.keys(context).length > 0,
        toolCount: tools.length
      });

      // Build system message with context and tools
      let systemMessage = `You are an AI coding assistant in Dexter, a cloud-based IDE. You have access to file editing tools and can create web applications.

**CRITICAL RULES:**
- NEVER show code blocks in chat messages. ALWAYS use editFile() and createFile() tools to make actual file changes
- ALWAYS use the provided appId for project names and directories. Use /app/{appId} as the project directory
- When you receive tool errors, immediately analyze and fix them using appropriate tools
- Use bun over npm for package management
- Start dev servers early to work with runtime errors

**ERROR HANDLING:**
- ENOENT: Create missing directories with bash("mkdir -p path", false, false, "/app/appId")
- Permission denied: Use bash("chmod 755 path", false, false, "/app/appId") 
- Package not found: Use bash("bun add package-name", false, false, "/app/appId")
- Port in use: Use bash("pkill -f process-name", false, false, "/app/appId")

**FILE EXPLORATION:**
- Focus on source code directories (src/, components/, etc.)
- Avoid exploring node_modules or dependency directories
- Use ls(".") for project overview, then explore relevant directories

You are pair programming with a USER. Keep going until the query is completely resolved. Only terminate when the problem is solved.`;

      if (tools.length > 0) {
        systemMessage += '\n\nAvailable tools:\n' + tools.map(tool => 
          `- ${tool}: Use ${tool}() to execute this tool`
        ).join('\n');
      }

      if (Object.keys(context).length > 0) {
        systemMessage += '\n\nContext:\n' + JSON.stringify(context, null, 2);
      }

      const messages = [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: message
        }
      ];

      const response = await this.createChatCompletion(messages);
      
      return {
        message: response,
        timestamp: new Date().toISOString(),
        context: context,
        tools: tools
      };
    } catch (error) {
      this.logger.error('User message processing failed', { error: error.message });
      throw error;
    }
  }

  async executeToolWithAI(toolName, parameters, userMessage) {
    try {
      this.logger.info('Executing tool with AI assistance', { 
        toolName, 
        parameters: Object.keys(parameters) 
      });

      const systemMessage = `You are an AI assistant that helps execute tools. 
      The user wants to execute the tool: ${toolName}
      Parameters: ${JSON.stringify(parameters, null, 2)}
      
      Provide guidance on how to execute this tool effectively.`;

      const messages = [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: userMessage
        }
      ];

      const response = await this.createChatCompletion(messages);
      
      return {
        toolName,
        parameters,
        aiGuidance: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Tool execution with AI failed', { toolName, error: error.message });
      throw error;
    }
  }

  extractToolCalls(response, availableTools) {
    const tools = [];
    
    // Enhanced tool extraction that looks for tool usage patterns in the AI response
    // This is a more sophisticated parser that can handle various tool call formats
    
    // Look for startup tool calls
    if (response.includes('startup(') && availableTools.includes('startup')) {
      const startupMatches = response.matchAll(/startup\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/g);
      for (const match of startupMatches) {
        tools.push({
          name: 'startup',
          parameters: { 
            framework: match[1],
            projectName: match[2]
          }
        });
      }
    }
    
    // Look for editFile tool calls
    if (response.includes('editFile(') && availableTools.includes('editFile')) {
      const editFileMatches = response.matchAll(/editFile\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/g);
      for (const match of editFileMatches) {
        tools.push({
          name: 'editFile',
          parameters: {
            targetFile: match[1],
            instructions: match[2],
            content: match[3]
          }
        });
      }
    }
    
    // Look for createFile tool calls
    if (response.includes('createFile(') && availableTools.includes('createFile')) {
      const createFileMatches = response.matchAll(/createFile\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/g);
      for (const match of createFileMatches) {
        tools.push({
          name: 'createFile',
          parameters: {
            targetFile: match[1],
            content: match[2]
          }
        });
      }
    }
    
    // Look for bash tool calls
    if (response.includes('bash(') && availableTools.includes('bash')) {
      const bashMatches = response.matchAll(/bash\(['"]([^'"]+)['"]\)/g);
      for (const match of bashMatches) {
        tools.push({
          name: 'bash',
          parameters: {
            command: match[1]
          }
        });
      }
    }
    
    // Look for readFile tool calls
    if (response.includes('readFile(') && availableTools.includes('readFile')) {
      const readFileMatches = response.matchAll(/readFile\(['"]([^'"]+)['"]\)/g);
      for (const match of readFileMatches) {
        tools.push({
          name: 'readFile',
          parameters: {
            relativeFilePath: match[1]
          }
        });
      }
    }
    
    // Look for ls tool calls
    if (response.includes('ls(') && availableTools.includes('ls')) {
      const lsMatch = response.match(/ls\(['"]([^'"]+)['"]\)/);
      if (lsMatch) {
        tools.push({
          name: 'ls',
          parameters: {
            relativeDirPath: lsMatch[1]
          }
        });
      }
    }
    
    // Look for grep tool calls
    if (response.includes('grep(') && availableTools.includes('grep')) {
      const grepMatches = response.matchAll(/grep\(['"]([^'"]+)['"]\)/g);
      for (const match of grepMatches) {
        tools.push({
          name: 'grep',
          parameters: {
            query: match[1]
          }
        });
      }
    }
    
    // Look for deleteFile tool calls
    if (response.includes('deleteFile(') && availableTools.includes('deleteFile')) {
      const deleteFileMatches = response.matchAll(/deleteFile\(['"]([^'"]+)['"]\)/g);
      for (const match of deleteFileMatches) {
        tools.push({
          name: 'deleteFile',
          parameters: {
            relativeFilePath: match[1]
          }
        });
      }
    }
    
    // Look for webSearch tool calls
    if (response.includes('webSearch(') && availableTools.includes('webSearch')) {
      const webSearchMatches = response.matchAll(/webSearch\(['"]([^'"]+)['"]\)/g);
      for (const match of webSearchMatches) {
        tools.push({
          name: 'webSearch',
          parameters: {
            searchTerm: match[1]
          }
        });
      }
    }
    
    // Look for webScrape tool calls
    if (response.includes('webScrape(') && availableTools.includes('webScrape')) {
      const webScrapeMatches = response.matchAll(/webScrape\(['"]([^'"]+)['"]\)/g);
      for (const match of webScrapeMatches) {
        tools.push({
          name: 'webScrape',
          parameters: {
            url: match[1]
          }
        });
      }
    }
    
    // Look for taskAgent tool calls
    if (response.includes('taskAgent(') && availableTools.includes('taskAgent')) {
      const taskAgentMatches = response.matchAll(/taskAgent\(['"]([^'"]+)['"]\)/g);
      for (const match of taskAgentMatches) {
        tools.push({
          name: 'taskAgent',
          parameters: {
            task: match[1]
          }
        });
      }
    }
    
    // Look for runLinter tool calls
    if (response.includes('runLinter(') && availableTools.includes('runLinter')) {
      const runLinterMatches = response.matchAll(/runLinter\(['"]([^'"]+)['"]\)/g);
      for (const match of runLinterMatches) {
        tools.push({
          name: 'runLinter',
          parameters: {
            projectDirectory: match[1]
          }
        });
      }
    }
    
    // Look for versioning tool calls
    if (response.includes('versioning(') && availableTools.includes('versioning')) {
      const versioningMatches = response.matchAll(/versioning\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/g);
      for (const match of versioningMatches) {
        tools.push({
          name: 'versioning',
          parameters: {
            projectDirectory: match[1],
            versionTitle: match[2]
          }
        });
      }
    }
    
    // Look for deploy tool calls
    if (response.includes('deploy(') && availableTools.includes('deploy')) {
      const deployMatch = response.match(/deploy\(([^)]+)\)/);
      if (deployMatch) {
        tools.push({
          name: 'deploy',
          parameters: {
            deployAsStaticSite: true,
            deployAsDynamicSite: false
          }
        });
      }
    }
    
    return tools;
  }
}

module.exports = new AIService(); 