
import React, { useState, useEffect } from 'react';
import { Sparkles, Target, Zap, X, ArrowLeft, Trophy } from 'lucide-react';
import { Student } from '../types';

interface Props {
    student: Student;
    onAccept: () => void;
}

const DailyQuestTrigger: React.FC<Props> = ({ student, onAccept }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const lastShown = localStorage.getItem(`quest_shown_${student.id}`);
        const today = new Date().toISOString().split('T')[0];
        if (lastShown !== today) {
            setTimeout(() => setIsVisible(true), 2000);
            localStorage.setItem(`quest_shown_${student.id}`, today);
        }
    }, [student.id]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 font-tajawal" dir="rtl">
            <div className="bg-indigo-900 w-full max-w-md rounded-[3.5rem] shadow-[0_0_100px_rgba(79,70,229,0.5)] border border-white/10 overflow-hidden animate-zoom-in relative">
                <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Trophy size={300}/></div>
                <button onClick={() => setIsVisible(false)} className="absolute top-8 left-8 text-white/40 hover:text-white transition-colors z-20"><X/></button>
                
                <div className="p-12 text-center flex flex-col items-center gap-6 relative z-10">
                    <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-md border border-white/20 shadow-2xl animate-bounce">
                        <Sparkles className="text-yellow-400" size={48}/>
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-4xl font-black text-white tracking-tighter">مهمة اليوم الذكية!</h2>
                        <p className="text-indigo-200 font-bold">تحدٍ جديد مخصص لك بناءً على مستواك</p>
                    </div>

                    <div className="bg-black/20 p-8 rounded-[2.5rem] border border-white/5 w-full">
                        <div className="flex items-center gap-3 text-yellow-400 font-black mb-3 justify-center">
                            <Target size={20}/>
                            <span className="uppercase tracking-[0.2em] text-xs">Quest Objective</span>
                        </div>
                        <p className="text-white text-xl font-black leading-relaxed">
                            أنهِ تحدي "معركة المعرفة" اليوم وحقق نسبة إتقان أعلى من 80%
                        </p>
                        <div className="mt-6 inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-full font-black text-sm shadow-xl">
                            <Zap size={16} fill="white"/> المكافأة: 250 XP
                        </div>
                    </div>

                    <button 
                        onClick={() => { onAccept(); setIsVisible(false); }}
                        className="w-full py-5 bg-white text-indigo-900 rounded-[2rem] font-black text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        أنا جاهز للتحدي <ArrowLeft size={24}/>
                    </button>
                    
                    <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">Expires in 12 hours</p>
                </div>
            </div>
        </div>
    );
};

export default DailyQuestTrigger;
