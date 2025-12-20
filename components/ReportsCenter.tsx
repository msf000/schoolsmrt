import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AcademicTerm, ReportHeaderConfig, Assignment } from '../types';
import { getAcademicTerms, getAssignments, getReportHeaderConfig, getTeacherAssignments } from '../services/storageService';
import { detectAtRiskStudents, calculateClassStats } from '../services/analysisService';
import { FileText, AlertTriangle, Calendar, BrainCircuit, Printer, Download, CheckCircle, TrendingUp, ChevronRight, BarChart3, Activity } from 'lucide-react';
import MonthlyReport from './MonthlyReport';
import AIReports from './AIReports';
import CertificatesCenter from './CertificatesCenter';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend } from 'recharts';

interface ReportsCenterProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
}

const ReportsCenter: React.FC<ReportsCenterProps> = ({ students, attendance, performance, currentUser }) => {
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState<'COMPREHENSIVE' | 'AT_RISK' | 'MONTHLY' | 'AI' | 'CERTIFICATES' | 'STATS'>(() => {
        return (localStorage.getItem('rep_active_tab') as any) || 'COMPREHENSIVE';
    });
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('rep_selected_class') || '');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('rep_term_id') || '');

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

    const activeTerm = terms.find(t => t.id === selectedTermId);

    const classStats = useMemo(() => {
        if (!selectedClass) return null;
        const classPerf = performance.filter(p => {
            const s = students.find(std => std.id === p.studentId);
            return s?.className === selectedClass;
        });
        return calculateClassStats(classPerf);
    }, [performance, students, selectedClass]);

    const atRiskData = useMemo(() => {
        if (!selectedClass) return [];
        const classStudents = students.filter(s => s.className === selectedClass);
        return detectAtRiskStudents(classStudents, attendance, performance);
    }, [students, attendance, performance, selectedClass]);

    const comprehensiveData = useMemo(() => {
        if (!selectedClass) return [];
        return students.filter(s => s.className === selectedClass).map(student => {
            let sAtt = attendance.filter(a => a.studentId === student.id);
            if (activeTerm) sAtt = sAtt.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
            const absent = sAtt.filter(a => a.status === 'ABSENT').length;
            const attRate = sAtt.length > 0 ? Math.round(((sAtt.length - absent) / sAtt.length) * 100) : 100;
            
            let sPerf = performance.filter(p => p.studentId === student.id);
            if (activeTerm) sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
            const totalScore = sPerf.reduce((a, b) => a + b.score, 0);
            const totalMax = sPerf.reduce((a, b) => a + b.maxScore, 0);
            const gradeAvg = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

            return { ...student, stats: { attRate, absent, gradeAvg } };
        });
    }, [students, attendance, performance, selectedClass, activeTerm]);

    const handleExport = () => {
        const data = comprehensiveData.map(s => ({ 'الطالب': s.name, 'نسبة الحضور': `${s.stats.attRate}%`, 'الغياب': s.stats.absent, 'المعدل': `${s.stats.gradeAvg}%` }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "التقرير");
        XLSX.writeFile(wb, `Report_${selectedClass}.xlsx`);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-purple-600"/> مركز التقارير المتقدم</h2>
                </div>
                <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto no-scrollbar">
                    <TabBtn label="التقرير الشامل" active={activeTab==='COMPREHENSIVE'} onClick={()=>setActiveTab('COMPREHENSIVE')} />
                    <TabBtn label="التحليل الإحصائي" active={activeTab==='STATS'} onClick={()=>setActiveTab('STATS')} />
                    <TabBtn label="المتعثرين" active={activeTab==='AT_RISK'} onClick={()=>setActiveTab('AT_RISK')} />
                    <TabBtn label="الحضور الشهري" active={activeTab==='MONTHLY'} onClick={()=>setActiveTab('MONTHLY')} />
                    <TabBtn label="الشهادات" active={activeTab==='CERTIFICATES'} onClick={()=>setActiveTab('CERTIFICATES')} />
                    <TabBtn label="تحليل AI" active={activeTab==='AI'} onClick={()=>setActiveTab('AI')} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                {activeTab === 'COMPREHENSIVE' && (
                    <div className="bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden animate-fade-in">
                        <div className="p-4 bg-gray-50 border-b flex flex-wrap gap-4 justify-between items-center">
                            <div className="flex gap-2">
                                <select value={selectedTermId} onChange={e=>setSelectedTermId(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white"><option value="">-- الفصل الدراسي --</option>{terms.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
                                <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-2 border rounded-lg text-xs font-bold bg-white"><option value="">-- اختر الفصل --</option>{uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}</select>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Download size={14}/> Excel</button>
                                <button onClick={()=>window.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Printer size={14}/> طباعة</button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-50 font-bold">
                                    <tr><th className="p-4">اسم الطالب</th><th className="p-4 text-center">الحضور</th><th className="p-4 text-center">الغياب</th><th className="p-4 text-center">المعدل</th><th className="p-4 text-center">الحالة</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {comprehensiveData.map(s => (
                                        <tr key={s.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold">{s.name}</td>
                                            <td className="p-4 text-center font-mono">{s.stats.attRate}%</td>
                                            <td className="p-4 text-center">{s.stats.absent}</td>
                                            <td className="p-4 text-center font-black text-indigo-600">{s.stats.gradeAvg}%</td>
                                            <td className="p-4 text-center">{s.stats.gradeAvg < 60 ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold">متعثر</span> : <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold">جيد</span>}</td>
                                        </tr>
                                    ))}
                                    {comprehensiveData.length === 0 && <tr><td colSpan={5} className="p-20 text-center text-gray-400 font-bold">اختر الفصل لعرض البيانات</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'STATS' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex gap-2 mb-4 bg-white p-4 rounded-xl border">
                             <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-2 border rounded-lg text-sm font-bold bg-gray-50"><option value="">-- اختر الفصل للتحليل --</option>{uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}</select>
                        </div>
                        {classStats ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm">
                                    <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2"><Activity className="text-teal-600"/> منحنى توزيع الدرجات</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer>
                                            <BarChart data={[
                                                { name: 'متفوق', val: classStats.distribution.EXCELLENT, color: '#10b981' },
                                                { name: 'جيد', val: classStats.distribution.GOOD, color: '#3b82f6' },
                                                { name: 'متوسط', val: classStats.distribution.AVERAGE, color: '#f59e0b' },
                                                { name: 'متعثر', val: classStats.distribution.LOW, color: '#ef4444' }
                                            ]}>
                                                <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 'bold'}} />
                                                <YAxis hide />
                                                <Tooltip />
                                                <Bar dataKey="val" radius={[8, 8, 0, 0]}>
                                                    { [0,1,2,3].map((entry, index) => <Cell key={index} fill={['#10b981','#3b82f6','#f59e0b','#ef4444'][index]} />) }
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-6">
                                        <div className="p-4 bg-gray-50 rounded-2xl border">
                                            <p className="text-xs font-bold text-gray-400 mb-1">المتوسط الحسابي</p>
                                            <p className="text-2xl font-black text-indigo-600">{classStats.avg}%</p>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-2xl border">
                                            <p className="text-xs font-bold text-gray-400 mb-1">الانحراف المعياري</p>
                                            <p className="text-2xl font-black text-purple-600">{classStats.stdDev}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                                    <TrendingUp className="absolute -bottom-4 -left-4 opacity-10" size={150}/>
                                    <h3 className="text-xl font-black mb-6">مؤشرات الجودة الإحصائية</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between border-b border-white/10 pb-3"><span>أعلى درجة مسجلة:</span><span className="font-black">{classStats.highest}%</span></div>
                                        <div className="flex justify-between border-b border-white/10 pb-3"><span>أدنى درجة مسجلة:</span><span className="font-black">{classStats.lowest}%</span></div>
                                        {/* Fix: Added explicit type casting to number for distribution values to resolve arithmetic operation errors */}
                                        <div className="flex justify-between border-b border-white/10 pb-3"><span>نسبة الإتقان العامة:</span><span className="font-black">{Math.round(((classStats.distribution.EXCELLENT as number + classStats.distribution.GOOD as number) / ((Object.values(classStats.distribution) as number[]).reduce((a: number, b: number) => a + b, 0))) * 100)}%</span></div>
                                    </div>
                                    <p className="mt-8 text-xs text-indigo-200 leading-relaxed italic">"تظهر البيانات أن تباين الفصل {classStats.stdDev > 15 ? 'مرتفع، مما يتطلب تفريد التعليم' : 'منخفض، مما يدل على انسجام المستوى الأكاديمي'}."</p>
                                </div>
                            </div>
                        ) : <div className="p-20 text-center text-gray-400 font-bold border-2 border-dashed rounded-3xl">لا توجد بيانات درجات للفصل المختار</div>}
                    </div>
                )}

                {activeTab === 'AT_RISK' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex gap-2 mb-4 bg-white p-4 rounded-xl border">
                             <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-2 border rounded-lg text-sm font-bold bg-gray-50"><option value="">-- اختر الفصل --</option>{uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}</select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {atRiskData.map((item: any) => (
                                <div key={item.student.id} className="bg-white p-6 rounded-[2rem] border-2 border-red-50 shadow-sm hover:border-red-200 transition-all">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-black">{item.student.name.charAt(0)}</div>
                                        <h3 className="font-bold text-gray-800">{item.student.name}</h3>
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        {item.risks.map((risk: string, i: number) => (
                                            <div key={i} className="text-[10px] bg-red-50 text-red-700 p-2 rounded-lg font-bold flex items-center gap-2">
                                                <AlertTriangle size={12}/> {risk}
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={()=>navigate('/followup', {state:{studentId: item.student.id}})} className="w-full py-2.5 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all">التدخل والمتابعة</button>
                                </div>
                            ))}
                            {selectedClass && atRiskData.length === 0 && (
                                <div className="col-span-full p-20 text-center text-green-600 font-bold bg-green-50 border border-green-100 rounded-[2.5rem]">
                                    <CheckCircle size={48} className="mx-auto mb-4"/>
                                    جميع طلاب هذا الفصل بمستوى آمن حالياً.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'MONTHLY' && <MonthlyReport students={students} attendance={attendance} performance={performance} currentUser={currentUser} />}
                {activeTab === 'CERTIFICATES' && <CertificatesCenter students={students} currentUser={currentUser} onSaveAttendance={(recs) => { }} />}
                {activeTab === 'AI' && <AIReports students={students} attendance={attendance} performance={performance} currentUser={currentUser} />}
            </div>
        </div>
    );
};

const TabBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>{label}</button>
);

export default ReportsCenter;