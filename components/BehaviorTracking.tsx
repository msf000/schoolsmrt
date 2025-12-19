
import React, { useState, useMemo, useEffect } from 'react';
import { Student, BehaviorIncident, SystemUser, AcademicTerm } from '../types';
import { getBehaviorIncidents, saveBehaviorIncident, getAcademicTerms, getTeacherAssignments } from '../services/storageService';
import { ShieldAlert, Star, Trophy, Trash2, Plus, Search, Calendar, User, MessageCircle, ArrowLeft, Filter, TrendingUp, AlertTriangle } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface BehaviorTrackingProps {
    students: Student[];
    currentUser?: SystemUser | null;
}

const CAT_POSITIVE = [
    { label: 'مشاركة فعالة', points: 10 },
    { label: 'مساعدة زميل', points: 15 },
    { label: 'حل الواجب', points: 5 },
    { label: 'التميز الأكاديمي', points: 20 },
    { label: 'المحافظة على النظافة', points: 10 }
];

const CAT_NEGATIVE = [
    { label: 'تأخر عن الحصة', points: -5 },
    { label: 'مقاطعة الشرح', points: -10 },
    { label: 'عدم إحضار الكتاب', points: -5 },
    { label: 'سلوك عدواني', points: -30 },
    { label: 'إهمال الواجب', points: -10 }
];

const BehaviorTracking: React.FC<BehaviorTrackingProps> = ({ students, currentUser }) => {
    const [view, setView] = useState<'LOG' | 'ADD'>('LOG');
    const [incidents, setIncidents] = useState<BehaviorIncident[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (currentUser) setIncidents(getBehaviorIncidents(currentUser.id));
    }, [currentUser, view]);

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
            note: ''
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
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Trophy className="text-yellow-500"/> سجل الانضباط والتميز</h2>
                </div>
                <button onClick={() => setView(view === 'LOG' ? 'ADD' : 'LOG')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                    {view === 'LOG' ? <><Plus size={18}/> رصد إجراء</> : <><ArrowLeft size={18}/> السجل</>}
                </button>
            </div>

            {view === 'ADD' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 animate-slide-up">
                    <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-6">
                        <h3 className="font-bold text-gray-800 border-b pb-3 flex items-center gap-2"><User size={18}/> اختيار الطالب</h3>
                        <div className="flex gap-2">
                            <select className="flex-1 p-3 border rounded-xl bg-gray-50 font-bold" value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
                                <option value="">-- كل الفصول --</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <select className="flex-[2] p-3 border rounded-xl bg-gray-50 font-bold" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                                <option value="">-- اختر طالباً --</option>
                                {students.filter(s => !selectedClass || s.className === selectedClass).map(s => <option key={s.id} value={s.id}>{s.name} ({s.behaviorPoints || 0} ن)</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar pr-2">
                            <h4 className="font-bold text-green-600 flex items-center gap-2 mt-4"><Star size={18}/> تعزيز إيجابي</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {CAT_POSITIVE.map(c => (
                                    <button key={c.label} onClick={()=>handleAddIncident(c, 'POSITIVE')} className="p-4 border border-green-100 bg-green-50 rounded-2xl flex justify-between items-center hover:bg-green-100 transition-all font-bold text-green-800">
                                        <span>{c.label}</span>
                                        <span className="bg-white px-3 py-1 rounded-full text-xs">+{c.points} ن</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border shadow-sm">
                        <h4 className="font-bold text-red-600 flex items-center gap-2 mb-4"><ShieldAlert size={18}/> رصد مخالفة</h4>
                        <div className="grid grid-cols-1 gap-2">
                            {CAT_NEGATIVE.map(c => (
                                <button key={c.label} onClick={()=>handleAddIncident(c, 'NEGATIVE')} className="p-4 border border-red-100 bg-red-50 rounded-2xl flex justify-between items-center hover:bg-red-100 transition-all font-bold text-red-800">
                                    <span>{c.label}</span>
                                    <span className="bg-white px-3 py-1 rounded-full text-xs">{c.points} ن</span>
                                </button>
                            ))}
                        </div>
                        <div className="mt-8 p-6 bg-blue-50 rounded-3xl border border-blue-100 text-blue-800">
                            <h5 className="font-black mb-2 flex items-center gap-2"><TrendingUp size={16}/> أثر السلوك</h5>
                            <p className="text-xs leading-relaxed opacity-80 font-medium">الرصد السلوكي يساعد النظام الذكي على التنبؤ بمستوى الطالب الدراسي المستقبلي وتقديم توصيات مخصصة لولي الأمر.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 items-center">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
                            <input className="w-full pr-10 pl-4 py-2 border rounded-xl text-sm" placeholder="بحث..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                        </div>
                        <select className="p-2 border rounded-xl text-sm font-bold bg-white" value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}>
                            <option value="">الفصول: الكل</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 border-b font-black text-gray-600 sticky top-0 z-10 shadow-sm">
                                <tr><th className="p-4">التاريخ</th><th className="p-4">الطالب</th><th className="p-4">الإجراء</th><th className="p-4 text-center">النقاط</th><th className="p-4">الحالة</th></tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredIncidents.map(i => {
                                    const s = students.find(x => x.id === i.studentId);
                                    return (
                                        <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-gray-400 font-mono text-[10px]">{formatDualDate(i.date)}</td>
                                            <td className="p-4 font-bold text-gray-800">{s?.name} <span className="text-[10px] text-gray-400">({s?.className})</span></td>
                                            <td className="p-4 font-medium text-gray-600">{i.category}</td>
                                            <td className={`p-4 text-center font-black ${i.points > 0 ? 'text-green-600' : 'text-red-600'}`}>{i.points > 0 ? `+${i.points}` : i.points}</td>
                                            <td className="p-4">
                                                {i.type === 'POSITIVE' ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold">تعزيز</span> : <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold">تنبيه</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredIncidents.length === 0 && <tr><td colSpan={5} className="p-20 text-center text-gray-300 font-black">لا توجد سجلات سلوكية مرصودة حالياً</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BehaviorTracking;
