import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutGrid, Users, CheckSquare, Table, Monitor, 
  BarChart2, Settings, LogOut, Bell, Menu, X, 
  CalendarDays, Trophy, BookOpen, MessageSquare, 
  Database, Sparkles, BrainCircuit, List, ShieldCheck, ClipboardList, Inbox, FileSpreadsheet
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
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                isActive 
                ? 'bg-primary-800 text-white shadow-active scale-[1.02]' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-primary-800'
            }`}
        >
            <Icon size={20} className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-800'}`} />
            {!isCollapsed && <span className={`text-sm font-bold tracking-tight ${isActive ? 'font-black' : ''}`}>{label}</span>}
        </Link>
    );
};

const TeacherPortal: React.FC<TeacherPortalProps> = ({ currentUser, onLogout, children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

    return (
        <div className="flex h-screen bg-slate-100 overflow-hidden font-sans" dir="rtl">
            {/* Sidebar Desktop - Official Style */}
            <aside className={`hidden lg:flex flex-col bg-white border-l border-slate-200 transition-all duration-500 z-30 shadow-premium ${isSidebarCollapsed ? 'w-24' : 'w-72'}`}>
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                    {!isSidebarCollapsed && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-800 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <Sparkles size={20} fill="currentColor"/>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-slate-800 tracking-tight text-base leading-none">المتابع الذكي</span>
                                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Official v2.5</span>
                            </div>
                        </div>
                    )}
                    <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                        <Menu size={22}/>
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-1.5">
                    <NavItem path="/" label="لوحة التحكم" icon={LayoutGrid} isActive={location.pathname === '/'} isCollapsed={isSidebarCollapsed} />
                    <NavItem path="/inbox" label="صندوق الوارد" icon={Inbox} isActive={location.pathname === '/inbox'} isCollapsed={isSidebarCollapsed} />
                    
                    <div className="pt-6 mt-4 border-t border-slate-50">
                        {!isSidebarCollapsed && <label className="px-4 text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-[0.2em]">الإدارة المدرسية</label>}
                        <NavItem path="/students" label="قائمة الطلاب" icon={Users} isActive={location.pathname === '/students'} isCollapsed={isSidebarCollapsed} />
                        <NavItem path="/schedule" label="الجدول الدراسي" icon={CalendarDays} isActive={location.pathname === '/schedule'} isCollapsed={isSidebarCollapsed} />
                        <NavItem path="/attendance" label="التحضير اليومي" icon={CheckSquare} isActive={location.pathname === '/attendance'} isCollapsed={isSidebarCollapsed} />
                        <NavItem path="/performance" label="سجل الدرجات" icon={FileSpreadsheet} isActive={location.pathname === '/performance'} isCollapsed={isSidebarCollapsed} />
                        <NavItem path="/works" label="كشف رصد الأعمال" icon={Table} isActive={location.pathname === '/works'} isCollapsed={isSidebarCollapsed} />
                    </div>

                    <div className="pt-6 mt-4 border-t border-slate-50">
                        {!isSidebarCollapsed && <label className="px-4 text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-[0.2em]">أدوات الذكاء</label>}
                        <NavItem path="/lab" label="مختبر الأنماط" icon={BrainCircuit} isActive={location.pathname === '/lab'} isCollapsed={isSidebarCollapsed} />
                        <NavItem path="/forms" label="محلل فورمز" icon={BarChart2} isActive={location.pathname === '/forms'} isCollapsed={isSidebarCollapsed} />
                    </div>
                </nav>

                <div className="p-6 border-t border-slate-50 space-y-2">
                    <NavItem path="/school-mgmt" label="الإعدادات الرسمية" icon={Settings} isActive={location.pathname === '/school-mgmt'} isCollapsed={isSidebarCollapsed} />
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-rose-600 hover:bg-rose-50 font-bold transition-all">
                        <LogOut size={20}/>
                        {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 relative bg-surface">
                {/* Desktop Top Header */}
                <header className="hidden lg:flex h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 items-center justify-between px-8 z-20 shrink-0 shadow-sm">
                    <div className="flex items-center gap-4">
                        <h2 className="font-black text-slate-800 text-lg">
                            {location.pathname === '/' ? 'لوحة التحكم المركزية' : 
                             location.pathname === '/attendance' ? 'إدارة الحضور والغياب' : 
                             location.pathname === '/performance' ? 'سجل الأداء الأكاديمي' : 'النظام الذكي'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-5">
                         <div className="flex flex-col items-left text-left">
                            <span className="text-sm font-black text-slate-800 leading-none">{currentUser.name}</span>
                            <span className="text-[10px] font-bold text-primary-600 mt-1 uppercase tracking-wider">{currentUser.role}</span>
                         </div>
                         <div className="w-11 h-11 bg-primary-100 rounded-2xl border-2 border-white shadow-sm flex items-center justify-center text-primary-800 font-black text-lg">
                            {currentUser.name.charAt(0)}
                         </div>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden relative pb-20 lg:pb-0 animate-official">
                    {children}
                </main>

                <BottomNavigation role={currentUser.role} onMenuClick={() => setIsMobileMenuOpen(true)} />
            </div>
        </div>
    );
};

export default TeacherPortal;