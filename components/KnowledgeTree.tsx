
import React, { useMemo } from 'react';
import { Student, PerformanceRecord, FormsDetailedResult } from '../types';
import { BrainCircuit, Star, Zap, Lock, ChevronLeft, Target, Trophy, Sparkles, Award } from 'lucide-react';

interface Props {
    student: Student;
    performance: PerformanceRecord[];
    formsResults: FormsDetailedResult[];
}

const KnowledgeTree: React.FC<Props> = ({ student, performance, formsResults }) => {
    
    const skills = useMemo(() => {
        const masteryMap: Record<string, { total: number, correct: number }> = {};
        
        formsResults.forEach(res => {
            const studentRes = res.studentResponses[student.id];
            if (studentRes) {
                res.questions.forEach(q => {
                    const skill = q.learningOutcome;
                    if (!masteryMap[skill]) masteryMap[skill] = { total: 0, correct: 0 };
                    masteryMap[skill].total++;
                    if (studentRes.answers[q.id] === '✔') masteryMap[skill].correct++;
                });
            }
        });

        return Object.entries(masteryMap).map(([name, stats]) => ({
            name,
            mastery: Math.round((stats.correct / stats.total) * 100),
            isMastered: (stats.correct / stats.total) >= 0.75
        }));
    }, [student, formsResults]);

    return (
        <div className="p-10 h-full flex flex-col bg-slate-950 text-white animate-fade-in font-tajawal overflow-hidden rounded-[4rem] border border-white/5 shadow-2xl relative">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
            
            <div className="relative z-10 mb-12 flex flex-col md:flex-row justify-between items-end shrink-0 gap-8">
                <div className="text-right space-y-2">
                    <h2 className="text-5xl font-black flex items-center gap-5 justify-end tracking-tighter">
                        خريطة التمكن المعرفي
                        <div className="p-4 bg-indigo-600 rounded-3xl shadow-[0_0_50px_rgba(79,70,229,0.4)]"><BrainCircuit size={40}/></div>
                    </h2>
                    <p className="text-indigo-300 font-bold uppercase tracking-[0.2em] text-xs">AI-DRIVEN COMPETENCY MAPPING SYSTEM</p>
                </div>
                <div className="bg-white/5 px-10 py-5 rounded-[2.5rem] border border-white/10 flex items-center gap-6 backdrop-blur-2xl shadow-2xl">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">الحالة العلمية</p>
                        <p className="text-xl font-black text-white">{skills.filter(s=>s.isMastered).length > 5 ? 'مفكر استراتيجي' : 'طالب طموح'}</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl border border-indigo-400/30">
                        <Award size={32}/>
                    </div>
                </div>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar pr-4 pb-32">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                    {skills.map((skill, i) => (
                        <div key={i} className="group relative">
                            <div className={`p-12 rounded-[4rem] border-2 transition-all duration-700 relative overflow-hidden flex flex-col items-center text-center gap-10 shadow-2xl h-[400px] ${skill.isMastered ? 'bg-indigo-600/10 border-indigo-500/40 shadow-indigo-500/5' : 'bg-white/5 border-white/5 opacity-40 grayscale'}`}>
                                <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 shadow-2xl group-hover:scale-110 ${skill.isMastered ? 'bg-indigo-600 text-white animate-pulse' : 'bg-white/5 text-white/20'}`}>
                                    {skill.isMastered ? <Zap size={56} fill="currentColor"/> : <Lock size={56}/>}
                                </div>
                                <div className="space-y-6 w-full">
                                    <h4 className={`text-2xl font-black leading-tight ${skill.isMastered ? 'text-white' : 'text-slate-500'}`}>{skill.name}</h4>
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner p-0.5">
                                            <div className={`h-full transition-all duration-[2000ms] ease-out rounded-full ${skill.isMastered ? 'bg-gradient-to-r from-indigo-50 to-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-slate-700'}`} style={{width: `${skill.mastery}%`}}></div>
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-400 tracking-[0.3em] uppercase">{skill.mastery}% Mastery Level</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {skills.length === 0 && (
                        <div className="col-span-full py-48 text-center opacity-10 flex flex-col items-center gap-10 border-4 border-dashed border-white/10 rounded-[5rem]">
                            <Target size={180} strokeWidth={1}/>
                            <p className="text-4xl font-black italic tracking-tighter">بانتظار تسجيل نواتج تعلمك الأولى</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KnowledgeTree;
