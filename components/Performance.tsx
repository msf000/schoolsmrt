import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, SystemUser, AcademicTerm, AttendanceRecord, AttendanceStatus, Assignment } from '../types';
import { formatDualDate } from '../services/dateService';
import { getAcademicTerms, getAssignments, getTeacherAssignments } from '../services/storageService';
import { PlusCircle, FileText, Check, FileSpreadsheet, Filter, History, Search, Download, Trash2, Printer, X, Loader2, Users, Save, Zap, BarChart2, PieChart as PieChartIcon, AlertCircle, Link, Eye, Edit, Cloud } from 'lucide-react';
import DataImport from './DataImport';
import AIDataImport from './AIDataImport';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface PerformanceProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance?: AttendanceRecord[]; 
  onAddPerformance: (record: PerformanceRecord | PerformanceRecord[]) => void;
  onImportPerformance: (records: PerformanceRecord[]) => void;
  onDeletePerformance: (id: string) => void;
  currentUser?: SystemUser | null;
}

const Performance: React.FC<PerformanceProps> = ({ students, performance, attendance = [], onAddPerformance, onImportPerformance, onDeletePerformance, currentUser }) => {
  const navigate = useNavigate();
  if (!students || !performance) {
      return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  }

  const isManager = currentUser?.role === 'SCHOOL_MANAGER';

  // استعادة الحالة من التخزين المحلي
  const [activeTab, setActiveTab] = useState<'ENTRY' | 'BULK' | 'LOG' | 'ANALYTICS'>(() => {
      const saved = localStorage.getItem('perf_active_tab');
      if (isManager) return 'LOG';
      return (saved as any) || 'BULK';
  });

  // Bulk Specific State
  const [bulkClass, setBulkClass] = useState(() => localStorage.getItem('perf_bulk_class') || '');
  const [logClass, setLogClass] = useState(() => localStorage.getItem('perf_log_class') || '');

  // Shared/Bulk State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [subject, setSubject] = useState('رياضيات');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('10');
  const [category, setCategory] = useState<PerformanceCategory>('HOMEWORK');
  const [bulkScores, setBulkScores] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);

  // Filter State
  const [entryClass, setEntryClass] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logSubject, setLogSubject] = useState('');
  const [logDateStart, setLogDateStart] = useState('');
  const [logDateEnd, setLogDateEnd] = useState('');
  
  // Term Filtering
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  // Analytics State
  const [analyticsSubject, setAnalyticsSubject] = useState('');
  const [analyticsExam, setAnalyticsExam] = useState('');

  // حفظ الحالة تلقائياً
  useEffect(() => {
      localStorage.setItem('perf_active_tab', activeTab);
      localStorage.setItem('perf_bulk_class', bulkClass);
      localStorage.setItem('perf_log_class', logClass);
  }, [activeTab, bulkClass, logClass]);

  useEffect(() => {
      const loadedTerms = getAcademicTerms(currentUser?.id);
      setTerms(loadedTerms);
      const current = loadedTerms.find(t => t.isCurrent);
      if (current) setSelectedTermId(current.id);
      else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);
      
      const allAssignments = getAssignments('ALL', currentUser?.id, true);
      setAssignments(allAssignments);
  }, [currentUser, activeTab]); 

  const handleAssignmentChange = (id: string) => {
      setSelectedAssignmentId(id);
      const assign = assignments.find(a => a.id === id);
      if (assign) {
          setTitle(assign.title);
          setMaxScore(assign.maxScore.toString());
          setCategory(assign.category as PerformanceCategory);
      } else {
          setTitle('');
          setMaxScore('10');
      }
  };

  const uniqueClasses = useMemo(() => {
      const classes = new Set<string>();
      students.forEach(s => s.className && classes.add(s.className));
      const manualClasses = getTeacherAssignments(currentUser?.id).map(a => a.classId);
      manualClasses.forEach(c => classes.add(c));
      return Array.from(classes).sort();
  }, [students, currentUser]);

  const filteredStudentsBulk = useMemo(() => {
      if (!bulkClass) return [];
      return students.filter(s => s.className === bulkClass).sort((a,b) => a.name.localeCompare(b.name));
  }, [students, bulkClass]);

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

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !title || !score) return;

    const record: PerformanceRecord = {
      id: editingRecordId || Date.now().toString(),
      studentId,
      subject,
      title,
      score: Number(score),
      maxScore: Number(maxScore),
      date: new Date().toISOString().split('T')[0],
      notes: selectedAssignmentId || notes,
      category: category,
      createdById: currentUser?.id
    };

    onAddPerformance(record);
    if (editingRecordId) {
        setEditingRecordId(null);
        setActiveTab('LOG');
    } else {
        setScore(''); 
        setIsSuccess(true);
        setTimeout(() => setIsSuccess(false), 3000);
    }
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
                  notes: selectedAssignmentId || notes,
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

  const handleEditRecord = (record: PerformanceRecord) => {
      setEditingRecordId(record.id);
      setStudentId(record.studentId);
      setSubject(record.subject);
      setTitle(record.title);
      setScore(record.score.toString());
      setMaxScore(record.maxScore.toString());
      setCategory(record.category as PerformanceCategory);
      setNotes(record.notes || '');
      setActiveTab('ENTRY');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 print:hidden">
        <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
            {!isManager && (
                <>
                    <button onClick={() => setActiveTab('BULK')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'BULK' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <Users size={18}/> رصد جماعي
                    </button>
                    <button onClick={() => { setActiveTab('ENTRY'); setEditingRecordId(null); setTitle(''); setScore(''); }} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ENTRY' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                        <PlusCircle size={18}/> رصد فردي
                    </button>
                </>
            )}
            <button onClick={() => setActiveTab('ANALYTICS')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'ANALYTICS' ? 'bg-orange-500 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                <BarChart2 size={18}/> تحليل النتائج
            </button>
            <button onClick={() => setActiveTab('LOG')} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'LOG' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
                <History size={18}/> السجل الشامل
            </button>
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            {!isManager && (
                <>
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-white hover:bg-gray-50 text-gray-700 border px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm text-sm font-bold whitespace-nowrap">
                        <FileSpreadsheet size={18} />
                        <span className="hidden md:inline">استيراد Excel</span>
                    </button>
                </>
            )}
        </div>
      </div>

      {activeTab === 'BULK' && !isManager && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full animate-fade-in">
              <div className="flex justify-between items-start mb-6 border-b pb-4">
                  <div>
                      <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Users className="text-primary"/> رصد الدرجات (فصل كامل)</h3>
                  </div>
                  {isSuccess && <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 animate-bounce-in"><Check size={16}/> تم الحفظ بنجاح!</div>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">الفصل</label>
                      <select className="w-full p-2 border rounded-lg bg-white" value={bulkClass} onChange={e => setBulkClass(e.target.value)}>
                          <option value="">-- اختر الفصل --</option>
                          {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>
                  
                  <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1"><Link size={12}/> ربط بعمود</label>
                          <select className="w-full p-2 border rounded-lg bg-white font-bold text-indigo-700" value={selectedAssignmentId} onChange={e => handleAssignmentChange(e.target.value)}>
                              <option value="">-- تقييم جديد --</option>
                              {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">المادة</label>
                          <input className="w-full p-2 border rounded-lg bg-white" value={subject} onChange={e => setSubject(e.target.value)}/>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">عنوان التقييم</label>
                          <input className="w-full p-2 border rounded-lg bg-white" value={title} onChange={e => setTitle(e.target.value)} readOnly={!!selectedAssignmentId}/>
                      </div>
                  </div>
              </div>

              <div className="flex-1 overflow-auto border rounded-xl">
                  {filteredStudentsBulk.length > 0 ? (
                      <table className="w-full text-right text-sm">
                          <thead className="bg-gray-100 text-gray-700 font-bold sticky top-0 shadow-sm z-10">
                              <tr>
                                  <th className="p-3 w-12 text-center">#</th>
                                  <th className="p-3">اسم الطالب</th>
                                  <th className="p-3 w-40 text-center">الدرجة</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                              {filteredStudentsBulk.map((student, idx) => (
                                  <tr key={student.id} className="hover:bg-gray-50">
                                      <td className="p-3 text-center text-gray-400">{idx + 1}</td>
                                      <td className="p-3">
                                        <span 
                                            onClick={() => navigate('/followup', { state: { studentId: student.id } })}
                                            className="font-bold text-gray-800 cursor-pointer hover:text-primary hover:underline"
                                        >
                                            {student.name}
                                        </span>
                                      </td>
                                      <td className="p-2 text-center">
                                          <input 
                                              type="number" 
                                              className="w-20 p-2 border rounded text-center outline-none focus:ring-2 focus:ring-primary"
                                              value={bulkScores[student.id] || ''}
                                              onChange={(e) => setBulkScores(prev => ({ ...prev, [student.id]: e.target.value }))}
                                          />
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  ) : <div className="p-10 text-center text-gray-400 font-bold italic">الرجاء اختيار فصل للبدء بالرصد</div>}
              </div>

              <div className="mt-4 pt-4 border-t flex justify-end">
                  <button onClick={handleBulkSubmit} className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg active:scale-95">حفظ الدرجات في السحابة</button>
              </div>
          </div>
      )}

      {activeTab === 'LOG' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden animate-fade-in">
              <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 items-center justify-between print:hidden">
                  <div className="flex flex-wrap gap-2 text-sm items-center flex-1">
                      <select value={logClass} onChange={e => setLogClass(e.target.value)} className="p-1 border rounded bg-white font-bold text-gray-700">
                          <option value="">الفصول: الكل</option>
                          {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button onClick={() => window.print()} className="bg-gray-800 text-white px-3 py-1 rounded flex items-center gap-1 font-bold text-xs"><Printer size={14}/> طباعة</button>
                  </div>
              </div>
              <div className="flex-1 overflow-auto">
                  <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50 font-bold sticky top-0 shadow-sm">
                          <tr>
                              <th className="p-3">التاريخ</th>
                              <th className="p-3">الطالب</th>
                              <th className="p-3">التقييم</th>
                              <th className="p-3 text-center">الدرجة</th>
                              <th className="p-3 text-center">إجراءات</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {filteredHistory.map(rec => {
                              const s = students.find(x => x.id === rec.studentId);
                              return (
                                  <tr key={rec.id} className="hover:bg-gray-50">
                                      <td className="p-3 font-mono text-xs text-gray-400">{rec.date}</td>
                                      <td className="p-3 font-bold text-gray-800 cursor-pointer hover:text-primary" onClick={() => navigate('/followup', { state: { studentId: rec.studentId } })}>{s?.name}</td>
                                      <td className="p-3 text-gray-600">{rec.title}</td>
                                      <td className="p-3 text-center font-black text-indigo-700">{rec.score} / {rec.maxScore}</td>
                                      <td className="p-3 text-center flex justify-center gap-2">
                                          <button onClick={() => handleEditRecord(rec)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit size={16}/></button>
                                          <button onClick={() => {if(confirm('حذف؟')) onDeletePerformance(rec.id)}} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                      </td>
                                  </tr>
                              );
                          })}
                          {filteredHistory.length === 0 && <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-bold italic">لا توجد سجلات مطابقة لهذه الفترة</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {isImportModalOpen && (
          <div className="fixed inset-0 z-[100] bg-white">
              <DataImport existingStudents={students} onImportStudents={() => {}} onImportAttendance={() => {}} onImportPerformance={(recs) => { onImportPerformance(recs); setIsImportModalOpen(false); }} forcedType="PERFORMANCE" onClose={() => setIsImportModalOpen(false)} currentUser={currentUser} />
          </div>
      )}
    </div>
  );
};

export default Performance;