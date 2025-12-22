
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, ScheduleItem, Subject } from '../types';
import { 
    CheckCircle, XCircle, Clock, Users, Search, Sparkles, Star, BookOpen, 
    Calendar as CalendarIcon, Loader2, UserCheck, Timer, CalendarDays, 
    CalendarSearch, History, Trash2, RefreshCw, AlertTriangle, TrendingUp
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

  // إحصائيات سريعة للفصل المختار
  const classStats = useMemo(() => {
    if (!selectedClass) return null;
    const classStudents = students.filter(s => s.className === selectedClass);
    const todayRecords = attendanceHistory.filter(a => a.date === selectedDate && a.period === selectedPeriod && a.subject === (selectedSubject || 'عام'));
    const present = todayRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
    const absent = todayRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;
    const late = todayRecords.filter(r => r.status === AttendanceStatus.LATE).length;
    
    return {
        total: classStudents.length,
        present,
        absent,
        late,
        rate: classStudents.length > 0 ? Math.round((present / classStudents.length) * 100) : 0
    };
  }, [selectedClass, selectedDate, selectedPeriod, selectedSubject, attendanceHistory, students]);

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

  const filteredHistory = useMemo(() => {
    return attendanceHistory.filter(a => {
        const student = students.find(s => s.id === a.studentId);
        if (!student) return false;
        if (historyClass && student.className !== historyClass) return false;
        if (historySearch && !student.name.includes(historySearch)) return false;
        return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [attendanceHistory, historySearch, historyClass, students]);

  const handleUpdate = async (studentId: string, status: AttendanceStatus, pScore?: number) => {
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
      participationScore: pScore !== undefined ? pScore : (existing?.participationScore || 0),
      createdById: currentUser?.id
    };
    
    setIsSyncing(true);
    await saveAttendance([record]);
    onSaveAttendance([record]);
    setIsSyncing(false);
  };

  const markAllPresent = async () => {
    if (!selectedClass) return;
    const records = filteredStudents.map(s => {
        const sid = s.id;
        const subjectToSave = selectedSubject || 'عام';
        const recordId = `${sid}_${selectedDate}_${selectedPeriod}_${subjectToSave.replace(/\s/g, '_')}`;
        return {
            id: recordId,
            studentId: sid,
            date: selectedDate,
            period: selectedPeriod,
            subject: subjectToSave,
            status: AttendanceStatus.PRESENT,
            createdById: currentUser?.id
        } as AttendanceRecord;
    });
    setIsSyncing(true);
    await saveAttendance(records);
    onSaveAttendance(records);
    setIsSyncing(false);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in pb-24 font-tajawal overflow-hidden">
      
      {/* Tab Switcher */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6 w-fit self-center">
          <button onClick={() => setActiveTab('RECORD')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'RECORD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
              <UserCheck size={16}/> رصد الحضور
          </button>
          <button onClick={() => setActiveTab('HISTORY')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
              <History size={16}/> سجل البيانات
          </button>
      </div>

      {activeTab === 'RECORD' ? (
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
          
          {/* Statistics Bar */}
          {classStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatMiniCard label="نسبة الحضور" value={`${classStats.rate}%`} icon={<TrendingUp size={16}/>} color="text-indigo-600 bg-indigo-50" />
                <StatMiniCard label="الحاضرون" value={classStats.present} icon={<CheckCircle size={16}/>} color="text-emerald-600 bg-emerald-50" />
                <StatMiniCard label="الغائبون" value={classStats.absent} icon={<XCircle size={16}/>} color="text-red-600 bg-red-50" />
                <StatMiniCard label="المتأخرون" value={classStats.late} icon={<Clock size={16}/>} color="text-amber-600 bg-amber-50" />
            </div>
          )}

          {/* Controls */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 mb-6 relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-teal-500"></div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-slate-800">تحضير الفصل</h2>
                        {isSyncing && <Loader2 size={20} className="animate-spin text-indigo-600"/>}
                    </div>
                    <div className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        <span className="flex items-center gap-1"><CalendarIcon size={14}/> {selectedDate}</span>
                        <div className="h-3 w-px bg-slate-200"></div>
                        <span className="flex items-center gap-1"><Timer size={14}/> الحصة {selectedPeriod}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <Users size={16} className="text-slate-400 mr-2"/>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[120px] text-slate-700 cursor-pointer">
                            <option value="">اختر الفصل...</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <BookOpen size={16} className="text-slate-400"/>
                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[120px] text-indigo-600 cursor-pointer">
                            <option value="">المادة...</option>
                            {Array.from(new Set(attendanceHistory.map(a => a.subject).filter(Boolean))).map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={markAllPresent} disabled={!selectedClass || isSyncing} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50">
                        تحضير الكل "حاضر"
                    </button>
                </div>
            </div>
            <div className="mt-6 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                <input className="w-full pr-12 pl-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" placeholder="ابحث عن طالب في هذا الفصل..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
            </div>
          </div>

          {/* Student Grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                {filteredStudents.map(student => {
                  const recordId = `${student.id}_${selectedDate}_${selectedPeriod}_${(selectedSubject || 'عام').replace(/\s/g, '_')}`;
                  const record = attendanceHistory.find(a => a.id === recordId);
                  const status = record?.status || null;
                  const pScore = record?.participationScore || 0;

                  return (
                    <div key={student.id} className={`p-5 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between h-52 shadow-sm group ${status === AttendanceStatus.ABSENT ? 'bg-red-50 border-red-200' : status === AttendanceStatus.PRESENT ? 'bg-white border-emerald-100' : 'bg-white border-transparent hover:border-slate-200'}`}>
                        <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white' : status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {student.name.charAt(0)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h4 className="text-sm font-black text-slate-800 truncate">{student.name}</h4>
                                <div className="flex items-center gap-1 mt-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <Star key={star} size={12} onClick={() => handleUpdate(student.id, status || AttendanceStatus.PRESENT, star)} className={`cursor-pointer transition-all ${star <= pScore ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                            <button onClick={() => handleUpdate(student.id, AttendanceStatus.PRESENT)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50'}`}><CheckCircle size={14}/> حاضر</button>
                            <button onClick={() => handleUpdate(student.id, AttendanceStatus.ABSENT)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-red-50'}`}><XCircle size={14}/> غائب</button>
                            <button onClick={() => handleUpdate(student.id, AttendanceStatus.LATE)} className={`p-2.5 rounded-xl transition-all ${status === AttendanceStatus.LATE ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}><Clock size={16}/></button>
                        </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden animate-fade-in">
            <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" placeholder="بحث باسم الطالب..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                    </div>
                    <select className="p-2.5 border border-slate-200 rounded-xl text-xs font-black bg-white shadow-sm" value={historyClass} onChange={e => setHistoryClass(e.target.value)}>
                        <option value="">كل الفصول</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    {isSyncing && <Loader2 className="animate-spin text-indigo-600" size={16}/>}
                    <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] font-black border border-indigo-100">سجلات السحابة: {attendanceHistory.length}</div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50/80 sticky top-0 z-10 border-b text-slate-500 font-black uppercase">
                        <tr><th className="p-5 w-12 text-center">#</th><th className="p-5">التاريخ</th><th className="p-5">الطالب</th><th className="p-5">المادة/الحصة</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">إجراءات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                        {filteredHistory.map((rec, idx) => {
                            const student = students.find(s => s.id === rec.studentId);
                            return (
                                <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-5 text-center font-mono text-slate-300">{idx + 1}</td>
                                    <td className="p-5 text-slate-500 whitespace-nowrap">{rec.date}</td>
                                    <td className="p-5"><p className="text-slate-800 font-black">{student?.name || 'طالب محذوف'}</p><p className="text-[9px] text-slate-400">{student?.className}</p></td>
                                    <td className="p-5"><span className="text-indigo-600">{rec.subject || 'عام'}</span> {rec.period && <span className="mr-2 text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded text-[8px]">ح{rec.period}</span>}</td>
                                    <td className="p-5 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black ${rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' : rec.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {rec.status === AttendanceStatus.PRESENT ? 'حاضر' : rec.status === AttendanceStatus.ABSENT ? 'غائب' : 'متأخر'}
                                        </span>
                                    </td>
                                    <td className="p-5 text-center">
                                        <button onClick={() => {if(confirm('حذف السجل نهائياً؟')) deleteAttendance(rec.id)}} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Sync Notification */}
      <div className="fixed bottom-24 left-6 pointer-events-none">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-slide-up pointer-events-auto">
              <RefreshCw size={14} className={isSyncing ? 'animate-spin text-indigo-400' : 'text-indigo-400'}/>
              مزامنة الحضور: <span className="text-emerald-400">مؤمنة سحابياً</span>
          </div>
      </div>
    </div>
  );
};

const StatMiniCard = ({ label, value, icon, color }: any) => (
    <div className={`p-4 rounded-3xl border border-transparent shadow-sm flex items-center justify-between bg-white hover:border-slate-200 transition-all`}>
        <div><p className="text-[10px] font-black text-slate-400 mb-1">{label}</p><h4 className="text-xl font-black text-slate-800">{value}</h4></div>
        <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
    </div>
);

export default Attendance;
