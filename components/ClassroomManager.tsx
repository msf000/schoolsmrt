import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, SystemUser, PerformanceRecord, EnvironmentRecord } from '../types';
import { 
    MonitorPlay, Maximize, Clock, Eye, Plus, BrainCircuit, Loader2, Save, RotateCcw, AlertCircle, Wind, Sun, Volume2, History, LayoutGrid, Users, Shuffle
} from 'lucide-react';
import { getTeacherAssignments, updateStudent, getEnvironmentRecords } from '../services/storageService';
import { suggestSeatingPlan } from '../services/geminiService';
import { generateLocalSeatingPlan, generateVarkBalancedGroups } from '../services/analysisService';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface ClassroomManagerProps {
    students: Student[];
    attendance: AttendanceRecord[];
    performance?: PerformanceRecord[];
    onLaunchScreen: () => void;
    onNavigateToAttendance: () => void;
    onSaveAttendance: (records: AttendanceRecord[]) => void;
    onImportAttendance: (records: AttendanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ 
    students = [], 
    onLaunchScreen, 
    onNavigateToAttendance,
    currentUser,
    performance = []
}) => {
    const [activeTab, setActiveTab] = useState<'TOOLS' | 'SEATING' | 'ENVIRONMENT' | 'GROUPS'>('TOOLS');
    const [selectedClass, setSelectedClass] = useState('');
    const [isArranging, setIsArranging] = useState(false);
    const [arrangeMethod, setArrangeMethod] = useState<'AI' | 'LOCAL'>('LOCAL');
    const [aiCriterion, setAiCriterion] = useState('مزج المستويات (متفوق بجانب ضعيف)');
    const [envHistory, setEnvHistory] = useState<EnvironmentRecord[]>([]);
    
    const [groupSize, setGroupSize] = useState(4);
    const [generatedGroups, setGeneratedGroups] = useState<Student[][]>([]);

    const navigate = useNavigate();

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUser]);

    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
        if (selectedClass) {
            setEnvHistory(getEnvironmentRecords(selectedClass));
        }
    }, [uniqueClasses, selectedClass, activeTab]);

    const filteredStudents = useMemo(() => 
        students.filter(s => s.className === selectedClass).sort((a,b) => (a.seatIndex || 0) - (b.seatIndex || 0)),
    [students, selectedClass]);

    const handleGenerateGroups = () => {
        if (filteredStudents.length === 0) return;
        const groups = generateVarkBalancedGroups(filteredStudents, groupSize);
        setGeneratedGroups(groups);
        setActiveTab('GROUPS');
    };

    const handleArrange = async (method: 'AI' | 'LOCAL') => {
        if (filteredStudents.length === 0) return;
        setArrangeMethod(method);
        setIsArranging(true);
        try {
            const studentStats = filteredStudents.map(s => {
                const sPerf = performance.filter(p => p.studentId === s.id);
                const avg = sPerf.length > 0 ? sPerf.reduce((a,b)=>a+(b.score/b.maxScore),0)/sPerf.length*100 : 0;
                return { ...s, stats: { gradeAvg: avg } };
            });
            let result = method === 'AI' ? await suggestSeatingPlan(studentStats, aiCriterion) : generateLocalSeatingPlan(studentStats, aiCriterion);
            if (result && result.seating) {
                result.seating.forEach((item: any) => {
                    const s = students.find(x => x.id === item.studentId);
                    if (s) updateStudent({ ...s, seatIndex: (item.row * 10) + item.col });
                });
                alert('تم التوزيع بنجاح');
            }
        } catch (e) { alert('فشل التوزيع.'); } finally { setIsArranging(false); }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><MonitorPlay className="text-indigo-600"/> إدارة الفصل</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 border rounded-xl bg-white font-bold text-sm outline-none shadow-sm">{uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <div className="bg-white p-1 rounded-xl border flex gap-1 shadow-sm">
                        <button onClick={() => setActiveTab('TOOLS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'TOOLS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>الأدوات</button>
                        <button onClick={() => setActiveTab('SEATING')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'SEATING' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>المقاعد</button>
                        <button onClick={() => setActiveTab('GROUPS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'GROUPS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>المجموعات</button>
                        <button onClick={() => setActiveTab('ENVIRONMENT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ENVIRONMENT' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>البيئة</button>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col">
                {activeTab === 'TOOLS' && (
                    <div className="h-full flex flex-col items-center justify-center p-10 text-center gap-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                             <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 flex flex-col items-center gap-4">
                                 <div className="p-4 bg-white rounded-3xl shadow-sm text-indigo-600"><Users size={32}/></div>
                                 <h3 className="font-black text-indigo-900">تقسيم المجموعات الذكي</h3>
                                 <p className="text-xs text-indigo-600 font-bold">تقسيم المجموعات بناءً على تنوع الأنماط (VARK)</p>
                                 <div className="flex items-center gap-3">
                                     <span className="text-xs font-bold">حجم المجموعة:</span>
                                     <input type="number" value={groupSize} onChange={e=>setGroupSize(Number(e.target.value))} className="w-16 p-2 border rounded-xl text-center font-bold"/>
                                 </div>
                                 <button onClick={handleGenerateGroups} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">توليد المجموعات</button>
                             </div>
                             <div className="bg-purple-50 p-8 rounded-[2.5rem] border border-purple-100 flex flex-col items-center gap-4">
                                 <div className="p-4 bg-white rounded-3xl shadow-sm text-purple-600"><MonitorPlay size={32}/></div>
                                 <h3 className="font-black text-purple-900">شاشة العرض المباشرة</h3>
                                 <p className="text-xs text-purple-600 font-bold">تفعيل أدوات السبورة والمؤقت والسحب العشوائي</p>
                                 <button onClick={onLaunchScreen} className="w-full mt-auto py-3 bg-purple-600 text-white rounded-2xl font-black shadow-lg">فتح الشاشة الآن</button>
                             </div>
                         </div>
                    </div>
                )}

                {activeTab === 'GROUPS' && (
                    <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-8 border-b pb-4">
                            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><Users className="text-indigo-600"/> مجموعات التعلم المتوازنة (VARK)</h3>
                            <button onClick={handleGenerateGroups} className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:underline"><Shuffle size={16}/> إعادة التوزيع عشوائياً</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {generatedGroups.map((group, idx) => (
                                <div key={idx} className="bg-gray-50 border rounded-3xl p-6 shadow-sm">
                                    <h4 className="font-black text-indigo-700 mb-4 pb-2 border-b">المجموعة {idx+1}</h4>
                                    <div className="space-y-3">
                                        {group.map(s => (
                                            <div key={s.id} className="flex justify-between items-center">
                                                <span className="text-sm font-bold text-gray-700">{s.name}</span>
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${s.learningStyle==='VISUAL'?'bg-blue-100 text-blue-700':s.learningStyle==='AUDITORY'?'bg-green-100 text-green-700':s.learningStyle==='KINESTHETIC'?'bg-red-100 text-red-700':'bg-orange-100 text-orange-700'}`}>{s.learningStyle || '؟'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'SEATING' && (
                    <div className="h-full flex flex-col overflow-hidden">
                        <div className="p-4 bg-indigo-50 border-b flex flex-wrap justify-between items-center gap-4">
                            <h4 className="font-bold text-indigo-900 text-sm">توزيع المقاعد الذكي</h4>
                            <div className="flex gap-2">
                                <select value={aiCriterion} onChange={e=>setAiCriterion(e.target.value)} className="text-xs p-2 border rounded-lg bg-white outline-none"><option>مزج المستويات (متفوق بجانب متعثر)</option><option>ترتيب حسب المستوى (تصاعدي)</option></select>
                                <button onClick={() => handleArrange('LOCAL')} disabled={isArranging} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50">{isArranging && arrangeMethod === 'LOCAL' ? <Loader2 size={14} className="animate-spin"/> : <RotateCcw size={14}/>} توزيع إحصائي</button>
                            </div>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                            <div className="w-full max-w-5xl mx-auto">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                                    {filteredStudents.map((s) => (
                                        <div key={s.id} className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] flex flex-col items-center justify-center p-4 group relative shadow-sm">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 text-xl font-black mb-3 shadow-inner border border-gray-100">{s.name.charAt(0)}</div>
                                            <span className="text-[10px] font-black text-center leading-tight line-clamp-2 text-gray-700">{s.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassroomManager;