
import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { 
    CheckCircle, XCircle, Clock, Users, Search, 
    Calendar as CalendarIcon, Loader2, UserCheck, History, 
    Trash2, RefreshCw, UserMinus, UserPlus, ArrowRight, Check, AlertTriangle
} from 'lucide-react';
import { saveAttendance, deleteAttendance } from '../services/storageService';
import { useToast } from './ToastProvider';
import { formatDualDate } from '../services/dateService';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, currentUser }) => {
  const { showToast } = useToast();
  const location = useLocation();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'RECORD' | 'HISTORY'>('RECORD');

  useEffect(() => {
    if (location.state && (location.state as any).className) {
      setSelectedClass((location.state as any).className);
    }
  }, [location.state]);

  const uniqueClasses = useMemo(() => 
    Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort()
  , [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = !selectedClass || s.className === selectedClass;
      const matchesSearch = s.name.includes(searchTerm);
      return matchesClass && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass, searchTerm]);

  const handleUpdateStatus = async (studentId: string, status: AttendanceStatus) => {
    setIsSyncing(true);
    const recordId = `att_${studentId}_${selectedDate}`;
    const record: AttendanceRecord = {
      id: recordId,
      studentId,
      date: selectedDate,
      status,
      createdById: currentUser?.id
    };
    
    try {
        await saveAttendance([record]);
        onSaveAttendance([record]);
        showToast('تم تحديث حالة الطالب', 'SUCCESS');
    } catch (e) {
        showToast('خطأ في المزامنة', 'ERROR');
    } finally {
        setIsSyncing(false);
    }
  };

  const handleMarkAll = async (status: AttendanceStatus) => {
    if (!selectedClass) return showToast('اختر الفصل أولاً', 'INFO');
    if (!confirm('هل تريد رصد الحالة للجميع؟')) return;

    setIsSyncing(true);
    const records: AttendanceRecord[] = filteredStudents.map(s => ({
        id: `att_${s.id}_${selectedDate}`,
        studentId: s.id,
        date: selectedDate,
        status,
        createdById: currentUser?.id
    }));

    try {
        await saveAttendance(records);
        onSaveAttendance(records);
        showToast(`تم رصد ${status === AttendanceStatus.PRESENT ? 'حضور' : 'غياب'} جميع الطلاب`, 'SUCCESS');
    } catch (e) {
        showToast('خطأ في المزامنة', 'ERROR');
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 shrink-0">
          <div className="flex bg-white p-1.5 rounded-[1.5rem] shadow-xl border border-slate-100">
              <button onClick={() => setActiveTab('RECORD')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'RECORD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
                  <UserCheck size={18}/> رصد الحضور
              </button>
              <button onClick={() => setActiveTab('HISTORY')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
                  <History size={18}/> السجل التاريخي
              </button>
          </div>
          
          <div className="flex items-center gap-3">
             {isSyncing ? (
                 <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-100 animate-pulse font-black text-[10px] uppercase">
                     <RefreshCw size={14} className="animate-spin"/> جاري الحفظ سحابياً...
                 </div>
             ) : (
                 <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100 font-black text-[10px] uppercase tracking-widest">
                     <Check size={14}/> السحابة متصلة وجاهزة
                 </div>
             )}
          </div>
      </div>

      {activeTab === 'RECORD' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-6 flex flex-col md:flex-row gap-6 items-center shrink-0">
                <div className="flex flex-wrap gap-4 flex-1">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest">الفصل</label>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-3 border rounded-2xl bg-slate-50 font-black text-sm outline-none min-w-[180px]">
                            <option value="">-- اختر الفصل --</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest">التاريخ</label>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-3 border rounded-2xl bg-slate-50 font-black text-sm outline-none"/>
                    </div>
                    <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                        <label className="text-[10px] font-black text-slate-400 mr-2 uppercase tracking-widest">بحث سريع</label>
                        <div className="relative">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                            <input className="w-full pr-12 pl-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500" placeholder="ابحث عن طالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                        </div>
                    </div>
                </div>
                {selectedClass && (
                    <div className="flex gap-2">
                        <button onClick={() => handleMarkAll(AttendanceStatus.PRESENT)} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2"><CheckCircle size={18}/> تحضير الجميع</button>
                        <button onClick={() => handleMarkAll(AttendanceStatus.ABSENT)} className="px-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-xs shadow-xl hover:bg-rose-700 transition-all flex items-center gap-2"><XCircle size={18}/> تغييب الجميع</button>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                {selectedClass ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredStudents.map(student => {
                            const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
                            const status = record?.status || null;
                            return (
                                <div key={student.id} className={`p-6 rounded-[3rem] border-4 transition-all flex flex-col justify-between h-56 relative group shadow-sm ${status === AttendanceStatus.ABSENT ? 'bg-rose-50 border-rose-100' : status === AttendanceStatus.PRESENT ? 'bg-white border-emerald-100 shadow-xl' : 'bg-white border-slate-50'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-2xl transition-all duration-500 ${status === AttendanceStatus.ABSENT ? 'bg-rose-600 text-white' : status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 line-clamp-1">{student.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-black mt-1 uppercase">مقعد: {student.seatIndex || '--'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-6">
                                        <button onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.PRESENT)} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black transition-all ${status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50'}`}>حاضر</button>
                                        <button onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.ABSENT)} className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black transition-all ${status === AttendanceStatus.ABSENT ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-rose-50'}`}>غائب</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-30 gap-8">
                        <Users size={150} strokeWidth={1}/>
                        <p className="text-4xl font-black text-center max-w-sm">يرجى اختيار الفصل لبدء عملية رصد الحضور</p>
                    </div>
                )}
            </div>
          </div>
      ) : (
          <div className="flex-1 bg-white rounded-[4rem] border shadow-sm overflow-hidden flex flex-col">
              <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-black text-slate-800 flex items-center gap-3"><History className="text-indigo-600"/> السجل التاريخي للغياب</h3>
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-right">
                      <thead className="bg-[#F8FAFC] border-b text-[11px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                          <tr><th className="p-6">التاريخ</th><th className="p-6">الطالب</th><th className="p-6 text-center">الحالة</th><th className="p-6 text-center">إجراءات</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {attendanceHistory.slice().reverse().map(rec => {
                              const s = students.find(std => std.id === rec.studentId);
                              return (
                                  <tr key={rec.id} className="hover:bg-indigo-50/10 transition-all group">
                                      <td className="p-6 text-slate-400 font-mono text-xs">{formatDualDate(rec.date)}</td>
                                      <td className="p-6 font-black text-slate-800">{s?.name || 'طالب مجهول'} <span className="text-[10px] text-slate-300">({s?.className})</span></td>
                                      <td className="p-6 text-center">
                                          <span className={`px-4 py-1 rounded-full text-[10px] font-black ${rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{rec.status}</span>
                                      </td>
                                      <td className="p-6 text-center">
                                          <button onClick={() => {if(confirm('حذف السجل؟')) deleteAttendance(rec.id)}} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={18}/></button>
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
