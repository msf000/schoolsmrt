import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, Subject, ScheduleItem, DayOfWeek } from '../types';
import { getSubjects, getSchedules } from '../services/storageService';
import { formatDualDate } from '../services/dateService';
import { Calendar, Save, CheckCircle2, FileSpreadsheet, Filter, Users, CheckSquare, XSquare, Clock, Search, BookOpen, ChevronUp, Bell, AlertCircle } from 'lucide-react';
import DataImport from './DataImport';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  onImportAttendance: (records: AttendanceRecord[]) => void;
}

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, onImportAttendance }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filters & State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null); // New: Track period
  
  // Filter States
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Extract unique classes derived strictly from STUDENT DATA
  const availableClasses = useMemo(() => {
      const uniqueMap = new Map();
      students.forEach(s => {
          const key = s.classId || s.className || s.gradeLevel || 'Unknown';
          if (key !== 'Unknown' && !uniqueMap.has(key)) {
              let label = s.className || '';
              if (s.gradeLevel && !label.includes(s.gradeLevel)) {
                  label = `${s.gradeLevel} ${label ? `- ${label}` : ''}`;
              }
              if (!label) label = "فصل غير مسمى";
              uniqueMap.set(key, { id: key, label: label });
          }
      });
      return Array.from(uniqueMap.values());
  }, [students]);

  useEffect(() => {
    setSubjects(getSubjects());
    setSchedules(getSchedules());
    // Default subject fallback
    if (getSubjects().length > 0) setSelectedSubject(getSubjects()[0].name);
    else setSelectedSubject('عام');
  }, []);

  // Compute Today's Schedule based on Date and Selected Class
  const todaysSchedule = useMemo(() => {
      if (!selectedClass || !selectedDate) return [];
      
      const dateObj = new Date(selectedDate);
      const dayIndex = dateObj.getDay(); // 0 = Sunday, 1 = Monday...
      const dayMap: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayMap[dayIndex];

      return schedules
        .filter(s => s.classId === selectedClass && s.day === currentDayName)
        .sort((a, b) => a.period - b.period);
  }, [selectedClass, selectedDate, schedules]);


  // Filter Logic - STRICT: Must select class or search to see data
  const filteredStudents = useMemo(() => {
    if (!selectedClass && !searchTerm) return [];

    return students.filter(student => {
        if (selectedClass) {
            const studentKey = student.classId || student.className || student.gradeLevel;
            if (studentKey !== selectedClass) return false;
        }
        if (searchTerm && !student.name.includes(searchTerm)) return false;
        return true;
    });
  }, [students, selectedClass, searchTerm]);

  // Load existing attendance for selected date AND subject AND period (if applicable)
  useEffect(() => {
    if (filteredStudents.length === 0) {
        setRecords({});
        return;
    }

    // Filter logic: Date match + (Subject Match OR (No Subject in record && 'General')) + (Period Match if selected)
    const existing = attendanceHistory.filter(a => {
        const dateMatch = a.date === selectedDate;
        const subjectMatch = a.subject === selectedSubject || (!a.subject && selectedSubject === 'عام');
        const periodMatch = selectedPeriod ? a.period === selectedPeriod : true; 
        
        return dateMatch && subjectMatch && periodMatch;
    });

    const initialRecs: Record<string, AttendanceStatus> = {};
    filteredStudents.forEach(s => {
      const found = existing.find(r => r.studentId === s.id);
      initialRecs[s.id] = found ? found.status : AttendanceStatus.PRESENT;
    });
    setRecords(initialRecs);
    setSaved(false);
  }, [selectedDate, selectedSubject, selectedPeriod, filteredStudents, attendanceHistory]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
      const newRecords = { ...records };
      filteredStudents.forEach(student => {
          newRecords[student.id] = status;
      });
      setRecords(newRecords);
      setSaved(false);
  };

  const handleSave = () => {
    if (filteredStudents.length === 0) return;

    // Unique ID logic: Student-Date-Subject-Period
    const periodSuffix = selectedPeriod ? `-${selectedPeriod}` : '';
    
    const recordsToSave: AttendanceRecord[] = filteredStudents.map(s => ({
      id: `${s.id}-${selectedDate}-${selectedSubject}${periodSuffix}`,
      studentId: s.id,
      date: selectedDate,
      status: records[s.id] || AttendanceStatus.PRESENT,
      subject: selectedSubject,
      period: selectedPeriod || undefined
    }));
    
    onSaveAttendance(recordsToSave);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const statusOptions = [
    { value: AttendanceStatus.PRESENT, label: 'حاضر', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: AttendanceStatus.ABSENT, label: 'غائب', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: AttendanceStatus.LATE, label: 'متأخر', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: AttendanceStatus.EXCUSED, label: 'عذر', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">تسجيل الحضور والغياب</h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">التاريخ:</span>
                <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {formatDualDate(selectedDate)}
                </span>
            </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
             <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm group hover:border-primary transition-colors flex-1 xl:flex-none">
                <Calendar size={20} className="text-gray-500 group-hover:text-primary" />
                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedPeriod(null); }} // Reset period on date change
                    className="outline-none text-gray-700 bg-transparent text-sm font-bold w-full"
                />
            </div>

             <button 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm"
            >
                <FileSpreadsheet size={18} />
                <span className="hidden sm:inline">استيراد</span>
            </button>
        </div>
      </div>

      {/* Class Selection */}
      <div className={`bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4 items-end md:items-center transition-colors ${!selectedClass ? 'border-primary ring-1 ring-primary/30' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2 text-gray-700 font-bold pl-4">
             <Filter size={20} className="text-primary"/>
             تصفية القائمة:
          </div>
          
          <div className="flex-1 w-full md:w-auto">
            <select 
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                value={selectedClass}
                onChange={e => { setSelectedClass(e.target.value); setSelectedPeriod(null); }}
            >
                <option value="">-- اختر الفصل لعرض الطلاب --</option>
                {availableClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                ))}
            </select>
          </div>

           {/* Manual Subject Selector (Fallback if no schedule used) */}
           <div className="flex-1 w-full md:w-auto relative">
                <select 
                    value={selectedSubject}
                    onChange={(e) => { setSelectedSubject(e.target.value); setSelectedPeriod(null); }}
                    className="w-full p-2.5 border rounded-lg bg-gray-50 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    disabled={selectedPeriod !== null} // Disable if a schedule period is selected
                >
                    <option value="">-- اختر المادة --</option>
                    {subjects.length > 0 ? subjects.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                    )) : <option value="عام">عام</option>}
                </select>
                {selectedPeriod !== null && <span className="absolute left-3 top-3 text-[10px] text-green-600 font-bold">حسب الجدول</span>}
           </div>
      </div>

      {/* TIMETABLE SELECTION (New Feature) */}
      {selectedClass && (
          <div className="animate-fade-in">
              <h3 className="text-sm font-bold text-gray-500 mb-2 flex items-center gap-2"><Clock size={16}/> جدول حصص اليوم:</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                  {todaysSchedule.length > 0 ? todaysSchedule.map(s => (
                      <button 
                        key={s.id}
                        onClick={() => { setSelectedSubject(s.subjectName); setSelectedPeriod(s.period); }}
                        className={`flex flex-col items-center min-w-[100px] p-3 rounded-lg border transition-all ${selectedPeriod === s.period ? 'bg-primary text-white shadow-md transform scale-105' : 'bg-white hover:bg-gray-50 text-gray-600'}`}
                      >
                          <span className="text-xs font-bold opacity-80">الحصة {s.period}</span>
                          <span className="font-bold">{s.subjectName}</span>
                      </button>
                  )) : (
                      <div className="text-sm text-gray-400 flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-dashed border-gray-200">
                          <AlertCircle size={14}/> لا يوجد جدول مسجل لهذا اليوم. يمكنك اختيار المادة يدوياً من القائمة أعلاه.
                      </div>
                  )}
                  {/* Option to clear period selection */}
                  {selectedPeriod !== null && (
                      <button 
                        onClick={() => setSelectedPeriod(null)}
                        className="text-xs text-red-500 underline self-center px-2"
                      >
                          إلغاء تحديد الحصة
                      </button>
                  )}
              </div>
          </div>
      )}

      {/* Bulk Actions & List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Header & Actions */}
        <div className="bg-gray-50 p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 font-medium text-gray-600">
                <Users size={16}/> 
                <span>قائمة الطلاب ({filteredStudents.length}) - <span className="text-primary font-bold">{selectedSubject} {selectedPeriod ? `(الحصة ${selectedPeriod})` : ''}</span></span>
            </div>

            {filteredStudents.length > 0 && (
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleMarkAll(AttendanceStatus.PRESENT)}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm"
                    >
                        <CheckSquare size={14} /> تحضير الكل
                    </button>
                    <button 
                        onClick={() => handleMarkAll(AttendanceStatus.ABSENT)}
                        className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100"
                    >
                        <XSquare size={14} /> غياب للكل
                    </button>
                     <button 
                        onClick={() => handleMarkAll(AttendanceStatus.LATE)}
                        className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-yellow-100"
                    >
                        <Clock size={14} /> تأخير للكل
                    </button>
                </div>
            )}
        </div>

        <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
          {filteredStudents.length > 0 ? filteredStudents.map(student => (
            <div key={student.id} className="grid grid-cols-12 p-4 items-center hover:bg-gray-50 transition-colors group">
              <div className="col-span-12 sm:col-span-4 font-medium mb-2 sm:mb-0 flex flex-col">
                  <span className="text-gray-800 font-bold">{student.name}</span>
                  <span className="text-xs text-gray-400 group-hover:text-gray-600">
                      {student.gradeLevel} {student.className ? `- ${student.className}` : ''}
                  </span>
              </div>
              <div className="col-span-12 sm:col-span-8 flex flex-wrap gap-2 justify-end">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(student.id, opt.value)}
                    className={`
                      px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex-1 sm:flex-none text-center
                      ${records[student.id] === opt.value 
                        ? `${opt.color} ring-1 ring-offset-1 ring-gray-200 shadow-sm` 
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )) : (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                  {!selectedClass && !searchTerm ? (
                     <>
                        <ChevronUp size={48} className="mb-4 opacity-30 text-primary animate-bounce"/>
                        <p className="font-bold text-gray-600 text-lg">الرجاء اختيار الفصل أولاً</p>
                        <p className="text-sm mt-2 text-gray-400">يجب تحديد الفصل من القائمة أعلاه لعرض الطلاب وتسجيل الحضور.</p>
                     </>
                  ) : (
                     <>
                        <Users size={48} className="mb-4 opacity-20"/>
                        <p>لا يوجد طلاب مطابقين للبحث.</p>
                     </>
                  )}
              </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-4 sticky bottom-0 bg-gray-50/90 backdrop-blur p-4 border-t border-gray-200 z-10">
        <button 
          onClick={handleSave}
          disabled={filteredStudents.length === 0}
          className="bg-primary hover:bg-teal-800 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg flex items-center gap-2 shadow-lg transition-all transform active:scale-95"
        >
          {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
          <span>{saved ? 'تم الحفظ بنجاح' : `حفظ التحضير لمادة ${selectedSubject} ${selectedPeriod ? `(حصة ${selectedPeriod})` : ''}`}</span>
        </button>
      </div>

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
    </div>
  );
};

export default Attendance;