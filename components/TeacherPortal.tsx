
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemUser } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, BarChart3, Calendar, 
    Monitor, PenTool, FileQuestion, Database, Gamepad2, 
    Activity, Shield, Settings, LogOut, Bell, Menu, X, ChevronLeft, ChevronRight,
    Inbox, User, Table, ShieldAlert, Globe, Award, Search, Command, Sparkles, Moon, Sun
} from 'lucide-react';
import OmniSearch from './OmniSearch';

interface Props {
    currentUser: SystemUser;
    onLogout: () => void;
    children: React.ReactNode;
}

const TeacherPortal: React.FC<Props> = ({ currentUser, onLogout, children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isOmniSearchOpen, setIsOmniSearchOpen] = useState(false);

    // متابعة حجم الشاشة
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setIsSidebarOpen(false);
            else setIsSidebarOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const NavItem = ({ path, label, icon: Icon, isActive }: any) => (
        <button 
            onClick={() => {
                navigate(path);
                if (window.innerWidth < 1024) setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 text-sm font-black ${
                isActive 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 translate-x-[-4px]' 
                : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
            }`}
        >
            <Icon size={20} strokeWidth={isActive ? 3 : 2} className={isActive ? 'animate-pulse' : ''} />
            {(isSidebarOpen || isMobileMenuOpen) && <span>{label}</span>}
            {isActive && (isSidebarOpen || isMobileMenuOpen) && <div className="mr-auto w-1.5 h-1.5 rounded-full bg-white animate-ping"></div>}
        </button>
    );

    return (
        <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-tajawal text-slate-800" dir="rtl">
            <OmniSearch isOpen={isOmniSearchOpen} onClose={() => setIsOmniSearchOpen(false)} students={[]} />

            {/* Sidebar Desktop */}
            <aside className={`hidden lg:flex flex-col transition-all duration-500 ease-in-out bg-white border-l border-slate-100 shadow-sm ${isSidebarOpen ? 'w-80' : 'w-24'}`}>
                <div className="h-24 flex items-center px-8 border-b border-slate-50 shrink-0">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-indigo-100 transform rotate-3 hover:rotate-0 transition-transform">
                        <Shield size={28} />
                    </div>
                    {isSidebarOpen && (
                        <div className="mr-4 overflow-hidden animate-fade-in">
                            <span className="font-black text-slate-900 text-xl block whitespace-nowrap tracking-tight">المتابع الذكي</span>
                            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] block">Unified Cloud</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-1">
                    <div className="mb-8">
                        {isSidebarOpen && <span className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-4">القائمة الرئيسية</span>}
                        <NavItem path="/" label="لوحة القيادة" icon={LayoutGrid} isActive={location.pathname === '/'} />
                        <NavItem path="/students" label="سجل الطلاب" icon={Users} isActive={location.pathname === '/students'} />
                        <NavItem path="/attendance" label="التحضير اليومي" icon={CheckSquare} isActive={location.pathname === '/attendance'} />
                        <NavItem path="/works" label="سجل الدرجات" icon={BarChart3} isActive={location.pathname === '/works'} />
                        <NavItem path="/schedule" label="الجدول الدراسي" icon={Calendar} isActive={location.pathname === '/schedule'} />
                    </div>
                    
                    <div className="pt-6 border-t border-slate-50">
                        {isSidebarOpen && <span className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-4">أدوات ذكية</span>}
                        <NavItem path="/classroom" label="إدارة الفصل" icon={Monitor} isActive={location.pathname === '/classroom'} />
                        <NavItem path="/planning" label="تحضير الدروس" icon={PenTool} isActive={location.pathname === '/planning'} />
                        <NavItem path="/exams" label="بنك الاختبارات" icon={FileQuestion} isActive={location.pathname === '/exams'} />
                        <NavItem path="/reports" label="مركز التقارير" icon={Table} isActive={location.pathname === '/reports'} />
                        <NavItem path="/ai-config" label="إعدادات AI" icon={Sparkles} isActive={location.pathname === '/ai-config'} />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-50 space-y-2">
                    <NavItem path="/profile" label="حسابي" icon={User} isActive={location.pathname === '/profile'} />
                    <button onClick={onLogout} className="w-full flex items-center gap-4 px-4 py-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all text-sm font-black">
                        <LogOut size={20} />
                        {isSidebarOpen && <span>خروج آمن</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] lg:hidden">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <aside className="absolute top-0 right-0 h-full w-4/5 bg-white shadow-2xl animate-slide-right flex flex-col">
                        <div className="h-24 flex items-center justify-between px-8 border-b">
                            <div className="flex items-center">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                    <Shield size={22} />
                                </div>
                                <span className="mr-3 font-black text-slate-900">المتابع الذكي</span>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:bg-slate-50 rounded-full"><X/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-2">
                            <NavItem path="/" label="الرئيسية" icon={LayoutGrid} isActive={location.pathname === '/'} />
                            <NavItem path="/students" label="الطلاب" icon={Users} isActive={location.pathname === '/students'} />
                            <NavItem path="/attendance" label="التحضير" icon={CheckSquare} isActive={location.pathname === '/attendance'} />
                            <NavItem path="/works" label="الدرجات" icon={BarChart3} isActive={location.pathname === '/works'} />
                            <NavItem path="/classroom" label="إدارة الفصل" icon={Monitor} isActive={location.pathname === '/classroom'} />
                            <NavItem path="/planning" label="التحضير الذكي" icon={PenTool} isActive={location.pathname === '/planning'} />
                            <NavItem path="/reports" label="التقارير" icon={Table} isActive={location.pathname === '/reports'} />
                            <div className="my-6 border-t pt-6">
                                <NavItem path="/profile" label="الملف الشخصي" icon={User} isActive={location.pathname === '/profile'} />
                                <button onClick={onLogout} className="w-full flex items-center gap-4 px-4 py-3.5 text-rose-500 font-black text-sm"><LogOut size={20}/> تسجيل خروج</button>
                            </div>
                        </div>
                    </aside>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-20 lg:h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-4 lg:px-10 shrink-0 z-40">
                    <div className="flex items-center gap-4 lg:gap-8">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-3 text-slate-600 bg-slate-100 rounded-2xl">
                            <Menu size={22}/>
                        </button>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:flex p-3 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-2xl transition-all">
                            {isSidebarOpen ? <ChevronRight size={22}/> : <Menu size={22}/>}
                        </button>
                        
                        <div className="relative group hidden md:block">
                            <button 
                                onClick={() => setIsOmniSearchOpen(true)}
                                className="flex items-center gap-4 px-6 py-3 bg-slate-100/50 hover:bg-slate-100 rounded-[1.5rem] text-slate-400 transition-all border border-transparent hover:border-slate-200"
                            >
                                <Search size={18} className="group-hover:text-indigo-600 transition-colors"/>
                                <span className="text-xs font-black w-40 lg:w-60 text-right">بحث سريع (Ctrl + K)</span>
                                <div className="flex gap-1 items-center bg-white px-2 py-1 rounded-lg border text-[10px] font-black text-slate-300">
                                    <Command size={10}/> K
                                </div>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 lg:gap-6">
                        <div className="flex gap-1">
                            <button className="p-3 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 rounded-2xl transition-all relative">
                                <Bell size={22} />
                                <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                            </button>
                            <button className="p-3 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 rounded-2xl transition-all">
                                <Inbox size={22} />
                            </button>
                        </div>
                        
                        <div className="w-px h-8 bg-slate-100 mx-1 lg:mx-2"></div>

                        <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-2xl transition-all group" onClick={() => navigate('/profile')}>
                            <div className="text-left hidden sm:block">
                                <p className="text-xs font-black text-slate-900 leading-none truncate max-w-[120px]">{currentUser.name}</p>
                                <p className="text-[9px] text-indigo-500 mt-1 font-black uppercase tracking-widest">{currentUser.role === 'TEACHER' ? 'معلم ممارس' : 'إدارة'}</p>
                            </div>
                            <div className="w-10 lg:w-12 h-10 lg:h-12 bg-gradient-to-tr from-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center font-black text-white shadow-xl shadow-indigo-100 border-2 border-white group-hover:scale-110 transition-transform">
                                {currentUser.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-10 bg-[#f8fafc]">
                    <div className="max-w-7xl mx-auto h-full page-transition">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TeacherPortal;
