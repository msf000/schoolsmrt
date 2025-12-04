
import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, ScheduleItem, DayOfWeek, BehaviorStatus } from '../types';
import { getSchedules } from '../services/storageService';
import { formatDualDate } from '../services/dateService';
import { Calendar, Save, CheckCircle2, FileSpreadsheet, Users, CheckSquare, XSquare, Clock, CalendarClock, School, ArrowRight, Smile, Frown, MessageSquare, Plus, Tag, X, Inbox, FileText, Check, Download, AlertCircle } from 'lucide-react';
import DataImport from './DataImport';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  onImportAttendance: (records: AttendanceRecord[]) => void;
  preSelectedClass?: string;
  preSelectedSubject?: string;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
}

// Default Predefined Notes (Used if no local storage found)
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
    onSaveAttendance, 
    onImportAttendance, 
    preSelectedClass, 
    preSelectedSubject,
    selectedDate: propDate,
    onDateChange
}) => {
  // Use prop date if available, else local state
  const [internalDate, setInternalDate] = useState(new Date().toISOString().split('T')[0]);
  const selectedDate = propDate !== undefined ? propDate : internalDate;
  const handleDateChange = (newDate: string) => {
      if (onDateChange) onDateChange(newDate);
      else setInternalDate(newDate);
      setSelectedPeriod(null);
      if (!preSelectedClass) setSelectedClass(''); 
  };
  
  // State for Attendance Status
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  // State for Behavior Status
  const [behaviorRecords, setBehaviorRecords] = useState<Record<string, BehaviorStatus>>({});
  // State for Behavior Notes
  const [noteRecords, setNoteRecords] = useState<Record<string, string>>({});
  // UI State for Note Input Popup
  const [activeNoteStudent, setActiveNoteStudent] = useState<string | null>(null);

  // --- Dynamic Lists State with Persistence ---
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
  
  // --- Excuse Manager State ---
  const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);

  // Filters & State
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  
  // Selection State (Driven by Schedule Click)
  const [selectedClass, setSelectedClass] = useState(preSelectedClass || '');
  const [selectedSubject, setSelectedSubject] = useState(preSelectedSubject || '');
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setSchedules(getSchedules());
  }, []);

  useEffect(() => {
      if(preSelectedClass) setSelectedClass(preSelectedClass);
      if(preSelectedSubject) setSelectedSubject(preSelectedSubject);
  }, [preSelectedClass, preSelectedSubject]);

  // --- Persist Tags Effects ---
  useEffect(() => {
      localStorage.setItem('behavior_positive_tags', JSON.stringify(positiveList));
  }, [positiveList]);

  useEffect(() => {
      localStorage.setItem('behavior_negative_tags', JSON.stringify(negativeList));
  }, [negativeList]);

  // Compute Today's Schedule (ALL Classes)
  const todaysSchedule = useMemo(() => {
      if (!selectedDate) return [];
      
      const dateObj = new Date(selectedDate);
      const dayIndex = dateObj.getDay(); // 0 = Sunday, 1 = Monday...
      const dayMap: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayMap[dayIndex];

      return schedules
        .filter(s => s.day === currentDayName)
        .sort((a, b) => a.period - b.period);
  }, [selectedDate, schedules]);

  // Group Schedule by Period for better display
  const scheduleByPeriod = useMemo(() => {
      const grouped: Record<number, ScheduleItem[]> = {};
      todaysSchedule.forEach(s => {
          if (!grouped[s.period]) grouped[s.period] = [];
          grouped[s.period].push(s);
      });
      return grouped;
  }, [todaysSchedule]);
  
  const sortedPeriods = Object.keys(scheduleByPeriod).map(Number).sort((a, b) => a - b);

  // Filter Logic - STRICT: Must have class selected via schedule
  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];

    return students.filter(student => {
        const studentKey = student.classId || student.className || student.gradeLevel;
        // Loose matching for class name/ID
        if (studentKey !== selectedClass && student.className !== selectedClass) return false;
        
        if (searchTerm && !student.name.includes(searchTerm)) return false;
        return true;
    });
  }, [students, selectedClass, searchTerm]);

  // Load existing attendance AND behavior
  useEffect(() => {
    if (filteredStudents.length === 0 || selectedPeriod === null) {
        setRecords({});
        setBehaviorRecords({});
        setNoteRecords({});
        return;
    }

    // STRICT filtering logic to ensure only records for THIS period are loaded
    const existing = attendanceHistory.filter(a => {
        // Ensure strictly matching date and period
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

  // Stats Logic
  const stats = useMemo(() => {
      if (filteredStudents.length === 0) return { present: 0, absent: 0, late: 0 };
      let present = 0, absent = 0, late = 0;
      filteredStudents.forEach(s => {
          const status = records[s.id];
          if (status === AttendanceStatus.ABSENT) absent++;
          else if (status === AttendanceStatus.LATE) late++;
          else present++; // Default or present or excused (treat excused as present in simple stats or absent?)
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

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const handleBehaviorChange = (studentId: string, status: BehaviorStatus) => {
      // Toggle logic: if clicking same status, revert to NEUTRAL
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

  // --- Dynamic Tags Logic ---
  const appendNote = (studentId: string, text: string) => {
      setNoteRecords(prev => {
          const current = prev[studentId] || '';
          // If empty, set text. If exists, append with comma
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
      e.stopPropagation(); // Prevent triggering the appendNote click
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
      // Auto scroll to list
      setTimeout(() => {
          document.getElementById('attendance-list')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
  };

  const handleBackToSchedule = () => {
      setSelectedClass('');
      setSelectedPeriod(null);
  };

  const getClassColor = (classId: string) => {
      const colors = [
        'border-blue-200 hover:bg-blue-50',
        'border-green-200 hover:bg-green-50', 
        'border-purple-200 hover:bg-purple-50',
        'border-orange-200 hover:bg-orange-50',
        'border-pink-200 hover:bg-pink-50',
        'border-teal-200 hover:bg-teal-50'
      ];
      let hash = 0;
      for (let i = 0; i < classId.length; i++) hash = classId.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
  };

  const statusOptions = [
    { value: AttendanceStatus.PRESENT, label: 'حاضر', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: AttendanceStatus.ABSENT, label: 'غائب', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: AttendanceStatus.LATE, label: 'متأخر', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: AttendanceStatus.EXCUSED, label: 'عذر', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <CalendarClock className="text-primary"/> 
                تسجيل الحضور والسلوك
            </h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">
                    {selectedClass ? 'تحضير الفصل المحدد' : 'جدول الحصص اليومي'}
                </span>
                <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {formatDualDate(selectedDate)}
                </span>
            </div>
        </div>
        
        {/* STATS BAR (NEW) */}
        {selectedClass && selectedPeriod !== null && (
            <div className="flex bg-gray-50 rounded-lg border border-gray-200 overflow-hidden text-xs md:text-sm">
                <div className="px-4 py-2 flex flex-col items-center justify-center border-l bg-green-50 text-green-700">
                    <span className="font-bold">{stats.present}</span>
                    <span className="text-[10px]">حاضر</span>
                </div>
                <div className="px-4 py-2 flex flex-col items-center justify-center border-l bg-red-50 text-red-700">
                    <span className="font-bold">{stats.absent}</span>
                    <span className="text-[10px]">غائب</span>
                </div>
                <div className="px-4 py-2 flex flex-col items-center justify-center bg-yellow-50 text-yellow-700">
                    <span className="font-bold">{stats.late}</span>
                    <span className="text-[10px]">متأخر</span>
                </div>
            </div>
        )}

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
             
             {/* Excuse Inbox Button */}
             <button 
                onClick={() => setIsExcuseModalOpen(true)}
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm text-sm font-bold relative"
             >
                <Inbox size={18} className={pendingExcuses.length > 0 ? "text-red-500" : "text-gray-400"} />
                <span>صندوق الأعذار</span>
                {pendingExcuses.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-bounce">
                        {pendingExcuses.length}
                    </span>
                )}
             </button>

             <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border group hover:border-primary transition-colors flex-1 xl:flex-none">
                <Calendar size={20} className="text-gray-500 group-hover:text-primary" />
                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="outline-none text-gray-700 bg-transparent text-sm font-bold w-full cursor-pointer"
                />
            </div>

             <button 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"
            >
                <FileSpreadsheet size={18} />
                <span className="hidden sm:inline">استيراد</span>
            </button>
        </div>
      </div>

      {/* TIMETABLE DISPLAY (Directly Shown - Grouped by Period) */}
      {!selectedClass && (
          <div className="animate-fade-in space-y-6">
              {sortedPeriods.length > 0 ? (
                  sortedPeriods.map(period => (
                     <div key={period} className="relative">
                         <div className="flex items-center gap-2 mb-3 px-1">
                            <div className="bg-gray-800 text-white p-1.5 rounded-lg shadow-sm">
                                <Clock size={16}/> 
                            </div>
                            <h3 className="font-bold text-gray-800">الحصة {period}</h3>
                            <div className="flex-1 h-[1px] bg-gray-200"></div>
                         </div>
                         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {scheduleByPeriod[period].map((s, idx) => (
                                <button 
                                    key={s.id}
                                    onClick={() => handleScheduleClick(s)}
                                    className={`
                                        group relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-right bg-white shadow-sm
                                        ${getClassColor(s.classId)} hover:-translate-y-1 hover:shadow-md
                                    `}
                                >
                                    <div className="flex justify-between w-full mb-2">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-primary transition-colors">
                                            {s.period}
                                        </span>
                                    </div>
                                    <h4 className="font-black text-lg truncate w-full mb-1 text-gray-800 group-hover:text-primary transition-colors">
                                        {s.classId}
                                    </h4>
                                    <p className="text-xs truncate w-full flex items-center gap-1 text-gray-500">
                                        <School size={12}/> {s.subjectName}
                                    </p>
                                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowRight size={16} className="text-gray-400"/>
                                    </div>
                                </button>
                            ))}
                         </div>
                     </div>
                  ))
              ) : (
                  <div className="flex flex-col items-center justify-center p-12 bg-white border-2 border-dashed border-gray-200 rounded-xl text-center shadow-sm h-96">
                      <div className="bg-gray-50 p-4 rounded-full mb-4">
                          <CalendarClock size={48} className="text-gray-300"/>
                      </div>
                      <h3 className="text-xl font-bold text-gray-700">لا يوجد جدول مسجل لليوم</h3>
                      <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                        يرجى التأكد من اختيار التاريخ الصحيح أو الذهاب إلى "إدارة المدرسة" لإضافة الحصص في الجدول الدراسي.
                      </p>
                  </div>
              )}
          </div>
      )}

      {/* Manual Selection if PreSelected Class but No Period */}
      {selectedClass && selectedPeriod === null && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center animate-fade-in">
              <h3 className="font-bold text-lg mb-4">اختر الحصة لـ {selectedClass}</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(p => (
                      <button 
                        key={p} 
                        onClick={() => setSelectedPeriod(p)}
                        className="px-6 py-3 bg-gray-50 border hover:bg-primary hover:text-white hover:border-primary rounded-xl font-bold transition-all shadow-sm"
                      >
                          الحصة {p}
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* STUDENT LIST (Only if Class Selected) */}
      {selectedPeriod !== null && selectedClass && (
        <div id="attendance-list" className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-slide-up">
            
            {/* Header & Actions */}
            <div className="bg-gray-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-white">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button 
                        onClick={handleBackToSchedule}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        title="عودة للجدول"
                    >
                        <ArrowRight size={20}/>
                    </button>
                    <div>
                        <div className="flex items-center gap-2 font-bold text-lg">
                            <span>{selectedClass}</span>
                            <span className="opacity-50">|</span>
                            <span>{selectedSubject || 'مادة عامة'}</span>
                        </div>
                        <span className="text-xs opacity-75">الحصة {selectedPeriod} • عدد الطلاب: {filteredStudents.length}</span>
                    </div>
                </div>

                {filteredStudents.length > 0 && (
                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <button 
                            onClick={() => handleMarkAll(AttendanceStatus.PRESENT)}
                            className="flex items-center gap-1 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-700 shadow-lg border border-green-500 whitespace-nowrap"
                        >
                            <CheckSquare size={14} /> تحضير الكل
                        </button>
                        <button 
                            onClick={() => handleMarkAll(AttendanceStatus.ABSENT)}
                            className="flex items-center gap-1 bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-700 shadow-lg border border-red-500 whitespace-nowrap"
                        >
                            <XSquare size={14} /> غياب للكل
                        </button>
                    </div>
                )}
            </div>

            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {filteredStudents.length > 0 ? filteredStudents.map(student => (
                <div key={student.id} className="grid grid-cols-12 p-3 md:p-4 items-center hover:bg-gray-50 transition-colors group gap-y-3">
                    {/* Student Info: Full width on mobile, 3 cols on desktop */}
                    <div className="col-span-12 md:col-span-3 font-medium flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center">
                        <span className="text-gray-800 font-bold text-base">{student.name}</span>
                        <div className="flex items-center gap-2 mt-0 md:mt-1">
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{student.gradeLevel}</span>
                            {/* Behavior Status Badge */}
                            {behaviorRecords[student.id] === BehaviorStatus.POSITIVE && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1"><Smile size={10}/> ممتاز</span>}
                            {behaviorRecords[student.id] === BehaviorStatus.NEGATIVE && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1"><Frown size={10}/> سيء</span>}
                        </div>
                    </div>
                    
                    {/* Attendance Buttons: Full width on mobile, 5 cols on desktop */}
                    <div className="col-span-12 md:col-span-5 flex gap-1.5 justify-between md:justify-center">
                        {statusOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => handleStatusChange(student.id, opt.value)}
                            className={`
                            px-2 py-3 md:py-1.5 rounded-lg text-xs font-bold border transition-all flex-1 text-center
                            ${records[student.id] === opt.value 
                                ? `${opt.color} shadow-md transform scale-105` 
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-700'}
                            `}
                        >
                            {opt.label}
                        </button>
                        ))}
                    </div>

                    {/* Behavior & Notes: Full width on mobile, 4 cols on desktop */}
                    <div className="col-span-12 md:col-span-4 flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 md:border-r border-gray-100 pt-2 md:pt-0 md:pr-3 relative">
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="flex flex-1 md:flex-none gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 justify-center">
                                <button
                                    onClick={() => handleBehaviorChange(student.id, BehaviorStatus.POSITIVE)}
                                    className={`flex-1 md:flex-none p-2 rounded transition-all ${behaviorRecords[student.id] === BehaviorStatus.POSITIVE ? 'bg-green-500 text-white shadow-sm' : 'text-gray-400 hover:text-green-500 hover:bg-white'}`}
                                    title="سلوك إيجابي"
                                >
                                    <Smile size={18} className="mx-auto"/>
                                </button>
                                <button
                                    onClick={() => handleBehaviorChange(student.id, BehaviorStatus.NEGATIVE)}
                                    className={`flex-1 md:flex-none p-2 rounded transition-all ${behaviorRecords[student.id] === BehaviorStatus.NEGATIVE ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 hover:text-red-500 hover:bg-white'}`}
                                    title="سلوك سلبي"
                                >
                                    <Frown size={18} className="mx-auto"/>
                                </button>
                            </div>

                            <div className="relative flex-1 md:flex-none">
                                <button 
                                    onClick={() => setActiveNoteStudent(activeNoteStudent === student.id ? null : student.id)}
                                    className={`w-full flex items-center justify-center gap-1 p-2 rounded-lg text-xs font-bold border transition-all h-full ${noteRecords[student.id] ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-gray-200 text-gray-400 hover:border-blue-300'}`}
                                >
                                    <MessageSquare size={16}/>
                                    {noteRecords[student.id] ? 'تعديل' : 'ملاحظة'}
                                </button>
                                
                                {/* --- SMART POPOVER FOR NOTES --- */}
                                {activeNoteStudent === student.id && (
                                    <div className="absolute bottom-full left-0 md:top-full md:bottom-auto mb-2 md:mt-2 w-[calc(100vw-3rem)] md:w-80 bg-white shadow-2xl rounded-xl border border-gray-200 p-4 z-50 animate-fade-in right-0 md:right-auto md:left-0">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-xs font-bold text-gray-500">تدوين ملاحظة سلوكية</h4>
                                            <button onClick={() => setActiveNoteStudent(null)} className="text-gray-400 hover:text-gray-600"><X size={16}/></button>
                                        </div>
                                        
                                        <textarea
                                            autoFocus
                                            className="w-full text-sm p-2 border rounded-lg mb-3 focus:ring-2 focus:ring-primary/20 outline-none bg-gray-50"
                                            rows={2}
                                            placeholder="اكتب ملاحظة أو اختر من القائمة..."
                                            value={noteRecords[student.id] || ''}
                                            onChange={(e) => handleNoteChange(student.id, e.target.value)}
                                        />

                                        {/* Smart Lists based on Status */}
                                        <div className="mb-2">
                                            <div className="text-[10px] font-bold text-gray-400 mb-1 flex justify-between items-center">
                                                <span>خيارات سريعة (اضغط للإضافة):</span>
                                                {behaviorRecords[student.id] === BehaviorStatus.POSITIVE ? 
                                                    <span className="text-green-600">قائمة السلوك الإيجابي</span> : 
                                                behaviorRecords[student.id] === BehaviorStatus.NEGATIVE ? 
                                                    <span className="text-red-600">قائمة السلوك السلبي</span> :
                                                    <span>الكل</span>
                                                }
                                            </div>
                                            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                                {/* Logic: If Positive, show Positive tags. If Negative, show Negative. Else show both. */}
                                                {(behaviorRecords[student.id] !== BehaviorStatus.NEGATIVE) && positiveList.map(tag => (
                                                    <div key={tag} className="group relative">
                                                        <button 
                                                            onClick={() => appendNote(student.id, tag)}
                                                            className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-[10px] rounded border border-green-100 transition-colors flex items-center gap-1"
                                                        >
                                                            <Tag size={10}/> {tag}
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDeleteTag('POS', tag, e)} 
                                                            className="absolute -top-1 -left-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-sm z-10"
                                                            title="حذف من القائمة"
                                                        >
                                                            <X size={8}/>
                                                        </button>
                                                    </div>
                                                ))}
                                                {(behaviorRecords[student.id] !== BehaviorStatus.POSITIVE) && negativeList.map(tag => (
                                                    <div key={tag} className="group relative">
                                                        <button 
                                                            onClick={() => appendNote(student.id, tag)}
                                                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[10px] rounded border border-red-100 transition-colors flex items-center gap-1"
                                                        >
                                                            <Tag size={10}/> {tag}
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDeleteTag('NEG', tag, e)} 
                                                            className="absolute -top-1 -left-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-sm z-10"
                                                            title="حذف من القائمة"
                                                        >
                                                            <X size={8}/>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Add New Tag */}
                                        <div className="flex gap-1 border-t pt-2 mt-2">
                                            <input 
                                                type="text" 
                                                className="flex-1 p-1 text-xs border rounded outline-none focus:border-gray-400" 
                                                placeholder="أضف عبارة جديدة للقائمة..."
                                                value={newNoteInput}
                                                onChange={(e) => setNewNoteInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if(e.key === 'Enter') handleAddNewTag(behaviorRecords[student.id] === BehaviorStatus.NEGATIVE ? 'NEG' : 'POS');
                                                }}
                                            />
                                            <button 
                                                onClick={() => handleAddNewTag(behaviorRecords[student.id] === BehaviorStatus.NEGATIVE ? 'NEG' : 'POS')}
                                                disabled={!newNoteInput}
                                                className="bg-gray-800 text-white p-1.5 rounded hover:bg-black disabled:opacity-50 transition-colors"
                                                title="إضافة للقائمة الدائمة"
                                            >
                                                <Plus size={14}/>
                                            </button>
                                        </div>

                                        <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-dashed">
                                            <button onClick={() => handleNoteChange(student.id, '')} className="text-xs text-red-500 hover:underline px-2">مسح النص</button>
                                            <button onClick={() => setActiveNoteStudent(null)} className="text-xs bg-primary text-white px-4 py-1.5 rounded-lg hover:bg-teal-700 font-bold shadow-sm">حفظ وإغلاق</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )) : (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                    <Users size={48} className="mb-4 opacity-20"/>
                    <p>لا يوجد طلاب مسجلين في هذا الفصل ({selectedClass}).</p>
                    <p className="text-xs mt-2">يرجى التأكد من تطابق اسم الفصل في "بيانات الطلاب" مع الاسم في الجدول.</p>
                </div>
            )}
            </div>

            {/* Sticky Footer for Save */}
            <div className="p-4 bg-gray-50 border-t flex justify-between items-center sticky bottom-0 z-20 shadow-inner">
                 <button onClick={handleBackToSchedule} className="text-gray-500 hover:text-gray-800 text-sm font-bold px-4">
                    إلغاء
                 </button>
                 <button 
                    onClick={handleSave}
                    disabled={filteredStudents.length === 0}
                    className="bg-primary hover:bg-teal-800 disabled:bg-gray-400 text-white px-6 md:px-8 py-3 rounded-xl flex items-center gap-2 shadow-lg transition-all transform active:scale-95 font-bold"
                 >
                    {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
                    <span>{saved ? 'تم الحفظ' : `حفظ التحضير`}</span>
                 </button>
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
              />
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
