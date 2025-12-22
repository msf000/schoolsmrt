
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, ScheduleItem, Subject } from '../types';
import { 
    CheckCircle, XCircle, Clock, Users, Search, Sparkles, 
    Calendar as CalendarIcon, Loader2, UserCheck, Timer, 
    History, Trash2, RefreshCw, Database, AlertCircle, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSchedules, getTeacherAssignments, getTeacherPeriodTimings, getSubjects, saveAttendance, deleteAttendance, downloadFromSupabase } from '../services/storageService';

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // History Filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyClass, setHistoryClass] = useState('');

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

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
        await downloadFromSupabase();
        window.location.reload(); // إعادة تحميل التطبيق بالكامل لضمان تحديث الكاش
    } catch (e) {
        alert('فشل تحديث البيانات من السحابة');
    } finally {
        setIsRefreshing(false);
    }
  };

  const handleUpdate = async (studentId: string, status: AttendanceStatus) => {
    const sub = selectedSubject || 'عام';
    // المعرف الفريد لضمان عدم التكرار (Upsert Key)
    const recordId = `${studentId}_${selectedDate}_${selectedPeriod}_${sub.replace(/\s+/g, '_')}`;
    
    const record: AttendanceRecord = {
      id: recordId,
      studentId,
      date: selectedDate,
      period: selectedPeriod,
      subject: sub,
      status,
      createdById: currentUser?.id
    };
    
    setIsSyncing(true);
    await saveAttendance([record]);
    // تحديث الواجهة فوراً
    const newHistory = [...attendanceHistory];
    const idx = newHistory.findIndex(a => a.id === recordId);
    if (idx !== -1) newHistory[idx] = record; else newHistory.push(record);
    onSaveAttendance(newHistory);
    setIsSyncing(false);
  };

  const handleDeleteRecord = async (id: string) => {
    if (confirm('حذف هذا السجل نهائياً من السحابة؟')) {
        setIsSyncing(true);
        await deleteAttendance(id);
        onSaveAttendance(attendanceHistory.filter(a => a.id !== id));
        setIsSyncing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in pb-24 font-tajawal overflow-hidden">
      
      {/* Upper Control Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
              <button onClick={() => setActiveTab('RECORD')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'RECORD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
                  <UserCheck size={16}/> رصد الحضور
              </button>
              <button onClick={() => setActiveTab('HISTORY')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
                  <History size={16}/> سجل البيانات
              </button>
          </div>

          <button 
            onClick={handleRefreshCache} 
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl text-xs font-black text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
          >
            {isRefreshing ? <Loader2 size={16} className="animate-spin text-indigo-600"/> : <RefreshCw size={16}/>}
            تحديث ومزامنة البيانات
          </button>
      </div>

      {activeTab === 'RECORD' ? (
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
          
          {/* Controls */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 mb-6 relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-teal-500"></div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-800">تحضير الفصل</h2>
                    <div className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        <span className="flex items-center gap-1"><CalendarIcon size={14}/> {selectedDate}</span>
                        <div className="h-3 w-px bg-slate-200"></div>
                        <span className="flex items-center gap-1"><Timer size={14}/> الحصة {selectedPeriod}</span>
                        {isSyncing && <span className="text-indigo-600 flex items-center gap-1 animate-pulse"><RefreshCw size={12} className="animate-spin"/> جاري المزامنة...</span>}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <Users size={16} className="text-slate-400 mr-2"/>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[120px] text-slate-700">
                            <option value="">اختر الفصل...</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[120px] text-indigo-600">
                            <option value="">المادة الدراسية...</option>
                            {Array.from(new Set(attendanceHistory.map(a => a.subject).filter(Boolean))).map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
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
                  const recordId = `${student.id}_${selectedDate}_${selectedPeriod}_${(selectedSubject || 'عام').replace(/\s+/g, '_')}`;
                  const record = attendanceHistory.find(a => a.id === recordId);
                  const status = record?.status || null;

                  return (
                    <div key={student.id} className={`p-5 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between h-48 shadow-sm group ${status === AttendanceStatus.ABSENT ? 'bg-red-50 border-red-200' : status === AttendanceStatus.PRESENT ? 'bg-white border-emerald-100' : 'bg-white border-transparent hover:border-slate-200'}`}>
                        <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white' : status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {student.name.charAt(0)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h4 className="text-sm font-black text-slate-800 truncate">{student.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold mt-1">رقم الهوية: {student.nationalId?.slice(-4)}****</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                            <button onClick={() => handleUpdate(student.id, AttendanceStatus.PRESENT)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50'}`}>
                                <CheckCircle size={14}/> حاضر
                            </button>
                            <button onClick={() => handleUpdate(student.id, AttendanceStatus.ABSENT)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-red-50'}`}>
                                <XCircle size={14}/> غائب
                            </button>
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
                        <input className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="بحث باسم الطالب..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] font-black border border-indigo-100 flex items-center gap-2">
                        <Database size={14}/> السجلات السحابية: {attendanceHistory.length}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50/80 sticky top-0 z-10 border-b text-slate-500 font-black uppercase">
                        <tr><th className="p-5 w-12 text-center">#</th><th className="p-5">التاريخ</th><th className="p-5">الطالب</th><th className="p-5">المادة</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">إجراءات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                        {filteredHistory.map((rec, idx) => {
                            const student = students.find(s => s.id === rec.studentId);
                            return (
                                <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-5 text-center font-mono text-slate-300">{idx + 1}</td>
                                    <td className="p-5 text-slate-500 whitespace-nowrap">{rec.date}</td>
                                    <td className="p-5"><p className="text-slate-800 font-black">{student?.name || 'طالب محذوف'}</p><p className="text-[9px] text-slate-400">{student?.className}</p></td>
                                    <td className="p-5 text-indigo-600">{rec.subject || 'عام'} <span className="mr-1 text-slate-300 text-[10px]">ح{rec.period}</span></td>
                                    <td className="p-5 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black ${rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {rec.status === AttendanceStatus.PRESENT ? 'حاضر' : 'غائب'}
                                        </span>
                                    </td>
                                    <td className="p-5 text-center">
                                        <button onClick={() => handleDeleteRecord(rec.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* Cloud Status */}
      <div className="fixed bottom-24 left-6 pointer-events-none">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-slide-up pointer-events-auto border border-white/10">
              {navigator.onLine ? <Check size={14} className="text-emerald-400"/> : <AlertCircle size={14} className="text-amber-400"/>}
              حالة السحابة: <span className={navigator.onLine ? "text-emerald-400" : "text-amber-400"}>{navigator.onLine ? "متصل (المزامنة فورية)" : "أوفلاين (كاش محلي)"}</span>
          </div>
      </div>
    </div>
  );
};

export default Attendance;
