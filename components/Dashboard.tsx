
import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, ScheduleItem, SystemUser, WeeklyPlanItem, AcademicTerm, Exam, Assignment } from '../types';
import { getSchedules, getWeeklyPlans, getExams, getAcademicTerms, getAssignments } from '../services/storageService';
import { Users, Clock, AlertCircle, Award, TrendingUp, Activity, Smile, Calendar, CheckSquare, Plus, Trash2, Trophy, ArrowRight, CalendarDays, FileQuestion, Filter, MessageCircle, Table, CheckCircle, PieChart as PieIcon, AlertTriangle } from 'lucide-react';
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

const GradingProgressWidget: React.FC<{ students: Student[], performance: PerformanceRecord[], currentUser?: SystemUser | null, onNavigate: (v: string) => void }> = ({ students, performance, currentUser, onNavigate }) => {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    
    useEffect(() => {
        if(currentUser) setAssignments(getAssignments('ALL', currentUser.id));
    }, [currentUser]);

    const stats = useMemo(() => {
        let missingCount = 0;
        let totalRequired = 0;
        
        // Only count if assignment is visible
        const activeAssignments = assignments.filter(a => a.isVisible && a.category !== 'YEAR_WORK');
        
        activeAssignments.forEach(assign => {
            // Find students who SHOULD have this assignment
            students.forEach(s => {
                totalRequired++;
                const hasGrade = performance.some(p => p.studentId === s.id && (p.notes === assign.id || p.title === assign.title));
                if (!hasGrade) missingCount++;
            });
        });

        const completion = totalRequired > 0 ? Math.round(((totalRequired - missingCount) / totalRequired) * 100) : 100;
        return { missingCount, completion, totalAssignments: activeAssignments.length };
    }, [assignments, students, performance]);

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full cursor-pointer hover:border-purple-200 transition-colors" onClick={() => onNavigate('WORKS_TRACKING')}>
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Table size={18} className="text-purple-600"/> تقدم الرصد
            </h3>
            <div className="flex-1 flex flex-col justify-center items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                        <circle cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-purple-600 transition-all duration-1000" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 * (1 - stats.completion / 100)} strokeLinecap="round" />
                    </svg>
                    <span className="absolute font-black text-xl text-purple-700">{stats.completion}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-bold">
                    {stats.missingCount > 0 ? `متبقي ${stats.missingCount} درجة لرصدها` : 'تم رصد جميع الدرجات!'}
                </p>
                <div className="text-[10px] text-gray-400 mt-1">{stats.totalAssignments} أعمدة (واجبات/اختبارات)</div>
            </div>
        </div>
    );
};

const AtRiskWidget: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], onStudentClick: (id: string) => void }> = ({ students, attendance, performance, onStudentClick }) => {
    const riskyStudents = useMemo(() => {
        return students.map(s => {
            const sAtt = attendance.filter(a => a.studentId === s.id);
            const sPerf = performance.filter(p => p.studentId === s.id);
            
            const totalDays = sAtt.length;
            const absent = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
            const absenceRate = totalDays > 0 ? (absent / totalDays) * 100 : 0;

            const totalScore = sPerf.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
            const avgScore = sPerf.length > 0 ? (totalScore / sPerf.length) * 100 : 100;

            const risks = [];
            if (absenceRate > 15) risks.push('غياب');
            if (avgScore < 50) risks.push('أكاديمي');

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
                            <span className="font-bold text-xs text-gray-800 block">{s.name}</span>
                            <span className="text-[10px] text-gray-500">{s.className}</span>
                        </div>
                        <div className="flex gap-1">
                            {s.risks.includes('غياب') && <span className="text-[9px] bg-white text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-bold">غياب {Math.round(s.absenceRate)}%</span>}
                            {s.risks.includes('أكاديمي') && <span className="text-[9px] bg-white text-orange-600 px-1.5 py-0.5 rounded border border-orange-200 font-bold">معدل {Math.round(s.avgScore)}%</span>}
                        </div>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <CheckCircle size={24} className="mb-2 text-green-200"/>
                        <p className="text-xs">الوضع ممتاز! لا يوجد طلاب في خطر.</p>
                    </div>
                )}
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
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
              <div>
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">إجمالي الطلاب</p>
                  <h3 className="text-3xl font-black text-gray-800">{stats.totalStudents}</h3>
              </div>
              <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                  <Users size={24}/>
              </div>
          </div>

          {/* Card 2: Attendance */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
              <div>
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">حضور اليوم</p>
                  <div className="flex items-end gap-2">
                      <h3 className="text-3xl font-black text-gray-800">{stats.attendanceRate}%</h3>
                      <span className="text-xs text-red-500 font-bold mb-1.5 bg-red-50 px-1 rounded">{stats.absent} غياب</span>
                  </div>
              </div>
              <div className="bg-green-50 p-3 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
                  <Clock size={24}/>
              </div>
          </div>

          {/* Card 3: Avg Score */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all">
              <div>
                  <p className="text-gray-400 text-xs font-bold uppercase mb-1">متوسط التحصيل</p>
                  <h3 className="text-3xl font-black text-gray-800">{stats.avgScore}%</h3>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
                  <Activity size={24}/>
              </div>
          </div>

          {/* Card 4: Action */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 rounded-2xl shadow-lg flex items-center justify-between text-white cursor-pointer hover:shadow-xl transition-all" onClick={() => onNavigate('AI_REPORTS')}>
              <div>
                  <p className="text-indigo-100 text-xs font-bold uppercase mb-1">تحليل ذكي</p>
                  <h3 className="text-lg font-bold">تقرير الأداء</h3>
                  <p className="text-[10px] text-indigo-200 mt-1">توليد تقرير بالذكاء الاصطناعي</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                  <Award size={24}/>
              </div>
          </div>
      </div>

      {/* Middle Section: Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-80">
          
          {/* 1. At Risk Widget (New) */}
          <div className="lg:col-span-1">
              <AtRiskWidget 
                  students={students} 
                  attendance={attendance} 
                  performance={performance} 
                  onStudentClick={handleRiskClick} 
              />
          </div>

          {/* 2. Grading Progress */}
          <div className="lg:col-span-1">
              <GradingProgressWidget 
                  students={students} 
                  performance={performance} 
                  currentUser={currentUser}
                  onNavigate={onNavigate}
              />
          </div>

          {/* 3. Todo List */}
          <div className="lg:col-span-1">
              <TodoWidget />
          </div>
      </div>

      {/* Bottom Section: Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <TrendingUp size={18} className="text-blue-500"/> الأداء الأكاديمي (أفضل 5 طلاب)
                  </h3>
              </div>
              <div className="h-64 w-full">
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
              </div>
          </div>

          {/* Attendance Pie */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <PieIcon size={18} className="text-green-500"/> ملخص الحضور اليومي
              </h3>
              <div className="h-64 w-full relative">
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
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-black text-gray-800">{stats.attendanceRate}%</span>
                      <span className="text-[10px] text-gray-400">نسبة الحضور</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
