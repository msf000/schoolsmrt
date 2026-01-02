
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser, TeacherAssignment } from '../types';
import { saveAttendance, getTeacherAssignments } from '../services/storageService';
import { 
    CheckCircle, XCircle, Search, RefreshCw, 
    UserCheck, BookOpen, Calendar as CalendarIcon, 
    ChevronLeft, UserMinus, UserPlus, Layout, History,
    Filter, Clock, CheckCircle2, AlertTriangle, CloudLightning, QrCode, ScanLine, Camera
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
      // Fix: Added fallback empty string to satisfy TypeScript SetStateAction requirement
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
    } catch (e) {
        showToast('فشل التزامن مع السحابة', 'ERROR');
    }
  };

  const handleMarkAllPresent = async () => {
      if (!selectedClass) return;
      const records: AttendanceRecord[] = filteredStudents.map(s => ({
          id: `att_${s.id}_${selectedDate}`,
          studentId: s.id,
          date: selectedDate,
          status: AttendanceStatus.PRESENT,
          createdById: currentUser?.id
      }));
      await saveAttendance(records);
      onSaveAttendance(records);
      showToast(`تم تحضير جميع طلاب ${selectedClass} بنجاح.`, 'SUCCESS');
  };

  return (
    <div className="space-y-8 animate-fade-in font-tajawal h-full flex flex-col overflow-hidden">
      {isAiScannerOpen && (
          <AIAttendanceScanner 
            students={filteredStudents} 
            currentUserId={currentUser?.id}
            onDetected={(recs) => { onSaveAttendance(recs); showToast('اكتمل الرصد البصري بنجاح', 'SUCCESS'); }} 
            onClose={() => setIsAiScannerOpen(false)} 
          />
      )}

      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-6 shrink-0 bg-white p-6 rounded-[2rem] border shadow-sm">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-100">
              <button onClick={() => setActiveTab('RECORD')} className={`px-10 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'RECORD' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>رصد الحضور المباشر</button>
              <button onClick={() => setActiveTab('HISTORY')} className={`px-10 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'HISTORY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>سجل الغياب المتراكم</button>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={() => setIsAiScannerOpen(true)} className="px-6 py-3 bg-purple-600 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-xl shadow-purple-900/10 hover:bg-purple-700 transition-all hover:scale-105 active:scale-95">
                <Camera size={18}/> رصد بصري (AI)
             </button>
             <button onClick={handleMarkAllPresent} disabled={!selectedClass} className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-xl shadow-emerald-900/10 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
                <UserCheck size={18}/> تحضير الكل
             </button>
          </div>
      </div>

      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {/* Filters Area */}
        <div className="p-6 bg-slate-50/50 border-b flex flex-wrap gap-6 items-center shrink-0">
            <div className="w-64">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mr-1">الفصل المستهدف</label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-3.5 border-2 border-transparent focus:border-blue-500 rounded-2xl bg-white text-xs font-black outline-none shadow-sm transition-all">
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="w-64">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mr-1">تاريخ الحصة</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-3 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl text-xs font-black outline-none shadow-sm transition-all"/>
            </div>
            <div className="flex-1 min-w-[250px] pt-5">
                <div className="relative">
                    <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                    <input className="w-full pr-12 pl-4 py-3.5 bg-white border-2 border-transparent focus:border-blue-500 rounded-2xl text-xs font-black outline-none shadow-sm transition-all" placeholder="بحث سريع في القائمة..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                </div>
            </div>
        </div>

        {activeTab === 'RECORD' ? (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {selectedClass ? (
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 z-10 h-16">
                            <tr>
                                <th className="px-8 border-l border-slate-50 w-24 text-center">م</th>
                                <th className="px-8 border-l border-slate-50">اسم الطالب</th>
                                <th className="px-8 text-center w-[400px]">حالة الحضور</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.map((student, idx) => {
                                const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
                                const status = record?.status || null;
                                return (
                                    <tr key={student.id} className="hover:bg-indigo-50/10 transition-all group h-16">
                                        <td className="px-8 text-center text-slate-300 font-mono text-[11px] border-l border-slate-50">{idx + 1}</td>
                                        <td className="px-8 border-l border-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-white' : status === AttendanceStatus.ABSENT ? 'bg-red-50 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                <span className="font-black text-slate-700 text-sm">{student.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8">
                                            <div className="flex gap-3 justify-center">
                                                <StatusBtn 
                                                    active={status === AttendanceStatus.PRESENT} 
                                                    onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.PRESENT)}
                                                    label="حاضر" 
                                                    color="emerald"
                                                    icon={<CheckCircle size={14}/>}
                                                />
                                                <StatusBtn 
                                                    active={status === AttendanceStatus.ABSENT} 
                                                    onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.ABSENT)}
                                                    label="غائب" 
                                                    color="red"
                                                    icon={<XCircle size={14}/>}
                                                />
                                                <StatusBtn 
                                                    active={status === AttendanceStatus.LATE} 
                                                    onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.LATE)}
                                                    label="متأخر" 
                                                    color="amber"
                                                    icon={<Clock size={14}/>}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-32 opacity-20">
                        <Layout size={120}/>
                        <p className="mt-6 font-black text-2xl">بانتظار اختيار الفصل لبدء الرصد</p>
                    </div>
                )}
            </div>
        ) : (
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-right border-collapse text-sm">
                    <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 h-16">
                        <tr>
                        <th className="px-8 border-l border-slate-50">تاريخ الحصة</th>
                        <th className="px-8 border-l border-slate-50">اسم الطالب</th>
                        <th className="px-8 border-l border-slate-50 text-center">المادة</th>
                        <th className="px-8 text-center">الحالة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {attendanceHistory.slice().reverse().map(rec => {
                            const s = students.find(std => std.id === rec.studentId);
                            if (selectedClass && s?.className !== selectedClass) return null;
                            return (
                                <tr key={rec.id} className="hover:bg-slate-50 h-14">
                                    <td className="px-8 text-slate-400 font-mono text-xs border-l border-slate-50">{formatDualDate(rec.date)}</td>
                                    <td className="px-8 font-black text-slate-700 border-l border-slate-50">{s?.name || '---'}</td>
                                    <td className="px-8 text-center text-slate-400 font-bold border-l border-slate-50">{rec.subject || 'عام'}</td>
                                    <td className="px-8 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm border ${
                                            rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                            rec.status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-700 border-red-100' :
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
      
      {/* Real-time Indicator */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-8 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-6 animate-slide-up">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> <span className="text-[10px] font-black uppercase tracking-wider">سحابي نشط</span></div>
            <div className="w-px h-4 bg-white/10"></div>
            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{filteredStudents.length} طالباً في القائمة</div>
      </div>
    </div>
  );
};

const StatusBtn = ({ active, onClick, label, color, icon }: any) => {
    const colors: any = {
        emerald: active ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-white border-slate-200 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600',
        red: active ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-white border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600',
        amber: active ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-900/20' : 'bg-white border-slate-200 text-slate-400 hover:bg-amber-50 hover:text-amber-600'
    };
    return (
        <button 
            onClick={onClick}
            className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all border-2 flex items-center justify-center gap-2 ${colors[color]}`}
        >
            {icon} {label}
        </button>
    );
};

export default Attendance;
