const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fg = require('fast-glob');

class ToolsService {
  constructor() {
    this.logger = require('../utils/logger').logger;
  }

  // Codebase search - semantic search
  async codebaseSearch(query, targetDirectories = []) {
    try {
      this.logger.info('Performing codebase search', { query, targetDirectories });
      
      // TODO: Implement actual semantic search logic
      // This would typically integrate with a search service like Elasticsearch
      // or use embeddings for semantic similarity
      
      return {
        query,
        results: [],
        total: 0,
        message: 'Codebase search completed'
      };
    } catch (error) {
      this.logger.error('Codebase search failed', { error: error.message });
      throw error;
    }
  }

  // Read file contents
  async readFile(relativeFilePath, shouldReadEntireFile, startLineOneIndexed, endLineOneIndexed) {
    try {
      this.logger.info('Reading file', { relativeFilePath, shouldReadEntireFile, startLineOneIndexed, endLineOneIndexed });
      
      const content = await fs.readFile(relativeFilePath, 'utf8');
      const lines = content.split('\n');
      
      let result = content;
      if (!shouldReadEntireFile && startLineOneIndexed !== null && endLineOneIndexed !== null) {
        result = lines.slice(startLineOneIndexed - 1, endLineOneIndexed).join('\n');
      }
      
      return {
        relativeFilePath,
        content: result,
        totalLines: lines.length,
        startLineOneIndexed,
        endLineOneIndexed,
        shouldReadEntireFile
      };
    } catch (error) {
      this.logger.error('File read failed', { relativeFilePath, error: error.message });
      throw error;
    }
  }

  // Edit file
  async editFile(relativeFilePath, instructions, codeEdit, smartApply = false) {
    try {
      this.logger.info('Editing file', { relativeFilePath, instructions, smartApply });
      
      // TODO: Implement actual file editing logic
      // This would typically validate the edit and apply it safely
      
      return {
        relativeFilePath,
        instructions,
        codeEdit,
        smartApply,
        success: true,
        message: 'File edit completed'
      };
    } catch (error) {
      this.logger.error('File edit failed', { relativeFilePath, error: error.message });
      throw error;
    }
  }

