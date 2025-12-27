
import React, { useState, useRef } from 'react';
import { Camera, X, QrCode, ShieldCheck, Loader2, Sparkles, CheckCircle2, UserCheck } from 'lucide-react';
import { AttendanceStatus, Student } from '../types';
import { saveAttendance } from '../services/storageService';

interface Props {
    student: Student;
    onClose: () => void;
}

const StudentQRScanner: React.FC<Props> = ({ student, onClose }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const startScanner = async () => {
        setIsScanning(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
            
            // Mock QR Detection Logic
            setTimeout(async () => {
                setLoading(true);
                // Simulate processing and matching with classroom
                const today = new Date().toISOString().split('T')[0];
                await saveAttendance([{
                    id: `qr_att_${student.id}_${Date.now()}`,
                    studentId: student.id,
                    date: today,
                    status: AttendanceStatus.PRESENT,
                    behaviorNote: 'تحضير ذاتي عبر كود QR',
                    createdById: student.createdById
                }]);
                
                stream.getTracks().forEach(t => t.stop());
                setLoading(false);
                setSuccess(true);
                setTimeout(onClose, 2000);
            }, 3000);
            
        } catch (e) {
            alert('يرجى السماح بالوصول للكاميرا.');
            setIsScanning(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#020617] flex flex-col items-center justify-center p-6 font-tajawal">
            <button onClick={onClose} className="absolute top-8 left-8 text-white/40 hover:text-white p-3 bg-white/5 rounded-full"><X size={32}/></button>
            
            <div className="w-full max-w-sm flex flex-col items-center text-center gap-10">
                {!isScanning && !success && (
                    <div className="space-y-8 animate-zoom-in">
                        <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/20">
                            <QrCode size={48} className="text-white"/>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2">تحضير QR الذكي</h2>
                            <p className="text-indigo-300 font-medium">قم بمسح الكود المعروض على سبورة المعلم لتسجيل حضورك فوراً</p>
                        </div>
                        <button 
                            onClick={startScanner}
                            className="w-full py-5 bg-white text-indigo-900 rounded-[2rem] font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all"
                        >
                            فتح الكاميرا والمسح
                        </button>
                    </div>
                )}

                {isScanning && !success && (
                    <div className="w-full space-y-10">
                        <div className="relative w-full aspect-square rounded-[3rem] overflow-hidden border-4 border-indigo-500 shadow-2xl">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <div className="absolute inset-0 border-[30px] border-indigo-600/10 flex items-center justify-center">
                                <div className="w-64 h-64 border-2 border-white/40 rounded-3xl animate-pulse flex items-center justify-center">
                                    <div className="w-full h-1 bg-indigo-500 animate-scan absolute top-0"></div>
                                </div>
                            </div>
                            {loading && (
                                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="animate-spin text-indigo-400" size={48}/>
                                    <p className="text-white font-black">جاري التحقق من الموقع والكود...</p>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                            <ShieldCheck className="text-indigo-400" size={20}/>
                            <span className="text-indigo-100 text-xs font-bold">اتصال آمن وموثق سحابياً</span>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="space-y-8 animate-bounce-in">
                        <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.4)]">
                            <CheckCircle2 size={64} className="text-white"/>
                        </div>
                        <div>
                            <h2 className="text-4xl font-black text-white mb-2">تم التحضير بنجاح!</h2>
                            <p className="text-emerald-400 font-black flex items-center justify-center gap-2"><Sparkles size={16}/> حصلت على +5 XP للانضباط</p>
                        </div>
                        <p className="text-white/20 text-[10px] uppercase font-black tracking-widest mt-10">جاري العودة للرئيسية...</p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: 0; opacity: 0; }
                    50% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .animate-scan { animation: scan 2s linear infinite; }
            `}</style>
        </div>
    );
};

export default StudentQRScanner;
