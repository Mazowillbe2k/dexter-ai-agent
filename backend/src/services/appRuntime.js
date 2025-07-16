const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Docker = require('dockerode');

const execAsync = promisify(exec);

class AppRuntimeService {
  constructor() {
    this.logger = require('../utils/logger').logger;
    this.docker = new Docker();
    this.apps = new Map(); // Store app metadata
    this.portManager = new PortManager();
    this.workspacePath = process.env.WORKSPACE_PATH || '/workspace';
  }

  // Generate unique app ID
  generateAppId() {
    return `app-${uuidv4().replace(/-/g, '').substring(0, 8)}`;
  }

  // Create a new app container
  async createApp(appId, appConfig = {}) {
    try {
      this.logger.info('Creating app container', { appId, appConfig });

      const appPath = path.join(this.workspacePath, appId);
      const port = await this.portManager.getAvailablePort();
      
      // Create app directory (AI will populate it via startup tool)
      await fs.mkdir(appPath, { recursive: true });

      // Create app metadata
      const appMetadata = {
        id: appId,
        path: appPath,
        port: port,
        status: 'creating',
        createdAt: new Date().toISOString(),
        config: appConfig,
        containerId: null
      };

      // Create Docker container
      const container = await this.docker.createContainer({
        Image: 'node:20-alpine',
        name: `app-${appId}`,
        WorkingDir: '/app',
        ExposedPorts: {
          [`${port}/tcp`]: {}
        },
        HostConfig: {
          PortBindings: {
            [`${port}/tcp`]: [{ HostPort: port.toString() }]
          },
          Binds: [
            `${appPath}:/app`
          ],
          Memory: 512 * 1024 * 1024, // 512MB
          MemorySwap: 1024 * 1024 * 1024, // 1GB
          CpuShares: 512
        },
        Env: [
          'NODE_ENV=development',
          `PORT=${port}`,
          'CHOKIDAR_USEPOLLING=true'
        ],
        Cmd: ['sh', '-c', 'npm install && npm start']
      });

      appMetadata.containerId = container.id;
      appMetadata.status = 'created';
      this.apps.set(appId, appMetadata);

      // Start the container
      await container.start();

      this.logger.info('App container created and started', { appId, port, containerId: container.id });

      const baseUrl = process.env.BASE_URL || 'https://dexter-ai-agent-o4wp.onrender.com';
      
      return {
        appId,
        port,
        status: 'running',
        previewUrl: `${baseUrl}/api/v1/apps/preview/${appId}`,
        directUrl: `http://localhost:${port}`
      };

    } catch (error) {
      this.logger.error('Failed to create app container', { appId, error: error.message });
      throw error;
    }
  }

  // Get app status
  async getAppStatus(appId) {
    try {
      const app = this.apps.get(appId);
      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      if (app.containerId) {
        const container = this.docker.getContainer(app.containerId);
        const containerInfo = await container.inspect();
        
        const baseUrl = process.env.BASE_URL || 'https://dexter-ai-agent-o4wp.onrender.com';
        
        return {
          appId,
          status: containerInfo.State.Status,
          port: app.port,
          previewUrl: `${baseUrl}/api/v1/apps/preview/${appId}`,
          directUrl: `http://localhost:${app.port}`,
          createdAt: app.createdAt,
          config: app.config
        };
      }

      return app;
    } catch (error) {
      this.logger.error('Failed to get app status', { appId, error: error.message });
      throw error;
    }
  }

  // Stop app container
  async stopApp(appId) {
    try {
      const app = this.apps.get(appId);
      if (!app || !app.containerId) {
        throw new Error(`App ${appId} not found or not running`);
      }

      const container = this.docker.getContainer(app.containerId);
      await container.stop();
      
      app.status = 'stopped';
      this.apps.set(appId, app);

      this.logger.info('App container stopped', { appId });

      return {
        appId,
        status: 'stopped',
        message: 'App stopped successfully'
      };
    } catch (error) {
      this.logger.error('Failed to stop app', { appId, error: error.message });
      throw error;
    }
  }

  // Delete app container and files
  async deleteApp(appId) {
    try {
      const app = this.apps.get(appId);
      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      // Stop and remove container if running
      if (app.containerId) {
        const container = this.docker.getContainer(app.containerId);
        try {
          await container.stop();
        } catch (e) {
          // Container might already be stopped
        }
        await container.remove();
      }

      // Remove app directory
      await fs.rm(app.path, { recursive: true, force: true });

      // Release port
      await this.portManager.releasePort(app.port);

      // Remove from apps map
      this.apps.delete(appId);

      this.logger.info('App deleted', { appId });

      return {
        appId,
        status: 'deleted',
        message: 'App deleted successfully'
      };
    } catch (error) {
      this.logger.error('Failed to delete app', { appId, error: error.message });
      throw error;
    }
  }

  // List all apps
  async listApps() {
    try {
      const appsList = [];
      
      for (const [appId, app] of this.apps) {
        const status = await this.getAppStatus(appId);
        appsList.push(status);
      }

      return {
        apps: appsList,
        total: appsList.length
      };
    } catch (error) {
      this.logger.error('Failed to list apps', { error: error.message });
      throw error;
    }
  }

  // Get app logs
  async getAppLogs(appId, lines = 100) {
    try {
      const app = this.apps.get(appId);
      if (!app || !app.containerId) {
        throw new Error(`App ${appId} not found or not running`);
      }

      const container = this.docker.getContainer(app.containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: lines
      });

      return {
        appId,
        logs: logs.toString('utf8'),
        lines
      };
    } catch (error) {
      this.logger.error('Failed to get app logs', { appId, error: error.message });
      throw error;
    }
  }

  // Update app configuration
  async updateAppConfig(appId, config) {
    try {
      const app = this.apps.get(appId);
      if (!app) {
        throw new Error(`App ${appId} not found`);
      }

      app.config = { ...app.config, ...config };
      this.apps.set(appId, app);

      this.logger.info('App config updated', { appId, config });

      return {
        appId,
        config: app.config,
        message: 'App configuration updated'
      };
    } catch (error) {
      this.logger.error('Failed to update app config', { appId, error: error.message });
      throw error;
    }
  }
}

// Port manager for handling port allocation
class PortManager {
  constructor() {
    this.usedPorts = new Set();
    this.basePort = 3001; // Start from 3001 since 3000 is used by main backend
    this.maxPort = 3999;
  }

  async getAvailablePort() {
    for (let port = this.basePort; port <= this.maxPort; port++) {
      if (!this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports');
  }

  async releasePort(port) {
    this.usedPorts.delete(port);
  }

  isPortUsed(port) {
    return this.usedPorts.has(port);
  }
}

module.exports = new AppRuntimeService(); 