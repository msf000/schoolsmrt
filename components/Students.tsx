
import React, { useState, useEffect, useMemo } from 'react';
import { Student, SystemUser, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus } from '../types';
import { deleteAllStudents } from '../services/storageService';
import { UserPlus, Trash2, Search, Mail, Phone, User, GraduationCap, FileText, Eye, Edit, FileSpreadsheet, X, CheckCircle, AlertTriangle, Building2, Lock, Loader2, Smile, Frown, TrendingUp, Clock, Activity, Target } from 'lucide-react';
import DataImport from './DataImport';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

interface StudentsProps {
  students: Student[];
  attendance?: AttendanceRecord[]; 
  performance?: PerformanceRecord[]; 
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onImportStudents: (students: Student[], matchKey?: keyof Student, strategy?: 'UPDATE' | 'SKIP' | 'NEW', updateFields?: string[]) => void;
  currentUser?: SystemUser | null;
}

const Students: React.FC<StudentsProps> = ({ students, attendance = [], performance = [], onAddStudent, onUpdateStudent, onDeleteStudent, onImportStudents, currentUser }) => {
  
  if (!students) {
      return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  }

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  const existingGrades = useMemo(() => Array.from(new Set(students.map(s => s.gradeLevel).filter(Boolean))), [students]);
  const existingClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))), [students]);

  // Calculate Student Stats for View Modal
  const studentStats = useMemo(() => {
      if (!viewStudent) return null;
      
      const sAtt = attendance.filter(a => a.studentId === viewStudent.id);
      const sPerf = performance.filter(p => p.studentId === viewStudent.id);

      // Attendance Stats
      const totalDays = sAtt.length;
      const present = sAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
      const absent = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
      const late = sAtt.filter(a => a.status === AttendanceStatus.LATE).length;
      const attRate = totalDays > 0 ? Math.round(((present + late) / totalDays) * 100) : 100;

      // Behavior Stats
      const posBehavior = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;
      const negBehavior = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;

      // Academic Stats
      const scores = sPerf.map(p => ({ score: p.score, max: p.maxScore || 10 }));
      const totalScore = scores.reduce((sum, i) => sum + i.score, 0);
      const totalMax = scores.reduce((sum, i) => sum + i.max, 0);
      const avgScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
      
      // Chart Data: Last 5 Grades
      const recentGrades = sPerf
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Chronological order
        .slice(-5)
        .map(p => ({
            name: p.title || p.subject,
            score: p.score,
            max: p.maxScore
        }));

      // Radar Data: Performance by Category
      const categories = ['HOMEWORK', 'ACTIVITY', 'PLATFORM_EXAM'];
      const radarData = categories.map(cat => {
          const catPerfs = sPerf.filter(p => p.category === cat);
          if (catPerfs.length === 0) return { subject: cat, A: 0, fullMark: 100 };
          const obtained = catPerfs.reduce((acc, curr) => acc + curr.score, 0);
          const max = catPerfs.reduce((acc, curr) => acc + (curr.maxScore || 10), 0);
          const pct = max > 0 ? Math.round((obtained / max) * 100) : 0;
          return {
              subject: cat === 'HOMEWORK' ? 'الواجبات' : cat === 'ACTIVITY' ? 'الأنشطة' : 'الاختبارات',
              A: pct,
              fullMark: 100
          };
      });
      // Add Attendance to Radar
      radarData.push({ subject: 'الحضور', A: attRate, fullMark: 100 });
      radarData.push({ subject: 'السلوك', A: Math.max(0, 100 - (negBehavior * 10)), fullMark: 100 });

      return { attRate, absent, late, posBehavior, negBehavior, avgScore, recentGrades, radarData };
  }, [viewStudent, attendance, performance]);

  const initialFormState = {
    name: '',
    nationalId: '',
    gradeLevel: '',
    className: '',
    email: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    parentEmail: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const openAddModal = () => {
      setEditingStudent(null);
      setFormData(initialFormState);
      setIsFormModalOpen(true);
  };

  const openEditModal = (student: Student) => {
      setEditingStudent(student);
      setFormData({
          name: student.name,
          nationalId: student.nationalId || '',
          gradeLevel: student.gradeLevel || '',
          className: student.className || '',
          email: student.email || '',
          phone: student.phone || '',
          parentName: student.parentName || '',
          parentPhone: student.parentPhone || '',
          parentEmail: student.parentEmail || ''
      });
      setIsFormModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nationalId) return;

    let finalSchoolId = editingStudent?.schoolId;
    if (!finalSchoolId && currentUser?.schoolId) {
        finalSchoolId = currentUser.schoolId;
    }

    const studentData: Student = {
      id: editingStudent ? editingStudent.id : Date.now().toString(),
      name: formData.name,
      nationalId: formData.nationalId,
      classId: formData.className,
      gradeLevel: formData.gradeLevel,
      className: formData.className,
      email: formData.email,
      phone: formData.phone,
      parentName: formData.parentName,
      parentPhone: formData.parentPhone,
      parentEmail: formData.parentEmail,
      schoolId: finalSchoolId,
      createdById: editingStudent?.createdById || currentUser?.id
    };

    try {
        if (editingStudent) {
            onUpdateStudent(studentData);
        } else {
            onAddStudent(studentData);
        }
        setIsFormModalOpen(false);
    } catch (error: any) {
        alert(error.message);
    }
  };

  const handleDeleteAll = () => {
      if (window.confirm("تحذير: هل أنت متأكد من حذف جميع الطلاب؟ هذا الإجراء لا يمكن التراجع عنه.")) {
          deleteAllStudents();
          onImportStudents([]); 
      }
  };

  const filteredStudents = students.filter(s => 
    s.name.includes(searchTerm) || (s.gradeLevel && s.gradeLevel.includes(searchTerm)) || (s.nationalId && s.nationalId.includes(searchTerm))
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">قائمة الطلاب</h2>
            <p className="text-sm text-gray-500 mt-1">إجمالي الطلاب: {students.length}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
            {students.length > 0 && (
                <button 
                onClick={handleDeleteAll}
                className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
                >
                <Trash2 size={18} />
                <span>حذف الكل</span>
                </button>
            )}
            <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm"
            >
            <FileSpreadsheet size={18} />
            <span>استيراد ملف</span>
            </button>
            <button 
            onClick={openAddModal}
            className="bg-primary hover:bg-teal-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm"
            >
            <UserPlus size={18} />
            <span>إضافة طالب</span>
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
            <div className="relative">
                <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="بحث عن طالب (الاسم، الهوية، الصف)..." 
                    className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[1400px]">
            <thead className="bg-gray-50 text-gray-700 font-bold text-sm">
                <tr>
                <th className="p-4 whitespace-nowrap">اسم الطالب</th>
                <th className="p-4 whitespace-nowrap">المصدر</th>
                <th className="p-4 whitespace-nowrap">رقم الهوية / السجل</th>
                <th className="p-4 whitespace-nowrap">الصف</th>
                <th className="p-4 whitespace-nowrap">الفصل</th>
                <th className="p-4 whitespace-nowrap">جوال الطالب</th>
                <th className="p-4 whitespace-nowrap">اسم ولي الأمر</th>
                <th className="p-4 whitespace-nowrap">جوال ولي الأمر</th>
                <th className="p-4 whitespace-nowrap w-40 text-center">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
                {filteredStudents.length > 0 ? filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{student.name}</td>
                    <td className="p-4">
                        {student.schoolId ? (
                            <span className="flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200 w-fit font-bold">
                                <Building2 size={10}/> مدرسة
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 w-fit font-bold">
                                <Lock size={10}/> خاص
                            </span>
                        )}
                    </td>
                    <td className="p-4 text-gray-600 font-mono">{student.nationalId || '-'}</td>
                    <td className="p-4 text-gray-600">{student.gradeLevel}</td>
                    <td className="p-4 text-gray-600">{student.className}</td>
                    <td className="p-4 text-gray-600 font-mono dir-ltr text-right">{student.phone || '-'}</td>
                    <td className="p-4 text-gray-600">{student.parentName || '-'}</td>
                    <td className="p-4 text-green-700 font-medium font-mono dir-ltr text-right">{student.parentPhone || '-'}</td>
                    <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                             <button 
                                onClick={() => { setViewStudent(student); setIsViewModalOpen(true); }}
                                className="text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"
                                title="عرض"
                            >
                                <Eye size={18} />
                            </button>
                            <button 
                                onClick={() => openEditModal(student)}
                                className="text-gray-500 hover:text-yellow-600 p-2 rounded-full hover:bg-yellow-50 transition-colors"
                                title="تحرير"
                            >
                                <Edit size={18} />
                            </button>
                            <button 
                                onClick={() => onDeleteStudent(student.id)}
                                className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                title="حذف"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </td>
                </tr>
                )) : (
                    <tr>
                        <td colSpan={10} className="p-8 text-center text-gray-500">لا يوجد طلاب مطابقين للبحث</td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl my-8">
            <h3 className="text-xl font-bold mb-4 border-b pb-2 flex justify-between items-center">
                {editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
                <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="text-sm font-bold text-primary mb-3">البيانات الأساسية</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم الطالب *</label>
                        <input 
                          type="text" 
                          required
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهوية / السجل *</label>
                        <input 
                          type="text"
                          required 
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                          value={formData.nationalId}
                          onChange={(e) => setFormData({...formData, nationalId: e.target.value})}
                        />
                      </div>
                  </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="text-sm font-bold text-primary mb-3">البيانات الأكاديمية (اكتب أو اختر)</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">الصف الدراسي (مثال: الصف الأول)</label>
                        <input 
                            list="gradeOptions"
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.gradeLevel}
                            onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                            placeholder="اكتب الصف..."
                        />
                        <datalist id="gradeOptions">
                            {existingGrades.map(g => <option key={g} value={g} />)}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">الفصل (مثال: 1/أ)</label>
                        <input 
                            list="classOptions"
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                            value={formData.className}
                            onChange={(e) => setFormData({...formData, className: e.target.value})}
                            placeholder="اكتب الفصل..."
                        />
                        <datalist id="classOptions">
                            {existingClasses.map(c => <option key={c} value={c} />)}
                        </datalist>
                      </div>
                  </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="text-sm font-bold text-primary mb-3">بيانات التواصل (الطالب)</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">جوال الطالب</label>
                        <input 
                          type="tel" 
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">إيميل الطالب</label>
                        <input 
                          type="email" 
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                  </div>
              </div>

               <div className="bg-gray-50 p-4 rounded-lg border">
                   <h4 className="text-sm font-bold text-primary mb-3">بيانات ولي الأمر</h4>
                   <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم ولي الأمر</label>
                        <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                        value={formData.parentName}
                        onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">جوال ولي الأمر</label>
                        <input 
                        type="tel" 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                        value={formData.parentPhone}
                        onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">إيميل ولي الأمر</label>
                        <input 
                        type="email" 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                        value={formData.parentEmail}
                        onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                        />
                    </div>
                   </div>
               </div>

              <div className="flex gap-3 justify-end mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-teal-800 shadow-lg"
                >
                  {editingStudent ? 'حفظ التغييرات' : 'حفظ البيانات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && (
          <div className="fixed inset-0 z-[100] bg-white">
              <DataImport 
                  existingStudents={students}
                  onImportStudents={(data, matchKey, strategy, fields) => { 
                      onImportStudents(data, matchKey, strategy, fields); 
                      setIsImportModalOpen(false); 
                  }}
                  onImportAttendance={() => {}} 
                  onImportPerformance={() => {}}
                  forcedType="STUDENTS"
                  onClose={() => setIsImportModalOpen(false)}
                  currentUser={currentUser}
              />
          </div>
      )}

      {isViewModalOpen && viewStudent && studentStats && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-4xl shadow-xl relative overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="absolute top-0 right-0 left-0 h-24 bg-gradient-to-r from-blue-600 to-purple-600"></div>
                  
                  <div className="relative pt-12 px-6 pb-6 overflow-y-auto custom-scrollbar">
                      <button onClick={() => setIsViewModalOpen(false)} className="absolute left-4 top-4 text-white/80 hover:text-white bg-black/20 p-2 rounded-full"><X size={20}/></button>
                      
                      <div className="flex flex-col items-center mb-6">
                          <div className="w-24 h-24 bg-white rounded-full p-1 shadow-lg mb-3">
                              <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border-2 border-white text-3xl font-bold">
                                  {viewStudent.name.charAt(0)}
                              </div>
                          </div>
                          <h3 className="text-2xl font-bold text-gray-900">{viewStudent.name}</h3>
                          <p className="text-gray-500 font-medium">{viewStudent.gradeLevel} - {viewStudent.className}</p>
                          <div className="mt-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-mono font-bold">
                              ID: {viewStudent.nationalId || 'N/A'}
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          {/* Attendance Card */}
                          <div className="bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                              <h4 className="text-gray-500 text-xs font-bold uppercase mb-2 flex items-center gap-1"><Clock size={12}/> الحضور</h4>
                              <div className="flex items-end gap-1">
                                  <span className={`text-2xl font-black ${studentStats.attRate >= 90 ? 'text-green-600' : studentStats.attRate >= 75 ? 'text-yellow-600' : 'text-red-600'}`}>{studentStats.attRate}%</span>
                                  <span className="text-gray-400 text-xs mb-1">نسبة الحضور</span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-2">
                                  غياب: <b className="text-red-500">{studentStats.absent}</b> | تأخر: <b className="text-yellow-600">{studentStats.late}</b>
                              </p>
                          </div>

                          {/* Academic Card */}
                          <div className="bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                              <h4 className="text-gray-500 text-xs font-bold uppercase mb-2 flex items-center gap-1"><TrendingUp size={12}/> الأكاديمي</h4>
                              <div className="flex items-end gap-1">
                                  <span className="text-2xl font-black text-blue-600">{studentStats.avgScore}%</span>
                                  <span className="text-gray-400 text-xs mb-1">المعدل</span>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                  بناءً على {performance.filter(p => p.studentId === viewStudent.id).length} تقييم
                              </div>
                          </div>

                          {/* Behavior Card */}
                          <div className="bg-white border rounded-xl p-4 shadow-sm relative overflow-hidden group">
                              <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                              <h4 className="text-gray-500 text-xs font-bold uppercase mb-2 flex items-center gap-1"><Smile size={12}/> السلوك</h4>
                              <div className="flex justify-between items-center mt-2">
                                  <div className="text-center">
                                      <div className="text-green-600 font-bold text-lg">{studentStats.posBehavior}</div>
                                      <div className="text-[9px] text-gray-400">إيجابي</div>
                                  </div>
                                  <div className="w-[1px] h-8 bg-gray-100"></div>
                                  <div className="text-center">
                                      <div className="text-red-600 font-bold text-lg">{studentStats.negBehavior}</div>
                                      <div className="text-[9px] text-gray-400">سلبي</div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {/* Performance Line Chart */}
                          {studentStats.recentGrades.length > 0 && (
                              <div className="bg-white p-4 rounded-xl border border-gray-200 h-72">
                                  <h4 className="font-bold text-gray-700 text-sm mb-4 flex items-center gap-2"><Activity size={16}/> تطور المستوى الأكاديمي</h4>
                                  <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={studentStats.recentGrades}>
                                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                          <XAxis dataKey="name" tick={{fontSize: 10}} height={20} tickFormatter={(val) => val.length > 10 ? val.substr(0,10)+'..' : val}/>
                                          <YAxis domain={[0, 'dataMax']} tick={{fontSize: 10}} width={30}/>
                                          <Tooltip 
                                              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                              labelStyle={{fontWeight: 'bold', color: '#374151'}}
                                          />
                                          <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                                      </LineChart>
                                  </ResponsiveContainer>
                              </div>
                          )}

                          {/* Performance Radar Chart */}
                          <div className="bg-white p-4 rounded-xl border border-gray-200 h-72">
                              <h4 className="font-bold text-gray-700 text-sm mb-2 flex items-center gap-2"><Target size={16}/> تحليل المهارات</h4>
                              <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={studentStats.radarData}>
                                      <PolarGrid />
                                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{fontSize: 8}}/>
                                      <Radar name="Performance" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                      <Tooltip />
                                  </RadarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <h4 className="font-bold text-gray-800 text-sm border-b pb-2">بيانات التواصل</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                               <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Phone size={12}/> جوال الطالب</p>
                                    <p className="font-mono dir-ltr text-right text-sm font-bold">{viewStudent.phone || '-'}</p>
                               </div>
                               <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Mail size={12}/> إيميل الطالب</p>
                                    <p className="font-mono text-sm font-bold break-all">{viewStudent.email || '-'}</p>
                               </div>
                          </div>

                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <p className="font-bold text-gray-800 flex items-center gap-2 mb-2"><User size={16}/> ولي الأمر: {viewStudent.parentName || 'غير مسجل'}</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="flex items-center gap-1 text-gray-600 font-mono"><Phone size={14}/> {viewStudent.parentPhone || '-'}</span>
                                    <span className="flex items-center gap-1 text-gray-600 font-mono"><Mail size={14}/> {viewStudent.parentEmail || '-'}</span>
                                </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Students;
