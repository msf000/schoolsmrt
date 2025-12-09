
import React, { useState, useEffect, useMemo } from 'react';
import { CurriculumUnit, CurriculumLesson, MicroConcept, SystemUser, Subject } from '../types';
import { 
    getCurriculumUnits, saveCurriculumUnit, deleteCurriculumUnit,
    getCurriculumLessons, saveCurriculumLesson, deleteCurriculumLesson,
    getMicroConcepts, saveMicroConcept, deleteMicroConcept,
    getSubjects
} from '../services/storageService';
import { generateCurriculumMap } from '../services/geminiService';
import { BookOpen, FolderPlus, FilePlus, Trash2, Edit2, ChevronDown, ChevronRight, Hash, Tag, BrainCircuit, Plus, List, Sparkles, Loader2, RefreshCw } from 'lucide-react';

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
    "الدراسات الإسلامية", "القرآن الكريم", "لغتي (اللغة العربية)", "الرياضيات", "العلوم", "اللغة الإنجليزية (We Can / Super Goal / Mega Goal)",
    "الدراسات الاجتماعية", "المهارات الرقمية", "التربية الفنية", "التربية البدنية والدفاع عن النفس",
    "التفكير الناقد", "أحياء", "فيزياء", "كيمياء", "علم البيئة",
    "المهارات الحياتية والأسرية", "اللياقة والثقافة الصحية",
    "الإدارة المالية", "البحث ومصادر المعلومات"
];

interface CurriculumManagerProps {
    currentUser: SystemUser;
}

