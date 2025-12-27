
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, ReportHeaderConfig } from '../types';
import { getReportHeaderConfig } from '../services/storageService';
import { generateNarrativeInsights } from '../services/geminiService';
// Added Bot to the imported icons
import { Printer, Download, Sparkles, Star, Target, Calendar, User, FileText, Loader2, ChevronRight, Share2, Bot } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

interface Props {
    student: Student;
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onClose?: () => void;
}

const ReportCard: React.FC<Props> = ({ student, performance, attendance, onClose }) => {
    const [aiComment, setAiComment] = useState('');
    const [loading, setLoading] = useState(false);
    const headerConfig = useMemo(() => getReportHeaderConfig(student.createdById), [student]);

    const stats = useMemo(() => {
        const myPerf = performance.filter(p => p.studentId === student.id);
        const myAtt = attendance.filter(a => a.studentId === student.id);
        const avg = myPerf.length > 0 ? Math.round(myPerf.reduce((a, b) => a + (b.score / b.maxScore), 0) / myPerf.length * 100) : 0;
        const abs = myAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        return { avg, abs, myPerf, myAtt };
    }, [student, performance, attendance]);

    const generateAIComment = async () => {
        setLoading(true);
        try {
            const res = await generateNarrativeInsights({
                name: student.name,
                avg: stats.avg,
                absent: stats.abs,
                learningStyle: student.learningStyle
            });
            setAiComment(res);
        } catch (e) {
            setAiComment("طالب متميز يظهر تفاعلاً إيجابياً في الحصة، ننصح بالاستمرار على هذا النهج.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { generateAIComment(); }, [student]);

    return (
        <div className="fixed inset-0 z-[160] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-10 font-tajawal animate-fade-in overflow-hidden">
            <div className="bg-white w-full max-w-5xl h-full rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden relative">
                
                {/* Fixed Control Bar */}
                <div className="p-6 bg-slate-50 border-b flex justify-between items-center shrink-0 print:hidden">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl text-slate-400 transition-all"><ChevronRight size={24}/></button>
                        <h3 className="text-xl font-black text-slate-800">معاينة بطاقة التقرير الرسمي</h3>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 shadow-xl hover:bg-black transition-all">
                            <Printer size={20}/> طباعة التقرير (PDF)
                        </button>
                    </div>
                </div>

                {/* Printable Area */}
                <div id="report-card-printable" className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-white print:p-0">
                    <div className="max-w-4xl mx-auto border-[12px] border-double border-slate-100 p-12 relative overflow-hidden print:border-none">
                        {/* Header Header */}
                        <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                            <div className="text-right text-xs font-black space-y-1">
                                <p>المملكة العربية السعودية</p>
                                <p>وزارة التعليم</p>
                                <p>{headerConfig.schoolName || 'مدرستنا النموذجية'}</p>
                            </div>
                            <div className="text-center flex flex-col items-center">
                                <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-16 mb-4" alt="MOE"/>
                                <h1 className="text-3xl font-black text-slate-900">تقرير الأداء الأكاديمي</h1>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{headerConfig.academicYear || 'العام الدراسي 1447هـ'}</p>
                            </div>
                            <div className="text-left text-xs font-black space-y-1">
                                <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                                <p>الفصل: {student.className}</p>
                            </div>
                        </div>

                        {/* Student Profile Block */}
                        <div className="grid grid-cols-3 gap-8 mb-12 bg-slate-50 p-8 rounded-[2.5rem]">
                            <div className="col-span-2 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg">{student.name.charAt(0)}</div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900">{student.name}</h2>
                                        <p className="text-sm font-bold text-slate-500">رقم الهوية: {student.nationalId}</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <span className="bg-white px-4 py-1 rounded-full border text-[10px] font-black text-slate-400 uppercase">النمط: {student.learningStyle || 'غير محدد'}</span>
                                    <span className="bg-white px-4 py-1 rounded-full border text-[10px] font-black text-slate-400 uppercase">المستوى: {student.level || 1}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center border-r border-slate-200">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المعدل العام</p>
                                <div className="text-5xl font-black text-indigo-600">{stats.avg}%</div>
                            </div>
                        </div>

                        {/* Grades Table */}
                        <div className="mb-12">
                            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 border-r-4 border-indigo-600 pr-3">سجل رصد التقييمات</h3>
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white text-[11px] font-black uppercase">
                                        <th className="p-4 rounded-tr-xl">المادة والتقييم</th>
                                        <th className="p-4 text-center">الدرجة</th>
                                        <th className="p-4 text-center">الدرجة القصوى</th>
                                        <th className="p-4 text-center rounded-tl-xl">النسبة</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 border-x border-b">
                                    {stats.myPerf.map((p: PerformanceRecord, i: number) => (
                                        <tr key={i} className="text-sm font-bold">
                                            <td className="p-4">
                                                <p className="text-slate-800">{p.title}</p>
                                                <p className="text-[10px] text-slate-400 uppercase">{p.subject}</p>
                                            </td>
                                            <td className="p-4 text-center text-indigo-600 font-black">{p.score}</td>
                                            <td className="p-4 text-center text-slate-400">{p.maxScore}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${p.score/p.maxScore >= 0.9 ? 'bg-emerald-100 text-emerald-700' : p.score/p.maxScore >= 0.6 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                    {Math.round((p.score / p.maxScore) * 100)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {stats.myPerf.length === 0 && (
                                        <tr><td colSpan={4} className="p-10 text-center text-slate-300 italic font-medium">لا توجد درجات مرصودة حالياً</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* AI Summary & Signatures */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="bg-indigo-50 p-8 rounded-[2.5rem] relative overflow-hidden">
                                <Sparkles className="absolute top-4 left-4 text-indigo-200" size={24}/>
                                <h3 className="font-black text-indigo-900 mb-4 flex items-center gap-2"><Bot size={18}/> التوصية التربوية (AI)</h3>
                                {loading ? (
                                    <div className="animate-pulse space-y-2">
                                        <div className="h-3 bg-indigo-200 rounded w-full"></div>
                                        <div className="h-3 bg-indigo-200 rounded w-5/6"></div>
                                        <div className="h-3 bg-indigo-200 rounded w-4/6"></div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-indigo-800 leading-relaxed font-medium italic">"{aiComment}"</p>
                                )}
                            </div>

                            <div className="flex flex-col justify-between py-4">
                                <div className="space-y-8">
                                    <div className="flex justify-between items-end">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest">توقيع المعلم</p>
                                            {headerConfig.signatureBase64 ? (
                                                <img src={headerConfig.signatureBase64} className="h-12 mx-auto mix-blend-multiply mb-2" alt="sig"/>
                                            ) : <div className="h-12"></div>}
                                            <p className="font-black text-slate-800 border-t pt-2">{headerConfig.teacherName || '..................'}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest">ختم المدرسة</p>
                                            <div className="w-20 h-20 border-4 border-slate-100 rounded-full mx-auto opacity-20"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportCard;
