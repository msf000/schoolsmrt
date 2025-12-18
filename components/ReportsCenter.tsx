
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AcademicTerm, ReportHeaderConfig, Assignment } from '../types';
import { getAcademicTerms, getAssignments, getReportHeaderConfig, getTeacherAssignments } from '../services/storageService';
import { FileText, AlertTriangle, Calendar, BrainCircuit, Printer, Download, CheckCircle, TrendingUp, ChevronRight } from 'lucide-react';
import MonthlyReport from './MonthlyReport';
import AIReports from './AIReports';
import CertificatesCenter from './CertificatesCenter';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

// Fix: Defined missing ReportsCenterProps interface
interface ReportsCenterProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
}

const ReportsCenter: React.FC<ReportsCenterProps> = ({ students, attendance, performance, currentUser }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'COMPREHENSIVE' | 'AT_RISK' | 'MONTHLY' | 'AI' | 'CERTIFICATES'>('COMPREHENSIVE');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTermId, setSelectedTermId] = useState('');
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

    useEffect(() => {
        const loadedTerms = getAcademicTerms(currentUser?.id);
        setTerms(loadedTerms);
        const current = loadedTerms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        setHeaderConfig(getReportHeaderConfig(currentUser?.id));
    }, [currentUser]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUser]);

    const activeTerm = terms.find(t => t.id === selectedTermId);

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
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-purple-600"/> مركز التقارير الذكي</h2>
                    <p className="text-sm text-gray-500">تحليل البيانات وإصدار التقارير والشهادات.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto">
                    <TabBtn label="التقرير الشامل" active={activeTab==='COMPREHENSIVE'} onClick={()=>setActiveTab('COMPREHENSIVE')} />
                    <TabBtn label="المتعثرين" active={activeTab==='AT_RISK'} onClick={()=>setActiveTab('AT_RISK')} />
                    <TabBtn label="الحضور الشهري" active={activeTab==='MONTHLY'} onClick={()=>setActiveTab('MONTHLY')} />
                    <TabBtn label="الشهادات" active={activeTab==='CERTIFICATES'} onClick={()=>setActiveTab('CERTIFICATES')} />
                    <TabBtn label="تحليل AI" active={activeTab==='AI'} onClick={()=>setActiveTab('AI')} />
                </div>
            </div>

            {activeTab === 'COMPREHENSIVE' && (
                <div className="bg-white rounded-2xl border shadow-sm flex flex-col flex-1 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-2 border rounded-lg font-bold text-sm bg-white">
                            <option value="">-- اختر الفصل --</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Download size={16}/> Excel</button>
                            <button onClick={()=>window.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Printer size={16}/> طباعة</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 sticky top-0 font-bold">
                                <tr>
                                    <th className="p-4">اسم الطالب</th>
                                    <th className="p-4 text-center">نسبة الحضور</th>
                                    <th className="p-4 text-center">أيام الغياب</th>
                                    <th className="p-4 text-center">المعدل الأكاديمي</th>
                                    <th className="p-4 text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {comprehensiveData.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold">{s.name}</td>
                                        <td className="p-4 text-center font-mono">{s.stats.attRate}%</td>
                                        <td className="p-4 text-center">{s.stats.absent}</td>
                                        <td className="p-4 text-center font-black text-indigo-600">{s.stats.gradeAvg}%</td>
                                        <td className="p-4 text-center">
                                            {s.stats.gradeAvg < 60 ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">متعثر</span> : <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">جيد</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'AT_RISK' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto">
                    {comprehensiveData.filter(s => s.stats.gradeAvg < 60 || s.stats.attRate < 80).map(s => (
                        <div key={s.id} className="bg-white p-6 rounded-2xl border-2 border-red-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
                            <h3 className="font-bold text-lg mb-2">{s.name}</h3>
                            <div className="space-y-2 mb-4">
                                {s.stats.attRate < 80 && <div className="text-xs bg-red-50 text-red-700 p-2 rounded flex items-center gap-2"><AlertTriangle size={14}/> ضعف حضور ({s.stats.attRate}%)</div>}
                                {s.stats.gradeAvg < 60 && <div className="text-xs bg-orange-50 text-orange-700 p-2 rounded flex items-center gap-2"><TrendingUp size={14} className="rotate-180"/> تعثر دراسي ({s.stats.gradeAvg}%)</div>}
                            </div>
                            <button onClick={()=>navigate('/followup', {state:{studentId:s.id}})} className="w-full py-2 bg-gray-50 hover:bg-red-50 text-red-600 rounded-xl font-bold text-xs flex items-center justify-center gap-1">عرض الملف والمتابعة <ChevronRight size={14}/></button>
                        </div>
                    ))}
                    {comprehensiveData.filter(s => s.stats.gradeAvg < 60 || s.stats.attRate < 80).length === 0 && <div className="col-span-full py-20 text-center text-gray-400 font-bold">لا يوجد طلاب متعثرين حالياً. عمل رائع!</div>}
                </div>
            )}

            {activeTab === 'MONTHLY' && <MonthlyReport students={students} attendance={attendance} performance={performance} currentUser={currentUser} />}
            {activeTab === 'CERTIFICATES' && <CertificatesCenter students={students} currentUser={currentUser} />}
            {activeTab === 'AI' && <AIReports students={students} attendance={attendance} performance={performance} currentUser={currentUser} />}
        </div>
    );
};

const TabBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>{label}</button>
);

export default ReportsCenter;
