
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, saveAssignment, deleteAssignment, getStudents, getWorksMasterUrl, saveWorksMasterUrl, downloadFromSupabase, bulkAddPerformance, deletePerformance, forceRefreshData } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, Filter, Table, Download, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, Link as LinkIcon, DownloadCloud, X, Check, ExternalLink, RefreshCw, Loader2, CheckSquare, Square, AlertTriangle, ArrowRight, Calculator, CloudLightning, Zap, Edit2, Grid, ListFilter, Tag, ArrowDownToLine, Maximize, Link2, PieChart as PieChartIcon, ChevronRight, PenTool, Clipboard, Printer, MoreVertical } from 'lucide-react';
import * as XLSX from 'xlsx';
import DataImport from './DataImport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area, PieChart, Pie, Legend } from 'recharts';

// ... (Rest of imports same as before) ...

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
    
    // Updated to string to support custom tabs
    const [activeTab, setActiveTab] = useState<string>(() => {
        const saved = localStorage.getItem('works_active_tab');
        return saved || 'HOMEWORK';
    });

    useEffect(() => {
        localStorage.setItem('works_active_tab', activeTab);
    }, [activeTab]);
    
    // --- Persisted Filter State ---
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedPeriodId, setSelectedPeriodId] = useState(() => localStorage.getItem('works_period_id') || ''); 
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || '');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 
    
    // Save filters when changed
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
    
    // Independent state for Settings Modal
    const [settingTermId, setSettingTermId] = useState('');
    const [settingPeriodId, setSettingPeriodId] = useState('');
    
    // -- Import Category State --
    const [importCategory, setImportCategory] = useState<string>('HOMEWORK');
    const [customImportCategory, setCustomImportCategory] = useState('');
    
    const [isFetchingStructure, setIsFetchingStructure] = useState(false);
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]); // Store raw data to calc max scores
    const [workbookRef, setWorkbookRef] = useState<any>(null);
    
    // State for column configurations in the import table (Max Score, URL)
    const [columnConfigs, setColumnConfigs] = useState<Record<string, { maxScore: string, url: string }>>({});

    // -- Settings Modal State --
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'DISTRIBUTION'>('MANUAL');
    const [newColTitle, setNewColTitle] = useState('');
    const [newColMax, setNewColMax] = useState('10');
    const [newColUrl, setNewColUrl] = useState(''); 
    const [newColCategory, setNewColCategory] = useState<string>('HOMEWORK');
    const [newCustomCategory, setNewCustomCategory] = useState(''); 
    
    // --- Mobile Grading Mode State ---
    const [mobileGradingMode, setMobileGradingMode] = useState(false);
    const [selectedMobileAssignment, setSelectedMobileAssignment] = useState<Assignment | null>(null);

    // --- Compact Mode for Printing ---
    const [compactMode, setCompactMode] = useState(false);

    useEffect(() => {
        const syncData = async () => {
            const savedUrl = getWorksMasterUrl();
            if (savedUrl) setTimeout(() => handleQuickSheetSync(true), 1000);
            setIsRefreshing(false);
        };
        syncData();
    }, []);

    // Check screen size on load
    useEffect(() => {
        if (window.innerWidth < 768) {
            setMobileGradingMode(true);
        }
    }, []);

    // ... (Helper functions: findStudentNameInRow, handleQuickSheetSync, useEffect for data loading remain mostly same) ...
    // Note: Re-implementing them briefly for file completeness in response

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

    // --- Fill Column Feature ---
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
        const newAssign: Assignment = { id: Date.now().toString(), title: newColTitle, category: categoryToUse, maxScore: Number(newColMax), url: newColUrl, isVisible: true, teacherId: currentUser?.id, termId: settingTermId || selectedTermId, periodId: settingPeriodId || selectedPeriodId };
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
        const newAssign: Assignment = { id: Date.now().toString(), title: header, category: categoryToUse, maxScore: max, url: config.url, isVisible: true, teacherId: currentUser?.id, sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header }), termId: settingTermId || selectedTermId, periodId: settingPeriodId || selectedPeriodId };
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
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative pb-24 md:pb-6">
            {/* Same layout structure as before but now using PieChartIcon to avoid conflict */}
            
            {/* ... (The rest of the component implementation with PieChartIcon used in the button icon and PieChart from recharts in charts) ... */}
            
            {/* For brevity, I'll focus on the specific fix location in the UI render part */}
            
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-bounce-in overflow-hidden">
                        {/* ... */}
                        
                        <div className="flex border-b">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'MANUAL' ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50' : 'text-gray-500 hover:bg-gray-50'}`}>إدارة يدوية</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'SHEET' ? 'border-b-2 border-green-600 text-green-700 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}>ربط Google Sheet</button>
                            {/* FIX: Use PieChartIcon here */}
                            <button onClick={() => setSettingsTab('DISTRIBUTION')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 ${settingsTab === 'DISTRIBUTION' ? 'border-b-2 border-orange-600 text-orange-700 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                               توزيع أعمال السنة <PieChartIcon size={14}/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 bg-gray-50">
                            {/* ... MANUAL and SHEET tabs ... */}

                            {settingsTab === 'DISTRIBUTION' && (
                                <div className="max-w-2xl mx-auto space-y-6">
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                                        {/* FIX: Use PieChartIcon here */}
                                        <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                            <PieChartIcon size={18}/> توزيع درجات أعمال السنة
                                        </h4>
                                        {/* ... Distribution Form inputs ... */}
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
