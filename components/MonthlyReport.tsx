
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, ReportHeaderConfig, SystemUser, PerformanceRecord } from '../types';
import { Calendar, Printer, FileSpreadsheet, ChevronRight, ChevronLeft, ShieldCheck, Download, Filter } from 'lucide-react';
import { getReportHeaderConfig } from '../services/storageService';
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
  
  useEffect(() => {
      if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
  }, [uniqueClasses, selectedClass]);

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

  return (
      <div className="flex flex-col h-full bg-white rounded-[3rem] border shadow-sm overflow-hidden animate-fade-in font-tajawal">
          {/* Dashboard Controls */}
          <div className="p-8 bg-slate-50 border-b flex flex-wrap gap-6 items-center justify-between print:hidden">
              <div className="flex items-center gap-6">
                <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">النطاق الزمني للتقرير</label>
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="p-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"/>
                        <span className="text-slate-300 font-black">إلى</span>
                        <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="p-2.5 border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"/>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">الفصل الدراسي</label>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2.5 border rounded-xl bg-white font-black text-xs min-w-[150px] shadow-sm">
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => window.print()} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl hover:bg-black transition-all">
                    <Printer size={18}/> طباعة الكشف الرسمي
                </button>
                <button className="p-3 bg-white border rounded-2xl text-slate-400 hover:text-emerald-600 transition-all shadow-sm">
                    <Download size={20}/>
                </button>
              </div>
          </div>

          <div className="flex-1 overflow-auto p-12 custom-scrollbar bg-white print:p-0">
              <div className="max-w-6xl mx-auto space-y-10">
                  {/* Official Print Header */}
                  <div className="hidden print:flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-10">
                    <div className="text-right text-xs font-black space-y-1">
                        <p>المملكة العربية السعودية</p>
                        <p>وزارة التعليم</p>
                        <p>{headerConfig?.schoolName || '.................'}</p>
                    </div>
                    <div className="text-center flex flex-col items-center">
                        <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-16 mb-4" alt="MOE"/>
                        <h1 className="text-2xl font-black text-slate-900">بيان الحضور والانضباط الشهري</h1>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{headerConfig?.academicYear || '1446-1447هـ'}</p>
                    </div>
                    <div className="text-left text-[10px] font-black space-y-1">
                        <p>الفصل: {selectedClass}</p>
                        <p>من: {startDate}</p>
                        <p>إلى: {endDate}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                      <table className="w-full text-center border-collapse border border-slate-300">
                          <thead>
                              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest h-14">
                                  <th className="border border-slate-300 p-2 w-10">م</th>
                                  <th className="border border-slate-300 p-2 text-right pr-4 w-64">اسم الطالب الكامل</th>
                                  {sessions.map((sess, idx) => (
                                      <th key={idx} className="border border-slate-300 p-1 min-w-[35px] text-[8px] vertical-text">
                                          {sess.date.split('-').slice(1).join('/')} (ح{sess.period || 0})
                                      </th>
                                  ))}
                                  <th className="border border-slate-300 p-2 w-12 bg-rose-600 text-white">غ</th>
                                  <th className="border border-slate-300 p-2 w-12 bg-amber-500 text-white">ت</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                              {filteredStudents.map((s, i) => {
                                  let abs = 0, late = 0;
                                  return (
                                      <tr key={s.id} className="h-10 border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                          <td className="border border-slate-300 text-[10px] font-bold text-slate-400">{i + 1}</td>
                                          <td className="border border-slate-300 text-right pr-4 font-black text-slate-700 text-xs">{s.name}</td>
                                          {sessions.map((sess, idx) => {
                                              const rec = attendance.find(r => r.studentId === s.id && r.date === sess.date && r.period === sess.period);
                                              if(rec?.status === AttendanceStatus.ABSENT) abs++;
                                              if(rec?.status === AttendanceStatus.LATE) late++;
                                              
                                              return (
                                                  <td key={idx} className={`border border-slate-300 font-black text-[11px] ${rec?.status === AttendanceStatus.ABSENT ? 'text-rose-600 bg-rose-50' : rec?.status === AttendanceStatus.LATE ? 'text-amber-600 bg-amber-50' : 'text-emerald-500'}`}>
                                                      {rec ? (rec.status === AttendanceStatus.PRESENT ? 'ح' : rec.status === AttendanceStatus.ABSENT ? 'غ' : 'ت') : '-'}
                                                  </td>
                                              );
                                          })}
                                          <td className="border border-slate-300 font-black text-rose-600 bg-rose-50/50">{abs || '-'}</td>
                                          <td className="border border-slate-300 font-black text-amber-600 bg-amber-50/50">{late || '-'}</td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>

                  {/* Print Footer */}
                  <div className="hidden print:flex justify-between items-end mt-20 px-10">
                      <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">توقيع المعلم المعتمد</p>
                          <p className="font-black text-slate-800 border-t-2 border-slate-900 pt-2 min-w-[150px]">{headerConfig?.teacherName || '.................'}</p>
                      </div>
                      <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">ختم المنشأة التعليمية</p>
                          <div className="w-24 h-24 border-4 border-slate-100 rounded-full mx-auto opacity-20"></div>
                      </div>
                      <div className="text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">قائد المدرسة</p>
                          <p className="font-black text-slate-800 border-t-2 border-slate-900 pt-2 min-w-[150px]">{headerConfig?.schoolManager || '.................'}</p>
                      </div>
                  </div>
              </div>
          </div>
          <style>{`.vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); }`}</style>
      </div>
  );
};

export default MonthlyReport;
