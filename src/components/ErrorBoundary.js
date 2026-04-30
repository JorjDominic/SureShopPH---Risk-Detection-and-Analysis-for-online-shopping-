import React from 'react';

/**
 * Catches uncaught render errors anywhere below it in the tree so the user
 * sees a friendly screen instead of a blank white page.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#f8fafc',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: '100%',
            background: '#fff',
            borderRadius: 16,
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(15,23,42,0.08)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', color: '#dc2626', marginBottom: '0.75rem' }}>
            <i className="fas fa-triangle-exclamation"></i>
          </div>
          <h2 style={{ margin: 0, color: '#0f172a' }}>Something went wrong</h2>
          <p style={{ color: '#475569', marginTop: '0.75rem' }}>
            We hit an unexpected error rendering this page. Please reload to try again.
          </p>
          {this.state.message && (
            <pre
              style={{
                background: '#f1f5f9',
                color: '#475569',
                padding: '0.75rem',
                borderRadius: 8,
                fontSize: '0.8rem',
                textAlign: 'left',
                overflow: 'auto',
                margin: '1rem 0',
              }}
            >
              {this.state.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '0.65rem 1.5rem',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
