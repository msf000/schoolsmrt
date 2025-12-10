
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, ReportHeaderConfig, PerformanceRecord, AcademicTerm, Subject, SystemUser } from '../types';
import { Calendar, Printer, Filter, Download, ListFilter, AlertTriangle, BookOpen, AlertCircle, Loader2, TrendingUp, Smile, Frown, Users, UserCheck, Star, Sparkles, BrainCircuit } from 'lucide-react';
import { getReportHeaderConfig, getSubjects, getAcademicTerms } from '../services/storageService';
import { generateClassReport } from '../services/geminiService';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';

interface MonthlyReportProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
}

const MonthlyReport: React.FC<MonthlyReportProps> = ({ students, attendance, performance, currentUser }) => {
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Terms State
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // AI State
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
      setHeaderConfig(getReportHeaderConfig(currentUser?.id));
      setSubjects(getSubjects(currentUser?.id));
      setTerms(getAcademicTerms(currentUser?.id));
  }, [currentUser]);

  const handleTermChange = (termId: string) => {
      setSelectedTermId(termId);
      const term = terms.find(t => t.id === termId);
      if (term) {
          setStartDate(term.startDate);
          setEndDate(term.endDate);
      }
  };

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
              return { status: 'CRITICAL', text: 'محروم', color: 'text-red-700 bg-red-100 font-bold' };
          }
          if (absentPercentage >= 15) {
              return { status: 'WARNING_HIGH', text: 'إنذار', color: 'text-red-600 bg-red-50 font-bold' };
          }
      }

      // 2. Academic Risks
      if (academic.count > 0 && academic.average < 50) {
          return { status: 'ACADEMIC_RISK', text: 'تعثر', color: 'text-orange-700 bg-orange-100 font-bold' };
      }

      // 3. Behavior Risks
      if (stats.negativeBehaviors >= 3) {
          return { status: 'BEHAVIOR', text: 'سلوك', color: 'text-purple-600 bg-purple-50 font-bold' };
      }

      return { status: 'NORMAL', text: 'منتظم', color: 'text-gray-500' };
  };

  // --- COLUMN TOTALS (Footer) ---
  const sessionTotals = useMemo(() => {
      return sessions.map(session => {
          let presentCount = 0;
          let absentCount = 0;
          filteredStudents.forEach(student => {
              const rec = getStudentStatusForSession(student.id, session);
              if (rec?.status === AttendanceStatus.PRESENT) presentCount++;
              else if (rec?.status === AttendanceStatus.ABSENT) absentCount++;
          });
          return { present: presentCount, absent: absentCount };
      });
  }, [sessions, filteredStudents, attendance]);

  // --- CLASS SUMMARY (New) ---
  const classSummary = useMemo(() => {
      if (filteredStudents.length === 0 || sessions.length === 0) return null;
      
      let totalPresent = 0;
      let totalPossible = filteredStudents.length * sessions.length;
      let totalScoreSum = 0;
      let scoreCount = 0;
      let topStudentName = '';
      let maxAvg = -1;

      filteredStudents.forEach(s => {
          const stats = calculateStats(s.id);
          const academic = calculateAcademicStats(s.id);
          totalPresent += stats.present;
          
          if (academic.count > 0) {
              totalScoreSum += academic.average;
              scoreCount++;
              if (academic.average > maxAvg) {
                  maxAvg = academic.average;
                  topStudentName = s.name;
              }
          }
      });

      const attendanceRate = Math.round((totalPresent / totalPossible) * 100);
      const classAvg = scoreCount > 0 ? Math.round(totalScoreSum / scoreCount) : 0;

      return { attendanceRate, classAvg, topStudentName };
  }, [filteredStudents, sessions, attendance, performance]);

  const setRange = (type: 'WEEK' | 'MONTH' | 'SEMESTER') => {
      const end = new Date();
      const start = new Date();
      if (type === 'WEEK') start.setDate(end.getDate() - 7);
      else if (type === 'MONTH') start.setDate(1); 
      else if (type === 'SEMESTER') start.setMonth(start.getMonth() - 4);
      setEndDate(end.toISOString().split('T')[0]);
      setStartDate(start.toISOString().split('T')[0]);
      setSelectedTermId(''); // Reset term selection
  };

  const handleAIAnalysis = async () => {
        if (!classSummary || !selectedClass) return;
        setLoadingAI(true);
        setAiSummary('');
        
        try {
            // Find selected term name
            const activeTerm = terms.find(t => t.id === selectedTermId);
            const termName = activeTerm ? activeTerm.name : (headerConfig.term || 'الفترة الحالية');

            const summary = await generateClassReport(
                selectedClass, 
                termName,
                {
                    attendanceRate: classSummary.attendanceRate,
                    avgScore: classSummary.classAvg,
                    topStudent: classSummary.topStudentName,
                    totalStudents: filteredStudents.length
                }
            );
            setAiSummary(summary);
        } catch (e) {
            setAiSummary('تعذر إنشاء التقرير. تأكد من الاتصال بالإنترنت.');
        } finally {
            setLoadingAI(false);
        }
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
                <p className="text-sm text-gray-500">تقرير الحضور والسلوك والأداء الأكاديمي.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setRange('WEEK')} className="px-3 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:shadow rounded transition-all">أسبوع</button>
                    <button onClick={() => setRange('MONTH')} className="px-3 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:shadow rounded transition-all">شهر</button>
                    <select 
                        className="px-2 py-1 text-xs font-bold text-gray-600 hover:bg-white hover:shadow rounded transition-all bg-transparent outline-none"
                        value={selectedTermId}
                        onChange={(e) => handleTermChange(e.target.value)}
                    >
                        <option value="">فترة مخصصة</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
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
                        onChange={(e) => { setSelectedClass(e.target.value); setAiSummary(''); }}
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
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                </div>

                {selectedClass && (
                    <button 
                        onClick={handleAIAnalysis} 
                        disabled={loadingAI}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:opacity-90 disabled:opacity-50 shadow-md"
                    >
                        {loadingAI ? <Loader2 className="animate-spin" size={14}/> : <BrainCircuit size={14}/>} تحليل AI
                    </button>
                )}

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

                    {/* AI SUMMARY BOX */}
                    {aiSummary && (
                        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4 print:bg-white print:border-black">
                            <h3 className="font-bold text-purple-800 flex items-center gap-2 mb-2 print:text-black">
                                <Sparkles size={16} className="text-purple-600 print:hidden"/> تحليل الأداء الذكي
                            </h3>
                            <div className="prose prose-sm prose-purple max-w-none text-gray-700 print:text-black leading-relaxed">
                                <ReactMarkdown>{aiSummary}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* NEW: Class Performance Summary (Cards) */}
                    {classSummary && (
                        <div className="grid grid-cols-3 gap-4 mt-6 print:hidden">
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Users size={20}/></div>
                                <div>
                                    <p className="text-xs text-blue-500 font-bold">نسبة الحضور العامة</p>
                                    <p className="text-xl font-black text-blue-800">{classSummary.attendanceRate}%</p>
                                </div>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg flex items-center gap-3">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-full"><TrendingUp size={20}/></div>
                                <div>
                                    <p className="text-xs text-purple-500 font-bold">متوسط التحصيل</p>
                                    <p className="text-xl font-black text-purple-800">{classSummary.classAvg}%</p>
                                </div>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-center gap-3">
                                <div className="p-2 bg-yellow-100 text-yellow-600 rounded-full"><Star size={20}/></div>
                                <div>
                                    <p className="text-xs text-yellow-600 font-bold">نجم الفصل</p>
                                    <p className="text-sm font-black text-yellow-800 line-clamp-1">{classSummary.topStudentName || '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-center border-collapse text-xs md:text-sm">
                        <thead className="bg-gray-100 text-gray-800 sticky top-0 z-10 shadow-sm border-b-2 border-gray-400">
                            <tr>
                                <th className="p-2 border border-gray-400 min-w-[200px] sticky right-0 z-20 bg-gray-100">اسم الطالب</th>
                                <th className="p-2 border border-gray-400 min-w-[80px]">الحالة</th>
                                <th className="p-2 border border-gray-400 min-w-[60px]">الأداء</th>
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

                                            // Behavior Indicator Override (Small Dot)
                                            let behaviorIcon = null;
                                            if (record?.behaviorStatus === BehaviorStatus.POSITIVE) {
                                                behaviorIcon = <div className="absolute top-0 right-0 text-[8px]"><Smile size={10} className="text-green-500 fill-green-100"/></div>;
                                            } else if (record?.behaviorStatus === BehaviorStatus.NEGATIVE) {
                                                behaviorIcon = <div className="absolute top-0 right-0 text-[8px]"><Frown size={10} className="text-red-500 fill-red-100"/></div>;
                                            }

                                            return (
                                                <td key={sIdx} className={`border border-gray-300 p-0 relative h-8 ${bgClass}`}>
                                                    {behaviorIcon}
                                                    <div className="flex items-center justify-center h-full w-full">
                                                        {content}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="border border-gray-300 font-bold bg-gray-50">{stats.present}</td>
                                        <td className={`border border-gray-300 font-bold ${stats.absent > 0 ? 'text-red-600' : ''}`}>{stats.absent}</td>
                                        <td className={`border border-gray-300 font-bold ${stats.late > 0 ? 'text-yellow-600' : ''}`}>{stats.late}</td>
                                    </tr>
                                );
                            })}
                            
                            {/* Daily Summary Row */}
                            <tr className="bg-gray-800 text-white font-bold text-[10px]">
                                <td colSpan={3} className="p-2 border border-gray-600 text-left pl-4">المجموع اليومي (حضور/غياب)</td>
                                {sessionTotals.map((t, idx) => (
                                    <td key={idx} className="p-1 border border-gray-600">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-green-300">{t.present}</span>
                                            <span className="text-red-300 border-t border-gray-600">{t.absent}</span>
                                        </div>
                                    </td>
                                ))}
                                <td colSpan={3} className="bg-gray-900 border border-gray-600"></td>
                            </tr>
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
