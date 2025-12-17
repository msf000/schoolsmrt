
import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, DayOfWeek, BehaviorStatus, PerformanceRecord, SystemUser, AcademicTerm } from '../types';
import { getSchedules, getAcademicTerms, getTeacherAssignments } from '../services/storageService';
import { formatDualDate } from '../services/dateService';
// Fix: Added XCircle to the list of imports from lucide-react
import { Calendar, Save, CheckCircle, FileSpreadsheet, Users, CheckSquare, Clock, CalendarClock, Smile, Frown, MessageSquare, Plus, X, List, RefreshCw, CalendarDays, History, Loader2, Cloud, Sparkles, Star, ThumbsUp, ThumbsDown, BookOpen, PenTool, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  performance?: PerformanceRecord[]; 
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  onImportAttendance: (records: AttendanceRecord[]) => void;
  preSelectedClass?: string;
  preSelectedSubject?: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  currentUser?: SystemUser | null; 
  onNavigate?: (view: string) => void; 
}

const QUICK_BEHAVIORS = [
    { label: 'مشاركة ممتازة', status: BehaviorStatus.POSITIVE, icon: <Sparkles size={14}/>, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'حل الواجب', status: BehaviorStatus.POSITIVE, icon: <CheckCircle size={14}/>, color: 'text-green-600 bg-green-50' },
    { label: 'سلوك منضبط', status: BehaviorStatus.POSITIVE, icon: <Star size={14}/>, color: 'text-blue-600 bg-blue-50' },
    { label: 'مشاغبة', status: BehaviorStatus.NEGATIVE, icon: <Frown size={14}/>, color: 'text-red-600 bg-red-50' },
    { label: 'بدون كتاب', status: BehaviorStatus.NEGATIVE, icon: <BookOpen size={14}/>, color: 'text-orange-600 bg-orange-50' },
];

