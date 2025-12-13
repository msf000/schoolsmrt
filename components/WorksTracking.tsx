
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, saveAssignment, deleteAssignment, getStudents, getWorksMasterUrl, saveWorksMasterUrl, downloadFromSupabase, bulkAddPerformance, deletePerformance, forceRefreshData } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, Filter, Table, Download, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, Link as LinkIcon, DownloadCloud, X, Check, ExternalLink, RefreshCw, Loader2, CheckSquare, Square, AlertTriangle, ArrowRight, Calculator, CloudLightning, Zap, Edit2, Grid, ListFilter, Tag, ArrowDownToLine, Maximize, Link2, PieChart, ChevronRight, PenTool, Layout } from 'lucide-react';
import * as XLSX from 'xlsx';
import DataImport from './DataImport';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

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
    
    // --- State Initialization ---
    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('works_active_tab') || 'HOMEWORK');

    useEffect(() => {
        localStorage.setItem('works_active_tab', activeTab);
    }, [activeTab]);
    
    // Filters
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

    const [isSettingsOpen, setIsSettingsOpen] = useState(false); 
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'DISTRIBUTION'>('MANUAL');

    // --- Google Sheets Sync State ---
    const [googleSheetUrl, setGoogleSheetUrl] = useState('');
    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheetName, setSelectedSheetName] = useState('');
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]); 
    const [workbookRef, setWorkbookRef] = useState<any>(null);
    const [syncStatusMsg, setSyncStatusMsg] = useState('');

    // --- Manual Column State ---
    const [settingTermId, setSettingTermId] = useState('');
    const [settingPeriodId, setSettingPeriodId] = useState('');
    const [newColTitle, setNewColTitle] = useState('');
    const [newColMax, setNewColMax] = useState('10');
    const [newColUrl, setNewColUrl] = useState('');
    const [newColCategory, setNewColCategory] = useState<string>('HOMEWORK');
    const [newCustomCategory, setNewCustomCategory] = useState('');
    const [newColClass, setNewColClass] = useState(''); // Class ID for new column

    // --- Initialization ---
    useEffect(() => {
        if (currentUser) {
            const subs = getSubjects(currentUser.id);
            setSubjects(subs);
            const loadedTerms = getAcademicTerms(currentUser.id);
            setTerms(loadedTerms);
            
            const savedUrl = getWorksMasterUrl();
            if (savedUrl) setGoogleSheetUrl(savedUrl);

            // Default Filters
            if (!localStorage.getItem('works_term_id')) {
                const current = loadedTerms.find(t => t.isCurrent);
                if (current) {
                    setSelectedTermId(current.id);
                    setSettingTermId(current.id); 
                } else if (loadedTerms.length > 0) {
                    setSelectedTermId(loadedTerms[0].id);
                    setSettingTermId(loadedTerms[0].id);
                }
            } else {
                setSettingTermId(selectedTermId);
            }

            if (!localStorage.getItem('works_subject') && subs.length > 0) {
                setSelectedSubject(subs[0].name);
            }
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
        }
    }, [activeTab, currentUser, isManager, selectedTermId, selectedPeriodId]);

    // --- Derived Data ---
    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        return Array.from(classes).sort();
    }, [students]);

    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        DEFAULT_CATEGORIES.forEach(c => cats.add(c.id));
        assignments.forEach(a => {
            if (a.category && a.category !== 'YEAR_WORK') cats.add(a.category);
        });
        return Array.from(cats);
    }, [assignments]);

    const filteredStudents = useMemo(() => {
        let filtered = students;
        if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass);
        if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm));
        return filtered.sort((a,b) => {
            if (a.className === b.className) return a.name.localeCompare(b.name);
            return (a.className || '').localeCompare(b.className || '');
        });
    }, [students, selectedClass, searchTerm]);

    const filteredAssignments = useMemo(() => {
        if (activeTab === 'YEAR_WORK') return [];
        return assignments.filter(a => {
            const termMatch = !selectedTermId || (a.termId === selectedTermId);
            const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId;
            const categoryMatch = a.category === activeTab;
            const classMatch = !a.classId || !selectedClass || a.classId === selectedClass; // Filter by Class
            return termMatch && periodMatch && categoryMatch && classMatch;
        }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    }, [assignments, selectedTermId, selectedPeriodId, activeTab, selectedClass]);

    const settingsAssignments = useMemo(() => {
        if (activeTab === 'YEAR_WORK') return [];
        return assignments.filter(a => {
            const termMatch = !settingTermId || a.termId === settingTermId;
            const periodMatch = !settingPeriodId || a.periodId === settingPeriodId;
            return termMatch && periodMatch;
        }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    }, [assignments, settingTermId, settingPeriodId, activeTab]);

    const settingsTermObj = terms.find(t => t.id === settingTermId);
    const settingsPeriods = settingsTermObj?.periods || [];

    // --- Score Handling ---
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
                if (p.notes && assignments.some(a => a.id === p.notes)) { 
                     newScores[s.id][p.notes] = p.score.toString();
                } else { 
                     const assign = assignments.find(a => a.title === p.title);
                     if (assign) {
                         newScores[s.id][assign.id] = p.score.toString();
                     }
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
            }, 2000); 
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
                        const existingRecord = performance.find(p => p.studentId === studentId && (p.notes === assignmentId || p.title === assignment.title));
                        
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
            onAddPerformance(recordsToSave);
            setLastSaved(new Date());
        }
        setTimeout(() => setIsSaving(false), 500);
    };

    // --- Google Sheets Logic ---
    const handleFetchSheetHeaders = async () => {
        if (!googleSheetUrl) return;
        setIsSheetSyncing(true);
        setSyncStatusMsg('جاري الاتصال...');
        try {
            saveWorksMasterUrl(googleSheetUrl); // Save URL
            const { sheetNames, workbook } = await fetchWorkbookStructureUrl(googleSheetUrl);
            setWorkbookRef(workbook);
            setSheetNames(sheetNames);
            if (sheetNames.length > 0) {
                const targetSheet = sheetNames[0]; // Default to first
                setSelectedSheetName(targetSheet);
                const { headers, data } = getSheetHeadersAndData(workbook, targetSheet);
                setAvailableHeaders(headers);
                setSheetData(data);
            }
            setSyncStatusMsg('تم الاتصال بنجاح');
        } catch (e: any) {
            setSyncStatusMsg('خطأ: ' + e.message);
        } finally {
            setIsSheetSyncing(false);
        }
    };

    const handleImportColumnFromSheet = (header: string, max?: string, url?: string) => {
        if (!header) return;
        
        // Check if exists
        const exists = assignments.find(a => a.title === header && a.termId === settingTermId);
        if (exists) {
            if(confirm(`العمود "${header}" موجود بالفعل. هل تريد تحديثه؟`)) {
                // Update logic if needed
            }
            return;
        }

        const newAssign: Assignment = {
            id: Date.now().toString(),
            title: header,
            category: newColCategory,
            maxScore: Number(max || 10),
            url: url || '',
            isVisible: true,
            teacherId: currentUser?.id,
            termId: settingTermId || selectedTermId,
            periodId: settingPeriodId || selectedPeriodId,
            classId: newColClass,
            sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header: header })
        };
        saveAssignment(newAssign);
        setAssignments(getAssignments('ALL', currentUser?.id, isManager));
        alert(`تم إضافة العمود: ${header}`);
    };

    const handleQuickSheetSync = useCallback(async (isAuto = false) => {
        const urlToUse = googleSheetUrl || getWorksMasterUrl();
        if (!urlToUse) return;
        
        setIsSheetSyncing(true);
        if(!isAuto) setSyncStatusMsg('جاري المزامنة...');

        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(urlToUse);
            // Identify active columns that are linked to sheets
            const linkedAssignments = assignments.filter(a => a.sourceMetadata);
            const updates: PerformanceRecord[] = [];

            for (const assign of linkedAssignments) {
                try {
                    const meta = JSON.parse(assign.sourceMetadata!);
                    const sheetName = meta.sheet;
                    const header = meta.header;
                    
                    if (workbook.SheetNames.includes(sheetName)) {
                        const { data } = getSheetHeadersAndData(workbook, sheetName);
                        
                        // Match Students
                        for (const row of data) {
                            // Find student in row
                            let studentId = '';
                            // Try national ID
                            const nid = row['الهوية'] || row['S_ID'] || row['NationalID'];
                            if (nid) {
                                const s = students.find(std => std.nationalId === String(nid));
                                if (s) studentId = s.id;
                            }
                            // Try name if no ID
                            if (!studentId) {
                                const name = row['الاسم'] || row['Name'] || row['Student'];
                                if (name) {
                                    const s = students.find(std => std.name === String(name) || std.name.includes(String(name)));
                                    if (s) studentId = s.id;
                                }
                            }

                            if (studentId && row[header] !== undefined) {
                                const val = parseFloat(row[header]);
                                if (!isNaN(val)) {
                                    updates.push({
                                        id: `${studentId}_${assign.id}`,
                                        studentId: studentId,
                                        subject: selectedSubject || 'عام', // Default or derived
                                        title: assign.title,
                                        category: assign.category,
                                        score: val,
                                        maxScore: assign.maxScore,
                                        date: new Date().toISOString().split('T')[0],
                                        notes: assign.id,
                                        createdById: currentUser?.id
                                    });
                                }
                            }
                        }
                    }
                } catch (e) { console.error("Error syncing assignment", assign.title); }
            }

            if (updates.length > 0) {
                onAddPerformance(updates);
                if(!isAuto) alert(`تم تحديث ${updates.length} درجة من الملف.`);
            } else {
                if(!isAuto) alert("لم يتم العثور على درجات جديدة للمزامنة.");
            }
            if(!isAuto) setSyncStatusMsg('تمت المزامنة');

        } catch (e: any) {
            if(!isAuto) setSyncStatusMsg('فشل المزامنة: ' + e.message);
        } finally {
            setIsSheetSyncing(false);
        }
    }, [googleSheetUrl, assignments, students, selectedSubject, currentUser, onAddPerformance]);

    // --- Manual Column Management ---
    const handleAddColumn = () => {
        if (!newColTitle) return;
        const categoryToUse = newColCategory === 'CUSTOM' ? newCustomCategory : newColCategory;
        if (!categoryToUse) return;

        const newAssign: Assignment = {
            id: Date.now().toString(),
            title: newColTitle,
            category: categoryToUse,
            maxScore: Number(newColMax),
            url: newColUrl,
            isVisible: true,
            teacherId: currentUser?.id,
            termId: settingTermId || selectedTermId,
            periodId: settingPeriodId || selectedPeriodId,
            classId: newColClass
        };
        saveAssignment(newAssign);
        setAssignments(getAssignments('ALL', currentUser?.id, isManager));
        setNewColTitle('');
        setNewColUrl('');
        setNewCustomCategory('');
    };

    const handleDeleteColumn = (id: string) => {
        if(confirm('حذف هذا العمود والدرجات المرتبطة به؟')) {
            deleteAssignment(id);
            setAssignments(getAssignments('ALL', currentUser?.id, isManager));
        }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative">
            
            {/* Header Area */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col gap-4">
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
                
                {/* Tabs */}
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
                        <button onClick={() => { setIsSettingsOpen(true); setSettingTermId(selectedTermId || ''); }} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-200">
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

            {/* Main Grid Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-center text-sm border-collapse min-w-[800px]">
                        <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-3 border-l w-12 bg-gray-50">#</th>
                                <th className="p-3 border-l w-64 text-right bg-gray-50 sticky right-0 z-20 shadow-md">اسم الطالب</th>
                                {!selectedClass && <th className="p-3 border-l w-32 bg-gray-50">الفصل</th>}
                                
                                {filteredAssignments.map(assign => (
                                    <th key={assign.id} className="p-2 border-l min-w-[120px] group relative">
                                        <div className="flex flex-col items-center">
                                            <span className="flex items-center gap-1">
                                                {assign.title}
                                                {assign.url && <a href={assign.url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700" title="فتح الرابط"><Link2 size={12}/></a>}
                                            </span>
                                            <span className="text-[10px] text-gray-400 bg-white px-1 rounded border">Max: {assign.maxScore}</span>
                                            {assign.classId && <span className="text-[9px] bg-green-100 text-green-800 px-1 rounded absolute -top-2 right-0">{assign.classId}</span>}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student, idx) => (
                                <tr key={student.id} className="hover:bg-gray-50 border-b transition-colors">
                                    <td className="p-3 border-l text-gray-500">{idx + 1}</td>
                                    <td className="p-3 border-l text-right font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-sm">
                                        {student.name}
                                    </td>
                                    {!selectedClass && <td className="p-3 border-l text-gray-500 text-xs">{student.className}</td>}
                                    
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
                        </div>

                        <div className="flex-1 overflow-auto p-6 bg-gray-50">
                            {/* --- MANUAL TAB --- */}
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-wrap gap-4 items-center">
                                        <span className="text-xs font-bold text-blue-800 flex items-center gap-1"><ListFilter size={14}/> السياق الحالي (للعرض والإضافة):</span>
                                        <select className="p-1.5 border rounded text-xs bg-white font-bold min-w-[120px]" value={settingTermId} onChange={e => { setSettingTermId(e.target.value); setSettingPeriodId(''); }}>
                                            <option value="">اختر الفصل...</option>
                                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <select className="p-1.5 border rounded text-xs bg-white font-bold min-w-[120px]" value={settingPeriodId} onChange={e => setSettingPeriodId(e.target.value)}>
                                            <option value="">الفترة (عام)</option>
                                            {settingsPeriods?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>

                                    {/* New Column Form */}
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
                                        <div className="flex flex-col md:flex-row gap-4 items-end">
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
                                        </div>
                                        
                                        <div className="flex flex-col md:flex-row gap-4 items-end">
                                            <div className="w-40">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">التصنيف</label>
                                                <select className="w-full p-2 border rounded-lg text-sm bg-white" value={newColCategory} onChange={e => setNewColCategory(e.target.value)}>
                                                    {DEFAULT_CATEGORIES.map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                                    ))}
                                                    <option value="CUSTOM">أخرى / جديد...</option>
                                                </select>
                                            </div>
                                            
                                            <div className="w-40">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">تخصيص لفصل</label>
                                                <select className="w-full p-2 border rounded-lg text-sm bg-white" value={newColClass} onChange={e => setNewColClass(e.target.value)}>
                                                    <option value="">عام (للجميع)</option>
                                                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>

                                            {newColCategory === 'CUSTOM' && (
                                                <div className="w-32">
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">اسم التبويب</label>
                                                    <input className="w-full p-2 border rounded-lg text-sm bg-yellow-50" placeholder="مثال: مشاريع" value={newCustomCategory} onChange={e => setNewCustomCategory(e.target.value)}/>
                                                </div>
                                            )}
                                            
                                            <button onClick={handleAddColumn} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 flex items-center gap-2">
                                                <Plus size={16}/> إضافة عمود
                                            </button>
                                        </div>
                                    </div>

                                    {/* List */}
                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="p-3 bg-gray-50 border-b text-xs font-bold text-gray-500 flex">
                                            <div className="flex-1">عنوان العمود</div>
                                            <div className="w-24 text-center">الدرجة</div>
                                            <div className="w-32 text-center">التصنيف</div>
                                            <div className="w-32 text-center">الفصل</div>
                                            <div className="w-20 text-center">حذف</div>
                                        </div>
                                        <div className="divide-y max-h-60 overflow-y-auto">
                                            {settingsAssignments.length > 0 ? settingsAssignments.map(assign => (
                                                <div key={assign.id} className="p-3 flex items-center hover:bg-gray-50 text-sm">
                                                    <div className="flex-1 font-bold text-gray-700">{assign.title}</div>
                                                    <div className="w-24 text-center">{assign.maxScore}</div>
                                                    <div className="w-32 text-center"><span className="text-xs bg-gray-100 px-2 py-1 rounded">{CATEGORY_LABELS[assign.category] || assign.category}</span></div>
                                                    <div className="w-32 text-center text-xs text-gray-500">{assign.classId ? <span className="bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100">{assign.classId}</span> : 'عام'}</div>
                                                    <div className="w-20 text-center">
                                                        <button onClick={() => handleDeleteColumn(assign.id)} className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"><Trash2 size={16}/></button>
                                                    </div>
                                                </div>
                                            )) : <div className="p-6 text-center text-gray-400 text-sm">لا توجد أعمدة مضافة.</div>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- SHEET TAB --- */}
                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6">
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                                        <h4 className="font-bold text-green-800 mb-3 flex items-center gap-2"><LinkIcon size={18}/> ربط ملف Excel / Google Sheet</h4>
                                        <div className="flex gap-2">
                                            <input 
                                                className="flex-1 p-2 border rounded-lg text-sm dir-ltr" 
                                                placeholder="https://docs.google.com/spreadsheets/d/..." 
                                                value={googleSheetUrl}
                                                onChange={e => setGoogleSheetUrl(e.target.value)}
                                            />
                                            <button onClick={handleFetchSheetHeaders} disabled={isSheetSyncing} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50">
                                                {isSheetSyncing ? 'جاري الاتصال...' : 'اتصال'}
                                            </button>
                                        </div>
                                        {syncStatusMsg && <p className="text-xs mt-2 font-bold text-gray-600">{syncStatusMsg}</p>}
                                    </div>

                                    {/* Class Selection for Sheet Import */}
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-bold text-gray-700">تخصيص الأعمدة المستوردة للفصل:</label>
                                        <select 
                                            className="p-2 border rounded-lg text-sm bg-white" 
                                            value={newColClass} 
                                            onChange={e => setNewColClass(e.target.value)}
                                        >
                                            <option value="">عام (للجميع)</option>
                                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>

                                    {availableHeaders.length > 0 && (
                                        <div className="bg-white p-4 rounded-xl border border-gray-200">
                                            <h4 className="font-bold text-gray-700 mb-3">اختر الأعمدة للاستيراد</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {availableHeaders.map(h => (
                                                    <button 
                                                        key={h} 
                                                        onClick={() => handleImportColumnFromSheet(h)}
                                                        className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 border rounded-full text-xs font-bold transition-colors"
                                                    >
                                                        + {h}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <button onClick={() => handleQuickSheetSync(false)} className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-black">
                                        <RefreshCw size={18}/> مزامنة جميع الدرجات الآن
                                    </button>
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
