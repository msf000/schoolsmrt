
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AlertCircle, RefreshCw, X, DownloadCloud } from 'lucide-react';

const ReloadPrompt = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // Do not render if nothing to show
  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-6 left-6 right-6 md:right-auto md:left-6 md:w-96 z-[9999] animate-slide-up" dir="rtl">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        
        <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full shrink-0 ${needRefresh ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'}`}>
                {needRefresh ? <RefreshCw size={24} className="animate-spin-slow"/> : <DownloadCloud size={24}/>}
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-base mb-1">
                    {needRefresh ? 'تحديث جديد متوفر' : 'جاهز للعمل بدون إنترنت'}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                    {needRefresh 
                        ? 'تتوفر نسخة جديدة من التطبيق مع تحسينات وإصلاحات. يرجى التحديث للحصول على أفضل تجربة.' 
                        : 'تم تحميل ملفات التطبيق بنجاح. يمكنك الآن استخدام النظام حتى بدون اتصال بالإنترنت.'}
                </p>
            </div>
            <button onClick={close} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X size={18}/>
            </button>
        </div>

        <div className="flex gap-3 mt-1">
            {needRefresh && (
                <button 
                    onClick={() => updateServiceWorker(true)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md shadow-indigo-200"
                >
                    <RefreshCw size={16}/> تحديث الآن
                </button>
            )}
            <button 
                onClick={close}
                className={`flex-1 border py-2.5 rounded-xl font-bold text-sm transition-colors ${needRefresh ? 'border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-green-600 text-white hover:bg-green-700 border-transparent shadow-md shadow-green-200'}`}
            >
                {needRefresh ? 'لاحقاً' : 'حسناً، فهمت'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ReloadPrompt;
