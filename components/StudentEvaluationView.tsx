
import React, { useMemo } from 'react';
import { Student, PerformanceRecord } from '../types';
import { BarChart, Activity, TrendingUp, Star, Target, Calendar, ClipboardList } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface Props {
  student: Student;
  performance: PerformanceRecord[];
}

const StudentEvaluationView: React.FC<Props> = ({ student, performance }) => {
  const myPerf = useMemo(() => 
    performance.filter(p => p.studentId === student.id).sort((a,b) => b.date.localeCompare(a.date)),
  [student, performance]);

  const stats = useMemo(() => {
    if (myPerf.length === 0) return { avg: 0, count: 0, highest: 0 };
    const avg = Math.round(myPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / myPerf.length * 100);
    const highest = Math.round(Math.max(...myPerf.map(p => (p.score / p.maxScore) * 100)));
    return { avg, count: myPerf.length, highest };
  }, [myPerf]);

  return (
    <div className="space-y-8 animate-fade-in font-tajawal text-right" dir="rtl">
      <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-4">
            <Activity className="text-emerald-500" size={36}/> سجل الإنجاز الأكاديمي
          </h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">تتبع درجاتك ومستوى إتقانك للمواد</p>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-3xl text-center">
            <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">المعدل العام</p>
            <p className="text-2xl font-black text-emerald-500">{stats.avg}%</p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-3xl text-center">
            <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">إجمالي التقييمات</p>
            <p className="text-2xl font-black text-indigo-500">{stats.count}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
          <h3 className="font-black text-white flex items-center gap-3"><ClipboardList size={20} className="text-indigo-400"/> تفاصيل الدرجات</h3>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الأحدث أولاً</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                <th className="p-6">التاريخ</th>
                <th className="p-6">التقييم / المادة</th>
                <th className="p-6 text-center">الدرجة</th>
                <th className="p-6 text-center">المستوى</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {myPerf.map((p) => {
                const ratio = p.score / p.maxScore;
                return (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-6 text-slate-500 text-xs font-mono">{formatDualDate(p.date)}</td>
                    <td className="p-6">
                      <p className="font-black text-white text-sm group-hover:text-indigo-400 transition-colors">{p.title}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{p.subject}</p>
                    </td>
                    <td className="p-6 text-center">
                      <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                        <span className="text-lg font-black text-white">{p.score}</span>
                        <span className="text-[10px] text-slate-500">/ {p.maxScore}</span>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black shadow-lg ${
                        ratio >= 0.9 ? 'bg-emerald-600 text-white shadow-emerald-900/20' :
                        ratio >= 0.75 ? 'bg-indigo-600 text-white shadow-indigo-900/20' :
                        ratio >= 0.5 ? 'bg-amber-600 text-white shadow-amber-900/20' :
                        'bg-red-600 text-white shadow-red-900/20'
                      }`}>
                        {ratio >= 0.9 ? 'ممتاز' : ratio >= 0.75 ? 'جيد جداً' : ratio >= 0.5 ? 'مقبول' : 'يحتاج دعم'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {myPerf.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-20 text-center text-slate-600 font-bold italic">لا توجد درجات مسجلة في ملفك حالياً.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentEvaluationView;
