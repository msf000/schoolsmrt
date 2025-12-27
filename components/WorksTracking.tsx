
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, PerformanceCategory, Assignment, Subject, AttendanceRecord, AttendanceStatus, SystemUser } from '../types';
import { getAssignments, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, getSchools, getSubjects, addPerformance, fetchPerformance } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from '../services/excelService';
import { Save, CheckCircle, ExternalLink, Loader2, Table, Link as LinkIcon, Edit2, Activity, Target, Settings, Plus, Trash2, Eye, EyeOff, List, Layout, PenTool, RefreshCw, TrendingUp, ChevronLeft, Database, Globe, Sparkles } from 'lucide-react';
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
    const [activityTarget, setActivityTarget] = useState<number>(13); 
    const [isGenerating, setIsGenerating] = useState(false);
    const [masterUrl, setMasterUrl] = useState('');
    const [isEditingUrl, setIsEditingUrl] = useState(false);
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

    const handleAutoSync = async () => {
        if (!masterUrl) return;
        setIsGenerating(true);
        setStatusMsg('جاري سحب البيانات من السحابة...');
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(masterUrl);
            const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            const records: PerformanceRecord[] = [];
            const today = new Date().toISOString().split('T')[0];

            data.forEach(row => {
                const nid = String(row['nationalId'] || row['رقم الهوية'] || row['السجل'] || '').trim();
                const student = students.find(s => s.nationalId === nid);
                if (student) {
                    headers.forEach(h => {
                        const score = parseFloat(row[h]);
                        if (!isNaN(score)) {
                            records.push({
                                id: `${student.id}_${h}_${today}`,
                                studentId: student.id,
                                subject: selectedSubject || 'عام',
                                title: h,
                                category: activeTab,
                                score: score,
                                maxScore: 10,
                                date: today,
                                notes: 'cloud_sync',
                                createdById: currentUser?.id
                            });
                        }
                    });
                }
            });

            if (records.length > 0) {
                onAddPerformance(records);
                showToast(`تمت مزامنة ${records.length} درجة بنجاح`, 'SUCCESS');
            }
        } catch (e) {
            showToast('فشل المزامنة مع ملف Excel السحابي', 'ERROR');
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
                    <button onClick={handleSaveGrid} disabled={isGenerating} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl hover:bg-emerald-700 transition-all">
                        {isGenerating ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                        حفظ السجل
                    </button>
                    <button onClick={handleAutoSync} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100 hover:bg-indigo-100"><RefreshCw size={18}/></button>
                </div>
            </div>

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
                            {assignments.map((a, idx) => (
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
