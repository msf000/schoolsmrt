
import React, { useMemo, useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, ScheduleItem, AttendanceStatus, BehaviorIncident, Exam } from '../types';
import { getDailyFocusStudents, getClassPulseData, getUrgentAlerts } from '../services/analysisService';
import { 
    CheckCircle, Bot, CalendarDays, PlusCircle, Search, Zap, Activity, TrendingUp, Bell, ArrowRight, Shield, Clock, MonitorPlay, Trophy, UserCheck, Flame, Sparkles, Swords, Layout, ShieldAlert, Target, Users
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
import { useToast } from './ToastProvider';

const Dashboard: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null, onNavigate: (view: string) => void }> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isOmniOpen, setIsOmniOpen] = useState(false);
  const [isBattleOpen, setIsBattleOpen] = useState(false);
  const [battleExams, setBattleExams] = useState<Exam[]>([]);
  const [classPulse, setClassPulse] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
        setBattleExams(getExams(currentUser.id).filter(e => e.isActive));
        loadClassPulse();
    }
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
    <div className="p-4 md:p-10 space-y-10 animate-fade-in bg-[#F8FAFC] pb-32 font-tajawal overflow-x-hidden">
      
      {isBattleOpen && battleExams.length > 0 && (
          <QuizBattle students={students} questions={battleExams[0].questions} onClose={() => setIsBattleOpen(false)} />
      )}

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
           <div className="flex items-center gap-5">
                <div className="relative group cursor-pointer" onClick={() => navigate('/school-mgmt')}>
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl group-hover:scale-105 transition-transform">
                        {currentUser?.name.charAt(0)}
                    </div>
                </div>
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-slate-800">أهلاً بك، أ. {currentUser?.name.split(' ')[0]} 👋</h1>
                    <p className="text-slate-400 font-bold text-xs mt-2 flex items-center gap-2"><Clock size={14}/> {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} • السحابة متصلة وجاهزة</p>
                </div>
           </div>
           
           <div className="flex items-center gap-3 w-full lg:w-auto">
                <button onClick={() => setIsOmniOpen(true)} className="flex-1 lg:w-80 flex items-center gap-3 bg-white px-6 py-4 rounded-[2rem] border border-slate-100 shadow-xl text-slate-400 hover:border-indigo-300 transition-all group">
                    <Search size={20} className="group-hover:text-indigo-50"/>
                    <span className="text-sm font-bold">البحث الذكي (Cmd+K)</span>
                </button>
           </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <QuickStatCard icon={Users} label="إجمالي الطلاب" value={dashboardStats.total} color="text-indigo-600" bg="bg-indigo-50" />
           <QuickStatCard icon={CheckCircle} label="معدل الحضور" value={`${dashboardStats.attRate}%`} color="text-emerald-600" bg="bg-emerald-50" />
           <QuickStatCard icon={Target} label="كفاءة التعلم" value={`${dashboardStats.perfAvg}%`} color="text-amber-600" bg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
              <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-700"><Sparkles size={250}/></div>
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                      <div className="flex-1 text-center md:text-right">
                          <div className="bg-white/10 w-fit p-3 rounded-2xl mb-4 backdrop-blur-md border border-white/10 flex items-center gap-2 mx-auto md:mx-0">
                            <Bot className="text-yellow-400" size={20}/>
                            <span className="text-[10px] font-black uppercase tracking-widest">تحليل النبض المباشر</span>
                          </div>
                          <h3 className="text-2xl md:text-3xl font-black mb-4">"{classPulse || 'جاري استشعار طاقة الفصل...'}"</h3>
                          <button onClick={() => setIsBattleOpen(true)} className="bg-yellow-400 text-slate-900 px-8 py-3 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all mx-auto md:mx-0">
                            <Swords size={18}/> بدء معركة العلم (Battle Mode)
                          </button>
                      </div>
                      <div className="hidden lg:flex items-center gap-4">
                          <div className="p-6 bg-white/5 rounded-full border-4 border-white/10 flex items-center justify-center backdrop-blur-md"><Zap size={48} className="text-yellow-400 animate-pulse"/></div>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <QuickAccessCard icon={<UserCheck/>} label="التحضير" color="bg-indigo-600" onClick={()=>navigate('/attendance')}/>
                  <QuickAccessCard icon={<Trophy/>} label="الأبطال" color="bg-yellow-500" onClick={()=>navigate('/leaderboard')}/>
                  <QuickAccessCard icon={<Layout/>} label="سجل الرصد" color="bg-emerald-600" onClick={()=>navigate('/works')}/>
                  <QuickAccessCard icon={<ShieldAlert/>} label="السلوك" color="bg-rose-600" onClick={()=>navigate('/behavior')}/>
              </div>

              <DailyAgenda schedule={getSchedules().filter(s=>s.teacherId===currentUser?.id)} onAction={(cls)=>navigate('/attendance', {state:{className:cls}})} />
              <RecommendationHub students={students} attendance={attendance} performance={performance} />
          </div>

          <div className="space-y-8">
              <NarrativeAIInsights stats={dashboardStats} />
              
              <div className="bg-white rounded-[3.5rem] p-8 border border-slate-100 shadow-xl relative overflow-hidden group">
                  <div className="absolute -bottom-10 -left-10 opacity-[0.03] group-hover:scale-110 transition-all duration-700"><TrendingUp size={200}/></div>
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                    <Activity className="text-indigo-600" size={20}/> نبض الحضور الأسبوعي
                  </h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getClassPulseData(attendance, performance)}>
                            <defs>
                                <linearGradient id="dashPulse" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/><stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/></linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="participation" stroke="#4f46e5" strokeWidth={4} fillOpacity={1} fill="url(#dashPulse)" />
                            <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)'}} />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black">طلاب بحاجة لدعم</h3>
                      <Bot size={20} className="text-indigo-400"/>
                  </div>
                  <div className="space-y-4">
                      {getDailyFocusStudents(students, attendance, performance).map(s => (
                          <div key={s!.student.id} onClick={()=>navigate('/followup', {state:{studentId: s!.student.id}})} className="flex items-center justify-between bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/5 cursor-pointer transition-all">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black">{s!.student.name.charAt(0)}</div>
                                  <div className="text-right">
                                      <p className="text-sm font-black">{s!.student.name}</p>
                                      <p className="text-[10px] text-indigo-300 opacity-60">{s!.student.className}</p>
                                  </div>
                              </div>
                              <ArrowRight size={14} className="text-white/40"/>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex gap-4">
           <button onClick={() => setIsAssistantOpen(true)} className="bg-indigo-600 text-white px-12 py-5 rounded-full font-black shadow-[0_20px_50px_rgba(79,70,229,0.4)] hover:bg-indigo-700 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3">
                <Bot size={24} className="animate-pulse"/>
                المساعد الصوتي المباشر
           </button>
      </div>

      <LiveAssistant isOpen={isAssistantOpen} onClose={() => setIsAssistantOpen(false)} students={students} onAction={handleVoiceAction} />
      <OmniSearch isOpen={isOmniOpen} onClose={() => setIsOmniOpen(false)} students={students} />
    </div>
  );
};

const QuickStatCard = ({ icon: Icon, label, value, color, bg }: any) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <h3 className={`text-3xl font-black ${color}`}>{value}</h3>
        </div>
        <div className={`p-4 ${bg} ${color} rounded-2xl group-hover:scale-110 transition-transform`}><Icon size={24}/></div>
    </div>
);

const QuickAccessCard = ({ icon, label, color, onClick }: any) => (
    <button onClick={onClick} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all group flex flex-col items-center gap-4 active:scale-95">
        <div className={`w-14 h-14 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>{React.cloneElement(icon, { size: 28 })}</div>
        <span className="font-black text-slate-700 text-sm">{label}</span>
    </button>
);

export default Dashboard;
