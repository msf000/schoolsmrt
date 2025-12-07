
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, Subject, ScheduleItem, TeacherAssignment, SystemUser, PerformanceRecord } from '../types';
import { MonitorPlay, Grid, LayoutGrid, CheckSquare, Maximize, RotateCcw, Save, Shuffle, ArrowDownUp, Clock, StickyNote, DoorOpen, AlertCircle, BarChart2, Trash2, Play, Pause, Volume2, CalendarCheck, BookOpen, Calendar, Monitor, Plus, XCircle, User, X } from 'lucide-react';
import Attendance from './Attendance';
import { getSubjects, getSchedules, getTeacherAssignments, getLessonLinks, saveLessonLink, deleteLessonLink, updateStudent } from '../services/storageService';

// --- WIDGET IMPLEMENTATIONS ---

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
            <div className="px-3 py-1 bg-green-50 text-green-700 flex flex-col items-center"><span className="font-bold">{stats.present}</span><span className="text-[10px]">حضور</span></div>
            <div className="px-3 py-1 bg-red-50 text-red-700 flex flex-col items-center"><span className="font-bold">{stats.absent}</span><span className="text-[10px]">غياب</span></div>
            <div className="px-3 py-1 bg-yellow-50 text-yellow-700 flex flex-col items-center"><span className="font-bold">{stats.late}</span><span className="text-[10px]">تأخر</span></div>
        </div>
    );
};

