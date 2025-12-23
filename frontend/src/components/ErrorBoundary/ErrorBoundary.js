import React, { Component } from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <h1 className="error-title">Something went wrong</h1>
            <p className="error-message">
              We apologize for the inconvenience. The application encountered an error.
            </p>
            
            {this.props.showDetails && this.state.error && (
              <div className="error-details">
                <h3 className="details-title">Error Details:</h3>
                <pre className="error-message-text">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre className="stack-trace">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
            
            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="retry-button"
              >
                🔄 Try Again
              </button>
              <button 
                onClick={this.handleGoHome}
                className="home-button"
              >
                🏠 Go to Home
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="reload-button"
              >
                ↻ Reload Page
              </button>
            </div>
            
            <div className="help-section">
              <p className="help-text">
                If the problem persists, please contact support or try again later.
              </p>
              <button 
                className="support-button"
                onClick={() => {
                  console.log('Contact support');
                }}
              >
                📞 Contact Support
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;