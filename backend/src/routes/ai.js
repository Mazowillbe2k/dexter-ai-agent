const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const aiService = require('../services/ai');
const toolsService = require('../services/tools');

// AI Agent endpoints
router.post('/chat', async (req, res) => {
  try {
    const { message, context, tools, stream = false } = req.body;
    
    // Generate session ID if not provided
    const sessionId = req.body.sessionId || uuidv4();
    
    if (stream) {
      // Set up streaming response
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      const messages = [
        {
          role: 'user',
          content: message
        }
      ];
      
      const chatCompletion = await aiService.createChatCompletion(messages, { stream: true });
      
      for await (const chunk of chatCompletion) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(content);
        }
      }
      
      res.end();
    } else {
      // Regular chat completion
      const response = await aiService.processUserMessage(message, context, tools);
      
      res.json({
        sessionId,
        message: response.message,
        timestamp: response.timestamp,
        tools: tools || [],
        context: context || {}
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to process AI chat request',
      message: error.message
    });
  }
});

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

router.post('/stream', async (req, res) => {
  try {
    const { message, context, tools } = req.body;
    
    // Set up streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const messages = [
      {
        role: 'user',
        content: message
      }
    ];
    
    const chatCompletion = await aiService.createChatCompletion(messages, { stream: true });
    
    for await (const chunk of chatCompletion) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(content);
      }
    }
    
    res.end();
  } catch (error) {
    res.status(500).json({
      error: 'Failed to stream AI response',
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