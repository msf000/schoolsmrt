
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, deletePerformance } from '../services/storageService';
import { Save, Filter, Table, Calculator, Download, Plus, Trash2, CheckCircle, XCircle, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance, currentUser }) => {
    const isManager = currentUser?.role === 'SCHOOL_MANAGER';
    
    // State
    const [activeTab, setActiveTab] = useState<'HOMEWORK' | 'ACTIVITY' | 'PLATFORM_EXAM' | 'YEAR_WORK'>('HOMEWORK');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [selectedTermId, setSelectedTermId] = useState('');
    const [activityTarget, setActivityTarget] = useState(15);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setSubjects(getSubjects(currentUser?.id));
        const loadedTerms = getAcademicTerms(currentUser?.id);
        setTerms(loadedTerms);
        const current = loadedTerms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);
        
        // Initialize subject if available
        const subs = getSubjects(currentUser?.id);
        if(subs.length > 0) setSelectedSubject(subs[0].name);
    }, [currentUser]);

    const activeTerm = terms.find(t => t.id === selectedTermId);

    // Filter Students
    const filteredStudents = useMemo(() => {
        let filtered = [...students].sort((a,b) => a.name.localeCompare(b.name));
        if (searchTerm) {
            filtered = filtered.filter(s => s.name.includes(searchTerm));
        }
        // Could add class filter here if needed
        return filtered;
    }, [students, searchTerm]);

    const handleExport = () => {
        const rows = filteredStudents.map(s => {
            return {
                'الاسم': s.name,
                'الصف': s.gradeLevel,
                'الفصل': s.className
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `Tracking_${activeTab}.xlsx`);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            {/* Header Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Table className="text-purple-600"/> سجل الرصد والمتابعة
                    </h2>
                </div>
                
                <div className="flex gap-2">
                    <select 
                        className="p-2 border rounded-lg bg-gray-50 text-sm font-bold"
                        value={selectedTermId}
                        onChange={e => setSelectedTermId(e.target.value)}
                    >
                        <option value="">كل الفترات</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    
                    <select 
                        className="p-2 border rounded-lg bg-gray-50 text-sm font-bold"
                        value={selectedSubject}
                        onChange={e => setSelectedSubject(e.target.value)}
                    >
                        <option value="">اختر المادة</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b overflow-x-auto">
                <button onClick={() => setActiveTab('HOMEWORK')} className={`px-4 py-2 border-b-2 font-bold ${activeTab === 'HOMEWORK' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500'}`}>الواجبات</button>
                <button onClick={() => setActiveTab('ACTIVITY')} className={`px-4 py-2 border-b-2 font-bold ${activeTab === 'ACTIVITY' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500'}`}>الأنشطة</button>
                <button onClick={() => setActiveTab('PLATFORM_EXAM')} className={`px-4 py-2 border-b-2 font-bold ${activeTab === 'PLATFORM_EXAM' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500'}`}>اختبارات المنصة</button>
                <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-4 py-2 border-b-2 font-bold ${activeTab === 'YEAR_WORK' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500'}`}>أعمال السنة (تجميعي)</button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <div className="relative w-64">
                        <Search size={16} className="absolute top-2.5 right-2 text-gray-400"/>
                        <input className="w-full pr-8 pl-2 py-2 border rounded-lg text-sm" placeholder="بحث عن طالب..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                    </div>
                    <button onClick={handleExport} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-green-700">
                        <Download size={16}/> تصدير
                    </button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-right text-sm border-collapse">
                        <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="p-3 border-l w-12 text-center">#</th>
                                <th className="p-3 border-l w-64">اسم الطالب</th>
                                {activeTab === 'YEAR_WORK' ? (
                                    <>
                                        <th className="p-3 border-l text-center bg-blue-50">الواجبات (10)</th>
                                        <th className="p-3 border-l text-center bg-amber-50">الأنشطة (15)</th>
                                        <th className="p-3 border-l text-center bg-green-50">الحضور (15)</th>
                                        <th className="p-3 border-l text-center bg-purple-50">الاختبارات (20)</th>
                                        <th className="p-3 border-l text-center bg-gray-800 text-white">المجموع (60)</th>
                                    </>
                                ) : (
                                    <th className="p-3 border-l">التفاصيل</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredStudents.map((student, i) => {
                                const termAtt = activeTerm ? attendance.filter(a => a.studentId === student.id && a.date >= activeTerm.startDate && a.date <= activeTerm.endDate) : attendance.filter(a => a.studentId === student.id);
                                
                                if (activeTab === 'YEAR_WORK') {
                                    // Apply Date Filter based on Active Term OR Active Period for correct calculations
                                    const filterByPeriod = (p: PerformanceRecord) => {
                                        if (activeTerm) {
                                            return p.date >= activeTerm.startDate && p.date <= activeTerm.endDate;
                                        }
                                        return true;
                                    };

                                    const hwRecs = performance.filter(p => p.studentId === student.id && p.category === 'HOMEWORK' && p.subject === selectedSubject && filterByPeriod(p));
                                    // Get Homework Assignments relevant to the term for denominator
                                    const hwCols = getAssignments('HOMEWORK', currentUser?.id, isManager).filter(a => !activeTerm || !a.termId || a.termId === activeTerm.id);
                                    const distinctHW = new Set(hwRecs.map(p => p.notes)).size;
                                    const hwGrade = hwCols.length > 0 ? (distinctHW / hwCols.length) * 10 : 0;

                                    const actRecs = performance.filter(p => p.studentId === student.id && p.category === 'ACTIVITY' && p.subject === selectedSubject && filterByPeriod(p));
                                    let actSumVal = 0;
                                    actRecs.forEach(p => { if (!p.title.includes('حضور')) actSumVal += p.score; });
                                    const actGrade = activityTarget > 0 ? Math.min((actSumVal / activityTarget) * 15, 15) : 0;

                                    // Attendance based on Term/Period (already filtered above in termAtt)
                                    const present = termAtt.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE || a.status === AttendanceStatus.EXCUSED).length;
                                    // Denominator is either total scheduled days or recorded days. Using recorded days for fairness.
                                    const attGrade = termAtt.length > 0 ? (present / termAtt.length) * 15 : 15; // Defaults to full if no records

                                    const examRecs = performance.filter(p => p.studentId === student.id && p.category === 'PLATFORM_EXAM' && p.subject === selectedSubject && filterByPeriod(p));
                                    let examScoreTotal = 0;
                                    let examMaxTotal = 0;
                                    examRecs.forEach(p => { examScoreTotal += p.score; examMaxTotal += p.maxScore || 20; });
                                    const examGrade = examMaxTotal > 0 ? (examScoreTotal / examMaxTotal) * 20 : 0;

                                    const total = hwGrade + actGrade + attGrade + examGrade;

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 border-b">
                                            <td className="p-3 border-l text-center text-gray-500">{i + 1}</td>
                                            <td className="p-3 border-l font-bold text-gray-800">{student.name}</td>
                                            <td className="p-3 border-l text-center font-bold bg-blue-50/50">{hwGrade.toFixed(1)}</td>
                                            <td className="p-3 border-l text-center font-bold bg-amber-50/50">{actGrade.toFixed(1)}</td>
                                            <td className="p-3 border-l text-center font-bold bg-green-50/50">{attGrade.toFixed(1)}</td>
                                            <td className="p-3 border-l text-center font-bold bg-purple-50/50">{examGrade.toFixed(1)}</td>
                                            <td className="p-3 border-l text-center font-black text-white bg-gray-800">{total.toFixed(1)}</td>
                                        </tr>
                                    );
                                }
                                return (
                                    <tr key={student.id}>
                                        <td className="p-3 border-l text-center">{i + 1}</td>
                                        <td className="p-3 border-l font-bold">{student.name}</td>
                                        <td className="p-3 border-l text-center text-gray-400">التفاصيل متاحة في عرض أعمال السنة</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WorksTracking;
