
import React, { useState, useMemo, useEffect } from 'react';
import { Student } from '../types';
import { generateClassStrategy } from '../services/geminiService';
import { getTeacherAssignments } from '../services/storageService';
import { Lightbulb, Sparkles, Loader2, BookOpen, BrainCircuit, ChevronLeft, Target } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ClassStrategyProps {
    students: Student[];
    currentUserId?: string;
}

const ClassStrategy: React.FC<ClassStrategyProps> = ({ students, currentUserId }) => {
    const [selectedClass, setSelectedClass] = useState('');
    const [topic, setTopic] = useState('');
    const [strategy, setStrategy] = useState('');
    const [loading, setLoading] = useState(false);

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        if (currentUserId) getTeacherAssignments(currentUserId).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUserId]);

    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
    }, [uniqueClasses, selectedClass]);

    const varkStats = useMemo(() => {
        const filtered = students.filter(s => s.className === selectedClass);
        const stats: Record<string, number> = { VISUAL: 0, AUDITORY: 0, READ_WRITE: 0, KINESTHETIC: 0 };
        filtered.forEach(s => {
            if (s.learningStyle && s.learningStyle !== 'UNKNOWN') {
                stats[s.learningStyle]++;
            }
        });
        return stats;
    }, [students, selectedClass]);

    const handleGenerate = async () => {
        if (!topic) return;
        setLoading(true);
        const res = await generateClassStrategy(varkStats, topic);
        setStrategy(res);
        setLoading(false);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal">
            <div className="mb-10">
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                    <BrainCircuit className="text-indigo-600" size={36}/> 
                    استراتيجية التدريس الذكية
                </h2>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">تخصيص الشرح بناءً على أنماط الفصل</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-6 h-fit">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Target size={24}/></div>
                        <h3 className="font-black text-gray-800">إعدادات الدرس</h3>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">الفصل الحالي</label>
                            <select 
                                className="w-full p-4 border rounded-2xl bg-gray-50 font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                value={selectedClass}
                                onChange={e => setSelectedClass(e.target.value)}
                            >
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">موضوع الدرس القادم</label>
                            <input 
                                className="w-full p-4 border rounded-2xl bg-gray-50 font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                placeholder="مثلاً: الكسور الاعتيادية، الخلية النباتية..."
                                value={topic}
                                onChange={e => setTopic(e.target.value)}
                            />
                        </div>

                        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                            <h4 className="font-black text-indigo-900 mb-2 flex items-center gap-2 text-xs">توزيع الأنماط:</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(varkStats).map(([style, count]) => (
                                    <div key={style} className="bg-white p-2 rounded-xl text-center border">
                                        <p className="text-[8px] font-black text-gray-400">{style}</p>
                                        <p className="text-sm font-black text-indigo-600">{count}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate}
                            disabled={loading || !topic}
                            className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin"/> : <Sparkles/>} توليد الخطة (AI)
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-[3rem] border shadow-sm flex flex-col overflow-hidden relative">
                    {strategy ? (
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar prose prose-indigo max-w-none">
                            <ReactMarkdown>{strategy}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-20">
                            <Lightbulb size={150} className="mb-6"/>
                            <p className="text-2xl font-black">أدخل موضوع الدرس للبدء بالتحليل</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ClassStrategy;
