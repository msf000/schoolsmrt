
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getSchools, getTeachers, getSubjects, addSubject, deleteSubject,
    getAcademicTerms, saveAcademicTerm, deleteAcademicTerm, setCurrentTerm,
    getReportHeaderConfig, saveReportHeaderConfig, getTeacherAssignments, addTeacherAssignment, deleteTeacherAssignment,
    getStudents, getAttendance
} from '../services/storageService';
import { 
    School, SystemUser, Teacher, Subject, AcademicTerm, ReportHeaderConfig, TeacherAssignment, Student 
} from '../types';
// Add missing TrendingUp import
import { 
    Building2, Users, Settings, Trash2, CheckCircle, Plus, LayoutGrid, CalendarDays, BookOpen, Save, Database, Download, Upload, ShieldCheck, ChevronLeft, Package, FileSpreadsheet, FileText, Briefcase, TrendingUp
} from 'lucide-react';
import DataImport from './DataImport';

const SchoolManagement: React.FC<{ students: Student[], onImportStudents: () => void, onImportPerformance: () => void, onImportAttendance: () => void, currentUser?: SystemUser | null }> = ({ students, onImportStudents, onImportPerformance, onImportAttendance, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SUBJECTS' | 'ACADEMIC' | 'OFFICIAL' | 'SYSTEM'>('OVERVIEW');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'STUDENTS' | 'PERFORMANCE' | 'ATTENDANCE'>('STUDENTS');
  
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

  return (
    <div className="space-y-8 animate-fade-in font-tajawal pb-16">
      {/* Premium Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-full bg-slate-900/5 -skew-x-12 translate-x-16"></div>
          <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200">
                  <Settings size={32} />
              </div>
              <div>
                  <h2 className="text-3xl font-black text-slate-800">إدارة النظام والمنشأة</h2>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Global System Configuration</p>
              </div>
          </div>

          <div className="flex bg-slate-100 p-1.5 rounded-2xl border relative z-10">
              <NavTab label="نظرة عامة" icon={LayoutGrid} active={activeTab==='OVERVIEW'} onClick={()=>setActiveTab('OVERVIEW')} />
              <NavTab label="المواد والفصول" icon={Package} active={activeTab==='SUBJECTS'} onClick={()=>setActiveTab('SUBJECTS')} />
              <NavTab label="البيانات" icon={Database} active={activeTab==='SYSTEM'} onClick={()=>setActiveTab('SYSTEM')} />
              <NavTab label="إعدادات رسمية" icon={ShieldCheck} active={activeTab==='OFFICIAL'} onClick={()=>setActiveTab('OFFICIAL')} />
          </div>
      </div>

      <div className="grid grid-cols-1 gap-8 overflow-hidden min-h-[500px]">
          {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up">
                  <AdminServiceCard icon={Briefcase} title="هيكل الفصول الدراسية" desc="تحديد الفصول التي تقوم بتدريسها حالياً وتوزيع المواد عليها." color="blue" onClick={()=>setActiveTab('SUBJECTS')}/>
                  <AdminServiceCard icon={FileSpreadsheet} title="استيراد كتل البيانات" desc="تحميل قوائم الطلاب والدرجات من ملفات Excel أو Google Sheets." color="emerald" onClick={()=>setActiveTab('SYSTEM')}/>
                  <AdminServiceCard icon={FileText} title="ترويسة التقارير الرسمية" desc="تخصيص أسماء المدراء، شعار المدرسة، وتوقيعك الشخصي." color="indigo" onClick={()=>setActiveTab('OFFICIAL')}/>
                  <AdminServiceCard icon={CalendarDays} title="التقويم الدراسي" desc="إدارة الفصول الدراسية والأسابيع الأكاديمية والمهام." color="amber" onClick={()=>setActiveTab('ACADEMIC')}/>
              </div>
          )}

          {activeTab === 'SUBJECTS' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up">
                  <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                      <h3 className="text-xl font-black text-slate-800 mb-8 border-b pb-4">المواد المسندة</h3>
                      <div className="flex gap-3 mb-8">
                          <input className="flex-1 p-3 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" placeholder="اسم المادة (مثلاً: لغتي)" value={newSubject} onChange={e=>setNewSubject(e.target.value)} />
                          <button onClick={() => { if(newSubject && currentUser){ addSubject({id: Date.now().toString(), name: newSubject, teacherId: currentUser.id}); setSubjects(getSubjects(currentUser.id)); setNewSubject(''); } }} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-lg">إضافة</button>
                      </div>
                      <div className="space-y-2">
                          {subjects.map(s => (
                              <div key={s.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100 group">
                                  <span className="font-bold text-slate-700">{s.name}</span>
                                  <button onClick={()=> {if(confirm('حذف؟')){ deleteSubject(s.id); setSubjects(getSubjects(currentUser?.id || '')); }}} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                      <h3 className="text-xl font-black text-slate-800 mb-8 border-b pb-4">الفصول الدراسية</h3>
                      <div className="flex gap-3 mb-8">
                          <input className="flex-1 p-3 bg-slate-50 border rounded-2xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all" placeholder="رقم الفصل (مثلاً: 1/أ)" value={newClassName} onChange={e=>setNewClassName(e.target.value)} />
                          <button onClick={() => { if(newClassName && currentUser){ addTeacherAssignment({id: Date.now().toString(), classId: newClassName, subjectName: '', teacherId: currentUser.id}); setMyClasses(getTeacherAssignments(currentUser.id)); setNewClassName(''); } }} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-lg">إضافة</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          {myClasses.map(c => (
                              <div key={c.id} className="p-4 bg-indigo-50/50 rounded-2xl flex justify-between items-center border border-indigo-100 group">
                                  <span className="font-black text-indigo-700">{c.classId}</span>
                                  <button onClick={()=> {if(confirm('حذف؟')){ deleteTeacherAssignment(c.id); setMyClasses(getTeacherAssignments(currentUser?.id || '')); }}} className="p-2 text-indigo-300 hover:text-red-500 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'SYSTEM' && (
              <div className="max-w-3xl mx-auto w-full animate-slide-up space-y-8">
                  <div className="bg-white p-10 rounded-[3rem] border shadow-sm text-center">
                        <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <Database size={48}/>
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-4">مركز استيراد وتصدير البيانات</h3>
                        <p className="text-slate-500 font-medium mb-10">يمكنك استيراد قوائم الطلاب أو الدرجات من ملفات Excel، كما يمكنك تحميل نسخة احتياطية كاملة من بياناتك.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button onClick={() => {setImportType('STUDENTS'); setShowImportModal(true);}} className="p-6 bg-slate-50 border rounded-[2rem] hover:border-emerald-500 transition-all group">
                                <Users size={32} className="text-slate-300 group-hover:text-emerald-500 mx-auto mb-4"/>
                                <span className="font-black text-slate-700">استيراد الطلاب</span>
                            </button>
                            <button onClick={() => {setImportType('PERFORMANCE'); setShowImportModal(true);}} className="p-6 bg-slate-50 border rounded-[2rem] hover:border-emerald-500 transition-all group">
                                <TrendingUp size={32} className="text-slate-300 group-hover:text-emerald-500 mx-auto mb-4"/>
                                <span className="font-black text-slate-700">استيراد الدرجات</span>
                            </button>
                        </div>
                  </div>
              </div>
          )}

          {activeTab === 'OFFICIAL' && (
              <div className="max-w-4xl mx-auto w-full animate-slide-up">
                  <div className="bg-white p-10 rounded-[4rem] border shadow-xl space-y-10">
                      <div className="flex justify-between items-center border-b pb-6">
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><ShieldCheck className="text-indigo-600" size={32}/> الهوية الرسمية للتقارير</h3>
                        <button onClick={() => { saveReportHeaderConfig({...reportConfig, teacherId: currentUser?.id}); alert('تم حفظ الإعدادات الرسمية بنجاح.'); }} className="px-10 py-3 bg-blue-700 text-white rounded-2xl font-black shadow-lg hover:bg-blue-800 transition-all">حفظ التغييرات</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <ConfigInput label="إدارة التعليم" value={reportConfig.educationAdmin} onChange={(v: string)=>setReportConfig({...reportConfig, educationAdmin:v})} />
                          <ConfigInput label="اسم المدرسة" value={reportConfig.schoolName} onChange={(v: string)=>setReportConfig({...reportConfig, schoolName:v})} />
                          <ConfigInput label="مدير المدرسة" value={reportConfig.schoolManager} onChange={(v: string)=>setReportConfig({...reportConfig, schoolManager:v})} />
                          <ConfigInput label="معلم المادة" value={reportConfig.teacherName} onChange={(v: string)=>setReportConfig({...reportConfig, teacherName:v})} />
                          <ConfigInput label="العام الدراسي" value={reportConfig.academicYear} onChange={(v: string)=>setReportConfig({...reportConfig, academicYear:v})} placeholder="1446-1447هـ" />
                          <ConfigInput label="الفصل الدراسي" value={reportConfig.term} onChange={(v: string)=>setReportConfig({...reportConfig, term:v})} placeholder="الفصل الأول" />
                      </div>
                  </div>
              </div>
          )}
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

// Fix: Typed the props for ConfigInput to avoid implicit any
const ConfigInput = ({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder?: string }) => (
    <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 mr-1">{label}</label>
        <input 
            className="w-full p-4 bg-slate-50 border rounded-2xl font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white focus:border-indigo-500 transition-all" 
            value={value} 
            onChange={e=>onChange(e.target.value)} 
            placeholder={placeholder}
        />
    </div>
);

const NavTab = ({ label, icon: Icon, active, onClick }: any) => (
    <button onClick={onClick} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${active ? 'bg-white text-slate-900 shadow-md border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}>
        <Icon size={16}/> {label}
    </button>
);

const AdminServiceCard = ({ icon: Icon, title, desc, color, onClick }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100'
    };
    return (
        <button onClick={onClick} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all flex items-start gap-8 text-right group">
            <div className={`p-5 rounded-3xl ${colors[color]} group-hover:scale-110 transition-transform shadow-inner`}>
                <Icon size={32}/>
            </div>
            <div className="flex-1">
                <h4 className="text-xl font-black text-slate-800 mb-2">{title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">{desc}</p>
            </div>
            <ChevronLeft className="text-slate-200 mt-2 group-hover:text-slate-800 group-hover:translate-x-[-4px] transition-all" />
        </button>
    );
};

export default SchoolManagement;
