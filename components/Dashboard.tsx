
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, ScheduleItem, SystemUser, AcademicTerm, Exam, CurriculumUnit, CurriculumLesson } from '../types';
import { getSchedules, getExams, getAcademicTerms, getTeacherPeriodTimings, getCurriculumUnits, getCurriculumLessons, getExamResults } from '../services/storageService';
import { Users, Clock, Activity, CalendarDays, FileQuestion, Filter, CheckCircle, PieChart as PieIcon, AlertTriangle, MonitorPlay, BookOpen, MessageSquare, Check, X, ArrowRight, TrendingUp, Calendar, Timer, ScanLine, BrainCircuit, Table, GraduationCap, Award, Star, Plus, BellRing, Sparkles, Siren, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
  onNavigate: (view: string) => void;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

const Dashboard: React.FC<DashboardProps> = ({ students, attendance, performance, currentUser, onNavigate }) => {
  const navigate = useNavigate();
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  useEffect(() => {
      const loadedTerms = getAcademicTerms(currentUser?.id);
      setTerms(loadedTerms);
      const active = loadedTerms.find(t => t.isCurrent) || (loadedTerms.length > 0 ? loadedTerms[0] : null);
      if (active) setSelectedTermId(active.id);
  }, [currentUser]);

  const activeTerm = terms.find(t => t.id === selectedTermId);

  // --- NEW: Smart Alerts Logic ---
  const smartAlerts = useMemo(() => {
      const alerts = [];
      const today = new Date().toISOString().split('T')[0];

      // 1. Pending Excuses Alert (NEW)
      const pendingExcuses = attendance.filter(a => a.excuseNote && a.status === AttendanceStatus.ABSENT);
      if (pendingExcuses.length > 0) {
          alerts.push({ id: 'pending-excuses', type: 'INFO', msg: `لديك ${pendingExcuses.length} أعذار غياب جديدة تحتاج لمراجعة.`, icon: <Mail size={14}/>, color: 'bg-indigo-50 text-indigo-700 border-indigo-100', action: () => navigate('/inbox') });
      }

      // 2. Critical Attendance Alert
      students.forEach(s => {
          const sAtt = attendance.filter(a => a.studentId === s.id).sort((a,b) => b.date.localeCompare(a.date));
          const last3 = sAtt.slice(0, 3);
          if (last3.length === 3 && last3.every(a => a.status === 'ABSENT')) {
              alerts.push({ id: `att-${s.id}`, type: 'CRITICAL', msg: `الطالب ${s.name} غائب لليوم الثالث على التوالي.`, icon: <Siren size={14}/>, color: 'bg-red-50 text-red-700 border-red-100', action: () => navigate('/followup', { state: { studentId: s.id } }) });
          }
      });

      // 3. Performance Improvement Alert
      students.forEach(s => {
          const sPerf = performance.filter(p => p.studentId === s.id).sort((a,b) => a.date.localeCompare(b.date));
          if (sPerf.length >= 2) {
              const last = (sPerf[sPerf.length-1].score / sPerf[sPerf.length-1].maxScore) * 100;
              const prev = (sPerf[sPerf.length-2].score / sPerf[sPerf.length-2].maxScore) * 100;
              if (last - prev >= 20) {
                  alerts.push({ id: `perf-${s.id}`, type: 'POSITIVE', msg: `تحسن ملحوظ (+${Math.round(last-prev)}%) في مستوى الطالب ${s.name}.`, icon: <Sparkles size={14}/>, color: 'bg-emerald-50 text-emerald-700 border-emerald-100', action: () => navigate('/followup', { state: { studentId: s.id } }) });
              }
          }
      });

      return alerts.slice(0, 4);
  }, [students, attendance, performance, navigate]);

  const stats = useMemo(() => {
    const totalStudents = students ? students.length : 0;
    const today = new Date().toISOString().split('T')[0];
    const todaysAttendance = attendance ? attendance.filter(a => a.date === today) : [];
    const present = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const absent = todaysAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const attendanceRate = totalStudents > 0 && todaysAttendance.length > 0 ? Math.round((present / totalStudents) * 100) : 0;

    let filteredPerf = performance || [];
    if (activeTerm) filteredPerf = filteredPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
    const totalScore = filteredPerf.reduce((acc, curr) => acc + (curr.score / (curr.maxScore || 10)), 0);
    const avgScore = filteredPerf.length > 0 ? Math.round((totalScore / filteredPerf.length) * 100) : 0;

    const attendanceData = todaysAttendance.length > 0 ? [
        { name: 'حاضر', value: present },
        { name: 'غائب', value: absent },
    ] : [];

    return { totalStudents, present, absent, attendanceRate, avgScore, attendanceData };
  }, [students, attendance, performance, activeTerm]);

  return (
    <div className="space-y-6 animate-fade-in p-6 bg-gray-50/50 min-h-full">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
              <h1 className="text-2xl font-black text-gray-800">مرحباً بك، {currentUser?.name.split(' ')[0]}</h1>
              <p className="text-gray-500 text-sm mt-1">إليك ملخص سريع لأداء طلابك وفصولك اليوم.</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
              <Filter size={16} className="text-gray-400 ml-1"/>
              <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)} className="bg-transparent text-sm font-bold outline-none text-purple-700 min-w-[150px]">
                  <option value="">كل الفترات</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
          </div>
      </div>

      {/* Smart Insights Feed */}
      {smartAlerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up">
              {smartAlerts.map(alert => (
                  <div key={alert.id} onClick={alert.action} className={`${alert.color} px-4 py-3 rounded-2xl border flex items-center gap-3 shadow-sm group hover:scale-[1.02] transition-all cursor-pointer`}>
                      <div className="shrink-0 p-1.5 bg-white/50 rounded-lg">{alert.icon}</div>
                      <p className="text-[10px] font-bold leading-tight flex-1">{alert.msg}</p>
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                  </div>
              ))}
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="الطلاب" value={stats.totalStudents} icon={<Users size={24}/>} color="bg-indigo-50 text-indigo-600" />
          <StatCard label="حضور اليوم" value={stats.attendanceData.length > 0 ? stats.attendanceRate + '%' : '-'} icon={<Clock size={24}/>} color="bg-green-50 text-green-600" />
          <StatCard label="المعدل الدراسي" value={stats.avgScore + '%'} icon={<GraduationCap size={24}/>} color="bg-blue-50 text-blue-600" />
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-5 rounded-2xl shadow-lg flex items-center justify-between text-white cursor-pointer hover:shadow-purple-200 transition-all" onClick={() => navigate('/followup')}>
              <div><p className="text-indigo-100 text-[10px] font-bold uppercase mb-1">التقارير الذكية</p><h3 className="text-lg font-bold">ملفات المتابعة</h3></div>
              <div className="bg-white/20 p-3 rounded-xl"><BrainCircuit size={24}/></div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Activity size={18} className="text-indigo-600"/> تحليل الحضور الشهري</h3>
                   <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={attendance.slice(-30).map(a => ({ date: a.date.slice(5), count: 1 }))}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} />
                        </AreaChart>
                   </ResponsiveContainer>
              </div>
          </div>
          <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><PieIcon size={18} className="text-red-500"/> نسب الحضور والغياب</h3>
                  <div className="flex-1">
                    {stats.attendanceData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stats.attendanceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    <Cell fill="#10b981" /><Cell fill="#ef4444" />
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-gray-300 text-xs italic">لا توجد بيانات لليوم</div>}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: any) => (
    <div className={`bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm group hover:border-indigo-200 transition-colors`}>
        <div>
            <p className="text-gray-400 text-[10px] font-bold uppercase mb-1">{label}</p>
            <h3 className="text-3xl font-black text-gray-800">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    </div>
);

export default Dashboard;
