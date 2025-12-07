
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, PerformanceCategory } from '../types';
import { formatDualDate } from '../services/dateService';
import { PlusCircle, FileText, Check, FileSpreadsheet, Filter, History, Search, Download, Trash2, Printer, X } from 'lucide-react';
import DataImport from './DataImport';
import * as XLSX from 'xlsx';

interface PerformanceProps {
  students: Student[];
  performance: PerformanceRecord[];
  onAddPerformance: (record: PerformanceRecord) => void;
  onImportPerformance: (records: PerformanceRecord[]) => void;
  onDeletePerformance: (id: string) => void;
}

const Performance: React.FC<PerformanceProps> = ({ students, performance, onAddPerformance, onImportPerformance, onDeletePerformance }) => {
  const [activeTab, setActiveTab] = useState<'ENTRY' | 'LOG'>('ENTRY');

  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('رياضيات');
  const [title, setTitle] = useState('');
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('20');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<PerformanceCategory>('OTHER');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [entryGrade, setEntryGrade] = useState('');
  const [entryClass, setEntryClass] = useState('');

  const [logSearch, setLogSearch] = useState('');
  const [logClass, setLogClass] = useState('');
  const [logSubject, setLogSubject] = useState('');
  const [logDateStart, setLogDateStart] = useState('');
  const [logDateEnd, setLogDateEnd] = useState('');

  const uniqueGrades = useMemo(() => Array.from(new Set(students.map(s => s.gradeLevel).filter(Boolean))), [students]);
  
  const uniqueClasses = useMemo(() => {
      const classes = new Set<string>();
      students.forEach(s => s.className && classes.add(s.className));
      return Array.from(classes).sort();
  }, [students]);

  const uniqueSubjects = useMemo(() => {
      const subs = new Set<string>();
      performance.forEach(p => p.subject && subs.add(p.subject));
      return Array.from(subs).sort();
  }, [performance]);

  const filteredStudentsEntry = useMemo(() => {
    return students.filter(student => {
        if (entryClass && student.className !== entryClass) return false;
        if (entryGrade && student.gradeLevel !== entryGrade) return false;
        return true;
    });
  }, [students, entryGrade, entryClass]);

  useEffect(() => {
      if (filteredStudentsEntry.length > 0 && !filteredStudentsEntry.find(s => s.id === studentId)) {
          setStudentId(filteredStudentsEntry[0].id);
      }
  }, [filteredStudentsEntry, studentId]);

  const filteredHistory = useMemo(() => {
      return performance.filter(p => {
          const student = students.find(s => s.id === p.studentId);
          if (!student) return false; 

          if (logSearch && !student.name.includes(logSearch) && !p.title.includes(logSearch)) return false;
          if (logClass && student.className !== logClass) return false;
          if (logSubject && p.subject !== logSubject) return false;
          if (logDateStart && p.date < logDateStart) return false;
          if (logDateEnd && p.date > logDateEnd) return false;

          return true;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [performance, students, logSearch, logClass, logSubject, logDateStart, logDateEnd]);

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
      category: category 
    };

    onAddPerformance(record);
    setTitle('');
    setScore('');
    setNotes('');
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  const handleDelete = (id: string) => {
      if(confirm('هل أنت متأكد من حذف هذا السجل؟')) {
          onDeletePerformance(id);
      }
  };

  const handleExportExcel = () => {
      if (filteredHistory.length === 0) return alert('لا توجد بيانات للتصدير');

      const dataToExport = filteredHistory.map(p => {
          const student = students.find(s => s.id === p.studentId);
          return {
              'التاريخ': p.date,
              'الطالب': student?.name || 'غير معروف',
              'الفصل': student?.className || '-',
              'المادة': p.subject,
              'عنوان التقييم': p.title,
              'الدرجة': p.score,
              'الدرجة العظمى': p.maxScore,
              'التصنيف': getCategoryLabel(p.category),
              'ملاحظات': p.notes || ''
          };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "سجل الدرجات");
      XLSX.writeFile(wb, `Grades_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
      window.print();
  };

  const getCategoryBadge = (cat?: string) => {
      switch(cat) {
          case 'ACTIVITY': return <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold">نشاط</span>;
          case 'PLATFORM_EXAM': return <span className="bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-[10px] font-bold">منصة</span>;
          case 'HOMEWORK': return <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold">واجب</span>;
          case 'YEAR_WORK': return <span className="bg-teal-50 text-teal-600 px-2 py-0.5 rounded text-[10px] font-bold">أعمال سنة</span>;
          default: return <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">عام</span>;
      }
  }

  const getCategoryLabel = (cat?: string) => {
      switch(cat) {
          case 'ACTIVITY': return 'نشاط';
          case 'PLATFORM_EXAM': return 'منصة';
          case 'HOMEWORK': return 'واجب';
          case 'YEAR_WORK': return 'أعمال سنة';
          default: return 'عام';
      }
  }

  const recentPerformance = performance
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 print:hidden">
        <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
            <button 
                onClick={() => setActiveTab('ENTRY')}
                className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'ENTRY' ? 'bg-primary text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <PlusCircle size={18}/> رصد الدرجات
            </button>
            <button 
                onClick={() => setActiveTab('LOG')}
                className={`px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'LOG' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                <History size={18}/> السجل الشامل
            </button>
        </div>

        <div className="flex gap-2">
            <button 
                onClick={() => setIsImportModalOpen(true)}
                className="bg-white hover:bg-gray-50 text-gray-700 border px-3 py-2 rounded-lg flex items-center gap-2 shadow-sm text-sm font-bold"
            >
                <FileSpreadsheet size={18} />
                <span className="hidden md:inline">استيراد درجات</span>
            </button>
        </div>
      </div>

      {activeTab === 'ENTRY' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-gray-700">إضافة درجة جديدة يدوياً</h3>
                    <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded">
                        التاريخ: {formatDualDate(new Date())}
                    </span>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg mb-4 grid grid-cols-2 gap-2 border border-gray-200">
                    <div className="col-span-2 text-xs font-bold text-gray-500 flex items-center gap-1 mb-1">
                        <Filter size={12}/> تصفية قائمة الطلاب
                    </div>
                    <select className="p-1 border rounded text-xs outline-none" value={entryGrade} onChange={e => {setEntryGrade(e.target.value); setEntryClass('');}}>
                        <option value="">الصف: الكل</option>
                        {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select className="p-1 border rounded text-xs outline-none" value={entryClass} onChange={e => setEntryClass(e.target.value)}>
                        <option value="">الفصل: الكل</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">اختر الطالب ({filteredStudentsEntry.length})</label>
                    <select 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none bg-white"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    >
                    {filteredStudentsEntry.length > 0 ? filteredStudentsEntry.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.className})</option>
                    )) : <option value="">لا يوجد طلاب مطابقين للفلترة</option>}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">المادة</label>
                    <input 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="مثال: رياضيات"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تصنيف التقييم</label>
                    <select 
                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none bg-white"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as PerformanceCategory)}
                    >
                        <option value="OTHER">عام / مشاركة</option>
                        <option value="ACTIVITY">نشاط</option>
                        <option value="HOMEWORK">واجب</option>
                        <option value="PLATFORM_EXAM">اختبار منصة</option>
                    </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الدرجة (من {maxScore})</label>
                    <div className="flex gap-2">
                        <input 
                            type="number" 
                            className="w-2/3 p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none font-bold text-center"
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            required
                        />
                        <input 
                            type="number" 
                            className="w-1/3 p-2 border rounded-lg text-center bg-gray-50 text-gray-500 text-xs"
                            value={maxScore}
                            onChange={(e) => setMaxScore(e.target.value)}
                            placeholder="العظمى"
                        />
                    </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                    <textarea 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none h-20 resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={!studentId}
                    className="w-full py-3 bg-primary text-white rounded-lg hover:bg-teal-800 transition-colors font-medium flex justify-center items-center gap-2 disabled:bg-gray-300 shadow-md"
                >
                    {isSuccess ? <Check size={20} /> : null}
                    {isSuccess ? 'تمت الإضافة!' : 'تسجيل الدرجة'}
                </button>
                </form>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <FileText className="text-purple-500" />
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
                            <p className="text-sm text-gray-500 mt-1">{p.subject} - {p.title}</p>
                        </div>
                        <div className="text-left">
                            <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-sm font-bold border border-blue-100">
                            {p.score} / {p.maxScore}
                            </span>
                            <p className="text-[10px] text-gray-400 mt-1 font-mono">{formatDualDate(p.date)}</p>
                        </div>
                        </div>
                    </div>
                    );
                }) : (
                    <p className="text-gray-500 text-center py-8 border-2 border-dashed rounded-lg">لا توجد سجلات حديثة.</p>
                )}
                </div>
            </div>
          </div>
      )}

      {activeTab === 'LOG' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden animate-fade-in">
              <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-4 items-center justify-between print:hidden">
                  <div className="flex flex-wrap gap-2 text-sm items-center flex-1">
                      <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                          <Filter size={14} className="text-gray-400"/>
                          <select value={logClass} onChange={e => setLogClass(e.target.value)} className="bg-transparent outline-none font-bold text-gray-700 min-w-[100px]">
                              <option value="">جميع الفصول</option>
                              {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                          <Filter size={14} className="text-gray-400"/>
                          <select value={logSubject} onChange={e => setLogSubject(e.target.value)} className="bg-transparent outline-none font-bold text-gray-700 min-w-[100px]">
                              <option value="">جميع المواد</option>
                              {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                      <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                          <span className="text-xs text-gray-400">من:</span>
                          <input type="date" value={logDateStart} onChange={e => setLogDateStart(e.target.value)} className="outline-none bg-transparent font-bold text-xs"/>
                      </div>
                      <div className="flex items-center gap-1 bg-white border rounded-lg px-2 py-1">
                          <span className="text-xs text-gray-400">إلى:</span>
                          <input type="date" value={logDateEnd} onChange={e => setLogDateEnd(e.target.value)} className="outline-none bg-transparent font-bold text-xs"/>
                      </div>
                      <div className="relative">
                          <Search size={14} className="absolute right-2 top-2 text-gray-400"/>
                          <input type="text" placeholder="بحث..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="pl-2 pr-7 py-1 border rounded-lg outline-none text-sm w-32 focus:ring-1 focus:ring-purple-300"/>
                      </div>
                  </div>
                  
                  <div className="flex gap-2">
                      <button 
                          onClick={handleExportExcel}
                          className="bg-green-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-xs hover:bg-green-700 transition-colors shadow-sm"
                      >
                          <Download size={14}/> إكسل
                      </button>
                      <button 
                          onClick={handlePrint}
                          className="bg-gray-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-xs hover:bg-black transition-colors shadow-sm"
                      >
                          <Printer size={14}/> طباعة
                      </button>
                  </div>
              </div>

              <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-right text-sm">
                      <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0 shadow-sm">
                          <tr>
                              <th className="p-3">التاريخ</th>
                              <th className="p-3">الطالب</th>
                              <th className="p-3">الفصل</th>
                              <th className="p-3">المادة</th>
                              <th className="p-3">عنوان التقييم</th>
                              <th className="p-3 text-center">الدرجة</th>
                              <th className="p-3 text-center">التصنيف</th>
                              <th className="p-3">ملاحظات</th>
                              <th className="p-3 w-10 text-center print:hidden">حذف</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y">
                          {filteredHistory.map((p) => {
                              const student = students.find(s => s.id === p.studentId);
                              return (
                                  <tr key={p.id} className="hover:bg-gray-50">
                                      <td className="p-3 font-mono text-xs text-gray-500">{p.date}</td>
                                      <td className="p-3 font-bold text-gray-800">{student?.name}</td>
                                      <td className="p-3 text-gray-600 text-xs">{student?.className}</td>
                                      <td className="p-3 text-gray-600 text-xs">{p.subject}</td>
                                      <td className="p-3 text-gray-800 font-medium">{p.title}</td>
                                      <td className="p-3 text-center">
                                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 dir-ltr inline-block">
                                              {p.score} / {p.maxScore}
                                          </span>
                                      </td>
                                      <td className="p-3 text-center">
                                          {getCategoryBadge(p.category)}
                                      </td>
                                      <td className="p-3 text-xs text-gray-500 max-w-xs truncate" title={p.notes}>{p.notes}</td>
                                      <td className="p-3 text-center print:hidden">
                                          <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                                              <Trash2 size={16}/>
                                          </button>
                                      </td>
                                  </tr>
                              );
                          })}
                          {filteredHistory.length === 0 && (
                              <tr><td colSpan={9} className="p-12 text-center text-gray-400 font-medium">لا توجد سجلات مطابقة للفلتر</td></tr>
                          )}
                      </tbody>
                  </table>
              </div>
              <div className="p-3 bg-gray-50 border-t text-xs text-gray-500 flex justify-between font-bold print:hidden">
                  <span>عدد السجلات: {filteredHistory.length}</span>
              </div>
          </div>
      )}

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
