import { Component, type ErrorInfo, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null } as { error: Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ui_boundary", {
      message: error.message,
      componentStack: info.componentStack,
    });
  }
  render() {
    const en = localStorage.getItem("ac:locale") === "en";
    return this.state.error ? (
      <main className="state-page" role="alert">
        <h1>
          {en ? "Unable to display this screen" : "Không thể hiển thị màn hình"}
        </h1>
        <p>{this.state.error.message}</p>
        <button onClick={() => location.reload()}>
          {en ? "Reload safely" : "Tải lại an toàn"}
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
