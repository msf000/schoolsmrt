
import React, { useState, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, AcademicTerm, SystemUser } from '../types';
import { generateStudentAnalysis } from '../services/geminiService';
import { getAcademicTerms } from '../services/storageService';
import { 
    Sparkles, Bot, Loader2, Search, FileText, Printer, ChevronLeft, Target
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
  const [searchTerm, setSearchTerm] = useState('');

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
    <div className="space-y-6 page-enter font-tajawal h-full flex flex-col overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">مركز التقارير الذكي</h1>
            <p className="text-slate-500 text-sm">تحليل شامل ومؤتمت لمستوى الطلاب عبر Gemini AI.</p>
        </div>
        {report && (
            <button onClick={() => window.print()} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-sm flex items-center gap-2">
                <Printer size={16} /> طباعة التقرير
            </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0 overflow-hidden">
        {/* Selection Column */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
                    <input 
                        className="w-full pr-9 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-500" 
                        placeholder="ابحث عن طالب..." 
                        value={searchTerm} 
                        onChange={e=>setSearchTerm(e.target.value)} 
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                {filteredStudents.map(s => (
                    <button 
                        key={s.id} 
                        onClick={() => handleGenerate(s.id)}
                        className={`w-full text-right p-3 rounded-xl text-xs font-bold transition-all flex justify-between items-center ${selectedStudentId === s.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span>{s.name}</span>
                        {selectedStudentId === s.id && <ChevronLeft size={14}/>}
                    </button>
                ))}
            </div>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative">
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-brand-500" size={32}/>
                    <p className="text-slate-500 font-bold">جاري تحليل البيانات وصياغة التقرير...</p>
                </div>
            ) : report ? (
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar print:p-0">
                    <div className="max-w-3xl mx-auto prose prose-slate prose-sm leading-relaxed">
                        <ReactMarkdown>{report}</ReactMarkdown>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                    <Bot size={64} className="mb-4" />
                    <p className="font-bold text-lg">اختر طالباً للبدء بالتحليل الذكي</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AIReports;
