
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser, TeacherAssignment } from '../types';
import { saveAttendance, getTeacherAssignments } from '../services/storageService';
import { 
    CheckCircle, XCircle, Search, RefreshCw, 
    UserCheck, BookOpen, Calendar as CalendarIcon, 
    ChevronLeft, UserMinus, UserPlus, Layout, History,
    Filter, Clock, CheckCircle2, AlertTriangle, CloudLightning, QrCode, ScanLine, Camera, Trash2, Printer
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
    <div className="space-y-8 animate-fade-in font-tajawal h-full flex flex-col overflow-hidden pb-10">
      {isAiScannerOpen && (
          <AIAttendanceScanner 
            students={filteredStudents} 
            currentUserId={currentUser?.id}
            onDetected={(recs) => { onSaveAttendance(recs); showToast('اكتمل الرصد البصري', 'SUCCESS'); }} 
            onClose={() => setIsAiScannerOpen(false)} 
          />
      )}

      {/* Record Management Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-white p-8 rounded-[3.5rem] border shadow-sm">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border shadow-inner">
              <button onClick={() => setActiveTab('RECORD')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'RECORD' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}>رصد التحضير المباشر</button>
              <button onClick={() => setActiveTab('HISTORY')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}>سجل الغياب المتراكم</button>
          </div>
          
          <div className="flex items-center gap-4">
             <button onClick={() => setIsAiScannerOpen(true)} className="px-8 py-3.5 bg-purple-600 text-white rounded-2xl font-black text-xs flex items-center gap-3 shadow-xl hover:bg-purple-700 transition-all group">
                <Camera size={20} className="group-hover:scale-110 transition-transform"/> رصد بصري ذكي (AI)
             </button>
             <button onClick={handleMarkAllPresent} disabled={!selectedClass} className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center gap-3 shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
                <UserCheck size={20}/> تحضير كافة الحاضرين
             </button>
          </div>
      </div>

      <div className="flex-1 bg-white rounded-[4rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Deep Filters */}
        <div className="p-10 bg-slate-50/50 border-b flex flex-wrap gap-10 items-center shrink-0">
            <div className="w-72">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mr-1">الفصل المستهدف</label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-4 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] bg-white text-sm font-black outline-none shadow-sm transition-all">
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="w-72">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mr-1">تاريخ الحصة</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-4 bg-white border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] text-sm font-black outline-none shadow-sm transition-all"/>
            </div>
            <div className="flex-1 min-w-[300px] pt-6">
                <div className="relative">
                    <Search size={22} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300"/>
                    <input className="w-full pr-14 pl-6 py-4 bg-white border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] text-sm font-black outline-none shadow-sm transition-all" placeholder="بحث سريع في أسماء الطلاب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                </div>
            </div>
        </div>

        {activeTab === 'RECORD' ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {selectedClass ? (
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 h-20 shadow-sm">
                            <tr>
                                <th className="px-10 border-l border-slate-50 w-24 text-center">م</th>
                                <th className="px-10 border-l border-slate-50">اسم الطالب الرباعي</th>
                                <th className="px-10 text-center w-[450px]">حالة الحضور والانضباط</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.map((student, idx) => {
                                const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
                                const status = record?.status || null;
                                return (
                                    <tr key={student.id} className="hover:bg-indigo-50/10 transition-all group h-20">
                                        <td className="px-10 text-center text-slate-300 font-mono text-[11px] border-l border-slate-50 font-black">{idx + 1}</td>
                                        <td className="px-10 border-l border-slate-50">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-inner ${status === AttendanceStatus.PRESENT ? 'bg-emerald-500 text-white' : status === AttendanceStatus.ABSENT ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                <span className="font-black text-slate-700 text-base">{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-10">
                                            <div className="flex gap-3 justify-center">
                                                <AttendanceStatusBtn active={status === AttendanceStatus.PRESENT} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.PRESENT)} label="حاضر" color="emerald" icon={<CheckCircle size={16}/>} />
                                                <AttendanceStatusBtn active={status === AttendanceStatus.ABSENT} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.ABSENT)} label="غائب" color="red" icon={<XCircle size={16}/>} />
                                                <AttendanceStatusBtn active={status === AttendanceStatus.LATE} onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.LATE)} label="متأخر" color="amber" icon={<Clock size={16}/>} />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-200 py-48 opacity-40">
                        <Layout size={160} strokeWidth={1} />
                        <p className="mt-8 font-black text-3xl italic">بانتظار تحديد الفصل لبدء الرصد الميداني</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-right border-collapse text-sm">
                    <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 h-20 shadow-sm">
                        <tr>
                        <th className="px-10 border-l border-slate-50">تاريخ الحصة</th>
                        <th className="px-10 border-l border-slate-50">اسم الطالب</th>
                        <th className="px-10 border-l border-slate-50 text-center">المادة</th>
                        <th className="px-10 text-center">الحالة النهائية</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {attendanceHistory.slice().reverse().map(rec => {
                            const s = students.find(std => std.id === rec.studentId);
                            if (selectedClass && s?.className !== selectedClass) return null;
                            return (
                                <tr key={rec.id} className="hover:bg-slate-50 h-16 group transition-colors">
                                    <td className="px-10 text-slate-400 font-mono text-xs border-l border-slate-50">{formatDualDate(rec.date)}</td>
                                    <td className="px-10 font-black text-slate-800 border-l border-slate-50">{s?.name || '---'}</td>
                                    <td className="px-10 text-center text-slate-400 font-black border-l border-slate-50 uppercase text-[10px] tracking-widest">{rec.subject || 'عام'}</td>
                                    <td className="px-10 text-center">
                                        <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase shadow-sm border ${
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
  );
};

const AttendanceStatusBtn = ({ active, onClick, label, color, icon }: any) => {
    const colors: any = {
        emerald: active ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-900/20' : 'bg-white border-slate-100 text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200',
        red: active ? 'bg-rose-600 border-rose-600 text-white shadow-xl shadow-rose-900/20' : 'bg-white border-slate-100 text-slate-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200',
        amber: active ? 'bg-amber-500 border-amber-500 text-white shadow-xl shadow-amber-900/20' : 'bg-white border-slate-100 text-slate-300 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200'
    };
    return (
        <button onClick={onClick} className={`flex-1 py-3 rounded-2xl text-[11px] font-black transition-all border-2 flex items-center justify-center gap-3 ${colors[color]}`}>
            {icon} {label}
        </button>
    );
};

export default Attendance;
