'use client'
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Label shown in the fallback message, e.g. "Bulk tab". */
  label: string
}

interface State {
  error: Error | null
}

// Catches render/lifecycle errors in a subtree (e.g. a malformed Excel file
// throwing during parse) and shows a message instead of a blank crashed app.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(`ErrorBoundary (${this.props.label}) caught:`, error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <section className="card">
          <div className="alert alert-error">
            <strong>Something went wrong in the {this.props.label}.</strong>
            <p style={{ marginTop: '8px', fontSize: '13px' }}>
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </section>
      )
    }

    return this.props.children
  }
}
