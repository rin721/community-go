import { Component, type ErrorInfo, type ReactNode } from 'react';

type ErrorBoundaryState = { hasError: boolean };

export class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('frontend_root_boundary', {
      errorName: error.name,
      componentStack: info.componentStack,
    });
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-canvas p-6 text-ink">
          <section className="max-w-lg rounded-panel border border-border bg-surface p-8 shadow-panel">
            <p className="text-sm font-semibold text-danger">Unexpected interface error</p>
            <h1 className="mt-2 text-2xl font-bold">界面暂时无法继续呈现</h1>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              请刷新页面。错误细节只保留在受控诊断边界中。
            </p>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
