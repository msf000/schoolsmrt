
import React, { useState } from 'react';
import { analyzeMicrosoftFormsData } from '../services/geminiService';
import { addPerformance } from '../services/storageService';
import { FileSpreadsheet, Loader2, Sparkles, CheckCircle, AlertCircle, BarChart, Info } from 'lucide-react';
import { Student } from '../types';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [rawData, setRawData] = useState('');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);

    const handleAnalyze = async () => {
        if (!rawData.trim()) return;
        setLoading(true);
        const result = await analyzeMicrosoftFormsData(rawData);
        setAnalysis(result);
        setLoading(false);
    };

    const handleSyncGrades = () => {
        if (!analysis || !analysis.results) return;
        const records: any[] = [];
        analysis.results.forEach((res: any) => {
            const student = students.find(s => s.name.includes(res.studentName) || res.studentName.includes(s.name));
            if (student) {
                records.push({
                    id: `forms_${Date.now()}_${student.id}`,
                    studentId: student.id,
                    subject: 'عام',
                    title: 'اختبار Microsoft Forms',
                    score: res.score,
                    maxScore: res.total,
                    date: new Date().toISOString().split('T')[0],
                    createdById: currentUserId
                });
            }
        });
        addPerformance(records);
        alert(`تم رصد درجات ${records.length} طالب بنجاح!`);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileSpreadsheet className="text-green-600"/> محلل Microsoft Forms
                </h2>
                <p className="text-sm text-gray-500 mt-1">انسخ محتوى ملف Excel الخاص بنتائج Forms هنا لتحليلها ورصد الدرجات فوراً.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
                <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-4">
                    <label className="text-sm font-bold text-gray-600">بيانات النتائج (صق هنا):</label>
                    <textarea 
                        className="flex-1 p-4 border rounded-2xl bg-gray-50 focus:bg-white outline-none text-xs font-mono"
                        placeholder="الصق الأعمدة: الاسم، البريد، النقاط..."
                        value={rawData}
                        onChange={e => setRawData(e.target.value)}
                    />
                    <button 
                        onClick={handleAnalyze}
                        disabled={loading || !rawData}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin"/> : <Sparkles/>} {loading ? 'جاري التحليل...' : 'بدء التحليل الذكي'}
                    </button>
                </div>

                <div className="bg-white p-6 rounded-3xl border shadow-sm overflow-y-auto custom-scrollbar">
                    {analysis ? (
                        <div className="space-y-6">
                            <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                                <h3 className="font-bold text-green-800 flex items-center gap-2 mb-2"><CheckCircle size={18}/> ملخص التحليل</h3>
                                <p className="text-sm text-green-700 leading-relaxed">{analysis.analysis}</p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-bold text-gray-800 flex items-center gap-2"><AlertCircle size={16} className="text-red-500"/> الأسئلة الصعبة:</h4>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 pr-4">
                                    {analysis.difficultQuestions.map((q: string, i: number) => <li key={i}>{q}</li>)}
                                </ul>
                            </div>

                            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2"><Info size={18}/> التوصية:</h4>
                                <p className="text-sm text-blue-700 italic">{analysis.recommendations}</p>
                            </div>

                            <button 
                                onClick={handleSyncGrades}
                                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md"
                            >
                                <BarChart size={18}/> رصد الدرجات في السجل
                            </button>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-30">
                            <FileSpreadsheet size={80} className="mb-4"/>
                            <p className="font-bold">نتائج التحليل ستظهر هنا</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FormsAnalyzer;
