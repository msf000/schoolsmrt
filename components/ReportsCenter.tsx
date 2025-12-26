
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AcademicTerm, RemedialPlan, Assignment } from '../types';
import { getAcademicTerms, saveRemedialPlan, getRemedialPlans, getAssignments, exportToWord } from '../services/storageService';
import { detectAtRiskStudents } from '../services/analysisService';
import { generateSmartRemedialPlan } from '../services/geminiService';
import { 
    FileText, AlertTriangle, Printer, Sparkles, Loader2, 
    Save, X, BookOpen, History, BrainCircuit, Calendar, Grid3X3, ArrowRight
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
    const [activeTab, setActiveTab] = useState<'COMPREHENSIVE' | 'AT_RISK' | 'REMEDIAL' | 'MONTHLY' | 'HEATMAP'>((localStorage.getItem('rep_active_tab') as any) || 'COMPREHENSIVE');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string>('');
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [selectedClass, setSelectedClass] = useState('');
    const [savedRemedialPlans, setSavedRemedialPlans] = useState<RemedialPlan[]>([]);
    const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);

    useEffect(() => {
        localStorage.setItem('rep_active_tab', activeTab);
        if (activeTab === 'REMEDIAL') setSavedRemedialPlans(getRemedialPlans());
        if (activeTab === 'HEATMAP') setAllAssignments(getAssignments('ALL'));
    }, [activeTab]);

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

    const atRiskStudents = useMemo(() => detectAtRiskStudents(students, attendance, performance), [students, attendance, performance]);

    const heatmapData = useMemo(() => {
        if (!selectedClass) return null;
        const classStudents = students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
        const classAssignments = allAssignments.filter(a => a.isVisible).slice(0, 8); // Top 8 tasks for viewability

        return {
            students: classStudents,
            tasks: classAssignments,
            getScore: (sid: string, tid: string) => {
                const rec = performance.find(p => p.studentId === sid && (p.notes === tid || p.title === allAssignments.find(a=>a.id===tid)?.title));
                if (!rec) return null;
                return Math.round((rec.score / rec.maxScore) * 100);
            }
        };
    }, [selectedClass, students, allAssignments, performance]);

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

    const TabBtn = ({ label, icon: Icon, active, onClick }: any) => (
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
                    <TabBtn label="المتتبع الحراري" icon={Grid3X3} active={activeTab==='HEATMAP'} onClick={()=>setActiveTab('HEATMAP')} />
                    <TabBtn label="المتعثرين" icon={AlertTriangle} active={activeTab==='AT_RISK'} onClick={()=>setActiveTab('AT_RISK')} />
                    <TabBtn label="الخطط العلاجية" icon={BrainCircuit} active={activeTab==='REMEDIAL'} onClick={()=>setActiveTab('REMEDIAL')} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                {activeTab === 'HEATMAP' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
                            <h3 className="font-black text-gray-800 flex items-center gap-2"><Grid3X3 className="text-indigo-600" size={20}/> مصفوفة الأداء الحرارية</h3>
                            <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)} className="p-2 border rounded-xl bg-gray-50 font-black text-xs outline-none">
                                <option value="">-- اختر الفصل --</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {heatmapData ? (
                            <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden p-6">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-center border-collapse">
                                        <thead>
                                            <tr>
                                                <th className="p-4 text-right sticky right-0 bg-white z-10 w-48 border-b font-black text-gray-400 text-[10px] uppercase">اسم الطالب</th>
                                                {heatmapData.tasks.map(t => (
                                                    <th key={t.id} className="p-4 border-b font-black text-gray-700 text-xs min-w-[120px]">{t.title}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {heatmapData.students.map(s => (
                                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 text-right sticky right-0 bg-white z-10 font-bold text-gray-700 border-l">{s.name}</td>
                                                    {heatmapData.tasks.map(t => {
                                                        const score = heatmapData.getScore(s.id, t.id);
                                                        const colorClass = score === null ? 'bg-gray-50' : score >= 90 ? 'bg-emerald-500 text-white' : score >= 75 ? 'bg-emerald-300' : score >= 60 ? 'bg-yellow-200' : 'bg-red-500 text-white';
                                                        return (
                                                            <td key={t.id} className={`p-3 border-l border-white/10 font-black text-xs transition-all ${colorClass}`}>
                                                                {score !== null ? `${score}%` : '-'}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : <div className="p-20 text-center text-gray-300 font-bold italic">يرجى اختيار الفصل لعرض المصفوفة</div>}
                    </div>
                )}

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

                {activeTab === 'COMPREHENSIVE' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                        <ReportCategoryBtn label="المتتبع الحراري" icon={Grid3X3} onClick={()=>setActiveTab('HEATMAP')} color="bg-teal-50 text-teal-600" />
                        <ReportCategoryBtn label="كشوفات الحضور" icon={Calendar} onClick={()=>setActiveTab('MONTHLY')} color="bg-indigo-50 text-indigo-600" />
                        <ReportCategoryBtn label="تحليل المتعثرين" icon={AlertTriangle} onClick={()=>setActiveTab('AT_RISK')} color="bg-orange-50 text-orange-600" />
                        <ReportCategoryBtn label="الخطط العلاجية" icon={BrainCircuit} onClick={()=>setActiveTab('REMEDIAL')} color="bg-purple-50 text-purple-600" />
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
                        <div id="remedial-plan-content" className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
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
                        <div className="p-6 border-t bg-gray-50 flex justify-end items-center gap-4 print:hidden">
                            <button onClick={() => exportToWord('remedial-plan-content', `plan_${viewingStudent.name}.doc`)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg flex items-center gap-2"><FileText size={18}/> Word</button>
                            <button onClick={() => window.print()} className="px-8 py-3 bg-gray-800 text-white rounded-2xl font-black shadow-lg flex items-center gap-2"><Printer size={18}/> PDF</button>
                            {currentPlan && (
                                <button className="px-8 py-3 bg-green-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-2 hover:bg-green-700">
                                    <Save size={18}/> حفظ الخطة
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ReportCategoryBtn = ({ label, icon: Icon, onClick, color }: any) => (
    <button onClick={onClick} className="bg-white p-8 rounded-[2rem] border shadow-sm flex flex-col items-center text-center gap-4 hover:border-indigo-400 transition-all group">
        <div className={`p-4 ${color} rounded-3xl group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-inner`}><Icon size={32}/></div>
        <div>
            <h4 className="font-black text-gray-800">{label}</h4>
            <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-widest">عرض التقرير التفصيلي</p>
        </div>
    </button>
);

export default ReportsCenter;
