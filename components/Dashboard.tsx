import React, { useMemo, useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, SystemUser, BehaviorStatus } from '../types';
import { generateDailyBriefing, playTextAsSpeech } from '../services/geminiService';
import { generateLocalDailyBrief } from '../services/analysisService';
import { Users, CheckCircle, XCircle, TrendingUp, Activity, BarChart3, ArrowRight, Sparkles, Bot, Loader2, Award, Volume2, BrainCircuit, Calendar, PenTool, ClipboardList, FileText, Trophy, Zap, Crown } from 'lucide-react';
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
  const [briefMode, setBriefMode] = useState<'AI' | 'STATS'>('STATS');

  useEffect(() => {
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
    } finally {
        setIsAiLoading(false);
    }
  };

  const loadStatsBrief = () => {
      const res = generateLocalDailyBrief(students, attendance, performance);
      setBriefing(res);
  };

  const handlePlayBriefing = async () => {
      if (!briefing || isPlaying) return;
      setIsPlaying(true);
      await playTextAsSpeech(briefing);
      setIsPlaying(false);
  };

  const topStudents = useMemo(() => {
    return students.map(student => {
        const myAtt = attendance.filter(a => a.studentId === student.id);
        const myPerf = performance.filter(p => p.studentId === student.id);
        let xp = student.behaviorPoints || 0;
        myAtt.forEach(a => {
            if (a.status === AttendanceStatus.PRESENT) xp += 10;
        });
        myPerf.forEach(p => { if (p.score / p.maxScore >= 0.9) xp += 100; });
        return { ...student, xp };
    }).sort((a, b) => b.xp - a.xp).slice(0, 3);
  }, [students, attendance, performance]);

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

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in bg-gray-50/50 min-h-full pb-24">
      {/* AI/Stats Header */}
      <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group border border-indigo-700">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Sparkles size={200}/></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-3xl flex flex-col items-center justify-center shrink-0 border border-white/20 shadow-2xl relative">
                  {isAiLoading ? <Loader2 className="animate-spin text-yellow-400" size={32}/> : (briefMode==='AI' ? <Bot className="text-yellow-400" size={40}/> : <Activity className="text-teal-400" size={40}/>)}
                  <button onClick={() => setBriefMode(briefMode==='AI'?'STATS':'AI')} className="absolute -bottom-2 -right-2 bg-white text-indigo-900 p-1 rounded-full shadow-lg border border-indigo-200 hover:scale-110 transition-transform">
                      {briefMode === 'AI' ? <TrendingUp size={12}/> : <Bot size={12}/>}
                  </button>
              </div>
              <div className="flex-1 text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h2 className="text-2xl font-black">{briefMode === 'AI' ? 'موجزك الذكي اليومي' : 'موجز الفصل الإحصائي'}</h2>
                    {briefing && !isAiLoading && (
                        <button 
                            onClick={handlePlayBriefing} 
                            className={`p-2 rounded-full transition-all ${isPlaying ? 'bg-yellow-400 text-indigo-900 animate-pulse' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        >
                            <Volume2 size={20}/>
                        </button>
                    )}
                  </div>
                  <div className="text-indigo-100 text-lg leading-relaxed opacity-90 italic whitespace-pre-line">
                      {isAiLoading ? 'جاري قراءة البيانات وتجهيز التوصيات...' : briefing}
                  </div>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => navigate('/attendance')} className="bg-white text-indigo-900 px-6 py-3 rounded-2xl font-black hover:scale-105 transition-all shadow-xl flex items-center gap-2">
                      تحضير الفصل
                  </button>
                  <button onClick={() => navigate('/screen')} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black hover:scale-105 transition-all shadow-xl flex items-center gap-2 border border-indigo-500">
                      شاشة العرض
                  </button>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickAction color="bg-blue-600" icon={<Calendar size={24}/>} label="الجدول الدراسي" onClick={()=>navigate('/schedule')}/>
            <QuickAction color="bg-purple-600" icon={<ClipboardList size={24}/>} label="سجل الرصد" onClick={()=>navigate('/works')}/>
            <QuickAction color="bg-yellow-600" icon={<Trophy size={24}/>} label="لوحة الشرف" onClick={()=>navigate('/leaderboard')}/>
            <QuickAction color="bg-green-600" icon={<PenTool size={24}/>} label="تحضير الدروس" onClick={()=>navigate('/planning')}/>
        </div>

        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-gray-800 flex items-center gap-2 text-sm"><Crown size={18} className="text-yellow-500"/> أبطال الأسبوع</h3>
                <button onClick={()=>navigate('/leaderboard')} className="text-[10px] font-bold text-indigo-600 hover:underline">عرض الكل</button>
            </div>
            <div className="space-y-3">
                {topStudents.map((s, idx) => (
                    <div key={s.id} onClick={()=>navigate('/followup', {state:{studentId: s.id}})} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-200 text-gray-600' : 'bg-orange-100 text-orange-600'}`}>
                                {idx + 1}
                            </div>
                            <span className="text-sm font-bold text-gray-700 group-hover:text-indigo-600">{s.name.split(' ')[0]} {s.name.split(' ')[1]}</span>
                        </div>
                        <div className="flex items-center gap-1 text-indigo-600 font-black text-xs">
                            <Zap size={10} fill="currentColor"/> {s.xp}
                        </div>
                    </div>
                ))}
                {topStudents.length === 0 && <p className="text-center text-gray-400 py-4 text-xs font-bold italic">لا توجد بيانات نقاط حالياً</p>}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="إجمالي الطلاب" value={stats.totalStudents} icon={<Users size={24}/>} color="bg-blue-50 text-blue-600" />
        <StatCard label="نسبة الحضور" value={stats.attRate + '%'} icon={<CheckCircle size={24}/>} color="bg-green-50 text-green-600" />
        <StatCard label="المعدل العام" value={stats.avgPerf + '%'} icon={<TrendingUp size={24}/>} color="bg-purple-50 text-purple-600" />
        <StatCard label="غائبون اليوم" value={stats.absentCount} icon={<XCircle size={24}/>} color="bg-red-50 text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                <BarChart3 size={24} className="text-indigo-600"/> مقارنة أداء الفصول
            </h3>
          </div>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.classData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="performance" fill="#4f46e5" radius={[12, 12, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white flex flex-col justify-between shadow-xl">
            <div>
                <h3 className="text-xl font-black mb-4">نصيحة تربوية اليوم</h3>
                <p className="opacity-80 leading-relaxed italic">"التعليم ليس ملء دلو، ولكنه إشعال نار. حاول اليوم أن تجعل طلابك يتساءلون بدلاً من أن يجيبوا فقط."</p>
            </div>
            <div className="mt-8 flex justify-center">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                    <Award size={48} className="text-yellow-400"/>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ color, icon, label, onClick }: any) => (
    <button onClick={onClick} className={`${color} p-4 rounded-3xl text-white shadow-lg hover:scale-105 transition-all flex flex-col items-center gap-2 group shrink-0`}>
        <div className="bg-white/20 p-2 rounded-xl group-hover:rotate-12 transition-transform">{icon}</div>
        <span className="font-bold text-[10px] md:text-xs whitespace-nowrap">{label}</span>
    </button>
);

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-all hover:-translate-y-1 group">
    <div>
      <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
      <h3 className="text-4xl font-black text-gray-800">{value}</h3>
    </div>
    <div className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
  </div>
);

export default Dashboard;