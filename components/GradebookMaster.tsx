
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord, Assignment, SystemUser } from '../types';
import { fetchAssignments, fetchPerformance } from '../services/storageService';
import { 
    Table, Search, Download, Filter, Printer, RefreshCw, 
    ChevronLeft, ChevronRight, Star, AlertCircle, CheckCircle, TrendingUp, Save
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

    return (
        <div className="space-y-6 page-enter font-tajawal">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">سجل رصد أعمال السنة</h1>
                    <p className="text-slate-500 text-sm">عرض كلي وشامل لكافة التقييمات والدرجات المرصودة.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all">
                        <Download size={18}/> تصدير لـ Excel
                    </button>
                    <button onClick={() => window.print()} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-black hover:bg-black flex items-center gap-2 transition-all">
                        <Printer size={18}/> طباعة الكشف
                    </button>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                    <input className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white transition-all outline-none" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                </div>
                <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="w-full md:w-48 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none cursor-pointer">
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-[10px] font-black border border-indigo-100 uppercase tracking-widest">
                    <Table size={14}/> {assignments.length} تقييمات نشطة
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col relative h-[600px]">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-right border-collapse min-w-[1000px]">
                        <thead className="bg-slate-50 border-b text-[11px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="p-4 border-l border-slate-100 w-12 text-center">م</th>
                                <th className="p-4 border-l border-slate-100 sticky right-0 bg-slate-50 z-30 w-64 text-slate-900 border-r border-slate-200 shadow-inner">اسم الطالب</th>
                                {assignments.map(a => (
                                    <th key={a.id} className="p-4 border-l border-slate-100 text-center min-w-[120px]">
                                        <div className="flex flex-col gap-1 items-center">
                                            <span className="text-slate-700 truncate max-w-[100px]">{a.title}</span>
                                            <span className="text-[9px] font-black bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-400">{a.maxScore}د</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="p-4 bg-slate-900 text-white text-center w-24">المجموع</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map((s, idx) => {
                                let studentTotal = 0;
                                return (
                                    <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors h-14">
                                        <td className="p-4 text-center text-[10px] font-black text-slate-300 border-l border-slate-50">{idx + 1}</td>
                                        <td className="p-4 font-black text-slate-800 sticky right-0 bg-white z-10 border-l border-slate-50 shadow-sm">{s.name}</td>
                                        {assignments.map(a => {
                                            const rec = performance.find(p => p.studentId === s.id && p.notes === a.id);
                                            studentTotal += rec?.score || 0;
                                            return (
                                                <td key={a.id} className="p-4 text-center border-l border-slate-50">
                                                    <span className={`font-black ${rec ? 'text-brand-600' : 'text-slate-200'}`}>{rec ? rec.score : '-'}</span>
                                                </td>
                                            );
                                        })}
                                        <td className="p-4 text-center font-black bg-slate-900 text-brand-400 shadow-inner">{studentTotal}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl text-indigo-600 shadow-sm"><TrendingUp size={24}/></div>
                    <div>
                        <h4 className="font-black text-indigo-900">معدل الإنجاز العام</h4>
                        <p className="text-xs text-indigo-700 font-bold">تم رصد 85% من التقييمات لهذا الشهر</p>
                    </div>
                </div>
                <div className="md:col-span-2 bg-slate-50 p-6 rounded-3xl border border-slate-200 flex items-center justify-center">
                    <p className="text-xs text-slate-400 font-bold italic">نصيحة: يمكنك النقر على زر التصدير لتحميل الكشف بتنسيق يتناسب مع نظام نور الرسمي.</p>
                </div>
            </div>
        </div>
    );
};

export default GradebookMaster;
