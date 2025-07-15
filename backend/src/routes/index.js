const express = require('express');
const router = express.Router();

// Import route modules
const aiRoutes = require('./ai');
const toolsRoutes = require('./tools');
const systemRoutes = require('./system');

// Mount routes
router.use('/ai', aiRoutes);
router.use('/tools', toolsRoutes);
router.use('/system', systemRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Dexter AI Backend API',
    version: '1.0.0',
    description: 'Backend service for Dexter AI Agent',
    endpoints: {
      ai: '/api/v1/ai',
      tools: '/api/v1/tools',
      system: '/api/v1/system'
    }
  });
});

module.exports = router; 