
import React, { useState, useMemo } from 'react';
import { Student, PerformanceRecord } from '../types';
import { generateQuiz, generateRemedialPlan } from '../services/geminiService';
import { BrainCircuit, BookOpen, FileQuestion, Sparkles, Loader2, Copy, Check, Printer, User, AlertTriangle } from 'lucide-react';

interface AIToolsProps {
    students: Student[];
    performance: PerformanceRecord[];
}

const AITools: React.FC<AIToolsProps> = ({ students, performance }) => {
    const [activeTool, setActiveTool] = useState<'QUIZ' | 'REMEDIAL'>('QUIZ');

    return (
        <div className="p-6 h-full flex flex-col animate-fade-in bg-gray-50">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <BrainCircuit className="text-purple-600"/> أدوات المعلم الذكية (AI)
                </h2>
                <p className="text-gray-500 mt-2">مجموعة من الأدوات المساعدة المعتمدة على الذكاء الاصطناعي لتسهيل مهام المعلم.</p>
            </div>

            <div className="flex gap-4 mb-6">
                <button 
                    onClick={() => setActiveTool('QUIZ')}
                    className={`flex-1 py-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'QUIZ' ? 'bg-purple-50 border-purple-200 text-purple-800 shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                    <FileQuestion size={24}/>
                    <span className="font-bold">منشئ الاختبارات والأنشطة</span>
                </button>
                <button 
                    onClick={() => setActiveTool('REMEDIAL')}
                    className={`flex-1 py-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTool === 'REMEDIAL' ? 'bg-teal-50 border-teal-200 text-teal-800 shadow-sm' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                    <Sparkles size={24}/>
                    <span className="font-bold">الخطط العلاجية الذكية</span>
                </button>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                {activeTool === 'QUIZ' ? <QuizGenerator /> : <RemedialPlanner students={students} performance={performance} />}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Quiz Generator ---
const QuizGenerator = () => {
    const [subject, setSubject] = useState('رياضيات');
    const [topic, setTopic] = useState('');
    const [grade, setGrade] = useState('الصف الأول المتوسط');
    const [count, setCount] = useState(5);
    const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!topic) return;
        setLoading(true);
        const quiz = await generateQuiz(subject, topic, grade, count, difficulty);
        setResult(quiz);
        setLoading(false);
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 h-full">
            <div className="w-full md:w-1/3 space-y-4">
                <h3 className="font-bold text-gray-700 border-b pb-2">إعدادات الاختبار</h3>
                
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">المادة</label>
                    <input className="w-full p-2 border rounded-lg bg-gray-50" value={subject} onChange={e => setSubject(e.target.value)} placeholder="مثال: علوم"/>
                </div>
                
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">موضوع الدرس *</label>
                    <input className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none" value={topic} onChange={e => setTopic(e.target.value)} placeholder="مثال: التفاعلات الكيميائية" autoFocus/>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">الصف الدراسي</label>
                    <input className="w-full p-2 border rounded-lg bg-gray-50" value={grade} onChange={e => setGrade(e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">عدد الأسئلة</label>
                        <select className="w-full p-2 border rounded-lg" value={count} onChange={e => setCount(Number(e.target.value))}>
                            <option value="3">3 أسئلة</option>
                            <option value="5">5 أسئلة</option>
                            <option value="10">10 أسئلة</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">الصعوبة</label>
                        <select className="w-full p-2 border rounded-lg" value={difficulty} onChange={e => setDifficulty(e.target.value as any)}>
                            <option value="EASY">سهل</option>
                            <option value="MEDIUM">متوسط</option>
                            <option value="HARD">صعب</option>
                        </select>
                    </div>
                </div>

                <button 
                    onClick={handleGenerate} 
                    disabled={!topic || loading}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 disabled:bg-gray-300 flex items-center justify-center gap-2 mt-4"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>}
                    {loading ? 'جاري التوليد...' : 'توليد الأسئلة'}
                </button>
            </div>

            <div className="flex-1 bg-gray-50 rounded-xl p-6 border border-gray-200 relative overflow-hidden flex flex-col">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <FileQuestion size={18}/> معاينة الاختبار
                </h3>
                
                {result ? (
                    <div className="flex-1 overflow-auto bg-white p-6 rounded-lg shadow-sm border border-gray-100 whitespace-pre-line leading-loose text-gray-800">
                        {result}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <BookOpen size={48} className="mb-4 opacity-20"/>
                        <p>أدخل تفاصيل الدرس واضغط على توليد لإنشاء الأسئلة.</p>
                    </div>
                )}

                {result && (
                    <div className="mt-4 flex gap-2 justify-end">
                        <button onClick={() => {navigator.clipboard.writeText(result); alert('تم النسخ!');}} className="px-4 py-2 bg-white border text-gray-600 rounded-lg hover:bg-gray-100 flex items-center gap-2 font-bold text-sm">
                            <Copy size={16}/> نسخ النص
                        </button>
                        <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black flex items-center gap-2 font-bold text-sm">
                            <Printer size={16}/> طباعة
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Remedial Planner ---
const RemedialPlanner: React.FC<{ students: Student[], performance: PerformanceRecord[] }> = ({ students, performance }) => {
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('رياضيات');
    const [weakness, setWeakness] = useState('');
    const [plan, setPlan] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-detect weakness
    const autoDetectWeakness = () => {
        if (!selectedStudentId) return;
        const lowScores = performance.filter(p => p.studentId === selectedStudentId && p.subject === selectedSubject && (p.score / p.maxScore) < 0.6);
        if (lowScores.length > 0) {
            setWeakness(`درجات منخفضة في: ${lowScores.map(p => p.title).join('، ')}`);
        } else {
            setWeakness('لا توجد سجلات درجات منخفضة واضحة في النظام، يرجى الكتابة يدوياً.');
        }
    };

    const handleGenerate = async () => {
        if (!selectedStudentId || !weakness) return;
        setLoading(true);
        const student = students.find(s => s.id === selectedStudentId);
        if (student) {
            const result = await generateRemedialPlan(student.name, student.gradeLevel || 'غير محدد', selectedSubject, weakness);
            setPlan(result);
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 h-full">
            <div className="w-full md:w-1/3 space-y-4">
                <h3 className="font-bold text-gray-700 border-b pb-2">بيانات الطالب المتعثر</h3>
                
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">الطالب</label>
                    <select 
                        className="w-full p-2 border rounded-lg bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        value={selectedStudentId}
                        onChange={e => { setSelectedStudentId(e.target.value); setWeakness(''); }}
                    >
                        <option value="">-- اختر الطالب --</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">المادة</label>
                    <select 
                        className="w-full p-2 border rounded-lg bg-white"
                        value={selectedSubject}
                        onChange={e => { setSelectedSubject(e.target.value); }}
                    >
                        <option value="رياضيات">رياضيات</option>
                        <option value="لغة عربية">لغة عربية</option>
                        <option value="لغة إنجليزية">لغة إنجليزية</option>
                        <option value="علوم">علوم</option>
                    </select>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-bold text-gray-600">نقاط الضعف / المشكلة</label>
                        <button onClick={autoDetectWeakness} className="text-xs text-blue-600 hover:underline">تحليل تلقائي من الدرجات</button>
                    </div>
                    <textarea 
                        className="w-full p-2 border rounded-lg bg-white h-24 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        value={weakness}
                        onChange={e => setWeakness(e.target.value)}
                        placeholder="مثال: ضعف في جدول الضرب، عدم حل الواجبات..."
                    />
                </div>

                <button 
                    onClick={handleGenerate} 
                    disabled={!selectedStudentId || !weakness || loading}
                    className="w-full py-3 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 disabled:bg-gray-300 flex items-center justify-center gap-2 mt-4"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>}
                    {loading ? 'جاري بناء الخطة...' : 'إنشاء الخطة العلاجية'}
                </button>
            </div>

            <div className="flex-1 bg-teal-50/50 rounded-xl p-6 border border-teal-100 relative overflow-hidden flex flex-col">
                <h3 className="font-bold text-teal-800 mb-4 flex items-center gap-2">
                    <User size={18}/> الخطة المقترحة
                </h3>
                
                {plan ? (
                    <div className="flex-1 overflow-auto bg-white p-6 rounded-lg shadow-sm border border-gray-100 whitespace-pre-line leading-relaxed text-gray-800">
                        {plan}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <AlertTriangle size={48} className="mb-4 opacity-20"/>
                        <p>حدد الطالب ونقاط الضعف ليقوم النظام باقتراح الحلول.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AITools;
