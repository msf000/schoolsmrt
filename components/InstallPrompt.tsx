import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user has already dismissed it recently? For now, show it.
      if (!window.matchMedia('(display-mode: standalone)').matches) {
          setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="w-full">
        <button 
            onClick={handleInstallClick}
            className="w-full flex items-center justify-between text-xs px-3 py-2 rounded border transition-colors cursor-pointer bg-purple-600 text-white hover:bg-purple-700 border-purple-800 shadow-md animate-pulse"
        >
            <span className="font-bold flex items-center gap-2"><Download size={16}/> تثبيت التطبيق</span>
            <span className="text-[10px] bg-purple-800 px-1.5 rounded">للجوال</span>
        </button>
    </div>
  );
};

export default InstallPrompt;