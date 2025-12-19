
import React, { useState, useEffect, useMemo } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, AttendanceStatus, Assignment, SystemUser, AcademicTerm, PerformanceCategory } from '../types';
import { getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, getWorksMasterUrl, saveWorksMasterUrl, bulkAddPerformance, deletePerformance } from '../services/storageService';
import { Save, Filter, Trash2, Search, FileSpreadsheet, Settings, Link as LinkIcon, RefreshCw, Loader2, Calculator, ArrowRight, Layers, LayoutPanelLeft, Edit2, Plus, X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface WorksTrackingProps {
    students: Student[];
    performance: PerformanceRecord[];
    attendance: AttendanceRecord[];
    onAddPerformance: (records: PerformanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const DEFAULT_CATEGORIES = [
    { id: 'HOMEWORK', label: 'الواجبات' },
    { id: 'ACTIVITY', label: 'الأنشطة' },
    { id: 'PLATFORM_EXAM', label: 'الاختبارات' },
];

const WorksTracking: React.FC<WorksTrackingProps> = ({ students, performance, attendance, currentUser }) => {
    const navigate = useNavigate();
    
    // UI State
    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('works_active_tab') || 'HOMEWORK');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 
    const [searchTerm, setSearchTerm] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Data State
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    const [yearWorkConfig, setYearWorkConfig] = useState(() => {
        const saved = localStorage.getItem('works_year_config');
        return saved ? JSON.parse(saved) : { hw: 40, act: 20, att: 10, exam: 30 };
    });

    useEffect(() => {
        if (currentUser) {
            setTerms(getAcademicTerms(currentUser.id));
            refreshAssignments();
        }
    }, [currentUser, activeTab]);

    const refreshAssignments = () => {
        setAssignments(getAssignments('ALL', currentUser?.id, true));
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
    
    const filteredAssignments = useMemo(() => { 
        if (activeTab === 'YEAR_WORK') return []; 
        return assignments.filter(a => { 
            const termMatch = !selectedTermId || (a.termId === selectedTermId); 
            const categoryMatch = a.category === activeTab; 
            return termMatch && categoryMatch; 
        }).sort((a,b) => (a.orderIndex || 0) - (b.orderIndex || 0)); 
    }, [assignments, selectedTermId, activeTab]);

    const handleScoreChange = (studentId: string, assignmentId: string, value: string) => {
        setScores(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [assignmentId]: value } }));
    };

    const saveManualChanges = async () => {
        if (Object.keys(scores).length === 0) return;
        const recordsToSave: PerformanceRecord[] = [];
        Object.keys(scores).forEach(studentId => {
            Object.keys(scores[studentId]).forEach(assignmentId => {
                const valStr = scores[studentId][assignmentId];
                const assignment = assignments.find(a => a.id === assignmentId);
                if (!assignment) return;
                const recordId = `${studentId}_${assignmentId}`;
                if (valStr.trim() === '') deletePerformance(recordId);
                else {
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
                            notes: assignment.id,
                            createdById: currentUser?.id
                        });
                    }
                }
            });
        });
        if (recordsToSave.length > 0) bulkAddPerformance(recordsToSave);
        setScores({});
        alert('تم حفظ التغييرات في الكشف بنجاح.');
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 animate-fade-in relative pb-24 md:pb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="bg-white p-1 rounded-2xl border shadow-sm flex gap-1">
                    {DEFAULT_CATEGORIES.map(cat => (
                        <button 
                            key={cat.id} 
                            onClick={() => setActiveTab(cat.id)}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === cat.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500'}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                    <button 
                        onClick={() => setActiveTab('YEAR_WORK')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'YEAR_WORK' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500'}`}
                    >
                        <Calculator size={14}/> أعمال السنة (100)
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {Object.keys(scores).length > 0 && (
                        <button onClick={saveManualChanges} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-xl animate-bounce">
                            <Save size={16} className="inline ml-2"/> حفظ التغييرات
                        </button>
                    )}
                    <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white border rounded-xl hover:bg-gray-50 shadow-sm"><Settings size={18}/></button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 flex flex-wrap gap-4 items-center">
                <select className="p-2 border rounded-xl text-sm font-bold bg-white outline-none" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                    <option value="">جميع الفصول</option>
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute top-2.5 right-3 text-gray-400" size={16}/>
                    <input className="w-full pr-9 pl-3 py-2 border rounded-xl text-sm" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {activeTab !== 'YEAR_WORK' ? (
                        <table className="w-full text-right text-sm border-collapse">
                            <thead className="bg-gray-50 text-gray-700 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 border-b w-10 text-center">#</th>
                                    <th className="p-4 border-b min-w-[200px] sticky right-0 bg-gray-50">اسم الطالب</th>
                                    {filteredAssignments.map(col => (
                                        <th key={col.id} className="p-4 border-b text-center min-w-[100px] border-l border-gray-100">
                                            <div className="flex flex-col">
                                                <span>{col.title}</span>
                                                <span className="text-[10px] text-gray-400 font-normal">({col.maxScore})</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredStudents.map((student, idx) => (
                                    <tr key={student.id} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="p-4 text-center text-gray-400 font-mono">{idx + 1}</td>
                                        <td className="p-4 font-bold text-gray-800 sticky right-0 bg-white shadow-sm">{student.name}</td>
                                        {filteredAssignments.map(col => (
                                            <td key={col.id} className="p-0 border-l border-gray-50">
                                                <input 
                                                    className="w-full h-full p-4 text-center outline-none bg-transparent font-bold focus:bg-white transition-colors"
                                                    value={scores[student.id]?.[col.id] ?? (performance.find(p => p.studentId === student.id && p.notes === col.id)?.score.toString() || '')}
                                                    onChange={e => handleScoreChange(student.id, col.id, e.target.value)}
                                                    placeholder="-"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-center text-sm border-collapse">
                            <thead className="bg-orange-50 text-orange-900 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 text-right bg-orange-50 sticky right-0 z-20">اسم الطالب</th>
                                    <th className="p-4 border-l border-orange-200">الواجبات ({yearWorkConfig.hw})</th>
                                    <th className="p-4 border-l border-orange-200">الأنشطة ({yearWorkConfig.act})</th>
                                    <th className="p-4 border-l border-orange-200">الاختبارات ({yearWorkConfig.exam})</th>
                                    <th className="p-4 border-l border-orange-200">الحضور ({yearWorkConfig.att})</th>
                                    <th className="p-4 border-l border-orange-200 bg-orange-600 text-white font-black">المجموع (100)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map(student => {
                                    const calcPct = (catId: string) => {
                                        const catAssigns = assignments.filter(a => a.category === catId);
                                        let obtained = 0, total = 0;
                                        catAssigns.forEach(a => {
                                            const rec = performance.find(p => p.studentId === student.id && p.notes === a.id);
                                            if (rec) { obtained += rec.score; total += a.maxScore; }
                                        });
                                        return total > 0 ? (obtained / total) : 0;
                                    };
                                    const hw = Math.round(calcPct('HOMEWORK') * yearWorkConfig.hw);
                                    const act = Math.round(calcPct('ACTIVITY') * yearWorkConfig.act);
                                    const exam = Math.round(calcPct('PLATFORM_EXAM') * yearWorkConfig.exam);
                                    const attPct = attendance.filter(a => a.studentId === student.id).length ? (attendance.filter(a => a.studentId === student.id && a.status === 'PRESENT').length / attendance.filter(a => a.studentId === student.id).length) : 1;
                                    const att = Math.round(attPct * yearWorkConfig.att);

                                    return (
                                        <tr key={student.id} className="hover:bg-orange-50 transition-colors border-b">
                                            <td className="p-4 text-right font-bold text-gray-800 sticky right-0 bg-white">{student.name}</td>
                                            <td className="p-4">{hw}</td>
                                            <td className="p-4">{act}</td>
                                            <td className="p-4">{exam}</td>
                                            <td className="p-4">{att}</td>
                                            <td className="p-4 font-black text-lg text-orange-600">{hw+act+exam+att}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorksTracking;
