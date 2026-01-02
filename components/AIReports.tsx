
import React, { useState, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, SystemUser } from '../types';
import { generateStudentAnalysis } from '../services/geminiService';
import { getAcademicTerms } from '../services/storageService';
import { 
    Sparkles, Bot, Loader2, Calendar, User, Layout, ArrowRight, BrainCircuit, 
    FileText, Printer, Search, Info, ShieldCheck, Zap, ChevronLeft, Target, Award, X
} from 'lucide-react';
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

  const handleGenerate = async (sid?: string) => {
    const id = sid || selectedStudentId;
    if (!id) return;
    setLoading(true); setReport(null);
    setSelectedStudentId(id);
    const student = students.find(s => s.id === id);
    if (student) {
        const result = await generateStudentAnalysis(student, attendance, performance);
        setReport(result);
    }
    setLoading(false);
  };

  const filteredStudents = students.filter(s => s.name.includes(searchTerm)).sort((a,b) => a.name.localeCompare(b.name, 'ar'));

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in font-tajawal pb-24 lg:pb-10 h-full flex flex-col overflow-hidden">
      {/* Premium Header */}
      <div className="bg-white p-6 lg:p-10 rounded-[2.5rem] lg:rounded-[3.5rem] border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 lg:gap-8 relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-full bg-slate-900/5 -skew-x-12 translate-x-16"></div>
          <div className="flex items-center gap-4 lg:gap-8 relative z-10 w-full lg:w-auto">
              <div className="w-14 h-14 lg:w-20 lg:h-20 bg-slate-900 text-white rounded-2xl lg:rounded-[2.5rem] flex items-center justify-center shadow-xl shrink-0">
                  <BrainCircuit size={32} />
              </div>
              <div>
                  <h2 className="text-2xl lg:text-3xl font-black text-slate-800">مركز التشخيص الأكاديمي</h2>
                  <p className="text-slate-400 font-bold uppercase text-[9px] lg:text-[10px] tracking-widest mt-1">Official Diagnostic Report Center</p>
              </div>
          </div>
          <div className="flex items-center gap-3 relative z-10 bg-indigo-50 px-6 py-2.5 rounded-full border border-indigo-100">
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-indigo-500 uppercase">حالة الملحق الذكي:</span>
                <span className="text-[11px] font-black text-indigo-900">نشط سحابياً (Gemini Engine)</span>
             </div>
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-10 flex-1 min-h-0 overflow-hidden">
        {/* Selection Sidebar (Hidden on mobile when report is open) */}
        <div className={`lg:col-span-1 bg-white p-6 lg:p-8 rounded-[2.5rem] lg:rounded-[3rem] border shadow-sm flex flex-col gap-6 lg:gap-8 overflow-hidden animate-slide-up ${report ? 'hidden lg:flex' : 'flex'}`}>
            <div className="space-y-6 flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">النطاق الزمني</label>
                    <select className="w-full p-3.5 border rounded-2xl bg-slate-50 font-black text-xs outline-none" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                        <option value="">كل السجلات السحابية</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                
                <div className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">البحث عن طالب</label>
                    <div className="relative shrink-0">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                        <input className="w-full pr-12 pl-4 py-3.5 border-2 border-transparent focus:border-indigo-500 rounded-2xl bg-slate-50 font-black text-xs outline-none focus:bg-white transition-all shadow-inner" placeholder="الاسم الكامل..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-3xl p-2 bg-slate-50/50 space-y-1">
                        {filteredStudents.map(s => (
                            <button key={s.id} onClick={() => {setSelectedStudentId(s.id); setReport(null);}} className={`w-full text-right p-4 rounded-2xl text-[11px] font-black transition-all flex justify-between items-center group ${selectedStudentId === s.id ? 'bg-indigo-600 text-white shadow-xl translate-x-[-4px]' : 'text-slate-600 hover:bg-white hover:text-indigo-600'}`}>
                                <span>{s.name.split(' ')[0]} {s.name.split(' ')[1]}</span>
                                {selectedStudentId === s.id && <ChevronLeft size={16}/>}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <button onClick={() => handleGenerate()} disabled={!selectedStudentId || loading} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-sm shadow-2xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-3">
                {loading ? <Loader2 className="animate-spin" size={20}/> : <Sparkles size={20}/>}
                {loading ? 'جاري التحليل...' : 'إصدار التقرير التشخيصي'}
            </button>
        </div>

        {/* Report Preview / Result Area */}
        <div className={`lg:col-span-3 bg-white rounded-[2.5rem] lg:rounded-[4rem] border shadow-sm flex flex-col overflow-hidden relative group animate-slide-up ${!report && !loading ? 'hidden lg:flex' : 'flex'}`}>
            {report ? (
                <>
                    <div className="p-6 lg:p-8 border-b bg-slate-50/50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setReport(null)} className="lg:hidden p-2.5 bg-white rounded-xl shadow-sm"><ArrowRight size={20}/></button>
                            <div className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600"><FileText size={20}/></div>
                            <span className="font-black text-slate-800 text-sm lg:text-base">معاينة التقرير الرسمي</span>
                        </div>
                        <button onClick={() => window.print()} className="px-6 lg:px-8 py-2.5 bg-slate-900 text-white rounded-xl lg:rounded-2xl text-[11px] font-black flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl">
                            <Printer size={16}/> <span className="hidden sm:inline">طباعة (PDF)</span><span className="sm:hidden">طباعة</span>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar bg-white relative print:p-0 print:overflow-visible">
                        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
                            {/* Official Print Header */}
                            <div className="hidden print:flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-10">
                                <div className="text-right text-[10px] font-black space-y-1">
                                    <p>المملكة العربية السعودية</p>
                                    <p>وزارة التعليم</p>
                                    <p>مركز التحليل الأكاديمي الموحد</p>
                                </div>
                                <div className="text-center flex flex-col items-center">
                                    <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-16 mb-4 opacity-80" alt="Moe"/>
                                    <h1 className="text-2xl font-black text-slate-900">تقرير تشخيصي لنواتج التعلم</h1>
                                </div>
                                <div className="text-left text-[10px] font-black space-y-1">
                                    <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                                    <p>الرقم: AI-{Date.now().toString().slice(-8)}</p>
                                </div>
                            </div>

                            <div className="prose prose-indigo max-w-none text-slate-700 leading-relaxed font-medium text-lg lg:text-xl">
                                <ReactMarkdown>{report}</ReactMarkdown>
                            </div>

                            <div className="mt-20 pt-10 border-t-2 border-dotted border-slate-100 flex justify-between items-end">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">ختم المركز الذكي</p>
                                    <div className="w-20 h-20 border-4 border-slate-100 rounded-full flex items-center justify-center opacity-20 mx-auto">
                                        <ShieldCheck size={40} className="text-indigo-400"/>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">المحلل التربوي</p>
                                    <p className="font-black text-slate-900 border-t-2 border-slate-900 pt-2 px-10">Gemini Pro 2.5</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 p-10 text-center">
                    <div className="relative">
                        <div className="w-24 h-24 lg:w-32 lg:h-32 bg-indigo-50 rounded-[2rem] lg:rounded-[3rem] flex items-center justify-center text-indigo-600 animate-pulse">
                            <Bot size={48}/>
                        </div>
                        <div className="absolute inset-0 rounded-[3rem] animate-ping bg-indigo-600/10"></div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">جاري صياغة التقرير...</h3>
                        <p className="text-slate-400 font-bold mt-2 max-w-sm">يقوم Gemini الآن بتحليل مئات السجلات الأكاديمية والسلوكية لاستنتاج الرؤى التربوية.</p>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-200 gap-8 py-32 opacity-20 px-10 text-center">
                    <Bot size={150} strokeWidth={1} />
                    <div className="max-w-sm">
                        <h3 className="text-3xl font-black mb-4">المحلل بانتظار الطالب</h3>
                        <p className="text-lg font-bold">اختر طالباً من القائمة واضغط على "إصدار التقرير" لفك تشفير بياناته الأكاديمية.</p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AIReports;
