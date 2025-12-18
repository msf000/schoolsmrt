
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, LessonLink, BehaviorStatus, SystemUser, StoredLessonPlan } from '../types';
import { 
    Users, Shuffle, Clock, Grid, Play, Pause, RefreshCw, Trophy, User, Maximize, AlertCircle, Monitor, X, Upload, ChevronLeft, ChevronRight, 
    PenTool, Eraser, Trash2, Image as ImageIcon, BookOpen, CheckCircle, Minimize, Sparkles, Star, Siren, List, Music, Armchair, Bell, ThumbsUp, ThumbsDown, MicOff, XCircle, BrainCircuit, Loader2, Plus 
} from 'lucide-react';
import { getLessonLinks, getLessonPlans, getSchedules, getTeacherPeriodTimings, getWeeklyPlans, getTeacherAssignments } from '../services/storageService';
import { generateSlideQuestions, suggestQuickActivity } from '../services/geminiService';

interface ClassroomScreenProps {
    students: Student[];
    attendance: AttendanceRecord[];
    onSaveAttendance?: (records: AttendanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const EXIT_QUESTIONS = [
    "ما هو أهم شيء تعلمته اليوم؟",
    "شيء واحد لم تفهمه تماماً وتود مراجعته؟",
    "كيف يمكنك تطبيق درس اليوم في حياتك؟",
    "لخص درس اليوم في جملة واحدة."
];

const ClassroomScreen: React.FC<ClassroomScreenProps> = ({ students, attendance, onSaveAttendance, currentUser }) => {
    const [selectedClass, setSelectedClass] = useState('');
    const [activeTool, setActiveTool] = useState<'PICKER' | 'TIMER' | 'GROUPS' | 'PRESENTATION' | 'REWARDS' | 'SEATING'>('PRESENTATION');
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        students.forEach(s => { if (s.className) classes.add(s.className); });
        if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUser]);

    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0]);
    }, [uniqueClasses]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    const presentStudents = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return students.filter(s => s.className === selectedClass).filter(s => {
            const record = attendance.find(a => a.studentId === s.id && a.date === today);
            return !record || record.status !== AttendanceStatus.ABSENT;
        });
    }, [selectedClass, students, attendance]);

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-900 text-white animate-fade-in relative overflow-hidden font-sans">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 z-0"></div>
            
            <div className={`relative z-20 flex flex-col md:flex-row justify-between items-center bg-white/5 backdrop-blur-md border-b border-white/10 ${isFullscreen ? 'p-2' : 'p-4'}`}>
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Monitor className="text-yellow-400"/> شاشة الفصل الذكية</h2>
                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="bg-black/30 border border-white/20 text-white rounded-lg px-4 py-2 font-bold outline-none">
                        {uniqueClasses.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto p-1 bg-black/20 rounded-xl">
                    <TabBtn icon={<PenTool size={18}/>} label="السبورة" active={activeTool === 'PRESENTATION'} onClick={() => setActiveTool('PRESENTATION')} />
                    <TabBtn icon={<Star size={18}/>} label="التحفيز" active={activeTool === 'REWARDS'} onClick={() => setActiveTool('REWARDS')} />
                    <TabBtn icon={<Shuffle size={18}/>} label="القرعة" active={activeTool === 'PICKER'} onClick={() => setActiveTool('PICKER')} />
                    <TabBtn icon={<Clock size={18}/>} label="المؤقت" active={activeTool === 'TIMER'} onClick={() => setActiveTool('TIMER')} />
                    <TabBtn icon={<Grid size={18}/>} label="المجموعات" active={activeTool === 'GROUPS'} onClick={() => setActiveTool('GROUPS')} />
                    <TabBtn icon={<Armchair size={18}/>} label="المقاعد" active={activeTool === 'SEATING'} onClick={() => setActiveTool('SEATING')} />
                    <button onClick={toggleFullscreen} className="p-2.5 hover:bg-white/10 rounded-lg transition-colors">{isFullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}</button>
                </div>
            </div>

            <div className="relative z-10 flex-1 flex items-center justify-center p-4 overflow-hidden">
                {activeTool === 'PRESENTATION' && <PresentationBoard students={presentStudents} currentClass={selectedClass} currentUser={currentUser} />}
                {activeTool === 'REWARDS' && <RewardsView students={presentStudents} attendance={attendance} onSaveAttendance={onSaveAttendance} currentUser={currentUser} />}
                {activeTool === 'PICKER' && <RandomPicker students={presentStudents} />}
                {activeTool === 'TIMER' && <ClassroomTimer />}
                {activeTool === 'GROUPS' && <GroupGenerator students={presentStudents} />}
                {activeTool === 'SEATING' && <SeatingView students={presentStudents} />}
            </div>
        </div>
    );
};

const TabBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${active ? 'bg-indigo-500 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>
        {icon} <span className="hidden md:inline">{label}</span>
    </button>
);

// --- Presentation Board Sub-component (The Core) ---
const PresentationBoard = ({ students, currentClass, currentUser }: any) => {
    const [pages, setPages] = useState<any[]>([{ id: '1', type: 'NONE', contentUrl: '', textContent: '', drawingData: null }]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [activeTool, setActiveTool] = useState<'NONE' | 'PEN' | 'AI_QUIZ' | 'PANIC' | 'TRAFFIC' | 'EXIT' | 'PLANS'>('NONE');
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#ef4444');
    const [isEraser, setIsEraser] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiResult, setAiResult] = useState<any>(null);
    const [traffic, setTraffic] = useState<'RED'|'YELLOW'|'GREEN'>('GREEN');
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Drawing Logic
    const startDrawing = (e: any) => {
        if (activeTool !== 'PEN' || !canvasRef.current) return;
        setIsDrawing(true);
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : penColor;
        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
        ctx.lineWidth = isEraser ? 30 : 4;
        ctx.lineCap = 'round';
    };

    const draw = (e: any) => {
        if (!isDrawing || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        ctx.lineTo(x, y); ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing && canvasRef.current) {
            setIsDrawing(false);
            const data = canvasRef.current.toDataURL();
            setPages(prev => {
                const newPages = [...prev];
                newPages[currentPageIndex].drawingData = data;
                return newPages;
            });
        }
    };

    const clearCanvas = () => {
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    };

    const handleFileUpload = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPages(prev => {
                const newPages = [...prev];
                newPages[currentPageIndex] = { ...newPages[currentPageIndex], type: 'IMAGE', contentUrl: url };
                return newPages;
            });
        }
    };

    const handleAiQuiz = async () => {
        setIsGenerating(true);
        const content = pages[currentPageIndex].textContent || "درس اليوم";
        const questions = await generateSlideQuestions(content);
        setAiResult(questions);
        setIsGenerating(false);
    };

    const handlePanic = async () => {
        setIsGenerating(true);
        const suggestion = await suggestQuickActivity("تشتت الطلاب", "General");
        setAiResult(suggestion);
        setIsGenerating(false);
    };

    return (
        <div className="w-full h-full flex flex-col relative bg-white rounded-2xl overflow-hidden shadow-2xl">
            {/* Slide View */}
            <div className="flex-1 relative group" ref={containerRef}>
                <div className="absolute inset-0 z-0 flex items-center justify-center">
                    {pages[currentPageIndex].type === 'IMAGE' ? (
                        <img src={pages[currentPageIndex].contentUrl} className="w-full h-full object-contain" alt="slide"/>
                    ) : (
                        <div className="text-slate-200 flex flex-col items-center">
                            <PenTool size={100} className="mb-4 opacity-10"/>
                            <label className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold cursor-pointer hover:bg-indigo-700 shadow-lg">
                                إدراج صورة الدرس <input type="file" className="hidden" onChange={handleFileUpload} />
                            </label>
                        </div>
                    )}
                </div>
                
                {/* Drawing Layer */}
                <canvas 
                    ref={canvasRef} 
                    className={`absolute inset-0 z-10 touch-none ${activeTool === 'PEN' ? 'cursor-crosshair' : 'pointer-events-none'}`}
                    onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                    width={containerRef.current?.clientWidth} height={containerRef.current?.clientHeight}
                />
            </div>

            {/* Bottom Controls */}
            <div className="h-20 bg-slate-900 border-t border-white/10 flex items-center justify-between px-6 z-30">
                <div className="flex items-center gap-3">
                    <button onClick={() => setPages([...pages, { id: Date.now().toString(), type: 'NONE' }])} className="p-2 bg-white/10 rounded-lg"><Plus/></button>
                    <div className="flex items-center bg-white/5 rounded-lg p-1 border border-white/10">
                        <button onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex-1))} className="p-2"><ChevronRight/></button>
                        <span className="px-4 font-mono font-bold text-yellow-400">{currentPageIndex+1} / {pages.length}</span>
                        <button onClick={() => setCurrentPageIndex(Math.min(pages.length-1, currentPageIndex+1))} className="p-2"><ChevronLeft/></button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <ToolIcon icon={<PenTool/>} active={activeTool==='PEN'} onClick={()=>setActiveTool(activeTool==='PEN'?'NONE':'PEN')} />
                    <ToolIcon icon={<Eraser/>} active={isEraser} onClick={()=>setIsEraser(!isEraser)} />
                    <ToolIcon icon={<BrainCircuit/>} active={activeTool==='AI_QUIZ'} onClick={()=>{setActiveTool('AI_QUIZ'); handleAiQuiz();}} />
                    <ToolIcon icon={<Siren/>} active={activeTool==='PANIC'} color="red" onClick={()=>{setActiveTool('PANIC'); handlePanic();}} />
                    <ToolIcon icon={<AlertCircle/>} active={activeTool==='TRAFFIC'} onClick={()=>setActiveTool(activeTool==='TRAFFIC'?'NONE':'TRAFFIC')} />
                    <div className="w-[1px] h-8 bg-white/10 mx-2"></div>
                    <button onClick={clearCanvas} className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-lg"><Trash2/></button>
                </div>
            </div>

            {/* Floating AI Panel */}
            {activeTool !== 'NONE' && activeTool !== 'PEN' && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 bg-slate-800 border border-white/20 p-6 rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold flex items-center gap-2">
                            {activeTool==='AI_QUIZ' && <><BrainCircuit className="text-purple-400"/> اختبار سريع بالذكاء</>}
                            {activeTool==='PANIC' && <><Siren className="text-red-400"/> نشاط لكسر الجمود</>}
                            {activeTool==='TRAFFIC' && <><AlertCircle className="text-yellow-400"/> إشارة مرور الفصل</>}
                        </h4>
                        <button onClick={()=>setActiveTool('NONE')}><X size={20}/></button>
                    </div>
                    
                    <div className="text-sm leading-relaxed">
                        {isGenerating ? (
                            <div className="flex flex-col items-center py-8 gap-3">
                                <Loader2 className="animate-spin text-indigo-400" size={40}/>
                                <p>جاري التفكير بالذكاء الاصطناعي...</p>
                            </div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto">
                                {activeTool === 'AI_QUIZ' && Array.isArray(aiResult) && aiResult.map((q: any, i: number) => (
                                    <div key={i} className="mb-4 p-3 bg-white/5 rounded-xl border border-white/10">
                                        <p className="font-bold text-indigo-300 mb-2">{q.question}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {q.options.map((opt: any) => <div key={opt} className="p-2 bg-white/5 rounded border text-xs">{opt}</div>)}
                                        </div>
                                    </div>
                                ))}
                                {activeTool === 'PANIC' && <div className="p-4 bg-red-400/10 border border-red-400/20 rounded-xl text-red-100 font-bold whitespace-pre-wrap">{aiResult}</div>}
                                {activeTool === 'TRAFFIC' && (
                                    <div className="flex justify-center gap-8 py-4">
                                        <TrafficLight color="RED" active={traffic==='RED'} onClick={()=>setTraffic('RED')}/>
                                        <TrafficLight color="YELLOW" active={traffic==='YELLOW'} onClick={()=>setTraffic('YELLOW')}/>
                                        <TrafficLight color="GREEN" active={traffic==='GREEN'} onClick={()=>setTraffic('GREEN')}/>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ToolIcon = ({ icon, active, onClick, color }: any) => (
    <button onClick={onClick} className={`p-2.5 rounded-xl transition-all ${active ? (color==='red' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30') : 'text-slate-400 hover:text-white hover:bg-white/10'}`}>
        {icon}
    </button>
);

const TrafficLight = ({ color, active, onClick }: any) => {
    const bg = color==='RED' ? 'bg-red-600' : color==='YELLOW' ? 'bg-yellow-500' : 'bg-green-600';
    return <div onClick={onClick} className={`w-16 h-16 rounded-full cursor-pointer transition-all ${active ? `${bg} ring-4 ring-white shadow-2xl scale-125` : 'bg-slate-700 opacity-30 hover:opacity-50'}`}></div>;
}

// ... (Sub-components: RandomPicker, ClassroomTimer, GroupGenerator, RewardsView, SeatingView - Simplified Version provided here for completeness) ...
const RandomPicker = ({ students }: any) => {
    const [name, setName] = useState('؟؟؟');
    const [rolling, setRolling] = useState(false);
    const start = () => {
        setRolling(true);
        let i = 0;
        const timer = setInterval(() => {
            setName(students[Math.floor(Math.random() * students.length)]?.name || 'فارغ');
            if (i++ > 20) { clearInterval(timer); setRolling(false); }
        }, 100);
    };
    return (
        <div className="text-center">
            <div className={`w-full aspect-video bg-white/5 rounded-3xl border-4 border-dashed border-white/20 flex items-center justify-center mb-8 px-10 transition-all ${rolling ? 'scale-110 border-indigo-500' : ''}`}>
                <h1 className="text-6xl font-black">{name}</h1>
            </div>
            <button onClick={start} disabled={rolling || students.length===0} className="bg-yellow-500 text-black px-12 py-4 rounded-full font-black text-2xl shadow-xl flex items-center gap-3 mx-auto hover:bg-yellow-400">
                <Shuffle size={32}/> {rolling ? 'جاري السحب...' : 'سحب عشوائي'}
            </button>
        </div>
    );
};

const ClassroomTimer = () => {
    const [sec, setSec] = useState(300);
    const [active, setActive] = useState(false);
    useEffect(() => {
        let t: any;
        if(active && sec > 0) t = setInterval(()=>setSec(s=>s-1), 1000);
        return () => clearInterval(t);
    }, [active, sec]);
    const format = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
    return (
        <div className="text-center">
            <div className={`text-9xl font-black font-mono mb-8 ${sec < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{format(sec)}</div>
            <div className="flex gap-4 justify-center">
                <button onClick={()=>setActive(!active)} className={`p-6 rounded-full ${active ? 'bg-red-600' : 'bg-green-600'}`}>{active ? <Pause size={40}/> : <Play size={40}/>}</button>
                <button onClick={()=>{setActive(false); setSec(300);}} className="p-6 bg-white/10 rounded-full"><RefreshCw size={40}/></button>
            </div>
            <div className="flex gap-2 mt-8">
                {[1, 2, 5, 10, 15].map(m => <button key={m} onClick={()=>setSec(m*60)} className="px-6 py-2 bg-white/5 rounded-lg font-bold border border-white/10 hover:bg-white/10">{m}د</button>)}
            </div>
        </div>
    );
};

const GroupGenerator = ({ students }: any) => {
    const [num, setNum] = useState(4);
    const [groups, setGroups] = useState<any[][]>([]);
    const gen = () => {
        const sh = [...students].sort(()=>0.5-Math.random());
        const g: any[][] = Array.from({length:num}, ()=>[]);
        sh.forEach((s,i)=> g[i%num].push(s));
        setGroups(g);
    };
    return (
        <div className="w-full max-w-6xl h-full flex flex-col items-center">
            <div className="flex gap-4 mb-8 items-center bg-white/10 p-4 rounded-2xl border border-white/10">
                <span className="font-bold">عدد المجموعات:</span>
                <input type="number" min="2" max="10" value={num} onChange={e=>setNum(Number(e.target.value))} className="bg-black/40 w-20 text-center p-2 rounded-lg font-bold"/>
                <button onClick={gen} className="bg-indigo-600 px-8 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2"><Grid size={20}/> تقسيم المجموعات</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full overflow-y-auto">
                {groups.map((group, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <h4 className="text-yellow-400 font-bold mb-3 border-b border-white/10 pb-2">المجموعة {i+1}</h4>
                        <div className="space-y-1">
                            {group.map(s => <div key={s.id} className="text-sm flex items-center gap-2"><div className="w-2 h-2 bg-indigo-500 rounded-full"></div>{s.name}</div>)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const RewardsView = ({ students, attendance, onSaveAttendance, currentUser }: any) => {
    const handlePoint = (studentId: string) => {
        if(onSaveAttendance) onSaveAttendance([{ id: Date.now().toString(), studentId, date: new Date().toISOString().split('T')[0], status: AttendanceStatus.PRESENT, behaviorStatus: BehaviorStatus.POSITIVE, behaviorNote: 'تميز في الحصة', createdById: currentUser?.id }]);
    };
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full h-full overflow-y-auto p-4">
            {students.map((s: any) => (
                <div key={s.id} onClick={()=>handlePoint(s.id)} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-500/20 hover:border-yellow-500 transition-all active:scale-95 group">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-2xl font-bold mb-2 group-hover:bg-yellow-500 group-hover:text-black transition-colors">{s.name.charAt(0)}</div>
                    <span className="text-sm font-bold text-center">{s.name}</span>
                </div>
            ))}
        </div>
    );
}

const SeatingView = ({ students }: any) => (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-4 md:grid-cols-6 gap-6" style={{ direction: 'rtl' }}>
        {students.map((s: any) => (
            <div key={s.id} className="aspect-square bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center p-2 backdrop-blur-sm">
                <div className="w-10 h-10 bg-indigo-500/30 rounded-full flex items-center justify-center font-bold mb-2">{s.name.charAt(0)}</div>
                <span className="text-[10px] font-bold text-center line-clamp-2">{s.name}</span>
            </div>
        ))}
    </div>
);

export default ClassroomScreen;
