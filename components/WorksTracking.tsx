import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory, TermPeriod } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, bulkAddPerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Table, Plus, Trash2, Settings, Calendar, X, Check, RefreshCw, Loader2, Zap, CloudLightning, ListFilter, Tag, Printer, CheckCircle } from 'lucide-react';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const CATEGORY_LABELS: Record<string, string> = {
    'HOMEWORK': 'الواجبات',
    'ACTIVITY': 'الأنشطة',
    'PLATFORM_EXAM': 'الاختبارات',
    'YEAR_WORK': 'أعمال السنة',
    'OTHER': 'عام'
};

const DEFAULT_CATEGORIES = [
    { id: 'HOMEWORK', label: 'الواجبات' },
    { id: 'ACTIVITY', label: 'الأنشطة' },
    { id: 'PLATFORM_EXAM', label: 'الاختبارات' },
];

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance, currentUser }) => {
    const isManager = currentUser?.role === 'SCHOOL_MANAGER';
    
    // --- State: Filters ---
    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('works_active_tab') || 'HOMEWORK');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedPeriodId, setSelectedPeriodId] = useState(() => localStorage.getItem('works_period_id') || ''); 
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || '');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 

    // --- State: Data ---
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    
    // --- State: UI ---
    const [isSaving, setIsSaving] = useState(false);
    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET'>('MANUAL');
    
    // --- State: Sheet Import ---
    const [googleSheetUrl, setGoogleSheetUrl] = useState(getWorksMasterUrl());
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheetName, setSelectedSheetName] = useState('');
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [workbookRef, setWorkbookRef] = useState<any>(null);
    const [isFetchingStructure, setIsFetchingStructure] = useState(false);

    // --- State: New Column Form ---
    const [newCol, setNewCol] = useState({ title: '', max: '10', category: 'HOMEWORK', termId: '', periodId: '' });

    // --- Load Initial Data ---
    useEffect(() => {
        if (currentUser) {
            const loadedTerms = getAcademicTerms(currentUser.id);
            setTerms(loadedTerms);
            setSubjects(getSubjects(currentUser.id));
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
            
            // Auto select current term if not set
            if (!selectedTermId) {
                const current = loadedTerms.find(t => t.isCurrent);
                if (current) setSelectedTermId(current.id);
            }
        }
    }, [currentUser, isSettingsOpen, isManager]);

    // --- Persistence ---
    useEffect(() => {
        localStorage.setItem('works_active_tab', activeTab);
        localStorage.setItem('works_term_id', selectedTermId);
        localStorage.setItem('works_period_id', selectedPeriodId);
        localStorage.setItem('works_subject', selectedSubject);
        localStorage.setItem('works_class', selectedClass);
    }, [activeTab, selectedTermId, selectedPeriodId, selectedSubject, selectedClass]);

    // --- Map Scores to Grid ---
    useEffect(() => {
        const newScores: Record<string, Record<string, string>> = {};
        students.forEach(s => {
            newScores[s.id] = {};
            const studentPerf = performance.filter(p => p.studentId === s.id && p.subject === selectedSubject);
            studentPerf.forEach(p => {
                const assign = assignments.find(a => a.id === p.notes || a.title === p.title);
                if (assign) newScores[s.id][assign.id] = p.score.toString();
            });
        });
        setScores(newScores);
    }, [students, performance, selectedSubject, assignments]);

    // --- Helpers ---
    const activeTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);
    const activePeriods = useMemo(() => activeTerm?.periods || [], [activeTerm]);

    const filteredAssignments = useMemo(() => {
        if (activeTab === 'YEAR_WORK') return [];
        return assignments.filter(a => {
            const categoryMatch = a.category === activeTab;
            const termMatch = !selectedTermId || a.termId === selectedTermId;
            const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId;
            return categoryMatch && termMatch && periodMatch;
        });
    }, [assignments, activeTab, selectedTermId, selectedPeriodId]);

    // --- Actions ---
    const handleScoreChange = (studentId: string, assignId: string, val: string) => {
        setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [assignId]: val } }));
    };

    const saveAllScores = async () => {
        if (!selectedSubject) return alert('الرجاء اختيار المادة');
        setIsSaving(true);
        const records: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];

        Object.keys(scores).forEach(studentId => {
            Object.keys(scores[studentId]).forEach(assignId => {
                const assign = assignments.find(a => a.id === assignId);
                const val = scores[studentId][assignId];
                if (assign && val !== '') {
                    records.push({
                        id: `${studentId}_${assignId}`,
                        studentId,
                        subject: selectedSubject,
                        title: assign.title,
                        category: assign.category,
                        score: parseFloat(val),
                        maxScore: assign.maxScore,
                        date: today,
                        notes: assign.id,
                        createdById: currentUser?.id
                    });
                }
            });
        });

        if (records.length > 0) {
            onAddPerformance(records);
            setTimeout(() => setIsSaving(false), 500);
        } else {
            setIsSaving(false);
        }
    };

    // --- Google Sheets Logic ---
    const handleFetchSheet = async () => {
        if (!googleSheetUrl) return;
        setIsFetchingStructure(true);
        try {
            saveWorksMasterUrl(googleSheetUrl);
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(googleSheetUrl);
            setWorkbookRef(workbook);
            setSheetNames(sheetNames);
            if (sheetNames.length > 0) setSelectedSheetName(sheetNames[0]);
        } catch (e: any) { alert(e.message); } finally { setIsFetchingStructure(false); }
    };

    useEffect(() => {
        if (workbookRef && selectedSheetName) {
            const { headers } = getSheetHeadersAndData(workbookRef, selectedSheetName);
            setAvailableHeaders(headers);
        }
    }, [selectedSheetName, workbookRef]);

    const importColumnFromSheet = (header: string) => {
        if (!selectedTermId || !selectedPeriodId) return alert('الرجاء اختيار الفصل الدراسي والفترة من الأعلى أولاً ليتم ربط العمود بهما.');
        
        const assign: Assignment = {
            id: Date.now().toString(),
            title: header,
            category: (activeTab === 'YEAR_WORK' ? 'HOMEWORK' : activeTab) as PerformanceCategory,
            maxScore: 10,
            isVisible: true,
            teacherId: currentUser?.id,
            termId: selectedTermId,
            periodId: selectedPeriodId,
            sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header })
        };
        saveAssignment(assign);
        setAssignments(getAssignments('ALL', currentUser?.id, isManager));
        alert(`تم ربط العمود "${header}" بالفترة المحددة بنجاح!`);
    };

    const handleQuickSync = async () => {
        if (!googleSheetUrl) return alert('الرجاء وضع رابط الملف في الإعدادات أولاً');
        setIsSheetSyncing(true);
        try {
            const { workbook } = await fetchWorkbookStructureUrl(googleSheetUrl);
            // نحدث فقط الأعمدة الظاهرة حالياً (التابعة للفترة المختارة)
            const linked = filteredAssignments.filter(a => a.sourceMetadata);
            if (linked.length === 0) throw new Error('لا توجد أعمدة مرتبطة في هذه الفترة. قم بربط الأعمدة من الإعدادات.');
            
            const newRecords: PerformanceRecord[] = [];
            for (const assign of linked) {
                const meta = JSON.parse(assign.sourceMetadata!);
                const { data } = getSheetHeadersAndData(workbook, meta.sheet);
                data.forEach((row: any) => {
                    const name = row['الاسم'] || row['اسم الطالب'] || row['Name'];
                    const student = students.find(s => s.name === name || s.name.includes(name));
                    const score = parseFloat(row[meta.header]);
                    if (student && !isNaN(score)) {
                        newRecords.push({
                            id: `${student.id}_${assign.id}`,
                            studentId: student.id,
                            subject: selectedSubject,
                            title: assign.title,
                            category: assign.category,
                            score: score,
                            maxScore: assign.maxScore,
                            date: new Date().toISOString().split('T')[0],
                            notes: assign.id,
                            createdById: currentUser?.id
                        });
                    }
                });
            }
            if (newRecords.length > 0) {
                onAddPerformance(newRecords);
                alert(`تم تحديث درجات ${newRecords.length} سجل بنجاح!`);
            }
        } catch (e: any) { alert(e.message); } finally { setIsSheetSyncing(false); }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative overflow-hidden">
            
            {/* --- TOP SELECTORS: Periods & Terms --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Term Selector */}
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border">
                        <Calendar size={16} className="text-indigo-600"/>
                        <select className="bg-transparent text-sm font-bold outline-none min-w-[120px]" value={selectedTermId} onChange={e => { setSelectedTermId(e.target.value); setSelectedPeriodId(''); }}>
                            <option value="">الفصل الدراسي (الكل)</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {/* Period Selector - IMPORTANT FOR LINKING */}
                    <div className="flex items-center gap-2 bg-purple-50 p-1.5 rounded-lg border border-purple-100">
                        <ListFilter size={16} className="text-purple-600"/>
                        <select className="bg-transparent text-sm font-bold text-purple-700 outline-none min-w-[120px]" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                            <option value="">-- اختر الفترة --</option>
                            {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold outline-none" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="">-- المادة --</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>

                    <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold outline-none" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">-- الفصل --</option>
                        {Array.from(new Set(students.map(s => s.className).filter(Boolean))).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="flex gap-2">
                    <button onClick={saveAllScores} disabled={isSaving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:bg-indigo-700 transition-all">
                        {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <CheckCircle size={16}/>}
                        حفظ الدرجات
                    </button>
                    {googleSheetUrl && (
                        <button onClick={handleQuickSync} disabled={isSheetSyncing} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:bg-green-700 transition-all" title="تحديث الدرجات من قوقل شيت للفترة الحالية">
                            {isSheetSyncing ? <RefreshCw className="animate-spin" size={16}/> : <Zap size={16}/>}
                            مزامنة الفترة
                        </button>
                    )}
                    <button onClick={() => setIsSettingsOpen(true)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 border">
                        <Settings size={18}/>
                    </button>
                </div>
            </div>

            {/* --- MAIN GRID --- */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="flex bg-gray-50 border-b p-1 overflow-x-auto no-scrollbar gap-1 print:hidden">
                    {['HOMEWORK', 'ACTIVITY', 'PLATFORM_EXAM'].map(cat => (
                        <button key={cat} onClick={() => setActiveTab(cat)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === cat ? 'bg-white shadow text-indigo-600 border border-indigo-100' : 'text-gray-500 hover:bg-gray-100'}`}>
                            {CATEGORY_LABELS[cat] || cat}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[800px]">
                        <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="p-4 w-12 border-l">#</th>
                                <th className="p-4 text-right sticky right-0 bg-gray-50 z-20 w-64 border-l">اسم الطالب</th>
                                {filteredAssignments.length > 0 ? filteredAssignments.map(a => (
                                    <th key={a.id} className="p-3 border-l min-w-[100px] text-xs relative group">
                                        <div className="flex flex-col items-center">
                                            <span>{a.title}</span>
                                            <span className="text-[9px] text-gray-400 mt-1">({a.maxScore})</span>
                                            <button onClick={() => { if(confirm('حذف العمود؟')) { deleteAssignment(a.id); setAssignments(prev => prev.filter(x => x.id !== a.id)); } }} className="absolute -top-1 -left-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                        </div>
                                    </th>
                                )) : (
                                    <th className="p-4 text-gray-400 italic font-normal">لا توجد أعمدة مضافة لهذه الفترة</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {students.filter(s => !selectedClass || s.className === selectedClass).map((student, idx) => (
                                <tr key={student.id} className="hover:bg-gray-50 border-b">
                                    <td className="p-3 border-l text-gray-400">{idx + 1}</td>
                                    <td className="p-3 text-right font-bold text-gray-800 sticky right-0 bg-white z-10 border-l">{student.name}</td>
                                    {filteredAssignments.map(a => (
                                        <td key={a.id} className="p-0 border-l h-12">
                                            <input 
                                                className="w-full h-full text-center outline-none bg-transparent focus:bg-indigo-50 font-bold"
                                                value={scores[student.id]?.[a.id] || ''}
                                                onChange={e => handleScoreChange(student.id, a.id, e.target.value)}
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

            {/* --- SETTINGS MODAL --- */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in">
                        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-black text-gray-800 flex items-center gap-2"><Settings size={20}/> إعدادات الأعمدة والربط</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X/></button>
                        </div>
                        
                        <div className="flex bg-white border-b overflow-x-auto no-scrollbar">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`px-6 py-4 font-bold text-sm transition-all whitespace-nowrap ${settingsTab === 'MANUAL' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}>إضافة يدوية</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`px-6 py-4 font-bold text-sm transition-all whitespace-nowrap ${settingsTab === 'SHEET' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}>ربط Google Sheet</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {/* Manual Entry */}
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6">
                                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">اسم العمود</label>
                                            <input className="w-full p-2.5 border rounded-xl" placeholder="مثلاً: واجب 1" value={newCol.title} onChange={e => setNewCol({...newCol, title: e.target.value})}/>
                                        </div>
                                        <div className="w-full md:w-24">
                                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">الدرجة</label>
                                            <input type="number" className="w-full p-2.5 border rounded-xl text-center" value={newCol.max} onChange={e => setNewCol({...newCol, max: e.target.value})}/>
                                        </div>
                                        <button 
                                            onClick={() => { 
                                                if(!newCol.title || !selectedTermId || !selectedPeriodId) return alert('أكمل البيانات واختر الفترة'); 
                                                saveAssignment({
                                                    id: Date.now().toString(), 
                                                    title: newCol.title,
                                                    maxScore: parseFloat(newCol.max), 
                                                    isVisible: true, 
                                                    teacherId: currentUser?.id, 
                                                    termId: selectedTermId, 
                                                    periodId: selectedPeriodId,
                                                    category: activeTab as any
                                                }); 
                                                setAssignments(getAssignments('ALL', currentUser?.id, isManager));
                                                setNewCol({...newCol, title:''}); 
                                            }} 
                                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18}/> إضافة للفترة الحالية
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-400 text-center">سيتم ربط العمود تلقائياً بـ: {activeTerm?.name} - {activePeriods.find(p=>p.id===selectedPeriodId)?.name || 'لم تختر فترة'}</p>
                                </div>
                            )}

                            {/* Google Sheet Import */}
                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6">
                                    <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                                        <label className="block text-sm font-bold text-green-800 mb-2">رابط ملف Google Sheet</label>
                                        <div className="flex gap-2">
                                            <input className="flex-1 p-2.5 border border-green-300 rounded-xl dir-ltr text-left outline-none" value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                                            <button onClick={handleFetchSheet} disabled={isFetchingStructure} className="bg-green-600 text-white px-6 rounded-xl font-bold flex items-center gap-2 shadow-md">
                                                {isFetchingStructure ? <Loader2 className="animate-spin" size={18}/> : <CloudLightning size={18}/>}
                                                جلب الرؤوس
                                            </button>
                                        </div>
                                    </div>

                                    {sheetNames.length > 0 && (
                                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                            <div className="p-3 bg-gray-50 border-b flex gap-4">
                                                <select className="p-2 border rounded-lg text-sm bg-white font-bold" value={selectedSheetName} onChange={e => setSelectedSheetName(e.target.value)}>
                                                    {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                <div className="text-xs text-gray-500 font-bold self-center">اختر العمود لاستيراده وربطه بـ {activePeriods.find(p=>p.id===selectedPeriodId)?.name || 'الفترة المختارة'}:</div>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto divide-y">
                                                {availableHeaders.map(h => (
                                                    <div key={h} className="p-3 flex justify-between items-center hover:bg-green-50">
                                                        <span className="font-bold text-gray-700">{h}</span>
                                                        <button onClick={() => importColumnFromSheet(h)} className="text-xs bg-green-600 text-white px-4 py-1.5 rounded-lg font-bold shadow-sm">ربط بهذا العمود</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
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