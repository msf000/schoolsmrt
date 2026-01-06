import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemUser } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, BarChart3, Calendar, 
    Monitor, PenTool, Database, Activity, Shield, Settings, 
    LogOut, Bell, Menu, ShieldAlert, Table, Briefcase, 
    Building, Zap, Award, Search, FileText, ClipboardList, 
    TrendingUp, BrainCircuit, Medal, Sparkles, CalendarDays,
    BookOpen, List, Map, MessageSquare, CheckCircle, Gamepad2,
    FileSpreadsheet, TableProperties
} from 'lucide-react';
import OmniSearch from './OmniSearch';
import NotificationsCenter from './NotificationsCenter';

interface Props {
    currentUser: SystemUser;
    onLogout: () => void;
    children: React.ReactNode;
}

const StaffPortal: React.FC<Props> = ({ currentUser, onLogout, children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const menuGroups = useMemo(() => {
        const role = currentUser.role;
        
        const groups = [
            {
                id: 'main',
                label: 'الرئيسية',
                roles: ['TEACHER', 'SCHOOL_MANAGER', 'SUPER_ADMIN'],
                items: [
                    { path: '/', label: 'لوحة التحكم', icon: LayoutGrid, roles: ['TEACHER', 'SCHOOL_MANAGER', 'SUPER_ADMIN'] },
                    { path: '/hall-of-fame', label: 'لوحة الشرف', icon: Award, roles: ['TEACHER', 'SCHOOL_MANAGER'] },
                ]
            },
            {
                id: 'academic',
                label: 'الشؤون التعليمية',
                roles: ['TEACHER'],
                items: [
                    { path: '/students', label: 'سجل الطلاب', icon: Users, roles: ['TEACHER'] },
                    { path: '/attendance', label: 'تحضير الحصص', icon: CheckSquare, roles: ['TEACHER'] },
                    { path: '/gradebook', label: 'سجل الرصد العام', icon: ClipboardList, roles: ['TEACHER'] },
                    { path: '/works', label: 'الرصد السريع', icon: TableProperties, roles: ['TEACHER'] },
                    { path: '/noor-export', label: 'مصدّر نظام نور', icon: FileSpreadsheet, roles: ['TEACHER'] },
                ]
            },
            {
                id: 'ai_tools',
                label: 'أدوات الذكاء والتقييم',
                roles: ['TEACHER'],
                items: [
                    { path: '/exams', label: 'الاختبارات الذكية', icon: FileText, roles: ['TEACHER'] },
                    { path: '/grading', label: 'تصحيح المهام', icon: CheckCircle, roles: ['TEACHER'] },
                    { path: '/lab', label: 'مختبر VARK', icon: Zap, roles: ['TEACHER'] },
                    { path: '/analytics', label: 'مركز التنبؤات', icon: BrainCircuit, roles: ['TEACHER'] },
                ]
            },
            {
                id: 'engagement',
                label: 'التفاعل والميدان',
                roles: ['TEACHER'],
                items: [
                    { path: '/classroom', label: 'إدارة القاعة', icon: Monitor, roles: ['TEACHER'] },
                    { path: '/planning', label: 'التحضير الآلي', icon: PenTool, roles: ['TEACHER'] },
                    { path: '/behavior', label: 'السلوك والتعزيز', icon: ShieldAlert, roles: ['TEACHER'] },
                    { path: '/games', label: 'الألعاب التعليمية', icon: Gamepad2, roles: ['TEACHER'] },
                ]
            },
            {
                id: 'management',
                label: 'الإدارة المدرسية',
                roles: ['SCHOOL_MANAGER'],
                items: [
                    { path: '/school-analytics', label: 'تحليل المدرسة', icon: Activity, roles: ['SCHOOL_MANAGER'] },
                    { path: '/teachers-mgmt', label: 'إدارة المعلمين', icon: Briefcase, roles: ['SCHOOL_MANAGER'] },
                    { path: '/all-students', label: 'السجل العام', icon: Users, roles: ['SCHOOL_MANAGER'] },
                ]
            },
            {
                id: 'settings',
                label: 'الإعدادات',
                roles: ['TEACHER', 'SCHOOL_MANAGER', 'SUPER_ADMIN'],
                items: [
                    { path: '/profile', label: 'الملف الشخصي', icon: Settings, roles: ['TEACHER', 'SCHOOL_MANAGER', 'SUPER_ADMIN'] },
                    { path: '/school-mgmt', label: 'إعدادات المنظومة', icon: Table, roles: ['TEACHER', 'SCHOOL_MANAGER'] },
                ]
            }
        ];

        return groups.filter(g => g.roles.includes(role));
    }, [currentUser.role]);

    const NavItem = ({ path, label, icon: Icon }: any) => {
        const isActive = location.pathname === path;
        return (
            <button 
                onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium mb-1 ${
                    isActive 
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-200' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {isSidebarOpen && <span className="truncate">{label}</span>}
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-[#f8fafc] font-tajawal text-slate-800 overflow-hidden" dir="rtl">
            <OmniSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} students={[]} />
            
            <aside className={`flex flex-col border-l border-slate-200 bg-white shadow-xl transition-all duration-300 z-50 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="h-16 flex items-center px-6 border-b border-slate-50 shrink-0">
                    <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
                        <Shield size={20} />
                    </div>
                    {isSidebarOpen && <span className="mr-3 font-black text-slate-900 text-lg block truncate">المتابع الذكي</span>}
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {menuGroups.map(group => (
                        <div key={group.id} className="mb-6">
                            {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{group.label}</p>}
                            {group.items.map(item => (
                                <NavItem key={item.path} {...item} />
                            ))}
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-50 shrink-0">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-sm font-black">
                        <LogOut size={18} />
                        {isSidebarOpen && <span>خروج</span>}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <header className="h-16 glass-header flex items-center justify-between px-8 z-40 shrink-0 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"><Menu size={20}/></button>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <h2 className="text-sm font-bold text-slate-600">بوابة الموظفين</h2>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSearchOpen(true)} className="p-2 text-slate-400 hover:text-brand-500 transition-colors hidden md:block">
                            <Search size={20} />
                        </button>
                        <NotificationsCenter userId={currentUser.id} />
                        <div className="flex items-center gap-3 cursor-pointer group px-3 py-1.5 rounded-xl hover:bg-slate-50" onClick={() => navigate('/profile')}>
                            <div className="text-left hidden sm:block">
                                <p className="text-xs font-black text-slate-900 leading-none">{currentUser.name}</p>
                                <p className="text-[9px] text-slate-400 mt-1 uppercase font-black">{currentUser.role}</p>
                            </div>
                            <div className="w-9 h-9 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-black border border-brand-100 group-hover:bg-brand-500 group-hover:text-white transition-all">
                                {currentUser.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-6xl mx-auto pb-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default StaffPortal;