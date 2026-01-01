
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, SystemUser, BehaviorIncident, FormsDetailedResult } from '../types';
import { getBehaviorIncidents, getFormsDetailedResults, updateStudent, saveRemedialPlan } from '../services/storageService';
import { generateStudentAnalysis, generateSmartRemedialPlan } from '../services/geminiService';
import { 
    Search, TrendingUp, Loader2, Bot, ArrowRight, Star, Radar as RadarIcon, 
    BookOpen, BrainCircuit, Zap, AlertTriangle, Trophy, Sparkles, User, Heart, Crown, LineChart as LineIcon, Printer, CheckCircle, FileText, LayoutGrid, Activity
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, AreaChart, Area } from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { formatDualDate } from '../services/dateService';
import ReportCard from './ReportCard';

const StudentFollowUp: React.FC<{ students: Student[], performance: PerformanceRecord[], attendance: AttendanceRecord[], currentUser?: SystemUser | null }> = ({ students, performance, attendance, currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
        if (location.state && (location.state as any).studentId) return (location.state as any).studentId;
        return '';
    });

    const [activeTab, setActiveTab] = useState<'SUMMARY' | 'AI' | 'SKILLS'>('SUMMARY');
    const [reportContent, setReportContent] = useState('');
    const [remedialPlan, setRemedialPlan] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);

    const student = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);
    const incidents = useMemo(() => getBehaviorIncidents().filter(i => i.studentId === selectedStudentId), [selectedStudentId]);

    const stats = useMemo(() => {
        if (!student) return null;
        const sAtt = attendance.filter(a => a.studentId === student.id);
        const sPerf = performance.filter(p => p.studentId === student.id);

        const attRate = sAtt.length > 0 ? (sAtt.filter(a => a.status === AttendanceStatus.PRESENT).length / sAtt.length) * 100 : 100;
        const gradeAvg = sPerf.length > 0 ? (sPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / sPerf.length) * 100 : 0;

        const radarData = [
            { subject: 'الانضباط', A: attRate },
            { subject: 'الواجبات', A: 85 },
            { subject: 'الأنشطة', A: gradeAvg },
            { subject: 'السلوك', A: Math.min(100, 80 + (student.behaviorPoints || 0)) },
            { subject: 'المشاركة', A: 90 },
        ];

        return { attRate: Math.round(attRate), gradeAvg: Math.round(gradeAvg), radarData };
    }, [student, attendance, performance]);

    const handleAiAnalysis = async () => {
        if (!student) return;
        setIsLoading(true);
        const res = await generateStudentAnalysis(student, attendance, performance);
        setReportContent(res);
        setIsLoading(false);
    };

    const handleGenerateRemedialPlan = async () => {
        if (!student) return;
        setIsGeneratingPlan(true);
        try {
            const gaps = performance.filter(p => p.studentId === student.id && (p.score/p.maxScore) < 0.6);
            const res = await generateSmartRemedialPlan(student, gaps);
            setRemedialPlan(res);
            
            await saveRemedialPlan({
                id: `plan_${Date.now()}`,
                studentId: student.id,
                teacherId: currentUser?.id || '',
                subject: gaps[0]?.subject || 'عام',
                topic: 'خطة تدخل ذكية',
                content: res,
                date: new Date().toISOString()
            });
        } catch (e) {
            alert('فشل توليد الخطة العلاجية.');
        } finally {
            setIsGeneratingPlan(false);
        }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 animate-fade-in font-tajawal overflow-hidden">
            {isReportOpen && student && <ReportCard student={student} performance={performance} attendance={attendance} onClose={() => setIsReportOpen(false)} />}
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/students')} className="p-2 hover:bg-white rounded-lg transition-all text-slate-400 hover:text-blue-600"><ArrowRight size={20}/></button>
                    <h2 className="text-xl font-bold text-slate-800">الملف الموحد للطالب</h2>
                </div>
                <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="p-2 border border-slate-200 rounded-lg bg-white font-bold text-xs outline-none shadow-sm min-w-[200px]">
                    <option value="">-- اختر الطالب --</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {student && stats ? (
                <div className="flex-1 flex flex-col overflow-hidden gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 shrink-0 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-1 h-full bg-blue-600"></div>
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center text-3xl font-bold text-blue-600 border border-slate-200">{student.name.charAt(0)}</div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{student.name}</h2>
                                <p className="text-xs text-slate-400 font-bold uppercase mt-1">{student.className} • {student.nationalId}</p>
                                <div className="flex gap-2 mt-3">
                                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-100 flex items-center gap-1"><Zap size={12} fill="currentColor"/> {student.xp || 0} XP</span>
                                    <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200 uppercase tracking-wider">المستوى {student.level || 1}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-8 text-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">معدل الإتقان</p><p className="text-2xl font-black text-blue-700">{stats.gradeAvg}%</p></div>
                            <div className="w-px h-8 bg-slate-200 self-center"></div>
                            <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">نسبة الحضور</p><p className="text-2xl font-black text-emerald-600">{stats.attRate}%</p></div>
                        </div>
                    </div>

                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm shrink-0">
                        <TabBtn label="نظرة عامة" active={activeTab==='SUMMARY'} onClick={()=>setActiveTab('SUMMARY')} icon={LayoutGrid} />
                        <TabBtn label="المهارات والتحصيل" active={activeTab==='SKILLS'} onClick={()=>setActiveTab('SKILLS')} icon={TrendingUp} />
                        <TabBtn label="التحليلات الذكية" active={activeTab==='AI'} onClick={()=>setActiveTab('AI')} icon={Bot} />
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                        {activeTab === 'SUMMARY' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 flex flex-col">
                                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-sm"><RadarIcon size={18} className="text-blue-600"/> رادار الكفايات التعليمية</h3>
                                    <div className="flex-1">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart data={stats.radarData}>
                                                <PolarGrid stroke="#f1f5f9" />
                                                <PolarAngleAxis dataKey="subject" tick={{fontSize:10, fontWeight:'bold', fill: '#94a3b8'}} />
                                                <Radar name="الأداء" dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.1} strokeWidth={3} />
                                                <Tooltip />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-sm"><Activity size={18} className="text-blue-600"/> سجل السلوك الأخير</h3>
                                    <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                                        {incidents.slice(0, 5).map(i => (
                                            <div key={i.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center hover:bg-white transition-colors">
                                                <div>
                                                    <p className="font-bold text-slate-700 text-xs">{i.category}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{formatDualDate(i.date)}</p>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${i.points > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                    {i.points > 0 ? `+${i.points}` : i.points} XP
                                                </span>
                                            </div>
                                        ))}
                                        {incidents.length === 0 && <div className="text-center py-10 text-slate-300 italic text-xs">لا توجد ملاحظات سلوكية.</div>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'AI' && (
                            <div className="grid grid-cols-1 gap-6 animate-fade-in">
                                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-8">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Bot className="text-blue-600"/> التحليل التربوي المعمق</h3>
                                        <button onClick={handleAiAnalysis} disabled={isLoading} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-all">
                                            {isLoading ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} توليد التحليل التلقائي
                                        </button>
                                    </div>
                                    {reportContent ? (
                                        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed font-medium bg-slate-50 p-6 rounded-xl border border-slate-100 text-sm">
                                            <ReactMarkdown>{reportContent}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <div className="h-40 flex flex-col items-center justify-center text-slate-300 opacity-50"><Bot size={48} className="mb-2"/><p className="text-xs font-bold">بانتظار طلب التحليل من محرك Gemini</p></div>
                                    )}
                                </div>

                                <div className="bg-slate-800 p-8 rounded-xl text-white relative overflow-hidden shadow-md">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><FileText size={120}/></div>
                                    <div className="relative z-10 flex justify-between items-center mb-8">
                                        <div>
                                            <h3 className="font-bold text-lg">خطة التدخل العلاجي (AI Remedial)</h3>
                                            <p className="text-blue-300 text-[10px] font-bold uppercase tracking-widest mt-1">بناءً على فجوات التعلم المكتشفة</p>
                                        </div>
                                        <button onClick={handleGenerateRemedialPlan} disabled={isGeneratingPlan} className="bg-white text-slate-800 px-6 py-2 rounded-lg font-bold text-xs shadow-sm hover:bg-slate-100 transition-all flex items-center gap-2">
                                            {isGeneratingPlan ? <Loader2 className="animate-spin" size={14}/> : <BrainCircuit size={14} className="text-blue-600"/>} توليد الخطة
                                        </button>
                                    </div>
                                    {remedialPlan && (
                                        <div className="prose prose-invert max-w-none text-blue-50 leading-relaxed bg-white/5 p-6 rounded-xl border border-white/10 text-sm">
                                            <ReactMarkdown>{remedialPlan}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-30 gap-6 py-20">
                    <Search size={100} strokeWidth={1}/>
                    <p className="text-2xl font-bold">يرجى البحث عن طالب للبدء بالمتابعة</p>
                </div>
            )}
        </div>
    );
};

const TabBtn = ({ label, active, onClick, icon: Icon }: any) => (
    <button onClick={onClick} className={`flex-1 py-2.5 rounded-md font-bold text-[11px] transition-all flex items-center justify-center gap-2 ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
        <Icon size={14}/> {label}
    </button>
);

export default StudentFollowUp;
