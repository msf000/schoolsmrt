
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
        if (currentUser) setSubjects(getSubjects(currentUser.id));
    }, [activeView, currentUser]);

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
        <div className="space-y-6 page-enter font-tajawal">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">مكتبة الموارد</h1>
                    <p className="text-slate-500 text-sm">تبادل الموارد والتحاضير مع زملائك المعلمين.</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => setActiveView('GLOBAL')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'GLOBAL' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>المكتبة العامة</button>
                    <button onClick={() => setActiveView('MY_PLANS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeView === 'MY_PLANS' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>ملفاتي الخاصة</button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={16}/>
                    <input className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-brand-500" placeholder="ابحث عن درس أو موضوع..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                </div>
                <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} className="w-full md:w-48 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none">
                    <option value="">كافة المواد</option>
                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="py-20 text-center text-slate-400">
                    <Loader2 className="animate-spin mx-auto mb-4" size={32}/>
                    <p className="font-bold">جاري تصفح الرفوف الرقمية...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {(activeView === 'GLOBAL' ? sharedResources : myPlans)
                        .filter(p => (!selectedSubject || p.subject === selectedSubject) && p.topic.includes(searchTerm))
                        .map(plan => (
                        <div key={plan.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-brand-400 transition-all group flex flex-col h-56 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2.5 rounded-xl ${plan.isShared ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'}`}>
                                    <FileText size={20}/>
                                </div>
                                {activeView === 'MY_PLANS' && (
                                    <button onClick={()=>handleToggleShare(plan.id, plan.isShared || false)} className={`p-2 rounded-lg border transition-all ${plan.isShared ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`} title={plan.isShared ? 'إلغاء المشاركة' : 'مشاركة'}>
                                        <Share2 size={14}/>
                                    </button>
                                )}
                            </div>
                            <h3 className="font-bold text-slate-800 text-sm mb-1 truncate" title={plan.topic}>{plan.topic}</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-auto">{plan.subject} • {formatDualDate(plan.createdAt)}</p>
                            
                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                    <User size={12}/>
                                    <span>{activeView === 'GLOBAL' ? 'معلم زميل' : 'أنا'}</span>
                                </div>
                                <button className="p-2 bg-slate-50 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-all">
                                    <Download size={16}/>
                                </button>
                            </div>
                        </div>
                    ))}
                    {(activeView === 'GLOBAL' ? sharedResources : myPlans).length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-300 font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                            لا توجد موارد تعليمية متاحة حالياً في هذا القسم.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SharedLibrary;
