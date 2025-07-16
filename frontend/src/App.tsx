import { useState, useRef, useEffect } from 'react'
import './App.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface Project {
  id: string
  name: string
  description: string
  status: 'building' | 'running' | 'failed' | 'stopped'
  url?: string
  createdAt: string
  updatedAt: string
}

function App() {
  const [projects, setProjects] = useState<Project[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'projects'>('chat')
  const [workspaceTab, setWorkspaceTab] = useState<'app' | 'editor' | 'terminal'>('app')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const API_BASE_URL = 'https://dexter-ai-agent-o4wp.onrender.com'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputValue,
          context: {},
          tools: []
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          assistantMessage += chunk

          setMessages(prev => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = assistantMessage
            } else {
              newMessages.push({
                id: Date.now().toString(),
                role: 'assistant',
                content: assistantMessage,
                timestamp: new Date()
              })
            }
            
            return newMessages
          })
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const createProject = async (prompt: string) => {
    setIsCreatingProject(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apps/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            name: `Project ${Date.now()}`,
            description: prompt
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const newProject: Project = {
          id: data.data.appId,
          name: data.data.appId,
          description: prompt,
          status: 'building',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        setProjects(prev => [newProject, ...prev])
        setActiveTab('projects')
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setIsCreatingProject(false)
    }
  }

  const loadProjects = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/apps`)
      if (response.ok) {
        const data = await response.json()
        const projectsData = data.data?.apps?.map((app: any) => ({
          id: app.appId,
          name: app.appId,
          description: 'AI-generated application',
          status: app.status === 'running' ? 'running' : 'stopped',
          url: app.previewUrl,
          createdAt: app.createdAt,
          updatedAt: app.createdAt
        })) || []
        setProjects(projectsData)
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">🤖</div>
            <h1>Dexter</h1>
          </div>
          <nav className="nav">
            <button 
              className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </button>
            <button 
              className={`nav-tab ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              Projects
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {activeTab === 'chat' ? (
          <div className="chat-layout">
            {/* Left Sidebar - Chat */}
            <div className="chat-sidebar">
              <div className="chat-history">
                {messages.length === 0 && (
                  <div className="welcome-message">
                    <div className="welcome-icon">🚀</div>
                    <h2>Build something amazing</h2>
                    <p>Describe what you want to build and I'll create it for you.</p>
                    <div className="example-prompts">
                      <button 
                        className="example-prompt"
                        onClick={() => setInputValue("Create a simple todo app with React")}
                      >
                        Create a simple todo app with React
                      </button>
                      <button 
                        className="example-prompt"
                        onClick={() => setInputValue("Build a weather dashboard with charts")}
                      >
                        Build a weather dashboard with charts
                      </button>
                      <button 
                        className="example-prompt"
                        onClick={() => setInputValue("Make a landing page for a SaaS product")}
                      >
                        Make a landing page for a SaaS product
                      </button>
                    </div>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div key={message.id} className={`message ${message.role}`}>
                    <div className="message-avatar">
                      {message.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="message-content">
                      <div className="message-text">{message.content}</div>
                      <div className="message-time">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="message assistant">
                    <div className="message-avatar">🤖</div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="chat-input-area">
                <div className="input-status">Stopped</div>
                <button className="add-context-btn">@ Add context</button>
                <form onSubmit={handleSubmit} className="input-form">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tell Dexter what you want"
                    className="chat-input"
                    rows={3}
                    disabled={isLoading}
                  />
                  <div className="input-controls">
                    <button type="button" className="agentic-btn">Agentic max</button>
                    <button type="button" className="edit-btn">✋ Edit</button>
                    <button type="button" className="tools-btn">🔧 Tools</button>
                    <button 
                      type="submit" 
                      className="send-btn"
                      disabled={isLoading || !inputValue.trim()}
                    >
                      {isLoading ? (
                        <div className="loading-spinner"></div>
                      ) : (
                        '↑'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Workspace */}
            <div className="workspace">
              {/* Workspace Controls */}
              <div className="workspace-controls">
                <div className="navigation-controls">
                  <button className="nav-btn">←</button>
                  <button className="nav-btn">→</button>
                  <button className="nav-btn">🔄</button>
                </div>
                
                <div className="workspace-tabs">
                  <button 
                    className={`workspace-tab ${workspaceTab === 'app' ? 'active' : ''}`}
                    onClick={() => setWorkspaceTab('app')}
                  >
                    📁 App
                  </button>
                  <button 
                    className={`workspace-tab ${workspaceTab === 'editor' ? 'active' : ''}`}
                    onClick={() => setWorkspaceTab('editor')}
                  >
                    📄 Editor
                  </button>
                  <button 
                    className={`workspace-tab ${workspaceTab === 'terminal' ? 'active' : ''}`}
                    onClick={() => setWorkspaceTab('terminal')}
                  >
                    {'>_'} Terminal
                  </button>
                </div>
                
                <div className="workspace-actions">
                  <input 
                    type="text" 
                    placeholder="/" 
                    className="command-input"
                  />
                  <span className="port-display">3000</span>
                  <button className="action-btn">✋</button>
                  <button className="action-btn">□</button>
                  <button className="action-btn">↗</button>
                </div>
              </div>

              {/* Workspace Content */}
              <div className="workspace-content">
                {workspaceTab === 'app' && (
                  <div className="app-workspace">
                    <div className="app-placeholder">
                      <p>Your app will appear here</p>
                    </div>
                  </div>
                )}
                
                {workspaceTab === 'editor' && (
                  <div className="editor-workspace">
                    <div className="editor-placeholder">
                      <p>Code editor will appear here</p>
                    </div>
                  </div>
                )}
                
                {workspaceTab === 'terminal' && (
                  <div className="terminal-workspace">
                    <div className="terminal-placeholder">
                      <p>Terminal output will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="projects-container">
            <div className="projects-header">
              <h2>Your Projects</h2>
              <button 
                className="create-project-btn"
                onClick={() => setActiveTab('chat')}
              >
                + New Project
              </button>
            </div>
            
            <div className="projects-grid">
              {projects.length === 0 ? (
                <div className="no-projects">
                  <div className="no-projects-icon">📁</div>
                  <h3>No projects yet</h3>
                  <p>Start a conversation to create your first project</p>
                  <button 
                    className="start-building-btn"
                    onClick={() => setActiveTab('chat')}
                  >
                    Start Building
                  </button>
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="project-card">
                    <div className="project-header">
                      <h3>{project.name}</h3>
                      <div className={`project-status ${project.status}`}>
                        {project.status}
                      </div>
                    </div>
                    <p className="project-description">{project.description}</p>
                    <div className="project-actions">
                      {project.url && project.status === 'running' && (
                        <a 
                          href={project.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="view-project-btn"
                        >
                          View Project
                        </a>
                      )}
                      <button className="deploy-btn">
                        Deploy
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
