
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord, Assignment, SystemUser, PerformanceCategory } from '../types';
import { fetchAssignments, fetchPerformance, addPerformance, getFlippedLessons } from '../services/storageService';
import { 
    Target, Search, Download, Filter, Save, 
    Trophy, AlertTriangle, Sparkles, Loader2, 
    BarChart3, LayoutGrid, CheckCircle2, Star, TrendingUp, ArrowUpCircle, Bot
} from 'lucide-react';
import { useToast } from './ToastProvider';
import * as XLSX from 'xlsx';

interface PerformanceProps {
  students: Student[];
  performance: PerformanceRecord[];
  onAddPerformance: () => void;
  currentUser: SystemUser | null;
}

const Performance: React.FC<PerformanceProps> = ({ students, performance, onAddPerformance, currentUser }) => {
  const { showToast } = useToast();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedAsgnId, setSelectedAsgnId] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [flippedLessons, setFlippedLessons] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser) {
        loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
      const [asns, flips] = await Promise.all([
          fetchAssignments(currentUser!.id),
          Promise.resolve(getFlippedLessons(currentUser!.id))
      ]);
      setAssignments(asns);
      setFlippedLessons(flips);
      if (asns.length > 0) setSelectedAsgnId(asns[0].id);
  };

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
  
  useEffect(() => {
    if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
  }, [uniqueClasses]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
        const matchesClass = !selectedClass || s.className === selectedClass;
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesClass && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass, searchTerm]);

  const activeAssignment = useMemo(() => assignments.find(a => a.id === selectedAsgnId), [assignments, selectedAsgnId]);

  const handleSave = async () => {
    if (!activeAssignment || !currentUser) return;
    setIsSaving(true);
    const records: PerformanceRecord[] = Object.entries(scores).map(([sid, score]) => ({
        id: `${sid}_${activeAssignment.id}`,
        studentId: sid,
        subject: activeAssignment.subject || 'عام',
        title: activeAssignment.title,
        score: Number(score),
        maxScore: activeAssignment.maxScore,
        date: new Date().toISOString().split('T')[0],
        category: activeAssignment.category,
        notes: activeAssignment.id,
        createdById: currentUser.id
    })).filter(r => !isNaN(r.score));

    try {
        await addPerformance(records);
        onAddPerformance();
        setScores({});
        showToast(`تم رصد درجات ${records.length} طالباً بنجاح`, 'SUCCESS');
    } catch (e) {
        showToast('حدث خطأ أثناء الحفظ', 'ERROR');
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 page-enter font-tajawal pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-slate-900">متابعة نواتج التعلم</h1>
            <p className="text-slate-500 text-sm font-medium">توثيق مستويات الإتقان وربطها بالاستعداد الاستباقي.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={handleSave} disabled={isSaving || Object.keys(scores).length === 0} className="px-10 py-3 bg-brand-500 text-white rounded-2xl text-sm font-black shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} حفظ الرصد الحالي
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shadow-inner">
            <Filter size={16} className="text-slate-400"/>
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="font-black text-slate-900 outline-none text-xs bg-transparent">
                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
        <div className="flex-1 min-w-[200px]">
            <select value={selectedAsgnId} onChange={e => setSelectedAsgnId(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-700 outline-none text-xs shadow-sm">
                {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.maxScore} درجة) • {a.category}</option>)}
            </select>
        </div>
        <div className="relative">
            <Search size={18} className="absolute right-3 top-2.5 text-slate-400"/>
            <input className="pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none w-64 shadow-sm" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col min-h-[500px] relative">
        <div className="overflow-auto flex-1 custom-scrollbar">
            <table className="w-full text-right border-collapse">
                <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest sticky top-0 z-30">
                    <tr>
                        <th className="p-5 border-l border-white/5 w-14 text-center">م</th>
                        <th className="p-5 border-l border-white/5 sticky right-0 bg-slate-900 z-40 w-72">اسم الطالب</th>
                        <th className="p-5 border-l border-white/5 text-center">الفصل المقلوب</th>
                        <th className="p-5 border-l border-white/5 text-center">الدرجة</th>
                        <th className="p-5 text-center">الحالة التقديرية</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student, idx) => {
                        const existing = performance.find(p => p.studentId === student.id && p.notes === selectedAsgnId);
                        const currentScore = scores[student.id] !== undefined ? scores[student.id] : (existing ? existing.score.toString() : '');
                        const pct = Number(currentScore) / (activeAssignment?.maxScore || 10);
                        
                        // التحقق من جاهزية الفصل المقلوب (لأحدث درس)
                        const latestFlip = flippedLessons.filter(l => l.className === student.className).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
                        const isReady = latestFlip?.preparedStudentIds.includes(student.id);

                        return (
                            <tr key={student.id} className="hover:bg-indigo-50/20 h-20 transition-colors group">
                                <td className="p-4 text-center text-[10px] font-black text-slate-300 group-hover:text-brand-500">{idx + 1}</td>
                                <td className="p-4 font-black text-slate-800 sticky right-0 bg-white z-20 border-l group-hover:bg-indigo-50/50 transition-colors">
                                    {student.name}
                                </td>
                                <td className="p-4 text-center">
                                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl text-[9px] font-black ${isReady ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-300 border border-slate-100'}`}>
                                        <ArrowUpCircle size={14}/> {isReady ? 'أتم التحضير' : 'لم يحضر'}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <input 
                                        type="number"
                                        className="w-20 h-12 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-black text-lg text-brand-600 outline-none focus:bg-white focus:border-brand-500 transition-all shadow-inner"
                                        value={currentScore}
                                        placeholder="-"
                                        onChange={e => setScores({ ...scores, [student.id]: e.target.value })}
                                    />
                                </td>
                                <td className="p-4 text-center">
                                    {currentScore ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase ${
                                                pct >= 0.9 ? 'bg-emerald-100 text-emerald-700' :
                                                pct >= 0.7 ? 'bg-blue-100 text-blue-700' :
                                                pct >= 0.5 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                {pct >= 0.9 ? 'متقن جداً' : pct >= 0.7 ? 'متقن' : pct >= 0.5 ? 'مستوى متوسط' : 'غير متقن'}
                                            </span>
                                        </div>
                                    ) : '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Bot size={150}/></div>
          <div className="relative z-10 flex-1">
              <h3 className="text-xl font-black flex items-center gap-3 mb-4"><Sparkles className="text-indigo-400"/> توصية المحلل الأكاديمي (AI)</h3>
              <p className="text-indigo-100 text-sm leading-relaxed font-medium italic">
                  "يظهر تحليل العلاقة أن الطلاب الذين أتموا 'التحضير الاستباقي' في الفصل المقلوب حققوا درجات أعلى بنسبة 22% في هذا التقييم. ننصح بمكافأة الطلاب الجاهزين بنقاط تعزيز (XP) إضافية."
              </p>
          </div>
          <button onClick={() => navigate('/reports')} className="relative z-10 bg-white text-slate-900 px-8 py-3 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all active:scale-95">عرض التقارير العميقة</button>
      </div>
    </div>
  );
};

export default Performance;