const Attendance: React.FC<AttendanceProps> = ({ 
    students, 
    attendanceHistory, 
    onSaveAttendance, 
    selectedDate: propDate, 
    onDateChange,
    currentUser,
    selectedClass: preClass
}) => {
  const navigate = useNavigate();
  const [internalDate, setInternalDate] = useState(new Date().toISOString().split('T')[0]);
  const selectedDate = propDate !== undefined ? propDate : internalDate;
  
  const [selectedClass, setSelectedClass] = useState(preClass || '');
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [behaviorRecords, setBehaviorRecords] = useState<Record<string, BehaviorStatus>>({});
  const [noteRecords, setNoteRecords] = useState<Record<string, string>>({});
  const [activeStudentMenu, setActiveStudentMenu] = useState<string | null>(null);

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass]);

  useEffect(() => {
    if (filteredStudents.length > 0) {
        const todayRecs = attendanceHistory.filter(a => a.date === selectedDate);
        const initialRecs: any = {};
        const initialBeh: any = {};
        const initialNotes: any = {};
        filteredStudents.forEach(s => {
            const found = todayRecs.find(r => r.studentId === s.id);
            initialRecs[s.id] = found ? found.status : AttendanceStatus.PRESENT;
            initialBeh[s.id] = found?.behaviorStatus || BehaviorStatus.NEUTRAL;
            initialNotes[s.id] = found?.behaviorNote || '';
        });
        setRecords(initialRecs);
        setBehaviorRecords(initialBeh);
        setNoteRecords(initialNotes);
    }
  }, [selectedClass, selectedDate]);

  const handleUpdate = (studentId: string, status: AttendanceStatus, bStatus?: BehaviorStatus, bNote?: string) => {
      const record: AttendanceRecord = {
          id: `${studentId}-${selectedDate}`,
          studentId,
          date: selectedDate,
          status,
          behaviorStatus: bStatus || behaviorRecords[studentId] || BehaviorStatus.NEUTRAL,
          behaviorNote: bNote || noteRecords[studentId] || '',
          createdById: currentUser?.id
      };
      onSaveAttendance([record]);
      setRecords(prev => ({...prev, [studentId]: status}));
      if (bStatus) setBehaviorRecords(prev => ({...prev, [studentId]: bStatus}));
      if (bNote) setNoteRecords(prev => ({...prev, [studentId]: bNote}));
      setActiveStudentMenu(null);
  };

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50 animate-fade-in relative pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><CheckSquare size={20}/></div>
              <select 
                value={selectedClass} 
                onChange={e => setSelectedClass(e.target.value)}
                className="font-bold text-gray-800 bg-transparent outline-none border-none cursor-pointer"
              >
                  <option value="">-- اختر الفصل --</option>
                  {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
          </div>
          <div className="flex items-center gap-3 bg-gray-100 p-1.5 rounded-xl border">
              <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  handleUpdateDate(d.toISOString().split('T')[0]);
              }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={16}/></button>
              <input type="date" value={selectedDate} onChange={e => handleUpdateDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none cursor-pointer"/>
              <button onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  handleUpdateDate(d.toISOString().split('T')[0]);
              }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={16}/></button>
          </div>
      </div>

      {/* Students Grid */}
      {selectedClass ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredStudents.map(student => {
                  const status = records[student.id] || AttendanceStatus.PRESENT;
                  const bStatus = behaviorRecords[student.id];
                  const bNote = noteRecords[student.id];
                  const isMenuOpen = activeStudentMenu === student.id;

                  return (
                      <div key={student.id} className="relative group">
                          <div 
                              onClick={() => setActiveStudentMenu(isMenuOpen ? null : student.id)}
                              className={`p-4 rounded-[1.5rem] border-2 transition-all duration-300 cursor-pointer h-40 flex flex-col justify-between shadow-sm relative overflow-hidden ${
                                  status === 'ABSENT' ? 'bg-red-50 border-red-200' : 
                                  status === 'LATE' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-transparent hover:border-indigo-100'
                              }`}
                          >
                              {/* Quick Status Badges */}
                              <div className="flex justify-between items-start z-10">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 border-white shadow-sm ${
                                      status === 'ABSENT' ? 'bg-red-500 text-white' : status === 'LATE' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                                  }`}>
                                      {student.name.charAt(0)}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                      {bStatus === BehaviorStatus.POSITIVE && <div className="p-1 bg-green-500 text-white rounded-lg animate-bounce-in"><ThumbsUp size={12}/></div>}
                                      {bStatus === BehaviorStatus.NEGATIVE && <div className="p-1 bg-red-500 text-white rounded-lg animate-bounce-in"><ThumbsDown size={12}/></div>}
                                  </div>
                              </div>

                              <div className="z-10">
                                  <h4 className="text-sm font-bold text-gray-800 line-clamp-2 mb-1">{student.name}</h4>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{status === 'ABSENT' ? 'غائب' : status === 'LATE' ? 'متأخر' : 'حاضر'}</p>
                              </div>

                              {/* Decorative background emoji */}
                              <div className="absolute -bottom-2 -left-2 opacity-5 scale-150 rotate-12 transition-transform group-hover:scale-110">
                                  {status === 'ABSENT' ? <XCircle size={80}/> : <CheckCircle size={80}/>}
                              </div>
                          </div>

                          {/* Quick Action Overlay Menu */}
                          {isMenuOpen && (
                              <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm rounded-[1.5rem] p-3 shadow-2xl border border-indigo-100 flex flex-col gap-2 animate-zoom-in">
                                  <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-black text-indigo-600">إجراء سريع</span>
                                      <button onClick={() => setActiveStudentMenu(null)} className="p-1 text-gray-400 hover:text-red-500"><X size={14}/></button>
                                  </div>
                                  
                                  {/* Attendance Toggles */}
                                  <div className="flex gap-1 mb-2">
                                      <button onClick={() => handleUpdate(student.id, AttendanceStatus.PRESENT)} className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${status==='PRESENT'?'bg-green-600 text-white':'bg-green-50 text-green-700'}`}>حاضر</button>
                                      <button onClick={() => handleUpdate(student.id, AttendanceStatus.ABSENT)} className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${status==='ABSENT'?'bg-red-600 text-white':'bg-red-50 text-red-700'}`}>غائب</button>
                                      <button onClick={() => handleUpdate(student.id, AttendanceStatus.LATE)} className={`flex-1 py-1 rounded-lg text-[10px] font-bold ${status==='LATE'?'bg-yellow-600 text-white':'bg-yellow-50 text-yellow-700'}`}>تأخر</button>
                                  </div>

                                  <div className="h-[1px] bg-gray-100 mb-1"></div>

                                  {/* Quick Behaviors */}
                                  <div className="grid grid-cols-1 gap-1 flex-1 overflow-y-auto custom-scrollbar pr-1">
                                      {QUICK_BEHAVIORS.map(b => (
                                          <button 
                                            key={b.label}
                                            onClick={() => handleUpdate(student.id, status, b.status, b.label)}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all hover:scale-105 ${b.color} ${bNote === b.label ? 'ring-1 ring-offset-1 ring-indigo-500' : ''}`}
                                          >
                                              {b.icon} {b.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  )
              })}
          </div>
      ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-50">
              <Users size={80} className="mb-4"/>
              <p className="text-xl font-black">اختر فصلاً لبدء عملية التحضير</p>
          </div>
      )}
    </div>
  );

  function handleUpdateDate(newDate: string) {
      if (onDateChange) onDateChange(newDate);
      else setInternalDate(newDate);
  }
};

const ChevronLeft = ({size}:any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const ChevronRight = ({size}:any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;

export default Attendance;
