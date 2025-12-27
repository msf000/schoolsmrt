
import React, { useState, useMemo } from 'react';
import { Student, SystemUser, BehaviorIncident } from '../types';
import { saveBehaviorIncident, updateStudent } from '../services/storageService';
import { 
    Zap, Star, MonitorPlay, X, Sparkles, Smile, Frown, MessageSquare, ArrowRightLeft, Ghost, CheckCircle, ShieldAlert, User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastProvider';

interface InteractiveSeatMapProps {
    students: Student[];
    selectedClass: string;
    currentUser: SystemUser;
}

const InteractiveSeatMap: React.FC<InteractiveSeatMapProps> = ({ students, selectedClass, currentUser }) => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isSwapMode, setIsSwapMode] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const filteredStudents = useMemo(() => 
        students.filter(s => s.className === selectedClass).sort((a,b) => (a.seatIndex || 0) - (b.seatIndex || 0)),
    [students, selectedClass]);

    const handleStudentClick = (student: Student) => {
        if (isSwapMode) {
            if (!selectedStudent) {
                setSelectedStudent(student);
            } else if (selectedStudent.id !== student.id) {
                handlePerformSwap(selectedStudent, student);
            }
        } else {
            setSelectedStudent(student);
        }
    };

    const handlePerformSwap = async (s1: Student, s2: Student) => {
        setActionLoading(true);
        const idx1 = s1.seatIndex || 0;
        const idx2 = s2.seatIndex || 0;
        
        try {
            await updateStudent({ ...s1, seatIndex: idx2 });
            await updateStudent({ ...s2, seatIndex: idx1 });
            showToast(`تم تبديل مقعد ${s1.name.split(' ')[0]} مع ${s2.name.split(' ')[0]}`, 'SUCCESS');
        } catch (e) {
            showToast('فشل التبديل السحابي', 'ERROR');
        } finally {
            setActionLoading(false);
            setIsSwapMode(false);
            setSelectedStudent(null);
        }
    };

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
            note: 'رصد فوري من خريطة الفصل'
        };
        await saveBehaviorIncident(incident);
        showToast(`تم رصد ${points} نقاط لـ ${selectedStudent.name}`, type === 'POSITIVE' ? 'SUCCESS' : 'ERROR');
        setActionLoading(false);
        setSelectedStudent(null);
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in font-tajawal relative bg-gray-50/50 p-4">
            <div className="w-full md:w-64 bg-white p-6 rounded-[2.5rem] border shadow-sm h-fit">
                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-sm"><MonitorPlay size={18} className="text-indigo-600"/> رصد الفصل الذكي</h3>
                <div className="space-y-4">
                    <button 
                        onClick={() => { setIsSwapMode(!isSwapMode); setSelectedStudent(null); }}
                        className={`w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${isSwapMode ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-indigo-50'}`}
                    >
                        <ArrowRightLeft size={16}/> {isSwapMode ? 'إلغاء التبديل' : 'تبديل مقاعد الطلاب'}
                    </button>
                    <div className="flex items-center gap-3 text-xs font-bold text-gray-500"><div className="w-4 h-4 bg-indigo-600 rounded-lg"></div> مقعد مشغول</div>
                    <div className="flex items-center gap-3 text-xs font-bold text-gray-500"><div className="w-4 h-4 bg-gray-100 rounded-lg border-2 border-dashed"></div> مقعد شاغر</div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-[3rem] border shadow-sm p-10 overflow-y-auto custom-scrollbar">
                <div className="w-full max-w-5xl mx-auto flex flex-col gap-16">
                     <div className="w-64 h-12 bg-slate-800 rounded-b-3xl mx-auto flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest shadow-xl">السبورة / المعلم</div>
                     
                     <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                        {filteredStudents.map((s) => (
                            <button 
                                key={s.id} 
                                onClick={() => handleStudentClick(s)}
                                className={`aspect-[4/3] rounded-[2.5rem] border-4 transition-all flex flex-col items-center justify-center p-4 relative group ${selectedStudent?.id === s.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-2xl scale-110 z-20' : 'bg-white border-slate-50 text-slate-800 hover:border-indigo-100 shadow-sm'}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black mb-2 ${selectedStudent?.id === s.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600 transition-colors'}`}>
                                    {s.name.charAt(0)}
                                </div>
                                <span className="text-[10px] font-black text-center line-clamp-1">{s.name.split(' ')[0]}</span>
                                <div className="absolute -top-3 -right-3 bg-yellow-400 text-slate-900 w-8 h-8 rounded-xl flex items-center justify-center font-black border-4 border-white shadow-lg text-[10px]">Lv{s.level || 1}</div>
                            </button>
                        ))}
                     </div>
                </div>
            </div>

            {selectedStudent && !isSwapMode && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-zoom-in">
                        <div className="p-8 bg-indigo-600 text-white flex items-center gap-6">
                            <div className="w-16 h-16 bg-white/20 rounded-[1.5rem] flex items-center justify-center text-3xl font-black">{selectedStudent.name.charAt(0)}</div>
                            <div className="text-right">
                                <h3 className="text-xl font-black">{selectedStudent.name}</h3>
                                <p className="text-indigo-200 text-xs font-bold uppercase">{selectedStudent.className}</p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="mr-auto p-2 bg-white/10 rounded-full hover:bg-white/20"><X size={20}/></button>
                        </div>
                        <div className="p-8 grid grid-cols-1 gap-4">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"><Sparkles size={12}/> رصد سلوك فوري</div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <QuickBtn icon={<CheckCircle className="text-emerald-500"/>} label="مشاركة متميزة" points="+10" onClick={()=>handleQuickAction('POSITIVE','مشاركة متميزة',10)} />
                                <QuickBtn icon={<Zap className="text-yellow-500"/>} label="مساعدة زميل" points="+15" onClick={()=>handleQuickAction('POSITIVE','مساعدة زميل',15)} />
                                <QuickBtn icon={<Smile className="text-blue-500"/>} label="انضباط عالي" points="+5" onClick={()=>handleQuickAction('POSITIVE','انضباط عالي',5)} />
                                <QuickBtn icon={<Frown className="text-red-500"/>} label="تأخر عن الحصة" points="-5" onClick={()=>handleQuickAction('NEGATIVE','تأخر عن الحصة',-5)} />
                                <QuickBtn icon={<Ghost className="text-gray-500"/>} label="عدم إحضار كتاب" points="-10" onClick={()=>handleQuickAction('NEGATIVE','عدم إحضار كتاب',-10)} />
                                <QuickBtn icon={<ShieldAlert className="text-orange-500"/>} label="إزعاج صفي" points="-15" onClick={()=>handleQuickAction('NEGATIVE','إزعاج صفي',-15)} />
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
        <span className={`text-[9px] font-black ${points.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>{points} XP</span>
    </button>
);

export default InteractiveSeatMap;
