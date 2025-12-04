
import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, Parent, ClassRoom, Subject, Student, School, ScheduleItem, DayOfWeek, ReportHeaderConfig, TeacherAssignment } from '../types';
import { 
    getTeachers, addTeacher, deleteTeacher, 
    getParents, addParent, deleteParent, 
    getSubjects, addSubject, deleteSubject,
    getSchools, addSchool,
    getSchedules, saveScheduleItem, deleteScheduleItem,
    getReportHeaderConfig, saveReportHeaderConfig,
    saveWorksMasterUrl, getWorksMasterUrl,
    getTeacherAssignments, saveTeacherAssignment, deleteTeacherAssignment
} from '../services/storageService';
import { Trash2, Plus, Book, Users, User, Phone, Mail, Building2, Layout, Database, Save, Link as LinkIcon, Calendar, Clock, Filter, AlertCircle, Edit2, Check, X, RefreshCw, Layers, GraduationCap, MapPin, Upload, Briefcase, List, Table } from 'lucide-react';
import DataImport from './DataImport';

interface SchoolManagementProps {
    students: Student[];
    onImportStudents: (students: Student[], matchKey?: keyof Student, strategy?: 'UPDATE' | 'SKIP' | 'NEW', updateFields?: string[]) => void;
    onImportPerformance: (records: any[]) => void;
    onImportAttendance: (records: any[]) => void;
}

