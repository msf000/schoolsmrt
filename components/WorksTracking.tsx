
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, AcademicTerm, Subject } from '../types';
import { getAssignments, saveAssignment, deleteAssignment, getAcademicTerms, getSubjects } from '../services/storageService';
import { Plus, Trash2, Save, Filter, Table, Calendar, Edit2, CheckCircle, XCircle, Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    currentUser?: SystemUser | null;
    onAddPerformance: (records: PerformanceRecord[]) => void;
}

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, currentUser, onAddPerformance }) => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // UI State
    const [selectedTermId, setSelectedTermId] = useState('');
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [activeTab, setActiveTab] = useState<'HOMEWORK' | 'ACTIVITY' | 'EXAM' | 'SUMMARY'>('SUMMARY');
    const [editMode, setEditMode] = useState(false);
    
    // Config State
    const [yearWorkConfig, setYearWorkConfig] = useState({ hw: 10, act: 15, att: 15, exam: 20 });
    const [activityTarget, setActivityTarget] = useState(10);

    // New Assignment State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newAssignTitle, setNewAssignTitle] = useState('');
    const [newAssignMax, setNewAssignMax] = useState(10);

    const isManager = currentUser?.role === 'SCHOOL_MANAGER';

    useEffect(() => {
        if(currentUser) {
            // Get ALL assignments initially to filter locally
            setAssignments(getAssignments('ALL', currentUser.id, isManager, true));
            setTerms(getAcademicTerms(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
            
            // Defaults
            const currentTerm = getAcademicTerms(currentUser.id).find(t => t.isCurrent);
            if(currentTerm) setSelectedTermId(currentTerm.id);
        }
    }, [currentUser, isManager]);

    const activeTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);
    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => !selectedClass || s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name));
    }, [students, selectedClass]);

    const filteredAssignments = useMemo(() => {
        let category: string = activeTab;
        if (activeTab === 'SUMMARY') category = 'ALL';
        else if (activeTab === 'EXAM') category = 'PLATFORM_EXAM';

        return assignments.filter(a => 
            (category === 'ALL' || a.category === category) &&
            (!selectedTermId || !a.termId || a.termId === selectedTermId) &&
            (!selectedPeriodId || !a.periodId || a.periodId === selectedPeriodId)
        );
    }, [assignments, activeTab, selectedTermId, selectedPeriodId]);

    const handleAddAssignment = () => {
        if (!newAssignTitle) return;
        const newAssign: Assignment = {
            id: Date.now().toString(),
            title: newAssignTitle,
            category: activeTab === 'SUMMARY' ? 'HOMEWORK' : activeTab === 'EXAM' ? 'PLATFORM_EXAM' : activeTab as any,
            maxScore: newAssignMax,
            isVisible: true,
            teacherId: currentUser?.id,
            termId: selectedTermId,
            periodId: selectedPeriodId
        };
        saveAssignment(newAssign);
        setAssignments(getAssignments('ALL', currentUser?.id, isManager, true));
        setIsAddModalOpen(false);
        setNewAssignTitle('');
    };

    const handleDeleteAssignment = (id: string) => {
        if(confirm('حذف هذا العمود؟')) {
            deleteAssignment(id);
            setAssignments(getAssignments('ALL', currentUser?.id, isManager, true));
        }
    };

    const handleScoreUpdate = (studentId: string, assignId: string, val: string) => {
        const score = parseFloat(val);
        const assign = assignments.find(a => a.id === assignId);
        if (!assign || isNaN(score)) return;

        // Find existing record
        const existing = performance.find(p => p.studentId === studentId && p.notes === assignId);
        
        const record: PerformanceRecord = {
            id: existing ? existing.id : `${studentId}-${assignId}-${Date.now()}`,
            studentId,
            subject: selectedSubject || 'عام',
            title: assign.title,
            category: assign.category,
            score: score,
            maxScore: assign.maxScore,
            date: new Date().toISOString().split('T')[0],
            notes: assignId, // Link to assignment ID
            createdById: currentUser?.id
        };
        
        onAddPerformance([record]);
    };

    // Calculate Summary Logic
    const calculateYearWork = (student: Student) => {
        // 1. Determine Date Range for Attendance (Attendance relies on dates)
        let startDate: string | undefined;
        let endDate: string | undefined;
        
        if (selectedPeriodId) {
            const period = activeTerm?.periods?.find(p => p.id === selectedPeriodId);
            if (period) { startDate = period.startDate; endDate = period.endDate; }
        } else if (activeTerm) { 
            startDate = activeTerm.startDate; 
            endDate = activeTerm.endDate; 
        }

        const filterDateRange = (date: string) => { 
            if (!startDate || !endDate) return true; 
            return date >= startDate && date <= endDate; 
        };
        
        // 2. Filter Assignments based on Term/Period Selection
        const isAssignmentInScope = (a: Assignment) => {
            const termMatch = !selectedTermId || !a.termId || a.termId === selectedTermId;
            const periodMatch = !selectedPeriodId || !a.periodId || a.periodId === selectedPeriodId;
            return termMatch && periodMatch;
        };

        const hwCols = assignments.filter(a => a.category === 'HOMEWORK' && isAssignmentInScope(a));
        const actCols = assignments.filter(a => a.category === 'ACTIVITY' && isAssignmentInScope(a));
        const examCols = assignments.filter(a => a.category === 'PLATFORM_EXAM' && isAssignmentInScope(a));

        // Create Sets of IDs for fast valid lookup
        const validHWIds = new Set(hwCols.map(a => a.id));
        const validActIds = new Set(actCols.map(a => a.id));
        const validExamIds = new Set(examCols.map(a => a.id));

        // 3. Filter Records (Scores)
        const isRecordInScope = (p: PerformanceRecord, validIds: Set<string>) => {
            if (p.studentId !== student.id) return false;
            if (selectedSubject && p.subject !== selectedSubject) return false;
            
            // Logic A: Linked Data
            if (p.notes && validIds.has(p.notes)) return true;

            // Logic B: Unlinked Data (Manual entries without column link)
            if (!p.notes && filterDateRange(p.date)) return true;

            return false;
        };

        const hwRecs = performance.filter(p => p.category === 'HOMEWORK' && isRecordInScope(p, validHWIds));
        const actRecs = performance.filter(p => p.category === 'ACTIVITY' && isRecordInScope(p, validActIds));
        const examRecs = performance.filter(p => p.category === 'PLATFORM_EXAM' && isRecordInScope(p, validExamIds));

        // 4. Calculate Grades
        const hwMax = yearWorkConfig.hw; 
        const actMax = yearWorkConfig.act; 
        const attMax = yearWorkConfig.att; 
        const examMax = yearWorkConfig.exam;

        // Homework
        let hwGrade = 0;
        if (hwCols.length > 0) {
            const totalEarned = hwRecs.reduce((sum, r) => sum + r.score, 0);
            const totalPossible = hwCols.reduce((sum, c) => sum + c.maxScore, 0);
            hwGrade = totalPossible > 0 ? (totalEarned / totalPossible) * hwMax : 0;
        } else if (hwRecs.length > 0) {
             hwGrade = hwMax; 
        }

        // Activity
        let actSumVal = 0; 
        actRecs.forEach(p => actSumVal += p.score);
        const actGrade = activityTarget > 0 ? Math.min((actSumVal / activityTarget) * actMax, actMax) : 0;

        // Attendance
        const termAtt = attendance.filter(a => a.studentId === student.id && filterDateRange(a.date));
        const present = termAtt.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE || a.status === AttendanceStatus.EXCUSED).length;
        const attGrade = termAtt.length > 0 ? (present / termAtt.length) * attMax : attMax; // Default to full mark if no attendance recorded

        // Exams
        let examScoreTotal = 0; 
        let examMaxTotal = 0;
        
        if (examCols.length > 0) {
             examCols.forEach(col => {
                 const rec = examRecs.find(r => r.notes === col.id);
                 examMaxTotal += col.maxScore;
                 if (rec) examScoreTotal += rec.score;
             });
        } else {
             examRecs.forEach(p => { examScoreTotal += p.score; examMaxTotal += p.maxScore || 20; });
        }
        
        const examGrade = examMaxTotal > 0 ? (examScoreTotal / examMaxTotal) * examMax : 0;

        const total = hwGrade + actGrade + attGrade + examGrade;
        
        return { hwGrade, actGrade, attGrade, examGrade, total };
    };

    const handleExport = () => {
        const data = filteredStudents.map(s => {
            const stats = calculateYearWork(s);
            return {
                'الاسم': s.name,
                'واجبات': stats.hwGrade.toFixed(1),
                'أنشطة': stats.actGrade.toFixed(1),
                'حضور': stats.attGrade.toFixed(1),
                'اختبارات': stats.examGrade.toFixed(1),
                'المجموع': stats.total.toFixed(1)
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Works");
        XLSX.writeFile(wb, "Works_Tracking.xlsx");
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Table className="text-purple-600"/> سجل أعمال السنة (الشبكة)</h2>
                    <p className="text-sm text-gray-500">رصد الدرجات التفصيلي وحساب المعدلات تلقائياً.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <select className="p-2 border rounded text-sm bg-white" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                        <option value="">كل الفترات</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {activeTerm?.periods && (
                        <select className="p-2 border rounded text-sm bg-white" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                            <option value="">كل الفترات الجزئية</option>
                            {activeTerm.periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}
                    <select className="p-2 border rounded text-sm bg-white" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="">كل المواد</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <select className="p-2 border rounded text-sm bg-white" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">كل الفصول</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={handleExport} className="bg-green-600 text-white px-3 py-2 rounded text-sm font-bold flex items-center gap-2"><Download size={16}/> إكسل</button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden flex-1">
                <div className="flex border-b bg-gray-50 overflow-x-auto">
                    <button onClick={() => setActiveTab('SUMMARY')} className={`px-6 py-3 font-bold text-sm ${activeTab === 'SUMMARY' ? 'text-purple-600 border-b-2 border-purple-600 bg-white' : 'text-gray-500'}`}>الملخص</button>
                    <button onClick={() => setActiveTab('HOMEWORK')} className={`px-6 py-3 font-bold text-sm ${activeTab === 'HOMEWORK' ? 'text-purple-600 border-b-2 border-purple-600 bg-white' : 'text-gray-500'}`}>الواجبات</button>
                    <button onClick={() => setActiveTab('ACTIVITY')} className={`px-6 py-3 font-bold text-sm ${activeTab === 'ACTIVITY' ? 'text-purple-600 border-b-2 border-purple-600 bg-white' : 'text-gray-500'}`}>الأنشطة</button>
                    <button onClick={() => setActiveTab('EXAM')} className={`px-6 py-3 font-bold text-sm ${activeTab === 'EXAM' ? 'text-purple-600 border-b-2 border-purple-600 bg-white' : 'text-gray-500'}`}>الاختبارات</button>
                </div>

                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">
                        {activeTab === 'SUMMARY' ? 'ملخص الدرجات' : `رصد ${activeTab === 'HOMEWORK' ? 'الواجبات' : activeTab === 'ACTIVITY' ? 'الأنشطة' : 'الاختبارات'}`}
                    </h3>
                    {activeTab !== 'SUMMARY' && !isManager && (
                        <div className="flex gap-2">
                            <button onClick={() => setEditMode(!editMode)} className={`px-3 py-1.5 rounded text-xs font-bold border ${editMode ? 'bg-green-100 text-green-700 border-green-200' : 'bg-white text-gray-600'}`}>
                                {editMode ? <CheckCircle size={14} className="inline mr-1"/> : <Edit2 size={14} className="inline mr-1"/>} {editMode ? 'إنهاء الرصد' : 'تفعيل الرصد'}
                            </button>
                            <button onClick={() => setIsAddModalOpen(true)} className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-bold flex items-center gap-1 hover:bg-purple-700">
                                <Plus size={14}/> عمود جديد
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar bg-white">
                    <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                        <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 border w-12 bg-gray-100">#</th>
                                <th className="p-3 border w-48 text-right bg-gray-100 sticky right-0 z-20 shadow-md">اسم الطالب</th>
                                {activeTab === 'SUMMARY' ? (
                                    <>
                                        <th className="p-3 border">واجبات ({yearWorkConfig.hw})</th>
                                        <th className="p-3 border">أنشطة ({yearWorkConfig.act})</th>
                                        <th className="p-3 border">حضور ({yearWorkConfig.att})</th>
                                        <th className="p-3 border">اختبارات ({yearWorkConfig.exam})</th>
                                        <th className="p-3 border bg-gray-200">المجموع (60)</th>
                                    </>
                                ) : (
                                    filteredAssignments.map(a => (
                                        <th key={a.id} className="p-2 border min-w-[100px] relative group">
                                            <div className="flex flex-col gap-1">
                                                <span>{a.title}</span>
                                                <span className="text-[10px] text-gray-500 font-mono">({a.maxScore})</span>
                                                {!isManager && (
                                                    <button onClick={() => handleDeleteAssignment(a.id)} className="absolute top-1 left-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                                                )}
                                            </div>
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((s, idx) => {
                                const stats = calculateYearWork(s);
                                return (
                                    <tr key={s.id} className="hover:bg-blue-50/50">
                                        <td className="p-3 border bg-gray-50">{idx+1}</td>
                                        <td className="p-3 border text-right font-bold bg-white sticky right-0 z-10">{s.name}</td>
                                        {activeTab === 'SUMMARY' ? (
                                            <>
                                                <td className="p-3 border">{stats.hwGrade.toFixed(1)}</td>
                                                <td className="p-3 border">{stats.actGrade.toFixed(1)}</td>
                                                <td className="p-3 border">{stats.attGrade.toFixed(1)}</td>
                                                <td className="p-3 border">{stats.examGrade.toFixed(1)}</td>
                                                <td className="p-3 border font-black bg-gray-100">{stats.total.toFixed(1)}</td>
                                            </>
                                        ) : (
                                            filteredAssignments.map(a => {
                                                const rec = performance.find(p => p.studentId === s.id && p.notes === a.id);
                                                return (
                                                    <td key={a.id} className="p-0 border">
                                                        {editMode ? (
                                                            <input 
                                                                className="w-full h-full text-center p-2 outline-none bg-transparent focus:bg-blue-50"
                                                                defaultValue={rec?.score}
                                                                onBlur={(e) => handleScoreUpdate(s.id, a.id, e.target.value)}
                                                            />
                                                        ) : (
                                                            <span className={rec ? 'font-bold text-gray-800' : 'text-gray-300'}>{rec?.score ?? '-'}</span>
                                                        )}
                                                    </td>
                                                );
                                            })
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Assignment Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-bounce-in">
                        <h3 className="font-bold text-lg mb-4">إضافة عمود رصد جديد</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">العنوان</label>
                                <input className="w-full p-2 border rounded" value={newAssignTitle} onChange={e => setNewAssignTitle(e.target.value)} autoFocus />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">الدرجة العظمى</label>
                                <input type="number" className="w-full p-2 border rounded" value={newAssignMax} onChange={e => setNewAssignMax(Number(e.target.value))} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setIsAddModalOpen(false)} className="flex-1 py-2 border rounded text-gray-600 hover:bg-gray-50">إلغاء</button>
                                <button onClick={handleAddAssignment} className="flex-1 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold">إضافة</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
