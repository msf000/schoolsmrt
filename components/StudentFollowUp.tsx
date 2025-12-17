
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, AcademicTerm, ReportHeaderConfig, Assignment, MessageLog } from '../types';
import { getAssignments, getAcademicTerms, getReportHeaderConfig, saveAttendance, uploadFile, getMessages } from '../services/storageService';
import { generateStudentAnalysis } from '../services/geminiService';
import { 
    FileText, Printer, Search, PieChart as PieChartIcon, Users, MapPin, Phone, 
    TrendingUp, Loader2, Award, Activity, Sparkles, Plus, Calendar, Bot, 
    ArrowRight, CheckCircle, XCircle, Paperclip, Eye, Trash2, Edit, Upload, 
    ThumbsUp, ThumbsDown, Star, MessageCircle, MoreVertical, Medal, 
    BrainCircuit, Radar as RadarIcon, History, ExternalLink, Download, Mail, Smartphone
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, Cell, PieChart, Pie, Radar, RadarChart, PolarGrid, 
    PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { formatDualDate } from '../services/dateService';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface StudentFollowUpProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  currentUser?: SystemUser | null;
  onSaveAttendance?: (records: AttendanceRecord[]) => void;
}

const StudentFollowUp: React.FC<StudentFollowUpProps> = ({ students = [], performance = [], attendance = [], currentUser, onSaveAttendance }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'SUMMARY' | 'BEHAVIOR' | 'ATTENDANCE' | 'COMMUNICATION' | 'AI'>('SUMMARY');
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [yearWorkConfig, setYearWorkConfig] = useState({ hw: 10, act: 10, att: 5, exam: 20 });
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);
    const [aiReport, setAiReport] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [viewingFile, setViewingFile] = useState<string | null>(null);

    useEffect(() => {
        const loadedTerms = getAcademicTerms(currentUser?.id);
        setTerms(loadedTerms);
        const current = loadedTerms.find(t => t.isCurrent) || loadedTerms[0];
        if (current) setSelectedTermId(current.id);
        setAssignments(getAssignments('ALL', currentUser?.id, true)); 
        setHeaderConfig(getReportHeaderConfig(currentUser?.id));
        const savedConfig = localStorage.getItem('works_year_config');
        if (savedConfig) try { setYearWorkConfig(JSON.parse(savedConfig)); } catch {}

        if (location.state && (location.state as any).studentId) {
            const incomingId = (location.state as any).studentId;
            const exists = students.find(s => s.id === incomingId);
            if (exists) { setSelectedStudentId(incomingId); setSearchTerm(exists.name); }
        }
    }, [currentUser, students, location.state]);

    const student = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);
    const activeTerm = terms.find(t => t.id === selectedTermId);

    const stats = useMemo(() => {
        if (!student) return null;
        let sAtt = attendance.filter(a => a.studentId === student.id);
        let sPerf = performance.filter(p => p.studentId === student.id);
        const sMsgs = getMessages().filter(m => m.studentId === student.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (activeTerm) {
            sAtt = sAtt.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
            sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
        }

        const totalDays = sAtt.length;
        const absent = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const present = sAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const attRate = totalDays > 0 ? Math.round(((present) / totalDays) * 100) : 100;
        const gradeAvg = sPerf.length > 0 ? Math.round((sPerf.reduce((a,b) => a + (b.score/b.maxScore), 0) / sPerf.length) * 100) : 0;
        
        // Radar Data
        const radarData = [
            { subject: 'المواظبة', A: attRate, fullMark: 100 },
            { subject: 'المشاركة', A: Math.min(100, sAtt.filter(a => a.behaviorStatus === 'POSITIVE').length * 20), fullMark: 100 },
            { subject: 'الواجبات', A: Math.round((sPerf.filter(p => p.category === 'HOMEWORK').reduce((a,b)=>a+(b.score/b.maxScore),0) / Math.max(1, sPerf.filter(p=>p.category==='HOMEWORK').length)) * 100), fullMark: 100 },
            { subject: 'الاختبارات', A: Math.round((sPerf.filter(p => p.category === 'PLATFORM_EXAM').reduce((a,b)=>a+(b.score/b.maxScore),0) / Math.max(1, sPerf.filter(p=>p.category==='PLATFORM_EXAM').length)) * 100), fullMark: 100 },
            { subject: 'النشاط', A: Math.round((sPerf.filter(p => p.category === 'ACTIVITY').reduce((a,b)=>a+(b.score/b.maxScore),0) / Math.max(1, sPerf.filter(p=>p.category==='ACTIVITY').length)) * 100), fullMark: 100 },
        ];

        return { attRate, absent, gradeAvg, radarData, sAtt, sPerf, sMsgs };
    }, [student, attendance, performance, activeTerm]);

    const handleGenerateAI = async () => {
        if (!student || !stats) return;
        setIsAiLoading(true);
        try {
            const report = await generateStudentAnalysis(student, stats.sAtt as any, stats.sPerf as any);
            setAiReport(report);
        } catch (e) { alert('فشل الاتصال بـ Gemini'); } finally { setIsAiLoading(false); }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden relative">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-2xl border shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/students')} className="p-2 hover:bg-gray-100 rounded-full"><ArrowRight size={20}/></button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">الملف الشامل</h2>
                        <p className="text-xs text-gray-500">متابعة دقيقة لمستوى الطالب وتحصيل الطالب</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
                        <input className="w-full pr-10 pl-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" placeholder="ابحث عن طالب..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }} onFocus={() => setIsDropdownOpen(true)} />
                        {isDropdownOpen && (
                            <div className="absolute top-full right-0 w-full bg-white border rounded-xl shadow-2xl mt-2 max-h-60 overflow-y-auto z-50">
                                {students.filter(s => s.name.includes(searchTerm)).map(s => (
                                    <div key={s.id} onClick={() => { setSelectedStudentId(s.id); setSearchTerm(s.name); setIsDropdownOpen(false); }} className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold">{s.name.charAt(0)}</div>
                                        <div><div className="font-bold text-sm text-gray-800">{s.name}</div><div className="text-[10px] text-gray-400">{s.className}</div></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black"><Printer size={18}/> طباعة</button>
                </div>
            </div>

            {student && stats ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header Profile Card */}
                    <div className="bg-white rounded-3xl p-6 border shadow-sm mb-6 relative overflow-hidden shrink-0 print:hidden">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 relative z-10">
                            <div className="flex items-center gap-5">
                                <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-indigo-100 transform rotate-3">
                                    {student.name.charAt(0)}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-gray-800">{student.name}</h1>
                                    <div className="flex items-center gap-3 mt-1 text-gray-500 text-sm">
                                        <span className="bg-gray-100 px-3 py-1 rounded-full font-bold text-[10px]">{student.className}</span>
                                        <span className="bg-gray-100 px-3 py-1 rounded-full font-bold text-[10px]">{student.nationalId}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-8 text-center border-r pr-8 mr-8 border-gray-100">
                                <div><div className="text-2xl font-black text-indigo-600">{stats.attRate}%</div><div className="text-[10px] font-bold text-gray-400">المواظبة</div></div>
                                <div><div className="text-2xl font-black text-teal-600">{stats.gradeAvg}%</div><div className="text-[10px] font-bold text-gray-400">التحصيل</div></div>
                                <div><div className="text-2xl font-black text-yellow-500">{stats.sAtt.filter(l=>l.behaviorStatus==='POSITIVE').length}</div><div className="text-[10px] font-bold text-gray-400">الأوسمة</div></div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex bg-white rounded-2xl border p-1 shadow-sm mb-6 shrink-0 overflow-x-auto print:hidden">
                        {[
                            { id: 'SUMMARY', label: 'الملخص الذكي', icon: RadarIcon },
                            { id: 'BEHAVIOR', label: 'سجل السلوك', icon: Star },
                            { id: 'ATTENDANCE', label: 'سجل الحضور', icon: Calendar },
                            { id: 'COMMUNICATION', label: 'التواصل', icon: MessageCircle },
                            { id: 'AI', label: 'تحليل Gemini AI', icon: Bot },
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all min-w-[120px] ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}>
                                <tab.icon size={18}/> <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                        {activeTab === 'SUMMARY' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                                <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col items-center">
                                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 self-start"><RadarIcon size={18} className="text-indigo-600"/> رادار المهارات</h3>
                                    <div className="h-72 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart data={stats.radarData}>
                                                <PolarGrid />
                                                <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontStyle: 'bold'}} />
                                                <Radar name="الأداء" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.5} />
                                                <Tooltip />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp size={18} className="text-teal-600"/> تحليل نقاط القوة</h3>
                                    <div className="space-y-4">
                                        {stats.radarData.map(d => (
                                            <div key={d.subject} className="space-y-1">
                                                <div className="flex justify-between text-xs font-bold">
                                                    <span className="text-gray-600">{d.subject}</span>
                                                    <span className="text-indigo-600">{d.A}%</span>
                                                </div>
                                                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-indigo-500 h-full transition-all duration-1000" style={{width: `${d.A}%`}}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'BEHAVIOR' && (
                            <div className="space-y-4 animate-fade-in">
                                {stats.sAtt.filter(a => a.behaviorStatus !== 'NEUTRAL').map(log => (
                                    <div key={log.id} className="bg-white p-5 rounded-2xl border shadow-sm flex justify-between items-center group hover:border-indigo-100">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${log.behaviorStatus === 'POSITIVE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                {log.behaviorStatus === 'POSITIVE' ? <ThumbsUp size={20}/> : <ThumbsDown size={20}/>}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-800">{log.behaviorNote || (log.behaviorStatus==='POSITIVE' ? 'تميز سلوكي' : 'ملاحظة سلوكية')}</div>
                                                <div className="text-[10px] text-gray-400 mt-1">{formatDualDate(log.date)}</div>
                                            </div>
                                        </div>
                                        <div className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{log.subject || 'عام'}</div>
                                    </div>
                                ))}
                                {stats.sAtt.filter(a => a.behaviorStatus !== 'NEUTRAL').length === 0 && <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">لا توجد ملاحظات سلوكية مرصودة حالياً</div>}
                            </div>
                        )}

                        {activeTab === 'COMMUNICATION' && (
                            <div className="space-y-4 animate-fade-in">
                                {stats.sMsgs.map(msg => (
                                    <div key={msg.id} className="bg-white p-6 rounded-3xl border shadow-sm relative overflow-hidden border-r-8 border-r-teal-500">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl"><Mail size={18}/></div>
                                                <div>
                                                    <div className="font-bold text-sm text-gray-800">رسالة إلى ولي الأمر</div>
                                                    <div className="text-[10px] text-gray-400">{formatDualDate(msg.date)}</div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">تم الإرسال</span>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 font-medium">{msg.content}</p>
                                    </div>
                                ))}
                                {stats.sMsgs.length === 0 && <div className="text-center py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">لا توجد مراسلات سابقة مع هذا الطالب</div>}
                            </div>
                        )}

                        {activeTab === 'AI' && (
                            <div className="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in min-h-[400px] flex flex-col">
                                <div className="flex justify-between items-center mb-8 border-b pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-purple-100 rounded-2xl text-purple-600"><Bot size={40}/></div>
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">تحليل الشخصية والأداء (Gemini AI)</h3>
                                            <p className="text-xs text-gray-500 mt-1">ذكاء اصطناعي يربط بين نقاط الحضور والدرجات والسلوك لتقديم رؤية تربوية دقيقة.</p>
                                        </div>
                                    </div>
                                    <button onClick={handleGenerateAI} disabled={isAiLoading} className="bg-purple-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2">
                                        {isAiLoading ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                                        <span>توليد التقرير الذكي</span>
                                    </button>
                                </div>
                                {aiReport ? <div className="prose prose-indigo max-w-none text-gray-700 leading-loose bg-gray-50 p-10 rounded-3xl border shadow-inner"><ReactMarkdown>{aiReport}</ReactMarkdown></div> : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
                                        <BrainCircuit size={80} className="opacity-10 mb-6"/>
                                        <p className="max-w-xs text-center text-sm font-medium leading-relaxed">اضغط على زر "توليد التقرير" لتحليل مسيرة الطالب خلال الفصل الدراسي الحالي واقتراح خطط تحسين.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'ATTENDANCE' && (
                            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                        <tr><th className="p-4">التاريخ</th><th className="p-4">الحالة</th><th className="p-4">المبرر / العذر</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {stats.sAtt.sort((a,b)=>new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => (
                                            <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 font-mono text-xs text-gray-500">{formatDualDate(a.date)}</td>
                                                <td className="p-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                                                        a.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 
                                                        a.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>{a.status === 'PRESENT' ? 'حاضر' : a.status === 'ABSENT' ? 'غائب' : 'تأخر'}</span>
                                                </td>
                                                <td className="p-4 text-xs text-gray-500 italic">{a.excuseNote || (a.status === 'PRESENT' ? '-' : 'لم يقدم عذر')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300 opacity-50 bg-white rounded-3xl border-2 border-dashed">
                    <Search size={80} className="mb-6"/>
                    <p className="text-2xl font-black">ابحث عن طالب لعرض ملفه المتكامل</p>
                </div>
            )}
        </div>
    );
};

export default StudentFollowUp;
