
import React, { useMemo, useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, SystemUser, BehaviorStatus } from '../types';
import { generateDailyBriefing, playTextAsSpeech } from '../services/geminiService';
import { generateLocalDailyBrief, getLocalPedagogicalTip, detectAtRiskStudents, getTopAchievers, getDailyFocusStudents } from '../services/analysisService';
/* Added Check to the lucide-react imports to fix the error on line 165 */
import { Users, CheckCircle, XCircle, TrendingUp, Activity, BarChart3, ArrowRight, Sparkles, Bot, Loader2, Award, Volume2, BrainCircuit, Calendar, PenTool, ClipboardList, FileText, Trophy, Zap, Crown, AlertTriangle, MessageCircle, ChevronLeft, Target, Lightbulb, CheckSquare, Check } from 'lucide-react';
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

  // Track daily tasks completion
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
    <div className="p-4 md:p-6 space-y-6 animate-fade-in bg-gray-50/50 min-h-full pb-24 overflow-y-auto custom-scrollbar">
      {/* AI/Stats Header */}
      <div className="bg-indigo-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-white shadow-2xl relative overflow-hidden group border border-indigo-700">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none"><Sparkles size={180}/></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-2xl rounded-2xl md:rounded-3xl flex flex-col items-center justify-center shrink-0 border border-white/20 shadow-2xl relative">
                  {isAiLoading ? <Loader2 className="animate-spin text-yellow-400" size={28}/> : (briefMode==='AI' ? <Bot className="text-yellow-400" size={32}/> : <Activity className="text-teal-400" size={32}/>)}
                  <button onClick={() => setBriefMode(briefMode==='AI'?'STATS':'AI')} className="absolute -bottom-2 -right-2 bg-white text-indigo-900 p-1.5 rounded-full shadow-lg border border-indigo-200 hover:scale-110 transition-transform">
                      {briefMode === 'AI' ? <TrendingUp size={14}/> : <Bot size={14}/>}
                  </button>
              </div>
              <div className="flex-1 text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h2 className="text-xl md:text-2xl font-black">{briefMode === 'AI' ? 'موجزك الذكي' : 'موجز الفصل اليوم'}</h2>
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
                  <button onClick={() => navigate('/performance')} className="flex-1 md:flex-none bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black hover:scale-105 transition-all shadow-xl border border-indigo-500 text-sm">الدرجات</button>
              </div>
          </div>
      </div>

      {/* Daily Progress & Missions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-indigo-100 flex flex-col">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-3">
                    <Target size={20} className="text-indigo-600"/> مهمتك اليوم: طلاب للتركيز
                  </h3>
                  <div className="flex items-center gap-2">
                      <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden border">
                          <div className="h-full bg-emerald-500 transition-all duration-700" style={{width: `${(completedMissionIds.size / (focusStudents.length || 1)) * 100}%`}}></div>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600">{completedMissionIds.size}/{focusStudents.length} تم</span>
                  </div>
              </div>
              <div className="space-y-4 flex-1">
                  {focusStudents.map(item => {
                      const isDone = completedMissionIds.has(item!.student.id);
                      return (
                        <div key={item!.student.id} onClick={() => navigate('/followup', {state:{studentId: item!.student.id}})} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border group relative overflow-hidden ${isDone ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-transparent hover:border-indigo-100 hover:bg-indigo-50'}`}>
                            <div className="flex items-center gap-4 relative z-10">
                                <button onClick={(e) => toggleMission(item!.student.id, e)} className={`p-1.5 rounded-lg border transition-all ${isDone ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-gray-300 group-hover:border-indigo-300'}`}>
                                    {isDone ? <Check size={14}/> : <div className="w-3.5 h-3.5"></div>}
                                </button>
                                <div>
                                    <h4 className={`font-bold text-sm transition-all ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{item!.student.name}</h4>
                                    <div className="flex gap-2 mt-1">
                                        {item!.reasons.map((r, i) => (
                                            <span key={i} className={`text-[9px] font-black px-2 py-0.5 rounded-full ${isDone ? 'bg-gray-100 text-gray-400' : 'bg-indigo-100 text-indigo-700'}`}>{r}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <ChevronLeft className={`transition-all ${isDone ? 'text-emerald-300' : 'text-gray-300'}`} size={18}/>
                        </div>
                      );
                  })}
                  {focusStudents.length === 0 && <p className="text-center py-10 text-gray-400 italic">جميع الطلاب بمستوى تفاعل جيد اليوم!</p>}
              </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-[2rem] shadow-sm border border-indigo-100 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 p-10 opacity-5 pointer-events-none"><BrainCircuit size={180}/></div>
              <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Lightbulb size={24}/></div>
                  <div>
                    <h3 className="font-black text-gray-800">نصيحة تربوية لليوم</h3>
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Pedagogical Insight</p>
                  </div>
              </div>
              <p className="text-indigo-950 font-bold text-lg leading-relaxed italic relative z-10">" {getLocalPedagogicalTip()} "</p>
          </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <StatCard label="الطلاب" value={stats.totalStudents} icon={<Users size={20}/>} color="bg-blue-50 text-blue-600" />
        <StatCard label="الحضور" value={stats.attRate + '%'} icon={<CheckCircle size={20}/>} color="bg-green-600 text-white" />
        <StatCard label="التفاعل" value={stats.avgParticipation + '/5'} icon={<Target size={20}/>} color="bg-yellow-50 text-yellow-600" />
        <StatCard label="المعدل" value={stats.avgPerf + '%'} icon={<TrendingUp size={20}/>} color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
        {/* Class Performance Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-3 mb-6">
              <BarChart3 size={20} className="text-indigo-600"/> متوسط الأداء لكل فصل
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

        {/* Top Achievers Widget */}
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm"><Crown size={16} className="text-yellow-500"/> أبطال الفصل (XP)</h3>
                <button onClick={()=>navigate('/leaderboard')} className="text-[10px] font-black text-indigo-600 hover:underline">الكل</button>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
                {topAchievers.map((item, idx) => (
                    <div key={item.student.id} onClick={()=>navigate('/followup', {state:{studentId: item.student.id}})} className="flex items-center justify-between p-3 hover:bg-indigo-50 rounded-2xl cursor-pointer transition-all group">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${idx === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{idx+1}</div>
                            <span className="text-xs font-bold text-gray-700 truncate w-24 md:w-auto">{item.student.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-indigo-600 font-black text-[10px]"><Zap size={10} fill="currentColor"/> {Math.round(item.score)}</div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

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