const LessonLibraryWidget: React.FC<{ currentUser?: SystemUser | null }> = ({ currentUser }) => {
    const [links, setLinks] = useState<any[]>([]); 
    const [newTitle, setNewTitle] = useState('');
    const [newUrl, setNewUrl] = useState('');
    const [showForm, setShowForm] = useState(false);

    useEffect(() => setLinks(getLessonLinks()), []);

    const filteredLinks = useMemo(() => {
        if (!links) return [];
        if (!currentUser || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'SCHOOL_MANAGER') return links;
        // FIX: Include links without teacherId (legacy)
        return links.filter(l => l.teacherId === currentUser.id || !l.teacherId);
    }, [links, currentUser]);

    const handleSave = () => {
        if (!newTitle || !newUrl) return;
        saveLessonLink({ id: Date.now().toString(), title: newTitle, url: newUrl, teacherId: currentUser?.id, createdAt: new Date().toISOString() });
        setLinks(getLessonLinks());
        setNewTitle(''); setNewUrl(''); setShowForm(false);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(confirm('حذف هذا الدرس؟')) { deleteLessonLink(id); setLinks(getLessonLinks()); }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-80">
            <div className="p-3 border-b bg-indigo-50 flex justify-between items-center">
                <h3 className="font-bold text-indigo-800 flex items-center gap-2 text-sm"><Monitor size={16}/> مكتبة الدروس</h3>
                <button onClick={() => setShowForm(!showForm)} className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 flex items-center gap-1">{showForm ? <XCircle size={12}/> : <Plus size={12}/>} {showForm ? 'إلغاء' : 'إضافة'}</button>
            </div>
            {showForm ? (
                <div className="p-4 bg-slate-50 flex flex-col gap-2 border-b">
                    <input className="w-full p-2 border rounded text-xs" placeholder="عنوان الدرس" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus/>
                    <input className="w-full p-2 border rounded text-xs dir-ltr text-left" placeholder="رابط العرض..." value={newUrl} onChange={e => setNewUrl(e.target.value)}/>
                    <button onClick={handleSave} disabled={!newTitle || !newUrl} className="bg-indigo-600 text-white w-full py-1.5 rounded text-xs font-bold hover:bg-indigo-700 disabled:opacity-50">حفظ الدرس</button>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {filteredLinks.length > 0 ? filteredLinks.map(link => (
                        <div key={link.id} className="flex items-center justify-between p-2 hover:bg-indigo-50 rounded border border-transparent hover:border-indigo-100 group transition-colors">
                            <div className="flex items-center gap-2 overflow-hidden">
                                <div className="bg-indigo-100 p-1.5 rounded text-indigo-600 flex-shrink-0"><Monitor size={14}/></div>
                                <div className="truncate"><div className="text-xs font-bold text-gray-800 truncate">{link.title}</div></div>
                            </div>
                            <button onClick={(e) => handleDelete(link.id, e)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                        </div>
                    )) : (
                        <div className="text-center py-10 text-gray-400 text-xs">لا توجد دروس محفوظة.</div>
                    )}
                </div>
            )}
        </div>
    );
};

const MiniTimerWidget = () => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [isActive, setIsActive] = useState(false);
    useEffect(() => {
        let interval: any;
        if (isActive && timeLeft > 0) interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
        else if (timeLeft === 0) setIsActive(false);
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-64">
            <div className="p-3 border-b bg-indigo-50"><h3 className="font-bold text-indigo-800 flex items-center gap-2 text-sm"><Clock size={16}/> مؤقت النشاط</h3></div>
            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50">
                <div className="text-5xl font-black text-gray-700 font-mono mb-4">{Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{ (timeLeft % 60).toString().padStart(2, '0')}</div>
                <div className="flex gap-2 w-full"><button onClick={() => setIsActive(!isActive)} className="flex-1 py-2 rounded-lg text-white font-bold bg-green-600">{isActive ? <Pause size={18}/> : <Play size={18}/>}</button><button onClick={() => {setIsActive(false); setTimeLeft(300)}} className="px-4 py-2 rounded-lg bg-white border"><RotateCcw size={18}/></button></div>
                <div className="flex gap-1 w-full mt-2"><button onClick={() => setTimeLeft(300)} className="flex-1 py-1 bg-white border rounded text-[10px]">5د</button><button onClick={() => setTimeLeft(600)} className="flex-1 py-1 bg-white border rounded text-[10px]">10د</button></div>
            </div>
        </div>
    );
};

const SoundBoardWidget = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-64">
        <div className="p-3 border-b bg-pink-50"><h3 className="font-bold text-pink-800 flex items-center gap-2 text-sm"><Volume2 size={16}/> المؤثرات</h3></div>
        <div className="flex-1 p-4 grid grid-cols-2 gap-3 bg-pink-50/20">
            {['👏 تصفيق', '✅ صحيح', '❌ خطأ', '🔔 جرس'].map(s => <button key={s} className="bg-white border rounded hover:bg-pink-50 text-xs font-bold py-2">{s}</button>)}
        </div>
    </div>
);

const HallPassWidget: React.FC<{ students: Student[], className: string }> = ({ students }) => {
    const [passes, setPasses] = useState<{id: string, studentId: string, name: string, startTime: number}[]>([]);
    const [selectedStudent, setSelectedStudent] = useState('');

    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 60000); 
        return () => clearInterval(timer);
    }, []);

    const issuePass = () => {
        if (!selectedStudent || !students) return;
        const student = students.find(s => s.id === selectedStudent);
        if (student) {
            setPasses(prev => [...prev, {
                id: Date.now().toString(),
                studentId: student.id,
                name: student.name,
                startTime: Date.now()
            }]);
            setSelectedStudent('');
        }
    };

    const returnPass = (id: string) => {
        setPasses(prev => prev.filter(p => p.id !== id));
    };

    const formatDuration = (start: number) => {
        const mins = Math.floor((Date.now() - start) / 60000);
        return mins + 'د';
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-80">
            <div className="p-3 border-b bg-orange-50"><h3 className="font-bold text-orange-800 flex items-center gap-2 text-sm"><DoorOpen size={16}/> تصريح الخروج</h3></div>
            
            <div className="p-3 border-b flex gap-2">
                <select 
                    className="flex-1 text-xs border rounded p-1.5"
                    value={selectedStudent}
                    onChange={e => setSelectedStudent(e.target.value)}
                >
                    <option value="">اختر الطالب...</option>
                    {students && students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={issuePass} disabled={!selectedStudent} className="bg-orange-500 text-white px-3 rounded text-xs font-bold disabled:opacity-50">خروج</button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {passes.length > 0 ? passes.map(pass => (
                    <div key={pass.id} className="bg-orange-50 border border-orange-200 rounded p-2 flex justify-between items-center animate-fade-in">
                        <div>
                            <span className="font-bold text-xs block text-orange-900">{pass.name}</span>
                            <span className="text-[10px] text-orange-700 flex items-center gap-1"><Clock size={10}/> منذ {formatDuration(pass.startTime)}</span>
                        </div>
                        <button onClick={() => returnPass(pass.id)} className="bg-white text-orange-600 border border-orange-200 text-[10px] px-2 py-1 rounded hover:bg-orange-100">عودة</button>
                    </div>
                )) : (
                    <div className="text-center text-gray-400 text-xs py-8 opacity-50">لا يوجد طلاب خارج الفصل</div>
                )}
            </div>
        </div>
    );
};

