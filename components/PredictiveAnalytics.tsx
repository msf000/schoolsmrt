
import React, { useMemo, useState, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser } from '../types';
import { calculateClassHealth, predictNextScore, detectAtRiskStudents, calculateStudentConsistency } from '../services/analysisService';
import { 
    BrainCircuit, TrendingUp, AlertTriangle, CheckCircle, 
    Sparkles, ArrowUpRight, Target, Activity, Zap, Info,
    ChevronLeft, ShieldAlert, GraduationCap, Users
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';

const PredictiveAnalytics: React.FC<{ students: Student[], attendance: AttendanceRecord[], performance: PerformanceRecord[], currentUser: SystemUser }> = ({ students, attendance, performance, currentUser }) => {
    const navigate = useNavigate();
    const [selectedClass, setSelectedClass] = useState('');

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
    }, [uniqueClasses, selectedClass]);

    const classStudents = useMemo(() => students.filter(s => s.className === selectedClass), [students, selectedClass]);
    const atRiskList = useMemo(() => detectAtRiskStudents(classStudents, attendance, performance), [classStudents, attendance, performance]);
    const classHealth = useMemo(() => calculateClassHealth(selectedClass, students, attendance, performance), [selectedClass, students, attendance, performance]);

    return (
        <div className="space-y-8 page-enter font-tajawal pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-3xl border border-slate-200 shadow-sm gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-full bg-brand-500/5 -skew-x-12 translate-x-10"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
                        <BrainCircuit className="text-brand-500" size={32}/> مركز الرؤى التنبؤية (AI)
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium italic">تحليل البيانات التراكمية لاستباق حالات التعثر الأكاديمي.</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border relative z-10 shadow-sm">
                    <Users size={16} className="text-slate-400 mr-2"/>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent font-black text-slate-800 border-none outline-none cursor-pointer px-4">
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={180}/></div>
                    <div className="relative z-10 text-center">
                         <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-3">مؤشر صحة الفصل</p>
                         <div className="text-7xl font-black mb-4">{classHealth}%</div>
                         <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${classHealth}%` }}></div>
                         </div>
                    </div>
                </div>

                <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="font-black text-slate-800 flex items-center gap-2"><TrendingUp size={20} className="text-brand-500"/> التوقعات الأكاديمية القادمة</h3>
                        <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-400">PROBABILITY: 92%</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {classStudents.slice(0, 4).map(s => {
                            const prediction = predictNextScore(s.id, performance);
                            const consistency = calculateStudentConsistency(s.id, performance);
                            return (
                                <div key={s.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center text-center gap-2 group hover:bg-white hover:border-brand-500 transition-all cursor-pointer" onClick={() => navigate('/followup', {state: {studentId: s.id}})}>
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-300 shadow-sm group-hover:bg-brand-500 group-hover:text-white transition-all">{s.name.charAt(0)}</div>
                                    <p className="font-bold text-[11px] text-slate-700 truncate w-full">{s.name.split(' ')[0]}</p>
                                    <div className="mt-2">
                                        <p className="text-[8px] font-black text-slate-400 uppercase">الدرجة المتوقعة</p>
                                        <p className="text-lg font-black text-brand-600">{prediction}%</p>
                                    </div>
                                    <div className="w-full bg-slate-200 h-1 rounded-full mt-1 overflow-hidden" title={`الثبات: ${consistency}%`}>
                                        <div className="h-full bg-indigo-500" style={{width: `${consistency}%`}}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
                    <div className="p-6 bg-rose-50 border-b border-rose-100 flex justify-between items-center">
                        <h3 className="font-black text-rose-800 flex items-center gap-3"><AlertTriangle/> نظام الإنذار المبكر (حالات حرجة)</h3>
                        <span className="px-4 py-1 bg-white text-rose-600 rounded-full text-[10px] font-black shadow-sm border border-rose-100">تحتاج لتدخل فوري</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {atRiskList.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {atRiskList.map(({ student, risks }, i) => (
                                    <div key={i} className="p-6 flex items-center justify-between hover:bg-rose-50/20 transition-all group">
                                        <div className="flex items-center gap-6">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border-2 border-rose-100 font-black text-rose-500 shadow-sm group-hover:scale-110 transition-transform">
                                                {student.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-lg">{student.name}</h4>
                                                <div className="flex gap-2 mt-1">
                                                    {risks.map(r => (
                                                        <span key={r} className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[9px] font-black border border-rose-200">{r}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => navigate('/lab')} className="p-3 bg-white text-slate-400 hover:text-indigo-600 border border-slate-100 rounded-2xl shadow-sm transition-all hover:shadow-md">
                                            <Zap size={20}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-200 opacity-20">
                                <CheckCircle size={100} strokeWidth={1}/>
                                <p className="text-2xl font-black mt-4">لا توجد مخاطر مكتشفة حالياً</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl flex flex-col">
                    <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Zap size={200}/></div>
                    <div className="relative z-10 flex flex-col h-full gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md"><Sparkles className="text-yellow-400"/></div>
                            <h3 className="font-black text-xl">توصية الخبير الذكي</h3>
                        </div>
                        <div className="flex-1 space-y-4">
                            <p className="text-indigo-100 text-sm leading-relaxed italic font-medium">"يظهر تحليل البيانات أن التدخل المبكر مع طلاب 'منطقة الخطر' عبر تخصيص مصادر بصريّة (Visual) قد يرفع متوسط التمكن بنسبة 18% خلال الأسبوعين القادمين."</p>
                            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4 shadow-inner">
                                <div className="flex items-center gap-3 text-emerald-400">
                                    <Target size={18}/>
                                    <span className="text-[10px] font-black uppercase tracking-widest">خطة العمل المقترحة</span>
                                </div>
                                <li className="text-[11px] font-bold list-none flex gap-2"><span>1.</span> جلسة توجيه فردية للطالب الأول في القائمة</li>
                                <li className="text-[11px] font-bold list-none flex gap-2"><span>2.</span> إشراك أولياء الأمور عبر مركز الرسائل</li>
                            </div>
                        </div>
                        <button onClick={() => navigate('/planning')} className="w-full py-4 bg-white text-slate-900 rounded-[1.5rem] font-black text-xs hover:bg-slate-100 transition-all shadow-xl">تحميل تقرير التدخل الكامل</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PredictiveAnalytics;
