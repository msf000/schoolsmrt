
import React, { useState, useEffect } from 'react';
import { WeeklyChallenge, SystemUser } from '../types';
import { getChallenges, saveChallenge, deleteChallenge, getTeacherAssignments } from '../services/storageService';
import { Trophy, Plus, Trash2, Zap, CheckCircle, X, Loader2, Sparkles, Star } from 'lucide-react';

const ChallengesManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
    const [myClasses, setMyClasses] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState<Partial<WeeklyChallenge>>({
        title: '', description: '', rewardXp: 500, type: 'ATTENDANCE', targetClass: '', isActive: true
    });

    useEffect(() => {
        setChallenges(getChallenges(currentUser.id));
        setMyClasses(Array.from(new Set(getTeacherAssignments(currentUser.id).map(a => a.classId))));
    }, [currentUser]);

    const handleSave = async () => {
        if (!form.title || !form.targetClass) return;
        setLoading(true);
        const newChallenge: WeeklyChallenge = {
            id: `ch_${Date.now()}`,
            title: form.title!,
            description: form.description || '',
            rewardXp: form.rewardXp || 500,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            targetClass: form.targetClass!,
            isActive: true,
            type: form.type as any
        };
        await saveChallenge(newChallenge, currentUser.id);
        setChallenges(getChallenges(currentUser.id));
        setIsModalOpen(false);
        setLoading(false);
    };

    return (
        <div className="p-6 h-full bg-gray-50 flex flex-col animate-fade-in font-tajawal">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3"><Trophy className="text-yellow-500"/> مديـر التحديات</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase">خلق بيئة تعليمية تنافسية</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition-all">
                    <Plus size={20}/> تحدي جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                {challenges.map(ch => (
                    <div key={ch.id} className="bg-white p-8 rounded-[2.5rem] border shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Zap size={24}/></div>
                            <button onClick={() => { deleteChallenge(ch.id, currentUser.id); setChallenges(getChallenges(currentUser.id)); }} className="text-gray-200 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">{ch.title}</h3>
                        <p className="text-xs text-gray-400 font-bold mb-4">{ch.targetClass} • ينتهي: {ch.endDate.split('T')[0]}</p>
                        <div className="flex items-center gap-2 text-indigo-600 font-black text-lg mb-6">
                            <Star fill="currentColor" size={18}/> {ch.rewardXp} XP
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
                            <CheckCircle size={12}/> {ch.isActive ? 'تحدي نشط حالياً' : 'مكتمل'}
                        </div>
                    </div>
                ))}
                {challenges.length === 0 && (
                    <div className="col-span-full py-24 text-center text-gray-300 opacity-50 border-4 border-dashed rounded-[3rem]">
                        <Trophy size={80} className="mx-auto mb-4"/>
                        <p className="text-xl font-black">لم تطلق أي تحديات بعد</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-zoom-in">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-gray-800">إطلاق تحدي جديد</h3>
                            <button onClick={() => setIsModalOpen(false)}><X/></button>
                        </div>
                        <div className="space-y-6">
                            <div><label className="text-[10px] font-black text-gray-400 uppercase">عنوان التحدي</label><input className="w-full p-3 border rounded-xl bg-gray-50" value={form.title} onChange={e=>setForm({...form, title: e.target.value})} placeholder="مثلاً: أسبوع بلا غياب"/></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase">الفصل المستهدف</label><select className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={form.targetClass} onChange={e=>setForm({...form, targetClass: e.target.value})}><option value="">-- اختر --</option>{myClasses.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase">قيمة الجائزة (XP)</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50" value={form.rewardXp} onChange={e=>setForm({...form, rewardXp: Number(e.target.value)})}/></div>
                            <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl flex justify-center items-center gap-2">
                                {loading ? <Loader2 className="animate-spin"/> : <Sparkles/>} إطلاق التحدي فوراً
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChallengesManager;
