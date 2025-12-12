
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, saveAssignment, deleteAssignment, getStudents, getWorksMasterUrl, saveWorksMasterUrl, downloadFromSupabase, bulkAddPerformance, deletePerformance, forceRefreshData } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, Filter, Table, Download, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, Link as LinkIcon, DownloadCloud, X, Check, ExternalLink, RefreshCw, Loader2, CheckSquare, Square, AlertTriangle, ArrowRight, Calculator, CloudLightning, Zap, TrendingDown, TrendingUp } from 'lucide-react';
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
    
    const [activeTab, setActiveTab] = useState<'HOMEWORK' | 'ACTIVITY' | 'PLATFORM_EXAM' | 'YEAR_WORK'>(() => {
        const saved = localStorage.getItem('works_active_tab');
        return (saved === 'HOMEWORK' || saved === 'ACTIVITY' || saved === 'PLATFORM_EXAM' || saved === 'YEAR_WORK') ? saved : 'HOMEWORK';
    });

    useEffect(() => {
        localStorage.setItem('works_active_tab', activeTab);
    }, [activeTab]);
    
    const [selectedTermId, setSelectedTermId] = useState('');
    const [selectedPeriodId, setSelectedPeriodId] = useState(''); 
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedClass, setSelectedClass] = useState(''); 
    const [searchTerm, setSearchTerm] = useState('');

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); 

    const [yearWorkConfig, setYearWorkConfig] = useState<{ hw: number, act: number, att: number, exam: number }>({
        hw: 10, act: 15, att: 15, exam: 20
    });

    useEffect(() => {
        if (currentUser) {
            setSubjects(getSubjects(currentUser.id));
            const loadedTerms = getAcademicTerms(currentUser.id);
            setTerms(loadedTerms);
            
            const current = loadedTerms.find(t => t.isCurrent);
            if (current) setSelectedTermId(current.id);
            else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);
            
            const subs = getSubjects(currentUser.id);
            if(subs.length > 0) setSelectedSubject(subs[0].name);
        }
    }, [currentUser]);

    const fetchAssignments = useCallback((category: string) => {
        return getAssignments(category === 'YEAR_WORK' ? 'ALL' : category, currentUser?.id, isManager);
    }, [currentUser, isManager]);

    useEffect(() => {
        if (currentUser) {
            setAssignments(fetchAssignments(activeTab));
        }
    }, [activeTab, currentUser, isManager, selectedTermId, selectedPeriodId, fetchAssignments]);

    useEffect(() => {
        const newScores: Record<string, Record<string, string>> = {};
        
        let filtered = students;
        if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass);
        
        filtered.forEach(s => {
            newScores[s.id] = {};
            const studentPerf = performance.filter(p => 
                p.studentId === s.id && 
                p.subject === selectedSubject &&
                (activeTab === 'YEAR_WORK' || p.category === activeTab)
            );

            studentPerf.forEach(p => {
                if (p.notes) { 
                     newScores[s.id][p.notes] = p.score.toString();
                } else { 
                     const assign = assignments.find(a => a.title === p.title);
                     if (assign) newScores[s.id][assign.id] = p.score.toString();
                }
            });
        });
        setScores(newScores);
    }, [students, selectedClass, performance, selectedSubject, activeTab, assignments]);

    const handleScoreChange = (studentId: string, assignmentId: string, val: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [assignmentId]: val }
        }));

        if (autoSaveEnabled) {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(() => {
                handleSaveScores(true); 
            }, 1500); 
        }
    };

    const handleSaveScores = (silent = false) => {
        if (!selectedSubject) {
            if(!silent) alert('الرجاء اختيار المادة');
            return;
        }
        setIsSaving(true);
        const recordsToSave: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];

        Object.keys(scores).forEach(studentId => {
            Object.keys(scores[studentId]).forEach(assignmentId => {
                const val = scores[studentId][assignmentId];
                if (val !== undefined && val !== '') {
                    const assignment = assignments.find(a => a.id === assignmentId);
                    if (assignment) {
                        const existingRecord = performance.find(p => p.studentId === studentId && p.notes === assignmentId);
                        
                        if (!existingRecord || existingRecord.score !== parseFloat(val)) {
                            recordsToSave.push({
                                id: existingRecord ? existingRecord.id : `${studentId}_${assignmentId}`,
                                studentId,
                                subject: selectedSubject,
                                title: assignment.title,
                                category: assignment.category,
                                score: parseFloat(val),
                                maxScore: assignment.maxScore,
                                date: existingRecord ? existingRecord.date : today,
                                notes: assignment.id,
                                createdById: currentUser?.id
                            });
                        }
                    }
                }
            });
        });

        if (recordsToSave.length > 0) {
            onAddPerformance(recordsToSave); // Use parent handler to ensure state update
            setLastSaved(new Date());
        }
        
        setTimeout(() => setIsSaving(false), 500);
    };

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
        return assignments.filter(a => {
            const termMatch = !selectedTermId || (a.termId === selectedTermId);
            const periodMatch = !selectedPeriodId || !a.periodId || (a.periodId === selectedPeriodId);
            return termMatch && periodMatch;
        }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    }, [assignments, selectedTermId, selectedPeriodId, activeTab]);

    const handleAddColumn = () => {
        const title = prompt('عنوان العمود الجديد (مثال: واجب 5):');
        if (!title) return;
        const max = prompt('الدرجة العظمى:', '10');
        const newAssign: Assignment = {
            id: Date.now().toString(),
            title, category: activeTab as any, maxScore: Number(max) || 10, isVisible: true, teacherId: currentUser?.id, termId: selectedTermId || undefined
        };
        saveAssignment(newAssign);
        setAssignments(fetchAssignments(activeTab));
    };

    // Render Logic for Score Cell
    const getScoreStyle = (score: number, max: number) => {
        const ratio = score / max;
        if (ratio === 1) return 'bg-green-50 text-green-700 font-bold border-green-200'; // Full Mark
        if (ratio < 0.5) return 'bg-red-50 text-red-700 font-bold border-red-200'; // Fail
        return 'text-gray-800';
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative">
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Table className="text-purple-600"/> سجل الدرجات الإلكتروني</h2>
                        {isSaving && <span className="text-xs text-blue-600 font-bold flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> جاري الحفظ...</span>}
                        {!isSaving && lastSaved && <span className="text-[10px] text-gray-400">محفوظ: {lastSaved.toLocaleTimeString()}</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="flex items-center bg-gray-50 border rounded-lg px-2 py-1">
                            <Filter size={16} className="text-gray-400 ml-2"/>
                            <select className="bg-transparent text-sm font-bold text-gray-700 outline-none min-w-[100px]" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                                <option value="">كل الفترات</option>
                                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold min-w-[120px]" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                            <option value="">-- المادة --</option>
                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                        <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold min-w-[120px]" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                            <option value="">كل الفصول</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-4 border-t pt-4">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <button onClick={() => setActiveTab('HOMEWORK')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'HOMEWORK' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>الواجبات</button>
                        <button onClick={() => setActiveTab('ACTIVITY')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'ACTIVITY' ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-100'}`}>الأنشطة</button>
                        <button onClick={() => setActiveTab('PLATFORM_EXAM')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'PLATFORM_EXAM' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}>الاختبارات</button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={handleAddColumn} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-200">
                            <Plus size={16}/> عمود جديد
                        </button>
                        <button onClick={() => handleSaveScores(false)} disabled={isSaving} className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 shadow-md transition-transform hover:scale-105">
                            {isSaving ? <Settings size={16} className="animate-spin"/> : <Save size={16}/>} حفظ التغييرات
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid Area */}
            {filteredStudents.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                            <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 border-l w-12 bg-gray-50">#</th>
                                    <th className="p-3 border-l w-64 text-right bg-gray-50 sticky right-0 z-20 shadow-md">اسم الطالب</th>
                                    
                                    {/* Completion Stats */}
                                    <th className="p-2 border-l w-24 bg-gray-100 font-bold text-gray-600">% الإنجاز</th>
                                    <th className="p-2 border-l w-24 bg-gray-200 font-bold text-gray-800">المجموع</th>

                                    {/* Dynamic Columns */}
                                    {filteredAssignments.map(assign => (
                                        <th key={assign.id} className="p-2 border-l min-w-[100px] group relative">
                                            <div className="flex flex-col items-center">
                                                <span className="flex items-center gap-1 truncate max-w-[120px]" title={assign.title}>{assign.title}</span>
                                                <span className="text-[10px] text-gray-400 bg-white px-1 rounded border">Max: {assign.maxScore}</span>
                                            </div>
                                            <button onClick={() => {if(confirm('حذف العمود؟')) {deleteAssignment(assign.id); setAssignments(fetchAssignments(activeTab))}}} className="absolute top-1 left-1 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student, idx) => {
                                    // Calculations
                                    let totalScore = 0;
                                    let totalMax = 0;
                                    filteredAssignments.forEach(a => {
                                        const rawVal = scores[student.id]?.[a.id];
                                        if (rawVal && !isNaN(parseFloat(rawVal))) totalScore += parseFloat(rawVal);
                                        totalMax += a.maxScore;
                                    });
                                    const completionRate = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 border-b transition-colors">
                                            <td className="p-3 border-l text-gray-500">{idx + 1}</td>
                                            <td className="p-3 border-l text-right font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-sm">{student.name}</td>
                                            
                                            {/* Stats Cells */}
                                            <td className="p-3 border-l">
                                                <div className={`px-2 py-1 rounded font-bold text-xs ${completionRate >= 80 ? 'bg-green-100 text-green-700' : completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                    {completionRate}%
                                                </div>
                                            </td>
                                            <td className="p-3 border-l font-black text-gray-800 bg-gray-50">
                                                {totalScore}
                                            </td>

                                            {/* Input Cells */}
                                            {filteredAssignments.map(assign => {
                                                const val = scores[student.id]?.[assign.id];
                                                const numVal = parseFloat(val || '0');
                                                const cellStyle = val ? getScoreStyle(numVal, assign.maxScore) : 'text-gray-400';

                                                return (
                                                    <td key={assign.id} className="p-0 border-l relative h-10">
                                                        <input 
                                                            type="number"
                                                            className={`w-full h-full p-2 text-center outline-none bg-transparent focus:bg-indigo-50 font-medium transition-colors ${cellStyle}`}
                                                            value={val || ''}
                                                            onChange={e => handleScoreChange(student.id, assign.id, e.target.value)}
                                                            placeholder="-"
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredAssignments.length === 0 && (
                            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                                <Table size={48} className="mb-4 opacity-20"/>
                                <p>لم تقم بإضافة أي أعمدة (واجبات/اختبارات) لهذا التصنيف بعد.</p>
                                <button onClick={handleAddColumn} className="mt-4 text-blue-600 hover:underline">إضافة عمود الآن</button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                    <Table size={48} className="mb-4 opacity-20"/>
                    <p>اختر الفصل والمادة لعرض السجل.</p>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
