
import React, { useMemo, useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, SystemUser } from '../types';
import { generateDailyBriefing, playTextAsSpeech } from '../services/geminiService';
import { generateLocalDailyBrief, getLocalPedagogicalTip, getTopAchievers, getDailyFocusStudents, getClassPulseData, getUrgentAlerts } from '../services/analysisService';
import { Users, CheckCircle, TrendingUp, Activity, BarChart3, Sparkles, Bot, Loader2, Volume2, BrainCircuit, ChevronLeft, Target, Lightbulb, Check, AlertTriangle, ListFilter, PenTool, ClipboardList, ShieldCheck, Trophy, Zap, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
  onNavigate: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [briefMode, setBriefMode] = useState<'AI' | 'STATS'>(() => {
      const saved = localStorage.getItem('dashboard_brief_mode');
      return (saved as 'AI' | 'STATS') || 'STATS';
  });

  const [completedMissionIds, setCompletedMissionIds] = useState<Set<string>>(() => {
      const saved = localStorage.getItem('dashboard_completed_missions');
      return new Set(saved ? JSON.parse(saved) : []);
  });

  useEffect(() => {
    localStorage.setItem('dashboard_brief_mode', briefMode);
    if (students.length > 0) {
        if (briefMode === 'AI') loadAiBrief();
        else loadStatsBrief();
    }
  }, [currentUser, students.length, briefMode]);

  useEffect(() => {
      localStorage.setItem('dashboard_completed_missions', JSON.stringify(Array.from(completedMissionIds)));
  }, [completedMissionIds]);

  const loadAiBrief = async () => {
    setIsAiLoading(true);
    try {
        const res = await generateDailyBriefing(students, attendance, performance);
        setBriefing(res);
    } catch (e) {
        loadStatsBrief();
        setBriefMode('STATS');
    } finally {
        setIsAiLoading(false);
    }
  };

  const loadStatsBrief = () => {
      const res = generateLocalDailyBrief(students, attendance, performance);
      setBriefing(res);
  };

  const topAchievers = useMemo(() => getTopAchievers(students, attendance, performance), [students, attendance, performance]);
  const focusStudents = useMemo(() => getDailyFocusStudents(students, attendance, performance), [students, attendance, performance]);
  const pulseData = useMemo(() => getClassPulseData(attendance, performance), [attendance, performance]);
  const alerts = useMemo(() => getUrgentAlerts(students, attendance, performance), [students, attendance, performance]);

  const toggleMission = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const newSet = new Set(completedMissionIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setCompletedMissionIds(newSet);
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAttendance = attendance.filter(a => a.date === today);
    const presentCount = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const attRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 100;

    const participation = todaysAttendance.filter(a => !!a.participationScore);
    const avgParticipation = participation.length > 0 ? (participation.reduce((a,b)=>a+(b.participationScore||0),0)/participation.length).toFixed(1) : '0';

    const classes = Array.from(new Set(students.map(s => s.className).filter(Boolean)));
    const classData = classes.map(c => {
        const classStudents = students.filter(s => s.className === c);
        const classPerf = performance.filter(p => classStudents.some(s => s.id === p.studentId));
        const avg = classPerf.length > 0 ? Math.round(classPerf.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0) / classPerf.length * 100) : 0;
        return { name: c, performance: avg };
    }).sort((a, b) => b.performance - a.performance);

    return { 
        totalStudents: students.length, 
        attRate, 
        absentCount: todaysAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length,
        avgPerf: classData.length > 0 ? Math.round(classData.reduce((a,b)=>a+b.performance,0)/classData.length) : 0,
        classData,
        avgParticipation
    };
  }, [students, attendance, performance]);

  const handlePlayBriefing = async () => {
      if (!briefing || isPlaying) return;
      setIsPlaying(true);
      await playTextAsSpeech(briefing);
      setIsPlaying(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in bg-slate-50/50 min-h-full pb-24 overflow-y-auto custom-scrollbar">
      
      {/* 🚨 Urgent Alerts Banner */}
      {alerts.length > 0 && (
          <div className="bg-red-600 text-white p-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-red-100 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="p-1.5 bg-white/20 rounded-lg shrink-0 animate-pulse"><AlertTriangle size={18}/></div>
              <div className="flex-1 text-xs md:text-sm font-black truncate relative z-10">
                  {alerts.join(' • ')}
              </div>
              <button onClick={() => navigate('/reports')} className="text-[10px] font-black underline shrink-0 relative z-10 px-2">عرض التفاصيل</button>
          </div>
      )}

      {/* 🚀 Quick Action Grid (NEW) */}
      <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <QuickActionBtn icon={<CheckCircle/>} label="تحضير" onClick={()=>navigate('/attendance')} color="bg-indigo-600"/>
          <QuickActionBtn icon={<PlusCircle/>} label="رصد درجة" onClick={()=>navigate('/performance')} color="bg-emerald-600"/>
          <QuickActionBtn icon={<PenTool/>} label="تحضير درس" onClick={()=>navigate('/planning')} color="bg-purple-600"/>
          <QuickActionBtn icon={<Users/>} label="طلابي" onClick={()=>navigate('/students')} color="bg-blue-600"/>
          <QuickActionBtn icon={<ListFilter/>} label="جداول" onClick={()=>navigate('/custom-tables')} color="bg-orange-600"/>
          <QuickActionBtn icon={<BrainCircuit/>} label="المختبر" onClick={()=>navigate('/lab')} color="bg-pink-600"/>
          <QuickActionBtn icon={<ClipboardList/>} label="مهام" onClick={()=>navigate('/tasks')} color="bg-teal-600"/>
          <QuickActionBtn icon={<Trophy/>} label="لوحة الشرف" onClick={()=>navigate('/leaderboard')} color="bg-yellow-600"/>
      </div>

      {/* AI/Stats Header */}
      <div className="bg-indigo-900 rounded-[2.5rem] p-6 md:p-10 text-white shadow-2xl relative overflow-hidden group border-b-[8px] border-indigo-950">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-1000 pointer-events-none"><Sparkles size={250}/></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 backdrop-blur-3xl rounded-3xl flex flex-col items-center justify-center shrink-0 border border-white/20 shadow-inner relative group/btn">
                  {isAiLoading ? <Loader2 className="animate-spin text-yellow-400" size={36}/> : (briefMode==='AI' ? <Bot className="text-yellow-400" size={40}/> : <Activity className="text-teal-400" size={40}/>)}
                  <button onClick={() => setBriefMode(briefMode==='AI'?'STATS':'AI')} className="absolute -bottom-3 -right-3 bg-white text-indigo-900 p-2 rounded-2xl shadow-xl border border-indigo-200 hover:scale-110 active:scale-95 transition-all">
                      {briefMode === 'AI' ? <TrendingUp size={16}/> : <Bot size={16}/>}
                  </button>
              </div>
              <div className="flex-1 text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">{briefMode === 'AI' ? 'موجزك الذكي' : 'موجز الفصل اليوم'}</h2>
                    {briefing && !isAiLoading && (
                        <button onClick={handlePlayBriefing} className={`p-2 rounded-xl transition-all ${isPlaying ? 'bg-yellow-400 text-indigo-900 animate-pulse' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                            <Volume2 size={20}/>
                        </button>
                    )}
                  </div>
                  <div className="text-indigo-100 text-sm md:text-xl leading-relaxed opacity-90 italic font-medium max-w-3xl">
                      {isAiLoading ? 'جاري استنتاج نواتج اليوم...' : briefing}
                  </div>
              </div>
          </div>
      </div>

      {/* Center Section: Pulse & Missions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Class Pulse Chart */}
          <div className="xl:col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col min-h-[400px]">
              <div className="flex justify-between items-center mb-8 px-2">
                  <div>
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                        <Activity size={22} className="text-indigo-600"/> نبض الفصل (Class Pulse)
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">تطور التفاعل والأداء خلال الأيام السبعة الماضية</p>
                  </div>
                  <div className="flex gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600"><div className="w-2 h-2 rounded-full bg-indigo-600"></div> التفاعل</div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-600"></div> الدرجات</div>
                  </div>
              </div>
              <div className="flex-1 w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={pulseData}>
                          <defs>
                              <linearGradient id="colorPart" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                          <YAxis hide domain={[0, 100]} />
                          <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                          <Area type="monotone" dataKey="participation" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorPart)" />
                          <Area type="monotone" dataKey="grades" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorGrade)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Daily Missions Panel */}
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                    <Target size={22} className="text-indigo-600"/> مهمتك اليوم
                  </h3>
                  <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-700" style={{width: `${(completedMissionIds.size / (focusStudents.length || 1)) * 100}%`}}></div>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600">{completedMissionIds.size}/{focusStudents.length}</span>
                  </div>
              </div>
              <div className="space-y-3 flex-1">
                  {focusStudents.map(item => {
                      const isDone = completedMissionIds.has(item!.student.id);
                      return (
                        <div key={item!.student.id} onClick={() => navigate('/followup', {state:{studentId: item!.student.id}})} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border group relative overflow-hidden ${isDone ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50 border-transparent hover:border-indigo-100 hover:bg-indigo-50/50'}`}>
                            <div className="flex items-center gap-4 relative z-10">
                                <button onClick={(e) => toggleMission(item!.student.id, e)} className={`p-1.5 rounded-lg border transition-all ${isDone ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-300 group-hover:border-indigo-300'}`}>
                                    {isDone ? <Check size={14}/> : <div className="w-3.5 h-3.5"></div>}
                                </button>
                                <div>
                                    <h4 className={`font-bold text-xs transition-all ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item!.student.name}</h4>
                                    <div className="flex gap-2 mt-1">
                                        {item!.reasons.map((r, i) => (
                                            <span key={i} className={`text-[8px] font-black px-2 py-0.5 rounded-full ${isDone ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-700'}`}>{r}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <ChevronLeft className={`transition-all ${isDone ? 'text-emerald-300' : 'text-slate-300'}`} size={18}/>
                        </div>
                      );
                  })}
                  {focusStudents.length === 0 && <div className="text-center py-10 opacity-30 italic flex flex-col items-center gap-2"><Trophy size={40}/><p className="text-xs font-bold">كل الطلاب بمستوى جيد!</p></div>}
              </div>
          </div>
      </div>

      {/* KPI & Small Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="الطلاب" value={stats.totalStudents} icon={<Users size={20}/>} color="bg-blue-50 text-blue-600" />
        <StatCard label="الحضور" value={stats.attRate + '%'} icon={<CheckCircle size={20}/>} color="bg-emerald-600 text-white" />
        <StatCard label="التفاعل" value={stats.avgParticipation + '/5'} icon={<Target size={20}/>} color="bg-amber-50 text-amber-600" />
        <StatCard label="المعدل" value={stats.avgPerf + '%'} icon={<TrendingUp size={20}/>} color="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
          <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-[2.5rem] shadow-sm border border-indigo-100 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 p-10 opacity-5 pointer-events-none"><BrainCircuit size={180}/></div>
              <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100"><Lightbulb size={28}/></div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">إضاءة تربوية</h3>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Daily Pedagogical Insight</p>
                  </div>
              </div>
              <p className="text-indigo-950 font-black text-xl leading-relaxed italic relative z-10 select-none">" {getLocalPedagogicalTip()} "</p>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
              <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg"><ShieldCheck size={22} className="text-emerald-500"/> أبطال الفصل (XP)</h3>
                <button onClick={()=>navigate('/leaderboard')} className="text-[10px] font-black text-indigo-600 hover:underline">الترتيب الكامل</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {topAchievers.slice(0, 4).map((item, idx) => (
                      <div key={item.student.id} onClick={()=>navigate('/followup', {state:{studentId: item.student.id}})} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-indigo-100">
                          <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-400 text-white' : 'bg-white border text-slate-400'}`}>{idx+1}</div>
                              <span className="text-xs font-bold text-slate-700 truncate w-24">{item.student.name.split(' ')[0]} {item.student.name.split(' ')[1]}</span>
                          </div>
                          <div className="flex items-center gap-1 text-indigo-600 font-black text-xs"><Zap size={10} fill="currentColor"/> {Math.round(item.score)}</div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </div>
  );
};

const QuickActionBtn = ({ icon, label, onClick, color }: any) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
        <div className={`w-14 h-14 md:w-16 md:h-16 rounded-[1.5rem] md:rounded-[2rem] ${color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-active:scale-95 transition-all`}>
            {React.cloneElement(icon, { size: 24 })}
        </div>
        <span className="text-[9px] md:text-[10px] font-black text-slate-500 text-center line-clamp-1">{label}</span>
    </button>
);

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between transition-all hover:border-indigo-200">
    <div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-2xl font-black text-slate-800">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center shrink-0 shadow-inner`}>
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
    </div>
  </div>
);

export default Dashboard;
