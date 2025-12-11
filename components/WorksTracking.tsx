
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, deletePerformance, saveAssignment, deleteAssignment } from '../services/storageService';
import { Save, Filter, Table, Calculator, Download, Plus, Trash2, CheckCircle, XCircle, Search, FileSpreadsheet, Settings, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import DataImport from './DataImport';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance, currentUser }) => {
    const isManager = currentUser?.role === 'SCHOOL_MANAGER';
    
    // --- State ---
    const [activeTab, setActiveTab] = useState<'HOMEWORK' | 'ACTIVITY' | 'PLATFORM_EXAM' | 'YEAR_WORK'>('HOMEWORK');
    
    // Filters
    const [selectedTermId, setSelectedTermId] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Data
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    // UI State
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [activityTarget, setActivityTarget] = useState(15);

    // --- Effects ---
    useEffect(() => {
        if (currentUser) {
            setSubjects(getSubjects(currentUser.id));
            const loadedTerms = getAcademicTerms(currentUser.id);
            setTerms(loadedTerms);
            
            // Set default term
            const current = loadedTerms.find(t => t.isCurrent);
            if (current) setSelectedTermId(current.id);
            else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);
            
            // Set default subject
            const subs = getSubjects(currentUser.id);
            if(subs.length > 0) setSelectedSubject(subs[0].name);
        }
    }, [currentUser]);

    useEffect(() => {
        // Load assignments (columns) whenever tab or user changes
        if (currentUser) {
            setAssignments(getAssignments(activeTab === 'YEAR_WORK' ? 'HOMEWORK' : activeTab, currentUser.id, isManager));
        }
    }, [activeTab, currentUser, isManager]);

    // --- Derived Data ---
    const activeTerm = terms.find(t => t.id === selectedTermId);

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        return Array.from(classes).sort();
    }, [students]);

    const filteredStudents = useMemo(() => {
        let filtered = students;
        if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass);
        if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm));
        return filtered.sort((a,b) => a.name.localeCompare(b.name));
    }, [students, selectedClass, searchTerm]);

    const filteredAssignments = useMemo(() => {
        if (activeTab === 'YEAR_WORK') return [];
        // Show assignments that match the selected term OR have no term assigned
        return assignments.filter(a => !activeTerm || !a.termId || a.termId === activeTerm.id);
    }, [assignments, activeTerm, activeTab]);

    // Initialize scores from performance records
    useEffect(() => {
        const newScores: Record<string, Record<string, string>> = {};
        
        filteredStudents.forEach(s => {
            newScores[s.id] = {};
            // Filter performance for this student & subject
            const studentPerf = performance.filter(p => 
                p.studentId === s.id && 
                p.subject === selectedSubject &&
                (activeTab === 'YEAR_WORK' || p.category === activeTab)
            );

            studentPerf.forEach(p => {
                // Link by Assignment ID (notes) OR Title
                if (p.notes && filteredAssignments.some(a => a.id === p.notes)) {
                    newScores[s.id][p.notes] = p.score.toString();
                } else {
                    const assign = filteredAssignments.find(a => a.title === p.title);
                    if (assign) newScores[s.id][assign.id] = p.score.toString();
                }
            });
        });
        setScores(newScores);
    }, [filteredStudents, performance, selectedSubject, filteredAssignments, activeTab]);

    // --- Actions ---

    const handleScoreChange = (studentId: string, assignmentId: string, val: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [assignmentId]: val }
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
                            id: `${studentId}_${assignmentId}_${today}`,
                            studentId,
                            subject: selectedSubject,
                            title: assignment.title,
                            category: assignment.category,
                            score: parseFloat(val),
                            maxScore: assignment.maxScore,
                            date: today,
                            notes: assignment.id, // Important: Link to assignment ID
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
        const title = prompt('عنوان العمود الجديد (مثال: واجب 1):');
        if (title) {
            const max = prompt('الدرجة العظمى:', '10');
            const newAssign: Assignment = {
                id: Date.now().toString(),
                title,
                category: activeTab as any,
                maxScore: Number(max) || 10,
                isVisible: true,
                teacherId: currentUser?.id,
                termId: selectedTermId // Link to current selected term
            };
            saveAssignment(newAssign);
            setAssignments(getAssignments(activeTab, currentUser?.id, isManager));
        }
    };

    const handleDeleteAssignment = (id: string) => {
        if(confirm('هل أنت متأكد من حذف هذا العمود؟')) {
            deleteAssignment(id);
            setAssignments(getAssignments(activeTab, currentUser?.id, isManager));
        }
    };

    const handleExport = () => {
        const rows = filteredStudents.map(s => {
            const rowData: any = {
                'الاسم': s.name,
                'الصف': s.gradeLevel,
                'الفصل': s.className
            };
            
            if (activeTab === 'YEAR_WORK') {
                const yw = calculateYearWork(s);
                rowData['واجبات'] = yw.hwGrade;
                rowData['أنشطة'] = yw.actGrade;
                rowData['حضور'] = yw.attGrade;
                rowData['اختبارات'] = yw.examGrade;
                rowData['المجموع'] = yw.total;
            } else {
                filteredAssignments.forEach(a => {
                    rowData[`${a.title} (${a.maxScore})`] = scores[s.id]?.[a.id] || '';
                });
            }
            return rowData;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Scores");
        XLSX.writeFile(wb, `Tracking_${activeTab}_${selectedClass || 'All'}.xlsx`);
    };

    // --- Calculation Logic (Year Work) ---
    const calculateYearWork = (student: Student) => {
        // 1. Filter Logic
        const filterByPeriod = (p: PerformanceRecord) => {
            if (activeTerm) {
                return p.date >= activeTerm.startDate && p.date <= activeTerm.endDate;
            }
            return true;
        };

        // 2. Homework (10 Marks)
        const hwRecs = performance.filter(p => p.studentId === student.id && p.category === 'HOMEWORK' && p.subject === selectedSubject && filterByPeriod(p));
        const hwCols = getAssignments('HOMEWORK', currentUser?.id, isManager).filter(a => !activeTerm || !a.termId || a.termId === activeTerm.id);
        const distinctHW = new Set(hwRecs.map(p => p.notes || p.title)).size; 
        const hwGrade = hwCols.length > 0 ? Math.min((distinctHW / hwCols.length) * 10, 10) : (hwRecs.length > 0 ? 10 : 0);

        // 3. Activity (15 Marks)
        const actRecs = performance.filter(p => p.studentId === student.id && p.category === 'ACTIVITY' && p.subject === selectedSubject && filterByPeriod(p));
        let actSumVal = 0;
        actRecs.forEach(p => actSumVal += p.score);
        const actGrade = activityTarget > 0 ? Math.min((actSumVal / activityTarget) * 15, 15) : 0;

        // 4. Attendance (15 Marks)
        const termAtt = attendance.filter(a => 
            a.studentId === student.id && 
            (!activeTerm || (a.date >= activeTerm.startDate && a.date <= activeTerm.endDate))
        );
        const present = termAtt.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE || a.status === AttendanceStatus.EXCUSED).length;
        const attGrade = termAtt.length > 0 ? (present / termAtt.length) * 15 : 15;

        // 5. Exams (20 Marks)
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
            {/* Top Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Table className="text-purple-600"/> سجل الرصد والمتابعة
                        </h2>
                    </div>
                    
                    {/* Filters Section */}
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="flex items-center bg-gray-50 border rounded-lg px-2 py-1">
                            <Calendar size={16} className="text-gray-400 ml-2"/>
                            <select 
                                className="bg-transparent text-sm font-bold text-gray-700 outline-none min-w-[120px]"
                                value={selectedTermId}
                                onChange={e => setSelectedTermId(e.target.value)}
                            >
                                <option value="">كل الفترات</option>
                                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>

                        <select 
                            className="p-2 border rounded-lg bg-gray-50 text-sm font-bold min-w-[120px]"
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                        >
                            <option value="">-- المادة --</option>
                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>

                        <select 
                            className="p-2 border rounded-lg bg-gray-50 text-sm font-bold min-w-[120px]"
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                        >
                            <option value="">-- الفصل --</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-wrap justify-between items-center gap-4 border-t pt-4">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <button onClick={() => setActiveTab('HOMEWORK')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'HOMEWORK' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>الواجبات</button>
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'ACTIVITY' ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-100'}`}>الأنشطة</button>
                        <button onClick={() => setActiveTab('PLATFORM_EXAM')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'PLATFORM_EXAM' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}>الاختبارات</button>
                        <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'YEAR_WORK' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>أعمال السنة (تجميعي)</button>
                    </div>

                    <div className="flex gap-2">
                        {activeTab !== 'YEAR_WORK' && (
                            <>
                                <button onClick={handleAddAssignment} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-200">
                                    <Plus size={16}/> عمود جديد
                                </button>
                                <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-100 border border-green-200">
                                    <FileSpreadsheet size={16}/> استيراد إكسل
                                </button>
                            </>
                        )}
                        <button onClick={handleExport} className="flex items-center gap-1 bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-100 border border-gray-200">
                            <Download size={16}/> تصدير
                        </button>
                        {activeTab !== 'YEAR_WORK' && (
                            <button onClick={handleSaveScores} disabled={isSaving} className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 shadow-md">
                                {isSaving ? <Settings size={16} className="animate-spin"/> : <Save size={16}/>} حفظ التغييرات
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Table */}
            {selectedClass ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                            <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border-l w-12 bg-gray-50">#</th>
                                    <th className="p-3 border-l w-64 text-right bg-gray-50 sticky right-0 z-20 shadow-md">اسم الطالب</th>
                                    
                                    {activeTab === 'YEAR_WORK' ? (
                                        <>
                                            <th className="p-3 border-l bg-blue-50 text-blue-800">واجبات (10)</th>
                                            <th className="p-3 border-l bg-amber-50 text-amber-800">أنشطة (15)</th>
                                            <th className="p-3 border-l bg-green-50 text-green-800">حضور (15)</th>
                                            <th className="p-3 border-l bg-purple-50 text-purple-800">اختبارات (20)</th>
                                            <th className="p-3 border-l bg-gray-800 text-white">المجموع (60)</th>
                                        </>
                                    ) : (
                                        filteredAssignments.map(assign => (
                                            <th key={assign.id} className="p-2 border-l min-w-[100px] group relative">
                                                <div className="flex flex-col items-center">
                                                    <span>{assign.title}</span>
                                                    <span className="text-[10px] text-gray-400 bg-white px-1 rounded border">Max: {assign.maxScore}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteAssignment(assign.id)}
                                                    className="absolute top-1 left-1 text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                                <td className="p-3 border-l text-gray-500">{idx + 1}</td>
                                                <td className="p-3 border-l text-right font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-sm">{student.name}</td>
                                                <td className="p-3 border-l font-bold bg-blue-50/30">{yw.hwGrade.toFixed(1)}</td>
                                                <td className="p-3 border-l font-bold bg-amber-50/30">{yw.actGrade.toFixed(1)}</td>
                                                <td className="p-3 border-l font-bold bg-green-50/30">{yw.attGrade.toFixed(1)}</td>
                                                <td className="p-3 border-l font-bold bg-purple-50/30">{yw.examGrade.toFixed(1)}</td>
                                                <td className="p-3 border-l font-black text-white bg-gray-800">{yw.total.toFixed(1)}</td>
                                            </tr>
                                        );
                                    }

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 border-b transition-colors">
                                            <td className="p-3 border-l text-gray-500">{idx + 1}</td>
                                            <td className="p-3 border-l text-right font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-sm">{student.name}</td>
                                            {filteredAssignments.map(assign => (
                                                <td key={assign.id} className="p-0 border-l relative h-10">
                                                    <input 
                                                        type="number"
                                                        className={`w-full h-full p-2 text-center outline-none bg-transparent focus:bg-indigo-50 font-medium ${scores[student.id]?.[assign.id] ? 'text-indigo-700 font-bold' : 'text-gray-400'}`}
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
                        {activeTab !== 'YEAR_WORK' && filteredAssignments.length === 0 && <div className="p-10 text-center text-gray-400">لم تقم بإضافة أي أعمدة (واجبات/اختبارات) لهذا الفصل الدراسي. اضغط "عمود جديد"</div>}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                    <Table size={48} className="mb-4 opacity-20"/>
                    <p>الرجاء اختيار الفصل والمادة لعرض السجل</p>
                </div>
            )}

            {/* Import Modal */}
            {isImportModalOpen && !isManager && (
                <div className="fixed inset-0 z-[100] bg-white">
                    <DataImport 
                        existingStudents={students}
                        onImportStudents={() => {}}
                        onImportAttendance={() => {}} 
                        onImportPerformance={(records) => {
                            onAddPerformance(records);
                            setIsImportModalOpen(false);
                            // Force refresh might be needed or handled by parent
                            alert('تم استيراد الدرجات بنجاح');
                        }}
                        forcedType="PERFORMANCE"
                        onClose={() => setIsImportModalOpen(false)}
                        currentUser={currentUser}
                    />
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
