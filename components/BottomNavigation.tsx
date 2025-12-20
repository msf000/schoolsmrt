import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    LayoutGrid, Users, CheckSquare, MonitorPlay, Menu,
    Award, CalendarDays, Activity, FileQuestion, User,
    Home, Baby, ClipboardList, Bell, ShieldCheck
} from 'lucide-react';

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
            { path: '/', label: 'الرئيسية', icon: LayoutGrid },
            { path: '/evaluation', label: 'درجاتي', icon: Activity },
            { path: '/messages', label: 'التنبيهات', icon: Bell },
        ],
        PARENT: [
            { path: '/', label: 'الأبناء', icon: Baby },
            { path: '/messages', label: 'تنبيهات', icon: Bell },
        ]
    };

    // Fallback logic
    let activeNav = navItems.TEACHER;
    if (role === 'STUDENT') activeNav = navItems.STUDENT;
    else if (role === 'PARENT') activeNav = navItems.PARENT;

    return (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-[60] pointer-events-none">
            <nav className="bg-white/90 backdrop-blur-xl border border-indigo-100 shadow-[0_10px_30px_-5px_rgba(79,70,229,0.2)] rounded-[2rem] h-16 flex items-center justify-around px-2 pointer-events-auto overflow-hidden">
                {activeNav.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className="flex flex-col items-center justify-center flex-1 h-full relative transition-all active:scale-95"
                        >
                            <div className={`p-2.5 rounded-2xl transition-all duration-300 ${
                                isActive 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                                : 'text-slate-400'
                            }`}>
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                            </div>
                            <span className={`text-[9px] mt-1 font-black transition-all ${
                                isActive ? 'text-indigo-600' : 'text-slate-400'
                            }`}>
                                {item.label}
                            </span>
                            {isActive && <div className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></div>}
                        </button>
                    );
                })}
                
                {/* Menu Toggle for extra items */}
                <button
                    onClick={onMenuClick}
                    className="flex flex-col items-center justify-center flex-1 h-full text-slate-400 active:scale-95 transition-all"
                >
                    <div className="p-2.5 rounded-2xl">
                        <Menu size={22} />
                    </div>
                    <span className="text-[9px] mt-1 font-black">المزيد</span>
                </button>
            </nav>
            {/* Safe area padding for iPhones with Home Indicator */}
            <div className="h-[env(safe-area-inset-bottom)]"></div>
        </div>
    );
};

export default BottomNavigation;