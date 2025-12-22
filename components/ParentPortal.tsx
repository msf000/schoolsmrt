import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorIncident, Task, MessageLog } from '../types';
import { saveAttendance, getBehaviorIncidents, getTasks, getMessages } from '../services/storageService';
import { 
    User, LogOut, AlertTriangle, Clock, MessageCircle, X, ShieldCheck, 
    Trophy, BookOpen, Bell, ChevronLeft, Star, Calendar, CheckCircle2, Zap, Radar as RadarIcon, TrendingUp, BarChart3
} from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';

interface ParentPortalProps {
    parentPhone: string;
    allStudents: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ parentPhone, allStudents, attendance, performance, onLogout }) => {
    const myChildren = useMemo(() => 
        allStudents.filter(s => s.parentPhone === parentPhone || s.parentPhone?.replace(/\s/g, '') === parentPhone),
    [allStudents, parentPhone]);

    const [activeChildId, setActiveChildId] = useState<string>(myChildren.length > 0 ? myChildren[0].id : '');
    const activeChild = myChildren.find(c => c.id === activeChildId) || myChildren[0];
    
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACADEMIC' | 'TASKS' | 'BEHAVIOR' | 'MESSAGES'>('OVERVIEW');
    const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
    const [selectedAbsentRecord, setSelectedAbsentRecord] = useState<AttendanceRecord | null>(null);
    const [excuseText, setExcuseText] = useState('');

    const [behaviorLog, setBehaviorLog] = useState<BehaviorIncident[]>([]);
    const [childTasks, setChildTasks] = useState<Task[]>([]);
    const [childMessages, setChildMessages] = useState<MessageLog[]>([]);

    useEffect(() => {
        if (activeChild) {
            setBehaviorLog(getBehaviorIncidents().filter((i: BehaviorIncident) => i.studentId === activeChild.id));
            setChildTasks(getTasks().filter((t: Task) => t.classId === activeChild.className));
            setChildMessages(getMessages().filter((m: MessageLog) => m.studentId === activeChild.id));
        }
    }, [activeChild, activeTab]);

    const stats = useMemo(() => {
        if (!activeChild) return null;
        const childAtt = attendance.filter(a => a.studentId === activeChild.id);
        const childPerf = performance.filter(p => p.studentId === activeChild.id);
        
        const absent = childAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const recentAtt = [...childAtt].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
        
        const avg = childPerf.length > 0 
            ? Math.round(childPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / childPerf.length * 100) 
            : 0;

        const radarData = [
            { subject: 'الحضور', A: 100 - (absent * 5) },
            { subject: 'الواجبات', A: avg },
            { subject: 'السلوك', A: 100 },
            { subject: 'التفاعل', A: 85 },
            { subject: 'التميز', A: 90 },
        ];

        return { absent, recentAtt, avg, radarData, childPerf };
    }, [activeChild, attendance, performance]);

    const handleSendExcuse = () => {
        if (!selectedAbsentRecord || !excuseText) return;
        const updated: AttendanceRecord = { ...selectedAbsentRecord, excuseNote: excuseText };
        saveAttendance([updated]);
        setIsExcuseModalOpen(false);
        setExcuseText('');
        alert('تم إرسال العذر للمعلم للمراجعة.');
    };

    if (!activeChild) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
            <User size={64} className="text-gray-300 mb-4"/>
            <h2 className="text-xl font-bold text-gray-800">لم يتم العثور على أبناء مرتبطين بهذا الرقم</h2>
            <button onClick={onLogout} className="mt-6 text-indigo-600 font-bold hover:underline flex items-center gap-2"><LogOut size={18}/> خروج</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-tajawal text-right pb-24 lg:pb-0" dir="rtl">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">ب</div>
                    <h1 className="text-lg font-black text-slate-800">بوابة ولي الأمر</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                        <User size={16} className="text-slate-500"/>
                        <select 
                            value={activeChildId} 
                            onChange={e => setActiveChildId(e.target.value)}
                            className="bg-transparent text-xs font-black outline-none text-slate-700"
                        >
                            {myChildren.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <button onClick={onLogout} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><LogOut size={20}/></button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-6xl mx-auto w-full">
                <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white mb-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-transparent opacity-50"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-white/20 rounded-[1.5rem] flex items-center justify-center text-4xl font-black backdrop-blur-md border border-white/20">{activeChild.name.charAt(0)}</div>
                            <div>
                                <h2 className="text-3xl font-black mb-2">{activeChild.name}</h2>
                                <div className="flex gap-3">
                                    <span className="bg-white/10 px-4 py-1 rounded-full text-xs font-bold border border-white/10">{activeChild.className}</span>
                                    <span className="bg-indigo-500 px-4 py-1 rounded-full text-xs font-black shadow-lg flex items-center gap-1"><Zap size={12} fill="white"/> {activeChild.behaviorPoints || 0} XP</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-12 text-center">
                            <div><p className="text-[10px] uppercase font-black text-indigo-300 tracking-widest mb-1">معدل الإتقان</p><p className="text-3xl font-black text-yellow-400">{stats?.avg}%</p></div>
                            <div><p className="text-[10px] uppercase font-black text-indigo-300 tracking-widest mb-1">أيام الغياب</p><p className="text-3xl font-black text-red-400">{stats?.absent}</p></div>
                        </div>
                    </div>
                </div>

                <div className="flex bg-white rounded-2xl p-1 mb-8 shadow-sm border border-slate-200 overflow-x-auto no-scrollbar">
                    <TabBtn active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} label="نظرة عامة" icon={<RadarIcon size={18}/>}/>
                    <TabBtn active={activeTab === 'ACADEMIC'} onClick={() => setActiveTab('ACADEMIC')} label="التحصيل" icon={<TrendingUp size={18}/>}/>
                    <TabBtn active={activeTab === 'TASKS'} onClick={() => setActiveTab('TASKS')} label="المهام" icon={<BookOpen size={18}/>}/>
                    <TabBtn active={activeTab === 'BEHAVIOR'} onClick={() => setActiveTab('BEHAVIOR')} label="السلوك" icon={<Star size={18}/>}/>
                    <TabBtn active={activeTab === 'MESSAGES'} onClick={() => setActiveTab('MESSAGES')} label="الرسائل" icon={<Bell size={18}/>}/>
                </div>

                <div className="animate-fade-in space-y-8">
                    {activeTab === 'OVERVIEW' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                                <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3"><RadarIcon className="text-indigo-600"/> رادار المهارات</h3>
                                <div className="h-80">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={stats?.radarData}>
                                            <PolarGrid stroke="#f1f5f9" />
                                            <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                            <Radar name="الأداء" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} strokeWidth={3} />
                                            <Tooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
                                    <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3"><Clock className="text-red-500"/> غياب يحتاج تبرير</h3>
                                    <div className="space-y-3">
                                        {stats?.recentAtt.filter((a: any) => a.status === AttendanceStatus.ABSENT).map((a: any) => (
                                            <div key={a.id} className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100">
                                                <div>
                                                    <p className="font-black text-red-900 text-sm">{formatDualDate(a.date)}</p>
                                                    <p className="text-[10px] text-red-600 font-bold uppercase">{a.subject || 'غائب كامل اليوم'}</p>
                                                </div>
                                                {a.excuseNote ? (
                                                    <span className="text-[10px] font-black bg-white text-green-600 px-3 py-1 rounded-full border border-green-100 flex items-center gap-1"><CheckCircle2 size={12}/> تم إرسال العذر</span>
                                                ) : (
                                                    <button onClick={() => { setSelectedAbsentRecord(a); setIsExcuseModalOpen(true); }} className="px-6 py-2 bg-red-600 text-white rounded-xl text-xs font-black shadow-lg hover:bg-red-700 active:scale-95 transition-all">تقديم عذر</button>
                                                )}
                                            </div>
                                        ))}
                                        {stats?.recentAtt.filter((a: any) => a.status === AttendanceStatus.ABSENT).length === 0 && <p className="text-center py-6 text-slate-400 font-bold text-xs italic">لا يوجد سجلات غياب حالياً ✨</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'ACADEMIC' && (
                        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                            <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3"><TrendingUp className="text-emerald-500"/> سجل الدرجات الأخير</h3>
                            <div className="space-y-4">
                                {stats?.childPerf.slice().reverse().map((p: any) => (
                                    <div key={p.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600"><BookOpen size={20}/></div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-sm">{p.title}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{p.subject} • {formatDualDate(p.date)}</p>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <span className="text-2xl font-black text-indigo-600">{p.score}</span>
                                            <span className="text-xs text-slate-300 font-bold mr-1">/ {p.maxScore}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'MESSAGES' && (
                        <div className="space-y-4">
                            {childMessages.map(m => (
                                <div key={m.id} className="bg-white p-6 rounded-[2rem] border-r-[6px] border-indigo-500 shadow-sm relative group">
                                    <div className="absolute top-4 left-4 p-2 text-indigo-100 group-hover:text-indigo-200 transition-colors"><Bell size={24}/></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{formatDualDate(m.date)}</p>
                                    <p className="text-slate-700 leading-relaxed font-bold">"{m.content}"</p>
                                    <div className="mt-4 pt-4 border-t border-slate-50 text-[10px] font-black text-indigo-600 uppercase tracking-widest">المرسل: {m.sentBy}</div>
                                </div>
                            ))}
                            {childMessages.length === 0 && <div className="text-center py-32 text-slate-300 italic"><Bell size={64} className="mx-auto mb-4 opacity-10"/><p className="font-black">لا توجد رسائل جديدة من المدرسة</p></div>}
                        </div>
                    )}
                </div>
            </main>

            {isExcuseModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-zoom-in border border-white/20">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-800">تقديم عذر غياب</h3>
                            <button onClick={() => setIsExcuseModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={28}/></button>
                        </div>
                        <div className="space-y-6">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">تاريخ الغياب</p>
                                <p className="font-black text-slate-700">{selectedAbsentRecord && formatDualDate(selectedAbsentRecord.date)}</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">نص العذر أو التوضيح</label>
                                <textarea 
                                    className="w-full p-4 border rounded-2xl bg-gray-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 outline-none h-32 font-bold text-slate-800 transition-all"
                                    placeholder="مثال: الطالب كان يعاني من حالة صحية..."
                                    value={excuseText}
                                    onChange={e => setExcuseText(e.target.value)}
                                />
                            </div>
                            <button onClick={handleSendExcuse} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">إرسال العذر للمدرسة</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TabBtn = ({ active, onClick, label, icon }: any) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-2 py-4 px-2 rounded-2xl transition-all font-black text-[10px] md:text-xs whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-slate-50'}`}
    >
        {icon} <span>{label}</span>
    </button>
);

export default ParentPortal;