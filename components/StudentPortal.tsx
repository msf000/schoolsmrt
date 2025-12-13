import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, ScheduleItem, AcademicTerm, LessonLink, MessageLog } from '../types';
import { getSchedules, getAcademicTerms, getLessonLinks, downloadFromSupabase, getMessages } from '../services/storageService';
import { User, Calendar, Award, LogOut, FileText, Menu, Clock, LayoutGrid, Trophy, Library, RefreshCw, Bell, Home, BookOpen, ChevronLeft, AlertTriangle, X, MessageCircle, Star, CheckCircle } from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import InstallPrompt from './InstallPrompt';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StudentPortalProps {
    currentUser: Student;
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser, attendance, performance, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'HOME' | 'SCHEDULE' | 'GRADES' | 'LIBRARY' | 'PROFILE'>('HOME');
    const [isSyncing, setIsSyncing] = useState(false);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    
    // Notifications State
    const [notifications, setNotifications] = useState<MessageLog[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Data Loading
    useEffect(() => {
        setTerms(getAcademicTerms());
        // Load messages for this student
        const allMsgs = getMessages();
        const myMsgs = allMsgs.filter(m => m.studentId === currentUser.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setNotifications(myMsgs);
    }, [currentUser]);

    const handleRefresh = async () => {
        setIsSyncing(true);
        await downloadFromSupabase();
        setIsSyncing(false);
        window.location.reload();
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 font-sans text-right select-none" dir="rtl">
            {/* --- APP HEADER (Sticky) --- */}
            <header className="bg-sky-600 text-white p-4 shadow-md sticky top-0 z-30 pt-safe-top">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border-2 border-white/30 backdrop-blur-sm shadow-sm">
                            <span className="font-bold text-lg">{currentUser.name.charAt(0)}</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-sm leading-tight">أهلاً، {currentUser.name.split(' ')[0]} 👋</h1>
                            <p className="text-[10px] text-sky-100 opacity-90">{currentUser.className} | رفيق الطالب</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleRefresh} className={`p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all ${isSyncing ? 'animate-spin' : ''}`}>
                            <RefreshCw size={18} />
                        </button>
                        <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 relative">
                            <Bell size={18} />
                            {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-sky-600 animate-pulse"></span>}
                        </button>
                    </div>
                </div>
            </header>

            {/* --- NOTIFICATIONS OVERLAY --- */}
            {showNotifications && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
                    <div className="w-4/5 max-w-sm bg-white h-full shadow-2xl animate-slide-in-right flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2"><Bell size={18}/> التنبيهات</h3>
                            <button onClick={() => setShowNotifications(false)} className="p-1 rounded-full hover:bg-gray-200"><X size={20}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                            {notifications.length > 0 ? notifications.map(msg => (
                                <div key={msg.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 w-1 h-full ${msg.type === 'WHATSAPP' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-gray-700">{msg.sentBy}</span>
                                        <span className="text-[9px] text-gray-400">{formatDualDate(msg.date).split('|')[0]}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">{msg.content}</p>
                                </div>
                            )) : (
                                <div className="text-center py-20 text-gray-400">
                                    <MessageCircle size={48} className="mx-auto mb-4 opacity-20"/>
                                    <p>لا توجد تنبيهات جديدة</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 overflow-y-auto pb-24 pt-4 px-4 custom-scrollbar bg-gradient-to-b from-slate-50 to-white">
                
                {activeTab === 'HOME' && <StudentHome student={currentUser} attendance={attendance} performance={performance} terms={terms} onNavigate={setActiveTab} />}
                {activeTab === 'SCHEDULE' && <StudentSchedule student={currentUser} />}
                {activeTab === 'GRADES' && <StudentGrades student={currentUser} performance={performance} terms={terms} />}
                {activeTab === 'LIBRARY' && <StudentLibraryView student={currentUser} />}
                {activeTab === 'PROFILE' && <StudentProfileView student={currentUser} onLogout={onLogout} attendance={attendance} performance={performance} />}

            </main>

            {/* --- INSTALL PROMPT (Floating) --- */}
            <div className="fixed bottom-20 left-4 right-4 z-20">
                <InstallPrompt userRole="STUDENT" />
            </div>

            {/* --- BOTTOM NAVIGATION BAR (Mobile App Style) --- */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe-bottom z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16">
                    <NavButton icon={Home} label="الرئيسية" active={activeTab === 'HOME'} onClick={() => setActiveTab('HOME')} />
                    <NavButton icon={Clock} label="الجدول" active={activeTab === 'SCHEDULE'} onClick={() => setActiveTab('SCHEDULE')} />
                    <div className="relative -top-5">
                        <button 
                            onClick={() => setActiveTab('GRADES')}
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-50 transition-transform active:scale-95 ${activeTab === 'GRADES' ? 'bg-sky-600 text-white' : 'bg-white text-sky-600'}`}
                        >
                            <Trophy size={24} fill={activeTab === 'GRADES' ? "currentColor" : "none"} />
                        </button>
                    </div>
                    <NavButton icon={Library} label="المصادر" active={activeTab === 'LIBRARY'} onClick={() => setActiveTab('LIBRARY')} />
                    <NavButton icon={User} label="ملفي" active={activeTab === 'PROFILE'} onClick={() => setActiveTab('PROFILE')} />
                </div>
            </nav>
        </div>
    );
};

const NavButton = ({ icon: Icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full transition-colors ${active ? 'text-sky-600' : 'text-gray-400 hover:text-gray-600'}`}>
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
        <span className="text-[10px] font-bold mt-1">{label}</span>
    </button>
);

// --- SUB-VIEWS ---

const StudentHome = ({ student, attendance, performance, terms, onNavigate }: any) => {
    // Basic stats calculation
    const totalPerf = performance.length;
    const totalScore = performance.reduce((acc:any, curr:any) => acc + (curr.score / curr.maxScore), 0);
    const avg = totalPerf > 0 ? Math.round((totalScore / totalPerf) * 100) : 0;
    
    const absence = attendance.filter((a:any) => a.status === 'ABSENT').length;
    
    // Gamification
    const points = attendance.filter((a:any) => a.behaviorStatus === 'POSITIVE').length;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Gamification Card */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
                <div className="flex justify-between items-center relative z-10">
                    <div>
                        <p className="text-indigo-100 text-xs font-bold mb-1">رصيد نقاط التميز</p>
                        <h3 className="text-3xl font-black">{points} <span className="text-sm font-normal opacity-80">نقطة</span></h3>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        <Trophy size={32} className="text-yellow-300 fill-yellow-300 drop-shadow-sm" />
                    </div>
                </div>
                <div className="mt-4 bg-black/20 rounded-full h-2 w-full overflow-hidden">
                    <div className="bg-yellow-400 h-full rounded-full" style={{ width: `${Math.min(100, points * 2)}%` }}></div>
                </div>
                <p className="text-[10px] text-indigo-100 mt-1 text-left">باقي {50 - points} نقطة للمستوى التالي</p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div onClick={() => onNavigate('GRADES')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
                    <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center"><Award size={20}/></div>
                    <div className="text-center">
                        <span className="block font-black text-gray-800 text-lg">{avg}%</span>
                        <span className="text-xs text-gray-500 font-bold">المعدل العام</span>
                    </div>
                </div>
                <div onClick={() => onNavigate('PROFILE')} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform">
                    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center"><AlertTriangle size={20}/></div>
                    <div className="text-center">
                        <span className="block font-black text-gray-800 text-lg">{absence}</span>
                        <span className="text-xs text-gray-500 font-bold">أيام الغياب</span>
                    </div>
                </div>
            </div>

            {/* Recent Updates */}
            <div>
                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Clock size={16} className="text-sky-600"/> آخر التحديثات</h3>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                    {performance.length > 0 ? performance.slice(-3).reverse().map((p: any) => (
                        <div key={p.id} className="p-4 flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">{p.title || p.subject}</h4>
                                <p className="text-xs text-gray-400">{formatDualDate(p.date).split('|')[0]}</p>
                            </div>
                            <span className="bg-sky-50 text-sky-700 px-3 py-1 rounded-lg font-bold text-sm border border-sky-100">
                                {p.score}/{p.maxScore}
                            </span>
                        </div>
                    )) : <div className="p-6 text-center text-gray-400 text-sm">لا توجد تحديثات جديدة</div>}
                </div>
            </div>
        </div>
    );
};

const StudentSchedule = ({ student }: any) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const dayNames: any = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };
    const [selectedDay, setSelectedDay] = useState(new Date().toLocaleDateString('en-US', { weekday: 'long' }));
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);

    useEffect(() => {
        const all = getSchedules();
        setSchedule(all.filter(s => s.classId === student.className));
    }, [student]);

    const daySchedule = schedule.filter(s => s.day === selectedDay).sort((a,b) => a.period - b.period);

    return (
        <div className="space-y-4 animate-slide-in-right">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {days.map(day => (
                    <button 
                        key={day} 
                        onClick={() => setSelectedDay(day)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedDay === day ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}
                    >
                        {dayNames[day]}
                    </button>
                ))}
            </div>

            <div className="space-y-3 pb-20">
                {daySchedule.length > 0 ? daySchedule.map(s => (
                    <div key={s.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-lg flex items-center justify-center font-bold text-lg">
                                {s.period}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">{s.subjectName}</h4>
                                <p className="text-xs text-gray-400">حصة دراسية</p>
                            </div>
                        </div>
                        <div className="text-xs bg-gray-50 px-2 py-1 rounded text-gray-500">45 دقيقة</div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Calendar size={48} className="mb-4 opacity-20"/>
                        <p>لا يوجد جدول لهذا اليوم</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const StudentGrades = ({ student, performance }: any) => {
    // Prepare chart data (Last 5 records)
    const chartData = useMemo(() => {
        return performance
            .slice()
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((p: any) => ({
                name: p.title.substring(0, 8),
                score: (p.score / p.maxScore) * 100
            }))
            .slice(-5);
    }, [performance]);

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <h3 className="font-bold text-gray-800 text-lg">تحليل الأداء</h3>
            
            {/* Performance Chart */}
            {chartData.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm h-56">
                    <h4 className="text-xs font-bold text-gray-500 mb-2">تطور المستوى (آخر 5 تقييمات)</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} stroke="#9ca3af" />
                            <Tooltip 
                                cursor={{fill: '#f0f9ff'}} 
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.1)'}}
                            />
                            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry: any, index: number) => (
                                    <Cell key={`cell-${index}`} fill={entry.score >= 90 ? '#10b981' : entry.score >= 70 ? '#3b82f6' : '#f59e0b'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-600">سجل الدرجات التفصيلي</h4>
                {performance.length > 0 ? performance.slice().reverse().map((p: any) => (
                    <div key={p.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{p.subject}</span>
                            <span className="text-[10px] text-gray-400">{formatDualDate(p.date).split('|')[0]}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-800 text-sm">{p.title}</h4>
                            <div className="flex items-end gap-1">
                                <span className={`text-2xl font-black ${p.score/p.maxScore >= 0.9 ? 'text-green-600' : 'text-sky-600'}`}>{p.score}</span>
                                <span className="text-xs text-gray-400 mb-1">/ {p.maxScore}</span>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-20 text-gray-400">
                        <Award size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>لا توجد درجات مسجلة حتى الآن</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const StudentLibraryView = ({ student }: any) => {
    const [links, setLinks] = useState<LessonLink[]>([]);
    useEffect(() => {
        setLinks(getLessonLinks().filter(l => !l.className || l.className === student.className));
    }, [student]);

    return (
        <div className="space-y-4 animate-fade-in pb-20">
            <h3 className="font-bold text-gray-800 text-lg">المكتبة الرقمية</h3>
            <div className="grid grid-cols-1 gap-3">
                {links.length > 0 ? links.map(link => (
                    <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                            <BookOpen size={24}/>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <h4 className="font-bold text-gray-800 truncate">{link.title}</h4>
                            <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">فتح الرابط <ChevronLeft size={12}/></p>
                        </div>
                    </a>
                )) : (
                    <div className="text-center py-20 text-gray-400">
                        <Library size={48} className="mx-auto mb-4 opacity-20"/>
                        <p>المكتبة فارغة حالياً</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const StudentProfileView = ({ student, onLogout, attendance, performance }: any) => {
    // Badges Calculation
    const points = attendance.filter((a: any) => a.behaviorStatus === 'POSITIVE').length;
    const attRate = attendance.length > 0 
        ? (attendance.filter((a: any) => a.status === 'PRESENT').length / attendance.length) * 100 
        : 100;
    const avgScore = performance.length > 0 
        ? (performance.reduce((acc:any, curr:any) => acc + (curr.score/curr.maxScore), 0) / performance.length) * 100 
        : 0;

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="w-24 h-24 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-4xl font-bold mx-auto mb-4 border-4 border-white shadow-lg">
                    {student.name.charAt(0)}
                </div>
                <h2 className="text-xl font-bold text-gray-800">{student.name}</h2>
                <p className="text-gray-500 text-sm mt-1">{student.gradeLevel} - {student.className}</p>
                <div className="mt-4 flex justify-center gap-2">
                    <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-600">{student.nationalId}</span>
                </div>
            </div>

            {/* Badges Section */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Award size={18} className="text-yellow-500"/> أوسمتي</h3>
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {points >= 10 && (
                        <div className="flex-shrink-0 flex flex-col items-center">
                            <div className="w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center border-2 border-yellow-200">
                                <Star size={32} className="text-yellow-500 fill-yellow-500"/>
                            </div>
                            <span className="text-xs font-bold mt-2 text-gray-600">الخلوق</span>
                        </div>
                    )}
                    {attRate >= 95 && (
                        <div className="flex-shrink-0 flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border-2 border-green-200">
                                <CheckCircle size={32} className="text-green-500"/>
                            </div>
                            <span className="text-xs font-bold mt-2 text-gray-600">المواظب</span>
                        </div>
                    )}
                    {avgScore >= 90 && (
                        <div className="flex-shrink-0 flex flex-col items-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-200">
                                <Award size={32} className="text-blue-500"/>
                            </div>
                            <span className="text-xs font-bold mt-2 text-gray-600">المجتهد</span>
                        </div>
                    )}
                    {points < 10 && attRate < 95 && avgScore < 90 && (
                        <p className="text-sm text-gray-400 w-full text-center py-4">واصل التميز لفتح الأوسمة!</p>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b flex items-center gap-3">
                    <User size={18} className="text-gray-400"/>
                    <span className="font-bold text-gray-700">بياناتي</span>
                </div>
                <div className="p-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">الجوال</span>
                        <span className="font-bold">{student.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">ولي الأمر</span>
                        <span className="font-bold">{student.parentPhone || '-'}</span>
                    </div>
                </div>
            </div>

            <button onClick={onLogout} className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
                <LogOut size={20}/> تسجيل الخروج
            </button>
            
            <p className="text-center text-gray-400 text-xs pt-4">نسخة التطبيق 1.2.0</p>
        </div>
    );
};

export default StudentPortal;