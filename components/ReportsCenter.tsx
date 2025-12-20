import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AcademicTerm, LearningStyle } from '../types';
import { getAcademicTerms, getTeacherAssignments } from '../services/storageService';
import { detectAtRiskStudents, calculateClassStats } from '../services/analysisService';
import { FileText, AlertTriangle, Printer, Download, CheckCircle, TrendingUp, BarChart3, Activity, BrainCircuit, Users, PieChart as PieChartIcon, Table, CheckSquare, Search, Filter } from 'lucide-react';
import MonthlyReport from './MonthlyReport';
import AIReports from './AIReports';
import CertificatesCenter from './CertificatesCenter';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend } from 'recharts';

interface ReportsCenterProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
}

const STYLE_COLORS = {
    VISUAL: '#3b82f6',
    AUDITORY: '#10b981',
    READ_WRITE: '#f59e0b',
    KINESTHETIC: '#ef4444',
    UNKNOWN: '#94a3b8'
};

const ReportsCenter: React.FC<ReportsCenterProps> = ({ students, attendance, performance, currentUser }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'COMPREHENSIVE' | 'AT_RISK' | 'MONTHLY' | 'AI' | 'CERTIFICATES' | 'STATS' | 'VARK' | 'PERFORMANCE_LOG'>(() => {
        return (localStorage.getItem('rep_active_tab') as any) || 'COMPREHENSIVE';
    });
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('rep_selected_class') || '');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('rep_term_id') || '');
    const [perfSearch, setPerfSearch] = useState('');
    const [perfSubject, setPerfSubject] = useState('');

    useEffect(() => {
        localStorage.setItem('rep_active_tab', activeTab);
        localStorage.setItem('rep_selected_class', selectedClass);
        localStorage.setItem('rep_term_id', selectedTermId);
    }, [activeTab, selectedClass, selectedTermId]);

    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    useEffect(() => {
        const loadedTerms = getAcademicTerms(currentUser?.id);
        setTerms(loadedTerms);
        if (!selectedTermId) {
            const current = loadedTerms.find(t => t.isCurrent);
            if (current) setSelectedTermId(current.id);
        }
    }, [currentUser]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUser]);

    const filteredPerformance = useMemo(() => {
        return performance.filter(p => {
            const student = students.find(s => s.id === p.studentId);
            if (!student) return false;
            if (selectedClass && student.className !== selectedClass) return false;
            if (perfSubject && p.subject !== perfSubject) return false;
            if (perfSearch && !student.name.includes(perfSearch) && !p.title.includes(perfSearch)) return false;
            return true;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [performance, students, selectedClass, perfSubject, perfSearch]);

    const varkStats = useMemo(() => {
        if (!selectedClass) return [];
        const classStudents = students.filter(s => s.className === selectedClass);
        const stats: any = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0, UNKNOWN: 0 };
        classStudents.forEach(s => { stats[s.learningStyle || 'UNKNOWN']++; });
        return Object.entries(stats).map(([key, val]) => ({
            name: key === 'VISUAL' ? 'بصري' : key === 'AUDITORY' ? 'سمعي' : key === 'READ_WRITE' ? 'قرائي' : key === 'KINESTHETIC' ? 'حركي' : 'غير محدد',
            value: val,
            fill: (STYLE_COLORS as any)[key]
        })).filter(s => (s.value as number) > 0);
    }, [students, selectedClass]);

    const handleExportPerf = () => {
        const data = filteredPerformance.map(p => {
            const s = students.find(x => x.id === p.studentId);
            return {
                'اسم الطالب': s?.name || 'مجهول',
                'الفصل': s?.className || '-',
                'المادة': p.subject,
                'نوع التقييم': p.title,
                'الدرجة': p.score,
                'العظمى': p.maxScore,
                'التاريخ': p.date
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "سجل الدرجات");
        XLSX.writeFile(wb, `Performance_Log_${selectedClass || 'All'}.xlsx`);
    };

    const TabBtn = ({ label, active, onClick }: any) => (
        <button onClick={onClick} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>{label}</button>
    );

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-purple-600"/> مركز التقارير والتحليل</h2>
                </div>
                <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <TabBtn label="التقرير الشامل" active={activeTab==='COMPREHENSIVE'} onClick={()=>setActiveTab('COMPREHENSIVE')} />
                    <TabBtn label="سجل الدرجات العام" active={activeTab==='PERFORMANCE_LOG'} onClick={()=>setActiveTab('PERFORMANCE_LOG')} />
                    <TabBtn label="سجل الحضور الشهري" active={activeTab==='MONTHLY'} onClick={()=>setActiveTab('MONTHLY')} />
                    <TabBtn label="الأنماط VARK" active={activeTab==='VARK'} onClick={()=>setActiveTab('VARK')} />
                    <TabBtn label="المتعثرين" active={activeTab==='AT_RISK'} onClick={()=>setActiveTab('AT_RISK')} />
                    <TabBtn label="الشهادات" active={activeTab==='CERTIFICATES'} onClick={()=>setActiveTab('CERTIFICATES')} />
                    <TabBtn label="تحليل AI" active={activeTab==='AI'} onClick={()=>setActiveTab('AI')} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                {activeTab === 'COMPREHENSIVE' && (
                    <div className="space-y-6">
                        {/* Quick Access Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            <button onClick={() => setActiveTab('PERFORMANCE_LOG')} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center gap-3 hover:border-indigo-500 transition-all active:scale-95 group">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Table size={24}/></div>
                                <span className="font-black text-gray-800 text-xs text-center">جدول الدرجات</span>
                            </button>
                            <button onClick={() => setActiveTab('MONTHLY')} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center gap-3 hover:border-green-500 transition-all active:scale-95 group">
                                <div className="p-3 bg-green-50 text-green-600 rounded-2xl group-hover:bg-green-600 group-hover:text-white transition-colors"><CheckSquare size={24}/></div>
                                <span className="font-black text-gray-800 text-xs text-center">سجل الحضور</span>
                            </button>
                            <button onClick={() => navigate('/leaderboard')} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center gap-3 hover:border-yellow-500 transition-all active:scale-95 group">
                                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl group-hover:bg-yellow-600 group-hover:text-white transition-colors"><TrendingUp size={24}/></div>
                                <span className="font-black text-gray-800 text-xs text-center">لوحة الشرف</span>
                            </button>
                            <button onClick={() => setActiveTab('VARK')} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center gap-3 hover:border-purple-500 transition-all active:scale-95 group">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-colors"><BrainCircuit size={24}/></div>
                                <span className="font-black text-gray-800 text-xs text-center">تحليل الأنماط</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'PERFORMANCE_LOG' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white p-4 rounded-2xl border flex flex-wrap gap-4 items-center justify-between shadow-sm">
                            <div className="flex flex-wrap gap-3 flex-1">
                                <div className="relative flex-1 max-w-xs">
                                    <Search className="absolute right-3 top-2.5 text-gray-400" size={16}/>
                                    <input className="w-full pr-9 pl-3 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500" placeholder="بحث باسم الطالب أو التقييم..." value={perfSearch} onChange={e=>setPerfSearch(e.target.value)} />
                                </div>
                                <select className="p-2 border rounded-xl text-xs font-bold bg-gray-50 outline-none" value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
                                    <option value="">كل الفصول</option>
                                    {uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}
                                </select>
                                <select className="p-2 border rounded-xl text-xs font-bold bg-gray-50 outline-none" value={perfSubject} onChange={e=>setPerfSubject(e.target.value)}>
                                    <option value="">كل المواد</option>
                                    {Array.from(new Set(performance.map(p=>p.subject))).map(s=><option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <button onClick={handleExportPerf} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-green-700 shadow-md">
                                <Download size={16}/> تصدير Excel
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[10px] tracking-widest border-b">
                                        <tr>
                                            <th className="p-4">التاريخ</th>
                                            <th className="p-4">الطالب</th>
                                            <th className="p-4">الفصل</th>
                                            <th className="p-4">المادة</th>
                                            <th className="p-4">التقييم</th>
                                            <th className="p-4 text-center">الدرجة</th>
                                            <th className="p-4 text-center">الإتقان</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {filteredPerformance.map(p => {
                                            const s = students.find(x => x.id === p.studentId);
                                            const pct = Math.round((p.score / p.maxScore) * 100);
                                            return (
                                                <tr key={p.id} className="hover:bg-indigo-50/20 transition-colors">
                                                    <td className="p-4 text-gray-400 font-mono text-xs">{p.date}</td>
                                                    <td className="p-4 font-bold text-gray-800 cursor-pointer hover:text-indigo-600" onClick={()=>navigate('/followup', {state:{studentId:s?.id}})}>{s?.name || 'مجهول'}</td>
                                                    <td className="p-4"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-black">{s?.className || '-'}</span></td>
                                                    <td className="p-4 text-gray-500 font-medium">{p.subject}</td>
                                                    <td className="p-4 text-gray-500 italic">{p.title}</td>
                                                    <td className="p-4 text-center font-black text-gray-700">{p.score} <span className="text-[10px] text-gray-300">/ {p.maxScore}</span></td>
                                                    <td className="p-4 text-center">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${pct >= 90 ? 'bg-green-100 text-green-700' : pct >= 60 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                                            {pct}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {filteredPerformance.length === 0 && <div className="p-20 text-center text-gray-300 font-black">لا توجد سجلات درجات تطابق البحث</div>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'VARK' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-white p-4 rounded-xl border flex justify-between items-center print:hidden">
                            <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-2 border rounded-lg text-sm font-bold bg-gray-50"><option value="">-- اختر الفصل للتحليل --</option>{uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}</select>
                            <div className="flex gap-2">
                                <button onClick={handleExportPerf} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Download size={14}/> Excel</button>
                                <button onClick={()=>window.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Printer size={14}/> طباعة</button>
                            </div>
                        </div>
                        {selectedClass ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col">
                                    <h3 className="font-black text-gray-800 mb-8 flex items-center gap-2"><PieChartIcon size={20} className="text-indigo-600"/> التوزيع العام لأنماط التعلم</h3>
                                    <div className="h-80 w-full">
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={varkStats} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                                    {varkStats.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{borderRadius:'16px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                                                <Legend verticalAlign="bottom" height={36}/>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl flex flex-col justify-between relative overflow-hidden">
                                    <BrainCircuit className="absolute -bottom-10 -left-10 opacity-10" size={180}/>
                                    <div>
                                        <h3 className="text-xl font-black mb-4 flex items-center gap-2"><TrendingUp size={24}/> رؤى تعليمية</h3>
                                        <div className="space-y-4 text-indigo-100 text-sm">
                                            {varkStats.map((s: any) => (
                                                <div key={s.name} className="flex justify-between border-b border-white/10 pb-2">
                                                    <span>طلاب النمط {s.name}:</span>
                                                    <span className="font-black">{s.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="mt-8 text-xs text-indigo-200 leading-relaxed italic">
                                        "فهم أنماط التعلم يساعدك على تصميم أنشطة صفية تراعي الفروق الفردية وترفع معدلات الاستيعاب بنسبة تصل إلى 40%."
                                    </p>
                                </div>
                            </div>
                        ) : <div className="p-20 text-center text-gray-400 font-bold border-2 border-dashed rounded-[3rem]">يرجى اختيار الفصل لعرض تحليل الأنماط</div>}
                    </div>
                )}

                {activeTab === 'MONTHLY' && <MonthlyReport students={students} attendance={attendance} performance={performance} currentUser={currentUser} />}
                {activeTab === 'AI' && <AIReports students={students} attendance={attendance} performance={performance} currentUser={currentUser} />}
                {activeTab === 'CERTIFICATES' && <CertificatesCenter students={students} currentUser={currentUser} />}
            </div>
        </div>
    );
};

export default ReportsCenter;