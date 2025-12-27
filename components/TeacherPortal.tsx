
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutGrid, Users, CheckSquare, Table, Monitor, 
  BarChart2, Settings, LogOut, Menu, X, 
  CalendarDays, Trophy, BookOpen, 
  Sparkles, BrainCircuit, ShieldCheck, Inbox, FileSpreadsheet, Award, Globe, LineChart, Crown, User, Lightbulb, Ghost
} from 'lucide-react';
import { SystemUser } from '../types';
import BottomNavigation from './BottomNavigation';

interface TeacherPortalProps {
    currentUser: SystemUser;
    onLogout: () => void;
    children: React.ReactNode;
}

const NavItem = ({ path, label, icon: Icon, color, isActive, isCollapsed }: any) => {
    return (
        <Link 
            to={path} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${
                isActive 
                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 scale-[1.02]' 
                : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
            } ${isCollapsed ? 'justify-center px-0' : ''}`}
        >
            <Icon size={20} className={`${isActive ? 'text-white' : color || 'text-slate-400 group-hover:text-indigo-600'}`} />
            {!isCollapsed && <span className={`text-sm font-bold ${isActive ? 'font-black' : ''}`}>{label}</span>}
        </Link>
    );
};

const TeacherPortal: React.FC<TeacherPortalProps> = ({ currentUser, onLogout, children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-tajawal" dir="rtl">
            {/* Sidebar Desktop */}
            <aside className={`hidden lg:flex flex-col bg-white border-l border-slate-100 transition-all duration-500 z-30 shadow-2xl shadow-slate-200/50 ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
                <div className="p-8 border-b border-slate-50 flex items-center justify-between shrink-0">
                    {isSidebarOpen ? (
                        <div className="flex items-center gap-3 animate-fade-in">
                            <div className="w-11 h-11 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <Sparkles size={22}/>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-slate-800 text-base leading-tight">المتابع الذكي</span>
                                <span className="text-[9px] font-black text-indigo-500 tracking-widest uppercase">Cloud System v2.5</span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Sparkles size={18}/>
                            </div>
                        </div>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1.5 mt-4">
                    <NavItem path="/" label="لوحة التحكم" icon={LayoutGrid} isActive={location.pathname === '/'} isCollapsed={!isSidebarOpen} />
                    <NavItem path="/inbox" label="بريد المعلم" icon={Inbox} color="text-indigo-600" isActive={location.pathname === '/inbox'} isCollapsed={!isSidebarOpen} />
                    
                    <div className="pt-6 mt-4 border-t border-slate-50">
                        {isSidebarOpen && <label className="px-4 text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-widest opacity-60">الطلاب والمتابعة</label>}
                        <NavItem path="/students" label="قائمة الطلاب" icon={Users} isActive={location.pathname === '/students'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/attendance" label="التحضير اليومي" icon={CheckSquare} isActive={location.pathname === '/attendance'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/behavior" label="سجل السلوك" icon={ShieldCheck} color="text-amber-600" isActive={location.pathname === '/behavior'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/performance" label="كشف الدرجات" icon={FileSpreadsheet} color="text-emerald-600" isActive={location.pathname === '/performance'} isCollapsed={!isSidebarOpen} />
                    </div>

                    <div className="pt-6 mt-4 border-t border-slate-50">
                        {isSidebarOpen && <label className="px-4 text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-widest opacity-60">أدوات ذكية</label>}
                        <NavItem path="/classroom" label="إدارة الفصل" icon={Monitor} color="text-indigo-600" isActive={location.pathname === '/classroom'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/schedule" label="الجدول والخطة" icon={CalendarDays} isActive={location.pathname === '/schedule'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/lab" label="مختبر VARK" icon={BrainCircuit} color="text-orange-600" isActive={location.pathname === '/lab'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/reports" label="مركز التقارير" icon={BarChart2} isActive={location.pathname === '/reports'} isCollapsed={!isSidebarOpen} />
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-50 space-y-2 shrink-0">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-50 transition-all">
                        <Menu size={20}/>
                        {isSidebarOpen && <span className="text-sm font-bold">طي القائمة</span>}
                    </button>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 font-black transition-all">
                        <LogOut size={20}/>
                        {isSidebarOpen && <span>تسجيل خروج</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
                {/* Mobile Header */}
                <header className="lg:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 z-40 shrink-0 shadow-sm">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
                            <Sparkles size={16}/>
                        </div>
                        <span className="font-black text-slate-800 text-sm">المتابع الذكي</span>
                    </div>
                    <div className="flex items-center gap-3">
                         <button onClick={() => navigate('/inbox')} className="p-2 text-slate-400 relative">
                            <Inbox size={22}/>
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                         </button>
                         <div onClick={() => navigate('/profile')} className="w-8 h-8 bg-indigo-50 rounded-full border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs cursor-pointer shadow-inner">
                            {currentUser.name.charAt(0)}
                         </div>
                    </div>
                </header>

                {/* Content Container - The Fix for Clipping */}
                <main className="flex-1 relative flex flex-col h-full overflow-hidden">
                    <div className="absolute inset-0 overflow-y-auto custom-scrollbar flex flex-col h-full">
                        <div className="flex-1 min-h-full">
                            {children}
                        </div>
                    </div>
                </main>

                <BottomNavigation role={currentUser.role} onMenuClick={() => setIsMobileMenuOpen(true)} />
            </div>

            {/* Mobile Drawer Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[150] lg:hidden">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className="absolute top-0 right-0 h-full w-[85%] bg-white shadow-2xl flex flex-col animate-slide-right">
                        <div className="p-8 border-b flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                                    <Sparkles size={20}/>
                                </div>
                                <span className="font-black text-slate-800">القائمة الرئيسية</span>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-full text-slate-400"><X/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                             <NavItem path="/" label="لوحة التحكم" icon={LayoutGrid} isActive={location.pathname === '/'} />
                             <NavItem path="/attendance" label="التحضير اليومي" icon={CheckSquare} isActive={location.pathname === '/attendance'} />
                             <NavItem path="/performance" label="سجل الدرجات" icon={FileSpreadsheet} color="text-emerald-600" isActive={location.pathname === '/performance'} />
                             <NavItem path="/works" label="سجل الرصد" icon={Table} isActive={location.pathname === '/works'} />
                             <NavItem path="/noor" label="نظام نور" icon={Globe} color="text-blue-600" isActive={location.pathname === '/noor'} />
                             <NavItem path="/strategy" label="استراتيجية AI" icon={Lightbulb} color="text-amber-500" isActive={location.pathname === '/strategy'} />
                             <NavItem path="/analytics" label="تحليل AI" icon={LineChart} color="text-purple-600" isActive={location.pathname === '/analytics'} />
                             <NavItem path="/reports" label="التقارير" icon={BarChart2} isActive={location.pathname === '/reports'} />
                             <NavItem path="/profile" label="ملفي الشخصي" icon={User} isActive={location.pathname === '/profile'} />
                             <NavItem path="/school-mgmt" label="الإعدادات" icon={Settings} isActive={location.pathname === '/school-mgmt'} />
                             <button onClick={onLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-red-500 font-black mt-10 bg-red-50 transition-all active:scale-95"><LogOut size={22}/> تسجيل الخروج</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherPortal;
