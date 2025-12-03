import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter 
} from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus } from '../types';
import { Users, Clock, AlertCircle, Award, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard: React.FC<DashboardProps> = ({ students, attendance, performance }) => {

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const today = new Date().toISOString().split('T')[0];
    const todaysAttendance = attendance.filter(a => a.date === today);
    
    const present = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
    const absent = todaysAttendance.filter(a => a.status === AttendanceStatus.ABSENT).length;
    
    const attendanceRate = totalStudents > 0 ? Math.round((present / totalStudents) * 100) : 0;

    // Calculate average score across all performances
    const totalScore = performance.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
    const avgScore = performance.length > 0 ? Math.round((totalScore / performance.length) * 100) : 0;

    return { totalStudents, present, absent, attendanceRate, avgScore };
  }, [students, attendance, performance]);

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

  // Data for Correlation Chart (Attendance vs Performance)
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

        return {
            id: student.id,
            name: student.name,
            grade: student.gradeLevel,
            attendance: Math.round(attendanceRate),
            score: Math.round(avgScore),
            count: 1 // Weight for scatter
        };
    });
  }, [students, attendance, performance]);

  const atRiskStudents = studentMetrics.filter(s => s.attendance < 75 || (s.score < 50 && s.score > 0));

  const recentActivity = useMemo(() => {
      // Combine and sort latest 5 actions (Attendance or Performance)
      const perfs = performance.map(p => ({
          type: 'PERFORMANCE',
          date: p.date,
          studentName: students.find(s => s.id === p.studentId)?.name || 'طالب غير معروف',
          detail: `حصل على ${p.score}/${p.maxScore} في ${p.subject}`,
          timestamp: new Date(p.date).getTime()
      }));

      // Group attendance by day/student is too much, let's just pick latest ABSENT/LATE as interesting events
      const atts = attendance
        .filter(a => a.status !== AttendanceStatus.PRESENT)
        .map(a => ({
          type: 'ATTENDANCE',
          date: a.date,
          studentName: students.find(s => s.id === a.studentId)?.name || 'طالب غير معروف',
          detail: `تم تسجيله ${a.status}`,
          timestamp: new Date(a.date).getTime()
      }));

      return [...perfs, ...atts]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5);
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
      <h2 className="text-2xl font-bold text-gray-800 mb-4">لوحة التحكم</h2>
      
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
                                <th className="p-3">الحضور</th>
                                <th className="p-3">الأداء الأكاديمي</th>
                                <th className="p-3 rounded-l-lg">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {atRiskStudents.slice(0, 5).map(s => (
                                <tr key={s.id}>
                                    <td className="p-3 font-bold">{s.name}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${s.attendance < 75 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {s.attendance}%
                                        </span>
                                    </td>
                                    <td className="p-3">
                                         <span className={`px-2 py-1 rounded text-xs font-bold ${s.score < 50 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {s.score}%
                                        </span>
                                    </td>
                                    <td className="p-3 text-xs text-gray-500">
                                        {s.attendance < 75 && 'غياب مرتفع'}
                                        {s.attendance < 75 && s.score < 50 && ' و '}
                                        {s.score < 50 && 'تحصيل ضعيف'}
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
                        <div className={`mt-1 w-2 h-2 rounded-full ${activity.type === 'PERFORMANCE' ? 'bg-green-500' : 'bg-red-500'}`}></div>
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