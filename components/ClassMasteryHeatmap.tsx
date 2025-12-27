
import React, { useMemo } from 'react';
import { Student, PerformanceRecord, Assignment } from '../types';
import { Target, Info, Sparkles, TrendingUp, AlertCircle, ChevronLeft } from 'lucide-react';

interface Props {
    students: Student[];
    performance: PerformanceRecord[];
    assignments: Assignment[];
    selectedClass: string;
}

const ClassMasteryHeatmap: React.FC<Props> = ({ students, performance, assignments, selectedClass }) => {
    
    const classStudents = useMemo(() => 
        students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name)),
    [students, selectedClass]);

    const visibleAssignments = useMemo(() => 
        assignments.filter(a => a.isVisible).sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [assignments]);

    const getHeatColor = (score: number, max: number) => {
        const ratio = score / max;
        if (ratio >= 0.9) return 'bg-emerald-500 text-white';
        if (ratio >= 0.75) return 'bg-emerald-200 text-emerald-900';
        if (ratio >= 0.6) return 'bg-amber-100 text-amber-900';
        if (ratio >= 0.4) return 'bg-orange-100 text-orange-900';
        return 'bg-red-500 text-white';
    };

    const classSkillAverages = useMemo(() => {
        return visibleAssignments.map(a => {
            const scores = performance.filter(p => p.notes === a.id && classStudents.some(s => s.id === p.studentId));
            if (scores.length === 0) return { id: a.id, title: a.title, avg: 0, count: 0 };
            const avg = scores.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0) / scores.length;
            return { id: a.id, title: a.title, avg: Math.round(avg * 100), count: scores.length };
        });
    }, [visibleAssignments, performance, classStudents]);

    return (
        <div className="p-8 h-full flex flex-col animate-fade-in font-tajawal">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Target className="text-indigo-600"/> خريطة إتقان نواتج التعلم
                    </h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Mastery Heatmap Analysis</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100"><Sparkles size={14}/> تحديث مباشر</div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-[3.5rem] border shadow-2xl overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[800px]">
                        <thead className="bg-[#F8FAFC] border-b text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-30 shadow-sm">
                            <tr>
                                <th className="p-6 text-right sticky right-0 bg-[#F8FAFC] z-40 border-l w-64 text-slate-800">الاسم / المهارة</th>
                                {visibleAssignments.map(a => (
                                    <th key={a.id} className="p-4 border-l min-w-[120px] max-w-[150px]">
                                        <div className="truncate" title={a.title}>{a.title}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {classStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-indigo-50/10 transition-colors">
                                    <td className="p-4 text-right sticky right-0 bg-white z-20 border-l font-black text-slate-700 text-sm">
                                        {student.name}
                                    </td>
                                    {visibleAssignments.map(a => {
                                        const rec = performance.find(p => p.studentId === student.id && p.notes === a.id);
                                        return (
                                            <td key={a.id} className="p-1 border-l">
                                                {rec ? (
                                                    <div className={`h-12 w-full rounded-2xl flex items-center justify-center font-black text-sm shadow-inner transition-transform hover:scale-105 ${getHeatColor(rec.score, rec.maxScore)}`}>
                                                        {Math.round((rec.score / rec.maxScore) * 100)}%
                                                    </div>
                                                ) : (
                                                    <div className="h-12 w-full rounded-2xl bg-slate-50/50 border border-dashed border-slate-100 flex items-center justify-center text-slate-200 text-xs font-bold">---</div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-900 text-white font-black text-xs sticky bottom-0 z-30">
                            <tr>
                                <td className="p-6 text-right sticky right-0 bg-slate-900 border-l">متوسط الفصل التراكمي</td>
                                {classSkillAverages.map(skill => (
                                    <td key={skill.id} className={`p-6 border-l ${skill.avg >= 85 ? 'text-emerald-400' : skill.avg < 60 ? 'text-rose-400' : 'text-indigo-300'}`}>
                                        {skill.avg}%
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex gap-4">
                    <div className="p-3 bg-white rounded-2xl text-indigo-600 shadow-sm"><TrendingUp size={20}/></div>
                    <div>
                        <h4 className="font-black text-indigo-900 text-sm mb-1">أعلى المهارات إتقاناً</h4>
                        <p className="text-xs text-indigo-700 font-bold">{classSkillAverages.sort((a,b)=>b.avg-a.avg)[0]?.title || 'بانتظار البيانات'}</p>
                    </div>
                </div>
                <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 flex gap-4">
                    <div className="p-3 bg-white rounded-2xl text-rose-600 shadow-sm"><AlertCircle size={20}/></div>
                    <div>
                        <h4 className="font-black text-rose-900 text-sm mb-1">فجوات التعلم الحرجة</h4>
                        <p className="text-xs text-rose-700 font-bold">{classSkillAverages.sort((a,b)=>a.avg-b.avg).find(s=>s.count>0)?.title || 'لا يوجد فجوات حالياً'}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center justify-center">
                    <div className="flex gap-1">
                        {[0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
                            <div key={v} className={`w-8 h-4 rounded-full ${getHeatColor(v, 1)}`} title={`${v*100}%`}></div>
                        ))}
                    </div>
                    <span className="mr-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">تدرج الإتقان</span>
                </div>
            </div>
        </div>
    );
};

export default ClassMasteryHeatmap;
