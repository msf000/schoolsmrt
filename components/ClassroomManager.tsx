
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, Subject, ScheduleItem, TeacherAssignment, SystemUser, PerformanceRecord, LessonLink, BehaviorStatus } from '../types';
import { MonitorPlay, Grid, LayoutGrid, CheckSquare, Maximize, RotateCcw, Save, Shuffle, ArrowDownUp, Clock, StickyNote, DoorOpen, AlertCircle, BarChart2, Trash2, Play, Pause, Volume2, CalendarCheck, BookOpen, Calendar, Monitor, Plus, XCircle, User, Filter, Link as LinkIcon, ExternalLink, Move, Star, ThumbsUp, ThumbsDown, CheckCircle, Users, Trophy, Eye } from 'lucide-react';
import Attendance from './Attendance';
import { getSubjects, getSchedules, getTeacherAssignments, getLessonLinks, saveLessonLink, deleteLessonLink, updateStudent } from '../services/storageService';
import { formatDualDate } from '../services/dateService';
import { useNavigate } from 'react-router-dom';

// --- WIDGETS ---

const AttendanceStatsWidget: React.FC<{ students: Student[], attendance: AttendanceRecord[], date: string }> = ({ students, attendance, date }) => {
    const stats = useMemo(() => {
        if (!attendance || !students) return { present: 0, absent: 0, late: 0 };
        const absentCount = attendance.filter(a => students.some(s => s.id === a.studentId) && a.date === date && a.status === AttendanceStatus.ABSENT).length;
        const lateCount = attendance.filter(a => students.some(s => s.id === a.studentId) && a.date === date && a.status === AttendanceStatus.LATE).length;
        const presentCount = Math.max(0, students.length - absentCount - lateCount);
        return { present: presentCount, absent: absentCount, late: lateCount };
    }, [students, attendance, date]);

    return (
        <div className="flex bg-white rounded-lg border shadow-sm divide-x divide-x-reverse overflow-hidden text-xs">
            <div className="px-3 py-2 bg-green-50 text-green-700 flex flex-col items-center min-w-[60px]"><span className="font-black text-lg">{stats.present}</span><span className="text-[10px] font-bold">حضور</span></div>
            <div className="px-3 py-2 bg-red-50 text-red-700 flex flex-col items-center min-w-[60px]"><span className="font-black text-lg">{stats.absent}</span><span className="text-[10px] font-bold">غياب</span></div>
            <div className="px-3 py-2 bg-yellow-50 text-yellow-700 flex flex-col items-center min-w-[60px]"><span className="font-black text-lg">{stats.late}</span><span className="text-[10px] font-bold">تأخر</span></div>
        </div>
    );
};

const LessonLibraryWidget: React.FC<{ currentUser?: SystemUser | null, className?: string }> = ({ currentUser, className }) => {
    const [links, setLinks] = useState<LessonLink[]>([]);
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        const allLinks = getLessonLinks();
        setLinks(allLinks.filter(l => l.teacherId === currentUser?.id && (!className || !l.className || l.className === className)));
    }, [currentUser, className]);

    const handleAdd = () => {
        if(!newLinkUrl || !currentUser) return;
        const link: LessonLink = {
            id: Date.now().toString(),
            title: newLinkTitle || 'رابط جديد',
            url: newLinkUrl,
            teacherId: currentUser.id,
            className: className,
            createdAt: new Date().toISOString()
        };
        saveLessonLink(link);
        setLinks(prev => [...prev, link]);
        setNewLinkUrl(''); setNewLinkTitle(''); setIsAdding(false);
    };

    const handleDelete = (id: string) => {
        deleteLessonLink(id);
        setLinks(prev => prev.filter(l => l.id !== id));
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm"><BookOpen size={16}/> مصادر الدرس</h4>
                <button onClick={() => setIsAdding(!isAdding)} className="text-blue-600 hover:bg-blue-50 p-1 rounded"><Plus size={16}/></button>
            </div>
            
            {isAdding && (
                <div className="mb-3 p-2 bg-gray-50 rounded border text-xs space-y-2 animate-fade-in">
                    <input className="w-full p-1 border rounded" placeholder="العنوان (مثال: فيديو شرح)" value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)} />
                    <input className="w-full p-1 border rounded dir-ltr" placeholder="https://..." value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} />
                    <button onClick={handleAdd} className="w-full bg-blue-600 text-white rounded py-1 font-bold">إضافة</button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar max-h-32">
                {links.map(link => (
                    <div key={link.id} className="flex items-center justify-between group p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100">
                        <a href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-blue-600 truncate flex-1">
                            <LinkIcon size={12}/> {link.title}
                        </a>
                        <button onClick={() => handleDelete(link.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                    </div>
                ))}
                {links.length === 0 && <p className="text-center text-xs text-gray-400 py-4">لا توجد مصادر مضافة</p>}
            </div>
        </div>
    );
};

