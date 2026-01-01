
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles, User, BrainCircuit, Minimize2, MessageSquare } from 'lucide-react';
import { chatWithData } from '../services/geminiService';

interface AIChatBotProps {
    students: any[];
    attendance: any[];
    performance: any[];
}

const AIChatBot: React.FC<AIChatBotProps> = ({ students, attendance, performance }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
        { role: 'ai', text: 'مرحباً بك! أنا مساعدك الذكي في النظام. كيف يمكنني مساعدتك اليوم في تحليل بيانات الطلاب أو تقديم نصائح تربوية؟' }
    ]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const aiRes = await chatWithData(userMsg, { students, attendance, performance });
            setMessages(prev => [...prev, { role: 'ai', text: aiRes }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: 'عذراً، حدث خطأ أثناء معالجة طلبك.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 left-6 z-[100] flex flex-col items-end font-tajawal">
            {isOpen ? (
                <div className="w-80 md:w-96 h-[500px] bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-200 flex flex-col overflow-hidden animate-zoom-in">
                    <div className="p-4 bg-blue-700 text-white flex justify-between items-center shadow-md shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg border border-white/20"><Bot size={20}/></div>
                            <div className="text-right">
                                <span className="font-bold text-sm block">المساعد التربوي</span>
                                <span className="text-[9px] opacity-70 uppercase tracking-widest font-bold">AI Data Assistant</span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors"><X size={20}/></button>
                    </div>
                    
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[85%] p-3 rounded-xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-50 text-blue-800 rounded-tr-none border border-blue-100' : 'bg-white shadow-sm border border-slate-200 rounded-tl-none text-slate-700'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-end">
                                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center gap-2">
                                    <Loader2 className="animate-spin text-blue-600" size={16}/>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">جاري التحليل...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="p-4 border-t bg-white flex gap-2 shrink-0 shadow-inner">
                        <input 
                            className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium transition-all"
                            placeholder="اطرح استفسارك الأكاديمي..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                        />
                        <button type="submit" disabled={loading || !input.trim()} className="p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50">
                            <Send size={18}/>
                        </button>
                    </form>
                </div>
            ) : (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group border-4 border-white"
                >
                    <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-lg border-2 border-white animate-bounce group-hover:animate-none">AI</div>
                    <MessageSquare size={24}/>
                </button>
            )}
        </div>
    );
};

export default AIChatBot;
