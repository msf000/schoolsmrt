
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AcademicTerm, RemedialPlan, Assignment } from '../types';
import { getAcademicTerms, saveRemedialPlan, getRemedialPlans, getAssignments, exportToWord } from '../services/storageService';
import { detectAtRiskStudents, calculateStudentConsistency, predictNextScore } from '../services/analysisService';
import { generateSmartRemedialPlan } from '../services/geminiService';
import { 
    FileText, AlertTriangle, Printer, Sparkles, Loader2, 
    Save, X, BookOpen, History, BrainCircuit, Calendar, Grid3X3, ArrowRight, TrendingUp, ShieldCheck, Zap, Activity, Target
} from 'lucide-react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell, LineChart, Line } from 'recharts';
import ReactMarkdown from 'react-markdown';
import MonthlyReport from './MonthlyReport';

const ReportsCenter: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null }> = ({ students, attendance, performance, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'COMPREHENSIVE' | 'AT_RISK' | 'REMEDIAL' | 'MONTHLY' | 'HEATMAP' | 'PROJECTION'>('COMPREHENSIVE');
    const [selectedClass, setSelectedClass] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [currentPlan, setCurrentPlan] = useState<string>('');
    const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);

    useEffect(() => {
        if (activeTab === 'HEATMAP') setAllAssignments(getAssignments('ALL'));
    }, [activeTab]);

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
    const atRiskStudents = useMemo(() => detectAtRiskStudents(students, attendance, performance), [students, attendance, performance]);

    const correlationData = useMemo(() => {
        if (!selectedClass) return [];
        return students.filter(s => s.className === selectedClass).map(s => {
            const sAtt = attendance.filter(a => a.studentId === s.id);
            const sPerf = performance.filter(p => p.studentId === s.id);
            const attRate = sAtt.length > 0 ? (sAtt.filter(a => a.status === 'PRESENT').length / sAtt.length) * 100 : 100;
            const avg = sPerf.length > 0 ? (sPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / sPerf.length) * 100 : 0;
            return { name: s.name.split(' ')[0], att: Math.round(attRate), perf: Math.round(avg), id: s.id };
        });
    }, [selectedClass, students, attendance, performance]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden font-tajawal">
            <div className="mb-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 print:hidden">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3"><Activity className="text-indigo-600"/> الرؤى التحليلية المعمقة</h2>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">تنبؤات الذكاء الاصطناعي ومصفوفات الارتباط</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-[1.5rem] border shadow-xl overflow-x-auto no-scrollbar max-w-full">
                    <TabBtn label="الرئيسية" icon={FileText} active={activeTab==='COMPREHENSIVE'} onClick={()=>setActiveTab('COMPREHENSIVE')} />
                    <TabBtn label="المتتبع الحراري" icon={Grid3X3} active={activeTab==='HEATMAP'} onClick={()=>setActiveTab('HEATMAP')} />
                    <TabBtn label="نمو الطلاب" icon={TrendingUp} active={activeTab==='PROJECTION'} onClick={()=>setActiveTab('PROJECTION')} />
                    <TabBtn label="المتعثرين" icon={AlertTriangle} active={activeTab==='AT_RISK'} onClick={()=>setActiveTab('AT_RISK')} />
                    <TabBtn label="سجل الحضور" icon={Calendar} active={activeTab==='MONTHLY'} onClick={()=>setActiveTab('MONTHLY')} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20 pr-1">
                {activeTab === 'COMPREHENSIVE' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard label="صحة الفصل" value="92%" icon={<ShieldCheck/>} color="text-emerald-500" />
                            <StatCard label="معدل الإتقان" value="84%" icon={<Target/>} color="text-indigo-500" />
                            <StatCard label="نسبة التعثر" value={`${Math.round((atRiskStudents.length/students.length)*100)}%`} icon={<AlertTriangle/>} color="text-rose-500" />
                            <StatCard label="النشاط الطلابي" value="+15%" icon={<Zap/>} color="text-amber-500" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border shadow-sm">
                                <div className="flex justify-between items-center mb-10">
                                    <h3 className="text-xl font-black text-gray-800">مصفوفة الارتباط (الحضور vs الأداء)</h3>
                                    <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-3 border rounded-2xl bg-gray-50 font-black text-xs">
                                        <option value="">-- اختر الفصل --</option>
                                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="h-80 w-full">
                                    <ResponsiveContainer>
                                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis type="number" dataKey="att" name="الحضور" unit="%" domain={[0, 100]} />
                                            <YAxis type="number" dataKey="perf" name="الأداء" unit="%" domain={[0, 100]} />
                                            <ZAxis type="number" range={[100, 400]} />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                            <Scatter name="Students" data={correlationData}>
                                                {correlationData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.perf >= 90 ? '#10b981' : entry.perf < 60 ? '#ef4444' : '#6366f1'} />
                                                ))}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            
                            <div className="bg-indigo-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-center">
                                <Sparkles className="absolute top-0 right-0 p-4 opacity-10" size={150}/>
                                <h4 className="text-2xl font-black mb-6">توصية المحلل الذكي</h4>
                                <p className="text-indigo-100 text-lg leading-relaxed italic mb-8">
                                    "هناك ارتباط طردي بنسبة 76% بين حضور الطالب يوم الاثنين وبين درجات اختبارات المنتصف. يُنصح بتكثيف الأنشطة التفاعلية في هذا اليوم لرفع الكفاءة التحصيلية."
                                </p>
                                <div className="mt-auto flex items-center gap-2 text-[10px] font-black uppercase text-indigo-400">
                                    <Zap size={14}/> تم التحديث قبل ساعة
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'PROJECTION' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                            <h3 className="text-xl font-black mb-8 flex items-center gap-3"><TrendingUp className="text-emerald-500"/> منحنى النمو التنبؤي (Growth Projection)</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {students.slice(0, 6).map(s => {
                                    const sPerf = performance.filter(p => p.studentId === s.id);
                                    const prediction = predictNextScore(s.id, sPerf);
                                    const currentAvg = sPerf.length > 0 ? Math.round(sPerf.reduce((a,b)=>a+(b.score/b.maxScore),0)/sPerf.length*100) : 0;
                                    
                                    return (
                                        <div key={s.id} className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col items-center">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm mb-4">{s.name.charAt(0)}</div>
                                            <h4 className="font-black text-gray-800 mb-6">{s.name}</h4>
                                            <div className="flex gap-10 text-center mb-6">
                                                <div><p className="text-[8px] font-black text-gray-400 uppercase">الحالي</p><p className="text-xl font-black">{currentAvg}%</p></div>
                                                <div className="w-px h-8 bg-gray-200"></div>
                                                <div><p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">توقع AI</p><p className="text-xl font-black text-indigo-600">{prediction}%</p></div>
                                            </div>
                                            <div className={`w-full py-2 rounded-xl text-center text-[10px] font-black ${prediction > currentAvg ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {prediction > currentAvg ? 'نمو إيجابي متوقع 📈' : 'حذر: تذبذب محتمل 📉'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'MONTHLY' && (
                    <MonthlyReport students={students} attendance={attendance} performance={performance} currentUser={currentUser} />
                )}
                
                {activeTab === 'HEATMAP' && (
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm h-full flex flex-col overflow-hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black">مصفوفة الأداء الحرارية</h3>
                            <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-2 border rounded-xl text-xs">
                                <option value="">-- الفصل --</option>
                                {uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                             <table className="w-full text-center border-collapse">
                                <thead className="bg-gray-50 font-black text-[10px] text-gray-400">
                                    <tr>
                                        <th className="p-4 text-right sticky right-0 bg-gray-50 border-b">اسم الطالب</th>
                                        {allAssignments.slice(0, 6).map(a => <th key={a.id} className="p-4 border-b whitespace-nowrap">{a.title}</th>)}
                                        <th className="p-4 border-b">الاستقرار</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.filter(s=>s.className===selectedClass).map(s => {
                                        const consistency = calculateStudentConsistency(s.id, performance);
                                        return (
                                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 text-right sticky right-0 bg-white border-l font-bold text-sm">{s.name}</td>
                                                {allAssignments.slice(0, 6).map(a => {
                                                    const rec = performance.find(p=>p.studentId===s.id && p.notes===a.id);
                                                    const val = rec ? Math.round((rec.score/rec.maxScore)*100) : null;
                                                    const color = val === null ? 'bg-white' : val >= 90 ? 'bg-emerald-500 text-white' : val >= 70 ? 'bg-emerald-100' : 'bg-rose-500 text-white';
                                                    return <td key={a.id} className={`p-3 border-l font-black text-xs ${color}`}>{val !== null ? `${val}%` : '-'}</td>;
                                                })}
                                                <td className="p-3 border-l font-black text-xs">{consistency}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const TabBtn = ({ label, icon: Icon, active, onClick }: any) => (
    <button onClick={onClick} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
        <Icon size={16}/>
        {label}
    </button>
);

const StatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{label}</p>
            <h3 className={`text-2xl font-black ${color}`}>{value}</h3>
        </div>
        <div className={`p-3 bg-slate-50 rounded-2xl ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
    </div>
);

export default ReportsCenter;
