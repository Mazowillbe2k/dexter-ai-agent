import React, { useState, useEffect, useRef } from 'react';

interface AppPreviewProps {
  appId?: string;
  className?: string;
}

const AppPreview: React.FC<AppPreviewProps> = ({ appId, className = '' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const API_BASE_URL = 'https://dexter-ai-agent-o4wp.onrender.com';

  useEffect(() => {
    if (!appId) {
      setError('No app selected');
      setIsLoading(false);
      return;
    }

    const getAppStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${API_BASE_URL}/api/v1/apps/${appId}/status`);
        
        if (!response.ok) {
          throw new Error('Failed to get app status');
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          const appData = data.data;
          
          if (appData.status === 'running') {
            // Use the preview URL from the API response
            setPreviewUrl(appData.previewUrl);
            setIsLoading(false);
          } else {
            setError(`App is ${appData.status}. Please wait for it to start running.`);
            setIsLoading(false);
          }
        } else {
          setError('Failed to load app status');
          setIsLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load app');
        setIsLoading(false);
      }
    };

    getAppStatus();

    // Poll for app status every 5 seconds if app is not running
    const pollInterval = setInterval(async () => {
      if (appId && !previewUrl) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/apps/${appId}/status`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data && data.data.status === 'running') {
              setPreviewUrl(data.data.previewUrl);
              setError(null);
              setIsLoading(false);
            }
          }
        } catch (err) {
          // Silently fail during polling
        }
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [appId, previewUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setError('Failed to load app preview');
    setIsLoading(false);
  };

  const refreshPreview = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setError(null);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  if (!appId) {
    return (
      <div className={`app-preview ${className}`}>
        <div className="preview-placeholder">
          <div className="placeholder-icon">🌐</div>
          <h3>No App Selected</h3>
          <p>Create a project to see the preview here</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`app-preview ${className}`}>
        <div className="preview-error">
          <div className="error-icon">⚠️</div>
          <h3>Preview Error</h3>
          <p>{error}</p>
          <button 
            className="refresh-btn"
            onClick={refreshPreview}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-preview ${className}`}>
      {isLoading && (
        <div className="preview-loading">
          <div className="loading-spinner"></div>
          <p>Loading app preview...</p>
        </div>
      )}
      
      {previewUrl && (
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="preview-iframe"
          title={`Preview of ${appId}`}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      )}
      
      <div className="preview-controls">
        <div className="preview-info">
          <span className="app-id">{appId}</span>
          <span className="status-indicator running">● Running</span>
        </div>
        <div className="preview-actions">
          <button 
            className="refresh-preview-btn"
            onClick={refreshPreview}
            title="Refresh preview"
          >
            🔄
          </button>
          <button 
            className="open-external-btn"
            onClick={() => previewUrl && window.open(previewUrl, '_blank')}
            title="Open in new tab"
          >
            ↗
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppPreview; 