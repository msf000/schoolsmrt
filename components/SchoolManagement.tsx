
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getSchools, getTeachers, updateTeacher,
    getSubjects, addSubject, deleteSubject,
    getAcademicTerms, saveAcademicTerm, deleteAcademicTerm, setCurrentTerm,
    getReportHeaderConfig, saveReportHeaderConfig,
    getUserTheme, saveUserTheme,
    getTeacherPeriodTimings, saveTeacherPeriodTimings,
    getTeacherAssignments, addTeacherAssignment, deleteTeacherAssignment,
    getStudents, getAttendance, fetchPerformance
} from '../services/storageService';
import { 
    School, SystemUser, Teacher, Subject, AcademicTerm, ReportHeaderConfig, UserTheme, TermPeriod, TeacherAssignment 
} from '../types';
import { 
    Building2, Users, Settings, 
    Trash2, CheckCircle, Plus, LayoutGrid, CalendarDays, List, ChevronDown, ChevronRight, PenTool, Sparkles, FileText, BookOpen, Save, User, Clock, RotateCcw, Package, Database, DownloadCloud, ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

const DEFAULT_PERIOD_TIMES = [
    "07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", 
    "09:45 - 10:30", "10:30 - 11:15", "11:15 - 12:00", 
    "12:00 - 12:45", "12:45 - 01:30"
];

interface SchoolManagementProps {
    students: any[]; 
    onImportStudents: any;
    onImportPerformance: any;
    onImportAttendance: any;
    currentUser?: SystemUser | null;
    onUpdateTheme?: (theme: UserTheme) => void;
}

export const SchoolManagement: React.FC<SchoolManagementProps> = ({ currentUser, students, onUpdateTheme }) => {
  const isSchoolManager = currentUser?.role === 'SCHOOL_MANAGER';
  const isManager = isSchoolManager || currentUser?.role === 'SUPER_ADMIN';
  
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TEACHERS' | 'SUBJECTS' | 'CALENDAR' | 'SETTINGS' | 'BACKUP'>(() => {
      return localStorage.getItem('school_mgmt_active_tab') as any || 'DASHBOARD';
  });

  useEffect(() => {
      localStorage.setItem('school_mgmt_active_tab', activeTab);
  }, [activeTab]);
  
  // --- Data States ---
  const [mySchool, setMySchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportHeaderConfig>({
      schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '', signatureBase64: ''
  });
  const [userTheme, setUserTheme] = useState<UserTheme>({ mode: 'LIGHT', backgroundStyle: 'FLAT' });
  const [periodTimings, setPeriodTimings] = useState<string[]>([]);
  const [myClasses, setMyClasses] = useState<TeacherAssignment[]>([]);

  // UI States
  const [newSubject, setNewSubject] = useState('');
  
  // Term/Period Modal States
  const [newTermName, setNewTermName] = useState('');
  const [newTermStart, setNewTermStart] = useState('');
  const [newTermEnd, setNewTermEnd] = useState('');

  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  
  const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // New Class UI State
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
      if (currentUser) {
          setSubjects(getSubjects(currentUser.id));
          setReportConfig(getReportHeaderConfig(currentUser.id));
          setAcademicTerms(getAcademicTerms(currentUser.id));
          setPeriodTimings(getTeacherPeriodTimings(currentUser.id));
          setMyClasses(getTeacherAssignments(currentUser.id));
      }
      setUserTheme(getUserTheme());
      const allTeachers = getTeachers();
      setTeachers(allTeachers);
      
      if (isManager) {
          const allSchools = getSchools();
          let school = allSchools.find((s: School) => s.managerNationalId === currentUser?.nationalId || s.managerName === currentUser?.name);
          if (!school && currentUser?.role === 'SUPER_ADMIN' && allSchools.length > 0) school = allSchools[0];
          setMySchool(school || null);
      } else {
          let me: Teacher | undefined;
          if (currentUser?.id) me = allTeachers.find((t: Teacher) => t.id === currentUser.id);
          if (!me) me = allTeachers.find((t: Teacher) => (currentUser?.nationalId && t.nationalId === currentUser.nationalId) || (currentUser?.email && t.email === currentUser.email));
          if (me) {
              setTeacherProfile(me);
              if (me.schoolId) {
                  const schools = getSchools();
                  const school = schools.find((s: School) => s.id === me!.schoolId);
                  setMySchool(school || null);
              } else { setMySchool(null); }
          }
      }
  }, [currentUser, isManager, activeTab]); 

  // --- Backup Handlers ---
  const handleExportFullBackup = async () => {
      const allData = {
          students: getStudents(),
          attendance: getAttendance(),
          performance: await fetchPerformance(currentUser?.id)
      };
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allData.students), "الطلاب");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allData.attendance), "الحضور");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allData.performance), "الدرجات");
      
      XLSX.writeFile(wb, `Smart_School_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAddSubject = () => { 
      if (newSubject.trim() && currentUser) { 
          addSubject({ id: Date.now().toString(), name: newSubject.trim(), teacherId: currentUser.id }); 
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
  
  // Terms Handlers
  const handleAddTerm = () => { 
      if (!newTermName || !newTermStart || !newTermEnd || !currentUser) return alert('بيانات ناقصة'); 
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

  const handleDeleteTerm = (id: string) => { 
      if (confirm('حذف الفصل الدراسي؟')) { 
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

  const handleAddPeriod = (term: AcademicTerm) => { 
      if (!newPeriodName || !newPeriodStart || !newPeriodEnd) return alert('بيانات ناقصة'); 
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

  const handleDeletePeriod = (term: AcademicTerm, periodId: string) => { 
      if(confirm('حذف الفترة؟')) { 
          const updatedPeriods = term.periods?.filter(p => p.id !== periodId) || []; 
          saveAcademicTerm({ ...term, periods: updatedPeriods }); 
          setAcademicTerms(getAcademicTerms(currentUser?.id)); 
      } 
  };

  // Settings Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; 
      if (file) { 
          const reader = new FileReader(); 
          reader.onloadend = () => { setReportConfig(prev => ({ ...prev, logoBase64: reader.result as string })); }; 
          reader.readAsDataURL(file); 
      } 
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; 
      if (file) { 
          const reader = new FileReader(); 
          reader.onloadend = () => { setReportConfig(prev => ({ ...prev, signatureBase64: reader.result as string })); }; 
          reader.readAsDataURL(file); 
      } 
  };

  const handleAutoFillHeader = () => { 
      const newConfig = { ...reportConfig }; 
      if (!newConfig.logoBase64) { newConfig.logoBase64 = "https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg"; } 
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
      alert('تم التعبئة التلقائية.'); 
  };

  const handleSaveSettings = () => { 
      if (currentUser) { 
          const configWithId = { ...reportConfig, teacherId: currentUser.id }; 
          saveReportHeaderConfig(configWithId); 
          saveUserTheme(userTheme);
          saveTeacherPeriodTimings(currentUser.id, periodTimings);
          if(onUpdateTheme) onUpdateTheme(userTheme); 
          alert('تم الحفظ بنجاح'); 
      } 
  };

  const handleTeacherSaveProfile = async () => { 
      if (!teacherProfile) return; 
      setIsSavingProfile(true); 
      try { 
          await updateTeacher(teacherProfile); 
          alert('تم الحفظ'); 
      } catch (e) { 
          alert('خطأ'); 
      } finally { 
          setIsSavingProfile(false); 
      } 
  };

  const updatePeriodTime = (index: number, value: string) => {
      const newTimings = [...periodTimings];
      newTimings[index] = value;
      setPeriodTimings(newTimings);
  };

  const handleResetTimings = () => {
      if(confirm('هل أنت متأكد من استعادة التوقيتات الافتراضية؟')) {
          setPeriodTimings([...DEFAULT_PERIOD_TIMES]);
      }
  };

  // --- New Class Management Handlers ---
  const handleAddClass = () => {
      if (!newClassName.trim() || !currentUser) return;
      
      const newClass: TeacherAssignment = {
          id: Date.now().toString(),
          classId: newClassName.trim(),
          subjectName: '', 
          teacherId: currentUser.id
      };
      
      addTeacherAssignment(newClass);
      setMyClasses(getTeacherAssignments(currentUser.id));
      setNewClassName('');
  };

  const handleDeleteClass = (id: string) => {
      if (confirm('هل أنت متأكد من حذف هذا الفصل من القائمة؟')) {
          deleteTeacherAssignment(id);
          setMyClasses(getTeacherAssignments(currentUser?.id));
      }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 overflow-hidden font-tajawal">
        {/* Tabs */}
        <div className="mb-6 flex overflow-x-auto gap-2 md:gap-4 border-b border-gray-200 pb-2 bg-white p-2 rounded-xl shadow-sm">
            <button onClick={() => setActiveTab('DASHBOARD')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center ${activeTab === 'DASHBOARD' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><LayoutGrid size={16} className="ml-2"/> لوحة التحكم</button>
            {isManager && <button onClick={() => setActiveTab('TEACHERS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center ${activeTab === 'TEACHERS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><Users size={16} className="ml-2"/> المعلمين</button>}
            <button onClick={() => setActiveTab('SUBJECTS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center ${activeTab === 'SUBJECTS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><BookOpen size={16} className="ml-2"/> {isManager ? 'المواد' : 'موادي'}</button>
            <button onClick={() => setActiveTab('CALENDAR')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center ${activeTab === 'CALENDAR' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><CalendarDays size={16} className="ml-2"/> التقويم</button>
            <button onClick={() => setActiveTab('SETTINGS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center ${activeTab === 'SETTINGS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><Settings size={16} className="ml-2"/> الإعدادات</button>
            <button onClick={() => setActiveTab('BACKUP')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center ${activeTab === 'BACKUP' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><Database size={16} className="ml-2"/> النسخ الاحتياطي</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-16">
            {/* BACKUP TAB */}
            {activeTab === 'BACKUP' && (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                    <div className="bg-indigo-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10"><Database size={250}/></div>
                        <div className="relative z-10">
                            <h3 className="text-3xl font-black mb-4 flex items-center gap-3"><DownloadCloud/> مركز البيانات الموحد</h3>
                            <p className="text-indigo-100 text-lg leading-relaxed max-w-2xl mb-10">
                                يمكنك الآن تصدير كافة بيانات النظام (الطلاب، سجل الحضور، كشف الدرجات، تقارير السلوك) في ملف Excel واحد منسق وجاهز للطباعة أو الأرشفة.
                            </p>
                            <button onClick={handleExportFullBackup} className="bg-white text-indigo-900 px-10 py-5 rounded-[2rem] font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4">
                                <FileText size={28}/> تصدير السجل الشامل (Excel)
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col items-center text-center gap-4">
                             <div className="p-4 bg-green-50 text-green-600 rounded-3xl"><ShieldCheck size={40}/></div>
                             <h4 className="font-black text-xl">أمان البيانات</h4>
                             <p className="text-sm text-gray-500 leading-relaxed font-medium">نظام المتابع الذكي يستخدم تشفيراً سحابياً (AES-256) لحماية بيانات طلابك وخصوصيتهم.</p>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col items-center text-center gap-4">
                             <div className="p-4 bg-orange-50 text-orange-600 rounded-3xl"><RotateCcw size={40}/></div>
                             <h4 className="font-black text-xl">استعادة النسخة</h4>
                             <p className="text-sm text-gray-500 leading-relaxed font-medium">في حال رغبتك في نقل البيانات لمدرسة أخرى أو حساب جديد، استخدم ميزة الاستيراد السحابي.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* DASHBOARD TAB */}
            {activeTab === 'DASHBOARD' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-xs font-bold mb-1">الطلاب</p>
                            <h3 className="text-3xl font-black text-gray-800">{students.length}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Users size={24}/></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-xs font-bold mb-1">المواد الدراسية</p>
                            <h3 className="text-3xl font-black text-gray-800">{subjects.length}</h3>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-full"><BookOpen size={24}/></div>
                    </div>
                    {mySchool && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-xs font-bold mb-1">المدرسة</p>
                                <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{mySchool.name}</h3>
                                <p className="text-xs text-gray-400">كود: {mySchool.ministryCode}</p>
                            </div>
                            <div className="p-3 bg-green-50 text-green-600 rounded-full"><Building2 size={24}/></div>
                        </div>
                    )}
                </div>
            )}

            {/* TEACHERS TAB */}
            {activeTab === 'TEACHERS' && isManager && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                                <tr>
                                    <th className="p-4 whitespace-nowrap">الاسم</th>
                                    <th className="p-4 whitespace-nowrap">التخصص</th>
                                    <th className="p-4 whitespace-nowrap">البريد</th>
                                    <th className="p-4 text-center whitespace-nowrap">الاشتراك</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {teachers.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                        <td className="p-4 font-bold text-gray-800">{t.name}</td>
                                        <td className="p-4 text-gray-600">{t.subjectSpecialty}</td>
                                        <td className="p-4 text-gray-600 font-mono text-xs">{t.email}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${t.subscriptionStatus === 'PRO' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {t.subscriptionStatus || 'FREE'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SUBJECTS TAB */}
            {activeTab === 'SUBJECTS' && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-4xl mx-auto">
                    <div className="flex gap-2 mb-6">
                        <input className="flex-1 p-2 border rounded-lg" placeholder="اسم المادة الجديدة..." value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                        <button onClick={handleAddSubject} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700">إضافة</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {subjects.map(s => (
                            <div key={s.id} className="p-3 bg-gray-50 border rounded-lg flex justify-between items-center group hover:border-indigo-200 transition-colors">
                                <span className="font-bold text-gray-700">{s.name}</span>
                                <button onClick={() => handleDeleteSubject(s.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CALENDAR TAB */}
            {activeTab === 'CALENDAR' && (
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-gray-500 mb-1">اسم الفصل الدراسي</label>
                            <input className="w-full p-2 border rounded text-sm" placeholder="الفصل الدراسي الأول 1446" value={newTermName} onChange={e => setNewTermName(e.target.value)}/>
                        </div>
                        <div className="w-full md:w-auto">
                            <label className="block text-xs font-bold text-gray-500 mb-1">البداية</label>
                            <input type="date" className="w-full p-2 border rounded text-sm" value={newTermStart} onChange={e => setNewTermStart(e.target.value)}/>
                        </div>
                        <div className="w-full md:w-auto">
                            <label className="block text-xs font-bold text-gray-500 mb-1">النهاية</label>
                            <input type="date" className="w-full p-2 border rounded text-sm" value={newTermEnd} onChange={e => setNewTermEnd(e.target.value)}/>
                        </div>
                        <button onClick={handleAddTerm} className="w-full md:w-auto bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 flex items-center justify-center gap-2">
                            <Plus size={16}/> إضافة فصل
                        </button>
                    </div>

                    <div className="space-y-4">
                        {academicTerms.map(term => (
                            <div key={term.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${term.isCurrent ? 'border-green-400 shadow-md ring-1 ring-green-100' : 'border-gray-200'}`}>
                                <div className="p-4 flex justify-between items-center bg-gray-50 cursor-pointer" onClick={() => setExpandedTermId(expandedTermId === term.id ? null : term.id)}>
                                    <div className="flex items-center gap-3">
                                        <button onClick={(e) => {e.stopPropagation(); handleSetCurrentTerm(term.id)}} className={`w-5 h-5 rounded-full border flex items-center justify-center ${term.isCurrent ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-300 hover:border-green-400'}`}>
                                            {term.isCurrent && <CheckCircle size={12}/>}
                                        </button>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{term.name}</h4>
                                            <p className="text-xs text-gray-500">{term.startDate} - {term.endDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {expandedTermId === term.id ? <ChevronDown size={18} className="text-gray-400"/> : <ChevronRight size={18} className="text-gray-400"/>}
                                        <button onClick={(e) => {e.stopPropagation(); handleDeleteTerm(term.id)}} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                
                                {expandedTermId === term.id && (
                                    <div className="p-4 border-t bg-white animate-slide-up">
                                        <h5 className="font-bold text-xs text-gray-500 mb-3 flex items-center gap-1"><List size={14}/> الفترات (Periods)</h5>
                                        <div className="space-y-2 mb-4">
                                            {(term.periods || []).sort((a: any, b: any) => {
                                                if (a.startDate && b.startDate && a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
                                                return a.name.localeCompare(b.name, 'ar');
                                            }).map(p => (
                                                <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 text-sm">
                                                    <span className="font-medium text-gray-700">{p.name} ({p.startDate} - {p.endDate})</span>
                                                    <button onClick={() => handleDeletePeriod(term, p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <div className="flex flex-col md:flex-row gap-2 items-end border-t pt-3">
                                            <div className="flex-1 w-full">
                                                <input className="w-full p-1.5 border rounded text-xs" placeholder="اسم الفترة..." value={newPeriodName} onChange={e => setNewPeriodName(e.target.value)}/>
                                            </div>
                                            <div className="w-full md:w-auto">
                                                <input type="date" className="w-full p-1.5 border rounded text-xs" value={newPeriodStart} onChange={e => setNewPeriodStart(e.target.value)}/>
                                            </div>
                                            <div className="w-full md:w-auto">
                                                <input type="date" className="w-full p-1.5 border rounded text-xs" value={newPeriodEnd} onChange={e => setNewPeriodEnd(e.target.value)}/>
                                            </div>
                                            <button onClick={() => handleAddPeriod(term)} className="w-full md:w-auto bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-100 border border-indigo-200">
                                                إضافة فترة
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'SETTINGS' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-10">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <Package className="text-teal-600"/> إدارة فصولي
                            </h3>
                        </div>
                        <div className="flex gap-2 mb-4">
                            <input 
                                className="flex-1 p-2 border rounded-lg"
                                placeholder="اسم الفصل (مثال: 1/أ)"
                                value={newClassName}
                                onChange={e => setNewClassName(e.target.value)}
                            />
                            <button onClick={handleAddClass} className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-teal-700">إضافة</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {myClasses.map(cls => (
                                <div key={cls.id} className="bg-gray-50 border rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm font-bold text-gray-700 group">
                                    <span>{cls.classId}</span>
                                    <button onClick={() => handleDeleteClass(cls.id)} className="text-gray-400 hover:text-red-500 p-0.5"><Trash2 size={12}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b pb-2 text-gray-800">
                            <FileText className="text-indigo-600"/> إعدادات التقارير
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">اسم المدرسة</label><input className="w-full p-2 border rounded bg-gray-50" value={reportConfig.schoolName} onChange={e => setReportConfig({...reportConfig, schoolName: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">اسم المعلم</label><input className="w-full p-2 border rounded bg-gray-50" value={reportConfig.teacherName} onChange={e => setReportConfig({...reportConfig, teacherName: e.target.value})} /></div>
                        </div>
                        <button onClick={handleSaveSettings} className="w-full bg-green-600 text-white py-3 rounded-xl font-black shadow-lg">حفظ الإعدادات</button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export const SchoolManagementComponent = SchoolManagement; 
export default SchoolManagement;
