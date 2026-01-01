
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser } from '../types';
import { 
    Search, List, LayoutGrid, Trash2, ArrowRight, UserPlus, FileSpreadsheet
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
        const matchesSearch = (s.name || '').includes(searchTerm) || (s.nationalId || '').includes(searchTerm);
        const matchesClass = !selectedClass || s.className === selectedClass;
        return matchesSearch && matchesClass;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  }, [students, searchTerm, selectedClass]);

  return (
    <div className="space-y-6 animate-fade-in font-tajawal flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">إدارة سجل الطلاب</h2>
            <p className="text-slate-500 text-sm">قائمة بكافة الطلاب المسجلين في النظام السحابي.</p>
        </div>
        <div className="flex gap-2">
            <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-200">
                <FileSpreadsheet size={16}/> استيراد Excel
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-sm">
                <UserPlus size={16}/> إضافة طالب
            </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center shrink-0">
        <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
                type="text" 
                placeholder="ابحث بالاسم أو السجل..." 
                className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <select 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)}
            className="p-2 border border-slate-200 rounded-lg bg-white text-sm font-bold outline-none"
        >
            <option value="">كل الفصول</option>
            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-right border-collapse text-sm">
                <thead className="bg-slate-50 border-b text-[11px] font-bold text-slate-500 uppercase sticky top-0 z-10 h-12">
                    <tr>
                        <th className="px-6 border-l w-16 text-center">م</th>
                        <th className="px-6 border-l">اسم الطالب</th>
                        <th className="px-6 border-l">الفصل</th>
                        <th className="px-6 border-l text-center">السجل</th>
                        <th className="px-6 text-center">الإجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors h-14">
                            <td className="px-6 text-center text-slate-400 font-mono text-xs border-l">{idx + 1}</td>
                            <td className="px-6 font-bold text-slate-700 border-l">{student.name}</td>
                            <td className="px-6 text-slate-500 border-l">{student.className || '---'}</td>
                            <td className="px-6 text-center font-mono text-slate-400 border-l">{student.nationalId}</td>
                            <td className="px-6">
                                <div className="flex justify-center gap-2">
                                    <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="فتح الملف">
                                        <ArrowRight size={18}/>
                                    </button>
                                    <button onClick={() => { if(confirm('حذف الطالب؟')) onDeleteStudent(student.id); }} className="p-2 text-red-400 hover:bg-red-50 rounded-md transition-colors" title="حذف">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredStudents.length === 0 && (
                <div className="py-20 text-center text-slate-300 opacity-50 flex flex-col items-center">
                    <Search size={48}/>
                    <p className="mt-4 font-bold">لا توجد بيانات متاحة حالياً.</p>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default Students;
