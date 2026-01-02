
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, SystemUser, PerformanceRecord, TeacherAssignment, Assignment } from '../types';
import { getTeacherAssignments, getAssignments } from '../services/storageService';
import { generateVarkBalancedGroups } from '../services/analysisService';
import { useNavigate } from 'react-router-dom';
import InteractiveSeatMap from './InteractiveSeatMap';
import ClassMasteryHeatmap from './ClassMasteryHeatmap';
import { 
    MonitorPlay, Maximize, Clock, Plus, BrainCircuit, Loader2, Save, 
    LayoutGrid, Users, Shuffle, Target, Zap, ChevronLeft
} from 'lucide-react';

interface ClassroomManagerProps {
  students: Student[];
  attendance: AttendanceRecord[];
  performance?: PerformanceRecord[];
  onLaunchScreen: () => void;
  onNavigateToAttendance?: () => void;
  onSaveAttendance?: (records: AttendanceRecord[]) => void;
  onImportAttendance?: (records: AttendanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ 
    students = [], 
    attendance, 
    performance = [], 
    onLaunchScreen, 
    currentUser 
}) => {
    const [activeTab, setActiveTab] = useState<'SEATING' | 'HEATMAP' | 'GROUPS'>('SEATING');
    const [selectedClass, setSelectedClass] = useState('');
    const [generatedGroups, setGeneratedGroups] = useState<Student[][]>([]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach((a: TeacherAssignment) => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUser]);

    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
    }, [uniqueClasses, selectedClass]);

    const handleGenerateGroups = () => {
        const filtered = students.filter(s => s.className === selectedClass);
        if (filtered.length === 0) return;
        setGeneratedGroups(generateVarkBalancedGroups(filtered, 4));
        setActiveTab('GROUPS');
    };

    return (
        <div className="space-y-6 page-enter font-tajawal">
            {/* SaaS Header Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-brand-500 text-white rounded-lg"><MonitorPlay size={20}/></div>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent font-bold text-slate-900 border-none outline-none cursor-pointer hover:text-brand-500">
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <button onClick={()=>setActiveTab('SEATING')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab==='SEATING'?'bg-white text-brand-600 shadow-sm border border-slate-100':'text-slate-500'}`}>المقاعد</button>
                    <button onClick={()=>setActiveTab('HEATMAP')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab==='HEATMAP'?'bg-white text-brand-600 shadow-sm border border-slate-100':'text-slate-500'}`}>الإتقان</button>
                    <button onClick={()=>setActiveTab('GROUPS')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab==='GROUPS'?'bg-white text-brand-600 shadow-sm border border-slate-100':'text-slate-500'}`}>المجموعات</button>
                </div>

                <button onClick={onLaunchScreen} className="px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-600 transition-all flex items-center gap-2">
                    <Maximize size={16}/> شاشة العرض
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                {activeTab === 'SEATING' && currentUser && (
                    <InteractiveSeatMap students={students} selectedClass={selectedClass} currentUser={currentUser} />
                )}

                {activeTab === 'HEATMAP' && (
                    <ClassMasteryHeatmap selectedClass={selectedClass} students={students} performance={performance} assignments={getAssignments('ALL', currentUser?.id)} />
                )}

                {activeTab === 'GROUPS' && (
                    <div className="p-8 space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="text-brand-500"/> تقسيم المجموعات الذكي</h3>
                            <button onClick={handleGenerateGroups} className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                                <Shuffle size={14}/> إعادة التقسيم
                            </button>
                        </div>
                        {generatedGroups.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {generatedGroups.map((group, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest border-b pb-2">المجموعة {idx+1}</h4>
                                        <div className="space-y-2">
                                            {group.map(s => (
                                                <div key={s.id} className="text-xs font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-100 flex justify-between">
                                                    <span>{s.name.split(' ')[0]}</span>
                                                    <span className="text-[8px] opacity-40">{s.learningStyle?.charAt(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <Shuffle size={48} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-slate-400 font-medium">اضغط على زر التقسيم لتوليد مجموعات متوازنة</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassroomManager;
