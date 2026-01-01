
import React, { useMemo } from 'react';
import { Student, PerformanceRecord } from '../types';
import { BarChart, Activity, TrendingUp, Star, Target, Calendar, ClipboardList, ChevronLeft } from 'lucide-react';
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
    <div className="space-y-6 animate-fade-in font-tajawal text-right">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            <Activity className="text-blue-600" size={24}/> سجل الإنجاز الأكاديمي
          </h2>
          <p className="text-slate-500 text-xs mt-1">عرض مفصل لمستوى التمكن في نواتج التعلم.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-blue-50 border border-blue-100 px-6 py-2 rounded-lg text-center">
            <p className="text-[10px] font-bold text-blue-500 uppercase mb-1 tracking-wider">المعدل العام</p>
            <p className="text-xl font-bold text-blue-700">{stats.avg}%</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 px-6 py-2 rounded-lg text-center">
            <p className="text-[10px] font-bold text-emerald-500 uppercase mb-1 tracking-wider">إجمالي التقييمات</p>
            <p className="text-xl font-bold text-emerald-700">{stats.count}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-700 flex items-center gap-3 text-sm"><ClipboardList size={18} className="text-blue-600"/> كشف الدرجات التفصيلي</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">الأحدث أولاً</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-widest border-b">
                <th className="p-4 text-center w-12 border-l">م</th>
                <th className="p-4 border-l">التاريخ</th>
                <th className="p-4 border-l">المادة / التقييم</th>
                <th className="p-4 text-center border-l">الدرجة</th>
                <th className="p-4 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myPerf.map((p, idx) => {
                const ratio = p.score / p.maxScore;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors h-14">
                    <td className="p-4 text-center text-slate-400 font-mono text-xs border-l">{idx + 1}</td>
                    <td className="p-4 text-slate-500 text-xs font-mono border-l">{formatDualDate(p.date)}</td>
                    <td className="p-4 border-l">
                      <p className="font-bold text-slate-700 text-sm">{p.title}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{p.subject}</p>
                    </td>
                    <td className="p-4 text-center border-l">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-md font-bold text-slate-700 text-sm">
                        {p.score} <span className="text-slate-300 text-[10px]">/ {p.maxScore}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold shadow-sm border ${
                        ratio >= 0.9 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        ratio >= 0.75 ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        ratio >= 0.5 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {ratio >= 0.9 ? 'ممتاز' : ratio >= 0.75 ? 'جيد جداً' : ratio >= 0.5 ? 'مقبول' : 'دعم مطلوب'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {myPerf.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-300 font-bold italic">لا توجد سجلات درجات متاحة للعرض حالياً.</td>
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
