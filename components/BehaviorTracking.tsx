
import React, { useState, useMemo, useEffect } from 'react';
import { Student, BehaviorIncident, SystemUser } from '../types';
import { getBehaviorIncidents, saveBehaviorIncident, getStudents } from '../services/storageService';
import { 
    ShieldAlert, Star, Trophy, Trash2, Plus, Search, User, ArrowLeft, TrendingUp, Sparkles, Smile, Frown, Ghost, MessageSquare, CheckCircle, Zap, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { formatDualDate } from '../services/dateService';

const CAT_POSITIVE = [
    { label: 'مشاركة فعالة', points: 10, icon: <Star className="text-yellow-500"/> },
    { label: 'مساعدة زميل', points: 15, icon: <Sparkles className="text-purple-500"/> },
    { label: 'حل الواجب', points: 5, icon: <CheckCircle className="text-emerald-500"/> },
    { label: 'التميز الأكاديمي', points: 20, icon: <Trophy className="text-indigo-500"/> }
];

const CAT_NEGATIVE = [
    { label: 'تأخر عن الحصة', points: -5, icon: <Frown className="text-red-500"/> },
    { label: 'مقاطعة الشرح', points: -10, icon: <MessageSquare className="text-orange-500"/> },
    { label: 'عدم إحضار الكتاب', points: -5, icon: <Ghost className="text-slate-500"/> },
    { label: 'سلوك عدواني', points: -30, icon: <ShieldAlert className="text-red-600"/> }
];

const BehaviorTracking: React.FC<{ students: Student[], currentUser?: SystemUser | null }> = ({ students: initialStudents, currentUser }) => {
    const [view, setView] = useState<'LOG' | 'ADD'>('LOG');
    const [incidents, setIncidents] = useState<BehaviorIncident[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (currentUser) setIncidents(getBehaviorIncidents(currentUser.id));
    }, [currentUser, view]);

    const students = useMemo(() => initialStudents, [initialStudents]);
    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

    const handleAddIncident = (cat: any, type: 'POSITIVE' | 'NEGATIVE') => {
        if (!selectedStudentId || !currentUser) return alert('الرجاء اختيار الطالب أولاً من القائمة الجانبية.');
        const incident: BehaviorIncident = {
            id: `beh_${Date.now()}`,
            studentId: selectedStudentId,
            teacherId: currentUser.id,
            type,
            category: cat.label,
            points: cat.points,
            date: new Date().toISOString(),
            note: 'رصد فوري من لوحة المعلم'
        };
        saveBehaviorIncident(incident);
        setView('LOG');
    };

    const filteredIncidents = useMemo(() => {
        return incidents.filter(i => {
            const student = students.find(s => s.id === i.studentId);
            if (!student) return false;
            if (selectedClass && student.className !== selectedClass) return false;
            if (searchTerm && !student.name.includes(searchTerm)) return false;
            return true;
        }).sort((a,b) => b.date.localeCompare(a.date));
    }, [incidents, selectedClass, searchTerm, students]);

    return (
        <div className="space-y-8 animate-fade-in font-tajawal pb-16">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-white p-8 rounded-[2.5rem] border shadow-sm overflow-hidden relative">
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-xl">
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800">الانضباط والتعزيز</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Behavior & Merit System</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl border relative z-10">
                    <button onClick={() => setView('LOG')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === 'LOG' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>
                        السجل التاريخي
                    </button>
                    <button onClick={() => setView('ADD')} className={`px-8 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === 'ADD' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>
                        رصد إجراء جديد
                    </button>
                </div>
            </div>

            {view === 'ADD' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up h-[600px] overflow-hidden">
                    <div className="lg:col-span-1 bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col gap-6 overflow-hidden">
                        <div className="flex justify-between items-center border-b pb-4">
                             <h3 className="font-black text-slate-800 flex items-center gap-3"><User size={20} className="text-blue-600"/> قائمة الطلاب</h3>
                             <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-2 bg-slate-50 border rounded-xl text-[10px] font-black outline-none">
                                <option value="">كافة الفصول</option>
                                {uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}
                             </select>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                             {students.filter(s=>!selectedClass || s.className===selectedClass).map(s=>(
                                 <button key={s.id} onClick={()=>setSelectedStudentId(s.id)} className={`w-full p-4 rounded-2xl border-2 text-right font-black text-sm transition-all flex justify-between items-center group ${selectedStudentId === s.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-slate-50 text-slate-700 hover:bg-slate-50'}`}>
                                    <span>{s.name.split(' ')[0]} {s.name.split(' ')[1]}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selectedStudentId === s.id ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>{s.className}</span>
                                 </button>
                             ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto custom-scrollbar pr-2 pb-10">
                        <div className="bg-white p-8 rounded-[3rem] border-t-8 border-emerald-500 shadow-sm">
                            <h4 className="font-black text-emerald-600 flex items-center gap-3 mb-8 text-lg"><Star fill="currentColor"/> تعزيز السلوك (XP+)</h4>
                            <div className="space-y-4">
                                {CAT_POSITIVE.map(c => (
                                    <button key={c.label} onClick={()=>handleAddIncident(c, 'POSITIVE')} className="w-full p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center hover:bg-emerald-50 hover:border-emerald-200 hover:scale-[1.02] transition-all font-black text-slate-700 group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">{c.icon}</div>
                                            <span>{c.label}</span>
                                        </div>
                                        <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-[10px] shadow-lg shadow-emerald-200">+{c.points} XP</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[3rem] border-t-8 border-rose-500 shadow-sm">
                            <h4 className="font-black text-rose-600 flex items-center gap-3 mb-8 text-lg"><AlertTriangle fill="currentColor"/> ملاحظات انضباطية (XP-)</h4>
                            <div className="space-y-4">
                                {CAT_NEGATIVE.map(c => (
                                    <button key={c.label} onClick={()=>handleAddIncident(c, 'NEGATIVE')} className="w-full p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center hover:bg-rose-50 hover:border-rose-200 hover:scale-[1.02] transition-all font-black text-slate-700 group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">{c.icon}</div>
                                            <span>{c.label}</span>
                                        </div>
                                        <span className="bg-rose-500 text-white px-4 py-1.5 rounded-xl text-[10px] shadow-lg shadow-rose-200">{c.points} XP</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-[3rem] border shadow-xl overflow-hidden flex flex-col animate-slide-up">
                    <div className="overflow-auto custom-scrollbar">
                         <table className="w-full text-right border-collapse text-sm">
                            <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-widest h-16 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-6 border-l border-slate-50">تاريخ الإجراء</th>
                                    <th className="p-6 border-l border-slate-50">اسم الطالب</th>
                                    <th className="p-6 border-l border-slate-50">التصنيف التربوي</th>
                                    <th className="p-6 text-center border-l border-slate-50">قيمة XP</th>
                                    <th className="p-6 text-center">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredIncidents.map(i => {
                                    const s = students.find(x => x.id === i.studentId);
                                    return (
                                        <tr key={i.id} className="hover:bg-blue-50/10 transition-colors h-16 group">
                                            <td className="p-6 text-slate-400 font-mono text-xs border-l border-slate-50">{formatDualDate(i.date)}</td>
                                            <td className="p-6 font-black text-slate-800 border-l border-slate-50">
                                                {s?.name}
                                                <p className="text-[9px] text-blue-600 font-black mt-1 uppercase">{s?.className}</p>
                                            </td>
                                            <td className="p-6 font-bold text-slate-500 border-l border-slate-50">{i.category}</td>
                                            <td className={`p-6 text-center font-black border-l border-slate-50 ${i.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                <div className="inline-flex items-center gap-1.5">
                                                    <Zap size={14} fill="currentColor"/> {i.points > 0 ? `+${i.points}` : i.points}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm border ${i.type === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                                                    {i.type === 'POSITIVE' ? 'تعزيز' : 'تنبيه'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                         </table>
                         {filteredIncidents.length === 0 && (
                             <div className="py-32 text-center text-slate-300 opacity-20 flex flex-col items-center">
                                 <ShieldCheck size={120}/>
                                 <p className="text-3xl font-black mt-6">لا توجد سجلات سلوكية سابقة</p>
                             </div>
                         )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BehaviorTracking;
