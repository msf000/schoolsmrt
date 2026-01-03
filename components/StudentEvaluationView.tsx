
import React, { useMemo, useState, useEffect } from 'react';
import { Student, PerformanceRecord, Exam, ExamResult } from '../types';
import { getExams, getExamResults } from '../services/storageService';
import { BarChart, Activity, TrendingUp, Star, Target, Calendar, ClipboardList, ChevronLeft, BrainCircuit, Clock, Play, CheckCircle2, Award, Video, Globe, AlertTriangle, Zap, ShieldCheck } from 'lucide-react';
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
    <div className="space-y-10 animate-fade-in font-tajawal text-right pb-32" dir="rtl">
      {/* Dynamic Header Banner */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 pointer-events-none"><Activity size={300}/></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="text-center md:text-right">
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-5 py-1.5 rounded-full text-xs font-black border border-indigo-500/20 mb-4 uppercase tracking-widest">
                    <ShieldCheck size={14}/> مركز التميز الأكاديمي
                </div>
                <h2 className="text-5xl font-black text-white leading-tight">سجل الإنجاز <br/>والتقييم الذكي</h2>
                <p className="text-indigo-200 mt-4 font-bold text-lg max-w-md">نحلل مهاراتك ونرسم لك مسار النجاح بناءً على نواتج تعلمك.</p>
            </div>
            
            <div className="flex gap-4">
                <MetricBox label="نسبة التمكن" value={`${stats.avg}%`} color="indigo" />
                <MetricBox label="التقييمات" value={stats.count} color="emerald" />
            </div>
        </div>
      </div>

      {/* Live & Scheduled Section */}
      <div className="space-y-8">
        <div className="flex justify-between items-center px-4">
            <h3 className="text-3xl font-black text-white flex items-center gap-4">
                <Zap className="text-yellow-400 animate-pulse" size={32}/> الاختبارات والمهام النشطة
            </h3>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-2xl border border-white/5">Auto-update active</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeExams.map(exam => {
                const result = examResults.find(r => r.examId === exam.id && r.studentId === student.id);
                const status = getExamStatus(exam);
                const canStart = (status === 'LIVE' || status === 'AVAILABLE') && !result;

                return (
                    <div key={exam.id} className={`bg-slate-900/60 p-8 rounded-[3rem] border-2 shadow-xl relative group overflow-hidden transition-all duration-500 ${status === 'LIVE' && !result ? 'border-emerald-500 shadow-emerald-500/10 scale-105 z-10' : 'border-white/5 opacity-90'}`}>
                        {status === 'LIVE' && !result && (
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white px-6 py-2 text-[10px] font-black animate-pulse flex items-center gap-2 shadow-lg rounded-bl-3xl">
                                <div className="w-2 h-2 bg-white rounded-full"></div> جارٍ الآن
                            </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-8">
                            <div className={`p-5 rounded-2xl transition-all duration-500 shadow-xl ${status === 'LIVE' ? 'bg-emerald-600 text-white scale-110' : 'bg-white/5 text-indigo-400'}`}>
                                <Award size={36}/>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {result ? (
                                    <span className="bg-emerald-500 text-white px-5 py-2 rounded-2xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 border border-emerald-400/50 animate-fade-in">
                                        <CheckCircle2 size={14}/> {result.score}/{result.totalScore}
                                    </span>
                                ) : status === 'SCHEDULED' ? (
                                    <span className="bg-amber-500/20 text-amber-400 px-5 py-2 rounded-2xl text-[10px] font-black uppercase border border-amber-500/20 flex items-center gap-2">
                                        <Clock size={14}/> مجدول
                                    </span>
                                ) : status === 'EXPIRED' ? (
                                    <span className="bg-white/5 text-slate-500 px-5 py-2 rounded-2xl text-[10px] font-black border border-white/5">منتهي</span>
                                ) : (
                                    <span className="bg-indigo-600 text-white px-5 py-2 rounded-2xl text-[10px] font-black shadow-lg">متاح</span>
                                )}
                            </div>
                        </div>

                        <div className="mb-8">
                            <h4 className="text-2xl font-black text-white mb-2 leading-tight group-hover:text-indigo-400 transition-colors">{exam.title}</h4>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{exam.subject}</p>
                        </div>
                        
                        <div className="space-y-4 mb-10">
                            {exam.startDate && (
                                <div className="flex items-center gap-3 text-slate-400 bg-white/5 p-3 rounded-2xl border border-white/5 shadow-inner">
                                    <Calendar size={16} className="text-indigo-500"/>
                                    <span className="text-[11px] font-black">البدء: {new Date(exam.startDate).toLocaleString('ar-SA', {day:'numeric', month:'short', hour:'numeric', minute:'numeric'})}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-3 text-slate-400 px-2">
                                <Clock size={16}/>
                                <span className="text-[11px] font-bold">المدة المخصصة: {exam.durationMinutes} دقيقة</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {exam.isLive && exam.streamUrl && status === 'LIVE' && !result && (
                                <a href={exam.streamUrl} target="_blank" rel="noreferrer" className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/40">
                                    <Video size={18}/> دخول بث المراقبة المباشر
                                </a>
                            )}
                            
                            <button 
                                disabled={!canStart}
                                onClick={() => setSelectedExam(exam)}
                                className={`w-full py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-4 transition-all ${
                                    result ? 'bg-white/5 text-white/20 cursor-default border border-white/5' :
                                    !canStart ? 'bg-white/5 text-slate-600 cursor-default border border-white/5 opacity-50' :
                                    'bg-indigo-600 text-white shadow-2xl shadow-indigo-900/50 hover:bg-indigo-700 hover:scale-[1.03] active:scale-95'
                                }`}
                            >
                                {result ? 'تم إكمال الاختبار' : status === 'SCHEDULED' ? 'بانتظار الموعد...' : status === 'EXPIRED' ? 'انتهى وقت الحل' : <><Play size={24}/> ابدأ التحدي الآن</>}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white/5 rounded-[4rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col">
        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/20">
          <h3 className="text-2xl font-black text-white flex items-center gap-4"><ClipboardList size={28} className="text-indigo-500"/> سجل الرصد العام</h3>
          <span className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">Latest updates</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-white/5 text-white/30 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                <th className="p-8 text-center w-12 border-l border-white/5">#</th>
                <th className="p-8 border-l border-white/5">التقييم والموضوع</th>
                <th className="p-8 text-center border-l border-white/5 w-40">الدرجة</th>
                <th className="p-8 text-center w-48">نسبة الإتقان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {myPerf.map((p, idx) => {
                const ratio = p.score / p.maxScore;
                return (
                  <tr key={p.id} className="hover:bg-white/5 transition-all group">
                    <td className="p-8 text-center text-white/10 font-black text-sm border-l border-white/5 group-hover:text-indigo-500 transition-colors">{idx + 1}</td>
                    <td className="p-8 border-l border-white/5">
                      <p className="font-black text-white text-xl group-hover:text-indigo-300 transition-colors">{p.title}</p>
                      <p className="text-xs text-white/30 font-bold uppercase mt-2 tracking-widest">{p.subject} • {formatDualDate(p.date)}</p>
                    </td>
                    <td className="p-8 text-center border-l border-white/5">
                      <div className="inline-flex items-center gap-3 px-6 py-3 bg-black/40 rounded-2xl font-black text-white text-2xl border border-white/10 group-hover:border-indigo-500/50 transition-all shadow-xl">
                        {p.score} <span className="text-white/20 text-sm">/ {p.maxScore}</span>
                      </div>
                    </td>
                    <td className="p-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <span className={`px-6 py-2 rounded-full text-[10px] font-black tracking-[0.2em] uppercase shadow-2xl border-2 ${
                            ratio >= 0.9 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' :
                            ratio >= 0.75 ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' :
                            ratio >= 0.5 ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' :
                            'bg-red-500/20 text-red-400 border-red-500/20'
                         }`}>
                           {Math.round(ratio * 100)}% Mastery
                         </span>
                         <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full ${ratio >= 0.75 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{width: `${ratio*100}%`}}></div>
                         </div>
                      </div>
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

const MetricBox = ({ label, value, color }: any) => {
    const colors: any = {
        indigo: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5',
        emerald: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
    };
    return (
        <div className={`backdrop-blur-xl border px-8 py-6 rounded-[2rem] text-center shadow-2xl min-w-[140px] ${colors[color]}`}>
            <p className="text-[9px] font-black uppercase mb-2 tracking-[0.2em] opacity-60">{label}</p>
            <p className="text-4xl font-black text-white">{value}</p>
        </div>
    );
};

export default StudentEvaluationView;
