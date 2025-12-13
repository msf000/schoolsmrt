import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Subject, BehaviorStatus, SystemUser, AcademicTerm, ReportHeaderConfig, Assignment } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, getReportHeaderConfig, forceRefreshData } from '../services/storageService';
import { FileText, Printer, Search, Target, Check, X, Smile, Frown, AlertCircle, Activity as ActivityIcon, BookOpen, TrendingUp, Calculator, Award, Loader2, BarChart2, Gift, Star, Medal, ThumbsUp, Clock, LineChart as LineChartIcon, Calendar, Share2, Users, RefreshCw, List, Phone, MapPin, Zap, Table, CheckSquare, LayoutGrid, Filter, Layers } from 'lucide-react';
import { formatDualDate } from '../services/dateService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area, ReferenceLine, PieChart, Pie } from 'recharts';

interface StudentFollowUpProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  currentUser?: SystemUser | null;
  onSaveAttendance?: (records: AttendanceRecord[]) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
    'HOMEWORK': 'الواجبات والمهام',
    'ACTIVITY': 'الأنشطة والمشاركة',
    'PLATFORM_EXAM': 'الاختبارات والتقييمات',
    'YEAR_WORK': 'أعمال السنة (تجميعي)',
    'OTHER': 'تقييمات عامة'
};

const CATEGORY_STYLES: Record<string, { bg: string, text: string, border: string, icon: any, headerBg: string }> = {
    'HOMEWORK': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: BookOpen, headerBg: 'bg-blue-100/50' },
    'ACTIVITY': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', icon: Star, headerBg: 'bg-orange-100/50' },
    'PLATFORM_EXAM': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', icon: Award, headerBg: 'bg-purple-100/50' },
    'YEAR_WORK': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', icon: Calculator, headerBg: 'bg-teal-100/50' },
    'OTHER': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-100', icon: FileText, headerBg: 'bg-gray-100/50' }
};

const DISPLAY_ORDER = ['PLATFORM_EXAM', 'HOMEWORK', 'ACTIVITY', 'YEAR_WORK', 'OTHER'];

