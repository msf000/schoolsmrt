
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser, ScheduleItem } from '../types';
import { 
    CheckCircle, XCircle, Clock, Users, Search, 
    Calendar as CalendarIcon, Loader2, UserCheck, History, 
    Trash2, BookOpen, Check, AlertCircle, RefreshCw
} from 'lucide-react';
import { getSchedules, saveAttendance, deleteAttendance } from '../services/storageService';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'RECORD' | 'HISTORY'>('RECORD');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedSubject, setSelectedSubject] = useState('عام');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [todaysSchedule, setTodaysSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    if (currentUser) {
        const allSchedules = getSchedules();
        const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
        const mine = allSchedules.filter(s => s.day === dayName && s.teacherId === currentUser.id);
        setTodaysSchedule(mine.sort((a, b) => a.period - b.period));
    }
  }, [currentUser]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    return Array.from(classes).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = !selectedClass || s.className === selectedClass;
      const matchesSearch = !searchTerm || s.name.includes(searchTerm);
      return matchesClass && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass, searchTerm]);

  const handleUpdateStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!selectedClass) return alert('يرجى اختيار الفصل أولاً');
    
    setIsSyncing(true);
    const sub = selectedSubject || 'عام';
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
    
    try {
        await saveAttendance([record]);
        onSaveAttendance([record]); 
    } catch (e) {
        console.error(e);
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-[#F8FAFC] animate-fade-in pb-24 font-tajawal overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 shrink-0">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-xl border border-slate-100">
              <button onClick={() => setActiveTab('RECORD')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'RECORD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
                  <UserCheck size={18}/> رصد الحضور
              </button>
              <button onClick={() => setActiveTab('HISTORY')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
                  <History size={18}/> سجل الغياب
              </button>
          </div>
          
          <div className="flex items-center gap-3">
             <div className={`px-4 py-2 rounded-2xl text-[10px] font-black border transition-all flex items-center gap-2 ${isSyncing ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                {isSyncing ? <RefreshCw size={14} className="animate-spin"/> : <Check size={14}/>}
                {isSyncing ? 'جاري الحفظ...' : 'السحابة متصلة'}
             </div>
          </div>
      </div>

      {activeTab === 'RECORD' ? (
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-50 mb-8 shrink-0">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-800">التحضير المباشر</h2>
                    <div className="flex items-center gap-4 text-slate-400 text-xs font-black uppercase">
                        <span className="flex items-center gap-2"><CalendarIcon size={16} className="text-indigo-500"/> {selectedDate}</span>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <span className="flex items-center gap-2"><Clock size={16} className="text-indigo-500"/> الحصة {selectedPeriod}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-3 border rounded-2xl bg-slate-50 font-black text-sm outline-none min-w-[150px]">
                        <option value="">-- اختر الفصل --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="relative flex-1 lg:w-80">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
                        <input className="w-full pr-12 pl-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner outline-none" placeholder="ابحث عن طالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                    </div>
                </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
            {selectedClass ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredStudents.map(student => {
                        const recordId = `${student.id}_${selectedDate}_${selectedPeriod}_${selectedSubject.replace(/\s+/g, '_')}`;
                        const record = attendanceHistory.find(a => a.id === recordId);
                        const status = record?.status || null;

                        return (
                            <div key={student.id} className={`p-6 rounded-[3rem] border-4 transition-all flex flex-col justify-between h-56 shadow-sm ${status === AttendanceStatus.ABSENT ? 'bg-red-50 border-red-200' : status === AttendanceStatus.PRESENT ? 'bg-white border-emerald-100 shadow-xl' : 'bg-white border-transparent hover:border-slate-100'}`}>
                                <div className="flex items-start gap-5">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white' : status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {student.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="text-base font-black text-slate-800 truncate">{student.name}</h4>
                                        <p className="text-[10px] text-slate-400 font-black mt-1 uppercase">مقعد: {student.seatIndex || '--'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-50">
                                    <button onClick={() => handleUpdateStatus(student.id, AttendanceStatus.PRESENT)} className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50'}`}>
                                        حاضر
                                    </button>
                                    <button onClick={() => handleUpdateStatus(student.id, AttendanceStatus.ABSENT)} className={`flex-1 py-4 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-red-50'}`}>
                                        غائب
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-8 opacity-40">
                    <BookOpen size={120} strokeWidth={1.5}/>
                    <p className="text-3xl font-black text-center max-w-sm">اختر فصلاً دراسياً لبدء الرصد</p>
                </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-[3.5rem] border border-slate-50 shadow-2xl overflow-hidden flex flex-col animate-fade-in">
            <div className="p-8 border-b bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-800">السجل التاريخي للغياب</h3>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                    <thead className="bg-[#F8FAFC] border-b text-slate-400 font-black uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                        <tr><th className="p-6">التاريخ</th><th className="p-6">الطالب</th><th className="p-6">المادة</th><th className="p-6 text-center">الحالة</th><th className="p-6 text-center">إجراءات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                        {attendanceHistory.slice(0, 50).map((rec) => {
                            const student = students.find(s => s.id === rec.studentId);
                            return (
                                <tr key={rec.id} className="hover:bg-indigo-50/20 transition-all">
                                    <td className="p-6 text-slate-400 font-mono">{rec.date}</td>
                                    <td className="p-6 text-slate-800 font-black text-sm">{student?.name || 'مجهول'}</td>
                                    <td className="p-6 text-indigo-600 font-black">{rec.subject || 'عام'}</td>
                                    <td className="p-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {rec.status === AttendanceStatus.PRESENT ? 'حاضر' : 'غائب'}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center">
                                        <button onClick={() => deleteAttendance(rec.id)} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={18}/></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
