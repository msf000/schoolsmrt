
import React, { useState } from 'react';
import { parseRawDataWithAI } from '../services/geminiService';
import { Sparkles, ArrowRight, Save, Trash2, Copy, CheckCircle, AlertTriangle, FileText, Loader2, Database, Download } from 'lucide-react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus } from '../types';
import * as XLSX from 'xlsx';

interface AIDataImportProps {
    onImportStudents: (students: Student[]) => void;
    onImportPerformance: (records: PerformanceRecord[]) => void;
    onImportAttendance: (records: AttendanceRecord[]) => void;
}

const AIDataImport: React.FC<AIDataImportProps> = ({ onImportStudents, onImportPerformance, onImportAttendance }) => {
    const [rawText, setRawText] = useState('');
    const [importType, setImportType] = useState<'STUDENTS' | 'GRADES' | 'ATTENDANCE'>('STUDENTS');
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'INPUT' | 'PREVIEW'>('INPUT');
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleAnalyze = async () => {
        if (!rawText.trim()) return;
        setLoading(true);
        setStatus(null);
        try {
            const data = await parseRawDataWithAI(rawText, importType);
            if (Array.isArray(data) && data.length > 0) {
                setParsedData(data);
                setStep('PREVIEW');
            } else {
                setStatus({ type: 'error', message: 'لم يتم العثور على بيانات واضحة في النص. حاول تنسيق النص بشكل أفضل.' });
            }
        } catch (e: any) {
            setStatus({ type: 'error', message: e.message || 'حدث خطأ أثناء التحليل.' });
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (parsedData.length === 0) return;
        
        const ws = XLSX.utils.json_to_sheet(parsedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "البيانات_المستخرجة");
        
        const fileName = `extracted_data_${importType}_${new Date().getTime()}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        setStatus({ type: 'success', message: 'تم تحميل ملف Excel بنجاح!' });
        setTimeout(() => setStatus(null), 3000);
    };

    const handleSave = () => {
        if (parsedData.length === 0) return;
        
        try {
            if (importType === 'STUDENTS') {
                const students: Student[] = parsedData.map(d => ({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    name: d.name || 'طالب مجهول',
                    nationalId: d.nationalId,
                    gradeLevel: d.gradeLevel,
                    phone: d.phone,
                    email: d.email,
                    className: d.gradeLevel // Fallback
                }));
                onImportStudents(students);
            } else if (importType === 'GRADES') {
                const records: PerformanceRecord[] = parsedData.map(d => ({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    studentId: 'PENDING_MATCH', // Needs matching logic or name matching in backend
                    studentName: d.studentName, // Temporary field for matching
                    subject: d.subject || 'عام',
                    title: d.title || 'تقييم',
                    score: Number(d.score),
                    maxScore: Number(d.maxScore) || 10,
                    date: new Date().toISOString().split('T')[0],
                    category: 'OTHER'
                } as any));
                onImportPerformance(records);
            } else if (importType === 'ATTENDANCE') {
                const records: AttendanceRecord[] = parsedData.map(d => ({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    studentId: 'PENDING_MATCH',
                    studentName: d.studentName,
                    date: d.date || new Date().toISOString().split('T')[0],
                    status: d.status === 'ABSENT' ? AttendanceStatus.ABSENT : d.status === 'LATE' ? AttendanceStatus.LATE : AttendanceStatus.PRESENT
                } as any));
                onImportAttendance(records);
            }
            
            setStatus({ type: 'success', message: `تم استيراد ${parsedData.length} سجل بنجاح وحفظها في النظام!` });
            setTimeout(() => {
                setStep('INPUT');
                setParsedData([]);
                setRawText('');
                setStatus(null);
            }, 2000);
        } catch (e) {
            setStatus({ type: 'error', message: 'فشل الحفظ. تأكد من صحة البيانات.' });
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setRawText(text);
        } catch (e) {
            console.error('Clipboard access denied', e);
            setStatus({ type: 'error', message: 'تعذر الوصول للحافظة تلقائياً. يرجى استخدام (Ctrl+V) للصق النص يدوياً.' });
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto h-full flex flex-col animate-fade-in bg-gray-50">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles className="text-purple-600" />
                    استيراد البيانات الذكي (AI)
                </h2>
                <p className="text-gray-500 mt-2">
                    ألصق أي نص عشوائي (من رسائل واتساب، بريد إلكتروني، ملفات PDF منسوخة) وسيقوم النظام باستخراج البيانات منه، ثم يمكنك حفظها أو تصديرها كـ Excel.
                </p>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                {/* Header Controls */}
                <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                        <button 
                            onClick={() => setImportType('STUDENTS')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${importType === 'STUDENTS' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            بيانات طلاب
                        </button>
                        <button 
                            onClick={() => setImportType('GRADES')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${importType === 'GRADES' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            درجات و تقييم
                        </button>
                        <button 
                            onClick={() => setImportType('ATTENDANCE')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${importType === 'ATTENDANCE' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            حضور وغياب
                        </button>
                    </div>

                    {step === 'INPUT' && (
                        <button onClick={handlePaste} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-purple-600 bg-white border px-3 py-2 rounded-lg hover:shadow-sm">
                            <Copy size={16}/> لصق من الحافظة
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-hidden flex flex-col">
                    {step === 'INPUT' ? (
                        <div className="flex-1 flex flex-col">
                            <label className="block text-sm font-bold text-gray-700 mb-2">النص العشوائي:</label>
                            <textarea 
                                className="flex-1 w-full p-4 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none resize-none font-mono text-sm leading-relaxed"
                                placeholder={`ألصق النص هنا... مثال:
"الطالب أحمد محمد - الصف الأول - غائب
الطالبة سارة علي - الصف الأول - حاضرة
محمد علي: 15 درجة في الرياضيات"`}
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                            />
                            
                            <div className="mt-4 flex justify-end">
                                <button 
                                    onClick={handleAnalyze}
                                    disabled={loading || !rawText.trim()}
                                    className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black disabled:opacity-50 shadow-lg transition-all"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
                                    {loading ? 'جاري تحليل النص...' : 'تحليل واستخراج البيانات'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                    <Database className="text-purple-600"/> البيانات المستخرجة ({parsedData.length})
                                </h3>
                                <button onClick={() => setStep('INPUT')} className="text-sm text-gray-500 hover:text-gray-800 underline">
                                    عودة للتعديل
                                </button>
                            </div>

                            <div className="flex-1 overflow-auto border rounded-xl bg-gray-50 custom-scrollbar">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0 shadow-sm">
                                        <tr>
                                            <th className="p-3 w-10">#</th>
                                            {parsedData.length > 0 && Object.keys(parsedData[0]).map(k => (
                                                <th key={k} className="p-3 capitalize">{k}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {parsedData.map((row, i) => (
                                            <tr key={i} className="hover:bg-white transition-colors">
                                                <td className="p-3 text-center text-gray-400">{i + 1}</td>
                                                {Object.values(row).map((val: any, j) => (
                                                    <td key={j} className="p-3 text-gray-700">{String(val)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex flex-col md:flex-row justify-end gap-3">
                                <button onClick={handleExportExcel} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-md">
                                    <Download size={18}/> تصدير Excel
                                </button>
                                <button onClick={handleSave} className="bg-purple-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center justify-center gap-2 shadow-md">
                                    <CheckCircle size={18}/> حفظ في النظام
                                </button>
                                <button onClick={() => setStep('INPUT')} className="px-6 py-2 border border-gray-300 rounded-lg text-gray-600 font-bold hover:bg-gray-50">
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {status && (
                <div className={`fixed bottom-6 left-6 right-6 md:right-auto md:w-96 p-4 rounded-xl shadow-2xl border flex items-center gap-3 z-50 animate-bounce-in ${status.type === 'success' ? 'bg-green-600 text-white border-green-700' : 'bg-red-600 text-white border-red-700'}`}>
                    {status.type === 'success' ? <CheckCircle size={24}/> : <AlertTriangle size={24}/>}
                    <div>
                        <h4 className="font-bold">{status.type === 'success' ? 'تمت العملية' : 'تنبيه'}</h4>
                        <p className="text-sm opacity-90">{status.message}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AIDataImport;
