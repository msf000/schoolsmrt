
import React, { useMemo, useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, SystemUser, WeeklyChallenge, PurchaseRequest, MessageLog, BehaviorIncident } from '../types';
import { } from '../services/geminiService';
import { getLocalPedagogicalTip, getDailyFocusStudents, getClassPulseData, getUrgentAlerts, calculateClassHealth } from '../services/analysisService';
import { 
    Users, CheckCircle, TrendingUp, Activity, Sparkles, Bot, Loader2, Volume2, 
    ChevronLeft, Target, AlertTriangle, PenTool, ClipboardList, 
    Trophy, Zap, PlusCircle, Search, Command, X, User, ShoppingCart, ShoppingBag, Radio, MessageSquare, Waves, Mic, Flame,
    // Fix: Added missing Settings icon
    Settings
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSchedules, getTasks, getBehaviorIncidents, getTeacherAssignments, getChallenges, getPurchaseRequests, getMessages } from '../services/storageService';
import LiveAssistant from './LiveAssistant';
import ActivityWheel from './ActivityWheel';
import NarrativeAIInsights from './NarrativeAIInsights';
import OmniSearch from './OmniSearch';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
  onNavigate: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isWheelOpen, setIsWheelOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [isOmniOpen, setIsOmniOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PurchaseRequest[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach((a: any) => classes.add(a.classId));
    return Array.from(classes).sort();
  }, [students, currentUser]);

  useEffect(() => {
    if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
    if (currentUser) {
        setPendingOrders(getPurchaseRequests('global').filter(r => r.status === 'PENDING'));
        const msgs = getMessages(currentUser.id).slice(0, 5).map(m => ({ ...m, type: 'MESSAGE' }));
        const behaviors = getBehaviorIncidents(currentUser.id).slice(0, 5).map(b => ({ ...b, type: 'BEHAVIOR' }));
        setRecentActivities([...msgs, ...behaviors].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5));
    }

    const handleK = (e: KeyboardEvent) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            setIsOmniOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleK);
    return () => window.removeEventListener('keydown', handleK);
  }, [uniqueClasses, currentUser]);

  const pulseData = useMemo(() => getClassPulseData(attendance, performance), [attendance, performance]);
  const dashboardStats = useMemo(() => ({
      health: selectedClass ? calculateClassHealth(selectedClass, students, attendance, performance) : 0,
      focusCount: getDailyFocusStudents(students, attendance, performance).length,
      alertCount: getUrgentAlerts(students, attendance, performance).length,
      recentBehavior: recentActivities.filter(a => a.type === 'BEHAVIOR').length
  }), [selectedClass, students, attendance, performance, recentActivities]);

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in bg-slate-50/30 min-h-full pb-24 overflow-y-auto custom-scrollbar font-tajawal">
      
      <div className="flex justify-between items-center mb-2">
           <div className="flex items-center gap-4">
                <button 
                    onClick={() => setIsOmniOpen(true)}
                    className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border shadow-sm text-gray-400 hover:border-indigo-300 transition-all group"
                >
                    <Search size={18} className="group-hover:text-indigo-500"/>
                    <span className="text-xs font-bold">البحث الشامل (Ctrl+K)</span>
                </button>
           </div>
           <div className="hidden lg:flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">توقيت الخادم: {new Date().toLocaleTimeString('ar-SA')}</span>
           </div>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <QuickActionBtn icon={<CheckCircle/>} label="تحضير" onClick={()=>navigate('/attendance')} color="bg-indigo-600"/>
          <QuickActionBtn icon={<PlusCircle/>} label="درجة" onClick={()=>navigate('/performance')} color="bg-emerald-600"/>
          <QuickActionBtn icon={<Radio/>} label="قرعة" onClick={()=>setIsWheelOpen(true)} color="bg-orange-500"/>
          <QuickActionBtn icon={<Trophy/>} label="الأبطال" onClick={()=>navigate('/hall-of-fame')} color="bg-yellow-500"/>
          <QuickActionBtn icon={<Sparkles/>} label="الأوسمة" onClick={()=>navigate('/badges')} color="bg-purple-600"/>
          <QuickActionBtn icon={<Mic/>} label="مساعد" onClick={()=>setIsAssistantOpen(true)} color="bg-red-600"/>
          <QuickActionBtn icon={<Settings/>} label="إعدادات" onClick={()=>navigate('/school-mgmt')} color="bg-slate-800"/>
          <QuickActionBtn icon={<Waves/>} label="النبض" onClick={()=>navigate('/analytics')} color="bg-blue-600"/>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
              <NarrativeAIInsights stats={dashboardStats} />
              <div className="bg-white rounded-[3rem] p-8 border shadow-sm flex flex-col h-[350px]">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-slate-800">نبض التفاعل والتحصيل</h3>
                    <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="text-xs font-bold border rounded-lg p-1">
                        {uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={pulseData}>
                            <defs>
                                <linearGradient id="colorPart" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                            <YAxis hide domain={[0, 100]} />
                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                            <Area type="monotone" dataKey="participation" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPart)" />
                            <Area type="monotone" dataKey="grades" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
              </div>
          </div>

          <div className="bg-white rounded-[3rem] p-8 border shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                  <div className="bg-indigo-50 w-fit p-3 rounded-2xl mb-4 border border-indigo-100"><Bot className="text-indigo-600"/></div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">توصيات التركيز اليوم</h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-6 font-medium">تراجع طفيف في أداء الطلاب خلال الـ 48 ساعة الماضية.</p>
                  <div className="space-y-4">
                      {getDailyFocusStudents(students, attendance, performance).map(s => (
                          <div key={s!.student.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-[1.5rem] border border-slate-100">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-indigo-600 shadow-sm">{s!.student.name.charAt(0)}</div>
                                  <span className="text-xs font-black text-slate-700">{s!.student.name.split(' ')[0]}</span>
                              </div>
                              <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">{s!.reasons[0]}</span>
                          </div>
                      ))}
                  </div>
              </div>
              <button onClick={() => navigate('/analytics')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-xl mt-8 hover:bg-indigo-700 transition-all">التحليلات المتقدمة</button>
          </div>
      </div>

      <LiveAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} students={students} onAction={()=>{}} />
      {isWheelOpen && <ActivityWheel students={students.filter(s=>s.className===selectedClass)} onClose={() => setIsWheelOpen(false)} />}
      <OmniSearch isOpen={isOmniOpen} onClose={() => setIsOmniOpen(false)} students={students} />
    </div>
  );
};

const QuickActionBtn = ({ icon, label, onClick, color }: any) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.5rem] md:rounded-[2rem] ${color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 active:scale-95 transition-all`}>
            {React.cloneElement(icon, { size: 24 })}
        </div>
        <span className="text-[9px] md:text-[10px] font-black text-slate-500 text-center line-clamp-1">{label}</span>
    </button>
);

export default Dashboard;
