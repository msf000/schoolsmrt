import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus } from '../types';
import { Users, Clock, AlertCircle, Award } from 'lucide-react';

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

  return (
    <div className="space-y-6 animate-fade-in p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">لوحة التحكم</h2>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 space-x-reverse">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">إجمالي الطلاب</p>
            <p className="text-2xl font-bold">{stats.totalStudents}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 space-x-reverse">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">حضور اليوم</p>
            <p className="text-2xl font-bold">{stats.attendanceRate}%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 space-x-reverse">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">غياب اليوم</p>
            <p className="text-2xl font-bold">{stats.absent}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 space-x-reverse">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full">
            <Award size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">متوسط الأداء</p>
            <p className="text-2xl font-bold">{stats.avgScore}%</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">توزيع الحضور الكلي</h3>
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

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80 flex flex-col justify-center items-center text-center">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">تحليلات الأداء</h3>
            <p className="text-gray-500">
                (يمكن إضافة المزيد من الرسوم البيانية هنا لتمثيل تطور درجات الطلاب مع مرور الوقت)
            </p>
            <div className="mt-4 w-full h-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                    data={students.slice(0, 5).map(s => {
                        const sPerf = performance.filter(p => p.studentId === s.id);
                        const avg = sPerf.length > 0 
                            ? sPerf.reduce((a, b) => a + (b.score/b.maxScore)*100, 0) / sPerf.length 
                            : 0;
                        return { name: s.name.split(' ')[0], score: Math.round(avg) };
                    })}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Bar dataKey="score" fill="#0f766e" name="متوسط الدرجات %" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;