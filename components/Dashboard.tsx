
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter 
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus } from '../types';
import { Users, Clock, AlertCircle, Award, TrendingUp, AlertTriangle, Activity, Smile, Frown, MessageSquare, Sparkles, BrainCircuit } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  selectedDate?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard: React.FC<DashboardProps> = ({ students, attendance, performance, selectedDate }) => {
  const effectiveDate = selectedDate || new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const totalStudents = students.length;
    // Use effectiveDate for stats
    const todaysAttendance = attendance.filter(a => a.date === effectiveDate);
    
    const present = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const absent = todaysAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    
    const attendanceRate = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;

    // Calculate average score across all performances
    const totalScore = performance.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
    const avgScore = performance.length > 0 ? Math.round((totalScore / performance.length) * 100) : 0;

    return { totalStudents, present, absent, attendanceRate, avgScore };
  }, [students, attendance, performance, effectiveDate]);

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

  // Data for Correlation Chart & Risk Analysis
  const studentMetrics = useMemo(() => {
    return students.map(student => {
        // Calculate Attendance %
        const studentAttendance = attendance.filter(a => a.studentId === student.id);
        const totalDays = studentAttendance.length;
        const presentDays = studentAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 100; // Default 100 if no data

        // Calculate Performance %
        const studentPerformance = performance.filter(p => p.studentId === student.id);
        const totalScore = studentPerformance.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
        const avgScore = studentPerformance.length > 0 ? (totalScore / studentPerformance.length) * 100 : 0;

        // Calculate Negative Behavior Count
        const negativeBehaviors = studentAttendance.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;

        return {
            id: student.id,
            name: student.name,
            grade: student.gradeLevel,
            attendance: Math.round(attendanceRate),
            score: Math.round(avgScore),
            negativeBehaviors,
            count: 1
        };
    });
  }, [students, attendance, performance]);

  // Risk Logic: Low Attendance OR Low Score OR High Negative Behavior
  const atRiskStudents = studentMetrics.filter(s => s.attendance < 75 || (s.score < 50 && s.score > 0) || s.negativeBehaviors >= 3);

  const recentActivity = useMemo(() => {
      // Combine and sort latest 7 actions
      const perfs = performance.map(p => ({
          type: 'PERFORMANCE',
          date: p.date,
          studentName: students.find(s => s.id === p.studentId)?.name || 'طالب غير معروف',
          detail: `حصل على ${p.score}/${p.maxScore} في ${p.subject}`,
          timestamp: new Date(p.date).getTime()
      }));

      const atts = attendance
        .filter(a => a.status !== AttendanceStatus.PRESENT || (a.behaviorStatus && a.behaviorStatus !== BehaviorStatus.NEUTRAL))
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

  return (
    <div className="space-y-6 animate-fade-in p-6">
      
      {/* Quick Actions (AI Tools Shortcuts) - NEW SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1" onClick={() => (window as any).location.reload()}> 
              {/* Note: In real routing, use Navigate. Here simplifying. Ideally pass handleNavigate prop */}
              <div>
                  <h3 className="font-bold text-lg mb-1">مركز الرسائل</h3>
                  <p className="text-teal-100 text-xs">تواصل مع أولياء الأمور بذكاء</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                  <MessageSquare size={24}/>
              </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1">
              <div>
                  <h3 className="font-bold text-lg mb-1">أدوات المعلم AI</h3>
                  <p className="text-purple-100 text-xs">أنشئ اختبارات وتحضير دروس</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                  <BrainCircuit size={24}/>
              </div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white shadow-lg flex items-center justify-between cursor-pointer hover:shadow-xl transition-transform hover:-translate-y-1">
              <div>
                  <h3 className="font-bold text-lg mb-1">تقارير ذكية</h3>
                  <p className="text-blue-100 text-xs">تحليل أداء الطلاب</p>
              </div>
              <div className="bg-white/20 p-2 rounded-lg">
                  <Sparkles size={24}/>
              </div>
          </div>
      </div>

      <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">نظرة عامة</h2>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-bold border border-gray-200">
              {formatDualDate(effectiveDate)}
          </span>
      </div>
      
      {/* Stat Cards */}
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
        {/* At Risk Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500"/>
                طلاب يحتاجون للمتابعة
            </h3>
            {atRiskStudents.length > 0 ? (
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-red-50 text-red-800">
                            <tr>
                                <th className="p-3 rounded-r-lg">الطالب</th>
                                <th className="p-3 text-center">الحضور</th>
                                <th className="p-3 text-center">الأداء</th>
                                <th className="p-3 rounded-l-lg">ملاحظات النظام</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {atRiskStudents.slice(0, 5).map(s => (
                                <tr key={s.id}>
                                    <td className="p-3 font-bold">{s.name}</td>
                                    <td className="p-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${s.attendance < 75 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {s.attendance}%
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                         <span className={`px-2 py-1 rounded text-xs font-bold ${s.score < 50 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {s.score}%
                                        </span>
                                    </td>
                                    <td className="p-3 text-xs text-gray-500">
                                        {s.attendance < 75 && <span className="ml-1 text-red-600">غياب مرتفع.</span>}
                                        {s.score < 50 && <span className="ml-1 text-orange-600">تحصيل ضعيف.</span>}
                                        {s.negativeBehaviors >= 3 && <span className="text-red-700 font-bold bg-red-50 px-1 rounded">سلوكيات سلبية ({s.negativeBehaviors}).</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <p className="text-green-600 bg-green-50 p-4 rounded-lg text-center w-full">ممتاز! لا يوجد طلاب في دائرة الخطر حالياً.</p>
                </div>
            )}
        </div>

        {/* Attendance Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center gap-2">
                <Clock size={18} className="text-primary"/>
                توزيع الحضور الكلي
            </h3>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Correlation Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
            <h3 className="text-lg font-semibold mb-2 text-gray-700 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600"/>
                تحليل العلاقة (الحضور vs الأداء)
            </h3>
            <p className="text-xs text-gray-500 mb-4">كل نقطة تمثل طالباً. النقاط في الأعلى يميناً تمثل الطلاب المتميزين والملتزمين.</p>
            
            <div className="h-72 w-full">
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

        {/* Recent Activity */}
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
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">{activity.studentName}</p>
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
