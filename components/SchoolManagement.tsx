import React, { useState, useEffect, useMemo } from 'react';
import { Teacher, Parent, Subject, Student, ScheduleItem, DayOfWeek, ReportHeaderConfig, TeacherAssignment } from '../types';
import { 
    getTeachers, addTeacher, deleteTeacher, updateTeacher,
    getParents, addParent, deleteParent, updateParent,
    getSubjects, addSubject, deleteSubject, updateSubject,
    getSchedules, saveScheduleItem, deleteScheduleItem,
    getReportHeaderConfig, saveReportHeaderConfig,
    saveWorksMasterUrl, getWorksMasterUrl,
    getTeacherAssignments, saveTeacherAssignment, deleteTeacherAssignment
} from '../services/storageService';
import { Trash2, Plus, Book, Users, User, Phone, Mail, Building2, Database, Save, Link as LinkIcon, Calendar, Filter, AlertCircle, Edit2, Check, Layers, GraduationCap, MapPin, Upload, Briefcase, Table, Printer, Copy, ArrowLeft, Search, X, Lock, FileText, Settings } from 'lucide-react';

interface SchoolManagementProps {
    students: Student[];
    onImportStudents: (students: Student[], matchKey?: keyof Student, strategy?: 'UPDATE' | 'SKIP' | 'NEW', updateFields?: string[]) => void;
    onImportPerformance: (records: any[]) => void;
    onImportAttendance: (records: any[]) => void;
}

