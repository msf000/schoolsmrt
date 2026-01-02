
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser } from '../types';
import { 
    Search, List, LayoutGrid, Trash2, ArrowRight, UserPlus, 
    FileSpreadsheet, Filter, MoreVertical, Download, 
    CheckCircle, ShieldCheck, ChevronLeft, ChevronRight, UserCircle, Users, Zap
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
    <div className="space-y-8 animate-fade-in font-tajawal flex flex-col h-full">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 shrink-0 bg-white p-8 rounded-[2rem] border shadow-sm">
        <div className="flex items-center gap-5">
            {/* Fixed: Added missing 'Users' icon import from lucide-react */}
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shadow-inner"><Users size={32}/></div>
            <div>
                <h2 className="text-3xl font-black text-slate-800">قاعدة بيانات الطلاب</h2>
                <p className="text-slate-500 font-bold mt-1 uppercase text-xs tracking-widest">Student Cloud Registry</p>
            </div>
        </div>
        <div className="flex gap-3">
            <button onClick={() => navigate('/school-mgmt')} className="px-6 py-3 border-2 border-slate-100 text-slate-600 bg-white rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-slate-50 transition-all">
                <FileSpreadsheet size={18} className="text-emerald-600"/> استيراد كتلة بيانات
            </button>
            <button className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl shadow-blue-900/10 hover:bg-blue-700 transition-all hover:scale-105 active:scale-95">
                <UserPlus size={18}/> إضافة طالب جديد
            </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-wrap gap-6 items-center shrink-0">
        <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
                type="text" 
                placeholder="ابحث بالاسم، السجل المدني، أو الفصل..." 
                className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تصفية حسب:</span>
            <select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-xs font-black outline-none transition-all min-w-[150px]"
            >
                <option value="">كافة الفصول</option>
                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex-1 flex flex-col">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-right border-collapse">
                <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 z-10 h-20">
                    <tr>
                        <th className="px-8 border-l border-slate-50 w-20 text-center">م</th>
                        <th className="px-8 border-l border-slate-50">اسم الطالب الرباعي</th>
                        <th className="px-8 border-l border-slate-50 text-center">الفصل الدراسي</th>
                        <th className="px-8 border-l border-slate-50 text-center">رقم الهوية</th>
                        <th className="px-8 border-l border-slate-50 text-center">النقاط (XP)</th>
                        <th className="px-8 text-center">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {filteredStudents.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-indigo-50/10 transition-all group h-20">
                            <td className="px-8 text-center text-slate-300 font-mono text-[11px] border-l border-slate-50">{idx + 1}</td>
                            <td className="px-8 border-l border-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-indigo-600 transition-all group-hover:scale-110 shadow-inner group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-200">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-800 text-sm">{student.name}</span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">تاريخ التسجيل: 2025</span>
                                    </div>
                                </div>
                            </td>
                            <td className="px-8 text-center border-l border-slate-50">
                                <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider">{student.className || 'غير مسكن'}</span>
                            </td>
                            <td className="px-8 text-center font-mono text-slate-400 text-xs border-l border-slate-50 tracking-tighter">{student.nationalId}</td>
                            <td className="px-8 text-center border-l border-slate-50">
                                {/* Fixed: Added missing 'Zap' icon import from lucide-react */}
                                <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-1.5 rounded-2xl font-black text-xs shadow-sm border border-yellow-100">
                                    <Zap size={12} fill="currentColor"/> {student.xp || 0}
                                </div>
                            </td>
                            <td className="px-8">
                                <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl transition-all shadow-sm" title="الملف الشامل">
                                        <UserCircle size={20}/>
                                    </button>
                                    <button onClick={() => { if(confirm('حذف الطالب؟')) onDeleteStudent(student.id); }} className="p-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm" title="حذف">
                                        <Trash2 size={20}/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredStudents.length === 0 && (
                <div className="py-32 text-center text-slate-300 opacity-20 flex flex-col items-center gap-6">
                    <Search size={150} strokeWidth={1} />
                    <p className="text-3xl font-black">لم يتم العثور على نتائج</p>
                </div>
            )}
          </div>
          
          {/* Footer Info */}
          <div className="bg-[#F8FAFC] p-6 border-t flex justify-between items-center px-10 shrink-0">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">إجمالي المعروض: {filteredStudents.length} طالب</p>
                <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-600"><ChevronRight/></button>
                    <span className="text-[11px] font-black px-4 py-2 bg-white rounded-xl border shadow-sm text-slate-600">الصفحة 1</span>
                    <button className="p-2 text-slate-400 hover:text-blue-600"><ChevronLeft/></button>
                </div>
          </div>
      </div>
    </div>
  );
};

export default Students;
