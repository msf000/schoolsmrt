
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { saveAttendance, fetchAttendance } from '../services/storageService';
import { 
    UserCheck, Calendar as CalendarIcon, Search, 
    Check, X, Clock, Loader2, Sparkles, Filter, 
    ChevronLeft, AlertCircle, Save, Camera, Users
} from 'lucide-react';
import { useToast } from './ToastProvider';
import AIAttendanceScanner from './AIAttendanceScanner';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: () => void;
  currentUser: SystemUser | null;
}

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, currentUser }) => {
  const { showToast } = useToast();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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

  const currentRecords = useMemo(() => {
      return attendanceHistory.filter(a => a.date === selectedDate);
  }, [attendanceHistory, selectedDate]);

  const stats = useMemo(() => {
    const todayClassRecs = currentRecords.filter(a => students.find(s => s.id === a.studentId)?.className === selectedClass);
    return {
        present: todayClassRecs.filter(r => r.status === AttendanceStatus.PRESENT).length,
        absent: todayClassRecs.filter(r => r.status === AttendanceStatus.ABSENT).length,
        late: todayClassRecs.filter(r => r.status === AttendanceStatus.LATE).length,
        total: filteredStudents.length
    };
  }, [currentRecords, selectedClass, filteredStudents]);

  const handleUpdateStatus = async (studentId: string, status: AttendanceStatus) => {
    const record: AttendanceRecord = { 
        id: `att_${studentId}_${selectedDate}`, 
        studentId, 
        date: selectedDate, 
        status, 
        createdById: currentUser?.id 
    };
    try { 
        await saveAttendance([record]); 
        onSaveAttendance(); 
        showToast('تم تحديث الحالة', 'SUCCESS');
    } catch (e) { 
        showToast('خطأ في الحفظ', 'ERROR'); 
    }
  };

  const markAllPresent = async () => {
      setIsSaving(true);
      const records = filteredStudents.map(s => ({
          id: `att_${s.id}_${selectedDate}`,
          studentId: s.id,
          date: selectedDate,
          status: AttendanceStatus.PRESENT,
          createdById: currentUser?.id
      }));
      try {
          await saveAttendance(records);
          onSaveAttendance();
          showToast('تم تحضير جميع الطلاب', 'SUCCESS');
      } finally {
          setIsSaving(false);
      }
  };

  return (
    <div className="space-y-6 page-enter font-tajawal pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900">سجل التحضير اليومي</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">إدارة حضور وانصراف الطلاب بلمسة واحدة.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setShowAiScanner(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95">
                <Sparkles size={18}/> التحضير البصري (AI)
            </button>
            <button onClick={markAllPresent} disabled={isSaving} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95">
                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <UserCheck size={18}/>} تحضير الكل
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="حاضر" value={stats.present} color="emerald" />
          <StatCard label="غائب" value={stats.absent} color="rose" />
          <StatCard label="متأخر" value={stats.late} color="amber" />
          <div className="bg-slate-900 p-6 rounded-3xl text-white flex flex-col justify-center shadow-xl border border-white/5">
              <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase text-indigo-400">نسبة الانضباط</span>
                  <span className="text-lg font-black">{stats.total > 0 ? Math.round((stats.present/stats.total)*100) : 0}%</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all duration-1000" style={{width: `${stats.total > 0 ? (stats.present/stats.total)*100 : 0}%`}}></div>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
        <div className="p-6 bg-slate-50/50 border-b border-slate-200 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <Filter size={16} className="text-slate-400"/>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="font-black text-slate-900 outline-none text-xs bg-transparent">
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="relative bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                <CalendarIcon size={16} className="text-slate-400"/>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="text-xs font-black text-slate-600 outline-none cursor-pointer bg-transparent"/>
            </div>
            <div className="flex-1"></div>
            <div className="relative">
                <Search size={18} className="absolute right-3 top-2.5 text-slate-400"/>
                <input className="pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 w-full md:w-64 transition-all shadow-sm" placeholder="ابحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                    const record = currentRecords.find(a => a.studentId === student.id);
                    const status = record?.status;
                    return (
                        <div key={student.id} className={`p-4 rounded-[2rem] border-2 transition-all flex items-center justify-between group ${
                            status === AttendanceStatus.PRESENT ? 'bg-emerald-50/50 border-emerald-100' :
                            status === AttendanceStatus.ABSENT ? 'bg-rose-50/50 border-rose-100' :
                            status === AttendanceStatus.LATE ? 'bg-amber-50/50 border-amber-100' :
                            'bg-white border-slate-100 hover:border-indigo-100 shadow-sm'
                        }`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm ${
                                    status === AttendanceStatus.PRESENT ? 'bg-emerald-500 text-white' :
                                    status === AttendanceStatus.ABSENT ? 'bg-rose-500 text-white' :
                                    status === AttendanceStatus.LATE ? 'bg-amber-500 text-white' :
                                    'bg-slate-100 text-slate-400'
                                }`}>
                                    {student.name.charAt(0)}
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-800 text-sm truncate w-32">{student.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{student.className}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <QuickActionBtn icon={<Check size={14}/>} active={status === AttendanceStatus.PRESENT} color="emerald" onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.PRESENT)} />
                                <QuickActionBtn icon={<X size={14}/>} active={status === AttendanceStatus.ABSENT} color="rose" onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.ABSENT)} />
                                <QuickActionBtn icon={<Clock size={14}/>} active={status === AttendanceStatus.LATE} color="amber" onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.LATE)} />
                            </div>
                        </div>
                    );
                }) : (
                    <div className="col-span-full py-32 text-center text-slate-300">
                        <Users size={64} className="mx-auto mb-4 opacity-10"/>
                        <p className="font-black text-xl">لا يوجد طلاب مطابقين للبحث</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {showAiScanner && (
          <AIAttendanceScanner 
            students={filteredStudents} 
            onDetected={() => { onSaveAttendance(); setShowAiScanner(false); }}
            onClose={() => setShowAiScanner(false)}
            currentUserId={currentUser?.id || ''}
          />
      )}
    </div>
  );
};

const StatCard = ({ label, value, color }: any) => {
    const colors: any = {
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100'
    };
    return (
        <div className={`p-6 rounded-3xl border shadow-sm flex flex-col items-center justify-center gap-1 ${colors[color]}`}>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</span>
            <h4 className="text-4xl font-black">{value}</h4>
        </div>
    );
};

const QuickActionBtn = ({ icon, active, color, onClick }: any) => {
    const colors: any = {
        emerald: active ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600',
        rose: active ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-rose-100 hover:text-rose-600',
        amber: active ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-400 hover:bg-amber-100 hover:text-amber-600'
    };
    return (
        <button onClick={onClick} className={`p-2.5 rounded-xl transition-all active:scale-90 ${colors[color]}`}>
            {icon}
        </button>
    );
};

export default Attendance;
