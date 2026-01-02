
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser, TeacherAssignment } from '../types';
import { saveAttendance, getTeacherAssignments } from '../services/storageService';
import { 
    CheckCircle, XCircle, Search, RefreshCw, 
    UserCheck, BookOpen, Calendar as CalendarIcon, 
    ChevronLeft, UserMinus, UserPlus, Layout, History,
    Filter, Clock, CheckCircle2, AlertTriangle, CloudLightning, QrCode, ScanLine, Camera, Trash2, Printer, X
} from 'lucide-react';
import { useToast } from './ToastProvider';
import { formatDualDate } from '../services/dateService';
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
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach((a: TeacherAssignment) => classes.add(a.classId));
    return Array.from(classes).sort();
  }, [students, currentUser]);

  useEffect(() => {
      if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
  }, [uniqueClasses, selectedClass]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = !selectedClass || s.className === selectedClass;
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesClass && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass, searchTerm]);

  const handleUpdateStatus = async (studentId: string, status: AttendanceStatus) => {
    const recordId = `att_${studentId}_${selectedDate}`;
    const record: AttendanceRecord = { id: recordId, studentId, date: selectedDate, status, createdById: currentUser?.id };
    try { await saveAttendance([record]); onSaveAttendance([record]); } catch (e) { showToast('فشل المزامنة', 'ERROR'); }
  };

  const handleMarkAllPresent = async () => {
      if (!selectedClass) return;
      const records: AttendanceRecord[] = filteredStudents.map(s => ({
          id: `att_${s.id}_${selectedDate}`, studentId: s.id, date: selectedDate, status: AttendanceStatus.PRESENT, createdById: currentUser?.id
      }));
      await saveAttendance(records); onSaveAttendance(records);
      showToast(`تم تحضير جميع الطلاب بنجاح.`, 'SUCCESS');
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in font-tajawal h-full flex flex-col overflow-hidden pb-24 lg:pb-10">
      {isAiScannerOpen && (
          <AIAttendanceScanner 
            students={filteredStudents} 
            currentUserId={currentUser?.id}
            onDetected={(recs) => { onSaveAttendance(recs); showToast('اكتمل الرصد البصري', 'SUCCESS'); }} 
            onClose={() => setIsAiScannerOpen(false)} 
          />
      )}

      {/* Dashboard Control Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-6 lg:p-8 rounded-[2.5rem] lg:rounded-[3.5rem] border shadow-sm shrink-0">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border shadow-inner w-full lg:w-auto">
              <button onClick={() => setActiveTab('RECORD')} className={`flex-1 lg:flex-none px-6 lg:px-10 py-3 rounded-xl text-[11px] lg:text-xs font-black transition-all ${activeTab === 'RECORD' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}>الرصد الميداني</button>
              <button onClick={() => setActiveTab('HISTORY')} className={`flex-1 lg:flex-none px-6 lg:px-10 py-3 rounded-xl text-[11px] lg:text-xs font-black transition-all ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}>سجل الأرشيف</button>
          </div>
          
          <div className="flex items-center gap-3 w-full lg:w-auto">
             <button onClick={() => setIsAiScannerOpen(true)} className="flex-1 lg:flex-none px-4 lg:px-8 py-3.5 bg-purple-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-purple-700 transition-all group">
                <Camera size={18}/> <span className="hidden sm:inline">رصد بصري (AI)</span><span className="sm:hidden">كاميرا AI</span>
             </button>
             <button onClick={handleMarkAllPresent} disabled={!selectedClass} className="flex-1 lg:flex-none px-4 lg:px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
                <UserCheck size={18}/> <span className="hidden sm:inline">تحضير الجميع</span><span className="sm:hidden">الكل حاضر</span>
             </button>
          </div>
      </div>

      <div className="flex-1 bg-white rounded-[3rem] lg:rounded-[4rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col min-h-0">
        {/* Responsive Filters */}
        <div className="p-6 lg:p-10 bg-slate-50/50 border-b flex flex-col lg:flex-row gap-6 lg:gap-10 items-end shrink-0">
            <div className="w-full lg:w-64">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mr-1">الفئة الدراسية</label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-3.5 border-2 border-transparent focus:border-indigo-500 rounded-2xl bg-white text-xs font-black outline-none shadow-sm transition-all">
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="w-full lg:w-64">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mr-1">تاريخ الرصد</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-3.5 bg-white border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-black outline-none shadow-sm transition-all"/>
            </div>
            <div className="w-full lg:flex-1">
                <div className="relative">
                    <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                    <input className="w-full pr-12 pl-6 py-3.5 bg-white border-2 border-transparent focus:border-indigo-500 rounded-2xl text-xs font-black outline-none shadow-sm transition-all" placeholder="بحث سريع في الأسماء..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'RECORD' ? (
                selectedClass ? (
                    <div className="p-4 lg:p-0">
                        {/* Mobile Grid Cards */}
                        <div className="lg:hidden space-y-4">
                            {filteredStudents.map((student) => {
                                const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
                                const status = record?.status || null;
                                return (
                                    <div key={student.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${status === AttendanceStatus.PRESENT ? 'bg-emerald-500 text-white' : status === AttendanceStatus.ABSENT ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                {student.name.charAt(0)}
                                            </div>
                                            <h4 className="font-black text-slate-800 text-sm">{student.name}</h4>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <MobileStatusBtn active={status === AttendanceStatus.PRESENT} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.PRESENT)} label="ح" color="emerald" />
                                            <MobileStatusBtn active={status === AttendanceStatus.ABSENT} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.ABSENT)} label="غ" color="rose" />
                                            <MobileStatusBtn active={status === AttendanceStatus.LATE} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.LATE)} label="ت" color="amber" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Desktop Table */}
                        <table className="hidden lg:table w-full text-right border-collapse">
                            <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 h-20 shadow-sm">
                                <tr>
                                    <th className="px-10 border-l border-slate-50 w-24 text-center">م</th>
                                    <th className="px-10 border-l border-slate-50">الاسم الكامل</th>
                                    <th className="px-10 text-center w-[500px]">قرار التحضير</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredStudents.map((student, idx) => {
                                    const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
                                    const status = record?.status || null;
                                    return (
                                        <tr key={student.id} className="hover:bg-indigo-50/10 transition-all h-20 group">
                                            <td className="px-10 text-center text-slate-300 font-mono text-[11px] border-l border-slate-50 font-black">{idx + 1}</td>
                                            <td className="px-10 border-l border-slate-50">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-inner transition-all ${status === AttendanceStatus.PRESENT ? 'bg-emerald-500 text-white' : status === AttendanceStatus.ABSENT ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                                        {student.name.charAt(0)}
                                                    </div>
                                                    <span className="font-black text-slate-700 text-base">{student.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-10">
                                                <div className="flex gap-2 justify-center">
                                                    <StatusBtn active={status === AttendanceStatus.PRESENT} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.PRESENT)} label="حاضر" color="emerald" />
                                                    <StatusBtn active={status === AttendanceStatus.ABSENT} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.ABSENT)} label="غائب" color="rose" />
                                                    <StatusBtn active={status === AttendanceStatus.LATE} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.LATE)} label="متأخر" color="amber" />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-200 py-32 opacity-30">
                        <Layout size={120} strokeWidth={1} />
                        <p className="mt-6 font-black text-2xl">اختر فصلاً لبدء التحضير</p>
                    </div>
                )
            ) : (
                <div className="p-4 lg:p-0">
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 h-20 shadow-sm">
                            <tr>
                                <th className="px-6 lg:px-10 border-l border-slate-50">التاريخ</th>
                                <th className="px-6 lg:px-10 border-l border-slate-50">اسم الطالب</th>
                                <th className="px-6 lg:px-10 text-center">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {attendanceHistory.slice().reverse().filter(r => !selectedClass || students.find(s=>s.id===r.studentId)?.className === selectedClass).map(rec => {
                                const s = students.find(std => std.id === rec.studentId);
                                return (
                                    <tr key={rec.id} className="hover:bg-slate-50 h-16 group transition-colors">
                                        <td className="px-6 lg:px-10 text-slate-400 font-mono text-xs border-l border-slate-50">{rec.date}</td>
                                        <td className="px-6 lg:px-10 font-black text-slate-800 border-l border-slate-50">{s?.name || '---'}</td>
                                        <td className="px-6 lg:px-10 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm border ${
                                                rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                                rec.status === AttendanceStatus.ABSENT ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                'bg-amber-50 text-amber-700 border-amber-100'
                                            }`}>
                                                {rec.status === AttendanceStatus.PRESENT ? 'حاضر' : rec.status === AttendanceStatus.ABSENT ? 'غائب' : 'متأخر'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const StatusBtn = ({ active, onClick, label, color }: any) => {
    const colors: any = {
        emerald: active ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-300 hover:border-emerald-500 hover:text-emerald-600',
        rose: active ? 'bg-rose-600 border-rose-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-300 hover:border-rose-500 hover:text-rose-600',
        amber: active ? 'bg-amber-500 border-amber-500 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-300 hover:border-amber-500 hover:text-amber-600'
    };
    return (
        <button onClick={onClick} className={`flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all border-2 ${colors[color]}`}>{label}</button>
    );
};

const MobileStatusBtn = ({ active, onClick, label, color }: any) => {
    const colors: any = {
        emerald: active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400',
        rose: active ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400',
        amber: active ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
    };
    return (
        <button onClick={onClick} className={`py-4 rounded-2xl font-black text-lg transition-all ${colors[color]}`}>{label}</button>
    );
};

export default Attendance;
