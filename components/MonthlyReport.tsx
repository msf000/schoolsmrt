
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, ReportHeaderConfig, PerformanceRecord } from '../types';
import { Calendar, Printer, Filter, Download, ListFilter, AlertTriangle, BookOpen, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { getReportHeaderConfig, getSubjects } from '../services/storageService';
import * as XLSX from 'xlsx';

interface MonthlyReportProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ students, attendance, performance }) => {
  // Safety check
  if (!students || !attendance || !performance) {
      return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32}/></div>;
  }

  // Date Range State
  const [startDate, setStartDate] = useState(() => {
      const d = new Date();
      d.setDate(1); // Start of current month
      return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
      const d = new Date(); // Today
      return d.toISOString().split('T')[0];
  });
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig>({ schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '', logoBase64: '' });
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
      setHeaderConfig(getReportHeaderConfig());
      setSubjects(getSubjects().map(s => s.name));
  }, []);

  // Extract unique classes
  const uniqueClasses = useMemo(() => {
      const classes = new Set<string>();
      students.forEach(s => { if (s.className) classes.add(s.className); });
      return Array.from(classes).sort();
  }, [students]);

  // Filter Students
  const filteredStudents = useMemo(() => {
      if (!selectedClass) return [];
      return students.filter(s => s.className === selectedClass).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass]);

  // --- CORE LOGIC: Find actual sessions recorded ---
  const sessions = useMemo(() => {
      if (!selectedClass || !startDate || !endDate) return [];

      const classStudentIds = new Set(filteredStudents.map(s => s.id));

      const relevantRecords = attendance.filter(r => 
          classStudentIds.has(r.studentId) &&
          r.date >= startDate && 
          r.date <= endDate &&
          (!selectedSubject || r.subject === selectedSubject)
      );

      const sessionMap = new Map<string, { date: string, period?: number, subject?: string }>();

      relevantRecords.forEach(r => {
          const period = r.period || 0;
          const key = `${r.date}_${period}_${r.subject}`; 
          
          if (!sessionMap.has(key)) {
              sessionMap.set(key, {
                  date: r.date,
                  period: r.period,
                  subject: r.subject
              });
          }
      });

      return Array.from(sessionMap.values()).sort((a, b) => {
          const dateComp = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateComp !== 0) return dateComp;
          return (a.period || 0) - (b.period || 0);
      });

  }, [attendance, filteredStudents, selectedClass, startDate, endDate, selectedSubject]);

  // Helper to find specific status
  const getStudentStatusForSession = (studentId: string, session: { date: string, period?: number, subject?: string }) => {
      const record = attendance.find(r => 
          r.studentId === studentId && 
          r.date === session.date && 
          (session.period ? r.period === session.period : true) &&
          (session.subject ? r.subject === session.subject : true)
      );
      return record;
  };

  const calculateStats = (studentId: string) => {
      let present = 0, absent = 0, late = 0, excused = 0;
      let negativeBehaviors = 0;

      sessions.forEach(session => {
          const record = getStudentStatusForSession(studentId, session);
          if (record) {
              if (record.status === AttendanceStatus.PRESENT) present++;
              if (record.status === AttendanceStatus.ABSENT) absent++;
              if (record.status === AttendanceStatus.LATE) late++;
              if (record.status === AttendanceStatus.EXCUSED) excused++;
              
              if (record.behaviorStatus === BehaviorStatus.NEGATIVE) negativeBehaviors++;
          }
      });
      return { present, absent, late, excused, negativeBehaviors };
  };

  // --- ACADEMIC STATS ---
  const calculateAcademicStats = (studentId: string) => {
      const studentPerf = performance.filter(p => 
          p.studentId === studentId &&
          p.date >= startDate &&
          p.date <= endDate &&
          (!selectedSubject || p.subject === selectedSubject)
      );

      if (studentPerf.length === 0) return { average: 0, count: 0 };

      const totalScore = studentPerf.reduce((sum, p) => sum + (p.score / p.maxScore), 0);
      const average = Math.round((totalScore / studentPerf.length) * 100);
      
      return { average, count: studentPerf.length };
  };

  // --- RISK ANALYSIS LOGIC ---
  const getStudentRisk = (studentId: string) => {
      const stats = calculateStats(studentId);
      const academic = calculateAcademicStats(studentId);
      const totalSessions = sessions.length;
      
      // 1. Attendance Risks
      if (totalSessions > 0) {
          const absentPercentage = (stats.absent / totalSessions) * 100;
          if (absentPercentage >= 25) {
              return { status: 'CRITICAL', text: 'محروم (غياب)', color: 'text-red-700 bg-red-100 font-bold' };
          }
          if (absentPercentage >= 15) {
              return { status: 'WARNING_HIGH', text: 'إنذار غياب', color: 'text-red-600 bg-red-50 font-bold' };
          }
      }

      // 2. Academic Risks
      if (academic.count > 0 && academic.average < 50) {
          return { status: 'ACADEMIC_RISK', text: 'تعثر دراسي', color: 'text-orange-700 bg-orange-100 font-bold' };
      }

      // 3. Behavior Risks
      if (stats.negativeBehaviors >= 3) {
          return { status: 'BEHAVIOR', text: 'متابعة سلوكية', color: 'text-purple-600 bg-purple-50 font-bold' };
      }

      return { status: 'NORMAL', text: 'منتظم', color: 'text-gray-500' };
  };

  const setRange = (type: 'WEEK' | 'MONTH' | 'SEMESTER') => {
      const end = new Date();
      const start = new Date();
      if (type === 'WEEK') start.setDate(end.getDate() - 7);
      else if (type === 'MONTH') start.setDate(1); 
      else if (type === 'SEMESTER') start.setMonth(start.getMonth() - 4);
      setEndDate(end.toISOString().split('T')[0]);
      setStartDate(start.toISOString().split('T')[0]);
  };

  const handlePrint = () => window.print();

  const handleExportExcel = () => {
      if (!selectedClass) return;
      
      const header = [
          'اسم الطالب',
          'الحالة / التقييم',
          'المعدل الأكاديمي',
          ...sessions.map(s => `${s.date} ${s.period ? `(ح${s.period})` : ''} - ${s.subject || ''}`),
          'حاضر', 'غائب', 'متأخر', 'عذر'
      ];

      const rows = filteredStudents.map(s => {
          const stats = calculateStats(s.id);
          const academic = calculateAcademicStats(s.id);
          const risk = getStudentRisk(s.id);
          
          const sessionStatuses = sessions.map(session => {
              const rec = getStudentStatusForSession(s.id, session);
              if (!rec) return '-';
              if (rec.status === AttendanceStatus.PRESENT) return 'حاضر';
              if (rec.status === AttendanceStatus.ABSENT) return 'غائب';
              if (rec.status === AttendanceStatus.LATE) return 'متأخر';
              if (rec.status === AttendanceStatus.EXCUSED) return 'عذر';
              return '-';
          });

          return [
              s.name,
              risk.text,
              academic.count > 0 ? `${academic.average}%` : '-',
              ...sessionStatuses,
              stats.present,
              stats.absent,
              stats.late,
              stats.excused
          ];
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "سجل المتابعة");
      XLSX.writeFile(wb, `Report_${selectedClass}_${selectedSubject || 'All'}.xlsx`);
  };

  return (
    <div className="p-6 animate-fade-in h-full flex flex-col bg-gray-50">
        
        {/* Controls Header */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
            <div>
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <ListFilter className="text-primary"/> سجل متابعة الطلاب (شامل)
                </h2>
                <p className="text-sm text-gray-500">تقرير الحضور والأداء الأكاديمي للفترات المحددة.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setRange('WEEK')} className="px-3 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:shadow rounded transition-all">أسبوع</button>
                    <button onClick={() => setRange('MONTH')} className="px-3 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:shadow rounded transition-all">شهر</button>
                    <button onClick={() => setRange('SEMESTER')} className="px-3 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:shadow rounded transition-all">فصل</button>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border">
                    <span className="text-xs font-bold text-gray-500">من:</span>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent text-xs font-bold outline-none w-24"/>
                    <span className="text-gray-300">|</span>
                    <span className="text-xs font-bold text-gray-500">إلى:</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent text-xs font-bold outline-none w-24"/>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border min-w-[150px]">
                    <Filter size={16} className="text-gray-500"/>
                    <select 
                        value={selectedClass} 
                        onChange={(e) => { setSelectedClass(e.target.value); }}
                        className="bg-transparent w-full text-sm font-bold outline-none"
                    >
                        <option value="">-- اختر الفصل --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border min-w-[150px]">
                    <BookOpen size={16} className="text-gray-500"/>
                    <select 
                        value={selectedSubject} 
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="bg-transparent w-full text-sm font-bold outline-none"
                    >
                        <option value="">-- جميع المواد --</option>
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <button onClick={handleExportExcel} disabled={!selectedClass} className="bg-green-600 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-green-700 disabled:opacity-50">
                    <Download size={14}/> إكسل
                </button>
                <button onClick={handlePrint} disabled={!selectedClass} className="bg-gray-800 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-black disabled:opacity-50">
                    <Printer size={14}/> طباعة
                </button>
            </div>
        </div>

        {/* Report Content */}
        {selectedClass ? (
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex-1 flex flex-col print:shadow-none print:border-none print:m-0">
                
                {/* Official Ministry Report Header */}
                <div className="p-6 border-b-2 border-gray-800 bg-white">
                    <div className="flex justify-between items-center h-28">
                        {/* Right: Ministry Info */}
                        <div className="text-right text-xs md:text-sm font-bold leading-loose w-1/3">
                            <p>المملكة العربية السعودية</p>
                            <p>وزارة التعليم</p>
                            <p>إدارة التعليم بـ{headerConfig.educationAdmin ? headerConfig.educationAdmin : '.........'}</p>
                            <p>مدرسة {headerConfig.schoolName ? headerConfig.schoolName : '.........'}</p>
                        </div>

                        {/* Center: Logo & Title */}
                        <div className="text-center flex-1 flex flex-col items-center justify-center">
                            {headerConfig.logoBase64 ? (
                                <img src={headerConfig.logoBase64} alt="شعار المدرسة" className="h-20 object-contain mb-2" />
                            ) : (
                                <div className="w-20 h-20 bg-gray-100 rounded-full mb-2 flex items-center justify-center border text-[8px] text-gray-400">
                                    شعار
                                </div>
                            )}
                            <h1 className="font-black text-xl text-gray-900 mt-2">كشف متابعة الأداء والحضور</h1>
                        </div>

                        {/* Left: Metadata */}
                        <div className="text-left text-xs md:text-sm font-bold leading-loose w-1/3 flex flex-col items-end">
                            <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                            <p>العام الدراسي: {headerConfig.academicYear || '1447هـ'}</p>
                            <p>{headerConfig.term || 'الفصل الدراسي ....'}</p>
                        </div>
                    </div>
                    
                    {/* Sub-Header: Class, Subject, Teacher */}
                    <div className="mt-6 grid grid-cols-3 gap-0 border border-gray-800 text-center text-sm font-bold bg-gray-50">
                        <div className="p-2 border-l border-gray-800">
                            المعلم: <span className="font-normal mr-2">{headerConfig.teacherName || '..................'}</span>
                        </div>
                        <div className="p-2 border-l border-gray-800">
                            المادة: <span className="font-normal mr-2">{selectedSubject || 'شامل المواد'}</span>
                        </div>
                        <div className="p-2">
                            الفصل: <span className="font-normal mr-2">{selectedClass}</span>
                        </div>
                    </div>
                </div>
                
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-center border-collapse text-xs md:text-sm">
                        <thead className="bg-gray-100 text-gray-800 sticky top-0 z-10 shadow-sm border-b-2 border-gray-400">
                            <tr>
                                <th className="p-2 border border-gray-400 min-w-[200px] sticky right-0 z-20 bg-gray-100">اسم الطالب</th>
                                <th className="p-2 border border-gray-400 min-w-[120px]">التقييم العام</th>
                                <th className="p-2 border border-gray-400 min-w-[100px]">المعدل الأكاديمي</th>
                                {sessions.map((s, idx) => (
                                    <th key={idx} className="p-1 border border-gray-400 min-w-[30px] vertical-text">
                                        <div className="flex flex-col items-center justify-center py-2 h-24 w-6">
                                            <span className="whitespace-nowrap transform -rotate-90 text-[10px] text-gray-600 font-mono mb-2">{s.date.slice(5)}</span>
                                            <span className="font-bold text-[10px] mb-2">{s.period ? `حـ${s.period}` : '-'}</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="p-1 border border-gray-400 bg-gray-200 min-w-[30px]">ح</th>
                                <th className="p-1 border border-gray-400 bg-gray-200 min-w-[30px]">غ</th>
                                <th className="p-1 border border-gray-400 bg-gray-200 min-w-[30px]">ت</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.map((student, idx) => {
                                const stats = calculateStats(student.id);
                                const academic = calculateAcademicStats(student.id);
                                const risk = getStudentRisk(student.id);
                                
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 text-xs border-b border-gray-300">
                                        <td className={`p-2 border border-gray-300 text-right font-bold sticky right-0 z-10 whitespace-nowrap bg-white`}>
                                            <div className="flex items-center gap-2">
                                                <span>{idx + 1}. {student.name}</span>
                                                {risk.status === 'CRITICAL' && <AlertCircle size={14} className="text-red-600"/>}
                                            </div>
                                        </td>
                                        
                                        <td className="p-2 border border-gray-300 font-bold text-[10px]">
                                            <span className={`${risk.status !== 'NORMAL' ? 'bg-gray-100 px-2 py-1 rounded' : 'text-gray-300'}`}>
                                                {risk.text}
                                            </span>
                                        </td>

                                        <td className="p-2 border border-gray-300 font-mono text-center">
                                            {academic.count > 0 ? (
                                                <span className={`font-bold ${academic.average >= 85 ? 'text-green-600' : academic.average >= 65 ? 'text-blue-600' : academic.average >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
                                                    {academic.average}%
                                                </span>
                                            ) : <span className="text-gray-300">-</span>}
                                        </td>

                                        {sessions.map((session, sIdx) => {
                                            const record = getStudentStatusForSession(student.id, session);
                                            let content = <span className="text-gray-200">-</span>;
                                            let bgClass = '';

                                            if (record?.status === AttendanceStatus.PRESENT) {
                                                content = <span className="text-green-600 font-bold text-[10px]">✓</span>;
                                            } else if (record?.status === AttendanceStatus.ABSENT) {
                                                content = <span className="text-red-600 font-bold text-[10px]">غ</span>;
                                                bgClass = 'bg-red-50';
                                            } else if (record?.status === AttendanceStatus.LATE) {
                                                content = <span className="text-yellow-600 font-bold text-[10px]">ت</span>;
                                                bgClass = 'bg-yellow-50';
                                            } else if (record?.status === AttendanceStatus.EXCUSED) {
                                                content = <span className="text-blue-600 font-bold text-[10px]">ع</span>;
                                                bgClass = 'bg-blue-50';
                                            }

                                            return <td key={sIdx} className={`border border-gray-300 p-0 ${bgClass}`}>{content}</td>;
                                        })}
                                        <td className="border border-gray-300 font-bold bg-gray-50">{stats.present}</td>
                                        <td className={`border border-gray-300 font-bold ${stats.absent > 0 ? 'text-red-600' : ''}`}>{stats.absent}</td>
                                        <td className={`border border-gray-300 font-bold ${stats.late > 0 ? 'text-yellow-600' : ''}`}>{stats.late}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                
                {/* Footer Signature */}
                <div className="p-8 bg-white border-t flex justify-between text-sm font-bold mt-4 print:mt-8 print:break-inside-avoid">
                    <div className="text-center">
                        <p className="mb-12">معلم المادة</p>
                        <p>{headerConfig.teacherName || '..................'}</p>
                    </div>
                    <div className="text-center">
                        <p className="mb-12">مدير المدرسة</p>
                        <p>{headerConfig.schoolManager || '..................'}</p>
                    </div>
                </div>

                {filteredStudents.length === 0 && (
                    <div className="p-8 text-center text-gray-400">لا يوجد طلاب في هذا الفصل</div>
                )}
                
                {filteredStudents.length > 0 && sessions.length === 0 && (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                        <ListFilter size={48} className="text-gray-200 mb-2"/>
                        <p className="text-gray-500 font-bold">لم يتم العثور على أي حصص مسجلة لهذا الفصل في الفترة المحددة.</p>
                    </div>
                )}
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
