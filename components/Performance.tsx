
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, SystemUser, Assignment, AttendanceRecord } from '../types';
import { getAssignments, addPerformance } from '../services/storageService';
import { 
    PlusCircle, Trash2, Zap, ArrowRight, List, PieChart, TrendingUp, Sparkles, Loader2, Save, FileText, ChevronLeft
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatDualDate } from '../services/dateService';

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
    if (!assign || !selectedClass) return alert('اختر التقييم والفصل.');
    setIsSaving(true);
    const records: PerformanceRecord[] = [];
    const today = new Date().toISOString().split('T')[0];
    Object.entries(bulkScores).forEach(([sid, score]) => {
        if (score === '') return;
        records.push({
            id: `${sid}_${assign.id}`, studentId: sid, subject: 'عام', title: assign.title,
            category: assign.category, score: Number(score), maxScore: assign.maxScore,
            date: today, notes: assign.id, createdById: currentUser?.id
        });
    });
    if (records.length > 0) {
        try { await onAddPerformance(records); setBulkScores({}); alert('تم الحفظ بنجاح!'); }
        catch (e) { alert('فشل الحفظ.'); }
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200">
              <button onClick={() => setActiveTab('BULK')} className={`px-6 py-2 rounded-md text-sm font-bold ${activeTab === 'BULK' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>رصد سريع</button>
              <button onClick={() => setActiveTab('ANALYTICS')} className={`px-6 py-2 rounded-md text-sm font-bold ${activeTab === 'ANALYTICS' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>التحليل</button>
              <button onClick={() => setActiveTab('LOG')} className={`px-6 py-2 rounded-md text-sm font-bold ${activeTab === 'LOG' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>سجل السجل</button>
          </div>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 border rounded-lg bg-white text-xs font-bold outline-none shadow-sm min-w-[150px]">
              <option value="">-- اختر الفصل --</option>
              {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
      </div>

      {activeTab === 'BULK' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="p-4 bg-slate-50 border-b flex flex-wrap gap-4 items-center shrink-0">
                <div className="w-64">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">الربط بتقييم مسبق</label>
                    <select value={activeAssignmentId} onChange={e => setActiveAssignmentId(e.target.value)} className="w-full p-2 border rounded-md bg-white text-xs font-bold outline-none">
                        <option value="">-- اختر التقييم --</option>
                        {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.maxScore}د)</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {selectedClass ? (
                    <table className="w-full text-right border-collapse">
                        <thead className="bg-slate-50 border-b text-[11px] font-bold text-slate-500 uppercase sticky top-0 z-10 h-12">
                            <tr>
                                <th className="px-6 border-l w-16 text-center">م</th>
                                <th className="px-6 border-l">اسم الطالب</th>
                                <th className="px-6 text-center w-48">الدرجة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map((s, idx) => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors h-14">
                                    <td className="px-6 text-center text-slate-400 font-mono text-xs border-l">{idx + 1}</td>
                                    <td className="px-6 font-medium text-slate-700 border-l">{s.name}</td>
                                    <td className="px-6">
                                        <input type="number" className="w-full p-2 bg-slate-50 border rounded-md text-center font-bold text-blue-700 outline-none focus:bg-white" value={bulkScores[s.id] || ''} onChange={e => setBulkScores({...bulkScores, [s.id]: e.target.value})}/>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20 opacity-50"><FileText size={64}/><p className="mt-4 font-bold">يرجى اختيار الفصل للبدء.</p></div>
                )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end">
                <button onClick={handleBulkSave} disabled={isSaving || !selectedClass} className="px-10 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm flex items-center gap-2">
                    {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} اعتماد الدرجات
                </button>
            </div>
          </div>
      )}

      {activeTab === 'LOG' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-right border-collapse text-sm">
                      <thead className="bg-slate-50 border-b text-[11px] font-bold text-slate-500 uppercase sticky top-0 z-10 h-12">
                          <tr><th className="px-6 border-l">التاريخ</th><th className="px-6 border-l">الطالب</th><th className="px-6 border-l">التقييم</th><th className="px-6 text-center">الدرجة</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {performance.slice().reverse().map(rec => (
                              <tr key={rec.id} className="hover:bg-slate-50 h-12">
                                  <td className="px-6 text-slate-400 font-mono border-l">{rec.date}</td>
                                  <td className="px-6 font-medium text-slate-700 border-l">{students.find(s=>s.id===rec.studentId)?.name}</td>
                                  <td className="px-6 text-slate-500 border-l">{rec.title}</td>
                                  <td className="px-6 text-center font-bold text-blue-600">{rec.score} / {rec.maxScore}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default Performance;
