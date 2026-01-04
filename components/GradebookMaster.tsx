
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord, Assignment, SystemUser, PerformanceCategory, Subject } from '../types';
import { fetchAssignments, fetchPerformance, addPerformance, getSubjects } from '../services/storageService';
import { 
    Table, Search, Download, Filter, Printer, Save, 
    LayoutGrid, ClipboardList, Loader2, Plus, ArrowRightLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from './ToastProvider';

const GradebookMaster: React.FC<{ students: Student[], performance: PerformanceRecord[], currentUser: SystemUser }> = ({ students, performance: initialPerformance, currentUser }) => {
    const { showToast } = useToast();
    const [activeCategory, setActiveCategory] = useState<PerformanceCategory | 'ALL'>('ALL');
    const [selectedClass, setSelectedClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [localPerf, setLocalPerf] = useState<PerformanceRecord[]>(initialPerformance);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        const [asns, perfs, subs] = await Promise.all([
            fetchAssignments(currentUser.id),
            fetchPerformance(currentUser.id),
            getSubjects(currentUser.id)
        ]);
        setAssignments(asns.filter(a => a.isVisible));
        setLocalPerf(perfs);
        setSubjects(subs);
    };

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);
    
    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
    }, [uniqueClasses]);

    const filteredAssignments = useMemo(() => {
        return assignments.filter(a => activeCategory === 'ALL' || a.category === activeCategory)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }, [assignments, activeCategory]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesClass = !selectedClass || s.className === selectedClass;
            const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesClass && matchesSearch;
        }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }, [students, selectedClass, searchTerm]);

    const handleCellChange = async (studentId: string, assignment: Assignment, value: string) => {
        const score = parseFloat(value);
        if (isNaN(score)) return;

        const record: PerformanceRecord = {
            id: `${studentId}_${assignment.id}`,
            studentId,
            subject: assignment.subject || 'عام',
            title: assignment.title,
            score,
            maxScore: assignment.maxScore,
            date: new Date().toISOString().split('T')[0],
            category: assignment.category,
            notes: assignment.id,
            createdById: currentUser.id
        };

        try {
            await addPerformance([record]);
            setLocalPerf(prev => [...prev.filter(p => p.id !== record.id), record]);
            showToast('تم حفظ الدرجة سحابياً', 'SUCCESS');
        } catch (e) {
            showToast('فشل في المزامنة', 'ERROR');
        }
    };

    return (
        <div className="space-y-6 page-enter font-tajawal pb-20">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">سجل الرصد العام</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">عرض وتعديل كافة درجات الفصل في واجهة موحدة.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => XLSX.writeFile(XLSX.utils.table_to_book(document.getElementById('master-table')), `Gradebook_${selectedClass}.xlsx`)} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2">
                        <Download size={16}/> تصدير Excel
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-wrap items-center gap-6">
                <div className="flex bg-slate-50 p-1 rounded-xl">
                    {['ALL', 'ACTIVITY', 'HOMEWORK', 'PLATFORM_EXAM', 'YEAR_WORK'].map((cat) => (
                        <button 
                            key={cat}
                            onClick={() => setActiveCategory(cat as any)}
                            className={`px-5 py-2 rounded-lg text-[10px] font-black transition-all ${activeCategory === cat ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {cat === 'ALL' ? 'الكل' : cat}
                        </button>
                    ))}
                </div>
                <div className="h-8 w-px bg-slate-200"></div>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2.5 border-2 border-slate-50 bg-white rounded-xl font-black text-slate-900 outline-none text-xs min-w-[150px] shadow-sm">
                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={18}/>
                    <input className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-brand-500/5 transition-all" placeholder="بحث باسم الطالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[600px] relative">
                <div className="overflow-auto flex-1 custom-scrollbar">
                    <table id="master-table" className="w-full text-right border-collapse min-w-[1200px]">
                        <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest sticky top-0 z-30">
                            <tr>
                                <th className="p-5 border-l border-white/5 w-14 text-center">م</th>
                                <th className="p-5 border-l border-white/5 sticky right-0 bg-slate-900 z-40 w-72 shadow-xl">اسم الطالب</th>
                                {filteredAssignments.map(a => (
                                    <th key={a.id} className="p-4 border-l border-white/5 text-center min-w-[120px]">
                                        <div className="flex flex-col gap-1">
                                            <span className="truncate">{a.title}</span>
                                            <span className="text-[8px] text-indigo-300 font-bold opacity-60">/{a.maxScore}</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="p-5 bg-indigo-600 text-white text-center w-24">المجموع</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStudents.map((student, idx) => {
                                let total = 0;
                                return (
                                    <tr key={student.id} className="hover:bg-indigo-50/10 h-14 group">
                                        <td className="p-4 text-center text-[10px] font-black text-slate-300 border-l">{idx + 1}</td>
                                        <td className="p-4 font-black text-slate-800 sticky right-0 bg-white z-20 border-l group-hover:bg-indigo-50/50 transition-colors shadow-sm">{student.name}</td>
                                        {filteredAssignments.map(asn => {
                                            const rec = localPerf.find(p => p.studentId === student.id && p.notes === asn.id);
                                            total += rec?.score || 0;
                                            return (
                                                <td key={asn.id} className="p-0 border-l border-slate-50">
                                                    <input 
                                                        type="number"
                                                        className={`w-full h-14 text-center font-black text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-brand-500/20 ${rec ? 'text-brand-600' : 'text-slate-300'}`}
                                                        defaultValue={rec?.score || ''}
                                                        placeholder="-"
                                                        onBlur={(e) => handleCellChange(student.id, asn, e.target.value)}
                                                    />
                                                </td>
                                            );
                                        })}
                                        <td className="p-4 text-center font-black bg-slate-900 text-yellow-400 text-base">{total}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const TabBtn = ({ label, active, onClick, icon: Icon }: any) => (
    <button onClick={onClick} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>
        <Icon size={16} /> {label}
    </button>
);

export default GradebookMaster;
