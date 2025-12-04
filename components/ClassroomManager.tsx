
import React, { useState, useMemo, useEffect } from 'react';
import { Student, PerformanceRecord } from '../types';
import { MonitorPlay, Grid, LayoutGrid, CheckSquare, Maximize, Printer, RotateCcw, Save, Sparkles, Shuffle, ArrowDownUp, CheckCircle, Loader2, Clock, LogOut, FileText, StickyNote, DoorOpen, AlertCircle, BarChart2, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';

interface ClassroomManagerProps {
    students: Student[];
    performance?: PerformanceRecord[]; // New Prop
    onLaunchScreen: () => void;
    onNavigateToAttendance: () => void;
    onSaveSeating?: (students: Student[]) => void; // New prop for saving
}

interface HallPass {
    id: string;
    studentId: string;
    studentName: string;
    reason: string;
    startTime: number;
}

const ClassroomManager: React.FC<ClassroomManagerProps> = ({ students, performance = [], onLaunchScreen, onNavigateToAttendance, onSaveSeating }) => {
    const [activeTab, setActiveTab] = useState<'TOOLS' | 'SEATING'>('TOOLS');
    const [selectedClass, setSelectedClass] = useState('');

    // --- Derived State ---
    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        students.forEach(s => s.className && classes.add(s.className));
        return Array.from(classes).sort();
    }, [students]);

    useEffect(() => {
        if(uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]);
    }, [uniqueClasses]);

    const classStudents = useMemo(() => {
        return students.filter(s => s.className === selectedClass).sort((a,b) => a.name.localeCompare(b.name, 'ar'));
    }, [students, selectedClass]);

    return (
        <div className="p-6 h-full flex flex-col animate-fade-in bg-gray-50">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <LayoutGrid className="text-purple-600"/> الإدارة الصفية
                    </h2>
                    <p className="text-gray-500 mt-2">أدوات إدارة الحصة، توزيع المقاعد، وضبط السلوك.</p>
                </div>
                
                {/* Global Class Selector */}
                <div className="bg-white p-1 rounded-lg border shadow-sm flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 px-2">الفصل الحالي:</span>
                    <select 
                        value={selectedClass} 
                        onChange={e => setSelectedClass(e.target.value)}
                        className="p-1 font-bold text-primary outline-none cursor-pointer bg-transparent"
                    >
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('TOOLS')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors relative ${activeTab === 'TOOLS' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    لوحة القيادة (Dashboard)
                </button>
                <button 
                    onClick={() => setActiveTab('SEATING')}
                    className={`pb-3 px-4 font-bold text-sm transition-colors relative ${activeTab === 'SEATING' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    مخطط الجلوس (Seating Plan)
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'TOOLS' && (
                    <div className="space-y-6">
                        {/* Quick Actions Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div 
                                onClick={onLaunchScreen}
                                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white cursor-pointer hover:scale-[1.02] transition-transform shadow-lg group relative overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                                <div className="relative z-10">
                                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-3 group-hover:bg-white/20 transition-colors">
                                        <Maximize size={20} className="text-yellow-400"/>
                                    </div>
                                    <h3 className="font-bold text-lg mb-1">الشاشة التفاعلية</h3>
                                    <p className="text-gray-400 text-xs mb-3">سبورة ذكية: مؤقت، قرعة، مجموعات.</p>
                                    <span className="text-yellow-400 text-xs font-bold flex items-center gap-1">تشغيل <MonitorPlay size={12}/></span>
                                </div>
                            </div>

                            <div 
                                onClick={onNavigateToAttendance}
                                className="bg-white rounded-xl p-6 border border-gray-200 cursor-pointer hover:border-green-400 hover:shadow-md transition-all group"
                            >
                                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-100 transition-colors">
                                    <CheckSquare size={20} className="text-green-600"/>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">سجل السلوك</h3>
                                <p className="text-gray-500 text-xs mb-3">رصد سريع للمخالفات والنقاط الإيجابية.</p>
                                <span className="text-green-600 text-xs font-bold flex items-center gap-1">فتح السجل <ArrowDownUp size={12}/></span>
                            </div>

                            <div 
                                onClick={() => setActiveTab('SEATING')}
                                className="bg-white rounded-xl p-6 border border-gray-200 cursor-pointer hover:border-purple-400 hover:shadow-md transition-all group"
                            >
                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                                    <Grid size={20} className="text-purple-600"/>
                                </div>
                                <h3 className="font-bold text-lg text-gray-800 mb-1">ترتيب المقاعد</h3>
                                <p className="text-gray-500 text-xs mb-3">توزيع الطلاب وتغيير أماكنهم.</p>
                                <span className="text-purple-600 text-xs font-bold flex items-center gap-1">تعديل <ArrowDownUp size={12}/></span>
                            </div>
                        </div>

                        {/* Widgets Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* 1. Digital Hall Pass */}
                            <HallPassWidget students={classStudents} className={selectedClass} />

                            {/* 2. Traffic Light (Discipline) */}
                            <TrafficLightWidget />

                            {/* 3. Quick Poll */}
                            <QuickPollWidget />

                            {/* 4. Lesson Notes */}
                            <LessonNoteWidget className={selectedClass} />
                        </div>
                    </div>
                )}

                {activeTab === 'SEATING' && <SeatingChart students={students} performance={performance} onSaveSeating={onSaveSeating} preSelectedClass={selectedClass} />}
            </div>
        </div>
    );
};

// --- Widget: Hall Pass ---
const HallPassWidget: React.FC<{ students: Student[], className: string }> = ({ students, className }) => {
    const [passes, setPasses] = useState<HallPass[]>(() => {
        const saved = localStorage.getItem('active_hall_passes');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedStudent, setSelectedStudent] = useState('');
    
    useEffect(() => {
        localStorage.setItem('active_hall_passes', JSON.stringify(passes));
    }, [passes]);

    // Timer updater
    const [, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 1000 * 60); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const handleCheckout = (reason: string) => {
        if (!selectedStudent) return;
        const student = students.find(s => s.id === selectedStudent);
        if (!student) return;

        // Check if already out
        if (passes.find(p => p.studentId === student.id)) {
            alert('الطالب خارج الفصل بالفعل!');
            return;
        }

        const newPass: HallPass = {
            id: Date.now().toString(),
            studentId: student.id,
            studentName: student.name,
            reason,
            startTime: Date.now()
        };
        setPasses([...passes, newPass]);
        setSelectedStudent('');
    };

    const handleReturn = (id: string) => {
        setPasses(passes.filter(p => p.id !== id));
    };

    const getDuration = (start: number) => {
        const diff = Math.floor((Date.now() - start) / 60000);
        return diff < 1 ? 'الآن' : `${diff} د`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-80">
            <div className="p-4 border-b bg-orange-50 flex justify-between items-center">
                <h3 className="font-bold text-orange-800 flex items-center gap-2">
                    <DoorOpen size={18}/> تصريح الخروج (Hall Pass)
                </h3>
                <span className="bg-orange-200 text-orange-800 text-xs px-2 py-1 rounded-full font-bold">{passes.length} بالخارج</span>
            </div>
            
            <div className="p-4 bg-gray-50 border-b">
                <div className="flex gap-2 mb-2">
                    <select 
                        className="flex-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-200"
                        value={selectedStudent}
                        onChange={e => setSelectedStudent(e.target.value)}
                    >
                        <option value="">-- اختر الطالب --</option>
                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleCheckout('دورة مياه')} disabled={!selectedStudent} className="flex-1 bg-white border border-gray-200 text-gray-700 py-1.5 rounded hover:bg-blue-50 text-xs font-bold disabled:opacity-50">💧 دورة مياه</button>
                    <button onClick={() => handleCheckout('العيادة')} disabled={!selectedStudent} className="flex-1 bg-white border border-gray-200 text-gray-700 py-1.5 rounded hover:bg-red-50 text-xs font-bold disabled:opacity-50">🏥 عيادة</button>
                    <button onClick={() => handleCheckout('الإدارة')} disabled={!selectedStudent} className="flex-1 bg-white border border-gray-200 text-gray-700 py-1.5 rounded hover:bg-purple-50 text-xs font-bold disabled:opacity-50">🏢 إدارة</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {passes.length > 0 ? passes.map(pass => (
                    <div key={pass.id} className="flex items-center justify-between p-3 bg-white border border-orange-100 rounded-lg shadow-sm animate-fade-in border-r-4 border-r-orange-400">
                        <div>
                            <div className="font-bold text-gray-800 text-sm">{pass.studentName}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                <span className="bg-gray-100 px-1.5 rounded">{pass.reason}</span>
                                <span className="flex items-center gap-1 text-orange-600 font-bold"><Clock size={10}/> منذ {getDuration(pass.startTime)}</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => handleReturn(pass.id)}
                            className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition-colors"
                            title="تسجيل عودة"
                        >
                            <LogOut size={16} className="transform rotate-180"/>
                        </button>
                    </div>
                )) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                        <DoorOpen size={40} className="mb-2"/>
                        <p className="text-xs">الجميع داخل الفصل</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Widget: Traffic Light ---
const TrafficLightWidget: React.FC = () => {
    const [activeLight, setActiveLight] = useState<'RED' | 'YELLOW' | 'GREEN'>('GREEN');

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-80">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <AlertCircle size={18}/> إشارة الانضباط
                </h3>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-100">
                <div className="bg-slate-800 p-4 rounded-3xl shadow-2xl flex flex-row gap-4 items-center">
                    <button 
                        onClick={() => setActiveLight('RED')}
                        className={`w-16 h-16 rounded-full transition-all duration-300 border-4 border-slate-700 ${activeLight === 'RED' ? 'bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110' : 'bg-red-900 opacity-50'}`}
                        title="صمت تام / عمل فردي"
                    />
                    <button 
                        onClick={() => setActiveLight('YELLOW')}
                        className={`w-16 h-16 rounded-full transition-all duration-300 border-4 border-slate-700 ${activeLight === 'YELLOW' ? 'bg-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.6)] scale-110' : 'bg-yellow-900 opacity-50'}`}
                        title="همس / عمل ثنائي"
                    />
                    <button 
                        onClick={() => setActiveLight('GREEN')}
                        className={`w-16 h-16 rounded-full transition-all duration-300 border-4 border-slate-700 ${activeLight === 'GREEN' ? 'bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.6)] scale-110' : 'bg-green-900 opacity-50'}`}
                        title="مسموح الكلام / عمل جماعي"
                    />
                </div>
                <div className="mt-6 text-center">
                    <h4 className="font-black text-xl text-slate-700 mb-1">
                        {activeLight === 'RED' && '🔴 صمت تام / انتباه'}
                        {activeLight === 'YELLOW' && '🟡 صوت منخفض (همس)'}
                        {activeLight === 'GREEN' && '🟢 مسموح النقاش'}
                    </h4>
                    <p className="text-xs text-slate-500">اضغط على اللون لتغيير حالة الفصل</p>
                </div>
            </div>
        </div>
    )
}

// --- Widget: Quick Poll ---
const QuickPollWidget: React.FC = () => {
    const [counts, setCounts] = useState({ a: 0, b: 0 });
    const total = counts.a + counts.b;
    
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-80">
            <div className="p-4 border-b bg-blue-50 flex justify-between items-center">
                <h3 className="font-bold text-blue-800 flex items-center gap-2">
                    <BarChart2 size={18}/> تصويت سريع
                </h3>
                <button onClick={() => setCounts({a:0, b:0})} className="p-1 hover:bg-blue-100 rounded text-blue-600" title="تصفير">
                    <RotateCcw size={16}/>
                </button>
            </div>
            
            <div className="flex-1 flex flex-col p-6">
                <div className="flex gap-4 flex-1">
                    {/* Option A */}
                    <div className="flex-1 bg-green-50 rounded-xl border border-green-100 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 bg-green-200 transition-all duration-500 opacity-30" style={{ height: `${total ? (counts.a / total) * 100 : 0}%` }}></div>
                        <h4 className="font-bold text-green-800 mb-2 z-10">موافق / (أ)</h4>
                        <span className="text-4xl font-black text-green-600 z-10">{counts.a}</span>
                        <div className="flex gap-2 mt-4 z-10">
                            <button onClick={() => setCounts(p => ({...p, a: p.a + 1}))} className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 shadow">+</button>
                            <button onClick={() => setCounts(p => ({...p, a: Math.max(0, p.a - 1)}))} className="w-8 h-8 rounded-full bg-white text-green-600 border border-green-200 flex items-center justify-center hover:bg-green-50">-</button>
                        </div>
                    </div>

                    {/* Option B */}
                    <div className="flex-1 bg-red-50 rounded-xl border border-red-100 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 right-0 bg-red-200 transition-all duration-500 opacity-30" style={{ height: `${total ? (counts.b / total) * 100 : 0}%` }}></div>
                        <h4 className="font-bold text-red-800 mb-2 z-10">غير موافق / (ب)</h4>
                        <span className="text-4xl font-black text-red-600 z-10">{counts.b}</span>
                        <div className="flex gap-2 mt-4 z-10">
                            <button onClick={() => setCounts(p => ({...p, b: p.b + 1}))} className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow">+</button>
                            <button onClick={() => setCounts(p => ({...p, b: Math.max(0, p.b - 1)}))} className="w-8 h-8 rounded-full bg-white text-red-600 border border-red-200 flex items-center justify-center hover:bg-red-50">-</button>
                        </div>
                    </div>
                </div>
                <div className="mt-4 text-center text-xs text-gray-400">
                    إجمالي الأصوات: {total}
                </div>
            </div>
        </div>
    )
}

// --- Widget: Lesson Notes ---
const LessonNoteWidget: React.FC<{ className: string }> = ({ className }) => {
    const [notes, setNotes] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('class_lesson_notes');
        return saved ? JSON.parse(saved) : {};
    });
    const [currentNote, setCurrentNote] = useState('');

    useEffect(() => {
        if(className) {
            setCurrentNote(notes[className] || '');
        }
    }, [className, notes]);

    const handleSave = () => {
        const updated = { ...notes, [className]: currentNote };
        setNotes(updated);
        localStorage.setItem('class_lesson_notes', JSON.stringify(updated));
    };

    return (
        <div className="bg-yellow-50 rounded-xl shadow-sm border border-yellow-200 overflow-hidden flex flex-col h-80 relative">
            {/* Sticky Note Visual Effect */}
            <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-100 border-b border-l border-yellow-300 rounded-bl-xl z-10 shadow-sm"></div>
            
            <div className="p-4 border-b border-yellow-100 flex justify-between items-center pt-5">
                <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                    <StickyNote size={18}/> مذكرة الفصل ({className})
                </h3>
                <button 
                    onClick={handleSave} 
                    className="text-xs bg-yellow-200 text-yellow-800 px-3 py-1 rounded-lg font-bold hover:bg-yellow-300 transition-colors"
                >
                    حفظ
                </button>
            </div>
            
            <textarea 
                className="flex-1 bg-transparent p-6 outline-none text-gray-700 leading-relaxed resize-none text-sm font-medium"
                placeholder="أكتب هنا ملاحظات الدرس... (مثال: توقفنا عند ص 45، واجب تمرين 3...)"
                value={currentNote}
                onChange={e => setCurrentNote(e.target.value)}
                onBlur={handleSave} // Auto save on blur
            />
            
            <div className="p-2 text-[10px] text-yellow-600 text-center opacity-70">
                يتم حفظ الملاحظة تلقائياً لهذا الفصل
            </div>
        </div>
    );
};

// --- Sub-Component: Seating Chart (Refined) ---
const SeatingChart: React.FC<{ students: Student[], performance: PerformanceRecord[], onSaveSeating?: (students: Student[]) => void, preSelectedClass?: string }> = ({ students, performance, onSaveSeating, preSelectedClass }) => {
    const [selectedClass, setSelectedClass] = useState(preSelectedClass || '');
    const [layoutCols, setLayoutCols] = useState(5);
    const [selectedForSwap, setSelectedForSwap] = useState<string | null>(null);
    const [localStudents, setLocalStudents] = useState<Student[]>([]);
    const [arrangeMode, setArrangeMode] = useState<string>('ALPHA');
    const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SUCCESS'>('IDLE');

    // Update internal state when parent selector changes
    useEffect(() => {
        if(preSelectedClass) setSelectedClass(preSelectedClass);
    }, [preSelectedClass]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        students.forEach(s => s.className && classes.add(s.className));
        return Array.from(classes).sort();
    }, [students]);

    useEffect(() => {
        if(uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]);
    }, [uniqueClasses]);

    useEffect(() => {
        // Initialize local state
        const classStudents = students.filter(s => s.className === selectedClass);
        const mapped = classStudents.map((s, idx) => ({
            ...s,
            seatIndex: s.seatIndex !== undefined ? s.seatIndex : idx
        }));
        setLocalStudents(mapped);
    }, [selectedClass, students]);

    // Grid Helpers
    const totalSeats = Math.max(localStudents.length, 20);
    const gridCells = Array.from({ length: totalSeats }, (_, i) => i);

    const getStudentAtSeat = (index: number) => {
        return localStudents.find(s => s.seatIndex === index);
    };

    const getStudentAverage = (studentId: string) => {
        const myPerf = performance.filter(p => p.studentId === studentId);
        if (myPerf.length === 0) return 0;
        const total = myPerf.reduce((sum, p) => sum + (p.score / p.maxScore), 0);
        return total / myPerf.length;
    };

    const handleSeatClick = (index: number) => {
        if (selectedForSwap === null) {
            const student = getStudentAtSeat(index);
            if (student) setSelectedForSwap(student.id);
        } else {
            const student1 = localStudents.find(s => s.id === selectedForSwap);
            const student2 = getStudentAtSeat(index);

            if (!student1) { setSelectedForSwap(null); return; }

            const newStudents = [...localStudents];
            const s1Index = newStudents.findIndex(s => s.id === student1.id);
            newStudents[s1Index] = { ...student1, seatIndex: index };

            if (student2) {
                const s2Index = newStudents.findIndex(s => s.id === student2.id);
                newStudents[s2Index] = { ...student2, seatIndex: student1.seatIndex };
            }

            setLocalStudents(newStudents);
            setSelectedForSwap(null);
        }
    };

    const handleSmartArrange = (type: string) => {
        setArrangeMode(type);
        let sorted: Student[] = [...localStudents];

        if (type === 'ALPHA') {
            sorted.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        } 
        else if (type === 'RANDOM') {
            sorted.sort(() => Math.random() - 0.5);
        } 
        else if (type === 'LEVEL_HIGH_FRONT') {
            // Sort Descending (Highest score first -> Seat 0)
            sorted.sort((a, b) => getStudentAverage(b.id) - getStudentAverage(a.id));
        } 
        else if (type === 'LEVEL_HIGH_BACK') {
            // Sort Ascending (Lowest score first -> Seat 0, Highest -> Seat N)
            sorted.sort((a, b) => getStudentAverage(a.id) - getStudentAverage(b.id));
        }
        else if (type === 'MIXED') {
            // Heterogeneous grouping: High with Low (Pairing)
            // 1. Sort by Score
            const byScore = [...localStudents].sort((a, b) => getStudentAverage(b.id) - getStudentAverage(a.id));
            const mixed: Student[] = [];
            let left = 0;
            let right = byScore.length - 1;
            
            while (left <= right) {
                mixed.push(byScore[left]); // High
                if (left !== right) mixed.push(byScore[right]); // Low
                left++;
                right--;
            }
            sorted = mixed;
        }

        // Apply Seat Indices
        const remapped = sorted.map((s, idx) => ({ ...s, seatIndex: idx }));
        setLocalStudents(remapped);
    };

    const handleSaveChanges = () => {
        if (!onSaveSeating) return;
        
        setSaveStatus('SAVING');
        // Call the app-level save function
        onSaveSeating(localStudents);
        
        setTimeout(() => {
            setSaveStatus('SUCCESS');
            setTimeout(() => setSaveStatus('IDLE'), 3000);
        }, 800);
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <select 
                        value={selectedClass} 
                        onChange={e => setSelectedClass(e.target.value)}
                        className="p-2 border rounded-lg font-bold text-gray-700 bg-white shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-white p-1.5 rounded-lg border">
                        <Grid size={16}/>
                        <span>الأعمدة:</span>
                        <input 
                            type="number" 
                            min="2" max="10" 
                            value={layoutCols} 
                            onChange={e => setLayoutCols(Number(e.target.value))}
                            className="w-12 p-1 border rounded text-center bg-gray-50"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-500">نمط الترتيب:</label>
                        <select 
                            value={arrangeMode}
                            onChange={(e) => handleSmartArrange(e.target.value)}
                            className="p-2 border rounded-lg text-sm font-bold bg-white text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="ALPHA">🔤 أبجدي</option>
                            <option value="RANDOM">🎲 عشوائي</option>
                            <option value="LEVEL_HIGH_FRONT">📈 المتفوقون في الأمام</option>
                            <option value="LEVEL_HIGH_BACK">📉 المتفوقون في الخلف</option>
                            <option value="MIXED">🤝 دمج المستويات (أقران)</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={() => window.print()} className="flex-1 md:flex-none px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-black flex items-center justify-center gap-2 shadow-sm">
                        <Printer size={16}/> <span className="hidden sm:inline">طباعة</span>
                    </button>
                    <button 
                        onClick={handleSaveChanges} 
                        disabled={saveStatus !== 'IDLE'}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all ${saveStatus === 'SUCCESS' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                    >
                        {saveStatus === 'SAVING' ? <Loader2 size={16} className="animate-spin"/> : saveStatus === 'SUCCESS' ? <CheckCircle size={16}/> : <Save size={16}/>}
                        {saveStatus === 'SAVING' ? 'جاري الحفظ...' : saveStatus === 'SUCCESS' ? 'تم الحفظ' : 'حفظ الترتيب'}
                    </button>
                </div>
            </div>

            {/* Success Banner */}
            {saveStatus === 'SUCCESS' && (
                <div className="bg-green-100 text-green-800 text-sm font-bold text-center py-2 animate-fade-in border-b border-green-200 flex items-center justify-center gap-2">
                    <CheckCircle size={16}/>
                    تم حفظ مخطط الجلوس بنجاح وتحديث قاعدة البيانات.
                </div>
            )}

            {/* Grid Area */}
            <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-100 flex justify-center">
                <div className="w-full max-w-5xl">
                    {/* Blackboard Visual */}
                    <div className="w-2/3 mx-auto h-12 bg-gray-800 rounded-b-xl mb-10 shadow-lg flex items-center justify-center text-gray-400 text-xs tracking-widest border-t-4 border-gray-600">
                        السبورة (المقدمة)
                    </div>

                    <div 
                        className="grid gap-3 md:gap-4"
                        style={{ gridTemplateColumns: `repeat(${layoutCols}, minmax(0, 1fr))` }}
                    >
                        {gridCells.map(seatIdx => {
                            const student = getStudentAtSeat(seatIdx);
                            const isSelected = student?.id === selectedForSwap;
                            const avg = student ? getStudentAverage(student.id) : 0;
                            
                            // Visual indicator for level (Optional visualization during arrangement)
                            let levelColor = 'bg-gray-100';
                            if (arrangeMode.includes('LEVEL') || arrangeMode === 'MIXED') {
                                if (avg >= 0.85) levelColor = 'bg-green-100 text-green-700';
                                else if (avg >= 0.65) levelColor = 'bg-blue-50 text-blue-700';
                                else if (avg > 0) levelColor = 'bg-orange-50 text-orange-700';
                            }

                            return (
                                <div 
                                    key={seatIdx}
                                    onClick={() => handleSeatClick(seatIdx)}
                                    className={`
                                        aspect-[4/3] rounded-lg border-2 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all shadow-sm relative group
                                        ${student 
                                            ? (isSelected ? 'bg-purple-100 border-purple-500 ring-2 ring-purple-300' : 'bg-white border-gray-300 hover:border-purple-400') 
                                            : 'bg-slate-200/50 border-dashed border-slate-300 hover:bg-slate-200'
                                        }
                                    `}
                                >
                                    {student ? (
                                        <>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${levelColor}`}>
                                                {student.name.charAt(0)}
                                            </div>
                                            <span className="text-xs md:text-sm font-bold text-gray-800 line-clamp-2 leading-tight">
                                                {student.name}
                                            </span>
                                            {/* Tooltip for avg */}
                                            {(arrangeMode.includes('LEVEL') || arrangeMode === 'MIXED') && (
                                                <div className="absolute top-1 right-1 text-[8px] opacity-50 font-mono">
                                                    {(avg * 100).toFixed(0)}%
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-[10px] md:text-xs text-gray-400 font-medium">م {seatIdx + 1}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            <div className="p-2 bg-yellow-50 text-center text-xs text-yellow-800 border-t border-yellow-200 flex justify-center items-center gap-2">
                <ArrowDownUp size={14}/>
                اضغط على طالب ثم اضغط على مكان آخر لتبديل الأماكن يدوياً.
            </div>
        </div>
    );
};

export default ClassroomManager;
