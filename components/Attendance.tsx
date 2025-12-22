
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, ScheduleItem } from '../types';
import { 
    CheckCircle, XCircle, Clock, Users, ChevronRight, ChevronLeft, 
    Search, Sparkles, Star, ThumbsDown, BookOpen, 
    LayoutGrid, List, Eye, Calendar as CalendarIcon, 
    Zap, Loader2, ShieldCheck, UserCheck, Timer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSchedules, getTeacherAssignments, getTeacherPeriodTimings, getWeeklyPlans, saveAttendance } from '../services/storageService';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const QUICK_BEHAVIORS = [
    { label: 'مشاركة ممتازة', status: BehaviorStatus.POSITIVE, icon: <Sparkles size={14}/>, color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
    { label: 'سلوك منضبط', status: BehaviorStatus.POSITIVE, icon: <ShieldCheck size={14}/>, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { label: 'مشاغبة/تشتت', status: BehaviorStatus.NEGATIVE, icon: <ThumbsDown size={14}/>, color: 'text-red-600 bg-red-50 border-red-100' },
];

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, currentUser }) => {
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAutoDetected, setIsAutoDetected] = useState(false);

  // Load schedule data
  const mySchedules = useMemo(() => {
      if (!currentUser) return [];
      return getSchedules().filter(s => s.teacherId === currentUser.id);
  }, [currentUser]);

  // 1. Auto-detect current session
  useEffect(() => {
      if (!currentUser || isAutoDetected) return;
      
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const timings = getTeacherPeriodTimings(currentUser.id);
      const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });

      // Find which period we are in based on time
      const currentPeriodIdx = timings.findIndex(t => {
          const [start, end] = t.split(' - ');
          return currentTime >= start && currentTime <= end;
      });

      if (currentPeriodIdx !== -1) {
          const periodNum = currentPeriodIdx + 1;
          const session = mySchedules.find(s => s.day === dayName && s.period === periodNum);
          
          if (session) {
              setSelectedPeriod(periodNum);
              setSelectedClass(session.classId);
              setSelectedSubject(session.subjectName);
              setIsAutoDetected(true);
          }
      }
  }, [currentUser, mySchedules, isAutoDetected]);

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
    return attendanceHistory.filter(a => a.date === selectedDate && a.period === selectedPeriod && a.subject === selectedSubject);
  }, [attendanceHistory, selectedDate, selectedPeriod, selectedSubject]);

  const handleUpdate = (studentId: string, status: AttendanceStatus, bStatus?: BehaviorStatus, pScore?: number) => {
    const existing = attendanceHistory.find(a => 
      a.studentId === studentId && 
      a.date === selectedDate && 
      a.period === selectedPeriod &&
      a.subject === selectedSubject
    );

    const record: AttendanceRecord = {
      id: existing?.id || `${studentId}-${selectedDate}-${selectedPeriod}-${Date.now()}`,
      studentId,
      date: selectedDate,
      period: selectedPeriod,
      subject: selectedSubject,
      status,
      behaviorStatus: bStatus || existing?.behaviorStatus || BehaviorStatus.NEUTRAL,
      participationScore: pScore !== undefined ? pScore : (existing?.participationScore || 0),
      createdById: currentUser?.id
    };
    onSaveAttendance([record]);
  };

  const markAllPresent = () => {
      const records: AttendanceRecord[] = filteredStudents.map(s => {
          const existing = currentPeriodRecords.find(a => a.studentId === s.id);
          return {
            id: existing?.id || `${s.id}-${selectedDate}-${selectedPeriod}-${Date.now()}`,
            studentId: s.id,
            date: selectedDate,
            period: selectedPeriod,
            subject: selectedSubject,
            status: AttendanceStatus.PRESENT,
            createdById: currentUser?.id
          };
      });
      onSaveAttendance(records);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-[#F9FAFB] animate-fade-in pb-24 font-tajawal">
      
      {/* 🧭 Header: Context & Detection */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500"></div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-black text-gray-800">تحضير الحصة</h2>
                    {isAutoDetected && (
                        <span className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-lg text-[10px] font-black border border-green-100 animate-pulse">
                            <Zap size={10} fill="currentColor"/> تم الكشف التلقائي
                        </span>
                    )}
                </div>
                <p className="text-gray-400 text-xs font-bold flex items-center gap-2">
                    <Clock size={14}/> {formatDualDate(selectedDate)}
                </p>
            </div>

            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                {/* selectors */}
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                    <Users size={16} className="text-gray-400 mr-2"/>
                    <select value={selectedClass} onChange={e => {setSelectedClass(e.target.value); setIsAutoDetected(false);}} className="bg-transparent font-black text-xs outline-none min-w-[100px] cursor-pointer text-gray-700">
                        <option value="">الفصل...</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="w-px h-6 bg-gray-200 mx-1"></div>
                    <BookOpen size={16} className="text-gray-400"/>
                    <select value={selectedSubject} onChange={e => {setSelectedSubject(e.target.value); setIsAutoDetected(false);}} className="bg-transparent font-black text-xs outline-none min-w-[100px] cursor-pointer text-indigo-600">
                        <option value="">المادة...</option>
                        {mySchedules.filter(s => !selectedClass || s.classId === selectedClass).map(s => <option key={s.id} value={s.subjectName}>{s.subjectName}</option>)}
                    </select>
                    <div className="w-px h-6 bg-gray-200 mx-1"></div>
                    <Timer size={16} className="text-gray-400"/>
                    <select value={selectedPeriod} onChange={e => {setSelectedPeriod(Number(e.target.value)); setIsAutoDetected(false);}} className="bg-transparent font-black text-xs outline-none cursor-pointer">
                        {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>ح{p}</option>)}
                    </select>
                </div>

                <button onClick={markAllPresent} disabled={!selectedClass || !selectedSubject} className="flex-1 lg:flex-none px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50">
                    تحضير الجميع (حاضر)
                </button>
            </div>
        </div>

        <div className="mt-6 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18}/>
            <input 
                className="w-full pr-12 pl-4 py-3.5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-gray-300" 
                placeholder="ابحث عن طالب بالاسم..." 
                value={searchTerm} 
                onChange={e=>setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* 📋 Student Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
            {filteredStudents.map(student => {
              const record = currentPeriodRecords.find(a => a.studentId === student.id);
              const status = record?.status || null;
              const pScore = record?.participationScore || 0;

              return (
                <div key={student.id} className={`p-4 rounded-[2rem] border-2 transition-all flex flex-col justify-between h-48 shadow-sm relative overflow-hidden group ${status === AttendanceStatus.ABSENT ? 'bg-red-50 border-red-200' : status ? 'bg-white border-emerald-100' : 'bg-white border-transparent hover:border-gray-200'}`}>
                    
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-colors ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white' : status === AttendanceStatus.LATE ? 'bg-amber-500 text-white' : status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {student.name.charAt(0)}
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-gray-800 line-clamp-1">{student.name}</h4>
                                <div className="flex items-center gap-1 mt-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star 
                                            key={star} 
                                            size={12} 
                                            onClick={() => handleUpdate(student.id, status || AttendanceStatus.PRESENT, undefined, star)}
                                            className={`cursor-pointer transition-all ${star <= pScore ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {QUICK_BEHAVIORS.map(b => (
                            <button 
                                key={b.label} 
                                onClick={() => handleUpdate(student.id, status || AttendanceStatus.PRESENT, b.status)}
                                className={`p-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 flex items-center gap-1 text-[9px] font-black ${record?.behaviorStatus === b.status ? 'ring-2 ring-indigo-500 ring-offset-1' : ''} ${b.color}`}
                                title={b.label}
                            >
                                {b.icon} <span className="hidden group-hover:inline">{b.label}</span>
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                        <button 
                            onClick={() => handleUpdate(student.id, AttendanceStatus.PRESENT)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-gray-100 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                        >
                            <CheckCircle size={14}/> حاضر
                        </button>
                        <button 
                            onClick={() => handleUpdate(student.id, AttendanceStatus.ABSENT)}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600'}`}
                        >
                            <XCircle size={14}/> غائب
                        </button>
                        <button 
                            onClick={() => handleUpdate(student.id, AttendanceStatus.LATE)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${status === AttendanceStatus.LATE ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-600'}`}
                        >
                            <Clock size={14}/> متأخر
                        </button>
                    </div>
                </div>
              );
            })}
        </div>
        
        {filteredStudents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <Users size={64}/>
                <p className="font-black mt-4">لا يوجد طلاب في هذا الفصل حالياً</p>
            </div>
        )}
      </div>

      {/* ℹ️ Helper Footer */}
      <div className="fixed bottom-24 left-6 right-6 lg:left-80 lg:right-6 pointer-events-none">
          <div className="flex justify-end gap-2">
            <div className="bg-indigo-900 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-slide-up pointer-events-auto">
                <Users size={16} className="text-indigo-400"/>
                حضر: {currentPeriodRecords.filter(r=>r.status===AttendanceStatus.PRESENT).length}
                <div className="w-px h-4 bg-white/20"></div>
                غاب: {currentPeriodRecords.filter(r=>r.status===AttendanceStatus.ABSENT).length}
            </div>
          </div>
      </div>
    </div>
  );
};

// Utility to match original logic
const formatDualDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

export default Attendance;
