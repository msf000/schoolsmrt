
import React, { useState, useEffect } from 'react';
import { StoredLessonPlan, SystemUser, Subject } from '../types';
import { fetchSharedResources, getSubjects, toggleResourceShare, getLessonPlans } from '../services/storageService';
import { 
    Library, Search, Download, Share2, Filter, 
    FileText, Sparkles, Loader2, User, Globe, 
    BookOpen, Zap, Trash2, CheckCircle, ArrowRight
} from 'lucide-react';
import { formatDualDate } from '../services/dateService';

const SharedLibrary: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [sharedResources, setSharedResources] = useState<StoredLessonPlan[]>([]);
    const [myPlans, setMyPlans] = useState<StoredLessonPlan[]>([]);
    const [activeView, setActiveView] = useState<'GLOBAL' | 'MY_PLANS'>('GLOBAL');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        loadResources();
        setSubjects(getSubjects(currentUser.id));
    }, [activeView]);

    const loadResources = async () => {
        setLoading(true);
        try {
            if (activeView === 'GLOBAL') {
                const res = await fetchSharedResources(currentUser.schoolId);
                setSharedResources(res);
            } else {
                const res = getLessonPlans(currentUser.id);
                setMyPlans(res);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleToggleShare = async (id: string, currentlyShared: boolean) => {
        await toggleResourceShare(id, !currentlyShared);
        loadResources();
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8 shrink-0">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <Library className="text-indigo-600" size={32}/> مكتبة الموارد التشاركية
                    </h2>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">ساحة تبادل المعرفة بين المعلمين</p>
                </div>
                
                <div className="flex bg-white p-1.5 rounded-2xl border shadow-xl">
                    <button onClick={() => setActiveView('GLOBAL')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeView === 'GLOBAL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
                        <Globe size={18}/> المكتبة العامة
                    </button>
                    <button onClick={() => setActiveView('MY_PLANS')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeView === 'MY_PLANS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
                        <BookOpen size={18}/> تحضيراتي الخاصة
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-[2.5rem] border shadow-sm mb-6 flex flex-wrap gap-4 items-center shrink-0">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    <input 
                        className="w-full pr-12 pl-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="ابحث عن درس، موضوع، أو مادة..."
                        value={searchTerm}
                        onChange={e=>setSearchTerm(e.target.value)}
                    />
                </div>
                <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} className="p-3 border rounded-2xl bg-white font-black text-xs outline-none shadow-sm min-w-[150px]">
                    <option value="">كل المواد</option>
                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-20">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30">
                        <Loader2 className="animate-spin text-indigo-600 mb-4" size={48}/>
                        <p className="font-black text-xl">جاري تصفح الرفوف الرقمية...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {(activeView === 'GLOBAL' ? sharedResources : myPlans).filter(p => !selectedSubject || p.subject === selectedSubject).map(plan => (
                            <div key={plan.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col">
                                <div className={`absolute top-0 right-0 w-1.5 h-full ${plan.isShared ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className={`p-3 rounded-2xl ${plan.isShared ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                        <FileText size={24}/>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button onClick={()=>handleToggleShare(plan.id, plan.isShared || false)} className={`p-2 rounded-xl border ${plan.isShared ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'} hover:scale-110 transition-transform`} title={plan.isShared ? 'إلغاء المشاركة' : 'مشاركة في المكتبة'}>
                                            <Share2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-black text-lg text-slate-800 mb-2 truncate" title={plan.topic}>{plan.topic}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{plan.subject} • {formatDualDate(plan.createdAt)}</p>
                                
                                <div className="mt-auto space-y-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <User size={14}/>
                                        <span className="truncate">{activeView === 'GLOBAL' ? 'المعلم الزميل' : 'أنا'}</span>
                                    </div>
                                    <button className="w-full py-3 bg-slate-50 text-slate-700 hover:bg-indigo-600 hover:text-white rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 group-hover:shadow-lg">
                                        <Download size={16}/> تحميل المورد
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(activeView === 'GLOBAL' ? sharedResources : myPlans).length === 0 && (
                            <div className="col-span-full py-40 text-center opacity-10">
                                <Library size={120} className="mx-auto mb-6"/>
                                <p className="text-3xl font-black">لا توجد مصادر متاحة حالياً</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 flex items-center gap-6 bg-slate-900 text-white px-10 py-5 rounded-[2.5rem] shadow-2xl border border-white/10 animate-slide-up">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> <span className="text-[10px] font-black uppercase">مصادر موثقة</span></div>
                <div className="w-px h-6 bg-white/10"></div>
                <div className="flex items-center gap-2"><Sparkles className="text-indigo-400" size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">المكتبة تدعم أكثر من 12 تخصصاً</span></div>
            </div>
        </div>
    );
};

export default SharedLibrary;
