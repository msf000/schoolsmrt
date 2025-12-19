
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, AcademicTerm, PerformanceCategory } from '../types';
import { getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, bulkAddPerformance, deletePerformance, getPerformance } from '../services/storageService';
// Fix: Added RefreshCw to lucide-react imports
import { Save, Filter, Trash2, Search, Settings, Plus, X, Check, Calculator, LayoutPanelLeft, Link as LinkIcon, Database, Cloud, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const CATEGORIES: { id: PerformanceCategory, label: string }[] = [
    { id: 'HOMEWORK', label: 'الواجبات' },
    { id: 'ACTIVITY', label: 'الأنشطة' },
    { id: 'PLATFORM_EXAM', label: 'الاختبارات' },
    { id: 'YEAR_WORK', label: 'أعمال السنة' },
];

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, attendance, currentUser }) => {
    const navigate = useNavigate();
    
    // UI State
    const [activeTab, setActiveTab] = useState<PerformanceCategory>(() => (localStorage.getItem('works_active_tab') as any) || 'HOMEWORK');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 
    const [searchTerm, setSearchTerm] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Data State
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [allPerformance, setAllPerformance] = useState<PerformanceRecord[]>([]);
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    const [isSaving, setIsSaving] = useState(false);

    // New Column Form
    const [showAddCol, setShowAddCol] = useState(false);
    const [newColTitle, setNewColTitle] = useState('');
    const [newColMax, setNewColMax] = useState('10');

    useEffect(() => {
        if (currentUser) {
            refreshData();
        }
    }, [currentUser, activeTab]);

    const refreshData = () => {
        setAssignments(getAssignments(activeTab, currentUser?.id, true));
        setAllPerformance(getPerformance());
    };

    const uniqueClasses = useMemo(() => { 
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        return Array.from(classes).sort(); 
    }, [students]);

    const filteredStudents = useMemo(() => {
        let filtered = students;
        if (selectedClass) filtered = filtered.filter(s => s.className === selectedClass);
        if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm));
        return filtered.sort((a,b) => a.name.localeCompare(b.name, 'ar'));
    }, [students, selectedClass, searchTerm]);

    const handleScoreChange = (studentId: string, assignmentId: string, value: string) => {
        setScores(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [assignmentId]: value } }));
    };

    const handleAddColumn = () => {
        if (!newColTitle || !currentUser) return;
        const newCol: Assignment = {
            id: `col_${Date.now()}`,
            title: newColTitle,
            category: activeTab,
            maxScore: Number(newColMax),
            isVisible: true,
            teacherId: currentUser.id,
            orderIndex: assignments.length
        };
        saveAssignment(newCol);
        setNewColTitle('');
        setShowAddCol(false);
        refreshData();
    };

    const handleDeleteColumn = (id: string) => {
        if (confirm('سيتم حذف العمود وجميع الدرجات المرتبطة به. هل أنت متأكد؟')) {
            deleteAssignment(id);
            refreshData();
        }
    };

    const handleSaveScores = async () => {
        if (Object.keys(scores).length === 0) return;
        setIsSaving(true);
        const recordsToSave: PerformanceRecord[] = [];
        
        Object.keys(scores).forEach(studentId => {
            Object.keys(scores[studentId]).forEach(assignmentId => {
                const valStr = scores[studentId][assignmentId];
                const assignment = assignments.find(a => a.id === assignmentId);
                if (!assignment) return;
                
                const recordId = `${studentId}_${assignmentId}`;
                if (valStr.trim() === '') {
                    deletePerformance(recordId);
                } else {
                    const numVal = parseFloat(valStr);
                    if (!isNaN(numVal)) {
                        recordsToSave.push({
                            id: recordId,
                            studentId: studentId,
                            subject: 'عام',
                            title: assignment.title,
                            category: assignment.category,
                            score: numVal,
                            maxScore: assignment.maxScore,
                            date: new Date().toISOString().split('T')[0],
                            notes: assignment.id, // نستخدم نوتس للربط بالعمود
                            createdById: currentUser?.id
                        });
                    }
                }
            });
        });

        if (recordsToSave.length > 0) bulkAddPerformance(recordsToSave);
        setScores({});
        setIsSaving(false);
        refreshData();
        alert('تم الحفظ والمزامنة السحابية بنجاح.');
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative pb-24 md:pb-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="bg-white p-1 rounded-2xl border shadow-sm flex gap-1 overflow-x-auto max-w-full no-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button 
                            key={cat.id} 
                            onClick={() => { setActiveTab(cat.id); localStorage.setItem('works_active_tab', cat.id); }}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === cat.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <Cloud size={12}/> المزامنة السحابية نشطة
                    </div>
                    {Object.keys(scores).length > 0 && (
                        <button onClick={handleSaveScores} disabled={isSaving} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 animate-pulse">
                            {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} 
                            حفظ التغييرات ({Object.keys(scores).reduce((acc, k) => acc + Object.keys(scores[k]).length, 0)})
                        </button>
                    )}
                    <button onClick={() => setShowAddCol(true)} className="p-2 bg-green-600 text-white rounded-xl hover:bg-green-700 shadow-sm" title="إضافة عمود رصد"><Plus size={20}/></button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border">
                    <Filter size={16} className="text-gray-400"/>
                    <select className="bg-transparent text-sm font-bold outline-none" value={selectedClass} onChange={e => { setSelectedClass(e.target.value); localStorage.setItem('works_class', e.target.value); }}>
                        <option value="">جميع الفصول</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute top-2.5 right-3 text-gray-400" size={16}/>
                    <input className="w-full pr-9 pl-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
            </div>

            {/* Main Table */}
            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-right text-sm border-collapse">
                        <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="p-4 border-b w-12 text-center bg-gray-50">#</th>
                                <th className="p-4 border-b min-w-[200px] sticky right-0 bg-gray-50 z-20 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">اسم الطالب</th>
                                {assignments.map(col => (
                                    <th key={col.id} className="p-4 border-b text-center min-w-[120px] border-l border-gray-100 group relative">
                                        <div className="flex flex-col">
                                            <span className="truncate max-w-[100px]">{col.title}</span>
                                            <span className="text-[10px] text-gray-400 font-normal">({col.maxScore})</span>
                                        </div>
                                        <button onClick={() => handleDeleteColumn(col.id)} className="absolute -top-1 -left-1 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X size={10}/></button>
                                    </th>
                                ))}
                                {assignments.length === 0 && <th className="p-4 border-b text-center text-gray-400 italic">اضغط + لإضافة أعمدة رصد لهذا التبويب</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredStudents.map((student, idx) => (
                                <tr key={student.id} className="hover:bg-indigo-50/20 transition-colors">
                                    <td className="p-4 text-center text-gray-400 font-mono">{idx + 1}</td>
                                    <td 
                                        onClick={() => navigate('/followup', { state: { studentId: student.id } })}
                                        className="p-4 font-bold text-gray-800 sticky right-0 bg-white z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] cursor-pointer hover:text-indigo-600 hover:underline transition-colors"
                                    >
                                        {student.name}
                                    </td>
                                    {assignments.map(col => {
                                        const existing = allPerformance.find(p => p.studentId === student.id && p.notes === col.id);
                                        return (
                                            <td key={col.id} className="p-0 border-l border-gray-50">
                                                <input 
                                                    type="number"
                                                    className={`w-full h-full p-4 text-center outline-none bg-transparent font-bold focus:bg-white transition-colors ${scores[student.id]?.[col.id] ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-700'}`}
                                                    value={scores[student.id]?.[col.id] ?? (existing?.score.toString() || '')}
                                                    onChange={e => handleScoreChange(student.id, col.id, e.target.value)}
                                                    placeholder="-"
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Column Modal */}
            {showAddCol && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-zoom-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2"><LayoutPanelLeft className="text-indigo-600"/> إضافة عمود رصد جديد</h3>
                            <button onClick={() => setShowAddCol(false)} className="p-2 hover:bg-gray-100 rounded-full"><X/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">اسم العمود (مثال: واجب 1، اختبار قصير)</label>
                                <input className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={newColTitle} onChange={e=>setNewColTitle(e.target.value)} autoFocus placeholder="أدخل المسمى..."/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">الدرجة العظمى</label>
                                <input type="number" className="w-full p-3 border rounded-xl bg-gray-50 font-bold" value={newColMax} onChange={e=>setNewColMax(e.target.value)}/>
                            </div>
                            <div className="pt-4 flex gap-2">
                                <button onClick={handleAddColumn} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">إضافة العمود</button>
                                <button onClick={() => setShowAddCol(false)} className="px-6 py-4 border rounded-2xl font-bold text-gray-500 hover:bg-gray-50">إلغاء</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorksTracking;
