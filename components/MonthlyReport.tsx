
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, ReportHeaderConfig, PerformanceRecord, AcademicTerm, Subject, SystemUser } from '../types';
import { Calendar, Printer, Filter, Loader2, FileSpreadsheet, Search } from 'lucide-react';
import { getReportHeaderConfig, getSubjects, getAcademicTerms } from '../services/storageService';
import { formatDualDate } from '../services/dateService';
import * as XLSX from 'xlsx';

interface MonthlyReportProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ students = [], attendance = [], performance = [], currentUser }) => {
  if (!students) {
      return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32}/></div>;
  }

  const [startDate, setStartDate] = useState(() => {
      const d = new Date();
      d.setDate(1); 
      return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
      const d = new Date(); 
      return d.toISOString().split('T')[0];
  });
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  useEffect(() => {
      setHeaderConfig(getReportHeaderConfig(currentUser?.id));
      setSubjects(getSubjects(currentUser?.id));
      const loadedTerms = getAcademicTerms(currentUser?.id);
      setTerms(loadedTerms);
      const current = loadedTerms.find(t => t.isCurrent);
      if (current) {
          setSelectedTermId(current.id);
          setStartDate(current.startDate);
          setEndDate(current.endDate);
      }
  }, [currentUser]);

  const uniqueClasses = useMemo(() => {
      const classes = new Set<string>();
      students.forEach(s => { if (s.className) classes.add(s.className); });
      return Array.from(classes).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
      if (!selectedClass) return [];
      return students.filter(s => s.className === selectedClass).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass]);

  // --- CORE LOGIC: Find actual sessions recorded ---
  const sessions = useMemo(() => {
      if (!selectedClass || !startDate || !endDate) return [];

      const classStudentIds = new Set(filteredStudents.map(s => s.id));
      const safeAttendance = attendance || [];

      // Get all attendance records for this class in range
      const relevantRecords = safeAttendance.filter(r => 
          classStudentIds.has(r.studentId) &&
          r.date >= startDate && 
          r.date <= endDate &&
          (!selectedSubject || r.subject === selectedSubject)
      );

      // Group by Date + Period + Subject to form "Sessions" columns
      const sessionMap = new Map<string, { date: string, period?: number, subject?: string }>();

      relevantRecords.forEach(r => {
          const period = r.period || 0;
          const subject = r.subject || 'عام';
          // Key to identify a unique session column
          const key = `${r.date}_${period}_${subject}`; 
          
          if (!sessionMap.has(key)) {
              sessionMap.set(key, {
                  date: r.date,
                  period: r.period,
                  subject: r.subject
              });
          }
      });

      // Sort sessions chronologically
      return Array.from(sessionMap.values()).sort((a, b) => {
          const dateComp = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateComp !== 0) return dateComp;
          return (a.period || 0) - (b.period || 0);
      });

  }, [attendance, filteredStudents, selectedClass, startDate, endDate, selectedSubject]);

  const getStatusSymbol = (status: AttendanceStatus) => {
      switch (status) {
          case AttendanceStatus.PRESENT: return '✓';
          case AttendanceStatus.ABSENT: return 'غ';
          case AttendanceStatus.LATE: return 'ت';
          case AttendanceStatus.EXCUSED: return 'ع';
          default: return '-';
      }
  };

  const getStatusColor = (status: AttendanceStatus) => {
      switch (status) {
          case AttendanceStatus.PRESENT: return 'text-green-600 bg-green-50';
          case AttendanceStatus.ABSENT: return 'text-red-600 bg-red-50 font-bold';
          case AttendanceStatus.LATE: return 'text-yellow-600 bg-yellow-50';
          case AttendanceStatus.EXCUSED: return 'text-blue-600 bg-blue-50';
          default: return 'text-gray-400';
      }
  };

  const calculateStats = (studentId: string) => {
      let present = 0, absent = 0, late = 0;
      
      sessions.forEach(session => {
          const record = attendance.find(r => 
              r.studentId === studentId && 
              r.date === session.date && 
              (session.period ? r.period === session.period : true) &&
              (session.subject ? r.subject === session.subject : true)
          );
          if (record) {
              if (record.status === AttendanceStatus.PRESENT) present++;
              else if (record.status === AttendanceStatus.ABSENT) absent++;
              else if (record.status === AttendanceStatus.LATE) late++;
          } else {
              // Assuming if session exists but no record for student, maybe implied present or missing? 
              // Usually we only count explicit records.
          }
      });
      return { present, absent, late };
  };

  const handleExportExcel = () => {
      if (filteredStudents.length === 0) return;

      const data = filteredStudents.map((s, i) => {
          const row: any = { '#': i + 1, 'اسم الطالب': s.name };
          
          sessions.forEach(session => {
              const record = attendance.find(r => 
                  r.studentId === s.id && 
                  r.date === session.date && 
                  (session.period ? r.period === session.period : true)
              );
              const colName = `${session.date} ${session.period ? `(ح${session.period})` : ''}`;
              row[colName] = record ? (record.status === AttendanceStatus.ABSENT ? 'غائب' : record.status === AttendanceStatus.LATE ? 'تأخر' : 'حاضر') : '-';
          });

          const stats = calculateStats(s.id);
          row['غياب'] = stats.absent;
          row['تأخر'] = stats.late;
          
          return row;
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "تقرير الحضور");
      XLSX.writeFile(wb, `Monthly_Report_${selectedClass}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
      <div className="p-6 animate-fade-in h-full flex flex-col bg-gray-50">
          {/* Header Controls */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
              <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border min-w-[200px]">
                        <Filter size={16} className="text-gray-500"/>
                        <select 
                            value={selectedClass} 
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="bg-transparent w-full text-sm font-bold outline-none"
                        >
                            <option value="">-- اختر الفصل --</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                  </div>

                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
                        <span className="text-xs text-gray-500 whitespace-nowrap">من:</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none"/>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
                        <span className="text-xs text-gray-500 whitespace-nowrap">إلى:</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm font-bold outline-none"/>
                  </div>

                  <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
                        <select 
                            value={selectedSubject} 
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="bg-transparent text-sm font-bold outline-none"
                        >
                            <option value="">كل المواد</option>
                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                  </div>
              </div>

              <div className="flex gap-2">
                  <button onClick={handleExportExcel} disabled={!selectedClass} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 disabled:opacity-50">
                      <FileSpreadsheet size={16}/> تصدير Excel
                  </button>
                  <button onClick={() => window.print()} disabled={!selectedClass} className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-black disabled:opacity-50">
                      <Printer size={16}/> طباعة
                  </button>
              </div>
          </div>
          
          {selectedClass ? (
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex-1 flex flex-col print:shadow-none print:border-none print:m-0">
                  {/* Print Header */}
                  <div className="hidden print:block p-8 pb-4 text-center border-b-2 border-black mb-4">
                      <div className="flex justify-between items-start mb-4">
                          <div className="text-right">
                              <p className="font-bold">المملكة العربية السعودية</p>
                              <p className="font-bold">وزارة التعليم</p>
                              <p>{headerConfig?.schoolName}</p>
                          </div>
                          {headerConfig?.logoBase64 && <img src={headerConfig.logoBase64} alt="Logo" className="h-24 w-24 object-contain"/>}
                          <div className="text-left">
                              <p className="font-bold">تقرير الحضور والغياب</p>
                              <p>الفصل: {selectedClass}</p>
                              <p className="text-xs mt-1">{formatDualDate(new Date().toISOString())}</p>
                          </div>
                      </div>
                      <h2 className="text-xl font-black underline">كشف متابعة الحضور ({startDate} إلى {endDate})</h2>
                  </div>

                  <div className="overflow-auto flex-1 custom-scrollbar p-1">
                      <table className="w-full text-center border-collapse text-xs md:text-sm">
                          <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 z-10 print:static">
                              <tr>
                                  <th className="p-3 border w-10 sticky right-0 bg-gray-100 z-20">#</th>
                                  <th className="p-3 border w-48 sticky right-10 bg-gray-100 z-20 text-right">اسم الطالب</th>
                                  {sessions.map((session, idx) => (
                                      <th key={idx} className="p-2 border min-w-[60px] whitespace-nowrap">
                                          <div className="flex flex-col items-center">
                                              <span>{session.date.slice(5)}</span>
                                              {session.period && <span className="text-[10px] text-gray-500 font-normal">ح{session.period}</span>}
                                          </div>
                                      </th>
                                  ))}
                                  <th className="p-2 border w-16 bg-red-50 text-red-700">غياب</th>
                                  <th className="p-2 border w-16 bg-yellow-50 text-yellow-700">تأخر</th>
                              </tr>
                          </thead>
                          <tbody>
                              {filteredStudents.map((student, i) => {
                                  const stats = calculateStats(student.id);
                                  return (
                                      <tr key={student.id} className="hover:bg-gray-50 border-b print:break-inside-avoid">
                                          <td className="p-2 border bg-gray-50 sticky right-0 z-10">{i + 1}</td>
                                          <td className="p-2 border font-bold text-right sticky right-10 bg-white z-10 whitespace-nowrap">{student.name}</td>
                                          {sessions.map((session, idx) => {
                                              const record = attendance.find(r => 
                                                  r.studentId === student.id && 
                                                  r.date === session.date && 
                                                  (session.period ? r.period === session.period : true) &&
                                                  (session.subject ? r.subject === session.subject : true)
                                              );
                                              const status = record ? record.status : null;
                                              return (
                                                  <td key={idx} className={`p-1 border ${status ? getStatusColor(status) : ''}`}>
                                                      {status ? getStatusSymbol(status) : ''}
                                                  </td>
                                              );
                                          })}
                                          <td className="p-2 border font-bold bg-red-50">{stats.absent}</td>
                                          <td className="p-2 border font-bold bg-yellow-50">{stats.late}</td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>

                  <div className="hidden print:flex justify-between mt-8 px-12 text-sm font-bold">
                      <div className="text-center">
                          <p>المعلم/ة</p>
                          <p className="mt-4">{headerConfig?.teacherName || '....................'}</p>
                      </div>
                      <div className="text-center">
                          <p>مدير/ة المدرسة</p>
                          <p className="mt-4">{headerConfig?.schoolManager || '....................'}</p>
                      </div>
                  </div>
              </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl bg-white">
                <Calendar size={64} className="mb-4 opacity-20"/>
                <p className="text-xl font-bold">الرجاء اختيار الفصل لعرض السجل</p>
            </div>
          )}
      </div>
  );
};

export default MonthlyReport;
