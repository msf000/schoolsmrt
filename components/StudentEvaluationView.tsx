
import React, { useMemo, useState, useEffect } from 'react';
import { Student, PerformanceRecord, Exam, ExamResult, ExamType, AchievementMethod } from '../types';
import { fetchPerformance, getExams, getExamResults, getStudents } from '../services/storageService';
import { Activity, Target, CheckCircle2, Award, Zap, ShieldCheck, FileText, TrendingUp, Medal, Star } from 'lucide-react';
import StudentQuizPlayer from './StudentQuizPlayer';

interface Props {
  student: Student;
  performance: PerformanceRecord[];
}

const StudentEvaluationView: React.FC<Props> = ({ student, performance: initialPerf }) => {
  const [activeExams, setActiveExams] = useState<Exam[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>(initialPerf);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  useEffect(() => {
    loadData();
  }, [student]);

  const loadData = async () => {
    const [allExams, allResults, allPerf] = await Promise.all([
        getExams(student.createdById),
        getExamResults(),
        fetchPerformance()
    ]);
    setActiveExams(allExams.filter(e => e.isActive));
    setExamResults(allResults.filter(r => r.studentId === student.id));
    setPerformance(allPerf.filter(p => p.studentId === student.id));
  };

  const gpa = useMemo(() => {
    if (performance.length === 0) return 0;
    const totalPct = performance.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
    return Math.round((totalPct / performance.length) * 100);
  }, [performance]);

  const rank = useMemo(() => {
      const allStudents = getStudents().filter(s => s.className === student.className);
      const scores = allStudents.map(s => {
          const sP = getStudents().find(x => x.id === s.id)?.xp || 0;
          return { id: s.id, score: sP };
      }).sort((a,b) => b.score - a.score);
      return scores.findIndex(s => s.id === student.id) + 1;
  }, [student]);

  if (selectedExam) {
    return <StudentQuizPlayer exam={selectedExam} student={student} onComplete={() => { setSelectedExam(null); loadData(); }} />;
  }

  return (
    <div className="space-y-10 animate-fade-in font-tajawal text-right pb-32" dir="rtl">
      {/* Header Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-indigo-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={250}/></div>
              <div className="relative z-10">
                  <h2 className="text-4xl font-black mb-2">تقرير الإنجاز الأكاديمي</h2>
                  <p className="text-indigo-300 font-bold text-sm uppercase tracking-widest mb-10">Academic Performance Analytics</p>
                  
                  <div className="flex gap-10">
                      <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">المعدل العام</p>
                          <p className="text-5xl font-black">{gpa}%</p>
                      </div>
                      <div className="w-px h-16 bg-white/10"></div>
                      <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">الترتيب في الفصل</p>
                          <p className="text-5xl font-black">#{rank}</p>
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl flex flex-col justify-center items-center text-center gap-4">
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center shadow-inner"><Medal size={40}/></div>
              <div>
                  <h3 className="text-xl font-black text-slate-800">مستوى التميز</h3>
                  <p className="text-sm font-bold text-slate-400 mt-1">{gpa >= 90 ? 'طالب عبقري' : gpa >= 70 ? 'طالب متميز' : 'طالب طموح'}</p>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                  <div className="h-full bg-amber-400 shadow-[0_0_10px_#fbbf24]" style={{width: `${gpa}%`}}></div>
              </div>
          </div>
      </div>

      {/* Grade List */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-800 flex items-center gap-3"><ClipboardList className="text-indigo-600"/> كشف الدرجات التفصيلي</h3>
              <span className="text-[10px] font-black bg-white border px-4 py-2 rounded-full text-slate-400 uppercase tracking-widest">عدد التقييمات: {performance.length}</span>
          </div>
          <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
              <table className="w-full text-right border-collapse">
                  <thead>
                      <tr className="bg-[#F8FAFC] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b h-12">
                          <th className="px-10">التقييم / المهارة</th>
                          <th className="px-10 text-center">الدرجة</th>
                          <th className="px-10 text-center">النسبة</th>
                          <th className="px-10 text-center">الحالة</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {performance.map((p, i) => (
                          <tr key={i} className="hover:bg-indigo-50/10 transition-colors h-16">
                              <td className="px-10">
                                  <p className="font-black text-slate-800 text-sm">{p.title}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">{p.subject}</p>
                              </td>
                              <td className="px-10 text-center font-black text-indigo-600 text-base">{p.score} <span className="text-xs text-slate-300 font-bold">/ {p.maxScore}</span></td>
                              <td className="px-10 text-center font-black text-slate-400 text-sm">{Math.round((p.score/p.maxScore)*100)}%</td>
                              <td className="px-10 text-center">
                                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${p.score/p.maxScore >= 0.9 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                      {p.score/p.maxScore >= 0.9 ? 'إتقان تام' : 'إتقان جيد'}
                                  </span>
                              </td>
                          </tr>
                      ))}
                      {performance.length === 0 && (
                          <tr><td colSpan={4} className="py-20 text-center text-slate-300 font-bold italic">لا توجد درجات مرصودة حالياً.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Action Area: Exams */}
      <div className="space-y-6">
          <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3"><Zap className="text-indigo-600"/> الاختبارات النشطة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeExams.map(exam => {
                  const hasDone = examResults.some(r => r.examId === exam.id && r.isAchieved);
                  return (
                      <div key={exam.id} className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col group transition-all hover:scale-[1.02]">
                          <div className="flex justify-between items-start mb-6">
                              <div className="p-3 bg-white/10 rounded-2xl text-indigo-400"><FileText size={24}/></div>
                              {hasDone && <span className="bg-emerald-500 text-white px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1"><CheckCircle2 size={12}/> مكتمل</span>}
                          </div>
                          <h4 className="text-xl font-black text-white mb-2">{exam.title}</h4>
                          <p className="text-slate-500 text-[10px] font-black uppercase mb-8">{exam.subject} • {exam.durationMinutes} دقيقة</p>
                          <button 
                            disabled={hasDone}
                            onClick={() => setSelectedExam(exam)}
                            className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${hasDone ? 'bg-white/5 text-white/20' : 'bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 active:scale-95'}`}
                          >
                              {hasDone ? 'تم إنهاء الاختبار' : 'بدء الاختبار الآن'}
                          </button>
                      </div>
                  );
              })}
          </div>
      </div>
    </div>
  );
};

const ClipboardList = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;

export default StudentEvaluationView;
