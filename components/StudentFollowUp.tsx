import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, AcademicTerm, TermPeriod, Assignment } from '../types';
import { getAcademicTerms, getAssignments } from '../services/storageService';
import { generateStudentAnalysis } from '../services/geminiService';
import { generateLocalStudentReport } from '../services/analysisService';
import { 
    Search, PieChart as PieChartIcon, 
    TrendingUp, Loader2, Award, Activity, Sparkles, Calendar, Bot, 
    ArrowRight, XCircle, Star, Radar as RadarIcon, LineChart as LineChartIcon,
    BookOpen, ClipboardList, ListFilter, Target, CheckCircle, BrainCircuit, Info, CalendarRange, Eye, Lightbulb, BarChart
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

const STYLE_LABELS: Record<string, { label: string, color: string, tip: string }> = {
    'VISUAL': { label: 'بصري', color: 'bg-blue-100 text-blue-700', tip: 'استخدم الصور والخرائط الذهنية معه.' },
    'AUDITORY': { label: 'سمعي', color: 'bg-green-100 text-green-700', tip: 'يفضل الشرح الصوتي والمناقشات.' },
    'READ_WRITE': { label: 'قرائي/كتابي', color: 'bg-orange-100 text-orange-700', tip: 'شجعه على تدوين الملاحظات والقراءة.' },
    'KINESTHETIC': { label: 'حركي', color: 'bg-red-100 text-red-700', tip: 'أشركه في التجارب والأنشطة البدنية.' },
    'UNKNOWN': { label: 'غير محدد', color: 'bg-gray-100 text-gray-400', tip: 'قم بإجراء اختبار الأنماط في مختبر التعلم.' }
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
            { subject: 'المشاركة', A: Math.min(100, positiveBehaviors * 25) },
            { subject: 'الواجبات', A: calcAvg(homeworks) || gradeAvg },
            { subject: 'الأنشطة', A: calcAvg(activities) || gradeAvg },
            { subject: 'الاختبارات', A: calcAvg(exams) || gradeAvg },
        ];

        const growthData = sPerf.map(p => ({ 
            date: p.date.split('-').slice(1).join('/'), 
            score: Math.round(p.score/p.maxScore*100) 
        }));

        return { 
            attRate, absent, gradeAvg, radarData, growthData, sAtt, sPerf, 
            homeworks, activities, exams,
            hwAvg: calcAvg(homeworks),
            actAvg: calcAvg(activities),
            examAvg: calcAvg(exams)
        };
    }, [student, attendance, performance, dateRange, selectedPeriodId, selectedTermId, assignments]);

    const handleGenerateReport = async (type: 'AI' | 'STATS') => {
        if (!student || !stats) return;
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
        } catch (e) { 
            alert('فشل توليد التقرير'); 
        } finally { 
            setIsLoading(false); 
        }
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
                            <select 
                                className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-2 py-0.5 outline-none cursor-pointer"
                                value={selectedTermId}
                                onChange={e => { setSelectedTermId(e.target.value); setSelectedPeriodId(''); }}
                            >
                                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            {activePeriods.length > 0 && (
                                <select 
                                    className="text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200 rounded px-2 py-0.5 outline-none cursor-pointer"
                                    value={selectedPeriodId}
                                    onChange={e => setSelectedPeriodId(e.target.value)}
                                >
                                    <option value="">كامل الفصل الدراسي</option>
                                    {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                <div className="relative flex-1 md:max-w-xs">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
                    <input 
                        className="w-full pr-10 pl-4 py-2 border rounded-xl outline-none text-sm font-bold bg-gray-50 focus:bg-white transition-all shadow-inner" 
                        placeholder="بحث عن طالب..." 
                        value={searchTerm} 
                        onChange={e => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} 
                    />
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
                    
                    <div className="mb-4 flex items-center gap-2 text-[10px] font-black text-purple-600 bg-purple-50 px-4 py-2 rounded-2xl border border-purple-100 w-fit self-center md:self-start">
                        <CalendarRange size={14}/>
                        <span>تصفية الأعمال حسب: {dateRange.label}</span>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-6 border shadow-sm mb-6 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-indigo-100">{student.name.charAt(0)}</div>
                            <div>
                                <h1 className="text-xl font-black text-gray-800">{student.name}</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${studentStyle.color}`}>
                                        نمط التعلم: {studentStyle.label}
                                    </span>
                                    <span className="text-xs text-gray-400 font-bold">{student.className}</span>
                                </div>
                            </div>
                        </div>

                        {/* Tip Box Based on Style */}
                        <div className="flex-1 max-w-sm hidden md:flex items-center gap-3 bg-amber-50 p-3 rounded-2xl border border-amber-100">
                            <Lightbulb className="text-amber-500 shrink-0" size={20}/>
                            <p className="text-[11px] text-amber-900 font-bold leading-tight">
                                <span className="block opacity-60 text-[9px] uppercase tracking-widest mb-0.5">توصية لنمط الطالب:</span>
                                {studentStyle.tip}
                            </p>
                        </div>

                        <div className="flex gap-8 relative z-10">
                            <StatMini label="معدل الفترة" value={`${stats.gradeAvg}%`} color="text-indigo-600" />
                            <StatMini label="انضباط الفترة" value={`${stats.attRate}%`} color="text-green-600" />
                            <StatMini label="الغياب" value={stats.absent} color="text-red-500" />
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
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm h-80">
                                        <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2 text-sm"><RadarIcon size={18} className="text-indigo-600"/> توزيع الأداء</h3>
                                        <div className="h-full pb-10">
                                            <ResponsiveContainer><RadarChart data={stats.radarData}><PolarGrid/><PolarAngleAxis dataKey="subject" tick={{fontSize:10, fontWeight:'bold', fill:'#94a3b8'}}/><Radar name="الأداء" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} strokeWidth={3}/></RadarChart></ResponsiveContainer>
                                        </div>
                                    </div>
                                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm h-80">
                                        <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2 text-sm"><LineChartIcon size={18} className="text-teal-600"/> نمو الدرجات</h3>
                                        <div className="h-full pb-10">
                                            <ResponsiveContainer>
                                                <LineChart data={stats.growthData}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                                    <XAxis dataKey="date" tick={{fontSize:10, fontWeight:'bold'}} axisLine={false} tickLine={false}/>
                                                    <YAxis domain={[0, 100]} hide/>
                                                    <Tooltip contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight:'bold'}}/>
                                                    <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={5} dot={{r:6, fill:'#10b981', strokeWidth:2, stroke:'#fff'}} activeDot={{r:8}}/>
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(['HOMEWORK', 'ACTIVITY', 'EXAMS'] as FollowUpTab[]).includes(activeTab) && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <MetricCard label="المعدل" value={`${activeTab === 'HOMEWORK' ? stats.hwAvg : activeTab === 'ACTIVITY' ? stats.actAvg : stats.examAvg}%`} icon={<Target className="text-indigo-600"/>} />
                                    <MetricCard label="المهام" value={(activeTab === 'HOMEWORK' ? stats.homeworks : activeTab === 'ACTIVITY' ? stats.activities : stats.exams).length} icon={<CheckCircle className="text-green-600"/>} />
                                    <MetricCard label="أعلى درجة" value={Math.max(0, ...(activeTab === 'HOMEWORK' ? stats.homeworks : activeTab === 'ACTIVITY' ? stats.activities : stats.exams).map(p=>p.score))} icon={<Award className="text-yellow-600"/>} />
                                </div>

                                <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
                                    <div className="p-5 bg-gray-50/50 border-b flex justify-between items-center px-8">
                                        <h4 className="font-black text-gray-700 text-sm">كشف الأعمال: {dateRange.label}</h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right text-sm">
                                            <thead className="bg-white font-black border-b text-gray-400 uppercase text-[10px] tracking-widest">
                                                <tr>
                                                    <th className="p-4 pr-8">اسم التكليف / المهمة</th>
                                                    <th className="p-4 text-center">الدرجة المستحقة</th>
                                                    <th className="p-4 text-center">نسبة الإتقان</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {(activeTab === 'HOMEWORK' ? stats.homeworks : activeTab === 'ACTIVITY' ? stats.activities : stats.exams).slice().reverse().map(p => (
                                                    <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors group">
                                                        <td className="p-4 pr-8 font-bold text-gray-700 group-hover:text-indigo-700">{p.title}</td>
                                                        <td className="p-4 text-center font-black text-gray-800">{p.score} / {p.maxScore}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-3 py-1 rounded-full font-black text-[10px] ${p.score/p.maxScore >= 0.9 ? 'bg-green-100 text-green-700' : p.score/p.maxScore >= 0.6 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                                {Math.round(p.score/p.maxScore*100)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(activeTab === 'HOMEWORK' ? stats.homeworks : activeTab === 'ACTIVITY' ? stats.activities : stats.exams).length === 0 && (
                                                    <tr><td colSpan={3} className="p-20 text-center text-gray-300 font-black italic">لا توجد سجلات لهذه الفترة</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'BEHAVIOR' && (
                            <div className="space-y-4 animate-fade-in">
                                {stats.sAtt.filter(a => a.behaviorStatus && a.behaviorStatus !== BehaviorStatus.NEUTRAL).slice().reverse().map(a => (
                                    <div key={a.id} className={`p-5 rounded-3xl border-2 flex items-start gap-5 transition-all hover:scale-[1.01] ${a.behaviorStatus === BehaviorStatus.POSITIVE ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                        <div className={`p-3 rounded-2xl shadow-sm ${a.behaviorStatus === BehaviorStatus.POSITIVE ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {a.behaviorStatus === BehaviorStatus.POSITIVE ? <Star size={20} fill="currentColor"/> : <XCircle size={20}/>}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-2">
                                                <span className={`font-black text-sm ${a.behaviorStatus === BehaviorStatus.POSITIVE ? 'text-green-700' : 'text-red-700'}`}>
                                                    {a.behaviorStatus === BehaviorStatus.POSITIVE ? 'نقطة تميز' : 'تنبيه سلوكي'}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-black uppercase">{a.date}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 font-bold leading-relaxed italic">"{a.behaviorNote || 'رصد آلي'}"</p>
                                        </div>
                                    </div>
                                ))}
                                {stats.sAtt.filter(a => a.behaviorStatus && a.behaviorStatus !== BehaviorStatus.NEUTRAL).length === 0 && (
                                    <div className="p-20 text-center text-gray-300 font-black bg-white rounded-[2.5rem] border shadow-sm">سجل السلوك نظيف</div>
                                )}
                            </div>
                        )}

                        {activeTab === 'AI' && (
                            <div className="bg-white p-10 rounded-[3rem] border shadow-sm animate-fade-in flex flex-col min-h-[450px] relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><BrainCircuit size={200}/></div>
                                <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b pb-8 gap-6 relative z-10">
                                    <div className="flex items-center gap-5">
                                        <div className="p-5 bg-purple-100 rounded-3xl text-purple-600 shadow-inner"><BarChart size={36}/></div>
                                        <div><h3 className="text-2xl font-black text-gray-800">تحليل الأداء والدعم</h3><p className="text-xs text-gray-400 font-bold uppercase tracking-widest">توليد تقارير تشخيصية لفترة: {dateRange.label}</p></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleGenerateReport('STATS')} disabled={isLoading} className="bg-gray-800 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-black disabled:opacity-50 flex items-center gap-2 transition-all">
                                            {isLoading && reportType==='STATS' ? <Loader2 className="animate-spin" size={20}/> : <BarChart size={20}/>} تقرير إحصائي
                                        </button>
                                        <button onClick={() => handleGenerateReport('AI')} disabled={isLoading} className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-all">
                                            {isLoading && reportType==='AI' ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>} تحليل AI
                                        </button>
                                    </div>
                                </div>
                                {reportContent ? (
                                    <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed bg-gray-50/50 p-8 rounded-[2rem] border border-indigo-50 relative z-10 font-medium">
                                        {reportType === 'STATS' && <div className="mb-4 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-[10px] w-fit font-black">تحليل إحصائي محلي</div>}
                                        <ReactMarkdown>{reportContent}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 opacity-30 relative z-10">
                                        <BrainCircuit size={100} className="mb-6"/>
                                        <p className="text-xl font-black text-center">اختر نوع التقرير المطلوب لتوليد التشخيص</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 font-black bg-white rounded-[3rem] border-2 border-dashed border-gray-200 gap-6"><Search size={100} className="opacity-10"/><p className="text-3xl text-center">ابحث عن طالب لعرض ملف أداء الفترة</p></div>
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
    <div className="bg-white p-6 rounded-[1.5rem] border shadow-sm flex items-center gap-5">
        <div className="p-4 bg-gray-50 rounded-2xl shadow-inner">{icon}</div>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{label}</p>
            <p className="text-2xl font-black text-gray-800">{value}</p>
        </div>
    </div>
);

export default StudentFollowUp;