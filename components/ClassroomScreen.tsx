
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, TeacherAssignment, Exam } from '../types';
import { 
    Shuffle, Clock, Grid, Play, Pause, RefreshCw, Trophy, Maximize, X, ChevronLeft, ChevronRight, 
    PenTool, Eraser, Trash2, Minimize, Sparkles, Star, Siren, BrainCircuit, Loader2, Plus, ArrowRight, 
    QrCode, Zap, Ghost, MessageSquare, Lightbulb, Activity, BarChart2, CheckCircle2, HelpCircle, FileText, Swords, Mic
} from 'lucide-react';
import { getTeacherAssignments, getExams } from '../services/storageService';
import { analyzeClassroomVibe, generateBrainstormingIdea } from '../services/geminiService';
import { GoogleGenAI } from "@google/genai";
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import ActivityWheel from './ActivityWheel';
import QuizBattle from './QuizBattle';
import VoiceObservation from './VoiceObservation';

interface ClassroomScreenProps {
    students: Student[];
    attendance: AttendanceRecord[];
    onSaveAttendance?: (records: AttendanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const ClassroomScreen: React.FC<ClassroomScreenProps> = ({ students, attendance, onSaveAttendance, currentUser }) => {
    const navigate = useNavigate();
    const [selectedClass, setSelectedClass] = useState('');
    const [activeTool, setActiveTool] = useState<'PICKER' | 'TIMER' | 'GROUPS' | 'PRESENTATION' | 'REWARDS' | 'VIBE' | 'QR' | 'POLL' | 'FLASHCARDS' | 'BATTLE'>('PRESENTATION');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isWheelOpen, setIsWheelOpen] = useState(false);
    const [isBattleOpen, setIsBattleOpen] = useState(false);
    const [isVoiceOpen, setIsVoiceOpen] = useState(false);
    
    const uniqueClasses = useMemo(() => {
        const classes = new Set(students.map(s => s.className).filter(Boolean));
        if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach((a: TeacherAssignment) => classes.add(a.classId));
        return Array.from(classes).sort();
    }, [students, currentUser]);

    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) setSelectedClass(uniqueClasses[0] || '');
    }, [uniqueClasses, selectedClass]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true));
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => setIsFullscreen(false));
            }
        }
    };

    const presentStudents = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return students.filter(s => s.className === selectedClass).filter(s => {
            const record = attendance.find(a => a.studentId === s.id && a.date === today);
            return !record || record.status !== AttendanceStatus.ABSENT;
        });
    }, [selectedClass, students, attendance]);

    const availableExams = useMemo(() => {
        if (!currentUser) return [];
        return getExams(currentUser.id).filter(e => e.questions.length > 0);
    }, [currentUser]);

    return (
        <div className="fixed inset-0 h-screen w-screen flex flex-col bg-slate-900 text-white animate-fade-in z-[100] overflow-hidden font-tajawal">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 z-0"></div>
            
            <div className={`relative z-20 flex flex-col md:flex-row justify-between items-center bg-white/5 backdrop-blur-md border-b border-white/10 ${isFullscreen ? 'p-2' : 'p-4'}`}>
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/classroom')} className="p-2 bg-white/10 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                        <ArrowRight size={20}/>
                    </button>
                    <h2 className="text-xl font-bold flex items-center gap-2">شاشة الفصل الذكية</h2>
                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="bg-black/30 border border-white/20 text-white rounded-lg px-4 py-2 font-bold outline-none text-xs">
                        {uniqueClasses.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto p-1 bg-black/20 rounded-xl max-w-[65%] no-scrollbar">
                    <TabBtn icon={<PenTool size={18}/>} label="السبورة" active={activeTool === 'PRESENTATION'} onClick={() => setActiveTool('PRESENTATION')} />
                    <TabBtn icon={<Swords size={18}/>} label="المسابقة" active={activeTool === 'BATTLE'} onClick={() => setIsBattleOpen(true)} />
                    <TabBtn icon={<Mic size={18}/>} label="رصد صوتي" active={false} onClick={() => setIsVoiceOpen(true)} />
                    <TabBtn icon={<FileText size={18}/>} label="بطاقات AI" active={activeTool === 'FLASHCARDS'} onClick={() => setActiveTool('FLASHCARDS')} />
                    <TabBtn icon={<HelpCircle size={18}/>} label="تصويت" active={activeTool === 'POLL'} onClick={() => setActiveTool('POLL')} />
                    <TabBtn icon={<Star size={18}/>} label="تحفيز" active={activeTool === 'REWARDS'} onClick={() => setActiveTool('REWARDS')} />
                    <TabBtn icon={<Shuffle size={18}/>} label="عجلة الحظ" active={activeTool === 'PICKER'} onClick={() => setIsWheelOpen(true)} />
                    <TabBtn icon={<QrCode size={18}/>} label="تحضير" active={activeTool === 'QR'} onClick={() => setActiveTool('QR')} />
                    <TabBtn icon={<Activity size={18}/>} label="النبض" active={activeTool === 'VIBE'} onClick={() => setActiveTool('VIBE')} />
                    <TabBtn icon={<Clock size={18}/>} label="مؤقت" active={activeTool === 'TIMER'} onClick={() => setActiveTool('TIMER')} />
                    <TabBtn icon={<Grid size={18}/>} label="مجموعات" active={activeTool === 'GROUPS'} onClick={() => setActiveTool('GROUPS')} />
                    <button onClick={toggleFullscreen} className="p-2.5 hover:bg-white/10 rounded-lg transition-colors">{isFullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}</button>
                </div>
            </div>

            <div className="relative z-10 flex-1 flex items-center justify-center p-4 overflow-hidden">
                {activeTool === 'PRESENTATION' && <PresentationBoard />}
                {activeTool === 'REWARDS' && <RewardsView students={presentStudents} onSaveAttendance={onSaveAttendance} currentUser={currentUser} />}
                {activeTool === 'TIMER' && <ClassroomTimer />}
                {activeTool === 'GROUPS' && <GroupGenerator students={presentStudents} />}
                {activeTool === 'VIBE' && <VibeMonitor selectedClass={selectedClass} />}
                {activeTool === 'QR' && <QrAttendanceDisplay selectedClass={selectedClass} />}
                {activeTool === 'POLL' && <LivePollView totalStudents={presentStudents.length} />}
                {activeTool === 'FLASHCARDS' && <AIFlashcardsView />}
            </div>

            {isWheelOpen && <ActivityWheel students={presentStudents} onClose={() => setIsWheelOpen(false)} />}
            {isVoiceOpen && currentUser && <VoiceObservation students={students} teacherId={currentUser.id} onClose={() => setIsVoiceOpen(false)} />}
            {isBattleOpen && (
                <QuizBattleSelection 
                    exams={availableExams} 
                    students={presentStudents} 
                    onStart={(exam: Exam) => { setIsBattleOpen(false); setActiveTool('BATTLE'); }} 
                    onClose={() => setIsBattleOpen(false)} 
                />
            )}
            {activeTool === 'BATTLE' && availableExams.length > 0 && (
                <QuizBattle 
                    students={presentStudents} 
                    questions={availableExams[0].questions} 
                    onClose={() => setActiveTool('PRESENTATION')} 
                />
            )}
        </div>
    );
};

