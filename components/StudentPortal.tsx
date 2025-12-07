
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, ScheduleItem, Teacher, TeacherAssignment } from '../types';
import { updateStudent, saveAttendance, getSubjects, getAssignments, getSchedules, getTeacherAssignments, getTeachers } from '../services/storageService';
import { User, Calendar, Award, LogOut, Lock, Upload, FileText, CheckCircle, AlertTriangle, Smile, Frown, X, Menu, TrendingUp, Calculator, Activity as ActivityIcon, BookOpen, CheckSquare, ExternalLink, Clock, MapPin } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface StudentPortalProps {
    currentUser: Student;
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    onLogout: () => void;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ currentUser, attendance, performance, onLogout }) => {
    // Restore last view from session storage or default
    const [view, setView] = useState<'PROFILE' | 'ATTENDANCE' | 'EVALUATION' | 'TIMETABLE'>(() => {
        const saved = sessionStorage.getItem('student_last_view');
        return (saved === 'PROFILE' || saved === 'ATTENDANCE' || saved === 'EVALUATION' || saved === 'TIMETABLE') ? saved : 'EVALUATION';
    });
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        sessionStorage.setItem('student_last_view', view);
    }, [view]);

    const navItems = [
        { id: 'EVALUATION', label: 'تقييمي (المتابعة الفردية)', icon: Award },
        { id: 'TIMETABLE', label: 'الجدول الدراسي', icon: Clock },
        { id: 'ATTENDANCE', label: 'سجل الحضور والأعذار', icon: Calendar },
        { id: 'PROFILE', label: 'الملف الشخصي', icon: User },
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden text-right font-sans" dir="rtl">
            {/* Sidebar Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-l border-gray-200 shadow-sm z-30">
                <div className="p-6 border-b border-gray-100 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg ring-4 ring-teal-50">
                        {currentUser.name.charAt(0)}
                    </div>
                    <h1 className="text-lg font-bold text-gray-800 text-center">{currentUser.name}</h1>
                    <p className="text-xs text-gray-500 font-medium">{currentUser.className}</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setView(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                                view === item.id 
                                    ? 'bg-teal-50 text-teal-700 font-bold border border-teal-100 shadow-sm' 
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <item.icon size={20} />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t">
                    <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium">
                        <LogOut size={20} /> <span>تسجيل الخروج</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Menu Overlay (Fixed) */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col animate-slide-in-right" onClick={e => e.stopPropagation()}>
                        <div className="p-6 flex justify-between items-center border-b bg-teal-600 text-white">
                            <h1 className="text-xl font-bold">بوابة الطالب</h1>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-white/20 rounded-full"><X size={24} /></button>
                        </div>
                        <div className="p-4 border-b bg-teal-50 flex items-center gap-3">
                             <div className="w-10 h-10 bg-teal-200 rounded-full flex items-center justify-center text-teal-800 font-bold">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-gray-800">{currentUser.name}</p>
                                <p className="text-xs text-gray-500">{currentUser.className}</p>
                            </div>
                        </div>
                        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                            {navItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => { setView(item.id as any); setIsMobileMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        view === item.id ? 'bg-teal-100 text-teal-800 font-bold shadow-sm' : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <item.icon size={20} />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 border-t mt-2 hover:bg-red-50 rounded-xl transition-colors">
                                <LogOut size={20} /> <span>تسجيل الخروج</span>
                            </button>
                        </nav>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden w-full h-full relative">
                <header className="md:hidden bg-white p-4 border-b flex justify-between items-center shadow-sm z-20 shrink-0">
                    <div className="font-bold text-gray-800 flex items-center gap-2">
                        <Award className="text-teal-600"/> بوابة الطالب
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu size={24}/>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 bg-slate-50 custom-scrollbar w-full">
                    {view === 'PROFILE' && <StudentProfile student={currentUser} />}
                    {view === 'ATTENDANCE' && <StudentAttendanceView student={currentUser} attendance={attendance} />}
                    {view === 'EVALUATION' && <StudentEvaluationView student={currentUser} performance={performance} attendance={attendance} />}
                    {view === 'TIMETABLE' && <StudentTimetable student={currentUser} />}
                </main>
            </div>
        </div>
    );
};

// --- Helper for Date Stacking ---
const VerticalDate = ({ dateStr }: { dateStr: string }) => {
    const fullDate = formatDualDate(dateStr);
    const [gregorian, hijri] = fullDate.split('|');
    
    return (
        <div className="flex flex-col items-center leading-tight">
            <span className="font-bold text-gray-800 text-[11px] md:text-xs">{gregorian?.trim()}</span>
            <span className="text-gray-400 text-[9px] md:text-[10px] mt-0.5">{hijri?.trim()}</span>
        </div>
    );
};

// --- SUB-COMPONENTS ---

const StudentProfile = ({ student }: { student: Student }) => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [msg, setMsg] = useState('');

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 4) {
            setMsg('❌ كلمة المرور قصيرة جداً');
            return;
        }
        if (newPassword !== confirmPassword) {
            setMsg('❌ كلمات المرور غير متطابقة');
            return;
        }

        const updated = { ...student, password: newPassword };
        updateStudent(updated);
        setMsg('✅ تم تغيير كلمة المرور بنجاح');
        setNewPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">الملف الشخصي</h2>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                        <User size={40} className="text-gray-400"/>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">{student.name}</h3>
                        <p className="text-gray-500 font-mono">{student.nationalId}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div>
                        <label className="block text-gray-500 mb-1">الصف</label>
                        <div className="font-bold text-gray-800">{student.gradeLevel}</div>
                    </div>
                    <div>
                        <label className="block text-gray-500 mb-1">الفصل</label>
                        <div className="font-bold text-gray-800">{student.className}</div>
                    </div>
                    <div>
                        <label className="block text-gray-500 mb-1">الجوال</label>
                        <div className="font-bold text-gray-800 dir-ltr text-right font-mono">{student.phone || '-'}</div>
                    </div>
                    <div>
                        <label className="block text-gray-500 mb-1">البريد الإلكتروني</label>
                        <div className="font-bold text-gray-800 font-mono">{student.email || '-'}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Lock size={18}/> تغيير كلمة المرور</h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                        <input 
                            type="password" 
                            placeholder="كلمة المرور الجديدة" 
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div>
                        <input 
                            type="password" 
                            placeholder="تأكيد كلمة المرور" 
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 transition-colors shadow">
                        حفظ التغيير
                    </button>
                    {msg && <p className="text-sm font-bold mt-2 text-teal-700">{msg}</p>}
                </form>
            </div>
        </div>
    );
};

