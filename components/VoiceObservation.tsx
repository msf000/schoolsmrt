
import React, { useState, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, User, Save, X, Bot, ShieldCheck } from 'lucide-react';
import { Student } from '../types';
import { GoogleGenAI } from "@google/genai";
import { saveBehaviorIncident } from '../services/storageService';
import { useToast } from './ToastProvider';

interface Props {
    students: Student[];
    teacherId: string;
    onClose: () => void;
}

const VoiceObservation: React.FC<Props> = ({ students, teacherId, onClose }) => {
    const { showToast } = useToast();
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            
            recorder.start();
            setIsRecording(true);
            setTranscript('جاري الاستماع...');
        } catch (err) {
            showToast('يرجى السماح بالوصول للميكروفون', 'ERROR');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            processWithAI("أحمد اليوم كان متميز جداً في حل المسائل الرياضية وساعد زملاءه"); // محاكاة للنص
        }
    };

    const processWithAI = async (text: string) => {
        setIsProcessing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `أنت مساعد تربوي. حلل الملاحظة التالية واستخرج منها: اسم الطالب، نوع السلوك (إيجابي/سلبي)، النقاط المقترحة، وملخص تربوي. النص: "${text}". أرجع النتيجة بتنسيق JSON: {"studentName": "...", "type": "POSITIVE/NEGATIVE", "points": 10, "summary": "..."}`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            
            const result = JSON.parse(response.text || "{}");
            setAiAnalysis(result);
            setTranscript(text);

            // محاولة مطابقة الطالب تلقائياً
            const match = students.find(s => s.name.includes(result.studentName));
            if (match) setSelectedStudentId(match.id);

        } catch (e) {
            showToast('فشل تحليل الملاحظة ذكياً', 'ERROR');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!selectedStudentId || !aiAnalysis) return;
        
        await saveBehaviorIncident({
            id: `voice_${Date.now()}`,
            studentId: selectedStudentId,
            teacherId: teacherId,
            type: aiAnalysis.type,
            category: 'ملاحظة صوتية ذكية',
            points: aiAnalysis.points,
            date: new Date().toISOString(),
            note: transcript,
            actionTaken: aiAnalysis.summary
        });
        
        showToast('تم رصد الملاحظة بنجاح', 'SUCCESS');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 font-tajawal" dir="rtl">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-zoom-in">
                <div className="p-8 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Mic size={100}/></div>
                    <h3 className="text-xl font-black relative z-10 flex items-center gap-2"><Sparkles size={20}/> رصد صوتي ذكي</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full relative z-10"><X/></button>
                </div>

                <div className="p-8 flex flex-col items-center gap-8">
                    {!aiAnalysis ? (
                        <div className="text-center space-y-6">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${isRecording ? 'bg-red-50 scale-110' : 'bg-slate-100 text-slate-300'}`}>
                                {isRecording ? (
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-full animate-ping bg-red-400/50"></div>
                                        <MicOff size={48} className="relative z-10 text-white cursor-pointer" onClick={stopRecording}/>
                                    </div>
                                ) : (
                                    <Mic size={48} className="cursor-pointer hover:text-indigo-600" onClick={startRecording}/>
                                )}
                            </div>
                            <div>
                                <p className="text-lg font-black text-slate-800">{isRecording ? 'جاري الاستماع إليك...' : 'اضغط للبدء في وصف الملاحظة'}</p>
                                <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">تحدث بحرية: "محمد اليوم كان مبدع في الإذاعة" <br/> سأقوم بتحليل الكلام ورصده تلقائياً.</p>
                            </div>
                            {isProcessing && (
                                <div className="flex items-center gap-3 bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100 text-indigo-600 animate-pulse">
                                    <Loader2 className="animate-spin" size={18}/>
                                    <span className="text-sm font-black">جاري التفكير وتحليل النص...</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full space-y-6 animate-slide-up">
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                <p className="text-xs text-slate-400 font-black uppercase mb-2 tracking-widest">النص المسجل:</p>
                                <p className="text-slate-700 font-bold leading-relaxed italic">"{transcript}"</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase">اسم الطالب المكتشف</p>
                                    <p className="text-indigo-900 font-black">{aiAnalysis.studentName}</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase">النقاط المقترحة</p>
                                    <p className="text-emerald-900 font-black">{aiAnalysis.points > 0 ? '+' : ''}{aiAnalysis.points} XP</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">تأكيد الطالب في النظام:</label>
                                <select 
                                    className="w-full p-3 border rounded-2xl bg-white font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"
                                    value={selectedStudentId}
                                    onChange={e => setSelectedStudentId(e.target.value)}
                                >
                                    <option value="">-- اختر الطالب --</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.className})</option>)}
                                </select>
                            </div>

                            <button 
                                onClick={handleSave}
                                disabled={!selectedStudentId}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Save size={20}/> اعتماد ورصد الملاحظة
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoiceObservation;
