
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AttendanceStatus } from '../types';
import { saveAttendance, updateStudent } from '../services/storageService';
import { 
    UserPlus, Search, Phone, User, GraduationCap, Eye, Edit, 
    FileSpreadsheet, CheckCircle, Trash2, ArrowRight, Star, 
    Zap, Filter, MoreVertical, LayoutGrid, List, UserCheck, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastProvider';

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

const Students: React.FC<StudentsProps> = ({ 
  students, 
  attendance,
  onUpdateStudent, 
  onDeleteStudent, 
  currentUser
}) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  const uniqueClasses = useMemo(() => 
    Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort()
  , [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
        const matchesSearch = s.name.includes(searchTerm) || s.nationalId.includes(searchTerm);
        const matchesClass = !selectedClass || s.className === selectedClass;
        return matchesSearch && matchesClass;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, searchTerm, selectedClass]);

  const handleQuickAttendance = async (studentId: string, status: AttendanceStatus) => {
    const today = new Date().toISOString().split('T')[0];
    const record: AttendanceRecord = {
        id: `att_${studentId}_${today}`,
        studentId,
        date: today,
        status,
        createdById: currentUser?.id
    };
    try {
        await saveAttendance([record]);
        showToast(`تم تسجيل ${status === AttendanceStatus.PRESENT ? 'حضور' : 'غياب'} الطالب`, 'SUCCESS');
    } catch (e) {
        showToast('فشل التزامن السحابي', 'ERROR');
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden">
      {/* Header Area */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 shrink-0">
        <div>
            <h2 className="text-3xl font-black text-slate-800">إدارة الطلاب</h2>
            <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-widest">إجمالي المسجلين: {students.length} بطل</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-2xl border shadow-sm">
            <button onClick={() => setViewMode('GRID')} className={`p-3 rounded-xl transition-all ${viewMode === 'GRID' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><LayoutGrid size={20}/></button>
            <button onClick={() => setViewMode('LIST')} className={`p-3 rounded-xl transition-all ${viewMode === 'LIST' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><List size={20}/></button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 shrink-0">
        <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
                type="text" 
                placeholder="ابحث بالاسم أو رقم الهوية..." 
                className="w-full pr-12 pl-4 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-xl shadow-slate-200/20 focus:ring-4 focus:ring-indigo-500/5 outline-none font-bold text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <select 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)}
            className="md:w-64 p-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-xl shadow-slate-200/20 font-black text-sm outline-none"
        >
            <option value="">كل الفصول</option>
            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 pr-1">
        {viewMode === 'GRID' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStudents.map(student => (
                    <div key={student.id} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-2 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600 text-3xl font-black shadow-inner">
                                    {student.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{student.name}</h4>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">{student.className}</span>
                                        <span className="text-[10px] font-bold text-slate-300 font-mono">{student.nationalId}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-black text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                    <Zap size={10} fill="currentColor"/> {student.behaviorPoints || 0} XP
                                </span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Level {student.level || 1}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button 
                                onClick={() => handleQuickAttendance(student.id, AttendanceStatus.PRESENT)}
                                className="flex flex-col items-center justify-center p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all group/btn"
                            >
                                <UserCheck size={20} className="mb-1 group-hover/btn:scale-110 transition-transform"/>
                                <span className="text-[10px] font-black">تحضير</span>
                            </button>
                            <button 
                                onClick={() => navigate('/works', { state: { studentId: student.id } })}
                                className="flex flex-col items-center justify-center p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all group/btn"
                            >
                                <Activity size={20} className="mb-1 group-hover/btn:scale-110 transition-transform"/>
                                <span className="text-[10px] font-black">رصد أداء</span>
                            </button>
                        </div>

                        <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                            <button 
                                onClick={() => navigate('/followup', { state: { studentId: student.id } })}
                                className="text-[11px] font-black text-indigo-600 hover:underline flex items-center gap-1"
                            >
                                فتح الملف الموحد <ArrowRight size={14}/>
                            </button>
                            <div className="flex gap-1">
                                <button onClick={() => onDeleteStudent(student.id)} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-[#F8FAFC] border-b text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th className="p-5 border-l">اسم الطالب</th>
                            <th className="p-5 border-l">الفصل</th>
                            <th className="p-5 border-l text-center">النقاط</th>
                            <th className="p-5 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredStudents.map(student => (
                            <tr key={student.id} className="hover:bg-indigo-50/20 transition-all group">
                                <td className="p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center font-black text-indigo-600">{student.name.charAt(0)}</div>
                                        <span className="font-black text-slate-700">{student.name}</span>
                                    </div>
                                </td>
                                <td className="p-5"><span className="px-3 py-1 bg-slate-50 rounded-full text-xs font-bold text-slate-400">{student.className}</span></td>
                                <td className="p-5 text-center"><span className="text-indigo-600 font-black">{student.behaviorPoints || 0}</span></td>
                                <td className="p-5">
                                    <div className="flex justify-center gap-2">
                                        <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"><Eye size={18}/></button>
                                        <button onClick={() => onDeleteStudent(student.id)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><Trash2 size={18}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
        
        {filteredStudents.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center py-40 text-slate-300 opacity-40">
                <Search size={120} strokeWidth={1}/>
                <p className="text-3xl font-black mt-6 uppercase">لا توجد نتائج مطابقة</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Students;
