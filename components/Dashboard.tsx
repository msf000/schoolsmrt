
import React, { useMemo, useState, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AttendanceStatus, StoredLessonPlan, BehaviorIncident } from '../types';
import { 
    Users, CheckCircle, Target, TrendingUp,
    ShieldAlert, Activity, Heart, MessageSquare, ChevronLeft, BarChart3, Bot, Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { getLessonPlans, getBehaviorIncidents } from '../services/storageService';
import { calculateClassHealth } from '../services/analysisService';
import TeacherStats from './TeacherStats';

const Dashboard: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null }> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();
  const [lessonPlans, setLessonPlans] = useState<StoredLessonPlan[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<BehaviorIncident[]>([]);

  const classStats = useMemo(() => {
      const total = students.length;
      const attRate = attendance.length > 0 ? (attendance.filter(a => a.status === AttendanceStatus.PRESENT).length / attendance.length) * 100 : 0;
      const perfAvg = performance.length > 0 ? (performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length) * 100 : 0;
      
      // حساب مؤشر الصحة للفصل
      const health = calculateClassHealth('عام', students, attendance, performance);
      
      const ranges = [
          { name: 'ممتاز', min: 90, count: 0, color: '#10b981' },
          { name: 'جيد جداً', min: 80, count: 0, color: '#3b82f6' },
          { name: 'جيد', min: 70, count: 0, color: '#f59e0b' },
          { name: 'مقبول', min: 60, count: 0, color: '#f97316' },
          { name: 'تعثر', min: 0, count: 0, color: '#ef4444' }
      ];

      students.forEach(s => {
          const sP = performance.filter(p => p.studentId === s.id);
          if (sP.length > 0) {
              const avg = (sP.reduce((a,b) => a + (b.score/b.maxScore), 0) / sP.length) * 100;
              const range = ranges.find(r => avg >= r.min);
              if (range) range.count++;
          }
      });

      return { total, attRate: Math.round(attRate), perfAvg: Math.round(perfAvg), health, distribution: ranges };
  }, [students, attendance, performance]);

  useEffect(() => {
    if (currentUser?.id) {
        setLessonPlans(getLessonPlans(currentUser.id));
        setRecentIncidents(getBehaviorIncidents(currentUser.id).slice(0, 5));
    }
  }, [currentUser, students]);

  return (
    <div className="space-y-8 pb-10 animate-fade-in font-tajawal">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col md:flex-row justify-between items-center shadow-xl gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-brand-500/5 -skew-x-12 translate-x-20"></div>
        <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-2xl">
                <ShieldAlert size={32}/>
            </div>
            <div className="text-right">
                <h1 className="text-3xl font-black text-slate-900">نظام المتابع الذكي</h1>
                <p className="text-slate-500 mt-1 font-bold italic">مرحباً بك، {currentUser?.name.split(' ')[0]} | أنت تدير {students.length} طالباً حالياً.</p>
            </div>
        </div>
        <div className="flex gap-3 relative z-10">
            <button onClick={() => navigate('/attendance')} className="px-8 py-4 bg-brand-500 text-white rounded-2xl text-sm font-black hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/20 flex items-center gap-2 active:scale-95">
                <CheckCircle size={20}/> رصد الحضور الآن
            </button>
            <button onClick={() => navigate('/lab')} className="px-8 py-4 bg-indigo-50 text-indigo-700 rounded-2xl text-sm font-black border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center gap-2">
                <Zap size={20}/> مختبر الذكاء
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <KPIStat label="إجمالي الطلاب" value={classStats.total} icon={Users} color="blue" />
           <KPIStat label="الانضباط العام" value={`${classStats.attRate}%`} icon={Activity} color="emerald" />
           <KPIStat label="متوسط الإتقان" value={`${classStats.perfAvg}%`} icon={Target} color="amber" />
           <KPIStat label="صحة الفصل" value={`${classStats.health}%`} icon={Heart} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col h-[480px]">
                  <div className="flex justify-between items-center mb-8 px-2">
                      <button onClick={()=>navigate('/reports')} className="text-xs font-black text-brand-600 hover:underline flex items-center gap-1"><ChevronLeft size={14}/> التقارير التفصيلية</button>
                      <div className="text-right">
                        <h3 className="font-black text-slate-800 text-xl flex items-center gap-2 justify-end">توزيع مستويات الإتقان <BarChart3 size={22} className="text-brand-500"/></h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Class Achievement Distribution</p>
                      </div>
                  </div>
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={classStats.distribution}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                            <YAxis hide domain={[0, 'dataMax + 2']} />
                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -3px rgb(0 0 0 / 0.1)'}} />
                            <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={50}>
                                {classStats.distribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              <TeacherStats 
                students={students} 
                performance={performance} 
                attendance={attendance} 
                plans={lessonPlans} 
              />
          </div>

          <div className="flex flex-col gap-6">
              <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden shrink-0 h-[300px] group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 group-hover:scale-110 transition-transform duration-700"><Activity size={180}/></div>
                  <div className="relative z-10 flex flex-col h-full">
                    <h3 className="text-xl font-black flex items-center gap-3 mb-6 justify-end">آخر النشاطات الصفيّة <MessageSquare size={24} className="text-yellow-400"/></h3>
                    <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
                        {recentIncidents.length > 0 ? recentIncidents.map((incident, i) => {
                            const student = students.find(s => s.id === incident.studentId);
                            return (
                                <div key={i} className="flex justify-between items-center bg-white/10 p-3 rounded-2xl border border-white/5 backdrop-blur-sm">
                                    <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${incident.points > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-500 text-white shadow-lg'}`}>
                                        {incident.points > 0 ? '+' : ''}{incident.points}
                                    </div>
                                    <div className="flex items-center gap-3 text-right">
                                        <div>
                                            <p className="text-xs font-black truncate max-w-[100px]">{student?.name.split(' ')[0]}</p>
                                            <p className="text-[8px] opacity-60">{incident.category}</p>
                                        </div>
                                        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center font-black text-xs">{student?.name.charAt(0)}</div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                                <p className="text-xs font-bold italic">لا توجد نشاطات مؤخرة...</p>
                            </div>
                        )}
                    </div>
                  </div>
              </div>

              <div className="bg-slate-900 rounded-[3rem] p-8 text-white flex flex-col shadow-2xl relative overflow-hidden flex-1 border border-white/5 min-h-[350px]">
                  <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Bot size={150}/></div>
                  <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-6 justify-end">
                          <div className="text-right">
                            <h3 className="font-black text-lg">مستشار الفصل الذكي</h3>
                            <p className="text-[8px] text-indigo-400 uppercase font-black tracking-widest">AI Cognitive Assistant</p>
                          </div>
                          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 backdrop-blur-md"><Bot size={24} className="text-indigo-400"/></div>
                      </div>
                      <div className="flex-1 text-right">
                          <div className="p-5 bg-white/5 rounded-3xl border border-white/5 text-xs text-indigo-100 leading-relaxed italic font-medium">
                            {classStats.health < 70 ? 
                                `"مؤشر صحة الفصل منخفض قليلاً؛ نوصي بإطلاق تحدي 'أسبوع بلا غياب' لرفع مستوى الانضباط فوراً."` :
                                `"أداء الفصل استثنائي اليوم! هناك طلاب جاهزون للترقية لمستوى 'الخبير'، هل ترغب في تكريمهم بلقب شرفي؟"`
                            }
                          </div>
                      </div>
                      <button onClick={() => navigate('/analytics')} className="mt-8 w-full py-4 bg-white text-slate-900 rounded-2xl text-xs font-black hover:bg-slate-100 transition-all shadow-xl active:scale-95">الرؤى التنبؤية المتقدمة</button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

const KPIStat = ({ label, value, icon: Icon, color }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100'
    };
    return (
        <div className={`bg-white p-8 rounded-[2.5rem] border-2 shadow-sm flex items-center justify-between group hover:shadow-xl transition-all duration-300 ${colors[color].split(' ')[2]}`}>
            <div className="p-4 rounded-2xl ${colors[color].split(' ')[0]} ${colors[color].split(' ')[1]} group-hover:scale-110 transition-transform duration-500 shadow-inner">
                <Icon size={28} />
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
                <h4 className="text-3xl font-black text-slate-900">{value}</h4>
            </div>
        </div>
    );
};

export default Dashboard;
