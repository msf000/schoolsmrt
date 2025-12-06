
// ... existing imports ...
import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, School, SystemUser, Feedback, Subject, ScheduleItem, TeacherAssignment, ReportHeaderConfig } from '../types';
import { 
    getTeachers, addTeacher, updateTeacher,
    getSchools, getSubjects, addSubject, deleteSubject,
    getSchedules, saveScheduleItem, deleteScheduleItem,
    getTeacherAssignments, saveTeacherAssignment,
    getReportHeaderConfig, saveReportHeaderConfig,
    getFeedback, addFeedback, addSchool
} from '../services/storageService';
import { Trash2, User, Building2, Save, Users, AlertCircle, CheckCircle, Search, Mail, Send, FileText, Lock, ShieldCheck, Calendar, BookOpen, Settings, Upload, Copy, Grid, Clock, Link as LinkIcon, Unlink, Phone, Edit, PlusCircle, AlertTriangle, Monitor } from 'lucide-react';

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

  // ... (rest of states and effects - no changes until handlers)

  // --- UI States ---
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [newSubject, setNewSubject] = useState('');
  
  // Schedule UI State
  const [scheduleViewMode, setScheduleViewMode] = useState<'CLASS' | 'TEACHER'>('CLASS');
  const [selectedClassForSchedule, setSelectedClassForSchedule] = useState('');
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState('');
  const [editingCell, setEditingCell] = useState<{day: string, period: number} | null>(null);

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

      if (isManager) {
          const allSchools = getSchools();
          // Find school managed by this user
          let school = allSchools.find(s => s.managerNationalId === currentUser?.nationalId || s.managerName === currentUser?.name);
          // Fallback for Super Admin
          if (!school && currentUser?.role === 'SUPER_ADMIN' && allSchools.length > 0) {
              school = allSchools[0];
          }
          setMySchool(school || null);
          setTeachers(getTeachers());
          setFeedbackList(getFeedback());
      } else {
          // Teacher View Load
          const allTeachers = getTeachers();
          const me = allTeachers.find(t => 
              (currentUser?.nationalId && t.nationalId === currentUser.nationalId) || 
              (currentUser?.email && t.email === currentUser.email)
          );
          if (me) {
              setTeacherProfile(me);
              // Check if linked to school to show manager details
              if (me.schoolId) {
                  const schools = getSchools();
                  const school = schools.find(s => s.id === me.schoolId);
                  setLinkedManagerSchool(school || null);
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

      // Find all schedule items for this day/period
      const concurrentSessions = schedules.filter(s => s.day === day && s.period === period && s.classId !== ignoreClassId);
      
      for (const session of concurrentSessions) {
          // Check who teaches this subject in that class
          const assignment = assignments.find(a => a.classId === session.classId && a.subjectName === session.subjectName);
          if (assignment && assignment.teacherId === teacherId) {
              return { conflict: true, className: session.classId };
          }
      }
      return { conflict: false };
  };

  // --- ACTIONS: SCHEDULE ---
  const handleScheduleSave = (day: string, period: number, subjectName: string) => {
      if (!selectedClassForSchedule) return;
      
      // 1. Get Teacher assigned to this subject for this class
      const assignment = assignments.find(a => a.classId === selectedClassForSchedule && a.subjectName === subjectName);
      
      // 2. Check Conflicts if teacher exists
      if (assignment?.teacherId) {
          const conflict = checkTeacherConflict(assignment.teacherId, day, period, selectedClassForSchedule);
          if (conflict.conflict) {
              const teacher = myTeachers.find(t => t.id === assignment.teacherId);
              alert(`تنبيه تعارض: المعلم "${teacher?.name}" لديه حصة أخرى في نفس الوقت مع فصل "${conflict.className}".`);
              // You can chose to return here to block saving, or proceed with warning. 
              // Blocking is safer:
              return; 
          }
      }

      const newItem: ScheduleItem = {
          id: `${selectedClassForSchedule}-${day}-${period}`,
          classId: selectedClassForSchedule,
          day: day as any,
          period,
          subjectName,
          teacherId: assignment?.teacherId // Link Teacher directly in schedule
      };
      
      if (subjectName === '') {
          deleteScheduleItem(newItem.id);
      } else {
          saveScheduleItem(newItem);
      }
      setSchedules(getSchedules());
      setEditingCell(null);
  };

  const handleAssignTeacher = (classId: string, subjectName: string, teacherId: string) => {
      // Check conflict BEFORE saving assignment
      // Note: This check only validates the currently scheduled slots for this class/subject.
      // A more robust check would scan all slots where this subject is taught in this class.
      
      const classScheduleItems = schedules.filter(s => s.classId === classId && s.subjectName === subjectName);
      for(const item of classScheduleItems) {
          const conflict = checkTeacherConflict(teacherId, item.day, item.period, classId);
          if (conflict.conflict) {
               alert(`لا يمكن إسناد المعلم: يوجد تعارض في يوم ${item.day} حصة ${item.period} مع فصل ${conflict.className}`);
               return; // Block assignment
          }
      }

      const assignment: TeacherAssignment = {
          id: `${classId}-${subjectName}`,
          classId,
          subjectName,
          teacherId
      };
      saveTeacherAssignment(assignment);
      setAssignments(getTeacherAssignments());

      // NEW: Update existing schedule items for this class/subject with the new teacherId
      // This ensures the weekly_schedule table always reflects the assigned teacher
      const allSchedules = getSchedules();
      let hasUpdates = false;
      allSchedules.forEach(s => {
          if (s.classId === classId && s.subjectName === subjectName) {
              saveScheduleItem({ ...s, teacherId });
              hasUpdates = true;
          }
      });
      if (hasUpdates) setSchedules(getSchedules());
  };

  // ... (rest of the component)
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

  // ================= SHARED RENDER BLOCKS =================
  
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
                        <Grid size={16}/> جدول الحصص (فصول)
                    </button>
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
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="font-bold text-gray-700 flex items-center gap-2"><Grid size={18}/> اختر الفصل لإعداد الجدول:</label>
                    <select className="p-2 border rounded-lg min-w-[200px] outline-none focus:ring-2 focus:ring-indigo-500" value={selectedClassForSchedule} onChange={e => setSelectedClassForSchedule(e.target.value)}>
                        <option value="">-- اختر الفصل --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <p className="text-xs text-gray-500">* تأكد من إضافة الطلاب وتحديد فصولهم أولاً.</p>
                </div>

                {selectedClassForSchedule ? (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
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
                                            const assignment = assignments.find(a => a.classId === selectedClassForSchedule && a.subjectName === schedItem?.subjectName);
                                            // Only Manager can see/assign teachers
                                            const teacherName = isManager ? myTeachers.find(t => t.id === assignment?.teacherId)?.name : null;

                                            return (
                                                <td key={period} className="p-1 border h-24 align-top relative group">
                                                    {editingCell?.day === day && editingCell?.period === period ? (
                                                        <div className="absolute inset-0 bg-white z-10 p-2 shadow-lg flex flex-col gap-1 border-2 border-indigo-500">
                                                            <select 
                                                                autoFocus
                                                                className="w-full text-xs p-1 border rounded"
                                                                value={schedItem?.subjectName || ''}
                                                                onChange={(e) => handleScheduleSave(day, period, e.target.value)}
                                                                onBlur={() => setEditingCell(null)}
                                                            >
                                                                <option value="">(فراغ)</option>
                                                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <div onClick={() => setEditingCell({ day, period })} className="w-full h-full cursor-pointer p-1 flex flex-col justify-between hover:bg-indigo-50 transition-colors">
                                                            {schedItem ? (
                                                                <>
                                                                    <span className="font-bold text-indigo-700 block text-sm">{schedItem.subjectName}</span>
                                                                    {isManager && (
                                                                        <select 
                                                                            className="text-[10px] w-full bg-transparent border-none outline-none text-gray-500 mt-1 cursor-pointer hover:bg-gray-200 rounded"
                                                                            value={assignment?.teacherId || ''}
                                                                            onClick={e => e.stopPropagation()}
                                                                            onChange={e => handleAssignTeacher(selectedClassForSchedule, schedItem.subjectName, e.target.value)}
                                                                        >
                                                                            <option value="">-- المعلم --</option>
                                                                            {myTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                                        </select>
                                                                    )}
                                                                </>
                                                            ) : <span className="text-gray-200 text-xs flex items-center justify-center h-full">-</span>}
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
                        <p>الرجاء اختيار فصل لعرض الجدول</p>
                    </div>
                )}
              </>
          )}

          {/* VIEW 2: TEACHER COMPREHENSIVE SCHEDULE */}
          {scheduleViewMode === 'TEACHER' && (
              <>
                <div className="flex items-center gap-4 bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <label className="font-bold text-purple-800 flex items-center gap-2"><User size={18}/> اختر المعلم:</label>
                    <select 
                        className="p-2 border rounded-lg min-w-[200px] outline-none focus:ring-2 focus:ring-purple-500" 
                        value={selectedTeacherForSchedule} 
                        onChange={e => setSelectedTeacherForSchedule(e.target.value)}
                    >
                        <option value="">-- كل الجدول --</option>
                        {myTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
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
                                        // Find all classes this teacher has at this time
                                        let myClasses: {class: string, subject: string}[] = [];
                                        
                                        // Get all schedules for this slot
                                        const slotSchedules = schedules.filter(s => s.day === day && s.period === period);
                                        
                                        slotSchedules.forEach(s => {
                                            // Find who teaches it
                                            const assignment = assignments.find(a => a.classId === s.classId && a.subjectName === s.subjectName);
                                            // If selected teacher matches OR if showing all and slot is occupied
                                            if (selectedTeacherForSchedule) {
                                                if (assignment?.teacherId === selectedTeacherForSchedule) {
                                                    myClasses.push({ class: s.classId, subject: s.subjectName });
                                                }
                                            } else {
                                                // Show all (maybe limit or show teacher name)
                                                // Skipping "Show All" detailed logic for simplicity, forcing teacher selection usually better
                                            }
                                        });

                                        return (
                                            <td key={period} className={`p-2 border h-20 align-middle ${myClasses.length > 0 ? 'bg-purple-100' : ''}`}>
                                                {myClasses.map((cls, idx) => (
                                                    <div key={idx} className="bg-white rounded border border-purple-200 p-1 mb-1 shadow-sm text-xs">
                                                        <span className="font-bold block text-purple-800">{cls.class}</span>
                                                        <span className="text-gray-500">{cls.subject}</span>
                                                    </div>
                                                ))}
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
