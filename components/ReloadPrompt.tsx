
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

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

  return (
    <div className="fixed bottom-4 left-4 right-4 md:right-auto md:w-96 z-[9999]">
      {(offlineReady || needRefresh) && (
        <div className="bg-gray-900 text-white p-4 rounded-xl shadow-2xl flex items-start gap-4 border border-gray-700 animate-slide-up">
          <div className="p-2 bg-gray-800 rounded-full">
            <AlertCircle size={24} className="text-teal-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-1">
              {offlineReady ? 'التطبيق جاهز للعمل بدون إنترنت' : 'تحديث جديد متوفر'}
            </h4>
            <p className="text-xs text-gray-300 mb-3">
              {offlineReady
                ? 'تم حفظ الملفات الأساسية. يمكنك استخدام التطبيق دون اتصال بالشبكة.'
                : 'يتوفر إصدار جديد من النظام. يرجى التحديث للحصول على أحدث المميزات.'}
            </p>
            <div className="flex gap-2">
              {needRefresh && (
                <button
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                  onClick={() => updateServiceWorker(true)}
                >
                  <RefreshCw size={12} /> تحديث الآن
                </button>
              )}
              <button
                className="bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                onClick={close}
              >
                إغلاق
              </button>
            </div>
          </div>
          <button onClick={close} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ReloadPrompt;
