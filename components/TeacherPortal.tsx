import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutGrid, Users, CheckSquare, Table, Monitor, 
  BarChart2, Settings, LogOut, Bell, Menu, X, 
  CalendarDays, Trophy, BookOpen, MessageSquare, 
  Database, Sparkles, BrainCircuit, List
} from 'lucide-react';
import { SystemUser } from '../types';
import BottomNavigation from './BottomNavigation';

interface TeacherPortalProps {
  currentUser: SystemUser;
  onLogout: () => void;
  children: React.ReactNode;
}

const TeacherPortal: React.FC<TeacherPortalProps> = ({ currentUser, onLogout, children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // NavItem local helper to fix 'Cannot find name NavItem'
    const NavItem = ({ path, label, icon: Icon, color }: any) => {
        const isActive = location.pathname === path;
        return (
            <Link 
                to={path} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]' 
                    : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
                }`}
            >
                <Icon size={20} className={`${isActive ? 'text-white' : color || 'text-gray-400 group-hover:text-indigo-600'}`} />
                <span className={`text-sm font-bold ${isActive ? 'font-black' : ''}`}>{label}</span>
            </Link>
        );
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
            {/* Desktop Sidebar */}
            <aside className={`hidden lg:flex flex-col bg-white border-l border-gray-200 transition-all duration-300 z-30 ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    {isSidebarOpen && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Sparkles size={20}/>
                            </div>
                            <span className="font-black text-gray-800 tracking-tight text-sm">نظام المتابع الذكي</span>
                        </div>
                    )}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                        <Menu size={20}/>
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-1">
                    <NavItem path="/" label="لوحة التحكم" icon={LayoutGrid} />
                    
                    <div className="pt-3 mt-2 border-t border-gray-50">
                        <label className={`px-4 text-[9px] font-black text-gray-400 block mb-1 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>المتابعة والتحضير</label>
                        <NavItem path="/students" label="قائمة الطلاب" icon={Users} />
                        <NavItem path="/schedule" label="الجدول الدراسي" icon={CalendarDays} />
                        <NavItem path="/attendance" label="التحضير اليومي" icon={CheckSquare} />
                        <NavItem path="/leaderboard" label="لوحة الشرف" icon={Trophy} color="text-yellow-600" />
                        <NavItem path="/classroom" label="الإدارة الصفية" icon={Monitor} color="text-indigo-600" />
                        <NavItem path="/works" label="سجل الرصد (كشف)" icon={Table} />
                    </div>

                    <div className="pt-3 mt-2 border-t border-gray-50">
                        <label className={`px-4 text-[9px] font-black text-gray-400 block mb-1 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>الأدوات الذكية</label>
                        <NavItem path="/planning" label="تحضير الدروس" icon={BookOpen} color="text-purple-600" />
                        <NavItem path="/exams" label="الاختبارات" icon={List} />
                        <NavItem path="/forms" label="محلل Forms" icon={BarChart2} color="text-green-600" />
                        <NavItem path="/lab" label="مختبر التعلم" icon={BrainCircuit} color="text-orange-600" />
                    </div>

                    <div className="pt-3 mt-2 border-t border-gray-50">
                        <label className={`px-4 text-[9px] font-black text-gray-400 block mb-1 uppercase tracking-widest ${!isSidebarOpen && 'hidden'}`}>التواصل والتقارير</label>
                        <NavItem path="/messages" label="مركز الرسائل" icon={MessageSquare} color="text-teal-600" />
                        <NavItem path="/reports" label="التقارير والشهادات" icon={BarChart2} />
                        <NavItem path="/custom-tables" label="جداولي الخاصة" icon={Database} />
                        <NavItem path="/resources" label="المكتبة الرقمية" icon={Sparkles} />
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-50 space-y-2">
                    <NavItem path="/school-mgmt" label="إعدادات المدرسة" icon={Settings} />
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-bold transition-all">
                        <LogOut size={20}/>
                        {isSidebarOpen && <span>خروج</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Header Mobile View */}
                <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20">
                    <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                            <Sparkles size={16}/>
                        </div>
                        <span className="font-black text-gray-800 text-sm">المعلم الذكي</span>
                    </div>
                    <div className="flex items-center gap-3">
                         <button className="p-2 text-gray-400"><Bell size={20}/></button>
                         <div className="w-8 h-8 bg-indigo-50 rounded-full border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">{currentUser.name.charAt(0)}</div>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden relative">
                    {children}
                </main>

                <BottomNavigation role={currentUser.role} onMenuClick={() => setIsSidebarOpen(true)} />
            </div>
        </div>
    );
};

export default TeacherPortal;