
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AcademicTerm, ReportHeaderConfig, Assignment } from '../types';
import { getAcademicTerms, getAssignments, getReportHeaderConfig, getTeacherAssignments } from '../services/storageService';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FileText, AlertTriangle, Calendar, BrainCircuit, Printer, Filter, Search, Download, TrendingDown, TrendingUp, CheckCircle, XCircle, ChevronRight, User } from 'lucide-react';
import MonthlyReport from './MonthlyReport';
import AIReports from './AIReports';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

interface ReportsCenterProps {
    students: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    currentUser?: SystemUser | null;
}

const ReportsCenter: React.FC<ReportsCenterProps> = ({ students, attendance, performance, currentUser }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'COMPREHENSIVE' | 'AT_RISK' | 'MONTHLY' | 'AI'>('COMPREHENSIVE');
    
    // Shared State
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedTermId, setSelectedTermId] = useState('');
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

    // At Risk Filters
    const [riskThresholds, setRiskThresholds] = useState({
        attendance: 85, // Below 85%
        grade: 60,      // Below 60%
        behavior: 3     // More than 3 negative notes
    });

    useEffect(() => {
        const loadedTerms = getAcademicTerms(currentUser?.id);
        setTerms(loadedTerms);
        const current = loadedTerms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);

        setAssignments(getAssignments('ALL', currentUser?.id, true));
        setHeaderConfig(getReportHeaderConfig(currentUser?.id));
    }, [currentUser]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        getTeacherAssignments(currentUser?.id).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUser]);

    const activeTerm = terms.find(t => t.id === selectedTermId);

    // --- Data Processing for Comprehensive Report ---
    const comprehensiveData = useMemo(() => {
        if (!selectedClass) return [];
        
        const classStudents = students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name));
        
        return classStudents.map(student => {
            // 1. Attendance Stats
            let sAtt = attendance.filter(a => a.studentId === student.id);
            if (activeTerm) sAtt = sAtt.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
            
            const totalDays = sAtt.length;
            const present = sAtt.filter(a => a.status === 'PRESENT').length;
            const absent = sAtt.filter(a => a.status === 'ABSENT').length;
            const late = sAtt.filter(a => a.status === 'LATE').length;
            const attRate = totalDays > 0 ? Math.round(((present + late * 0.5) / totalDays) * 100) : 100; // Late counts as half? or full present? Standard: Late is present but flagged. Let's stick to simple rate.
            const simpleAttRate = totalDays > 0 ? Math.round(((totalDays - absent) / totalDays) * 100) : 100;

            // 2. Behavior Stats
            const negNotes = sAtt.filter(a => a.behaviorStatus === 'NEGATIVE').length;
            const posNotes = sAtt.filter(a => a.behaviorStatus === 'POSITIVE').length;

            // 3. Academic Stats
            let sPerf = performance.filter(p => p.studentId === student.id);
            if (activeTerm) sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
            
            const totalScoreObtained = sPerf.reduce((acc, curr) => acc + curr.score, 0);
            const totalScoreMax = sPerf.reduce((acc, curr) => acc + curr.maxScore, 0);
            const gradeAvg = totalScoreMax > 0 ? Math.round((totalScoreObtained / totalScoreMax) * 100) : 0;

            return {
                ...student,
                stats: {
                    attRate: simpleAttRate,
                    absent,
                    late,
                    negNotes,
                    posNotes,
                    gradeAvg
                }
            };
        });
    }, [students, attendance, performance, selectedClass, activeTerm]);

    // --- Data Processing for At Risk ---
    const atRiskStudents = useMemo(() => {
        // Search across ALL students or filtered class? Let's do ALL if no class selected
        const targetStudents = selectedClass ? students.filter(s => s.className === selectedClass) : students;

        return targetStudents.map(student => {
            let sAtt = attendance.filter(a => a.studentId === student.id);
            let sPerf = performance.filter(p => p.studentId === student.id);
            if (activeTerm) {
                sAtt = sAtt.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
                sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
            }

            const totalDays = sAtt.length;
            const absent = sAtt.filter(a => a.status === 'ABSENT').length;
            const attRate = totalDays > 0 ? Math.round(((totalDays - absent) / totalDays) * 100) : 100;

            const totalScoreObtained = sPerf.reduce((acc, curr) => acc + curr.score, 0);
            const totalScoreMax = sPerf.reduce((acc, curr) => acc + curr.maxScore, 0);
            const gradeAvg = totalScoreMax > 0 ? Math.round((totalScoreObtained / totalScoreMax) * 100) : 100; // Default to 100 if no data to avoid false alarm? Or 0? Let's say if no data, not at risk academically yet.

            const negNotes = sAtt.filter(a => a.behaviorStatus === 'NEGATIVE').length;

            const risks = [];
            if (attRate < riskThresholds.attendance) risks.push({ type: 'ATTENDANCE', label: `ضعف حضور (${attRate}%)`, level: attRate < 70 ? 'HIGH' : 'MED' });
            if (gradeAvg < riskThresholds.grade && sPerf.length > 0) risks.push({ type: 'ACADEMIC', label: `تعثر دراسي (${gradeAvg}%)`, level: gradeAvg < 50 ? 'HIGH' : 'MED' });
            if (negNotes >= riskThresholds.behavior) risks.push({ type: 'BEHAVIOR', label: `سلوك (${negNotes} مخالفات)`, level: 'MED' });

            return { ...student, risks, stats: { attRate, gradeAvg, negNotes } };
        }).filter(s => s.risks.length > 0).sort((a,b) => b.risks.length - a.risks.length);
    }, [students, attendance, performance, selectedClass, activeTerm, riskThresholds]);

    const handleExportComprehensive = () => {
        if (comprehensiveData.length === 0) return;
        const data = comprehensiveData.map((s, i) => ({
            '#': i + 1,
            'الاسم': s.name,
            'الفصل': s.className,
            'نسبة الحضور': `${s.stats.attRate}%`,
            'أيام الغياب': s.stats.absent,
            'التأخر': s.stats.late,
            'المعدل الأكاديمي': `${s.stats.gradeAvg}%`,
            'نقاط إيجابية': s.stats.posNotes,
            'مخالفات': s.stats.negNotes
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "التقرير الشامل");
        XLSX.writeFile(wb, `Comprehensive_Report_${selectedClass || 'All'}.xlsx`);
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-purple-600"/> مركز التقارير والمتابعة
                </h2>
                <p className="text-sm text-gray-500">تقارير تحليلية شاملة للأداء والحضور والسلوك.</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 bg-white p-1 rounded-xl border shadow-sm w-fit">
                <button onClick={() => setActiveTab('COMPREHENSIVE')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'COMPREHENSIVE' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <CheckCircle size={16}/> التقرير الشامل
                </button>
                <button onClick={() => setActiveTab('AT_RISK')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'AT_RISK' ? 'bg-red-50 text-red-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <AlertTriangle size={16}/> الطلاب المتعثرين
                </button>
                <button onClick={() => setActiveTab('MONTHLY')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'MONTHLY' ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Calendar size={16}/> الحضور الشهري
                </button>
                <button onClick={() => setActiveTab('AI')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'AI' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <BrainCircuit size={16}/> تحليل الذكاء (AI)
                </button>
            </div>

            {/* --- COMPREHENSIVE TAB --- */}
            {activeTab === 'COMPREHENSIVE' && (
                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 justify-between items-center print:hidden">
                        <div className="flex items-center gap-3">
                            <select className="p-2 border rounded-lg bg-white text-sm font-bold" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                                <option value="">-- اختر الفصل --</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select className="p-2 border rounded-lg bg-white text-sm font-bold text-purple-700" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                                <option value="">كل الفترات</option>
                                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleExportComprehensive} disabled={!selectedClass} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-green-700 disabled:opacity-50">
                                <Download size={16}/> تصدير Excel
                            </button>
                            <button onClick={() => window.print()} disabled={!selectedClass} className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-black disabled:opacity-50">
                                <Printer size={16}/> طباعة
                            </button>
                        </div>
                    </div>

                    {selectedClass ? (
                        <div className="flex-1 overflow-auto p-0 print:overflow-visible">
                            {/* Print Header */}
                            <div className="hidden print:block p-8 pb-2 text-center border-b-2 border-black mb-4">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="text-right">
                                        <p className="font-bold">المملكة العربية السعودية</p>
                                        <p className="font-bold">وزارة التعليم</p>
                                        <p>{headerConfig?.schoolName}</p>
                                    </div>
                                    <h2 className="text-xl font-black underline mx-auto">التقرير الشامل - {selectedClass}</h2>
                                    <div className="text-left">
                                        <p className="font-bold">التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                                        <p>{activeTerm?.name}</p>
                                    </div>
                                </div>
                            </div>

                            <table className="w-full text-right text-sm border-collapse">
                                <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 print:static">
                                    <tr>
                                        <th className="p-4 border-b w-12 text-center">#</th>
                                        <th className="p-4 border-b">اسم الطالب</th>
                                        <th className="p-4 border-b text-center">الحضور</th>
                                        <th className="p-4 border-b text-center bg-red-50 text-red-700">غياب</th>
                                        <th className="p-4 border-b text-center bg-yellow-50 text-yellow-700">تأخر</th>
                                        <th className="p-4 border-b text-center bg-blue-50 text-blue-700">أكاديمي</th>
                                        <th className="p-4 border-b text-center">سلوك</th>
                                        <th className="p-4 border-b text-center">التقييم</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {comprehensiveData.map((s, i) => (
                                        <tr key={s.id} className="hover:bg-gray-50 print:break-inside-avoid">
                                            <td className="p-4 text-center text-gray-500">{i + 1}</td>
                                            <td className="p-4 font-bold text-gray-800">{s.name}</td>
                                            <td className="p-4 text-center font-bold">
                                                <span className={s.stats.attRate < 85 ? 'text-red-600' : 'text-green-600'}>{s.stats.attRate}%</span>
                                            </td>
                                            <td className="p-4 text-center">{s.stats.absent}</td>
                                            <td className="p-4 text-center">{s.stats.late}</td>
                                            <td className="p-4 text-center font-bold">
                                                <span className={s.stats.gradeAvg < 60 ? 'text-red-600' : 'text-blue-600'}>{s.stats.gradeAvg}%</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-2 text-xs">
                                                    {s.stats.posNotes > 0 && <span className="text-green-600 font-bold">+{s.stats.posNotes}</span>}
                                                    {s.stats.negNotes > 0 && <span className="text-red-600 font-bold">-{s.stats.negNotes}</span>}
                                                    {s.stats.posNotes === 0 && s.stats.negNotes === 0 && <span className="text-gray-300">-</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {s.stats.gradeAvg >= 90 && s.stats.attRate >= 95 ? <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">ممتاز</span> :
                                                 s.stats.gradeAvg < 50 || s.stats.attRate < 75 ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">متعثر</span> :
                                                 <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">جيد</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <FileText size={64} className="mb-4 opacity-20"/>
                            <p className="text-xl font-bold">الرجاء اختيار الفصل لعرض التقرير</p>
                        </div>
                    )}
                </div>
            )}

            {/* --- AT RISK TAB --- */}
            {activeTab === 'AT_RISK' && (
                <div className="flex flex-col h-full overflow-hidden animate-slide-up">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-wrap gap-6 items-center">
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-gray-400"/>
                            <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                                <option value="">كل الفصول</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="h-8 w-[1px] bg-gray-200"></div>
                        <div className="flex items-center gap-4 text-sm">
                            <label className="flex items-center gap-2">
                                <span className="text-gray-600">حد الحضور:</span>
                                <input type="number" className="w-16 p-1 border rounded text-center font-bold text-red-600" value={riskThresholds.attendance} onChange={e => setRiskThresholds({...riskThresholds, attendance: Number(e.target.value)})}/> %
                            </label>
                            <label className="flex items-center gap-2">
                                <span className="text-gray-600">حد الدرجات:</span>
                                <input type="number" className="w-16 p-1 border rounded text-center font-bold text-red-600" value={riskThresholds.grade} onChange={e => setRiskThresholds({...riskThresholds, grade: Number(e.target.value)})}/> %
                            </label>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {atRiskStudents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {atRiskStudents.map(s => (
                                    <div key={s.id} className="bg-white rounded-xl border border-red-100 shadow-sm p-5 hover:shadow-md transition-all relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
                                        <div className="flex justify-between items-start mb-4 pl-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm">
                                                    {s.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800 text-lg">{s.name}</h4>
                                                    <p className="text-xs text-gray-500">{s.className}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => navigate('/followup', { state: { studentId: s.id } })} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full">
                                                <ChevronRight size={20}/>
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-2 mb-4">
                                            {s.risks.map((r, i) => (
                                                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${r.level === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    <AlertTriangle size={14}/> {r.label}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 border-t pt-3 mt-2">
                                            <button onClick={() => navigate('/messages', { state: { studentIds: [s.id] } })} className="flex-1 py-2 bg-gray-50 text-gray-700 text-xs font-bold rounded hover:bg-gray-100 flex items-center justify-center gap-1">
                                                مراسلة ولي الأمر
                                            </button>
                                            <button onClick={() => navigate('/followup', { state: { studentId: s.id } })} className="flex-1 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded hover:bg-blue-100 flex items-center justify-center gap-1">
                                                تحويل للمرشد
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <CheckCircle size={64} className="mb-4 text-green-200"/>
                                <p className="text-xl font-bold text-green-600">ممتاز! لا يوجد طلاب متعثرين.</p>
                                <p className="text-sm">جميع الطلاب ضمن الحدود الطبيعية.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- MONTHLY & AI TABS --- */}
            {activeTab === 'MONTHLY' && (
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <MonthlyReport students={students} attendance={attendance} performance={performance} currentUser={currentUser} />
                </div>
            )}

            {activeTab === 'AI' && (
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <AIReports students={students} attendance={attendance} performance={performance} currentUser={currentUser} />
                </div>
            )}
        </div>
    );
};

export default ReportsCenter;
