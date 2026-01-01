
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { saveAttendance } from '../services/storageService';
import { 
    CheckCircle, XCircle, Search, RefreshCw, 
    UserCheck, BookOpen, Calendar as CalendarIcon, 
    ChevronLeft, UserMinus, UserPlus, Layout, History
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
        showToast('فشل التزامن السحابي', 'ERROR');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-tajawal h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200">
              <button onClick={() => setActiveTab('RECORD')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'RECORD' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>رصد الحضور</button>
              <button onClick={() => setActiveTab('HISTORY')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'HISTORY' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>السجل</button>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"/>
                <input className="pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 w-64" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
             </div>
          </div>
      </div>

      {activeTab === 'RECORD' ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="p-4 bg-slate-50 border-b flex flex-wrap gap-4 items-center shrink-0">
                <div className="w-48">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">الفصل</label>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-2 border rounded-md bg-white text-xs font-bold outline-none">
                        <option value="">-- اختر الفصل --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="w-48">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">تاريخ اليوم</label>
                    <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2 border rounded-md bg-white text-xs font-bold outline-none"/>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {selectedClass ? (
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-slate-50 border-b text-[11px] font-bold text-slate-500 uppercase sticky top-0 z-10 h-12">
                            <tr>
                                <th className="px-6 border-l w-16 text-center">م</th>
                                <th className="px-6 border-l">اسم الطالب</th>
                                <th className="px-6 border-l text-center w-64">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map((student, idx) => {
                                const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
                                const status = record?.status || null;
                                return (
                                    <tr key={student.id} className="hover:bg-slate-50 transition-colors h-14">
                                        <td className="px-6 text-center text-slate-400 font-mono text-xs border-l">{idx + 1}</td>
                                        <td className="px-6 font-medium text-slate-700 border-l">{student.name}</td>
                                        <td className="px-6">
                                            <div className="flex gap-2 justify-center">
                                                <button 
                                                    onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.PRESENT)}
                                                    className={`px-4 py-1.5 rounded-md text-[11px] font-bold transition-all border ${status === AttendanceStatus.PRESENT ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                                >
                                                    حاضر
                                                </button>
                                                <button 
                                                    onClick={()=>handleUpdateStatus(student.id, AttendanceStatus.ABSENT)}
                                                    className={`px-4 py-1.5 rounded-md text-[11px] font-bold transition-all border ${status === AttendanceStatus.ABSENT ? 'bg-red-600 border-red-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600'}`}
                                                >
                                                    غائب
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20 opacity-50">
                        <Layout size={64}/>
                        <p className="mt-4 font-bold">يرجى اختيار الفصل الدراسي للبدء.</p>
                    </div>
                )}
            </div>
          </div>
      ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-right border-collapse text-sm">
                      <thead className="bg-slate-50 border-b text-[11px] font-bold text-slate-500 uppercase sticky top-0 z-10 h-12">
                          <tr>
                            <th className="px-6 border-l">التاريخ</th>
                            <th className="px-6 border-l">الطالب</th>
                            <th className="px-6 text-center">الحالة</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {attendanceHistory.slice().reverse().map(rec => {
                              const s = students.find(std => std.id === rec.studentId);
                              return (
                                  <tr key={rec.id} className="hover:bg-slate-50 h-12">
                                      <td className="px-6 text-slate-400 font-mono border-l">{rec.date}</td>
                                      <td className="px-6 font-medium text-slate-700 border-l">{s?.name || '---'}</td>
                                      <td className="px-6 text-center">
                                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{rec.status}</span>
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
