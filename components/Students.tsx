
import React, { useState, useEffect, useMemo } from 'react';
import { Student, SystemUser, AttendanceRecord, PerformanceRecord, AttendanceStatus, BehaviorStatus, AcademicTerm, ReportHeaderConfig } from '../types';
import { deleteStudent, getAcademicTerms, getReportHeaderConfig, getTeacherAssignments, updateStudent } from '../services/storageService';
import { Users, UserPlus, Trash2, Search, Eye, Edit, FileSpreadsheet, X, Loader2, Filter, CheckSquare, ArrowRightLeft, Printer, Square, MessageSquare, Key, TrendingUp, Clock, Cloud, Lock, Sparkles } from 'lucide-react';
import DataImport from './DataImport';
import AIDataImport from './AIDataImport';
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
  const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const filteredStudents = useMemo(() => {
      return students.filter(s => {
          const matchesSearch = s.name.includes(searchTerm) || (s.nationalId && s.nationalId.includes(searchTerm));
          const matchesGrade = !filterGrade || s.gradeLevel === filterGrade;
          const matchesClass = !filterClass || s.className === filterClass;
          return matchesSearch && matchesGrade && matchesClass;
      }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, searchTerm, filterGrade, filterClass]);

  const handleResetPassword = (student: Student) => {
      const newPass = prompt(`أدخل كلمة المرور الجديدة للطالب ${student.name}:`, '123456');
      if (newPass) {
          updateStudent({ ...student, password: newPass });
          alert('تم تحديث كلمة المرور بنجاح.');
      }
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

  const [formData, setFormData] = useState({
    name: '', nationalId: '', gradeLevel: '', className: '', email: '', phone: '', parentName: '', parentPhone: '', parentEmail: '', password: ''
  });

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in h-full flex flex-col bg-gray-50">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border">
        <div><h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2"><Users className="text-indigo-600"/> سجل الطلاب</h2></div>
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
                <Search className="absolute right-3 top-2.5 text-gray-400" size={18} />
                <input type="text" placeholder="بحث..." className="pr-10 pl-4 py-2 border rounded-lg text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
            </div>
            {!isManager && (
                <>
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-white border text-gray-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors">
                        <FileSpreadsheet size={18} className="text-green-600"/> استيراد Excel
                    </button>
                    <button onClick={() => setIsAIImportModalOpen(true)} className="bg-purple-50 border border-purple-200 text-purple-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-purple-100 transition-colors">
                        <Sparkles size={18}/> استيراد AI
                    </button>
                    <button onClick={() => { setEditingStudent(null); setIsFormModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md">
                        <UserPlus size={18}/> إضافة طالب
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex-1">
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-gray-50 text-gray-600 font-bold text-xs uppercase sticky top-0">
                    <tr>
                        <th className="p-4 w-12">#</th>
                        <th className="p-4">اسم الطالب</th>
                        <th className="p-4">الصف/الفصل</th>
                        <th className="p-4">رقم الهوية</th>
                        <th className="p-4 text-center">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {filteredStudents.map((s, i) => (
                        <tr key={s.id} className="hover:bg-gray-50 group">
                            <td className="p-4 text-gray-400 font-mono text-xs">{i + 1}</td>
                            <td className="p-4 font-bold text-gray-800">{s.name}</td>
                            <td className="p-4 text-gray-600">{s.className}</td>
                            <td className="p-4 font-mono text-xs">{s.nationalId}</td>
                            <td className="p-4 text-center flex justify-center gap-2">
                                <button onClick={() => navigate('/followup', {state: {studentId: s.id}})} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full"><Eye size={18}/></button>
                                <button onClick={() => handleResetPassword(s)} className="p-2 text-orange-500 hover:bg-orange-50 rounded-full" title="تغيير كلمة المرور"><Lock size={18}/></button>
                                <button onClick={() => openEditModal(s)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full"><Edit size={18}/></button>
                                <button onClick={() => onDeleteStudent(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredStudents.length === 0 && (
                <div className="p-20 text-center text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-10"/>
                    <p className="text-lg font-bold">لا يوجد طلاب مطابقين للبحث</p>
                </div>
            )}
        </div>
      </div>

      {/* مودال الإضافة والتعديل */}
      {isFormModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-zoom-in">
                  <h3 className="text-xl font-bold mb-4">{editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</h3>
                  <div className="space-y-4">
                      <input className="w-full p-2 border rounded-lg" placeholder="اسم الطالب" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})}/>
                      <input className="w-full p-2 border rounded-lg font-mono" placeholder="رقم الهوية" value={formData.nationalId} onChange={e=>setFormData({...formData, nationalId:e.target.value})}/>
                      <div className="grid grid-cols-2 gap-4">
                        <select className="p-2 border rounded-lg bg-gray-50" value={formData.gradeLevel} onChange={e=>setFormData({...formData, gradeLevel:e.target.value})}>
                            <option value="">الصف</option>
                            {SAUDI_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <input className="p-2 border rounded-lg" placeholder="الفصل" value={formData.className} onChange={e=>setFormData({...formData, className:e.target.value})}/>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input className="p-2 border rounded-lg" placeholder="اسم ولي الأمر" value={formData.parentName} onChange={e=>setFormData({...formData, parentName:e.target.value})}/>
                        <input className="p-2 border rounded-lg font-mono" placeholder="جوال ولي الأمر" value={formData.parentPhone} onChange={e=>setFormData({...formData, parentPhone:e.target.value})}/>
                      </div>
                      <button onClick={() => {
                          const s = { ...editingStudent, ...formData, id: editingStudent?.id || Date.now().toString() } as Student;
                          if (editingStudent) onUpdateStudent(s); else onAddStudent(s);
                          setIsFormModalOpen(false);
                      }} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors">حفظ البيانات</button>
                      <button onClick={()=>setIsFormModalOpen(false)} className="w-full py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-lg">إلغاء</button>
                  </div>
              </div>
          </div>
      )}

      {/* مودال استيراد Excel */}
      {isImportModalOpen && (
          <div className="fixed inset-0 z-[150] bg-white">
              <DataImport 
                existingStudents={students} 
                onImportStudents={(data, key, strategy, fields) => {
                    onImportStudents(data, key, strategy, fields);
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

      {/* مودال استيراد AI */}
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
