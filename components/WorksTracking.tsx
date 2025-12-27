
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, Assignment, Subject, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { getAssignments, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, getSchools, getSubjects, addPerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, CheckCircle, ExternalLink, Loader2, Table, Link as LinkIcon, Edit2, Activity, Target, Settings, Plus, Trash2, Eye, EyeOff, List, Layout, PenTool, RefreshCw, TrendingUp, ChevronLeft, Database, Globe } from 'lucide-react';

interface WorksTrackingProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  onAddPerformance: (records: PerformanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const extractHeaderMetadata = (header: string): { label: string, maxScore: number } => {
    let maxScore = 10;
    let label = header;
    const match = header.match(/\((\d+)\)/);
    if (match) {
        maxScore = parseInt(match[1]);
        label = header.replace(/\(\d+\)/, '').trim();
    }
    return { label, maxScore };
};

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance, currentUser }) => {
    const [activeMode, setActiveMode] = useState<'GRADING' | 'MANAGEMENT'>(() => {
        return localStorage.getItem('works_tracking_mode') as any || 'GRADING';
    });
    const [activeTab, setActiveTab] = useState<PerformanceCategory>(() => {
        return localStorage.getItem('works_tracking_tab') as any || 'ACTIVITY';
    });

    useEffect(() => { localStorage.setItem('works_tracking_mode', activeMode); }, [activeMode]);
    useEffect(() => { localStorage.setItem('works_tracking_tab', activeTab); }, [activeTab]);

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [gridData, setGridData] = useState<Record<string, Record<string, string>>>({}); 
    const [activityTarget, setActivityTarget] = useState<number>(13); 
    
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [masterUrl, setMasterUrl] = useState('');
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        if (!currentUser) return;
        const loadedSubjects = getSubjects(currentUser.id);
        setSubjects(loadedSubjects);
        if (loadedSubjects.length > 0) setSelectedSubject(loadedSubjects[0].name);
        else setSelectedSubject('عام');

        const schools = getSchools();
        const mySchool = schools.find(s => s.id === currentUser.schoolId);
        setMasterUrl(getWorksMasterUrl());
        
        const savedTarget = localStorage.getItem('works_activity_target');
        if (savedTarget) setActivityTarget(parseInt(savedTarget));
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        const allAssignments = getAssignments(activeTab, currentUser.id);
        allAssignments.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setAssignments(allAssignments);
    }, [activeTab, currentUser, activeMode]);

    useEffect(() => {
        if (activeTab === 'YEAR_WORK') return;
        const newGrid: Record<string, Record<string, string>> = {};
        performance.forEach(p => {
            if (p.category === activeTab && p.subject === selectedSubject && p.notes) {
                if (!newGrid[p.studentId]) newGrid[p.studentId] = {};
                newGrid[p.studentId][p.notes] = p.score.toString();
            }
        });
        setGridData(newGrid);
    }, [performance, activeTab, selectedSubject]);

    const handleAutoSync = async () => {
        if (!masterUrl || activeTab === 'YEAR_WORK') return;
        setIsGenerating(true);
        setStatusMsg('جاري جلب البيانات من السحابة...');
        
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(masterUrl);
            const matchingSheet = sheetNames.find(name => 
                activeTab === 'ACTIVITY' ? name.includes('نشاط') || name.includes('Activity') :
                activeTab === 'HOMEWORK' ? name.includes('واجب') || name.includes('Homework') :
                name.includes('اختبار') || name.includes('Exam')
            ) || sheetNames[0];

            const { headers, data } = getSheetHeadersAndData(workbook, matchingSheet);
            const excludeKeys = ['name', 'id', 'اسم', 'هوية', 'سجل', 'جوال', 'ولي'];
            const gradeHeaders = headers.filter(h => !excludeKeys.some(k => h.includes(k)));

            const records: PerformanceRecord[] = [];
            const today = new Date().toISOString().split('T')[0];

            data.forEach(row => {
                const nid = String(row['nationalId'] || row['رقم الهوية'] || row['السجل المدني'] || '').trim();
                const student = students.find(s => s.nationalId === nid || s.name === row['الاسم']);
                if (student) {
                    gradeHeaders.forEach(h => {
                        const score = parseFloat(row[h]);
                        if (!isNaN(score)) {
                            records.push({
                                id: `${student.id}_${h}_${today}`,
                                studentId: student.id,
                                subject: selectedSubject,
                                title: h,
                                category: activeTab,
                                score: score,
                                maxScore: 10, // Default or parsed
                                date: today,
                                notes: 'auto_sync',
                                createdById: currentUser?.id
                            });
                        }
                    });
                }
            });

            if (records.length > 0) {
                await addPerformance(records);
                setStatusMsg(`✅ تم بنجاح مزامنة ${records.length} درجة!`);
            } else {
                setStatusMsg('⚠️ لم يتم العثور على درجات مطابقة للطلاب.');
            }
        } catch (e) {
            setStatusMsg('❌ فشل الاتصال بالملف السحابي.');
        } finally {
            setIsGenerating(false);
            setTimeout(() => setStatusMsg(''), 4000);
        }
    };

    const handleAddColumn = () => {
        if (!currentUser) return;
        const newAssign: Assignment = {
            id: `manual_${Date.now()}`,
            title: 'مهمة جديدة',
            category: activeTab,
            maxScore: 10,
            isVisible: true,
            teacherId: currentUser.id,
            sortOrder: assignments.length
        };
        saveAssignment(newAssign);
        setAssignments([...assignments, newAssign]);
    };

    const handleUpdateColumn = (index: number, field: keyof Assignment, value: any) => {
        const updated = [...assignments];
        updated[index] = { ...updated[index], [field]: value };
        setAssignments(updated);
        saveAssignment(updated[index]);
    };

    const handleSaveGrid = () => {
        const records: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];
        students.forEach(s => {
            assignments.forEach(a => {
                const val = gridData[s.id]?.[a.id];
                if (val !== undefined && val !== '') {
                    records.push({
                        id: `${s.id}_${a.id}`,
                        studentId: s.id,
                        subject: selectedSubject,
                        title: a.title,
                        category: activeTab,
                        score: parseFloat(val),
                        maxScore: a.maxScore,
                        date: today,
                        notes: a.id,
                        createdById: currentUser?.id
                    });
                }
            });
        });
        onAddPerformance(records);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6 shrink-0">
                <div className="flex bg-white p-1.5 rounded-2xl shadow-xl border border-slate-100">
                    <button onClick={() => setActiveMode('GRADING')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeMode === 'GRADING' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
                        <List size={18}/> رصد الدرجات
                    </button>
                    <button onClick={() => setActiveMode('MANAGEMENT')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeMode === 'MANAGEMENT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
                        <Settings size={18}/> الإعدادات
                    </button>
                </div>
                
                <div className="flex items-center gap-3">
                    <select value={selectedSubject} onChange={e=>setSelectedSubject(e.target.value)} className="p-3 border rounded-2xl bg-white font-black text-sm outline-none shadow-sm focus:ring-2 focus:ring-indigo-500">
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    {activeMode === 'GRADING' && activeTab !== 'YEAR_WORK' && (
                        <button onClick={handleSaveGrid} disabled={isGenerating} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl hover:bg-emerald-700 transition-all">
                            {savedSuccess ? <CheckCircle size={18}/> : <Save size={18}/>}
                            {savedSuccess ? 'تم الحفظ' : 'حفظ البيانات'}
                        </button>
                    )}
                </div>
            </div>

            {activeMode === 'GRADING' && (
                <div className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 mb-6 flex flex-col md:flex-row items-center gap-4 animate-fade-in">
                    <div className="p-3 bg-white rounded-2xl text-indigo-600 shadow-sm"><Globe size={20}/></div>
                    <div className="flex-1 w-full relative">
                        {isEditingUrl ? (
                            <div className="flex gap-2">
                                <input className="flex-1 p-3 bg-white border border-indigo-200 rounded-2xl text-xs font-bold dir-ltr focus:ring-2 focus:ring-indigo-500 outline-none" value={masterUrl} onChange={e=>setMasterUrl(e.target.value)} placeholder="رابط ملف Excel (Google Sheets)..."/>
                                <button onClick={()=>{saveWorksMasterUrl(masterUrl); setIsEditingUrl(false)}} className="bg-indigo-600 text-white px-6 rounded-2xl font-black text-xs shadow-lg">حفظ</button>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center bg-white/50 p-2 rounded-2xl">
                                <span className="text-xs font-bold text-indigo-900 truncate dir-ltr max-w-[400px]">{masterUrl || 'لا يوجد ملف مرتبط'}</span>
                                <div className="flex gap-2">
                                    <button onClick={handleAutoSync} disabled={!masterUrl || isGenerating} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all">
                                        {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                                    </button>
                                    <button onClick={()=>setIsEditingUrl(true)} className="p-2 text-indigo-400 hover:text-indigo-600"><Edit2 size={16}/></button>
                                </div>
                            </div>
                        )}
                    </div>
                    {statusMsg && <div className="text-[10px] font-black bg-white px-4 py-2 rounded-full border border-indigo-100 animate-slide-up">{statusMsg}</div>}
                </div>
            )}

            <div className="flex bg-white rounded-2xl p-1 mb-6 shadow-sm border border-slate-100 overflow-x-auto no-scrollbar shrink-0">
                {(['ACTIVITY', 'HOMEWORK', 'PLATFORM_EXAM', 'YEAR_WORK'] as PerformanceCategory[]).map(cat => (
                    <button key={cat} onClick={() => setActiveTab(cat)} className={`flex-1 py-3 px-6 rounded-xl font-black text-xs transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === cat ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-gray-400 hover:bg-slate-50'}`}>
                        {cat === 'ACTIVITY' ? <Activity size={16}/> : cat === 'HOMEWORK' ? <List size={16}/> : cat === 'PLATFORM_EXAM' ? <TrendingUp size={16}/> : <Layout size={16}/>}
                        {cat === 'ACTIVITY' ? 'الأنشطة' : cat === 'HOMEWORK' ? 'الواجبات' : cat === 'PLATFORM_EXAM' ? 'الاختبارات' : 'أعمال السنة'}
                    </button>
                ))}
            </div>

            <div className="flex-1 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col relative">
                {activeMode === 'MANAGEMENT' ? (
                    <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
                        <div className="flex justify-between items-center mb-8 border-b pb-6">
                            <h3 className="text-xl font-black text-slate-800">إدارة أعمدة {activeTab}</h3>
                            <button onClick={handleAddColumn} className="bg-indigo-50 text-indigo-700 px-6 py-2 rounded-2xl font-black text-xs hover:bg-indigo-100 border border-indigo-100 flex items-center gap-2 transition-all"><Plus size={16}/> إضافة عمود رصد</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {assignments.map((a, idx) => (
                                <div key={a.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] relative group hover:border-indigo-200 transition-all">
                                    <button onClick={()=>{if(confirm('حذف؟')) {deleteAssignment(a.id, currentUser?.id); setAssignments(assignments.filter(x=>x.id!==a.id))}}} className="absolute top-4 left-4 text-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                                    <div className="space-y-4">
                                        <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">العنوان</label><input className="w-full p-3 border rounded-2xl font-bold bg-white" value={a.title} onChange={e=>handleUpdateColumn(idx, 'title', e.target.value)}/></div>
                                        <div><label className="text-[9px] font-black text-slate-400 uppercase mb-1 block">الدرجة العظمى</label><input type="number" className="w-full p-3 border rounded-2xl font-black text-center bg-white" value={a.maxScore} onChange={e=>handleUpdateColumn(idx, 'maxScore', Number(e.target.value))}/></div>
                                        <div className="flex items-center justify-between pt-2">
                                            <span className="text-xs font-bold text-slate-500">عرض العمود في الرصد</span>
                                            <button onClick={()=>handleUpdateColumn(idx, 'isVisible', !a.isVisible)} className={`p-2 rounded-xl transition-all ${a.isVisible ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                                                {a.isVisible ? <Eye size={18}/> : <EyeOff size={18}/>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-right border-collapse min-w-[1000px]">
                            <thead className="bg-[#F8FAFC] font-black text-[10px] text-slate-400 uppercase tracking-widest sticky top-0 z-30 shadow-sm border-b">
                                <tr>
                                    <th className="p-5 border-l w-16 text-center">م</th>
                                    <th className="p-5 border-l sticky right-0 bg-[#F8FAFC] z-40 shadow-sm text-slate-800 w-64">اسم الطالب</th>
                                    {activeTab !== 'YEAR_WORK' && assignments.filter(a => a.isVisible).map(a => (
                                        <th key={a.id} className="p-5 border-l text-center min-w-[120px]">
                                            <div className="flex flex-col items-center">
                                                <span className="text-indigo-900 text-sm mb-1">{a.title}</span>
                                                <span className="opacity-40">({a.maxScore})</span>
                                            </div>
                                        </th>
                                    ))}
                                    {activeTab === 'YEAR_WORK' && (
                                        <>
                                            <th className="p-5 border-l text-center bg-blue-50/50 text-blue-900">الواجبات (10)</th>
                                            <th className="p-5 border-l text-center bg-amber-50/50 text-amber-900">الأنشطة (15)</th>
                                            <th className="p-5 border-l text-center bg-green-50/50 text-green-900">الحضور (15)</th>
                                            <th className="p-5 border-l text-center bg-purple-50/50 text-purple-900">الاختبارات (20)</th>
                                            <th className="p-5 border-l text-center bg-slate-900 text-white font-black text-sm">المجموع (60)</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {students.sort((a,b)=>a.name.localeCompare(b.name)).map((s, idx) => {
                                    const sPerf = performance.filter(p => p.studentId === s.id);
                                    const sAtt = attendance.filter(a => a.studentId === s.id);

                                    // Calc Year Work
                                    const hwScore = sPerf.filter(p => p.category === 'HOMEWORK').length > 0 ? (sPerf.filter(p=>p.category==='HOMEWORK').reduce((a,b)=>a+(b.score/b.maxScore),0) / Math.max(1, getAssignments('HOMEWORK', currentUser?.id).length)) * 10 : 0;
                                    const actScore = sPerf.filter(p => p.category === 'ACTIVITY').reduce((a,b)=>a+b.score, 0);
                                    const actFinal = activityTarget > 0 ? Math.min(15, (actScore / activityTarget) * 15) : 0;
                                    const attRate = sAtt.length > 0 ? (sAtt.filter(a=>a.status===AttendanceStatus.PRESENT).length / sAtt.length) * 15 : 15;
                                    const exScore = sPerf.filter(p => p.category === 'PLATFORM_EXAM').length > 0 ? (sPerf.filter(p=>p.category==='PLATFORM_EXAM').reduce((a,b)=>a+(b.score/b.maxScore),0) / Math.max(1, getAssignments('PLATFORM_EXAM', currentUser?.id).length)) * 20 : 0;

                                    return (
                                        <tr key={s.id} className="hover:bg-indigo-50/10 transition-colors h-14 group">
                                            <td className="p-3 border-l text-center text-xs text-slate-300 font-mono">{idx + 1}</td>
                                            <td className="p-3 border-l font-black text-slate-700 sticky right-0 bg-white z-10 shadow-sm">{s.name}</td>
                                            {activeTab !== 'YEAR_WORK' && assignments.filter(a => a.isVisible).map(a => {
                                                const val = gridData[s.id]?.[a.id] || '';
                                                return (
                                                    <td key={a.id} className="p-0 border-l text-center">
                                                        <input 
                                                            type="number" 
                                                            className="w-full h-full p-3 bg-transparent text-center font-black text-indigo-600 outline-none focus:bg-indigo-50/50 transition-colors"
                                                            value={val}
                                                            placeholder="-"
                                                            onChange={e => setGridData({...gridData, [s.id]: { ...gridData[s.id], [a.id]: e.target.value }})}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            {activeTab === 'YEAR_WORK' && (
                                                <>
                                                    <td className="p-3 border-l text-center font-bold text-blue-600">{hwScore.toFixed(1)}</td>
                                                    <td className="p-3 border-l text-center font-bold text-amber-600">{actFinal.toFixed(1)}</td>
                                                    <td className="p-3 border-l text-center font-bold text-green-600">{attRate.toFixed(1)}</td>
                                                    <td className="p-3 border-l text-center font-bold text-purple-600">{exScore.toFixed(1)}</td>
                                                    <td className="p-3 border-l text-center bg-slate-50 font-black text-indigo-900 text-base">{(hwScore + actFinal + attRate + exScore).toFixed(1)}</td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorksTracking;
