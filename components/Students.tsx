
import React, { useState, useMemo } from 'react';
import { Student, SystemUser } from '../types';
import { deleteAllStudents, updateStudent } from '../services/storageService';
import { UserPlus, Trash2, Search, Eye, Edit, FileSpreadsheet, X, Sparkles, Lock, ShieldCheck } from 'lucide-react';
import DataImport from './DataImport';
import AIDataImport from './AIDataImport';
import { useNavigate } from 'react-router-dom';

interface StudentsProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onImportStudents: (students: Student[], matchKey?: keyof Student, strategy?: 'UPDATE' | 'SKIP' | 'NEW', updateFields?: string[]) => void;
  currentUser?: SystemUser | null;
}

const Students: React.FC<StudentsProps> = ({ students, onAddStudent, onUpdateStudent, onDeleteStudent, onImportStudents, currentUser }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const initialFormState = { name: '', nationalId: '', gradeLevel: '', className: '', parentPhone: '', password: '' };
  const [formData, setFormData] = useState(initialFormState);

  const filteredStudents = useMemo(() => students.filter(s => 
    s.name.includes(searchTerm) || (s.nationalId && s.nationalId.includes(searchTerm))
  ).sort((a,b) => a.name.localeCompare(b.name, 'ar')), [students, searchTerm]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const studentData: Student = { ...editingStudent, ...formData, id: editingStudent ? editingStudent.id : Date.now().toString() } as Student;
    if (editingStudent) onUpdateStudent(studentData); else onAddStudent(studentData);
    setIsFormModalOpen(false);
  };

  const handleResetPassword = (student: Student) => {
      const newPass = prompt(`أدخل كلمة مرور جديدة للطالب ${student.name}:`, '123456');
      if (newPass) { updateStudent({ ...student, password: newPass }); alert('تم التحديث.'); }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in h-full flex flex-col bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div><h2 className="text-2xl font-black text-gray-800 flex items-center gap-2"><ShieldCheck className="text-indigo-600"/> سجل الطلاب</h2></div>
        <div className="flex gap-2 flex-wrap">
            <button onClick={() => setIsImportModalOpen(true)} className="bg-white border text-gray-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-50"><FileSpreadsheet size={18} className="text-green-600"/> استيراد Excel</button>
            <button onClick={() => setIsAIImportModalOpen(true)} className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-purple-100"><Sparkles size={18}/> استيراد AI</button>
            <button onClick={() => { setEditingStudent(null); setFormData(initialFormState); setIsFormModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:bg-indigo-700"><UserPlus size={18}/> إضافة طالب</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b"><div className="relative"><Search className="absolute right-3 top-2.5 text-gray-400" size={20}/><input className="w-full pr-10 pl-4 py-2 border rounded-xl" placeholder="بحث باسم الطالب أو الهوية..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div></div>
        <div className="overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-right">
                <thead className="bg-gray-50 text-gray-600 font-black text-xs uppercase sticky top-0">
                    <tr><th className="p-4">اسم الطالب</th><th className="p-4">رقم الهوية</th><th className="p-4">الفصل</th><th className="p-4 text-center">إجراءات</th></tr>
                </thead>
                <tbody className="divide-y text-sm">
                    {filteredStudents.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4 font-bold text-gray-800">{s.name}</td>
                            <td className="p-4 font-mono text-gray-500">{s.nationalId}</td>
                            <td className="p-4"><span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold text-xs">{s.className}</span></td>
                            <td className="p-4 flex justify-center gap-2">
                                <button onClick={() => navigate('/followup', {state: {studentId: s.id}})} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"><Eye size={18}/></button>
                                <button onClick={() => handleResetPassword(s)} className="p-2 text-orange-500 hover:bg-orange-50 rounded-full"><Lock size={18}/></button>
                                <button onClick={() => { setEditingStudent(s); setFormData({name:s.name, nationalId:s.nationalId||'', gradeLevel:s.gradeLevel||'', className:s.className||'', parentPhone:s.parentPhone||'', password:s.password||''}); setIsFormModalOpen(true); }} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full"><Edit size={18}/></button>
                                <button onClick={() => onDeleteStudent(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {isFormModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-zoom-in">
                  <h3 className="text-xl font-bold mb-4">{editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
                  <form onSubmit={handleFormSubmit} className="space-y-4">
                      <input required className="w-full p-2 border rounded-lg" placeholder="اسم الطالب الكامل" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})}/>
                      <input required className="w-full p-2 border rounded-lg" placeholder="رقم الهوية" value={formData.nationalId} onChange={e=>setFormData({...formData, nationalId:e.target.value})}/>
                      <div className="grid grid-cols-2 gap-4">
                        <input className="w-full p-2 border rounded-lg" placeholder="الصف" value={formData.gradeLevel} onChange={e=>setFormData({...formData, gradeLevel:e.target.value})}/>
                        <input className="w-full p-2 border rounded-lg" placeholder="الفصل" value={formData.className} onChange={e=>setFormData({...formData, className:e.target.value})}/>
                      </div>
                      <input className="w-full p-2 border rounded-lg" placeholder="جوال ولي الأمر" value={formData.parentPhone} onChange={e=>setFormData({...formData, parentPhone:e.target.value})}/>
                      <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">حفظ الطالب</button>
                      <button type="button" onClick={()=>setIsFormModalOpen(false)} className="w-full py-2 text-gray-500">إلغاء</button>
                  </form>
              </div>
          </div>
      )}

      {isImportModalOpen && <div className="fixed inset-0 z-[200] bg-white"><DataImport existingStudents={students} onImportStudents={(d,k,s,f)=>{onImportStudents(d,k,s,f); setIsImportModalOpen(false);}} onImportAttendance={()=>{}} onImportPerformance={()=>{}} forcedType="STUDENTS" onClose={()=>setIsImportModalOpen(false)} currentUser={currentUser}/></div>}
      {isAIImportModalOpen && <div className="fixed inset-0 z-[200] bg-white"><AIDataImport existingStudents={students} onImportStudents={(d)=>{onImportStudents(d); setIsAIImportModalOpen(false);}} onImportAttendance={()=>{}} onImportPerformance={()=>{}} onClose={()=>setIsAIImportModalOpen(false)} forcedType="STUDENTS" currentUser={currentUser}/></div>}
    </div>
  );
};

export default Students;
