
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, SystemUser, Assignment, AttendanceRecord } from '../types';
import { getAssignments, getTeacherAssignments, addPerformance, deletePerformance } from '../services/storageService';
import { 
    PlusCircle, Search, Trash2, Zap, ArrowRight, List, PieChart, TrendingUp, Sparkles, Loader2, Save, FileText, ChevronLeft
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
    if (currentUser) {
        setAssignments(getAssignments('ALL', currentUser.id, true));
    }
  }, [currentUser, activeTab]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
    return Array.from(classes).sort();
  }, [students, currentUser]);

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass]);

  const statsData = useMemo(() => {
    if (!selectedClass) return [];
    const classPerf = performance.filter(p => students.find(s => s.id === p.studentId && s.className === selectedClass));
    if (classPerf.length === 0) return [];

    const distribution = [
        { name: 'ممتاز', value: 0, fill: '#10B981' },
        { name: 'جيد جداً', value: 0, fill: '#3B82F6' },
        { name: 'مقبول', value: 0, fill: '#F59E0B' },
        { name: 'ضعيف', value: 0, fill: '#EF4444' },
    ];

    classPerf.forEach(p => {
        const ratio = p.score / p.maxScore;
        if (ratio >= 0.9) distribution[0].value++;
        else if (ratio >= 0.75) distribution[1].value++;
        else if (ratio >= 0.5) distribution[2].value++;
        else distribution[3].value++;
    });

    return distribution;
  }, [performance, selectedClass, students]);

  const handleBulkSave = async () => {
    const assign = assignments.find(a => a.id === activeAssignmentId);
    if (!assign || !selectedClass) return alert('الرجاء اختيار التقييم والفصل الدراسي.');
    
    setIsSaving(true);
    const records: PerformanceRecord[] = [];
    const today = new Date().toISOString().split('T')[0];

    Object.entries(bulkScores).forEach(([sid, score]) => {
        if (score === '') return;
        records.push({
            id: `${sid}_${assign.id}`,
            studentId: sid,
            subject: 'عام',
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
            alert('تم حفظ الدرجات وتحديث السجل السحابي بنجاح!');
        } catch (e) {
            alert('حدث خطأ في المزامنة السحابية.');
        } finally {
            setIsSaving(false);
        }
    } else {
        setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-[#F8FAFC] animate-fade-in pb-24 overflow-hidden font-tajawal">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
        <div className="flex bg-white p-1.5 rounded-2xl shadow-xl border border-slate-100">
            <button onClick={() => setActiveTab('BULK')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'BULK' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>رصد سريع</button>
            <button onClick={() => setActiveTab('ANALYTICS')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'ANALYTICS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>التحليل</button>
            <button onClick={() => setActiveTab('LOG')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'LOG' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>سجل الدرجات</button>
        </div>
        <div className="flex gap-4">
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-3 border rounded-xl bg-white font-black text-xs outline-none shadow-sm min-w-[180px]">
                <option value="">-- اختر الفصل --</option>
                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'BULK' && (
            <div className="flex-1 flex flex-col gap-6 animate-fade-in">
                <div className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-50 flex flex-col md:flex-row items-center gap-10">
                    <div className="p-5 bg-indigo-50 text-indigo-600 rounded-[1.5rem]"><Zap size={40} fill="currentColor"/></div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">الرصد الجماعي السريع</h3>
                        <p className="text-sm text-slate-400 font-bold mt-1 uppercase tracking-widest">اربط الرصد بعمود من "سجل الرصد" لتسهيل استخراج التقارير.</p>
                    </div>
                    <div className="w-full md:w-80">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-wider">الربط بتقييم مسبق:</label>
                        <select value={activeAssignmentId} onChange={e => setActiveAssignmentId(e.target.value)} className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10">
                            <option value="">-- اختر التقييم --</option>
                            {assignments.map(a => <option key={a.id} value={a.id}>{a.title} ({a.maxScore} درجة)</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-[3.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredStudents.length > 0 ? (
                            <table className="w-full text-right border-collapse">
                                <thead className="bg-[#F8FAFC] sticky top-0 z-10 border-b shadow-sm">
                                    <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest h-16">
                                        <th className="p-6 w-20 text-center border-l">م</th>
                                        <th className="p-6 border-l">اسم الطالب</th>
                                        <th className="p-6 w-48 text-center">الدرجة النهائية</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-bold">
                                    {filteredStudents.map((s, idx) => (
                                        <tr key={s.id} className="hover:bg-indigo-50/30 transition-all h-20">
                                            <td className="p-6 text-center font-mono text-slate-300 text-sm">{idx + 1}</td>
                                            <td className="p-6 text-slate-800 text-base">{s.name}</td>
                                            <td className="p-6">
                                                <input 
                                                    type="number" 
                                                    className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl text-center font-black text-xl text-indigo-600 focus:bg-white focus:border-indigo-500 outline-none transition-all shadow-inner" 
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
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-6 opacity-30">
                                <FileText size={100} strokeWidth={1.5}/>
                                <p className="text-3xl font-black">اختر الفصل لبدء الرصد الجماعي</p>
                            </div>
                        )}
                    </div>
                    <div className="p-8 bg-[#F8FAFC] border-t flex flex-col md:flex-row justify-between items-center gap-6">
                        <p className="text-xs font-black text-slate-400 max-w-md text-center md:text-right leading-relaxed uppercase tracking-widest">تأكد من مراجعة الدرجات قبل الحفظ، حيث سيتم إرسال إشعارات فورية لأولياء الأمور عبر البوابة.</p>
                        <button onClick={handleBulkSave} disabled={isSaving || filteredStudents.length === 0} className="w-full md:w-auto bg-indigo-600 text-white px-16 py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                            {isSaving ? <Loader2 size={24} className="animate-spin"/> : <Save size={24}/>}
                            حفظ وتأمين كشف الدرجات
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'ANALYTICS' && (
            <div className="flex-1 flex flex-col gap-8 animate-fade-in overflow-y-auto custom-scrollbar pb-10 pr-2">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50 h-[500px] flex flex-col">
                        <h3 className="text-2xl font-black text-slate-800 mb-12 flex items-center gap-3"><PieChart className="text-indigo-600" size={28}/> التوزيع الهرمي للمستويات</h3>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{fontSize: 14, fontWeight: 'black', fill: '#64748B'}} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)'}} />
                                    <Bar dataKey="value" radius={[0, 15, 15, 0]} barSize={50}>
                                        {statsData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-indigo-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between group">
                        <Sparkles className="absolute -bottom-20 -left-20 text-white opacity-10 rotate-12 pointer-events-none group-hover:scale-125 transition-transform duration-[2000ms]" size={400}/>
                        <div>
                            <div className="bg-white/10 w-fit p-4 rounded-3xl mb-8 backdrop-blur-xl border border-white/10"><TrendingUp className="text-yellow-400" size={32}/></div>
                            <h3 className="text-4xl font-black mb-6 tracking-tight">رؤى الأداء الذكية</h3>
                            <p className="text-indigo-100 text-xl leading-relaxed font-medium mb-12 opacity-80">
                                رصدنا استقراراً في نتائج فصل "{selectedClass || '...'}" بنسبة إتقان كلية تبلغ 
                                <span className="text-yellow-400 font-black text-5xl mx-4 drop-shadow-xl inline-block">
                                    {statsData.length > 0 ? Math.round((statsData[0].value / (statsData.reduce((a,b)=>a+b.value,0)||1))*100) : 0}%
                                </span>
                            </p>
                        </div>
                        <button onClick={() => navigate('/reports')} className="w-full bg-white text-indigo-900 py-6 rounded-[2rem] font-black text-lg shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-between px-10 group">
                            <span>فتح مركز التحليل الشامل</span>
                            <ChevronLeft className="group-hover:-translate-x-4 transition-transform" size={28}/>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'LOG' && (
            <div className="flex-1 bg-white rounded-[3.5rem] shadow-xl border border-slate-100 flex flex-col overflow-hidden animate-fade-in">
                <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800">السجل التاريخي للدرجات</h3>
                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                        <Sparkles size={14}/> إجمالي الدرجات المرصودة: {performance.length}
                    </div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-right">
                        <thead className="bg-[#F8FAFC] border-b text-slate-400 font-black uppercase tracking-widest text-[10px] sticky top-0 z-10">
                            <tr><th className="p-6">التاريخ</th><th className="p-6">الطالب</th><th className="p-6">التقييم</th><th className="p-6 text-center">الدرجة</th><th className="p-6 text-center">إجراءات</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold">
                            {performance.slice().reverse().map(rec => {
                                const s = students.find(std => std.id === rec.studentId);
                                return (
                                    <tr key={rec.id} className="hover:bg-indigo-50/20 transition-all group">
                                        <td className="p-6 text-slate-400 font-mono text-xs">{rec.date}</td>
                                        <td className="p-6">
                                            <p className="font-black text-slate-800">{s?.name || '---'}</p>
                                            <p className="text-[9px] text-slate-300 uppercase mt-1">{s?.className}</p>
                                        </td>
                                        <td className="p-6 text-slate-500 text-sm">{rec.title}</td>
                                        <td className="p-6 text-center">
                                            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl font-black">
                                                <span className="text-lg">{rec.score}</span>
                                                <span className="text-[10px] opacity-40">/ {rec.maxScore}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <button onClick={() => {if(confirm('هل تريد حذف هذه الدرجة من السجل؟')) onDeletePerformance(rec.id)}} className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default Performance;
