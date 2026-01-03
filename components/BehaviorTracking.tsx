
import React, { useState, useMemo, useEffect } from 'react';
import { Student, BehaviorIncident, SystemUser } from '../types';
import { getBehaviorIncidents, saveBehaviorIncident } from '../services/storageService';
import { 
    ShieldAlert, Star, Trophy, Trash2, Plus, Search, User, ArrowRight, TrendingUp, Sparkles, 
    Smile, Frown, Ghost, MessageSquare, CheckCircle, Zap, ShieldCheck, AlertTriangle, Filter, ChevronLeft
} from 'lucide-react';
import { formatDualDate } from '../services/dateService';

const CAT_POSITIVE = [
    { label: 'مشاركة فعالة', points: 10, icon: <Star size={16}/>, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'مساعدة زميل', points: 15, icon: <Sparkles size={16}/>, color: 'text-blue-600 bg-blue-50' },
    { label: 'حل الواجب', points: 5, icon: <CheckCircle size={16}/>, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'التميز الأكاديمي', points: 20, icon: <Trophy size={16}/>, color: 'text-amber-600 bg-amber-50' }
];

const CAT_NEGATIVE = [
    { label: 'تأخر عن الحصة', points: -5, icon: <Frown size={16}/>, color: 'text-rose-600 bg-rose-50' },
    { label: 'مقاطعة الشرح', points: -10, icon: <MessageSquare size={16}/>, color: 'text-orange-600 bg-orange-50' },
    { label: 'عدم إحضار الكتاب', points: -5, icon: <Ghost size={16}/>, color: 'text-slate-600 bg-slate-50' },
    { label: 'سلوك عدواني', points: -30, icon: <ShieldAlert size={16}/>, color: 'text-red-600 bg-red-50' }
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

    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) {
            setSelectedClass(uniqueClasses[0] || '');
        }
    }, [uniqueClasses, selectedClass]);

    const handleAddIncident = (cat: any, type: 'POSITIVE' | 'NEGATIVE') => {
        if (!selectedStudentId || !currentUser) return alert('الرجاء اختيار الطالب أولاً.');
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
        alert('تم الرصد بنجاح');
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
        <div className="space-y-6 page-enter font-tajawal">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">الانضباط والسلوك</h1>
                    <p className="text-slate-500 text-sm">تعزيز السلوك الإيجابي ومتابعة التنبيهات.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setView('LOG')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'LOG' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>أرشيف الإجراءات</button>
                    <button onClick={() => setView('ADD')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${view === 'ADD' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>رصد إجراء جديد</button>
                </div>
            </div>

            {view === 'ADD' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px] min-h-0">
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 flex flex-col gap-3">
                            <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-brand-500">
                                {uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="relative">
                                <Search size={14} className="absolute right-3 top-2.5 text-slate-400"/>
                                <input className="w-full pr-9 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                             {students.filter(s=>s.className===selectedClass && s.name.includes(searchTerm)).map(s=>(
                                 <button key={s.id} onClick={()=>setSelectedStudentId(s.id)} className={`w-full p-3 rounded-xl text-right font-bold text-xs transition-all flex justify-between items-center ${selectedStudentId === s.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <span>{s.name}</span>
                                    {selectedStudentId === s.id && <ChevronLeft size={14}/>}
                                 </button>
                             ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6 overflow-y-auto custom-scrollbar pr-1">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 text-emerald-600"><Star size={18} fill="currentColor"/> تعزيز إيجابي (XP+)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {CAT_POSITIVE.map(c => (
                                    <button key={c.label} onClick={()=>handleAddIncident(c, 'POSITIVE')} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center hover:bg-emerald-50 hover:border-emerald-200 transition-all text-right group">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${c.color}`}>{c.icon}</div>
                                            <span className="text-xs font-bold text-slate-700">{c.label}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-emerald-600">+{c.points} XP</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 text-rose-600"><AlertTriangle size={18} fill="currentColor"/> تنبيهات انضباطية (XP-)</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {CAT_NEGATIVE.map(c => (
                                    <button key={c.label} onClick={()=>handleAddIncident(c, 'NEGATIVE')} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center hover:bg-rose-50 hover:border-rose-200 transition-all text-right group">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${c.color}`}>{c.icon}</div>
                                            <span className="text-xs font-bold text-slate-700">{c.label}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-rose-600">{c.points} XP</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                    <div className="p-4 border-b bg-slate-50 flex justify-between items-center px-6">
                        <h3 className="text-sm font-bold text-slate-700">سجل الإجراءات المتخذة</h3>
                        <div className="flex items-center gap-4">
                            <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none">
                                {uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-right text-xs">
                            <thead className="bg-slate-50 border-b font-bold text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                                <tr>
                                    <th className="p-4">التاريخ</th>
                                    <th className="p-4">الطالب</th>
                                    <th className="p-4">الإجراء</th>
                                    <th className="p-4 text-center">التأثير</th>
                                    <th className="p-4 text-center">النوع</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredIncidents.map(i => {
                                    const s = students.find(x => x.id === i.studentId);
                                    return (
                                        <tr key={i.id} className="hover:bg-slate-50/50 transition-colors h-12">
                                            <td className="p-4 text-slate-400 font-medium">{formatDualDate(i.date)}</td>
                                            <td className="p-4 font-bold text-slate-700">{s?.name}</td>
                                            <td className="p-4 font-medium text-slate-500">{i.category}</td>
                                            <td className={`p-4 text-center font-black ${i.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {i.points > 0 ? `+${i.points}` : i.points}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${i.type === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
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
