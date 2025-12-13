import React, { useEffect, useState } from 'react';
import { Download, X, Share, Smartphone, Compass, HeartHandshake } from 'lucide-react';

interface InstallPromptProps {
    userRole?: 'TEACHER' | 'STUDENT' | 'PARENT';
}

const InstallPrompt: React.FC<InstallPromptProps> = ({ userRole = 'TEACHER' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Check if already dismissed recently (e.g., in last 24h)
    const lastDismissed = localStorage.getItem('install_prompt_dismissed');
    if (lastDismissed && (Date.now() - Number(lastDismissed) < 24 * 60 * 60 * 1000)) {
        return; 
    }

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

  const handleClose = () => {
      setShowPrompt(false);
      localStorage.setItem('install_prompt_dismissed', Date.now().toString());
  }

  if (!showPrompt) return null;

  // Customize Text & Color based on Role
  let appName = "المدرس الذكي";
  let description = "تجربة أسرع بدون إنترنت";
  let icon = <Smartphone size={16} className="text-teal-600"/>;
  let btnColor = "bg-teal-600";

  if (userRole === 'STUDENT') {
      appName = "رفيق الطالب";
      description = "جداولك ودرجاتك في جيبك";
      icon = <Compass size={16} className="text-sky-600"/>;
      btnColor = "bg-sky-600";
  } else if (userRole === 'PARENT') {
      appName = "شريك النجاح";
      description = "تابع أبناءك لحظة بلحظة";
      icon = <HeartHandshake size={16} className="text-indigo-600"/>;
      btnColor = "bg-[#1e1b4b]"; // Navy
  }

  return (
    <>
        {/* Desktop/Sidebar Button (Only for Teacher usually, but safe to keep generalized) */}
        <div className="hidden md:block w-full">
            <button 
                onClick={handleInstallClick}
                className="w-full flex items-center justify-between text-xs px-3 py-2 rounded border transition-colors cursor-pointer bg-gray-900 text-white hover:bg-black border-black shadow-md animate-pulse"
            >
                <span className="font-bold flex items-center gap-2"><Download size={16}/> تحميل التطبيق</span>
                <span className="text-[10px] bg-white/20 px-1.5 rounded">PC/Mac</span>
            </button>
        </div>

        {/* Mobile Fixed Banner */}
        <div className="md:hidden bg-white border-t border-gray-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] rounded-t-2xl flex items-center justify-between animate-slide-up">
            <div className="flex flex-col">
                <span className="font-bold text-gray-800 text-sm flex items-center gap-2">
                    {icon} تثبيت "{appName}"
                </span>
                <span className="text-xs text-gray-500 mt-0.5">{description}</span>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20}/></button>
                <button 
                    onClick={handleInstallClick}
                    className={`${btnColor} text-white px-4 py-2 rounded-lg text-xs font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-transform`}
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