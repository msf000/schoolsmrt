
import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutGrid, Users, CheckSquare, Table, Monitor, 
  BarChart2, Settings, LogOut, Menu, X, 
  CalendarDays, Trophy, BookOpen, 
  Sparkles, BrainCircuit, ShieldCheck, Inbox, FileSpreadsheet, Award, Globe, LineChart, Crown, User, Lightbulb, Zap, ShoppingBag
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
                        {isSidebarOpen && <label className="px-4 text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-widest opacity-60">المتابعة اليومية</label>}
                        <NavItem path="/students" label="الطلاب" icon={Users} isActive={location.pathname === '/students'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/attendance" label="التحضير" icon={CheckSquare} isActive={location.pathname === '/attendance'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/performance" label="الدرجات" icon={FileSpreadsheet} color="text-emerald-600" isActive={location.pathname === '/performance'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/behavior" label="السلوك" icon={ShieldCheck} color="text-amber-600" isActive={location.pathname === '/behavior'} isCollapsed={!isSidebarOpen} />
                    </div>

                    <div className="pt-6 mt-4 border-t border-slate-50">
                        {isSidebarOpen && <label className="px-4 text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-widest opacity-60">الأدوات الذكية</label>}
                        <NavItem path="/classroom" label="إدارة الفصل" icon={Monitor} color="text-indigo-600" isActive={location.pathname === '/classroom'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/schedule" label="الجدول" icon={CalendarDays} isActive={location.pathname === '/schedule'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/lab" label="مختبر VARK" icon={BrainCircuit} color="text-orange-600" isActive={location.pathname === '/lab'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/badges" label="الأوسمة (AI)" icon={Award} color="text-purple-600" isActive={location.pathname === '/badges'} isCollapsed={!isSidebarOpen} />
                    </div>

                    <div className="pt-6 mt-4 border-t border-slate-50">
                        {isSidebarOpen && <label className="px-4 text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-widest opacity-60">التحفيز والتقارير</label>}
                        <NavItem path="/challenges" label="التحديات" icon={Trophy} color="text-yellow-600" isActive={location.pathname === '/challenges'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/shop-admin" label="المتجر" icon={ShoppingBag} color="text-pink-600" isActive={location.pathname === '/shop-admin'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/noor" label="نظام نور" icon={Globe} color="text-blue-600" isActive={location.pathname === '/noor'} isCollapsed={!isSidebarOpen} />
                        <NavItem path="/reports" label="التقارير" icon={BarChart2} isActive={location.pathname === '/reports'} isCollapsed={!isSidebarOpen} />
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-50 space-y-2 shrink-0">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-slate-50 transition-all">
                        <Menu size={20}/>
                        {isSidebarOpen && <span className="text-sm font-bold">طي القائمة</span>}
                    </button>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 font-black transition-all">
                        <LogOut size={20}/>
                        {isSidebarOpen && <span>خروج</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC] relative">
                {/* Mobile Header */}
                <header className="lg:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 z-40 shrink-0">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                            <Sparkles size={16}/>
                        </div>
                        <span className="font-black text-slate-800 text-sm">المتابع الذكي</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-500 bg-slate-50 rounded-xl">
                        <Menu size={20}/>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                    {children}
                </main>

                <BottomNavigation role={currentUser.role} onMenuClick={() => setIsMobileMenuOpen(true)} />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[150] lg:hidden">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className="absolute top-0 right-0 h-full w-[80%] bg-white shadow-2xl flex flex-col animate-slide-right">
                        <div className="p-8 border-b flex items-center justify-between">
                            <span className="font-black text-slate-800">القائمة</span>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-50 rounded-full"><X/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                             <NavItem path="/" label="الرئيسية" icon={LayoutGrid} isActive={location.pathname === '/'} />
                             <NavItem path="/inbox" label="البريد" icon={Inbox} isActive={location.pathname === '/inbox'} />
                             <NavItem path="/students" label="الطلاب" icon={Users} isActive={location.pathname === '/students'} />
                             <NavItem path="/attendance" label="التحضير" icon={CheckSquare} isActive={location.pathname === '/attendance'} />
                             <NavItem path="/performance" label="الدرجات" icon={FileSpreadsheet} isActive={location.pathname === '/performance'} />
                             <NavItem path="/classroom" label="إدارة الفصل" icon={Monitor} isActive={location.pathname === '/classroom'} />
                             <NavItem path="/reports" label="التقارير" icon={BarChart2} isActive={location.pathname === '/reports'} />
                             <NavItem path="/school-mgmt" label="الإعدادات" icon={Settings} isActive={location.pathname === '/school-mgmt'} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherPortal;
