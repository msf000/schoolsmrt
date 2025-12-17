import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, saveAssignment, deleteAssignment, getStudents, getWorksMasterUrl, saveWorksMasterUrl, downloadFromSupabase, bulkAddPerformance, deletePerformance, forceRefreshData, getTeacherAssignments } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData, extractGoogleSheetId, fetchGoogleSheetData, fetchGoogleSpreadsheetMeta } from '../services/excelService';
import { Save, Filter, Table, Download, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, Link as LinkIcon, DownloadCloud, X, Check, ExternalLink, RefreshCw, Loader2, CheckSquare, Square, AlertTriangle, ArrowRight, Calculator, CloudLightning, Zap, Edit2, Grid, ListFilter, Tag, ArrowDownToLine, Maximize, Link2, PieChart as PieChartIcon, ChevronRight, PenTool, Clipboard, Printer, MoreVertical, Eye, EyeOff, Map, ArrowDownCircle, CheckCircle, ArrowUp, ArrowDown, ArrowLeftRight, Layers } from 'lucide-react';
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
    
    const [activeTab, setActiveTab] = useState<string>(() => {
        const saved = localStorage.getItem('works_active_tab');
        return saved || 'HOMEWORK';
    });

    // --- Persisted Filter State ---
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedPeriodId, setSelectedPeriodId] = useState(() => localStorage.getItem('works_period_id') || ''); 
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || '');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 
    
    useEffect(() => {
        localStorage.setItem('works_active_tab', activeTab);
        localStorage.setItem('works_term_id', selectedTermId);
        localStorage.setItem('works_period_id', selectedPeriodId);
        localStorage.setItem('works_subject', selectedSubject);
        localStorage.setItem('works_class', selectedClass);
    }, [activeTab, selectedTermId, selectedPeriodId, selectedSubject, selectedClass]);

    const [searchTerm, setSearchTerm] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); 

    const [yearWorkConfig, setYearWorkConfig] = useState<{ hw: number, act: number, att: number, exam: number }>({
        hw: 10, act: 10, att: 5, exam: 20
    });

    // --- Google Sheet Integration State ---
    // Fix: Explicitly type the state as string to avoid 'unknown' inference and resolve error in handleConnectSheet
    const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(getWorksMasterUrl());
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [identityColumn, setIdentityColumn] = useState(() => localStorage.getItem('works_sheet_identity_col') || '');
    
    // Mapping categories to specific sheet names
    const [sheetMapping, setSheetMapping] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('works_sheet_mapping');
        return saved ? JSON.parse(saved) : {};
    });

    const [settingTermId, setSettingTermId] = useState(selectedTermId);
    const [settingPeriodId, setSettingPeriodId] = useState(selectedPeriodId);
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'DISTRIBUTION'>('MANUAL');
    const [newColTitle, setNewColTitle] = useState('');
    const [newColMax, setNewColMax] = useState('10');
    const [newColCategory, setNewColCategory] = useState<string>('HOMEWORK');

    useEffect(() => {
        if (currentUser) {
            setSubjects(getSubjects(currentUser.id));
            const loadedTerms = getAcademicTerms(currentUser.id);
            setTerms(loadedTerms);
            
            const savedConfig = localStorage.getItem('works_year_config'); 
            if (savedConfig) {
                try {
                    const parsed = JSON.parse(savedConfig);
                    if (parsed) setYearWorkConfig(parsed);
                } catch {}
            }
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            setAssignments(getAssignments('ALL', currentUser.id, true));
        }
    }, [currentUser, isSettingsOpen]);

    const uniqueClasses = useMemo(() => { 
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        getTeacherAssignments(currentUser?.id).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort(); 
    }, [students, currentUser]);

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
            const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId; 
            const categoryMatch = a.category === activeTab; 
            return termMatch && periodMatch && categoryMatch; 
        }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0)); 
    }, [assignments, selectedTermId, selectedPeriodId, activeTab]);
    
    const getStudentScore = (studentId: string, assignmentId: string) => {
        if (scores[studentId] && scores[studentId][assignmentId] !== undefined) return scores[studentId][assignmentId];
        const record = performance.find(p => p.studentId === studentId && (p.notes === assignmentId)); 
        return record ? record.score.toString() : '';
    };

    const handleScoreChange = (studentId: string, assignmentId: string, value: string) => {
        setScores(prev => ({
            ...prev,
            [studentId]: { ...(prev[studentId] || {}), [assignmentId]: value }
        }));
    };

    const saveAllChanges = async () => {
        if (Object.keys(scores).length === 0) return;
        setIsSaving(true);
        const recordsToSave: PerformanceRecord[] = [];
        
        Object.keys(scores).forEach(studentId => {
            Object.keys(scores[studentId]).forEach(assignmentId => {
                const valStr = scores[studentId][assignmentId];
                const assignment = assignments.find(a => a.id === assignmentId);
                if (!assignment) return;
                const recordId = `${studentId}_${assignmentId}`;
                
                if (valStr.trim() === '') deletePerformance(recordId);
                else {
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
                            notes: assignment.id,
                            createdById: currentUser?.id
                        });
                    }
                }
            });
        });

        if (recordsToSave.length > 0) bulkAddPerformance(recordsToSave);
        setScores({}); 
        setIsSaving(false);
    };

    // --- Google Sheets Integration ---
    const handleConnectSheet = async () => {
        if (!googleSheetUrl) return;
        setIsSheetSyncing(true);
        try {
            // Fix: ensure sheetId is retrieved from string input to resolve TypeScript error on line 229
            const sheetId = extractGoogleSheetId(googleSheetUrl);
            if (!sheetId) throw new Error("رابط غير صالح");
            // Fix: ensure process.env.API_KEY is handled as string for internal service call
            const meta = await fetchGoogleSpreadsheetMeta(sheetId, process.env.API_KEY || '');
            setAvailableSheets(meta.sheets);
            saveWorksMasterUrl(googleSheetUrl);
            setConnectionStatus('SUCCESS');
        } catch (e: any) {
            setConnectionStatus('ERROR');
            alert(e.message || "فشل الاتصال.");
        } finally {
            setIsSheetSyncing(false);
        }
    };

    // Bulk Sync: Iterates through all categories and pulls data
    const handleSyncAllTabs = async () => {
        if (!googleSheetUrl) return alert("يرجى ربط ملف Google Sheet أولاً.");
        const sheetId = extractGoogleSheetId(googleSheetUrl);
        // Fix: ensure API_KEY is handled as string
        const apiKey = process.env.API_KEY || '';
        if (!sheetId) return;

        setIsSheetSyncing(true);
        let totalUpdated = 0;

        try {
            const currentIdentityCol = identityColumn || localStorage.getItem('works_sheet_identity_col');
            if (!currentIdentityCol) throw new Error("لم يتم تحديد عمود اسم الطالب للمطابقة.");

            // Iterate through each category in the mapping
            for (const [category, targetSheet] of Object.entries(sheetMapping)) {
                if (!targetSheet) continue;

                const { headers, data } = await fetchGoogleSheetData(sheetId, apiKey, targetSheet);
                if (!data || data.length === 0) continue;

                const recordsToSync: PerformanceRecord[] = [];
                const categoryAssignments = assignments.filter(a => a.category === category);

                data.forEach((row: any) => {
                    const studentIdentity = row[currentIdentityCol];
                    if (!studentIdentity) return;

                    const student = students.find(s => s.name.trim() === String(studentIdentity).trim() || s.nationalId === String(studentIdentity).trim());
                    if (student) {
                        categoryAssignments.forEach(assign => {
                            if (assign.sourceMetadata) {
                                const meta = JSON.parse(assign.sourceMetadata);
                                const header = meta.sheetHeader;
                                if (header && row[header] !== undefined) {
                                    const numVal = parseFloat(row[header]);
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
                                        totalUpdated++;
                                    }
                                }
                            }
                        });
                    }
                });

                if (recordsToSync.length > 0) bulkAddPerformance(recordsToSync);
            }

            alert(`تمت مزامنة ${totalUpdated} درجة لجميع التبويبات بنجاح.`);
        } catch (e: any) {
            alert("خطأ في المزامنة الشاملة: " + e.message);
        } finally {
            setIsSheetSyncing(false);
        }
    };

    const handleSortBySheet = async (category: string) => {
        const targetSheet = sheetMapping[category];
        if (!targetSheet) return alert("يرجى تحديد الورقة لهذا التبويب أولاً.");
        
        setIsSheetSyncing(true);
        try {
            const sheetId = extractGoogleSheetId(googleSheetUrl);
            // Fix: ensure API_KEY is handled as string
            const { headers } = await fetchGoogleSheetData(sheetId!, process.env.API_KEY || '', targetSheet);
            
            const updatedAssignments = assignments.filter(a => a.category === category).map(assign => {
                const meta = assign.sourceMetadata ? JSON.parse(assign.sourceMetadata) : {};
                const header = meta.sheetHeader;
                if (header) {
                    const index = headers.indexOf(header);
                    if (index !== -1) return { ...assign, orderIndex: index };
                }
                return assign;
            });

            updatedAssignments.forEach(a => saveAssignment(a));
            setAssignments(getAssignments('ALL', currentUser?.id, true));
            alert(`تم ترتيب أعمدة ${CATEGORY_LABELS[category]} بنجاح.`);
        } catch (e) {
            alert("فشل الترتيب.");
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
            setAssignments(getAssignments('ALL', currentUser?.id, true));
        }
    };

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
            periodId: settingPeriodId || undefined
        };
        saveAssignment(newAssign);
        setAssignments(getAssignments('ALL', currentUser?.id, true)); 
        setNewColTitle('');
    };

    const handleUpdateMapping = (category: string, sheet: string) => {
        const newMap = { ...sheetMapping, [category]: sheet };
        setSheetMapping(newMap);
        localStorage.setItem('works_sheet_mapping', JSON.stringify(newMap));
    };

    const activeTerm = terms.find(t => t.id === selectedTermId);
    const activePeriod = activeTerm?.periods?.find(p => p.id === selectedPeriodId);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative pb-24 md:pb-6">
            
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="bg-white p-1 rounded-lg border shadow-sm flex gap-1">
                        {DEFAULT_CATEGORIES.map(cat => (
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
                    {googleSheetUrl && Object.keys(sheetMapping).length > 0 && (
                        <button 
                            onClick={handleSyncAllTabs} 
                            disabled={isSheetSyncing}
                            className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow hover:bg-green-700 disabled:opacity-50"
                        >
                            {isSheetSyncing ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>} 
                            <span className="hidden md:inline">مزامنة الكل من الملف</span>
                        </button>
                    )}
                    {Object.keys(scores).length > 0 && (
                        <button onClick={saveAllChanges} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 animate-bounce-in shadow-lg">
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
                        <option value="">كل الفصول</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {activeTerm?.periods && activeTerm.periods.length > 0 && (
                        <>
                            <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
                            <select className="bg-transparent text-sm font-bold text-purple-700 outline-none" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
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
                    <input className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
            </div>

            {/* Main Content Area */}
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
                                            <th key={col.id} className="p-3 border-b text-center min-w-[100px] border-l border-gray-200 group relative">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1">
                                                        {col.url && <a href={col.url} target="_blank" rel="noreferrer" className="text-blue-600"><LinkIcon size={12}/></a>}
                                                        <span>{col.title}</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-normal">({col.maxScore})</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredStudents.map((student, idx) => (
                                        <tr key={student.id} className="hover:bg-gray-50/50">
                                            <td className="p-3 text-center text-gray-400 text-xs font-mono">{idx + 1}</td>
                                            <td className="p-3 font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] cursor-pointer hover:text-indigo-600" onClick={() => navigate('/followup', { state: { studentId: student.id } })}>
                                                {student.name}
                                                <div className="text-[10px] text-gray-400 font-normal">{student.className}</div>
                                            </td>
                                            {filteredAssignments.map(col => (
                                                <td key={col.id} className="p-0 border-l border-gray-100">
                                                    <input 
                                                        className="w-full h-full p-3 text-center outline-none bg-transparent font-mono font-bold focus:bg-indigo-50"
                                                        value={getStudentScore(student.id, col.id)}
                                                        onChange={e => handleScoreChange(student.id, col.id, e.target.value)}
                                                        placeholder="-"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Layers size={48} className="mb-4 opacity-20"/>
                            <p>لا توجد تقييمات مرتبطة بالفترة المحددة في هذا التبويب.</p>
                            <button onClick={() => setIsSettingsOpen(true)} className="mt-2 text-indigo-600 font-bold hover:underline">إضافة عمود جديد</button>
                        </div>
                    )}
                </div>
            ) : (
                // YEAR WORK VIEW: Strictly filtered by Term and Period
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col animate-fade-in">
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
                                    const calcTotal = (cat: string, weight: number) => {
                                        // Filtering by Category + Term + Period
                                        const catAssigns = assignments.filter(a => 
                                            a.category === cat && 
                                            (!selectedTermId || a.termId === selectedTermId) &&
                                            (!selectedPeriodId || a.periodId === selectedPeriodId)
                                        );
                                        
                                        let totalObtained = 0;
                                        let totalMax = 0;
                                        catAssigns.forEach(assign => {
                                            const rec = performance.find(p => p.studentId === student.id && p.notes === assign.id);
                                            if (rec) { totalObtained += rec.score; totalMax += rec.maxScore; } 
                                            else { totalMax += assign.maxScore; }
                                        });
                                        return totalMax > 0 ? Math.round((totalObtained / totalMax) * weight) : 0;
                                    };

                                    const hw = calcTotal('HOMEWORK', yearWorkConfig.hw);
                                    const act = calcTotal('ACTIVITY', yearWorkConfig.act);
                                    const exam = calcTotal('PLATFORM_EXAM', yearWorkConfig.exam);
                                    
                                    const studAtt = attendance.filter(a => 
                                        a.studentId === student.id && 
                                        (!activeTerm || (a.date >= activeTerm.startDate && a.date <= activeTerm.endDate)) &&
                                        (!activePeriod || (a.date >= activePeriod.startDate && a.date <= activePeriod.endDate))
                                    );
                                    const totalDays = studAtt.length;
                                    const present = studAtt.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
                                    const attScore = totalDays > 0 ? Math.round((present / totalDays) * yearWorkConfig.att) : yearWorkConfig.att;

                                    const total = hw + act + exam + attScore;

                                    return (
                                        <tr key={student.id} className="hover:bg-orange-50/20">
                                            <td className="p-3 text-right font-bold text-gray-800 sticky right-0 bg-white border-l">{student.name}</td>
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
                            <button onClick={() => setSettingsTab('MANUAL')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'MANUAL' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500'}`}>الأعمدة اليدوية</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'SHEET' ? 'border-b-2 border-green-600 text-green-700 bg-green-50' : 'text-gray-500'}`}>ربط Google Sheets</button>
                            <button onClick={() => setSettingsTab('DISTRIBUTION')} className={`flex-1 py-3 font-bold text-sm ${settingsTab === 'DISTRIBUTION' ? 'border-b-2 border-orange-600 text-orange-700 bg-orange-50' : 'text-gray-500'}`}>توزيع الدرجات</button>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6">
                                    <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                                        <h4 className="font-bold text-indigo-800 mb-4 text-sm">إضافة عمود رصد جديد</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">الفصل</label>
                                                <select className="w-full p-2 border rounded text-xs" value={settingTermId} onChange={e => setSettingTermId(e.target.value)}>
                                                    <option value="">اختر الفصل...</option>
                                                    {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">الفترة</label>
                                                <select className="w-full p-2 border rounded text-xs" value={settingPeriodId} onChange={e => setSettingPeriodId(e.target.value)}>
                                                    <option value="">اختر الفترة...</option>
                                                    {terms.find(t=>t.id===settingTermId)?.periods?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-1"><input className="w-full p-2 border rounded text-xs" value={newColTitle} onChange={e => setNewColTitle(e.target.value)} placeholder="العنوان"/></div>
                                            <div className="md:col-span-1">
                                                <select className="w-full p-2 border rounded text-xs" value={newColCategory} onChange={e => setNewColCategory(e.target.value)}>
                                                    {DEFAULT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                                </select>
                                            </div>
                                            <button onClick={handleAddAssignment} className="bg-indigo-600 text-white p-2 rounded font-bold text-xs">إضافة</button>
                                        </div>
                                    </div>
                                    <div className="divide-y border rounded-xl overflow-hidden">
                                        {assignments.map((a, idx) => (
                                            <div key={a.id} className="p-3 flex justify-between items-center bg-white hover:bg-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-bold text-gray-400">#{idx+1}</span>
                                                    <span className="font-bold text-sm w-32 truncate">{a.title}</span>
                                                    <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded uppercase">{a.category}</span>
                                                </div>
                                                <button onClick={() => { deleteAssignment(a.id); setAssignments(getAssignments('ALL', currentUser?.id, true)); }} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                                        <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2"><FileSpreadsheet size={20}/> إعدادات الربط المتعدد</h4>
                                        <div className="flex gap-2 mb-6">
                                            <input className="flex-1 p-3 border rounded-lg text-sm dir-ltr bg-white" placeholder="رابط Google Sheet" value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} />
                                            <button onClick={handleConnectSheet} className="bg-green-600 text-white px-6 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm"><LinkIcon size={16}/> اتصال</button>
                                        </div>

                                        {connectionStatus === 'SUCCESS' && (
                                            <div className="space-y-6">
                                                <div className="bg-white p-4 rounded-xl border border-green-100">
                                                    <h5 className="font-bold text-gray-700 mb-3 text-xs flex items-center gap-2"><Layers size={14}/> ربط الأوراق (Tabs) بالتصنيفات</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        {DEFAULT_CATEGORIES.map(cat => (
                                                            <div key={cat.id} className="p-3 bg-gray-50 rounded-lg border">
                                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">{cat.label}</label>
                                                                <select 
                                                                    className="w-full p-2 border rounded-lg text-xs bg-white"
                                                                    value={sheetMapping[cat.id] || ''}
                                                                    onChange={e => handleUpdateMapping(cat.id, e.target.value)}
                                                                >
                                                                    <option value="">-- اختر الورقة --</option>
                                                                    {availableSheets.map(s => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                                <button onClick={() => handleSortBySheet(cat.id)} className="mt-2 text-[9px] text-indigo-600 font-bold hover:underline flex items-center gap-1"><ArrowLeftRight size={10}/> ترتيب أعمدة {cat.label}</button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                                    <h5 className="font-bold text-indigo-800 mb-3 text-xs">تعيين أعمدة الدرجات الفردية</h5>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                                                        {assignments.filter(a => a.category === activeTab).map(assign => {
                                                            const meta = assign.sourceMetadata ? JSON.parse(assign.sourceMetadata) : {};
                                                            return (
                                                                <div key={assign.id} className="flex items-center gap-2 bg-white p-2 rounded border text-xs">
                                                                    <span className="font-bold w-1/3 truncate">{assign.title}</span>
                                                                    <ArrowRight size={12} className="text-gray-400"/>
                                                                    <select 
                                                                        className="flex-1 p-1 border rounded"
                                                                        value={meta.sheetHeader || ''}
                                                                        onChange={e => handleMapColumn(assign.id, e.target.value)}
                                                                    >
                                                                        <option value="">(غير مرتبط)</option>
                                                                        {/* Note: This list should Ideally come from the sheet mapped to current activeTab */}
                                                                        <option value={meta.sheetHeader}>{meta.sheetHeader || '-- اختر --'}</option>
                                                                    </select>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'DISTRIBUTION' && (
                                <div className="max-w-md mx-auto space-y-4 pt-10">
                                    <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 shadow-sm text-center">
                                        <PieChartIcon size={40} className="mx-auto text-orange-500 mb-4"/>
                                        <h4 className="font-black text-orange-900 mb-6">توزيع درجات أعمال السنة (100)</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">الواجبات</label><input type="number" className="w-full p-3 border rounded-xl text-center font-black text-xl" value={yearWorkConfig.hw} onChange={e => setYearWorkConfig({...yearWorkConfig, hw: Number(e.target.value)})}/></div>
                                            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">الأنشطة</label><input type="number" className="w-full p-3 border rounded-xl text-center font-black text-xl" value={yearWorkConfig.act} onChange={e => setYearWorkConfig({...yearWorkConfig, act: Number(e.target.value)})}/></div>
                                            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">الحضور</label><input type="number" className="w-full p-3 border rounded-xl text-center font-black text-xl" value={yearWorkConfig.att} onChange={e => setYearWorkConfig({...yearWorkConfig, att: Number(e.target.value)})}/></div>
                                            <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500">الاختبارات</label><input type="number" className="w-full p-3 border rounded-xl text-center font-black text-xl" value={yearWorkConfig.exam} onChange={e => setYearWorkConfig({...yearWorkConfig, exam: Number(e.target.value)})}/></div>
                                        </div>
                                        <button onClick={() => { localStorage.setItem('works_year_config', JSON.stringify(yearWorkConfig)); alert('تم الحفظ'); }} className="mt-8 w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 shadow-lg">حفظ التوزيع</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end"><button onClick={() => setIsSettingsOpen(false)} className="px-6 py-2 bg-gray-200 rounded-lg font-bold hover:bg-gray-300">إغلاق</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;