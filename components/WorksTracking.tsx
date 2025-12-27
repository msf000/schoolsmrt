
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, Assignment, SystemUser, Subject, AcademicTerm } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, getTeacherAssignments } from '../services/storageService';
import { Table, Plus, Trash2, Settings, Calendar, X, RefreshCw, Loader2, Zap, ListFilter, Printer, PieChart, Sheet, Globe, Save, Layers, FileSpreadsheet, AlertCircle, Database, Settings2, Link2, Sliders, LayoutList, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

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
    const isManager = currentUser?.role === 'SCHOOL_MANAGER' || currentUser?.role === 'SUPER_ADMIN';
    
    const students = useMemo(() => {
        return [...initialStudents].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [initialStudents]);

    const [categories, setCategories] = useState<{id: string, label: string}[]>(() => {
        const saved = localStorage.getItem('works_custom_categories');
        return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    });

    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('works_active_tab') || 'HOMEWORK');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || '');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 

    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    
    const [isSaving, setIsSaving] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'CATEGORIES' | 'WEIGHTS'>('MANUAL');

    const [weights, setWeights] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('works_weights');
        return saved ? JSON.parse(saved) : { HOMEWORK: 10, ACTIVITY: 10, PLATFORM_EXAM: 20, ATTENDANCE: 5 };
    });

    const [newCol, setNewCol] = useState({ title: '', max: '10', category: 'HOMEWORK', order: '0', url: '' });

    useEffect(() => {
        if (currentUser) {
            const loadedTerms = getAcademicTerms(currentUser.id);
            setTerms(loadedTerms);
            setSubjects(getSubjects(currentUser.id));
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
            
            if (!selectedTermId && loadedTerms.length > 0) {
                const current = loadedTerms.find((t: any) => t.isCurrent) || loadedTerms[0];
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

    const activeTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const categoryMatch = activeTab === 'YEAR_WORK' ? true : a.category === activeTab;
            const termMatch = !selectedTermId || a.termId === selectedTermId;
            return categoryMatch && termMatch;
        }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [assignments, activeTab, selectedTermId]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        initialStudents.forEach(s => s.className && classes.add(s.className));
        return Array.from(classes).sort();
    }, [initialStudents]);

    const calculateYearWork = useCallback((studentId: string) => {
        const studentPerf = performance.filter(p => {
            const assign = assignments.find(a => a.id === p.notes || a.title === p.title);
            return p.studentId === studentId && 
                   p.subject === selectedSubject && 
                   (!selectedTermId || p.date >= (activeTerm?.startDate || ''));
        });
        
        const getCategoryScore = (catId: string) => {
            const activeAssigns = assignments.filter(a => a.category === catId && (!selectedTermId || a.termId === selectedTermId));
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
    }, [performance, selectedSubject, weights, attendance, assignments, categories, selectedTermId, activeTerm]);

    const handleAddManualCol = () => {
        if (!newCol.title || !selectedTermId || !currentUser) return alert('أكمل البيانات المطلوبة');
        const assign: Assignment = {
            id: `manual_${Date.now()}`,
            title: newCol.title,
            category: newCol.category as any,
            maxScore: Number(newCol.max),
            isVisible: true,
            teacherId: currentUser.id,
            termId: selectedTermId,
            sortOrder: Number(newCol.order)
        };
        saveAssignment(assign);
        setAssignments(getAssignments('ALL', currentUser.id, isManager));
        setNewCol({ ...newCol, title: '' });
        alert('تمت إضافة عمود الرصد');
    };

    const saveAllScores = async () => {
        if (!selectedSubject) return alert('اختر المادة أولاً');
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
            setTimeout(() => { setIsSaving(false); alert('تم حفظ الدرجات وتحديث السجل.'); }, 500);
        } else {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in relative overflow-hidden font-tajawal">
            {/* Header Controls */}
            <div className="bg-white p-5 rounded-[2.5rem] shadow-xl border border-gray-100 mb-6 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-indigo-50/50 p-2.5 rounded-2xl border border-indigo-100">
                        <Calendar size={18} className="text-indigo-600"/>
                        <select className="bg-transparent text-xs font-black outline-none min-w-[150px] text-indigo-900" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                            <option value="">-- الفصل الدراسي --</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <select className="p-2.5 border rounded-2xl bg-white font-black text-xs outline-none shadow-sm min-w-[150px]" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="">-- المادة الدراسية --</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <select className="p-2.5 border rounded-2xl bg-white font-black text-xs outline-none shadow-sm min-w-[120px]" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">-- كل الفصول --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={saveAllScores} disabled={isSaving} className="flex-1 md:flex-none bg-indigo-900 text-white px-8 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-950 active:scale-95 transition-all">
                        {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} حفظ التعديلات
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white text-gray-400 border-2 border-gray-50 rounded-2xl hover:text-indigo-600 shadow-sm transition-all"><Settings size={22}/></button>
                </div>
            </div>

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
                                <th className="p-4 text-right sticky right-0 bg-[#F8FAFC] z-40 w-80 border-l border-gray-50 shadow-sm">اسم الطالب</th>
                                {activeTab === 'YEAR_WORK' ? (
                                    <>
                                        {categories.map(cat => <th key={cat.id} className="p-2 border-l border-gray-50 text-indigo-900 font-black">{cat.label} ({weights[cat.id] || 0})</th>)}
                                        <th className="p-2 border-l border-gray-50 text-emerald-700 font-black">المواظبة ({weights.ATTENDANCE})</th>
                                        <th className="p-2 border-l border-gray-50 bg-indigo-50 text-indigo-950 font-black text-lg">المجموع</th>
                                    </>
                                ) : (
                                    filteredAssignments.map(a => (
                                        <th key={a.id} className="p-4 border-l border-gray-100 min-w-[150px]">
                                            <div className="flex flex-col items-center">
                                                <span className="text-slate-800 font-black text-sm">{a.title}</span>
                                                <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-black">الدرجة: {a.maxScore}</span>
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
                                return (
                                    <tr key={student.id} className="hover:bg-indigo-50/10 transition-colors h-16">
                                        <td className="p-3 border-l border-gray-50 text-xs text-slate-300 font-mono">{idx + 1}</td>
                                        <td className="p-3 text-right font-black text-slate-700 sticky right-0 bg-white z-10 border-l border-gray-50 cursor-pointer" onClick={() => navigate('/followup', {state: {studentId: student.id}})}>
                                            <span className="truncate">{student.name}</span>
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
                </div>
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
                        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black flex items-center gap-2"><Settings2/> إعدادات سجل الرصد</h3>
                            <button onClick={() => setIsSettingsOpen(false)}><X/></button>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <aside className="w-56 bg-slate-50 border-l p-4 space-y-2">
                                <SidebarBtn icon={Plus} label="إضافة أعمدة" active={settingsTab==='MANUAL'} onClick={()=>setSettingsTab('MANUAL')}/>
                                <SidebarBtn icon={Sliders} label="توزيع الأوزان" active={settingsTab==='WEIGHTS'} onClick={()=>setSettingsTab('WEIGHTS')}/>
                                <SidebarBtn icon={LayoutList} label="الأقسام" active={settingsTab==='CATEGORIES'} onClick={()=>setSettingsTab('CATEGORIES')}/>
                            </aside>
                            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                                {settingsTab === 'MANUAL' && (
                                    <div className="space-y-6">
                                        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-black text-indigo-400 mb-1 block">عنوان التقييم</label>
                                                <input className="w-full p-3 rounded-xl border border-indigo-200 outline-none font-bold" value={newCol.title} onChange={e=>setNewCol({...newCol, title: e.target.value})}/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-indigo-400 mb-1 block">القسم</label>
                                                <select className="w-full p-3 rounded-xl border border-indigo-200 font-bold" value={newCol.category} onChange={e=>setNewCol({...newCol, category: e.target.value})}>
                                                    {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-indigo-400 mb-1 block">الدرجة</label>
                                                <input type="number" className="w-full p-3 rounded-xl border border-indigo-200 font-bold" value={newCol.max} onChange={e=>setNewCol({...newCol, max: e.target.value})}/>
                                            </div>
                                            <button onClick={handleAddManualCol} className="col-span-2 py-4 bg-indigo-600 text-white rounded-2xl font-black">إدراج في السجل</button>
                                        </div>
                                    </div>
                                )}
                                {settingsTab === 'WEIGHTS' && (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-400 font-bold mb-4">حدد الوزن النسبي لكل قسم في المجموع النهائي (أعمال السنة).</p>
                                        {categories.map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between p-4 border rounded-2xl">
                                                <span className="font-bold">{cat.label}</span>
                                                <input type="number" className="w-20 p-2 border rounded-xl text-center font-black text-indigo-600" value={weights[cat.id] || 0} onChange={e=>{
                                                    const nw = {...weights, [cat.id]: Number(e.target.value)};
                                                    setWeights(nw); localStorage.setItem('works_weights', JSON.stringify(nw));
                                                }}/>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </main>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SidebarBtn = ({ icon: Icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black transition-all ${active ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-white'}`}>
        <Icon size={18}/> <span>{label}</span>
    </button>
);

export default WorksTracking;
