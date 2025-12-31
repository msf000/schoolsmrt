
import React, { useState, useRef } from 'react';
import { Camera, X, Sparkles, Loader2, CheckCircle2, AlertCircle, RefreshCw, UserCheck, Image as ImageIcon } from 'lucide-react';
import { Student, AttendanceStatus, AttendanceRecord } from '../types';
import { analyzeAttendancePhoto } from '../services/geminiService';
import { useToast } from './ToastProvider';

interface Props {
    students: Student[];
    onDetected: (records: AttendanceRecord[]) => void;
    onClose: () => void;
    currentUserId?: string;
    subject?: string;
}

const AIAttendanceScanner: React.FC<Props> = ({ students, onDetected, onClose, currentUserId, subject }) => {
    const { showToast } = useToast();
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [detectionResult, setDetectionResult] = useState<any[]>([]);
    
    const videoRef = useRef<HTMLVideoElement>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraActive(true);
            }
        } catch (err) {
            showToast('لا يمكن الوصول للكاميرا. تأكد من إعطاء الصلاحيات.', 'ERROR');
        }
    };

    const captureAndAnalyze = async () => {
        const canvas = document.createElement('canvas');
        if (videoRef.current) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(videoRef.current, 0, 0);
            const base64 = canvas.toDataURL('image/jpeg');
            setCapturedImage(base64);
            
            // إيقاف الكاميرا
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
            setIsCameraActive(false);

            // التحليل بالذكاء الاصطناعي
            setIsAnalyzing(true);
            try {
                const result = await analyzeAttendancePhoto(base64, students);
                if (result && result.attendance) {
                    setDetectionResult(result.attendance);
                    showToast('اكتمل التحليل البصري بنجاح!', 'SUCCESS');
                } else {
                    throw new Error();
                }
            } catch (e) {
                showToast('فشل تحليل الصورة. يرجى المحاولة يدوياً أو تحسين الإضاءة.', 'ERROR');
            } finally {
                setIsAnalyzing(false);
            }
        }
    };

    const handleConfirm = () => {
        const today = new Date().toISOString().split('T')[0];
        const records: AttendanceRecord[] = detectionResult.map(res => {
            const student = students.find(s => s.name.includes(res.name) || res.name.includes(s.name));
            if (!student) return null;
            return {
                id: `ai_${student.id}_${Date.now()}`,
                studentId: student.id,
                date: today,
                status: res.status === 'PRESENT' ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT,
                subject: subject || 'عام',
                createdById: currentUserId,
                behaviorNote: 'تم الرصد عبر التحليل البصري AI'
            };
        }).filter(r => r !== null) as AttendanceRecord[];

        onDetected(records);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 font-tajawal">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-zoom-in">
                <div className="p-8 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Sparkles size={120}/></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black flex items-center gap-3"><Camera/> التحضير البصري الذكي</h3>
                        <p className="text-indigo-100 text-xs mt-1 font-bold">التقط صورة للفصل وسيقوم Gemini برصد الغياب آلياً</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full relative z-10 transition-colors"><X size={24}/></button>
                </div>

                <div className="p-8 flex-1 flex flex-col gap-6">
                    {!isCameraActive && !capturedImage && (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6 text-center">
                            <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center text-indigo-600 shadow-inner">
                                <ImageIcon size={48}/>
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-slate-800">جاهز لبدء الرصد؟</h4>
                                <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mt-2">تأكد من أن جميع وجوه الطلاب واضحة في الكادر للحصول على أفضل دقة.</p>
                            </div>
                            <button onClick={startCamera} className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95">تشغيل الكاميرا</button>
                        </div>
                    )}

                    {isCameraActive && (
                        <div className="relative rounded-[2.5rem] overflow-hidden aspect-video bg-black border-4 border-indigo-100 shadow-2xl">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <div className="absolute inset-0 border-[40px] border-indigo-600/10 pointer-events-none flex items-center justify-center">
                                <div className="w-full h-0.5 bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,1)] animate-scan"></div>
                            </div>
                            <button onClick={captureAndAnalyze} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-indigo-600 p-6 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all">
                                <Sparkles size={32} className="animate-pulse"/>
                            </button>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-indigo-600" size={64}/>
                            <p className="text-xl font-black text-slate-700">جاري تحليل ملامح الفصل...</p>
                            <p className="text-xs text-slate-400 font-bold">نقارن الصورة مع قاعدة بيانات الطلاب السحابية</p>
                        </div>
                    )}

                    {capturedImage && !isAnalyzing && detectionResult.length > 0 && (
                        <div className="flex-1 flex flex-col overflow-hidden animate-slide-up">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-black text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-emerald-500"/> مراجعة نتائج الرصد:</h4>
                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase">اكتشف {detectionResult.filter(r=>r.status==='PRESENT').length} حاضرين</span>
                            </div>
                            <div className="flex-1 overflow-y-auto border rounded-3xl bg-slate-50 p-4 custom-scrollbar">
                                <div className="grid grid-cols-2 gap-2">
                                    {detectionResult.map((res, i) => (
                                        <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${res.status === 'PRESENT' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                            <span className="text-xs font-black truncate">{res.name}</span>
                                            <span className={`text-[8px] font-black ${res.status === 'PRESENT' ? 'text-emerald-600' : 'text-rose-600'}`}>{res.status === 'PRESENT' ? 'حاضر' : 'غائب'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => { setCapturedImage(null); setDetectionResult([]); startCamera(); }} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                    <RefreshCw size={18}/> إعادة المحاولة
                                </button>
                                <button onClick={handleConfirm} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                                    <UserCheck size={20}/> اعتماد ورصد الكل
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-150px); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(150px); opacity: 0; }
                }
                .animate-scan { animation: scan 3s linear infinite; }
            `}</style>
        </div>
    );
};

export default AIAttendanceScanner;
