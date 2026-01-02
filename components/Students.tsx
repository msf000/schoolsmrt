
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser } from '../types';
import { 
    Search, List, LayoutGrid, Trash2, UserPlus, 
    FileSpreadsheet, MoreVertical, CheckCircle, 
    ChevronLeft, ChevronRight, UserCircle, Users, Zap, Printer, Filter
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
      {/* SaaS Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">سجل الطلاب</h1>
            <p className="text-slate-500 text-sm">إدارة بيانات الطلاب، الفصول، ومعلومات التواصل.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => navigate('/school-mgmt')} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2">
                <FileSpreadsheet size={16} /> استيراد
            </button>
            <button className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 shadow-sm flex items-center gap-2">
                <UserPlus size={16} /> إضافة طالب
            </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
            <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="البحث بالاسم أو السجل المدني..." 
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-brand-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                className="flex-1 md:w-48 p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none"
            >
                <option value="">كل الفصول</option>
                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><Printer size={18}/></button>
            <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><Filter size={18}/></button>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <th className="px-6 py-4 w-12">#</th>
                        <th className="px-6 py-4">الطالب</th>
                        <th className="px-6 py-4">الفصل</th>
                        <th className="px-6 py-4">السجل المدني</th>
                        <th className="px-6 py-4">النقاط (XP)</th>
                        <th className="px-6 py-4 text-left">الإجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                            <td className="px-6 py-4 text-slate-400 font-medium">{idx + 1}</td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center font-bold">
                                        {student.name.charAt(0)}
                                    </div>
                                    <span className="font-bold text-slate-700">{student.name}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-bold">{student.className || '---'}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{student.nationalId}</td>
                            <td className="px-6 py-4">
                                <div className="inline-flex items-center gap-1.5 text-amber-600 font-bold">
                                    <Zap size={14} fill="currentColor"/> {student.xp || 0}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-left">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg" title="الملف الشامل"><UserCircle size={18}/></button>
                                    <button onClick={() => { if(confirm('حذف الطالب؟')) onDeleteStudent(student.id); }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg" title="حذف"><Trash2 size={18}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
          
          {filteredStudents.length === 0 && (
            <div className="py-20 text-center">
                <Users size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-medium">لا توجد بيانات طلاب مطابقة للبحث</p>
            </div>
          )}

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
                <p className="text-xs text-slate-500 font-medium">إجمالي الطلاب: {filteredStudents.length}</p>
                <div className="flex gap-2">
                    <button className="p-1 border border-slate-200 rounded bg-white text-slate-400 hover:text-brand-500 disabled:opacity-30" disabled><ChevronRight size={16}/></button>
                    <button className="p-1 border border-slate-200 rounded bg-white text-slate-400 hover:text-brand-500 disabled:opacity-30" disabled><ChevronLeft size={16}/></button>
                </div>
          </div>
      </div>
    </div>
  );
};

export default Students;
