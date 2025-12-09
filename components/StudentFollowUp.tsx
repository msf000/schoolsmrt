import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Subject, BehaviorStatus, SystemUser } from '../types';
import { getSubjects, getAssignments } from '../services/storageService';
import { FileText, Printer, Search, Target, Check, X, Smile, Frown, AlertCircle, Activity as ActivityIcon, BookOpen, TrendingUp, Calculator, Award, Loader2, BarChart2, Gift, Star, Medal, ThumbsUp, Clock, LineChart as LineChartIcon } from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

interface StudentFollowUpProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  currentUser?: SystemUser | null;
}

const StudentFollowUp: React.FC<StudentFollowUpProps> = ({ students, performance, attendance, currentUser }) => {
    // Safety check
    if (!students || !performance || !attendance) {
        return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32}/></div>;
    }

    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [activityTarget, setActivityTarget] = useState<number>(13); 

    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [currentUser]);

    const handleTargetChange = (val: string) => {
        const num = parseInt(val);
        if (!isNaN(num) && num > 0) {
            setActivityTarget(num);
            localStorage.setItem('works_activity_target', num.toString());
        }
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

    const rawActivityCols = getAssignments('ACTIVITY', currentUser?.id).filter(c => c.isVisible);
    const activityCols = rawActivityCols.filter(c => 
        !c.title.includes('حضور') && 
        !c.title.toLowerCase().includes('attendance') &&
        !c.title.includes('غياب')
    );

    const homeworkCols = getAssignments('HOMEWORK', currentUser?.id).filter(c => c.isVisible);
    const examCols = getAssignments('PLATFORM_EXAM', currentUser?.id).filter(c => c.isVisible);

    const calculateStats = () => {
        if (!student) return null;

        const studentAtt = attendance.filter(a => a.studentId === student.id);
        const creditCount = studentAtt.filter(a => 
            a.status === AttendanceStatus.PRESENT || 
            a.status === AttendanceStatus.LATE || 
            a.status === AttendanceStatus.EXCUSED
        ).length;
        
        const totalDays = studentAtt.length;
        const attPercent = totalDays > 0 ? (creditCount / totalDays) * 100 : 100;
        const gradePart = (attPercent / 100) * 15;

        const studentHWs = performance.filter(p => p.studentId === student.id && p.category === 'HOMEWORK' && p.subject === selectedSubject);
        const totalHWCount = homeworkCols.length;
        const distinctHWs = new Set(studentHWs.filter(p => p.score > 0).map(p => p.notes)).size;
        const hwPercent = totalHWCount > 0 ? (distinctHWs / totalHWCount) * 100 : 0;
        const gradeHW = (hwPercent / 100) * 10;

        const studentActs = performance.filter(p => p.studentId === student.id && p.category === 'ACTIVITY' && p.subject === selectedSubject);
        let actSum = 0;
        const validColKeys = new Set(activityCols.map(c => c.id));
        studentActs.forEach(p => {
             if (p.notes && validColKeys.has(p.notes)) {
                 actSum += p.score;
             }
        });

        const activityRatio = activityTarget > 0 ? (actSum / activityTarget) : 0;
        const gradeAct = Math.min(activityRatio * 15, 15);
        const actPercent = Math.min(activityRatio * 100, 100);

        const studentExams = performance.filter(p => p.studentId === student.id && p.category === 'PLATFORM_EXAM' && p.subject === selectedSubject);
        let examScoreSum = 0;
        let examMaxSum = 0;
        studentExams.forEach(p => {
            examScoreSum += p.score;
            examMaxSum += p.maxScore > 0 ? p.maxScore : 20;
        });
        const examWeightedRaw = examMaxSum > 0 ? (examScoreSum / examMaxSum) * 20 : 0;
        const examWeighted = Math.min(examWeightedRaw, 20);

        const totalTasks = gradeHW + gradeAct + gradePart;
        const totalPeriod = totalTasks + examWeighted;

        const behaviorLogs = studentAtt
            .filter(a => (a.behaviorStatus && a.behaviorStatus !== BehaviorStatus.NEUTRAL) || a.behaviorNote)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // --- TREND ANALYSIS ---
        // 1. Behavior Trend (Cumulative)
        let behScore = 0;
        const behaviorTrendData = studentAtt
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(a => {
                if(a.behaviorStatus === 'POSITIVE') behScore += 1;
                if(a.behaviorStatus === 'NEGATIVE') behScore -= 1;
                return { date: a.date.slice(5), score: behScore };
            })
            // Filter to reduce points for cleaner chart
            .filter((_, i) => i % 2 === 0 || i === studentAtt.length - 1); 

        // 2. Academic Trend (Grades over time)
        const academicTrendData = performance
            .filter(p => p.studentId === student.id && p.subject === selectedSubject)
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(p => ({
                name: p.title,
                grade: Math.round((p.score / p.maxScore) * 100),
                full: 100
            }));

        // Prepare chart data
        const chartData = [
            { name: 'الحضور', value: Math.round(attPercent), full: 100, fill: '#10b981' },
            { name: 'الواجبات', value: Math.round(hwPercent), full: 100, fill: '#3b82f6' },
            { name: 'الأنشطة', value: Math.round(actPercent), full: 100, fill: '#f59e0b' },
            { name: 'الاختبارات', value: Math.round((examWeighted / 20) * 100), full: 100, fill: '#8b5cf6' },
        ];

        return {
            attPercent, gradePart,
            hwPercent, distinctHWs, totalHWCount, gradeHW,
            actSum, gradeAct, actPercent,
            examWeighted,
            totalTasks, totalPeriod,
            studentActs, studentHWs, studentExams,
            behaviorLogs,
            chartData,
            behaviorTrendData,
            academicTrendData
        };
    };

    const stats = calculateStats();

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 h-full flex flex-col animate-fade-in bg-gray-50 overflow-auto">
            <div className="mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden bg-white p-4 rounded-xl shadow-sm border border-gray-200 z-20 relative">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-teal-600" />
                        متابعة فردية للطلاب
                    </h2>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <Target size={16} className="text-amber-600"/>
                        <span className="text-xs font-bold text-amber-800">هدف الأنشطة:</span>
                        <input 
                            type="number" 
                            min="1"
                            value={activityTarget}
                            onChange={(e) => handleTargetChange(e.target.value)}
                            className="w-16 p-1 text-center border rounded text-sm font-bold bg-white focus:ring-1 focus:ring-amber-500"
                            title="سيتم حفظ هذا الرقم واستخدامه لحساب نسبة الأنشطة"
                        />
                    </div>

                    <div className="relative w-64" ref={dropdownRef}>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ابحث باسم الطالب..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setIsDropdownOpen(true);
                                    if(selectedStudentId) setSelectedStudentId(''); 
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                className={`w-full p-2 pl-8 pr-3 border rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-teal-500 text-sm ${selectedStudentId ? 'bg-teal-50 border-teal-200 font-bold text-teal-800' : 'bg-white'}`}
                            />
                            {selectedStudentId ? (
                                <button onClick={clearSelection} className="absolute left-2 top-2.5 text-teal-600 hover:text-red-500">
                                    <X size={16} />
                                </button>
                            ) : (
                                <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                            )}
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50 animate-fade-in custom-scrollbar">
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map(s => (
                                        <div 
                                            key={s.id}
                                            onClick={() => handleStudentSelect(s)}
                                            className="px-4 py-2 hover:bg-teal-50 cursor-pointer flex justify-between items-center text-sm border-b border-gray-50 last:border-0"
                                        >
                                            <div>
                                                <div className="font-bold text-gray-800">{s.name}</div>
                                                <div className="text-xs text-gray-400">{s.className}</div>
                                            </div>
                                            {selectedStudentId === s.id && <Check size={14} className="text-teal-600"/>}
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-3 text-center text-gray-400 text-xs">لا توجد نتائج مطابقة</div>
                                )}
                            </div>
                        )}
                    </div>

                    <select 
                        value={selectedSubject} 
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="p-2 border rounded-lg bg-white shadow-sm font-bold text-gray-700 outline-none text-sm"
                    >
                        {subjects.length > 0 ? subjects.map(sub => <option key={sub.id} value={sub.name}>{sub.name}</option>) : <option value="عام">عام</option>}
                    </select>
                    
                    {selectedStudentId && (
                        <button 
                            onClick={() => setIsCertModalOpen(true)}
                            className="bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow hover:bg-yellow-600 text-sm font-bold animate-pulse"
                        >
                            <Gift size={16}/> شهادة
                        </button>
                    )}

                    <button onClick={handlePrint} disabled={!selectedStudentId} className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow hover:bg-black disabled:opacity-50 text-sm font-bold">
                        <Printer size={16}/> طباعة
                    </button>
                </div>
            </div>

            {student && stats ? (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0 w-full max-w-5xl mx-auto z-0">
                    
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">متابعة فردية للطلاب في مادة {selectedSubject}</h1>
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
                                     <td className="p-2 border border-gray-300 dir-ltr">{Math.round(stats.hwPercent)}%</td>
                                     <td className="p-2 border border-gray-300 font-bold text-teal-700">{stats.actSum}</td>
                                     <td className="p-2 border border-gray-300 font-bold">{stats.gradeHW.toFixed(1)}</td>
                                     <td className="p-2 border border-gray-300 font-bold">{stats.gradeAct.toFixed(1)}</td>
                                     <td className="p-2 border border-gray-300 font-bold">{stats.gradePart.toFixed(1)}</td>
                                     <td className="p-2 border border-gray-300 font-black bg-gray-100">#####</td>
                                     <td className="p-2 border border-gray-300 font-bold">{stats.examWeighted.toFixed(1)}</td>
                                     <td className="p-2 border border-gray-300 font-black bg-gray-800 text-white">{stats.totalPeriod.toFixed(1)}</td>
                                </tr>
                            </thead>
                        </table>
                    </div>

                    {/* Charts Section */}
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                        {/* 1. Behavior Trend */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 h-72 flex flex-col">
                            <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2 text-sm">
                                <TrendingUp size={16} className="text-blue-600"/> تطور السلوك (تراكمي)
                            </h4>
                            <div className="flex-1 min-h-0">
                                {stats.behaviorTrendData.length > 1 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.behaviorTrendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" tick={{fontSize: 10}} />
                                            <YAxis tick={{fontSize: 10}} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="score" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs">لا توجد بيانات كافية</div>}
                            </div>
                        </div>

                        {/* 2. Academic Trend */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 h-72 flex flex-col">
                            <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2 text-sm">
                                <LineChartIcon size={16} className="text-purple-600"/> التقدم الأكاديمي
                            </h4>
                            <div className="flex-1 min-h-0">
                                {stats.academicTrendData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={stats.academicTrendData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{fontSize: 9}} angle={-15} textAnchor="end" height={40}/>
                                            <YAxis domain={[0, 100]} tick={{fontSize: 10}} />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="grade" stroke="#8b5cf6" strokeWidth={2} dot={{r:4}} activeDot={{r:6}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : <div className="h-full flex items-center justify-center text-gray-400 text-xs">لا توجد درجات مسجلة</div>}
                            </div>
                        </div>
                    </div>

                    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 h-64 flex flex-col">
                            <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2 text-sm"><BarChart2 size={16}/> توزيع الدرجات</h4>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{fontSize: 10}} />
                                        <YAxis domain={[0, 100]} tick={{fontSize: 10}} />
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                        <Bar dataKey="value" barSize={40} radius={[4, 4, 0, 0]}>
                                            {stats.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {stats.behaviorLogs.length > 0 ? (
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col h-64">
                                <div className="bg-gray-200 p-2 text-center font-bold text-sm mb-0 flex items-center justify-center gap-2">
                                    <AlertCircle size={16} className="text-gray-600"/>
                                    سجل السلوك والمواظبة
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-right text-xs">
                                        <thead className="bg-gray-50 text-gray-700 sticky top-0">
                                            <tr>
                                                <th className="p-2 font-bold">التاريخ</th>
                                                <th className="p-2 font-bold">الحصة</th>
                                                <th className="p-2 font-bold">حالة السلوك</th>
                                                <th className="p-2 font-bold">الملاحظات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {stats.behaviorLogs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50">
                                                    <td className="p-2 text-gray-600 font-mono">{formatDualDate(log.date)}</td>
                                                    <td className="p-2 text-gray-600">{log.period ? `الحصة ${log.period}` : '-'}</td>
                                                    <td className="p-2">
                                                        {log.behaviorStatus === BehaviorStatus.POSITIVE && <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-1.5 py-0.5 rounded text-[10px] font-bold"><Smile size={12}/> إيجابي</span>}
                                                        {log.behaviorStatus === BehaviorStatus.NEGATIVE && <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-1.5 py-0.5 rounded text-[10px] font-bold"><Frown size={12}/> سلبي</span>}
                                                        {(!log.behaviorStatus || log.behaviorStatus === BehaviorStatus.NEUTRAL) && <span className="text-gray-400 text-[10px]">-</span>}
                                                    </td>
                                                    <td className="p-2 text-gray-700 font-medium">
                                                        {log.behaviorNote || <span className="text-gray-300 italic">لا توجد ملاحظات</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl h-64 bg-gray-50">
                                <div className="text-center text-gray-400">
                                    <Smile size={40} className="mx-auto mb-2 opacity-30"/>
                                    <p className="text-sm">سجل السلوك نظيف وممتاز!</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mb-8">
                        <div className="bg-gray-200 p-2 text-center font-bold text-lg mb-2">متابعة الأنشطة</div>
                        {activityCols.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-center border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-[#009da0] text-white">
                                            <th className="p-2 border border-teal-600 min-w-[80px] bg-teal-800">المجموع</th>
                                            {activityCols.map(col => (
                                                <th key={col.id} className="p-2 border border-teal-600">{col.title}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-gray-50">
                                            <td className="p-2 border border-gray-300 font-black text-lg text-teal-800 bg-teal-50">{stats.actSum}</td>
                                            {activityCols.map(col => {
                                                const rec = stats.studentActs.find(p => p.notes === col.id);
                                                return (
                                                    <td key={col.id} className="p-2 border border-gray-300">
                                                        {rec ? rec.score : ''}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center p-4 border border-dashed text-gray-400">لا توجد أعمدة أنشطة معرفة حالياً.</div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <div className="bg-gray-200 p-2 text-center font-bold text-lg mb-2">واجبات مدرستي</div>
                            <table className="w-full text-center border-collapse text-sm">
                                <thead>
                                    <tr className="bg-[#20b2aa] text-white">
                                        <th className="p-2 border border-teal-600 w-1/3">نسبة حل الواجبات</th>
                                        <th className="p-2 border border-teal-600 w-1/3">عدد الواجبات المكتملة</th>
                                        <th className="p-2 border border-teal-600 w-1/3 bg-[#008080]">الواجبات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-4 border border-gray-300 font-bold text-lg" rowSpan={homeworkCols.length + 1}>
                                            {Math.round(stats.hwPercent)}%
                                        </td>
                                        <td className="p-4 border border-gray-300 font-bold text-lg" rowSpan={homeworkCols.length + 1}>
                                            {stats.distinctHWs} / {stats.totalHWCount}
                                        </td>
                                    </tr>
                                    {homeworkCols.map(col => {
                                         const isDone = stats.studentHWs.some(p => p.notes === col.id && p.score > 0);
                                         return (
                                             <tr key={col.id}>
                                                 <td className={`p-2 border border-gray-300 text-right ${isDone ? 'bg-green-50' : 'bg-red-50'}`}>
                                                     {col.title} {isDone ? '✅' : '❌'}
                                                 </td>
                                             </tr>
                                         )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div>
                             <div className="bg-gray-200 p-2 text-center font-bold text-lg mb-2">اختبارات المنصة</div>
                             <table className="w-full text-center border-collapse text-sm">
                                <thead>
                                    <tr className="bg-[#4682b4] text-white">
                                        <th className="p-2 border border-blue-800">الموزونة</th>
                                        <th className="p-2 border border-blue-800">اختبار ...</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-4 border border-gray-300 font-bold text-lg" rowSpan={examCols.length + 1}>
                                            {stats.examWeighted.toFixed(1)}
                                        </td>
                                    </tr>
                                    {examCols.map(col => {
                                        const rec = stats.studentExams.find(p => p.notes === col.id);
                                        return (
                                            <tr key={col.id}>
                                                <td className="p-2 border border-gray-300 bg-gray-50 flex justify-between px-4">
                                                    <span>{col.title}</span>
                                                    <span className="font-bold">{rec ? rec.score : '-'}</span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                     {examCols.length === 0 && (
                                         <tr><td className="p-4 text-gray-400">لا توجد اختبارات مسجلة</td></tr>
                                     )}
                                </tbody>
                             </table>
                        </div>
                    </div>

                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-xl font-bold">الرجاء اختيار طالب لعرض التقرير</p>
                    <p className="text-sm mt-2">يمكنك البحث باسم الطالب في القائمة أعلاه</p>
                </div>
            )}

            {/* CERTIFICATE MODAL */}
            {isCertModalOpen && student && (
                <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col h-[90vh] md:h-auto overflow-hidden animate-slide-up">
                        <div className="flex bg-gray-100 p-4 border-b justify-between items-center shrink-0">
                            <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                <Award className="text-yellow-600"/> إصدار شهادة
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={() => setCertType('EXCELLENCE')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${certType === 'EXCELLENCE' ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400' : 'bg-white'}`}>تفوق</button>
                                <button onClick={() => setCertType('ATTENDANCE')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${certType === 'ATTENDANCE' ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-400' : 'bg-white'}`}>مواظبة</button>
                                <button onClick={() => setCertType('BEHAVIOR')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${certType === 'BEHAVIOR' ? 'bg-green-100 text-green-800 ring-2 ring-green-400' : 'bg-white'}`}>سلوك</button>
                                <button onClick={() => setCertType('THANKS')} className={`px-3 py-1 rounded text-xs font-bold transition-colors ${certType === 'THANKS' ? 'bg-purple-100 text-purple-800 ring-2 ring-purple-400' : 'bg-white'}`}>شكر</button>
                            </div>
                            <button onClick={() => setIsCertModalOpen(false)} className="text-gray-500 hover:text-red-500"><X/></button>
                        </div>

                        <div className="flex-1 overflow-auto bg-gray-200 p-8 flex items-center justify-center">
                            {/* CERTIFICATE CANVAS */}
                            <div id="certificate-print" className="bg-white w-[800px] h-[560px] relative shadow-2xl p-10 flex flex-col items-center justify-between text-center border-[12px] border-double border-[#b8860b] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]">
                                
                                {/* Decorative Corners */}
                                <div className="absolute top-4 left-4 w-16 h-16 border-t-4 border-l-4 border-[#b8860b]"></div>
                                <div className="absolute top-4 right-4 w-16 h-16 border-t-4 border-r-4 border-[#b8860b]"></div>
                                <div className="absolute bottom-4 left-4 w-16 h-16 border-b-4 border-l-4 border-[#b8860b]"></div>
                                <div className="absolute bottom-4 right-4 w-16 h-16 border-b-4 border-r-4 border-[#b8860b]"></div>

                                {/* Header */}
                                <div className="w-full flex justify-between items-start opacity-70">
                                    <div className="text-right text-xs">
                                        <p>المملكة العربية السعودية</p>
                                        <p>وزارة التعليم</p>
                                    </div>
                                    <div className="text-left text-xs">
                                        <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                                    </div>
                                </div>

                                {/* Title */}
                                <div className="mt-4">
                                    {certType === 'EXCELLENCE' && <Medal size={64} className="mx-auto text-[#b8860b] mb-4"/>}
                                    {certType === 'ATTENDANCE' && <Clock size={64} className="mx-auto text-blue-600 mb-4"/>}
                                    {certType === 'BEHAVIOR' && <Star size={64} className="mx-auto text-green-600 mb-4 fill-green-100"/>}
                                    {certType === 'THANKS' && <ThumbsUp size={64} className="mx-auto text-purple-600 mb-4"/>}
                                    
                                    <h1 className="text-5xl font-black text-[#b8860b] font-serif mb-2">
                                        {certType === 'EXCELLENCE' ? 'شهادة تفوق وتميز' : 
                                         certType === 'ATTENDANCE' ? 'شهادة انضباط ومواظبة' : 
                                         certType === 'BEHAVIOR' ? 'شهادة حسن سيرة وسلوك' : 'شهادة شكر وتقدير'}
                                    </h1>
                                </div>

                                {/* Body */}
                                <div className="flex-1 flex flex-col justify-center gap-6 w-3/4">
                                    <p className="text-xl text-gray-700 font-medium">تتقدم إدارة المدرسة / المعلم بالشكر والتقدير للطالب:</p>
                                    <h2 className="text-4xl font-black text-gray-900 border-b-2 border-gray-200 pb-2">{student.name}</h2>
                                    <p className="text-lg text-gray-600">
                                        {certType === 'EXCELLENCE' ? `لتفوقه الدراسي وتميزه في مادة ${selectedSubject}، متمنين له دوام التوفيق والنجاح.` :
                                         certType === 'ATTENDANCE' ? 'لانضباطه في الحضور وعدم الغياب خلال الفترة الماضية، بارك الله فيه.' :
                                         certType === 'BEHAVIOR' ? 'لتحليه بالأخلاق الفاضلة والسلوك الحسن ومساعدته لزملائه.' :
                                         'لجهوده المبذولة ومشاركته الفاعلة، سائلين الله له المزيد من النجاح.'}
                                    </p>
                                </div>

                                {/* Signatures */}
                                <div className="w-full flex justify-between px-20 mt-8">
                                    <div className="text-center">
                                        <p className="font-bold text-gray-800 mb-8">معلم المادة</p>
                                        <p className="font-serif text-lg">{currentUser?.name || '...................'}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-800 mb-8">مدير المدرسة</p>
                                        <p className="font-serif text-lg">...................</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-white flex justify-end gap-3">
                            <button onClick={() => window.print()} className="px-6 py-2 bg-gray-800 text-white rounded-lg font-bold flex items-center gap-2 hover:bg-black transition-colors shadow-lg">
                                <Printer size={18}/> طباعة الشهادة
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentFollowUp;