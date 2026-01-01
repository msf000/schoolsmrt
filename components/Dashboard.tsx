
import React, { useMemo, useState, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AttendanceStatus } from '../types';
import { 
    Users, CheckCircle, Target, Zap, Clock, TrendingUp, ArrowRight,
    Calendar, ShieldAlert, Sparkles, MessageSquare, Briefcase, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { getSchedules } from '../services/storageService';

const Dashboard: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser?: SystemUser | null, onNavigate: (view: string) => void }> = ({ students, attendance, performance, currentUser }) => {
  const navigate = useNavigate();

  const stats = useMemo(() => {
      const total = students.length;
      const attRate = attendance.length > 0 ? (attendance.filter(a => a.status === AttendanceStatus.PRESENT).length / attendance.length) * 100 : 0;
      const perfAvg = performance.length > 0 ? (performance.reduce((a, b) => a + (b.score / b.maxScore), 0) / performance.length) * 100 : 0;
      return { total, attRate: Math.round(attRate), perfAvg: Math.round(perfAvg) };
  }, [students, attendance, performance]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Welcome Area */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">أهلاً بك، {currentUser?.name}</h1>
            <p className="text-slate-500 text-sm mt-1">إليك ملخص سريع لأداء طلابك اليوم.</p>
        </div>
        <div className="flex gap-3">
            <button onClick={() => navigate('/attendance')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
                <CheckCircle size={16}/> رصد الحضور
            </button>
            <button onClick={() => navigate('/works')} className="px-4 py-2 border border-slate-200 text-slate-600 bg-white rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-2">
                <TrendingUp size={16}/> رصد الدرجات
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <StatCard icon={Users} label="إجمالي الطلاب" value={stats.total} color="blue" />
           <StatCard icon={CheckCircle} label="معدل الحضور" value={`${stats.attRate}%`} color="emerald" />
           <StatCard icon={Target} label="كفاءة التعلم" value={`${stats.perfAvg}%`} color="amber" />
           <StatCard icon={Zap} label="النقاط الممنوحة" value="--" color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                  {/* Fixed: Added missing 'Activity' icon to imports from lucide-react */}
                  <h3 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-600"/> نبض الحضور الأسبوعي</h3>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                        {name: 'الأحد', val: 90}, {name: 'الاثنين', val: 85}, {name: 'الثلاثاء', val: 88}, 
                        {name: 'الأربعاء', val: 92}, {name: 'الخميس', val: 95}
                    ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={12} tick={{fill: '#64748b'}} axisLine={false} />
                        <YAxis hide domain={[0, 100]} />
                        <Tooltip />
                        <Area type="monotone" dataKey="val" stroke="#2563eb" fill="#dbeafe" strokeWidth={3} />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* Quick Agenda */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Calendar size={18} className="text-blue-600"/> الجدول الدراسي</h3>
              <div className="space-y-3 flex-1">
                  {[1, 2, 3].map(i => (
                      <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center group hover:border-blue-200 transition-colors">
                          <div>
                              <p className="text-xs font-bold text-slate-800">الحصة {i}</p>
                              <p className="text-[10px] text-slate-500">مادة الرياضيات - فصل 1/أ</p>
                          </div>
                          <Clock size={14} className="text-slate-300" />
                      </div>
                  ))}
              </div>
              <button onClick={() => navigate('/schedule')} className="mt-4 text-xs font-bold text-blue-600 hover:underline flex items-center justify-center gap-1">
                  عرض الجدول الكامل <ArrowRight size={14}/>
              </button>
          </div>
      </div>

      {/* Focus Students */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShieldAlert size={18} className="text-red-500"/> حالات تستوجب المتابعة</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.slice(0, 3).map(s => (
                  <div key={s.id} onClick={() => navigate('/followup', {state: {studentId: s.id}})} className="p-4 border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-500">{s.name.charAt(0)}</div>
                          <div>
                              <p className="text-sm font-bold text-slate-800">{s.name}</p>
                              <p className="text-[10px] text-slate-500">{s.className}</p>
                          </div>
                      </div>
                      <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-[9px] font-bold">تراجع أداء</span>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        amber: 'text-amber-600 bg-amber-50',
        indigo: 'text-indigo-600 bg-indigo-50'
    };
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${colors[color]}`}>
                <Icon size={22} />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                <h3 className="text-xl font-bold text-slate-800">{value}</h3>
            </div>
        </div>
    );
};

export default Dashboard;
