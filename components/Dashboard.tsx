
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, ScheduleItem, TeacherAssignment, SystemUser, Feedback, School, Teacher, Exam, WeeklyPlanItem, AcademicTerm } from '../types';
import { getSchedules, getTeacherAssignments, getFeedback, getTeachers, getSchools, getSystemUsers, getStorageStatistics, getExams, getWeeklyPlans, getAcademicTerms } from '../services/storageService';
import { Users, Clock, AlertCircle, Award, TrendingUp, Activity, Smile, Frown, MessageSquare, Sparkles, BrainCircuit, Calendar, BookOpen, Mail, Server, Database, Building2, Loader2, ArrowRight, CheckSquare, Plus, Trash2, Trophy, GraduationCap, Briefcase, TrendingDown, Layout, FileText, CheckCircle, FileQuestion, CalendarDays, PenTool, Table, XCircle } from 'lucide-react';
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
    const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null);
    
    useEffect(() => {
        const allTeachers = getTeachers();
        const mySchoolTeachers = allTeachers.filter(t => t.schoolId === currentUser.schoolId || t.managerId === currentUser.nationalId);
        setTeachers(mySchoolTeachers);

        const terms = getAcademicTerms(currentUser.id);
        const active = terms.find(t => t.isCurrent) || (terms.length > 0 ? terms[0] : null);
        setCurrentTerm(active);
    }, [currentUser]);

    const stats = useMemo(() => {
        const totalStudents = students.length;
        const totalTeachers = teachers.length;
        
        // Today's Attendance
        const today = new Date().toISOString().split('T')[0];
        const todaysRecords = attendance.filter((a: any) => a.date === today);
        const presentToday = todaysRecords.filter((a: any) => a.status === 'PRESENT').length;
        const absentToday = todaysRecords.filter((a: any) => a.status === 'ABSENT').length;
        const attendanceRate = totalStudents > 0 && todaysRecords.length > 0 ? Math.round((presentToday / todaysRecords.length) * 100) : 0;

        // Performance Avg (Filtered by Current Term if available)
        let filteredPerf = performance;
        if (currentTerm) {
            filteredPerf = performance.filter((p: PerformanceRecord) => p.date >= currentTerm.startDate && p.date <= currentTerm.endDate);
        }

        const totalScore = filteredPerf.reduce((acc: number, curr: any) => acc + (curr.score / curr.maxScore), 0);
        const avgPerformance = filteredPerf.length > 0 ? Math.round((totalScore / filteredPerf.length) * 100) : 0;

        return { totalStudents, totalTeachers, attendanceRate, absentToday, avgPerformance, presentToday };
    }, [students, attendance, performance, teachers, currentTerm]);

    // Chart Data: Attendance by Grade
    const attendanceByGrade = useMemo(() => {
        const grades = Array.from(new Set(students.map((s: any) => s.gradeLevel))).filter(Boolean);
        return grades.map(grade => {
            const gradeStudents = students.filter((s: any) => s.gradeLevel === grade);
            const studentIds = new Set(gradeStudents.map((s: any) => s.id));
            const gradeAtt = attendance.filter((a: any) => studentIds.has(a.studentId));
            const present = gradeAtt.filter((a: any) => a.status === 'PRESENT').length;
            const total = gradeAtt.length;
            return {
                name: grade,
                rate: total > 0 ? Math.round((present / total) * 100) : 0
            };
        });
    }, [students, attendance]);

    return (
        <div className="p-6 space-y-6 animate-fade-in">
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
                        <p className="text-gray-500 text-xs font-bold mb-1">الأداء العام {currentTerm ? `(${currentTerm.name})` : ''}</p>
                        <h3 className="text-3xl font-black text-orange-500">{stats.avgPerformance}%</h3>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-full text-orange-600"><Activity size={24}/></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart 1: Attendance by Grade */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-500"/> نسبة الحضور حسب الصف</h3>
                    <div className="h-64">
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

// ... (TodoWidget, UpcomingExamsWidget, WeeklyPlanWidget components - NO CHANGES) ...
const TodoWidget = () => {
    const [tasks, setTasks] = useState<{id: string, text: string, done: boolean}[]>(() => {
        const saved = localStorage.getItem('teacher_todo_list');
        return saved ? JSON.parse(saved) : [
            { id: '1', text: 'طباعة كشف الدرجات', done: false },
            { id: '2', text: 'تحضير درس الغد', done: false }
        ];
    });
    const [newTask, setNewTask] = useState('');

    useEffect(() => {
        localStorage.setItem('teacher_todo_list', JSON.stringify(tasks));
    }, [tasks]);

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newTask.trim()) return;
        setTasks([...tasks, { id: Date.now().toString(), text: newTask, done: false }]);
        setNewTask('');
    };

    const toggleTask = (id: string) => {
        setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    const removeTask = (id: string) => {
        setTasks(tasks.filter(t => t.id !== id));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-80 overflow-hidden">
            <div className="p-4 border-b bg-indigo-50 flex justify-between items-center">
                <h3 className="font-bold text-indigo-800 flex items-center gap-2 text-sm"><CheckSquare size={16}/> مهامي اليوم</h3>
                <span className="text-xs bg-white px-2 py-0.5 rounded text-indigo-600 font-bold">{tasks.filter(t=>!t.done).length} متبقي</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {tasks.map(task => (
                    <div key={task.id} className="group flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                        <button onClick={() => toggleTask(task.id)} className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'}`}>
                            <CheckSquare size={12}/>
                        </button>
                        <span className={`flex-1 text-sm ${task.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.text}</span>
                        <button onClick={() => removeTask(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14}/></button>
                    </div>
                ))}
                {tasks.length === 0 && <p className="text-center text-gray-400 text-xs py-10">لا توجد مهام! استمتع بوقتك 🎉</p>}
            </div>

            <form onSubmit={addTask} className="p-2 border-t bg-gray-50 flex gap-2">
                <input 
                    className="flex-1 p-2 text-xs border rounded outline-none" 
                    placeholder="مهمة جديدة..." 
                    value={newTask} 
                    onChange={e => setNewTask(e.target.value)}
                />
                <button type="submit" className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"><Plus size={16}/></button>
            </form>
        </div>
    );
};

const UpcomingExamsWidget = ({ teacherId, onNavigate }: { teacherId: string, onNavigate?: (view: string) => void }) => {
    const [upcomingExams, setUpcomingExams] = useState<Exam[]>([]);

    useEffect(() => {
        if(teacherId) {
            const allExams = getExams(teacherId);
            const today = new Date().toISOString().split('T')[0];
            const future = allExams
                .filter(e => e.date && e.date >= today)
                .sort((a,b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
                .slice(0, 3);
            setUpcomingExams(future);
        }
    }, [teacherId]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-80 overflow-hidden">
            <div className="p-4 border-b bg-purple-50 flex justify-between items-center">
                <h3 className="font-bold text-purple-800 flex items-center gap-2 text-sm"><FileQuestion size={16}/> اختبارات قادمة</h3>
                {onNavigate && (
                    <button onClick={() => onNavigate('EXAMS_MANAGER')} className="text-xs text-purple-600 hover:underline">
                        عرض الكل
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {upcomingExams.length > 0 ? upcomingExams.map(exam => (
                    <div 
                        key={exam.id} 
                        onClick={() => onNavigate && onNavigate('EXAMS_MANAGER')}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-gray-800 text-sm truncate w-full group-hover:text-purple-700 transition-colors">{exam.title}</h4>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${exam.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                {exam.isActive ? 'نشط' : 'مسودة'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><CalendarDays size={12}/> {formatDualDate(exam.date!).split('|')[0]}</span>
                            <span>•</span>
                            <span>{exam.gradeLevel}</span>
                        </div>
                    </div>
                )) : (
                    <div className="text-center text-gray-400 text-xs py-10 flex flex-col items-center justify-center h-full">
                        <Calendar size={32} className="mb-2 opacity-20"/>
                        <p>لا توجد اختبارات مجدولة قريباً.</p>
                        {onNavigate && <button onClick={() => onNavigate('EXAMS_MANAGER')} className="mt-2 text-purple-600 hover:underline">جدولة اختبار</button>}
                    </div>
                )}
            </div>
        </div>
    );
};

const WeeklyPlanWidget = ({ teacherId, onNavigate }: { teacherId: string, onNavigate?: (view: string) => void }) => {
    const [progress, setProgress] = useState({ totalSlots: 0, filledSlots: 0 });
    const [currentWeekStart, setCurrentWeekStart] = useState('');

    useEffect(() => {
        if (!teacherId) return;
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        const weekStart = d.toISOString().split('T')[0];
        setCurrentWeekStart(weekStart);

        const schedules = getSchedules();
        const plans = getWeeklyPlans(teacherId);

        // Get Teacher Schedules
        const mySchedule = schedules.filter(s => s.teacherId === teacherId || !s.teacherId); // Include loose schedules
        const totalSlots = mySchedule.length;

        // Get Filled Plans for this week
        const filled = plans.filter(p => p.weekStartDate === weekStart && p.lessonTopic).length;

        setProgress({ totalSlots, filledSlots: filled });
    }, [teacherId]);

    const percentage = progress.totalSlots > 0 ? Math.round((progress.filledSlots / progress.totalSlots) * 100) : 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-80 overflow-hidden">
            <div className="p-4 border-b bg-teal-50 flex justify-between items-center">
                <h3 className="font-bold text-teal-800 flex items-center gap-2 text-sm"><PenTool size={16}/> الخطة الأسبوعية</h3>
                <span className="text-[10px] bg-white text-teal-700 px-2 py-0.5 rounded border border-teal-200">{percentage}% مكتمل</span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="relative w-32 h-32 mb-4">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="50%" cy="50%" r="45%" stroke="#e2e8f0" strokeWidth="10" fill="transparent" />
                        <circle 
                            cx="50%" cy="50%" r="45%" 
                            stroke="#0f766e" strokeWidth="10" 
                            fill="transparent" 
                            strokeDasharray={2 * Math.PI * 45} 
                            strokeDashoffset={2 * Math.PI * 45 * (1 - percentage / 100)} 
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-teal-800">{progress.filledSlots}</span>
                        <span className="text-xs text-gray-400">من {progress.totalSlots}</span>
                    </div>
                </div>
                
                {percentage < 100 ? (
                    <>
                        <p className="text-xs text-gray-500 mb-3">لديك حصص لم يتم تخطيطها لهذا الأسبوع.</p>
                        {onNavigate && (
                            <button onClick={() => onNavigate('SCHEDULE_VIEW')} className="text-xs bg-teal-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-700 shadow-sm transition-colors w-full">
                                إكمال الخطة الآن
                            </button>
                        )}
                    </>
                ) : (
                    <div className="text-green-600 font-bold flex items-center gap-2 animate-bounce">
                        <CheckCircle size={18}/> خطة الأسبوع مكتملة!
                    </div>
                )}
            </div>
        </div>
    );
};

const TeacherDashboard: React.FC<DashboardProps> = ({ students, attendance, performance, selectedDate, currentUser, onNavigate }) => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [myFeedback, setMyFeedback] = useState<Feedback[]>([]);
  const [currentTerm, setCurrentTerm] = useState<AcademicTerm | null>(null);

  useEffect(() => {
      setSchedules(getSchedules());
      
      const terms = getAcademicTerms(currentUser?.id);
      const active = terms.find(t => t.isCurrent) || (terms.length > 0 ? terms[0] : null);
      setCurrentTerm(active);

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

  // --- Today's Schedule Logic ---
  const todaySchedule = useMemo(() => {
      if (!currentUser) return [];
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = days[new Date().getDay()]; // Get current day name
      
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

    // Filter Performance by Current Term if available
    let filteredPerf = performance;
    if (currentTerm) {
        filteredPerf = performance.filter(p => p.date >= currentTerm.startDate && p.date <= currentTerm.endDate);
    }

    const totalScore = filteredPerf.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
    const avgScore = filteredPerf.length > 0 ? Math.round((totalScore / filteredPerf.length) * 100) : 0;

    return { totalStudents, present, absent, attendanceRate, avgScore };
  }, [students, attendance, performance, selectedDate, currentTerm]);

  const studentMetrics = useMemo(() => {
    return students.map(student => {
        const studentAttendance = attendance.filter(a => a.studentId === student.id);
        const totalDays = studentAttendance.length;
        const creditDays = studentAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
        const attendanceRate = totalDays > 0 ? (creditDays / totalDays) * 100 : 100;

        const studentPerformance = performance.filter(p => p.studentId === student.id);
        const totalScore = studentPerformance.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
        const avgScore = studentPerformance.length > 0 ? (totalScore / studentPerformance.length) * 100 : 0;

        const negativeBehaviors = studentAttendance.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;
        const positiveBehaviors = studentAttendance.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;

        // Calculate a meta-score for leaderboard
        const leaderboardScore = (attendanceRate * 0.4) + (avgScore * 0.4) + ((positiveBehaviors - negativeBehaviors) * 5);

        return { id: student.id, name: student.name, grade: student.gradeLevel, attendance: Math.round(attendanceRate), score: Math.round(avgScore), leaderboardScore: Math.round(leaderboardScore) };
    });
  }, [students, attendance, performance]);

  const topStudents = [...studentMetrics].sort((a,b) => b.leaderboardScore - a.leaderboardScore).slice(0, 5);

  // --- RECENT ACTIVITY FEED (Integrated) ---
  const recentActivity = useMemo(() => {
      const activities: any[] = [];
      
      // 1. Performance Records
      performance.forEach(p => {
          activities.push({
              type: 'PERFORMANCE',
              date: p.date,
              studentName: students.find(s => s.id === p.studentId)?.name || 'طالب غير معروف',
              detail: `حصل على ${p.score}/${p.maxScore} في ${p.title || p.subject}`,
              timestamp: new Date(p.date).getTime()
          });
      });

      // 2. Attendance/Behavior Records
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

  // --- RISK ALERTS (New) ---
  const riskAlerts = useMemo(() => {
      const risks: any[] = [];
      students.forEach(s => {
          const sAtt = attendance.filter(a => a.studentId === s.id);
          const absent = sAtt.filter(a => a.status === 'ABSENT').length;
          const totalDays = sAtt.length;
          
          if (totalDays > 0 && (absent / totalDays) > 0.20) {
              risks.push({ student: s, type: 'ATTENDANCE', msg: `نسبة غياب عالية (${Math.round((absent/totalDays)*100)}%)` });
          }

          const sPerf = performance.filter(p => p.studentId === s.id);
          if (sPerf.length >= 3) {
              const totalScore = sPerf.reduce((a,b) => a + (b.score/b.maxScore), 0);
              const avg = totalScore / sPerf.length;
              if (avg < 0.5) {
                  risks.push({ student: s, type: 'ACADEMIC', msg: `مستوى متدني (${Math.round(avg*100)}%)` });
              }
          }
      });
      return risks.slice(0, 3); // Top 3 risks
  }, [students, attendance, performance]);

  return (
    <div className="space-y-6 animate-fade-in p-6">
      
      {/* Quick Actions - Primary Functionality Focus */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          {/* Attendance Action */}
          <div 
              className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1" 
              onClick={() => onNavigate('ATTENDANCE')}
          > 
              <div><h3 className="font-bold text-lg mb-1">تسجيل الحضور</h3><p className="text-green-100 text-xs">رصد الغياب والتأخر اليومي</p></div>
              <div className="bg-white/20 p-2 rounded-lg"><CheckSquare size={24}/></div>
          </div>

          {/* Grades Action */}
          <div 
              className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1" 
              onClick={() => onNavigate('WORKS_TRACKING')}
          >
              <div><h3 className="font-bold text-lg mb-1">رصد الدرجات</h3><p className="text-purple-100 text-xs">سجل المتابعة والمهارات</p></div>
              <div className="bg-white/20 p-2 rounded-lg"><Table size={24}/></div>
          </div>

          {/* Student Follow-up Action */}
          <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1" 
              onClick={() => onNavigate('STUDENT_FOLLOWUP')}
          >
              <div><h3 className="font-bold text-lg mb-1">متابعة الطلاب</h3><p className="text-blue-100 text-xs">تقارير الأداء الفردي</p></div>
              <div className="bg-white/20 p-2 rounded-lg"><Users size={24}/></div>
          </div>
      </div>

      {/* Today's Schedule & Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-6">
              {/* Schedule Widget */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Calendar size={18} className="text-primary"/> جدول اليوم</h3>
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

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold">الطلاب</p><p className="text-2xl font-black text-gray-800">{stats.totalStudents}</p></div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold">الحضور</p><p className="text-2xl font-black text-green-600">{stats.attendanceRate}%</p></div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold">الغياب</p><p className="text-2xl font-black text-red-600">{stats.absent}</p></div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center"><p className="text-xs text-gray-500 font-bold">الأداء {currentTerm ? `(${currentTerm.name})` : ''}</p><p className="text-2xl font-black text-blue-600">{stats.avgScore}%</p></div>
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
        
        {/* Risk Alerts & Top Students */}
        <div className="space-y-6">
            {/* Risk Alerts */}
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

            {/* Top Students */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-64">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><Trophy size={18} className="text-yellow-500"/> لوحة الشرف</h3>
                    <button onClick={() => onNavigate('STUDENT_FOLLOWUP')} className="text-xs text-blue-600 hover:underline">عرض الكل</button>
                </div>
                <div className="flex-1 overflow-auto space-y-3 custom-scrollbar">
                    {topStudents.map((s, idx) => (
                        <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-400 w-4">{idx + 1}</span>
                                <div className="w-8 h-8 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center font-bold text-xs">{s.name.charAt(0)}</div>
                                <div><p className="text-sm font-bold text-gray-800">{s.name}</p><p className="text-[10px] text-gray-500">{s.grade}</p></div>
                            </div>
                            <span className="font-black text-yellow-600 text-sm">{s.score}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Recent Activity Feed (Enhanced) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full max-h-[500px] flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2"><Activity size={18} className="text-purple-600"/> سجل النشاطات الأخير</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {recentActivity.length > 0 ? recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors">
                        <div className={`mt-1 min-w-[24px] h-6 flex items-center justify-center rounded-full ${
                            activity.type === 'ATTENDANCE' ? 'bg-orange-100 text-orange-600' :
                            activity.type === 'BEHAVIOR' ? 'bg-green-100 text-green-600' :
                            'bg-blue-100 text-blue-600'
                        }`}>
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
