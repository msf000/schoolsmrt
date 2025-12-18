
import React, { useState, useMemo, useEffect } from 'react';
import { addPerformance, saveFormsDetailedResult, getFormsDetailedResults, saveQuestionToBank } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    ArrowRight, UserCheck, TrendingUp, 
    Upload, ChevronDown, ChevronUp,
    ListFilter, Target, History, BrainCircuit, Save, X, Search, Database, LayoutPanelLeft, ArrowLeft, Users, FileText
} from 'lucide-react';
import { Student, FormsDetailedResult, FormsQuestionAnalysis, Question } from '../types';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [viewMode, setViewMode] = useState<'IMPORT' | 'HISTORY'>('IMPORT');
    const [selectedRecord, setSelectedRecord] = useState<FormsDetailedResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
    const [examTitle, setExamTitle] = useState('');
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, string>>({});

    useEffect(() => {
        if (currentUserId) {
            setHistory(getFormsDetailedResults(currentUserId));
        }
    }, [currentUserId, isSaving, viewMode]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setLoading(true);
        try {
            const { workbook, sheetNames } = await getWorkbookStructure(file);
            const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            setHeaders(headers);
            setFileData(data);
            setExamTitle(file.name.replace(/\.[^/.]+$/, ""));
        } catch (error) {
            alert('فشل في قراءة ملف Excel.');
        } finally {
            setLoading(false);
        }
    };

    const processedResults = useMemo(() => {
        if (fileData.length === 0) return [];
        const emailCol = headers.find(h => h.toLowerCase().includes('email') || h.includes('البريد'));
        const nameCol = headers.find(h => h.toLowerCase().includes('name') || h.includes('الاسم'));
        const scoreCol = headers.find(h => h.toLowerCase().includes('total points') || h.includes('إجمالي النقاط'));

        return fileData.map((row) => {
            const rowEmail = emailCol ? String(row[emailCol] || '').trim().toLowerCase() : '';
            const rowName = nameCol ? String(row[nameCol] || '').trim() : '';
            const score = scoreCol ? Number(row[scoreCol]) : 0;

            const matchedStudent = students.find(s => 
                (s.email && s.email.toLowerCase() === rowEmail) ||
                (s.name === rowName || s.name.includes(rowName) || rowName.includes(s.name))
            );

            return { row, studentName: rowName, email: rowEmail, score, matchedStudent };
        });
    }, [fileData, headers, students]);

    const itemAnalysis = useMemo(() => {
        if (fileData.length === 0) return [];
        const blacklist = ['اسمك', 'الاسم', 'فصلك', 'الفصل', 'الرباعي', 'الكامل', 'الهوية', 'الرقم', 'name', 'class', 'identity', 'email', 'البريد', 'id', 'start', 'completion', 'time'];

        const pointHeaders = headers.filter(h => {
            const isPointCol = h.startsWith('النقاط -') || h.startsWith('Points -') || h.includes('نقاط -');
            if (!isPointCol) return false;
            const cleanText = h.replace(/^النقاط - /, '').replace(/^Points - /, '').replace(/^نقاط - /, '').trim();
            return !blacklist.some(word => cleanText.toLowerCase().includes(word));
        });

        return pointHeaders.map(pointCol => {
            let questionTitle = pointCol.replace(/^النقاط - /, '').replace(/^Points - /, '').replace(/^نقاط - /, '').trim();
            questionTitle = questionTitle.replace(/^س\d+[:\-\s]*/, '').trim();

            const answerCol = headers.find(h => h === questionTitle) || headers[headers.indexOf(pointCol) - 1];
            let correctCount = 0;
            let responsesCount = 0;
            const errorPatterns: Record<string, number> = {};

            fileData.forEach(row => {
                const pts = Number(row[pointCol]);
                const ans = String(row[answerCol] || '-');
                responsesCount++;
                if (pts > 0) correctCount++;
                else if (ans !== '-' && ans !== 'لم يجب') errorPatterns[ans] = (errorPatterns[ans] || 0) + 1;
            });

            return {
                id: pointCol,
                question: questionTitle,
                answerColumn: answerCol,
                successRate: responsesCount > 0 ? Math.round((correctCount / responsesCount) * 100) : 0,
                responsesCount,
                correctCount,
                difficulty: (correctCount/responsesCount < 0.5 ? 'HARD' : correctCount/responsesCount < 0.75 ? 'MEDIUM' : 'EASY') as any,
                commonErrors: Object.entries(errorPatterns).sort((a, b) => b[1] - a[1]).slice(0, 3)
            };
        });
    }, [fileData, headers]);

    const handleFinalSave = () => {
        if (!examTitle || !currentUserId) return alert('بيانات ناقصة.');
        setIsSaving(true);
        try {
            const studentResponses: Record<string, any> = {};
            processedResults.forEach(res => {
                if (res.matchedStudent) {
                    const answers: Record<string, string> = {};
                    itemAnalysis.forEach(q => {
                        answers[q.question] = String(res.row[q.answerColumn] || '-');
                    });
                    studentResponses[res.matchedStudent.id] = { score: res.score, total: itemAnalysis.length, answers };
                }
            });

            const questions: FormsQuestionAnalysis[] = itemAnalysis.map(q => ({
                id: q.id,
                text: q.question,
                learningOutcome: outcomesMapping[q.id] || 'مهارة غير محددة',
                successRate: q.successRate,
                difficulty: q.difficulty,
                commonErrors: q.commonErrors
            }));

            const record: FormsDetailedResult = {
                id: `forms_${Date.now()}`,
                examTitle,
                className: processedResults[0]?.matchedStudent?.className || 'عام',
                date: new Date().toISOString(),
                teacherId: currentUserId,
                questions,
                studentResponses
            };

            saveFormsDetailedResult(record);
            const perfRecords = Object.entries(studentResponses).map(([sid, data]) => ({
                id: `p_forms_${record.id}_${sid}`, studentId: sid, subject: 'عام', title: examTitle,
                score: data.score, maxScore: data.total, date: record.date.split('T')[0],
                category: 'PLATFORM_EXAM', createdById: currentUserId
            }));
            addPerformance(perfRecords as any);

            alert('تم الرصد وحفظ التحليل.');
            setFileData([]);
            setViewMode('HISTORY');
        } catch (e) { alert('خطأ في الحفظ.'); } finally { setIsSaving(false); }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600"/> محلل استجابات Forms
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">ربط التقييم بنواتج التعلم والرصد التلقائي.</p>
                </div>
                {!selectedRecord && (
                    <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                        <button onClick={() => setViewMode('IMPORT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'IMPORT' ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>تحليل جديد</button>
                        <button onClick={() => setViewMode('HISTORY')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'HISTORY' ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>السجل والمقارنة</button>
                    </div>
                )}
            </div>

            {selectedRecord ? (
                /* --- تفاصيل السجل المختار --- */
                <div className="flex-1 overflow-hidden flex flex-col gap-6 animate-slide-up">
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20}/></button>
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">{selectedRecord.examTitle}</h3>
                                <p className="text-xs text-gray-500">{selectedRecord.className} • {new Date(selectedRecord.date).toLocaleDateString('ar-SA')}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-center px-4 border-l">
                                <span className="block text-[10px] font-bold text-gray-400">الطلاب</span>
                                <span className="font-black text-indigo-600">{Object.keys(selectedRecord.studentResponses).length}</span>
                            </div>
                            <div className="text-center px-4">
                                <span className="block text-[10px] font-bold text-gray-400">الأسئلة</span>
                                <span className="font-black text-green-600">{selectedRecord.questions.length}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                        {selectedRecord.questions.map((q, idx) => (
                            <div key={q.id} className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                                <div className="p-5 bg-gray-50 border-b flex justify-between items-center">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">س{idx+1}</span>
                                            <h4 className="font-bold text-gray-800 text-sm leading-relaxed">{q.text}</h4>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-purple-600">
                                            <BrainCircuit size={12}/> ناتج التعلم: {q.learningOutcome}
                                        </div>
                                    </div>
                                    <div className="text-center bg-white px-4 py-2 rounded-2xl border shadow-sm mr-4">
                                        <div className={`text-xl font-black ${q.successRate < 50 ? 'text-red-500' : 'text-green-600'}`}>{q.successRate}%</div>
                                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">نسبة الإتقان</div>
                                    </div>
                                </div>
                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-white text-gray-400 font-bold">
                                            <tr>
                                                <th className="p-4 border-b">اسم الطالب</th>
                                                <th className="p-4 border-b">إجابة الطالب</th>
                                                <th className="p-4 border-b text-center">الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {Object.entries(selectedRecord.studentResponses).map(([sid, res]) => {
                                                const student = students.find(s => s.id === sid);
                                                const answer = res.answers[q.text] || '-';
                                                const isCorrect = !q.commonErrors.some(err => err[0] === answer) && answer !== '-';
                                                
                                                return (
                                                    <tr key={sid} className="hover:bg-gray-50/50">
                                                        <td className="p-4 font-bold text-gray-700">{student?.name || 'طالب مجهول'}</td>
                                                        <td className={`p-4 font-medium ${!isCorrect ? 'text-red-500' : 'text-gray-600'}`}>{answer}</td>
                                                        <td className="p-4 text-center">
                                                            {isCorrect ? (
                                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-[9px]">متقن</span>
                                                            ) : (
                                                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold text-[9px]">غير متقن</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : viewMode === 'IMPORT' ? (
                /* --- واجهة الاستيراد --- */
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <Upload size={48}/>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">ارفع ملف استجابات Forms</h3>
                        <p className="text-gray-400 max-w-sm mb-8 text-sm font-bold">تجاهل تلقائي للبيانات الشخصية والتركيز على تحليل نواتج التعلم.</p>
                        <input type="file" id="f-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="f-up" className="bg-green-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">
                            {loading ? 'جاري التحليل...' : 'اختيار ملف الاستجابات'}
                        </label>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-6">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
                            <label className="text-sm font-bold text-gray-600 whitespace-nowrap">اسم التقييم:</label>
                            <input className="flex-1 p-2 border rounded-lg font-bold text-indigo-600 outline-none" value={examTitle} onChange={e=>setExamTitle(e.target.value)}/>
                        </div>

                        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-hidden">
                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ListFilter size={18} className="text-orange-500"/> الفقرات المستخرجة</h3>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {itemAnalysis.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                                            <div className="p-4 cursor-pointer" onClick={() => setExpandedQuestion(expandedQuestion === item.id ? null : item.id)}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="text-xs font-bold text-gray-700 flex-1 ml-4 leading-relaxed"><span className="text-green-600">س{idx+1}:</span> {item.question}</p>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded font-black ${item.successRate < 50 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{item.successRate}% إتقان</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1 bg-white border rounded-lg flex items-center gap-1 flex-1 shadow-sm">
                                                        <BrainCircuit size={12} className="text-purple-500"/>
                                                        <input className="text-[10px] bg-transparent outline-none w-full font-bold text-purple-700" placeholder="أدخل ناتج التعلم..." value={outcomesMapping[item.id] || ''} onChange={e => { e.stopPropagation(); setOutcomesMapping({...outcomesMapping, [item.id]: e.target.value}); }} onClick={e=>e.stopPropagation()}/>
                                                    </div>
                                                    {expandedQuestion === item.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col overflow-hidden">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><UserCheck size={18} className="text-blue-500"/> مطابقة الطلاب والدرجات</h3>
                                <div className="flex-1 overflow-y-auto border rounded-2xl bg-gray-50">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-100 sticky top-0 font-bold z-10">
                                            <tr><th className="p-3">الطالب</th><th className="p-3 text-center">الدرجة</th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {processedResults.map((r, i) => (
                                                <tr key={i} className="hover:bg-white transition-colors">
                                                    <td className="p-3 font-bold">
                                                        {r.matchedStudent ? <div className="flex items-center gap-1 text-green-700"><CheckCircle size={10}/> {r.matchedStudent.name}</div> : <div className="flex items-center gap-1 text-red-400 italic"><AlertCircle size={10}/> {r.studentName}</div>}
                                                    </td>
                                                    <td className="p-3 text-center font-black text-indigo-600">{r.score} / {itemAnalysis.length}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button onClick={handleFinalSave} disabled={isSaving || !examTitle} className="mt-4 w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                                    {isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} إتمام الحفظ والرصد
                                </button>
                            </div>
                        </div>
                    </div>
                )
            ) : (
                /* --- واجهة الأرشيف --- */
                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center py-20 text-gray-300 italic flex flex-col items-center">
                            <History size={64} className="mb-4 opacity-20"/> لا يوجد سجل استيراد سابق.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {history.map(record => (
                                <div key={record.id} onClick={() => setSelectedRecord(record)} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-2 h-full bg-green-500"></div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2 bg-green-50 text-green-600 rounded-xl"><Target size={20}/></div>
                                        <span className="text-[10px] font-bold text-gray-400">{new Date(record.date).toLocaleDateString('ar-SA')}</span>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-800 mb-1">{record.examTitle}</h3>
                                    <p className="text-xs text-gray-500 mb-4">{record.className} • {Object.keys(record.studentResponses).length} طالب</p>
                                    
                                    <div className="space-y-2 mb-4 border-t pt-3">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">نواتج التعلم:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {Array.from(new Set(record.questions.map(q => q.learningOutcome))).map((o, i) => (
                                                <span key={i} className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">{o}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <button className="w-full py-2 bg-gray-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 border border-transparent hover:border-indigo-200">
                                        <TrendingUp size={14}/> تحليل الفقرات والطلاب
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FormsAnalyzer;
