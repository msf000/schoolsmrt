
import React, { useMemo } from 'react';
import { Exam, Question, ReportHeaderConfig } from '../types';
import { Printer, ArrowRight, Download, FileText, ShieldCheck, Hash } from 'lucide-react';

interface Props {
    exam: Exam;
    headerConfig: ReportHeaderConfig;
    onBack: () => void;
}

const ExamPaperGenerator: React.FC<Props> = ({ exam, headerConfig, onBack }) => {
    return (
        <div className="p-6 h-full flex flex-col bg-slate-100 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-50"><ArrowRight/></button>
                    <h2 className="text-xl font-black text-gray-800">معاينة ورقة الاختبار الرسمية</h2>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => window.print()} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 hover:bg-indigo-700 transition-all">
                        <Printer size={18}/> طباعة الورقة
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-12 custom-scrollbar bg-white shadow-inner print:p-0 print:overflow-visible">
                <div id="official-exam-paper" className="max-w-[210mm] mx-auto bg-white p-10 border-[1px] border-black relative min-h-[297mm] print:border-none print:p-0">
                    {/* Official Header */}
                    <div className="flex justify-between items-center border-b-2 border-black pb-6 mb-8">
                        <div className="text-[11px] font-bold space-y-1 text-right">
                            <p>المملكة العربية السعودية</p>
                            <p>وزارة التعليم</p>
                            <p>إدارة التعليم بـ {headerConfig.educationAdmin || '...........'}</p>
                            <p>مدرسة {headerConfig.schoolName || '...........'}</p>
                        </div>
                        <div className="text-center">
                            <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-16 mx-auto mb-2" alt="Logo"/>
                            <h1 className="text-lg font-black">{exam.title}</h1>
                            <p className="text-[10px] font-bold">{headerConfig.term || 'الفصل الدراسي الأول'} - {headerConfig.academicYear || '1447هـ'}</p>
                        </div>
                        <div className="w-32 h-24 border border-black p-2 text-[9px] font-bold space-y-1">
                            <p>المادة: {exam.subject}</p>
                            <p>الزمن: {exam.durationMinutes} دقيقة</p>
                            <p>الدرجة: ............</p>
                        </div>
                    </div>

                    {/* Student Info Box */}
                    <div className="border border-black p-4 mb-8 grid grid-cols-2 gap-4">
                        <div className="font-bold text-sm">اسم الطالب: .........................................................................</div>
                        <div className="font-bold text-sm text-left">رقم الجلوس: ( ................. )</div>
                    </div>

                    {/* Questions Area */}
                    <div className="space-y-10">
                        {exam.questions.map((q, idx) => (
                            <div key={q.id} className="relative">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-base flex-1">س {idx + 1}: {q.text}</h3>
                                    <span className="text-[10px] font-bold border border-black px-2 py-1 mr-4">({q.points} درجات)</span>
                                </div>
                                {q.type === 'MCQ' && (
                                    <div className="grid grid-cols-2 gap-y-4 pr-6">
                                        {q.options.map((opt, i) => (
                                            <div key={i} className="flex items-center gap-3 text-sm">
                                                <div className="w-5 h-5 border border-black rounded-full flex items-center justify-center text-[10px] font-bold">{String.fromCharCode(97 + i)}</div>
                                                <span>{opt}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {q.type === 'TRUE_FALSE' && (
                                    <div className="flex gap-10 pr-6">
                                        <div className="flex items-center gap-2"><span>( ) صواب</span></div>
                                        <div className="flex items-center gap-2"><span>( ) خطأ</span></div>
                                    </div>
                                )}
                                <div className="absolute -right-4 top-0 w-1 h-full bg-slate-100 print:hidden"></div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="absolute bottom-10 left-10 right-10 flex justify-between border-t border-black pt-6 text-[10px] font-bold italic">
                        <p>مع تمنياتنا لكم بالتوفيق والنجاح</p>
                        <p>معلم المادة: {headerConfig.teacherName}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamPaperGenerator;
