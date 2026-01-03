
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser } from '../types';
import { 
    Search, List, LayoutGrid, Trash2, UserPlus, 
    FileSpreadsheet, MoreVertical, CheckCircle, 
    ChevronLeft, ChevronRight, UserCircle, Users, Zap, Printer, Filter, ArrowUpRight
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
    <div className="space-y-6 page-enter font-tajawal">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">سجل الطلاب المركزي</h1>
            <p className="text-slate-500 text-sm">إدارة كافة بيانات الطلاب والفصول الدراسية.</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => navigate('/school-mgmt')} className="px-4 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center gap-2">
                <FileSpreadsheet size={16} /> استيراد
            </button>
            <button className="px-5 py-2 bg-brand-500 text-white rounded-lg text-xs font-bold hover:bg-brand-600 shadow-sm flex items-center gap-2">
                <UserPlus size={16} /> إضافة طالب
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="ابحث بالاسم أو السجل..." 
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-brand-500 outline-none transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <select 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full md:w-48 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none"
        >
            <option value="">كل الفصول</option>
            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-1">
            <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all"><Printer size={18}/></button>
            <button className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-lg border border-transparent hover:border-slate-200 transition-all"><Filter size={18}/></button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-widest">
                        <th className="px-6 py-4 w-12">#</th>
                        <th className="px-6 py-4">بيانات الطالب</th>
                        <th className="px-6 py-4">الفصل الدراسي</th>
                        <th className="px-6 py-4">التحصيل (XP)</th>
                        <th className="px-6 py-4 text-left">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors group h-16">
                            <td className="px-6 py-4 text-slate-300 font-black text-xs">{idx + 1}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-black text-lg border border-brand-100">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-800 text-sm">{student.name}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">{student.nationalId}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">{student.className || '---'}</span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="inline-flex items-center gap-2 text-amber-600 font-black">
                                    <Zap size={14} fill="currentColor"/> {student.xp || 0}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-left">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg" title="الملف الشامل"><UserCircle size={18}/></button>
                                    <button onClick={() => { if(confirm('حذف الطالب؟')) onDeleteStudent(student.id); }} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg" title="حذف"><Trash2 size={18}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
          
          {filteredStudents.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-300">
                <Users size={64} className="mb-4 opacity-20" />
                <p className="font-black text-lg">لم يتم العثور على طلاب</p>
            </div>
          )}
      </div>
    </div>
  );
};

export default Students;
