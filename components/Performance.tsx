
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, SystemUser, Assignment, AttendanceRecord } from '../types';
import { getAssignments, addPerformance } from '../services/storageService';
import { 
    PlusCircle, Trash2, Zap, ArrowRight, List, PieChart, TrendingUp, Sparkles, Loader2, Save, FileText, ChevronLeft, BarChart3, ClipboardCheck, Filter, Award, Target
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
            alert('تم اعتماد السجل سحابياً بنجاح.'); 
        } catch (e) { alert('فشل حفظ الدرجات.'); }
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 animate-fade-in font-tajawal h-full flex flex-col overflow-hidden pb-10">
      {/* Registry Performance Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-white p-8 rounded-[3.5rem] border shadow-sm">
          <div className="flex items-center gap-6">
              <div className="p-5 bg-indigo-700 text-white rounded-[2rem] shadow-2xl shadow-indigo-100"><Award size={36}/></div>
              <div>
                  <h2 className="text-3xl font-black text-slate-800">سجل الرصد الأكاديمي</h2>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Unified Academic Progress Ledger</p>
              </div>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border shadow-inner">
              <button onClick={() => setActiveTab('BULK')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'BULK' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}>الرصد السريع</button>
              <button onClick={() => setActiveTab('ANALYTICS')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'ANALYTICS' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}>تحليل النتائج</button>
              <button onClick={() => setActiveTab('LOG')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'LOG' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-indigo-600'}`}>الأرشيف التاريخي</button>
          </div>
      </div>

      <div className="flex-1 bg-white rounded-[4rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
          {activeTab === 'BULK' && (
              <>
                <div className="p-10 bg-slate-50/50 border-b flex flex-wrap gap-10 items-center shrink-0">
                    <div className="w-80">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mr-1">الفصل الدراسي الحالي</label>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-4 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] bg-white text-sm font-black outline-none shadow-sm transition-all">
                            <option value="">-- اختر الفصل --</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="w-80">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 mr-1">الربط بمعيار أو تقييم</label>
                        <select value={activeAssignmentId} onChange={e => setActiveAssignmentId(e.target.value)} className="w-full p-4 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] bg-white text-sm font-black outline-none shadow-sm transition-all">
                            <option value="">-- اختر التقييم --</option>
                            {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.maxScore} درجة)</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {selectedClass ? (
                        <table className="w-full text-right border-collapse">
                            <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 h-20 shadow-sm">
                                <tr>
                                    <th className="px-10 border-l border-slate-50 w-24 text-center">م</th>
                                    <th className="px-10 border-l border-slate-50">اسم الطالب</th>
                                    <th className="px-10 text-center w-64">الدرجة المكتسبة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredStudents.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-indigo-50/20 transition-all group h-20">
                                        <td className="px-10 text-center text-slate-300 font-mono text-[11px] border-l border-slate-50 font-black">{idx + 1}</td>
                                        <td className="px-10 font-black text-slate-700 text-base border-l border-slate-50">{s.name}</td>
                                        <td className="px-10">
                                            <input 
                                                type="number" 
                                                className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-center font-black text-indigo-700 outline-none transition-all shadow-inner text-lg" 
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
                        <div className="h-full flex flex-col items-center justify-center text-slate-200 py-48 opacity-40">
                            <Target size={160} strokeWidth={1}/>
                            <p className="mt-8 font-black text-3xl italic">يرجى اختيار الفصل والتقييم لبدء الرصد الأكاديمي</p>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-slate-900 border-t flex justify-between items-center px-12 shrink-0">
                    <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">عدد طلاب السجل: {filteredStudents.length}</p>
                    <button onClick={handleBulkSave} disabled={isSaving || !selectedClass} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-3">
                        {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} اعتماد نهائي وحفظ سحابي
                    </button>
                </div>
              </>
          )}

          {activeTab === 'LOG' && (
              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-right border-collapse text-sm">
                      <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 h-20 shadow-sm">
                          <tr>
                            <th className="px-10 border-l border-slate-50">تاريخ الرصد</th>
                            <th className="px-10 border-l border-slate-50">اسم الطالب</th>
                            <th className="px-10 border-l border-slate-50">التقييم / المهمة</th>
                            <th className="px-10 text-center border-l border-slate-50 w-48">الدرجة المستحقة</th>
                            <th className="px-10 text-center">إدارة</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {performance.slice().reverse().map(rec => (
                              <tr key={rec.id} className="hover:bg-slate-50 h-16 group transition-colors">
                                  <td className="px-10 text-slate-400 font-mono text-xs border-l border-slate-50">{rec.date}</td>
                                  <td className="px-10 font-black text-slate-800 border-l border-slate-50">{students.find(s=>s.id===rec.studentId)?.name}</td>
                                  <td className="px-10 text-slate-400 font-bold border-l border-slate-50 uppercase text-[10px] tracking-widest">{rec.title}</td>
                                  <td className="px-10 text-center font-black text-indigo-600 border-l border-slate-50 text-base">{rec.score} <span className="text-slate-200 text-xs font-bold">/ {rec.maxScore}</span></td>
                                  <td className="px-10 text-center">
                                      <button onClick={() => onDeletePerformance(rec.id)} className="p-3 text-slate-200 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  {performance.length === 0 && (
                      <div className="py-48 text-center text-slate-200 flex flex-col items-center gap-8">
                         <BarChart3 size={150} strokeWidth={1} className="opacity-20"/>
                         <p className="text-4xl font-black opacity-30">أرشيف الرصد فارغ</p>
                      </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
};

export default Performance;
