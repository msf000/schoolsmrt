
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    LayoutGrid, Users, CheckSquare, MonitorPlay, Menu,
    Award, CalendarDays, Activity, FileQuestion, User,
    Home, Baby, ClipboardList, Bell, ShieldCheck, Inbox
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
            { path: '/inbox', label: 'البريد', icon: Inbox },
            { path: '/attendance', label: 'التحضير', icon: CheckSquare },
            { path: '/classroom', label: 'الفصل', icon: MonitorPlay },
        ],
        STUDENT: [
            { path: '/', label: 'الرئيسية', icon: LayoutGrid },
            { path: '/evaluation', label: 'درجاتي', icon: Activity },
            { path: '/messages', label: 'تنبيهات', icon: Bell },
        ],
        PARENT: [
            { path: '/', label: 'الأبناء', icon: Baby },
            { path: '/messages', label: 'تنبيهات', icon: Bell },
        ]
    };

    let activeNav = navItems.TEACHER;
    if (role === 'STUDENT') activeNav = navItems.STUDENT;
    else if (role === 'PARENT') activeNav = navItems.PARENT;

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/90 backdrop-blur-xl border-t border-slate-100 h-20 flex items-center justify-around px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            {activeNav.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className="flex flex-col items-center justify-center flex-1 h-full relative transition-all active:scale-90"
                    >
                        <div className={`p-2.5 rounded-2xl transition-all duration-300 ${
                            isActive 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                            : 'text-slate-400'
                        }`}>
                            <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                        </div>
                        <span className={`text-[10px] mt-1 font-black transition-all ${
                            isActive ? 'text-indigo-600' : 'text-slate-400'
                        }`}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
            
            <button
                onClick={onMenuClick}
                className="flex flex-col items-center justify-center flex-1 h-full text-slate-400 active:scale-90 transition-all"
            >
                <div className="p-2.5 rounded-2xl bg-slate-50">
                    <Menu size={22} />
                </div>
                <span className="text-[10px] mt-1 font-black">المزيد</span>
            </button>
        </div>
    );
};

export default BottomNavigation;
