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

    // حساب نسبة الإنجاز: (مجموع درجات الطالب) / (مجموع الدرجات العظمى لكافة الأعمدة النشطة في التبويب)
    const calculateAchievement = useCallback((studentId: string, categoryId?: string) => {
        const targetAssignments = categoryId 
            ? assignments.filter(a => a.category === categoryId && (!selectedTermId || a.termId === selectedTermId) && (!selectedPeriodId || a.periodId === selectedPeriodId))
            : filteredAssignments;

        if (targetAssignments.length === 0) return 0;

        const studentScores = scores[studentId] || {};
        let totalEarned = 0;
        let totalPossible = 0;

        targetAssignments.forEach(a => {
            totalPossible += a.maxScore; // نجمع الدرجة العظمى لكل عمود نشط
            const val = parseFloat(studentScores[a.id]);
            if (!isNaN(val)) {
                totalEarned += val;
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
            // استخراج التكاليف النشطة لهذا التبويب
            const activeAssigns = assignments.filter(a => a.category === catId && (!selectedTermId || a.termId === selectedTermId) && (!selectedPeriodId || a.periodId === selectedPeriodId));
            if (activeAssigns.length === 0) return 0;

            const weight = weights[catId] || 0;

            // إذا كان التبويب اختبارات -> نستخدم المعدل الموزون (متوسط نسب الإتقان)
            if (catId === 'PLATFORM_EXAM') {
                const items = studentPerf.filter(p => p.category === catId);
                if (items.length === 0) return 0;
                const percentages = items.map(item => (item.score / item.maxScore));
                const averagePct = percentages.reduce((a, b) => a + b, 0) / percentages.length;
                return averagePct * weight;
            } 
            
            // للواجبات والأنشطة والتبويبات الأخرى -> (مجموع المحصل / مجموع العظمى للأعمدة النشطة) * الوزن
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
        
        const studentAtt = attendance.filter(a => {
            if (a.studentId !== studentId) return false;
            if (!selectedPeriodId) return true;
            const period = activePeriods.find(p => p.id === selectedPeriodId);
            return period ? (a.date >= period.startDate && a.date <= period.endDate) : true;
        });
        const attRate = studentAtt.length > 0 ? (studentAtt.filter(a => a.status === 'PRESENT').length / studentAtt.length) : 1;
        const attScore = attRate * (weights.ATTENDANCE || 5);
        results['att'] = Math.round(attScore * 100) / 100;
        total += attScore;

        results['total'] = Math.round(total * 10) / 10;
        return results;
    }, [performance, selectedSubject, weights, attendance, assignments, selectedPeriodId, activePeriods, categories, selectedTermId]);

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
                        id: `${studentId}_${assignId}`, studentId, subject: selectedSubject, title: assign.title, category: assign.category,
                        score: parseFloat(val), maxScore: assign.maxScore, date: today, notes: assign.id, createdById: currentUser?.id
                    });
                }
            });
        });

        if (records.length > 0) {
            onAddPerformance(records);
            setTimeout(() => { setIsSaving(false); alert('تم حفظ الدرجات بنجاح!'); }, 500);
        } else { setIsSaving(false); }
    };

    const handleQuickSync = async () => {
        if (!googleSheetUrl) return alert('الرجاء وضع رابط الملف في الإعدادات أولاً');
        setIsSheetSyncing(true);
        try {
            const { workbook } = await fetchWorkbookStructureUrl(googleSheetUrl);
            const linked = filteredAssignments.filter(a => a.sourceMetadata);
            if (linked.length === 0) throw new Error('لا توجد أعمدة مرتبطة في هذا التبويب/الفترة. قم بربط الأعمدة من الإعدادات.');
            
            const newRecords: PerformanceRecord[] = [];
            for (const assign of linked) {
                const meta = JSON.parse(assign.sourceMetadata!);
                const { data } = getSheetHeadersAndData(workbook, meta.sheet);
                
                data.forEach((row: any) => {
                    const name = String(row['الاسم'] || row['اسم الطالب'] || row['Name'] || row['اسمك'] || '').trim();
                    const nationalId = String(row['رقم الهوية'] || row['السجل المدني'] || row['ID'] || '').trim();
                    
                    const student = students.find(s => 
                        (nationalId && s.nationalId === nationalId) || 
                        (name && s.name.trim() === name) || 
                        (name && s.name.includes(name))
                    );

                    const scoreVal = row[meta.header];
                    const score = parseFloat(scoreVal);
                    
                    if (student && !isNaN(score)) {
                        newRecords.push({
                            id: `${student.id}_${assign.id}`, studentId: student.id, subject: selectedSubject, title: assign.title, category: assign.category,
                            score: score, maxScore: assign.maxScore, date: new Date().toISOString().split('T')[0], notes: assign.id, createdById: currentUser?.id
                        });
                    }
                });
            }
            if (newRecords.length > 0) {
                onAddPerformance(newRecords);
                alert(`تم تحديث ${newRecords.length} سجل بنجاح من ملف قوقل لكافة الطلاب المطابقين!`);
            } else {
                alert('لم يتم العثور على بيانات متطابقة للمزامنة. تأكد من تطابق الأسماء أو أرقام الهوية.');
            }
        } catch (e: any) { alert(e.message); } finally { setIsSheetSyncing(false); }
    };

    const handleFetchSheet = async () => {
        if (!googleSheetUrl) return;
        setIsFetchingStructure(true);
        try {
            saveWorksMasterUrl(googleSheetUrl);
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(googleSheetUrl);
            setWorkbookRef(workbook); setSheetNames(sheetNames);
            if (sheetNames.length > 0) setSelectedSheetName(sheetNames[0]);
        } catch (e: any) { alert(e.message); } finally { setIsFetchingStructure(false); }
    };

    useEffect(() => {
        if (workbookRef && selectedSheetName) {
            const { headers } = getSheetHeadersAndData(workbookRef, selectedSheetName);
            setAvailableHeaders(headers);
        }
    }, [selectedSheetName, workbookRef]);

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
        if (confirm('حذف التبويب سيؤدي لفصل ارتباط الأعمدة التابعة له. هل تريد الاستمرار؟')) {
            const newCats = categories.filter(c => c.id !== id);
            setCategories(newCats);
            localStorage.setItem('works_custom_categories', JSON.stringify(newCats));
        }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative overflow-hidden">
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border shadow-inner">
                        <Calendar size={16} className="text-indigo-600"/>
                        <select className="bg-transparent text-sm font-bold outline-none min-w-[120px]" value={selectedTermId} onChange={e => { setSelectedTermId(e.target.value); setSelectedPeriodId(''); }}>
                            <option value="">-- الفصل الدراسي --</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-purple-50 p-1.5 rounded-lg border border-purple-100 shadow-inner">
                        <ListFilter size={16} className="text-purple-600"/>
                        <select className="bg-transparent text-sm font-bold text-purple-700 outline-none min-w-[120px]" value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)}>
                            <option value="">-- اختر الفترة --</option>
                            {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold outline-none shadow-sm" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="">-- المادة --</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <select className="p-2 border rounded-lg bg-gray-50 text-sm font-bold outline-none shadow-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">-- الفصل --</option>
                        {Array.from(new Set(initialStudents.map(s => s.className).filter(Boolean))).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={saveAllScores} disabled={isSaving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:bg-indigo-700 transition-all active:scale-95">
                        {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <CheckCircle size={16}/>} حفظ التعديلات
                    </button>
                    {googleSheetUrl && (
                        <button onClick={handleQuickSync} disabled={isSheetSyncing} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:bg-green-700 transition-all active:scale-95">
                            {isSheetSyncing ? <RefreshCw className="animate-spin" size={16}/> : <Zap size={16}/>} تحديث من الملف
                        </button>
                    )}
                    <button onClick={() => setIsSettingsOpen(true)} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200 border shadow-sm transition-colors"><Settings size={18}/></button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="flex bg-gray-50 border-b p-1 overflow-x-auto no-scrollbar gap-1 print:hidden shadow-inner">
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === cat.id ? 'bg-white shadow text-indigo-600 border border-indigo-100' : 'text-gray-500 hover:bg-gray-100'}`}>
                            {cat.label}
                        </button>
                    ))}
                    <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-4 py-2 rounded-lg text-sm font-black transition-all whitespace-nowrap ${activeTab === 'YEAR_WORK' ? 'bg-indigo-900 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100'}`}>أعمال السنة</button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[900px]">
                        <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-30 shadow-sm">
                            <tr>
                                <th className="p-4 w-12 border-l">#</th>
                                <th className="p-4 text-right sticky right-0 bg-gray-50 z-40 w-80 border-l">اسم الطالب</th>
                                {activeTab === 'YEAR_WORK' ? (
                                    <>
                                        {categories.map(cat => <th key={cat.id} className="p-2 border-l text-xs font-black">{cat.label} ({weights[cat.id] || 0})</th>)}
                                        <th className="p-2 border-l text-green-700 text-xs font-black">الحضور ({weights.ATTENDANCE})</th>
                                        <th className="p-2 border-l bg-indigo-900 text-white font-black">المجموع</th>
                                    </>
                                ) : (
                                    <>
                                        {filteredAssignments.map(a => (
                                            <th key={a.id} className="p-3 border-l min-w-[120px] text-xs relative group">
                                                <div className="flex flex-col items-center">
                                                    <span className="font-bold">{a.title}</span>
                                                    <span className="text-[9px] text-gray-400 mt-1">({a.maxScore})</span>
                                                    {a.sourceMetadata && <div className="text-[8px] text-green-600 flex items-center gap-0.5 mt-0.5"><Sheet size={8}/> متزامن</div>}
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
                                                    <span className="truncate">{student.name}</span>
                                                </div>
                                            </td>
                                            {categories.map(cat => (
                                                <td key={cat.id} className="p-3 border-l font-bold text-gray-700">{(res as any)[cat.id] || 0}</td>
                                            ))}
                                            <td className="p-3 border-l font-bold text-green-600">{(res as any).att || 0}</td>
                                            <td className="p-3 border-l font-black text-indigo-900 bg-indigo-50/50">{(res as any).total || 0}</td>
                                        </tr>
                                    );
                                }
                                const achievement = calculateAchievement(student.id);
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 border-b transition-colors">
                                        <td className="p-3 border-l text-gray-400">{idx + 1}</td>
                                        <td className="p-3 text-right font-bold text-gray-800 sticky right-0 bg-white z-10 border-l cursor-pointer hover:text-indigo-600" onClick={() => navigate('/followup', {state: {studentId: student.id}})}>
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="truncate">{student.name}</span>
                                                <div className="flex flex-col items-center shrink-0">
                                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden mb-0.5">
                                                        <div className={`h-full transition-all ${achievement >= 90 ? 'bg-green-500' : achievement >= 50 ? 'bg-indigo-500' : 'bg-red-500'}`} style={{width: `${achievement}%`}}></div>
                                                    </div>
                                                    <span className={`text-[9px] font-black ${achievement >= 90 ? 'text-green-600' : achievement >= 50 ? 'text-indigo-600' : 'text-red-600'}`}>
                                                        {achievement}% إنجاز
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        {filteredAssignments.map(a => (
                                            <td key={a.id} className="p-0 border-l h-12">
                                                <input className="w-full h-full text-center outline-none bg-transparent focus:bg-indigo-50/50 font-bold transition-colors" value={scores[student.id]?.[a.id] || ''} onChange={e => setScores({...scores, [student.id]: {...scores[student.id], [a.id]: e.target.value}})} placeholder="-"/>
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
                        <div className="p-5 border-b bg-gray-50 flex justify-between items-center shadow-sm">
                            <h3 className="font-black text-gray-800 flex items-center gap-2"><Settings size={20}/> إعدادات السجل</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        
                        <div className="flex bg-white border-b overflow-x-auto no-scrollbar shadow-inner">
                            <button onClick={() => setSettingsTab('MANUAL')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-all ${settingsTab === 'MANUAL' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>إدارة الأعمدة</button>
                            <button onClick={() => setSettingsTab('CATEGORIES')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-all ${settingsTab === 'CATEGORIES' ? 'text-purple-600 border-b-4 border-purple-600 bg-purple-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>التبويبات المخصصة</button>
                            <button onClick={() => setSettingsTab('SHEET')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-all ${settingsTab === 'SHEET' ? 'text-green-600 border-b-4 border-green-600 bg-green-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>قوقل شيت</button>
                            <button onClick={() => setSettingsTab('WEIGHTS')} className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-all ${settingsTab === 'WEIGHTS' ? 'text-orange-600 border-b-4 border-orange-600 bg-orange-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>توزيع الأوزان</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            {settingsTab === 'MANUAL' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full">
                                            <label className="block text-xs font-black text-indigo-200 mb-1 uppercase tracking-widest">إضافة عمود يدوي لتبويب "{categories.find(c=>c.id===activeTab)?.label || activeTab}"</label>
                                            <input className="w-full p-3 bg-indigo-800/50 border-indigo-700 text-white rounded-xl placeholder:text-indigo-400 outline-none focus:ring-2 focus:ring-white/20" placeholder="مثلاً: واجب 1" value={newCol.title} onChange={e => setNewCol({...newCol, title: e.target.value})}/>
                                        </div>
                                        <div className="w-24"><label className="block text-xs font-black text-indigo-200 mb-1">الدرجة</label><input type="number" className="w-full p-3 bg-indigo-800/50 border-indigo-700 text-white rounded-xl text-center outline-none focus:ring-2 focus:ring-white/20" value={newCol.max} onChange={e => setNewCol({...newCol, max: e.target.value})}/></div>
                                        <div className="w-20"><label className="block text-xs font-black text-indigo-200 mb-1">الترتيب</label><input type="number" className="w-full p-3 bg-indigo-800/50 border-indigo-700 text-white rounded-xl text-center outline-none focus:ring-2 focus:ring-white/20" value={newCol.order} onChange={e => setNewCol({...newCol, order: e.target.value})}/></div>
                                        <button onClick={() => { 
                                            if(!newCol.title || !selectedTermId || !selectedPeriodId) return alert('أكمل البيانات واختر الفترة'); 
                                            saveAssignment({ id: Date.now().toString(), title: newCol.title, maxScore: parseFloat(newCol.max), isVisible: true, teacherId: currentUser?.id, termId: selectedTermId, periodId: selectedPeriodId, category: activeTab as any, sortOrder: parseInt(newCol.order) }); 
                                            setAssignments(getAssignments('ALL', currentUser?.id, isManager)); setNewCol({...newCol, title:'', order: (filteredAssignments.length + 1).toString()}); 
                                        }} className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-black shadow-lg hover:bg-indigo-50 transition-all active:scale-95">إضافة</button>
                                    </div>
                                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                                        <table className="w-full text-right text-sm">
                                            <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-widest border-b">
                                                <tr><th className="p-3 w-16 text-center">الترتيب</th><th className="p-3">الاسم</th><th className="p-3 w-24 text-center">الدرجة</th><th className="p-3">المصدر</th><th className="p-3 w-16">حذف</th></tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {filteredAssignments.map(a => (
                                                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="p-2 border-l"><input type="number" className="w-12 p-1 border rounded text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={a.sortOrder || 0} onChange={e => handleUpdateAssignment(a.id, { sortOrder: parseInt(e.target.value) })} /></td>
                                                        <td className="p-2"><input className="w-full p-1 border rounded font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={a.title} onChange={e => handleUpdateAssignment(a.id, { title: e.target.value })} /></td>
                                                        <td className="p-2"><input type="number" className="w-16 p-1 border rounded text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={a.maxScore} onChange={e => handleUpdateAssignment(a.id, { maxScore: parseFloat(e.target.value) })} /></td>
                                                        <td className="p-2 text-[10px] text-gray-400 font-bold">{a.sourceMetadata ? (
                                                            <span className="flex items-center gap-1 text-green-600"><Sheet size={10}/> {JSON.parse(a.sourceMetadata).header}</span>
                                                        ) : 'إضافة يدوية'}</td>
                                                        <td className="p-2"><button onClick={() => { if(confirm('حذف العمود؟')) { deleteAssignment(a.id); setAssignments(prev => prev.filter(x => x.id !== a.id)); } }} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16}/></button></td>
                                                    </tr>
                                                ))}
                                                {filteredAssignments.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-300 italic font-bold">لا توجد أعمدة في هذه الفترة.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'CATEGORIES' && (
                                <div className="space-y-6 max-w-xl mx-auto animate-fade-in">
                                    <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-4">
                                        <h4 className="font-bold text-gray-800 flex items-center gap-2"><Layout className="text-purple-600"/> إضافة تبويب مخصص جديد</h4>
                                        <div className="flex gap-2">
                                            <input className="flex-1 p-3 border rounded-xl font-bold outline-none focus:ring-2 focus:ring-purple-500" placeholder="مثلاً: مشاريع، مشاركة..." value={newCatLabel} onChange={e=>setNewCatLabel(e.target.value)}/>
                                            <button onClick={handleAddCategory} className="bg-purple-600 text-white px-6 rounded-xl font-bold shadow-lg hover:bg-purple-700 transition-all active:scale-95">إضافة التبويب</button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">التبويبات الحالية:</label>
                                        {categories.map(cat => (
                                            <div key={cat.id} className="bg-white p-4 border rounded-xl flex justify-between items-center group shadow-sm hover:border-purple-200 transition-colors">
                                                <span className="font-bold text-gray-700">{cat.label} {DEFAULT_CATEGORIES.some(c=>c.id===cat.id) && <span className="text-[10px] text-gray-300 font-normal mr-2">(أساسي)</span>}</span>
                                                {!DEFAULT_CATEGORIES.some(c=>c.id===cat.id) && <button onClick={()=>handleDeleteCategory(cat.id)} className="text-red-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'WEIGHTS' && (
                                <div className="max-w-md mx-auto space-y-4 bg-white p-6 rounded-3xl border shadow-xl animate-fade-in">
                                    <h4 className="font-black text-gray-800 flex items-center gap-2 mb-4 border-b pb-4"><PieChart className="text-orange-500"/> توزيع أوزان أعمال السنة</h4>
                                    <div className="grid grid-cols-2 gap-6">
                                        {categories.map(cat => (
                                            <div key={cat.id} className="space-y-1">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{cat.label}</label>
                                                <input type="number" className="w-full p-3 border rounded-xl font-black text-center bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all outline-none" value={weights[cat.id] || 0} onChange={e=>setWeights({...weights, [cat.id]: parseInt(e.target.value)})}/>
                                            </div>
                                        ))}
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">الحضور</label>
                                            <input type="number" className="w-full p-3 border rounded-xl font-black text-center bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 transition-all outline-none" value={weights.ATTENDANCE || 0} onChange={e=>setWeights({...weights, ATTENDANCE: parseInt(e.target.value)})}/>
                                        </div>
                                    </div>
                                    <button onClick={()=>{localStorage.setItem('works_weights', JSON.stringify(weights)); alert('تم حفظ توزيع الأوزان بنجاح!');}} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black mt-6 shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95">حفظ التوزيع</button>
                                </div>
                            )}

                            {settingsTab === 'SHEET' && (
                                <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
                                    <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-inner">
                                        <label className="block text-sm font-black text-green-800 mb-2 uppercase tracking-widest">رابط ملف قوقل شيت (للمزامنة)</label>
                                        <div className="flex gap-2">
                                            <input className="flex-1 p-3 border border-green-300 rounded-xl dir-ltr outline-none focus:ring-2 focus:ring-green-500 bg-white font-mono text-xs" value={googleSheetUrl} onChange={e => setGoogleSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                                            <button onClick={handleFetchSheet} disabled={isFetchingStructure} className="bg-green-600 text-white px-8 rounded-xl font-black shadow-lg hover:bg-green-700 active:scale-95 transition-all">
                                                {isFetchingStructure ? <Loader2 className="animate-spin" size={20}/> : 'جلب البيانات'}
                                            </button>
                                        </div>
                                    </div>
                                    {sheetNames.length > 0 && (
                                        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl animate-slide-up">
                                            <div className="p-4 bg-gray-50 border-b flex gap-4 items-center shadow-inner">
                                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest shrink-0">ورقة العمل:</span>
                                                <select className="flex-1 p-2 border rounded-lg text-sm bg-white font-bold outline-none focus:ring-2 focus:ring-green-500" value={selectedSheetName} onChange={e => setSelectedSheetName(e.target.value)}>{sheetNames.map(s => <option key={s} value={s}>{s}</option>)}</select>
                                            </div>
                                            <div className="p-4 border-b bg-amber-50 text-[10px] font-black text-amber-700 flex items-center gap-2">
                                                <CheckCircle size={14}/> اختر العمود المطلوب ربطه بـ التبويب النشط حالياً ({categories.find(c=>c.id===activeTab)?.label})
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100 custom-scrollbar">
                                                {availableHeaders.map(h => (
                                                    <div key={h} className="p-4 flex justify-between items-center bg-white hover:bg-green-50 transition-colors group">
                                                        <span className="font-bold text-gray-700 text-xs truncate max-w-[150px]">{h}</span>
                                                        <button onClick={() => {
                                                            if(!selectedTermId || !selectedPeriodId) return alert('اختر الفصل الدراسي والفترة أولاً من أعلى الصفحة');
                                                            saveAssignment({ id: Date.now().toString(), title: h, category: activeTab as any, maxScore: 10, isVisible: true, teacherId: currentUser?.id, termId: selectedTermId, periodId: selectedPeriodId, sourceMetadata: JSON.stringify({ sheet: selectedSheetName, header: h }), sortOrder: filteredAssignments.length + 1 });
                                                            setAssignments(getAssignments('ALL', currentUser?.id, isManager)); alert(`تم ربط العمود "${h}" بنجاح!`);
                                                        }} className="text-[10px] bg-green-600 text-white px-4 py-2 rounded-lg font-black shadow-md hover:bg-green-700 active:scale-95 transition-all">ربط بـ {categories.find(c=>c.id===activeTab)?.label || activeTab}</button>
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