
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, SystemUser, Assignment, AttendanceRecord, PerformanceCategory } from '../types';
import { getAssignments, addPerformance } from '../services/storageService';
import { 
    Save, Target, Filter, BarChart3, ClipboardCheck, Loader2, Sparkles, TrendingUp, AlertTriangle, Trophy, ListChecks, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { useToast } from './ToastProvider';

interface PerformanceProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  onAddPerformance: (records: PerformanceRecord[]) => void;
  onDeletePerformance: (id: string) => void;
  currentUser?: SystemUser | null;
}

const Performance: React.FC<PerformanceProps> = ({ students, performance, onAddPerformance, currentUser }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'BULK' | 'LOG'>('BULK');
  const [selectedClass, setSelectedClass] = useState('');
  const [bulkScores, setBulkScores] = useState<Record<string, string>>({});
  const [activeAssignmentId, setActiveAssignmentId] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fix: getAssignments is a synchronous function returning Assignment[], so .then() is not required and causes an error.
  useEffect(() => {
    if (currentUser) {
        setAssignments(getAssignments('ALL', currentUser.id, true));
    }
  }, [currentUser]);

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
  const filteredStudents = useMemo(() => students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name, 'ar')), [students, selectedClass]);

  const classAnalysis = useMemo(() => {
      if (!selectedClass || performance.length === 0) return null;
      const classPerf = performance.filter(p => students.some(s => s.id === p.studentId && s.className === selectedClass));
      if (classPerf.length === 0) return null;

      const avg = classPerf.reduce((a,b) => a + (b.score/b.maxScore), 0) / classPerf.length * 100;
      const topCount = classPerf.filter(p => (p.score/p.maxScore) >= 0.9).length;
      return { avg: Math.round(avg), topCount };
  }, [performance, students, selectedClass]);

  const handleBulkSave = async () => {
    const assign = assignments.find(a => a.id === activeAssignmentId);
    if (!assign || !selectedClass) return showToast('يرجى اختيار الفصل والمعيار', 'ERROR');
    
    setIsSaving(true);
    const records: PerformanceRecord[] = [];
    const today = new Date().toISOString().split('T')[0];
    
    Object.entries(bulkScores).forEach(([sid, score]) => {
        if (score === '') return;
        records.push({
            id: `${sid}_${assign.id}`, 
            studentId: sid, 
            subject: assign.subject || 'عام', 
            title: assign.title,
            category: assign.category, 
            score: Number(score), 
            maxScore: assign.maxScore,
            date: today, 
            notes: assign.id, 
            createdById: currentUser?.id
        });
    });

    if (records.length > 0) {
        try { 
            await onAddPerformance(records); 
            setBulkScores({}); 
            showToast(`تم رصد درجات ${records.length} طالباً بنجاح`, 'SUCCESS');
        } catch (e) { 
            showToast('فشل في حفظ البيانات', 'ERROR'); 
        }
    }
    setIsSaving(false);
  };

  const getScoreStatus = (score: number, max: number) => {
      const pct = (score / max) * 100;
      if (pct >= 90) return { label: 'ممتاز', color: 'text-emerald-600 bg-emerald-50' };
      if (pct >= 70) return { label: 'جيد', color: 'text-blue-600 bg-blue-50' };
      if (pct >= 50) return { label: 'مقبول', color: 'text-amber-600 bg-amber-50' };
      return { label: 'تعثر', color: 'text-rose-600 bg-rose-50' };
  };

  return (
    <div className="space-y-6 page-enter font-tajawal pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900">سجل الرصد التعليمي</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">توثيق نواتج تعلم الطلاب وتحليل مستوى التمكن.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            <button onClick={() => setActiveTab('BULK')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'BULK' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>رصد سريع</button>
            <button onClick={() => setActiveTab('LOG')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'LOG' ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}>الأرشيف</button>
        </div>
      </div>

      {classAnalysis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-slide-up">
              <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white flex items-center justify-between shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={120}/></div>
                  <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">كفاءة التعلم للفصل</p>
                      <h4 className="text-4xl font-black">{classAnalysis.avg}%</h4>
                  </div>
                  <Sparkles className="text-yellow-400 animate-pulse" size={32}/>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl"><Trophy size={32}/></div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المتميزون (90%+)</p>
                      <h4 className="text-3xl font-black text-slate-800">{classAnalysis.topCount} طلاب</h4>
                  </div>
              </div>
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
                  <div className="p-4 bg-rose-50 text-rose-600 rounded-3xl"><AlertTriangle size={32}/></div>
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">فجوات مكتشفة</p>
                      <h4 className="text-3xl font-black text-slate-800">{filteredStudents.length - classAnalysis.topCount} طلاب</h4>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[500px]">
        {activeTab === 'BULK' ? (
            <>
                <div className="p-8 bg-slate-50/50 border-b border-slate-200 flex flex-wrap gap-8 items-end">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">1. اختر الفصل الدراسي</label>
                            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black outline-none focus:border-brand-500 shadow-sm transition-all">
                                <option value="">-- اختر الفصل المستهدف --</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">2. المعيار التعليمي / التقييم</label>
                            <select value={activeAssignmentId} onChange={e => setActiveAssignmentId(e.target.value)} className="w-full p-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black outline-none focus:border-brand-500 shadow-sm transition-all">
                                <option value="">-- اختر مهارة للرصد --</option>
                                {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.maxScore} درجة) • {a.category}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={handleBulkSave} disabled={isSaving || !selectedClass || !activeAssignmentId} className="px-12 py-3 bg-brand-500 text-white rounded-2xl text-sm font-black hover:bg-brand-600 shadow-xl shadow-brand-500/20 flex items-center gap-3 disabled:opacity-50 transition-all active:scale-95">
                        {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} إتمام الرصد السحابي
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {selectedClass && activeAssignmentId ? (
                        <table className="w-full text-right text-sm border-collapse">
                            <thead>
                                <tr className="text-slate-400 font-black uppercase tracking-widest text-[10px] border-b border-slate-100 bg-slate-50/20">
                                    <th className="px-10 py-5 w-16 text-center">#</th>
                                    <th className="px-10 py-5">اسم الطالب</th>
                                    <th className="px-10 py-5 text-center w-64">رصد الدرجة</th>
                                    <th className="px-10 py-5 text-center">مؤشر التمكن</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredStudents.map((s, idx) => {
                                    const score = bulkScores[s.id];
                                    const max = assignments.find(a=>a.id===activeAssignmentId)?.maxScore || 10;
                                    const status = score ? getScoreStatus(Number(score), max) : null;
                                    
                                    return (
                                        <tr key={s.id} className="hover:bg-brand-50/10 transition-colors h-16 group">
                                            <td className="px-10 py-5 text-slate-300 font-black text-xs group-hover:text-brand-500">{idx + 1}</td>
                                            <td className="px-10 py-5 font-black text-slate-700">{s.name}</td>
                                            <td className="px-10 py-5">
                                                <div className="relative w-32 mx-auto">
                                                    <input 
                                                        type="number" 
                                                        className="w-full p-3 bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-brand-500 rounded-2xl text-center font-black text-brand-600 outline-none transition-all shadow-inner" 
                                                        placeholder="-"
                                                        value={score || ''} 
                                                        onChange={e => setBulkScores({...bulkScores, [s.id]: e.target.value})}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-10 py-5 text-center">
                                                {status ? (
                                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black border transition-all ${status.color}`}>
                                                        {status.label}
                                                    </span>
                                                ) : <span className="text-slate-300 italic text-[10px]">لم يرصد</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="py-48 text-center text-slate-300 flex flex-col items-center gap-6">
                            <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center border-4 border-dashed border-slate-100">
                                <ListChecks size={64} className="opacity-20"/>
                            </div>
                            <p className="font-black text-2xl">يرجى اختيار الفصل والمعيار لبدء الرصد الذكي</p>
                        </div>
                    )}
                </div>
            </>
        ) : (
            <div className="py-40 text-center text-slate-300">
                <BarChart3 size={80} className="mx-auto mb-4 opacity-5"/>
                <p className="font-black text-2xl">أرشيف الدرجات قيد التحليل...</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Performance;
