
import React, { useState, useMemo } from 'react';
import { analyzeMicrosoftFormsData } from '../services/geminiService';
import { addPerformance } from '../services/storageService';
import { FileSpreadsheet, Loader2, Sparkles, CheckCircle, AlertCircle, BarChart, Info, ArrowRight, UserCheck, Calculator, TrendingUp } from 'lucide-react';
import { Student } from '../types';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [rawData, setRawData] = useState('');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleAnalyze = async () => {
        if (!rawData.trim()) return;
        setLoading(true);
        try {
            const result = await analyzeMicrosoftFormsData(rawData);
            setAnalysis(result);
        } catch (e) {
            alert('حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.');
        } finally {
            setLoading(false);
        }
    };

    const matchedResults = useMemo(() => {
        if (!analysis || !analysis.results) return [];
        return (analysis.results as any[]).map((res: any) => {
            const student = students.find(s => 
                s.name.trim() === res.studentName?.trim() || 
                s.name.includes(res.studentName || '') || 
                (res.studentName || '').includes(s.name)
            );
            return { ...res, matchedStudent: student };
        });
    }, [analysis, students]);

    const stats = useMemo(() => {
        if (!analysis || !analysis.results || analysis.results.length === 0) return null;
        const results = analysis.results as any[];
        const scores = results.map((r: any) => (r.score || 0) / (r.total || 10));
        const avg = Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 100);
        const pass = scores.filter((s: number) => s >= 0.5).length;
        return { avg, pass, total: scores.length };
    }, [analysis]);

    const handleSyncGrades = () => {
        const recordsToSave = matchedResults
            .filter((r: any) => r.matchedStudent)
            .map((res: any) => ({
                id: `forms_${Date.now()}_${res.matchedStudent.id}`,
                studentId: res.matchedStudent.id,
                subject: 'عام',
                title: 'اختبار Microsoft Forms',
                score: Number(res.score),
                maxScore: Number(res.total),
                date: new Date().toISOString().split('T')[0],
                createdById: currentUserId,
                category: 'PLATFORM_EXAM'
            }));

        if (recordsToSave.length === 0) return alert('لم يتم العثور على طلاب مطابقين لرصدهم.');
        
        setIsSaving(true);
        setTimeout(() => {
            addPerformance(recordsToSave as any);
            setIsSaving(false);
            alert(`تم رصد درجات ${recordsToSave.length} طالب بنجاح!`);
            setAnalysis(null);
            setRawData('');
        }, 800);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600"/> محلل نتائج Microsoft Forms
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">قم بنسخ الأعمدة (الاسم، النقاط) من ملف الإكسل المصدر لـ Forms، وسنتولى الباقي.</p>
                </div>
                {analysis && (
                    <button onClick={() => setAnalysis(null)} className="text-xs font-bold text-gray-400 hover:text-gray-600">بدء تحليل جديد</button>
                )}
            </div>

            {!analysis ? (
                <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
                    <div className="flex-1 bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col gap-6">
                        <div className="flex-1 flex flex-col">
                            <label className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-2"><ArrowRight size={14}/> الصق البيانات هنا:</label>
                            <textarea 
                                className="flex-1 p-6 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50 focus:bg-white focus:border-green-500 outline-none text-xs font-mono transition-all resize-none"
                                placeholder="مثال:&#10;أحمد محمد	15	20&#10;سارة علي	18	20..."
                                value={rawData}
                                onChange={e => setRawData(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={handleAnalyze}
                            disabled={loading || !rawData.trim()}
                            className="w-full py-5 bg-green-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-green-100 hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:scale-[1.02]"
                        >
                            {loading ? <Loader2 className="animate-spin" size={24}/> : <Sparkles size={24}/>} 
                            {loading ? 'جاري التحليل المعمق...' : 'بدء التحليل الذكي والرصد'}
                        </button>
                    </div>
                    
                    <div className="hidden lg:flex w-80 flex-col gap-6">
                        <GuideCard icon={<CheckCircle className="text-green-500"/>} title="سهولة الرصد" text="مطابقة الأسماء مع سجل الطلاب تلقائياً." />
                        <GuideCard icon={<AlertCircle className="text-orange-500"/>} title="اكتشاف الفجوات" text="تحديد الأسئلة الصعبة التي لم يجب عليها الطلاب." />
                        <GuideCard icon={<Calculator className="text-blue-500"/>} title="إحصائيات فورية" text="حساب المتوسط العام ونسبة النجاح فورياً." />
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden flex flex-col gap-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
                        <StatBox icon={<TrendingUp className="text-green-600"/>} label="المتوسط العام" value={`${stats?.avg}%`} color="bg-green-50" />
                        <StatBox icon={<UserCheck className="text-blue-600"/>} label="نسبة الاجتياز" value={`${stats ? Math.round((stats.pass / stats.total) * 100) : 0}%`} color="bg-blue-50" />
                        <StatBox icon={<Calculator className="text-purple-600"/>} label="عدد الطلاب" value={stats?.total} color="bg-purple-50" />
                    </div>

                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                        <div className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col overflow-hidden">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={18}/> معاينة المطابقة والرصد</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-2xl">
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-gray-50 font-bold sticky top-0 border-b">
                                        <tr>
                                            <th className="p-3">الاسم في Forms</th>
                                            <th className="p-3">المطابق في السجل</th>
                                            <th className="p-3 text-center">الدرجة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {matchedResults.map((r: any, i: number) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-3 text-gray-500">{r.studentName}</td>
                                                <td className="p-3 font-bold">
                                                    {r.matchedStudent ? (
                                                        <span className="text-green-600 flex items-center gap-1"><CheckCircle size={10}/> {r.matchedStudent.name}</span>
                                                    ) : (
                                                        <span className="text-red-400 flex items-center gap-1"><AlertCircle size={10}/> لم يتم العثور</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-black">{r.score} / {r.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 pt-4 border-t flex flex-col gap-3">
                                <p className="text-[10px] text-gray-400 font-bold">سيتم رصد الدرجات للطلاب "المطابقين" فقط.</p>
                                <button 
                                    onClick={handleSyncGrades}
                                    disabled={isSaving}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="animate-spin"/> : <BarChart size={18}/>}
                                    تأكيد ورصد الدرجات في السجل
                                </button>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-2xl border shadow-sm overflow-y-auto custom-scrollbar space-y-6">
                            <div className="bg-green-50 p-6 rounded-3xl border border-green-100">
                                <h3 className="font-black text-green-800 flex items-center gap-2 mb-3"><Sparkles size={20}/> تحليل الأداء (AI)</h3>
                                <p className="text-sm text-green-700 leading-relaxed italic">"{analysis.analysis}"</p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm"><AlertCircle size={16} className="text-red-500"/> مفاهيم تحتاج مراجعة:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(analysis.difficultQuestions as string[] || []).map((q: string, i: number) => (
                                        <span key={i} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-red-100">{q}</span>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                                <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2 text-sm"><Info size={18}/> توصية تربوية:</h4>
                                <p className="text-sm text-blue-700 leading-relaxed font-medium">{analysis.recommendations}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const GuideCard = ({ icon, title, text }: any) => (
    <div className="bg-white p-5 rounded-3xl border shadow-sm">
        <div className="mb-3">{icon}</div>
        <h4 className="font-bold text-gray-800 text-sm mb-1">{title}</h4>
        <p className="text-xs text-gray-400 leading-relaxed">{text}</p>
    </div>
);

const StatBox = ({ icon, label, value, color }: any) => (
    <div className={`${color} p-6 rounded-3xl border border-white flex items-center justify-between shadow-sm`}>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <h4 className="text-3xl font-black text-gray-800">{value}</h4>
        </div>
        <div className="p-4 bg-white/50 rounded-2xl">{icon}</div>
    </div>
);

export default FormsAnalyzer;
