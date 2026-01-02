
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, SystemUser, Assignment, AttendanceRecord } from '../types';
import { getAssignments, addPerformance } from '../services/storageService';
import { 
    PlusCircle, Trash2, Zap, ArrowRight, List, PieChart, TrendingUp, Sparkles, Loader2, Save, FileText, ChevronLeft, BarChart3, ClipboardCheck, Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PerformanceProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  onAddPerformance: (records: PerformanceRecord[]) => void;
  onDeletePerformance: (id: string) => void;
  currentUser?: SystemUser | null;
}

const Performance: React.FC<PerformanceProps> = ({ students, performance, onAddPerformance, onDeletePerformance, currentUser }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'BULK' | 'LOG' | 'ANALYTICS'>('BULK');
  const [selectedClass, setSelectedClass] = useState('');
  const [bulkScores, setBulkScores] = useState<Record<string, string>>({});
  const [activeAssignmentId, setActiveAssignmentId] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser) setAssignments(getAssignments('ALL', currentUser.id, true));
  }, [currentUser]);

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
  const filteredStudents = useMemo(() => students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name, 'ar')), [students, selectedClass]);

  const handleBulkSave = async () => {
    const assign = assignments.find(a => a.id === activeAssignmentId);
    if (!assign || !selectedClass) return alert('الرجاء اختيار التقييم والفصل أولاً.');
    setIsSaving(true);
    const records: PerformanceRecord[] = [];
    const today = new Date().toISOString().split('T')[0];
    Object.entries(bulkScores).forEach(([sid, score]) => {
        if (score === '') return;
        records.push({
            id: `${sid}_${assign.id}`, studentId: sid, subject: assign.subject || 'عام', title: assign.title,
            category: assign.category, score: Number(score), maxScore: assign.maxScore,
            date: today, notes: assign.id, createdById: currentUser?.id
        });
    });
    if (records.length > 0) {
        try { 
            await onAddPerformance(records); 
            setBulkScores({}); 
            alert('تم اعتماد الدرجات ومزامنتها سحابياً بنجاح.'); 
        } catch (e) { alert('فشل حفظ الدرجات.'); }
    }
    setIsSaving(false);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 animate-fade-in font-tajawal overflow-hidden">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-white shadow-sm">
                  <BarChart3 size={24}/>
              </div>
              <div>
                  <h2 className="text-xl font-bold text-slate-800">سجل الرصد الأكاديمي</h2>
                  <p className="text-xs text-slate-500 font-medium">رصد الدرجات، الاختبارات، والواجبات اليومية</p>
              </div>
          </div>
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
              <button onClick={() => setActiveTab('BULK')} className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'BULK' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>رصد سريع</button>
              <button onClick={() => setActiveTab('ANALYTICS')} className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'ANALYTICS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>تحليل الأداء</button>
              <button onClick={() => setActiveTab('LOG')} className={`px-6 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'LOG' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>سجل الرصد</button>
          </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {activeTab === 'BULK' && (
              <>
                <div className="p-4 bg-slate-50/50 border-b flex flex-wrap gap-4 items-center shrink-0">
                    <div className="w-64">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 mr-1">الفصل الدراسي</label>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-xs font-bold outline-none focus:border-blue-500 transition-all shadow-sm">
                            <option value="">-- اختر الفصل --</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="w-64">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 mr-1">الربط بتقييم محدد</label>
                        <select value={activeAssignmentId} onChange={e => setActiveAssignmentId(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg bg-white text-xs font-bold outline-none focus:border-blue-500 transition-all shadow-sm">
                            <option value="">-- اختر التقييم --</option>
                            {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.maxScore} درجة)</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {selectedClass ? (
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10 h-12">
                                <tr>
                                    <th className="px-6 border-l border-slate-100 w-16 text-center">م</th>
                                    <th className="px-6 border-l border-slate-100">اسم الطالب</th>
                                    <th className="px-6 text-center w-48">الدرجة المستحقة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStudents.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-blue-50/30 transition-colors h-14 group">
                                        <td className="px-6 text-center text-slate-400 font-mono text-xs border-l border-slate-100">{idx + 1}</td>
                                        <td className="px-6 font-bold text-slate-700 border-l border-slate-100">{s.name}</td>
                                        <td className="px-6">
                                            <input 
                                                type="number" 
                                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-black text-blue-700 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" 
                                                placeholder="-"
                                                value={bulkScores[s.id] || ''} 
                                                onChange={e => setBulkScores({...bulkScores, [s.id]: e.target.value})}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 py-32 opacity-30 gap-4">
                            <ClipboardCheck size={80} strokeWidth={1.5}/>
                            <p className="font-bold text-xl">يرجى اختيار الفصل والتقييم للبدء بالرصد</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t flex justify-between items-center px-8 shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">عدد الطلاب: {filteredStudents.length}</p>
                    <button onClick={handleBulkSave} disabled={isSaving || !selectedClass} className="px-10 py-2.5 bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-800 disabled:opacity-50 transition-all flex items-center gap-2">
                        {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} اعتماد وحفظ الدرجات
                    </button>
                </div>
              </>
          )}

          {activeTab === 'LOG' && (
              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-right border-collapse text-sm">
                      <thead className="bg-slate-50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10 h-12">
                          <tr>
                            <th className="px-6 border-l border-slate-100">التاريخ</th>
                            <th className="px-6 border-l border-slate-100">الطالب</th>
                            <th className="px-6 border-l border-slate-100">التقييم</th>
                            <th className="px-6 text-center border-l border-slate-100">الدرجة</th>
                            <th className="px-6 text-center">الإجراء</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {performance.slice().reverse().map(rec => (
                              <tr key={rec.id} className="hover:bg-slate-50 h-12">
                                  <td className="px-6 text-slate-400 font-mono text-xs border-l border-slate-100">{rec.date}</td>
                                  <td className="px-6 font-bold text-slate-700 border-l border-slate-100">{students.find(s=>s.id===rec.studentId)?.name}</td>
                                  <td className="px-6 text-slate-500 font-medium border-l border-slate-100">{rec.title}</td>
                                  <td className="px-6 text-center font-black text-blue-600 border-l border-slate-100">{rec.score} / {rec.maxScore}</td>
                                  <td className="px-6 text-center">
                                      <button onClick={() => onDeletePerformance(rec.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {performance.length === 0 && (
                      <div className="py-32 text-center text-slate-300 opacity-30 font-bold text-xl">لا توجد سجلات رصد حتى الآن</div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
};

export default Performance;
