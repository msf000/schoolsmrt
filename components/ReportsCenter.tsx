
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, AcademicTerm, LearningStyle, RemedialPlan } from '../types';
import { getAcademicTerms, getTeacherAssignments, saveRemedialPlan, getRemedialPlans } from '../services/storageService';
import { detectAtRiskStudents, calculateClassStats } from '../services/analysisService';
import { generateSmartRemedialPlan } from '../services/geminiService';
import { 
    FileText, AlertTriangle, Printer, Download, CheckCircle, TrendingUp, 
    BarChart3, Activity, BrainCircuit, Users, PieChart as PieChartIcon, 
    Table, CheckSquare, Search, Filter, RefreshCw, Sparkles, Loader2, 
    Save, X, BookOpen, User, History 
} from 'lucide-react';
import MonthlyReport from './MonthlyReport';
import AIReports from './AIReports';
import CertificatesCenter from './CertificatesCenter';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { formatDualDate } from '../services/dateService';

interface ReportsCenterProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance: PerformanceRecord[];
  currentUser?: SystemUser | null;
}

const STYLE_COLORS = {
    VISUAL: '#3b82f6',
    AUDITORY: '#10b981',
    READ_WRITE: '#f59e0b',
    KINESTHETIC: '#ef4444',
    UNKNOWN: '#94a3b8'
};

const ReportsCenter: React.FC<ReportsCenterProps> = ({ students, attendance, performance, currentUser }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'COMPREHENSIVE' | 'AT_RISK' | 'MONTHLY' | 'AI' | 'CERTIFICATES' | 'VARK' | 'PERFORMANCE_LOG' | 'REMEDIAL'>((localStorage.getItem('rep_active_tab') as any) || 'COMPREHENSIVE');
    const [selectedClass, setSelectedClass] = useState(localStorage.getItem('rep_selected_class') || '');
    const [selectedTermId, setSelectedTermId] = useState(localStorage.getItem('rep_term_id') || '');
    
    // Remedial State
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string>('');
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
    const [savedRemedialPlans, setSavedRemedialPlans] = useState<RemedialPlan[]>([]);

    useEffect(() => {
        localStorage.setItem('rep_active_tab', activeTab);
        localStorage.setItem('rep_selected_class', selectedClass);
        localStorage.setItem('rep_term_id', selectedTermId);
        if (activeTab === 'REMEDIAL') setSavedRemedialPlans(getRemedialPlans());
    }, [activeTab, selectedClass, selectedTermId]);

    const terms = useMemo(() => getAcademicTerms(currentUser?.id), [currentUser]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUser]);

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

    const TabBtn = ({ label, active, onClick }: any) => (
        <button onClick={onClick} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}>{label}</button>
    );

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden font-tajawal">
            <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2"><FileText className="text-purple-600"/> مركز التقارير والخطط</h2>
                <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <TabBtn label="التقرير الشامل" active={activeTab==='COMPREHENSIVE'} onClick={()=>setActiveTab('COMPREHENSIVE')} />
                    <TabBtn label="المتعثرين" active={activeTab==='AT_RISK'} onClick={()=>setActiveTab('AT_RISK')} />
                    <TabBtn label="الخطط العلاجية" active={activeTab==='REMEDIAL'} onClick={()=>setActiveTab('REMEDIAL')} />
                    <TabBtn label="سجل الدرجات" active={activeTab==='PERFORMANCE_LOG'} onClick={()=>setActiveTab('PERFORMANCE_LOG')} />
                    <TabBtn label="سجل الحضور" active={activeTab==='MONTHLY'} onClick={()=>setActiveTab('MONTHLY')} />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
                {activeTab === 'AT_RISK' && (
                    <div className="space-y-6">
                        <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl flex items-center gap-4">
                            <AlertTriangle size={32} className="text-orange-500 shrink-0"/>
                            <div>
                                <h3 className="font-black text-orange-900 text-lg">تحليل التعثر الدراسي</h3>
                                <p className="text-xs text-orange-700 font-bold">النظام اكتشف {atRiskStudents.length} طلاب بحاجة لدعم تعليمي فوري بناءً على درجاتهم الأخيرة.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {atRiskStudents.map(item => (
                                <div key={item.student.id} className="bg-white p-5 rounded-3xl border shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-all">
                                    <div>
                                        <h4 className="font-black text-gray-800 mb-2">{item.student.name}</h4>
                                        <div className="space-y-1 mb-4">
                                            {item.risks.map((r, i) => (
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
                    <div className="space-y-6">
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
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button onClick={() => setActiveTab('AT_RISK')} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col items-center gap-3 hover:border-orange-400 transition-all group">
                            <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-colors"><AlertTriangle size={24}/></div>
                            <span className="font-black text-gray-800 text-xs">تحليل المتعثرين</span>
                        </button>
                        <button onClick={() => setActiveTab('REMEDIAL')} className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col items-center gap-3 hover:border-indigo-400 transition-all group">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors"><BrainCircuit size={24}/></div>
                            <span className="font-black text-gray-800 text-xs">الخطط العلاجية</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Modal for Remedial Plan Display */}
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
                        <div className="p-6 border-t bg-gray-50 flex justify-between items-center gap-4">
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