const QuizBattleSelection = ({ exams, students, onStart, onClose }: any) => {
    return (
        <div className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 font-tajawal">
            <div className="bg-white text-slate-900 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-zoom-in">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black flex items-center gap-3"><Swords className="text-indigo-600"/> اختر مادة المسابقة</h3>
                    <button onClick={onClose}><X/></button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar p-2">
                    {exams.map((e: Exam) => (
                        <button key={e.id} onClick={() => onStart(e)} className="w-full p-6 border-2 border-slate-100 rounded-[2rem] hover:border-indigo-600 hover:bg-indigo-50 transition-all text-right group">
                            <h4 className="font-black text-lg group-hover:text-indigo-700">{e.title}</h4>
                            <p className="text-xs text-slate-400 font-bold uppercase mt-1">{e.subject} • {e.questions.length} سؤال</p>
                        </button>
                    ))}
                    {exams.length === 0 && <p className="text-center py-10 text-slate-400 font-bold">لا توجد اختبارات بأسئلة جاهزة حالياً.</p>}
                </div>
            </div>
        </div>
    );
};

const AIFlashcardsView = () => {
    const [topic, setTopic] = useState('');
    const [cards, setCards] = useState<{q: string, b: string}[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const generateCards = async () => {
        if (!topic) return;
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `أنت خبير تعليمي. ولد 5 بطاقات مراجعة (سؤال وجواب) عن موضوع: ${topic}. أرجع النتيجة بتنسيق JSON فقط: {"cards": [{"q": "السؤال", "b": "الجواب"}]}`;
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            const data = JSON.parse(response.text || "{}");
            if (data.cards) setCards(data.cards);
            setCurrentIndex(0);
        } catch (e) { alert('فشل التوليد الذكي.'); } finally { setLoading(false); }
    };

    return (
        <div className="w-full max-w-2xl flex flex-col items-center gap-10 animate-fade-in">
            {cards.length === 0 ? (
                <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 w-full text-center space-y-6">
                    <BrainCircuit size={80} className="mx-auto text-indigo-400 opacity-40"/>
                    <h3 className="text-3xl font-black">بطاقات المراجعة الذكية</h3>
                    <input 
                        className="w-full p-5 bg-black/20 border-2 border-white/10 rounded-2xl text-center text-xl outline-none focus:border-indigo-500"
                        placeholder="أدخل موضوع المراجعة..."
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                    />
                    <button onClick={generateCards} disabled={loading} className="w-full py-4 bg-indigo-600 rounded-2xl font-black text-xl flex items-center justify-center gap-2 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin"/> : <Sparkles/>} توليد البطاقات (AI)
                    </button>
                </div>
            ) : (
                <div className="w-full flex flex-col items-center gap-10">
                    <div 
                        className="w-full h-80 relative cursor-pointer perspective-1000"
                        onClick={() => setIsFlipped(!isFlipped)}
                    >
                        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                            <div className="absolute inset-0 backface-hidden bg-indigo-600 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-10 text-center border-4 border-white/10">
                                <span className="text-indigo-200 text-xs font-black uppercase mb-4 tracking-widest">السؤال {currentIndex + 1}</span>
                                <h4 className="text-3xl md:text-4xl font-black leading-tight">{cards[currentIndex].q}</h4>
                                <p className="mt-8 text-white/40 text-xs font-bold animate-pulse">اضغط للكشف عن الإجابة</p>
                            </div>
                            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-emerald-600 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center p-10 text-center border-4 border-white/10">
                                <span className="text-emerald-200 text-xs font-black uppercase mb-4 tracking-widest">الإجابة النموذجية</span>
                                <h4 className="text-2xl md:text-3xl font-black leading-relaxed">{cards[currentIndex].b}</h4>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        <button onClick={() => { setIsFlipped(false); setCurrentIndex(p => Math.max(0, p - 1)); }} className="p-4 bg-white/10 rounded-full hover:bg-white/20"><ChevronRight size={32}/></button>
                        <span className="text-xl font-black text-white/40">{currentIndex + 1} / {cards.length}</span>
                        <button onClick={() => { setIsFlipped(false); setCurrentIndex(p => Math.min(cards.length - 1, p + 1)); }} className="p-4 bg-white/10 rounded-full hover:bg-white/20"><ChevronLeft size={32}/></button>
                        <button onClick={() => setCards([])} className="p-4 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40"><RefreshCw size={24}/></button>
                    </div>
                </div>
            )}
            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
            `}</style>
        </div>
    );
};

const LivePollView = ({ totalStudents }: { totalStudents: number }) => {
    const [status, setStatus] = useState<'IDLE' | 'ACTIVE' | 'RESULT'>('IDLE');
    const [question, setQuestion] = useState('');
    const [votes, setVotes] = useState({ yes: 0, no: 0 });
    const [timer, setTimer] = useState(30);

    const startPoll = () => {
        if (!question) return;
        setStatus('ACTIVE');
        setVotes({ yes: 0, no: 0 });
        setTimer(30);
    };

    useEffect(() => {
        let interval: any;
        if (status === 'ACTIVE' && timer > 0) {
            interval = setInterval(() => {
                setTimer(t => t - 1);
                if (Math.random() > 0.7) {
                    setVotes(v => ({
                        yes: Math.random() > 0.5 ? v.yes + 1 : v.yes,
                        no: Math.random() > 0.5 ? v.no + 1 : v.no
                    }));
                }
            }, 1000);
        } else if (timer === 0) {
            setStatus('RESULT');
        }
        return () => clearInterval(interval);
    }, [status, timer]);

    return (
        <div className="w-full max-w-4xl bg-white/5 backdrop-blur-3xl p-10 rounded-[4rem] border border-white/10 shadow-2xl animate-fade-in">
            {status === 'IDLE' ? (
                <div className="space-y-8">
                    <div className="text-center">
                        <h3 className="text-4xl font-black mb-4">استفتاء الفصل المباشر</h3>
                        <p className="text-indigo-300 font-bold uppercase tracking-widest text-sm">اطرح سؤالاً واحصل على إجابات فورية</p>
                    </div>
                    <textarea 
                        className="w-full p-8 bg-black/20 border-2 border-white/10 rounded-[2.5rem] text-2xl font-black outline-none focus:border-indigo-500 transition-all text-center"
                        placeholder="اكتب السؤال هنا (مثال: هل قوانين نيوتن واضحة؟)"
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                    />
                    <button onClick={startPoll} className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">إطلاق التصويت الآن</button>
                </div>
            ) : (
                <div className="space-y-10 text-center">
                    <h3 className="text-3xl font-black text-indigo-300">س: {question}</h3>
                    <div className="flex justify-center items-center gap-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-32 h-32 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(16,185,129,0.4)]">👍</div>
                            <div className="text-5xl font-black">{Math.min(votes.yes, totalStudents)}</div>
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">موافق</span>
                        </div>
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full border-8 border-white/10 flex items-center justify-center">
                                <span className="text-4xl font-black text-white">{timer}</span>
                            </div>
                            <p className="mt-4 text-[10px] font-black text-white/40">المتبقي</p>
                        </div>
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-32 h-32 bg-red-500 rounded-[2rem] flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(239,68,68,0.4)]">👎</div>
                            <div className="text-5xl font-black">{Math.min(votes.no, totalStudents)}</div>
                            <span className="text-xs font-bold text-red-400 uppercase tracking-widest">غير موافق</span>
                        </div>
                    </div>
                    {status === 'RESULT' && (
                        <button onClick={() => setStatus('IDLE')} className="bg-white/10 px-10 py-3 rounded-full font-black text-xs hover:bg-white/20 transition-all flex items-center gap-2 mx-auto">
                            <RefreshCw size={14}/> تصويت جديد
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

const TabBtn = ({ icon, label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap text-xs ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}>
        {icon} <span className="hidden md:inline">{label}</span>
    </button>
);

const PresentationBoard = () => {
    const [activeTool, setActiveTool] = useState<'PEN' | 'ERASER' | 'BRAINSTORM' | 'NONE'>('PEN');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiIdeas, setAiIdeas] = useState('');
    const [topic, setTopic] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (containerRef.current && canvasRef.current) {
            canvasRef.current.width = containerRef.current.clientWidth;
            canvasRef.current.height = containerRef.current.clientHeight;
        }
    }, []);

    const startDrawing = (e: any) => {
        if (activeTool !== 'PEN' && activeTool !== 'ERASER') return;
        setIsDrawing(true);
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
        const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.strokeStyle = activeTool === 'ERASER' ? 'white' : '#4f46e5';
        ctx.lineWidth = activeTool === 'ERASER' ? 50 : 5;
        ctx.lineCap = 'round';
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const x = (e.clientX || e.touches?.[0].clientX) - rect.left;
        const y = (e.clientY || e.touches?.[0].clientY) - rect.top;
        ctx.lineTo(x, y); ctx.stroke();
    };

    const handleBrainstorm = async () => {
        if (!topic) return;
        setIsGenerating(true);
        const ideas = await generateBrainstormingIdea(topic);
        setAiIdeas(ideas);
        setIsGenerating(false);
    };

    return (
        <div className="w-full h-full flex flex-col relative bg-white rounded-3xl overflow-hidden shadow-2xl" ref={containerRef}>
            <canvas ref={canvasRef} className="absolute inset-0 z-10 touch-none cursor-crosshair bg-white" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} />
            {activeTool === 'BRAINSTORM' && (
                <div className="absolute top-10 right-10 z-20 w-80 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl animate-slide-left text-white">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-black text-indigo-400 flex items-center gap-2"><BrainCircuit size={18}/> عصف ذهني (AI)</h4>
                        <button onClick={()=>setActiveTool('PEN')}><X size={18}/></button>
                    </div>
                    <input className="w-full p-2 bg-white/10 border border-white/10 rounded-xl mb-3 text-xs outline-none" placeholder="موضوع العصف..." value={topic} onChange={e=>setTopic(e.target.value)} />
                    <button onClick={handleBrainstorm} disabled={isGenerating} className="w-full py-2 bg-indigo-600 rounded-xl text-xs font-bold mb-4 shadow-lg active:scale-95 transition-all">
                        {isGenerating ? <Loader2 className="animate-spin inline mr-2"/> : <Zap className="inline mr-2" size={14}/>} توليد الأفكار
                    </button>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar text-[10px] leading-relaxed opacity-90 prose prose-invert">
                        <ReactMarkdown>{aiIdeas}</ReactMarkdown>
                    </div>
                </div>
            )}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-slate-900/80 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
                <button onClick={() => setActiveTool('PEN')} className={`p-3 rounded-xl ${activeTool === 'PEN' ? 'bg-indigo-600' : 'hover:bg-white/10'}`}><PenTool size={20}/></button>
                <button onClick={() => setActiveTool('ERASER')} className={`p-3 rounded-xl ${activeTool === 'ERASER' ? 'bg-indigo-600' : 'hover:bg-white/10'}`}><Eraser size={20}/></button>
                <button onClick={() => setActiveTool('BRAINSTORM')} className={`p-3 rounded-xl ${activeTool === 'BRAINSTORM' ? 'bg-purple-600' : 'hover:bg-white/10'}`}><BrainCircuit size={20}/></button>
                <div className="w-px h-6 bg-white/10 self-center mx-1"></div>
                <button onClick={() => canvasRef.current?.getContext('2d')?.clearRect(0, 0, 5000, 5000)} className="p-3 rounded-xl hover:bg-red-500 transition-colors"><Trash2 size={20}/></button>
            </div>
        </div>
    );
};

const VibeMonitor = ({ selectedClass }: any) => {
    const [mood, setMood] = useState('FOCUSED');
    const [noise, setNoise] = useState(2);
    const [suggestion, setSuggestion] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAnalyze = async () => {
        setLoading(true);
        const res = await analyzeClassroomVibe({ noise, mood, topic: "الدرس الحالي" });
        setSuggestion(res);
        setLoading(false);
    };

    return (
        <div className="w-full max-w-2xl bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl animate-zoom-in">
            <h3 className="text-3xl font-black mb-8 flex items-center gap-3 text-indigo-400"><Activity size={32}/> مراقب نبض الفصل</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                <div className="space-y-6">
                    <label className="block text-sm font-black opacity-60 uppercase">مزاج الفصل الغالب</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['HAPPY','TIRED','FOCUSED','BORED'].map(m => (
                            <button key={m} onClick={()=>setMood(m)} className={`py-4 rounded-2xl border transition-all font-black text-xs ${mood===m ? 'bg-indigo-600 border-indigo-500 shadow-xl' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>{m}</button>
                        ))}
                    </div>
                </div>
                <div className="space-y-6">
                    <label className="block text-sm font-black opacity-60 uppercase">مستوى الضجيج في القاعة</label>
                    <input type="range" min="1" max="5" value={noise} onChange={e=>setNoise(Number(e.target.value))} className="w-full accent-indigo-500 h-2 bg-white/10 rounded-full" />
                    <div className="flex justify-between text-[10px] font-black opacity-40"><span>هدوء تام</span><span>ضجيج عالٍ</span></div>
                </div>
            </div>
            {suggestion && (
                <div className="mb-8 p-6 bg-indigo-600/20 border border-indigo-500/30 rounded-3xl animate-slide-up">
                    <h4 className="font-black text-indigo-400 mb-2 flex items-center gap-2"><Lightbulb size={18}/> توصية ذكية فورية:</h4>
                    <p className="text-lg leading-relaxed italic">"{suggestion}"</p>
                </div>
            )}
            <button onClick={handleAnalyze} disabled={loading} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex justify-center items-center gap-3">
                {loading ? <Loader2 className="animate-spin"/> : <Sparkles/>} حلل حالة الفصل الآن
            </button>
        </div>
    );
};

