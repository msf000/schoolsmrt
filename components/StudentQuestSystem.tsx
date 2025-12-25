
import React, { useState, useEffect, useMemo } from 'react';
import { Student, WeeklyChallenge, SystemUser } from '../types';
import { generateWeeklyQuests } from '../services/geminiService';
import { updateStudent } from '../services/storageService';
import { 
    Zap, Star, Trophy, Sparkles, Loader2, CheckCircle2, 
    ArrowRight, Bookmark, Target, ShieldCheck, Flame, ChevronLeft, Ghost
} from 'lucide-react';

interface StudentQuestSystemProps {
    student: Student;
}

const StudentQuestSystem: React.FC<StudentQuestSystemProps> = ({ student }) => {
    const [quests, setQuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());

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
        
        // Update XP locally and in DB
        const updatedStudent = { ...student, xp: (student.xp || 0) + quest.xp };
        await updateStudent(updatedStudent);
        alert(`بطل! تمت إضافة ${quest.xp} نقطة XP إلى رصيدك.`);
    };

    return (
        <div className="space-y-8 animate-fade-in font-tajawal">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-4"><Target className="text-indigo-400" size={36}/> المهام الأسبوعية</h2>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">أنجز المهام وارتقِ بمستواك</p>
                </div>
                <button onClick={loadQuests} disabled={loading} className="p-3 bg-white/5 text-indigo-400 rounded-2xl hover:bg-white/10 transition-all">
                    {loading ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quests.map((q) => (
                    <div key={q.id} className={`bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden transition-all ${claimedIds.has(q.id) ? 'opacity-50 grayscale' : 'hover:border-indigo-500'}`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform"></div>
                        
                        <div className="flex justify-between items-start mb-6">
                            <div className="text-5xl group-hover:scale-110 transition-transform">{q.icon || '🎯'}</div>
                            <div className="bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-black shadow-lg shadow-indigo-900/40">+{q.xp} XP</div>
                        </div>

                        <h3 className="text-xl font-black text-white mb-2">{q.title}</h3>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10">{q.description}</p>

                        {claimedIds.has(q.id) ? (
                            <div className="flex items-center justify-center gap-2 text-emerald-400 font-black">
                                <CheckCircle2 size={24}/> تمت المطالبة
                            </div>
                        ) : (
                            <button 
                                onClick={() => handleClaim(q)}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                إنجاز المهمة <ArrowRight size={20}/>
                            </button>
                        )}
                    </div>
                ))}

                {quests.length === 0 && !loading && (
                    <div className="col-span-full py-32 text-center text-slate-500 font-bold border-4 border-dashed border-white/5 rounded-[4rem]">
                        <Ghost size={80} className="mx-auto mb-6 opacity-10"/>
                        <p className="text-2xl">لا توجد مهام جديدة حالياً.</p>
                        <button onClick={loadQuests} className="mt-8 text-indigo-400 hover:underline">تحميل المهام الذكية (AI)</button>
                    </div>
                )}
            </div>

            <div className="bg-gradient-to-r from-indigo-900/20 to-transparent p-10 rounded-[3rem] border border-white/5 flex flex-col md:flex-row items-center gap-8 shadow-2xl">
                <div className="w-20 h-20 bg-indigo-500 rounded-[1.5rem] flex items-center justify-center text-white text-4xl font-black shadow-2xl">
                    <Flame fill="currentColor" size={40}/>
                </div>
                <div className="flex-1 text-center md:text-right">
                    <h3 className="text-2xl font-black text-white mb-1">سلسلة الإنجاز (Streak)</h3>
                    <p className="text-indigo-300 font-bold text-sm">أنجز مهمة يومية لمدة 5 أيام متتالية للحصول على وسام "المثابر"!</p>
                </div>
                <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${i <= (student.streak || 0) ? 'bg-orange-50 border-orange-400 text-white' : 'border-white/10 text-white/10'}`}>
                            <Zap size={14} fill="currentColor"/>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StudentQuestSystem;
