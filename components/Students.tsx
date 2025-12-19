import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser } from '../types';
import { deleteAllStudents, updateStudent } from '../services/storageService';
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
  
  // --- الاستعادة من التخزين المحلي لضمان بقاء الفلترة عند التحديث ---
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('std_search_term') || '');
  
  useEffect(() => {
      localStorage.setItem('std_search_term', searchTerm);
  }, [searchTerm]);

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const existingGrades = useMemo(() => Array.from(new Set(students.map(s => s.gradeLevel).filter(Boolean))), [students]);
  const existingClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))), [students]);

  const initialFormState = { name: '', nationalId: '', gradeLevel: '', className: '', email: '', phone: '', parentName: '', parentPhone: '', parentEmail: '', password: '' };
  const [formData, setFormData] = useState(initialFormState);

  const openAddModal = () => { setEditingStudent(null); setFormData(initialFormState); setIsFormModalOpen(true); };
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
    if (editingStudent) onUpdateStudent(studentData);
    else onAddStudent(studentData);
    setIsFormModalOpen(false);
  };

  const filteredStudents = useMemo(() => students.filter(s => 
    s.name.includes(searchTerm) || 
    (s.gradeLevel && s.gradeLevel.includes(searchTerm)) || 
    (s.nationalId && s.nationalId.includes(searchTerm))
  ).sort((a, b) => a.name.localeCompare(b.name, 'ar')), [students, searchTerm]);

  return (
    <div className="p-6 space-y-6 animate-fade-in bg-gray-50 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h2 className="text-2xl font-bold text-gray-800">إدارة الطلاب</h2><p className="text-sm text-gray-500 mt-1">إجمالي الطلاب: {students.length}</p></div>
        <div className="flex gap-2 flex-wrap">
            <button onClick={() => setIsAIImportModalOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"><Sparkles size={18} /> استخراج AI</button>
            <button onClick={() => setIsImportModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"><FileSpreadsheet size={18} /> استيراد Excel</button>
            <button onClick={openAddModal} className="bg-primary hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm font-bold"><UserPlus size={18} /> إضافة طالب</button>
            {students.length > 0 && <button onClick={() => {if(confirm('حذف الكل؟')) deleteAllStudents();}} className="bg-white text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold"><Trash2 size={18} /> حذف الكل</button>}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
            <div className="relative">
                <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
                <input type="text" placeholder="بحث عن طالب..." className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[1000px]">
            <thead className="bg-gray-50 text-gray-700 font-bold text-xs uppercase tracking-wider">
                <tr><th className="p-4">اسم الطالب</th><th className="p-4">رقم الهوية</th><th className="p-4">الصف / الفصل</th><th className="p-4">ولي الأمر</th><th className="p-4 text-center">إجراءات</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
                {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4 font-bold text-gray-800 cursor-pointer hover:text-primary hover:underline" onClick={() => navigate('/followup', { state: { studentId: student.id } })}>{student.name}</td>
                    <td className="p-4 text-gray-500 font-mono text-xs">{student.nationalId || '-'}</td>
                    <td className="p-4"><span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold">{student.gradeLevel}</span><span className="mr-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">{student.className}</span></td>
                    <td className="p-4 text-gray-500 text-xs">{student.parentName || '-'} ({student.parentPhone || '-'})</td>
                    <td className="p-4 flex justify-center gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"><Eye size={16}/></button>
                        <button onClick={() => openEditModal(student)} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-full"><Edit size={16}/></button>
                        <button onClick={() => onDeleteStudent(student.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={16}/></button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl animate-zoom-in">
            <h3 className="text-xl font-bold mb-4 border-b pb-4 flex justify-between">{editingStudent ? 'تعديل طالب' : 'إضافة طالب'}<button onClick={()=>setIsFormModalOpen(false)}><X/></button></h3>
            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-gray-500 mb-1">الاسم الرباعي *</label><input required className="w-full p-2 border rounded" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})}/></div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1">الهوية *</label><input required className="w-full p-2 border rounded font-mono" value={formData.nationalId} onChange={e=>setFormData({...formData, nationalId:e.target.value})}/></div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1">الصف</label><input list="grd" className="w-full p-2 border rounded" value={formData.gradeLevel} onChange={e=>setFormData({...formData, gradeLevel:e.target.value})}/><datalist id="grd">{existingGrades.map(g=><option key={g} value={g}/>)}</datalist></div>
              <div><label className="block text-xs font-bold text-gray-500 mb-1">الفصل</label><input list="cls" className="w-full p-2 border rounded" value={formData.className} onChange={e=>setFormData({...formData, className:e.target.value})}/><datalist id="cls">{existingClasses.map(c=><option key={c} value={c}/>)}</datalist></div>
              <div className="md:col-span-2 pt-4 border-t flex justify-end gap-2"><button type="button" onClick={()=>setIsFormModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold">إلغاء</button><button type="submit" className="px-8 py-2 bg-primary text-white rounded-lg font-bold shadow-lg">حفظ البيانات</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;