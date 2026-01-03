
import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SystemUser, Role } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, BarChart3, Calendar, 
    Monitor, PenTool, Database, Activity, Shield, Settings, 
    LogOut, Bell, Menu, ShieldAlert, Table, Briefcase, 
    Building, Zap, Award, Search, Layout
} from 'lucide-react';

interface Props {
    currentUser: SystemUser;
    onLogout: () => void;
    children: React.ReactNode;
}

const StaffPortal: React.FC<Props> = ({ currentUser, onLogout, children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const menuGroups = useMemo(() => {
        const role = currentUser.role;
        
        const groups = [
            {
                id: 'main',
                label: 'الرئيسية',
                roles: ['TEACHER', 'SCHOOL_MANAGER', 'SUPER_ADMIN'],
                items: [
                    { path: '/', label: 'لوحة التحكم', icon: LayoutGrid, roles: ['TEACHER', 'SCHOOL_MANAGER', 'SUPER_ADMIN'] },
                ]
            },
            {
                id: 'academic',
                label: 'الشؤون التعليمية',
                roles: ['TEACHER'],
                items: [
                    { path: '/students', label: 'الطلاب', icon: Users, roles: ['TEACHER'] },
                    { path: '/attendance', label: 'التحضير', icon: CheckSquare, roles: ['TEACHER'] },
                    { path: '/works', label: 'الدرجات', icon: BarChart3, roles: ['TEACHER'] },
                    { path: '/exams', label: 'الاختبارات', icon: FileText, roles: ['TEACHER'] },
                ]
            },
            {
                id: 'management',
                label: 'الإدارة المدرسية',
                roles: ['SCHOOL_MANAGER'],
                items: [
                    { path: '/school-analytics', label: 'تحليل المدرسة', icon: Activity, roles: ['SCHOOL_MANAGER'] },
                    { path: '/teachers-mgmt', label: 'المعلمين', icon: Briefcase, roles: ['SCHOOL_MANAGER'] },
                    { path: '/all-students', label: 'سجل الطلاب العام', icon: Users, roles: ['SCHOOL_MANAGER'] },
                ]
            },
            {
                id: 'tools',
                label: 'الأدوات الذكية',
                roles: ['TEACHER'],
                items: [
                    { path: '/classroom', label: 'إدارة الفصل', icon: Monitor, roles: ['TEACHER'] },
                    { path: '/planning', label: 'التحضير الذكي', icon: PenTool, roles: ['TEACHER'] },
                    { path: '/behavior', label: 'السلوك', icon: ShieldAlert, roles: ['TEACHER'] },
                    { path: '/lab', label: 'المختبر التعليمي', icon: Zap, roles: ['TEACHER'] },
                ]
            },
            {
                id: 'system',
                label: 'إدارة النظام',
                roles: ['SUPER_ADMIN'],
                items: [
                    { path: '/admin-stats', label: 'إحصائيات المنصة', icon: Database, roles: ['SUPER_ADMIN'] },
                    { path: '/schools-mgmt', label: 'إدارة المدارس', icon: Building, roles: ['SUPER_ADMIN'] },
                ]
            },
            {
                id: 'settings',
                label: 'الإعدادات',
                roles: ['TEACHER', 'SCHOOL_MANAGER', 'SUPER_ADMIN'],
                items: [
                    { path: '/reports', label: 'التقارير', icon: Table, roles: ['TEACHER', 'SCHOOL_MANAGER'] },
                    { path: '/school-mgmt', label: 'إعدادات المنظومة', icon: Settings, roles: ['TEACHER', 'SCHOOL_MANAGER'] },
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
            <aside className={`flex flex-col border-l border-slate-200 bg-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="h-16 flex items-center px-6 border-b border-slate-50">
                    <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white shrink-0">
                        <Shield size={20} />
                    </div>
                    {isSidebarOpen && <span className="mr-3 font-bold text-slate-900 text-lg block truncate">المتابع الذكي</span>}
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {menuGroups.map(group => (
                        <div key={group.id} className="mb-6">
                            {isSidebarOpen && <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{group.label}</p>}
                            {group.items.map(item => (
                                <NavItem key={item.path} {...item} />
                            ))}
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-50">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-all text-sm font-bold">
                        <LogOut size={18} />
                        {isSidebarOpen && <span>تسجيل الخروج</span>}
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 glass-header flex items-center justify-between px-8 z-40 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"><Menu size={20}/></button>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-2">
                             <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                currentUser.role === 'SUPER_ADMIN' ? 'bg-indigo-100 text-indigo-700' :
                                currentUser.role === 'SCHOOL_MANAGER' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                             }`}>
                                {currentUser.role}
                             </span>
                             <h2 className="text-sm font-bold text-slate-600">بوابة الموظفين</h2>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-200">
                             <Search size={14} className="text-slate-400 ml-2"/>
                             <input className="bg-transparent border-none outline-none text-xs w-40" placeholder="بحث سريع... (Ctrl+K)"/>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-brand-500 relative"><Bell size={20} /><span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span></button>
                        <div className="flex items-center gap-3 cursor-pointer group px-2 py-1 rounded-lg hover:bg-slate-50" onClick={() => navigate('/profile')}>
                            <div className="text-left hidden sm:block">
                                <p className="text-xs font-bold text-slate-900 leading-none">{currentUser.name}</p>
                                <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">{currentUser.role}</p>
                            </div>
                            <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center font-bold border border-brand-100">
                                {currentUser.name.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default StaffPortal;

const FileText = ({ size }: any) => <svg width={size||18} height={size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>;
