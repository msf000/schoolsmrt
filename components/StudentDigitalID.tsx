
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
             <div className="w-full max-w-sm bg-white rounded-2xl p-1 shadow-xl border border-slate-200 relative overflow-hidden group">
                 <div className="absolute top-0 left-0 w-full h-24 bg-blue-600"></div>
                 
                 <div className="pt-12 pb-8 px-8 flex flex-col items-center text-center relative z-10">
                    <div className="w-full flex justify-between items-center mb-6">
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-white tracking-widest uppercase">المملكة العربية السعودية</p>
                            <p className="text-white/80 font-bold text-[9px]">نظام المتابعة الأكاديمية</p>
                        </div>
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center border border-white/30 backdrop-blur-sm">
                            <ShieldCheck className="text-white" size={24}/>
                        </div>
                    </div>

                    <div className="relative mb-6">
                        <div className="w-28 h-28 bg-white rounded-xl flex items-center justify-center text-blue-600 text-5xl font-bold shadow-xl ring-4 ring-slate-100 transition-transform group-hover:scale-105 duration-300 border border-slate-200">
                            {student.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold border-4 border-white shadow-lg text-sm">
                            Lv{stats.level}
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-1">{student.name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase mb-8">{student.className} • {student.nationalId}</p>

                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner mb-6 w-full flex items-center justify-center">
                        <QrCode size={120} className="text-slate-800 opacity-90" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-center">
                            <p className="text-[9px] font-bold text-blue-400 uppercase mb-1">إجمالي النقاط</p>
                            <p className="text-lg font-bold text-blue-700 flex items-center justify-center gap-1"><Zap size={14} fill="currentColor"/> {stats.xp}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                            <p className="text-[9px] font-bold text-emerald-400 uppercase mb-1">الرتبة</p>
                            <p className="text-sm font-bold text-emerald-700">
                                {stats.level > 10 ? 'طالب متميز' : 'طالب مجتهد'}
                            </p>
                        </div>
                    </div>
                 </div>
                 <div className="bg-slate-50 border-t p-3 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Verified Digital Student Identity Account</p>
                 </div>
             </div>
        </div>
    );
};

export default StudentDigitalID;
