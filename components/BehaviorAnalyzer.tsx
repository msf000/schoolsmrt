
import React, { useState, useEffect, useMemo } from 'react';
import { Student, BehaviorIncident, SystemUser } from '../types';
import { getBehaviorIncidents } from '../services/storageService';
import { analyzeBehaviorTrends } from '../services/geminiService';
import { BrainCircuit, Search, Loader2, Sparkles, User, ShieldCheck, TrendingUp, AlertTriangle, Lightbulb, ChevronLeft } from 'lucide-react';

interface Props {
    students: Student[];
    currentUser: SystemUser;
}

const BehaviorAnalyzer: React.FC<Props> = ({ students, currentUser }) => {
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const behaviorLog = useMemo(() => getBehaviorIncidents(currentUser.id), [currentUser]);

    const handleAnalyze = async () => {
        const student = students.find(s => s.id === selectedStudentId);
        if (!student) return;
        
        const myIncidents = behaviorLog.filter(i => i.studentId === student.id);
        if (myIncidents.length === 0) return alert('لا يوجد سجل سلوكي لهذا الطالب للتحليل.');

        setLoading(true);
        try {
            const res = await analyzeBehaviorTrends(student.name, myIncidents);
            setAnalysis(res);
        } catch (e) {
            alert('فشل التحليل الذكي.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal">
            <div className="mb-10">
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                    <BrainCircuit className="text-indigo-600" size={36}/> 
                    محلل السلوك الذكي (AI)
                </h2>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">اكتشاف الأنماط السلوكية الخفية وتوصيات وقائية</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-6 h-fit">
                    <div className="relative">
                        <Search className="absolute right-3 top-3 text-gray-400" size={18}/>
                        <input 
                            className="w-full pr-10 pl-4 py-3 border rounded-xl outline-none text-sm font-bold bg-gray-50"
                            placeholder="ابحث عن طالب..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                        {students.filter(s => s.name.includes(searchTerm)).map(s => (
                            <button 
                                key={s.id}
                                onClick={() => { setSelectedStudentId(s.id); setAnalysis(null); }}
                                className={`w-full p-4 rounded-2xl border text-right font-bold text-sm transition-all flex items-center justify-between ${selectedStudentId === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-700 hover:bg-gray-50'}`}
                            >
                                <span>{s.name}</span>
                                {selectedStudentId === s.id && <ChevronLeft size={16}/>}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={handleAnalyze}
                        disabled={loading || !selectedStudentId}
                        className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin"/> : <Sparkles/>} 
                        {loading ? 'جاري التحليل...' : 'بدء التحليل السلوكي'}
                    </button>
                </div>

                <div className="lg:col-span-2 bg-white rounded-[3rem] border shadow-sm flex flex-col overflow-hidden relative">
                    {analysis ? (
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar animate-slide-up">
                            <div className="flex items-center gap-4 mb-8 border-b pb-6">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl"><TrendingUp size={32}/></div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-800">التقرير السلوكي الوقائي</h3>
                                    <p className="text-xs text-gray-400 font-bold">بناءً على سجلات النظام السحابية</p>
                                </div>
                            </div>
                            <div className="prose prose-indigo max-w-none text-gray-700 leading-relaxed bg-slate-50 p-8 rounded-3xl border border-indigo-50">
                                {analysis}
                            </div>
                            <div className="mt-10 flex gap-4">
                                <div className="flex-1 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                                    <AlertTriangle className="text-amber-500 shrink-0"/>
                                    <p className="text-xs text-amber-700 font-bold">هذا التحليل استرشادي ويعتمد على البيانات المدخلة؛ يرجى مراعاة السياق التربوي الفردي.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-20">
                            <Lightbulb size={150} className="mb-6"/>
                            <p className="text-2xl font-black">اختر طالباً لبدء استكشاف الأنماط السلوكية</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BehaviorAnalyzer;
