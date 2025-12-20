import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, SystemUser, PerformanceRecord, EnvironmentRecord } from '../types';
import { 
    MonitorPlay, Maximize, Clock, Eye, Plus, BrainCircuit, Loader2, Save, RotateCcw, AlertCircle, Wind, Sun, Volume2, History, LayoutGrid
} from 'lucide-react';
import { getTeacherAssignments, updateStudent, getEnvironmentRecords } from '../services/storageService';
import { suggestSeatingPlan } from '../services/geminiService';
import { generateLocalSeatingPlan } from '../services/analysisService';
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
    const [activeTab, setActiveTab] = useState<'TOOLS' | 'SEATING' | 'ENVIRONMENT'>('TOOLS');
    const [selectedClass, setSelectedClass] = useState('');
    const [isArranging, setIsArranging] = useState(false);
    const [arrangeMethod, setArrangeMethod] = useState<'AI' | 'LOCAL'>('LOCAL');
    const [aiCriterion, setAiCriterion] = useState('مزج المستويات (متفوق بجانب ضعيف)');
    const [envHistory, setEnvHistory] = useState<EnvironmentRecord[]>([]);
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

            let result;
            if (method === 'AI') {
                result = await suggestSeatingPlan(studentStats, aiCriterion);
            } else {
                result = generateLocalSeatingPlan(studentStats, aiCriterion);
            }

            if (result && result.seating) {
                result.seating.forEach((item: any) => {
                    const s = students.find(x => x.id === item.studentId);
                    if (s) updateStudent({ ...s, seatIndex: (item.row * 10) + item.col });
                });
                alert('تم التوزيع بنجاح: ' + result.reasoning);
            }
        } catch (e) {
            alert('فشل توزيع المقاعد.');
        } finally {
            setIsArranging(false);
        }
    };

    const envChartData = useMemo(() => {
        return envHistory.slice(-10).map(r => ({
            date: r.date.split('T')[0].slice(5),
            mood: r.mood === 'HAPPY' ? 5 : r.mood === 'FOCUSED' ? 4 : r.mood === 'TIRED' ? 2 : 1,
            noise: r.noiseLevel,
            lighting: r.lighting
        }));
    }, [envHistory]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <MonitorPlay className="text-indigo-600"/> إدارة الفصل: {selectedClass || '...'}
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 border rounded-xl bg-white font-bold text-sm outline-none shadow-sm">
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div className="bg-white p-1 rounded-xl border flex gap-1 shadow-sm">
                        <button onClick={() => setActiveTab('TOOLS')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'TOOLS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>الأدوات</button>
                        <button onClick={() => setActiveTab('SEATING')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'SEATING' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>المقاعد</button>
                        <button onClick={() => setActiveTab('ENVIRONMENT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ENVIRONMENT' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500'}`}>بيئة التعلم</button>
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
                                <div className="p-2 bg-indigo-600 text-white rounded-lg"><LayoutGrid size={20}/></div>
                                <div>
                                    <h4 className="font-bold text-indigo-900 text-sm">توزيع المقاعد</h4>
                                    <p className="text-[10px] text-indigo-600">رتب الفصل بناءً على مستويات الطلاب</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <select value={aiCriterion} onChange={e=>setAiCriterion(e.target.value)} className="text-xs p-2 border rounded-lg bg-white outline-none">
                                    <option>مزج المستويات (متفوق بجانب متعثر)</option>
                                    <option>ترتيب حسب المستوى (تصاعدي)</option>
                                </select>
                                <button 
                                    onClick={() => handleArrange('LOCAL')}
                                    disabled={isArranging}
                                    className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
                                >
                                    {isArranging && arrangeMethod === 'LOCAL' ? <Loader2 size={14} className="animate-spin"/> : <RotateCcw size={14}/>} 
                                    توزيع إحصائي
                                </button>
                                <button 
                                    onClick={() => handleArrange('AI')}
                                    disabled={isArranging}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50"
                                >
                                    {isArranging && arrangeMethod === 'AI' ? <Loader2 size={14} className="animate-spin"/> : <BrainCircuit size={14}/>} 
                                    توزيع AI
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
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* ... (ENVIRONMENT and TOOLS Tabs remain same) ... */}
                {activeTab === 'ENVIRONMENT' && (
                    <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar bg-slate-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <EnvStat label="متوسط الإضاءة" icon={<Sun className="text-orange-500"/>} value={envHistory.length ? Math.round(envHistory.reduce((a,b)=>a+b.lighting,0)/envHistory.length) : '-'} max={5}/>
                            <EnvStat label="مستوى الضجيج" icon={<Volume2 className="text-blue-500"/>} value={envHistory.length ? Math.round(envHistory.reduce((a,b)=>a+b.noiseLevel,0)/envHistory.length) : '-'} max={5} inverse/>
                            <EnvStat label="المزاج العام" icon={<History className="text-green-500"/>} value={envHistory.length ? envHistory[envHistory.length-1].mood : '-'} textOnly/>
                        </div>
                        
                        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm h-96">
                            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><History size={20} className="text-indigo-600"/> اتجاه بيئة الفصل</h3>
                            <div className="h-full pb-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={envChartData}>
                                        <defs>
                                            <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tick={{fontSize:12}} axisLine={false} />
                                        <YAxis domain={[0, 5]} hide />
                                        <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                        <Area type="monotone" dataKey="mood" stroke="#4f46e5" fillOpacity={1} fill="url(#colorMood)" strokeWidth={3} />
                                        <Area type="monotone" dataKey="noise" stroke="#ef4444" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                                    </AreaChart>
                                </ResponsiveContainer>
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
                        <div className="flex gap-4">
                            <button onClick={onLaunchScreen} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:scale-105 transition-all">فتح شاشة الفصل</button>
                            <button onClick={onNavigateToAttendance} className="bg-white border-2 border-indigo-100 text-indigo-600 px-10 py-4 rounded-2xl font-black text-lg shadow-sm hover:bg-indigo-50 transition-all">سجل التحضير</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const EnvStat = ({ label, icon, value, max, inverse, textOnly }: any) => (
    <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col items-center text-center">
        <div className="mb-2 p-3 bg-gray-50 rounded-full">{icon}</div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</span>
        {textOnly ? (
            <span className="text-xl font-black text-gray-800">{value === 'HAPPY' ? 'حيوية 😊' : value === 'FOCUSED' ? 'تركيز 🧐' : value === 'TIRED' ? 'إرهاق 😴' : 'هدوء 😑'}</span>
        ) : (
            <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-gray-800">{value}</span>
                <span className="text-xs text-gray-400">/ {max}</span>
            </div>
        )}
        {!textOnly && (
            <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                <div className={`h-full ${inverse ? (value > 3 ? 'bg-red-500' : 'bg-green-500') : (value > 3 ? 'bg-green-500' : 'bg-orange-500')}`} style={{width: `${(value/max)*100}%`}}></div>
            </div>
        )}
    </div>
);

export default ClassroomManager;