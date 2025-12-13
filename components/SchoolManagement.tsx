
import React, { useState, useEffect } from 'react';
import { Teacher, School, SystemUser, Subject, ReportHeaderConfig, UserTheme, AcademicTerm, TermPeriod } from '../types';
import { 
    getTeachers, updateTeacher,
    getSchools, getSubjects, addSubject, deleteSubject,
    getReportHeaderConfig, saveReportHeaderConfig,
    getUserTheme, saveUserTheme,
    getAcademicTerms, saveAcademicTerm, deleteAcademicTerm, setCurrentTerm
} from '../services/storageService';
import { Trash2, User, Building2, Save, Users, FileText, BookOpen, Settings, CheckCircle, Plus, LayoutGrid, CalendarDays, ListTree, ChevronDown, ChevronRight, PenTool, Sparkles } from 'lucide-react';

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
  
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TEACHERS' | 'SUBJECTS' | 'CALENDAR' | 'SETTINGS'>(() => {
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

  useEffect(() => {
      if (currentUser) {
          setSubjects(getSubjects(currentUser.id));
          setReportConfig(getReportHeaderConfig(currentUser.id));
          setAcademicTerms(getAcademicTerms(currentUser.id));
      }
      setUserTheme(getUserTheme());
      const allTeachers = getTeachers();
      setTeachers(allTeachers);
      
      if (isManager) {
          const allSchools = getSchools();
          let school = allSchools.find(s => s.managerNationalId === currentUser?.nationalId || s.managerName === currentUser?.name);
          if (!school && currentUser?.role === 'SUPER_ADMIN' && allSchools.length > 0) school = allSchools[0];
          setMySchool(school || null);
      } else {
          let me: Teacher | undefined;
          if (currentUser?.id) me = allTeachers.find(t => t.id === currentUser.id);
          if (!me) me = allTeachers.find(t => (currentUser?.nationalId && t.nationalId === currentUser.nationalId) || (currentUser?.email && t.email === currentUser.email));
          if (me) {
              setTeacherProfile(me);
              if (me.schoolId) {
                  const schools = getSchools();
                  const school = schools.find(s => s.id === me.schoolId);
                  setMySchool(school || null);
              } else { setMySchool(null); }
          }
      }
  }, [currentUser, isManager, activeTab]); 

  // Helpers
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

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-hidden">
        {/* Tabs */}
        <div className="mb-6 flex overflow-x-auto gap-4 border-b border-gray-200 pb-2 bg-white p-2 rounded-xl shadow-sm">
            <button onClick={() => setActiveTab('DASHBOARD')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'DASHBOARD' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><LayoutGrid size={16} className="inline mr-2"/> لوحة التحكم</button>
            {isManager && <button onClick={() => setActiveTab('TEACHERS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'TEACHERS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><Users size={16} className="inline mr-2"/> المعلمين</button>}
            <button onClick={() => setActiveTab('SUBJECTS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'SUBJECTS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><BookOpen size={16} className="inline mr-2"/> {isManager ? 'قائمة المواد' : 'موادي وفصولي'}</button>
            <button onClick={() => setActiveTab('CALENDAR')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'CALENDAR' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><CalendarDays size={16} className="inline mr-2"/> التقويم الدراسي</button>
            <button onClick={() => setActiveTab('SETTINGS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'SETTINGS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><Settings size={16} className="inline mr-2"/> {isManager ? 'إعدادات المدرسة' : 'الإعدادات الشخصية'}</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                            <tr>
                                <th className="p-4">الاسم</th>
                                <th className="p-4">التخصص</th>
                                <th className="p-4">البريد</th>
                                <th className="p-4 text-center">الاشتراك</th>
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
            )}

            {/* SUBJECTS TAB */}
            {activeTab === 'SUBJECTS' && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-4xl mx-auto">
                    <div className="flex gap-2 mb-6">
                        <input className="flex-1 p-2 border rounded-lg" placeholder="اسم المادة الجديدة..." value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                        <button onClick={handleAddSubject} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700">إضافة</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
                    {/* Add Term */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1">اسم الفصل الدراسي</label>
                            <input className="w-full p-2 border rounded text-sm" placeholder="الفصل الدراسي الأول 1446" value={newTermName} onChange={e => setNewTermName(e.target.value)}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">البداية</label>
                            <input type="date" className="w-full p-2 border rounded text-sm" value={newTermStart} onChange={e => setNewTermStart(e.target.value)}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">النهاية</label>
                            <input type="date" className="w-full p-2 border rounded text-sm" value={newTermEnd} onChange={e => setNewTermEnd(e.target.value)}/>
                        </div>
                        <button onClick={handleAddTerm} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 flex items-center gap-2">
                            <Plus size={16}/> إضافة فصل
                        </button>
                    </div>

                    {/* Terms List */}
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
                                        <h5 className="font-bold text-xs text-gray-500 mb-3 flex items-center gap-1"><ListTree size={14}/> الفترات (Periods)</h5>
                                        <div className="space-y-2 mb-4">
                                            {/* SORTED PERIODS FOR DISPLAY: Chronologically or Name based */}
                                            {term.periods?.sort((a,b) => {
                                                if (a.startDate && b.startDate && a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
                                                return a.name.localeCompare(b.name, 'ar');
                                            }).map(p => (
                                                <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 text-sm">
                                                    <span className="font-medium text-gray-700">{p.name} ({p.startDate} - {p.endDate})</span>
                                                    <button onClick={() => handleDeletePeriod(term, p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                                </div>
                                            ))}
                                            {!term.periods?.length && <p className="text-xs text-gray-400 italic">لا توجد فترات مضافة.</p>}
                                        </div>
                                        
                                        <div className="flex gap-2 items-end border-t pt-3">
                                            <div className="flex-1">
                                                <input className="w-full p-1.5 border rounded text-xs" placeholder="اسم الفترة (الأولى...)" value={newPeriodName} onChange={e => setNewPeriodName(e.target.value)}/>
                                            </div>
                                            <div>
                                                <input type="date" className="w-full p-1.5 border rounded text-xs" value={newPeriodStart} onChange={e => setNewPeriodStart(e.target.value)}/>
                                            </div>
                                            <div>
                                                <input type="date" className="w-full p-1.5 border rounded text-xs" value={newPeriodEnd} onChange={e => setNewPeriodEnd(e.target.value)}/>
                                            </div>
                                            <button onClick={() => handleAddPeriod(term)} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-100 border border-indigo-200">
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
                <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b pb-2 text-gray-800">
                            <FileText className="text-indigo-600"/> إعدادات الترويسة والتقارير
                        </h3>
                        
                        <button 
                            onClick={handleAutoFillHeader}
                            className="mb-6 w-full py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
                        >
                            <Sparkles size={18}/> تعبئة تلقائية (بياناتي + الشعار الرسمي)
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">اسم المدرسة</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.schoolName} onChange={e => setReportConfig({...reportConfig, schoolName: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">إدارة التعليم</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.educationAdmin} onChange={e => setReportConfig({...reportConfig, educationAdmin: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">اسم المعلم</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.teacherName} onChange={e => setReportConfig({...reportConfig, teacherName: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">مدير المدرسة</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.schoolManager} onChange={e => setReportConfig({...reportConfig, schoolManager: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">العام الدراسي</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.academicYear} onChange={e => setReportConfig({...reportConfig, academicYear: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">الفصل الدراسي</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.term} onChange={e => setReportConfig({...reportConfig, term: e.target.value})} /></div>
                        </div>

                        <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">شعار المدرسة</label>
                                <div className="flex items-center gap-4">
                                    {reportConfig.logoBase64 && <img src={reportConfig.logoBase64} alt="Logo" className="h-16 w-16 object-contain border rounded p-1 bg-white" />}
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-gray-500 w-full" />
                                </div>
                            </div>
                            
                            {/* Signature Upload */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1"><PenTool size={14}/> التوقيع الرقمي (للاعتماد)</label>
                                <div className="flex items-center gap-4">
                                    {reportConfig.signatureBase64 ? (
                                        <div className="relative group">
                                            <img src={reportConfig.signatureBase64} alt="Signature" className="h-12 object-contain border border-dashed rounded p-1 bg-white" />
                                            <button onClick={() => setReportConfig({...reportConfig, signatureBase64: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10}/></button>
                                        </div>
                                    ) : <div className="h-12 w-20 border border-dashed rounded flex items-center justify-center text-xs text-gray-400">لا يوجد</div>}
                                    <input type="file" accept="image/*" onChange={handleSignatureUpload} className="text-sm text-gray-500 w-full" />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">سيظهر هذا التوقيع تلقائياً في الشهادات والتقارير.</p>
                            </div>
                        </div>
                    </div>

                    {/* Teacher Profile Section */}
                    {!isManager && teacherProfile && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b pb-2 text-gray-800">
                                <User className="text-indigo-600"/> البيانات الشخصية
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">الاسم</label><input className="w-full p-2 border rounded bg-gray-50" value={teacherProfile.name} onChange={e => setTeacherProfile({...teacherProfile, name: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">رقم الهوية</label><input className="w-full p-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed" value={teacherProfile.nationalId} readOnly /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">رقم الجوال</label><input className="w-full p-2 border rounded bg-gray-50" value={teacherProfile.phone || ''} onChange={e => setTeacherProfile({...teacherProfile, phone: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">التخصص</label><input className="w-full p-2 border rounded bg-gray-50" value={teacherProfile.subjectSpecialty || ''} onChange={e => setTeacherProfile({...teacherProfile, subjectSpecialty: e.target.value})} /></div>
                            </div>
                            <button onClick={handleTeacherSaveProfile} disabled={isSavingProfile} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">
                                {isSavingProfile ? 'جاري الحفظ...' : 'حفظ البيانات'}
                            </button>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button onClick={handleSaveSettings} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg flex items-center gap-2">
                            <Save size={20}/> حفظ الإعدادات
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