const QrAttendanceDisplay = ({ selectedClass }: any) => {
    return (
        <div className="flex flex-col items-center gap-8 animate-fade-in">
            <div className="bg-white p-10 rounded-[4rem] shadow-[0_0_80px_rgba(79,70,229,0.4)] relative">
                <div className="absolute -top-6 -right-6 bg-indigo-600 p-4 rounded-3xl shadow-xl animate-bounce"><QrCode size={32}/></div>
                <div className="w-64 h-64 bg-slate-100 rounded-3xl flex items-center justify-center border-8 border-slate-50">
                    <QrCode size={200} className="text-slate-900 opacity-80" />
                </div>
            </div>
            <div className="text-center space-y-4">
                <h3 className="text-3xl font-black">نظام التحضير الذاتي المباشر</h3>
                <p className="text-indigo-300 font-bold max-w-md mx-auto">امسح الكود عبر تطبيق "المتابع" لتسجيل حضورك في فصل <span className="text-white underline">{selectedClass}</span></p>
                <div className="flex items-center justify-center gap-3 bg-white/5 px-6 py-2 rounded-full border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-black opacity-60">الكود يتغير كل 30 ثانية للأمان</span>
                </div>
            </div>
        </div>
    );
};

const ClassroomTimer = () => {
    const [sec, setSec] = useState(300);
    const [active, setActive] = useState(false);
    useEffect(() => {
        let t: any;
        if(active && sec > 0) t = setInterval(()=>setSec((s:number)=>s-1), 1000);
        return () => clearInterval(t);
    }, [active, sec]);
    return (
        <div className="text-center">
            <div className={`text-9xl font-black font-mono mb-8 ${sec < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {Math.floor(sec/60)}:{(sec%60).toString().padStart(2,'0')}
            </div>
            <div className="flex gap-4 justify-center">
                <button onClick={()=>setActive(!active)} className={`p-6 rounded-full shadow-2xl transition-all ${active ? 'bg-red-600' : 'bg-green-600'}`}>{active ? <Pause size={40}/> : <Play size={40}/>}</button>
                <button onClick={()=>{setActive(false); setSec(300);}} className="p-6 bg-white/10 rounded-full hover:bg-white/20"><RefreshCw size={40}/></button>
            </div>
        </div>
    );
};

const GroupGenerator = ({ students }: any) => {
    const [groups, setGroups] = useState<any[][]>([]);
    const gen = () => {
        const sh = [...students].sort(()=>0.5-Math.random());
        const g: any[][] = [[], [], [], []];
        sh.forEach((s,i)=> g[i%4].push(s));
        setGroups(g);
    };
    return (
        <div className="w-full max-w-4xl h-full flex flex-col items-center gap-8">
            <button onClick={gen} className="bg-indigo-600 px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-indigo-700 transition-all">تقسيم المجموعات</button>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                {groups.map((group, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-slide-up" style={{animationDelay: `${i*0.1}s`}}>
                        <h4 className="text-yellow-400 font-bold mb-3 border-b border-white/10 pb-2 flex justify-between items-center">المجموعة {i+1} <Star size={12}/></h4>
                        <div className="space-y-1 text-xs">{group.map(s => <div key={s.id} className="opacity-80">• {s.name}</div>)}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const RewardsView = ({ students, onSaveAttendance, currentUser }: any) => {
    const handlePoint = (studentId: string) => {
        if(onSaveAttendance) onSaveAttendance([{ id: `rew_${Date.now()}`, studentId, date: new Date().toISOString().split('T')[0], status: AttendanceStatus.PRESENT, behaviorStatus: BehaviorStatus.POSITIVE, behaviorNote: 'تفاعل في الحصة', createdById: currentUser?.id }]);
    };
    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full h-full overflow-y-auto p-4 custom-scrollbar">
            {students.map((s: any) => (
                <div key={s.id} onClick={()=>handlePoint(s.id)} className="bg-white/5 border border-white/10 rounded-3xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-500/10 hover:border-yellow-500 transition-all active:scale-95 group shadow-xl">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-bold mb-2 group-hover:bg-yellow-500 group-hover:text-black transition-colors">{s.name.charAt(0)}</div>
                    <span className="text-[10px] font-bold text-center truncate w-full">{s.name}</span>
                </div>
            ))}
        </div>
    );
}

export default ClassroomScreen;
