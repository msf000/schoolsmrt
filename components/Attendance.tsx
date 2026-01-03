
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { saveAttendance } from '../services/storageService';
import { 
    Search, UserCheck, Calendar as CalendarIcon, 
    History, Camera, Check, X, Clock, Loader2, Sparkles, Filter, ChevronLeft, AlertCircle, TrendingDown, UserPlus
} from 'lucide-react';
import { useToast } from './ToastProvider';
import AIAttendanceScanner from './AIAttendanceScanner';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'RECORD' | 'HISTORY'>('RECORD');
  const [showAiScanner, setShowAiScanner] = useState(false);

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

  useEffect(() => {
      if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
  }, [uniqueClasses]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = !selectedClass || s.className === selectedClass;
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesClass && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass, searchTerm]);

  const stats = useMemo(() => {
    const todayRecs = attendanceHistory.filter(a => a.date === selectedDate && students.some(s => s.id === a.studentId && s.className === selectedClass));
    return {
        present: todayRecs.filter(r => r.status === AttendanceStatus.PRESENT).length,
        absent: todayRecs.filter(r => r.status === AttendanceStatus.ABSENT).length,
        late: todayRecs.filter(r => r.status === AttendanceStatus.LATE).length,
        total: filteredStudents.length
    };
  }, [attendanceHistory, selectedDate, selectedClass, filteredStudents]);

  const handleUpdateStatus = async (studentId: string, status: AttendanceStatus) => {
    const recordId = `att_${studentId}_${selectedDate}`;
    const record: AttendanceRecord = { id: recordId, studentId, date: selectedDate, status, createdById: currentUser?.id };
    try { 
        await saveAttendance([record]); 
        onSaveAttendance([record]); 
    } catch (e) { 
        showToast('فشل في حفظ السجل', 'ERROR'); 
    }
  };

  const markAllPresent = async () => {
      if (!confirm('هل تريد تحضير جميع طلاب الفصل الحالي كحاضرين؟')) return;
      const records = filteredStudents.map(s => ({
          id: `att_${s.id}_${selectedDate}`,
          studentId: s.id,
          date: selectedDate,
          status: AttendanceStatus.PRESENT,
          createdById: currentUser?.id
      }));
      await saveAttendance(records);
      onSaveAttendance(records);
      showToast(`تم تحضير ${records.length} طالباً بنجاح.`, 'SUCCESS');
  };

  return (
    <div className="space-y-6 page-enter font-tajawal pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900">سجل الانضباط اليومي</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">تتبع الحضور والغياب مع تحليلات ذكية لحظية.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setShowAiScanner(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95">
                <Sparkles size={18}/> التحضير البصري (AI)
            </button>
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                <button onClick={() => setActiveTab('RECORD')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'RECORD' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>رصد جديد</button>
                <button onClick={() => setActiveTab('HISTORY')} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'HISTORY' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>الأرشيف</button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <AttMiniStat label="حاضر" value={stats.present} total={stats.total} color="emerald" />
          <AttMiniStat label="غائب" value={stats.absent} total={stats.total} color="rose" />
          <AttMiniStat label="متأخر" value={stats.late} total={stats.total} color="amber" />
          <div className="bg-slate-900 p-6 rounded-[2rem] text-white flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase text-indigo-400">نسبة الانضباط</span>
                  <span className="text-lg font-black">{stats.total > 0 ? Math.round((stats.present/stats.total)*100) : 0}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all duration-1000" style={{width: `${(stats.present/stats.total)*100}%`}}></div>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
        <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-400"/>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2.5 bg-white border border-slate-200 rounded-xl font-black text-slate-900 outline-none text-xs min-w-[150px] shadow-sm">
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <div className="relative">
                <CalendarIcon size={16} className="absolute right-3 top-3 text-slate-400"/>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 outline-none shadow-sm cursor-pointer"/>
            </div>
            <div className="flex-1"></div>
            <div className="relative">
                <Search size={18} className="absolute right-3 top-2.5 text-slate-400"/>
                <input className="pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 w-48 md:w-64 transition-all shadow-sm" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
            </div>
            <button onClick={markAllPresent} className="px-6 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-black hover:bg-emerald-100 transition-all flex items-center gap-2">
                <UserCheck size={16}/> تحضير الكل
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'RECORD' ? (
                <table className="w-full text-right text-sm border-collapse">
                    <thead>
                        <tr className="text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-100 bg-slate-50/30">
                            <th className="px-8 py-4 w-16 text-center">#</th>
                            <th className="px-8 py-4">اسم الطالب</th>
                            <th className="px-8 py-4 text-center">الإجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredStudents.length > 0 ? filteredStudents.map((student, idx) => {
                            const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
                            const status = record?.status || null;
                            return (
                                <tr key={student.id} className="hover:bg-indigo-50/10 transition-colors h-16 group">
                                    <td className="px-8 py-4 text-slate-300 font-black text-xs group-hover:text-brand-500">{idx + 1}</td>
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-600' : status === AttendanceStatus.ABSENT ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                                                {student.name.charAt(0)}
                                            </div>
                                            <span className="font-black text-slate-700">{student.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4">
                                        <div className="flex gap-2 justify-center">
                                            <StatusBtn active={status === AttendanceStatus.PRESENT} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.PRESENT)} label="حاضر" color="emerald" />
                                            <StatusBtn active={status === AttendanceStatus.ABSENT} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.ABSENT)} label="غائب" color="rose" />
                                            <StatusBtn active={status === AttendanceStatus.LATE} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.LATE)} label="تأخر" color="amber" />
                                        </div>
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={3} className="py-32 text-center text-slate-300">
                                    <AlertCircle size={48} className="mx-auto mb-4 opacity-10"/>
                                    <p className="font-black text-xl">لم يتم العثور على طلاب في هذا الفصل</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            ) : (
                <div className="py-40 text-center text-slate-300">
                    <History size={80} className="mx-auto mb-4 opacity-5"/>
                    <p className="font-black text-2xl">أرشيف الحضور قيد المزامنة...</p>
                </div>
            )}
        </div>
      </div>

      {showAiScanner && (
          <AIAttendanceScanner 
            students={filteredStudents} 
            onDetected={(recs) => { onSaveAttendance(recs); setShowAiScanner(false); }}
            onClose={() => setShowAiScanner(false)}
            currentUserId={currentUser?.id}
          />
      )}
    </div>
  );
};

const AttMiniStat = ({ label, value, total, color }: any) => {
    const colors: any = {
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100'
    };
    return (
        <div className={`p-6 rounded-[2rem] border-2 shadow-sm flex flex-col items-center justify-center gap-1 ${colors[color]}`}>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
            <h4 className="text-3xl font-black">{value} <span className="text-sm font-bold opacity-30">/ {total}</span></h4>
        </div>
    );
};

const StatusBtn = ({ active, onClick, label, color }: any) => {
    const colors: any = {
        emerald: active ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white text-slate-400 border-slate-100 hover:text-emerald-600 hover:bg-emerald-50',
        rose: active ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20' : 'bg-white text-slate-400 border-slate-100 hover:text-rose-600 hover:bg-rose-50',
        amber: active ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white text-slate-400 border-slate-100 hover:text-amber-600 hover:bg-amber-50'
    };
    return (
        <button onClick={onClick} className={`px-6 py-2 rounded-xl text-[11px] font-black transition-all border-2 active:scale-95 ${colors[color]}`}>{label}</button>
    );
};

export default Attendance;
