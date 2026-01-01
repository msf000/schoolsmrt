
import React, { useState, useEffect } from 'react';
import { Student } from '../types';
import { generateWeeklyQuests } from '../services/geminiService';
import { updateStudent } from '../services/storageService';
import { 
    Zap, Trophy, Sparkles, Loader2, CheckCircle2, 
    ArrowLeft, Target, Flame, Ghost, BookOpen, ChevronLeft
} from 'lucide-react';

interface StudentQuestSystemProps {
    student: Student;
}

const StudentQuestSystem: React.FC<StudentQuestSystemProps> = ({ student }) => {
    const [quests, setQuests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [claimedIds, setClaimedIds] = useState<Set<string>>(() => {
        const saved = localStorage.getItem(`claimed_quests_${student.id}`);
        return saved ? new Set(JSON.parse(saved)) : new Set();
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
    };

    return (
        <div className="space-y-8 animate-fade-in font-tajawal pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3"><Target className="text-blue-600" size={24}/> التحديات الدراسية النشطة</h2>
                    <p className="text-slate-500 text-sm">أنجز المهام لتحصل على نقاط XP وتطور مستواك التعليمي.</p>
                </div>
                <button onClick={loadQuests} disabled={loading} className="p-2.5 bg-white border border-slate-200 text-blue-600 rounded-lg hover:bg-slate-50 transition-all shadow-sm">
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quests.map((q) => (
                    <div key={q.id} className={`bg-white p-6 rounded-xl border-2 transition-all ${claimedIds.has(q.id) ? 'opacity-50 border-slate-100 bg-slate-50' : 'border-slate-200 shadow-sm hover:border-blue-400'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="text-4xl">{q.icon || '🎯'}</div>
                            <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-[10px] font-black border border-amber-100">+{q.xp} XP</div>
                        </div>

                        <h3 className="text-base font-bold text-slate-800 mb-2">{q.title}</h3>
                        <p className="text-slate-500 text-xs leading-relaxed mb-8 h-12 line-clamp-2">{q.description}</p>

                        <div>
                            {claimedIds.has(q.id) ? (
                                <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold py-2 bg-emerald-50 rounded-lg border border-emerald-100 text-xs">
                                    <CheckCircle2 size={16}/> مكتمل بنجاح
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleClaim(q)}
                                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    إنجاز المهمة واستلام XP <ChevronLeft size={14}/>
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {quests.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center text-slate-300 font-bold border-2 border-dashed rounded-xl flex flex-col items-center justify-center bg-white">
                        <BookOpen size={48} className="mb-4 opacity-20"/>
                        <p>لا توجد تحديات متاحة لهذا الأسبوع.</p>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-inner">
                    <Flame size={32}/>
                </div>
                <div className="flex-1 text-center md:text-right">
                    <h3 className="text-lg font-bold text-slate-800 mb-1">سلسلة الالتزام والنشاط</h3>
                    <p className="text-slate-500 text-xs">لقد حافظت على نشاطك لمدة {student.streak || 0} أيام متتالية. استمر للحصول على لقب "المثابر".</p>
                </div>
                <div className="flex items-center gap-1.5">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-500 ${i <= (student.streak || 0) ? 'bg-amber-100 border-amber-400 text-amber-600' : 'bg-slate-50 border-slate-200 text-slate-200'}`}>
                            <Zap size={14} fill={i <= (student.streak || 0) ? "currentColor" : "none"}/>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StudentQuestSystem;
