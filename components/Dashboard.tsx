
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, ScheduleItem, SystemUser, AcademicTerm, Exam } from '../types';
import { getSchedules, getExams, getAcademicTerms, getTeacherPeriodTimings, getWeeklyPlans, getLessonPlans, getExamResults } from '../services/storageService';
import { Users, Clock, Activity, CalendarDays, FileQuestion, Filter, CheckCircle, PieChart as PieIcon, AlertTriangle, MonitorPlay, BookOpen, MessageSquare, Check, X, ArrowRight, TrendingUp, Calendar, Timer, ScanLine, BrainCircuit, Table } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  selectedDate?: string;
  currentUser?: SystemUser | null;
  onNavigate: (view: string) => void;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6']; // Green, Red, Amber, Blue

// --- Widgets ---

const ActiveExamsWidget: React.FC<{ currentUser?: SystemUser | null, onNavigate: (v: string) => void }> = ({ currentUser, onNavigate }) => {
    const [activeExams, setActiveExams] = useState<Exam[]>([]);
    const [examStats, setExamStats] = useState<Record<string, number>>({});

    useEffect(() => {
        if (!currentUser) return;
        const allExams = getExams(currentUser.id);
        const active = allExams.filter(e => e.isActive);
        setActiveExams(active);

        const stats: Record<string, number> = {};
        active.forEach(exam => {
            const results = getExamResults(exam.id);
            stats[exam.id] = results.length;
        });
        setExamStats(stats);
    }, [currentUser]);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><FileQuestion size={18} className="text-purple-600"/> الاختبارات النشطة</span>
                <button onClick={() => onNavigate('EXAMS_MANAGER')} className="text-xs text-purple-600 hover:underline flex items-center gap-1">إدارة <ArrowRight size={10}/></button>
            </h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 max-h-40">
                {activeExams.length > 0 ? activeExams.map(exam => (
                    <div key={exam.id} className="p-3 bg-purple-50 rounded-lg border border-purple-100 flex justify-between items-center group cursor-pointer hover:bg-purple-100 transition-colors" onClick={() => onNavigate('EXAMS_MANAGER')}>
                        <div>
                            <span className="font-bold text-xs text-purple-900 block">{exam.title}</span>
                            <span className="text-[10px] text-purple-600">{exam.gradeLevel}</span>
                        </div>
                        <div className="text-center bg-white px-2 py-1 rounded border border-purple-100">
                            <span className="block text-lg font-black text-purple-700 leading-none">{examStats[exam.id] || 0}</span>
                            <span className="text-[8px] text-gray-400 font-bold uppercase">تسليم</span>
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-4">
                        <CheckCircle size={24} className="mb-2 text-green-200"/>
                        <p className="text-xs">لا توجد اختبارات نشطة حالياً</p>
                        <button onClick={() => onNavigate('EXAMS_MANAGER')} className="mt-2 text-[10px] bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-gray-600 font-bold transition-colors">إنشاء اختبار</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const ScheduleTimeline: React.FC<{ currentUser?: SystemUser | null, onNavigate: (v: string) => void }> = ({ currentUser, onNavigate }) => {
    const [timeline, setTimeline] = useState<{period: number, time: string, session: ScheduleItem | null, status: 'DONE'|'NOW'|'NEXT'}[]>([]);

    useEffect(() => {
        if(!currentUser) return;
        const timings = getTeacherPeriodTimings(currentUser.id);
        const schedules = getSchedules().filter(s => s.teacherId === currentUser.id);
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const dailyTimeline = timings.map((t, idx) => {
            const period = idx + 1;
            const session = schedules.find(s => s.day === today && s.period === period) || null;
            
            const [startStr, endStr] = t.split(' - ');
            const [sh, sm] = startStr.split(':').map(Number);
            const [eh, em] = endStr.split(':').map(Number);
            const startVal = sh * 60 + sm;
            const endVal = eh < sh ? (eh + 12) * 60 + em : eh * 60 + em;

            let status: 'DONE' | 'NOW' | 'NEXT' = 'NEXT';
            if (currentTime > endVal) status = 'DONE';
            else if (currentTime >= startVal && currentTime <= endVal) status = 'NOW';

            return { period, time: t, session, status };
        });

        setTimeline(dailyTimeline);
    }, [currentUser]);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><CalendarDays size={18} className="text-teal-600"/> جدول اليوم</span>
                <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded">{new Date().toLocaleDateString('ar-SA', {weekday: 'long'})}</span>
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-2">
                <div className="absolute top-2 bottom-2 right-1.5 w-0.5 bg-gray-100"></div>
                <div className="space-y-3">
                    {timeline.map((item) => (
                        <div key={item.period} className="relative flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full border-2 z-10 shrink-0 ${item.status === 'DONE' ? 'bg-gray-300 border-gray-300' : item.status === 'NOW' ? 'bg-teal-500 border-teal-200 animate-pulse' : 'bg-white border-teal-500'}`}></div>
                            <div className={`flex-1 p-2 rounded-lg border flex justify-between items-center transition-all ${item.status === 'NOW' ? 'bg-teal-50 border-teal-200 shadow-sm' : item.status === 'DONE' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'}`}>
                                <div>
                                    <span className={`text-[10px] font-bold block ${item.status === 'NOW' ? 'text-teal-700' : 'text-gray-400'}`}>حصة {item.period} <span className="font-mono font-normal opacity-70">({item.time})</span></span>
                                    {item.session ? (
                                        <span className="font-bold text-xs text-gray-800">{item.session.classId} - {item.session.subjectName}</span>
                                    ) : <span className="text-[10px] text-gray-400 italic">فراغ</span>}
                                </div>
                                {item.session && item.status === 'NOW' && (
                                    <button onClick={() => onNavigate('CLASSROOM_MANAGEMENT')} className="bg-teal-600 text-white p-1.5 rounded-full hover:bg-teal-700"><MonitorPlay size={14}/></button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ExcusesWidget: React.FC<{ students: Student[], attendance: AttendanceRecord[] }> = ({ students, attendance }) => {
    const [pendingExcuses, setPendingExcuses] = useState<AttendanceRecord[]>([]);

    useEffect(() => {
        // Find records with excuseNote but status is still ABSENT or LATE (not yet EXCUSED)
        const pending = attendance.filter(a => 
            a.excuseNote && 
            (a.status === AttendanceStatus.ABSENT || a.status === AttendanceStatus.LATE)
        );
        setPendingExcuses(pending);
    }, [attendance]);

    const handleAcceptExcuse = (record: AttendanceRecord) => {
        // Logic handled in parent or context usually, but for widget we might need a callback
        // For visual demo, we just filter it out locally
        setPendingExcuses(prev => prev.filter(p => p.id !== record.id));
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                <MessageSquare size={18} className="text-indigo-600"/> أعذار معلقة ({pendingExcuses.length})
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar max-h-40">
                {pendingExcuses.length > 0 ? pendingExcuses.map(excuse => {
                    const student = students.find(s => s.id === excuse.studentId);
                    return (
                        <div key={excuse.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-xs text-blue-900">{student?.name}</span>
                                <span className="text-[10px] text-gray-500">{excuse.date}</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-2 bg-white p-1 rounded border border-blue-50 line-clamp-2">
                                "{excuse.excuseNote}"
                            </p>
                            <button onClick={() => handleAcceptExcuse(excuse)} className="w-full bg-blue-600 text-white py-1 rounded text-[10px] font-bold hover:bg-blue-700 flex items-center justify-center gap-1">
                                <ArrowRight size={10}/> مراجعة في السجل
                            </button>
                        </div>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <CheckCircle size={24} className="mb-2 text-green-200"/>
                        <p className="text-xs">لا توجد أعذار جديدة</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AtRiskWidget: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], onStudentClick: (id: string) => void }> = ({ students, attendance, performance, onStudentClick }) => {
    const riskyStudents = useMemo(() => {
        if (!students || students.length === 0) return [];
        
        return students.map(s => {
            const sAtt = attendance.filter(a => a.studentId === s.id);
            const sPerf = performance.filter(p => p.studentId === s.id);
            
            const totalDays = sAtt.length;
            const absent = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
            const absenceRate = totalDays > 0 ? (absent / totalDays) * 100 : 0;

            const totalScore = sPerf.reduce((acc, curr) => acc + (curr.score / (curr.maxScore || 10)), 0);
            const avgScore = sPerf.length > 0 ? (totalScore / sPerf.length) * 100 : 100;

            const risks = [];
            if (absenceRate > 15) risks.push('غياب');
            if (avgScore < 50 && sPerf.length > 0) risks.push('أكاديمي');

            return { ...s, risks, absenceRate, avgScore };
        }).filter(s => s.risks.length > 0).slice(0, 5); // Limit to 5
    }, [students, attendance, performance]);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
                <AlertTriangle size={18} className="text-red-500"/> طلاب بحاجة لمتابعة
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                {riskyStudents.length > 0 ? riskyStudents.map(s => (
                    <div 
                        key={s.id} 
                        onClick={() => onStudentClick(s.id)}
                        className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100 transition-colors"
                    >
                        <div>
                            <span className="font-bold text-xs text-gray-800 block truncate w-24">{s.name}</span>
                            <span className="text-[9px] text-gray-500">{s.className}</span>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            {s.risks.includes('غياب') && <span className="text-[9px] bg-white text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-bold whitespace-nowrap">غياب {Math.round(s.absenceRate)}%</span>}
                            {s.risks.includes('أكاديمي') && <span className="text-[9px] bg-white text-orange-600 px-1.5 py-0.5 rounded border border-orange-200 font-bold whitespace-nowrap">معدل {Math.round(s.avgScore)}%</span>}
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-6">
                        <CheckCircle size={24} className="mb-2 text-green-200"/>
                        <p className="text-xs">الوضع ممتاز! لا يوجد طلاب في خطر.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ students, attendance, performance, selectedDate, currentUser, onNavigate }) => {
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

  // --- Statistics Calculation ---
  const stats = useMemo(() => {
    const totalStudents = students ? students.length : 0;
    // Today's Attendance
    const today = new Date().toISOString().split('T')[0];
    const todaysAttendance = attendance ? attendance.filter(a => a.date === today) : [];
    const present = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const absent = todaysAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const attendanceRate = totalStudents > 0 && todaysAttendance.length > 0 ? Math.round((present / totalStudents) * 100) : 0;

    // Performance (Term Based)
    let filteredPerf = performance || [];
    if (activeTerm) {
        filteredPerf = filteredPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
    }
    const totalScore = filteredPerf.reduce((acc, curr) => acc + (curr.score / (curr.maxScore || 10)), 0);
    const avgScore = filteredPerf.length > 0 ? Math.round((totalScore / filteredPerf.length) * 100) : 0;

    const attendanceData = [
        { name: 'حاضر', value: present > 0 ? present : 1 },
        { name: 'غائب', value: absent },
    ];

    if (todaysAttendance.length === 0) {
        return { totalStudents, present: 0, absent: 0, attendanceRate: 0, avgScore, attendanceData: [] };
    }

    return { totalStudents, present, absent, attendanceRate, avgScore, attendanceData };
  }, [students, attendance, performance, activeTerm]);

  // --- Top Students ---
  const topStudents = useMemo(() => {
      if (!students || students.length === 0) return [];
      
      return students.map(s => {
          let sPerf = performance ? performance.filter(p => p.studentId === s.id) : [];
          if (activeTerm) sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
          
          if (sPerf.length === 0) return { ...s, avg: 0 };

          const score = sPerf.reduce((acc, p) => acc + (p.score / (p.maxScore || 10)), 0);
          const avg = (score / sPerf.length) * 100;
          return { ...s, avg: Math.round(avg) };
      })
      .sort((a,b) => b.avg - a.avg)
      .slice(0, 5)
      .filter(s => s.avg > 0);
  }, [students, performance, activeTerm]);

  const handleRiskClick = (studentId: string) => {
      navigate('/followup', { state: { studentId } });
  };

  return (
    <div className="space-y-6 animate-fade-in p-6 bg-gray-50/50 min-h-full">
      
      {/* Header & Quick Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
              <h1 className="text-2xl font-black text-gray-800">لوحة المتابعة اليومية</h1>
              <p className="text-gray-500 text-sm mt-1">نظرة شاملة على أداء وحضور الطلاب</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm w-full md:w-auto">
              <Filter size={16} className="text-gray-400 mr-1 ml-1"/>
              <select 
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="bg-transparent text-sm font-bold outline-none text-purple-700 flex-1 md:min-w-[150px]"
              >
                  <option value="">كل الفترات</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
          </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
              <div>
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">إجمالي الطلاب</p>
                  <h3 className="text-3xl font-black text-gray-800">{stats.totalStudents}</h3>
              </div>
              <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                  <Users size={24}/>
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
              <div>
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">حضور اليوم</p>
                  <div className="flex items-end gap-2">
                      <h3 className="text-3xl font-black text-gray-800">{stats.attendanceData.length > 0 ? stats.attendanceRate + '%' : '-'}</h3>
                      {stats.attendanceData.length > 0 && <span className="text-xs text-red-500 font-bold mb-1.5 bg-red-50 px-1 rounded">{stats.absent} غياب</span>}
                  </div>
              </div>
              <div className="bg-green-50 p-3 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                  <Clock size={24}/>
              </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
              <div>
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">متوسط التحصيل</p>
                  <h3 className="text-3xl font-black text-gray-800">{stats.avgScore}%</h3>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
                  <Activity size={24}/>
              </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 rounded-2xl shadow-lg flex items-center justify-between text-white cursor-pointer hover:shadow-xl transition-all" onClick={() => onNavigate('AI_REPORTS')}>
              <div>
                  <p className="text-indigo-100 text-xs font-bold uppercase mb-1">مركز التقارير</p>
                  <h3 className="text-lg font-bold">التقارير الشاملة</h3>
                  <p className="text-[10px] text-indigo-200 mt-1">حضور، سلوك، ومستوى</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <FileQuestion size={24}/>
              </div>
          </div>
      </div>

      {/* --- NEW: Quick Actions Section --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div onClick={() => onNavigate('WORKS_TRACKING')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center gap-3">
              <div className="bg-purple-50 p-3 rounded-lg text-purple-600 group-hover:scale-110 transition-transform"><Table size={20}/></div>
              <div>
                  <h4 className="font-bold text-gray-800">رصد الدرجات</h4>
                  <p className="text-xs text-gray-500">كشف المتابعة والدرجات</p>
              </div>
          </div>
          <div onClick={() => onNavigate('AI_TOOLS')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center gap-3">
              <div className="bg-teal-50 p-3 rounded-lg text-teal-600 group-hover:scale-110 transition-transform"><BrainCircuit size={20}/></div>
              <div>
                  <h4 className="font-bold text-gray-800">الأدوات الذكية (AI)</h4>
                  <p className="text-xs text-gray-500">تحضير، اختبارات، خطط</p>
              </div>
          </div>
          <div onClick={() => onNavigate('AUTO_GRADING')} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center gap-3">
              <div className="bg-orange-50 p-3 rounded-lg text-orange-600 group-hover:scale-110 transition-transform"><ScanLine size={20}/></div>
              <div>
                  <h4 className="font-bold text-gray-800">المصحح الآلي</h4>
                  <p className="text-xs text-gray-500">تصحيح الأوراق بالكاميرا</p>
              </div>
          </div>
      </div>

      {/* Middle Section: Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* 1. Schedule Timeline (New Replacement for Current Session) */}
          <div className="lg:col-span-1 h-80 lg:h-auto">
              <ScheduleTimeline currentUser={currentUser} onNavigate={onNavigate} />
          </div>

          {/* 2. Active Exams */}
          <div className="lg:col-span-1 h-80 lg:h-auto">
              <ActiveExamsWidget currentUser={currentUser} onNavigate={onNavigate}/>
          </div>

          {/* 3. Excuses Widget */}
          <div className="lg:col-span-1 h-80 lg:h-auto">
              <ExcusesWidget students={students} attendance={attendance} />
          </div>

          {/* 4. At Risk Widget */}
          <div className="lg:col-span-1 h-80 lg:h-auto">
              <AtRiskWidget 
                  students={students} 
                  attendance={attendance} 
                  performance={performance} 
                  onStudentClick={handleRiskClick} 
              />
          </div>
      </div>

      {/* Bottom Section: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <TrendingUp size={18} className="text-blue-500"/> الأداء الأكاديمي (أفضل 5 طلاب)
                  </h3>
              </div>
              <div className="h-64 w-full">
                  {topStudents.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topStudents} barSize={40}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                              <YAxis domain={[0, 100]} />
                              <Tooltip 
                                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                  cursor={{fill: '#f8fafc'}}
                              />
                              <Bar dataKey="avg" fill="#6366f1" radius={[6, 6, 0, 0]}>
                                  {topStudents.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                          لا توجد بيانات كافية لعرض الرسم البياني
                      </div>
                  )}
              </div>
          </div>

          {/* Attendance Pie */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <PieIcon size={18} className="text-green-500"/> ملخص الحضور اليومي
              </h3>
              <div className="h-64 w-full relative">
                  {stats.attendanceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={stats.attendanceData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                              >
                                  {stats.attendanceData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                                  ))}
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" iconType="circle" />
                          </PieChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                          <p className="text-sm">لم يتم رصد الحضور اليوم</p>
                          <button onClick={() => onNavigate('ATTENDANCE')} className="mt-2 text-blue-600 text-xs font-bold underline">اذهب للتحضير</button>
                      </div>
                  )}
                  {stats.attendanceData.length > 0 && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-3xl font-black text-gray-800">{stats.attendanceRate}%</span>
                          <span className="text-[10px] text-gray-400">نسبة الحضور</span>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