const CurriculumManager: React.FC<CurriculumManagerProps> = ({ currentUser }) => {
    const [view, setView] = useState<'MAP' | 'CONCEPTS'>('MAP');
    const [userSubjects, setUserSubjects] = useState<Subject[]>([]);
    
    // Selection State
    const [selectedSemester, setSelectedSemester] = useState('الفصل الدراسي الأول');
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    // Data State
    const [units, setUnits] = useState<CurriculumUnit[]>([]);
    const [lessons, setLessons] = useState<CurriculumLesson[]>([]);
    const [concepts, setConcepts] = useState<MicroConcept[]>([]);

    // Form States
    const [newUnitName, setNewUnitName] = useState('');
    const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
    const [editingLesson, setEditingLesson] = useState<Partial<CurriculumLesson> | null>(null);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    
    // AI Generation State
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (currentUser?.id) {
            setUserSubjects(getSubjects(currentUser.id));
            refreshData();
        }
    }, [currentUser]);

    const refreshData = () => {
        if (!currentUser?.id) return;
        setUnits(getCurriculumUnits(currentUser.id));
        setLessons(getCurriculumLessons()); // Lessons are global or filtered later
        setConcepts(getMicroConcepts(currentUser.id));
    };

    // Combine standard subjects with user custom subjects
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
        const unit: CurriculumUnit = {
            id: Date.now().toString(),
            teacherId: currentUser.id,
            subject: selectedSubject,
            gradeLevel: selectedGrade || 'عام',
            title: newUnitName,
            orderIndex: units.length
        };
        saveCurriculumUnit(unit);
        setNewUnitName('');
        refreshData();
    };

    const handleDeleteUnit = (id: string) => {
        if (confirm('حذف الوحدة؟ سيتم حذف جميع الدروس داخلها.')) {
            deleteCurriculumUnit(id);
            // Also delete lessons
            const unitLessons = lessons.filter(l => l.unitId === id);
            unitLessons.forEach(l => deleteCurriculumLesson(l.id));
            refreshData();
        }
    };

    const toggleUnit = (id: string) => {
        const newSet = new Set(expandedUnits);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedUnits(newSet);
    };

    const openAddLesson = (unitId: string) => {
        setEditingLesson({ unitId, title: '', orderIndex: lessons.filter(l => l.unitId === unitId).length, learningStandards: [], microConceptIds: [] });
        setIsLessonModalOpen(true);
    };

    const handleSaveLesson = () => {
        if (!editingLesson?.title || !editingLesson.unitId) return;
        
        const lesson: CurriculumLesson = {
            id: editingLesson.id || Date.now().toString(),
            unitId: editingLesson.unitId,
            title: editingLesson.title,
            orderIndex: editingLesson.orderIndex || 0,
            learningStandards: editingLesson.learningStandards || [],
            microConceptIds: editingLesson.microConceptIds || []
        };
        
        saveCurriculumLesson(lesson);
        setIsLessonModalOpen(false);
        setEditingLesson(null);
        refreshData();
    };

    const handleDeleteLesson = (id: string) => {
        if (confirm('حذف الدرس؟')) {
            deleteCurriculumLesson(id);
            refreshData();
        }
    };

    // --- AI Generation Logic ---
    const handleAutoGenerate = async () => {
        if (!selectedSubject || !selectedGrade) {
            alert('يرجى تحديد المادة والصف أولاً لتوليد المنهج.');
            return;
        }
        
        if (filteredUnits.length > 0) {
            if (!confirm('يوجد وحدات مسجلة بالفعل لهذه المادة. هل تريد الاستمرار وإضافة المزيد من الوحدات المقترحة؟')) return;
        }

        setIsGenerating(true);
        try {
            // Use geminiService
            const structure = await generateCurriculumMap(selectedSubject, selectedGrade, selectedSemester);
            
            if (Array.isArray(structure) && structure.length > 0) {
                let unitOrder = units.length;
                
                for (const unitData of structure) {
                    const unitId = `unit_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
                    
                    const unit: CurriculumUnit = {
                        id: unitId,
                        teacherId: currentUser.id,
                        subject: selectedSubject,
                        gradeLevel: selectedGrade,
                        title: unitData.unitTitle || 'وحدة جديدة',
                        orderIndex: unitOrder++
                    };
                    saveCurriculumUnit(unit);

                    if (Array.isArray(unitData.lessons)) {
                        let lessonOrder = 0;
                        for (const lesData of unitData.lessons) {
                            const lesson: CurriculumLesson = {
                                id: `les_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                                unitId: unitId,
                                title: lesData.title || 'درس جديد',
                                orderIndex: lessonOrder++,
                                learningStandards: lesData.standards || [], 
                                microConceptIds: [] 
                            };
                            saveCurriculumLesson(lesson);
                        }
                    }
                }
                refreshData();
                alert(`تم استيراد منهج ${selectedSemester} بنجاح!`);
            } else {
                alert('لم يتمكن النظام من استخراج المنهج. تأكد من اسم المادة والصف.');
            }
        } catch (e: any) {
            console.error(e);
            alert('حدث خطأ أثناء التوليد: ' + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <List className="text-purple-600"/> توزيع المنهج والذكاء
                </h2>
                <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                    <button onClick={() => setView('MAP')} className={`px-4 py-2 rounded-lg text-sm font-bold ${view === 'MAP' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}>خريطة المنهج</button>
                    <button onClick={() => setView('CONCEPTS')} className={`px-4 py-2 rounded-lg text-sm font-bold ${view === 'CONCEPTS' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}>المفاهيم الدقيقة</button>
                </div>
            </div>

            {view === 'MAP' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Controls */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4 flex flex-wrap gap-4 items-end">
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">1. الفصل الدراسي</label>
                            <select className="p-2 border rounded text-sm bg-gray-50 min-w-[140px]" value={selectedSemester} onChange={e => setSelectedSemester(e.target.value)}>
                                <option value="الفصل الدراسي الأول">الفصل الأول</option>
                                <option value="الفصل الدراسي الثاني">الفصل الثاني</option>
                                <option value="الفصل الدراسي الثالث">الفصل الثالث</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">2. الصف الدراسي</label>
                            <select className="p-2 border rounded text-sm min-w-[160px]" value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
                                <option value="">-- اختر الصف --</option>
                                {SAUDI_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">3. المادة</label>
                            <select className="p-2 border rounded text-sm min-w-[160px]" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                                <option value="">-- اختر المادة --</option>
                                {allSubjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        
                        <div className="flex-1 flex gap-2">
                            <input className="flex-1 p-2 border rounded text-sm" placeholder="اسم الوحدة الجديدة (يدوي)..." value={newUnitName} onChange={e => setNewUnitName(e.target.value)}/>
                            <button onClick={handleAddUnit} className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 flex items-center gap-2 text-sm whitespace-nowrap">
                                <FolderPlus size={16}/> إضافة
                            </button>
                        </div>
                        
                        <div className="w-full md:w-auto border-t md:border-t-0 md:border-r pr-0 md:pr-4 pt-4 md:pt-0">
                            <button 
                                onClick={handleAutoGenerate} 
                                disabled={isGenerating || !selectedSubject || !selectedGrade}
                                className="bg-gradient-to-r from-teal-500 to-green-600 text-white px-4 py-2 rounded font-bold hover:opacity-90 flex items-center gap-2 disabled:opacity-50 text-sm whitespace-nowrap shadow-md w-full justify-center"
                            >
                                {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}
                                {isGenerating ? 'جاري سحب المنهج...' : `استيراد ${selectedSemester} (AI)`}
                            </button>
                        </div>
                    </div>

                    {/* Tree View */}
                    <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                        {filteredUnits.length > 0 ? filteredUnits.map(unit => {
                            const unitLessons = lessons.filter(l => l.unitId === unit.id).sort((a,b) => a.orderIndex - b.orderIndex);
                            const isExpanded = expandedUnits.has(unit.id);
                            
                            return (
                                <div key={unit.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleUnit(unit.id)}>
                                        <div className="flex items-center gap-2">
                                            {isExpanded ? <ChevronDown size={18} className="text-gray-500"/> : <ChevronRight size={18} className="text-gray-500"/>}
                                            <FolderPlus size={18} className="text-purple-600"/>
                                            <span className="font-bold text-gray-800">{unit.title}</span>
                                            <span className="text-xs bg-white border px-2 py-0.5 rounded text-gray-500">{unitLessons.length} درس</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteUnit(unit.id); }} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="p-0 bg-white border-t border-gray-100 animate-slide-up">
                                            {unitLessons.length > 0 && (
                                                <div className="grid grid-cols-12 bg-gray-50 text-xs font-bold text-gray-500 p-2 border-b">
                                                    <div className="col-span-5 pr-8">اسم الدرس</div>
                                                    <div className="col-span-4">المعيار (Standard)</div>
                                                    <div className="col-span-3 text-center">إجراءات</div>
                                                </div>
                                            )}

                                            {unitLessons.map(lesson => (
                                                <div key={lesson.id} className="grid grid-cols-12 items-center p-2 hover:bg-purple-50 group border-b border-gray-50 last:border-0">
                                                    <div className="col-span-5 flex items-center gap-2 font-medium text-gray-700 pr-6">
                                                        <FilePlus size={16} className="text-gray-400 shrink-0"/>
                                                        <span className="truncate" title={lesson.title}>{lesson.title}</span>
                                                    </div>
                                                    
                                                    <div className="col-span-4 flex flex-wrap gap-1">
                                                        {lesson.learningStandards && lesson.learningStandards.length > 0 ? (
                                                            lesson.learningStandards.map((std, i) => (
                                                                <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-mono font-bold" title="كود المعيار الوزاري">
                                                                    {std}
                                                                </span>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-300">-</span>
                                                        )}
                                                    </div>

                                                    <div className="col-span-3 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setEditingLesson(lesson); setIsLessonModalOpen(true); }} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded"><Edit2 size={14}/></button>
                                                        <button onClick={() => handleDeleteLesson(lesson.id)} className="text-red-500 hover:bg-red-100 p-1.5 rounded"><Trash2 size={14}/></button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={() => openAddLesson(unit.id)} className="w-full py-2 text-gray-400 hover:text-purple-600 text-sm font-bold flex justify-center items-center gap-2 hover:bg-gray-50 transition-colors">
                                                <Plus size={16}/> إضافة درس جديد
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="text-center py-20 text-gray-400">
                                <BookOpen size={48} className="mx-auto mb-4 opacity-20"/>
                                <p className="text-lg font-bold">لا يوجد منهج مسجل</p>
                                <p className="text-sm">ابدأ باختيار الفصل والصف والمادة ثم اضغط على زر الاستيراد.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Lesson Modal */}
            {isLessonModalOpen && editingLesson && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <h3 className="font-bold text-lg mb-4 text-gray-800">تفاصيل الدرس</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">عنوان الدرس</label>
                                <input className="w-full p-2 border rounded" value={editingLesson.title} onChange={e => setEditingLesson({...editingLesson, title: e.target.value})} autoFocus/>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1 flex items-center gap-1"><Hash size={14}/> الكود الوزاري (المعيار) <span className="text-xs font-normal text-gray-400">(افصل بفواصل)</span></label>
                                <input 
                                    className="w-full p-2 border rounded font-mono text-sm" 
                                    placeholder="EAS.12.1.1, EAS.12.1.2" 
                                    value={editingLesson.learningStandards?.join(', ')} 
                                    onChange={e => setEditingLesson({...editingLesson, learningStandards: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1 flex items-center gap-1"><BrainCircuit size={14}/> المفاهيم الدقيقة (Micro-Concepts)</label>
                                <div className="border rounded p-2 max-h-32 overflow-y-auto bg-gray-50">
                                    {concepts.filter(c => !c.subject || c.subject === selectedSubject).map(c => (
                                        <label key={c.id} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded cursor-pointer text-sm">
                                            <input 
                                                type="checkbox" 
                                                checked={editingLesson.microConceptIds?.includes(c.id)}
                                                onChange={(e) => {
                                                    const current = editingLesson.microConceptIds || [];
                                                    if(e.target.checked) setEditingLesson({...editingLesson, microConceptIds: [...current, c.id]});
                                                    else setEditingLesson({...editingLesson, microConceptIds: current.filter(id => id !== c.id)});
                                                }}
                                            />
                                            {c.name}
                                        </label>
                                    ))}
                                    {concepts.length === 0 && <p className="text-xs text-gray-400 text-center">لا توجد مفاهيم مضافة. انتقل لتبويب المفاهيم لإضافتها.</p>}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setIsLessonModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">إلغاء</button>
                                <button onClick={handleSaveLesson} className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold">حفظ</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {view === 'CONCEPTS' && (
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800">جدول المفاهيم الدقيقة (Micro-Concepts)</h3>
                            <p className="text-sm text-gray-500">تستخدم هذه المفاهيم لتحليل الفجوات التعليمية بدقة.</p>
                        </div>
                        <button 
                            onClick={() => {
                                const name = prompt('اسم المفهوم الدقيق:');
                                if (name) {
                                    saveMicroConcept({ id: Date.now().toString(), name, teacherId: currentUser.id, subject: selectedSubject });
                                    refreshData();
                                }
                            }} 
                            className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700"
                        >
                            <Plus size={16}/> مفهوم جديد
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
                        {concepts.map(c => (
                            <div key={c.id} className="border p-3 rounded-lg flex justify-between items-center bg-gray-50 hover:border-purple-300 transition-colors">
                                <span className="font-bold text-gray-700">{c.name}</span>
                                <button onClick={() => { if(confirm('حذف؟')) { deleteMicroConcept(c.id); refreshData(); } }} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CurriculumManager;
