
// ... existing imports ...
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
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
      // Teacher is optional, but preferred
      
      const existingItem = schedules.find(s => s.classId === selectedClassForSchedule && s.day === day && s.period === period);

      // 1. TOGGLE OFF (Delete)
      // If clicking same subject (and teacher matches if set), delete it
      if (existingItem && existingItem.subjectName === activeSubject) {
          // If activeTeacher is set, only delete if it matches, otherwise warn? 
          // Simplification: Click same subject = remove, regardless of teacher for UX speed
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

  // ... (rest of imports and data loading logic remains same)

  // ... (Report Settings and Feedback handlers remain same)
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
          const existing = getTeachers().find(t => t.id === teacherProfile.id);
          if (existing) updateTeacher(teacherProfile);
          else addTeacher(teacherProfile);
          
          setIsEditingProfile(false);
          alert('تم حفظ البيانات.');
      }
  };

  const handleLinkToSchool = () => {
      setLinkStatus(null);
      setShowNewSchoolForm(false);

      if (!linkMinistryCode) {
          setLinkStatus({ success: false, msg: 'الرجاء إدخال الرمز الوزاري.' });
          return;
      }

      const allSchools = getSchools();
      const targetSchool = allSchools.find(s => s.ministryCode === linkMinistryCode);
      
      if (!targetSchool) {
          setLinkStatus({ success: false, msg: 'لم يتم العثور على مدرسة بهذا الرمز.' });
          setShowNewSchoolForm(true); // Show form to create
          return;
      }
      
      performLinking(targetSchool);
  };

  const handleCreateAndLinkSchool = () => {
      if (!newSchoolData.name || !newSchoolData.managerName || !newSchoolData.managerId) {
          alert('جميع بيانات المدرسة والمدير مطلوبة.');
          return;
      }

      const newSchool: School = {
          id: Date.now().toString() + '_sch',
          name: newSchoolData.name,
          ministryCode: linkMinistryCode,
          managerName: newSchoolData.managerName,
          managerNationalId: newSchoolData.managerId,
          type: 'PUBLIC',
          phone: '',
          studentCount: 0,
          subscriptionStatus: 'TRIAL'
      };

      addSchool(newSchool);
      performLinking(newSchool);
  };

  const performLinking = (targetSchool: School) => {
      if (teacherProfile) {
          const updated = { 
              ...teacherProfile, 
              schoolId: targetSchool.id, 
              managerId: targetSchool.managerNationalId 
          };
          setTeacherProfile(updated);
          updateTeacher(updated);
          setLinkedManagerSchool(targetSchool);
          setLinkStatus({ success: true, msg: `تم الربط بنجاح مع مدرسة: ${targetSchool.name}` });
          setShowNewSchoolForm(false);
          setNewSchoolData({ name: '', managerName: '', managerId: '' });
      }
  };

  const handleUnlinkSchool = () => {
      if (!teacherProfile) return;
      if (confirm('هل أنت متأكد من فك الارتباط مع مدير المدرسة؟')) {
          const updated = {
              ...teacherProfile,
              schoolId: undefined,
              managerId: undefined
          };
          setTeacherProfile(updated);
          updateTeacher(updated);
          setLinkedManagerSchool(null);
          setLinkStatus(null);
          setShowNewSchoolForm(false);
      }
  };

  const renderSubjectsTab = () => (
      <div className="max-w-2xl mx-auto">
          <div className="flex gap-2 mb-6">
              <input className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="اسم المادة الجديدة (مثال: رياضيات)" value={newSubject} onChange={e => setNewSubject(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddSubject()} />
              <button onClick={handleAddSubject} className="bg-green-600 text-white px-6 rounded-lg font-bold hover:bg-green-700 shadow-sm">إضافة</button>
          </div>
          <div className="grid gap-3">
              {subjects.map(sub => (
                  <div key={sub.id} className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
                      <span className="font-bold text-gray-700 flex items-center gap-2"><BookOpen size={18} className="text-indigo-500"/> {sub.name}</span>
                      <button onClick={() => handleDeleteSubject(sub.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors"><Trash2 size={18}/></button>
                  </div>
              ))}
              {subjects.length === 0 && <p className="text-center text-gray-400 py-8 border-2 border-dashed rounded-lg">لا توجد مواد مضافة.</p>}
          </div>
      </div>
  );

  const renderScheduleTab = () => (
      <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex gap-4">
                    <button 
                        onClick={() => setScheduleViewMode('CLASS')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${scheduleViewMode === 'CLASS' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <Grid size={16}/> جدول الحصص (إعداد)
                    </button>
                    {/* Show Full Schedule View button for EVERYONE (Teachers need to see their full schedule too) */}
                    <button 
                        onClick={() => setScheduleViewMode('TEACHER')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${scheduleViewMode === 'TEACHER' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        <User size={16}/> جدول المعلم الشامل
                    </button>
                </div>
          </div>

          {/* VIEW 1: CLASS SCHEDULE BUILDER */}
          {scheduleViewMode === 'CLASS' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-lg border border-gray-200 mb-2">
                    {/* 1. Select Class */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><Grid size={14}/> اختر الفصل (المستهدف)</label>
                        <select className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold" value={selectedClassForSchedule} onChange={e => setSelectedClassForSchedule(e.target.value)}>
                            <option value="">-- اختر الفصل --</option>
                            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* 2. Select Subject (Tool) */}
                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1"><BookOpen size={14}/> المادة (أداة الرسم)</label>
                        <select className="w-full p-2 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-indigo-700" value={activeSubject} onChange={e => setActiveSubject(e.target.value)}>
                            <option value="">-- اختر المادة للتعيين --</option>
                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>

                    {/* 3. Select Teacher (Tool) */}
                    <div>
                        <label className="block text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1"><User size={14}/> المعلم</label>
                        {isManager ? (
                            // Managers can select ANY teacher
                            <select className="w-full p-2 border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-bold text-indigo-700" value={activeTeacher} onChange={e => setActiveTeacher(e.target.value)}>
                                <option value="">-- بدون معلم محدد --</option>
                                {myTeachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.subjectSpecialty})</option>)}
                            </select>
                        ) : (
                            // Teachers see THEMSELVES automatically
                            <div className="w-full p-2 border border-green-200 bg-green-50 rounded-lg text-green-800 text-sm font-bold flex items-center gap-2">
                                <CheckCircle size={16} />
                                <span>سيتم ربط الجدول بك ({teacherProfile?.name || currentUser?.name})</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 bg-blue-50 p-2 rounded border border-blue-100">
                    <CheckSquare size={14} className="text-blue-600"/>
                    <span>طريقة الاستخدام: اختر <b>المادة</b> {isManager ? 'والمعلم ' : ''}من القائمة أعلاه، ثم اضغط على الخانات في الجدول لإضافتها. اضغط مرة أخرى للحذف.</span>
                </div>

                {selectedClassForSchedule ? (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm animate-fade-in">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr className="bg-indigo-900 text-white">
                                    <th className="p-3 border border-indigo-700 w-32">اليوم / الحصة</th>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(p => <th key={p} className="p-3 border border-indigo-700">الحصة {p}</th>)}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(day => (
                                    <tr key={day} className="hover:bg-gray-50">
                                        <td className="p-3 border bg-gray-100 font-bold text-gray-700">
                                            {{'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس'}[day]}
                                        </td>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(period => {
                                            const schedItem = schedules.find(s => s.classId === selectedClassForSchedule && s.day === day && s.period === period);
                                            // Find teacher name based on ID stored in schedule
                                            const teacherObj = schedItem?.teacherId ? teachers.find(t => t.id === schedItem.teacherId) : null;
                                            const teacherName = teacherObj ? teacherObj.name : null;
                                            const subjectColors = generateEntityColor(schedItem?.subjectName || '');

                                            // CHECK BUSY STATUS FOR ACTIVE TEACHER
                                            let isBusy = false;
                                            let busyClass = '';
                                            if (activeTeacher && !schedItem) {
                                                const conflict = checkTeacherConflict(activeTeacher, day, period, selectedClassForSchedule);
                                                if (conflict.conflict) {
                                                    isBusy = true;
                                                    busyClass = conflict.className || '';
                                                }
                                            }

                                            return (
                                                <td 
                                                    key={period} 
                                                    onClick={() => handleScheduleCellClick(day, period)}
                                                    className={`p-1 border h-24 align-top cursor-pointer transition-all hover:shadow-inner 
                                                        ${schedItem ? `${subjectColors.bg} group` : isBusy ? 'bg-gray-200 cursor-not-allowed opacity-75' : 'hover:bg-green-50'}`
                                                    }
                                                >
                                                    {schedItem ? (
                                                        <div className="flex flex-col justify-between h-full p-1 relative">
                                                            <span className={`font-bold block text-sm ${subjectColors.text}`}>{schedItem.subjectName}</span>
                                                            {teacherName && (
                                                                <span className="text-[10px] bg-white/50 border border-white/20 rounded px-1 text-gray-700 mt-1 block truncate">
                                                                    {teacherName}
                                                                </span>
                                                            )}
                                                            <div className="absolute inset-0 flex items-center justify-center bg-red-100/90 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold rounded backdrop-blur-sm">
                                                                <Eraser size={20}/> حذف
                                                            </div>
                                                        </div>
                                                    ) : isBusy ? (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0wIDhMOCAwTTggOEwwIDAiIHN0cm9rZT0iI2NjYyIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')]">
                                                            <span className="text-xs font-bold text-red-500 bg-white/80 px-1 rounded">مشغول</span>
                                                            <span className="text-[10px] bg-white/80 px-1 rounded mt-1">{busyClass}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-200 hover:text-green-400">
                                                            <PlusCircle size={20}/>
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
                    <div className="text-center py-12 text-gray-400 bg-white border-2 border-dashed rounded-xl">
                        <Grid size={48} className="mx-auto mb-2 opacity-20"/>
                        <p>الرجاء اختيار فصل لعرض وبناء الجدول</p>
                    </div>
                )}
              </>
          )}

          {/* VIEW 2: TEACHER COMPREHENSIVE SCHEDULE (NOW FOR ALL) */}
          {scheduleViewMode === 'TEACHER' && (
              <>
                <div className="flex items-center gap-4 bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <label className="font-bold text-purple-800 flex items-center gap-2"><User size={18}/> اختر المعلم:</label>
                    <select 
                        className="p-2 border rounded-lg min-w-[200px] outline-none focus:ring-2 focus:ring-purple-500" 
                        value={selectedTeacherForSchedule} 
                        onChange={e => setSelectedTeacherForSchedule(e.target.value)}
                    >
                        <option value="">-- كل الجدول (مشاهدة عامة) --</option>
                        {isManager 
                            ? myTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                            : teachers.filter(t => t.id === currentUser?.id || t.nationalId === currentUser?.nationalId).map(t => <option key={t.id} value={t.id}>{t.name} (أنا)</option>)
                        }
                    </select>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm animate-fade-in">
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr className="bg-purple-800 text-white">
                                <th className="p-3 border border-purple-600 w-32">اليوم / الحصة</th>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(p => <th key={p} className="p-3 border border-purple-600">الحصة {p}</th>)}
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(day => (
                                <tr key={day} className="hover:bg-purple-50">
                                    <td className="p-3 border bg-gray-100 font-bold text-gray-700">
                                        {{'Sunday': 'الأحد', 'Monday': 'الاثنين', 'Tuesday': 'الثلاثاء', 'Wednesday': 'الأربعاء', 'Thursday': 'الخميس'}[day]}
                                    </td>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(period => {
                                        // Get all schedules for this slot
                                        const slotSchedules = schedules.filter(s => s.day === day && s.period === period);
                                        
                                        // Find relevant classes for the selected teacher (or all if none selected)
                                        let myClasses: {class: string, subject: string}[] = [];
                                        
                                        slotSchedules.forEach(s => {
                                            // Check direct teacher assignment in ScheduleItem (Priority)
                                            if (selectedTeacherForSchedule) {
                                                if (s.teacherId === selectedTeacherForSchedule) {
                                                    myClasses.push({ class: s.classId, subject: s.subjectName });
                                                }
                                                // Check legacy assignment mapping if ID missing
                                                else if (!s.teacherId) {
                                                    const assignment = assignments.find(a => a.classId === s.classId && a.subjectName === s.subjectName);
                                                    if (assignment?.teacherId === selectedTeacherForSchedule) {
                                                        myClasses.push({ class: s.classId, subject: s.subjectName });
                                                    }
                                                }
                                            } else {
                                                // If "All Schedule" - Show general info? Or maybe disable this view for ALL if messy
                                                // For now, let's just show if teacher matches ANYONE in the list to indicate occupied slots
                                                // Simplified: Show count or first match
                                            }
                                        });

                                        return (
                                            <td key={period} className={`p-2 border h-20 align-middle ${myClasses.length > 0 ? 'bg-purple-50' : ''}`}>
                                                {myClasses.map((cls, idx) => {
                                                    const classColors = generateEntityColor(cls.class);
                                                    return (
                                                        <div key={idx} className={`rounded border p-1 mb-1 shadow-sm text-xs ${classColors.bg} ${classColors.border}`}>
                                                            <span className={`font-bold block ${classColors.text}`}>{cls.class}</span>
                                                            <span className="text-gray-500">{cls.subject}</span>
                                                        </div>
                                                    )
                                                })}
                                                {myClasses.length === 0 && <span className="text-gray-300">-</span>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </>
          )}
      </div>
  );

  const renderSettingsTab = () => (
      <div className="max-w-3xl mx-auto space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2"><FileText size={20}/> ترويسة التقارير الرسمية</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">اسم المدرسة</label>
                  <input className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={reportConfig.schoolName} onChange={e => setReportConfig({...reportConfig, schoolName: e.target.value})} />
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">الإدارة التعليمية (مثال: تعليم الرياض)</label>
                  <input className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={reportConfig.educationAdmin} onChange={e => setReportConfig({...reportConfig, educationAdmin: e.target.value})} />
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">اسم مدير المدرسة (للتوقيع)</label>
                  <input className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={reportConfig.schoolManager} onChange={e => setReportConfig({...reportConfig, schoolManager: e.target.value})} />
              </div>
              <div>
                  <label className="block text-sm font-bold text-gray-600 mb-1">العام الدراسي</label>
                  <input className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none" value={reportConfig.academicYear} onChange={e => setReportConfig({...reportConfig, academicYear: e.target.value})} />
              </div>
          </div>
          
          <div className="border-t pt-4">
              <label className="block text-sm font-bold text-gray-600 mb-2">شعار المدرسة</label>
              <div className="flex items-center gap-4">
                  {reportConfig.logoBase64 && <img src={reportConfig.logoBase64} alt="Logo" className="h-20 w-20 object-contain border rounded bg-gray-50"/>}
                  <label className="cursor-pointer bg-gray-100 px-4 py-2 rounded border hover:bg-gray-200 flex items-center gap-2 text-sm font-bold text-gray-600 transition-colors">
                      <Upload size={16}/> رفع صورة
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                  </label>
              </div>
          </div>

          <div className="flex justify-end pt-4">
              <button onClick={handleSaveSettings} className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg transition-transform active:scale-95">
                  <Save size={18}/> حفظ الإعدادات
              </button>
          </div>
      </div>
  );

  // ================= RENDER: MANAGER VIEW =================
  if (isManager) {
      if (!mySchool) return (
          <div className="p-12 text-center text-gray-500 bg-white rounded-xl border-2 border-dashed m-6">
              <AlertCircle size={48} className="mx-auto mb-4 text-red-400"/>
              <h3 className="text-xl font-bold mb-2">لا توجد مدرسة مرتبطة بحسابك</h3>
              <p>بصفتك مديراً، يجب إنشاء ملف للمدرسة أولاً من لوحة التحكم أو التواصل مع الدعم.</p>
          </div>
      );

      return (
          <div className="p-6 animate-fade-in space-y-6">
              {/* Header */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                          <Building2 className="text-indigo-600"/> إدارة المدرسة: {mySchool.name}
                      </h2>
                      <p className="text-gray-500 text-sm mt-1">مدير المدرسة: {mySchool.managerName}</p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-lg flex items-center gap-3">
                      <div>
                          <p className="text-xs text-indigo-600 font-bold uppercase">الرمز الوزاري (للربط)</p>
                          <p className="text-xl font-mono font-black text-indigo-900 tracking-widest">{mySchool.ministryCode}</p>
                      </div>
                      <button onClick={() => navigator.clipboard.writeText(mySchool.ministryCode || '')} className="p-2 hover:bg-white rounded-full text-indigo-500">
                          <Copy size={18}/>
                      </button>
                  </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                  <TabButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<Grid size={18}/>} label="نظرة عامة" />
                  <TabButton active={activeTab === 'TEACHERS'} onClick={() => setActiveTab('TEACHERS')} icon={<Users size={18}/>} label="المعلمين" />
                  <TabButton active={activeTab === 'SUBJECTS'} onClick={() => setActiveTab('SUBJECTS')} icon={<BookOpen size={18}/>} label="المواد الدراسية" />
                  <TabButton active={activeTab === 'SCHEDULE'} onClick={() => setActiveTab('SCHEDULE')} icon={<Clock size={18}/>} label="الجدول والمعلمين" />
                  <TabButton active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Settings size={18}/>} label="إعدادات التقارير" />
              </div>

              {/* Content */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] p-6">
                  
                  {activeTab === 'DASHBOARD' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex items-center gap-4">
                              <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Users size={24}/></div>
                              <div>
                                  <p className="text-sm text-gray-500 font-bold">عدد المعلمين</p>
                                  <h3 className="text-2xl font-bold text-gray-800">{myTeachers.length}</h3>
                              </div>
                          </div>
                          <div className="bg-green-50 p-6 rounded-xl border border-green-100 flex items-center gap-4">
                              <div className="bg-green-100 p-3 rounded-full text-green-600"><Users size={24}/></div>
                              <div>
                                  <p className="text-sm text-gray-500 font-bold">عدد الطلاب</p>
                                  <h3 className="text-2xl font-bold text-gray-800">{students.length}</h3>
                              </div>
                          </div>
                          <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 flex items-center gap-4">
                              <div className="bg-purple-100 p-3 rounded-full text-purple-600"><Building2 size={24}/></div>
                              <div>
                                  <p className="text-sm text-gray-500 font-bold">الفصول الدراسية</p>
                                  <h3 className="text-2xl font-bold text-gray-800">{uniqueClasses.length}</h3>
                              </div>
                          </div>
                      </div>
                  )}

                  {activeTab === 'TEACHERS' && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-1 border-l pl-4">
                              <h4 className="font-bold text-gray-700 mb-4">قائمة المعلمين المرتبطين</h4>
                              <div className="space-y-2">
                                  {myTeachers.map(t => (
                                      <div key={t.id} onClick={() => setViewingTeacher(t)} className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 hover:bg-gray-50 ${viewingTeacher?.id === t.id ? 'bg-indigo-50 border-indigo-200' : ''}`}>
                                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">{t.name.charAt(0)}</div>
                                          <div className="flex-1">
                                              <div className="font-bold text-sm">{t.name}</div>
                                              <div className="text-xs text-gray-500">{t.subjectSpecialty || 'عام'}</div>
                                          </div>
                                      </div>
                                  ))}
                                  {myTeachers.length === 0 && <p className="text-sm text-gray-400 text-center">لا يوجد معلمين. شارك الرمز الوزاري معهم.</p>}
                              </div>
                          </div>
                          <div className="lg:col-span-2">
                              {viewingTeacher ? (
                                  <div>
                                      <div className="flex justify-between items-start mb-6 border-b pb-4">
                                          <div>
                                              <h3 className="text-xl font-bold text-gray-800">{viewingTeacher.name}</h3>
                                              <div className="flex gap-4 text-sm text-gray-500 mt-1">
                                                  <span className="flex items-center gap-1"><Mail size={14}/> {viewingTeacher.email}</span>
                                                  <span className="flex items-center gap-1"><ShieldCheck size={14}/> الهوية: {viewingTeacher.nationalId}</span>
                                              </div>
                                          </div>
                                          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">نشط</span>
                                      </div>
                                      <div className="mb-6">
                                          <h4 className="font-bold text-gray-700 mb-2">إرسال توجيه / ملاحظة</h4>
                                          <textarea className="w-full p-3 border rounded-lg bg-gray-50 focus:bg-white h-24 text-sm" placeholder="اكتب ملاحظتك هنا..." value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)} />
                                          <button onClick={handleSendFeedback} className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700"><Send size={16}/> إرسال</button>
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-gray-700 mb-2">سجل الملاحظات</h4>
                                          <div className="bg-gray-50 p-4 rounded-lg border h-40 overflow-y-auto space-y-2">
                                              {feedbackList.filter(f => f.teacherId === viewingTeacher.id).map(f => (
                                                  <div key={f.id} className="bg-white p-2 rounded border border-gray-200 text-sm">
                                                      <p>{f.content}</p>
                                                      <span className="text-[10px] text-gray-400">{new Date(f.date).toLocaleDateString('ar-SA')}</span>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="h-full flex items-center justify-center text-gray-400">اختر معلماً لعرض التفاصيل</div>
                              )}
                          </div>
                      </div>
                  )}

                  {activeTab === 'SUBJECTS' && renderSubjectsTab()}
                  {activeTab === 'SCHEDULE' && renderScheduleTab()}
                  {activeTab === 'SETTINGS' && renderSettingsTab()}
              </div>
          </div>
      );
  }

  // ================= RENDER: TEACHER VIEW =================
  return (
      <div className="p-6 animate-fade-in space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <User className="text-teal-600"/> ملفي الشخصي وإعدادات العمل
            </h2>
            <p className="text-gray-500 text-sm mt-1">إدارة بياناتك، الربط بالمدرسة، والتحكم في الإعدادات الدراسية.</p>
          </div>

          {/* Teacher Tabs - Reordered */}
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto mb-6">
              <TabButton active={activeTab === 'DASHBOARD'} onClick={() => setActiveTab('DASHBOARD')} icon={<Grid size={18}/>} label="نظرة عامة" />
              <TabButton active={activeTab === 'SUBJECTS'} onClick={() => setActiveTab('SUBJECTS')} icon={<BookOpen size={18}/>} label="المواد الدراسية" />
              <TabButton active={activeTab === 'SCHEDULE'} onClick={() => setActiveTab('SCHEDULE')} icon={<Clock size={18}/>} label="الجدول الدراسي" />
              <TabButton active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Settings size={18}/>} label="إعدادات التقارير" />
              <TabButton active={activeTab === 'PROFILE'} onClick={() => setActiveTab('PROFILE')} icon={<User size={18}/>} label="الملف الشخصي والربط" />
          </div>

          {/* TAB CONTENT FOR TEACHER */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[500px] p-6">
              
              {activeTab === 'PROFILE' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                      {/* Profile Settings */}
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                          <div className="flex justify-between items-center mb-4 border-b pb-2">
                              <h3 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={18}/> بياناتي الأساسية</h3>
                              <button 
                                onClick={() => setIsEditingProfile(!isEditingProfile)}
                                className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all ${isEditingProfile ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                              >
                                  {isEditingProfile ? 'إلغاء' : <><Edit size={14}/> تعديل البيانات</>}
                              </button>
                          </div>
                          
                          <div className="space-y-4">
                              <div>
                                  <label className="block text-sm font-bold text-gray-600 mb-1">الاسم الرباعي</label>
                                  <input 
                                    className={`w-full p-2 rounded transition-all ${isEditingProfile ? 'border focus:ring-2 focus:ring-teal-500' : 'bg-transparent border-none text-gray-800 font-bold px-0'}`} 
                                    value={teacherProfile?.name || ''} 
                                    onChange={e => setTeacherProfile({...teacherProfile!, name: e.target.value})} 
                                    disabled={!isEditingProfile}
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-600 mb-1">رقم الهوية (هام للربط)</label>
                                  <input 
                                    className={`w-full p-2 rounded font-mono transition-all ${isEditingProfile ? 'border focus:ring-2 focus:ring-teal-500' : 'bg-transparent border-none text-gray-800 font-bold px-0'}`} 
                                    value={teacherProfile?.nationalId || ''} 
                                    onChange={e => setTeacherProfile({...teacherProfile!, nationalId: e.target.value})} 
                                    disabled={!isEditingProfile}
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold text-gray-600 mb-1">التخصص</label>
                                  <input 
                                    className={`w-full p-2 rounded transition-all ${isEditingProfile ? 'border focus:ring-2 focus:ring-teal-500' : 'bg-transparent border-none text-gray-800 font-bold px-0'}`} 
                                    value={teacherProfile?.subjectSpecialty || ''} 
                                    onChange={e => setTeacherProfile({...teacherProfile!, subjectSpecialty: e.target.value})} 
                                    disabled={!isEditingProfile}
                                  />
                              </div>
                              
                              {isEditingProfile && (
                                <div className="animate-fade-in pt-2">
                                    <label className="block text-sm font-bold text-gray-600 mb-1 flex items-center gap-2"><Lock size={14}/> الرقم السري (للدخول)</label>
                                    <input 
                                        className="w-full p-2 border rounded font-mono" 
                                        type="password" 
                                        value={teacherProfile?.password || ''} 
                                        onChange={e => setTeacherProfile({...teacherProfile!, password: e.target.value})} 
                                    />
                                    <button onClick={handleTeacherSaveProfile} className="w-full bg-teal-600 text-white py-2 rounded font-bold hover:bg-teal-700 mt-4">
                                        حفظ التغييرات
                                    </button>
                                </div>
                              )}
                          </div>
                      </div>

                      {/* School Linking */}
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                          <h3 className="font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2"><LinkIcon size={18}/> الربط بالمدرسة</h3>
                          
                          {teacherProfile?.schoolId ? (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center space-y-4">
                                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-2">
                                      <CheckCircle size={32}/>
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-green-800 text-lg">حسابك مرتبط بنجاح</h4>
                                      <p className="text-sm text-green-700 mt-1">بالمدرسة: <b>{linkedManagerSchool?.name || 'غير معروف'}</b></p>
                                  </div>
                                  
                                  {linkedManagerSchool && (
                                      <div className="bg-white p-3 rounded border border-green-200 text-right text-sm">
                                          <p className="font-bold text-gray-700 mb-2 border-b pb-1">بيانات المدير:</p>
                                          <div className="grid grid-cols-2 gap-2">
                                              <span className="text-gray-500">الاسم:</span>
                                              <span className="font-bold">{linkedManagerSchool.managerName}</span>
                                              <span className="text-gray-500">الهاتف:</span>
                                              <span className="font-bold dir-ltr flex items-center justify-end gap-1"><Phone size={12}/> {linkedManagerSchool.phone || '-'}</span>
                                          </div>
                                      </div>
                                  )}

                                  <button onClick={handleUnlinkSchool} className="w-full bg-white border border-red-200 text-red-600 py-2 rounded font-bold hover:bg-red-50 flex items-center justify-center gap-2 text-sm mt-4">
                                      <Unlink size={16}/> فك الربط مع المدرسة
                                  </button>
                              </div>
                          ) : (
                              <div className="space-y-4">
                                  <p className="text-sm text-gray-500 mb-4 bg-yellow-50 p-3 rounded border border-yellow-100 flex gap-2">
                                      <AlertCircle size={20} className="text-yellow-600 shrink-0"/>
                                      لربط حسابك، احصل على "الرمز الوزاري" من مدير المدرسة وأدخله هنا. يسمح الربط للمدير بمتابعة تقاريرك.
                                  </p>
                                  <div>
                                      <label className="block text-sm font-bold text-gray-600 mb-1">الرمز الوزاري للمدرسة</label>
                                      <input className="w-full p-3 border rounded text-center font-mono tracking-widest text-lg focus:ring-2 focus:ring-indigo-500 outline-none uppercase" placeholder="XXXXXX" value={linkMinistryCode} onChange={e => setLinkMinistryCode(e.target.value)} />
                                  </div>
                                  
                                  {linkStatus && (
                                      <div className={`p-3 rounded text-sm font-bold text-center ${linkStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                          {linkStatus.msg}
                                      </div>
                                  )}

                                  {!showNewSchoolForm && (
                                      <button onClick={handleLinkToSchool} className="w-full bg-indigo-600 text-white py-2 rounded font-bold hover:bg-indigo-700 flex justify-center items-center gap-2 shadow-md">
                                          <Search size={18}/> بحث وربط
                                      </button>
                                  )}

                                  {/* NEW SCHOOL FORM */}
                                  {showNewSchoolForm && (
                                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3 animate-fade-in mt-4">
                                          <h4 className="font-bold text-sm text-gray-800 flex items-center gap-1"><PlusCircle size={14}/> بيانات المدرسة الجديدة</h4>
                                          <input 
                                              className="w-full p-2 border rounded text-sm" 
                                              placeholder="اسم المدرسة" 
                                              value={newSchoolData.name} 
                                              onChange={e => setNewSchoolData({...newSchoolData, name: e.target.value})}
                                          />
                                          <input 
                                              className="w-full p-2 border rounded text-sm" 
                                              placeholder="اسم مدير المدرسة" 
                                              value={newSchoolData.managerName} 
                                              onChange={e => setNewSchoolData({...newSchoolData, managerName: e.target.value})}
                                          />
                                          <input 
                                              className="w-full p-2 border rounded text-sm font-mono" 
                                              placeholder="رقم هوية المدير" 
                                              value={newSchoolData.managerId} 
                                              onChange={e => setNewSchoolData({...newSchoolData, managerId: e.target.value})}
                                          />
                                          <button 
                                              onClick={handleCreateAndLinkSchool}
                                              className="w-full bg-green-600 text-white py-2 rounded font-bold text-sm hover:bg-green-700"
                                          >
                                              إنشاء وربط
                                          </button>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'DASHBOARD' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                      <div className="bg-green-50 p-6 rounded-xl border border-green-100 flex items-center gap-4">
                          <div className="bg-green-100 p-4 rounded-full text-green-600"><Users size={32}/></div>
                          <div>
                              <p className="text-sm text-gray-500 font-bold">الطلاب المسجلين (الكلي)</p>
                              <h3 className="text-3xl font-bold text-gray-800">{students.length}</h3>
                          </div>
                      </div>
                      <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 flex items-center gap-4">
                          <div className="bg-purple-100 p-4 rounded-full text-purple-600"><Building2 size={32}/></div>
                          <div>
                              <p className="text-sm text-gray-500 font-bold">الفصول الدراسية</p>
                              <h3 className="text-3xl font-bold text-gray-800">{uniqueClasses.length}</h3>
                          </div>
                      </div>
                      <div className="col-span-1 md:col-span-2 bg-blue-50 p-6 rounded-xl border border-blue-100 flex items-center gap-4">
                          <div className="bg-blue-100 p-4 rounded-full text-blue-600"><BookOpen size={32}/></div>
                          <div>
                              <p className="text-sm text-gray-500 font-bold">المواد الدراسية</p>
                              <h3 className="text-3xl font-bold text-gray-800">{subjects.length}</h3>
                              <p className="text-xs text-gray-400">انتقل لتبويب "المواد" للتعديل</p>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'SUBJECTS' && renderSubjectsTab()}
              {activeTab === 'SCHEDULE' && renderScheduleTab()}
              {activeTab === 'SETTINGS' && renderSettingsTab()}
          </div>
      </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all whitespace-nowrap min-w-[140px] ${
            active ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

export default SchoolManagement;
