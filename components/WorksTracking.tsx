
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, saveAssignment, deleteAssignment, getStudents, getWorksMasterUrl, saveWorksMasterUrl, downloadFromSupabase, bulkAddPerformance, deletePerformance, forceRefreshData, getTeacherAssignments } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData, extractGoogleSheetId, fetchGoogleSheetData, fetchGoogleSpreadsheetMeta } from '../services/excelService';
import { Save, Filter, Table, Download, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, Link as LinkIcon, DownloadCloud, X, Check, ExternalLink, RefreshCw, Loader2, CheckSquare, Square, AlertTriangle, ArrowRight, Calculator, CloudLightning, Zap, Edit2, Grid, ListFilter, Tag, ArrowDownToLine, Maximize, Link2, PieChart as PieChartIcon, ChevronRight, PenTool, Clipboard, Printer, MoreVertical, Eye, EyeOff, Map, ArrowDownCircle, CheckCircle, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import DataImport from './DataImport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area, PieChart, Pie, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';

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
    const navigate = useNavigate();
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
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); 

    const [yearWorkConfig, setYearWorkConfig] = useState<{ hw: number, act: number, att: number, exam: number }>({
        hw: 10, act: 10, att: 5, exam: 20
    });

    // --- Google Sheet Integration State ---
    const [googleSheetUrl, setGoogleSheetUrl] = useState('');
    const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]);
    const [sheetName, setSheetName] = useState('');
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    const [selectedSheetName, setSelectedSheetName] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [identityColumn, setIdentityColumn] = useState(() => localStorage.getItem('works_sheet_identity_col') || '');
    
    // Independent state for Settings Modal
    const [settingTermId, setSettingTermId] = useState('');
    const [settingPeriodId, setSettingPeriodId] = useState('');
    
    // -- Settings Modal State --
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'DISTRIBUTION'>('MANUAL');
    const [newColTitle, setNewColTitle] = useState('');
    const [newColMax, setNewColMax] = useState('10');
    const [newColCategory, setNewColCategory] = useState<string>('HOMEWORK');
    
    // --- Mobile Grading Mode State ---
    const [mobileGradingMode, setMobileGradingMode] = useState(false);

    useEffect(() => {
        const syncData = async () => {
            const savedUrl = getWorksMasterUrl();
            if (savedUrl) setGoogleSheetUrl(savedUrl);
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

    useEffect(() => {
        if (currentUser) {
            const subs = getSubjects(currentUser.id); setSubjects(subs);
            const loadedTerms = getAcademicTerms(currentUser.id); setTerms(loadedTerms);
            
            const savedConfig = localStorage.getItem('works_year_config'); 
            if (savedConfig) {
                try {
                    const parsed = JSON.parse(savedConfig);
                    if (parsed) setYearWorkConfig(parsed);
                } catch {}
            }

            if (!localStorage.getItem('works_term_id')) {
                const current = loadedTerms.find(t => t.isCurrent);
                if (current) { setSelectedTermId(current.id); setSettingTermId(current.id); } else if (loadedTerms.length > 0) { setSelectedTermId(loadedTerms[0].id); setSettingTermId(loadedTerms[0].id); }
            } else { setSettingTermId(selectedTermId); }
            if (!localStorage.getItem('works_subject') && subs.length > 0) { setSelectedSubject(subs[0].name); }
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            setAssignments(getAssignments('ALL', currentUser.id, true));
        }
    }, [activeTab, currentUser, isManager, selectedTermId, selectedPeriodId]);

    const activeTerm = terms.find(t => t.id === selectedTermId);
    const uniqueClasses = useMemo(() => { 
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        const manualClasses = getTeacherAssignments(currentUser?.id).map(a => a.classId);
        manualClasses.forEach(c => classes.add(c));
        return Array.from(classes).sort(); 
    }, [students, currentUser]);

    const filteredStudents = useMemo(() => { let filtered = students; if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass); if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm)); return filtered.sort((a,b) => { if (a.className === b.className) return a.name.localeCompare(b.name); return (a.className || '').localeCompare(b.className || ''); }); }, [students, selectedClass, searchTerm]);
    const filteredAssignments = useMemo(() => { if (activeTab === 'YEAR_WORK') return []; return assignments.filter(a => { const termMatch = !selectedTermId || (a.termId === selectedTermId); const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId; const categoryMatch = a.category === activeTab; return termMatch && periodMatch && categoryMatch; }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0)); }, [assignments, selectedTermId, selectedPeriodId, activeTab]);
    
    // --- Score Logic ---
    const getStudentScore = (studentId: string, assignmentId: string) => {
        if (scores[studentId] && scores[studentId][assignmentId] !== undefined) {
            return scores[studentId][assignmentId];
        }
        const record = performance.find(p => p.studentId === studentId && (p.notes === assignmentId)); 
        return record ? record.score.toString() : '';
    };

    const handleScoreChange = (studentId: string, assignmentId: string, value: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [assignmentId]: value
            }
        }));

        if (autoSaveEnabled) {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(saveAllChanges, 2000);
        }
    };

    const saveAllChanges = async () => {
        if (Object.keys(scores).length === 0) return;
        setIsSaving(true);
        const recordsToSave: PerformanceRecord[] = [];
        
        Object.keys(scores).forEach(studentId => {
            Object.keys(scores[studentId]).forEach(assignmentId => {
                const valStr = scores[studentId][assignmentId];
                if (valStr === undefined) return;
                
                const assignment = assignments.find(a => a.id === assignmentId);
                if (!assignment) return;

                const recordId = `${studentId}_${assignmentId}`;
                
                if (valStr.trim() === '') {
                    deletePerformance(recordId);
                } else {
                    const numVal = parseFloat(valStr);
                    if (!isNaN(numVal)) {
                        recordsToSave.push({
                            id: recordId,
                            studentId: studentId,
                            subject: selectedSubject || 'عام',
                            title: assignment.title,
                            category: assignment.category,
                            score: numVal,
                            maxScore: assignment.maxScore,
                            date: new Date().toISOString().split('T')[0],
                            notes: assignment.id, // Important for linking
                            createdById: currentUser?.id
                        });
                    }
                }
            });
        });

        if (recordsToSave.length > 0) {
            bulkAddPerformance(recordsToSave);
        }
        
        setScores({}); 
        setIsSaving(false);
        setLastSaved(new Date());
    };

    // --- Google Sheets Integration ---
    const handleConnectSheet = async () => {
        if (!googleSheetUrl) return;
        setIsSheetSyncing(true);
        setConnectionStatus('IDLE');
        setSheetHeaders([]);
        setSheetData([]);
        setAvailableSheets([]);
        
        try {
            const sheetId = extractGoogleSheetId(googleSheetUrl);
            if (!sheetId) throw new Error("رابط غير صالح");
            
            const apiKey = process.env.API_KEY || ''; 
            // 1. Fetch Metadata (Sheet Names)
            const meta = await fetchGoogleSpreadsheetMeta(sheetId, apiKey);
            setSheetName(meta.title);
            setAvailableSheets(meta.sheets);
            saveWorksMasterUrl(googleSheetUrl);
            setConnectionStatus('SUCCESS');

            // 2. Fetch data for first sheet automatically
            if (meta.sheets.length > 0) {
                await handleSheetSelection(meta.sheets[0], sheetId, apiKey);
            }

        } catch (e: any) {
            console.error(e);
            setConnectionStatus('ERROR');
            alert(e.message || "فشل الاتصال.");
        } finally {
            setIsSheetSyncing(false);
        }
    };

    const handleSheetSelection = async (sheetName: string, id?: string, key?: string) => {
        setIsSheetSyncing(true);
        try {
            const sheetId = id || extractGoogleSheetId(googleSheetUrl);
            const apiKey = key || process.env.API_KEY || '';
            if (!sheetId) return;

            setSelectedSheetName(sheetName);
            const { headers, data } = await fetchGoogleSheetData(sheetId, apiKey, sheetName);
            setSheetHeaders(headers || []);
            setSheetData(data || []);

            // Auto-detect identity column if not set
            if (!identityColumn && headers && headers.length > 0) {
                const guessedIdentity = headers.find((h: any) => STUDENT_NAME_HEADERS.includes(String(h).toLowerCase()));
                if (guessedIdentity) {
                    setIdentityColumn(guessedIdentity);
                    localStorage.setItem('works_sheet_identity_col', guessedIdentity);
                }
            }
        } catch (e) {
            console.error(e);
            alert("فشل جلب بيانات الورقة المختارة");
        } finally {
            setIsSheetSyncing(false);
        }
    };

    const handleMapColumn = (assignmentId: string, sheetHeader: string) => {
        const assignment = assignments.find(a => a.id === assignmentId);
        if (assignment) {
            const meta = assignment.sourceMetadata ? JSON.parse(assignment.sourceMetadata) : {};
            meta.sheetHeader = sheetHeader;
            
            const updated = { ...assignment, sourceMetadata: JSON.stringify(meta) };
            saveAssignment(updated);
            setAssignments(prev => prev.map(a => a.id === assignmentId ? updated : a));
        }
    };

    const handleSyncGrades = () => {
        if (sheetData.length === 0) return alert("يرجى الاتصال بالملف واختيار الورقة أولاً");
        if (!identityColumn) return alert("يرجى تحديد عمود اسم الطالب أولاً");

        setIsSheetSyncing(true);
        const recordsToSync: PerformanceRecord[] = [];
        let updatedCount = 0;

        // Iterate through sheet rows
        sheetData.forEach(row => {
            const studentIdentity = row[identityColumn];
            if (!studentIdentity) return;

            // Find matching student
            const student = students.find(s => s.name.trim() === String(studentIdentity).trim() || s.nationalId === String(studentIdentity).trim());
            
            if (student) {
                // Check all mapped assignments
                assignments.forEach(assign => {
                    if (assign.sourceMetadata) {
                        const meta = JSON.parse(assign.sourceMetadata);
                        const header = meta.sheetHeader;
                        
                        if (header && row[header] !== undefined) {
                            const val = row[header];
                            const numVal = parseFloat(val);
                            
                            if (!isNaN(numVal)) {
                                recordsToSync.push({
                                    id: `${student.id}_${assign.id}`,
                                    studentId: student.id,
                                    subject: selectedSubject || 'عام',
                                    title: assign.title,
                                    category: assign.category,
                                    score: numVal,
                                    maxScore: assign.maxScore,
                                    date: new Date().toISOString().split('T')[0],
                                    notes: assign.id,
                                    createdById: currentUser?.id
                                });
                                updatedCount++;
                            }
                        }
                    }
                });
            }
        });

        if (recordsToSync.length > 0) {
            bulkAddPerformance(recordsToSync);
            alert(`تمت مزامنة ${updatedCount} درجة بنجاح!`);
        } else {
            alert("لم يتم العثور على بيانات مطابقة. تأكد من أسماء الطلاب وتعيين الأعمدة.");
        }
        setIsSheetSyncing(false);
    };

    // --- Settings Handlers ---
    const handleAddAssignment = () => {
        if (!newColTitle) return;
        const newAssign: Assignment = {
            id: Date.now().toString(),
            title: newColTitle,
            category: newColCategory,
            maxScore: Number(newColMax),
            isVisible: true,
            orderIndex: assignments.length,
            teacherId: currentUser?.id,
            termId: settingTermId,
            periodId: settingPeriodId || undefined,
            classId: undefined 
        };
        saveAssignment(newAssign);
        setAssignments(getAssignments('ALL', currentUser?.id, true)); 
        setNewColTitle('');
    };

    const handleDeleteAssignment = (id: string) => {
        if(confirm('حذف هذا العمود؟')) {
            deleteAssignment(id);
            setAssignments(getAssignments('ALL', currentUser?.id, true));
        }
    };

    const toggleAssignmentVisibility = (id: string) => {
        const assign = assignments.find(a => a.id === id);
        if (assign) {
            const updated = { ...assign, isVisible: !assign.isVisible };
            saveAssignment(updated);
            setAssignments(getAssignments('ALL', currentUser?.id, true)); 
        }
    };

    const handleUpdateAssignment = (id: string, updates: Partial<Assignment>) => {
        const assign = assignments.find(a => a.id === id);
        if (assign) {
            const updated = { ...assign, ...updates };
            saveAssignment(updated);
            setAssignments(getAssignments('ALL', currentUser?.id, true));
        }
    };

    const handleMoveAssignment = (index: number, direction: number) => {
        const sorted = [...assignments].sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0));
        if (index + direction < 0 || index + direction >= sorted.length) return;
        
        const item = sorted[index];
        const target = sorted[index + direction];
        
        // Swap indices
        const temp = item.orderIndex || index;
        item.orderIndex = target.orderIndex || (index + direction);
        target.orderIndex = temp;
        
        saveAssignment(item);
        saveAssignment(target);
        setAssignments(getAssignments('ALL', currentUser?.id, true));
    };

    const saveYearWorkSettings = () => { 
        localStorage.setItem('works_year_config', JSON.stringify(yearWorkConfig)); 
        alert('تم حفظ توزيع الدرجات بنجاح'); 
    };

    const navigateToStudent = (studentId: string) => {
        navigate('/followup', { state: { studentId } });
    };

    const categories = [...DEFAULT_CATEGORIES];

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative pb-24 md:pb-6">
            
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="bg-white p-1 rounded-lg border shadow-sm flex gap-1">
                        {categories.map(cat => (
                            <button 
                                key={cat.id} 
                                onClick={() => setActiveTab(cat.id)}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === cat.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                        <button 
                            onClick={() => setActiveTab('YEAR_WORK')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'YEAR_WORK' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Calculator size={14}/> أعمال السنة
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end">
                    {Object.keys(scores).length > 0 && (
                        <button onClick={saveAllChanges} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 animate-bounce-in shadow-lg">
                            <Save size={16}/> حفظ التغييرات
                        </button>
                    )}
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white border rounded hover:bg-gray-50 text-gray-600"><Settings size={18}/></button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border">
                    <Filter size={14} className="text-gray-400 mr-1"/>
                    <select className="bg-transparent text-sm font-bold text-gray-700 outline-none" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                        <option value="">كل الفترات</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {activeTerm?.periods && activeTerm.periods.length > 0 && (
                        <>
                            <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
                            <select className="bg-transparent text-sm font-bold text-gray-700 outline-none" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                                <option value="">كل الفترات</option>
                                {activeTerm.periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </>
                    )}
                </div>
                
                <select className="p-2 border rounded-lg text-sm font-bold bg-white" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                    <option value="">كل الفصول</option>
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute top-2.5 right-3 text-gray-400" size={16}/>
                    <input className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
            </div>

            {/* GRID VIEW */}
            {activeTab !== 'YEAR_WORK' ? (
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    {filteredAssignments.length > 0 ? (
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            <table className="w-full text-right text-sm border-collapse">
                                <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 w-10 text-center border-b">#</th>
                                        <th className="p-3 border-b min-w-[200px] sticky right-0 bg-gray-50 z-20 shadow-sm">اسم الطالب</th>
                                        {filteredAssignments.map(col => (
                                            <th key={col.id} className={`p-3 border-b text-center min-w-[100px] border-l border-gray-200 group relative ${!col.isVisible ? 'bg-red-50/50' : ''}`}>
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1">
                                                        {col.url && (
                                                            <a href={col.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800" title="رابط المرفق">
                                                                <LinkIcon size={12}/>
                                                            </a>
                                                        )}
                                                        <span>{col.title}</span>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleAssignmentVisibility(col.id); }}
                                                            className={`p-1 rounded-full transition-colors ${col.isVisible ? 'text-gray-300 hover:text-blue-500' : 'text-red-500 bg-red-100 hover:text-red-700'}`}
                                                            title={col.isVisible ? 'ظاهر للطلاب' : 'مخفي عن الطلاب'}
                                                        >
                                                            {col.isVisible ? <Eye size={12}/> : <EyeOff size={12}/>}
                                                        </button>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-normal">({col.maxScore})</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.map((student, idx) => (
                                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="p-3 text-center text-gray-400 text-xs font-mono">{idx + 1}</td>
                                            <td className="p-3 font-bold text-gray-800 sticky right-0 bg-white group-hover:bg-gray-50 transition-colors z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] cursor-pointer hover:text-indigo-600" onClick={() => navigateToStudent(student.id)}>
                                                {student.name}
                                                <div className="text-[10px] text-gray-400 font-normal">{student.className}</div>
                                            </td>
                                            {filteredAssignments.map(col => {
                                                const val = getStudentScore(student.id, col.id);
                                                return (
                                                    <td key={col.id} className={`p-0 border-l border-gray-100 relative ${!col.isVisible ? 'bg-gray-50/30' : ''}`}>
                                                        <input 
                                                            className={`w-full h-full p-3 text-center outline-none bg-transparent font-mono font-bold transition-colors focus:bg-indigo-50 focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${val ? 'text-indigo-700' : 'text-gray-400'}`}
                                                            value={val}
                                                            onChange={e => handleScoreChange(student.id, col.id, e.target.value)}
                                                            placeholder="-"
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Table size={48} className="mb-4 opacity-20"/>
                            <p>لا توجد أعمدة (تقييمات) في هذا التصنيف.</p>
                            <button onClick={() => setIsSettingsOpen(true)} className="mt-2 text-indigo-600 font-bold hover:underline text-sm">أضف عمود جديد</button>
                        </div>
                    )}
                </div>
            ) : (
                // YEAR WORK VIEW
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-center text-sm border-collapse">
                            <thead className="bg-orange-50 text-orange-900 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 text-right bg-orange-50 sticky right-0 z-20">الطالب</th>
                                    <th className="p-3 border-l border-orange-200">الواجبات ({yearWorkConfig.hw})</th>
                                    <th className="p-3 border-l border-orange-200">الأنشطة ({yearWorkConfig.act})</th>
                                    <th className="p-3 border-l border-orange-200">الاختبارات ({yearWorkConfig.exam})</th>
                                    <th className="p-3 border-l border-orange-200">الحضور ({yearWorkConfig.att})</th>
                                    <th className="p-3 border-l border-orange-200 bg-orange-100 text-orange-950">المجموع (100)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map(student => {
                                    // Calculate aggregations dynamically
                                    const calcTotal = (cat: string, weight: number) => {
                                        const catAssigns = assignments.filter(a => a.category === cat && (!selectedTermId || a.termId === selectedTermId));
                                        let totalObtained = 0;
                                        let totalMax = 0;
                                        
                                        catAssigns.forEach(assign => {
                                            const rec = performance.find(p => p.studentId === student.id && (p.notes === assign.id || p.title === assign.title));
                                            if (rec) {
                                                totalObtained += rec.score;
                                                totalMax += rec.maxScore;
                                            } else {
                                                totalMax += assign.maxScore; // Assume 0 if missing
                                            }
                                        });
                                        
                                        const percentage = totalMax > 0 ? totalObtained / totalMax : 0;
                                        return Math.round(percentage * weight);
                                    };

                                    const hw = calcTotal('HOMEWORK', yearWorkConfig.hw);
                                    const act = calcTotal('ACTIVITY', yearWorkConfig.act);
                                    const exam = calcTotal('PLATFORM_EXAM', yearWorkConfig.exam);
                                    
                                    // Attendance Calc
                                    const studAtt = attendance.filter(a => a.studentId === student.id);
                                    const totalDays = studAtt.length;
                                    const present = studAtt.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
                                    const attRate = totalDays > 0 ? present / totalDays : 1;
                                    const attScore = Math.round(attRate * yearWorkConfig.att);

                                    const total = hw + act + exam + attScore;

                                    return (
                                        <tr key={student.id} className="hover:bg-orange-50/20">
                                            <td className="p-3 text-right font-bold text-gray-800 sticky right-0 bg-white border-l cursor-pointer hover:text-indigo-600" onClick={() => navigateToStudent(student.id)}>{student.name}</td>
                                            <td className="p-3 border-l">{hw}</td>
                                            <td className="p-3 border-l">{act}</td>
                                            <td className="p-3 border-l">{exam}</td>
                                            <td className="p-3 border-l">{attScore}</td>
                                            <td className="p-3 border-l font-black text-lg text-orange-600 bg-orange-50/50">{total}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-bounce-in overflow-hidden">
                        
                        <div className="flex border-b">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'MANUAL' ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50' : 'text-gray-500 hover:bg-gray-50'}`}>إدارة يدوية</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'SHEET' ? 'border-b-2 border-green-600 text-green-700 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}>ربط Google Sheet</button>
                            <button onClick={() => setSettingsTab('DISTRIBUTION')} className={`flex-1 py-3 font-bold text-sm flex items-center justify-center gap-2 ${settingsTab === 'DISTRIBUTION' ? 'border-b-2 border-orange-600 text-orange-700 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}>
                               توزيع أعمال السنة <PieChartIcon size={14}/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 bg-gray-50">
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                                        <h4 className="font-bold text-gray-800 mb-4 text-sm">إضافة عمود جديد</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">العنوان</label>
                                                <input className="w-full p-2 border rounded text-sm" value={newColTitle} onChange={e => setNewColTitle(e.target.value)} placeholder="مثال: واجب 1"/>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">الدرجة العظمى</label>
                                                <input type="number" className="w-full p-2 border rounded text-sm" value={newColMax} onChange={e => setNewColMax(e.target.value)}/>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">التصنيف</label>
                                                <select className="w-full p-2 border rounded text-sm" value={newColCategory} onChange={e => setNewColCategory(e.target.value)}>
                                                    {DEFAULT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                                </select>
                                            </div>
                                            <button onClick={handleAddAssignment} className="bg-purple-600 text-white h-10 px-4 rounded font-bold hover:bg-purple-700">إضافة</button>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                        <div className="p-3 bg-gray-50 border-b font-bold text-sm text-gray-600">الأعمدة الحالية</div>
                                        <div className="divide-y divide-gray-100">
                                            {assignments.sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0)).map((a, idx) => (
                                                <div key={a.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <div className="flex flex-col gap-1">
                                                            <button onClick={() => handleMoveAssignment(idx, -1)} disabled={idx===0} className="text-gray-400 hover:text-blue-500 disabled:opacity-30"><ArrowUp size={12}/></button>
                                                            <button onClick={() => handleMoveAssignment(idx, 1)} disabled={idx===assignments.length-1} className="text-gray-400 hover:text-blue-500 disabled:opacity-30"><ArrowDown size={12}/></button>
                                                        </div>
                                                        <span className="font-bold text-gray-800 text-sm w-32 truncate">{a.title}</span>
                                                        <span className="text-xs text-gray-400">({a.maxScore})</span>
                                                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded border">{CATEGORY_LABELS[a.category] || a.category}</span>
                                                        <input 
                                                            className="border rounded px-2 py-1 text-xs w-48 text-left dir-ltr" 
                                                            placeholder="رابط (URL)..."
                                                            value={a.url || ''}
                                                            onChange={e => handleUpdateAssignment(a.id, { url: e.target.value })}
                                                        />
                                                        <button 
                                                            onClick={() => toggleAssignmentVisibility(a.id)}
                                                            className={`p-1 rounded-full ${a.isVisible ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}
                                                            title={a.isVisible ? 'ظاهر للطلاب' : 'مخفي عن الطلاب'}
                                                        >
                                                            {a.isVisible ? <Eye size={14}/> : <EyeOff size={14}/>}
                                                        </button>
                                                    </div>
                                                    <button onClick={() => handleDeleteAssignment(a.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                                                </div>
                                            ))}
                                            {assignments.length === 0 && <p className="p-4 text-center text-gray-400 text-sm">لا توجد أعمدة</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'DISTRIBUTION' && (
                                <div className="max-w-2xl mx-auto space-y-6">
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-200">
                                        <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                            <PieChartIcon size={18}/> توزيع درجات أعمال السنة
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
                            
                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6">
                                    <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                                        <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                                            <FileSpreadsheet size={20}/> إعدادات الربط مع Google Sheets
                                        </h4>
                                        
                                        <div className="space-y-4">
                                            {/* Connection Area */}
                                            <div className="flex gap-2">
                                                <input 
                                                    className="flex-1 p-3 border rounded-lg text-sm dir-ltr bg-white" 
                                                    placeholder="الصق رابط الملف (https://docs.google.com/spreadsheets/d/...)"
                                                    value={googleSheetUrl}
                                                    onChange={e => setGoogleSheetUrl(e.target.value)}
                                                />
                                                <button 
                                                    onClick={handleConnectSheet}
                                                    disabled={isSheetSyncing}
                                                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 text-sm flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {isSheetSyncing ? <Loader2 className="animate-spin" size={16}/> : <LinkIcon size={16}/>}
                                                    اتصال
                                                </button>
                                            </div>

                                            {/* Status Feedback */}
                                            {connectionStatus === 'SUCCESS' && (
                                                <div className="bg-green-100 text-green-700 p-3 rounded-lg text-sm flex items-center gap-2">
                                                    <CheckCircle size={16}/> تم الاتصال بنجاح بالملف: <b>{sheetName}</b>
                                                </div>
                                            )}
                                            {connectionStatus === 'ERROR' && (
                                                <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                                                    <AlertTriangle size={16}/> فشل الاتصال. تأكد أن الملف عام (Anyone with link) أو تحقق من المفتاح.
                                                </div>
                                            )}

                                            {/* Sheet Selection & Mapping Config (Only if connected) */}
                                            {connectionStatus === 'SUCCESS' && availableSheets.length > 0 && (
                                                <div className="bg-white p-4 rounded-xl border border-green-200 mt-4 animate-fade-in">
                                                    <h5 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2"><Map size={16}/> إعدادات الورقة والمطابقة</h5>
                                                    
                                                    {/* Sheet Selector */}
                                                    <div className="mb-4 bg-gray-50 p-3 rounded-lg border">
                                                        <label className="block text-xs font-bold text-gray-500 mb-2">اختر الورقة (Tab)</label>
                                                        <select 
                                                            className="w-full p-2 border rounded-lg bg-white font-bold text-gray-700"
                                                            value={selectedSheetName}
                                                            onChange={e => handleSheetSelection(e.target.value)}
                                                            disabled={isSheetSyncing}
                                                        >
                                                            {availableSheets.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </div>

                                                    {/* Identity Mapping */}
                                                    {sheetHeaders.length > 0 && (
                                                        <div className="mb-4 bg-gray-50 p-3 rounded-lg border">
                                                            <label className="block text-xs font-bold text-gray-500 mb-2">1. عمود اسم الطالب / الهوية (للمطابقة)</label>
                                                            <select 
                                                                className="w-full p-2 border rounded-lg bg-white font-bold text-indigo-700"
                                                                value={identityColumn}
                                                                onChange={e => {
                                                                    setIdentityColumn(e.target.value);
                                                                    localStorage.setItem('works_sheet_identity_col', e.target.value);
                                                                }}
                                                            >
                                                                <option value="">-- اختر العمود --</option>
                                                                {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {/* Grades Mapping */}
                                                    {sheetHeaders.length > 0 && (
                                                        <div className="mb-4">
                                                            <label className="block text-xs font-bold text-gray-500 mb-2">2. ربط أعمدة الدرجات (Assignment -&gt; Sheet Column)</label>
                                                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                                                                {assignments.map(assign => {
                                                                    const meta = assign.sourceMetadata ? JSON.parse(assign.sourceMetadata) : {};
                                                                    return (
                                                                        <div key={assign.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded border">
                                                                            <span className="text-sm font-bold w-1/3 truncate" title={assign.title}>{assign.title}</span>
                                                                            <ArrowRight size={14} className="text-gray-400"/>
                                                                            <select 
                                                                                className="flex-1 p-1.5 border rounded text-xs"
                                                                                value={meta.sheetHeader || ''}
                                                                                onChange={e => handleMapColumn(assign.id, e.target.value)}
                                                                            >
                                                                                <option value="">(غير مرتبط)</option>
                                                                                {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                                            </select>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action */}
                                                    <div className="pt-2 border-t flex justify-end">
                                                        <button 
                                                            onClick={handleSyncGrades}
                                                            disabled={isSheetSyncing || !identityColumn || sheetData.length === 0}
                                                            className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2 shadow-md disabled:opacity-50"
                                                        >
                                                            {isSheetSyncing ? <Loader2 className="animate-spin" size={16}/> : <ArrowDownCircle size={16}/>}
                                                            سحب الدرجات وتحديث السجل
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-center text-gray-400 text-xs">ملاحظة: تأكد من تطابق أسماء الطلاب أو أرقام الهوية بين النظام وملف Excel لضمان دقة المزامنة.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-sm font-bold hover:bg-gray-300">إغلاق</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
