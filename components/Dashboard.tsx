
import React, { useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AttendanceStatus } from '../types';
import { 
    Users, CheckCircle, Target, Zap, Clock, TrendingUp, ArrowRight,
    Calendar, ShieldAlert, Sparkles, MessageSquare, Briefcase, Activity, 
    ArrowUpRight, AlertCircle, FileText, ChevronLeft, Bot, Award, BarChart3
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
    <div className="space-y-10 animate-fade-in pb-16 font-tajawal">
      {/* Premium Hero Banner */}
      <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-full bg-slate-900/5 -skew-x-12 translate-x-20"></div>
        <div className="relative z-10 text-right space-y-4">
            <div className="flex items-center gap-3">
                 <span className="bg-indigo-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">النظام نشط</span>
                 <span className="text-slate-300">|</span>
                 <span className="text-slate-400 text-xs font-bold">{new Date().toLocaleDateString('ar-SA', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</span>
            </div>
            <h1 className="text-4xl font-black text-slate-800">أهلاً بك، الأستاذ {currentUser?.name.split(' ')[0]}</h1>
            <p className="text-slate-500 font-medium text-lg">إليك موجز الأداء التعليمي لفصولك المسندة لليوم.</p>
        </div>
        <div className="flex gap-4 relative z-10">
            <button onClick={() => navigate('/attendance')} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-2xl flex items-center gap-3 group">
                <CheckCircle size={20} className="group-hover:text-emerald-400 transition-colors"/> رصد الحضور الميداني
            </button>
            <button onClick={() => navigate('/works')} className="px-8 py-4 border-2 border-slate-100 text-slate-600 bg-white rounded-2xl font-black text-sm hover:bg-slate-50 transition-all flex items-center gap-3">
                <Award size={20} className="text-blue-600"/> مركز الرصد الأكاديمي
            </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           <KPIStatCard icon={Users} label="إجمالي الطلاب" value={stats.total} sub="مسجلون في النظام" color="blue" />
           <KPIStatCard icon={Activity} label="معدل الانضباط" value={`${stats.attRate}%`} sub="نسبة الحضور التراكمي" color="emerald" />
           <KPIStatCard icon={Target} label="كفاءة التمكن" value={`${stats.perfAvg}%`} sub="متوسط نواتج التعلم" color="amber" />
           <KPIStatCard icon={Zap} label="طلاب النخبة" value={stats.highAchievers} sub="مستوى إتقان +90%" color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-10">
              {/* Analytic Graph */}
              <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm flex flex-col min-h-[450px]">
                  <div className="flex justify-between items-center mb-12">
                      <div>
                        <h3 className="font-black text-slate-800 text-2xl flex items-center gap-3"><TrendingUp size={24} className="text-blue-600"/> منحنى النمو المعرفي</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Academic Growth Progress</p>
                      </div>
                      <div className="flex bg-slate-100 p-1 rounded-xl border">
                        <button className="px-4 py-1.5 bg-white rounded-lg text-[10px] font-black text-slate-800 shadow-sm">أسبوعي</button>
                        <button className="px-4 py-1.5 text-[10px] font-black text-slate-400">شهري</button>
                      </div>
                  </div>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={[
                            {name: 'أسبوع 1', val: 75}, {name: 'أسبوع 2', val: 72}, {name: 'أسبوع 3', val: 85}, 
                            {name: 'أسبوع 4', val: 82}, {name: 'أسبوع 5', val: 90}
                        ]}>
                            <defs>
                                <linearGradient id="colorDashboard" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={11} fontWeight="bold" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                            <YAxis hide domain={[0, 100]} />
                            <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)'}} />
                            <Area type="monotone" dataKey="val" stroke="#2563eb" fillOpacity={1} fill="url(#colorDashboard)" strokeWidth={5} />
                        </AreaChart>
                    </ResponsiveContainer>
                  </div>
              </div>
              
              <DailyAgenda schedule={getSchedules()} onAction={(c) => navigate('/attendance', {state: {classId: c}})} />
          </div>

          <div className="flex flex-col gap-8">
              <NarrativeAIInsights stats={stats} />
              <RecommendationHub students={students} attendance={attendance} performance={performance} />
              
              <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm flex flex-col flex-1">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg"><ShieldAlert size={20} className="text-rose-500"/> التنبيهات العاجلة</h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Action Required</span>
                  </div>
                  <div className="space-y-4 flex-1">
                      {students.slice(0, 4).map(s => (
                          <div key={s.id} onClick={() => navigate('/followup', {state: {studentId: s.id}})} className="p-5 border border-slate-50 rounded-[2rem] hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">{s.name.charAt(0)}</div>
                                  <div>
                                      <p className="text-sm font-black text-slate-800">{s.name.split(' ')[0]} {s.name.split(' ')[1]}</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">{s.className} • غياب متكرر</p>
                                  </div>
                              </div>
                              <ArrowUpRight size={18} className="text-slate-200 group-hover:text-blue-600 group-hover:translate-x-[-2px] group-hover:translate-y-[-2px] transition-all"/>
                          </div>
                      ))}
                      {students.length === 0 && <p className="text-center py-20 text-slate-200 italic font-black text-xl">السجلات نظيفة تماماً</p>}
                  </div>
                  <button onClick={() => navigate('/students')} className="mt-10 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all">إدارة كافة السجلات</button>
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
        <div className={`bg-white p-8 rounded-[3rem] border shadow-sm group hover:scale-[1.03] transition-all duration-500`}>
            <div className="flex justify-between items-start mb-8">
                <div className={`p-4 rounded-[1.5rem] bg-slate-50 ${colors[color].split(' ')[0]} group-hover:bg-white transition-colors shadow-inner`}>
                    <Icon size={28} strokeWidth={2.5}/>
                </div>
                <div className="flex flex-col items-end">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <h3 className="text-4xl font-black text-slate-800 tracking-tighter">{value}</h3>
                </div>
            </div>
            <div className="pt-4 border-t border-slate-50 flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> {sub}
            </div>
        </div>
    );
};

export default Dashboard;
