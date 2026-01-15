
import React, { useMemo, useState, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AttendanceStatus, StoredLessonPlan, BehaviorIncident, FlippedLesson } from '../types';
import { 
    Users, CheckCircle, Target, TrendingUp,
    ShieldAlert, Activity, Heart, MessageSquare, ChevronLeft, BarChart3, Bot, Zap, ArrowUpCircle, Info, AlertTriangle, Clock, ListChecks
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { getLessonPlans, getBehaviorIncidents, getFlippedLessons } from '../services/storageService';
import TeacherStats from './TeacherStats';

const Dashboard: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null }> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();
  const [lessonPlans, setLessonPlans] = useState<StoredLessonPlan[]>([]);
  const [incidents, setIncidents] = useState<BehaviorIncident[]>([]);
  const [flippedLessons, setFlippedLessons] = useState<FlippedLesson[]>([]);

  useEffect(() => {
    if (currentUser?.id) {
        setLessonPlans(getLessonPlans(currentUser.id));
        setIncidents(getBehaviorIncidents(currentUser.id));
        setFlippedLessons(getFlippedLessons(currentUser.id));
    }
  }, [currentUser, students]);

  const stats = useMemo(() => {
      const attRate = attendance.length > 0 ? (attendance.filter(a => a.status === AttendanceStatus.PRESENT).length / attendance.length) * 100 : 0;
      const perfAvg = performance.length > 0 ? (performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length) * 100 : 0;
      
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

      return { attRate: Math.round(attRate), perfAvg: Math.round(perfAvg), distribution: ranges };
  }, [students, attendance, performance]);

  const latestFlipped = useMemo(() => {
    if (flippedLessons.length === 0) return null;
    const latest = flippedLessons[flippedLessons.length - 1];
    const classStudents = students.filter(s => s.className === latest.className);
    const rate = classStudents.length > 0 ? Math.round((latest.preparedStudentIds.length / classStudents.length) * 100) : 0;
    return { ...latest, rate, classCount: classStudents.length };
  }, [flippedLessons, students]);

  return (
    <div className="space-y-8 pb-10 animate-fade-in font-tajawal">
      {/* Welcome Hero */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col md:flex-row justify-between items-center shadow-xl gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-brand-500/5 -skew-x-12 translate-x-20"></div>
        <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-brand-500 rounded-3xl flex items-center justify-center text-white shadow-2xl">
                <LayoutGrid size={32}/>
            </div>
            <div className="text-right">
                <h1 className="text-3xl font-black text-slate-900">نظام المتابع الذكي</h1>
                <p className="text-slate-500 mt-1 font-bold">مرحباً بك، {currentUser?.name.split(' ')[0]} | أنت تدير {students.length} طالباً.</p>
            </div>
        </div>
        <div className="flex gap-3 relative z-10">
            <button onClick={() => navigate('/attendance')} className="px-6 py-3 bg-brand-500 text-white rounded-2xl text-xs font-black hover:bg-brand-600 transition-all shadow-lg flex items-center gap-2 active:scale-95">
                <CheckCircle size={18}/> رصد الحضور
            </button>
            <button onClick={() => navigate('/flipped')} className="px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl text-xs font-black border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center gap-2">
                <ArrowUpCircle size={18}/> الفصل المقلوب
            </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
           <KPIStat label="إجمالي الطلاب" value={students.length} icon={Users} color="blue" />
           <KPIStat label="الانضباط العام" value={`${stats.attRate}%`} icon={Activity} color="emerald" />
           <KPIStat label="متوسط الإتقان" value={`${stats.perfAvg}%`} icon={Target} color="amber" />
           <KPIStat label="جاهزية المقلوب" value={`${latestFlipped?.rate || 0}%`} icon={ListChecks} color="rose" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
              {/* Flipped Classroom Live Monitor */}
              {latestFlipped && (
                  <div className="bg-indigo-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl group cursor-pointer" onClick={() => navigate('/flipped')}>
                      <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 transition-transform group-hover:scale-110"><ArrowUpCircle size={200}/></div>
                      <div className="relative z-10">
                          <div className="flex justify-between items-start mb-10">
                              <div>
                                  <span className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest border border-white/10">نشاط الفصل المقلوب الجاري</span>
                                  <h3 className="text-2xl font-black mt-3">{latestFlipped.title}</h3>
                                  <p className="text-indigo-300 text-xs font-bold mt-1 uppercase tracking-widest">{latestFlipped.subject} • فصل {latestFlipped.className}</p>
                              </div>
                              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                                  <span className="text-2xl font-black">{latestFlipped.rate}%</span>
                              </div>
                          </div>
                          <div className="space-y-3">
                              <div className="flex justify-between text-xs font-bold text-indigo-200 mb-1">
                                  <span>جاهزية الطلاب</span>
                                  <span>{latestFlipped.preparedStudentIds.length} من {latestFlipped.classCount} طالب</span>
                              </div>
                              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-400 shadow-[0_0_15px_#818cf8] transition-all duration-1000" style={{ width: `${latestFlipped.rate}%` }}></div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                      <h3 className="font-black text-slate-800 text-xl flex items-center gap-2">توزيع مستويات الإتقان <BarChart3 size={22} className="text-brand-500"/></h3>
                      <button onClick={()=>navigate('/gradebook')} className="text-brand-600 text-xs font-bold hover:underline">السجل العام</button>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.distribution}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                            <YAxis hide domain={[0, 'dataMax + 2']} />
                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -3px rgb(0 0 0 / 0.1)'}} />
                            <Bar dataKey="count" radius={[12, 12, 0, 0]} barSize={50}>
                                {stats.distribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>

          {/* AI Insights & Alerts Sidebar */}
          <div className="flex flex-col gap-6">
              <div className="bg-slate-900 rounded-[3rem] p-8 text-white flex flex-col shadow-2xl relative overflow-hidden flex-1 border border-white/5">
                  <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Bot size={150}/></div>
                  <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-3 mb-6 justify-end">
                          <div className="text-right">
                            <h3 className="font-black text-lg">المساعد التربوي الذكي</h3>
                            <p className="text-[8px] text-indigo-400 uppercase font-black tracking-widest">Powered by Gemini AI</p>
                          </div>
                          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 backdrop-blur-md"><Bot size={24} className="text-indigo-400"/></div>
                      </div>
                      <div className="flex-1 text-right">
                          <div className="p-5 bg-white/5 rounded-3xl border border-white/5 text-xs text-indigo-100 leading-relaxed italic font-medium">
                            {latestFlipped && latestFlipped.rate < 50 ? 
                                `"معدل جاهزية الطلاب للدرس المقلوب منخفض. ربما يحتاجون لتذكير عبر بوابة أولياء الأمور قبل الحصة القادمة لرفع التفاعل."` :
                                `"استعداد مذهل! الفصل جاهز لنقاشات عميقة اليوم. ركز على تطبيقات التفكير العليا بدلاً من التلقين."`
                            }
                          </div>
                      </div>
                      <button onClick={() => navigate('/analytics')} className="mt-8 w-full py-4 bg-white text-slate-900 rounded-2xl text-xs font-black hover:bg-slate-100 transition-all shadow-xl active:scale-95">التحليلات التنبؤية</button>
                  </div>
              </div>

              <div className="bg-rose-50 p-6 rounded-[2.5rem] border border-rose-100 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-rose-700 font-black">
                      <AlertTriangle size={18}/>
                      <span className="text-sm">طلاب تحت الملاحظة (غياب)</span>
                  </div>
                  <div className="space-y-2">
                      {students.slice(0, 3).map(s => (
                        <div key={s.id} className="bg-white p-3 rounded-2xl border border-rose-100 flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700">{s.name.split(' ')[0]}</span>
                            <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">3 أيام غياب</span>
                        </div>
                      ))}
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
            <div className={`p-4 rounded-2xl ${colors[color].split(' ')[0]} ${colors[color].split(' ')[1]} group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
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
