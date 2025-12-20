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
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
            
            const loadedTerms = getAcademicTerms(currentUser.id);
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

    const settingsFilteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const catMatch = settingsCategoryFilter === 'ALL' || a.category === settingsCategoryFilter;
            const termMatch = !selectedTermId || a.termId === selectedTermId;
            return catMatch && termMatch;
        }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [assignments, settingsCategoryFilter, selectedTermId]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        initialStudents.forEach(s => s.className && classes.add(s.className));
        if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [initialStudents, currentUser]);

    // --- Handlers ---
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
            setTimeout(() => { setIsSaving(false); alert('تم حفظ الدرجات ومزامنتها بنجاح!'); }, 500);
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
        const id = 'CAT_' + Date.now();
        const newCats = [...categories, { id, label: newCatLabel }];
        setCategories(newCats);
        localStorage.setItem('works_custom_categories', JSON.stringify(newCats));
        setNewCatLabel('');
    };

    const handleDeleteCategory = (id: string) => {
        if (DEFAULT_CATEGORIES.some(c => c.id === id)) return alert('لا يمكن حذف التبويبات الأساسية');
        if (confirm('هل أنت متأكد من حذف هذا التبويب؟ سيتم إخفاء الأعمدة التابعة له.')) {
            const newCats = categories.filter(c => c.id !== id);
            setCategories(newCats);
            localStorage.setItem('works_custom_categories', JSON.stringify(newCats));
        }
    };

    const handleFetchSheet = async () => {
        if (!googleSheetUrl) return alert('أدخل رابط الملف أولاً');
        setIsFetchingStructure(true);
        try {
            saveWorksMasterUrl(googleSheetUrl);
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(googleSheetUrl);
            setWorkbookRef(workbook);
            setSheetNames(sheetNames);
            if (sheetNames.length > 0) setSelectedSheetName(sheetNames[0]);
        } catch (e: any) {
            alert('خطأ: تأكد أن الملف عام (Anyone with link)');
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

    const calculateYearWork = useCallback((studentId: string) => {
        const studentPerf = performance.filter(p => p.studentId === studentId && p.subject === selectedSubject);
        
        const getCategoryFinalScore = (catId: string) => {
            const activeAssigns = assignments.filter(a => a.category === catId && (!selectedTermId || a.termId === selectedTermId));
            if (activeAssigns.length === 0) return 0;
            const weight = weights[catId] || 0;
            
            const totalMax = activeAssigns.reduce((sum, a) => sum + a.maxScore, 0);
            const totalEarned = studentPerf.filter(p => p.category === catId).reduce((sum, item) => sum + item.score, 0);
            return (totalEarned / (totalMax || 1)) * weight;
        };

        const results: Record<string, number> = {};
        let total = 0;
        categories.forEach(cat => {
            const score = getCategoryFinalScore(cat.id);
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
    }, [performance, selectedSubject, weights, attendance, assignments, categories, selectedTermId]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative overflow-hidden font-tajawal">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-4 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
                        <Calendar size={16} className="text-indigo-600"/>
                        <select className="bg-transparent text-xs font-black outline-none min-w-[140px]" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                            <option value="">-- الفصل الدراسي --</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-xl border border-purple-100">
                        <ListFilter size={16} className="text-purple-600"/>
                        <select className="bg-transparent text-xs font-black text-purple-700 outline-none min-w-[140px]" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                            <option value="">-- كل الفترات --</option>
                            {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <select className="p-2.5 border rounded-xl bg-white text-xs font-black outline-none shadow-sm min-w-[120px]" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="">-- المادة --</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <select className="p-2.5 border rounded-xl bg-white text-xs font-black outline-none shadow-sm min-w-[120px]" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">-- كل الفصول --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={saveAllScores} disabled={isSaving} className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">
                        {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} حفظ الدرجات
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 bg-white text-gray-400 border rounded-xl hover:text-indigo-600 shadow-sm transition-all"><Settings size={20}/></button>
                </div>
            </div>

            {/* Tabs & Table */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="flex bg-gray-50 border-b p-1.5 overflow-x-auto no-scrollbar gap-1.5 print:hidden shadow-inner">
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === cat.id ? 'bg-white shadow-md text-indigo-600 border border-indigo-100 scale-105' : 'text-gray-400 hover:bg-white/50'}`}>
                            {cat.label}
                        </button>
                    ))}
                    <div className="w-[1px] h-6 bg-gray-200 self-center mx-2"></div>
                    <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'YEAR_WORK' ? 'bg-gray-900 text-white shadow-xl scale-105' : 'text-gray-400 hover:bg-gray-100'}`}>أعمال السنة</button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[1000px]">
                        <thead className="bg-gray-50/80 backdrop-blur sticky top-0 z-30 border-b">
                            <tr className="text-[10px] text-gray-400 uppercase tracking-widest font-black">
                                <th className="p-4 w-12 border-l border-gray-100">#</th>
                                <th className="p-4 text-right sticky right-0 bg-gray-50 z-40 w-72 border-l border-gray-100 shadow-sm">اسم الطالب</th>
                                {activeTab === 'YEAR_WORK' ? (
                                    <>
                                        {categories.map(cat => <th key={cat.id} className="p-2 border-l border-gray-100 text-indigo-900">{cat.label} ({weights[cat.id] || 0})</th>)}
                                        <th className="p-2 border-l border-gray-100 text-green-700">الحضور ({weights.ATTENDANCE})</th>
                                        <th className="p-2 border-l border-gray-100 bg-indigo-50 text-indigo-900">المجموع</th>
                                    </>
                                ) : (
                                    filteredAssignments.map(a => (
                                        <th key={a.id} className="p-3 border-l border-gray-100 min-w-[130px] relative group">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-gray-800 font-black">{a.title}</span>
                                                    {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="text-indigo-500"><ExternalLink size={10}/></a>}
                                                </div>
                                                <span className="text-[8px] opacity-50 font-mono mt-0.5">القصوى: {a.maxScore}</span>
                                                {a.sourceMetadata && <div className="text-[8px] text-green-600 flex items-center gap-0.5"><CloudLightning size={8}/> آلي</div>}
                                            </div>
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {students.filter(s => !selectedClass || s.className === selectedClass).map((student, idx) => {
                                if (activeTab === 'YEAR_WORK') {
                                    const res = calculateYearWork(student.id);
                                    return (
                                        <tr key={student.id} className="hover:bg-indigo-50/10 transition-colors">
                                            <td className="p-3 border-l border-gray-50 text-xs text-gray-300 font-mono">{idx + 1}</td>
                                            <td className="p-3 text-right font-black text-gray-700 sticky right-0 bg-white z-10 border-l border-gray-50"><span className="truncate">{student.name}</span></td>
                                            {categories.map(cat => <td key={cat.id} className="p-3 border-l border-gray-50 font-bold text-gray-600">{(res as any)[cat.id] || 0}</td>)}
                                            <td className="p-3 border-l border-gray-50 font-bold text-green-600">{(res as any).att || 0}</td>
                                            <td className="p-3 border-l border-gray-50 font-black text-indigo-900 bg-indigo-50/30">{(res as any).total || 0}</td>
                                        </tr>
                                    );
                                }
                                const achievement = calculateAchievement(student.id);
                                return (
                                    <tr key={student.id} className="hover:bg-indigo-50/10 transition-colors">
                                        <td className="p-3 border-l border-gray-50 text-xs text-gray-300 font-mono">{idx + 1}</td>
                                        <td className="p-3 text-right font-black text-gray-700 sticky right-0 bg-white z-10 border-l border-gray-50 cursor-pointer hover:text-indigo-600" onClick={() => navigate('/followup', {state: {studentId: student.id}})}>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="truncate">{student.name}</span>
                                                <div className="flex flex-col items-center shrink-0">
                                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5"><div className={`h-full transition-all ${achievement >= 90 ? 'bg-green-500' : 'bg-indigo-500'}`} style={{width: `${achievement}%`}}></div></div>
                                                    <span className="text-[8px] font-black opacity-40">{achievement}%</span>
                                                </div>
                                            </div>
                                        </td>
                                        {filteredAssignments.map(a => (
                                            <td key={a.id} className="p-0 border-l border-gray-50 h-14">
                                                <input 
                                                    className="w-full h-full text-center outline-none bg-transparent focus:bg-indigo-50/50 font-black text-sm text-indigo-800 transition-colors" 
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
                        <div className="p-20 text-center text-gray-300 font-black italic">أضف أعمدة رصد من الإعدادات للبدء</div>
                    )}
                </div>
            </div>

            {/* SETTINGS MODAL */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in">
                        <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-xl text-gray-800 flex items-center gap-2"><Settings size={22} className="text-indigo-600"/> إعدادات الرصد المتقدمة</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">تخصيص المزامنة، التبويبات، والأوزان</p>
                            </div>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-full transition-all"><X size={24}/></button>
                        </div>
                        
                        <div className="flex bg-white border-b overflow-x-auto no-scrollbar shadow-inner px-2">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`px-8 py-5 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'MANUAL' ? 'text-indigo-600 border-indigo-600 bg-indigo-50/30' : 'text-gray-400 border-transparent'}`}>إدارة الأعمدة</button>
                            <button onClick={() => setSettingsTab('CATEGORIES')} className={`px-8 py-5 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'CATEGORIES' ? 'text-purple-600 border-purple-600 bg-purple-50/30' : 'text-gray-400 border-transparent'}`}>تبويبات مخصصة</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`px-8 py-5 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'SHEET' ? 'text-emerald-600 border-emerald-600 bg-emerald-50/30' : 'text-gray-400 border-transparent'}`}>ربط قوقل شيت</button>
                            <button onClick={() => setSettingsTab('WEIGHTS')} className={`px-8 py-5 font-black text-xs whitespace-nowrap transition-all border-b-4 ${settingsTab === 'WEIGHTS' ? 'text-orange-600 border-orange-600 bg-orange-50/30' : 'text-gray-400 border-transparent'}`}>توزيع أعمال السنة</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 custom-scrollbar">
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm mb-2 w-fit">
                                        <span className="text-xs font-black text-gray-500">تصفية حسب التبويب:</span>
                                        <select className="bg-gray-100 p-2 rounded-xl text-xs font-black outline-none" value={settingsCategoryFilter} onChange={e => setSettingsCategoryFilter(e.target.value)}>
                                            <option value="ALL">جميع التبويبات</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                        </select>
                                    </div>

                                    <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row gap-4 items-end border-b-8 border-indigo-700">
                                        <div className="flex-1 w-full space-y-3">
                                            <label className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest">إضافة عمود لتبويب: {categories.find(c=>c.id===(activeTab === 'YEAR_WORK' ? categories[0].id : activeTab))?.label}</label>
                                            <input className="w-full p-3 bg-white/10 border-white/20 text-white rounded-xl outline-none focus:bg-white/20 font-bold" placeholder="عنوان العمود..." value={newCol.title} onChange={e => setNewCol({...newCol, title: e.target.value})}/>
                                            <input className="w-full p-2 bg-white/5 border-white/10 text-white rounded-lg text-[10px] outline-none dir-ltr" placeholder="رابط خارجي..." value={newCol.url} onChange={e => setNewCol({...newCol, url: e.target.value})}/>
                                        </div>
                                        <div className="w-24"><label className="block text-[10px] font-black text-indigo-300 mb-1">الدرجة</label><input type="number" className="w-full p-3 bg-white/10 border-white/20 text-white rounded-xl text-center font-black" value={newCol.max} onChange={e => setNewCol({...newCol, max: e.target.value})}/></div>
                                        <div className="w-20"><label className="block text-[10px] font-black text-indigo-300 mb-1">الترتيب</label><input type="number" className="w-full p-3 bg-white/10 border-white/20 text-white rounded-xl text-center font-black" value={newCol.order} onChange={e => setNewCol({...newCol, order: e.target.value})}/></div>
                                        <button onClick={() => { 
                                            const cat = activeTab === 'YEAR_WORK' ? categories[0].id : activeTab;
                                            if(!newCol.title || !selectedTermId) return alert('أكمل البيانات'); 
                                            saveAssignment({ id: Date.now().toString(), title: newCol.title, maxScore: parseFloat(newCol.max), isVisible: true, teacherId: currentUser?.id, termId: selectedTermId, periodId: selectedPeriodId, category: cat as any, sortOrder: parseInt(newCol.order), url: newCol.url }); 
                                            setAssignments(getAssignments('ALL', currentUser?.id, isManager));
                                            setNewCol({title:'', max:'10', category:'', order: (assignments.length + 1).toString(), url:''}); 
                                        }} className="bg-white text-indigo-900 px-8 py-3.5 rounded-2xl font-black shadow-lg hover:bg-indigo-50 transition-all active:scale-95">إضافة</button>
                                    </div>
                                    
                                    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                                        <table className="w-full text-right text-sm">
                                            <thead className="bg-gray-100/50 text-gray-500 font-black text-[10px] uppercase border-b">
                                                <tr>
                                                    <th className="p-4 w-16 text-center">الترتيب</th>
                                                    <th className="p-4">اسم العمود</th>
                                                    <th className="p-4 w-24 text-center">الدرجة</th>
                                                    <th className="p-4">الرابط</th>
                                                    <th className="p-4 w-16 text-center">حذف</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {settingsFilteredAssignments.map(a => (
                                                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-3 border-l"><input type="number" className="w-12 p-1.5 border border-gray-200 rounded-lg text-center font-black text-xs" value={a.sortOrder || 0} onChange={e => handleUpdateAssignment(a.id, { sortOrder: parseInt(e.target.value) })} /></td>
                                                        <td className="p-3"><input className="w-full p-1.5 border-none bg-transparent font-bold text-gray-700 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg" value={a.title} onChange={e => handleUpdateAssignment(a.id, { title: e.target.value })} /></td>
                                                        <td className="p-3"><input type="number" className="w-16 p-1.5 border border-gray-200 rounded-lg text-center font-bold text-xs" value={a.maxScore} onChange={e => handleUpdateAssignment(a.id, { maxScore: parseFloat(e.target.value) })} /></td>
                                                        <td className="p-3"><input className="w-full p-1.5 border border-gray-200 rounded-lg text-[9px] dir-ltr text-right opacity-60 focus:opacity-100" value={a.url || ''} onChange={e => handleUpdateAssignment(a.id, { url: e.target.value })} placeholder="https://..." /></td>
                                                        <td className="p-3 text-center"><button onClick={() => { if(confirm('حذف العمود؟')) { deleteAssignment(a.id); setAssignments(prev => prev.filter(x => x.id !== a.id)); } }} className="p-2 text-red-200 hover:text-red-600 transition-colors"><Trash2 size={16}/></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'CATEGORIES' && (
                                <div className="space-y-8 max-w-2xl mx-auto animate-fade-in">
                                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-5">
                                        <h4 className="font-black text-gray-800 flex items-center gap-2"><Layers className="text-purple-600"/> إضافة تبويب رصد جديد</h4>
                                        <p className="text-xs text-gray-400 font-medium italic">التبويبات تساعدك على تنظيم درجاتك (مثل: مشاريع، بحوث، نشاط لا صفي).</p>
                                        <div className="flex gap-3 mt-2">
                                            <input className="flex-1 p-4 border rounded-2xl font-black focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="مثلاً: المشاريع الميدانية..." value={newCatLabel} onChange={e=>setNewCatLabel(e.target.value)}/>
                                            <button onClick={handleAddCategory} className="bg-purple-600 text-white px-10 rounded-2xl font-black shadow-lg hover:bg-purple-700 transition-all">إضافة</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {categories.map(cat => (
                                            <div key={cat.id} className="bg-white p-5 border rounded-2xl flex justify-between items-center group shadow-sm hover:border-purple-200 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                                    <span className="font-black text-gray-700">{cat.label}</span>
                                                </div>
                                                {!DEFAULT_CATEGORIES.some(c=>c.id===cat.id) && <button onClick={()=>handleDeleteCategory(cat.id)} className="text-red-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'WEIGHTS' && (
                                <div className="max-w-xl mx-auto bg-white p-8 rounded-[2.5rem] border shadow-xl animate-fade-in relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8 opacity-5"><PieChart size={150}/></div>
                                    <h4 className="font-black text-xl text-gray-800 flex items-center gap-2 mb-6 border-b pb-4"><PieChart className="text-orange-500"/> أوزان أعمال السنة</h4>
                                    <p className="text-xs text-gray-400 mb-6 font-bold">حدد الوزن الكلي لكل قسم ليقوم النظام بحساب المجموع النهائي تلقائياً.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                                        {categories.map(cat => (
                                            <div key={cat.id} className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{cat.label}</label>
                                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl border">
                                                    <input type="number" className="w-full bg-transparent p-1 font-black text-center text-lg outline-none" value={weights[cat.id] || 0} onChange={e=>setWeights({...weights, [cat.id]: parseInt(e.target.value)})}/>
                                                    <span className="text-[10px] text-gray-400 font-bold ml-2">درجة</span>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-green-600 uppercase tracking-widest">الحضور والمشاركة</label>
                                            <div className="flex items-center gap-2 bg-green-50/50 p-2 rounded-2xl border border-green-100">
                                                <input type="number" className="w-full bg-transparent p-1 font-black text-center text-lg outline-none text-green-700" value={weights.ATTENDANCE || 0} onChange={e=>setWeights({...weights, ATTENDANCE: parseInt(e.target.value)})}/>
                                                <span className="text-[10px] text-green-600 font-bold ml-2">درجة</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-8 pt-6 border-t flex items-center justify-between">
                                        <div className="text-sm font-bold text-gray-500">المجموع الكلي: <span className="text-orange-600 font-black text-lg">
                                            {/* Fix: Explicitly type reduce parameters to avoid 'unknown' type inference issues */}
                                            {Object.values(weights).reduce((a: number, b: number) => a + b, 0)}
                                        </span></div>
                                        <button onClick={()=>{localStorage.setItem('weights', JSON.stringify(weights)); alert('تم حفظ الأوزان بنجاح!');}} className="bg-orange-600 text-white px-10 py-3.5 rounded-2xl font-black shadow-lg hover:bg-orange-700 transition-all flex items-center gap-2"><Check size={18}/> اعتماد الأوزان</button>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6 max-w-3xl mx-auto animate-fade-in">
                                    <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 shadow-inner">
                                        <label className="block text-sm font-black text-emerald-800 mb-3 flex items-center gap-2"><Globe size={18}/> رابط ملف Google Sheets</label>
                                        <div className="flex gap-3">
                                            <input className="flex-1 p-4 border border-emerald-200 rounded-2xl dir-ltr text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500" value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                                            <button onClick={handleFetchSheet} disabled={isFetchingStructure} className="bg-emerald-600 text-white px-10 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                                                {isFetchingStructure ? <Loader2 className="animate-spin" size={20}/> : <><RefreshCw size={20}/> جلب</>}
                                            </button>
                                        </div>
                                        <p className="mt-3 text-[10px] text-emerald-600 font-bold">تنبيه: يجب أن يكون الملف متاحاً "لأي شخص لديه الرابط".</p>
                                    </div>
                                    
                                    {sheetNames.length > 0 && (
                                        <div className="bg-white rounded-[2.5rem] border border-gray-200 overflow-hidden shadow-xl animate-slide-up">
                                            <div className="p-5 bg-gray-50 border-b flex gap-4 items-center">
                                                <div className="p-2 bg-white rounded-lg border shadow-sm"><Sheet size={18} className="text-emerald-600"/></div>
                                                <span className="text-xs font-black text-gray-500">اختر الورقة:</span>
                                                <select className="flex-1 p-2 border rounded-xl text-sm bg-white font-black outline-none" value={selectedSheetName} onChange={e => setSelectedSheetName(e.target.value)}>
                                                    {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="max-h-[350px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100 p-px">
                                                {availableHeaders.map(h => (
                                                    <div key={h} className="p-5 flex justify-between items-center bg-white group hover:bg-emerald-50 transition-colors">
                                                        <div>
                                                            <span className="font-black text-gray-700 text-sm truncate max-w-[180px] block">{h}</span>
                                                            <span className="text-[9px] text-gray-400">عمود مكتشف</span>
                                                        </div>
                                                        <button onClick={() => {
                                                            if(!selectedTermId) return alert('اختر الفصل الدراسي أولاً');
                                                            const cat = activeTab === 'YEAR_WORK' ? categories[0].id : activeTab;
                                                            saveAssignment({ 
                                                                id: `sheet_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
                                                                title: h, 
                                                                category: cat as any, 
                                                                maxScore: 10, 
                                                                isVisible: true, 
                                                                teacherId: currentUser?.id, 
                                                                termId: selectedTermId, 
                                                                periodId: selectedPeriodId, 
                                                                sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header: h }), 
                                                                sortOrder: assignments.length + 1 
                                                            });
                                                            setAssignments(getAssignments('ALL', currentUser?.id, isManager)); 
                                                            alert(`تم ربط عمود "${h}" بنجاح!`);
                                                        }} className="text-[10px] bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black shadow-md hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2">
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