const StudentFollowUp: React.FC<StudentFollowUpProps> = ({ students, performance, attendance, currentUser, onSaveAttendance }) => {
    // Safety check
    if (!students) {
        return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32}/></div>;
    }

    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // View Mode State
    const [viewMode, setViewMode] = useState<'SUMMARY' | 'DETAILS'>('SUMMARY');

    // Filter State
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);

    useEffect(() => {
        const loadedTerms = getAcademicTerms(currentUser?.id);
        setTerms(loadedTerms);
        const current = loadedTerms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);

        // Load Assignments for robust linking
        setAssignments(getAssignments('ALL', currentUser?.id, true));

        const navStudentId = localStorage.getItem('nav_context_student_id');
        if (navStudentId) {
            const exists = students.find(s => s.id === navStudentId);
            if (exists) {
                setSelectedStudentId(navStudentId);
                setSearchTerm(exists.name);
            }
            localStorage.removeItem('nav_context_student_id');
        }
    }, [currentUser, students]);

    const activeTerm = terms.find(t => t.id === selectedTermId);
    
    const activePeriods = useMemo(() => {
        if (!activeTerm?.periods) return [];
        return [...activeTerm.periods].sort((a, b) => {
            const dateA = a.startDate || '';
            const dateB = b.startDate || '';
            if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
            return a.name.localeCompare(b.name, 'ar');
        });
    }, [activeTerm]);

    const student = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

    // --- CALCULATE STATS ---
    const stats = useMemo(() => {
        if (!student) return null;

        let sAtt = attendance.filter(a => a.studentId === student.id);
        let sPerf = performance.filter(p => p.studentId === student.id);

        // Determine Date Range based on Term AND Period
        let dateStart = activeTerm?.startDate;
        let dateEnd = activeTerm?.endDate;

        if (selectedPeriodId && activeTerm?.periods) {
            const period = activeTerm.periods.find(p => p.id === selectedPeriodId);
            if (period) {
                dateStart = period.startDate;
                dateEnd = period.endDate;
            }
        }

        // --- Filter Performance (Smart Link using Assignment Period ID) ---
        if (selectedPeriodId) {
            sPerf = sPerf.filter(p => {
                // 1. Try to link via ID stored in notes
                const assign = assignments.find(a => a.id === p.notes);
                if (assign && assign.periodId) {
                    return assign.periodId === selectedPeriodId;
                }
                // 2. Fallback: If date range exists, use dates
                if (dateStart && dateEnd) {
                    return p.date >= dateStart && p.date <= dateEnd;
                }
                return true;
            });
        } else if (activeTerm) {
            sPerf = sPerf.filter(p => {
                const assign = assignments.find(a => a.id === p.notes);
                if (assign && assign.termId) {
                    return assign.termId === selectedTermId;
                }
                if (dateStart && dateEnd) {
                    return p.date >= dateStart && p.date <= dateEnd;
                }
                return true;
            });
        }

        // --- Filter Attendance (Strictly Date Based) ---
        if (dateStart && dateEnd) {
            sAtt = sAtt.filter(a => a.date >= dateStart! && a.date <= dateEnd!);
        }

        // Attendance Stats
        const totalDays = sAtt.length;
        const present = sAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const absent = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const late = sAtt.filter(a => a.status === AttendanceStatus.LATE).length;
        const attRate = totalDays > 0 ? Math.round(((present + late) / totalDays) * 100) : 100;

        // Behavior
        const posBeh = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;
        const negBeh = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;

        // Performance Stats
        const totalScore = sPerf.reduce((acc, curr) => acc + (curr.score / curr.maxScore), 0);
        const avgScore = sPerf.length > 0 ? Math.round((totalScore / sPerf.length) * 100) : 0;

        // Trends (Last 5 grades)
        const recentPerf = [...sPerf].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-5);
        const trendData = recentPerf.map(p => ({
            name: p.title || p.subject,
            score: Math.round((p.score / p.maxScore) * 100)
        }));

        // Subject Breakdown
        const subjectStats: Record<string, {total: number, count: number}> = {};
        sPerf.forEach(p => {
            if (!subjectStats[p.subject]) subjectStats[p.subject] = { total: 0, count: 0 };
            subjectStats[p.subject].total += (p.score / p.maxScore);
            subjectStats[p.subject].count += 1;
        });
        
        const subjectsData = Object.keys(subjectStats).map(sub => ({
            name: sub,
            avg: Math.round((subjectStats[sub].total / subjectStats[sub].count) * 100)
        })).sort((a,b) => b.avg - a.avg);

        // Sort Performance for Detail View (Newest First)
        const sortedPerf = [...sPerf].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { attRate, absent, late, posBeh, negBeh, avgScore, trendData, subjectsData, sAtt, sPerf: sortedPerf };
    }, [student, attendance, performance, activeTerm, selectedPeriodId, assignments]);

    const handleShareWhatsApp = () => {
        if (!student || !stats) return;
        const phone = student.parentPhone ? student.parentPhone.replace(/\D/g, '') : '';
        if (!phone) return alert('رقم ولي الأمر غير مسجل');
        
        const periodName = selectedPeriodId 
            ? activeTerm?.periods?.find(p => p.id === selectedPeriodId)?.name 
            : activeTerm ? activeTerm.name : 'الحالية';

        const message = `
تقرير الطالب: ${student.name}
الفترة: ${periodName}

📊 الملخص:
- نسبة الحضور: ${stats.attRate}% (${stats.absent} غياب)
- المستوى الأكاديمي: ${stats.avgScore}%
- السلوك: ${stats.posBeh} إيجابي / ${stats.negBeh} ملاحظات

نأمل منكم المتابعة والدعم. شكراً لكم.
        `.trim();

        const formattedPhone = phone.startsWith('966') ? phone : `966${phone.startsWith('0') ? phone.slice(1) : phone}`;
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleSearchSelect = (s: Student) => {
        setSelectedStudentId(s.id);
        setSearchTerm(s.name);
        setIsDropdownOpen(false);
    };

    const filteredList = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-auto">
            
            {/* Header / Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><FileText size={24}/></div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">ملف الطالب الشامل</h2>
                        <p className="text-sm text-gray-500">تحليل تفصيلي للأداء والسلوك</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto relative items-center" ref={dropdownRef}>
                    <div className="relative flex-1 md:w-64 w-full">
                        <input 
                            className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold"
                            placeholder="ابحث عن طالب..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                            onFocus={() => setIsDropdownOpen(true)}
                        />
                        <Search className="absolute left-2 top-2.5 text-gray-400" size={16}/>
                        
                        {isDropdownOpen && (
                            <div className="absolute top-full right-0 w-full bg-white border rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
                                {filteredList.length > 0 ? filteredList.map(s => (
                                    <div key={s.id} onClick={() => handleSearchSelect(s)} className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0 text-sm">
                                        <div className="font-bold text-gray-800">{s.name}</div>
                                        <div className="text-xs text-gray-500">{s.className}</div>
                                    </div>
                                )) : <div className="p-3 text-center text-gray-400 text-xs">لا يوجد نتائج</div>}
                            </div>
                        )}
                    </div>
                    
                    {/* Period Filtering */}
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border">
                        <Filter size={14} className="text-gray-400 ml-1 mr-1"/>
                        <select 
                            className="bg-transparent text-xs font-bold outline-none text-purple-700 min-w-[100px]"
                            value={selectedTermId}
                            onChange={e => { setSelectedTermId(e.target.value); setSelectedPeriodId(''); }}
                        >
                            <option value="">كل الفترات</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        {activePeriods.length > 0 && (
                            <>
                                <div className="w-[1px] h-4 bg-gray-300 mx-1"></div>
                                <select 
                                    className="bg-transparent text-xs font-bold outline-none text-gray-700 min-w-[80px]"
                                    value={selectedPeriodId}
                                    onChange={e => setSelectedPeriodId(e.target.value)}
                                >
                                    <option value="">الكل</option>
                                    {activePeriods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {student && stats ? (
                <div className="space-y-6">
                    {/* Student Info Card */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-600 border-4 border-white shadow-md">
                                    {student.name.charAt(0)}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-gray-800">{student.name}</h1>
                                    <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1"><Users size={12}/> {student.gradeLevel} - {student.className}</span>
                                        <span className="bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1"><MapPin size={12}/> ID: {student.nationalId}</span>
                                    </div>
                                    {student.parentPhone && (
                                        <div className="flex items-center gap-2 mt-2 text-green-600 text-xs font-bold bg-green-50 w-fit px-2 py-1 rounded cursor-pointer hover:bg-green-100" onClick={handleShareWhatsApp}>
                                            <Phone size={12}/> ولي الأمر: {student.parentPhone} (مراسلة)
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* High Level Stats */}
                            <div className="flex gap-4 items-center">
                                <div className="text-center px-4 border-l">
                                    <div className={`text-3xl font-black ${stats.attRate >= 90 ? 'text-green-600' : 'text-red-600'}`}>{stats.attRate}%</div>
                                    <div className="text-xs text-gray-400 font-bold">الحضور</div>
                                </div>
                                <div className="text-center px-4 border-l">
                                    <div className="text-3xl font-black text-blue-600">{stats.avgScore}</div>
                                    <div className="text-xs text-gray-400 font-bold">المعدل</div>
                                </div>
                                <div className="text-center px-4">
                                    <div className="text-3xl font-black text-yellow-500">{stats.posBeh}</div>
                                    <div className="text-xs text-gray-400 font-bold">نقاط</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-gray-200">
                        <button 
                            onClick={() => setViewMode('SUMMARY')}
                            className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 transition-colors ${viewMode === 'SUMMARY' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <LayoutGrid size={16}/> ملخص الأداء
                        </button>
                        <button 
                            onClick={() => setViewMode('DETAILS')}
                            className={`pb-3 px-2 font-bold text-sm flex items-center gap-2 transition-colors ${viewMode === 'DETAILS' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}
                        >
                            <Layers size={16}/> تفاصيل التقييم (حسب التصنيف)
                        </button>
                    </div>

                    {viewMode === 'SUMMARY' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Grade Trend Chart */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><TrendingUp size={18}/> تطور المستوى الأكاديمي</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stats.trendData}>
                                                <defs>
                                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" tick={{fontSize: 10}} hide />
                                                <YAxis domain={[0, 100]} />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="score" stroke="#8884d8" fillOpacity={1} fill="url(#colorScore)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Subject Performance */}
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><BookOpen size={18}/> الأداء حسب المادة</h3>
                                    <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                        {stats.subjectsData.map((sub, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="w-24 text-xs font-bold text-gray-600 truncate">{sub.name}</div>
                                                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${sub.avg >= 90 ? 'bg-green-500' : sub.avg >= 75 ? 'bg-blue-500' : sub.avg >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                                                        style={{width: `${sub.avg}%`}}
                                                    ></div>
                                                </div>
                                                <div className="w-10 text-xs font-bold text-gray-800 text-left">{sub.avg}%</div>
                                            </div>
                                        ))}
                                        {stats.subjectsData.length === 0 && <p className="text-center text-gray-400 text-sm py-10">لا توجد بيانات</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Lists */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Attendance Log */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    <div className="p-4 bg-teal-50 border-b border-teal-100 font-bold text-teal-800 flex justify-between">
                                        <span>سجل الغياب والتأخر</span>
                                        <span className="bg-white px-2 rounded text-xs border text-teal-600">{stats.absent + stats.late} حالة</span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {stats.sAtt.filter(a => a.status !== 'PRESENT').length > 0 ? (
                                            <table className="w-full text-right text-xs">
                                                <thead className="bg-gray-50 text-gray-500"><tr><th className="p-2">التاريخ</th><th className="p-2">الحالة</th><th className="p-2">عذر</th></tr></thead>
                                                <tbody className="divide-y">
                                                    {stats.sAtt.filter(a => a.status !== 'PRESENT').map(a => (
                                                        <tr key={a.id}>
                                                            <td className="p-2">{formatDualDate(a.date)}</td>
                                                            <td className="p-2">
                                                                <span className={`px-2 py-0.5 rounded font-bold ${a.status === 'ABSENT' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                    {a.status === 'ABSENT' ? 'غائب' : 'تأخر'}
                                                                </span>
                                                            </td>
                                                            <td className="p-2 text-gray-500">{a.excuseNote || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : <div className="p-8 text-center text-gray-400 text-sm">سجل الحضور ممتاز! لا غياب.</div>}
                                    </div>
                                </div>

                                {/* Recent Grades */}
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    <div className="p-4 bg-blue-50 border-b border-blue-100 font-bold text-blue-800">آخر الدرجات المرصودة</div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        <table className="w-full text-right text-xs">
                                            <thead className="bg-gray-50 text-gray-500"><tr><th className="p-2">المادة/العنوان</th><th className="p-2">الدرجة</th></tr></thead>
                                            <tbody className="divide-y">
                                                {stats.sPerf.slice(0, 10).map(p => (
                                                    <tr key={p.id}>
                                                        <td className="p-2">
                                                            <div className="font-bold text-gray-700">{p.title}</div>
                                                            <div className="text-[10px] text-gray-400">{p.subject}</div>
                                                        </td>
                                                        <td className="p-2">
                                                            <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded font-bold border border-blue-100">{p.score} / {p.maxScore}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {viewMode === 'DETAILS' && (
                        <div className="animate-fade-in space-y-8 pb-10">
                            {/* Group Header Info */}
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <List size={20} className="text-purple-600"/> تفاصيل التقييم (حسب التصنيف)
                                </h3>
                                {selectedPeriodId && (
                                    <span className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-bold border border-purple-100">
                                        {activeTerm?.periods?.find(p => p.id === selectedPeriodId)?.name}
                                    </span>
                                )}
                            </div>

                            {stats.sPerf.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                                    <Search size={48} className="mb-4 opacity-20"/>
                                    <p className="font-bold">لا توجد بيانات تقييم في هذه الفترة</p>
                                    <p className="text-xs mt-1">تأكد من اختيار الفترة الصحيحة</p>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {DISPLAY_ORDER.map(catKey => {
                                        const categoryRecords = stats.sPerf.filter(p => (p.category || 'OTHER') === catKey);
                                        if (categoryRecords.length === 0) return null;

                                        const style = CATEGORY_STYLES[catKey] || CATEGORY_STYLES['OTHER'];
                                        const Icon = style.icon;

                                        return (
                                            <div key={catKey} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                                {/* Section Header */}
                                                <div className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between ${style.headerBg}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${style.bg} ${style.text}`}>
                                                            <Icon size={20} />
                                                        </div>
                                                        <h4 className={`font-bold text-lg ${style.text}`}>
                                                            {CATEGORY_LABELS[catKey]}
                                                        </h4>
                                                    </div>
                                                    <span className="text-xs font-bold bg-white px-3 py-1 rounded-full shadow-sm text-gray-600 border">
                                                        {categoryRecords.length} سجل
                                                    </span>
                                                </div>

                                                {/* Cards Grid */}
                                                <div className="p-6 bg-white">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                        {categoryRecords.map(p => {
                                                            const percentage = p.maxScore > 0 ? Math.round((p.score / p.maxScore) * 100) : 0;
                                                            return (
                                                                <div key={p.id} className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all relative overflow-hidden group hover:border-gray-300">
                                                                    <div className={`absolute top-0 right-0 w-1 h-full ${style.bg.replace('bg-', 'bg-').replace('50', '500')}`}></div>
                                                                    
                                                                    <div className="p-4">
                                                                        <div className="flex justify-between items-start mb-3">
                                                                            <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-2 py-0.5 rounded">{formatDualDate(p.date).split('|')[0]}</span>
                                                                            {/* Circular Progress Mini */}
                                                                            <div className="relative w-8 h-8 flex items-center justify-center">
                                                                                <svg className="w-full h-full transform -rotate-90">
                                                                                    <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-gray-100" />
                                                                                    <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="3" fill="transparent" 
                                                                                        className={`${percentage >= 90 ? 'text-green-500' : percentage >= 75 ? 'text-blue-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`} 
                                                                                        strokeDasharray={2 * Math.PI * 12} 
                                                                                        strokeDashoffset={2 * Math.PI * 12 * (1 - percentage / 100)} 
                                                                                        strokeLinecap="round" 
                                                                                    />
                                                                                </svg>
                                                                            </div>
                                                                        </div>
                                                                        
                                                                        <h4 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2 leading-tight" title={p.title}>{p.title}</h4>
                                                                        <p className="text-xs text-gray-500 mb-4">{p.subject}</p>
                                                                        
                                                                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-dashed border-gray-100">
                                                                            <span className="text-[10px] text-gray-400 font-bold">الدرجة</span>
                                                                            <span className="font-black text-lg text-gray-800 font-mono">
                                                                                {p.score} <span className="text-gray-400 text-xs font-normal">/ {p.maxScore}</span>
                                                                            </span>
                                                                        </div>

                                                                        {p.notes && (
                                                                            <div className="mt-2 text-[10px] text-gray-500 bg-gray-50 p-2 rounded line-clamp-2" title={p.notes}>
                                                                                {p.notes}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl bg-white">
                    <Search size={64} className="mb-6 opacity-20"/>
                    <p className="text-xl font-bold">ابحث عن طالب لعرض ملفه</p>
                    <p className="text-sm">استخدم مربع البحث أعلاه</p>
                </div>
            )}
        </div>
    );
};

export default StudentFollowUp;