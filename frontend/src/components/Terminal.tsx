import React, { useState, useRef, useEffect } from 'react';

interface TerminalOutput {
  id: string;
  type: 'command' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

interface TerminalProps {
  onCommand: (command: string) => Promise<string>;
  initialDirectory?: string;
  output?: string[];
}

// Generate unique IDs
let idCounter = 0;
const generateId = () => {
  idCounter++;
  return `${Date.now()}-${idCounter}`;
};

const Terminal: React.FC<TerminalProps> = ({ 
  onCommand, 
  initialDirectory = '/home/project',
  output = []
}) => {
  const [terminalOutput, setTerminalOutput] = useState<TerminalOutput[]>([]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDirectory, setCurrentDirectory] = useState(initialDirectory);
  const [isProcessing, setIsProcessing] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update terminal output when external output changes
  useEffect(() => {
    if (output.length > 0) {
      const lastOutput = output[output.length - 1];
      addOutput('output', lastOutput);
    }
  }, [output]);

  const addOutput = (type: 'command' | 'output' | 'error', content: string) => {
    const newOutput: TerminalOutput = {
      id: generateId(),
      type,
      content,
      timestamp: new Date()
    };
    setTerminalOutput(prev => [...prev, newOutput]);
  };

  const scrollToBottom = () => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [terminalOutput]);

  useEffect(() => {
    // Add initial welcome message
    if (terminalOutput.length === 0) {
      addOutput('output', `Welcome to Dexter Terminal\nType 'help' for available commands.\n\n`);
    }
  }, []);

  const handleCommand = async (command: string) => {
    if (!command.trim()) return;

    // Add command to history
    setCommandHistory(prev => [command, ...prev.slice(0, 49)]); // Keep last 50 commands
    setHistoryIndex(-1);

    // Display command
    addOutput('command', `$ ${command}`);

    setIsProcessing(true);
    try {
      const result = await onCommand(command);
      addOutput('output', result);
    } catch (error) {
      addOutput('error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }

    setCurrentCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCommand(currentCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Auto-completion could be implemented here
    }
  };

  const getPrompt = () => {
    const user = 'dexter';
    const host = 'dexter-new';
    const dir = currentDirectory.split('/').pop() || '~';
    return `${user}@${host}:${dir}$ `;
  };

  const clearTerminal = () => {
    setTerminalOutput([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="terminal">
      <div className="terminal-header">
        <div className="terminal-title">Terminal</div>
        <div className="terminal-controls">
          <button 
            className="terminal-btn"
            onClick={clearTerminal}
            title="Clear terminal"
          >
            🗑️
          </button>
          <button 
            className="terminal-btn"
            onClick={() => copyToClipboard(terminalOutput.map(o => o.content).join('\n'))}
            title="Copy all output"
          >
            📋
          </button>
        </div>
      </div>
      
      <div className="terminal-output" ref={terminalRef}>
        {terminalOutput.map((line) => (
          <div key={line.id} className={`terminal-line ${line.type}`}>
            {line.type === 'command' ? (
              <div className="command-line">
                <span className="prompt">{getPrompt()}</span>
                <span className="command-text">{line.content.substring(getPrompt().length)}</span>
              </div>
            ) : (
              <div className={`output-line ${line.type}`}>
                {line.content}
              </div>
            )}
          </div>
        ))}
        
        {isProcessing && (
          <div className="terminal-line output">
            <div className="processing-indicator">
              <span className="spinner"></span>
              Processing command...
            </div>
          </div>
        )}
        
        <div className="terminal-input-line">
          <span className="prompt">{getPrompt()}</span>
          <input
            ref={inputRef}
            type="text"
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            className="terminal-input"
            placeholder="Enter command..."
            disabled={isProcessing}
            autoFocus
          />
        </div>
      </div>
    </div>
  );
};

export default Terminal; 