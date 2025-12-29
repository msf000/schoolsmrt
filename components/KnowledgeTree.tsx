
import React, { useMemo } from 'react';
import { Student, PerformanceRecord, FormsDetailedResult } from '../types';
import { BrainCircuit, Star, Zap, Lock, ChevronLeft, Target, Trophy, Sparkles } from 'lucide-react';

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
        <div className="p-8 h-full flex flex-col bg-[#020617] text-white animate-fade-in font-tajawal overflow-hidden">
            <div className="mb-10 flex flex-col md:flex-row justify-between items-end shrink-0 gap-6">
                <div className="text-right">
                    <h2 className="text-4xl font-black flex items-center gap-4 justify-end">
                        خريطة التمكن المعرفي
                        <BrainCircuit className="text-indigo-400" size={48}/> 
                    </h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest mt-2">شجرة نواتج التعلم الشخصية الموثقة سحابياً</p>
                </div>
                <div className="bg-white/5 px-8 py-4 rounded-[2rem] border border-white/10 flex items-center gap-5 backdrop-blur-xl">
                    <div className="text-right">
                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">الرتبة العلمية</p>
                        <p className="text-lg font-black">{skills.filter(s=>s.isMastered).length > 5 ? 'مفكر مبدع' : 'طالب مثابر'}</p>
                    </div>
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.3)] border border-indigo-400">
                        <Target size={28}/>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-24">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {skills.map((skill, i) => (
                        <div key={i} className="group relative">
                            <div className={`p-10 rounded-[3.5rem] border-2 transition-all duration-700 relative overflow-hidden flex flex-col items-center text-center gap-8 shadow-2xl h-80 ${skill.isMastered ? 'bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/5' : 'bg-white/5 border-white/5 opacity-40 grayscale'}`}>
                                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center transition-all duration-700 shadow-2xl group-hover:scale-110 ${skill.isMastered ? 'bg-emerald-500 text-white animate-pulse' : 'bg-white/10 text-white/20'}`}>
                                    {skill.isMastered ? <Zap size={44} fill="currentColor"/> : <Lock size={44}/>}
                                </div>
                                
                                <div className="space-y-4">
                                    <h4 className={`text-xl font-black ${skill.isMastered ? 'text-white' : 'text-slate-500'}`}>{skill.name}</h4>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-40 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                            <div className={`h-full transition-all duration-[2000ms] ease-out ${skill.isMastered ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-slate-700'}`} style={{width: `${skill.mastery}%`}}></div>
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-400 tracking-widest">{skill.mastery}% مستوى الإتقان</span>
                                    </div>
                                </div>

                                {skill.isMastered && (
                                    <div className="absolute top-6 right-6 text-emerald-400">
                                        <Sparkles size={24} className="animate-spin-slow"/>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {skills.length === 0 && (
                        <div className="col-span-full py-40 text-center opacity-10 flex flex-col items-center gap-8 border-4 border-dashed border-white/5 rounded-[4rem]">
                            <BrainCircuit size={150} strokeWidth={1}/>
                            <p className="text-3xl font-black">أكمل اختباراتك المجدولة لتظهر خريطة مهاراتك هنا</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-3xl border border-white/10 px-12 py-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-12 animate-slide-up">
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981] animate-pulse"></div>
                    <span className="text-xs font-black uppercase text-indigo-100 tracking-widest">مهارة مكتسبة</span>
                 </div>
                 <div className="w-px h-8 bg-white/10"></div>
                 <div className="flex items-center gap-3 text-yellow-400">
                    <Trophy size={20}/>
                    <span className="text-xs font-black uppercase tracking-widest">أتقنت {skills.filter(s=>s.isMastered).length} مهارة هذا الفصل</span>
                 </div>
            </div>
        </div>
    );
};

export default KnowledgeTree;
