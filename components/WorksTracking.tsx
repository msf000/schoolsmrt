import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory, TermPeriod } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, bulkAddPerformance, getPerformance, getStudents, getTeacherAssignments } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Table, Plus, Trash2, Settings, Calendar, X, Check, RefreshCw, Loader2, Zap, CloudLightning, ListFilter, Tag, Printer, CheckCircle, PieChart, Sheet, ArrowUpDown, Link as LinkIcon, Edit3, Target, Layout, ExternalLink, Globe, Save, Layers, BarChart, TrendingUp, AlertCircle, Database } from 'lucide-react';
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
    { id: 'PLATFORM_EXAM', label: 'الاختبارات' }
];

const WorksTracking: React.FC<WorksTrackingProps> = ({ students: initialStudents, performance, attendance, onAddPerformance, currentUser }) => {
    const navigate = useNavigate();
    const isManager = currentUser?.role === 'SCHOOL_MANAGER';
    
    const students = useMemo(() => {
        return [...initialStudents].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [initialStudents]);

    // --- State ---
    const [categories, setCategories] = useState<{id: string, label: string}[]>(() => {
        const saved = localStorage.getItem('works_custom_categories');
        return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    });

    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('works_active_tab') || 'HOMEWORK');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedPeriodId, setSelectedPeriodId] = useState(() => localStorage.getItem('works_period_id') || ''); 
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || '');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 

    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'CATEGORIES' | 'WEIGHTS'>('MANUAL');
    const [settingsCategoryFilter, setSettingsCategoryFilter] = useState<string>('ALL');

    const [weights, setWeights] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('works_weights');
        return saved ? JSON.parse(saved) : { HOMEWORK: 10, ACTIVITY: 10, PLATFORM_EXAM: 20, ATTENDANCE: 5 };
    });

    const [googleSheetUrl, setGoogleSheetUrl] = useState(getWorksMasterUrl());
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheetName, setSelectedSheetName] = useState('');
    const [availableHeaders, setAvailableHeaders] = useState<string[]>([]);
    const [workbookRef, setWorkbookRef] = useState<any>(null);
    const [isFetchingStructure, setIsFetchingStructure] = useState(false);

    const [newCol, setNewCol] = useState({ title: '', max: '10', category: '', order: '0', url: '' });
    const [newCatLabel, setNewCatLabel] = useState('');

    // --- Sync Data ---
    useEffect(() => {
        if (currentUser) {
            setTerms(getAcademicTerms(currentUser.id));
            setAssignments(getTeacherAssignments(currentUser.id)); // Fix: fetch user-specific assignments
            setSubjects(getSubjects(currentUser.id));
            setWeeklyPlans(getWeeklyPlans(currentUser.id));
            setMyLessonPlans(getLessonPlans(currentUser.id));
            setPeriodTimings(getTeacherPeriodTimings(currentUser.id));
        }
    }, [currentUser, isSettingsOpen, isManager]);

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

    // --- Memoized Values ---
    const activeTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);
    const activePeriods = useMemo(() => activeTerm?.periods || [], [activeTerm]);

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const categoryMatch = activeTab === 'YEAR_WORK' ? true : a.category === activeTab;
            const termMatch = !selectedTermId || a.termId === selectedTermId;
            const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId;
            return categoryMatch && termMatch && periodMatch;
        }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [assignments, activeTab, selectedTermId, selectedPeriodId]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        initialStudents.forEach(s => s.className && classes.add(s.className));
        if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [initialStudents, currentUser]);

    // --- Handlers ---
    
    // المزامنة الفعلية من ملف قوقل شيت إلى السجل
    const syncFromSheet = async () => {
        if (!googleSheetUrl || !selectedSubject) return alert('يرجى التأكد من اختيار المادة وربط ملف قوقل شيت من الإعدادات');
        setIsSyncing(true);
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(googleSheetUrl);
            const syncedScores = { ...scores };
            
            // للأعمدة التي لها metadata (مربوطة بقوقل شيت)
            const linkedAssignments = filteredAssignments.filter(a => a.sourceMetadata);
            if (linkedAssignments.length === 0) {
                alert('لا توجد أعمدة مربوطة بقوقل شيت في هذا التبويب. اربط الأعمدة من الإعدادات أولاً.');
                setIsSyncing(false);
                return;
            }

            linkedAssignments.forEach(assign => {
                const meta = JSON.parse(assign.sourceMetadata!);
                const { headers, data } = getSheetHeadersAndData(workbook, meta.sheet);
                const nameHeader = headers.find(h => h.includes('الاسم') || h.includes('الطالب') || h.includes('Name'));
                
                if (nameHeader) {
                    data.forEach(row => {
                        const rowName = String(row[nameHeader]).trim();
                        const student = students.find(s => s.name.includes(rowName) || rowName.includes(s.name));
                        if (student && row[meta.header] !== undefined) {
                            if (!syncedScores[student.id]) syncedScores[student.id] = {};
                            syncedScores[student.id][assign.id] = String(row[meta.header]);
                        }
                    });
                }
            });

            setScores(syncedScores);
            alert('تمت مزامنة الدرجات من الملف بنجاح! لا تنسَ الضغط على "حفظ" لتثبيتها.');
        } catch (e) {
            alert('خطأ في المزامنة: تأكد من وصول الإنترنت وأن الملف متاح للعامة.');
        } finally {
            setIsSyncing(false);
        }
    };

    const saveAllScores = async () => {
        if (!selectedSubject) return alert('الرجاء اختيار المادة أولاً');
        setIsSaving(true);
        const records: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];
        
        Object.entries(scores).forEach(([studentId, studentScores]) => {
            Object.entries(studentScores).forEach(([assignId, val]) => {
                const assign = assignments.find(a => a.id === assignId);
                if (assign && val !== '') {
                    records.push({
                        id: `${studentId}_${assign.id}`,
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
            setTimeout(() => { setIsSaving(false); alert('تم حفظ الدرجات وتأمين السجل بنجاح!'); }, 500);
        } else {
            setIsSaving(false);
        }
    };

    const handleUpdateAssignment = (id: string, updates: Partial<Assignment>) => {
        const assign = assignments.find(a => a.id === id);
        if (assign) {
            const updated = { ...assign, ...updates };
            saveAssignment(updated);
            setAssignments(getAssignments('ALL', currentUser?.id, isManager));
        }
    };

    const calculateAchievement = useCallback((studentId: string) => {
        if (activeTab === 'YEAR_WORK') return 100;
        const targetAssigns = filteredAssignments;
        if (targetAssigns.length === 0) return 0;
        const studentScores = scores[studentId] || {};
        let completed = 0;
        targetAssigns.forEach(a => {
            if (studentScores[a.id] !== undefined && studentScores[a.id] !== '') completed++;
        });
        return Math.round((completed / targetAssigns.length) * 100);
    }, [scores, filteredAssignments, activeTab]);

    const calculateYearWork = useCallback((studentId: string) => {
        // فلترة الأداء بناءً على المادة والفترة المحددة حصراً
        const studentPerf = performance.filter(p => {
            const assign = assignments.find(a => a.id === p.notes || a.title === p.title);
            return p.studentId === studentId && 
                   p.subject === selectedSubject && 
                   (!selectedTermId || p.date >= (activeTerm?.startDate || '')) &&
                   (!selectedPeriodId || assign?.periodId === selectedPeriodId);
        });
        
        const getCategoryScore = (catId: string) => {
            const activeAssigns = assignments.filter(a => 
                a.category === catId && 
                (!selectedTermId || a.termId === selectedTermId) &&
                (!selectedPeriodId || a.periodId === selectedPeriodId)
            );
            if (activeAssigns.length === 0) return 0;
            const weight = weights[catId] || 0;
            
            const totalMax = activeAssigns.reduce((sum, a) => sum + a.maxScore, 0);
            const totalEarned = studentPerf.filter(p => {
                const assign = assignments.find(a => a.id === p.notes || a.title === p.title);
                return assign?.category === catId;
            }).reduce((sum, item) => sum + item.score, 0);
            
            return (totalEarned / (totalMax || 1)) * weight;
        };

        const results: Record<string, number> = {};
        let total = 0;
        categories.forEach(cat => {
            const score = getCategoryScore(cat.id);
            results[cat.id] = Math.round(score * 100) / 100;
            total += score;
        });

        const studentAtt = attendance.filter(a => a.studentId === studentId);
        const attRate = studentAtt.length > 0 ? (studentAtt.filter(a => a.status === 'PRESENT').length / studentAtt.length) : 1;
        const attScore = attRate * (weights.ATTENDANCE || 5);
        results['att'] = Math.round(attScore * 100) / 100;
        total += attScore;
        results['total'] = Math.round(total * 10) / 10;
        
        return results;
    }, [performance, selectedSubject, weights, attendance, assignments, categories, selectedTermId, selectedPeriodId, activeTerm]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in relative overflow-hidden font-tajawal">
            {/* Toolbar الفاخر */}
            <div className="bg-white p-5 rounded-[2rem] shadow-xl border border-gray-100 mb-6 flex flex-col md:flex-row justify-between gap-4 print:hidden relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="flex flex-wrap items-center gap-4 relative z-10">
                    <div className="flex items-center gap-2 bg-indigo-50/50 p-2.5 rounded-2xl border border-indigo-100">
                        <Calendar size={18} className="text-indigo-600"/>
                        <select className="bg-transparent text-xs font-black outline-none min-w-[150px] text-indigo-900" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                            <option value="">-- الفصل الدراسي --</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-purple-50 p-2.5 rounded-2xl border border-purple-100">
                        <ListFilter size={18} className="text-purple-600"/>
                        <select className="bg-transparent text-xs font-black text-purple-900 outline-none min-w-[150px]" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                            <option value="">-- كل الفترات --</option>
                            {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <select className="p-3 border-2 border-gray-50 rounded-2xl bg-gray-50 text-xs font-black outline-none shadow-sm min-w-[140px] focus:bg-white focus:border-indigo-500 transition-all" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="">-- المادة --</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <select className="p-3 border-2 border-gray-50 rounded-2xl bg-gray-50 text-xs font-black outline-none shadow-sm min-w-[140px] focus:bg-white focus:border-indigo-500 transition-all" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">-- كل الفصول --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex gap-2 relative z-10">
                    <button onClick={syncFromSheet} disabled={isSyncing} className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-emerald-700 active:scale-95 transition-all">
                        {isSyncing ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>} تحديث من الملف
                    </button>
                    <button onClick={saveAllScores} disabled={isSaving} className="flex-1 md:flex-none bg-indigo-900 text-white px-8 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-950 active:scale-95 transition-all">
                        {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} حفظ التعديلات
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white text-gray-400 border-2 border-gray-50 rounded-2xl hover:text-indigo-600 shadow-sm transition-all"><Settings size={22}/></button>
                </div>
            </div>

            {/* الجدول والتبويبات الملونة */}
            <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 flex-1 overflow-hidden flex flex-col relative">
                <div className="flex bg-gray-50/50 border-b p-2 overflow-x-auto no-scrollbar gap-2 print:hidden shadow-inner">
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`px-10 py-3.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === cat.id ? 'bg-white shadow-xl text-indigo-600 border border-indigo-100 scale-105' : 'text-gray-400 hover:bg-white/50'}`}>
                            {cat.label}
                        </button>
                    ))}
                    <div className="w-[2px] h-8 bg-gray-200 self-center mx-2"></div>
                    <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-10 py-3.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'YEAR_WORK' ? 'bg-gray-900 text-white shadow-2xl scale-105' : 'text-gray-400 hover:bg-gray-100'}`}>أعمال السنة النهائية</button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[1200px]">
                        <thead className="bg-[#F8FAFC]/80 backdrop-blur-md sticky top-0 z-30 border-b">
                            <tr className="text-[11px] text-slate-400 uppercase tracking-widest font-black h-16">
                                <th className="p-4 w-16 border-l border-gray-50">م</th>
                                <th className="p-4 text-right sticky right-0 bg-[#F8FAFC] z-40 w-80 border-l border-gray-50 shadow-sm">بيانات الطالب</th>
                                {activeTab === 'YEAR_WORK' ? (
                                    <>
                                        {categories.map(cat => <th key={cat.id} className="p-2 border-l border-gray-50 text-indigo-900">{cat.label} ({weights[cat.id] || 0})</th>)}
                                        <th className="p-2 border-l border-gray-50 text-emerald-700">المواظبة ({weights.ATTENDANCE})</th>
                                        <th className="p-2 border-l border-gray-50 bg-indigo-50 text-indigo-950 text-lg">المجموع</th>
                                    </>
                                ) : (
                                    filteredAssignments.map(a => (
                                        <th key={a.id} className="p-4 border-l border-gray-100 min-w-[150px] relative group">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-slate-800 font-black text-sm">{a.title}</span>
                                                    {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:scale-125 transition-transform"><ExternalLink size={12}/></a>}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-black">الدرجة: {a.maxScore}</span>
                                                    {a.sourceMetadata && <span className="text-[9px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded font-black flex items-center gap-1"><Database size={8}/> مربوط</span>}
                                                </div>
                                            </div>
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {students.filter(s => !selectedClass || s.className === selectedClass).map((student, idx) => {
                                if (activeTab === 'YEAR_WORK') {
                                    const res = calculateYearWork(student.id);
                                    return (
                                        <tr key={student.id} className="hover:bg-indigo-50/10 transition-colors h-14">
                                            <td className="p-3 border-l border-gray-50 text-xs text-slate-300 font-mono">{idx + 1}</td>
                                            <td className="p-3 text-right font-black text-slate-700 sticky right-0 bg-white z-10 border-l border-gray-50"><span className="truncate">{student.name}</span></td>
                                            {categories.map(cat => <td key={cat.id} className="p-3 border-l border-gray-50 font-bold text-slate-600">{(res as any)[cat.id] || 0}</td>)}
                                            <td className="p-3 border-l border-gray-50 font-bold text-emerald-600">{(res as any).att || 0}</td>
                                            <td className="p-3 border-l border-gray-50 font-black text-indigo-950 bg-indigo-50/40 text-lg">{(res as any).total || 0}</td>
                                        </tr>
                                    );
                                }
                                const achievement = calculateAchievement(student.id);
                                return (
                                    <tr key={student.id} className="hover:bg-indigo-50/10 transition-colors h-16">
                                        <td className="p-3 border-l border-gray-50 text-xs text-slate-300 font-mono">{idx + 1}</td>
                                        <td className="p-3 text-right font-black text-slate-700 sticky right-0 bg-white z-10 border-l border-gray-50 cursor-pointer hover:text-indigo-600 group" onClick={() => navigate('/followup', {state: {studentId: student.id}})}>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="truncate group-hover:pl-2 transition-all">{student.name}</span>
                                                <div className="flex flex-col items-center shrink-0">
                                                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden mb-1 border shadow-inner">
                                                        <div className={`h-full transition-all duration-1000 ${achievement >= 90 ? 'bg-emerald-500' : achievement >= 50 ? 'bg-indigo-500' : 'bg-red-400'}`} style={{width: `${achievement}%`}}></div>
                                                    </div>
                                                    <span className="text-[9px] font-black opacity-40">{achievement}% إنجاز</span>
                                                </div>
                                            </div>
                                        </td>
                                        {filteredAssignments.map(a => (
                                            <td key={a.id} className="p-0 border-l border-gray-50 h-full">
                                                <input 
                                                    className="w-full h-full text-center outline-none bg-transparent focus:bg-indigo-50/50 font-black text-sm text-indigo-900 transition-all border-none" 
                                                    value={scores[student.id]?.[a.id] || ''} 
                                                    onChange={e => setScores({...scores, [student.id]: {...scores[student.id], [a.id]: e.target.value}})} 
                                                    placeholder="-"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {(activeTab !== 'YEAR_WORK' && filteredAssignments.length === 0) && (
                        <div className="p-32 text-center text-gray-300 font-black italic flex flex-col items-center gap-4">
                            <AlertCircle size={64} className="opacity-10"/>
                            أضف أعمدة رصد من الإعدادات أو اربط ملف قوقل شيت للبدء
                        </div>
                    )}
                </div>
            </div>

            {/* SETTINGS MODAL */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in border border-white/20">
                        <div className="p-8 border-b bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3"><Settings size={28} className="text-indigo-600"/> إعدادات الرصد المتقدمة</h3>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-2">تخصيص المزامنة، التبويبات، والأوزان النسبية</p>
                            </div>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"><X size={28}/></button>
                        </div>
                        
                        <div className="flex bg-white border-b overflow-x-auto no-scrollbar shadow-inner px-2">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`px-10 py-6 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'MANUAL' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30' : 'text-gray-400 border-transparent'}`}>إدارة الأعمدة والترتيب</button>
                            <button onClick={() => setSettingsTab('CATEGORIES')} className={`px-10 py-6 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'CATEGORIES' ? 'text-purple-600 border-purple-600 bg-purple-50/30' : 'text-gray-400 border-transparent'}`}>تبويبات مخصصة</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`px-10 py-6 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'SHEET' ? 'text-emerald-600 border-emerald-600 bg-emerald-50/30' : 'text-gray-400 border-transparent'}`}>ربط قوقل شيت</button>
                            <button onClick={() => setSettingsTab('WEIGHTS')} className={`px-10 py-6 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'WEIGHTS' ? 'text-orange-600 border-orange-600 bg-orange-50/30' : 'text-gray-400 border-transparent'}`}>توزيع أعمال السنة</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 custom-scrollbar">
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm mb-4 w-fit">
                                        <span className="text-xs font-black text-slate-500">تصفية حسب التبويب:</span>
                                        <select className="bg-slate-100 p-2 rounded-xl text-xs font-black outline-none border border-slate-200" value={settingsCategoryFilter} onChange={e => setSettingsCategoryFilter(e.target.value)}>
                                            <option value="ALL">جميع التبويبات</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        </select>
                                    </div>

                                    <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row gap-6 items-end border-b-[12px] border-indigo-950 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={100}/></div>
                                        <div className="flex-1 w-full space-y-4 relative z-10">
                                            <label className="block text-[11px] font-black text-indigo-300 uppercase tracking-widest">إضافة عمود لتبويب: {categories.find(c=>c.id===(activeTab === 'YEAR_WORK' ? categories[0].id : activeTab))?.label}</label>
                                            <input className="w-full p-4 bg-white/10 border border-white/20 text-white rounded-2xl outline-none focus:bg-white/20 font-bold placeholder-white/40" placeholder="عنوان العمود (مثلاً: واجب 1)..." value={newCol.title} onChange={e => setNewCol({...newCol, title: e.target.value})}/>
                                            <input className="w-full p-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] outline-none dir-ltr placeholder-white/20" placeholder="رابط مشاركة خارجي (اختياري)..." value={newCol.url} onChange={e => setNewCol({...newCol, url: e.target.value})}/>
                                        </div>
                                        <div className="w-24 relative z-10"><label className="block text-[10px] font-black text-indigo-300 mb-2">الدرجة</label><input type="number" className="w-full p-4 bg-white/10 border border-white/20 text-white rounded-2xl text-center font-black" value={newCol.max} onChange={e => setNewCol({...newCol, max: e.target.value})}/></div>
                                        <div className="w-24 relative z-10"><label className="block text-[10px] font-black text-indigo-300 mb-2">الترتيب</label><input type="number" className="w-full p-4 bg-white/10 border border-white/20 text-white rounded-2xl text-center font-black" value={newCol.order} onChange={e => setNewCol({...newCol, order: e.target.value})}/></div>
                                        <button onClick={() => { 
                                            const cat = activeTab === 'YEAR_WORK' ? categories[0].id : activeTab;
                                            if(!newCol.title || !selectedTermId) return alert('أكمل البيانات الأساسية'); 
                                            saveAssignment({ id: Date.now().toString(), title: newCol.title, maxScore: parseFloat(newCol.max), isVisible: true, teacherId: currentUser?.id, termId: selectedTermId, periodId: selectedPeriodId, category: cat as any, sortOrder: parseInt(newCol.order), url: newCol.url }); 
                                            setAssignments(getAssignments('ALL', currentUser?.id, isManager));
                                            setNewCol({title:'', max:'10', category:'', order: (assignments.length + 1).toString(), url:''}); 
                                        }} className="bg-white text-indigo-900 px-12 py-4 rounded-2xl font-black shadow-2xl hover:bg-slate-100 transition-all active:scale-95 relative z-10">إضافة</button>
                                    </div>
                                    
                                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                                        <table className="w-full text-right text-sm">
                                            <thead className="bg-slate-100/50 text-slate-500 font-black text-[10px] uppercase border-b">
                                                <tr>
                                                    <th className="p-5 w-20 text-center">الترتيب</th>
                                                    <th className="p-5">اسم العمود</th>
                                                    <th className="p-5 w-28 text-center">الدرجة</th>
                                                    <th className="p-5">الرابط</th>
                                                    <th className="p-5 w-20 text-center">حذف</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {assignments.filter(a => (settingsCategoryFilter === 'ALL' || a.category === settingsCategoryFilter) && (!selectedTermId || a.termId === selectedTermId)).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)).map(a => (
                                                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 border-l border-slate-50"><input type="number" className="w-14 p-2 border border-slate-200 rounded-xl text-center font-black text-xs" value={a.sortOrder || 0} onChange={e => handleUpdateAssignment(a.id, { sortOrder: parseInt(e.target.value) })} /></td>
                                                        <td className="p-4"><input className="w-full p-2 border-none bg-transparent font-black text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-xl" value={a.title} onChange={e => handleUpdateAssignment(a.id, { title: e.target.value })} /></td>
                                                        <td className="p-4"><input type="number" className="w-20 p-2 border border-slate-200 rounded-xl text-center font-black text-xs text-indigo-600" value={a.maxScore} onChange={e => handleUpdateAssignment(a.id, { maxScore: parseFloat(e.target.value) })} /></td>
                                                        <td className="p-4"><input className="w-full p-2 border border-slate-200 rounded-xl text-[9px] dir-ltr text-right opacity-60 focus:opacity-100 font-mono" value={a.url || ''} onChange={e => handleUpdateAssignment(a.id, { url: e.target.value })} placeholder="https://..." /></td>
                                                        <td className="p-4 text-center"><button onClick={() => { if(confirm('حذف العمود؟')) { deleteAssignment(a.id); setAssignments(prev => prev.filter(x => x.id !== a.id)); } }} className="p-2.5 text-red-200 hover:text-red-500 transition-colors"><Trash2 size={20}/></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'CATEGORIES' && (
                                <div className="space-y-8 max-w-2xl mx-auto animate-fade-in">
                                    <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col gap-6">
                                        <h4 className="font-black text-xl text-slate-800 flex items-center gap-3"><Layers className="text-purple-600"/> إضافة تبويب رصد جديد</h4>
                                        <p className="text-xs text-slate-400 font-medium italic">التبويبات تساعدك على تنظيم درجاتك (مثل: مشاريع، بحوث، نشاط لا صفي).</p>
                                        <div className="flex gap-4 mt-2">
                                            <input className="flex-1 p-4 border border-slate-200 rounded-[1.5rem] font-black focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-indigo-900" placeholder="مثلاً: المشاريع الميدانية..." value={newCatLabel} onChange={e=>setNewCatLabel(e.target.value)}/>
                                            <button onClick={() => {
                                                if (!newCatLabel.trim()) return;
                                                const id = 'CAT_' + Date.now();
                                                const newCats = [...categories, { id, label: newCatLabel.trim() }];
                                                setCategories(newCats);
                                                localStorage.setItem('works_custom_categories', JSON.stringify(newCats));
                                                setNewCatLabel('');
                                            }} className="bg-purple-600 text-white px-12 rounded-[1.5rem] font-black shadow-xl hover:bg-purple-700 transition-all">إضافة</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {categories.map(cat => (
                                            <div key={cat.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex justify-between items-center group shadow-sm hover:border-purple-200 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                                    <span className="font-black text-slate-700">{cat.label}</span>
                                                </div>
                                                {!DEFAULT_CATEGORIES.some(c=>c.id===cat.id) && <button onClick={()=>{
                                                    if (confirm('حذف التبويب؟ سيتم إخفاء الأعمدة التابعة له.')) {
                                                        const newCats = categories.filter(c => c.id !== cat.id);
                                                        setCategories(newCats);
                                                        localStorage.setItem('works_custom_categories', JSON.stringify(newCats));
                                                    }
                                                }} className="text-red-200 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'WEIGHTS' && (
                                <div className="max-w-xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl animate-fade-in relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-10 opacity-5"><PieChart className="text-orange-500" size={180}/></div>
                                    <h4 className="font-black text-2xl text-slate-800 flex items-center gap-3 mb-8 border-b border-slate-100 pb-6"><TrendingUp className="text-orange-500"/> أوزان أعمال السنة</h4>
                                    <p className="text-xs text-slate-400 mb-8 font-bold leading-relaxed">حدد الوزن النسبي لكل قسم ليقوم النظام بحساب المجموع تلقائياً للفترة المختارة.</p>
                                    <div className="grid grid-cols-1 gap-8 relative z-10">
                                        {categories.map(cat => (
                                            <div key={cat.id} className="space-y-3">
                                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">{cat.label}</label>
                                                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner">
                                                    <input type="number" className="w-full bg-transparent p-1 font-black text-center text-xl outline-none text-slate-800" value={weights[cat.id] || 0} onChange={e=>setWeights({...weights, [cat.id]: parseInt(e.target.value)})}/>
                                                    <span className="text-[11px] text-slate-400 font-bold ml-4 whitespace-nowrap">درجة</span>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-black text-emerald-600 uppercase tracking-widest block">الحضور والمواظبة</label>
                                            <div className="flex items-center gap-4 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 shadow-inner">
                                                <input type="number" className="w-full bg-transparent p-1 font-black text-center text-xl outline-none text-emerald-800" value={weights.ATTENDANCE || 0} onChange={e=>setWeights({...weights, ATTENDANCE: parseInt(e.target.value)})}/>
                                                <span className="text-[11px] text-emerald-600 font-bold ml-4 whitespace-nowrap">درجة</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                                        {/* Fix: Explicitly cast Object.values(weights) to number[] to resolve TypeScript error on line 532 */}
                                        <div className="text-sm font-bold text-slate-500">المجموع النهائي: <span className="text-orange-600 font-black text-2xl ml-2">{(Object.values(weights) as number[]).reduce((a, b) => a + b, 0)}</span></div>
                                        <button onClick={()=>{localStorage.setItem('works_weights', JSON.stringify(weights)); alert('تم حفظ توزيع الأوزان بنجاح!');}} className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-black shadow-2xl hover:bg-orange-700 transition-all flex items-center gap-3"><Check size={20}/> اعتماد التوزيع</button>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'SHEET' && (
                                <div className="space-y-8 max-w-3xl mx-auto animate-fade-in">
                                    <div className="bg-emerald-50 p-10 rounded-[3rem] border border-emerald-100 shadow-inner">
                                        <label className="block text-sm font-black text-emerald-800 mb-4 flex items-center gap-3"><Globe size={22}/> رابط ملف Google Sheets الموحد (Master)</label>
                                        <div className="flex gap-4">
                                            <input className="flex-1 p-4 border border-emerald-200 rounded-2xl dir-ltr text-xs font-mono outline-none focus:ring-4 focus:ring-emerald-500/10 text-emerald-950 bg-white" value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                                            <button onClick={async () => {
                                                if (!googleSheetUrl) return alert('أدخل رابط الملف أولاً');
                                                setIsFetchingStructure(true);
                                                try {
                                                    saveWorksMasterUrl(googleSheetUrl);
                                                    const { workbook, sheetNames } = await fetchWorkbookStructureUrl(googleSheetUrl);
                                                    setWorkbookRef(workbook);
                                                    setSheetNames(sheetNames);
                                                    if (sheetNames.length > 0) setSelectedSheetName(sheetNames[0]);
                                                } catch (e) { alert('خطأ في جلب بيانات الملف.'); } finally { setIsFetchingStructure(false); }
                                            }} disabled={isFetchingStructure} className="bg-emerald-600 text-white px-12 rounded-2xl font-black shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                                                {isFetchingStructure ? <Loader2 className="animate-spin" size={22}/> : <><RefreshCw size={22}/> جلب أوراق العمل</>}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {sheetNames.length > 0 && (
                                        <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl animate-slide-up">
                                            <div className="p-6 bg-slate-50 border-b flex gap-6 items-center">
                                                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm"><Sheet size={22} className="text-emerald-600"/></div>
                                                <div className="flex-1">
                                                    <span className="text-xs font-black text-slate-500 block mb-1">اختر ورقة العمل:</span>
                                                    <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white font-black outline-none focus:ring-2 focus:ring-emerald-500" value={selectedSheetName} onChange={e => {
                                                        setSelectedSheetName(e.target.value);
                                                        if (workbookRef) {
                                                            const { headers } = getSheetHeadersAndData(workbookRef, e.target.value);
                                                            setAvailableHeaders(headers);
                                                        }
                                                    }}>
                                                        {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="max-h-[400px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-100 p-px">
                                                {availableHeaders.map(h => (
                                                    <div key={h} className="p-6 flex justify-between items-center bg-white group hover:bg-emerald-50 transition-colors">
                                                        <div className="flex-1 overflow-hidden mr-4">
                                                            <span className="font-black text-slate-800 text-sm truncate block">{h}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold">عمود بيانات مكتشف</span>
                                                        </div>
                                                        <button onClick={() => {
                                                            if(!selectedTermId) return alert('اختر الفصل الدراسي أولاً');
                                                            saveAssignment({ 
                                                                id: `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, 
                                                                title: h, 
                                                                category: activeTab as any, 
                                                                maxScore: 10, 
                                                                isVisible: true, 
                                                                teacherId: currentUser?.id, 
                                                                termId: selectedTermId, 
                                                                periodId: selectedPeriodId, 
                                                                sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header: h }), 
                                                                sortOrder: filteredAssignments.length + 1 
                                                            });
                                                            setAssignments(getAssignments('ALL', currentUser?.id, isManager)); 
                                                            alert(`تم ربط عمود "${h}" بنجاح!`);
                                                        }} className="text-[10px] bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2">
                                                            <Target size={14}/> ربط بالتبويب الحالي
                                                        </button>
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