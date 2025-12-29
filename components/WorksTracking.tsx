import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, Assignment, Subject, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { getAssignments, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, getSchools, getSubjects, addPerformance, fetchPerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, CheckCircle, ExternalLink, Loader2, Table, Link as LinkIcon, Edit2, Activity, Target, Settings, Plus, Trash2, Eye, EyeOff, List, Layout, PenTool, RefreshCw, TrendingUp, ChevronLeft, Database, Globe, Sparkles, X } from 'lucide-react';
import { useToast } from './ToastProvider';

interface WorksTrackingProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  onAddPerformance: (records: PerformanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance, currentUser }) => {
    const { showToast } = useToast();
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
    const [isGenerating, setIsGenerating] = useState(false);
    const [masterUrl, setMasterUrl] = useState('');
    const [showCloudSettings, setShowCloudSettings] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        if (!currentUser) return;
        setSubjects(getSubjects(currentUser.id));
        setMasterUrl(getWorksMasterUrl());
        const allAssignments = getAssignments(activeTab, currentUser.id);
        setAssignments(allAssignments.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    }, [activeTab, currentUser, activeMode]);

    useEffect(() => {
        const newGrid: Record<string, Record<string, string>> = {};
        performance.forEach(p => {
            if (p.category === activeTab && p.notes) {
                if (!newGrid[p.studentId]) newGrid[p.studentId] = {};
                newGrid[p.studentId][p.notes] = p.score.toString();
            }
        });
        setGridData(newGrid);
    }, [performance, activeTab]);

    const handleSaveCloudUrl = () => {
        saveWorksMasterUrl(masterUrl);
        showToast('تم حفظ رابط المزامنة السحابي', 'SUCCESS');
        setShowCloudSettings(false);
    };

    const handleAutoSync = async () => {
        if (!masterUrl) {
            setShowCloudSettings(true);
            return showToast('الرجاء إدخال رابط Google Sheet أولاً', 'INFO');
        }
        
        setIsGenerating(true);
        setStatusMsg('جاري سحب البيانات من السحابة...');
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(masterUrl);
            const { data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            const records: PerformanceRecord[] = [];
            const today = new Date().toISOString().split('T')[0];

            data.forEach(row => {
                const nid = String(row['nationalId'] || row['رقم الهوية'] || row['السجل'] || row['هوية الطالب'] || '').trim();
                const student = students.find(s => s.nationalId === nid);
                
                if (student) {
                    assignments.forEach(assign => {
                        const scoreVal = row[assign.title];
                        const score = parseFloat(scoreVal);
                        if (!isNaN(score)) {
                            records.push({
                                id: `${student.id}_${assign.id}_cloud`,
                                studentId: student.id,
                                subject: selectedSubject || 'عام',
                                title: assign.title,
                                category: activeTab,
                                score: score,
                                maxScore: assign.maxScore,
                                date: today,
                                notes: assign.id,
                                createdById: currentUser?.id
                            });
                        }
                    });
                }
            });

            if (records.length > 0) {
                await onAddPerformance(records);
                showToast(`تمت مزامنة ${records.length} درجة بنجاح من Google Sheets`, 'SUCCESS');
            } else {
                showToast('لم يتم العثور على درجات مطابقة للطلاب في الملف', 'INFO');
            }
        } catch (e) {
            console.error(e);
            showToast('فشل الاتصال بـ Google Sheets. تأكد أن الرابط عام.', 'ERROR');
        } finally {
            setIsGenerating(false);
            setStatusMsg('');
        }
    };

    const handleSaveGrid = async () => {
        setIsGenerating(true);
        const records: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];
        
        students.forEach(s => {
            assignments.forEach(a => {
                const val = gridData[s.id]?.[a.id];
                if (val !== undefined && val !== '') {
                    records.push({
                        id: `${s.id}_${a.id}`,
                        studentId: s.id,
                        subject: selectedSubject || 'عام',
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

        try {
            await onAddPerformance(records);
            showToast('تم حفظ سجل الرصد وتحديث البيانات السحابية', 'SUCCESS');
        } catch (e) {
            showToast('حدث خطأ أثناء الحفظ السحابي', 'ERROR');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddColumn = () => {
        if (!currentUser) return;
        const newAssign: Assignment = {
            id: `col_${Date.now()}`,
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

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden pb-20">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6 shrink-0">
                <div className="flex bg-white p-1.5 rounded-2xl shadow-xl border border-slate-100">
                    <button onClick={() => setActiveMode('GRADING')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeMode === 'GRADING' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
                        <List size={18}/> رصد الدرجات
                    </button>
                    <button onClick={() => setActiveMode('MANAGEMENT')} className={`px-10 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeMode === 'MANAGEMENT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
                        <Settings size={18}/> إعدادات الأعمدة
                    </button>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowCloudSettings(true)} 
                        className={`p-3 rounded-2xl border transition-all ${masterUrl ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-slate-400 border-slate-200'}`}
                        title="إعدادات الربط السحابي (Google Sheets)"
                    >
                        <LinkIcon size={20}/>
                    </button>
                    <button onClick={handleAutoSync} disabled={isGenerating} className="px-6 py-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 font-black text-xs flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all">
                        {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16}/>}
                        مزامنة Google Sheets
                    </button>
                    <button onClick={handleSaveGrid} disabled={isGenerating} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl hover:bg-emerald-700 transition-all">
                        {isGenerating ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                        حفظ السجل النهائي
                    </button>
                </div>
            </div>

            {showCloudSettings && (
                <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-zoom-in">
                        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                            <h3 className="text-xl font-black flex items-center gap-3"><Globe/> ربط Google Sheets</h3>
                            <button onClick={() => setShowCloudSettings(false)} className="p-2 hover:bg-white/10 rounded-full"><X/></button>
                        </div>
                        <div className="p-10 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-3">رابط جدول البيانات (Shareable Link)</label>
                                <input 
                                    className="w-full p-4 border rounded-2xl bg-slate-50 font-bold text-sm dir-ltr text-left outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                    value={masterUrl}
                                    onChange={e => setMasterUrl(e.target.value)}
                                />
                                <p className="mt-3 text-[10px] text-slate-400 leading-relaxed font-medium">
                                    تأكد من أن الرابط "عام" أو متاح لمن يملك الرابط. سيقوم النظام بمطابقة الطلاب عبر عمود الهوية واستيراد الدرجات بناءً على عناوين الأعمدة التي تطابق أسماء المهام لديك.
                                </p>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={handleSaveCloudUrl} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl">تفعيل الربط السحابي</button>
                                <button onClick={() => setMasterUrl('')} className="p-4 bg-red-50 text-red-500 rounded-2xl border border-red-100"><Trash2 size={20}/></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isGenerating && statusMsg && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-indigo-600 text-white px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
                    <Loader2 size={18} className="animate-spin"/>
                    <span className="font-black text-sm">{statusMsg}</span>
                </div>
            )}

            <div className="flex bg-white rounded-2xl p-1 mb-6 shadow-sm border border-slate-100 overflow-x-auto no-scrollbar shrink-0">
                {(['ACTIVITY', 'HOMEWORK', 'PLATFORM_EXAM', 'YEAR_WORK'] as PerformanceCategory[]).map(cat => (
                    <button key={cat} onClick={() => setActiveTab(cat)} className={`flex-1 py-3 px-6 rounded-xl font-black text-xs transition-all whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === cat ? 'bg-indigo-600 text-white shadow-xl scale-[1.02]' : 'text-gray-400 hover:bg-slate-50'}`}>
                        {cat === 'ACTIVITY' ? 'الأنشطة' : cat === 'HOMEWORK' ? 'الواجبات' : cat === 'PLATFORM_EXAM' ? 'الاختبارات' : 'أعمال السنة'}
                    </button>
                ))}
            </div>

            <div className="flex-1 bg-white rounded-[3.5rem] border border-slate-100 shadow-2xl overflow-hidden flex flex-col relative">
                {activeMode === 'MANAGEMENT' ? (
                    <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
                        <div className="flex justify-between items-center mb-8 border-b pb-6">
                            <h3 className="text-xl font-black text-slate-800">إدارة أعمدة الرصد</h3>
                            <button onClick={handleAddColumn} className="bg-indigo-50 text-indigo-700 px-6 py-2 rounded-2xl font-black text-xs hover:bg-indigo-100 border border-indigo-100 flex items-center gap-2"><Plus size={16}/> إضافة عمود</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {assignments.map((a) => (
                                <div key={a.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] relative group hover:border-indigo-200 transition-all">
                                    <button onClick={()=>{deleteAssignment(a.id); setAssignments(assignments.filter(x=>x.id!==a.id))}} className="absolute top-4 left-4 text-red-100 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                                    <div className="space-y-4">
                                        <input className="w-full p-3 border rounded-2xl font-black bg-white" value={a.title} onChange={e=>saveAssignment({...a, title: e.target.value})}/>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-slate-400">الدرجة العظمى:</span>
                                            <input type="number" className="w-16 p-2 border rounded-xl font-black text-center" value={a.maxScore} onChange={e=>saveAssignment({...a, maxScore: Number(e.target.value)})}/>
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
                                    {assignments.filter(a => a.isVisible).map(a => (
                                        <th key={a.id} className="p-5 border-l text-center min-w-[120px]">
                                            <div className="flex flex-col items-center">
                                                <span className="text-indigo-900 text-sm mb-1">{a.title}</span>
                                                <span className="opacity-40">({a.maxScore})</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {students.sort((a,b)=>a.name.localeCompare(b.name)).map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-indigo-50/10 transition-colors h-14 group">
                                        <td className="p-3 border-l text-center text-xs text-slate-300 font-mono">{idx + 1}</td>
                                        <td className="p-3 border-l font-black text-slate-700 sticky right-0 bg-white z-10 shadow-sm">{s.name}</td>
                                        {assignments.filter(a => a.isVisible).map(a => (
                                            <td key={a.id} className="p-0 border-l text-center">
                                                <input 
                                                    type="number" 
                                                    className="w-full h-full p-3 bg-transparent text-center font-black text-indigo-600 outline-none focus:bg-indigo-50/50 transition-colors"
                                                    value={gridData[s.id]?.[a.id] || ''}
                                                    placeholder="-"
                                                    onChange={e => setGridData({...gridData, [s.id]: { ...gridData[s.id], [a.id]: e.target.value }})}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorksTracking;
