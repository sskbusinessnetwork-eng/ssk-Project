import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public props: Props;
  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorData;
      try {
        errorData = JSON.parse(this.state.error?.message || '{}');
      } catch (e) {
        errorData = { error: this.state.error?.message };
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
          <div className="max-w-md w-full bg-white rounded-[16px] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-[#111827] text-center mb-2">Something went wrong</h1>
            <p className="text-[#4B5563] text-center mb-6">
              {errorData.error || "An unexpected error occurred. Please try again later."}
            </p>
            {errorData.path && (
              <div className="bg-[#F9FAFB] rounded-lg p-4 mb-6 text-xs font-mono text-[#6B7280] overflow-hidden">
                <p>Path: {errorData.path}</p>
                <p>Operation: {errorData.operationType}</p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-primary text-white rounded-[12px] font-semibold hover:bg-primary/90 transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)] shadow-indigo-500/20"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
