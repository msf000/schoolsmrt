
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, ScheduleItem, DayOfWeek, BehaviorStatus, PerformanceRecord, SystemUser } from '../types';
import { getSchedules } from '../services/storageService';
import { formatDualDate } from '../services/dateService';
import { Calendar, Save, CheckCircle2, FileSpreadsheet, Users, CheckSquare, XSquare, Clock, CalendarClock, School, ArrowRight, Smile, Frown, MessageSquare, Plus, Tag, X, Inbox, FileText, Check, Download, AlertCircle, TrendingUp, TrendingDown, Star, Sparkles, History, Filter, Search, Printer, Loader2, ArrowLeft, Cloud, RefreshCw, LayoutGrid, List, Activity } from 'lucide-react';
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
  if (!students) {
      return (
          <div className="flex flex-col items-center justify-center h-full p-12 text-center">
              <Loader2 className="animate-spin text-primary mb-4" size={48}/>
              <p className="text-gray-500 font-bold">جاري تحميل بيانات الطلاب...</p>
          </div>
      );
  }

  const [activeTab, setActiveTab] = useState<'REGISTER' | 'LOG'>('REGISTER');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('GRID'); // Default to Grid for better UX

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
  const [viewingStudentReport, setViewingStudentReport] = useState<Student | null>(null);

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

  const handlePrintLog = () => window.print();

  const todaysSchedule = useMemo(() => {
      if (!selectedDate) return [];
      const dateObj = new Date(selectedDate);
      const dayIndex = dateObj.getDay(); 
      const dayMap: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayMap[dayIndex];

      let dailySched = schedules.filter(s => s.day === currentDayName);
      if (currentUser && currentUser.role === 'TEACHER') {
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

  const saveSingleRecord = (studentId: string, updates: Partial<AttendanceRecord>) => {
      if (selectedPeriod === null) return;
      setIsSaving(true);
      const periodSuffix = selectedPeriod ? `-${selectedPeriod}` : '-0';
      const recordId = `${studentId}-${selectedDate}-${selectedSubject || 'manual'}${periodSuffix}`;
      
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

      onSaveAttendance([record]);
      setTimeout(() => setIsSaving(false), 500);
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    saveSingleRecord(studentId, { status });
  };

  // Toggle for Grid View: Present -> Absent -> Late -> Present
  const handleGridStatusToggle = (studentId: string) => {
      const current = records[studentId] || AttendanceStatus.PRESENT;
      let next = AttendanceStatus.PRESENT;
      
      if (current === AttendanceStatus.PRESENT) next = AttendanceStatus.ABSENT;
      else if (current === AttendanceStatus.ABSENT) next = AttendanceStatus.LATE;
      else if (current === AttendanceStatus.LATE) next = AttendanceStatus.PRESENT;
      else if (current === AttendanceStatus.EXCUSED) next = AttendanceStatus.PRESENT;

      handleStatusChange(studentId, next);
  };

  const handleBehaviorChange = (studentId: string, status: BehaviorStatus) => {
      const current = behaviorRecords[studentId];
      const next = current === status ? BehaviorStatus.NEUTRAL : status;
      setBehaviorRecords(prev => ({ ...prev, [studentId]: next }));
      saveSingleRecord(studentId, { behaviorStatus: next });
  };

  const handleNoteChange = (studentId: string, note: string) => {
      setNoteRecords(prev => ({ ...prev, [studentId]: note }));
  };
  
  const handleNoteBlur = (studentId: string) => {
      saveSingleRecord(studentId, { behaviorNote: noteRecords[studentId] });
  };

  const appendNote = (studentId: string, text: string) => {
      const current = noteRecords[studentId] || '';
      const updated = current ? `${current}، ${text}` : text;
      setNoteRecords(prev => ({ ...prev, [studentId]: updated }));
      saveSingleRecord(studentId, { behaviorNote: updated });
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
          document.getElementById('attendance-workspace')?.scrollIntoView({ behavior: 'smooth' });
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
  };

  // --- Calculate Individual Report Data ---
  const studentReportData = useMemo(() => {
      if (!viewingStudentReport) return null;
      
      const sAtt = attendanceHistory.filter(a => a.studentId === viewingStudentReport.id);
      const sPerf = performance.filter(p => p.studentId === viewingStudentReport.id);

      // Attendance
      const totalDays = sAtt.length;
      const present = sAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
      const absent = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
      const late = sAtt.filter(a => a.status === AttendanceStatus.LATE).length;
      const attRate = totalDays > 0 ? Math.round(((present + late) / totalDays) * 100) : 100;

      // Behavior
      const posBeh = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;
      const negBeh = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;

      // Academics
      const totalScore = sPerf.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
      const avgScore = sPerf.length > 0 ? Math.round((totalScore / sPerf.length) * 100) : 0;

      return {
          attRate, absent, late, posBeh, negBeh, avgScore,
          recentAtt: sAtt.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
          recentPerf: sPerf.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
      };
  }, [viewingStudentReport, attendanceHistory, performance]);

  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 print:hidden">
          <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
              <button onClick={() => setActiveTab('REGISTER')} className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'REGISTER' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <CheckSquare size={18}/> تسجيل الحضور
              </button>
              <button onClick={() => setActiveTab('LOG')} className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'LOG' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <History size={18}/> السجل الشامل
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
                        {isSaving && <span className="text-xs font-bold text-blue-600 flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> جاري الحفظ...</span>}
                        {saved && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><Check size={12}/> تم الحفظ</span>}
                        
                        <div className="flex bg-gray-50 rounded-lg border text-xs overflow-hidden">
                            <div className="px-3 py-1 bg-green-100 text-green-800 font-bold border-l border-green-200">{stats.present} حاضر</div>
                            <div className="px-3 py-1 bg-red-100 text-red-800 font-bold border-l border-red-200">{stats.absent} غائب</div>
                            <div className="px-3 py-1 bg-yellow-100 text-yellow-800 font-bold">{stats.late} متأخر</div>
                        </div>
                    </div>
                )}
              </div>

              {!selectedClass && (
                  <div className="animate-fade-in space-y-6">
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
                              onClick={() => { setSelectedClass(manualClass); setSelectedSubject(manualSubject); setSelectedPeriod(0); }}
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
                <div id="attendance-workspace" className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-slide-up flex-1 flex flex-col">
                    {/* Header Bar */}
                    <div className="bg-gray-800 p-4 flex justify-between items-center text-white sticky top-0 z-20">
                        <div className="flex items-center gap-4">
                            <button onClick={handleBackToSchedule} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowRight size={20}/></button>
                            <div>
                                <div className="flex items-center gap-2 font-bold text-lg"><span>{selectedClass}</span><span className="opacity-50">|</span><span>{selectedSubject || 'عام'}</span></div>
                                <span className="text-xs opacity-75">{selectedPeriod > 0 ? `الحصة ${selectedPeriod}` : 'تحضير يدوي'}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {/* View Toggle */}
                            <div className="flex bg-white/10 p-1 rounded-lg border border-white/20">
                                <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded ${viewMode === 'GRID' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/10'}`}><LayoutGrid size={16}/></button>
                                <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded ${viewMode === 'LIST' ? 'bg-white text-gray-900' : 'text-white hover:bg-white/10'}`}><List size={16}/></button>
                            </div>
                            <div className="w-[1px] bg-white/20 mx-1"></div>
                            <button onClick={() => handleMarkAll(AttendanceStatus.PRESENT)} className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 border border-green-500">تحضير الكل</button>
                            <button onClick={() => handleMarkAll(AttendanceStatus.ABSENT)} className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-700 border border-red-500">غياب للكل</button>
                        </div>
                    </div>

                    {/* Students List/Grid */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                        {viewMode === 'LIST' ? (
                            <div className="divide-y divide-gray-200 bg-white rounded-xl border shadow-sm">
                                {filteredStudents.map(student => {
                                    const metrics = getStudentMetrics(student.id);
                                    return (
                                    <div key={student.id} className="grid grid-cols-12 p-3 items-center hover:bg-gray-50 transition-colors group gap-y-3">
                                        <div className="col-span-12 md:col-span-3 font-medium">
                                            <span onClick={() => setViewingStudentReport(student)} className="text-gray-800 font-bold block cursor-pointer hover:text-primary hover:underline">{student.name}</span>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{student.gradeLevel}</span>
                                                {metrics.absentCount > 3 && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-bold flex gap-1"><AlertCircle size={10}/> غ: {metrics.absentCount}</span>}
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-5 flex gap-1">
                                            {[AttendanceStatus.PRESENT, AttendanceStatus.ABSENT, AttendanceStatus.LATE, AttendanceStatus.EXCUSED].map((st) => (
                                                <button key={st} onClick={() => handleStatusChange(student.id, st)} className={`flex-1 py-1.5 rounded-md text-xs font-bold border transition-all ${records[student.id] === st ? (st === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700 border-green-200' : st === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700 border-red-200' : st === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-blue-100 text-blue-700 border-blue-200') : 'bg-white text-gray-500 border-gray-200'}`}>
                                                    {st === 'PRESENT' ? 'حاضر' : st === 'ABSENT' ? 'غائب' : st === 'LATE' ? 'متأخر' : 'عذر'}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="col-span-12 md:col-span-4 flex items-center justify-end gap-2">
                                            <div className="flex bg-gray-50 p-1 rounded-lg border">
                                                <button onClick={() => handleBehaviorChange(student.id, BehaviorStatus.POSITIVE)} className={`p-1.5 rounded ${behaviorRecords[student.id] === BehaviorStatus.POSITIVE ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-green-500'}`}><Smile size={18}/></button>
                                                <button onClick={() => handleBehaviorChange(student.id, BehaviorStatus.NEGATIVE)} className={`p-1.5 rounded ${behaviorRecords[student.id] === BehaviorStatus.NEGATIVE ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-red-500'}`}><Frown size={18}/></button>
                                            </div>
                                            <button onClick={() => setActiveNoteStudent(activeNoteStudent === student.id ? null : student.id)} className={`p-2 rounded-lg border transition-all ${noteRecords[student.id] ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'bg-white text-gray-400'}`}><MessageSquare size={16}/></button>
                                        </div>
                                    </div>
                                )})}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {filteredStudents.map(student => {
                                    const status = records[student.id] || AttendanceStatus.PRESENT;
                                    const behavior = behaviorRecords[student.id];
                                    const metrics = getStudentMetrics(student.id);
                                    
                                    const bgClass = status === AttendanceStatus.PRESENT ? 'bg-white border-gray-200' : 
                                                    status === AttendanceStatus.ABSENT ? 'bg-red-50 border-red-300 ring-1 ring-red-200' : 
                                                    status === AttendanceStatus.LATE ? 'bg-yellow-50 border-yellow-300 ring-1 ring-yellow-200' : 
                                                    'bg-blue-50 border-blue-300 ring-1 ring-blue-200';

                                    return (
                                        <div 
                                            key={student.id}
                                            onClick={() => handleGridStatusToggle(student.id)}
                                            onDoubleClick={() => setActiveNoteStudent(student.id)}
                                            className={`relative p-3 rounded-xl border shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md select-none flex flex-col justify-between h-32 ${bgClass}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${status === 'PRESENT' ? 'bg-gray-300' : status === 'ABSENT' ? 'bg-red-500' : status === 'LATE' ? 'bg-yellow-500' : 'bg-blue-500'}`}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div className="flex gap-1">
                                                    {metrics.absentCount > 3 && (
                                                        <span className="text-[10px] bg-red-100 text-red-600 px-1.5 rounded font-bold border border-red-200">
                                                            {metrics.absentCount} غ
                                                        </span>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); setViewingStudentReport(student); }} className="p-1 rounded-full bg-white/50 hover:bg-blue-100 text-blue-600 border border-transparent hover:border-blue-200 transition-colors">
                                                        <FileText size={12}/>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-2 text-right">
                                                <span className="font-bold text-sm text-gray-800 line-clamp-2 leading-tight">{student.name}</span>
                                            </div>

                                            <div className="flex justify-between items-end mt-2 pt-2 border-t border-black/5" onClick={e => e.stopPropagation()}>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleBehaviorChange(student.id, BehaviorStatus.POSITIVE)} className={`p-1 rounded-md transition-colors ${behavior === BehaviorStatus.POSITIVE ? 'bg-green-500 text-white shadow-sm' : 'bg-black/5 text-gray-400 hover:bg-green-100'}`}><Smile size={14}/></button>
                                                    <button onClick={() => handleBehaviorChange(student.id, BehaviorStatus.NEGATIVE)} className={`p-1 rounded-md transition-colors ${behavior === BehaviorStatus.NEGATIVE ? 'bg-red-500 text-white shadow-sm' : 'bg-black/5 text-gray-400 hover:bg-red-100'}`}><Frown size={14}/></button>
                                                </div>
                                                <button onClick={() => setActiveNoteStudent(activeNoteStudent === student.id ? null : student.id)} className={`text-xs ${noteRecords[student.id] ? 'text-yellow-600' : 'text-gray-300'}`}><MessageSquare size={14}/></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        {/* Note Popup Overlay */}
                        {activeNoteStudent && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setActiveNoteStudent(null)}>
                                <div className="bg-white p-4 rounded-xl shadow-2xl w-80 animate-bounce-in" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-gray-800">ملاحظة للطالب</h4>
                                        <button onClick={() => setActiveNoteStudent(null)} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
                                    </div>
                                    <textarea 
                                        autoFocus 
                                        className="w-full text-sm p-3 border rounded-lg bg-gray-50 mb-3 focus:ring-2 focus:ring-blue-500 outline-none" 
                                        rows={3} 
                                        value={noteRecords[activeNoteStudent] || ''} 
                                        onChange={(e) => handleNoteChange(activeNoteStudent, e.target.value)}
                                        onBlur={() => handleNoteBlur(activeNoteStudent)} 
                                        placeholder="اكتب ملاحظة..."
                                    />
                                    <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar">
                                        {positiveList.map(tag => <button key={tag} onClick={() => appendNote(activeNoteStudent, tag)} className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 hover:bg-green-100">{tag}</button>)}
                                        {negativeList.map(tag => <button key={tag} onClick={() => appendNote(activeNoteStudent, tag)} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-100 hover:bg-red-100">{tag}</button>)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
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
                                      <td className="p-3 font-bold text-gray-800 cursor-pointer hover:text-primary hover:underline" onClick={() => student && setViewingStudentReport(student)}>{student?.name}</td>
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

      {/* STUDENT INDIVIDUAL REPORT MODAL */}
      {viewingStudentReport && studentReportData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
                  <div className="bg-gray-900 text-white p-4 flex justify-between items-start">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center font-bold text-xl border-2 border-gray-600">
                              {viewingStudentReport.name.charAt(0)}
                          </div>
                          <div>
                              <h3 className="font-bold text-lg">{viewingStudentReport.name}</h3>
                              <p className="text-xs text-gray-400">{viewingStudentReport.gradeLevel} - {viewingStudentReport.className}</p>
                          </div>
                      </div>
                      <button onClick={() => setViewingStudentReport(null)} className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 bg-gray-50 custom-scrollbar">
                      {/* STATS ROW */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
                              <div className="text-xs text-gray-500 font-bold mb-1">الحضور</div>
                              <div className={`text-xl font-black ${studentReportData.attRate >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                                  {studentReportData.attRate}%
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1">{studentReportData.absent} غياب</div>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
                              <div className="text-xs text-gray-500 font-bold mb-1">المعدل</div>
                              <div className="text-xl font-black text-blue-600">{studentReportData.avgScore}%</div>
                              <div className="text-[10px] text-gray-400 mt-1">أكاديمي</div>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-center">
                              <div className="text-xs text-gray-500 font-bold mb-1">السلوك</div>
                              <div className="flex justify-center gap-2 items-end">
                                  <span className="text-green-600 font-bold">{studentReportData.posBeh}</span>
                                  <span className="text-gray-300">/</span>
                                  <span className="text-red-600 font-bold">{studentReportData.negBeh}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1">إيجابي / سلبي</div>
                          </div>
                      </div>

                      {/* RECENT ACTIVITY */}
                      <div className="mb-4">
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><History size={12}/> آخر الحضور والسلوك</h4>
                          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                              {studentReportData.recentAtt.length > 0 ? (
                                  <div className="divide-y divide-gray-100">
                                      {studentReportData.recentAtt.map((rec) => (
                                          <div key={rec.id} className="p-3 flex justify-between items-center text-sm">
                                              <div className="flex items-center gap-2">
                                                  <span className="text-gray-400 text-xs font-mono">{rec.date.slice(5)}</span>
                                                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${rec.status === 'PRESENT' ? 'bg-green-50 text-green-700' : rec.status === 'ABSENT' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                                      {rec.status === 'PRESENT' ? 'حاضر' : rec.status === 'ABSENT' ? 'غائب' : 'تأخر'}
                                                  </span>
                                              </div>
                                              {(rec.behaviorStatus !== 'NEUTRAL' || rec.behaviorNote) && (
                                                  <div className="flex items-center gap-1 text-xs">
                                                      {rec.behaviorStatus === 'POSITIVE' && <Smile size={14} className="text-green-500"/>}
                                                      {rec.behaviorStatus === 'NEGATIVE' && <Frown size={14} className="text-red-500"/>}
                                                      <span className="text-gray-600 truncate max-w-[100px]">{rec.behaviorNote}</span>
                                                  </div>
                                              )}
                                          </div>
                                      ))}
                                  </div>
                              ) : <div className="p-4 text-center text-gray-400 text-xs">لا يوجد سجلات</div>}
                          </div>
                      </div>

                      {/* RECENT PERFORMANCE */}
                      <div>
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Activity size={12}/> آخر الدرجات</h4>
                          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                              {studentReportData.recentPerf.length > 0 ? (
                                  <div className="divide-y divide-gray-100">
                                      {studentReportData.recentPerf.map((p) => (
                                          <div key={p.id} className="p-3 flex justify-between items-center text-sm">
                                              <div>
                                                  <div className="font-bold text-gray-800">{p.title}</div>
                                                  <div className="text-xs text-gray-400">{p.subject}</div>
                                              </div>
                                              <div className="font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs border border-blue-100">
                                                  {p.score} / {p.maxScore}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              ) : <div className="p-4 text-center text-gray-400 text-xs">لا يوجد درجات مسجلة</div>}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Attendance;
