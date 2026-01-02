
import React, { useState, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, SystemUser } from '../types';
import { generateStudentAnalysis } from '../services/geminiService';
import { getAcademicTerms } from '../services/storageService';
// Added missing 'Info' icon import
import { Sparkles, Bot, Loader2, Calendar, User, Layout, ArrowRight, BrainCircuit, FileText, Printer, Search, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; 

interface AIReportsProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
}

const AIReports: React.FC<AIReportsProps> = ({ students, attendance, performance, currentUser }) => {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
      const loadedTerms = getAcademicTerms(currentUser?.id);
      setTerms(loadedTerms);
      const current = loadedTerms.find((t: AcademicTerm) => t.isCurrent);
      if (current) setSelectedTermId(current.id);
  }, [currentUser]);

  const handleGenerate = async () => {
    if (!selectedStudentId) return;
    setLoading(true); setReport(null);
    const student = students.find(s => s.id === selectedStudentId);
    if (student) {
        const result = await generateStudentAnalysis(student, attendance, performance);
        setReport(result);
    }
    setLoading(false);
  };

  const filteredStudents = students.filter(s => s.name.includes(searchTerm)).sort((a,b) => a.name.localeCompare(b.name, 'ar'));

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 animate-fade-in font-tajawal overflow-hidden">
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-8 shrink-0">
          <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-700 rounded-xl flex items-center justify-center text-white shadow-sm">
                  <BrainCircuit size={24}/>
              </div>
              <div>
                  <h2 className="text-xl font-bold text-slate-800">مركز التشخيص الذكي</h2>
                  <p className="text-xs text-slate-500 font-medium">تقارير تشخيصية مدعومة بمحرك Gemini AI</p>
              </div>
          </div>
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-xs font-bold border border-blue-100 flex items-center gap-2">
              <Bot size={18}/> حالة المحلل: <span className="uppercase text-blue-800">نشط سحابياً</span>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
        <div className="lg:col-span-1 flex flex-col gap-4 overflow-hidden">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-5">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mr-1">الفترة الزمنية للتحليل</label>
                    <select className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-xs font-bold outline-none" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                        <option value="">كل السجلات</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mr-1">البحث عن طالب</label>
                    <div className="relative mb-2">
                        <Search className="absolute right-2.5 top-2.5 text-slate-300" size={14}/>
                        <input className="w-full pr-8 pl-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-xs font-bold outline-none" placeholder="اكتب الاسم..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar border rounded-lg p-1 bg-slate-50 space-y-1">
                        {filteredStudents.map(s => (
                            <button key={s.id} onClick={() => setSelectedStudentId(s.id)} className={`w-full text-right p-2 rounded text-[11px] font-bold transition-all ${selectedStudentId === s.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-indigo-600'}`}>
                                {s.name}
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={handleGenerate} disabled={!selectedStudentId || loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md flex justify-center items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} إنشاء التقرير التشخيصي
                </button>
            </div>
            
            <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs"><Info size={16}/> ملاحظة مهنية:</div>
                <p className="text-[10px] text-indigo-800 leading-relaxed font-medium">يقوم النظام بتحليل العلاقة السببية بين (الحضور، السلوك، الدرجات) لاستنتاج التوصيات التربوية المخصصة لكل طالب.</p>
            </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
            <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center shrink-0">
                <span className="font-bold text-slate-700 text-sm flex items-center gap-2"><FileText size={18} className="text-blue-600"/> معاينة مخرجات Gemini AI</span>
                {report && (
                    <button onClick={() => window.print()} className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"><Printer size={14}/> طباعة</button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative">
                {report ? (
                    <div className="prose prose-slate max-w-none prose-sm leading-relaxed text-slate-700 animate-fade-in font-medium">
                        <ReactMarkdown>{report}</ReactMarkdown>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-30 py-20 gap-6">
                        <Bot size={120} strokeWidth={1}/>
                        <p className="text-2xl font-bold text-center">المحلل جاهز، اختر طالباً <br/> واضغط على "إنشاء التقرير" لبدء التشخيص</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIReports;
