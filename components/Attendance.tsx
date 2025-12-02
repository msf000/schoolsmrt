import React, { useState, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus } from '../types';
import { Calendar, Save, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import DataImport from './DataImport';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  onImportAttendance: (records: AttendanceRecord[]) => void;
}

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, onImportAttendance }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Load existing attendance for selected date
  useEffect(() => {
    const existing = attendanceHistory.filter(a => a.date === selectedDate);
    const initialRecs: Record<string, AttendanceStatus> = {};
    
    // Default everyone to PRESENT if no record exists, otherwise load existing
    students.forEach(s => {
      const found = existing.find(r => r.studentId === s.id);
      initialRecs[s.id] = found ? found.status : AttendanceStatus.PRESENT;
    });
    setRecords(initialRecs);
    setSaved(false);
  }, [selectedDate, students, attendanceHistory]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRecords(prev => ({ ...prev, [studentId]: status }));
    setSaved(false);
  };

  const handleSave = () => {
    const recordsToSave: AttendanceRecord[] = students.map(s => ({
      id: `${s.id}-${selectedDate}`, // simple unique id strategy
      studentId: s.id,
      date: selectedDate,
      status: records[s.id] || AttendanceStatus.PRESENT,
    }));
    onSaveAttendance(recordsToSave);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const statusOptions = [
    { value: AttendanceStatus.PRESENT, label: 'حاضر', color: 'bg-green-100 text-green-700 border-green-200' },
    { value: AttendanceStatus.ABSENT, label: 'غائب', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: AttendanceStatus.LATE, label: 'متأخر', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { value: AttendanceStatus.EXCUSED, label: 'عذر', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">تسجيل الحضور والغياب</h2>
            <p className="text-sm text-gray-500 mt-1">تاريخ اليوم: {selectedDate}</p>
        </div>
        
        <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm"
            >
                <FileSpreadsheet size={18} />
                <span>استيراد ملف</span>
            </button>
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                <Calendar size={20} className="text-gray-500" />
                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="outline-none text-gray-700 bg-transparent"
                />
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-12 bg-gray-50 p-4 font-medium text-gray-600 border-b">
          <div className="col-span-4">اسم الطالب</div>
          <div className="col-span-8">الحالة</div>
        </div>
        <div className="divide-y divide-gray-100">
          {students.map(student => (
            <div key={student.id} className="grid grid-cols-12 p-4 items-center hover:bg-gray-50">
              <div className="col-span-12 sm:col-span-4 font-medium mb-2 sm:mb-0">{student.name}</div>
              <div className="col-span-12 sm:col-span-8 flex flex-wrap gap-2">
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(student.id, opt.value)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium border transition-all
                      ${records[student.id] === opt.value 
                        ? `${opt.color} ring-2 ring-offset-1 ring-gray-200` 
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          className="bg-primary hover:bg-teal-800 text-white px-8 py-3 rounded-lg flex items-center gap-2 shadow-lg transition-all transform hover:scale-105"
        >
          {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
          <span>{saved ? 'تم الحفظ بنجاح' : 'حفظ سجل الحضور'}</span>
        </button>
      </div>

       {/* --- IMPORT MODAL --- */}
      {isImportModalOpen && (
          <div className="fixed inset-0 z-[100] bg-white">
              <DataImport 
                  existingStudents={students}
                  onImportStudents={() => {}} 
                  onImportAttendance={(records) => {
                      onImportAttendance(records);
                      setIsImportModalOpen(false);
                  }}
                  onImportPerformance={() => {}}
                  forcedType="ATTENDANCE"
                  onClose={() => setIsImportModalOpen(false)}
              />
          </div>
      )}
    </div>
  );
};

export default Attendance;