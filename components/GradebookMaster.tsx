
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord, Assignment, SystemUser } from '../types';
import { fetchAssignments, fetchPerformance, getWorksMasterUrl, saveWorksMasterUrl, addPerformance, saveAssignment, deleteAssignment } from '../services/storageService';
import { 
    Table, Search, Download, Filter, Printer, RefreshCw, 
    ChevronLeft, ChevronRight, Star, AlertCircle, CheckCircle, TrendingUp, Save,
    Trophy, AlertTriangle, Activity, Target, Sparkles, Globe, X, Link as LinkIcon,
    LayoutGrid, ClipboardList, Settings, Database, Loader2, Plus
} from 'lucide-react';
import * as XLSX from 'xlsx';

type TabType = 'OVERVIEW' | 'QUICK_GRADE' | 'CONFIG' | 'NOOR_EXPORT';

const GradebookMaster: React.FC<{ students: Student[], performance: PerformanceRecord[], currentUser: SystemUser }> = ({ students, performance: initialPerformance, currentUser }) => {
    const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
    const [selectedClass, setSelectedClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [localPerformance, setLocalPerformance] = useState<PerformanceRecord[]>(initialPerformance);
    
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
    };

    // Fix: Added missing handleSaveCloudConfig function to save the cloud URL in storageService
    const handleSaveCloudConfig = () => {
        saveWorksMasterUrl(cloudUrl);
        alert('تم حفظ إعدادات المزامنة بنجاح');
    };

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
    
    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) {
            setSelectedClass(uniqueClasses[0] || '');
        }
    }, [uniqueClasses, selectedClass]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesClass = !selectedClass || s.className === selectedClass;
            const matchesSearch = s.name.includes(searchTerm);
            return matchesClass && matchesSearch;
        }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [students, selectedClass, searchTerm]);

    // الرؤى الذكية
    const classInsights = useMemo(() => {
        if (filteredStudents.length === 0) return null;
        const studentsTotals = filteredStudents.map(s => {
            let total = 0;
            assignments.forEach(a => {
                const rec = localPerformance.find(p => p.studentId === s.id && p.notes === a.id);
                total += rec?.score || 0;
            });
            return { name: s.name, total };
        });
        const topStudent = [...studentsTotals].sort((a,b) => b.total - a.total)[0];
        const lowStudent = [...studentsTotals].sort((a,b) => a.total - b.total)[0];
        const classAvg = studentsTotals.reduce((a,b) => a + b.total, 0) / filteredStudents.length;
        return { topStudent, lowStudent, classAvg: Math.round(classAvg) };
    }, [filteredStudents, assignments, localPerformance]);

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

    const handleExportNoor = () => {
        const assign = assignments.find(a => a.id === activeAssignmentId);
        if (!assign) return alert('اختر التقييم أولاً');
        const data = filteredStudents.map((s, idx) => {
            const rec = localPerformance.find(p => p.studentId === s.id && p.notes === assign.id);
            return { 'م': idx + 1, 'السجل المدني': s.nationalId, 'اسم الطالب': s.name, 'الدرجة': rec ? rec.score : '' };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "كشف نور");
        XLSX.writeFile(wb, `رصد_نور_${assign.title}_${selectedClass}.xlsx`);
    };

    return (
        <div className="space-y-6 page-enter font-tajawal pb-10">
            {/* Header with Tabs */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <TabBtn label="السجل الكلي" active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} icon={ClipboardList} />
                    <TabBtn label="رصد سريع" active={activeTab === 'QUICK_GRADE'} onClick={() => setActiveTab('QUICK_GRADE')} icon={Plus} />
                    <TabBtn label="تصدير نور" active={activeTab === 'NOOR_EXPORT'} onClick={() => setActiveTab('NOOR_EXPORT')} icon={Database} />
                    <TabBtn label="الإعدادات والربط" active={activeTab === 'CONFIG'} onClick={() => setActiveTab('CONFIG')} icon={Settings} />
                </div>
                
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm shrink-0">
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent font-black text-slate-800 border-none outline-none cursor-pointer px-4 hover:text-indigo-600">
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* --- OVERVIEW TAB --- */}
            {activeTab === 'OVERVIEW' && (
                <div className="space-y-6">
                    {classInsights && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
                            <InsightCard icon={Trophy} label="متصدر الفصل" value={classInsights.topStudent.name} color="yellow" />
                            <InsightCard icon={Activity} label="متوسط النقاط" value={`${classInsights.classAvg} نقطة`} color="indigo" />
                            <InsightCard icon={AlertTriangle} label="تحت المتابعة" value={classInsights.lowStudent.name} color="rose" />
                        </div>
                    )}

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col relative h-[600px]">
                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                            <div className="relative w-64">
                                <Search className="absolute right-3 top-2 text-slate-400" size={16}/>
                                <input className="w-full pr-9 pl-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500" placeholder="بحث..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                            </div>
                            <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black flex items-center gap-2"><Printer size={14}/> طباعة الكشف</button>
                        </div>
                        <div className="overflow-auto flex-1 custom-scrollbar">
                            <table className="w-full text-right border-collapse min-w-[1200px]">
                                <thead className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest sticky top-0 z-30">
                                    <tr>
                                        <th className="p-5 border-l border-white/5 w-14 text-center">#</th>
                                        <th className="p-5 border-l border-white/5 sticky right-0 bg-slate-900 z-40 w-72 shadow-xl">اسم الطالب</th>
                                        {assignments.map(a => (
                                            <th key={a.id} className="p-4 border-l border-white/5 text-center min-w-[140px]">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <span className="truncate max-w-[120px]">{a.title}</span>
                                                    <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded-full text-indigo-300">{a.maxScore}د</span>
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
                                                <td className="p-4 font-black text-slate-800 sticky right-0 bg-white z-20 border-l group-hover:bg-indigo-50/50 shadow-sm">{s.name}</td>
                                                {assignments.map(a => {
                                                    const rec = localPerformance.find(p => p.studentId === s.id && p.notes === a.id);
                                                    studentTotal += rec?.score || 0;
                                                    return (
                                                        <td key={a.id} className="p-1.5 border-l border-slate-50">
                                                            <div className={`h-10 w-full rounded-xl flex items-center justify-center font-black text-sm ${rec ? getScoreColor(rec.score, a.maxScore) : 'bg-slate-50 text-slate-200 border border-dashed'}`}>
                                                                {rec ? rec.score : '-'}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                                <td className="p-4 text-center font-black bg-slate-900 text-yellow-400">{studentTotal}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- QUICK GRADE TAB --- */}
            {activeTab === 'QUICK_GRADE' && (
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-fade-in">
                    <div className="p-6 bg-slate-50 border-b flex flex-wrap gap-6 items-end">
                        <div className="w-full md:w-80">
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">التقييم المستهدف للرصد</label>
                            <select value={activeAssignmentId} onChange={e => setActiveAssignmentId(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-2xl font-black text-sm outline-none shadow-sm focus:ring-4 focus:ring-indigo-500/5">
                                <option value="">-- اختر العمود --</option>
                                {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.maxScore} درجة)</option>)}
                            </select>
                        </div>
                        <button onClick={handleQuickSave} disabled={isSaving || !activeAssignmentId} className="px-10 py-3.5 bg-brand-500 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center gap-3">
                            {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} حفظ درجات الفصل
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto h-[500px] custom-scrollbar">
                        {activeAssignmentId ? (
                            <table className="w-full text-right">
                                <thead className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase sticky top-0 z-10 border-b">
                                    <tr><th className="p-5 w-16 text-center">م</th><th className="p-5">اسم الطالب</th><th className="p-5 text-center w-48">الدرجة</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredStudents.map((s, idx) => (
                                        <tr key={s.id} className="h-14 hover:bg-slate-50">
                                            <td className="p-4 text-center text-slate-300 font-black">{idx + 1}</td>
                                            <td className="p-4 font-black text-slate-700">{s.name}</td>
                                            <td className="p-4">
                                                <input 
                                                    type="number" 
                                                    className="w-32 mx-auto p-2.5 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-indigo-500 rounded-xl text-center font-black text-indigo-600 outline-none transition-all" 
                                                    placeholder="-"
                                                    value={bulkScores[s.id] || ''} 
                                                    onChange={e => setBulkScores({...bulkScores, [s.id]: e.target.value})}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="py-32 text-center text-slate-300 flex flex-col items-center">
                                <Plus size={64} className="mb-4 opacity-10"/>
                                <p className="font-black text-lg">اختر التقييم من القائمة أعلاه لبدء الرصد السريع</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- NOOR EXPORT TAB --- */}
            {activeTab === 'NOOR_EXPORT' && (
                <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl max-w-2xl mx-auto w-full text-center animate-zoom-in">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner"><Database size={40}/></div>
                    <h3 className="text-2xl font-black text-slate-800 mb-4">مصدّر كشوفات نظام نور</h3>
                    <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">سيقوم النظام بتوليد ملف Excel متوافق تماماً مع نظام نور للرصد المباشر.</p>
                    <div className="space-y-6 text-right mb-10">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">اختر التقييم المراد تصديره</label>
                            <select value={activeAssignmentId} onChange={e => setActiveAssignmentId(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-sm outline-none">
                                <option value="">-- اختر العمود --</option>
                                {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={handleExportNoor} className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3">
                        <Download/> تصدير الكشف (Excel)
                    </button>
                </div>
            )}

            {/* --- CONFIG TAB --- */}
            {activeTab === 'CONFIG' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up">
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 border-b pb-4"><LinkIcon className="text-indigo-600"/> مزامنة Google Sheets</h3>
                        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-start gap-4">
                            <AlertCircle className="text-indigo-600 shrink-0" size={20}/>
                            <p className="text-xs text-indigo-800 font-bold leading-relaxed">اربط سجلك بملف قوقل شيت لتتمكن من جلب الدرجات آلياً.</p>
                        </div>
                        <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 dir-ltr text-left" placeholder="رابط الملف السحابي..." value={cloudUrl} onChange={e=>setCloudUrl(e.target.value)} />
                        <button onClick={handleSaveCloudConfig} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">حفظ إعدادات المزامنة</button>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 border-b pb-4"><Table className="text-emerald-600"/> إدارة أعمدة الرصد</h3>
                        <div className="flex-1 overflow-y-auto max-h-[300px] mt-4 space-y-2 custom-scrollbar pr-2">
                             {assignments.map(a => (
                                 <div key={a.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
                                     <div>
                                         <p className="font-black text-slate-800 text-sm">{a.title}</p>
                                         <p className="text-[10px] text-slate-400 font-bold">{a.subject} • {a.maxScore} درجة</p>
                                     </div>
                                     <button onClick={async () => { if(confirm('حذف العمود؟')){ await deleteAssignment(a.id); loadData(); } }} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={18}/></button>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TabBtn = ({ label, active, onClick, icon: Icon }: any) => (
    <button onClick={onClick} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-900'}`}>
        <Icon size={16} /> {label}
    </button>
);

const InsightCard = ({ icon: Icon, label, value, color }: any) => {
    const colors: any = {
        yellow: 'bg-yellow-50 text-yellow-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        rose: 'bg-rose-50 text-rose-600'
    };
    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className={`p-4 rounded-2xl ${colors[color]}`}><Icon size={24}/></div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <h4 className="font-black text-slate-800 text-lg truncate w-40">{value}</h4>
            </div>
        </div>
    );
};

export default GradebookMaster;
