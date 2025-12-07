
import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, ScheduleItem, DayOfWeek, BehaviorStatus, PerformanceRecord, SystemUser } from '../types';
import { getSchedules } from '../services/storageService';
import { formatDualDate } from '../services/dateService';
import { Calendar, Save, CheckCircle2, FileSpreadsheet, Users, CheckSquare, XSquare, Clock, CalendarClock, School, ArrowRight, Smile, Frown, MessageSquare, Plus, Tag, X, Inbox, FileText, Check, Download, AlertCircle, TrendingUp, TrendingDown, Star, Sparkles, History, Filter, Search } from 'lucide-react';
import DataImport from './DataImport';
import AIDataImport from './AIDataImport';

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
  currentUser?: SystemUser | null; // Passed for Smart Schedule Matching
}

// Default Predefined Notes
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
    currentUser
}) => {
  // --- TABS STATE ---
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'LOG'>('REGISTER');

  // --- REGISTER TAB STATE ---
  const [internalDate, setInternalDate] = useState(new Date().toISOString().split('T')[0]);
  const selectedDate = propDate !== undefined ? propDate : internalDate;
  
  const handleDateChange = (newDate: string) => {
      if (onDateChange) onDateChange(newDate);
      else setInternalDate(newDate);
      setSelectedPeriod(null);
      if (!preSelectedClass) setSelectedClass(''); 
  };
  
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [behaviorRecords, setBehaviorRecords] = useState<Record<string, BehaviorStatus>>({});
  const [noteRecords, setNoteRecords] = useState<Record<string, string>>({});
  const [activeNoteStudent, setActiveNoteStudent] = useState<string | null>(null);

  // Dynamic Lists
  const [positiveList, setPositiveList] = useState<string[]>(() => {
      const saved = localStorage.getItem('behavior_positive_tags');
      return saved ? JSON.parse(saved) : DEFAULT_POSITIVE_NOTES;
  });
  const [negativeList, setNegativeList] = useState<string[]>(() => {
      const saved = localStorage.getItem('behavior_negative_tags');
      return saved ? JSON.parse(saved) : DEFAULT_NEGATIVE_NOTES;
  });
  const [newNoteInput, setNewNoteInput] = useState('');

  const [saved, setSaved] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedClass, setSelectedClass] = useState(preSelectedClass || '');
  const [selectedSubject, setSelectedSubject] = useState(preSelectedSubject || '');
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  
  // --- LOG TAB STATE ---
  const [logFilterClass, setLogFilterClass] = useState('');
  const [logFilterDateStart, setLogFilterDateStart] = useState(() => {
      const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [logFilterDateEnd, setLogFilterDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [logSearch, setLogSearch] = useState('');

  useEffect(() => {
    setSchedules(getSchedules());
  }, []);

  useEffect(() => {
      if(preSelectedClass) setSelectedClass(preSelectedClass);
      if(preSelectedSubject) setSelectedSubject(preSelectedSubject);
  }, [preSelectedClass, preSelectedSubject]);

  useEffect(() => {
      localStorage.setItem('behavior_positive_tags', JSON.stringify(positiveList));
  }, [positiveList]);

  useEffect(() => {
      localStorage.setItem('behavior_negative_tags', JSON.stringify(negativeList));
  }, [negativeList]);

  // --- COMPUTED: Unique Classes for Filter ---
  const uniqueClasses = useMemo(() => {
      const classes = new Set(students.map(s => s.className).filter(Boolean));
      return Array.from(classes).sort();
  }, [students]);

  // --- LOGIC: Filter History ---
  const filteredHistory = useMemo(() => {
      return attendanceHistory.filter(rec => {
          const student = students.find(s => s.id === rec.studentId);
          if (!student) return false;

          // Date Range
          if (rec.date < logFilterDateStart || rec.date > logFilterDateEnd) return false;
          
          // Class Filter
          if (logFilterClass && student.className !== logFilterClass) return false;

          // Text Search (Student Name)
          if (logSearch && !student.name.includes(logSearch)) return false;

          return true;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceHistory, students, logFilterClass, logFilterDateStart, logFilterDateEnd, logSearch]);

  // --- REGISTER LOGIC ---
  const todaysSchedule = useMemo(() => {
      if (!selectedDate) return [];
      const dateObj = new Date(selectedDate);
      const dayIndex = dateObj.getDay(); 
      const dayMap: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayMap[dayIndex];

      // Filter by teacher if currentUser provided
      let dailySched = schedules.filter(s => s.day === currentDayName);
      if (currentUser && currentUser.role === 'TEACHER') {
          dailySched = dailySched.filter(s => s.teacherId === currentUser.id); // Or utilize assignments logic if needed
      }
      
      return dailySched.sort((a, b) => a.period - b.period);
  }, [selectedDate, schedules, currentUser]);

  const scheduleByPeriod = useMemo(() => {
      const grouped: Record<number, ScheduleItem[]> = {};
      todaysSchedule.forEach(s => {
          if (!grouped[s.period]) grouped[s.period] = [];
          grouped[s.period].push(s);
      });
      return grouped;
  }, [todaysSchedule]);
  
  const sortedPeriods = Object.keys(scheduleByPeriod).map(Number).sort((a, b) => a - b);

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(student => {
        const studentKey = student.classId || student.className || student.gradeLevel;
        if (studentKey !== selectedClass && student.className !== selectedClass) return false;
        return true;
    });
  }, [students, selectedClass]);

  useEffect(() => {
    if (filteredStudents.length === 0 || selectedPeriod === null) {
        setRecords({});
        setBehaviorRecords({});
        setNoteRecords({});
        return;
    }
    const existing = attendanceHistory.filter(a => {
        return a.date === selectedDate && Number(a.period) === Number(selectedPeriod) && a.studentId;
    });
    const initialRecs: Record<string, AttendanceStatus> = {};
    const initialBeh: Record<string, BehaviorStatus> = {};
    const initialNotes: Record<string, string> = {};

    filteredStudents.forEach(s => {
      const found = existing.find(r => r.studentId === s.id);
      initialRecs[s.id] = found ? found.status : AttendanceStatus.PRESENT;
      initialBeh[s.id] = found && found.behaviorStatus ? found.behaviorStatus : BehaviorStatus.NEUTRAL;
      initialNotes[s.id] = found && found.behaviorNote ? found.behaviorNote : '';
    });
    setRecords(initialRecs);
    setBehaviorRecords(initialBeh);
    setNoteRecords(initialNotes);
    setSaved(false);
  }, [selectedDate, selectedPeriod, selectedClass, filteredStudents, attendanceHistory]);

  const stats = useMemo(() => {
      if (filteredStudents.length === 0) return { present: 0, absent: 0, late: 0 };
      let present = 0, absent = 0, late = 0;
      filteredStudents.forEach(s => {
          const status = records[s.id];
          if (status === AttendanceStatus.ABSENT) absent++;
          else if (status === AttendanceStatus.LATE) late++;
          else present++; 
      });
      return { present, absent, late };
  }, [filteredStudents, records]);

  // --- Logic for Excuses ---
  const pendingExcuses = useMemo(() => {
      return attendanceHistory.filter(r => 
          (r.status === AttendanceStatus.ABSENT || r.status === AttendanceStatus.LATE) &&
          (r.excuseNote || r.excuseFile)
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceHistory]);

  const handleAcceptExcuse = (record: AttendanceRecord) => {
      const updated = { ...record, status: AttendanceStatus.EXCUSED };
      onSaveAttendance([updated]);
  };

  const handleRejectExcuse = (record: AttendanceRecord) => {
      if(confirm('هل أنت متأكد من رفض العذر؟ سيتم حذف الملاحظة والمرفق.')) {
          const updated = { ...record, excuseNote: '', excuseFile: '' };
          onSaveAttendance([updated]);
      }
  };

  // --- Status & Behavior Handlers ---
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const handleBehaviorChange = (studentId: string, status: BehaviorStatus) => {
      setBehaviorRecords(prev => {
          const current = prev[studentId];
          const next = current === status ? BehaviorStatus.NEUTRAL : status;
          return { ...prev, [studentId]: next };
      });
      setSaved(false);
  };

  const handleNoteChange = (studentId: string, note: string) => {
      setNoteRecords(prev => ({ ...prev, [studentId]: note }));
      setSaved(false);
  };

  const appendNote = (studentId: string, text: string) => {
      setNoteRecords(prev => {
          const current = prev[studentId] || '';
          const updated = current ? `${current}، ${text}` : text;
          return { ...prev, [studentId]: updated };
      });
      setSaved(false);
  };

  const handleAddNewTag = (type: 'POS' | 'NEG') => {
      if(!newNoteInput.trim()) return;
      if (type === 'POS') {
          if (!positiveList.includes(newNoteInput)) setPositiveList(prev => [...prev, newNoteInput]);
      } else {
          if (!negativeList.includes(newNoteInput)) setNegativeList(prev => [...prev, newNoteInput]);
      }
      setNewNoteInput('');
  };

  const handleDeleteTag = (type: 'POS' | 'NEG', tag: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm(`هل تريد حذف "${tag}" من القائمة؟`)) {
          if(type === 'POS') setPositiveList(prev => prev.filter(t => t !== tag));
          else setNegativeList(prev => prev.filter(t => t !== tag));
      }
  }

  const handleMarkAll = (status: AttendanceStatus) => {
      const newRecords = { ...records };
      filteredStudents.forEach(student => {
          newRecords[student.id] = status;
      });
      setRecords(newRecords);
      setSaved(false);
  };

  const handleSave = () => {
    if (filteredStudents.length === 0 || selectedPeriod === null) return;
    const periodSuffix = `-${selectedPeriod}`;
    const recordsToSave: AttendanceRecord[] = filteredStudents.map(s => ({
      id: `${s.id}-${selectedDate}-${selectedSubject}${periodSuffix}`,
      studentId: s.id,
      date: selectedDate,
      status: records[s.id] || AttendanceStatus.PRESENT,
      subject: selectedSubject,
      period: selectedPeriod || undefined,
      behaviorStatus: behaviorRecords[s.id] || BehaviorStatus.NEUTRAL,
      behaviorNote: noteRecords[s.id] || ''
    }));
    onSaveAttendance(recordsToSave);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleScheduleClick = (schedule: ScheduleItem) => {
      setSelectedClass(schedule.classId);
      setSelectedSubject(schedule.subjectName);
      setSelectedPeriod(schedule.period);
      setTimeout(() => {
          document.getElementById('attendance-list')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const handleBackToSchedule = () => {
      setSelectedClass('');
      setSelectedPeriod(null);
  };

  const getClassColor = (classId: string) => {
      const colors = ['border-blue-200 hover:bg-blue-50', 'border-green-200 hover:bg-green-50', 'border-purple-200 hover:bg-purple-50', 'border-orange-200 hover:bg-orange-50'];
      let hash = 0;
      for (let i = 0; i < classId.length; i++) hash = classId.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
  };

  const getStudentMetrics = (studentId: string) => {
      const myPerf = performance.filter(p => p.studentId === studentId);
      const myAtt = attendanceHistory.filter(a => a.studentId === studentId);
      const absentCount = myAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
      let avgGrade = 0;
      if (myPerf.length > 0) {
          const total = myPerf.reduce((sum, p) => sum + (p.score / p.maxScore), 0);
          avgGrade = Math.round((total / myPerf.length) * 100);
      }
      return { absentCount, avgGrade, hasPerf: myPerf.length > 0 };
  }

  const statusOptions = [
    { value: AttendanceStatus.PRESENT, label: 'حاضر', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: AttendanceStatus.ABSENT, label: 'غائب', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: AttendanceStatus.LATE, label: 'متأخر', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: AttendanceStatus.EXCUSED, label: 'عذر', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col">
      
      {/* TABS HEADER */}
      <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
              <button 
                  onClick={() => setActiveTab('REGISTER')}
                  className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'REGISTER' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  <CheckSquare size={18}/> تسجيل الحضور
              </button>
              <button 
                  onClick={() => setActiveTab('LOG')}
                  className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'LOG' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  <History size={18}/> السجل الشامل (غياب وسلوك)
              </button>
          </div>

          <div className="flex items-center gap-2">
             <button onClick={() => setIsExcuseModalOpen(true)} className="bg-white hover:bg-gray-50 text-gray-700 border px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm text-sm font-bold relative">
                <Inbox size={18} className={pendingExcuses.length > 0 ? "text-red-500" : "text-gray-400"} />
                <span className="hidden md:inline">صندوق الأعذار</span>
                {pendingExcuses.length > 0 && <span className="bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full absolute -top-1 -right-1">{pendingExcuses.length}</span>}
             </button>
             {activeTab === 'REGISTER' && (
                 <>
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-white hover:bg-gray-50 text-gray-600 px-3 py-2 border rounded-lg flex items-center gap-2 text-sm font-bold"><FileSpreadsheet size={18} /><span className="hidden md:inline">Excel</span></button>
                    <button onClick={() => setIsAIImportModalOpen(true)} className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold"><Sparkles size={18} /><span className="hidden md:inline">AI Import</span></button>
                 </>
             )}
          </div>
      </div>

      {/* --- REGISTER VIEW --- */}
      {activeTab === 'REGISTER' && (
          <div className="space-y-6 flex-1 overflow-auto">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-800">تحضير اليوم:</h2>
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border group hover:border-primary transition-colors">
                        <Calendar size={20} className="text-gray-500 group-hover:text-primary" />
                        <input type="date" value={selectedDate} onChange={(e) => handleDateChange(e.target.value)} className="outline-none text-gray-700 bg-transparent text-sm font-bold cursor-pointer"/>
                    </div>
                    <span className="text-sm text-gray-400">{formatDualDate(selectedDate)}</span>
                </div>
                {selectedClass && selectedPeriod !== null && (
                    <div className="flex bg-gray-50 rounded-lg border text-xs">
                        <div className="px-3 py-1 border-l text-green-700 font-bold">{stats.present} حاضر</div>
                        <div className="px-3 py-1 border-l text-red-700 font-bold">{stats.absent} غائب</div>
                        <div className="px-3 py-1 text-yellow-700 font-bold">{stats.late} متأخر</div>
                    </div>
                )}
              </div>

              {/* TIMETABLE */}
              {!selectedClass && (
                  <div className="animate-fade-in space-y-6">
                      {sortedPeriods.length > 0 ? (
                          sortedPeriods.map(period => (
                             <div key={period} className="relative">
                                 <div className="flex items-center gap-2 mb-3 px-1">
                                    <div className="bg-gray-800 text-white p-1.5 rounded-lg shadow-sm"><Clock size={16}/></div>
                                    <h3 className="font-bold text-gray-800">الحصة {period}</h3>
                                    <div className="flex-1 h-[1px] bg-gray-200"></div>
                                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {scheduleByPeriod[period].map((s, idx) => (
                                        <button key={s.id} onClick={() => handleScheduleClick(s)} className={`group relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-right bg-white shadow-sm ${getClassColor(s.classId)} hover:-translate-y-1 hover:shadow-md`}>
                                            <div className="flex justify-between w-full mb-2">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-primary">{s.period}</span>
                                            </div>
                                            <h4 className="font-black text-lg truncate w-full mb-1 text-gray-800 group-hover:text-primary">{s.classId}</h4>
                                            <p className="text-xs truncate w-full flex items-center gap-1 text-gray-500"><School size={12}/> {s.subjectName}</p>
                                        </button>
                                    ))}
                                 </div>
                             </div>
                          ))
                      ) : (
                          <div className="flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-gray-200 rounded-xl text-center shadow-sm h-64">
                              <CalendarClock size={48} className="text-gray-300 mb-4"/>
                              <h3 className="text-xl font-bold text-gray-700">لا يوجد جدول مسجل لليوم</h3>
                              <p className="text-sm text-gray-500">قم بإضافة الحصص في الجدول الدراسي.</p>
                          </div>
                      )}
                  </div>
              )}

              {/* STUDENT LIST */}
              {selectedPeriod !== null && selectedClass && (
                <div id="attendance-list" className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-slide-up flex-1 flex flex-col">
                    <div className="bg-gray-800 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-4">
                            <button onClick={handleBackToSchedule} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowRight size={20}/></button>
                            <div>
                                <div className="flex items-center gap-2 font-bold text-lg"><span>{selectedClass}</span><span className="opacity-50">|</span><span>{selectedSubject || 'عام'}</span></div>
                                <span className="text-xs opacity-75">الحصة {selectedPeriod}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleMarkAll(AttendanceStatus.PRESENT)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 border border-green-500">تحضير الكل</button>
                            <button onClick={() => handleMarkAll(AttendanceStatus.ABSENT)} className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-700 border border-red-500">غياب للكل</button>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100 overflow-y-auto flex-1 p-2">
                    {filteredStudents.map(student => {
                        const metrics = getStudentMetrics(student.id);
                        return (
                        <div key={student.id} className="grid grid-cols-12 p-3 items-center hover:bg-gray-50 transition-colors group gap-y-3 rounded-lg border border-transparent hover:border-gray-100">
                            <div className="col-span-12 md:col-span-3 font-medium">
                                <span className="text-gray-800 font-bold block">{student.name}</span>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{student.gradeLevel}</span>
                                    {metrics.absentCount > 3 && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-bold flex gap-1"><AlertCircle size={10}/> غ: {metrics.absentCount}</span>}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-5 flex gap-1">
                                {statusOptions.map((opt) => (
                                <button key={opt.value} onClick={() => handleStatusChange(student.id, opt.value)} className={`flex-1 py-1.5 rounded-md text-xs font-bold border transition-all ${records[student.id] === opt.value ? `${opt.color} shadow-sm` : 'bg-white text-gray-500 border-gray-200'}`}>
                                    {opt.label}
                                </button>
                                ))}
                            </div>
                            <div className="col-span-12 md:col-span-4 flex items-center justify-end gap-2">
                                <div className="flex bg-gray-50 p-1 rounded-lg border">
                                    <button onClick={() => handleBehaviorChange(student.id, BehaviorStatus.POSITIVE)} className={`p-1.5 rounded ${behaviorRecords[student.id] === BehaviorStatus.POSITIVE ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-green-500'}`}><Smile size={18}/></button>
                                    <button onClick={() => handleBehaviorChange(student.id, BehaviorStatus.NEGATIVE)} className={`p-1.5 rounded ${behaviorRecords[student.id] === BehaviorStatus.NEGATIVE ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-red-500'}`}><Frown size={18}/></button>
                                </div>
                                <div className="relative">
                                    <button onClick={() => setActiveNoteStudent(activeNoteStudent === student.id ? null : student.id)} className={`p-2 rounded-lg border transition-all ${noteRecords[student.id] ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'bg-white text-gray-400'}`}><MessageSquare size={16}/></button>
                                    {activeNoteStudent === student.id && (
                                        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white shadow-xl rounded-xl border p-4 z-50 animate-fade-in">
                                            <div className="flex justify-between mb-2"><h4 className="text-xs font-bold">ملاحظة</h4><button onClick={() => setActiveNoteStudent(null)}><X size={14}/></button></div>
                                            <textarea autoFocus className="w-full text-xs p-2 border rounded bg-gray-50 mb-2" rows={2} value={noteRecords[student.id] || ''} onChange={(e) => handleNoteChange(student.id, e.target.value)} placeholder="اكتب ملاحظة..."/>
                                            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                                                {positiveList.map(tag => <button key={tag} onClick={() => appendNote(student.id, tag)} className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 hover:bg-green-100">{tag}</button>)}
                                                {negativeList.map(tag => <button key={tag} onClick={() => appendNote(student.id, tag)} className="text-[10px] bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 hover:bg-red-100">{tag}</button>)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )})}
                    </div>
                    <div className="p-4 bg-gray-50 border-t flex justify-end sticky bottom-0">
                         <button onClick={handleSave} disabled={filteredStudents.length === 0} className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-teal-800 transition-all">
                            {saved ? <CheckCircle2 size={20} /> : <Save size={20} />} {saved ? 'تم الحفظ' : `حفظ التحضير`}
                         </button>
                    </div>
                </div>
              )}
          </div>
      )}

      {/* --- LOG VIEW (HISTORY) --- */}
      {activeTab === 'LOG' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden animate-fade-in">
              <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center gap-2">
                      <History className="text-purple-600"/>
                      <h3 className="font-bold text-gray-800">سجل المتابعة الشامل</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                      <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                          <Filter size={14} className="text-gray-400"/>
                          <select value={logFilterClass} onChange={e => setLogFilterClass(e.target.value)} className="bg-transparent outline-none font-bold text-gray-700">
                              <option value="">جميع الفصول</option>
                              {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                          <span className="text-xs text-gray-400">من:</span>
                          <input type="date" value={logFilterDateStart} onChange={e => setLogFilterDateStart(e.target.value)} className="outline-none bg-transparent font-bold"/>
                      </div>
                      <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                          <span className="text-xs text-gray-400">إلى:</span>
                          <input type="date" value={logFilterDateEnd} onChange={e => setLogFilterDateEnd(e.target.value)} className="outline-none bg-transparent font-bold"/>
                      </div>
                      <div className="relative">
                          <Search size={14} className="absolute right-2 top-2 text-gray-400"/>
                          <input type="text" placeholder="بحث عن طالب..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="pl-2 pr-7 py-1 border rounded-lg outline-none text-sm w-40 focus:ring-1 focus:ring-purple-300"/>
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-auto">
                  <table className="w-full text-right text-sm">
                      <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0 shadow-sm">
                          <tr>
                              <th className="p-3">التاريخ</th>
                              <th className="p-3">الطالب</th>
                              <th className="p-3">الفصل</th>
                              <th className="p-3">المادة / الحصة</th>
                              <th className="p-3 text-center">الحالة</th>
                              <th className="p-3 text-center">السلوك</th>
                              <th className="p-3">ملاحظات</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {filteredHistory.map((rec) => {
                              const student = students.find(s => s.id === rec.studentId);
                              return (
                                  <tr key={rec.id} className="hover:bg-gray-50">
                                      <td className="p-3 font-mono text-xs text-gray-500">{rec.date}</td>
                                      <td className="p-3 font-bold text-gray-800">{student?.name}</td>
                                      <td className="p-3 text-gray-600">{student?.className}</td>
                                      <td className="p-3 text-xs text-gray-500">{rec.subject} {rec.period ? `(ح${rec.period})` : ''}</td>
                                      <td className="p-3 text-center">
                                          {rec.status === AttendanceStatus.ABSENT && <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">غائب</span>}
                                          {rec.status === AttendanceStatus.LATE && <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-bold">متأخر</span>}
                                          {rec.status === AttendanceStatus.EXCUSED && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">بعذر</span>}
                                          {rec.status === AttendanceStatus.PRESENT && <span className="text-green-600 text-xs">✓</span>}
                                      </td>
                                      <td className="p-3 text-center">
                                          {rec.behaviorStatus === BehaviorStatus.POSITIVE && <span className="text-green-600 flex justify-center"><Smile size={16}/></span>}
                                          {rec.behaviorStatus === BehaviorStatus.NEGATIVE && <span className="text-red-600 flex justify-center"><Frown size={16}/></span>}
                                      </td>
                                      <td className="p-3 text-xs text-gray-600 max-w-xs truncate" title={rec.behaviorNote}>{rec.behaviorNote}</td>
                                  </tr>
                              );
                          })}
                          {filteredHistory.length === 0 && (
                              <tr><td colSpan={7} className="p-10 text-center text-gray-400">لا توجد سجلات مطابقة للفلتر</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="p-3 bg-gray-50 border-t text-xs text-gray-500 flex justify-between">
                  <span>عدد السجلات: {filteredHistory.length}</span>
                  {/* Reuse Import for History if needed */}
                  <button onClick={() => setIsImportModalOpen(true)} className="text-blue-600 hover:underline flex items-center gap-1"><Download size={12}/> استيراد سجلات سابقة</button>
              </div>
          </div>
      )}

       {/* --- IMPORT MODAL --- */}
      {isImportModalOpen && (
          <div className="fixed inset-0 z-[100] bg-white">
              <DataImport 
                  existingStudents={students}
                  onImportStudents={() => {}} 
                  onImportAttendance={(records) => {
                      onImportAttendance(records);
                      setIsImportModalOpen(false);
                  }}
                  onImportPerformance={() => {}}
                  forcedType="ATTENDANCE"
                  onClose={() => setIsImportModalOpen(false)}
                  currentUser={currentUser} // Pass for smart matching
              />
          </div>
      )}

      {/* --- AI IMPORT MODAL --- */}
      {isAIImportModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
                  <AIDataImport 
                      onImportStudents={() => {}} 
                      onImportAttendance={(records) => {
                          onImportAttendance(records);
                          setIsAIImportModalOpen(false);
                      }}
                      onImportPerformance={() => {}}
                      forcedType="ATTENDANCE"
                      onClose={() => setIsAIImportModalOpen(false)}
                      currentUser={currentUser} // Pass for smart matching
                      existingStudents={students} 
                  />
              </div>
          </div>
      )}

      {/* --- EXCUSE MANAGEMENT MODAL --- */}
      {isExcuseModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Inbox className="text-red-500" /> إدارة الأعذار والمبررات
                      </h3>
                      <button onClick={() => setIsExcuseModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 flex-1 overflow-y-auto bg-gray-50">
                      {pendingExcuses.length > 0 ? (
                          <div className="space-y-4">
                              {pendingExcuses.map(record => {
                                  const student = students.find(s => s.id === record.studentId);
                                  return (
                                      <div key={record.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                          <div className="flex justify-between items-start mb-3">
                                              <div className="flex items-center gap-3">
                                                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600">
                                                      {student?.name.charAt(0)}
                                                  </div>
                                                  <div>
                                                      <h4 className="font-bold text-gray-800">{student?.name}</h4>
                                                      <p className="text-xs text-gray-500">{formatDualDate(record.date)} • {record.status === 'ABSENT' ? 'غائب' : 'متأخر'}</p>
                                                  </div>
                                              </div>
                                              {record.excuseFile && (
                                                  <a 
                                                      href={record.excuseFile} 
                                                      download="excuse_proof" 
                                                      className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
                                                  >
                                                      <Download size={12}/> تحميل المرفق
                                                  </a>
                                              )}
                                          </div>
                                          
                                          <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-4 border border-gray-100 flex items-start gap-2">
                                              <FileText size={16} className="text-gray-400 mt-0.5 shrink-0"/>
                                              <p>{record.excuseNote || 'لا يوجد نص للعذر'}</p>
                                          </div>

                                          <div className="flex gap-3">
                                              <button 
                                                  onClick={() => handleAcceptExcuse(record)}
                                                  className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                                              >
                                                  <Check size={16}/> قبول (تحويل لـ بعذر)
                                              </button>
                                              <button 
                                                  onClick={() => handleRejectExcuse(record)}
                                                  className="flex-1 bg-white border border-red-200 text-red-600 py-2 rounded-lg font-bold text-sm hover:bg-red-50 flex items-center justify-center gap-2"
                                              >
                                                  <X size={16}/> رفض وحذف
                                              </button>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      ) : (
                          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                              <Inbox size={48} className="mb-4 opacity-20"/>
                              <p className="font-bold">لا توجد أعذار معلقة</p>
                              <p className="text-sm">جميع الأعذار تم مراجعتها</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Attendance;
