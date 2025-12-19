import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, bulkAddPerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Table, Plus, Trash2, Search, FileSpreadsheet, Settings, Calendar, DownloadCloud, X, Check, RefreshCw, Loader2, Zap, CloudLightning, PieChart, ListFilter, Tag, Printer, CheckCircle } from 'lucide-react';

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
    
    // --- App State ---
    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('works_active_tab') || 'HOMEWORK');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedPeriodId, setSelectedPeriodId] = useState(() => localStorage.getItem('works_period_id') || ''); 
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || '');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 

    const [isSaving, setIsSaving] = useState(false);
    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'DISTRIBUTION'>('MANUAL');

    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    
    const [googleSheetUrl, setGoogleSheetUrl] = useState(getWorksMasterUrl());
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheetName, setSelectedSheetName] = useState('');
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [workbookRef, setWorkbookRef] = useState<any>(null);
    const [isFetchingStructure, setIsFetchingStructure] = useState(false);
    
    const [yearWorkConfig, setYearWorkConfig] = useState(() => {
        const saved = localStorage.getItem('works_year_config');
        return saved ? JSON.parse(saved) : { hw: 10, act: 10, att: 5, exam: 20 };
    });

    const [newCol, setNewCol] = useState({ title: '', max: '10', category: 'HOMEWORK' });

    // --- Side Effects ---
    useEffect(() => {
        if (currentUser) {
            setTerms(getAcademicTerms(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
        }
    }, [currentUser, isSettingsOpen, isManager]);

    useEffect(() => {
        localStorage.setItem('works_active_tab', activeTab);
        localStorage.setItem('works_term_id', selectedTermId);
        localStorage.setItem('works_period_id', selectedPeriodId);
        localStorage.setItem('works_subject', selectedSubject);
        localStorage.setItem('works_class', selectedClass);
    }, [activeTab, selectedTermId, selectedPeriodId, selectedSubject, selectedClass]);

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

    const calculateYearWork = (student: Student) => {
        const studentPerf = performance.filter(p => p.studentId === student.id && p.subject === selectedSubject);
        const getCatAvg = (cat: string) => {
            const items = studentPerf.filter(p => p.category === cat);
            const total = items.reduce((a, b) => a + b.score, 0);
            const max = items.reduce((a, b) => a + b.maxScore, 0);
            return max > 0 ? (total / max) : 0;
        };

        const hwGrade = getCatAvg('HOMEWORK') * yearWorkConfig.hw;
        const actGrade = getCatAvg('ACTIVITY') * yearWorkConfig.act;
        const examGrade = getCatAvg('PLATFORM_EXAM') * yearWorkConfig.exam;
        
        const attRecords = attendance.filter(a => a.studentId === student.id);
        const attRate = attRecords.length > 0 ? (attRecords.filter(a => a.status === AttendanceStatus.PRESENT).length / attRecords.length) : 1;
        const attGrade = attRate * yearWorkConfig.att;

        return {
            hw: Math.round(hwGrade * 10) / 10,
            act: Math.round(actGrade * 10) / 10,
            att: Math.round(attGrade * 10) / 10,
            exam: Math.round(examGrade * 10) / 10,
            total: Math.round((hwGrade + actGrade + attGrade + examGrade) * 10) / 10
        };
    };

    // --- Actions ---
    const handleScoreChange = (studentId: string, assignId: string, val: string) => {
        setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [assignId]: val } }));
        // Auto-save logic could go here
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

    const handleQuickSync = async () => {
        if (!googleSheetUrl) return alert('الرجاء وضع رابط الملف في الإعدادات أولاً');
        setIsSheetSyncing(true);
        try {
            const { workbook } = await fetchWorkbookStructureUrl(googleSheetUrl);
            const linked = assignments.filter(a => a.sourceMetadata);
            if (linked.length === 0) throw new Error('لا توجد أعمدة مرتبطة. قم بربط الأعمدة من تبويب "Google Sheet" في الإعدادات.');
            
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
                alert(`تم تحديث درجات ${newRecords.length} طالب بنجاح!`);
            }
        } catch (e: any) { alert(e.message); } finally { setIsSheetSyncing(false); }
    };

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

    const importColumn = (header: string) => {
        const assign: Assignment = {
            id: Date.now().toString(),
            title: header,
            category: 'HOMEWORK',
            maxScore: 10,
            isVisible: true,
            teacherId: currentUser?.id,
            termId: selectedTermId,
            sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header })
        };
        saveAssignment(assign);
        alert('تم ربط العمود بنجاح!');
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative overflow-hidden">
            
            {/* Header / Selectors */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border">
                        <Calendar size={16} className="text-indigo-600"/>
                        <select className="bg-transparent text-sm font-bold outline-none min-w-[120px]" value={selectedTermId} onChange={e => { setSelectedTermId(e.target.value); setSelectedPeriodId(''); }}>
                            <option value="">الفصل الدراسي (الكل)</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {activePeriods.length > 0 && (
                        <div className="flex items-center gap-2 bg-purple-50 p-1.5 rounded-lg border border-purple-100">
                            <ListFilter size={16} className="text-purple-600"/>
                            <select className="bg-transparent text-sm font-bold text-purple-700 outline-none min-w-[120px]" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                                <option value="">الفترة (الكل)</option>
                                {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}

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
                        <button onClick={handleQuickSync} disabled={isSheetSyncing} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:bg-green-700 transition-all">
                            {isSheetSyncing ? <RefreshCw className="animate-spin" size={16}/> : <CloudLightning size={16}/>}
                            تحديث من الملف
                        </button>
                    )}
                    <button onClick={() => setIsSettingsOpen(true)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 border">
                        <Settings size={18}/>
                    </button>
                </div>
            </div>

            {/* Main Table Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="flex bg-gray-50 border-b p-1 overflow-x-auto no-scrollbar gap-1 print:hidden">
                    {['HOMEWORK', 'ACTIVITY', 'PLATFORM_EXAM', 'YEAR_WORK'].map(cat => (
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
                                {activeTab === 'YEAR_WORK' ? (
                                    <>
                                        <th className="p-2 border-l bg-blue-50/50 text-blue-700">واجبات ({yearWorkConfig.hw})</th>
                                        <th className="p-2 border-l bg-orange-50/50 text-orange-700">أنشطة ({yearWorkConfig.act})</th>
                                        <th className="p-2 border-l bg-green-50/50 text-green-700">حضور ({yearWorkConfig.att})</th>
                                        <th className="p-2 border-l bg-purple-50/50 text-purple-700">اختبارات ({yearWorkConfig.exam})</th>
                                        <th className="p-2 border-l bg-indigo-900 text-white">المجموع</th>
                                    </>
                                ) : (
                                    filteredAssignments.map(a => (
                                        <th key={a.id} className="p-3 border-l min-w-[100px] text-xs relative group">
                                            <div className="flex flex-col items-center">
                                                <span>{a.title}</span>
                                                <span className="text-[9px] text-gray-400 mt-1">({a.maxScore})</span>
                                                <button onClick={() => { if(confirm('حذف العمود؟')) { deleteAssignment(a.id); setAssignments(prev => prev.filter(x => x.id !== a.id)); } }} className="absolute -top-1 -left-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                                            </div>
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {students.filter(s => !selectedClass || s.className === selectedClass).map((student, idx) => {
                                if (activeTab === 'YEAR_WORK') {
                                    const stats = calculateYearWork(student);
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 border-b">
                                            <td className="p-3 border-l text-gray-400">{idx + 1}</td>
                                            <td className="p-3 text-right font-bold text-gray-800 sticky right-0 bg-white z-10 border-l">{student.name}</td>
                                            <td className="p-3 border-l font-bold text-blue-600">{stats.hw}</td>
                                            <td className="p-3 border-l font-bold text-orange-600">{stats.act}</td>
                                            <td className="p-3 border-l font-bold text-green-600">{stats.att}</td>
                                            <td className="p-3 border-l font-bold text-purple-600">{stats.exam}</td>
                                            <td className="p-3 border-l font-black text-indigo-900 bg-indigo-50">{stats.total}</td>
                                        </tr>
                                    );
                                }

                                return (
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
                                );
                            })}
                        </tbody>
                    </table>
                    {students.length === 0 && <div className="p-20 text-center text-gray-400">لا يوجد طلاب للعرض</div>}
                </div>
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in">
                        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-black text-gray-800 flex items-center gap-2"><Settings size={20}/> إعدادات سجل الرصد</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X/></button>
                        </div>
                        
                        <div className="flex bg-white border-b overflow-x-auto no-scrollbar">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`px-6 py-4 font-bold text-sm transition-all whitespace-nowrap ${settingsTab === 'MANUAL' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:bg-gray-50'}`}>إضافة يدوية</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`px-6 py-4 font-bold text-sm transition-all whitespace-nowrap ${settingsTab === 'SHEET' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500 hover:bg-gray-50'}`}>ربط Google Sheet</button>
                            <button onClick={() => setSettingsTab('DISTRIBUTION')} className={`px-6 py-4 font-bold text-sm transition-all whitespace-nowrap ${settingsTab === 'DISTRIBUTION' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50' : 'text-gray-500 hover:bg-gray-50'}`}>توزيع أعمال السنة</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
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
                                        <div className="w-full md:w-40">
                                            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase">التصنيف</label>
                                            <select className="w-full p-2.5 border rounded-xl bg-white" value={newCol.category} onChange={e => setNewCol({...newCol, category: e.target.value})}>
                                                {DEFAULT_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                            </select>
                                        </div>
                                        <button onClick={() => { if(!newCol.title) return; saveAssignment({...newCol, id: Date.now().toString(), maxScore: parseFloat(newCol.max), isVisible: true, teacherId: currentUser?.id, termId: selectedTermId, category: newCol.category as any}); setNewCol({title:'', max:'10', category:'HOMEWORK'}); }} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2"><Plus size={18}/> إضافة</button>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6">
                                    <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                                        <label className="block text-sm font-bold text-green-800 mb-2">رابط ملف Google Sheet</label>
                                        <div className="flex gap-2">
                                            <input className="flex-1 p-2.5 border border-green-300 rounded-xl dir-ltr text-left outline-none" value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                                            <button onClick={handleFetchSheet} disabled={isFetchingStructure} className="bg-green-600 text-white px-6 rounded-xl font-bold flex items-center gap-2 shadow-md">
                                                {isFetchingStructure ? <RefreshCw className="animate-spin" size={18}/> : <CloudLightning size={18}/>}
                                                جلب البيانات
                                            </button>
                                        </div>
                                    </div>

                                    {sheetNames.length > 0 && (
                                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                                            <div className="p-3 bg-gray-50 border-b flex gap-4">
                                                <select className="p-2 border rounded-lg text-sm bg-white font-bold" value={selectedSheetName} onChange={e => setSelectedSheetName(e.target.value)}>
                                                    {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                <div className="text-xs text-gray-500 font-bold self-center">اختر العمود الذي يحتوي على الدرجة لاستيراده:</div>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto divide-y">
                                                {availableHeaders.map(h => (
                                                    <div key={h} className="p-3 flex justify-between items-center hover:bg-green-50">
                                                        <span className="font-bold text-gray-700">{h}</span>
                                                        <button onClick={() => importColumn(h)} className="text-xs bg-green-600 text-white px-4 py-1.5 rounded-lg font-bold shadow-sm">ربط عمود</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {settingsTab === 'DISTRIBUTION' && (
                                <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border shadow-sm space-y-6">
                                    <h4 className="font-black text-gray-800 flex items-center gap-2 border-b pb-3"><PieChart className="text-orange-500"/> أوزان درجات أعمال السنة</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div><label className="block text-xs font-bold text-gray-400 mb-2">الواجبات</label><input type="number" className="w-full p-2.5 border rounded-xl text-center font-bold" value={yearWorkConfig.hw} onChange={e => setYearWorkConfig({...yearWorkConfig, hw: parseFloat(e.target.value)})}/></div>
                                        <div><label className="block text-xs font-bold text-gray-400 mb-2">الأنشطة</label><input type="number" className="w-full p-2.5 border rounded-xl text-center font-bold" value={yearWorkConfig.act} onChange={e => setYearWorkConfig({...yearWorkConfig, act: parseFloat(e.target.value)})}/></div>
                                        <div><label className="block text-xs font-bold text-gray-400 mb-2">الحضور</label><input type="number" className="w-full p-2.5 border rounded-xl text-center font-bold" value={yearWorkConfig.att} onChange={e => setYearWorkConfig({...yearWorkConfig, att: parseFloat(e.target.value)})}/></div>
                                        <div><label className="block text-xs font-bold text-gray-400 mb-2">الاختبارات</label><input type="number" className="w-full p-2.5 border rounded-xl text-center font-bold" value={yearWorkConfig.exam} onChange={e => setYearWorkConfig({...yearWorkConfig, exam: parseFloat(e.target.value)})}/></div>
                                    </div>
                                    <div className="pt-4 border-t flex justify-between items-center">
                                        <span className="text-lg font-black text-indigo-700">المجموع: {yearWorkConfig.hw + yearWorkConfig.act + yearWorkConfig.att + yearWorkConfig.exam}</span>
                                        <button onClick={() => { localStorage.setItem('works_year_config', JSON.stringify(yearWorkConfig)); alert('تم حفظ التوزيع!'); }} className="bg-orange-600 text-white px-8 py-2 rounded-xl font-bold shadow-lg">حفظ التوزيع</button>
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