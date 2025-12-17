
import React, { useState, useEffect, useMemo } from 'react';
import { Student, SystemUser, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, AcademicTerm, ReportHeaderConfig } from '../types';
import { deleteAllStudents, getAcademicTerms, getReportHeaderConfig, getTeacherAssignments } from '../services/storageService';
import { UserPlus, Trash2, Search, Eye, Edit, FileSpreadsheet, X, Loader2, Filter, CheckSquare, ArrowRightLeft, Printer, Square, MessageSquare, Key, TrendingUp, Clock } from 'lucide-react';
import DataImport from './DataImport';
import { useNavigate } from 'react-router-dom';

const SAUDI_GRADES = [
    "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
    "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
    "الصف الأول الثانوي (السنة المشتركة)", 
    "الصف الثاني الثانوي (مسارات)", 
    "الصف الثالث الثانوي (مسارات)"
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
  const navigate = useNavigate();
  if (!students) {
      return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32} /></div>;
  }

  const isManager = currentUser?.role === 'SCHOOL_MANAGER';

  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // --- Print Cards State ---
  const [isPrintCardsOpen, setIsPrintCardsOpen] = useState(false);
  const [schoolConfig, setSchoolConfig] = useState<ReportHeaderConfig | null>(null);

  // --- Bulk Actions State ---
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetGrade, setTargetGrade] = useState('');
  const [targetClass, setTargetClass] = useState('');

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
      const classes = new Set<string>();
      // 1. From Students
      students.forEach(s => {
          if (filterGrade && s.gradeLevel !== filterGrade) return;
          if (s.className) classes.add(s.className);
      });
      // 2. From Manually Defined Classes
      const defined = getTeacherAssignments(currentUser?.id).map(a => a.classId);
      defined.forEach(c => classes.add(c));

      return Array.from(classes).sort();
  }, [students, filterGrade, currentUser]);

  // --- Filtering Logic ---
  const filteredStudents = useMemo(() => {
      return students.filter(s => {
          const matchesSearch = s.name.includes(searchTerm) || (s.nationalId && s.nationalId.includes(searchTerm));
          const matchesGrade = !filterGrade || s.gradeLevel === filterGrade;
          const matchesClass = !filterClass || s.className === filterClass;
          return matchesSearch && matchesGrade && matchesClass;
      }).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, searchTerm, filterGrade, filterClass]);

  // --- Bulk Actions Handlers ---
  const toggleSelectStudent = (id: string) => {
      const newSet = new Set(selectedStudentIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedStudentIds(newSet);
  };

  const toggleSelectAll = () => {
      if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
          setSelectedStudentIds(new Set());
      } else {
          setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
      }
  };

  const handleBulkDelete = () => {
      if (!window.confirm(`هل أنت متأكد من حذف ${selectedStudentIds.size} طالب؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
      
      selectedStudentIds.forEach(id => onDeleteStudent(id));
      setSelectedStudentIds(new Set());
  };

  const handleBulkMove = () => {
      if (!targetGrade || !targetClass) return alert('يرجى تحديد الصف والفصل الجديد');
      
      const updatedStudents: Student[] = [];
      students.forEach(s => {
          if (selectedStudentIds.has(s.id)) {
              updatedStudents.push({
                  ...s,
                  gradeLevel: targetGrade,
                  className: targetClass,
                  classId: targetClass // Legacy support
              });
          }
      });

      onImportStudents(updatedStudents, 'id', 'UPDATE', ['gradeLevel', 'className', 'classId']);
      
      setIsMoveModalOpen(false);
      setSelectedStudentIds(new Set());
      alert('تم نقل الطلاب بنجاح');
  };

  const handleBulkMessage = () => {
      navigate('/messages', { state: { studentIds: Array.from(selectedStudentIds) } });
  };

  // --- Helper to get Stats for Table Row ---
  const getStudentStats = (studentId: string) => {
      const activeTerm = terms.find(t => t.id === selectedTermId);
      const today = new Date().toISOString().split('T')[0];
      
      let sAtt = attendance.filter(a => a.studentId === studentId);
      let sPerf = performance.filter(p => p.studentId === studentId);

      // Today's Status
      const todayRecord = attendance.find(a => a.studentId === studentId && a.date === today);
      const todaysStatus = todayRecord ? todayRecord.status : 'NONE';

      if (activeTerm) {
          sAtt = sAtt.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
          sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
      }

      // Academic Avg
      let avgGrade = 0;
      if (sPerf.length > 0) {
          const totalScore = sPerf.reduce((a,b) => a + (b.score/b.maxScore), 0);
          avgGrade = Math.round((totalScore / sPerf.length) * 100);
      }

      return { todaysStatus, avgGrade };
  };

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
  const LoginCardsView = () => {
      const studentsToPrint = selectedStudentIds.size > 0 
          ? students.filter(s => selectedStudentIds.has(s.id))
          : filteredStudents;

      return (
          <div className="fixed inset-0 bg-white z-[200] overflow-auto p-8">
              <div className="max-w-5xl mx-auto">
                  <div className="flex justify-between items-center mb-8 print:hidden">
                      <h2 className="text-2xl font-bold">بطاقات دخول الطلاب ({studentsToPrint.length})</h2>
                      <div className="flex gap-2">
                          <button onClick={() => window.print()} className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2"><Key size={16}/> طباعة</button>
                          <button onClick={() => setIsPrintCardsOpen(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold">إغلاق</button>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 print:grid-cols-2">
                      {studentsToPrint.map(student => (
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
  };

  const handleStudentClick = (student: Student) => {
      // Use navigation state to pass student data directly
      navigate('/followup', { state: { studentId: student.id } });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in h-full flex flex-col">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <UserPlus className="text-purple-600"/> سجل الطلاب
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1">إدارة بيانات الطلاب، التعديل، والمتابعة الفردية.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 w-full md:w-auto">
                <Filter size={16} className="text-gray-400 ml-1"/>
                <select 
                    className="bg-transparent text-sm font-bold text-gray-700 outline-none flex-1 md:w-auto min-w-[120px]"
                    value={filterGrade}
                    onChange={e => { setFilterGrade(e.target.value); setFilterClass(''); }}
                >
                    <option value="">جميع الصفوف</option>
                    {existingGrades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <div className="w-[1px] h-4 bg-gray-300 mx-1 hidden md:block"></div>
                <select 
                    className="bg-transparent text-sm font-bold text-gray-700 outline-none flex-1 md:w-auto min-w-[120px]"
                    value={filterClass}
                    onChange={e => setFilterClass(e.target.value)}
                >
                    <option value="">جميع الفصول</option>
                    {existingClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Search */}
            <div className="relative flex-1 md:flex-none w-full md:w-auto">
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
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                {!isManager && (
                    <>
                        <button onClick={() => setIsImportModalOpen(true)} className="flex-1 md:flex-none bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm whitespace-nowrap">
                            <FileSpreadsheet size={18} /> استيراد
                        </button>
                        <button onClick={openAddModal} className="flex-1 md:flex-none bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 flex items-center justify-center gap-2 shadow-sm whitespace-nowrap">
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

      {/* Bulk Action Bar */}
      {selectedStudentIds.size > 0 && (
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg flex items-center justify-between animate-slide-up">
              <div className="flex items-center gap-2 font-bold text-purple-700">
                  <CheckSquare size={18}/>
                  <span>تم تحديد {selectedStudentIds.size} طالب</span>
              </div>
              <div className="flex gap-2">
                  <button onClick={handleBulkMessage} className="flex items-center gap-2 bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-md text-sm font-bold hover:bg-purple-100">
                      <MessageSquare size={16}/> مراسلة
                  </button>
                  <button onClick={() => setIsMoveModalOpen(true)} className="flex items-center gap-2 bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-md text-sm font-bold hover:bg-purple-100">
                      <ArrowRightLeft size={16}/> نقل
                  </button>
                  <button onClick={() => setIsPrintCardsOpen(true)} className="flex items-center gap-2 bg-white border border-purple-200 text-purple-700 px-3 py-1.5 rounded-md text-sm font-bold hover:bg-purple-100">
                      <Printer size={16}/> بطاقات
                  </button>
                  <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-md text-sm font-bold hover:bg-red-700">
                      <Trash2 size={16}/> حذف
                  </button>
                  <button onClick={() => setSelectedStudentIds(new Set())} className="text-gray-400 hover:text-gray-600 px-2">
                      <X size={18}/>
                  </button>
              </div>
          </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex-col">
        <div className="flex-1 overflow-x-auto">
            <table className="w-full text-right min-w-[800px]">
            <thead className="bg-gray-50 text-gray-600 font-bold text-xs uppercase sticky top-0 z-10 shadow-sm">
                <tr>
                <th className="p-4 w-12 text-center">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-purple-600">
                        {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? <CheckSquare size={18}/> : <Square size={18}/>}
                    </button>
                </th>
                <th className="p-4">#</th>
                <th className="p-4">اسم الطالب</th>
                <th className="p-4">الصف / الفصل</th>
                <th className="p-4">رقم الهوية</th>
                <th className="p-4 text-center">حالة اليوم</th>
                <th className="p-4 text-center">المعدل</th>
                <th className="p-4 text-center w-32">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
                {filteredStudents.length > 0 ? filteredStudents.map((student, i) => {
                    const stats = getStudentStats(student.id);
                    const isSelected = selectedStudentIds.has(student.id);
                    return (
                    <tr key={student.id} className={`hover:bg-gray-50 transition-colors group ${isSelected ? 'bg-purple-50/50' : ''}`}>
                        <td className="p-4 text-center">
                            <button onClick={() => toggleSelectStudent(student.id)} className={`${isSelected ? 'text-purple-600' : 'text-gray-300 hover:text-gray-50'}`}>
                                {isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}
                            </button>
                        </td>
                        <td className="p-4 text-gray-400 font-mono text-xs">{i + 1}</td>
                        <td className="p-4">
                            <button 
                                onClick={() => handleStudentClick(student)}
                                className="font-bold text-gray-800 hover:text-purple-600 hover:underline text-base text-right flex items-center gap-2"
                            >
                                <span className={`w-2.5 h-2.5 rounded-full ${stats.todaysStatus === 'PRESENT' ? 'bg-green-500' : stats.todaysStatus === 'ABSENT' ? 'bg-red-500' : stats.todaysStatus === 'LATE' ? 'bg-yellow-500' : 'bg-gray-300'}`} title={`حالة اليوم: ${stats.todaysStatus}`}></span>
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
                            <span className={`text-[10px] px-2 py-1 rounded font-bold ${
                                stats.todaysStatus === 'PRESENT' ? 'bg-green-100 text-green-700' : 
                                stats.todaysStatus === 'ABSENT' ? 'bg-red-100 text-red-700' : 
                                stats.todaysStatus === 'LATE' ? 'bg-yellow-100 text-yellow-700' : 
                                'bg-gray-100 text-gray-500'
                            }`}>
                                {stats.todaysStatus === 'PRESENT' ? 'حاضر' : stats.todaysStatus === 'ABSENT' ? 'غائب' : stats.todaysStatus === 'LATE' ? 'متأخر' : '-'}
                            </span>
                        </td>
                        <td className="p-4 text-center">
                            {stats.avgGrade > 0 ? (
                                <div className="flex items-center justify-center gap-1 font-bold text-gray-700">
                                    <TrendingUp size={14} className={stats.avgGrade >= 80 ? 'text-green-500' : stats.avgGrade >= 60 ? 'text-orange-500' : 'text-red-500'}/>
                                    {stats.avgGrade}%
                                </div>
                            ) : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleStudentClick(student)} className="text-gray-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50" title="عرض الملف">
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
                        <td colSpan={8} className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
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

      {/* Move Class Modal */}
      {isMoveModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                  <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">نقل الطلاب المحددين</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-600 mb-1">الصف الجديد</label>
                          <select 
                              className="w-full p-2 border rounded-lg"
                              value={targetGrade}
                              onChange={e => setTargetGrade(e.target.value)}
                          >
                              <option value="">-- اختر الصف --</option>
                              {SAUDI_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-600 mb-1">الفصل الجديد</label>
                          <input 
                              className="w-full p-2 border rounded-lg"
                              placeholder="مثال: 2/ب"
                              value={targetClass}
                              onChange={e => setTargetClass(e.target.value)}
                          />
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setIsMoveModalOpen(false)} className="flex-1 py-2 border rounded text-gray-600">إلغاء</button>
                          <button onClick={handleBulkMove} className="flex-1 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700">نقل ({selectedStudentIds.size})</button>
                      </div>
                  </div>
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
