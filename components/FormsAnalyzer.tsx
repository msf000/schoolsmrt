
import React, { useState, useMemo, useEffect } from 'react';
import { saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult, getReportHeaderConfig } from '../services/storageService';
import { getWorkbookStructure, getSheetHeadersAndData } from '../services/excelService';
import { GoogleGenAI } from "@google/genai";
import { 
    FileSpreadsheet, Loader2, Upload, ListFilter, Target, Save, ArrowLeft, Trash2, 
    BarChart2, Sparkles, Printer, Filter, GitCompare, Wand2, CheckCircle, 
    PlusCircle, History, LayoutGrid, ArrowRightLeft, UserCheck, BookOpen, ArrowRight, ClipboardCheck, Users, Bookmark
} from 'lucide-react';
import { Student, FormsDetailedResult, ReportHeaderConfig } from '../types';
import { ResponsiveContainer, BarChart as ReBarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface Props {
    students: Student[];
    currentUserId?: string;
}

const FormsAnalyzer: React.FC<Props> = ({ students, currentUserId }) => {
    const [mainTab, setMainTab] = useState<'NEW' | 'HISTORY' | 'COMPARE'>('HISTORY');
    const [selectedRecord, setSelectedRecord] = useState<FormsDetailedResult | null>(null);
    const [historyViewTab, setHistoryViewTab] = useState<'KASHF' | 'ANALYSIS' | 'CLASSIFICATION' | 'SKILLS'>('KASHF');
    const [comparisonTab, setComparisonTab] = useState<'STUDENTS' | 'SKILLS'>('STUDENTS');
    const [compareId1, setCompareId1] = useState('');
    const [compareId2, setCompareId2] = useState('');
    const [loading, setLoading] = useState(false);
    const [fileData, setFileData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [examTitle, setExamTitle] = useState('');
    const [outcomesMapping, setOutcomesMapping] = useState<Record<string, string>>({});
    const [unitsMapping, setUnitsMapping] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<FormsDetailedResult[]>([]);
    const [reportClassFilter, setReportClassFilter] = useState('');
    const headerConfig = useMemo(() => getReportHeaderConfig(currentUserId), [currentUserId]);

    useEffect(() => {
        if (currentUserId) {
            setHistory(getFormsDetailedResults(currentUserId));
        }
    }, [currentUserId, isSaving, mainTab]);

    // دالة محسنة جداً لجلب كافة الأسئلة (النقاط) مع استبعاد أسئلة البيانات والأسماء
    const getQuestionHeaders = (allHeaders: string[]) => {
        return allHeaders.filter(h => {
            const hTrim = h.trim();
            const isPointCol = hTrim.startsWith('النقاط -') || hTrim.startsWith('Points -');
            const isGrandTotal = hTrim === 'إجمالي النقاط' || hTrim === 'Total Points';
            
            // التأكد من استبعاد أسئلة الاسم والفصل بشكل صريح
            const isMetadata = hTrim.includes('اسم') || hTrim.includes('فصل') || hTrim.includes('الرقم') || hTrim.includes('الهوية');

            return isPointCol && !isGrandTotal && !isMetadata;
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
            const prompt = `حلل الأسئلة التالية واستنتج المهارة التعليمية والوحدة لكل سؤال باختصار. 
            أرجع النتيجة بتنسيق JSON: {"items": [{"skill": "...", "unit": "..."}]}`;
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
                id: `forms_${Date.now()}`,
                examTitle,
                className: students.find(s => Object.keys(studentResponses).includes(s.id))?.className || 'عام',
                date: new Date().toISOString(),
                teacherId: currentUserId,
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
        const allInClass = students.filter(s => s.className === targetClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        
        const gradeName = allInClass.length > 0 ? (allInClass[0].gradeLevel || 'غير محدد') : (record.className || 'غير محدد');

        let totalPossibleSkills = 0;
        let totalMasteredSkills = 0;
        let totalStudentsAttended = 0;

        const studentsList = allInClass.map(s => {
            const res = record.studentResponses[s.id];
            const pct = res ? (res.score / record.questions.length) * 100 : 0;
            
            let color = '#ef4444';
            if (pct >= 90) color = '#10b981';
            else if (pct >= 75) color = '#3b82f6';
            else if (pct >= 50) color = '#f59e0b';

            let masteredCount = 0;
            let unmasteredCount = 0;

            let levelDesc = "";
            let program = "";
            if (res) {
                totalStudentsAttended++;
                totalPossibleSkills += record.questions.length;
                totalMasteredSkills += res.score;
                
                Object.values(res.answers).forEach(val => {
                    if (val === '✔') masteredCount++;
                    else unmasteredCount++;
                });

                if (pct >= 90) {
                    levelDesc = "أداء المتعلم متقدم وحلوله إبداعية للمسائل";
                    program = "ENRICHMENT";
                } else if (pct >= 75) {
                    levelDesc = "لدى المتعلم تميز نسبي في حل المسائل متوسطة المستوى";
                    program = "ENRICHMENT";
                } else if (pct >= 50) {
                    levelDesc = "لدى المتعلم خلل في نواتج التعلم وضعف في التأسيس";
                    program = "REMEDIAL";
                } else {
                    levelDesc = "يحتاج المتعلم إلى تحسين كبير";
                    program = "REMEDIAL";
                }
            }

            return { 
                sid: s.id, name: s.name, score: res?.score || 0, pct, color, isAbsent: !res,
                answers: res?.answers || {}, masteredCount, unmasteredCount,
                levelDesc, program
            };
        });

        const skillStats = record.questions.map(q => {
            let mastered = 0;
            let attended = 0;
            studentsList.forEach(s => { if (!s.isAbsent) { attended++; if (s.answers[q.id] === '✔') mastered++; } });
            return { 
                id: q.id, 
                name: q.learningOutcome, 
                unit: q.unitName || 'غير محدد',
                masteredCount: mastered,
                nonMasteredCount: attended - mastered,
                masteredPct: attended > 0 ? (mastered / attended) * 100 : 0,
                nonMasteredPct: attended > 0 ? ((attended - mastered) / attended) * 100 : 0
            };
        });

        const overallMasteryPct = totalPossibleSkills > 0 ? (totalMasteredSkills / totalPossibleSkills) * 100 : 0;

        return { 
            studentsList, 
            skillStats, 
            totalPossibleSkills, 
            totalMasteredSkills, 
            totalStudents: allInClass.length,
            totalStudentsAttended,
            overallMasteryPct,
            gradeName
        };
    };

    const activeClassesForRecord = (record: FormsDetailedResult) => {
        const classes = new Set<string>();
        Object.keys(record.studentResponses).forEach(sid => {
            const s = students.find(x => x.id === sid);
            if (s?.className) classes.add(s.className);
        });
        return Array.from(classes).sort();
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex bg-white p-1 rounded-2xl border shadow-sm mb-6 print:hidden">
                <button onClick={() => setMainTab('NEW')} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${mainTab === 'NEW' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><PlusCircle size={18}/> تحليل جديد</button>
                <button onClick={() => setMainTab('HISTORY')} className={`flex-1 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all ${mainTab === 'HISTORY' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}><History size={18}/> سجل النتائج</button>
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
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><ListFilter className="text-orange-500"/> ربط الأسئلة بنواتج التعلم (عدد الأسئلة: {getQuestionHeaders(headers).length})</h3>
                                    <button onClick={handleAutoGenerateSkills} disabled={isAiProcessing} className="bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:bg-purple-700">
                                        {isAiProcessing ? <Loader2 className="animate-spin" size={14}/> : <Wand2 size={14}/>} استخراج المهارات ذكياً ✨
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                                    {getQuestionHeaders(headers).map((h, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-2xl border p-4">
                                            <p className="text-xs font-bold text-gray-500 mb-2">س{idx+1}: {h.replace(/^(النقاط - )/, '')}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <div className="flex items-center gap-2 bg-white border rounded-xl p-2">
                                                    <Bookmark size={14} className="text-teal-500"/><input className="flex-1 text-xs outline-none font-bold text-teal-900" placeholder="الوحدة / الدرس..." value={unitsMapping[h] || ''} onChange={e => setUnitsMapping({...unitsMapping, [h]: e.target.value})} />
                                                </div>
                                                <div className="flex items-center gap-2 bg-white border rounded-xl p-2">
                                                    <Target size={14} className="text-indigo-500"/><input className="flex-1 text-xs outline-none font-bold text-indigo-900" placeholder="المهارة المستهدفة..." value={outcomesMapping[h] || ''} onChange={e => setOutcomesMapping({...outcomesMapping, [h]: e.target.value})} />
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
                                <p className="text-xs text-gray-400 font-bold">{record.className} • {Object.keys(record.studentResponses).length} طالب • {record.questions.length} سؤال</p>
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
                                    <TabBtnView label="نواتج التعلم" active={historyViewTab==='SKILLS'} onClick={()=>setHistoryViewTab('SKILLS')}/>
                                    <TabBtnView label="تحليل النتائج" active={historyViewTab==='ANALYSIS'} onClick={()=>setHistoryViewTab('ANALYSIS')}/>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <select className="bg-white border p-2 rounded-xl text-xs font-black text-indigo-700 outline-none" value={reportClassFilter} onChange={e => setReportClassFilter(e.target.value)}>
                                    <option value="">كل الفصول</option>
                                    {activeClassesForRecord(selectedRecord).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={()=>window.print()} className="bg-gray-800 text-white px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg"><Printer size={16}/> طباعة</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {historyViewTab === 'KASHF' && <KashfReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                            {historyViewTab === 'ANALYSIS' && <DiagnosticAnalysis record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                            {historyViewTab === 'CLASSIFICATION' && <ClassificationReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                            {historyViewTab === 'SKILLS' && <LearningOutcomesReport record={selectedRecord} data={getReportData(selectedRecord, reportClassFilter)} header={headerConfig} classFilter={reportClassFilter} />}
                        </div>
                    </div>
                )
            )}
            <style>{` .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); } @media print { @page { size: landscape; margin: 0.5cm; } body { background: white !important; } .print\\:hidden { display: none !important; } } `}</style>
        </div>
    );
};

const TabBtnView = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-[11px] font-black transition-all ${active ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>{label}</button>
);

const KashfReport = ({ record, data, header, classFilter }: any) => {
    const totalMasteredCount = data.studentsList.reduce((acc: number, s: any) => acc + (s.isAbsent ? 0 : s.masteredCount), 0);
    const totalNonMasteredCount = data.studentsList.reduce((acc: number, s: any) => acc + (s.isAbsent ? 0 : s.unmasteredCount), 0);
    const overallMastery = Math.round(data.overallMasteryPct * 10) / 10;

    return (
        <div className="bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
            <div className="min-w-[1300px] border-2 border-black">
                <div className="bg-[#002e4d] text-white p-4 flex justify-between items-center border-b-2 border-black">
                    <div className="text-right text-[11px] font-bold space-y-1">
                        <p>الإدارة العامة للتعليم بمنطقة {header?.educationAdmin}</p>
                        <p>مدرسة {header?.schoolName}</p>
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-black mb-1 uppercase">كشف رصد درجات {record.examTitle}</h2>
                        <p className="text-xs opacity-80 font-bold">رصد مهارات المتعلمين المادة/ {header?.subjectSpecialty || 'علوم الأرض والفضاء'}</p>
                    </div>
                    <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
                </div>
                
                <div className="bg-gray-50 border-b-2 border-black grid grid-cols-5 text-xs font-black p-3 text-gray-900 text-center uppercase">
                    <div className="border-l border-black/10 font-bold">المادة / {header?.subjectSpecialty || 'علوم الأرض والفضاء'}</div>
                    <div className="border-l border-black/10 font-bold">الصف / {data.gradeName}</div>
                    <div className="border-l border-black/10 font-bold">الفصل / {classFilter || record.className}</div>
                    <div className="border-l border-black/10 font-bold">الفصل الدراسي / {header?.term}</div>
                    <div className="font-bold">العام الدراسي / {header?.academicYear}</div>
                </div>

                <table className="w-full border-collapse text-[11px] text-center table-fixed">
                    <thead className="bg-[#e6f3ff] font-black">
                        <tr>
                            <th rowSpan={2} className="border-2 border-black w-10">م</th>
                            <th rowSpan={2} className="border-2 border-black w-56 text-right pr-4">اسم الطالب</th>
                            <th colSpan={2} className="border-2 border-black w-24 bg-[#f0f9ff]">عدد المهارات</th>
                            <th colSpan={record.questions.length} className="border-2 border-black p-2 text-xs uppercase tracking-tighter">رصد المهارات للمتعلمين</th>
                            <th rowSpan={2} className="border-2 border-black w-20 bg-white">نسبة الإتقان للمهارات 100%</th>
                        </tr>
                        <tr className="bg-gray-50 h-40">
                            <th className="border-2 border-black w-12 text-green-700 bg-green-50">المتقنة</th>
                            <th className="border-2 border-black w-12 text-orange-700 bg-orange-50">الغير متقنة</th>
                            {record.questions.map((q: any, i: number) => (
                                <th key={i} className="border-2 border-black w-10 p-0 relative">
                                    <div className="vertical-text absolute inset-0 flex items-center justify-center font-bold px-1 text-[9px] leading-tight">{q.learningOutcome}</div>
                                </th>
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
                                    <td key={q.id} className={`border-2 border-black font-black text-sm ${s.isAbsent ? 'text-gray-300' : (s.answers[q.id] === '✔' ? 'text-green-600' : 'text-red-500')}`}>
                                        {s.isAbsent ? '-' : (s.answers[q.id] || '✘')}
                                    </td>
                                ))}
                                <td className={`border-2 border-black font-black ${s.isAbsent ? 'text-gray-400' : (s.pct < 60 ? 'text-red-600 bg-red-50' : 'text-blue-700 bg-blue-50')}`}>
                                    {s.isAbsent ? 'غائب' : `${Math.round(s.pct)}%`}
                                </td>
                            </tr>
                        ))}
                        
                        {/* تذييل الجدول الإحصائي */}
                        <tr className="bg-[#f0fdf4] h-10">
                            <td colSpan={2} className="border-2 border-black font-black text-right pr-4 text-green-900">عدد الطلبة المتقنين للمهارة</td>
                            <td colSpan={2} className="border-2 border-black text-center font-black bg-white">
                                <div className="text-[9px] text-gray-500">المجموع</div>
                                <div>{totalMasteredCount}</div>
                            </td>
                            {data.skillStats.map((st: any, i: number) => (
                                <td key={i} className="border-2 border-black font-black text-green-700">{st.masteredCount}</td>
                            ))}
                            <td rowSpan={2} className="border-2 border-black bg-white">
                                <div className="text-[10px] font-bold text-gray-400 uppercase">مؤشر نسبة</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase">الإتقان</div>
                                <div className="text-sm font-black text-blue-700">{overallMastery}%</div>
                            </td>
                        </tr>
                        
                        <tr className="bg-[#f0f9ff] h-10">
                            <td colSpan={2} className="border-2 border-black font-black text-right pr-4 text-blue-900">نسبة الطلبة المتقنين للمهارة</td>
                            <td colSpan={2} className="border-2 border-black text-center font-black bg-white">
                                <div className="text-[9px] text-gray-500">النسبة</div>
                                <div>{overallMastery}%</div>
                            </td>
                            {data.skillStats.map((st: any, i: number) => (
                                <td key={i} className="border-2 border-black font-black text-blue-700">{Math.round(st.masteredPct * 10) / 10}%</td>
                            ))}
                        </tr>

                        <tr className="bg-[#fff7ed] h-10">
                            <td colSpan={2} className="border-2 border-black font-black text-right pr-4 text-orange-900">عدد الطلبة الغير متقنين للمهارة</td>
                            <td colSpan={2} className="border-2 border-black text-center font-black bg-white">
                                <div className="text-[9px] text-gray-500">المجموع</div>
                                <div>{totalNonMasteredCount}</div>
                            </td>
                            {data.skillStats.map((st: any, i: number) => (
                                <td key={i} className="border-2 border-black font-black text-orange-700">{st.nonMasteredCount}</td>
                            ))}
                            <td rowSpan={2} className="border-2 border-black bg-white">
                                <div className="text-[10px] font-bold text-gray-400 uppercase">النسبة</div>
                                <div className="text-sm font-black text-orange-600">{Math.round((100 - overallMastery) * 10) / 10}%</div>
                            </td>
                        </tr>

                        <tr className="bg-[#fff7ed] h-10">
                            <td colSpan={2} className="border-2 border-black font-black text-right pr-4 text-orange-900">نسبة الطلبة الغير متقنين للمهارة</td>
                            <td colSpan={2} className="border-2 border-black text-center font-black bg-white">
                                <div className="text-[9px] text-gray-500">النسبة</div>
                                <div>{Math.round((100 - overallMastery) * 10) / 10}%</div>
                            </td>
                            {data.skillStats.map((st: any, i: number) => (
                                <td key={i} className="border-2 border-black font-black text-orange-700">{Math.round(st.nonMasteredPct * 10) / 10}%</td>
                            ))}
                        </tr>
                    </tbody>
                </table>
                
                <div className="bg-[#002e4d] text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-black">
                    <div>معلم المادة / أ. {header?.teacherName}</div>
                    <div>مدير المدرسة / أ. {header?.schoolManager}</div>
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
                        {/* صفوف فارغة لتكملة الشكل الجمالي إذا لزم الأمر */}
                        {record.questions.length < 5 && Array.from({length: 5 - record.questions.length}).map((_, i) => (
                             <tr key={`empty-${i}`} className="h-11 border-b-2 border-[#002e4d]">
                                <td className="border-l-2 border-r-2 border-[#002e4d] bg-[#00c897]"></td>
                                <td className="border-l-2 border-r-2 border-[#002e4d]"></td>
                                <td className="border-l-2 border-r-2 border-[#002e4d]"></td>
                             </tr>
                        ))}
                    </tbody>
                </table>

                {/* تذييل الإحصائية العامة */}
                <div className="bg-[#ffc107] p-4 text-center border-t-2 border-[#002e4d] font-black text-lg text-black">
                    الإحصائية العامة لجميع المهارات
                </div>
                
                <div className="grid grid-cols-2 text-center font-black">
                    <div className="border-l-2 border-[#002e4d] bg-[#dcfce7] p-6">
                        <div className="text-[#166534] mb-2 text-xl">نسبة المهارات المكتسبة</div>
                        <div className="text-3xl text-green-700">{data.overallMasteryPct.toFixed(2)}%</div>
                    </div>
                    <div className="bg-[#ffedd5] p-6">
                        <div className="text-[#9a3412] mb-2 text-xl">نسبة المهارات المفقودة</div>
                        <div className="text-3xl text-orange-700">{(100 - data.overallMasteryPct).toFixed(2)}%</div>
                    </div>
                </div>

                <div className="bg-[#002e4d] text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-[#002e4d]">
                    <div>معلم المادة / أ. {header?.teacherName}</div>
                    <div>مدير المدرسة / أ. {header?.schoolManager}</div>
                </div>
            </div>
        </div>
    );
};

const ClassificationReport = ({ record, data, header, classFilter }: any) => {
    return (
        <div className="bg-white p-6 shadow-2xl overflow-x-auto print:p-0 print:shadow-none">
            <div className="min-w-[1000px] border-2 border-[#002e4d]">
                {/* Header Section */}
                <div className="p-4 border-b-2 border-[#002e4d]">
                    <div className="bg-[#002e4d] text-white py-2 px-6 rounded-full w-fit mx-auto font-black text-lg mb-4">مدرسة {header?.schoolName}</div>
                    <div className="flex justify-between items-center px-4 font-black text-[#002e4d] text-sm">
                        <div className="flex-1 text-right">كشف تصنيف المتعلمين وفق احتياجاتهم</div>
                        <div className="flex-1 text-center">المادة/ {header?.subjectSpecialty || 'علوم الأرض والفضاء'}</div>
                        <div className="flex-1 text-center">الصف/ {data.gradeName} {classFilter || record.className}</div>
                        <div className="flex-1 text-left">الفصل الدراسي / {header?.term} {header?.academicYear}</div>
                    </div>
                </div>

                <table className="w-full border-collapse text-center table-fixed">
                    <thead>
                        <tr className="bg-[#004d4d] text-white font-black text-xs h-12">
                            <th className="border border-white w-10">م</th>
                            <th className="border border-white w-48 text-right pr-4">اسم الطالب</th>
                            <th className="border border-white w-24">الدرجة العظمى</th>
                            <th className="border border-white w-24">النسبة المكتسبة</th>
                            <th className="border border-white w-72">تحليل مستوى المتعلم وفق الاختبار القبلي</th>
                            <th colSpan={2} className="border border-white bg-[#004d4d]">احتياجات المتعلم التعليمية</th>
                        </tr>
                        <tr className="bg-[#004d4d] text-white font-black text-[10px] h-10">
                            <th colSpan={2} className="border border-white bg-white"></th>
                            <th className="border border-white bg-[#004d4d]">{record.questions.length}</th>
                            <th className="border border-white bg-[#004d4d]">100%</th>
                            <th className="border border-white bg-[#004d4d]"></th>
                            <th className="border border-white w-24">برنامج إثرائي</th>
                            <th className="border border-white w-24">برنامج علاجي</th>
                        </tr>
                    </thead>
                    <tbody className="font-bold text-[11px]">
                        {data.studentsList.map((s: any, idx: number) => (
                            <tr key={s.sid} className={`h-10 hover:bg-gray-50 border-b border-[#002e4d] ${s.isAbsent ? 'bg-gray-100 opacity-60' : ''}`}>
                                <td className="border-x border-[#002e4d] bg-gray-50">{idx + 1}</td>
                                <td className="border-x border-[#002e4d] text-right pr-3 font-black text-gray-800">{s.name}</td>
                                <td className="border-x border-[#002e4d] font-black">{s.isAbsent ? '-' : s.score}</td>
                                <td className={`border-x border-[#002e4d] font-black ${s.isAbsent ? 'text-gray-400' : (s.pct < 50 ? 'text-red-600' : (s.pct >= 90 ? 'text-green-600' : 'text-blue-600'))}`}>
                                    {s.isAbsent ? 'غائب' : `${Math.round(s.pct * 100) / 100}%`}
                                </td>
                                <td className={`border-x border-[#002e4d] text-right px-3 ${s.pct >= 90 ? 'text-green-600' : s.pct >= 75 ? 'text-blue-600' : s.pct >= 50 ? 'text-orange-500' : 'text-red-600'}`}>
                                    {s.isAbsent ? '-' : s.levelDesc}
                                </td>
                                <td className="border-x border-[#002e4d] text-center">
                                    {!s.isAbsent && s.program === 'ENRICHMENT' && <CheckCircle className="mx-auto text-green-600" size={16}/>}
                                </td>
                                <td className="border-x border-[#002e4d] text-center">
                                    {!s.isAbsent && s.program === 'REMEDIAL' && <CheckCircle className="mx-auto text-green-600" size={16}/>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="bg-[#002e4d] text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-black">
                    <div>معلم المادة / أ. {header?.teacherName}</div>
                    <div>مدير المدرسة / أ. {header?.schoolManager}</div>
                </div>
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
                    <div className="text-right text-[11px] font-bold space-y-1">
                        <p>الإدارة العامة للتعليم بمنطقة {header?.educationAdmin}</p>
                        <p>مدرسة {header?.schoolName}</p>
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-black mb-1 uppercase tracking-tighter">تحليل نتائج المتعلمين - {record.examTitle}</h2>
                        <p className="text-xs font-bold opacity-80">تحليل المهارات ونسب التحصيل</p>
                    </div>
                    <div className="text-left"><img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-12 brightness-0 invert" alt="moe"/></div>
                </div>
                <div className="bg-gray-50 border-b-2 border-black grid grid-cols-5 text-[10px] font-black p-3 text-[#003366] text-center uppercase">
                    <div className="border-l border-black/20">المادة: {header?.subjectSpecialty || 'المادة الدراسية'}</div>
                    <div className="border-l border-black/20">الصف: {data.gradeName}</div>
                    <div className="border-l border-black/20">الفصل: {classFilter || record.className}</div>
                    <div className="border-l border-black/20">الفصل الدراسي: {header?.term}</div>
                    <div>العام الدراسي: {header?.academicYear}</div>
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
                    <div className="border-l-2 border-black p-3 bg-blue-50/50">عدد المتعلمين الكلي <div className="text-xl mt-1">{data.totalStudentsAttended}</div></div>
                    <div className="border-l-2 border-black p-3 bg-blue-50/50">مجموع المهارات حسب المتعلمين <div className="text-xl mt-1">{data.totalPossibleSkills}</div></div>
                    <div className="border-l-2 border-black p-3 bg-green-50">عدد المهارات المتقنة <div className="text-xl text-green-700 mt-1">{data.totalMasteredSkills}</div></div>
                    <div className="p-3 bg-red-50">عدد المهارات الغير متقنة <div className="text-xl text-red-600 mt-1">{data.totalPossibleSkills - data.totalMasteredSkills}</div></div>
                </div>
                
                <div className="border-t-2 border-black bg-white overflow-hidden">
                    <div className="flex border-b border-black h-12">
                        <div className="w-1/4 p-3 bg-[#003366] text-white text-center font-black text-xs border-l border-black flex items-center justify-center">مؤشر المهارات المتقنة</div>
                        <div className="w-3/4 p-2 bg-white flex items-center justify-center relative">
                            <div className="w-full h-8 bg-green-50 rounded-full border border-green-200 overflow-hidden flex items-center">
                                <div className="h-full bg-[#10b981] transition-all" style={{ width: `${masteredPct}%` }}></div>
                                <span className="absolute inset-0 flex items-center justify-center font-black text-sm text-green-900" style={{ textShadow: '0 0 2px white' }}>{masteredPct}%</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex h-12">
                        <div className="w-1/4 p-3 bg-[#003366] text-white text-center font-black text-xs border-l border-black flex items-center justify-center">مؤشر المهارات الغير متقنة</div>
                        <div className="w-3/4 p-2 bg-white flex items-center justify-center relative">
                            <div className="w-full h-8 bg-red-50 rounded-full border border-red-200 overflow-hidden flex items-center">
                                <div className="h-full bg-[#ef4444] transition-all" style={{ width: `${nonMasteredPct}%` }}></div>
                                <span className="absolute inset-0 flex items-center justify-center font-black text-sm text-red-900" style={{ textShadow: '0 0 2px white' }}>{nonMasteredPct}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#003366] text-white p-5 grid grid-cols-2 text-center text-xs font-black border-t-2 border-black">
                    <div>معلم المادة / أ. {header?.teacherName}</div>
                    <div>مدير المدرسة / أ. {header?.schoolManager}</div>
                </div>
            </div>
        </div>
    );
};

export default FormsAnalyzer;
