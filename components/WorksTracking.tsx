
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, Assignment, SystemUser, Subject, AcademicTerm } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, saveWorksMasterUrl, getWorksMasterUrl, addPerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData, guessMapping } from '../services/excelService';
import { Table, Plus, Trash2, Settings, Calendar, X, RefreshCw, Loader2, Zap, Save, Globe, Settings2, Link2, Sliders, LayoutList, CheckCircle, Database, HelpCircle, ArrowRightLeft } from 'lucide-react';
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
    const isManager = currentUser?.role === 'SCHOOL_MANAGER' || currentUser?.role === 'SUPER_ADMIN';
    const students = useMemo(() => [...initialStudents].sort((a, b) => a.name.localeCompare(b.name, 'ar')), [initialStudents]);

    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('works_active_tab') || 'HOMEWORK');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || 'عام');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 

    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'SHEET' | 'MANUAL'>('SHEET');

    // Google Sheets Sync States
    const [sheetUrl, setSheetUrl] = useState(() => getWorksMasterUrl());
    const [isFetchingSheet, setIsFetchingSheet] = useState(false);
    const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]);
    const [syncMapping, setSyncMapping] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('works_sync_mapping');
        return saved ? JSON.parse(saved) : { studentId: '', studentName: '', score: '' };
    });

    useEffect(() => {
        if (currentUser) {
            setTerms(getAcademicTerms(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
        }
    }, [currentUser, isManager, isSettingsOpen]);

    useEffect(() => {
        localStorage.setItem('works_active_tab', activeTab);
        localStorage.setItem('works_term_id', selectedTermId);
        localStorage.setItem('works_subject', selectedSubject);
        localStorage.setItem('works_class', selectedClass);
    }, [activeTab, selectedTermId, selectedSubject, selectedClass]);

    useEffect(() => {
        const newScores: Record<string, Record<string, string>> = {};
        students.forEach(s => {
            newScores[s.id] = {};
            const studentPerf = performance.filter(p => p.studentId === s.id && (p.subject === selectedSubject || selectedSubject === 'عام'));
            studentPerf.forEach(p => {
                const assign = assignments.find(a => a.id === p.notes || a.title === p.title);
                if (assign) newScores[s.id][assign.id] = p.score.toString();
            });
        });
        setScores(newScores);
    }, [students, performance, selectedSubject, assignments]);

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const categoryMatch = activeTab === 'YEAR_WORK' ? true : a.category === activeTab;
            const termMatch = !selectedTermId || a.termId === selectedTermId;
            return categoryMatch && termMatch;
        }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [assignments, activeTab, selectedTermId]);

    const uniqueClasses = useMemo(() => Array.from(new Set(initialStudents.map(s => s.className).filter(Boolean))).sort(), [initialStudents]);

    // --- ربط الملف ---
    const handleConnectSheet = async () => {
        if (!sheetUrl) return;
        setIsFetchingSheet(true);
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(sheetUrl);
            const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            setSheetHeaders(headers);
            setSheetData(data);
            saveWorksMasterUrl(sheetUrl);
            
            // محاولة تخمين الأعمدة آلياً
            const guessed = guessMapping(headers, 'PERFORMANCE');
            setSyncMapping(prev => ({ ...prev, ...guessed }));
        } catch (e) {
            alert('تعذر جلب البيانات. تأكد من أن رابط Google Sheet "عام" (Public) للجميع.');
        } finally {
            setIsFetchingSheet(false);
        }
    };

    // --- مزامنة الدرجات ---
    const handleSyncGrades = async () => {
        if (sheetData.length === 0 || !currentUser) return;
        if (!syncMapping.score) return alert('يرجى تحديد عمود "الدرجة" في الملف أولاً.');

        setIsFetchingSheet(true);
        const records: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];
        
        // البحث عن التقييم الحالي أو إنشاء واحد افتراضي للمزامنة
        let targetAssign = filteredAssignments[0];
        if (!targetAssign) {
            alert('يرجى إضافة عمود رصد أولاً في السجل ليتم وضع الدرجات فيه.');
            setIsFetchingSheet(false);
            return;
        }

        sheetData.forEach(row => {
            const rowStudentName = String(row[syncMapping.studentName] || '').trim();
            const rowStudentId = String(row[syncMapping.nationalId] || '').trim();
            const scoreVal = parseFloat(row[syncMapping.score]);

            if (isNaN(scoreVal)) return;

            // استراتيجية المطابقة: الهوية أولاً ثم الاسم
            const matchedStudent = students.find(s => 
                (rowStudentId && s.nationalId === rowStudentId) || 
                (rowStudentName && (s.name.includes(rowStudentName) || rowStudentName.includes(s.name)))
            );

            if (matchedStudent) {
                records.push({
                    id: `${matchedStudent.id}_sync_${targetAssign.id}_${Date.now()}`,
                    studentId: matchedStudent.id,
                    subject: selectedSubject,
                    title: targetAssign.title,
                    category: targetAssign.category,
                    score: scoreVal,
                    maxScore: targetAssign.maxScore,
                    date: today,
                    notes: targetAssign.id,
                    createdById: currentUser.id
                });
            }
        });

        if (records.length > 0) {
            await addPerformance(records);
            localStorage.setItem('works_sync_mapping', JSON.stringify(syncMapping));
            alert(`تمت مطابقة ${records.length} طالب وتحديث درجاتهم في السجل بنجاح!`);
            setIsSettingsOpen(false);
            window.location.reload(); // لتحديث البيانات من السحابة
        } else {
            alert('لم يتم العثور على أي طلاب في الملف يطابقون المسجلين في النظام.');
        }
        setIsFetchingSheet(false);
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in relative overflow-hidden font-tajawal">
            {/* Header Controls */}
            <div className="bg-white p-5 rounded-[2.5rem] shadow-xl border border-gray-100 mb-6 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-2xl border border-indigo-100">
                        <Calendar size={18} className="text-indigo-600"/>
                        <select className="bg-transparent text-xs font-black outline-none min-w-[120px] text-indigo-900" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                            <option value="">-- الفصل الدراسي --</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <select className="p-2.5 border rounded-2xl bg-white font-black text-xs outline-none shadow-sm min-w-[140px]" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="عام">-- المادة --</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <select className="p-2.5 border rounded-2xl bg-white font-black text-xs outline-none shadow-sm min-w-[120px]" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">-- كل الفصول --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    {sheetUrl && (
                        <button onClick={handleConnectSheet} className="p-3 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl hover:bg-emerald-100 shadow-sm transition-all" title="تحديث حـي">
                            <RefreshCw size={22} className={isFetchingSheet ? 'animate-spin' : ''}/>
                        </button>
                    )}
                    <button onClick={() => setIsSettingsOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
                        <Globe size={18}/> ربط Google Sheets
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 flex-1 overflow-hidden flex flex-col relative">
                <div className="flex bg-gray-50/50 border-b p-2 overflow-x-auto no-scrollbar gap-2 print:hidden shadow-inner">
                    {DEFAULT_CATEGORIES.map(cat => (
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
                                {activeTab !== 'YEAR_WORK' && filteredAssignments.map(a => (
                                    <th key={a.id} className="p-4 border-l border-gray-100 min-w-[150px]">
                                        <div className="flex flex-col items-center">
                                            <span className="text-slate-800 font-black text-sm">{a.title}</span>
                                            <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-black">الدرجة: {a.maxScore}</span>
                                        </div>
                                    </th>
                                ))}
                                {activeTab === 'YEAR_WORK' && (
                                    <>
                                        <th className="p-4 border-l border-gray-100">المجموع</th>
                                        <th className="p-4 border-l border-gray-100">التقدير</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {students.filter(s => !selectedClass || s.className === selectedClass).map((student, idx) => {
                                let total = 0;
                                return (
                                    <tr key={student.id} className="hover:bg-indigo-50/10 transition-colors h-16">
                                        <td className="p-3 border-l border-gray-50 text-xs text-slate-300 font-mono">{idx + 1}</td>
                                        <td className="p-3 text-right font-black text-slate-700 sticky right-0 bg-white z-10 border-l border-gray-50">{student.name}</td>
                                        {activeTab !== 'YEAR_WORK' && filteredAssignments.map(a => {
                                            const scoreVal = scores[student.id]?.[a.id] || '';
                                            total += Number(scoreVal) || 0;
                                            return (
                                                <td key={a.id} className="p-0 border-l border-gray-50 h-full">
                                                    <input 
                                                        className="w-full h-full text-center outline-none bg-transparent focus:bg-indigo-50/50 font-black text-sm text-indigo-900 border-none" 
                                                        value={scoreVal} 
                                                        onChange={e => {
                                                            const newS = {...scores};
                                                            if(!newS[student.id]) newS[student.id] = {};
                                                            newS[student.id][a.id] = e.target.value;
                                                            setScores(newS);
                                                        }} 
                                                        placeholder="-"
                                                    />
                                                </td>
                                            );
                                        })}
                                        {activeTab === 'YEAR_WORK' && (
                                            <>
                                                <td className="p-3 font-black text-indigo-600 bg-indigo-50/30">{total}</td>
                                                <td className="p-3 font-black">{total >= 90 ? 'ممتاز' : total >= 80 ? 'جيد جداً' : total >= 70 ? 'جيد' : 'مقبول'}</td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
                        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black flex items-center gap-2"><Database/> إعدادات المزامنة المتقدمة</h3>
                            <button onClick={() => setIsSettingsOpen(false)}><X/></button>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <aside className="w-64 bg-slate-50 border-l p-6 space-y-3">
                                <SidebarBtn icon={Link2} label="ربط Google Sheets" active={settingsTab==='SHEET'} onClick={()=>setSettingsTab('SHEET')}/>
                                <SidebarBtn icon={Plus} label="أعمدة رصد جديدة" active={settingsTab==='MANUAL'} onClick={()=>setSettingsTab('MANUAL')}/>
                            </aside>
                            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                                {settingsTab === 'SHEET' && (
                                    <div className="space-y-8 animate-slide-up">
                                        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                                            <h4 className="font-black text-indigo-900 mb-2 flex items-center gap-2 text-sm"><Globe size={18}/> ربط رابط الملف الحـي</h4>
                                            <p className="text-xs text-indigo-600 mb-4 font-bold">تأكد من اختيار "Anyone with the link" في خيارات المشاركة بـ Google Sheets.</p>
                                            <div className="flex gap-2">
                                                <input 
                                                    className="flex-1 p-4 rounded-2xl border-2 border-indigo-100 outline-none font-bold text-sm dir-ltr text-right" 
                                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                                    value={sheetUrl}
                                                    onChange={e=>setSheetUrl(e.target.value)}
                                                />
                                                <button onClick={handleConnectSheet} disabled={isFetchingSheet} className="bg-indigo-600 text-white px-8 rounded-2xl font-black">
                                                    {isFetchingSheet ? <Loader2 className="animate-spin"/> : 'جلب'}
                                                </button>
                                            </div>
                                        </div>

                                        {sheetHeaders.length > 0 && (
                                            <div className="space-y-6 animate-slide-up">
                                                <h4 className="font-black text-gray-800 flex items-center gap-2"><ArrowRightLeft size={18} className="text-indigo-600"/> مطابقة الأعمدة</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">المطابقة عبر (الهوية أو السجل)</label>
                                                        <select className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={syncMapping.nationalId} onChange={e=>setSyncMapping({...syncMapping, nationalId: e.target.value})}>
                                                            <option value="">-- اختر العمود --</option>
                                                            {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">المطابقة عبر (الاسم الثلاثي)</label>
                                                        <select className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={syncMapping.studentName} onChange={e=>setSyncMapping({...syncMapping, studentName: e.target.value})}>
                                                            <option value="">-- اختر العمود --</option>
                                                            {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-[10px] font-black text-indigo-400 uppercase block mb-1">عمود الدرجة المراد استيراده</label>
                                                        <select className="w-full p-4 border-2 border-indigo-100 rounded-xl font-black text-indigo-600" value={syncMapping.score} onChange={e=>setSyncMapping({...syncMapping, score: e.target.value})}>
                                                            <option value="">-- اختر عمود الدرجة من ملفك --</option>
                                                            {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                                
                                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3 items-start">
                                                    <HelpCircle className="text-amber-500 shrink-0" size={20}/>
                                                    <p className="text-[11px] text-amber-800 font-bold leading-relaxed">سيتم وضع الدرجات في أول عمود متاح في قسم "{DEFAULT_CATEGORIES.find(c=>c.id===activeTab)?.label}". إذا أردت استيراد عمود جديد، قم بإنشائه من تبويب "أعمدة رصد جديدة" أولاً.</p>
                                                </div>

                                                <button onClick={handleSyncGrades} disabled={isFetchingSheet} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl hover:bg-emerald-700 flex items-center justify-center gap-3">
                                                    <CheckCircle size={24}/> تفعيل المزامنة وتحديث السجل
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {settingsTab === 'MANUAL' && (
                                    <ManualColumnForm 
                                        onAdded={() => setAssignments(getAssignments('ALL', currentUser.id, isManager))}
                                        currentUser={currentUser}
                                        selectedTermId={selectedTermId}
                                        categories={DEFAULT_CATEGORIES}
                                    />
                                )}
                            </main>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ManualColumnForm = ({ onAdded, currentUser, selectedTermId, categories }: any) => {
    const [form, setForm] = useState({ title: '', max: '10', category: 'HOMEWORK' });
    const handleAdd = () => {
        if (!form.title || !selectedTermId) return alert('أكمل العنوان والفصل الدراسي');
        saveAssignment({
            id: `col_${Date.now()}`, title: form.title, category: form.category as any,
            maxScore: Number(form.max), isVisible: true, teacherId: currentUser.id,
            termId: selectedTermId, sortOrder: 0
        });
        onAdded(); setForm({ ...form, title: '' });
        alert('تم إضافة العمود');
    };
    return (
        <div className="space-y-6 animate-slide-up">
            <h4 className="font-black text-gray-800 mb-4">إضافة عمود تقييم يدوي</h4>
            <div className="grid grid-cols-1 gap-5">
                <div><label className="text-[10px] font-black text-gray-400 mb-1 block">عنوان العمود</label><input className="w-full p-4 border rounded-2xl bg-gray-50 font-bold" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} placeholder="مثلاً: اختبار الوحدة الأولى"/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-black text-gray-400 mb-1 block">القسم</label><select className="w-full p-4 border rounded-2xl bg-gray-50 font-bold" value={form.category} onChange={e=>setForm({...form, category: e.target.value})} >{categories.map((c:any)=><option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                    <div><label className="text-[10px] font-black text-gray-400 mb-1 block">الدرجة العظمى</label><input type="number" className="w-full p-4 border rounded-2xl bg-gray-50 font-bold" value={form.max} onChange={e=>setForm({...form, max: e.target.value})} /></div>
                </div>
                <button onClick={handleAdd} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">إدراج في السجل</button>
            </div>
        </div>
    );
};

const SidebarBtn = ({ icon: Icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white border-2 border-transparent hover:border-indigo-100'}`}>
        <Icon size={18}/> <span>{label}</span>
    </button>
);

export default WorksTracking;
