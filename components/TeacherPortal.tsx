
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemUser } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, BarChart3, Calendar, 
    Monitor, PenTool, FileQuestion, Database, Gamepad2, 
    Activity, Shield, Settings, LogOut, Bell, Menu, X, ChevronLeft, ChevronRight,
    Inbox, User, Table, ShieldAlert, Globe, Award, Search, Command
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isOmniSearchOpen, setIsOmniSearchOpen] = useState(false);

    const NavItem = ({ path, label, icon: Icon, isActive }: any) => (
        <button 
            onClick={() => navigate(path)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20 translate-x-[-4px]' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
            }`}
        >
            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
            {isSidebarOpen && <span>{label}</span>}
        </button>
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-tajawal" dir="rtl">
            <OmniSearch isOpen={isOmniSearchOpen} onClose={() => setIsOmniSearchOpen(false)} students={[]} />

            {/* Sidebar الكلاسيكي الفاخر */}
            <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-white border-l border-slate-200 flex flex-col transition-all duration-500 z-50 shadow-sm`}>
                <div className="h-20 flex items-center px-6 border-b border-slate-100 shrink-0">
                    <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200">
                        <Shield size={24} />
                    </div>
                    {isSidebarOpen && (
                        <div className="mr-3 overflow-hidden">
                            <span className="font-black text-slate-800 text-lg block whitespace-nowrap">نظام المتابعة</span>
                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest block">Cloud Academic</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
                    <div className="mb-4">
                        {isSidebarOpen && <span className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">القائمة الرئيسية</span>}
                        <NavItem path="/" label="لوحة القيادة" icon={LayoutGrid} isActive={location.pathname === '/'} />
                        <NavItem path="/students" label="سجل الطلاب" icon={Users} isActive={location.pathname === '/students'} />
                        <NavItem path="/attendance" label="التحضير اليومي" icon={CheckSquare} isActive={location.pathname === '/attendance'} />
                        <NavItem path="/works" label="سجل الدرجات" icon={BarChart3} isActive={location.pathname === '/works'} />
                        <NavItem path="/schedule" label="الجدول الدراسي" icon={Calendar} isActive={location.pathname === '/schedule'} />
                    </div>
                    
                    <div className="my-6 pt-4 border-t border-slate-100">
                        {isSidebarOpen && <span className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">أدوات ذكية</span>}
                        <NavItem path="/classroom" label="إدارة الفصل" icon={Monitor} isActive={location.pathname === '/classroom'} />
                        <NavItem path="/planning" label="تحضير الدروس (AI)" icon={PenTool} isActive={location.pathname === '/planning'} />
                        <NavItem path="/exams" label="بنك الاختبارات" icon={FileQuestion} isActive={location.pathname === '/exams'} />
                        <NavItem path="/lab" label="مختبر الأنماط" icon={Activity} isActive={location.pathname === '/lab'} />
                        <NavItem path="/reports" label="مركز التقارير" icon={Table} isActive={location.pathname === '/reports'} />
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 space-y-2">
                    <button onClick={() => navigate('/profile')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors text-sm font-bold">
                        <User size={18} />
                        {isSidebarOpen && <span>الملف الشخصي</span>}
                    </button>
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm font-bold">
                        <LogOut size={18} />
                        {isSidebarOpen && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-40">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                            {isSidebarOpen ? <Menu size={20}/> : <Menu size={20}/>}
                        </button>
                        
                        <button 
                            onClick={() => setIsOmniSearchOpen(true)}
                            className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-400 transition-all border border-transparent hover:border-slate-300 group"
                        >
                            <Search size={16} className="group-hover:text-blue-600 transition-colors"/>
                            <span className="text-xs font-bold w-48 text-right">ابحث عن أي شيء...</span>
                            <div className="flex gap-1 items-center bg-white px-1.5 py-0.5 rounded border text-[10px] font-black">
                                <Command size={10}/> K
                            </div>
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/inbox')} className="p-2.5 text-slate-400 hover:bg-slate-100 rounded-xl relative transition-all">
                            <Inbox size={20} />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        
                        <div className="w-px h-8 bg-slate-200 mx-2"></div>

                        <div className="flex items-center gap-4 cursor-pointer hover:bg-slate-50 p-1.5 rounded-2xl transition-all" onClick={() => navigate('/profile')}>
                            <div className="text-left hidden lg:block">
                                <p className="text-xs font-black text-slate-800 leading-none">{currentUser.name}</p>
                                <p className="text-[9px] text-blue-600 mt-1 font-black uppercase tracking-wider">{currentUser.role === 'TEACHER' ? 'معلم ممارس' : currentUser.role}</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-800 rounded-xl flex items-center justify-center font-black text-white shadow-lg border-2 border-white">
                                {currentUser.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherPortal;