// --- TIMETABLE COMPONENT ---
const StudentTimetable = ({ student }: { student: Student }) => {
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    
    useEffect(() => {
        setSchedules(getSchedules());
        setTeachers(getTeachers());
        setAssignments(getTeacherAssignments());
    }, []);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const dayNamesAr = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];
    const todayEnglish = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const getTeacherName = (subject: string) => {
        if (!student.className) return null;
        // Find assignment: Class ID + Subject Name
        const assign = assignments.find(a => a.classId === student.className && a.subjectName === subject);
        if (!assign) return null;
        const teacher = teachers.find(t => t.id === assign.teacherId);
        return teacher ? teacher.name : null;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Clock className="text-teal-600"/>
                الجدول الدراسي - {student.className}
            </h2>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr className="bg-teal-700 text-white">
                                <th className="p-4 border-l border-teal-600 w-32 font-bold">اليوم</th>
                                {periods.map(p => (
                                    <th key={p} className="p-4 border-l border-teal-600 font-bold min-w-[120px]">
                                        الحصة {p}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {days.map(day => {
                                const isToday = day === todayEnglish;
                                return (
                                    <tr key={day} className={`${isToday ? 'bg-yellow-50' : 'hover:bg-gray-50'} transition-colors border-b`}>
                                        <td className={`p-4 border-l font-bold text-gray-800 ${isToday ? 'text-teal-700 border-yellow-100' : ''}`}>
                                            {dayNamesAr[day as keyof typeof dayNamesAr]}
                                            {isToday && <span className="block text-[10px] text-teal-600 mt-1 font-normal">(اليوم)</span>}
                                        </td>
                                        {periods.map(period => {
                                            const session = schedules.find(s => s.classId === student.className && s.day === day && s.period === period);
                                            const teacherName = session ? getTeacherName(session.subjectName) : null;
                                            
                                            return (
                                                <td key={period} className={`p-2 border-l h-24 align-middle ${isToday ? 'border-yellow-100' : ''}`}>
                                                    {session ? (
                                                        <div className="flex flex-col items-center justify-center gap-1 h-full w-full bg-white/50 p-2 rounded-lg border border-transparent hover:border-gray-200 transition-all">
                                                            <span className="font-black text-gray-800 text-sm md:text-base">{session.subjectName}</span>
                                                            {teacherName && (
                                                                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                    <User size={10}/> {teacherName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-300 text-xl">-</span>
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
            
            {!student.className && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100 text-center font-bold">
                    لم يتم تحديد فصل للطالب. يرجى مراجعة إدارة المدرسة.
                </div>
            )}
        </div>
    );
};

const StudentAttendanceView = ({ student, attendance }: { student: Student, attendance: AttendanceRecord[] }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [showExcuseModal, setShowExcuseModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
    const [excuseNote, setExcuseNote] = useState('');
    const [excuseFile, setExcuseFile] = useState<string>('');

    useEffect(() => {
        setRecords(attendance.filter(a => a.studentId === student.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, [attendance, student.id]);

    const handleOpenExcuse = (record: AttendanceRecord) => {
        setSelectedRecord(record);
        setExcuseNote(record.excuseNote || '');
        setExcuseFile(record.excuseFile || '');
        setShowExcuseModal(true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setExcuseFile(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmitExcuse = () => {
        if (selectedRecord) {
            const updatedRecord = { 
                ...selectedRecord, 
                excuseNote: excuseNote, 
                excuseFile: excuseFile 
            };
            saveAttendance([updatedRecord]);
            setRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
            setShowExcuseModal(false);
            alert('تم رفع العذر بنجاح!');
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Calendar className="text-teal-600"/>
                سجل الحضور والغياب
            </h2>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-gray-50 text-gray-700 border-b">
                        <tr>
                            <th className="p-4 font-bold text-sm">التاريخ</th>
                            <th className="p-4 font-bold text-sm">الحالة</th>
                            <th className="p-4 font-bold text-sm">المادة / الحصة</th>
                            <th className="p-4 font-bold text-sm">الأعذار</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {records.map(rec => (
                            <tr key={rec.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                    <VerticalDate dateStr={rec.date} />
                                </td>
                                <td className="p-4">
                                    {rec.status === AttendanceStatus.PRESENT && <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-green-100">حاضر</span>}
                                    {rec.status === AttendanceStatus.ABSENT && <span className="text-red-600 bg-red-50 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-red-100">غائب</span>}
                                    {rec.status === AttendanceStatus.LATE && <span className="text-orange-600 bg-orange-50 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-orange-100">متأخر</span>}
                                    {rec.status === AttendanceStatus.EXCUSED && <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-blue-100">بعذر</span>}
                                </td>
                                <td className="p-4 text-sm text-gray-600 font-medium">
                                    {rec.subject} {rec.period ? <span className="text-gray-400 text-xs bg-gray-100 px-1.5 rounded mx-1">حصة {rec.period}</span> : ''}
                                </td>
                                <td className="p-4">
                                    {(rec.status === AttendanceStatus.ABSENT || rec.status === AttendanceStatus.LATE) && (
                                        <button 
                                            onClick={() => handleOpenExcuse(rec)}
                                            className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border shadow-sm font-bold ${rec.excuseNote ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'}`}
                                        >
                                            {rec.excuseNote || rec.excuseFile ? <CheckCircle size={14} className="text-green-600"/> : <Upload size={14}/>}
                                            {rec.excuseNote || rec.excuseFile ? 'عرض العذر' : 'تقديم عذر'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {records.length === 0 && (
                            <tr><td colSpan={4} className="p-12 text-center text-gray-400 font-medium">لا توجد سجلات حضور مسجلة</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Excuse Modal */}
            {showExcuseModal && selectedRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-bounce-in border border-gray-100">
                        <h3 className="text-lg font-bold mb-4 border-b pb-3 text-gray-800">تقديم عذر غياب</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">سبب الغياب</label>
                                <textarea 
                                    className="w-full p-3 border rounded-lg text-sm h-32 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                                    placeholder="اكتب سبب الغياب هنا..."
                                    value={excuseNote}
                                    onChange={e => setExcuseNote(e.target.value)}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">المرفقات (صورة / PDF)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center relative hover:bg-gray-50 hover:border-teal-400 transition-colors">
                                    <input type="file" accept="image/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange}/>
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="text-gray-400"/>
                                        <span className="text-xs text-gray-500 font-medium">اضغط لرفع ملف إثبات (اختياري)</span>
                                    </div>
                                </div>
                                {excuseFile && (
                                    <div className="mt-3 text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200 flex items-center gap-2 font-bold">
                                        <CheckCircle size={14}/> تم إرفاق الملف بنجاح
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button onClick={handleSubmitExcuse} className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg font-bold hover:bg-teal-700 shadow-md transition-colors">إرسال العذر</button>
                                <button onClick={() => setShowExcuseModal(false)} className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition-colors">إلغاء</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StudentEvaluationView = ({ student, performance, attendance }: { student: Student, performance: PerformanceRecord[], attendance: AttendanceRecord[] }) => {
    const [selectedSubject, setSelectedSubject] = useState('');
    const subjects = getSubjects();
    const [activityTarget, setActivityTarget] = useState<number>(13); // Default to 13

    useEffect(() => {
        if(subjects.length > 0) setSelectedSubject(subjects[0].name);
        else setSelectedSubject('عام');

        // Load Activity Target (Same as teacher's view)
        const savedTarget = localStorage.getItem('works_activity_target');
        if (savedTarget) setActivityTarget(parseInt(savedTarget));
    }, []);

    // Calculate Summary Stats (Mirroring StudentFollowUp logic)
    const stats = useMemo(() => {
        // Configs for columns - NEW: Use Assignments
        const homeworkCols = getAssignments('HOMEWORK').filter(c => c.isVisible);
        const rawActivityCols = getAssignments('ACTIVITY').filter(c => c.isVisible);
        const examCols = getAssignments('PLATFORM_EXAM').filter(c => c.isVisible);
        
        // Exclude attendance from activity sum if needed
        const activityCols = rawActivityCols.filter(c => !c.title.includes('حضور') && !c.title.toLowerCase().includes('attendance'));

        // Filter for this student & subject
        const myPerf = performance.filter(p => p.studentId === student.id && p.subject === selectedSubject);
        const myAtt = attendance.filter(a => a.studentId === student.id);

        // 1. Homework (Max 10)
        const studentHWs = myPerf.filter(p => p.category === 'HOMEWORK');
        const distinctHWs = new Set(studentHWs.filter(p => p.score > 0).map(p => p.notes)).size; // notes stores assignmentId
        const totalHWCount = homeworkCols.length;
        const hwPercent = totalHWCount > 0 ? (distinctHWs / totalHWCount) * 100 : 0;
        const gradeHW = (hwPercent / 100) * 10;

        // 2. Activity (Max 15)
        const studentActs = myPerf.filter(p => p.category === 'ACTIVITY');
        let actSum = 0;
        const validColKeys = new Set(activityCols.map(c => c.id));
        studentActs.forEach(p => {
             if (p.notes && validColKeys.has(p.notes)) {
                 actSum += p.score;
             }
        });
        const activityRatio = activityTarget > 0 ? (actSum / activityTarget) : 0;
        const gradeAct = Math.min(activityRatio * 15, 15);

        // 3. Participation (Max 15) - Updated Logic
        // Count Present, Late, and Excused as credit
        const effectivePresent = myAtt.filter(a => 
            a.status === AttendanceStatus.PRESENT || 
            a.status === AttendanceStatus.LATE ||
            a.status === AttendanceStatus.EXCUSED
        ).length;
        
        const totalDays = myAtt.length;
        const attPercent = totalDays > 0 ? (effectivePresent / totalDays) * 100 : 100;
        const gradePart = (attPercent / 100) * 15;

        // 4. Exams (Max 20)
        const studentExams = myPerf.filter(p => p.category === 'PLATFORM_EXAM');
        let examScore = 0;
        let examMax = 0;
        studentExams.forEach(e => { examScore += e.score; examMax += e.maxScore || 20; });
        const examWeightedRaw = examMax > 0 ? (examScore / examMax) * 20 : 0;
        const examWeighted = Math.min(examWeightedRaw, 20);

        // Total
        const totalPeriod = gradeHW + gradeAct + gradePart + examWeighted;

        // Behavior
        const negBehavior = myAtt.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;
        const posBehavior = myAtt.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;

        return { 
            hwScore: distinctHWs, totalHWCount, gradeHW,
            actSum, gradeAct, 
            gradePart, attPercent,
            examWeighted,
            totalPeriod,
            posBehavior, negBehavior,
            homeworkCols, // Detailed cols
            activityCols, // Detailed cols
            examCols, // Detailed cols
            studentHWs, // Details records
            studentActs, // Detailed records
            studentExams // Detailed records
        };
    }, [performance, attendance, student.id, selectedSubject, activityTarget]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row justify-between items-center mb-2 gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Award className="text-teal-600" />
                    تقرير تقييمي (المتابعة الفردية)
                </h2>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                    <span className="text-sm font-bold text-gray-500">عرض مادة:</span>
                    <select 
                        className="bg-transparent font-bold text-teal-800 outline-none cursor-pointer"
                        value={selectedSubject}
                        onChange={e => setSelectedSubject(e.target.value)}
                    >
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        <option value="عام">عام</option>
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 w-full h-1 bg-blue-500"></div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <FileText size={24}/>
                    </div>
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">الواجبات</span>
                    <span className="text-2xl font-bold text-gray-800 mt-1 font-mono">{stats.hwScore} <span className="text-gray-400 text-lg">/ {stats.totalHWCount}</span></span>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 w-full h-1 bg-amber-500"></div>
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <ActivityIcon size={24}/>
                    </div>
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">نقاط الأنشطة</span>
                    <span className="text-2xl font-bold text-gray-800 mt-1 font-mono">{stats.actSum}</span>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute top-0 w-full h-1 bg-purple-500"></div>
                    <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <TrendingUp size={24}/>
                    </div>
                    <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">درجة الاختبارات</span>
                    <span className="text-2xl font-bold text-gray-800 mt-1 font-mono">{stats.examWeighted.toFixed(1)} <span className="text-gray-400 text-lg">/ 20</span></span>
                </div>

                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col items-center text-center relative overflow-hidden text-white">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-blue-500"></div>
                    <div className="w-12 h-12 bg-white/10 text-teal-300 rounded-full flex items-center justify-center mb-3">
                        <Calculator size={24}/>
                    </div>
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">المجموع الكلي (60)</span>
                    <span className="text-3xl font-black mt-1 font-mono text-white">{stats.totalPeriod.toFixed(1)}</span>
                </div>
            </div>

            {/* Detailed Summary Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex items-center gap-2">
                    <Award size={18} className="text-teal-600"/>
                    ملخص درجات الفصل الدراسي
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-sm">
                        <thead>
                            <tr className="bg-teal-700 text-white">
                                <th className="p-3 border border-teal-600">الفصل</th>
                                <th className="p-3 border border-teal-600">نسبة الحضور</th>
                                <th className="p-3 border border-teal-600">نسبة حل الواجبات</th>
                                <th className="p-3 border border-teal-600">مجموع الأنشطة</th>
                                <th className="p-3 border border-teal-600 bg-teal-800">درجة الواجبات (10)</th>
                                <th className="p-3 border border-teal-600 bg-teal-800">درجة الأنشطة (15)</th>
                                <th className="p-3 border border-teal-600 bg-teal-800">درجة المشاركة (15)</th>
                                <th className="p-3 border border-teal-600 bg-teal-800">اختبارات المنصة (20)</th>
                                <th className="p-3 border border-teal-600 bg-gray-900">المجموع الكلي</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-white text-gray-800">
                                <td className="p-3 border border-gray-200 font-medium">{student.className}</td>
                                <td className="p-3 border border-gray-200 dir-ltr font-mono">{Math.round(stats.attPercent)}%</td>
                                <td className="p-3 border border-gray-200 dir-ltr font-mono">{Math.round((stats.hwScore / (stats.totalHWCount || 1)) * 100)}%</td>
                                <td className="p-3 border border-gray-200 font-bold text-amber-600 font-mono">{stats.actSum}</td>
                                <td className="p-3 border border-gray-200 font-bold bg-blue-50/50 font-mono">{stats.gradeHW.toFixed(1)}</td>
                                <td className="p-3 border border-gray-200 font-bold bg-amber-50/50 font-mono">{stats.gradeAct.toFixed(1)}</td>
                                <td className="p-3 border border-gray-200 font-bold bg-green-50/50 font-mono">{stats.gradePart.toFixed(1)}</td>
                                <td className="p-3 border border-gray-200 font-bold bg-purple-50/50 font-mono">{stats.examWeighted.toFixed(1)}</td>
                                <td className="p-3 border border-gray-200 font-black bg-gray-50 text-lg font-mono text-gray-800">{stats.totalPeriod.toFixed(1)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* DETAILED BREAKDOWN SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. HOMEWORK DETAILS */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                    <div className="p-4 border-b bg-blue-50 text-blue-800 font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen size={18}/>
                            تفاصيل الواجبات
                        </div>
                        <span className="text-xs bg-white px-2 py-1 rounded-full border border-blue-100">{Math.round((stats.hwScore / (stats.totalHWCount || 1)) * 100)}% مكتمل</span>
                    </div>
                    <div className="flex-1 overflow-auto max-h-80 custom-scrollbar">
                        {stats.homeworkCols.length > 0 ? (
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0">
                                    <tr>
                                        <th className="p-3 border-b">اسم الواجب</th>
                                        <th className="p-3 border-b w-24 text-center">الحالة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {stats.homeworkCols.map((col) => {
                                        const isDone = stats.studentHWs.some(p => p.notes === col.id && p.score > 0);
                                        return (
                                            <tr key={col.id} className="hover:bg-gray-50">
                                                <td className="p-3 text-gray-700 font-medium">
                                                    {col.url ? (
                                                        <a href={col.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                                            {col.title} <ExternalLink size={10}/>
                                                        </a>
                                                    ) : col.title}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {isDone ? (
                                                        <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-xs font-bold border border-green-100">
                                                            <CheckSquare size={12}/> تم الحل
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold border border-red-100">
                                                            <X size={12}/> لم يحل
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-400">لا توجد واجبات مسجلة</div>
                        )}
                    </div>
                </div>

                {/* 2. ACTIVITY DETAILS (NEW) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                    <div className="p-4 border-b bg-amber-50 text-amber-800 font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ActivityIcon size={18}/>
                            تفاصيل الأنشطة
                        </div>
                        <span className="text-xs bg-white px-2 py-1 rounded-full border border-amber-100">مجموع النقاط: {stats.actSum}</span>
                    </div>
                    <div className="flex-1 overflow-auto max-h-80 custom-scrollbar">
                        {stats.activityCols.length > 0 ? (
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0">
                                    <tr>
                                        <th className="p-3 border-b">اسم النشاط</th>
                                        <th className="p-3 border-b w-24 text-center">الدرجة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {stats.activityCols.map((col) => {
                                        const rec = stats.studentActs.find(p => p.notes === col.id);
                                        const score = rec ? rec.score : 0;
                                        // Prioritize Assignment URL
                                        const linkUrl = col.url; 
                                        
                                        return (
                                            <tr key={col.id} className="hover:bg-gray-50">
                                                <td className="p-3 text-gray-700 font-medium">
                                                    {linkUrl ? (
                                                        <a href={linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                                            {col.title} <ExternalLink size={10}/>
                                                        </a>
                                                    ) : col.title}
                                                </td>
                                                <td className="p-3 text-center font-bold text-amber-700 font-mono">
                                                    {score > 0 ? score : '-'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-400">لا توجد أنشطة مسجلة</div>
                        )}
                    </div>
                </div>

                {/* 3. PLATFORM EXAMS DETAILS */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                    <div className="p-4 border-b bg-purple-50 text-purple-800 font-bold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={18}/>
                            تفاصيل اختبارات المنصة
                        </div>
                        <span className="text-xs bg-white px-2 py-1 rounded-full border border-purple-100">الموزونة: {stats.examWeighted.toFixed(1)}</span>
                    </div>
                    <div className="flex-1 overflow-auto max-h-80 custom-scrollbar">
                        {stats.examCols.length > 0 ? (
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 text-gray-600 font-bold sticky top-0">
                                    <tr>
                                        <th className="p-3 border-b">اسم الاختبار</th>
                                        <th className="p-3 border-b w-24 text-center">الدرجة</th>
                                        <th className="p-3 border-b w-24 text-center">من أصل</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {stats.examCols.map((col) => {
                                        const rec = stats.studentExams.find(p => p.notes === col.id);
                                        const score = rec ? rec.score : 0;
                                        const max = col.maxScore || 20;
                                        return (
                                            <tr key={col.id} className="hover:bg-gray-50">
                                                <td className="p-3 text-gray-700 font-medium">
                                                    {col.url ? (
                                                        <a href={col.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                                            {col.title} <ExternalLink size={10}/>
                                                        </a>
                                                    ) : col.title}
                                                </td>
                                                <td className="p-3 text-center font-bold text-purple-700 font-mono">{score}</td>
                                                <td className="p-3 text-center text-gray-400 text-xs font-mono">{max}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-400">لا توجد اختبارات مسجلة</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed Behavior Log */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 font-bold text-gray-700 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-orange-500"/>
                    سجل الملاحظات السلوكية
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold sticky top-0">
                            <tr>
                                <th className="p-3 w-32">التاريخ</th>
                                <th className="p-3">الملاحظة</th>
                                <th className="p-3 w-32 text-center">التصنيف</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {attendance.filter(a => a.studentId === student.id && (a.behaviorNote || a.behaviorStatus !== BehaviorStatus.NEUTRAL)).map(rec => (
                                <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3 border-l border-gray-50">
                                        <VerticalDate dateStr={rec.date} />
                                    </td>
                                    <td className="p-3 font-bold text-gray-700 border-l border-gray-50">{rec.behaviorNote || '-'}</td>
                                    <td className="p-3 text-center">
                                        {rec.behaviorStatus === BehaviorStatus.POSITIVE && <span className="text-green-700 bg-green-50 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto border border-green-100"><Smile size={14}/> إيجابي</span>}
                                        {rec.behaviorStatus === BehaviorStatus.NEGATIVE && <span className="text-red-700 bg-red-50 px-2 py-1 rounded text-xs font-bold flex items-center justify-center gap-1 w-fit mx-auto border border-red-100"><Frown size={14}/> سلبي</span>}
                                    </td>
                                </tr>
                            ))}
                            {attendance.filter(a => a.studentId === student.id && (a.behaviorNote || a.behaviorStatus !== BehaviorStatus.NEUTRAL)).length === 0 && (
                                <tr><td colSpan={3} className="p-8 text-center text-gray-400 bg-gray-50/50">لا توجد ملاحظات سلوكية مسجلة</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentPortal;
