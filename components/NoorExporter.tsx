
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord, Assignment, SystemUser } from '../types';
import { getAssignments, getTeacherAssignments } from '../services/storageService';
import { FileSpreadsheet, Download, CheckCircle, AlertCircle, Info, LayoutGrid, Database, ChevronLeft } from 'lucide-react';
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
        if (!selectedClass || !selectedAssignmentId) return alert('الرجاء اختيار الفصل والتقييم المراد تصديره.');
        
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
                'ملاحظات': rec?.notes || ''
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "كشف رصد نور");
        
        // Custom formatting for Noor compatibility if needed
        const fileName = `Noor_Export_${selectedClass}_${assign.title.replace(/\s+/g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal">
            <div className="mb-10">
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                    <Database className="text-indigo-600" size={36}/> 
                    مصدّر نظام "نور" (Noor Sync)
                </h2>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">تجهيز ملفات الرصد الرسمية بضغطة زر</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-6 h-fit">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><LayoutGrid size={24}/></div>
                        <h3 className="font-black text-gray-800">إعدادات الملف</h3>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">1. الفصل الدراسي</label>
                            <select 
                                className="w-full p-4 border rounded-2xl bg-gray-50 font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                value={selectedClass}
                                onChange={e => setSelectedClass(e.target.value)}
                            >
                                <option value="">-- اختر الفصل --</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">2. التقييم المستهدف</label>
                            <select 
                                className="w-full p-4 border rounded-2xl bg-gray-50 font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                value={selectedAssignmentId}
                                onChange={e => setSelectedAssignmentId(e.target.value)}
                            >
                                <option value="">-- اختر التقييم --</option>
                                {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.category})</option>)}
                            </select>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 mt-6">
                            <h4 className="font-black text-blue-900 mb-2 flex items-center gap-2 text-sm"><Info size={16}/> نصيحة الرصد</h4>
                            <p className="text-xs text-blue-700 leading-relaxed font-medium">سيقوم النظام بتجميع الدرجات النهائية لهذا التقييم ووضعها في ملف Excel متوافق مع خيارات "الاستيراد من إكسل" في واجهة المعلم بنظام نور.</p>
                        </div>

                        <button 
                            onClick={handleExport}
                            disabled={!selectedClass || !selectedAssignmentId}
                            className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
                        >
                            <Download size={24}/> تصدير لـ Excel
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-[3rem] border shadow-sm flex flex-col overflow-hidden">
                    <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center">
                        <span className="font-black text-gray-800">معاينة بيانات الرصد</span>
                        <div className="flex gap-2">
                             <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                <CheckCircle size={14}/> {filteredStudents.length} طلاب
                             </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        {filteredStudents.length > 0 ? (
                            <table className="w-full text-right border-collapse">
                                <thead className="bg-[#F8FAFC] font-black text-[11px] text-slate-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-5 border-l w-16 text-center">م</th>
                                        <th className="p-5 border-l w-48 text-right">رقم الهوية</th>
                                        <th className="p-5 border-l">اسم الطالب</th>
                                        <th className="p-5 text-center">الدرجة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredStudents.map((s, idx) => {
                                        const rec = performance.find(p => p.studentId === s.id && (p.notes === selectedAssignmentId || (assignments.find(a=>a.id===selectedAssignmentId)?.title === p.title)));
                                        return (
                                            <tr key={s.id} className="hover:bg-indigo-50/10 transition-colors">
                                                <td className="p-4 border-l text-center text-xs text-slate-300 font-mono">{idx + 1}</td>
                                                <td className="p-4 border-l text-gray-500 font-mono text-xs">{s.nationalId || '---'}</td>
                                                <td className="p-4 border-l font-black text-slate-700">{s.name}</td>
                                                <td className="p-4 text-center font-black text-indigo-600">
                                                    {rec ? rec.score : <span className="text-red-300 opacity-50">--</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-20">
                                <FileSpreadsheet size={150} className="mb-6"/>
                                <p className="text-2xl font-black">اختر الفصل والتقييم للمعاينة</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoorExporter;
