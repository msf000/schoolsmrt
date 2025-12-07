
// ... existing imports ...
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, ScheduleItem, DayOfWeek, BehaviorStatus, PerformanceRecord, SystemUser } from '../types';
import { getSchedules } from '../services/storageService';
import { formatDualDate } from '../services/dateService';
import { Calendar, Save, CheckCircle2, FileSpreadsheet, Users, CheckSquare, XSquare, Clock, CalendarClock, School, ArrowRight, Smile, Frown, MessageSquare, Plus, Tag, X, Inbox, FileText, Check, Download, AlertCircle, TrendingUp, TrendingDown, Star, Sparkles, History, Filter, Search, Printer, Loader2, ArrowLeft, Cloud, RefreshCw } from 'lucide-react';
import DataImport from './DataImport';
import AIDataImport from './AIDataImport';
import * as XLSX from 'xlsx';

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
    currentUser
}) => {
  // --- SAFETY CHECK ---
  if (!students) {
      return (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <Loader2 className="animate-spin text-primary mb-4" size={48}/>
              <p className="text-gray-500 font-bold">جاري تحميل بيانات الطلاب...</p>
          </div>
      );
  }

  const [activeTab, setActiveTab] = useState<'REGISTER' | 'LOG'>('REGISTER');

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
  const [isSaving, setIsSaving] = useState(false); // New state for auto-save indicator
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [selectedClass, setSelectedClass] = useState(preSelectedClass || '');
  const [selectedSubject, setSelectedSubject] = useState(preSelectedSubject || '');
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  
  // Manual Selection State
  const [manualClass, setManualClass] = useState('');
  const [manualSubject, setManualSubject] = useState('');
  
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

  const uniqueClasses = useMemo(() => {
      const classes = new Set(students.map(s => s.className).filter(Boolean));
      return Array.from(classes).sort();
  }, [students]);

  const filteredHistory = useMemo(() => {
      if (!attendanceHistory) return [];
      return attendanceHistory.filter(rec => {
          const student = students.find(s => s.id === rec.studentId);
          if (!student) return false;

          if (rec.date < logFilterDateStart || rec.date > logFilterDateEnd) return false;
          if (logFilterClass && student.className !== logFilterClass) return false;
          if (logSearch && !student.name.includes(logSearch)) return false;

          return true;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendanceHistory, students, logFilterClass, logFilterDateStart, logFilterDateEnd, logSearch]);

  const handleExportLogExcel = () => {
      if (filteredHistory.length === 0) return alert('لا توجد بيانات للتصدير');

      const dataToExport = filteredHistory.map(rec => {
          const student = students.find(s => s.id === rec.studentId);
          return {
              'التاريخ': rec.date,
              'اسم الطالب': student?.name || 'غير معروف',
              'الفصل': student?.className || '-',
              'الحالة': rec.status === 'PRESENT' ? 'حاضر' : rec.status === 'ABSENT' ? 'غائب' : rec.status === 'LATE' ? 'متأخر' : 'عذر',
              'المادة': rec.subject || '-',
              'رقم الحصة': rec.period || '-',
              'السلوك': rec.behaviorStatus === 'POSITIVE' ? 'إيجابي' : rec.behaviorStatus === 'NEGATIVE' ? 'سلبي' : 'عادي',
              'ملاحظات': rec.behaviorNote || ''
          };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "سجل الحضور");
      XLSX.writeFile(wb, `Attendance_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintLog = () => {
      window.print();
  };

  const todaysSchedule = useMemo(() => {
      if (!selectedDate) return [];
      const dateObj = new Date(selectedDate);
      const dayIndex = dateObj.getDay(); 
      const dayMap: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayMap[dayIndex];

      let dailySched = schedules.filter(s => s.day === currentDayName);
      if (currentUser && currentUser.role === 'TEACHER') {
          // FIX: Show schedule items belonging to me OR orphan items (legacy support)
          dailySched = dailySched.filter(s => s.teacherId === currentUser.id || !s.teacherId); 
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
    // FIX: Match period carefully (0 for manual)
    const existing = attendanceHistory.filter(a => {
        const p = a.period !== undefined ? Number(a.period) : 0;
        const sp = Number(selectedPeriod);
        return a.date === selectedDate && p === sp && a.studentId;
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

  const pendingExcuses = useMemo(() => {
      if (!attendanceHistory) return [];
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

  // Helper for Auto-Saving single record
  const saveSingleRecord = (studentId: string, updates: Partial<AttendanceRecord>) => {
      if (selectedPeriod === null) return;
      setIsSaving(true);
      
      const periodSuffix = selectedPeriod ? `-${selectedPeriod}` : '-0';
      const recordId = `${studentId}-${selectedDate}-${selectedSubject || 'manual'}${periodSuffix}`;
      
      // Merge with current state
      const currentStatus = records[studentId] || AttendanceStatus.PRESENT;
      const currentBehavior = behaviorRecords[studentId] || BehaviorStatus.NEUTRAL;
      const currentNote = noteRecords[studentId] || '';

      const record: AttendanceRecord = {
          id: recordId,
          studentId: studentId,
          date: selectedDate,
          status: updates.status || currentStatus,
          subject: selectedSubject,
          period: selectedPeriod || undefined,
          behaviorStatus: updates.behaviorStatus !== undefined ? updates.behaviorStatus : currentBehavior,
          behaviorNote: updates.behaviorNote !== undefined ? updates.behaviorNote : currentNote,
          createdById: currentUser?.id
      };

      onSaveAttendance([record]); // Auto save immediately
      
      setTimeout(() => setIsSaving(false), 500);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    saveSingleRecord(studentId, { status }); // Auto-save
  };

  const handleBehaviorChange = (studentId: string, status: BehaviorStatus) => {
      const current = behaviorRecords[studentId];
      const next = current === status ? BehaviorStatus.NEUTRAL : status;
      
      setBehaviorRecords(prev => ({ ...prev, [studentId]: next }));
      saveSingleRecord(studentId, { behaviorStatus: next }); // Auto-save
  };

  const handleNoteChange = (studentId: string, note: string) => {
      setNoteRecords(prev => ({ ...prev, [studentId]: note }));
      // Note: We don't auto-save on every keystroke here, waiting for blur or explicit action is better for text
  };
  
  const handleNoteBlur = (studentId: string) => {
      saveSingleRecord(studentId, { behaviorNote: noteRecords[studentId] });
  };

  const appendNote = (studentId: string, text: string) => {
      const current = noteRecords[studentId] || '';
      const updated = current ? `${current}، ${text}` : text;
      
      setNoteRecords(prev => ({ ...prev, [studentId]: updated }));
      saveSingleRecord(studentId, { behaviorNote: updated }); // Auto-save tag
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
              createdById: currentUser?.id
          });
      });
      setRecords(newRecords);
      onSaveAttendance(bulkToSave);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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
      const myPerf = performance ? performance.filter(p => p.studentId === studentId) : [];
      const myAtt = attendanceHistory ? attendanceHistory.filter(a => a.studentId === studentId) : [];
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
      <div className="flex justify-between items-center mb-4 print:hidden">
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
             <button onClick={() => setIsImportModalOpen(true)} className="bg-white hover:bg-gray-50 text-gray-600 px-3 py-2 border rounded-lg flex items-center gap-2 text-sm font-bold"><FileSpreadsheet size={18} /><span className="hidden md:inline">Excel</span></button>
             <button onClick={() => setIsAIImportModalOpen(true)} className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-bold"><Sparkles size={18} /><span className="hidden md:inline">AI Import</span></button>
          </div>
      </div>

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
                    <div className="flex items-center gap-4">
                        {isSaving && <span className="text-xs font-bold text-blue-600 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> جاري الحفظ التلقائي...</span>}
                        {saved && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><Check size={12}/> تم الحفظ</span>}
                        
                        <div className="flex bg-gray-50 rounded-lg border text-xs">
                            <div className="px-3 py-1 border-l text-green-700 font-bold">{stats.present} حاضر</div>
                            <div className="px-3 py-1 border-l text-red-700 font-bold">{stats.absent} غائب</div>
                            <div className="px-3 py-1 text-yellow-700 font-bold">{stats.late} متأخر</div>
                        </div>
                    </div>
                )}
              </div>

              {!selectedClass && (
                  <div className="animate-fade-in space-y-6">
                      
                      {/* Manual Selection Fallback */}
                      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
                           <div className="flex flex-col">
                               <label className="block text-xs font-bold text-gray-500 mb-1">فصل (اختيار يدوي)</label>
                               <select className="p-2 border rounded text-sm w-40 bg-gray-50" value={manualClass} onChange={e => setManualClass(e.target.value)}>
                                   <option value="">-- اختر --</option>
                                   {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                           </div>
                           <div className="flex flex-col">
                               <label className="block text-xs font-bold text-gray-500 mb-1">مادة</label>
                               <input className="p-2 border rounded text-sm w-40 bg-gray-50" value={manualSubject} onChange={e => setManualSubject(e.target.value)} placeholder="مثال: رياضيات"/>
                           </div>
                           <button 
                              disabled={!manualClass}
                              onClick={() => {
                                  setSelectedClass(manualClass);
                                  setSelectedSubject(manualSubject);
                                  setSelectedPeriod(0); // 0 indicates manual/no-period
                              }}
                              className="bg-gray-800 text-white px-4 py-2 rounded text-sm font-bold hover:bg-black disabled:opacity-50 transition-colors"
                           >
                               بدء التحضير
                           </button>
                      </div>

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
                              <p className="text-sm text-gray-500">استخدم الاختيار اليدوي أعلاه أو قم بإضافة الحصص في الجدول الدراسي.</p>
                          </div>
                      )}
                  </div>
              )}

              {selectedPeriod !== null && selectedClass && (
                <div id="attendance-list" className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-slide-up flex-1 flex flex-col">
                    <div className="bg-gray-800 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-4">
                            <button onClick={handleBackToSchedule} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowRight size={20}/></button>
                            <div>
                                <div className="flex items-center gap-2 font-bold text-lg"><span>{selectedClass}</span><span className="opacity-50">|</span><span>{selectedSubject || 'عام'}</span></div>
                                <span className="text-xs opacity-75">{selectedPeriod > 0 ? `الحصة ${selectedPeriod}` : 'تحضير يدوي'}</span>
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
                                            <textarea 
                                                autoFocus 
                                                className="w-full text-xs p-2 border rounded bg-gray-50 mb-2" 
                                                rows={2} 
                                                value={noteRecords[student.id] || ''} 
                                                onChange={(e) => handleNoteChange(student.id, e.target.value)}
                                                onBlur={() => handleNoteBlur(student.id)} // Save note on blur
                                                placeholder="اكتب ملاحظة..."
                                            />
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
                    {/* Auto Save Indicator instead of Big Save Button */}
                    <div className="p-3 bg-gray-50 border-t flex justify-between items-center text-xs text-gray-500">
                         <span className="flex items-center gap-1">
                             <Cloud size={14} className={isSaving ? "text-blue-500 animate-pulse" : "text-green-500"}/> 
                             {isSaving ? "جاري الحفظ التلقائي..." : "تم الحفظ تلقائياً في السحابة"}
                         </span>
                         <span className="font-mono text-[10px]">Auto-Save Enabled</span>
                    </div>
                </div>
              )}
          </div>
      )}

      {activeTab === 'LOG' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden animate-fade-in">
              <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 items-center justify-between print:hidden">
                  <div className="flex items-center gap-2">
                      <History className="text-purple-600"/>
                      <h3 className="font-bold text-gray-800">سجل المتابعة الشامل</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm items-center">
                      <button onClick={handlePrintLog} className="bg-gray-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-xs hover:bg-black transition-colors shadow-sm"><Printer size={14}/> طباعة</button>
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
                          {filteredHistory.length > 0 ? filteredHistory.map((rec) => {
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
                          }) : (
                              <tr><td colSpan={7} className="p-10 text-center text-gray-400">لا توجد سجلات مطابقة للفلتر</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

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
                  currentUser={currentUser} 
              />
          </div>
      )}

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
                      currentUser={currentUser}
                      existingStudents={students} 
                  />
              </div>
          </div>
      )}

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
                                                      <p className="text-xs text-gray-500">{formatDualDate(record.date)}</p>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-4 border border-gray-100 flex items-start gap-2">
                                              <FileText size={16} className="text-gray-400 mt-0.5 shrink-0"/>
                                              <p>{record.excuseNote || 'لا يوجد نص للعذر'}</p>
                                          </div>
                                          <div className="flex gap-3">
                                              <button onClick={() => handleAcceptExcuse(record)} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold text-sm">قبول</button>
                                              <button onClick={() => handleRejectExcuse(record)} className="flex-1 bg-white border border-red-200 text-red-600 py-2 rounded-lg font-bold text-sm">رفض</button>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      ) : <div className="text-center p-10 text-gray-400">لا توجد أعذار معلقة</div>}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Attendance;
