import React, { useState, useEffect, useCallback } from 'react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  content?: string;
}

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  onRefresh?: () => void;
  currentAppId?: string;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  selectedFile,
  onRefresh,
  currentAppId
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-expand root folders when files are loaded
  useEffect(() => {
    if (files.length > 0) {
      const rootFolders = files.filter(node => node.type === 'directory');
      const newExpanded = new Set(expandedFolders);
      rootFolders.forEach(folder => {
        newExpanded.add(folder.path);
      });
      setExpandedFolders(newExpanded);
    }
  }, [files]);

  const toggleFolder = useCallback((path: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return newExpanded;
    });
  }, []);

  const handleFileClick = useCallback((path: string) => {
    onFileSelect(path);
  }, [onFileSelect]);

  const getFileIcon = (node: FileNode) => {
    if (node.type === 'directory') {
      return expandedFolders.has(node.path) ? '📂' : '📁';
    }
    
    const ext = node.name.split('.').pop()?.toLowerCase();
    const iconMap: { [key: string]: string } = {
      'js': '📄',
      'jsx': '📄',
      'ts': '📄',
      'tsx': '📄',
      'html': '🌐',
      'css': '🎨',
      'json': '📋',
      'md': '📝',
      'py': '🐍',
      'java': '☕',
      'cpp': '⚙️',
      'c': '⚙️',
      'php': '🐘',
      'rb': '💎',
      'go': '🐹',
      'rs': '🦀',
      'sql': '🗄️',
      'xml': '📄',
      'yaml': '📄',
      'yml': '📄',
      'toml': '📄',
      'ini': '⚙️',
      'sh': '💻',
      'bash': '💻',
      'zsh': '💻',
      'fish': '🐟',
      'ps1': '💻',
      'bat': '💻',
      'cmd': '💻'
    };
    return iconMap[ext || ''] || '📄';
  };

  const renderFileTree = useCallback((nodes: FileNode[], level = 0) => {
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
          <div key={`folder-${node.path}`} className="file-tree-item directory">
            <div 
              className="folder-item"
              style={{ paddingLeft: `${level * 16}px` }}
            >
              <button
                className="folder-toggle"
                onClick={(e) => toggleFolder(node.path, e)}
                title={expandedFolders.has(node.path) ? 'Collapse folder' : 'Expand folder'}
              >
                <span className="folder-icon">
                  {expandedFolders.has(node.path) ? '📂' : '📁'}
                </span>
                <span className="folder-name">{node.name}</span>
              </button>
            </div>
            {expandedFolders.has(node.path) && node.children && (
              <div className="folder-contents">
                {renderFileTree(node.children, level + 1)}
              </div>
            )}
          </div>
        ))}
        
        {/* Render files after folders */}
        {filteredFiles.map(node => (
          <div key={`file-${node.path}`} className="file-tree-item file">
            <div 
              className={`file-item ${selectedFile === node.path ? 'selected' : ''}`}
              style={{ paddingLeft: `${level * 16}px` }}
              onClick={() => handleFileClick(node.path)}
              title={node.path}
            >
              <span className="file-icon">
                {getFileIcon(node)}
              </span>
              <span className="file-name">{node.name}</span>
            </div>
          </div>
        ))}
      </>
    );
  }, [expandedFolders, searchTerm, selectedFile, toggleFolder, handleFileClick]);

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      setIsLoading(true);
      onRefresh();
      setTimeout(() => setIsLoading(false), 1000);
    }
  }, [onRefresh]);

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <div className="file-explorer-title">
          Explorer
          {currentAppId && (
            <span className="app-indicator">
              {currentAppId}
            </span>
          )}
        </div>
        <div className="file-explorer-controls">
          <button 
            className="refresh-btn"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh file list"
          >
            {isLoading ? '⏳' : '🔄'}
          </button>
        </div>
        <input
          type="text"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="file-search"
        />
      </div>
      <div className="file-tree">
        {files.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <div className="empty-text">No files found</div>
            <div className="empty-subtext">
              {currentAppId ? 'Select a file to start editing' : 'Create a project to see files'}
            </div>
          </div>
        ) : (
          renderFileTree(files)
        )}
      </div>
    </div>
  );
};

export default FileExplorer; 