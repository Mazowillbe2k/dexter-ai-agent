const express = require('express');
const router = express.Router();
const toolsService = require('../services/tools');

// Get available tools
router.get('/', (req, res) => {
  try {
    const tools = [
      {
        name: 'startup',
        description: 'Shortcut to create a new web project from a framework template.',
        parameters: {
          framework: { type: 'string', description: 'The framework to use for the project.' },
          project_name: { type: 'string', description: 'The name of the project.' },
          shadcn_theme: { type: 'string', description: 'The shadcn theme to use for the project.' }
        }
      },
      {
        name: 'task_agent',
        description: 'Launches a highly capable task agent in the USER\'s workspace.',
        parameters: {
          integrations: { type: 'array', description: 'External services the agent should interact with.' },
          prompt: { type: 'string', description: 'The task for the agent to perform.' },
          relative_file_paths: { type: 'array', description: 'Relative paths to files that are relevant to the task.' }
        }
      },
      {
        name: 'bash',
        description: 'Run a terminal command. Each command runs in a new shell.',
        parameters: {
          command: { type: 'string', description: 'The terminal command to execute.' },
          require_user_interaction: { type: 'string', description: 'Notice to the user if interaction is required.' },
          starting_server: { type: 'boolean', description: 'Whether the command starts a server process.' }
        }
      },
      {
        name: 'ls',
        description: 'List the contents of a directory.',
        parameters: {
          relative_dir_path: { type: 'string', description: 'The relative path to the directory to list contents of.' }
        }
      },
      {
        name: 'glob',
        description: 'Search for files using glob patterns.',
        parameters: {
          pattern: { type: 'string', description: 'Glob pattern to match files against.' },
          exclude_pattern: { type: 'string', description: 'Optional glob pattern to exclude files.' }
        }
      },
      {
        name: 'grep',
        description: 'Fast text-based regex search that finds exact pattern matches.',
        parameters: {
          query: { type: 'string', description: 'The regex pattern to search for.' },
          case_sensitive: { type: 'boolean', description: 'Whether the search should be case sensitive.' },
          include_pattern: { type: 'string', description: 'Glob pattern for files to include.' },
          exclude_pattern: { type: 'string', description: 'Glob pattern for files to exclude.' }
        }
      },
      {
        name: 'read_file',
        description: 'Read the contents of a file.',
        parameters: {
          relative_file_path: { type: 'string', description: 'The relative path to the file to read.' },
          should_read_entire_file: { type: 'boolean', description: 'Whether to read the entire file.' },
          start_line_one_indexed: { type: 'number', description: 'The one-indexed line number to start reading from (inclusive).' },
          end_line_one_indexed: { type: 'number', description: 'The one-indexed line number to end reading at (inclusive).' }
        }
      },
      {
        name: 'delete_file',
        description: 'Deletes a file at the specified path.',
        parameters: {
          relative_file_path: { type: 'string', description: 'The relative path to the file to delete.' }
        }
      },
      {
        name: 'edit_file',
        description: 'Use this tool to make large edits or refactorings to an existing file or create a new file.',
        parameters: {
          relative_file_path: { type: 'string', description: 'The relative path to the file to modify.' },
          instructions: { type: 'string', description: 'A single sentence instruction describing what you are going to do.' },
          code_edit: { type: 'string', description: 'Specify ONLY the precise lines of code that you wish to edit.' },
          smart_apply: { type: 'boolean', description: 'Use a smarter model to apply the code_edit.' }
        }
      },
      {
        name: 'string_replace',
        description: 'Performs exact string replacements in files.',
        parameters: {
          relative_file_path: { type: 'string', description: 'The relative path to the file to modify.' },
          old_string: { type: 'string', description: 'The text to replace.' },
          new_string: { type: 'string', description: 'The new text to replace the old_string.' },
          replace_all: { type: 'boolean', description: 'Replace all occurences of old_string.' }
        }
      },
      {
        name: 'run_linter',
        description: 'Run the linter for the project.',
        parameters: {
          project_directory: { type: 'string', description: 'The directory of the project to run linting on.' },
          package_manager: { type: 'string', description: 'The package manager used to install the dependencies.' }
        }
      },
      {
        name: 'versioning',
        description: 'Create a new version for a project.',
        parameters: {
          project_directory: { type: 'string', description: 'The relative path to the project directory to version.' },
          version_title: { type: 'string', description: 'The title of the version.' },
          version_changelog: { type: 'array', description: 'The version changelog.' },
          version_number: { type: 'string', description: 'A whole number. Write an empty string to automatically increment.' }
        }
      },
      {
        name: 'suggestions',
        description: 'Suggest 1-5 next steps to implement with the USER.',
        parameters: {
          suggestions: { type: 'array', description: 'List of 1-5 suggested next steps.' }
        }
      },
      {
        name: 'deploy',
        description: 'Deploys the project to Netlify.',
        parameters: {
          deploy_as_static_site: { type: 'object', description: 'To deploy a static site.' },
          deploy_as_dynamic_site: { type: 'boolean', description: 'Set to true to deploy as a dynamic site.' }
        }
      },
      {
        name: 'web_search',
        description: 'Search the web for real-time text and image responses.',
        parameters: {
          search_term: { type: 'string', description: 'The search term to look up on the web.' },
          type: { type: 'string', description: 'The type of search to perform (text or images).' }
        }
      },
      {
        name: 'web_scrape',
        description: 'Scrape a website to see its design and content.',
        parameters: {
          url: { type: 'string', description: 'The URL of the website to scrape.' },
          theme: { type: 'string', description: 'To scrape the website in light or dark mode.' },
          viewport: { type: 'string', description: 'The viewport to scrape the website in.' },
          include_screenshot: { type: 'boolean', description: 'Whether to see a screenshot of the website.' }
        }
      }
    ];
    res.json({
      tools,
      count: tools.length,
      description: 'Available AI tools for code manipulation and search'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve tools',
      message: error.message
    });
  }
});

// Execute a specific tool
router.post('/execute', async (req, res) => {
  try {
    const { toolName, parameters } = req.body;
    const result = await toolsService.executeTool(toolName, parameters);
    res.json({
      toolName,
      parameters,
      result,
      timestamp: new Date().toISOString(),
      success: true
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to execute tool',
      message: error.message
    });
  }
});

// Get tool documentation
router.get('/:toolName', (req, res) => {
  try {
    const { toolName } = req.params;
    // TODO: Implement tool documentation retrieval
    const toolDoc = {
      name: toolName,
      description: `Documentation for ${toolName}`,
      parameters: {},
      examples: [],
      usage: `How to use ${toolName}`
    };
    res.json(toolDoc);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve tool documentation',
      message: error.message
    });
  }
});

module.exports = router; 