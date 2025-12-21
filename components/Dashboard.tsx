import React, { useMemo, useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, SystemUser } from '../types';
import { generateDailyBriefing, playTextAsSpeech } from '../services/geminiService';
import { generateLocalDailyBrief, getTopAchievers } from '../services/analysisService';
import { Users, CheckCircle, XCircle, TrendingUp, Activity, BarChart3, ArrowRight, Sparkles, Bot, Loader2, Volume2, BrainCircuit, Zap, Crown } from 'lucide-react';
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
  const [briefMode, setBriefMode] = useState<'AI' | 'STATS'>('STATS');

  useEffect(() => {
    if (students.length > 0) {
        if (briefMode === 'AI') loadAiBrief();
        else loadStatsBrief();
    }
  }, [students.length, briefMode]);

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

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAttendance = attendance.filter(a => a.date === today);
    const presentCount = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
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

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar space-y-8 bg-slate-50">
      
      {/* Official AI Briefing Card */}
      <div className="bg-primary-800 rounded-4xl p-10 text-white shadow-active relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-12 transition-transform duration-1000 pointer-events-none">
            <BrainCircuit size={180}/>
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-10">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-3xl flex items-center justify-center shrink-0 border border-white/20 shadow-2xl relative">
                  {isAiLoading ? <Loader2 className="animate-spin text-yellow-300" size={32}/> : <Bot className="text-yellow-300" size={40}/>}
                  <button onClick={() => setBriefMode(briefMode==='AI'?'STATS':'AI')} className="absolute -bottom-2 -right-2 bg-white text-primary-800 p-1.5 rounded-lg shadow-lg hover:scale-110 transition-transform">
                      {briefMode === 'AI' ? <TrendingUp size={14}/> : <Bot size={14}/>}
                  </button>
              </div>
              <div className="flex-1 text-center lg:text-right">
                  <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                    <h2 className="text-2xl font-black">{briefMode === 'AI' ? 'التحليل الذكي' : 'موجز الفصل'}</h2>
                    {briefing && !isAiLoading && (
                        <button onClick={() => playTextAsSpeech(briefing)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all">
                            <Volume2 size={18}/>
                        </button>
                    )}
                  </div>
                  <div className="text-primary-100 text-lg leading-relaxed font-medium italic whitespace-pre-line">
                      {isAiLoading ? 'جاري استنتاج البيانات وتوليد التقرير...' : briefing}
                  </div>
              </div>
              <div className="flex gap-3">
                  <button onClick={() => navigate('/attendance')} className="bg-white text-primary-800 px-6 py-3 rounded-2xl font-black hover:shadow-lg transition-all text-sm whitespace-nowrap">بدء التحضير</button>
              </div>
          </div>
      </div>

      {/* Balanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="إجمالي الطلاب" value={stats.totalStudents} icon={<Users/>} color="text-indigo-600 bg-indigo-50" />
        <StatCard label="نسبة الحضور" value={stats.attRate + '%'} icon={<CheckCircle/>} color="text-emerald-600 bg-emerald-50" />
        <StatCard label="معدل الإتقان" value={stats.avgPerf + '%'} icon={<TrendingUp/>} color="text-primary-600 bg-primary-50" />
        <StatCard label="غياب اليوم" value={stats.absentCount} icon={<XCircle/>} color="text-rose-600 bg-rose-50" />
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10">
        <div className="xl:col-span-2 bg-white rounded-4xl p-10 shadow-premium border border-slate-100">
            <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                    <BarChart3 size={24} className="text-primary-800"/> مقارنة أداء الفصول
                </h3>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <div className="w-3 h-3 bg-primary-800 rounded-full"></div> متوسط الفصل
                </div>
            </div>
            <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.classData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#64748b'}} dy={10} />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="performance" fill="#3730a3" radius={[12, 12, 0, 0]} barSize={45} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white rounded-4xl p-10 shadow-premium border border-slate-100 flex flex-col">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-8">
                <Crown size={24} className="text-yellow-500"/> نخبة الطلاب
            </h3>
            <div className="space-y-4 flex-1">
                {getTopAchievers(students, attendance, performance).map((item, idx) => (
                    <div key={item.student.id} className="flex items-center justify-between p-4 bg-slate-50 border border-transparent rounded-2xl hover:border-primary-200 transition-all group cursor-pointer" onClick={() => navigate('/followup', {state: {studentId: item.student.id}})}>
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-yellow-400 text-white' : 'bg-white text-slate-500 border'}`}>
                                {idx + 1}
                            </div>
                            <span className="font-bold text-slate-700">{item.student.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary-800 font-black">
                            <Zap size={14} fill="currentColor"/> {Math.round(item.score)}
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={() => navigate('/leaderboard')} className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all flex items-center justify-center gap-2">
                لوحة الشرف <ArrowRight size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white rounded-4xl p-8 flex items-center justify-between shadow-premium border border-slate-100 hover:scale-[1.02] transition-all">
    <div>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-3xl font-black text-slate-800">{value}</h3>
    </div>
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-soft`}>
      {React.cloneElement(icon as React.ReactElement, { size: 28 })}
    </div>
  </div>
);

export default Dashboard;