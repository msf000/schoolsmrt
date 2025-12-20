import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser } from '../types';
import { CheckCircle, XCircle, Clock, Users, ChevronRight, ChevronLeft, Search, CheckSquare, Sparkles, Star, ThumbsDown, BookOpen, LayoutGrid, List, FilterX, Eye, CalendarDays, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const QUICK_BEHAVIORS = [
    { label: 'مشاركة ممتازة', status: BehaviorStatus.POSITIVE, icon: <Sparkles size={14}/>, color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
    { label: 'سلوك منضبط', status: BehaviorStatus.POSITIVE, icon: <Star size={14}/>, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'مشاغبة', status: BehaviorStatus.NEGATIVE, icon: <ThumbsDown size={14}/>, color: 'text-red-600 bg-red-50 border-red-100' },
];

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, currentUser }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem('att_selected_date') || new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('att_selected_class') || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>(() => (localStorage.getItem('att_view_mode') as any) || 'GRID');
  const [filterMode, setFilterMode] = useState<'ALL' | 'ABSENT'>(() => (localStorage.getItem('att_filter_mode') as any) || 'ALL');

  useEffect(() => {
      localStorage.setItem('att_selected_date', selectedDate);
      localStorage.setItem('att_selected_class', selectedClass);
      localStorage.setItem('att_view_mode', viewMode);
      localStorage.setItem('att_filter_mode', filterMode);
  }, [selectedDate, selectedClass, viewMode, filterMode]);

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

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
      createdById: currentUser?.id
    };
    onSaveAttendance([record]);
  };

  const markAllPresent = () => {
    if (!selectedClass) return;
    const records: AttendanceRecord[] = filteredStudents.map(s => {
        const existing = attendanceHistory.find(a => a.studentId === s.id && a.date === selectedDate);
        return {
            id: existing?.id || `${s.id}-${selectedDate}`, studentId: s.id, date: selectedDate, status: AttendanceStatus.PRESENT,
            behaviorStatus: existing?.behaviorStatus || BehaviorStatus.NEUTRAL, createdById: currentUser?.id
        };
    });
    onSaveAttendance(records);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50 animate-fade-in pb-24">
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-full lg:w-auto">
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2.5 bg-white rounded-lg shadow-sm"><ChevronRight size={20}/></button>
                <div className="flex-1 flex items-center justify-center gap-2 font-black text-sm px-4"><CalendarDays size={16} className="text-indigo-600"/> {selectedDate}</div>
                <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2.5 bg-white rounded-lg shadow-sm"><ChevronLeft size={20}/></button>
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
                <button onClick={() => navigate('/reports')} className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-xl font-black text-xs flex items-center gap-2 border border-indigo-100"><History size={16}/> سجل الحضور</button>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="flex-1 lg:flex-none p-3 border rounded-xl bg-white font-black text-sm outline-none shadow-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="">كل الفصول</option>
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={markAllPresent} disabled={!selectedClass} className="flex-[2] lg:flex-none bg-green-600 text-white px-6 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 transition-all"><CheckSquare size={18}/> تحضير الكل</button>
            </div>
        </div>
        <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
            <input className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {viewMode === 'GRID' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-10">
            {filteredStudents.map(student => {
              const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
              const isAbsent = record?.status === AttendanceStatus.ABSENT;
              const isLate = record?.status === AttendanceStatus.LATE;

              return (
                <div key={student.id} className={`p-4 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col justify-between h-40 shadow-sm relative overflow-hidden group ${isAbsent ? 'bg-red-50 border-red-200 shadow-red-100/50' : isLate ? 'bg-amber-50 border-amber-200' : 'bg-white border-transparent hover:border-indigo-100'}`} onClick={() => handleUpdate(student.id, isAbsent ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT)}>
                    <div className="flex justify-between items-start">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white ${isAbsent ? 'bg-red-600' : isLate ? 'bg-amber-500' : 'bg-indigo-600'}`}>{student.name.charAt(0)}</div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {QUICK_BEHAVIORS.map(b => (
                                <button key={b.label} onClick={(e) => {e.stopPropagation(); handleUpdate(student.id, record?.status || AttendanceStatus.PRESENT, b.status, b.label);}} className={`p-1.5 rounded-lg border ${b.color}`} title={b.label}>{b.icon}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-black text-gray-800 line-clamp-1">{student.name}</h4>
                        <p className={`text-[10px] font-black uppercase mt-1 ${isAbsent ? 'text-red-600' : isLate ? 'text-amber-600' : 'text-gray-400'}`}>
                            {isAbsent ? '• غائب' : isLate ? '• متأخر' : '• حاضر'}
                        </p>
                    </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-right text-sm">
              <thead className="bg-gray-50/50 text-[10px] text-gray-400 font-black uppercase tracking-widest border-b">
                <tr><th className="p-4">الطالب</th><th className="p-4 text-center">الحالة</th><th className="p-4 text-center">الإجراء</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map(student => {
                  const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
                  const status = record?.status || AttendanceStatus.PRESENT;
                  return (
                    <tr key={student.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="p-4 font-black text-gray-800">{student.name}</td>
                      <td className="p-4 text-center">
                        <select value={status} onChange={(e) => handleUpdate(student.id, e.target.value as AttendanceStatus)} className={`p-1.5 rounded-lg font-black text-[10px] border outline-none ${status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                          <option value={AttendanceStatus.PRESENT}>حاضر</option><option value={AttendanceStatus.ABSENT}>غائب</option><option value={AttendanceStatus.LATE}>متأخر</option><option value={AttendanceStatus.EXCUSED}>بعذر</option>
                        </select>
                      </td>
                      <td className="p-4 flex justify-center gap-2">
                        {QUICK_BEHAVIORS.map(b => (
                          <button key={b.label} onClick={() => handleUpdate(student.id, status, b.status, b.label)} className={`p-2 rounded-lg border ${b.color}`}>{b.icon}</button>
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