const DailyScheduleWidget: React.FC<{ 
    schedules: ScheduleItem[], 
    currentClass: string, 
    onSelectClass: (c: string, s: string) => void 
}> = ({ schedules, currentClass, onSelectClass }) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const todaysClasses = schedules.filter(s => s.day === today).sort((a,b) => a.period - b.period);

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2 text-sm"><Clock size={16}/> جدول اليوم</h4>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                {todaysClasses.length > 0 ? todaysClasses.map(s => (
                    <button 
                        key={s.id}
                        onClick={() => onSelectClass(s.classId, s.subjectName)}
                        className={`flex-shrink-0 p-3 rounded-lg border min-w-[100px] text-center transition-all ${s.classId === currentClass ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                        <span className="block text-xs opacity-70 font-bold mb-1">الحصة {s.period}</span>
                        <span className="block font-bold text-sm">{s.classId}</span>
                        <span className="block text-[10px] truncate max-w-[80px] mx-auto">{s.subjectName}</span>
                    </button>
                )) : <p className="text-xs text-gray-400 w-full text-center py-4">لا توجد حصص اليوم</p>}
            </div>
        </div>
    );
};

// --- BEHAVIOR TRACKER COMPONENT ---
const BehaviorTracker: React.FC<{
    students: Student[],
    attendance: AttendanceRecord[],
    onSaveAttendance: (records: AttendanceRecord[]) => void,
    currentUser?: SystemUser | null
}> = ({ students, attendance, onSaveAttendance, currentUser }) => {
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
    const [actionType, setActionType] = useState<'POSITIVE' | 'NEGATIVE' | null>(null);
    const today = new Date().toISOString().split('T')[0];

    // Calculate Points
    const studentPoints = useMemo<Record<string, { pos: number, neg: number }>>(() => {
        const points: Record<string, { pos: number, neg: number }> = {};
        students.forEach(s => points[s.id] = { pos: 0, neg: 0 });
        
        attendance.forEach(a => {
            if (a.date === today && points[a.studentId]) {
                if (a.behaviorStatus === BehaviorStatus.POSITIVE) points[a.studentId].pos++;
                if (a.behaviorStatus === BehaviorStatus.NEGATIVE) points[a.studentId].neg++;
            }
        });
        return points;
    }, [students, attendance, today]);

    const toggleStudent = (id: string) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedStudentIds(newSet);
    };

    const handleGivePoints = (type: 'POSITIVE' | 'NEGATIVE', reason: string) => {
        const records: AttendanceRecord[] = [];
        selectedStudentIds.forEach(id => {
            records.push({
                id: `${id}-${Date.now()}-${Math.random()}`,
                studentId: id,
                date: today,
                status: AttendanceStatus.PRESENT, // Default status for behavior record
                behaviorStatus: type === 'POSITIVE' ? BehaviorStatus.POSITIVE : BehaviorStatus.NEGATIVE,
                behaviorNote: reason,
                createdById: currentUser?.id
            });
        });
        onSaveAttendance(records);
        setSelectedStudentIds(new Set());
        setActionType(null);
    };

    const reasons = {
        POSITIVE: ['مشاركة فعالة', 'إجابة صحيحة', 'مساعدة زميل', 'انضباط', 'واجب منزلي', 'إبداع'],
        NEGATIVE: ['تحدث جانبي', 'عدم انتباه', 'نسيان أدوات', 'تأخر', 'عدم حل الواجب', 'شغب']
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Star size={18} className="text-yellow-500"/> السلوك والتحفيز</h3>
                    {selectedStudentIds.size > 0 && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                            تم تحديد {selectedStudentIds.size} طالب
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setSelectedStudentIds(new Set(students.map(s => s.id)))}
                        className="text-gray-500 hover:text-indigo-600 text-xs font-bold px-2"
                    >
                        تحديد الكل
                    </button>
                    <button 
                        onClick={() => setSelectedStudentIds(new Set())}
                        className="text-gray-500 hover:text-red-600 text-xs font-bold px-2"
                    >
                        إلغاء
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Students Grid */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {students.map(s => {
                            const isSelected = selectedStudentIds.has(s.id);
                            const pts = studentPoints[s.id];
                            return (
                                <div 
                                    key={s.id}
                                    onClick={() => toggleStudent(s.id)}
                                    className={`relative p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none flex flex-col items-center gap-2 ${isSelected ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500 shadow-md' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${isSelected ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                        {s.name.charAt(0)}
                                    </div>
                                    <span className="text-xs font-bold text-center line-clamp-1">{s.name}</span>
                                    
                                    <div className="flex gap-2 text-[10px] font-bold w-full justify-center mt-1">
                                        <div className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                            {pts?.pos || 0} <ThumbsUp size={10}/>
                                        </div>
                                        {pts && pts.neg > 0 && (
                                            <div className="bg-red-50 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                {pts.neg} <ThumbsDown size={10}/>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {isSelected && <div className="absolute top-2 right-2 text-indigo-600"><CheckCircle size={16}/></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions Sidebar (Right Side) */}
                <div className="w-48 bg-gray-50 border-r p-4 flex flex-col gap-4">
                    <div className="text-center mb-2">
                        <span className="text-xs text-gray-500 font-bold block mb-1">الإجراءات الجماعية</span>
                        <div className="w-full h-1 bg-gray-200 rounded-full"></div>
                    </div>

                    <button 
                        disabled={selectedStudentIds.size === 0}
                        onClick={() => setActionType('POSITIVE')}
                        className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                    >
                        <ThumbsUp size={20}/>
                        <span className="text-xs">منح نقاط</span>
                    </button>

                    <button 
                        disabled={selectedStudentIds.size === 0}
                        onClick={() => setActionType('NEGATIVE')}
                        className="w-full py-3 bg-red-500 text-white rounded-xl font-bold shadow-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
                    >
                        <AlertCircle size={20}/>
                        <span className="text-xs">تسجيل مخالفة</span>
                    </button>

                    <div className="mt-auto bg-white p-3 rounded-xl border border-gray-200">
                        <h4 className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1"><Trophy size={12} className="text-yellow-500"/> أبطال اليوم</h4>
                        <ul className="space-y-1">
                            {/* Explicitly cast to [string, { pos: number, neg: number }] to help TS */}
                            {(Object.entries(studentPoints) as [string, { pos: number, neg: number }][])
                                .sort((a,b) => b[1].pos - a[1].pos)
                                .slice(0, 3)
                                .filter(x => x[1].pos > 0)
                                .map(([id, pts], i) => {
                                    const s = students.find(st => st.id === id);
                                    return <li key={id} className="text-[10px] text-gray-600 flex justify-between"><span>{i+1}. {s?.name}</span> <span className="font-bold text-green-600">{pts.pos}</span></li>
                                })
                            }
                            {Object.values(studentPoints).every((p: { pos: number, neg: number }) => p.pos === 0) && <li className="text-[10px] text-gray-400 text-center">لا توجد نقاط بعد</li>}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Reason Modal */}
            {actionType && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className={`p-4 text-white font-bold flex justify-between items-center ${actionType === 'POSITIVE' ? 'bg-green-600' : 'bg-red-600'}`}>
                            <span>{actionType === 'POSITIVE' ? 'أسباب التميز' : 'أسباب المخالفة'}</span>
                            <button onClick={() => setActionType(null)}><XCircle size={20}/></button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3">
                            {reasons[actionType].map(reason => (
                                <button 
                                    key={reason}
                                    onClick={() => handleGivePoints(actionType, reason)}
                                    className="p-3 border rounded-lg hover:bg-gray-50 text-sm font-bold text-gray-700 text-center transition-colors"
                                >
                                    {reason}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SEATING CHART COMPONENT ---
const SeatingChart: React.FC<{ 
    students: Student[], 
    attendance: AttendanceRecord[], 
    onSaveAttendance: (records: AttendanceRecord[]) => void,
    onSaveSeating: (updatedStudents: Student[]) => void,
    currentUser?: SystemUser | null
}> = ({ students, attendance, onSaveAttendance, onSaveSeating, currentUser }) => {
    const navigate = useNavigate();
    const [editMode, setEditMode] = useState(false);
    const [localStudents, setLocalStudents] = useState<Student[]>(students);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        setLocalStudents(students.sort((a, b) => (a.seatIndex || 999) - (b.seatIndex || 999)));
    }, [students]);

    // Handle Drop
    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const studentId = e.dataTransfer.getData("studentId");
        const draggedStudentIndex = localStudents.findIndex(s => s.id === studentId);
        
        if (draggedStudentIndex > -1) {
            const newStudents = [...localStudents];
            const [draggedStudent] = newStudents.splice(draggedStudentIndex, 1);
            newStudents.splice(targetIndex, 0, draggedStudent);
            
            // Re-assign seat indices based on new order
            const updated = newStudents.map((s, idx) => ({ ...s, seatIndex: idx }));
            setLocalStudents(updated);
        }
    };

    const handleSaveOrder = () => {
        onSaveSeating(localStudents);
        setEditMode(false);
    };

    const toggleAttendance = (student: Student) => {
        if (editMode) return;
        const currentRecord = attendance.find(a => a.studentId === student.id && a.date === today);
        const currentStatus = currentRecord ? currentRecord.status : AttendanceStatus.PRESENT;
        
        let nextStatus = AttendanceStatus.PRESENT;
        if (currentStatus === AttendanceStatus.PRESENT) nextStatus = AttendanceStatus.ABSENT;
        else if (currentStatus === AttendanceStatus.ABSENT) nextStatus = AttendanceStatus.LATE;
        else nextStatus = AttendanceStatus.PRESENT;

        const newRecord: AttendanceRecord = {
            id: currentRecord ? currentRecord.id : `${student.id}-${today}`,
            studentId: student.id,
            date: today,
            status: nextStatus,
            createdById: currentUser?.id
        };
        onSaveAttendance([newRecord]);
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><LayoutGrid size={18}/> مخطط الفصل</h3>
                    <div className="flex gap-2 text-xs font-bold">
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div> حاضر</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> غائب</span>
                        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div> متأخر</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    {editMode ? (
                        <button onClick={handleSaveOrder} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-green-700 animate-bounce-in">
                            <Save size={16}/> حفظ الترتيب
                        </button>
                    ) : (
                        <button onClick={() => setEditMode(true)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-50">
                            <Move size={16}/> تعديل الأماكن
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 relative">
                {/* Teacher Desk visual */}
                <div className="w-64 h-12 bg-gray-300 rounded-lg mx-auto mb-10 flex items-center justify-center text-gray-500 font-bold text-sm shadow-inner border-b-4 border-gray-400">
                    مكتب المعلم (السبورة)
                </div>

                <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 max-w-5xl mx-auto" style={{ direction: 'rtl' }}>
                    {localStudents.map((student, index) => {
                        const record = attendance.find(a => a.studentId === student.id && a.date === today);
                        const status = record ? record.status : AttendanceStatus.PRESENT;
                        
                        return (
                            <div
                                key={student.id}
                                draggable={editMode}
                                onDragStart={(e) => { e.dataTransfer.setData("studentId", student.id); e.dataTransfer.effectAllowed = "move"; }}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, index)}
                                onClick={() => toggleAttendance(student)}
                                className={`
                                    relative p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-2 aspect-square shadow-sm group
                                    ${editMode ? 'cursor-move border-dashed border-gray-400 bg-white hover:bg-gray-50' : 'cursor-pointer hover:scale-105 hover:shadow-md'}
                                    ${!editMode && status === 'PRESENT' ? 'bg-white border-green-500' : ''}
                                    ${!editMode && status === 'ABSENT' ? 'bg-red-50 border-red-500' : ''}
                                    ${!editMode && status === 'LATE' ? 'bg-yellow-50 border-yellow-500' : ''}
                                `}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${!editMode && status === 'ABSENT' ? 'bg-red-500' : !editMode && status === 'LATE' ? 'bg-yellow-500' : 'bg-green-500'}`}>
                                    {student.name.charAt(0)}
                                </div>
                                <span className="text-xs font-bold text-center leading-tight line-clamp-2">{student.name}</span>
                                {editMode && <Move size={12} className="absolute top-2 right-2 text-gray-400"/>}
                                {!editMode && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); navigate('/followup', { state: { studentId: student.id } }); }}
                                        className="absolute top-1 left-1 p-1 bg-white/80 rounded-full text-gray-500 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
                                        title="عرض الملف"
                                    >
                                        <Eye size={14}/>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    {/* Empty Slots for layout */}
                    {Array.from({ length: Math.max(0, 30 - localStudents.length) }).map((_, i) => (
                        <div key={`empty-${i}`} className="border-2 border-dashed border-gray-200 rounded-xl bg-transparent aspect-square opacity-50"></div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

interface ClassroomManagerProps {
    students: Student[];
    performance?: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onLaunchScreen: () => void;
    onNavigateToAttendance: () => void;
    onSaveAttendance: (records: AttendanceRecord[]) => void;
    onImportAttendance: (records: AttendanceRecord[]) => void;
    selectedDate?: string;
    onDateChange?: (date: string) => void;
    currentUser?: SystemUser | null;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ 
    students = [], 
    attendance = [], 
    onLaunchScreen, 
    onSaveAttendance, 
    onImportAttendance,
    selectedDate,
    onDateChange,
    currentUser
}) => {
    const [activeTab, setActiveTab] = useState<'TOOLS' | 'ATTENDANCE' | 'SEATING' | 'BEHAVIOR'>(() => {
        return localStorage.getItem('classroom_manager_tab') as any || 'TOOLS';
    });

    useEffect(() => {
        localStorage.setItem('classroom_manager_tab', activeTab);
    }, [activeTab]);

    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    
    const [internalDate, setInternalDate] = useState(new Date().toISOString().split('T')[0]);
    const effectiveDate = selectedDate || internalDate;
    const handleDateChange = onDateChange || setInternalDate;

    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    
    // Derived Data
    const uniqueClasses = useMemo(() => {
        if (!students) return [];
        const classes = new Set<string>();
        students.forEach(s => s.className && classes.add(s.className));
        // Add manual classes
        const manualClasses = getTeacherAssignments(currentUser?.id).map(a => a.classId);
        manualClasses.forEach(c => classes.add(c));
        
        return Array.from(classes).sort();
    }, [students, currentUser]);

    useEffect(() => {
        const loadedSubjects = getSubjects(currentUser?.id);
        setSubjects(loadedSubjects);
        const mySchedules = getSchedules().filter(s => !currentUser || s.teacherId === currentUser.id);
        setSchedules(mySchedules);
        
        // Auto-select class based on current time schedule?
        if(uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]);
        if(loadedSubjects.length > 0 && !selectedSubject) setSelectedSubject(loadedSubjects[0].name);
    }, [uniqueClasses, currentUser]);

    // Handle Seating Save
    const handleSeatingSave = (updatedStudents: Student[]) => {
        updatedStudents.forEach(s => updateStudent(s));
        // Force refresh handled by parent via data change listeners if implemented, or we can just rely on local state update for now
    };

    // Render Logic
    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <MonitorPlay className="text-indigo-600"/> إدارة الفصل
                    </h2>
                    <p className="text-sm text-gray-500">لوحة التحكم بالحصة الدراسية والأدوات الصفية</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Class Selector */}
                    <div className="flex bg-white p-1 rounded-lg border shadow-sm items-center">
                        <select 
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none px-3 py-2 cursor-pointer"
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                        >
                            <option value="">-- اختر الفصل --</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                        <button onClick={() => setActiveTab('TOOLS')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'TOOLS' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-800'}`}>
                            <Grid size={16}/> الأدوات
                        </button>
                        <button onClick={() => setActiveTab('ATTENDANCE')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'ATTENDANCE' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-800'}`}>
                            <CheckSquare size={16}/> التحضير
                        </button>
                        <button onClick={() => setActiveTab('SEATING')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'SEATING' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-800'}`}>
                            <LayoutGrid size={16}/> المقاعد
                        </button>
                        <button onClick={() => setActiveTab('BEHAVIOR')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'BEHAVIOR' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-800'}`}>
                            <Star size={16}/> السلوك
                        </button>
                    </div>

                    <button onClick={onLaunchScreen} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition-transform hover:scale-105 active:scale-95">
                        <Maximize size={18}/> فتح الشاشة
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
                
                {/* --- TOOLS TAB --- */}
                {activeTab === 'TOOLS' && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            {/* Widget 1: Schedule */}
                            <div className="lg:col-span-2">
                                <DailyScheduleWidget 
                                    schedules={schedules} 
                                    currentClass={selectedClass}
                                    onSelectClass={(c, s) => { setSelectedClass(c); setSelectedSubject(s); }}
                                />
                            </div>
                            {/* Widget 2: Attendance Summary */}
                            <div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col justify-center">
                                    <h4 className="font-bold text-gray-700 mb-3 text-sm">ملخص الحضور ({selectedClass})</h4>
                                    <AttendanceStatsWidget 
                                        students={students.filter(s => s.className === selectedClass)} 
                                        attendance={attendance} 
                                        date={effectiveDate}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Lesson Resources */}
                            <LessonLibraryWidget currentUser={currentUser} className={selectedClass} />

                            {/* Quick Note */}
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 shadow-sm relative group h-64">
                                <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-200 rounded-bl-xl z-10 flex items-center justify-center text-yellow-700">
                                    <StickyNote size={14}/>
                                </div>
                                <textarea 
                                    className="w-full h-full bg-transparent border-none outline-none resize-none text-sm text-gray-700 leading-relaxed placeholder-yellow-700/50"
                                    placeholder="ملاحظات سريعة للحصة..."
                                />
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-full">
                                <h4 className="font-bold text-gray-700 mb-4 text-sm">إجراءات سريعة</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => window.open(`https://www.youtube.com/results?search_query=${selectedSubject}`, '_blank')} className="p-3 bg-red-50 text-red-600 rounded-lg flex flex-col items-center gap-1 hover:bg-red-100 transition-colors text-xs font-bold">
                                        <Play size={20}/> فيديو يوتيوب
                                    </button>
                                    <button onClick={() => {}} className="p-3 bg-blue-50 text-blue-600 rounded-lg flex flex-col items-center gap-1 hover:bg-blue-100 transition-colors text-xs font-bold">
                                        <Volume2 size={20}/> مؤقت صوتي
                                    </button>
                                    <button onClick={() => onLaunchScreen()} className="p-3 bg-indigo-50 text-indigo-600 rounded-lg flex flex-col items-center gap-1 hover:bg-indigo-100 transition-colors text-xs font-bold col-span-2">
                                        <Monitor size={20}/> السبورة التفاعلية
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- ATTENDANCE TAB (Integrated) --- */}
                {activeTab === 'ATTENDANCE' && (
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <Attendance 
                            students={students} 
                            attendanceHistory={attendance || []} 
                            onSaveAttendance={onSaveAttendance} 
                            onImportAttendance={onImportAttendance}
                            preSelectedClass={selectedClass}
                            preSelectedSubject={selectedSubject}
                            selectedDate={effectiveDate}
                            onDateChange={handleDateChange}
                            currentUser={currentUser}
                        />
                    </div>
                )}

                {/* --- SEATING TAB --- */}
                {activeTab === 'SEATING' && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {selectedClass ? (
                            <SeatingChart 
                                students={students.filter(s => s.className === selectedClass)}
                                attendance={attendance}
                                onSaveAttendance={onSaveAttendance}
                                onSaveSeating={handleSeatingSave}
                                currentUser={currentUser}
                            />
                        ) : (
                            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center text-gray-400">
                                <p>الرجاء اختيار الفصل لعرض المخطط</p>
                            </div>
                        )}
                    </div>
                )}

                {/* --- BEHAVIOR TAB --- */}
                {activeTab === 'BEHAVIOR' && (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {selectedClass ? (
                            <BehaviorTracker 
                                students={students.filter(s => s.className === selectedClass)}
                                attendance={attendance}
                                onSaveAttendance={onSaveAttendance}
                                currentUser={currentUser}
                            />
                        ) : (
                            <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center text-gray-400">
                                <p>الرجاء اختيار الفصل لعرض لوحة السلوك</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassroomManager;
