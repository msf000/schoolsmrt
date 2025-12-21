import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser } from '../types';
import { 
    CheckCircle, XCircle, Clock, Users, ChevronRight, ChevronLeft, 
    Search, CheckSquare, Sparkles, Star, ThumbsDown, BookOpen, 
    LayoutGrid, List, FilterX, Eye, CalendarDays, History, 
    Hash, Calendar as CalendarIcon, Info, AlertCircle, Save, 
    MoreHorizontal, UserCheck, UserX
} from 'lucide-react';
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

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, currentUser }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem('att_selected_date') || new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('att_selected_class') || '');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(() => Number(localStorage.getItem('att_selected_period')) || 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>(() => (localStorage.getItem('att_view_mode') as any) || 'GRID');
  
  useEffect(() => {
      localStorage.setItem('att_selected_date', selectedDate);
      localStorage.setItem('att_selected_class', selectedClass);
      localStorage.setItem('att_selected_period', selectedPeriod.toString());
      localStorage.setItem('att_view_mode', viewMode);
  }, [selectedDate, selectedClass, selectedPeriod, viewMode]);

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

  // تصفية الطلاب بناءً على الفصل والبحث
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = !selectedClass || s.className === selectedClass;
      const matchesSearch = !searchTerm || s.name.includes(searchTerm);
      return matchesClass && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass, searchTerm]);

  // جلب سجلات الحضور للحصة والتاريخ المحددين فقط
  const currentPeriodRecords = useMemo(() => {
    return attendanceHistory.filter(a => a.date === selectedDate && a.period === selectedPeriod);
  }, [attendanceHistory, selectedDate, selectedPeriod]);

  const handleUpdate = (studentId: string, status: AttendanceStatus, bStatus?: BehaviorStatus, bNote?: string) => {
    const existing = attendanceHistory.find(a => 
      a.studentId === studentId && 
      a.date === selectedDate && 
      a.period === selectedPeriod
    );

    const record: AttendanceRecord = {
      id: existing?.id || `${studentId}-${selectedDate}-${selectedPeriod}`,
      studentId,
      date: selectedDate,
      period: selectedPeriod,
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
        const existing = attendanceHistory.find(a => a.studentId === s.id && a.date === selectedDate && a.period === selectedPeriod);
        return {
            id: existing?.id || `${s.id}-${selectedDate}-${selectedPeriod}`, 
            studentId: s.id, 
            date: selectedDate, 
            period: selectedPeriod,
            status: AttendanceStatus.PRESENT,
            behaviorStatus: existing?.behaviorStatus || BehaviorStatus.NEUTRAL, 
            createdById: currentUser?.id
        };
    });
    onSaveAttendance(records);
  };

  // التحقق من الحصص التي تم تحضيرها لهذا اليوم
  const getPeriodStatus = (p: number) => {
    const hasRecords = attendanceHistory.some(a => a.date === selectedDate && a.period === p && (!selectedClass || students.find(s => s.id === a.studentId)?.className === selectedClass));
    return hasRecords;
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in pb-24 font-tajawal">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 mb-6 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
                {/* Date Selection */}
                <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-2xl border border-indigo-100 w-full md:w-auto">
                    <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><ChevronRight size={18}/></button>
                    <div className="flex-1 flex items-center justify-center gap-2 font-black text-xs px-2 min-w-[140px]">
                        <CalendarIcon size={16} className="text-indigo-600"/>
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => setSelectedDate(e.target.value)} 
                            className="bg-transparent outline-none cursor-pointer"
                        />
                    </div>
                    <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><ChevronLeft size={18}/></button>
                </div>

                {/* Class Selection */}
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-full md:w-auto">
                    <Users size={18} className="text-slate-500 mr-2"/>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[120px] cursor-pointer">
                        <option value="">كل الفصول</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex gap-3 w-full lg:w-auto">
                <button onClick={() => setViewMode(viewMode === 'GRID' ? 'LIST' : 'GRID')} className="p-3.5 bg-white border-2 border-slate-50 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all" title="تبديل العرض">
                    {viewMode === 'GRID' ? <List size={22}/> : <LayoutGrid size={22}/>}
                </button>
                <button onClick={() => navigate('/reports')} className="hidden md:flex bg-white text-slate-700 px-6 py-3.5 rounded-2xl font-black text-xs items-center gap-2 border-2 border-slate-50 shadow-sm hover:bg-slate-50 transition-all"><History size={18}/> السجلات</button>
                <button onClick={markAllPresent} disabled={!selectedClass} className="flex-1 md:flex-none bg-emerald-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50 active:scale-95 transition-all"><CheckSquare size={20}/> تحضير الكل</button>
            </div>
        </div>

        {/* Periods Selector Bar */}
        <div className="pt-4 border-t border-gray-50 overflow-x-auto no-scrollbar relative z-10">
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 whitespace-nowrap">الحصص:</span>
                <div className="flex gap-2">
                    {PERIODS.map(p => {
                        const isDone = getPeriodStatus(p);
                        return (
                            <button 
                                key={p} 
                                onClick={() => setSelectedPeriod(p)} 
                                className={`relative w-12 h-12 rounded-2xl font-black text-sm flex flex-col items-center justify-center transition-all ${selectedPeriod === p ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                            >
                                <span className="text-[10px] opacity-50 mb-0.5">ح</span>
                                {p}
                                {isDone && <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${selectedPeriod === p ? 'bg-emerald-400' : 'bg-emerald-500 shadow-sm'}`}></div>}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Search Input */}
        <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
            <input className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" placeholder="بحث سريع عن طالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
        </div>
      </div>

      {/* Students List Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {viewMode === 'GRID' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-10">
            {filteredStudents.map(student => {
              const record = currentPeriodRecords.find(a => a.studentId === student.id);
              const isAbsent = record?.status === AttendanceStatus.ABSENT;
              const isLate = record?.status === AttendanceStatus.LATE;
              const isExcused = record?.status === AttendanceStatus.EXCUSED;
              const isPresent = record?.status === AttendanceStatus.PRESENT;

              return (
                <div 
                    key={student.id} 
                    className={`group p-5 rounded-[2.5rem] border-2 transition-all cursor-pointer flex flex-col justify-between h-48 shadow-sm relative overflow-hidden ${isAbsent ? 'bg-red-50 border-red-200 shadow-red-100/30' : isLate ? 'bg-amber-50 border-amber-200' : isExcused ? 'bg-blue-50 border-blue-200' : isPresent ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-transparent hover:border-indigo-100'}`} 
                    onClick={() => handleUpdate(student.id, isAbsent ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT)}
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg ${isAbsent ? 'bg-red-600' : isLate ? 'bg-amber-500' : isExcused ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                            {student.name.charAt(0)}
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {QUICK_BEHAVIORS.map(b => (
                                <button key={b.label} onClick={(e) => {e.stopPropagation(); handleUpdate(student.id, record?.status || AttendanceStatus.PRESENT, b.status, b.label);}} className={`p-1.5 rounded-lg border shadow-sm transition-transform active:scale-90 ${b.color}`} title={b.label}>{b.icon}</button>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-10 mt-4">
                        <h4 className="text-xs font-black text-slate-800 line-clamp-2 leading-relaxed">{student.name}</h4>
                        <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isAbsent ? 'text-red-600 bg-white shadow-sm' : isLate ? 'text-amber-600 bg-white shadow-sm' : isExcused ? 'text-blue-600 bg-white shadow-sm' : isPresent ? 'text-emerald-600 bg-white shadow-sm' : 'text-slate-300'}`}>
                                {isAbsent ? '• غائب' : isLate ? '• متأخر' : isExcused ? '• بعذر' : isPresent ? '• حاضر' : '• لم يتم التحضير'}
                            </span>
                        </div>
                    </div>
                    
                    {/* Background Decorative Pattern for Present/Absent */}
                    {isPresent && <div className="absolute -bottom-2 -left-2 text-emerald-100 opacity-20 -rotate-12"><UserCheck size={80}/></div>}
                    {isAbsent && <div className="absolute -bottom-2 -left-2 text-red-100 opacity-20 -rotate-12"><UserX size={80}/></div>}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-xl mb-10">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50/50 text-[10px] text-slate-400 font-black uppercase tracking-widest border-b h-14">
                <tr><th className="p-4 w-12 text-center">#</th><th className="p-4">اسم الطالب</th><th className="p-4 text-center">الحالة</th><th className="p-4 text-center">الإجراءات السريعة</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStudents.map((student, idx) => {
                  const record = currentPeriodRecords.find(a => a.studentId === student.id);
                  const status = record?.status || AttendanceStatus.PRESENT;
                  const isUntouched = !record;

                  return (
                    <tr key={student.id} className={`hover:bg-indigo-50/30 transition-colors h-16 ${isUntouched ? 'opacity-60' : ''}`}>
                      <td className="p-4 text-center text-xs text-slate-300 font-mono">{idx + 1}</td>
                      <td className="p-4 font-black text-slate-700">{student.name}</td>
                      <td className="p-4 text-center">
                        <select 
                            value={record?.status || ''} 
                            onChange={(e) => handleUpdate(student.id, e.target.value as AttendanceStatus)} 
                            className={`p-2 rounded-xl font-black text-[10px] border-2 outline-none shadow-sm transition-all ${status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-600 border-red-200' : status === AttendanceStatus.LATE ? 'bg-amber-50 text-amber-600 border-amber-200' : status === AttendanceStatus.EXCUSED ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}
                        >
                          <option value="">-- اختر --</option>
                          <option value={AttendanceStatus.PRESENT}>حاضر</option>
                          <option value={AttendanceStatus.ABSENT}>غائب</option>
                          <option value={AttendanceStatus.LATE}>متأخر</option>
                          <option value={AttendanceStatus.EXCUSED}>بعذر</option>
                        </select>
                      </td>
                      <td className="p-4 flex justify-center gap-2">
                        {QUICK_BEHAVIORS.map(b => (
                          <button key={b.label} onClick={() => handleUpdate(student.id, status, b.status, b.label)} className={`p-2.5 rounded-xl border-2 shadow-sm transition-all active:scale-90 ${b.color}`}>{b.icon}</button>
                        ))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredStudents.length === 0 && (
            <div className="flex flex-col items-center justify-center p-20 text-slate-300 font-black italic gap-4">
                <AlertCircle size={64} className="opacity-10"/>
                <p>لا يوجد طلاب لعرضهم في هذا الفصل</p>
            </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="fixed bottom-20 left-6 right-6 md:right-80 lg:right-80 bg-indigo-900 text-white p-4 rounded-3xl shadow-2xl flex justify-between items-center z-40 animate-slide-up print:hidden">
            <div className="flex items-center gap-6 px-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-[10px] font-bold uppercase opacity-80">تم التحضير: {currentPeriodRecords.length}</span>
                </div>
                <div className="flex items-center gap-2 border-r border-white/20 pr-6">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <span className="text-[10px] font-bold uppercase opacity-80">الغياب: {currentPeriodRecords.filter(r=>r.status===AttendanceStatus.ABSENT).length}</span>
                </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl">
                <Hash size={14} className="text-yellow-400"/>
                <span className="text-xs font-black">الحصة الحالية: {selectedPeriod}</span>
            </div>
      </div>
    </div>
  );
};

export default Attendance;