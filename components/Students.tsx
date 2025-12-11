
import React, { useState, useEffect, useMemo } from 'react';
import { Student, SystemUser, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, AcademicTerm, ReportHeaderConfig } from '../types';
import { deleteAllStudents, getAcademicTerms, getReportHeaderConfig } from '../services/storageService';
import { UserPlus, Trash2, Search, Mail, Phone, User, Eye, Edit, FileSpreadsheet, X, Building2, Lock, Loader2, Smile, Frown, TrendingUp, Clock, Activity, Target, Filter, BookOpen, Calendar, AlertCircle, Award, CreditCard, Key } from 'lucide-react';
import DataImport from './DataImport';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const SAUDI_GRADES = [
    "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
    "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
    "الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي"
];

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

  const isManager = currentUser?.role === 'SCHOOL_MANAGER';

  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewModalTab, setViewModalTab] = useState<'OVERVIEW' | 'ACADEMIC' | 'BEHAVIOR' | 'INFO'>('OVERVIEW');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  // --- Print Cards State ---
  const [isPrintCardsOpen, setIsPrintCardsOpen] = useState(false);
  const [schoolConfig, setSchoolConfig] = useState<ReportHeaderConfig | null>(null);

  // --- Terms State ---
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  useEffect(() => {
      const loadedTerms = getAcademicTerms(currentUser?.id);
      setTerms(loadedTerms);
      const current = loadedTerms.find(t => t.isCurrent);
      if (current) setSelectedTermId(current.id);
      else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);
      
      setSchoolConfig(getReportHeaderConfig(currentUser?.id));
  }, [currentUser]);

  // --- Derived Data for Filters ---
  const existingGrades = useMemo(() => Array.from(new Set([...students.map(s => s.gradeLevel).filter(Boolean), ...SAUDI_GRADES])).sort(), [students]);
  const existingClasses = useMemo(() => {
      let classes = students.map(s => s.className).filter(Boolean) as string[];
      if (filterGrade) {
          classes = students.filter(s => s.gradeLevel === filterGrade).map(s => s.className).filter(Boolean) as string[];
      }
      return Array.from(new Set(classes)).sort();
  }, [students, filterGrade]);

  // --- Filtering Logic ---
  const filteredStudents = useMemo(() => {
      return students.filter(s => {
          const matchesSearch = s.name.includes(searchTerm) || (s.nationalId && s.nationalId.includes(searchTerm));
          const matchesGrade = !filterGrade || s.gradeLevel === filterGrade;
          const matchesClass = !filterClass || s.className === filterClass;
          return matchesSearch && matchesGrade && matchesClass;
      }).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchTerm, filterGrade, filterClass]);

  // --- Helper to get Risk Status for Table Row ---
  const getStudentRisk = (studentId: string) => {
      const activeTerm = terms.find(t => t.id === selectedTermId);
      
      let sAtt = attendance.filter(a => a.studentId === studentId);
      let sPerf = performance.filter(p => p.studentId === studentId);

      if (activeTerm) {
          sAtt = sAtt.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
          sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
      }

      const totalDays = sAtt.length;
      const absent = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
      const attRate = totalDays > 0 ? ((totalDays - absent) / totalDays) * 100 : 100;

      let avgGrade = 100;
      if (sPerf.length > 0) {
          const totalScore = sPerf.reduce((a,b) => a + (b.score/b.maxScore), 0);
          avgGrade = (totalScore / sPerf.length) * 100;
      }

      const risks = [];
      if (attRate < 85) risks.push({ type: 'ATT', level: attRate < 75 ? 'HIGH' : 'MED' });
      if (avgGrade < 60) risks.push({ type: 'ACAD', level: avgGrade < 50 ? 'HIGH' : 'MED' });

      return risks;
  };

  // ... (studentStats logic remains same)
  const studentStats = useMemo(() => {
      if (!viewStudent) return null;
      
      const activeTerm = terms.find(t => t.id === selectedTermId);

      let sAtt = attendance.filter(a => a.studentId === viewStudent.id);
      let sPerf = performance.filter(p => p.studentId === viewStudent.id);

      if (activeTerm) {
          sAtt = sAtt.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
          sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
      }

      const totalDays = sAtt.length;
      const present = sAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
      const absent = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
      const late = sAtt.filter(a => a.status === AttendanceStatus.LATE).length;
      const excused = sAtt.filter(a => a.status === AttendanceStatus.EXCUSED).length;
      const attRate = totalDays > 0 ? Math.round(((present + late + excused) / totalDays) * 100) : 100;

      const posBehavior = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;
      const negBehavior = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;
      const behaviorLogs = sAtt.filter(a => a.behaviorStatus !== BehaviorStatus.NEUTRAL || a.behaviorNote);

      const scores = sPerf.map(p => ({ score: p.score, max: p.maxScore || 10 }));
      const totalScore = scores.reduce((sum, i) => sum + i.score, 0);
      const totalMax = scores.reduce((sum, i) => sum + i.max, 0);
      const avgScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
      
      const homeworks = sPerf.filter(p => p.category === 'HOMEWORK');
      const activities = sPerf.filter(p => p.category === 'ACTIVITY');
      const exams = sPerf.filter(p => p.category === 'PLATFORM_EXAM' || p.category === 'OTHER');

      const recentGrades = sPerf
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5).reverse()
        .map(p => ({
            name: p.title || p.subject,
            score: Math.round((p.score / p.maxScore) * 100),
            fullMark: 100
        }));

      const categories = ['HOMEWORK', 'ACTIVITY', 'PLATFORM_EXAM'];
      const radarData = categories.map(cat => {
          const catPerfs = sPerf.filter(p => p.category === cat);
          if (catPerfs.length === 0) return { subject: cat === 'HOMEWORK' ? 'الواجبات' : cat === 'ACTIVITY' ? 'الأنشطة' : 'الاختبارات', A: 0, fullMark: 100 };
          const obtained = catPerfs.reduce((acc, curr) => acc + curr.score, 0);
          const max = catPerfs.reduce((acc, curr) => acc + (curr.maxScore || 10), 0);
          const pct = max > 0 ? Math.round((obtained / max) * 100) : 0;
          return {
              subject: cat === 'HOMEWORK' ? 'الواجبات' : cat === 'ACTIVITY' ? 'الأنشطة' : 'الاختبارات',
              A: pct,
              fullMark: 100
          };
      });
      radarData.push({ subject: 'الحضور', A: attRate, fullMark: 100 });
      radarData.push({ subject: 'السلوك', A: Math.max(0, 100 - (negBehavior * 10)), fullMark: 100 });

      return { 
          attRate, absent, late, excused, 
          posBehavior, negBehavior, behaviorLogs,
          avgScore, recentGrades, radarData,
          homeworks, activities, exams
      };
  }, [viewStudent, attendance, performance, selectedTermId, terms]);

  // --- Form Handling ---
  const initialFormState = {
    name: '', nationalId: '', gradeLevel: '', className: '', email: '', phone: '', parentName: '', parentPhone: '', parentEmail: '', password: ''
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
          parentEmail: student.parentEmail || '',
          password: student.password || ''
      });
      setIsFormModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nationalId) return;

    let finalSchoolId = editingStudent?.schoolId;
    if (!finalSchoolId && currentUser?.schoolId) finalSchoolId = currentUser.schoolId;

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
      createdById: editingStudent?.createdById || currentUser?.id,
      password: formData.password
    };

    try {
        if (editingStudent) onUpdateStudent(studentData);
        else onAddStudent(studentData);
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

  // --- PRINT CARDS COMPONENT ---
  const LoginCardsView = () => (
      <div className="fixed inset-0 bg-white z-[200] overflow-auto p-8">
          <div className="max-w-5xl mx-auto">
              <div className="flex justify-between items-center mb-8 print:hidden">
                  <h2 className="text-2xl font-bold">بطاقات دخول الطلاب</h2>
                  <div className="flex gap-2">
                      <button onClick={() => window.print()} className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Key size={16}/> طباعة</button>
                      <button onClick={() => setIsPrintCardsOpen(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold">إغلاق</button>
                  </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 print:grid-cols-2">
                  {filteredStudents.map(student => (
                      <div key={student.id} className="border-2 border-gray-300 rounded-xl p-6 flex flex-col gap-4 relative break-inside-avoid">
                          <div className="flex justify-between items-start border-b pb-2">
                              <div>
                                  <h3 className="font-bold text-lg">{schoolConfig?.schoolName || 'المدرسة الذكية'}</h3>
                                  <p className="text-xs text-gray-500">بوابة الطالب الإلكترونية</p>
                              </div>
                              <div className="text-left">
                                  <span className="font-bold text-sm block">{student.className}</span>
                                  <span className="text-xs text-gray-400">{student.gradeLevel}</span>
                              </div>
                          </div>
                          <div className="space-y-2">
                              <div className="flex justify-between">
                                  <span className="text-gray-500 text-sm">الاسم:</span>
                                  <span className="font-bold">{student.name}</span>
                              </div>
                              <div className="flex justify-between bg-gray-50 p-2 rounded">
                                  <span className="text-gray-500 text-sm">اسم المستخدم:</span>
                                  <span className="font-mono font-bold">{student.nationalId}</span>
                              </div>
                              <div className="flex justify-between bg-gray-50 p-2 rounded">
                                  <span className="text-gray-500 text-sm">كلمة المرور:</span>
                                  <span className="font-mono font-bold">{student.password || '123456'}</span>
                              </div>
                          </div>
                          <div className="mt-2 text-center text-[10px] text-gray-400">
                              يرجى الاحتفاظ ببيانات الدخول وعدم مشاركتها.
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in h-full flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <User className="text-purple-600"/> سجل الطلاب
            </h2>
            <p className="text-sm text-gray-500 mt-1">إدارة بيانات الطلاب، التعديل، والمتابعة الفردية.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Filters */}
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 w-full md:w-auto">
                <Filter size={16} className="text-gray-400 ml-1"/>
                <select 
                    className="bg-transparent text-sm font-bold text-gray-700 outline-none w-full md:w-auto"
                    value={filterGrade}
                    onChange={e => { setFilterGrade(e.target.value); setFilterClass(''); }}
                >
                    <option value="">جميع الصفوف</option>
                    {existingGrades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
                <select 
                    className="bg-transparent text-sm font-bold text-gray-700 outline-none w-full md:w-auto"
                    value={filterClass}
                    onChange={e => setFilterClass(e.target.value)}
                >
                    <option value="">جميع الفصول</option>
                    {existingClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Search */}
            <div className="relative flex-1 md:flex-none">
                <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="بحث (اسم، هوية)..." 
                    className="w-full md:w-48 pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Actions (Hidden for Manager) */}
            <div className="flex gap-2 w-full md:w-auto">
                {!isManager && (
                    <>
                        <button onClick={() => setIsPrintCardsOpen(true)} className="flex-1 md:flex-none bg-white text-gray-700 border px-3 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm" title="طباعة بطاقات الدخول">
                            <CreditCard size={18} /> بطاقات
                        </button>
                        <button onClick={() => setIsImportModalOpen(true)} className="flex-1 md:flex-none bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm">
                            <FileSpreadsheet size={18} /> استيراد
                        </button>
                        <button onClick={openAddModal} className="flex-1 md:flex-none bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center justify-center gap-2 shadow-sm">
                            <UserPlus size={18} /> إضافة
                        </button>
                        {students.length > 0 && (
                            <button onClick={handleDeleteAll} className="bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 border border-red-200 transition-colors">
                                <Trash2 size={18}/>
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
            <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-600 font-bold text-xs uppercase sticky top-0 z-10 shadow-sm">
                <tr>
                <th className="p-4">#</th>
                <th className="p-4">اسم الطالب</th>
                <th className="p-4">الصف / الفصل</th>
                <th className="p-4">رقم الهوية</th>
                <th className="p-4 text-center">تنبيهات (Risk)</th>
                <th className="p-4 text-center w-32">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
                {filteredStudents.length > 0 ? filteredStudents.map((student, i) => {
                    const risks = getStudentRisk(student.id);
                    return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="p-4 text-gray-400 font-mono text-xs">{i + 1}</td>
                        <td className="p-4">
                            <button 
                                onClick={() => { setViewStudent(student); setIsViewModalOpen(true); }}
                                className="font-bold text-gray-800 hover:text-purple-600 hover:underline text-base text-right"
                            >
                                {student.name}
                            </button>
                        </td>
                        <td className="p-4">
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-700">{student.gradeLevel}</span>
                                <span className="text-xs text-gray-500">{student.className}</span>
                            </div>
                        </td>
                        <td className="p-4 font-mono text-gray-500">{student.nationalId || '-'}</td>
                        <td className="p-4 text-center">
                            <div className="flex justify-center gap-1">
                                {risks.find(r => r.type === 'ATT') && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${risks.find(r=>r.type==='ATT')?.level === 'HIGH' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                        غياب
                                    </span>
                                )}
                                {risks.find(r => r.type === 'ACAD') && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${risks.find(r=>r.type==='ACAD')?.level === 'HIGH' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'}`}>
                                        مستوى
                                    </span>
                                )}
                                {risks.length === 0 && <span className="text-gray-300 text-xs">-</span>}
                            </div>
                        </td>
                        <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setViewStudent(student); setIsViewModalOpen(true); }} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50" title="عرض الملف">
                                    <Eye size={16} />
                                </button>
                                {!isManager && (
                                    <>
                                        <button onClick={() => openEditModal(student)} className="text-gray-400 hover:text-yellow-600 p-1.5 rounded-full hover:bg-yellow-50" title="تعديل">
                                            <Edit size={16} />
                                        </button>
                                        <button onClick={() => onDeleteStudent(student.id)} className="text-gray-400 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50" title="حذف">
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                )}) : (
                    <tr>
                        <td colSpan={6} className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
                            <Search size={48} className="mb-4 opacity-20"/>
                            <p>لا يوجد طلاب مطابقين للبحث</p>
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
        <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 font-bold">
            العدد الإجمالي: {filteredStudents.length} طالب
        </div>
      </div>

      {/* STUDENT CARD MODAL */}
      {isViewModalOpen && viewStudent && studentStats && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="bg-gray-900 text-white p-6 flex justify-between items-start shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-white/20 shadow-lg">
                              {viewStudent.name.charAt(0)}
                          </div>
                          <div>
                              <h3 className="text-2xl font-bold">{viewStudent.name}</h3>
                              <div className="flex items-center gap-3 text-gray-300 text-sm mt-1">
                                  <span className="bg-white/10 px-2 py-0.5 rounded">{viewStudent.gradeLevel}</span>
                                  <span>|</span>
                                  <span className="font-mono">ID: {viewStudent.nationalId}</span>
                              </div>
                          </div>
                      </div>
                      <div className="flex items-center gap-3">
                          {/* TERM SELECTOR INSIDE MODAL */}
                          <select 
                              value={selectedTermId}
                              onChange={(e) => setSelectedTermId(e.target.value)}
                              className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-purple-500 font-bold"
                          >
                              <option value="" className="text-black">كل الفترات (تراكمي)</option>
                              {terms.map(t => (
                                  <option key={t.id} value={t.id} className="text-black">{t.name}</option>
                              ))}
                          </select>
                          <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X size={20}/></button>
                      </div>
                  </div>

                  {/* Navigation Tabs */}
                  <div className="flex border-b bg-gray-50 px-6 shrink-0 overflow-x-auto">
                      <button onClick={() => setViewModalTab('OVERVIEW')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${viewModalTab === 'OVERVIEW' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                          <Target size={16}/> نظرة عامة
                      </button>
                      <button onClick={() => setViewModalTab('ACADEMIC')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${viewModalTab === 'ACADEMIC' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                          <BookOpen size={16}/> الأكاديمي والواجبات
                      </button>
                      <button onClick={() => setViewModalTab('BEHAVIOR')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${viewModalTab === 'BEHAVIOR' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                          <Activity size={16}/> السلوك والحضور
                      </button>
                      <button onClick={() => setViewModalTab('INFO')} className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${viewModalTab === 'INFO' ? 'border-purple-600 text-purple-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                          <User size={16}/> البيانات الشخصية
                      </button>
                  </div>

                  {/* Modal Content */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
                      {/* 1. OVERVIEW TAB */}
                      {viewModalTab === 'OVERVIEW' && (
                          <div className="space-y-6">
                              {/* Quick Stats */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                      <div className="text-gray-500 text-xs font-bold uppercase mb-2 flex items-center gap-1"><Clock size={14}/> الحضور</div>
                                      <div className={`text-3xl font-black ${studentStats.attRate >= 90 ? 'text-green-600' : 'text-red-600'}`}>{studentStats.attRate}%</div>
                                      <div className="text-xs text-gray-400 mt-1">أيام الغياب: {studentStats.absent}</div>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                      <div className="text-gray-500 text-xs font-bold uppercase mb-2 flex items-center gap-1"><TrendingUp size={14}/> المستوى الأكاديمي</div>
                                      <div className="text-3xl font-black text-blue-600">{studentStats.avgScore}%</div>
                                      <div className="text-xs text-gray-400 mt-1">متوسط الدرجات</div>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                                      <div className="text-gray-500 text-xs font-bold uppercase mb-2 flex items-center gap-1"><Smile size={14}/> السلوك</div>
                                      <div className="flex items-end gap-2">
                                          <span className="text-3xl font-black text-green-600">{studentStats.posBehavior}</span>
                                          <span className="text-sm text-gray-300 mb-1">/</span>
                                          <span className="text-3xl font-black text-red-600">{studentStats.negBehavior}</span>
                                      </div>
                                      <div className="text-xs text-gray-400 mt-1">إيجابي / سلبي</div>
                                  </div>
                              </div>

                              {/* Charts */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                                      <h4 className="font-bold text-gray-700 text-sm mb-4">تحليل المهارات (Radar)</h4>
                                      <div className="h-64 w-full">
                                          <ResponsiveContainer width="100%" height="100%">
                                              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={studentStats.radarData}>
                                                  <PolarGrid />
                                                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false}/>
                                                  <Radar name="Student" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                                  <Tooltip />
                                              </RadarChart>
                                          </ResponsiveContainer>
                                      </div>
                                  </div>
                                  <div className="bg-white p-4 rounded-xl border border-gray-200">
                                      <h4 className="font-bold text-gray-700 text-sm mb-4">تطور الدرجات (آخر 5)</h4>
                                      <div className="h-64 w-full">
                                          <ResponsiveContainer width="100%" height="100%">
                                              <LineChart data={studentStats.recentGrades}>
                                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                  <XAxis dataKey="name" tick={{fontSize: 10}} height={20}/>
                                                  <YAxis domain={[0, 100]} tick={{fontSize: 10}} width={30}/>
                                                  <Tooltip />
                                                  <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{r: 4}} />
                                              </LineChart>
                                          </ResponsiveContainer>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* 2. ACADEMIC TAB */}
                      {viewModalTab === 'ACADEMIC' && (
                          <div className="space-y-6">
                              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                  <div className="p-3 bg-blue-50 border-b border-blue-100 font-bold text-blue-800 text-sm flex items-center gap-2"><BookOpen size={16}/> الواجبات المنزلية</div>
                                  <div className="max-h-60 overflow-y-auto">
                                      {studentStats.homeworks.length > 0 ? (
                                          <table className="w-full text-right text-sm">
                                              <thead className="bg-gray-50 text-xs text-gray-500 sticky top-0"><tr><th className="p-3">العنوان</th><th className="p-3">المادة</th><th className="p-3">الدرجة</th></tr></thead>
                                              <tbody className="divide-y">
                                                  {studentStats.homeworks.map((h, i) => (
                                                      <tr key={i} className="hover:bg-gray-50">
                                                          <td className="p-3 font-medium">{h.title}</td>
                                                          <td className="p-3 text-gray-500 text-xs">{h.subject}</td>
                                                          <td className="p-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{h.score}/{h.maxScore}</span></td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      ) : <div className="p-6 text-center text-gray-400 text-sm">لا توجد واجبات مسجلة</div>}
                                  </div>
                              </div>

                              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                  <div className="p-3 bg-purple-50 border-b border-purple-100 font-bold text-purple-800 text-sm flex items-center gap-2"><Award size={16}/> الاختبارات والمنصة</div>
                                  <div className="max-h-60 overflow-y-auto">
                                      {studentStats.exams.length > 0 ? (
                                          <table className="w-full text-right text-sm">
                                              <thead className="bg-gray-50 text-xs text-gray-500 sticky top-0"><tr><th className="p-3">العنوان</th><th className="p-3">المادة</th><th className="p-3">الدرجة</th></tr></thead>
                                              <tbody className="divide-y">
                                                  {studentStats.exams.map((h, i) => (
                                                      <tr key={i} className="hover:bg-gray-50">
                                                          <td className="p-3 font-medium">{h.title}</td>
                                                          <td className="p-3 text-gray-500 text-xs">{h.subject}</td>
                                                          <td className="p-3"><span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold">{h.score}/{h.maxScore}</span></td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      ) : <div className="p-6 text-center text-gray-400 text-sm">لا توجد اختبارات مسجلة</div>}
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* 3. BEHAVIOR TAB */}
                      {viewModalTab === 'BEHAVIOR' && (
                          <div className="space-y-6">
                              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                  <div className="p-3 bg-gray-100 border-b font-bold text-gray-700 text-sm">سجل الملاحظات السلوكية</div>
                                  <div className="max-h-80 overflow-y-auto">
                                      {studentStats.behaviorLogs.length > 0 ? (
                                          <table className="w-full text-right text-sm">
                                              <thead className="bg-gray-50 text-xs text-gray-500 sticky top-0"><tr><th className="p-3">التاريخ</th><th className="p-3">النوع</th><th className="p-3">الملاحظة</th></tr></thead>
                                              <tbody className="divide-y">
                                                  {studentStats.behaviorLogs.map((log, i) => (
                                                      <tr key={i} className="hover:bg-gray-50">
                                                          <td className="p-3 text-xs font-mono text-gray-500">{log.date}</td>
                                                          <td className="p-3">
                                                              {log.behaviorStatus === BehaviorStatus.POSITIVE && <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold flex w-fit gap-1"><Smile size={12}/> إيجابي</span>}
                                                              {log.behaviorStatus === BehaviorStatus.NEGATIVE && <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold flex w-fit gap-1"><Frown size={12}/> سلبي</span>}
                                                          </td>
                                                          <td className="p-3 text-gray-700">{log.behaviorNote}</td>
                                                      </tr>
                                                  ))}
                                              </tbody>
                                          </table>
                                      ) : <div className="p-10 text-center text-gray-400">سجل السلوك نظيف! لا توجد ملاحظات.</div>}
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* 4. INFO TAB */}
                      {viewModalTab === 'INFO' && (
                          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                      <h4 className="font-bold text-gray-800 border-b pb-2 mb-3">بيانات الطالب</h4>
                                      <div className="space-y-3 text-sm">
                                          <div className="flex justify-between"><span className="text-gray-500">الاسم:</span> <span className="font-bold">{viewStudent.name}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-500">رقم الهوية:</span> <span className="font-mono">{viewStudent.nationalId}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-500">الصف / الفصل:</span> <span>{viewStudent.gradeLevel} - {viewStudent.className}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-500">الجوال:</span> <span className="font-mono dir-ltr">{viewStudent.phone || '-'}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-500">البريد:</span> <span className="font-mono">{viewStudent.email || '-'}</span></div>
                                      </div>
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-gray-800 border-b pb-2 mb-3">بيانات ولي الأمر</h4>
                                      <div className="space-y-3 text-sm">
                                          <div className="flex justify-between"><span className="text-gray-500">الاسم:</span> <span className="font-bold">{viewStudent.parentName || '-'}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-500">الجوال:</span> <span className="font-mono dir-ltr text-green-700 font-bold">{viewStudent.parentPhone || '-'}</span></div>
                                          <div className="flex justify-between"><span className="text-gray-500">البريد:</span> <span className="font-mono">{viewStudent.parentEmail || '-'}</span></div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Add/Edit Form Modal */}
      {isFormModalOpen && !isManager && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl my-8 border border-gray-100">
            <h3 className="text-xl font-bold mb-4 border-b pb-2 flex justify-between items-center text-gray-800">
                {editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
                <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </h3>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-bold text-purple-700 mb-3">البيانات الأساسية</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">اسم الطالب *</label>
                        <input 
                          type="text" 
                          required
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500/50 outline-none text-sm"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">رقم الهوية / السجل *</label>
                        <input 
                          type="text"
                          required 
                          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500/50 outline-none text-sm"
                          value={formData.nationalId}
                          onChange={(e) => setFormData({...formData, nationalId: e.target.value})}
                        />
                      </div>
                  </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-bold text-purple-700 mb-3">البيانات الأكاديمية</h4>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">الصف الدراسي</label>
                        <select
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500/50 outline-none text-sm bg-white"
                            value={formData.gradeLevel}
                            onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                        >
                            <option value="">-- اختر الصف --</option>
                            {SAUDI_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">الفصل</label>
                        <input 
                            list="classOptions"
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500/50 outline-none text-sm"
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

               <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                   <h4 className="text-sm font-bold text-purple-700 mb-3">بيانات ولي الأمر</h4>
                   <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-600 mb-1">اسم ولي الأمر</label>
                        <input 
                        type="text" 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500/50 outline-none text-sm"
                        value={formData.parentName}
                        onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">جوال ولي الأمر</label>
                        <input 
                        type="tel" 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500/50 outline-none text-sm"
                        value={formData.parentPhone}
                        onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                        />
                    </div>
                   </div>
               </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                   <h4 className="text-sm font-bold text-purple-700 mb-3">بيانات الدخول (الطالب)</h4>
                   <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">كلمة المرور (اختياري)</label>
                        <input 
                        type="password" 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500/50 outline-none text-sm"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="اتركه فارغاً لعدم التغيير"
                        />
                   </div>
               </div>

              <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-bold"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg text-sm font-bold"
                >
                  {editingStudent ? 'حفظ التغييرات' : 'حفظ البيانات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && !isManager && (
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

      {/* PRINT LOGIN CARDS MODAL */}
      {isPrintCardsOpen && <LoginCardsView />}

    </div>
  );
};

export default Students;
