
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemUser } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, BarChart3, Calendar, 
    Monitor, PenTool, FileQuestion, Database, Gamepad2, 
    Activity, Shield, Settings, LogOut, Bell, Menu, X, ChevronLeft, ChevronRight,
    Inbox, User, Table, ShieldAlert, Globe, Award, Search, Plus, Mic, Camera
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

    const NavItem = ({ path, label, icon: Icon }: any) => {
        const isActive = location.pathname === path;
        return (
            <button 
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium mb-1 ${
                    isActive 
                    ? 'sidebar-item-active' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {isSidebarOpen && <span>{label}</span>}
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-[#f8fafc] font-tajawal text-slate-800" dir="rtl">
            {/* Minimalist Sidebar */}
            <aside className={`flex flex-col border-l border-slate-200 bg-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="h-16 flex items-center px-6 border-b border-slate-50">
                    <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white shrink-0">
                        <Shield size={20} />
                    </div>
                    {isSidebarOpen && (
                        <div className="mr-3 overflow-hidden">
                            <span className="font-bold text-slate-900 text-lg block truncate">المتابع الذكي</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="space-y-6">
                        <div>
                            {isSidebarOpen && <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">عام</p>}
                            <NavItem path="/" label="لوحة التحكم" icon={LayoutGrid} />
                            <NavItem path="/students" label="الطلاب" icon={Users} />
                            <NavItem path="/attendance" label="التحضير" icon={CheckSquare} />
                            <NavItem path="/works" label="الدرجات" icon={BarChart3} />
                        </div>
                        
                        <div>
                            {isSidebarOpen && <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">الأدوات</p>}
                            <NavItem path="/classroom" label="إدارة الفصل" icon={Monitor} />
                            <NavItem path="/planning" label="التحضير الذكي" icon={PenTool} />
                            <NavItem path="/behavior" label="السلوك" icon={ShieldAlert} />
                            <NavItem path="/lab" label="المختبر" icon={Activity} />
                        </div>

                        <div>
                            {isSidebarOpen && <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">النظام</p>}
                            <NavItem path="/reports" label="التقارير" icon={Table} />
                            <NavItem path="/school-mgmt" label="الإعدادات" icon={Settings} />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-50">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-sm font-bold">
                        <LogOut size={18} />
                        {isSidebarOpen && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 glass-header flex items-center justify-between px-8 z-40">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                            <Menu size={20}/>
                        </button>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <h2 className="text-sm font-bold text-slate-600">لوحة إدارة المعلم</h2>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-400 hover:text-brand-500 relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                        </button>
                        <div className="flex items-center gap-3 cursor-pointer group px-2 py-1 rounded-lg hover:bg-slate-50" onClick={() => navigate('/profile')}>
                            <div className="text-left hidden sm:block">
                                <p className="text-xs font-bold text-slate-900 leading-none">{currentUser.name}</p>
                                <p className="text-[10px] text-slate-400 mt-1">معلم مادة</p>
                            </div>
                            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-600 border border-slate-200">
                                {currentUser.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-6xl mx-auto page-enter">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TeacherPortal;
