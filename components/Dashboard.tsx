
import React, { useMemo, useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, SystemUser, PurchaseRequest } from '../types';
import { getDailyFocusStudents, getClassPulseData, getUrgentAlerts, calculateClassHealth } from '../services/analysisService';
import { 
    CheckCircle, Sparkles, Bot, Loader2, 
    Calendar, ClipboardList, 
    Trophy, Zap, PlusCircle, Search, Radio, Waves, Mic, Flame,
    Settings, Star, LayoutGrid, Users, Clock, ArrowRight, Bell,
    Activity, AlertTriangle, TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBehaviorIncidents, getTeacherAssignments, getPurchaseRequests, getMessages } from '../services/storageService';
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
  }, [uniqueClasses, currentUser]);

  const pulseData = useMemo(() => getClassPulseData(attendance, performance), [attendance, performance]);
  const dashboardStats = useMemo(() => ({
      health: selectedClass ? calculateClassHealth(selectedClass, students, attendance, performance) : 0,
      focusCount: getDailyFocusStudents(students, attendance, performance).length,
      alertCount: getUrgentAlerts(students, attendance, performance).length,
      recentBehavior: recentActivities.filter(a => a.type === 'BEHAVIOR').length
  }), [selectedClass, students, attendance, performance, recentActivities]);

  return (
    <div className="p-4 md:p-10 space-y-10 animate-fade-in bg-[#F8FAFC] pb-32 font-tajawal">
      
      {/* Welcome & Search Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-indigo-100">
                    {currentUser?.name.charAt(0)}
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800">أهلاً بك، أ. {currentUser?.name.split(' ')[0]} 👋</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
                        <Clock size={12}/> {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
           </div>
           <button 
                onClick={() => setIsOmniOpen(true)}
                className="w-full md:w-80 flex items-center gap-3 bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 text-slate-400 hover:border-indigo-300 transition-all group"
            >
                <Search size={20} className="group-hover:text-indigo-500 transition-colors"/>
                <span className="text-sm font-bold">البحث الشامل... (Ctrl+K)</span>
            </button>
      </div>

      {/* Hero AI Insight Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2">
              <NarrativeAIInsights stats={dashboardStats} />
          </div>
          <div className="bg-white p-8 rounded-[3.5rem] border border-slate-50 shadow-xl shadow-slate-200/20 flex flex-col justify-between group hover:border-indigo-100 transition-all">
              <div className="flex justify-between items-start mb-6">
                  <div className="p-4 bg-orange-50 text-orange-600 rounded-[1.5rem]"><Flame size={28} fill="currentColor"/></div>
                  <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">نقاط تفاعل الفصل</p>
                      <h3 className="text-3xl font-black text-slate-800">1,240 <span className="text-xs text-orange-500">XP</span></h3>
                  </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-6">
                  <TrendingUp size={16} className="text-emerald-500"/>
                  <span>ارتفاع بنسبة 12% عن الأسبوع الماضي</span>
              </div>
              <button onClick={()=>navigate('/leaderboard')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                  <Trophy size={16}/> لوحة الصدارة العامة
              </button>
          </div>
      </div>

      {/* Main Grid Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <QuickActionBtn icon={<CheckCircle/>} label="تحضير" onClick={()=>navigate('/attendance')} color="bg-indigo-600 shadow-indigo-100"/>
          <QuickActionBtn icon={<PlusCircle/>} label="درجة" onClick={()=>navigate('/performance')} color="bg-emerald-600 shadow-emerald-100"/>
          <QuickActionBtn icon={<Radio/>} label="القرعة" onClick={()=>setIsWheelOpen(true)} color="bg-orange-500 shadow-orange-100"/>
          <QuickActionBtn icon={<Sparkles/>} label="الأوسمة" onClick={()=>navigate('/badges')} color="bg-purple-600 shadow-purple-100"/>
          <QuickActionBtn icon={<Mic/>} label="مساعد" onClick={()=>setIsAssistantOpen(true)} color="bg-red-600 shadow-red-100"/>
          <QuickActionBtn icon={<ClipboardList/>} label="سجل نور" onClick={()=>navigate('/noor')} color="bg-blue-600 shadow-blue-100"/>
          <QuickActionBtn icon={<Waves/>} label="النبض" onClick={()=>navigate('/analytics')} color="bg-cyan-600 shadow-cyan-100"/>
          <QuickActionBtn icon={<Settings/>} label="إعدادات" onClick={()=>navigate('/school-mgmt')} color="bg-slate-800 shadow-slate-200"/>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          {/* Main Chart Card */}
          <div className="xl:col-span-2 bg-white rounded-[4rem] p-10 border border-slate-50 shadow-2xl shadow-slate-200/30 flex flex-col min-h-[450px]">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Activity size={24} className="text-indigo-600"/> نبض التفاعل
                        </h3>
                        <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">تتبع متوسط الأداء والحضور خلال الأسبوع</p>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <Users size={16} className="text-slate-400 mr-2"/>
                        <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[120px] text-slate-700">
                            {uniqueClasses.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={pulseData}>
                            <defs>
                                <linearGradient id="colorPart" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'black', fill: '#94A3B8'}} axisLine={false} tickLine={false} />
                            <YAxis hide domain={[0, 100]} />
                            <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                            <Area type="monotone" dataKey="participation" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorPart)" />
                            <Area type="monotone" dataKey="grades" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-8 flex justify-center gap-10">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-lg shadow-indigo-200"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">المشاركة الصفية</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">متوسط الدرجات</span>
                    </div>
                </div>
          </div>

          {/* Side Focus Card */}
          <div className="flex flex-col gap-8">
              <div className="bg-slate-900 rounded-[3.5rem] p-8 text-white flex flex-col justify-between relative overflow-hidden shadow-2xl min-h-[250px] group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-700"><Bot size={200}/></div>
                  <div className="relative z-10">
                      <div className="bg-white/10 w-fit p-3 rounded-2xl mb-4 backdrop-blur-md border border-white/10"><Zap className="text-yellow-400" fill="currentColor"/></div>
                      <h3 className="text-2xl font-black mb-2">طلاب للمتابعة</h3>
                      <p className="text-indigo-200 text-sm font-bold leading-relaxed mb-6">النظام رصد تراجعاً في تفاعل 3 طلاب اليوم.</p>
                  </div>
                  <div className="space-y-3 relative z-10">
                      {getDailyFocusStudents(students, attendance, performance).map(s => (
                          <div key={s!.student.id} onClick={()=>navigate('/followup', {state:{studentId: s!.student.id}})} className="flex justify-between items-center bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 cursor-pointer transition-all">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-xs shadow-lg">{s!.student.name.charAt(0)}</div>
                                  <span className="text-xs font-black">{s!.student.name.split(' ')[0]}</span>
                              </div>
                              <ArrowRight size={14} className="text-white/40"/>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="bg-white p-8 rounded-[3.5rem] border border-slate-50 shadow-xl flex flex-col justify-between flex-1 relative overflow-hidden">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Bell className="text-indigo-600" size={20}/> تنبيهات ذكية</h3>
                  <div className="space-y-4">
                      {getUrgentAlerts(students, attendance, performance).map((alert, i) => (
                          <div key={i} className="flex gap-4 p-4 bg-red-50/50 rounded-2xl border border-red-50">
                              <div className="p-2 bg-white rounded-xl shadow-sm text-red-500"><AlertTriangle size={18}/></div>
                              <p className="text-xs text-red-900 font-bold leading-relaxed">{alert}</p>
                          </div>
                      ))}
                      {getUrgentAlerts(students, attendance, performance).length === 0 && (
                          <div className="py-10 text-center opacity-30 flex flex-col items-center gap-3">
                              <CheckCircle size={48} className="text-emerald-500"/>
                              <p className="text-xs font-black uppercase tracking-widest">كافة الأمور مستقرة</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      <LiveAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} students={students} onAction={()=>{}} />
      {isWheelOpen && <ActivityWheel students={students.filter(s=>s.className===selectedClass)} onClose={() => setIsWheelOpen(false)} />}
      <OmniSearch isOpen={isOmniOpen} onClose={() => setIsOmniOpen(false)} students={students} />
    </div>
  );
};

const QuickActionBtn = ({ icon, label, onClick, color }: any) => (
    <button onClick={onClick} className="flex flex-col items-center gap-3 group">
        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-[2rem] md:rounded-[2.5rem] ${color} text-white flex items-center justify-center shadow-2xl group-hover:scale-110 active:scale-95 transition-all duration-300`}>
            {React.cloneElement(icon, { size: 28, strokeWidth: 2.5 })}
        </div>
        <span className="text-[10px] font-black text-slate-500 text-center uppercase tracking-tighter transition-colors group-hover:text-indigo-600">{label}</span>
    </button>
);

export default Dashboard;
