import React, { useMemo, useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter, LineChart, Line
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, ScheduleItem, TeacherAssignment, SystemUser, Feedback, School } from '../types';
import { getSchedules, getTeacherAssignments, getFeedback, getTeachers, getSchools, getSystemUsers, getStorageStatistics } from '../services/storageService';
import { Users, Clock, AlertCircle, Award, TrendingUp, AlertTriangle, Activity, Smile, Frown, MessageSquare, Sparkles, BrainCircuit, Calendar, ChevronLeft, BookOpen, MapPin, Mail, Server, Database, ShieldCheck, Building2, CreditCard, Loader2, ArrowRight, CheckCircle, PlusCircle, Trophy } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  selectedDate?: string;
  currentUser?: SystemUser | null;
  onNavigate: (view: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
      return <SchoolManagerDashboard students={students} attendance={attendance} performance={performance} currentUser={currentUser} />;
  }

  return <TeacherDashboard students={students} attendance={attendance} performance={performance} selectedDate={effectiveDate} currentUser={currentUser} onNavigate={onNavigate} />;
};

const SystemAdminDashboard = () => {
    const [stats, setStats] = useState<any>({ schools: 0, users: 0, dbSize: 0 });

    useEffect(() => {
        const storage = getStorageStatistics();
        setStats({
            schools: getSchools().length,
            users: getSystemUsers().length,
            dbSize: storage.students + storage.attendance + storage.performance 
        });
    }, []);

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="bg-gray-900 text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                        <Server className="text-blue-400"/> لوحة قيادة النظام (System Admin)
                    </h1>
                    <p className="text-gray-400">إدارة الإعدادات التقنية، الاشتراكات، وقواعد البيانات المركزية.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-full"><Building2 size={32}/></div>
                    <div>
                        <p className="text-gray-500 text-sm font-bold">المدارس النشطة</p>
                        <h3 className="text-4xl font-bold text-gray-800">{stats.schools}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                    <div className="p-4 bg-purple-50 text-purple-600 rounded-full"><Users size={32}/></div>
                    <div>
                        <p className="text-gray-500 text-sm font-bold">المستخدمين (المعلمين/المدراء)</p>
                        <h3 className="text-4xl font-bold text-gray-800">{stats.users}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                    <div className="p-4 bg-green-50 text-green-600 rounded-full"><Database size={32}/></div>
                    <div>
                        <p className="text-gray-500 text-sm font-bold">حجم السجلات</p>
                        <h3 className="text-4xl font-bold text-gray-800">{stats.dbSize}</h3>
                    </div>
                </div>
            </div>
        </div>
    );
}

const SchoolManagerDashboard: React.FC<{students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser: SystemUser}> = ({ students, attendance, performance, currentUser }) => {
    const totalStudents = students.length;
    const avgAttendance = attendance.length > 0 
        ? Math.round((attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length / attendance.length) * 100) 
        : 0;
    const avgPerformance = performance.length > 0
        ? Math.round(performance.reduce((acc, curr) => acc + (curr.score/curr.maxScore), 0) / performance.length * 100)
        : 0;

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            <div className="bg-gradient-to-br from-indigo-900 to-blue-900 text-white p-8 rounded-2xl shadow-lg">
                <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
                    <Building2 className="text-yellow-400"/> لوحة مدير المدرسة
                </h1>
                <p className="text-blue-200">متابعة الإنجازات، التقارير، وأداء المعلمين والطلاب.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-gray-500 text-xs font-bold uppercase">إجمالي الطلاب</p>
                    <h3 className="text-3xl font-black text-indigo-900 mt-1">{totalStudents}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-gray-500 text-xs font-bold uppercase">نسبة الحضور العامة</p>
                    <h3 className={`text-3xl font-black mt-1 ${avgAttendance >= 90 ? 'text-green-600' : 'text-orange-500'}`}>{avgAttendance}%</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-gray-500 text-xs font-bold uppercase">مؤشر الأداء الأكاديمي</p>
                    <h3 className="text-3xl font-black text-blue-600 mt-1">{avgPerformance}%</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-gray-500 text-xs font-bold uppercase">المخالفات السلوكية</p>
                    <h3 className="text-3xl font-black text-red-600 mt-1">
                        {attendance.filter(a => a.behaviorStatus === 'NEGATIVE').length}
                    </h3>
                </div>
            </div>
        </div>
    );
}

