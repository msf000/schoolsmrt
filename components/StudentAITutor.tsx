
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, Sparkles, BrainCircuit, User, Volume2, Book, Zap, ChevronLeft } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface Props {
    student: any;
}

const StudentAITutor: React.FC<Props> = ({ student }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
        { role: 'ai', text: `أهلاً يا بطل! أنا معلمك الذكي. شفت إن نمط تعلمك "${student.learningStyle || 'قيد الاكتشاف'}"، وعشان كذا راح أشرح لك الدروس بطريقة تناسبك جداً. تبي أشرح لك شيء معين؟` }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `أنت معلم خصوصي ذكي سعودي لطيف جداً ومحفز. الطالب الذي تتحدث معه اسمه ${student.name} ونمط تعلمه هو ${student.learningStyle || 'UNKNOWN'}. 
            قم بشرح أي موضوع يطلبه بأسلوب يناسب نمطه (مثلاً لو بصري استخدم وصف للصور، لو حركي اطلب منه تجربة شيء). 
            اجعل الردود قصيرة وممتعة ومحفزة. سؤال الطالب: ${userMsg}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { temperature: 0.8 }
            });
            
            setMessages(prev => [...prev, { role: 'ai', text: response.text || "عذراً، أحتاج لثانية للتفكير." }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: "حدث خطأ في الاتصال، تأكد من الإنترنت." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-24 lg:bottom-10 left-6 z-[100] flex flex-col items-end font-tajawal">
            {isOpen ? (
                <div className="w-[350px] md:w-[400px] h-[550px] bg-[#020617] border border-white/10 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-zoom-in">
                    <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center shadow-xl relative overflow-hidden shrink-0">
                        <div className="absolute top-0 right-0 p-2 opacity-10"><BrainCircuit size={80}/></div>
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                                <Bot size={24}/>
                            </div>
                            <div>
                                <h3 className="font-black text-sm">المعلم الذكي (AI Tutor)</h3>
                                <p className="text-[10px] text-indigo-100 uppercase tracking-widest font-black">نمط التعلم: {student.learningStyle || 'طالب متميز'}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors relative z-10"><X size={20}/></button>
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#020617]">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none shadow-lg font-bold' : 'bg-slate-900 text-indigo-100 rounded-bl-none border border-white/5 font-medium'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-900 p-4 rounded-3xl border border-white/5 flex items-center gap-3">
                                    <Loader2 className="animate-spin text-indigo-400" size={16}/>
                                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">المعلم يفكر...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="p-5 bg-slate-950 border-t border-white/10 flex gap-3 shrink-0">
                        <input 
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold placeholder:text-slate-600"
                            placeholder="اسألني أي شيء في المنهج..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                        />
                        <button type="submit" disabled={loading || !input.trim()} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-900/40 hover:bg-indigo-700 transition-all disabled:opacity-50">
                            <Send size={20}/>
                        </button>
                    </form>
                </div>
            ) : (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-[2rem] shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group border-4 border-slate-950"
                >
                    <div className="absolute -top-1 -right-1 bg-yellow-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border-2 border-slate-950 animate-bounce group-hover:animate-none">AI</div>
                    <Bot size={32}/>
                </button>
            )}
        </div>
    );
};

export default StudentAITutor;
