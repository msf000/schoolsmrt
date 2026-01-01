
import React, { useState, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, SystemUser } from '../types';
import { generateStudentAnalysis } from '../services/geminiService';
import { getAcademicTerms } from '../services/storageService';
import { Sparkles, Bot, Loader2, Calendar, User, Layout, ArrowRight } from 'lucide-react';
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

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">تحليل الأداء الذكي (AI)</h2>
            <p className="text-slate-500 text-sm">تقارير تشخيصية وتوصيات تربوية مدعومة بذكاء Gemini.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
        <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">الفترة الزمنية</label>
                    <select className="w-full p-2.5 border rounded-lg bg-slate-50 text-sm font-bold outline-none" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                        <option value="">كل الفترات</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">اسم الطالب</label>
                    <select className="w-full p-2.5 border rounded-lg bg-slate-50 text-sm font-bold outline-none" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                        <option value="">-- اختر طالباً --</option>
                        {students.sort((a,b)=>a.name.localeCompare(b.name, 'ar')).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <button onClick={handleGenerate} disabled={!selectedStudentId || loading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-sm flex justify-center items-center gap-2 hover:bg-blue-700 disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>} إنشاء التقرير
                </button>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
                <Bot className="text-blue-600 shrink-0" size={20}/>
                <p className="text-[11px] text-blue-800 leading-relaxed font-medium">يقوم النظام بتحليل سجلات الحضور والدرجات لاستنتاج نقاط القوة والضعف للطالب آلياً.</p>
            </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center shrink-0">
                <span className="font-bold text-slate-700 text-sm">معاينة التقرير التشخيصي</span>
                {report && <button onClick={() => window.print()} className="text-[10px] font-bold text-blue-600 hover:underline">طباعة التقرير</button>}
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {report ? (
                    <div className="prose prose-slate max-w-none prose-sm leading-relaxed text-slate-700">
                        <ReactMarkdown>{report}</ReactMarkdown>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 py-20">
                        <Layout size={64}/>
                        <p className="mt-4 font-bold">حدد الطالب واضغط "إنشاء" لبدء التحليل.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AIReports;
