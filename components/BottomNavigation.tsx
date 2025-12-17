
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    LayoutGrid, Users, CheckSquare, MonitorPlay, Menu,
    Award, CalendarDays, Activity, FileQuestion, User,
    Home, Baby, ClipboardList, Bell
} from 'lucide-react';
import { SystemUser } from '../types';

interface BottomNavProps {
    role: 'TEACHER' | 'STUDENT' | 'PARENT' | 'SCHOOL_MANAGER' | 'SUPER_ADMIN';
    onMenuClick: () => void;
}

const BottomNavigation: React.FC<BottomNavProps> = ({ role, onMenuClick }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = {
        TEACHER: [
            { path: '/', label: 'الرئيسية', icon: LayoutGrid },
            { path: '/students', label: 'الطلاب', icon: Users },
            { path: '/attendance', label: 'التحضير', icon: CheckSquare },
            { path: '/classroom', label: 'الفصل', icon: MonitorPlay },
        ],
        STUDENT: [
            { path: '/', label: 'الرئيسية', icon: Award },
            { path: '/plan', label: 'الجدول', icon: CalendarDays },
            { path: '/evaluation', label: 'درجاتي', icon: Activity },
            { path: '/exams', label: 'اختبارات', icon: FileQuestion },
        ],
        PARENT: [
            { path: '/', label: 'الأبناء', icon: Baby },
            { path: '/plan', label: 'الخطة', icon: CalendarDays },
            { path: '/exams', label: 'الاختبارات', icon: ClipboardList },
            { path: '/messages', label: 'تنبيهات', icon: Bell },
        ]
    };

    // Fallback for admin roles to teacher nav
    const activeNav = role === 'STUDENT' ? navItems.STUDENT : 
                    role === 'PARENT' ? navItems.PARENT : 
                    navItems.TEACHER;

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pointer-events-none">
            <nav className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] rounded-3xl h-18 flex items-center justify-around px-2 pointer-events-auto">
                {activeNav.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className="flex flex-col items-center justify-center flex-1 h-full relative group transition-all"
                        >
                            <div className={`p-2 rounded-2xl transition-all duration-300 ${
                                isActive 
                                ? 'bg-indigo-600 text-white scale-110 -translate-y-1 shadow-lg shadow-indigo-200' 
                                : 'text-slate-400 group-hover:text-indigo-500'
                            }`}>
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[10px] mt-1 font-bold transition-all ${
                                isActive ? 'text-indigo-600 opacity-100' : 'text-slate-400 opacity-0'
                            }`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
                
                {/* Menu Button for Mobile */}
                <button
                    onClick={onMenuClick}
                    className="flex flex-col items-center justify-center flex-1 h-full text-slate-400 hover:text-indigo-600 transition-all"
                >
                    <div className="p-2 rounded-2xl">
                        <Menu size={22} />
                    </div>
                    <span className="text-[10px] mt-1 font-bold opacity-0">القائمة</span>
                </button>
            </nav>
        </div>
    );
};

export default BottomNavigation;