  // Run bash command
  async bash(command, requireUserInteraction, startingServer, projectDirectory = null) {
    try {
      this.logger.info('Running bash command', { command, requireUserInteraction, startingServer, projectDirectory });
      
      // If project directory is specified, change to it before running command
      const originalCwd = process.cwd();
      if (projectDirectory) {
        process.chdir(projectDirectory);
        this.logger.info('Changed to project directory', { projectDirectory });
      }
      
      if (startingServer) {
        // Run in background for server processes
        const child = exec(command);
        
        // Return to original directory
        if (projectDirectory) {
          process.chdir(originalCwd);
        }
        
        return {
          command,
          pid: child.pid,
          running: true,
          requireUserInteraction,
          startingServer,
          projectDirectory,
          message: 'Server command started in background'
        };
      } else {
        // Run synchronously
        const { stdout, stderr } = await execAsync(command);
        
        // Return to original directory
        if (projectDirectory) {
          process.chdir(originalCwd);
        }
        
        return {
          command,
          stdout,
          stderr,
          requireUserInteraction,
          startingServer,
          projectDirectory,
          success: true,
          message: 'Command executed successfully'
        };
      }
    } catch (error) {
      // Return to original directory on error
      if (projectDirectory) {
        process.chdir(originalCwd);
      }
      
      this.logger.error('Bash command failed', { command, error: error.message });
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
  }

  // List directory
  async ls(relativeDirPath = '.') {
    try {
      this.logger.info('Listing directory', { relativeDirPath });
      
      const fullPath = path.resolve(relativeDirPath);
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      
      const contents = items.map(item => ({
        name: item.name,
        type: item.isDirectory() ? 'directory' : 'file',
        path: path.join(relativeDirPath, item.name)
      }));
      
      return {
        path: relativeDirPath,
        contents,
        total: contents.length
      };
    } catch (error) {
      this.logger.error('Directory listing failed', { relativeDirPath, error: error.message });
      throw error;
    }
  }

  // Grep search
  async grep(query, caseSensitive, includePattern, excludePattern) {
    try {
      this.logger.info('Performing grep search', { query, caseSensitive, includePattern, excludePattern });
      
      let command = `grep -r "${query}" .`;
      if (!caseSensitive) {
        command += ' -i';
      }
      if (includePattern) {
        command += ` --include="${includePattern}"`;
      }
      if (excludePattern) {
        command += ` --exclude="${excludePattern}"`;
      }
      
      const { stdout, stderr } = await execAsync(command);
      
      return {
        query,
        caseSensitive,
        includePattern,
        excludePattern,
        results: stdout.split('\n').filter(line => line.trim()),
        total: stdout.split('\n').filter(line => line.trim()).length
      };
    } catch (error) {
      this.logger.error('Grep search failed', { query, error: error.message });
      throw error;
    }
  }

  // File search
  async fileSearch(query) {
    try {
      this.logger.info('Performing file search', { query });
      
      const command = `find . -name "*${query}*" -type f`;
      const { stdout, stderr } = await execAsync(command);
      
      const files = stdout.split('\n').filter(file => file.trim());
      
      return {
        query,
        files,
        total: files.length
      };
    } catch (error) {
      this.logger.error('File search failed', { query, error: error.message });
      throw error;
    }
  }

  // Delete file
  async deleteFile(relativeFilePath) {
    try {
      this.logger.info('Deleting file', { relativeFilePath });
      
      await fs.unlink(relativeFilePath);
      
      return {
        relativeFilePath,
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      this.logger.error('File deletion failed', { relativeFilePath, error: error.message });
      throw error;
    }
  }

  // Web search
  async webSearch(searchTerm, type) {
    try {
      this.logger.info('Performing web search', { searchTerm, type });
      
      // TODO: Implement actual web search
      // This would typically use a search API like Google Custom Search
      // or integrate with a search service
      
      return {
        searchTerm,
        type,
        results: [],
        total: 0,
        message: 'Web search completed'
      };
    } catch (error) {
      this.logger.error('Web search failed', { searchTerm, error: error.message });
      throw error;
    }
  }

  // Web scraping
  async webScrape(url, theme, viewport, includeScreenshot) {
    try {
      this.logger.info('Scraping web page', { url, theme, viewport, includeScreenshot });
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      const content = $('body').text();
      
      return {
        url,
        theme,
        viewport,
        includeScreenshot,
        content: content.trim(),
        title: $('title').text(),
        success: true
      };
    } catch (error) {
      this.logger.error('Web scraping failed', { url, error: error.message });
      throw error;
    }
  }

  // String replace
  async stringReplace(relativeFilePath, oldString, newString, replaceAll) {
    try {
      this.logger.info('Performing string replace', { relativeFilePath, oldString, newString, replaceAll });
      
      const content = await fs.readFile(relativeFilePath, 'utf8');
      const newContent = content.replace(new RegExp(oldString, replaceAll ? 'g' : ''), newString);
      
      await fs.writeFile(relativeFilePath, newContent, 'utf8');
      
      return {
        relativeFilePath,
        oldString,
        newString,
        replaceAll,
        replacements: (content.match(new RegExp(oldString, replaceAll ? 'g' : '')) || []).length,
        success: true,
        message: 'String replace completed'
      };
    } catch (error) {
      this.logger.error('String replace failed', { relativeFilePath, error: error.message });
      throw error;
    }
  }

  // Create file
  async createFile(targetFile, content) {
    try {
      this.logger.info('Creating file', { targetFile });
      
      // Ensure directory exists
      const dir = path.dirname(targetFile);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(targetFile, content, 'utf8');
      
      return {
        targetFile,
        success: true,
        message: 'File created successfully'
      };
    } catch (error) {
      this.logger.error('File creation failed', { targetFile, error: error.message });
      throw error;
    }
  }

  // Startup tool
  async startup(framework, projectName, config = {}) {
    try {
      this.logger.info('Starting up AI agent system', { framework, projectName, config });
      
      // Create project directory
      const workspacePath = `/home/project/${projectName}`;
      await fs.mkdir(workspacePath, { recursive: true });
      
      // Check if project already exists and has package.json
      const existingPackageJsonPath = path.join(workspacePath, 'package.json');
      const projectExists = await fs.access(existingPackageJsonPath).then(() => true).catch(() => false);
      
      if (projectExists) {
        this.logger.info('Project already exists, skipping creation', { projectName, workspacePath });
        return {
          framework,
          projectName,
          workspacePath,
          stdout: 'Project already exists',
          stderr: '',
          status: 'exists',
          message: `${framework} project '${projectName}' already exists`,
          appId: projectName
        };
      }
      
      // Change to project directory
      const originalCwd = process.cwd();
      process.chdir(workspacePath);
      
      // Use Vite CLI directly with templates
      let setupCommand;
      if (framework === 'react') {
        setupCommand = 'bunx create-vite@latest . --template react-ts --yes';
      } else if (framework === 'vue') {
        setupCommand = 'bunx create-vite@latest . --template vue-ts --yes';
      } else if (framework === 'next') {
        setupCommand = 'bunx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes';
      } else {
        setupCommand = 'bunx create-vite@latest . --template react-ts --yes';
      }
      
      this.logger.info('Using Vite CLI with template', { setupCommand });
      
      const result = await execAsync(setupCommand);
      const degitOutput = result.stdout;
      const degitError = result.stderr;
      this.logger.info('Project creation completed', { degitOutput, degitError });
      
      // Check if package.json exists
      const packageJsonPath = path.join(workspacePath, 'package.json');
      const packageJsonExists = await fs.access(packageJsonPath).then(() => true).catch(() => false);
      
      if (!packageJsonExists) {
        throw new Error(`Package.json not found after project creation. Both degit and create-vite failed.`);
      }
      
      // Install dependencies with bun
      const { stdout: installOutput, stderr: installError } = await execAsync('bun install');
      
      this.logger.info('Dependencies installed', { installOutput, installError });
      
      // Update package.json to expose port for iframe
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      
      // Update dev script to expose port
      if (packageJson.scripts && packageJson.scripts.dev) {
        if (framework === 'react' || framework === 'vue') {
          packageJson.scripts.dev = packageJson.scripts.dev.replace('vite', 'vite --host 0.0.0.0');
        } else if (framework === 'next') {
          packageJson.scripts.dev = packageJson.scripts.dev.replace('next dev', 'next dev -H 0.0.0.0');
        }
      }
      
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      
      // Return to original directory
      process.chdir(originalCwd);
      
      return {
        framework,
        projectName,
        workspacePath,
        stdout: degitOutput + installOutput,
        stderr: degitError + installError,
        status: 'started',
        message: `${framework} project '${projectName}' created successfully using Vite CLI`,
        appId: projectName
      };
    } catch (error) {
      this.logger.error('Startup failed', { framework, projectName, error: error.message });
      throw error;
    }
  }

  // Task agent
  async taskAgent(task, parameters = {}) {
    try {
      this.logger.info('Executing task agent', { task, parameters });
      
      // TODO: Implement task execution logic
      // This would typically route to different task handlers
      
      return {
        task,
        parameters,
        result: `Task '${task}' executed successfully`,
        status: 'completed',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Task agent failed', { task, error: error.message });
      throw error;
    }
  }

  // MCP Server
  async mcpServer(action, data = {}) {
    try {
      this.logger.info('Executing MCP server action', { action, data });
      
      // TODO: Implement MCP server operations
      // This would handle Model Context Protocol operations
      
      return {
        action,
        data,
        result: `MCP action '${action}' completed`,
        status: 'success',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('MCP server failed', { action, error: error.message });
      throw error;
    }
  }

  // Glob search
  async glob(pattern, excludePattern) {
    try {
      this.logger.info('Performing glob search', { pattern, excludePattern });
      
      const options = {
        cwd: process.cwd(),
        dot: true,
        ignore: excludePattern ? [excludePattern] : []
      };
      
      const files = await fg(pattern, options);
      
      return {
        pattern,
        excludePattern,
        files,
        total: files.length,
        message: 'Glob search completed'
      };
    } catch (error) {
      this.logger.error('Glob search failed', { pattern, error: error.message });
      throw error;
    }
  }

  // Run linter
  async runLinter(projectDirectory, packageManager) {
    try {
      this.logger.info('Running linter', { projectDirectory, packageManager });
      
      const originalCwd = process.cwd();
      process.chdir(projectDirectory);
      
      let command;
      if (packageManager === 'npm') {
        command = 'npm run lint';
      } else if (packageManager === 'yarn') {
        command = 'yarn lint';
      } else if (packageManager === 'bun') {
        command = 'bun run lint';
      } else {
        command = 'npm run lint';
      }
      
      const { stdout, stderr } = await execAsync(command);
      
      process.chdir(originalCwd);
      
      return {
        projectDirectory,
        packageManager,
        stdout,
        stderr,
        success: true,
        message: 'Linter completed successfully'
      };
    } catch (error) {
      this.logger.error('Linter failed', { projectDirectory, error: error.message });
      throw error;
    }
  }

  // Versioning
  async versioning(projectDirectory, versionTitle, versionChangelog, versionNumber) {
    try {
      this.logger.info('Creating version', { projectDirectory, versionTitle, versionNumber });
      
      const originalCwd = process.cwd();
      process.chdir(projectDirectory);
      
      // Create version directory
      const versionDir = `versions/${versionNumber || Date.now()}`;
      await fs.mkdir(versionDir, { recursive: true });
      
      // Copy current project to version directory, excluding versions and other unnecessary files
      const { stdout: copyOutput } = await execAsync(`tar --exclude='versions' --exclude='node_modules' --exclude='.git' --exclude='dist' --exclude='build' --exclude='.next' --exclude='.cache' -czf - . | tar -C ${versionDir} -xzf -`);
      
      // Create version metadata
      const versionMetadata = {
        version: versionNumber || Date.now(),
        title: versionTitle,
        changelog: versionChangelog,
        timestamp: new Date().toISOString(),
        projectDirectory
      };
      
      await fs.writeFile(`${versionDir}/version.json`, JSON.stringify(versionMetadata, null, 2));
      
      process.chdir(originalCwd);
      
      return {
        projectDirectory,
        versionTitle,
        versionChangelog,
        versionNumber,
        versionDir,
        success: true,
        message: 'Version created successfully'
      };
    } catch (error) {
      this.logger.error('Versioning failed', { projectDirectory, error: error.message });
      throw error;
    }
  }

  // Suggestions
  async suggestions(suggestions) {
    try {
      this.logger.info('Providing suggestions', { suggestionCount: suggestions.length });
      
      return {
        suggestions,
        success: true,
        message: 'Suggestions provided successfully'
      };
    } catch (error) {
      this.logger.error('Suggestions failed', { error: error.message });
      throw error;
    }
  }

  // Deploy
  async deploy(deployAsStaticSite, deployAsDynamicSite) {
    try {
      this.logger.info('Deploying project', { deployAsStaticSite, deployAsDynamicSite });
      
      // Build the project first
      const { stdout: buildOutput } = await execAsync('npm run build');
      
      // Create deployment package
      const deploymentDir = 'deployment';
      await fs.mkdir(deploymentDir, { recursive: true });
      
      if (deployAsStaticSite) {
        // Copy static files
        await execAsync(`cp -r dist/* ${deploymentDir}/`);
        await execAsync(`cp -r public/* ${deploymentDir}/`);
      }
      
      if (deployAsDynamicSite) {
        // Copy server files
        await execAsync(`cp -r src ${deploymentDir}/`);
        await execAsync(`cp package*.json ${deploymentDir}/`);
        await execAsync(`cp .env ${deploymentDir}/`);
      }
      
      // Create deployment manifest
      const deploymentManifest = {
        timestamp: new Date().toISOString(),
        deployAsStaticSite,
        deployAsDynamicSite,
        buildOutput: buildOutput.substring(0, 1000), // Truncate for size
        status: 'ready'
      };
      
      await fs.writeFile(`${deploymentDir}/deployment.json`, JSON.stringify(deploymentManifest, null, 2));
      
      return {
        deployAsStaticSite,
        deployAsDynamicSite,
        deploymentDir,
        success: true,
        message: 'Deployment package created successfully'
      };
    } catch (error) {
      this.logger.error('Deployment failed', { error: error.message });
      throw error;
    }
  }

  // Execute any tool by name
  async executeTool(toolName, parameters) {
    try {
      this.logger.info('Executing tool', { toolName, parameters });
      
      switch (toolName) {
        case 'startup':
          return await this.startup(
            parameters.framework,
            parameters.projectName || parameters.project_name,
            parameters.config || {}
          );
        
        case 'createFile':
          return await this.createFile(
            parameters.targetFile,
            parameters.content
          );
        
        case 'editFile':
          return await this.editFile(
            parameters.targetFile,
            parameters.instructions,
            parameters.content,
            parameters.smartApply
          );
        
        case 'bash':
          return await this.bash(
            parameters.command,
            parameters.requireUserInteraction,
            parameters.startingServer
          );
        
        case 'ls':
          return await this.ls(parameters.relativeDirPath || parameters.relative_dir_path || '.');
        
        case 'readFile':
          return await this.readFile(
            parameters.relativeFilePath || parameters.relative_file_path,
            parameters.shouldReadEntireFile,
            parameters.startLineOneIndexed,
            parameters.endLineOneIndexed
          );
        
        case 'deleteFile':
          return await this.deleteFile(parameters.relativeFilePath || parameters.relative_file_path);
        
        case 'grep':
          return await this.grep(
            parameters.query,
            parameters.caseSensitive,
            parameters.includePattern,
            parameters.excludePattern
          );
        
        case 'fileSearch':
          return await this.fileSearch(parameters.query);
        
        case 'webSearch':
          return await this.webSearch(
            parameters.searchTerm,
            parameters.type
          );
        
        case 'webScrape':
          return await this.webScrape(
            parameters.url,
            parameters.theme,
            parameters.viewport,
            parameters.includeScreenshot
          );
        
        case 'stringReplace':
          return await this.stringReplace(
            parameters.relativeFilePath,
            parameters.oldString,
            parameters.newString,
            parameters.replaceAll
          );
        
        case 'taskAgent':
          return await this.taskAgent(
            parameters.task,
            parameters.parameters || {}
          );
        
        case 'mcpServer':
          return await this.mcpServer(
            parameters.action,
            parameters.data || {}
          );
        
        case 'glob':
          return await this.glob(
            parameters.pattern,
            parameters.excludePattern
          );
        
        case 'runLinter':
          return await this.runLinter(
            parameters.projectDirectory,
            parameters.packageManager
          );
        
        case 'versioning':
          return await this.versioning(
            parameters.projectDirectory,
            parameters.versionTitle,
            parameters.versionChangelog,
            parameters.versionNumber
          );
        
        case 'suggestions':
          return await this.suggestions(parameters.suggestions);
        
        case 'deploy':
          return await this.deploy(
            parameters.deployAsStaticSite,
            parameters.deployAsDynamicSite
          );
        
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      this.logger.error('Tool execution failed', { toolName, error: error.message });
      throw error;
    }
  }
}

module.exports = new ToolsService(); 