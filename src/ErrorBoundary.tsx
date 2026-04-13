import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("React Error Boundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a1a1a",
            color: "#ccc",
            padding: 32,
          }}
        >
          <div style={{ maxWidth: 600 }}>
            <h1 style={{ color: "#ff6b6b", fontSize: 18, marginBottom: 12 }}>
              Render Error
            </h1>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 12,
                background: "#222",
                padding: 16,
                borderRadius: 8,
                border: "1px solid #333",
                maxHeight: 300,
                overflow: "auto",
              }}
            >
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
              style={{
                marginTop: 16,
                padding: "8px 16px",
                background: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Herlaad app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
