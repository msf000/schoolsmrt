
import React, { useMemo } from 'react';
import { AttendanceRecord, Student, AttendanceStatus } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Calendar, Clock, AlertCircle, TrendingDown, TrendingUp, Info } from 'lucide-react';

interface Props {
    attendance: AttendanceRecord[];
    students: Student[];
    selectedClass: string;
}

const AttendanceTrends: React.FC<Props> = ({ attendance, students, selectedClass }) => {
    
    const dayStats = useMemo(() => {
        const counts: Record<string, { total: number, present: number }> = {
            'Sunday': { total: 0, present: 0 },
            'Monday': { total: 0, present: 0 },
            'Tuesday': { total: 0, present: 0 },
            'Wednesday': { total: 0, present: 0 },
            'Thursday': { total: 0, present: 0 }
        };

        const classStudents = new Set(students.filter(s => s.className === selectedClass).map(s => s.id));
        attendance.filter(a => classStudents.has(a.studentId)).forEach(a => {
            const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(a.date));
            if (counts[dayName]) {
                counts[dayName].total++;
                if (a.status === AttendanceStatus.PRESENT) counts[dayName].present++;
            }
        });

        return Object.entries(counts).map(([day, stats]) => ({
            name: day === 'Sunday' ? 'الأحد' : day === 'Monday' ? 'الاثنين' : day === 'Tuesday' ? 'الثلاثاء' : day === 'Wednesday' ? 'الأربعاء' : 'الخميس',
            rate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
            key: day
        }));
    }, [attendance, students, selectedClass]);

    const worstDay = useMemo(() => [...dayStats].sort((a, b) => a.rate - b.rate)[0], [dayStats]);

    return (
        <div className="space-y-8 animate-fade-in font-tajawal">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3.5rem] border shadow-sm h-[450px] flex flex-col">
                    <h3 className="text-xl font-black text-slate-800 mb-10 flex items-center gap-3"><Clock className="text-indigo-600"/> معدل الحضور حسب أيام الأسبوع</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dayStats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                <YAxis hide domain={[0, 100]} />
                                <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)'}} />
                                <Bar dataKey="rate" radius={[15, 15, 0, 0]} barSize={60}>
                                    {dayStats.map((entry, index) => (
                                        <Cell key={index} fill={entry.rate >= 90 ? '#10b981' : entry.rate >= 80 ? '#4f46e5' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-rose-50 p-8 rounded-[3rem] border border-rose-100 flex flex-col justify-center items-center text-center gap-4 shadow-sm">
                        <div className="p-4 bg-white rounded-3xl text-rose-600 shadow-sm"><TrendingDown size={32}/></div>
                        <div>
                            <h4 className="font-black text-rose-900 text-lg">يوم الذروة في الغياب</h4>
                            <p className="text-3xl font-black text-rose-600 mt-1">{worstDay?.name}</p>
                            <p className="text-xs text-rose-400 font-bold mt-2 uppercase">معدل الانضباط: {worstDay?.rate}%</p>
                        </div>
                    </div>

                    <div className="bg-indigo-900 p-8 rounded-[3rem] text-white relative overflow-hidden flex-1 flex flex-col justify-center">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Info size={120}/></div>
                        <h4 className="text-xl font-black mb-4 relative z-10">توصية النظام (AI)</h4>
                        <p className="text-sm text-indigo-100 leading-relaxed font-medium relative z-10 italic">
                            "يلاحظ زيادة في التأخر الصباحي يوم {worstDay?.name}. نقترح جدولة أنشطة تفاعلية أو مسابقات سريعة في بداية الحصة الأولى لهذا اليوم لتحفيز الحضور المبكر."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AttendanceTrends;
