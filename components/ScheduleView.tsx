
import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleItem, TeacherAssignment, SystemUser, Subject, CurriculumUnit, CurriculumLesson, WeeklyPlanItem } from '../types';
import { getSchedules, getTeacherAssignments, getSubjects, getCurriculumUnits, getCurriculumLessons, saveScheduleItem, deleteScheduleItem, getWeeklyPlans, saveWeeklyPlanItem } from '../services/storageService';
import { Calendar, Clock, MapPin, BookOpen, Plus, Trash2, Edit2, Check, X, Printer, Layout, ArrowLeft, Loader2, ChevronRight, ChevronLeft, PenTool } from 'lucide-react';

interface ScheduleViewProps {
    currentUser?: SystemUser | null;
    onNavigateToLesson?: () => void;
    onNavigateToAttendance?: () => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ currentUser, onNavigateToLesson, onNavigateToAttendance }) => {
    const [viewMode, setViewMode] = useState<'SCHEDULE' | 'PLAN'>('SCHEDULE');
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlanItem[]>([]);

    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{day: string, period: number} | null>(null);
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

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    
    // Fix: Add all days to match DayOfWeek type
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

    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    const mySchedules = useMemo(() => {
        if(!currentUser) return [];
        return schedules.filter(s => s.teacherId === currentUser.id || !s.teacherId);
    }, [schedules, currentUser]);

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
        if (existing) {
            setEditClass(existing.classId);
            setEditSubject(existing.subjectName);
        } else {
            setEditClass('');
            setEditSubject('');
        }
    };

    const handleSaveSlot = () => {
        if (!selectedSlot || !currentUser) return;
        
        const existing = mySchedules.find(s => s.day === selectedSlot.day && s.period === selectedSlot.period);
        if (existing) deleteScheduleItem(existing.id);

        if (editClass && editSubject) {
            const newItem: ScheduleItem = {
                id: `${editClass}-${selectedSlot.day}-${selectedSlot.period}-${Date.now()}`,
                classId: editClass,
                subjectName: editSubject,
                day: selectedSlot.day as any,
                period: selectedSlot.period,
                teacherId: currentUser.id
            };
            saveScheduleItem(newItem);
        }
        
        setSchedules(getSchedules());
        setSelectedSlot(null);
    };

    const handleSavePlan = () => {
        if (!editingPlan) return;
        const updatedPlan = { ...editingPlan.item, lessonTopic: tempTopic, homework: tempHomework };
        saveWeeklyPlanItem(updatedPlan);
        setWeeklyPlans(getWeeklyPlans(currentUser!.id));
        setEditingPlan(null);
    };

    const uniqueClasses = useMemo(() => Array.from(new Set(assignments.map(a => a.classId))), [assignments]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative">
            
            <div className="flex justify-between items-center mb-6 print:hidden">
                <div className="flex items-center gap-4">
                    <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                        <button onClick={() => setViewMode('SCHEDULE')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'SCHEDULE' ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:text-gray-800'}`}>
                            <Calendar size={16}/> الجدول
                        </button>
                        <button onClick={() => setViewMode('PLAN')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${viewMode === 'PLAN' ? 'bg-purple-50 text-purple-700' : 'text-gray-500 hover:text-gray-800'}`}>
                            <PenTool size={16}/> الخطة الأسبوعية
                        </button>
                    </div>
                    {viewMode === 'PLAN' && (
                        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border">
                            <button onClick={() => changeWeek(-1)} className="p-1.5 hover:bg-gray-100 rounded"><ChevronRight size={16}/></button>
                            <span className="text-sm font-bold px-2">{currentWeekStart}</span>
                            <button onClick={() => changeWeek(1)} className="p-1.5 hover:bg-gray-100 rounded"><ChevronLeft size={16}/></button>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    {viewMode === 'SCHEDULE' && (
                        <button onClick={() => setIsEditMode(!isEditMode)} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${isEditMode ? 'bg-green-600 text-white' : 'bg-white border text-gray-700'}`}>
                            {isEditMode ? <Check size={18}/> : <Edit2 size={18}/>} {isEditMode ? 'إنهاء التعديل' : 'تعديل الجدول'}
                        </button>
                    )}
                    <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-lg font-bold flex items-center gap-2">
                        <Printer size={18}/> طباعة
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                <th className="p-4 border-l border-gray-700 w-32 font-bold">اليوم</th>
                                {periods.map(p => (
                                    <th key={p} className="p-3 border-l border-gray-700 min-w-[140px]">
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-lg">الحصة {p}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map(day => {
                                const isToday = day === currentDay;
                                return (
                                    <tr key={day} className={`${isToday && viewMode === 'SCHEDULE' ? 'bg-yellow-50' : 'hover:bg-gray-50'} border-b transition-colors`}>
                                        <td className={`p-4 border-l font-bold text-gray-800 ${isToday && viewMode === 'SCHEDULE' ? 'text-teal-700 bg-yellow-100' : 'bg-gray-50'}`}>
                                            {dayNamesAr[day]}
                                        </td>
                                        {periods.map(period => {
                                            const session = mySchedules.find(s => s.day === day && s.period === period);
                                            const isSelected = selectedSlot?.day === day && selectedSlot?.period === period;
                                            const plan = weeklyPlans.find(p => p.day === day && p.period === period && p.weekStartDate === currentWeekStart);

                                            return (
                                                <td 
                                                    key={period} 
                                                    onClick={() => handleSlotClick(day, period)}
                                                    className={`p-2 border-l border-gray-200 h-32 align-top relative transition-all ${isEditMode || (viewMode === 'PLAN' && session) ? 'cursor-pointer hover:bg-gray-100' : ''} ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 inset-0 z-10' : ''}`}
                                                >
                                                    {/* EDIT MODE POPUP */}
                                                    {isSelected && isEditMode ? (
                                                        <div className="absolute inset-0 bg-white p-2 flex flex-col gap-2 z-20 shadow-xl">
                                                            <select className="w-full p-1 border rounded text-xs" value={editClass} onChange={e => setEditClass(e.target.value)} autoFocus>
                                                                <option value="">-- الفصل --</option>
                                                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                                            </select>
                                                            <select className="w-full p-1 border rounded text-xs" value={editSubject} onChange={e => setEditSubject(e.target.value)}>
                                                                <option value="">-- المادة --</option>
                                                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                            </select>
                                                            <div className="flex gap-1 mt-auto">
                                                                <button onClick={handleSaveSlot} className="flex-1 bg-green-600 text-white rounded text-xs py-1">حفظ</button>
                                                                <button onClick={() => setSelectedSlot(null)} className="bg-gray-200 rounded px-2 py-1 text-xs">X</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        session ? (
                                                            <div className="flex flex-col items-center gap-1 h-full w-full">
                                                                <div className="flex items-center gap-2 w-full justify-center bg-gray-100 rounded py-1">
                                                                    <span className="font-bold text-gray-800 text-sm">{session.subjectName}</span>
                                                                    <span className="bg-white text-gray-600 px-2 rounded text-[10px] border">{session.classId}</span>
                                                                </div>
                                                                
                                                                {viewMode === 'PLAN' ? (
                                                                    <div className="flex-1 w-full text-right p-1 overflow-hidden">
                                                                        {plan?.lessonTopic ? (
                                                                            <>
                                                                                <p className="text-[10px] text-purple-700 font-bold truncate">📖 {plan.lessonTopic}</p>
                                                                                {plan.homework && <p className="text-[10px] text-gray-500 truncate">🏠 {plan.homework}</p>}
                                                                            </>
                                                                        ) : <div className="text-[10px] text-gray-300 text-center mt-2">اضغط للإضافة</div>}
                                                                    </div>
                                                                ) : (
                                                                    // Quick Actions (Hover)
                                                                    !isEditMode && (
                                                                        <div className="mt-auto flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            {onNavigateToAttendance && <button onClick={(e) => {e.stopPropagation(); onNavigateToAttendance();}} title="تحضير" className="p-1 bg-white border rounded shadow-sm hover:text-green-600"><Check size={14}/></button>}
                                                                            {onNavigateToLesson && <button onClick={(e) => {e.stopPropagation(); onNavigateToLesson();}} title="تحضير درس" className="p-1 bg-white border rounded shadow-sm hover:text-blue-600"><BookOpen size={14}/></button>}
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        ) : (
                                                            isEditMode && <div className="text-gray-200 flex justify-center items-center h-full"><Plus size={24}/></div>
                                                        )
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
