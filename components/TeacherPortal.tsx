import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutGrid, Users, CheckSquare, Table, Monitor, 
  BarChart2, Settings, LogOut, Bell, Menu, X, 
  CalendarDays, Trophy, BookOpen, MessageSquare, 
  Database, Sparkles, BrainCircuit, List, ShieldCheck, ClipboardList, Inbox, FileSpreadsheet, ChevronLeft
} from 'lucide-react';
import { SystemUser } from '../types';
import BottomNavigation from './BottomNavigation';

interface TeacherPortalProps {
    currentUser: SystemUser;
    onLogout: () => void;
    children: React.ReactNode;
}

const NavItem = ({ path, label, icon: Icon, isActive, isCollapsed }: any) => {
    return (
        <Link 
            to={path} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${
                isActive 
                ? 'bg-primary-800 text-white shadow-active scale-[1.02]' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-primary-800'
            }`}
        >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-800'}`} />
            {!isCollapsed && <span className={`text-sm font-bold tracking-tight ${isActive ? 'font-black' : ''}`}>{label}</span>}
            {isActive && !isCollapsed && <ChevronLeft size={14} className="mr-auto opacity-50" />}
        </Link>
    );
};

const TeacherPortal: React.FC<TeacherPortalProps> = ({ currentUser, onLogout, children }) => {
    const location = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans" dir="rtl">
            {/* Professional Sidebar */}
            <aside className={`hidden lg:flex flex-col bg-white border-l border-slate-200 transition-all duration-500 z-30 shadow-premium ${isSidebarCollapsed ? 'w-24' : 'w-72'}`}>
                <div className="p-8 flex items-center justify-between">
                    {!isSidebarCollapsed && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-800 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                                <Sparkles size={20} fill="currentColor"/>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-slate-800 text-base leading-none">المتابع الذكي</span>
                                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">PRO EDITION</span>
                            </div>
                        </div>
                    )}
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors mx-auto">
                        <Menu size={22}/>
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-5 space-y-1.5 custom-scrollbar">
                    <NavItem path="/" label="لوحة التحكم" icon={LayoutGrid} isActive={location.pathname === '/'} isCollapsed={isSidebarCollapsed} />
                    <NavItem path="/inbox" label="صندوق الوارد" icon={Inbox} isActive={location.pathname === '/inbox'} isCollapsed={isSidebarCollapsed} />
                    
                    <div className="pt-6 mt-4 border-t border-slate-100">
                        {!isSidebarCollapsed && <label className="px-4 text-[10px] font-black text-slate-300 block mb-3 uppercase tracking-[0.2em]">العمليات</label>}
                        <NavItem path="/students" label="الطلاب" icon={Users} isActive={location.pathname === '/students'} isCollapsed={isSidebarCollapsed} />
                        <NavItem path="/schedule" label="الجدول" icon={CalendarDays} isActive={location.pathname === '/schedule'} isCollapsed={isSidebarCollapsed} />
                        <NavItem path="/attendance" label="التحضير" icon={CheckSquare} isActive={location.pathname === '/attendance'} isCollapsed={isSidebarCollapsed} />
                        <NavItem path="/works" label="سجل الرصد" icon={FileSpreadsheet} isActive={location.pathname === '/works'} isCollapsed={isSidebarCollapsed} />
                    </div>

                    <div className="pt-6 mt-4 border-t border-slate-100">
                        {!isSidebarCollapsed && <label className="px-4 text-[10px] font-black text-slate-300 block mb-3 uppercase tracking-[0.2em]">الذكاء</label>}
                        <NavItem path="/lab" label="مختبر الأنماط" icon={BrainCircuit} isActive={location.pathname === '/lab'} isCollapsed={isSidebarCollapsed} />
                        <NavItem path="/forms" label="محلل فورمز" icon={BarChart2} isActive={location.pathname === '/forms'} isCollapsed={isSidebarCollapsed} />
                    </div>
                </nav>

                <div className="p-6 border-t border-slate-100 space-y-2">
                    <NavItem path="/school-mgmt" label="الإعدادات" icon={Settings} isActive={location.pathname === '/school-mgmt'} isCollapsed={isSidebarCollapsed} />
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-600 hover:bg-rose-50 font-bold transition-all group">
                        <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
                        {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Elegant Glass Header */}
                <header className="hidden lg:flex h-20 glass-header items-center justify-between px-10 z-20 sticky top-0">
                    <div>
                        <h2 className="font-black text-slate-800 text-lg">
                            {location.pathname === '/' ? 'نظرة عامة على الأداء' : 
                             location.pathname === '/attendance' ? 'إدارة الحضور والغياب' : 
                             location.pathname === '/works' ? 'سجل الرصد الموحد' : 'النظام الذكي'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-6">
                         <div className="text-left">
                            <p className="text-sm font-black text-slate-800 leading-none">{currentUser.name}</p>
                            <p className="text-[10px] font-bold text-primary-600 mt-1 uppercase tracking-wider">{currentUser.role === 'TEACHER' ? 'معلم متخصص' : 'مدير نظام'}</p>
                         </div>
                         <div className="w-12 h-12 bg-primary-100 rounded-2xl border-2 border-white shadow-soft flex items-center justify-center text-primary-800 font-black text-xl overflow-hidden">
                            {currentUser.name.charAt(0)}
                         </div>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden relative animate-official">
                    {children}
                </main>

                <BottomNavigation role={currentUser.role} onMenuClick={() => setIsMobileMenuOpen(true)} />
            </div>
        </div>
    );
};

export default TeacherPortal;