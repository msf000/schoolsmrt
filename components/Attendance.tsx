
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser } from '../types';
import { CheckCircle, XCircle, Clock, Users, ChevronRight, ChevronLeft, Save, Search, CheckSquare } from 'lucide-react';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const Attendance: React.FC<AttendanceProps> = ({ 
    students, 
    attendanceHistory, 
    onSaveAttendance, 
    currentUser 
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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

  const handleStatusToggle = (studentId: string, currentStatus: AttendanceStatus) => {
    const nextStatus = currentStatus === AttendanceStatus.PRESENT ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT;
    
    const existing = attendanceHistory.find(a => a.studentId === studentId && a.date === selectedDate);
    const record: AttendanceRecord = {
      id: existing?.id || `${studentId}-${selectedDate}`,
      studentId,
      date: selectedDate,
      status: nextStatus,
      behaviorStatus: existing?.behaviorStatus || BehaviorStatus.NEUTRAL,
      createdById: currentUser?.id
    };
    onSaveAttendance([record]);
  };

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    const existing = attendanceHistory.find(a => a.studentId === studentId && a.date === selectedDate);
    const record: AttendanceRecord = {
      id: existing?.id || `${studentId}-${selectedDate}`,
      studentId,
      date: selectedDate,
      status: status,
      behaviorStatus: existing?.behaviorStatus || BehaviorStatus.NEUTRAL,
      createdById: currentUser?.id
    };
    onSaveAttendance([record]);
  };

  const markAllPresent = () => {
    if (!selectedClass) return;
    const records: AttendanceRecord[] = filteredStudents.map(s => ({
      id: `${s.id}-${selectedDate}`,
      studentId: s.id,
      date: selectedDate,
      status: AttendanceStatus.PRESENT,
      behaviorStatus: BehaviorStatus.NEUTRAL,
      createdById: currentUser?.id
    }));
    onSaveAttendance(records);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50/50 animate-fade-in">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl border">
            <button onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={18}/></button>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={e => setSelectedDate(e.target.value)} 
              className="bg-transparent text-sm font-bold outline-none cursor-pointer text-center"
            />
            <button onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={18}/></button>
          </div>

          <select 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)}
            className="p-2.5 border rounded-xl bg-white font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[150px]"
          >
            <option value="">جميع الفصول</option>
            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="relative flex-1 lg:w-64">
            <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
            <input 
              type="text" 
              placeholder="بحث بالاسم..." 
              className="w-full pr-10 pl-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {selectedClass && (
          <button 
            onClick={markAllPresent}
            className="w-full lg:w-auto bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-md transition-all active:scale-95"
          >
            <CheckSquare size={18}/> تحضير الكل حاضر
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {filteredStudents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredStudents.map(student => {
              const record = attendanceHistory.find(a => a.studentId === student.id && a.date === selectedDate);
              const status = record?.status || AttendanceStatus.PRESENT;

              return (
                <div 
                  key={student.id} 
                  className={`p-4 rounded-2xl border-2 transition-all group relative overflow-hidden ${
                    status === AttendanceStatus.ABSENT ? 'bg-red-50 border-red-100 shadow-sm' : 
                    status === AttendanceStatus.LATE ? 'bg-yellow-50 border-yellow-100 shadow-sm' : 
                    'bg-white border-transparent hover:border-indigo-100 hover:shadow-md'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                      status === AttendanceStatus.ABSENT ? 'bg-red-600 text-white' : 
                      status === AttendanceStatus.LATE ? 'bg-yellow-500 text-white' : 
                      'bg-indigo-600 text-white'
                    }`}>
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setStatus(student.id, AttendanceStatus.LATE)}
                        title="تأخر"
                        className={`p-1.5 rounded-lg transition-all ${status === AttendanceStatus.LATE ? 'bg-yellow-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-yellow-100 hover:text-yellow-600'}`}
                      >
                        <Clock size={16}/>
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-gray-800 line-clamp-1 mb-1">{student.name}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4">
                    {student.className || 'بدون فصل'}
                  </p>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleStatusToggle(student.id, status)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        status === AttendanceStatus.ABSENT 
                        ? 'bg-red-600 text-white shadow-lg shadow-red-100' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {status === AttendanceStatus.ABSENT ? <XCircle size={14}/> : <CheckCircle size={14}/>}
                      {status === AttendanceStatus.ABSENT ? 'غائب' : 'حاضر'}
                    </button>
                  </div>
                  
                  {/* Decorative icon background */}
                  <div className="absolute -bottom-4 -left-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    {status === AttendanceStatus.ABSENT ? <XCircle size={100}/> : <CheckCircle size={100}/>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 py-20">
            <Users size={80} className="mb-4 opacity-20"/>
            <p className="text-xl font-bold">لا يوجد طلاب مطابقين للبحث</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
