
import React, { useState } from 'react';
import { Student, PerformanceRecord } from '../types';
import { generateRemedialPlan, generateLessonPlan, generateParentMessage, generateQuiz } from '../services/geminiService';
import { BrainCircuit, Sparkles, Loader2, Copy, FileText, User, PenTool, MessageSquare, Printer, ArrowRight } from 'lucide-react';

const AITools: React.FC<{ students: Student[], performance: PerformanceRecord[] }> = ({ students, performance }) => {
    const [activeTool, setActiveTool] = useState<'PLAN' | 'REMEDIAL' | 'MESSAGE' | 'QUIZ'>('PLAN');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    
    // Inputs
    const [topic, setTopic] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [subject, setSubject] = useState('عام');
    const [tone, setTone] = useState('OFFICIAL');

    const handleRun = async () => {
        setLoading(true); setResult('');
        try {
            let res = '';
            if (activeTool === 'PLAN') res = await generateLessonPlan(subject, topic, 'عام', '45');
            else if (activeTool === 'REMEDIAL') {
                const s = students.find(x => x.id === selectedStudentId);
                res = await generateRemedialPlan(s?.name || 'الطالب', s?.gradeLevel || 'غير محدد', subject, topic);
            }
            else if (activeTool === 'MESSAGE') {
                const s = students.find(x => x.id === selectedStudentId);
                res = await generateParentMessage(s?.name || 'الطالب', topic, tone);
            }
            else if (activeTool === 'QUIZ') res = await generateQuiz(subject, topic, 'عام', 5, 'MEDIUM');
            setResult(res);
        } catch (e) { alert('حدث خطأ'); } finally { setLoading(false); }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><BrainCircuit className="text-purple-600"/> مختبر المعلم الذكي (AI)</h2>
                <p className="text-sm text-gray-500">استخدم قوة الذكاء الاصطناعي لتسريع مهامك التعليمية.</p>
            </div>

            <div className="flex gap-4 mb-8 overflow-x-auto pb-2 no-scrollbar">
                <ToolTab icon={<PenTool/>} label="تحضير درس" active={activeTool==='PLAN'} onClick={()=>setActiveTool('PLAN')}/>
                <ToolTab icon={<Sparkles/>} label="خطة علاجية" active={activeTool==='REMEDIAL'} onClick={()=>setActiveTool('REMEDIAL')}/>
                <ToolTab icon={<MessageSquare/>} label="رسالة لولي الأمر" active={activeTool==='MESSAGE'} onClick={()=>setActiveTool('MESSAGE')}/>
                <ToolTab icon={<FileText/>} label="اختبار سريع" active={activeTool==='QUIZ'} onClick={()=>setActiveTool('QUIZ')}/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col gap-5">
                    <h3 className="font-bold text-gray-800 border-b pb-3">المدخلات</h3>
                    { (activeTool === 'REMEDIAL' || activeTool === 'MESSAGE') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">الطالب المستهدف</label>
                            <select className="w-full p-2 border rounded-xl bg-gray-50 font-bold" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                                <option value="">-- اختر --</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2">الموضوع / التفاصيل</label>
                        <textarea className="w-full p-3 border rounded-xl bg-gray-50 h-32 focus:bg-white transition-all outline-none" value={topic} onChange={e=>setTopic(e.target.value)} placeholder="مثال: تحضير درس الضرب، أو الطالب لديه مشكلة في الحفظ..."/>
                    </div>
                    <button onClick={handleRun} disabled={loading || !topic} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin"/> : <Sparkles/>} {loading ? 'جاري التفكير...' : 'تنفيذ المهمة'}
                    </button>
                </div>

                <div className="lg:col-span-2 bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <span className="font-bold text-gray-700">المخرجات الذكية</span>
                        {result && (
                            <div className="flex gap-2">
                                <button onClick={()=>window.print()} className="p-2 hover:bg-white rounded-lg text-gray-600"><Printer size={18}/></button>
                                <button onClick={()=>{navigator.clipboard.writeText(result); alert('تم النسخ!');}} className="p-2 hover:bg-white rounded-lg text-gray-600"><Copy size={18}/></button>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {result ? (
                            <div className="prose prose-purple max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">{result}</div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                <BrainCircuit size={80} className="opacity-10 mb-4"/>
                                <p className="font-bold">النتيجة ستظهر هنا...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ToolTab = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-6 py-4 rounded-2xl border-2 flex items-center gap-3 transition-all font-bold whitespace-nowrap ${active ? 'bg-purple-600 text-white border-purple-600 shadow-lg scale-105' : 'bg-white text-gray-500 border-transparent hover:border-purple-200'}`}>
        {icon} <span>{label}</span>
    </button>
);

export default AITools;
