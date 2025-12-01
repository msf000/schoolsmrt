import React, { useState } from 'react';
import { Student, PerformanceRecord } from '../types';
import { PlusCircle, FileText, Check } from 'lucide-react';

interface PerformanceProps {
  students: Student[];
  performance: PerformanceRecord[];
  onAddPerformance: (record: PerformanceRecord) => void;
}

const Performance: React.FC<PerformanceProps> = ({ students, performance, onAddPerformance }) => {
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [subject, setSubject] = useState('رياضيات');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('20');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

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
      notes
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

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Entry Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
          <PlusCircle className="text-primary" />
          إضافة درجة جديدة
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اختر الطالب</label>
            <select 
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none bg-white"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
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
            className="w-full py-3 bg-primary text-white rounded-lg hover:bg-teal-800 transition-colors font-medium flex justify-center items-center gap-2"
          >
            {isSuccess ? <Check size={20} /> : null}
            {isSuccess ? 'تمت الإضافة!' : 'تسجيل الدرجة'}
          </button>
        </form>
      </div>

      {/* Recent History */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
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
                    <h4 className="font-bold text-gray-800">{student?.name}</h4>
                    <p className="text-sm text-gray-500">{p.subject} - {p.title}</p>
                  </div>
                  <div className="text-left">
                    <span className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-bold">
                      {p.score} / {p.maxScore}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{p.date}</p>
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
  );
};

export default Performance;