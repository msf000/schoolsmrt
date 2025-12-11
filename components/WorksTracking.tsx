
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, SystemUser, Assignment, AttendanceStatus, AcademicTerm, Subject, PerformanceCategory } from '../types';
import { getAssignments, saveAssignment, deleteAssignment, getSubjects, getAcademicTerms } from '../services/storageService';
import { Table, Save, Plus, Trash2, Download, Filter, Calculator, Loader2, Eye, EyeOff } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<PerformanceCategory | 'YEAR_WORK'>('HOMEWORK');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [activityTarget, setActivityTarget] = useState(15); // Default target for activities

    // Data State
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [selectedTermId, setSelectedTermId] = useState('');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    // UI State
    const [isSaving, setIsSaving] = useState(false);
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({}); // studentId -> assignmentId -> score

    useEffect(() => {
        if (currentUser) {
            setSubjects(getSubjects(currentUser.id));
            setTerms(getAcademicTerms(currentUser.id));
            const activeT = getAcademicTerms(currentUser.id).find(t => t.isCurrent);
            if (activeT) setSelectedTermId(activeT.id);
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            setAssignments(getAssignments(activeTab === 'YEAR_WORK' ? 'HOMEWORK' : activeTab, currentUser.id, isManager));
        }
    }, [activeTab, currentUser, isManager]);

    // Derived Data
    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
    
    const activeTerm = terms.find(t => t.id === selectedTermId);

    const filteredAssignments = useMemo(() => {
        if (activeTab === 'YEAR_WORK') return [];
        return assignments.filter(a => !activeTerm || !a.termId || a.termId === activeTerm.id);
    }, [assignments, activeTerm, activeTab]);

    const filteredStudents = useMemo(() => {
        if (!selectedClass) return [];
        return students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name));
    }, [students, selectedClass]);

    // Initialize Scores from Performance
    useEffect(() => {
        const initialScores: Record<string, Record<string, string>> = {};
        
        filteredStudents.forEach(s => {
            initialScores[s.id] = {};
            // Find existing performance records for this student and subject
            const studentPerf = performance.filter(p => p.studentId === s.id && p.subject === selectedSubject);
            
            // Map performance to assignments (using 'notes' as assignment ID link or matching title)
            studentPerf.forEach(p => {
                if (p.notes) {
                    // Try to find assignment by ID stored in notes
                    initialScores[s.id][p.notes] = p.score.toString();
                } else {
                    // Fallback match by title
                    const assign = filteredAssignments.find(a => a.title === p.title);
                    if (assign) {
                        initialScores[s.id][assign.id] = p.score.toString();
                    }
                }
            });
        });
        setScores(initialScores);
    }, [filteredStudents, performance, selectedSubject, filteredAssignments]);

    // Handlers
    const handleScoreChange = (studentId: string, assignmentId: string, val: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [assignmentId]: val
            }
        }));
    };

    const handleSaveScores = () => {
        if (!selectedSubject) return alert('الرجاء اختيار المادة');
        setIsSaving(true);
        const recordsToSave: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];

        Object.keys(scores).forEach(studentId => {
            Object.keys(scores[studentId]).forEach(assignmentId => {
                const val = scores[studentId][assignmentId];
                if (val !== undefined && val !== '') {
                    const assignment = assignments.find(a => a.id === assignmentId);
                    if (assignment) {
                        recordsToSave.push({
                            id: `${studentId}_${assignmentId}_${today}`, // Simple ID generation
                            studentId,
                            subject: selectedSubject,
                            title: assignment.title,
                            category: assignment.category,
                            score: parseFloat(val),
                            maxScore: assignment.maxScore,
                            date: today,
                            notes: assignment.id, // Link back to assignment
                            createdById: currentUser?.id
                        });
                    }
                }
            });
        });

        onAddPerformance(recordsToSave);
        setTimeout(() => {
            setIsSaving(false);
            alert('تم حفظ الدرجات بنجاح');
        }, 500);
    };

    const handleAddAssignment = () => {
        const title = prompt('عنوان العمود الجديد:');
        if (title) {
            const max = prompt('الدرجة العظمى:', '10');
            const newAssign: Assignment = {
                id: Date.now().toString(),
                title,
                category: activeTab as PerformanceCategory,
                maxScore: Number(max) || 10,
                isVisible: true,
                teacherId: currentUser?.id,
                termId: selectedTermId
            };
            saveAssignment(newAssign);
            setAssignments(getAssignments(activeTab as string, currentUser?.id, isManager));
        }
    };

    const handleDeleteAssignment = (id: string) => {
        if(confirm('حذف العمود؟')) {
            deleteAssignment(id);
            setAssignments(getAssignments(activeTab as string, currentUser?.id, isManager));
        }
    };

    // Calculate Year Work
    const calculateYearWork = (student: Student) => {
        // Filter attendance for the student within the term
        const termAtt = attendance.filter(a => 
            a.studentId === student.id && 
            (!activeTerm || (a.date >= activeTerm.startDate && a.date <= activeTerm.endDate))
        );

        const filterByPeriod = (p: PerformanceRecord) => {
            if (activeTerm) {
                return p.date >= activeTerm.startDate && p.date <= activeTerm.endDate;
            }
            return true;
        };

        // Homework
        const hwRecs = performance.filter(p => p.studentId === student.id && p.category === 'HOMEWORK' && p.subject === selectedSubject && filterByPeriod(p));
        const hwCols = getAssignments('HOMEWORK', currentUser?.id, isManager).filter(a => !activeTerm || !a.termId || a.termId === activeTerm.id);
        const distinctHW = new Set(hwRecs.map(p => p.notes)).size; // Unique assignments completed
        const hwGrade = hwCols.length > 0 ? (distinctHW / hwCols.length) * 10 : (hwRecs.length > 0 ? 10 : 0);

        // Activity
        const actRecs = performance.filter(p => p.studentId === student.id && p.category === 'ACTIVITY' && p.subject === selectedSubject && filterByPeriod(p));
        let actSumVal = 0;
        actRecs.forEach(p => { if (!p.title.includes('حضور')) actSumVal += p.score; });
        const actGrade = activityTarget > 0 ? Math.min((actSumVal / activityTarget) * 15, 15) : 0;

        // Attendance
        const present = termAtt.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE || a.status === AttendanceStatus.EXCUSED).length;
        const totalDays = termAtt.length;
        const attGrade = totalDays > 0 ? (present / totalDays) * 15 : 15;

        // Exams
        const examRecs = performance.filter(p => p.studentId === student.id && p.category === 'PLATFORM_EXAM' && p.subject === selectedSubject && filterByPeriod(p));
        let examScoreTotal = 0;
        let examMaxTotal = 0;
        examRecs.forEach(p => { examScoreTotal += p.score; examMaxTotal += p.maxScore || 20; });
        const examGrade = examMaxTotal > 0 ? (examScoreTotal / examMaxTotal) * 20 : 0;

        const total = hwGrade + actGrade + attGrade + examGrade;

        return { hwGrade, actGrade, attGrade, examGrade, total };
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            {/* Header Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Table className="text-purple-600"/> سجل الرصد والمتابعة
                    </h2>
                    <p className="text-sm text-gray-500">رصد الدرجات التفصيلية وحساب أعمال السنة.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <select 
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none px-2"
                            value={selectedTermId}
                            onChange={e => setSelectedTermId(e.target.value)}
                        >
                            <option value="">كل الفترات</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setActiveTab('HOMEWORK')} className={`px-3 py-1.5 rounded text-xs font-bold ${activeTab === 'HOMEWORK' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>الواجبات</button>
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`px-3 py-1.5 rounded text-xs font-bold ${activeTab === 'ACTIVITY' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>الأنشطة</button>
                        <button onClick={() => setActiveTab('PLATFORM_EXAM')} className={`px-3 py-1.5 rounded text-xs font-bold ${activeTab === 'PLATFORM_EXAM' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>اختبارات</button>
                        <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-3 py-1.5 rounded text-xs font-bold ${activeTab === 'YEAR_WORK' ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}>أعمال السنة</button>
                    </div>

                    <select className="p-2 border rounded-lg text-sm font-bold w-32" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">الفصل...</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select className="p-2 border rounded-lg text-sm font-bold w-32" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="">المادة...</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>

                    {activeTab !== 'YEAR_WORK' && (
                        <>
                            <button onClick={handleAddAssignment} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Plus size={18}/></button>
                            <button onClick={handleSaveScores} disabled={isSaving} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2">
                                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} حفظ
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content Table */}
            {selectedClass ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                            <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border w-12 bg-gray-50">#</th>
                                    <th className="p-3 border text-right min-w-[200px] sticky right-0 bg-gray-50 z-20 shadow-md">اسم الطالب</th>
                                    
                                    {activeTab === 'YEAR_WORK' ? (
                                        <>
                                            <th className="p-3 border bg-blue-50">واجبات (10)</th>
                                            <th className="p-3 border bg-amber-50">أنشطة (15)</th>
                                            <th className="p-3 border bg-green-50">حضور (15)</th>
                                            <th className="p-3 border bg-purple-50">اختبارات (20)</th>
                                            <th className="p-3 border bg-gray-800 text-white">المجموع (60)</th>
                                        </>
                                    ) : (
                                        filteredAssignments.map(assign => (
                                            <th key={assign.id} className="p-3 border min-w-[100px] relative group">
                                                <div className="flex flex-col items-center">
                                                    <span>{assign.title}</span>
                                                    <span className="text-[10px] text-gray-400">({assign.maxScore})</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteAssignment(assign.id)}
                                                    className="absolute top-1 left-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 size={12}/>
                                                </button>
                                            </th>
                                        ))
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student, idx) => {
                                    if (activeTab === 'YEAR_WORK') {
                                        const yw = calculateYearWork(student);
                                        return (
                                            <tr key={student.id} className="hover:bg-gray-50 border-b">
                                                <td className="p-3 border text-gray-500">{idx + 1}</td>
                                                <td className="p-3 border text-right font-bold text-gray-800 sticky right-0 bg-white z-10">{student.name}</td>
                                                <td className="p-3 border bg-blue-50/30 font-bold">{yw.hwGrade.toFixed(1)}</td>
                                                <td className="p-3 border bg-amber-50/30 font-bold">{yw.actGrade.toFixed(1)}</td>
                                                <td className="p-3 border bg-green-50/30 font-bold">{yw.attGrade.toFixed(1)}</td>
                                                <td className="p-3 border bg-purple-50/30 font-bold">{yw.examGrade.toFixed(1)}</td>
                                                <td className="p-3 border bg-gray-100 font-black text-gray-900">{yw.total.toFixed(1)}</td>
                                            </tr>
                                        );
                                    }

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 border-b transition-colors">
                                            <td className="p-3 border text-gray-500">{idx + 1}</td>
                                            <td className="p-3 border text-right font-bold text-gray-800 sticky right-0 bg-white z-10">{student.name}</td>
                                            {filteredAssignments.map(assign => (
                                                <td key={assign.id} className="p-0 border relative">
                                                    <input 
                                                        type="number"
                                                        className="w-full h-full p-3 text-center outline-none bg-transparent focus:bg-blue-50 font-medium"
                                                        value={scores[student.id]?.[assign.id] || ''}
                                                        onChange={e => handleScoreChange(student.id, assign.id, e.target.value)}
                                                        placeholder="-"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredStudents.length === 0 && <div className="p-10 text-center text-gray-400">لا يوجد طلاب في هذا الفصل</div>}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                    <Table size={48} className="mb-4 opacity-20"/>
                    <p>الرجاء اختيار الفصل والمادة لعرض السجل</p>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
