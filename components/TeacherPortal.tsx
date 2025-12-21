import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutGrid, Users, CheckSquare, Table, Monitor, 
  BarChart2, Settings, LogOut, Bell, Menu, X, 
  CalendarDays, Trophy, BookOpen, MessageSquare, 
  Database, Sparkles, BrainCircuit, List, ShieldCheck, 
  ClipboardList, Inbox, FileSpreadsheet, ChevronLeft,
  ChevronRight, Bookmark, Award, MessageSquareQuote
} from 'lucide-react';
import { SystemUser } from '../types';
import BottomNavigation from './BottomNavigation';

interface TeacherPortalProps {
    currentUser: SystemUser;
    onLogout: () => void;
    children: React.ReactNode;
}

const NavSectionLabel = ({ label }: { label: string }) => (
    <div className="px-4 mt-8 mb-2">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</span>
    </div>
);

const NavItem = ({ path, label, icon: Icon, isActive }: any) => {
    return (
        <Link 
            to={path} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group relative ${
                isActive 
                ? 'bg-primary-800 text-white shadow-active scale-[1.02]' 
                : 'text-slate-500 hover:bg-slate-100 hover:text-primary-800'
            }`}
        >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-primary-800'}`} />
            <span className={`text-sm font-bold tracking-tight ${isActive ? 'font-black' : ''}`}>{label}</span>
            {isActive && (
                <div className="absolute left-2 w-1.5 h-1.5 bg-white rounded-full"></div>
            )}
        </Link>
    );
};

const TeacherPortal: React.FC<TeacherPortalProps> = ({ currentUser, onLogout, children }) => {
    const location = useLocation();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen bg-[#F1F5F9] overflow-hidden font-sans" dir="rtl">
            {/* Desktop Sidebar - Fixed & Official Look */}
            <aside className={`hidden lg:flex flex-col bg-white border-l border-slate-200 transition-all duration-500 z-30 shadow-premium ${isSidebarCollapsed ? 'w-24' : 'w-72'}`}>
                <div className="p-6 h-20 flex items-center justify-between border-b border-slate-50">
                    {!isSidebarCollapsed ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-800 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <Sparkles size={20} fill="currentColor"/>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-black text-slate-800 text-base leading-none">المتابع الذكي</span>
                                <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">إدارة تعليمية متكاملة</span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-primary-800 rounded-xl flex items-center justify-center text-white mx-auto shadow-md">
                            <Sparkles size={18}/>
                        </div>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1">
                    {!isSidebarCollapsed && <NavSectionLabel label="الرئيسية" />}
                    <NavItem path="/" label="لوحة التحكم" icon={LayoutGrid} isActive={location.pathname === '/'} isCollapsed={isSidebarCollapsed} />
                    <NavItem path="/inbox" label="صندوق الوارد" icon={Inbox} isActive={location.pathname === '/inbox'} isCollapsed={isSidebarCollapsed} />

                    {!isSidebarCollapsed && <NavSectionLabel label="إدارة الطلاب" />}
                    <NavItem path="/students" label="سجل الطلاب" icon={Users} isActive={location.pathname === '/students'} isCollapsed={isSidebarCollapsed} />
                    <NavItem path="/attendance" label="التحضير اليومي" icon={CheckSquare} isActive={location.pathname === '/attendance'} isCollapsed={isSidebarCollapsed} />
                    <NavItem path="/works" label="سجل رصد الأعمال" icon={FileSpreadsheet} isActive={location.pathname === '/works'} isCollapsed={isSidebarCollapsed} />
                    <NavItem path="/performance" label="كشف الدرجات" icon={Table} isActive={location.pathname === '/performance'} isCollapsed={isSidebarCollapsed} />

                    {!isSidebarCollapsed && <NavSectionLabel label="الأدوات والجدول" />}
                    <NavItem path="/schedule" label="الجدول الدراسي" icon={CalendarDays} isActive={location.pathname === '/schedule'} isCollapsed={isSidebarCollapsed} />
                    <NavItem path="/classroom" label="إدارة الفصل" icon={Monitor} isActive={location.pathname === '/classroom'} isCollapsed={isSidebarCollapsed} />
                    <NavItem path="/lab" label="مختبر الأنماط" icon={BrainCircuit} isActive={location.pathname === '/lab'} isCollapsed={isSidebarCollapsed} />
                    <NavItem path="/forms" label="محلل فورمز" icon={BarChart2} isActive={location.pathname === '/forms'} isCollapsed={isSidebarCollapsed} />
                    <NavItem path="/reports" label="التقارير والإحصاء" icon={ClipboardList} isActive={location.pathname === '/reports'} isCollapsed={isSidebarCollapsed} />
                </nav>

                <div className="p-4 border-t border-slate-100 space-y-2">
                    <NavItem path="/school-mgmt" label="الإعدادات" icon={Settings} isActive={location.pathname === '/school-mgmt'} isCollapsed={isSidebarCollapsed} />
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-rose-600 hover:bg-rose-50 font-bold transition-all group">
                        <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
                        {!isSidebarCollapsed && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </aside>

            {/* Main Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Desktop Top Header - Official Style */}
                <header className="hidden lg:flex h-20 bg-white border-b border-slate-200 items-center justify-between px-10 z-20 sticky top-0">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2.5 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors border border-slate-100 shadow-sm">
                            <Menu size={20}/>
                        </button>
                        <h2 className="font-black text-slate-800 text-lg">
                            {location.pathname === '/' ? 'ملخص الأداء العام' : 
                             location.pathname === '/attendance' ? 'إدارة حضور الطلاب' : 
                             location.pathname === '/students' ? 'قاعدة بيانات الطلاب' : 
                             location.pathname === '/works' ? 'سجل الرصد الموحد' : 'النظام الذكي'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                         <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-slate-800 leading-none">{currentUser.name}</span>
                            <span className="text-[10px] font-bold text-primary-600 mt-1 uppercase tracking-wider">{currentUser.role === 'TEACHER' ? 'معلم متخصص' : 'مدير نظام'}</span>
                         </div>
                         <div className="w-12 h-12 bg-primary-100 rounded-2xl border-2 border-white shadow-soft flex items-center justify-center text-primary-800 font-black text-xl">
                            {currentUser.name.charAt(0)}
                         </div>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden relative animate-official">
                    {children}
                </main>

                {/* Mobile Bottom Nav */}
                <BottomNavigation role={currentUser.role} onMenuClick={() => {}} />
            </div>
        </div>
    );
};

export default TeacherPortal;