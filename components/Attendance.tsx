
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser, Subject } from '../types';
import { 
    CheckCircle, XCircle, Search, History, Trash2, RefreshCw, 
    UserCheck, BookOpen, Clock, Calendar as CalendarIcon, Filter, 
    User, ChevronLeft, ChevronRight, UserMinus, UserPlus, Sparkles, Layout,
    Camera, QrCode
} from 'lucide-react';
import { saveAttendance, fetchAttendance, deleteAttendance, getSubjects } from '../services/storageService';
import { useToast } from './ToastProvider';
import { formatDualDate } from '../services/dateService';
import AIAttendanceScanner from './AIAttendanceScanner';
import StudentQRScanner from './StudentQRScanner';

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
  
  // Modals
  const [isAIScannerOpen, setIsAIScannerOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  const subjects = useMemo(() => currentUser ? getSubjects(currentUser.id) : [], [currentUser]);

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
    } catch (e) {
        showToast('فشل التزامن السحابي', 'ERROR');
    } finally {
        setIsSyncing(false);
    }
  };

  const handleAIDetection = async (records: AttendanceRecord[]) => {
      setIsSyncing(true);
      try {
          await saveAttendance(records);
          onSaveAttendance(records);
          showToast(`تم رصد حضور ${records.length} طالب عبر الذكاء الاصطناعي`, 'SUCCESS');
      } catch (e) {
          showToast('فشل الحفظ السحابي للرصد البصري', 'ERROR');
      } finally {
          setIsSyncing(false);
      }
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden">
      
      {isAIScannerOpen && (
          <AIAttendanceScanner 
            students={filteredStudents} 
            subject={selectedSubject} 
            currentUserId={currentUser?.id} 
            onDetected={handleAIDetection} 
            onClose={() => setIsAIScannerOpen(false)} 
          />
      )}

      <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6 shrink-0">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-xl border border-slate-100">
              <button onClick={() => setActiveTab('RECORD')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'RECORD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
                  <UserCheck size={18}/> رصد الحصة
              </button>
              <button onClick={() => setActiveTab('HISTORY')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
                  <History size={18}/> سجل الغياب
              </button>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="relative">
                <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                <input className="pr-12 pl-4 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-4 focus:ring-indigo-500/5 transition-all w-64" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
             </div>
             <button onClick={() => setIsAIScannerOpen(true)} disabled={!selectedClass} className="p-3 bg-white text-indigo-600 rounded-2xl border border-indigo-100 shadow-sm hover:bg-indigo-600 hover:text-white transition-all group" title="تحضير بصري (AI)">
                 <Camera size={20} className="group-hover:scale-110 transition-transform"/>
             </button>
             {isSyncing && <RefreshCw size={18} className="animate-spin text-indigo-600"/>}
             <div className="h-10 w-px bg-slate-200"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> تواصل سحابي نشط
             </span>
          </div>
      </div>

      {activeTab === 'RECORD' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-50 mb-8 flex flex-wrap gap-6 items-center shrink-0">
                <div className="flex-1 min-w-[200px] space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">الفصل الدراسي</p>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all">
                        <option value="">-- اختر الفصل --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px] space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">المادة</p>
                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none focus:bg-white">
                        <option value="">-- اختر المادة --</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
                <div className="w-40 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">الحصة</p>
                    <select value={selectedPeriod} onChange={e => setSelectedPeriod(Number(e.target.value))} className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none">
                        {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>الحصة {p}</option>)}
                    </select>
                </div>
                <div className="w-56 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">تاريخ اليوم</p>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none"/>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                {selectedClass ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredStudents.map(student => {
                            const record = attendanceHistory.find(a => 
                                a.studentId === student.id && 
                                a.date === selectedDate && 
                                a.period === selectedPeriod
                            );
                            const status = record?.status || null;
                            return (
                                <div key={student.id} className={`p-6 rounded-[3rem] border-4 transition-all duration-500 flex flex-col justify-between h-56 shadow-2xl relative overflow-hidden group hover:-translate-y-2 ${status === AttendanceStatus.ABSENT ? 'bg-rose-50 border-rose-200' : status === AttendanceStatus.PRESENT ? 'bg-white border-emerald-100 shadow-emerald-900/5' : 'bg-white border-slate-50 shadow-slate-900/5'}`}>
                                    {status === AttendanceStatus.ABSENT && <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><UserMinus size={150}/></div>}
                                    {status === AttendanceStatus.PRESENT && <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><UserPlus size={150}/></div>}
                                    
                                    <div className="flex items-start gap-4 relative z-10">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transition-transform group-hover:rotate-3 ${status === AttendanceStatus.ABSENT ? 'bg-rose-600 text-white' : status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                            {student.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h4 className="text-sm font-black text-slate-800 line-clamp-2 leading-relaxed">{student.name}</h4>
                                            <p className="text-[9px] text-slate-400 font-black uppercase mt-1">مقعد رقم: {student.seatIndex || '--'}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-6 relative z-10">
                                        <button onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.PRESENT)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all flex flex-col items-center gap-1 ${status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-emerald-50'}`}>
                                            <UserPlus size={16}/> حاضر
                                        </button>
                                        <button onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.ABSENT)} className={`flex-1 py-4 rounded-2xl text-[10px] font-black transition-all flex flex-col items-center gap-1 ${status === AttendanceStatus.ABSENT ? 'bg-rose-600 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400 hover:bg-rose-50'}`}>
                                            <UserMinus size={16}/> غائب
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-20 py-20 animate-pulse">
                        <Layout size={180} strokeWidth={1}/>
                        <p className="text-4xl font-black mt-8">اختر الفصل لبدء جلسة التحضير</p>
                        <p className="text-lg font-bold mt-2">سيتم رصد الحضور سحابياً ومزامنة نقاط XP تلقائياً</p>
                    </div>
                )}
            </div>
          </div>
      ) : (
          <div className="flex-1 bg-white rounded-[4rem] border border-slate-50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-right border-collapse">
                      <thead className="bg-[#F8FAFC] border-b text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 z-10 h-20">
                          <tr><th className="p-6 border-l border-slate-50">التاريخ</th><th className="p-6 border-l border-slate-50">اسم الطالب</th><th className="p-6 border-l border-slate-50">المادة والحصة</th><th className="p-6 text-center border-l border-slate-50">الحالة النهائية</th><th className="p-6 text-center">إجراء</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {attendanceHistory.slice().reverse().map(rec => {
                              const s = students.find(std => std.id === rec.studentId);
                              return (
                                  <tr key={rec.id} className="hover:bg-indigo-50/10 transition-all group h-16">
                                      <td className="p-6 text-slate-400 font-mono text-[11px] border-l border-slate-50">{formatDualDate(rec.date)}</td>
                                      <td className="p-6 font-black text-slate-800 border-l border-slate-50">{s?.name || '---'}</td>
                                      <td className="p-6 text-xs text-slate-500 font-bold border-l border-slate-50">
                                          <div className="flex items-center gap-3">
                                              <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl">{rec.subject || 'عام'}</span>
                                              <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-[9px] font-black">ح {rec.period}</span>
                                          </div>
                                      </td>
                                      <td className="p-6 text-center border-l border-slate-50">
                                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{rec.status}</span>
                                      </td>
                                      <td className="p-6 text-center">
                                          <button onClick={() => {if(confirm('حذف السجل؟')) deleteAttendance(rec.id); }} className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
                  {attendanceHistory.length === 0 && <div className="p-20 text-center text-slate-300 font-black text-xl opacity-20">لا يوجد سجل تاريخي حالياً</div>}
              </div>
          </div>
      )}
    </div>
  );
};

export default Attendance;
