
import React, { useState, useEffect, useMemo } from 'react';
import { CurriculumUnit, CurriculumLesson, MicroConcept, SystemUser, Subject, AcademicTerm } from '../types';
import { 
    getCurriculumUnits, saveCurriculumUnit, deleteCurriculumUnit,
    getCurriculumLessons, saveCurriculumLesson, deleteCurriculumLesson,
    getMicroConcepts, saveMicroConcept, deleteMicroConcept,
    getSubjects, getAcademicTerms, toggleCurriculumLesson
} from '../services/storageService';
import { generateCurriculumMap } from '../services/geminiService';
import { BookOpen, FolderPlus, FilePlus, Trash2, Edit2, ChevronDown, ChevronRight, Hash, BrainCircuit, Plus, List, Sparkles, Loader2, PenTool, CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CurriculumManagerProps {
    currentUser: SystemUser;
}

const SAUDI_GRADES = [
    "الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي",
    "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي",
    "الصف الأول المتوسط", "الصف الثاني المتوسط", "الصف الثالث المتوسط",
    "الصف الأول الثانوي (السنة المشتركة)", 
    "الصف الثاني الثانوي (مسارات)", 
    "الصف الثالث الثانوي (مسارات)"
];

const SAUDI_SUBJECTS = [
    "علم الأرض والفضاء", "التقنية الرقمية", "علوم البيانات", "الذكاء الاصطناعي", "الأمن السيبراني", "الهندسة", 
    "الدراسات الإسلامية", "القرآن الكريم", "لغتي", "الرياضيات", "العلوم", "اللغة الإنجليزية",
    "الدراسات الاجتماعية", "المهارات الرقمية", "التربية الفنية", "التربية البدنية والدفاع عن النفس",
    "التفكير الناقد", "أحياء", "فيزياء", "كيمياء", "علم البيئة",
    "المهارات الحياتية والأسرية", "اللياقة والثقافة الصحية",
    "الإدارة المالية", "البحث ومصادر المعلومات"
];

const CurriculumManager: React.FC<CurriculumManagerProps> = ({ currentUser }) => {
    const navigate = useNavigate();
    const [view, setView] = useState<'MAP' | 'CONCEPTS'>('MAP');
    const [userSubjects, setUserSubjects] = useState<Subject[]>([]);
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [selectedTermId, setSelectedTermId] = useState('');
    const [units, setUnits] = useState<CurriculumUnit[]>([]);
    const [lessons, setLessons] = useState<CurriculumLesson[]>([]);
    const [concepts, setConcepts] = useState<MicroConcept[]>([]);
    const [newUnitName, setNewUnitName] = useState('');
    const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
    const [editingLesson, setEditingLesson] = useState<Partial<CurriculumLesson> | null>(null);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (currentUser?.id) {
            setUserSubjects(getSubjects(currentUser.id));
            setTerms(getAcademicTerms(currentUser.id));
            refreshData();
        }
    }, [currentUser]);

    const refreshData = () => {
        if (!currentUser?.id) return;
        setUnits(getCurriculumUnits(currentUser.id));
        setLessons(getCurriculumLessons()); 
        setConcepts(getMicroConcepts(currentUser.id));
    };

    const handleToggleCompletion = (lessonId: string, currentStatus: boolean) => {
        toggleCurriculumLesson(lessonId, !currentStatus);
        refreshData();
    };

    // Fix: Adding missing toggleUnit function
    const toggleUnit = (unitId: string) => {
        const newSet = new Set(expandedUnits);
        if (newSet.has(unitId)) newSet.delete(unitId);
        else newSet.add(unitId);
        setExpandedUnits(newSet);
    };

    const allSubjectsList = useMemo(() => {
        const customNames = userSubjects.map(s => s.name);
        return Array.from(new Set([...SAUDI_SUBJECTS, ...customNames])).sort();
    }, [userSubjects]);

    const filteredUnits = useMemo(() => {
        return units.filter(u => 
            (!selectedSubject || u.subject === selectedSubject) && 
            (!selectedGrade || u.gradeLevel === selectedGrade)
        ).sort((a,b) => a.orderIndex - b.orderIndex);
    }, [units, selectedSubject, selectedGrade]);

    const handleAddUnit = () => {
        if (!newUnitName || !selectedSubject) return alert('الرجاء اختيار المادة وكتابة اسم الوحدة');
        saveCurriculumUnit({ id: Date.now().toString(), teacherId: currentUser.id, subject: selectedSubject, gradeLevel: selectedGrade || 'عام', title: newUnitName, orderIndex: units.length });
        setNewUnitName(''); refreshData();
    };

    const handleAutoGenerate = async () => {
        if (!selectedSubject || !selectedGrade || !selectedTermId) return alert('أكمل الخيارات أولاً');
        setIsGenerating(true);
        try {
            const term = terms.find(t => t.id === selectedTermId);
            const structure = await generateCurriculumMap(selectedSubject, selectedGrade, term?.name || 'الفصل الدراسي الأول');
            if (Array.isArray(structure)) {
                structure.forEach((unitData, uIdx) => {
                    const unitId = `u_${Date.now()}_${uIdx}`;
                    saveCurriculumUnit({ id: unitId, teacherId: currentUser.id, subject: selectedSubject, gradeLevel: selectedGrade, title: unitData.unitTitle, orderIndex: uIdx });
                    unitData.lessons?.forEach((l:any, lIdx:number) => {
                        saveCurriculumLesson({ id: `l_${Date.now()}_${uIdx}_${lIdx}`, unitId, title: l.title, orderIndex: lIdx, learningStandards: l.standards || [], microConceptIds: [] });
                    });
                });
                refreshData();
            }
        } catch (e) { alert('فشل التوليد'); } finally { setIsGenerating(false); }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><List className="text-purple-600"/> خطة المنهج والتقدم</h2>
                <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                    <button onClick={() => setView('MAP')} className={`px-4 py-2 rounded-lg text-sm font-bold ${view === 'MAP' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}>خريطة المنهج</button>
                    <button onClick={() => setView('CONCEPTS')} className={`px-4 py-2 rounded-lg text-sm font-bold ${view === 'CONCEPTS' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}>المفاهيم</button>
                </div>
            </div>

            {view === 'MAP' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4 flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px] grid grid-cols-1 md:grid-cols-3 gap-3">
                            <select className="p-2 border rounded text-sm bg-gray-50" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}><option value="">الفصل الدراسي...</option>{terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                            <select className="p-2 border rounded text-sm" value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}><option value="">الصف...</option>{SAUDI_GRADES.map(g => <option key={g} value={g}>{g}</option>)}</select>
                            <select className="p-2 border rounded text-sm" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}><option value="">المادة...</option>{allSubjectsList.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        </div>
                        <button onClick={handleAutoGenerate} disabled={isGenerating || !selectedSubject} className="bg-teal-600 text-white px-4 py-2 rounded font-bold hover:bg-teal-700 flex items-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap">{isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>} سحب المنهج (AI)</button>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                        {filteredUnits.length > 0 ? filteredUnits.map(unit => {
                            const unitLessons = lessons.filter(l => l.unitId === unit.id).sort((a,b) => a.orderIndex - b.orderIndex);
                            const isExpanded = expandedUnits.has(unit.id);
                            const completedCount = unitLessons.filter(l => l.isCompleted).length;
                            const progressPct = unitLessons.length > 0 ? Math.round((completedCount / unitLessons.length) * 100) : 0;

                            return (
                                <div key={unit.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleUnit(unit.id)}>
                                        <div className="flex items-center gap-3 flex-1">
                                            {isExpanded ? <ChevronDown size={18} className="text-gray-500"/> : <ChevronRight size={18} className="text-gray-500"/>}
                                            <span className="font-bold text-gray-800">{unit.title}</span>
                                            <div className="hidden md:flex flex-1 items-center gap-2 max-w-xs">
                                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div className="bg-teal-500 h-full" style={{width: `${progressPct}%`}}></div>
                                                </div>
                                                <span className="text-[10px] font-bold text-teal-600">{progressPct}%</span>
                                            </div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteCurriculumUnit(unit.id); refreshData(); }} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                    </div>
                                    {isExpanded && (
                                        <div className="p-0 bg-white border-t border-gray-100 animate-slide-up">
                                            {unitLessons.map(lesson => (
                                                <div key={lesson.id} className={`flex items-center p-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 gap-4 group ${lesson.isCompleted ? 'bg-green-50/20' : ''}`}>
                                                    <button 
                                                        onClick={() => handleToggleCompletion(lesson.id, !!lesson.isCompleted)}
                                                        className={`transition-colors ${lesson.isCompleted ? 'text-green-600' : 'text-gray-300 hover:text-green-500'}`}
                                                    >
                                                        {lesson.isCompleted ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                                                    </button>
                                                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                        <span className={`text-sm font-medium ${lesson.isCompleted ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{lesson.title}</span>
                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => navigate('/planning', { state: { topic: lesson.title, subject: unit.subject, grade: unit.gradeLevel } })} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold border border-indigo-100 hover:bg-indigo-100"><PenTool size={10} className="inline ml-1"/> تحضير</button>
                                                            <button onClick={() => deleteCurriculumLesson(lesson.id)} className="text-red-400 p-1 rounded hover:bg-red-50"><Trash2 size={14}/></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={() => { const t = prompt('اسم الدرس:'); if(t) saveCurriculumLesson({id:Date.now().toString(), unitId:unit.id, title:t, orderIndex:unitLessons.length, learningStandards:[], microConceptIds:[]}); refreshData(); }} className="w-full py-2 text-gray-400 hover:text-purple-600 text-xs font-bold border-t border-dashed">إضافة درس</button>
                                        </div>
                                    )}
                                </div>
                            );
                        }) : <div className="text-center py-20 text-gray-400">حدد المادة والصف لسحب أو إنشاء المنهج</div>}
                    </div>
                </div>
            )}
            
            {view === 'CONCEPTS' && (
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-lg text-gray-800 mb-4">المفاهيم التعليمية</h3>
                    <div className="flex gap-2 mb-6">
                        <input id="conceptInput" className="flex-1 p-2 border rounded-lg" placeholder="مفهوم جديد..."/>
                        <button onClick={() => { const input = document.getElementById('conceptInput') as HTMLInputElement; if(input.value) saveMicroConcept({id:Date.now().toString(), name:input.value, teacherId:currentUser.id}); input.value=''; refreshData(); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold">إضافة</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {concepts.map(c => (
                            <div key={c.id} className="p-3 border rounded-lg bg-gray-50 flex justify-between items-center group">
                                <span className="text-sm font-bold text-gray-700">{c.name}</span>
                                <button onClick={() => { deleteMicroConcept(c.id); refreshData(); }} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurriculumManager;
