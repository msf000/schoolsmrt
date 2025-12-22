
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, ScheduleItem, Subject } from '../types';
import { 
    CheckCircle, XCircle, Clock, Users, ChevronRight, ChevronLeft, 
    Search, Sparkles, Star, ThumbsDown, BookOpen, 
    LayoutGrid, List, Eye, Calendar as CalendarIcon, 
    Zap, Loader2, ShieldCheck, UserCheck, Timer, CalendarDays, CalendarSearch,
    History, Trash2, Edit3, Filter, X, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSchedules, getTeacherAssignments, getTeacherPeriodTimings, getSubjects, saveAttendance, deleteAttendance } from '../services/storageService';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, currentUser }) => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'RECORD' | 'HISTORY'>('RECORD');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // History Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyClass, setHistoryClass] = useState('');

  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  useEffect(() => {
      if (currentUser) setAllSubjects(getSubjects(currentUser.id));
  }, [currentUser]);

  // استخراج جدول المعلم لليوم المختار
  const mySchedules = useMemo(() => {
      if (!currentUser) return [];
      return getSchedules().filter(s => s.teacherId === currentUser.id);
  }, [currentUser]);

  const timings = useMemo(() => currentUser ? getTeacherPeriodTimings(currentUser.id) : [], [currentUser]);
  
  const dayName = useMemo(() => {
      return new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
  }, [selectedDate]);

  const daySchedules = useMemo(() => {
      return mySchedules.filter(s => s.day === dayName).sort((a,b) => a.period - b.period);
  }, [mySchedules, dayName]);

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

  // تصفية التاريخ التاريخي
  const filteredHistory = useMemo(() => {
    return attendanceHistory.filter(a => {
        const student = students.find(s => s.id === a.studentId);
        if (!student) return false;
        if (historyClass && student.className !== historyClass) return false;
        if (historySearch && !student.name.includes(historySearch)) return false;
        return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceHistory, historySearch, historyClass, students]);

  const handleUpdate = async (studentId: string, status: AttendanceStatus, bStatus?: BehaviorStatus, pScore?: number) => {
    // إنشاء معرف فريد يمنع التكرار (طالب + مادة + حصة + تاريخ)
    const subjectToSave = selectedSubject || 'عام';
    const recordId = `${studentId}_${selectedDate}_${selectedPeriod}_${subjectToSave.replace(/\s/g, '_')}`;
    
    const existing = attendanceHistory.find(a => a.id === recordId);

    const record: AttendanceRecord = {
      id: recordId,
      studentId,
      date: selectedDate,
      period: selectedPeriod,
      subject: subjectToSave,
      status,
      behaviorStatus: bStatus || existing?.behaviorStatus || BehaviorStatus.NEUTRAL,
      participationScore: pScore !== undefined ? pScore : (existing?.participationScore || 0),
      createdById: currentUser?.id
    };
    
    setIsSyncing(true);
    await saveAttendance([record]);
    onSaveAttendance([record]); // Update Parent App state
    setIsSyncing(false);
  };

  const handleDeleteRecord = async (id: string) => {
      if(confirm('هل أنت متأكد من حذف هذا السجل نهائياً من قاعدة البيانات السحابية؟')) {
          setIsSyncing(true);
          await deleteAttendance(id);
          const remaining = attendanceHistory.filter(a => a.id !== id);
          onSaveAttendance(remaining); 
          setIsSyncing(false);
      }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50/50 animate-fade-in pb-24 font-tajawal overflow-hidden">
      
      {/* Tab Switcher */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 mb-6 w-fit self-center">
          <button onClick={() => setActiveTab('RECORD')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'RECORD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
              <UserCheck size={16}/> رصد الحضور
          </button>
          <button onClick={() => setActiveTab('HISTORY')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
              <History size={16}/> سجل البيانات السحابي
          </button>
      </div>

      {activeTab === 'RECORD' ? (
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
          
          {/* Timeline - Today's Schedule */}
          <div className="mb-6 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2 px-2"><CalendarDays size={18} className="text-indigo-600"/> جدول اليوم</h3>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border shadow-sm">
                    <CalendarSearch size={14} className="text-indigo-500"/>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[11px] font-black outline-none text-slate-700 cursor-pointer"/>
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
                  {daySchedules.length > 0 ? daySchedules.map(session => {
                      const isSelected = selectedPeriod === session.period && selectedClass === session.classId;
                      const isDone = attendanceHistory.some(a => a.date === selectedDate && a.period === session.period && a.subject === session.subjectName);
                      return (
                          <button key={session.id} onClick={() => { setSelectedPeriod(session.period); setSelectedClass(session.classId); setSelectedSubject(session.subjectName); }} className={`flex flex-col items-start p-3 min-w-[140px] rounded-2xl border-2 transition-all shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg' : isDone ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-white text-slate-500 shadow-sm'}`}>
                              <span className={`text-[10px] font-black ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>حصة {session.period}</span>
                              <span className="font-black text-xs truncate w-full text-right">{session.subjectName}</span>
                              <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{session.classId}</span>
                          </button>
                      );
                  }) : (
                      <div className="p-4 bg-white rounded-2xl text-xs font-bold text-slate-400 border border-dashed flex-1 text-center">لا توجد حصص مسجلة في جدولك لهذا اليوم</div>
                  )}
              </div>
          </div>

          {/* Controls */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 mb-6 relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-teal-500"></div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-800">تحضير: {selectedSubject || 'المادة العامة'}</h2>
                    <div className="flex items-center gap-4 text-slate-400 text-xs font-bold">
                        <span className="flex items-center gap-1"><CalendarIcon size={14}/> {selectedDate}</span>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <span className="flex items-center gap-1"><Timer size={14}/> الحصة {selectedPeriod}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <Users size={16} className="text-slate-400 mr-2"/>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[100px] text-slate-700">
                            <option value="">اختر الفصل...</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <BookOpen size={16} className="text-slate-400"/>
                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[100px] text-indigo-600">
                            <option value="">المادة...</option>
                            {Array.from(new Set([...daySchedules.map(s => s.subjectName), ...allSubjects.map(s => s.name)])).map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                    {isSyncing && <Loader2 size={24} className="animate-spin text-indigo-600 self-center"/>}
                </div>
            </div>
            <div className="mt-6 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                <input className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" placeholder="ابحث عن طالب بالاسم..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
            </div>
          </div>

          {/* Grid View */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                {filteredStudents.map(student => {
                  const recordId = `${student.id}_${selectedDate}_${selectedPeriod}_${(selectedSubject || 'عام').replace(/\s/g, '_')}`;
                  const record = attendanceHistory.find(a => a.id === recordId);
                  const status = record?.status || null;

                  return (
                    <div key={student.id} className={`p-4 rounded-[2rem] border-2 transition-all flex flex-col justify-between h-44 shadow-sm group ${status === AttendanceStatus.ABSENT ? 'bg-red-50 border-red-200' : status === AttendanceStatus.PRESENT ? 'bg-white border-emerald-100' : 'bg-white border-transparent hover:border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white' : status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{student.name.charAt(0)}</div>
                            <h4 className="text-sm font-black text-slate-800 truncate flex-1">{student.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
                            <button onClick={() => handleUpdate(student.id, AttendanceStatus.PRESENT)} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50'}`}><CheckCircle size={14}/> حاضر</button>
                            <button onClick={() => handleUpdate(student.id, AttendanceStatus.ABSENT)} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-red-50'}`}><XCircle size={14}/> غائب</button>
                        </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden animate-fade-in">
            <div className="p-5 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" placeholder="بحث باسم الطالب..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                    </div>
                    <select className="p-2 border border-slate-200 rounded-xl text-xs font-black bg-white" value={historyClass} onChange={e => setHistoryClass(e.target.value)}>
                        <option value="">كل الفصول</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    {isSyncing && <Loader2 className="animate-spin text-indigo-600" size={16}/>}
                    <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] font-black border border-indigo-100">إجمالي سجلات السحابة: {attendanceHistory.length}</div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50/80 sticky top-0 z-10 border-b text-slate-500 font-black uppercase">
                        <tr><th className="p-4 w-12 text-center">#</th><th className="p-4">التاريخ</th><th className="p-4">الطالب</th><th className="p-4">المادة/الحصة</th><th className="p-4 text-center">الحالة</th><th className="p-4 text-center">إجراءات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                        {filteredHistory.map((rec, idx) => {
                            const student = students.find(s => s.id === rec.studentId);
                            return (
                                <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4 text-center font-mono text-slate-300">{idx + 1}</td>
                                    <td className="p-4 text-slate-500 whitespace-nowrap">{rec.date}</td>
                                    <td className="p-4"><p className="text-slate-800 font-black">{student?.name || 'طالب محذوف'}</p><p className="text-[9px] text-slate-400">{student?.className}</p></td>
                                    <td className="p-4"><span className="text-indigo-600">{rec.subject || 'عام'}</span> {rec.period && <span className="mr-2 text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[8px]">ح{rec.period}</span>}</td>
                                    <td className="p-4 text-center">
                                        <select value={rec.status} onChange={(e) => { const st = e.target.value as AttendanceStatus; onSaveAttendance([{ ...rec, status: st }]); saveAttendance([{ ...rec, status: st }]); }} className={`p-1.5 rounded-lg font-black text-[9px] outline-none border transition-all ${rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : rec.status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600'}`}>
                                            <option value={AttendanceStatus.PRESENT}>حاضر</option>
                                            <option value={AttendanceStatus.ABSENT}>غائب</option>
                                            <option value={AttendanceStatus.LATE}>متأخر</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleDeleteRecord(rec.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {filteredHistory.length === 0 && <div className="p-20 text-center text-gray-300 font-black italic flex flex-col items-center gap-3"><History size={48} className="opacity-10"/>لا توجد سجلات تطابق البحث</div>}
            </div>
        </div>
      )}

      {/* Cloud Sync Status Notification */}
      <div className="fixed bottom-24 left-6 right-6 lg:left-80 lg:right-6 pointer-events-none">
          <div className="flex justify-end gap-2">
            <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-slide-up pointer-events-auto">
                <RefreshCw size={14} className={isSyncing ? 'animate-spin text-indigo-400' : 'text-indigo-400'}/>
                حالة المزامنة: <span className="text-emerald-400">نشط</span> 
                <div className="w-px h-4 bg-white/20"></div>
                <CheckCircle size={14} className="text-emerald-400"/> سحابي
            </div>
          </div>
      </div>
    </div>
  );
};

export default Attendance;
