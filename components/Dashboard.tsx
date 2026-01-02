
import React, { useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AttendanceStatus } from '../types';
import { 
    Users, CheckCircle, Target, Zap, Clock, TrendingUp, ArrowRight,
    Calendar, ShieldAlert, Sparkles, MessageSquare, Briefcase, Activity, 
    ArrowUpRight, AlertCircle, FileText, ChevronLeft, Bot, Award, BarChart3, Star
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getSchedules } from '../services/storageService';
import RecommendationHub from './RecommendationHub';
import DailyAgenda from './DailyAgenda';
import NarrativeAIInsights from './NarrativeAIInsights';

const Dashboard: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null, onNavigate: (view: string) => void }> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();

  const stats = useMemo(() => {
      const total = students.length;
      const attRate = attendance.length > 0 ? (attendance.filter(a => a.status === AttendanceStatus.PRESENT).length / attendance.length) * 100 : 0;
      const perfAvg = performance.length > 0 ? (performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length) * 100 : 0;
      const highAchievers = students.filter(s => {
          const sP = performance.filter(p => p.studentId === s.id);
          if (sP.length === 0) return false;
          return (sP.reduce((a,b)=>a+(b.score/b.maxScore),0)/sP.length) >= 0.9;
      }).length;

      return { total, attRate: Math.round(attRate), perfAvg: Math.round(perfAvg), highAchievers };
  }, [students, attendance, performance]);

  return (
    <div className="space-y-6 lg:space-y-10 font-tajawal pb-20 lg:pb-10">
      {/* Premium Hero Banner */}
      <div className="bg-white p-6 lg:p-10 rounded-4xl lg:rounded-[3.5rem] border shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-indigo-500/5 -skew-x-12 translate-x-32 hidden lg:block"></div>
        <div className="relative z-10 text-right space-y-4 w-full lg:w-auto">
            <div className="flex items-center gap-3">
                 <span className="bg-indigo-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-indigo-100">النظام نشط سحابياً</span>
                 <span className="text-slate-200">|</span>
                 <span className="text-slate-400 text-xs font-bold">{new Date().toLocaleDateString('ar-SA', {weekday: 'long', day: 'numeric', month: 'long'})}</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">أهلاً بك، {currentUser?.name.split(' ')[0]} 👋</h1>
            <p className="text-slate-500 font-bold text-base lg:text-lg">إليك موجز الذكاء الأكاديمي لصفوفك اليوم.</p>
        </div>
        <div className="flex flex-wrap gap-3 relative z-10 w-full lg:w-auto">
            <button onClick={() => navigate('/attendance')} className="flex-1 lg:flex-none px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3">
                <CheckCircle size={18} className="text-emerald-400"/> رصد الحضور
            </button>
            <button onClick={() => navigate('/works')} className="flex-1 lg:flex-none px-6 py-4 border-2 border-slate-100 text-slate-600 bg-white rounded-2xl font-black text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm">
                <Star size={18} className="text-amber-400"/> رصد الدرجات
            </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
           <KPIStatCard icon={Users} label="إجمالي الطلاب" value={stats.total} sub="طالب نشط" color="blue" />
           <KPIStatCard icon={Activity} label="الانضباط" value={`${stats.attRate}%`} sub="نسبة الحضور" color="emerald" />
           <KPIStatCard icon={Target} label="التمكن" value={`${stats.perfAvg}%`} sub="متوسط الإتقان" color="amber" />
           <KPIStatCard icon={Zap} label="النخبة" value={stats.highAchievers} sub="+90% إتقان" color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">
          <div className="lg:col-span-2 space-y-6 lg:space-y-10">
              {/* Analytic Graph */}
              <div className="bg-white p-6 lg:p-10 rounded-4xl lg:rounded-[3.5rem] border shadow-sm flex flex-col min-h-[400px]">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                        <h3 className="font-black text-slate-900 text-xl lg:text-2xl flex items-center gap-3"><TrendingUp size={24} className="text-indigo-600"/> منحنى النمو المعرفي</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Growth Analytics</p>
                      </div>
                      <div className="hidden sm:flex bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                        <button className="px-5 py-2 bg-white rounded-lg text-[10px] font-black text-slate-900 shadow-sm border border-slate-100">أسبوعي</button>
                        <button className="px-5 py-2 text-[10px] font-black text-slate-400">شهري</button>
                      </div>
                  </div>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                            {name: 'أسبوع 1', val: 75}, {name: 'أسبوع 2', val: 72}, {name: 'أسبوع 3', val: 85}, 
                            {name: 'أسبوع 4', val: 82}, {name: 'أسبوع 5', val: 90}
                        ]}>
                            <defs>
                                <linearGradient id="colorDashboard" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" hide />
                            <YAxis hide domain={[0, 100]} />
                            <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                            <Area type="monotone" dataKey="val" stroke="#4f46e5" fillOpacity={1} fill="url(#colorDashboard)" strokeWidth={5} />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </div>
              
              <DailyAgenda schedule={getSchedules()} onAction={(c) => navigate('/attendance', {state: {classId: c}})} />
          </div>

          <div className="flex flex-col gap-6 lg:gap-8">
              <NarrativeAIInsights stats={stats} />
              <RecommendationHub students={students} attendance={attendance} performance={performance} />
              
              <div className="bg-white p-8 rounded-4xl lg:rounded-[3.5rem] border shadow-sm flex flex-col flex-1 min-h-[400px]">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-slate-900 flex items-center gap-3 text-lg"><ShieldAlert size={22} className="text-rose-600"/> حالات عاجلة</h3>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Alerts</span>
                  </div>
                  <div className="space-y-4 flex-1">
                      {students.slice(0, 4).map(s => (
                          <div key={s.id} onClick={() => navigate('/followup', {state: {studentId: s.id}})} className="p-4 border border-slate-50 rounded-3xl hover:bg-slate-50 hover:border-indigo-100 transition-all cursor-pointer flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">{s.name.charAt(0)}</div>
                                  <div className="overflow-hidden">
                                      <p className="text-xs font-black text-slate-900 truncate max-w-[120px]">{s.name}</p>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase">{s.className} • تنبيه غياب</p>
                                  </div>
                              </div>
                              <ArrowUpRight size={16} className="text-slate-200 group-hover:text-indigo-600 transition-all shrink-0"/>
                          </div>
                      ))}
                  </div>
                  <button onClick={() => navigate('/students')} className="mt-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">إدارة كافة السجلات</button>
              </div>
          </div>
      </div>
    </div>
  );
};

const KPIStatCard = ({ icon: Icon, label, value, sub, color }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100'
    };
    return (
        <div className={`bg-white p-5 lg:p-8 rounded-3xl lg:rounded-[3rem] border border-slate-50 shadow-sm group hover:scale-[1.03] hover:shadow-xl transition-all duration-500`}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 lg:mb-8 gap-4">
                <div className={`p-3 lg:p-4 rounded-2xl bg-slate-50 ${colors[color].split(' ')[0]} group-hover:bg-white group-hover:rotate-6 transition-all shadow-inner`}>
                    <Icon size={24} strokeWidth={2.5}/>
                </div>
                <div className="flex flex-col lg:items-end">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{label}</p>
                    <h3 className="text-2xl lg:text-4xl font-black text-slate-900 tracking-tighter">{value}</h3>
                </div>
            </div>
            <div className="pt-3 border-t border-slate-50 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> {sub}
            </div>
        </div>
    );
};

export default Dashboard;
