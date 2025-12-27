
import React from 'react';
import { Student } from '../types';
import { QrCode, Sparkles, ShieldCheck, Zap, Trophy, Crown } from 'lucide-react';

interface StudentDigitalIDProps {
    student: Student;
    stats: any;
}

const StudentDigitalID: React.FC<StudentDigitalIDProps> = ({ student, stats }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-full py-10 animate-zoom-in font-tajawal">
             <div className="w-full max-w-sm bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-[3.5rem] p-1 shadow-2xl relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 transform -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                 
                 <div className="bg-[#020617] rounded-[3.4rem] p-10 flex flex-col items-center text-center relative z-10 border border-white/10">
                    <div className="w-full flex justify-between items-center mb-10">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">هوية الطالب الرقمية</p>
                            <p className="text-white font-black text-xs">نظام المتابع الذكي v2.5</p>
                        </div>
                        <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                            <Sparkles className="text-yellow-400" size={20}/>
                        </div>
                    </div>

                    <div className="relative mb-8">
                        <div className="w-32 h-32 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[2.5rem] flex items-center justify-center text-white text-5xl font-black shadow-2xl ring-4 ring-white/5 transition-transform group-hover:scale-110 duration-500">
                            {student.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-3 -right-3 bg-yellow-400 text-slate-900 w-12 h-12 rounded-2xl flex items-center justify-center font-black border-4 border-[#020617] shadow-xl text-lg">
                            Lv{stats.level}
                        </div>
                        <div className="absolute -top-3 -left-3 bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-[#020617] shadow-lg">
                            <ShieldCheck size={20}/>
                        </div>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-2">{student.name}</h3>
                    <div className="flex gap-2 mb-10">
                        <span className="bg-indigo-600/30 text-indigo-400 px-4 py-1 rounded-full text-[10px] font-black border border-indigo-500/20">{student.className}</span>
                        <span className="bg-yellow-600/30 text-yellow-400 px-4 py-1 rounded-full text-[10px] font-black border border-yellow-500/20 flex items-center gap-1"><Zap size={10} fill="currentColor"/> {stats.xp} XP</span>
                    </div>

                    <div className="bg-white p-6 rounded-[3rem] shadow-2xl shadow-indigo-500/20 mb-4 transition-transform group-hover:rotate-3">
                        <QrCode size={140} className="text-slate-900" />
                    </div>
                    
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-4">Verified Digital Identity Account</p>
                 </div>
             </div>

             <div className="mt-10 grid grid-cols-3 gap-4 w-full max-w-sm px-4">
                 <div className="bg-white/5 border border-white/5 p-4 rounded-3xl text-center backdrop-blur-md">
                     <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">الرتبة</p>
                     <p className="text-white font-black text-xs flex items-center justify-center gap-1"><Crown size={12}/> محارب</p>
                 </div>
                 <div className="bg-white/5 border border-white/5 p-4 rounded-3xl text-center backdrop-blur-md">
                     <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">الأوسمة</p>
                     <p className="text-white font-black text-xs">{(student.badges || []).length}</p>
                 </div>
                 <div className="bg-white/5 border border-white/5 p-4 rounded-3xl text-center backdrop-blur-md">
                     <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">المهمات</p>
                     <p className="text-white font-black text-xs">12 مكتملة</p>
                 </div>
             </div>
        </div>
    );
};

export default StudentDigitalID;
