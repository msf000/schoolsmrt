
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AcademicTerm, RemedialPlan } from '../types';
import { getAcademicTerms, saveRemedialPlan, getRemedialPlans } from '../services/storageService';
import { detectAtRiskStudents } from '../services/analysisService';
import { generateSmartRemedialPlan } from '../services/geminiService';
import { 
    FileText, AlertTriangle, Printer, Sparkles, Loader2, 
    Save, X, BookOpen, History, BrainCircuit, Calendar
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatDualDate } from '../services/dateService';
import MonthlyReport from './MonthlyReport';

interface ReportsCenterProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
}

const ReportsCenter: React.FC<ReportsCenterProps> = ({ students, attendance, performance, currentUser }) => {
    const [activeTab, setActiveTab] = useState<'COMPREHENSIVE' | 'AT_RISK' | 'REMEDIAL' | 'MONTHLY'>((localStorage.getItem('rep_active_tab') as any) || 'COMPREHENSIVE');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string>('');
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [savedRemedialPlans, setSavedRemedialPlans] = useState<RemedialPlan[]>([]);

    useEffect(() => {
        localStorage.setItem('rep_active_tab', activeTab);
        if (activeTab === 'REMEDIAL') setSavedRemedialPlans(getRemedialPlans());
    }, [activeTab]);

    const atRiskStudents = useMemo(() => detectAtRiskStudents(students, attendance, performance), [students, attendance, performance]);

    const handleGenerateRemedial = async (student: Student) => {
        setViewingStudent(student);
        setIsGenerating(true);
        setCurrentPlan('');
        try {
            const studentPerf = performance.filter(p => p.studentId === student.id);
            const plan = await generateSmartRemedialPlan(student, studentPerf);
            setCurrentPlan(plan);
        } catch (e) {
            alert('فشل توليد الخطة');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveRemedial = () => {
        if (!viewingStudent || !currentPlan || !currentUser) return;
        const plan: RemedialPlan = {
            id: `plan_${Date.now()}`,
            studentId: viewingStudent.id,
            teacherId: currentUser.id,
            subject: 'دعم تعليمي مكثف',
            topic: 'خطة علاجية ذكية',
            content: currentPlan,
            date: new Date().toISOString()
        };
        saveRemedialPlan(plan);
        setSavedRemedialPlans(getRemedialPlans());
        alert('تم حفظ الخطة في ملف الطالب بنجاح');
        setCurrentPlan('');
        setViewingStudent(null);
    };

    const TabBtn = ({ label, active, onClick, icon: Icon }: any) => (
        <button onClick={onClick} className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white border border-transparent hover:border-gray-100'}`}>
            <Icon size={16}/>
            {label}
        </button>
    );

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden font-tajawal">
            <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2"><FileText className="text-purple-600"/> مركز التقارير والخطط</h2>
                <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <TabBtn label="التقرير الشامل" icon={FileText} active={activeTab==='COMPREHENSIVE'} onClick={()=>setActiveTab('COMPREHENSIVE')} />
                    <TabBtn label="سجل الحضور" icon={Calendar} active={activeTab==='MONTHLY'} onClick={()=>setActiveTab('MONTHLY')} />
                    <TabBtn label="المتعثرين" icon={AlertTriangle} active={activeTab==='AT_RISK'} onClick={()=>setActiveTab('AT_RISK')} />
                    <TabBtn label="الخطط العلاجية" icon={BrainCircuit} active={activeTab==='REMEDIAL'} onClick={()=>setActiveTab('REMEDIAL')} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                {activeTab === 'MONTHLY' && (
                    <MonthlyReport students={students} attendance={attendance} performance={performance} currentUser={currentUser} />
                )}

                {activeTab === 'AT_RISK' && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl flex items-center gap-4">
                            <AlertTriangle size={32} className="text-orange-500 shrink-0"/>
                            <div>
                                <h3 className="font-black text-orange-900 text-lg">تحليل التعثر الدراسي</h3>
                                <p className="text-xs text-orange-700 font-bold">النظام اكتشف {atRiskStudents.length} طلاب بحاجة لدعم تعليمي فوري بناءً على درجاتهم الأخيرة.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {atRiskStudents.map((item: any) => (
                                <div key={item.student.id} className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-all">
                                    <div>
                                        <h4 className="font-black text-gray-800 mb-2">{item.student.name}</h4>
                                        <div className="space-y-1 mb-4">
                                            {item.risks.map((r: string, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg"><X size={10}/> {r}</div>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => handleGenerateRemedial(item.student)} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all">
                                        <Sparkles size={14}/> تصميم خطة علاجية (AI)
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'REMEDIAL' && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="bg-white p-6 rounded-3xl border shadow-sm">
                            <h3 className="font-black text-gray-800 mb-6 flex items-center gap-2"><History size={18} className="text-indigo-600"/> أرشيف الخطط المعتمدة</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {savedRemedialPlans.map(plan => {
                                    const student = students.find(s => s.id === plan.studentId);
                                    return (
                                        <div key={plan.id} className="p-4 border rounded-2xl bg-gray-50 flex justify-between items-center group">
                                            <div>
                                                <h4 className="font-bold text-gray-800">{student?.name || 'طالب مجهول'}</h4>
                                                <p className="text-[10px] text-gray-400">{formatDualDate(plan.date)}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setViewingStudent(student!); setCurrentPlan(plan.content); }} className="p-2 bg-white text-indigo-600 rounded-lg shadow-sm border opacity-0 group-hover:opacity-100 transition-all"><BookOpen size={16}/></button>
                                                <button className="p-2 bg-white text-gray-600 rounded-lg shadow-sm border opacity-0 group-hover:opacity-100 transition-all"><Printer size={16}/></button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {savedRemedialPlans.length === 0 && <div className="col-span-full py-20 text-center text-gray-300 font-black italic">لا توجد خطط علاجية محفوظة حالياً</div>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'COMPREHENSIVE' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                        <button onClick={() => setActiveTab('MONTHLY')} className="bg-white p-8 rounded-[2rem] border shadow-sm flex flex-col items-center text-center gap-4 hover:border-indigo-400 transition-all group">
                            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner"><Calendar size={32}/></div>
                            <div>
                                <h4 className="font-black text-gray-800">كشوفات الحضور</h4>
                                <p className="text-xs text-gray-400 mt-1">توليد سجل الحضور الشهري والفصلي لجميع الفصول.</p>
                            </div>
                        </button>
                        <button onClick={() => setActiveTab('AT_RISK')} className="bg-white p-8 rounded-[2rem] border shadow-sm flex flex-col items-center text-center gap-4 hover:border-orange-400 transition-all group">
                            <div className="p-4 bg-orange-50 text-orange-600 rounded-3xl group-hover:bg-orange-600 group-hover:text-white transition-colors shadow-inner"><AlertTriangle size={32}/></div>
                            <div>
                                <h4 className="font-black text-gray-800">تحليل المتعثرين</h4>
                                <p className="text-xs text-gray-400 mt-1">اكتشاف الطلاب الذين يعانون من تراجع في الأداء أو غياب متكرر.</p>
                            </div>
                        </button>
                        <button onClick={() => setActiveTab('REMEDIAL')} className="bg-white p-8 rounded-[2rem] border shadow-sm flex flex-col items-center text-center gap-4 hover:border-purple-400 transition-all group">
                            <div className="p-4 bg-purple-50 text-purple-600 rounded-3xl group-hover:bg-purple-600 group-hover:text-white transition-colors shadow-inner"><BrainCircuit size={32}/></div>
                            <div>
                                <h4 className="font-black text-gray-800">الخطط العلاجية</h4>
                                <p className="text-xs text-gray-400 mt-1">توليد خطط دعم مخصصة باستخدام الذكاء الاصطناعي.</p>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {viewingStudent && (currentPlan || isGenerating) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
                        <div className="p-6 bg-indigo-900 text-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-black">{viewingStudent.name.charAt(0)}</div>
                                <div><h3 className="font-black text-lg">خطة علاجية: {viewingStudent.name}</h3><p className="text-xs text-indigo-200">بناءً على نتائج التعثر ونمط التعلم</p></div>
                            </div>
                            <button onClick={() => { setViewingStudent(null); setCurrentPlan(''); }} className="p-2 hover:bg-white/10 rounded-full"><X/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
                            {isGenerating ? (
                                <div className="h-full flex flex-col items-center justify-center text-indigo-600 gap-4">
                                    <Loader2 size={48} className="animate-spin opacity-50"/>
                                    <p className="font-black text-xl animate-pulse">جاري صياغة استراتيجية دعم مخصصة...</p>
                                </div>
                            ) : (
                                <div className="prose prose-indigo max-w-none bg-white p-8 rounded-3xl border shadow-sm leading-relaxed text-gray-700">
                                    <ReactMarkdown>{currentPlan}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-between items-center gap-4 print:hidden">
                            <button onClick={() => window.print()} className="px-8 py-3 bg-gray-800 text-white rounded-2xl font-black shadow-lg flex items-center gap-2"><Printer size={18}/> طباعة</button>
                            {currentPlan && !savedRemedialPlans.some(p => p.content === currentPlan) && (
                                <button onClick={handleSaveRemedial} className="flex-1 py-3 bg-green-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 hover:bg-green-700">
                                    <Save size={18}/> اعتماد وحفظ الخطة
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsCenter;