const SchoolManagement: React.FC<SchoolManagementProps> = ({ 
    students, 
    onImportStudents, 
    onImportPerformance, 
    onImportAttendance 
}) => {
  const [activeTab, setActiveTab] = useState<'TIMETABLE' | 'ASSIGNMENTS' | 'TEACHERS' | 'PARENTS' | 'SUBJECTS' | 'SETTINGS'>('TIMETABLE');
  
  // Data States
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportHeaderConfig>({ schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' });
  const [worksUrl, setWorksUrl] = useState('');

  // Derived
  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean) as string[])).sort(), [students]);

  useEffect(() => {
      refreshData();
  }, []);

  const refreshData = () => {
      setTeachers(getTeachers());
      setParents(getParents());
      setSubjects(getSubjects());
      setSchedules(getSchedules());
      setAssignments(getTeacherAssignments());
      setReportConfig(getReportHeaderConfig());
      setWorksUrl(getWorksMasterUrl());
  };

  // --- Sub-Components Handlers ---
  const handleAddTeacher = (name: string, phone: string, specialty: string) => {
      addTeacher({ id: Date.now().toString(), name, phone, subjectSpecialty: specialty });
      refreshData();
  };

  const handleAddSubject = (name: string) => {
      addSubject({ id: Date.now().toString(), name });
      refreshData();
  };

  const handleSaveSchedule = (item: ScheduleItem) => {
      saveScheduleItem(item);
      refreshData();
  };

  const handleSaveAssignment = (assignment: TeacherAssignment) => {
      saveTeacherAssignment(assignment);
      refreshData();
  };

  return (
    <div className="p-6 animate-fade-in space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="text-gray-600"/> إدارة المدرسة
        </h2>
        <p className="text-gray-500 text-sm mt-1">إعدادات المعلمين، المواد، الجداول، والبيانات الأساسية.</p>
      </div>

      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
          {[
              { id: 'TIMETABLE', label: 'الجدول المدرسي', icon: Calendar },
              { id: 'ASSIGNMENTS', label: 'توزيع المعلمين', icon: Briefcase },
              { id: 'TEACHERS', label: 'المعلمين', icon: User },
              { id: 'SUBJECTS', label: 'المواد', icon: Book },
              { id: 'SETTINGS', label: 'إعدادات عامة', icon: Settings },
          ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                  <tab.icon size={16}/> {tab.label}
              </button>
          ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 min-h-[500px]">
          {activeTab === 'TEACHERS' && (
              <div className="space-y-4">
                  <AddTeacherForm onAdd={handleAddTeacher} />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {teachers.map(t => (
                          <div key={t.id} className="p-4 border rounded-lg flex justify-between items-start hover:shadow-sm">
                              <div>
                                  <h4 className="font-bold text-gray-800">{t.name}</h4>
                                  <p className="text-xs text-gray-500">{t.subjectSpecialty}</p>
                                  <p className="text-xs text-gray-400 font-mono">{t.phone}</p>
                              </div>
                              <button onClick={() => { deleteTeacher(t.id); refreshData(); }} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'SUBJECTS' && (
              <div className="space-y-4">
                  <div className="flex gap-2">
                      <input id="newSub" placeholder="اسم المادة" className="border p-2 rounded flex-1" />
                      <button onClick={() => { const el = document.getElementById('newSub') as HTMLInputElement; if(el.value) { handleAddSubject(el.value); el.value=''; } }} className="bg-indigo-600 text-white px-4 rounded font-bold">إضافة</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {subjects.map(s => (
                          <div key={s.id} className="bg-gray-50 border px-3 py-1.5 rounded-lg flex items-center gap-2">
                              <span>{s.name}</span>
                              <button onClick={() => { deleteSubject(s.id); refreshData(); }} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'TIMETABLE' && (
              <div className="overflow-x-auto">
                  <div className="mb-4 flex gap-4 items-center">
                      <p className="text-sm text-gray-500">قم بتعبئة الجدول الدراسي للفصول.</p>
                  </div>
                  <div className="space-y-8">
                      {uniqueClasses.map(cls => (
                          <div key={cls} className="border rounded-xl overflow-hidden">
                              <div className="bg-gray-100 p-2 font-bold text-gray-700 text-center">{cls}</div>
                              <table className="w-full text-center text-sm border-collapse">
                                  <thead>
                                      <tr className="bg-gray-50">
                                          <th className="border p-2 w-20">اليوم</th>
                                          {[1,2,3,4,5,6,7,8].map(p => <th key={p} className="border p-2">ح{p}</th>)}
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].map(day => (
                                          <tr key={day}>
                                              <td className="border p-2 font-bold text-gray-600">
                                                  {day === 'Sunday' ? 'الأحد' : day === 'Monday' ? 'الاثنين' : day === 'Tuesday' ? 'الثلاثاء' : day === 'Wednesday' ? 'الأربعاء' : 'الخميس'}
                                              </td>
                                              {[1,2,3,4,5,6,7,8].map(p => {
                                                  const item = schedules.find(s => s.classId === cls && s.day === day && s.period === p);
                                                  return (
                                                      <td key={p} className="border p-1">
                                                          <select 
                                                              className="w-full p-1 text-xs border-none bg-transparent outline-none text-center font-medium cursor-pointer hover:bg-gray-50 rounded"
                                                              value={item?.subjectName || ''}
                                                              onChange={(e) => {
                                                                  if (e.target.value) {
                                                                      handleSaveSchedule({ id: item?.id || Date.now().toString(), classId: cls, day: day as DayOfWeek, period: p, subjectName: e.target.value });
                                                                  } else if (item) {
                                                                      deleteScheduleItem(item.id);
                                                                      refreshData();
                                                                  }
                                                              }}
                                                          >
                                                              <option value=""></option>
                                                              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                          </select>
                                                      </td>
                                                  )
                                              })}
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'ASSIGNMENTS' && (
              <div className="space-y-4">
                  <p className="text-sm text-gray-500">ربط المعلمين بالفصول والمواد (يستخدم لتخصيص واجهة المعلم).</p>
                  <div className="bg-gray-50 p-4 rounded-lg border grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                      <div>
                          <label className="text-xs font-bold text-gray-500">الفصل</label>
                          <select id="assignClass" className="w-full p-2 border rounded">
                              {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500">المادة</label>
                          <select id="assignSubject" className="w-full p-2 border rounded">
                              {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500">المعلم</label>
                          <select id="assignTeacher" className="w-full p-2 border rounded">
                              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                      </div>
                      <button 
                        onClick={() => {
                            const c = (document.getElementById('assignClass') as HTMLSelectElement).value;
                            const s = (document.getElementById('assignSubject') as HTMLSelectElement).value;
                            const t = (document.getElementById('assignTeacher') as HTMLSelectElement).value;
                            if(c && s && t) {
                                handleSaveAssignment({ id: Date.now().toString(), classId: c, subjectName: s, teacherId: t });
                            }
                        }}
                        className="bg-indigo-600 text-white p-2 rounded font-bold hover:bg-indigo-700"
                      >
                          ربط
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {assignments.map(a => {
                          const t = teachers.find(tr => tr.id === a.teacherId);
                          return (
                              <div key={a.id} className="p-3 border rounded-lg bg-white flex justify-between items-center shadow-sm">
                                  <div>
                                      <div className="font-bold text-gray-800">{a.classId} - {a.subjectName}</div>
                                      <div className="text-xs text-indigo-600 font-medium flex items-center gap-1"><User size={10}/> {t?.name || 'معلم محذوف'}</div>
                                  </div>
                                  <button onClick={() => { deleteTeacherAssignment(a.id); refreshData(); }} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                              </div>
                          )
                      })}
                  </div>
              </div>
          )}

          {activeTab === 'SETTINGS' && (
              <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                      <h3 className="font-bold text-gray-700 border-b pb-2">ترويسة التقارير</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <input className="border p-2 rounded" placeholder="اسم المدرسة" value={reportConfig.schoolName} onChange={e => setReportConfig({...reportConfig, schoolName: e.target.value})} />
                          <input className="border p-2 rounded" placeholder="إدارة التعليم" value={reportConfig.educationAdmin} onChange={e => setReportConfig({...reportConfig, educationAdmin: e.target.value})} />
                          <input className="border p-2 rounded" placeholder="مدير المدرسة" value={reportConfig.schoolManager} onChange={e => setReportConfig({...reportConfig, schoolManager: e.target.value})} />
                          <input className="border p-2 rounded" placeholder="اسم المعلم" value={reportConfig.teacherName} onChange={e => setReportConfig({...reportConfig, teacherName: e.target.value})} />
                          <input className="border p-2 rounded" placeholder="العام الدراسي (مثال: 1447هـ)" value={reportConfig.academicYear} onChange={e => setReportConfig({...reportConfig, academicYear: e.target.value})} />
                          <input className="border p-2 rounded" placeholder="الفصل الدراسي" value={reportConfig.term} onChange={e => setReportConfig({...reportConfig, term: e.target.value})} />
                      </div>
                      <button onClick={() => { saveReportHeaderConfig(reportConfig); alert('تم الحفظ'); }} className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 w-full flex justify-center items-center gap-2"><Save size={16}/> حفظ الإعدادات</button>
                  </div>

                  <div className="space-y-4 pt-6 border-t">
                      <h3 className="font-bold text-gray-700 border-b pb-2">الرابط الموحد لملف الأعمال (Excel)</h3>
                      <p className="text-xs text-gray-500">يستخدم هذا الرابط لاستيراد درجات الأنشطة والواجبات تلقائياً من ملف Excel سحابي (Google Drive / OneDrive).</p>
                      <div className="flex gap-2">
                          <input className="border p-2 rounded flex-1 dir-ltr" placeholder="https://..." value={worksUrl} onChange={e => setWorksUrl(e.target.value)} />
                          <button onClick={() => { saveWorksMasterUrl(worksUrl); alert('تم الحفظ'); }} className="bg-green-600 text-white px-4 rounded font-bold hover:bg-green-700">حفظ</button>
                      </div>
                  </div>
              </div>
          )}
      </div>
    </div>
  );
};

const AddTeacherForm = ({ onAdd }: { onAdd: (n: string, p: string, s: string) => void }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [spec, setSpec] = useState('');
    return (
        <div className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border">
            <div className="flex-1">
                <label className="text-xs text-gray-500 font-bold">الاسم</label>
                <input className="w-full p-2 border rounded" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="flex-1">
                <label className="text-xs text-gray-500 font-bold">التخصص</label>
                <input className="w-full p-2 border rounded" value={spec} onChange={e => setSpec(e.target.value)} />
            </div>
            <div className="flex-1">
                <label className="text-xs text-gray-500 font-bold">الهاتف</label>
                <input className="w-full p-2 border rounded" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <button onClick={() => { if(name) { onAdd(name, phone, spec); setName(''); setPhone(''); setSpec(''); } }} className="bg-indigo-600 text-white p-2.5 rounded font-bold hover:bg-indigo-700"><Plus size={18}/></button>
        </div>
    )
}

export default SchoolManagement;