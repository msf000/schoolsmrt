import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, AcademicTerm, TermPeriod, Assignment } from '../types';
import { getAcademicTerms, getAssignments } from '../services/storageService';
import { generateStudentAnalysis } from '../services/geminiService';
import { generateLocalStudentReport } from '../services/analysisService';
import { 
    Search, PieChart as PieChartIcon, 
    TrendingUp, Loader2, Award, Activity, Sparkles, Calendar, Bot, 
    ArrowRight, XCircle, Star, Radar as RadarIcon, LineChart as LineChartIcon,
    BookOpen, ClipboardList, ListFilter, Target, CheckCircle, BrainCircuit, Info, CalendarRange, Eye, Lightbulb, BarChart,
    FileText, ChevronLeft, User
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

const STYLE_LABELS: Record<string, { label: string, color: string, tip: string, icon: any }> = {
    'VISUAL': { label: 'بصري', color: 'bg-blue-100 text-blue-700', tip: 'هذا الطالب يتعلم بشكل أفضل من خلال الصور، الخرائط الذهنية، والألوان. قدم له شروحات مرئية.', icon: Eye },
    'AUDITORY': { label: 'سمعي', color: 'bg-green-100 text-green-700', tip: 'هذا الطالب يستوعب بالاستماع والنقاش. شجعه على تسجيل الملاحظات صوتياً والمشاركة الصفية.', icon: Bot },
    'READ_WRITE': { label: 'قرائي/كتابي', color: 'bg-orange-100 text-orange-700', tip: 'يفضل الطالب تدوين المعلومات يدوياً وقراءة الكتب. وفر له ملخصات مكتوبة.', icon: FileText },
    'KINESTHETIC': { label: 'حركي', color: 'bg-red-100 text-red-700', tip: 'يحتاج هذا الطالب للحركة والتجربة العملية لتثبيت المعلومة. أشركه في أنشطة المحاكاة.', icon: Activity },
    'UNKNOWN': { label: 'غير محدد', color: 'bg-gray-100 text-gray-400', tip: 'لم يتم تحديد نمط تعلم الطالب بعد. يرجى دعوته لأداء الاختبار في بوابته.', icon: Info }
};

const StudentFollowUp: React.FC<StudentFollowUpProps> = ({ students = [], performance = [], attendance = [], currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
        const saved = localStorage.getItem('sf_selected_student');
        if (location.state && (location.state as any).studentId) return (location.state as any).studentId;
        return saved || '';
    });

    const [activeTab, setActiveTab] = useState<FollowUpTab>(() => {
        return (localStorage.getItem('sf_active_tab') as FollowUpTab) || 'SUMMARY';
    });

    const [selectedTermId, setSelectedTermId] = useState<string>(() => {
        return localStorage.getItem('sf_term_id') || '';
    });

    const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
        return localStorage.getItem('sf_period_id') || '';
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [reportContent, setReportContent] = useState<string>('');
    const [reportType, setReportType] = useState<'AI' | 'STATS'>('STATS');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        localStorage.setItem('sf_selected_student', selectedStudentId);
        localStorage.setItem('sf_active_tab', activeTab);
        localStorage.setItem('sf_term_id', selectedTermId);
        localStorage.setItem('sf_period_id', selectedPeriodId);
    }, [selectedStudentId, activeTab, selectedTermId, selectedPeriodId]);

    useEffect(() => {
        const loadedTerms = getAcademicTerms(currentUser?.id);
        setTerms(loadedTerms);
        setAssignments(getAssignments('ALL', currentUser?.id, currentUser?.role === 'SCHOOL_MANAGER'));
        
        if (!selectedTermId) {
            const current = loadedTerms.find(t => t.isCurrent) || loadedTerms[0];
            if (current) setSelectedTermId(current.id);
        }
    }, [currentUser]);

    const student = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);
    const activeTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);
    const activePeriods = useMemo(() => activeTerm?.periods || [], [activeTerm]);
    const activePeriod = useMemo(() => activePeriods.find(p => p.id === selectedPeriodId), [activePeriods, selectedPeriodId]);

    const dateRange = useMemo(() => {
        if (activePeriod) return { start: activePeriod.startDate, end: activePeriod.endDate, label: activePeriod.name };
        if (activeTerm) return { start: activeTerm.startDate, end: activeTerm.endDate, label: activeTerm.name };
        return { start: '', end: '', label: 'جميع السجلات' };
    }, [activeTerm, activePeriod]);

    const stats = useMemo(() => {
        if (!student) return null;
        
        const sAtt = attendance.filter(a => {
            const isMine = a.studentId === student.id;
            if (!isMine) return false;
            if (dateRange.start && dateRange.end) {
                return a.date >= dateRange.start && a.date <= dateRange.end;
            }
            return true;
        });

        const sPerf = performance.filter(p => {
            const isMine = p.studentId === student.id;
            if (!isMine) return false;
            const linkedAssignment = assignments.find(a => a.id === p.notes);
            if (selectedPeriodId) {
                if (linkedAssignment) return linkedAssignment.periodId === selectedPeriodId;
                return p.date >= dateRange.start && p.date <= dateRange.end;
            }
            if (selectedTermId) {
                if (linkedAssignment) return linkedAssignment.termId === selectedTermId;
                return p.date >= dateRange.start && p.date <= dateRange.end;
            }
            return true;
        }).sort((a,b)=>a.date.localeCompare(b.date));

        const calcAvg = (items: PerformanceRecord[]) => {
            if (items.length === 0) return 0;
            const total = items.reduce((a, b) => a + (b.score / b.maxScore), 0);
            return Math.round((total / items.length) * 100);
        };

        const attRate = sAtt.length > 0 ? Math.round(((sAtt.length - sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length) / sAtt.length) * 100) : 100;
        const gradeAvg = calcAvg(sPerf);
        const positiveBehaviors = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;

        const radarData = [
            { subject: 'الانضباط', A: attRate },
            { subject: 'المشاركة', A: Math.min(100, positiveBehaviors * 25) },
            { subject: 'الواجبات', A: calcAvg(sPerf.filter(p => p.category === 'HOMEWORK')) || gradeAvg },
            { subject: 'الأنشطة', A: calcAvg(sPerf.filter(p => p.category === 'ACTIVITY')) || gradeAvg },
            { subject: 'الاختبارات', A: calcAvg(sPerf.filter(p => p.category === 'PLATFORM_EXAM')) || gradeAvg },
        ];

        return { attRate, gradeAvg, radarData, sAtt, sPerf };
    }, [student, attendance, performance, dateRange, selectedPeriodId, selectedTermId, assignments]);

    const handleGenerateReport = async (type: 'AI' | 'STATS') => {
        if (!student || !stats) return;
        setReportContent('');
        setReportType(type);
        setIsLoading(true);
        try {
            if (type === 'AI') {
                const report = await generateStudentAnalysis(student, stats.sAtt, stats.sPerf);
                setReportContent(report);
            } else {
                const report = generateLocalStudentReport(student, stats.sAtt, stats.sPerf);
                setReportContent(report);
            }
        } catch (e) { alert('فشل توليد التقرير'); } finally { setIsLoading(false); }
    };

    const studentStyle = STYLE_LABELS[student?.learningStyle || 'UNKNOWN'];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-3xl border shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/students')} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><ArrowRight size={20}/></button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">الملف التفاعلي الموحد</h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            <select className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-2 py-0.5" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="relative flex-1 md:max-w-xs">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
                    <input className="w-full pr-10 pl-4 py-2 border rounded-xl outline-none text-sm font-bold bg-gray-50 focus:bg-white transition-all shadow-inner" placeholder="بحث عن طالب..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} />
                    {isDropdownOpen && searchTerm && (
                        <div className="absolute top-full right-0 w-full bg-white border rounded-2xl shadow-2xl mt-2 max-h-60 overflow-y-auto z-50">
                            {students.filter(s => s.name.includes(searchTerm)).map(s => (
                                <div key={s.id} onClick={() => { setSelectedStudentId(s.id); setSearchTerm(''); setIsDropdownOpen(false); }} className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 flex items-center gap-3 text-sm font-bold">{s.name}</div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {student && stats ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="bg-white rounded-[2.5rem] p-6 border shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-xl">{student.name.charAt(0)}</div>
                            <div>
                                <h1 className="text-xl font-black text-gray-800">{student.name}</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${studentStyle.color}`}>
                                        <studentStyle.icon size={10}/> نمط التعلم: {studentStyle.label}
                                    </span>
                                    <span className="text-xs text-gray-400 font-bold">{student.className}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 max-w-sm hidden md:flex items-center gap-3 bg-amber-50 p-4 rounded-2xl border border-amber-100 animate-pulse-slow">
                            <Lightbulb className="text-amber-500 shrink-0" size={24}/>
                            <div>
                                <p className="text-[9px] uppercase font-black text-amber-600 tracking-widest mb-1">توصية تعليمية مخصصة</p>
                                <p className="text-[11px] text-amber-900 font-bold leading-relaxed">{studentStyle.tip}</p>
                            </div>
                        </div>

                        <div className="flex gap-8 relative z-10">
                            <div className="text-center"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">المعدل</p><p className="text-xl font-black text-indigo-600">{stats.gradeAvg}%</p></div>
                            <div className="text-center"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">الانضباط</p><p className="text-xl font-black text-green-600">{stats.attRate}%</p></div>
                        </div>
                    </div>

                    <div className="flex bg-white rounded-2xl border p-1 mb-6 shrink-0 overflow-x-auto no-scrollbar shadow-sm">
                        <TabBtn label="نظرة عامة" icon={<RadarIcon size={16}/>} active={activeTab==='SUMMARY'} onClick={()=>setActiveTab('SUMMARY')}/>
                        <TabBtn label="الواجبات" icon={<BookOpen size={16}/>} active={activeTab==='HOMEWORK'} onClick={()=>setActiveTab('HOMEWORK')}/>
                        <TabBtn label="الأنشطة" icon={<Sparkles size={16}/>} active={activeTab==='ACTIVITY'} onClick={()=>setActiveTab('ACTIVITY')}/>
                        <TabBtn label="الاختبارات" icon={<ClipboardList size={16}/>} active={activeTab==='EXAMS'} onClick={()=>setActiveTab('EXAMS')}/>
                        <TabBtn label="السلوك" icon={<Star size={16}/>} active={activeTab==='BEHAVIOR'} onClick={()=>setActiveTab('BEHAVIOR')}/>
                        <TabBtn label="التحليل" icon={<BarChart size={16}/>} active={activeTab==='AI'} onClick={()=>setActiveTab('AI')}/>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                        {activeTab === 'SUMMARY' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm h-80">
                                    <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2 text-sm"><RadarIcon size={18} className="text-indigo-600"/> تحليل المهارات</h3>
                                    <div className="h-full pb-10"><ResponsiveContainer><RadarChart data={stats.radarData}><PolarGrid/><PolarAngleAxis dataKey="subject" tick={{fontSize:10, fontWeight:'bold', fill:'#94a3b8'}}/><Radar name="الأداء" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} strokeWidth={3}/></RadarChart></ResponsiveContainer></div>
                                </div>
                                <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-between shadow-xl relative overflow-hidden">
                                    <BrainCircuit className="absolute -bottom-10 -left-10 opacity-10" size={200}/>
                                    <div>
                                        <h3 className="text-xl font-black mb-4">نبذة ذكية</h3>
                                        <p className="text-indigo-100 text-sm leading-relaxed font-medium">هذا الطالب يظهر تميزاً في {stats.radarData.reduce((a, b) => a.A > b.A ? a : b).subject}، بينما يحتاج لبعض الدعم في مهارة {stats.radarData.reduce((a, b) => a.A < b.A ? a : b).subject}.</p>
                                    </div>
                                    <button onClick={()=>setActiveTab('AI')} className="mt-8 bg-white/20 hover:bg-white/30 p-4 rounded-2xl flex items-center justify-between transition-all group">
                                        <span className="font-bold">توليد تقرير تشخيصي كامل</span>
                                        <ChevronLeft className="group-hover:-translate-x-2 transition-transform"/>
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {(['HOMEWORK', 'ACTIVITY', 'EXAMS'] as FollowUpTab[]).includes(activeTab) && (
                            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden animate-fade-in">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-sm">
                                        <thead className="bg-gray-50/50 font-black border-b text-gray-400 uppercase text-[10px] tracking-widest">
                                            <tr><th className="p-4 pr-8">المهمة / التقييم</th><th className="p-4 text-center">الدرجة</th><th className="p-4 text-center">النسبة</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {stats.sPerf.filter(p => (activeTab === 'HOMEWORK' ? p.category === 'HOMEWORK' : activeTab === 'ACTIVITY' ? p.category === 'ACTIVITY' : p.category === 'PLATFORM_EXAM')).slice().reverse().map(p => (
                                                <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                                                    <td className="p-4 pr-8 font-bold text-gray-700">{p.title}</td>
                                                    <td className="p-4 text-center font-black text-gray-800">{p.score} / {p.maxScore}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-3 py-1 rounded-full font-black text-[10px] ${p.score/p.maxScore >= 0.9 ? 'bg-green-100 text-green-700' : p.score/p.maxScore >= 0.6 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                            {Math.round(p.score/p.maxScore*100)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'AI' && (
                            <div className="bg-white p-10 rounded-[3rem] border shadow-sm animate-fade-in min-h-[450px] relative">
                                <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b pb-6 gap-4">
                                    <div className="flex items-center gap-4"><Sparkles className="text-purple-600" size={32}/><div><h3 className="text-xl font-black text-gray-800">تحليل الأداء والدعم</h3><p className="text-xs text-gray-400 font-bold uppercase">تقرير ذكي بناءً على البيانات</p></div></div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleGenerateReport('STATS')} disabled={isLoading} className="bg-gray-100 text-gray-700 px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-200 disabled:opacity-50">تحليل إحصائي</button>
                                        <button onClick={() => handleGenerateReport('AI')} disabled={isLoading} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">{isLoading ? <Loader2 className="animate-spin" size={16}/> : <Bot size={16}/>} تحليل AI</button>
                                    </div>
                                </div>
                                {reportContent ? (
                                    <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed bg-gray-50/50 p-8 rounded-[2rem] border border-indigo-50 animate-slide-up"><ReactMarkdown>{reportContent}</ReactMarkdown></div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 opacity-30 py-20"><BrainCircuit size={100} className="mb-6"/><p className="text-xl font-black">اختر نوع التقرير المطلوب لتوليد التشخيص</p></div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 font-black bg-white rounded-[3rem] border-2 border-dashed border-gray-200 gap-6"><Search size={100} className="opacity-10"/><p className="text-3xl text-center">ابحث عن طالب لعرض ملف الأداء</p></div>
            )}
        </div>
    );
};

const TabBtn = ({ label, icon, active, onClick }: any) => (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 rounded-2xl font-black text-xs transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-gray-500 hover:bg-gray-100'}`}>{icon} {label}</button>
);

export default StudentFollowUp;