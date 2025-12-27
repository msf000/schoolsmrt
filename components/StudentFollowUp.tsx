
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, SystemUser, BehaviorIncident, FormsDetailedResult } from '../types';
import { getBehaviorIncidents, getFormsDetailedResults, updateStudent } from '../services/storageService';
import { generateStudentAnalysis, generateStudentPersona } from '../services/geminiService';
import { 
    Search, TrendingUp, Loader2, Bot, ArrowRight, Star, Radar as RadarIcon, 
    BookOpen, BrainCircuit, Zap, AlertTriangle, Trophy, Sparkles, User, Heart, Crown, LineChart as LineIcon, Printer, CheckCircle
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, AreaChart, Area } from 'recharts';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { formatDualDate } from '../services/dateService';
import ReportCard from './ReportCard';
import RemedialBridge from './RemedialBridge';

const StudentFollowUp: React.FC<{ students: Student[], performance: PerformanceRecord[], attendance: AttendanceRecord[], currentUser?: SystemUser | null }> = ({ students, performance, attendance, currentUser }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
        if (location.state && (location.state as any).studentId) return (location.state as any).studentId;
        return '';
    });

    const [activeTab, setActiveTab] = useState<'SUMMARY' | 'AI' | 'SKILLS'>('SUMMARY');
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
            { subject: 'السلوك', A: 100 + (student.behaviorPoints || 0) },
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

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            {isReportOpen && student && <ReportCard student={student} performance={performance} attendance={attendance} onClose={() => setIsReportOpen(false)} />}
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/students')} className="p-2 hover:bg-white rounded-xl transition-all"><ArrowRight/></button>
                    <h2 className="text-2xl font-black text-gray-800">الملف الموحد للطالب</h2>
                </div>
                <div className="flex gap-2">
                    <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="p-3 border rounded-2xl bg-white font-black text-sm outline-none shadow-sm min-w-[250px]">
                        <option value="">-- اختر الطالب للمتابعة --</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                    </select>
                </div>
            </div>

            {student && stats ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="bg-indigo-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl mb-8 shrink-0">
                        <div className="absolute top-0 right-0 p-8 opacity-10"><Crown size={200}/></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                            <div className="flex items-center gap-8">
                                <div className="w-32 h-32 bg-white/20 rounded-[2.5rem] flex items-center justify-center text-6xl font-black backdrop-blur-xl border border-white/20 shadow-2xl">{student.name.charAt(0)}</div>
                                <div>
                                    <h2 className="text-4xl font-black mb-4">{student.name}</h2>
                                    <div className="flex gap-4">
                                        <span className="bg-white/10 px-6 py-2 rounded-full text-xs font-black border border-white/10">{student.className}</span>
                                        <span className="bg-yellow-400 text-indigo-900 px-6 py-2 rounded-full text-xs font-black shadow-xl flex items-center gap-2"><Zap size={16} fill="currentColor"/> {student.behaviorPoints || 0} XP</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-16 text-center">
                                <div><p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">معدل الإتقان</p><p className="text-5xl font-black text-white">{stats.gradeAvg}%</p></div>
                                <div className="w-px h-16 bg-white/10"></div>
                                <div><p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-2">الانضباط</p><p className="text-5xl font-black text-emerald-400">{stats.attRate}%</p></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex bg-white rounded-2xl p-1 mb-8 shadow-sm border border-slate-100 shrink-0">
                        <button onClick={()=>setActiveTab('SUMMARY')} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${activeTab==='SUMMARY'?'bg-indigo-600 text-white shadow-lg':'text-gray-400'}`}>نظرة عامة</button>
                        <button onClick={()=>setActiveTab('SKILLS')} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${activeTab==='SKILLS'?'bg-indigo-600 text-white shadow-lg':'text-gray-400'}`}>المهارات</button>
                        <button onClick={()=>setActiveTab('AI')} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${activeTab==='AI'?'bg-indigo-600 text-white shadow-lg':'text-gray-400'}`}>تحليل AI</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                        {activeTab === 'SUMMARY' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                                <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm h-96">
                                    <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3"><RadarIcon className="text-indigo-600"/> رادار القدرات</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={stats.radarData}>
                                            <PolarGrid stroke="#f1f5f9" />
                                            <PolarAngleAxis dataKey="subject" tick={{fontSize:10, fontWeight:'bold'}} />
                                            <Radar name="الأداء" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
                                            <Tooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm overflow-y-auto">
                                    <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3"><Star className="text-yellow-500"/> آخر الملاحظات السلوكية</h3>
                                    <div className="space-y-4">
                                        {incidents.slice(0, 5).map(i => (
                                            <div key={i.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center">
                                                <div>
                                                    <p className="font-black text-slate-800 text-sm">{i.category}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold mt-1">{formatDualDate(i.date)}</p>
                                                </div>
                                                <span className={`px-4 py-1 rounded-full text-[10px] font-black ${i.points > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {i.points > 0 ? `+${i.points}` : i.points} XP
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'AI' && (
                            <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm animate-fade-in">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="text-2xl font-black text-indigo-900">التشخيص التربوي الذكي</h3>
                                    <button onClick={handleAiAnalysis} disabled={isLoading} className="bg-purple-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-purple-700 transition-all">
                                        {isLoading ? <Loader2 className="animate-spin"/> : <Bot/>} بدء التحليل (Gemini AI)
                                    </button>
                                </div>
                                {reportContent ? (
                                    <div className="prose prose-indigo max-w-none text-slate-700 leading-relaxed font-medium bg-indigo-50/50 p-10 rounded-[2.5rem] border border-indigo-100">
                                        <ReactMarkdown>{reportContent}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="py-20 text-center text-slate-300 opacity-20">
                                        <BrainCircuit size={150} className="mx-auto mb-6"/>
                                        <p className="text-3xl font-black">اضغط للتحليل</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-30 gap-8">
                    <Search size={150} strokeWidth={1}/>
                    <p className="text-4xl font-black">ابحث عن طالب لعرض السجل الموحد</p>
                </div>
            )}
        </div>
    );
};

export default StudentFollowUp;
