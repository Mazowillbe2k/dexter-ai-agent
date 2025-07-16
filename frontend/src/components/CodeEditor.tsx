import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  content?: string;
}

interface CodeEditorProps {
  files: FileNode[];
  onFileChange: (path: string, content: string) => void;
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  onSaveToBackend?: (path: string, content: string) => Promise<void>;
  onLoadFromBackend?: (path: string) => Promise<string>;
}

// Generate unique keys for file tree items
let fileKeyCounter = 0;
const generateFileKey = (path: string) => {
  fileKeyCounter++;
  return `file-${path}-${fileKeyCounter}`;
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  files,
  onFileChange,
  onFileSelect,
  selectedFile,
  onSaveToBackend,
  onLoadFromBackend
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [originalFileContents, setOriginalFileContents] = useState<Map<string, string>>(new Map());
  const [showDiff, setShowDiff] = useState(false);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  // Auto-save to backend when file content changes
  const handleFileContentChange = async (path: string, content: string) => {
    onFileChange(path, content);
    
    // Save to backend if function is provided
    if (onSaveToBackend) {
      setIsSaving(true);
      try {
        await onSaveToBackend(path, content);
      } catch (error) {
        console.error('Failed to save to backend:', error);
      } finally {
        setIsSaving(false);
      }
    }
  };

  // Load file content from backend when file is selected
  useEffect(() => {
    if (selectedFile && onLoadFromBackend) {
      const loadFileContent = async () => {
        try {
          const content = await onLoadFromBackend(selectedFile);
          if (content) {
            // Store original content for diff comparison
            setOriginalFileContents(prev => new Map(prev.set(selectedFile, content)));
            onFileChange(selectedFile, content);
          }
        } catch (error) {
          console.error('Failed to load file from backend:', error);
        }
      };
      
      loadFileContent();
    }
  }, [selectedFile, onLoadFromBackend]);

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    // Separate folders and files
    const folders = nodes.filter(node => node.type === 'directory');
    const files = nodes.filter(node => node.type === 'file');
    
    // Sort folders and files alphabetically
    const sortedFolders = folders.sort((a, b) => a.name.localeCompare(b.name));
    const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name));
    
    // Filter based on search term
    const filterNode = (node: FileNode) => 
      !searchTerm || 
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.path.toLowerCase().includes(searchTerm.toLowerCase());
    
    const filteredFolders = sortedFolders.filter(filterNode);
    const filteredFiles = sortedFiles.filter(filterNode);
    
    return (
      <>
        {/* Render folders first */}
        {filteredFolders.map(node => (
          <div key={generateFileKey(node.path)} style={{ paddingLeft: `${level * 16}px` }}>
            <div className="file-tree-item directory">
              <button
                className="folder-toggle"
                onClick={() => toggleFolder(node.path)}
              >
                {expandedFolders.has(node.path) ? '📂' : '📁'}
                <span className="file-name">{node.name}</span>
              </button>
              {expandedFolders.has(node.path) && node.children && (
                <div className="folder-contents">
                  {renderFileTree(node.children, level + 1)}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Render files after folders */}
        {filteredFiles.map(node => (
          <div key={generateFileKey(node.path)} style={{ paddingLeft: `${level * 16}px` }}>
            <div 
              className={`file-tree-item file ${selectedFile === node.path ? 'selected' : ''} ${isFileModified(node.path) ? 'modified' : ''}`}
              onClick={() => onFileSelect(node.path)}
            >
              <span className="file-icon">
                {isFileModified(node.path) ? '📝' : '📄'}
              </span>
              <span className="file-name">{node.name}</span>
            </div>
          </div>
        ))}
      </>
    );
  };

  const getFileContent = (path: string): string => {
    const findFile = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === path) return node;
        if (node.children) {
          const found = findFile(node.children);
          if (found) return found;
        }
      }
      return null;
    };

    const file = findFile(files);
    return file?.content || '';
  };

  const isFileModified = (path: string): boolean => {
    const originalContent = originalFileContents.get(path);
    const currentContent = getFileContent(path);
    return originalContent !== undefined && originalContent !== currentContent;
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'sql': 'sql',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'sh': 'shell',
      'bash': 'shell',
      'zsh': 'shell',
      'fish': 'shell',
      'ps1': 'powershell',
      'bat': 'batch',
      'cmd': 'batch'
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  return (
    <div className="code-editor">
      <div className="editor-sidebar">
        <div className="file-explorer-header">
          <div className="file-explorer-title">Explorer</div>
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="file-search"
          />
        </div>
        <div className="file-tree">
          {renderFileTree(files)}
        </div>
      </div>
      
      <div className="editor-main">
        {selectedFile ? (
          <div className="editor-main-content">
            <div className="editor-header">
              <div className="file-info">
                <span className="file-name">{selectedFile.split('/').pop()}</span>
                {isFileModified(selectedFile) && (
                  <span className="modified-indicator">● Modified</span>
                )}
              </div>
              <div className="editor-controls">
                {isFileModified(selectedFile) && (
                  <button 
                    className="diff-toggle-btn"
                    onClick={() => setShowDiff(!showDiff)}
                  >
                    {showDiff ? '📄' : '📊'} {showDiff ? 'Hide Diff' : 'Show Diff'}
                  </button>
                )}
              </div>
            </div>
            
            {isSaving && (
              <div className="save-indicator">
                <span className="save-spinner"></span>
                Saving...
              </div>
            )}
            
            {showDiff && isFileModified(selectedFile) ? (
              <div className="diff-view">
                <div className="diff-header">
                  <span>Original</span>
                  <span>Modified</span>
                </div>
                <div className="diff-content">
                  <Editor
                    height="50%"
                    defaultLanguage={getLanguageFromPath(selectedFile)}
                    value={originalFileContents.get(selectedFile) || ''}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: 'JetBrains Mono, Consolas, monospace',
                      lineNumbers: 'on',
                      theme: 'vs-dark',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on'
                    }}
                  />
                  <Editor
                    height="50%"
                    defaultLanguage={getLanguageFromPath(selectedFile)}
                    value={getFileContent(selectedFile)}
                    onChange={(value) => handleFileContentChange(selectedFile, value || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: 'JetBrains Mono, Consolas, monospace',
                      lineNumbers: 'on',
                      roundedSelection: false,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on',
                      theme: 'vs-dark'
                    }}
                  />
                </div>
              </div>
            ) : (
              <Editor
                height="100%"
                defaultLanguage={getLanguageFromPath(selectedFile)}
                value={getFileContent(selectedFile)}
                onChange={(value) => handleFileContentChange(selectedFile, value || '')}
                options={{
                  minimap: { enabled: true },
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, Consolas, monospace',
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  wordWrap: 'on',
                  theme: 'vs-dark'
                }}
              />
            )}
          </div>
        ) : (
          <div className="editor-placeholder">
            <div className="placeholder-icon">📄</div>
            <h3>No file selected</h3>
            <p>Select a file from the explorer to start editing</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor; 