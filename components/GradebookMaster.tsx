
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord, Assignment, SystemUser } from '../types';
import { fetchAssignments, fetchPerformance } from '../services/storageService';
import { 
    Table, Search, Download, Filter, Printer, RefreshCw, 
    ChevronLeft, ChevronRight, Star, AlertCircle, CheckCircle, TrendingUp, Save,
    Trophy, AlertTriangle, Activity, Target, Sparkles
} from 'lucide-react';
import * as XLSX from 'xlsx';

const GradebookMaster: React.FC<{ students: Student[], performance: PerformanceRecord[], currentUser: SystemUser }> = ({ students, performance, currentUser }) => {
    const [selectedClass, setSelectedClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [assignments, setAssignments] = useState<Assignment[]>([]);

    useEffect(() => {
        const load = async () => {
            const data = await fetchAssignments(currentUser.id);
            setAssignments(data.filter(a => a.isVisible));
        };
        load();
    }, [currentUser]);

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

    // حساب إحصائيات سريعة للفصل المختار
    const classInsights = useMemo(() => {
        if (filteredStudents.length === 0) return null;
        
        const studentsTotals = filteredStudents.map(s => {
            let total = 0;
            assignments.forEach(a => {
                const rec = performance.find(p => p.studentId === s.id && p.notes === a.id);
                total += rec?.score || 0;
            });
            return { name: s.name, total };
        });

        const topStudent = [...studentsTotals].sort((a,b) => b.total - a.total)[0];
        const lowStudent = [...studentsTotals].sort((a,b) => a.total - b.total)[0];
        const classAvg = studentsTotals.reduce((a,b) => a + b.total, 0) / filteredStudents.length;

        return { topStudent, lowStudent, classAvg: Math.round(classAvg) };
    }, [filteredStudents, assignments, performance]);

    const handleExport = () => {
        const data = filteredStudents.map((s, idx) => {
            const row: any = { 'م': idx + 1, 'اسم الطالب': s.name, 'الفصل': s.className };
            assignments.forEach(a => {
                const rec = performance.find(p => p.studentId === s.id && p.notes === a.id);
                row[a.title] = rec ? rec.score : '-';
            });
            return row;
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "سجل الرصد");
        XLSX.writeFile(wb, `سجل_رصد_${selectedClass}.xlsx`);
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">سجل الرصد المركزي الذكي</h1>
                    <p className="text-slate-500 text-sm mt-1">عرض شامل لكافة درجات الطلاب ومستويات الإتقان.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 flex items-center gap-2 transition-all">
                        <Download size={18}/> تصدير Excel (نور)
                    </button>
                    <button onClick={() => window.print()} className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-black flex items-center gap-2 shadow-xl transition-all">
                        <Printer size={18}/> طباعة الكشف
                    </button>
                </div>
            </div>

            {/* لوحة الرؤى السريعة */}
            {classInsights && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                        <div className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl"><Trophy size={24}/></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">متصدر الفصل</p>
                            <h4 className="font-black text-slate-800 text-lg truncate w-40">{classInsights.topStudent.name}</h4>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                        <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl"><Activity size={24}/></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">متوسط النقاط</p>
                            <h4 className="font-black text-slate-800 text-2xl">{classInsights.classAvg} <span className="text-xs text-slate-400">نقطة</span></h4>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                        <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><AlertTriangle size={24}/></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تحت المتابعة</p>
                            <h4 className="font-black text-slate-800 text-lg truncate w-40">{classInsights.lowStudent.name}</h4>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute right-4 top-3 text-slate-400" size={20} />
                    <input className="w-full pr-12 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-brand-500/5 transition-all outline-none" placeholder="ابحث عن اسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="flex-1 md:w-48 p-2.5 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black outline-none cursor-pointer hover:border-brand-500 transition-colors">
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] font-black border border-indigo-100 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                        <Table size={14}/> {assignments.length} عمود رصد
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col relative h-[650px]">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-right border-collapse min-w-[1200px]">
                        <thead className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest sticky top-0 z-30">
                            <tr>
                                <th className="p-5 border-l border-white/5 w-14 text-center">#</th>
                                <th className="p-5 border-l border-white/5 sticky right-0 bg-slate-900 z-40 w-72 shadow-xl">اسم الطالب الرباعي</th>
                                {assignments.map(a => (
                                    <th key={a.id} className="p-4 border-l border-white/5 text-center min-w-[140px]">
                                        <div className="flex flex-col gap-1 items-center">
                                            <span className="truncate max-w-[120px]">{a.title}</span>
                                            <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded-full border border-white/10 text-indigo-300">{a.maxScore} درجة</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="p-5 bg-indigo-600 text-white text-center w-24 shadow-2xl">المجموع</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map((s, idx) => {
                                let studentTotal = 0;
                                return (
                                    <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors h-16 group">
                                        <td className="p-4 text-center text-[10px] font-black text-slate-300 border-l border-slate-50">{idx + 1}</td>
                                        <td className="p-4 font-black text-slate-800 sticky right-0 bg-white z-20 border-l border-slate-50 group-hover:bg-indigo-50/50 transition-colors shadow-sm">{s.name}</td>
                                        {assignments.map(a => {
                                            const rec = performance.find(p => p.studentId === s.id && p.notes === a.id);
                                            studentTotal += rec?.score || 0;
                                            return (
                                                <td key={a.id} className="p-2 border-l border-slate-50">
                                                    <div className={`h-12 w-full rounded-xl flex items-center justify-center font-black text-sm transition-all ${rec ? getScoreColor(rec.score, a.maxScore) : 'bg-slate-50 text-slate-200 border border-dashed border-slate-200'}`}>
                                                        {rec ? rec.score : '-'}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="p-4 text-center font-black bg-slate-900 text-yellow-400 shadow-2xl text-lg">{studentTotal}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-indigo-50 p-8 rounded-[2.5rem] border border-indigo-100 flex items-center gap-6 shadow-sm">
                    <div className="p-4 bg-white rounded-3xl text-indigo-600 shadow-lg"><Sparkles size={28}/></div>
                    <div>
                        <h4 className="font-black text-indigo-900 text-xl">نظام الربط السحابي (Live)</h4>
                        <p className="text-sm text-indigo-700 font-bold opacity-80 mt-1">يتم تحديث هذه الدرجات فوراً في بوابات الطلاب وأولياء الأمور بمجرد رصدها من قبلك.</p>
                    </div>
                </div>
                <div className="bg-slate-100 p-8 rounded-[2.5rem] border border-slate-200 flex items-center justify-center text-center">
                    <p className="text-xs text-slate-500 font-black leading-relaxed italic">
                        "سجل الرصد الكلي يعطيك القوة لاتخاذ قرارات تربوية مبنية على البيانات اللحظية."
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GradebookMaster;
