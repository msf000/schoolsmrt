
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Command, User, Users, CheckCircle, PenTool, FileText, Zap, Sparkles, X, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Student, SystemUser } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
}

const OmniSearch: React.FC<Props> = ({ isOpen, onClose, students }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);

    const shortcuts = [
        { icon: <CheckCircle size={16}/>, label: 'تسجيل حضور سريع', path: '/attendance', cmd: 'att' },
        { icon: <PenTool size={16}/>, label: 'تحضير درس جديد', path: '/planning', cmd: 'plan' },
        { icon: <Zap size={16}/>, label: 'رصد سلوك مباشر', path: '/behavior', cmd: 'beh' },
        { icon: <Users size={16}/>, label: 'إدارة الفصول', path: '/classroom', cmd: 'class' }
    ];

    const results = useMemo(() => {
        if (!query) return [];
        const studentMatches = students.filter(s => s.name.includes(query)).slice(0, 5).map(s => ({
            type: 'STUDENT',
            label: s.name,
            sub: s.className,
            icon: <User size={16}/>,
            onClick: () => { navigate('/followup', { state: { studentId: s.id } }); onClose(); }
        }));

        const cmdMatches = shortcuts.filter(s => s.label.includes(query) || s.cmd.includes(query)).map(s => ({
            type: 'CMD',
            label: s.label,
            sub: `اختصار: ${s.cmd}`,
            icon: s.icon,
            onClick: () => { navigate(s.path); onClose(); }
        }));

        return [...cmdMatches, ...studentMatches];
    }, [query, students]);

    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onClose(); }
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleDown);
        return () => window.removeEventListener('keydown', handleDown);
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-slate-950/60 backdrop-blur-md flex items-start justify-center pt-20 p-4 font-tajawal animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/20 animate-zoom-in">
                <div className="p-6 border-b flex items-center gap-4 bg-slate-50">
                    <Search className="text-indigo-500" size={24}/>
                    <input 
                        className="flex-1 bg-transparent border-none outline-none font-black text-xl text-gray-800 placeholder:text-gray-300"
                        placeholder="ابحث عن طالب، اختصار، أو أمر ذكي..."
                        autoFocus
                        value={query}
                        onChange={e => {setQuery(e.target.value); setActiveIndex(0);}}
                    />
                    <div className="flex gap-1">
                        <kbd className="px-2 py-1 bg-white border rounded text-[10px] font-black text-gray-400">ESC</kbd>
                    </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                    {query ? (
                        results.length > 0 ? (
                            <div className="p-2">
                                {results.map((res, i) => (
                                    <button 
                                        key={i}
                                        onClick={res.onClick}
                                        onMouseEnter={() => setActiveIndex(i)}
                                        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${activeIndex === i ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-gray-50 text-gray-600'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-xl ${activeIndex === i ? 'bg-white/20' : 'bg-indigo-50 text-indigo-600'}`}>
                                                {res.icon}
                                            </div>
                                            <div className="text-right">
                                                <p className="font-black text-sm">{res.label}</p>
                                                <p className={`text-[10px] font-bold ${activeIndex === i ? 'text-indigo-200' : 'text-gray-400'}`}>{res.sub}</p>
                                            </div>
                                        </div>
                                        {activeIndex === i && <ChevronRight size={18}/>}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-20 text-center text-gray-400 flex flex-col items-center gap-4">
                                <Sparkles size={48} className="opacity-20"/>
                                <p className="font-bold">لم يتم العثور على نتائج، جرب "plan" أو اسم طالب.</p>
                            </div>
                        )
                    ) : (
                        <div className="p-8">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">الاختصارات الشائعة</p>
                            <div className="grid grid-cols-2 gap-4">
                                {shortcuts.map(s => (
                                    <button key={s.cmd} onClick={() => { navigate(s.path); onClose(); }} className="flex items-center gap-4 p-4 border rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all text-right group">
                                        <div className="p-2 bg-slate-100 rounded-xl group-hover:bg-white text-gray-400 group-hover:text-indigo-600">{s.icon}</div>
                                        <div>
                                            <p className="font-black text-xs text-gray-700">{s.label}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">أمر: {s.cmd}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t flex justify-between items-center">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> محرك AI مفعل</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-40">
                         <Command size={12}/> <span className="text-[10px] font-black tracking-widest">SMART SEARCH</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OmniSearch;
