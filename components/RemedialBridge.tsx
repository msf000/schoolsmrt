import React, { useMemo, useState } from 'react';
import { Student, FormsDetailedResult, LessonLink } from '../types';
import { getLessonLinks, saveMessage } from '../services/storageService';
import { BookOpen, Zap, Send, Link as LinkIcon, AlertCircle, CheckCircle, Sparkles, ArrowRight, Video } from 'lucide-react';
import { useToast } from './ToastProvider';
// Added missing formatDualDate import
import { formatDualDate } from '../services/dateService';

interface Props {
    student: Student;
    formsResults: FormsDetailedResult[];
}

const RemedialBridge: React.FC<Props> = ({ student, formsResults }) => {
    const { showToast } = useToast();
    const allLinks = useMemo(() => getLessonLinks(), []);
    
    const weakSkills = useMemo(() => {
        const skills: any[] = [];
        formsResults.forEach(res => {
            const studentRes = res.studentResponses[student.id];
            if (studentRes) {
                res.questions.forEach(q => {
                    if (studentRes.answers[q.id] === '✘') {
                        skills.push({
                            exam: res.examTitle,
                            skill: q.learningOutcome,
                            date: res.date
                        });
                    }
                });
            }
        });
        return skills;
    }, [student, formsResults]);

    const handleAssignResource = (skill: string) => {
        const match = allLinks.find(l => l.title.includes(skill) || skill.includes(l.title));
        const content = match 
            ? `بناءً على نتائجك الأخيرة في مهارة "${skill}"، نقترح عليك مراجعة هذا المصدر: ${match.url}`
            : `لاحظت حاجتك لمزيد من التدريب في مهارة "${skill}"، يرجى مراجعة الكتاب المدرسي أو التواصل معي لمزيد من الشرح.`;
        
        saveMessage({
            id: `rem_${Date.now()}`,
            studentId: student.id,
            studentName: student.name,
            content,
            status: 'SENT',
            date: new Date().toISOString(),
            sentBy: 'المحلل الذكي',
            type: 'ANNOUNCEMENT'
        });
        showToast(`تم إرسال مصدر دعم للطالب لمهارة: ${skill}`, 'SUCCESS');
    };

    if (weakSkills.length === 0) return null;

    return (
        <div className="bg-white rounded-[2.5rem] border border-amber-100 shadow-xl overflow-hidden animate-fade-in font-tajawal">
            <div className="p-6 bg-amber-50 flex items-center justify-between border-b border-amber-100">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600"><AlertCircle size={24}/></div>
                    <div>
                        <h3 className="text-lg font-black text-amber-900">تنبيه فجوات التعلم</h3>
                        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">AI Learning Gap Bridge</p>
                    </div>
                </div>
                <div className="bg-amber-600 text-white px-4 py-1 rounded-full text-[10px] font-black shadow-lg">تم اكتشاف {weakSkills.length} فجوة</div>
            </div>

            <div className="p-6 space-y-4">
                {weakSkills.map((s, i) => {
                    const hasResource = allLinks.some(l => l.title.includes(s.skill) || s.skill.includes(l.title));
                    return (
                        <div key={i} className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-amber-200 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm font-black text-xs">
                                    {i + 1}
                                </div>
                                <div className="text-right">
                                    <h4 className="font-black text-slate-800 text-sm">{s.skill}</h4>
                                    <p className="text-[9px] text-slate-400 font-bold">المصدر: {s.exam} • {formatDualDate(s.date)}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleAssignResource(s.skill)}
                                className={`px-6 py-2.5 rounded-xl font-black text-[10px] flex items-center gap-2 transition-all ${hasResource ? 'bg-indigo-600 text-white shadow-lg hover:bg-indigo-700' : 'bg-white border text-amber-600 hover:bg-amber-50'}`}
                            >
                                {hasResource ? <><Video size={14}/> إرسال مصدر شرح</> : <><Sparkles size={14}/> إرسال توجيه دعم</>}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RemedialBridge;