
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, ScheduleItem, TeacherAssignment, SystemUser, Feedback, School, Teacher, Exam, WeeklyPlanItem, AcademicTerm } from '../types';
import { getSchedules, getTeacherAssignments, getFeedback, getTeachers, getSchools, getSystemUsers, getStorageStatistics, getExams, getWeeklyPlans, getAcademicTerms } from '../services/storageService';
import { Users, Clock, AlertCircle, Award, TrendingUp, Activity, Smile, Frown, MessageSquare, Sparkles, BrainCircuit, Calendar, BookOpen, Mail, Server, Database, Building2, Loader2, ArrowRight, CheckSquare, Plus, Trash2, Trophy, GraduationCap, Briefcase, TrendingDown, Layout, FileText, CheckCircle, FileQuestion, CalendarDays, PenTool, Table, XCircle, PlusCircle, Filter } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  selectedDate?: string;
  currentUser?: SystemUser | null;
  onNavigate: (view: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// --- Widgets Definitions ---

const TodoWidget: React.FC = () => {
    const [todos, setTodos] = useState<{id: string, text: string, done: boolean}[]>(() => {
        try {
            const saved = localStorage.getItem('dashboard_todos');
            return saved ? JSON.parse(saved) : [
                { id: '1', text: 'مراجعة تحضير الغد', done: false },
                { id: '2', text: 'إدخال درجات الاختبار', done: false }
            ];
        } catch { return []; }
    });
    const [newTodo, setNewTodo] = useState('');

    useEffect(() => {
        localStorage.setItem('dashboard_todos', JSON.stringify(todos));
    }, [todos]);

    const addTodo = () => {
        if (!newTodo.trim()) return;
        setTodos([...todos, { id: Date.now().toString(), text: newTodo, done: false }]);
        setNewTodo('');
    };

    const toggleTodo = (id: string) => {
        setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    const deleteTodo = (id: string) => {
        setTodos(todos.filter(t => t.id !== id));
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <CheckSquare size={18} className="text-green-600"/> مهامي
            </h3>
            <div className="flex gap-2 mb-3">
                <input 
                    className="flex-1 border rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                    placeholder="مهمة جديدة..."
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                />
                <button onClick={addTodo} className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700"><Plus size={16}/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar max-h-40">
                {todos.map(todo => (
                    <div key={todo.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <button onClick={() => toggleTodo(todo.id)} className={`text-gray-400 hover:text-green-600 ${todo.done ? 'text-green-600' : ''}`}>
                                {todo.done ? <CheckCircle size={16}/> : <div className="w-4 h-4 border rounded hover:border-green-600"></div>}
                            </button>
                            <span className={`text-sm ${todo.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{todo.text}</span>
                        </div>
                        <button onClick={() => deleteTodo(todo.id)} className="text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600"><Trash2 size={14}/></button>
                    </div>
                ))}
                {todos.length === 0 && <p className="text-center text-xs text-gray-400 mt-4">لا توجد مهام</p>}
            </div>
        </div>
    );
};

const WeeklyPlanWidget: React.FC<{ teacherId: string, onNavigate: (view: string) => void }> = ({ teacherId, onNavigate }) => {
    const [plans, setPlans] = useState<WeeklyPlanItem[]>([]);
    
    useEffect(() => {
        const allPlans = getWeeklyPlans(teacherId);
        const d = new Date();
        const day = d.getDay(); // 0-6
        const diff = d.getDate() - day; 
        const sunday = new Date(d.setDate(diff));
        const weekStart = sunday.toISOString().split('T')[0];
        
        setPlans(allPlans.filter(p => p.weekStartDate === weekStart).sort((a,b) => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return days.indexOf(a.day) - days.indexOf(b.day);
        }));
    }, [teacherId]);

    const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todaysPlans = plans.filter(p => p.day === todayDay);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <CalendarDays size={18} className="text-purple-600"/> خطة اليوم
                </h3>
                <button onClick={() => onNavigate('SCHEDULE_VIEW')} className="text-xs text-blue-600 hover:underline">الجدول الكامل</button>
            </div>
            <div className="space-y-3">
                {todaysPlans.length > 0 ? todaysPlans.map(plan => (
                    <div key={plan.id} className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                        <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-purple-800 bg-white px-2 py-0.5 rounded border border-purple-200">حصة {plan.period}</span>
                            <span className="text-xs text-gray-500 font-bold">{plan.subjectName}</span>
                        </div>
                        <p className="text-xs text-gray-700 mt-1 line-clamp-2">{plan.lessonTopic}</p>
                    </div>
                )) : <p className="text-center text-xs text-gray-400 py-4">لا توجد خطط مسجلة لليوم</p>}
            </div>
        </div>
    );
};

const UpcomingExamsWidget: React.FC<{ teacherId: string, onNavigate: (view: string) => void }> = ({ teacherId, onNavigate }) => {
    const [exams, setExams] = useState<Exam[]>([]);

    useEffect(() => {
        const allExams = getExams(teacherId);
        const today = new Date().toISOString().split('T')[0];
        const upcoming = allExams.filter(e => e.date && e.date >= today).sort((a,b) => a.date!.localeCompare(b.date!)).slice(0, 3);
        setExams(upcoming);
    }, [teacherId]);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <FileQuestion size={18} className="text-orange-600"/> اختبارات قادمة
                </h3>
                <button onClick={() => onNavigate('EXAMS_MANAGER')} className="text-xs text-blue-600 hover:underline">عرض الكل</button>
            </div>
            <div className="space-y-2">
                {exams.length > 0 ? exams.map(exam => (
                    <div key={exam.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200 transition-colors cursor-pointer" onClick={() => onNavigate('EXAMS_MANAGER')}>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{exam.title}</p>
                            <p className="text-xs text-gray-500">{exam.subject} - {exam.gradeLevel}</p>
                        </div>
                        <div className="text-center bg-orange-50 px-2 py-1 rounded border border-orange-100">
                            <span className="block text-xs font-bold text-orange-700">{formatDualDate(exam.date!).split('|')[0]}</span>
                        </div>
                    </div>
                )) : <p className="text-center text-xs text-gray-400 py-4">لا توجد اختبارات قادمة</p>}
            </div>
        </div>
    );
};

// --- End Widgets Definitions ---

const Dashboard: React.FC<DashboardProps> = ({ students, attendance, performance, selectedDate, currentUser, onNavigate }) => {
  // Safety Check
  if (!students || !attendance || !performance) {
      return <div className="flex items-center justify-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32}/></div>;
  }

  const effectiveDate = selectedDate || new Date().toISOString().split('T')[0];
  
  if (currentUser?.role === 'SUPER_ADMIN') {
      return <SystemAdminDashboard />;
  }

  if (currentUser?.role === 'SCHOOL_MANAGER') {
      return <SchoolManagerDashboard students={students} attendance={attendance} performance={performance} currentUser={currentUser} onNavigate={onNavigate} />;
  }

  return <TeacherDashboard students={students} attendance={attendance} performance={performance} selectedDate={effectiveDate} currentUser={currentUser} onNavigate={onNavigate} />;
};

const SystemAdminDashboard = () => (
    <div className="p-6 h-full flex flex-col items-center justify-center text-gray-500">
        <Server size={64} className="mb-4 text-gray-300"/>
        <h2 className="text-xl font-bold">لوحة تحكم مدير النظام</h2>
        <p>يرجى الانتقال إلى قائمة "إدارة النظام" للتحكم الكامل.</p>
    </div>
);

// --- SCHOOL MANAGER DASHBOARD ---
const SchoolManagerDashboard: React.FC<any> = ({ students, attendance, performance, currentUser, onNavigate }) => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    
    useEffect(() => {
        const allTeachers = getTeachers();
        const mySchoolTeachers = allTeachers.filter(t => t.schoolId === currentUser.schoolId || t.managerId === currentUser.nationalId);
        setTeachers(mySchoolTeachers);

        const loadedTerms = getAcademicTerms(currentUser.id);
        setTerms(loadedTerms);
        const active = loadedTerms.find(t => t.isCurrent) || (loadedTerms.length > 0 ? loadedTerms[0] : null);
        if (active) setSelectedTermId(active.id);
    }, [currentUser]);

    const activeTerm = terms.find(t => t.id === selectedTermId);

    const stats = useMemo(() => {
        const totalStudents = students.length;
        const totalTeachers = teachers.length;
        
        // Today's Attendance
        const today = new Date().toISOString().split('T')[0];
        const todaysRecords = attendance.filter((a: any) => a.date === today);
        const presentToday = todaysRecords.filter((a: any) => a.status === 'PRESENT').length;
        const absentToday = todaysRecords.filter((a: any) => a.status === 'ABSENT').length;
        const attendanceRate = totalStudents > 0 && todaysRecords.length > 0 ? Math.round((presentToday / todaysRecords.length) * 100) : 0;

        // Performance Avg (Filtered by Selected Term)
        let filteredPerf = performance;
        if (activeTerm) {
            filteredPerf = performance.filter((p: PerformanceRecord) => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
        }

        const totalScore = filteredPerf.reduce((acc: number, curr: any) => acc + (curr.score / curr.maxScore), 0);
        const avgPerformance = filteredPerf.length > 0 ? Math.round((totalScore / filteredPerf.length) * 100) : 0;

        return { totalStudents, totalTeachers, attendanceRate, absentToday, avgPerformance, presentToday };
    }, [students, attendance, performance, teachers, activeTerm]);

    // Chart Data: Attendance by Grade (FILTERED BY SELECTED TERM)
    const attendanceByGrade = useMemo(() => {
        const grades = Array.from(new Set(students.map((s: any) => s.gradeLevel))).filter(Boolean);
        return grades.map(grade => {
            const gradeStudents = students.filter((s: any) => s.gradeLevel === grade);
            const studentIds = new Set(gradeStudents.map((s: any) => s.id));
            
            // Filter attendance by selected term dates if available
            let gradeAtt = attendance.filter((a: any) => studentIds.has(a.studentId));
            if (activeTerm) {
                gradeAtt = gradeAtt.filter((a: any) => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
            }

            const present = gradeAtt.filter((a: any) => a.status === 'PRESENT').length;
            const total = gradeAtt.length;
            return {
                name: grade,
                rate: total > 0 ? Math.round((present / total) * 100) : 0
            };
        });
    }, [students, attendance, activeTerm]);

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Term Filter */}
            <div className="flex justify-end">
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <Filter size={16} className="text-gray-400"/>
                    <select 
                        className="bg-transparent text-sm font-bold text-purple-700 outline-none cursor-pointer"
                        value={selectedTermId}
                        onChange={e => setSelectedTermId(e.target.value)}
                    >
                        <option value="">كل الفترات</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold mb-1">إجمالي الطلاب</p>
                        <h3 className="text-3xl font-black text-gray-800">{stats.totalStudents}</h3>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-full text-blue-600"><GraduationCap size={24}/></div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold mb-1">الكادر التعليمي</p>
                        <h3 className="text-3xl font-black text-gray-800">{stats.totalTeachers}</h3>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-full text-purple-600"><Briefcase size={24}/></div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold mb-1">حضور اليوم</p>
                        <h3 className="text-3xl font-black text-green-600">{stats.attendanceRate}%</h3>
                        <span className="text-[10px] text-gray-400">({stats.presentToday} حاضر)</span>
                    </div>
                    <div className="bg-green-50 p-3 rounded-full text-green-600"><CheckSquare size={24}/></div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold mb-1">الأداء العام {activeTerm ? `(${activeTerm.name})` : ''}</p>
                        <h3 className="text-3xl font-black text-orange-500">{stats.avgPerformance}%</h3>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-full text-orange-600"><Activity size={24}/></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Attendance by Grade */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp size={18} className="text-blue-500"/> 
                        نسبة الحضور حسب الصف {activeTerm ? <span className="text-xs font-normal text-gray-500">({activeTerm.name})</span> : ''}
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceByGrade}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 10}} />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><Layout size={18}/> الوصول السريع</h3>
                    <button onClick={() => onNavigate('TEACHERS')} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-bold text-gray-700">
                        <Users size={18} className="text-purple-600"/> إدارة المعلمين
                    </button>
                    <button onClick={() => onNavigate('STUDENTS')} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-bold text-gray-700">
                        <GraduationCap size={18} className="text-blue-600"/> سجل الطلاب
                    </button>
                    <button onClick={() => onNavigate('MONTHLY_REPORT')} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-bold text-gray-700">
                        <FileText size={18} className="text-green-600"/> التقارير الشاملة
                    </button>
                    <button onClick={() => onNavigate('SETTINGS')} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-bold text-gray-700">
                        <Building2 size={18} className="text-orange-600"/> إعدادات المدرسة
                    </button>
                </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><AlertCircle size={18} className="text-red-500"/> تنبيهات المدير</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stats.absentToday > 5 ? (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3">
                            <div className="bg-red-100 p-2 rounded-full text-red-600"><TrendingDown size={20}/></div>
                            <div>
                                <h4 className="font-bold text-red-800">غياب مرتفع اليوم</h4>
                                <p className="text-xs text-red-600">عدد الغائبين ({stats.absentToday}) تجاوز المعدل الطبيعي.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-full text-green-600"><CheckCircle size={20}/></div>
                            <div>
                                <h4 className="font-bold text-green-800">نسبة الحضور جيدة</h4>
                                <p className="text-xs text-green-600">الأمور تسير على ما يرام.</p>
                            </div>
                        </div>
                    )}
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Users size={20}/></div>
                        <div>
                            <h4 className="font-bold text-blue-800">اكتمال الكادر</h4>
                            <p className="text-xs text-blue-600">تم تسجيل {stats.totalTeachers} معلم في النظام.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TeacherDashboard: React.FC<DashboardProps> = ({ students, attendance, performance, selectedDate, currentUser, onNavigate }) => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [myFeedback, setMyFeedback] = useState<Feedback[]>([]);
  
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  useEffect(() => {
      setSchedules(getSchedules());
      
      const loadedTerms = getAcademicTerms(currentUser?.id);
      setTerms(loadedTerms);
      const active = loadedTerms.find(t => t.isCurrent) || (loadedTerms.length > 0 ? loadedTerms[0] : null);
      if (active) setSelectedTermId(active.id);

      if (currentUser?.role === 'TEACHER') {
          const teachers = getTeachers();
          const me = teachers.find(t => 
              (currentUser.nationalId && t.nationalId === currentUser.nationalId) || 
              (currentUser.email && t.email === currentUser.email)
          );
          if (me) {
              const allFeedback = getFeedback();
              setMyFeedback(allFeedback.filter(f => f.teacherId === me.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          }
      }
  }, [currentUser]);

  const activeTerm = terms.find(t => t.id === selectedTermId);

  // --- Today's Schedule Logic ---
  const todaySchedule = useMemo(() => {
      if (!currentUser) return [];
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()]; 
      
      return schedules
          .filter(s => s.day === today && (s.teacherId === currentUser.id || !s.teacherId))
          .sort((a,b) => a.period - b.period);
  }, [schedules, currentUser]);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const todaysAttendance = attendance.filter(a => a.date === selectedDate);
    
    const present = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const absent = todaysAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    
    const attendanceRate = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;

    // Filter Performance by Selected Term
    let filteredPerf = performance;
    if (activeTerm) {
        filteredPerf = performance.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
    }

    const totalScore = filteredPerf.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
    const avgScore = filteredPerf.length > 0 ? Math.round((totalScore / filteredPerf.length) * 100) : 0;

    return { totalStudents, present, absent, attendanceRate, avgScore };
  }, [students, attendance, performance, selectedDate, activeTerm]);

  const studentMetrics = useMemo(() => {
    return students.map(student => {
        // Filter attendance by Selected Term
        let studentAttendance = attendance.filter(a => a.studentId === student.id);
        if (activeTerm) {
             studentAttendance = studentAttendance.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
        }

        const totalDays = studentAttendance.length;
        const creditDays = studentAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
        const attendanceRate = totalDays > 0 ? (creditDays / totalDays) * 100 : 100;

        // Filter Performance by Selected Term
        let studentPerformance = performance.filter(p => p.studentId === student.id);
        if (activeTerm) {
             studentPerformance = studentPerformance.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
        }

        const totalScore = studentPerformance.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
        const avgScore = studentPerformance.length > 0 ? (totalScore / studentPerformance.length) * 100 : 0;

        const negativeBehaviors = studentAttendance.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;
        const positiveBehaviors = studentAttendance.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;

        const leaderboardScore = (attendanceRate * 0.4) + (avgScore * 0.4) + ((positiveBehaviors - negativeBehaviors) * 5);

        return { id: student.id, name: student.name, grade: student.gradeLevel, attendance: Math.round(attendanceRate), score: Math.round(avgScore), leaderboardScore: Math.round(leaderboardScore) };
    });
  }, [students, attendance, performance, activeTerm]);

  const topStudents = [...studentMetrics].sort((a,b) => b.leaderboardScore - a.leaderboardScore).slice(0, 5);

  const recentActivity = useMemo(() => {
      const activities: any[] = [];
      performance.forEach(p => {
          activities.push({
              type: 'PERFORMANCE',
              date: p.date,
              studentName: students.find(s => s.id === p.studentId)?.name || 'طالب غير معروف',
              detail: `حصل على ${p.score}/${p.maxScore} في ${p.title || p.subject}`,
              timestamp: new Date(p.date).getTime()
          });
      });
      attendance.forEach(a => {
          if (a.status === 'ABSENT' || a.status === 'LATE') {
              activities.push({
                  type: 'ATTENDANCE',
                  date: a.date,
                  studentName: students.find(s => s.id === a.studentId)?.name || 'طالب غير معروف',
                  detail: a.status === 'ABSENT' ? 'تم تسجيل غياب' : 'تم تسجيل تأخر',
                  timestamp: new Date(a.date).getTime()
              });
          }
          if (a.behaviorStatus && a.behaviorStatus !== 'NEUTRAL') {
               activities.push({
                  type: 'BEHAVIOR',
                  date: a.date,
                  studentName: students.find(s => s.id === a.studentId)?.name || 'طالب غير معروف',
                  detail: a.behaviorStatus === 'POSITIVE' ? 'سلوك إيجابي 🌟' : 'ملاحظة سلوكية ⚠️',
                  timestamp: new Date(a.date).getTime()
              });
          }
      });
      return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  }, [attendance, performance, students]);

  const riskAlerts = useMemo(() => {
      const risks: any[] = [];
      students.forEach(s => {
          // Filter data for Risk Analysis by Active Term
          let sAtt = attendance.filter(a => a.studentId === s.id);
          let sPerf = performance.filter(p => p.studentId === s.id);
          
          if (activeTerm) {
              sAtt = sAtt.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
              sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
          }

          const absent = sAtt.filter(a => a.status === 'ABSENT').length;
          const totalDays = sAtt.length;
          if (totalDays > 0 && (absent / totalDays) > 0.20) {
              risks.push({ student: s, type: 'ATTENDANCE', msg: `نسبة غياب عالية (${Math.round((absent/totalDays)*100)}%)` });
          }
          
          if (sPerf.length >= 3) {
              const totalScore = sPerf.reduce((a,b) => a + (b.score/b.maxScore), 0);
              const avg = totalScore / sPerf.length;
              if (avg < 0.5) {
                  risks.push({ student: s, type: 'ACADEMIC', msg: `مستوى متدني (${Math.round(avg*100)}%)` });
              }
          }
      });
      return risks.slice(0, 3);
  }, [students, attendance, performance, activeTerm]);

  return (
    <div className="space-y-6 animate-fade-in p-6">
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1" onClick={() => onNavigate('ATTENDANCE')}> 
              <div><h3 className="font-bold text-lg mb-1">تسجيل الحضور</h3><p className="text-green-100 text-xs">رصد الغياب والتأخر اليومي</p></div>
              <div className="bg-white/20 p-2 rounded-lg"><CheckSquare size={24}/></div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1" onClick={() => onNavigate('WORKS_TRACKING')}>
              <div><h3 className="font-bold text-lg mb-1">رصد الدرجات</h3><p className="text-purple-100 text-xs">سجل المتابعة والمهارات</p></div>
              <div className="bg-white/20 p-2 rounded-lg"><Table size={24}/></div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1" onClick={() => onNavigate('STUDENT_FOLLOWUP')}>
              <div><h3 className="font-bold text-lg mb-1">متابعة الطلاب</h3><p className="text-blue-100 text-xs">تقارير الأداء الفردي</p></div>
              <div className="bg-white/20 p-2 rounded-lg"><Users size={24}/></div>
          </div>
      </div>

      {/* Today's Schedule & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calendar size={18} className="text-primary"/> جدول اليوم</h3>
                      
                      {/* Term Selector */}
                      <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border">
                          <Filter size={14} className="text-gray-400"/>
                          <select 
                              value={selectedTermId}
                              onChange={(e) => setSelectedTermId(e.target.value)}
                              className="bg-transparent text-xs font-bold outline-none text-purple-700"
                          >
                              <option value="">كل الفترات</option>
                              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                      </div>
                  </div>

                  {todaySchedule.length > 0 ? (
                      <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                          {todaySchedule.map((session, idx) => (
                              <div key={idx} onClick={() => onNavigate('ATTENDANCE')} className="min-w-[140px] bg-gray-50 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors group">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="text-[10px] bg-white border px-2 py-0.5 rounded-full font-bold text-gray-500">حصة {session.period}</span>
                                      <ArrowRight size={14} className="text-gray-300 group-hover:text-indigo-500"/>
                                  </div>
                                  <h4 className="font-bold text-gray-800 text-sm mb-1">{session.subjectName}</h4>
                                  <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded">{session.classId}</span>
                              </div>
                          ))}
                      </div>
                  ) : <div className="text-center text-gray-400 py-4 text-sm bg-gray-50 rounded-lg border border-dashed">لا توجد حصص مسجلة اليوم</div>}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold">الطلاب</p><p className="text-2xl font-black text-gray-800">{stats.totalStudents}</p></div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold">الحضور</p><p className="text-2xl font-black text-green-600">{stats.attendanceRate}%</p></div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold">الغياب</p><p className="text-2xl font-black text-red-600">{stats.absent}</p></div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold">الأداء {activeTerm ? `(${activeTerm.name})` : ''}</p><p className="text-2xl font-black text-blue-600">{stats.avgScore}%</p></div>
              </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4">
              <TodoWidget />
          </div>
          <div className="lg:col-span-1 flex flex-col gap-4">
              <WeeklyPlanWidget teacherId={currentUser?.id || ''} onNavigate={onNavigate} />
              <UpcomingExamsWidget teacherId={currentUser?.id || ''} onNavigate={onNavigate} />
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
            {/* New: Quick Add Students if list is empty */}
            {students.length === 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center animate-bounce-in">
                    <h3 className="text-purple-800 font-bold mb-2">ابدأ بإضافة طلابك</h3>
                    <p className="text-sm text-purple-600 mb-4">لا يوجد طلاب في قائمتك. أضفهم الآن لبدء المتابعة.</p>
                    <button onClick={() => onNavigate('STUDENTS')} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center justify-center gap-2 mx-auto">
                        <PlusCircle size={18}/> إضافة طلاب
                    </button>
                </div>
            )}

            {riskAlerts.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 animate-bounce-in">
                    <h3 className="text-red-800 font-bold mb-3 flex items-center gap-2 text-sm"><AlertCircle size={16}/> تنبيهات المتابعة (Risk)</h3>
                    <div className="space-y-2">
                        {riskAlerts.map((risk, i) => (
                            <div key={i} className="bg-white p-2 rounded border border-red-100 flex justify-between items-center text-sm">
                                <span className="font-bold text-gray-700">{risk.student.name}</span>
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">{risk.msg}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-64">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><Trophy size={18} className="text-yellow-500"/> لوحة الشرف</h3>
                    <button onClick={() => onNavigate('STUDENT_FOLLOWUP')} className="text-xs text-blue-600 hover:underline">عرض الكل</button>
                </div>
                <div className="flex-1 overflow-auto space-y-3 custom-scrollbar">
                    {topStudents.length > 0 ? topStudents.map((s, idx) => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-400 w-4">{idx + 1}</span>
                                <div className="w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center font-bold text-xs">{s.name.charAt(0)}</div>
                                <div><p className="text-sm font-bold text-gray-800">{s.name}</p><p className="text-[10px] text-gray-500">{s.grade}</p></div>
                            </div>
                            <span className="font-black text-yellow-600 text-sm">{s.score}%</span>
                        </div>
                    )) : <p className="text-center text-xs text-gray-400 py-10">لا توجد بيانات كافية</p>}
                </div>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full max-h-[500px] flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2"><Activity size={18} className="text-purple-600"/> سجل النشاطات الأخير</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {recentActivity.length > 0 ? recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                        <div className={`mt-1 min-w-[24px] h-6 flex items-center justify-center rounded-full ${activity.type === 'ATTENDANCE' ? 'bg-orange-100 text-orange-600' : activity.type === 'BEHAVIOR' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {activity.type === 'ATTENDANCE' ? <Clock size={14}/> : activity.type === 'BEHAVIOR' ? <Smile size={14}/> : <Award size={14}/>}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{activity.studentName}</p>
                            <p className="text-xs text-gray-600">{activity.detail}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{formatDualDate(activity.date)}</p>
                        </div>
                    </div>
                )) : <div className="text-center text-gray-400 py-10">لا توجد نشاطات حديثة</div>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
