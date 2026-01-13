import React from "react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("[ErrorBoundary]", error, info);
  }
  render() {
    if (!this.state.hasError) return this.props.children;

    const msg =
      this.state.error?.message ||
      String(this.state.error || "Unknown error");

    return (
      <div style={{ padding: 16, fontFamily: "ui-sans-serif, system-ui" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>Crash caught ✅</h2>
        <p style={{ marginTop: 8, color: "#b91c1c" }}>{msg}</p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Open DevTools Console for full stack.
        </p>
      </div>
    );
  }
}

