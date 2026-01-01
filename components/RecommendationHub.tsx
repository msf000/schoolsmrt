
import React, { useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus } from '../types';
import { Lightbulb, ArrowRight, Zap, AlertCircle, TrendingUp, Trophy, UserPlus, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Recommendation {
    type: string;
    title: string;
    desc: string;
    action: () => void;
    icon: React.ReactNode;
}

interface Props {
    students: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
}

const RecommendationHub: React.FC<Props> = ({ students, attendance, performance }) => {
    const navigate = useNavigate();

    const recommendations = useMemo(() => {
        const recs: Recommendation[] = [];
        const today = new Date().toISOString().split('T')[0];

        // 1. اكتشاف تراجع المستوى
        students.forEach(s => {
            const sPerf = performance.filter(p => p.studentId === s.id).sort((a,b) => b.date.localeCompare(a.date));
            if (sPerf.length >= 2) {
                const last = sPerf[0].score / sPerf[0].maxScore;
                const prev = sPerf[1].score / sPerf[1].maxScore;
                if (last < prev - 0.2) {
                    recs.push({
                        type: 'DANGER',
                        title: `تراجع أداء: ${s.name.split(' ')[0]}`,
                        desc: `انخفضت نواتج التعلم بنسبة ${Math.round((prev - last) * 100)}% في آخر تقييم.`,
                        action: () => navigate('/followup', { state: { studentId: s.id } }),
                        icon: <AlertCircle className="text-red-500" />
                    });
                }
            }
            
            // 2. اكتشاف التميز
            if (sPerf.length > 0 && (sPerf[0].score / sPerf[0].maxScore) >= 0.95) {
                recs.push({
                    type: 'SUCCESS',
                    title: `تميز استثنائي: ${s.name.split(' ')[0]}`,
                    desc: `حقق درجة كاملة في "${sPerf[0].title}". اقترح تكريمه بوسام.`,
                    action: () => navigate('/badges'),
                    icon: <Trophy className="text-amber-500" />
                });
            }
        });

        return recs.slice(0, 4);
    }, [students, attendance, performance, navigate]);

    if (recommendations.length === 0) return null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-tajawal">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md border border-amber-100"><Lightbulb size={18}/></div>
                    <h3 className="text-sm font-bold text-slate-800">التوصيات التربوية الآلية</h3>
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">AI Hub</span>
            </div>

            <div className="divide-y divide-slate-100">
                {recommendations.map((rec, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-all cursor-pointer group" onClick={rec.action}>
                        <div className="p-2.5 bg-slate-50 rounded-lg shadow-sm border border-slate-100 group-hover:bg-white transition-colors">{rec.icon}</div>
                        <div className="flex-1">
                            <h4 className="text-xs font-bold text-slate-800 mb-0.5">{rec.title}</h4>
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{rec.desc}</p>
                        </div>
                        <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 transition-all group-hover:translate-x-[-2px]"/>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecommendationHub;
