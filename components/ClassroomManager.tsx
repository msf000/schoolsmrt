
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, SystemUser, PerformanceRecord, EnvironmentRecord, TeacherAssignment } from '../types';
import { 
    MonitorPlay, Maximize, Clock, Eye, Plus, BrainCircuit, Loader2, Save, RotateCcw, AlertCircle, Wind, Sun, Volume2, History, LayoutGrid, Users, Shuffle, User, Info, MoreHorizontal, MousePointer2
} from 'lucide-react';
import { getTeacherAssignments, updateStudent, getEnvironmentRecords } from '../services/storageService';
import { suggestSeatingPlan } from '../services/geminiService';
import { generateLocalSeatingPlan, generateVarkBalancedGroups } from '../services/analysisService';
import { useNavigate } from 'react-router-dom';
import InteractiveSeatMap from './InteractiveSeatMap';

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
    const [activeTab, setActiveTab] = useState<'TOOLS' | 'SEATING' | 'ENVIRONMENT' | 'GROUPS'>('SEATING');
    const [selectedClass, setSelectedClass] = useState('');
    const [isArranging, setIsArranging] = useState(false);
    const [arrangeMethod, setArrangeMethod] = useState<'AI' | 'LOCAL'>('LOCAL');
    const [aiCriterion, setAiCriterion] = useState('مزج المستويات (متفوق بجانب ضعيف)');
    const [envHistory, setEnvHistory] = useState<EnvironmentRecord[]>([]);
    
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
            setEnvHistory(getEnvironmentRecords(selectedClass));
        }
    }, [uniqueClasses, selectedClass, activeTab]);

    const filteredStudents = useMemo(() => 
        students.filter(s => s.className === selectedClass).sort((a,b) => (a.seatIndex || 0) - (b.seatIndex || 0)),
    [students, selectedClass]);

    const handleGenerateGroups = () => {
        if (filteredStudents.length === 0) return;
        const groups = generateVarkBalancedGroups(filteredStudents, groupSize);
        setGeneratedGroups(groups);
        setActiveTab('GROUPS');
    };

    const handleArrange = async (method: 'AI' | 'LOCAL') => {
        if (filteredStudents.length === 0) return;
        setArrangeMethod(method);
        setIsArranging(true);
        try {
            const studentStats = filteredStudents.map(s => {
                const sPerf = performance.filter(p => p.studentId === s.id);
                const avg = sPerf.length > 0 ? sPerf.reduce((a,b)=>a+(b.score/b.maxScore),0)/sPerf.length*100 : 0;
                return { ...s, stats: { gradeAvg: avg } };
            });
            let result = method === 'AI' ? await suggestSeatingPlan(studentStats, aiCriterion) : generateLocalSeatingPlan(studentStats, aiCriterion);
            if (result && result.seating) {
                result.seating.forEach((item: any) => {
                    const s = students.find(x => x.id === item.studentId);
                    if (s) updateStudent({ ...s, seatIndex: (item.row * 10) + item.col });
                });
                alert('تم التوزيع بنجاح');
            }
        } catch (e) { alert('فشل التوزيع.'); } finally { setIsArranging(false); }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden font-tajawal">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2"><MonitorPlay className="text-indigo-600"/> إدارة وتوجيه الفصل</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 border rounded-xl bg-white font-black text-sm outline-none shadow-sm min-w-[150px]">{uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <div className="bg-white p-1 rounded-xl border flex gap-1 shadow-sm">
                        <TabItem label="المقاعد" active={activeTab === 'SEATING'} onClick={() => setActiveTab('SEATING')} />
                        <TabItem label="المجموعات" active={activeTab === 'GROUPS'} onClick={() => setActiveTab('GROUPS')} />
                        <TabItem label="الأدوات" active={activeTab === 'TOOLS'} onClick={() => setActiveTab('TOOLS')} />
                        <TabItem label="البيئة" active={activeTab === 'ENVIRONMENT'} onClick={() => setActiveTab('ENVIRONMENT')} />
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-[3rem] border shadow-sm overflow-hidden flex flex-col relative">
                {activeTab === 'TOOLS' && (
                    <div className="h-full flex flex-col items-center justify-center p-10 text-center gap-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
                             <ToolCard icon={Users} title="مجموعات متوازنة" desc="تقسيم المجموعات بناءً على تنوع الأنماط (VARK) لزيادة فاعلية التعلم النشط." color="bg-indigo-50" textColor="text-indigo-600">
                                 <div className="flex items-center gap-3 mb-4">
                                     <span className="text-xs font-bold">حجم المجموعة:</span>
                                     <input type="number" value={groupSize} onChange={e=>setGroupSize(Number(e.target.value))} className="w-16 p-2 border rounded-xl text-center font-black"/>
                                 </div>
                                 <button onClick={handleGenerateGroups} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">توليد المجموعات</button>
                             </ToolCard>
                             <ToolCard icon={MonitorPlay} title="شاشة العرض" desc="تفعيل السبورة الرقمية، مؤقت الأنشطة، وسحب الأسماء التفاعلي للطلاب." color="bg-purple-50" textColor="text-purple-600">
                                 <button onClick={onLaunchScreen} className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black shadow-lg hover:bg-purple-700 transition-all mt-6">فتح الشاشة الآن</button>
                             </ToolCard>
                         </div>
                    </div>
                )}

                {activeTab === 'SEATING' && currentUser && (
                    <InteractiveSeatMap students={students} selectedClass={selectedClass} currentUser={currentUser} />
                )}

                {activeTab === 'GROUPS' && (
                    <div className="h-full flex flex-col p-8 overflow-y-auto custom-scrollbar bg-slate-50/50">
                        <div className="flex justify-between items-center mb-8 border-b pb-4">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Users className="text-indigo-600"/> مجموعات التعلم المتوازنة (AI Optimized)</h3>
                            <button onClick={handleGenerateGroups} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"><Shuffle size={14}/> إعادة خلط المجموعات</button>
                        </div>
                        {generatedGroups.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {generatedGroups.map((group, idx) => (
                                    <div key={idx} className="bg-white border rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-2 h-full bg-indigo-600"></div>
                                        <h4 className="font-black text-indigo-900 mb-6 text-lg flex items-center justify-between">
                                            المجموعة {idx+1}
                                            <span className="text-[10px] bg-indigo-50 px-3 py-1 rounded-full">{group.length} طلاب</span>
                                        </h4>
                                        <div className="space-y-4">
                                            {group.map(s => (
                                                <div key={s.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                                                    <span className="text-xs font-black text-slate-700">{s.name}</span>
                                                    <span className="text-xs">{s.learningStyle === 'VISUAL' ? '👁️' : s.learningStyle === 'AUDITORY' ? '👂' : s.learningStyle === 'READ_WRITE' ? '📖' : s.learningStyle === 'KINESTHETIC' ? '🏃' : '؟'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                                <Users size={100} className="mx-auto"/>
                                <p className="text-xl font-black">اضغط لتوليد مجموعات متوازنة تعليمياً</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const TabItem = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${active ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>{label}</button>
);

const ToolCard = ({ icon: Icon, title, desc, color, textColor, children }: any) => (
    <div className={`${color} p-10 rounded-[3rem] border border-transparent hover:border-white shadow-sm flex flex-col items-center text-center gap-4 transition-all hover:shadow-xl`}>
        <div className={`p-5 bg-white rounded-[2rem] shadow-xl ${textColor}`}><Icon size={40}/></div>
        <h3 className={`text-xl font-black ${textColor}`}>{title}</h3>
        <p className="text-sm text-slate-500 font-bold leading-relaxed mb-4">{desc}</p>
        <div className="w-full">{children}</div>
    </div>
);

export default ClassroomManager;
