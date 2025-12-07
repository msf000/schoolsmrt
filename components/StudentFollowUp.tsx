
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Subject, BehaviorStatus, SystemUser } from '../types';
import { getSubjects, getAssignments } from '../services/storageService';
import { FileText, Printer, Search, Target, Check, X, Smile, Frown, AlertCircle, Activity as ActivityIcon, BookOpen, TrendingUp, Calculator, Award, Loader2 } from 'lucide-react';
import { formatDualDate } from '../services/dateService';

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

    useEffect(() => {
        // FIX: Fetch all relevant subjects (including legacy ones) using currentUser
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

    // FIX: Get Assignments generally (allow legacy) for the current user
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

        // Note: Performance records are already filtered by App.tsx to include legacy ones
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

        return {
            attPercent, gradePart,
            hwPercent, distinctHWs, totalHWCount, gradeHW,
            actSum, gradeAct, actPercent,
            examWeighted,
            totalTasks, totalPeriod,
            studentActs, studentHWs, studentExams,
            behaviorLogs
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
                    
                    <button onClick={handlePrint} disabled={!selectedStudentId} className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow hover:bg-black disabled:opacity-50 text-sm font-bold">
                        <Printer size={16}/> طباعة
                    </button>
                </div>
            </div>

            {student && stats ? (
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0 w-full max-w-5xl mx-auto z-0">
                    
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">متابعة فردية للطلاب في مادة {selectedSubject} الفصل الأول 1447هـ</h1>
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

                    {stats.behaviorLogs.length > 0 && (
                        <div className="mb-8">
                            <div className="bg-gray-200 p-2 text-center font-bold text-lg mb-2 flex items-center justify-center gap-2">
                                <AlertCircle size={20} className="text-gray-600"/>
                                سجل السلوك والمواظبة
                            </div>
                            <div className="overflow-hidden border border-gray-200 rounded-lg">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-gray-50 text-gray-700">
                                        <tr>
                                            <th className="p-3 w-32 font-bold">التاريخ</th>
                                            <th className="p-3 w-32 font-bold">الحصة</th>
                                            <th className="p-3 w-40 font-bold">حالة السلوك</th>
                                            <th className="p-3 font-bold">الملاحظات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {stats.behaviorLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50">
                                                <td className="p-3 text-gray-600 text-xs font-mono">{formatDualDate(log.date)}</td>
                                                <td className="p-3 text-gray-600 text-xs">{log.period ? `الحصة ${log.period}` : '-'}</td>
                                                <td className="p-3">
                                                    {log.behaviorStatus === BehaviorStatus.POSITIVE && <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-xs font-bold"><Smile size={14}/> إيجابي</span>}
                                                    {log.behaviorStatus === BehaviorStatus.NEGATIVE && <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded text-xs font-bold"><Frown size={14}/> سلبي</span>}
                                                    {(!log.behaviorStatus || log.behaviorStatus === BehaviorStatus.NEUTRAL) && <span className="text-gray-400 text-xs">-</span>}
                                                </td>
                                                <td className="p-3 text-gray-700 font-medium">
                                                    {log.behaviorNote || <span className="text-gray-300 text-xs italic">لا توجد ملاحظات</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

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
                             <div className="bg-gray-200 p-2 text-center font-bold text-lg mb-2">اختبارات مدرستي</div>
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
                <div className="flex flex-col items-center justify-center h-96 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-xl font-bold">الرجاء اختيار طالب لعرض التقرير</p>
                    <p className="text-sm mt-2">يمكنك البحث باسم الطالب في القائمة أعلاه</p>
                </div>
            )}
        </div>
    );
};

export default StudentFollowUp;
