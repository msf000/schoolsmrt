
import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, ScheduleItem, DayOfWeek, BehaviorStatus, PerformanceRecord, SystemUser, AcademicTerm } from '../types';
import { getSchedules, getAcademicTerms, getTeacherAssignments } from '../services/storageService';
import { formatDualDate } from '../services/dateService';
import { Calendar, Save, CheckCircle, FileSpreadsheet, Users, CheckSquare, Clock, CalendarClock, School, ArrowRight, Smile, Frown, MessageSquare, Plus, X, Inbox, FileText, Check, LayoutGrid, List, RefreshCw, CalendarDays, History, Printer, Loader2, Cloud, Flame, PieChart } from 'lucide-react';
import * as XLSX from 'xlsx';
import DataImport from './DataImport';
import AIDataImport from './AIDataImport';
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

const DEFAULT_POSITIVE_NOTES = [
    'مشاركة متميزة', 'حل الواجبات', 'انضباط سلوكي', 'مساعدة الزملاء', 
    'إجابة نموذجية', 'نظافة وترتيب', 'إحضار الأدوات', 'تفاعل إيجابي'
];

const DEFAULT_NEGATIVE_NOTES = [
    'كثير الكلام', 'إزعاج الفصل', 'عدم حل الواجب', 'نسيان الكتاب/الأدوات', 
    'نوم داخل الفصل', 'تأخر عن الحصة', 'استخدام الهاتف', 'عدم الانتباه'
];

const Attendance: React.FC<AttendanceProps> = ({ 
    students, 
    attendanceHistory, 
    performance = [], 
    onSaveAttendance, 
    onImportAttendance, 
    preSelectedClass, 
    preSelectedSubject, 
    selectedDate: propDate, 
    onDateChange,
    currentUser,
    onNavigate
}) => {
  const navigate = useNavigate();
  const isManager = currentUser?.role === 'SCHOOL_MANAGER';

  if (!students) {
      return (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <Loader2 className="animate-spin text-primary mb-4" size={48}/>
              <p className="text-gray-500 font-bold">جاري تحميل بيانات الطلاب...</p>
          </div>
      );
  }

  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'WEEKLY' | 'LOG'>(() => {
      const saved = localStorage.getItem('attendance_active_tab');
      if (saved) return saved as any;
      return isManager ? 'LOG' : 'REGISTER';
  });

  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('GRID'); 
  const [internalDate, setInternalDate] = useState(new Date().toISOString().split('T')[0]);
  const selectedDate = propDate !== undefined ? propDate : internalDate;
  
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [behaviorRecords, setBehaviorRecords] = useState<Record<string, BehaviorStatus>>({});
  const [noteRecords, setNoteRecords] = useState<Record<string, string>>({});
  const [excuseRecords, setExcuseRecords] = useState<Record<string, string>>({}); // New: Store excuses
  const [activeNoteStudent, setActiveNoteStudent] = useState<string | null>(null);
  const [viewingStudentReport, setViewingStudentReport] = useState<Student | null>(null);

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false); 
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedClass, setSelectedClass] = useState(preSelectedClass || '');
  const [selectedSubject, setSelectedSubject] = useState(preSelectedSubject || '');
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  
  const [manualClass, setManualClass] = useState('');
  const [manualSubject, setManualSubject] = useState('');
  
  // Weekly View State
  const [weekStartDate, setWeekStartDate] = useState(() => {
      const d = new Date(selectedDate);
      const day = d.getDay(); 
      d.setDate(d.getDate() - day); 
      return d.toISOString().split('T')[0];
  });

  // Filter States
  const [logFilterClass, setLogFilterClass] = useState('');
  const [logFilterDateStart, setLogFilterDateStart] = useState(() => {
      const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [logFilterDateEnd, setLogFilterDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [logSearch, setLogSearch] = useState('');
  
  // Terms State
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // --- EFFECTS ---
  useEffect(() => {
      localStorage.setItem('attendance_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    setSchedules(getSchedules());
    setTerms(getAcademicTerms(currentUser?.id));
  }, [currentUser]);

  useEffect(() => {
      if(preSelectedClass) setSelectedClass(preSelectedClass);
      if(preSelectedSubject) setSelectedSubject(preSelectedSubject);
  }, [preSelectedClass, preSelectedSubject]);

  const handleDateChange = (newDate: string) => {
      if (onDateChange) onDateChange(newDate);
      else setInternalDate(newDate);
      setSelectedPeriod(null);
      if (!preSelectedClass) setSelectedClass(''); 
  };

  const filteredStudents = useMemo(() => {
    if (!selectedClass || !students) return [];
    return students.filter(student => {
        const studentKey = student.classId || student.className || student.gradeLevel;
        if (studentKey !== selectedClass && student.className !== selectedClass) return false;
        return true;
    }).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass]);

  // Real-time Stats Calculation
  const liveStats = useMemo(() => {
      let p = 0, a = 0, l = 0, e = 0;
      // We iterate over filteredStudents to ensure we count current view
      filteredStudents.forEach(s => {
          const status = records[s.id]; // Will be undefined initially, meaning PRESENT usually or wait for useEffect
          if (status === 'PRESENT') p++;
          else if (status === 'ABSENT') a++;
          else if (status === 'LATE') l++;
          else if (status === 'EXCUSED') e++;
          else p++; // Default count as present if not set
      });
      const total = filteredStudents.length;
      return { p, a, l, e, total };
  }, [records, filteredStudents]);

  // Sync records from history when selection changes
  useEffect(() => {
    if (filteredStudents.length === 0 || selectedPeriod === null) {
        setRecords({});
        setBehaviorRecords({});
        setNoteRecords({});
        setExcuseRecords({});
        return;
    }
    const existing = attendanceHistory.filter(a => {
        const p = a.period !== undefined ? Number(a.period) : 0;
        const sp = Number(selectedPeriod);
        return a.date === selectedDate && p === sp && a.studentId;
    });
    const initialRecs: Record<string, AttendanceStatus> = {};
    const initialBeh: Record<string, BehaviorStatus> = {};
    const initialNotes: Record<string, string> = {};
    const initialExcuses: Record<string, string> = {};

    filteredStudents.forEach(s => {
      const found = existing.find(r => r.studentId === s.id);
      initialRecs[s.id] = found ? found.status : AttendanceStatus.PRESENT;
      initialBeh[s.id] = found && found.behaviorStatus ? found.behaviorStatus : BehaviorStatus.NEUTRAL;
      initialNotes[s.id] = found && found.behaviorNote ? found.behaviorNote : '';
      initialExcuses[s.id] = found && found.excuseNote ? found.excuseNote : '';
    });
    setRecords(initialRecs);
    setBehaviorRecords(initialBeh);
    setNoteRecords(initialNotes);
    setExcuseRecords(initialExcuses);
    setSaved(false);
  }, [selectedDate, selectedPeriod, selectedClass, filteredStudents, attendanceHistory]);

  // --- HELPERS ---
  const uniqueClasses = useMemo(() => {
      const studentClasses = new Set(students.map(s => s.className).filter(Boolean));
      // Merge with manually defined classes from Settings
      const definedClasses = getTeacherAssignments(currentUser?.id).map(a => a.classId);
      definedClasses.forEach(c => studentClasses.add(c));
      
      return Array.from(studentClasses).sort();
  }, [students, currentUser]);

  const saveSingleRecord = (studentId: string, updates: Partial<AttendanceRecord>) => {
      if (selectedPeriod === null) return;
      setIsSaving(true);
      const periodSuffix = selectedPeriod ? `-${selectedPeriod}` : '-0';
      const recordId = `${studentId}-${selectedDate}-${selectedSubject || 'manual'}${periodSuffix}`;
      
      const currentStatus = records[studentId] || AttendanceStatus.PRESENT;
      const currentBehavior = behaviorRecords[studentId] || BehaviorStatus.NEUTRAL;
      const currentNote = noteRecords[studentId] || '';
      const currentExcuse = excuseRecords[studentId] || '';

      const record: AttendanceRecord = {
          id: recordId,
          studentId: studentId,
          date: selectedDate,
          status: updates.status || currentStatus,
          subject: selectedSubject,
          period: selectedPeriod || undefined,
          behaviorStatus: updates.behaviorStatus !== undefined ? updates.behaviorStatus : currentBehavior,
          behaviorNote: updates.behaviorNote !== undefined ? updates.behaviorNote : currentNote,
          excuseNote: currentExcuse,
          createdById: currentUser?.id
      };

      onSaveAttendance([record]);
      setTimeout(() => setIsSaving(false), 500);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    saveSingleRecord(studentId, { status });
  };

  // For weekly view quick toggle
  const handleWeeklyStatusToggle = (studentId: string, dateStr: string) => {
      const currentRec = attendanceHistory.find(r => r.studentId === studentId && r.date === dateStr);
      const currentStatus = currentRec ? currentRec.status : AttendanceStatus.PRESENT; // Default if not found
      
      let nextStatus = AttendanceStatus.PRESENT;
      if (currentStatus === AttendanceStatus.PRESENT) nextStatus = AttendanceStatus.ABSENT;
      else if (currentStatus === AttendanceStatus.ABSENT) nextStatus = AttendanceStatus.LATE;
      else if (currentStatus === AttendanceStatus.LATE) nextStatus = AttendanceStatus.EXCUSED;
      else nextStatus = AttendanceStatus.PRESENT;

      const newRecord: AttendanceRecord = {
          id: currentRec ? currentRec.id : `${studentId}-${dateStr}-auto`,
          studentId,
          date: dateStr,
          status: nextStatus,
          subject: manualSubject, // Use context if needed or leave blank
          createdById: currentUser?.id
      };
      onSaveAttendance([newRecord]);
  };

  const handleBehaviorChange = (studentId: string, status: BehaviorStatus) => {
      const current = behaviorRecords[studentId];
      const next = current === status ? BehaviorStatus.NEUTRAL : status;
      setBehaviorRecords(prev => ({ ...prev, [studentId]: next }));
      saveSingleRecord(studentId, { behaviorStatus: next });
  };

  const handleMarkAll = (status: AttendanceStatus) => {
      const newRecords = { ...records };
      const bulkToSave: AttendanceRecord[] = [];
      const periodSuffix = selectedPeriod ? `-${selectedPeriod}` : '-0';

      filteredStudents.forEach(student => {
          newRecords[student.id] = status;
          bulkToSave.push({
              id: `${student.id}-${selectedDate}-${selectedSubject || 'manual'}${periodSuffix}`,
              studentId: student.id,
              date: selectedDate,
              status: status,
              subject: selectedSubject,
              period: selectedPeriod || undefined,
              behaviorStatus: behaviorRecords[student.id] || BehaviorStatus.NEUTRAL,
              behaviorNote: noteRecords[student.id] || '',
              excuseNote: excuseRecords[student.id] || '',
              createdById: currentUser?.id
          });
      });
      setRecords(newRecords);
      onSaveAttendance(bulkToSave);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
  };

  const navigateToStudent = (studentId: string) => {
      navigate('/followup', { state: { studentId } });
  };

  // --- RENDER ---
  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col relative bg-gray-50">
      
      {/* Header Tabs */}
      <div className="flex justify-between items-center mb-4 print:hidden">
          <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm overflow-x-auto w-full md:w-auto">
              {!isManager && (
                  <button onClick={() => setActiveTab('REGISTER')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'REGISTER' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                      <CheckSquare size={18}/> <span className="hidden md:inline">تسجيل الحضور</span><span className="md:hidden">تسجيل</span>
                  </button>
              )}
              <button onClick={() => setActiveTab('WEEKLY')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'WEEKLY' ? 'bg-teal-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <CalendarDays size={18}/> <span className="hidden md:inline">عرض أسبوعي</span><span className="md:hidden">أسبوعي</span>
              </button>
              <button onClick={() => setActiveTab('LOG')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'LOG' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <History size={18}/> <span className="hidden md:inline">السجل الشامل</span><span className="md:hidden">السجل</span>
              </button>
          </div>

          {!isManager && (
             <div className="flex items-center gap-2">
                <button onClick={() => setIsImportModalOpen(true)} className="hidden md:flex bg-white hover:bg-gray-50 text-gray-600 px-3 py-2 border rounded-lg items-center gap-2 text-sm font-bold"><FileSpreadsheet size={18} /><span className="hidden md:inline">Excel</span></button>
                <button onClick={() => setIsAIImportModalOpen(true)} className="hidden md:flex bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg items-center gap-2 text-sm font-bold"><Cloud size={18} /><span className="hidden md:inline">AI Import</span></button>
             </div>
          )}
      </div>

      {/* --- REGISTER TAB --- */}
      {activeTab === 'REGISTER' && !isManager && (
          <div className="space-y-6 flex-1 overflow-auto pb-20">
              {/* Date & Stats Header */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-800">تحضير اليوم:</h2>
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border group hover:border-indigo-500 transition-colors">
                        <Calendar size={20} className="text-gray-500 group-hover:text-indigo-500" />
                        <input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)} className="outline-none text-gray-700 bg-transparent text-sm font-bold cursor-pointer"/>
                    </div>
                    <span className="text-sm text-gray-400 hidden md:inline">{formatDualDate(selectedDate)}</span>
                </div>
                {selectedClass && selectedPeriod !== null && (
                    <div className="flex items-center gap-4">
                        {isSaving && <span className="text-xs font-bold text-blue-600 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> جاري الحفظ...</span>}
                        {saved && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><Check size={12}/> تم الحفظ</span>}
                    </div>
                )}
              </div>

              {/* Class/Period Selection */}
              {!selectedClass ? (
                  <div className="animate-fade-in space-y-6">
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end justify-center h-64 flex-col">
                           <h3 className="text-xl font-bold text-gray-700 mb-4">بدء جلسة تحضير جديدة</h3>
                           <div className="flex gap-4">
                               <div className="flex flex-col">
                                   <label className="block text-xs font-bold text-gray-500 mb-1">اختر الفصل</label>
                                   <select className="p-2 border rounded-lg text-sm w-48 bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" value={manualClass} onChange={e => setManualClass(e.target.value)}>
                                       <option value="">-- اختر --</option>
                                       {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                               </div>
                               <div className="flex flex-col">
                                   <label className="block text-xs font-bold text-gray-500 mb-1">المادة (اختياري)</label>
                                   <input className="p-2 border rounded-lg text-sm w-48 bg-gray-50 outline-none focus:ring-2 focus:ring-indigo-500" value={manualSubject} onChange={e => setManualSubject(e.target.value)} placeholder="مثال: رياضيات"/>
                               </div>
                           </div>
                           <button 
                              disabled={!manualClass}
                              onClick={() => { setSelectedClass(manualClass); setSelectedSubject(manualSubject); setSelectedPeriod(0); }}
                              className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg"
                           >
                               فتح السجل
                           </button>
                      </div>
                  </div>
              ) : (
                // --- ACTIVE REGISTER ---
                <div id="attendance-workspace" className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-slide-up flex-1 flex flex-col mb-16 md:mb-0">
                    <div className="bg-indigo-900 p-4 flex justify-between items-center text-white sticky top-0 z-20">
                        <div className="flex items-center gap-4">
                            <button onClick={() => { setSelectedClass(''); setSelectedPeriod(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowRight size={20}/></button>
                            <div>
                                <div className="flex items-center gap-2 font-bold text-lg"><span>{selectedClass}</span><span className="opacity-50">|</span><span>{selectedSubject || 'عام'}</span></div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded ${viewMode === 'GRID' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/10'}`}><LayoutGrid size={16}/></button>
                            <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded ${viewMode === 'LIST' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/10'}`}><List size={16}/></button>
                            <div className="w-[1px] bg-white/20 mx-1"></div>
                            <button onClick={() => handleMarkAll(AttendanceStatus.PRESENT)} className="hidden md:flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700">تحضير الكل</button>
                        </div>
                    </div>

                    {/* --- Live Stats Bar --- */}
                    <div className="bg-indigo-50 border-b border-indigo-100 p-3 grid grid-cols-4 gap-2 text-center sticky top-[64px] z-10">
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-green-600">{liveStats.p}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase">حضور</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-red-600">{liveStats.a}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase">غياب</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-yellow-600">{liveStats.l}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase">تأخر</span>
                        </div>
                        <div className="flex flex-col border-r border-indigo-200">
                            <span className="text-xl font-black text-indigo-900">{liveStats.total}</span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase">الإجمالي</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar">
                        {filteredStudents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Users size={48} className="mb-4 opacity-20"/>
                                <p className="font-bold">لا يوجد طلاب في هذا الفصل</p>
                                <p className="text-sm mt-2">انتقل لصفحة "الطلاب" لإضافتهم إلى {selectedClass}</p>
                            </div>
                        ) : viewMode === 'GRID' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {filteredStudents.map(student => {
                                    const status = records[student.id] || AttendanceStatus.PRESENT;
                                    const behavior = behaviorRecords[student.id];
                                    const excuse = excuseRecords[student.id];
                                    
                                    // Calculate Cycle: Present -> Absent -> Late -> Present
                                    const toggleStatus = () => {
                                        const next = status === AttendanceStatus.PRESENT ? AttendanceStatus.ABSENT : 
                                                     status === AttendanceStatus.ABSENT ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
                                        handleStatusChange(student.id, next);
                                    };

                                    return (
                                        <div 
                                            key={student.id}
                                            className={`relative p-3 rounded-xl border shadow-sm cursor-pointer transition-all duration-200 select-none flex flex-col justify-between h-32 hover:shadow-md ${
                                                status === AttendanceStatus.ABSENT ? 'bg-red-50 border-red-300 ring-1 ring-red-200' : 
                                                status === AttendanceStatus.LATE ? 'bg-yellow-50 border-yellow-300' : 
                                                status === AttendanceStatus.EXCUSED ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                                            }`}
                                            onClick={toggleStatus}
                                        >
                                            {/* Excuse Indicator */}
                                            {excuse && status !== AttendanceStatus.EXCUSED && (
                                                <div 
                                                    className="absolute top-2 left-2 z-20 text-blue-600 animate-bounce" 
                                                    title={excuse}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        alert(`عذر الطالب: ${excuse}`);
                                                        if(confirm('هل تريد قبول العذر؟')) {
                                                            handleStatusChange(student.id, AttendanceStatus.EXCUSED);
                                                        }
                                                    }}
                                                >
                                                    <MessageSquare size={18} fill="currentColor" className="text-blue-200"/>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-start">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${status === 'ABSENT' ? 'bg-red-500' : status === 'LATE' ? 'bg-yellow-500' : status === 'EXCUSED' ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                {/* Behavior Quick Toggles */}
                                                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => handleBehaviorChange(student.id, BehaviorStatus.POSITIVE)} className={`p-1 rounded-full ${behavior === 'POSITIVE' ? 'text-green-600 bg-green-100' : 'text-gray-300 hover:text-green-500'}`}><Smile size={16}/></button>
                                                    <button onClick={() => handleBehaviorChange(student.id, BehaviorStatus.NEGATIVE)} className={`p-1 rounded-full ${behavior === 'NEGATIVE' ? 'text-red-600 bg-red-100' : 'text-gray-300 hover:text-red-500'}`}><Frown size={16}/></button>
                                                </div>
                                            </div>
                                            <div className="text-right mt-1" onClick={(e) => { e.stopPropagation(); navigateToStudent(student.id); }}>
                                                <span className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight hover:text-indigo-600 hover:underline">{student.name}</span>
                                            </div>
                                            <div className="text-xs text-gray-400 font-bold mt-auto pt-2 text-left">
                                                {status === AttendanceStatus.ABSENT ? 'غائب' : status === AttendanceStatus.LATE ? 'تأخر' : status === AttendanceStatus.EXCUSED ? 'بعذر' : 'حاضر'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredStudents.map(student => (
                                    <div key={student.id} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                                        <div 
                                            className="font-bold text-gray-800 cursor-pointer hover:text-indigo-600 hover:underline"
                                            onClick={() => navigateToStudent(student.id)}
                                        >
                                            {student.name}
                                            {excuseRecords[student.id] && <span className="mr-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">يوجد عذر</span>}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleStatusChange(student.id, AttendanceStatus.PRESENT)} className={`px-3 py-1 rounded text-xs font-bold border ${records[student.id] === 'PRESENT' ? 'bg-green-600 text-white' : 'bg-gray-50'}`}>حاضر</button>
                                            <button onClick={() => handleStatusChange(student.id, AttendanceStatus.ABSENT)} className={`px-3 py-1 rounded text-xs font-bold border ${records[student.id] === 'ABSENT' ? 'bg-red-600 text-white' : 'bg-gray-50'}`}>غائب</button>
                                            <button onClick={() => handleStatusChange(student.id, AttendanceStatus.LATE)} className={`px-3 py-1 rounded text-xs font-bold border ${records[student.id] === 'LATE' ? 'bg-yellow-500 text-white' : 'bg-gray-50'}`}>تأخر</button>
                                            <button onClick={() => handleStatusChange(student.id, AttendanceStatus.EXCUSED)} className={`px-3 py-1 rounded text-xs font-bold border ${records[student.id] === 'EXCUSED' ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>عذر</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
              )}
          </div>
      )}

      {/* --- WEEKLY TAB --- */}
      {activeTab === 'WEEKLY' && (
          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
              <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2"><CalendarDays size={18}/> السجل الأسبوعي (تفاعلي)</h3>
                  <select className="p-2 border rounded bg-white text-sm" value={manualClass} onChange={e => setManualClass(e.target.value)}>
                      <option value="">اختر الفصل...</option>
                      {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
              
              {manualClass ? (
                  <div className="flex-1 overflow-auto">
                      <table className="w-full text-center text-sm border-collapse">
                          <thead className="bg-gray-100 text-gray-700 sticky top-0 shadow-sm">
                              <tr>
                                  <th className="p-4 text-right bg-gray-100 sticky right-0 z-10 w-48">الطالب</th>
                                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu'].map((d, i) => {
                                      const date = new Date(weekStartDate);
                                      date.setDate(date.getDate() + i);
                                      return <th key={i} className="p-3 border-l min-w-[80px]">{date.toLocaleDateString('ar-SA', {weekday: 'short'})} <br/><span className="text-[10px] text-gray-400">{date.getDate()}/{date.getMonth()+1}</span></th>
                                  })}
                              </tr>
                          </thead>
                          <tbody className="divide-y">
                              {students.filter(s => s.className === manualClass).map(s => (
                                  <tr key={s.id} className="hover:bg-gray-50">
                                      <td className="p-4 text-right font-bold sticky right-0 bg-white border-l">{s.name}</td>
                                      {Array.from({length: 5}).map((_, i) => {
                                          const d = new Date(weekStartDate);
                                          d.setDate(d.getDate() + i);
                                          const dateStr = d.toISOString().split('T')[0];
                                          const rec = attendanceHistory.find(r => r.studentId === s.id && r.date === dateStr);
                                          return (
                                              <td 
                                                key={i} 
                                                className="p-2 border-l cursor-pointer hover:bg-gray-100 transition-colors"
                                                onClick={() => handleWeeklyStatusToggle(s.id, dateStr)}
                                                title="اضغط للتغيير"
                                              >
                                                  {rec ? (
                                                      <span className={`font-bold ${rec.status === 'ABSENT' ? 'text-red-600' : rec.status === 'LATE' ? 'text-yellow-600' : rec.status === 'EXCUSED' ? 'text-blue-600' : 'text-green-600'}`}>
                                                          {rec.status === 'ABSENT' ? 'غ' : rec.status === 'LATE' ? 'ت' : rec.status === 'EXCUSED' ? 'ع' : '✓'}
                                                      </span>
                                                  ) : <span className="text-gray-300">-</span>}
                                              </td>
                                          );
                                      })}
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                      <p>الرجاء اختيار الفصل لعرض الجدول</p>
                  </div>
              )}
          </div>
      )}

      {/* --- LOG TAB --- */}
      {activeTab === 'LOG' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden animate-fade-in">
              <div className="p-4 border-b bg-gray-50 flex gap-4 items-center">
                  <div className="relative flex-1">
                      <input className="w-full p-2 pl-8 border rounded-lg text-sm" placeholder="بحث..." value={logSearch} onChange={e => setLogSearch(e.target.value)}/>
                  </div>
                  <input type="date" className="p-2 border rounded-lg text-sm" value={logFilterDateStart} onChange={e => setLogFilterDateStart(e.target.value)}/>
                  <input type="date" className="p-2 border rounded-lg text-sm" value={logFilterDateEnd} onChange={e => setLogFilterDateEnd(e.target.value)}/>
              </div>
              <div className="flex-1 overflow-auto p-0">
                  <table className="w-full text-right text-sm">
                      <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0 shadow-sm">
                          <tr>
                              <th className="p-3">التاريخ</th>
                              <th className="p-3">الطالب</th>
                              <th className="p-3">الفصل</th>
                              <th className="p-3">الحالة</th>
                              <th className="p-3">ملاحظات</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {attendanceHistory
                              .filter(r => r.date >= logFilterDateStart && r.date <= logFilterDateEnd)
                              .filter(r => {
                                  const s = students.find(std => std.id === r.studentId);
                                  return s && s.name.includes(logSearch);
                              })
                              .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map(r => {
                                  const s = students.find(std => std.id === r.studentId);
                                  return (
                                      <tr key={r.id} className="hover:bg-gray-50">
                                          <td className="p-3 font-mono text-gray-500">{r.date}</td>
                                          <td className="p-3 font-bold cursor-pointer hover:text-indigo-600" onClick={() => navigateToStudent(r.studentId)}>{s?.name}</td>
                                          <td className="p-3 text-gray-600">{s?.className}</td>
                                          <td className="p-3">
                                              <span className={`px-2 py-1 rounded text-xs font-bold ${recStatusColor(r.status)}`}>
                                                  {r.status}
                                              </span>
                                          </td>
                                          <td className="p-3 text-gray-500 truncate max-w-xs">{r.behaviorNote || r.excuseNote}</td>
                                      </tr>
                                  );
                              })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* Modals */}
      {isImportModalOpen && !isManager && (
          <div className="fixed inset-0 z-50 bg-white">
              <DataImport 
                  existingStudents={students}
                  onImportStudents={() => {}}
                  onImportAttendance={(recs) => { onImportAttendance(recs); setIsImportModalOpen(false); }} 
                  onImportPerformance={() => {}}
                  forcedType="ATTENDANCE"
                  onClose={() => setIsImportModalOpen(false)}
                  currentUser={currentUser}
              />
          </div>
      )}
      
      {isAIImportModalOpen && !isManager && (
          <div className="fixed inset-0 z-50 bg-white">
              <AIDataImport
                  onImportStudents={() => {}}
                  onImportAttendance={(recs) => { onImportAttendance(recs); setIsAIImportModalOpen(false); }}
                  onImportPerformance={() => {}}
                  forcedType="ATTENDANCE"
                  onClose={() => setIsAIImportModalOpen(false)}
                  currentUser={currentUser}
                  existingStudents={students}
              />
          </div>
      )}

    </div>
  );
};

const recStatusColor = (status: string) => {
    switch(status) {
        case 'ABSENT': return 'bg-red-100 text-red-700';
        case 'LATE': return 'bg-yellow-100 text-yellow-700';
        case 'EXCUSED': return 'bg-blue-100 text-blue-700';
        default: return 'bg-green-100 text-green-700';
    }
}

export default Attendance;
