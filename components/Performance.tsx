
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, SystemUser, AcademicTerm } from '../types';
import { formatDualDate } from '../services/dateService';
import { getAcademicTerms } from '../services/storageService';
import { PlusCircle, FileText, Check, FileSpreadsheet, Filter, History, Search, Download, Trash2, Printer, X, Loader2, Users, Save, Zap, BarChart2, PieChart as PieChartIcon, AlertCircle } from 'lucide-react';
import DataImport from './DataImport';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface PerformanceProps {
  students: Student[];
  performance: PerformanceRecord[];
  onAddPerformance: (record: PerformanceRecord | PerformanceRecord[]) => void;
  onImportPerformance: (records: PerformanceRecord[]) => void;
  onDeletePerformance: (id: string) => void;
  currentUser?: SystemUser | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Performance: React.FC<PerformanceProps> = ({ students, performance, onAddPerformance, onImportPerformance, onDeletePerformance, currentUser }) => {
  // Safety Check
  if (!students || !performance) {
      return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  }

  const [activeTab, setActiveTab] = useState<'ENTRY' | 'BULK' | 'LOG' | 'ANALYTICS'>('BULK');

  // Single Entry State
  const [studentId, setStudentId] = useState('');
  
  // Shared/Bulk State
  const [subject, setSubject] = useState('رياضيات');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('10');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<PerformanceCategory>('HOMEWORK');
  
  // Bulk Specific State
  const [bulkScores, setBulkScores] = useState<Record<string, string>>({});
  const [bulkGrade, setBulkGrade] = useState('');
  const [bulkClass, setBulkClass] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filter State for Log/Entry
  const [entryGrade, setEntryGrade] = useState('');
  const [entryClass, setEntryClass] = useState('');

  const [logSearch, setLogSearch] = useState('');
  const [logClass, setLogClass] = useState('');
  const [logSubject, setLogSubject] = useState('');
  const [logDateStart, setLogDateStart] = useState('');
  const [logDateEnd, setLogDateEnd] = useState('');
  
  // Term Filtering
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // Analytics State
  const [analyticsSubject, setAnalyticsSubject] = useState('');
  const [analyticsExam, setAnalyticsExam] = useState('');

  useEffect(() => {
      setTerms(getAcademicTerms());
  }, []);

  const uniqueGrades = useMemo(() => Array.from(new Set(students.map(s => s.gradeLevel).filter(Boolean))), [students]);
  
  const uniqueClasses = useMemo(() => {
      const classes = new Set<string>();
      students.forEach(s => s.className && classes.add(s.className));
      return Array.from(classes).sort();
  }, [students]);

  const uniqueSubjects = useMemo(() => {
      const subs = new Set<string>();
      performance.forEach(p => p.subject && subs.add(p.subject));
      return Array.from(subs).sort();
  }, [performance]);

  // Students for Single Entry
  const filteredStudentsEntry = useMemo(() => {
    return students.filter(student => {
        if (entryClass && student.className !== entryClass) return false;
        if (entryGrade && student.gradeLevel !== entryGrade) return false;
        return true;
    });
  }, [students, entryGrade, entryClass]);

  // Students for Bulk Entry
  const filteredStudentsBulk = useMemo(() => {
      if (!bulkClass) return [];
      return students.filter(s => s.className === bulkClass).sort((a,b) => a.name.localeCompare(b.name));
  }, [students, bulkClass]);

  // Analytics Data
  const analyticsData = useMemo(() => {
      if (!analyticsExam) return null;
      
      // Find all records for this specific exam title
      // Note: This matches by Title + Subject string. Ideally use an ID if available, but legacy data uses strings.
      const relevantRecords = performance.filter(p => p.title === analyticsExam && (!analyticsSubject || p.subject === analyticsSubject));
      
      if (relevantRecords.length === 0) return null;

      const scores = relevantRecords.map(r => ({ score: r.score, max: r.maxScore, studentId: r.studentId }));
      const totalPossible = scores[0].max; // Assume same max for all
      
      const avgScore = scores.reduce((a, b) => a + b.score, 0) / scores.length;
      const maxAchieved = Math.max(...scores.map(s => s.score));
      const minAchieved = Math.min(...scores.map(s => s.score));

      // Grade Distribution (Histogram)
      const dist = [0, 0, 0, 0, 0]; // F, D, C, B, A
      scores.forEach(s => {
          const pct = s.score / s.max;
          if (pct >= 0.9) dist[4]++;
          else if (pct >= 0.8) dist[3]++;
          else if (pct >= 0.7) dist[2]++;
          else if (pct >= 0.6) dist[1]++;
          else dist[0]++;
      });

      const chartData = [
          { name: 'ضعيف (<60%)', value: dist[0] },
          { name: 'مقبول (60-70%)', value: dist[1] },
          { name: 'جيد (70-80%)', value: dist[2] },
          { name: 'جيد جداً (80-90%)', value: dist[3] },
          { name: 'ممتاز (90%+)', value: dist[4] },
      ];

      // Top & Bottom Students
      const ranked = relevantRecords.sort((a, b) => b.score - a.score);
      const topStudents = ranked.slice(0, 5).map(r => ({ name: students.find(s => s.id === r.studentId)?.name || 'Unknown', score: r.score }));
      const lowStudents = ranked.slice(-5).reverse().filter(r => (r.score/r.maxScore) < 0.6).map(r => ({ name: students.find(s => s.id === r.studentId)?.name || 'Unknown', score: r.score }));

      return {
          avgScore, maxAchieved, minAchieved, totalPossible, chartData, topStudents, lowStudents, count: scores.length
      };
  }, [performance, analyticsExam, analyticsSubject, students]);

  useEffect(() => {
      if (filteredStudentsEntry.length > 0 && !filteredStudentsEntry.find(s => s.id === studentId)) {
          setStudentId(filteredStudentsEntry[0].id);
      }
  }, [filteredStudentsEntry, studentId]);

  const filteredHistory = useMemo(() => {
      const activeTerm = terms.find(t => t.id === selectedTermId);
      
      return performance.filter(p => {
          const student = students.find(s => s.id === p.studentId);
          if (!student) return false; 

          if (logSearch && !student.name.includes(logSearch) && !p.title.includes(logSearch)) return false;
          if (logClass && student.className !== logClass) return false;
          if (logSubject && p.subject !== logSubject) return false;
          if (logDateStart && p.date < logDateStart) return false;
          if (logDateEnd && p.date > logDateEnd) return false;
          
          if (activeTerm) {
              if (p.date < activeTerm.startDate || p.date > activeTerm.endDate) return false;
          }

          return true;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [performance, students, logSearch, logClass, logSubject, logDateStart, logDateEnd, selectedTermId, terms]);

  // --- Handlers ---

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !title || !score) return;

    const record: PerformanceRecord = {
      id: Date.now().toString(),
      studentId,
      subject,
      title,
      score: Number(score),
      maxScore: Number(maxScore),
      date: new Date().toISOString().split('T')[0],
      notes,
      category: category,
      createdById: currentUser?.id
    };

    onAddPerformance(record);
    setTitle('');
    setScore('');
    setNotes('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const handleBulkScoreChange = (sid: string, val: string) => {
      setBulkScores(prev => ({ ...prev, [sid]: val }));
  };

  const handleFillAll = () => {
      const newScores: Record<string, string> = {};
      filteredStudentsBulk.forEach(s => newScores[s.id] = maxScore);
      setBulkScores(newScores);
  };

  const handleBulkSubmit = () => {
      if (!title || !subject || !bulkClass) return alert('الرجاء تعبئة بيانات التقييم (العنوان، المادة، الفصل)');
      
      const records: PerformanceRecord[] = [];
      const today = new Date().toISOString().split('T')[0];

      filteredStudentsBulk.forEach(s => {
          const sScore = bulkScores[s.id];
          if (sScore !== undefined && sScore !== '') {
              records.push({
                  id: `${Date.now()}_${s.id}`,
                  studentId: s.id,
                  subject,
                  title,
                  category,
                  score: Number(sScore),
                  maxScore: Number(maxScore),
                  date: today,
                  notes: notes,
                  createdById: currentUser?.id
              });
          }
      });

      if (records.length === 0) return alert('الرجاء إدخال درجة واحدة على الأقل');

      onAddPerformance(records);
      setBulkScores({});
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
  };

  const handleDelete = (id: string) => {
      if(confirm('هل أنت متأكد من حذف هذا السجل؟')) {
          onDeletePerformance(id);
      }
  };

  const handleExportExcel = () => {
      if (filteredHistory.length === 0) return alert('لا توجد بيانات للتصدير');

      const dataToExport = filteredHistory.map(p => {
          const student = students.find(s => s.id === p.studentId);
          return {
              'التاريخ': p.date,
              'الطالب': student?.name || 'غير معروف',
              'الفصل': student?.className || '-',
              'المادة': p.subject,
              'عنوان التقييم': p.title,
              'الدرجة': p.score,
              'الدرجة العظمى': p.maxScore,
              'التصنيف': getCategoryLabel(p.category),
              'ملاحظات': p.notes || ''
          };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "سجل الدرجات");
      XLSX.writeFile(wb, `Grades_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
      window.print();
  };

  const getCategoryBadge = (cat?: string) => {
      switch(cat) {
          case 'ACTIVITY': return <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">نشاط</span>;
          case 'PLATFORM_EXAM': return <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[10px] font-bold">منصة</span>;
          case 'HOMEWORK': return <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold">واجب</span>;
          case 'YEAR_WORK': return <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded text-[10px] font-bold">أعمال سنة</span>;
          default: return <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">عام</span>;
      }
  }

  const getCategoryLabel = (cat?: string) => {
      switch(cat) {
          case 'ACTIVITY': return 'نشاط';
          case 'PLATFORM_EXAM': return 'منصة';
          case 'HOMEWORK': return 'واجب';
          case 'YEAR_WORK': return 'أعمال سنة';
          default: return 'عام';
      }
  }

  const recentPerformance = performance
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const distinctExamTitles = useMemo(() => Array.from(new Set(performance.map(p => p.title))), [performance]);

  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 print:hidden">
        <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm w-full md:w-auto overflow-x-auto">
            <button 
                onClick={() => setActiveTab('BULK')}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'BULK' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <Users size={18}/> رصد جماعي
            </button>
            <button 
                onClick={() => setActiveTab('ENTRY')}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ENTRY' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <PlusCircle size={18}/> رصد فردي
            </button>
            <button 
                onClick={() => setActiveTab('ANALYTICS')}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ANALYTICS' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <BarChart2 size={18}/> تحليل النتائج
            </button>
            <button 
                onClick={() => setActiveTab('LOG')}
                className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'LOG' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <History size={18}/> السجل الشامل
            </button>
        </div>

        <div className="flex gap-2">
            <button 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-white hover:bg-gray-50 text-gray-700 border px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm text-sm font-bold"
            >
                <FileSpreadsheet size={18} />
                <span className="hidden md:inline">استيراد درجات</span>
            </button>
        </div>
      </div>

      {activeTab === 'BULK' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full animate-fade-in">
              <div className="flex justify-between items-start mb-6 border-b pb-4">
                  <div>
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Users className="text-primary"/> رصد الدرجات (فصل كامل)</h3>
                      <p className="text-xs text-gray-500 mt-1">رصد درجات اختبار أو واجب لجميع طلاب الفصل دفعة واحدة.</p>
                  </div>
                  {isSuccess && <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 animate-bounce-in"><Check size={16}/> تم الحفظ بنجاح!</div>}
              </div>

              {/* Control Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="md:col-span-1">
                      <label className="block text-xs font-bold text-gray-600 mb-1">الفصل</label>
                      <select className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary/20" value={bulkClass} onChange={e => setBulkClass(e.target.value)}>
                          <option value="">-- اختر الفصل --</option>
                          {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>
                  <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">المادة</label>
                          <input className="w-full p-2 border rounded-lg bg-white" value={subject} onChange={e => setSubject(e.target.value)} placeholder="المادة"/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">عنوان التقييم</label>
                          <input className="w-full p-2 border rounded-lg bg-white" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: واجب 1"/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">التصنيف</label>
                          <select className="w-full p-2 border rounded-lg bg-white" value={category} onChange={e => setCategory(e.target.value as any)}>
                              <option value="HOMEWORK">واجب</option>
                              <option value="ACTIVITY">نشاط</option>
                              <option value="PLATFORM_EXAM">اختبار منصة</option>
                              <option value="OTHER">عام</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">الدرجة العظمى</label>
                          <input type="number" className="w-full p-2 border rounded-lg bg-white text-center font-bold" value={maxScore} onChange={e => setMaxScore(e.target.value)}/>
                      </div>
                  </div>
              </div>

              {/* Students Grid */}
              <div className="flex-1 overflow-auto border rounded-xl bg-gray-50/50">
                  {filteredStudentsBulk.length > 0 ? (
                      <table className="w-full text-right text-sm">
                          <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 shadow-sm z-10">
                              <tr>
                                  <th className="p-3 w-12 text-center">#</th>
                                  <th className="p-3">اسم الطالب</th>
                                  <th className="p-3 w-40 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                          <span>الدرجة</span>
                                          <button onClick={handleFillAll} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-200 flex items-center gap-1" title="رصد الدرجة الكاملة للجميع">
                                              <Zap size={10}/> الكل
                                          </button>
                                      </div>
                                  </th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                              {filteredStudentsBulk.map((student, idx) => (
                                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="p-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                                      <td className="p-3 font-bold text-gray-800">{student.name}</td>
                                      <td className="p-2 text-center">
                                          <input 
                                              type="number" 
                                              className={`w-20 p-2 border rounded text-center outline-none focus:ring-2 focus:ring-primary ${bulkScores[student.id] ? 'bg-blue-50 font-bold text-blue-700 border-blue-200' : 'bg-gray-50'}`}
                                              placeholder="-"
                                              value={bulkScores[student.id] || ''}
                                              onChange={(e) => handleBulkScoreChange(student.id, e.target.value)}
                                              onKeyDown={(e) => {
                                                  // Optional: focus next input on enter
                                              }}
                                          />
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                          <Users size={48} className="mb-4 opacity-20"/>
                          <p>الرجاء اختيار الفصل لعرض القائمة</p>
                      </div>
                  )}
              </div>

              {/* Footer Actions */}
              <div className="mt-4 pt-4 border-t flex justify-end gap-3">
                  <button onClick={handleBulkSubmit} disabled={filteredStudentsBulk.length === 0} className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-teal-800 shadow-lg flex items-center gap-2 disabled:opacity-50 transition-transform hover:scale-105">
                      <Save size={18}/> حفظ الدرجات
                  </button>
              </div>
          </div>
      )}

      {activeTab === 'ENTRY' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-700">إضافة درجة لطالب واحد</h3>
                    <div className="flex items-center gap-2">
                        <select className="text-[10px] bg-gray-50 border rounded px-1 outline-none" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                            <option value="">الفترة الحالية</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded">
                            التاريخ: {formatDualDate(new Date())}
                        </span>
                    </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg mb-4 grid grid-cols-2 gap-2 border border-gray-200">
                    <div className="col-span-2 text-xs font-bold text-gray-500 flex items-center gap-1 mb-1">
                        <Filter size={12}/> تصفية القائمة
                    </div>
                    <select className="p-1 border rounded text-xs outline-none" value={entryGrade} onChange={e => {setEntryGrade(e.target.value); setEntryClass('');}}>
                        <option value="">الصف: الكل</option>
                        {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select className="p-1 border rounded text-xs outline-none" value={entryClass} onChange={e => setEntryClass(e.target.value)}>
                        <option value="">الفصل: الكل</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <form onSubmit={handleSingleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اختر الطالب ({filteredStudentsEntry.length})</label>
                    <select 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none bg-white"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    >
                    {filteredStudentsEntry.length > 0 ? filteredStudentsEntry.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.className})</option>
                    )) : <option value="">لا يوجد طلاب مطابقين للفلترة</option>}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المادة</label>
                    <input 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="مثال: رياضيات"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تصنيف التقييم</label>
                    <select 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none bg-white"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as PerformanceCategory)}
                    >
                        <option value="HOMEWORK">واجب</option>
                        <option value="ACTIVITY">نشاط</option>
                        <option value="PLATFORM_EXAM">اختبار منصة</option>
                        <option value="OTHER">عام / مشاركة</option>
                    </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">عنوان التقييم</label>
                    <input 
                        type="text" 
                        placeholder="مثال: اختبار الوحدة الأولى"
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الدرجة (من {maxScore})</label>
                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            className="w-2/3 p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none font-bold text-center"
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            required
                        />
                        <input 
                            type="number" 
                            className="w-1/3 p-2 border rounded-lg text-center bg-gray-50 text-gray-500 text-xs"
                            value={maxScore}
                            onChange={(e) => setMaxScore(e.target.value)}
                            placeholder="العظمى"
                        />
                    </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                    <textarea 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none h-20 resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={!studentId}
                    className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex justify-center items-center gap-2 disabled:bg-gray-300 shadow-md"
                >
                    {isSuccess ? <Check size={20} /> : null}
                    {isSuccess ? 'تمت الإضافة!' : 'تسجيل الدرجة'}
                </button>
                </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <FileText className="text-purple-500" />
                آخر النشاطات
                </h2>
                
                <div className="space-y-4">
                {recentPerformance.length > 0 ? recentPerformance.map(p => {
                    const student = students.find(s => s.id === p.studentId);
                    return (
                    <div key={p.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                {student?.name || 'طالب محذوف'}
                                {getCategoryBadge(p.category)}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">{p.subject} - {p.title}</p>
                        </div>
                        <div className="text-left">
                            <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold border border-blue-100">
                            {p.score} / {p.maxScore}
                            </span>
                            <p className="text-[10px] text-gray-400 mt-1 font-mono">{formatDualDate(p.date)}</p>
                        </div>
                        </div>
                    </div>
                    );
                }) : (
                    <p className="text-gray-500 text-center py-8 border-2 border-dashed rounded-lg">لا توجد سجلات حديثة.</p>
                )}
                </div>
            </div>
          </div>
      )}

      {activeTab === 'ANALYTICS' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full animate-fade-in p-6">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                  <div>
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                          <BarChart2 className="text-orange-500"/> تحليل النتائج
                      </h3>
                      <p className="text-sm text-gray-500">تحليل تفصيلي لدرجات اختبار محدد.</p>
                  </div>
                  <div className="flex gap-2">
                      <select 
                          className="p-2 border rounded-lg bg-gray-50 font-bold text-gray-700"
                          value={analyticsExam}
                          onChange={e => setAnalyticsExam(e.target.value)}
                      >
                          <option value="">-- اختر التقييم --</option>
                          {distinctExamTitles.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                  </div>
              </div>

              {analyticsData ? (
                  <div className="space-y-6 overflow-y-auto">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-center">
                              <span className="text-xs text-blue-600 font-bold block mb-1">متوسط الدرجات</span>
                              <span className="text-2xl font-black text-blue-800">{analyticsData.avgScore.toFixed(1)}</span>
                              <span className="text-xs text-gray-400">من {analyticsData.totalPossible}</span>
                          </div>
                          <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-center">
                              <span className="text-xs text-green-600 font-bold block mb-1">أعلى درجة</span>
                              <span className="text-2xl font-black text-green-800">{analyticsData.maxAchieved}</span>
                          </div>
                          <div className="p-4 bg-red-50 rounded-xl border border-red-100 text-center">
                              <span className="text-xs text-red-600 font-bold block mb-1">أدنى درجة</span>
                              <span className="text-2xl font-black text-red-800">{analyticsData.minAchieved}</span>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                              <span className="text-xs text-gray-600 font-bold block mb-1">عدد الطلاب</span>
                              <span className="text-2xl font-black text-gray-800">{analyticsData.count}</span>
                          </div>
                      </div>

                      {/* Charts */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-64">
                          <div className="bg-white border rounded-xl p-4 flex flex-col">
                              <h4 className="font-bold text-gray-700 text-sm mb-2">توزيع المستويات</h4>
                              <div className="flex-1 min-h-0">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={analyticsData.chartData}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                          <XAxis dataKey="name" tick={{fontSize: 10}} />
                                          <YAxis allowDecimals={false} />
                                          <Tooltip />
                                          <Bar dataKey="value" fill="#8884d8">
                                              {analyticsData.chartData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                              ))}
                                          </Bar>
                                      </BarChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>
                          <div className="bg-white border rounded-xl p-4 flex flex-col">
                              <h4 className="font-bold text-gray-700 text-sm mb-2">نسب التحصيل</h4>
                              <div className="flex-1 min-h-0">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <PieChart>
                                          <Pie
                                              data={analyticsData.chartData}
                                              cx="50%"
                                              cy="50%"
                                              innerRadius={40}
                                              outerRadius={80}
                                              paddingAngle={5}
                                              dataKey="value"
                                          >
                                              {analyticsData.chartData.map((entry, index) => (
                                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                              ))}
                                          </Pie>
                                          <Tooltip />
                                          <Legend verticalAlign="middle" align="right" layout="vertical" iconSize={8} wrapperStyle={{fontSize: '10px'}}/>
                                      </PieChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>
                      </div>

                      {/* Lists */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="border rounded-xl p-4 bg-green-50/30">
                              <h4 className="font-bold text-green-800 text-sm mb-3 flex items-center gap-2"><Zap size={14}/> المتفوقون (Top 5)</h4>
                              <ul className="space-y-2 text-sm">
                                  {analyticsData.topStudents.map((s, i) => (
                                      <li key={i} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                          <span className="font-bold text-gray-700">{i+1}. {s.name}</span>
                                          <span className="font-mono font-bold text-green-600">{s.score}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                          <div className="border rounded-xl p-4 bg-red-50/30">
                              <h4 className="font-bold text-red-800 text-sm mb-3 flex items-center gap-2"><AlertCircle size={14}/> بحاجة لدعم (أقل من 60%)</h4>
                              <ul className="space-y-2 text-sm">
                                  {analyticsData.lowStudents.length > 0 ? analyticsData.lowStudents.map((s, i) => (
                                      <li key={i} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                          <span className="font-bold text-gray-700">{s.name}</span>
                                          <span className="font-mono font-bold text-red-600">{s.score}</span>
                                      </li>
                                  )) : <p className="text-center text-gray-400 text-xs py-4">لا يوجد طلاب متعثرين في هذا الاختبار.</p>}
                              </ul>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      <BarChart2 size={48} className="mb-4 opacity-20"/>
                      <p>اختر تقييماً من القائمة لعرض التحليل.</p>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'LOG' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden animate-fade-in">
              <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 items-center justify-between print:hidden">
                  <div className="flex flex-wrap gap-2 text-sm items-center flex-1">
                      <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                          <Filter size={14} className="text-gray-400"/>
                          <select value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)} className="bg-transparent outline-none font-bold text-purple-700 min-w-[100px]">
                              <option value="">كل الفترات</option>
                              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                          <Filter size={14} className="text-gray-400"/>
                          <select value={logClass} onChange={e => setLogClass(e.target.value)} className="bg-transparent outline-none font-bold text-gray-700 min-w-[100px]">
                              <option value="">جميع الفصول</option>
                              {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                          <Filter size={14} className="text-gray-400"/>
                          <select value={logSubject} onChange={e => setLogSubject(e.target.value)} className="bg-transparent outline-none font-bold text-gray-700 min-w-[100px]">
                              <option value="">جميع المواد</option>
                              {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                      {!selectedTermId && (
                          <>
                            <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                                <span className="text-xs text-gray-400">من:</span>
                                <input type="date" value={logDateStart} onChange={e => setLogDateStart(e.target.value)} className="outline-none bg-transparent font-bold text-xs"/>
                            </div>
                            <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                                <span className="text-xs text-gray-400">إلى:</span>
                                <input type="date" value={logDateEnd} onChange={e => setLogDateEnd(e.target.value)} className="outline-none bg-transparent font-bold text-xs"/>
                            </div>
                          </>
                      )}
                      <div className="relative">
                          <Search size={14} className="absolute right-2 top-2 text-gray-400"/>
                          <input type="text" placeholder="بحث..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="pl-2 pr-7 py-1 border rounded-lg outline-none text-sm w-32 focus:ring-1 focus:ring-purple-300"/>
                      </div>
                  </div>
                  
                  <div className="flex gap-2">
                      <button 
                          onClick={handleExportExcel}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-xs hover:bg-green-700 transition-colors shadow-sm"
                      >
                          <Download size={14}/> إكسل
                      </button>
                      <button 
                          onClick={handlePrint}
                          className="bg-gray-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-xs hover:bg-black transition-colors shadow-sm"
                      >
                          <Printer size={14}/> طباعة
                      </button>
                  </div>
              </div>

              <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-right text-sm">
                      <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0 shadow-sm">
                          <tr>
                              <th className="p-3">التاريخ</th>
                              <th className="p-3">الطالب</th>
                              <th className="p-3">الفصل</th>
                              <th className="p-3">المادة</th>
                              <th className="p-3">عنوان التقييم</th>
                              <th className="p-3 text-center">الدرجة</th>
                              <th className="p-3 text-center">التصنيف</th>
                              <th className="p-3">ملاحظات</th>
                              <th className="p-3 w-10 text-center print:hidden">حذف</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {filteredHistory.map((p) => {
                              const student = students.find(s => s.id === p.studentId);
                              return (
                                  <tr key={p.id} className="hover:bg-gray-50">
                                      <td className="p-3 font-mono text-xs text-gray-500">{p.date}</td>
                                      <td className="p-3 font-bold text-gray-800">{student?.name}</td>
                                      <td className="p-3 text-gray-600 text-xs">{student?.className}</td>
                                      <td className="p-3 text-gray-600 text-xs">{p.subject}</td>
                                      <td className="p-3 text-gray-800 font-medium">{p.title}</td>
                                      <td className="p-3 text-center">
                                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 dir-ltr inline-block">
                                              {p.score} / {p.maxScore}
                                          </span>
                                      </td>
                                      <td className="p-3 text-center">
                                          {getCategoryBadge(p.category)}
                                      </td>
                                      <td className="p-3 text-xs text-gray-500 max-w-xs truncate" title={p.notes}>{p.notes}</td>
                                      <td className="p-3 text-center print:hidden">
                                          <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                                              <Trash2 size={16}/>
                                          </button>
                                      </td>
                                  </tr>
                              );
                          })}
                          {filteredHistory.length === 0 && (
                              <tr><td colSpan={9} className="p-12 text-center text-gray-400 font-medium">لا توجد سجلات مطابقة للفلتر</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="p-3 bg-gray-50 border-t text-xs text-gray-500 flex justify-between font-bold print:hidden">
                  <span>عدد السجلات: {filteredHistory.length}</span>
              </div>
          </div>
      )}

       {isImportModalOpen && (
          <div className="fixed inset-0 z-[100] bg-white">
              <DataImport 
                  existingStudents={students}
                  onImportStudents={() => {}} 
                  onImportPerformance={(records) => {
                      onImportPerformance(records);
                      setIsImportModalOpen(false);
                  }}
                  onImportAttendance={() => {}}
                  forcedType="PERFORMANCE"
                  onClose={() => setIsImportModalOpen(false)}
              />
          </div>
      )}
    </div>
  );
};

export default Performance;
