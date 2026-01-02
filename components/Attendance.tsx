
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { saveAttendance } from '../services/storageService';
import { 
    Search, UserCheck, Calendar as CalendarIcon, 
    History, Camera, Check, X, Clock, Loader2
} from 'lucide-react';
import { useToast } from './ToastProvider';

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

  return (
    <div className="space-y-6 page-enter font-tajawal">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">رصد الحضور</h1>
            <p className="text-slate-500 text-sm">تسجيل حالة حضور الطلاب في الوقت الفعلي.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setActiveTab('RECORD')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'RECORD' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>رصد جديد</button>
            <button onClick={() => setActiveTab('HISTORY')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>الأرشيف</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center">
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 bg-transparent font-bold text-slate-900 border-none outline-none cursor-pointer hover:text-brand-500">
                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="h-4 w-px bg-slate-200 mx-2"></div>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 border-none outline-none cursor-pointer"/>
            <div className="flex-1"></div>
            <div className="relative">
                <Search size={16} className="absolute right-3 top-2.5 text-slate-400"/>
                <input className="pr-9 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500 w-48 md:w-64" placeholder="بحث سريع..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto">
            {activeTab === 'RECORD' ? (
                <table className="w-full text-right text-sm">
                    <thead>
                        <tr className="text-slate-400 font-bold border-b border-slate-100 bg-slate-50/50">
                            <th className="px-6 py-3 w-12">#</th>
                            <th className="px-6 py-3">اسم الطالب</th>
                            <th className="px-6 py-3 text-center">قرار الحضور</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((student, idx) => {
                            const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
                            const status = record?.status || null;
                            return (
                                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors h-14">
                                    <td className="px-6 py-4 text-slate-300 font-medium">{idx + 1}</td>
                                    <td className="px-6 py-4 font-bold text-slate-700">{student.name}</td>
                                    <td className="px-6 py-4">
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
            ) : (
                <div className="py-20 text-center text-slate-400">
                    <History size={48} className="mx-auto mb-4 opacity-20"/>
                    <p className="font-bold">سجل الأرشيف قيد التطوير</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const StatusBtn = ({ active, onClick, label, color }: any) => {
    const colors: any = {
        emerald: active ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-200 hover:text-emerald-600 hover:bg-emerald-50',
        rose: active ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-slate-400 border-slate-200 hover:text-rose-600 hover:bg-rose-50',
        amber: active ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-400 border-slate-200 hover:text-amber-600 hover:bg-amber-50'
    };
    return (
        <button onClick={onClick} className={`px-4 py-1 rounded-lg text-[11px] font-bold transition-all border ${colors[color]}`}>{label}</button>
    );
};

export default Attendance;
