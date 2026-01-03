
import React from 'react';
import { Student } from '../types';
import { QrCode, Sparkles, ShieldCheck, Zap, Trophy, Crown, Star } from 'lucide-react';

interface StudentDigitalIDProps {
    student: Student;
    stats: any;
}

const StudentDigitalID: React.FC<StudentDigitalIDProps> = ({ student, stats }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-full py-10 animate-fade-in font-tajawal">
             <div className="w-full max-w-sm bg-white rounded-[3rem] p-1 shadow-2xl border border-slate-200 relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-32 bg-indigo-600"></div>
                 <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-600 to-purple-700 opacity-90"></div>
                 
                 <div className="pt-16 pb-10 px-8 flex flex-col items-center text-center relative z-10">
                    <div className="w-full flex justify-between items-center mb-8">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-white tracking-widest uppercase">المملكة العربية السعودية</p>
                            <p className="text-white/80 font-black text-[9px] mt-0.5">نظام المتابعة الأكاديمية</p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-md">
                            <ShieldCheck className="text-white" size={28}/>
                        </div>
                    </div>

                    <div className="relative mb-8">
                        <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center text-indigo-600 text-6xl font-black shadow-2xl ring-8 ring-slate-50 transition-transform group-hover:scale-105 duration-500 border border-slate-100">
                            {student.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black border-4 border-white shadow-xl text-base">
                            Lv{stats.level}
                        </div>
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 mb-1">{student.name}</h3>
                    <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-10">{student.className} • {student.nationalId}</p>

                    <div className="bg-slate-50 p-8 rounded-[3rem] border-2 border-dashed border-slate-200 shadow-inner mb-8 w-full flex flex-col items-center justify-center gap-4 group/qr transition-all hover:bg-white hover:border-indigo-200">
                        <QrCode size={160} className="text-slate-800 opacity-90 group-hover/qr:scale-105 transition-transform" />
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Secure Verification Code</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="p-4 bg-indigo-50 rounded-[2rem] border border-indigo-100 text-center">
                            <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">إجمالي النقاط</p>
                            <p className="text-xl font-black text-indigo-700 flex items-center justify-center gap-2"><Zap size={16} fill="currentColor" className="text-yellow-400"/> {stats.xp}</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center">
                            <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">الرتبة الرقمية</p>
                            <p className="text-sm font-black text-emerald-700">
                                {stats.level > 10 ? 'طالب متميز' : 'طالب طموح'}
                            </p>
                        </div>
                    </div>
                 </div>
                 <div className="bg-slate-50 border-t p-4 text-center">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Verified Student Identity • Powered by Smart Cloud</p>
                 </div>
             </div>
        </div>
    );
};

export default StudentDigitalID;
