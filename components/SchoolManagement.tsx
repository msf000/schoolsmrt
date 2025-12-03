import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, Parent, ClassRoom, Subject, Student, School, ScheduleItem, DayOfWeek } from '../types';
import { 
    getTeachers, addTeacher, deleteTeacher, 
    getParents, addParent, deleteParent, 
    getSubjects, addSubject, deleteSubject,
    getSchools, addSchool,
    getSchedules, saveScheduleItem, deleteScheduleItem
} from '../services/storageService';
import { Trash2, Plus, Book, Users, User, Phone, Mail, Building2, Layout, Database, Save, Link as LinkIcon, Calendar, Clock, Filter, AlertCircle, Edit2, Check, X, RefreshCw, Layers } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'TIMETABLE' | 'TEACHERS' | 'PARENTS' | 'SUBJECTS' | 'IMPORT' | 'SETTINGS'>('TIMETABLE');
  
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
          <TabButton active={activeTab === 'TEACHERS'} onClick={() => setActiveTab('TEACHERS')} icon={<User size={18} />} label="المعلمين" />
          <TabButton active={activeTab === 'PARENTS'} onClick={() => setActiveTab('PARENTS')} icon={<Users size={18} />} label="أولياء الأمور" />
          <TabButton active={activeTab === 'SUBJECTS'} onClick={() => setActiveTab('SUBJECTS')} icon={<Book size={18} />} label="المواد الدراسية" />
          <TabButton active={activeTab === 'IMPORT'} onClick={() => setActiveTab('IMPORT')} icon={<Database size={18} />} label="استيراد بيانات" />
          <TabButton active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Save size={18} />} label="إعدادات عامة" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
          {activeTab === 'TIMETABLE' && <TimetableManager students={students} />}
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

// --- Settings Manager (For Cloud Link) ---
const SchoolSettings = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [masterUrl, setMasterUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const s = getSchools();
        setSchools(s);
        if (s.length > 0 && s[0].worksMasterUrl) {
            setMasterUrl(s[0].worksMasterUrl);
        }
    }, []);

    const handleSave = () => {
        if (schools.length === 0) {
            setMsg('❌ لا توجد مدرسة مسجلة. يرجى إضافة مدرسة من لوحة المدير العام أولاً.');
            return;
        }
        
        setIsSaving(true);
        // Update the first school found
        const updatedSchool = { ...schools[0], worksMasterUrl: masterUrl };
        addSchool(updatedSchool); // upsert/add logic handles update if ID exists
        
        setTimeout(() => {
            setIsSaving(false);
            setMsg('✅ تم حفظ الرابط بنجاح! سيتم تعميمه على جميع الأجهزة بعد المزامنة.');
            setTimeout(() => setMsg(''), 3000);
        }, 1000);
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <LinkIcon className="text-blue-600"/>
                إعدادات الربط السحابي
            </h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">رابط ملف الأعمال الرئيسي (Google Drive / Excel)</label>
                <p className="text-xs text-gray-500 mb-4">هذا الرابط سيتم استخدامه في صفحة "متابعة الأعمال" لجلب البيانات تلقائياً لجميع المستخدمين.</p>
                
                <div className="flex gap-2">
                    <input 
                        type="url" 
                        value={masterUrl} 
                        onChange={e => setMasterUrl(e.target.value)}
                        className="flex-1 p-3 border rounded-lg dir-ltr text-left"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                    />
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? 'جاري الحفظ...' : 'حفظ وتعميم'}
                    </button>
                </div>
                {msg && <div className="mt-3 text-sm font-bold text-center">{msg}</div>}
            </div>

            <div className="text-sm text-gray-400 text-center">
                تأكد من أن الرابط صالح ومتاح للمشاركة (Anyone with link) لضمان عمله لدى جميع المعلمين.
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