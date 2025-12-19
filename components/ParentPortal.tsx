import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorIncident, Task, MessageLog } from '../types';
import { saveAttendance, getBehaviorIncidents, getTasks, getMessages, submitTask } from '../services/storageService';
import { 
    User, LogOut, AlertTriangle, Clock, MessageCircle, X, ShieldCheck, 
    Trophy, BookOpen, Bell, ChevronLeft, Star, Calendar, CheckCircle2, Zap
} from 'lucide-react';
import { formatDualDate } from '../services/dateService';

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
    
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ATTENDANCE' | 'TASKS' | 'BEHAVIOR' | 'MESSAGES'>('OVERVIEW');
    const [isExcuseModalOpen, setIsExcuseModalOpen] = useState(false);
    const [selectedAbsentRecord, setSelectedAbsentRecord] = useState<AttendanceRecord | null>(null);
    const [excuseText, setExcuseText] = useState('');

    // Data states for current child
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
        const absent = childAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const unexcused = childAtt.filter(a => a.status === AttendanceStatus.ABSENT && !a.excuseNote);
        const recentAtt = [...childAtt].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);
        
        const childPerf = performance.filter(p => p.studentId === activeChild.id);
        const avg = childPerf.length > 0 ? Math.round(childPerf.reduce((a,b)=>a+(b.score/b.maxScore),0)/childPerf.length*100) : 0;

        return { absent, unexcused, recentAtt, avg };
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
                        <div>
                            <h1 className="font-black text-gray-800 text-sm">بوابة ولي الأمر</h1>
                            <p className="text-[10px] text-gray-400 font-bold">مرحباً بك في نظام المتابع الذكي</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="text-red-500 p-2 hover:bg-red-50 rounded-xl transition-colors"><LogOut size={20}/></button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto w-full p-4 flex-1 space-y-6">
                {/* Child Selector */}
                {myChildren.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {myChildren.map(c => (
                            <button key={c.id} onClick={() => setActiveChildId(c.id)} className={`px-5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all ${activeChildId === c.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400 border'}`}>
                                {c.name.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                )}

                {/* Info Card */}
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><Zap size={120}/></div>
                    <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 text-3xl font-black border-2 border-white shadow-inner">
                        {activeChild.name.charAt(0)}
                    </div>
                    <div className="flex-1 text-center md:text-right">
                        <h2 className="text-xl font-black text-gray-800">{activeChild.name}</h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
                            <span className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-bold text-gray-500">{activeChild.className}</span>
                            <span className="bg-indigo-50 px-3 py-1 rounded-full text-[10px] font-black text-indigo-600 flex items-center gap-1"><Zap size={10} fill="currentColor"/> {activeChild.behaviorPoints || 0} نقطة تميز</span>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase">المعدل</p>
                            <p className="text-xl font-black text-indigo-600">{stats?.avg}%</p>
                        </div>
                        <div className="w-[1px] h-10 bg-gray-100"></div>
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase">الانضباط</p>
                            <p className="text-xl font-black text-green-600">{100 - (stats?.absent || 0) * 5}%</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-white rounded-2xl border p-1 shadow-sm sticky top-20 z-20 overflow-x-auto no-scrollbar">
                    <TabBtn label="نظرة عامة" active={activeTab==='OVERVIEW'} onClick={()=>setActiveTab('OVERVIEW')} icon={<Clock size={16}/>}/>
                    <TabBtn label="الواجبات" active={activeTab==='TASKS'} onClick={()=>setActiveTab('TASKS')} icon={<BookOpen size={16}/>}/>
                    <TabBtn label="السلوك" active={activeTab==='BEHAVIOR'} onClick={()=>setActiveTab('BEHAVIOR')} icon={<Star size={16}/>}/>
                    <TabBtn label="الرسائل" active={activeTab==='MESSAGES'} onClick={()=>setActiveTab('MESSAGES')} icon={<Bell size={16}/>}/>
                </div>

                {/* TAB CONTENT */}
                <div className="animate-fade-in">
                    {activeTab === 'OVERVIEW' && (
                        <div className="space-y-6">
                            {stats && stats.unexcused.length > 0 && (
                                <div className="bg-red-50 p-5 rounded-3xl border border-red-100 shadow-sm animate-pulse">
                                    <h3 className="font-black text-red-700 flex items-center gap-2 mb-3 text-sm"><AlertTriangle size={18}/> تنبيه: غياب لم يبرر</h3>
                                    <div className="space-y-2">
                                        {stats.unexcused.map(rec => (
                                            <div key={rec.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100">
                                                <span className="text-xs font-bold text-gray-700">{formatDualDate(rec.date)}</span>
                                                <button onClick={() => { setSelectedAbsentRecord(rec); setIsExcuseModalOpen(true); }} className="text-[10px] bg-red-600 text-white px-3 py-1.5 rounded-lg font-black shadow-sm">تقديم عذر</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white p-6 rounded-3xl shadow-sm border">
                                <h3 className="font-black text-gray-800 mb-4 text-sm flex items-center gap-2 border-b pb-3"><Clock size={18} className="text-indigo-600"/> الحضور الأخير</h3>
                                <div className="space-y-3">
                                    {stats?.recentAtt?.map(rec => (
                                        <div key={rec.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="text-xs font-bold text-gray-600">{formatDualDate(rec.date)}</span>
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                                                rec.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 
                                                rec.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>{rec.status === 'PRESENT' ? 'حاضر' : rec.status === 'ABSENT' ? 'غائب' : 'تأخر'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'TASKS' && (
                        <div className="space-y-4">
                            {childTasks.map(task => (
                                <div key={task.id} className="bg-white p-5 rounded-3xl border shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500"></div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full mb-1 inline-block uppercase">{task.type}</span>
                                            <h4 className="font-black text-gray-800">{task.title}</h4>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[10px] font-bold text-gray-400">آخر موعد</p>
                                            <p className="text-xs font-black text-red-500">{task.dueDate}</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed mb-4">{task.description}</p>
                                    <div className="flex justify-between items-center pt-3 border-t">
                                        <span className="text-[10px] font-bold text-gray-400">{task.subject} • {task.maxScore} درجة</span>
                                        {task.submissions.includes(activeChild.id) ? 
                                            <span className="flex items-center gap-1 text-green-600 text-[10px] font-black"><CheckCircle2 size={14}/> تم الحل</span> :
                                            <span className="flex items-center gap-1 text-orange-500 text-[10px] font-black"><Clock size={14}/> مطلوب الحل</span>
                                        }
                                    </div>
                                </div>
                            ))}
                            {childTasks.length === 0 && <div className="p-20 text-center text-gray-300 font-bold">لا توجد واجبات حالية.</div>}
                        </div>
                    )}

                    {activeTab === 'BEHAVIOR' && (
                        <div className="space-y-4">
                            <div className="bg-indigo-900 p-6 rounded-3xl text-white mb-6 shadow-xl relative overflow-hidden">
                                <Trophy className="absolute -bottom-2 -left-2 opacity-20" size={80}/>
                                <p className="text-xs font-bold opacity-70 mb-1">نقاط التميز التراكمية</p>
                                <h3 className="text-4xl font-black">{activeChild.behaviorPoints || 0}</h3>
                                <p className="text-[10px] mt-2 font-medium opacity-80">سيتم تكريم الطالب عند وصوله لـ 100 نقطة.</p>
                            </div>
                            {behaviorLog.map(i => (
                                <div key={i.id} className={`p-4 rounded-2xl border flex gap-4 ${i.type === 'POSITIVE' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                    <div className={`p-2 rounded-xl h-fit ${i.type === 'POSITIVE' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {i.type === 'POSITIVE' ? <Star size={20} fill="currentColor"/> : <AlertTriangle size={20}/>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-black text-gray-800 text-sm">{i.category}</h4>
                                            <span className="text-[10px] font-bold text-gray-400">{formatDualDate(i.date)}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-2">{i.note || (i.type === 'POSITIVE' ? 'تميز الطالب في أدائه التعليمي' : 'تنبيه سلوكي من المعلم')}</p>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${i.points > 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                            {i.points > 0 ? '+' : ''}{i.points} نقطة
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {behaviorLog.length === 0 && <div className="p-20 text-center text-gray-300 font-bold">سجل السلوك نظيف.</div>}
                        </div>
                    )}

                    {activeTab === 'MESSAGES' && (
                        <div className="space-y-4">
                            {childMessages.map(m => (
                                <div key={m.id} className="bg-white p-5 rounded-3xl border shadow-sm border-r-4 border-r-teal-500">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-[10px] font-bold text-gray-400">{formatDualDate(m.date)}</span>
                                        <Bell size={14} className="text-teal-500"/>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed font-medium">"{m.content}"</p>
                                    <p className="text-[10px] text-gray-400 mt-4 border-t pt-2">مرسل من: {m.sentBy}</p>
                                </div>
                            ))}
                            {childMessages.length === 0 && <div className="p-20 text-center text-gray-300 font-bold">لا توجد رسائل جديدة.</div>}
                        </div>
                    )}
                </div>
            </main>

            {isExcuseModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative">
                        <button onClick={() => setIsExcuseModalOpen(false)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-600"><X/></button>
                        <h3 className="font-black text-xl text-gray-800 mb-2 flex items-center gap-2"><MessageCircle className="text-indigo-600"/> تقديم مبرر غياب</h3>
                        <p className="text-xs text-gray-400 mb-6 font-bold">ليوم: {selectedAbsentRecord && formatDualDate(selectedAbsentRecord.date)}</p>
                        
                        <textarea 
                            className="w-full p-4 border rounded-2xl h-40 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium bg-gray-50 border-gray-200"
                            placeholder="اكتب سبب الغياب هنا (مثلاً: موعد طبي، ظرف طارئ...)"
                            value={excuseText}
                            onChange={e => setExcuseText(e.target.value)}
                        />
                        
                        <div className="mt-6 flex gap-3">
                            <button onClick={() => setIsExcuseModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50">إلغاء</button>
                            <button onClick={handleSubmitExcuse} className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700">إرسال العذر</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TabBtn = ({ label, icon, active, onClick }: any) => (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl transition-all whitespace-nowrap ${active ? 'bg-indigo-50 text-indigo-700 scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}>
        {icon} <span className="text-[10px] font-black">{label}</span>
    </button>
);

export default ParentPortal;
