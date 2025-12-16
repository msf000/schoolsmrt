
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, AcademicTerm, ReportHeaderConfig, Assignment } from '../types';
import { getAssignments, getAcademicTerms, getReportHeaderConfig } from '../services/storageService';
import { generateStudentAnalysis } from '../services/geminiService';
import { FileText, Printer, Search, PieChart, Users, MapPin, Phone, TrendingUp, Loader2, Award, Activity, Sparkles, Plus, Calendar, Bot, ArrowRight, CheckCircle, XCircle, Paperclip, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { formatDualDate } from '../services/dateService';
import { useNavigate, useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface StudentFollowUpProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  currentUser?: SystemUser | null;
  onSaveAttendance?: (records: AttendanceRecord[]) => void;
}

const StudentFollowUp: React.FC<StudentFollowUpProps> = ({ students = [], performance = [], attendance = [], currentUser, onSaveAttendance }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    if (!students) {
        return <div className="flex justify-center items-center h-full p-10"><Loader2 className="animate-spin text-gray-400" size={32}/></div>;
    }

    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'SUMMARY' | 'BEHAVIOR' | 'ATTENDANCE' | 'CERTIFICATES' | 'AI'>('SUMMARY');

    // Filter State
    const [selectedTermId, setSelectedTermId] = useState<string>('');
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [yearWorkConfig, setYearWorkConfig] = useState<{ hw: number, act: number, att: number, exam: number }>({
        hw: 10, act: 10, att: 5, exam: 20
    });
    
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

    // AI State
    const [aiReport, setAiReport] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Behavior Quick Add State
    const [quickNote, setQuickNote] = useState('');
    const [quickBehaviorType, setQuickBehaviorType] = useState<BehaviorStatus>(BehaviorStatus.POSITIVE);

    // Attachment Modal
    const [viewingFile, setViewingFile] = useState<string | null>(null);

    useEffect(() => {
        const loadedTerms = getAcademicTerms(currentUser?.id);
        setTerms(loadedTerms);
        const current = loadedTerms.find(t => t.isCurrent);
        if (current) setSelectedTermId(current.id);
        else if (loadedTerms.length > 0) setSelectedTermId(loadedTerms[0].id);

        setAssignments(getAssignments('ALL', currentUser?.id, true)); 
        setHeaderConfig(getReportHeaderConfig(currentUser?.id));
        
        const savedConfig = localStorage.getItem('works_year_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                if(parsed) setYearWorkConfig(parsed);
            } catch {}
        }

        if (location.state && (location.state as any).studentId) {
            const incomingId = (location.state as any).studentId;
            const exists = students.find(s => s.id === incomingId);
            if (exists) {
                setSelectedStudentId(incomingId);
                setSearchTerm(exists.name);
            }
        }
    }, [currentUser, students, location.state]);

    const activeTerm = terms.find(t => t.id === selectedTermId);
    const student = useMemo(() => students.find(s => s.id === selectedStudentId), [students, selectedStudentId]);

    const stats = useMemo(() => {
        if (!student) return null;

        let sAtt = (attendance || []).filter(a => a.studentId === student.id);
        let sPerf = (performance || []).filter(p => p.studentId === student.id);

        if (activeTerm) {
            sAtt = sAtt.filter(a => a.date >= activeTerm.startDate && a.date <= activeTerm.endDate);
            sPerf = sPerf.filter(p => p.date >= activeTerm.startDate && p.date <= activeTerm.endDate);
        }

        const totalDays = sAtt.length;
        const present = sAtt.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const absent = sAtt.filter(a => a.status === AttendanceStatus.ABSENT).length;
        const late = sAtt.filter(a => a.status === AttendanceStatus.LATE).length;
        const excused = sAtt.filter(a => a.status === AttendanceStatus.EXCUSED).length;
        const attRate = totalDays > 0 ? Math.round(((present + late + excused) / totalDays) * 100) : 100;

        const posBeh = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.POSITIVE).length;
        const negBeh = sAtt.filter(a => a.behaviorStatus === BehaviorStatus.NEGATIVE).length;
        const behaviorLogs = sAtt.filter(a => a.behaviorStatus !== BehaviorStatus.NEUTRAL || a.behaviorNote).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const certificates = sAtt.filter(a => a.behaviorNote && a.behaviorNote.startsWith('منح شهادة'));

        const totalScore = sPerf.reduce((acc, curr) => acc + (curr.score / (curr.maxScore || 10)), 0);
        const avgScore = sPerf.length > 0 ? Math.round((totalScore / sPerf.length) * 100) : 0;

        const recentPerf = [...sPerf].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-5);
        const trendData = recentPerf.map(p => ({
            name: p.title || p.subject,
            score: Math.round((p.score / (p.maxScore || 10)) * 100)
        }));

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

        return { attRate, absent, late, excused, posBeh, negBeh, avgScore, trendData, subjectsData, sAtt, sPerf, yearWorkData, behaviorLogs, certificates };
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
        setAiReport('');
    };

    const handleAddBehaviorNote = () => {
        if (!student || !quickNote || !onSaveAttendance) return;
        const today = new Date().toISOString().split('T')[0];
        const existingRecord = attendance.find(a => a.studentId === student.id && a.date === today);
        
        const newRecord: AttendanceRecord = {
            id: existingRecord ? existingRecord.id : `${student.id}-${today}-note-${Date.now()}`,
            studentId: student.id,
            date: today,
            status: existingRecord ? existingRecord.status : AttendanceStatus.PRESENT,
            behaviorStatus: quickBehaviorType,
            behaviorNote: existingRecord && existingRecord.behaviorNote ? `${existingRecord.behaviorNote} | ${quickNote}` : quickNote,
            createdById: currentUser?.id
        };

        onSaveAttendance([newRecord]);
        setQuickNote('');
        alert('تم إضافة الملاحظة بنجاح');
    };

    const handleUpdateAttendanceStatus = (record: AttendanceRecord, newStatus: AttendanceStatus) => {
        if (onSaveAttendance) {
            const updated = { ...record, status: newStatus };
            onSaveAttendance([updated]);
        }
    };

    const handleGenerateAIReport = async () => {
        if (!student || !stats) return;
        setIsAiLoading(true);
        try {
            const result = await generateStudentAnalysis(student, stats.sAtt, stats.sPerf);
            setAiReport(result);
        } catch (e) {
            alert('حدث خطأ أثناء تحليل البيانات');
        } finally {
            setIsAiLoading(false);
        }
    };

    const filteredList = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            {/* Header / Search */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 print:hidden shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/students')} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full text-gray-600 transition-colors">
                        <ArrowRight size={20}/>
                    </button>
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
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Student Info Card */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm relative overflow-hidden print:hidden mb-6 shrink-0">
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

                    {/* Tabs Navigation */}
                    <div className="flex border-b bg-white rounded-t-xl mx-1 print:hidden shrink-0">
                        <button onClick={() => setActiveTab('SUMMARY')} className={`flex-1 py-3 text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === 'SUMMARY' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                            <PieChart size={16}/> الملخص
                        </button>
                        <button onClick={() => setActiveTab('ATTENDANCE')} className={`flex-1 py-3 text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === 'ATTENDANCE' ? 'border-red-600 text-red-700 bg-red-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                            <Calendar size={16}/> سجل الغياب
                        </button>
                        <button onClick={() => setActiveTab('BEHAVIOR')} className={`flex-1 py-3 text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === 'BEHAVIOR' ? 'border-orange-600 text-orange-700 bg-orange-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                            <Activity size={16}/> السلوك
                        </button>
                        <button onClick={() => setActiveTab('CERTIFICATES')} className={`flex-1 py-3 text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === 'CERTIFICATES' ? 'border-green-600 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                            <Award size={16}/> الشهادات
                        </button>
                        <button onClick={() => setActiveTab('AI')} className={`flex-1 py-3 text-sm font-bold border-b-2 flex items-center justify-center gap-2 transition-colors ${activeTab === 'AI' ? 'border-blue-600 text-blue-700 bg-blue-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
                            <Sparkles size={16}/> الذكاء
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1 pb-10">
                        
                        {/* 1. SUMMARY TAB */}
                        {activeTab === 'SUMMARY' && (
                            <div className="space-y-6 pt-4 animate-fade-in print:hidden">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-gray-700 flex items-center gap-2"><PieChart size={18}/> توزيع أعمال السنة (تجميعي)</h3>
                                        <span className="bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-bold">{stats.yearWorkData.totalYearWork.toFixed(1)} / {stats.yearWorkData.maxYearWork}</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col items-center">
                                            <span className="text-xs font-bold text-blue-500 mb-1">الواجبات ({yearWorkConfig.hw})</span>
                                            <div className="text-2xl font-black text-blue-700">{stats.yearWorkData.hwStats.obtained}</div>
                                            <div className="w-full bg-blue-200 h-1.5 rounded-full mt-2 overflow-hidden"><div className="bg-blue-600 h-full rounded-full" style={{width: `${stats.yearWorkData.hwStats.percentage}%`}}></div></div>
                                        </div>
                                        {/* ... other stats ... */}
                                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col items-center">
                                            <span className="text-xs font-bold text-orange-500 mb-1">الأنشطة ({yearWorkConfig.act})</span>
                                            <div className="text-2xl font-black text-orange-700">{stats.yearWorkData.actStats.obtained}</div>
                                            <div className="w-full bg-orange-200 h-1.5 rounded-full mt-2 overflow-hidden"><div className="bg-orange-600 h-full rounded-full" style={{width: `${stats.yearWorkData.actStats.percentage}%`}}></div></div>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100 flex flex-col items-center">
                                            <span className="text-xs font-bold text-green-500 mb-1">الحضور ({yearWorkConfig.att})</span>
                                            <div className="text-2xl font-black text-green-700">{stats.yearWorkData.attStats.obtained}</div>
                                            <div className="w-full bg-green-200 h-1.5 rounded-full mt-2 overflow-hidden"><div className="bg-green-600 h-full rounded-full" style={{width: `${stats.yearWorkData.attStats.percentage}%`}}></div></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><TrendingUp size={18}/> تطور المستوى</h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={stats.trendData}>
                                                    <defs><linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/><stop offset="95%" stopColor="#8884d8" stopOpacity={0}/></linearGradient></defs>
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
                            </div>
                        )}

                        {/* 2. ATTENDANCE TAB (NEW) */}
                        {activeTab === 'ATTENDANCE' && (
                            <div className="space-y-6 pt-4 animate-fade-in print:hidden">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Calendar size={18}/> سجل الغياب والأعذار</h3>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right text-sm">
                                            <thead className="bg-gray-50 text-gray-600 font-bold border-b">
                                                <tr>
                                                    <th className="p-3">التاريخ</th>
                                                    <th className="p-3">الحالة</th>
                                                    <th className="p-3">سبب الغياب / العذر</th>
                                                    <th className="p-3">مرفقات</th>
                                                    <th className="p-3 text-center">الإجراء</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {stats.sAtt.filter(a => a.status !== AttendanceStatus.PRESENT).map(record => (
                                                    <tr key={record.id} className="hover:bg-gray-50">
                                                        <td className="p-3 font-mono text-gray-500">{formatDualDate(record.date)}</td>
                                                        <td className="p-3">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                                record.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' : 
                                                                record.status === AttendanceStatus.LATE ? 'bg-yellow-100 text-yellow-700' : 
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                                {record.status === AttendanceStatus.ABSENT ? 'غائب' : record.status === AttendanceStatus.LATE ? 'تأخر' : 'بعذر'}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 max-w-xs truncate text-gray-600">
                                                            {record.excuseNote || record.behaviorNote || '-'}
                                                        </td>
                                                        <td className="p-3">
                                                            {record.excuseFile ? (
                                                                <button onClick={() => setViewingFile(record.excuseFile!)} className="flex items-center gap-1 text-blue-600 hover:underline text-xs font-bold">
                                                                    <Paperclip size={12}/> عرض المرفق
                                                                </button>
                                                            ) : <span className="text-gray-300">-</span>}
                                                        </td>
                                                        <td className="p-3 flex justify-center gap-2">
                                                            {record.status !== AttendanceStatus.EXCUSED && (
                                                                <button 
                                                                    onClick={() => handleUpdateAttendanceStatus(record, AttendanceStatus.EXCUSED)}
                                                                    className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700 flex items-center gap-1"
                                                                >
                                                                    <CheckCircle size={12}/> قبول العذر
                                                                </button>
                                                            )}
                                                            {record.status === AttendanceStatus.EXCUSED && (
                                                                <button 
                                                                    onClick={() => handleUpdateAttendanceStatus(record, AttendanceStatus.ABSENT)}
                                                                    className="bg-gray-100 text-gray-600 border px-3 py-1 rounded text-xs font-bold hover:bg-gray-200"
                                                                >
                                                                    إلغاء
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {stats.sAtt.filter(a => a.status !== AttendanceStatus.PRESENT).length === 0 && (
                                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">سجل الحضور ممتاز! لا يوجد غياب.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. BEHAVIOR TAB */}
                        {activeTab === 'BEHAVIOR' && (
                            <div className="space-y-6 pt-4 animate-fade-in print:hidden">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Plus size={18}/> تسجيل ملاحظة سلوكية سريعة</h3>
                                    <div className="flex flex-col md:flex-row gap-3">
                                        <input 
                                            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm" 
                                            placeholder="اكتب الملاحظة هنا..."
                                            value={quickNote}
                                            onChange={e => setQuickNote(e.target.value)}
                                        />
                                        <select 
                                            className="p-2 border rounded-lg bg-gray-50 text-sm font-bold"
                                            value={quickBehaviorType}
                                            onChange={e => setQuickBehaviorType(e.target.value as BehaviorStatus)}
                                        >
                                            <option value={BehaviorStatus.POSITIVE}>إيجابي</option>
                                            <option value={BehaviorStatus.NEGATIVE}>سلبي</option>
                                            <option value={BehaviorStatus.NEUTRAL}>ملاحظة عامة</option>
                                        </select>
                                        <button 
                                            onClick={handleAddBehaviorNote}
                                            disabled={!quickNote}
                                            className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50 text-sm"
                                        >
                                            إضافة
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Activity size={18}/> سجل السلوك والمواظبة</h3>
                                    {stats.behaviorLogs.length > 0 ? (
                                        <div className="space-y-3">
                                            {stats.behaviorLogs.map((log, i) => (
                                                <div key={i} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                                    <div>
                                                        <p className="text-gray-800 font-bold text-sm mb-1">{log.behaviorNote}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={10}/> {formatDualDate(log.date)}</p>
                                                    </div>
                                                    <span className={`text-[10px] px-2 py-1 rounded font-bold ${log.behaviorStatus === BehaviorStatus.POSITIVE ? 'bg-green-100 text-green-700' : log.behaviorStatus === BehaviorStatus.NEGATIVE ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>
                                                        {log.behaviorStatus === BehaviorStatus.POSITIVE ? 'إيجابي' : log.behaviorStatus === BehaviorStatus.NEGATIVE ? 'سلبي' : 'ملاحظة'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="text-center text-gray-400 py-10">سجل السلوك نظيف</div>}
                                </div>
                            </div>
                        )}

                        {/* 4. CERTIFICATES TAB */}
                        {activeTab === 'CERTIFICATES' && (
                            <div className="space-y-6 pt-4 animate-fade-in print:hidden">
                                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200 shadow-sm flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-yellow-800 text-lg mb-1">إصدار شهادة جديدة</h3>
                                        <p className="text-xs text-yellow-600">يمكنك تصميم وإصدار شهادة تقدير للطالب بسهولة.</p>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/certificates', { state: { studentIds: [student.id] } })}
                                        className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-yellow-700 shadow-md flex items-center gap-2 text-sm"
                                    >
                                        <Award size={18}/> إصدار شهادة
                                    </button>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Award size={18}/> سجل الشهادات السابقة</h3>
                                    {stats.certificates.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {stats.certificates.map((cert, i) => (
                                                <div key={i} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                                                    <div className="bg-yellow-100 p-2 rounded-full text-yellow-600"><Award size={24}/></div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-sm">{cert.behaviorNote?.replace('منح شهادة: ', '')}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{formatDualDate(cert.date)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : <div className="text-center text-gray-400 py-10">لم يتم منح أي شهادات بعد</div>}
                                </div>
                            </div>
                        )}

                        {/* 5. AI TAB */}
                        {activeTab === 'AI' && (
                            <div className="space-y-6 pt-4 animate-fade-in print:hidden">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                                    <Bot size={48} className="text-purple-500 mx-auto mb-4"/>
                                    <h3 className="font-bold text-gray-800 text-lg mb-2">المحلل الذكي (AI)</h3>
                                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">اضغط على الزر أدناه ليقوم الذكاء الاصطناعي بتحليل درجات وسلوك الطالب وتقديم تقرير شامل وتوصيات.</p>
                                    
                                    <button 
                                        onClick={handleGenerateAIReport} 
                                        disabled={isAiLoading}
                                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                                    >
                                        {isAiLoading ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>}
                                        {isAiLoading ? 'جاري التحليل...' : 'توليد التقرير الذكي'}
                                    </button>
                                </div>

                                {aiReport && (
                                    <div className="bg-white p-8 rounded-xl border border-purple-100 shadow-sm animate-slide-up relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
                                        <div className="prose prose-sm md:prose-base max-w-none text-gray-800 leading-relaxed">
                                            <ReactMarkdown>{aiReport}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* --- PRINTABLE REPORT CARD --- */}
                    <div className="hidden print:block bg-white p-10 min-h-screen absolute top-0 left-0 w-full z-[9999]">
                        {/* Header */}
                        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
                            <div className="text-right text-sm font-bold leading-loose">
                                <p>المملكة العربية السعودية</p>
                                <p>وزارة التعليم</p>
                                <p>{headerConfig?.schoolName || 'اسم المدرسة'}</p>
                                <p>إدارة: {headerConfig?.educationAdmin || '................'}</p>
                            </div>
                            <div className="text-center pt-2">
                                {headerConfig?.logoBase64 ? (
                                    <img src={headerConfig.logoBase64} alt="Logo" className="h-24 w-24 object-contain mx-auto mb-2"/>
                                ) : <div className="h-24 w-24 border-2 border-dashed border-gray-300 mx-auto mb-2 flex items-center justify-center text-xs">الشعار</div>}
                                <h1 className="text-xl font-black underline decoration-double">بطاقة متابعة طالب</h1>
                                <p className="text-sm font-bold mt-1">{activeTerm ? activeTerm.name : 'تقرير عام'}</p>
                            </div>
                            <div className="text-left text-sm font-bold leading-loose">
                                <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                                <p>الرقم: ....................</p>
                            </div>
                        </div>

                        <div className="border border-black p-4 mb-8 rounded-lg flex justify-between bg-gray-50 print:bg-white text-sm">
                            <div><span className="font-bold ml-2">اسم الطالب:</span> {student.name}</div>
                            <div><span className="font-bold ml-2">الصف / الفصل:</span> {student.gradeLevel} - {student.className}</div>
                            <div><span className="font-bold ml-2">رقم الهوية:</span> {student.nationalId}</div>
                        </div>

                        <div className="mb-8">
                            <h3 className="font-bold border-b border-black mb-2 text-sm w-fit">ملخص الأداء العام</h3>
                            <table className="w-full text-center border-collapse border border-black text-sm">
                                <thead>
                                    <tr className="bg-gray-100 print:bg-gray-200">
                                        <th className="border border-black p-2">نسبة الحضور</th>
                                        <th className="border border-black p-2">أيام الغياب</th>
                                        <th className="border border-black p-2">أيام التأخر</th>
                                        <th className="border border-black p-2">نقاط السلوك</th>
                                        <th className="border border-black p-2">المعدل الأكاديمي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-black p-2 font-bold">{stats.attRate}%</td>
                                        <td className="border border-black p-2">{stats.absent}</td>
                                        <td className="border border-black p-2">{stats.late}</td>
                                        <td className="border border-black p-2">{stats.posBeh}</td>
                                        <td className="border border-black p-2 font-bold">{stats.avgScore}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-end mt-16 px-12 text-sm font-bold">
                            <div className="text-center"><p className="mb-8">المرشد الطلابي</p><p>.........................</p></div>
                            <div className="text-center"><p className="mb-8">وكيل الشؤون التعليمية</p><p>.........................</p></div>
                            <div className="text-center"><p className="mb-4">مدير المدرسة</p><p>.........................</p></div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400 border-2 border-dashed border-gray-300 rounded-xl bg-white print:hidden">
                    <Search size={64} className="mb-6 opacity-20"/>
                    <p className="text-xl font-bold">ابحث عن طالب لعرض ملفه</p>
                </div>
            )}

            {/* File Viewer Modal */}
            {viewingFile && (
                <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={() => setViewingFile(null)}>
                    <div className="relative max-w-4xl max-h-full">
                        <button onClick={() => setViewingFile(null)} className="absolute -top-10 right-0 text-white hover:text-red-400"><XCircle size={32}/></button>
                        {viewingFile.startsWith('data:image') ? (
                            <img src={viewingFile} alt="Attachment" className="max-w-full max-h-[85vh] rounded shadow-2xl"/>
                        ) : (
                            <iframe src={viewingFile} className="w-full h-[80vh] bg-white rounded shadow-2xl" />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentFollowUp;
