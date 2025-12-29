import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, Assignment, Subject, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { getAssignments, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, getSchools, getSubjects, addPerformance, fetchPerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, CheckCircle, ExternalLink, Loader2, Table, Link as LinkIcon, Edit2, Activity, Target, Settings, Plus, Trash2, Eye, EyeOff, List, Layout, PenTool, RefreshCw, TrendingUp, ChevronLeft, Database, Globe, Sparkles, X, ChevronDown, FileSpreadsheet, Filter, Calendar, BookOpen, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { useToast } from './ToastProvider';

interface WorksTrackingProps {
  students: Student[];
  performance: PerformanceRecord[];
  attendance: AttendanceRecord[];
  onAddPerformance: (records: PerformanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

interface ExtendedAssignment extends Assignment {
    subject?: string;
    periodTag?: 'P1' | 'P2' | 'ALL';
}

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, onAddPerformance, currentUser }) => {
    const { showToast } = useToast();
    const [activeMode, setActiveMode] = useState<'GRADING' | 'MANAGEMENT'>(() => {
        return localStorage.getItem('works_tracking_mode') as any || 'GRADING';
    });
    const [activeTab, setActiveTab] = useState<PerformanceCategory>(() => {
        return localStorage.getItem('works_tracking_tab') as any || 'ACTIVITY';
    });

    const [filterSubject, setFilterSubject] = useState<string>('ALL');
    const [filterPeriod, setFilterPeriod] = useState<'P1' | 'P2' | 'ALL'>('ALL');

    useEffect(() => { localStorage.setItem('works_tracking_mode', activeMode); }, [activeMode]);
    useEffect(() => { localStorage.setItem('works_tracking_tab', activeTab); }, [activeTab]);

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<ExtendedAssignment[]>([]);
    const [gridData, setGridData] = useState<Record<string, Record<string, string>>>({}); 
    const [isGenerating, setIsGenerating] = useState(false);
    const [masterUrl, setMasterUrl] = useState('');
    
    // Cloud Sync States
    const [showCloudSettings, setShowCloudSettings] = useState(false);
    const [showSheetSelector, setShowSheetSelector] = useState(false);
    const [showMappingUI, setShowMappingUI] = useState(false);
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    const [fullWorkbook, setFullWorkbook] = useState<any>(null);
    const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
    const [sheetRawData, setSheetRawData] = useState<any[]>([]);
    const [columnMap, setColumnMap] = useState<Record<string, string>>({}); // { assignmentId: sheetHeaderName }
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        if (!currentUser) return;
        const subjs = getSubjects(currentUser.id);
        setSubjects(subjs);
        setMasterUrl(getWorksMasterUrl());
        const allAssignments = getAssignments(activeTab, currentUser.id) as ExtendedAssignment[];
        setAssignments(allAssignments.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
        
        if (filterSubject === 'ALL' && subjs.length > 0) {
            setFilterSubject(subjs[0].name);
        }
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

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const matchSubject = filterSubject === 'ALL' || a.subject === filterSubject;
            const matchPeriod = filterPeriod === 'ALL' || a.periodTag === filterPeriod;
            return matchSubject && matchPeriod;
        });
    }, [assignments, filterSubject, filterPeriod]);

    const handleSaveCloudUrl = () => {
        saveWorksMasterUrl(masterUrl);
        showToast('تم حفظ رابط المزامنة السحابي', 'SUCCESS');
        setShowCloudSettings(false);
    };

    const handleStartSyncFlow = async () => {
        if (!masterUrl) {
            setShowCloudSettings(true);
            return showToast('الرجاء إدخال رابط Google Sheet أولاً', 'INFO');
        }
        setIsGenerating(true);
        setStatusMsg('جاري استكشاف الملف...');
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(masterUrl);
            setFullWorkbook(workbook);
            setAvailableSheets(sheetNames);
            if (sheetNames.length > 1) {
                setShowSheetSelector(true);
            } else if (sheetNames.length === 1) {
                prepareMapping(workbook, sheetNames[0]);
            }
        } catch (e) {
            showToast('فشل الوصول للملف. تأكد أن الرابط عام.', 'ERROR');
        } finally {
            setIsGenerating(false);
            setStatusMsg('');
        }
    };

    const prepareMapping = (workbook: any, sheetName: string) => {
        const { headers, data } = getSheetHeadersAndData(workbook, sheetName);
        setSheetHeaders(headers);
        setSheetRawData(data);
        
        // محاولة مطابقة تلقائية أولية بناءً على الأسماء
        const initialMap: Record<string, string> = {};
        filteredAssignments.forEach(assign => {
            const match = headers.find(h => h.trim().toLowerCase() === assign.title.trim().toLowerCase());
            if (match) initialMap[assign.id] = match;
        });
        
        setColumnMap(initialMap);
        setShowSheetSelector(false);
        setShowMappingUI(true);
    };

    const executeFinalSync = async () => {
        setIsGenerating(true);
        setStatusMsg('جاري استيراد البيانات وتحديث السجل...');
        try {
            const records: PerformanceRecord[] = [];
            const today = new Date().toISOString().split('T')[0];

            sheetRawData.forEach(row => {
                // البحث عن هوية الطالب (ندعم عدة مسميات للأعمدة)
                const nid = String(row['nationalId'] || row['رقم الهوية'] || row['السجل'] || row['هوية الطالب'] || row['رقم السجل'] || '').trim();
                const student = students.find(s => s.nationalId === nid);
                
                if (student) {
                    filteredAssignments.forEach(assign => {
                        const mappedHeader = columnMap[assign.id];
                        if (mappedHeader && row[mappedHeader] !== undefined) {
                            const score = parseFloat(row[mappedHeader]);
                            if (!isNaN(score)) {
                                records.push({
                                    id: `${student.id}_${assign.id}_cloud`,
                                    studentId: student.id,
                                    subject: assign.subject || 'عام',
                                    title: assign.title,
                                    category: activeTab,
                                    score: score,
                                    maxScore: assign.maxScore,
                                    date: today,
                                    notes: assign.id,
                                    createdById: currentUser?.id
                                });
                            }
                        }
                    });
                }
            });

            if (records.length > 0) {
                await onAddPerformance(records);
                showToast(`تم استيراد ${records.length} درجة بنجاح.`, 'SUCCESS');
                setShowMappingUI(false);
            } else {
                showToast('لم يتم العثور على درجات مطابقة للطلاب المحددين.', 'INFO');
            }
        } catch (e) {
            showToast('حدث خطأ أثناء المزامنة.', 'ERROR');
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
            filteredAssignments.forEach(a => {
                const val = gridData[s.id]?.[a.id];
                if (val !== undefined && val !== '') {
                    records.push({
                        id: `${s.id}_${a.id}`,
                        studentId: s.id,
                        subject: a.subject || 'عام',
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
            showToast('تم حفظ السجل بنجاح.', 'SUCCESS');
        } catch (e) {
            showToast('فشل الحفظ السحابي.', 'ERROR');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddColumn = () => {
        if (!currentUser) return;
        const newAssign: ExtendedAssignment = {
            id: `col_${Date.now()}`,
            title: 'مهمة جديدة',
            category: activeTab,
            maxScore: 10,
            isVisible: true,
            teacherId: currentUser.id,
            subject: filterSubject !== 'ALL' ? filterSubject : (subjects[0]?.name || 'عام'),
            periodTag: filterPeriod !== 'ALL' ? filterPeriod : 'P1',
            sortOrder: assignments.length
        };
        saveAssignment(newAssign);
        setAssignments([...assignments, newAssign]);
    };

    const handleUpdateAssignment = (id: string, updates: Partial<ExtendedAssignment>) => {
        const updated = assignments.map(a => {
            if (a.id === id) {
                const newObj = { ...a, ...updates };
                saveAssignment(newObj);
                return newObj;
            }
            return a;
        });
        setAssignments(updated);
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-[#F8FAFC] animate-fade-in font-tajawal overflow-hidden pb-20">
            {/* Elegant Header Bento */}
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-6 shrink-0">
                <div className="flex bg-white p-1.5 rounded-[1.5rem] shadow-2xl border border-slate-100">
                    <button onClick={() => setActiveMode('GRADING')} className={`px-10 py-3.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${activeMode === 'GRADING' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Layout size={18}/> رصد الدرجات
                    </button>
                    <button onClick={() => setActiveMode('MANAGEMENT')} className={`px-10 py-3.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${activeMode === 'MANAGEMENT' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Settings size={18}/> إعدادات الأعمدة
                    </button>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowCloudSettings(true)} 
                        className={`p-4 rounded-2xl border transition-all shadow-xl ${masterUrl ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-slate-300 border-slate-100 hover:border-indigo-300'}`}
                        title="الربط السحابي"
                    >
                        <LinkIcon size={24}/>
                    </button>
                    <button onClick={handleStartSyncFlow} disabled={isGenerating} className="px-8 py-4 bg-indigo-50 text-indigo-600 rounded-[1.5rem] border border-indigo-100 font-black text-xs flex items-center gap-3 hover:bg-indigo-600 hover:text-white transition-all shadow-lg active:scale-95">
                        {isGenerating ? <Loader2 size={18} className="animate-spin"/> : <RefreshCw size={18}/>}
                        <span className="hidden md:inline">مزامنة Google Sheets</span>
                    </button>
                    <button onClick={handleSaveGrid} disabled={isGenerating} className="px-10 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs flex items-center gap-3 shadow-2xl shadow-indigo-200 hover:bg-black transition-all active:scale-95">
                        {isGenerating ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                        حفظ السجل النهائي
                    </button>
                </div>
            </div>

            {/* Sub-Bento Filter Bar */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-50 mb-8 flex flex-wrap gap-6 items-center shrink-0">
                <div className="flex items-center gap-4 border-l pl-6">
                    <div className={`p-3 rounded-2xl ${activeTab === 'ACTIVITY' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                        <Filter size={20}/>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">تصفية العرض</p>
                        <h4 className="text-sm font-black text-slate-800">تحكم بمصفوفة الرصد</h4>
                    </div>
                </div>
                
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="relative group">
                        <BookOpen size={16} className="absolute right-4 top-3.5 text-slate-300 group-hover:text-indigo-500 transition-colors"/>
                        <select 
                            value={filterSubject} 
                            onChange={e => setFilterSubject(e.target.value)}
                            className="pr-12 pl-6 py-3 border rounded-2xl bg-slate-50 font-black text-xs outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all min-w-[180px] shadow-inner"
                        >
                            <option value="ALL">كل المواد</option>
                            {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                    </div>

                    <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                        {['ALL', 'P1', 'P2'].map(p => (
                            <button 
                                key={p}
                                onClick={() => setFilterPeriod(p as any)} 
                                className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filterPeriod === p ? 'bg-white text-indigo-600 shadow-xl scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {p === 'ALL' ? 'كامل الفصل' : p === 'P1' ? 'الفترة 1' : 'الفترة 2'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-10 w-px bg-slate-100 mx-2 hidden xl:block"></div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
                    {(['ACTIVITY', 'HOMEWORK', 'PLATFORM_EXAM', 'YEAR_WORK'] as PerformanceCategory[]).map(cat => (
                        <button key={cat} onClick={() => setActiveTab(cat)} className={`py-2.5 px-6 rounded-2xl font-black text-[10px] transition-all whitespace-nowrap flex items-center justify-center gap-2 border-2 ${activeTab === cat ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-transparent hover:bg-slate-50'}`}>
                            {cat === 'ACTIVITY' ? 'الأنشطة' : cat === 'HOMEWORK' ? 'الواجبات' : cat === 'PLATFORM_EXAM' ? 'الاختبارات' : 'أعمال السنة'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Table Space - Immersive View */}
            <div className="flex-1 bg-white rounded-[4rem] border border-slate-50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col relative transition-all duration-700">
                {activeMode === 'MANAGEMENT' ? (
                    <div className="p-12 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
                        <div className="flex justify-between items-center mb-10 border-b border-slate-200 pb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">إدارة مصفوفة الرصد</h3>
                                <p className="text-sm text-slate-400 font-bold mt-2">تخصيص الأعمدة لمادة: <span className="text-indigo-600">{filterSubject}</span></p>
                            </div>
                            <button onClick={handleAddColumn} className="bg-slate-900 text-white px-8 py-3.5 rounded-[1.5rem] font-black text-xs hover:bg-black transition-all flex items-center gap-2 shadow-2xl active:scale-95"><Plus size={18}/> إضافة عمود جديد</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-10">
                            {assignments.map((a) => (
                                <div key={a.id} className={`p-8 bg-white border rounded-[3rem] relative group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 ${a.subject === filterSubject ? 'ring-2 ring-indigo-500/10 border-indigo-200' : 'border-slate-100 opacity-60 hover:opacity-100'}`}>
                                    <button onClick={()=>{if(confirm('حذف العمود؟')) {deleteAssignment(a.id); setAssignments(assignments.filter(x=>x.id!==a.id))}}} className="absolute top-6 left-6 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={20}/></button>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">مسمى الرصد (يطابق Excel)</p>
                                            <input className="w-full p-4 border rounded-[1.5rem] font-black bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 outline-none border-transparent focus:border-indigo-500 transition-all" value={a.title} onChange={e=>handleUpdateAssignment(a.id, { title: e.target.value })}/>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">المادة</p>
                                                <select className="w-full p-3 border rounded-2xl text-[10px] font-black bg-slate-50" value={a.subject} onChange={e=>handleUpdateAssignment(a.id, { subject: e.target.value })}>
                                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">الفترة</p>
                                                <select className="w-full p-3 border rounded-2xl text-[10px] font-black bg-slate-50" value={a.periodTag} onChange={e=>handleUpdateAssignment(a.id, { periodTag: e.target.value as any })}>
                                                    <option value="P1">الفترة 1</option>
                                                    <option value="P2">الفترة 2</option>
                                                    <option value="ALL">كامل الفصل</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                            <span className="text-[11px] font-black text-slate-400 uppercase">الدرجة العظمى</span>
                                            <input type="number" className="w-20 p-3 bg-indigo-50 border-none rounded-2xl font-black text-center text-indigo-600 shadow-inner" value={a.maxScore} onChange={e=>handleUpdateAssignment(a.id, { maxScore: Number(e.target.value) })}/>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-right border-collapse min-w-[1000px]">
                            <thead className="bg-[#F8FAFC] font-black text-[10px] text-slate-400 uppercase tracking-[0.2em] sticky top-0 z-30 shadow-sm border-b h-20">
                                <tr>
                                    <th className="p-6 border-l border-slate-100 w-20 text-center">م</th>
                                    <th className="p-6 border-l border-slate-100 sticky right-0 bg-[#F8FAFC] z-40 shadow-sm text-slate-800 w-72">اسم الطالب</th>
                                    {filteredAssignments.filter(a => a.isVisible).map(a => (
                                        <th key={a.id} className="p-6 border-l border-slate-100 text-center min-w-[150px]">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-slate-800 text-sm">{a.title}</span>
                                                <div className="flex gap-2">
                                                    <span className="text-[8px] bg-indigo-50 px-2 py-0.5 rounded-full text-indigo-600 font-black">{a.periodTag === 'P1' ? 'ف1' : 'ف2'}</span>
                                                    <span className="text-[8px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-400 font-black">{a.maxScore}درجة</span>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {students.sort((a,b)=>a.name.localeCompare(b.name, 'ar')).map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-indigo-50/10 transition-colors h-16 group">
                                        <td className="p-6 border-l border-slate-100 text-center text-xs text-slate-300 font-mono">{idx + 1}</td>
                                        <td className="p-6 border-l border-slate-100 font-black text-slate-700 sticky right-0 bg-white z-10 shadow-sm group-hover:text-indigo-600 transition-colors">
                                            {s.name}
                                            <p className="text-[9px] text-slate-300 font-bold uppercase mt-1">{s.nationalId}</p>
                                        </td>
                                        {filteredAssignments.filter(a => a.isVisible).map(a => (
                                            <td key={a.id} className="p-0 border-l border-slate-100 text-center h-full">
                                                <input 
                                                    type="number" 
                                                    className="w-full h-full p-6 bg-transparent text-center font-black text-lg outline-none transition-all focus:ring-4 focus:ring-indigo-500/5"
                                                    value={gridData[s.id]?.[a.id] || ''}
                                                    placeholder="-"
                                                    onChange={e => setGridData({...gridData, [s.id]: { ...gridData[s.id], [a.id]: e.target.value }})}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {filteredAssignments.length === 0 && (
                                    <tr>
                                        <td colSpan={students.length + 2} className="p-32 text-center text-slate-300">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border-4 border-dashed border-slate-100"><Table size={48}/></div>
                                                <p className="font-black text-xl">لا توجد أعمدة رصد لهذه المادة في الفترات المحددة.</p>
                                                <button onClick={() => setActiveMode('MANAGEMENT')} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:scale-105 transition-all">إعداد الأعمدة الآن</button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal for Sheet Tab Selection */}
            {showSheetSelector && (
                <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 font-tajawal animate-fade-in">
                    <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-zoom-in">
                        <div className="p-10 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><FileSpreadsheet size={150}/></div>
                            <div className="relative z-10">
                                <h3 className="text-3xl font-black flex items-center gap-4">اختر ورقة العمل</h3>
                                <p className="text-indigo-300 font-bold mt-2 uppercase tracking-widest text-[10px]">الملف يحتوي على أوراق متعددة</p>
                            </div>
                            <button onClick={() => setShowSheetSelector(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors relative z-10"><X size={24}/></button>
                        </div>
                        <div className="p-10 space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar bg-slate-50">
                            {availableSheets.map(sheet => (
                                <button 
                                    key={sheet}
                                    onClick={() => prepareMapping(fullWorkbook, sheet)}
                                    className="w-full p-6 bg-white border border-slate-100 rounded-[2rem] text-right font-black text-slate-700 hover:bg-indigo-600 hover:text-white hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-white/20"><FileSpreadsheet size={20}/></div>
                                        <span>{sheet}</span>
                                    </div>
                                    <ChevronLeft className="text-slate-300 group-hover:text-white transition-colors" size={24}/>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Column Mapping Interface */}
            {showMappingUI && (
                <div className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-6 font-tajawal animate-fade-in">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col animate-zoom-in border border-white/20">
                        <div className="p-10 bg-indigo-600 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-3xl font-black flex items-center gap-4"><ArrowRightLeft size={32}/> مطابقة أعمدة البيانات</h3>
                                <p className="text-indigo-200 font-bold mt-2">اربط كل عمود في Google Sheets بمهمة في النظام</p>
                            </div>
                            <button onClick={() => setShowMappingUI(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/50">
                            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex gap-4 mb-10">
                                <Sparkles className="text-indigo-600 shrink-0"/>
                                <p className="text-xs text-indigo-800 leading-relaxed font-bold">
                                    لقد قمنا بقراءة جميع الأعمدة المتاحة في ورقة العمل. اختر العمود الذي يحتوي على الدرجات لكل مهمة من المهام الظاهرة أدناه. سيتم تجاهل المهام غير المربوطة.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredAssignments.map(assign => (
                                    <div key={assign.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-black text-slate-800">{assign.title}</h4>
                                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{assign.category}</span>
                                            </div>
                                            {columnMap[assign.id] ? <CheckCircle className="text-emerald-500" size={20}/> : <AlertCircle className="text-slate-200" size={20}/>}
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black text-slate-400 mb-2 uppercase">عمود الدرجات في قوقل شيت:</label>
                                            <select 
                                                className="w-full p-3 border rounded-2xl bg-slate-50 font-bold text-xs outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                                value={columnMap[assign.id] || ''}
                                                onChange={e => setColumnMap({...columnMap, [assign.id]: e.target.value})}
                                            >
                                                <option value="">-- تجاهل هذه المهمة --</option>
                                                {sheetHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-10 border-t bg-white flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3 text-slate-400">
                                <FileSpreadsheet size={20}/>
                                <span className="text-xs font-bold">تم اكتشاف {sheetHeaders.length} عمود و {sheetRawData.length} سجل طالب</span>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowMappingUI(false)} className="px-8 py-4 text-slate-400 font-black hover:text-slate-600 transition-colors">إلغاء</button>
                                <button 
                                    onClick={executeFinalSync} 
                                    disabled={isGenerating || Object.keys(columnMap).length === 0}
                                    className="bg-indigo-600 text-white px-12 py-4 rounded-[2rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3 disabled:opacity-50"
                                >
                                    {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                                    بدء استيراد الدرجات ({Object.keys(columnMap).length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCloudSettings && (
                <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 font-tajawal animate-fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-zoom-in">
                        <div className="p-10 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12"><Globe size={180}/></div>
                            <h3 className="text-3xl font-black relative z-10 flex items-center gap-4"><Globe/> ربط Google Sheets</h3>
                            <button onClick={() => setShowCloudSettings(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors relative z-10"><X size={24}/></button>
                        </div>
                        <div className="p-12 space-y-10">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">رابط الملف السحابي (Shareable Link)</label>
                                <input 
                                    className="w-full p-5 border-2 border-slate-50 rounded-[1.5rem] bg-slate-50 font-black text-sm dir-ltr text-left outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 transition-all shadow-inner"
                                    placeholder="https://docs.google.com/spreadsheets/d/..."
                                    value={masterUrl}
                                    onChange={e => setMasterUrl(e.target.value)}
                                />
                                <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex gap-4">
                                    <Sparkles className="text-blue-600 shrink-0"/>
                                    <p className="text-xs text-blue-700 leading-relaxed font-bold">
                                        تأكد من جعل الرابط "عاماً". سيقوم النظام بمطابقة الطلاب عبر عمود الهوية تلقائياً، وسيسمح لك باختيار أعمدة الدرجات يدوياً.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handleSaveCloudUrl} className="flex-1 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-2xl hover:bg-indigo-700 transition-all active:scale-95">تفعيل المزامنة السحابية</button>
                                <button onClick={() => {setMasterUrl(''); saveWorksMasterUrl(''); setShowCloudSettings(false);}} className="p-5 bg-rose-50 text-rose-500 rounded-[1.5rem] border border-rose-100 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={24}/></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