const TrafficLightWidget = () => {
    const [light, setLight] = useState<'RED'|'YELLOW'|'GREEN'>('GREEN');

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-64">
            <div className="p-3 border-b bg-slate-50"><h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm"><AlertCircle size={16}/> إشارة الانضباط</h3></div>
            <div className="flex-1 flex items-center justify-center gap-4 bg-slate-100">
                <div 
                    onClick={() => setLight('RED')}
                    className={`w-12 h-12 rounded-full border-4 border-slate-700 cursor-pointer transition-all duration-300 shadow-xl ${light === 'RED' ? 'bg-red-600 scale-110 shadow-red-500/50' : 'bg-red-900 opacity-30'}`}
                ></div>
                <div 
                    onClick={() => setLight('YELLOW')}
                    className={`w-12 h-12 rounded-full border-4 border-slate-700 cursor-pointer transition-all duration-300 shadow-xl ${light === 'YELLOW' ? 'bg-yellow-400 scale-110 shadow-yellow-500/50' : 'bg-yellow-900 opacity-30'}`}
                ></div>
                <div 
                    onClick={() => setLight('GREEN')}
                    className={`w-12 h-12 rounded-full border-4 border-slate-700 cursor-pointer transition-all duration-300 shadow-xl ${light === 'GREEN' ? 'bg-green-500 scale-110 shadow-green-500/50' : 'bg-green-900 opacity-30'}`}
                ></div>
            </div>
            <div className="bg-white p-2 text-center text-xs font-bold border-t text-gray-500">
                الحالة: <span className={light === 'RED' ? 'text-red-600' : light === 'YELLOW' ? 'text-yellow-600' : 'text-green-600'}>
                    {light === 'RED' ? 'توقف / صمت' : light === 'YELLOW' ? 'انتباه' : 'مسموح'}
                </span>
            </div>
        </div>
    );
};

