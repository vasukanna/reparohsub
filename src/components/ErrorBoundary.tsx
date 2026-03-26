import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
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
      const isOfflineError = this.state.error?.message.includes('client is offline');
      
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full text-center border border-red-100">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 mb-4">
              {isOfflineError ? 'Database Connection Error' : 'Something went wrong'}
            </h1>
            
            {isOfflineError ? (
              <div className="text-left space-y-4 text-gray-600">
                <p className="font-medium text-red-600">Your Firestore Database hasn't been created yet!</p>
                <p>To fix this right now:</p>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-orange-600 font-bold hover:underline">Firebase Console</a></li>
                  <li>Open your <strong>gen-lang-client-0629093844</strong> project</li>
                  <li>Click <strong>Firestore Database</strong> in the left menu</li>
                  <li>Click the big <strong>Create database</strong> button</li>
                  <li>Select <strong>Start in test mode</strong> and click Next</li>
                  <li>Click <strong>Create</strong></li>
                </ol>
                <p className="mt-4 text-sm text-gray-500">After creating it, refresh this page.</p>
              </div>
            ) : (
              <p className="text-gray-600 mb-8">
                We're sorry, but an unexpected error occurred. Please try refreshing the page.
              </p>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="mt-8 bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg w-full"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
