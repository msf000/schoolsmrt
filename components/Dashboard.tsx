
import React, { useMemo, useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, ScheduleItem, AttendanceStatus, BehaviorIncident, Exam } from '../types';
import { getDailyFocusStudents, getClassPulseData, getUrgentAlerts } from '../services/analysisService';
import { 
    // Added Globe to the imported icons from lucide-react
    CheckCircle, Bot, CalendarDays, PlusCircle, Search, Zap, Activity, TrendingUp, Bell, ArrowRight, Shield, Clock, MonitorPlay, Trophy, UserCheck, Flame, Sparkles, Swords, Layout, ShieldAlert, Target, Users, Mic, BrainCircuit, CalendarCheck, Sparkle, Command, Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSchedules, saveAttendance, saveBehaviorIncident, getExams } from '../services/storageService';
import { generateClassroomPulse } from '../services/geminiService';
import LiveAssistant from './LiveAssistant';
import NarrativeAIInsights from './NarrativeAIInsights';
import OmniSearch from './OmniSearch';
import DailyAgenda from './DailyAgenda';
import RecommendationHub from './RecommendationHub';
import QuizBattle from './QuizBattle';
import VoiceObservation from './VoiceObservation';
import { useToast } from './ToastProvider';

const Dashboard: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null, onNavigate: (view: string) => void }> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isOmniOpen, setIsOmniOpen] = useState(false);
  const [isBattleOpen, setIsBattleOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [battleExams, setBattleExams] = useState<Exam[]>([]);
  const [classPulse, setClassPulse] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
        setBattleExams(getExams(currentUser.id).filter(e => e.isActive));
        loadClassPulse();
    }
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            setIsOmniOpen(true);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser]);

  const loadClassPulse = async () => {
      const insight = await generateClassroomPulse({ noise: 2, mood: 'تفاعل متوسط', lastTopic: 'الحصة الماضية' });
      setClassPulse(insight);
  };

  const handleVoiceAction = async (action: string, data: any) => {
      if (action === 'mark_attendance') {
          const student = students.find(s => s.name.includes(data.studentName));
          if (student) {
              await saveAttendance([{ id: `v_${Date.now()}`, studentId: student.id, date: new Date().toISOString().split('T')[0], status: data.status as AttendanceStatus, createdById: currentUser?.id }]);
              showToast(`تم رصد حضور ${student.name.split(' ')[0]}`, 'SUCCESS');
          }
      }
  };

  const dashboardStats = useMemo(() => {
      const total = students.length;
      const attRate = attendance.length > 0 ? (attendance.filter(a => a.status === AttendanceStatus.PRESENT).length / attendance.length) * 100 : 95;
      const perfAvg = performance.length > 0 ? (performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length) * 100 : 82;
      return { total, attRate: Math.round(attRate), perfAvg: Math.round(perfAvg) };
  }, [students, attendance, performance]);

  return (
    <div className="p-4 md:p-10 space-y-10 animate-fade-in bg-[#F8FAFC] pb-32 font-tajawal overflow-x-hidden custom-scrollbar">
      
      {isBattleOpen && battleExams.length > 0 && (
          <QuizBattle students={students} questions={battleExams[0].questions} onClose={() => setIsBattleOpen(false)} />
      )}

      {isVoiceOpen && currentUser && (
          <VoiceObservation students={students} teacherId={currentUser.id} onClose={() => setIsVoiceOpen(false)} />
      )}

      {/* Hero Section with Bento Style */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
           <div className="flex items-center gap-5">
                <div className="relative group cursor-pointer" onClick={() => navigate('/profile')}>
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl group-hover:scale-105 transition-transform">
                        {currentUser?.name.charAt(0)}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-6 h-6 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
                </div>
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-800">أهلاً بك، أ. {currentUser?.name.split(' ')[0]} 👋</h1>
                    <p className="text-slate-400 font-bold text-xs mt-2 flex items-center gap-2">
                        <Clock size={14}/> {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} • السحابة متصلة وجاهزة
                    </p>
                </div>
           </div>
           
           <div className="flex items-center gap-3 w-full lg:w-auto">
                <button onClick={() => setIsVoiceOpen(true)} className="p-4 bg-white text-indigo-600 rounded-2xl border border-indigo-50 shadow-xl hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-110 active:scale-95 group">
                    <Mic size={24} className="group-hover:animate-pulse"/>
                </button>
                <button onClick={() => setIsOmniOpen(true)} className="flex-1 lg:w-80 flex items-center justify-between bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-2xl text-slate-400 hover:border-indigo-300 transition-all group">
                    <div className="flex items-center gap-3">
                        <Search size={20} className="group-hover:text-indigo-600"/>
                        <span className="text-sm font-bold">البحث الذكي...</span>
                    </div>
                    <div className="flex gap-1 opacity-40 group-hover:opacity-100">
                        <kbd className="px-2 py-0.5 bg-slate-100 border rounded text-[10px] font-black">⌘</kbd>
                        <kbd className="px-2 py-0.5 bg-slate-100 border rounded text-[10px] font-black">K</kbd>
                    </div>
                </button>
           </div>
      </div>

      {/* Stats Bento Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <QuickStatCard icon={Users} label="إجمالي الطلاب" value={dashboardStats.total} color="text-indigo-600" bg="bg-indigo-50" />
           <QuickStatCard icon={CheckCircle} label="معدل الحضور" value={`${dashboardStats.attRate}%`} color="text-emerald-600" bg="bg-emerald-50" />
           <QuickStatCard icon={Target} label="كفاءة التعلم" value={`${dashboardStats.perfAvg}%`} color="text-amber-600" bg="bg-amber-50" />
           <QuickStatCard icon={Zap} label="النقاط الممنوحة" value="1.2k" color="text-rose-600" bg="bg-rose-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
              {/* Main AI Pulse Card */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 pointer-events-none group-hover:scale-125 transition-transform duration-[2000ms]"><Sparkles size={400}/></div>
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                      <div className="flex-1 text-center md:text-right">
                          <div className="bg-white/10 w-fit p-3 rounded-2xl mb-4 backdrop-blur-md border border-white/10 flex items-center gap-2 mx-auto md:mx-0">
                            <Bot className="text-yellow-400" size={20}/>
                            <span className="text-[10px] font-black uppercase tracking-widest">تحليل النبض المباشر (AI)</span>
                          </div>
                          <h3 className="text-2xl md:text-4xl font-black mb-6 leading-tight">"{classPulse || 'جاري استشعار طاقة الفصل...'}"</h3>
                          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                              <button onClick={() => setIsBattleOpen(true)} className="bg-yellow-400 text-slate-900 px-8 py-3.5 rounded-[1.5rem] font-black text-sm shadow-[0_15px_30px_rgba(250,204,21,0.3)] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
                                <Swords size={20}/> بدء معركة العلم
                              </button>
                              <button onClick={() => navigate('/wall')} className="bg-white/10 text-white px-8 py-3.5 rounded-[1.5rem] font-black text-sm border border-white/20 backdrop-blur-md hover:bg-white/20 transition-all flex items-center gap-2">
                                <Globe size={20}/> حائط المدرسة
                              </button>
                          </div>
                      </div>
                      <div className="hidden lg:flex items-center gap-4">
                          <div className="p-8 bg-white/5 rounded-[2.5rem] border-4 border-white/10 flex items-center justify-center backdrop-blur-2xl shadow-inner group-hover:rotate-6 transition-transform duration-700">
                            <Zap size={64} className="text-yellow-400 animate-pulse drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" fill="currentColor"/>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Quick Actions Bento */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <QuickAccessCard icon={<UserCheck/>} label="التحضير" color="bg-indigo-600" onClick={()=>navigate('/attendance')}/>
                  <QuickAccessCard icon={<CalendarCheck/>} label="اللقاءات" color="bg-teal-500" onClick={()=>navigate('/meetings')}/>
                  <QuickAccessCard icon={<Layout/>} label="سجل الرصد" color="bg-emerald-600" onClick={()=>navigate('/works')}/>
                  <QuickAccessCard icon={<ShieldAlert/>} label="التدخلات" color="bg-rose-600" onClick={()=>navigate('/interventions')}/>
              </div>

              <DailyAgenda schedule={getSchedules().filter(s=>s.teacherId===currentUser?.id)} onAction={(cls)=>navigate('/attendance', {state:{className:cls}})} />
              <RecommendationHub students={students} attendance={attendance} performance={performance} />
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
              <NarrativeAIInsights stats={dashboardStats} />
              
              {/* Analytics Card */}
              <div className="bg-white rounded-[3.5rem] p-8 border border-slate-100 shadow-2xl relative overflow-hidden group">
                  <div className="absolute -bottom-10 -left-10 opacity-[0.03] group-hover:scale-110 transition-all duration-700"><TrendingUp size={200}/></div>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Activity className="text-indigo-600" size={20}/> نبض الحضور الأسبوعي
                    </h3>
                    <button onClick={() => navigate('/reports')} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><PlusCircle size={20}/></button>
                  </div>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getClassPulseData(attendance, performance)}>
                            <defs>
                                <linearGradient id="dashPulse" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="participation" stroke="#4f46e5" strokeWidth={5} fillOpacity={1} fill="url(#dashPulse)" />
                            <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)'}} />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Focus Students List */}
              <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h3 className="text-xl font-black">طلاب تحت المجهر</h3>
                          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">تنبيهات التدخل مبكر</p>
                      </div>
                      <div className="p-3 bg-white/10 rounded-2xl"><Bot size={20} className="text-indigo-400"/></div>
                  </div>
                  <div className="space-y-4">
                      {getDailyFocusStudents(students, attendance, performance).map(s => (
                          <div key={s!.student.id} onClick={()=>navigate('/followup', {state:{studentId: s!.student.id}})} className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-5 rounded-[1.5rem] border border-white/5 cursor-pointer transition-all hover:translate-x-[-4px] group">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-indigo-600/50 rounded-xl flex items-center justify-center font-black shadow-lg border border-indigo-500/30 group-hover:scale-110 transition-transform">
                                      {s!.student.name.charAt(0)}
                                  </div>
                                  <div className="text-right">
                                      <p className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors">{s!.student.name.split(' ')[0]} {s!.student.name.split(' ')[1]}</p>
                                      <p className="text-[10px] text-indigo-300 opacity-60 font-bold">{s!.student.className}</p>
                                  </div>
                              </div>
                              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-indigo-600 transition-colors">
                                <ArrowRight size={14} className="text-white/40 group-hover:text-white"/>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      {/* Floating Action Button for AI Voice */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex gap-4">
           <button onClick={() => setIsAssistantOpen(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-full font-black shadow-[0_20px_50px_rgba(79,70,229,0.5)] hover:bg-indigo-700 hover:-translate-y-2 active:scale-95 transition-all flex items-center justify-center gap-3 group border-b-4 border-indigo-800">
                <Bot size={24} className="animate-pulse group-hover:rotate-12 transition-transform"/>
                <span className="hidden md:inline">المساعد الصوتي المباشر</span>
                <span className="md:hidden">AI</span>
           </button>
      </div>

      <LiveAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} students={students} onAction={handleVoiceAction} />
      <OmniSearch isOpen={isOmniOpen} onClose={() => setIsOmniOpen(false)} students={students} />
    </div>
  );
};

const QuickStatCard = ({ icon: Icon, label, value, color, bg }: any) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between group hover:border-indigo-300 transition-all hover:-translate-y-1">
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <h3 className={`text-4xl font-black ${color} tracking-tight`}>{value}</h3>
        </div>
        <div className={`p-5 ${bg} ${color} rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-inner`}>
            <Icon size={28} strokeWidth={2.5}/>
        </div>
    </div>
);

const QuickAccessCard = ({ icon, label, color, onClick }: any) => (
    <button onClick={onClick} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:border-indigo-400 hover:shadow-2xl transition-all group flex flex-col items-center gap-5 active:scale-95 hover:-translate-y-2">
        <div className={`w-16 h-16 rounded-[1.5rem] ${color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all transform`}>
            {React.cloneElement(icon, { size: 32, strokeWidth: 2.5 })}
        </div>
        <span className="font-black text-slate-700 text-sm tracking-tight">{label}</span>
    </button>
);

export default Dashboard;
