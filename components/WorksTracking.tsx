
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, saveAssignment, deleteAssignment, getStudents, getWorksMasterUrl, saveWorksMasterUrl, downloadFromSupabase, bulkAddPerformance, deletePerformance, forceRefreshData } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, Filter, Table, Download, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, Link as LinkIcon, DownloadCloud, X, Check, ExternalLink, RefreshCw, Loader2, CheckSquare, Square, AlertTriangle, ArrowRight, Calculator, CloudLightning, Zap, Database } from 'lucide-react';
import * as XLSX from 'xlsx';
import DataImport from './DataImport';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const IGNORED_COLUMNS = [
    'name', 'id', 'class', 'grade', 'student', 'section', 'email', 'phone', 'mobile', 'gender', 'national', 'date', 'time', 'timestamp',
    'الاسم', 'اسم', 'الطالب', 'طالب', 'الفصل', 'الصف', 'الهوية', 'السجل', 'المدني', 'الجوال', 'هاتف', 'بريد', 'ملاحظات', 'ملاحظة', 'جنس', 'تاريخ',
    'note', 'nationalid', 'student_name', 'full_name', 'الاسم الثلاثي', 'الاسم الرباعي'
];

const STUDENT_NAME_HEADERS = [
    'الاسم', 'اسم', 'اسم الطالب', 'الطالب', 'اسمك', 'لطالب', 
    'الاسم الثلاثي', 'الاسم الرباعي', 'الاسم الكامل',
    'name', 'student', 'student name', 'full name', 'student_name'
];

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance, currentUser }) => {
    const isManager = currentUser?.role === 'SCHOOL_MANAGER';
    
    // -- State --
    const [activeTab, setActiveTab] = useState<'HOMEWORK' | 'ACTIVITY' | 'PLATFORM_EXAM' | 'YEAR_WORK'>(() => {
        const saved = localStorage.getItem('works_active_tab');
        return (saved === 'HOMEWORK' || saved === 'ACTIVITY' || saved === 'PLATFORM_EXAM' || saved === 'YEAR_WORK') ? saved : 'HOMEWORK';
    });

    const [selectedTermId, setSelectedTermId] = useState('');
    const [selectedPeriodId, setSelectedPeriodId] = useState(''); 
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedClass, setSelectedClass] = useState(''); 
    const [searchTerm, setSearchTerm] = useState('');

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    // Scores Matrix: { [studentId]: { [assignmentId]: "score" } }
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    
    // UI Status
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Refs for Safe Auto-Saving (Avoid Stale Closures)
    const scoresRef = useRef(scores);
    const assignmentsRef = useRef(assignments);
    
    // Sync UI
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [syncStatusMsg, setSyncStatusMsg] = useState('');
    
    // Modals
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Config
    const [googleSheetUrl, setGoogleSheetUrl] = useState('');
    
    // --- Initialization ---
    useEffect(() => {
        if (currentUser) {
            setSubjects(getSubjects(currentUser.id));
            const loadedTerms = getAcademicTerms(currentUser.id);
            setTerms(loadedTerms);
            
            const savedUrl = getWorksMasterUrl();
            if (savedUrl) setGoogleSheetUrl(savedUrl);

            // Default selections
            const current = loadedTerms.find(t => t.isCurrent);
            if (current) {
                setSelectedTermId(current.id);
            } else if (loadedTerms.length > 0) {
                setSelectedTermId(loadedTerms[0].id);
            }
        }
    }, [currentUser]);

    useEffect(() => {
        if (!selectedSubject && subjects.length > 0) {
            setSelectedSubject(subjects[0].name);
        }
    }, [subjects, selectedSubject]);

    // Determine active term & period objects
    const activeTermObj = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);
    const termPeriods = useMemo(() => activeTermObj?.periods || [], [activeTermObj]);

    // --- Data Fetching ---
    const fetchAssignments = useCallback((category: string) => {
        return getAssignments(category === 'YEAR_WORK' ? 'ALL' : category, currentUser?.id, isManager);
    }, [currentUser, isManager]);

    // Update assignments when tab or filters change
    useEffect(() => {
        if (currentUser) {
            const fetched = fetchAssignments(activeTab);
            setAssignments(fetched);
            assignmentsRef.current = fetched;
        }
    }, [activeTab, currentUser, isManager, fetchAssignments]);

    // Update Refs constantly
    useEffect(() => { scoresRef.current = scores; }, [scores]);

    // --- Populate Scores Grid ---
    useEffect(() => {
        const newScores: Record<string, Record<string, string>> = {};
        
        // Filter students for current view
        let targetStudents = students;
        if (selectedClass) targetStudents = targetStudents.filter(s => s.className === selectedClass);
        
        targetStudents.forEach(s => {
            newScores[s.id] = {};
            // Get relevant performance records
            const studentPerf = performance.filter(p => 
                p.studentId === s.id && 
                p.subject === selectedSubject &&
                (activeTab === 'YEAR_WORK' || p.category === activeTab)
            );

            studentPerf.forEach(p => {
                // Link record to assignment ID
                if (p.notes && assignments.some(a => a.id === p.notes)) { 
                     newScores[s.id][p.notes] = p.score.toString();
                } else { 
                     // Weak link by Title (Legacy/Imported)
                     const assign = assignments.find(a => a.title === p.title);
                     if (assign) newScores[s.id][assign.id] = p.score.toString();
                }
            });
        });
        setScores(newScores);
    }, [students, selectedClass, performance, selectedSubject, activeTab, assignments]);

    // --- Handlers ---

    // 1. Tab Switching (SAFE)
    const handleTabChange = (newTab: typeof activeTab) => {
        // Force save BEFORE switching to prevent data loss due to state reset
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        handleSaveScores(true); 
        setActiveTab(newTab);
        localStorage.setItem('works_active_tab', newTab);
    };

    // 2. Score Input Change
    const handleScoreChange = (studentId: string, assignmentId: string, val: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: { ...prev[studentId], [assignmentId]: val }
        }));

        if (autoSaveEnabled) {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(() => {
                handleSaveScores(true); 
            }, 1000); // Faster save (1s)
        }
    };

    // 3. Save Logic (The Core Fix)
    const handleSaveScores = (silent = false) => {
        if (!selectedSubject) {
            if(!silent && activeTab !== 'YEAR_WORK') alert('الرجاء اختيار المادة');
            return;
        }
        if (activeTab === 'YEAR_WORK') return; // Year work is read-only calculation

        setIsSaving(true);
        
        const recordsToSave: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];
        
        // Use REFS to ensure we have latest state even if closure is stale
        const currentScores = scoresRef.current;
        const currentAssignments = assignmentsRef.current;

        Object.keys(currentScores).forEach(studentId => {
            Object.keys(currentScores[studentId]).forEach(assignmentId => {
                const val = currentScores[studentId][assignmentId];
                if (val !== undefined && val !== '') {
                    const assignment = currentAssignments.find(a => a.id === assignmentId);
                    if (assignment) {
                        // Find existing record to preserve ID/Date
                        const existingRecord = performance.find(p => 
                            p.studentId === studentId && 
                            (p.notes === assignmentId || p.title === assignment.title)
                        );
                        
                        const numVal = parseFloat(val);
                        
                        // Only add to save list if changed or new
                        if (!existingRecord || existingRecord.score !== numVal) {
                            recordsToSave.push({
                                id: existingRecord ? existingRecord.id : `${studentId}_${assignmentId}_${Date.now()}`,
                                studentId,
                                subject: selectedSubject,
                                title: assignment.title,
                                category: assignment.category,
                                score: numVal,
                                maxScore: assignment.maxScore,
                                date: existingRecord ? existingRecord.date : today,
                                notes: assignment.id, // Link by ID
                                createdById: currentUser?.id
                            });
                        }
                    }
                }
            });
        });

        if (recordsToSave.length > 0) {
            bulkAddPerformance(recordsToSave);
            setLastSaved(new Date());
        }
        
        setTimeout(() => setIsSaving(false), 500);
    };

    // 4. Google Sheet Sync (Restored Logic)
    const findStudentNameInRow = (row: any): string | undefined => {
        for (const key of STUDENT_NAME_HEADERS) {
            if (row[key]) return String(row[key]);
        }
        const rowKeys = Object.keys(row);
        for (const key of rowKeys) {
            const lowerKey = key.toLowerCase().trim();
            if (STUDENT_NAME_HEADERS.some(h => lowerKey === h || lowerKey.includes(h))) {
                return String(row[key]);
            }
        }
        return undefined;
    };

    const handleQuickSheetSync = useCallback(async (isAuto = false) => {
        const url = getWorksMasterUrl();
        if (!url) {
            if (!isAuto) alert('لا يوجد رابط ملف مسجل. يرجى إعداده من "إعدادات الأعمدة".');
            return;
        }
        
        if (!selectedSubject) {
            if (!isAuto) alert('الرجاء اختيار المادة أولاً.');
            return;
        }

        setIsSheetSyncing(true);
        setSyncStatusMsg('جاري الاتصال بملف الدرجات...');
        
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(url);
            if (sheetNames.length === 0) throw new Error('الملف فارغ');
            
            // Assume first sheet contains the grades
            const { data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            
            // Re-fetch assignments inside the function to ensure we have latest (especially if called after add column)
            // Or rely on assignmentsRef
            const currentAssignments = getAssignments('ALL', currentUser?.id, isManager);
            
            const updates: PerformanceRecord[] = [];
            let updateCount = 0;

            students.forEach(student => {
                // Find row in Excel
                const row = data.find(r => {
                    if (r['nationalId'] == student.nationalId) return true;
                    const rName = findStudentNameInRow(r);
                    if (rName && (rName === student.name || rName.includes(student.name) || student.name.includes(rName))) return true;
                    return false;
                });

                if (row) {
                    currentAssignments.forEach(assign => {
                        // Try to find a column with the Assignment Title
                        let val = row[assign.title];
                        
                        if (val !== undefined) {
                            const numVal = parseFloat(val);
                            if (!isNaN(numVal)) {
                                updates.push({
                                    id: `${student.id}_${assign.id}_sync`, 
                                    studentId: student.id,
                                    subject: selectedSubject,
                                    title: assign.title,
                                    category: assign.category,
                                    score: numVal,
                                    maxScore: assign.maxScore,
                                    date: new Date().toISOString().split('T')[0],
                                    notes: assign.id,
                                    createdById: currentUser?.id
                                });
                                updateCount++;
                            }
                        }
                    });
                }
            });

            if (updates.length > 0) {
                bulkAddPerformance(updates); // Save to DB
                if (!isAuto) alert(`تم تحديث ${updateCount} درجة بنجاح من الملف!`);
            } else {
                if (!isAuto) alert('لم يتم العثور على درجات مطابقة في الملف. تأكد من تطابق عناوين الأعمدة.');
            }

        } catch (e: any) {
            if (!isAuto) alert('خطأ في المزامنة: ' + e.message);
        } finally {
            setIsSheetSyncing(false);
            setSyncStatusMsg('');
        }
    }, [currentUser, students, selectedSubject]);

    // --- Manual Column Management ---
    const handleAddManualColumn = () => {
        const title = prompt('عنوان العمود (مثال: واجب 1):');
        if (!title) return;
        const max = prompt('الدرجة العظمى:', '10');
        const newAssign: Assignment = {
            id: Date.now().toString(),
            title, category: activeTab as any, maxScore: Number(max) || 10, isVisible: true, 
            teacherId: currentUser?.id, 
            termId: selectedTermId || undefined, 
            periodId: selectedPeriodId || undefined
        };
        saveAssignment(newAssign);
        // Force refresh assignments locally
        const updated = fetchAssignments(activeTab);
        setAssignments(updated);
        assignmentsRef.current = updated;
    };

    const handleDeleteAssignment = (id: string) => {
        if(confirm('حذف العمود؟ سيتم حذف الدرجات المرتبطة به إذا لم تكن محفوظة مسبقاً.')) {
            deleteAssignment(id);
            const updated = fetchAssignments(activeTab);
            setAssignments(updated);
            assignmentsRef.current = updated;
        }
    };

    // --- Filtering ---
    const filteredAssignments = useMemo(() => {
        if (activeTab === 'YEAR_WORK') return [];
        return assignments.filter(a => {
            const termMatch = !selectedTermId || !a.termId || (a.termId === selectedTermId);
            const periodMatch = !selectedPeriodId || !a.periodId || (a.periodId === selectedPeriodId);
            return termMatch && periodMatch;
        }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    }, [assignments, selectedTermId, selectedPeriodId, activeTab]);

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
    
    const filteredStudents = useMemo(() => {
        let filtered = students;
        if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass);
        if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm));
        return filtered.sort((a,b) => a.name.localeCompare(b.name));
    }, [students, selectedClass, searchTerm]);

    // --- Year Work Calculation ---
    const yearWorkData = useMemo(() => {
        if (activeTab !== 'YEAR_WORK') return [];
        
        return filteredStudents.map(student => {
            // Filter Attendance
            let studentAtt = attendance.filter(a => a.studentId === student.id);
            if (activeTermObj) {
                studentAtt = studentAtt.filter(a => a.date >= activeTermObj.startDate && a.date <= activeTermObj.endDate);
            }
            const totalDays = studentAtt.length;
            const present = studentAtt.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
            const attScore = totalDays > 0 ? (present / totalDays) * 15 : 15; // 15 marks

            // Filter Performance
            let studentPerf = performance.filter(p => p.studentId === student.id && p.subject === selectedSubject);
            if (activeTermObj) {
                studentPerf = studentPerf.filter(p => p.date >= activeTermObj.startDate && p.date <= activeTermObj.endDate);
            }

            // Calc Categories
            const calcCategory = (cat: string, maxWeight: number) => {
                const items = studentPerf.filter(p => p.category === cat);
                if (items.length === 0) return 0; // Or full mark if empty? Standard practice is 0 if no data
                // Better approach: sum scores vs sum max scores
                let scoreSum = 0;
                let maxSum = 0;
                items.forEach(i => { scoreSum += i.score; maxSum += (i.maxScore || 10); });
                return maxSum > 0 ? (scoreSum / maxSum) * maxWeight : 0;
            };

            const hwScore = calcCategory('HOMEWORK', 10);
            const actScore = calcCategory('ACTIVITY', 15);
            const examScore = calcCategory('PLATFORM_EXAM', 20);
            
            const total = attScore + hwScore + actScore + examScore;

            return {
                id: student.id,
                name: student.name,
                att: Math.round(attScore),
                hw: Math.round(hwScore),
                act: Math.round(actScore),
                exam: Math.round(examScore),
                total: Math.round(total)
            };
        });
    }, [filteredStudents, attendance, performance, activeTermObj, activeTab, selectedSubject]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative">
            
            {/* Sync Indicator */}
            {isSheetSyncing && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-2 rounded-full shadow-xl z-50 flex items-center gap-2 animate-bounce">
                    <RefreshCw size={18} className="animate-spin"/> 
                    <span className="font-bold">{syncStatusMsg}</span>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Table className="text-purple-600"/> سجل الرصد والمتابعة</h2>
                        {/* Auto Save Toggle */}
                        {activeTab !== 'YEAR_WORK' && (
                            <div 
                                className={`flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer transition-colors text-xs font-bold ${autoSaveEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                            >
                                <div className={`w-3 h-3 rounded-full ${autoSaveEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                {autoSaveEnabled ? 'الحفظ التلقائي مفعل' : 'الحفظ التلقائي معطل'}
                            </div>
                        )}
                        {isSaving && <span className="text-xs text-blue-600 font-bold flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> جاري الحفظ...</span>}
                        {!isSaving && lastSaved && <span className="text-[10px] text-gray-400">آخر حفظ: {lastSaved.toLocaleTimeString()}</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="flex items-center bg-gray-50 border rounded-lg px-2 py-1">
                            <Calendar size={16} className="text-gray-400 ml-2"/>
                            <select className="bg-transparent text-sm font-bold text-gray-700 outline-none min-w-[120px]" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                                <option value="">كل الفصول الدراسية</option>
                                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        
                        {/* PERIOD SELECTOR */}
                        {termPeriods.length > 0 && (
                            <div className="flex items-center bg-gray-50 border rounded-lg px-2 py-1 animate-fade-in">
                                <span className="text-xs text-gray-400 font-bold ml-1">الفترة:</span>
                                <select className="bg-transparent text-sm font-bold text-gray-700 outline-none" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                                    <option value="">الكل (عام)</option>
                                    {termPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        )}

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
                        <button onClick={() => handleTabChange('HOMEWORK')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'HOMEWORK' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>الواجبات</button>
                        <button onClick={() => handleTabChange('ACTIVITY')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'ACTIVITY' ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:bg-gray-100'}`}>الأنشطة</button>
                        <button onClick={() => handleTabChange('PLATFORM_EXAM')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'PLATFORM_EXAM' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}>الاختبارات</button>
                        <button onClick={() => handleTabChange('YEAR_WORK')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${activeTab === 'YEAR_WORK' ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                            <Calculator size={14}/> أعمال السنة (تجميعي)
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {googleSheetUrl && (
                            <button 
                                onClick={() => handleQuickSheetSync(false)}
                                disabled={isSheetSyncing}
                                className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-100 border border-green-200"
                                title="سحب الدرجات من ملف Excel المرتبط"
                            >
                                <CloudLightning size={16}/> تحديث من الملف
                            </button>
                        )}
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-200">
                            <Settings size={16}/> إعدادات الأعمدة
                        </button>
                        <button onClick={() => handleAddManualColumn()} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 border border-gray-300">
                            <Plus size={16}/> إضافة عمود
                        </button>
                        {activeTab !== 'YEAR_WORK' && (
                            <button onClick={() => handleSaveScores(false)} disabled={isSaving} className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 shadow-md">
                                {isSaving ? <Settings size={16} className="animate-spin"/> : <Save size={16}/>} حفظ
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Table */}
            {filteredStudents.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                            {activeTab === 'YEAR_WORK' ? (
                                // --- YEAR WORK TABLE ---
                                <>
                                    <thead className="bg-teal-50 text-teal-800 font-bold sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-3 border-l w-12 bg-teal-50">#</th>
                                            <th className="p-3 border-l w-64 text-right bg-teal-50 sticky right-0 z-20 shadow-md">اسم الطالب</th>
                                            <th className="p-2 border-l">الحضور (15)</th>
                                            <th className="p-2 border-l">الواجبات (10)</th>
                                            <th className="p-2 border-l">الأنشطة (15)</th>
                                            <th className="p-2 border-l">اختبارات (20)</th>
                                            <th className="p-2 border-l bg-teal-100 text-teal-900">المجموع (60)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {yearWorkData.map((data, idx) => (
                                            <tr key={data.id} className="hover:bg-gray-50 border-b transition-colors">
                                                <td className="p-3 border-l text-gray-500">{idx + 1}</td>
                                                <td className="p-3 border-l text-right font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-sm">{data.name}</td>
                                                <td className="p-3 border-l font-bold text-gray-600">{data.att}</td>
                                                <td className="p-3 border-l font-bold text-blue-600">{data.hw}</td>
                                                <td className="p-3 border-l font-bold text-amber-600">{data.act}</td>
                                                <td className="p-3 border-l font-bold text-purple-600">{data.exam}</td>
                                                <td className="p-3 border-l font-black text-teal-800 bg-teal-50">{data.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            ) : (
                                // --- STANDARD TRACKING TABLE ---
                                <>
                                    <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-3 border-l w-12 bg-gray-50">#</th>
                                            <th className="p-3 border-l w-64 text-right bg-gray-50 sticky right-0 z-20 shadow-md">اسم الطالب</th>
                                            {filteredAssignments.map(assign => (
                                                <th key={assign.id} className="p-2 border-l min-w-[120px] group relative">
                                                    <div className="flex flex-col items-center">
                                                        <span className="flex items-center gap-1">
                                                            {assign.title}
                                                            <button onClick={() => handleDeleteAssignment(assign.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 bg-white px-1 rounded border">Max: {assign.maxScore}</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map((student, idx) => (
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
                                        ))}
                                    </tbody>
                                </>
                            )}
                        </table>
                        {activeTab !== 'YEAR_WORK' && filteredAssignments.length === 0 && (
                            <div className="p-10 text-center text-gray-400">
                                <p>لم تقم بإضافة أي أعمدة (واجبات/اختبارات).</p>
                                <button onClick={handleAddManualColumn} className="mt-2 text-primary font-bold underline">إضافة عمود الآن</button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                    <Table size={48} className="mb-4 opacity-20"/>
                    <p>لا توجد بيانات للعرض. تأكد من اختيار الفلتر المناسب.</p>
                </div>
            )}

            {/* Settings Modal (Restored) */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="font-bold text-lg">إعدادات الرصد الآلي</h3>
                            <button onClick={() => setIsSettingsOpen(false)}><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">رابط ملف الدرجات (Google Sheet / Excel)</label>
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 p-2 border rounded text-sm dir-ltr" 
                                        placeholder="https://docs.google.com/..." 
                                        value={googleSheetUrl}
                                        onChange={e => setGoogleSheetUrl(e.target.value)}
                                    />
                                    <button 
                                        onClick={() => { saveWorksMasterUrl(googleSheetUrl); alert('تم حفظ الرابط'); }}
                                        className="bg-blue-600 text-white px-3 py-2 rounded font-bold text-sm"
                                    >
                                        حفظ
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">
                                    يمكنك استخدام رابط Google Sheet (تأكد من إتاحة العرض للجميع) أو رابط مباشر لملف Excel.
                                    سيقوم النظام بمطابقة أعمدة الملف مع عناوين الواجبات/الاختبارات التي أنشأتها.
                                </p>
                            </div>
                            
                            <div className="pt-2 border-t">
                                <h4 className="font-bold text-sm mb-2 text-gray-600">إدارة الأعمدة الحالية</h4>
                                <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded border">
                                    {assignments.map(a => (
                                        <div key={a.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
                                            <span className="text-xs font-bold">{a.title} ({a.category})</span>
                                            <button onClick={() => handleDeleteAssignment(a.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={12}/></button>
                                        </div>
                                    ))}
                                    {assignments.length === 0 && <p className="text-center text-xs text-gray-400">لا توجد أعمدة</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
