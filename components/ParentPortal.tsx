import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorIncident, Task, MessageLog } from '../types';
import { saveAttendance, getBehaviorIncidents, getTasks, getMessages, submitTask } from '../services/storageService';
import { 
    User, LogOut, AlertTriangle, Clock, MessageCircle, X, ShieldCheck, 
    Trophy, BookOpen, Bell, ChevronLeft, Star, Calendar, CheckCircle2, Zap, Radar as RadarIcon, TrendingUp, BarChart3
} from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

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
            setBehaviorLog(getBehaviorIncidents().filter(i => i.studentId === activeChild.id));
            setChildTasks(getTasks().filter(t => t.classId === activeChild.className));
            setChildMessages(getMessages().filter(m => m.studentId === activeChild.id));
        }
    }, [activeChild, activeTab]);

    const stats = useMemo(() => {
        if (!activeChild) return null;
        const childAtt = attendance.filter(a => a.studentId === activeChild.id);
        const childPerf = performance.filter(p => p.studentId === activeChild.id);
        
        const absent = childAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const unexcused = childAtt.filter(a => a.status === AttendanceStatus.ABSENT && !a.excuseNote);
        const recentAtt = [...childAtt].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
        
        const avg = childPerf.length > 0 ? Math.round(childPerf.reduce((a,b)=>a+(b.score/b.maxScore),0)/childPerf.length*100) : 0;
        
        const calcAvg = (items: PerformanceRecord[]) => {
            if (items.length === 0) return avg;
            return Math.round(items.reduce((a, b) => a + (b.score / b.maxScore), 0) / items.length * 100);
        };

        const radarData = [
            { subject: 'الانضباط', A: Math.max(0, 100 - (absent * 5)) },
            { subject: 'المشاركة', A: Math.min(100, (activeChild.behaviorPoints || 0) * 5) },
            { subject: 'الواجبات', A: calcAvg(childPerf.filter(p => p.category === 'HOMEWORK')) },
            { subject: 'الأنشطة', A: calcAvg(childPerf.filter(p => p.category === 'ACTIVITY')) },
            { subject: 'الاختبارات', A: calcAvg(childPerf.filter(p => p.category === 'PLATFORM_EXAM')) },
        ];

        return { absent, unexcused, recentAtt, avg, radarData, childPerf };
    }, [activeChild, attendance, performance]);

    const handleSubmitExcuse = () => {
        if (!selectedAbsentRecord || !excuseText) return;
        const updated: AttendanceRecord = { ...selectedAbsentRecord, excuseNote: excuseText };
        saveAttendance([updated]);
        setIsExcuseModalOpen(false);
        setExcuseText('');
        alert('تم إرسال العذر بنجاح.');
    };

    if (!activeChild) return <div className="p-20 text-center font-bold">لم يتم العثور على بيانات أبناء مرتبطة بهذا الرقم.</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans mb-20" dir="rtl">
            <header className="bg-white border-b p-4 sticky top-0 z-30 shadow-sm">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><User size={20}/></div>
                        <div><h1 className="font-black text-gray-800 text-sm">بوابة ولي الأمر</h1><p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">Smart Parent Portal</p></div>
                    </div>
                    <button onClick={onLogout} className="text-red-500 p-2 hover:bg-red-50 rounded-xl transition-colors"><LogOut size={20}/></button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto w-full p-4 flex-1 space-y-6 pb-20">
                {myChildren.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {myChildren.map(c => (
                            <button key={c.id} onClick={() => setActiveChildId(c.id)} className={`px-5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${activeChildId === c.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400 border'}`}>
                                {c.name.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                )}

                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-700"><Zap size={150}/></div>
                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 text-4xl font-black border-2 border-white shadow-inner">{activeChild.name.charAt(0)}</div>
                    <div className="flex-1 text-center md:text-right">
                        <h2 className="text-2xl font-black text-gray-800">{activeChild.name}</h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                            <span className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-black text-gray-500 uppercase">{activeChild.className}</span>
                            <span className="bg-indigo-50 px-3 py-1 rounded-full text-[10px] font-black text-indigo-600 flex items-center gap-1 shadow-sm"><Zap size={10} fill="currentColor"/> {activeChild.behaviorPoints || 0} نقطة تميز</span>
                        </div>
                    </div>
                    <div className="flex gap-6">
                        <div className="text-center"><p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">المعدل</p><p className="text-3xl font-black text-indigo-600">{stats?.avg}%</p></div>
                        <div className="text-center"><p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-widest">الحضور</p><p className="text-3xl font-black text-green-600">{Math.max(0, 100 - (stats?.absent || 0) * 5)}%</p></div>
                    </div>
                </div>

                <div className="flex bg-white rounded-2xl border p-1 shadow-sm sticky top-20 z-20 overflow-x-auto no-scrollbar">
                    <TabBtn label="نظرة عامة" active={activeTab==='OVERVIEW'} onClick={()=>setActiveTab('OVERVIEW')} icon={<Clock size={16}/>}/>
                    <TabBtn label="الأداء" active={activeTab==='ACADEMIC'} onClick={()=>setActiveTab('ACADEMIC')} icon={<TrendingUp size={16}/>}/>
                    <TabBtn label="الواجبات" active={activeTab==='TASKS'} onClick={()=>setActiveTab('TASKS')} icon={<BookOpen size={16}/>}/>
                    <TabBtn label="السلوك" active={activeTab==='BEHAVIOR'} onClick={()=>setActiveTab('BEHAVIOR')} icon={<Star size={16}/>}/>
                    <TabBtn label="الرسائل" active={activeTab==='MESSAGES'} onClick={()=>setActiveTab('MESSAGES')} icon={<Bell size={16}/>}/>
                </div>

                <div className="animate-fade-in">
                    {activeTab === 'OVERVIEW' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col h-80">
                                <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2 text-sm"><RadarIcon size={18} className="text-indigo-600"/> الرادار التحليلي</h3>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart data={stats?.radarData}>
                                            <PolarGrid stroke="#f1f5f9" />
                                            <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                                            <Radar name="الابن" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.3} strokeWidth={3} />
                                            <Tooltip />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {stats && stats.unexcused.length > 0 && (
                                    <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100 shadow-sm animate-pulse">
                                        <h3 className="font-black text-red-700 flex items-center gap-2 mb-3 text-sm"><AlertTriangle size={18}/> تنبيه غياب</h3>
                                        <div className="space-y-2">
                                            {stats.unexcused.map(rec => (
                                                <div key={rec.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-red-100">
                                                    <span className="text-xs font-bold text-gray-700">{formatDualDate(rec.date)}</span>
                                                    <button onClick={() => { setSelectedAbsentRecord(rec); setIsExcuseModalOpen(true); }} className="text-[10px] bg-red-600 text-white px-4 py-1.5 rounded-lg font-black shadow-sm">تبرير الغياب</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border h-fit">
                                    <h3 className="font-black text-gray-800 mb-4 text-sm flex items-center gap-2 border-b pb-3"><Clock size={18} className="text-indigo-600"/> آخر الحضور</h3>
                                    <div className="space-y-2">
                                        {stats?.recentAtt?.map(rec => (
                                            <div key={rec.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                                <span className="text-xs font-bold text-gray-600">{formatDualDate(rec.date)}</span>
                                                <span className={`text-[10px] font-black px-3 py-1 rounded-full ${rec.status === 'PRESENT' ? 'bg-green-100 text-green-700' : rec.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{rec.status === 'PRESENT' ? 'حاضر' : rec.status === 'ABSENT' ? 'غائب' : 'تأخر'}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ACADEMIC' && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                                <h3 className="font-black text-gray-800 mb-8 flex items-center gap-2 text-sm"><BarChart3 size={18} className="text-indigo-600"/> سجل الدرجات الأخير</h3>
                                <div className="space-y-4">
                                    {stats?.childPerf.slice().reverse().map(p => (
                                        <div key={p.id} className="p-4 bg-gray-50 rounded-2xl border flex justify-between items-center group hover:border-indigo-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white shadow-sm ${p.score/p.maxScore >= 0.9 ? 'bg-green-500' : p.score/p.maxScore >= 0.6 ? 'bg-blue-500' : 'bg-red-500'}`}>{p.score}</div>
                                                <div><h4 className="font-bold text-gray-800 text-sm">{p.title}</h4><p className="text-[10px] text-gray-400 font-bold uppercase">{p.subject} • {p.date}</p></div>
                                            </div>
                                            <div className="text-left font-black text-gray-400 text-xs">/ {p.maxScore}</div>
                                        </div>
                                    ))}
                                    {stats?.childPerf.length === 0 && <div className="p-20 text-center text-gray-300 font-bold">لا توجد درجات مرصودة حالياً.</div>}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'TASKS' && (
                        <div className="space-y-4">
                            {childTasks.map(task => (
                                <div key={task.id} className="bg-white p-6 rounded-[2.5rem] border shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div><span className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-3 py-1 rounded-full mb-2 inline-block uppercase tracking-widest">{task.type}</span><h4 className="font-black text-gray-800 text-lg">{task.title}</h4></div>
                                        <div className="text-left"><p className="text-[10px] font-bold text-gray-400 uppercase">موعد التسليم</p><p className="text-sm font-black text-red-500">{task.dueDate}</p></div>
                                    </div>
                                    <p className="text-sm text-gray-500 leading-relaxed mb-6">{task.description}</p>
                                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                        <span className="text-xs font-bold text-gray-400">{task.subject} • {task.maxScore} درجة</span>
                                        {task.submissions.includes(activeChild.id) ? 
                                            <span className="flex items-center gap-2 text-green-600 text-xs font-black bg-green-50 px-3 py-1.5 rounded-xl"><CheckCircle2 size={16}/> تم تسليم الحل</span> :
                                            <span className="flex items-center gap-2 text-orange-500 text-xs font-black bg-orange-50 px-3 py-1.5 rounded-xl"><Clock size={16}/> بانتظار الحل</span>
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'BEHAVIOR' && (
                        <div className="space-y-4">
                            <div className="bg-indigo-900 p-8 rounded-[3rem] text-white mb-6 shadow-xl relative overflow-hidden">
                                <Trophy className="absolute -bottom-4 -left-4 opacity-20" size={120}/>
                                <p className="text-xs font-bold opacity-70 mb-2 uppercase tracking-widest">إجمالي نقاط التميز</p>
                                <h3 className="text-6xl font-black">{activeChild.behaviorPoints || 0}</h3>
                            </div>
                            {behaviorLog.map(i => (
                                <div key={i.id} className={`p-5 rounded-[2rem] border flex gap-4 transition-all hover:shadow-md ${i.type === 'POSITIVE' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                    <div className={`p-3 rounded-2xl h-fit shadow-inner ${i.type === 'POSITIVE' ? 'bg-white text-green-600' : 'bg-white text-red-600'}`}>
                                        {i.type === 'POSITIVE' ? <Star size={24} fill="currentColor"/> : <AlertTriangle size={24}/>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-black text-gray-800">{i.category}</h4>
                                            <span className="text-[10px] font-bold text-gray-400 font-mono">{formatDualDate(i.date)}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-3 leading-relaxed">{i.note || (i.type === 'POSITIVE' ? 'تميز الطالب في سلوكه التعليمي' : 'تنبيه سلوكي من إدارة المدرسة')}</p>
                                        <span className={`text-[10px] font-black px-3 py-1 rounded-full shadow-sm ${i.points > 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                            {i.points > 0 ? '+' : ''}{i.points} نقطة
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {behaviorLog.length === 0 && <div className="p-20 text-center text-gray-300 font-black bg-white rounded-[3rem] border-2 border-dashed">سجل السلوك نظيف دائماً بإذن الله.</div>}
                        </div>
                    )}

                    {activeTab === 'MESSAGES' && (
                        <div className="space-y-4">
                            {childMessages.map(m => (
                                <div key={m.id} className="bg-white p-6 rounded-[2rem] border shadow-sm border-r-[12px] border-r-teal-500">
                                    <div className="flex justify-between mb-4">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{formatDualDate(m.date)}</span>
                                        <Bell size={18} className="text-teal-500"/>
                                    </div>
                                    <p className="text-base text-gray-700 leading-relaxed font-medium">"{m.content}"</p>
                                    <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                                        <span className="text-[10px] text-gray-400 font-bold">مرسل بواسطة: {m.sentBy}</span>
                                        <button className="text-[10px] text-indigo-600 font-black hover:underline">الرد على الرسالة</button>
                                    </div>
                                </div>
                            ))}
                            {childMessages.length === 0 && <div className="p-20 text-center text-gray-300 font-bold bg-white rounded-[3rem] border-2 border-dashed">لا توجد رسائل حالية من المدرسة.</div>}
                        </div>
                    )}
                </div>
            </main>

            {isExcuseModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl relative border-t-[8px] border-indigo-600">
                        <button onClick={() => setIsExcuseModalOpen(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600"><X size={24}/></button>
                        <h3 className="font-black text-2xl text-gray-800 mb-2 flex items-center gap-2"><MessageCircle className="text-indigo-600"/> تقديم مبرر غياب</h3>
                        <p className="text-xs text-gray-400 mb-8 font-bold">ليوم: {selectedAbsentRecord && formatDualDate(selectedAbsentRecord.date)}</p>
                        
                        <textarea 
                            className="w-full p-6 border rounded-[2rem] h-48 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium bg-gray-50 border-gray-100 shadow-inner"
                            placeholder="اكتب سبب الغياب هنا بالتفصيل ليتم مراجعته من قبل المعلم..."
                            value={excuseText}
                            onChange={e => setExcuseText(e.target.value)}
                        />
                        
                        <div className="mt-8 flex gap-4">
                            <button onClick={() => setIsExcuseModalOpen(false)} className="flex-1 py-4 border border-gray-200 rounded-[1.5rem] font-bold text-gray-500 hover:bg-gray-50 transition-colors">إلغاء</button>
                            <button onClick={handleSubmitExcuse} className="flex-[2] py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">إرسال العذر الآن</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TabBtn = ({ label, icon, active, onClick }: any) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl transition-all whitespace-nowrap ${active ? 'bg-indigo-50 text-indigo-700 shadow-inner' : 'text-gray-400 hover:bg-gray-50'}`}>
        {icon} <span className="text-[10px] font-black">{label}</span>
    </button>
);

export default ParentPortal;