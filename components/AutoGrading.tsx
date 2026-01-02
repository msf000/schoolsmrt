
import React, { useState, useRef, useEffect } from 'react';
// Fix: Added missing Target, Trophy and CheckCircle imports from lucide-react
import { ScanLine, Camera, Upload, Check, X, RefreshCw, BrainCircuit, Image as ImageIcon, Sparkles, Loader2, Save, FileText, Bot, Lightbulb, Trophy, CheckCircle, Target } from 'lucide-react';
import { Exam, Student, PerformanceRecord, SystemUser } from '../types';
import { getExams, getStudents, addPerformance } from '../services/storageService';
import { gradeExamPaper } from '../services/geminiService';

const AutoGrading: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isGrading, setIsGrading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [step, setStep] = useState<'INPUT' | 'REVIEW'>('INPUT');
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraActive, setCameraActive] = useState(false);

    useEffect(() => {
        const loadedExams = getExams(currentUser.id);
        setExams(loadedExams.filter((e: Exam) => e.isActive));
        setStudents(getStudents());
    }, [currentUser]);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (error: unknown) { 
            alert('الكاميرا غير متاحة أو تم رفض الوصول'); 
        }
    };

    const capture = () => {
        const canvas = document.createElement('canvas');
        if (videoRef.current) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                setImagePreview(canvas.toDataURL('image/jpeg'));
            }
            setCameraActive(false);
            if (videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }
        }
    };

    const handleGrade = async () => {
        const exam = exams.find(e => e.id === selectedExamId);
        if (!exam || !imagePreview) return alert('يرجى اختيار الاختبار وصورة الورقة');
        setIsGrading(true);
        try {
            const res = await gradeExamPaper(imagePreview, exam);
            if (res) {
                setResult(res);
                if (res.studentNameDetected) {
                    const match = students.find(s => s.name.includes(res.studentNameDetected) || res.studentNameDetected.includes(s.name));
                    if (match) setSelectedStudentId(match.id);
                }
                setStep('REVIEW');
            } else {
                alert('فشل التحليل. تأكد من وضوح الصورة ونموذج الإجابة.');
            }
        } catch (error: unknown) { 
            alert('فشل تحليل الورقة بالذكاء الاصطناعي'); 
        } finally { 
            setIsGrading(false); 
        }
    };

    const handleSave = () => {
        if (!selectedStudentId || !result) return;
        const exam = exams.find(e => e.id === selectedExamId);
        const record: PerformanceRecord = {
            id: `ag_${Date.now()}`,
            studentId: selectedStudentId,
            subject: exam?.subject || 'عام',
            title: `تصحيح آلي: ${exam?.title}`,
            score: result.totalScore,
            maxScore: result.maxTotalScore || 10,
            date: new Date().toISOString().split('T')[0],
            createdById: currentUser.id,
            notes: result.aiRecommendation
        };
        addPerformance([record]);
        alert('تم رصد الدرجة بنجاح في سجل الطالب!');
        setStep('INPUT'); 
        setResult(null); 
        setImagePreview(null);
    };

    return (
        <div className="p-6 md:p-10 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-600 text-white rounded-2xl shadow-xl shadow-purple-200"><ScanLine size={32}/></div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-800">المصحح الآلي (AI Vision)</h2>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">تكنولوجيا تحليل الخط اليدوي ورصد المهارات</p>
                    </div>
                </div>
            </div>

            {step === 'INPUT' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1 overflow-hidden">
                    <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-8 overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-center gap-4">
                                <Bot className="text-indigo-600"/>
                                <p className="text-xs text-indigo-800 font-bold leading-relaxed">ارفع صورة واضحة لورقة إجابة الطالب، وسأقوم بتحليلها ومقارنتها بنموذج الإجابة المسجل لدي.</p>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">1. نموذج الإجابة للمطابقة</label>
                                <select className="w-full p-4 border rounded-2xl bg-slate-50 font-black text-sm outline-none focus:ring-4 focus:ring-purple-500/10 transition-all" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
                                    <option value="">-- اختر الاختبار النشط --</option>
                                    {exams.map(e => <option key={e.id} value={e.id}>{e.title} ({e.subject})</option>)}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">2. التقاط أو رفع الورقة</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={startCamera} className="py-4 bg-indigo-50 text-indigo-700 border-2 border-indigo-100 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all shadow-sm"><Camera size={18}/> فتح الكاميرا</button>
                                    <label className="py-4 bg-slate-50 text-slate-600 border-2 border-slate-100 rounded-2xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 transition-all shadow-sm">
                                        <Upload size={18}/> رفع ملف
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFile}/>
                                    </label>
                                </div>
                                {cameraActive && (
                                    <div className="relative rounded-[2.5rem] overflow-hidden aspect-[4/3] bg-black border-4 border-white shadow-2xl">
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 border-[30px] border-white/10 pointer-events-none"></div>
                                        <button onClick={capture} className="absolute bottom-6 left-1/2 -translate-x-1/2 p-6 bg-white text-indigo-600 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all"><Camera size={32}/></button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={handleGrade} 
                            disabled={isGrading || !imagePreview || !selectedExamId} 
                            className="w-full py-6 bg-purple-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-purple-100 hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-4"
                        >
                            {isGrading ? <Loader2 className="animate-spin" size={28}/> : <Sparkles size={28}/>} 
                            {isGrading ? 'جاري تحليل الخط اليدوي...' : 'بدء التصحيح الذكي الآن'}
                        </button>
                    </div>

                    <div className="bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center group">
                        {imagePreview ? (
                            <div className="relative w-full h-full">
                                <img src={imagePreview} className="w-full h-full object-contain" alt="preview"/>
                                {isGrading && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                                        <div className="w-full h-1 bg-purple-500 shadow-[0_0_20px_#a855f7] animate-scan absolute top-0"></div>
                                        <Loader2 className="animate-spin text-white mb-4" size={64}/>
                                        <p className="text-white font-black text-xl">جاري مطابقة نواتج التعلم...</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-6 opacity-30">
                                <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border-4 border-dashed border-white/20">
                                    <ImageIcon size={64} className="text-white"/>
                                </div>
                                <p className="text-2xl font-black text-white">معاينة ورقة الإجابة</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col lg:flex-row gap-10 overflow-hidden animate-slide-up pb-10">
                    {/* Left: Score Card */}
                    <div className="w-full lg:w-[400px] flex flex-col gap-6">
                        <div className="bg-indigo-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={150}/></div>
                            <div className="relative z-10 text-center">
                                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-4">النتيجة المستخرجة</p>
                                <div className="text-8xl font-black mb-2 drop-shadow-xl">{result?.totalScore}</div>
                                <div className="text-xl font-bold opacity-60">من {result?.maxTotalScore} درجة</div>
                                <div className="mt-8 flex items-center justify-center gap-2 bg-white/10 py-3 rounded-2xl border border-white/10">
                                    <CheckCircle size={16} className="text-emerald-400"/>
                                    <span className="text-xs font-black">نسبة الإتقان: {Math.round((result?.totalScore/result?.maxTotalScore)*100)}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            <h4 className="font-black text-slate-800 flex items-center gap-2"><Bot size={18} className="text-indigo-600"/> تأكيد الهوية</h4>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase">اسم الطالب المكتشف:</label>
                                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl font-black text-indigo-700 flex justify-between items-center">
                                        {result?.studentNameDetected || "لم يتم التعرف"}
                                        <Sparkles size={16}/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase">الربط مع سجلات النظام:</label>
                                    <select className="w-full p-4 border rounded-2xl bg-white font-black text-sm outline-none shadow-sm focus:ring-4 focus:ring-indigo-500/10" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                                        <option value="">-- اختر من السجل --</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="pt-6 border-t">
                                <button onClick={handleSave} disabled={!selectedStudentId} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-lg shadow-xl hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                                    <Save/> رصد الدرجة فوراً
                                </button>
                                <button onClick={()=>setStep('INPUT')} className="w-full mt-3 py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">إلغاء وإعادة المحاولة</button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Detailed Analysis */}
                    <div className="flex-1 bg-white rounded-[4rem] border shadow-sm overflow-hidden flex flex-col">
                        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><FileText size={20}/> تفاصيل إجابات الطالب</h3>
                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">تحليل المهارات الفردية</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                            {result?.questions?.map((q: any, i: number) => (
                                <div key={i} className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col md:flex-row gap-6 items-center ${q.isCorrect ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm shrink-0 ${q.isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {q.isCorrect ? <Check/> : <X/>}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-black text-slate-800">السؤال رقم {q.index}</h5>
                                            <span className={`text-[10px] font-black px-3 py-1 rounded-full ${q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                إجابة الطالب: {q.studentAnswer}
                                            </span>
                                        </div>
                                        {!q.isCorrect && q.feedback && (
                                            <div className="mt-3 p-3 bg-white/60 rounded-xl text-xs font-bold text-slate-500 border border-red-50 flex items-start gap-2">
                                                <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5"/>
                                                {q.feedback}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {result?.aiRecommendation && (
                                <div className="mt-8 bg-purple-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                                    <Sparkles className="absolute top-4 left-4 opacity-20" size={32}/>
                                    <h4 className="text-xl font-black mb-4 flex items-center gap-3"><Bot/> التوصية الذكية لدعم الطالب:</h4>
                                    <p className="text-indigo-100 leading-relaxed font-medium italic">"{result.aiRecommendation}"</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan { animation: scan 3s linear infinite; }
            `}</style>
        </div>
    );
};

export default AutoGrading;