const QuickPollWidget = () => {
    const [votes, setVotes] = useState({ A: 0, B: 0, C: 0 });
    
    const vote = (opt: 'A'|'B'|'C') => setVotes(prev => ({ ...prev, [opt]: prev[opt] + 1 }));
    const reset = () => setVotes({ A: 0, B: 0, C: 0 });
    const total = votes.A + votes.B + votes.C;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-64">
            <div className="p-3 border-b bg-blue-50 flex justify-between items-center">
                <h3 className="font-bold text-blue-800 flex items-center gap-2 text-sm"><BarChart2 size={16}/> تصويت سريع</h3>
                <button onClick={reset} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><RotateCcw size={14}/></button>
            </div>
            <div className="flex-1 flex flex-col p-4 gap-3">
                <div className="flex gap-2 h-full items-end">
                    {['A', 'B', 'C'].map((opt) => {
                        const count = votes[opt as keyof typeof votes];
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        return (
                            <div key={opt} className="flex-1 flex flex-col justify-end h-full gap-1">
                                <div className="text-center text-xs font-bold text-gray-500">{count}</div>
                                <div 
                                    className={`w-full rounded-t-lg transition-all duration-500 ${opt === 'A' ? 'bg-blue-500' : opt === 'B' ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ height: `${Math.max(10, pct)}%` }}
                                ></div>
                                <button 
                                    onClick={() => vote(opt as any)}
                                    className="w-full py-1 border rounded text-xs font-bold hover:bg-gray-50"
                                >
                                    {opt}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

const LessonNoteWidget: React.FC<{ className: string, subject?: string }> = ({ className, subject }) => {
    const [note, setNote] = useState(() => localStorage.getItem(`note_${className}`) || '');
    
    const handleChange = (val: string) => {
        setNote(val);
        localStorage.setItem(`note_${className}`, val);
    };

    return (
        <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 overflow-hidden flex flex-col h-80 relative">
            <div className="p-3 border-b border-yellow-100"><h3 className="font-bold text-yellow-800 flex items-center gap-2 text-sm"><StickyNote size={16}/> ملاحظات</h3></div>
            <textarea 
                className="flex-1 bg-transparent p-4 outline-none text-sm resize-none" 
                placeholder="أكتب ملاحظات الدرس..."
                value={note}
                onChange={e => handleChange(e.target.value)}
            />
        </div>
    );
};

const SeatingChart: React.FC<{ students: Student[], onSaveSeating?: (s: Student[]) => void, preSelectedClass?: string }> = ({ students, onSaveSeating, preSelectedClass }) => {
    const [rows] = useState(5);
    const [cols] = useState(5);
    const [assignedSeats, setAssignedSeats] = useState<Record<string, string>>({}); 
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    useEffect(() => {
        const initialSeats: Record<string, string> = {};
        if (students) {
            students.forEach(s => {
                if (s.seatIndex !== undefined && s.seatIndex >= 0) {
                    const r = Math.floor(s.seatIndex / cols);
                    const c = s.seatIndex % cols;
                    initialSeats[`${r}-${c}`] = s.id;
                }
            });
        }
        setAssignedSeats(initialSeats);
    }, [students, cols]);

    const handleSeatClick = (r: number, c: number) => {
        const key = `${r}-${c}`;
        
        if (selectedStudentId) {
            const newSeats = { ...assignedSeats };
            Object.keys(newSeats).forEach(k => {
                if (newSeats[k] === selectedStudentId) delete newSeats[k];
            });
            newSeats[key] = selectedStudentId;
            setAssignedSeats(newSeats);
            setSelectedStudentId(null);
        } else if (assignedSeats[key]) {
            setSelectedStudentId(assignedSeats[key]);
        }
    };

    const handleSave = () => {
        if (!onSaveSeating || !students) return;
        const updatedStudents = students.map(s => {
            const seatKey = Object.keys(assignedSeats).find(k => assignedSeats[k] === s.id);
            if (seatKey) {
                const [r, c] = seatKey.split('-').map(Number);
                return { ...s, seatIndex: r * cols + c };
            } else {
                return { ...s, seatIndex: -1 }; 
            }
        });
        onSaveSeating(updatedStudents);
        alert('تم حفظ ترتيب المقاعد!');
    };

    const handleAutoArrange = () => {
        if (!students) return;
        const shuffled = [...students].sort(() => 0.5 - Math.random());
        const newSeats: Record<string, string> = {};
        shuffled.forEach((s, idx) => {
            if (idx < rows * cols) {
                const r = Math.floor(idx / cols);
                const c = idx % cols;
                newSeats[`${r}-${c}`] = s.id;
            }
        });
        setAssignedSeats(newSeats);
    };

    const unassignedStudents = students ? students.filter(s => !Object.values(assignedSeats).includes(s.id)) : [];

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 flex items-center gap-2"><Grid size={18}/> مخطط الجلوس - {preSelectedClass}</h3>
                <div className="flex gap-2">
                    <button onClick={handleAutoArrange} className="px-3 py-1.5 bg-white border rounded hover:bg-gray-50 text-sm font-bold flex items-center gap-1"><Shuffle size={14}/> ترتيب عشوائي</button>
                    <button onClick={handleSave} className="px-4 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-bold flex items-center gap-1"><Save size={14}/> حفظ الترتيب</button>
                </div>
            </div>
            
            <div className="flex-1 p-6 flex flex-col md:flex-row gap-6 overflow-hidden">
                <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 p-8 flex items-center justify-center overflow-auto relative">
                    <div className="absolute top-2 bg-slate-300 text-slate-600 px-4 py-1 rounded-full text-xs font-bold shadow-sm">السبورة / الشاشة</div>
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                        {Array.from({ length: rows }).map((_, r) => (
                            Array.from({ length: cols }).map((_, c) => {
                                const key = `${r}-${c}`;
                                const studentId = assignedSeats[key];
                                const student = students && students.find(s => s.id === studentId);
                                const isSelected = studentId === selectedStudentId;

                                return (
                                    <div 
                                        key={key}
                                        onClick={() => handleSeatClick(r, c)}
                                        className={`
                                            w-16 h-16 md:w-24 md:h-24 rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all shadow-sm
                                            ${student ? (isSelected ? 'bg-purple-100 border-purple-500 scale-105' : 'bg-white border-purple-200 hover:border-purple-300') : 'bg-slate-50 border-dashed border-slate-300 hover:bg-white'}
                                        `}
                                    >
                                        {student ? (
                                            <>
                                                <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold mb-1">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <span className="text-[10px] md:text-xs text-center font-bold text-gray-700 line-clamp-1 w-full px-1">{student.name}</span>
                                            </>
                                        ) : (
                                            <span className="text-slate-300 text-xs">{r+1}-{c+1}</span>
                                        )}
                                    </div>
                                );
                            })
                        ))}
                    </div>
                </div>

                <div className="w-full md:w-64 bg-gray-50 border-l border-gray-200 flex flex-col">
                    <div className="p-3 border-b font-bold text-sm text-gray-600">طلاب غير معينين ({unassignedStudents.length})</div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {unassignedStudents.length > 0 ? unassignedStudents.map(s => (
                            <div 
                                key={s.id}
                                onClick={() => setSelectedStudentId(s.id === selectedStudentId ? null : s.id)}
                                className={`p-2 rounded border cursor-pointer text-sm flex items-center gap-2 ${selectedStudentId === s.id ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-gray-200 hover:bg-gray-100'}`}
                            >
                                <User size={14}/> {s.name}
                            </div>
                        )) : <div className="text-center text-gray-400 text-xs py-4">جميع الطلاب في مقاعدهم</div>}
                    </div>
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
    onSaveSeating?: (students: Student[]) => void;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ 
    students, 
    attendance, 
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
    const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([]);

    const uniqueClasses = useMemo(() => {
        if (!students) return [];
        const classes = new Set<string>();
        students.forEach(s => s.className && classes.add(s.className));
        return Array.from(classes).sort();
    }, [students]);

    useEffect(() => {
        // FIX: Fetch subjects including legacy/global ones
        const loadedSubjects = getSubjects(currentUser?.id);
        setSubjects(loadedSubjects);
        setSchedules(getSchedules());
        setTeacherAssignments(getTeacherAssignments());
        
        if(uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]);
        if(loadedSubjects.length > 0 && !selectedSubject) setSelectedSubject(loadedSubjects[0].name);
    }, [uniqueClasses, currentUser]);

    const classStudents = useMemo(() => {
        if (!students) return [];
        return students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
    }, [students, selectedClass]);

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

    const dailyClassSchedule = useMemo(() => {
        if (!selectedClass || !effectiveDate) return [];
        const dateObj = new Date(effectiveDate);
        const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const currentDay = dayMap[dateObj.getDay()];

        const classSched = schedules.filter(s => s.classId === selectedClass && s.day === currentDay);

        if (currentUser && currentUser.role === 'TEACHER') {
             return classSched.filter(s => {
                 // FIX: Allow if teacher matches OR if schedule has no teacher (orphan/legacy)
                 return (s.teacherId === currentUser.id || !s.teacherId) || 
                        teacherAssignments.find(ta => ta.classId === s.classId && ta.subjectName === s.subjectName)?.teacherId === currentUser.id;
             }).sort((a,b) => a.period - b.period);
        }
        return classSched.sort((a,b) => a.period - b.period);
    }, [schedules, teacherAssignments, selectedClass, effectiveDate, currentUser]);

    const handleUpdateSeating = (updatedStudents: Student[]) => {
        updatedStudents.forEach(s => updateStudent(s)); 
    };

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
                        <div className="bg-white p-1 rounded-lg border shadow-sm flex items-center gap-2">
                            <div className="px-3 py-1 bg-purple-50 rounded text-purple-700 font-bold text-sm border border-purple-100 flex items-center gap-1">
                                <Calendar size={14}/> {getDayName(effectiveDate)}
                            </div>
                            <input type="date" value={effectiveDate} onChange={(e) => handleDateChange(e.target.value)} className="p-1 font-bold text-gray-700 outline-none cursor-pointer bg-transparent text-sm" />
                        </div>

                        {selectedClass && (
                        <AttendanceStatsWidget students={classStudents} attendance={attendance} date={effectiveDate} />
                        )}

                        <div className="flex gap-2">
                            <div className="bg-white p-1 rounded-lg border shadow-sm flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 px-2 flex items-center gap-1"><Grid size={14}/> الفصل:</span>
                                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-1 font-bold text-primary outline-none cursor-pointer bg-transparent text-sm">
                                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="bg-white p-1 rounded-lg border shadow-sm flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500 px-2 flex items-center gap-1"><BookOpen size={14}/> المادة:</span>
                                <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="p-1 font-bold text-purple-600 outline-none cursor-pointer bg-transparent text-sm">
                                    {subjects.length > 0 ? subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>) : <option value="عام">عام</option>}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

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
                <button onClick={() => setActiveTab('TOOLS')} className={`pb-3 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${activeTab === 'TOOLS' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}>
                    <LayoutGrid className="inline-block ml-2" size={16}/> لوحة القيادة
                </button>
                <button onClick={() => setActiveTab('ATTENDANCE')} className={`pb-3 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${activeTab === 'ATTENDANCE' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}>
                    <CalendarCheck className="inline-block ml-2" size={16}/> تحضير الطلاب
                </button>
                <button onClick={() => setActiveTab('SEATING')} className={`pb-3 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${activeTab === 'SEATING' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}>
                    <Grid className="inline-block ml-2" size={16}/> مخطط الجلوس
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'TOOLS' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div onClick={onLaunchScreen} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white cursor-pointer hover:scale-[1.02] transition-transform shadow-lg group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                                <div className="relative z-10">
                                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors"><Maximize size={20} className="text-yellow-400"/></div>
                                    <h3 className="font-bold text-lg mb-1">الشاشة التفاعلية</h3>
                                    <p className="text-gray-400 text-xs mb-3">سبورة ذكية: مؤقت، قرعة، مجموعات.</p>
                                    <span className="text-yellow-400 text-xs font-bold flex items-center gap-1">تشغيل <MonitorPlay size={12}/></span>
                                </div>
                            </div>
                            <div onClick={() => setActiveTab('ATTENDANCE')} className="bg-white rounded-xl p-6 border border-gray-200 cursor-pointer hover:border-green-400 hover:shadow-md transition-all group">
                                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-100 transition-colors"><CheckSquare size={20} className="text-green-600"/></div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">سجل السلوك والحضور</h3>
                                <p className="text-gray-500 text-xs mb-3">رصد سريع للمخالفات والغياب لمادة <b>{selectedSubject}</b>.</p>
                                <span className="text-green-600 text-xs font-bold flex items-center gap-1">فتح السجل <ArrowDownUp size={12}/></span>
                            </div>
                            <div onClick={() => setActiveTab('SEATING')} className="bg-white rounded-xl p-6 border border-gray-200 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all group">
                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors"><Grid size={20} className="text-purple-600"/></div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">ترتيب المقاعد</h3>
                                <p className="text-gray-500 text-xs mb-3">توزيع الطلاب وتغيير أماكنهم.</p>
                                <span className="text-purple-600 text-xs font-bold flex items-center gap-1">تعديل <ArrowDownUp size={12}/></span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="space-y-6">
                                <TrafficLightWidget />
                                <MiniTimerWidget />
                            </div>
                            <div className="space-y-6">
                                <LessonLibraryWidget currentUser={currentUser} />
                                <QuickPollWidget />
                                <SoundBoardWidget />
                            </div>
                            <div className="space-y-6">
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
                        currentUser={currentUser}
                    />
                )}

                {activeTab === 'SEATING' && (
                    <SeatingChart 
                        students={classStudents} 
                        onSaveSeating={handleUpdateSeating} 
                        preSelectedClass={selectedClass} 
                    />
                )}
            </div>
        </div>
    );
};

export default ClassroomManager;
