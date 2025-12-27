
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO';
}

interface ToastContextType {
  showToast: (message: string, type?: 'SUCCESS' | 'ERROR' | 'INFO') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' = 'SUCCESS') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 w-full max-w-sm px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-3 p-4 rounded-2xl shadow-2xl border animate-slide-up backdrop-blur-md ${
              toast.type === 'SUCCESS' ? 'bg-emerald-600/90 border-emerald-500 text-white' :
              toast.type === 'ERROR' ? 'bg-red-600/90 border-red-500 text-white' :
              'bg-indigo-600/90 border-indigo-500 text-white'
            }`}
          >
            {toast.type === 'SUCCESS' ? <CheckCircle size={20}/> : toast.type === 'ERROR' ? <AlertCircle size={20}/> : <Info size={20}/>}
            <span className="flex-1 text-sm font-black font-tajawal">{toast.message}</span>
            <button onClick={() => setToasts(p => p.filter(t => t.id !== toast.id))} className="opacity-50 hover:opacity-100">
                <X size={16}/>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
