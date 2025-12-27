
import React, { useState } from 'react';
import { generateParentDigest } from '../services/geminiService';
import { Sparkles, Bot, Loader2, Heart, Share2, BookOpen, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
    student: any;
    attendance: any[];
    performance: any[];
}

const SmartParentDigest: React.FC<Props> = ({ student, attendance, performance }) => {
    const [digest, setDigest] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const res = await generateParentDigest(student.name, attendance.slice(-10), performance.slice(-5));
            setDigest(res);
        } catch {
            alert('فشل توليد الملخص الذكي.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] border border-indigo-100 shadow-xl overflow-hidden animate-fade-in font-tajawal">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Heart size={120}/></div>
                <div className="relative z-10">
                    <h3 className="text-2xl font-black flex items-center gap-3"><Sparkles className="text-yellow-400"/> قصة نجاح {student.name.split(' ')[0]}</h3>
                    <p className="text-indigo-100 text-sm mt-1">دع الذكاء الاصطناعي يلخص لك رحلة ابنك لهذا الأسبوع</p>
                </div>
                {!digest && !loading && (
                    <button onClick={handleGenerate} className="relative z-10 bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black shadow-xl hover:scale-105 transition-all">ابدأ الآن</button>
                )}
            </div>

            <div className="p-8 min-h-[200px] flex flex-col justify-center">
                {loading ? (
                    <div className="flex flex-col items-center gap-4 py-10">
                        <Loader2 className="animate-spin text-indigo-600" size={48}/>
                        <p className="font-bold text-slate-400">جاري قراءة السجلات وصياغة القصة...</p>
                    </div>
                ) : digest ? (
                    <div className="animate-slide-up">
                        <div className="prose prose-indigo max-w-none text-slate-700 leading-relaxed bg-slate-50 p-8 rounded-3xl border border-indigo-50 mb-6">
                            <ReactMarkdown>{digest}</ReactMarkdown>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDigest(null)} className="px-6 py-3 text-slate-400 font-bold hover:text-slate-600">إغلاق</button>
                            <button onClick={() => window.print()} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg flex items-center gap-2"><Share2 size={18}/> مشاركة التقرير</button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 opacity-30">
                        <Bot size={64} className="mx-auto mb-4"/>
                        <p className="font-black text-xl text-slate-300">الملخص الأسبوعي جاهز للعرض</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SmartParentDigest;
