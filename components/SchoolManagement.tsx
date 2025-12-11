import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, School, SystemUser, Feedback, Subject, ScheduleItem, TeacherAssignment, ReportHeaderConfig, UserTheme, AcademicTerm, TermPeriod } from '../types';
import { 
    getTeachers, updateTeacher,
    getSchools, getSubjects, addSubject, deleteSubject,
    getSchedules, saveScheduleItem, deleteScheduleItem,
    getTeacherAssignments, saveTeacherAssignment, deleteTeacherAssignment,
    getReportHeaderConfig, saveReportHeaderConfig,
    getFeedback, addFeedback, addSchool, updateSchool,
    getUserTheme, saveUserTheme,
    getAcademicTerms, saveAcademicTerm, deleteAcademicTerm, setCurrentTerm,
    getExams, getLessonPlans, getWeeklyPlans
} from '../services/storageService';
import { formatDualDate } from '../services/dateService';
import { Trash2, User, Building2, Save, Users, Send, FileText, BookOpen, Settings, Clock, Palette, Sun, Sunset, CheckCircle, PlusCircle, LogOut, Loader2, Sparkles, LayoutGrid, AlertCircle, CalendarDays, ListTree, ChevronDown, ChevronRight, Plus, Activity, Edit } from 'lucide-react';

interface SchoolManagementProps {
    students: any[]; 
    onImportStudents: any;
    onImportPerformance: any;
    onImportAttendance: any;
    currentUser?: SystemUser | null;
    onUpdateTheme?: (theme: UserTheme) => void;
}

