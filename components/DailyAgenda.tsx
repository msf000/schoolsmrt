
import React, { useMemo } from 'react';
import { ScheduleItem } from '../types';
import { Clock, CheckCircle, ArrowLeft, Calendar, MapPin } from 'lucide-react';

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

    const currentPeriod = useMemo(() => {
        const now = new Date();
        const hour = now.getHours();
        const min = now.getMinutes();
        const totalMin = (hour * 60) + min;
        const startMin = 7 * 60; // 7:00 AM
        const periodLen = 50; 
        const current = Math.floor((totalMin - startMin) / periodLen) + 1;
        return (current >= 1 && current <= 8) ? current : null;
    }, []);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-tajawal">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-lg"><Calendar size={20}/></div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">الحصص المجدولة لليوم</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date())}</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    {[1,2,3,4,5,6,7,8].map(p => (
                        <div key={p} className={`w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold ${p === currentPeriod ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}>
                            {p}
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {todaysSessions.length > 0 ? todaysSessions.map((session) => {
                    const isCurrent = session.period === currentPeriod;
                    return (
                        <div key={session.id} className={`p-4 rounded-xl border-2 transition-all relative ${isCurrent ? 'border-blue-600 bg-blue-50/30' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                            {isCurrent && (
                                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                                    <span className="text-[9px] font-black text-blue-600 uppercase">الآن</span>
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>الحصة {session.period}</span>
                                <Clock size={14} className={isCurrent ? 'text-blue-600' : 'text-slate-300'}/>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 mb-1">{session.subjectName}</h4>
                            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px] mb-4">
                                <MapPin size={10}/> {session.classId}
                            </div>
                            <button 
                                onClick={() => onAction(session.classId)}
                                className={`w-full py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 transition-all ${isCurrent ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                            >
                                <CheckCircle size={14}/> التحضير والغياب
                            </button>
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-12 text-center text-slate-300 font-bold italic border-2 border-dashed border-slate-100 rounded-xl">
                        لا توجد حصص مجدولة لهذا اليوم.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DailyAgenda;
