
import React, { useMemo, useState, useEffect } from 'react';
import { Student, PerformanceRecord, Exam, ExamResult, ExamType, AchievementMethod } from '../types';
import { getExams, getExamResults } from '../services/storageService';
import { Activity, TrendingUp, Target, Calendar, Clock, Play, CheckCircle2, Award, Zap, ShieldCheck, HelpCircle, FileText, CheckCircle } from 'lucide-react';
import StudentQuizPlayer from './StudentQuizPlayer';

interface Props {
  student: Student;
  performance: PerformanceRecord[];
}

const StudentEvaluationView: React.FC<Props> = ({ student, performance }) => {
  const [activeExams, setActiveExams] = useState<Exam[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [filterType, setFilterType] = useState<ExamType | 'ALL'>('ALL');

  useEffect(() => {
    if (student.createdById) {
      const allExams = getExams(student.createdById);
      setActiveExams(allExams.filter(e => e.isActive));
      setExamResults(getExamResults());
    }
  }, [student]);

  const filteredExams = useMemo(() => {
      if (filterType === 'ALL') return activeExams;
      return activeExams.filter(e => e.type === filterType);
  }, [activeExams, filterType]);

  if (selectedExam) {
    return <StudentQuizPlayer exam={selectedExam} student={student} onComplete={() => { setSelectedExam(null); window.location.reload(); }} />;
  }

  return (
    <div className="space-y-10 animate-fade-in font-tajawal text-right pb-32" dir="rtl">
      {/* Header Summary */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 pointer-events-none"><ShieldCheck size={300}/></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
            <div>
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-5 py-1.5 rounded-full text-[10px] font-black border border-indigo-500/20 mb-4 uppercase tracking-widest"><Target size={12}/> منصة التقييم الذكي</div>
                <h2 className="text-5xl font-black text-white leading-tight">مركز الاختبارات <br/>والإنجاز</h2>
            </div>
            <div className="flex gap-4">
                <MetricBox label="الدرجات" value={performance.length} color="indigo" />
                <MetricBox label="المنجز" value={examResults.filter(r=>r.studentId===student.id && r.isAchieved).length} color="emerald" />
            </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-900/40 p-1 rounded-2xl border border-white/5 self-start overflow-x-auto no-scrollbar max-w-full">
          <button onClick={()=>setFilterType('ALL')} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filterType==='ALL'?'bg-indigo-600 text-white shadow-lg':'text-white/40 hover:text-white'}`}>الكل</button>
          <button onClick={()=>setFilterType(ExamType.DIAGNOSTIC)} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filterType===ExamType.DIAGNOSTIC?'bg-indigo-600 text-white shadow-lg':'text-white/40 hover:text-white'}`}>تشخيصي</button>
          <button onClick={()=>setFilterType(ExamType.PRE_TEST)} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filterType===ExamType.PRE_TEST?'bg-indigo-600 text-white shadow-lg':'text-white/40 hover:text-white'}`}>قبلي</button>
          <button onClick={()=>setFilterType(ExamType.POST_TEST)} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filterType===ExamType.POST_TEST?'bg-indigo-600 text-white shadow-lg':'text-white/40 hover:text-white'}`}>بعدي</button>
          <button onClick={()=>setFilterType(ExamType.PERIODIC)} className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filterType===ExamType.PERIODIC?'bg-indigo-600 text-white shadow-lg':'text-white/40 hover:text-white'}`}>فتري</button>
      </div>

      {/* Grid of Exams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredExams.map(exam => {
                const result = examResults.find(r => r.examId === exam.id && r.studentId === student.id);
                const achieved = result?.isAchieved;

                return (
                    <div key={exam.id} className={`bg-slate-900/60 p-8 rounded-[3rem] border-2 transition-all group relative overflow-hidden ${achieved ? 'border-emerald-500/30' : 'border-white/5'}`}>
                        <div className="flex justify-between items-start mb-8">
                            <div className={`p-4 rounded-2xl ${achieved ? 'bg-emerald-600 text-white' : 'bg-white/5 text-indigo-400'}`}>
                                {exam.type === ExamType.DIAGNOSTIC ? <HelpCircle size={24}/> : <FileText size={24}/>}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {result ? (
                                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 ${achieved ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                        {achieved ? <CheckCircle size={10}/> : <Activity size={10}/>} {achieved ? 'تم الإنجاز' : 'لم يجتز'}
                                    </span>
                                ) : (
                                    <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[9px] font-black shadow-lg">جديد</span>
                                )}
                            </div>
                        </div>

                        <div className="mb-8">
                            <h4 className="text-xl font-black text-white mb-1 leading-tight">{exam.title}</h4>
                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{exam.type} • {exam.subject}</p>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                                <ShieldCheck size={14}/>
                                <span>الاعتماد: {exam.achievementMethod === AchievementMethod.COMPLETION ? 'بمجرد الإكمال' : `الاجتياز ${exam.passingScore}%`}</span>
                            </div>
                        </div>

                        <button 
                            disabled={!!result && achieved}
                            onClick={() => setSelectedExam(exam)}
                            className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all ${
                                result && achieved ? 'bg-white/5 text-white/20 cursor-default' :
                                'bg-white text-slate-900 shadow-xl hover:scale-[1.03] active:scale-95'
                            }`}
                        >
                            {result && achieved ? 'مكتمل بنجاح' : result && !achieved ? 'إعادة المحاولة' : <><Play size={18}/> ابدأ الاختبار الآن</>}
                        </button>
                    </div>
                );
            })}
      </div>
    </div>
  );
};

const MetricBox = ({ label, value, color }: any) => {
    const colors: any = {
        indigo: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5',
        emerald: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
    };
    return (
        <div className={`backdrop-blur-xl border px-8 py-6 rounded-3xl text-center min-w-[120px] ${colors[color]}`}>
            <p className="text-[9px] font-black uppercase mb-2 opacity-60">{label}</p>
            <p className="text-3xl font-black text-white">{value}</p>
        </div>
    );
};

export default StudentEvaluationView;
