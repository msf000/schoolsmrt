import React, { useState, useEffect, useMemo } from 'react';
import { CurriculumUnit, CurriculumLesson, MicroConcept, SystemUser, Subject } from '../types';
import { 
    getCurriculumUnits, saveCurriculumUnit, deleteCurriculumUnit,
    getCurriculumLessons, saveCurriculumLesson, deleteCurriculumLesson,
    getMicroConcepts, saveMicroConcept, deleteMicroConcept,
    getSubjects
} from '../services/storageService';
import { BookOpen, FolderPlus, FilePlus, Trash2, Edit2, ChevronDown, ChevronRight, Hash, Tag, BrainCircuit, Plus, List } from 'lucide-react';

interface CurriculumManagerProps {
    currentUser: SystemUser;
}

const CurriculumManager: React.FC<CurriculumManagerProps> = ({ currentUser }) => {
    const [view, setView] = useState<'MAP' | 'CONCEPTS'>('MAP');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedGrade, setSelectedGrade] = useState('');

    // Data State
    const [units, setUnits] = useState<CurriculumUnit[]>([]);
    const [lessons, setLessons] = useState<CurriculumLesson[]>([]);
    const [concepts, setConcepts] = useState<MicroConcept[]>([]);

    // Form States
    const [newUnitName, setNewUnitName] = useState('');
    const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
    const [editingLesson, setEditingLesson] = useState<Partial<CurriculumLesson> | null>(null);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

    useEffect(() => {
        setSubjects(getSubjects(currentUser.id));
        refreshData();
    }, [currentUser]);

    const refreshData = () => {
        setUnits(getCurriculumUnits(currentUser.id));
        setLessons(getCurriculumLessons()); // Gets all, filter by unit later
        setConcepts(getMicroConcepts(currentUser.id));
    };

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
                            <label className="block text-xs font-bold text-gray-500 mb-1">المادة</label>
                            <select className="p-2 border rounded text-sm min-w-[150px]" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                                <option value="">-- اختر المادة --</option>
                                {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">الصف</label>
                            <input className="p-2 border rounded text-sm w-32" placeholder="مثال: خامس" value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}/>
                        </div>
                        <div className="flex-1 flex gap-2">
                            <input className="flex-1 p-2 border rounded text-sm" placeholder="اسم الوحدة الجديدة..." value={newUnitName} onChange={e => setNewUnitName(e.target.value)}/>
                            <button onClick={handleAddUnit} className="bg-purple-600 text-white px-4 py-2 rounded font-bold hover:bg-purple-700 flex items-center gap-2">
                                <FolderPlus size={16}/> إضافة وحدة
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
                                        <div className="p-3 bg-white space-y-2 border-t border-gray-100 animate-slide-up">
                                            {unitLessons.map(lesson => (
                                                <div key={lesson.id} className="flex items-center justify-between p-2 rounded hover:bg-purple-50 group border border-transparent hover:border-purple-100 ml-6">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2 font-medium text-gray-700">
                                                            <FilePlus size={16} className="text-gray-400"/>
                                                            {lesson.title}
                                                        </div>
                                                        {(lesson.learningStandards?.length > 0 || lesson.microConceptIds?.length > 0) && (
                                                            <div className="flex gap-2 mt-1 mr-6">
                                                                {lesson.learningStandards?.map((std, i) => <span key={i} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 rounded border border-blue-100">{std}</span>)}
                                                                {lesson.microConceptIds?.length && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 rounded border border-green-100">{lesson.microConceptIds.length} مفاهيم</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setEditingLesson(lesson); setIsLessonModalOpen(true); }} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 size={14}/></button>
                                                        <button onClick={() => handleDeleteLesson(lesson.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14}/></button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button onClick={() => openAddLesson(unit.id)} className="w-full py-2 border-2 border-dashed border-gray-200 rounded text-gray-400 hover:border-purple-300 hover:text-purple-600 text-sm font-bold flex justify-center items-center gap-2 mt-2">
                                                <Plus size={16}/> إضافة درس جديد
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <div className="text-center py-20 text-gray-400">
                                <BookOpen size={48} className="mx-auto mb-4 opacity-20"/>
                                <p>ابدأ بإضافة وحدة دراسية لتنظيم المنهج.</p>
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
                                    placeholder="MATH.1.2, MATH.1.3" 
                                    value={editingLesson.learningStandards?.join(', ')} 
                                    onChange={e => setEditingLesson({...editingLesson, learningStandards: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1 flex items-center gap-1"><BrainCircuit size={14}/> المفاهيم الدقيقة</label>
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