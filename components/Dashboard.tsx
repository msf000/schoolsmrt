
import React, { useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AttendanceStatus } from '../types';
import { 
    Users, CheckCircle, Target, TrendingUp,
    ShieldAlert, Sparkles, Activity, Award, Star, ArrowUpRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const Dashboard: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null }> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();

  const stats = useMemo(() => {
      const total = students.length;
      const attRate = attendance.length > 0 ? (attendance.filter(a => a.status === AttendanceStatus.PRESENT).length / attendance.length) * 100 : 0;
      const perfAvg = performance.length > 0 ? (performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length) * 100 : 0;
      const alerts = 4; // Placeholder

      return { total, attRate: Math.round(attRate), perfAvg: Math.round(perfAvg), alerts };
  }, [students, attendance, performance]);

  return (
    <div className="space-y-8 pb-10">
      {/* SaaS Welcome Banner */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 flex justify-between items-center shadow-sm">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">مرحباً، {currentUser?.name.split(' ')[0]}</h1>
            <p className="text-slate-500 mt-1">إليك ملخص سريع لأداء طلابك وفصولك اليوم.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => navigate('/attendance')} className="px-5 py-2.5 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-all shadow-sm">
                رصد الحضور
            </button>
            <button onClick={() => navigate('/works')} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                رصد الدرجات
            </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <KPIStat label="إجمالي الطلاب" value={stats.total} icon={Users} color="blue" />
           <KPIStat label="نسبة الحضور" value={`${stats.attRate}%`} icon={Activity} color="emerald" />
           <KPIStat label="متوسط الإتقان" value={`${stats.perfAvg}%`} icon={Target} color="amber" />
           <KPIStat label="تنبيهات عاجلة" value={stats.alerts} icon={ShieldAlert} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
              <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={18} className="text-brand-500"/> مؤشر التقدم الأكاديمي</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">آخر 30 يوم</span>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                        {name: '1', val: 65}, {name: '2', val: 70}, {name: '3', val: 68}, 
                        {name: '4', val: 82}, {name: '5', val: 85}
                    ]}>
                        <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" hide />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}} />
                        <Area type="monotone" dataKey="val" stroke="#4f46e5" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Quick Actions / Notifications */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Sparkles size={18} className="text-brand-500"/> مساعد Gemini</h3>
              <div className="flex-1 space-y-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-600 leading-relaxed italic">"تم اكتشاف تحسن بنسبة 15% في أداء طلاب الفصل 1/أ في مادة الرياضيات مقارنة بالشهر الماضي."</p>
                  </div>
                  <div className="space-y-2">
                      {students.slice(0, 3).map(s => (
                          <div key={s.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group">
                              <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-xs">{s.name.charAt(0)}</div>
                                  <span className="text-xs font-medium text-slate-700">{s.name}</span>
                              </div>
                              <ArrowUpRight size={14} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
                          </div>
                      ))}
                  </div>
              </div>
              <button onClick={() => navigate('/students')} className="mt-6 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all">عرض كافة الطلاب</button>
          </div>
      </div>
    </div>
  );
};

const KPIStat = ({ label, value, icon: Icon, color }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        amber: 'text-amber-600 bg-amber-50',
        rose: 'text-rose-600 bg-rose-50'
    };
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
            <div className={`p-3 rounded-xl ${colors[color]}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
            </div>
        </div>
    );
};

export default Dashboard;
