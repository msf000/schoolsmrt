import React, { useEffect, useState } from 'react';
import { Download, X, Share, Smartphone } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if installed
      if (!window.matchMedia('(display-mode: standalone)').matches) {
          setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // For iOS, show prompt if not standalone (manual check as iOS doesn't fire beforeinstallprompt)
    if (isIosDevice && !window.matchMedia('(display-mode: standalone)').matches) {
        // Show after a small delay to not annoy immediately
        setTimeout(() => setShowPrompt(true), 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
        if(isIOS) {
            alert("لتثبيت التطبيق على الآيفون:\n1. اضغط على زر المشاركة (Share) في أسفل المتصفح\n2. اختر 'إضافة إلى الصفحة الرئيسية' (Add to Home Screen)");
        }
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <>
        {/* Desktop/Sidebar Button */}
        <div className="hidden md:block w-full">
            <button 
                onClick={handleInstallClick}
                className="w-full flex items-center justify-between text-xs px-3 py-2 rounded border transition-colors cursor-pointer bg-purple-600 text-white hover:bg-purple-700 border-purple-800 shadow-md animate-pulse"
            >
                <span className="font-bold flex items-center gap-2"><Download size={16}/> تثبيت التطبيق</span>
                <span className="text-[10px] bg-purple-800 px-1.5 rounded">للكمبيوتر</span>
            </button>
        </div>

        {/* Mobile Fixed Banner */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[100] flex items-center justify-between animate-slide-up safe-area-pb">
            <div className="flex flex-col">
                <span className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    <Smartphone size={16} className="text-purple-600"/> تثبيت "المدرس الذكي"
                </span>
                <span className="text-xs text-gray-500 mt-0.5">تجربة أسرع، وبدون إنترنت.</span>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => setShowPrompt(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={20}/></button>
                <button 
                    onClick={handleInstallClick}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-transform"
                >
                    {isIOS ? <Share size={14}/> : <Download size={14}/>}
                    {isIOS ? 'تثبيت (iOS)' : 'تثبيت'}
                </button>
            </div>
        </div>
    </>
  );
};

export default InstallPrompt;