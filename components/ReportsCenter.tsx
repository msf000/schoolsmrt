import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AcademicTerm, Assignment } from '../types';
import { getAcademicTerms, getAssignments } from '../services/storageService';
import { 
    FileText, AlertTriangle, Printer, Sparkles, Loader2, 
    Calendar, Grid3X3, ArrowRight, TrendingUp, ShieldCheck, Zap, Activity, Target, Clock, BarChart3, Download, Bot
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import MonthlyReport from './MonthlyReport';
import AttendanceTrends from './AttendanceTrends';

const ReportsCenter: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null }> = ({ students, attendance, performance, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'COMPREHENSIVE' | 'HEATMAP' | 'ATT_TRENDS' | 'MONTHLY'>('COMPREHENSIVE');
    const [selectedClass, setSelectedClass] = useState('');
    const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);

    useEffect(() => {
        if (currentUser) {
            setAllAssignments(getAssignments('ALL', currentUser.id));
        }
    }, [currentUser]);

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
    
    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
    }, [uniqueClasses, selectedClass]);

    const stats = useMemo(() => {
        const filteredStudents = selectedClass ? students.filter(s => s.className === selectedClass) : students;
        const sIds = new Set(filteredStudents.map(s => s.id));
        const relPerf = performance.filter(p => sIds.has(p.studentId));
        const relAtt = attendance.filter(a => sIds.has(a.studentId));

        const avgMastery = relPerf.length > 0 ? (relPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / relPerf.length) * 100 : 0;
        const attRate = relAtt.length > 0 ? (relAtt.filter(a => a.status === 'PRESENT').length / relAtt.length) * 100 : 0;

        return {
            avgMastery: Math.round(avgMastery),
            attRate: Math.round(attRate),
            atRisk: filteredStudents.filter(s => {
                const sP = relPerf.filter(p => p.studentId === s.id);
                return sP.length > 0 && (sP.reduce((a, b) => a + (b.score / b.maxScore), 0) / sP.length) < 0.6;
            }).length
        };
    }, [students, selectedClass, performance, attendance]);

    return (
        <div className="space-y-6 page-enter font-tajawal pb-10">
            {/* Header Control Panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-brand-500 text-white rounded-xl shadow-sm"><BarChart3 size={24}/></div>
                    <h2 className="text-xl font-bold text-slate-900">مركز التحليلات</h2>
                </div>

                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <TabBtn label="نظرة عامة" active={activeTab==='COMPREHENSIVE'} onClick={()=>setActiveTab('COMPREHENSIVE')} />
                    <TabBtn label="الإتقان" active={activeTab==='HEATMAP'} onClick={()=>setActiveTab('HEATMAP')} />
                    <TabBtn label="الحضور" active={activeTab==='ATT_TRENDS'} onClick={()=>setActiveTab('ATT_TRENDS')} />
                    <TabBtn label="السجلات" active={activeTab==='MONTHLY'} onClick={()=>setActiveTab('MONTHLY')} />
                </div>

                <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-2 bg-transparent font-bold text-slate-800 border-none outline-none cursor-pointer hover:text-brand-500 transition-colors">
                    <option value="">كافة الفصول</option>
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {activeTab === 'COMPREHENSIVE' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ReportStatCard label="كفاءة التعلم" value={`${stats.avgMastery}%`} icon={<Target/>} color="blue" />
                    <ReportStatCard label="الانضباط" value={`${stats.attRate}%`} icon={<ShieldCheck/>} color="emerald" />
                    <ReportStatCard label="طلاب تحت الخطر" value={stats.atRisk} icon={<AlertTriangle/>} color="rose" />
                    
                    <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[350px]">
                        <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <TrendingUp size={16} className="text-brand-500"/> منحنى الأداء الأكاديمي
                        </h3>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={[{name: 'أسبوع 1', v: 70}, {name: 'أسبوع 2', v: 75}, {name: 'أسبوع 3', v: 82}, {name: 'أسبوع 4', v: 80}]}>
                                    <defs>
                                        <linearGradient id="colorReport" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" fontSize={10} hide />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}} />
                                    <Area type="monotone" dataKey="v" stroke="#4f46e5" fillOpacity={1} fill="url(#colorReport)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 text-white flex flex-col justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Bot size={18} className="text-indigo-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">AI Intelligence</span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-300 italic">"يظهر تحليل البيانات استقراراً في معدلات الحضور، مع فجوة بسيطة في مهارات الوحدة الأولى لدى طلاب الصف الثالث."</p>
                        </div>
                        <button onClick={() => window.print()} className="mt-6 w-full py-2.5 bg-white text-slate-900 rounded-xl text-xs font-black hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                            <Printer size={14}/> طباعة التقرير الشامل
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1">
                {activeTab === 'HEATMAP' && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center px-6">
                            <h3 className="font-bold text-slate-800 text-sm">مصفوفة الإتقان الحرارية</h3>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                             <table className="w-full text-right border-collapse text-xs">
                                <thead className="bg-slate-50 border-b font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 border-l border-slate-100 w-64 sticky right-0 bg-slate-50 z-20 shadow-sm text-slate-700">الطالب</th>
                                        {allAssignments.slice(0, 6).map(a => <th key={a.id} className="p-4 border-l border-slate-100 min-w-[100px]">{a.title}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {students.filter(s=>s.className===selectedClass).map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50 transition-colors h-12">
                                            <td className="p-4 border-l border-slate-100 sticky right-0 bg-white z-10 font-bold text-slate-700">{s.name}</td>
                                            {allAssignments.slice(0, 6).map(a => {
                                                const rec = performance.find(p=>p.studentId===s.id && p.notes===a.id);
                                                const val = rec ? Math.round((rec.score/rec.maxScore)*100) : null;
                                                const color = val === null ? 'bg-slate-50' : val >= 90 ? 'bg-emerald-500 text-white' : val >= 60 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-500 text-white';
                                                return <td key={a.id} className={`p-2 border-l border-slate-100 text-center font-bold ${color}`}>{val !== null ? `${val}%` : '-'}</td>;
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                )}

                {activeTab === 'ATT_TRENDS' && <AttendanceTrends students={students} attendance={attendance} selectedClass={selectedClass} />}
                {activeTab === 'MONTHLY' && <MonthlyReport students={students} attendance={attendance} performance={performance} currentUser={currentUser} />}
            </div>
        </div>
    );
};

const TabBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${active ? 'bg-white text-brand-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900'}`}>
        {label}
    </button>
);

const ReportStatCard = ({ label, value, icon, color }: any) => {
    const colors: any = {
        blue: 'text-blue-600',
        emerald: 'text-emerald-600',
        rose: 'text-rose-600'
    };
    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <h3 className={`text-2xl font-black ${colors[color]}`}>{value}</h3>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-slate-400">
                {React.cloneElement(icon, { size: 20 })}
            </div>
        </div>
    );
};

export default ReportsCenter;