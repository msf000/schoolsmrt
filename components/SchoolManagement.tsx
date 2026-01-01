
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
    School, SystemUser, Teacher, Subject, AcademicTerm, ReportHeaderConfig, UserTheme, TermPeriod, TeacherAssignment, Student 
} from '../types';
import { 
    Building2, Users, Settings, 
    Trash2, CheckCircle, Plus, LayoutGrid, CalendarDays, List, ChevronDown, ChevronRight, ChevronLeft, PenTool, Sparkles, FileText, BookOpen, Save, User, Clock, RotateCcw, Package, Database, DownloadCloud, ShieldCheck, FileSpreadsheet, Upload, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import DataImport from './DataImport';

interface SchoolManagementProps {
    students: Student[];
    onImportStudents: () => void;
    onImportPerformance: () => void;
    onImportAttendance: () => void;
    currentUser?: SystemUser | null;
}

const SchoolManagement: React.FC<SchoolManagementProps> = ({ 
    students, 
    onImportStudents, 
    onImportPerformance, 
    onImportAttendance, 
    currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'SUBJECTS' | 'CALENDAR' | 'SETTINGS' | 'BACKUP'>('DASHBOARD');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE'>('STUDENTS');
  
  // Data States
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportHeaderConfig>({
      schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '', signatureBase64: ''
  });
  const [newSubject, setNewSubject] = useState('');
  const [myClasses, setMyClasses] = useState<TeacherAssignment[]>([]);
  const [newClassName, setNewClassName] = useState('');

  useEffect(() => {
      if (currentUser) {
          setSubjects(getSubjects(currentUser.id));
          setReportConfig(getReportHeaderConfig(currentUser.id));
          setAcademicTerms(getAcademicTerms(currentUser.id));
          setMyClasses(getTeacherAssignments(currentUser.id));
      }
  }, [currentUser]); 

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

  const handleAddClass = () => {
      if (!newClassName.trim() || !currentUser) return;
      addTeacherAssignment({ id: Date.now().toString(), classId: newClassName.trim(), subjectName: '', teacherId: currentUser.id });
      setMyClasses(getTeacherAssignments(currentUser.id));
      setNewClassName('');
  };

  const handleSaveSettings = () => { 
      if (currentUser) { 
          saveReportHeaderConfig({ ...reportConfig, teacherId: currentUser.id }); 
          alert('تم حفظ الإعدادات بنجاح'); 
      } 
  };

  const exportAllData = () => {
    const data = {
        students: getStudents(),
        attendance: getAttendance(),
        performance: getPerformanceRecords(), // local helper or direct from service
        settings: reportConfig
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const getPerformanceRecords = () => {
      // Simple helper for backup
      return JSON.parse(localStorage.getItem('performance') || '[]');
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 font-tajawal">
        <div className="mb-6 flex overflow-x-auto gap-2 border-b border-slate-200 pb-2 bg-white p-2 rounded-xl shadow-sm no-scrollbar">
            <NavTab label="نظرة عامة" icon={LayoutGrid} active={activeTab==='DASHBOARD'} onClick={()=>setActiveTab('DASHBOARD')} />
            <NavTab label="إدارة المواد" icon={BookOpen} active={activeTab==='SUBJECTS'} onClick={()=>setActiveTab('SUBJECTS')} />
            <NavTab label="التقويم الدراسي" icon={CalendarDays} active={activeTab==='CALENDAR'} onClick={()=>setActiveTab('CALENDAR')} />
            <NavTab label="إعدادات التقارير" icon={Settings} active={activeTab==='SETTINGS'} onClick={()=>setActiveTab('SETTINGS')} />
            <NavTab label="النسخ الاحتياطي" icon={Database} active={activeTab==='BACKUP'} onClick={()=>setActiveTab('BACKUP')} />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
            {activeTab === 'DASHBOARD' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Package size={18} className="text-blue-600"/> فصولي الدراسية</h3>
                        <div className="flex gap-2 mb-4">
                            <input className="flex-1 p-2 border rounded-md text-xs" placeholder="اسم الفصل (مثال: 1/أ)" value={newClassName} onChange={e=>setNewClassName(e.target.value)} />
                            <button onClick={handleAddClass} className="bg-blue-600 text-white px-4 py-2 rounded-md text-xs font-bold">إضافة</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {myClasses.map(c => (
                                <div key={c.id} className="bg-slate-50 border px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 flex items-center gap-2 group">
                                    {c.classId}
                                    <button onClick={()=> {deleteTeacherAssignment(c.id); setMyClasses(getTeacherAssignments(currentUser?.id))}} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Upload size={18} className="text-emerald-600"/> استيراد بيانات جماعي</h3>
                        <p className="text-xs text-slate-500 mb-2">يمكنك استيراد قوائم الطلاب أو الدرجات من ملفات Excel مباشرة.</p>
                        <div className="grid grid-cols-1 gap-2">
                            <button onClick={() => {setImportType('STUDENTS'); setShowImportModal(true);}} className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <Users size={16} className="text-blue-600"/>
                                    <span className="text-xs font-bold">استيراد قائمة الطلاب</span>
                                </div>
                                <ChevronLeft size={14} className="text-slate-300"/>
                            </button>
                            <button onClick={() => {setImportType('PERFORMANCE'); setShowImportModal(true);}} className="flex items-center justify-between p-3 bg-slate-50 border rounded-lg hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <FileSpreadsheet size={16} className="text-emerald-600"/>
                                    <span className="text-xs font-bold">استيراد سجل الدرجات</span>
                                </div>
                                <ChevronLeft size={14} className="text-slate-300"/>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'SUBJECTS' && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto">
                    <h3 className="font-bold text-slate-800 mb-6">قائمة المواد الدراسية</h3>
                    <div className="flex gap-2 mb-6">
                        <input className="flex-1 p-2 border rounded-lg text-sm" placeholder="اسم المادة..." value={newSubject} onChange={e=>setNewSubject(e.target.value)} />
                        <button onClick={handleAddSubject} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold">إضافة</button>
                    </div>
                    <div className="space-y-2">
                        {subjects.map(s => (
                            <div key={s.id} className="p-3 bg-slate-50 border rounded-lg flex justify-between items-center group">
                                <span className="text-sm font-bold text-slate-700">{s.name}</span>
                                <button onClick={() => handleDeleteSubject(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'SETTINGS' && (
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto space-y-6">
                    <h3 className="font-bold text-slate-800 border-b pb-4 mb-4">ترويسة التقارير والشهادات</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">اسم المدرسة</label>
                            <input className="w-full p-2 border rounded-md text-sm font-bold" value={reportConfig.schoolName} onChange={e=>setReportConfig({...reportConfig, schoolName:e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">اسم المعلم</label>
                            <input className="w-full p-2 border rounded-md text-sm font-bold" value={reportConfig.teacherName} onChange={e=>setReportConfig({...reportConfig, teacherName:e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">إدارة التعليم</label>
                            <input className="w-full p-2 border rounded-md text-sm font-bold" value={reportConfig.educationAdmin} onChange={e=>setReportConfig({...reportConfig, educationAdmin:e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">مدير المدرسة</label>
                            <input className="w-full p-2 border rounded-md text-sm font-bold" value={reportConfig.schoolManager} onChange={e=>setReportConfig({...reportConfig, schoolManager:e.target.value})} />
                        </div>
                    </div>
                    <button onClick={handleSaveSettings} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-700">حفظ كافة الإعدادات</button>
                </div>
            )}

            {activeTab === 'BACKUP' && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm text-center">
                        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Database size={40}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">تصدير النسخة الاحتياطية</h3>
                        <p className="text-sm text-slate-500 mb-8">قم بتحميل نسخة كاملة من بياناتك (الطلاب، الدرجات، الإعدادات) لاستعادتها في أي وقت أو للاحتفاظ بها خارج النظام.</p>
                        <button onClick={exportAllData} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-10 py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-100">
                            <Download size={20}/> تصدير بصيغة JSON
                        </button>
                    </div>
                </div>
            )}
        </div>

        {showImportModal && (
            <DataImport 
                forcedType={importType}
                existingStudents={students}
                onImportStudents={(data) => { onImportStudents(); setShowImportModal(false); }}
                onImportPerformance={(data) => { onImportPerformance(); setShowImportModal(false); }}
                onImportAttendance={(data) => { onImportAttendance(); setShowImportModal(false); }}
                onClose={() => setShowImportModal(false)}
                currentUser={currentUser}
            />
        )}
    </div>
  );
};

const NavTab = ({ label, icon: Icon, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
        <Icon size={16}/> {label}
    </button>
);

export default SchoolManagement;
