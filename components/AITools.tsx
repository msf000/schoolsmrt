
import React, { useState } from 'react';
import { Student, PerformanceRecord, SystemUser } from '../types';
import { generateRemedialPlan, generateLessonPlan, generateParentMessage, generateQuiz, suggestQuickActivity } from '../services/geminiService';
import { saveRemedialPlan } from '../services/storageService';
import { BrainCircuit, Sparkles, Loader2, Copy, FileText, User, PenTool, MessageSquare, Printer, Save, CheckCircle, Zap, Lightbulb } from 'lucide-react';

interface Props {
    students: Student[];
    performance: PerformanceRecord[];
    currentUser?: SystemUser | null;
}

const AITools: React.FC<Props> = ({ students, performance, currentUser }) => {
    const [activeTool, setActiveTool] = useState<'PLAN' | 'REMEDIAL' | 'MESSAGE' | 'QUIZ' | 'ACTIVITY'>('PLAN');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState('');
    const [saved, setSaved] = useState(false);
    
    // Inputs
    const [topic, setTopic] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [subject, setSubject] = useState('عام');
    const [tone, setTone] = useState('OFFICIAL');
    const [grade, setGrade] = useState('الصف الأول المتوسط');

    const handleRun = async () => {
        setLoading(true); setResult(''); setSaved(false);
        try {
            let res = '';
            if (activeTool === 'PLAN') res = await generateLessonPlan(subject, topic, grade, '45');
            else if (activeTool === 'REMEDIAL') {
                const s = students.find(x => x.id === selectedStudentId);
                res = await generateRemedialPlan(s?.name || 'الطالب', s?.gradeLevel || grade, subject, topic);
            }
            else if (activeTool === 'MESSAGE') {
                const s = students.find(x => x.id === selectedStudentId);
                res = await generateParentMessage(s?.name || 'الطالب', topic, tone);
            }
            else if (activeTool === 'QUIZ') res = await generateQuiz(subject, topic, grade, 5, 'MEDIUM');
            else if (activeTool === 'ACTIVITY') res = await suggestQuickActivity(topic);
            
            setResult(res);
        } catch (e) { 
            setResult('عذراً، حدث خطأ أثناء الاتصال بالخادم الذكي. يرجى التحقق من مفتاح API.'); 
        } finally { setLoading(false); }
    };

    const handleSaveToProfile = () => {
        if (!selectedStudentId || !result || activeTool !== 'REMEDIAL' || !currentUser) return;
        saveRemedialPlan({
            id: `rp_${Date.now()}`,
            studentId: selectedStudentId,
            teacherId: currentUser.id,
            subject,
            topic,
            content: result,
            date: new Date().toISOString()
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden font-tajawal">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                    <BrainCircuit className="text-purple-600" size={36}/> 
                    مختبر المعلم الذكي (AI Lab)
                </h2>
                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">توليد المحتوى التعليمي والخطط بذكاء Gemini</p>
            </div>

            <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar print:hidden">
                {/* Fixed name error by replacing setActiveTab with setActiveTool */}
                <ToolTab icon={<PenTool size={18}/>} label="تحضير درس" active={activeTool==='PLAN'} onClick={()=>setActiveTool('PLAN')}/>
                <ToolTab icon={<Sparkles size={18}/>} label="خطة علاجية" active={activeTool==='REMEDIAL'} onClick={()=>setActiveTool('REMEDIAL')}/>
                <ToolTab icon={<MessageSquare size={18}/>} label="رسالة ذكية" active={activeTool==='MESSAGE'} onClick={()=>setActiveTool('MESSAGE')}/>
                <ToolTab icon={<FileText size={18}/>} label="اختبار سريع" active={activeTool==='QUIZ'} onClick={()=>setActiveTool('QUIZ')}/>
                <ToolTab icon={<Zap size={18}/>} label="نشاط صفي" active={activeTool==='ACTIVITY'} onClick={()=>setActiveTool('ACTIVITY')}/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 overflow-hidden">
                {/* Inputs Sidebar */}
                <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex flex-col gap-6 overflow-y-auto custom-scrollbar print:hidden">
                    <h3 className="font-black text-gray-800 border-b pb-4 flex items-center gap-2"><Zap size={18} className="text-yellow-500"/> معايير التوليد</h3>
                    
                    <div className="space-y-5">
                        { (activeTool === 'REMEDIAL' || activeTool === 'MESSAGE') && (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">الطالب المستهدف</label>
                                <select className="w-full p-3 border rounded-2xl bg-gray-50 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all" value={selectedStudentId} onChange={e=>setSelectedStudentId(e.target.value)}>
                                    <option value="">-- اختر طالباً --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">المادة الدراسية</label>
                            <input className="w-full p-3 border rounded-2xl bg-gray-50 font-bold text-sm" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="مثلاً: لغتي الجميلة"/>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">الموضوع / التفاصيل</label>
                            <textarea 
                                className="w-full p-4 border rounded-3xl bg-gray-50 h-40 outline-none focus:ring-4 focus:ring-purple-500/10 font-bold text-sm text-gray-700 transition-all" 
                                value={topic} 
                                onChange={e=>setTopic(e.target.value)} 
                                placeholder={activeTool === 'PLAN' ? "اكتب عنوان الدرس..." : activeTool === 'REMEDIAL' ? "صف نقاط الضعف..." : "اكتب الفكرة الأساسية..."}
                            />
                        </div>

                        <button onClick={handleRun} disabled={loading || !topic} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-indigo-700 active:scale-95 transition-all">
                            {loading ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>} 
                            {loading ? 'جاري التفكير...' : 'توليد المحتوى الآن'}
                        </button>
                    </div>
                </div>

                {/* Results Area */}
                <div className="lg:col-span-2 bg-white rounded-[3rem] border shadow-sm flex flex-col overflow-hidden relative group">
                    <div className="p-6 border-b bg-gray-50/50 flex justify-between items-center relative z-10">
                        <span className="font-black text-gray-800 flex items-center gap-2"><Lightbulb className="text-yellow-500"/> المخرجات الذكية</span>
                        {result && (
                            <div className="flex gap-2">
                                {activeTool === 'REMEDIAL' && (
                                    <button onClick={handleSaveToProfile} className={`px-4 py-2 rounded-xl font-black text-[10px] flex items-center gap-2 transition-all ${saved ? 'bg-green-100 text-green-700' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 shadow-sm border border-indigo-100'}`}>
                                        {saved ? <CheckCircle size={14}/> : <Save size={14}/>} {saved ? 'تم الحفظ' : 'حفظ في ملف الطالب'}
                                    </button>
                                )}
                                <button onClick={()=>{navigator.clipboard.writeText(result); alert('تم نسخ النص بنجاح!');}} className="p-3 bg-white text-gray-400 border rounded-xl hover:text-indigo-600 shadow-sm transition-all" title="نسخ"><Copy size={18}/></button>
                                <button onClick={()=>window.print()} className="p-3 bg-white text-gray-400 border rounded-xl hover:text-indigo-600 shadow-sm transition-all" title="طباعة"><Printer size={18}/></button>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
                        {result ? (
                            <div className="prose prose-indigo max-w-none text-gray-800 leading-relaxed font-medium animate-slide-up">
                                {result.split('\n').map((line, i) => (
                                    <p key={i} className="mb-4">{line}</p>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-20">
                                <BrainCircuit size={150} className="mb-6"/>
                                <p className="text-2xl font-black">أدخل البيانات لبدء العصف الذهني</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ToolTab = ({ icon, label, active, onClick }: any) => (
    <button 
        onClick={onClick} 
        className={`px-8 py-4 rounded-2xl border-2 flex items-center gap-3 transition-all font-black text-xs whitespace-nowrap ${
            active 
            ? 'bg-purple-600 text-white border-purple-600 shadow-xl scale-105' 
            : 'bg-white text-gray-500 border-transparent hover:border-purple-100 hover:bg-purple-50/50'
        }`}
    >
        {icon} 
        <span>{label}</span>
    </button>
);

export default AITools;