const SchoolManagement: React.FC<SchoolManagementProps> = ({ 
    students, 
    onImportStudents, 
    onImportPerformance, 
    onImportAttendance 
}) => {
  // Removed 'STRUCTURE' from tabs
  const [activeTab, setActiveTab] = useState<'TIMETABLE' | 'ASSIGNMENTS' | 'TEACHERS' | 'PARENTS' | 'SUBJECTS' | 'IMPORT' | 'SETTINGS'>('TIMETABLE');
  
  return (
    <div className="p-6 animate-fade-in space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="text-primary" />
            إدارة المدرسة
        </h2>
        <p className="text-gray-500 mt-2">إدارة الجدول الدراسي، المعلمين، والمواد.</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6">
          <TabButton active={activeTab === 'TIMETABLE'} onClick={() => setActiveTab('TIMETABLE')} icon={<Calendar size={18} />} label="الجدول الدراسي" />
          <TabButton active={activeTab === 'ASSIGNMENTS'} onClick={() => setActiveTab('ASSIGNMENTS')} icon={<Briefcase size={18} />} label="توزيع المعلمين" />
          <TabButton active={activeTab === 'TEACHERS'} onClick={() => setActiveTab('TEACHERS')} icon={<User size={18} />} label="المعلمين" />
          <TabButton active={activeTab === 'PARENTS'} onClick={() => setActiveTab('PARENTS')} icon={<Users size={18} />} label="أولياء الأمور" />
          <TabButton active={activeTab === 'SUBJECTS'} onClick={() => setActiveTab('SUBJECTS')} icon={<Book size={18} />} label="المواد الدراسية" />
          <TabButton active={activeTab === 'IMPORT'} onClick={() => setActiveTab('IMPORT')} icon={<Database size={18} />} label="استيراد بيانات" />
          <TabButton active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Save size={18} />} label="إعدادات عامة" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
          {activeTab === 'TIMETABLE' && <TimetableManager students={students} />}
          {activeTab === 'ASSIGNMENTS' && <TeacherAssignmentsManager students={students} />}
          {activeTab === 'TEACHERS' && <TeachersManager />}
          {activeTab === 'PARENTS' && <ParentsManager />}
          {activeTab === 'SUBJECTS' && <SubjectsManager />}
          {activeTab === 'IMPORT' && (
              <DataImport 
                  existingStudents={students}
                  onImportStudents={onImportStudents}
                  onImportPerformance={onImportPerformance}
                  onImportAttendance={onImportAttendance}
              />
          )}
          {activeTab === 'SETTINGS' && <SchoolSettings />}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all whitespace-nowrap ${
            active ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

// --- Teacher Assignments Manager (NEW) ---
const TeacherAssignmentsManager = ({ students }: { students: Student[] }) => {
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [viewMode, setViewMode] = useState<'ASSIGN' | 'TABLE'>('ASSIGN');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        setAssignments(getTeacherAssignments());
        setTeachers(getTeachers());
        setSubjects(getSubjects());
    }, []);

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        students.forEach(s => s.className && classes.add(s.className));
        return Array.from(classes).sort();
    }, [students]);

    const handleAssign = (subjectName: string, teacherId: string) => {
        if (!selectedClass) return;
        const newAssignment: TeacherAssignment = {
            id: `${selectedClass}-${subjectName}`,
            classId: selectedClass,
            subjectName: subjectName,
            teacherId: teacherId
        };
        saveTeacherAssignment(newAssignment);
        setAssignments(getTeacherAssignments());
        setMsg('تم حفظ التغييرات');
        setTimeout(() => setMsg(''), 2000);
    };

    const handleDeleteAssignment = (id: string) => {
        if(window.confirm('هل أنت متأكد من حذف هذا الإسناد؟')) {
            deleteTeacherAssignment(id);
            setAssignments(getTeacherAssignments());
        }
    };

    const getTeacherName = (id: string) => {
        const t = teachers.find(t => t.id === id);
        return t ? t.name : '???';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3 flex-1">
                    <Briefcase className="text-blue-600 mt-1" size={24}/>
                    <div>
                        <h3 className="font-bold text-blue-800">توزيع المعلمين على الفصول</h3>
                        <p className="text-sm text-blue-600 mt-1">
                            هنا يمكنك ربط كل مادة في كل فصل بالمعلم المسؤول عنها. هذا الربط سيظهر في تقارير المتابعة والأعمال.
                        </p>
                    </div>
                </div>
                
                <div className="bg-gray-100 p-1 rounded-lg flex shrink-0">
                    <button 
                        onClick={() => setViewMode('ASSIGN')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'ASSIGN' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Edit2 size={16}/> التوزيع (Assign)
                    </button>
                    <button 
                        onClick={() => setViewMode('TABLE')}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${viewMode === 'TABLE' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Table size={16}/> جدول الإسناد (All)
                    </button>
                </div>
            </div>

            {viewMode === 'ASSIGN' ? (
                <div className="flex flex-col md:flex-row gap-4 animate-fade-in">
                    <div className="w-full md:w-1/3 space-y-4">
                        <label className="block text-sm font-bold text-gray-700">اختر الفصل الدراسي:</label>
                        <select 
                            className="w-full p-3 border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-primary/50 outline-none"
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                        >
                            <option value="">-- اختر الفصل --</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        
                        {msg && <div className="text-green-600 text-sm font-bold flex items-center gap-1 animate-fade-in"><Check size={16}/> {msg}</div>}
                    </div>

                    <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-4">
                        {selectedClass ? (
                            <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-4 pb-2 border-b text-sm font-bold text-gray-500">
                                    <div>المادة الدراسية</div>
                                    <div>المعلم المسؤول</div>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto custom-scrollbar space-y-2 p-1">
                                    {subjects.map(subject => {
                                        const currentAssign = assignments.find(a => a.classId === selectedClass && a.subjectName === subject.name);
                                        return (
                                            <div key={subject.id} className="grid grid-cols-2 gap-4 items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                                    <Book size={16} className="text-primary"/> {subject.name}
                                                </div>
                                                <select 
                                                    className={`w-full p-2 border rounded-md text-sm outline-none cursor-pointer transition-colors ${currentAssign ? 'bg-green-50 border-green-200 text-green-800 font-bold' : 'bg-gray-50 text-gray-500'}`}
                                                    value={currentAssign?.teacherId || ''}
                                                    onChange={(e) => handleAssign(subject.name, e.target.value)}
                                                >
                                                    <option value="">-- غير محدد --</option>
                                                    {teachers.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name} {t.subjectSpecialty ? `(${t.subjectSpecialty})` : ''}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )
                                    })}
                                    {subjects.length === 0 && <div className="text-center text-gray-400 py-8">لا توجد مواد مسجلة. أضف المواد أولاً.</div>}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <Briefcase size={48} className="mb-4 opacity-20"/>
                                <p>يرجى اختيار فصل للبدء بتوزيع المعلمين</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                    <div className="max-h-[500px] overflow-auto custom-scrollbar">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-700 font-bold border-b sticky top-0 shadow-sm">
                                <tr>
                                    <th className="p-4 w-1/4">الفصل</th>
                                    <th className="p-4 w-1/4">المادة</th>
                                    <th className="p-4 w-1/3">المعلم المسؤول</th>
                                    <th className="p-4 w-20 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {assignments.length > 0 ? assignments.sort((a,b) => a.classId.localeCompare(b.classId)).map(assign => (
                                    <tr key={assign.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-bold text-gray-800">{assign.classId}</td>
                                        <td className="p-4 font-medium text-blue-600 flex items-center gap-2"><Book size={14}/> {assign.subjectName}</td>
                                        <td className="p-4 text-gray-700 flex items-center gap-2"><User size={14}/> {getTeacherName(assign.teacherId)}</td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => handleDeleteAssignment(assign.id)}
                                                className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                                title="حذف الإسناد"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
                                        <Table size={48} className="mb-2 opacity-20"/>
                                        <p>لا توجد إسنادات مسجلة حتى الآن.</p>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Timetable Manager ---

// Helper for colors
const COLORS = [
  'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
  'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
  'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
  'bg-lime-100 text-lime-800 border-lime-200 hover:bg-lime-200',
  'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
  'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200',
  'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200',
  'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200',
  'bg-violet-100 text-violet-800 border-violet-200 hover:bg-violet-200',
  'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
  'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 hover:bg-fuchsia-200',
  'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200',
  'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200',
];

const getColorClass = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
}

const TimetableManager = ({ students }: { students: Student[] }) => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [viewMode, setViewMode] = useState<'SINGLE_CLASS' | 'MASTER_VIEW'>('SINGLE_CLASS');
    
    // Selectors
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedClassName, setSelectedClassName] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [msg, setMsg] = useState<{text: string, type: 'error'|'success' | 'warning'} | null>(null);

    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const periods = [1, 2, 3, 4, 5, 6, 7, 8];

    useEffect(() => {
        setSubjects(getSubjects());
        setSchedules(getSchedules());
    }, []);

    // 1. Extract Unique Grades from Students
    const uniqueGrades = useMemo(() => {
        const grades = new Set<string>();
        students.forEach(s => {
            if (s.gradeLevel) grades.add(s.gradeLevel);
        });
        return Array.from(grades).sort();
    }, [students]);

    // 2. Extract Unique Classes based on selected Grade
    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        students.forEach(s => {
            // If grade selected, filter by it. Else show all unique class names.
            if (!selectedGrade || s.gradeLevel === selectedGrade) {
                if (s.className) classes.add(s.className);
            }
        });
        return Array.from(classes).sort();
    }, [students, selectedGrade]);

    // Helper to get effective ID for saving schedule (using class name as ID)
    const getScheduleClassId = () => {
        return selectedClassName; 
    };

    const checkForConflicts = (day: DayOfWeek, period: number, currentClassId: string): ScheduleItem | undefined => {
        // Conflict means: User (Teacher) is already teaching ANOTHER class at this time
        // We assume the current user operates the system for themselves
        return schedules.find(s => 
            s.day === day && 
            s.period === period && 
            s.classId !== currentClassId
        );
    };

    const handleCellClick = (day: DayOfWeek, period: number) => {
        if (!selectedClassName || !selectedSubject) {
            setMsg({ text: 'يرجى اختيار الفصل والمادة أولاً من القائمة العلوية', type: 'error' });
            setTimeout(() => setMsg(null), 3000);
            return;
        }

        const classId = getScheduleClassId();

        // 1. Check for Conflicts
        const conflict = checkForConflicts(day, period, classId);
        if (conflict) {
            if (!window.confirm(`⚠️ تنبيه تعارض جدول!\n\nأنت تقوم بتدريس مادة "${conflict.subjectName}" للفصل "${conflict.classId}" في هذا الوقت (يوم ${dayNameAr[day]} الحصة ${period}).\n\nهل أنت متأكد من أنك تريد إضافة هذه الحصة أيضاً؟ (سيكون لديك حصتين في نفس الوقت)`)) {
                return;
            }
        }

        const item: ScheduleItem = {
            id: `${classId}-${day}-${period}`,
            classId: classId, // Store Name as ID
            day: day,
            period: period,
            subjectName: selectedSubject
        };

        saveScheduleItem(item);
        setSchedules(getSchedules());
        setMsg({ text: 'تم تحديث الحصة بنجاح', type: 'success' });
        setTimeout(() => setMsg(null), 1500);
    };

    const handleCellClear = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(window.confirm('هل أنت متأكد من حذف هذه الحصة؟')) {
            deleteScheduleItem(id);
            setSchedules(getSchedules());
        }
    }

    const dayNameAr: Record<string, string> = {
        'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس'
    };

    return (
        <div className="space-y-6">
            
            {/* Header / Mode Switcher */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
                <div>
                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                        {viewMode === 'SINGLE_CLASS' ? <Calendar className="text-primary"/> : <Layers className="text-purple-600"/>}
                        {viewMode === 'SINGLE_CLASS' ? 'جدول الفصول الدراسية' : 'جدول المعلم الشامل'}
                    </h3>
                    <p className="text-gray-400 text-xs mt-1">
                        {viewMode === 'SINGLE_CLASS' ? 'عرض وتعديل جدول كل فصل على حدة' : 'نظرة عامة على جميع حصصك في المدرسة'}
                    </p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setViewMode('SINGLE_CLASS')} 
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${viewMode === 'SINGLE_CLASS' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                    >
                        جدول الفصل
                    </button>
                    <button 
                        onClick={() => setViewMode('MASTER_VIEW')} 
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${viewMode === 'MASTER_VIEW' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}
                    >
                        الجدول الشامل
                    </button>
                </div>
            </div>

            {/* --- SINGLE CLASS VIEW --- */}
            {viewMode === 'SINGLE_CLASS' && (
                <div className="animate-fade-in space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-end bg-gray-50 p-4 rounded-lg border">
                        
                        {/* Grade Filter */}
                        <div className="w-full md:w-auto">
                            <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                                <Filter size={12}/> تصفية حسب الصف
                            </label>
                            <select 
                                className="w-full md:w-48 p-2 border rounded-lg bg-gray-50 text-sm focus:bg-white transition-colors"
                                value={selectedGrade}
                                onChange={e => { setSelectedGrade(e.target.value); setSelectedClassName(''); }}
                            >
                                <option value="">-- كل الصفوف --</option>
                                {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        <div className="w-full md:w-auto">
                            <label className="block text-sm font-bold text-gray-700 mb-1">اختر الفصل الدراسي <span className="text-red-500">*</span></label>
                            <select 
                                className={`w-full md:w-64 p-2 border rounded-lg bg-white ${!selectedClassName ? 'border-primary ring-1 ring-primary/20' : ''}`}
                                value={selectedClassName} 
                                onChange={e => setSelectedClassName(e.target.value)}
                            >
                                <option value="">-- اختر الفصل --</option>
                                {uniqueClasses.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {selectedClassName && (
                            <div className="w-full md:w-auto">
                                <label className="block text-sm font-bold text-gray-700 mb-1">المادة (حدد ثم اضغط في الجدول)</label>
                                <select 
                                    className="w-full md:w-64 p-2 border rounded-lg bg-white border-primary ring-1 ring-primary/20" 
                                    value={selectedSubject} 
                                    onChange={e => setSelectedSubject(e.target.value)}
                                >
                                    <option value="">-- اختر المادة --</option>
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>
                    
                    {msg && (
                        <div className={`p-3 rounded-lg text-sm font-bold text-center border animate-bounce ${msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                            {msg.text}
                        </div>
                    )}

                    {selectedClassName ? (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-center border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-700">
                                        <th className="p-3 border text-sm w-32">اليوم / الحصة</th>
                                        {periods.map(p => <th key={p} className="p-3 border text-sm">الحصة {p}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {days.map(day => (
                                        <tr key={day} className="hover:bg-gray-50">
                                            <td className="p-3 border font-bold bg-gray-50">{dayNameAr[day]}</td>
                                            {periods.map(period => {
                                                const session = schedules.find(s => s.classId === selectedClassName && s.day === day && s.period === period);
                                                const hasConflict = checkForConflicts(day, period, selectedClassName);
                                                
                                                return (
                                                    <td 
                                                        key={period} 
                                                        onClick={() => handleCellClick(day, period)}
                                                        className={`p-1 border cursor-pointer relative h-20 w-32 align-top transition-colors ${!session ? 'hover:bg-blue-50' : ''}`}
                                                    >
                                                        {session ? (
                                                            <div className={`w-full h-full rounded-md p-1 flex flex-col items-center justify-center relative group shadow-sm border ${getColorClass(session.subjectName)}`}>
                                                                <span className="font-bold text-sm text-center line-clamp-2">{session.subjectName}</span>
                                                                
                                                                {/* Edit/Delete Overlay */}
                                                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity rounded-md backdrop-blur-[1px]">
                                                                    <button 
                                                                        onClick={(e) => handleCellClear(e, session.id)} 
                                                                        className="bg-white text-red-500 p-1.5 rounded-full shadow hover:bg-red-50"
                                                                        title="حذف"
                                                                    >
                                                                        <Trash2 size={14}/>
                                                                    </button>
                                                                    <div className="bg-white text-blue-500 p-1.5 rounded-full shadow" title="اضغط لتغيير المادة">
                                                                        <Edit2 size={14}/>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center">
                                                                <span className="text-gray-200 text-2xl select-none group-hover:text-blue-300">+</span>
                                                                {hasConflict && (
                                                                    <span className="text-[9px] text-red-400 font-bold bg-red-50 px-1 rounded border border-red-100 mt-1">
                                                                        مشغول: {hasConflict.classId}
                                                                    </span>
                                                                )}
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
                    ) : (
                        <div className="text-center py-20 text-gray-400 flex flex-col items-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <Calendar size={48} className="mb-4 opacity-20"/>
                            <p className="font-bold text-gray-600">جدول الحصص الدراسي</p>
                            <p className="text-sm mt-2">يرجى اختيار الفصل الدراسي من القائمة أعلاه لعرض وتعديل الجدول</p>
                        </div>
                    )}
                </div>
            )}

            {/* --- TEACHER MASTER VIEW --- */}
            {viewMode === 'MASTER_VIEW' && (
                <div className="animate-fade-in bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-purple-50 border-b border-purple-100">
                        <div className="flex items-center gap-2 text-purple-800 font-bold text-sm">
                            <AlertCircle size={16}/>
                            هذا الجدول يعرض جميع حصصك موزعة على أيام الأسبوع.
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-gray-700">
                                    <th className="p-4 border text-sm w-32 font-bold">اليوم</th>
                                    {periods.map(p => <th key={p} className="p-4 border text-sm font-bold bg-gray-50">الحصة {p}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {days.map(day => (
                                    <tr key={day} className="hover:bg-gray-50">
                                        <td className="p-4 border font-bold bg-gray-50 text-gray-800">{dayNameAr[day]}</td>
                                        {periods.map(period => {
                                            // In master view, we find ANY schedule for this day/period
                                            const sessions = schedules.filter(s => s.day === day && s.period === period);
                                            const hasConflict = sessions.length > 1;
                                            
                                            return (
                                                <td key={period} className="p-1 border h-24 w-40 align-top">
                                                    {sessions.length > 0 ? (
                                                        <div className="flex flex-col gap-1 h-full justify-center">
                                                            {sessions.map(session => (
                                                                <div 
                                                                    key={session.id}
                                                                    className={`p-1.5 rounded-lg text-xs border shadow-sm flex flex-col items-center justify-center ${hasConflict ? 'bg-red-100 text-red-800 border-red-300 animate-pulse' : getColorClass(session.classId)}`}
                                                                >
                                                                    <div className="font-bold text-sm mb-0.5">{session.classId}</div>
                                                                    <div className="opacity-90">{session.subjectName}</div>
                                                                    {hasConflict && <div className="text-[9px] font-black text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={8}/> تعارض!</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-200 text-sm select-none">-</span>
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
            )}
        </div>
    );
};

// --- Settings Manager (For Cloud Link and Report Headers) ---
const SchoolSettings = () => {
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig>({ 
        schoolName: '', educationAdmin: '', teacherName: '', 
        schoolManager: '', academicYear: '', term: '', logoBase64: '' 
    });
    const [masterUrl, setMasterUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        setHeaderConfig(getReportHeaderConfig());
        setMasterUrl(getWorksMasterUrl());
    }, []);

    const handleSave = () => {
        setIsSaving(true);
        saveReportHeaderConfig(headerConfig);
        saveWorksMasterUrl(masterUrl);
        
        setTimeout(() => {
            setIsSaving(false);
            setMsg('✅ تم حفظ الإعدادات بنجاح! سيتم تطبيقها على التقارير والنظام.');
            setTimeout(() => setMsg(''), 3000);
        }, 800);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setHeaderConfig(prev => ({ ...prev, logoBase64: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-4 space-y-8">
            
            {/* Report Header Config Section */}
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <GraduationCap className="text-purple-600"/>
                    إعدادات الترويسة والتقارير
                </h3>
                
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Right Side: Text Inputs */}
                    <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">إدارة التعليم (المنطقة / المحافظة)</label>
                            <div className="relative">
                                <MapPin className="absolute right-3 top-3 text-purple-400" size={18}/>
                                <input 
                                    type="text" 
                                    value={headerConfig.educationAdmin} 
                                    onChange={e => setHeaderConfig({...headerConfig, educationAdmin: e.target.value})}
                                    className="w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="مثال: الرياض / جدة"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">اسم المدرسة</label>
                            <div className="relative">
                                <Building2 className="absolute right-3 top-3 text-purple-400" size={18}/>
                                <input 
                                    type="text" 
                                    value={headerConfig.schoolName} 
                                    onChange={e => setHeaderConfig({...headerConfig, schoolName: e.target.value})}
                                    className="w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="مثال: ثانوية الملك فهد"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">مدير المدرسة</label>
                            <div className="relative">
                                <User className="absolute right-3 top-3 text-purple-400" size={18}/>
                                <input 
                                    type="text" 
                                    value={headerConfig.schoolManager} 
                                    onChange={e => setHeaderConfig({...headerConfig, schoolManager: e.target.value})}
                                    className="w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="اسم المدير"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">العام الدراسي</label>
                            <div className="relative">
                                <Calendar className="absolute right-3 top-3 text-purple-400" size={18}/>
                                <input 
                                    type="text" 
                                    value={headerConfig.academicYear} 
                                    onChange={e => setHeaderConfig({...headerConfig, academicYear: e.target.value})}
                                    className="w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="مثال: 1447هـ"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">الفصل الدراسي</label>
                            <select 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                                value={headerConfig.term}
                                onChange={e => setHeaderConfig({...headerConfig, term: e.target.value})}
                            >
                                <option value="الفصل الدراسي الأول">الفصل الدراسي الأول</option>
                                <option value="الفصل الدراسي الثاني">الفصل الدراسي الثاني</option>
                                <option value="الفصل الدراسي الثالث">الفصل الدراسي الثالث</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">اسم المعلم (الظاهر في التقارير)</label>
                            <div className="relative">
                                <User className="absolute right-3 top-3 text-purple-400" size={18}/>
                                <input 
                                    type="text" 
                                    value={headerConfig.teacherName} 
                                    onChange={e => setHeaderConfig({...headerConfig, teacherName: e.target.value})}
                                    className="w-full p-3 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="أدخل اسمك هنا"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Left Side: Logo Upload */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-4 border-2 border-dashed border-purple-300 rounded-xl bg-white hover:bg-purple-50 transition-colors relative">
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleLogoUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {headerConfig.logoBase64 ? (
                            <div className="relative w-full flex flex-col items-center">
                                <img src={headerConfig.logoBase64} alt="شعار المدرسة" className="max-h-32 object-contain mb-2" />
                                <span className="text-xs text-purple-600 font-bold bg-white px-2 py-1 rounded shadow">اضغط لتغيير الشعار</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-gray-400">
                                <Upload size={40} className="mb-2"/>
                                <span className="font-bold">رفع شعار المدرسة</span>
                                <span className="text-xs mt-1">PNG, JPG (حد أقصى 1MB)</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Cloud Link Config Section */}
            <div>
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <LinkIcon className="text-blue-600"/>
                    إعدادات الربط السحابي (Excel/Google Sheets)
                </h3>
                
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">رابط ملف الأعمال الرئيسي</label>
                    <p className="text-xs text-gray-500 mb-4">هذا الرابط يستخدم لجلب درجات الطلاب والأنشطة تلقائياً من ملف خارجي.</p>
                    
                    <div className="flex gap-2">
                        <input 
                            type="url" 
                            value={masterUrl} 
                            onChange={e => setMasterUrl(e.target.value)}
                            className="flex-1 p-3 border rounded-lg dir-ltr text-left"
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center pt-4 border-t">
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-gray-800 hover:bg-black text-white px-12 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg text-lg transform transition-transform active:scale-95"
                >
                    {isSaving ? 'جاري الحفظ...' : 'حفظ كافة الإعدادات'}
                </button>
                {msg && <div className="mt-4 text-sm font-bold text-green-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200 animate-bounce">{msg}</div>}
            </div>
        </div>
    );
};

// --- Other Managers ---

const TeachersManager = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [form, setForm] = useState({ name: '', email: '', phone: '', specialty: '' });

    useEffect(() => { setTeachers(getTeachers()); }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addTeacher({ id: Date.now().toString(), name: form.name, email: form.email, phone: form.phone, subjectSpecialty: form.specialty });
        setTeachers(getTeachers());
        setForm({ name: '', email: '', phone: '', specialty: '' });
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">اسم المعلم</label>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">التخصص</label>
                    <input value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">رقم الجوال</label>
                    <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md h-[42px] flex items-center justify-center gap-2 hover:bg-teal-800"><Plus size={18} /> إضافة</button>
            </form>
            <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                    <thead>
                        <tr className="border-b bg-gray-50 text-sm text-gray-600">
                            <th className="p-3">الاسم</th>
                            <th className="p-3">التخصص</th>
                            <th className="p-3">تواصل</th>
                            <th className="p-3">حذف</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teachers.map(t => (
                            <tr key={t.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{t.name}</td>
                                <td className="p-3 text-gray-600">{t.subjectSpecialty}</td>
                                <td className="p-3 text-sm text-gray-500">
                                    <div className="flex flex-col gap-1">
                                        {t.phone && <span className="flex items-center gap-1"><Phone size={12}/> {t.phone}</span>}
                                        {t.email && <span className="flex items-center gap-1"><Mail size={12}/> {t.email}</span>}
                                    </div>
                                </td>
                                <td className="p-3"><button onClick={() => { deleteTeacher(t.id); setTeachers(getTeachers()); }} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ParentsManager = () => {
    const [parents, setParents] = useState<Parent[]>([]);
    const [form, setForm] = useState({ name: '', phone: '', email: '' });

    useEffect(() => { setParents(getParents()); }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addParent({ id: Date.now().toString(), name: form.name, phone: form.phone, email: form.email, childrenIds: [] });
        setParents(getParents());
        setForm({ name: '', phone: '', email: '' });
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">اسم ولي الأمر</label>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">رقم الجوال</label>
                    <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">البريد الإلكتروني</label>
                    <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md h-[42px] flex items-center justify-center gap-2 hover:bg-teal-800"><Plus size={18} /> إضافة</button>
            </form>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parents.map(p => (
                    <div key={p.id} className="border p-4 rounded-lg flex justify-between items-start hover:shadow-md transition-shadow">
                        <div>
                            <h4 className="font-bold text-gray-800 flex items-center gap-2"><User size={16} /> {p.name}</h4>
                            <div className="mt-2 text-sm text-gray-500 space-y-1">
                                <p className="flex items-center gap-2"><Phone size={14} className="text-green-600"/> {p.phone}</p>
                                {p.email && <p className="flex items-center gap-2"><Mail size={14} className="text-blue-600"/> {p.email}</p>}
                            </div>
                        </div>
                        <button onClick={() => { deleteParent(p.id); setParents(getParents()); }} className="text-red-500 bg-red-50 p-2 rounded-full hover:bg-red-100"><Trash2 size={16} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SubjectsManager = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [name, setName] = useState('');

    useEffect(() => { setSubjects(getSubjects()); }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addSubject({ id: Date.now().toString(), name });
        setSubjects(getSubjects());
        setName('');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <form onSubmit={handleAdd} className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-600 mb-1">اسم المادة (مثال: رياضيات)</label>
                    <input required value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-md" />
                </div>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md h-[42px] flex items-center gap-2 hover:bg-teal-800"><Plus size={18} /> إضافة</button>
            </form>
            <ul className="divide-y border rounded-lg overflow-hidden">
                {subjects.map(s => (
                    <li key={s.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <span className="font-medium flex items-center gap-2"><Book size={16} className="text-secondary"/> {s.name}</span>
                        <button onClick={() => { deleteSubject(s.id); setSubjects(getSubjects()); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 size={16} /></button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SchoolManagement;
