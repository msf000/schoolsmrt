
import React, { useState, useMemo, useEffect } from 'react';
import { Student, BehaviorIncident, SystemUser } from '../types';
import { getBehaviorIncidents, saveBehaviorIncident, getStudents } from '../services/storageService';
import { 
    // Added AlertTriangle to the imported icons from lucide-react
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
        if (!selectedStudentId || !currentUser) return alert('اختر طالباً أولاً');
        const incident: BehaviorIncident = {
            id: `beh_${Date.now()}`,
            studentId: selectedStudentId,
            teacherId: currentUser.id,
            type,
            category: cat.label,
            points: cat.points,
            date: new Date().toISOString(),
            note: 'رصد فوري'
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
        <div className="p-4 md:p-8 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 shrink-0 gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3"><ShieldCheck className="text-indigo-600" size={36}/> سجل الانضباط والتميز</h2>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">تتبع رحلة التغيير السلوكي سحابياً</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl shadow-xl border border-slate-100">
                    <button onClick={() => setView('LOG')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === 'LOG' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>السجل التاريخي</button>
                    <button onClick={() => setView('ADD')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === 'ADD' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>رصد إجراء جديد</button>
                </div>
            </div>

            {view === 'ADD' ? (
                <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden animate-slide-up">
                    <div className="w-full lg:w-1/3 bg-white p-8 rounded-[3rem] border border-slate-50 shadow-xl flex flex-col gap-6 overflow-hidden">
                        <div className="flex items-center gap-4 border-b pb-6 shrink-0">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><User size={24}/></div>
                            <h3 className="font-black text-slate-800">اختيار الطالب</h3>
                        </div>
                        <select className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shrink-0" value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
                            <option value="">كل الفصول المسجلة</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                            {students.filter(s => !selectedClass || s.className === selectedClass).map(s => (
                                <button key={s.id} onClick={()=>setSelectedStudentId(s.id)} className={`w-full p-5 rounded-[2rem] border-2 text-right font-black text-sm transition-all flex justify-between items-center group ${selectedStudentId === s.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-2xl scale-[1.02]' : 'bg-white border-slate-50 text-slate-700 hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors ${selectedStudentId === s.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>{s.name.charAt(0)}</div>
                                        <span>{s.name.split(' ')[0]} {s.name.split(' ')[1]}</span>
                                    </div>
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 ${selectedStudentId === s.id ? 'bg-white/20' : 'bg-yellow-50 text-yellow-700'}`}><Zap size={10} fill="currentColor"/> {s.behaviorPoints || 0} XP</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-2 custom-scrollbar pb-20">
                        <div className="bg-white p-10 rounded-[3.5rem] border border-emerald-50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Sparkles size={200}/></div>
                            <h4 className="font-black text-emerald-600 flex items-center gap-4 mb-10 text-xl"><Trophy size={32}/> تعزيز التميز (Positive)</h4>
                            <div className="grid grid-cols-1 gap-4">
                                {CAT_POSITIVE.map(c => (
                                    <button key={c.label} onClick={()=>handleAddIncident(c, 'POSITIVE')} className="p-6 border-2 border-emerald-50 bg-emerald-50/10 rounded-[2.5rem] flex justify-between items-center hover:bg-emerald-600 hover:text-white hover:shadow-2xl hover:scale-105 transition-all font-black text-emerald-800 text-sm group">
                                        <div className="flex items-center gap-5">
                                            <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">{c.icon}</div>
                                            <span>{c.label}</span>
                                        </div>
                                        <span className="bg-emerald-500 text-white px-5 py-2 rounded-2xl text-[10px] shadow-lg shadow-emerald-900/20">+{c.points} XP</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-10 rounded-[3.5rem] border border-rose-50 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><ShieldAlert size={200}/></div>
                            <h4 className="font-black text-rose-600 flex items-center gap-4 mb-10 text-xl"><AlertTriangle size={32}/> تنبيه تربوي (Warning)</h4>
                            <div className="grid grid-cols-1 gap-4">
                                {CAT_NEGATIVE.map(c => (
                                    <button key={c.label} onClick={()=>handleAddIncident(c, 'NEGATIVE')} className="p-6 border-2 border-rose-50 bg-rose-50/10 rounded-[2.5rem] flex justify-between items-center hover:bg-rose-600 hover:text-white hover:shadow-2xl hover:scale-105 transition-all font-black text-rose-800 text-sm group">
                                        <div className="flex items-center gap-5">
                                            <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">{c.icon}</div>
                                            <span>{c.label}</span>
                                        </div>
                                        <span className="bg-rose-500 text-white px-5 py-2 rounded-2xl text-[10px] shadow-lg shadow-rose-900/20">{c.points} XP</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-white rounded-[4rem] border border-slate-50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-[0.2em] sticky top-0 z-10 h-20">
                                <tr><th className="p-6 border-l border-slate-50">التاريخ</th><th className="p-6 border-l border-slate-50">اسم الطالب</th><th className="p-6 border-l border-slate-50">الإجراء المتخذ</th><th className="p-6 text-center border-l border-slate-50">قيمة XP</th><th className="p-6 text-center">التصنيف</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredIncidents.map(i => {
                                    const s = students.find(x => x.id === i.studentId);
                                    return (
                                        <tr key={i.id} className="hover:bg-indigo-50/10 transition-all group h-16">
                                            <td className="p-6 text-slate-400 font-mono text-[11px] border-l border-slate-50">{formatDualDate(i.date)}</td>
                                            <td className="p-6 font-black text-slate-800 border-l border-slate-50">
                                                {s?.name} 
                                                <p className="text-[9px] text-slate-300 font-bold uppercase mt-1">{s?.className}</p>
                                            </td>
                                            <td className="p-6 font-bold text-slate-500 border-l border-slate-50">{i.category}</td>
                                            <td className={`p-6 text-center font-black border-l border-slate-50 ${i.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Zap size={14} fill="currentColor"/>
                                                    {i.points > 0 ? `+${i.points}` : i.points}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${i.type === 'POSITIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                    {i.type === 'POSITIVE' ? 'تعزيز' : 'تنبيه'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredIncidents.length === 0 && <div className="p-32 text-center text-slate-300 font-black text-xl opacity-20">لا توجد ملاحظات سلوكية مسجلة</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BehaviorTracking;
