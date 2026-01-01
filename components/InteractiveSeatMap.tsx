
import React, { useState, useMemo } from 'react';
import { Student, SystemUser } from '../types';
import { updateStudent } from '../services/storageService';
import { 
    Zap, MonitorPlay, X, Sparkles, ArrowRightLeft, User, BrainCircuit, Loader2, ChevronLeft, LayoutGrid, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastProvider';
import { suggestSeatingPlan } from '../services/geminiService';

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
    const [isArranging, setIsArranging] = useState(false);

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
        const idx1 = s1.seatIndex || 0;
        const idx2 = s2.seatIndex || 0;
        try {
            await updateStudent({ ...s1, seatIndex: idx2 });
            await updateStudent({ ...s2, seatIndex: idx1 });
            showToast(`تم تبديل المقاعد بنجاح.`, 'SUCCESS');
        } catch (e) {
            showToast('فشل التبديل السحابي', 'ERROR');
        } finally {
            setIsSwapMode(false);
            setSelectedStudent(null);
        }
    };

    const handleAIArrange = async () => {
        if (filteredStudents.length === 0) return;
        setIsArranging(true);
        try {
            const result = await suggestSeatingPlan(filteredStudents, "مزج المستويات (متفوق بجانب ضعيف)");
            if (result && result.seating) {
                for (const item of result.seating) {
                    const s = students.find(x => x.id === item.studentId);
                    if (s) await updateStudent({ ...s, seatIndex: (item.row * 10) + item.col });
                }
                showToast('اكتمل التوزيع الذكي للمقاعد.', 'SUCCESS');
            }
        } catch (e) {
            showToast('فشل التوزيع الذكي', 'ERROR');
        } finally {
            setIsArranging(false);
        }
    };

    return (
        <div className="h-full flex flex-col md:flex-row animate-fade-in font-tajawal relative bg-white">
            <div className="w-full md:w-64 border-l border-slate-200 p-6 flex flex-col gap-6 bg-slate-50/50 shrink-0">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><LayoutGrid size={18} className="text-blue-600"/> تنظيم القاعة</h3>
                    <div className="space-y-2">
                        <button 
                            onClick={handleAIArrange}
                            disabled={isArranging}
                            className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50"
                        >
                            {isArranging ? <Loader2 className="animate-spin" size={14}/> : <BrainCircuit size={14} className="text-blue-400"/>}
                            توزيع ذكي (AI)
                        </button>
                        
                        <button 
                            onClick={() => { setIsSwapMode(!isSwapMode); setSelectedStudent(null); }}
                            className={`w-full py-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-2 border transition-all ${isSwapMode ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600'}`}
                        >
                            <ArrowRightLeft size={14}/> {isSwapMode ? 'إلغاء التبديل' : 'تبديل مقاعد يدوي'}
                        </button>
                    </div>
                </div>

                <div className="mt-auto p-4 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><div className="w-3 h-3 bg-blue-600 rounded"></div> مقعد مشغول</div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><div className="w-3 h-3 bg-slate-100 border border-slate-200 rounded"></div> مقعد متاح</div>
                </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar flex flex-col items-center gap-12">
                 <div className="w-48 h-8 bg-slate-200 rounded-b-xl flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase tracking-widest border border-t-0 border-slate-300">اتجاه السبورة</div>
                 
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 max-w-5xl w-full">
                    {filteredStudents.map((s) => (
                        <div 
                            key={s.id} 
                            onClick={() => handleStudentClick(s)}
                            className={`aspect-[1.2/1] rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center p-3 relative ${selectedStudent?.id === s.id ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-100' : 'border-slate-100 bg-white hover:border-blue-300 shadow-sm'}`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold mb-2 ${selectedStudent?.id === s.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {s.name.charAt(0)}
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 text-center truncate w-full">{s.name.split(' ')[0]}</span>
                            <div className="absolute -top-2 -right-2 bg-blue-600 text-white w-6 h-6 rounded flex items-center justify-center font-bold text-[9px] border-2 border-white shadow">Lv{s.level || 1}</div>
                        </div>
                    ))}
                 </div>
            </div>

            {selectedStudent && !isSwapMode && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden animate-zoom-in">
                        <div className="p-6 bg-blue-700 text-white flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-xl font-bold border border-white/20">{selectedStudent.name.charAt(0)}</div>
                                <div>
                                    <h3 className="font-bold text-sm">{selectedStudent.name}</h3>
                                    <p className="text-[10px] font-bold opacity-70 uppercase">{selectedStudent.className}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-3">
                             <button onClick={() => { navigate('/followup', {state:{studentId: selectedStudent.id}}); setSelectedStudent(null); }} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-2">عرض ملف الطالب <ChevronLeft size={14}/></button>
                             <button onClick={() => setSelectedStudent(null)} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200 transition-all">إغلاق النافذة</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InteractiveSeatMap;
