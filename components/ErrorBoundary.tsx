import React, { ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  // Directly initializing state property for TS class component
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6" dir="rtl">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-red-100 max-w-lg text-center animate-fade-in">
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h1 className="text-2xl font-black text-gray-800 mb-2">عذراً، حدث خطأ غير متوقع</h1>
            <p className="text-gray-500 mb-6 text-sm">
              واجه النظام مشكلة في عرض هذه الصفحة. قد يكون السبب بيانات تالفة أو خطأ في الاتصال.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-left dir-ltr mb-6 max-h-32 overflow-auto text-xs text-red-800 font-mono">
                {this.state.error?.message || 'Unknown Error'}
            </div>

            <div className="flex gap-3 justify-center">
                <button
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 transition-colors"
                  onClick={() => { localStorage.clear(); window.location.reload(); }}
                >
                  <RefreshCw size={18} /> تصفير وإعادة تحميل
                </button>
                <button
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 flex items-center gap-2 transition-colors"
                  onClick={() => window.location.href = '/'}
                >
                  <Home size={18} /> الرئيسية
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;