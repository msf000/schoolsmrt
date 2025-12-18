
import React, { useMemo, useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, SystemUser } from '../types';
import { generateDailyBriefing, playTextAsSpeech } from '../services/geminiService';
import { Users, CheckCircle, XCircle, TrendingUp, Activity, BarChart3, ArrowRight, Sparkles, Bot, Loader2, Award, Volume2, BrainCircuit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
  onNavigate: (view: string) => void;
}

const STYLE_COLORS = {
  VISUAL: '#4f46e5',
  AUDITORY: '#10b981',
  READ_WRITE: '#f59e0b',
  KINESTHETIC: '#ef4444',
  UNKNOWN: '#94a3b8'
};

const Dashboard: React.FC<DashboardProps> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();
  const [aiBrief, setAiBrief] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (students.length > 0) {
        loadAiBrief();
    }
  }, [currentUser, students.length]);

  const loadAiBrief = async () => {
    setIsAiLoading(true);
    try {
        const briefing = await generateDailyBriefing(students, attendance, performance);
        setAiBrief(briefing);
    } catch (e) {
        setAiBrief("أهلاً بك! ركز اليوم على تحفيز الطلاب ومتابعة تقدمهم. بالتوفيق!");
    } finally {
        setIsAiLoading(false);
    }
  };

  const handlePlayBriefing = async () => {
      if (!aiBrief || isPlaying) return;
      setIsPlaying(true);
      await playTextAsSpeech(aiBrief);
      setIsPlaying(false);
  };

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAttendance = attendance.filter(a => a.date === today);
    const presentCount = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const attRate = students.length > 0 ? Math.round((presentCount / students.length) * 100) : 100;

    const styles: Record<string, number> = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0, UNKNOWN: 0 };
    students.forEach(s => {
      const style = s.learningStyle || 'UNKNOWN';
      styles[style]++;
    });

    const styleData = Object.keys(styles).map(k => ({
      name: k === 'VISUAL' ? 'بصري' : k === 'AUDITORY' ? 'سمعي' : k === 'READ_WRITE' ? 'قرائي' : k === 'KINESTHETIC' ? 'حركي' : 'غير محدد',
      value: styles[k],
      key: k
    })).filter(d => d.value > 0);

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
        styleData
    };
  }, [students, attendance, performance]);

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in bg-gray-50/50 min-h-full pb-24">
      <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group border border-indigo-700">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Sparkles size={200}/></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-2xl rounded-3xl flex items-center justify-center shrink-0 border border-white/20 shadow-2xl">
                  {isAiLoading ? <Loader2 className="animate-spin text-yellow-400" size={32}/> : <Bot className="text-yellow-400" size={40}/>}
              </div>
              <div className="flex-1 text-center md:text-right">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <h2 className="text-2xl font-black">موجزك الذكي</h2>
                    <span className="bg-yellow-400 text-indigo-900 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-tighter">AI Ready</span>
                    {aiBrief && !isAiLoading && (
                        <button 
                            onClick={handlePlayBriefing} 
                            disabled={isPlaying}
                            className={`p-2 rounded-full transition-all ${isPlaying ? 'bg-yellow-400 text-indigo-900 animate-pulse' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                        >
                            <Volume2 size={20}/>
                        </button>
                    )}
                  </div>
                  <div className="text-indigo-100 text-lg leading-relaxed opacity-90 italic">
                      {isAiLoading ? 'جاري تحليل بيانات الطلاب واستخراج التوصيات...' : aiBrief}
                  </div>
              </div>
              <button onClick={() => navigate('/attendance')} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black hover:scale-105 transition-all shadow-2xl flex items-center gap-2 group">
                  سجل الحضور <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform"/>
              </button>
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
                <Bar dataKey="performance" fill="#4f46e5" radius={[12, 12, 0, 0]} barSize={50}>
                    {stats.classData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
              <BrainCircuit size={24} className="text-purple-600"/> أنماط تعلم الفصل
            </h3>
            <div className="flex-1 h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.styleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.styleData.map((entry: any) => (
                      <Cell key={entry.key} fill={STYLE_COLORS[entry.key as keyof typeof STYLE_COLORS]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <button onClick={() => navigate('/learning-lab')} className="mt-4 w-full py-3 bg-purple-50 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-100 transition-colors">
              تحليل الاستراتيجيات التدريسية
            </button>
        </div>
      </div>
    </div>
  );
};

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
