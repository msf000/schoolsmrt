import React, { useMemo, useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, SystemUser, BehaviorStatus } from '../types';
import { generateDailyBriefing, playTextAsSpeech } from '../services/geminiService';
import { generateLocalDailyBrief, getLocalPedagogicalTip, detectAtRiskStudents, getTopAchievers } from '../services/analysisService';
import { Users, CheckCircle, XCircle, TrendingUp, Activity, BarChart3, ArrowRight, Sparkles, Bot, Loader2, Award, Volume2, BrainCircuit, Calendar, PenTool, ClipboardList, FileText, Trophy, Zap, Crown, AlertTriangle, MessageCircle, ChevronLeft } from 'lucide-react';
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

  useEffect(() => {
    localStorage.setItem('dashboard_brief_mode', briefMode);
    if (students.length > 0) {
        if (briefMode === 'AI') loadAiBrief();
        else loadStatsBrief();
    }
  }, [currentUser, students.length, briefMode]);

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

  const atRiskList = useMemo(() => detectAtRiskStudents(students, attendance, performance), [students, attendance, performance]);
  const topAchievers = useMemo(() => getTopAchievers(students, attendance, performance), [students, attendance, performance]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAttendance = attendance.filter(a => a.date === today);
    const presentCount = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const attRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 100;

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
        classData
    };
  }, [students, attendance, performance]);

  const pedagogicalTip = useMemo(() => getLocalPedagogicalTip(), []);

  const handlePlayBriefing = async () => {
      if (!briefing || isPlaying) return;
      setIsPlaying(true);
      await playTextAsSpeech(briefing);
      setIsPlaying(false);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in bg-gray-50/50 min-h-full pb-24 overflow-y-auto custom-scrollbar">
      {/* AI/Stats Header - Responsive */}
      <div className="bg-indigo-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden group border border-indigo-700">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none"><Sparkles size={180}/></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-2xl rounded-2xl md:rounded-3xl flex flex-col items-center justify-center shrink-0 border border-white/20 shadow-2xl relative">
                  {isAiLoading ? <Loader2 className="animate-spin text-yellow-400" size={28}/> : (briefMode==='AI' ? <Bot className="text-yellow-400" size={32}/> : <Activity className="text-teal-400" size={32}/>)}
                  <button 
                    onClick={() => setBriefMode(briefMode==='AI'?'STATS':'AI')} 
                    className="absolute -bottom-2 -right-2 bg-white text-indigo-900 p-1.5 rounded-full shadow-lg border border-indigo-200 hover:scale-110 transition-transform"
                  >
                      {briefMode === 'AI' ? <TrendingUp size={14}/> : <Bot size={14}/>}
                  </button>
              </div>
              <div className="flex-1 text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h2 className="text-xl md:text-2xl font-black">{briefMode === 'AI' ? 'موجزك الذكي' : 'موجز الفصل'}</h2>
                    {briefing && !isAiLoading && (
                        <button onClick={handlePlayBriefing} className={`p-1.5 rounded-full transition-all ${isPlaying ? 'bg-yellow-400 text-indigo-900 animate-pulse' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                            <Volume2 size={16}/>
                        </button>
                    )}
                  </div>
                  <div className="text-indigo-100 text-sm md:text-lg leading-relaxed opacity-90 italic whitespace-pre-line line-clamp-4 md:line-clamp-none">
                      {isAiLoading ? 'جاري قراءة البيانات...' : briefing}
                  </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => navigate('/attendance')} className="flex-1 md:flex-none bg-white text-indigo-900 px-6 py-2.5 rounded-xl font-black hover:scale-105 transition-all shadow-xl text-sm">تحضير</button>
                  <button onClick={() => navigate('/screen')} className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black hover:scale-105 transition-all shadow-xl border border-indigo-500 text-sm">العرض</button>
              </div>
          </div>
      </div>

      {/* Quick Actions - Better Grid for Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <QuickAction color="bg-blue-600" icon={<Calendar size={22}/>} label="الجدول" onClick={()=>navigate('/schedule')}/>
            <QuickAction color="bg-purple-600" icon={<ClipboardList size={22}/>} label="الرصد" onClick={()=>navigate('/works')}/>
            <QuickAction color="bg-yellow-600" icon={<Trophy size={22}/>} label="الأبطال" onClick={()=>navigate('/leaderboard')}/>
            <QuickAction color="bg-green-600" icon={<PenTool size={22}/>} label="التحضير" onClick={()=>navigate('/planning')}/>
        </div>

        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-48 md:h-auto overflow-hidden">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-gray-800 flex items-center gap-2 text-xs"><Crown size={16} className="text-yellow-500"/> أبطال الفصل</h3>
                <button onClick={()=>navigate('/leaderboard')} className="text-[10px] font-black text-indigo-600 hover:underline">الكل</button>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
                {topAchievers.map((item, idx) => (
                    <div key={item.student.id} onClick={()=>navigate('/followup', {state:{studentId: item.student.id}})} className="flex items-center justify-between p-2 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors group">
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${idx === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{idx+1}</div>
                            <span className="text-[11px] font-bold text-gray-700 truncate w-24 md:w-auto">{item.student.name.split(' ')[0]} {item.student.name.split(' ')[1]}</span>
                        </div>
                        <div className="flex items-center gap-1 text-indigo-600 font-black text-[10px]"><Zap size={10} fill="currentColor"/> {Math.round(item.score)}</div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* KPI Cards - Stack on Mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <StatCard label="الطلاب" value={stats.totalStudents} icon={<Users size={20}/>} color="bg-blue-50 text-blue-600" />
        <StatCard label="الحضور" value={stats.attRate + '%'} icon={<CheckCircle size={20}/>} color="bg-green-600 text-white" />
        <StatCard label="المعدل" value={stats.avgPerf + '%'} icon={<TrendingUp size={20}/>} color="bg-purple-50 text-purple-600" />
        <StatCard label="الغياب" value={stats.absentCount} icon={<XCircle size={20}/>} color="bg-red-50 text-red-600" />
      </div>

      {/* Charts & Tips */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-3 mb-6">
              <BarChart3 size={20} className="text-indigo-600"/> أداء الفصول
          </h3>
          <div className="h-[250px] md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.classData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="performance" fill="#4f46e5" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-indigo-600 rounded-[2rem] p-6 md:p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden group">
            <Sparkles className="absolute -bottom-10 -right-10 opacity-10 group-hover:rotate-45 transition-transform duration-700 pointer-events-none" size={150}/>
            <div>
                <h3 className="text-lg font-black mb-3">نصيحة اليوم</h3>
                <p className="opacity-90 leading-relaxed italic text-sm md:text-base">"{pedagogicalTip}"</p>
            </div>
            <div className="mt-6 flex justify-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                    <Award size={32} className="text-yellow-400"/>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ color, icon, label, onClick }: any) => (
    <button onClick={onClick} className={`${color} p-4 rounded-3xl text-white shadow-lg active:scale-95 transition-all flex flex-col items-center gap-2 group shrink-0`}>
        <div className="bg-white/20 p-2 rounded-xl group-hover:rotate-12 transition-transform">{icon}</div>
        <span className="font-black text-[10px] md:text-xs whitespace-nowrap">{label}</span>
    </button>
);

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between transition-all hover:border-indigo-200">
    <div>
      <p className="text-gray-400 text-[9px] md:text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-xl md:text-3xl font-black text-gray-800">{value}</h3>
    </div>
    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl ${color} flex items-center justify-center shrink-0`}>
      {React.cloneElement(icon as React.ReactElement, { size: 18 })}
    </div>
  </div>
);

export default Dashboard;