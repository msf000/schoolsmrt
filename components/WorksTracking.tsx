import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, Subject, AcademicTerm, PerformanceCategory, TermPeriod } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, bulkAddPerformance, getPerformance, getStudents } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Table, Plus, Trash2, Settings, Calendar, X, Check, RefreshCw, Loader2, Zap, CloudLightning, ListFilter, Tag, Printer, CheckCircle, PieChart, Sheet, ArrowUpDown, Link as LinkIcon, Edit3, Target, Layout } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

// التبويبات الافتراضية
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

    // --- State: Categories ---
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
    const [isSheetSyncing, setIsSheetSyncing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'CATEGORIES' | 'WEIGHTS'>('MANUAL');
    
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

    const [newCol, setNewCol] = useState({ title: '', max: '10', category: '', order: '0' });
    const [newCatLabel, setNewCatLabel] = useState('');

    useEffect(() => {
        if (currentUser) {
            const loadedTerms = getAcademicTerms(currentUser.id);
            setTerms(loadedTerms);
            setSubjects(getSubjects(currentUser.id));
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
            
            if (!selectedTermId) {
                const current = loadedTerms.find(t => t.isCurrent);
                if (current) setSelectedTermId(current.id);
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

    // حساب نسبة الإنجاز لأي تبويب حالي أو محدد
    const calculateAchievement = useCallback((studentId: string, categoryId?: string) => {
        const targetAssignments = categoryId 
            ? assignments.filter(a => a.category === categoryId && (!selectedTermId || a.termId === selectedTermId) && (!selectedPeriodId || a.periodId === selectedPeriodId))
            : filteredAssignments;

        const studentScores = scores[studentId] || {};
        let totalEarned = 0;
        let totalPossible = 0;

        targetAssignments.forEach(a => {
            const val = parseFloat(studentScores[a.id]);
            if (!isNaN(val)) {
                totalEarned += val;
                totalPossible += a.maxScore;
            }
        });

        if (totalPossible === 0) return 0;
        return Math.round((totalEarned / totalPossible) * 100);
    }, [scores, filteredAssignments, assignments, selectedTermId, selectedPeriodId]);

    const calculateYearWork = useCallback((studentId: string) => {
        const studentPerf = performance.filter(p => {
            const isMatch = p.studentId === studentId && p.subject === selectedSubject;
            if (!isMatch) return false;
            
            const assign = assignments.find(a => a.id === p.notes || a.title === p.title);
            if (!selectedPeriodId) return true;
            return assign?.periodId === selectedPeriodId;
        });

        const getCategoryFinalScore = (catId: string) => {
            const items = studentPerf.filter(p => p.category === catId);
            if (items.length === 0) return 0;
            const weight = weights[catId] || 0;

            // إذا كان التبويب اختبارات -> نستخدم المعدل الموزون (متوسط نسب الإتقان لكل اختبار)
            if (catId === 'PLATFORM_EXAM') {
                const percentages = items.map(item => (item.score / item.maxScore));
                const averagePct = percentages.reduce((a, b) => a + b, 0) / percentages.length;
                return averagePct * weight;
            } 
            
            // للواجبات والأنشطة والتبويبات الأخرى -> نستخدم نسبة الإنجاز الإجمالية (إجمالي المحصل / إجمالي العظمى)
            const totalEarned = items.reduce((sum, item) => sum + item.score, 0);
            const totalMax = items.reduce((sum, item) => sum + item.maxScore, 0);
            return (totalEarned / (totalMax || 1)) * weight;
        };

        const scoresByCat: Record<string, number> = {};
        let total = 0;

        categories.forEach(cat => {
            const score = getCategoryFinalScore(cat.id);
            scoresByCat[cat.id] = Math.round(score * 100) / 100;
            total += score;
        });
        
        // حساب الحضور
        const studentAtt = attendance.filter(a => {
            if (a.studentId !== studentId) return false;
            if (!selectedPeriodId) return true;
            const period = activePeriods.find(p => p.id === selectedPeriodId);
            if (!period) return true;
            return a.date >= period.startDate && a.date <= period.endDate;
        });
        const attRate = studentAtt.length > 0 ? (studentAtt.filter(a => a.status === 'PRESENT').length / studentAtt.length) : 1;
        const attScore = attRate * (weights.ATTENDANCE || 5);
        total += attScore;

        return { ...scoresByCat, att: Math.round(attScore * 100) / 100, total: Math.round(total * 10) / 10 };
    }, [performance, selectedSubject, weights, attendance, assignments, selectedPeriodId, activePeriods, categories]);

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
            setTimeout(() => {
                setIsSaving(false);
                alert('تم حفظ الدرجات بنجاح!');
            }, 500);
        } else {
            setIsSaving(false);
        }
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

    const handleUpdateAssignment = (id: string, updates: Partial<Assignment>) => {
        const assign = assignments.find(a => a.id === id);
        if (assign) {
            saveAssignment({ ...assign, ...updates });
            setAssignments(getAssignments('ALL', currentUser?.id, isManager));
        }
    };

    const handleAddCategory = () => {
        if (!newCatLabel) return;
        const id = 'CAT_' + Date.now();
        const newCats = [...categories, { id, label: newCatLabel }];
        setCategories(newCats);
        localStorage.setItem('works_custom_categories', JSON.stringify(newCats));
        setNewCatLabel('');
    };

    const handleDeleteCategory = (id: string) => {
        if (DEFAULT_CATEGORIES.some(c => c.id === id)) return alert('لا يمكن حذف التبويبات الأساسية');
        const newCats = categories.filter(c => c.id !== id);
        setCategories(newCats);
        localStorage.setItem('works_custom_categories', JSON.stringify(newCats));
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative overflow-hidden">
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border">
                        <Calendar size={16} className="text-indigo-600"/>
                        <select className="bg-transparent text-sm font-bold outline-none min-w-[120px]" value={selectedTermId} onChange={e => { setSelectedTermId(e.target.value); setSelectedPeriodId(''); }}>
                            <option value="">-- الفصل الدراسي --</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
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
                        {Array.from(new Set(initialStudents.map(s => s.className).filter(Boolean))).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={saveAllScores} disabled={isSaving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:bg-indigo-700 transition-all">
                        {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <CheckCircle size={16}/>} حفظ التعديلات
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 border"><Settings size={18}/></button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="flex bg-gray-50 border-b p-1 overflow-x-auto no-scrollbar gap-1 print:hidden">
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === cat.id ? 'bg-white shadow text-indigo-600 border border-indigo-100' : 'text-gray-500 hover:bg-gray-100'}`}>
                            {cat.label}
                        </button>
                    ))}
                    <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-4 py-2 rounded-lg text-sm font-black transition-all whitespace-nowrap ${activeTab === 'YEAR_WORK' ? 'bg-indigo-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>أعمال السنة</button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[900px]">
                        <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-30 shadow-sm">
                            <tr>
                                <th className="p-4 w-12 border-l">#</th>
                                <th className="p-4 text-right sticky right-0 bg-gray-50 z-40 w-80 border-l">اسم الطالب</th>
                                {activeTab === 'YEAR_WORK' ? (
                                    <>
                                        {categories.map(cat => <th key={cat.id} className="p-2 border-l text-xs">{cat.label} ({weights[cat.id] || 0})</th>)}
                                        <th className="p-2 border-l text-green-700 text-xs">الحضور ({weights.ATTENDANCE})</th>
                                        <th className="p-2 border-l bg-indigo-900 text-white font-black">المجموع</th>
                                    </>
                                ) : (
                                    <>
                                        {filteredAssignments.map(a => (
                                            <th key={a.id} className="p-3 border-l min-w-[120px] text-xs relative group">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold">{a.title}</span>
                                                    <span className="text-[9px] text-gray-400 mt-1">({a.maxScore})</span>
                                                </div>
                                            </th>
                                        ))}
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {students.filter(s => !selectedClass || s.className === selectedClass).map((student, idx) => {
                                if (activeTab === 'YEAR_WORK') {
                                    const res = calculateYearWork(student.id);
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 border-b">
                                            <td className="p-3 border-l text-gray-400">{idx + 1}</td>
                                            <td className="p-3 text-right font-bold text-gray-800 sticky right-0 bg-white z-10 border-l">
                                                <div className="flex items-center justify-between">
                                                    <span>{student.name}</span>
                                                </div>
                                            </td>
                                            {categories.map(cat => {
                                                const scoreValue = (res as any)[cat.id] || 0;
                                                return <td key={cat.id} className="p-3 border-l font-bold">{scoreValue}</td>;
                                            })}
                                            <td className="p-3 border-l font-bold text-green-600">{res.att}</td>
                                            <td className="p-3 border-l font-black text-indigo-900 bg-indigo-50">{res.total}</td>
                                        </tr>
                                    );
                                }
                                const achievement = calculateAchievement(student.id);
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 border-b">
                                        <td className="p-3 border-l text-gray-400">{idx + 1}</td>
                                        <td className="p-3 text-right font-bold text-gray-800 sticky right-0 bg-white z-10 border-l" onClick={() => navigate('/followup', {state: {studentId: student.id}})}>
                                            <div className="flex items-center justify-between">
                                                <span className="truncate">{student.name}</span>
                                                <span className={`mr-2 px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm ${achievement >= 90 ? 'bg-green-600 text-white' : achievement >= 50 ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                                                    {achievement}%
                                                </span>
                                            </div>
                                        </td>
                                        {filteredAssignments.map(a => (
                                            <td key={a.id} className="p-0 border-l h-12">
                                                <input className="w-full h-full text-center outline-none bg-transparent focus:bg-indigo-50 font-bold" value={scores[student.id]?.[a.id] || ''} onChange={e => setScores({...scores, [student.id]: {...scores[student.id], [a.id]: e.target.value}})} placeholder="-"/>
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {isSettingsOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-zoom-in">
                        <div className="p-5 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-black text-gray-800 flex items-center gap-2"><Settings size={20}/> إعدادات السجل</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X/></button>
                        </div>
                        
                        <div className="flex bg-white border-b overflow-x-auto no-scrollbar">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${settingsTab === 'MANUAL' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500'}`}>إدارة الأعمدة</button>
                            <button onClick={() => setSettingsTab('CATEGORIES')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${settingsTab === 'CATEGORIES' ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50' : 'text-gray-500'}`}>التبويبات</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${settingsTab === 'SHEET' ? 'text-green-600 border-b-2 border-green-600 bg-green-50' : 'text-gray-500'}`}>قوقل شيت</button>
                            <button onClick={() => setSettingsTab('WEIGHTS')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap ${settingsTab === 'WEIGHTS' ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50' : 'text-gray-500'}`}>الأوزان</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6">
                                    <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-bold text-indigo-200 mb-1 uppercase">إضافة عمود جديد لتبويب "{categories.find(c=>c.id===activeTab)?.label || activeTab}"</label>
                                            <input className="w-full p-2.5 bg-indigo-800 border-indigo-700 text-white rounded-xl" placeholder="اسم العمود..." value={newCol.title} onChange={e => setNewCol({...newCol, title: e.target.value})}/>
                                        </div>
                                        <div className="w-24"><label className="block text-xs font-bold text-indigo-200 mb-1">الدرجة</label><input type="number" className="w-full p-2.5 bg-indigo-800 border-indigo-700 text-white rounded-xl text-center" value={newCol.max} onChange={e => setNewCol({...newCol, max: e.target.value})}/></div>
                                        <div className="w-20"><label className="block text-xs font-bold text-indigo-200 mb-1">الترتيب</label><input type="number" className="w-full p-2.5 bg-indigo-800 border-indigo-700 text-white rounded-xl text-center" value={newCol.order} onChange={e => setNewCol({...newCol, order: e.target.value})}/></div>
                                        <button onClick={() => { 
                                            if(!newCol.title || !selectedTermId || !selectedPeriodId) return alert('أكمل البيانات'); 
                                            saveAssignment({ id: Date.now().toString(), title: newCol.title, maxScore: parseFloat(newCol.max), isVisible: true, teacherId: currentUser?.id, termId: selectedTermId, periodId: selectedPeriodId, category: activeTab as any, sortOrder: parseInt(newCol.order) }); 
                                            setAssignments(getAssignments('ALL', currentUser?.id, isManager)); setNewCol({...newCol, title:''}); 
                                        }} className="bg-white text-indigo-900 px-6 py-2.5 rounded-xl font-black">إضافة</button>
                                    </div>
                                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                                        <table className="w-full text-right text-sm">
                                            <thead className="bg-gray-50 text-gray-500 font-bold text-[10px]">
                                                <tr><th className="p-3 w-16 text-center">الترتيب</th><th className="p-3">الاسم</th><th className="p-3 w-24 text-center">الدرجة</th><th className="p-3">الرابط</th><th className="p-3 w-16">حذف</th></tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {filteredAssignments.map(a => (
                                                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-2 border-l"><input type="number" className="w-12 p-1 border rounded text-center font-bold" value={a.sortOrder || 0} onChange={e => handleUpdateAssignment(a.id, { sortOrder: parseInt(e.target.value) })} /></td>
                                                        <td className="p-2"><input className="w-full p-1 border rounded font-bold" value={a.title} onChange={e => handleUpdateAssignment(a.id, { title: e.target.value })} /></td>
                                                        <td className="p-2"><input type="number" className="w-16 p-1 border rounded text-center font-bold" value={a.maxScore} onChange={e => handleUpdateAssignment(a.id, { maxScore: parseFloat(e.target.value) })} /></td>
                                                        <td className="p-2 text-xs text-gray-400">{a.sourceMetadata ? JSON.parse(a.sourceMetadata).header : 'يدوي'}</td>
                                                        <td className="p-2"><button onClick={() => { if(confirm('حذف؟')) { deleteAssignment(a.id); setAssignments(prev => prev.filter(x => x.id !== a.id)); } }} className="p-1.5 text-red-400 hover:text-red-600"><Trash2 size={16}/></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'CATEGORIES' && (
                                <div className="space-y-6 max-w-xl mx-auto">
                                    <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-4">
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><Layout className="text-purple-600"/> إضافة تبويب مخصص جديد</h4>
                                        <div className="flex gap-2">
                                            <input className="flex-1 p-3 border rounded-xl" placeholder="مثلاً: مشاريع، مشاركة..." value={newCatLabel} onChange={e=>setNewCatLabel(e.target.value)}/>
                                            <button onClick={handleAddCategory} className="bg-purple-600 text-white px-6 rounded-xl font-bold">إضافة التبويب</button>
                                        </div>
                                        <p className="text-[10px] text-gray-400">سيظهر التبويب المضاف في شريط التبويبات العلوي وفي توزيع درجات أعمال السنة.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400">التبويبات الحالية:</label>
                                        {categories.map(cat => (
                                            <div key={cat.id} className="bg-white p-3 border rounded-xl flex justify-between items-center group">
                                                <span className="font-bold text-gray-700">{cat.label} {DEFAULT_CATEGORIES.some(c=>c.id===cat.id) && <span className="text-[9px] text-gray-300">(أساسي)</span>}</span>
                                                {!DEFAULT_CATEGORIES.some(c=>c.id===cat.id) && <button onClick={()=>handleDeleteCategory(cat.id)} className="text-red-300 hover:text-red-500"><Trash2 size={16}/></button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'WEIGHTS' && (
                                <div className="max-w-md mx-auto space-y-4 bg-white p-6 rounded-3xl border shadow-sm">
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-4 border-b pb-2"><PieChart className="text-orange-500"/> أوزان أعمال السنة</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        {categories.map(cat => (
                                            <div key={cat.id}><label className="text-[10px] font-bold text-gray-400">{cat.label}</label><input type="number" className="w-full p-2 border rounded-xl font-bold" value={weights[cat.id] || 0} onChange={e=>setWeights({...weights, [cat.id]: parseInt(e.target.value)})}/></div>
                                        ))}
                                        <div><label className="text-[10px] font-bold text-gray-400">الحضور والغياب</label><input type="number" className="w-full p-2 border rounded-xl font-bold" value={weights.ATTENDANCE || 0} onChange={e=>setWeights({...weights, ATTENDANCE: parseInt(e.target.value)})}/></div>
                                    </div>
                                    <button onClick={()=>{localStorage.setItem('works_weights', JSON.stringify(weights)); alert('تم حفظ الأوزان!');}} className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold mt-4 shadow-lg">حفظ التوزيع</button>
                                </div>
                            )}

                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6 max-w-2xl mx-auto">
                                    <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                                        <label className="block text-sm font-bold text-green-800 mb-2">رابط ملف قوقل شيت</label>
                                        <div className="flex gap-2">
                                            <input className="flex-1 p-2.5 border border-green-300 rounded-xl dir-ltr" value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} placeholder="https://docs.google.com/..." />
                                            <button onClick={handleFetchSheet} disabled={isFetchingStructure} className="bg-green-600 text-white px-6 rounded-xl font-bold">جلب</button>
                                        </div>
                                    </div>
                                    {sheetNames.length > 0 && (
                                        <div className="bg-white rounded-2xl border overflow-hidden">
                                            <div className="p-3 bg-gray-50 border-b flex gap-4">
                                                <select className="flex-1 p-2 border rounded-lg text-sm bg-white font-bold" value={selectedSheetName} onChange={e => setSelectedSheetName(e.target.value)}>{sheetNames.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100">
                                                {availableHeaders.map(h => (
                                                    <div key={h} className="p-3 flex justify-between items-center bg-white hover:bg-green-50 group">
                                                        <span className="font-bold text-gray-700 text-xs truncate max-w-[150px]">{h}</span>
                                                        <button onClick={() => {
                                                            if(!selectedTermId || !selectedPeriodId) return alert('اختر الفترة أولاً');
                                                            saveAssignment({ id: Date.now().toString(), title: h, category: activeTab as any, maxScore: 10, isVisible: true, teacherId: currentUser?.id, termId: selectedTermId, periodId: selectedPeriodId, sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header: h }), sortOrder: filteredAssignments.length + 1 });
                                                            setAssignments(getAssignments('ALL', currentUser?.id, isManager)); alert('تم الربط!');
                                                        }} className="text-[9px] bg-green-600 text-white px-3 py-1.5 rounded-lg font-black">ربط بـ {categories.find(c=>c.id===activeTab)?.label}</button>
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