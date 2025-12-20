import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory, TermPeriod } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, bulkAddPerformance, getPerformance, getStudents, getTeacherAssignments } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Table, Plus, Trash2, Settings, Calendar, X, Check, RefreshCw, Loader2, Zap, CloudLightning, ListFilter, Tag, Printer, CheckCircle, PieChart, Sheet, ArrowUpDown, Link as LinkIcon, Edit3, Target, Layout, ExternalLink, Globe, Save, Layers, BarChart, TrendingUp } from 'lucide-react';
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

    // --- حالات الواجهة (States) ---
    const [categories, setCategories] = useState<{id: string, label: string}[]>(() => {
        const saved = localStorage.getItem('works_custom_categories');
        return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    });

    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('works_active_tab') || 'HOMEWORK');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedPeriodId, setSelectedPeriodId] = useState(() => localStorage.getItem('works_period_id') || ''); 
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || '');

    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    
    const [isSaving, setIsSaving] = useState(false);
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

    // --- مزامنة البيانات ---
    useEffect(() => {
        if (currentUser) {
            const loadedTerms = getAcademicTerms(currentUser.id);
            setTerms(loadedTerms);
            setSubjects(getSubjects(currentUser.id));
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
            
            if (!selectedTermId && loadedTerms.length > 0) {
                const current = loadedTerms.find(t => t.isCurrent) || loadedTerms[0];
                setSelectedTermId(current.id);
            }
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

    // --- قيم محسوبة (Memos) ---
    const activeTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);
    const activePeriods = useMemo(() => activeTerm?.periods || [], [activeTerm]);

    // الأعمدة المعروضة في السجل الحالي
    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const categoryMatch = activeTab === 'YEAR_WORK' ? true : a.category === activeTab;
            const termMatch = !selectedTermId || a.termId === selectedTermId;
            const periodMatch = !selectedPeriodId || a.periodId === selectedPeriodId;
            return categoryMatch && termMatch && periodMatch;
        }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [assignments, activeTab, selectedTermId, selectedPeriodId]);

    // الأعمدة في نافذة الإعدادات مع الفلتر
    const settingsFilteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const catMatch = settingsCategoryFilter === 'ALL' || a.category === settingsCategoryFilter;
            const termMatch = !selectedTermId || a.termId === selectedTermId;
            return catMatch && termMatch;
        }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [assignments, settingsCategoryFilter, selectedTermId]);

    // حساب نسبة الإنجاز
    const calculateAchievement = useCallback((studentId: string) => {
        const targetAssigns = filteredAssignments;
        if (targetAssigns.length === 0) return 0;
        const studentScores = scores[studentId] || {};
        let completed = 0;
        targetAssigns.forEach(a => {
            if (studentScores[a.id] !== undefined && studentScores[a.id] !== '') completed++;
        });
        return Math.round((completed / targetAssigns.length) * 100);
    }, [scores, filteredAssignments]);

    // حساب أعمال السنة للفترة المحددة
    const calculateYearWork = useCallback((studentId: string) => {
        // فلترة الأداء بناءً على المادة والفصل والفترة المحددة
        const studentPerf = performance.filter(p => 
            p.studentId === studentId && 
            p.subject === selectedSubject &&
            (!selectedTermId || p.date >= (activeTerm?.startDate || '')) &&
            (!selectedPeriodId || assignments.find(a => (a.id === p.notes || a.title === p.title) && a.periodId === selectedPeriodId))
        );
        
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

        // إضافة درجة الحضور للفترة
        const studentAtt = attendance.filter(a => 
            a.studentId === studentId &&
            (!selectedTermId || (activeTerm && a.date >= activeTerm.startDate && a.date <= activeTerm.endDate))
        );
        const attRate = studentAtt.length > 0 ? (studentAtt.filter(a => a.status === 'PRESENT').length / studentAtt.length) : 1;
        const attScore = attRate * (weights.ATTENDANCE || 5);
        results['att'] = Math.round(attScore * 100) / 100;
        total += attScore;
        
        results['total'] = Math.round(total * 10) / 10;
        return results;
    }, [performance, selectedSubject, weights, attendance, assignments, categories, selectedTermId, selectedPeriodId, activeTerm]);

    // --- المعالجات (Handlers) ---
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
            setTimeout(() => { setIsSaving(false); alert('تم حفظ التعديلات بنجاح!'); }, 500);
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

    const handleAddCategory = () => {
        if (!newCatLabel.trim()) return;
        const newCat = { id: `CAT_${Date.now()}`, label: newCatLabel.trim() };
        const updated = [...categories, newCat];
        setCategories(updated);
        localStorage.setItem('works_custom_categories', JSON.stringify(updated));
        setNewCatLabel('');
    };

    const handleDeleteCategory = (id: string) => {
        if (DEFAULT_CATEGORIES.some(c => c.id === id)) return alert('لا يمكن حذف التبويبات الأساسية');
        if (confirm('هل أنت متأكد؟ سيتم إخفاء الأعمدة التابعة لهذا التبويب.')) {
            const updated = categories.filter(c => c.id !== id);
            setCategories(updated);
            localStorage.setItem('works_custom_categories', JSON.stringify(updated));
        }
    };

    const handleFetchSheet = async () => {
        if (!googleSheetUrl) return alert('أدخل رابط قوقل شيت أولاً');
        setIsFetchingStructure(true);
        try {
            saveWorksMasterUrl(googleSheetUrl);
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(googleSheetUrl);
            setWorkbookRef(workbook);
            setSheetNames(sheetNames);
            if (sheetNames.length > 0) setSelectedSheetName(sheetNames[0]);
        } catch (e: any) {
            alert('تأكد أن الملف "متاح لأي شخص لديه الرابط"');
        } finally {
            setIsFetchingStructure(false);
        }
    };

    useEffect(() => {
        if (workbookRef && selectedSheetName) {
            const { headers } = getSheetHeadersAndData(workbookRef, selectedSheetName);
            setAvailableHeaders(headers);
        }
    }, [selectedSheetName, workbookRef]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 animate-fade-in relative overflow-hidden font-tajawal">
            {/* الشريط العلوي الفاخر */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 mb-4 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
                        <Calendar size={16} className="text-indigo-600"/>
                        <select className="bg-transparent text-xs font-black outline-none min-w-[140px] text-indigo-900" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                            <option value="">-- الفصل الدراسي --</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-xl border border-purple-100">
                        <ListFilter size={16} className="text-purple-600"/>
                        <select className="bg-transparent text-xs font-black text-purple-900 outline-none min-w-[140px]" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                            <option value="">-- كل الفترات --</option>
                            {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <select className="p-2.5 border rounded-xl bg-white text-xs font-black outline-none shadow-sm min-w-[120px] border-slate-200 text-slate-700" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="">-- المادة --</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={saveAllScores} disabled={isSaving} className="flex-1 md:flex-none bg-indigo-900 text-white px-8 py-2.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-950 active:scale-95 transition-all">
                        {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} حفظ التعديلات
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-white text-slate-400 border border-slate-200 rounded-2xl hover:text-indigo-600 shadow-sm transition-all"><Settings size={20}/></button>
                </div>
            </div>

            {/* الجدول والتبويبات */}
            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 flex-1 overflow-hidden flex flex-col">
                <div className="flex bg-slate-50 border-b p-2 overflow-x-auto no-scrollbar gap-2 print:hidden shadow-inner">
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`px-8 py-3 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === cat.id ? 'bg-white shadow-lg text-indigo-600 border border-indigo-100 scale-105' : 'text-slate-400 hover:bg-white/50'}`}>
                            {cat.label}
                        </button>
                    ))}
                    <div className="w-[1px] h-8 bg-slate-200 self-center mx-2"></div>
                    <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-8 py-3 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'YEAR_WORK' ? 'bg-indigo-900 text-white shadow-2xl scale-105' : 'text-slate-400 hover:bg-slate-100'}`}>أعمال السنة</button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[1000px]">
                        <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-30 border-b">
                            <tr className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                                <th className="p-4 w-12 border-l border-slate-100">#</th>
                                <th className="p-4 text-right sticky right-0 bg-slate-50 z-40 w-80 border-l border-slate-100 shadow-sm">اسم الطالب</th>
                                {activeTab === 'YEAR_WORK' ? (
                                    <>
                                        {categories.map(cat => <th key={cat.id} className="p-2 border-l border-slate-100 text-indigo-900 font-black">{cat.label} ({weights[cat.id] || 0})</th>)}
                                        <th className="p-2 border-l border-slate-100 text-emerald-700 font-black">الحضور ({weights.ATTENDANCE})</th>
                                        <th className="p-2 border-l border-slate-100 bg-indigo-50 text-indigo-950 font-black">المجموع الكلي</th>
                                    </>
                                ) : (
                                    filteredAssignments.map(a => (
                                        <th key={a.id} className="p-4 border-l border-slate-100 min-w-[140px] relative group">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-slate-800 font-black text-xs">{a.title}</span>
                                                    {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="text-indigo-500"><ExternalLink size={10}/></a>}
                                                </div>
                                                <span className="text-[8px] opacity-50 font-mono mt-1">الدرجة: {a.maxScore}</span>
                                                {a.sourceMetadata && <div className="text-[8px] text-emerald-600 flex items-center gap-0.5 mt-0.5"><CloudLightning size={8}/> مزامنة آلي</div>}
                                            </div>
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.map((student, idx) => {
                                if (activeTab === 'YEAR_WORK') {
                                    const res = calculateYearWork(student.id);
                                    return (
                                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 border-l border-slate-50 text-xs text-slate-300 font-mono">{idx + 1}</td>
                                            <td className="p-3 text-right font-black text-slate-700 sticky right-0 bg-white z-10 border-l border-slate-50"><span className="truncate">{student.name}</span></td>
                                            {categories.map(cat => <td key={cat.id} className="p-3 border-l border-slate-50 font-bold text-slate-600">{(res as any)[cat.id] || 0}</td>)}
                                            <td className="p-3 border-l border-slate-50 font-bold text-emerald-600">{(res as any).att || 0}</td>
                                            <td className="p-3 border-l border-slate-50 font-black text-indigo-900 bg-indigo-50/20">{(res as any).total || 0}</td>
                                        </tr>
                                    );
                                }
                                const achievement = calculateAchievement(student.id);
                                return (
                                    <tr key={student.id} className="hover:bg-slate-50 transition-colors h-16">
                                        <td className="p-3 border-l border-slate-50 text-xs text-slate-300 font-mono">{idx + 1}</td>
                                        <td className="p-3 text-right font-black text-slate-700 sticky right-0 bg-white z-10 border-l border-slate-50 cursor-pointer hover:text-indigo-600">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="truncate">{student.name}</span>
                                                <div className="flex flex-col items-center shrink-0">
                                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1 border border-slate-200"><div className={`h-full transition-all duration-700 ${achievement >= 90 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{width: `${achievement}%`}}></div></div>
                                                    <span className="text-[8px] font-black opacity-40">{achievement}%</span>
                                                </div>
                                            </div>
                                        </td>
                                        {filteredAssignments.map(a => (
                                            <td key={a.id} className="p-0 border-l border-slate-50 h-full">
                                                <input 
                                                    className="w-full h-full text-center outline-none bg-transparent focus:bg-indigo-50/30 font-black text-sm text-indigo-900 transition-all border-none" 
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
                        <div className="p-20 text-center text-slate-300 font-black italic">أضف أعمدة رصد من الإعدادات أو اربط ملف قوقل شيت للبدء</div>
                    )}
                </div>
            </div>

            {/* نافذة الإعدادات المتقدمة */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in border border-white/20">
                        <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3"><Settings size={26} className="text-indigo-600"/> إعدادات السجل الذكية</h3>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-2">تخصيص الأعمدة، المزامنة، وتوزيع الدرجات</p>
                            </div>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"><X size={28}/></button>
                        </div>
                        
                        <div className="flex bg-white border-b overflow-x-auto no-scrollbar shadow-inner px-2">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`px-10 py-5 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'MANUAL' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 border-transparent'}`}>إدارة الأعمدة</button>
                            <button onClick={() => setSettingsTab('CATEGORIES')} className={`px-10 py-5 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'CATEGORIES' ? 'text-purple-600 border-purple-600 bg-purple-50/30' : 'text-slate-400 border-transparent'}`}>تبويبات مخصصة</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`px-10 py-5 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'SHEET' ? 'text-emerald-600 border-emerald-600 bg-emerald-50/30' : 'text-slate-400 border-transparent'}`}>ربط Google Sheets</button>
                            <button onClick={() => setSettingsTab('WEIGHTS')} className={`px-10 py-5 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'WEIGHTS' ? 'text-orange-600 border-orange-600 bg-orange-50/30' : 'text-slate-400 border-transparent'}`}>توزيع أعمال السنة</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm">
                                            <span className="text-xs font-black text-slate-500 mr-2">تصفية حسب التبويب:</span>
                                            <select className="bg-slate-100 p-2 rounded-xl text-xs font-black outline-none border border-slate-200" value={settingsCategoryFilter} onChange={e => setSettingsCategoryFilter(e.target.value)}>
                                                <option value="ALL">جميع التبويبات</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row gap-6 items-end border-b-[12px] border-indigo-950 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={100}/></div>
                                        <div className="flex-1 w-full space-y-4 relative z-10">
                                            <label className="block text-[11px] font-black text-indigo-300 uppercase tracking-widest">إضافة عمود يدوي لـ "{categories.find(c=>c.id===activeTab)?.label}"</label>
                                            <input className="w-full p-4 bg-white/10 border border-white/20 text-white rounded-2xl outline-none focus:bg-white/20 font-bold placeholder-white/40" placeholder="عنوان العمود (مثلاً: واجب 1)..." value={newCol.title} onChange={e => setNewCol({...newCol, title: e.target.value})}/>
                                            <input className="w-full p-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] outline-none dir-ltr placeholder-white/20" placeholder="رابط مشاركة خارجي (اختياري)..." value={newCol.url} onChange={e => setNewCol({...newCol, url: e.target.value})}/>
                                        </div>
                                        <div className="w-24 relative z-10"><label className="block text-[10px] font-black text-indigo-300 mb-2">الدرجة</label><input type="number" className="w-full p-4 bg-white/10 border border-white/20 text-white rounded-2xl text-center font-black" value={newCol.max} onChange={e => setNewCol({...newCol, max: e.target.value})}/></div>
                                        <div className="w-24 relative z-10"><label className="block text-[10px] font-black text-indigo-300 mb-2">الترتيب</label><input type="number" className="w-full p-4 bg-white/10 border border-white/20 text-white rounded-2xl text-center font-black" value={newCol.order} onChange={e => setNewCol({...newCol, order: e.target.value})}/></div>
                                        <button onClick={() => { 
                                            if(!newCol.title || !selectedTermId) return alert('أكمل البيانات الأساسية'); 
                                            saveAssignment({ id: Date.now().toString(), title: newCol.title, maxScore: parseFloat(newCol.max), isVisible: true, teacherId: currentUser?.id, termId: selectedTermId, periodId: selectedPeriodId, category: activeTab as any, sortOrder: parseInt(newCol.order), url: newCol.url }); 
                                            setAssignments(getAssignments('ALL', currentUser?.id, isManager));
                                            setNewCol({title:'', max:'10', category:'', order: (filteredAssignments.length + 1).toString(), url:''}); 
                                        }} className="bg-white text-indigo-900 px-12 py-4 rounded-2xl font-black shadow-2xl hover:bg-slate-100 transition-all active:scale-95 relative z-10">إضافة</button>
                                    </div>
                                    
                                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
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
                                                {settingsFilteredAssignments.map(a => (
                                                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 border-l border-slate-50"><input type="number" className="w-14 p-2 border border-slate-200 rounded-xl text-center font-black text-xs" value={a.sortOrder || 0} onChange={e => handleUpdateAssignment(a.id, { sortOrder: parseInt(e.target.value) })} /></td>
                                                        <td className="p-4"><input className="w-full p-2 border-none bg-transparent font-black text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-xl" value={a.title} onChange={e => handleUpdateAssignment(a.id, { title: e.target.value })} /></td>
                                                        <td className="p-4"><input type="number" className="w-20 p-2 border border-slate-200 rounded-xl text-center font-black text-xs text-indigo-600" value={a.maxScore} onChange={e => handleUpdateAssignment(a.id, { maxScore: parseFloat(e.target.value) })} /></td>
                                                        <td className="p-4"><input className="w-full p-2 border border-slate-200 rounded-xl text-[9px] dir-ltr text-right opacity-60 focus:opacity-100 font-mono" value={a.url || ''} onChange={e => handleUpdateAssignment(a.id, { url: e.target.value })} placeholder="https://..." /></td>
                                                        <td className="p-4 text-center"><button onClick={() => { if(confirm('حذف العمود؟')) { deleteAssignment(a.id); setAssignments(prev => prev.filter(x => x.id !== a.id)); } }} className="p-2.5 text-red-200 hover:text-red-600 transition-colors"><Trash2 size={20}/></button></td>
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
                                            <button onClick={handleAddCategory} className="bg-purple-600 text-white px-12 rounded-[1.5rem] font-black shadow-xl hover:bg-purple-700 transition-all">إضافة</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {categories.map(cat => (
                                            <div key={cat.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex justify-between items-center group shadow-sm hover:border-purple-200 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                                    <span className="font-black text-slate-700">{cat.label}</span>
                                                </div>
                                                {!DEFAULT_CATEGORIES.some(c=>c.id===cat.id) && <button onClick={()=>handleDeleteCategory(cat.id)} className="text-red-200 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>}
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
                                        {/* Fix: Added explicit type annotations to reduce callback to avoid unknown addition error */}
                                        <div className="text-sm font-bold text-slate-500">المجموع النهائي: <span className="text-orange-600 font-black text-2xl ml-2">{Object.values(weights).reduce((a: number, b: number) => a + b, 0)}</span></div>
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
                                            <button onClick={handleFetchSheet} disabled={isFetchingStructure} className="bg-emerald-600 text-white px-12 rounded-2xl font-black shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                                                {isFetchingStructure ? <Loader2 className="animate-spin" size={22}/> : <><RefreshCw size={22}/> جلب</>}
                                            </button>
                                        </div>
                                        <p className="mt-4 text-[11px] text-emerald-600 font-bold italic">تنبيه: يجب ضبط الملف ليكون متاحاً لـ "أي شخص لديه الرابط" ليتمكن النظام من قراءته.</p>
                                    </div>
                                    
                                    {sheetNames.length > 0 && (
                                        <div className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-2xl animate-slide-up">
                                            <div className="p-6 bg-slate-50 border-b flex gap-6 items-center">
                                                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm"><Sheet size={22} className="text-emerald-600"/></div>
                                                <div className="flex-1">
                                                    <span className="text-xs font-black text-slate-500 block mb-1">اختر ورقة العمل المطلوبة:</span>
                                                    <select className="w-full p-2.5 border border-slate-200 rounded-xl text-sm bg-white font-black outline-none focus:ring-2 focus:ring-emerald-500" value={selectedSheetName} onChange={e => setSelectedSheetName(e.target.value)}>
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
                                                            if(!selectedTermId) return alert('اختر الفصل الدراسي أولاً من الشريط العلوي');
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
                                                            alert(`تم ربط عمود "${h}" بنجاح في التبويب الحالي.`);
                                                        }} className="text-[10px] bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 shrink-0">
                                                            <Target size={14}/> ربط بالتبويب
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