
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemUser } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, BarChart3, BookOpen, 
    Settings, LogOut, Monitor, Gamepad2, Inbox, 
    ChevronLeft, ChevronRight, Menu, Bell, Search,
    FileQuestion, Library, Trophy, Award, Sparkles, 
    ShieldAlert, BrainCircuit, Calendar, PenTool, Zap, Heart,
    Star, Shield, CreditCard, Bot, User, Table, Database, Activity,
    ScanLine, DownloadCloud, MessageSquare, History, Globe
} from 'lucide-react';

interface Props {
    currentUser: SystemUser;
    onLogout: () => void;
    children: React.ReactNode;
}

const TeacherPortal: React.FC<Props> = ({ currentUser, onLogout, children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
    const isManager = currentUser.role === 'SCHOOL_MANAGER' || isSuperAdmin;

    const NavItem = ({ path, label, icon: Icon, color, isActive, isCollapsed }: any) => (
        <button 
            onClick={() => navigate(path)}
            className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group ${isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-[1.02]' : 'text-slate-500 hover:bg-slate-50 hover:translate-x-[-4px]'}`}
        >
            <div className={`shrink-0 ${isActive ? 'text-white' : color}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            {!isCollapsed && <span className="font-black text-[11px] whitespace-nowrap">{label}</span>}
        </button>
    );

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-tajawal" dir="rtl">
            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-white border-l border-slate-100 flex flex-col transition-all duration-500 relative z-50 shadow-2xl`}>
                <div className="p-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                        <Sparkles size={20} />
                    </div>
                    {isSidebarOpen && <h1 className="font-black text-lg text-slate-800 tracking-tight">المتابع الذكي</h1>}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                    <label className={`px-4 text-[9px] font-black text-slate-400 block mb-2 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>الأساسية</label>
                    <NavItem path="/" label="لوحة التحكم" icon={LayoutGrid} color="text-blue-500" isActive={location.pathname === '/'} isCollapsed={!isSidebarOpen} />
                    <NavItem path="/students" label="إدارة الطلاب" icon={Users} color="text-teal-500" isActive={location.pathname === '/students'} isCollapsed={!isSidebarOpen} />
                    <NavItem path="/attendance" label="التحضير اليومي" icon={CheckSquare} color="text-emerald-500" isActive={location.pathname === '/attendance'} isCollapsed={!isSidebarOpen} />
                    <NavItem path="/works" label="سجل الرصد" icon={BarChart3} color="text-amber-500" isActive={location.pathname === '/works'} isCollapsed={!isSidebarOpen} />
                    <NavItem path="/schedule" label="الجدول والخطة" icon={Calendar} color="text-rose-500" isActive={location.pathname === '/schedule'} isCollapsed={!isSidebarOpen} />

                    <div className="pt-4">
                        <label className={`px-4 text-[9px] font-black text-slate-400 block mb-2 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>أدوات التدريس</label>
                        <NavItem path="/classroom" label="إدارة الفصل" icon={Monitor} color="text-indigo-600" isActive={location.pathname === '/classroom'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/planning" label="تحضير الدروس" icon={PenTool} color="text-purple-600" isActive={location.pathname === '/planning'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/exams" label="الاختبارات" icon={FileQuestion} color="text-pink-600" isActive={location.pathname === '/exams'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/auto-grade" label="المصحح الآلي" icon={ScanLine} color="text-fuchsia-600" isActive={location.pathname === '/auto-grade'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/bank" label="بنك الأسئلة" icon={Database} color="text-cyan-600" isActive={location.pathname === '/bank'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/games" label="مصنع الألعاب" icon={Gamepad2} color="text-orange-500" isActive={location.pathname === '/games'} isCollapsed={!isSidebarOpen} />
                    </div>

                    <div className="pt-4">
                        <label className={`px-4 text-[9px] font-black text-slate-400 block mb-2 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>الذكاء والتحليل</label>
                        <NavItem path="/lab" label="مختبر الأنماط" icon={BrainCircuit} color="text-indigo-500" isActive={location.pathname === '/lab'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/behavior-ai" label="محلل السلوك AI" icon={Bot} color="text-violet-600" isActive={location.pathname === '/behavior-ai'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/reports" label="مركز التقارير" icon={Activity} color="text-purple-500" isActive={location.pathname === '/reports'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/followup" label="الملف الموحد" icon={User} color="text-blue-600" isActive={location.pathname === '/followup'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/interventions" label="التدخلات" icon={ShieldAlert} color="text-red-500" isActive={location.pathname === '/interventions'} isCollapsed={!isSidebarOpen} />
                    </div>

                    <div className="pt-4">
                        <label className={`px-4 text-[9px] font-black text-slate-400 block mb-2 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>الإدارة والضبط</label>
                        {isSuperAdmin && <NavItem path="/admin" label="لوحة النظام" icon={Shield} color="text-slate-900" isActive={location.pathname === '/admin'} isCollapsed={!isSidebarOpen} />}
                        <NavItem path="/principal" label="لوحة القائد" icon={Trophy} color="text-yellow-600" isActive={location.pathname === '/principal'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/noor-export" label="مصدّر نور" icon={DownloadCloud} color="text-teal-600" isActive={location.pathname === '/noor-export'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/school-mgmt" label="إدارة المنشأة" icon={Settings} color="text-blue-700" isActive={location.pathname === '/school-mgmt'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/custom-tables" label="جداول سحابية" icon={Table} color="text-teal-600" isActive={location.pathname === '/custom-tables'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/meetings" label="اللقاءات" icon={Calendar} color="text-amber-600" isActive={location.pathname === '/meetings'} isCollapsed={!isSidebarOpen} />
                    </div>

                    <div className="pt-4">
                        <label className={`px-4 text-[9px] font-black text-slate-400 block mb-2 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>التواصل والموارد</label>
                        <NavItem path="/wall" label="حائط المدرسة" icon={Globe} color="text-indigo-400" isActive={location.pathname === '/wall'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/badges" label="الأوسمة الذكية" icon={Star} color="text-yellow-500" isActive={location.pathname === '/badges'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/certificates" label="الشهادات" icon={Award} color="text-purple-500" isActive={location.pathname === '/certificates'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/library" label="المكتبة" icon={Library} color="text-blue-600" isActive={location.pathname === '/library'} isCollapsed={!isSidebarOpen} />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-50 space-y-2">
                    <NavItem path="/inbox" label="البريد" icon={Inbox} color="text-indigo-600" isActive={location.pathname === '/inbox'} isCollapsed={!isSidebarOpen} />
                    <button onClick={onLogout} className="w-full flex items-center gap-4 p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all font-black text-xs">
                        <LogOut size={20} />
                        {isSidebarOpen && <span>تسجيل الخروج</span>}
                    </button>
                </div>

                <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute -left-4 top-10 bg-white border border-slate-100 p-1.5 rounded-full shadow-lg text-slate-400 hover:text-indigo-600 transition-all z-50"
                >
                    {isSidebarOpen ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 shrink-0 relative z-40">
                    <div className="flex items-center gap-4">
                        <div className="lg:hidden p-2 text-slate-400" onClick={() => setIsSidebarOpen(true)}>
                            <Menu />
                        </div>
                        <h2 className="font-black text-slate-800 hidden md:block text-sm">أهلاً بك، {currentUser.name}</h2>
                        <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{currentUser.role}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                             Cloud Sync: Active
                        </div>
                        <button className="relative p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 transition-all" onClick={() => navigate('/inbox')}>
                            <Inbox size={18} />
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full border-2 border-white"></div>
                        </button>
                        <div className="flex items-center gap-3 pr-4 border-r border-slate-100 cursor-pointer" onClick={() => navigate('/profile')}>
                            <div className="text-left hidden sm:block">
                                <p className="text-[10px] font-black text-slate-800 leading-none">{currentUser.name.split(' ')[0]}</p>
                            </div>
                            <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center font-black text-indigo-600 text-xs shadow-inner">
                                {currentUser.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#F8FAFC]">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default TeacherPortal;
