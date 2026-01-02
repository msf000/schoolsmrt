
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, SystemUser, BehaviorIncident } from '../types';
import { getBehaviorIncidents, updateStudent, saveRemedialPlan } from '../services/storageService';
import { generateStudentAnalysis, generateSmartRemedialPlan } from '../services/geminiService';
import { 
    Search, TrendingUp, Loader2, Bot, ArrowRight, Star, Radar as RadarIcon, 
    BookOpen, BrainCircuit, Zap, AlertTriangle, Trophy, Sparkles, User, Heart, Crown, LineChart as LineIcon, Printer, CheckCircle, FileText, LayoutGrid, Activity, ChevronLeft, ShieldCheck, Target
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

    const [activeTab, setActiveTab] = useState<'SUMMARY' | 'AI' | 'ACADEMIC' | 'BEHAVIOR'>('SUMMARY');
    const [reportContent, setReportContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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

        const trendData = sPerf.slice(-6).map(p => ({ date: p.date, val: (p.score/p.maxScore)*100 }));

        return { attRate: Math.round(attRate), gradeAvg: Math.round(gradeAvg), radarData, trendData };
    }, [student, attendance, performance]);

    const handleAiAnalysis = async () => {
        if (!student) return;
        setIsLoading(true);
        const res = await generateStudentAnalysis(student, attendance, performance);
        setReportContent(res);
        setIsLoading(false);
    };

    return (
        <div className="space-y-6 page-enter font-tajawal">
            {isReportOpen && student && <ReportCard student={student} performance={performance} attendance={attendance} onClose={() => setIsReportOpen(false)} />}
            
            {/* SaaS Profile Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 font-bold text-xl">
                        {student ? student.name.charAt(0) : <User/>}
                    </div>
                    <div>
                        <select 
                            value={selectedStudentId} 
                            onChange={e => setSelectedStudentId(e.target.value)}
                            className="text-lg font-bold text-slate-900 bg-transparent border-none outline-none cursor-pointer hover:text-brand-500"
                        >
                            <option value="">اختر طالباً...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <p className="text-xs text-slate-500 font-medium mt-1">{student?.className || 'لم يتم تحديد الفصل'}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setIsReportOpen(true)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2">
                        <Printer size={16}/> تقرير PDF
                    </button>
                    <button onClick={handleAiAnalysis} disabled={isLoading || !student} className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 shadow-sm flex items-center gap-2">
                        {isLoading ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} تحليل Gemini
                    </button>
                </div>
            </div>

            {student && stats ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Metrics column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <SmallMetric label="التمكن" value={`${stats.gradeAvg}%`} color="blue" />
                            <SmallMetric label="الحضور" value={`${stats.attRate}%`} color="emerald" />
                            <SmallMetric label="النقاط" value={student.xp || 0} color="amber" />
                            <SmallMetric label="السلوك" value={student.behaviorPoints || 0} color="rose" />
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[350px]">
                            <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <TrendingUp size={16} className="text-brand-500"/> منحنى التقدم الأكاديمي
                            </h3>
                            <div className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.trendData}>
                                        <defs>
                                            <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" hide />
                                        <YAxis hide domain={[0, 100]} />
                                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}} />
                                        <Area type="monotone" dataKey="val" stroke="#4f46e5" fillOpacity={1} fill="url(#colorTrend)" strokeWidth={3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {reportContent && (
                            <div className="bg-brand-50/50 p-6 rounded-2xl border border-brand-100">
                                <h3 className="text-sm font-bold text-brand-700 mb-4 flex items-center gap-2"><Bot size={18}/> تقرير الذكاء الاصطناعي</h3>
                                <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
                                    <ReactMarkdown>{reportContent}</ReactMarkdown>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Behavior and Details column */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Star size={16} className="text-brand-500"/> آخر الملاحظات السلوكية</h3>
                            <div className="space-y-3">
                                {incidents.slice(0, 4).map(i => (
                                    <div key={i.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="text-xs font-bold text-slate-700">{i.category}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{formatDualDate(i.date)}</p>
                                        </div>
                                        <span className={`text-xs font-bold ${i.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {i.points > 0 ? `+${i.points}` : i.points}
                                        </span>
                                    </div>
                                ))}
                                {incidents.length === 0 && <p className="text-center py-6 text-slate-400 text-xs italic">لا توجد ملاحظات مسجلة.</p>}
                            </div>
                        </div>

                        <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                             <div className="relative z-10">
                                <h4 className="font-bold text-indigo-400 text-xs uppercase tracking-widest mb-2">رتبة الطالب</h4>
                                <h3 className="text-xl font-black mb-4">بطل صاعد (Lv {student.level || 1})</h3>
                                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                                    <div className="h-full bg-indigo-500" style={{width: '65%'}}></div>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold">متبقي 120 نقطة للوصول للمستوى القادم</p>
                             </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                    <User size={48} className="mx-auto mb-4 opacity-20"/>
                    <p className="font-bold">يرجى اختيار طالب لعرض البيانات</p>
                </div>
            )}
        </div>
    );
};

const SmallMetric = ({ label, value, color }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100'
    };
    return (
        <div className={`p-4 rounded-xl border ${colors[color]} text-center`}>
            <p className="text-[10px] font-bold opacity-60 uppercase mb-1">{label}</p>
            <p className="text-lg font-black">{value}</p>
        </div>
    );
}

export default StudentFollowUp;
