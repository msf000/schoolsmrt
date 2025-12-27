
import React, { useState } from 'react';
import { Student, SystemUser } from '../types';
import { Sparkles, Users, Star, Trophy, Zap, Plus, Search, Map, Palette, Code, Book, Music, Trash2, ArrowLeft } from 'lucide-react';

interface Club {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    memberCount: number;
    description: string;
}

const CLUBS: Club[] = [
    { id: 'c1', name: 'نادي المبدعين', icon: <Palette/>, color: 'bg-pink-500', memberCount: 12, description: 'للفنون، الرسم، والتصميم الرقمي.' },
    { id: 'c2', name: 'فرسان البرمجة', icon: <Code/>, color: 'bg-indigo-600', memberCount: 8, description: 'تعلم الخوارزميات وبناء التطبيقات.' },
    { id: 'c3', name: 'أصدقاء المكتبة', icon: <Book/>, color: 'bg-emerald-600', memberCount: 20, description: 'نادي القراءة والتلخيص والمناظرات.' },
    { id: 'c4', name: 'جوقة المدرسة', icon: <Music/>, color: 'bg-amber-500', memberCount: 15, description: 'الفنون الصوتية والإلقاء المسرحي.' },
];

const StudentClubs: React.FC<{ students: Student[], currentUser: SystemUser }> = ({ students, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'EXPLORE' | 'MEMBERS'>('EXPLORE');
    const [selectedClub, setSelectedClub] = useState<Club | null>(null);

    return (
        <div className="p-6 md:p-10 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden pb-32 lg:pb-10">
            <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Users className="text-indigo-600" size={36}/> أندية المهارات والاهتمامات
                    </h2>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">تنمية جوانب الشخصية خارج النطاق الأكاديمي</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl border shadow-xl">
                    <button onClick={() => setActiveTab('EXPLORE')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'EXPLORE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>استكشاف الأندية</button>
                    <button onClick={() => setActiveTab('MEMBERS')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'MEMBERS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>إدارة الأعضاء</button>
                </div>
            </div>

            {activeTab === 'EXPLORE' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-y-auto custom-scrollbar">
                    {CLUBS.map(club => (
                        <div key={club.id} className="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col h-80">
                            <div className={`absolute top-0 right-0 w-2 h-full ${club.color}`}></div>
                            <div className={`w-16 h-16 rounded-[1.5rem] ${club.color} text-white flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform`}>
                                {/* Fix: Cast icon to ReactElement<any> to avoid size property error */}
                                {React.cloneElement(club.icon as React.ReactElement<any>, { size: 32 })}
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">{club.name}</h3>
                            <p className="text-xs text-slate-400 font-bold leading-relaxed flex-1">{club.description}</p>
                            <div className="mt-auto flex justify-between items-center">
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{club.memberCount} عضو</span>
                                <button onClick={() => { setSelectedClub(club); setActiveTab('MEMBERS'); }} className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-black transition-all"><Zap size={18}/></button>
                            </div>
                        </div>
                    ))}
                    <div className="bg-white border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center p-8 text-slate-300 hover:border-indigo-200 hover:text-indigo-400 transition-all cursor-pointer">
                        <Plus size={48} className="mb-4"/>
                        <span className="font-black text-lg">تأسيس نادي جديد</span>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-white rounded-[3.5rem] border shadow-sm flex flex-col overflow-hidden animate-slide-up">
                    <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveTab('EXPLORE')} className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-indigo-600"><ArrowLeft/></button>
                            <h3 className="font-black text-xl text-slate-800">أعضاء {selectedClub?.name || 'الأندية'}</h3>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute right-3 top-2.5 text-slate-300" size={16}/>
                            <input className="w-full pr-10 pl-4 py-2 bg-white border rounded-xl text-xs" placeholder="بحث عن عضو..."/>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {students.slice(0, 10).map(s => (
                                <div key={s.id} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-indigo-600 shadow-sm">{s.name.charAt(0)}</div>
                                        <div>
                                            <p className="font-black text-slate-700 text-sm">{s.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{s.className}</p>
                                        </div>
                                    </div>
                                    <button className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50 border-t flex justify-between items-center">
                        <p className="text-xs text-slate-400 font-bold">يمكنك رصد نقاط مهارية جماعية لكافة الأعضاء في هذا النادي بضغطة زر.</p>
                        <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-xl flex items-center gap-2 hover:bg-indigo-700 transition-all"><Star size={16} fill="white"/> رصد نقاط التميز للمجموعة</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentClubs;
