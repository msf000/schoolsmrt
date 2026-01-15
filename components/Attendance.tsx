
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { saveAttendance, fetchAttendance } from '../services/storageService';
import { 
    UserCheck, Calendar as CalendarIcon, Search, 
    Check, X, Clock, Loader2, Sparkles, Filter, 
    ChevronLeft, AlertCircle, Save, Camera, Users, ShieldAlert, TrendingUp
} from 'lucide-react';
import { useToast } from './ToastProvider';
import AIAttendanceScanner from './AIAttendanceScanner';
import { useNavigate } from 'react-router-dom';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: () => void;
  currentUser: SystemUser | null;
}

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, currentUser }) => {
  const navigate = useNavigate();
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

  const getStudentStats = (studentId: string) => {
    const studentRecs = attendanceHistory.filter(a => a.studentId === studentId);
    const total = studentRecs.length;
    if (total === 0) return { rate: 100, consecutiveAbsences: 0 };
    const present = studentRecs.filter(r => r.status === AttendanceStatus.PRESENT).length;
    
    // حساب الغياب المتتابع
    let streak = 0;
    const sorted = [...studentRecs].sort((a, b) => b.date.localeCompare(a.date));
    for (const rec of sorted) {
        if (rec.status === AttendanceStatus.ABSENT) streak++;
        else break;
    }
    
    return { rate: Math.round((present / total) * 100), consecutiveAbsences: streak };
  };

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
        showToast('تم تحديث حالة الحضور', 'SUCCESS');
    } catch (e) { 
        showToast('خطأ في الاتصال', 'ERROR'); 
    }
  };

  return (
    <div className="space-y-6 page-enter font-tajawal pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900">سجل الانضباط اليومي</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">رصد الحضور ومتابعة حالات الغياب المتكرر.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => setShowAiScanner(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95">
                <Sparkles size={18}/> التحضير بالذكاء (AI)
            </button>
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
            <div className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? filteredStudents.map((student) => {
                    const record = currentRecords.find(a => a.studentId === student.id);
                    const status = record?.status;
                    const { rate, consecutiveAbsences } = getStudentStats(student.id);
                    
                    return (
                        <div key={student.id} className="p-5 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50 transition-colors gap-6 group">
                            <div className="flex items-center gap-5 flex-1 min-w-0">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner shrink-0 ${
                                    status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-white' :
                                    status === AttendanceStatus.ABSENT ? 'bg-rose-50 text-white' :
                                    'bg-slate-100 text-slate-400'
                                }`}>
                                    {student.name.charAt(0)}
                                </div>
                                <div className="text-right truncate">
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-slate-800 text-base truncate">{student.name}</p>
                                        {consecutiveAbsences >= 2 && (
                                            <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[8px] font-black animate-pulse flex items-center gap-1">
                                                <AlertCircle size={10}/> غياب متكرر ({consecutiveAbsences})
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{student.className}</p>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-blue-500' : 'bg-rose-500'}`} style={{width: `${rate}%`}}></div>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400">{rate}% انضباط</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <div className="flex bg-slate-100 p-1 rounded-2xl">
                                    <AttendanceBtn label="حاضر" active={status === AttendanceStatus.PRESENT} color="emerald" onClick={() => handleUpdateStatus(student.id, AttendanceStatus.PRESENT)} icon={<Check size={14}/>} />
                                    <AttendanceBtn label="غائب" active={status === AttendanceStatus.ABSENT} color="rose" onClick={() => handleUpdateStatus(student.id, AttendanceStatus.ABSENT)} icon={<X size={14}/>} />
                                    <AttendanceBtn label="متأخر" active={status === AttendanceStatus.LATE} color="amber" onClick={() => handleUpdateStatus(student.id, AttendanceStatus.LATE)} icon={<Clock size={14}/>} />
                                </div>
                                <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-3 text-slate-300 hover:text-indigo-600 transition-colors">
                                    <TrendingUp size={20}/>
                                </button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="py-40 text-center text-slate-300">
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

const AttendanceBtn = ({ label, active, color, onClick, icon }: any) => {
    const colors: any = {
        emerald: active ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-emerald-600',
        rose: active ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-rose-600',
        amber: active ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-amber-600'
    };
    return (
        <button onClick={onClick} className={`px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all active:scale-90 ${colors[color]}`}>
            {icon} {label}
        </button>
    );
};

export default Attendance;
