
import React, { useState, useEffect } from 'react';
import { SystemUser } from '../types';
import { getAISettings, saveAISettings } from '../services/storageService';
import { Bot, Sparkles, Save, UserCheck, Shield, MessageSquare, Zap, Target } from 'lucide-react';

interface Props {
    currentUser: SystemUser;
}

const TeacherAIConfig: React.FC<Props> = ({ currentUser }) => {
    const [config, setConfig] = useState(() => getAISettings());
    const [saved, setSaved] = useState(false);

    const personalities = [
        { id: 'f_friendly', name: 'ودود ومحفز', prompt: 'أنت مساعد تعليمي لطيف جداً، تستخدم الرموز التعبيرية بكثرة وتشجع الطلاب بكلمات حماسية.' },
        { id: 'f_strict', name: 'رسمي وحازم', prompt: 'أنت مساعد تعليمي رسمي جداً، لغتك العربية فصحى دقيقة، تركز على الحقائق والنتائج فقط.' },
        { id: 'f_creative', name: 'إبداعي وعصف ذهني', prompt: 'أنت مساعد تعليمي تركز على التفكير خارج الصندوق، تقترح دائماً أنشطة فنية وحركية ومشاريع مبتكرة.' }
    ];

    const handleSave = () => {
        saveAISettings(config);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        alert('تم تحديث بروتوكول الذكاء الاصطناعي بنجاح!');
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal">
            <div className="max-w-3xl mx-auto w-full space-y-8">
                <div className="text-center">
                    <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-indigo-200 mb-6">
                        <Bot size={40}/>
                    </div>
                    <h2 className="text-3xl font-black text-gray-800">تخصيص مساعد Gemini الذكي</h2>
                    <p className="text-gray-500 font-bold mt-2">قم بضبط إعدادات الذكاء الاصطناعي لتناسب أسلوبك التدريسي</p>
                </div>

                <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-8">
                    <section>
                        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2"><Sparkles className="text-purple-600"/> شخصية المحلل</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {personalities.map(p => (
                                <button 
                                    key={p.id}
                                    onClick={() => setConfig({...config, systemInstruction: p.prompt})}
                                    className={`p-5 rounded-2xl border-2 text-right transition-all ${config.systemInstruction === p.prompt ? 'bg-indigo-50 border-indigo-600 shadow-lg' : 'bg-gray-50 border-transparent hover:border-indigo-100'}`}
                                >
                                    <h4 className="font-black text-sm text-slate-800">{p.name}</h4>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2"><Target className="text-indigo-600"/> درجة الابتكار (Temperature)</h3>
                        <div className="bg-slate-50 p-6 rounded-2xl border">
                            <input 
                                type="range" min="0.1" max="1.0" step="0.1" 
                                value={config.temperature} 
                                onChange={e=>setConfig({...config, temperature: parseFloat(e.target.value)})}
                                className="w-full accent-indigo-600 h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>دقيق جداً (0.1)</span>
                                <span className="text-indigo-600 bg-white px-3 py-1 rounded-full shadow-sm">{config.temperature}</span>
                                <span>مبتكر وعشوائي (1.0)</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2"><MessageSquare className="text-emerald-600"/> التعليمات المخصصة (Prompt)</h3>
                        <textarea 
                            className="w-full p-6 bg-slate-50 border rounded-3xl h-40 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-sm text-gray-700"
                            value={config.systemInstruction}
                            onChange={e=>setConfig({...config, systemInstruction: e.target.value})}
                            placeholder="اكتب هنا كيف تريد للمساعد الذكي أن يتصرف..."
                        />
                    </section>

                    <button 
                        onClick={handleSave}
                        className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all flex justify-center items-center gap-3"
                    >
                        <Save/> حفظ إعدادات البروتوكول الذكي
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TeacherAIConfig;
