
import React, { useMemo, useState, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AttendanceStatus } from '../types';
import { 
    Users, CheckCircle, Target, Zap, Clock, TrendingUp, ArrowRight,
    Calendar, ShieldAlert, Sparkles, MessageSquare, Briefcase, Activity, 
    ArrowUpRight, AlertCircle, FileText, ChevronLeft, Bot
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getSchedules } from '../services/storageService';
import RecommendationHub from './RecommendationHub';
import DailyAgenda from './DailyAgenda';

const Dashboard: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null, onNavigate: (view: string) => void }> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();

  const stats = useMemo(() => {
      const total = students.length;
      const attRate = attendance.length > 0 ? (attendance.filter(a => a.status === AttendanceStatus.PRESENT).length / attendance.length) * 100 : 92;
      const perfAvg = performance.length > 0 ? (performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length) * 100 : 84;
      const highAchievers = students.filter(s => {
          const sP = performance.filter(p => p.studentId === s.id);
          if (sP.length === 0) return false;
          return (sP.reduce((a,b)=>a+(b.score/b.maxScore),0)/sP.length) >= 0.9;
      }).length;

      return { total, attRate: Math.round(attRate), perfAvg: Math.round(perfAvg), highAchievers };
  }, [students, attendance, performance]);

  return (
    <div className="space-y-8 animate-fade-in pb-16 font-tajawal">
      {/* Welcome Banner */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-full bg-blue-600/5 -skew-x-12 translate-x-16"></div>
        <div className="relative z-10 text-center lg:text-right">
            <h1 className="text-3xl font-black text-slate-800">مرحباً بك، الأستاذ {currentUser?.name.split(' ')[0]}</h1>
            <p className="text-slate-500 font-bold mt-2">إليك التقرير التنفيذي لفصولك الدراسية لهذا اليوم.</p>
        </div>
        <div className="flex gap-4 relative z-10">
            <button onClick={() => navigate('/attendance')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-3">
                <CheckCircle size={18}/> رصد الحضور
            </button>
            <button onClick={() => navigate('/works')} className="px-6 py-3 border-2 border-slate-200 text-slate-600 bg-white rounded-xl font-black text-sm hover:bg-slate-50 transition-all flex items-center gap-3">
                <TrendingUp size={18}/> رصد الدرجات
            </button>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <StatCard icon={Users} label="الطلاب المسجلين" value={stats.total} sub="نشطون حالياً" color="blue" />
           <StatCard icon={Activity} label="معدل الانضباط" value={`${stats.attRate}%`} sub="في الفصل الحالي" color="emerald" />
           <StatCard icon={Target} label="كفاءة التعلم" value={`${stats.perfAvg}%`} sub="متوسط الإتقان" color="amber" />
           <StatCard icon={Zap} label="طلاب التميز" value={stats.highAchievers} sub="درجات أعلى من 90%" color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Growth Chart */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2"><TrendingUp size={20} className="text-blue-600"/> منحنى الأداء التراكمي</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1 uppercase">Academic Growth Trend</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400"><div className="w-2 h-2 rounded-full bg-blue-600"></div> الأداء</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400"><div className="w-2 h-2 rounded-full bg-slate-200"></div> الحضور</span>
                  </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                        {name: 'أسبوع 1', val: 75}, {name: 'أسبوع 2', val: 72}, {name: 'أسبوع 3', val: 85}, 
                        {name: 'أسبوع 4', val: 82}, {name: 'أسبوع 5', val: 90}
                    ]}>
                        <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={11} fontWeight="bold" tick={{fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Area type="monotone" dataKey="val" stroke="#2563eb" fillOpacity={1} fill="url(#colorVal)" strokeWidth={4} />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* AI Insights & Recommendations */}
          <div className="flex flex-col gap-6">
              <RecommendationHub students={students} attendance={attendance} performance={performance} />
              
              <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex-1 shadow-xl">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles size={120}/></div>
                  <div className="relative z-10 flex flex-col h-full">
                    {/* Fixed: Added missing 'Bot' icon import from lucide-react */}
                    <div className="bg-white/10 w-fit p-2 rounded-xl mb-4 border border-white/10"><Bot size={24} className="text-blue-300"/></div>
                    <h4 className="text-xl font-black mb-3">توصية المحلل الذكي</h4>
                    <p className="text-indigo-100 text-sm leading-relaxed font-medium mb-8">
                        "يظهر طلاب فصل 1/أ تحسناً بنسبة 12% في مهارات التفكير الناقد. نقترح تعزيز ذلك بمهمة بحثية قصيرة الأسبوع القادم."
                    </p>
                    <button onClick={() => navigate('/lab')} className="mt-auto w-full py-3 bg-white text-indigo-900 rounded-xl font-black text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                        استكشاف استراتيجيات AI <ChevronLeft size={14}/>
                    </button>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Daily Schedule Widget */}
          <div className="lg:col-span-2">
            <DailyAgenda schedule={getSchedules()} onAction={(c) => navigate('/attendance', {state: {classId: c}})} />
          </div>

          {/* Alerts & Focus */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-slate-800 flex items-center gap-3 text-lg"><ShieldAlert size={20} className="text-red-500"/> تنبيهات المتابعة</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgent List</span>
              </div>
              <div className="space-y-4 flex-1">
                  {students.slice(0, 3).map(s => (
                      <div key={s.id} onClick={() => navigate('/followup', {state: {studentId: s.id}})} className="p-4 border border-slate-50 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">{s.name.charAt(0)}</div>
                              <div>
                                  <p className="text-sm font-black text-slate-800">{s.name.split(' ')[0]} {s.name.split(' ')[1]}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{s.className}</p>
                              </div>
                          </div>
                          <div className="p-2 text-red-400 opacity-0 group-hover:opacity-100 transition-all"><ArrowUpRight size={18}/></div>
                      </div>
                  ))}
                  {students.length === 0 && <p className="text-center py-10 text-slate-300 italic font-bold">لا توجد تنبيهات حالياً.</p>}
              </div>
              <button onClick={() => navigate('/students')} className="mt-8 py-3 bg-slate-50 text-slate-500 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all">عرض كافة الطلاب</button>
          </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100 shadow-blue-900/5',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100 shadow-emerald-900/5',
        amber: 'text-amber-600 bg-amber-50 border-amber-100 shadow-amber-900/5',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100 shadow-indigo-900/5'
    };
    return (
        <div className={`bg-white p-6 rounded-[2rem] border-b-4 ${colors[color]} shadow-md hover:scale-105 transition-all group`}>
            <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl bg-white shadow-sm group-hover:scale-110 transition-transform`}>
                    <Icon size={24} />
                </div>
                <div className="flex flex-col items-end">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{value}</h3>
                </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <CheckCircle size={12} className="text-emerald-500"/> {sub}
            </div>
        </div>
    );
};

export default Dashboard;
