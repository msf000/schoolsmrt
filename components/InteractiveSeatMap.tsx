
import React, { useState, useMemo } from 'react';
import { Student, SystemUser } from '../types';
import { updateStudent } from '../services/storageService';
import { 
    Zap, MonitorPlay, X, Sparkles, ArrowRightLeft, User, BrainCircuit, Loader2, ChevronLeft, LayoutGrid, CheckCircle, Info, MousePointer2, Grid3X3, Target
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
        <div className="h-full flex flex-col lg:flex-row animate-fade-in font-tajawal relative bg-white overflow-hidden">
            {/* Action Sidebar */}
            <div className="w-full lg:w-80 border-l border-slate-100 p-8 flex flex-col gap-8 bg-slate-50/30 shrink-0">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b pb-2">عمليات التحكم الصفي</h3>
                    <div className="space-y-3">
                        <button 
                            onClick={handleAIArrange}
                            disabled={isArranging}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-black disabled:opacity-50 transition-all shadow-xl shadow-slate-200"
                        >
                            {isArranging ? <Loader2 className="animate-spin" size={18}/> : <BrainCircuit size={18} className="text-blue-400"/>}
                            التوزيع الذكي (AI)
                        </button>
                        
                        <button 
                            onClick={() => { setIsSwapMode(!isSwapMode); setSelectedStudent(null); }}
                            className={`w-full py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 border-2 transition-all ${isSwapMode ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-500'}`}
                        >
                            <ArrowRightLeft size={18}/> {isSwapMode ? 'إلغاء التبديل' : 'تبديل يدوي (Swapping)'}
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest"><Info size={14} className="text-blue-500"/> حالة القاعة</div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">المقاعد المشغولة</span>
                            <span className="font-black text-slate-800">{filteredStudents.length}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full" style={{width: `${Math.min(100, (filteredStudents.length/30)*100)}%`}}></div>
                        </div>
                    </div>
                </div>

                <div className="mt-auto bg-indigo-900 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl">
                     <div className="absolute top-0 right-0 p-2 opacity-10"><MonitorPlay size={100}/></div>
                     <h4 className="text-sm font-black mb-2 relative z-10">شاشة عرض المقاعد</h4>
                     <p className="text-[10px] font-bold text-indigo-200 leading-relaxed mb-6 relative z-10">اعرض التوزيع الحالي على سبورة الفصل لتحفيز الطلاب على الالتزام بأماكنهم.</p>
                     <button className="w-full py-3 bg-white text-indigo-900 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-100 transition-all relative z-10">إطلاق العرض الصفي</button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex flex-col items-center gap-12 bg-white relative">
                 {/* Virtual Blackboard */}
                 <div className="w-full max-w-2xl h-12 bg-slate-100 rounded-b-[2rem] flex items-center justify-center border-x-4 border-b-4 border-slate-200 shadow-inner">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Blackboard Direction</span>
                 </div>
                 
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8 max-w-6xl w-full pb-20">
                    {filteredStudents.length > 0 ? filteredStudents.map((s) => (
                        <div 
                            key={s.id} 
                            onClick={() => handleStudentClick(s)}
                            className={`aspect-[1.1/1] rounded-[2.5rem] border-4 transition-all cursor-pointer flex flex-col items-center justify-center p-4 relative group ${
                                selectedStudent?.id === s.id 
                                ? 'border-indigo-600 bg-indigo-50 shadow-2xl scale-110 z-10' 
                                : 'border-slate-50 bg-white hover:border-indigo-200 hover:shadow-xl'
                            }`}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black mb-3 transition-all duration-500 ${selectedStudent?.id === s.id ? 'bg-indigo-600 text-white shadow-xl rotate-12' : 'bg-slate-50 text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-400'}`}>
                                {s.name.charAt(0)}
                            </div>
                            <span className="text-[11px] font-black text-slate-700 text-center truncate w-full group-hover:text-indigo-600">{s.name.split(' ')[0]}</span>
                            <div className={`absolute -top-3 -right-3 px-2 py-1 rounded-xl font-black text-[9px] border-2 border-white shadow-lg transition-colors ${selectedStudent?.id === s.id ? 'bg-amber-400 text-white' : 'bg-slate-900 text-white'}`}>Lv{s.level || 1}</div>
                            
                            {isSwapMode && selectedStudent?.id === s.id && (
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-3 py-1 rounded-full text-[8px] font-black animate-pulse shadow-lg whitespace-nowrap">بانتظار الطرف الآخر</div>
                            )}
                        </div>
                    )) : (
                        <div className="col-span-full py-48 text-center text-slate-200 opacity-20 flex flex-col items-center gap-10">
                            <Grid3X3 size={180} strokeWidth={1}/>
                            <p className="text-4xl font-black">القاعة شاغرة حالياً</p>
                        </div>
                    )}
                 </div>
            </div>

            {/* Profile Modal Overlay */}
            {selectedStudent && !isSwapMode && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] overflow-hidden animate-zoom-in relative">
                        <div className="p-10 bg-indigo-900 text-white flex flex-col items-center gap-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><User size={250}/></div>
                            <button onClick={() => setSelectedStudent(null)} className="absolute top-8 left-8 p-2 hover:bg-white/10 rounded-full transition-colors z-20"><X size={24}/></button>
                            
                            <div className="relative">
                                <div className="w-28 h-28 bg-white/10 rounded-[2.5rem] flex items-center justify-center text-5xl font-black border-4 border-white/20 backdrop-blur-md shadow-2xl relative z-10">{selectedStudent.name.charAt(0)}</div>
                                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white w-10 h-10 rounded-2xl flex items-center justify-center font-black border-4 border-indigo-900 shadow-xl">Lv{selectedStudent.level}</div>
                            </div>
                            
                            <div className="text-center relative z-10 space-y-2">
                                <h3 className="text-2xl font-black">{selectedStudent.name}</h3>
                                <p className="text-indigo-300 font-bold uppercase tracking-widest text-xs">{selectedClass} • {selectedStudent.nationalId}</p>
                            </div>
                        </div>
                        <div className="p-10 space-y-4">
                             <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-slate-50 p-4 rounded-3xl text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">رصيد XP</p>
                                    <p className="text-xl font-black text-slate-800 flex items-center justify-center gap-1"><Zap size={16} fill="currentColor" className="text-yellow-500"/> {selectedStudent.xp || 0}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-3xl text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">النمط</p>
                                    <p className="text-xl font-black text-indigo-600">{selectedStudent.learningStyle || '---'}</p>
                                </div>
                             </div>
                             <button onClick={() => { navigate('/followup', {state:{studentId: selectedStudent.id}}); setSelectedStudent(null); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3 group">الملف الشامل للطالب <ChevronLeft size={18} className="group-hover:translate-x-[-4px] transition-transform"/></button>
                             <button onClick={() => setSelectedStudent(null)} className="w-full py-4 text-slate-400 font-black text-xs hover:text-rose-500 transition-colors uppercase tracking-widest">إغلاق المعاينة</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InteractiveSeatMap;
