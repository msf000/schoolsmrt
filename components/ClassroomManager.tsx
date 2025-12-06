
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Subject, ScheduleItem, TeacherAssignment, SystemUser, LessonLink } from '../types';
import { MonitorPlay, Grid, LayoutGrid, CheckSquare, Maximize, Printer, RotateCcw, Save, Sparkles, Shuffle, ArrowDownUp, CheckCircle, Loader2, Clock, LogOut, FileText, StickyNote, DoorOpen, AlertCircle, BarChart2, ThumbsUp, ThumbsDown, Trash2, Play, Pause, Volume2, Bell, Music, Users, CalendarCheck, XCircle, BookOpen, Calendar, Briefcase, Globe, Monitor, Link as LinkIcon, Plus } from 'lucide-react';
import Attendance from './Attendance';
import { getSubjects, getSchedules, getTeacherAssignments, getLessonLinks, saveLessonLink, deleteLessonLink } from '../services/storageService';

interface ClassroomManagerProps {
    students: Student[];
    performance?: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onLaunchScreen: () => void;
    onNavigateToAttendance: () => void;
    onSaveSeating?: (students: Student[]) => void;
    onSaveAttendance: (records: AttendanceRecord[]) => void;
    onImportAttendance: (records: AttendanceRecord[]) => void;
    selectedDate?: string;
    onDateChange?: (date: string) => void;
    currentUser?: SystemUser | null;
}

interface HallPass {
    id: string;
    studentId: string;
    studentName: string;
    reason: string;
    startTime: number;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ 
    students, 
    performance = [], 
    attendance, 
    onLaunchScreen, 
    onNavigateToAttendance, 
    onSaveSeating, 
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
    
    // Internal state if no props provided (fallback)
    const [internalDate, setInternalDate] = useState(new Date().toISOString().split('T')[0]);
    const effectiveDate = selectedDate || internalDate;
    const handleDateChange = onDateChange || setInternalDate;

