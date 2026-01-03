
import React, { useMemo, useState, useEffect } from 'react';
import { Student, PerformanceRecord, Exam, ExamResult } from '../types';
import { getExams, getExamResults } from '../services/storageService';
import { BarChart, Activity, TrendingUp, Star, Target, Calendar, ClipboardList, ChevronLeft, BrainCircuit, Clock, Play, CheckCircle2, Award, Video, Globe, AlertTriangle } from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import StudentQuizPlayer from './StudentQuizPlayer';

interface Props {
  student: Student;
  performance: PerformanceRecord[];
}

const StudentEvaluationView: React.FC<Props> = ({ student, performance }) => {
  const [activeExams, setActiveExams] = useState<Exam[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);

  useEffect(() => {
    if (student.createdById) {
      const allExams = getExams(student.createdById);
      setActiveExams(allExams.filter(e => e.isActive));
      setExamResults(getExamResults());
    }
  }, [student]);

  const myPerf = useMemo(() => 
    performance.filter(p => p.studentId === student.id).sort((a,b) => b.date.localeCompare(a.date)),
  [student, performance]);

  const stats = useMemo(() => {
    if (myPerf.length === 0) return { avg: 0, count: 0, highest: 0 };
    const avg = Math.round(myPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / myPerf.length * 100);
    const highest = Math.round(Math.max(...myPerf.map(p => (p.score / p.maxScore) * 100)));
    return { avg, count: myPerf.length, highest };
  }, [myPerf]);

  const getExamStatus = (exam: Exam) => {
    if (!exam.startDate || !exam.endDate) return 'AVAILABLE';
    const now = new Date();
    const start = new Date(exam.startDate);
    const end = new Date(exam.endDate);

    if (now < start) return 'SCHEDULED';
    if (now > end) return 'EXPIRED';
    return 'LIVE';
  };

  if (selectedExam) {
    return <StudentQuizPlayer exam={selectedExam} student={student} onComplete={() => { setSelectedExam(null); window.location.reload(); }} />;
  }

  return (
    <div className="space-y-8 animate-fade-in font-tajawal text-right pb-24">
      {/* Metrics Header */}
      <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Activity size={180}/></div>
        <div className="relative z-10 text-center md:text-right">
            <h2 className="text-3xl font-black text-white flex items-center justify-center md:justify-start gap-4">
                <TrendingUp className="text-indigo-400" size={32}/> مركز التميز الأكاديمي
            </h2>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">تحليل المهارات ونتائج الاختبارات الذكية</p>
        </div>
        <div className="flex gap-4 relative z-10">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-3xl text-center shadow-2xl">
            <p className="text-[10px] font-black text-indigo-400 uppercase mb-1 tracking-[0.2em]">نسبة التمكن</p>
            <p className="text-3xl font-black text-white">{stats.avg}%</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-8 py-4 rounded-3xl text-center shadow-2xl">
            <p className="text-[10px] font-black text-emerald-400 uppercase mb-1 tracking-[0.2em]">التقييمات</p>
            <p className="text-3xl font-black text-white">{stats.count}</p>
          </div>
        </div>
      </div>

      {/* Active Exams Section */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black text-white px-4 flex items-center gap-3">
            <BrainCircuit className="text-purple-400" size={24}/> الاختبارات والمهام النشطة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeExams.map(exam => {
                const result = examResults.find(r => r.examId === exam.id && r.studentId === student.id);
                const status = getExamStatus(exam);
                const canStart = status === 'LIVE' || status === 'AVAILABLE';

                return (
                    <div key={exam.id} className={`bg-slate-900/60 p-8 rounded-[3rem] border-2 shadow-xl relative group overflow-hidden transition-all ${status === 'LIVE' ? 'border-emerald-500 shadow-emerald-500/20' : 'border-white/5'}`}>
                        {status === 'LIVE' && (
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1 text-[9px] font-black animate-pulse flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div> جارٍ الآن
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                                <Award size={32}/>
                            </div>
                            {result ? (
                                <span className="bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-emerald-500/20 flex items-center gap-2">
                                    <CheckCircle2 size={12}/> {result.score}/{result.totalScore}
                                </span>
                            ) : status === 'SCHEDULED' ? (
                                <span className="bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-amber-500/20 flex items-center gap-2">
                                    <Clock size={12}/> مجدول
                                </span>
                            ) : (
                                <span className="bg-indigo-500/20 text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-indigo-500/20">
                                    متاح
                                </span>
                            )}
                        </div>

                        <h4 className="text-xl font-black text-white mb-2 truncate">{exam.title}</h4>
                        
                        <div className="space-y-2 mb-8">
                            {exam.startDate && (
                                <div className="flex items-center gap-2 text-slate-400">
                                    <Calendar size={14}/>
                                    <span className="text-[10px] font-bold">البدء: {new Date(exam.startDate).toLocaleString('ar-SA')}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-slate-400">
                                <Clock size={14}/>
                                <span className="text-[10px] font-bold">المدة: {exam.durationMinutes} دقيقة</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            {exam.isLive && exam.streamUrl && status === 'LIVE' && !result && (
                                <a href={exam.streamUrl} target="_blank" rel="noreferrer" className="w-full py-3 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-xl font-black text-[10px] flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all">
                                    <Video size={14}/> دخول بث المراقبة (Live)
                                </a>
                            )}
                            
                            <button 
                                disabled={!!result || !canStart}
                                onClick={() => setSelectedExam(exam)}
                                className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all ${
                                    result ? 'bg-white/5 text-white/20 cursor-default' :
                                    !canStart ? 'bg-white/5 text-slate-600 cursor-default border border-white/5' :
                                    'bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 active:scale-95'
                                }`}
                            >
                                {result ? 'اكتملت الإجابة' : status === 'SCHEDULED' ? 'بانتظار الموعد' : status === 'EXPIRED' ? 'انتهى الوقت' : <><Play size={18}/> ابدأ التحدي الآن</>}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Performance History List */}
      <div className="bg-white/5 rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
          <h3 className="font-black text-white flex items-center gap-3 text-lg"><ClipboardList size={20} className="text-indigo-400"/> سجل الرصد العام</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                <th className="p-6 text-center w-12 border-l border-white/5">#</th>
                <th className="p-6 border-l border-white/5">المادة والتقييم</th>
                <th className="p-6 text-center border-l border-white/5">الدرجة</th>
                <th className="p-6 text-center">النسبة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {myPerf.map((p, idx) => {
                const ratio = p.score / p.maxScore;
                return (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                    <td className="p-6 text-center text-white/20 font-black text-xs border-l border-white/5">{idx + 1}</td>
                    <td className="p-6 border-l border-white/5">
                      <p className="font-black text-white text-base">{p.title}</p>
                      <p className="text-[10px] text-white/40 font-bold uppercase mt-1">{p.subject} • {formatDualDate(p.date)}</p>
                    </td>
                    <td className="p-6 text-center border-l border-white/5">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/40 rounded-xl font-black text-white text-base border border-white/10 group-hover:border-indigo-500/50 transition-all">
                        {p.score} <span className="text-white/20 text-xs">/ {p.maxScore}</span>
                      </div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg border ${
                        ratio >= 0.9 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        ratio >= 0.75 ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        ratio >= 0.5 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {Math.round(ratio * 100)}% الإتقان
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentEvaluationView;
