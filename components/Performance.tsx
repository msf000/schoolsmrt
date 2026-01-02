
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, SystemUser, Assignment, AttendanceRecord } from '../types';
import { getAssignments, addPerformance } from '../services/storageService';
import { 
    Save, Target, Filter, ChevronLeft, BarChart3, ClipboardCheck, Loader2
} from 'lucide-react';

interface PerformanceProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  onAddPerformance: (records: PerformanceRecord[]) => void;
  onDeletePerformance: (id: string) => void;
  currentUser?: SystemUser | null;
}

const Performance: React.FC<PerformanceProps> = ({ students, performance, onAddPerformance, onDeletePerformance, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'BULK' | 'LOG'>('BULK');
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
    if (!assign || !selectedClass) return alert('يرجى اختيار الفصل والتقييم أولاً.');
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
            alert('تم حفظ الدرجات بنجاح.'); 
        } catch (e) { alert('فشل في حفظ البيانات.'); }
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-6 page-enter font-tajawal">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">سجل الأداء والدرجات</h1>
            <p className="text-slate-500 text-sm">رصد درجات الاختبارات، الواجبات، والأنشطة الصفية.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={() => setActiveTab('BULK')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'BULK' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>رصد سريع</button>
            <button onClick={() => setActiveTab('LOG')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'LOG' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>الأرشيف</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {activeTab === 'BULK' && (
            <>
                <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex flex-wrap gap-4 items-end">
                    <div className="w-full md:w-64">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 mr-1">الفصل</label>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none">
                            <option value="">-- اختر الفصل --</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="w-full md:w-64">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 mr-1">التقييم المستهدف</label>
                        <select value={activeAssignmentId} onChange={e => setActiveAssignmentId(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none">
                            <option value="">-- اختر التقييم --</option>
                            {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.maxScore} درجة)</option>)}
                        </select>
                    </div>
                    <div className="flex-1"></div>
                    <button onClick={handleBulkSave} disabled={isSaving || !selectedClass} className="px-6 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 shadow-sm flex items-center gap-2 disabled:opacity-50">
                        {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} حفظ التغييرات
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {selectedClass ? (
                        <table className="w-full text-right text-sm">
                            <thead>
                                <tr className="text-slate-400 font-bold border-b border-slate-100">
                                    <th className="px-6 py-4 w-12">#</th>
                                    <th className="px-6 py-4">اسم الطالب</th>
                                    <th className="px-6 py-4 text-center w-48">الدرجة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStudents.map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors h-14">
                                        <td className="px-6 py-4 text-slate-300 font-medium">{idx + 1}</td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{s.name}</td>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="number" 
                                                className="w-full max-w-[120px] mx-auto p-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-brand-500 rounded-lg text-center font-bold text-brand-600 outline-none transition-all" 
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
                        <div className="py-32 text-center text-slate-300">
                            <ClipboardCheck size={64} className="mx-auto mb-4 opacity-20"/>
                            <p className="font-medium text-lg">يرجى اختيار الفصل والتقييم للبدء بالرصد</p>
                        </div>
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default Performance;
