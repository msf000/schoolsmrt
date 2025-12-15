
// ... existing imports
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, AcademicTerm, ReportHeaderConfig, Assignment } from '../types';
import { getAssignments, getAcademicTerms, getReportHeaderConfig } from '../services/storageService';
import { FileText, Printer, Search, PieChart, Users, MapPin, Phone, TrendingUp, BookOpen, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { formatDualDate } from '../services/dateService';

interface StudentFollowUpProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  currentUser?: SystemUser | null;
  onSaveAttendance?: (records: AttendanceRecord[]) => void;
}

const StudentFollowUp: React.FC<StudentFollowUpProps> = ({ students = [], performance = [], attendance = [], currentUser, onSaveAttendance }) => {
    // Safety check
    if (!students) {
        return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32}/></div>;
    }

    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter State
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [yearWorkConfig, setYearWorkConfig] = useState<{ hw: number, act: number, att: number, exam: number }>({
        hw: 10, act: 10, att: 5, exam: 20
    });
    
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

    useEffect(() => {
        const loadedTerms = getAcademicTerms(currentUser?.id);
        setTerms(loadedTerms);
        const current = loadedTerms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);

        setAssignments(getAssignments('ALL', currentUser?.id, true)); // Pass true to force all
        setHeaderConfig(getReportHeaderConfig(currentUser?.id));
        
        const savedConfig = localStorage.getItem('works_year_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                if(parsed) setYearWorkConfig(parsed);
            } catch {}
        }

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
    const student = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

    // --- CALCULATE STATS ---
    const stats = useMemo(() => {
        if (!student) return null;

        // Ensure arrays are valid
        let sAtt = (attendance || []).filter(a => a.studentId === student.id);
        let sPerf = (performance || []).filter(p => p.studentId === student.id);

        if (activeTerm) {
            sAtt = sAtt.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
            sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
        }

        // Attendance
        const totalDays = sAtt.length;
        const present = sAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const absent = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const late = sAtt.filter(a => a.status === AttendanceStatus.LATE).length;
        const attRate = totalDays > 0 ? Math.round(((present + late) / totalDays) * 100) : 100;

        // Behavior
        const posBeh = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;
        const negBeh = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;

        // Performance
        const totalScore = sPerf.reduce((acc, curr) => acc + (curr.score / (curr.maxScore || 10)), 0);
        const avgScore = sPerf.length > 0 ? Math.round((totalScore / sPerf.length) * 100) : 0;

        // Trends (Last 5 grades)
        const recentPerf = [...sPerf].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-5);
        const trendData = recentPerf.map(p => ({
            name: p.title || p.subject,
            score: Math.round((p.score / (p.maxScore || 10)) * 100)
        }));

        // Subject Breakdown
        const subjectStats: Record<string, {total: number, count: number}> = {};
        sPerf.forEach(p => {
            if (!subjectStats[p.subject]) subjectStats[p.subject] = { total: 0, count: 0 };
            subjectStats[p.subject].total += (p.score / (p.maxScore || 10));
            subjectStats[p.subject].count += 1;
        });
        
        const subjectsData = Object.keys(subjectStats).map(sub => ({
            name: sub,
            avg: Math.round((subjectStats[sub].total / subjectStats[sub].count) * 100)
        })).sort((a,b) => b.avg - a.avg);

        // --- Year Work Breakdown Calculation ---
        const termAssignments = assignments.filter(a => !activeTerm || a.termId === activeTerm.id);
        
        const calcCategory = (cat: string, weight: number) => {
            const catAssigns = termAssignments.filter(a => a.category === cat);
            let total = 0;
            let maxTotal = 0;
            catAssigns.forEach(assign => {
                const rec = sPerf.find(p => p.notes === assign.id || p.title === assign.title);
                if (rec) { total += rec.score; maxTotal += rec.maxScore; } 
                else { maxTotal += assign.maxScore; }
            });
            const pct = maxTotal > 0 ? total / maxTotal : 0;
            return {
                obtained: Math.round(pct * weight * 10) / 10,
                total: weight,
                percentage: Math.round(pct * 100)
            };
        };

        const hwStats = calcCategory('HOMEWORK', yearWorkConfig.hw);
        const actStats = calcCategory('ACTIVITY', yearWorkConfig.act);
        const examStats = calcCategory('PLATFORM_EXAM', yearWorkConfig.exam);
        const attStats = { 
            obtained: Math.round((attRate / 100) * yearWorkConfig.att * 10) / 10,
            total: yearWorkConfig.att,
            percentage: attRate
        };

        const totalYearWork = hwStats.obtained + actStats.obtained + examStats.obtained + attStats.obtained;
        const maxYearWork = yearWorkConfig.hw + yearWorkConfig.act + yearWorkConfig.exam + yearWorkConfig.att;

        const yearWorkData = { hwStats, actStats, examStats, attStats, totalYearWork, maxYearWork };

        return { attRate, absent, late, posBeh, negBeh, avgScore, trendData, subjectsData, sAtt, sPerf, yearWorkData };
    }, [student, attendance, performance, activeTerm, assignments, yearWorkConfig]);

    const handleShareWhatsApp = () => {
        if (!student || !stats) return;
        const phone = student.parentPhone ? student.parentPhone.replace(/\D/g, '') : '';
        if (!phone) return alert('رقم ولي الأمر غير مسجل');
        
        const message = `تقرير الطالب: ${student.name}\nالفترة: ${activeTerm ? activeTerm.name : 'الحالية'}\n\n📊 الملخص:\n- نسبة الحضور: ${stats.attRate}% (${stats.absent} غياب)\n- المستوى الأكاديمي: ${stats.avgScore}%\n- السلوك: ${stats.posBeh} إيجابي / ${stats.negBeh} ملاحظات`;

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><FileText size={24}/></div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">ملف الطالب الشامل</h2>
                        <p className="text-sm text-gray-500">تحليل تفصيلي للأداء والسلوك</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto relative" ref={dropdownRef}>
                    <div className="relative flex-1 md:w-64">
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
                    
                    <select 
                        className="bg-gray-50 border rounded-lg px-3 py-2 text-sm font-bold outline-none"
                        value={selectedTermId}
                        onChange={e => setSelectedTermId(e.target.value)}
                    >
                        <option value="">كل الفترات</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    
                    {student && (
                        <button onClick={() => window.print()} className="bg-gray-800 text-white px-3 py-2 rounded-lg font-bold text-xs hover:bg-black transition-colors flex items-center gap-2">
                            <Printer size={16}/> تقرير
                        </button>
                    )}
                </div>
            </div>

            {student && stats ? (
                <div className="space-y-6">
                    {/* Student Info Card */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden print:hidden">
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
                                        <div className="flex items-center gap-2 mt-2 text-green-600 text-xs font-bold bg-green-50 w-fit px-2 py-1 rounded cursor-pointer hover:bg-green-100 print:hidden" onClick={handleShareWhatsApp}>
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

                    {/* Year Work Breakdown */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm print:hidden">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2"><PieChart size={18}/> توزيع أعمال السنة (تجميعي)</h3>
                            <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-bold">{stats.yearWorkData.totalYearWork.toFixed(1)} / {stats.yearWorkData.maxYearWork}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Homework */}
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center">
                                <span className="text-xs font-bold text-blue-500 mb-1">الواجبات ({yearWorkConfig.hw})</span>
                                <div className="text-2xl font-black text-blue-700">{stats.yearWorkData.hwStats.obtained}</div>
                                <div className="w-full bg-blue-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-blue-600 h-full rounded-full" style={{width: `${stats.yearWorkData.hwStats.percentage}%`}}></div>
                                </div>
                            </div>
                            
                            {/* Activity */}
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col items-center">
                                <span className="text-xs font-bold text-orange-500 mb-1">الأنشطة ({yearWorkConfig.act})</span>
                                <div className="text-2xl font-black text-orange-700">{stats.yearWorkData.actStats.obtained}</div>
                                <div className="w-full bg-orange-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-orange-600 h-full rounded-full" style={{width: `${stats.yearWorkData.actStats.percentage}%`}}></div>
                                </div>
                            </div>

                            {/* Exams */}
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col items-center">
                                <span className="text-xs font-bold text-purple-500 mb-1">الاختبارات ({yearWorkConfig.exam})</span>
                                <div className="text-2xl font-black text-purple-700">{stats.yearWorkData.examStats.obtained}</div>
                                <div className="w-full bg-purple-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-purple-600 h-full rounded-full" style={{width: `${stats.yearWorkData.examStats.percentage}%`}}></div>
                                </div>
                            </div>

                            {/* Attendance */}
                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center">
                                <span className="text-xs font-bold text-green-500 mb-1">الحضور ({yearWorkConfig.att})</span>
                                <div className="text-2xl font-black text-green-700">{stats.yearWorkData.attStats.obtained}</div>
                                <div className="w-full bg-green-200 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-green-600 h-full rounded-full" style={{width: `${stats.yearWorkData.attStats.percentage}%`}}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Chart & Lists (Compact) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><TrendingUp size={18}/> تطور المستوى (آخر 5)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.trendData}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{fontSize: 10}} height={20}/>
                                        <YAxis domain={[0, 100]} width={30}/>
                                        <Tooltip />
                                        <Area type="monotone" dataKey="score" stroke="#8884d8" fillOpacity={1} fill="url(#colorScore)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                            <h3 className="font-bold text-gray-700 mb-4">أداء المواد</h3>
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                {stats.subjectsData.map(sub => (
                                    <div key={sub.name} className="mb-3 last:mb-0">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-bold">{sub.name}</span>
                                            <span className="font-mono">{sub.avg}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div className={`h-full rounded-full ${sub.avg >= 90 ? 'bg-green-500' : sub.avg >= 75 ? 'bg-blue-500' : sub.avg >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${sub.avg}%`}}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Print Only Report */}
                    <div className="hidden print:block bg-white p-8 border-2 border-black">
                        <div className="text-center mb-8 border-b-2 border-black pb-4">
                            <h1 className="text-2xl font-black">تقرير متابعة طالب</h1>
                            <p>المدرسة: {headerConfig?.schoolName || '....................'}</p>
                            <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                        </div>
                        <div className="flex justify-between mb-8 text-sm font-bold">
                            <p>اسم الطالب: {student.name}</p>
                            <p>الصف: {student.gradeLevel}</p>
                            <p>رقم الهوية: {student.nationalId}</p>
                        </div>
                        
                        <div className="mb-8">
                            <h3 className="font-bold border-b border-black mb-2">ملخص الأداء</h3>
                            <table className="w-full text-center border-collapse border border-black text-sm">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-black p-2">نسبة الحضور</th>
                                        <th className="border border-black p-2">أيام الغياب</th>
                                        <th className="border border-black p-2">المعدل الأكاديمي</th>
                                        <th className="border border-black p-2">نقاط السلوك</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-black p-2">{stats.attRate}%</td>
                                        <td className="border border-black p-2">{stats.absent}</td>
                                        <td className="border border-black p-2">{stats.avgScore}%</td>
                                        <td className="border border-black p-2">{stats.posBeh}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <h3 className="font-bold border-b border-black mb-2">تفاصيل المواد</h3>
                            <table className="w-full text-right border-collapse border border-black text-sm">
                                <thead>
                                    <tr className="bg-gray-200 text-center">
                                        <th className="border border-black p-2">المادة</th>
                                        <th className="border border-black p-2">المستوى</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.subjectsData.map(s => (
                                        <tr key={s.name}>
                                            <td className="border border-black p-2">{s.name}</td>
                                            <td className="border border-black p-2 text-center">{s.avg}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-16 flex justify-between text-sm font-bold">
                            <p>المرشد الطلابي: ....................</p>
                            <p>مدير المدرسة: ....................</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl bg-white print:hidden">
                    <Search size={64} className="mb-6 opacity-20"/>
                    <p className="text-xl font-bold">ابحث عن طالب لعرض ملفه</p>
                    <p className="text-sm">استخدم مربع البحث أعلاه</p>
                </div>
            )}
        </div>
    );
};

export default StudentFollowUp;
