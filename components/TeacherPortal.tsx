
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemUser } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, BarChart3, Calendar, 
    Monitor, PenTool, FileQuestion, Database, Gamepad2, 
    Activity, Shield, Settings, LogOut, Bell, Menu, X, ChevronLeft, ChevronRight,
    Inbox, User, Table, ShieldAlert, Globe, Award, Search, Command, Sparkles, 
    Moon, Sun, Mic, Camera, Wand2, Plus, MessageSquare, Heart
} from 'lucide-react';
import OmniSearch from './OmniSearch';
import VoiceObservation from './VoiceObservation';

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
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);
    const [isFabOpen, setIsFabOpen] = useState(false);

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
        </button>
    );

    return (
        <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-tajawal text-slate-800" dir="rtl">
            <OmniSearch isOpen={isOmniSearchOpen} onClose={() => setIsOmniSearchOpen(false)} students={[]} />
            {isVoiceOpen && <VoiceObservation students={[]} teacherId={currentUser.id} onClose={() => setIsVoiceOpen(false)} />}

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
                    <div className="mb-6">
                        {isSidebarOpen && <span className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-4">الرئيسية</span>}
                        <NavItem path="/" label="لوحة القيادة" icon={LayoutGrid} isActive={location.pathname === '/'} />
                        <NavItem path="/students" label="سجل الطلاب" icon={Users} isActive={location.pathname === '/students'} />
                        <NavItem path="/attendance" label="التحضير اليومي" icon={CheckSquare} isActive={location.pathname === '/attendance'} />
                        <NavItem path="/works" label="سجل الدرجات" icon={BarChart3} isActive={location.pathname === '/works'} />
                    </div>
                    
                    <div className="mb-6">
                        {isSidebarOpen && <span className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-4">أدوات ذكية</span>}
                        <NavItem path="/classroom" label="إدارة الفصل" icon={Monitor} isActive={location.pathname === '/classroom'} />
                        <NavItem path="/planning" label="تحضير الدروس" icon={PenTool} isActive={location.pathname === '/planning'} />
                        <NavItem path="/lab" label="مختبر VARK" icon={Wand2} isActive={location.pathname === '/lab'} />
                        <NavItem path="/behavior" label="متابعة السلوك" icon={Heart} isActive={location.pathname === '/behavior'} />
                    </div>

                    <div className="mb-6">
                        {isSidebarOpen && <span className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-4">تقارير ورسميات</span>}
                        <NavItem path="/reports" label="مركز التقارير" icon={Table} isActive={location.pathname === '/reports'} />
                        <NavItem path="/certificates" label="الأوسمة والشهادات" icon={Award} isActive={location.pathname === '/certificates'} />
                        <NavItem path="/interventions" label="التدخل التربوي" icon={ShieldAlert} isActive={location.pathname === '/interventions'} />
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

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                <header className="h-20 lg:h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-4 lg:px-10 shrink-0 z-40">
                    <div className="flex items-center gap-4 lg:gap-8">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-3 text-slate-600 bg-slate-100 rounded-2xl"><Menu size={22}/></button>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:flex p-3 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-2xl transition-all">
                            {isSidebarOpen ? <ChevronRight size={22}/> : <Menu size={22}/>}
                        </button>
                        <button onClick={() => setIsOmniSearchOpen(true)} className="flex items-center gap-4 px-6 py-3 bg-slate-100/50 hover:bg-slate-100 rounded-[1.5rem] text-slate-400 transition-all border border-transparent hover:border-slate-200 hidden md:flex">
                            <Search size={18}/><span className="text-xs font-black">بحث سريع (Ctrl + K)</span>
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2 lg:gap-6">
                        <div className="flex gap-1">
                            <button onClick={() => navigate('/inbox')} className="p-3 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 rounded-2xl transition-all relative">
                                <Inbox size={22} />
                                <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                            </button>
                            <button onClick={() => navigate('/meetings')} className="p-3 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 rounded-2xl transition-all">
                                <Calendar size={22} />
                            </button>
                        </div>
                        <div className="w-px h-8 bg-slate-100 mx-1 lg:mx-2"></div>
                        <div className="flex items-center gap-3 cursor-pointer p-1.5 rounded-2xl group" onClick={() => navigate('/profile')}>
                            <div className="text-left hidden sm:block">
                                <p className="text-xs font-black text-slate-900 leading-none">{currentUser.name}</p>
                            </div>
                            <div className="w-10 lg:w-12 h-10 lg:h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white shadow-xl">
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

                {/* Magic Floating Action Button (FAB) */}
                <div className="fixed bottom-8 left-8 z-[100] flex flex-col items-center gap-4">
                    {isFabOpen && (
                        <div className="flex flex-col gap-4 mb-4 animate-slide-up">
                            <FabAction icon={Mic} label="رصد صوتي" color="bg-purple-600" onClick={() => { setIsVoiceOpen(true); setIsFabOpen(false); }} />
                            <FabAction icon={Camera} label="رصد بصري" color="bg-indigo-600" onClick={() => { navigate('/attendance'); setIsFabOpen(false); }} />
                            <FabAction icon={MessageSquare} label="رسالة أسر" color="bg-emerald-600" onClick={() => { navigate('/inbox'); setIsFabOpen(false); }} />
                        </div>
                    )}
                    <button 
                        onClick={() => setIsFabOpen(!isFabOpen)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${isFabOpen ? 'bg-rose-500 rotate-45' : 'bg-slate-900 hover:bg-indigo-600'}`}
                    >
                        {isFabOpen ? <X size={28}/> : <Plus size={28}/>}
                    </button>
                </div>
            </div>
        </div>
    );
};

const FabAction = ({ icon: Icon, label, color, onClick }: any) => (
    <div className="flex items-center gap-4 group cursor-pointer" onClick={onClick}>
        <span className="bg-white px-3 py-1.5 rounded-xl shadow-lg text-[10px] font-black text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{label}</span>
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform`}>
            <Icon size={24}/>
        </div>
    </div>
);

export default TeacherPortal;
