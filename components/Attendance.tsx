
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser } from '../types';
import { CheckCircle, XCircle, Clock, Users, ChevronRight, ChevronLeft, Search, CheckSquare, Sparkles, Star, ThumbsUp, ThumbsDown, BookOpen, X } from 'lucide-react';

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
  const [activeStudentMenu, setActiveStudentMenu] = useState<string | null>(null);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    return Array.from(classes).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = !selectedClass || s.className === selectedClass;
      const matchesSearch = !searchTerm || s.name.includes(searchTerm);
      return matchesClass && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass, searchTerm]);

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
    setActiveStudentMenu(null);
  };

  const markAllPresent = () => {
    if (!selectedClass) return;
    const records: AttendanceRecord[] = filteredStudents.map(s => ({
      id: `${s.id}-${selectedDate}`,
      studentId: s.id,
      date: selectedDate,
      status: AttendanceStatus.PRESENT,
      behaviorStatus: BehaviorStatus.NEUTRAL,
      createdById: currentUser?.id
    }));
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

          <div className="relative flex-1 lg:w-64">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
            <input 
              type="text" 
              placeholder="بحث بالاسم..." 
              className="w-full pr-10 pl-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
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

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {filteredStudents.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredStudents.map(student => {
              const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
              const status = record?.status || AttendanceStatus.PRESENT;
              const bStatus = record?.behaviorStatus || BehaviorStatus.NEUTRAL;
              const isMenuOpen = activeStudentMenu === student.id;

              return (
                <div key={student.id} className="relative group">
                    <div 
                        onClick={() => setActiveStudentMenu(isMenuOpen ? null : student.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer h-40 flex flex-col justify-between shadow-sm relative overflow-hidden ${
                            status === AttendanceStatus.ABSENT ? 'bg-red-50 border-red-200' : 
                            status === AttendanceStatus.LATE ? 'bg-yellow-50 border-yellow-200' : 
                            'bg-white border-transparent hover:border-indigo-100 hover:shadow-md'
                        }`}
                    >
                        <div className="flex justify-between items-start z-10">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border-2 border-white ${
                                status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white' : 
                                status === AttendanceStatus.LATE ? 'bg-yellow-500 text-white' : 
                                'bg-indigo-600 text-white'
                            }`}>
                                {student.name.charAt(0)}
                            </div>
                            <div className="flex flex-col gap-1">
                                {bStatus === BehaviorStatus.POSITIVE && <div className="p-1 bg-green-500 text-white rounded-lg animate-bounce-in shadow-sm"><ThumbsUp size={12}/></div>}
                                {bStatus === BehaviorStatus.NEGATIVE && <div className="p-1 bg-red-500 text-white rounded-lg animate-bounce-in shadow-sm"><ThumbsDown size={12}/></div>}
                            </div>
                        </div>

                        <div className="z-10">
                            <h4 className="text-sm font-bold text-gray-800 line-clamp-1 mb-1">{student.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                {status === AttendanceStatus.ABSENT ? 'غائب' : status === AttendanceStatus.LATE ? 'متأخر' : 'حاضر'}
                            </p>
                        </div>
                        
                        <div className="absolute -bottom-4 -left-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                            {status === AttendanceStatus.ABSENT ? <XCircle size={100}/> : <CheckCircle size={100}/>}
                        </div>
                    </div>

                    {/* Quick Action Overlay Menu */}
                    {isMenuOpen && (
                        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-2xl border border-indigo-100 flex flex-col gap-2 animate-zoom-in">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-indigo-600">إجراء سريع</span>
                                <button onClick={() => setActiveStudentMenu(null)} className="p-1 text-gray-400 hover:text-red-500"><X size={14}/></button>
                            </div>
                            
                            <div className="flex gap-1 mb-2">
                                <button onClick={() => handleUpdate(student.id, AttendanceStatus.PRESENT)} className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${status===AttendanceStatus.PRESENT?'bg-green-600 text-white':'bg-green-50 text-green-700'}`}>حاضر</button>
                                <button onClick={() => handleUpdate(student.id, AttendanceStatus.ABSENT)} className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${status===AttendanceStatus.ABSENT?'bg-red-600 text-white':'bg-red-50 text-red-700'}`}>غائب</button>
                                <button onClick={() => handleUpdate(student.id, AttendanceStatus.LATE)} className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${status===AttendanceStatus.LATE?'bg-yellow-600 text-white':'bg-yellow-50 text-yellow-700'}`}>تأخر</button>
                            </div>

                            <div className="h-[1px] bg-gray-100 mb-1"></div>

                            <div className="grid grid-cols-1 gap-1 flex-1 overflow-y-auto custom-scrollbar pr-1">
                                {QUICK_BEHAVIORS.map(b => (
                                    <button 
                                      key={b.label}
                                      onClick={() => handleUpdate(student.id, status, b.status, b.label)}
                                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:scale-105 ${b.color}`}
                                    >
                                        {b.icon} {b.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
            <Users size={80} className="mb-4 opacity-20"/>
            <p className="text-xl font-bold">لا يوجد طلاب مطابقين للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
