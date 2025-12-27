
import React, { useState, useMemo, useEffect } from 'react';
import { Student, BehaviorIncident, SystemUser } from '../types';
import { getBehaviorIncidents, saveBehaviorIncident, getStudents } from '../services/storageService';
import { ShieldAlert, Star, Trophy, Trash2, Plus, Search, User, ArrowLeft, TrendingUp, Sparkles, Smile, Frown, Ghost, MessageSquare, CheckCircle } from 'lucide-react';
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
        alert('تم رصد الإجراء بنجاح');
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
        <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3"><ShieldAlert className="text-indigo-600"/> الانضباط والتميز</h2>
                <button onClick={() => setView(view === 'LOG' ? 'ADD' : 'LOG')} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition-all">
                    {view === 'LOG' ? <><Plus size={18}/> رصد جديد</> : <><ArrowLeft size={18}/> عرض السجل</>}
                </button>
            </div>

            {view === 'ADD' ? (
                <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden animate-slide-up">
                    <div className="w-full lg:w-1/3 bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col gap-6 overflow-y-auto">
                        <h3 className="font-black text-slate-800 border-b pb-4 flex items-center gap-2"><User size={18}/> الطالب المستهدف</h3>
                        <select className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10" value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
                            <option value="">-- كل الفصول --</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="flex-1 space-y-2">
                            {students.filter(s => !selectedClass || s.className === selectedClass).map(s => (
                                <button key={s.id} onClick={()=>setSelectedStudentId(s.id)} className={`w-full p-4 rounded-2xl border text-right font-bold text-sm transition-all flex justify-between items-center ${selectedStudentId === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-50 text-slate-700 hover:bg-gray-50'}`}>
                                    <span>{s.name}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selectedStudentId === s.id ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>{s.behaviorPoints || 0} XP</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="bg-white p-8 rounded-[3rem] border border-emerald-100 shadow-sm">
                            <h4 className="font-black text-emerald-600 flex items-center gap-3 mb-6"><Star size={24}/> تعزيز إيجابي</h4>
                            <div className="grid grid-cols-1 gap-3">
                                {CAT_POSITIVE.map(c => (
                                    <button key={c.label} onClick={()=>handleAddIncident(c, 'POSITIVE')} className="p-5 border border-emerald-50 bg-emerald-50/30 rounded-3xl flex justify-between items-center hover:bg-emerald-100 transition-all font-black text-emerald-800 text-sm group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">{c.icon}</div>
                                            <span>{c.label}</span>
                                        </div>
                                        <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px]">+{c.points} XP</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[3rem] border border-red-100 shadow-sm">
                            <h4 className="font-black text-red-600 flex items-center gap-3 mb-6"><ShieldAlert size={24}/> تنبيه سلوكي</h4>
                            <div className="grid grid-cols-1 gap-3">
                                {CAT_NEGATIVE.map(c => (
                                    <button key={c.label} onClick={()=>handleAddIncident(c, 'NEGATIVE')} className="p-5 border border-red-50 bg-red-50/30 rounded-3xl flex justify-between items-center hover:bg-red-100 transition-all font-black text-red-800 text-sm group">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">{c.icon}</div>
                                            <span>{c.label}</span>
                                        </div>
                                        <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[10px]">{c.points} XP</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-white rounded-[3rem] border shadow-sm flex flex-col overflow-hidden">
                    <div className="p-6 border-b bg-slate-50/50 flex flex-wrap gap-4 items-center">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                            <input className="w-full pr-10 pl-4 py-3 border border-slate-200 rounded-2xl text-sm font-bold shadow-inner" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-[#F8FAFC] border-b font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                                <tr><th className="p-5">التاريخ</th><th className="p-5">الطالب</th><th className="p-5">الإجراء</th><th className="p-5 text-center">النقاط</th><th className="p-5 text-center">الحالة</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredIncidents.map(i => {
                                    const s = students.find(x => x.id === i.studentId);
                                    return (
                                        <tr key={i.id} className="hover:bg-indigo-50/20 transition-all group">
                                            <td className="p-5 text-slate-400 font-mono text-[10px]">{formatDualDate(i.date)}</td>
                                            <td className="p-5 font-black text-slate-800">{s?.name} <span className="text-[10px] text-slate-300 font-bold">({s?.className})</span></td>
                                            <td className="p-5 font-bold text-slate-500">{i.category}</td>
                                            <td className={`p-5 text-center font-black ${i.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{i.points > 0 ? `+${i.points}` : i.points}</td>
                                            <td className="p-5 text-center">
                                                <span className={`px-4 py-1 rounded-full text-[10px] font-black ${i.type === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {i.type === 'POSITIVE' ? 'تعزيز' : 'تنبيه'}
                                                </span>
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
    );
};

export default BehaviorTracking;
