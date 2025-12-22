import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, SystemUser, Assignment, AttendanceRecord, AttendanceStatus } from '../types';
import { getAssignments, getTeacherAssignments, saveAssignment } from '../services/storageService';
import { 
    PlusCircle, Search, Trash2, Zap, ArrowRight, List, PieChart, TrendingUp, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PerformanceProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  onAddPerformance: (record: PerformanceRecord | PerformanceRecord[]) => void;
  onImportPerformance: (records: PerformanceRecord[]) => void;
  onDeletePerformance: (id: string) => void;
  currentUser?: SystemUser | null;
}

const Performance: React.FC<PerformanceProps> = ({ students, performance, onAddPerformance, onDeletePerformance, currentUser }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'BULK' | 'LOG' | 'ANALYTICS'>('BULK');
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkScores, setBulkScores] = useState<Record<string, string>>({});
  const [activeAssignmentId, setActiveAssignmentId] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    if (currentUser) {
        setAssignments(getAssignments('ALL', currentUser.id, true));
    }
  }, [currentUser, activeTab]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach((a: any) => classes.add(a.classId));
    return Array.from(classes).sort();
  }, [students, currentUser]);

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass]);

  const distributionData = useMemo(() => {
    if (!selectedClass) return [];
    const classPerf = performance.filter(p => students.find(s => s.id === p.studentId && s.className === selectedClass));
    if (classPerf.length === 0) return [];

    const stats = { excellent: 0, good: 0, average: 0, weak: 0 };
    classPerf.forEach(p => {
        const ratio = p.score / p.maxScore;
        if (ratio >= 0.9) stats.excellent++;
        else if (ratio >= 0.75) stats.good++;
        else if (ratio >= 0.5) stats.average++;
        else stats.weak++;
    });

    return [
        { name: 'ممتاز', value: stats.excellent, fill: '#10B981' },
        { name: 'جيد جداً', value: stats.good, fill: '#3B82F6' },
        { name: 'مقبول', value: stats.average, fill: '#F59E0B' },
        { name: 'ضعيف', value: stats.weak, fill: '#EF4444' },
    ];
  }, [performance, selectedClass, students]);

  const handleBulkSubmit = () => {
    const assign = assignments.find(a => a.id === activeAssignmentId);
    if (!assign || !selectedClass) return alert('اختر الفصل والعمود المربوط');
    
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
        onAddPerformance(records);
        setBulkScores({});
        alert('تم رصد الدرجات بنجاح!');
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in pb-24 overflow-hidden font-tajawal">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            <button onClick={() => setActiveTab('BULK')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'BULK' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>رصد سريع</button>
            <button onClick={() => setActiveTab('ANALYTICS')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'ANALYTICS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>التحليل</button>
            <button onClick={() => setActiveTab('LOG')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'LOG' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>سجل الدرجات</button>
        </div>
        <div className="flex gap-2">
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2.5 border rounded-xl bg-white font-black text-xs outline-none shadow-sm min-w-[150px]">
                <option value="">اختر الفصل...</option>
                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'BULK' && (
            <div className="flex-1 flex flex-col gap-6 animate-fade-in">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col md:flex-row items-center gap-6">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl"><Zap size={32}/></div>
                    <div className="flex-1">
                        <h3 className="text-xl font-black text-slate-800">الرصد الجماعي السريع</h3>
                        <p className="text-xs text-slate-400 font-bold">اربط الرصد بعمود من "سجل الرصد" لتسهيل استخراج التقارير لاحقاً.</p>
                    </div>
                    <div className="w-full md:w-64">
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">ربط بالتقييم:</label>
                        <select value={activeAssignmentId} onChange={e => setActiveAssignmentId(e.target.value)} className="w-full p-2.5 border rounded-xl bg-gray-50 font-bold text-sm">
                            <option value="">-- اختر تقييماً --</option>
                            {assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {filteredStudents.length > 0 ? (
                            <table className="w-full text-right">
                                <thead className="bg-slate-50 sticky top-0 z-10 border-b">
                                    <tr><th className="p-5 w-12 text-center text-slate-300">#</th><th className="p-5 font-black text-sm text-slate-700">اسم الطالب</th><th className="p-5 w-32 text-center font-black text-sm text-slate-700">الدرجة</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredStudents.map((s, idx) => (
                                        <tr key={s.id} className="hover:bg-indigo-50/20 transition-all">
                                            <td className="p-5 text-center font-mono text-slate-300 text-xs">{idx + 1}</td>
                                            <td className="p-5 font-black text-slate-700">{s.name}</td>
                                            <td className="p-3">
                                                <input 
                                                    type="number" 
                                                    className="w-full p-3 bg-slate-50 border-none rounded-2xl text-center font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500" 
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
                            <div className="flex flex-col items-center justify-center h-full text-slate-300">
                                <List size={64} className="opacity-10 mb-4"/>
                                <p className="font-black text-lg">اختر فصلاً للبدء بالرصد</p>
                            </div>
                        )}
                    </div>
                    <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
                        <span className="text-xs font-black text-slate-400">سيتم حفظ الدرجات في السجل التاريخي فور الضغط على حفظ.</span>
                        <button onClick={handleBulkSubmit} className="bg-indigo-600 text-white px-10 py-3.5 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95">حفظ وتأمين السجل</button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'ANALYTICS' && (
            <div className="flex-1 flex flex-col gap-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                    <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col">
                        <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3"><PieChart className="text-indigo-600"/> توزيع المستويات</h3>
                        <div className="flex-1 min-h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={distributionData} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" tick={{fontSize: 12, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                    <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                                    <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                                        {distributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-indigo-900 text-white p-8 rounded-[3rem] shadow-2xl flex flex-col justify-center relative overflow-hidden">
                        <Sparkles className="absolute -bottom-10 -left-10 text-white opacity-10" size={200}/>
                        <h3 className="text-2xl font-black mb-4 flex items-center gap-3"><TrendingUp className="text-yellow-400"/> نظرة تحليلية</h3>
                        <p className="text-indigo-100 leading-relaxed font-medium mb-8">
                            بناءً على الدرجات المرصودة للفصل "{selectedClass || '...'}"، نلاحظ أن نسبة الإتقان الكلية تبلغ 
                            <span className="text-yellow-400 font-black text-2xl mx-2">
                                {distributionData.length > 0 ? Math.round((distributionData[0].value / (distributionData.reduce((a,b)=>a+b.value,0)||1))*100) : 0}%
                            </span>
                            وهي علامة استقرار جيدة.
                        </p>
                        <button onClick={() => navigate('/reports')} className="bg-white/10 hover:bg-white/20 border border-white/20 p-4 rounded-2xl font-black text-sm flex items-center justify-between transition-all group">
                            <span>فتح مركز التقارير التفصيلي</span>
                            <ArrowRight className="group-hover:translate-x-[-8px] transition-transform"/>
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'LOG' && (
            <div className="flex-1 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col overflow-hidden animate-fade-in">
                <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold shadow-sm" placeholder="بحث باسم الطالب أو التقييم..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b text-slate-500 font-black">
                            <tr><th className="p-5">التاريخ</th><th className="p-5">الطالب</th><th className="p-5">التقييم</th><th className="p-5 text-center">الدرجة</th><th className="p-5 text-center">إجراء</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 font-bold">
                            {performance.filter(p => !searchTerm || p.title.includes(searchTerm) || students.find(s=>s.id===p.studentId)?.name.includes(searchTerm)).slice().reverse().map(rec => {
                                const s = students.find(std => std.id === rec.studentId);
                                return (
                                    <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-5 text-slate-400 font-mono">{rec.date}</td>
                                        <td className="p-5">
                                            <p className="font-black text-slate-800">{s?.name || 'غير مسجل'}</p>
                                            <p className="text-[9px] text-slate-400">{s?.className}</p>
                                        </td>
                                        <td className="p-5 text-slate-500">{rec.title}</td>
                                        <td className="p-5 text-center font-black text-indigo-600 text-sm">{rec.score} <span className="text-[10px] text-slate-300">/ {rec.maxScore}</span></td>
                                        <td className="p-5 text-center">
                                            <button onClick={() => {if(confirm('حذف؟')) onDeletePerformance(rec.id)}} className="p-2 text-slate-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
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