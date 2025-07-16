import React, { useState, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import FileExplorer from './FileExplorer';

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
  onRefreshFiles?: () => void;
  currentAppId?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  files,
  onFileChange,
  onFileSelect,
  selectedFile,
  onSaveToBackend,
  onLoadFromBackend,
  onRefreshFiles,
  currentAppId
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [originalFileContents, setOriginalFileContents] = useState<Map<string, string>>(new Map());
  const [showDiff, setShowDiff] = useState(false);

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
        <FileExplorer
          files={files}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
          onRefresh={onRefreshFiles}
          currentAppId={currentAppId}
        />
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
                    height="calc(50% - 15px)"
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
                    height="calc(50% - 15px)"
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
                height="calc(100% - 40px)"
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