
import React, { useState, useEffect } from 'react';
import { generateNarrativeInsights } from '../services/geminiService';
import { Sparkles, Bot, Loader2, TrendingUp, Info, Lightbulb, Zap } from 'lucide-react';

interface Props {
    stats: any;
}

const NarrativeAIInsights: React.FC<Props> = ({ stats }) => {
    const [insight, setInsight] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const loadInsight = async () => {
        setLoading(true);
        try {
            const res = await generateNarrativeInsights(stats);
            setInsight(res);
        } catch {
            setInsight("تعذر الوصول لمحرك الرؤى حالياً.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (stats && !insight) loadInsight();
    }, [stats]);

    return (
        <div className="bg-indigo-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl min-h-[220px] flex flex-col justify-center">
            <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 pointer-events-none">
                <Sparkles size={200}/>
            </div>
            
            <div className="relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2.5 rounded-2xl border border-white/10 backdrop-blur-md">
                            <Bot className="text-yellow-400" size={24}/>
                        </div>
                        <div>
                            <h3 className="text-xl font-black">رؤى المحلل الذكي</h3>
                            <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Real-time Data Storytelling</p>
                        </div>
                    </div>
                    <button onClick={loadInsight} disabled={loading} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <Zap size={18} className={loading ? 'animate-spin' : ''}/>
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center gap-3 animate-pulse">
                        <Loader2 className="animate-spin text-indigo-300"/>
                        <p className="text-sm font-bold text-indigo-200">جاري قراءة بيانات الفصل واستنتاج الأنماط...</p>
                    </div>
                ) : (
                    <div className="animate-slide-up">
                        <p className="text-indigo-50 text-lg leading-relaxed font-medium">
                            {insight}
                        </p>
                        <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                            <Info size={12}/> تعتمد هذه الرؤية على تحليل 100% من سجلات الشهر الحالي
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NarrativeAIInsights;
