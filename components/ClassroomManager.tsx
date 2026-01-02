
import React, { useState, useMemo, useEffect } from 'react';
import { Student, AttendanceRecord, SystemUser, PerformanceRecord, EnvironmentRecord, TeacherAssignment, Assignment } from '../types';
import { getTeacherAssignments, updateStudent, getEnvironmentRecords, getAssignments } from '../services/storageService';
import { suggestSeatingPlan } from '../services/geminiService';
import { generateLocalSeatingPlan, generateVarkBalancedGroups } from '../services/analysisService';
import { useNavigate } from 'react-router-dom';
import InteractiveSeatMap from './InteractiveSeatMap';
import ClassMasteryHeatmap from './ClassMasteryHeatmap';
import { 
    MonitorPlay, Maximize, Clock, Eye, Plus, BrainCircuit, Loader2, Save, RotateCcw, 
    AlertCircle, Wind, Sun, Volume2, History, LayoutGrid, Users, Shuffle, User, Info, 
    MoreHorizontal, MousePointer2, Grid3X3, Target, GraduationCap, ChevronLeft, ShieldCheck, Zap
} from 'lucide-react';

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
    currentUser,
    performance = []
}) => {
    const [activeTab, setActiveTab] = useState<'SEATING' | 'HEATMAP' | 'GROUPS' | 'TOOLS'>('SEATING');
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
        <div className="space-y-8 animate-fade-in font-tajawal pb-16 h-full flex flex-col">
            {/* Control Header */}
            <div className="bg-white p-8 rounded-[3rem] border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-full bg-slate-900/5 -skew-x-12 translate-x-16"></div>
                <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200">
                        <MonitorPlay size={32} />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-800">مركز التوجيه الصفي</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Classroom Command & Control</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1.5 rounded-2xl border relative z-10">
                    <NavTab label="خارطة المقاعد" icon={LayoutGrid} active={activeTab==='SEATING'} onClick={()=>setActiveTab('SEATING')} />
                    <NavTab label="التمكن المعرفي" icon={Target} active={activeTab==='HEATMAP'} onClick={()=>setActiveTab('HEATMAP')} />
                    <NavTab label="المجموعات" icon={Users} active={activeTab==='GROUPS'} onClick={()=>setActiveTab('GROUPS')} />
                    <NavTab label="الأدوات" icon={Zap} active={activeTab==='TOOLS'} onClick={()=>setActiveTab('TOOLS')} />
                </div>
                
                <div className="flex items-center gap-4 relative z-10">
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-3 border rounded-2xl bg-white font-black text-xs outline-none shadow-sm">
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={onLaunchScreen} className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs flex items-center gap-3 shadow-xl hover:bg-blue-700 transition-all group">
                        <Maximize size={18} className="group-hover:scale-110 transition-transform"/> شاشة العرض
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-[4rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-slide-up">
                {activeTab === 'SEATING' && currentUser && (
                    <InteractiveSeatMap students={students} selectedClass={selectedClass} currentUser={currentUser} />
                )}

                {activeTab === 'HEATMAP' && (
                    <ClassMasteryHeatmap selectedClass={selectedClass} students={students} performance={performance} assignments={assignments} />
                )}

                {activeTab === 'GROUPS' && (
                    <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50 flex flex-col gap-8 custom-scrollbar">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3"><Users className="text-blue-600"/> تقسيم المجموعات الذكي</h3>
                            <button onClick={handleGenerateGroups} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"><Shuffle size={18}/> إعادة خلط المجموعات</button>
                        </div>
                        {generatedGroups.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {generatedGroups.map((group, idx) => (
                                    <div key={idx} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm relative group overflow-hidden hover:shadow-xl transition-all">
                                        <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                                        <h4 className="font-black text-slate-800 mb-6 flex justify-between items-center">
                                            المجموعة {idx+1}
                                            <span className="text-[10px] font-black text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full">{group.length} طلاب</span>
                                        </h4>
                                        <div className="space-y-2">
                                            {group.map(s => (
                                                <div key={s.id} className="text-xs font-bold text-slate-600 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors">
                                                    <span>{s.name.split(' ')[0]} {s.name.split(' ')[1]}</span>
                                                    <span className="text-[9px] font-black text-indigo-400 bg-white px-2 py-0.5 rounded-lg shadow-sm border border-slate-100">{s.learningStyle?.charAt(0)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-200 py-32 opacity-40">
                                <Shuffle size={120} strokeWidth={1}/>
                                <p className="mt-8 font-black text-3xl">اضغط لتوليد مجموعات متوازنة (VARK)</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'TOOLS' && (
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-12 overflow-y-auto custom-scrollbar">
                        <PremiumToolCard icon={Clock} title="مؤقت الأنشطة" desc="تنظيم زمن الحصة والتمارين مع تنبيهات صوتية." color="indigo" />
                        <PremiumToolCard icon={Shuffle} title="عجلة الحظ" desc="اختيار طالب عشوائي للمشاركة بأسلوب تفاعلي." color="amber" />
                        <PremiumToolCard icon={Zap} title="التحفيز المباشر" desc="منح نقاط XP فورية للطلاب المتفاعلين." color="emerald" />
                        <PremiumToolCard icon={ShieldCheck} title="تثبيت الانضباط" desc="رصد السلوكيات والهدوء في القاعة." color="rose" />
                    </div>
                )}
            </div>
        </div>
    );
};

const NavTab = ({ label, icon: Icon, active, onClick }: any) => (
    <button onClick={onClick} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${active ? 'bg-white text-slate-900 shadow-md border border-slate-100' : 'text-slate-500 hover:text-slate-800'}`}>
        <Icon size={16}/> {label}
    </button>
);

const PremiumToolCard = ({ icon: Icon, title, desc, color }: any) => {
    const colors: any = {
        indigo: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        amber: 'text-amber-600 bg-amber-50 border-amber-100',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        rose: 'text-rose-600 bg-rose-50 border-rose-100'
    };
    return (
        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all flex items-start gap-8 group">
            <div className={`p-5 rounded-3xl ${colors[color]} group-hover:scale-110 transition-transform shadow-inner`}>
                <Icon size={32}/>
            </div>
            <div className="flex-1 text-right">
                <h4 className="text-xl font-black text-slate-800 mb-2">{title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">{desc}</p>
            </div>
        </div>
    );
};

export default ClassroomManager;
