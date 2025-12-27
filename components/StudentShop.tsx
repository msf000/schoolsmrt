
import React from 'react';
import { Reward } from '../types';
import { ShoppingBag, Zap, Star, Gift, Shield } from 'lucide-react';

interface Props {
  xp: number;
  rewards: Reward[];
  onPurchase: (reward: Reward) => void;
}

const StudentShop: React.FC<Props> = ({ xp, rewards, onPurchase }) => {
  return (
    <div className="space-y-8 animate-fade-in font-tajawal text-right" dir="rtl">
      <div className="flex justify-between items-center bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-4">
            <ShoppingBag className="text-pink-500" size={36}/> متجر المكافآت
          </h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">استبدل إنجازاتك بجوائز حقيقية</p>
        </div>
        <div className="bg-indigo-600 px-8 py-4 rounded-3xl shadow-xl shadow-indigo-900/40 flex flex-col items-center border border-indigo-400/30">
          <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">رصيدك الحالي</span>
          <div className="flex items-center gap-2 text-3xl font-black text-white">
            <Zap size={24} fill="currentColor" className="text-yellow-400"/> {xp}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map((reward) => (
          <div key={reward.id} className="bg-slate-900/50 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden transition-all hover:border-pink-500/50">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="text-5xl group-hover:scale-110 transition-transform duration-500">{reward.icon || '🎁'}</div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                reward.category === 'PRIVILEGE' ? 'bg-purple-500/20 text-purple-400' :
                reward.category === 'TITLE' ? 'bg-blue-500/20 text-blue-400' :
                'bg-emerald-500/20 text-emerald-400'
              }`}>
                {reward.category === 'PRIVILEGE' ? 'امتياز صفي' : reward.category === 'TITLE' ? 'لقب شرفي' : 'غرض عيني'}
              </span>
            </div>

            <h3 className="text-xl font-black text-white mb-2 relative z-10">{reward.title}</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8 relative z-10">{reward.description || 'لا يوجد وصف متاح لهذه المكافأة.'}</p>

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2 text-pink-400 font-black">
                <Zap size={16} fill="currentColor"/> {reward.cost} XP
              </div>
              <button 
                onClick={() => onPurchase(reward)}
                disabled={xp < reward.cost}
                className={`px-6 py-3 rounded-2xl font-black text-xs transition-all shadow-lg ${
                  xp >= reward.cost 
                  ? 'bg-pink-600 text-white hover:bg-pink-700 active:scale-95' 
                  : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                }`}
              >
                {xp >= reward.cost ? 'استبدال الآن' : 'نقاط غير كافية'}
              </button>
            </div>
          </div>
        ))}

        {rewards.length === 0 && (
          <div className="col-span-full py-24 text-center text-slate-500 font-bold border-4 border-dashed border-white/5 rounded-[4rem] bg-white/5">
            <Gift size={64} className="mx-auto mb-4 opacity-10"/>
            <p className="text-xl">المتجر فارغ حالياً.</p>
            <p className="text-sm opacity-50 mt-2">ترقب إضافة مكافآت جديدة من قبل معلمك!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentShop;
