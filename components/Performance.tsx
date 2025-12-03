import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord } from '../types';
import { formatDualDate } from '../services/dateService';
import { PlusCircle, FileText, Check, FileSpreadsheet, Filter } from 'lucide-react';
import DataImport from './DataImport';

interface PerformanceProps {
  students: Student[];
  performance: PerformanceRecord[];
  onAddPerformance: (record: PerformanceRecord) => void;
  onImportPerformance: (records: PerformanceRecord[]) => void;
}

const Performance: React.FC<PerformanceProps> = ({ students, performance, onAddPerformance, onImportPerformance }) => {
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('رياضيات');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('20');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Filters for Data Entry
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Extract unique values from students
  const uniqueGrades = useMemo(() => Array.from(new Set(students.map(s => s.gradeLevel).filter(Boolean))), [students]);
  const uniqueClasses = useMemo(() => {
      const classes = new Set<string>();
      students.forEach(s => {
          if (!selectedGrade || s.gradeLevel === selectedGrade) {
              if (s.className) classes.add(s.className);
          }
      });
      return Array.from(classes).sort();
  }, [students, selectedGrade]);

  // Filter students for the dropdown
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
        if (selectedClass && student.className !== selectedClass) return false;
        if (selectedGrade && student.gradeLevel !== selectedGrade) return false;
        return true;
    });
  }, [students, selectedGrade, selectedClass]);

  // Set default student when list changes
  useEffect(() => {
      if (filteredStudents.length > 0 && !filteredStudents.find(s => s.id === studentId)) {
          setStudentId(filteredStudents[0].id);
      }
  }, [filteredStudents, studentId]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !title || !score) return;

    const record: PerformanceRecord = {
      id: Date.now().toString(),
      studentId,
      subject,
      title,
      score: Number(score),
      maxScore: Number(maxScore),
      date: new Date().toISOString().split('T')[0],
      notes,
      category: 'OTHER' // Default for manual single entry
    };

    onAddPerformance(record);
    setTitle('');
    setScore('');
    setNotes('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const recentPerformance = performance
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const getCategoryBadge = (cat?: string) => {
      switch(cat) {
          case 'ACTIVITY': return <span className="bg-blue-50 text-blue-600 px-1 rounded text-[10px]">نشاط</span>;
          case 'PLATFORM_EXAM': return <span className="bg-purple-50 text-purple-600 px-1 rounded text-[10px]">منصة</span>;
          case 'HOMEWORK': return <span className="bg-orange-50 text-orange-600 px-1 rounded text-[10px]">واجب</span>;
          case 'YEAR_WORK': return <span className="bg-teal-50 text-teal-600 px-1 rounded text-[10px]">أعمال سنة</span>;
          default: return <span className="bg-gray-50 text-gray-600 px-1 rounded text-[10px]">عام</span>;
      }
  }

  return (
    <div className="p-6 space-y-6">
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <PlusCircle className="text-primary" />
            سجل الدرجات (عام)
        </h2>
        <button 
            onClick={() => setIsImportModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm"
        >
            <FileSpreadsheet size={18} />
            <span>استيراد درجات</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entry Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-700">إضافة درجة جديدة يدوياً</h3>
                <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    التاريخ: {formatDualDate(new Date())}
                </span>
            </div>
            
            {/* Quick Filters */}
            <div className="bg-gray-50 p-3 rounded-lg mb-4 grid grid-cols-2 gap-2 border border-gray-200">
                <div className="col-span-2 text-xs font-bold text-gray-500 flex items-center gap-1 mb-1">
                    <Filter size={12}/> تصفية قائمة الطلاب
                </div>
                <select className="p-1 border rounded text-xs" value={selectedGrade} onChange={e => {setSelectedGrade(e.target.value); setSelectedClass('');}}>
                    <option value="">الصف: الكل</option>
                    {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select className="p-1 border rounded text-xs" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                    <option value="">الفصل: الكل</option>
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اختر الطالب ({filteredStudents.length})</label>
                <select 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none bg-white"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                >
                {filteredStudents.length > 0 ? filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.className})</option>
                )) : <option value="">لا يوجد طلاب مطابقين للفلترة</option>}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المادة</label>
                <select 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none bg-white"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                >
                    <option value="رياضيات">رياضيات</option>
                    <option value="علوم">علوم</option>
                    <option value="لغة عربية">لغة عربية</option>
                    <option value="لغة إنجليزية">لغة إنجليزية</option>
                    <option value="تربية إسلامية">تربية إسلامية</option>
                    <option value="اجتماعيات">اجتماعيات</option>
                    <option value="حاسب">حاسب</option>
                </select>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان التقييم</label>
                <input 
                    type="text" 
                    placeholder="مثال: اختبار الوحدة الأولى"
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الدرجة المستحقة</label>
                <input 
                    type="number" 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    required
                />
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">من أصل</label>
                <input 
                    type="number" 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    required
                />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                <textarea 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none h-24"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <button 
                type="submit" 
                disabled={!studentId}
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-teal-800 transition-colors font-medium flex justify-center items-center gap-2 disabled:bg-gray-300"
            >
                {isSuccess ? <Check size={20} /> : null}
                {isSuccess ? 'تمت الإضافة!' : 'تسجيل الدرجة'}
            </button>
            </form>
        </div>

        {/* Recent History */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
            <FileText className="text-secondary" />
            آخر النشاطات
            </h2>
            
            <div className="space-y-4">
            {recentPerformance.length > 0 ? recentPerformance.map(p => {
                const student = students.find(s => s.id === p.studentId);
                return (
                <div key={p.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            {student?.name || 'طالب محذوف'}
                            {getCategoryBadge(p.category)}
                        </h4>
                        <p className="text-sm text-gray-500">{p.subject} - {p.title}</p>
                    </div>
                    <div className="text-left">
                        <span className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-bold">
                        {p.score} / {p.maxScore}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-1">{formatDualDate(p.date)}</p>
                    </div>
                    </div>
                </div>
                );
            }) : (
                <p className="text-gray-500 text-center py-8">لا توجد سجلات حديثة.</p>
            )}
            </div>
        </div>
      </div>

       {/* --- IMPORT MODAL --- */}
       {isImportModalOpen && (
          <div className="fixed inset-0 z-[100] bg-white">
              <DataImport 
                  existingStudents={students}
                  onImportStudents={() => {}} 
                  onImportPerformance={(records) => {
                      onImportPerformance(records);
                      setIsImportModalOpen(false);
                  }}
                  onImportAttendance={() => {}}
                  forcedType="PERFORMANCE"
                  onClose={() => setIsImportModalOpen(false)}
              />
          </div>
      )}
    </div>
  );
};

export default Performance;