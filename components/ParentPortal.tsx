
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorIncident, Task, MessageLog } from '../types';
import { saveAttendance, getBehaviorIncidents, getTasks, getMessages } from '../services/storageService';
import { 
    User, LogOut, AlertTriangle, Clock, MessageCircle, X, ShieldCheck, 
    Trophy, BookOpen, Bell, ChevronLeft, Star, Calendar, CheckCircle2, Zap, Radar as RadarIcon, TrendingUp
} from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip } from 'recharts';
import SmartParentDigest from './SmartParentDigest';

interface ParentPortalProps {
    parentPhone: string;
    allStudents: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const ParentPortal: React.FC<ParentPortalProps> = ({ parentPhone, allStudents, attendance, performance, onLogout }) => {
    const myChildren = useMemo(() => 
        allStudents.filter(s => s.parentPhone === parentPhone || s.parentPhone?.replace(/\s+/g, '') === parentPhone),
    [allStudents, parentPhone]);

    const [activeChildId, setActiveChildId] = useState<string>(myChildren.length > 0 ? myChildren[0].id : '');
    const activeChild = myChildren.find(c => c.id === activeChildId) || myChildren[0];
    
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACADEMIC' | 'BEHAVIOR' | 'MESSAGES'>('OVERVIEW');

    if (!activeChild) return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-10 text-center">
            <AlertTriangle size={48} className="text-amber-500 mb-4"/>
            <h2 className="text-xl font-bold text-slate-800">لم يتم العثور على أبناء مرتبطين</h2>
            <p className="text-slate-500 mt-2">يرجى التأكد من رقم الهاتف المسجل لدى المدرسة.</p>
            <button onClick={onLogout} className="mt-6 px-6 py-2 bg-slate-800 text-white rounded-lg font-bold">تسجيل الخروج</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-tajawal pb-24" dir="rtl">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center text-white font-black">ب</div>
                    <h1 className="text-base font-bold text-slate-800">بوابة ولي الأمر</h1>
                </div>
                <div className="flex items-center gap-3">
                    <select 
                        value={activeChildId} 
                        onChange={e => setActiveChildId(e.target.value)}
                        className="bg-slate-100 border border-slate-200 text-xs font-bold p-2 rounded-lg outline-none"
                    >
                        {myChildren.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-600 transition-all"><LogOut size={20}/></button>
                </div>
            </header>

            <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
                {/* Child Quick Card */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 border border-slate-200">
                            {activeChild.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{activeChild.name}</h2>
                            <p className="text-xs text-slate-500 font-bold">{activeChild.className} • المستوى {activeChild.level || 1}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-center px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
                            <p className="text-[10px] font-bold text-blue-400 uppercase">النقاط</p>
                            <p className="text-lg font-bold text-blue-700">{activeChild.xp || 0}</p>
                        </div>
                        <div className="text-center px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                            <p className="text-[10px] font-bold text-emerald-400 uppercase">المعدل</p>
                            <p className="text-lg font-bold text-emerald-700">--%</p>
                        </div>
                    </div>
                </div>

                <SmartParentDigest student={activeChild} attendance={attendance.filter(a=>a.studentId===activeChild.id)} performance={performance.filter(p=>p.studentId===activeChild.id)} />

                <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm overflow-x-auto no-scrollbar">
                    <TabBtn active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} label="نظرة عامة" icon={RadarIcon}/>
                    <TabBtn active={activeTab === 'ACADEMIC'} onClick={() => setActiveTab('ACADEMIC')} label="التحصيل" icon={TrendingUp}/>
                    <TabBtn active={activeTab === 'BEHAVIOR'} onClick={() => setActiveTab('BEHAVIOR')} label="السلوك" icon={Star}/>
                    <TabBtn active={activeTab === 'MESSAGES'} onClick={() => setActiveTab('MESSAGES')} label="الرسائل" icon={Bell}/>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[300px] p-6">
                    {activeTab === 'OVERVIEW' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                                <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">أحدث درجات التقييم</h3>
                                {performance.filter(p => p.studentId === activeChild.id).slice(0, 4).map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <span className="text-xs font-bold text-slate-700">{p.title}</span>
                                        <span className="text-xs font-bold text-blue-600">{p.score} / {p.maxScore}</span>
                                    </div>
                                ))}
                             </div>
                             <div className="bg-slate-50 rounded-xl p-4 flex flex-col items-center justify-center">
                                <RadarIcon size={48} className="text-slate-300 mb-2"/>
                                <p className="text-xs text-slate-400 font-bold">رادار المهارات التفصيلي متاح في التقرير الشامل</p>
                             </div>
                        </div>
                    )}
                    {activeTab === 'MESSAGES' && (
                        <div className="space-y-4">
                             <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">صندوق الرسائل</h3>
                             {getMessages().filter(m => m.studentId === activeChild.id).map(m => (
                                 <div key={m.id} className="p-4 border rounded-lg bg-slate-50">
                                     <div className="flex justify-between mb-2">
                                         <span className="text-xs font-bold text-blue-700">{m.sentBy}</span>
                                         <span className="text-[10px] text-slate-400">{formatDualDate(m.date)}</span>
                                     </div>
                                     <p className="text-sm text-slate-600 leading-relaxed">{m.content}</p>
                                 </div>
                             ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

const TabBtn = ({ active, onClick, label, icon: Icon }: any) => (
    <button onClick={onClick} className={`flex-1 py-3 px-4 rounded-lg transition-all text-xs font-bold flex items-center justify-center gap-2 whitespace-nowrap ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
        <Icon size={16}/> {label}
    </button>
);

export default ParentPortal;
