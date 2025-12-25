
import React, { useState, useMemo } from 'react';
import { Student, SystemUser, BehaviorIncident } from '../types';
import { saveBehaviorIncident } from '../services/storageService';
import { 
    Zap, Star, ShieldAlert, MonitorPlay, CheckCircle, 
    XCircle, User, Info, Trophy, Ghost, Sparkles, Smile, Frown, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InteractiveSeatMapProps {
    students: Student[];
    selectedClass: string;
    currentUser: SystemUser;
}

const InteractiveSeatMap: React.FC<InteractiveSeatMapProps> = ({ students, selectedClass, currentUser }) => {
    const navigate = useNavigate();
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const filteredStudents = useMemo(() => 
        students.filter(s => s.className === selectedClass).sort((a,b) => (a.seatIndex || 0) - (b.seatIndex || 0)),
    [students, selectedClass]);

    const handleQuickAction = async (type: 'POSITIVE' | 'NEGATIVE', category: string, points: number) => {
        if (!selectedStudent) return;
        setActionLoading(true);
        const incident: BehaviorIncident = {
            id: `beh_${Date.now()}`,
            studentId: selectedStudent.id,
            teacherId: currentUser.id,
            type,
            category,
            points,
            date: new Date().toISOString(),
            note: 'رصد سريع من خريطة المقاعد'
        };
        await saveBehaviorIncident(incident);
        setActionLoading(false);
        setSelectedStudent(null);
        alert(`تم رصد ${points} نقاط لـ ${selectedStudent.name}`);
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in font-tajawal relative">
            <div className="w-full md:w-64 bg-white p-6 rounded-[2.5rem] border shadow-sm h-fit">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-sm"><MonitorPlay size={18} className="text-indigo-600"/> رصد الفصل الذكي</h3>
                <div className="space-y-4">
                    <div className="flex items-center gap-3 text-xs font-bold text-gray-500"><div className="w-4 h-4 bg-indigo-600 rounded-lg"></div> مقعد مشغول</div>
                    <div className="flex items-center gap-3 text-xs font-bold text-gray-500"><div className="w-4 h-4 bg-gray-100 rounded-lg border-2 border-dashed"></div> مقعد شاغر</div>
                    <div className="pt-4 border-t mt-4">
                        <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">تعليمات</p>
                        <p className="text-[11px] text-gray-400 leading-relaxed">انقر على مقعد الطالب لفتح قائمة الرصد السريع للسلوك والمشاركة.</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-[3rem] border shadow-sm p-10 overflow-y-auto custom-scrollbar">
                <div className="w-full max-w-5xl mx-auto flex flex-col gap-16">
                     <div className="w-64 h-12 bg-slate-800 rounded-b-3xl mx-auto flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest shadow-xl">السبورة / المعلم</div>
                     
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                        {filteredStudents.map((s) => (
                            <button 
                                key={s.id} 
                                onClick={() => setSelectedStudent(s)}
                                className={`aspect-[4/3] rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center p-4 relative group ${selectedStudent?.id === s.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-2xl scale-110 z-20' : 'bg-white border-slate-50 text-slate-800 hover:border-indigo-100 shadow-sm'}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black mb-2 ${selectedStudent?.id === s.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors'}`}>
                                    {s.name.charAt(0)}
                                </div>
                                <span className="text-[10px] font-black text-center line-clamp-1">{s.name.split(' ')[0]}</span>
                                <div className="absolute -top-3 -right-3 bg-yellow-400 text-slate-900 w-8 h-8 rounded-xl flex items-center justify-center font-black border-4 border-white shadow-lg text-[10px]">Lv{s.level || 1}</div>
                            </button>
                        ))}
                     </div>
                </div>
            </div>

            {selectedStudent && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-zoom-in">
                        <div className="p-8 bg-indigo-600 text-white flex items-center gap-6">
                            <div className="w-16 h-16 bg-white/20 rounded-[1.5rem] flex items-center justify-center text-3xl font-black">{selectedStudent.name.charAt(0)}</div>
                            <div>
                                <h3 className="text-xl font-black">{selectedStudent.name}</h3>
                                <p className="text-indigo-200 text-xs font-bold uppercase">{selectedStudent.className}</p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="mr-auto p-2 bg-white/10 rounded-full"><XCircle/></button>
                        </div>
                        <div className="p-8 grid grid-cols-1 gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><Sparkles size={12}/> رصد سلوك فوري</div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <QuickBtn icon={<CheckCircle className="text-emerald-500"/>} label="مشاركة متميزة" points="+10" onClick={()=>handleQuickAction('POSITIVE','مشاركة متميزة',10)} />
                                <QuickBtn icon={<Zap className="text-yellow-500"/>} label="مساعدة زميل" points="+15" onClick={()=>handleQuickAction('POSITIVE','مساعدة زميل',15)} />
                                <QuickBtn icon={<Smile className="text-blue-500"/>} label="انضباط عالي" points="+5" onClick={()=>handleQuickAction('POSITIVE','انضباط عالي',5)} />
                                <QuickBtn icon={<Frown className="text-red-500"/>} label="تأخر عن الحصة" points="-5" onClick={()=>handleQuickAction('NEGATIVE','تأخر عن الحصة',-5)} />
                                <QuickBtn icon={<Ghost className="text-gray-500"/>} label="عدم إحضار كتاب" points="-10" onClick={()=>handleQuickAction('NEGATIVE','عدم إحضار كتاب',-10)} />
                                <QuickBtn icon={<MessageSquare className="text-orange-500"/>} label="إزعاج صفي" points="-15" onClick={()=>handleQuickAction('NEGATIVE','إزعاج صفي',-15)} />
                            </div>

                            <button onClick={() => { navigate('/followup', {state:{studentId: selectedStudent.id}}); setSelectedStudent(null); }} className="w-full mt-4 py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all border border-slate-100">عرض الملف الشخصي الكامل</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const QuickBtn = ({ icon, label, points, onClick }: any) => (
    <button onClick={onClick} className="p-4 bg-gray-50 border rounded-2xl flex flex-col items-center gap-2 hover:bg-white hover:border-indigo-100 hover:shadow-lg transition-all group">
        <div className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">{icon}</div>
        <span className="text-[10px] font-black text-slate-800 text-center">{label}</span>
        <span className={`text-[9px] font-black ${points.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>{points} n</span>
    </button>
);

export default InteractiveSeatMap;
