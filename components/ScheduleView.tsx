import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleItem, TeacherAssignment, SystemUser, Subject, CurriculumUnit, CurriculumLesson, WeeklyPlanItem } from '../types';
import { getSchedules, getTeacherAssignments, getSubjects, saveScheduleItem, deleteScheduleItem, getWeeklyPlans, saveWeeklyPlanItem, deleteAssignment } from '../services/storageService';
import { Calendar, Clock, MapPin, BookOpen, Plus, Trash2, Edit2, Check, X, Printer, Layout, ArrowLeft, Loader2, ChevronRight, ChevronLeft, PenTool, Eraser, Zap } from 'lucide-react';

interface ScheduleViewProps {
    currentUser?: SystemUser | null;
    onNavigateToLesson?: () => void;
    onNavigateToAttendance?: () => void;
}

const DEFAULT_PERIOD_TIMES = [
    "07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", 
    "09:15 - 10:00", "10:30 - 11:15", "11:15 - 12:00", 
    "12:00 - 12:45", "12:45 - 01:30"
];

const COLORS = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-orange-100 text-orange-800 border-orange-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-teal-100 text-teal-800 border-teal-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-rose-100 text-rose-800 border-rose-200',
];

const ScheduleView: React.FC<ScheduleViewProps> = ({ currentUser, onNavigateToLesson, onNavigateToAttendance }) => {
    const [viewMode, setViewMode] = useState<'SCHEDULE' | 'PLAN'>('SCHEDULE');
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlanItem[]>([]);

    // Edit Modal State
    const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
    const [activeSlot, setActiveSlot] = useState<{day: string, period: number, currentId?: string} | null>(null);
    const [editClass, setEditClass] = useState('');
    const [editSubject, setEditSubject] = useState('');

    // Weekly Plan Date
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        return d.toISOString().split('T')[0];
    });

    // Plan Edit
    const [editingPlan, setEditingPlan] = useState<{item: WeeklyPlanItem, slot: any} | null>(null);
    const [tempTopic, setTempTopic] = useState('');
    const [tempHomework, setTempHomework] = useState('');

    useEffect(() => {
        if(currentUser) {
            setSchedules(getSchedules());
            setAssignments(getTeacherAssignments());
            setSubjects(getSubjects(currentUser.id));
            setWeeklyPlans(getWeeklyPlans(currentUser.id));
        }
    }, [currentUser]);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesAr: Record<string, string> = { 
        'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 
        'Wednesday': 'الأربعاء', 'Thursday': 'الخميس', 'Friday': 'الجمعة', 'Saturday': 'السبت'
    };
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];

    const changeWeek = (dir: number) => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + (dir * 7));
        setCurrentWeekStart(d.toISOString().split('T')[0]);
    };

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    const mySchedules = useMemo(() => {
        if(!currentUser) return [];
        return schedules.filter(s => s.teacherId === currentUser.id || !s.teacherId);
    }, [schedules, currentUser]);

    // --- Slot Handling ---
    const handleSlotClick = (day: string, period: number) => {
        // Mode: Planning
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

        // Mode: Schedule Editing
        const existing = mySchedules.find(s => s.day === day && s.period === period);
        setActiveSlot({ 
            day, 
            period, 
            currentId: existing?.id 
        });
        setEditClass(existing?.classId || '');
        setEditSubject(existing?.subjectName || '');
        setIsSlotModalOpen(true);
    };

    const handleSaveSlot = () => {
        if (!activeSlot || !currentUser) return;
        
        // Delete old if exists
        if (activeSlot.currentId) {
            deleteScheduleItem(activeSlot.currentId);
        }

        // Add new if valid
        if (editClass && editSubject) {
            const newItem: ScheduleItem = {
                id: `${editClass}-${activeSlot.day}-${activeSlot.period}-${Date.now()}`,
                classId: editClass,
                subjectName: editSubject,
                day: activeSlot.day as any,
                period: activeSlot.period,
                teacherId: currentUser.id
            };
            saveScheduleItem(newItem);
        }
        
        setSchedules(getSchedules());
        setIsSlotModalOpen(false);
        setActiveSlot(null);
    };

    const handleDeleteSlot = () => {
        if (activeSlot?.currentId) {
            deleteScheduleItem(activeSlot.currentId);
            setSchedules(getSchedules());
        }
        setIsSlotModalOpen(false);
        setActiveSlot(null);
    };

    // Quick add from shortcuts
    const handleQuickAdd = (cls: string, subj: string) => {
        setEditClass(cls);
        setEditSubject(subj);
    };

    const handleSavePlan = () => {
        if (!editingPlan) return;
        const updatedPlan = { ...editingPlan.item, lessonTopic: tempTopic, homework: tempHomework };
        saveWeeklyPlanItem(updatedPlan);
        setWeeklyPlans(getWeeklyPlans(currentUser!.id));
        setEditingPlan(null);
    };

    // Unique items for dropdowns
    const uniqueClasses = useMemo(() => {
        const classes = new Set(assignments.map(a => a.classId));
        // Add existing schedule classes just in case
        mySchedules.forEach(s => classes.add(s.classId));
        return Array.from(classes).sort();
    }, [assignments, mySchedules]);

    // Unique subjects for dropdowns
    const uniqueSubjects = useMemo(() => {
        const subs = new Set(subjects.map(s => s.name));
        mySchedules.forEach(s => subs.add(s.subjectName));
        return Array.from(subs).sort();
    }, [subjects, mySchedules]);

    // Helper for coloring
    const getSubjectColor = (subject: string) => {
        let hash = 0;
        for (let i = 0; i < subject.length; i++) hash = subject.charCodeAt(i) + ((hash << 5) - hash);
        return COLORS[Math.abs(hash) % COLORS.length];
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative">
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                        <button onClick={() => setViewMode('SCHEDULE')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'SCHEDULE' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:text-gray-800'}`}>
                            <Calendar size={16}/> الجدول الدراسي
                        </button>
                        <button onClick={() => setViewMode('PLAN')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'PLAN' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:text-gray-800'}`}>
                            <PenTool size={16}/> الخطة الأسبوعية
                        </button>
                    </div>
                    {viewMode === 'PLAN' && (
                        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border">
                            <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-gray-100 rounded"><ChevronRight size={16}/></button>
                            <span className="text-sm font-bold px-2 dir-ltr">{currentWeekStart}</span>
                            <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-gray-100 rounded"><ChevronLeft size={16}/></button>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-lg font-bold flex items-center gap-2 shadow hover:bg-black transition-colors">
                        <Printer size={18}/> طباعة
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-center border-collapse">
                        <thead className="sticky top-0 z-10 shadow-sm">
                            <tr className="bg-gray-800 text-white">
                                <th className="p-4 border-l border-gray-700 w-24 font-bold bg-gray-800 sticky right-0 z-20">اليوم</th>
                                {periods.map((p, idx) => (
                                    <th key={p} className="p-3 border-l border-gray-700 min-w-[140px]">
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-lg">الحصة {p}</span>
                                            <span className="text-[10px] text-gray-400 font-mono mt-1">{DEFAULT_PERIOD_TIMES[idx] || '--:--'}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map(day => {
                                const isToday = day === currentDay;
                                return (
                                    <tr key={day} className={`${isToday && viewMode === 'SCHEDULE' ? 'bg-yellow-50/50' : 'hover:bg-gray-50'} border-b transition-colors`}>
                                        <td className={`p-4 border-l font-bold text-gray-800 sticky right-0 z-10 ${isToday && viewMode === 'SCHEDULE' ? 'text-teal-700 bg-yellow-50' : 'bg-white'}`}>
                                            {dayNamesAr[day]}
                                        </td>
                                        {periods.map(period => {
                                            const session = mySchedules.find(s => s.day === day && s.period === period);
                                            const plan = weeklyPlans.find(p => p.day === day && p.period === period && p.weekStartDate === currentWeekStart);

                                            return (
                                                <td 
                                                    key={period} 
                                                    onClick={() => handleSlotClick(day, period)}
                                                    className={`p-2 border-l border-gray-200 h-28 align-top relative transition-all cursor-pointer hover:bg-gray-100 group`}
                                                >
                                                    {session ? (
                                                        <div className={`flex flex-col items-center justify-between h-full w-full rounded-lg p-2 border ${getSubjectColor(session.subjectName)} transition-all shadow-sm group-hover:shadow-md`}>
                                                            <div className="w-full text-center">
                                                                <div className="font-black text-sm mb-1 line-clamp-1">{session.subjectName}</div>
                                                                <div className="text-xs bg-white/50 px-2 py-0.5 rounded-full inline-block font-bold border border-white/20">{session.classId}</div>
                                                            </div>
                                                            
                                                            {viewMode === 'PLAN' ? (
                                                                <div className="flex-1 w-full text-right pt-2 border-t border-black/5 mt-1 overflow-hidden">
                                                                    {plan?.lessonTopic ? (
                                                                        <>
                                                                            <p className="text-[10px] font-bold truncate flex items-center gap-1"><BookOpen size={10}/> {plan.lessonTopic}</p>
                                                                            {plan.homework && <p className="text-[10px] opacity-75 truncate flex items-center gap-1"><PenTool size={10}/> {plan.homework}</p>}
                                                                        </>
                                                                    ) : <div className="text-[9px] opacity-50 text-center mt-1">اضغط للتخطيط</div>}
                                                                </div>
                                                            ) : (
                                                                // Quick Actions (Hover)
                                                                <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {onNavigateToAttendance && <button onClick={(e) => {e.stopPropagation(); onNavigateToAttendance();}} title="تحضير" className="p-1 bg-white/80 rounded shadow-sm hover:text-green-600"><Check size={12}/></button>}
                                                                    {onNavigateToLesson && <button onClick={(e) => {e.stopPropagation(); onNavigateToLesson();}} title="تحضير درس" className="p-1 bg-white/80 rounded shadow-sm hover:text-blue-600"><BookOpen size={12}/></button>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Plus className="text-gray-300 bg-gray-50 rounded-full p-1 border" size={24}/>
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SLOT EDIT MODAL */}
            {isSlotModalOpen && activeSlot && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800 text-lg">تعديل الحصة</h3>
                                <p className="text-xs text-gray-500">{dayNamesAr[activeSlot.day]} - الحصة {activeSlot.period}</p>
                            </div>
                            <button onClick={() => setIsSlotModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Quick Add Buttons */}
                            {assignments.length > 0 && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 flex items-center gap-1"><Zap size={12}/> إضافة سريعة (من توزيعاتي)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {assignments.map(assign => (
                                            <button 
                                                key={`${assign.classId}-${assign.subjectName}`}
                                                onClick={() => handleQuickAdd(assign.classId, assign.subjectName)}
                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-300 transition-all shadow-sm"
                                            >
                                                {assign.subjectName} - {assign.classId}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">الفصل</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500 appearance-none font-bold text-gray-700"
                                            value={editClass}
                                            onChange={e => setEditClass(e.target.value)}
                                        >
                                            <option value="">-- اختر --</option>
                                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <div className="absolute left-3 top-3 pointer-events-none text-gray-400"><Layout size={14}/></div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">المادة</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full p-2.5 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-teal-500 appearance-none font-bold text-gray-700"
                                            value={editSubject}
                                            onChange={e => setEditSubject(e.target.value)}
                                        >
                                            <option value="">-- اختر --</option>
                                            {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <div className="absolute left-3 top-3 pointer-events-none text-gray-400"><BookOpen size={14}/></div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                {activeSlot.currentId && (
                                    <button 
                                        onClick={handleDeleteSlot} 
                                        className="flex-1 py-2.5 border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Trash2 size={18}/> حذف الحصة
                                    </button>
                                )}
                                <button 
                                    onClick={handleSaveSlot} 
                                    disabled={!editClass || !editSubject}
                                    className="flex-2 w-full py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <Check size={18}/> حفظ التغييرات
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Plan Editor Modal */}
            {editingPlan && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-bounce-in">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <div>
                                <h3 className="font-bold text-gray-800">تخطيط الحصة</h3>
                                <p className="text-xs text-gray-500">{dayNamesAr[editingPlan.item.day]} - الحصة {editingPlan.item.period} - {editingPlan.item.classId}</p>
                            </div>
                            <button onClick={() => setEditingPlan(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">موضوع الدرس</label>
                                <input 
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    value={tempTopic}
                                    onChange={e => setTempTopic(e.target.value)}
                                    placeholder="عنوان الدرس..."
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">الواجب المنزلي</label>
                                <textarea 
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none h-24 resize-none"
                                    value={tempHomework}
                                    onChange={e => setTempHomework(e.target.value)}
                                    placeholder="تفاصيل الواجب..."
                                />
                            </div>
                            <button onClick={handleSavePlan} className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700">حفظ الخطة</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleView;