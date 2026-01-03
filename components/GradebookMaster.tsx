
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord, Assignment, SystemUser, PerformanceCategory, Subject } from '../types';
import { fetchAssignments, fetchPerformance, getWorksMasterUrl, saveWorksMasterUrl, addPerformance, saveAssignment, deleteAssignment, getSubjects } from '../services/storageService';
import { 
    Table, Search, Download, Filter, Printer, RefreshCw, 
    ChevronLeft, ChevronRight, Star, AlertCircle, CheckCircle, TrendingUp, Save,
    Trophy, AlertTriangle, Activity, Target, Sparkles, Globe, X, Link as LinkIcon,
    LayoutGrid, ClipboardList, Settings, Database, Loader2, Plus, CalendarDays, BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';

type ViewMode = 'MASTER' | 'QUICK_GRADE' | 'CONFIG' | 'NOOR_EXPORT';

const GradebookMaster: React.FC<{ students: Student[], performance: PerformanceRecord[], currentUser: SystemUser }> = ({ students, performance: initialPerformance, currentUser }) => {
    // الواجهة الأساسية
    const [viewMode, setViewMode] = useState<ViewMode>('MASTER');
    
    // التبويبات التصنيفية والفلاتر
    const [activeCategory, setActiveCategory] = useState<PerformanceCategory>('ACTIVITY');
    const [selectedPeriod, setSelectedPeriod] = useState<'P1' | 'P2' | 'ALL'>('ALL');
    const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
    
    const [selectedClass, setSelectedClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [localPerformance, setLocalPerformance] = useState<PerformanceRecord[]>(initialPerformance);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    // Cloud Config State
    const [showCloudConfig, setShowCloudConfig] = useState(false);
    const [cloudUrl, setCloudUrl] = useState('');

    // Quick Grade State
    const [activeAssignmentId, setActiveAssignmentId] = useState('');
    const [bulkScores, setBulkScores] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        const data = await fetchAssignments(currentUser.id);
        setAssignments(data.filter(a => a.isVisible));
        setCloudUrl(getWorksMasterUrl());
        const perf = await fetchPerformance(currentUser.id);
        setLocalPerformance(perf);
        setSubjects(getSubjects(currentUser.id));
    };

    const handleSaveCloudConfig = () => {
        saveWorksMasterUrl(cloudUrl);
        setShowCloudConfig(false);
        alert('تم ربط سجل الرصد بملف Google Sheets بنجاح!');
    };

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
    
    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) {
            setSelectedClass(uniqueClasses[0] || '');
        }
    }, [uniqueClasses, selectedClass]);

    // تصفية الأعمدة (التقييمات) بناءً على التبويب والفترة
    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const matchCategory = activeCategory === 'ALL' || a.category === activeCategory;
            const matchPeriod = selectedPeriod === 'ALL' || a.periodTag === selectedPeriod;
            const matchSubject = selectedSubject === 'ALL' || a.subject === selectedSubject;
            return matchCategory && matchPeriod && matchSubject;
        }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [assignments, activeCategory, selectedPeriod, selectedSubject]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesClass = !selectedClass || s.className === selectedClass;
            const matchesSearch = s.name.includes(searchTerm);
            return matchesClass && matchesSearch;
        }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [students, selectedClass, searchTerm]);

    const handleQuickSave = async () => {
        const assign = assignments.find(a => a.id === activeAssignmentId);
        if (!assign || !selectedClass) return alert('يرجى اختيار الفصل والتقييم.');
        setIsSaving(true);
        const records: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];
        Object.entries(bulkScores).forEach(([sid, score]) => {
            if (score === '') return;
            records.push({
                id: `${sid}_${assign.id}`, studentId: sid, subject: assign.subject || 'عام', title: assign.title,
                category: assign.category, score: Number(score), maxScore: assign.maxScore,
                date: today, notes: assign.id, createdById: currentUser.id
            });
        });
        if (records.length > 0) {
            await addPerformance(records);
            setBulkScores({});
            await loadData();
            alert('تم حفظ الدرجات بنجاح.');
        }
        setIsSaving(false);
    };

    const getScoreColor = (score: number, max: number) => {
        const pct = (score / max) * 100;
        if (pct >= 90) return 'text-emerald-600 bg-emerald-50';
        if (pct >= 70) return 'text-blue-600 bg-blue-50';
        if (pct >= 50) return 'text-amber-600 bg-amber-50';
        return 'text-rose-600 bg-rose-50';
    };

    return (
        <div className="space-y-6 page-enter font-tajawal pb-10">
            {/* Header Tabs - Main Modes */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar w-full lg:w-auto">
                    <TabBtn label="السجل العام" active={viewMode === 'MASTER'} onClick={() => setViewMode('MASTER')} icon={LayoutGrid} />
                    <TabBtn label="رصد سريع" active={viewMode === 'QUICK_GRADE'} onClick={() => setViewMode('QUICK_GRADE')} icon={Plus} />
                    <TabBtn label="مزامنة Sheets" active={viewMode === 'CONFIG'} onClick={() => setViewMode('CONFIG')} icon={Globe} />
                    <TabBtn label="تصدير نور" active={viewMode === 'NOOR_EXPORT'} onClick={() => setViewMode('NOOR_EXPORT')} icon={Database} />
                </div>
                
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                    <Filter size={16} className="text-slate-400 mr-2"/>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent font-black text-slate-800 border-none outline-none cursor-pointer px-4 hover:text-indigo-600 text-sm">
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* --- MASTER VIEW --- */}
            {viewMode === 'MASTER' && (
                <div className="space-y-6">
                    {/* Sub-Tabs: Categories (الواجبات، الأنشطة...) */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <CategoryTab label="أنشطة" active={activeCategory === 'ACTIVITY'} onClick={() => setActiveCategory('ACTIVITY')} />
                            <CategoryTab label="واجبات" active={activeCategory === 'HOMEWORK'} onClick={() => setActiveCategory('HOMEWORK')} />
                            <CategoryTab label="اختبارات" active={activeCategory === 'PLATFORM_EXAM'} onClick={() => setActiveCategory('PLATFORM_EXAM')} />
                            <CategoryTab label="أعمال سنة" active={activeCategory === 'YEAR_WORK'} onClick={() => setActiveCategory('YEAR_WORK')} />
                            <CategoryTab label="الكل" active={activeCategory === 'ALL'} onClick={() => setActiveCategory('ALL')} />
                        </div>

                        <div className="flex gap-2">
                            <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} className="p-2 border rounded-xl bg-white text-[10px] font-black outline-none shadow-sm">
                                <option value="ALL">كل المواد</option>
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                            <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                                <PeriodBtn label="ف1" active={selectedPeriod === 'P1'} onClick={() => setSelectedPeriod('P1')} />
                                <PeriodBtn label="ف2" active={selectedPeriod === 'P2'} onClick={() => setSelectedPeriod('P2')} />
                                <PeriodBtn label="الكل" active={selectedPeriod === 'ALL'} onClick={() => setSelectedPeriod('ALL')} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col relative h-[650px]">
                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                            <div className="relative w-64">
                                <Search className="absolute right-3 top-2 text-slate-400" size={16}/>
                                <input className="w-full pr-9 pl-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black flex items-center gap-2"><Printer size={14}/> طباعة الكشف</button>
                                <button onClick={() => XLSX.writeFile(XLSX.utils.table_to_book(document.getElementById('master-table')), `سجل_رصد_${selectedClass}.xlsx`)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black flex items-center gap-2 shadow-md"><Download size={14}/> Excel</button>
                            </div>
                        </div>
                        <div className="overflow-auto flex-1 custom-scrollbar">
                            <table id="master-table" className="w-full text-right border-collapse min-w-[1200px]">
                                <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest sticky top-0 z-30">
                                    <tr>
                                        <th className="p-5 border-l border-white/5 w-14 text-center">م</th>
                                        <th className="p-5 border-l border-white/5 sticky right-0 bg-slate-900 z-40 w-72 shadow-xl">اسم الطالب</th>
                                        {filteredAssignments.map(a => (
                                            <th key={a.id} className="p-4 border-l border-white/5 text-center min-w-[140px]">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className="truncate max-w-[120px]">{a.title}</span>
                                                    <span className="text-[8px] font-black bg-white/10 px-2 py-0.5 rounded-full text-indigo-300">{a.maxScore} درجة • {a.periodTag || 'P1'}</span>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="p-5 bg-indigo-600 text-white text-center w-24">المجموع</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredStudents.map((s, idx) => {
                                        let studentTotal = 0;
                                        return (
                                            <tr key={s.id} className="hover:bg-indigo-50/20 h-14 group">
                                                <td className="p-4 text-center text-[10px] font-black text-slate-300 border-l">{idx + 1}</td>
                                                <td className="p-4 font-black text-slate-800 sticky right-0 bg-white z-20 border-l group-hover:bg-indigo-50/50 transition-colors shadow-sm">{s.name}</td>
                                                {filteredAssignments.map(a => {
                                                    const rec = localPerformance.find(p => p.studentId === s.id && p.notes === a.id);
                                                    studentTotal += rec?.score || 0;
                                                    return (
                                                        <td key={a.id} className="p-1.5 border-l border-slate-50">
                                                            <div className={`h-10 w-full rounded-xl flex items-center justify-center font-black text-sm transition-all ${rec ? getScoreColor(rec.score, a.maxScore) : 'bg-slate-50 text-slate-200 border border-dashed border-slate-200'}`}>
                                                                {rec ? rec.score : '-'}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-4 text-center font-black bg-slate-900 text-yellow-400 text-base">{studentTotal}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CONFIG / CLOUD VIEW --- */}
            {viewMode === 'CONFIG' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up">
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 border-b pb-4"><LinkIcon className="text-indigo-600"/> ربط Google Sheets للمزامنة</h3>
                        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-start gap-4">
                            <AlertCircle className="text-indigo-600 shrink-0" size={20}/>
                            <p className="text-xs text-indigo-800 font-bold leading-relaxed">
                                الصق رابط ملف الرصد السحابي الخاص بك. سيقوم النظام بتوزيع الدرجات من الملف على الأعمدة المطابقة آلياً.
                            </p>
                        </div>
                        <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 dir-ltr text-left" placeholder="https://docs.google.com/spreadsheets/d/..." value={cloudUrl} onChange={e=>setCloudUrl(e.target.value)} />
                        <button onClick={handleSaveCloudConfig} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">تفعيل الربط السحابي</button>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-[400px]">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 border-b pb-4"><CalendarDays className="text-emerald-600"/> إدارة وهيكلة الفترات</h3>
                        <div className="flex-1 overflow-y-auto mt-4 space-y-2 custom-scrollbar pr-2">
                             {assignments.map(a => (
                                 <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                                     <div>
                                         <p className="font-black text-slate-800 text-sm">{a.title}</p>
                                         <p className="text-[10px] text-slate-400 font-bold">{a.category} • {a.periodTag || 'فترة غير محددة'}</p>
                                     </div>
                                     <button onClick={async () => { if(confirm('حذف العمود؟')){ await deleteAssignment(a.id); loadData(); } }} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={18}/></button>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            )}

            {/* باقي الواجهات يتم تضمينها عند الطلب... */}
        </div>
    );
};

// مكونات ثانوية
const TabBtn = ({ label, active, onClick, icon: Icon }: any) => (
    <button onClick={onClick} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-900'}`}>
        <Icon size={16} /> {label}
    </button>
);

const CategoryTab = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-5 py-2 rounded-lg text-[11px] font-black transition-all ${active ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
        {label}
    </button>
);

const PeriodBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-indigo-600'}`}>
        {label}
    </button>
);

const InsightCard = ({ icon: Icon, label, value, color }: any) => {
    const colors: any = {
        yellow: 'bg-yellow-50 text-yellow-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        rose: 'bg-rose-50 text-rose-600'
    };
    return (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className={`p-3.5 rounded-2xl ${colors[color]}`}><Icon size={20}/></div>
            <div className="overflow-hidden">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <h4 className="font-black text-slate-800 text-sm truncate">{value}</h4>
            </div>
        </div>
    );
};

export default GradebookMaster;
