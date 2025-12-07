import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, School, SystemUser, Feedback, Subject, ScheduleItem, TeacherAssignment, ReportHeaderConfig, UserTheme } from '../types';
import { 
    getTeachers, updateTeacher,
    getSchools, getSubjects, addSubject, deleteSubject,
    getSchedules, saveScheduleItem, deleteScheduleItem,
    getTeacherAssignments, saveTeacherAssignment, deleteAssignment,
    getReportHeaderConfig, saveReportHeaderConfig,
    getFeedback, addFeedback, addSchool, updateSchool,
    getUserTheme, saveUserTheme
} from '../services/storageService';
import { Trash2, User, Building2, Save, Users, Send, FileText, BookOpen, Settings, Upload, Clock, Palette, Sun, Cloud, Monitor, Sunset, CheckCircle, Info, PlusCircle, MapPin } from 'lucide-react';

interface SchoolManagementProps {
    students: any[]; 
    onImportStudents: any;
    onImportPerformance: any;
    onImportAttendance: any;
    currentUser?: SystemUser | null;
    onUpdateTheme?: (theme: UserTheme) => void;
}

export const SchoolManagement: React.FC<SchoolManagementProps> = ({ currentUser, students, onUpdateTheme }) => {
  const isManager = currentUser?.role === 'SCHOOL_MANAGER' || currentUser?.role === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TEACHERS' | 'SUBJECTS' | 'SCHEDULE' | 'SETTINGS'>(() => {
      return localStorage.getItem('school_mgmt_active_tab') as any || 'DASHBOARD';
  });

  useEffect(() => {
      localStorage.setItem('school_mgmt_active_tab', activeTab);
  }, [activeTab]);
  
  // --- Data States ---
  const [mySchool, setMySchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportHeaderConfig>({
      schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: ''
  });
  const [userTheme, setUserTheme] = useState<UserTheme>({ mode: 'LIGHT', backgroundStyle: 'FLAT' });

  // --- UI States ---
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [newSubject, setNewSubject] = useState('');
  
  // Schedule UI State
  const [scheduleViewMode, setScheduleViewMode] = useState<'CLASS' | 'TEACHER'>('CLASS');
  const [selectedClassForSchedule, setSelectedClassForSchedule] = useState('');
  const [activeSubject, setActiveSubject] = useState('');
  const [activeTeacher, setActiveTeacher] = useState('');

  // Quick Class Management
  const [newClassName, setNewClassName] = useState('');

  // Teacher Profile State
  const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null);
  const [linkMinistryCode, setLinkMinistryCode] = useState('');
  const [linkStatus, setLinkStatus] = useState<{success: boolean, msg: string} | null>(null);
  const [showNewSchoolForm, setShowNewSchoolForm] = useState(false);
  const [newSchoolData, setNewSchoolData] = useState({ name: '', managerName: '', managerId: '' });

  // --- LOAD DATA ---
  useEffect(() => {
      if (currentUser) {
          setSubjects(getSubjects(currentUser.id));
          setReportConfig(getReportHeaderConfig(currentUser.id));
      }
      
      setSchedules(getSchedules());
      setAssignments(getTeacherAssignments());
      setUserTheme(getUserTheme());

      const allTeachers = getTeachers();
      setTeachers(allTeachers);

      if (isManager) {
          const allSchools = getSchools();
          let school = allSchools.find(s => s.managerNationalId === currentUser?.nationalId || s.managerName === currentUser?.name);
          if (!school && currentUser?.role === 'SUPER_ADMIN' && allSchools.length > 0) {
              school = allSchools[0];
          }
          setMySchool(school || null);
          setFeedbackList(getFeedback());
      } else {
          const me = allTeachers.find(t => 
              (currentUser?.nationalId && t.nationalId === currentUser.nationalId) || 
              (currentUser?.email && t.email === currentUser.email)
          );
          if (me) {
              setTeacherProfile(me);
              setActiveTeacher(me.id);
              if (me.schoolId) {
                  const schools = getSchools();
                  const school = schools.find(s => s.id === me.schoolId);
                  setMySchool(school || null);
              }
          }
      }
  }, [currentUser, isManager]);

  // --- HELPERS ---
  const myTeachers = useMemo(() => {
      if (!mySchool) return [];
      return teachers.filter(t => t.schoolId === mySchool.id || t.managerId === currentUser?.nationalId);
  }, [teachers, mySchool, currentUser]);

  const uniqueClasses = useMemo(() => {
      const classes = new Set<string>();
      students.forEach(s => s.className && classes.add(s.className));
      return Array.from(classes).sort();
  }, [students]);

  const myClassAssignments = useMemo(() => {
      if (!currentUser) return [];
      // FIX: Include assignments without teacherId (legacy)
      const myAssigns = assignments.filter(a => a.teacherId === currentUser.id || !a.teacherId);
      const classes = Array.from(new Set(myAssigns.map(a => a.classId)));
      return classes.sort();
  }, [assignments, currentUser]);

  // --- ACTIONS ---
  const handleAddSubject = () => {
      if (newSubject.trim() && currentUser) {
          addSubject({ 
              id: Date.now().toString(), 
              name: newSubject.trim(),
              teacherId: currentUser.id 
          });
          setSubjects(getSubjects(currentUser.id));
          setNewSubject('');
      }
  };

  const handleDeleteSubject = (id: string) => {
      if (confirm('حذف المادة؟') && currentUser) {
          deleteSubject(id);
          setSubjects(getSubjects(currentUser.id));
      }
  };

  const handleAddQuickClass = () => {
      if (!newClassName || !currentUser || subjects.length === 0) {
          alert('يرجى كتابة اسم الفصل والتأكد من وجود مادة واحدة على الأقل');
          return;
      }
      const subjectName = subjects[0].name; 
      const newAssign: TeacherAssignment = {
          id: `${newClassName}-${subjectName}-${Date.now()}`,
          classId: newClassName,
          subjectName: subjectName,
          teacherId: currentUser.id
      };
      saveTeacherAssignment(newAssign);
      setAssignments(getTeacherAssignments());
      setNewClassName('');
  };

  const handleRemoveClass = (className: string) => {
      if (!currentUser) return;
      if (confirm(`هل تريد إزالة الفصل ${className} وجميع المواد المرتبطة به من قائمتك؟\n(لن يتم حذف بيانات الطلاب، فقط ارتباطك بالفصل)`)) {
          const toRemove = assignments.filter(a => (a.teacherId === currentUser.id || !a.teacherId) && a.classId === className);
          toRemove.forEach(a => deleteAssignment(a.id));
          
          // Also remove schedule items for this teacher & class
          const scheduleToRemove = schedules.filter(s => (s.teacherId === currentUser.id || !s.teacherId) && s.classId === className);
          scheduleToRemove.forEach(s => deleteScheduleItem(s.id));

          setAssignments(getTeacherAssignments());
          setSchedules(getSchedules());
      }
  }

  const handleScheduleCellClick = (day: string, period: number) => {
      if (!selectedClassForSchedule || !activeSubject) return;
      
      const existingItem = schedules.find(s => s.classId === selectedClassForSchedule && s.day === day && s.period === period);

      if (existingItem && existingItem.subjectName === activeSubject) {
          deleteScheduleItem(existingItem.id);
          setSchedules(getSchedules());
          return;
      }

      if (activeTeacher) {
          const concurrentSessions = schedules.filter(s => s.day === day && s.period === period && s.classId !== selectedClassForSchedule);
          const conflict = concurrentSessions.find(s => s.teacherId === activeTeacher || assignments.find(a => a.classId === s.classId && a.subjectName === s.subjectName)?.teacherId === activeTeacher);
          
          if (conflict) {
              alert(`❌ تعارض: المعلم مشغول في هذا الوقت مع فصل "${conflict.classId}".`);
              return;
          }
      }

      const newItem: ScheduleItem = {
          id: `${selectedClassForSchedule}-${day}-${period}`,
          classId: selectedClassForSchedule,
          day: day as any,
          period,
          subjectName: activeSubject,
          teacherId: activeTeacher || undefined
      };
      saveScheduleItem(newItem);

      if (activeTeacher) {
          // Check if assignment exists, if not create it
          const exists = assignments.find(a => a.classId === selectedClassForSchedule && a.subjectName === activeSubject && a.teacherId === activeTeacher);
          if (!exists) {
              const assignment: TeacherAssignment = {
                  id: `${selectedClassForSchedule}-${activeSubject}-${Date.now()}`,
                  classId: selectedClassForSchedule,
                  subjectName: activeSubject,
                  teacherId: activeTeacher
              };
              saveTeacherAssignment(assignment);
              setAssignments(getTeacherAssignments());
          }
      }
      setSchedules(getSchedules());
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setReportConfig(prev => ({ ...prev, logoBase64: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveSettings = () => {
      if (currentUser) {
          const configWithId = { ...reportConfig, teacherId: currentUser.id };
          saveReportHeaderConfig(configWithId);
          saveUserTheme(userTheme);
          if(onUpdateTheme) onUpdateTheme(userTheme);
          alert('تم حفظ الإعدادات بنجاح');
      }
  };

  const handleSaveSchoolData = () => {
      if (mySchool) {
          updateSchool(mySchool);
          alert('تم تحديث بيانات المدرسة بنجاح!');
      }
  };

  const handleTeacherSaveProfile = () => {
      if (teacherProfile) {
          if (!teacherProfile.nationalId) return alert('رقم الهوية مطلوب.');
          updateTeacher(teacherProfile);
          
          if (linkMinistryCode) {
             const schools = getSchools();
             const targetSchool = schools.find(s => s.ministryCode === linkMinistryCode);
             if (targetSchool) {
                 const updated = { ...teacherProfile, schoolId: targetSchool.id, managerId: targetSchool.managerNationalId };
                 updateTeacher(updated);
                 setTeacherProfile(updated);
                 setMySchool(targetSchool);
                 alert('تم ربط حسابك بالمدرسة بنجاح!');
             } else if (showNewSchoolForm && newSchoolData.name) {
                 const newSchool: School = {
                     id: Date.now().toString() + '_sch',
                     name: newSchoolData.name,
                     ministryCode: linkMinistryCode,
                     managerName: newSchoolData.managerName || 'غير مسجل',
                     managerNationalId: newSchoolData.managerId || undefined,
                     type: 'PUBLIC',
                     phone: '',
                     studentCount: 0
                 };
                 addSchool(newSchool);
                 const updated = { ...teacherProfile, schoolId: newSchool.id, managerId: newSchoolData.managerId };
                 updateTeacher(updated);
                 setTeacherProfile(updated);
                 setMySchool(newSchool);
                 alert('تم إنشاء المدرسة وربط الحساب!');
             } else {
                 setLinkStatus({ success: false, msg: 'المدرسة غير موجودة. هل تريد إنشاءها؟' });
                 setShowNewSchoolForm(true);
             }
          } else {
              alert('تم حفظ البيانات الشخصية.');
          }
      }
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const dayNamesAr = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50/50">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Settings size={28} className="text-gray-600"/>
                {isManager ? 'إدارة المدرسة والمعلمين' : 'إعدادات المعلم'}
            </h1>
            
            <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                <button onClick={() => setActiveTab('DASHBOARD')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'DASHBOARD' ? 'bg-gray-100 text-gray-800' : 'text-gray-500'}`}>
                    <User size={16}/> {isManager ? 'لوحة المعلومات' : 'الملف الشخصي'}
                </button>
                {isManager && (
                    <button onClick={() => setActiveTab('TEACHERS')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'TEACHERS' ? 'bg-purple-50 text-purple-700' : 'text-gray-500'}`}>
                        <Users size={16}/> المعلمين
                    </button>
                )}
                <button onClick={() => setActiveTab('SUBJECTS')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'SUBJECTS' ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>
                    <BookOpen size={16}/> المواد والفصول
                </button>
                <button onClick={() => setActiveTab('SCHEDULE')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'SCHEDULE' ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}>
                    <Clock size={16}/> الجدول المدرسي
                </button>
                <button onClick={() => setActiveTab('SETTINGS')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'SETTINGS' ? 'bg-orange-50 text-orange-700' : 'text-gray-500'}`}>
                    <Palette size={16}/> الإعدادات والمظهر
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto">
            {activeTab === 'DASHBOARD' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    {!isManager && teacherProfile && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User size={20}/> بياناتي</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div><label className="block text-sm font-bold mb-1">الاسم</label><input className="w-full p-2 border rounded" value={teacherProfile.name} onChange={e => setTeacherProfile({...teacherProfile, name: e.target.value})}/></div>
                                <div><label className="block text-sm font-bold mb-1">البريد الإلكتروني</label><input className="w-full p-2 border rounded" value={teacherProfile.email || ''} onChange={e => setTeacherProfile({...teacherProfile, email: e.target.value})}/></div>
                                <div><label className="block text-sm font-bold mb-1">رقم الجوال</label><input className="w-full p-2 border rounded" value={teacherProfile.phone || ''} onChange={e => setTeacherProfile({...teacherProfile, phone: e.target.value})}/></div>
                                <div><label className="block text-sm font-bold mb-1">التخصص</label><input className="w-full p-2 border rounded" value={teacherProfile.subjectSpecialty || ''} onChange={e => setTeacherProfile({...teacherProfile, subjectSpecialty: e.target.value})}/></div>
                            </div>

                            <div className="mt-6 pt-6 border-t">
                                <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Building2 size={18}/> المدرسة التابعة</h4>
                                {mySchool ? (
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex justify-between items-center">
                                        <div><p className="font-bold text-green-800">{mySchool.name}</p><p className="text-xs text-green-600">المدير: {mySchool.managerName}</p></div>
                                        <CheckCircle className="text-green-600"/>
                                    </div>
                                ) : (
                                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                        <p className="text-sm text-orange-800 mb-2 font-bold">لست مرتبطاً بأي مدرسة حالياً.</p>
                                        <div className="flex gap-2 mb-2">
                                            <input className="flex-1 p-2 border rounded text-sm" placeholder="أدخل الرمز الوزاري للمدرسة..." value={linkMinistryCode} onChange={e => setLinkMinistryCode(e.target.value)}/>
                                        </div>
                                        {showNewSchoolForm && (
                                            <div className="mt-2 space-y-2 animate-fade-in p-3 bg-white rounded border border-orange-100">
                                                <p className="text-xs text-red-500 font-bold mb-1">{linkStatus?.msg}</p>
                                                <input className="w-full p-2 border rounded text-sm" placeholder="اسم المدرسة الجديد *" value={newSchoolData.name} onChange={e => setNewSchoolData({...newSchoolData, name: e.target.value})} />
                                                <input className="w-full p-2 border rounded text-sm" placeholder="اسم المدير (اختياري)" value={newSchoolData.managerName} onChange={e => setNewSchoolData({...newSchoolData, managerName: e.target.value})} />
                                                <input className="w-full p-2 border rounded text-sm" placeholder="هوية المدير (اختياري)" value={newSchoolData.managerId} onChange={e => setNewSchoolData({...newSchoolData, managerId: e.target.value})} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button onClick={handleTeacherSaveProfile} className="mt-6 w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 flex justify-center items-center gap-2"><Save size={18}/> حفظ التغييرات</button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'SUBJECTS' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><BookOpen size={20}/> إدارة المواد الدراسية</h3>
                        <div className="flex gap-2 mb-6">
                            <input className="flex-1 p-2 border rounded-lg" placeholder="اسم المادة الجديدة (مثال: رياضيات)..." value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubject()}/>
                            <button onClick={handleAddSubject} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"><PlusCircle size={20}/></button>
                        </div>
                        <div className="space-y-2">
                            {subjects.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                                    <span className="font-bold text-gray-700">{s.name}</span>
                                    <button onClick={() => handleDeleteSubject(s.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
                                </div>
                            ))}
                            {subjects.length === 0 && <p className="text-center text-gray-400 py-4">لا توجد مواد مضافة</p>}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-700"><Users size={20}/> إدارة فصولي (للمعلم)</h3>
                        <p className="text-sm text-gray-500 mb-4">أضف الفصول التي تدرسها هنا (مثل "1/أ"). سيظهر الطلاب تلقائياً.</p>
                        <div className="flex gap-2 mb-6">
                            <input className="flex-1 p-2 border rounded-lg" placeholder="اسم الفصل (مثال: 1/أ)..." value={newClassName} onChange={e => setNewClassName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddQuickClass()}/>
                            <button onClick={handleAddQuickClass} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2"><PlusCircle size={20}/> إضافة فصل</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {myClassAssignments.length > 0 ? myClassAssignments.map(cls => (
                                <div key={cls} className="bg-purple-50 border border-purple-200 text-purple-800 px-4 py-2 rounded-lg font-bold flex items-center gap-3">
                                    {cls}
                                    <button onClick={() => handleRemoveClass(cls)} className="text-purple-400 hover:text-red-500" title="إزالة الفصل"><Trash2 size={16}/></button>
                                </div>
                            )) : <p className="text-gray-400 text-sm w-full text-center py-4 border-2 border-dashed rounded-lg">لم تقم بإضافة فصول بعد.</p>}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'SCHEDULE' && (
                <div className="h-full flex flex-col space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-4">
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 mb-1">المادة (للتوزيع)</label>
                                <select className="p-2 border rounded bg-gray-50 min-w-[150px]" value={activeSubject} onChange={e => setActiveSubject(e.target.value)}>
                                    <option value="">-- اختر --</option>
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 mb-1">المعلم</label>
                                <select className="p-2 border rounded bg-gray-50 min-w-[150px]" value={activeTeacher} onChange={e => setActiveTeacher(e.target.value)} disabled={!isManager}>
                                    {isManager && <option value="">-- بدون معلم --</option>}
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setScheduleViewMode('CLASS')} className={`px-3 py-1 rounded text-sm font-bold ${scheduleViewMode === 'CLASS' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>عرض الفصول</button>
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="p-3 bg-blue-50 border-b text-xs text-blue-800 text-center font-bold">
                            اضغط على الخلية لتعيين المادة "{activeSubject || '...'}" {activeTeacher ? 'للمعلم المحدد' : ''}.
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {scheduleViewMode === 'CLASS' && (
                                <div className="space-y-8">
                                    <div className="mb-4">
                                        <label className="font-bold ml-2">اختر الفصل:</label>
                                        <select className="p-2 border rounded" value={selectedClassForSchedule} onChange={e => setSelectedClassForSchedule(e.target.value)}>
                                            <option value="">-- اختر --</option>
                                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    {selectedClassForSchedule && (
                                        <div className="border rounded-xl overflow-hidden">
                                            <div className="bg-gray-100 p-3 font-bold text-center border-b">{selectedClassForSchedule}</div>
                                            <table className="w-full text-center border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-50 text-xs text-gray-500">
                                                        <th className="p-2 border">اليوم / الحصة</th>
                                                        {periods.map(p => <th key={p} className="p-2 border">{p}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {days.map(day => (
                                                        <tr key={day}>
                                                            <td className="p-2 border font-bold text-sm bg-gray-50 w-24">{dayNamesAr[day as keyof typeof dayNamesAr]}</td>
                                                            {periods.map(period => {
                                                                const session = schedules.find(s => s.classId === selectedClassForSchedule && s.day === day && s.period === period);
                                                                const teacher = teachers.find(t => t.id === session?.teacherId);
                                                                return (
                                                                    <td key={period} onClick={() => handleScheduleCellClick(day, period)} className={`p-2 border cursor-pointer hover:opacity-80 transition-all h-16 w-24 relative ${session ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                                                        {session ? (
                                                                            <div className="flex flex-col items-center justify-center h-full">
                                                                                <span className="font-bold text-blue-800 text-sm">{session.subjectName}</span>
                                                                                {teacher && <span className="text-[10px] text-gray-500">{teacher.name}</span>}
                                                                            </div>
                                                                        ) : <span className="text-gray-200 text-xs">+</span>}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'SETTINGS' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
                    
                    {/* School Data Section (New) */}
                    {mySchool && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-teal-700">
                                <Building2 size={20}/> بيانات المدرسة (السجل الرسمي)
                            </h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">اسم المدرسة</label>
                                        <input className="w-full p-2 border rounded" value={mySchool.name} onChange={e => setMySchool({...mySchool, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">الرمز الوزاري</label>
                                        <input className="w-full p-2 border rounded font-mono" value={mySchool.ministryCode || ''} onChange={e => setMySchool({...mySchool, ministryCode: e.target.value})} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">الإدارة التعليمية</label>
                                        <input className="w-full p-2 border rounded" value={mySchool.educationAdministration || ''} onChange={e => setMySchool({...mySchool, educationAdministration: e.target.value})} placeholder="مثال: جدة"/>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">نوع المدرسة</label>
                                        <select className="w-full p-2 border rounded bg-white" value={mySchool.type} onChange={e => setMySchool({...mySchool, type: e.target.value as any})}>
                                            <option value="PUBLIC">حكومي</option>
                                            <option value="PRIVATE">أهلي</option>
                                            <option value="INTERNATIONAL">دولي</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">مدير المدرسة</label>
                                        <input className="w-full p-2 border rounded" value={mySchool.managerName} onChange={e => setMySchool({...mySchool, managerName: e.target.value})} />
                                    </div>
                                </div>
                                <button onClick={handleSaveSchoolData} className="bg-teal-600 text-white px-4 py-2 rounded font-bold hover:bg-teal-700 mt-2 text-sm flex items-center gap-2">
                                    <Save size={16}/> حفظ بيانات المدرسة
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-gray-800"><FileText size={20}/> ترويسة التقارير الرسمية</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">إدارة التعليم (للطباعة)</label><input className="w-full p-2 border rounded" value={reportConfig.educationAdmin} onChange={e => setReportConfig({...reportConfig, educationAdmin: e.target.value})}/></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">اسم المدرسة (للطباعة)</label><input className="w-full p-2 border rounded" value={reportConfig.schoolName} onChange={e => setReportConfig({...reportConfig, schoolName: e.target.value})}/></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">اسم المعلم</label><input className="w-full p-2 border rounded" value={reportConfig.teacherName} onChange={e => setReportConfig({...reportConfig, teacherName: e.target.value})}/></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">مدير المدرسة</label><input className="w-full p-2 border rounded" value={reportConfig.schoolManager} onChange={e => setReportConfig({...reportConfig, schoolManager: e.target.value})}/></div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">شعار المدرسة</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 relative">
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                    {reportConfig.logoBase64 ? <img src={reportConfig.logoBase64} alt="Logo" className="h-20 mx-auto object-contain"/> : <div className="text-gray-400 flex flex-col items-center"><Upload size={24} className="mb-2"/><span className="text-xs">اضغط لرفع الشعار</span></div>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-gray-800"><Palette size={20}/> مظهر النظام</h3>
                        <div className="flex gap-4 overflow-x-auto pb-2">
                            {['LIGHT', 'NATURE', 'OCEAN', 'SUNSET'].map(mode => (
                                <button key={mode} onClick={() => setUserTheme({...userTheme, mode: mode as any})} className={`flex-1 min-w-[100px] p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${userTheme.mode === mode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                                    {mode === 'LIGHT' ? <Sun size={24}/> : mode === 'NATURE' ? <Cloud size={24}/> : mode === 'OCEAN' ? <Monitor size={24}/> : <Sunset size={24}/>}
                                    <span className="text-sm font-bold">{mode}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button onClick={handleSaveSettings} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black shadow-lg mt-4 flex justify-center items-center gap-2"><Save size={20}/> حفظ الإعدادات</button>
                </div>
            )}
        </div>
    );
};