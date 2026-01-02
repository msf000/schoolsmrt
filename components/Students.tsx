
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser } from '../types';
import { 
    Search, List, LayoutGrid, Trash2, ArrowRight, UserPlus, 
    FileSpreadsheet, Filter, MoreVertical, Download, 
    CheckCircle, ShieldCheck, ChevronLeft, ChevronRight, UserCircle, Users, Zap, Printer, X
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
    <div className="space-y-6 lg:space-y-8 animate-fade-in font-tajawal flex flex-col h-full pb-24 lg:pb-10">
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 lg:p-10 rounded-[2.5rem] lg:rounded-[3.5rem] border shadow-sm relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-32 h-full bg-slate-900/5 -skew-x-12 translate-x-16"></div>
        <div className="flex items-center gap-4 lg:gap-8 relative z-10 w-full lg:w-auto">
            <div className="p-4 lg:p-5 bg-slate-900 text-white rounded-2xl lg:rounded-[2rem] shadow-2xl shrink-0"><Users size={32}/></div>
            <div>
                <h2 className="text-2xl lg:text-3xl font-black text-slate-800">قاعدة البيانات الرسمية</h2>
                <p className="text-slate-400 font-bold mt-1 uppercase text-[9px] lg:text-[10px] tracking-widest">Official Student Ledger & Registry</p>
            </div>
        </div>
        <div className="flex gap-3 relative z-10 w-full lg:w-auto">
            <button onClick={() => navigate('/school-mgmt')} className="flex-1 lg:flex-none px-4 lg:px-8 py-3.5 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm">
                <FileSpreadsheet size={18} className="text-emerald-600"/> <span className="hidden sm:inline">استيراد كتل البيانات</span><span className="sm:hidden">استيراد</span>
            </button>
            <button className="flex-1 lg:flex-none px-4 lg:px-10 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                <UserPlus size={18}/> <span className="hidden sm:inline">قيد طالب جديد</span><span className="sm:hidden">إضافة طالب</span>
            </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 lg:p-8 rounded-3xl lg:rounded-[3rem] border shadow-sm flex flex-col lg:flex-row gap-4 lg:gap-8 items-center shrink-0">
        <div className="relative w-full lg:flex-1">
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
                type="text" 
                placeholder="ابحث بالاسم، السجل، أو رقم الفصل..." 
                className="w-full pr-14 pl-6 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl lg:rounded-[2rem] text-sm font-black outline-none transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
            <select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                className="flex-1 lg:flex-none p-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-black outline-none transition-all min-w-[140px] shadow-sm"
            >
                <option value="">كافة الفصول</option>
                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="p-3.5 bg-slate-100 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all"><Printer size={20}/></button>
        </div>
      </div>

      {/* Main Ledger Display */}
      <div className="flex-1 bg-white rounded-[3rem] lg:rounded-[4rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-auto custom-scrollbar">
            {/* Desktop Table View */}
            <table className="hidden lg:table w-full text-right border-collapse">
                <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 z-10 h-20">
                    <tr>
                        <th className="px-10 border-l border-slate-50 w-24 text-center">م</th>
                        <th className="px-10 border-l border-slate-50">اسم الطالب</th>
                        <th className="px-10 border-l border-slate-50 text-center">الفصل</th>
                        <th className="px-10 border-l border-slate-50 text-center">السجل المدني</th>
                        <th className="px-10 border-l border-slate-50 text-center">رصيد XP</th>
                        <th className="px-10 text-center">خيارات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredStudents.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-indigo-50/20 transition-all group h-20">
                            <td className="px-10 text-center text-slate-300 font-mono text-[11px] border-l border-slate-50 font-black">{idx + 1}</td>
                            <td className="px-10 border-l border-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        {student.name.charAt(0)}
                                    </div>
                                    <span className="font-black text-slate-800 text-sm">{student.name}</span>
                                </div>
                            </td>
                            <td className="px-10 text-center border-l border-slate-50">
                                <span className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">{student.className || '---'}</span>
                            </td>
                            <td className="px-10 text-center font-mono text-slate-400 text-xs border-l border-slate-50 font-bold">{student.nationalId}</td>
                            <td className="px-10 text-center border-l border-slate-50">
                                <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-1.5 rounded-xl font-black text-xs border border-amber-100">
                                    <Zap size={14} fill="currentColor"/> {student.xp || 0}
                                </div>
                            </td>
                            <td className="px-10">
                                <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all"><UserCircle size={18}/></button>
                                    <button onClick={() => { if(confirm('حذف؟')) onDeleteStudent(student.id); }} className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl transition-all"><Trash2 size={18}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Mobile List View */}
            <div className="lg:hidden p-4 space-y-3">
                {filteredStudents.map((student, idx) => (
                    <div key={student.id} className="bg-slate-50/50 p-4 rounded-3xl border border-slate-100 flex items-center justify-between group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100">
                                {student.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="font-black text-slate-800 text-sm truncate max-w-[150px]">{student.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{student.className} • ID: {student.nationalId}</p>
                            </div>
                         </div>
                         <div className="flex gap-2">
                             <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-3 bg-white text-indigo-600 rounded-xl shadow-sm border border-slate-100"><ArrowRight size={18}/></button>
                         </div>
                    </div>
                ))}
            </div>

            {filteredStudents.length === 0 && (
                <div className="py-32 lg:py-48 text-center text-slate-200 flex flex-col items-center gap-6 animate-pulse">
                    <Search size={120} strokeWidth={1} />
                    <p className="text-2xl lg:text-4xl font-black">لا توجد سجلات مطابقة</p>
                </div>
            )}
          </div>
          
          <div className="bg-slate-50 p-6 lg:p-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0 px-6 lg:px-12">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-right">إجمالي القيود: {filteredStudents.length} طالب</p>
                <div className="flex items-center gap-3">
                    <button className="p-2.5 bg-white text-slate-400 hover:text-indigo-600 rounded-xl border shadow-sm"><ChevronRight size={18}/></button>
                    <span className="text-[10px] font-black px-5 py-2 bg-slate-900 text-white rounded-xl shadow-lg">01 / 01</span>
                    <button className="p-2.5 bg-white text-slate-400 hover:text-indigo-600 rounded-xl border shadow-sm"><ChevronLeft size={18}/></button>
                </div>
          </div>
      </div>
    </div>
  );
};

export default Students;
