
import React, { useState, useMemo, useRef } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { 
    CheckCircle, XCircle, Clock, Users, Search, Sparkles, 
    Calendar as CalendarIcon, Loader2, UserCheck, Timer, 
    History, Trash2, Cloud, Camera, RefreshCw, Database, Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSchedules, getTeacherAssignments, getSubjects, saveAttendance, deleteAttendance } from '../services/storageService';
import { analyzeAttendancePhoto } from '../services/geminiService';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, currentUser }) => {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'RECORD' | 'HISTORY'>('RECORD');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // AI Attendance States
  const [isAiScanning, setIsAiScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    return Array.from(classes).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = !selectedClass || s.className === selectedClass;
      const matchesSearch = !searchTerm || s.name.includes(searchTerm);
      return matchesClass && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass, searchTerm]);

  const handleUpdate = async (studentId: string, status: AttendanceStatus) => {
    const sub = selectedSubject || 'عام';
    const recordId = `${studentId}_${selectedDate}_${selectedPeriod}_${sub.replace(/\s+/g, '_')}`;
    
    const record: AttendanceRecord = {
      id: recordId,
      studentId,
      date: selectedDate,
      period: selectedPeriod,
      subject: sub,
      status,
      createdById: currentUser?.id
    };
    
    setIsSyncing(true);
    try {
        await saveAttendance([record]);
        onSaveAttendance([record]); 
    } catch (e) {
        alert('حدث خطأ في الاتصال بالسحابة.');
    } finally {
        setIsSyncing(false);
    }
  };

  const handleAiPhotoAttendance = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedClass) return;
      
      setIsAiScanning(true);
      const reader = new FileReader();
      reader.onload = async () => {
          try {
              const base64 = reader.result as string;
              const result = await analyzeAttendancePhoto(base64, filteredStudents);
              
              if (result && result.attendance) {
                  const records: AttendanceRecord[] = [];
                  result.attendance.forEach((item: any) => {
                      const student = filteredStudents.find(s => s.name.includes(item.name) || item.name.includes(s.name));
                      if (student) {
                          const sub = selectedSubject || 'عام';
                          records.push({
                              id: `${student.id}_${selectedDate}_${selectedPeriod}_${sub.replace(/\s+/g, '_')}`,
                              studentId: student.id,
                              date: selectedDate,
                              period: selectedPeriod,
                              subject: sub,
                              status: item.status as AttendanceStatus,
                              createdById: currentUser?.id
                          });
                      }
                  });
                  if (records.length > 0) {
                      await saveAttendance(records);
                      onSaveAttendance(records);
                      alert(`تم رصد حضور ${records.length} طلاب تلقائياً عبر الصورة!`);
                  } else {
                      alert('لم يتم التعرف على أي طلاب في الصورة.');
                  }
              }
          } catch (error) {
              alert('فشل تحليل الصورة بالذكاء الاصطناعي.');
          } finally {
              setIsAiScanning(false);
          }
      };
      reader.readAsDataURL(file);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in pb-24 font-tajawal overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
              <button onClick={() => setActiveTab('RECORD')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'RECORD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
                  <UserCheck size={16}/> رصد الحضور
              </button>
              <button onClick={() => setActiveTab('HISTORY')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
                  <History size={16}/> السجل السحابي
              </button>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'RECORD' && selectedClass && (
                <>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleAiPhotoAttendance} />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAiScanning}
                        className="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:bg-purple-700 transition-all disabled:opacity-50"
                    >
                        {isAiScanning ? <Loader2 className="animate-spin" size={16}/> : <Camera size={16}/>}
                        تحضير ذكي بالصورة (AI)
                    </button>
                </>
            )}
            {isSyncing && <div className="text-indigo-600 text-xs font-black flex items-center gap-2 animate-pulse"><Cloud size={16}/> جاري المزامنة...</div>}
          </div>
      </div>

      {activeTab === 'RECORD' ? (
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 mb-6 relative overflow-hidden shrink-0">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-slate-800">تحضير الفصل المباشر</h2>
                    <div className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        <span className="flex items-center gap-1"><CalendarIcon size={14}/> {selectedDate}</span>
                        <div className="h-3 w-px bg-slate-200"></div>
                        <span className="flex items-center gap-1"><Timer size={14}/> الحصة {selectedPeriod}</span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                        <Users size={16} className="text-slate-400 mr-2"/>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[120px] text-slate-700">
                            <option value="">اختر الفصل...</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="w-px h-6 bg-slate-200 mx-1"></div>
                        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[120px] text-indigo-600">
                            <option value="">المادة الدراسية...</option>
                            {Array.from(new Set(attendanceHistory.map(a => a.subject).filter(Boolean))).map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
            <div className="mt-6 relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                <input className="w-full pr-12 pl-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" placeholder="ابحث عن طالب في هذا الفصل..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
                {filteredStudents.map(student => {
                  const recordId = `${student.id}_${selectedDate}_${selectedPeriod}_${(selectedSubject || 'عام').replace(/\s+/g, '_')}`;
                  const record = attendanceHistory.find(a => a.id === recordId);
                  const status = record?.status || null;

                  return (
                    <div key={student.id} className={`p-5 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between h-48 shadow-sm group ${status === AttendanceStatus.ABSENT ? 'bg-red-50 border-red-200' : status === AttendanceStatus.PRESENT ? 'bg-white border-emerald-100' : 'bg-white border-transparent hover:border-slate-200'}`}>
                        <div className="flex items-start gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white' : status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                {student.name.charAt(0)}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <h4 className="text-sm font-black text-slate-800 truncate">{student.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold mt-1">سجل سحابي مباشر</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                            <button onClick={() => handleUpdate(student.id, AttendanceStatus.PRESENT)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${status === AttendanceStatus.PRESENT ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50'}`}>
                                <CheckCircle size={14}/> حاضر
                            </button>
                            <button onClick={() => handleUpdate(student.id, AttendanceStatus.ABSENT)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 ${status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-red-50'}`}>
                                <XCircle size={14}/> غائب
                            </button>
                        </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-[2.5rem] border shadow-sm flex flex-col overflow-hidden animate-fade-in">
            <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 md:w-64">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="بحث باسم الطالب..." />
                </div>
                <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] font-black border border-indigo-100 flex items-center gap-2">
                    <Database size={14}/> إجمالي السجلات في السحابة: {attendanceHistory.length}
                </div>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50/80 sticky top-0 z-10 border-b text-slate-500 font-black uppercase">
                        <tr><th className="p-5 w-12 text-center">#</th><th className="p-5">التاريخ</th><th className="p-5">الطالب</th><th className="p-5">المادة</th><th className="p-5 text-center">الحالة</th><th className="p-5 text-center">إجراءات</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                        {attendanceHistory.slice(0, 100).map((rec, idx) => {
                            const student = students.find(s => s.id === rec.studentId);
                            return (
                                <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-5 text-center font-mono text-slate-300">{idx + 1}</td>
                                    <td className="p-5 text-slate-500 whitespace-nowrap">{rec.date}</td>
                                    <td className="p-5"><p className="text-slate-800 font-black">{student?.name || 'طالب محذوف'}</p></td>
                                    <td className="p-5 text-indigo-600">{rec.subject || 'عام'}</td>
                                    <td className="p-5 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black ${rec.status === AttendanceStatus.PRESENT ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                            {rec.status === AttendanceStatus.PRESENT ? 'حاضر' : 'غائب'}
                                        </span>
                                    </td>
                                    <td className="p-5 text-center">
                                        <button onClick={() => deleteAttendance(rec.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      <div className="fixed bottom-24 left-6 pointer-events-none">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-slide-up pointer-events-auto border border-white/10">
              <Check size={14} className="text-emerald-400"/>
              قاعدة البيانات: <span className="text-emerald-400">سحابية مباشرة</span>
          </div>
      </div>
    </div>
  );
};

export default Attendance;
