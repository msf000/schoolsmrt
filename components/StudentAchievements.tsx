
import React, { useMemo } from 'react';
import { Student, Badge } from '../types';
/* Fix: Added FileText to the imported icons */
import { Trophy, Award, Star, Zap, Crown, Download, Share2, Sparkles, Heart, Medal, ShieldCheck, FileText } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface StudentAchievementsProps {
    student: Student;
}

const StudentAchievements: React.FC<StudentAchievementsProps> = ({ student }) => {
    const badges = student.badges || [];
    
    return (
        <div className="space-y-12 animate-fade-in pb-10 font-tajawal">
            {/* Header Hero */}
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl border border-white/5">
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none rotate-12"><Trophy size={400}/></div>
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                    <div className="relative">
                        <div className="w-40 h-40 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[3.5rem] flex items-center justify-center text-7xl font-black shadow-2xl ring-8 ring-white/5">{student.name.charAt(0)}</div>
                        <div className="absolute -bottom-4 -right-4 bg-yellow-400 text-slate-950 w-16 h-16 rounded-3xl flex items-center justify-center font-black border-8 border-indigo-950 shadow-xl text-2xl">Lv{student.level || 1}</div>
                    </div>
                    <div className="text-center md:text-right flex-1">
                        <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                            <span className="bg-indigo-500 text-white px-5 py-1.5 rounded-full text-xs font-black shadow-lg">البطل المتميز</span>
                            <span className="text-indigo-300 font-bold uppercase tracking-widest text-sm">{student.className}</span>
                        </div>
                        <h2 className="text-5xl md:text-6xl font-black mb-6 leading-tight">معرض إنجازاتك 🏆</h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-3xl text-center">
                                <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">إجمالي النقاط</p>
                                <p className="text-3xl font-black">{student.xp || 0} XP</p>
                            </div>
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-3xl text-center">
                                <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">الأوسمة</p>
                                <p className="text-3xl font-black">{badges.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges Gallery */}
            <div className="bg-slate-900/50 rounded-[3.5rem] p-12 border border-white/5 shadow-2xl">
                <div className="flex justify-between items-center mb-12">
                    <h3 className="text-3xl font-black text-white flex items-center gap-4"><Crown className="text-yellow-400" size={36}/> خزانة الأوسمة الملكية</h3>
                    <Sparkles className="text-indigo-400 animate-pulse" size={32}/>
                </div>

                {badges.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
                        {badges.map((badge) => (
                            <div key={badge.id} className="group flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="absolute -inset-2 bg-indigo-500 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity"></div>
                                    <div className="w-28 h-28 bg-white/5 rounded-[2.5rem] border-4 border-white/5 group-hover:border-indigo-500 transition-all flex items-center justify-center p-4 relative z-10 shadow-2xl">
                                        <img src={badge.icon} alt={badge.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"/>
                                    </div>
                                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-slate-950 p-1.5 rounded-xl shadow-lg border-4 border-slate-900 z-20 group-hover:animate-bounce">
                                        <Star size={14} fill="currentColor"/>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <h4 className="text-white font-black text-sm mb-1">{badge.name}</h4>
                                    <p className="text-white/40 text-[10px] font-bold">{formatDualDate(badge.unlockedAt)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-white/20 gap-4">
                        <Medal size={100} strokeWidth={1} className="opacity-10"/>
                        <p className="text-xl font-black">لم تكتسب أي أوسمة بعد، ثابر في دروسك!</p>
                    </div>
                )}
            </div>

            {/* Certificates Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white/5 p-12 rounded-[3.5rem] border border-white/5 shadow-2xl flex flex-col">
                    <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-4"><Award className="text-purple-400" size={28}/> سجل الشهادات الرقمية</h3>
                    <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-purple-500/20 text-purple-400 rounded-2xl"><FileText size={24}/></div>
                                <div>
                                    <h4 className="font-black text-white">شهادة تميز في الرياضيات</h4>
                                    <p className="text-white/40 text-[10px] font-bold mt-1">الفصل الدراسي الأول • 1447هـ</p>
                                </div>
                            </div>
                            <button className="p-3 bg-white/10 text-white/40 rounded-2xl group-hover:text-white group-hover:bg-indigo-600 transition-all"><Download size={20}/></button>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-600 rounded-[3.5rem] p-10 text-white flex flex-col items-center text-center justify-center gap-6 shadow-2xl shadow-indigo-600/20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <div className="p-5 bg-white/20 rounded-full backdrop-blur-md border border-white/20 relative z-10"><ShieldCheck size={48}/></div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black mb-3">حساب موثق</h3>
                        <p className="text-indigo-100 font-bold text-sm leading-relaxed">جميع إنجازاتك مرتبطة بسجلك الأكاديمي الرسمي ويمكنك مشاركتها كملف PDF معتمد.</p>
                    </div>
                    <button className="w-full py-4 bg-white text-indigo-600 rounded-3xl font-black text-sm shadow-xl hover:bg-slate-100 transition-all relative z-10">تحميل السجل الشامل</button>
                </div>
            </div>
        </div>
    );
};

export default StudentAchievements;
