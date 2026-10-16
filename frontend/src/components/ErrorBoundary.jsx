import { Component } from "react";

/** Keeps a crash in one page from blanking the whole app. */
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="nm-card mx-auto max-w-xl p-8 text-center">
        <p className="label-eyebrow">Something went wrong</p>
        <h2 className="mt-2 font-display text-xl font-semibold text-ink">This section couldn&apos;t be displayed</h2>
        <p className="nm-muted mt-2">{String(this.state.error?.message || this.state.error)}</p>
        <button className="btn-primary mt-5" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    );
  }
}
