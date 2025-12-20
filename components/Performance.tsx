
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, SystemUser, AcademicTerm, Assignment } from '../types';
import { getAcademicTerms, getAssignments, getTeacherAssignments, addPerformance } from '../services/storageService';
// Added Trash2 to lucide-react imports
import { PlusCircle, Check, FileSpreadsheet, History, Search, Printer, Edit, Cloud, Database, BarChart2, Zap, ArrowRight, User, Link, Trash2 } from 'lucide-react';
import DataImport from './DataImport';
import { useNavigate } from 'react-router-dom';

interface PerformanceProps {
  students: Student[];
  performance: PerformanceRecord[];
  onAddPerformance: (record: PerformanceRecord | PerformanceRecord[]) => void;
  onImportPerformance: (records: PerformanceRecord[]) => void;
  onDeletePerformance: (id: string) => void;
  currentUser?: SystemUser | null;
}

const Performance: React.FC<PerformanceProps> = ({ students, performance, onAddPerformance, onImportPerformance, onDeletePerformance, currentUser }) => {
  const navigate = useNavigate();
  const isManager = currentUser?.role === 'SCHOOL_MANAGER';

  const [activeTab, setActiveTab] = useState<'BULK' | 'LOG' | 'ANALYTICS'>(() => {
      const saved = localStorage.getItem('perf_active_tab');
      if (isManager) return 'LOG';
      return (saved as any) || 'BULK';
  });

  const [bulkClass, setBulkClass] = useState(() => localStorage.getItem('perf_bulk_class') || '');
  const [logClass, setLogClass] = useState(() => localStorage.getItem('perf_log_class') || '');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [subject, setSubject] = useState('عام');
  const [title, setTitle] = useState('');
  const [maxScore, setMaxScore] = useState('10');
  const [bulkScores, setBulkScores] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  useEffect(() => {
      localStorage.setItem('perf_active_tab', activeTab);
      localStorage.setItem('perf_bulk_class', bulkClass);
      localStorage.setItem('perf_log_class', logClass);
  }, [activeTab, bulkClass, logClass]);

  useEffect(() => {
      const loadedTerms = getAcademicTerms(currentUser?.id);
      setTerms(loadedTerms);
      const current = loadedTerms.find(t => t.isCurrent) || loadedTerms[0];
      if (current) setSelectedTermId(current.id);
      
      setAssignments(getAssignments('ALL', currentUser?.id, true));
  }, [currentUser]);

  const uniqueClasses = useMemo(() => {
      const classes = new Set<string>();
      students.forEach(s => s.className && classes.add(s.className));
      getTeacherAssignments(currentUser?.id).forEach(a => classes.add(a.classId));
      return Array.from(classes).sort();
  }, [students, currentUser]);

  const filteredStudentsBulk = useMemo(() => {
      if (!bulkClass) return [];
      return students.filter(s => s.className === bulkClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, bulkClass]);

  const filteredHistory = useMemo(() => {
      return performance.filter(p => {
          const student = students.find(s => s.id === p.studentId);
          if (!student) return false;
          if (logSearch && !student.name.includes(logSearch) && !p.title.includes(logSearch)) return false;
          if (logClass && student.className !== logClass) return false;
          return true;
      }).sort((a, b) => b.date.localeCompare(a.date));
  }, [performance, students, logSearch, logClass]);

  const handleAssignmentChange = (id: string) => {
      setSelectedAssignmentId(id);
      const assign = assignments.find(a => a.id === id);
      if (assign) {
          setTitle(assign.title);
          setMaxScore(assign.maxScore.toString());
      }
  };

  const handleBulkSubmit = () => {
      if (!title || !bulkClass) return alert('الرجاء تعبئة بيانات التقييم');
      const records: PerformanceRecord[] = [];
      const today = new Date().toISOString().split('T')[0];
      
      filteredStudentsBulk.forEach(s => {
          const sScore = bulkScores[s.id];
          if (sScore !== undefined && sScore !== '') {
              records.push({
                  // معرف ثابت يجمع الطالب والتكليف لضمان الـ Upsert
                  id: selectedAssignmentId ? `${s.id}_${selectedAssignmentId}` : `${s.id}_${Date.now()}`,
                  studentId: s.id,
                  subject,
                  title,
                  category: (assignments.find(a=>a.id===selectedAssignmentId)?.category as any) || 'OTHER',
                  score: Number(sScore),
                  maxScore: Number(maxScore),
                  date: today,
                  notes: selectedAssignmentId, // هذا الحقل أساسي للربط مع بوابة الطالب
                  createdById: currentUser?.id
              });
          }
      });
      if (records.length === 0) return alert('أدخل درجة واحدة على الأقل');
      onAddPerformance(records);
      setBulkScores({});
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col bg-gray-50 animate-fade-in pb-24">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex bg-white p-1 rounded-xl border shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('BULK')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-black text-xs transition-all whitespace-nowrap ${activeTab === 'BULK' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>رصد جماعي</button>
            <button onClick={() => setActiveTab('LOG')} className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-black text-xs transition-all whitespace-nowrap ${activeTab === 'LOG' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>السجل الكامل</button>
        </div>
        <button onClick={() => setIsImportModalOpen(true)} className="w-full md:w-auto bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 font-black text-xs shadow-lg active:scale-95"><FileSpreadsheet size={16}/> استيراد Excel</button>
      </div>

      {activeTab === 'BULK' && (
          <div className="flex-1 flex flex-col gap-6 animate-fade-in">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">الفصل</label>
                          <select className="w-full p-3 border rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={bulkClass} onChange={e => setBulkClass(e.target.value)}>
                              <option value="">-- اختر الفصل --</option>
                              {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      <div className="md:col-span-2"><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1"><Link size={10}/> ربط بعمود من سجل الرصد</label>
                          <select className="w-full p-3 border rounded-xl bg-indigo-50 text-indigo-700 font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={selectedAssignmentId} onChange={e => handleAssignmentChange(e.target.value)}>
                              <option value="">-- إنشاء تقييم جديد --</option>
                              {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.category})</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">العنوان</label><input className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={title} onChange={e => setTitle(e.target.value)} readOnly={!!selectedAssignmentId}/></div>
                      <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">المادة</label><input className="w-full p-3 border rounded-xl font-bold bg-gray-50" value={subject} onChange={e => setSubject(e.target.value)}/></div>
                      <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">الدرجة العظمى</label><input type="number" className="w-full p-3 border rounded-xl font-bold bg-gray-50 text-center" value={maxScore} onChange={e => setMaxScore(e.target.value)} readOnly={!!selectedAssignmentId}/></div>
                  </div>
              </div>

              <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {filteredStudentsBulk.length > 0 ? (
                          <table className="w-full text-right">
                              <thead className="bg-gray-50/50 sticky top-0 z-10 border-b">
                                  <tr><th className="p-4 w-12 text-center text-[10px] text-gray-400">#</th><th className="p-4 font-black text-xs text-gray-500">اسم الطالب</th><th className="p-4 w-32 text-center font-black text-xs text-gray-500">الدرجة</th></tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                  {filteredStudentsBulk.map((student, idx) => (
                                      <tr key={student.id} className="hover:bg-indigo-50/20">
                                          <td className="p-4 text-center text-xs text-gray-300 font-mono">{idx + 1}</td>
                                          <td className="p-4 font-bold text-gray-800">{student.name}</td>
                                          <td className="p-2"><input type="number" className="w-full h-full p-3 bg-gray-50 border-none rounded-xl text-center font-black focus:ring-2 focus:ring-indigo-500 transition-all" value={bulkScores[student.id] || ''} onChange={(e) => setBulkScores({...bulkScores, [student.id]: e.target.value})} placeholder="-"/></td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      ) : <div className="p-20 text-center text-gray-300 font-black italic">يرجى اختيار الفصل للبدء بالرصد</div>}
                  </div>
                  <div className="p-6 bg-gray-50 border-t flex justify-between items-center">
                      {isSuccess ? <div className="text-emerald-600 font-black text-sm flex items-center gap-2 animate-bounce"><Check size={20}/> تم الحفظ بنجاح!</div> : <div></div>}
                      <button onClick={handleBulkSubmit} className="bg-indigo-600 text-white px-10 py-3 rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">حفظ وإرسال للسحابة</button>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'LOG' && (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm flex-1 overflow-hidden flex flex-col animate-fade-in">
              <div className="p-4 border-b bg-gray-50/50 flex flex-wrap gap-4 items-center">
                  <div className="relative flex-1 max-w-md">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                      <input className="w-full pr-10 pl-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold" placeholder="بحث باسم الطالب أو التقييم..." value={logSearch} onChange={e => setLogSearch(e.target.value)} />
                  </div>
                  <select value={logClass} onChange={e => setLogClass(e.target.value)} className="p-2 border rounded-xl text-xs font-black bg-white">
                      <option value="">كل الفصول</option>
                      {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
              <div className="flex-1 overflow-auto">
                  <table className="w-full text-right text-sm">
                      <thead className="bg-gray-50/30 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                          <tr><th className="p-4">التاريخ</th><th className="p-4">الطالب</th><th className="p-4">التقييم</th><th className="p-4 text-center">الدرجة</th><th className="p-4 text-center">إجراء</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {filteredHistory.map(rec => (
                              <tr key={rec.id} className="hover:bg-gray-50 group">
                                  <td className="p-4 text-gray-400 font-mono text-[10px]">{rec.date}</td>
                                  <td className="p-4 font-bold text-gray-800">{students.find(s => s.id === rec.studentId)?.name}</td>
                                  <td className="p-4 text-gray-500 font-medium">{rec.title}</td>
                                  <td className="p-4 text-center font-black text-indigo-700">{rec.score} <span className="text-[10px] text-gray-300">/ {rec.maxScore}</span></td>
                                  <td className="p-4 text-center"><button onClick={() => {if(confirm('حذف؟')) onDeletePerformance(rec.id)}} className="p-2 text-red-100 group-hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {filteredHistory.length === 0 && <div className="p-20 text-center text-gray-300 font-black">لا يوجد سجلات مطابقة</div>}
              </div>
          </div>
      )}

      {isImportModalOpen && (
          <div className="fixed inset-0 z-[120] bg-white">
              <DataImport existingStudents={students} onImportStudents={() => {}} onImportAttendance={() => {}} onImportPerformance={(recs) => { onImportPerformance(recs); setIsImportModalOpen(false); }} forcedType="PERFORMANCE" onClose={() => setIsImportModalOpen(false)} currentUser={currentUser} />
          </div>
      )}
    </div>
  );
};

export default Performance;
