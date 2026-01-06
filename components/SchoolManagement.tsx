
import React, { useState, useEffect, useMemo } from 'react';
import { 
    fetchSchools, fetchTeachers, getSubjects, addSubject, deleteSubject,
    getAcademicTerms, saveAcademicTerm, deleteAcademicTerm, setCurrentTerm,
    getReportHeaderConfig, saveReportHeaderConfig, getTeacherAssignments, addTeacherAssignment, deleteTeacherAssignment,
    getStudents, getAttendance
} from '../services/storageService';
import { 
    School, SystemUser, Teacher, Subject, AcademicTerm, ReportHeaderConfig, TeacherAssignment, Student 
} from '../types';
import { 
    Building2, Users, Settings, Trash2, CheckCircle, Plus, LayoutGrid, CalendarDays, BookOpen, Save, Database, Download, Upload, ShieldCheck, ChevronLeft, Package, FileSpreadsheet, FileText, Briefcase, TrendingUp, X
} from 'lucide-react';
import DataImport from './DataImport';

const SchoolManagement: React.FC<{ students: Student[], onImportStudents: () => void, onImportPerformance: () => void, onImportAttendance: () => void, currentUser?: SystemUser | null }> = ({ students, onImportStudents, onImportPerformance, onImportAttendance, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'SUBJECTS' | 'OFFICIAL' | 'SYSTEM'>('SUBJECTS');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE'>('STUDENTS');
  
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
          setMyClasses(getTeacherAssignments(currentUser.id));
      }
  }, [currentUser]); 

  return (
    <div className="space-y-6 page-enter font-tajawal pb-10 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">إعدادات المنظومة</h1>
            <p className="text-slate-500 text-sm">تخصيص المواد، الفصول، والهوية الرسمية للتقارير.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            <button onClick={()=>setActiveTab('SUBJECTS')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab==='SUBJECTS'?'bg-brand-500 text-white shadow-sm':'text-slate-500 hover:text-slate-900'}`}>المواد والفصول</button>
            <button onClick={()=>setActiveTab('SYSTEM')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab==='SYSTEM'?'bg-brand-500 text-white shadow-sm':'text-slate-500 hover:text-slate-900'}`}>البيانات</button>
            <button onClick={()=>setActiveTab('OFFICIAL')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab==='OFFICIAL'?'bg-brand-500 text-white shadow-sm':'text-slate-500 hover:text-slate-900'}`}>الرسميات</button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {activeTab === 'SUBJECTS' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-6">
                          <h3 className="text-lg font-bold text-slate-800 border-r-4 border-brand-500 pr-3">إدارة المواد المسندة</h3>
                          <div className="flex gap-2">
                              <input className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-brand-500" placeholder="اسم المادة (مثلاً: لغتي)" value={newSubject} onChange={e=>setNewSubject(e.target.value)} />
                              <button onClick={() => { if(newSubject && currentUser){ addSubject({id: Date.now().toString(), name: newSubject, teacherId: currentUser.id}); setSubjects(getSubjects(currentUser.id)); setNewSubject(''); } }} className="px-6 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600">إضافة</button>
                          </div>
                          <div className="space-y-2">
                              {subjects.map(s => (
                                  <div key={s.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100 group">
                                      <span className="text-sm font-bold text-slate-700">{s.name}</span>
                                      <button onClick={()=> {if(confirm('حذف؟')){ deleteSubject(s.id); setSubjects(getSubjects(currentUser?.id || '')); }}} className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="space-y-6">
                          <h3 className="text-lg font-bold text-slate-800 border-r-4 border-brand-500 pr-3">إدارة الفصول الدراسية</h3>
                          <div className="flex gap-2">
                              <input className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-brand-500" placeholder="رقم الفصل (مثلاً: 1/أ)" value={newClassName} onChange={e=>setNewClassName(e.target.value)} />
                              <button onClick={() => { if(newClassName && currentUser){ addTeacherAssignment({id: Date.now().toString(), classId: newClassName, subjectName: '', teacherId: currentUser.id}); setMyClasses(getTeacherAssignments(currentUser.id)); setNewClassName(''); } }} className="px-6 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600">إضافة</button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              {myClasses.map(c => (
                                  <div key={c.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center border border-slate-100 group">
                                      <span className="text-sm font-black text-brand-600">{c.classId}</span>
                                      <button onClick={()=> {if(confirm('حذف؟')){ deleteTeacherAssignment(c.id); setMyClasses(getTeacherAssignments(currentUser?.id || '')); }}} className="p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'SYSTEM' && (
                  <div className="max-w-2xl mx-auto space-y-12 py-10 text-center">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner"><Database size={32}/></div>
                            <h3 className="text-xl font-bold text-slate-800">مركز استيراد البيانات</h3>
                            <p className="text-slate-500 text-sm">استخدم ملفات Excel لتعبئة قاعدة البيانات بسرعة وسهولة.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={() => {setImportType('STUDENTS'); setShowImportModal(true);}} className="p-8 bg-white border border-slate-200 rounded-2xl hover:border-brand-500 hover:shadow-lg transition-all group flex flex-col items-center gap-3">
                                <Users size={32} className="text-slate-300 group-hover:text-brand-500 transition-colors"/>
                                <span className="font-bold text-slate-700">استيراد قائمة الطلاب</span>
                            </button>
                            <button onClick={() => {setImportType('PERFORMANCE'); setShowImportModal(true);}} className="p-8 bg-white border border-slate-200 rounded-2xl hover:border-brand-500 hover:shadow-lg transition-all group flex flex-col items-center gap-3">
                                <TrendingUp size={32} className="text-slate-300 group-hover:text-brand-500 transition-colors"/>
                                <span className="font-bold text-slate-700">استيراد سجل الدرجات</span>
                            </button>
                        </div>
                  </div>
              )}

              {activeTab === 'OFFICIAL' && (
                  <div className="max-w-3xl mx-auto space-y-8">
                      <div className="flex justify-between items-center border-b pb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="text-brand-500" size={20}/> ترويسة التقارير الرسمية</h3>
                        <button onClick={() => { saveReportHeaderConfig({...reportConfig, teacherId: currentUser?.id}); alert('تم الحفظ.'); }} className="px-8 py-2 bg-brand-500 text-white rounded-xl font-bold text-sm shadow-md hover:bg-brand-600 transition-all">حفظ التغييرات</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <ConfigInput label="إدارة التعليم" value={reportConfig.educationAdmin} onChange={(v: string)=>setReportConfig({...reportConfig, educationAdmin:v})} />
                          <ConfigInput label="اسم المدرسة" value={reportConfig.schoolName} onChange={(v: string)=>setReportConfig({...reportConfig, schoolName:v})} />
                          <ConfigInput label="قائد المدرسة" value={reportConfig.schoolManager} onChange={(v: string)=>setReportConfig({...reportConfig, schoolManager:v})} />
                          <ConfigInput label="معلم المادة" value={reportConfig.teacherName} onChange={(v: string)=>setReportConfig({...reportConfig, teacherName:v})} />
                          <ConfigInput label="العام الدراسي" value={reportConfig.academicYear} onChange={(v: string)=>setReportConfig({...reportConfig, academicYear:v})} />
                          <ConfigInput label="الفترة الحالية" value={reportConfig.term} onChange={(v: string)=>setReportConfig({...reportConfig, term:v})} />
                      </div>
                  </div>
              )}
          </div>
      </div>

      {showImportModal && (
          <DataImport 
              forcedType={importType}
              existingStudents={students}
              onImportStudents={() => { onImportStudents(); setShowImportModal(false); }}
              onImportPerformance={() => { onImportPerformance(); setShowImportModal(false); }}
              onImportAttendance={() => { onImportAttendance(); setShowImportModal(false); }}
              onClose={() => setShowImportModal(false)}
              currentUser={currentUser}
          />
      )}
    </div>
  );
};

const ConfigInput = ({ label, value, onChange }: any) => (
    <div className="space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">{label}</label>
        <input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-brand-500 transition-all" value={value} onChange={e=>onChange(e.target.value)} />
    </div>
);

export default SchoolManagement;
