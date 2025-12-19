
import React, { useState, useMemo, useEffect } from 'react';
import { saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, Upload, ListFilter, Target, Save, ArrowLeft, Trash2, 
    BarChart2, Sparkles, Printer, Filter, GitCompare, Wand2, CheckCircle, 
    PlusCircle, History, LayoutGrid, ArrowRightLeft, UserCheck, BookOpen, ArrowRight, ClipboardCheck, Users, Bookmark, FileText, EyeOff, X, LifeBuoy, Calendar, Settings2, TrendingUp, ArrowUpRight, ArrowDownRight, Minus,
    Circle
} from 'lucide-react';
import { Student, FormsDetailedResult, ReportHeaderConfig } from '../types';
import { ResponsiveContainer, BarChart as ReBarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend } from 'recharts';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [mainTab, setMainTab] = useState<'NEW' | 'HISTORY' | 'COMPARE'>('HISTORY');
    const [selectedRecord, setSelectedRecord] = useState<FormsDetailedResult | null>(null);
    const [historyViewTab, setHistoryViewTab] = useState<'KASHF' | 'ANALYSIS' | 'CLASSIFICATION' | 'SKILLS' | 'FOLLOWUP'>('KASHF');
    const [activeSkillIdx, setActiveSkillIdx] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [hiddenHeaders, setHiddenHeaders] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, string>>({});
    const [unitsMapping, setUnitsMapping] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [reportClassFilter, setReportClassFilter] = useState('');
    const headerConfig = useMemo(() => getReportHeaderConfig(currentUserId), [currentUserId]);

    // حالات المقارنة
    const [compareIdA, setCompareIdA] = useState('');
    const [compareIdB, setCompareIdB] = useState('');
    const [compareClassFilter, setCompareClassFilter] = useState('');
    const [compareViewTab, setCompareViewTab] = useState<'SUMMARY' | 'DETAILS'>('SUMMARY');

    // بيانات المتابعة القابلة للتعديل
    const [followUpMeta, setFollowUpMeta] = useState({
        week: 'الخامس',
        day: 'الثلاثاء',
        date: new Date().toLocaleDateString('ar-SA'),
        enrichMechanism: '• عرض مرئي ومسموع لتعميق المفاهيم\n• تفعيل التعلم الذاتي عبر منصات إثرائية',
        remedialMechanism: '• مهمة أدائية علاجية مركزة\n• تطبيق استراتيجية تعلم الأقران',
        notes: '',
        recommendations: ''
    });

    useEffect(() => {
        if (currentUserId) {
            setHistory(getFormsDetailedResults(currentUserId));
        }
    }, [currentUserId, isSaving, mainTab]);

    const getQuestionHeaders = (allHeaders: string[]) => {
        return allHeaders.filter(h => {
            const hTrim = h.trim();
            const isPointCol = hTrim.startsWith('النقاط -') || hTrim.startsWith('Points -');
            const isGrandTotal = hTrim === 'إجمالي النقاط' || hTrim === 'Total Points';
            const identityWords = ['اسم الطالب', 'اسمك', 'الفصل', 'الشعبة', 'الرقم الأكاديمي', 'الهوية'];
            const isIdentity = identityWords.some(word => hTrim.includes(word) && !isPointCol);
            return (isPointCol && !isGrandTotal && !isIdentity) && !hiddenHeaders.has(h);
        });
    };

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

    const handleAutoGenerateSkills = async () => {
        setIsAiProcessing(true);
        try {
            const apiKey = process.env.API_KEY || '';
            const ai = new GoogleGenAI({ apiKey });
            const itemAnalysis = getQuestionHeaders(headers).map(h => h.replace(/^(النقاط - )/, '').trim());
            const prompt = `أنت خبير في المنهج السعودي لمادة "علوم الأرض والفضاء". حلل الأسئلة التالية واستنتج المهارة التعليمية والوحدة لكل سؤال. أرجع JSON حصراً: {"items": [{"skill": "أن يوضح الطالب...", "unit": "الفصل 1 / نشأة الكون"}]}`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt + "\n" + itemAnalysis.join('\n'),
                config: { responseMimeType: "application/json" }
            });
            const result = JSON.parse(response.text || "{}");
            if (result.items) {
                const newOutcomes: Record<string, string> = {};
                const newUnits: Record<string, string> = {};
                getQuestionHeaders(headers).forEach((h, i) => { 
                    newOutcomes[h] = result.items[i]?.skill || h; 
                    newUnits[h] = result.items[i]?.unit || 'الوحدة الأولى';
                });
                setOutcomesMapping(newOutcomes);
                setUnitsMapping(newUnits);
            }
        } catch (e) { alert('فشل استخراج المهارات.'); } finally { setIsAiProcessing(false); }
    };

    const handleFinalSave = () => {
        if (!examTitle || !currentUserId) return alert('بيانات ناقصة.');
        setIsSaving(true);
        try {
            const studentResponses: Record<string, any> = {};
            const emailCol = headers.find(h => h.toLowerCase().includes('email') || h.includes('البريد'));
            const nameCol = headers.find(h => h.toLowerCase().includes('name') || h.includes('الاسم') || h.includes('اسمك'));
            const questionCols = getQuestionHeaders(headers);
            fileData.forEach((row) => {
                const rowEmail = emailCol ? String(row[emailCol] || '').trim().toLowerCase() : '';
                const rowName = nameCol ? String(row[nameCol] || '').trim() : '';
                const matchedStudent = students.find(s => (s.email && s.email.toLowerCase() === rowEmail) || (s.name === rowName || s.name.includes(rowName) || rowName.includes(s.name)));
                if (matchedStudent) {
                    const answers: Record<string, string> = {};
                    questionCols.forEach(q => { answers[q] = Number(row[q]) > 0 ? '✔' : '✘'; });
                    studentResponses[matchedStudent.id] = { score: Number(row['إجمالي النقاط'] || 0), total: questionCols.length, answers };
                }
            });
            const record: FormsDetailedResult = {
                id: `forms_${Date.now()}`, examTitle,
                className: students.find(s => Object.keys(studentResponses).includes(s.id))?.className || 'عام',
                date: new Date().toISOString(), teacherId: currentUserId,
                questions: questionCols.map(q => ({
                    id: q, text: q, learningOutcome: outcomesMapping[q] || q,
                    unitName: unitsMapping[q] || 'الوحدة الأولى',
                    successRate: 0, difficulty: 'EASY', commonErrors: []
                })),
                studentResponses
            };
            saveFormsDetailedResult(record);
            alert('تم الحفظ بنجاح.'); setFileData([]); setMainTab('HISTORY');
        } catch (e) { alert('خطأ أثناء الحفظ.'); } finally { setIsSaving(false); }
    };

    const getReportData = (record: FormsDetailedResult, classFilter: string) => {
        const targetClass = classFilter || record.className;
        const allInClass = students.filter(s => !classFilter || s.className === classFilter).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        const gradeName = allInClass.length > 0 ? (allInClass[0].gradeLevel || 'غير محدد') : (record.className || 'غير محدد');
        let totalPossibleSkills = 0; let totalMasteredSkills = 0; let totalStudentsAttended = 0;
        const studentsList = allInClass.map(s => {
            const res = record.studentResponses[s.id];
            const pct = res ? (res.score / record.questions.length) * 100 : 0;
            let color = '#ef4444';
            if (pct >= 90) color = '#10b981'; else if (pct >= 75) color = '#3b82f6'; else if (pct >= 50) color = '#f59e0b';
            let masteredCount = 0; let unmasteredCount = 0; let levelDesc = ""; let program = "";
            if (res) {
                totalStudentsAttended++; totalPossibleSkills += record.questions.length; totalMasteredSkills += res.score;
                Object.values(res.answers).forEach(val => { if (val === '✔') masteredCount++; else unmasteredCount++; });
                if (pct >= 90) { levelDesc = "أداء المتعلم متقدم وحلوله إبداعية للمسائل"; program = "ENRICHMENT"; }
                else if (pct >= 75) { levelDesc = "لدى المتعلم تميز نسبي في حل المسائل متوسطة المستوى"; program = "ENRICHMENT"; }
                else if (pct >= 50) { levelDesc = "لدى المتعلم خلل في نواتج التعلم وضعف في التأسيس"; program = "REMEDIAL"; }
                else { levelDesc = "يحتاج المتعلم إلى تحسين كبير ومتابعة مكثفة لنواتج التعلم"; program = "REMEDIAL"; }
            }
            return { sid: s.id, name: s.name, score: res?.score || 0, pct, color, isAbsent: !res, answers: res?.answers || {}, masteredCount, unmasteredCount, levelDesc, program };
        });
        const skillStats = record.questions.map(q => {
            let mastered = 0; let attended = 0;
            studentsList.forEach(s => { if (!s.isAbsent) { attended++; if (s.answers[q.id] === '✔') mastered++; } });
            return { 
                id: q.id, name: q.learningOutcome, unit: q.unitName || 'غير محدد', masteredCount: mastered, 
                nonMasteredCount: attended - mastered, masteredPct: attended > 0 ? (mastered / attended) * 100 : 0, 
                nonMasteredPct: attended > 0 ? ((attended - mastered) / attended) * 100 : 0, totalAttended: attended 
            };
        });
        const overallMasteryPct = totalPossibleSkills > 0 ? (totalMasteredSkills / totalPossibleSkills) * 100 : 0;
        return { studentsList, skillStats, totalPossibleSkills, totalMasteredSkills, totalStudents: allInClass.length, totalStudentsAttended, overallMasteryPct, gradeName };
    };

    const activeClassesForRecord = (record: FormsDetailedResult) => {
        const classes = new Set<string>();
        Object.keys(record.studentResponses).forEach(sid => {
            const s = students.find(x => x.id === sid);
            if (s?.className) classes.add(s.className);
        });
        return Array.from(classes).sort();
    };

    const toggleHideHeader = (h: string) => {
        const newHidden = new Set(hiddenHeaders);
        if (newHidden.has(h)) newHidden.delete(h); else newHidden.add(h);
        setHiddenHeaders(newHidden);
    };

    // منطق مقارنة الاختبارات
    const getComparisonData = () => {
        const recA = history.find(r => r.id === compareIdA);
        const recB = history.find(r => r.id === compareIdB);
        if (!recA || !recB) return null;

        const dataA = getReportData(recA, compareClassFilter);
        const dataB = getReportData(recB, compareClassFilter);

        // ربط الطلاب وتحديد النمو
        const studentComparison = dataA.studentsList.map(sA => {
            const sB = dataB.studentsList.find(x => x.sid === sA.sid);
            const growth = (sA.isAbsent || sB?.isAbsent) ? 0 : (sB?.pct || 0) - sA.pct;
            return {
                sid: sA.sid,
                name: sA.name,
                scoreA: sA.isAbsent ? '-' : sA.score,
                pctA: sA.pct,
                scoreB: (sB && !sB.isAbsent) ? sB.score : '-',
                pctB: sB?.pct || 0,
                growth,
                isAbsent: sA.isAbsent || sB?.isAbsent
            };
        });

        const overallGrowth = dataB.overallMasteryPct - dataA.overallMasteryPct;

        return { recA, recB, dataA, dataB, studentComparison, overallGrowth };
    };

    const allCompareClasses = useMemo(() => {
        const recA = history.find(r => r.id === compareIdA);
        const recB = history.find(r => r.id === compareIdB);
        if (!recA && !recB) return [];
        const classes = new Set<string>();
        if (recA) activeClassesForRecord(recA).forEach(c => classes.add(c));
        if (recB) activeClassesForRecord(recB).forEach(c => classes.add(c));
        return Array.from(classes).sort();
    }, [compareIdA, compareIdB, history]);

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex bg-white p-1 rounded-2xl border shadow-sm mb-6 print:hidden">
                <button onClick={() => setMainTab('NEW')} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${mainTab === 'NEW' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><PlusCircle size={18}/> تحليل جديد</button>
                <button onClick={() => setMainTab('HISTORY')} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${mainTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><History size={18}/> سجل النتائج</button>
                <button onClick={() => setMainTab('COMPARE')} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${mainTab === 'COMPARE' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><ArrowRightLeft size={18}/> مقارنة النتائج</button>
            </div>

            {mainTab === 'NEW' && (
                fileData.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-4 border-dashed border-gray-200 rounded-[3rem] bg-white p-10 text-center">
                        <Upload size={64} className="text-green-600 mb-4 opacity-20"/>
                        <h3 className="text-2xl font-black text-gray-800 mb-2">تحليل استجابات Forms جديدة</h3>
                        <input type="file" id="forms-up" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
                        <label htmlFor="forms-up" className="bg-green-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl cursor-pointer hover:bg-green-700 transition-all active:scale-95">اختيار الملف</label>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col xl:flex-row gap-8 overflow-hidden">
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><ListFilter className="text-orange-500"/> ربط الأسئلة بنواتج التعلم (العدد المكتشف: {getQuestionHeaders(headers).length})</h3>
                                    <button onClick={handleAutoGenerateSkills} disabled={isAiProcessing} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:bg-purple-700">
                                        {isAiProcessing ? <Loader2 className="animate-spin" size={14}/> : <Wand2 size={14}/>} استخراج المهارات ذكياً ✨
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                    {getQuestionHeaders(headers).map((h, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border p-4 relative group">
                                            <button onClick={() => toggleHideHeader(h)} className="absolute top-2 left-2 p-1 text-gray-300 hover:text-red-500 transition-colors" title="إخفاء السؤال من التقرير"><X size={16}/></button>
                                            <p className="text-xs font-bold text-gray-500 mb-2 truncate pl-8">س{idx+1}: {h.replace(/^(النقاط - )/, '')}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <div className="flex items-center gap-2 bg-white border rounded-xl p-2">
                                                    <Bookmark size={14} className="text-teal-500"/><input className="flex-1 text-xs outline-none font-bold text-teal-900" placeholder="الوحدة / الدرس..." value={unitsMapping[h] || ''} onChange={e => setUnitsMapping({...unitsMapping, [h]: e.target.value})} />
                                                </div>
                                                <div className="flex items-center gap-2 bg-white border rounded-xl p-2">
                                                    <Target size={14} className="text-indigo-500"/><input className="flex-1 text-xs outline-none font-bold text-indigo-900" placeholder="المهارة..." value={outcomesMapping[h] || ''} onChange={e => setOutcomesMapping({...outcomesMapping, [h]: e.target.value})} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="w-full xl:w-96 flex flex-col border-r pr-8">
                                <h3 className="font-bold text-gray-800 mb-6">بيانات الحفظ</h3>
                                <input className="w-full p-3 border rounded-xl font-bold text-indigo-600 mb-6" value={examTitle} onChange={e=>setExamTitle(e.target.value)} placeholder="عنوان الكشف"/>
                                <button onClick={handleFinalSave} disabled={isSaving} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 flex items-center justify-center gap-2 mt-6">{isSaving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} حفظ وتحليل النتائج</button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {mainTab === 'HISTORY' && (
                !selectedRecord ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto custom-scrollbar">
                        {history.map(record => (
                            <div key={record.id} onClick={() => {setSelectedRecord(record); setReportClassFilter('');}} className="bg-white p-6 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all cursor-pointer relative group border-t-8 border-t-indigo-600">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BarChart2 size={24}/></div>
                                    <button onClick={(e)=>{e.stopPropagation(); if(confirm('حذف؟')){deleteFormsDetailedResult(record.id); setHistory(getFormsDetailedResults(currentUserId));}}} className="p-2 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18}/></button>
                                </div>
                                <h3 className="font-black text-lg text-gray-800 mb-1">{record.examTitle}</h3>
                                <p className="text-xs text-gray-400 font-bold">{record.className} • {record.questions.length} مهارة</p>
                                <div className="mt-4 flex gap-2"><div className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-2">فتح التقارير <ArrowRight size={12}/></div></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col gap-4 animate-slide-up">
                        <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 print:hidden overflow-x-auto">
                            <div className="flex items-center gap-4 shrink-0">
                                <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-gray-100 rounded-full"><ArrowLeft/></button>
                                <div className="flex bg-gray-100 p-1 rounded-xl whitespace-nowrap">
                                    <TabBtnView label="كشف الرصد" active={historyViewTab==='KASHF'} onClick={()=>setHistoryViewTab('KASHF')}/>
                                    <TabBtnView label="تصنيف المتعلمين" active={historyViewTab==='CLASSIFICATION'} onClick={()=>setHistoryViewTab('CLASSIFICATION')}/>
                                    <TabBtnView label="سجل المتابعة" active={historyViewTab==='FOLLOWUP'} onClick={()=>setHistoryViewTab('FOLLOWUP')}/>
                                    <TabBtnView label="نواتج التعلم" active={historyViewTab==='SKILLS'} onClick={()=>setHistoryViewTab('SKILLS')}/>
                                    <TabBtnView label="التحليل البياني" active={historyViewTab==='ANALYSIS'} onClick={()=>setHistoryViewTab('ANALYSIS')}/>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                {historyViewTab === 'FOLLOWUP' && (
                                    <select className="bg-white border p-2 rounded-xl text-xs font-black text-purple-700 outline-none max-w-[200px]" value={activeSkillIdx} onChange={e => setActiveSkillIdx(Number(e.target.value))}>
                                        {selectedRecord.questions.map((q: any, i: number) => <option key={i} value={i}>المهارة {i+1}</option>)}
                                    </select>
                                )}
                                <select className="bg-white border p-2 rounded-xl text-xs font-black text-indigo-700 outline-none" value={reportClassFilter} onChange={e => setReportClassFilter(e.target.value)}>
                                    <option value="">كل الفصول</option>
                                    {activeClassesForRecord(selectedRecord).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={()=>window.print()} className="bg-gray-800 text-white px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg"><Printer size={16}/> طباعة</button>
                            </div>
                        </div>

                        {/* لوحة تعديل بيانات المتابعة تظهر فقط في تبويب المتابعة */}
                        {historyViewTab === 'FOLLOWUP' && (
                            <div className="bg-white p-5 rounded-2xl border shadow-sm print:hidden grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
                                <div className="col-span-full flex items-center gap-2 border-b pb-2 mb-2 text-indigo-600 font-black text-xs uppercase tracking-widest"><Settings2 size={14}/> تخصيص بيانات المتابعة لهذه المهارة</div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">الأسبوع</label>
                                    <input className="w-full p-2 border rounded-lg text-xs font-bold" value={followUpMeta.week} onChange={e=>setFollowUpMeta({...followUpMeta, week: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">اليوم</label>
                                    <input className="w-full p-2 border rounded-lg text-xs font-bold" value={followUpMeta.day} onChange={e=>setFollowUpMeta({...followUpMeta, day: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">التاريخ</label>
                                    <input className="w-full p-2 border rounded-lg text-xs font-bold" value={followUpMeta.date} onChange={e=>setFollowUpMeta({...followUpMeta, date: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">آلية الإثراء</label>
                                    <textarea className="w-full p-2 border rounded-lg text-[10px] h-10" value={followUpMeta.enrichMechanism} onChange={e=>setFollowUpMeta({...followUpMeta, enrichMechanism: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">آلية المعالجة</label>
                                    <textarea className="w-full p-2 border rounded-lg text-[10px] h-10" value={followUpMeta.remedialMechanism} onChange={e=>setFollowUpMeta({...followUpMeta, remedialMechanism: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">الملاحظات</label>
                                    <textarea className="w-full p-2 border rounded-lg text-[10px] h-10" value={followUpMeta.notes} onChange={e=>setFollowUpMeta({...followUpMeta, notes: e.target.value})}/>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400">التوصيات</label>
                                    <textarea className="w-full p-2 border rounded-lg text-[10px] h-10" value={followUpMeta.recommendations} onChange={e=>setFollowUpMeta({...followUpMeta, recommendations: e.target.value})}/>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {historyViewTab === 'KASHF' && <KashfReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                            {historyViewTab === 'ANALYSIS' && <DiagnosticAnalysis record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                            {historyViewTab === 'CLASSIFICATION' && <ClassificationReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                            {historyViewTab === 'SKILLS' && <LearningOutcomesReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                            {historyViewTab === 'FOLLOWUP' && <FollowUpRecordReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} skillIndex={activeSkillIdx} meta={followUpMeta} />}
                        </div>
                    </div>
                )
            )}

            {mainTab === 'COMPARE' && (
                <div className="flex-1 flex flex-col gap-6 animate-fade-in overflow-hidden">
                    <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col md:flex-row gap-6 items-end print:hidden">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-black text-gray-400 flex items-center gap-1"><Circle size={8} className="fill-blue-500 text-blue-500"/> الاختبار الأول (الأساس/القبلي)</label>
                            <select className="w-full p-3 border rounded-xl font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500" value={compareIdA} onChange={e=>setCompareIdA(e.target.value)}>
                                <option value="">-- اختر السجل الأول --</option>
                                {history.map(r => <option key={r.id} value={r.id}>{r.examTitle} ({r.className})</option>)}
                            </select>
                        </div>
                        <div className="p-3 text-purple-300 hidden md:block"><ArrowRightLeft size={24}/></div>
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-black text-gray-400 flex items-center gap-1"><Circle size={8} className="fill-green-500 text-green-500"/> الاختبار الثاني (المستهدف/البعدي)</label>
                            <select className="w-full p-3 border rounded-xl font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500" value={compareIdB} onChange={e=>setCompareIdB(e.target.value)}>
                                <option value="">-- اختر السجل الثاني --</option>
                                {history.map(r => <option key={r.id} value={r.id}>{r.examTitle} ({r.className})</option>)}
                            </select>
                        </div>
                        <div className="w-full md:w-48 space-y-2">
                             <label className="text-xs font-black text-gray-400 flex items-center gap-1"><Filter size={12}/> تصفية الفصل</label>
                             <select className="w-full p-3 border rounded-xl font-bold bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500" value={compareClassFilter} onChange={e=>setCompareClassFilter(e.target.value)}>
                                <option value="">كل الفصول</option>
                                {allCompareClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <button onClick={()=>window.print()} className="bg-gray-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-black transition-all"><Printer size={18}/> طباعة</button>
                    </div>

                    {getComparisonData() ? (
                        <div className="flex-1 flex flex-col overflow-hidden gap-4">
                            <div className="bg-white p-1 rounded-xl border shadow-sm flex w-fit mx-auto print:hidden">
                                <TabBtnView label="ملخص النمو التعليمي" active={compareViewTab==='SUMMARY'} onClick={()=>setCompareViewTab('SUMMARY')}/>
                                <TabBtnView label="تفاصيل نمو المتعلمين" active={compareViewTab==='DETAILS'} onClick={()=>setCompareViewTab('DETAILS')}/>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                <ComparisonReport data={getComparisonData()} header={headerConfig} viewMode={compareViewTab} />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-4 bg-white rounded-[3rem] border-4 border-dashed border-gray-100">
                            <GitCompare size={80} className="opacity-10"/>
                            <p className="text-xl font-black">يرجى اختيار اختبارين للمقارنة</p>
                        </div>
                    )}
                </div>
            )}

            <style>{` .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); } @media print { @page { size: landscape; margin: 0.5cm; } body { background: white !important; } .print\\:hidden { display: none !important; } .break-after { page-break-after: always; } } `}</style>
        </div>
    );
};

const TabBtnView = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-[11px] font-black transition-all ${active ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>{label}</button>
);

const ComparisonReport = ({ data, header, viewMode }: any) => {
    const { recA, recB, studentComparison, overallGrowth } = data;

    // تقدير الدرجة بناءً على النسبة
    const getRating = (pct: number) => {
        if (pct >= 90) return { label: 'ممتاز', color: 'text-green-600' };
        if (pct >= 80) return { label: 'جيد جداً', color: 'text-blue-600' };
        if (pct >= 65) return { label: 'جيد', color: 'text-orange-600' };
        if (pct >= 50) return { label: 'مقبول', color: 'text-orange-400' };
        return { label: 'ضعيف', color: 'text-red-600' };
    };

    // تجهيز بيانات الرسم البياني للمهارات
    const skillChartData = recA.questions.map((qA: any, idx: number) => {
        const qB = recB.questions[idx];
        const masteredA = Object.values(recA.studentResponses).filter((r: any) => r.answers[qA.id] === '✔').length;
        const masteredB = Object.values(recB.studentResponses).filter((r: any) => r.answers[qB?.id] === '✔').length;
        const totalA = Object.keys(recA.studentResponses).length;
        const totalB = Object.keys(recB.studentResponses).length;
        
        return {
            name: qA.learningOutcome,
            testA: totalA > 0 ? (masteredA / totalA) * 100 : 0,
            testB: totalB > 0 ? (masteredB / totalB) * 100 : 0
        };
    });

    return (
        <div className="space-y-10">
            {/* الصفحة الأولى: ملخص المقارنة والتحليل البياني */}
            {(viewMode === 'SUMMARY' || window.matchMedia('print').matches) && (
                <div className="bg-white p-8 shadow-2xl border-2 border-black print:p-0 print:shadow-none break-after">
                    <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
                        <div className="text-right text-[11px] font-bold">
                            <p>المملكة العربية السعودية</p>
                            <p>وزارة التعليم</p>
                            <p>الإدارة العامة للتعليم بمنطقة {header?.educationAdmin}</p>
                            <p>مدرسة {header?.schoolName}</p>
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black uppercase mb-1">تقرير مقارنة نواتج التعلم</h2>
                            <p className="text-xs font-bold text-gray-500">تحليل الفاقد والنمو التعليمي بين اختبارين</p>
                        </div>
                        <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-14" alt="moe"/></div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-10">
                        <div className="p-6 rounded-3xl border-2 border-blue-100 bg-blue-50 text-center">
                            <p className="text-xs font-black text-blue-600 mb-2">إتقان الاختبار الأساس</p>
                            <h3 className="text-4xl font-black text-blue-900">{Math.round(data.dataA.overallMasteryPct)}%</h3>
                            <p className="text-[10px] text-blue-400 mt-1">{recA.examTitle}</p>
                        </div>
                        <div className="p-6 rounded-3xl border-2 border-green-100 bg-green-50 text-center">
                            <p className="text-xs font-black text-green-600 mb-2">إتقان الاختبار المستهدف</p>
                            <h3 className="text-4xl font-black text-green-900">{Math.round(data.dataB.overallMasteryPct)}%</h3>
                            <p className="text-[10px] text-green-400 mt-1">{recB.examTitle}</p>
                        </div>
                        <div className={`p-6 rounded-3xl border-2 text-center ${overallGrowth >= 0 ? 'border-purple-100 bg-purple-50' : 'border-red-100 bg-red-50'}`}>
                            <p className={`text-xs font-black mb-2 ${overallGrowth >= 0 ? 'text-purple-600' : 'text-red-600'}`}>نسبة التطور (Growth)</p>
                            <h3 className={`text-4xl font-black ${overallGrowth >= 0 ? 'text-purple-900' : 'text-red-900'}`}>
                                {overallGrowth >= 0 ? '+' : ''}{Math.round(overallGrowth)}%
                            </h3>
                            <p className="text-[10px] opacity-60 mt-1">مؤشر التحسن العام</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 border-2 border-black rounded-3xl p-6 mb-10">
                        <h3 className="text-center font-black text-gray-800 mb-8 border-b border-gray-200 pb-4">مقارنة نسب الإتقان لكل مهارة مستهدفة</h3>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <ReBarChart data={skillChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'bold'}} />
                                    <YAxis domain={[0, 100]} unit="%" />
                                    <Tooltip />
                                    <Legend iconType="circle" />
                                    <ReBar name={recA.examTitle} dataKey="testA" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <ReBar name={recB.examTitle} dataKey="testB" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </ReBarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 text-center text-xs font-black border-t-2 border-black pt-6 bg-gray-50 p-4">
                        <div>معلم المادة / أ. {header?.teacherName}</div>
                        <div>مدير المدرسة / أ. {header?.schoolManager}</div>
                    </div>
                </div>
            )}

            {/* الصفحة الثانية: تفاصيل نمو الطلاب - مطابقة للصورة المطلوبة */}
            {(viewMode === 'DETAILS' || window.matchMedia('print').matches) && (
                <div className="bg-white p-8 shadow-2xl border-2 border-black print:p-0 print:shadow-none">
                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-right text-[11px] font-bold">
                                <p>الإدارة العامة للتعليم بمنطقة {header?.educationAdmin}</p>
                                <p>مكة المكرمة</p>
                            </div>
                            <div className="text-center">
                                <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-14 mx-auto mb-2" alt="moe"/>
                                <div className="bg-[#00334d] text-white py-1 px-10 rounded-full font-black text-sm uppercase">مدرسة {header?.schoolName}</div>
                            </div>
                            <div className="text-left"><div className="w-14 h-14"></div></div>
                        </div>

                        <div className="bg-[#00334d] text-white p-3 grid grid-cols-4 text-center text-[11px] font-black border-2 border-black">
                            <div className="border-l border-white/20 uppercase tracking-tighter">علوم الأرض والفضاء</div>
                            <div className="border-l border-white/20">كشف رصد درجات الاختبارات المدرسية</div>
                            <div className="border-l border-white/20 uppercase tracking-tighter">الصف / {data.dataA.gradeName}</div>
                            <div className="uppercase tracking-tighter">الفصل الدراسي / {header?.term} {header?.academicYear}</div>
                        </div>
                    </div>
                    
                    <table className="w-full border-collapse text-center table-fixed text-[11px] border-2 border-black">
                        <thead>
                            <tr className="bg-[#00334d] text-white font-black h-12">
                                <th rowSpan={2} className="border border-white w-8">م</th>
                                <th rowSpan={2} className="border border-white w-48 text-right pr-4">اسم الطالب</th>
                                <th colSpan={2} className="border border-white">الاختبار القبلي</th>
                                <th colSpan={2} className="border border-white">الاختبار البعدي</th>
                                <th colSpan={2} className="border border-white">نسبة مكتسبات المتعلم وفق</th>
                                <th rowSpan={2} className="border border-white w-24">مؤشر التحصيل الدراسي</th>
                            </tr>
                            <tr className="bg-[#00334d] text-white font-black h-10">
                                <th className="border border-white">الدرجة المكتسبة</th>
                                <th className="border border-white">التقدير</th>
                                <th className="border border-white">الدرجة المكتسبة</th>
                                <th className="border border-white">التقدير</th>
                                <th className="border border-white">الاختبار القبلي</th>
                                <th className="border border-white">الاختبار البعدي</th>
                            </tr>
                        </thead>
                        <tbody className="font-bold">
                            {studentComparison.map((s: any, idx: number) => {
                                const ratingA = getRating(s.pctA);
                                const ratingB = getRating(s.pctB);
                                return (
                                    <tr key={s.sid} className={`h-9 border-b border-black hover:bg-gray-50 ${s.isAbsent ? 'bg-gray-100 opacity-50' : ''}`}>
                                        <td className="border border-black bg-[#00334d] text-white">{idx + 1}</td>
                                        <td className="border border-black text-right pr-3 font-black text-gray-800 truncate">{s.name}</td>
                                        <td className="border border-black">{s.isAbsent ? '-' : s.scoreA}</td>
                                        <td className={`border border-black ${ratingA.color}`}>{s.isAbsent ? '-' : ratingA.label}</td>
                                        <td className="border border-black">{s.isAbsent ? '-' : s.scoreB}</td>
                                        <td className={`border border-black ${ratingB.color}`}>{s.isAbsent ? '-' : ratingB.label}</td>
                                        <td className="border border-black">{s.isAbsent ? '-' : s.pctA.toFixed(2)}</td>
                                        <td className="border border-black">{s.isAbsent ? '-' : s.pctB.toFixed(2)}</td>
                                        <td className="border border-black p-1">
                                            {!s.isAbsent && (
                                                <div className="flex flex-col items-center">
                                                    <div className="w-full h-4 bg-gray-100 rounded-full border border-gray-300 overflow-hidden flex items-center relative">
                                                        <div className={`h-full ${s.growth >= 0 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${s.pctB}%` }}></div>
                                                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-black">{s.pctB.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {/* صفوف فارغة لتكملة الشكل كما في الصورة */}
                            {Array.from({ length: Math.max(0, 15 - studentComparison.length) }).map((_, i) => (
                                <tr key={`empty-${i}`} className="h-9 border-b border-black">
                                    <td className="border border-black bg-[#00334d] text-white">{studentComparison.length + i + 1}</td>
                                    <td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td><td className="border border-black"></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-8 flex justify-between items-center text-[11px] font-black px-10">
                        <div>معلم المادة / أ. {header?.teacherName}</div>
                        <div>مدير المدرسة / أ. {header?.schoolManager}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

const KashfReport = ({ record, data, header, classFilter }: any) => {
    const totalMasteredCount = data.studentsList.reduce((acc: number, s: any) => acc + (s.isAbsent ? 0 : s.masteredCount), 0);
    const totalNonMasteredCount = data.studentsList.reduce((acc: number, s: any) => acc + (s.isAbsent ? 0 : s.unmasteredCount), 0);
    const overallMastery = Math.round(data.overallMasteryPct * 10) / 10;
    return (
        <div className="bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
            <div className="min-w-[1300px] border-2 border-black">
                <div className="bg-[#002e4d] text-white p-4 flex justify-between items-center border-b-2 border-black">
                    <div className="text-right text-[11px] font-bold space-y-1"><p>الإدارة العامة للتعليم بمنطقة {header?.educationAdmin}</p><p>مدرسة {header?.schoolName}</p></div>
                    <div className="text-center"><h2 className="text-xl font-black mb-1 uppercase">كشف رصد درجات {record.examTitle}</h2><p className="text-xs opacity-80 font-bold">رصد مهارات المتعلمين المادة/ {header?.subjectSpecialty || 'علوم الأرض والفضاء'}</p></div>
                    <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
                </div>
                <div className="bg-gray-50 border-b-2 border-black grid grid-cols-5 text-xs font-black p-3 text-gray-900 text-center uppercase">
                    <div className="border-l border-black/10">المادة / {header?.subjectSpecialty || 'علوم الأرض والفضاء'}</div>
                    <div className="border-l border-black/10">الصف / {data.gradeName}</div>
                    <div className="border-l border-black/10">الفصل / {classFilter || record.className}</div>
                    <div className="border-l border-black/10">الفصل الدراسي / {header?.term}</div>
                    <div>العام الدراسي / {header?.academicYear}</div>
                </div>
                <table className="w-full border-collapse text-[11px] text-center table-fixed">
                    <thead className="bg-[#e6f3ff] font-black">
                        <tr>
                            <th rowSpan={2} className="border-2 border-black w-10">م</th>
                            <th rowSpan={2} className="border-2 border-black w-56 text-right pr-4">اسم الطالب</th>
                            <th colSpan={2} className="border-2 border-black w-24 bg-[#f0f9ff]">عدد المهارات</th>
                            <th colSpan={record.questions.length} className="border-2 border-black p-2 text-xs uppercase tracking-tighter">رصد المهارات للمتعلمين</th>
                            <th rowSpan={2} className="border-2 border-black w-20 bg-white">نسبة الإتقان 100%</th>
                        </tr>
                        <tr className="bg-gray-50 h-40">
                            <th className="border-2 border-black w-12 text-green-700 bg-green-50">المتقنة</th>
                            <th className="border-2 border-black w-12 text-orange-700 bg-orange-50">الغير متقنة</th>
                            {record.questions.map((q: any, i: number) => (
                                <th key={i} className="border-2 border-black w-10 p-0 relative"><div className="vertical-text absolute inset-0 flex items-center justify-center font-bold px-1 text-[9px] leading-tight">{q.learningOutcome}</div></th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="font-bold">
                        {data.studentsList.map((s: any, idx: number) => (
                            <tr key={s.sid} className={`h-9 hover:bg-gray-50 border-b border-black ${s.isAbsent ? 'bg-gray-100 opacity-60' : ''}`}>
                                <td className="border-2 border-black bg-gray-50">{idx + 1}</td>
                                <td className="border-2 border-black text-right pr-3 font-black text-gray-800 truncate">{s.name}</td>
                                <td className="border-2 border-black text-green-700 bg-green-50/10">{s.isAbsent ? '-' : s.masteredCount}</td>
                                <td className="border-2 border-black text-orange-700 bg-orange-50/10">{s.isAbsent ? '-' : s.unmasteredCount}</td>
                                {record.questions.map((q: any) => (
                                    <td key={q.id} className={`border-2 border-black font-black text-sm ${s.isAbsent ? 'text-gray-300' : (s.answers[q.id] === '✔' ? 'text-green-600' : 'text-red-500')}`}>{s.isAbsent ? '-' : (s.answers[q.id] || '✘')}</td>
                                ))}
                                <td className={`border-2 border-black font-black ${s.isAbsent ? 'text-gray-400' : (s.pct < 60 ? 'text-red-600 bg-red-50' : 'text-blue-700 bg-blue-50')}`}>{s.isAbsent ? 'غائب' : `${Math.round(s.pct)}%`}</td>
                            </tr>
                        ))}
                        <tr className="bg-[#f0fdf4] h-10">
                            <td colSpan={2} className="border-2 border-black font-black text-right pr-4 text-green-900">عدد الطلبة المتقنين للمهارة</td>
                            <td colSpan={2} className="border-2 border-black text-center font-black bg-white"><div className="text-[9px] text-gray-500">المجموع</div><div>{totalMasteredCount}</div></td>
                            {data.skillStats.map((st: any, i: number) => (<td key={i} className="border-2 border-black font-black text-green-700">{st.masteredCount}</td>))}
                            <td rowSpan={2} className="border-2 border-black bg-white"><div className="text-[10px] font-bold text-gray-400 uppercase">مؤشر نسبة</div><div className="text-[10px] font-bold text-gray-400 uppercase">الإتقان</div><div className="text-sm font-black text-blue-700">{overallMastery}%</div></td>
                        </tr>
                        <tr className="bg-[#f0f9ff] h-10">
                            <td colSpan={2} className="border-2 border-black font-black text-right pr-4 text-blue-900">نسبة الطلبة المتقنين للمهارة</td>
                            <td colSpan={2} className="border-2 border-black text-center font-black bg-white"><div className="text-[9px] text-gray-500">النسبة</div><div>{overallMastery}%</div></td>
                            {data.skillStats.map((st: any, i: number) => (
                                <td key={i} className="border-2 border-black font-black text-blue-700">{Math.round(st.masteredPct * 10) / 10}%</td>
                            ))}
                        </tr>
                    </tbody>
                </table>
                <div className="bg-[#002e4d] text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-black"><div>معلم المادة / أ. {header?.teacherName}</div><div>مدير المدرسة / أ. {header?.schoolManager}</div></div>
            </div>
        </div>
    );
};

const FollowUpRecordReport = ({ record, data, header, classFilter, skillIndex, meta }: any) => {
    const skill = record.questions[skillIndex];
    const skillStat = data.skillStats[skillIndex];
    const enrichmentStudents = data.studentsList.filter((s: any) => !s.isAbsent && s.answers[skill.id] === '✔');
    const remedialStudents = data.studentsList.filter((s: any) => !s.isAbsent && s.answers[skill.id] === '✘');

    return (
        <div className="space-y-10">
            {/* الصفحة الأولى: سجل المتابعة وتصنيف الطلاب */}
            <div className="bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none break-after">
                <div className="min-w-[1000px] border-2 border-[#002e4d]">
                    <div className="p-4 border-b-2 border-black bg-gray-50">
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-right text-[11px] font-bold space-y-1">
                                <p>الإدارة العامة للتعليم بمنطقة {header?.educationAdmin}</p>
                                <p>مدرسة {header?.schoolName}</p>
                            </div>
                            <div className="bg-[#002e4d] text-white py-2 px-8 rounded-full font-black text-lg uppercase tracking-tighter">سجل الفاقد والنمو التعليمي</div>
                            <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-14" alt="moe"/></div>
                        </div>
                        <h2 className="text-center text-xl font-black text-[#002e4d] mb-4 uppercase">سجل متابعة مكتسبات المتعلمين والفاقد التعليمي لـ {record.examTitle}</h2>
                        
                        <div className="grid grid-cols-2 border-2 border-black font-black text-center text-sm">
                            <div className="border-l-2 border-black bg-yellow-50 p-2">الوحدة / الدرس <br/> <span className="text-[#002e4d]">{skill.unitName}</span></div>
                            <div className="bg-yellow-50 p-2">المهارة المستهدفة <br/> <span className="text-[#002e4d]">{skill.learningOutcome}</span></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2">
                        {/* تصنيف الإثراء */}
                        <div className="border-l-2 border-black">
                            <div className="bg-[#002e4d] text-white p-2 text-center text-xs font-black uppercase tracking-tighter">تصنيف المتعلمين ضمن البرنامج الإثرائي للمهارة المستهدفة</div>
                            <table className="w-full text-[10px] text-center font-bold">
                                <tbody>
                                    <tr className="border-b border-black">
                                        <td className="p-2 border-l border-black w-2/3">عدد المتعلمين الكلي</td>
                                        <td className="p-2">{skillStat.totalAttended}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="p-2 border-l border-black">عدد المتقنين للمهارة</td>
                                        <td className="p-2">{skillStat.masteredCount}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="p-2 border-l border-black bg-green-50 font-black">نسبة المتقنين للمهارة</td>
                                        <td className="p-2 bg-green-50 text-green-700 font-black">{Math.round(skillStat.masteredPct * 10) / 10}%</td>
                                    </tr>
                                    <tr className="border-b border-black h-24">
                                        <td className="p-2 border-l border-black">آلية إثراء المهارة للمتعلمين</td>
                                        <td className="p-2 text-right text-[9px] leading-relaxed whitespace-pre-wrap">
                                            {meta.enrichMechanism}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="bg-[#002e4d] text-white p-2 text-center text-[10px] font-black">بيانات التنفيذ</div>
                            <table className="w-full text-[10px] text-center border-b border-black">
                                <tbody>
                                    <tr className="border-b border-black"><td className="p-2 border-l border-black w-1/2">الأسبوع</td><td className="p-2">{meta.week}</td></tr>
                                    <tr className="border-b border-black"><td className="p-2 border-l border-black w-1/2">اليوم</td><td className="p-2">{meta.day}</td></tr>
                                    <tr className="border-b border-black"><td className="p-2 border-l border-black w-1/2">التاريخ</td><td className="p-2">{meta.date}</td></tr>
                                    <tr><td className="p-2 border-l border-black">عدد المستفيدين من البرنامج الإثرائي</td><td className="p-2">{enrichmentStudents.length}</td></tr>
                                </tbody>
                            </table>
                            <div className="bg-[#10b981] text-white p-2 text-center text-[10px] font-black">كشف بأسماء المستفيدين من البرنامج الإثرائي</div>
                            <div className="h-96 overflow-hidden">
                                <table className="w-full text-[10px] border-collapse">
                                    <tbody>
                                        {enrichmentStudents.map((s: any, idx: number) => (
                                            <tr key={idx} className="border-b border-black h-7">
                                                <td className="text-right pr-4 font-bold">{s.name}</td>
                                            </tr>
                                        ))}
                                        {Array.from({ length: Math.max(0, 15 - enrichmentStudents.length) }).map((_, i) => (
                                            <tr key={`empty-${i}`} className="border-b border-black h-7"><td></td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* تصنيف العلاج */}
                        <div>
                            <div className="bg-[#002e4d] text-white p-2 text-center text-xs font-black uppercase tracking-tighter">تصنيف المتعلمين ضمن البرنامج العلاجي للمهارة المستهدفة</div>
                            <table className="w-full text-[10px] text-center font-bold">
                                <tbody>
                                    <tr className="border-b border-black">
                                        <td className="p-2 border-l border-black w-2/3">عدد المتعلمين الكلي</td>
                                        <td className="p-2">{skillStat.totalAttended}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="p-2 border-l border-black">عدد الغير متقنين للمهارة</td>
                                        <td className="p-2">{skillStat.nonMasteredCount}</td>
                                    </tr>
                                    <tr className="border-b border-black">
                                        <td className="p-2 border-l border-black bg-orange-50 font-black">نسبة الغير متقنين للمهارة</td>
                                        <td className="p-2 bg-orange-50 text-orange-700 font-black">{Math.round(skillStat.nonMasteredPct * 10) / 10}%</td>
                                    </tr>
                                    <tr className="border-b border-black h-24">
                                        <td className="p-2 border-l border-black">آلية معالجة الفاقد التعليمي</td>
                                        <td className="p-2 text-right text-[9px] leading-relaxed whitespace-pre-wrap">
                                            {meta.remedialMechanism}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="bg-[#002e4d] text-white p-2 text-center text-[10px] font-black">بيانات التنفيذ</div>
                            <table className="w-full text-[10px] text-center border-b border-black">
                                <tbody>
                                    <tr className="border-b border-black"><td className="p-2 border-l border-black w-1/2">الأسبوع</td><td className="p-2">{meta.week}</td></tr>
                                    <tr className="border-b border-black"><td className="p-2 border-l border-black w-1/2">اليوم</td><td className="p-2">{meta.day}</td></tr>
                                    <tr className="border-b border-black"><td className="p-2 border-l border-black w-1/2">التاريخ</td><td className="p-2">{meta.date}</td></tr>
                                    <tr><td className="p-2 border-l border-black">عدد المستفيدين من البرنامج العلاجي</td><td className="p-2">{remedialStudents.length}</td></tr>
                                </tbody>
                            </table>
                            <div className={`bg-orange-600 text-white p-2 text-center text-[10px] font-black`}>كشف بأسماء المستفيدين من البرنامج العلاجي</div>
                            <div className="h-96 overflow-hidden">
                                <table className="w-full text-[10px] border-collapse">
                                    <tbody>
                                        {remedialStudents.map((s: any, idx: number) => (
                                            <tr key={idx} className="border-b border-black h-7">
                                                <td className="text-right pr-4 font-bold">{s.name}</td>
                                            </tr>
                                        ))}
                                        {Array.from({ length: Math.max(0, 15 - remedialStudents.length) }).map((_, i) => (
                                            <tr key={`empty-${i}`} className="border-b border-black h-7"><td></td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-orange-400 p-4 border-t-2 border-black flex justify-between items-center text-black font-black text-xs">
                        <div className="flex items-center gap-2">عينة من شواهد تطبيق البرامج الإثرائية والعلاجية للمتعلمين <ArrowRight size={14}/></div>
                        <div className="flex gap-10">
                            <div>معلم المادة / أ. {header?.teacherName}</div>
                            <div>مدير المدرسة / أ. {header?.schoolManager}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* الصفحة الثانية: شواهد البرامج الإثرائية والعلاجية */}
            <div className="bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
                <div className="min-w-[1000px] border-2 border-[#002e4d] h-full flex flex-col">
                    <div className="bg-[#002e4d] text-white p-6 text-center border-b-2 border-black">
                        <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">شواهد البرامج الإثرائية والعلاجية للمتعلمين وفق المهارة المستهدفة</h2>
                    </div>
                    
                    <div className="grid grid-cols-2 border-b-2 border-black font-black text-center text-sm">
                        <div className="border-l-2 border-black bg-yellow-50 p-3 flex flex-col justify-center items-center">الوحدة / الدرس <br/> <span className="text-[#002e4d]">{skill.unitName}</span></div>
                        <div className="bg-yellow-50 p-3 flex flex-col justify-center items-center">المهارة المستهدفة <br/> <span className="text-[#002e4d]">{skill.learningOutcome}</span></div>
                    </div>

                    <div className="bg-[#10b981] text-white p-2 text-center text-xs font-black">شواهد البرامج الإثرائية</div>
                    <table className="w-full border-collapse text-center table-fixed">
                        <thead>
                            <tr className="bg-gray-100 font-black text-[10px] h-10 border-b border-black">
                                <th className="border-l border-black w-1/4">الأسبوع</th>
                                <th className="border-l border-black w-1/4">اليوم</th>
                                <th className="border-l border-black w-1/2">أبرز الشواهد (رقمية / ورقية)</th>
                            </tr>
                        </thead>
                        <tbody className="text-[11px] font-bold">
                            <tr className="h-12 border-b border-black">
                                <td className="border-l border-black">{meta.week}</td>
                                <td className="border-l border-black">{meta.day}</td>
                                <td className="text-right px-4 whitespace-pre-wrap">{meta.enrichMechanism}</td>
                            </tr>
                            <tr className="h-40 border-b border-black">
                                <td className="border-l border-black"></td><td className="border-l border-black"></td><td></td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="bg-orange-700 text-white p-2 text-center text-xs font-black">شواهد البرامج العلاجية</div>
                    <table className="w-full border-collapse text-center table-fixed">
                        <thead>
                            <tr className="bg-gray-100 font-black text-[10px] h-10 border-b border-black">
                                <th className="border-l border-black w-1/4">الأسبوع</th>
                                <th className="border-l border-black w-1/4">اليوم</th>
                                <th className="border-l border-black w-1/2">أبرز الشواهد (رقمية / ورقية)</th>
                            </tr>
                        </thead>
                        <tbody className="text-[11px] font-bold">
                            <tr className="h-12 border-b border-black">
                                <td className="border-l border-black">{meta.week}</td>
                                <td className="border-l border-black">{meta.day}</td>
                                <td className="text-right px-4 whitespace-pre-wrap">{meta.remedialMechanism}</td>
                            </tr>
                            <tr className="h-40 border-b border-black">
                                <td className="border-l border-black"></td><td className="border-l border-black"></td><td></td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="flex-1 min-h-[100px] border-t-2 border-black flex">
                        <div className="w-48 bg-yellow-50 font-black text-xs flex items-center justify-center border-l-2 border-black">الملاحظات</div>
                        <div className="flex-1 p-4 text-right text-xs font-bold whitespace-pre-wrap">{meta.notes}</div>
                    </div>
                    <div className="min-h-[100px] border-t border-black flex">
                        <div className="w-48 bg-yellow-50 font-black text-xs flex items-center justify-center border-l-2 border-black">التوصيات</div>
                        <div className="flex-1 p-4 text-right text-xs font-bold whitespace-pre-wrap">{meta.recommendations}</div>
                    </div>

                    <div className="bg-[#002e4d] text-white p-6 grid grid-cols-2 text-center text-xs font-black">
                        <div>معلم المادة / أ. {header?.teacherName}</div>
                        <div>مدير المدرسة / أ. {header?.schoolManager}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const LearningOutcomesReport = ({ record, data, header, classFilter }: any) => {
    return (
        <div className="bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none max-w-4xl mx-auto">
            <div className="border-2 border-[#002e4d]">
                <div className="bg-[#002e4d] text-white p-6 text-center border-b-2 border-black">
                    <h2 className="text-3xl font-black mb-4">نواتج التعلم المستهدفة</h2>
                    <h3 className="text-xl font-bold opacity-90">وفق {record.examTitle}</h3>
                </div>
                <table className="w-full border-collapse text-center table-fixed">
                    <thead>
                        <tr className="bg-[#00c897] text-white font-black text-sm h-12">
                            <th className="border-2 border-[#002e4d] w-12">م</th>
                            <th className="border-2 border-[#002e4d] w-48">الوحدة / الدرس</th>
                            <th className="border-2 border-[#002e4d]">المهارة المستهدفة</th>
                        </tr>
                    </thead>
                    <tbody className="font-bold text-sm">
                        {record.questions.map((q: any, idx: number) => (
                            <tr key={idx} className="h-11 border-b-2 border-[#002e4d] hover:bg-gray-50 transition-colors">
                                <td className="border-l-2 border-r-2 border-[#002e4d] bg-[#00c897] text-white font-black">{idx + 1}</td>
                                <td className="border-l-2 border-r-2 border-[#002e4d] text-gray-700 px-2 truncate">{q.unitName || 'الوحدة الأولى'}</td>
                                <td className="border-l-2 border-r-2 border-[#002e4d] text-right px-4 text-gray-900">{q.learningOutcome}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="bg-[#ffc107] p-4 text-center border-t-2 border-[#002e4d] font-black text-lg text-black">الإحصائية العامة لجميع المهارات</div>
                <div className="grid grid-cols-2 text-center font-black">
                    <div className="border-l-2 border-[#002e4d] bg-[#dcfce7] p-6"><div className="text-[#166534] mb-2 text-xl">نسبة المهارات المكتسبة</div><div className="text-3xl text-green-700">{data.overallMasteryPct.toFixed(2)}%</div></div>
                    <div className="bg-[#ffedd5] p-6"><div className="text-[#9a3412] mb-2 text-xl">نسبة المهارات المفقودة</div><div className="text-3xl text-orange-700">{(100 - data.overallMasteryPct).toFixed(2)}%</div></div>
                </div>
                <div className="bg-[#002e4d] text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-[#002e4d]"><div>معلم المادة / أ. {header?.teacherName}</div><div>مدير المدرسة / أ. {header?.schoolManager}</div></div>
            </div>
        </div>
    );
};

const ClassificationReport = ({ record, data, header, classFilter }: any) => {
    return (
        <div className="bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
            <div className="min-w-[1000px] border-2 border-[#002e4d]">
                <div className="p-4 border-b-2 border-[#002e4d]">
                    <div className="bg-[#002e4d] text-white py-2 px-6 rounded-full w-fit mx-auto font-black text-lg mb-4">مدرسة {header?.schoolName}</div>
                    <div className="flex justify-between items-center px-4 font-black text-[#002e4d] text-sm"><div className="flex-1 text-right">كشف تصنيف المتعلمين وفق احتياجاتهم</div><div className="flex-1 text-center">المادة/ {header?.subjectSpecialty || 'علوم الأرض والفضاء'}</div><div className="flex-1 text-center">الصف/ {data.gradeName} {classFilter || record.className}</div><div className="flex-1 text-left">الفصل الدراسي / {header?.term} {header?.academicYear}</div></div>
                </div>
                <table className="w-full border-collapse text-center table-fixed">
                    <thead>
                        <tr className="bg-[#004d4d] text-white font-black text-xs h-12">
                            <th className="border border-white w-10">م</th><th className="border border-white w-48 text-right pr-4">اسم الطالب</th><th className="border border-white w-24">الدرجة العظمى</th><th className="border border-white w-24">النسبة المكتسبة</th><th className="border border-white w-72">تحليل مستوى المتعلم</th><th colSpan={2} className="border border-white bg-[#004d4d]">احتياجات المتعلم التعليمية</th>
                        </tr>
                        <tr className="bg-[#004d4d] text-white font-black text-[10px] h-10">
                            <th colSpan={2} className="border border-white bg-white"></th><th className="border border-white bg-[#004d4d]">{record.questions.length}</th><th className="border border-white bg-[#004d4d]">100%</th><th className="border border-white bg-[#004d4d]"></th><th className="border border-white w-24">برنامج إثرائي</th><th className="border border-white w-24">برنامج علاجي</th>
                        </tr>
                    </thead>
                    <tbody className="font-bold text-[11px]">
                        {data.studentsList.map((s: any, idx: number) => (
                            <tr key={s.sid} className={`h-10 hover:bg-gray-50 border-b border-[#002e4d] ${s.isAbsent ? 'bg-gray-100 opacity-60' : ''}`}>
                                <td className="border-x border-[#002e4d] bg-gray-50">{idx + 1}</td><td className="border-x border-[#002e4d] text-right pr-3 font-black text-gray-800">{s.name}</td><td className="border-x border-[#002e4d] font-black">{s.isAbsent ? '-' : s.score}</td><td className={`border-x border-[#002e4d] font-black ${s.isAbsent ? 'text-gray-400' : (s.pct < 50 ? 'text-red-600' : (s.pct >= 90 ? 'text-green-600' : (s.pct >= 75 ? 'text-blue-600' : 'text-orange-500')))}`}>{s.isAbsent ? 'غائب' : `${Math.round(s.pct * 100) / 100}%`}</td><td className={`border-x border-[#002e4d] text-right px-3 ${s.pct >= 90 ? 'text-green-600' : s.pct >= 75 ? 'text-blue-600' : s.pct >= 50 ? 'text-orange-500' : 'text-red-600'}`}>{s.isAbsent ? '-' : s.levelDesc}</td><td className="border-x border-[#002e4d] text-center">{!s.isAbsent && s.program === 'ENRICHMENT' && <CheckCircle className="mx-auto text-green-600" size={16}/>}</td><td className="border-x border-[#002e4d] text-center">{!s.isAbsent && s.program === 'REMEDIAL' && <CheckCircle className="mx-auto text-green-600" size={16}/>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="bg-[#002e4d] text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-black"><div>معلم المادة / أ. {header?.teacherName}</div><div>مدير المدرسة / أ. {header?.schoolManager}</div></div>
            </div>
        </div>
    );
};

const DiagnosticAnalysis = ({ record, data, header, classFilter }: any) => {
    const masteredPct = Math.round(data.overallMasteryPct * 10) / 10;
    const nonMasteredPct = Math.round((100 - data.overallMasteryPct) * 10) / 10;
    return (
        <div className="max-w-[210mm] mx-auto bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
            <div className="border-2 border-black">
                <div className="bg-[#003366] text-white p-4 flex justify-between items-center border-b-2 border-black">
                    <div className="text-right text-[11px] font-bold space-y-1"><p>الإدارة العامة للتعليم بمنطقة {header?.educationAdmin}</p><p>مدرسة {header?.schoolName}</p></div>
                    <div className="text-center"><h2 className="text-xl font-black mb-1 uppercase tracking-tighter">تحليل نتائج المتعلمين - {record.examTitle}</h2><p className="text-xs font-bold opacity-80">تحليل المهارات ونسب التحصيل</p></div>
                    <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
                </div>
                <div className="bg-gray-50 border-b-2 border-black grid grid-cols-5 text-[10px] font-black p-3 text-[#003366] text-center uppercase">
                    <div className="border-l border-black/20">المادة: {header?.subjectSpecialty || 'المادة الدراسية'}</div><div className="border-l border-black/20">الصف: {data.gradeName}</div><div className="border-l border-black/20">الفصل: {classFilter || record.className}</div><div className="border-l border-black/20">الفصل الدراسي: {header?.term}</div><div>العام الدراسي: {header?.academicYear}</div>
                </div>
                <div className="p-4 space-y-8 bg-white">
                    <div className="border border-black/10 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-[#003366] text-white p-2 text-center text-xs font-black uppercase">الرسم البياني للتحصيل الدراسي حسب المتعلمين</div>
                        <div className="h-64 p-4"><ResponsiveContainer width="100%" height="100%"><ReBarChart data={data.studentsList} layout="horizontal"><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" hide/><YAxis domain={[0, 100]} unit="%"/><Tooltip/><ReBar dataKey="pct" barSize={10} radius={[2, 2, 0, 0]}>{data.studentsList.map((e:any, i:number) => (<Cell key={i} fill={e.color}/>))}</ReBar></ReBarChart></ResponsiveContainer></div>
                    </div>
                    <div className="border border-black/10 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-[#003366] text-white p-2 text-center text-xs font-black uppercase">الرسم البياني للتحصيل الدراسي وفق المهارات المستهدفة</div>
                        <div className="h-64 p-4"><ResponsiveContainer width="100%" height="100%"><ReBarChart data={data.skillStats} margin={{top:20}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" hide/><YAxis domain={[0, 100]} unit="%"/><Tooltip/><ReBar dataKey="masteredPct" barSize={25} fill="#f59e0b" radius={[4, 4, 0, 0]}/></ReBarChart></ResponsiveContainer></div>
                    </div>
                </div>
                <div className="grid grid-cols-4 border-t-2 border-black text-center text-[10px] font-black uppercase">
                    <div className="border-l-2 border-black p-3 bg-blue-50/50">عدد المتعلمين الكلي <div className="text-xl mt-1">{data.totalStudentsAttended}</div></div><div className="border-l-2 border-black p-3 bg-blue-50/50">مجموع المهارات <div className="text-xl mt-1">{data.totalPossibleSkills}</div></div><div className="border-l-2 border-black p-3 bg-green-50">عدد المهارات المتقنة <div className="text-xl text-green-700 mt-1">{data.totalMasteredSkills}</div></div><div className="p-3 bg-red-50">عدد المهارات الغير متقنة <div className="text-xl text-red-600 mt-1">{data.totalPossibleSkills - data.totalMasteredSkills}</div></div>
                </div>
                <div className="border-t-2 border-black bg-white overflow-hidden">
                    <div className="flex border-b border-black h-12">
                        <div className="w-1/4 p-3 bg-[#003366] text-white text-center font-black text-xs border-l border-black flex items-center justify-center">مؤشر المهارات المتقنة</div>
                        <div className="w-3/4 p-2 bg-white flex items-center justify-center relative"><div className="w-full h-8 bg-green-50 rounded-full border border-green-200 overflow-hidden flex items-center"><div className="h-full bg-[#10b981] transition-all" style={{ width: `${masteredPct}%` }}></div><span className="absolute inset-0 flex items-center justify-center font-black text-sm text-green-900" style={{ textShadow: '0 0 2px white' }}>{masteredPct}%</span></div></div>
                    </div>
                    <div className="flex h-12">
                        <div className="w-1/4 p-3 bg-[#003366] text-white text-center font-black text-xs border-l border-black flex items-center justify-center">مؤشر المهارات الغير متقنة</div>
                        <div className="w-3/4 p-2 bg-white flex items-center justify-center relative"><div className="w-full h-8 bg-red-50 rounded-full border border-red-200 overflow-hidden flex items-center"><div className="h-full bg-[#ef4444] transition-all" style={{ width: `${nonMasteredPct}%` }}></div><span className="absolute inset-0 flex items-center justify-center font-black text-sm text-red-900" style={{ textShadow: '0 0 2px white' }}>{nonMasteredPct}%</span></div></div>
                    </div>
                </div>
                <div className="bg-[#003366] text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-black"><div>معلم المادة / أ. {header?.teacherName}</div><div>مدير المدرسة / أ. {header?.schoolManager}</div></div>
            </div>
        </div>
    );
};

export default FormsAnalyzer;
