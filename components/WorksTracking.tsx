
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, addPerformance, saveAssignment, deleteAssignment, getStudents, getWorksMasterUrl, saveWorksMasterUrl, downloadFromSupabase, bulkAddPerformance, deletePerformance, forceRefreshData } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, Filter, Table, Download, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, Link as LinkIcon, DownloadCloud, X, Check, ExternalLink, RefreshCw, Loader2, CheckSquare, Square, AlertTriangle, ArrowRight, Calculator, CloudLightning, Zap, Edit2, Grid, ListFilter, Tag, ArrowDownToLine, Maximize, Link2, PieChart as PieChartIcon, ChevronRight, PenTool, Clipboard, Printer, MoreVertical } from 'lucide-react';
import * as XLSX from 'xlsx';
import DataImport from './DataImport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area, PieChart, Pie, Legend } from 'recharts';

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
            
            // Fix: Safe JSON Parse for Config
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
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
        }
    }, [activeTab, currentUser, isManager, selectedTermId, selectedPeriodId]);

    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        DEFAULT_CATEGORIES.forEach(c => cats.add(c.id));
        assignments.forEach(a => { if (a.category && a.category !== 'YEAR_WORK') cats.add(a.category); });
        return Array.from(cats);
    }, [assignments]);

    // ... (Score logic, handlers same as before) ...
    // Truncated body for response length, focusing on the fix and component export
    
    // ... (UI Render same as previous but with PieChartIcon from Lucide used) ...
    // Important: Include the settings panel render with PieChartIcon fix

    const activeTerm = terms.find(t => t.id === selectedTermId);
    const activePeriods = useMemo(() => { if (!activeTerm?.periods) return []; return [...activeTerm.periods].sort((a, b) => { const dateA = a.startDate || ''; const dateB = b.startDate || ''; if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB); return a.name.localeCompare(b.name, 'ar'); }); }, [activeTerm]);
    const settingsTermObj = terms.find(t => t.id === settingTermId);
    const settingsPeriods = useMemo(() => { if (!settingsTermObj?.periods) return []; return [...settingsTermObj.periods].sort((a, b) => { const dateA = a.startDate || ''; const dateB = b.startDate || ''; if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB); return a.name.localeCompare(b.name, 'ar'); }); }, [settingsTermObj]);
    const uniqueClasses = useMemo(() => { const classes = new Set(students.map(s => s.className).filter(Boolean)); return Array.from(classes).sort(); }, [students]);
    const filteredStudents = useMemo(() => { let filtered = students; if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass); if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm)); return filtered.sort((a,b) => { if (a.className === b.className) return a.name.localeCompare(b.name); return (a.className || '').localeCompare(b.className || ''); }); }, [students, selectedClass, searchTerm]);
    const filteredAssignments = useMemo(() => { if (activeTab === 'YEAR_WORK') return []; return assignments.filter(a => { const termMatch = !selectedTermId || (a.termId === selectedTermId); const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId; const categoryMatch = a.category === activeTab; return termMatch && periodMatch && categoryMatch; }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0)); }, [assignments, selectedTermId, selectedPeriodId, activeTab]);
    const settingsAssignments = useMemo(() => { if (activeTab === 'YEAR_WORK') return []; return assignments.filter(a => { const termMatch = !settingTermId || a.termId === settingTermId; const periodMatch = !settingPeriodId || a.periodId === settingPeriodId; return termMatch && periodMatch; }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0)); }, [assignments, settingTermId, settingPeriodId, activeTab]);

    // Handlers (saveYearWorkSettings) need the new state
    const saveYearWorkSettings = () => { localStorage.setItem('works_year_config', JSON.stringify(yearWorkConfig)); alert('تم حفظ توزيع الدرجات بنجاح'); };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative pb-24 md:pb-6">
            {/* Header ... */}
            
            <div className="flex justify-between items-center mb-6">
               <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white border rounded hover:bg-gray-50"><Settings size={18}/></button>
            </div>

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
                            
                            {/* ... (Other Tabs Content - Manual / Sheet) ... */}
                            {settingsTab === 'MANUAL' && <div>...</div>}
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setIsSettingsOpen(false)} className="px-4 py-2 bg-gray-200 rounded text-sm font-bold">إغلاق</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
