
// ... existing imports
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, ReportHeaderConfig, PerformanceRecord, AcademicTerm, Subject, SystemUser } from '../types';
import { Calendar, Printer, Filter, Download, ListFilter, BookOpen, Loader2, TrendingUp, Smile, Frown, Users, Star, Sparkles, BrainCircuit } from 'lucide-react';
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

const MonthlyReport: React.FC<MonthlyReportProps> = ({ students = [], attendance = [], performance = [], currentUser }) => {
  // Safety check
  if (!students) {
      return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32}/></div>;
  }

  // ... (State initialization same as before) ...
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
  const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig>({ schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '', logoBase64: '', signatureBase64: '' });
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
      setHeaderConfig(getReportHeaderConfig(currentUser?.id));
      setSubjects(getSubjects(currentUser?.id));
      setTerms(getAcademicTerms(currentUser?.id));
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

      const relevantRecords = safeAttendance.filter(r => 
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

  // ... (Rest of logic: getStudentStatusForSession, calculateStats, getStudentRisk, etc. - mostly safe if data is filtered correctly)
  // Just ensuring attendance usage is safe inside helper functions too.
  const getStudentStatusForSession = (studentId: string, session: { date: string, period?: number, subject?: string }) => {
      const safeAtt = attendance || [];
      return safeAtt.find(r => 
          r.studentId === studentId && 
          r.date === session.date && 
          (session.period ? r.period === session.period : true) &&
          (session.subject ? r.subject === session.subject : true)
      );
  };

  // ... (Render component)
  return (
      <div className="p-6 animate-fade-in h-full flex flex-col bg-gray-50">
          {/* ... Header Controls ... */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
              {/* ... */}
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
                {/* ... */}
          </div>
          
          {selectedClass ? (
              // ... Report Table ...
              <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex-1 flex flex-col print:shadow-none print:border-none print:m-0">
                  {/* ... Header ... */}
                  <div className="overflow-auto flex-1 custom-scrollbar">
                      <table className="w-full text-center border-collapse text-xs md:text-sm">
                          {/* ... */}
                      </table>
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
