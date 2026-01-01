
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemUser } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, BarChart3, Calendar, 
    Monitor, PenTool, FileQuestion, Database, Gamepad2, 
    Activity, Shield, Settings, LogOut, Bell, Menu, X, ChevronLeft, ChevronRight,
    Inbox, User, Table, ShieldAlert, Globe, Award
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

    const NavItem = ({ path, label, icon: Icon, isActive }: any) => (
        <button 
            onClick={() => navigate(path)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                isActive 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-blue-600'
            }`}
        >
            <Icon size={18} />
            {isSidebarOpen && <span>{label}</span>}
        </button>
    );

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden" dir="rtl">
            {/* Sidebar الكلاسيكي */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-l border-slate-200 flex flex-col transition-all duration-300 z-50`}>
                <div className="h-16 flex items-center px-6 border-b border-slate-100">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white shrink-0">
                        <Shield size={20} />
                    </div>
                    {isSidebarOpen && <span className="mr-3 font-bold text-slate-800 text-lg">نظام المتابعة</span>}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                    <NavItem path="/" label="الرئيسية" icon={LayoutGrid} isActive={location.pathname === '/'} />
                    <NavItem path="/students" label="الطلاب" icon={Users} isActive={location.pathname === '/students'} />
                    <NavItem path="/attendance" label="التحضير" icon={CheckSquare} isActive={location.pathname === '/attendance'} />
                    <NavItem path="/works" label="سجل الدرجات" icon={BarChart3} isActive={location.pathname === '/works'} />
                    <NavItem path="/schedule" label="الجدول" icon={Calendar} isActive={location.pathname === '/schedule'} />
                    
                    <div className="my-4 border-t border-slate-100 pt-4">
                        {isSidebarOpen && <span className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">الأدوات</span>}
                        <NavItem path="/classroom" label="إدارة الفصل" icon={Monitor} isActive={location.pathname === '/classroom'} />
                        <NavItem path="/planning" label="التحضير" icon={PenTool} isActive={location.pathname === '/planning'} />
                        <NavItem path="/exams" label="الاختبارات" icon={FileQuestion} isActive={location.pathname === '/exams'} />
                        <NavItem path="/reports" label="التقارير" icon={Activity} isActive={location.pathname === '/reports'} />
                        <NavItem path="/custom-tables" label="الجداول" icon={Table} isActive={location.pathname === '/custom-tables'} />
                    </div>
                </div>

                <div className="p-3 border-t border-slate-100">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium">
                        <LogOut size={18} />
                        {isSidebarOpen && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </aside>

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-md">
                        {isSidebarOpen ? <X size={20}/> : <Menu size={20}/>}
                    </button>
                    
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-400 hover:text-blue-600 relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
                            <div className="text-left hidden sm:block">
                                <p className="text-xs font-bold text-slate-800 leading-none">{currentUser.name}</p>
                                <p className="text-[10px] text-slate-400 mt-1 uppercase">{currentUser.role}</p>
                            </div>
                            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-blue-600 border border-slate-200">
                                {currentUser.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherPortal;