const TeacherDashboard: React.FC<DashboardProps> = ({ students, attendance, performance, selectedDate, currentUser, onNavigate }) => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [myFeedback, setMyFeedback] = useState<Feedback[]>([]);

  useEffect(() => {
      setSchedules(getSchedules());
      setAssignments(getTeacherAssignments());
      
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

    const totalScore = performance.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
    const avgScore = performance.length > 0 ? Math.round((totalScore / performance.length) * 100) : 0;

    return { totalStudents, present, absent, attendanceRate, avgScore };
  }, [students, attendance, performance, selectedDate]);

  const attendanceData = useMemo(() => {
    const counts = { [AttendanceStatus.PRESENT]: 0, [AttendanceStatus.ABSENT]: 0, [AttendanceStatus.LATE]: 0, [AttendanceStatus.EXCUSED]: 0 };
    attendance.forEach(a => {
        if (counts[a.status] !== undefined) counts[a.status]++;
    });
    return [
        { name: 'حاضر', value: counts[AttendanceStatus.PRESENT] },
        { name: 'غائب', value: counts[AttendanceStatus.ABSENT] },
        { name: 'متأخر', value: counts[AttendanceStatus.LATE] },
        { name: 'عذر', value: counts[AttendanceStatus.EXCUSED] },
    ].filter(d => d.value > 0);
  }, [attendance]);

  const studentMetrics = useMemo(() => {
    return students.map(student => {
        const studentAttendance = attendance.filter(a => a.studentId === student.id);
        const totalDays = studentAttendance.length;
        const creditDays = studentAttendance.filter(a => 
            a.status === AttendanceStatus.PRESENT || 
            a.status === AttendanceStatus.LATE ||
            a.status === AttendanceStatus.EXCUSED
        ).length;
        
        const attendanceRate = totalDays > 0 ? (creditDays / totalDays) * 100 : 100;

        const studentPerformance = performance.filter(p => p.studentId === student.id);
        const totalScore = studentPerformance.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
        const avgScore = studentPerformance.length > 0 ? (totalScore / studentPerformance.length) * 100 : 0;

        const negativeBehaviors = studentAttendance.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;
        const positiveBehaviors = studentAttendance.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;

        // Calculate a meta-score for leaderboard
        const leaderboardScore = (attendanceRate * 0.4) + (avgScore * 0.4) + ((positiveBehaviors - negativeBehaviors) * 5);

        return {
            id: student.id,
            name: student.name,
            grade: student.gradeLevel,
            attendance: Math.round(attendanceRate),
            score: Math.round(avgScore),
            negativeBehaviors,
            positiveBehaviors,
            leaderboardScore: Math.round(leaderboardScore),
            count: 1
        };
    });
  }, [students, attendance, performance]);

  const atRiskStudents = studentMetrics.filter(s => s.attendance < 75 || (s.score < 50 && s.score > 0) || s.negativeBehaviors >= 3);
  const topStudents = [...studentMetrics].sort((a,b) => b.leaderboardScore - a.leaderboardScore).slice(0, 5);

  const recentActivity = useMemo(() => {
      const perfs = performance.map(p => ({
          type: 'PERFORMANCE',
          date: p.date,
          studentName: students.find(s => s.id === p.studentId)?.name || 'طالب غير معروف',
          detail: `حصل على ${p.score}/${p.maxScore} في ${p.subject}`,
          timestamp: new Date(p.date).getTime()
      }));

      const atts = attendance
        .filter(a => a.status !== AttendanceStatus.PRESENT || (a.behaviorStatus && a.behaviorStatus !== BehaviorStatus.NEUTRAL) || a.behaviorNote)
        .map(a => {
          let detail = '';
          let type = 'ATTENDANCE';
          
          if (a.status !== AttendanceStatus.PRESENT) {
              const statusText = a.status === AttendanceStatus.ABSENT ? 'غائب' : a.status === AttendanceStatus.LATE ? 'متأخر' : 'عذر';
              detail = `تم تسجيله ${statusText}`;
          }
          
          if (a.behaviorStatus === BehaviorStatus.POSITIVE) {
              type = 'BEHAVIOR_POS';
              detail = a.behaviorNote ? `سلوك إيجابي: ${a.behaviorNote}` : 'تسجيل سلوك إيجابي';
          } else if (a.behaviorStatus === BehaviorStatus.NEGATIVE) {
              type = 'BEHAVIOR_NEG';
              detail = a.behaviorNote ? `سلوك سلبي: ${a.behaviorNote}` : 'تسجيل سلوك سلبي';
          } else if (a.behaviorNote) {
              type = 'NOTE';
              detail = `ملاحظة: ${a.behaviorNote}`;
          }

          return {
            type: type,
            date: a.date,
            studentName: students.find(s => s.id === a.studentId)?.name || 'طالب غير معروف',
            detail: detail,
            timestamp: new Date(a.date).getTime()
          };
      });

      return [...perfs, ...atts]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 7);
  }, [attendance, performance, students]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm">
          <p className="font-bold text-gray-800">{payload[0].payload.name}</p>
          <p className="text-blue-600">نسبة الحضور: {payload[0].value}%</p>
          <p className="text-green-600">معدل الدرجات: {payload[1].value}%</p>
        </div>
      );
    }
    return null;
  };

  // --- WELCOME STATE (If no students) ---
  if (students.length === 0) {
      return (
        <div className="p-8 max-w-5xl mx-auto animate-fade-in flex flex-col items-center justify-center min-h-[80vh]">
           <div className="bg-white rounded-2xl p-10 shadow-xl border border-indigo-100 text-center w-full relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
               
               <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                   <Sparkles size={48} className="text-indigo-600" />
               </div>
               
               <h2 className="text-3xl font-black text-gray-800 mb-4">مرحباً بك في نظام المدرس الذكي!</h2>
               <p className="text-gray-500 mb-10 text-lg max-w-2xl mx-auto leading-relaxed">
                   يبدو أن حسابك جديد. لقد قمنا بتجهيز كل الأدوات التي تحتاجها. ابدأ بإعداد بياناتك الأساسية لتنطلق في رحلة تعليمية ذكية.
               </p>
    
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
                   <div onClick={() => onNavigate('STUDENTS')} className="cursor-pointer group bg-gradient-to-b from-blue-50 to-white border border-blue-100 hover:border-blue-300 p-6 rounded-2xl transition-all hover:shadow-lg hover:-translate-y-1">
                       <div className="bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform"><Users size={24}/></div>
                       <h3 className="font-bold text-xl text-gray-800 mb-2 group-hover:text-blue-700 transition-colors">1. إضافة الطلاب</h3>
                       <p className="text-sm text-gray-500 leading-relaxed">الخطوة الأولى هي بناء قاعدة بيانات طلابك. يمكنك إضافتهم يدوياً أو استيراد ملف Excel.</p>
                       <div className="mt-4 text-blue-600 text-xs font-bold flex items-center gap-1">ابدأ الآن <ArrowRight size={14}/></div>
                   </div>
    
                   <div onClick={() => onNavigate('SCHEDULE_VIEW')} className="cursor-pointer group bg-gradient-to-b from-purple-50 to-white border border-purple-100 hover:border-purple-300 p-6 rounded-2xl transition-all hover:shadow-lg hover:-translate-y-1">
                       <div className="bg-purple-600 w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform"><Calendar size={24}/></div>
                       <h3 className="font-bold text-xl text-gray-800 mb-2 group-hover:text-purple-700 transition-colors">2. إعداد الجدول</h3>
                       <p className="text-sm text-gray-500 leading-relaxed">سجل حصصك الأسبوعية لتمكين ميزات التحضير التلقائي ورصد الحضور حسب الحصة.</p>
                       <div className="mt-4 text-purple-600 text-xs font-bold flex items-center gap-1">ابدأ الآن <ArrowRight size={14}/></div>
                   </div>
    
                   <div onClick={() => onNavigate('CURRICULUM_MAP')} className="cursor-pointer group bg-gradient-to-b from-green-50 to-white border border-green-100 hover:border-green-300 p-6 rounded-2xl transition-all hover:shadow-lg hover:-translate-y-1">
                       <div className="bg-green-600 w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-green-200 group-hover:scale-110 transition-transform"><BookOpen size={24}/></div>
                       <h3 className="font-bold text-xl text-gray-800 mb-2 group-hover:text-green-700 transition-colors">3. توزيع المنهج</h3>
                       <p className="text-sm text-gray-500 leading-relaxed">استخدم الذكاء الاصطناعي (AI) لتوليد توزيع المنهج الدراسي وربطه بالدروس تلقائياً.</p>
                       <div className="mt-4 text-green-600 text-xs font-bold flex items-center gap-1">ابدأ الآن <ArrowRight size={14}/></div>
                   </div>
               </div>
           </div>
        </div>
      );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6">
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1" onClick={() => onNavigate('MESSAGE_CENTER')}> 
              <div>
                  <h3 className="font-bold text-lg mb-1">مركز الرسائل</h3>
                  <p className="text-teal-100 text-xs">تواصل مع أولياء الأمور بذكاء</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                  <MessageSquare size={24}/>
              </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1" onClick={() => onNavigate('AI_TOOLS')}>
              <div>
                  <h3 className="font-bold text-lg mb-1">أدوات المعلم AI</h3>
                  <p className="text-purple-100 text-xs">أنشئ اختبارات وتحضير دروس</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                  <BrainCircuit size={24}/>
              </div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1" onClick={() => onNavigate('AI_REPORTS')}>
              <div>
                  <h3 className="font-bold text-lg mb-1">تقارير ذكية</h3>
                  <p className="text-blue-100 text-xs">تحليل أداء الطلاب</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                  <Sparkles size={24}/>
              </div>
          </div>
      </div>

      {/* Today's Schedule (New Widget) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-primary"/> جدول اليوم
          </h3>
          {todaySchedule.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {todaySchedule.map((session, idx) => (
                      <div key={idx} onClick={() => onNavigate('CLASSROOM_MANAGEMENT')} className="min-w-[140px] bg-gray-50 border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors group">
                          <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] bg-white border px-2 py-0.5 rounded-full font-bold text-gray-500">حصة {session.period}</span>
                              <ArrowRight size={14} className="text-gray-300 group-hover:text-indigo-500"/>
                          </div>
                          <h4 className="font-bold text-gray-800 text-sm mb-1">{session.subjectName}</h4>
                          <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded">{session.classId}</span>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="text-center text-gray-400 py-4 text-sm bg-gray-50 rounded-lg border border-dashed flex flex-col items-center gap-2">
                  <span className="text-xs">لا توجد حصص مسجلة لهذا اليوم</span>
                  <button onClick={() => onNavigate('SCHEDULE_VIEW')} className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1"><PlusCircle size={12}/> إضافة حصص</button>
              </div>
          )}
      </div>

      {myFeedback.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm animate-slide-up mb-6">
              <h3 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                  <Mail size={20}/> رسائل وتوجيهات من مدير المدرسة
              </h3>
              <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {myFeedback.map(f => (
                      <div key={f.id} className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm text-sm">
                          <p className="text-gray-800 mb-1 leading-relaxed">{f.content}</p>
                          <div className="flex justify-between items-center text-xs text-gray-400">
                              <span>{formatDualDate(f.date)}</span>
                              {!f.isRead && <span className="bg-red-500 w-2 h-2 rounded-full"></span>}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 space-x-reverse transition-transform hover:scale-105">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">إجمالي الطلاب</p>
            <p className="text-2xl font-bold">{stats.totalStudents}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 space-x-reverse transition-transform hover:scale-105">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">حضور اليوم</p>
            <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 space-x-reverse transition-transform hover:scale-105">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">غياب اليوم</p>
            <p className="text-2xl font-bold">{stats.absent}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 space-x-reverse transition-transform hover:scale-105">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">متوسط الأداء</p>
            <p className="text-2xl font-bold">{stats.avgScore}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                    <Trophy size={18} className="text-yellow-500"/>
                    لوحة الشرف (الأفضل أداءً)
                </h3>
                <button onClick={() => onNavigate('STUDENT_FOLLOWUP')} className="text-xs text-blue-600 hover:underline">عرض الكل</button>
            </div>
            
            {topStudents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    {topStudents.map((s, idx) => (
                        <div key={s.id} className="relative bg-gradient-to-b from-yellow-50 to-white p-3 rounded-xl border border-yellow-100 flex flex-col items-center text-center shadow-sm">
                            <div className="absolute top-0 right-0 w-6 h-6 bg-yellow-400 text-white rounded-bl-xl font-bold flex items-center justify-center text-xs">
                                {idx + 1}
                            </div>
                            <div className="w-10 h-10 bg-yellow-200 text-yellow-800 rounded-full flex items-center justify-center font-bold mb-2 text-sm border-2 border-white shadow-sm">
                                {s.name.charAt(0)}
                            </div>
                            <div className="font-bold text-gray-800 text-xs line-clamp-1 w-full">{s.name}</div>
                            <div className="text-[10px] text-gray-500">{s.grade}</div>
                            <div className="mt-2 text-xs font-black text-yellow-600">{s.score}%</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-xl">
                    <p className="text-gray-400 text-sm">لا توجد بيانات كافية للترتيب</p>
                </div>
            )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                <Clock size={18} className="text-primary"/>
                توزيع الحضور الكلي
            </h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={attendanceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label
                        >
                            {attendanceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 flex flex-col">
            <h3 className="text-lg font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600"/>
                تحليل العلاقة (الحضور vs الأداء)
            </h3>
            <p className="text-xs text-gray-500 mb-4">كل نقطة تمثل طالباً. النقاط في الأعلى يميناً تمثل الطلاب المتميزين والملتزمين.</p>
            
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="attendance" name="نسبة الحضور" unit="%" domain={[0, 100]} />
                        <YAxis type="number" dataKey="score" name="معدل الدرجات" unit="%" domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Scatter name="الطلاب" data={studentMetrics.filter(d => d.attendance > 0 || d.score > 0)} fill="#8884d8">
                            {studentMetrics.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#0f766e' : entry.score >= 50 ? '#f59e0b' : '#ef4444'} />
                            ))}
                        </Scatter>
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                <Activity size={18} className="text-purple-600"/>
                أحدث النشاطات
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {recentActivity.length > 0 ? recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className={`mt-1 min-w-[24px] h-6 flex items-center justify-center rounded-full 
                            ${activity.type === 'PERFORMANCE' ? 'bg-blue-100 text-blue-600' : 
                              activity.type === 'BEHAVIOR_POS' ? 'bg-green-100 text-green-600' : 
                              activity.type === 'BEHAVIOR_NEG' ? 'bg-red-100 text-red-600' : 
                              'bg-gray-200 text-gray-600'}`}>
                            {activity.type === 'PERFORMANCE' && <Award size={14}/>}
                            {activity.type === 'BEHAVIOR_POS' && <Smile size={14}/>}
                            {activity.type === 'BEHAVIOR_NEG' && <Frown size={14}/>}
                            {activity.type === 'ATTENDANCE' && <Clock size={14}/>}
                            {activity.type === 'NOTE' && <MessageSquare size={14}/>}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{activity.studentName || 'طالب غير محدد'}</p>
                            <p className="text-xs text-gray-600">{activity.detail}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{formatDualDate(activity.date)}</p>
                        </div>
                    </div>
                )) : (
                    <div className="text-center text-gray-400 py-10">لا توجد نشاطات حديثة</div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;