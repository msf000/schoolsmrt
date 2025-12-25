
import React, { useState, useMemo, useEffect } from 'react';
/* Fix: Added PerformanceRecord to the imported types */
import { Student, AttendanceRecord, AttendanceStatus, ReportHeaderConfig, AcademicTerm, Subject, SystemUser, PerformanceRecord } from '../types';
import { Calendar, Printer, Filter, Loader2, FileSpreadsheet } from 'lucide-react';
import { getReportHeaderConfig, getAcademicTerms } from '../services/storageService';
import { formatDualDate } from '../services/dateService';
import * as XLSX from 'xlsx';

interface MonthlyReportProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ students = [], attendance = [], currentUser }) => {
  const [startDate, setStartDate] = useState(() => {
      const d = new Date(); d.setDate(1); 
      return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

  useEffect(() => {
      setHeaderConfig(getReportHeaderConfig(currentUser?.id));
  }, [currentUser]);

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
  const filteredStudents = useMemo(() => students.filter(s => s.className === selectedClass).sort((a, b) => a.name.localeCompare(b.name, 'ar')), [students, selectedClass]);

  const sessions = useMemo(() => {
      if (!selectedClass) return [];
      const classStudentIds = new Set(filteredStudents.map(s => s.id));
      const relevantRecords = (attendance || []).filter(r => classStudentIds.has(r.studentId) && r.date >= startDate && r.date <= endDate);
      const sessionMap = new Map<string, { date: string, period?: number }>();
      relevantRecords.forEach(r => {
          const key = `${r.date}_${r.period || 0}`;
          if (!sessionMap.has(key)) sessionMap.set(key, { date: r.date, period: r.period });
      });
      return Array.from(sessionMap.values()).sort((a, b) => a.date.localeCompare(b.date) || (a.period || 0) - (b.period || 0));
  }, [attendance, filteredStudents, selectedClass, startDate, endDate]);

  const calculateStats = (studentId: string) => {
      const childAtt = attendance.filter(a => a.studentId === studentId && a.date >= startDate && a.date <= endDate);
      return {
          absent: childAtt.filter(a => a.status === AttendanceStatus.ABSENT).length,
          late: childAtt.filter(a => a.status === AttendanceStatus.LATE).length
      };
  };

  const handleExport = () => {
      const data = filteredStudents.map((s, i) => {
          const row: any = { '#': i + 1, 'اسم الطالب': s.name };
          sessions.forEach(sess => {
              const rec = attendance.find(r => r.studentId === s.id && r.date === sess.date && r.period === sess.period);
              row[`${sess.date} (ح${sess.period || 0})`] = rec ? (rec.status === AttendanceStatus.PRESENT ? 'ح' : 'غ') : '-';
          });
          const stats = calculateStats(s.id);
          row['إجمالي الغياب'] = stats.absent;
          return row;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "تقرير الحضور");
      XLSX.writeFile(wb, `Attendance_Report_${selectedClass}.xlsx`);
  };

  return (
      <div className="flex flex-col h-full bg-white rounded-3xl border shadow-sm overflow-hidden animate-fade-in font-tajawal">
          <div className="p-4 bg-slate-50 border-b flex flex-wrap gap-4 items-center justify-between print:hidden">
              <div className="flex gap-2">
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 border rounded-xl bg-white font-bold text-xs">
                    <option value="">-- اختر الفصل --</option>
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="p-2 border rounded-xl text-xs"/>
                <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="p-2 border rounded-xl text-xs"/>
              </div>
              <div className="flex gap-2">
                <button onClick={handleExport} className="p-2 bg-green-600 text-white rounded-xl text-xs font-bold flex items-center gap-2"><FileSpreadsheet size={16}/> Excel</button>
                <button onClick={()=>window.print()} className="p-2 bg-gray-800 text-white rounded-xl text-xs font-bold flex items-center gap-2"><Printer size={16}/> طباعة</button>
              </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
              {selectedClass ? (
                  <table className="w-full text-center border-collapse text-[10px] md:text-xs">
                      <thead className="bg-gray-100">
                          <tr>
                              <th className="p-2 border w-10">#</th>
                              <th className="p-2 border w-48 text-right">اسم الطالب</th>
                              {sessions.map((sess, idx) => <th key={idx} className="p-2 border">{sess.date.slice(5)}<br/>ح{sess.period || 0}</th>)}
                              <th className="p-2 border bg-red-50 text-red-600">غ</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredStudents.map((s, i) => {
                              const stats = calculateStats(s.id);
                              return (
                                  <tr key={s.id} className="hover:bg-gray-50 border-b">
                                      <td className="p-2 border">{i + 1}</td>
                                      <td className="p-2 border text-right font-bold">{s.name}</td>
                                      {sessions.map((sess, idx) => {
                                          const rec = attendance.find(r => r.studentId === s.id && r.date === sess.date && r.period === sess.period);
                                          return <td key={idx} className={`p-1 border ${rec?.status === AttendanceStatus.ABSENT ? 'bg-red-50 text-red-600 font-bold' : ''}`}>{rec ? (rec.status === AttendanceStatus.ABSENT ? 'غ' : 'ح') : '-'}</td>;
                                      })}
                                      <td className="p-2 border font-bold text-red-600 bg-red-50">{stats.absent}</td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                      <Calendar size={64} className="mb-4"/>
                      <p className="font-bold">اختر الفصل والتاريخ لعرض التقرير</p>
                  </div>
              )}
          </div>
      </div>
  );
};

export default MonthlyReport;
