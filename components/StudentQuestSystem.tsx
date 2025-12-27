
import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { generateWeeklyQuests } from '../services/geminiService';
import { updateStudent } from '../services/storageService';
import { 
    Zap, Trophy, Sparkles, Loader2, CheckCircle2, 
    ArrowRight, Target, Flame, Ghost
} from 'lucide-react';

interface StudentQuestSystemProps {
    student: Student;
}

const StudentQuestSystem: React.FC<StudentQuestSystemProps> = ({ student }) => {
    const [quests, setQuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    // Fix: Remove incorrect use of new Set() with a function argument. Use useState lazy initialization instead.
    const [claimedIds, setClaimedIds] = useState<Set<string>>(() => {
        const saved = localStorage.getItem(`claimed_quests_${student.id}`);
        if (saved) {
            try {
                return new Set<string>(JSON.parse(saved));
            } catch (e) {
                return new Set<string>();
            }
        }
        return new Set<string>();
    });

    const loadQuests = async () => {
        setLoading(true);
        try {
            const result = await generateWeeklyQuests(student.gradeLevel || 'الصف الأول المتوسط', 'العامة');
            if (result.quests) setQuests(result.quests);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuests();
    }, [student.gradeLevel]);

    const handleClaim = async (quest: any) => {
        if (claimedIds.has(quest.id)) return;
        
        const newSet = new Set(claimedIds);
        newSet.add(quest.id);
        setClaimedIds(newSet);
        localStorage.setItem(`claimed_quests_${student.id}`, JSON.stringify(Array.from(newSet)));
        
        const updatedStudent = { 
            ...student, 
            xp: (student.xp || 0) + quest.xp,
            streak: (student.streak || 0) + 1
        };
        await updateStudent(updatedStudent);
        alert(`بطل! تمت إضافة ${quest.xp} نقطة XP إلى رصيدك.`);
    };

    return (
        <div className="space-y-8 animate-fade-in font-tajawal">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-4"><Target className="text-indigo-400" size={36}/> المهام الأسبوعية (AI Quests)</h2>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">أنجز المهام وارتقِ بمستواك</p>
                </div>
                <button onClick={loadQuests} disabled={loading} className="p-3 bg-white/5 text-indigo-400 rounded-2xl hover:bg-white/10 transition-all">
                    {loading ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quests.map((q) => (
                    <div key={q.id} className={`bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden transition-all ${claimedIds.has(q.id) ? 'opacity-50 grayscale scale-95' : 'hover:border-indigo-500 hover:-translate-y-2'}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                        
                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className="text-5xl group-hover:scale-110 transition-transform duration-500">{q.icon || '🎯'}</div>
                            <div className="bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-black shadow-lg shadow-indigo-900/40">+{q.xp} XP</div>
                        </div>

                        <h3 className="text-xl font-black text-white mb-2 relative z-10">{q.title}</h3>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 relative z-10">{q.description}</p>

                        <div className="relative z-10">
                            {claimedIds.has(q.id) ? (
                                <div className="flex items-center justify-center gap-2 text-emerald-400 font-black py-4 bg-emerald-400/5 rounded-2xl border border-emerald-400/20 animate-fade-in">
                                    <CheckCircle2 size={24}/> تمت المهمة بنجاح
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleClaim(q)}
                                    className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    إنجاز المهمة واستلام XP <ArrowRight size={20}/>
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {quests.length === 0 && !loading && (
                    <div className="col-span-full py-32 text-center text-slate-500 font-bold border-4 border-dashed border-white/5 rounded-[4rem] bg-white/5 animate-pulse">
                        <Ghost size={80} className="mx-auto mb-6 opacity-10"/>
                        <p className="text-2xl">لا توجد مهام جديدة حالياً.</p>
                        <p className="text-sm opacity-50 mt-2">ترقب تحديات الأسبوع القادم!</p>
                    </div>
                )}
            </div>

            <div className="bg-gradient-to-r from-indigo-900/40 via-indigo-900/20 to-transparent p-12 rounded-[3.5rem] border border-white/10 flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black shadow-[0_0_40px_rgba(79,70,229,0.4)]">
                    <Flame fill="currentColor" size={48}/>
                </div>
                <div className="relative z-10 flex-1 text-center md:text-right">
                    <h3 className="text-3xl font-black text-white mb-2">سلسلة الإنجاز الرهيبة</h3>
                    <p className="text-indigo-200 font-bold text-lg">أنجزت حتى الآن {student.streak || 0} مهمة متتالية. استمر للحصول على لقب "الأسطوري"!</p>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-700 ${i <= (student.streak || 0) ? 'bg-orange-50 border-orange-400 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 border-white/10 text-white/10'}`}>
                            <Zap size={20} fill={i <= (student.streak || 0) ? "currentColor" : "none"}/>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StudentQuestSystem;
