const express = require('express');
const router = express.Router();
const appRuntime = require('../services/appRuntime');
const { logger } = require('../utils/logger');

// Create a new app
router.post('/create', async (req, res) => {
  try {
    const { appId, config = {} } = req.body;
    
    // Generate app ID if not provided
    const finalAppId = appId || appRuntime.generateAppId();
    
    const result = await appRuntime.createApp(finalAppId, config);
    
    logger.info('App created successfully', { appId: finalAppId });
    
    res.status(201).json({
      success: true,
      message: 'App created successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to create app', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create app',
      message: error.message
    });
  }
});

// Get app status
router.get('/:appId/status', async (req, res) => {
  try {
    const { appId } = req.params;
    
    const status = await appRuntime.getAppStatus(appId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Failed to get app status', { appId: req.params.appId, error: error.message });
    res.status(404).json({
      success: false,
      error: 'App not found',
      message: error.message
    });
  }
});

// Stop app
router.post('/:appId/stop', async (req, res) => {
  try {
    const { appId } = req.params;
    
    const result = await appRuntime.stopApp(appId);
    
    logger.info('App stopped successfully', { appId });
    
    res.json({
      success: true,
      message: 'App stopped successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to stop app', { appId: req.params.appId, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to stop app',
      message: error.message
    });
  }
});

// Delete app
router.delete('/:appId', async (req, res) => {
  try {
    const { appId } = req.params;
    
    const result = await appRuntime.deleteApp(appId);
    
    logger.info('App deleted successfully', { appId });
    
    res.json({
      success: true,
      message: 'App deleted successfully',
      data: result
    });
  } catch (error) {
    logger.error('Failed to delete app', { appId: req.params.appId, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to delete app',
      message: error.message
    });
  }
});

// List all apps
router.get('/', async (req, res) => {
  try {
    const result = await appRuntime.listApps();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Failed to list apps', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to list apps',
      message: error.message
    });
  }
});

// Get app logs
router.get('/:appId/logs', async (req, res) => {
  try {
    const { appId } = req.params;
    const { lines = 100 } = req.query;
    
    const logs = await appRuntime.getAppLogs(appId, parseInt(lines));
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Failed to get app logs', { appId: req.params.appId, error: error.message });
    res.status(404).json({
      success: false,
      error: 'Failed to get app logs',
      message: error.message
    });
  }
});

// Update app configuration
router.put('/:appId/config', async (req, res) => {
  try {
    const { appId } = req.params;
    const { config } = req.body;
    
    const result = await appRuntime.updateAppConfig(appId, config);
    
    logger.info('App config updated successfully', { appId });
    
    res.json({
      success: true,
      message: 'App configuration updated',
      data: result
    });
  } catch (error) {
    logger.error('Failed to update app config', { appId: req.params.appId, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update app configuration',
      message: error.message
    });
  }
});

// Preview endpoint - proxy to app container
router.get('/preview/:appId/*', async (req, res) => {
  try {
    const { appId } = req.params;
    const path = req.params[0] || '';
    
    const appStatus = await appRuntime.getAppStatus(appId);
    
    if (appStatus.status !== 'running') {
      return res.status(503).json({
        success: false,
        error: 'App is not running',
        message: `App ${appId} is currently ${appStatus.status}`
      });
    }
    
    // Redirect to the actual app URL
    const targetUrl = `${appStatus.directUrl}/${path}`;
    
    logger.info('Preview request', { appId, targetUrl });
    
    res.redirect(targetUrl);
  } catch (error) {
    logger.error('Preview request failed', { appId: req.params.appId, error: error.message });
    res.status(404).json({
      success: false,
      error: 'App not found',
      message: error.message
    });
  }
});

// Health check for specific app
router.get('/:appId/health', async (req, res) => {
  try {
    const { appId } = req.params;
    
    const appStatus = await appRuntime.getAppStatus(appId);
    
    res.json({
      success: true,
      data: {
        appId,
        status: appStatus.status,
        healthy: appStatus.status === 'running',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('App health check failed', { appId: req.params.appId, error: error.message });
    res.status(404).json({
      success: false,
      error: 'App not found',
      message: error.message
    });
  }
});

module.exports = router; 