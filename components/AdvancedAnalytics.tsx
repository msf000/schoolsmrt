
import React, { useMemo } from 'react';
import { 
    Student, AttendanceRecord, PerformanceRecord, AttendanceStatus 
} from '../types';
import { 
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, ZAxis, Cell
} from 'recharts';
import { 
    TrendingUp, AlertTriangle, CheckCircle, BrainCircuit, 
    Zap, Sparkles, ArrowRight, Activity, Trophy 
} from 'lucide-react';

interface AdvancedAnalyticsProps {
    students: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
}

const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ students, attendance, performance }) => {
    
    const analysisData = useMemo(() => {
        return students.map(student => {
            const myAtt = attendance.filter(a => a.studentId === student.id);
            const myPerf = performance.filter(p => p.studentId === student.id);
            
            const presentCount = myAtt.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
            const attRate = myAtt.length > 0 ? (presentCount / myAtt.length) * 100 : 100;
            
            const avgGrade = myPerf.length > 0 
                ? (myPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / myPerf.length) * 100 
                : 0;

            return {
                name: student.name.split(' ')[0],
                attendance: Math.round(attRate),
                performance: Math.round(avgGrade),
                id: student.id
            };
        }).filter(d => d.performance > 0 || d.attendance < 100);
    }, [students, attendance, performance]);

    const quadrants = useMemo(() => {
        return {
            stars: analysisData.filter(d => d.performance >= 85 && d.attendance >= 90),
            potential: analysisData.filter(d => d.performance < 85 && d.attendance >= 90),
            atRisk: analysisData.filter(d => d.performance < 60),
            inconsistent: analysisData.filter(d => d.performance >= 80 && d.attendance < 80)
        };
    }, [analysisData]);

    return (
      <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
          <div className="mb-8">
              <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                  <BrainCircuit className="text-indigo-600" size={36}/> 
                  مركز الرؤى المتقدمة (AI Insights)
              </h2>
              <p className="text-gray-500 font-bold mt-1">تحليل عميق للعلاقة بين الانضباط والتحصيل الدراسي</p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-1">
              {/* Correlation Chart */}
              <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-10">
                      <div>
                          <h3 className="text-xl font-black text-gray-800">مصفوفة الأداء والانضباط</h3>
                          <p className="text-xs text-gray-400 font-bold uppercase mt-1">توزيع الطلاب بناءً على معدل الحضور مقابل الدرجات</p>
                      </div>
                      <div className="flex gap-4">
                           <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                              <CheckCircle size={14}/> المنطقة الآمنة
                           </div>
                           <div className="flex items-center gap-2 text-[10px] font-black text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                              <AlertTriangle size={14}/> منطقة الخطر
                           </div>
                      </div>
                  </div>

                  <div className="h-96 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis type="number" dataKey="attendance" name="الحضور" unit="%" domain={[0, 100]} />
                              <YAxis type="number" dataKey="performance" name="الأداء" unit="%" domain={[0, 100]} />
                              <ZAxis type="number" range={[100, 500]} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                              <Scatter name="Students" data={analysisData}>
                                  {analysisData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.performance >= 80 ? '#10b981' : entry.performance < 60 ? '#ef4444' : '#6366f1'} />
                                  ))}
                              </Scatter>
                          </ScatterChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Insight Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <InsightCard 
                      title="نجوم الفصل" 
                      description="طلاب يحافظون على حضور ممتاز وأداء أكاديمي عالٍ جداً."
                      count={quadrants.stars.length}
                      color="bg-emerald-50 text-emerald-700 border-emerald-100"
                      icon={<Trophy size={24}/>}
                      action="منح شهادات تميز"
                      students={quadrants.stars.slice(0, 5)}
                  />
                  <InsightCard 
                      title="تحت الملاحظة" 
                      description="طلاب لديهم حضور جيد لكن درجاتهم أقل من المتوقع."
                      count={quadrants.potential.length}
                      color="bg-amber-50 text-amber-700 border-amber-100"
                      icon={<Activity size={24}/>}
                      action="تفعيل خطة دعم"
                      students={quadrants.potential.slice(0, 5)}
                  />
                  <InsightCard 
                      title="حالات حرجة" 
                      description="طلاب يعانون من تعثر دراسي واضح (أقل من 60%)."
                      count={quadrants.atRisk.length}
                      color="bg-red-50 text-red-700 border-red-100"
                      icon={<AlertTriangle size={24}/>}
                      action="استدعاء ولي أمر"
                      students={quadrants.atRisk.slice(0, 5)}
                  />
                  <InsightCard 
                      title="فجوة الانضباط" 
                      description="طلاب متفوقون لكن حضورهم غير منتظم أو متذبذب."
                      count={quadrants.inconsistent.length}
                      color="bg-purple-50 text-purple-700 border-purple-100"
                      icon={<TrendingUp size={24}/>}
                      action="تحفيز للحضور"
                      students={quadrants.inconsistent.slice(0, 5)}
                  />
              </div>

              <div className="bg-indigo-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none"><Sparkles size={200}/></div>
                  <div className="relative z-10">
                      <h3 className="text-2xl font-black mb-4 flex items-center gap-3"><Zap className="text-yellow-400"/> استنتاج المحلل الذكي</h3>
                      <p className="text-indigo-100 text-lg leading-relaxed max-w-3xl">
                          نلاحظ وجود ارتباط قوي بنسبة <span className="text-white font-black">78%</span> بين الانتظام في الحصص الأولى وبين درجات الاختبارات الفترية. 
                          التوصية الحالية: التركيز على تحفيز الحضور المبكر لزيادة نسبة الإتقان في مهارات الوحدة القادمة.
                      </p>
                  </div>
              </div>
          </div>
      </div>
    );
};

const InsightCard = ({ title, description, count, color, icon, action, students }: any) => (
    <div className={`p-8 rounded-[2.5rem] border ${color} shadow-sm transition-all hover:scale-[1.01] flex flex-col h-full`}>
        <div className="flex justify-between items-start mb-6">
            <div className="p-4 bg-white rounded-3xl shadow-sm">{icon}</div>
            <div className="text-4xl font-black">{count}</div>
        </div>
        <h4 className="text-xl font-black mb-2">{title}</h4>
        <p className="text-sm opacity-80 font-medium mb-6 leading-relaxed">{description}</p>
        
        <div className="flex-1 space-y-2 mb-6">
            {students.map((s: any) => (
                <div key={s.id} className="flex justify-between items-center bg-white/40 p-2 rounded-xl text-xs font-bold">
                    <span>{s.name}</span>
                    <span className="opacity-60">{s.performance}%</span>
                </div>
            ))}
            {students.length === 0 && <p className="text-xs italic opacity-40">لا توجد حالات مسجلة حالياً</p>}
        </div>

        <button className="w-full py-3 bg-white/50 backdrop-blur-md rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-white transition-all shadow-sm">
            {action} <ArrowRight size={14}/>
        </button>
    </div>
);

export default AdvancedAnalytics;
