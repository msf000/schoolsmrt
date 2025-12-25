
import React, { useState, useEffect } from 'react';
import { Reward, SystemUser } from '../types';
import { getRewards, saveReward, deleteReward } from '../services/storageService';
import { ShoppingBag, Plus, Trash2, Zap, Save, X, Edit } from 'lucide-react';

const RewardsManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingReward, setEditingReward] = useState<Partial<Reward> | null>(null);

    useEffect(() => {
        setRewards(getRewards(currentUser.id));
    }, [currentUser]);

    const handleSave = () => {
        if (!editingReward?.title || !editingReward?.cost) return;
        const reward: Reward = {
            id: editingReward.id || `r_${Date.now()}`,
            title: editingReward.title,
            cost: editingReward.cost,
            icon: editingReward.icon || '🎁',
            description: editingReward.description || '',
            category: editingReward.category as any || 'ITEM'
        };
        saveReward(reward, currentUser.id);
        setRewards(getRewards(currentUser.id));
        setIsModalOpen(false);
        setEditingReward(null);
    };

    return (
        <div className="p-6 h-full bg-gray-50 flex flex-col animate-fade-in font-tajawal">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3"><ShoppingBag className="text-indigo-600"/> متجر الجوائز</h2>
                    <p className="text-sm text-gray-500 font-bold uppercase">إدارة المكافآت المتاحة للطلاب</p>
                </div>
                <button onClick={() => { setEditingReward({ icon: '🎁', cost: 100, category: 'ITEM' }); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition-all">
                    <Plus size={20}/> إضافة مكافأة
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                {rewards.map(r => (
                    <div key={r.id} className="bg-white p-8 rounded-[3rem] border shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500"></div>
                        <div className="flex justify-between items-start mb-6">
                            <div className="text-4xl">{r.icon}</div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingReward(r); setIsModalOpen(true); }} className="text-gray-200 hover:text-indigo-600"><Edit size={18}/></button>
                                <button onClick={() => { deleteReward(r.id, currentUser.id); setRewards(getRewards(currentUser.id)); }} className="text-gray-200 hover:text-red-500"><Trash2 size={18}/></button>
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">{r.title}</h3>
                        <p className="text-sm text-gray-400 font-medium mb-6 line-clamp-2">{r.description}</p>
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2 text-indigo-600 font-black text-lg">
                                <Zap fill="currentColor" size={18}/> {r.cost} XP
                             </div>
                             <span className="text-[10px] font-black bg-gray-100 px-3 py-1 rounded-full text-gray-500 uppercase">{r.category}</span>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-zoom-in">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-gray-800">تخصيص مكافأة</h3>
                            <button onClick={() => setIsModalOpen(false)}><X/></button>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1"><label className="text-[10px] font-black text-gray-400 uppercase">أيقونة</label><input className="w-full p-3 border rounded-xl bg-gray-50 text-center text-2xl" value={editingReward?.icon} onChange={e=>setEditingReward({...editingReward!, icon: e.target.value})}/></div>
                                <div className="col-span-3"><label className="text-[10px] font-black text-gray-400 uppercase">اسم المكافأة</label><input className="w-full p-3 border rounded-xl bg-gray-50" value={editingReward?.title} onChange={e=>setEditingReward({...editingReward!, title: e.target.value})}/></div>
                            </div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase">الوصف</label><textarea className="w-full p-3 border rounded-xl bg-gray-50 text-sm" value={editingReward?.description} onChange={e=>setEditingReward({...editingReward!, description: e.target.value})} rows={2}/></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase">التكلفة (XP)</label><input type="number" className="w-full p-3 border rounded-xl bg-gray-50 font-black text-indigo-600" value={editingReward?.cost} onChange={e=>setEditingReward({...editingReward!, cost: Number(e.target.value)})}/></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase">النوع</label><select className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={editingReward?.category} onChange={e=>setEditingReward({...editingReward!, category: e.target.value as any})}><option value="PRIVILEGE">امتياز</option><option value="TITLE">لقب</option><option value="ITEM">غرض</option></select></div>
                            </div>
                            <button onClick={handleSave} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl flex justify-center items-center gap-2">
                                <Save size={20}/> حفظ وإتاحة في المتجر
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RewardsManager;
