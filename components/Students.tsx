import React, { useState, useEffect } from 'react';
import { Student, EducationalStage, GradeLevel, ClassRoom } from '../types';
import { getStages, getGrades, getClasses, deleteAllStudents } from '../services/storageService';
import { UserPlus, Trash2, Search, Mail, Phone, User, GraduationCap, FileText, Eye, Edit, FileSpreadsheet, X, CheckCircle, AlertTriangle } from 'lucide-react';
import DataImport from './DataImport';

interface StudentsProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onImportStudents: (students: Student[]) => void;
}

const Students: React.FC<StudentsProps> = ({ students, onAddStudent, onUpdateStudent, onDeleteStudent, onImportStudents }) => {
  const [stages, setStages] = useState<EducationalStage[]>([]);
  const [grades, setGrades] = useState<GradeLevel[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  // Form State
  const initialFormState = {
    name: '',
    nationalId: '',
    stageId: '',
    gradeId: '',
    classId: '',
    email: '',
    phone: '',
    parentName: '',
    parentPhone: '',
    parentEmail: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    setStages(getStages());
    setGrades(getGrades());
    setClasses(getClasses());
  }, [isFormModalOpen]);

  // Open Add Modal
  const openAddModal = () => {
      setEditingStudent(null);
      setFormData(initialFormState);
      setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (student: Student) => {
      setEditingStudent(student);
      const cls = classes.find(c => c.id === student.classId);
      const grd = grades.find(g => g.name === student.gradeLevel); 
      const stg = grd ? stages.find(s => s.id === grd.stageId) : null;

      setFormData({
          name: student.name,
          nationalId: student.nationalId || '',
          stageId: stg?.id || '',
          gradeId: grd?.id || '',
          classId: student.classId || '',
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

    const selectedClass = classes.find(c => c.id === formData.classId);
    const selectedGrade = grades.find(g => g.id === formData.gradeId);
    
    const gradeDisplay = selectedGrade ? selectedGrade.name : (editingStudent?.gradeLevel || '');
    const classDisplay = selectedClass ? selectedClass.name : (editingStudent?.className || '');

    const studentData: Student = {
      id: editingStudent ? editingStudent.id : Date.now().toString(),
      name: formData.name,
      nationalId: formData.nationalId,
      classId: formData.classId,
      gradeLevel: gradeDisplay,
      className: classDisplay,
      email: formData.email,
      phone: formData.phone,
      parentName: formData.parentName,
      parentPhone: formData.parentPhone,
      parentEmail: formData.parentEmail
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
          onImportStudents([]); // Trigger refresh basically
      }
  };

  const filteredStudents = students.filter(s => 
    s.name.includes(searchTerm) || (s.gradeLevel && s.gradeLevel.includes(searchTerm)) || (s.nationalId && s.nationalId.includes(searchTerm))
  );

  const availableGrades = grades.filter(g => g.stageId === formData.stageId);
  const availableClasses = classes.filter(c => c.gradeLevelId === formData.gradeId);

  return (
    <div className="p-6 space-y-6">
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
                <th className="p-4 whitespace-nowrap">رقم الهوية / السجل</th>
                <th className="p-4 whitespace-nowrap">الصف</th>
                <th className="p-4 whitespace-nowrap">الفصل</th>
                <th className="p-4 whitespace-nowrap">جوال الطالب</th>
                <th className="p-4 whitespace-nowrap">ايميل الطالب</th>
                <th className="p-4 whitespace-nowrap">اسم ولي الأمر</th>
                <th className="p-4 whitespace-nowrap">جوال ولي الأمر</th>
                <th className="p-4 whitespace-nowrap">ايميل ولي الأمر</th>
                <th className="p-4 whitespace-nowrap w-40 text-center">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
                {filteredStudents.length > 0 ? filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{student.name}</td>
                    <td className="p-4 text-gray-600 font-mono">{student.nationalId || '-'}</td>
                    <td className="p-4 text-gray-600">{student.gradeLevel}</td>
                    <td className="p-4 text-gray-600">{student.className}</td>
                    <td className="p-4 text-gray-600 font-mono dir-ltr text-right">{student.phone || '-'}</td>
                    <td className="p-4 text-gray-600 font-mono">{student.email || '-'}</td>
                    <td className="p-4 text-gray-600">{student.parentName || '-'}</td>
                    <td className="p-4 text-green-700 font-medium font-mono dir-ltr text-right">{student.parentPhone || '-'}</td>
                    <td className="p-4 text-gray-500 font-mono">{student.parentEmail || '-'}</td>
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

      {/* --- ADD / EDIT FORM MODAL --- */}
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
                  <h4 className="text-sm font-bold text-primary mb-3">البيانات الأكاديمية</h4>
                  <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">المرحلة</label>
                        <select 
                            className="w-full p-2 border rounded text-sm bg-white"
                            value={formData.stageId}
                            onChange={(e) => setFormData({...formData, stageId: e.target.value, gradeId: '', classId: ''})}
                        >
                            <option value="">اختر</option>
                            {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">الصف</label>
                        <select 
                            className="w-full p-2 border rounded text-sm bg-white"
                            value={formData.gradeId}
                            onChange={(e) => setFormData({...formData, gradeId: e.target.value, classId: ''})}
                            disabled={!formData.stageId}
                        >
                            <option value="">اختر</option>
                            {availableGrades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">الفصل</label>
                        <select 
                            className="w-full p-2 border rounded text-sm bg-white"
                            value={formData.classId}
                            onChange={(e) => setFormData({...formData, classId: e.target.value})}
                            disabled={!formData.gradeId && !editingStudent} 
                        >
                            <option value="">اختر</option>
                            {availableClasses.length > 0 ? availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>) : 
                             classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                            }
                        </select>
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

      {/* --- IMPORT MODAL --- */}
      {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800">استيراد بيانات الطلاب من Excel</h3>
                      <button onClick={() => setIsImportModalOpen(false)} className="text-gray-500 hover:text-red-500"><X size={24}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                      <DataImport 
                          existingStudents={students}
                          onImportStudents={(data) => { onImportStudents(data); setIsImportModalOpen(false); }}
                          onImportAttendance={() => {}} 
                          onImportPerformance={() => {}}
                          forcedType="STUDENTS"
                      />
                  </div>
              </div>
          </div>
      )}

      {/* --- VIEW MODAL --- */}
      {isViewModalOpen && viewStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl relative">
                  <button onClick={() => setIsViewModalOpen(false)} className="absolute left-4 top-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
                  <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto flex items-center justify-center text-gray-400 mb-3">
                          <User size={40} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800">{viewStudent.name}</h3>
                      <p className="text-gray-500">{viewStudent.gradeLevel} - {viewStudent.className}</p>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-3">
                          <FileText className="text-primary" size={20}/>
                          <div>
                              <p className="text-xs text-gray-500">رقم الهوية</p>
                              <p className="font-mono font-bold">{viewStudent.nationalId || 'غير مسجل'}</p>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                           <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Phone size={12}/> جوال الطالب</p>
                                <p className="font-mono dir-ltr text-right text-sm font-bold">{viewStudent.phone || '-'}</p>
                           </div>
                           <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Mail size={12}/> إيميل الطالب</p>
                                <p className="font-mono text-sm font-bold break-all">{viewStudent.email || '-'}</p>
                           </div>
                      </div>

                      <div className="border-t pt-4">
                          <p className="font-bold text-gray-800 mb-3 text-sm">بيانات ولي الأمر</p>
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <p className="font-bold text-gray-800 flex items-center gap-2 mb-2"><User size={16}/> {viewStudent.parentName || 'غير مسجل'}</p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="flex items-center gap-1 text-gray-600"><Phone size={14}/> {viewStudent.parentPhone || '-'}</span>
                                    <span className="flex items-center gap-1 text-gray-600"><Mail size={14}/> {viewStudent.parentEmail || '-'}</span>
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