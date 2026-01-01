
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, Assignment, Subject, AttendanceRecord, SystemUser } from '../types';
import { 
    saveAssignment, deleteAssignment, getWorksMasterUrl, 
    saveWorksMasterUrl, getSubjects, addPerformance, getTeacherAssignments,
    fetchAssignments, fetchPerformance
} from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { 
    Save, ExternalLink, Loader2, Table, Link as LinkIcon, Settings, 
    Plus, Trash2, RefreshCw, ChevronLeft, Globe, X, 
    ArrowRightLeft, Filter, Info, CheckCircle, AlertCircle, Cloud, Sheet
} from 'lucide-react';
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

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, onAddPerformance, currentUser }) => {
    const { showToast } = useToast();
    const [activeMode, setActiveMode] = useState<'GRADING' | 'MANAGEMENT'>('GRADING');
    const [activeTab, setActiveTab] = useState<PerformanceCategory>('ACTIVITY');
    const [filterSubject, setFilterSubject] = useState<string>('ALL');
    const [filterPeriod, setFilterPeriod] = useState<'P1' | 'P2' | 'ALL'>('ALL');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<ExtendedAssignment[]>([]);
    const [gridData, setGridData] = useState<Record<string, Record<string, string>>>({}); 
    const [isGenerating, setIsGenerating] = useState(false);
    const [masterUrl, setMasterUrl] = useState('');
    const [showCloudSettings, setShowCloudSettings] = useState(false);
    const [syncStep, setSyncStep] = useState<'IDLE' | 'SELECT_SHEET' | 'MAPPING'>('IDLE');
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    const [fullWorkbook, setFullWorkbook] = useState<any>(null);
    const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
    const [sheetRawData, setSheetRawData] = useState<any[]>([]);
    const [columnMap, setColumnMap] = useState<Record<string, string>>({}); 
    const [identityCol, setIdentityCol] = useState<string>(''); 

    const loadDataFromCloud = async () => {
        if (!currentUser) return;
        try {
            const [cloudAssignments] = await Promise.all([fetchAssignments(currentUser.id)]);
            setAssignments(cloudAssignments as ExtendedAssignment[]);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (!currentUser) return;
        setSubjects(getSubjects(currentUser.id));
        setMasterUrl(getWorksMasterUrl());
        loadDataFromCloud();
    }, [currentUser]);

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
            const matchCategory = activeTab === 'ALL' || a.category === activeTab;
            const matchSubject = filterSubject === 'ALL' || a.subject === filterSubject;
            const matchPeriod = filterPeriod === 'ALL' || a.periodTag === filterPeriod;
            return matchCategory && matchSubject && matchPeriod;
        }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [assignments, filterSubject, filterPeriod, activeTab]);

    const handleSaveGrid = async () => {
        setIsGenerating(true);
        const records: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];
        students.forEach(s => {
            filteredAssignments.forEach(a => {
                const val = gridData[s.id]?.[a.id];
                if (val !== undefined && val !== '') {
                    records.push({
                        id: `${s.id}_${a.id}`, studentId: s.id, subject: a.subject || 'عام',
                        title: a.title, category: activeTab, score: parseFloat(val),
                        maxScore: a.maxScore, date: today, notes: a.id, createdById: currentUser?.id
                    });
                }
            });
        });
        try {
            await onAddPerformance(records);
            showToast('تم حفظ السجل بنجاح.', 'SUCCESS');
        } catch (e) { showToast('فشل المزامنة.', 'ERROR'); }
        finally { setIsGenerating(false); }
    };

    const handleAddColumn = async () => {
        if (!currentUser) return;
        const newAssign: ExtendedAssignment = {
            id: `col_${Date.now()}`, title: 'تقييم جديد', category: activeTab, maxScore: 10,
            isVisible: true, teacherId: currentUser.id,
            subject: filterSubject === 'ALL' ? (subjects[0]?.name || 'عام') : filterSubject,
            periodTag: filterPeriod === 'ALL' ? 'P1' : filterPeriod, sortOrder: assignments.length
        };
        await saveAssignment(newAssign);
        setAssignments([...assignments, newAssign]);
    };

    return (
        <div className="space-y-6 animate-fade-in flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                    <button onClick={() => setActiveMode('GRADING')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeMode === 'GRADING' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>رصد الدرجات</button>
                    <button onClick={() => setActiveMode('MANAGEMENT')} className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeMode === 'MANAGEMENT' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>إدارة الأعمدة</button>
                </div>
                
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowCloudSettings(true)} className="p-2 text-slate-400 hover:text-blue-600 bg-white border rounded-lg" title="إعدادات الربط"><Globe size={18}/></button>
                    <button onClick={handleSaveGrid} disabled={isGenerating} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm hover:bg-blue-700">
                        {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} حفظ السجل
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center shrink-0">
                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="p-2 border rounded-md bg-slate-50 text-xs font-bold outline-none">
                    <option value="ALL">كل المواد</option>
                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <div className="flex bg-slate-100 p-1 rounded-md">
                    {['ALL', 'P1', 'P2'].map(p => (
                        <button key={p} onClick={() => setFilterPeriod(p as any)} className={`px-3 py-1 rounded text-[10px] font-bold ${filterPeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{p === 'ALL' ? 'الكل' : p}</button>
                    ))}
                </div>
                <div className="flex gap-1 border-r pr-4 mr-2 border-slate-200">
                    {(['ACTIVITY', 'HOMEWORK', 'PLATFORM_EXAM', 'YEAR_WORK'] as PerformanceCategory[]).map(cat => (
                        <button key={cat} onClick={() => setActiveTab(cat)} className={`px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${activeTab === cat ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}>
                            {cat === 'ACTIVITY' ? 'أنشطة' : cat === 'HOMEWORK' ? 'واجبات' : cat === 'PLATFORM_EXAM' ? 'اختبارات' : 'أعمال السنة'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col relative">
                {activeMode === 'MANAGEMENT' ? (
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800">قائمة التقييمات المعرفة</h3>
                            <button onClick={handleAddColumn} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-2"><Plus size={14}/> إضافة عمود</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAssignments.map((a) => (
                                <div key={a.id} className="p-4 bg-white border rounded-xl shadow-sm relative group">
                                    <button onClick={() => {if(confirm('حذف العمود؟')) deleteAssignment(a.id);}} className="absolute top-4 left-4 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                    <div className="space-y-3">
                                        <input className="w-full p-2 border-b border-transparent focus:border-blue-500 outline-none font-bold text-slate-700" value={a.title} onChange={e=> saveAssignment({...a, title: e.target.value})} />
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                            <span>المادة: {a.subject}</span>
                                            <span>الدرجة: {a.maxScore}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-right border-collapse min-w-[800px]">
                            <thead className="bg-slate-50 border-b text-[11px] font-bold text-slate-500 uppercase sticky top-0 z-20">
                                <tr>
                                    <th className="px-4 py-3 border-l w-12 text-center">م</th>
                                    <th className="px-4 py-3 border-l sticky right-0 bg-slate-50 z-30 w-64 text-slate-800">اسم الطالب</th>
                                    {filteredAssignments.map(a => (
                                        <th key={a.id} className="px-4 py-3 border-l text-center min-w-[120px]">
                                            <div className="flex flex-col">
                                                <span className="text-slate-700 truncate">{a.title}</span>
                                                <span className="text-[9px] text-slate-400 font-normal">{a.maxScore}د</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {students.sort((a,b)=>a.name.localeCompare(b.name, 'ar')).map((s, idx) => (
                                    <tr key={s.id} className="hover:bg-slate-50 h-12 transition-colors">
                                        <td className="px-4 text-center text-[10px] text-slate-400 font-mono border-l">{idx + 1}</td>
                                        <td className="px-4 font-medium text-slate-700 sticky right-0 bg-white z-10 border-l">{s.name}</td>
                                        {filteredAssignments.map(a => (
                                            <td key={a.id} className="p-0 border-l text-center">
                                                <input 
                                                    type="number" 
                                                    className="w-full h-full p-3 bg-transparent text-center font-bold text-sm outline-none focus:bg-blue-50/30"
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

            {showCloudSettings && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden border">
                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center font-bold text-slate-800">
                             <h3>إعدادات الربط السحابي</h3>
                             <button onClick={() => setShowCloudSettings(false)} className="text-slate-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">رابط ملف Google Sheets (للاستيراد)</label>
                                <input className="w-full p-2.5 border rounded-lg bg-slate-50 text-sm dir-ltr" placeholder="https://docs.google.com/..." value={masterUrl} onChange={e => setMasterUrl(e.target.value)}/>
                            </div>
                            <button onClick={() => { saveWorksMasterUrl(masterUrl); setShowCloudSettings(false); }} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md">تحديث الرابط</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
