
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser } from '../types';
import { 
    Search, List, LayoutGrid, Trash2, ArrowRight, UserPlus, 
    FileSpreadsheet, Filter, MoreVertical, Download, 
    CheckCircle, ShieldCheck, ChevronLeft, ChevronRight, UserCircle, Users, Zap, Printer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StudentsProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onImportStudents: (students: Student[]) => void;
  currentUser: SystemUser | null;
}

const Students: React.FC<StudentsProps> = ({ students = [], onDeleteStudent }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const uniqueClasses = useMemo(() => 
    Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort()
  , [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
        const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (s.nationalId || '').includes(searchTerm);
        const matchesClass = !selectedClass || s.className === selectedClass;
        return matchesSearch && matchesClass;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  }, [students, searchTerm, selectedClass]);

  return (
    <div className="space-y-8 animate-fade-in font-tajawal flex flex-col h-full pb-10">
      {/* Luxury Registry Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-white p-10 rounded-[3.5rem] border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-full bg-indigo-900/5 -skew-x-12 translate-x-16"></div>
        <div className="flex items-center gap-8 relative z-10">
            <div className="p-5 bg-slate-900 text-white rounded-[2rem] shadow-2xl"><Users size={36}/></div>
            <div>
                <h2 className="text-3xl font-black text-slate-800">قاعدة البيانات الرسمية</h2>
                <p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-widest">Official Student Ledger & Registry</p>
            </div>
        </div>
        <div className="flex gap-4 relative z-10">
            <button onClick={() => navigate('/school-mgmt')} className="px-8 py-4 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-xs flex items-center gap-3 hover:bg-slate-50 transition-all shadow-sm">
                <FileSpreadsheet size={20} className="text-emerald-600"/> استيراد كتل البيانات
            </button>
            <button className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center gap-3 shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
                <UserPlus size={20}/> قيد طالب جديد
            </button>
        </div>
      </div>

      {/* Filter Ledger Bar */}
      <div className="bg-white p-8 rounded-[3rem] border shadow-sm flex flex-wrap gap-8 items-center shrink-0">
        <div className="relative flex-1 min-w-[350px]">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={24} />
            <input 
                type="text" 
                placeholder="ابحث بالاسم الرباعي، السجل المدني، أو رقم الفصل..." 
                className="w-full pr-14 pl-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-[2rem] text-sm font-black outline-none transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تصفية السجل:</span>
            <select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                className="p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-black outline-none transition-all min-w-[180px] shadow-sm"
            >
                <option value="">كافة الفصول</option>
                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all"><Printer size={20}/></button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-[4rem] border border-slate-200 shadow-2xl overflow-hidden flex-1 flex flex-col">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-right border-collapse">
                <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 z-10 h-24">
                    <tr>
                        <th className="px-10 border-l border-slate-50 w-24 text-center">م</th>
                        <th className="px-10 border-l border-slate-50">الاسم الكامل للطالب</th>
                        <th className="px-10 border-l border-slate-50 text-center">الفئة الدراسية</th>
                        <th className="px-10 border-l border-slate-50 text-center">السجل المدني</th>
                        <th className="px-10 border-l border-slate-50 text-center">رصيد XP</th>
                        <th className="px-10 text-center">خيارات السجل</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredStudents.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-indigo-50/20 transition-all group h-24">
                            <td className="px-10 text-center text-slate-300 font-mono text-[11px] border-l border-slate-50 font-black">{idx + 1}</td>
                            <td className="px-10 border-l border-slate-50">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white shadow-inner group-hover:scale-105">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-800 text-base">{student.name}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">منتظم • 2024-2025</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-10 text-center border-l border-slate-50">
                                <span className="bg-slate-100 text-slate-700 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-200">{student.className || 'غير مسكن'}</span>
                            </td>
                            <td className="px-10 text-center font-mono text-slate-400 text-xs border-l border-slate-50 tracking-tighter font-bold">{student.nationalId}</td>
                            <td className="px-10 text-center border-l border-slate-50">
                                <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-5 py-2 rounded-2xl font-black text-xs shadow-sm border border-amber-100">
                                    <Zap size={14} fill="currentColor"/> {student.xp || 0}
                                </div>
                            </td>
                            <td className="px-10">
                                <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                                    <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-4 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm" title="الملف الشامل">
                                        <UserCircle size={22}/>
                                    </button>
                                    <button onClick={() => { if(confirm('حذف الطالب نهائياً؟')) onDeleteStudent(student.id); }} className="p-4 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white rounded-2xl transition-all shadow-sm" title="حذف">
                                        <Trash2 size={22}/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredStudents.length === 0 && (
                <div className="py-48 text-center text-slate-200 flex flex-col items-center gap-8 animate-pulse">
                    <Search size={160} strokeWidth={1} />
                    <p className="text-4xl font-black">لا توجد سجلات مطابقة للبحث</p>
                </div>
            )}
          </div>
          
          <div className="bg-[#F8FAFC] p-8 border-t flex justify-between items-center px-12 shrink-0">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">إجمالي القيود المعروضة: {filteredStudents.length} طالب</p>
                <div className="flex items-center gap-3">
                    <button className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-xl border shadow-sm"><ChevronRight/></button>
                    <span className="text-[11px] font-black px-6 py-2.5 bg-slate-900 text-white rounded-xl shadow-lg">الصفحة 01</span>
                    <button className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-xl border shadow-sm"><ChevronLeft/></button>
                </div>
          </div>
      </div>
    </div>
  );
};

export default Students;
