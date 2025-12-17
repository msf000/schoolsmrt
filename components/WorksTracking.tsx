import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, AcademicTerm } from '../types';
import { getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, bulkAddPerformance, deletePerformance } from '../services/storageService';
import { extractGoogleSheetId, fetchGoogleSheetData, fetchGoogleSpreadsheetMeta } from '../services/excelService';
import { Save, Filter, Trash2, Search, FileSpreadsheet, Settings, Link as LinkIcon, RefreshCw, Loader2, Calculator, ArrowRight, Layers, LayoutPanelLeft, Edit2, Plus, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, currentUser }) => {
    const navigate = useNavigate();
    
    // --- UI State ---
    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('works_active_tab') || 'HOMEWORK');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedPeriodId, setSelectedPeriodId] = useState(() => localStorage.getItem('works_period_id') || ''); 
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 
    const [searchTerm, setSearchTerm] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'DISTRIBUTION'>('MANUAL');

    // --- Data State ---
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    const [yearWorkConfig, setYearWorkConfig] = useState(() => {
        const saved = localStorage.getItem('works_year_config');
        return saved ? JSON.parse(saved) : { hw: 10, act: 10, att: 5, exam: 20 };
    });

    // --- Smart Sync State ---
    const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(getWorksMasterUrl());
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    const [sheetMapping, setSheetMapping] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('works_sheet_mapping');
        return saved ? JSON.parse(saved) : {};
    });
    const [allSheetHeaders, setAllSheetHeaders] = useState<Record<string, string[]>>({});
    const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');

    // New Col Form
    const [newColTitle, setNewColTitle] = useState('');
    const [newColMax, setNewColMax] = useState('10');
    const [newColCategory, setNewColCategory] = useState<string>('HOMEWORK');
    const [newColUrl, setNewColUrl] = useState('');

    // Persistence
    useEffect(() => {
        localStorage.setItem('works_active_tab', activeTab);
        localStorage.setItem('works_term_id', selectedTermId);
        localStorage.setItem('works_period_id', selectedPeriodId);
        localStorage.setItem('works_class', selectedClass);
        localStorage.setItem('works_sheet_mapping', JSON.stringify(sheetMapping));
        localStorage.setItem('works_year_config', JSON.stringify(yearWorkConfig));
    }, [activeTab, selectedTermId, selectedPeriodId, selectedClass, sheetMapping, yearWorkConfig]);

    useEffect(() => {
        if (currentUser) {
            setTerms(getAcademicTerms(currentUser.id));
            refreshAssignments();
        }
    }, [currentUser, isSettingsOpen]);

    const refreshAssignments = () => {
        setAssignments(getAssignments('ALL', currentUser?.id, true));
    };

    // --- Memos ---
    const uniqueClasses = useMemo(() => { 
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        return Array.from(classes).sort(); 
    }, [students]);

    const filteredStudents = useMemo(() => {
        let filtered = students;
        if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass);
        if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm));
        return filtered.sort((a,b) => a.name.localeCompare(b.name, 'ar'));
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

    const activeTerm = terms.find(t => t.id === selectedTermId);
    const activePeriod = activeTerm?.periods?.find(p => p.id === selectedPeriodId);

    // --- Actions ---
    const handleScoreChange = (studentId: string, assignmentId: string, value: string) => {
        setScores(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [assignmentId]: value } }));
    };

    const saveManualChanges = async () => {
        if (Object.keys(scores).length === 0) return;
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
                            subject: 'عام',
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
        alert('تم حفظ التغييرات يدوياً');
    };

    // --- Google Sheets Logic ---
    const handleConnectSheet = async () => {
        if (!googleSheetUrl) return;
        setIsSheetSyncing(true);
        try {
            const sheetId = extractGoogleSheetId(googleSheetUrl);
            if (!sheetId) throw new Error("رابط غير صالح");
            const apiKey = process.env.API_KEY || '';
            const meta = await fetchGoogleSpreadsheetMeta(sheetId, apiKey);
            setAvailableSheets(meta.sheets);
            saveWorksMasterUrl(googleSheetUrl);
            setConnectionStatus('SUCCESS');

            // Pre-fetch headers for mapped sheets
            const headersMap: Record<string, string[]> = {};
            for (const cat of DEFAULT_CATEGORIES) {
                const mappedSheet = sheetMapping[cat.id];
                if (mappedSheet && meta.sheets.includes(mappedSheet)) {
                    const { headers } = await fetchGoogleSheetData(sheetId, apiKey, mappedSheet);
                    headersMap[cat.id] = headers;
                }
            }
            setAllSheetHeaders(headersMap);
        } catch (e: any) {
            setConnectionStatus('ERROR');
            alert(e.message || "فشل الاتصال.");
        } finally {
            setIsSheetSyncing(false);
        }
    };

    const handleSyncAllTabs = async () => {
        if (!googleSheetUrl) return alert("يرجى ربط ملف Google Sheet أولاً.");
        const sheetId = extractGoogleSheetId(googleSheetUrl);
        const apiKey = process.env.API_KEY || '';
        if (!sheetId) return;

        setIsSheetSyncing(true);
        let totalUpdated = 0;

        try {
            const identityCol = localStorage.getItem('works_sheet_identity_col') || 'اسم الطالب';
            
            for (const cat of DEFAULT_CATEGORIES) {
                const targetSheet = sheetMapping[cat.id];
                if (!targetSheet) continue;

                const { data } = await fetchGoogleSheetData(sheetId, apiKey, targetSheet);
                if (!data || data.length === 0) continue;

                const recordsToSync: PerformanceRecord[] = [];
                const categoryAssignments = assignments.filter(a => a.category === cat.id);

                data.forEach((row: any) => {
                    const studentIdentity = row[identityCol];
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
                                            subject: 'عام',
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
            alert("خطأ في المزامنة: " + e.message);
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

    const handleUpdateAssignment = (id: string, updates: Partial<Assignment>) => {
        const assignment = assignments.find(a => a.id === id);
        if (assignment) {
            const updated = { ...assignment, ...updates };
            saveAssignment(updated);
            refreshAssignments();
        }
    };

    const handleAddAssignment = () => {
        if (!newColTitle) return;
        const newAssign: Assignment = {
            id: Date.now().toString(),
            title: newColTitle,
            category: newColCategory,
            maxScore: Number(newColMax),
            url: newColUrl || undefined,
            isVisible: true,
            orderIndex: assignments.length,
            teacherId: currentUser?.id,
            termId: selectedTermId,
            periodId: selectedPeriodId || undefined
        };
        saveAssignment(newAssign);
        refreshAssignments();
        setNewColTitle('');
        setNewColUrl('');
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative pb-24 md:pb-6">
            
            {/* Header Toolbar */}
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
                    {googleSheetUrl && (
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
                        <button onClick={saveManualChanges} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 animate-bounce-in shadow-lg">
                            <Save size={16}/> حفظ التغييرات
                        </button>
                    )}
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white border rounded hover:bg-gray-50 text-gray-600 shadow-sm"><Settings size={18}/></button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border">
                    <Filter size={14} className="text-gray-400 mr-1"/>
                    <select className="bg-transparent text-sm font-bold text-gray-700 outline-none" value={selectedTermId} onChange={e => { setSelectedTermId(e.target.value); setSelectedPeriodId(''); }}>
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
                
                <select className="p-2 border rounded-lg text-sm font-bold bg-white outline-none" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                    <option value="">كل الفصول</option>
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute top-2.5 right-3 text-gray-400" size={16}/>
                    <input className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
            </div>

            {/* Main Table Content */}
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
                                            <th key={col.id} className="p-3 border-b text-center min-w-[100px] border-l border-gray-200">
                                                <div className="flex flex-col items-center">
                                                    <div className="flex items-center gap-1">
                                                        {col.url && <a href={col.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800"><LinkIcon size={12}/></a>}
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
                                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-3 text-center text-gray-400 text-xs font-mono">{idx + 1}</td>
                                            <td className="p-3 font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-sm cursor-pointer hover:text-indigo-600" onClick={() => navigate('/followup', { state: { studentId: student.id } })}>
                                                {student.name}
                                                <div className="text-[10px] text-gray-400 font-normal">{student.className}</div>
                                            </td>
                                            {filteredAssignments.map(col => (
                                                <td key={col.id} className="p-0 border-l border-gray-100">
                                                    <input 
                                                        className="w-full h-full p-3 text-center outline-none bg-transparent font-mono font-bold focus:bg-indigo-50"
                                                        value={scores[student.id]?.[col.id] ?? (performance.find(p => p.studentId === student.id && p.notes === col.id)?.score.toString() || '')}
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
                            <LayoutPanelLeft size={48} className="mb-4 opacity-20"/>
                            <p>لا توجد تقييمات في هذا التبويب لهذه الفترة.</p>
                            <button onClick={() => setIsSettingsOpen(true)} className="mt-2 text-indigo-600 font-bold hover:underline">أضف عمود جديد</button>
                        </div>
                    )}
                </div>
            ) : (
                // --- YEAR WORK VIEW ---
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col animate-fade-in">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-center text-sm border-collapse">
                            <thead className="bg-orange-50 text-orange-900 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 text-right bg-orange-50 sticky right-0 z-20">اسم الطالب</th>
                                    <th className="p-3 border-l border-orange-200">الواجبات ({yearWorkConfig.hw})</th>
                                    <th className="p-3 border-l border-orange-200">الأنشطة ({yearWorkConfig.act})</th>
                                    <th className="p-3 border-l border-orange-200">الاختبارات ({yearWorkConfig.exam})</th>
                                    <th className="p-3 border-l border-orange-200">الحضور ({yearWorkConfig.att})</th>
                                    <th className="p-3 border-l border-orange-200 bg-orange-100 text-orange-950 font-black">المجموع (100)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStudents.map(student => {
                                    const calcCategoryScore = (catId: string, weight: number) => {
                                        const catAssigns = assignments.filter(a => 
                                            a.category === catId && 
                                            (!selectedTermId || a.termId === selectedTermId) &&
                                            (!selectedPeriodId || a.periodId === selectedPeriodId)
                                        );
                                        let obtained = 0;
                                        let maxPossible = 0;
                                        catAssigns.forEach(assign => {
                                            const rec = performance.find(p => p.studentId === student.id && p.notes === assign.id);
                                            if (rec) { obtained += rec.score; maxPossible += rec.maxScore; }
                                            else { maxPossible += assign.maxScore; }
                                        });
                                        return maxPossible > 0 ? Math.round((obtained / maxPossible) * weight) : 0;
                                    };

                                    const hw = calcCategoryScore('HOMEWORK', yearWorkConfig.hw);
                                    const act = calcCategoryScore('ACTIVITY', yearWorkConfig.act);
                                    const exam = calcCategoryScore('PLATFORM_EXAM', yearWorkConfig.exam);
                                    
                                    // Attendance Calculation for Period
                                    const studentAtt = attendance.filter(a => 
                                        a.studentId === student.id && 
                                        (!activeTerm || (a.date >= activeTerm.startDate && a.date <= activeTerm.endDate)) &&
                                        (!activePeriod || (a.date >= activePeriod.startDate && a.date <= activePeriod.endDate))
                                    );
                                    const totalDays = studentAtt.length;
                                    const presentDays = studentAtt.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
                                    const attScore = totalDays > 0 ? Math.round((presentDays / totalDays) * yearWorkConfig.att) : yearWorkConfig.att;

                                    return (
                                        <tr key={student.id} className="hover:bg-orange-50/20 transition-colors">
                                            <td className="p-3 text-right font-bold text-gray-800 sticky right-0 bg-white border-l">{student.name}</td>
                                            <td className="p-3 border-l">{hw}</td>
                                            <td className="p-3 border-l">{act}</td>
                                            <td className="p-3 border-l">{exam}</td>
                                            <td className="p-3 border-l">{attScore}</td>
                                            <td className="p-3 border-l font-black text-lg text-orange-600 bg-orange-50/50">{hw + act + exam + attScore}</td>
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-bounce-in overflow-hidden">
                        <div className="flex border-b">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`flex-1 py-4 font-bold text-sm transition-all ${settingsTab === 'MANUAL' ? 'border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}>إدارة الأعمدة</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`flex-1 py-4 font-bold text-sm transition-all ${settingsTab === 'SHEET' ? 'border-b-2 border-green-600 text-green-700 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}>إعدادات الربط (Excel)</button>
                            <button onClick={() => setSettingsTab('DISTRIBUTION')} className={`flex-1 py-4 font-bold text-sm transition-all ${settingsTab === 'DISTRIBUTION' ? 'border-b-2 border-orange-600 text-orange-700 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}>أوزان الدرجات</button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2"><Plus size={16}/> إضافة عمود رصد جديد</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">العنوان</label>
                                                <input className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white" value={newColTitle} onChange={e => setNewColTitle(e.target.value)} placeholder="مثال: واجب 1"/>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">الدرجة العظمى</label>
                                                <input type="number" className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white text-center font-bold" value={newColMax} onChange={e => setNewColMax(e.target.value)}/>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">التصنيف</label>
                                                <select className="w-full p-2 border rounded-lg text-sm bg-gray-50" value={newColCategory} onChange={e => setNewColCategory(e.target.value)}>
                                                    {DEFAULT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="md:col-span-1">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase">رابط مرفق (اختياري)</label>
                                                <input className="w-full p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white dir-ltr" value={newColUrl} onChange={e => setNewColUrl(e.target.value)} placeholder="https://..."/>
                                            </div>
                                            <button onClick={handleAddAssignment} className="bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 h-[38px]">إضافة</button>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                        <div className="p-3 bg-gray-50 border-b font-bold text-xs text-gray-500">الأعمدة الحالية في "{CATEGORY_LABELS[activeTab]}" للفترة المحددة</div>
                                        <div className="divide-y max-h-[400px] overflow-y-auto custom-scrollbar">
                                            {filteredAssignments.map((a, idx) => {
                                                const meta = a.sourceMetadata ? JSON.parse(a.sourceMetadata) : {};
                                                const currentHeaders = allSheetHeaders[activeTab] || [];
                                                
                                                return (
                                                    <div key={a.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50 transition-colors">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-bold text-gray-300">#{idx+1}</span>
                                                                <input 
                                                                    className="font-bold text-sm text-gray-800 bg-transparent border-b border-transparent hover:border-indigo-300 focus:border-indigo-500 outline-none w-32 md:w-48"
                                                                    value={a.title}
                                                                    onChange={e => handleUpdateAssignment(a.id, { title: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] text-gray-400 font-bold uppercase">الدرجة:</span>
                                                                    <input 
                                                                        type="number"
                                                                        className="w-10 text-[10px] font-black text-indigo-600 bg-indigo-50 border rounded text-center"
                                                                        value={a.maxScore}
                                                                        onChange={e => handleUpdateAssignment(a.id, { maxScore: Number(e.target.value) })}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-1 flex-1">
                                                                    <LinkIcon size={10} className="text-gray-400"/>
                                                                    <input 
                                                                        className="text-[10px] text-blue-500 bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 outline-none w-full dir-ltr"
                                                                        value={a.url || ''}
                                                                        onChange={e => handleUpdateAssignment(a.id, { url: e.target.value })}
                                                                        placeholder="رابط التقييم..."
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                                            <div className="flex items-center gap-2 bg-indigo-50 p-1.5 rounded-lg border border-indigo-100 flex-1 md:flex-none">
                                                                <FileSpreadsheet size={14} className="text-indigo-400"/>
                                                                <select 
                                                                    className="bg-transparent text-[10px] font-bold text-indigo-800 outline-none w-full md:w-40"
                                                                    value={meta.sheetHeader || ''}
                                                                    onChange={e => handleMapColumn(a.id, e.target.value)}
                                                                >
                                                                    <option value="">(ربط عمود إكسل)</option>
                                                                    {currentHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                                </select>
                                                            </div>
                                                            <button onClick={() => { deleteAssignment(a.id); refreshAssignments(); }} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {filteredAssignments.length === 0 && <p className="p-8 text-center text-gray-400 text-sm italic">لا توجد أعمدة في هذا التبويب.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                                        <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2"><FileSpreadsheet size={20}/> الربط مع Google Sheets</h4>
                                        <div className="flex gap-2 mb-6">
                                            <input className="flex-1 p-3 border-2 border-green-100 rounded-xl text-sm dir-ltr bg-white focus:border-green-500 outline-none transition-all" placeholder="رابط الملف السحابي" value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} />
                                            <button onClick={handleConnectSheet} disabled={isSheetSyncing} className="bg-green-600 text-white px-8 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-green-700 disabled:opacity-50">
                                                {isSheetSyncing ? <Loader2 size={18} className="animate-spin"/> : <LinkIcon size={18}/>} 
                                                {isSheetSyncing ? 'اتصال...' : 'اتصال'}
                                            </button>
                                        </div>

                                        {connectionStatus === 'SUCCESS' && (
                                            <div className="space-y-6 animate-slide-up">
                                                <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm">
                                                    <h5 className="font-bold text-gray-700 mb-4 text-xs flex items-center gap-2 uppercase tracking-wide">1. تخصيص أوراق العمل (Tabs) لكل تصنيف</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        {DEFAULT_CATEGORIES.map(cat => (
                                                            <div key={cat.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-green-300 transition-all">
                                                                <label className="block text-[10px] font-bold text-gray-500 mb-2 uppercase">{cat.label}</label>
                                                                <select 
                                                                    className="w-full p-2 border rounded-lg text-xs bg-white font-bold text-gray-700"
                                                                    value={sheetMapping[cat.id] || ''}
                                                                    onChange={e => setSheetMapping(prev => ({ ...prev, [cat.id]: e.target.value }))}
                                                                >
                                                                    <option value="">-- اختر الورقة --</option>
                                                                    {availableSheets.map(s => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-white p-4 rounded-xl border border-indigo-100">
                                                    <div className="flex items-center gap-2 text-indigo-700 font-bold mb-2">
                                                        <ArrowRight size={16}/>
                                                        <span className="text-xs">تلميح:</span>
                                                    </div>
                                                    <p className="text-xs text-gray-600 leading-relaxed">
                                                        بعد اختيار الورقة المناسبة لكل تصنيف، انتقل لتبويب "إدارة الأعمدة" لربط كل عمود رصد بالعمود المقابل له في ملف الإكسل عبر القائمة المنسدلة.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'DISTRIBUTION' && (
                                <div className="max-w-md mx-auto py-10">
                                    <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-xl text-center space-y-6">
                                        <h4 className="font-black text-xl text-gray-800">توزيع درجات أعمال السنة (100)</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">الواجبات</label>
                                                <input type="number" className="w-full bg-transparent text-center font-black text-2xl text-orange-600 outline-none" value={yearWorkConfig.hw} onChange={e => setYearWorkConfig({...yearWorkConfig, hw: Number(e.target.value)})}/>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">الأنشطة</label>
                                                <input type="number" className="w-full bg-transparent text-center font-black text-2xl text-orange-600 outline-none" value={yearWorkConfig.act} onChange={e => setYearWorkConfig({...yearWorkConfig, act: Number(e.target.value)})}/>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">الحضور</label>
                                                <input type="number" className="w-full bg-transparent text-center font-black text-2xl text-orange-600 outline-none" value={yearWorkConfig.att} onChange={e => setYearWorkConfig({...yearWorkConfig, att: Number(e.target.value)})}/>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">الاختبارات</label>
                                                <input type="number" className="w-full bg-transparent text-center font-black text-2xl text-orange-600 outline-none" value={yearWorkConfig.exam} onChange={e => setYearWorkConfig({...yearWorkConfig, exam: Number(e.target.value)})}/>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-gray-100">
                                            <div className="text-sm font-bold text-gray-600 mb-6">المجموع الكلي: {yearWorkConfig.hw + yearWorkConfig.act + yearWorkConfig.att + yearWorkConfig.exam} / 100</div>
                                            <button onClick={() => { alert('تم الحفظ بنجاح'); setIsSettingsOpen(false); }} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold shadow-lg hover:bg-orange-700 transition-all hover:scale-[1.02]">تأكيد وحفظ الأوزان</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setIsSettingsOpen(false)} className="px-8 py-2.5 bg-gray-200 rounded-xl font-bold hover:bg-gray-300 transition-colors text-gray-700">إغلاق</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
