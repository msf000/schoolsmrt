import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, MessageLog, Exam, WeeklyPlanItem, AcademicTerm } from '../types';
import { getMessages, getAcademicTerms, saveAttendance, getWeeklyPlans } from '../services/storageService';
import { User, Calendar, Award, LogOut, Phone, Mail, ChevronDown, CheckCircle, AlertTriangle, Clock, X, MessageSquare, TrendingUp, Bell, FileText, Send, Star, HeartHandshake, Home, CalendarDays, ArrowLeft, RefreshCw, ChevronLeft } from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import InstallPrompt from './InstallPrompt';

interface ParentPortalProps {
    parentPhone: string;
    allStudents: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ parentPhone, allStudents, attendance, performance, onLogout }) => {
    // Find children
    const myChildren = useMemo(() => {
        return allStudents.filter(s => s.parentPhone === parentPhone || s.parentPhone?.replace(/\s/g, '') === parentPhone);
    }, [allStudents, parentPhone]);

    const [activeChildId, setActiveChildId] = useState<string>(myChildren.length > 0 ? myChildren[0].id : '');
    const activeChild = myChildren.find(c => c.id === activeChildId) || myChildren[0];
    
    // Tab State
    const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'MESSAGES' | 'PLAN' | 'PROFILE'>('DASHBOARD');
    
    // Data States
    const [messages, setMessages] = useState<MessageLog[]>([]);
    
    useEffect(() => {
        const allMsgs = getMessages();
        // Filter messages for ANY of the children
        const childIds = myChildren.map(c => c.id);
        setMessages(allMsgs.filter(m => childIds.includes(m.studentId)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, [myChildren]);

    if (myChildren.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 flex-col gap-6 p-6 text-center">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-2">
                    <User size={40}/>
                </div>
                <h2 className="text-xl font-bold text-gray-800">عفواً، لا يوجد طلاب مرتبطين</h2>
                <p className="text-gray-500 max-w-xs">لم يتم العثور على أبناء مسجلين برقم الجوال هذا. يرجى مراجعة المدرسة.</p>
                <button onClick={onLogout} className="text-red-500 font-bold px-6 py-2 border border-red-200 rounded-full hover:bg-red-50">خروج</button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-right select-none" dir="rtl">
            
            {/* --- PREMIUM HEADER --- */}
            <header className="bg-[#1e1b4b] text-white pt-safe-top pb-4 shadow-lg sticky top-0 z-30 rounded-b-[2rem]">
                <div className="px-6 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="font-bold text-lg text-amber-400 flex items-center gap-2"><HeartHandshake size={20}/> شريك النجاح</h1>
                        <p className="text-[10px] text-indigo-200 opacity-80">بوابة ولي الأمر المتصل</p>
                    </div>
                    <div className="relative">
                        <button onClick={() => setActiveTab('MESSAGES')} className="p-2 bg-white/10 rounded-full hover:bg-white/20 relative">
                            <Bell size={20}/>
                            {messages.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#1e1b4b]"></span>}
                        </button>
                    </div>
                </div>

                {/* Child Switcher (Horizontal Scroll) */}
                <div className="mt-2 px-4 flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {myChildren.map(child => (
                        <button
                            key={child.id}
                            onClick={() => setActiveChildId(child.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap ${
                                activeChildId === child.id 
                                ? 'bg-amber-400 text-[#1e1b4b] border-amber-400 font-bold shadow-md transform scale-105' 
                                : 'bg-white/10 text-indigo-200 border-white/10 hover:bg-white/20'
                            }`}
                        >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${activeChildId === child.id ? 'bg-[#1e1b4b] text-amber-400' : 'bg-indigo-800 text-white'}`}>
                                {child.name.charAt(0)}
                            </div>
                            <span className="text-xs">{child.name.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 overflow-y-auto pb-24 pt-4 px-4 custom-scrollbar">
                {activeTab === 'DASHBOARD' && <ChildDashboard child={activeChild} attendance={attendance} performance={performance} />}
                {activeTab === 'MESSAGES' && <MessagesView messages={messages} />}
                {activeTab === 'PLAN' && <WeeklyPlanView child={activeChild} />}
                {activeTab === 'PROFILE' && <ParentProfile parentPhone={parentPhone} onLogout={onLogout} childrenCount={myChildren.length} />}
            </main>

            {/* --- INSTALL PROMPT --- */}
            <div className="fixed bottom-20 left-4 right-4 z-20">
                <InstallPrompt userRole="PARENT" />
            </div>

            {/* --- LUXURY BOTTOM NAV --- */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe-bottom z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] rounded-t-2xl">
                <div className="flex justify-around items-center h-16">
                    <NavButton icon={Home} label="الرئيسية" active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} color="text-[#1e1b4b]" />
                    <NavButton icon={CalendarDays} label="الخطة" active={activeTab === 'PLAN'} onClick={() => setActiveTab('PLAN')} color="text-[#1e1b4b]" />
                    <NavButton icon={MessageSquare} label="الرسائل" active={activeTab === 'MESSAGES'} onClick={() => setActiveTab('MESSAGES')} color="text-[#1e1b4b]" />
                    <NavButton icon={User} label="حسابي" active={activeTab === 'PROFILE'} onClick={() => setActiveTab('PROFILE')} color="text-[#1e1b4b]" />
                </div>
            </nav>
        </div>
    );
};

const NavButton = ({ icon: Icon, label, active, onClick, color }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${active ? color : 'text-gray-400 hover:text-gray-600'}`}>
        <Icon size={22} strokeWidth={active ? 2.5 : 2} className={active ? 'transform -translate-y-1' : ''} />
        <span className={`text-[10px] font-bold mt-1 ${active ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>{label}</span>
    </button>
);

// --- SUB-VIEWS ---

const ChildDashboard = ({ child, attendance, performance }: any) => {
    // Stats
    const childAtt = attendance.filter((a:any) => a.studentId === child.id);
    const absent = childAtt.filter((a:any) => a.status === 'ABSENT').length;
    const notes = childAtt.filter((a:any) => a.behaviorStatus !== 'NEUTRAL' || a.behaviorNote);
    
    const childPerf = performance.filter((p:any) => p.studentId === child.id);
    const recentGrades = [...childPerf].sort((a:any,b:any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={16}/></div>
                        <span className="text-xs font-bold text-gray-500">الحضور</span>
                    </div>
                    <p className="text-lg font-black text-gray-800">{absent === 0 ? 'منتظم 🌟' : `${absent} غياب`}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Award size={16}/></div>
                        <span className="text-xs font-bold text-gray-500">آخر درجة</span>
                    </div>
                    <p className="text-lg font-black text-gray-800">{recentGrades.length > 0 ? `${recentGrades[0].score}/${recentGrades[0].maxScore}` : '-'}</p>
                </div>
            </div>

            {/* Attendance Chart / Summary */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Calendar size={18} className="text-indigo-600"/> ملخص الحضور</h3>
                <div className="flex gap-2">
                    {Array.from({length: 7}).map((_, i) => (
                        <div key={i} className="flex-1 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                            <div className={`w-2 h-2 rounded-full ${i < 5 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-2 text-center">آخر 7 أيام دراسية</p>
            </div>

            {/* Recent Grades List */}
            <div className="space-y-3">
                <h3 className="font-bold text-gray-800 px-1">آخر الدرجات</h3>
                {recentGrades.length > 0 ? recentGrades.map((p: any) => (
                    <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-gray-800 text-sm">{p.title}</h4>
                            <p className="text-xs text-gray-400">{p.subject}</p>
                        </div>
                        <div className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                            {p.score}
                        </div>
                    </div>
                )) : <div className="text-center py-8 text-gray-400 text-sm">لا توجد درجات حديثة</div>}
            </div>
        </div>
    );
};

const MessagesView = ({ messages }: { messages: MessageLog[] }) => (
    <div className="space-y-4 animate-fade-in">
        <h3 className="font-bold text-gray-800 text-lg">صندوق الوارد</h3>
        {messages.length > 0 ? messages.map(msg => (
            <div key={msg.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-1 h-full ${msg.type === 'WHATSAPP' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                <div className="flex justify-between items-start mb-2 pl-2">
                    <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-600">{msg.studentName}</span>
                    <span className="text-[10px] text-gray-400">{formatDualDate(msg.date).split('|')[0]}</span>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{msg.content}</p>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2 text-[10px] text-gray-400">
                    <User size={12}/> المرسل: {msg.sentBy}
                </div>
            </div>
        )) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Mail size={48} className="mb-4 opacity-20"/>
                <p>لا توجد رسائل</p>
            </div>
        )}
    </div>
);

const WeeklyPlanView = ({ child }: any) => {
    const [plans, setPlans] = useState<WeeklyPlanItem[]>([]);
    
    useEffect(() => {
        // Simple logic: fetch all and filter (optimized in real app)
        const all = getWeeklyPlans();
        setPlans(all.filter(p => p.classId === child.className));
    }, [child]);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const dayNames: any = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };

    return (
        <div className="space-y-4 animate-fade-in pb-20">
            <h3 className="font-bold text-gray-800 text-lg mb-2">الخطة الأسبوعية: {child.className}</h3>
            {days.map(day => {
                const dayPlans = plans.filter(p => p.day === day).sort((a,b) => a.period - b.period);
                return (
                    <div key={day} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                        <div className="bg-indigo-50 p-3 text-indigo-900 font-bold text-sm flex justify-between">
                            <span>{dayNames[day]}</span>
                            <span className="text-xs bg-white px-2 py-0.5 rounded text-indigo-600">{dayPlans.length} حصص</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {dayPlans.length > 0 ? dayPlans.map(p => (
                                <div key={p.id} className="p-3 text-sm">
                                    <div className="flex justify-between font-bold text-gray-800 mb-1">
                                        <span>{p.subjectName}</span>
                                        <span className="text-xs text-gray-400 bg-gray-50 px-1 rounded">حصة {p.period}</span>
                                    </div>
                                    <p className="text-gray-600 text-xs mb-2">{p.lessonTopic}</p>
                                    {p.homework && (
                                        <div className="bg-amber-50 text-amber-800 p-2 rounded text-xs border border-amber-100 flex items-start gap-2">
                                            <Home size={14} className="mt-0.5 shrink-0"/>
                                            <span>{p.homework}</span>
                                        </div>
                                    )}
                                </div>
                            )) : <div className="p-4 text-center text-gray-400 text-xs">لا يوجد خطة</div>}
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

const ParentProfile = ({ parentPhone, onLogout, childrenCount }: any) => (
    <div className="space-y-6 animate-fade-in pt-6">
        <div className="text-center">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-indigo-900 text-4xl shadow-lg mx-auto mb-4 border-4 border-indigo-50">
                <User />
            </div>
            <h2 className="font-bold text-gray-800 text-xl">ولي الأمر</h2>
            <p className="text-gray-500 text-sm font-mono dir-ltr">{parentPhone}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
                <span className="font-bold text-gray-700">عدد الأبناء</span>
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{childrenCount}</span>
            </div>
            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                <span className="font-bold text-gray-700">الإعدادات</span>
                <ChevronLeft size={18} className="text-gray-400"/>
            </div>
            <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
                <span className="font-bold text-gray-700">تواصل مع الدعم</span>
                <ChevronLeft size={18} className="text-gray-400"/>
            </div>
        </div>

        <button onClick={onLogout} className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
            <LogOut size={20}/> تسجيل الخروج
        </button>
    </div>
);

export default ParentPortal;