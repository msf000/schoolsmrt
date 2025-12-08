
import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleItem, TeacherAssignment, SystemUser, Subject, CurriculumUnit, CurriculumLesson } from '../types';
import { getSchedules, getTeacherAssignments, getSubjects, getCurriculumUnits, getCurriculumLessons, saveScheduleItem, deleteScheduleItem } from '../services/storageService';
import { Calendar, Clock, MapPin, BookOpen, Plus, Trash2, Edit2, Check, X, Printer, Layout, ArrowLeft, Loader2 } from 'lucide-react';

interface ScheduleViewProps {
    currentUser?: SystemUser | null;
    onNavigateToLesson?: () => void;
    onNavigateToAttendance?: () => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ currentUser, onNavigateToLesson, onNavigateToAttendance }) => {
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [lessons, setLessons] = useState<CurriculumLesson[]>([]);
    const [units, setUnits] = useState<CurriculumUnit[]>([]);

    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{day: string, period: number} | null>(null);
    const [editClass, setEditClass] = useState('');
    const [editSubject, setEditSubject] = useState('');

    useEffect(() => {
        if(currentUser) {
            setSchedules(getSchedules());
            setAssignments(getTeacherAssignments());
            setSubjects(getSubjects(currentUser.id));
            setUnits(getCurriculumUnits(currentUser.id));
            setLessons(getCurriculumLessons());
        }
    }, [currentUser]);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const dayNamesAr = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];

    // Get Current Day and Period (Mock calculation based on time)
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    const mySchedules = useMemo(() => {
        if(!currentUser) return [];
        return schedules.filter(s => s.teacherId === currentUser.id || !s.teacherId);
    }, [schedules, currentUser]);

    const handleSlotClick = (day: string, period: number) => {
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

    const uniqueClasses = useMemo(() => Array.from(new Set(assignments.map(a => a.classId))), [assignments]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="text-teal-600"/> الجدول الدراسي
                    </h2>
                    <p className="text-sm text-gray-500">عرض الجدول الأسبوعي وإدارة الحصص.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsEditMode(!isEditMode)} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${isEditMode ? 'bg-green-600 text-white' : 'bg-white border text-gray-700'}`}>
                        {isEditMode ? <Check size={18}/> : <Edit2 size={18}/>} {isEditMode ? 'إنهاء التعديل' : 'تعديل الجدول'}
                    </button>
                    <button onClick={() => window.print()} className="px-4 py-2 bg-gray-800 text-white rounded-lg font-bold flex items-center gap-2">
                        <Printer size={18}/> طباعة
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr className="bg-teal-700 text-white">
                                <th className="p-4 border-l border-teal-600 w-32 font-bold">اليوم / الحصة</th>
                                {periods.map(p => (
                                    <th key={p} className="p-3 border-l border-teal-600 min-w-[140px]">
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-lg">الحصة {p}</span>
                                            {/* Add Time mock if needed */}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map(day => {
                                const isToday = day === currentDay;
                                return (
                                    <tr key={day} className={`${isToday ? 'bg-yellow-50' : 'hover:bg-gray-50'} border-b transition-colors`}>
                                        <td className={`p-4 border-l font-bold text-gray-800 ${isToday ? 'text-teal-700 bg-yellow-100' : 'bg-gray-50'}`}>
                                            {dayNamesAr[day as keyof typeof dayNamesAr]}
                                        </td>
                                        {periods.map(period => {
                                            const session = mySchedules.find(s => s.day === day && s.period === period);
                                            const isSelected = selectedSlot?.day === day && selectedSlot?.period === period;
                                            
                                            return (
                                                <td 
                                                    key={period} 
                                                    onClick={() => handleSlotClick(day, period)}
                                                    className={`p-2 border-l border-gray-200 h-28 align-middle relative transition-all ${isEditMode ? 'cursor-pointer hover:bg-gray-100' : ''} ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500 inset-0 z-10' : ''}`}
                                                >
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
                                                            <div className="flex flex-col items-center gap-1 h-full w-full justify-center">
                                                                <span className="font-black text-gray-800 text-lg">{session.subjectName}</span>
                                                                <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-bold border border-teal-200">{session.classId}</span>
                                                                
                                                                {/* Quick Actions (Hover) */}
                                                                {!isEditMode && (
                                                                    <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                                                                        {onNavigateToAttendance && <button onClick={onNavigateToAttendance} title="تحضير" className="p-1 bg-white border rounded shadow-sm hover:text-green-600"><Check size={14}/></button>}
                                                                        {onNavigateToLesson && <button onClick={onNavigateToLesson} title="تحضير درس" className="p-1 bg-white border rounded shadow-sm hover:text-blue-600"><BookOpen size={14}/></button>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            isEditMode && <div className="text-gray-200 flex justify-center"><Plus size={24}/></div>
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
        </div>
    );
};

export default ScheduleView;
