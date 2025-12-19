
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser } from '../types';
import { CheckCircle, XCircle, Clock, Users, ChevronRight, ChevronLeft, Search, CheckSquare, Sparkles, Star, ThumbsUp, ThumbsDown, BookOpen, X, Smartphone, MessageCircle, List, LayoutGrid, FilterX } from 'lucide-react';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const QUICK_BEHAVIORS = [
    { label: 'مشاركة ممتازة', status: BehaviorStatus.POSITIVE, icon: <Sparkles size={14}/>, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'حل الواجب', status: BehaviorStatus.POSITIVE, icon: <CheckCircle size={14}/>, color: 'text-green-600 bg-green-50' },
    { label: 'سلوك منضبط', status: BehaviorStatus.POSITIVE, icon: <Star size={14}/>, color: 'text-blue-600 bg-blue-50' },
    { label: 'مشاغبة', status: BehaviorStatus.NEGATIVE, icon: <ThumbsDown size={14}/>, color: 'text-red-600 bg-red-50' },
    { label: 'بدون كتاب', status: BehaviorStatus.NEGATIVE, icon: <BookOpen size={14}/>, color: 'text-orange-600 bg-orange-50' },
];

const Attendance: React.FC<AttendanceProps> = ({ 
    students, 
    attendanceHistory, 
    onSaveAttendance, 
    currentUser 
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ABSENT'>('ALL');
  const [activeStudentMenu, setActiveStudentMenu] = useState<string | null>(null);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    return Array.from(classes).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const record = attendanceHistory.find(a => a.studentId === s.id && a.date === selectedDate);
      const matchesClass = !selectedClass || s.className === selectedClass;
      const matchesSearch = !searchTerm || s.name.includes(searchTerm);
      const matchesFilter = filterMode === 'ALL' || record?.status === AttendanceStatus.ABSENT;
      return matchesClass && matchesSearch && matchesFilter;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass, searchTerm, filterMode, attendanceHistory, selectedDate]);

  const handleUpdate = (studentId: string, status: AttendanceStatus, bStatus?: BehaviorStatus, bNote?: string) => {
    const existing = attendanceHistory.find(a => a.studentId === studentId && a.date === selectedDate);
    const record: AttendanceRecord = {
      id: existing?.id || `${studentId}-${selectedDate}`,
      studentId,
      date: selectedDate,
      status,
      behaviorStatus: bStatus || existing?.behaviorStatus || BehaviorStatus.NEUTRAL,
      behaviorNote: bNote || existing?.behaviorNote || '',
      excuseNote: existing?.excuseNote,
      createdById: currentUser?.id
    };
    onSaveAttendance([record]);
    setActiveStudentMenu(null);
  };

  const markAllPresent = () => {
    if (!selectedClass) return;
    const records: AttendanceRecord[] = filteredStudents.map(s => {
        const existing = attendanceHistory.find(a => a.studentId === s.id && a.date === selectedDate);
        return {
            id: existing?.id || `${s.id}-${selectedDate}`,
            studentId: s.id,
            date: selectedDate,
            status: AttendanceStatus.PRESENT,
            behaviorStatus: existing?.behaviorStatus || BehaviorStatus.NEUTRAL,
            createdById: currentUser?.id
        };
    });
    onSaveAttendance(records);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl border">
            <button onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={18}/></button>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
              className="bg-transparent text-sm font-bold outline-none cursor-pointer text-center"
            />
            <button onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={18}/></button>
          </div>

          <select 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)}
            className="p-2.5 border rounded-xl bg-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[150px]"
          >
            <option value="">جميع الفصول</option>
            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="flex bg-gray-100 p-1 rounded-xl border">
            <button onClick={() => setViewMode('GRID')} className={`p-2 rounded-lg ${viewMode === 'GRID' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}><LayoutGrid size={18}/></button>
            <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-lg ${viewMode === 'LIST' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}><List size={18}/></button>
          </div>
          
          <button onClick={() => setFilterMode(filterMode === 'ALL' ? 'ABSENT' : 'ALL')} className={`p-2.5 rounded-xl border font-bold text-sm flex items-center gap-2 transition-all ${filterMode === 'ABSENT' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white text-gray-500'}`}>
            <FilterX size={18}/> {filterMode === 'ABSENT' ? 'عرض الغائبين فقط' : 'تصفية الغياب'}
          </button>
        </div>

        {selectedClass && (
          <button 
            onClick={markAllPresent}
            className="w-full lg:w-auto bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-md transition-all active:scale-95"
          >
            <CheckSquare size={18}/> تحضير الكل حاضر
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-20">
        {viewMode === 'GRID' ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredStudents.map(student => {
              const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
              const status = record?.status || AttendanceStatus.PRESENT;
              const hasExcuse = !!record?.excuseNote;

              return (
                <div key={student.id} className="relative">
                    <div 
                        onClick={() => handleUpdate(student.id, status === AttendanceStatus.PRESENT ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer h-36 flex flex-col justify-between shadow-sm relative overflow-hidden ${
                            status === AttendanceStatus.ABSENT ? 'bg-red-50 border-red-200' : 'bg-white border-transparent hover:border-indigo-100'
                        }`}
                    >
                        {hasExcuse && <div className="absolute top-0 left-0 bg-orange-500 text-white p-1 rounded-br-lg"><MessageCircle size={12}/></div>}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white ${status === AttendanceStatus.ABSENT ? 'bg-red-600' : 'bg-indigo-600'}`}>
                            {student.name.charAt(0)}
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{student.name}</h4>
                            <p className="text-[10px] font-bold uppercase text-gray-400">{status === AttendanceStatus.ABSENT ? 'غائب' : 'حاضر'}</p>
                        </div>
                    </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4">اسم الطالب</th>
                  <th className="p-4 text-center">الحالة</th>
                  <th className="p-4 text-center">إجراءات سريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStudents.map(student => {
                  const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
                  const status = record?.status || AttendanceStatus.PRESENT;
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="p-4 font-bold text-gray-800">{student.name}</td>
                      <td className="p-4 text-center">
                        <select 
                          value={status} 
                          onChange={(e) => handleUpdate(student.id, e.target.value as AttendanceStatus)}
                          className={`p-1 rounded font-bold text-xs border ${status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}
                        >
                          <option value={AttendanceStatus.PRESENT}>حاضر</option>
                          <option value={AttendanceStatus.ABSENT}>غائب</option>
                          <option value={AttendanceStatus.LATE}>متأخر</option>
                          <option value={AttendanceStatus.EXCUSED}>بعذر</option>
                        </select>
                      </td>
                      <td className="p-4 flex justify-center gap-2">
                        {QUICK_BEHAVIORS.slice(0, 3).map(b => (
                          <button key={b.label} onClick={() => handleUpdate(student.id, status, b.status, b.label)} className={`p-2 rounded-lg border ${b.color}`} title={b.label}>{b.icon}</button>
                        ))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
