
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, SystemUser, PerformanceRecord, EnvironmentRecord, TeacherAssignment, Assignment } from '../types';
import { getTeacherAssignments, updateStudent, getEnvironmentRecords, getAssignments } from '../services/storageService';
import { suggestSeatingPlan } from '../services/geminiService';
import { generateLocalSeatingPlan, generateVarkBalancedGroups } from '../services/analysisService';
import { useNavigate } from 'react-router-dom';
import InteractiveSeatMap from './InteractiveSeatMap';
import ClassMasteryHeatmap from './ClassMasteryHeatmap';
import { MonitorPlay, Maximize, Clock, Eye, Plus, BrainCircuit, Loader2, Save, RotateCcw, AlertCircle, Wind, Sun, Volume2, History, LayoutGrid, Users, Shuffle, User, Info, MoreHorizontal, MousePointer2, Grid3X3, Target, GraduationCap } from 'lucide-react';

interface ClassroomManagerProps {
    students: Student[];
    attendance: AttendanceRecord[];
    performance?: PerformanceRecord[];
    onLaunchScreen: () => void;
    onNavigateToAttendance: () => void;
    onSaveAttendance: (records: AttendanceRecord[]) => void;
    onImportAttendance: (records: AttendanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ 
    students = [], 
    onLaunchScreen, 
    onNavigateToAttendance,
    currentUser,
    performance = []
}) => {
    const [activeTab, setActiveTab] = useState<'TOOLS' | 'SEATING' | 'ENVIRONMENT' | 'GROUPS' | 'HEATMAP'>('SEATING');
    const [selectedClass, setSelectedClass] = useState('');
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [groupSize, setGroupSize] = useState(4);
    const [generatedGroups, setGeneratedGroups] = useState<Student[][]>([]);

    const navigate = useNavigate();

    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach((a: TeacherAssignment) => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUser]);

    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
        if (selectedClass) {
            setAssignments(getAssignments('ALL', currentUser?.id));
        }
    }, [uniqueClasses, selectedClass, activeTab, currentUser]);

    const filteredStudents = useMemo(() => 
        students.filter(s => s.className === selectedClass).sort((a,b) => (a.seatIndex || 0) - (b.seatIndex || 0)),
    [students, selectedClass]);

    const handleGenerateGroups = () => {
        if (filteredStudents.length === 0) return;
        const groups = generateVarkBalancedGroups(filteredStudents, groupSize);
        setGeneratedGroups(groups);
        setActiveTab('GROUPS');
    };

    return (
        <div className="p-4 md:p-6 h-full flex flex-col bg-slate-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <MonitorPlay size={24}/>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">إدارة وتوجيه الفصل</h2>
                        <p className="text-xs text-slate-500 font-medium">أدوات تنظيم البيئة الصفية التفاعلية</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select 
                        value={selectedClass} 
                        onChange={e => setSelectedClass(e.target.value)} 
                        className="p-2 border border-slate-200 rounded-lg bg-white font-bold text-xs outline-none shadow-sm min-w-[120px]"
                    >
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="bg-white p-1 rounded-lg border border-slate-200 flex gap-1 shadow-sm overflow-x-auto no-scrollbar">
                        <TabItem label="المقاعد" active={activeTab === 'SEATING'} onClick={() => setActiveTab('SEATING')} />
                        <TabItem label="خريطة الإتقان" active={activeTab === 'HEATMAP'} onClick={() => setActiveTab('HEATMAP')} />
                        <TabItem label="المجموعات" active={activeTab === 'GROUPS'} onClick={() => setActiveTab('GROUPS')} />
                        <TabItem label="الأدوات" active={activeTab === 'TOOLS'} onClick={() => setActiveTab('TOOLS')} />
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col relative">
                {activeTab === 'HEATMAP' && (
                    <ClassMasteryHeatmap selectedClass={selectedClass} students={students} performance={performance} assignments={assignments} />
                )}

                {activeTab === 'TOOLS' && (
                    <div className="h-full grid grid-cols-1 md:grid-cols-2 gap-6 p-8 overflow-y-auto">
                        <ToolCard icon={Users} title="مجموعات التعلم النشط" desc="تقسيم ذكي للطلاب بناءً على تنوع الأنماط (VARK) لضمان تفاعل جماعي فعال." color="bg-blue-50" textColor="text-blue-700">
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-xs font-bold text-slate-500">حجم المجموعة:</span>
                                <input type="number" value={groupSize} onChange={e=>setGroupSize(Number(e.target.value))} className="w-16 p-1.5 border rounded-lg text-center font-bold text-sm"/>
                            </div>
                            <button onClick={handleGenerateGroups} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-blue-700">توليد المجموعات</button>
                        </ToolCard>
                        <ToolCard icon={MonitorPlay} title="شاشة الفصل الذكية" desc="عرض السبورة الرقمية، مؤقت الأنشطة، وعجلة الأسماء التفاعلية على شاشة البروجكتر." color="bg-slate-50" textColor="text-slate-700">
                            <button onClick={onLaunchScreen} className="w-full py-2.5 bg-slate-800 text-white rounded-lg font-bold text-xs shadow-sm hover:bg-black mt-10">إطلاق شاشة العرض</button>
                        </ToolCard>
                    </div>
                )}

                {activeTab === 'SEATING' && currentUser && (
                    <InteractiveSeatMap students={students} selectedClass={selectedClass} currentUser={currentUser} />
                )}

                {activeTab === 'GROUPS' && (
                    <div className="h-full flex flex-col p-6 overflow-y-auto custom-scrollbar bg-slate-50/30">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2"><Users size={18} className="text-blue-600"/> المجموعات المتوازنة</h3>
                            <button onClick={handleGenerateGroups} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 flex items-center gap-2"><Shuffle size={14}/> إعادة الخلط</button>
                        </div>
                        {generatedGroups.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {generatedGroups.map((group, idx) => (
                                    <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                                        <h4 className="font-bold text-slate-800 mb-3 flex justify-between text-sm">
                                            المجموعة {idx+1}
                                            <span className="text-[10px] text-slate-400 font-medium">{group.length} طلاب</span>
                                        </h4>
                                        <div className="space-y-1">
                                            {group.map(s => (
                                                <div key={s.id} className="text-xs font-medium text-slate-600 p-1.5 rounded bg-slate-50 border border-slate-100 flex justify-between">
                                                    <span>{s.name}</span>
                                                    <span className="text-[9px] opacity-40">{s.learningStyle?.charAt(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50 py-20">
                                <Users size={64}/>
                                <p className="font-bold">يرجى الضغط على "توليد المجموعات" من تبويب الأدوات</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const TabItem = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-1.5 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{label}</button>
);

const ToolCard = ({ icon: Icon, title, desc, color, textColor, children }: any) => (
    <div className={`${color} p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 hover:border-blue-300 transition-all`}>
        <div className="flex items-center gap-4">
            <div className={`p-3 bg-white rounded-lg shadow-sm ${textColor}`}><Icon size={24}/></div>
            <h3 className={`text-base font-bold ${textColor}`}>{title}</h3>
        </div>
        <p className="text-xs text-slate-500 font-medium leading-relaxed flex-1">{desc}</p>
        <div className="w-full pt-4 border-t border-white/40">{children}</div>
    </div>
);

export default ClassroomManager;
