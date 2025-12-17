
import React, { useMemo, useState, useEffect } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, SystemUser, AcademicTerm } from '../types';
import { getAcademicTerms } from '../services/storageService';
import { generateDailyBriefing } from '../services/geminiService';
import { Users, CheckCircle, XCircle, TrendingUp, Activity, PieChart as PieIcon, ArrowRight, GraduationCap, Sparkles, Bot, Loader2 } from 'lucide-react';
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
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [aiBrief, setAiBrief] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const loadedTerms = getAcademicTerms(currentUser?.id);
    setTerms(loadedTerms);
    const active = loadedTerms.find(t => t.isCurrent) || (loadedTerms.length > 0 ? loadedTerms[0] : null);
    if (active) setSelectedTermId(active.id);
    
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

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const today = new Date().toISOString().split('T')[0];
    const todaysAttendance = attendance.filter(a => a.date === today);
    
    const presentCount = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const absentCount = todaysAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    
    const attRate = totalStudents > 0 && todaysAttendance.length > 0 
      ? Math.round((presentCount / totalStudents) * 100) 
      : 100;

    const avgPerf = performance.length > 0 
      ? Math.round((performance.reduce((acc, curr) => acc + (curr.score / (curr.maxScore || 10)), 0) / performance.length) * 100)
      : 0;

    const attendanceData = todaysAttendance.length > 0 ? [
      { name: 'حاضر', value: presentCount, color: '#10b981' },
      { name: 'غائب', value: absentCount, color: '#ef4444' },
    ] : [];

    return { totalStudents, presentCount, absentCount, attRate, avgPerf, attendanceData };
  }, [students, attendance, performance]);

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in bg-gray-50/50 min-h-full pb-24">
      {/* Welcome & AI Briefing Banner */}
      <div className="bg-indigo-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Sparkles size={200}/></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-xl">
                  {isAiLoading ? <Loader2 className="animate-spin text-yellow-400"/> : <Bot className="text-yellow-400" size={32}/>}
              </div>
              <div className="flex-1 text-center md:text-right">
                  <h2 className="text-xl font-black mb-2 flex items-center justify-center md:justify-start gap-2">
                      موجزك الذكي لليوم <Sparkles size={16} className="text-yellow-400"/>
                  </h2>
                  <div className="text-indigo-100 text-sm leading-relaxed whitespace-pre-line opacity-90">
                      {isAiLoading ? 'جاري تحليل بيانات الطلاب...' : aiBrief}
                  </div>
              </div>
              <button 
                onClick={() => navigate('/attendance')}
                className="bg-white text-indigo-900 px-6 py-3 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl flex items-center gap-2"
              >
                  ابدأ التحضير <ArrowRight size={18}/>
              </button>
          </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="إجمالي الطلاب" value={stats.totalStudents} icon={<Users size={24}/>} color="bg-blue-50 text-blue-600" />
        <StatCard label="نسبة حضور اليوم" value={stats.attRate + '%'} icon={<CheckCircle size={24}/>} color="bg-green-50 text-green-600" />
        <StatCard label="متوسط الأداء" value={stats.avgPerf + '%'} icon={<TrendingUp size={24}/>} color="bg-purple-50 text-purple-600" />
        <StatCard label="غائبون اليوم" value={stats.absentCount} icon={<XCircle size={24}/>} color="bg-red-50 text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Activity size={18} className="text-indigo-600"/> اتجاه الحضور (آخر 30 سجل)
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendance.slice(-30).map(a => ({ date: a.date.slice(5), status: a.status === 'PRESENT' ? 1 : 0 }))}>
                <defs>
                  <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip />
                <Area type="monotone" dataKey="status" stroke="#4f46e5" strokeWidth={2} fill="url(#colorAtt)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <PieIcon size={18} className="text-red-500"/> توزيع الحضور اليوم
          </h3>
          <div className="h-[300px] flex items-center justify-center">
            {stats.attendanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.attendanceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.attendanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-300 italic text-sm">
                لم يتم رصد حضور اليوم بعد
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors group">
    <div>
      <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
      <h3 className="text-3xl font-black text-gray-800 group-hover:text-indigo-600 transition-colors">{value}</h3>
    </div>
    <div className={`p-4 rounded-2xl ${color} transform group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
  </div>
);

export default Dashboard;
