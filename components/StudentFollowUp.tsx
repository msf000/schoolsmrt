import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, AcademicTerm, TermPeriod, PerformanceCategory } from '../types';
import { getAssignments, getAcademicTerms } from '../services/storageService';
import { generateStudentAnalysis } from '../services/geminiService';
import { 
    Search, PieChart as PieChartIcon, 
    TrendingUp, Loader2, Award, Activity, Sparkles, Calendar, Bot, 
    ArrowRight, XCircle, Star, Radar as RadarIcon, LineChart as LineChartIcon,
    BookOpen, ClipboardList, ListFilter, Target, CheckCircle, BrainCircuit
} from 'lucide-react';
import { 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    Radar, RadarChart, PolarGrid, 
    PolarAngleAxis, LineChart, Line
} from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface StudentFollowUpProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  currentUser?: SystemUser | null;
  onSaveAttendance?: (records: AttendanceRecord[]) => void;
}

type FollowUpTab = 'SUMMARY' | 'HOMEWORK' | 'ACTIVITY' | 'EXAMS' | 'BEHAVIOR' | 'AI';

const StudentFollowUp: React.FC<StudentFollowUpProps> = ({ students = [], performance = [], attendance = [], currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeTab, setSelectedTab] = useState<FollowUpTab>('SUMMARY');
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [aiReport, setAiReport] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        const loadedTerms = getAcademicTerms(currentUser?.id);
        setTerms(loadedTerms);
        const current = loadedTerms.find(t => t.isCurrent) || loadedTerms[0];
        if (current) setSelectedTermId(current.id);

        if (location.state && (location.state as any).studentId) {
            const incomingId = (location.state as any).studentId;
            const exists = students.find(s => s.id === incomingId);
            if (exists) { 
                setSelectedStudentId(incomingId); 
                setSearchTerm(exists.name); 
            }
        }
    }, [currentUser, students, location.state]);

    const student = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);
    const activeTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);
    const activePeriods = useMemo(() => activeTerm?.periods || [], [activeTerm]);
    const activePeriod = useMemo(() => activePeriods.find(p => p.id === selectedPeriodId), [activePeriods, selectedPeriodId]);

    // حساب البيانات بناءً على الفترة المختارة
    const stats = useMemo(() => {
        if (!student) return null;
        
        let startDate = activeTerm?.startDate;
        let endDate = activeTerm?.endDate;

        if (activePeriod) {
            startDate = activePeriod.startDate;
            endDate = activePeriod.endDate;
        }

        const filterByDate = (list: any[]) => {
            if (!startDate || !endDate) return list;
            return list.filter(item => item.date >= startDate && item.date <= endDate);
        };

        const sAtt = filterByDate(attendance.filter(a => a.studentId === student.id));
        const sPerf = filterByDate(performance.filter(p => p.studentId === student.id)).sort((a,b)=>a.date.localeCompare(b.date));

        const getCategoryData = (cat: string) => sPerf.filter(p => p.category === cat);
        const homeworks = getCategoryData('HOMEWORK');
        const activities = getCategoryData('ACTIVITY');
        const exams = getCategoryData('PLATFORM_EXAM');

        const calcAvg = (items: PerformanceRecord[]) => {
            if (items.length === 0) return 0;
            const total = items.reduce((a, b) => a + (b.score / b.maxScore), 0);
            return Math.round((total / items.length) * 100);
        };

        const totalDays = sAtt.length;
        const absent = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const attRate = totalDays > 0 ? Math.round(((totalDays - absent) / totalDays) * 100) : 100;
        
        const gradeAvg = calcAvg(sPerf);
        const positiveBehaviors = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;

        const radarData = [
            { subject: 'المواظبة', A: attRate },
            { subject: 'المشاركة', A: Math.min(100, positiveBehaviors * 20) },
            { subject: 'الواجبات', A: calcAvg(homeworks) || gradeAvg },
            { subject: 'الأنشطة', A: calcAvg(activities) || gradeAvg },
            { subject: 'الاختبارات', A: calcAvg(exams) || gradeAvg },
        ];

        const growthData = sPerf.map(p => ({ date: p.date.slice(5), score: Math.round(p.score/p.maxScore*100) }));

        return { 
            attRate, absent, gradeAvg, radarData, growthData, sAtt, sPerf, 
            homeworks, activities, exams,
            hwAvg: calcAvg(homeworks),
            actAvg: calcAvg(activities),
            examAvg: calcAvg(exams)
        };
    }, [student, attendance, performance, activeTerm, activePeriod]);

    const handleGenerateAI = async () => {
        if (!student || !stats) return;
        setIsAiLoading(true);
        try {
            const report = await generateStudentAnalysis(student, stats.sAtt, stats.sPerf);
            setAiReport(report);
        } catch (e) { alert('فشل الاتصال بـ Gemini'); } finally { setIsAiLoading(false); }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden relative">
            
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-2xl border shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/students')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowRight size={20}/></button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">الملف الشامل للطالب</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <select 
                                className="text-[10px] font-bold bg-gray-50 border rounded px-2 py-0.5 outline-none"
                                value={selectedTermId}
                                onChange={e => { setSelectedTermId(e.target.value); setSelectedPeriodId(''); }}
                            >
                                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            {activePeriods.length > 0 && (
                                <select 
                                    className="text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100 rounded px-2 py-0.5 outline-none"
                                    value={selectedPeriodId}
                                    onChange={e => setSelectedPeriodId(e.target.value)}
                                >
                                    <option value="">كل الفترات</option>
                                    {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            )}
                        </div>
                    </div>
                </div>
                <div className="relative flex-1 md:max-w-xs">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
                    <input 
                        className="w-full pr-10 pl-4 py-2 border rounded-xl outline-none text-sm font-bold" 
                        placeholder="ابحث عن طالب..." 
                        value={searchTerm} 
                        onChange={e => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} 
                    />
                    {isDropdownOpen && searchTerm && (
                        <div className="absolute top-full right-0 w-full bg-white border rounded-xl shadow-2xl mt-2 max-h-60 overflow-y-auto z-50">
                            {students.filter(s => s.name.includes(searchTerm)).map(s => (
                                <div key={s.id} onClick={() => { setSelectedStudentId(s.id); setSearchTerm(s.name); setIsDropdownOpen(false); }} className="p-3 hover:bg-indigo-50 cursor-pointer border-b flex items-center gap-3 text-sm font-bold">{s.name}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {student && stats ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Student Info Bar */}
                    <div className="bg-white rounded-3xl p-6 border shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-lg">{student.name.charAt(0)}</div>
                            <div>
                                <h1 className="text-xl font-black text-gray-800">{student.name}</h1>
                                <p className="text-xs text-gray-400 font-bold">{student.className} • {student.gradeLevel}</p>
                            </div>
                        </div>
                        <div className="flex gap-6 relative z-10">
                            <StatMini label="المعدل العام" value={`${stats.gradeAvg}%`} color="text-indigo-600" />
                            <StatMini label="الانضباط" value={`${stats.attRate}%`} color="text-green-600" />
                            <StatMini label="الغياب" value={stats.absent} color="text-red-500" />
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex bg-white rounded-2xl border p-1 mb-6 shrink-0 overflow-x-auto no-scrollbar">
                        <TabBtn label="نظرة عامة" icon={<RadarIcon size={16}/>} active={activeTab==='SUMMARY'} onClick={()=>setSelectedTab('SUMMARY')}/>
                        <TabBtn label="الواجبات" icon={<BookOpen size={16}/>} active={activeTab==='HOMEWORK'} onClick={()=>setSelectedTab('HOMEWORK')}/>
                        <TabBtn label="الأنشطة" icon={<Sparkles size={16}/>} active={activeTab==='ACTIVITY'} onClick={()=>setSelectedTab('ACTIVITY')}/>
                        <TabBtn label="الاختبارات" icon={<ClipboardList size={16}/>} active={activeTab==='EXAMS'} onClick={()=>setSelectedTab('EXAMS')}/>
                        <TabBtn label="السلوك" icon={<Star size={16}/>} active={activeTab==='BEHAVIOR'} onClick={()=>setSelectedTab('BEHAVIOR')}/>
                        <TabBtn label="Gemini AI" icon={<Bot size={16}/>} active={activeTab==='AI'} onClick={()=>setSelectedTab('AI')}/>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                        
                        {/* Summary View */}
                        {activeTab === 'SUMMARY' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-[2rem] border shadow-sm h-80">
                                        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2 text-sm"><RadarIcon size={18} className="text-indigo-600"/> رادار المهارات لهذه الفترة</h3>
                                        <div className="h-full pb-8">
                                            <ResponsiveContainer><RadarChart data={stats.radarData}><PolarGrid/><PolarAngleAxis dataKey="subject" tick={{fontSize:10, fontWeight:'bold'}}/><Radar name="الأداء" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4}/></RadarChart></ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-[2rem] border shadow-sm h-80">
                                        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2 text-sm"><LineChartIcon size={18} className="text-teal-600"/> منحنى النمو الدراسي</h3>
                                        <div className="h-full pb-8">
                                            <ResponsiveContainer>
                                                <LineChart data={stats.growthData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                                    <XAxis dataKey="date" tick={{fontSize:10}} axisLine={false}/>
                                                    <YAxis domain={[0, 100]} hide/>
                                                    <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/>
                                                    <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={4} dot={{r:4, fill:'#10b981'}}/>
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Detailed Category Views (Homework, Activity, Exams) */}
                        {(['HOMEWORK', 'ACTIVITY', 'EXAMS'] as FollowUpTab[]).includes(activeTab) && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <MetricCard 
                                        label={`متوسط ${activeTab === 'HOMEWORK' ? 'الواجبات' : activeTab === 'ACTIVITY' ? 'الأنشطة' : 'الاختبارات'}`} 
                                        value={`${activeTab === 'HOMEWORK' ? stats.hwAvg : activeTab === 'ACTIVITY' ? stats.actAvg : stats.examAvg}%`} 
                                        icon={<Target className="text-indigo-600"/>} 
                                    />
                                    <MetricCard 
                                        label="إجمالي المهام" 
                                        value={(activeTab === 'HOMEWORK' ? stats.homeworks : activeTab === 'ACTIVITY' ? stats.activities : stats.exams).length} 
                                        icon={<Activity className="text-blue-600"/>} 
                                    />
                                    <MetricCard 
                                        label="أعلى درجة" 
                                        value={Math.max(0, ...(activeTab === 'HOMEWORK' ? stats.homeworks : activeTab === 'ACTIVITY' ? stats.activities : stats.exams).map(p=>p.score))} 
                                        icon={<Award className="text-yellow-600"/>} 
                                    />
                                </div>

                                <div className="bg-white rounded-[2rem] border shadow-sm overflow-hidden">
                                    <table className="w-full text-right text-sm">
                                        <thead className="bg-gray-50 font-bold border-b text-gray-600">
                                            <tr>
                                                <th className="p-4">التاريخ</th>
                                                <th className="p-4">المهمة / العنوان</th>
                                                <th className="p-4 text-center">الدرجة</th>
                                                <th className="p-4 text-center">النسبة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {(activeTab === 'HOMEWORK' ? stats.homeworks : activeTab === 'ACTIVITY' ? stats.activities : stats.exams).slice().reverse().map(p => (
                                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 text-gray-500 font-mono text-xs">{p.date}</td>
                                                    <td className="p-4 font-bold text-gray-700">{p.title}</td>
                                                    <td className="p-4 text-center font-black">{p.score} / {p.maxScore}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-1 rounded-lg font-bold text-xs ${p.score/p.maxScore >= 0.9 ? 'bg-green-100 text-green-700' : p.score/p.maxScore >= 0.6 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                            {Math.round(p.score/p.maxScore*100)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(activeTab === 'HOMEWORK' ? stats.homeworks : activeTab === 'ACTIVITY' ? stats.activities : stats.exams).length === 0 && (
                                                <tr><td colSpan={4} className="p-20 text-center text-gray-300 font-bold">لا توجد بيانات مسجلة في هذه الفترة</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Behavior View */}
                        {activeTab === 'BEHAVIOR' && (
                            <div className="space-y-4 animate-fade-in">
                                {stats.sAtt.filter(a => a.behaviorStatus && a.behaviorStatus !== BehaviorStatus.NEUTRAL).slice().reverse().map(a => (
                                    <div key={a.id} className={`p-4 rounded-2xl border flex items-start gap-4 ${a.behaviorStatus === BehaviorStatus.POSITIVE ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                        <div className={`p-2 rounded-full ${a.behaviorStatus === BehaviorStatus.POSITIVE ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {a.behaviorStatus === BehaviorStatus.POSITIVE ? <Star size={16} fill="currentColor"/> : <XCircle size={16}/>}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className={`font-bold text-sm ${a.behaviorStatus === BehaviorStatus.POSITIVE ? 'text-green-700' : 'text-red-700'}`}>
                                                    {a.behaviorStatus === BehaviorStatus.POSITIVE ? 'مشاركة إيجابية / سلوك متميز' : 'ملاحظة سلوكية / تنبيه'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-bold">{a.date}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 font-medium">"{a.behaviorNote || 'لا توجد تفاصيل إضافية'}"</p>
                                        </div>
                                    </div>
                                ))}
                                {stats.sAtt.filter(a => a.behaviorStatus && a.behaviorStatus !== BehaviorStatus.NEUTRAL).length === 0 && (
                                    <div className="p-20 text-center text-gray-300 font-bold bg-white rounded-3xl border">لا توجد ملاحظات سلوكية مسجلة للفترة المحددة.</div>
                                )}
                            </div>
                        )}

                        {/* AI Analysis View */}
                        {activeTab === 'AI' && (
                            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm animate-fade-in flex flex-col min-h-[400px]">
                                <div className="flex justify-between items-center mb-8 border-b pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-purple-100 rounded-2xl text-purple-600"><Bot size={32}/></div>
                                        <div><h3 className="text-xl font-black text-gray-800">التشخيص التربوي الذكي</h3><p className="text-xs text-gray-400">تحليل معزز بالذكاء الاصطناعي بناءً على أداء الفترة</p></div>
                                    </div>
                                    <button onClick={handleGenerateAI} disabled={isAiLoading} className="bg-purple-600 text-white px-8 py-3 rounded-2xl font-black shadow-xl hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                                        {isAiLoading ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>} تحديث التحليل
                                    </button>
                                </div>
                                {aiReport ? <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed bg-gray-50 p-8 rounded-3xl border"><ReactMarkdown>{aiReport}</ReactMarkdown></div> : <div className="flex-1 flex flex-col items-center justify-center text-gray-300 opacity-30">
                                    {/* Fix: BrainCircuit is now correctly imported */}
                                    <BrainCircuit size={80} className="mb-4"/><p className="text-xl font-bold">اضغط توليد للحصول على تشخيص AI شامل</p></div>}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 font-black bg-white rounded-[3rem] border-2 border-dashed gap-4"><Search size={80} className="opacity-10"/><p className="text-2xl">ابحث عن طالب لعرض ملفه الموحد</p></div>
            )}
        </div>
    );
};

const TabBtn = ({ label, icon, active, onClick }: any) => (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 rounded-2xl font-black text-xs transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-gray-500 hover:bg-gray-100'}`}>{icon} {label}</button>
);

const StatMini = ({ label, value, color }: any) => (
    <div className="text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
);

const MetricCard = ({ label, value, icon }: any) => (
    <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
        <div className="p-3 bg-gray-50 rounded-xl">{icon}</div>
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
            <p className="text-lg font-black text-gray-800">{value}</p>
        </div>
    </div>
);

export default StudentFollowUp;