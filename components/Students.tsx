
import React, { useState, useMemo } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser } from '../types';
import { deleteAllStudents, updateStudent } from '../services/storageService';
// Added 'Users' to lucide-react imports to fix the error on line 245
import { UserPlus, Trash2, Search, Mail, Phone, User, GraduationCap, FileText, Eye, Edit, FileSpreadsheet, X, CheckCircle, AlertTriangle, Building2, Lock, Sparkles, Users } from 'lucide-react';
import DataImport from './DataImport';
import AIDataImport from './AIDataImport';
import { useNavigate } from 'react-router-dom';

interface StudentsProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onImportStudents: (students: Student[], matchKey?: keyof Student, strategy?: 'UPDATE' | 'SKIP' | 'NEW', updateFields?: string[]) => void;
  currentUser: SystemUser | null;
}

const Students: React.FC<StudentsProps> = ({ 
  students, 
  attendance, 
  performance, 
  onAddStudent, 
  onUpdateStudent, 
  onDeleteStudent, 
  onImportStudents,
  currentUser
}) => {
  const navigate = useNavigate();
  
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  // Derive unique grades/classes for suggestions (DataList)
  const existingGrades = useMemo(() => Array.from(new Set(students.map(s => s.gradeLevel).filter(Boolean))), [students]);
  const existingClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))), [students]);

  // Form State
  const initialFormState = {
    name: '',
    nationalId: '',
    gradeLevel: '',
    className: '',
    email: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    password: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Open Add Modal
  const openAddModal = () => {
      setEditingStudent(null);
      setFormData(initialFormState);
      setIsFormModalOpen(true);
  };

  // Open Edit Modal
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
          password: student.password || '123456'
      });
      setIsFormModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.nationalId) return;

    // Fix: Added required 'role' property to Student object
    const studentData: Student = {
      id: editingStudent ? editingStudent.id : Date.now().toString(),
      name: formData.name,
      role: 'STUDENT',
      nationalId: formData.nationalId,
      classId: formData.className,
      gradeLevel: formData.gradeLevel,
      className: formData.className,
      email: formData.email,
      phone: formData.phone,
      parentName: formData.parentName,
      parentPhone: formData.parentPhone,
      parentEmail: formData.parentEmail,
      password: formData.password || '123456',
      schoolId: currentUser?.schoolId,
      createdById: currentUser?.id
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

  const filteredStudents = useMemo(() => students.filter(s => 
    s.name.includes(searchTerm) || 
    (s.gradeLevel && s.gradeLevel.includes(searchTerm)) || 
    (s.nationalId && s.nationalId.includes(searchTerm))
  ).sort((a, b) => a.name.localeCompare(b.name, 'ar')), [students, searchTerm]);

  return (
    <div className="p-6 space-y-6 animate-fade-in bg-gray-50 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">قائمة الطلاب</h2>
            <p className="text-sm text-gray-500 mt-1">إجمالي الطلاب: {students.length}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => setIsAIImportModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"
            >
              <Sparkles size={18} />
              <span>استيراد AI</span>
            </button>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"
            >
              <FileSpreadsheet size={18} />
              <span>استيراد Excel</span>
            </button>
            <button 
              onClick={openAddModal}
              className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"
            >
              <UserPlus size={18} />
              <span>إضافة طالب</span>
            </button>
            {students.length > 0 && (
                <button 
                onClick={handleDeleteAll}
                className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
                >
                <Trash2 size={18} />
                <span>حذف الكل</span>
                </button>
            )}
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
            <table className="w-full text-right min-w-[1000px]">
            <thead className="bg-gray-50 text-gray-700 font-bold text-sm">
                <tr>
                <th className="p-4 whitespace-nowrap">اسم الطالب</th>
                <th className="p-4 whitespace-nowrap">رقم الهوية</th>
                <th className="p-4 whitespace-nowrap">الصف / الفصل</th>
                <th className="p-4 whitespace-nowrap">ولي الأمر</th>
                <th className="p-4 whitespace-nowrap">الجوال</th>
                <th className="p-4 whitespace-nowrap text-center">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
                {filteredStudents.length > 0 ? filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4">
                      <div 
                        onClick={() => navigate('/followup', { state: { studentId: student.id } })}
                        className="flex items-center gap-3 cursor-pointer hover:text-primary transition-colors group/name"
                      >
                        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover/name:bg-primary group-hover/name:text-white transition-all">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-bold text-gray-800 group-hover/name:underline">{student.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 font-mono">{student.nationalId || '-'}</td>
                    <td className="p-4 text-gray-600">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{student.gradeLevel}</span>
                      <span className="mr-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{student.className}</span>
                    </td>
                    <td className="p-4 text-gray-600">{student.parentName || '-'}</td>
                    <td className="p-4 text-gray-600 font-mono">{student.parentPhone || '-'}</td>
                    <td className="p-4">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button 
                                onClick={() => navigate('/followup', { state: { studentId: student.id } })}
                                className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                title="عرض الملف"
                            >
                                <Eye size={18} />
                            </button>
                            <button 
                                onClick={() => openEditModal(student)}
                                className="text-yellow-600 hover:bg-yellow-50 p-2 rounded-full transition-colors"
                                title="تحرير"
                            >
                                <Edit size={18} />
                            </button>
                            <button 
                                onClick={() => onDeleteStudent(student.id)}
                                className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                title="حذف"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </td>
                </tr>
                )) : (
                    <tr>
                        <td colSpan={6} className="p-20 text-center text-gray-400">
                          <Users size={48} className="mx-auto mb-4 opacity-20"/>
                          <p>لا يوجد طلاب مطابقين للبحث</p>
                        </td>
                    </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* --- ADD / EDIT FORM MODAL --- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] overflow-y-auto p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-zoom-in my-auto">
            <h3 className="text-xl font-bold mb-4 border-b pb-4 flex justify-between items-center text-gray-800">
                {editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
                <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </h3>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">اسم الطالب الرباعي *</label>
                    <input 
                      type="text" required
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none bg-gray-50 border-gray-200"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">رقم الهوية / السجل *</label>
                    <input 
                      type="text" required 
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none bg-gray-50 border-gray-200 font-mono"
                      value={formData.nationalId}
                      onChange={(e) => setFormData({...formData, nationalId: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">الصف الدراسي</label>
                    <input 
                        list="gradeOptions"
                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none bg-gray-50 border-gray-200"
                        value={formData.gradeLevel}
                        onChange={(e) => setFormData({...formData, gradeLevel: e.target.value})}
                    />
                    <datalist id="gradeOptions">
                        {existingGrades.map(g => <option key={g} value={g} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">الفصل</label>
                    <input 
                        list="classOptions"
                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none bg-gray-50 border-gray-200"
                        value={formData.className}
                        onChange={(e) => setFormData({...formData, className: e.target.value})}
                    />
                    <datalist id="classOptions">
                        {existingClasses.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">اسم ولي الأمر</label>
                    <input 
                      type="text"
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none bg-gray-50 border-gray-200"
                      value={formData.parentName}
                      onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">جوال ولي الأمر</label>
                    <input 
                      type="tel"
                      className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none bg-gray-50 border-gray-200 font-mono"
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                    />
                  </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t">
                <button 
                  type="button" 
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-6 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="px-10 py-3 bg-primary text-white rounded-xl hover:bg-indigo-700 shadow-lg font-bold transition-all transform active:scale-95"
                >
                  {editingStudent ? 'حفظ التعديلات' : 'إضافة الطالب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- IMPORT MODAL --- */}
      {isImportModalOpen && (
          <div className="fixed inset-0 z-[150] bg-white">
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

      {/* --- AI IMPORT MODAL --- */}
      {isAIImportModalOpen && (
          <div className="fixed inset-0 z-[150] bg-white">
              <AIDataImport 
                  existingStudents={students}
                  onImportStudents={(data) => {
                      onImportStudents(data);
                      setIsAIImportModalOpen(false);
                  }}
                  onImportAttendance={() => {}}
                  onImportPerformance={() => {}}
                  onClose={() => setIsAIImportModalOpen(false)}
                  forcedType="STUDENTS"
                  currentUser={currentUser}
              />
          </div>
      )}

    </div>
  );
};

export default Students;
