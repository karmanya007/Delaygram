"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(
      JSON.stringify({
        context: "ErrorBoundary",
        error: error.message,
        stack: info.componentStack,
      }),
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">
              Something went wrong. Please refresh the page.
            </p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