export const SchoolManagement: React.FC<SchoolManagementProps> = ({ currentUser, students, onImportStudents, onImportPerformance, onImportAttendance, onUpdateTheme }) => {
  const isManager = currentUser?.role === 'SCHOOL_MANAGER' || currentUser?.role === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TEACHERS' | 'SUBJECTS' | 'SCHEDULE' | 'SETTINGS' | 'CALENDAR'>(() => {
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
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportHeaderConfig>({
      schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: ''
  });
  const [userTheme, setUserTheme] = useState<UserTheme>({ mode: 'LIGHT', backgroundStyle: 'FLAT' });

  // --- UI States ---
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [newSubject, setNewSubject] = useState('');
  
  // Calendar UI State
  const [newTermName, setNewTermName] = useState('');
  const [newTermStart, setNewTermStart] = useState('');
  const [newTermEnd, setNewTermEnd] = useState('');
  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
  
  // Edit Term State
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);

  // New/Edit Period UI State
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  const [editingPeriod, setEditingPeriod] = useState<TermPeriod | null>(null);
  const [editingPeriodParentTerm, setEditingPeriodParentTerm] = useState<AcademicTerm | null>(null);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);

  // Schedule UI State
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
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- LOAD DATA ---
  useEffect(() => {
      if (currentUser) {
          setSubjects(getSubjects(currentUser.id));
          setReportConfig(getReportHeaderConfig(currentUser.id));
          setAcademicTerms(getAcademicTerms(currentUser.id));
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
      } else {
          // Robustly find the teacher profile
          let me: Teacher | undefined;
          if (currentUser?.id) {
              me = allTeachers.find(t => t.id === currentUser.id);
          }
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
  }, [currentUser, isManager, activeTab]); 

  // --- HELPERS ---
  const myTeachers = useMemo(() => {
      if (!mySchool) return [];
      return teachers.filter(t => t.schoolId === mySchool.id || t.managerId === currentUser?.nationalId);
  }, [teachers, mySchool, currentUser]);

  const getTeacherStats = (tId: string) => {
      const plans = getWeeklyPlans(tId).length;
      const exams = getExams(tId).length;
      const lessons = getLessonPlans(tId).length;
      return { plans, exams, lessons };
  };

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

  // --- TERM & PERIOD ACTIONS ---
  const handleAddTerm = () => {
      if (!newTermName || !newTermStart || !newTermEnd || !currentUser) {
          alert('يرجى تعبئة جميع بيانات الفصل الدراسي');
          return;
      }
      if (newTermStart > newTermEnd) {
          alert('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
          return;
      }
      
      const term: AcademicTerm = {
          id: Date.now().toString(),
          name: newTermName,
          startDate: newTermStart,
          endDate: newTermEnd,
          isCurrent: academicTerms.length === 0,
          teacherId: currentUser.id,
          periods: []
      };
      saveAcademicTerm(term);
      setAcademicTerms(getAcademicTerms(currentUser.id));
      setNewTermName(''); setNewTermStart(''); setNewTermEnd('');
  };

  const handleEditTerm = (term: AcademicTerm) => {
      setEditingTerm(term);
      setIsTermModalOpen(true);
  };

  const handleUpdateTerm = () => {
      if (!editingTerm) return;
      if (editingTerm.startDate > editingTerm.endDate) {
          alert('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
          return;
      }
      saveAcademicTerm(editingTerm);
      setAcademicTerms(getAcademicTerms(currentUser?.id));
      setIsTermModalOpen(false);
      setEditingTerm(null);
  };

  const handleAddPeriod = (term: AcademicTerm) => {
      if (!newPeriodName || !newPeriodStart || !newPeriodEnd) {
          alert('يرجى تعبئة بيانات الفترة');
          return;
      }
      if (newPeriodStart < term.startDate || newPeriodEnd > term.endDate) {
          alert(`تواريخ الفترة يجب أن تكون ضمن نطاق الفصل الدراسي (${term.startDate} - ${term.endDate})`);
          return;
      }
      if (newPeriodStart > newPeriodEnd) {
          alert('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
          return;
      }

      const period: TermPeriod = {
          id: Date.now().toString() + '_p',
          name: newPeriodName,
          startDate: newPeriodStart,
          endDate: newPeriodEnd
      };
      const updatedTerm = { ...term, periods: [...(term.periods || []), period] };
      saveAcademicTerm(updatedTerm);
      setAcademicTerms(getAcademicTerms(currentUser?.id));
      setNewPeriodName(''); setNewPeriodStart(''); setNewPeriodEnd('');
  };

  const handleEditPeriod = (term: AcademicTerm, period: TermPeriod) => {
      setEditingPeriodParentTerm(term);
      setEditingPeriod(period);
      setIsPeriodModalOpen(true);
  };

  const handleUpdatePeriod = () => {
      if (!editingPeriod || !editingPeriodParentTerm) return;
      const term = editingPeriodParentTerm;
      if (editingPeriod.startDate < term.startDate || editingPeriod.endDate > term.endDate) {
          alert(`تواريخ الفترة يجب أن تكون ضمن نطاق الفصل الدراسي (${term.startDate} - ${term.endDate})`);
          return;
      }
      if (editingPeriod.startDate > editingPeriod.endDate) {
          alert('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
          return;
      }

      const updatedPeriods = term.periods?.map(p => p.id === editingPeriod.id ? editingPeriod : p) || [];
      saveAcademicTerm({ ...term, periods: updatedPeriods });
      setAcademicTerms(getAcademicTerms(currentUser?.id));
      setIsPeriodModalOpen(false);
      setEditingPeriod(null);
      setEditingPeriodParentTerm(null);
  };

  const handleDeletePeriod = (term: AcademicTerm, periodId: string) => {
      if(confirm('حذف الفترة؟')) {
          const updatedPeriods = term.periods?.filter(p => p.id !== periodId) || [];
          saveAcademicTerm({ ...term, periods: updatedPeriods });
          setAcademicTerms(getAcademicTerms(currentUser?.id));
      }
  };

  const handleDeleteTerm = (id: string) => {
      if (confirm('حذف الفصل الدراسي؟ سيتم فقدان ارتباطه بالواجبات.')) {
          deleteAcademicTerm(id);
          setAcademicTerms(getAcademicTerms(currentUser?.id));
      }
  };

  const handleSetCurrentTerm = (id: string) => {
      if (currentUser) {
          setCurrentTerm(id, currentUser.id);
          setAcademicTerms(getAcademicTerms(currentUser.id));
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
      if (confirm(`هل تريد إزالة الفصل ${className} وجميع المواد المرتبطة به من قائمتك؟`)) {
          const toRemove = assignments.filter(a => (a.teacherId === currentUser.id || !a.teacherId) && a.classId === className);
          toRemove.forEach(a => deleteTeacherAssignment(a.id));
          const scheduleToRemove = schedules.filter(s => (s.teacherId === currentUser.id || !s.teacherId) && s.classId === className);
          scheduleToRemove.forEach(s => deleteScheduleItem(s.id));
          setAssignments(getTeacherAssignments());
          setSchedules(getSchedules());
      }
  };

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

  const handleAutoFillHeader = () => {
      const newConfig = { ...reportConfig };
      if (!newConfig.logoBase64) {
          newConfig.logoBase64 = "https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg";
      }
      if (currentUser) {
          const tName = teacherProfile?.name || currentUser.name;
          if (tName) newConfig.teacherName = tName;
          if (mySchool) {
              newConfig.schoolName = mySchool.name;
              newConfig.schoolManager = mySchool.managerName;
              if (mySchool.educationAdministration) newConfig.educationAdmin = mySchool.educationAdministration;
          }
      }
      if (!newConfig.academicYear) newConfig.academicYear = '1447هـ';
      if (!newConfig.term) newConfig.term = 'الفصل الدراسي الأول';
      setReportConfig(newConfig);
      alert('تم تعبئة البيانات والشعار الافتراضي بنجاح.');
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
          await updateTeacher(teacherProfile);
          if (linkMinistryCode) {
             const schools = getSchools();
             const targetSchool = schools.find(s => s.ministryCode === linkMinistryCode);
             if (targetSchool) {
                 const updated = { ...teacherProfile, schoolId: targetSchool.id, managerId: targetSchool.managerNationalId };
                 await updateTeacher(updated);
                 setTeacherProfile(updated);
                 setMySchool(targetSchool);
                 setLinkMinistryCode('');
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
      setFeedbackMsg('');
      alert('تم إرسال التوجيه بنجاح');
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const dayNamesAr = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-hidden">
        <div className="mb-6 flex overflow-x-auto gap-4 border-b border-gray-200 pb-2 bg-white p-2 rounded-xl shadow-sm">
            <button onClick={() => setActiveTab('DASHBOARD')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'DASHBOARD' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                <LayoutGrid size={16} className="inline mr-2"/> لوحة التحكم
            </button>
            {isManager && (
                <button onClick={() => setActiveTab('TEACHERS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'TEACHERS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                    <Users size={16} className="inline mr-2"/> المعلمين
                </button>
            )}
            <button onClick={() => setActiveTab('SUBJECTS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'SUBJECTS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                <BookOpen size={16} className="inline mr-2"/> {isManager ? 'إدارة المواد' : 'موادي وفصولي'}
            </button>
            <button onClick={() => setActiveTab('SCHEDULE')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'SCHEDULE' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                <Clock size={16} className="inline mr-2"/> الجدول الدراسي
            </button>
            <button onClick={() => setActiveTab('CALENDAR')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'CALENDAR' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                <CalendarDays size={16} className="inline mr-2"/> التقويم الدراسي
            </button>
            <button onClick={() => setActiveTab('SETTINGS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'SETTINGS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}>
                <Settings size={16} className="inline mr-2"/> {isManager ? 'إعدادات المدرسة' : 'الإعدادات الشخصية'}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'DASHBOARD' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-4 bg-indigo-50 rounded-full text-indigo-600"><Building2 size={32}/></div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">{mySchool ? mySchool.name : (isManager ? 'لم يتم ربط مدرسة بعد' : 'مرحباً أيها المعلم')}</h2>
                                {mySchool && <p className="text-gray-500">الرمز الوزاري: {mySchool.ministryCode}</p>}
                            </div>
                        </div>
                        {isManager && mySchool && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                    <h4 className="text-blue-800 font-bold mb-1">المعلمين</h4>
                                    <p className="text-2xl font-black text-blue-600">{myTeachers.length}</p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                    <h4 className="text-green-800 font-bold mb-1">الطلاب</h4>
                                    <p className="text-2xl font-black text-green-600">{students.filter(s => s.schoolId === mySchool.id).length}</p>
                                </div>
                            </div>
                        )}
                        {!isManager && teacherProfile && (
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                                <h3 className="font-bold text-lg mb-2">حالة الحساب</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="opacity-80 text-sm">الباقة الحالية</p>
                                        <p className="text-xl font-bold">{teacherProfile.subscriptionStatus === 'PRO' ? 'المعلم المحترف' : 'الأساسية (مجاني)'}</p>
                                    </div>
                                    {mySchool ? (
                                        <div className="flex-1 border-r border-white/20 pr-4">
                                            <p className="opacity-80 text-sm">المدرسة</p>
                                            <p className="font-bold">{mySchool.name}</p>
                                        </div>
                                    ) : (
                                        <div className="flex-1 border-r border-white/20 pr-4">
                                            <p className="opacity-80 text-sm text-yellow-300">غير مرتبط بمدرسة</p>
                                            <button onClick={() => setActiveTab('SETTINGS')} className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded mt-1">ربط الآن</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'CALENDAR' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><CalendarDays className="text-indigo-600"/> التقويم الدراسي</h3>
                            <p className="text-sm text-gray-500">تحديد الفصول الدراسية والفترات التابعة لها لضبط حساب الغياب والدرجات.</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-xs font-bold text-gray-600 mb-1">اسم الفصل الدراسي</label>
                            <input className="w-full p-2 border rounded-lg text-sm" placeholder="مثال: الفصل الدراسي الأول 1447" value={newTermName} onChange={e => setNewTermName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">تاريخ البداية</label>
                            <input type="date" className="p-2 border rounded-lg text-sm font-bold bg-white" value={newTermStart} onChange={e => setNewTermStart(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">تاريخ النهاية</label>
                            <input type="date" className="p-2 border rounded-lg text-sm font-bold bg-white" value={newTermEnd} onChange={e => setNewTermEnd(e.target.value)} />
                        </div>
                        <button onClick={handleAddTerm} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center gap-2">
                            <PlusCircle size={16}/> إضافة فصل
                        </button>
                    </div>

                    <div className="overflow-hidden border rounded-xl">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-indigo-50 text-indigo-900 font-bold">
                                <tr>
                                    <th className="p-3 w-10"></th>
                                    <th className="p-3">الفصل الدراسي</th>
                                    <th className="p-3">البداية (هجري/ميلادي)</th>
                                    <th className="p-3">النهاية (هجري/ميلادي)</th>
                                    <th className="p-3 text-center">الحالة</th>
                                    <th className="p-3 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y bg-white">
                                {academicTerms.map(term => (
                                    <React.Fragment key={term.id}>
                                        <tr className="hover:bg-gray-50 group">
                                            <td className="p-3 text-center cursor-pointer" onClick={() => setExpandedTermId(expandedTermId === term.id ? null : term.id)}>
                                                {expandedTermId === term.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                            </td>
                                            <td className="p-3 font-bold text-gray-800">{term.name} <span className="text-xs text-gray-400 font-normal">({term.periods?.length || 0} فترات)</span></td>
                                            <td className="p-3 text-xs text-gray-600">{formatDualDate(term.startDate)}</td>
                                            <td className="p-3 text-xs text-gray-600">{formatDualDate(term.endDate)}</td>
                                            <td className="p-3 text-center">
                                                {term.isCurrent ? (
                                                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 mx-auto w-fit">
                                                        <CheckCircle size={12}/> نشط
                                                    </span>
                                                ) : (
                                                    <button onClick={() => handleSetCurrentTerm(term.id)} className="text-gray-400 hover:text-indigo-600 text-xs font-bold border px-2 py-1 rounded hover:bg-indigo-50">
                                                        تنشيط
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleEditTerm(term)} className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50"><Edit size={16}/></button>
                                                    <button onClick={() => handleDeleteTerm(term.id)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedTermId === term.id && (
                                            <tr className="bg-gray-50/50">
                                                <td colSpan={6} className="p-4 border-t border-b">
                                                    <div className="pl-8 pr-4">
                                                        <h4 className="font-bold text-gray-700 mb-3 text-xs flex items-center gap-2"><ListTree size={14}/> الفترات التقويمية التابعة لـ {term.name}</h4>
                                                        
                                                        <div className="bg-white border rounded-lg p-3 mb-3 flex flex-wrap items-end gap-2 shadow-sm">
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-gray-500 block mb-1">اسم الفترة</label>
                                                                <input className="w-full p-1.5 border rounded text-xs" placeholder="مثال: الفترة الأولى" value={newPeriodName} onChange={e => setNewPeriodName(e.target.value)}/>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-500 block mb-1">من</label>
                                                                <input type="date" className="p-1.5 border rounded text-xs bg-white" value={newPeriodStart} onChange={e => setNewPeriodStart(e.target.value)}/>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-gray-500 block mb-1">إلى</label>
                                                                <input type="date" className="p-1.5 border rounded text-xs bg-white" value={newPeriodEnd} onChange={e => setNewPeriodEnd(e.target.value)}/>
                                                            </div>
                                                            <button onClick={() => handleAddPeriod(term)} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700">إضافة</button>
                                                        </div>

                                                        {term.periods && term.periods.length > 0 ? (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {term.periods.map(period => (
                                                                    <div key={period.id} className="flex justify-between items-center bg-white border rounded p-2 text-xs">
                                                                        <div>
                                                                            <span className="font-bold text-gray-800 block">{period.name}</span>
                                                                            <span className="text-gray-400 text-[10px]">{formatDualDate(period.startDate)} {' -> '} {formatDualDate(period.endDate)}</span>
                                                                        </div>
                                                                        <div className="flex gap-1">
                                                                            <button onClick={() => handleEditPeriod(term, period)} className="text-blue-400 hover:text-blue-600"><Edit size={14}/></button>
                                                                            <button onClick={() => handleDeletePeriod(term, period.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : <p className="text-xs text-gray-400 italic">لا توجد فترات مضافة لهذا الفصل.</p>}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {academicTerms.length === 0 && (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">لم يتم إضافة فصول دراسية بعد</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isTermModalOpen && editingTerm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4 text-gray-800">تعديل الفصل الدراسي</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">الاسم</label>
                                <input className="w-full p-2 border rounded" value={editingTerm.name} onChange={e => setEditingTerm({...editingTerm, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">البداية</label>
                                    <input type="date" className="w-full p-2 border rounded" value={editingTerm.startDate} onChange={e => setEditingTerm({...editingTerm, startDate: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">النهاية</label>
                                    <input type="date" className="w-full p-2 border rounded" value={editingTerm.endDate} onChange={e => setEditingTerm({...editingTerm, endDate: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsTermModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">إلغاء</button>
                            <button onClick={handleUpdateTerm} className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">حفظ التغييرات</button>
                        </div>
                    </div>
                </div>
            )}

            {isPeriodModalOpen && editingPeriod && editingPeriodParentTerm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4 text-gray-800">تعديل الفترة</h3>
                        <p className="text-xs text-gray-500 mb-4">يجب أن تكون التواريخ ضمن: {editingPeriodParentTerm.startDate} إلى {editingPeriodParentTerm.endDate}</p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">اسم الفترة</label>
                                <input className="w-full p-2 border rounded" value={editingPeriod.name} onChange={e => setEditingPeriod({...editingPeriod, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">البداية</label>
                                    <input type="date" className="w-full p-2 border rounded" value={editingPeriod.startDate} onChange={e => setEditingPeriod({...editingPeriod, startDate: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">النهاية</label>
                                    <input type="date" className="w-full p-2 border rounded" value={editingPeriod.endDate} onChange={e => setEditingPeriod({...editingPeriod, endDate: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsPeriodModalOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">إلغاء</button>
                            <button onClick={handleUpdatePeriod} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700">حفظ التغييرات</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'TEACHERS' && isManager && (
                <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myTeachers.map(teacher => {
                            const stats = getTeacherStats(teacher.id);
                            return (
                                <div key={teacher.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500"></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                                                {teacher.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">{teacher.name}</h4>
                                                <p className="text-xs text-gray-500">{teacher.subjectSpecialty || 'معلم عام'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                                        <div className="bg-gray-50 p-2 rounded">
                                            <span className="block font-bold text-gray-700">{stats.plans}</span>
                                            <span className="text-gray-400">تحضير</span>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded">
                                            <span className="block font-bold text-gray-700">{stats.exams}</span>
                                            <span className="text-gray-400">اختبارات</span>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded">
                                            <span className="block font-bold text-gray-700">{stats.lessons}</span>
                                            <span className="text-gray-400">دروس</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t flex gap-2">
                                        <button onClick={() => setViewingTeacher(teacher)} className="flex-1 bg-indigo-50 text-indigo-700 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center justify-center gap-1">
                                            <Send size={14}/> توجيه
                                        </button>
                                        <div className="px-2 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100 flex items-center gap-1">
                                            <Activity size={14}/> نشط
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {viewingTeacher && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                                <h3 className="font-bold text-lg mb-4">إرسال توجيه للمعلم: {viewingTeacher.name}</h3>
                                <textarea 
                                    className="w-full p-3 border rounded-lg h-32 text-sm mb-4 outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="اكتب ملاحظاتك هنا..."
                                    value={feedbackMsg}
                                    onChange={e => setFeedbackMsg(e.target.value)}
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setViewingTeacher(null)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">إلغاء</button>
                                    <button onClick={handleSendFeedback} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">إرسال</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'SUBJECTS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    {!isManager && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Users className="text-indigo-600"/> فصولي (إسناد سريع)</h3>
                            <div className="flex gap-2 mb-4">
                                <input 
                                    className="flex-1 p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors outline-none" 
                                    placeholder="اسم الفصل (مثال: 1/أ)" 
                                    value={newClassName}
                                    onChange={e => setNewClassName(e.target.value)}
                                />
                                <button onClick={handleAddQuickClass} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 flex items-center gap-1">
                                    <Plus size={16}/> إسناد
                                </button>
                            </div>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {myClassAssignments.length > 0 ? myClassAssignments.map(cls => (
                                    <div key={cls} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                                        <span className="font-bold text-gray-700">{cls}</span>
                                        <button onClick={() => handleRemoveClass(cls)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                )) : <p className="text-center text-gray-400 text-sm py-4">لم يتم إسناد فصول بعد</p>}
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><BookOpen className="text-indigo-600"/> المواد الدراسية</h3>
                        <div className="flex gap-2 mb-4">
                            <input 
                                className="flex-1 p-2 border rounded-lg text-sm bg-gray-50 focus:bg-white transition-colors outline-none" 
                                placeholder="اسم المادة..." 
                                value={newSubject}
                                onChange={e => setNewSubject(e.target.value)}
                            />
                            <button onClick={handleAddSubject} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-1">
                                <Plus size={16}/> إضافة
                            </button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {subjects.map(sub => (
                                <div key={sub.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors">
                                    <span className="font-bold text-gray-700">{sub.name}</span>
                                    <button onClick={() => handleDeleteSubject(sub.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            ))}
                            {subjects.length === 0 && <p className="text-center text-gray-400 text-sm py-4">لا توجد مواد مضافة</p>}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'SCHEDULE' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col animate-fade-in">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-lg border">
                            <select value={selectedClassForSchedule} onChange={e => setSelectedClassForSchedule(e.target.value)} className="bg-transparent font-bold text-gray-700 outline-none">
                                <option value="">-- اختر الفصل --</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            
                            <div className="h-6 w-[1px] bg-gray-300"></div>

                            <select value={activeSubject} onChange={e => setActiveSubject(e.target.value)} className="bg-transparent font-bold text-indigo-700 outline-none">
                                <option value="">-- اختر المادة --</option>
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto border rounded-xl">
                        <table className="w-full text-center text-sm border-collapse">
                            <thead className="bg-indigo-600 text-white sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 border border-indigo-500">اليوم / الحصة</th>
                                    {[1,2,3,4,5,6,7,8].map(p => <th key={p} className="p-3 border border-indigo-500">الحصة {p}</th>)}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {days.map(day => (
                                    <tr key={day} className="hover:bg-gray-50">
                                        <td className="p-3 font-bold border bg-gray-50 text-gray-700">{dayNamesAr[day as keyof typeof dayNamesAr]}</td>
                                        {[1,2,3,4,5,6,7,8].map(period => {
                                            const item = schedules.find(s => s.classId === selectedClassForSchedule && s.day === day && s.period === period);
                                            return (
                                                <td 
                                                    key={period} 
                                                    onClick={() => handleScheduleCellClick(day, period)}
                                                    className={`border p-2 cursor-pointer transition-all h-16 ${item ? 'bg-indigo-100 hover:bg-indigo-200' : 'hover:bg-gray-100'}`}
                                                >
                                                    {item ? (
                                                        <div className="font-bold text-indigo-800 text-xs">
                                                            {item.subjectName}
                                                            {item.teacherId && <div className="text-[10px] opacity-75 mt-1">{teachers.find(t=>t.id===item.teacherId)?.name}</div>}
                                                        </div>
                                                    ) : <span className="text-gray-200 text-lg">+</span>}
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

            {activeTab === 'SETTINGS' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b pb-2 text-gray-800">
                            <FileText className="text-indigo-600"/> إعدادات الترويسة (التقارير)
                        </h3>
                        
                        <button 
                            onClick={handleAutoFillHeader}
                            className="mb-6 w-full py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
                        >
                            <Sparkles size={18}/> تعبئة تلقائية (بياناتي + الشعار الرسمي)
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">اسم المدرسة</label>
                                <input className="w-full p-2 border rounded bg-gray-50 focus:bg-white transition-colors" value={reportConfig.schoolName} onChange={e => setReportConfig({...reportConfig, schoolName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">إدارة التعليم</label>
                                <input className="w-full p-2 border rounded bg-gray-50 focus:bg-white transition-colors" value={reportConfig.educationAdmin} onChange={e => setReportConfig({...reportConfig, educationAdmin: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">اسم المعلم</label>
                                <input className="w-full p-2 border rounded bg-gray-50 focus:bg-white transition-colors" value={reportConfig.teacherName} onChange={e => setReportConfig({...reportConfig, teacherName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">مدير المدرسة</label>
                                <input className="w-full p-2 border rounded bg-gray-50 focus:bg-white transition-colors" value={reportConfig.schoolManager} onChange={e => setReportConfig({...reportConfig, schoolManager: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">العام الدراسي</label>
                                <input className="w-full p-2 border rounded bg-gray-50 focus:bg-white transition-colors" value={reportConfig.academicYear} onChange={e => setReportConfig({...reportConfig, academicYear: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">الفصل الدراسي</label>
                                <input className="w-full p-2 border rounded bg-gray-50 focus:bg-white transition-colors" value={reportConfig.term} onChange={e => setReportConfig({...reportConfig, term: e.target.value})} />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">شعار المدرسة / الوزارة</label>
                            <div className="flex items-center gap-4">
                                {reportConfig.logoBase64 && (
                                    <img src={reportConfig.logoBase64} alt="Logo" className="h-16 w-16 object-contain border rounded p-1 bg-white" />
                                )}
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                            </div>
                        </div>
                    </div>

                    {!isManager && teacherProfile && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b pb-2 text-gray-800">
                                <User className="text-indigo-600"/> البيانات الشخصية والربط
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">الاسم</label>
                                    <input className="w-full p-2 border rounded bg-gray-50" value={teacherProfile.name} onChange={e => setTeacherProfile({...teacherProfile, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">رقم الهوية (أساسي للربط)</label>
                                    <input className="w-full p-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed" value={teacherProfile.nationalId} readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">رقم الجوال</label>
                                    <input className="w-full p-2 border rounded bg-gray-50" value={teacherProfile.phone || ''} onChange={e => setTeacherProfile({...teacherProfile, phone: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">التخصص</label>
                                    <input className="w-full p-2 border rounded bg-gray-50" value={teacherProfile.subjectSpecialty || ''} onChange={e => setTeacherProfile({...teacherProfile, subjectSpecialty: e.target.value})} />
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-4">
                                {mySchool ? (
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-green-800 flex items-center gap-2"><CheckCircle size={16}/> مرتبط بمدرسة: {mySchool.name}</p>
                                            <p className="text-xs text-green-600 mt-1">المدير: {mySchool.managerName}</p>
                                        </div>
                                        <button onClick={handleUnlinkSchool} className="text-red-500 text-xs font-bold hover:underline flex items-center gap-1"><LogOut size={12}/> مغادرة</button>
                                    </div>
                                ) : (
                                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                        <p className="font-bold text-yellow-800 mb-2 flex items-center gap-2"><AlertCircle size={16}/> غير مرتبط بمدرسة</p>
                                        <div className="flex gap-2">
                                            <input 
                                                placeholder="أدخل الرمز الوزاري للمدرسة" 
                                                className="flex-1 p-2 border rounded text-sm outline-none font-mono uppercase"
                                                value={linkMinistryCode}
                                                onChange={e => setLinkMinistryCode(e.target.value)}
                                            />
                                        </div>
                                        {linkStatus && !linkStatus.success && <p className="text-red-500 text-xs mt-2">{linkStatus.msg}</p>}
                                        
                                        {showNewSchoolForm && (
                                            <div className="mt-3 space-y-2 animate-fade-in bg-white p-3 rounded border">
                                                <input className="w-full p-2 border rounded text-xs" placeholder="اسم المدرسة" value={newSchoolData.name} onChange={e => setNewSchoolData({...newSchoolData, name: e.target.value})}/>
                                                <input className="w-full p-2 border rounded text-xs" placeholder="اسم المدير" value={newSchoolData.managerName} onChange={e => setNewSchoolData({...newSchoolData, managerName: e.target.value})}/>
                                                <input className="w-full p-2 border rounded text-xs" placeholder="هوية المدير (للربط)" value={newSchoolData.managerId} onChange={e => setNewSchoolData({...newSchoolData, managerId: e.target.value})}/>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b pb-2 text-gray-800">
                            <Palette className="text-indigo-600"/> مظهر التطبيق
                        </h3>
                        <div className="flex gap-4">
                            <button onClick={() => setUserTheme({...userTheme, mode: 'LIGHT'})} className={`p-4 rounded-xl border flex flex-col items-center gap-2 w-24 ${userTheme.mode === 'LIGHT' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <Sun size={24}/> فاتح
                            </button>
                            <button onClick={() => setUserTheme({...userTheme, mode: 'DARK'})} className={`p-4 rounded-xl border flex flex-col items-center gap-2 w-24 ${userTheme.mode === 'DARK' ? 'border-indigo-500 bg-gray-800 text-white font-bold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <Sunset size={24}/> داكن
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4 pb-8">
                        <button 
                            onClick={() => { handleSaveSettings(); if(!isManager) handleTeacherSaveProfile(); }} 
                            disabled={isSavingProfile}
                            className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSavingProfile ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ جميع التغييرات
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
