
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, ScheduleItem, SystemUser, WeeklyPlanItem, AcademicTerm, Exam } from '../types';
import { getSchedules, getWeeklyPlans, getExams, getAcademicTerms } from '../services/storageService';
import { Users, Clock, AlertCircle, Award, TrendingUp, Activity, Smile, Calendar, CheckSquare, Plus, Trash2, Trophy, ArrowRight, CalendarDays, FileQuestion, Filter, MessageCircle, Table, CheckCircle } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

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

const TodoWidget: React.FC = () => {
    const [todos, setTodos] = useState<{id: string, text: string, done: boolean}[]>(() => {
        try {
            const saved = localStorage.getItem('dashboard_todos');
            return saved ? JSON.parse(saved) : [
                { id: '1', text: 'رصد غياب اليوم', done: false },
                { id: '2', text: 'إدخال درجات الاختبار القصير', done: false }
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
                <CheckSquare size={18} className="text-indigo-600"/> مهامي السريعة
            </h3>
            <div className="flex gap-2 mb-3">
                <input 
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-500 bg-gray-50"
                    placeholder="مهمة جديدة..."
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                />
                <button onClick={addTodo} className="bg-indigo-600 text-white p-1.5 rounded-lg hover:bg-indigo-700 transition-colors"><Plus size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar max-h-40">
                {todos.map(todo => (
                    <div key={todo.id} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleTodo(todo.id)}>
                            <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${todo.done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'}`}>
                                <CheckCircle size={14} fill="currentColor"/>
                            </div>
                            <span className={`text-sm ${todo.done ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>{todo.text}</span>
                        </div>
                        <button onClick={() => deleteTodo(todo.id)} className="text-red-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                    </div>
                ))}
                {todos.length === 0 && <p className="text-center text-xs text-gray-400 mt-4">لا توجد مهام.. استمتع يومك! 🎉</p>}
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ students, attendance, performance, selectedDate, currentUser, onNavigate }) => {
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
    const totalStudents = students.length;
    // Today's Attendance
    const today = new Date().toISOString().split('T')[0];
    const todaysAttendance = attendance.filter(a => a.date === today);
    const present = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
    const absent = todaysAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    const attendanceRate = totalStudents > 0 && todaysAttendance.length > 0 ? Math.round((present / totalStudents) * 100) : 0;

    // Performance (Term Based)
    let filteredPerf = performance;
    if (activeTerm) {
        filteredPerf = performance.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
    }
    const totalScore = filteredPerf.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
    const avgScore = filteredPerf.length > 0 ? Math.round((totalScore / filteredPerf.length) * 100) : 0;

    // Data for Charts
    const attendanceData = [
        { name: 'حاضر', value: present },
        { name: 'غائب', value: absent },
    ];

    return { totalStudents, present, absent, attendanceRate, avgScore, attendanceData };
  }, [students, attendance, performance, activeTerm]);

  // --- Top Students ---
  const topStudents = useMemo(() => {
      return students.map(s => {
          let sPerf = performance.filter(p => p.studentId === s.id);
          if (activeTerm) sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
          
          const score = sPerf.reduce((acc, p) => acc + (p.score/p.maxScore), 0);
          const avg = sPerf.length > 0 ? (score / sPerf.length) * 100 : 0;
          return { ...s, avg: Math.round(avg) };
      })
      .sort((a,b) => b.avg - a.avg)
      .slice(0, 5);
  }, [students, performance, activeTerm]);

  const handleRiskClick = (studentId: string) => {
      localStorage.setItem('nav_context_student_id', studentId);
      onNavigate('STUDENT_FOLLOWUP');
  };

  return (
    <div className="space-y-6 animate-fade-in p-6 bg-gray-50/50 min-h-full">
      
      {/* Header & Quick Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
          <div>
              <h1 className="text-2xl font-black text-gray-800">لوحة المتابعة اليومية</h1>
              <p className="text-gray-500 text-sm mt-1">نظرة شاملة على أداء وحضور الطلاب</p>
          </div>
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
              <Filter size={16} className="text-gray-400 mr-1 ml-1"/>
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

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Students */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group hover:border-indigo-200 transition-all cursor-pointer" onClick={() => onNavigate('STUDENTS')}>
              <div className="absolute right-0 top-0 w-2 h-full bg-indigo-500"></div>
              <div>
                  <p className="text-gray-500 text-xs font-bold mb-1">إجمالي الطلاب</p>
                  <h3 className="text-3xl font-black text-gray-800">{stats.totalStudents}</h3>
                  <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-full mt-2 inline-block">مسجلين في النظام</span>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <Users size={24}/>
              </div>
          </div>

          {/* Card 2: Attendance */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group hover:border-green-200 transition-all cursor-pointer" onClick={() => onNavigate('ATTENDANCE')}>
              <div className="absolute right-0 top-0 w-2 h-full bg-green-500"></div>
              <div>
                  <p className="text-gray-500 text-xs font-bold mb-1">نسبة الحضور اليوم</p>
                  <h3 className="text-3xl font-black text-gray-800">{stats.attendanceRate}%</h3>
                  <div className="flex gap-2 mt-2">
                      <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded font-bold">{stats.present} حاضر</span>
                      <span className="text-[10px] text-red-700 bg-red-50 px-2 py-0.5 rounded font-bold">{stats.absent} غائب</span>
                  </div>
              </div>
              <div className="h-16 w-16">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie data={stats.attendanceData} cx="50%" cy="50%" innerRadius={15} outerRadius={25} dataKey="value" stroke="none">
                              <Cell fill="#10b981" />
                              <Cell fill="#ef4444" />
                          </Pie>
                      </PieChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Card 3: Performance */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between relative overflow-hidden group hover:border-purple-200 transition-all cursor-pointer" onClick={() => onNavigate('PERFORMANCE')}>
              <div className="absolute right-0 top-0 w-2 h-full bg-purple-500"></div>
              <div>
                  <p className="text-gray-500 text-xs font-bold mb-1">متوسط الأداء الأكاديمي</p>
                  <h3 className="text-3xl font-black text-gray-800">{stats.avgScore}%</h3>
                  <span className="text-[10px] text-purple-500 font-bold bg-purple-50 px-2 py-0.5 rounded-full mt-2 inline-block">للفترة الحالية</span>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                  <Activity size={24}/>
              </div>
          </div>

          {/* Card 4: Quick Actions */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl shadow-lg text-white flex flex-col justify-center gap-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-gray-200"><Clock size={16}/> إجراءات سريعة</h3>
              <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => onNavigate('ATTENDANCE')} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-xs font-bold transition-colors text-center">
                      تسجيل الحضور
                  </button>
                  <button onClick={() => onNavigate('WORKS_TRACKING')} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-xs font-bold transition-colors text-center">
                      رصد الدرجات
                  </button>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Top Students */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2"><Trophy className="text-yellow-500" size={20}/> لوحة الشرف (الأعلى أداءً)</h3>
                      <button onClick={() => onNavigate('STUDENT_FOLLOWUP')} className="text-xs text-blue-600 font-bold hover:underline">عرض التفاصيل</button>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {topStudents.length > 0 ? topStudents.map((s, idx) => (
                          <div key={s.id} className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-yellow-200 hover:bg-yellow-50/30 transition-all group cursor-pointer" onClick={() => handleRiskClick(s.id)}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-sm ${idx === 0 ? 'bg-yellow-400 text-white' : idx === 1 ? 'bg-gray-300 text-gray-700' : idx === 2 ? 'bg-orange-300 text-white' : 'bg-blue-100 text-blue-600'}`}>
                                  {idx + 1}
                              </div>
                              <div className="flex-1">
                                  <h4 className="font-bold text-gray-800 text-sm group-hover:text-yellow-700 transition-colors">{s.name}</h4>
                                  <p className="text-[10px] text-gray-400">{s.className}</p>
                              </div>
                              <div className="text-right">
                                  <span className="block font-black text-lg text-gray-800">{s.avg}%</span>
                              </div>
                          </div>
                      )) : <div className="col-span-2 text-center py-8 text-gray-400 text-sm">لا توجد بيانات كافية للتقييم</div>}
                  </div>
              </div>

              {/* Attendance Chart Place holder (Simplified) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><CalendarDays className="text-teal-600"/> ملخص الحضور الأسبوعي</h3>
                  <div className="h-48 w-full bg-gray-50 rounded-xl flex items-center justify-center border border-dashed border-gray-200">
                      <p className="text-gray-400 text-sm flex items-col gap-2 flex-col items-center">
                          <TrendingUp size={24}/>
                          يتم تجميع البيانات تلقائياً عند تسجيل الحضور اليومي
                      </p>
                  </div>
              </div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-1 space-y-6">
              <TodoWidget />
              
              {/* Quick Navigation Panel */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 text-sm">روابط سريعة</h3>
                  <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => onNavigate('STUDENTS')} className="flex flex-col items-center justify-center p-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors">
                          <Users size={20} className="mb-2"/>
                          <span className="text-xs font-bold">الطلاب</span>
                      </button>
                      <button onClick={() => onNavigate('PERFORMANCE')} className="flex flex-col items-center justify-center p-3 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors">
                          <Award size={20} className="mb-2"/>
                          <span className="text-xs font-bold">الدرجات</span>
                      </button>
                      <button onClick={() => onNavigate('AI_REPORTS')} className="flex flex-col items-center justify-center p-3 bg-teal-50 text-teal-700 rounded-xl hover:bg-teal-100 transition-colors">
                          <FileQuestion size={20} className="mb-2"/>
                          <span className="text-xs font-bold">تقارير AI</span>
                      </button>
                      <button onClick={() => onNavigate('MESSAGE_CENTER')} className="flex flex-col items-center justify-center p-3 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition-colors">
                          <MessageCircle size={20} className="mb-2"/>
                          <span className="text-xs font-bold">الرسائل</span>
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
