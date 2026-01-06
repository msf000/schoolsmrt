
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorIncident, Task, MessageLog, FlippedLesson } from '../types';
import { saveAttendance, getBehaviorIncidents, getTasks, getMessages, getFlippedLessons, saveParentRequest } from '../services/storageService';
import { 
    User, LogOut, AlertTriangle, Clock, MessageCircle, X, ShieldCheck, 
    Trophy, BookOpen, Bell, ChevronLeft, Star, Calendar, CheckCircle2, Zap, Radar as RadarIcon, TrendingUp, ArrowUpCircle, MessageSquare, Send, Sparkles, Bot, LayoutGrid
} from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import SmartParentDigest from './SmartParentDigest';

interface ParentPortalProps {
    parentPhone: string;
    allStudents: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ parentPhone, allStudents, attendance, performance, onLogout }) => {
    const myChildren = useMemo(() => 
        allStudents.filter(s => s.parentPhone === parentPhone || s.parentPhone?.replace(/\s+/g, '') === parentPhone),
    [allStudents, parentPhone]);

    const [activeChildId, setActiveChildId] = useState<string>(myChildren.length > 0 ? myChildren[0].id : '');
    const activeChild = myChildren.find(c => c.id === activeChildId) || myChildren[0];
    
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FLIPPED' | 'ACADEMIC' | 'MESSAGES' | 'REQUEST'>('OVERVIEW');
    const [flippedLessons, setFlippedLessons] = useState<FlippedLesson[]>([]);
    
    const [reqType, setReqType] = useState<'MEETING' | 'QUERY'>('QUERY');
    const [reqContent, setReqContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (activeChild) {
            const all = getFlippedLessons();
            setFlippedLessons(all.filter(l => l.className === activeChild.className));
        }
    }, [activeChild]);

    const handleSendRequest = async () => {
        if (!reqContent) return;
        setIsSubmitting(true);
        try {
            await saveParentRequest({
                id: `pr_${Date.now()}`,
                parentId: parentPhone,
                studentId: activeChild.id,
                teacherId: activeChild.createdById || '',
                type: reqType,
                content: reqContent,
                status: 'PENDING',
                date: new Date().toISOString()
            });
            alert('تم إرسال طلبك للمعلم بنجاح.');
            setReqContent('');
            setActiveTab('MESSAGES');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!activeChild) return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-10 text-center">
            <AlertTriangle size={48} className="text-amber-500 mb-4"/>
            <h2 className="text-xl font-bold text-slate-800">لم يتم العثور على أبناء مرتبطين</h2>
            <p className="text-slate-500 mt-2">يرجى التأكد من رقم الهاتف المسجل لدى المدرسة.</p>
            <button onClick={onLogout} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg font-bold">تسجيل الخروج</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-tajawal pb-24" dir="rtl">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-500 rounded flex items-center justify-center text-white font-black shadow-lg">ب</div>
                    <h1 className="text-base font-bold text-slate-800">بوابة ولي الأمر</h1>
                </div>
                <div className="flex items-center gap-3">
                    <select 
                        value={activeChildId} 
                        onChange={e => setActiveChildId(e.target.value)}
                        className="bg-slate-100 border border-slate-200 text-xs font-bold p-2 rounded-lg outline-none"
                    >
                        {myChildren.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-600 transition-all"><LogOut size={20}/></button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl font-bold text-brand-600 border border-slate-200 overflow-hidden">
                            {activeChild.avatarUrl ? <img src={activeChild.avatarUrl} className="w-full h-full object-cover"/> : activeChild.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{activeChild.name}</h2>
                            <p className="text-xs text-slate-500 font-bold">{activeChild.className} • مستوى {activeChild.level || 1}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center px-4 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase">رصيد النقاط</p>
                            <p className="text-lg font-bold text-indigo-700">{activeChild.xp || 0} XP</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase">الانضباط</p>
                            <p className="text-lg font-bold text-emerald-700">ممتاز</p>
                        </div>
                    </div>
                </div>

                <SmartParentDigest student={activeChild} attendance={attendance.filter(a=>a.studentId===activeChild.id)} performance={performance.filter(p=>p.studentId===activeChild.id)} />

                <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                    {/* Fix: Added missing LayoutGrid icon to lucide-react imports */}
                    <TabBtn active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} label="الملخص" icon={LayoutGrid}/>
                    <TabBtn active={activeTab === 'FLIPPED'} onClick={() => setActiveTab('FLIPPED')} label="التعلم المقلوب" icon={ArrowUpCircle}/>
                    <TabBtn active={activeTab === 'ACADEMIC'} onClick={() => setActiveTab('ACADEMIC')} label="التحصيل" icon={TrendingUp}/>
                    <TabBtn active={activeTab === 'MESSAGES'} onClick={() => setActiveTab('MESSAGES')} label="الرسائل" icon={Bell}/>
                    <TabBtn active={activeTab === 'REQUEST'} onClick={() => setActiveTab('REQUEST')} label="تواصل" icon={MessageSquare}/>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[300px] p-8">
                    {activeTab === 'OVERVIEW' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                             <div className="space-y-6">
                                <h3 className="font-bold text-slate-800 border-r-4 border-brand-500 pr-3">آخر الدرجات المرصودة</h3>
                                {performance.filter(p => p.studentId === activeChild.id).slice(0, 5).map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{p.title}</p>
                                            <p className="text-[10px] text-slate-400">{p.subject}</p>
                                        </div>
                                        <span className="text-sm font-black text-brand-600">{p.score} / {p.maxScore}</span>
                                    </div>
                                ))}
                             </div>
                             <div className="bg-slate-50 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center">
                                <div className="p-5 bg-white rounded-3xl shadow-sm mb-4 text-brand-500"><Bot size={48}/></div>
                                <h4 className="font-black text-slate-800 mb-2">رؤية المحلل الذكي</h4>
                                <p className="text-sm text-slate-500 leading-relaxed italic">"ابنكم يظهر تقدماً ملحوظاً في المواد العلمية، ننصح بتشجيعه على القراءة الإثرائية لرفع مهارات التعبير اللغوي."</p>
                             </div>
                        </div>
                    )}

                    {activeTab === 'REQUEST' && (
                        <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
                            <div className="text-center">
                                <h3 className="text-2xl font-black text-slate-800">تواصل مع المعلم</h3>
                                <p className="text-sm text-slate-500 mt-2">إرسال طلب استفسار أو طلب موعد لقاء رسمي</p>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={()=>setReqType('QUERY')} className={`p-4 rounded-2xl border-2 transition-all font-bold text-sm ${reqType==='QUERY'?'bg-brand-50 border-brand-500 text-brand-700':'bg-white text-slate-400 border-slate-100'}`}>استفسار سريع</button>
                                    <button onClick={()=>setReqType('MEETING')} className={`p-4 rounded-2xl border-2 transition-all font-bold text-sm ${reqType==='MEETING'?'bg-brand-50 border-brand-500 text-brand-700':'bg-white text-slate-400 border-slate-100'}`}>طلب لقاء حضوري</button>
                                </div>
                                <textarea className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl h-40 font-medium text-sm outline-none focus:bg-white transition-all" value={reqContent} onChange={e=>setReqContent(e.target.value)} placeholder="اكتب تفاصيل طلبك هنا..."/>
                                <button onClick={handleSendRequest} disabled={isSubmitting || !reqContent} className="w-full py-4 bg-brand-500 text-white rounded-2xl font-black shadow-xl hover:bg-brand-600 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                                    {isSubmitting ? <Loader2 className="animate-spin"/> : <Send/>} إرسال الطلب الآن
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'FLIPPED' && (
                        <div className="space-y-6">
                            <h3 className="font-bold text-slate-800 border-r-4 border-indigo-600 pr-3">سجل التحضير المسبق</h3>
                            <div className="grid grid-cols-1 gap-4">
                                {flippedLessons.map(lesson => (
                                    <div key={lesson.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600"><BookOpen size={20}/></div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{lesson.title}</h4>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">{lesson.subject}</p>
                                            </div>
                                        </div>
                                        {lesson.preparedStudentIds.includes(activeChild.id) ? (
                                            <span className="flex items-center gap-2 text-emerald-600 font-black text-xs bg-emerald-50 px-3 py-1.5 rounded-full"><CheckCircle2 size={16}/> تم التحضير</span>
                                        ) : (
                                            <span className="flex items-center gap-2 text-amber-600 font-black text-xs bg-amber-50 px-3 py-1.5 rounded-full"><Clock size={16}/> بانتظار المراجعة</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const TabBtn = ({ active, onClick, label, icon: Icon }: any) => (
    <button onClick={onClick} className={`flex-1 py-3 px-6 rounded-xl transition-all text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap ${active ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
        <Icon size={16}/> {label}
    </button>
);

const Loader2 = ({ size, className }: any) => <svg width={size||24} height={size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;

export default ParentPortal;
