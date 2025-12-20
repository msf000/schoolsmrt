
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser } from '../types';
import { deleteAllStudents, updateStudent } from '../services/storageService';
// Added ArrowRight to lucide-react imports
import { UserPlus, Trash2, Search, Mail, Phone, User, GraduationCap, FileText, Eye, Edit, FileSpreadsheet, X, CheckCircle, AlertTriangle, Building2, Lock, Sparkles, Users, MessageSquare, ArrowRight } from 'lucide-react';
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
  onAddStudent, 
  onUpdateStudent, 
  onDeleteStudent, 
  onImportStudents,
  currentUser
}) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('std_search_term') || '');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
      localStorage.setItem('std_search_term', searchTerm);
  }, [searchTerm]);

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
    (s.className && s.className.includes(searchTerm)) || 
    (s.nationalId && s.nationalId.includes(searchTerm))
  ).sort((a, b) => a.name.localeCompare(b.name, 'ar')), [students, searchTerm]);

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in bg-gray-50 h-full overflow-y-auto pb-24">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
            <h2 className="text-2xl font-black text-gray-800">قائمة الطلاب</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">إجمالي المسجلين: {students.length}</p>
        </div>
        <div className="flex gap-2 flex-wrap w-full lg:w-auto">
            <button onClick={() => setIsImportModalOpen(true)} className="flex-1 lg:flex-none bg-emerald-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg text-sm font-black active:scale-95 transition-all"><FileSpreadsheet size={18} /> استيراد</button>
            <button onClick={openAddModal} className="flex-1 lg:flex-none bg-indigo-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg text-sm font-black active:scale-95 transition-all"><UserPlus size={18} /> إضافة</button>
        </div>
      </div>

      <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="بحث باسم الطالب، الفصل، أو الهوية..." className="w-full pr-12 pl-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-right">
            <thead className="bg-gray-50/50 text-gray-400 font-black text-[10px] uppercase tracking-widest border-b">
                <tr><th className="p-4">الطالب</th><th className="p-4">الهوية</th><th className="p-4">الفصل</th><th className="p-4">الجوال</th><th className="p-4 text-center">إجراءات</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="p-4 font-black text-gray-800 cursor-pointer hover:text-indigo-600" onClick={() => navigate('/followup', { state: { studentId: student.id } })}>{student.name}</td>
                    <td className="p-4 text-gray-400 font-mono text-xs">{student.nationalId}</td>
                    <td className="p-4"><span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black">{student.className}</span></td>
                    <td className="p-4 text-gray-500 text-xs">{student.parentPhone || '-'}</td>
                    <td className="p-4 flex justify-center gap-2">
                        <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-2 text-indigo-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-indigo-100"><Eye size={16}/></button>
                        <button onClick={() => openEditModal(student)} className="p-2 text-amber-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-amber-100"><Edit size={16}/></button>
                        <button onClick={() => onDeleteStudent(student.id)} className="p-2 text-red-500 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-red-100"><Trash2 size={16}/></button>
                    </td>
                </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden grid grid-cols-1 gap-4">
          {filteredStudents.map(student => (
              <div key={student.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all">
                  <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl">{student.name.charAt(0)}</div>
                      <div onClick={() => navigate('/followup', { state: { studentId: student.id } })}>
                          <h4 className="font-black text-gray-800 text-sm">{student.name}</h4>
                          <div className="flex gap-2 mt-1">
                              <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">{student.className}</span>
                              <span className="text-[9px] font-bold text-gray-400 font-mono">{student.nationalId}</span>
                          </div>
                      </div>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => openEditModal(student)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl"><Edit size={18}/></button>
                      <button onClick={() => navigate('/followup', { state: { studentId: student.id } })} className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><ArrowRight size={18}/></button>
                  </div>
              </div>
          ))}
          {filteredStudents.length === 0 && <div className="text-center py-20 text-gray-300 font-black">لا يوجد نتائج للبحث</div>}
      </div>

      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-2xl shadow-2xl animate-zoom-in">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl font-black text-gray-800">{editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
                <button onClick={()=>setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X/></button>
            </div>
            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2"><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">الاسم الكامل *</label><input required className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})}/></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">رقم الهوية *</label><input required className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono" value={formData.nationalId} onChange={e=>setFormData({...formData, nationalId:e.target.value})}/></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">الفصل</label><input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold" value={formData.className} onChange={e=>setFormData({...formData, className:e.target.value})}/></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">رقم الجوال</label><input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono" value={formData.parentPhone} onChange={e=>setFormData({...formData, parentPhone:e.target.value})}/></div>
              <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">كلمة المرور (للطالب)</label><input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none" value={formData.password} onChange={e=>setFormData({...formData, password:e.target.value})}/></div>
              <div className="md:col-span-2 pt-6 flex gap-3"><button type="button" onClick={()=>setIsFormModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-black">إلغاء</button><button type="submit" className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">حفظ البيانات</button></div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && (
          <div className="fixed inset-0 z-[110] bg-white">
              <DataImport existingStudents={students} onImportStudents={(data) => { onImportStudents(data); setIsImportModalOpen(false); }} onImportAttendance={()=>{}} onImportPerformance={()=>{}} forcedType="STUDENTS" onClose={() => setIsImportModalOpen(false)} currentUser={currentUser} />
          </div>
      )}
    </div>
  );
};

export default Students;
