
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
import { Trash2, User, Building2, Save, Users, Send, FileText, BookOpen, Settings, Upload, Clock, Palette, Sun, Cloud, Monitor, Sunset, CheckCircle, Info, PlusCircle, MapPin, Lock, CreditCard, Eye, EyeOff, LogOut, ShieldCheck, Loader2 } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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
          // Robustly find the teacher profile
          let me: Teacher | undefined;
          if (currentUser?.id) {
              me = allTeachers.find(t => t.id === currentUser.id);
          }
          // Fallback to loose matching if ID fails (legacy support)
          if (!me) {
              me = allTeachers.find(t => 
                  (currentUser?.nationalId && t.nationalId === currentUser.nationalId) || 
                  (currentUser?.email && t.email === currentUser.email)
              );
          }

          if (me) {
              setTeacherProfile(me);
              setActiveTeacher(me.id);
              if (me.schoolId) {
                  const schools = getSchools();
                  const school = schools.find(s => s.id === me.schoolId);
                  setMySchool(school || null);
              } else {
                  setMySchool(null);
              }
          }
      }
  }, [currentUser, isManager, activeTab]); // Refresh when tab changes to ensure fresh data

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

  const handleUnlinkSchool = () => {
      if (!teacherProfile) return;
      if (confirm('هل أنت متأكد من مغادرة المدرسة الحالية؟')) {
          const updated = { ...teacherProfile, schoolId: undefined, managerId: undefined };
          updateTeacher(updated);
          setTeacherProfile(updated);
          setMySchool(null);
          alert('تم فك الارتباط بالمدرسة.');
      }
  };

  const handleTeacherSaveProfile = async () => {
      if (!teacherProfile) return;
      if (!teacherProfile.nationalId) return alert('رقم الهوية مطلوب.');
      
      setIsSavingProfile(true);
      
      try {
          // 1. Update basic profile
          await updateTeacher(teacherProfile);
          
          // 2. Handle Linking
          if (linkMinistryCode) {
             const schools = getSchools();
             const targetSchool = schools.find(s => s.ministryCode === linkMinistryCode);
             
             if (targetSchool) {
                 const updated = { ...teacherProfile, schoolId: targetSchool.id, managerId: targetSchool.managerNationalId };
                 await updateTeacher(updated);
                 setTeacherProfile(updated);
                 setMySchool(targetSchool);
                 setLinkMinistryCode(''); // clear after link
                 alert(`تم ربط حسابك بمدرسة: ${targetSchool.name}`);
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
                 await addSchool(newSchool);
                 const updated = { ...teacherProfile, schoolId: newSchool.id, managerId: newSchoolData.managerId };
                 await updateTeacher(updated);
                 setTeacherProfile(updated);
                 setMySchool(newSchool);
                 setLinkMinistryCode('');
                 setShowNewSchoolForm(false);
                 alert('تم إنشاء المدرسة وربط الحساب!');
             } else {
                 setLinkStatus({ success: false, msg: 'المدرسة غير موجودة. يرجى إدخال بياناتها لإنشائها.' });
                 setShowNewSchoolForm(true);
             }
          } else {
              alert('تم حفظ البيانات الشخصية بنجاح.');
          }
      } catch (e) {
          console.error(e);
          alert('حدث خطأ أثناء الحفظ.');
      } finally {
          setIsSavingProfile(false);
      }
  };

  const handleSendFeedback = () => {
      if (!feedbackMsg || !viewingTeacher || !currentUser) return;
      
      const feedback: Feedback = {
          id: Date.now().toString(),
          teacherId: viewingTeacher.id,
          managerId: currentUser.id,
          content: feedbackMsg,
          date: new Date().toISOString(),
          isRead: false
      };
      
      addFeedback(feedback);
      setFeedbackList(getFeedback());
      setFeedbackMsg('');
      alert('تم إرسال التوجيه بنجاح');
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const dayNamesAr = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  // --- RENDER TEACHER PROFILE FORM ---
  const renderTeacherProfileForm = () => {
      if (!teacherProfile) return null;
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 animate-fade-in overflow-hidden">
            {/* Header / Cover */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 h-32 relative">
                <div className="absolute -bottom-10 right-8">
                    <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md">
                        <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                            <User size={48} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 pt-12">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800">{teacherProfile.name}</h3>
                        <p className="text-gray-500">{teacherProfile.subjectSpecialty || 'تخصص غير محدد'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 ${teacherProfile.subscriptionStatus === 'PRO' ? 'bg-indigo-100 text-indigo-700' : teacherProfile.subscriptionStatus === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            <CreditCard size={14}/>
                            {teacherProfile.subscriptionStatus === 'PRO' ? 'باقة المحترفين' : teacherProfile.subscriptionStatus === 'ENTERPRISE' ? 'باقة المؤسسات' : 'الباقة المجانية'}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Column 1: Personal Info */}
                    <div className="space-y-6">
                        <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><User size={18}/> البيانات الشخصية</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">الاسم الرباعي</label>
                                <input 
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" 
                                    value={teacherProfile.name} 
                                    onChange={e => setTeacherProfile({...teacherProfile, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">التخصص</label>
                                <input 
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" 
                                    value={teacherProfile.subjectSpecialty || ''} 
                                    onChange={e => setTeacherProfile({...teacherProfile, subjectSpecialty: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">رقم الهوية</label>
                                    <input 
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono bg-gray-50" 
                                        value={teacherProfile.nationalId || ''} 
                                        onChange={e => setTeacherProfile({...teacherProfile, nationalId: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">رقم الجوال</label>
                                    <input 
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono dir-ltr text-right" 
                                        value={teacherProfile.phone || ''} 
                                        onChange={e => setTeacherProfile({...teacherProfile, phone: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Account & School */}
                    <div className="space-y-6">
                        <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><ShieldCheck size={18}/> بيانات الحساب والمدرسة</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">البريد الإلكتروني (اسم المستخدم)</label>
                                <input 
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm dir-ltr" 
                                    value={teacherProfile.email || ''} 
                                    onChange={e => setTeacherProfile({...teacherProfile, email: e.target.value})}
                                />
                            </div>
                            <div className="relative">
                                <label className="block text-xs font-bold text-gray-500 mb-1">كلمة المرور</label>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono pr-10" 
                                    value={teacherProfile.password || ''} 
                                    onChange={e => setTeacherProfile({...teacherProfile, password: e.target.value})}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-8 text-gray-400 hover:text-gray-600">
                                    {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                </button>
                            </div>
                        </div>

                        {/* School Linking Card */}
                        <div className={`rounded-xl border p-4 transition-all ${mySchool ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:border-blue-300'}`}>
                            {mySchool ? (
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-100 p-2 rounded-lg text-green-700"><Building2 size={24}/></div>
                                        <div>
                                            <p className="font-bold text-green-800 text-sm">{mySchool.name}</p>
                                            <p className="text-xs text-green-600 mt-0.5">رمز وزاري: {mySchool.ministryCode}</p>
                                        </div>
                                    </div>
                                    <button onClick={handleUnlinkSchool} className="text-red-500 bg-white border border-red-100 hover:bg-red-50 p-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-sm">
                                        <LogOut size={14}/> مغادرة
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-gray-700 flex items-center gap-2"><Info size={16} className="text-blue-500"/> الانضمام لمدرسة</p>
                                    <div className="flex gap-2">
                                        <input 
                                            className="flex-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-white" 
                                            placeholder="أدخل الرمز الوزاري..." 
                                            value={linkMinistryCode} 
                                            onChange={e => {
                                                setLinkMinistryCode(e.target.value);
                                                setLinkStatus(null);
                                                setShowNewSchoolForm(false);
                                            }}
                                        />
                                    </div>
                                    
                                    {/* New School Form */}
                                    {showNewSchoolForm && (
                                        <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm animate-fade-in space-y-3">
                                            {linkStatus && <p className="text-xs text-red-500 font-bold">{linkStatus.msg}</p>}
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">اسم المدرسة الجديد</label>
                                                <input className="w-full p-2 border rounded-lg text-sm" value={newSchoolData.name} onChange={e => setNewSchoolData({...newSchoolData, name: e.target.value})} placeholder="مدرسة..." />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input className="w-full p-2 border rounded-lg text-xs" value={newSchoolData.managerName} onChange={e => setNewSchoolData({...newSchoolData, managerName: e.target.value})} placeholder="اسم المدير" />
                                                <input className="w-full p-2 border rounded-lg text-xs font-mono" value={newSchoolData.managerId} onChange={e => setNewSchoolData({...newSchoolData, managerId: e.target.value})} placeholder="هوية المدير" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={handleTeacherSaveProfile} 
                        disabled={isSavingProfile}
                        className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black flex items-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSavingProfile ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                        {isSavingProfile ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                </div>
            </div>
        </div>
      );
  };

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
                <div className="max-w-5xl mx-auto space-y-6">
                    {!isManager && renderTeacherProfileForm()}
                </div>
            )}

            {/* TEACHERS TAB (For Manager) */}
            {activeTab === 'TEACHERS' && isManager && (
                <div className="max-w-6xl mx-auto flex gap-6 h-full min-h-[500px]">
                    {/* Teacher List */}
                    <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                        <div className="p-4 border-b bg-purple-50">
                            <h3 className="font-bold text-purple-800">قائمة المعلمين ({myTeachers.length})</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {myTeachers.map(teacher => (
                                <div 
                                    key={teacher.id} 
                                    onClick={() => setViewingTeacher(teacher)}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 border ${viewingTeacher?.id === teacher.id ? 'bg-purple-100 border-purple-300' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                                >
                                    <div className="font-bold text-gray-800">{teacher.name}</div>
                                    <div className="text-xs text-gray-500">{teacher.subjectSpecialty}</div>
                                </div>
                            ))}
                            {myTeachers.length === 0 && <p className="text-center text-gray-400 py-4">لا يوجد معلمين مرتبطين.</p>}
                        </div>
                    </div>

                    {/* Teacher Details & Feedback */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                        {viewingTeacher ? (
                            <>
                                <div className="flex justify-between items-start mb-6 border-b pb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-800">{viewingTeacher.name}</h2>
                                        <p className="text-gray-500">{viewingTeacher.email}</p>
                                        <div className="mt-2 flex gap-2">
                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">{viewingTeacher.subjectSpecialty}</span>
                                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">{viewingTeacher.phone}</span>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 p-2 rounded text-center">
                                        <p className="text-xs text-gray-500">عدد الحصص</p>
                                        <p className="font-bold text-xl">{schedules.filter(s => s.teacherId === viewingTeacher.id).length}</p>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col">
                                    <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Send size={16}/> إرسال توجيه / ملاحظة</h4>
                                    <textarea 
                                        className="w-full p-3 border rounded-lg flex-1 resize-none focus:ring-2 focus:ring-purple-500 outline-none bg-gray-50"
                                        placeholder="اكتب رسالة للمعلم..."
                                        value={feedbackMsg}
                                        onChange={e => setFeedbackMsg(e.target.value)}
                                    />
                                    <div className="mt-4 flex justify-end">
                                        <button 
                                            onClick={handleSendFeedback}
                                            disabled={!feedbackMsg.trim()}
                                            className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            <Send size={16}/> إرسال
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6 border-t pt-4">
                                    <h4 className="font-bold text-gray-700 mb-2 text-sm">سجل التوجيهات السابق</h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                        {feedbackList.filter(f => f.teacherId === viewingTeacher.id).map(f => (
                                            <div key={f.id} className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-100">
                                                <p className="text-gray-800 mb-1">{f.content}</p>
                                                <div className="flex justify-between text-xs text-gray-400">
                                                    <span>{new Date(f.date).toLocaleDateString('ar-SA')}</span>
                                                    <span>{f.isRead ? 'تمت القراءة' : 'غير مقروء'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <p>اختر معلماً من القائمة لعرض التفاصيل</p>
                            </div>
                        )}
                    </div>
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
