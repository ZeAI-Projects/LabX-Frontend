import React from 'react';

export class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Frontend render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-error" role="alert">
          <div className="glass-card app-error__card">
            <h1>Something went wrong</h1>
            <p>The interface could not finish loading. Your account data has not been changed.</p>
            <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>
              Reload LabX
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
