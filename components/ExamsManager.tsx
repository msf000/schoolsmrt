
import React, { useState, useEffect, useMemo } from 'react';
import { Exam, Question, SystemUser, Subject, ExamResult } from '../types';
import { getExams, saveExam, deleteExam, getSubjects, getQuestionBank, getExamResults, deleteExamResult } from '../services/storageService';
import { Plus, Trash2, Edit, FileQuestion, Save, ArrowLeft, Printer, Library, Copy, BarChart2, CheckCircle, XCircle, ImageIcon } from 'lucide-react';
import * as XLSX from 'xlsx';

const ExamsManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const [view, setView] = useState<'LIST' | 'EDITOR' | 'RESULTS'>('LIST');
    const [exams, setExams] = useState<Exam[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [selectedResults, setSelectedResults] = useState<ExamResult[]>([]);

    // Question Form
    const [qText, setQText] = useState('');
    const [qCorrect, setQCorrect] = useState('');
    const [qOptions, setQOptions] = useState(['', '', '', '']);

    useEffect(() => {
        if(currentUser?.id) {
            setExams(getExams(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
        }
    }, [currentUser]);

    const startNew = () => {
        setEditingExam({ id: Date.now().toString(), title: '', subject: subjects[0]?.name || '', gradeLevel: 'الصف الأول المتوسط', durationMinutes: 30, questions: [], isActive: false, createdAt: new Date().toISOString(), teacherId: currentUser.id });
        setView('EDITOR');
    };

    const addQ = () => {
        if(!qText || !qCorrect) return;
        const newQ: Question = { id: Math.random().toString(), text: qText, type: 'MCQ', options: qOptions, correctAnswer: qCorrect, points: 1 };
        setEditingExam(prev => prev ? ({ ...prev, questions: [...prev.questions, newQ] }) : null);
        setQText(''); setQCorrect(''); setQOptions(['', '', '', '']);
    };

    const save = () => {
        if(editingExam) { saveExam(editingExam); setExams(getExams(currentUser.id)); setView('LIST'); }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            {view === 'LIST' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2"><FileQuestion className="text-purple-600"/> إدارة الاختبارات</h2>
                        <button onClick={startNew} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg"><Plus size={18}/> اختبار جديد</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                        {exams.map(exam => (
                            <div key={exam.id} className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-md transition-all">
                                <div className="flex justify-between mb-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${exam.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{exam.isActive ? 'نشط' : 'مسودة'}</span>
                                    <div className="flex gap-1">
                                        <button onClick={()=>{setEditingExam(exam); setView('EDITOR')}} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16}/></button>
                                        <button onClick={()=>{if(confirm('حذف؟')) {deleteExam(exam.id); setExams(getExams(currentUser.id));}}} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-lg mb-1">{exam.title}</h3>
                                <p className="text-xs text-gray-400 mb-4">{exam.subject} • {exam.questions.length} سؤال</p>
                                <div className="flex gap-2">
                                    <button onClick={()=>{setEditingExam(exam); window.print();}} className="flex-1 py-2 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border"><Printer size={14}/> طباعة الورقة</button>
                                    <button onClick={()=>{setSelectedResults(getExamResults(exam.id)); setEditingExam(exam); setView('RESULTS')}} className="flex-1 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-indigo-100"><BarChart2 size={14}/> النتائج</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {view === 'EDITOR' && editingExam && (
                <div className="bg-white rounded-2xl border shadow-sm flex-1 flex flex-col overflow-hidden animate-slide-up">
                    <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <button onClick={()=>setView('LIST')} className="p-2 hover:bg-white rounded-full"><ArrowLeft/></button>
                            <h3 className="font-bold">محرر الاختبار</h3>
                        </div>
                        <button onClick={save} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md"><Save size={18}/> حفظ الاختبار</button>
                    </div>
                    <div className="flex-1 flex overflow-hidden">
                        <div className="w-80 border-l bg-gray-50/50 p-6 space-y-4 overflow-y-auto">
                            <div><label className="text-xs font-bold text-gray-500 mb-1 block">عنوان الاختبار</label><input className="w-full p-2 border rounded-lg" value={editingExam.title} onChange={e=>setEditingExam({...editingExam, title:e.target.value})}/></div>
                            <div><label className="text-xs font-bold text-gray-500 mb-1 block">المادة</label><select className="w-full p-2 border rounded-lg" value={editingExam.subject} onChange={e=>setEditingExam({...editingExam, subject:e.target.value})}>{subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select></div>
                            <div className="pt-4 border-t"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={editingExam.isActive} onChange={e=>setEditingExam({...editingExam, isActive:e.target.checked})}/> <span className="text-sm font-bold">تفعيل الاختبار للطلاب (أونلاين)</span></label></div>
                        </div>
                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="space-y-4 mb-8">
                                {editingExam.questions.map((q, idx) => (
                                    <div key={q.id} className="p-4 border rounded-xl relative group">
                                        <button onClick={()=>setEditingExam({...editingExam, questions: editingExam.questions.filter(x=>x.id!==q.id)})} className="absolute top-2 left-2 text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                        <p className="font-bold text-gray-700 text-sm mb-2">س{idx+1}: {q.text}</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">{q.options.map(o=><div key={o} className={`p-2 rounded border ${o===q.correctAnswer?'bg-green-50 border-green-200 text-green-700 font-bold':''}`}>{o}</div>)}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
                                <h4 className="font-bold text-purple-800 mb-4">إضافة سؤال جديد</h4>
                                <input className="w-full p-3 border rounded-xl mb-4 text-sm" placeholder="نص السؤال..." value={qText} onChange={e=>setQText(e.target.value)}/>
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    {qOptions.map((opt, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input type="radio" name="correct" checked={qCorrect === opt && opt !== ''} onChange={()=>setQCorrect(opt)}/>
                                            <input className="flex-1 p-2 border rounded-lg text-xs" placeholder={`خيار ${i+1}`} value={opt} onChange={e=>{const n = [...qOptions]; n[i]=e.target.value; setQOptions(n)}}/>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addQ} className="w-full py-2 bg-purple-600 text-white rounded-xl font-bold text-sm">إدراج السؤال</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamsManager;
