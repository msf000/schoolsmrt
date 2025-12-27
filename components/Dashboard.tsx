
import React, { useMemo, useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, SystemUser, PurchaseRequest, ScheduleItem } from '../types';
import { getDailyFocusStudents, getClassPulseData, getUrgentAlerts, calculateClassHealth } from '../services/analysisService';
import { 
    CheckCircle, Sparkles, Bot, Loader2, 
    Calendar, ClipboardList, 
    Trophy, Zap, PlusCircle, Search, Radio, Waves, Mic, Flame,
    Settings, Star, LayoutGrid, Users, Clock, ArrowRight, Bell,
    Activity, AlertTriangle, TrendingUp, Siren, MonitorPlay, CalendarDays,
    /* Added missing Shield icon import */
    Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getBehaviorIncidents, getTeacherAssignments, getPurchaseRequests, getMessages, getSchedules } from '../services/storageService';
import LiveAssistant from './LiveAssistant';
import ActivityWheel from './ActivityWheel';
import NarrativeAIInsights from './NarrativeAIInsights';
import OmniSearch from './OmniSearch';
import DailyAgenda from './DailyAgenda';

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
  const [teacherSchedule, setTeacherSchedule] = useState<ScheduleItem[]>([]);

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach((a: any) => classes.add(a.classId));
    return Array.from(classes).sort();
  }, [students, currentUser]);

  useEffect(() => {
    if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
    if (currentUser) {
        setTeacherSchedule(getSchedules().filter(s => s.teacherId === currentUser.id));
    }
  }, [uniqueClasses, currentUser]);

  const pulseData = useMemo(() => getClassPulseData(attendance, performance), [attendance, performance]);
  const dashboardStats = useMemo(() => ({
      health: selectedClass ? calculateClassHealth(selectedClass, students, attendance, performance) : 0,
      focusCount: getDailyFocusStudents(students, attendance, performance).length,
      alertCount: getUrgentAlerts(students, attendance, performance).length,
  }), [selectedClass, students, attendance, performance]);

  return (
    <div className="p-4 md:p-10 space-y-10 animate-fade-in bg-[#F8FAFC] pb-32 font-tajawal">
      
      {/* Teacher Command Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
           <div className="flex items-center gap-5">
                <div className="relative">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-200">
                        {currentUser?.name.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-full border-4 border-white"></div>
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800">طاب يومك، أ. {currentUser?.name.split(' ')[0]} 🍎</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 flex items-center gap-1">
                            <Shield size={12}/> معلم معتمد
                        </span>
                        <p className="text-slate-400 font-bold text-xs flex items-center gap-2">
                            <CalendarDays size={14}/> {new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                </div>
           </div>
           
           <div className="flex items-center gap-3 w-full lg:w-auto">
               <button 
                    onClick={() => setIsOmniOpen(true)}
                    className="flex-1 lg:w-80 flex items-center gap-3 bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 text-slate-400 hover:border-indigo-300 transition-all group"
                >
                    <Search size={20} className="group-hover:text-indigo-500 transition-colors"/>
                    <span className="text-sm font-bold">البحث والتحكم السريع...</span>
                </button>
                <button onClick={() => navigate('/inbox')} className="p-4 bg-white rounded-full border border-slate-100 shadow-xl relative text-slate-600 hover:text-indigo-600 transition-all">
                    <Bell size={24}/>
                    <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-bounce"></span>
                </button>
           </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Command Center Widgets */}
          <div className="xl:col-span-2 space-y-8">
              {/* Daily Agenda - Critical for Teacher */}
              <DailyAgenda schedule={teacherSchedule} onAction={(cls) => navigate('/attendance', { state: { className: cls } })} />
              
              {/* AI Insight Story */}
              <NarrativeAIInsights stats={dashboardStats} />

              {/* Advanced Actions Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <CommandCard icon={<CheckCircle/>} label="تحضير الفصل" sub="رصد الحضور" onClick={()=>navigate('/attendance')} color="bg-indigo-600"/>
                  <CommandCard icon={<Trophy/>} label="لوحة الأبطال" sub="التنافسية" onClick={()=>navigate('/leaderboard')} color="bg-yellow-500"/>
                  <CommandCard icon={<MonitorPlay/>} label="بدء الحصة" sub="شاشة العرض" onClick={()=>navigate('/screen')} color="bg-purple-600"/>
                  <CommandCard icon={<PlusCircle/>} label="رصد درجات" sub="تقييم سريع" onClick={()=>navigate('/works')} color="bg-emerald-600"/>
              </div>
          </div>

          {/* Teacher Stats & Focus */}
          <div className="space-y-8">
              <div className="bg-slate-900 rounded-[3.5rem] p-8 text-white relative overflow-hidden shadow-2xl group min-h-[400px]">
                  <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-700"><Bot size={200}/></div>
                  <div className="relative z-10">
                      <div className="bg-white/10 w-fit p-3 rounded-2xl mb-4 backdrop-blur-md border border-white/10"><Zap className="text-yellow-400" fill="currentColor"/></div>
                      <h3 className="text-2xl font-black mb-1">طلاب تحت الرصد</h3>
                      <p className="text-indigo-200 text-xs font-bold leading-relaxed mb-8 opacity-60 uppercase tracking-widest">تنبيهات التدخل المبكر (AI)</p>
                  </div>
                  <div className="space-y-4 relative z-10">
                      {getDailyFocusStudents(students, attendance, performance).map(s => (
                          <div key={s!.student.id} onClick={()=>navigate('/followup', {state:{studentId: s!.student.id}})} className="flex justify-between items-center bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 cursor-pointer transition-all">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-sm shadow-lg">{s!.student.name.charAt(0)}</div>
                                  <div>
                                      <p className="text-sm font-black">{s!.student.name}</p>
                                      <p className="text-[10px] text-indigo-300 font-bold">{s!.student.className}</p>
                                  </div>
                              </div>
                              <ArrowRight size={14} className="text-white/40"/>
                          </div>
                      ))}
                      {getDailyFocusStudents(students, attendance, performance).length === 0 && (
                          <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                              <CheckCircle size={48} className="text-emerald-500"/>
                              <p className="text-sm font-black">جميع الطلاب مستقرون أكاديمياً</p>
                          </div>
                      )}
                  </div>
                  <button onClick={()=>navigate('/reports')} className="w-full mt-10 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 transition-all relative z-10">تحليل التعثر الشامل</button>
              </div>

              {/* Class Pulse Chart */}
              <div className="bg-white rounded-[3.5rem] p-8 border border-slate-100 shadow-xl">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-slate-800">نبض الأداء</h3>
                      <div className="p-2 bg-slate-50 rounded-xl"><Activity size={18} className="text-indigo-600"/></div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={pulseData}>
                            <defs>
                                <linearGradient id="colorPart" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="name" hide />
                            <YAxis hide domain={[0, 100]} />
                            <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                            <Area type="monotone" dataKey="participation" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorPart)" />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      <span>السبت</span>
                      <span className="text-indigo-600">متوسط تفاعل الفصل: 88%</span>
                      <span>الجمعة</span>
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

const CommandCard = ({ icon, label, sub, onClick, color }: any) => (
    <button onClick={onClick} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all group text-right flex flex-col gap-4">
        <div className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
            {React.cloneElement(icon, { size: 24 })}
        </div>
        <div>
            <h4 className="font-black text-slate-800 text-sm">{label}</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{sub}</p>
        </div>
    </button>
);

export default Dashboard;
