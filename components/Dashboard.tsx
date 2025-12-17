
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, ScheduleItem, SystemUser, AcademicTerm, Exam, CurriculumUnit, CurriculumLesson } from '../types';
import { getSchedules, getExams, getAcademicTerms, getTeacherPeriodTimings, getCurriculumUnits, getCurriculumLessons, getExamResults } from '../services/storageService';
import { Users, Clock, Activity, CalendarDays, FileQuestion, Filter, CheckCircle, PieChart as PieIcon, AlertTriangle, MonitorPlay, BookOpen, MessageSquare, Check, X, ArrowRight, TrendingUp, Calendar, Timer, ScanLine, BrainCircuit, Table, GraduationCap, Award, Star, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
  onNavigate: (view: string) => void;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

const CurriculumProgressWidget: React.FC<{ currentUser?: SystemUser | null, onNavigate: (v: string) => void }> = ({ currentUser, onNavigate }) => {
    const [units, setUnits] = useState<CurriculumUnit[]>([]);
    const [lessons, setLessons] = useState<CurriculumLesson[]>([]);

    useEffect(() => {
        if (!currentUser) return;
        setUnits(getCurriculumUnits(currentUser.id));
        setLessons(getCurriculumLessons());
    }, [currentUser]);

    const stats = useMemo(() => {
        const subjects = Array.from(new Set(units.map(u => u.subject)));
        return subjects.map(sub => {
            const subUnits = units.filter(u => u.subject === sub);
            const unitIds = subUnits.map(u => u.id);
            const subLessons = lessons.filter(l => unitIds.includes(l.unitId));
            const completed = subLessons.filter(l => l.isCompleted).length;
            const total = subLessons.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return { subject: sub, completed, total, pct };
        });
    }, [units, lessons]);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><BookOpen size={18} className="text-teal-600"/> إنجاز المنهج الدراسي</span>
                <button onClick={() => onNavigate('CURRICULUM')} className="text-xs text-teal-600 hover:underline">توزيع المنهج</button>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                {stats.length > 0 ? stats.map(s => (
                    <div key={s.subject} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-gray-700 truncate w-32">{s.subject}</span>
                            <span className="font-mono text-teal-600">{s.pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-teal-500 h-full transition-all duration-500" style={{width: `${s.pct}%`}}></div>
                        </div>
                        <p className="text-[9px] text-gray-400 text-left">{s.completed} من {s.total} دروس</p>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center py-4">
                        <Plus size={24} className="mb-2 opacity-20"/>
                        <p className="text-xs">لم يتم رفع المنهج بعد</p>
                    </div>
                )}
            </div>
        </div>
    );
};

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

  const topPerformers = useMemo(() => {
      return students.map(s => {
          let sPerf = performance.filter(p => p.studentId === s.id);
          if (activeTerm) sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
          const score = sPerf.reduce((acc, p) => acc + (p.score / (p.maxScore || 10)), 0);
          const avg = sPerf.length > 0 ? (score / sPerf.length) * 100 : 0;
          
          let sAtt = attendance.filter(a => a.studentId === s.id);
          const attRate = sAtt.length > 0 ? (sAtt.filter(a => a.status === 'PRESENT').length / sAtt.length) * 100 : 100;

          const badges = [];
          if (attRate === 100 && sAtt.length > 10) badges.push({ icon: '🔥', label: 'مواظب' });
          if (avg >= 95) badges.push({ icon: '💎', label: 'عبقري' });
          if (attendance.filter(a => a.studentId === s.id && a.behaviorStatus === 'POSITIVE').length > 5) badges.push({ icon: '🌟', label: 'خلوق' });

          return { ...s, avg: Math.round(avg), badges };
      }).sort((a,b) => b.avg - a.avg).slice(0, 5);
  }, [students, performance, attendance, activeTerm]);

  return (
    <div className="space-y-6 animate-fade-in p-6 bg-gray-50/50 min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
              <h1 className="text-2xl font-black text-gray-800">مرحباً بك في المدرس الذكي</h1>
              <p className="text-gray-500 text-sm mt-1">نظرة سريعة على أهم مؤشرات الأداء لفصولك</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
              <Filter size={16} className="text-gray-400 ml-1"/>
              <select 
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="bg-transparent text-sm font-bold outline-none text-purple-700 min-w-[150px]"
              >
                  <option value="">كل الفترات</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between group shadow-sm">
              <div><p className="text-gray-400 text-[10px] font-bold uppercase mb-1">الطلاب</p><h3 className="text-3xl font-black text-gray-800">{stats.totalStudents}</h3></div>
              <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Users size={24}/></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
              <div><p className="text-gray-400 text-[10px] font-bold uppercase mb-1">حضور اليوم</p><h3 className="text-3xl font-black text-green-600">{stats.attendanceData.length > 0 ? stats.attendanceRate + '%' : '-'}</h3></div>
              <div className="bg-green-50 p-3 rounded-xl text-green-600"><Clock size={24}/></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
              <div><p className="text-gray-400 text-[10px] font-bold uppercase mb-1">متوسط التحصيل</p><h3 className="text-3xl font-black text-blue-600">{stats.avgScore}%</h3></div>
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><GraduationCap size={24}/></div>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-5 rounded-2xl shadow-lg flex items-center justify-between text-white cursor-pointer" onClick={() => onNavigate('AI_REPORTS')}>
              <div><p className="text-indigo-100 text-[10px] font-bold uppercase mb-1">الذكاء الاصطناعي</p><h3 className="text-lg font-bold">تقارير AI</h3></div>
              <div className="bg-white/20 p-3 rounded-xl"><BrainCircuit size={24}/></div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-80"><CurriculumProgressWidget currentUser={currentUser} onNavigate={onNavigate}/></div>
          <div className="lg:col-span-1 h-80">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm"><Award size={18} className="text-orange-500"/> متميزو الأسبوع</h3>
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                    {topPerformers.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100 group hover:bg-indigo-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-xs text-indigo-600 shadow-sm">{s.name.charAt(0)}</div>
                                <div>
                                    <span className="text-xs font-bold text-gray-800 block">{s.name}</span>
                                    <div className="flex gap-1 mt-1">
                                        {s.badges.map((b,i)=><span key={i} title={b.label} className="cursor-help">{b.icon}</span>)}
                                    </div>
                                </div>
                            </div>
                            <span className="text-xs font-black text-indigo-700">{s.avg}%</span>
                        </div>
                    ))}
                  </div>
              </div>
          </div>
          <div className="lg:col-span-1 h-80">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2 text-sm"><PieIcon size={18} className="text-red-500"/> ملخص الغياب</h3>
                  <div className="flex-1 relative">
                    {stats.attendanceData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={stats.attendanceData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                    <Cell fill="#10b981" /><Cell fill="#ef4444" />
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-gray-300 text-xs italic">لا توجد بيانات حضور لليوم</div>}
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
