
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Student, PerformanceRecord, AttendanceRecord, Assignment, SystemUser, Subject, AcademicTerm } from '../types';
import { getSubjects, getAssignments, getAcademicTerms, saveAssignment, deleteAssignment, saveWorksMasterUrl, getWorksMasterUrl } from '../services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData, guessMapping } from '../services/excelService';
import { Table, Plus, Trash2, Settings, Calendar, X, RefreshCw, Loader2, Zap, Save, Globe, Settings2, Link2, Sliders, LayoutList, CheckCircle } from 'lucide-react';
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
    { id: 'PLATFORM_EXAM', label: 'الاختبارات' }
];

const WorksTracking: React.FC<WorksTrackingProps> = ({ students: initialStudents, performance, attendance, onAddPerformance, currentUser }) => {
    const navigate = useNavigate();
    const isManager = currentUser?.role === 'SCHOOL_MANAGER' || currentUser?.role === 'SUPER_ADMIN';
    const students = useMemo(() => [...initialStudents].sort((a, b) => a.name.localeCompare(b.name, 'ar')), [initialStudents]);

    const [categories] = useState<{id: string, label: string}[]>(() => {
        const saved = localStorage.getItem('works_custom_categories');
        return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    });

    const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('works_active_tab') || 'HOMEWORK');
    const [selectedTermId, setSelectedTermId] = useState(() => localStorage.getItem('works_term_id') || '');
    const [selectedSubject, setSelectedSubject] = useState(() => localStorage.getItem('works_subject') || '');
    const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('works_class') || ''); 

    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
    
    const [isSaving, setIsSaving] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'MANUAL' | 'SHEET' | 'CATEGORIES' | 'WEIGHTS'>('MANUAL');

    // Google Sheets Sync States
    const [sheetUrl, setSheetUrl] = useState('');
    const [isFetchingSheet, setIsFetchingSheet] = useState(false);
    const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
    const [sheetData, setSheetData] = useState<any[]>([]);
    const [syncMapping, setSyncMapping] = useState<Record<string, string>>({});

    const [weights, setWeights] = useState<Record<string, number>>(() => {
        const saved = localStorage.getItem('works_weights');
        return saved ? JSON.parse(saved) : { HOMEWORK: 10, ACTIVITY: 10, PLATFORM_EXAM: 20, ATTENDANCE: 5 };
    });

    const [newCol, setNewCol] = useState({ title: '', max: '10', category: 'HOMEWORK', order: '0' });

    useEffect(() => {
        if (currentUser) {
            setTerms(getAcademicTerms(currentUser.id));
            setSubjects(getSubjects(currentUser.id));
            setAssignments(getAssignments('ALL', currentUser.id, isManager));
            setSheetUrl(getWorksMasterUrl());
        }
    }, [currentUser, isSettingsOpen, isManager]);

    useEffect(() => {
        const newScores: Record<string, Record<string, string>> = {};
        students.forEach(s => {
            newScores[s.id] = {};
            const studentPerf = performance.filter(p => p.studentId === s.id && p.subject === selectedSubject);
            studentPerf.forEach(p => {
                const assign = assignments.find(a => a.id === p.notes || a.title === p.title);
                if (assign) newScores[s.id][assign.id] = p.score.toString();
            });
        });
        setScores(newScores);
    }, [students, performance, selectedSubject, assignments]);

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => {
            const categoryMatch = activeTab === 'YEAR_WORK' ? true : a.category === activeTab;
            const termMatch = !selectedTermId || a.termId === selectedTermId;
            return categoryMatch && termMatch;
        }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [assignments, activeTab, selectedTermId]);

    const uniqueClasses = useMemo(() => Array.from(new Set(initialStudents.map(s => s.className).filter(Boolean))).sort(), [initialStudents]);

    const handleConnectSheet = async () => {
        if (!sheetUrl) return;
        setIsFetchingSheet(true);
        try {
            const { workbook, sheetNames } = await fetchWorkbookStructureUrl(sheetUrl);
            const { headers, data } = getSheetHeadersAndData(workbook, sheetNames[0]);
            setSheetHeaders(headers);
            setSheetData(data);
            saveWorksMasterUrl(sheetUrl);
            
            // Try to guess mappings
            const guessed = guessMapping(headers, 'PERFORMANCE');
            setSyncMapping(guessed);
        } catch (e) {
            alert('تعذر جلب البيانات. تأكد من أن الرابط متاح للجميع.');
        } finally {
            setIsFetchingSheet(false);
        }
    };

    const handleSyncGrades = () => {
        if (sheetData.length === 0 || !currentUser) return;
        const records: PerformanceRecord[] = [];
        const today = new Date().toISOString().split('T')[0];
        
        sheetData.forEach(row => {
            const studentName = row[syncMapping['studentName']];
            const studentId = row[syncMapping['nationalId']];
            const score = parseFloat(row[syncMapping['score']]);

            const matchedStudent = students.find(s => 
                (studentId && s.nationalId === String(studentId)) || 
                (studentName && s.name.includes(String(studentName)))
            );

            if (matchedStudent && !isNaN(score)) {
                // Find or create assignment for this sync
                const assign = assignments.find(a => a.category === activeTab && a.termId === selectedTermId);
                if (assign) {
                    records.push({
                        id: `${matchedStudent.id}_sync_${assign.id}`,
                        studentId: matchedStudent.id,
                        subject: selectedSubject || 'عام',
                        title: assign.title,
                        category: assign.category,
                        score: score,
                        maxScore: assign.maxScore,
                        date: today,
                        notes: assign.id,
                        createdById: currentUser.id
                    });
                }
            }
        });

        if (records.length > 0) {
            onAddPerformance(records);
            alert(`تمت مزامنة ${records.length} درجة بنجاح!`);
            setIsSettingsOpen(false);
        } else {
            alert('لم يتم العثور على طلاب مطابقتهم في الملف.');
        }
    };

    const handleAddManualCol = () => {
        if (!newCol.title || !selectedTermId || !currentUser) return alert('أكمل البيانات المطلوبة');
        const assign: Assignment = {
            id: `manual_${Date.now()}`,
            title: newCol.title,
            category: newCol.category as any,
            maxScore: Number(newCol.max),
            isVisible: true,
            teacherId: currentUser.id,
            termId: selectedTermId,
            sortOrder: Number(newCol.order)
        };
        saveAssignment(assign);
        setAssignments(getAssignments('ALL', currentUser.id, isManager));
        setNewCol({ ...newCol, title: '' });
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in relative overflow-hidden font-tajawal">
            {/* Header Controls */}
            <div className="bg-white p-5 rounded-[2.5rem] shadow-xl border border-gray-100 mb-6 flex flex-col md:flex-row justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 bg-indigo-50/50 p-2.5 rounded-2xl border border-indigo-100">
                        <Calendar size={18} className="text-indigo-600"/>
                        <select className="bg-transparent text-xs font-black outline-none min-w-[150px] text-indigo-900" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}>
                            <option value="">-- الفصل الدراسي --</option>
                            {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <select className="p-2.5 border rounded-2xl bg-white font-black text-xs outline-none shadow-sm min-w-[150px]" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                        <option value="">-- المادة الدراسية --</option>
                        {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                    <select className="p-2.5 border rounded-2xl bg-white font-black text-xs outline-none shadow-sm min-w-[120px]" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">-- كل الفصول --</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsSettingsOpen(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
                        <Globe size={18}/> المزامنة السحابية
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white text-gray-400 border-2 border-gray-50 rounded-2xl hover:text-indigo-600 shadow-sm transition-all"><Settings2 size={22}/></button>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 flex-1 overflow-hidden flex flex-col relative">
                <div className="flex bg-gray-50/50 border-b p-2 overflow-x-auto no-scrollbar gap-2 print:hidden shadow-inner">
                    {categories.map(cat => (
                        <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`px-10 py-3.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === cat.id ? 'bg-white shadow-xl text-indigo-600 border border-indigo-100 scale-105' : 'text-gray-400 hover:bg-white/50'}`}>
                            {cat.label}
                        </button>
                    ))}
                    <div className="w-[2px] h-8 bg-gray-200 self-center mx-2"></div>
                    <button onClick={() => setActiveTab('YEAR_WORK')} className={`px-10 py-3.5 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${activeTab === 'YEAR_WORK' ? 'bg-gray-900 text-white shadow-2xl scale-105' : 'text-gray-400 hover:bg-gray-100'}`}>أعمال السنة النهائية</button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-center border-collapse min-w-[1200px]">
                        <thead className="bg-[#F8FAFC]/80 backdrop-blur-md sticky top-0 z-30 border-b">
                            <tr className="text-[11px] text-slate-400 uppercase tracking-widest font-black h-16">
                                <th className="p-4 w-16 border-l border-gray-50">م</th>
                                <th className="p-4 text-right sticky right-0 bg-[#F8FAFC] z-40 w-80 border-l border-gray-50 shadow-sm">اسم الطالب</th>
                                {activeTab !== 'YEAR_WORK' && filteredAssignments.map(a => (
                                    <th key={a.id} className="p-4 border-l border-gray-100 min-w-[150px]">
                                        <div className="flex flex-col items-center">
                                            <span className="text-slate-800 font-black text-sm">{a.title}</span>
                                            <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-black">درجة: {a.maxScore}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {students.filter(s => !selectedClass || s.className === selectedClass).map((student, idx) => (
                                <tr key={student.id} className="hover:bg-indigo-50/10 transition-colors h-16">
                                    <td className="p-3 border-l border-gray-50 text-xs text-slate-300 font-mono">{idx + 1}</td>
                                    <td className="p-3 text-right font-black text-slate-700 sticky right-0 bg-white z-10 border-l border-gray-50">{student.name}</td>
                                    {activeTab !== 'YEAR_WORK' && filteredAssignments.map(a => (
                                        <td key={a.id} className="p-0 border-l border-gray-50 h-full">
                                            <input 
                                                className="w-full h-full text-center outline-none bg-transparent focus:bg-indigo-50/50 font-black text-sm text-indigo-900 border-none" 
                                                value={scores[student.id]?.[a.id] || ''} 
                                                onChange={e => setScores({...scores, [student.id]: {...scores[student.id], [a.id]: e.target.value}})} 
                                                placeholder="-"
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-zoom-in">
                        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                            <h3 className="text