    // Schedule & Teacher Context
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        students.forEach(s => s.className && classes.add(s.className));
        return Array.from(classes).sort();
    }, [students]);

    useEffect(() => {
        const loadedSubjects = getSubjects();
        setSubjects(loadedSubjects);
        setSchedules(getSchedules());
        setTeacherAssignments(getTeacherAssignments());
        
        // Defaults
        if(uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]);
        if(loadedSubjects.length > 0 && !selectedSubject) setSelectedSubject(loadedSubjects[0].name);
    }, [uniqueClasses]);

    const classStudents = useMemo(() => {
        return students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
    }, [students, selectedClass]);

    // Present Students Only (for tools) based on EFFECTIVE DATE
    const presentStudents = useMemo(() => {
        return classStudents.filter(s => {
            const record = attendance.find(a => a.studentId === s.id && a.date === effectiveDate);
            return !record || record.status !== AttendanceStatus.ABSENT;
        });
    }, [classStudents, attendance, effectiveDate]);

    const getDayName = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ar-SA', { weekday: 'long' });
    };

    // --- FILTERED SCHEDULE LOGIC ---
    const dailyClassSchedule = useMemo(() => {
        if (!selectedClass || !effectiveDate) return [];
        const dateObj = new Date(effectiveDate);
        const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayMap[dateObj.getDay()];

        // 1. Get schedule for this class on this day
        const classSched = schedules.filter(s => s.classId === selectedClass && s.day === currentDay);

        // 2. Filter for logged-in teacher (if TEACHER role)
        if (currentUser && currentUser.role === 'TEACHER') {
             // Find matches where the teacher assigned to the subject IS the current user
             return classSched.filter(s => {
                 const assignment = teacherAssignments.find(ta => ta.classId === s.classId && ta.subjectName === s.subjectName);
                 return assignment?.teacherId === currentUser.id;
             }).sort((a,b) => a.period - b.period);
        }

        // If Admin, show full schedule
        return classSched.sort((a,b) => a.period - b.period);
    }, [schedules, teacherAssignments, selectedClass, effectiveDate, currentUser]);

    return (
        <div className="p-6 h-full flex flex-col animate-fade-in bg-gray-50">
            <div className="mb-4">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <LayoutGrid className="text-purple-600"/> الإدارة الصفية
                        </h2>
                        <p className="text-gray-500 mt-2">أدوات إدارة الحصة، توزيع المقاعد، وضبط السلوك.</p>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-end md:items-center gap-4 w-full xl:w-auto">
                        {/* Date Picker Section */}
                        <div className="bg-white p-1 rounded-lg border shadow-sm flex items-center gap-2">
                            <div className="px-3 py-1 bg-purple-50 rounded text-purple-700 font-bold text-sm border border-purple-100 flex items-center gap-1">
                                <Calendar size={14}/> {getDayName(effectiveDate)}
                            </div>
                            <input 
                                type="date" 
                                value={effectiveDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="p-1 font-bold text-gray-700 outline-none cursor-pointer bg-transparent text-sm"
                            />
                        </div>

                        {selectedClass && (
                        <AttendanceStatsWidget students={classStudents} attendance={attendance} date={effectiveDate} />
                        )}

                        <div className="flex gap-2">
                            <div className="bg-white p-1 rounded-lg border shadow-sm flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 px-2 flex items-center gap-1"><Grid size={14}/> الفصل:</span>
                                <select 
                                    value={selectedClass} 
                                    onChange={e => setSelectedClass(e.target.value)}
                                    className="p-1 font-bold text-primary outline-none cursor-pointer bg-transparent text-sm"
                                >
                                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="bg-white p-1 rounded-lg border shadow-sm flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 px-2 flex items-center gap-1"><BookOpen size={14}/> المادة:</span>
                                <select 
                                    value={selectedSubject} 
                                    onChange={e => setSelectedSubject(e.target.value)}
                                    className="p-1 font-bold text-purple-600 outline-none cursor-pointer bg-transparent text-sm"
                                >
                                    {subjects.length > 0 ? subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>) : <option value="عام">عام</option>}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- TODAY'S SCHEDULE STRIP (NEW) --- */}
                {selectedClass && (
                    <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row items-center gap-4 animate-fade-in mb-2">
                        <div className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded flex items-center gap-1 whitespace-nowrap">
                            <Clock size={12}/> جدول اليوم ({selectedClass}):
                        </div>
                        {dailyClassSchedule.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto pb-1 w-full custom-scrollbar">
                                {dailyClassSchedule.map(item => (
                                    <button 
                                        key={item.id}
                                        onClick={() => setSelectedSubject(item.subjectName)}
                                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${selectedSubject === item.subjectName ? 'bg-purple-600 text-white border-purple-700 shadow' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        <span className="bg-white/20 px-1.5 rounded text-[10px]">{item.period}</span>
                                        {item.subjectName}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-xs text-gray-400 italic flex-1">لا توجد حصص مسجلة للمعلم في هذا اليوم لهذا الفصل.</div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex gap-4 mb-6 border-b border-gray-200 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('TOOLS')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${activeTab === 'TOOLS' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <LayoutGrid className="inline-block ml-2" size={16}/>
                    لوحة القيادة (Dashboard)
                </button>
                <button 
                    onClick={() => setActiveTab('ATTENDANCE')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${activeTab === 'ATTENDANCE' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <CalendarCheck className="inline-block ml-2" size={16}/>
                    تحضير الطلاب
                </button>
                <button 
                    onClick={() => setActiveTab('SEATING')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${activeTab === 'SEATING' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    <Grid className="inline-block ml-2" size={16}/>
                    مخطط الجلوس (Seating Plan)
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'TOOLS' && (
                    <div className="space-y-6">
                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div 
                                onClick={onLaunchScreen}
                                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white cursor-pointer hover:scale-[1.02] transition-transform shadow-lg group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                                <div className="relative z-10">
                                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
                                        <Maximize size={20} className="text-yellow-400"/>
                                    </div>
                                    <h3 className="font-bold text-lg mb-1">الشاشة التفاعلية</h3>
                                    <p className="text-gray-400 text-xs mb-3">سبورة ذكية: مؤقت، قرعة، مجموعات.</p>
                                    <span className="text-yellow-400 text-xs font-bold flex items-center gap-1">تشغيل <MonitorPlay size={12}/></span>
                                </div>
                            </div>

                            <div 
                                onClick={() => setActiveTab('ATTENDANCE')}
                                className="bg-white rounded-xl p-6 border border-gray-200 cursor-pointer hover:border-green-400 hover:shadow-md transition-all group"
                            >
                                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-100 transition-colors">
                                    <CheckSquare size={20} className="text-green-600"/>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">سجل السلوك والحضور</h3>
                                <p className="text-gray-500 text-xs mb-3">رصد سريع للمخالفات، النقاط الإيجابية، والغياب لمادة <b>{selectedSubject}</b>.</p>
                                <span className="text-green-600 text-xs font-bold flex items-center gap-1">فتح السجل <ArrowDownUp size={12}/></span>
                            </div>

                            <div 
                                onClick={() => setActiveTab('SEATING')}
                                className="bg-white rounded-xl p-6 border border-gray-200 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all group"
                            >
                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                                    <Grid size={20} className="text-purple-600"/>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">ترتيب المقاعد</h3>
                                <p className="text-gray-500 text-xs mb-3">توزيع الطلاب وتغيير أماكنهم.</p>
                                <span className="text-purple-600 text-xs font-bold flex items-center gap-1">تعديل <ArrowDownUp size={12}/></span>
                            </div>
                        </div>

                        {/* Widgets Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Column 1 */}
                            <div className="space-y-6">
                                <TrafficLightWidget />
                                <MiniTimerWidget />
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-6">
                                <LessonLibraryWidget currentUser={currentUser} />
                                <QuickPollWidget />
                                <SoundBoardWidget />
                            </div>

                            {/* Column 3 */}
                            <div className="space-y-6">
                                {/* Only pass PRESENT students to Hall Pass */}
                                <HallPassWidget students={presentStudents} className={selectedClass} />
                                <LessonNoteWidget className={selectedClass} subject={selectedSubject} />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'ATTENDANCE' && (
                    <Attendance 
                        students={students} 
                        attendanceHistory={attendance} 
                        onSaveAttendance={onSaveAttendance} 
                        onImportAttendance={onImportAttendance}
                        preSelectedClass={selectedClass}
                        preSelectedSubject={selectedSubject}
                        selectedDate={effectiveDate}
                        onDateChange={handleDateChange}
                    />
                )}

                {activeTab === 'SEATING' && <SeatingChart students={students} performance={performance} onSaveSeating={onSaveSeating} preSelectedClass={selectedClass} />}
            </div>
        </div>
    );
};

// --- Attendance Stats Widget ---
const AttendanceStatsWidget: React.FC<{ students: Student[], attendance: AttendanceRecord[], date: string }> = ({ students, attendance, date }) => {
    
    const stats = useMemo(() => {
        let present = 0, absent = 0, late = 0;
        
        students.forEach(s => {
            const record = attendance.find(a => a.studentId === s.id && a.date === date);
            if (!record || record.status === AttendanceStatus.PRESENT) present++; 
            if (record) {
                if (record.status === AttendanceStatus.ABSENT) { absent++; present--; } 
                else if (record.status === AttendanceStatus.LATE) { late++; present--; }
                else if (record.status === AttendanceStatus.EXCUSED) { absent++; present--; } 
            }
        });
        
        // Accurate count using strict filtering
        const absentCount = attendance.filter(a => students.some(s => s.id === a.studentId) && a.date === date && a.status === AttendanceStatus.ABSENT).length;
        const lateCount = attendance.filter(a => students.some(s => s.id === a.studentId) && a.date === date && a.status === AttendanceStatus.LATE).length;
        const excusedCount = attendance.filter(a => students.some(s => s.id === a.studentId) && a.date === date && a.status === AttendanceStatus.EXCUSED).length;
        const presentCount = students.length - absentCount - lateCount - excusedCount;

        return { present: presentCount, absent: absentCount, late: lateCount };
    }, [students, attendance, date]);

    return (
        <div className="flex bg-white rounded-lg border shadow-sm divide-x divide-x-reverse overflow-hidden text-xs">
            <div className="px-3 py-1 bg-green-50 text-green-700 flex flex-col items-center">
                <span className="font-bold">{stats.present}</span>
                <span className="text-[10px]">حضور</span>
            </div>
            <div className="px-3 py-1 bg-red-50 text-red-700 flex flex-col items-center">
                <span className="font-bold">{stats.absent}</span>
                <span className="text-[10px]">غياب</span>
            </div>
            <div className="px-3 py-1 bg-yellow-50 text-yellow-700 flex flex-col items-center">
                <span className="font-bold">{stats.late}</span>
                <span className="text-[10px]">تأخر</span>
            </div>
        </div>
    );
};

// --- Widget: Lesson Library (Replacement for simple Presentation Link) ---
const LessonLibraryWidget: React.FC<{ currentUser?: SystemUser | null }> = ({ currentUser }) => {
    const [links, setLinks] = useState<LessonLink[]>([]);
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        // Load all links initially, filtering is done in render or load if preferred
        setLinks(getLessonLinks());
    }, []);

    const filteredLinks = useMemo(() => {
        if (!currentUser) return links;
        if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'SCHOOL_MANAGER') return links;
        // Strict isolation for Teachers
        return links.filter(l => l.teacherId === currentUser.id);
    }, [links, currentUser]);

    const handleSave = () => {
        if (!newTitle || !newUrl) return;

        let cleanUrl = newUrl.trim();
        // Fix SharePoint/OneDrive logic
        if (cleanUrl.includes('sharepoint.com') || cleanUrl.includes('onedrive.live.com') || cleanUrl.includes('1drv.ms') || cleanUrl.includes('office.com')) {
             if (!cleanUrl.includes('action=embedview')) {
                 cleanUrl = cleanUrl.replace(/action=[^&]+/, '');
                 cleanUrl += cleanUrl.includes('?') ? '&action=embedview' : '?action=embedview';
             }
        }

        const newLink: LessonLink = {
            id: Date.now().toString(),
            title: newTitle,
            url: cleanUrl,
            teacherId: currentUser?.id, // Link to creator
            createdAt: new Date().toISOString()
        };

        saveLessonLink(newLink);
        setLinks(getLessonLinks());
        setNewTitle('');
        setNewUrl('');
        setShowForm(false);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(confirm('حذف هذا الدرس؟')) {
            deleteLessonLink(id);
            setLinks(getLessonLinks());
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-80">
            <div className="p-3 border-b bg-indigo-50 flex justify-between items-center">
                <h3 className="font-bold text-indigo-800 flex items-center gap-2 text-sm">
                    <Monitor size={16}/> مكتبة الدروس والعروض
                </h3>
                <button onClick={() => setShowForm(!showForm)} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1">
                    {showForm ? <XCircle size={12}/> : <Plus size={12}/>}
                    {showForm ? 'إلغاء' : 'إضافة'}
                </button>
            </div>
            
            {showForm ? (
                <div className="p-4 bg-slate-50 flex flex-col gap-2 border-b">
                    <input 
                        className="w-full p-2 border rounded text-xs"
                        placeholder="عنوان الدرس (مثال: درس الفاعل)"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        autoFocus
                    />
                    <input 
                        className="w-full p-2 border rounded text-xs dir-ltr text-left"
                        placeholder="رابط العرض (SharePoint/Slides)..."
                        value={newUrl}
                        onChange={e => setNewUrl(e.target.value)}
                    />
                    <button 
                        onClick={handleSave}
                        disabled={!newTitle || !newUrl}
                        className="bg-indigo-600 text-white w-full py-1.5 rounded text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
                    >
                        حفظ الدرس
                    </button>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {filteredLinks.length > 0 ? filteredLinks.map(link => (
                        <div key={link.id} className="flex items-center justify-between p-2 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 group transition-colors">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="bg-indigo-100 p-1.5 rounded text-indigo-600 flex-shrink-0">
                                    <Monitor size={14}/>
                                </div>
                                <div className="truncate">
                                    <div className="text-xs font-bold text-gray-800 truncate">{link.title}</div>
                                    <div className="text-[10px] text-gray-400 truncate dir-ltr text-right">{new URL(link.url).hostname}</div>
                                </div>
                            </div>
                            <button onClick={(e) => handleDelete(link.id, e)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14}/>
                            </button>
                        </div>
                    )) : (
                        <div className="text-center py-10 text-gray-400 text-xs">
                            <Monitor size={32} className="mx-auto mb-2 opacity-20"/>
                            لا توجد دروس محفوظة.<br/>أضف روابط العروض لتظهر في الشاشة.
                        </div>
                    )}
                </div>
            )}
            <div className="px-3 py-2 bg-gray-50 text-[10px] text-gray-400 border-t text-center">
                اختر اسم الدرس في "شاشة العرض" لفتح الرابط مباشرة.
            </div>
        </div>
    );
};

// --- Widget: Mini Timer ---
const MiniTimerWidget: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [duration, setDuration] = useState(300); // 5 mins default
    const [isActive, setIsActive] = useState(false);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            intervalRef.current = window.setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isActive, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const startTimer = (mins: number) => {
        const secs = mins * 60;
        setDuration(secs);
        setTimeLeft(secs);
        setIsActive(true);
    };

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(duration);
    };

    const progress = timeLeft > 0 ? (timeLeft / duration) * 100 : 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-64">
            <div className="p-3 border-b bg-indigo-50 flex justify-between items-center">
                <h3 className="font-bold text-indigo-800 flex items-center gap-2 text-sm">
                    <Clock size={16}/> مؤقت النشاط
                </h3>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50 relative">
                <div className="absolute top-2 right-2 text-xs font-mono text-gray-400">{isActive ? 'جاري...' : 'متوقف'}</div>
                
                <div className="text-5xl font-black text-gray-700 font-mono mb-4 tracking-wider">
                    {formatTime(timeLeft)}
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
                    <div className="bg-indigo-500 h-2 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                </div>

                <div className="flex gap-2 w-full">
                    <button onClick={toggleTimer} className={`flex-1 py-2 rounded-lg text-white font-bold transition-all shadow-sm flex justify-center items-center ${isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}>
                        {isActive ? <Pause size={18}/> : <Play size={18}/>}
                    </button>
                    <button onClick={resetTimer} className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors shadow-sm">
                        <RotateCcw size={18}/>
                    </button>
                </div>

                <div className="flex gap-1 w-full mt-2">
                    <button onClick={() => startTimer(1)} className="flex-1 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-700">1د</button>
                    <button onClick={() => startTimer(5)} className="flex-1 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-700">5د</button>
                    <button onClick={() => startTimer(10)} className="flex-1 py-1 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-600 hover:bg-indigo-50 hover:text-indigo-700">10د</button>
                </div>
            </div>
        </div>
    );
};

// --- Widget: Sound Board ---
const SoundBoardWidget: React.FC = () => {
    // Note: Since we can't bundle MP3s easily in this environment, 
    // we simulate the "Action" with visual feedback. 
    const [playing, setPlaying] = useState<string | null>(null);

    const playSound = (id: string) => {
        setPlaying(id);
        // In a real app, new Audio('/sounds/clap.mp3').play();
        setTimeout(() => setPlaying(null), 1000);
    };

    const sounds = [
        { id: 'clap', label: 'تصفيق', icon: '👏', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
        { id: 'correct', label: 'إجابة صحيحة', icon: '✅', color: 'bg-green-100 text-green-700 border-green-200' },
        { id: 'wrong', label: 'حاول مرة أخرى', icon: '❌', color: 'bg-red-100 text-red-700 border-red-200' },
        { id: 'drum', label: 'طبلة', icon: '🥁', color: 'bg-purple-100 text-purple-700 border-purple-200' },
        { id: 'quiet', label: 'هجوم هادئ', icon: '🤫', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        { id: 'bell', label: 'جرس', icon: '🔔', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-64">
            <div className="p-3 border-b bg-pink-50 flex justify-between items-center">
                <h3 className="font-bold text-pink-800 flex items-center gap-2 text-sm">
                    <Volume2 size={16}/> المؤثرات الصوتية
                </h3>
            </div>
            <div className="flex-1 p-4 grid grid-cols-2 gap-3 bg-pink-50/20">
                {sounds.map(s => (
                    <button 
                        key={s.id}
                        onClick={() => playSound(s.id)}
                        className={`
                            flex flex-col items-center justify-center p-2 rounded-lg border transition-all active:scale-95
                            ${s.color} hover:brightness-95
                            ${playing === s.id ? 'ring-2 ring-offset-1 ring-current scale-95' : ''}
                        `}
                    >
                        <span className="text-2xl mb-1">{s.icon}</span>
                        <span className="text-xs font-bold">{s.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- Widget: Hall Pass ---
const HallPassWidget: React.FC<{ students: Student[], className: string }> = ({ students, className }) => {
    const [passes, setPasses] = useState<HallPass[]>(() => {
        const saved = localStorage.getItem('active_hall_passes');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedStudent, setSelectedStudent] = useState('');
    
    useEffect(() => {
        localStorage.setItem('active_hall_passes', JSON.stringify(passes));
    }, [passes]);

    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000 * 60); 
        return () => clearInterval(interval);
    }, []);

    const handleCheckout = (reason: string) => {
        if (!selectedStudent) return;
        const student = students.find(s => s.id === selectedStudent);
        if (!student) return;

        if (passes.find(p => p.studentId === student.id)) {
            alert('الطالب خارج الفصل بالفعل!');
            return;
        }

        const newPass: HallPass = {
            id: Date.now().toString(),
            studentId: student.id,
            studentName: student.name,
            reason,
            startTime: Date.now()
        };
        setPasses([...passes, newPass]);
        setSelectedStudent('');
    };

    const handleReturn = (id: string) => {
        setPasses(passes.filter(p => p.id !== id));
    };

    const getDuration = (start: number) => {
        const diff = Math.floor((Date.now() - start) / 60000);
        return diff < 1 ? 'الآن' : `${diff} د`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-80">
            <div className="p-3 border-b bg-orange-50 flex justify-between items-center">
                <h3 className="font-bold text-orange-800 flex items-center gap-2 text-sm">
                    <DoorOpen size={16}/> تصريح الخروج
                </h3>
                <span className="bg-orange-200 text-orange-800 text-[10px] px-2 py-0.5 rounded-full font-bold">{passes.length} بالخارج</span>
            </div>
            
            <div className="p-3 bg-gray-50 border-b">
                <div className="flex gap-2 mb-2">
                    <select 
                        className="flex-1 p-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200"
                        value={selectedStudent}
                        onChange={e => setSelectedStudent(e.target.value)}
                    >
                        <option value="">-- اختر الطالب (الحاضرين) --</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleCheckout('دورة مياه')} disabled={!selectedStudent} className="flex-1 bg-white border border-gray-200 text-gray-700 py-1 rounded hover:bg-blue-50 text-[10px] font-bold disabled:opacity-50">💧 مياه</button>
                    <button onClick={() => handleCheckout('العيادة')} disabled={!selectedStudent} className="flex-1 bg-white border border-gray-200 text-gray-700 py-1 rounded hover:bg-red-50 text-[10px] font-bold disabled:opacity-50">🏥 عيادة</button>
                    <button onClick={() => handleCheckout('الإدارة')} disabled={!selectedStudent} className="flex-1 bg-white border border-gray-200 text-gray-700 py-1 rounded hover:bg-purple-50 text-[10px] font-bold disabled:opacity-50">🏢 إدارة</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {passes.length > 0 ? passes.map(pass => (
                    <div key={pass.id} className="flex items-center justify-between p-2 bg-white border border-orange-100 rounded-lg shadow-sm animate-fade-in border-r-4 border-r-orange-400">
                        <div>
                            <div className="font-bold text-gray-800 text-xs">{pass.studentName}</div>
                            <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                                <span className="bg-gray-100 px-1 rounded">{pass.reason}</span>
                                <span className="flex items-center gap-1 text-orange-600 font-bold"><Clock size={10}/> {getDuration(pass.startTime)}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleReturn(pass.id)}
                            className="p-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                            title="تسجيل عودة"
                        >
                            <LogOut size={14} className="transform rotate-180"/>
                        </button>
                    </div>
                )) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                        <DoorOpen size={32} className="mb-2"/>
                        <p className="text-xs">الجميع داخل الفصل</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Widget: Traffic Light ---
const TrafficLightWidget: React.FC = () => {
    const [activeLight, setActiveLight] = useState<'RED' | 'YELLOW' | 'GREEN'>('GREEN');

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-64">
            <div className="p-3 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                    <AlertCircle size={16}/> إشارة الانضباط
                </h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-100">
                <div className="bg-slate-800 p-3 rounded-2xl shadow-xl flex flex-row gap-3 items-center">
                    <button 
                        onClick={() => setActiveLight('RED')}
                        className={`w-12 h-12 rounded-full transition-all duration-300 border-4 border-slate-700 ${activeLight === 'RED' ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] scale-110' : 'bg-red-900 opacity-50'}`}
                        title="صمت تام / عمل فردي"
                    />
                    <button 
                        onClick={() => setActiveLight('YELLOW')}
                        className={`w-12 h-12 rounded-full transition-all duration-300 border-4 border-slate-700 ${activeLight === 'YELLOW' ? 'bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.6)] scale-110' : 'bg-yellow-900 opacity-50'}`}
                        title="همس / عمل ثنائي"
                    />
                    <button 
                        onClick={() => setActiveLight('GREEN')}
                        className={`w-12 h-12 rounded-full transition-all duration-300 border-4 border-slate-700 ${activeLight === 'GREEN' ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)] scale-110' : 'bg-green-900 opacity-50'}`}
                        title="مسموح الكلام / عمل جماعي"
                    />
                </div>
                <div className="mt-4 text-center">
                    <h4 className="font-black text-lg text-slate-700 mb-1">
                        {activeLight === 'RED' && '🔴 صمت تام'}
                        {activeLight === 'YELLOW' && '🟡 همس فقط'}
                        {activeLight === 'GREEN' && '🟢 مسموح النقاش'}
                    </h4>
                </div>
            </div>
        </div>
    )
}

// --- Widget: Quick Poll ---
const QuickPollWidget: React.FC = () => {
    const [counts, setCounts] = useState({ a: 0, b: 0 });
    const total = counts.a + counts.b;
    
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-64">
            <div className="p-3 border-b bg-blue-50 flex justify-between items-center">
                <h3 className="font-bold text-blue-800 flex items-center gap-2 text-sm">
                    <BarChart2 size={16}/> تصويت سريع
                </h3>
                <button onClick={() => setCounts({a:0, b:0})} className="p-1 hover:bg-blue-100 rounded text-blue-600" title="تصفير">
                    <RotateCcw size={14}/>
                </button>
            </div>
            
            <div className="flex-1 flex flex-col p-4">
                <div className="flex gap-3 flex-1">
                    {/* Option A */}
                    <div className="flex-1 bg-green-50 rounded-lg border border-green-100 p-2 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 bg-green-200 transition-all duration-500 opacity-30" style={{ height: `${total ? (counts.a / total) * 100 : 0}%` }}></div>
                        <span className="text-3xl font-black text-green-600 z-10">{counts.a}</span>
                        <h4 className="font-bold text-green-800 text-xs mb-2 z-10">موافق (أ)</h4>
                        <div className="flex gap-1 z-10 w-full">
                            <button onClick={() => setCounts(p => ({...p, a: p.a + 1}))} className="flex-1 h-8 rounded bg-green-500 text-white hover:bg-green-600 shadow text-lg font-bold">+</button>
                        </div>
                    </div>

                    {/* Option B */}
                    <div className="flex-1 bg-red-50 rounded-lg border border-red-100 p-2 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 bg-red-200 transition-all duration-500 opacity-30" style={{ height: `${total ? (counts.b / total) * 100 : 0}%` }}></div>
                        <span className="text-3xl font-black text-red-600 z-10">{counts.b}</span>
                        <h4 className="font-bold text-red-800 text-xs mb-2 z-10">ضد (ب)</h4>
                        <div className="flex gap-1 z-10 w-full">
                            <button onClick={() => setCounts(p => ({...p, b: p.b + 1}))} className="flex-1 h-8 rounded bg-red-500 text-white hover:bg-red-600 shadow text-lg font-bold">+</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Widget: Lesson Notes ---
const LessonNoteWidget: React.FC<{ className: string, subject?: string }> = ({ className, subject }) => {
    const [notes, setNotes] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('class_lesson_notes');
        return saved ? JSON.parse(saved) : {};
    });
    const [currentNote, setCurrentNote] = useState('');
    const [saved, setSaved] = useState(false);
    
    // Key combines class and subject if subject exists
    const noteKey = subject ? `${className}_${subject}` : className;

    useEffect(() => {
        if(noteKey) {
            setCurrentNote(notes[noteKey] || '');
        }
    }, [noteKey, notes]);

    const handleSave = () => {
        const updated = { ...notes, [noteKey]: currentNote };
        setNotes(updated);
        localStorage.setItem('class_lesson_notes', JSON.stringify(updated));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 overflow-hidden flex flex-col h-80 relative">
            <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-100 border-b border-l border-yellow-300 rounded-bl-xl z-10 shadow-sm"></div>
            
            <div className="p-3 border-b border-yellow-100 flex justify-between items-center pt-4">
                <h3 className="font-bold text-yellow-800 flex items-center gap-2 text-sm">
                    <StickyNote size={16}/> سبورة الملاحظات (تظهر للطلاب)
                </h3>
                {saved && <span className="text-[10px] text-green-700 font-bold bg-green-100 px-2 rounded">تم الحفظ</span>}
            </div>
            
            <textarea 
                className="flex-1 bg-transparent p-4 outline-none text-gray-700 leading-relaxed resize-none text-sm font-medium"
                placeholder="أكتب هنا ملاحظات الدرس... (مثال: توقفنا عند ص 45، واجب تمرين 3...)"
                value={currentNote}
                onChange={e => setCurrentNote(e.target.value)}
                onBlur={handleSave}
            />
        </div>
    );
};

// --- Sub-Component: Seating Chart (Refined) ---
const SeatingChart: React.FC<{ students: Student[], performance: PerformanceRecord[], onSaveSeating?: (students: Student[]) => void, preSelectedClass?: string }> = ({ students, performance, onSaveSeating, preSelectedClass }) => {
    const [selectedClass, setSelectedClass] = useState(preSelectedClass || '');
    const [layoutCols, setLayoutCols] = useState(5);
    const [selectedForSwap, setSelectedForSwap] = useState<string | null>(null);
    const [localStudents, setLocalStudents] = useState<Student[]>([]);
    const [arrangeMode, setArrangeMode] = useState<string>('ALPHA');
    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');

    useEffect(() => {
        if(preSelectedClass) setSelectedClass(preSelectedClass);
    }, [preSelectedClass]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        students.forEach(s => s.className && classes.add(s.className));
        return Array.from(classes).sort();
    }, [students]);

    useEffect(() => {
        if(uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]);
    }, [uniqueClasses]);

    useEffect(() => {
        const classStudents = students.filter(s => s.className === selectedClass);
        const mapped = classStudents.map((s, idx) => ({
            ...s,
            seatIndex: s.seatIndex !== undefined ? s.seatIndex : idx
        }));
        setLocalStudents(mapped);
    }, [selectedClass, students]);

    const totalSeats = Math.max(localStudents.length, 20);
    const gridCells = Array.from({ length: totalSeats }, (_, i) => i);

    const getStudentAtSeat = (index: number) => {
        return localStudents.find(s => s.seatIndex === index);
    };

    const getStudentAverage = (studentId: string) => {
        const myPerf = performance.filter(p => p.studentId === studentId);
        if (myPerf.length === 0) return 0;
        const total = myPerf.reduce((sum, p) => sum + (p.score / p.maxScore), 0);
        return total / myPerf.length;
    };

    const handleSeatClick = (index: number) => {
        if (selectedForSwap === null) {
            const student = getStudentAtSeat(index);
            if (student) setSelectedForSwap(student.id);
        } else {
            const student1 = localStudents.find(s => s.id === selectedForSwap);
            const student2 = getStudentAtSeat(index);

            if (!student1) { setSelectedForSwap(null); return; }

            const newStudents = [...localStudents];
            const s1Index = newStudents.findIndex(s => s.id === student1.id);
            newStudents[s1Index] = { ...student1, seatIndex: index };

            if (student2) {
                const s2Index = newStudents.findIndex(s => s.id === student2.id);
                newStudents[s2Index] = { ...student2, seatIndex: student1.seatIndex };
            }

            setLocalStudents(newStudents);
            setSelectedForSwap(null);
        }
    };

    const handleSmartArrange = (type: string) => {
        setArrangeMode(type);
        let sorted: Student[] = [...localStudents];

        if (type === 'ALPHA') {
            sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        } else if (type === 'LEVEL') {
            sorted.sort((a, b) => getStudentAverage(b.id) - getStudentAverage(a.id));
        } else if (type === 'RANDOM') {
            sorted.sort(() => Math.random() - 0.5);
        }

        // Reassign seat indices
        const arranged = sorted.map((s, idx) => ({ ...s, seatIndex: idx }));
        setLocalStudents(arranged);
    };

    const handleSave = () => {
        setSaveStatus('SAVING');
        if (onSaveSeating) {
            onSaveSeating(localStudents);
            setSaveStatus('SUCCESS');
            setTimeout(() => setSaveStatus('IDLE'), 2000);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-600">ترتيب تلقائي:</span>
                    <button onClick={() => handleSmartArrange('ALPHA')} className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${arrangeMode === 'ALPHA' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white hover:bg-gray-100'}`}>أبجدي</button>
                    <button onClick={() => handleSmartArrange('LEVEL')} className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${arrangeMode === 'LEVEL' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white hover:bg-gray-100'}`}>حسب المستوى</button>
                    <button onClick={() => handleSmartArrange('RANDOM')} className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${arrangeMode === 'RANDOM' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white hover:bg-gray-100'}`}>عشوائي</button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-600">الأعمدة:</span>
                        <input type="number" min="2" max="10" value={layoutCols} onChange={(e) => setLayoutCols(Number(e.target.value))} className="w-12 p-1 border rounded text-center text-sm font-bold"/>
                    </div>
                    <button 
                        onClick={handleSave} 
                        className={`px-6 py-2 rounded-lg font-bold text-white text-sm flex items-center gap-2 transition-all ${saveStatus === 'SUCCESS' ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                        {saveStatus === 'SAVING' ? <Loader2 className="animate-spin" size={16}/> : saveStatus === 'SUCCESS' ? <CheckCircle size={16}/> : <Save size={16}/>}
                        {saveStatus === 'SUCCESS' ? 'تم الحفظ' : 'حفظ الترتيب'}
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-8 bg-slate-100 flex justify-center">
                <div 
                    className="grid gap-4 w-full max-w-5xl"
                    style={{ gridTemplateColumns: `repeat(${layoutCols}, minmax(0, 1fr))` }}
                >
                    {gridCells.map(index => {
                        const student = getStudentAtSeat(index);
                        const isSelected = selectedForSwap === (student?.id || `empty-${index}`); 
                        // Logic: selectedForSwap stores student ID.
                        
                        return (
                            <div 
                                key={index}
                                onClick={() => handleSeatClick(index)}
                                className={`
                                    aspect-video rounded-xl border-2 flex flex-col items-center justify-center p-2 cursor-pointer transition-all shadow-sm relative
                                    ${student ? 'bg-white border-gray-300 hover:border-purple-400' : 'bg-gray-50 border-dashed border-gray-300 hover:bg-white'}
                                    ${selectedForSwap === student?.id && student ? 'ring-4 ring-purple-400 border-purple-500 scale-105 z-10' : ''}
                                `}
                            >
                                <div className="absolute top-2 left-2 text-[10px] text-gray-400 font-mono">{index + 1}</div>
                                {student ? (
                                    <>
                                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold mb-2">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div className="text-sm font-bold text-center leading-tight text-gray-800">{student.name}</div>
                                        {performance.length > 0 && (
                                            <div className="mt-1 text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                                                {Math.round(getStudentAverage(student.id) * 100)}%
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-gray-300 text-xs">فارغ</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ClassroomManager;
