import React, { useState } from 'react';
import { Student, AttendanceRecord, PerformanceRecord } from '../types';
import { generateStudentAnalysis } from '../services/geminiService';
import { Sparkles, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; // Actually we will just display raw text or simple format since we didn't include markdown lib in requirements, so standard display

interface AIReportsProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
}

const AIReports: React.FC<AIReportsProps> = ({ students, attendance, performance }) => {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedStudentId) return;
    
    setLoading(true);
    setReport(null);
    const student = students.find(s => s.id === selectedStudentId);
    if (student) {
        const result = await generateStudentAnalysis(student, attendance, performance);
        setReport(result);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Sparkles className="text-purple-600" />
            تحليل الذكاء الاصطناعي
        </h2>
        <p className="text-gray-500 mt-2">
            استخدم الذكاء الاصطناعي لإنشاء تقارير فورية عن أداء الطلاب وسلوكهم.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">اختر الطالب للتحليل</label>
            <select 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500/50 outline-none bg-white mb-4"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
            >
                <option value="">-- اختر --</option>
                {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
            
            <button
                onClick={handleGenerate}
                disabled={!selectedStudentId || loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg transition-colors font-medium flex justify-center items-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Bot />}
                {loading ? 'جاري التحليل...' : 'إنشاء التقرير'}
            </button>
        </div>

        <div className="w-full md:w-2/3">
            {report ? (
                <div className="bg-white p-8 rounded-xl shadow-md border border-purple-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-r from-purple-500 to-blue-500"></div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Bot className="text-purple-600" size={24} />
                        تقرير الأداء
                    </h3>
                    <div className="prose prose-purple max-w-none text-gray-700 leading-relaxed whitespace-pre-line">
                        {report}
                    </div>
                </div>
            ) : (
                <div className="h-64 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
                    <Bot size={48} className="mb-4 opacity-50" />
                    <p>اختر طالباً واضغط على زر التحليل لمشاهدة النتائج</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AIReports;