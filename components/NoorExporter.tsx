
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord, Assignment, SystemUser } from '../types';
import { getAssignments, getTeacherAssignments } from '../services/storageService';
import { FileSpreadsheet, Download, CheckCircle, Info, Database, LayoutGrid } from 'lucide-react';
import * as XLSX from 'xlsx';

interface NoorExporterProps {
    students: Student[];
    performance: PerformanceRecord[];
    currentUser: SystemUser;
}

const NoorExporter: React.FC<NoorExporterProps> = ({ students, performance, currentUser }) => {
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
    const [assignments, setAssignments] = useState<Assignment[]>([]);

    useEffect(() => {
        setAssignments(getAssignments('ALL', currentUser.id, true));
    }, [currentUser]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUser]);

    const filteredStudents = useMemo(() => {
        if (!selectedClass) return [];
        return students.filter(s => s.className === selectedClass).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [students, selectedClass]);

    const handleExport = () => {
        if (!selectedClass || !selectedAssignmentId) return alert('الرجاء اختيار الفصل والتقييم.');
        
        const assign = assignments.find(a => a.id === selectedAssignmentId);
        if (!assign) return;

        const data = filteredStudents.map((s, idx) => {
            const rec = performance.find(p => p.studentId === s.id && (p.notes === assign.id || p.title === assign.title));
            return {
                'م': idx + 1,
                'رقم الهوية': s.nationalId || '',
                'اسم الطالب': s.name,
                'الدرجة': rec?.score ?? '',
                'الدرجة القصوى': assign.maxScore,
                'التاريخ': rec?.date || ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "نظام نور");
        XLSX.writeFile(wb, `Noor_Export_${selectedClass}_${assign.title}.xlsx`);
    };

    return (
        <div className="p-6 md:p-10 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal">
            <div className="mb-10">
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                    <Database className="text-indigo-600" size={36}/> مصدّر نظام نور
                </h2>
                <p className="text-sm text-gray-400 font-bold uppercase mt-1 tracking-widest">تجهيز ملفات الرصد الرسمية آلياً</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 flex-1 overflow-hidden">
                <div className="bg-white p-10 rounded-[3rem] border shadow-sm flex flex-col gap-8 h-fit">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">1. اختر الفصل الدراسي</label>
                            <select className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                                <option value="">-- اختر --</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">2. اختر التقييم للتصدير</label>
                            <select className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none" value={selectedAssignmentId} onChange={e => setSelectedAssignmentId(e.target.value)}>
                                <option value="">-- اختر --</option>
                                {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.category})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex gap-4">
                        <Info className="text-indigo-600 shrink-0"/>
                        <p className="text-xs text-indigo-800 leading-relaxed font-medium">سيتم توليد ملف Excel يحتوي على درجات الطلاب المسجلة في هذا التقييم، وجاهز للاستيراد المباشر في لوحة المعلم بنظام نور.</p>
                    </div>
                    <button onClick={handleExport} disabled={!selectedClass || !selectedAssignmentId} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"><Download/> تصدير كشف نور</button>
                </div>

                <div className="lg:col-span-2 bg-white rounded-[3.5rem] border shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center"><span className="font-black text-gray-800">معاينة كشف الرصد</span><span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">جاهز للتصدير</span></div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {filteredStudents.length > 0 ? (
                            <table className="w-full text-right border-collapse">
                                <thead className="bg-[#F8FAFC] font-black text-[11px] text-slate-400 uppercase tracking-widest sticky top-0 z-10 border-b">
                                    <tr><th className="p-5 border-l w-16 text-center">م</th><th className="p-5 border-l">اسم الطالب</th><th className="p-5 text-center">الدرجة</th></tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStudents.map((s, idx) => {
                                        const rec = performance.find(p => p.studentId === s.id && (p.notes === selectedAssignmentId || p.title === assignments.find(a=>a.id===selectedAssignmentId)?.title));
                                        return (
                                            <tr key={s.id} className="hover:bg-indigo-50/10 transition-colors h-14">
                                                <td className="p-4 border-l text-center text-xs text-slate-300 font-mono">{idx + 1}</td>
                                                <td className="p-4 border-l font-black text-slate-700">{s.name}</td>
                                                <td className="p-4 text-center font-black text-indigo-600">{rec ? rec.score : '--'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-20"><FileSpreadsheet size={150} className="mb-6"/><p className="text-2xl font-black">اختر الفصل والمعايير للمعاينة</p></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoorExporter;
