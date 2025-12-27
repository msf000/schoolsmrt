
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
            <div className="mb-10 flex justify-between items-end shrink-0">
                <div>
                    <h2 className="text-4xl font-black flex items-center gap-4">
                        <BrainCircuit className="text-indigo-400" size={48}/> خريطة التمكن المعرفي
                    </h2>
                    <p className="text-slate-400 font-bold uppercase tracking-widest mt-2">شجرة نواتج التعلم الشخصية</p>
                </div>
                <div className="bg-white/5 px-6 py-3 rounded-[1.5rem] border border-white/10 flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[8px] font-black text-indigo-400 uppercase">الرتبة المعرفية</p>
                        <p className="text-sm font-black">{skills.filter(s=>s.isMastered).length > 5 ? 'مفكر مبدع' : 'طالب مثابر'}</p>
                    </div>
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
                        <Target size={20}/>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {skills.map((skill, i) => (
                        <div key={i} className="group relative">
                            {/* Visual Tree Node */}
                            <div className={`p-8 rounded-[3rem] border-2 transition-all duration-500 relative overflow-hidden flex flex-col items-center text-center gap-6 shadow-2xl ${skill.isMastered ? 'bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/10' : 'bg-white/5 border-white/10 opacity-60'}`}>
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-2xl ${skill.isMastered ? 'bg-emerald-500 text-white animate-pulse' : 'bg-white/10 text-white/20'}`}>
                                    {skill.isMastered ? <Zap size={36} fill="currentColor"/> : <Lock size={36}/>}
                                </div>
                                
                                <div>
                                    <h4 className={`text-xl font-black mb-2 ${skill.isMastered ? 'text-white' : 'text-slate-500'}`}>{skill.name}</h4>
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                            <div className={`h-full transition-all duration-1000 ${skill.isMastered ? 'bg-emerald-500' : 'bg-slate-700'}`} style={{width: `${skill.mastery}%`}}></div>
                                        </div>
                                        <span className="text-[10px] font-black opacity-40">{skill.mastery}%</span>
                                    </div>
                                </div>

                                {skill.isMastered && (
                                    <div className="absolute top-4 right-4 text-emerald-400">
                                        <Sparkles size={20}/>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {skills.length === 0 && (
                        <div className="col-span-full py-40 text-center opacity-10">
                            <BrainCircuit size={150} className="mx-auto mb-6"/>
                            <p className="text-3xl font-black">أكمل اختباراتك لتظهر خريطة مهاراتك هنا</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 bg-indigo-900/90 backdrop-blur-xl border border-white/10 px-10 py-5 rounded-full shadow-2xl flex items-center gap-8">
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
                    <span className="text-xs font-black uppercase text-indigo-100">مهارة متقنة</span>
                 </div>
                 <div className="w-px h-6 bg-white/10"></div>
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <span className="text-xs font-black uppercase text-indigo-400">قيد التطوير</span>
                 </div>
                 <div className="w-px h-6 bg-white/10"></div>
                 <div className="flex items-center gap-3 text-yellow-400">
                    <Trophy size={16}/>
                    <span className="text-xs font-black uppercase">أتقنت {skills.filter(s=>s.isMastered).length} مهارة</span>
                 </div>
            </div>
        </div>
    );
};

export default KnowledgeTree;
