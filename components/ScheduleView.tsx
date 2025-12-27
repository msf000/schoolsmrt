
import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleItem, TeacherAssignment, SystemUser, Subject, WeeklyPlanItem, StoredLessonPlan } from '../types';
import { getSchedules, getTeacherAssignments, getSubjects, saveScheduleItem, deleteScheduleItem, getWeeklyPlans, saveWeeklyPlanItem, getLessonPlans, getTeacherPeriodTimings } from '../services/storageService';
import { Calendar, PenTool, Plus, Trash2, Edit2, Check, Printer, ChevronRight, ChevronLeft, BookOpen, FileCheck, X, Sparkles, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScheduleViewProps {
    currentUser?: SystemUser | null;
    onNavigateToLesson?: () => void;
    onNavigateToAttendance?: () => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ currentUser, onNavigateToLesson, onNavigateToAttendance }) => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'SCHEDULE' | 'PLAN'>('SCHEDULE');
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlanItem[]>([]);
    const [myLessonPlans, setMyLessonPlans] = useState<StoredLessonPlan[]>([]);
    const [periodTimings, setPeriodTimings] = useState<string[]>([]);

    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{day: string, period: number} | null>(null);
    const [editClass, setEditClass] = useState('');
    const [editSubject, setEditSubject] = useState('');

    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return d.toISOString().split('T')[0];
    });

    const [editingPlan, setEditingPlan] = useState<{item: WeeklyPlanItem, slot: any} | null>(null);
    const [tempTopic, setTempTopic] = useState('');
    const [tempHomework, setTempHomework] = useState('');

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const [mobileDayIndex, setMobileDayIndex] = useState(() => {
        const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
        const idx = days.indexOf(today);
        return idx !== -1 ? idx : 0;
    });

    useEffect(() => {
        if(currentUser) {
            setSchedules(getSchedules());
            setAssignments(getTeacherAssignments(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
            setWeeklyPlans(getWeeklyPlans(currentUser.id));
            setMyLessonPlans(getLessonPlans(currentUser.id));
            setPeriodTimings(getTeacherPeriodTimings(currentUser.id));
        }
    }, [currentUser]);

    const dayNamesAr: Record<string, string> = { 
        'Sunday': 'الأحد', 
        'Monday': 'الاثنين', 
        'Tuesday': 'الثلاثاء', 
        'Wednesday': 'الأربعاء', 
        'Thursday': 'الخميس',
        'Friday': 'الجمعة',
        'Saturday': 'السبت'
    };
    
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];

    const changeWeek = (dir: number) => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + (dir * 7));
        setCurrentWeekStart(d.toISOString().split('T')[0]);
    };

    const currentDay = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    
    const mySchedules = useMemo(() => {
        if(!currentUser) return [];
        return schedules.filter(s => s.teacherId === currentUser.id);
    }, [schedules, currentUser]);

    const hasLessonPlan = (topic: string) => {
        if (!topic) return false;
        return myLessonPlans.some(p => p.topic.trim() === topic.trim());
    };

    const handleSlotClick = (day: string, period: number) => {
        if (viewMode === 'PLAN') {
            const session = mySchedules.find(s => s.day === day && s.period === period);
            if (!session) return;
            const existingPlan = weeklyPlans.find(p => p.day === day && p.period === period && p.weekStartDate === currentWeekStart);
            const newItem: WeeklyPlanItem = existingPlan || {
                id: `${session.classId}-${day}-${period}-${currentWeekStart}`,
                teacherId: currentUser!.id,
                classId: session.classId,
                subjectName: session.subjectName,
                day: day as any,
                period: period,
                weekStartDate: currentWeekStart,
                lessonTopic: '',
                homework: ''
            };
            setEditingPlan({ item: newItem, slot: session });
            setTempTopic(newItem.lessonTopic);
            setTempHomework(newItem.homework);
            return;
        }
        if (!isEditMode) return;
        setSelectedSlot({ day, period });
        const existing = mySchedules.find(s => s.day === day && s.period === period);
        if (existing) { setEditClass(existing.classId); setEditSubject(existing.subjectName); }
        else { setEditClass(''); setEditSubject(''); }
    };

    const handleSaveSlot = () => {
        if (!selectedSlot || !currentUser) return;
        const existing = mySchedules.find(s => s.day === selectedSlot.day && s.period === selectedSlot.period);
        if (existing) deleteScheduleItem(existing.id);
        if (editClass && editSubject) {
            saveScheduleItem({
                id: `${editClass}-${selectedSlot.day}-${selectedSlot.period}-${Date.now()}`,
                classId: editClass, subjectName: editSubject, day: selectedSlot.day as any,
                period: selectedSlot.period, teacherId: currentUser.id
            });
        }
        setSchedules(getSchedules()); setSelectedSlot(null);
    };

    const handleSavePlan = () => {
        if (!editingPlan) return;
        saveWeeklyPlanItem({ ...editingPlan.item, lessonTopic: tempTopic, homework: tempHomework });
        setWeeklyPlans(getWeeklyPlans(currentUser!.id)); setEditingPlan(null);
    };

    const uniqueClasses = useMemo(() => Array.from(new Set(assignments.map(a => a.classId))), [assignments]);
    const navigateMobileDay = (dir: number) => {
        setMobileDayIndex((mobileDayIndex + dir + days.length) % days.length);
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in relative pb-24 lg:pb-6 font-tajawal overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 print:hidden shrink-0">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm w-full md:w-auto">
                        <button onClick={() => setViewMode('SCHEDULE')} className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${viewMode === 'SCHEDULE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
                            <Calendar size={16}/> الجدول
                        </button>
                        <button onClick={() => setViewMode('PLAN')} className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${viewMode === 'PLAN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>
                            <PenTool size={16}/> الخطة
                        </button>
                    </div>
                    {viewMode === 'PLAN' && (
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border">
                            <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronRight size={16}/></button>
                            <span className="text-[10px] font-black px-2">{currentWeekStart}</span>
                            <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16}/></button>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 w-full md:w-auto justify-end">
                    {viewMode === 'SCHEDULE' && (
                        <button onClick={() => setIsEditMode(!isEditMode)} className={`px-5 py-2.5 rounded-xl font-black flex items-center gap-2 text-xs transition-all ${isEditMode ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-200'}`}>
                            {isEditMode ? <Check size={16}/> : <Edit2 size={16}/>} {isEditMode ? 'حفظ' : 'تعديل الجدول'}
                        </button>
                    )}
                </div>
            </div>

            {/* MOBILE VIEW */}
            <div className="md:hidden flex flex-col gap-4 flex-1 overflow-hidden">
                <div className="flex items-center justify-between bg-white p-4 rounded-[2rem] border shadow-sm sticky top-0 z-10">
                    <button onClick={() => navigateMobileDay(-1)} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight size={24}/></button>
                    <div className="text-center">
                        <span className="block text-xl font-black text-slate-800">{dayNamesAr[days[mobileDayIndex]]}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{days[mobileDayIndex]}</span>
                    </div>
                    <button onClick={() => navigateMobileDay(1)} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft size={24}/></button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pb-4 custom-scrollbar">
                    {periods.map((period, idx) => {
                        const day = days[mobileDayIndex];
                        const session = mySchedules.find(s => s.day === day && s.period === period);
                        const plan = weeklyPlans.find(p => p.day === day && p.period === period && p.weekStartDate === currentWeekStart);
                        const isSelected = selectedSlot?.day === day && selectedSlot?.period === period;
                        const time = periodTimings[idx] || '';

                        return (
                            <div 
                                key={period} 
                                onClick={() => handleSlotClick(day, period)}
                                className={`bg-white rounded-[2.5rem] border-2 p-5 shadow-sm transition-all relative ${session ? 'border-indigo-100' : 'border-dashed border-slate-200 opacity-60'} ${isSelected ? 'ring-4 ring-indigo-500/10 border-indigo-500' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black">الحصة {period}</span>
                                    {time && <span className="text-[9px] text-slate-400 font-mono font-black">{time}</span>}
                                </div>
                                {session ? (
                                    <>
                                        <h4 className="text-xl font-black text-slate-800">{session.subjectName}</h4>
                                        <div className="flex items-center gap-1.5 mt-1 text-slate-400 font-bold text-xs"><MapPin size={12}/> {session.classId}</div>
                                        {viewMode === 'PLAN' && plan?.lessonTopic && (
                                            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2 text-purple-600">
                                                <BookOpen size={14}/> <span className="text-xs font-black">{plan.lessonTopic}</span>
                                            </div>
                                        )}
                                    </>
                                ) : <div className="py-4 text-center text-slate-200 font-black italic">{isEditMode ? 'اضغط للإضافة +' : 'لا توجد حصة'}</div>}
                                
                                {isSelected && isEditMode && (
                                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col justify-center p-6 rounded-[2.5rem]" onClick={e => e.stopPropagation()}>
                                        <select className="w-full p-3 border rounded-2xl mb-2 font-bold text-sm" value={editClass} onChange={e => setEditClass(e.target.value)}>
                                            <option value="">-- الفصل --</option>
                                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <select className="w-full p-3 border rounded-2xl mb-4 font-bold text-sm" value={editSubject} onChange={e => setEditSubject(e.target.value)}>
                                            <option value="">-- المادة --</option>
                                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        </select>
                                        <div className="flex gap-2"><button onClick={handleSaveSlot} className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black">حفظ</button><button onClick={() => setSelectedSlot(null)} className="px-4 bg-slate-100 rounded-2xl font-black">X</button></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden md:flex bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden flex-1 flex-col">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="p-6 border-l border-white/5 w-40 font-black text-sm uppercase tracking-widest">اليوم</th>
                                {periods.map((p, idx) => (
                                    <th key={p} className="p-4 border-l border-white/5">
                                        <div className="flex flex-col items-center">
                                            <span className="font-black text-base">الحصة {p}</span>
                                            {periodTimings[idx] && <span className="text-[9px] text-white/40 font-mono mt-1 font-bold">{periodTimings[idx]}</span>}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map(day => (
                                <tr key={day} className={`${day === currentDay ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'} border-b transition-colors`}>
                                    <td className={`p-6 border-l font-black text-slate-800 ${day === currentDay ? 'bg-indigo-50 border-l-indigo-200' : 'bg-slate-50 border-l-slate-100'}`}>
                                        {dayNamesAr[day]}
                                    </td>
                                    {periods.map(period => {
                                        const session = mySchedules.find(s => s.day === day && s.period === period);
                                        const plan = weeklyPlans.find(p => p.day === day && p.period === period && p.weekStartDate === currentWeekStart);
                                        const isSelected = selectedSlot?.day === day && selectedSlot?.period === period;
                                        return (
                                            <td 
                                                key={period} 
                                                onClick={() => handleSlotClick(day, period)}
                                                className={`p-3 border-l border-slate-100 h-32 align-top relative transition-all group ${isEditMode || (viewMode === 'PLAN' && session) ? 'cursor-pointer hover:bg-indigo-50/20' : ''} ${isSelected ? 'bg-indigo-50 ring-2 ring-indigo-500 inset-0 z-10' : ''}`}
                                            >
                                                {session ? (
                                                    <div className="flex flex-col items-center gap-2 h-full w-full">
                                                        <div className="w-full bg-white p-2 rounded-2xl shadow-sm border border-slate-100 group-hover:border-indigo-200 transition-colors">
                                                            <div className="font-black text-slate-800 text-xs truncate">{session.subjectName}</div>
                                                            <div className="text-[10px] font-black text-indigo-500 mt-1 uppercase">{session.classId}</div>
                                                        </div>
                                                        {viewMode === 'PLAN' && plan?.lessonTopic && (
                                                            <div className="mt-auto bg-purple-50 text-purple-700 p-1.5 rounded-xl text-[9px] font-black w-full truncate border border-purple-100">📖 {plan.lessonTopic}</div>
                                                        )}
                                                        {!isEditMode && !plan?.lessonTopic && viewMode === 'PLAN' && (
                                                            <div className="mt-auto text-[8px] font-black text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">إضافة خطة +</div>
                                                        )}
                                                    </div>
                                                ) : isEditMode && <div className="h-full flex items-center justify-center text-slate-100"><Plus size={32}/></div>}
                                                
                                                {isSelected && isEditMode && (
                                                    <div className="absolute inset-0 bg-white p-2 flex flex-col gap-2 z-20 shadow-2xl rounded-xl border border-indigo-100">
                                                        <select className="w-full p-1 border rounded-lg text-[10px] font-black" value={editClass} onChange={e => setEditClass(e.target.value)} autoFocus>
                                                            <option value="">-- الفصل --</option>
                                                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                        <select className="w-full p-1 border rounded-lg text-[10px] font-black" value={editSubject} onChange={e => setEditSubject(e.target.value)}>
                                                            <option value="">-- المادة --</option>
                                                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                        </select>
                                                        <button onClick={handleSaveSlot} className="mt-auto bg-indigo-600 text-white rounded-lg text-[10px] font-black py-1.5">حفظ</button>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Plan Modal */}
            {editingPlan && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[150] p-4 font-tajawal">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 animate-zoom-in relative">
                        <button onClick={() => setEditingPlan(null)} className="absolute top-8 left-8 text-slate-400 hover:text-red-500 transition-colors"><X size={24}/></button>
                        <div className="mb-8 border-b pb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><PenTool size={24}/></div>
                                <h3 className="text-xl font-black text-slate-800">تخطيط الحصة</h3>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{dayNamesAr[editingPlan.item.day]} • الحصة {editingPlan.item.period} • {editingPlan.item.classId}</p>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">موضوع الدرس</label>
                                <input className="w-full p-4 border rounded-2xl font-black text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 bg-slate-50 transition-all" value={tempTopic} onChange={e => setTempTopic(e.target.value)} placeholder="مثلاً: الخلية النباتية..." autoFocus />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">الواجب المنزلي</label>
                                <textarea className="w-full p-4 border rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 bg-slate-50 h-32 resize-none transition-all" value={tempHomework} onChange={e => setTempHomework(e.target.value)} placeholder="رقم الصفحة أو السؤال..." />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleSavePlan} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">حفظ الخطة</button>
                                <button onClick={() => navigate('/planning', { state: { subject: editingPlan.slot.subjectName, topic: tempTopic, grade: editingPlan.item.gradeLevel } })} className="p-4 bg-purple-50 text-purple-600 rounded-2xl hover:bg-purple-100 transition-all shadow-inner border border-purple-100"><Sparkles size={20}/></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleView;
