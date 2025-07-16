const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const aiService = require('../services/ai');
const toolsService = require('../services/tools');

// Single AI chat endpoint that handles everything
router.post('/chat', async (req, res) => {
  try {
    const { message, context = {}, stream = false, appId } = req.body;
    
    // Generate session ID if not provided
    const sessionId = req.body.sessionId || uuidv4();
    
    // Get available tools from tools service
    const availableTools = [
      'startup',
      'editFile', 
      'createFile',
      'bash',
      'readFile',
      'ls',
      'grep',
      'fileSearch',
      'deleteFile',
      'webSearch',
      'webScrape',
      'stringReplace',
      'taskAgent',
      'mcpServer',
      'glob',
      'runLinter',
      'versioning',
      'suggestions',
      'deploy'
    ];
    
    if (stream) {
      // Set up streaming response with JSON lines
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Create app container if appId is provided
      if (appId) {
        const appRuntime = require('../services/appRuntime');
        try {
          await appRuntime.createApp(appId, { description: message });
          res.write(JSON.stringify({ type: 'app_created', appId }) + '\n');
        } catch (error) {
          res.write(JSON.stringify({ type: 'error', message: 'Failed to create app container' }) + '\n');
          return res.end();
        }
      }
      
      // Process the message with the comprehensive system prompt and tools
      const response = await aiService.processUserMessage(message, context, availableTools);
      
      // Stream the AI response
      res.write(JSON.stringify({ type: 'ai_response', content: response.message }) + '\n');
      
      // Extract and execute tool calls from the AI response
      const toolCalls = aiService.extractToolCalls(response.message, availableTools);
      
      if (toolCalls && toolCalls.length > 0) {
        for (const tool of toolCalls) {
          try {
            const toolResult = await toolsService.executeTool(tool.name, tool.parameters);
            res.write(JSON.stringify({ 
              type: 'tool_executed', 
              tool: tool.name, 
              parameters: tool.parameters,
              result: toolResult 
            }) + '\n');
          } catch (error) {
            res.write(JSON.stringify({ 
              type: 'tool_error', 
              tool: tool.name, 
              parameters: tool.parameters,
              error: error.message 
            }) + '\n');
          }
        }
      }
      
      res.end();
    } else {
      // Regular chat completion with tools
      const response = await aiService.processUserMessage(message, context, availableTools);
      
      // Extract tool calls for non-streaming responses
      const toolCalls = aiService.extractToolCalls(response.message, availableTools);
      
      res.json({
        sessionId,
        message: response.message,
        timestamp: response.timestamp,
        tools: toolCalls,
        context: context
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to process AI chat request',
      message: error.message
    });
  }
});

// Tool execution endpoint (for when tools are called separately)
router.post('/execute-tool', async (req, res) => {
  try {
    const { toolName, parameters, sessionId, userMessage } = req.body;
    
    // Execute the tool
    const toolResult = await toolsService.executeTool(toolName, parameters);
    
    // Get AI guidance for the tool execution
    const aiGuidance = await aiService.executeToolWithAI(toolName, parameters, userMessage || '');
    
    const result = {
      toolName,
      parameters,
      toolResult,
      aiGuidance: aiGuidance.aiGuidance,
      sessionId,
      timestamp: new Date().toISOString()
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to execute tool',
      message: error.message
    });
  }
});

router.get('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // TODO: Implement session retrieval logic
    const session = {
      sessionId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      messageCount: 0,
      toolsUsed: []
    };
    
    res.json(session);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve session',
      message: error.message
    });
  }
});

module.exports = router; 