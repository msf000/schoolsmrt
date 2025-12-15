
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, Subject, ScheduleItem, TeacherAssignment, SystemUser, PerformanceRecord, LessonLink } from '../types';
import { MonitorPlay, Grid, LayoutGrid, CheckSquare, Maximize, RotateCcw, Save, Shuffle, ArrowDownUp, Clock, StickyNote, DoorOpen, AlertCircle, BarChart2, Trash2, Play, Pause, Volume2, CalendarCheck, BookOpen, Calendar, Monitor, Plus, XCircle, User, Filter, Link as LinkIcon, ExternalLink } from 'lucide-react';
import Attendance from './Attendance';
import { getSubjects, getSchedules, getTeacherAssignments, getLessonLinks, saveLessonLink, deleteLessonLink, updateStudent } from '../services/storageService';
import { formatDualDate } from '../services/dateService';

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
        // Filter links relevant to this teacher and optionally this class
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
    onSaveSeating?: (students: Student[]) => void;
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
    const [activeTab, setActiveTab] = useState<'TOOLS' | 'ATTENDANCE' | 'SEATING'>(() => {
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
        return Array.from(classes).sort();
    }, [students]);

    useEffect(() => {
        const loadedSubjects = getSubjects(currentUser?.id);
        setSubjects(loadedSubjects);
        const mySchedules = getSchedules().filter(s => !currentUser || s.teacherId === currentUser.id);
        setSchedules(mySchedules);
        
        // Auto-select class based on current time schedule?
        if(uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]);
        if(loadedSubjects.length > 0 && !selectedSubject) setSelectedSubject(loadedSubjects[0].name);
    }, [uniqueClasses, currentUser]);

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

                {/* --- SEATING TAB (Placeholder for future) --- */}
                {activeTab === 'SEATING' && (
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <Grid size={48} className="mx-auto mb-4 opacity-20"/>
                            <p>مخطط الجلوس قريباً...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassroomManager;
