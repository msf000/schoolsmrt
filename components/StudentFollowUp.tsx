
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Subject, BehaviorStatus, SystemUser, AcademicTerm, ReportHeaderConfig } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, getReportHeaderConfig } from '../services/storageService';
import { FileText, Printer, Search, Target, Check, X, Smile, Frown, AlertCircle, Activity as ActivityIcon, BookOpen, TrendingUp, Calculator, Award, Loader2, BarChart2, Gift, Star, Medal, ThumbsUp, Clock, LineChart as LineChartIcon, Calendar, Share2, Users } from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area, ReferenceLine } from 'recharts';

interface StudentFollowUpProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  currentUser?: SystemUser | null;
  onSaveAttendance?: (records: AttendanceRecord[]) => void;
}

const StudentFollowUp: React.FC<StudentFollowUpProps> = ({ students, performance, attendance, currentUser, onSaveAttendance }) => {
    // Safety check
    if (!students || !performance || !attendance) {
        return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32}/></div>;
    }

    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [activityTarget, setActivityTarget] = useState<number>(15); 

    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Terms State
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    
    // Header Config for Print
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

    // Certificate State
    const [isCertModalOpen, setIsCertModalOpen] = useState(false);
    const [certType, setCertType] = useState<'EXCELLENCE' | 'ATTENDANCE' | 'BEHAVIOR' | 'THANKS'>('EXCELLENCE');

    useEffect(() => {
        const subs = getSubjects(currentUser?.id); 
        setSubjects(subs);
        if (subs.length > 0) setSelectedSubject(subs[0].name);
        else setSelectedSubject('عام');

        const savedTarget = localStorage.getItem('works_activity_target');
        if (savedTarget) setActivityTarget(parseInt(savedTarget));

        // Load Terms
        const loadedTerms = getAcademicTerms(currentUser?.id);
        setTerms(loadedTerms);
        // Set default to current term if available
        const current = loadedTerms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);
        
        setHeaderConfig(getReportHeaderConfig(currentUser?.id));

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        
        // --- CHECK NAV CONTEXT ---
        const navStudentId = localStorage.getItem('nav_context_student_id');
        if (navStudentId) {
            const exists = students.find(s => s.id === navStudentId);
            if (exists) {
                setSelectedStudentId(navStudentId);
                setSearchTerm(exists.name);
            }
            localStorage.removeItem('nav_context_student_id');
        }

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [currentUser, students]); 

    const handleTargetChange = (val: string) => {
        const num = parseInt(val);
        if (!isNaN(num) && num > 0) {
            setActivityTarget(num);
            localStorage.setItem('works_activity_target', num.toString());
        }
    };

    const handleTermChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedTermId(e.target.value);
        setSelectedPeriodId(''); // Reset period when term changes
    };

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [students]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return sortedStudents;
        return sortedStudents.filter(s => 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (s.nationalId && s.nationalId.includes(searchTerm))
        );
    }, [sortedStudents, searchTerm]);

    const handleStudentSelect = (student: Student) => {
        setSelectedStudentId(student.id);
        setSearchTerm(student.name);
        setIsDropdownOpen(false);
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedStudentId('');
        setSearchTerm('');
        setIsDropdownOpen(true);
    };

    const student = students.find(s => s.id === selectedStudentId);
    
    // Determine active term & period for filtering
    const activeTerm = useMemo(() => terms.find(t => t.id === selectedTermId), [terms, selectedTermId]);
    const activePeriod = useMemo(() => activeTerm?.periods?.find(p => p.id === selectedPeriodId), [activeTerm, selectedPeriodId]);

    // Fetch assignments and filter strictly by Term AND Period
    const filterAssignments = (category: string) => {
        return getAssignments(category, currentUser?.id).filter(c => {
            if (!c.isVisible) return false;
            // 1. Term Check
            if (activeTerm && c.termId && c.termId !== activeTerm.id) return false;
            
            // 2. Period Check (If period is selected, only show assignments for that period OR global ones if permitted logic)
            // Strict Mode: If period selected, Assignment MUST match periodId.
            if (selectedPeriodId) {
                if (c.periodId && c.periodId !== selectedPeriodId) return false;
                // Optional: If assignment has NO periodId, do we include it? Usually yes if it's Term-wide.
                // But for "Period 1", we usually want only "Period 1" columns.
                if (!c.periodId) return false; // Strict: Must match period
            }
            
            return true;
        });
    };

    const activityCols = useMemo(() => filterAssignments('ACTIVITY'), [currentUser, activeTerm, selectedPeriodId]);
    const homeworkCols = useMemo(() => filterAssignments('HOMEWORK'), [currentUser, activeTerm, selectedPeriodId]);
    const examCols = useMemo(() => filterAssignments('PLATFORM_EXAM'), [currentUser, activeTerm, selectedPeriodId]);

    const calculateStats = () => {
        if (!student) return null;
        
        let startDate: string | undefined;
        let endDate: string | undefined;

        if (activeTerm) {
            startDate = activeTerm.startDate;
            endDate = activeTerm.endDate;
            // Narrow down if period selected
            if (activePeriod) {
                startDate = activePeriod.startDate;
                endDate = activePeriod.endDate;
            }
        }

        const filterByDate = (date: string) => {
            if (!startDate || !endDate) return true;
            return date >= startDate && date <= endDate;
        };

        // --- ATTENDANCE ---
        let studentAtt = attendance.filter(a => a.studentId === student.id && filterByDate(a.date));
        const creditCount = studentAtt.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE || a.status === AttendanceStatus.EXCUSED).length;
        const totalDays = studentAtt.length;
        const attPercent = totalDays > 0 ? (creditCount / totalDays) * 100 : 100;
        const gradePart = (attPercent / 100) * 15; // 15 Marks for Attendance

        // --- PERFORMANCE BASE ---
        let myPerformance = performance.filter(p => p.studentId === student.id && p.subject === selectedSubject && filterByDate(p.date));

        // --- HOMEWORK CALCULATIONS ---
        const studentHWs = myPerformance.filter(p => p.category === 'HOMEWORK');
        let hwScoreSum = 0;
        let hwMaxSum = 0;
        
        if (homeworkCols.length > 0) {
            // Calculated based on Columns defined for this Period
            homeworkCols.forEach(col => {
                const rec = studentHWs.find(p => p.notes === col.id || p.title === col.title);
                hwMaxSum += col.maxScore;
                if (rec) hwScoreSum += rec.score;
            });
        } else {
            // Fallback: Sum whatever records exist if no columns defined
            studentHWs.forEach(p => { hwScoreSum += p.score; hwMaxSum += p.maxScore || 10; });
        }
        
        const hwPercent = hwMaxSum > 0 ? Math.round((hwScoreSum / hwMaxSum) * 100) : (homeworkCols.length > 0 ? 0 : 100);
        const gradeHW = (hwPercent / 100) * 10; // 10 Marks for Homework

        // --- ACTIVITY CALCULATIONS ---
        const studentActs = myPerformance.filter(p => p.category === 'ACTIVITY');
        let actScoreSum = 0;
        let actMaxSum = 0;

        if (activityCols.length > 0) {
             activityCols.forEach(col => {
                const rec = studentActs.find(p => p.notes === col.id || p.title === col.title);
                actMaxSum += col.maxScore;
                if (rec) actScoreSum += rec.score;
             });
        } else {
             // Fallback
             studentActs.forEach(p => { actScoreSum += p.score; actMaxSum += p.maxScore || 10; });
             // Adjust max if target is set manually
             if (activityTarget > 0 && activityCols.length === 0) actMaxSum = activityTarget;
        }

        const actPercent = actMaxSum > 0 ? Math.round((actScoreSum / actMaxSum) * 100) : (activityCols.length > 0 ? 0 : 100);
        const gradeAct = (actPercent / 100) * 15; // 15 Marks for Activities

        // --- EXAM CALCULATIONS ---
        const studentExams = myPerformance.filter(p => p.category === 'PLATFORM_EXAM');
        let examScoreSum = 0;
        let examMaxSum = 0;

        if (examCols.length > 0) {
            examCols.forEach(col => {
                const rec = studentExams.find(p => p.notes === col.id || p.title === col.title);
                examMaxSum += col.maxScore;
                if (rec) examScoreSum += rec.score;
            });
        } else {
            studentExams.forEach(p => { examScoreSum += p.score; examMaxSum += p.maxScore || 20; });
        }
        
        const examPercent = examMaxSum > 0 ? Math.round((examScoreSum / examMaxSum) * 100) : 0;
        const examWeighted = (examPercent / 100) * 20; // 20 Marks for Exams

        // Total
        const totalTasks = gradeHW + gradeAct + gradePart;
        const totalPeriod = totalTasks + examWeighted;

        const behaviorLogs = studentAtt.filter(a => (a.behaviorStatus && a.behaviorStatus !== BehaviorStatus.NEUTRAL) || a.behaviorNote).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Class Avg
        let classAvg = 0;
        const classStudents = students.filter(s => s.className === student.className);
        if (classStudents.length > 0) {
            let totalClassScore = 0;
            let scoredStudents = 0;
            classStudents.forEach(cs => {
                const sPerf = performance.filter(p => p.studentId === cs.id && p.subject === selectedSubject && filterByDate(p.date));
                if (sPerf.length > 0) {
                    const sTotal = sPerf.reduce((acc, p) => acc + (p.score/p.maxScore), 0);
                    totalClassScore += (sTotal / sPerf.length);
                    scoredStudents++;
                }
            });
            if (scoredStudents > 0) classAvg = Math.round((totalClassScore / scoredStudents) * 100);
        }

        const chartData = [
            { name: 'الحضور', value: Math.round(attPercent), full: 100, fill: '#10b981' }, 
            { name: 'الواجبات', value: Math.round(hwPercent), full: 100, fill: '#3b82f6' }, 
            { name: 'الأنشطة', value: Math.round(actPercent), full: 100, fill: '#f59e0b' }, 
            { name: 'الاختبارات', value: Math.round(examPercent), full: 100, fill: '#8b5cf6' }
        ];

        return { 
            attPercent, gradePart, 
            hwPercent, hwScoreSum, hwMaxSum, gradeHW, 
            actPercent, actScoreSum, actMaxSum, gradeAct, 
            examPercent, examScoreSum, examMaxSum, examWeighted,
            totalTasks, totalPeriod, 
            studentActs, studentHWs, studentExams, behaviorLogs, chartData,
            classAvg 
        };
    };

    const stats = calculateStats();

    const handlePrint = () => {
        if (onSaveAttendance && student) {
            const record: AttendanceRecord = {
                id: `${student.id}-cert-${Date.now()}`,
                studentId: student.id,
                date: new Date().toISOString().split('T')[0],
                status: AttendanceStatus.PRESENT,
                behaviorStatus: BehaviorStatus.POSITIVE,
                behaviorNote: `تم منح شهادة: ${certType === 'EXCELLENCE' ? 'تفوق' : certType === 'ATTENDANCE' ? 'مواظبة' : certType === 'BEHAVIOR' ? 'سلوك' : 'شكر'}`,
                createdById: currentUser?.id
            };
            onSaveAttendance([record]);
        }
        window.print();
    };

    const handleShareWhatsApp = () => {
        if (!student || !stats) return;
        const phone = student.parentPhone ? student.parentPhone.replace(/\D/g, '') : '';
        if (!phone) {
            alert('رقم ولي الأمر غير مسجل');
            return;
        }
        
        const message = `
تقرير الطالب: ${student.name}
المادة: ${selectedSubject}
الفترة: ${activePeriod ? activePeriod.name : (activeTerm ? activeTerm.name : 'الحالية')}

📊 الملخص:
- الحضور: ${Math.round(stats.attPercent)}%
- الواجبات: ${stats.hwScoreSum}/${stats.hwMaxSum} (${Math.round(stats.hwPercent)}%)
- الأنشطة: ${stats.actScoreSum}/${stats.actMaxSum} (${Math.round(stats.actPercent)}%)
- الاختبارات: ${stats.examScoreSum}/${stats.examMaxSum}
- المجموع الكلي: ${stats.totalPeriod.toFixed(1)} / 60

ملاحظة: هذا تقرير تلقائي من نظام المتابعة.
        `.trim();

        const formattedPhone = phone.startsWith('966') ? phone : `966${phone.startsWith('0') ? phone.slice(1) : phone}`;
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className="p-6 h-full flex flex-col animate-fade-in bg-gray-50 overflow-auto">
            <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden bg-white p-4 rounded-xl shadow-sm border border-gray-200 z-20 relative">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-teal-600" /> متابعة فردية للطلاب</h2>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Term Selector */}
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                        <Calendar size={16} className="text-gray-500"/>
                        <select 
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none w-32"
                            value={selectedTermId}
                            onChange={handleTermChange}
                        >
                            <option value="">كل الفترات</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {/* Period Selector (New) */}
                    {activeTerm && activeTerm.periods && activeTerm.periods.length > 0 && (
                        <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-200 animate-slide-in-right">
                            <span className="text-xs font-bold text-purple-700">الفترة:</span>
                            <select 
                                className="bg-transparent text-sm font-bold text-purple-800 outline-none w-24"
                                value={selectedPeriodId}
                                onChange={(e) => setSelectedPeriodId(e.target.value)}
                            >
                                <option value="">كامل الفصل</option>
                                {activeTerm.periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="relative w-64" ref={dropdownRef}>
                        <div className="relative">
                            <input type="text" placeholder="ابحث باسم الطالب..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); if(selectedStudentId) setSelectedStudentId(''); }} onFocus={() => setIsDropdownOpen(true)} className={`w-full p-2 pl-8 pr-3 border rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-teal-500 text-sm ${selectedStudentId ? 'bg-teal-50 border-teal-200 font-bold text-teal-800' : 'bg-white'}`}/>
                            {selectedStudentId ? <button onClick={clearSelection} className="absolute left-2 top-2.5 text-teal-600 hover:text-red-500"><X size={16} /></button> : <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />}
                        </div>
                        {isDropdownOpen && (
                            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 animate-fade-in custom-scrollbar">
                                {filteredStudents.length > 0 ? filteredStudents.map(s => (
                                    <div key={s.id} onClick={() => handleStudentSelect(s)} className="px-4 py-2 hover:bg-teal-50 cursor-pointer flex justify-between items-center text-sm border-b border-gray-50 last:border-0">
                                        <div><div className="font-bold text-gray-800">{s.name}</div><div className="text-xs text-gray-400">{s.className}</div></div>
                                        {selectedStudentId === s.id && <Check size={14} className="text-teal-600"/>}
                                    </div>
                                )) : <div className="p-3 text-center text-gray-400 text-xs">لا توجد نتائج مطابقة</div>}
                            </div>
                        )}
                    </div>

                    <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="p-2 border rounded-lg bg-white shadow-sm font-bold text-gray-700 outline-none text-sm">
                        {subjects.length > 0 ? subjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>) : <option value="عام">عام</option>}
                    </select>
                    
                    {selectedStudentId && (
                        <>
                            <button onClick={handleShareWhatsApp} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow hover:bg-green-700 text-sm font-bold" title="مشاركة التقرير عبر واتساب">
                                <Share2 size={16}/>
                            </button>
                            <button onClick={() => setIsCertModalOpen(true)} className="bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow hover:bg-yellow-600 text-sm font-bold animate-pulse">
                                <Gift size={16}/> شهادة
                            </button>
                        </>
                    )}

                    <button onClick={() => window.print()} disabled={!selectedStudentId} className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow hover:bg-black disabled:opacity-50 text-sm font-bold">
                        <Printer size={16}/> طباعة
                    </button>
                </div>
            </div>

            {student && stats ? (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0 w-full max-w-5xl mx-auto z-0 print:m-0">
                    
                    {/* PRINT HEADER - Visible only in Print */}
                    <div className="hidden print:flex justify-between items-center h-28 border-b-2 border-gray-800 mb-6">
                        <div className="text-right text-xs font-bold leading-loose w-1/3">
                            <p>المملكة العربية السعودية</p>
                            <p>وزارة التعليم</p>
                            <p>{headerConfig?.educationAdmin ? `إدارة التعليم بـ${headerConfig.educationAdmin}` : '.........'}</p>
                            <p>{headerConfig?.schoolName ? `مدرسة ${headerConfig.schoolName}` : '.........'}</p>
                        </div>
                        <div className="text-center flex-1 flex flex-col items-center justify-center">
                            {headerConfig?.logoBase64 ? (
                                <img src={headerConfig.logoBase64} alt="شعار" className="h-16 object-contain mb-2" />
                            ) : <div className="w-16 h-16 bg-gray-100 rounded-full border mb-1"></div>}
                            <h1 className="font-black text-lg text-gray-900">تقرير متابعة طالب</h1>
                        </div>
                        <div className="text-left text-xs font-bold leading-loose w-1/3 flex flex-col items-end">
                            <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                            <p>{headerConfig?.academicYear || '1447هـ'}</p>
                            <p>{activePeriod ? `${activeTerm?.name} - ${activePeriod.name}` : (headerConfig?.term || 'الفصل الدراسي ....')}</p>
                        </div>
                    </div>

                    <div className="text-center mb-8 print:hidden">
                        <h1 className="text-2xl font-bold text-gray-900">متابعة فردية للطلاب في مادة {selectedSubject}</h1>
                        {activeTerm && <p className="text-sm text-gray-500 mt-1">({activeTerm.name} {activePeriod ? ` - ${activePeriod.name}` : ''})</p>}
                    </div>

                    <div className="overflow-x-auto mb-8">
                        <table className="w-full text-center border-collapse text-sm">
                            <thead>
                                <tr className="bg-[#008080] text-white">
                                    <th className="p-2 border border-teal-600 w-1/4">اسم الطالب</th>
                                    <th className="p-2 border border-teal-600">الفصل</th>
                                    <th className="p-2 border border-teal-600">نسبة الحضور</th>
                                    <th className="p-2 border border-teal-600">نسبة حل الواجبات</th>
                                    <th className="p-2 border border-teal-600">مجموع الأنشطة</th>
                                    <th className="p-2 border border-teal-600">درجة الواجبات</th>
                                    <th className="p-2 border border-teal-600">درجة الأنشطة</th>
                                    <th className="p-2 border border-teal-600">درجة المشاركة</th>
                                    <th className="p-2 border border-teal-600">مجموع أعمال الفترة</th>
                                    <th className="p-2 border border-teal-600">مجموع اختبارات المنصة</th>
                                    <th className="p-2 border border-teal-600 bg-[#004d4d]">المجموع الكلي</th>
                                </tr>
                                <tr className="bg-white text-gray-800 text-xs">
                                     <td className="p-2 border border-gray-300 font-bold">{student.name}</td>
                                     <td className="p-2 border border-gray-300">{student.className}</td>
                                     <td className="p-2 border border-gray-300 dir-ltr">{Math.round(stats.attPercent)}%</td>
                                     
                                     {/* Enhanced Homework Cell */}
                                     <td className="p-2 border border-gray-300 dir-ltr font-bold text-blue-700">
                                         {Math.round(stats.hwPercent)}% <span className="text-[10px] text-gray-400 block">({stats.hwScoreSum}/{stats.hwMaxSum})</span>
                                     </td>
                                     
                                     {/* Enhanced Activity Cell */}
                                     <td className="p-2 border border-gray-300 font-bold text-amber-700">
                                         {stats.actScoreSum} / {stats.actMaxSum}
                                     </td>
                                     
                                     <td className="p-2 border border-gray-300 font-bold">{stats.gradeHW.toFixed(1)}</td>
                                     <td className="p-2 border border-gray-300 font-bold">{stats.gradeAct.toFixed(1)}</td>
                                     <td className="p-2 border border-gray-300 font-bold">{stats.gradePart.toFixed(1)}</td>
                                     <td className="p-2 border border-gray-300 font-black bg-gray-100">#####</td>
                                     
                                     {/* Enhanced Exam Cell */}
                                     <td className="p-2 border border-gray-300 font-bold">
                                         {stats.examWeighted.toFixed(1)} <span className="text-[10px] text-gray-400 block">({stats.examScoreSum}/{stats.examMaxSum})</span>
                                     </td>
                                     
                                     <td className="p-2 border border-gray-300 font-black bg-gray-800 text-white">{stats.totalPeriod.toFixed(1)}</td>
                                </tr>
                            </thead>
                        </table>
                    </div>
                    {/* Charts & Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:hidden">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h4 className="font-bold text-gray-700 mb-4 text-center">تحليل الأداء</h4>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{fontSize: 10}} />
                                        <YAxis domain={[0, 100]} />
                                        <Tooltip />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {stats.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                        {/* Comparison Line */}
                                        <ReferenceLine y={stats.classAvg} label="معدل الفصل" stroke="red" strokeDasharray="3 3" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-6 mt-2 text-xs">
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div> <span>معدل الفصل ({stats.classAvg}%)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Users size={14} className="text-gray-500"/> <span>المقارنة مع الزملاء</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Signature */}
                    <div className="hidden print:flex justify-between items-end mt-12 pt-8 border-t break-inside-avoid">
                        <div className="text-center flex flex-col items-center">
                            <p className="font-bold text-gray-600 mb-2">معلم المادة</p>
                            {headerConfig?.signatureBase64 ? (
                                <img src={headerConfig.signatureBase64} alt="Sig" className="h-16 object-contain mb-1"/>
                            ) : <div className="h-16"></div>}
                            <p className="font-bold">{headerConfig?.teacherName || '................'}</p>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-gray-600 mb-8">مدير المدرسة</p>
                            <p className="font-bold">{headerConfig?.schoolManager || '................'}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                    <div className="bg-gray-100 p-6 rounded-full mb-4">
                        <Search size={48} className="text-gray-300"/>
                    </div>
                    <p className="text-xl font-bold text-gray-500">اختر طالباً لعرض التقرير</p>
                    <p className="text-sm">يمكنك البحث بالاسم أو الهوية أعلاه</p>
                </div>
            )}
        </div>
    );
};

export default StudentFollowUp;
