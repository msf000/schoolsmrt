
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, SystemUser, PerformanceRecord } from '../types';
import { 
    MonitorPlay, Maximize, Clock, Eye, Plus, BrainCircuit, Loader2, Save, RotateCcw, AlertCircle
} from 'lucide-react';
import { getTeacherAssignments, updateStudent } from '../services/storageService';
import { suggestSeatingPlan } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';

interface ClassroomManagerProps {
    students: Student[];
    attendance: AttendanceRecord[];
    performance?: PerformanceRecord[];
    onLaunchScreen: () => void;
    onSaveAttendance: (records: AttendanceRecord[]) => void;
    onImportAttendance: (records: AttendanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ 
    students = [], 
    onLaunchScreen, 
    currentUser,
    performance = []
}) => {
    const [activeTab, setActiveTab] = useState<'TOOLS' | 'SEATING' | 'BEHAVIOR'>('TOOLS');
    const [selectedClass, setSelectedClass] = useState('');
    const [isAiArranging, setIsAiArranging] = useState(false);
    const [aiCriterion, setAiCriterion] = useState('مزج المستويات (متفوق بجانب ضعيف)');
    const navigate = useNavigate();

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUser]);

    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
    }, [uniqueClasses, selectedClass]);

    const filteredStudents = useMemo(() => 
        students.filter(s => s.className === selectedClass).sort((a,b) => (a.seatIndex || 0) - (b.seatIndex || 0)),
    [students, selectedClass]);

    const handleAiArrange = async () => {
        if (filteredStudents.length === 0) return;
        setIsAiArranging(true);
        try {
            // إرسال الطلاب مع بيانات أدائهم لـ AI
            const studentStats = filteredStudents.map(s => {
                const sPerf = performance.filter(p => p.studentId === s.id);
                const avg = sPerf.length > 0 ? sPerf.reduce((a,b)=>a+(b.score/b.maxScore),0)/sPerf.length*100 : 0;
                return { ...s, stats: { gradeAvg: avg } };
            });

            const result = await suggestSeatingPlan(studentStats, aiCriterion);
            if (result && result.seating) {
                // تحديث ترتيب المقاعد محلياً
                result.seating.forEach((item: any) => {
                    const s = students.find(x => x.id === item.studentId);
                    if (s) updateStudent({ ...s, seatIndex: (item.row * 10) + item.col });
                });
                alert('تم اقتراح توزيع جديد بناءً على: ' + result.reasoning);
            }
        } catch (e) {
            alert('فشل توزيع المقاعد ذكياً.');
        } finally {
            setIsAiArranging(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <MonitorPlay className="text-indigo-600"/> إدارة الفصل: {selectedClass || '...'}
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 border rounded-xl bg-white font-bold text-sm outline-none">
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div className="bg-white p-1 rounded-xl border flex gap-1 shadow-sm">
                        <button onClick={() => setActiveTab('TOOLS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'TOOLS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>الأدوات</button>
                        <button onClick={() => setActiveTab('SEATING')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'SEATING' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>المقاعد</button>
                    </div>

                    <button onClick={onLaunchScreen} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-black shadow-lg">
                        <Maximize size={18}/> شاشة العرض
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
                {activeTab === 'SEATING' && (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="p-4 bg-indigo-50 border-b flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 text-white rounded-lg"><BrainCircuit size={20}/></div>
                                <div>
                                    <h4 className="font-bold text-indigo-900 text-sm">التوزيع الذكي (AI)</h4>
                                    <p className="text-[10px] text-indigo-600">رتب الفصل تربوياً بناءً على مستويات الطلاب</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <select value={aiCriterion} onChange={e=>setAiCriterion(e.target.value)} className="text-xs p-2 border rounded-lg bg-white outline-none">
                                    <option>مزج المستويات (متفوق بجانب ضعيف)</option>
                                    <option>فصل المشاغبين (بناءً على السلوك)</option>
                                    <option>ترتيب حسب الطول (قصير في الأمام)</option>
                                </select>
                                <button 
                                    onClick={handleAiArrange}
                                    disabled={isAiArranging}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
                                >
                                    {isAiArranging ? <Loader2 size={14} className="animate-spin"/> : <RotateCcw size={14}/>} 
                                    توزيع تلقائي
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                            <div className="w-full max-w-5xl mx-auto">
                                <div className="w-full h-12 bg-gray-100 border-b-4 border-gray-200 rounded-t-3xl mb-16 flex items-center justify-center text-gray-400 font-black uppercase tracking-widest text-xs">منطقة المعلم / السبورة</div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                                    {filteredStudents.map((s) => (
                                        <div key={s.id} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center p-4 group relative hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-move shadow-sm">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 text-xl font-black mb-3 shadow-inner border border-gray-100">
                                                {s.name.charAt(0)}
                                            </div>
                                            <span className="text-[10px] font-black text-center leading-tight line-clamp-2 text-gray-700">{s.name}</span>
                                            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => navigate('/followup', { state: { studentId: s.id } })} className="p-2 bg-white rounded-full shadow-lg border text-indigo-600 hover:scale-110 transition-transform"><Eye size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                    {Array.from({ length: Math.max(0, 12 - filteredStudents.length) }).map((_, i) => (
                                        <div key={i} className="aspect-square border-4 border-dotted border-gray-100 rounded-[2rem] flex items-center justify-center opacity-30">
                                            <Plus className="text-gray-300" size={32}/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === 'TOOLS' && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-6 p-10 text-center">
                        <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center"><MonitorPlay size={64} className="opacity-10"/></div>
                        <div>
                            <h3 className="text-2xl font-black text-gray-800 mb-2">أدوات العرض التفاعلية</h3>
                            <p className="text-gray-500 max-w-md mx-auto leading-relaxed">استخدم ميزة "شاشة العرض" لتفعيل السحب العشوائي، المؤقت، وتقسيم المجموعات أمام الطلاب.</p>
                        </div>
                        <button onClick={onLaunchScreen} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all">فتح شاشة الفصل الآن</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassroomManager;
