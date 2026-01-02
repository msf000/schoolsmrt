
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AcademicTerm, Assignment } from '../types';
import { getAcademicTerms, getAssignments } from '../services/storageService';
import { 
    FileText, AlertTriangle, Printer, Sparkles, Loader2, 
    Calendar, Grid3X3, ArrowRight, TrendingUp, ShieldCheck, Zap, Activity, Target, Clock, BarChart3, Download
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
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]);
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
        <div className="space-y-8 animate-fade-in font-tajawal pb-16">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] border shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl"><BarChart3 size={32}/></div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800">التقارير التحليلية</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Academic Insights & Analytics</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl border">
                    <TabBtn label="نظرة شاملة" icon={Activity} active={activeTab==='COMPREHENSIVE'} onClick={()=>setActiveTab('COMPREHENSIVE')} />
                    <TabBtn label="خريطة الإتقان" icon={Grid3X3} active={activeTab==='HEATMAP'} onClick={()=>setActiveTab('HEATMAP')} />
                    <TabBtn label="تحليل الحضور" icon={Clock} active={activeTab==='ATT_TRENDS'} onClick={()=>setActiveTab('ATT_TRENDS')} />
                    <TabBtn label="سجل الرصد" icon={Calendar} active={activeTab==='MONTHLY'} onClick={()=>setActiveTab('MONTHLY')} />
                </div>
            </div>

            <div className="flex-1">
                {activeTab === 'COMPREHENSIVE' && (
                    <div className="space-y-8 animate-slide-up">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <ReportStatCard label="كفاءة التعلم العامة" value={`${stats.avgMastery}%`} sub="بناءً على نواتج التعلم" icon={<Target className="text-blue-600"/>} color="blue" />
                            <ReportStatCard label="معدل الانضباط" value={`${stats.attRate}%`} sub="متوسط حضور الطلاب" icon={<ShieldCheck className="text-emerald-600"/>} color="emerald" />
                            <ReportStatCard label="طلاب بحاجة لدعم" value={stats.atRisk} sub="تحت مستوى 60%" icon={<AlertTriangle className="text-rose-600"/>} color="rose" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white p-10 rounded-[3rem] border shadow-sm h-[400px] flex flex-col">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="font-black text-slate-800 flex items-center gap-3"><TrendingUp size={20} className="text-blue-600"/> منحنى الأداء العام</h3>
                                    <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-2.5 bg-slate-50 border rounded-xl text-xs font-black outline-none focus:ring-2 focus:ring-blue-500">
                                        <option value="">كافة الفصول</option>
                                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={[{name: 'أسبوع 1', v: 70}, {name: 'أسبوع 2', v: 75}, {name: 'أسبوع 3', v: 82}, {name: 'أسبوع 4', v: 80}, {name: 'أسبوع 5', v: 88}]}>
                                            <defs>
                                                <linearGradient id="colorReport" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" fontSize={11} fontWeight="bold" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                            <YAxis hide domain={[0, 100]} />
                                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                                            <Area type="monotone" dataKey="v" stroke="#2563eb" fillOpacity={1} fill="url(#colorReport)" strokeWidth={4} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden flex flex-col justify-center shadow-2xl">
                                <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Sparkles size={200}/></div>
                                <div className="relative z-10 space-y-6">
                                    <div className="bg-white/10 w-fit p-3 rounded-2xl border border-white/10 backdrop-blur-md flex items-center gap-2">
                                        <Zap size={20} className="text-yellow-400"/>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Executive Summary</span>
                                    </div>
                                    <h4 className="text-3xl font-black leading-tight">التقرير الإداري الموجز</h4>
                                    <p className="text-indigo-100 text-lg leading-relaxed font-medium">
                                        "يظهر تحليل البيانات استقراراً في معدلات الحضور بنسبة 92%، مع تحسن ملحوظ في نواتج تعلم مادة لغتي لدى طلاب الصف الثاني. نوصي بتفعيل خطة دعم فردية للطلاب الثلاثة الأقل أداءً في التقييم الأخير."
                                    </p>
                                    <div className="pt-6 border-t border-white/10 flex gap-4">
                                        <button className="flex-1 py-3 bg-white text-slate-900 rounded-xl font-black text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                                            <Printer size={16}/> طباعة التقرير الشامل
                                        </button>
                                        <button className="p-3 bg-white/10 rounded-xl border border-white/10 text-white hover:bg-white/20 transition-all">
                                            <Download size={20}/>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'HEATMAP' && (
                    <div className="bg-white rounded-[3rem] border shadow-sm overflow-hidden flex flex-col animate-slide-up">
                        <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-slate-800 text-xl">مصفوفة الإتقان الحرارية</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Skills Mastery Matrix</p>
                            </div>
                            <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-3 border rounded-2xl font-black text-xs bg-white outline-none shadow-sm min-w-[180px]">
                                {uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="overflow-auto custom-scrollbar">
                             <table className="w-full text-right border-collapse text-xs">
                                <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                                    <tr>
                                        <th className="p-6 border-l border-slate-50 w-64 sticky right-0 bg-[#F8FAFC] z-20 shadow-sm text-slate-800">اسم الطالب</th>
                                        {allAssignments.slice(0, 8).map(a => <th key={a.id} className="p-4 border-l border-slate-50 whitespace-nowrap min-w-[120px]">{a.title}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {students.filter(s=>s.className===selectedClass).map(s => (
                                        <tr key={s.id} className="hover:bg-blue-50/10 transition-colors h-14 group">
                                            <td className="p-6 border-l border-slate-50 sticky right-0 bg-white z-10 font-bold text-slate-700 shadow-sm">{s.name}</td>
                                            {allAssignments.slice(0, 8).map(a => {
                                                const rec = performance.find(p=>p.studentId===s.id && p.notes===a.id);
                                                const val = rec ? Math.round((rec.score/rec.maxScore)*100) : null;
                                                const color = val === null ? 'bg-slate-50/50' : val >= 90 ? 'bg-emerald-500 text-white' : val >= 60 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-500 text-white';
                                                return <td key={a.id} className={`p-2 border-l border-slate-50 text-center font-black ${color} transition-transform group-hover:scale-[1.02]`}>{val !== null ? `${val}%` : '-'}</td>;
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                        <div className="p-6 bg-[#F8FAFC] border-t flex justify-between items-center px-10">
                             <div className="flex gap-4 items-center">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تدرج الأداء:</span>
                                <div className="flex gap-1">
                                    <div className="w-8 h-4 rounded bg-rose-500" title="أقل من 60%"></div>
                                    <div className="w-8 h-4 rounded bg-emerald-100" title="60-89%"></div>
                                    <div className="w-8 h-4 rounded bg-emerald-500" title="90-100%"></div>
                                </div>
                             </div>
                             <p className="text-[10px] font-black text-slate-300">ملاحظة: البيانات تعتمد على آخر 8 تقييمات مرصودة</p>
                        </div>
                    </div>
                )}

                {activeTab === 'ATT_TRENDS' && <AttendanceTrends students={students} attendance={attendance} selectedClass={selectedClass} />}
                {activeTab === 'MONTHLY' && <MonthlyReport students={students} attendance={attendance} performance={performance} currentUser={currentUser} />}
            </div>
        </div>
    );
};

const TabBtn = ({ label, icon: Icon, active, onClick }: any) => (
    <button onClick={onClick} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-blue-600'}`}>
        <Icon size={16}/> {label}
    </button>
);

const ReportStatCard = ({ label, value, sub, icon, color }: any) => {
    const colors: any = {
        blue: 'border-blue-100 bg-blue-50/30 text-blue-600',
        emerald: 'border-emerald-100 bg-emerald-50/30 text-emerald-600',
        rose: 'border-rose-100 bg-rose-50/30 text-rose-600'
    };
    return (
        <div className={`bg-white p-8 rounded-[2.5rem] border shadow-sm flex items-center justify-between group hover:scale-[1.02] transition-transform`}>
            <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <h3 className={`text-4xl font-black text-slate-800 tracking-tighter`}>{value}</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{sub}</p>
            </div>
            <div className={`p-5 rounded-3xl bg-slate-50 ${color.split(' ')[0]} group-hover:bg-white transition-colors shadow-inner`}>
                {React.cloneElement(icon, { size: 28 })}
            </div>
        </div>
    );
};

export default ReportsCenter;
