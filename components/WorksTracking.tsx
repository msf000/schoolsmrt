import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory } from '../types';
// Removed forceRefreshData import as it does not exist in storageService
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, saveAssignment, deleteAssignment, getStudents, getWorksMasterUrl, saveWorksMasterUrl, downloadFromSupabase, bulkAddPerformance, deletePerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, Filter, Table, Download, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, Link as LinkIcon, DownloadCloud, X, Check, ExternalLink, RefreshCw, Loader2, CheckSquare, Square, AlertTriangle, ArrowRight, Calculator, CloudLightning, Zap, Edit2, Grid, ListFilter, Tag, ArrowDownToLine, Maximize, Link2, PieChart, ChevronRight, PenTool, Clipboard, Printer, MoreVertical } from 'lucide-react';
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
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [syncStatusMsg, setSyncStatusMsg] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); 

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

    useEffect(() => {
        const syncData = async () => {
            const savedUrl = getWorksMasterUrl();
            if (savedUrl) setTimeout(() => handleQuickSheetSync(true), 1000);
            setIsRefreshing(false);
        };
        syncData();
    }, []);

    useEffect(() => {
        if (window.innerWidth < 768) {
            setMobileGradingMode(true);
        }
    }, []);

    useEffect(() => {
        if (availableHeaders.length > 0 && sheetData.length > 0) {
            const initialConfigs: Record<string, { maxScore: string, url: string }> = {};
            availableHeaders.forEach(header => {
                let maxVal = 0;
                sheetData.forEach(r => {
                    const v = parseFloat(r[header]);
                    if(!isNaN(v) && v > maxVal) maxVal = v;
                });
                let suggestedMax = maxVal > 0 ? Math.ceil(maxVal) : 10;
                if (suggestedMax > 10 && suggestedMax <= 15) suggestedMax = 15;
                if (suggestedMax > 15 && suggestedMax <= 20) suggestedMax = 20;
                initialConfigs[header] = { maxScore: suggestedMax.toString(), url: '' };
            });
            setColumnConfigs(initialConfigs);
        }
    }, [availableHeaders, sheetData]);

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
        setSyncStatusMsg('جاري الاتصال بـ Google Sheet...');
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
        } catch (e: any) { console.error(e); if(!isAuto) alert(`فشل التحديث: ${e.message}`); } finally { setIsSheetSyncing(false); setSyncStatusMsg(''); }
    }, [googleSheetUrl, assignments, students, selectedSubject, currentUser, onAddPerformance]);

    useEffect(() => {
        if (currentUser) {
            const subs = getSubjects(currentUser.id); setSubjects(subs);
            const loadedTerms = getAcademicTerms(currentUser.id); setTerms(loadedTerms);
            const savedUrl = getWorksMasterUrl(); if (savedUrl) setGoogleSheetUrl(savedUrl);
            const savedConfig = localStorage.getItem('works_year_config'); if (savedConfig) setYearWorkConfig(JSON.parse(savedConfig));
            if (!localStorage.getItem('works_term_id')) {
                const current = loadedTerms.find(t => t.isCurrent);
                if (current) { setSelectedTermId(current.id); setSettingTermId(current.id); } else if (loadedTerms.length > 0) { setSelectedTermId(loadedTerms[0].id); setSettingTermId(loadedTerms[0].id); }
            } else { setSettingTermId(selectedTermId); }
            if (!localStorage.getItem('works_subject') && subs.length > 0) { setSelectedSubject(subs[0].name); }
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
        }
    }, [activeTab, currentUser, isManager, selectedTermId, selectedPeriodId]);

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

    const handlePaste = (e: React.ClipboardEvent, startStudentIdx: number, assignmentId: string) => {
        e.preventDefault();
        const clipboardData = e.clipboardData.getData('text');
        const rows = clipboardData.split(/\r\n|\n|\r/).filter(val => val.trim() !== '');
        const newScores = { ...scores };
        let modified = false;
        rows.forEach((val, i) => {
            const targetStudentIdx = startStudentIdx + i;
            if (targetStudentIdx < filteredStudents.length) {
                const studentId = filteredStudents[targetStudentIdx].id;
                if (!newScores[studentId]) newScores[studentId] = {};
                const num = parseFloat(val);
                if (!isNaN(num)) { newScores[studentId][assignmentId] = num.toString(); modified = true; }
            }
        });
        if (modified) { setScores(newScores); if (autoSaveEnabled) { setTimeout(() => handleSaveScores(true), 500); } }
    };

    const handleColumnFill = (assignmentId: string, maxScore: number) => {
        const val = prompt(`أدخل الدرجة لتعميمها على جميع الطلاب (Max: ${maxScore}):`, maxScore.toString());
        if (val === null) return;
        
        const numVal = parseFloat(val);
        if (isNaN(numVal)) return alert('الرجاء إدخال رقم صحيح');

        const newScores = { ...scores };
        filteredStudents.forEach(s => {
            if (!newScores[s.id]) newScores[s.id] = {};
            newScores[s.id][assignmentId] = val;
        });
        setScores(newScores);
        if (autoSaveEnabled) setTimeout(() => handleSaveScores(true), 500);
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
        if (recordsToSave.length > 0) { onAddPerformance(recordsToSave); setLastSaved(new Date()); }
        setTimeout(() => setIsSaving(false), 500);
    };

    const handleAddColumn = () => {
        if (!newColTitle) return;
        const categoryToUse = newColCategory === 'CUSTOM' ? newCustomCategory : newColCategory;
        if (!categoryToUse) return;
        // Fix: Added Type Casting as PerformanceCategory
        const newAssign: Assignment = { id: Date.now().toString(), title: newColTitle, category: categoryToUse as PerformanceCategory, maxScore: Number(newColMax), url: newColUrl, isVisible: true, teacherId: currentUser?.id, termId: settingTermId || selectedTermId, periodId: settingPeriodId || selectedPeriodId };
        saveAssignment(newAssign);
        setAssignments(getAssignments('ALL', currentUser?.id, isManager));
        setNewColTitle(''); setNewColUrl(''); setNewCustomCategory('');
    };

    const handleDeleteColumn = (id: string) => { if(confirm('حذف هذا العمود والدرجات المرتبطة به؟')) { deleteAssignment(id); setAssignments(getAssignments('ALL', currentUser?.id, isManager)); } };
    const handleUpdateColumn = (a: Assignment) => { saveAssignment(a); setAssignments(getAssignments('ALL', currentUser?.id, isManager)); };

    const handleFetchSheetHeaders = async () => {
        if (!googleSheetUrl) return;
        setIsFetchingStructure(true);
        try {
            saveWorksMasterUrl(googleSheetUrl);
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(googleSheetUrl);
            setWorkbookRef(workbook); setSheetNames(sheetNames);
            if (sheetNames.length > 0) { setSelectedSheetName(sheetNames[0]); const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]); setAvailableHeaders(headers); setSheetData(data); }
        } catch (e: any) { alert(e.message); } finally { setIsFetchingStructure(false); }
    };

    const handleImportColumnFromSheet = (header: string) => {
        const categoryToUse = importCategory === 'CUSTOM' ? customImportCategory : importCategory;
        if (!categoryToUse) { alert('الرجاء تحديد تصنيف العمود (التبويب) أولاً'); return; }
        const config = columnConfigs[header] || { maxScore: '10', url: '' };
        const max = parseFloat(config.maxScore) || 10;
        // Fix: Added Type Casting as PerformanceCategory
        const newAssign: Assignment = { id: Date.now().toString(), title: header, category: categoryToUse as PerformanceCategory, maxScore: max, url: config.url, isVisible: true, teacherId: currentUser?.id, sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header }), termId: settingTermId || selectedTermId, periodId: settingPeriodId || selectedPeriodId };
        saveAssignment(newAssign); setAssignments(getAssignments('ALL', currentUser?.id, isManager)); alert(`تم إضافة العمود "${header}" بنجاح!`);
    };

    const handleColumnConfigChange = (header: string, field: 'maxScore' | 'url', value: string) => { setColumnConfigs(prev => ({ ...prev, [header]: { ...prev[header], [field]: value } })); };
    const saveYearWorkSettings = () => { localStorage.setItem('works_year_config', JSON.stringify(yearWorkConfig)); alert('تم حفظ توزيع الدرجات بنجاح'); };

    const calculateYearWork = (student: Student) => {
        const relevantAssignments = assignments.filter(a => { const termMatch = !selectedTermId || a.termId === selectedTermId; const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId; return termMatch && periodMatch; });
        const relevantAssignmentIds = new Set(relevantAssignments.map(a => a.id));
        const activeTerm = terms.find(t => t.id === selectedTermId);
        let dateStart = activeTerm?.startDate; let dateEnd = activeTerm?.endDate;
        if (selectedPeriodId && activeTerm?.periods) { const p = activeTerm.periods.find(p => p.id === selectedPeriodId); if (p) { dateStart = p.startDate; dateEnd = p.endDate; } }
        const studentPerf = performance.filter(p => { if (p.studentId !== student.id || p.subject !== selectedSubject) return false; if (p.notes && relevantAssignmentIds.has(p.notes)) return true; return relevantAssignments.some(a => a.title === p.title); });
        
        const hwCols = relevantAssignments.filter(a => a.category === 'HOMEWORK');
        let hwTotalScore = 0; let hwTotalMax = 0;
        hwCols.forEach(col => { const p = studentPerf.find(r => r.notes === col.id || r.title === col.title); if (p) { hwTotalScore += p.score; hwTotalMax += p.maxScore; } else { hwTotalMax += col.maxScore; } });
        const hwGrade = hwTotalMax > 0 ? (hwTotalScore / hwTotalMax) * yearWorkConfig.hw : 0;

        const actCols = relevantAssignments.filter(a => a.category === 'ACTIVITY');
        let actTotalScore = 0; let actTotalMax = 0;
        actCols.forEach(col => { const p = studentPerf.find(r => r.notes === col.id || r.title === col.title); if (p) { actTotalScore += p.score; actTotalMax += p.maxScore; } else { actTotalMax += col.maxScore; } });
        const actGrade = actTotalMax > 0 ? (actTotalScore / actTotalMax) * yearWorkConfig.act : 0;

        const examCols = relevantAssignments.filter(a => a.category === 'PLATFORM_EXAM');
        let examTotalScore = 0; let examTotalMax = 0;
        examCols.forEach(col => { const p = studentPerf.find(r => r.notes === col.id || r.title === col.title); if (p) { examTotalScore += p.score; examTotalMax += p.maxScore; } else { examTotalMax += col.maxScore; } });
        const examGrade = examTotalMax > 0 ? (examTotalScore / examTotalMax) * yearWorkConfig.exam : 0;

        let studentAtt = attendance.filter(a => a.studentId === student.id && (!selectedSubject || a.subject === selectedSubject));
        if (dateStart && dateEnd) { studentAtt = studentAtt.filter(a => a.date >= dateStart! && a.date <= dateEnd!); }
        const totalDays = studentAtt.length;
        const presentDays = studentAtt.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
        const attGrade = totalDays > 0 ? (presentDays / totalDays) * yearWorkConfig.att : (totalDays === 0 ? yearWorkConfig.att : 0);

        const total = hwGrade + actGrade + examGrade + attGrade;
        return { 
            hwGrade: Math.round(hwGrade * 10) / 10, actGrade: Math.round(actGrade * 10) / 10, examGrade: Math.round(examGrade * 10) / 10, attGrade: Math.round(attGrade * 10) / 10, total: Math.round(total * 10) / 10, hwCompletion: hwTotalMax > 0 ? Math.round((hwTotalScore/hwTotalMax)*100) : 0, actCompletion: actTotalMax > 0 ? Math.round((actTotalScore/actTotalMax)*100) : 0
        };
    };

    const activeTerm = terms.find(t => t.id === selectedTermId);
    const activePeriods = useMemo(() => { if (!activeTerm?.periods) return []; return [...activeTerm.periods].sort((a, b) => { const dateA = a.startDate || ''; const dateB = b.startDate || ''; if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB); return a.name.localeCompare(b.name, 'ar'); }); }, [activeTerm]);
    const settingsTermObj = terms.find(t => t.id === settingTermId);
    const settingsPeriods = useMemo(() => { if (!settingsTermObj?.periods) return []; return [...settingsTermObj.periods].sort((a, b) => { const dateA = a.startDate || ''; const dateB = b.startDate || ''; if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB); return a.name.localeCompare(b.name, 'ar'); }); }, [settingsTermObj]);
    const uniqueClasses = useMemo(() => { const classes = new Set(students.map(s => s.className).filter(Boolean)); return Array.from(classes).sort(); }, [students]);
    const filteredStudents = useMemo(() => { let filtered = students; if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass); if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm)); return filtered.sort((a,b) => { if (a.className === b.className) return a.name.localeCompare(b.name); return (a.className || '').localeCompare(b.className || ''); }); }, [students, selectedClass, searchTerm]);
    const filteredAssignments = useMemo(() => { if (activeTab === 'YEAR_WORK') return []; return assignments.filter(a => { const termMatch = !selectedTermId || (a.termId === selectedTermId); const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId; const categoryMatch = a.category === activeTab; return termMatch && periodMatch && categoryMatch; }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0)); }, [assignments, selectedTermId, selectedPeriodId, activeTab]);
    const settingsAssignments = useMemo(() => { if (activeTab === 'YEAR_WORK') return []; return assignments.filter(a => { const termMatch = !settingTermId || a.termId === settingTermId; const periodMatch = !settingPeriodId || a.periodId === settingPeriodId; return termMatch && periodMatch; }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0)); }, [assignments, settingTermId, settingPeriodId, activeTab]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative">
            
            {/* Sync Indicator */}
            {isRefreshing && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 animate-pulse text-sm font-bold">
                    <RefreshCw size={16} className="animate-spin"/> جاري تحديث البيانات من السحابة...
                </div>
            )}

            {/* HEADER AREA - Hidden when printing */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col gap-4 print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Table className="text-purple-600"/> سجل الرصد والمتابعة</h2>
                        {activeTab !== 'YEAR_WORK' && (
                            <div 
                                className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border cursor-pointer transition-colors text-xs font-bold ${autoSaveEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                            >
                                <div className={`w-3 h-3 rounded-full ${autoSaveEnabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                {autoSaveEnabled ? 'حفظ تلقائي' : 'حفظ يدوي'}
                            </div>
                        )}
                        {isSaving && <span className="text-xs text-blue-600 font-bold flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> حفظ...</span>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <div className="flex items-center bg-gray-50 border rounded-lg px-2 py-1 flex-1 md:flex-none">
                            <Calendar size={16} className="text-gray-400 ml-2"/>
                            <select className="bg-transparent text-sm font-bold text-gray-700 outline-none w-full md:min-w-[120px]" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                                <option value="">كل الفترات</option>
                                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        {activePeriods.length > 0 && (
                            <div className="flex items-center bg-gray-50 border rounded-lg px-2 py-1 flex-1 md:flex-none">
                                <span className="text-xs text-gray-400 ml-1">الفترة:</span>
                                <select className="bg-transparent text-sm font-bold text-gray-700 outline-none w-full" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                                    <option value="">الكل (عام)</option>
                                    {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                        )}
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
                            <button 
                                key={cat}
                                onClick={() => setActiveTab(cat)} 
                                className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === cat ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                {CATEGORY_LABELS[cat] || cat}
                            </button>
                        ))}
                        <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'YEAR_WORK' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>أعمال السنة (تجميعي)</button>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto justify-end">
                        <button onClick={() => window.print()} className="flex items-center gap-1 bg-white border text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 shadow-sm">
                            <Printer size={16}/> طباعة
                        </button>
                        <button onClick={() => setCompactMode(!compactMode)} className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold shadow-sm ${compactMode ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white border text-gray-700 hover:bg-gray-50'}`}>
                            <Maximize size={16}/> عرض مضغوط
                        </button>
                        
                        {/* Mobile Toggle Mode */}
                        <div className="md:hidden flex bg-gray-100 rounded-lg p-1">
                            <button onClick={() => setMobileGradingMode(false)} className={`p-2 rounded ${!mobileGradingMode ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}><Grid size={16}/></button>
                            <button onClick={() => setMobileGradingMode(true)} className={`p-2 rounded ${mobileGradingMode ? 'bg-white shadow text-purple-700' : 'text-gray-500'}`}><ListFilter size={16}/></button>
                        </div>

                        {googleSheetUrl && (
                            <button 
                                onClick={() => handleQuickSheetSync(false)} 
                                disabled={isSheetSyncing}
                                className="hidden md:flex items-center gap-1 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-100 border border-green-200"
                                title="تحديث الدرجات من ملف Google Sheet المرتبط"
                            >
                                {isSheetSyncing ? <Loader2 size={16} className="animate-spin"/> : <CloudLightning size={16}/>} 
                                تحديث
                            </button>
                        )}
                        <button onClick={() => { setIsSettingsOpen(true); setSettingTermId(selectedTermId || ''); }} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-100 border border-indigo-200">
                            <Settings size={16}/> <span className="hidden md:inline">الإعدادات</span>
                        </button>
                        {activeTab !== 'YEAR_WORK' && (
                            <button onClick={() => handleSaveScores(false)} disabled={isSaving} className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 shadow-md">
                                {isSaving ? <Settings size={16} className="animate-spin"/> : <Save size={16}/>} حفظ
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* PRINT HEADER (Only visible when printing) */}
            <div className="hidden print:block mb-4 border-b-2 border-black pb-4">
                <div className="flex justify-between items-center text-sm font-bold">
                    <div className="text-right">
                        <p>المملكة العربية السعودية</p>
                        <p>وزارة التعليم</p>
                    </div>
                    <div className="text-center">
                        <h1 className="text-xl font-black mb-2">كشف رصد الدرجات - {CATEGORY_LABELS[activeTab] || activeTab}</h1>
                        <p>المادة: {selectedSubject} | الفصل: {selectedClass}</p>
                    </div>
                    <div className="text-left">
                        <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                        <p>{activeTerm ? activeTerm.name : ''}</p>
                    </div>
                </div>
            </div>

            {/* CONTENT AREA */}
            {mobileGradingMode && activeTab !== 'YEAR_WORK' ? (
                /* --- MOBILE LIST VIEW (BY ASSIGNMENT) --- */
                <div className="flex-1 overflow-hidden flex flex-col print:hidden">
                    {!selectedMobileAssignment ? (
                        /* List of Assignments */
                        <div className="grid gap-3 overflow-y-auto pb-20">
                            {filteredAssignments.length > 0 ? filteredAssignments.map(assign => {
                                // Calculate completion
                                const totalStudents = filteredStudents.length;
                                const gradedCount = filteredStudents.filter(s => scores[s.id]?.[assign.id]).length;
                                const pct = totalStudents > 0 ? Math.round((gradedCount / totalStudents) * 100) : 0;

                                return (
                                    <div 
                                        key={assign.id} 
                                        onClick={() => setSelectedMobileAssignment(assign)}
                                        className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm active:scale-[0.98] transition-all flex justify-between items-center"
                                    >
                                        <div>
                                            <h3 className="font-bold text-gray-800 text-lg">{assign.title}</h3>
                                            <p className="text-xs text-gray-500 mt-1">الدرجة العظمى: {assign.maxScore}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-xs font-bold px-2 py-1 rounded mb-1 ${pct === 100 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {pct}% مكتمل
                                            </span>
                                            <ChevronRight size={16} className="text-gray-400"/>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-20 text-gray-400">
                                    <p>لا توجد واجبات/اختبارات في هذا التبويب.</p>
                                    <button onClick={() => setIsSettingsOpen(true)} className="mt-4 text-blue-600 font-bold underline">إضافة جديد</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Grading Mode for Selected Assignment */
                        <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0 z-10">
                                <button onClick={() => setSelectedMobileAssignment(null)} className="flex items-center gap-1 text-gray-600 font-bold text-sm">
                                    <ArrowRight size={16}/> عودة
                                </button>
                                <div className="text-center">
                                    <h3 className="font-bold text-gray-800">{selectedMobileAssignment.title}</h3>
                                    <span className="text-xs text-gray-500">Max: {selectedMobileAssignment.maxScore}</span>
                                </div>
                                <button onClick={() => handleSaveScores(false)} className="text-primary"><Save size={20}/></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto">
                                {filteredStudents.length > 0 ? filteredStudents.map(student => {
                                    const today = new Date().toISOString().split('T')[0];
                                    const isAbsent = attendance.some(a => a.studentId === student.id && a.date === today && a.status === AttendanceStatus.ABSENT);
                                    
                                    return (
                                        <div key={student.id} className={`p-4 border-b flex justify-between items-center ${isAbsent ? 'bg-red-50' : 'bg-white'}`}>
                                            <div>
                                                <div className="font-bold text-gray-800">{student.name}</div>
                                                {isAbsent && <span className="text-[10px] text-red-600 font-bold">غائب اليوم</span>}
                                            </div>
                                            <div className="w-24">
                                                <input 
                                                    type="number" 
                                                    className={`w-full p-3 text-center border rounded-lg text-lg font-bold outline-none focus:ring-2 focus:ring-primary ${scores[student.id]?.[selectedMobileAssignment.id] ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50'}`}
                                                    placeholder="-"
                                                    value={scores[student.id]?.[selectedMobileAssignment.id] || ''}
                                                    onChange={e => handleScoreChange(student.id, selectedMobileAssignment.id, e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    );
                                }) : <div className="p-10 text-center text-gray-400">اختر فصلاً لعرض الطلاب</div>}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* --- DESKTOP TABLE VIEW --- */
                filteredStudents.length > 0 ? (
                    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col ${compactMode ? 'text-xs' : 'text-sm'}`}>
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-center border-collapse min-w-[800px] print:border-collapse print:w-full">
                                <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10 shadow-sm print:bg-gray-100 print:text-black">
                                    <tr>
                                        <th className={`border-l bg-gray-50 print:border print:bg-gray-100 w-10 ${compactMode ? 'p-1' : 'p-3'}`}>#</th>
                                        <th className={`border-l text-right bg-gray-50 sticky right-0 z-20 shadow-md print:border print:bg-gray-100 print:static print:shadow-none w-64 ${compactMode ? 'p-1' : 'p-3'}`}>اسم الطالب</th>
                                        
                                        {activeTab === 'YEAR_WORK' ? (
                                            <>
                                                <th className={`border-l bg-blue-50 text-blue-800 print:border print:bg-white print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>واجبات ({yearWorkConfig.hw})</th>
                                                <th className={`border-l bg-blue-50 text-blue-600 font-normal print:hidden ${compactMode ? 'p-1' : 'p-3'}`}>% الإنجاز</th>
                                                <th className={`border-l bg-amber-50 text-amber-800 print:border print:bg-white print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>أنشطة ({yearWorkConfig.act})</th>
                                                <th className={`border-l bg-amber-50 text-amber-600 font-normal print:hidden ${compactMode ? 'p-1' : 'p-3'}`}>% الإنجاز</th>
                                                <th className={`border-l bg-green-50 text-green-800 print:border print:bg-white print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>حضور ({yearWorkConfig.att})</th>
                                                <th className={`border-l bg-purple-50 text-purple-800 print:border print:bg-white print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>اختبارات ({yearWorkConfig.exam})</th>
                                                <th className={`border-l bg-gray-800 text-white print:border print:bg-gray-200 print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>المجموع ({yearWorkConfig.hw + yearWorkConfig.act + yearWorkConfig.att + yearWorkConfig.exam})</th>
                                            </>
                                        ) : (
                                            <>
                                                {(activeTab === 'HOMEWORK' || activeTab === 'ACTIVITY') && (
                                                    <>
                                                        <th className={`border-l w-16 bg-gray-100 font-bold text-gray-600 print:hidden ${compactMode ? 'p-1' : 'p-2'}`}>% الإنجاز</th>
                                                        <th className={`border-l w-16 bg-gray-200 font-bold text-gray-800 print:border print:bg-gray-100 ${compactMode ? 'p-1' : 'p-2'}`}>المجموع</th>
                                                    </>
                                                )}
                                                {filteredAssignments.map(assign => (
                                                    <th key={assign.id} className={`border-l min-w-[80px] group relative bg-white print:border print:text-black ${compactMode ? 'p-1' : 'p-2'}`}>
                                                        <div className="flex flex-col items-center">
                                                            <div className="flex items-center gap-1 truncate max-w-[120px] justify-center">
                                                                <span className="truncate">{assign.title}</span>
                                                                {/* NEW: Fill Column Button */}
                                                                <button 
                                                                    onClick={() => handleColumnFill(assign.id, assign.maxScore)} 
                                                                    className="text-gray-400 hover:text-green-600 print:hidden"
                                                                    title="تعبئة تلقائية للجميع"
                                                                >
                                                                    <Zap size={12} className="fill-current"/>
                                                                </button>
                                                            </div>
                                                            <span className="text-[9px] text-gray-400 bg-white px-1 rounded border print:hidden">Max: {assign.maxScore}</span>
                                                        </div>
                                                    </th>
                                                ))}
                                                {/* DYNAMIC SUM COLUMN FOR CATEGORY */}
                                                {(activeTab === 'HOMEWORK' || activeTab === 'ACTIVITY' || activeTab === 'PLATFORM_EXAM') && (
                                                    <th className={`border-l w-20 bg-teal-50 text-teal-800 font-bold print:border print:bg-gray-200 print:text-black ${compactMode ? 'p-1' : 'p-2'}`}>الإجمالي</th>
                                                )}
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student, idx) => {
                                        // Check if student is ABSENT today
                                        const today = new Date().toISOString().split('T')[0];
                                        const isAbsent = attendance.some(a => a.studentId === student.id && a.date === today && a.status === AttendanceStatus.ABSENT);

                                        // Render Year Work Row
                                        if (activeTab === 'YEAR_WORK') {
                                            const yearStats = calculateYearWork(student);
                                            return (
                                                <tr key={student.id} className="hover:bg-gray-50 border-b print:border-black">
                                                    <td className={`border-l text-gray-500 print:border print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>{idx + 1}</td>
                                                    <td className={`border-l text-right font-bold text-gray-800 sticky right-0 bg-white z-10 print:border print:static print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>{student.name}</td>
                                                    
                                                    <td className={`border-l text-blue-700 font-bold print:border print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>{yearStats.hwGrade}</td>
                                                    <td className={`border-l text-blue-500 text-xs print:hidden ${compactMode ? 'p-1' : 'p-3'}`}>{yearStats.hwCompletion}%</td>
                                                    
                                                    <td className={`border-l text-amber-700 font-bold print:border print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>{yearStats.actGrade}</td>
                                                    <td className={`border-l text-amber-500 text-xs print:hidden ${compactMode ? 'p-1' : 'p-3'}`}>{yearStats.actCompletion}%</td>
                                                    
                                                    <td className={`border-l text-green-700 font-bold print:border print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>{yearStats.attGrade}</td>
                                                    <td className={`border-l text-purple-700 font-bold print:border print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>{yearStats.examGrade}</td>
                                                    
                                                    <td className={`border-l font-black text-gray-900 bg-gray-100 print:border print:bg-gray-200 ${compactMode ? 'p-1' : 'p-3'}`}>{yearStats.total}</td>
                                                </tr>
                                            );
                                        }

                                        // Render Standard Row (Homework/Exams/etc)
                                        let completionRate = 0;
                                        let totalScore = 0;
                                        let totalMax = 0;

                                        if (activeTab === 'HOMEWORK' || activeTab === 'ACTIVITY' || activeTab === 'PLATFORM_EXAM') {
                                            filteredAssignments.forEach(a => {
                                                const rawVal = scores[student.id]?.[a.id];
                                                if (rawVal !== undefined && rawVal !== '') {
                                                    if (!isNaN(parseFloat(rawVal))) {
                                                        totalScore += parseFloat(rawVal);
                                                    }
                                                }
                                                totalMax += a.maxScore;
                                            });
                                            completionRate = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
                                        }

                                        return (
                                            <tr key={student.id} className={`hover:bg-gray-50 border-b transition-colors print:border-black ${isAbsent ? 'bg-red-50/40 print:bg-white' : ''}`}>
                                                <td className={`border-l text-gray-500 print:border print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>{idx + 1}</td>
                                                <td className={`border-l text-right font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-sm flex items-center justify-between print:border print:static print:text-black print:shadow-none ${compactMode ? 'p-1' : 'p-3'}`}>
                                                    <span>{student.name}</span>
                                                    {isAbsent && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold mr-2 border border-red-200 print:hidden">غائب</span>}
                                                </td>
                                                
                                                {/* Completion & Total Columns */}
                                                {(activeTab === 'HOMEWORK' || activeTab === 'ACTIVITY') && (
                                                    <>
                                                        <td className={`border-l print:hidden ${compactMode ? 'p-1' : 'p-3'}`}>
                                                            <span className={`px-2 py-1 rounded font-bold text-xs ${completionRate >= 80 ? 'bg-green-100 text-green-700' : completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                                {completionRate}%
                                                            </span>
                                                        </td>
                                                        <td className={`border-l font-bold text-gray-800 bg-gray-50 print:bg-gray-100 print:border print:text-black ${compactMode ? 'p-1' : 'p-3'}`}>
                                                            {totalScore}
                                                        </td>
                                                    </>
                                                )}

                                                {filteredAssignments.map(assign => (
                                                    <td key={assign.id} className={`p-0 border-l relative group h-8 print:border print:border-black`}>
                                                        <input 
                                                            type="number"
                                                            className={`w-full h-full text-center outline-none bg-transparent focus:bg-indigo-50 font-medium print:hidden ${compactMode ? 'p-1' : 'p-2'} ${scores[student.id]?.[assign.id] ? 'text-indigo-700 font-bold' : 'text-gray-400'} ${isAbsent && scores[student.id]?.[assign.id] ? 'ring-2 ring-red-300' : ''}`}
                                                            value={scores[student.id]?.[assign.id] || ''}
                                                            onChange={e => handleScoreChange(student.id, assign.id, e.target.value)}
                                                            onPaste={(e) => handlePaste(e, idx, assign.id)}
                                                            placeholder="-"
                                                        />
                                                        {/* Print Only Span */}
                                                        <span className="hidden print:block text-center w-full font-bold">{scores[student.id]?.[assign.id] || ''}</span>
                                                    </td>
                                                ))}

                                                {/* DYNAMIC SUM COLUMN FOR CATEGORY */}
                                                {(activeTab === 'HOMEWORK' || activeTab === 'ACTIVITY' || activeTab === 'PLATFORM_EXAM') && (
                                                    <td className={`border-l font-black text-teal-800 bg-teal-50 text-center print:bg-gray-200 print:text-black print:border ${compactMode ? 'p-1' : 'p-3'}`}>
                                                        {totalScore}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredStudents.length === 0 && <div className="p-10 text-center text-gray-400">لا يوجد طلاب في هذا الفصل</div>}
                            {activeTab !== 'YEAR_WORK' && filteredAssignments.length === 0 && <div className="p-10 text-center text-gray-400">لم تقم بإضافة أي أعمدة (واجبات/اختبارات). اضغط "إعدادات الأعمدة"</div>}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white print:hidden">
                        <Table size={48} className="mb-4 opacity-20"/>
                        <p>لا توجد بيانات للعرض. تأكد من اختيار الفلتر المناسب.</p>
                    </div>
                )
            )}

            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-bounce-in overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings size={18}/> إدارة الأعمدة والربط</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        
                        <div className="flex border-b">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'MANUAL' ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50' : 'text-gray-500 hover:bg-gray-50'}`}>إدارة يدوية</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'SHEET' ? 'border-b-2 border-green-600 text-green-700 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}>ربط Google Sheet</button>
                            <button onClick={() => setSettingsTab('DISTRIBUTION')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'DISTRIBUTION' ? 'border-b-2 border-orange-600 text-orange-700 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}>توزيع أعمال السنة</button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 bg-gray-50">
                            {/* --- MANUAL TAB --- */}
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-wrap gap-4 items-center">
                                        <span className="text-xs font-bold text-blue-800 flex items-center gap-1"><ListFilter size={14}/> السياق الحالي:</span>
                                        <select 
                                            className="p-1.5 border rounded text-xs bg-white font-bold min-w-[120px]" 
                                            value={settingTermId} 
                                            onChange={e => { setSettingTermId(e.target.value); setSettingPeriodId(''); }}
                                        >
                                            <option value="">اختر الفصل...</option>
                                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <select 
                                            className="p-1.5 border rounded text-xs bg-white font-bold min-w-[120px]" 
                                            value={settingPeriodId} 
                                            onChange={e => setSettingPeriodId(e.target.value)}
                                        >
                                            <option value="">الفترة (عام)</option>
                                            {settingsPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                                        <div className="w-48">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">رابط (اختياري)</label>
                                            <input className="w-full p-2 border rounded-lg text-sm dir-ltr" placeholder="URL..." value={newColUrl} onChange={e => setNewColUrl(e.target.value)}/>
                                        </div>
                                        <div className="w-40">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">التصنيف</label>
                                            <select 
                                                className="w-full p-2 border rounded-lg text-sm bg-white" 
                                                value={newColCategory} 
                                                onChange={e => setNewColCategory(e.target.value)}
                                            >
                                                {DEFAULT_CATEGORIES.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                ))}
                                                <option value="CUSTOM">أخرى / جديد...</option>
                                            </select>
                                        </div>
                                        {newColCategory === 'CUSTOM' && (
                                            <div className="w-32">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">اسم التبويب</label>
                                                <input className="w-full p-2 border rounded-lg text-sm bg-yellow-50" placeholder="مثال: مشاريع" value={newCustomCategory} onChange={e => setNewCustomCategory(e.target.value)}/>
                                            </div>
                                        )}
                                        <button onClick={handleAddColumn} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 flex items-center gap-2">
                                            <Plus size={16}/> إضافة
                                        </button>
                                    </div>

                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="p-3 bg-gray-50 border-b text-xs font-bold text-gray-500 flex">
                                            <div className="flex-1">عنوان العمود</div>
                                            <div className="w-24 text-center">الدرجة</div>
                                            <div className="w-48 text-center">الرابط</div>
                                            <div className="w-32 text-center">التصنيف</div>
                                            <div className="w-20 text-center">حذف</div>
                                        </div>
                                        <div className="divide-y max-h-60 overflow-y-auto">
                                            {settingsAssignments.length > 0 ? settingsAssignments.map(assign => (
                                                <div key={assign.id} className="p-3 flex items-center hover:bg-gray-50">
                                                    <div className="flex-1">
                                                        <input 
                                                            className="w-full bg-transparent outline-none font-bold text-gray-700 text-sm" 
                                                            value={assign.title} 
                                                            onChange={e => handleUpdateColumn({...assign, title: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="w-24 text-center">
                                                        <input 
                                                            className="w-full bg-transparent outline-none text-center text-sm font-mono" 
                                                            value={assign.maxScore} 
                                                            onChange={e => handleUpdateColumn({...assign, maxScore: Number(e.target.value)})}
                                                        />
                                                    </div>
                                                    <div className="w-48 text-center">
                                                        <input 
                                                            className="w-full bg-transparent outline-none text-xs text-blue-600 dir-ltr" 
                                                            value={assign.url || ''} 
                                                            placeholder="أضف رابط..."
                                                            onChange={e => handleUpdateColumn({...assign, url: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="w-32 text-center">
                                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                                            {CATEGORY_LABELS[assign.category] || assign.category}
                                                        </span>
                                                    </div>
                                                    <div className="w-20 text-center">
                                                        <button onClick={() => handleDeleteColumn(assign.id)} className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"><Trash2 size={16}/></button>
                                                    </div>
                                                </div>
                                            )) : <div className="p-6 text-center text-gray-400 text-sm">لا توجد أعمدة مضافة لهذا الفصل/الفترة.</div>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6">
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
                                        <label className="block text-sm font-bold text-green-800 mb-2">رابط ملف Google Sheet</label>
                                        <div className="flex gap-2">
                                            <input 
                                                className="flex-1 p-2 border border-green-300 rounded-lg text-sm dir-ltr text-left outline-none focus:ring-2 focus:ring-green-500" 
                                                value={googleSheetUrl} 
                                                onChange={e => setGoogleSheetUrl(e.target.value)}
                                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                            />
                                            <button 
                                                onClick={handleFetchSheetHeaders} 
                                                disabled={isFetchingStructure} 
                                                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
                                            >
                                                {isFetchingStructure ? <Loader2 size={16} className="animate-spin"/> : <CloudLightning size={16}/>}
                                                جلب الأعمدة
                                            </button>
                                        </div>
                                    </div>

                                    {availableHeaders.length > 0 && (
                                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                            <div className="p-3 bg-gray-50 border-b flex flex-wrap gap-4 items-center">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 block mb-1">تصنيف العمود:</label>
                                                    <div className="flex items-center gap-2">
                                                        <Tag size={14} className="text-green-600"/>
                                                        <select 
                                                            className="p-1.5 border rounded text-xs bg-white font-bold min-w-[120px]" 
                                                            value={importCategory} 
                                                            onChange={e => setImportCategory(e.target.value)}
                                                        >
                                                            {DEFAULT_CATEGORIES.map(cat => (
                                                                <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                            ))}
                                                            <option value="CUSTOM">أخرى...</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                {importCategory === 'CUSTOM' && (
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 block mb-1">اسم مخصص:</label>
                                                        <input className="p-1.5 border rounded text-xs w-32 bg-yellow-50" value={customImportCategory} onChange={e => setCustomImportCategory(e.target.value)} placeholder="مشروع..."/>
                                                    </div>
                                                )}
                                                
                                                <div className="w-[1px] h-8 bg-gray-300"></div>

                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-500 block mb-1">من ورقة:</label>
                                                    <div className="flex items-center gap-2">
                                                        <FileSpreadsheet size={14} className="text-blue-600"/>
                                                        <select 
                                                            className="p-1.5 border rounded text-xs bg-white font-bold min-w-[120px]" 
                                                            value={selectedSheetName} 
                                                            onChange={e => { setSelectedSheetName(e.target.value); }}
                                                        >
                                                            {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="w-[1px] h-8 bg-gray-300"></div>

                                                <div className="flex gap-2">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 block mb-1">الاستيراد إلى:</label>
                                                        <select 
                                                            className="p-1.5 border rounded text-xs bg-white font-bold min-w-[120px]" 
                                                            value={settingTermId} 
                                                            onChange={e => { setSettingTermId(e.target.value); setSettingPeriodId(''); }}
                                                        >
                                                            <option value="">اختر الفصل...</option>
                                                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-500 block mb-1">&nbsp;</label>
                                                        <select 
                                                            className="p-1.5 border rounded text-xs bg-white font-bold min-w-[100px]" 
                                                            value={settingPeriodId} 
                                                            onChange={e => setSettingPeriodId(e.target.value)}
                                                        >
                                                            <option value="">الفترة (عام)</option>
                                                            {settingsPeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="max-h-[400px] overflow-y-auto">
                                                <div className="grid grid-cols-12 gap-2 p-3 bg-gray-100 text-[10px] font-bold text-gray-500 border-b uppercase">
                                                    <div className="col-span-2 text-center">إجراء</div>
                                                    <div className="col-span-5">رابط المصدر</div>
                                                    <div className="col-span-2 text-center">الدرجة</div>
                                                    <div className="col-span-3 text-right">اسم العمود</div>
                                                </div>
                                                
                                                <div className="divide-y">
                                                    {availableHeaders.map(h => {
                                                        const config = columnConfigs[h] || { maxScore: '10', url: '' };
                                                        return (
                                                            <div key={h} className="grid grid-cols-12 gap-2 p-2 items-center hover:bg-green-50 transition-colors group">
                                                                <div className="col-span-2 text-center">
                                                                    <button 
                                                                        onClick={() => handleImportColumnFromSheet(h)}
                                                                        className="w-full py-1.5 bg-white border border-green-500 text-green-600 rounded text-xs font-bold hover:bg-green-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1"
                                                                    >
                                                                        <DownloadCloud size={14}/> استيراد
                                                                    </button>
                                                                </div>
                                                                <div className="col-span-5">
                                                                    <input 
                                                                        className="w-full p-1.5 border rounded text-xs bg-gray-50 focus:bg-white outline-none dir-ltr text-left" 
                                                                        placeholder="https://..."
                                                                        value={config.url}
                                                                        onChange={e => handleColumnConfigChange(h, 'url', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <input 
                                                                        type="number" 
                                                                        className="w-full p-1.5 border rounded text-xs text-center font-bold bg-white focus:ring-1 focus:ring-green-500 outline-none" 
                                                                        value={config.maxScore}
                                                                        onChange={e => handleColumnConfigChange(h, 'maxScore', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="col-span-3 text-right font-bold text-gray-700 text-xs truncate" title={h}>
                                                                    {h}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {settingsTab === 'DISTRIBUTION' && (
                                <div className="max-w-2xl mx-auto space-y-6">
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                                        <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                            <PieChart size={18}/> توزيع درجات أعمال السنة
                                        </h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-3 rounded-lg border border-orange-100">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">الواجبات</label>
                                                <input type="number" className="w-full p-2 border rounded font-bold text-center text-lg" value={yearWorkConfig.hw} onChange={e => setYearWorkConfig({...yearWorkConfig, hw: Number(e.target.value)})}/>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-orange-100">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">الأنشطة</label>
                                                <input type="number" className="w-full p-2 border rounded font-bold text-center text-lg" value={yearWorkConfig.act} onChange={e => setYearWorkConfig({...yearWorkConfig, act: Number(e.target.value)})}/>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-orange-100">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">الحضور</label>
                                                <input type="number" className="w-full p-2 border rounded font-bold text-center text-lg" value={yearWorkConfig.att} onChange={e => setYearWorkConfig({...yearWorkConfig, att: Number(e.target.value)})}/>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-orange-100">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">الاختبارات</label>
                                                <input type="number" className="w-full p-2 border rounded font-bold text-center text-lg" value={yearWorkConfig.exam} onChange={e => setYearWorkConfig({...yearWorkConfig, exam: Number(e.target.value)})}/>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-orange-200 flex justify-between items-center">
                                            <span className="font-bold text-gray-700">المجموع الكلي: {yearWorkConfig.hw + yearWorkConfig.act + yearWorkConfig.att + yearWorkConfig.exam}</span>
                                            <button onClick={saveYearWorkSettings} className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700">حفظ التوزيع</button>
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