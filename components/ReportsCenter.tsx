
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AcademicTerm, RemedialPlan, Assignment } from '../types';
import { getAcademicTerms, saveRemedialPlan, getRemedialPlans, getAssignments, exportToWord } from '../services/storageService';
import { detectAtRiskStudents, calculateStudentConsistency, predictNextScore } from '../services/analysisService';
import { generateSmartRemedialPlan } from '../services/geminiService';
import { 
    FileText, AlertTriangle, Printer, Sparkles, Loader2, 
    Save, X, BookOpen, History, BrainCircuit, Calendar, Grid3X3, ArrowRight, TrendingUp, ShieldCheck, Zap, Activity, Target, Clock
} from 'lucide-react';
// Fix: Added AreaChart and Area to the recharts import
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import ReactMarkdown from 'react-markdown';
import MonthlyReport from './MonthlyReport';
import AttendanceTrends from './AttendanceTrends';

const ReportsCenter: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null }> = ({ students, attendance, performance, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'COMPREHENSIVE' | 'AT_RISK' | 'MONTHLY' | 'HEATMAP' | 'ATT_TRENDS'>('COMPREHENSIVE');
    const [selectedClass, setSelectedClass] = useState('');
    const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);

    useEffect(() => {
        if (activeTab === 'HEATMAP') setAllAssignments(getAssignments('ALL', currentUser?.id));
    }, [activeTab, currentUser]);

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
    
    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
    }, [uniqueClasses, selectedClass]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">الرؤى والتقارير</h2>
                    <p className="text-sm text-slate-500">تحليل معمق لأداء الطلاب وحضورهم.</p>
                </div>
                <div className="flex bg-white p-1 rounded-lg border border-slate-200 overflow-x-auto no-scrollbar max-w-full">
                    <TabBtn label="نظرة شاملة" icon={FileText} active={activeTab==='COMPREHENSIVE'} onClick={()=>setActiveTab('COMPREHENSIVE')} />
                    <TabBtn label="المتتبع الحراري" icon={Grid3X3} active={activeTab==='HEATMAP'} onClick={()=>setActiveTab('HEATMAP')} />
                    <TabBtn label="أنماط الحضور" icon={Clock} active={activeTab==='ATT_TRENDS'} onClick={()=>setActiveTab('ATT_TRENDS')} />
                    <TabBtn label="المتعثرين" icon={AlertTriangle} active={activeTab==='AT_RISK'} onClick={()=>setActiveTab('AT_RISK')} />
                    <TabBtn label="كشف الحضور" icon={Calendar} active={activeTab==='MONTHLY'} onClick={()=>setActiveTab('MONTHLY')} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                {activeTab === 'COMPREHENSIVE' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard label="كفاءة التعلم" value="84%" icon={<Target size={20}/>} color="text-blue-600" bg="bg-blue-50" />
                            <StatCard label="صحة الفصل" value="92%" icon={<ShieldCheck size={20}/>} color="text-emerald-600" bg="bg-emerald-50" />
                            <StatCard label="طلاب تحت الملاحظة" value="4" icon={<AlertTriangle size={20}/>} color="text-amber-600" bg="bg-amber-50" />
                            <StatCard label="النقاط الممنوحة" value="1.2k" icon={<Zap size={20}/>} color="text-indigo-600" bg="bg-indigo-50" />
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-600"/> منحنى التقدم الأكاديمي</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[{name: 'أ', v: 70}, {name: 'ب', v: 85}, {name: 'ج', v: 80}, {name: 'د', v: 90}]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" fontSize={12} tick={{fill: '#64748b'}} />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="v" stroke="#2563eb" fill="#dbeafe" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {activeTab === 'HEATMAP' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                            <span className="font-bold text-slate-700 text-sm">مصفوفة الإتقان الحرارية</span>
                            <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-2 border rounded text-xs font-bold bg-white outline-none">
                                {uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                             <table className="w-full text-right border-collapse text-xs">
                                <thead className="bg-slate-50 border-b font-bold text-slate-500 uppercase">
                                    <tr>
                                        <th className="p-4 border-l w-48 sticky right-0 bg-slate-50 z-10">اسم الطالب</th>
                                        {allAssignments.slice(0, 8).map(a => <th key={a.id} className="p-4 border-l whitespace-nowrap">{a.title}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students.filter(s=>s.className===selectedClass).map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50 h-10">
                                            <td className="p-4 border-l sticky right-0 bg-white font-medium">{s.name}</td>
                                            {allAssignments.slice(0, 8).map(a => {
                                                const rec = performance.find(p=>p.studentId===s.id && p.notes===a.id);
                                                const val = rec ? Math.round((rec.score/rec.maxScore)*100) : null;
                                                const color = val === null ? '' : val >= 90 ? 'bg-emerald-500 text-white' : val >= 60 ? 'bg-emerald-100' : 'bg-red-500 text-white';
                                                return <td key={a.id} className={`p-2 border-l text-center font-bold ${color}`}>{val !== null ? `${val}%` : '-'}</td>;
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'MONTHLY' && <MonthlyReport students={students} attendance={attendance} performance={performance} currentUser={currentUser} />}
            </div>
        </div>
    );
};

const TabBtn = ({ label, icon: Icon, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
        <Icon size={14}/> {label}
    </button>
);

const StatCard = ({ label, value, icon, color, bg }: any) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <h3 className={`text-xl font-bold ${color}`}>{value}</h3>
        </div>
        <div className={`p-2.5 rounded-lg ${bg} ${color}`}>{icon}</div>
    </div>
);

export default ReportsCenter;
