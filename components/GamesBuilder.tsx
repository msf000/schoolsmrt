
import React, { useState, useEffect } from 'react';
import { InteractiveGame, SystemUser, Subject, GameType } from '../types';
import { getGames, saveGame, deleteGame, getSubjects, getTeacherAssignments } from '../services/storageService';
import { generateGameContent } from '../services/geminiService';
import { 
    Gamepad2, Plus, Sparkles, Loader2, Trash2, Play, Save, 
    Puzzle, Layers, GraduationCap, ChevronLeft, ArrowLeft, X 
} from 'lucide-react';

const GamesBuilder: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'CREATE'>('LIST');
    const [games, setGames] = useState<InteractiveGame[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [myClasses, setMyClasses] = useState<string[]>([]);

    const [form, setForm] = useState<Partial<InteractiveGame>>({
        title: '', subject: '', type: 'MATCHING', targetClass: '', xpReward: 100
    });

    useEffect(() => {
        if (currentUser?.id) {
            setGames(getGames(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
            setMyClasses(Array.from(new Set(getTeacherAssignments(currentUser.id).map(a => a.classId))));
        }
    }, [currentUser, view]);

    const handleGenerate = async () => {
        if (!form.subject || !form.title || !form.type) return;
        setIsGenerating(true);
        try {
            const content = await generateGameContent(form.subject, form.title, form.type);
            if (content) {
                const newGame: InteractiveGame = {
                    id: `game_${Date.now()}`,
                    teacherId: currentUser.id,
                    title: form.title!,
                    subject: form.subject!,
                    type: form.type as GameType,
                    content: content,
                    xpReward: form.xpReward || 100,
                    targetClass: form.targetClass!,
                    createdAt: new Date().toISOString()
                };
                await saveGame(newGame);
                setView('LIST');
                alert('تم توليد اللعبة بنجاح ونشرها للطلاب!');
            }
        } catch (e) {
            alert('فشل في التوليد الذكي للعبة.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal pb-24" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Gamepad2 className="text-indigo-600" size={36}/> مصنع الألعاب الذكي
                    </h2>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">توليد أنشطة تفاعلية بالذكاء الاصطناعي</p>
                </div>
                <button onClick={() => setView(view === 'LIST' ? 'CREATE' : 'LIST')} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition-all">
                    {view === 'LIST' ? <><Plus size={20}/> ابتكار لعبة</> : <><ArrowLeft size={20}/> العودة للمستودع</>}
                </button>
            </div>

            {view === 'LIST' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                    {games.map(game => (
                        <div key={game.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col h-72">
                            <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
                            <div className="flex justify-between mb-6">
                                <div className={`p-3 rounded-2xl ${game.type === 'MATCHING' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {game.type === 'MATCHING' ? <Puzzle size={24}/> : <Layers size={24}/>}
                                </div>
                                <button onClick={() => { if(confirm('حذف اللعبة؟')){ deleteGame(game.id); setGames(getGames(currentUser.id)); } }} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                            </div>
                            <h3 className="font-black text-xl text-slate-800 mb-2 truncate">{game.title}</h3>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">{game.subject} • {game.targetClass}</p>
                            <div className="mt-auto flex justify-between items-center">
                                <span className="text-xs font-black text-indigo-600 flex items-center gap-1"><Sparkles size={14}/> {game.xpReward} XP</span>
                                <button className="p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-black transition-all"><Play size={18}/></button>
                            </div>
                        </div>
                    ))}
                    {games.length === 0 && (
                        <div className="col-span-full py-40 text-center opacity-10">
                            <Gamepad2 size={120} className="mx-auto mb-4"/>
                            <p className="text-3xl font-black text-indigo-900">لم تبتكر أي ألعاب بعد</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="max-w-2xl mx-auto w-full bg-white p-10 rounded-[3.5rem] border shadow-2xl animate-slide-up">
                    <h3 className="text-2xl font-black text-slate-800 mb-8 border-b pb-6 flex items-center gap-3"><Sparkles className="text-indigo-600"/> تخصيص النشاط التفاعلي</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">موضوع اللعبة (أدخل عنوان الدرس)</label>
                            <input className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner" placeholder="مثلاً: المجموعة الشمسية، أنواع الخبر..." value={form.title} onChange={e=>setForm({...form, title: e.target.value})}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">المادة</label>
                                <select className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none shadow-inner" value={form.subject} onChange={e=>setForm({...form, subject: e.target.value})}>
                                    <option value="">-- اختر المادة --</option>
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">الفصل المستهدف</label>
                                <select className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none shadow-inner" value={form.targetClass} onChange={e=>setForm({...form, targetClass: e.target.value})}>
                                    <option value="">-- كل فصولي --</option>
                                    {myClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-4">اختر ميكانيكية اللعبة</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={()=>setForm({...form, type: 'MATCHING'})} className={`p-8 rounded-3xl border-4 flex flex-col items-center gap-4 transition-all ${form.type==='MATCHING'?'bg-indigo-600 border-indigo-200 text-white shadow-xl scale-105':'bg-slate-50 border-transparent text-slate-400 hover:bg-indigo-50'}`}>
                                    <Puzzle size={40}/>
                                    <span className="font-black text-sm">توصيل المصطلحات</span>
                                </button>
                                <button onClick={()=>setForm({...form, type: 'SORTING'})} className={`p-8 rounded-3xl border-4 flex flex-col items-center gap-4 transition-all ${form.type==='SORTING'?'bg-emerald-600 border-emerald-200 text-white shadow-xl scale-105':'bg-slate-50 border-transparent text-slate-400 hover:bg-emerald-50'}`}>
                                    <Layers size={40}/>
                                    <span className="font-black text-sm">تصنيف العناصر</span>
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={handleGenerate} 
                            disabled={isGenerating || !form.title || !form.subject}
                            className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={24}/> : <Sparkles size={24}/>}
                            {isGenerating ? 'جاري العصف الذهني وبناء الأكواد...' : 'توليد النشاط بالذكاء الاصطناعي'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GamesBuilder;
