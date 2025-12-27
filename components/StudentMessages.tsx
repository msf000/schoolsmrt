
import React from 'react';
import { MessageLog } from '../types';
import { Bell, Clock, User, CheckCircle, Info, Megaphone, Calendar } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface Props {
  messages: MessageLog[];
}

const StudentMessages: React.FC<Props> = ({ messages }) => {
  return (
    <div className="space-y-8 animate-fade-in font-tajawal text-right" dir="rtl">
      <div className="bg-slate-900/50 p-8 rounded-[3.5rem] border border-white/5 shadow-2xl flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-4">
            <Bell className="text-yellow-400 animate-swing" size={36}/> مركز التنبيهات
          </h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">تواصل مباشر وتوجيهات من معلميك</p>
        </div>
        <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10 text-white/40 text-xs font-black uppercase">
          إجمالي الرسائل: {messages.length}
        </div>
      </div>

      <div className="space-y-4 pb-20">
        {messages.map((msg) => (
          <div key={msg.id} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-xl hover:border-white/10 transition-all group">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${msg.type === 'ANNOUNCEMENT' ? 'bg-purple-500/20 text-purple-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {msg.type === 'ANNOUNCEMENT' ? <Megaphone size={20}/> : <User size={20}/>}
                  </div>
                  <div>
                    <h4 className="text-white font-black">{msg.sentBy}</h4>
                    <p className="text-[10px] text-slate-500 font-bold flex items-center gap-2 mt-1">
                      <Calendar size={12}/> {formatDualDate(msg.date)}
                    </p>
                  </div>
                </div>
                <div className="bg-black/20 p-6 rounded-3xl border border-white/5">
                  <p className="text-indigo-100 text-base leading-relaxed font-medium">{msg.content}</p>
                </div>
              </div>
              <div className="flex md:flex-col justify-end items-end gap-2">
                 <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg ${
                   msg.status === 'SENT' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20' : 'bg-red-600/20 text-red-400 border border-red-500/20'
                 }`}>
                   {msg.status === 'SENT' ? 'وصلت بنجاح' : 'فشل الإرسال'}
                 </span>
                 <div className="p-3 bg-white/5 rounded-2xl text-white/20 group-hover:text-indigo-400 transition-colors">
                   <CheckCircle size={20}/>
                 </div>
              </div>
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="py-32 text-center text-slate-600 border-4 border-dashed border-white/5 rounded-[4rem] bg-white/5">
            <Bell size={80} className="mx-auto mb-6 opacity-5"/>
            <p className="text-2xl font-black">صندوق الوارد فارغ</p>
            <p className="text-sm opacity-50 mt-2">لا توجد رسائل جديدة من المعلمين حالياً.</p>
          </div>
        )}
      </div>
      <style>{`
        @keyframes swing {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-swing { animation: swing 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default StudentMessages;
