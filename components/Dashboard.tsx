
import React, { useMemo, useState, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AttendanceStatus, Exam } from '../types';
import { 
    Users, CheckCircle, Target, TrendingUp,
    ShieldAlert, Sparkles, Activity, Award, Star, ArrowUpRight, Calendar, Bot, Video, Clock, ChevronLeft, ArrowUpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getExams, getStudents, getExamResults } from '../services/storageService';
import { calculateGrowthMetrics } from '../services/analysisService';

const Dashboard: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null }> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();
  const [liveExams, setLiveExams] = useState<Exam[]>([]);
  const [growthLeaders, setGrowthLeaders] = useState<any[]>([]);

  const stats = useMemo(() => {
      const total = students.length;
      const attRate = attendance.length > 0 ? (attendance.filter(a => a.status === AttendanceStatus.PRESENT).length / attendance.length) * 100 : 0;
      const perfAvg = performance.length > 0 ? (performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length) * 100 : 0;
      return { total, attRate: Math.round(attRate), perfAvg: Math.round(perfAvg) };
  }, [students, attendance, performance]);

  useEffect(() => {
    if (currentUser?.id) {
        const allExams = getExams(currentUser.id);
        const now = new Date();
        const active = allExams.filter(e => {
            if (!e.isActive || !e.startDate || !e.endDate) return false;
            return now >= new Date(e.startDate) && now <= new Date(e.endDate);
        });
        setLiveExams(active);

        // حساب أبطال النمو تلقائياً لأحدث اختبارين قبلي وبعدي
        const pre = allExams.find(e => e.type === 'PRE_TEST' || e.type === 'DIAGNOSTIC');
        const post = allExams.find(e => e.type === 'POST_TEST');
        if (pre && post) {
            const preRes = getExamResults(pre.id);
            const postRes = getExamResults(post.id);
            const { comparison } = calculateGrowthMetrics(preRes, postRes, students);
            setGrowthLeaders(comparison.sort((a,b) => b.growth - a.growth).slice(0, 4));
        }
    }
  }, [currentUser, students]);

  return (
    <div className="space-y-8 pb-10 page-enter font-tajawal">
      <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-center shadow-sm gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-full bg-brand-500/5 -skew-x-12 translate-x-10"></div>
        <div className="relative z-10">
            <h1 className="text-2xl font-black text-slate-900">أهلاً بك، {currentUser?.name.split(' ')[0]} 👋</h1>
            <p className="text-slate-500 mt-1 font-medium">نظام المتابع الذكي يساعدك على إدارة فصولك بفعالية أكبر.</p>
        </div>
        <div className="flex gap-3 relative z-10">
            <button onClick={() => navigate('/attendance')} className="px-6 py-3 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/20">
                رصد الحضور
            </button>
            <button onClick={() => navigate('/gradebook')} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
                سجل الدرجات
            </button>
        </div>
      </div>

      {/* Live Exams Pulse */}
      {liveExams.length > 0 && (
          <div className="grid grid-cols-1 gap-6 animate-fade-in">
              {liveExams.map(exam => (
                  <div key={exam.id} className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden border border-white/10">
                      <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Video size={100}/></div>
                      <div className="relative z-10 flex items-center gap-6">
                          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 animate-pulse">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          </div>
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-red-500 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Live Now</span>
                                  <h3 className="text-xl font-black">{exam.title}</h3>
                              </div>
                              <p className="text-indigo-300 text-xs font-bold">{exam.subject} • ينتهي في: {new Date(exam.endDate!).toLocaleTimeString('ar-SA')}</p>
                          </div>
                      </div>
                      <div className="flex gap-3 relative z-10">
                          {exam.isLive && exam.streamUrl && (
                              <a href={exam.streamUrl} target="_blank" rel="noreferrer" className="px-6 py-2.5 bg-white/10 border border-white/20 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-white/20 transition-all">
                                  <Video size={16}/> مراقبة البث
                              </a>
                          )}
                          <button onClick={() => navigate('/exams')} className="px-6 py-2.5 bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg hover:bg-indigo-600 transition-all flex items-center gap-2">
                              <Target size={16}/> مراقب النتائج
                          </button>
                      </div>
                  </div>
              ))}
          </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <KPIStat label="إجمالي الطلاب" value={stats.total} icon={Users} color="blue" />
           <KPIStat label="نسبة الحضور" value={`${stats.attRate}%`} icon={Activity} color="emerald" />
           <KPIStat label="متوسط الإتقان" value={`${stats.perfAvg}%`} icon={Target} color="amber" />
           <KPIStat label="أدوات نشطة" value="12" icon={Sparkles} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[450px]">
              <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={18} className="text-brand-500"/> النشاط الأكاديمي الأسبوعي</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded">Live Data</span>
              </div>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[{name: 'الأحد', v: 70}, {name: 'الاثنين', v: 85}, {name: 'الثلاثاء', v: 78}, {name: 'الأربعاء', v: 92}, {name: 'الخميس', v: 88}]}>
                        <defs>
                            <linearGradient id="colorDashboard" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Area type="monotone" dataKey="v" stroke="#4f46e5" fillOpacity={1} fill="url(#colorDashboard)" strokeWidth={3} />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>

          <div className="flex flex-col gap-6">
              {/* بطاقة أبطال النمو */}
              <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden shrink-0 h-[220px]">
                  <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><ArrowUpCircle size={120}/></div>
                  <div className="relative z-10">
                    <h3 className="text-lg font-black flex items-center gap-2 mb-4"><Award size={20} className="text-yellow-400"/> أبطال قفزة النمو</h3>
                    <div className="space-y-3">
                        {growthLeaders.length > 0 ? growthLeaders.map((leader, i) => (
                            <div key={i} className="flex justify-between items-center bg-white/10 p-2 rounded-xl border border-white/5">
                                <span className="text-xs font-bold">{leader.studentName}</span>
                                <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-lg">+{leader.growth}%</span>
                            </div>
                        )) : (
                            <div className="text-xs text-indigo-200 italic">بانتظار إجراء اختبار بعدي للمقارنة...</div>
                        )}
                    </div>
                  </div>
              </div>

              <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col shadow-2xl relative overflow-hidden flex-1">
                  <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Bot size={150}/></div>
                  <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-6">
                          <div className="p-2 bg-white/10 rounded-lg border border-white/10"><Bot size={20} className="text-indigo-400"/></div>
                          <h3 className="font-bold text-lg">موجز Gemini الذكي</h3>
                      </div>
                      <div className="flex-1 space-y-4">
                          <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-xs text-indigo-100 leading-relaxed italic">
                            {growthLeaders.length > 0 ? 
                                `"لقد سجل الطلاب في فصلك قفزة نمو مذهلة بمتوسط ${Math.round(growthLeaders.reduce((a,b)=>a+b.growth,0)/growthLeaders.length)}%، نوصي باستمرار نفس الاستراتيجية."` :
                                `"يظهر الطلاب تحسناً ملحوظاً في التفاعل الصفي هذا الأسبوع، نوصي بتكريم الطلاب الأكثر انضباطاً غداً."`
                            }
                          </div>
                      </div>
                      <button onClick={() => navigate('/analytics')} className="mt-8 w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-black hover:bg-slate-100 transition-all">التحليل التنبؤي العميق</button>
                  </div>
              </div>
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
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-brand-300 transition-all">
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <h4 className="text-2xl font-black text-slate-900">{value}</h4>
            </div>
            <div className={`p-4 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
        </div>
    );
};

export default Dashboard;
