
import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleItem, TeacherAssignment, SystemUser, Subject, WeeklyPlanItem, StoredLessonPlan, Student } from '../types';
import { getSchedules, getTeacherAssignments, getSubjects, saveScheduleItem, deleteScheduleItem, getWeeklyPlans, saveWeeklyPlanItem, getLessonPlans, getTeacherPeriodTimings, getStudents } from '../services/storageService';
import { Calendar, PenTool, Plus, Trash2, Edit2, Check, Printer, ChevronRight, ChevronLeft, BookOpen, FileCheck, X, Sparkles, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScheduleViewProps {
    currentUser?: SystemUser | null;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'SCHEDULE' | 'PLAN'>('SCHEDULE');
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [weeklyPlans, setWeeklyPlans] = useState<WeeklyPlanItem[]>([]);
    const [periodTimings, setPeriodTimings] = useState<string[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

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

    const [editingPlan, setEditingPlan] = useState<{item: WeeklyPlanItem, slot: ScheduleItem} | null>(null);
    const [tempTopic, setTempTopic] = useState('');
    const [tempHomework, setTempHomework] = useState('');

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const dayNamesAr: Record<string, string> = { 
        'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 
        'Wednesday': 'الأربعاء', 'Thursday': 'الخميس'
    };
    
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];

    useEffect(() => {
        if(currentUser) {
            setSchedules(getSchedules());
            setAssignments(getTeacherAssignments(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
            setWeeklyPlans(getWeeklyPlans(currentUser.id));
            setPeriodTimings(getTeacherPeriodTimings(currentUser.id));
            setStudents(getStudents());
        }
    }, [currentUser]);

    const changeWeek = (dir: number) => {
        const d = new Date(currentWeekStart);
        d.setDate(d.getDate() + (dir * 7));
        setCurrentWeekStart(d.toISOString().split('T')[0]);
    };

    const handleSlotClick = (day: string, period: number) => {
        const session = schedules.find(s => s.day === day && s.period === period && s.teacherId === currentUser?.id);
        if (viewMode === 'PLAN') {
            if (!session) return;
            const existingPlan = weeklyPlans.find(p => p.day === day && p.period === period && p.weekStartDate === currentWeekStart);
            const classGrade = students.find(s => s.className === session.classId)?.gradeLevel || '';

            const newItem: WeeklyPlanItem = existingPlan || {
                id: `${session.classId}-${day}-${period}-${currentWeekStart}`,
                teacherId: currentUser!.id,
                classId: session.classId,
                subjectName: session.subjectName,
                day: day as any,
                period: period,
                weekStartDate: currentWeekStart,
                lessonTopic: '',
                homework: '',
                gradeLevel: classGrade
            };
            setEditingPlan({ item: newItem, slot: session });
            setTempTopic(newItem.lessonTopic);
            setTempHomework(newItem.homework);
            return;
        }
        if (!isEditMode) return;
        setSelectedSlot({ day, period });
        if (session) { setEditClass(session.classId); setEditSubject(session.subjectName); }
        else { setEditClass(''); setEditSubject(''); }
    };

    const handleSaveSlot = () => {
        if (!selectedSlot || !currentUser) return;
        const existing = schedules.find(s => s.day === selectedSlot.day && s.period === selectedSlot.period && s.teacherId === currentUser.id);
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

    return (
        <div className="p-4 md:p-10 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
                        <button onClick={() => setViewMode('SCHEDULE')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${viewMode === 'SCHEDULE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>الجدول الدراسي</button>
                        <button onClick={() => setViewMode('PLAN')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${viewMode === 'PLAN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400'}`}>الخطة الأسبوعية</button>
                    </div>
                </div>

                <div className="flex gap-3">
                    {viewMode === 'PLAN' && (
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border">
                            <button onClick={() => changeWeek(-1)} className="p-2 hover:bg-slate-100 rounded-xl"><ChevronRight size={20}/></button>
                            <span className="text-sm font-black px-4">{currentWeekStart}</span>
                            <button onClick={() => changeWeek(1)} className="p-2 hover:bg-slate-100 rounded-xl"><ChevronLeft size={20}/></button>
                        </div>
                    )}
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`px-8 py-3 rounded-2xl font-black text-xs transition-all ${isEditMode ? 'bg-emerald-600 text-white' : 'bg-white border-2 text-slate-600'}`}>
                        {isEditMode ? 'حفظ الجدول' : 'تعديل الجدول'}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[3.5rem] shadow-xl border border-slate-100 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="p-6 border-l border-white/5 w-40 font-black text-sm uppercase">اليوم</th>
                                {periods.map((p, idx) => (
                                    <th key={p} className="p-4 border-l border-white/5">
                                        <div className="flex flex-col items-center">
                                            <span className="font-black text-base">الحصة {p}</span>
                                            {periodTimings[idx] && <span className="text-[9px] text-white/40 font-mono mt-1">{periodTimings[idx]}</span>}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map(day => (
                                <tr key={day} className="border-b transition-colors hover:bg-slate-50/50">
                                    <td className="p-6 border-l font-black text-slate-800 bg-slate-50/50">{dayNamesAr[day]}</td>
                                    {periods.map(period => {
                                        const session = schedules.find(s => s.day === day && s.period === period && s.teacherId === currentUser?.id);
                                        const plan = weeklyPlans.find(p => p.day === day && p.period === period && p.weekStartDate === currentWeekStart);
                                        const isSelected = selectedSlot?.day === day && selectedSlot?.period === period;
                                        
                                        return (
                                            <td 
                                                key={period} 
                                                onClick={() => handleSlotClick(day, period)}
                                                className={`p-3 border-l border-slate-100 h-32 align-top relative transition-all group ${isEditMode || (viewMode === 'PLAN' && session) ? 'cursor-pointer hover:bg-indigo-50/20' : ''}`}
                                            >
                                                {session ? (
                                                    <div className="flex flex-col items-center gap-2 h-full w-full animate-fade-in">
                                                        <div className="w-full bg-white p-3 rounded-2xl shadow-sm border border-slate-100 group-hover:border-indigo-200">
                                                            <div className="font-black text-slate-800 text-xs truncate">{session.subjectName}</div>
                                                            <div className="text-[10px] font-black text-indigo-500 mt-1 uppercase">{session.classId}</div>
                                                        </div>
                                                        {viewMode === 'PLAN' && plan?.lessonTopic && (
                                                            <div className="mt-auto bg-purple-50 text-purple-700 p-2 rounded-xl text-[9px] font-black w-full truncate border border-purple-100">📖 {plan.lessonTopic}</div>
                                                        )}
                                                    </div>
                                                ) : isEditMode && <div className="h-full flex items-center justify-center text-slate-100"><Plus size={32}/></div>}
                                                
                                                {isSelected && isEditMode && (
                                                    <div className="absolute inset-0 bg-white p-3 flex flex-col gap-2 z-20 shadow-2xl rounded-2xl border border-indigo-100" onClick={e=>e.stopPropagation()}>
                                                        <select className="w-full p-2 border rounded-xl text-xs font-black" value={editClass} onChange={e=>setEditClass(e.target.value)}>
                                                            <option value="">-- الفصل --</option>
                                                            {Array.from(new Set(assignments.map(a=>a.classId))).map(c=><option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                        <select className="w-full p-2 border rounded-xl text-xs font-black" value={editSubject} onChange={e=>setEditSubject(e.target.value)}>
                                                            <option value="">-- المادة --</option>
                                                            {subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}
                                                        </select>
                                                        <button onClick={handleSaveSlot} className="mt-auto bg-indigo-600 text-white rounded-xl text-xs font-black py-2 shadow-lg">حفظ</button>
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

            {/* Modal for Planning */}
            {editingPlan && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[150] p-4">
                    <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-md p-10 animate-zoom-in relative">
                        <button onClick={() => setEditingPlan(null)} className="absolute top-8 left-8 text-slate-400 hover:text-red-500"><X/></button>
                        <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3"><PenTool className="text-indigo-600"/> تخطيط الحصة</h3>
                        <div className="space-y-6">
                            <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">موضوع الدرس</label><input className="w-full p-4 border rounded-2xl font-black text-sm bg-slate-50" value={tempTopic} onChange={e=>setTempTopic(e.target.value)} placeholder="مثلاً: الخلية النباتية..."/></div>
                            <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">الواجب</label><textarea className="w-full p-4 border rounded-2xl font-bold text-sm bg-slate-50 h-24" value={tempHomework} onChange={e=>setTempHomework(e.target.value)} placeholder="رقم الصفحة أو السؤال..."/></div>
                            <div className="flex gap-3">
                                <button onClick={handleSavePlan} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl">حفظ الخطة</button>
                                <button onClick={() => navigate('/lab')} className="p-4 bg-purple-50 text-purple-600 rounded-2xl"><Sparkles size={20}/></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScheduleView;
