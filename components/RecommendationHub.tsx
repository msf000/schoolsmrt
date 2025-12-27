
import React, { useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus } from '../types';
import { Lightbulb, ArrowRight, Zap, AlertCircle, TrendingUp, Trophy, UserPlus, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
    students: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
}

const RecommendationHub: React.FC<Props> = ({ students, attendance, performance }) => {
    const navigate = useNavigate();

    const recommendations = useMemo(() => {
        const recs = [];
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
                        title: `تراجع مفاجئ لـ ${s.name.split(' ')[0]}`,
                        desc: `انخفضت درجته بنسبة ${Math.round((prev - last) * 100)}% في آخر تقييم. يحتاج مراجعة سريعة.`,
                        action: () => navigate('/followup', { state: { studentId: s.id } }),
                        icon: <AlertCircle className="text-red-500" />
                    });
                }
            }
            
            // 2. اكتشاف التميز
            if (sPerf.length > 0 && (sPerf[0].score / sPerf[0].maxScore) >= 0.95) {
                recs.push({
                    type: 'SUCCESS',
                    title: `إبداع مستمر من ${s.name.split(' ')[0]}`,
                    desc: `حقق الدرجة الكاملة في "${sPerf[0].title}". اقترح منحه وسام التميز.`,
                    action: () => navigate('/badges'),
                    icon: <Trophy className="text-yellow-500" />
                });
            }
        });

        // 3. تحليل حضور الفصل
        const classStats = Array.from(new Set(students.map(s => s.className))).map(cls => {
            const classStudents = students.filter(s => s.className === cls);
            const classAtt = attendance.filter(a => classStudents.some(s => s.id === a.studentId) && a.date === today);
            return { cls, count: classAtt.length, total: classStudents.length };
        });

        classStats.forEach(stat => {
            if (stat.total > 0 && stat.count / stat.total < 0.8) {
                recs.push({
                    type: 'WARNING',
                    title: `غياب مرتفع في فصل ${stat.cls}`,
                    desc: `نسبة الحضور اليوم ${Math.round((stat.count / stat.total) * 100)}% فقط. يفضل إرسال رسائل تذكير للأهالي.`,
                    action: () => navigate('/messages'),
                    icon: <Zap className="text-orange-500" />
                });
            }
        });

        return recs.slice(0, 5);
    }, [students, attendance, performance]);

    if (recommendations.length === 0) return null;

    return (
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden relative">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Lightbulb size={24}/></div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800">مقترحات تربوية ذكية</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">AI Recommendation Engine</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {recommendations.map((rec, i) => (
                    <div key={i} className="group flex items-start gap-6 p-5 rounded-[2rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 cursor-pointer" onClick={rec.action}>
                        <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">{rec.icon}</div>
                        <div className="flex-1">
                            <h4 className="font-black text-slate-800 text-sm mb-1">{rec.title}</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{rec.desc}</p>
                        </div>
                        <ArrowRight size={16} className="text-slate-300 mt-2 group-hover:text-indigo-600 group-hover:translate-x-[-4px] transition-all"/>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecommendationHub;
