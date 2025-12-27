
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, Assignment, SystemUser, Subject, AcademicTerm } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, saveWorksMasterUrl, getWorksMasterUrl, addPerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { 
    Plus, Trash2, RefreshCw, Loader2, Globe, Link2, 
    ArrowRightLeft, CheckCircle, Database, Settings2, 
    ChevronUp, ChevronDown, Save, ExternalLink, ListFilter, LayoutGrid
} from 'lucide-react';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const CATEGORIES = [
    { id: 'HOMEWORK', label: 'الواجبات' },
    { id: 'ACTIVITY', label: 'الأنشطة' },
    { id: 'PLATFORM_EXAM', label: 'الاختبارات' }
];

const WorksTracking: React.FC<WorksTrackingProps> = ({ students: initialStudents, performance, currentUser }) => {
    const isManager = currentUser?.role === 'SCHOOL_MANAGER' || currentUser?.role === 'SUPER_ADMIN';
    const students = useMemo(() => [...initialStudents].sort((a, b) => a.name.localeCompare(b.name, 'ar')), [initialStudents]);

    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('works_active_tab') || 'HOMEWORK');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || 'عام');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 

    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    // Google Sheets States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [sheetUrl, setSheetUrl] = useState(() => getWorksMasterUrl());
    const [isFetchingSheet, setIsFetchingSheet] = useState(false);
    const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]);
    
    // Mapping for matching students
    const [idHeader, setIdHeader] = useState('');
    const [nameHeader, setNameHeader] = useState('');

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

    const filteredAssignments = useMemo(() => {
        return assignments
            .filter(a => a.category === activeTab && (!selectedTermId || a.termId === selectedTermId))
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [assignments, activeTab, selectedTermId]);

    const uniqueClasses = useMemo(() => Array.from(new Set(initialStudents.map(s => s.className).filter(Boolean))).sort(), [initialStudents]);

    // --- وظائف إدارة الأعمدة ---
    const handleAddColumn = async () => {
        if (!currentUser || !selectedTermId) return alert('يرجى اختيار الفصل الدراسي أولاً');
        const title = prompt('أدخل عنوان العمود الجديد:');
        if (!title) return;
        const max = prompt('الدرجة العظمى:', '10');
        
        const newAssign: Assignment = {
            id: `col_${Date.now()}`,
            title,
            category: activeTab as any,
            maxScore: Number(max) || 10,
            isVisible: true,
            teacherId: currentUser.id,
            termId: selectedTermId,
            sortOrder: assignments.length
        };
        await saveAssignment(newAssign);
        setAssignments(getAssignments('ALL', currentUser.id, isManager));
    };

    const handleDeleteColumn = async (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذا العمود وكافة درجاته؟') && currentUser) {
            await deleteAssignment(id, currentUser.id);
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
        }
    };

    const handleUpdateColumn = async (assign: Assignment, updates: Partial<Assignment>) => {
        await saveAssignment({ ...assign, ...updates });
        setAssignments(getAssignments('ALL', currentUser?.id, isManager));
    };

    // --- ربط الملف وجلب الترويسات ---
    const handleConnectSheet = async () => {
        if (!sheetUrl) return;
        setIsFetchingSheet(true);
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(sheetUrl);
            const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            setSheetHeaders(headers);
            setSheetData(data);
            saveWorksMasterUrl(sheetUrl);
            
            // محاولة تخمين أعمدة الهوية والاسم
            setIdHeader(headers.find(h => h.includes('هوية') || h.includes('سجل') || h.includes('ID')) || '');
            setNameHeader(headers.find(h => h.includes('اسم') || h.includes('Name')) || '');
        } catch (e) {
            alert('تعذر جلب البيانات. تأكد من أن الرابط "عام".');
        } finally {
            setIsFetchingSheet(false);
        }
    };

    // --- المزامنة الكلية للتبويب ---
    const handleSyncTab = async () => {
        if (!sheetData.length || !currentUser) return;
        if (!idHeader && !nameHeader) return alert('يرجى تحديد أعمدة المطابقة أولاً (هوية أو اسم)');

        setIsFetchingSheet(true);
        let totalSynced = 0;
        const allRecords: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];

        // المزامنة لكل عمود تم ربطه بترويسة في الملف
        for (const assign of filteredAssignments) {
            if (!assign.url) continue; // url هنا نستخدمها لتخزين اسم الترويسة في Excel

            sheetData.forEach(row => {
                const rowId = String(row[idHeader] || '').trim();
                const rowName = String(row[nameHeader] || '').trim();
                const scoreVal = parseFloat(row[assign.url || '']);

                if (isNaN(scoreVal)) return;

                const matchedStudent = students.find(s => 
                    (idHeader && s.nationalId === rowId) || 
                    (nameHeader && (s.name.includes(rowName) || rowName.includes(s.name)))
                );

                if (matchedStudent) {
                    allRecords.push({
                        id: `${matchedStudent.id}_${assign.id}`,
                        studentId: matchedStudent.id,
                        subject: selectedSubject,
                        title: assign.title,
                        category: assign.category,
                        score: scoreVal,
                        maxScore: assign.maxScore,
                        date: today,
                        notes: assign.id,
                        createdById: currentUser.id
                    });
                }
            });
        }

        if (allRecords.length > 0) {
            await addPerformance(allRecords);
            alert(`تم تحديث رصد ${allRecords.length} درجات في هذا التبويب!`);
            setIsSettingsOpen(false);
            window.location.reload();
        } else {
            alert('لم يتم العثور على درجات مطابقة للمزامنة.');
        }
        setIsFetchingSheet(false);
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal">
            {/* واجهة التحكم العلوية */}
            <div className="bg-white p-5 rounded-[2.5rem] shadow-xl border border-gray-100 mb-6 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <select className="p-2.5 border rounded-2xl bg-slate-50 font-black text-xs outline-none" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                        <option value="">-- الفصل الدراسي --</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <select className="p-2.5 border rounded-2xl bg-slate-50 font-black text-xs outline-none" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="عام">-- المادة --</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <select className="p-2.5 border rounded-2xl bg-slate-50 font-black text-xs outline-none" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">-- كل الفصول --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleAddColumn} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm" title="إضافة عمود رصد">
                        <Plus size={20}/>
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition-all">
                        <Settings2 size={18}/> إعدادات الربط والترتيب
                    </button>
                </div>
            </div>

            {/* الجدول الرئيسي */}
            <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 flex-1 overflow-hidden flex flex-col relative">
                <div className="flex bg-gray-50/50 border-b p-2 overflow-x-auto no-scrollbar gap-2 shadow-inner">
                    {CATEGORIES.map(cat => (
                        <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`px-10 py-3.5 rounded-2xl text-xs font-black transition-all ${activeTab === cat.id ? 'bg-white shadow-xl text-indigo-600 border border-indigo-100 scale-105' : 'text-gray-400 hover:bg-white/50'}`}>
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[1000px]">
                        <thead className="bg-[#F8FAFC] sticky top-0 z-30 border-b">
                            <tr className="text-[11px] text-slate-400 font-black h-16 uppercase tracking-widest">
                                <th className="p-4 w-16 border-l border-gray-50">م</th>
                                <th className="p-4 text-right sticky right-0 bg-[#F8FAFC] z-40 w-72 border-l border-gray-50 shadow-sm">اسم الطالب</th>
                                {filteredAssignments.map(a => (
                                    <th key={a.id} className="p-4 border-l border-gray-100 min-w-[120px] group">
                                        <div className="flex flex-col items-center relative">
                                            <span className="text-slate-800 font-black text-sm">{a.title}</span>
                                            <span className="text-[9px] text-slate-400">/{a.maxScore}</span>
                                            <button onClick={() => handleDeleteColumn(a.id)} className="absolute -top-2 -right-2 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"><Trash2 size={12}/></button>
                                        </div>
                                    </th>
                                ))}
                                <th className="p-4 bg-indigo-50 text-indigo-600 font-black text-xs">المجموع</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {students.filter(s => !selectedClass || s.className === selectedClass).map((student, idx) => {
                                let total = 0;
                                return (
                                    <tr key={student.id} className="hover:bg-indigo-50/10 transition-colors h-14">
                                        <td className="p-3 border-l border-gray-50 text-xs text-slate-300 font-mono">{idx + 1}</td>
                                        <td className="p-3 text-right font-black text-slate-700 sticky right-0 bg-white z-10 border-l border-gray-50 shadow-sm">{student.name}</td>
                                        {filteredAssignments.map(a => {
                                            const record = performance.find(p => p.studentId === student.id && (p.notes === a.id || p.title === a.title));
                                            const score = record?.score ?? 0;
                                            total += score;
                                            return (
                                                <td key={a.id} className="p-0 border-l border-gray-50 h-full">
                                                    <span className={`font-black text-sm ${score > 0 ? 'text-indigo-900' : 'text-slate-200'}`}>{score || '-'}</span>
                                                </td>
                                            );
                                        })}
                                        <td className="p-3 font-black text-indigo-600 bg-indigo-50/30">{total}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* مودال الإعدادات والربط والترتيب */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
                        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-black flex items-center gap-3"><Settings2/> إعدادات التبويب: {CATEGORIES.find(c=>c.id===activeTab)?.label}</h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><Trash2 className="rotate-45"/></button>
                        </div>
                        
                        <div className="flex-1 flex overflow-hidden">
                            {/* جانب الربط مع Google Sheets */}
                            <div className="w-1/3 border-l bg-slate-50 p-8 overflow-y-auto custom-scrollbar">
                                <h4 className="font-black text-indigo-900 mb-6 flex items-center gap-2"><Globe size={18}/> ربط ملف الرصد</h4>
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">رابط ملف Excel / Google Sheets</label>
                                        <div className="flex gap-2">
                                            <input className="flex-1 p-3 border rounded-xl text-xs dir-ltr outline-none focus:ring-2 focus:ring-indigo-500" value={sheetUrl} onChange={e=>setSheetUrl(e.target.value)} placeholder="https://..." />
                                            <button onClick={handleConnectSheet} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg">
                                                {isFetchingSheet ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                                            </button>
                                        </div>
                                    </div>

                                    {sheetHeaders.length > 0 && (
                                        <div className="space-y-4 animate-slide-up bg-white p-5 rounded-3xl border border-indigo-100 shadow-sm">
                                            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs mb-4"><ArrowRightLeft size={16}/> مطابقة الطلاب</div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 mb-1">عمود الهوية</label>
                                                <select className="w-full p-2 border rounded-lg text-xs font-bold" value={idHeader} onChange={e=>setIdHeader(e.target.value)}>
                                                    <option value="">-- اختر --</option>
                                                    {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 mb-1">عمود الاسم</label>
                                                <select className="w-full p-2 border rounded-lg text-xs font-bold" value={nameHeader} onChange={e=>setNameHeader(e.target.value)}>
                                                    <option value="">-- اختر --</option>
                                                    {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </div>
                                            <button onClick={handleSyncTab} disabled={isFetchingSheet} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 mt-4">
                                                <Database size={18}/> مزامنة التبويب بالكامل
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* جانب إدارة الأعمدة وترتيبها */}
                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-center mb-8 border-b pb-4">
                                    <h4 className="font-black text-slate-800 flex items-center gap-2"><LayoutGrid size={18} className="text-indigo-600"/> تخصيص أعمدة التبويب</h4>
                                    <button onClick={handleAddColumn} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black hover:bg-indigo-100 transition-all flex items-center gap-2"><Plus size={14}/> إضافة عمود</button>
                                </div>

                                <div className="space-y-3">
                                    {filteredAssignments.map((a, idx) => (
                                        <div key={a.id} className="bg-white border rounded-3xl p-5 shadow-sm flex items-center gap-6 hover:border-indigo-300 transition-all group">
                                            <div className="flex flex-col gap-1">
                                                <button onClick={() => handleUpdateColumn(a, { sortOrder: (a.sortOrder || 0) - 1 })} className="text-slate-300 hover:text-indigo-600"><ChevronUp size={16}/></button>
                                                <button onClick={() => handleUpdateColumn(a, { sortOrder: (a.sortOrder || 0) + 1 })} className="text-slate-300 hover:text-indigo-600"><ChevronDown size={16}/></button>
                                            </div>
                                            
                                            <div className="flex-1">
                                                <input className="font-black text-slate-800 bg-transparent border-none outline-none w-full" value={a.title} onChange={e=>handleUpdateColumn(a, {title: e.target.value})} />
                                                <div className="flex items-center gap-4 mt-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-slate-400">الدرجة:</span>
                                                        <input type="number" className="w-12 bg-slate-50 border rounded px-1 text-[10px] font-black" value={a.maxScore} onChange={e=>handleUpdateColumn(a, {maxScore: Number(e.target.value)})} />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="w-48">
                                                <label className="block text-[8px] font-black text-indigo-400 uppercase mb-1">الربط بعمود Excel</label>
                                                <select className="w-full p-2 border rounded-xl text-[10px] font-black bg-slate-50" value={a.url || ''} onChange={e=>handleUpdateColumn(a, {url: e.target.value})}>
                                                    <option value="">-- بلا ربط --</option>
                                                    {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </div>

                                            <button onClick={()=>handleDeleteColumn(a.id)} className="p-3 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                                        </div>
                                    ))}
                                    {filteredAssignments.length === 0 && (
                                        <div className="py-20 text-center text-slate-300 italic flex flex-col items-center gap-4">
                                            <LayoutGrid size={48} className="opacity-10"/>
                                            <p>لا توجد أعمدة في هذا التبويب حالياً</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
