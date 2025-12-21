
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, ScheduleItem, AcademicTerm } from '../types';
import { 
    CheckCircle, XCircle, Clock, Users, ChevronRight, ChevronLeft, 
    Search, CheckSquare, Sparkles, Star, ThumbsDown, BookOpen, 
    LayoutGrid, List, FilterX, Eye, CalendarDays, History, 
    Hash, Calendar as CalendarIcon, Info, AlertCircle, Save, 
    MoreHorizontal, UserCheck, UserCheck as Check, UserX, Book, Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSchedules, getAcademicTerms, getTeacherAssignments, getTeacherPeriodTimings } from '../services/storageService';

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
  const [selectedPeriod, setSelectedPeriod] = useState<number>(() => Number(localStorage.getItem('att_selected_period')) || 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>(() => (localStorage.getItem('att_view_mode') as any) || 'GRID');
  
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [periodTimings, setPeriodTimings] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser) {
        setSchedules(getSchedules().filter(s => s.teacherId === currentUser.id));
        setTerms(getAcademicTerms(currentUser.id));
        setPeriodTimings(getTeacherPeriodTimings(currentUser.id));
    }
  }, [currentUser]);

  useEffect(() => {
      localStorage.setItem('att_selected_date', selectedDate);
      localStorage.setItem('att_selected_class', selectedClass);
      localStorage.setItem('att_selected_period', selectedPeriod.toString());
      localStorage.setItem('att_view_mode', viewMode);
  }, [selectedDate, selectedClass, selectedPeriod, viewMode]);

  const dayOfWeekEn = useMemo(() => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[new Date(selectedDate).getDay()];
  }, [selectedDate]);

  const scheduledPeriods = useMemo(() => {
      if (!selectedClass) return [];
      return schedules.filter(s => s.day === dayOfWeekEn && s.classId === selectedClass)
                      .sort((a, b) => a.period - b.period);
  }, [schedules, dayOfWeekEn, selectedClass]);

  const currentSubject = useMemo(() => {
      const match = scheduledPeriods.find(p => p.period === selectedPeriod);
      return match ? match.subjectName : 'عام';
  }, [scheduledPeriods, selectedPeriod]);

  const currentTerm = useMemo(() => {
      return terms.find(t => t.isCurrent) || terms[0];
  }, [terms]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
    return Array.from(classes).sort();
  }, [students, currentUser]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = !selectedClass || s.className === selectedClass;
      const matchesSearch = !searchTerm || s.name.includes(searchTerm);
      return matchesClass && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass, searchTerm]);

  const currentPeriodRecords = useMemo(() => {
    return attendanceHistory.filter(a => a.date === selectedDate && a.period === selectedPeriod);
  }, [attendanceHistory, selectedDate, selectedPeriod]);

  const handleUpdate = (studentId: string, status: AttendanceStatus, bStatus?: BehaviorStatus, bNote?: string, pScore?: number) => {
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
      subject: currentSubject,
      termId: currentTerm?.id,
      behaviorStatus: bStatus || existing?.behaviorStatus || BehaviorStatus.NEUTRAL,
      behaviorNote: bNote || existing?.behaviorNote || '',
      participationScore: pScore !== undefined ? pScore : existing?.participationScore,
      createdById: currentUser?.id
    };
    onSaveAttendance([record]);
  };

  const isPeriodRecorded = (p: number) => {
    return attendanceHistory.some(a => a.date === selectedDate && a.period === p && (!selectedClass || students.find(s => s.id === a.studentId)?.className === selectedClass));
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in pb-24 font-tajawal">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 mb-6 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
                <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-2xl border border-indigo-100 w-full md:w-auto">
                    <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><ChevronRight size={18}/></button>
                    <div className="flex-1 flex items-center justify-center gap-2 font-black text-xs px-2 min-w-[140px]">
                        <CalendarIcon size={16} className="text-indigo-600"/>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent outline-none cursor-pointer" />
                    </div>
                    <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><ChevronLeft size={18}/></button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-full md:w-auto">
                    <Users size={18} className="text-slate-500 mr-2"/>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[120px] cursor-pointer">
                        <option value="">اختر الفصل...</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex gap-3 w-full lg:w-auto">
                <button onClick={() => setViewMode(viewMode === 'GRID' ? 'LIST' : 'GRID')} className="p-3.5 bg-white border-2 border-slate-50 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all">
                    {viewMode === 'GRID' ? <List size={22}/> : <LayoutGrid size={22}/>}
                </button>
                <button onClick={() => navigate('/reports')} className="hidden md:flex bg-white text-slate-700 px-6 py-3.5 rounded-2xl font-black text-xs items-center gap-2 border-2 border-slate-50 shadow-sm hover:bg-slate-50 transition-all"><History size={18}/> السجلات</button>
            </div>
        </div>

        <div className="pt-4 border-t border-gray-50 overflow-x-auto no-scrollbar relative z-10">
            {scheduledPeriods.length > 0 ? (
                <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 whitespace-nowrap">حصص اليوم:</span>
                    <div className="flex gap-3">
                        {scheduledPeriods.map(p => {
                            const isDone = isPeriodRecorded(p.period);
                            return (
                                <button 
                                    key={p.period} 
                                    onClick={() => setSelectedPeriod(p.period)} 
                                    className={`relative min-w-[100px] p-3 rounded-2xl font-black transition-all flex flex-col items-center justify-center border-2 ${selectedPeriod === p.period ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl scale-105' : 'bg-white text-slate-600 border-slate-50 hover:border-indigo-100'}`}
                                >
                                    <span className={`text-[9px] mb-1 font-black ${selectedPeriod === p.period ? 'text-indigo-200' : 'text-slate-400'}`}>حصة {p.period}</span>
                                    <span className="text-xs truncate max-w-[80px]">{p.subjectName}</span>
                                    {isDone && <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${selectedPeriod === p.period ? 'bg-emerald-400' : 'bg-emerald-500 shadow-sm'}`}><Check size={8} className="text-white"/></div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : <div className="text-xs text-slate-400 italic">يرجى اختيار الفصل لعرض الحصص...</div>}
        </div>

        <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
            <input className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" placeholder="بحث سريع عن طالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
        </div>
      </div>

      {/* Students List Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
            {filteredStudents.map(student => {
              const record = currentPeriodRecords.find(a => a.studentId === student.id);
              const isAbsent = record?.status === AttendanceStatus.ABSENT;
              const isPresent = record?.status === AttendanceStatus.PRESENT || record?.status === AttendanceStatus.LATE;
              const pScore = record?.participationScore || 0;

              return (
                <div key={student.id} className={`p-5 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between h-52 shadow-sm relative overflow-hidden ${isAbsent ? 'bg-red-50 border-red-200' : isPresent ? 'bg-white border-emerald-200 shadow-emerald-50' : 'bg-white border-transparent hover:border-indigo-100'}`}>
                    <div className="flex justify-between items-start relative z-10">
                        <div onClick={() => handleUpdate(student.id, isAbsent ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT)} className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg cursor-pointer ${isAbsent ? 'bg-red-600' : 'bg-indigo-600'}`}>
                            {student.name.charAt(0)}
                        </div>
                        <div className="flex flex-col gap-1">
                            {QUICK_BEHAVIORS.map(b => (
                                <button key={b.label} onClick={() => handleUpdate(student.id, record?.status || AttendanceStatus.PRESENT, b.status, b.label)} className={`p-1.5 rounded-lg border shadow-sm transition-transform active:scale-90 ${b.color}`} title={b.label}>{b.icon}</button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-2">
                        <h4 className="text-xs font-black text-slate-800 truncate">{student.name}</h4>
                        <div className="flex items-center gap-1 mt-3">
                            <span className="text-[9px] font-black text-slate-400 ml-2">تفاعل الحصة:</span>
                            {[1, 2, 3, 4, 5].map(star => (
                                <button 
                                    key={star} 
                                    onClick={() => handleUpdate(student.id, record?.status || AttendanceStatus.PRESENT, record?.behaviorStatus, record?.behaviorNote, star)}
                                    className={`transition-all ${star <= pScore ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                >
                                    <Star size={16} fill={star <= pScore ? 'currentColor' : 'none'}/>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isAbsent ? 'text-red-600 bg-red-50' : isPresent ? 'text-emerald-600 bg-emerald-50' : 'text-slate-300'}`}>
                            {isAbsent ? 'غائب' : isPresent ? 'حاضر' : 'لم يتم التحضير'}
                        </span>
                        <button onClick={() => navigate('/followup', {state: {studentId: student.id}})} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg"><Eye size={16}/></button>
                    </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="fixed bottom-20 left-6 right-6 md:right-80 bg-indigo-900 text-white p-4 rounded-3xl shadow-2xl flex justify-between items-center z-40 animate-slide-up">
            <div className="flex items-center gap-6 px-4">
                <span className="text-[10px] font-bold uppercase opacity-80">المادة: {currentSubject}</span>
                <span className="text-[10px] font-bold uppercase opacity-80">تم التحضير: {currentPeriodRecords.length} / {filteredStudents.length}</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-2xl">
                <Database size={14} className="text-blue-400"/>
                <span className="text-xs font-black">حصة {selectedPeriod}</span>
            </div>
      </div>
    </div>
  );
};

export default Attendance;
