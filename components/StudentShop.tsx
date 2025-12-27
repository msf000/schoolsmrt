
import React, { useState } from 'react';
import { Reward, Student } from '../types';
import { ShoppingBag, Zap, Star, Gift, Shield, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { savePurchaseRequest, updateStudent } from '../services/storageService';
import { useToast } from './ToastProvider';

interface Props {
  xp: number;
  rewards: Reward[];
  student: Student;
  onPurchaseComplete: (updatedStudent: Student) => void;
}

const StudentShop: React.FC<Props> = ({ xp, rewards, student, onPurchaseComplete }) => {
  const { showToast } = useToast();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  const handlePurchase = async (reward: Reward) => {
    if (xp < reward.cost) return;
    
    setPurchasingId(reward.id);
    try {
        // Tentative deduction of XP
        const newXp = xp - reward.cost;
        const updatedStudent: Student = {
            ...student,
            xp: newXp,
            purchasedRewards: [...(student.purchasedRewards || []), reward.id]
        };

        // Create Purchase Request for Teacher Approval
        await savePurchaseRequest({
            id: `req_${Date.now()}`,
            studentId: student.id,
            studentName: student.name,
            rewardId: reward.id,
            rewardTitle: reward.title,
            cost: reward.cost,
            status: 'PENDING',
            date: new Date().toISOString(),
            teacherId: student.createdById || ''
        });

        // Update student record locally and on cloud
        await updateStudent(updatedStudent);
        onPurchaseComplete(updatedStudent);
        
        showToast(`تم إرسال طلب شراء "${reward.title}" للمعلم للموافقة.`, 'SUCCESS');
    } catch (e) {
        showToast('فشل إتمام عملية الشراء.', 'ERROR');
    } finally {
        setPurchasingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in font-tajawal text-right pb-24" dir="rtl">
      <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-4">
            <ShoppingBag className="text-pink-500" size={36}/> متجر المكافآت الأسطوري
          </h2>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">استبدل مجهودك بجوائز حقيقية داخل الفصل</p>
        </div>
        <div className="bg-indigo-600 px-8 py-4 rounded-3xl shadow-xl shadow-indigo-900/40 flex flex-col items-center border border-indigo-400/30 group">
          <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 group-hover:text-white transition-colors">رصيدك من الـ XP</span>
          <div className="flex items-center gap-2 text-3xl font-black text-white">
            <Zap size={24} fill="currentColor" className="text-yellow-400 animate-pulse"/> {xp}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {rewards.map((reward) => {
          const isAffordable = xp >= reward.cost;
          const isOwned = student.purchasedRewards?.includes(reward.id);
          const isPurchasing = purchasingId === reward.id;

          return (
            <div key={reward.id} className={`bg-slate-900/50 p-8 rounded-[3rem] border-2 shadow-2xl relative group overflow-hidden transition-all duration-500 ${isOwned ? 'border-indigo-500/30 opacity-70' : isAffordable ? 'border-white/5 hover:border-pink-500/50' : 'border-white/5 grayscale'}`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="text-6xl group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">{reward.icon || '🎁'}</div>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg ${
                  reward.category === 'PRIVILEGE' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                  reward.category === 'TITLE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {reward.category === 'PRIVILEGE' ? 'امتياز فصلي' : reward.category === 'TITLE' ? 'لقب شرفي' : 'عرض خاص'}
                </span>
              </div>

              <h3 className="text-2xl font-black text-white mb-2 relative z-10">{reward.title}</h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 relative z-10 h-12 line-clamp-2">{reward.description || 'احصل على هذه المكافأة لتميزك في الفصل.'}</p>

              <div className="flex items-center justify-between relative z-10 mt-auto">
                <div className="flex items-center gap-2 text-pink-400 font-black text-lg">
                  <Zap size={18} fill="currentColor"/> {reward.cost} <span className="text-[10px] opacity-60">XP</span>
                </div>
                
                {isOwned ? (
                    <div className="flex items-center gap-2 text-indigo-400 font-black text-sm bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20">
                        <CheckCircle2 size={16}/> تم الامتلاك
                    </div>
                ) : (
                    <button 
                        onClick={() => handlePurchase(reward)}
                        disabled={!isAffordable || isPurchasing}
                        className={`px-8 py-3.5 rounded-2xl font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                            isAffordable 
                            ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:shadow-pink-500/20 hover:scale-105 active:scale-95' 
                            : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                        }`}
                    >
                        {isPurchasing ? <Loader2 size={18} className="animate-spin"/> : !isAffordable ? <Lock size={18}/> : <ShoppingBag size={18}/>}
                        {isPurchasing ? 'جاري الشراء...' : !isAffordable ? 'غير متاح' : 'استبدال الآن'}
                    </button>
                )}
              </div>
            </div>
          );
        })}

        {rewards.length === 0 && (
          <div className="col-span-full py-40 text-center text-slate-600 border-4 border-dashed border-white/5 rounded-[4rem] bg-white/5 animate-pulse flex flex-col items-center justify-center">
            <Gift size={100} className="mb-6 opacity-10"/>
            <h3 className="text-2xl font-black text-white/20">المتجر مغلق حالياً</h3>
            <p className="text-sm opacity-50 mt-2">المعلم سيقوم بإضافة مكافآت جديدة قريباً!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentShop;
