import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p className="error-boundary-message">{this.state.error.message}</p>
          <button className="error-boundary-retry" onClick={this.handleRetry}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
