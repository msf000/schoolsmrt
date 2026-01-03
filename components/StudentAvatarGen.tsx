
import React, { useState, useMemo } from 'react';
import { Student } from '../types';
import { generateStudentAvatar } from '../services/geminiService';
import { updateStudent } from '../services/storageService';
import { Sparkles, Loader2, Save, Wand2, User, RefreshCw, Star, Image as ImageIcon, CheckCircle2, Crown, ShieldAlert } from 'lucide-react';

interface Props {
    student: Student;
    onUpdate: (std: Student) => void;
}

const StudentAvatarGen: React.FC<Props> = ({ student, onUpdate }) => {
    const [desc, setDesc] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [tempAvatar, setTempAvatar] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // الألوان المتاحة للهالة بناءً على ما اشتراه الطالب
    const availableAuras = useMemo(() => {
        const auras = ['indigo']; // اللون الافتراضي
        if (student.purchasedRewards?.includes('aura_gold')) auras.push('gold');
        if (student.purchasedRewards?.includes('aura_emerald')) auras.push('emerald');
        if (student.purchasedRewards?.includes('aura_ruby')) auras.push('ruby');
        return auras;
    }, [student.purchasedRewards]);

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

    const handleUpdateAura = (color: string) => {
        onUpdate({ ...student, auraColor: color });
    };

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col animate-fade-in font-tajawal">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-white flex items-center gap-3">
                    <Crown className="text-yellow-400" size={36}/> 
                    استوديو تخصيص الشخصية
                </h2>
                <p className="text-indigo-300 font-bold uppercase tracking-widest mt-1">طور مظهرك الرقمي باستخدام إنجازاتك</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 flex-1 overflow-hidden pb-10">
                <div className="space-y-8 overflow-y-auto custom-scrollbar pr-2">
                    {/* AI Avatar Factory */}
                    <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl flex flex-col gap-6">
                        <h3 className="text-xl font-black text-white flex items-center gap-2"><Sparkles className="text-indigo-400"/> مصنع الصور (AI)</h3>
                        <div className="space-y-4">
                            <textarea 
                                className="w-full p-6 bg-black/30 border-2 border-white/5 rounded-3xl outline-none font-bold text-white focus:border-indigo-500 transition-all h-32 text-sm"
                                placeholder="صف شخصيتك (مثلاً: بطل خارق يطير فوق مدرسة...)"
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                            />
                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 className="animate-spin" size={24}/> : <Wand2 size={24}/>}
                                {isGenerating ? 'جاري التصميم...' : 'ابتكر الأفاتار بالذكاء الاصطناعي'}
                            </button>
                        </div>
                    </div>

                    {/* Aura Customization */}
                    <div className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl">
                        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2"><ImageIcon className="text-emerald-400"/> هالات الطاقة المكتسبة</h3>
                        <div className="grid grid-cols-4 gap-4">
                            {['indigo', 'gold', 'emerald', 'ruby'].map(color => {
                                const isLocked = !availableAuras.includes(color);
                                return (
                                    <button 
                                        key={color}
                                        onClick={() => !isLocked && handleUpdateAura(color)}
                                        className={`h-20 rounded-2xl border-4 transition-all relative overflow-hidden ${
                                            student.auraColor === color ? 'border-white scale-105 shadow-xl' : 'border-white/5 hover:border-white/20'
                                        } ${isLocked ? 'opacity-30 cursor-not-allowed grayscale' : ''}`}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-tr ${
                                            color === 'indigo' ? 'from-indigo-600 to-purple-600' :
                                            color === 'gold' ? 'from-yellow-400 to-amber-600' :
                                            color === 'emerald' ? 'from-emerald-400 to-teal-600' : 'from-rose-500 to-red-700'
                                        }`}></div>
                                        {isLocked && <ShieldAlert size={20} className="absolute inset-0 m-auto text-white"/>}
                                        {student.auraColor === color && <CheckCircle2 size={20} className="absolute inset-0 m-auto text-white"/>}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-4 text-[10px] text-slate-500 font-bold">يمكنك شراء المزيد من الهالات من متجر المكافآت باستخدام XP.</p>
                    </div>
                </div>

                {/* Preview Window */}
                <div className="bg-gradient-to-br from-indigo-950 to-slate-950 rounded-[4rem] border border-white/10 flex flex-col items-center justify-center p-12 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-8 left-8 bg-white/5 px-4 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-indigo-300">Live Preview</div>
                    
                    {isGenerating ? (
                        <div className="flex flex-col items-center gap-6 animate-pulse z-10 text-center">
                            <div className="w-64 h-64 bg-white/5 rounded-[3rem] border-4 border-dashed border-white/20 flex items-center justify-center">
                                <Loader2 className="animate-spin text-indigo-500" size={80}/>
                            </div>
                            <p className="text-indigo-300 font-black text-xl tracking-tight">جاري الرسم بذكاء Gemini...</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-8 animate-zoom-in z-10 w-full">
                            <div className="relative group">
                                {/* الهالة الديناميكية في المعاينة */}
                                {student.auraColor && (
                                    <div className={`absolute inset-[-20px] rounded-full blur-3xl opacity-40 animate-pulse transition-all duration-1000 ${
                                        student.auraColor === 'gold' ? 'bg-yellow-400' :
                                        student.auraColor === 'emerald' ? 'bg-emerald-400' :
                                        student.auraColor === 'ruby' ? 'bg-red-500' : 'bg-indigo-500'
                                    }`}></div>
                                )}
                                
                                <img 
                                    src={tempAvatar || (student.avatarUrl?.startsWith('data:image') ? student.avatarUrl : null) || 'https://via.placeholder.com/300?text=Student'} 
                                    alt="Avatar" 
                                    className={`w-80 h-80 rounded-[3.5rem] border-[12px] shadow-2xl relative z-10 transition-all duration-500 ${
                                        student.auraColor === 'gold' ? 'border-yellow-400/50' :
                                        student.auraColor === 'emerald' ? 'border-emerald-400/50' :
                                        student.auraColor === 'ruby' ? 'border-red-500/50' : 'border-white/10'
                                    }`}
                                />
                                
                                <div className="absolute -top-4 -right-4 bg-yellow-400 text-black p-4 rounded-2xl shadow-2xl z-20 border-4 border-slate-950 animate-bounce">
                                    <Star fill="currentColor" size={32}/>
                                </div>
                            </div>

                            {tempAvatar && (
                                <button 
                                    onClick={async () => {
                                        setIsSaving(true);
                                        await updateStudent({ ...student, avatarUrl: tempAvatar });
                                        onUpdate({ ...student, avatarUrl: tempAvatar });
                                        setIsSaving(false);
                                        setTempAvatar(null);
                                        alert('تم تحديث صورتك بنجاح!');
                                    }} 
                                    disabled={isSaving}
                                    className="px-12 py-4 bg-emerald-600 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    {isSaving ? <Loader2 className="animate-spin"/> : <Save/>} حفظ التغيير
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentAvatarGen;
