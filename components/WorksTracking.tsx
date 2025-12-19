import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, saveAssignment, deleteAssignment, getStudents, getWorksMasterUrl, saveWorksMasterUrl, bulkAddPerformance, deletePerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, Table, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, DownloadCloud, X, Check, RefreshCw, Loader2, CheckSquare, Zap, Edit2, Grid, ListFilter, Tag, Maximize, CloudLightning, ChevronRight, PieChart, Info, AlertCircle, Printer, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const STUDENT_NAME_HEADERS = [
    'الاسم', 'اسم', 'اسم الطالب', 'الطالب', 'اسمك', 'لطالب', 
    'الاسم الثلاثي', 'الاسم الرباعي', 'الاسم الكامل',
    'name', 'student', 'student name', 'full name', 'student_name'
];

const DEFAULT_CATEGORIES = [
    { id: 'HOMEWORK', label: 'الواجبات' },
    { id: 'ACTIVITY', label: 'الأنشطة' },
    { id: 'PLATFORM_EXAM', label: 'الاختبارات' },
];

const CATEGORY_LABELS: Record<string, string> = {
    'HOMEWORK': 'الواجبات',
    'ACTIVITY': 'الأنشطة',
    'PLATFORM_EXAM': 'الاختبارات',
    'YEAR_WORK': 'أعمال السنة',
    'OTHER': 'عام'
};

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance, currentUser }) => {
    const isManager = currentUser?.role === 'SCHOOL_MANAGER';
    
    const [activeTab, setActiveTab] = useState<string>(() => {
        const saved = localStorage.getItem('works_active_tab');
        return saved || 'HOMEWORK';
    });

    useEffect(() => {
        localStorage.setItem('works_active_tab', activeTab);
    }, [activeTab]);
    
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedPeriodId, setSelectedPeriodId] = useState(() => localStorage.getItem('works_period_id') || ''); 
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || '');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 
    
    useEffect(() => localStorage.setItem('works_term_id', selectedTermId), [selectedTermId]);
    useEffect(() => localStorage.setItem('works_period_id', selectedPeriodId), [selectedPeriodId]);
    useEffect(() => localStorage.setItem('works_subject', selectedSubject), [selectedSubject]);
    useEffect(() => localStorage.setItem('works_class', selectedClass), [selectedClass]);

    const [searchTerm, setSearchTerm] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); 

    // إعدادات توزيع درجات أعمال السنة
    const [yearWorkConfig, setYearWorkConfig] = useState<{ hw: number, act: number, att: number, exam: number }>({
        hw: 10, act: 10, att: 5, exam: 20
    });

    const [googleSheetUrl, setGoogleSheetUrl] = useState('');
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheetName, setSelectedSheetName] = useState('');
    
    const [settingTermId, setSettingTermId] = useState('');
    const [settingPeriodId, setSettingPeriodId] = useState('');
    
    const [importCategory, setImportCategory] = useState<string>('HOMEWORK');
    const [customImportCategory, setCustomImportCategory] = useState('');
    
    const [isFetchingStructure, setIsFetchingStructure] = useState(false);
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]); 
    const [workbookRef, setWorkbookRef] = useState<any>(null);
    const [columnConfigs, setColumnConfigs] = useState<Record<string, { maxScore: string, url: string }>>({});

    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'DISTRIBUTION'>('MANUAL');
    const [newColTitle, setNewColTitle] = useState('');
    const [newColMax, setNewColMax] = useState('10');
    const [newColUrl, setNewColUrl] = useState(''); 
    const [newColCategory, setNewColCategory] = useState<string>('HOMEWORK');
    const [newCustomCategory, setNewCustomCategory] = useState(''); 
    
    const [mobileGradingMode, setMobileGradingMode] = useState(false);
    const [selectedMobileAssignment, setSelectedMobileAssignment] = useState<Assignment | null>(null);
    const [compactMode, setCompactMode] = useState(false);

    // تحميل إعدادات التوزيع المحفوظة
    useEffect(() => {
        const savedConfig = localStorage.getItem('works_year_config');
        if (savedConfig) setYearWorkConfig(JSON.parse(savedConfig));
    }, []);

    // تحديث الأعمدة عند تغيير ورقة العمل في إكسل
    useEffect(() => {
        if (workbookRef && selectedSheetName) {
            const { headers, data } = getSheetHeadersAndData(workbookRef, selectedSheetName);
            setAvailableHeaders(headers);
            setSheetData(data);
            
            const initialConfigs: Record<string, { maxScore: string, url: string }> = {};
            headers.forEach(header => {
                let maxVal = 0;
                data.forEach(r => {
                    const v = parseFloat(r[header]);
                    if(!isNaN(v) && v > maxVal) maxVal = v;
                });
                let suggestedMax = maxVal > 0 ? Math.ceil(maxVal) : 10;
                initialConfigs[header] = { maxScore: suggestedMax.toString(), url: '' };
            });
            setColumnConfigs(initialConfigs);
        }
    }, [selectedSheetName, workbookRef]);

    const findStudentNameInRow = (row: any): string | undefined => {
        for (const key of STUDENT_NAME_HEADERS) { if (row[key]) return String(row[key]); }
        const rowKeys = Object.keys(row);
        for (const key of rowKeys) {
            const lowerKey = key.toLowerCase().trim();
            if (STUDENT_NAME_HEADERS.some(h => lowerKey === h || lowerKey.includes(h))) { return String(row[key]); }
        }
        return undefined;
    };

    const handleQuickSheetSync = useCallback(async (isAuto = false) => {
        if (!googleSheetUrl) return;
        setIsSheetSyncing(true);
        try {
            const { workbook } = await fetchWorkbookStructureUrl(googleSheetUrl);
            const linkedAssignments = assignments.filter(a => a.sourceMetadata);
            if (linkedAssignments.length === 0) { if(!isAuto) alert('لا توجد أعمدة مرتبطة.'); setIsSheetSyncing(false); return; }
            const assignmentsBySheet: Record<string, Assignment[]> = {};
            linkedAssignments.forEach(a => { try { const meta = JSON.parse(a.sourceMetadata!); const sheet = meta.sheet; if (!assignmentsBySheet[sheet]) assignmentsBySheet[sheet] = []; assignmentsBySheet[sheet].push(a); } catch (e) {} });
            const newRecords: PerformanceRecord[] = [];
            let updatedCount = 0;
            for (const sheetName of Object.keys(assignmentsBySheet)) {
                if (!workbook.SheetNames.includes(sheetName)) continue;
                const { data } = getSheetHeadersAndData(workbook, sheetName);
                const sheetAssignments = assignmentsBySheet[sheetName];
                for (const row of data) {
                    const identifier = findStudentNameInRow(row); 
                    if (!identifier) continue;
                    const student = students.find(s => s.name === identifier || s.nationalId === identifier || s.name.includes(identifier));
                    if (student) {
                        sheetAssignments.forEach(assign => {
                            const meta = JSON.parse(assign.sourceMetadata!);
                            const rawVal = row[meta.header];
                            if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                                const numVal = parseFloat(rawVal);
                                if (!isNaN(numVal)) {
                                    newRecords.push({
                                        id: `${student.id}_${assign.id}`, studentId: student.id, subject: selectedSubject || 'عام', title: assign.title, category: assign.category, score: numVal, maxScore: assign.maxScore, date: new Date().toISOString().split('T')[0], notes: assign.id, createdById: currentUser?.id
                                    });
                                    updatedCount++;
                                }
                            }
                        });
                    }
                }
            }
            if (newRecords.length > 0) { onAddPerformance(newRecords); if(!isAuto) alert(`تم تحديث ${updatedCount} درجة!`); } else { if(!isAuto) alert('لم يتم العثور على درجات جديدة.'); }
        } catch (e: any) { console.error(e); if(!isAuto) alert(`فشل التحديث: ${e.message}`); } finally { setIsSheetSyncing(false); }
    }, [googleSheetUrl, assignments, students, selectedSubject, currentUser, onAddPerformance]);

    useEffect(() => {
        if (currentUser) {
            const subs = getSubjects(currentUser.id); setSubjects(subs);
            const loadedTerms = getAcademicTerms(currentUser.id); setTerms(loadedTerms);
            const savedUrl = getWorksMasterUrl(); if (savedUrl) setGoogleSheetUrl(savedUrl);
            if (!localStorage.getItem('works_term_id')) {
                const current = loadedTerms.find(t => t.isCurrent);
                if (current) { setSelectedTermId(current.id); setSettingTermId(current.id); }
            } else { setSettingTermId(selectedTermId); }
            if (!localStorage.getItem('works_subject') && subs.length > 0) { setSelectedSubject(subs[0].name); }
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
        }
    }, [activeTab, currentUser, isManager, selectedTermId, selectedPeriodId, isSettingsOpen]);

    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        DEFAULT_CATEGORIES.forEach(c => cats.add(c.id));
        assignments.forEach(a => { if (a.category && a.category !== 'YEAR_WORK') cats.add(a.category); });
        return Array.from(cats);
    }, [assignments]);

    useEffect(() => {
        const newScores: Record<string, Record<string, string>> = {};
        let filtered = students;
        if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass);
        filtered.forEach(s => {
            newScores[s.id] = {};
            const studentPerf = performance.filter(p => p.studentId === s.id && p.subject === selectedSubject && (activeTab === 'YEAR_WORK' || p.category === activeTab));
            studentPerf.forEach(p => {
                if (p.notes && assignments.some(a => a.id === p.notes)) { newScores[s.id][p.notes] = p.score.toString(); } 
                else { const assign = assignments.find(a => a.title === p.title); if (assign) { newScores[s.id][assign.id] = p.score.toString(); } }
            });
        });
        setScores(newScores);
    }, [students, selectedClass, performance, selectedSubject, activeTab, assignments]);

    const handleScoreChange = (studentId: string, assignmentId: string, val: string) => {
        setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [assignmentId]: val } }));
        if (autoSaveEnabled) { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); autoSaveTimerRef.current = setTimeout(() => { handleSaveScores(true); }, 2000); }
    };

    const handleSaveScores = (silent = false) => {
        if (!selectedSubject) { if(!silent) alert('الرجاء اختيار المادة'); return; }
        setIsSaving(true);
        const recordsToSave: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];
        Object.keys(scores).forEach(studentId => {
            Object.keys(scores[studentId]).forEach(assignmentId => {
                const val = scores[studentId][assignmentId];
                if (val !== undefined && val !== '') {
                    const assignment = assignments.find(a => a.id === assignmentId);
                    if (assignment) {
                        const existingRecord = performance.find(p => p.studentId === studentId && (p.notes === assignmentId || p.title === assignment.title));
                        if (!existingRecord || existingRecord.score !== parseFloat(val)) {
                            recordsToSave.push({ id: existingRecord ? existingRecord.id : `${studentId}_${assignmentId}`, studentId, subject: selectedSubject, title: assignment.title, category: assignment.category, score: parseFloat(val), maxScore: assignment.maxScore, date: existingRecord ? existingRecord.date : today, notes: assignment.id, createdById: currentUser?.id });
                        }
                    }
                }
            });
        });
        if (recordsToSave.length > 0) { onAddPerformance(recordsToSave); }
        setTimeout(() => setIsSaving(false), 500);
    };

    const handleAddColumn = () => {
        if (!newColTitle) return;
        const categoryToUse = newColCategory === 'CUSTOM' ? newCustomCategory : newColCategory;
        if (!categoryToUse) return;
        const newAssign: Assignment = { id: Date.now().toString(), title: newColTitle, category: categoryToUse as PerformanceCategory, maxScore: Number(newColMax), url: newColUrl, isVisible: true, teacherId: currentUser?.id, termId: settingTermId || selectedTermId, periodId: settingPeriodId || selectedPeriodId };
        saveAssignment(newAssign);
        setNewColTitle(''); setNewColUrl(''); setNewCustomCategory('');
    };

    const handleDeleteColumn = (id: string) => { if(confirm('حذف هذا العمود والدرجات المرتبطة به؟')) { deleteAssignment(id); setAssignments(getAssignments('ALL', currentUser?.id, isManager)); } };
    
    const handleFetchSheetHeaders = async () => {
        if (!googleSheetUrl) return;
        setIsFetchingStructure(true);
        try {
            saveWorksMasterUrl(googleSheetUrl);
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(googleSheetUrl);
            setWorkbookRef(workbook); 
            setSheetNames(sheetNames);
            if (sheetNames.length > 0) { setSelectedSheetName(sheetNames[0]); }
        } catch (e: any) { alert(e.message); } finally { setIsFetchingStructure(false); }
    };

    const handleImportColumnFromSheet = (header: string) => {
        const categoryToUse = importCategory === 'CUSTOM' ? customImportCategory : importCategory;
        if (!categoryToUse) { alert('الرجاء تحديد تصنيف العمود أولاً'); return; }
        const config = columnConfigs[header] || { maxScore: '10', url: '' };
        const max = parseFloat(config.maxScore) || 10;
        const newAssign: Assignment = { id: Date.now().toString(), title: header, category: categoryToUse as PerformanceCategory, maxScore: max, url: config.url, isVisible: true, teacherId: currentUser?.id, sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header }), termId: settingTermId || selectedTermId, periodId: settingPeriodId || selectedPeriodId };
        saveAssignment(newAssign); 
        alert(`تم إضافة العمود "${header}" بنجاح!`);
    };

    const handleColumnConfigChange = (header: string, field: 'maxScore' | 'url', value: string) => { setColumnConfigs(prev => ({ ...prev, [header]: { ...prev[header], [field]: value } })); };

    const saveYearWorkSettings = () => {
        localStorage.setItem('works_year_config', JSON.stringify(yearWorkConfig));
        alert('تم حفظ توزيع الدرجات بنجاح');
    };

    // حساب درجات أعمال السنة للطالب
    const calculateYearWork = (student: Student) => {
        const studentPerf = performance.filter(p => p.studentId === student.id && p.subject === selectedSubject);
        
        // تصفية حسب الدرجات المرتبطة بالأعمدة في التيرم المختار
        const relevantAssignments = assignments.filter(a => !selectedTermId || a.termId === selectedTermId);
        const relevantAssignmentIds = new Set(relevantAssignments.map(a => a.id));

        const getCategoryScore = (cat: string) => {
            const records = studentPerf.filter(p => {
                if (p.category !== cat) return false;
                if (p.notes && relevantAssignmentIds.has(p.notes)) return true;
                return relevantAssignments.some(a => a.title === p.title && a.category === cat);
            });
            
            const totalScore = records.reduce((a, b) => a + b.score, 0);
            const totalMax = records.reduce((a, b) => a + b.maxScore, 0);
            return totalMax > 0 ? (totalScore / totalMax) : 0;
        };

        const hwGrade = getCategoryScore('HOMEWORK') * yearWorkConfig.hw;
        const actGrade = getCategoryScore('ACTIVITY') * yearWorkConfig.act;
        const examGrade = getCategoryScore('PLATFORM_EXAM') * yearWorkConfig.exam;
        
        // حساب الحضور (تبسيطي: نسبة الحضور من درجة الحضور المخصصة)
        const studentAtt = attendance.filter(a => a.studentId === student.id);
        const totalDays = studentAtt.length;
        const presentDays = studentAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const attGrade = totalDays > 0 ? (presentDays / totalDays) * yearWorkConfig.att : yearWorkConfig.att;

        return {
            hw: Math.round(hwGrade * 10) / 10,
            act: Math.round(actGrade * 10) / 10,
            att: Math.round(attGrade * 10) / 10,
            exam: Math.round(examGrade * 10) / 10,
            total: Math.round((hwGrade + actGrade + attGrade + examGrade) * 10) / 10
        };
    };

    const activeTerm = terms.find(t => t.id === selectedTermId);
    const activePeriods = useMemo(() => { if (!activeTerm?.periods) return []; return [...activeTerm.periods].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || '')); }, [activeTerm]);
    const settingsTermObj = terms.find(t => t.id === settingTermId);
    const settingsPeriods = useMemo(() => { if (!settingsTermObj?.periods) return []; return [...settingsTermObj.periods].sort((a, b) => (a.startDate || '').localeCompare(b.startDate || '')); }, [settingsTermObj]);
    const uniqueClasses = useMemo(() => { const classes = new Set(students.map(s => s.className).filter(Boolean)); return Array.from(classes).sort(); }, [students]);
    const filteredStudents = useMemo(() => { let filtered = students; if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass); if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm)); return filtered.sort((a,b) => a.name.localeCompare(b.name)); }, [students, selectedClass, searchTerm]);
    const filteredAssignments = useMemo(() => { if (activeTab === 'YEAR_WORK') return []; return assignments.filter(a => { const termMatch = !selectedTermId || (a.termId === selectedTermId); const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId; const categoryMatch = a.category === activeTab; return termMatch && periodMatch && categoryMatch; }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0)); }, [assignments, selectedTermId, selectedPeriodId, activeTab]);
    const settingsAssignments = useMemo(() => { return assignments.filter(a => { const termMatch = !settingTermId || a.termId === settingTermId; const periodMatch = !settingPeriodId || a.periodId === settingPeriodId; return termMatch && periodMatch; }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0)); }, [assignments, settingTermId, settingPeriodId]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative">
            
            {/* HEADER AREA */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col gap-4 print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Table className="text-purple-600"/> سجل الرصد والمتابعة</h2>
                        {isSaving && <span className="text-xs text-blue-600 font-bold flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> حفظ...</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold w-full md:min-w-[120px]" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                            <option value="">كل الفترات</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold w-full md:min-w-[120px]" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                            <option value="">-- المادة --</option>
                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                        <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold w-full md:min-w-[120px]" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                            <option value="">كل الفصول</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-4 border-t pt-4">
                    <div className="flex gap-2 overflow-x-auto pb-1 max-w-full md:max-w-[80%] no-scrollbar">
                        {availableCategories.map(cat => (
                            <button key={cat} onClick={() => setActiveTab(cat)} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === cat ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                                {CATEGORY_LABELS[cat] || cat}
                            </button>
                        ))}
                        <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'YEAR_WORK' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                            أعمال السنة (تجميعي)
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="bg-white border text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 shadow-sm flex items-center gap-1">
                            <Printer size={16}/> طباعة
                        </button>
                        <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-200">
                            <Settings size={16}/> <span className="hidden md:inline">إعدادات الأعمدة</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[800px]">
                        <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 w-10">#</th>
                                <th className="p-3 text-right sticky right-0 bg-gray-50 z-20 w-64">اسم الطالب</th>
                                
                                {activeTab === 'YEAR_WORK' ? (
                                    <>
                                        <th className="p-2 border-l bg-blue-50 text-blue-800">واجبات ({yearWorkConfig.hw})</th>
                                        <th className="p-2 border-l bg-amber-50 text-amber-800">أنشطة ({yearWorkConfig.act})</th>
                                        <th className="p-2 border-l bg-green-50 text-green-800">حضور ({yearWorkConfig.att})</th>
                                        <th className="p-2 border-l bg-purple-50 text-purple-800">اختبارات ({yearWorkConfig.exam})</th>
                                        <th className="p-2 border-l bg-gray-800 text-white font-black">المجموع الكلي</th>
                                    </>
                                ) : (
                                    filteredAssignments.map(assign => (
                                        <th key={assign.id} className="p-2 border-l min-w-[100px] group">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="truncate max-w-[120px]">{assign.title}</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] text-gray-400 bg-white px-1 rounded border">Max: {assign.maxScore}</span>
                                                    <button onClick={() => handleDeleteColumn(assign.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 size={10}/>
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student, idx) => {
                                if (activeTab === 'YEAR_WORK') {
                                    const yearStats = calculateYearWork(student);
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 border-b">
                                            <td className="p-3 text-gray-500">{idx + 1}</td>
                                            <td className="p-3 text-right font-bold text-gray-800 sticky right-0 bg-white z-10">{student.name}</td>
                                            <td className="p-3 border-l font-bold text-blue-700">{yearStats.hw}</td>
                                            <td className="p-3 border-l font-bold text-amber-700">{yearStats.act}</td>
                                            <td className="p-3 border-l font-bold text-green-700">{yearStats.att}</td>
                                            <td className="p-3 border-l font-bold text-purple-700">{yearStats.exam}</td>
                                            <td className="p-3 border-l font-black text-gray-900 bg-gray-50">{yearStats.total}</td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 border-b transition-colors">
                                        <td className="p-3 text-gray-500">{idx + 1}</td>
                                        <td className="p-3 text-right font-bold text-gray-800 sticky right-0 bg-white z-10">{student.name}</td>
                                        {filteredAssignments.map(assign => (
                                            <td key={assign.id} className="p-0 border-l h-10">
                                                <input 
                                                    type="number"
                                                    className="w-full h-full text-center outline-none bg-transparent focus:bg-indigo-50 font-medium"
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
                </div>
            </div>

            {/* SETTINGS MODAL */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-bounce-in overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings size={18}/> إدارة الأعمدة والربط</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        
                        <div className="flex border-b">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'MANUAL' ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50' : 'text-gray-500 hover:bg-gray-50'}`}>إدارة يدوية</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'SHEET' ? 'border-b-2 border-green-600 text-green-700 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}>ربط Google Sheet</button>
                            <button onClick={() => setSettingsTab('DISTRIBUTION')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'DISTRIBUTION' ? 'border-b-2 border-orange-600 text-orange-700 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}>توزيع الدرجات</button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 bg-gray-50">
                            {/* MANUAL TAB */}
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-wrap gap-4 items-center">
                                        <span className="text-xs font-bold text-blue-800 flex items-center gap-1"><ListFilter size={14}/> السياق الحالي:</span>
                                        <select className="p-1.5 border rounded text-xs bg-white font-bold" value={settingTermId} onChange={e => { setSettingTermId(e.target.value); setSettingPeriodId(''); }}>
                                            <option value="">اختر الفصل الدراسي...</option>
                                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">عنوان العمود</label>
                                            <input className="w-full p-2 border rounded-lg text-sm" placeholder="مثال: واجب 1" value={newColTitle} onChange={e => setNewColTitle(e.target.value)}/>
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">الدرجة</label>
                                            <input type="number" className="w-full p-2 border rounded-lg text-sm text-center" value={newColMax} onChange={e => setNewColMax(e.target.value)}/>
                                        </div>
                                        <div className="w-40">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">التصنيف</label>
                                            <select className="w-full p-2 border rounded-lg text-sm bg-white" value={newColCategory} onChange={e => setNewColCategory(e.target.value)}>
                                                {DEFAULT_CATEGORIES.map(cat => ( <option key={cat.id} value={cat.id}>{cat.label}</option> ))}
                                                <option value="CUSTOM">أخرى / جديد...</option>
                                            </select>
                                        </div>
                                        {newColCategory === 'CUSTOM' && (
                                            <div className="w-32">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">اسم التبويب</label>
                                                <input className="w-full p-2 border rounded-lg text-sm bg-yellow-50" placeholder="مثال: مشاريع" value={newCustomCategory} onChange={e => setNewCustomCategory(e.target.value)}/>
                                            </div>
                                        )}
                                        <button onClick={handleAddColumn} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 flex items-center gap-2"><Plus size={16}/> إضافة</button>
                                    </div>

                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="p-3 bg-gray-50 border-b text-xs font-bold text-gray-500 flex">
                                            <div className="flex-1">عنوان العمود</div>
                                            <div className="w-24 text-center">الدرجة</div>
                                            <div className="w-32 text-center">التصنيف</div>
                                            <div className="w-20 text-center">حذف</div>
                                        </div>
                                        <div className="divide-y max-h-60 overflow-y-auto">
                                            {settingsAssignments.map(assign => (
                                                <div key={assign.id} className="p-3 flex items-center hover:bg-gray-50">
                                                    <div className="flex-1 font-bold text-gray-700 text-sm">{assign.title}</div>
                                                    <div className="w-24 text-center text-sm font-mono">{assign.maxScore}</div>
                                                    <div className="w-32 text-center text-xs bg-gray-100 px-2 py-1 rounded">{CATEGORY_LABELS[assign.category] || assign.category}</div>
                                                    <div className="w-20 text-center"><button onClick={() => handleDeleteColumn(assign.id)} className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"><Trash2 size={16}/></button></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SHEET TAB */}
                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6">
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
                                        <label className="block text-sm font-bold text-green-800 mb-2">رابط ملف Google Sheet</label>
                                        <div className="flex gap-2">
                                            <input className="flex-1 p-2 border border-green-300 rounded-lg text-sm dir-ltr text-left outline-none focus:ring-2 focus:ring-green-500" value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                                            <button onClick={handleFetchSheetHeaders} disabled={isFetchingStructure} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2 shadow-sm disabled:opacity-50">{isFetchingStructure ? <Loader2 size={16} className="animate-spin"/> : <CloudLightning size={16}/>} جلب الأوراق</button>
                                        </div>
                                    </div>

                                    {sheetNames.length > 0 && (
                                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                            <div className="p-3 bg-gray-50 border-b flex flex-wrap gap-4 items-center">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 block mb-1">من ورقة العمل:</label>
                                                    <div className="flex items-center gap-2">
                                                        <FileSpreadsheet size={14} className="text-blue-600"/>
                                                        <select className="p-1.5 border rounded text-xs bg-white font-bold min-w-[150px]" value={selectedSheetName} onChange={e => setSelectedSheetName(e.target.value)}>
                                                            {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 block mb-1">التصنيف المستهدف:</label>
                                                    <div className="flex items-center gap-2">
                                                        <Tag size={14} className="text-green-600"/>
                                                        <select className="p-1.5 border rounded text-xs bg-white font-bold min-w-[120px]" value={importCategory} onChange={e => setImportCategory(e.target.value)}>{DEFAULT_CATEGORIES.map(cat => (<option key={cat.id} value={cat.id}>{cat.label}</option>))}<option value="CUSTOM">أخرى...</option></select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="max-h-[400px] overflow-y-auto">
                                                <div className="grid grid-cols-12 gap-2 p-3 bg-gray-100 text-[10px] font-bold text-gray-500 border-b uppercase">
                                                    <div className="col-span-2 text-center">إجراء</div>
                                                    <div className="col-span-2 text-center">الدرجة القصوى</div>
                                                    <div className="col-span-8 text-right px-4">اسم العمود في الملف</div>
                                                </div>
                                                <div className="divide-y">
                                                    {availableHeaders.map(h => {
                                                        const config = columnConfigs[h] || { maxScore: '10', url: '' };
                                                        const isAlreadyAdded = assignments.some(a => {
                                                            try {
                                                                const meta = JSON.parse(a.sourceMetadata || '{}');
                                                                return meta.sheet === selectedSheetName && meta.header === h;
                                                            } catch { return false; }
                                                        });

                                                        return (
                                                            <div key={h} className="grid grid-cols-12 gap-2 p-2 items-center hover:bg-green-50 transition-colors group">
                                                                <div className="col-span-2 text-center">
                                                                    {isAlreadyAdded ? (
                                                                        <span className="text-[10px] font-bold text-green-600 flex items-center justify-center gap-1"><Check size={12}/> مضاف مسبقاً</span>
                                                                    ) : (
                                                                        <button onClick={() => handleImportColumnFromSheet(h)} className="w-full py-1 bg-white border border-green-500 text-green-600 rounded text-[10px] font-bold hover:bg-green-600 hover:text-white transition-all shadow-sm">استيراد</button>
                                                                    )}
                                                                </div>
                                                                <div className="col-span-2 px-2">
                                                                    <input type="number" className="w-full p-1 border rounded text-xs text-center font-bold bg-white" value={config.maxScore} onChange={e => handleColumnConfigChange(h, 'maxScore', e.target.value)}/>
                                                                </div>
                                                                <div className="col-span-8 text-right font-bold text-gray-700 text-xs truncate px-4" title={h}>{h}</div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* DISTRIBUTION TAB */}
                            {settingsTab === 'DISTRIBUTION' && (
                                <div className="max-w-2xl mx-auto space-y-6">
                                    <div className="bg-white p-6 rounded-2xl border shadow-sm">
                                        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                                            <PieChart className="text-orange-600"/> توزيع درجات أعمال السنة
                                        </h3>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 mb-1">الواجبات</label>
                                                <input type="number" className="w-full p-3 border rounded-xl font-black text-center" value={yearWorkConfig.hw} onChange={e => setYearWorkConfig({...yearWorkConfig, hw: Number(e.target.value)})}/>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 mb-1">الأنشطة</label>
                                                <input type="number" className="w-full p-3 border rounded-xl font-black text-center" value={yearWorkConfig.act} onChange={e => setYearWorkConfig({...yearWorkConfig, act: Number(e.target.value)})}/>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 mb-1">الحضور</label>
                                                <input type="number" className="w-full p-3 border rounded-xl font-black text-center" value={yearWorkConfig.att} onChange={e => setYearWorkConfig({...yearWorkConfig, att: Number(e.target.value)})}/>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-600 mb-1">الاختبارات</label>
                                                <input type="number" className="w-full p-3 border rounded-xl font-black text-center" value={yearWorkConfig.exam} onChange={e => setYearWorkConfig({...yearWorkConfig, exam: Number(e.target.value)})}/>
                                            </div>
                                        </div>
                                        <div className="mt-8 pt-6 border-t flex justify-between items-center">
                                            <div className="text-lg font-black text-indigo-700">المجموع الكلي: {yearWorkConfig.hw + yearWorkConfig.act + yearWorkConfig.att + yearWorkConfig.exam}</div>
                                            <button onClick={saveYearWorkSettings} className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 shadow-lg transition-transform active:scale-95">حفظ التوزيع</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;