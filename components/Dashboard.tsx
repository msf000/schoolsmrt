
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, ScheduleItem, SystemUser, AcademicTerm } from '../types';
import { getSchedules, getAcademicTerms } from '../services/storageService';
import { generateDailyBriefing } from '../services/geminiService';
import { Users, Clock, Activity, CalendarDays, FileQuestion, Filter, CheckCircle, PieChart as PieIcon, AlertTriangle, BrainCircuit, GraduationCap, ArrowRight, Sparkles, Siren, Mail, Bot, Loader2 } from 'lucide-react';
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
      
      // Load AI Brief
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
          setAiBrief("أهلاً بك! ركز اليوم على تحفيز الطلاب ومتابعة تقدمهم الأكاديمي. بالتوفيق!");
      } finally {
          setIsAiLoading(false);
      }
  };

  const activeTerm = terms.find(t => t.id === selectedTermId);

  const stats = useMemo(() => {
    const totalStudents = students ? students.length : 0;
    const today = new Date().toISOString().split('T')[0];
    const todaysAttendance = attendance ? attendance.filter(a => a.date === today) : [];
    const present = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const absent = todaysAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const attendanceRate = totalStudents > 0 && todaysAttendance.length > 0 ? Math.round((present / totalStudents) * 100) : 100;

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
    <div className="space-y-6 animate-fade-in p-6 bg-gray-50/50 min-h-full pb-24">
      {/* Smart AI Briefing Section */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="الطلاب" value={stats.totalStudents} icon={<Users size={24}/>} color="bg-indigo-50 text-indigo-600" />
          <StatCard label="حضور اليوم" value={stats.attendanceRate + '%'} icon={<Clock size={24}/>} color="bg-green-50 text-green-600" />
          <StatCard label="المعدل الدراسي" value={stats.avgScore + '%'} icon={<GraduationCap size={24}/>} color="bg-blue-50 text-blue-600" />
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-5 rounded-2xl shadow-lg flex items-center justify-between text-white cursor-pointer hover:shadow-purple-200 transition-all" onClick={() => navigate('/followup')}>
              <div><p className="text-indigo-100 text-[10px] font-bold uppercase mb-1">التقارير الذكية</p><h3 className="text-lg font-bold">ملفات المتابعة</h3></div>
              <div className="bg-white/20 p-3 rounded-xl"><BrainCircuit size={24}/></div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Activity size={18} className="text-indigo-600"/> تحليل الحضور الأخير</h3>
                    <select value={selectedTermId} onChange={(e) => setSelectedTermId(e.target.value)} className="text-xs font-bold border-none bg-gray-50 p-1 rounded outline-none">
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                   <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={attendance.slice(-30).map(a => ({ date: a.date.slice(5), count: a.status === 'PRESENT' ? 1 : 0 }))}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" hide />
                            <YAxis hide />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.1} />
                        </AreaChart>
                   </ResponsiveContainer>
              </div>
          </div>
          <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><PieIcon size={18} className="text-red-500"/> توزيع الحضور اليوم</h3>
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
                    ) : <div className="flex items-center justify-center h-full text-gray-300 text-xs italic">بانتظار رصد حضور اليوم</div>}
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
