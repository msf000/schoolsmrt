
import React, { useState, useMemo, useEffect } from 'react';
import { addPerformance, saveFormsDetailedResult, getFormsDetailedResults, saveQuestionToBank, deleteFormsDetailedResult } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { 
    FileSpreadsheet, Loader2, CheckCircle, AlertCircle, BarChart, 
    ArrowRight, UserCheck, TrendingUp, 
    Upload, ChevronDown, ChevronUp,
    ListFilter, Target, History, BrainCircuit, Save, X, Search, Database, LayoutPanelLeft, ArrowLeft, Users, FileText, Trash2, Edit2, BarChart2, Layers, CheckSquare, Square
} from 'lucide-react';
import { Student, FormsDetailedResult, FormsQuestionAnalysis, Question } from '../types';
import { ResponsiveContainer, BarChart as ReBarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RePieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [viewMode, setViewMode] = useState<'IMPORT' | 'HISTORY' | 'COMPARE'>('IMPORT');
    const [selectedRecord, setSelectedRecord] = useState<FormsDetailedResult | null>(null);
    const [detailTab, setDetailTab] = useState<'QUESTIONS' | 'STUDENTS' | 'OUTCOMES'>('QUESTIONS');
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, string>>({});
    
    // Comparison State
    const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

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
        } catch (error) { alert('فشل التحميل.'); } finally { setLoading(false); }
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
                (s.email && s.email.toLowerCase() === rowEmail) || (s.name === rowName || s.name.includes(rowName))
            );
            return { row, studentName: rowName, score, matchedStudent };
        });
    }, [fileData, headers, students]);

    const itemAnalysis = useMemo(() => {
        if (fileData.length === 0) return [];
        const pointHeaders = headers.filter(h => (h.includes('النقاط -') || h.includes('Points -')) && !['الاسم','فصل','هوية','رقم'].some(w => h.includes(w)));
        
        return pointHeaders.map(pointCol => {
            let questionTitle = pointCol.replace(/^(النقاط - |Points - )/, '').replace(/^س\d+[:\-\s]*/, '').trim();
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
                    itemAnalysis.forEach(q => { answers[q.question] = String(res.row[q.answerColumn] || '-'); });
                    studentResponses[res.matchedStudent.id] = { score: res.score, total: itemAnalysis.length, answers };
                }
            });

            const record: FormsDetailedResult = {
                id: selectedRecord?.id || `forms_${Date.now()}`,
                examTitle,
                className: processedResults[0]?.matchedStudent?.className || 'عام',
                date: new Date().toISOString(),
                teacherId: currentUserId,
                questions: itemAnalysis.map(q => ({ id: q.id, text: q.question, learningOutcome: outcomesMapping[q.id] || 'مهارة عامة', successRate: q.successRate, difficulty: q.successRate < 50 ? 'HARD' : 'EASY', commonErrors: q.commonErrors as any })),
                studentResponses
            };

            saveFormsDetailedResult(record);
            if (!selectedRecord) { // رصد الدرجات فقط في حالة الحفظ الجديد
                const perfRecords = Object.entries(studentResponses).map(([sid, data]) => ({
                    id: `p_forms_${record.id}_${sid}`, studentId: sid, subject: 'عام', title: examTitle, score: data.score, maxScore: data.total, date: record.date.split('T')[0], category: 'PLATFORM_EXAM', createdById: currentUserId
                }));
                addPerformance(perfRecords as any);
            }
            alert('تم الحفظ بنجاح.');
            setFileData([]); setSelectedRecord(null); setViewMode('HISTORY');
        } catch (e) { alert('خطأ.'); } finally { setIsSaving(false); }
    };

    const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('هل تريد حذف هذا الاختبار نهائياً من الأرشيف؟')) {
            deleteFormsDetailedResult(id);
            setHistory(getFormsDetailedResults(currentUserId));
        }
    };

    const toggleCompare = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newSet = new Set(selectedForCompare);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedForCompare(newSet);
    };

    // تحليلات السجل المختار
    const outcomeAnalytics = useMemo(() => {
        if (!selectedRecord) return [];
        const groups: Record<string, { totalRate: number, count: number }> = {};
        selectedRecord.questions.forEach(q => {
            if (!groups[q.learningOutcome]) groups[q.learningOutcome] = { totalRate: 0, count: 0 };
            groups[q.learningOutcome].totalRate += q.successRate;
            groups[q.learningOutcome].count++;
        });
        return Object.entries(groups).map(([name, data]) => ({ name, rate: Math.round(data.totalRate / data.count) }));
    }, [selectedRecord]);

    // بيانات المقارنة
    const compareChartData = useMemo(() => {
        return Array.from(selectedForCompare).map(id => {
            const rec = history.find(r => r.id === id);
            const avg = rec ? Math.round(rec.questions.reduce((a,b)=>a+b.successRate, 0) / rec.questions.length) : 0;
            return { name: rec?.examTitle.slice(0, 15), إتقان: avg };
        });
    }, [selectedForCompare, history]);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-green-600"/> محلل نواتج التعلم المتطور
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">حذف، تعديل، مقارنة، وتحليل استجابات الطلاب.</p>
                </div>
                {!selectedRecord && (
                    <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                        <button onClick={() => setViewMode('IMPORT')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'IMPORT' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>تحليل جديد</button>
                        <button onClick={() => setViewMode('HISTORY')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'HISTORY' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>الأرشيف والمقارنة</button>
                    </div>
                )}
            </div>

            {selectedRecord ? (
                /* --- واجهة التحليلات التفصيلية --- */
                <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
                            <div><h3 className="font-bold text-lg">{selectedRecord.examTitle}</h3><p className="text-xs text-gray-500">{selectedRecord.className} • {new Date(selectedRecord.date).toLocaleDateString('ar-SA')}</p></div>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-xl">
                            <button onClick={()=>setDetailTab('QUESTIONS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${detailTab==='QUESTIONS'?'bg-white shadow text-indigo-600':'text-gray-500'}`}>حسب السؤال</button>
                            <button onClick={()=>setDetailTab('STUDENTS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${detailTab==='STUDENTS'?'bg-white shadow text-indigo-600':'text-gray-500'}`}>حسب الطالب</button>
                            <button onClick={()=>setDetailTab('OUTCOMES')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${detailTab==='OUTCOMES'?'bg-white shadow text-indigo-600':'text-gray-500'}`}>حسب المهارة</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                        {detailTab === 'QUESTIONS' && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {selectedRecord.questions.map((q, i) => (
                                    <div key={i} className="bg-white p-5 rounded-2xl border shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1"><span className="text-[10px] font-black text-green-600">س{i+1}</span><h4 className="font-bold text-gray-800 text-sm">{q.text}</h4></div>
                                            <div className="text-center bg-green-50 px-3 py-1 rounded-lg border border-green-100"><div className="text-lg font-black text-green-600">{q.successRate}%</div><div className="text-[8px] font-bold text-gray-400">إتقان</div></div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-purple-600 mb-4"><BrainCircuit size={14}/> {q.learningOutcome}</div>
                                        <div className="space-y-2">
                                            {q.commonErrors.map(([ans, count], idx) => (
                                                <div key={idx} className="flex justify-between p-2 bg-red-50 rounded-lg text-[10px] text-red-700"><span>خطأ شائع: {ans}</span><span className="font-black">{count} طالب</span></div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {detailTab === 'STUDENTS' && (
                            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-gray-50 font-bold border-b">
                                        <tr><th className="p-4">اسم الطالب</th>{selectedRecord.questions.map((_, i) => <th key={i} className="p-2 text-center">س{i+1}</th>)}<th className="p-4 text-center">الدرجة</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {Object.entries(selectedRecord.studentResponses).map(([sid, res]) => {
                                            const student = students.find(s => s.id === sid);
                                            return (
                                                <tr key={sid} className="hover:bg-gray-50">
                                                    <td className="p-4 font-bold">{student?.name || 'مجهول'}</td>
                                                    {selectedRecord.questions.map(q => {
                                                        const ans = res.answers[q.text];
                                                        const isCorrect = !q.commonErrors.some(e => e[0] === ans) && ans !== '-';
                                                        return <td key={q.id} className="p-2 text-center">{isCorrect ? <CheckCircle size={14} className="text-green-500 mx-auto"/> : <X size={14} className="text-red-400 mx-auto"/>}</td>;
                                                    })}
                                                    <td className="p-4 text-center font-black text-indigo-600">{res.score} / {res.total}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {detailTab === 'OUTCOMES' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                                    <h4 className="font-bold mb-6 flex items-center gap-2"><Target size={18} className="text-orange-500"/> إتقان نواتج التعلم</h4>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ReBarChart data={outcomeAnalytics} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
                                                <XAxis type="number" domain={[0, 100]} hide/>
                                                <YAxis dataKey="name" type="category" tick={{fontSize:10, fontWeight:'bold'}} width={100}/>
                                                <Tooltip/>
                                                <ReBar dataKey="rate" fill="#4f46e5" radius={[0, 10, 10, 0]} barSize={20}/>
                                            </ReBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                                    <h4 className="font-bold mb-4">توزيع الدرجات</h4>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RePieChart>
                                                <Pie data={outcomeAnalytics} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="rate" nameKey="name" label>
                                                    {outcomeAnalytics.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                                                </Pie>
                                                <Tooltip/>
                                                <Legend/>
                                            </RePieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : viewMode === 'IMPORT' ? (
                /* --- واجهة الاستيراد (سابقاً) --- */
                <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                    <Upload size={48} className="text-green-600 mb-4"/>
                    <h3 className="text-xl font-black text-gray-800 mb-2">حلل استجابات Forms جديدة</h3>
                    <input type="file" id="f-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                    <label htmlFor="f-up" className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all">اختيار الملف</label>
                    {fileData.length > 0 && (
                        <div className="mt-8 w-full max-w-2xl bg-gray-50 p-6 rounded-2xl border text-right">
                             <div className="flex gap-4 mb-4"><input className="flex-1 p-2 border rounded-lg font-bold" value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="عنوان الاختبار"/></div>
                             <button onClick={handleFinalSave} disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">{isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ التحليل في السجل</button>
                        </div>
                    )}
                </div>
            ) : (
                /* --- واجهة الأرشيف والمقارنة --- */
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    {selectedForCompare.size > 0 && (
                        <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl animate-fade-in">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold flex items-center gap-2"><BarChart2 size={20}/> تحليل المقارنة ({selectedForCompare.size})</h3>
                                <button onClick={()=>setSelectedForCompare(new Set())} className="text-xs bg-white/10 px-3 py-1 rounded-lg">إلغاء التحديد</button>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={compareChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff22" />
                                        <XAxis dataKey="name" stroke="#fff" tick={{fontSize:10}} />
                                        <YAxis stroke="#fff" domain={[0, 100]} />
                                        <Tooltip contentStyle={{backgroundColor:'#1e1b4b', border:'none', borderRadius:'10px'}} />
                                        <Line type="monotone" dataKey="إتقان" stroke="#fbbf24" strokeWidth={4} dot={{r:6, fill:'#fbbf24'}} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pr-1">
                        {history.map(record => (
                            <div key={record.id} onClick={() => setSelectedRecord(record)} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative group overflow-hidden">
                                <div className="absolute top-0 right-0 w-2 h-full bg-green-500"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <button 
                                        onClick={(e) => toggleCompare(record.id, e)}
                                        className={`p-2 rounded-lg transition-all ${selectedForCompare.has(record.id) ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600'}`}
                                    >
                                        <CheckSquare size={16}/>
                                    </button>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); setViewMode('IMPORT'); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit2 size={14}/></button>
                                        <button onClick={(e) => handleDeleteRecord(record.id, e)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                                <h4 className="font-bold text-gray-800 mb-1">{record.examTitle}</h4>
                                <p className="text-[10px] text-gray-400 font-bold mb-4">{record.className} • {Object.keys(record.studentResponses).length} طالب</p>
                                <div className="flex flex-wrap gap-1 mb-4">
                                    {Array.from(new Set(record.questions.map(q=>q.learningOutcome))).slice(0, 3).map((o,i)=> <span key={i} className="text-[8px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">{o}</span>)}
                                </div>
                                <button className="w-full py-2 bg-gray-50 text-indigo-600 rounded-xl text-[10px] font-black group-hover:bg-indigo-600 group-hover:text-white transition-all">فتح لوحة التحليل <ArrowRight size={12} className="inline ml-1"/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormsAnalyzer;
