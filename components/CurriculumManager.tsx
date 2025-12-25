
import React, { useState, useEffect, useMemo } from 'react';
import { CurriculumUnit, CurriculumLesson, SystemUser, Subject, AcademicTerm } from '../types';
import { 
    getCurriculumUnits, saveCurriculumUnit, deleteCurriculumUnit,
    getCurriculumLessons, saveCurriculumLesson, deleteCurriculumLesson,
    getSubjects, getAcademicTerms, toggleCurriculumLesson
} from '../services/storageService';
import { generateCurriculumMap } from '../services/geminiService';
import { List, Sparkles, Loader2, CheckCircle2, Circle, Trash2, ChevronRight, ChevronDown, BookOpen, PenTool } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CurriculumManager: React.FC<{ currentUser: SystemUser }> = ({ currentUser }) => {
    const navigate = useNavigate();
    const [selectedGrade, setSelectedGrade] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTermId, setSelectedTermId] = useState('');
    const [units, setUnits] = useState<CurriculumUnit[]>([]);
    const [lessonsMap, setLessonsMap] = useState<Record<string, CurriculumLesson[]>>({});
    const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
    const [isGenerating, setIsGenerating] = useState(false);
    const [terms, setTerms] = useState<AcademicTerm[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    useEffect(() => {
        setTerms(getAcademicTerms(currentUser.id));
        setSubjects(getSubjects(currentUser.id));
        refresh();
    }, [currentUser]);

    const refresh = () => {
        const loadedUnits = getCurriculumUnits(currentUser.id);
        setUnits(loadedUnits);
        const newMap: Record<string, CurriculumLesson[]> = {};
        loadedUnits.forEach(u => {
            newMap[u.id] = getCurriculumLessons(u.id);
        });
        setLessonsMap(newMap);
    };

    const handleAutoGenerate = async () => {
        if (!selectedSubject || !selectedGrade) return alert('اختر المادة والصف');
        setIsGenerating(true);
        try {
            const termName = terms.find(t => t.id === selectedTermId)?.name || 'الفصل الأول';
            const structure = await generateCurriculumMap(selectedSubject, selectedGrade, termName);
            if (Array.isArray(structure)) {
                for (let uIdx = 0; uIdx < structure.length; uIdx++) {
                    const u = structure[uIdx];
                    const unitId = `u_${Date.now()}_${uIdx}`;
                    await saveCurriculumUnit({ id: unitId, teacherId: currentUser.id, subject: selectedSubject, gradeLevel: selectedGrade, title: u.unitTitle, orderIndex: uIdx });
                    if (u.lessons) {
                        for (let lIdx = 0; lIdx < u.lessons.length; lIdx++) {
                            const l = u.lessons[lIdx];
                            await saveCurriculumLesson({ id: `l_${Date.now()}_${lIdx}`, unitId, title: l.title, orderIndex: lIdx, learningStandards: [], microConceptIds: [] });
                        }
                    }
                }
                refresh();
            }
        } catch (e) { alert('فشل التوليد'); } finally { setIsGenerating(false); }
    };

    const toggleUnit = (id: string) => {
        const newSet = new Set(expandedUnits);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setExpandedUnits(newSet);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="mb-6 flex justify-between items-center">
                <div><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><List className="text-purple-600"/> توزيع المنهج والتقدم</h2><p className="text-sm text-gray-500">خطط لمنهجك الدراسي وتابع ما تم إنجازه.</p></div>
                <button onClick={handleAutoGenerate} disabled={isGenerating || !selectedSubject} className="bg-teal-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-md hover:bg-teal-700 disabled:opacity-50">
                    {isGenerating ? <Loader2 className="animate-spin"/> : <Sparkles/>} {isGenerating ? 'جاري التحميل...' : 'سحب المنهج السعودي (AI)'}
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border mb-6 flex flex-wrap gap-4 items-end shadow-sm">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select className="p-2 border rounded-lg text-sm bg-gray-50" value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)}><option value="">-- الفصل الدراسي --</option>{terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                    <select className="p-2 border rounded-lg text-sm bg-gray-50" value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}><option value="">-- الصف --</option>{['الأول','الثاني','الثالث','الرابع','الخامس','السادس'].map(g => <option key={g} value={g}>{g}</option>)}</select>
                    <select className="p-2 border rounded-lg text-sm bg-gray-50" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}><option value="">-- المادة --</option>{subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
                {units.filter(u => (!selectedSubject || u.subject === selectedSubject)).map(unit => {
                    const unitLessons = lessonsMap[unit.id] || [];
                    const isExpanded = expandedUnits.has(unit.id);
                    const pct = unitLessons.length ? Math.round((unitLessons.filter(l => l.isCompleted).length / unitLessons.length) * 100) : 0;

                    return (
                        <div key={unit.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                            <div className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer" onClick={() => toggleUnit(unit.id)}>
                                <div className="flex items-center gap-3 flex-1">
                                    {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                    <h3 className="font-bold text-gray-800">{unit.title}</h3>
                                    <div className="hidden md:flex flex-1 items-center gap-2 max-w-xs ml-4">
                                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="bg-teal-500 h-full" style={{width: `${pct}%`}}></div></div>
                                        <span className="text-[10px] font-bold text-teal-600">{pct}%</span>
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); deleteCurriculumUnit(unit.id, currentUser.id); refresh(); }} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
                            </div>
                            {isExpanded && (
                                <div className="divide-y animate-slide-up">
                                    {unitLessons.map(l => (
                                        <div key={l.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                            <button onClick={() => { toggleCurriculumLesson(l.id, !l.isCompleted, unit.id); refresh(); }}>
                                                {l.isCompleted ? <CheckCircle2 className="text-green-500"/> : <Circle className="text-gray-300"/>}
                                            </button>
                                            <div className="flex-1 font-medium text-gray-700">{l.title}</div>
                                            <button onClick={() => navigate('/planning', { state: { subject: unit.subject, topic: l.title, grade: unit.gradeLevel } })} className="text-[10px] bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 font-bold flex items-center gap-1 hover:bg-indigo-100"><PenTool size={12}/> تحضير</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CurriculumManager;
