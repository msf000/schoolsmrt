
import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Sparkles, User, BrainCircuit, Minimize2 } from 'lucide-react';
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
        { role: 'ai', text: 'أهلاً بك! أنا مساعدك الذكي. يمكنك سؤالي عن أداء الطلاب، الحضور، أو طلب نصائح تربوية.' }
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
        <div className="fixed bottom-6 left-6 z-[100] flex flex-col items-end">
            {isOpen ? (
                <div className="w-80 md:w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-indigo-100 flex flex-col overflow-hidden animate-zoom-in">
                    <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shadow-lg">
                        <div className="flex items-center gap-2">
                            <div className="bg-white/20 p-1.5 rounded-lg"><Bot size={20}/></div>
                            <span className="font-bold">المساعد الذكي</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-full"><X size={20}/></button>
                    </div>
                    
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-indigo-50 text-indigo-800 rounded-br-none border border-indigo-100' : 'bg-white shadow-sm border border-gray-100 rounded-bl-none text-gray-700'}`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-end">
                                <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2">
                                    <Loader2 className="animate-spin text-indigo-600" size={16}/>
                                    <span className="text-xs text-gray-400">جاري التفكير...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSend} className="p-4 border-t bg-white flex gap-2">
                        <input 
                            className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            placeholder="اسألني عن بياناتك..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                        />
                        <button type="submit" className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md">
                            <Send size={18}/>
                        </button>
                    </form>
                </div>
            ) : (
                <button 
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
                >
                    <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-bounce group-hover:animate-none">AI</div>
                    <BrainCircuit size={28}/>
                </button>
            )}
        </div>
    );
};

export default AIChatBot;
