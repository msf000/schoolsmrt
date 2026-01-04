
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemUser } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, BarChart3, Calendar, 
    Monitor, PenTool, Database, Activity, Shield, Settings, 
    LogOut, Bell, Menu, ShieldAlert, Table, Briefcase, 
    Building, Zap, Award, Search, FileText, ClipboardList, 
    TrendingUp, BrainCircuit, Medal, Sparkles, CalendarDays,
    BookOpen, List, Map, MessageSquare
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
                    { path: '/wall', label: 'حائط المدرسة', icon: Newspaper, roles: ['TEACHER', 'SCHOOL_MANAGER'] },
                ]
            },
            {
                id: 'academic',
                label: 'الشؤون التعليمية',
                roles: ['TEACHER'],
                items: [
                    { path: '/students', label: 'الطلاب', icon: Users, roles: ['TEACHER'] },
                    { path: '/attendance', label: 'التحضير', icon: CheckSquare, roles: ['TEACHER'] },
                    { path: '/gradebook', label: 'سجل الرصد', icon: ClipboardList, roles: ['TEACHER'] },
                    { path: '/exams', label: 'الاختبارات', icon: FileText, roles: ['TEACHER'] },
                    { path: '/grading', label: 'تصحيح المهام', icon: CheckCircle, roles: ['TEACHER'] },
                    { path: '/certificates', label: 'مركز الشهادات', icon: Medal, roles: ['TEACHER'] },
                ]
            },
            {
                id: 'planning',
                label: 'التخطيط والجدولة',
                roles: ['TEACHER'],
                items: [
                    { path: '/schedule', label: 'الجدول الدراسي', icon: CalendarDays, roles: ['TEACHER'] },
                    { path: '/curriculum', label: 'توزيع المنهج', icon: List, roles: ['TEACHER'] },
                    { path: '/planning', label: 'التحضير الذكي', icon: PenTool, roles: ['TEACHER'] },
                    { path: '/resources', label: 'مكتبة المصادر', icon: BookOpen, roles: ['TEACHER'] },
                ]
            },
            {
                id: 'engagement',
                label: 'التفاعل والمجتمع',
                roles: ['TEACHER'],
                items: [
                    { path: '/meetings', label: 'المواعيد واللقاءات', icon: Calendar, roles: ['TEACHER'] },
                    { path: '/clubs', label: 'أندية المهارات', icon: Map, roles: ['TEACHER'] },
                    { path: '/behavior', label: 'السلوك', icon: ShieldAlert, roles: ['TEACHER'] },
                    { path: '/badges', label: 'استوديو الأوسمة', icon: Sparkles, roles: ['TEACHER'] },
                ]
            },
            {
                id: 'intelligence',
                label: 'الذكاء والتحليل',
                roles: ['TEACHER'],
                items: [
                    { path: '/analytics', label: 'مركز التنبؤات', icon: BrainCircuit, roles: ['TEACHER'] },
                    { path: '/reports', label: 'التقارير الشاملة', icon: TrendingUp, roles: ['TEACHER'] },
                    { path: '/lab', label: 'مختبر VARK', icon: Zap, roles: ['TEACHER'] },
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
                    ? 'sidebar-item-active text-white' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
            >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {isSidebarOpen && <span>{label}</span>}
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

const Newspaper = ({ size }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>;
const CheckCircle = ({ size }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

export default StaffPortal;
