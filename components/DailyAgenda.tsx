
import React, { useMemo } from 'react';
import { ScheduleItem } from '../types';
import { Clock, Play, CheckCircle, ArrowLeft, Calendar, MapPin } from 'lucide-react';

interface Props {
    schedule: ScheduleItem[];
    onAction: (className: string) => void;
}

const DailyAgenda: React.FC<Props> = ({ schedule, onAction }) => {
    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    
    const todaysSessions = useMemo(() => {
        return schedule
            .filter(s => s.day === today)
            .sort((a, b) => a.period - b.period);
    }, [schedule, today]);

    // تحديد الحصة الحالية (بشكل تجريبي بناءً على الوقت الحالي)
    const currentPeriod = useMemo(() => {
        const now = new Date();
        const hour = now.getHours();
        const min = now.getMinutes();
        const totalMin = (hour * 60) + min;
        
        // أوقات افتراضية للحصص (تبدأ 7:00 ص، كل حصة 45 دقيقة)
        const startMin = 7 * 60;
        const periodLen = 50; // شامل الفسحة البسيطة
        
        const current = Math.floor((totalMin - startMin) / periodLen) + 1;
        return (current >= 1 && current <= 8) ? current : null;
    }, []);

    return (
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl">
            <div className="flex justify-between items-center mb-8 border-b pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Calendar size={24}/></div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">أجندة حصص اليوم</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">يوم {new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date())}</p>
                    </div>
                </div>
                <div className="hidden md:flex gap-1">
                    {[1,2,3,4,5,6,7,8].map(p => (
                        <div key={p} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${p === currentPeriod ? 'bg-indigo-600 text-white animate-pulse shadow-lg' : todaysSessions.some(s=>s.period===p) ? 'bg-indigo-50 text-indigo-400' : 'bg-slate-50 text-slate-200'}`}>
                            {p}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todaysSessions.length > 0 ? todaysSessions.map((session) => {
                    const isCurrent = session.period === currentPeriod;
                    return (
                        <div key={session.id} className={`p-6 rounded-[2.5rem] border-2 transition-all relative group ${isCurrent ? 'bg-indigo-50 border-indigo-200 shadow-lg scale-[1.02]' : 'bg-white border-slate-50'}`}>
                            {isCurrent && (
                                <div className="absolute -top-3 right-8 bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2">
                                    <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                                    جارية الآن
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-xl text-[10px] font-black ${isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>الحصة {session.period}</span>
                                <Clock size={16} className={isCurrent ? 'text-indigo-400 animate-spin-slow' : 'text-slate-200'}/>
                            </div>
                            <h4 className="text-xl font-black text-slate-800 mb-1">{session.subjectName}</h4>
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs mb-6">
                                <MapPin size={12}/> {session.classId}
                            </div>
                            <button 
                                onClick={() => onAction(session.classId)}
                                className={`w-full py-3 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 ${isCurrent ? 'bg-indigo-600 text-white shadow-xl hover:bg-indigo-700' : 'bg-slate-50 text-slate-400 hover:bg-indigo-50'}`}
                            >
                                <CheckCircle size={16}/> رصد الغياب
                            </button>
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-10 text-center text-slate-300 font-bold italic bg-slate-50 rounded-3xl border-2 border-dashed border-slate-100">
                        لا توجد حصص مجدولة لهذا اليوم في نظام المتابعة.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailyAgenda;
