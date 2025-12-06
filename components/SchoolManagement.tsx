
import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, School, SystemUser, Feedback, Subject, ScheduleItem, TeacherAssignment, ReportHeaderConfig } from '../types';
import { 
    getTeachers, addTeacher, updateTeacher,
    getSchools, getSubjects, addSubject, deleteSubject,
    getSchedules, saveScheduleItem, deleteScheduleItem,
    getTeacherAssignments, saveTeacherAssignment,
    getReportHeaderConfig, saveReportHeaderConfig,
    getFeedback, addFeedback, addSchool,
    generateEntityColor
} from '../services/storageService';
import { Trash2, User, Building2, Save, Users, AlertCircle, CheckCircle, Search, Mail, Send, FileText, Lock, ShieldCheck, Calendar, BookOpen, Settings, Upload, Copy, Grid, Clock, Link as LinkIcon, Unlink, Phone, Edit, PlusCircle, AlertTriangle, Monitor, Eraser, CheckSquare } from 'lucide-react';

interface SchoolManagementProps {
    students: any[]; 
    onImportStudents: any;
    onImportPerformance: any;
    onImportAttendance: any;
    currentUser?: SystemUser | null;
}

const SchoolManagement: React.FC<SchoolManagementProps> = ({ currentUser, students }) => {
  // Determine Role: Super Admin or School Manager gets full access
  const isManager = currentUser?.role === 'SCHOOL_MANAGER' || currentUser?.role === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PROFILE' | 'TEACHERS' | 'SUBJECTS' | 'SCHEDULE' | 'SETTINGS'>(() => {
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

  // --- UI States ---
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [newSubject, setNewSubject] = useState('');
  
  // Schedule UI State
  const [scheduleViewMode, setScheduleViewMode] = useState<'CLASS' | 'TEACHER'>('CLASS');
  const [selectedClassForSchedule, setSelectedClassForSchedule] = useState('');
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState(''); // For View 2
  
  // NEW: Active Context for "Click-to-Assign"
  const [activeSubject, setActiveSubject] = useState('');
  const [activeTeacher, setActiveTeacher] = useState('');

  // Teacher Profile State (For Teacher View)
  const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null);
  const [linkMinistryCode, setLinkMinistryCode] = useState('');
  const [linkStatus, setLinkStatus] = useState<{success: boolean, msg: string} | null>(null);
  const [linkedManagerSchool, setLinkedManagerSchool] = useState<School | null>(null);
  
  // New School Creation State (During Link)
  const [showNewSchoolForm, setShowNewSchoolForm] = useState(false);
  const [newSchoolData, setNewSchoolData] = useState({ name: '', managerName: '', managerId: '' });

  // --- LOAD DATA ---
  useEffect(() => {
      // Common Data Load
      setSubjects(getSubjects());
      setSchedules(getSchedules());
      setAssignments(getTeacherAssignments());
      setReportConfig(getReportHeaderConfig());

      const allTeachers = getTeachers();
      setTeachers(allTeachers);

      if (isManager) {
          const allSchools = getSchools();
          // Find school managed by this user
          let school = allSchools.find(s => s.managerNationalId === currentUser?.nationalId || s.managerName === currentUser?.name);
          // Fallback for Super Admin
          if (!school && currentUser?.role === 'SUPER_ADMIN' && allSchools.length > 0) {
              school = allSchools[0];
          }
          setMySchool(school || null);
          setFeedbackList(getFeedback());
      } else {
          // Teacher View Load
          const me = allTeachers.find(t => 
              (currentUser?.nationalId && t.nationalId === currentUser.nationalId) || 
              (currentUser?.email && t.email === currentUser.email)
          );
          if (me) {
              setTeacherProfile(me);
              // Auto-select active teacher for schedule building
              setActiveTeacher(me.id);
              setSelectedTeacherForSchedule(me.id); // Auto-select for full view
              
              // Check if linked to school to show manager details
              if (me.schoolId) {
                  const schools = getSchools();
                  const school = schools.find(s => s.id === me.schoolId);
                  setLinkedManagerSchool(school || null);
                  setMySchool(school || null); // Load school context for teacher too
              }
          } else {
              // Temporary profile for new session
              setTeacherProfile({
                  id: currentUser?.id || Date.now().toString(),
                  name: currentUser?.name || 'معلم جديد',
                  email: currentUser?.email,
                  nationalId: currentUser?.nationalId,
                  password: currentUser?.nationalId ? currentUser.nationalId.slice(-4) : '1234'
              });
              // Ensure we have an ID for schedule
              setActiveTeacher(currentUser?.id || '');
          }
      }
  }, [currentUser, isManager]);

  // --- MANAGER: FILTERED DATA ---
  const myTeachers = useMemo(() => {
      if (!mySchool) return [];
      return teachers.filter(t => t.schoolId === mySchool.id || t.managerId === currentUser?.nationalId);
  }, [teachers, mySchool, currentUser]);

  const uniqueClasses = useMemo(() => {
      const classes = new Set<string>();
      students.forEach(s => s.className && classes.add(s.className));
      return Array.from(classes).sort();
  }, [students]);

  // --- ACTIONS: SUBJECTS ---
  const handleAddSubject = () => {
      if (newSubject.trim()) {
          addSubject({ id: Date.now().toString(), name: newSubject.trim() });
          setSubjects(getSubjects());
          setNewSubject('');
      }
  };

  const handleDeleteSubject = (id: string) => {
      if (confirm('حذف المادة؟')) {
          deleteSubject(id);
          setSubjects(getSubjects());
      }
  };

  // --- HELPER: CHECK TEACHER CONFLICT ---
  const checkTeacherConflict = (teacherId: string, day: string, period: number, ignoreClassId?: string): { conflict: boolean, className?: string } => {
      if (!teacherId) return { conflict: false };

      // Find all schedule items for this day/period across ALL classes
      const concurrentSessions = schedules.filter(s => s.day === day && s.period === period && s.classId !== ignoreClassId);
      
      for (const session of concurrentSessions) {
          // If the scheduled item has this teacher ID directly
          if (session.teacherId === teacherId) {
              return { conflict: true, className: session.classId };
          }
          
          // Legacy check: Check assignments table if teacherId is missing on schedule item
          if (!session.teacherId) {
              const assignment = assignments.find(a => a.classId === session.classId && a.subjectName === session.subjectName);
              if (assignment && assignment.teacherId === teacherId) {
                  return { conflict: true, className: session.classId };
              }
          }
      }
      return { conflict: false };
  };

  // --- ACTIONS: CLICK TO ASSIGN (NEW LOGIC) ---
  const handleScheduleCellClick = (day: string, period: number) => {
      if (!selectedClassForSchedule) {
          alert("الرجاء اختيار الفصل أولاً");
          return;
      }
      if (!activeSubject) {
          alert("الرجاء اختيار المادة من القائمة العلوية أولاً");
          return;
      }
      
      const existingItem = schedules.find(s => s.classId === selectedClassForSchedule && s.day === day && s.period === period);

      // 1. TOGGLE OFF (Delete)
      // If clicking same subject (and teacher matches if set), delete it
      if (existingItem && existingItem.subjectName === activeSubject) {
          deleteScheduleItem(existingItem.id);
          setSchedules(getSchedules()); // Refresh
          return;
      }

      // 2. ADD / OVERWRITE
      // Check Conflict
      if (activeTeacher) {
          const conflict = checkTeacherConflict(activeTeacher, day, period, selectedClassForSchedule);
          if (conflict.conflict) {
              alert(`❌ تعارض: المعلم مشغول في هذا الوقت مع فصل "${conflict.className}".`);
              return;
          }
      }

      // Create/Update Schedule Item
      const newItem: ScheduleItem = {
          id: `${selectedClassForSchedule}-${day}-${period}`,
          classId: selectedClassForSchedule,
          day: day as any,
          period,
          subjectName: activeSubject,
          teacherId: activeTeacher || undefined
      };

      saveScheduleItem(newItem);

      // Also ensure TeacherAssignment exists to link subject to teacher for this class permanently
      if (activeTeacher) {
          const assignment: TeacherAssignment = {
              id: `${selectedClassForSchedule}-${activeSubject}`,
              classId: selectedClassForSchedule,
              subjectName: activeSubject,
              teacherId: activeTeacher
          };
          saveTeacherAssignment(assignment);
          setAssignments(getTeacherAssignments());
      }

      setSchedules(getSchedules());
  };

  // --- ACTIONS: REPORT SETTINGS ---
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
      saveReportHeaderConfig(reportConfig);
      alert('تم حفظ إعدادات التقارير بنجاح');
  };

  // --- ACTIONS: FEEDBACK (Manager Only) ---
  const handleSendFeedback = () => {
      if (!viewingTeacher || !feedbackMsg.trim()) return;
      const newFeedback: Feedback = {
          id: Date.now().toString(),
          teacherId: viewingTeacher.id,
          managerId: currentUser?.id || 'manager',
          content: feedbackMsg,
          date: new Date().toISOString(),
          isRead: false
      };
      addFeedback(newFeedback);
      setFeedbackList(prev => [...prev, newFeedback]);
      setFeedbackMsg('');
      alert('تم إرسال التغذية الراجعة.');
  };

  // --- ACTIONS: TEACHER PROFILE & LINKING ---
  const handleTeacherSaveProfile = () => {
      if (teacherProfile) {
          if (!teacherProfile.nationalId) {
              alert('رقم الهوية مطلوب.');
              return;
          }
          // Update basic info
          updateTeacher(teacherProfile);
          
          // Handle Linking Logic if Code entered
          if (linkMinistryCode) {
             const schools = getSchools();
             const targetSchool = schools.find(s => s.ministryCode === linkMinistryCode);
             if (targetSchool) {
                 const updated = { ...teacherProfile, schoolId: targetSchool.id, managerId: targetSchool.managerNationalId };
                 updateTeacher(updated);
                 setTeacherProfile(updated);
                 setMySchool(targetSchool); // Update local context
                 alert('تم ربط حسابك بالمدرسة بنجاح!');
             } else {
                 if (showNewSchoolForm && newSchoolData.name) {
                     // Create School
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
                     return;
                 }
             }
          } else {
              alert('تم حفظ البيانات الشخصية.');
          }
      }
  };

  // Render Helpers
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
  const dayNamesAr = { 'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس' };
  const periods = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Settings size={28} className="text-gray-600"/>
                {isManager ? 'إدارة المدرسة والمعلمين' : 'إعدادات المعلم'}
            </h1>
            
            {/* TABS */}
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
                    <BookOpen size={16}/> المواد
                </button>
                <button onClick={() => setActiveTab('SCHEDULE')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'SCHEDULE' ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}>
                    <Clock size={16}/> الجدول المدرسي
                </button>
                <button onClick={() => setActiveTab('SETTINGS')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${activeTab === 'SETTINGS' ? 'bg-orange-50 text-orange-700' : 'text-gray-500'}`}>
                    <FileText size={16}/> إعدادات التقارير
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto">
            {/* --- TAB: DASHBOARD / PROFILE --- */}
            {activeTab === 'DASHBOARD' && (
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Teacher Profile View */}
                    {!isManager && teacherProfile && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User size={20}/> بياناتي</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">الاسم</label>
                                    <input className="w-full p-2 border rounded" value={teacherProfile.name} onChange={e => setTeacherProfile({...teacherProfile, name: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">البريد الإلكتروني</label>
                                    <input className="w-full p-2 border rounded" value={teacherProfile.email || ''} onChange={e => setTeacherProfile({...teacherProfile, email: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">رقم الجوال</label>
                                    <input className="w-full p-2 border rounded" value={teacherProfile.phone || ''} onChange={e => setTeacherProfile({...teacherProfile, phone: e.target.value})}/>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">التخصص</label>
                                    <input className="w-full p-2 border rounded" value={teacherProfile.subjectSpecialty || ''} onChange={e => setTeacherProfile({...teacherProfile, subjectSpecialty: e.target.value})}/>
                                </div>
                            </div>

                            {/* School Linking Section */}
                            <div className="mt-6 pt-6 border-t">
                                <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Building2 size={18}/> المدرسة التابعة</h4>
                                {mySchool ? (
                                    <div className="bg-green-50 p-4 rounded-lg border border-green-200 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-green-800">{mySchool.name}</p>
                                            <p className="text-xs text-green-600">المدير: {mySchool.managerName}</p>
                                        </div>
                                        <CheckCircle className="text-green-600"/>
                                    </div>
                                ) : (
                                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                        <p className="text-sm text-orange-800 mb-2 font-bold">لست مرتبطاً بأي مدرسة حالياً.</p>
                                        <div className="flex gap-2 mb-2">
                                            <input 
                                                className="flex-1 p-2 border rounded text-sm" 
                                                placeholder="أدخل الرمز الوزاري للمدرسة..."
                                                value={linkMinistryCode}
                                                onChange={e => setLinkMinistryCode(e.target.value)}
                                            />
                                        </div>
                                        
                                        {/* New School Form (Conditional) */}
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

                            <button onClick={handleTeacherSaveProfile} className="mt-6 w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 flex justify-center items-center gap-2">
                                <Save size={18}/> حفظ التغييرات
                            </button>
                        </div>
                    )}

                    {/* Feedback Inbox (For Teachers) */}
                    {!isManager && feedbackList.length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Mail size={20}/> رسائل الإدارة</h3>
                            <div className="space-y-3">
                                {feedbackList.map(f => (
                                    <div key={f.id} className="p-3 bg-gray-50 rounded border border-gray-100 text-sm">
                                        <p className="text-gray-800 mb-1">{f.content}</p>
                                        <span className="text-xs text-gray-400">{new Date(f.date).toLocaleDateString('ar-SA')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Manager Dashboard */}
                    {isManager && mySchool && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Building2 size={20}/> معلومات المدرسة</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-gray-50 rounded border">
                                    <span className="block text-gray-500 text-xs">اسم المدرسة</span>
                                    <span className="font-bold">{mySchool.name}</span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded border">
                                    <span className="block text-gray-500 text-xs">الرمز الوزاري</span>
                                    <span className="font-bold">{mySchool.ministryCode}</span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded border">
                                    <span className="block text-gray-500 text-xs">المدير</span>
                                    <span className="font-bold">{mySchool.managerName}</span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded border">
                                    <span className="block text-gray-500 text-xs">عدد المعلمين</span>
                                    <span className="font-bold">{teachers.filter(t => t.schoolId === mySchool.id).length}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- TAB: TEACHERS (Manager Only) --- */}
            {activeTab === 'TEACHERS' && isManager && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                    {/* List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:col-span-1">
                        <div className="p-4 border-b bg-gray-50 font-bold text-gray-700">قائمة المعلمين</div>
                        <div className="flex-1 overflow-y-auto">
                            {myTeachers.length > 0 ? myTeachers.map(t => (
                                <div 
                                    key={t.id} 
                                    onClick={() => setViewingTeacher(t)}
                                    className={`p-4 border-b cursor-pointer hover:bg-purple-50 transition-colors ${viewingTeacher?.id === t.id ? 'bg-purple-50 border-l-4 border-l-purple-600' : ''}`}
                                >
                                    <div className="font-bold text-gray-800">{t.name}</div>
                                    <div className="text-xs text-gray-500">{t.subjectSpecialty || 'غير محدد'}</div>
                                </div>
                            )) : <div className="p-8 text-center text-gray-400">لا يوجد معلمين مرتبطين</div>}
                        </div>
                    </div>

                    {/* Details & Feedback */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 md:col-span-2 p-6">
                        {viewingTeacher ? (
                            <div className="space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800">{viewingTeacher.name}</h3>
                                        <p className="text-gray-500">{viewingTeacher.email}</p>
                                    </div>
                                    <div className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">
                                        {viewingTeacher.subjectSpecialty}
                                    </div>
                                </div>

                                <div className="border-t pt-6">
                                    <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Send size={18}/> إرسال توجيه / ملاحظة</h4>
                                    <textarea 
                                        className="w-full p-3 border rounded-lg h-32 resize-none focus:ring-2 focus:ring-purple-500 outline-none"
                                        placeholder="اكتب ملاحظاتك للمعلم هنا..."
                                        value={feedbackMsg}
                                        onChange={e => setFeedbackMsg(e.target.value)}
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button onClick={handleSendFeedback} disabled={!feedbackMsg.trim()} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50">
                                            إرسال
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <User size={48} className="mb-4 opacity-20"/>
                                <p>اختر معلماً لعرض التفاصيل</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- TAB: SUBJECTS --- */}
            {activeTab === 'SUBJECTS' && (
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><BookOpen size={20}/> إدارة المواد الدراسية</h3>
                    
                    <div className="flex gap-2 mb-6">
                        <input 
                            className="flex-1 p-2 border rounded-lg"
                            placeholder="اسم المادة الجديدة..."
                            value={newSubject}
                            onChange={e => setNewSubject(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                        />
                        <button onClick={handleAddSubject} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700">
                            <PlusCircle size={20}/>
                        </button>
                    </div>

                    <div className="space-y-2">
                        {subjects.map(s => (
                            <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                                <span className="font-bold text-gray-700">{s.name}</span>
                                <button onClick={() => handleDeleteSubject(s.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        ))}
                        {subjects.length === 0 && <p className="text-center text-gray-400 py-4">لا توجد مواد مضافة</p>}
                    </div>
                </div>
            )}

            {/* --- TAB: SCHEDULE --- */}
            {activeTab === 'SCHEDULE' && (
                <div className="h-full flex flex-col space-y-4">
                    {/* Controls */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-4">
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 mb-1">المادة (للتوزيع)</label>
                                <select className="p-2 border rounded bg-gray-50 min-w-[150px]" value={activeSubject} onChange={e => setActiveSubject(e.target.value)}>
                                    <option value="">-- اختر --</option>
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            
                            {/* Only show Teacher Selector if Admin/Manager OR if Teacher wants to verify self */}
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 mb-1">المعلم (للتوزيع)</label>
                                <select 
                                    className="p-2 border rounded bg-gray-50 min-w-[150px]" 
                                    value={activeTeacher} 
                                    onChange={e => setActiveTeacher(e.target.value)}
                                    disabled={!isManager} // Lock for teachers to themselves
                                >
                                    {isManager && <option value="">-- بدون معلم --</option>}
                                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setScheduleViewMode('CLASS')} className={`px-3 py-1 rounded text-sm font-bold ${scheduleViewMode === 'CLASS' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>عرض الفصول</button>
                            {isManager && <button onClick={() => setScheduleViewMode('TEACHER')} className={`px-3 py-1 rounded text-sm font-bold ${scheduleViewMode === 'TEACHER' ? 'bg-white shadow text-purple-600' : 'text-gray-500'}`}>عرض المعلمين</button>}
                        </div>
                    </div>

                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="p-3 bg-blue-50 border-b text-xs text-blue-800 text-center font-bold">
                            اضغط على الخلية في الجدول لتعيين المادة "{activeSubject || '...'}" {activeTeacher ? `للمعلم المحدد` : ''}. اضغط مرة أخرى للحذف.
                        </div>
                        
                        <div className="flex-1 overflow-auto p-4">
                            {scheduleViewMode === 'CLASS' ? (
                                <div className="space-y-8">
                                    {/* Selector for Class View to avoid massive scroll */}
                                    <div className="mb-4">
                                        <label className="font-bold ml-2">اختر الفصل للعرض:</label>
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
                                                                const isMySubject = session?.subjectName === activeSubject;
                                                                
                                                                return (
                                                                    <td 
                                                                        key={period} 
                                                                        onClick={() => handleScheduleCellClick(day, period)}
                                                                        className={`p-2 border cursor-pointer hover:opacity-80 transition-all h-16 w-24 relative ${session ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                                                    >
                                                                        {session ? (
                                                                            <div className="flex flex-col items-center justify-center h-full">
                                                                                <span className="font-bold text-blue-800 text-sm">{session.subjectName}</span>
                                                                                {teacher && <span className="text-[10px] text-gray-500">{teacher.name}</span>}
                                                                                {/* Warning if conflict */}
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-gray-200 text-xs">+</span>
                                                                        )}
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
                            ) : (
                                // TEACHER VIEW (Admin Only)
                                <div className="text-center text-gray-500 py-10">
                                    عرض الجدول حسب المعلم (قريباً)
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB: SETTINGS (Reports) --- */}
            {activeTab === 'SETTINGS' && (
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><FileText size={20}/> ترويسة التقارير الرسمية</h3>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">إدارة التعليم</label>
                                <input className="w-full p-2 border rounded" value={reportConfig.educationAdmin} onChange={e => setReportConfig({...reportConfig, educationAdmin: e.target.value})} placeholder="الرياض"/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">اسم المدرسة</label>
                                <input className="w-full p-2 border rounded" value={reportConfig.schoolName} onChange={e => setReportConfig({...reportConfig, schoolName: e.target.value})}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">اسم المعلم (الافتراضي)</label>
                                <input className="w-full p-2 border rounded" value={reportConfig.teacherName} onChange={e => setReportConfig({...reportConfig, teacherName: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">مدير المدرسة</label>
                                <input className="w-full p-2 border rounded" value={reportConfig.schoolManager} onChange={e => setReportConfig({...reportConfig, schoolManager: e.target.value})}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">العام الدراسي</label>
                                <input className="w-full p-2 border rounded" value={reportConfig.academicYear} onChange={e => setReportConfig({...reportConfig, academicYear: e.target.value})} placeholder="1447هـ"/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">الفصل الدراسي</label>
                                <input className="w-full p-2 border rounded" value={reportConfig.term} onChange={e => setReportConfig({...reportConfig, term: e.target.value})} placeholder="الأول"/>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">شعار المدرسة</label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 relative">
                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                                {reportConfig.logoBase64 ? (
                                    <img src={reportConfig.logoBase64} alt="Logo" className="h-20 mx-auto object-contain"/>
                                ) : (
                                    <div className="text-gray-400 flex flex-col items-center">
                                        <Upload size={24} className="mb-2"/>
                                        <span className="text-xs">اضغط لرفع الشعار</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={handleSaveSettings} className="w-full bg-orange-600 text-white py-2 rounded font-bold hover:bg-orange-700 mt-4">
                            حفظ الإعدادات
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchoolManagement;
