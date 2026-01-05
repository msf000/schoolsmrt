
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord, Assignment, SystemUser, PerformanceCategory } from '../types';
import { fetchAssignments, fetchPerformance, addPerformance } from '../services/storageService';
import { 
    Target, Search, Download, Filter, Save, 
    Trophy, AlertTriangle, Sparkles, Loader2, 
    BarChart3, LayoutGrid, CheckCircle2, Star, TrendingUp
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

  useEffect(() => {
    if (currentUser) {
        loadAssignments();
    }
  }, [currentUser]);

  const loadAssignments = async () => {
      const data = await fetchAssignments(currentUser!.id);
      setAssignments(data);
      if (data.length > 0) setSelectedAsgnId(data[0].id);
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
            <h1 className="text-3xl font-black text-slate-900">سجل رصد المهارات</h1>
            <p className="text-slate-500 text-sm font-medium">توثيق نواتج التعلم وتحليل مستوى تمكن الطلاب.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => XLSX.writeFile(XLSX.utils.table_to_book(document.getElementById('perf-table')), 'Kashf.xlsx')} className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
                <Download size={18}/> تصدير Excel
            </button>
            <button onClick={handleSave} disabled={isSaving || Object.keys(scores).length === 0} className="px-10 py-3 bg-brand-500 text-white rounded-2xl text-xs font-black shadow-xl shadow-brand-500/20 hover:bg-brand-600 transition-all flex items-center gap-2 disabled:opacity-50">
                {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} حفظ الرصد
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
        <div className="h-6 w-px bg-slate-200 mx-2"></div>
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
            <table id="perf-table" className="w-full text-right border-collapse">
                <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest sticky top-0 z-30">
                    <tr>
                        <th className="p-5 border-l border-white/5 w-14 text-center">م</th>
                        <th className="p-5 border-l border-white/5 sticky right-0 bg-slate-900 z-40 w-72">اسم الطالب الكامل</th>
                        <th className="p-5 border-l border-white/5 text-center">الدرجة المستحقة</th>
                        <th className="p-5 border-l border-white/5 text-center">مؤشر الإتقان</th>
                        <th className="p-5 text-center">آخر رصد</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((student, idx) => {
                        const existing = performance.find(p => p.studentId === student.id && p.notes === selectedAsgnId);
                        const currentScore = scores[student.id] !== undefined ? scores[student.id] : (existing ? existing.score.toString() : '');
                        const pct = Number(currentScore) / (activeAssignment?.maxScore || 10);
                        
                        return (
                            <tr key={student.id} className="hover:bg-indigo-50/20 h-16 transition-colors group">
                                <td className="p-4 text-center text-[10px] font-black text-slate-300 group-hover:text-brand-500">{idx + 1}</td>
                                <td className="p-4 font-black text-slate-800 sticky right-0 bg-white z-20 border-l group-hover:bg-indigo-50/50 transition-colors">{student.name}</td>
                                <td className="p-4 text-center">
                                    <div className="relative w-24 mx-auto">
                                        <input 
                                            type="number"
                                            className="w-full h-12 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-black text-lg text-brand-600 outline-none focus:bg-white focus:border-brand-500 transition-all shadow-inner"
                                            value={currentScore}
                                            placeholder="-"
                                            onChange={e => setScores({ ...scores, [student.id]: e.target.value })}
                                        />
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    {currentScore ? (
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-full max-w-[80px] h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all duration-700 ${pct >= 0.9 ? 'bg-emerald-500' : pct >= 0.7 ? 'bg-blue-500' : 'bg-rose-500'}`} style={{width: `${pct*100}%`}}></div>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400">{Math.round(pct*100)}%</span>
                                        </div>
                                    ) : '-'}
                                </td>
                                <td className="p-4 text-center font-black text-slate-400 text-xs italic">
                                    {existing ? existing.date : 'لم يتم الرصد'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default Performance;
