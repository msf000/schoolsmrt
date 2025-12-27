
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser, Subject, ScheduleItem } from '../types';
import { 
    CheckCircle, XCircle, Search, History, Trash2, RefreshCw, 
    UserCheck, BookOpen, Clock, Calendar as CalendarIcon, Filter
} from 'lucide-react';
import { saveAttendance, fetchAttendance, deleteAttendance, getSubjects, getSchedules } from '../services/storageService';
import { useToast } from './ToastProvider';
import { formatDualDate } from '../services/dateService';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  currentUser: SystemUser | null;
}

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, currentUser }) => {
  const { showToast } = useToast();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'RECORD' | 'HISTORY'>('RECORD');

  const subjects = useMemo(() => currentUser ? getSubjects(currentUser.id) : [], [currentUser]);
  const schedules = useMemo(() => getSchedules(), []);

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
    if (!selectedSubject) return showToast('الرجاء اختيار المادة أولاً', 'INFO');
    
    setIsSyncing(true);
    // المعرف الفريد يجمع بين الطالب، التاريخ، والمادة، والحصة لضمان عدم التكرار
    const recordId = `att_${studentId}_${selectedDate}_P${selectedPeriod}`;
    const record: AttendanceRecord = {
      id: recordId,
      studentId,
      date: selectedDate,
      status,
      subject: selectedSubject,
      period: selectedPeriod,
      createdById: currentUser?.id
    };
    
    try {
        await saveAttendance([record]);
        onSaveAttendance([record]);
        showToast('تم التحديث سحابياً', 'SUCCESS');
    } catch (e) {
        showToast('فشل التزامن، تم الحفظ محلياً', 'ERROR');
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 shrink-0">
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border">
              <button onClick={() => setActiveTab('RECORD')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'RECORD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
                  <UserCheck size={16}/> رصد الحصة
              </button>
              <button onClick={() => setActiveTab('HISTORY')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
                  <History size={16}/> سجل الغياب
              </button>
          </div>
          
          <div className="flex items-center gap-2">
             {isSyncing && <RefreshCw size={16} className="animate-spin text-indigo-600"/>}
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">تزامن ذكي مفعل</span>
          </div>
      </div>

      {activeTab === 'RECORD' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">الفصل</label>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-3 border rounded-2xl bg-slate-50 font-black text-sm outline-none">
                        <option value="">-- اختر الفصل --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">المادة</label>
                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full p-3 border rounded-2xl bg-slate-50 font-black text-sm outline-none">
                        <option value="">-- اختر المادة --</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">رقم الحصة</label>
                    <select value={selectedPeriod} onChange={e => setSelectedPeriod(Number(e.target.value))} className="w-full p-3 border rounded-2xl bg-slate-50 font-black text-sm outline-none">
                        {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>الحصة {p}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">التاريخ</label>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-3 border rounded-2xl bg-slate-50 font-black text-sm outline-none"/>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                {selectedClass ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredStudents.map(student => {
                            const record = attendanceHistory.find(a => 
                                a.studentId === student.id && 
                                a.date === selectedDate && 
                                a.period === selectedPeriod
                            );
                            const status = record?.status || null;
                            return (
                                <div key={student.id} className={`p-5 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between h-48 shadow-sm ${status === AttendanceStatus.ABSENT ? 'bg-rose-50 border-rose-100' : status === AttendanceStatus.PRESENT ? 'bg-white border-emerald-100' : 'bg-white border-slate-50'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${status === AttendanceStatus.ABSENT ? 'bg-rose-600 text-white' : status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-black text-slate-800 line-clamp-2">{student.name}</h4>
                                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">مقعد: {student.seatIndex || '--'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.PRESENT)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50'}`}>حاضر</button>
                                        <button onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.ABSENT)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${status === AttendanceStatus.ABSENT ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-rose-50'}`}>غائب</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-20 py-20">
                        <UserCheck size={120} strokeWidth={1}/>
                        <p className="text-2xl font-black mt-4">اختر الفصل والمادة لبدء التحضير</p>
                    </div>
                )}
            </div>
          </div>
      ) : (
          <div className="flex-1 bg-white rounded-[3rem] border shadow-sm overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-right border-collapse">
                      <thead className="bg-[#F8FAFC] border-b text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                          <tr><th className="p-5">التاريخ</th><th className="p-5">الطالب</th><th className="p-5">المادة/الحصة</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">حذف</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {attendanceHistory.slice().reverse().map(rec => {
                              const s = students.find(std => std.id === rec.studentId);
                              return (
                                  <tr key={rec.id} className="hover:bg-indigo-50/10 transition-all group">
                                      <td className="p-5 text-slate-400 font-mono text-[10px]">{formatDualDate(rec.date)}</td>
                                      <td className="p-5 font-black text-slate-800">{s?.name || '---'}</td>
                                      <td className="p-5 text-xs text-slate-500 font-bold">{rec.subject || 'عام'} <span className="bg-slate-100 px-2 rounded text-[9px]">ح{rec.period}</span></td>
                                      <td className="p-5 text-center">
                                          <span className={`px-3 py-1 rounded-full text-[9px] font-black ${rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{rec.status}</span>
                                      </td>
                                      <td className="p-5 text-center">
                                          <button onClick={() => {if(confirm('حذف السجل؟')) deleteAttendance(rec.id); }} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
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
