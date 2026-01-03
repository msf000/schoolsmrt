
import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Info, AlertTriangle, Zap, Trophy, MessageSquare, Clock } from 'lucide-react';
import { AppNotification } from '../types';
import { formatDualDate } from '../services/dateService';

const NotificationsCenter: React.FC<{ userId: string }> = ({ userId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem(`notifications_${userId}`);
        if (saved) setNotifications(JSON.parse(saved));
        
        // محاكاة إشعار ترحيبي
        if (!saved) {
            const welcome: AppNotification = {
                id: 'welcome',
                userId,
                title: 'مرحباً بك في النسخة الجديدة!',
                message: 'تم تفعيل مركز الإشعارات الذكي لمتابعة نشاطاتك لحظة بلحظة.',
                type: 'INFO',
                isRead: false,
                createdAt: new Date().toISOString()
            };
            setNotifications([welcome]);
            localStorage.setItem(`notifications_${userId}`, JSON.stringify([welcome]));
        }
    }, [userId]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = (id: string) => {
        const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
        setNotifications(updated);
        localStorage.setItem(`notifications_${userId}`, JSON.stringify(updated));
    };

    const clearAll = () => {
        setNotifications([]);
        localStorage.removeItem(`notifications_${userId}`);
    };

    return (
        <div className="relative font-tajawal">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="p-2.5 bg-slate-50 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-all relative group"
            >
                <Bell size={20}/>
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[190]" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute left-0 mt-4 w-96 bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 z-[200] overflow-hidden flex flex-col animate-zoom-in max-h-[600px]">
                        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Bell size={20} className="text-brand-400"/>
                                <h3 className="font-black text-sm">التنبيهات الذكية</h3>
                            </div>
                            <button onClick={clearAll} className="text-[10px] font-black text-slate-400 hover:text-white transition-colors">مسح الكل</button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => markAsRead(n.id)}
                                    className={`p-5 border-b border-slate-50 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer relative ${!n.isRead ? 'bg-brand-50/30' : ''}`}
                                >
                                    {!n.isRead && <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-brand-500 rounded-full"></div>}
                                    <div className={`p-3 rounded-2xl shrink-0 ${
                                        n.type === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600' :
                                        n.type === 'BADGE' ? 'bg-amber-50 text-amber-600' :
                                        n.type === 'TASK' ? 'bg-indigo-50 text-indigo-600' :
                                        'bg-slate-50 text-slate-400'
                                    }`}>
                                        {n.type === 'BADGE' ? <Trophy size={18}/> : n.type === 'TASK' ? <Zap size={18}/> : <Info size={18}/>}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-xs text-slate-800 mb-1">{n.title}</h4>
                                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{n.message}</p>
                                        <p className="text-[9px] text-slate-300 font-bold mt-2 flex items-center gap-1"><Clock size={10}/> {formatDualDate(n.createdAt)}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="py-20 flex flex-col items-center justify-center text-slate-200 gap-4">
                                    <Bell size={64} strokeWidth={1} className="opacity-20"/>
                                    <p className="font-black text-sm italic">لا توجد تنبيهات جديدة</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 bg-slate-50 text-center border-t">
                            <button onClick={() => setIsOpen(false)} className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline">إغلاق المركز</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationsCenter;
