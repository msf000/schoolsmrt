
import React, { useState, useRef, useEffect } from 'react';
import { ScanLine, Camera, Upload, Check, X, RefreshCw, BrainCircuit, Save, FileText, Image as ImageIcon } from 'lucide-react';
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
        setExams(getExams(currentUser.id).filter(e => e.isActive));
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
        } catch (e) { alert('الكاميرا غير متاحة'); }
    };

    const capture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current!.videoWidth;
        canvas.height = videoRef.current!.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current!, 0, 0);
        setImagePreview(canvas.toDataURL('image/jpeg'));
        setCameraActive(false);
        if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    };

    const handleGrade = async () => {
        const exam = exams.find(e => e.id === selectedExamId);
        if (!exam || !imagePreview) return alert('أكمل البيانات');
        setIsGrading(true);
        try {
            const res = await gradeExamPaper(imagePreview, exam);
            setResult(res);
            if (res.studentNameDetected) {
                const match = students.find(s => s.name.includes(res.studentNameDetected));
                if (match) setSelectedStudentId(match.id);
            }
            setStep('REVIEW');
        } catch (e) { alert('فشل التحليل'); } finally { setIsGrading(false); }
    };

    const handleSave = () => {
        if (!selectedStudentId || !result) return;
        const exam = exams.find(e => e.id === selectedExamId);
        addPerformance({
            id: Date.now().toString(),
            studentId: selectedStudentId,
            subject: exam?.subject || 'عام',
            title: `تصحيح آلي: ${exam?.title}`,
            score: result.totalScore,
            maxScore: result.maxTotalScore,
            date: new Date().toISOString().split('T')[0],
            createdById: currentUser.id
        });
        alert('تم رصد الدرجة بنجاح!');
        setStep('INPUT'); setResult(null); setImagePreview(null);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-600 text-white rounded-xl shadow-lg"><ScanLine size={24}/></div>
                <div><h2 className="text-2xl font-bold text-gray-800">المصحح الآلي (AI Vision)</h2><p className="text-sm text-gray-500">صحح أوراق الطلاب فورياً عبر الكاميرا</p></div>
            </div>

            {step === 'INPUT' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                    <div className="bg-white p-6 rounded-2xl border space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">1. اختر الاختبار للمطابقة</label>
                            <select className="w-full p-3 border rounded-xl bg-gray-50" value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)}>
                                <option value="">-- اختر --</option>
                                {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-gray-700">2. صورة الورقة</label>
                            <div className="flex gap-2">
                                <button onClick={startCamera} className="flex-1 py-3 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-bold flex items-center justify-center gap-2"><Camera size={18}/> فتح الكاميرا</button>
                                <label className="flex-1 py-3 bg-gray-50 text-gray-600 border rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"><Upload size={18}/> رفع ملف <input type="file" className="hidden" accept="image/*" onChange={handleFile}/></label>
                            </div>
                            {cameraActive && (
                                <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                                    <button onClick={capture} className="absolute bottom-4 left-1/2 -translate-x-1/2 p-4 bg-white rounded-full shadow-2xl"><Camera/></button>
                                </div>
                            )}
                        </div>
                        <button onClick={handleGrade} disabled={isGrading || !imagePreview || !selectedExamId} className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold shadow-xl flex items-center justify-center gap-2 disabled:opacity-50">
                            {isGrading ? <RefreshCw className="animate-spin"/> : <BrainCircuit/>} {isGrading ? 'جاري التصحيح...' : 'ابدأ التحليل الذكي'}
                        </button>
                    </div>
                    <div className="bg-gray-100 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden">
                        {imagePreview ? <img src={imagePreview} className="max-h-full object-contain"/> : <div className="text-gray-400 text-center"><ImageIcon size={48} className="mx-auto mb-2 opacity-20"/><p>معاينة الورقة</p></div>}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border shadow-sm flex-1 flex flex-col overflow-hidden animate-slide-up">
                    <div className="p-6 border-b bg-green-50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-xl text-green-800">نتيجة التصحيح المستخرجة</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-sm font-bold">اسم الطالب:</span>
                                <select className="p-1 border rounded bg-white font-bold" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                                    <option value="">-- اختر من السجل --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                {result.studentNameDetected && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 rounded">تم اكتشاف: {result.studentNameDetected}</span>}
                            </div>
                        </div>
                        <div className="text-center bg-white p-3 rounded-xl border-2 border-green-500 shadow-sm">
                            <div className="text-4xl font-black text-green-600">{result.totalScore}</div>
                            <div className="text-[10px] font-bold text-gray-400">من {result.maxTotalScore}</div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                        {result.questions.map((q: any, i: number) => (
                            <div key={i} className={`p-4 rounded-xl border flex justify-between items-center ${q.isCorrect ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                                <div className="text-sm font-bold text-gray-700">س{q.index}: <span className="font-normal opacity-70">إجابة الطالب ({q.studentAnswer})</span></div>
                                {q.isCorrect ? <Check className="text-green-600" size={20}/> : <X className="text-red-600" size={20}/>}
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t flex gap-3">
                        <button onClick={() => setStep('INPUT')} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">إلغاء</button>
                        <button onClick={handleSave} className="flex-2 w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg">حفظ النتيجة في السجل</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AutoGrading;
