
import React, { useState } from 'react';
import { SystemUser } from '../types';
import { getAISettings, saveAISettings } from '../services/storageService';
import { Bot, Sparkles, Save, MessageSquare, Target, ShieldCheck, Zap, Wand2, RefreshCw, Command, Info } from 'lucide-react';

const TeacherAIConfig: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [config, setConfig] = useState(() => getAISettings());
    const [saved, setSaved] = useState(false);

    const personalities = [
        { id: 'friendly', name: 'المحفز الودود', icon: <Sparkles className="text-amber-400"/>, prompt: 'أنت مساعد تعليمي لطيف جداً، تستخدم الرموز التعبيرية بكثرة وتشجع الطلاب بكلمات حماسية سعودية ودية.' },
        { id: 'strict', name: 'الخبير الرسمي', icon: <ShieldCheck className="text-blue-600"/>, prompt: 'أنت مساعد تعليمي رسمي جداً، لغتك العربية فصحى دقيقة، تركز على الحقائق والنتائج الأكاديمية فقط.' },
        { id: 'creative', name: 'المبتكر الإبداعي', icon: <Wand2 className="text-purple-600"/>, prompt: 'أنت مساعد تعليمي تركز على التفكير خارج الصندوق، تقترح دائماً أنشطة فنية وحركية ومشاريع مبتكرة للطلاب.' }
    ];

    const handleSave = () => {
        saveAISettings(config);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        alert('تم تحديث بروتوكول الذكاء الاصطناعي بنجاح!');
    };

    return (
        <div className="p-6 md:p-10 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-y-auto custom-scrollbar pb-20">
            <div className="max-w-4xl mx-auto w-full space-y-10">
                
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-10 rounded-[3.5rem] border shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-full bg-slate-900/5 -skew-x-12 translate-x-20"></div>
                    <div className="relative z-10 flex items-center gap-6">
                        <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-slate-200">
                            <Bot size={44}/>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800">بروتوكول Gemini الذكي</h2>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">AI System Governance & Personality</p>
                        </div>
                    </div>
                    <div className="relative z-10 flex items-center gap-3">
                        <span className="text-[10px] font-black text-indigo-500 uppercase">الحالة:</span>
                        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full border border-emerald-100 text-xs font-black">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> متصل سحابياً
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <section className="bg-white p-10 rounded-[3.5rem] border shadow-sm space-y-8">
                            <div className="flex justify-between items-center border-b pb-6">
                                <h3 className="font-black text-slate-800 text-xl flex items-center gap-3"><Zap className="text-amber-500"/> شخصية المحلل السحابي</h3>
                                <Info size={18} className="text-slate-200"/>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {personalities.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => setConfig({...config, systemInstruction: p.prompt})}
                                        className={`p-6 rounded-[2rem] border-4 text-right transition-all flex flex-col items-center gap-4 group ${config.systemInstruction === p.prompt ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:border-indigo-100'}`}
                                    >
                                        <div className={`p-4 rounded-2xl transition-colors ${config.systemInstruction === p.prompt ? 'bg-white/20 text-white' : 'bg-white text-slate-400 shadow-sm group-hover:text-indigo-600'}`}>
                                            {React.cloneElement(p.icon as React.ReactElement<any>, { size: 28 })}
                                        </div>
                                        <span className="font-black text-xs">{p.name}</span>
                                    </button>
                                ))}
                            </div>
                        </section>

                        <section className="bg-white p-10 rounded-[3.5rem] border shadow-sm space-y-8">
                            <div className="flex justify-between items-center border-b pb-6">
                                <h3 className="font-black text-slate-800 text-xl flex items-center gap-3"><Command className="text-indigo-600"/> التوجيهات البرمجية الدقيقة</h3>
                                <button onClick={() => setConfig({...config, systemInstruction: ''})} className="text-[10px] font-black text-slate-300 hover:text-rose-500 transition-colors uppercase tracking-widest">تصفير</button>
                            </div>
                            <textarea 
                                className="w-full p-8 bg-slate-50 border-none rounded-[2.5rem] h-60 outline-none focus:ring-8 focus:ring-indigo-500/5 font-bold text-sm text-slate-700 leading-relaxed transition-all shadow-inner"
                                value={config.systemInstruction}
                                onChange={e=>setConfig({...config, systemInstruction: e.target.value})}
                                placeholder="اكتب التعليمات التي يجب أن يلتزم بها الذكاء الاصطناعي عند تحليل بياناتك..."
                            />
                            <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-700">
                                <Info size={20} className="shrink-0"/>
                                <p className="text-[10px] font-bold leading-relaxed uppercase tracking-wide">تنبيه: سيتم تطبيق هذه التعليمات كبروتوكول أساسي (System Instruction) في كافة عمليات التحليل والتوليد الذكي داخل حسابك.</p>
                            </div>
                        </section>
                    </div>

                    <div className="space-y-8">
                        <section className="bg-white p-10 rounded-[3.5rem] border shadow-sm flex flex-col gap-8 h-fit">
                            <h3 className="font-black text-slate-800 text-lg flex items-center gap-3 border-b pb-4"><Target className="text-rose-500"/> الإعدادات التقنية</h3>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مستوى الابتكار (Entropy)</label>
                                        <span className="text-xs font-black text-indigo-600">{config.temperature}</span>
                                    </div>
                                    <input 
                                        type="range" min="0.1" max="1.0" step="0.1" 
                                        value={config.temperature} 
                                        onChange={e=>setConfig({...config, temperature: parseFloat(e.target.value)})}
                                        className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <p className="mt-3 text-[9px] text-slate-300 font-bold leading-relaxed">القيمة المنخفضة تمنح نتائج ثابتة، القيمة العالية تمنح نتائج أكثر إبداعاً وتنوعاً.</p>
                                </div>
                                <div className="pt-6 border-t">
                                    <button 
                                        onClick={handleSave}
                                        className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3"
                                    >
                                        <Save size={20}/> حفظ البروتوكول
                                    </button>
                                    {saved && <p className="text-center text-emerald-500 font-black text-[10px] mt-4 animate-bounce">تم الحفظ سحابياً بنجاح ✅</p>}
                                </div>
                            </div>
                        </section>

                        <div className="bg-gradient-to-br from-indigo-900 to-slate-950 p-10 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Sparkles size={150}/></div>
                             <h4 className="text-xl font-black mb-6 flex items-center gap-3"><RefreshCw className="text-amber-400" size={24}/> المزامنة التلقائية</h4>
                             <p className="text-indigo-200 text-sm leading-relaxed font-medium mb-8">يتم تطبيق هذه الإعدادات فوراً على مساعد الدردشة الذكي، محرك التحضير، ومحلل السلوك.</p>
                             <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 w-full animate-pulse shadow-[0_0_10px_#fbbf24]"></div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherAIConfig;
