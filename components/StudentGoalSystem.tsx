
import React, { useState, useEffect } from 'react';
import { Student, StudentGoal, PerformanceRecord } from '../types';
import { Target, Plus, CheckCircle2, Clock, Trash2, Zap, Trophy, BrainCircuit, Sparkles, AlertCircle } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

const StudentGoalSystem: React.FC<{ student: Student, performance: PerformanceRecord[] }> = ({ student, performance }) => {
    const [goals, setGoals] = useState<StudentGoal[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newGoal, setNewGoal] = useState({ title: '', target: 90, category: 'GRADE' as any });

    useEffect(() => {
        const saved = localStorage.getItem(`goals_${student.id}`);
        if (saved) setGoals(JSON.parse(saved));
    }, [student.id]);

    const handleAdd = () => {
        if (!newGoal.title) return;
        const goal: StudentGoal = {
            id: `goal_${Date.now()}`,
            studentId: student.id,
            title: newGoal.title,
            targetValue: newGoal.target,
            category: newGoal.category,
            deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
        };
        const updated = [...goals, goal];
        setGoals(updated);
        localStorage.setItem(`goals_${student.id}`, JSON.stringify(updated));
        setIsAddOpen(false);
    };

    const deleteGoal = (id: string) => {
        const updated = goals.filter(g => g.id !== id);
        setGoals(updated);
        localStorage.setItem(`goals_${student.id}`, JSON.stringify(updated));
    };

    return (
        <div className="space-y-8 animate-fade-in font-tajawal text-right pb-20" dir="rtl">
            <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-4">
                        <Target className="text-rose-500" size={36}/> أهدافي التعليمية
                    </h2>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">حدد وجهتك، والذكاء الاصطناعي سيقودك إليها</p>
                </div>
                <button onClick={() => setIsAddOpen(true)} className="bg-white text-indigo-900 px-10 py-3 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                    <Plus size={20}/> تحديد هدف جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map(goal => {
                    // حساب التقدم الفعلي بناءً على البيانات
                    let progress = 0;
                    if (goal.category === 'GRADE') {
                        const relPerf = performance.filter(p => p.title.includes(goal.title) || goal.title.includes(p.title));
                        if (relPerf.length > 0) {
                            const latest = (relPerf[0].score / relPerf[0].maxScore) * 100;
                            progress = Math.min(100, Math.round((latest / goal.targetValue) * 100));
                        }
                    }

                    return (
                        <div key={goal.id} className="bg-white/5 p-8 rounded-[3rem] border border-white/5 shadow-xl hover:border-indigo-500 transition-all group relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 right-0 w-2 h-full bg-rose-500"></div>
                            <div className="flex justify-between mb-6">
                                <div className="p-3 bg-white/5 rounded-2xl text-rose-400"><Target size={24}/></div>
                                <button onClick={() => deleteGoal(goal.id)} className="text-white/20 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">{goal.title}</h3>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="bg-white/5 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">{goal.category}</span>
                                <span className="text-[10px] font-bold text-slate-500">الموعد: {formatDualDate(goal.deadline)}</span>
                            </div>

                            <div className="mt-auto space-y-3">
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-[10px] font-black text-indigo-400 uppercase">التقدم الحالي</span>
                                    <span className="text-xl font-black text-white">{progress}%</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.5)] transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="pt-4 flex justify-between items-center text-[9px] font-black text-slate-500 uppercase">
                                    <span>الهدف: {goal.targetValue}%</span>
                                    <span className={progress >= 100 ? 'text-emerald-400' : ''}>{progress >= 100 ? 'تم الإنجاز! 🏆' : 'قيد المحاولة'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {goals.length === 0 && (
                    <div className="col-span-full py-32 text-center text-slate-600 border-4 border-dashed border-white/5 rounded-[4rem] bg-white/5 flex flex-col items-center gap-6">
                        <BrainCircuit size={100} className="opacity-10"/>
                        <p className="text-2xl font-black text-white/20">لم تضع أي أهداف دراسية بعد.</p>
                    </div>
                )}
            </div>

            {isAddOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
                    <div className="bg-[#020617] w-full max-w-md rounded-[3.5rem] p-10 shadow-2xl border border-white/10 animate-zoom-in">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-white flex items-center gap-3"><Sparkles className="text-yellow-400"/> تحديد هدف ذكي</h3>
                            <button onClick={() => setIsAddOpen(false)} className="text-white/20 hover:text-white"><X/></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-indigo-300 uppercase mb-2">ما هو موضوع الهدف؟</label>
                                <input className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black" placeholder="مثلاً: التميز في الرياضيات" value={newGoal.title} onChange={e=>setNewGoal({...newGoal, title: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-indigo-300 uppercase mb-2">الدرجة المستهدفة (%)</label>
                                    <input type="number" className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black" value={newGoal.target} onChange={e=>setNewGoal({...newGoal, target: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-indigo-300 uppercase mb-2">التصنيف</label>
                                    <select className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black outline-none" value={newGoal.category} onChange={e=>setNewGoal({...newGoal, category: e.target.value as any})}>
                                        <option value="GRADE" className="bg-slate-900">أكاديمي</option>
                                        <option value="ATTENDANCE" className="bg-slate-900">انضباط</option>
                                        <option value="XP" className="bg-slate-900">نشاط</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleAdd} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-indigo-700 transition-all">تثبيت الهدف الآن</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const X = ({ size }: any) => <svg width={size||24} height={size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;

export default StudentGoalSystem;
