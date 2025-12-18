
import React, { useState, useMemo } from 'react';
import { addPerformance } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    Info, ArrowRight, UserCheck, Calculator, TrendingUp, 
    Upload, Search, Mail, FileText, ChevronDown, ChevronUp
} from 'lucide-react';
import { Student } from '../types';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showItemAnalysis, setShowItemAnalysis] = useState(true);

    // 1. معالجة رفع الملف
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setLoading(true);
        try {
            const { workbook, sheetNames } = await getWorkbookStructure(file);
            const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            setHeaders(headers);
            setFileData(data);
        } catch (error) {
            alert('فشل في قراءة ملف Excel. تأكد من صيغة الملف.');
        } finally {
            setLoading(false);
        }
    };

    // 2. تحليل مطابقة الطلاب (الأولوية للإيميل)
    const processedResults = useMemo(() => {
        if (fileData.length === 0) return [];

        // محاولة اكتشاف الأعمدة
        const emailCol = headers.find(h => h.toLowerCase().includes('email') || h.includes('البريد'));
        const nameCol = headers.find(h => h.toLowerCase().includes('name') || h.includes('الاسم'));
        const scoreCol = headers.find(h => h.toLowerCase().includes('total points') || h.includes('إجمالي النقاط'));

        return fileData.map((row) => {
            const rowEmail = emailCol ? String(row[emailCol]).trim().toLowerCase() : '';
            const rowName = nameCol ? String(row[nameCol]).trim() : '';
            const score = scoreCol ? Number(row[scoreCol]) : 0;
            const maxScore = 0; // سيتم حسابه لاحقاً أو استخراجه

            // البحث عن الطالب: إيميل أولاً، ثم اسم
            const matchedStudent = students.find(s => 
                (s.email && s.email.toLowerCase() === rowEmail) ||
                (s.name === rowName || s.name.includes(rowName) || rowName.includes(s.name))
            );

            return {
                row,
                studentName: rowName,
                email: rowEmail,
                score,
                matchedStudent
            };
        });
    }, [fileData, headers, students]);

    // 3. تحليل الفقرات (بدون ذكاء اصطناعي - إحصائي)
    const itemAnalysis = useMemo(() => {
        if (fileData.length === 0) return [];

        // استخراج أعمدة الأسئلة (عادة تبدأ بعد الأعمدة التعريفية في Forms)
        // في إكسل Forms، الأسئلة تبدأ غالباً بعد العمود الخامس وتكون متبوعة بعمود النقاط الخاص بكل سؤال
        const questionHeaders = headers.filter((h, idx) => {
            const isIdentity = ['id', 'start time', 'completion time', 'email', 'name', 'total points', 'quiz feedback'].some(term => h.toLowerCase().includes(term));
            const isPointCol = h.toLowerCase().includes('points -');
            return !isIdentity && !isPointCol;
        });

        return questionHeaders.map(q => {
            const pointCol = headers.find(h => h.toLowerCase() === `points - ${q.toLowerCase()}` || h.includes(`نقاط - ${q}`));
            
            let totalPointsObtained = 0;
            let correctCount = 0;
            let responsesCount = 0;

            fileData.forEach(row => {
                if (row[q] !== undefined) {
                    responsesCount++;
                    if (pointCol) {
                        const pts = Number(row[pointCol]);
                        totalPointsObtained += pts;
                        if (pts > 0) correctCount++;
                    }
                }
            });

            const successRate = responsesCount > 0 ? Math.round((correctCount / responsesCount) * 100) : 0;

            return {
                question: q,
                successRate,
                responsesCount,
                difficulty: successRate < 50 ? 'صعب' : successRate < 80 ? 'متوسط' : 'سهل'
            };
        });
    }, [fileData, headers]);

    const stats = useMemo(() => {
        if (processedResults.length === 0) return null;
        const total = processedResults.length;
        const avg = Math.round(processedResults.reduce((acc, curr) => acc + curr.score, 0) / total);
        const matched = processedResults.filter(r => r.matchedStudent).length;
        return { total, avg, matched };
    }, [processedResults]);

    const handleSyncGrades = () => {
        const recordsToSave = processedResults
            .filter(r => r.matchedStudent)
            .map(res => ({
                id: `forms_${Date.now()}_${res.matchedStudent!.id}`,
                studentId: res.matchedStudent!.id,
                subject: 'عام',
                title: 'اختبار Microsoft Forms',
                score: res.score,
                maxScore: itemAnalysis.length, // افتراضياً عدد الأسئلة
                date: new Date().toISOString().split('T')[0],
                createdById: currentUserId,
                category: 'PLATFORM_EXAM'
            }));

        if (recordsToSave.length === 0) return alert('لم يتم العثور على طلاب مطابقين لرصدهم.');
        
        setIsSaving(true);
        setTimeout(() => {
            addPerformance(recordsToSave as any);
            setIsSaving(false);
            alert(`تم بنجاح رصد درجات ${recordsToSave.length} طالب مطابق.`);
            setFileData([]);
        }, 800);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600"/> مستورد Microsoft Forms المتطور
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">قم برفع ملف Excel المستخرج من Forms للتحليل والرصد الفوري.</p>
                </div>
                {fileData.length > 0 && (
                    <button onClick={() => setFileData([])} className="text-xs font-bold text-red-500 hover:underline">إلغاء وتحميل ملف آخر</button>
                )}
            </div>

            {fileData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                    <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6">
                        <Upload size={48}/>
                    </div>
                    <h3 className="text-xl font-black text-gray-800 mb-2">ارفع ملف النتائج (Excel)</h3>
                    <p className="text-gray-400 max-w-sm mb-8 leading-relaxed">
                        افتح اختبارك في Microsoft Forms، اختر "الاستجابات"، ثم "فتح في Excel"، وارفع الملف هنا.
                    </p>
                    <input 
                        type="file" 
                        id="forms-upload" 
                        className="hidden" 
                        accept=".xlsx, .xls" 
                        onChange={handleFileUpload}
                    />
                    <label 
                        htmlFor="forms-upload"
                        className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-green-100 hover:bg-green-700 cursor-pointer transition-all active:scale-95"
                    >
                        {loading ? 'جاري القراءة...' : 'اختيار ملف Excel'}
                    </label>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden flex flex-col gap-6">
                    {/* إحصائيات عامة */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0">
                        <StatBox icon={<Calculator className="text-green-600"/>} label="متوسط الدرجات" value={stats?.avg} color="bg-green-50" />
                        <StatBox icon={<UserCheck className="text-blue-600"/>} label="طلاب تم مطابقتهم" value={`${stats?.matched} من ${stats?.total}`} color="bg-blue-50" />
                        <StatBox icon={<FileText className="text-purple-600"/>} label="عدد الأسئلة" value={itemAnalysis.length} color="bg-purple-50" />
                    </div>

                    <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-hidden">
                        {/* جدول الطلاب */}
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={18}/> حالة مطابقة الطلاب</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar border rounded-2xl">
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-gray-50 font-bold sticky top-0 border-b">
                                        <tr>
                                            <th className="p-3">الاسم / البريد في Forms</th>
                                            <th className="p-3">المطابق في السجل</th>
                                            <th className="p-3 text-center">الدرجة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {processedResults.map((r, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-3">
                                                    <div className="font-bold text-gray-800">{r.studentName || 'بدون اسم'}</div>
                                                    <div className="text-[10px] text-gray-400">{r.email}</div>
                                                </td>
                                                <td className="p-3">
                                                    {r.matchedStudent ? (
                                                        <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={10}/> {r.matchedStudent.name}</span>
                                                    ) : (
                                                        <span className="text-red-400 flex items-center gap-1 font-bold"><AlertCircle size={10}/> غير مطابق</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-black text-indigo-600">{r.score}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button 
                                onClick={handleSyncGrades}
                                disabled={isSaving || stats?.matched === 0}
                                className="mt-4 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                            >
                                {isSaving ? <Loader2 className="animate-spin"/> : <BarChart size={18}/>}
                                رصد الدرجات لـ ({stats?.matched}) طالب
                            </button>
                        </div>

                        {/* تحليل الفقرات */}
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2"><TrendingUp size={18} className="text-orange-500"/> تحليل فقرات الاختبار</h3>
                                <button onClick={() => setShowItemAnalysis(!showItemAnalysis)} className="text-gray-400">
                                    {showItemAnalysis ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                </button>
                            </div>
                            
                            {showItemAnalysis && (
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {itemAnalysis.map((item, idx) => (
                                        <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-orange-200 transition-all">
                                            <div className="flex justify-between items-start gap-4 mb-3">
                                                <p className="text-xs font-bold text-gray-700 leading-relaxed flex-1">
                                                    <span className="text-orange-500 ml-1">{idx+1}.</span> {item.question}
                                                </p>
                                                <span className={`text-[10px] px-2 py-1 rounded-lg font-black uppercase tracking-tighter ${
                                                    item.difficulty === 'صعب' ? 'bg-red-100 text-red-600' : 
                                                    item.difficulty === 'متوسط' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                                                }`}>
                                                    {item.difficulty}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full transition-all duration-1000 ${
                                                            item.successRate < 50 ? 'bg-red-500' : item.successRate < 80 ? 'bg-orange-500' : 'bg-green-500'
                                                        }`}
                                                        style={{ width: `${item.successRate}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-black text-gray-600">{item.successRate}% إتقان</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            {!showItemAnalysis && (
                                <div className="flex-1 flex items-center justify-center text-gray-300 italic text-sm">
                                    انقر على السهم لعرض تحليل الأسئلة
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatBox = ({ icon, label, value, color }: any) => (
    <div className={`${color} p-6 rounded-3xl border border-white flex items-center justify-between shadow-sm`}>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <h4 className="text-3xl font-black text-gray-800">{value}</h4>
        </div>
        <div className="p-4 bg-white/50 rounded-2xl">{icon}</div>
    </div>
);

export default FormsAnalyzer;
