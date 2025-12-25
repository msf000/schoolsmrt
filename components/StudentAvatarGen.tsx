
import React, { useState } from 'react';
import { Student } from '../types';
import { generateStudentAvatar } from '../services/geminiService';
import { updateStudent } from '../services/storageService';
import { Sparkles, Loader2, Save, Wand2, User, RefreshCw, Star, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

interface Props {
    student: Student;
    onUpdate: (std: Student) => void;
}

const StudentAvatarGen: React.FC<Props> = ({ student, onUpdate }) => {
    const [desc, setDesc] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [tempAvatar, setTempAvatar] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setTempAvatar(null);
        try {
            const avatar = await generateStudentAvatar(student.name, student.learningStyle || 'UNKNOWN', desc);
            if (avatar) setTempAvatar(avatar);
        } catch (e) {
            alert('فشل التوليد.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSave = async () => {
        if (!tempAvatar) return;
        setIsSaving(true);
        try {
            const updated = { ...student, email: tempAvatar }; // نستخدم حقل البريد مؤقتاً لتخزين الصورة كـ base64 في هذا النموذج
            onUpdate(updated);
            alert('تم تعيين الرمز الرمزي الجديد بنجاح!');
        } catch (e) {
            alert('فشل الحفظ.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto h-full flex flex-col animate-fade-in font-tajawal">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-white flex items-center gap-3">
                    <Sparkles className="text-yellow-400" size={36}/> 
                    مصنع الأفاتار الذكي (AI)
                </h2>
                <p className="text-indigo-300 font-bold uppercase tracking-widest mt-1">صمم شخصيتك الافتراضية بلمسة ذكاء</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1 overflow-hidden">
                <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col gap-8 overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest">صف شخصيتك أو اهتماماتك</label>
                        <textarea 
                            className="w-full p-6 bg-black/30 border-2 border-white/5 rounded-3xl outline-none font-bold text-white focus:border-indigo-500 transition-all h-40"
                            placeholder="مثلاً: بطل خارق يحب الرياضيات، أو طيار يحمل كتاباً..."
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                        />
                    </div>

                    <div className="bg-indigo-600/10 p-5 rounded-2xl border border-indigo-500/20">
                        <h4 className="font-black text-indigo-300 mb-2 flex items-center gap-2 text-xs"><ImageIcon size={14}/> نمط التعلم المكتشف: {student.learningStyle}</h4>
                        <p className="text-[10px] text-indigo-200/60 leading-relaxed font-medium">سيقوم الذكاء الاصطناعي بدمج نمط تعلمك في تفاصيل الشخصية لتعكس هويتك الدراسية.</p>
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" size={28}/> : <Wand2 size={28}/>}
                        {isGenerating ? 'جاري التصميم...' : 'ابتكر الأفاتار الآن'}
                    </button>
                </div>

                <div className="bg-gradient-to-br from-indigo-950 to-slate-950 rounded-[3rem] border border-white/10 flex flex-col items-center justify-center p-10 relative overflow-hidden shadow-2xl">
                    {isGenerating ? (
                        <div className="flex flex-col items-center gap-6 animate-pulse z-10 text-center">
                            <div className="w-64 h-64 bg-white/5 rounded-[3rem] border-4 border-dashed border-white/20 flex items-center justify-center">
                                <Loader2 className="animate-spin text-indigo-500" size={80}/>
                            </div>
                            <p className="text-indigo-300 font-black text-xl">جاري الرسم بذكاء Gemini...</p>
                        </div>
                    ) : tempAvatar ? (
                        <div className="flex flex-col items-center gap-8 animate-zoom-in z-10 w-full">
                            <div className="relative group">
                                <div className="absolute -inset-6 bg-indigo-500 rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity"></div>
                                <img src={tempAvatar} alt="Avatar" className="w-80 h-80 rounded-[3.5rem] border-[12px] border-white/10 shadow-2xl relative z-10 hover:scale-105 transition-transform duration-500"/>
                                <div className="absolute -top-4 -right-4 bg-yellow-400 text-black p-4 rounded-2xl shadow-2xl z-20 border-4 border-slate-950 animate-bounce">
                                    <Star fill="currentColor" size={32}/>
                                </div>
                            </div>
                            <div className="flex gap-4 w-full">
                                <button onClick={handleGenerate} className="flex-1 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                                    <RefreshCw size={20}/> إعادة المحاولة
                                </button>
                                <button onClick={handleSave} disabled={isSaving} className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
                                    {isSaving ? <Loader2 className="animate-spin"/> : <CheckCircle2 size={20}/>} 
                                    اعتماد كصورة ملف
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center gap-8 z-10 opacity-30">
                            <div className="w-64 h-64 bg-white/5 rounded-[3rem] border-4 border-dashed border-white/20 flex items-center justify-center">
                                <User size={120} className="text-white"/>
                            </div>
                            <div>
                                <h3 className="text-4xl font-black text-white mb-4">بانتظار الإبداع</h3>
                                <p className="text-indigo-200 text-lg max-w-xs font-bold leading-relaxed">أدخل وصفاً لشخصيتك وسنقوم بصنع أفاتار تعليمي مذهل لك!</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentAvatarGen;
