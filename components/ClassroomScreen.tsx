import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, LessonLink, BehaviorStatus, SystemUser } from '../types';
import { Users, Shuffle, Clock, Grid, Play, Pause, RefreshCw, Trophy, Volume2, User, Maximize, AlertCircle, Monitor, X, Upload, Globe, ChevronLeft, ChevronRight, Minus, Plus, MousePointer2, StickyNote, BookOpen, PenTool, Eraser, Trash2, Image as ImageIcon, FileText, CheckCircle, Minimize, DoorOpen, HelpCircle, BrainCircuit, Loader2, Sparkles, Star, Siren, BarChart2, Check, Zap } from 'lucide-react';
import { getLessonLinks } from '../services/storageService';
import { generateSlideQuestions, suggestQuickActivity } from '../services/geminiService';

interface ClassroomScreenProps {
    students: Student[];
    attendance: AttendanceRecord[];
    onSaveAttendance?: (records: AttendanceRecord[]) => void;
    currentUser?: SystemUser | null;
}

const ClassroomScreen: React.FC<ClassroomScreenProps> = ({ students, attendance, onSaveAttendance, currentUser }) => {
    const [selectedClass, setSelectedClass] = useState('');
    const [activeTool, setActiveTool] = useState<'PICKER' | 'TIMER' | 'GROUPS' | 'PRESENTATION' | 'REWARDS'>('PRESENTATION');
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // --- Unique Classes ---
    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        students.forEach(s => { if (s.className) classes.add(s.className); });
        return Array.from(classes).sort();
    }, [students]);

    useEffect(() => {
        if (uniqueClasses.length > 0 && !selectedClass) {
            setSelectedClass(uniqueClasses[0]);
        }
    }, [uniqueClasses]);

    // Handle Fullscreen Toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.error(err));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    // Listen for fullscreen change (ESC key)
    useEffect(() => {
        const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleChange);
        return () => document.removeEventListener('fullscreenchange', handleChange);
    }, []);

    const filteredStudents = useMemo(() => {
        if (!selectedClass) return [];
        return students.filter(s => s.className === selectedClass);
    }, [selectedClass, students]);

    // Present Students Only
    const presentStudents = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return filteredStudents.filter(s => {
            const record = attendance.find(a => a.studentId === s.id && a.date === today);
            return !record || record.status !== AttendanceStatus.ABSENT;
        });
    }, [filteredStudents, attendance]);

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-900 text-white animate-fade-in relative overflow-hidden font-sans">
            {/* Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 z-0"></div>
            
            {/* Header / Controls */}
            <div className={`relative z-20 flex flex-col md:flex-row justify-between items-center bg-white/5 backdrop-blur-md border-b border-white/10 transition-all ${isFullscreen ? 'p-2' : 'p-4'}`}>
                <div className="flex items-center gap-4 mb-2 md:mb-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Monitor className="text-yellow-400"/> شاشة الفصل
                    </h2>
                    <select 
                        value={selectedClass} 
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="bg-black/30 border border-white/20 text-white rounded-lg px-4 py-2 font-bold outline-none focus:ring-2 focus:ring-yellow-400"
                    >
                        {uniqueClasses.map(c => <option key={c} value={c} className="text-black">{c}</option>)}
                    </select>
                    <span className="text-sm opacity-70">
                        ({presentStudents.length} حاضر)
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-black/30 p-1 rounded-xl overflow-x-auto max-w-full">
                        <button 
                            onClick={() => setActiveTool('PRESENTATION')}
                            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTool === 'PRESENTATION' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        >
                            <Monitor size={18}/> السبورة
                        </button>
                        <button 
                            onClick={() => setActiveTool('REWARDS')}
                            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTool === 'REWARDS' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        >
                            <Star size={18}/> التحفيز
                        </button>
                        <button 
                            onClick={() => setActiveTool('PICKER')}
                            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTool === 'PICKER' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        >
                            <Shuffle size={18}/> القرعة
                        </button>
                        <button 
                            onClick={() => setActiveTool('TIMER')}
                            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTool === 'TIMER' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        >
                            <Clock size={18}/> المؤقت
                        </button>
                        <button 
                            onClick={() => setActiveTool('GROUPS')}
                            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTool === 'GROUPS' ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                        >
                            <Grid size={18}/> المجموعات
                        </button>
                    </div>

                    <button 
                        onClick={toggleFullscreen}
                        className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                        title={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}
                    >
                        {isFullscreen ? <Minimize size={20}/> : <Maximize size={20}/>}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-6 overflow-hidden">
                {activeTool === 'PICKER' && <RandomPicker students={presentStudents} total={filteredStudents.length} />}
                {activeTool === 'TIMER' && <ClassroomTimer />}
                {activeTool === 'GROUPS' && <GroupGenerator students={presentStudents} />}
                {activeTool === 'REWARDS' && <RewardsView students={presentStudents} attendance={attendance} onSaveAttendance={onSaveAttendance} currentUser={currentUser} />}
                {activeTool === 'PRESENTATION' && <PresentationBoard students={presentStudents} total={filteredStudents.length} currentClass={selectedClass} />}
            </div>
        </div>
    );
};

// --- AUDIO SYNTHESIS UTILS ---
const playSoundEffect = (type: 'CORRECT' | 'WRONG' | 'CLAP' | 'BELL' | 'DRUM' | 'QUIET') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const t = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        switch (type) {
            case 'CORRECT': // Pleasant "Ding"
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, t); // A5
                osc.frequency.exponentialRampToValueAtTime(1760, t + 0.1); // A6
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
                osc.start(t);
                osc.stop(t + 0.5);
                break;
            
            case 'WRONG': // "Buzz"
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, t);
                osc.frequency.linearRampToValueAtTime(100, t + 0.3);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0.001, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;

            case 'BELL': // School Bell Simulation
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, t);
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
                osc.start(t);
                osc.stop(t + 2.0);
                break;

            case 'DRUM': // Deep thud
                osc.type = 'sine';
                osc.frequency.setValueAtTime(80, t);
                osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.3);
                gain.gain.setValueAtTime(0.5, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;

            case 'CLAP': // Short bursts of noise
                const count = 15;
                for(let i=0; i<count; i++) {
                    const cOsc = ctx.createOscillator();
                    const cGain = ctx.createGain();
                    cOsc.connect(cGain);
                    cGain.connect(ctx.destination);
                    cOsc.type = 'square';
                    cOsc.frequency.value = 100 + Math.random() * 200;
                    cGain.gain.setValueAtTime(0.05, t + i * 0.06);
                    cGain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.05);
                    cOsc.start(t + i * 0.06);
                    cOsc.stop(t + i * 0.06 + 0.05);
                }
                break;
                
            case 'QUIET': // Long soft tone
                osc.type = 'sine';
                osc.frequency.setValueAtTime(440, t);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0, t + 1.5);
                osc.start(t);
                osc.stop(t + 1.5);
                break;
        }
    } catch (e) {
        console.error("Audio playback error", e);
    }
};

// --- REWARDS VIEW ---
const RewardsView: React.FC<{ students: Student[], attendance: AttendanceRecord[], onSaveAttendance?: (records: AttendanceRecord[]) => void, currentUser?: SystemUser | null }> = ({ students, attendance, onSaveAttendance, currentUser }) => {
    const [points, setPoints] = useState<Record<string, number>>({});
    const [animatingStudent, setAnimatingStudent] = useState<string | null>(null);

    // Initial load of points for today
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const newPoints: Record<string, number> = {};
        
        students.forEach(s => {
            const studentRecords = attendance.filter(a => a.studentId === s.id && a.date === today && a.behaviorStatus === BehaviorStatus.POSITIVE);
            newPoints[s.id] = studentRecords.length;
        });
        setPoints(newPoints);
    }, [students, attendance]);

    const handleGivePoint = (studentId: string) => {
        setAnimatingStudent(studentId);
        playSoundEffect('CORRECT');
        setTimeout(() => setAnimatingStudent(null), 1000);

        setPoints(prev => ({ ...prev, [studentId]: (prev[studentId] || 0) + 1 }));

        if (onSaveAttendance) {
            const record: AttendanceRecord = {
                id: `${studentId}-reward-${Date.now()}`,
                studentId: studentId,
                date: new Date().toISOString().split('T')[0],
                status: AttendanceStatus.PRESENT,
                behaviorStatus: BehaviorStatus.POSITIVE,
                behaviorNote: 'نقطة تميز',
                createdById: currentUser?.id
            };
            onSaveAttendance([record]);
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-black text-yellow-400 drop-shadow-md">لوحة التميز والتحفيز</h3>
                <p className="text-white/60">اضغط على الطالب لمنحه نجمة</p>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
                    {students.map(s => {
                        const count = points[s.id] || 0;
                        const isAnimating = animatingStudent === s.id;
                        
                        return (
                            <div 
                                key={s.id}
                                onClick={() => handleGivePoint(s.id)}
                                className={`
                                    relative bg-white/10 border-2 border-white/10 rounded-2xl p-4 flex flex-col items-center justify-between h-40 cursor-pointer transition-all duration-200 hover:bg-white/20 hover:scale-105 active:scale-95 select-none
                                    ${isAnimating ? 'border-yellow-400 bg-yellow-500/20' : ''}
                                `}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-2 transition-transform ${isAnimating ? 'scale-125 bg-yellow-400 text-black' : 'bg-white/20 text-white'}`}>
                                    {s.name.charAt(0)}
                                </div>
                                
                                <div className="text-center">
                                    <h4 className="font-bold text-sm md:text-base line-clamp-1">{s.name}</h4>
                                    <div className="flex items-center justify-center gap-1 mt-2">
                                        <Star size={16} className={count > 0 ? "text-yellow-400 fill-yellow-400" : "text-white/20"}/>
                                        <span className="font-black text-xl text-yellow-400">{count}</span>
                                    </div>
                                </div>

                                {isAnimating && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-20"></div>
                                        <Star size={64} className="text-yellow-400 fill-yellow-400 animate-bounce drop-shadow-lg"/>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Sub-Component: Presentation Board with Handwriting & Multi-Screen ---

interface SlidePage {
    id: string;
    type: 'NONE' | 'IFRAME' | 'IMAGE' | 'PDF';
    contentUrl: string;
    drawingData?: string; // Base64 of the canvas
}

// Predefined Exit Ticket Questions
const EXIT_QUESTIONS = [
    "ما هو أهم شيء تعلمته اليوم؟",
    "شيء واحد لم تفهمه تماماً وتود مراجعته؟",
    "كيف يمكنك تطبيق درس اليوم في حياتك؟",
    "لخص درس اليوم في جملة واحدة.",
    "سؤال تود طرحه على المعلم؟",
    "قيم فهمك للدرس من 1 إلى 5 واشرح السبب.",
    "ما هي الكلمة المفتاحية في درس اليوم؟",
    "ارسم شكلاً يعبر عن فكرة الدرس."
];

interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
}

const PresentationBoard: React.FC<{ students: Student[], total: number, currentClass: string }> = ({ students, total, currentClass }) => {
    // Multi-Page State
    const [pages, setPages] = useState<SlidePage[]>([{ id: '1', type: 'NONE', contentUrl: '' }]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    // Inputs
    const [inputUrl, setInputUrl] = useState('');
    
    // Tools State
    const [activeFloatingTool, setActiveFloatingTool] = useState<'NONE' | 'TIMER' | 'PICKER' | 'SOUNDS' | 'NOTE' | 'PEN' | 'EXIT_TICKET' | 'AI_QUIZ' | 'HALL_PASS' | 'POLL' | 'TRAFFIC' | 'PANIC'>('NONE');
    const [laserMode, setLaserMode] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [lessonLinks, setLessonLinks] = useState<LessonLink[]>([]);
    const [classNote, setClassNote] = useState('');
    
    // Exit Ticket State
    const [exitQuestion, setExitQuestion] = useState(EXIT_QUESTIONS[0]);

    // AI Quiz State
    const [quizContext, setQuizContext] = useState('');
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [isQuizLoading, setIsQuizLoading] = useState(false);
    const [showAnswerFor, setShowAnswerFor] = useState<number | null>(null);

    // Panic Button State
    const [panicTopic, setPanicTopic] = useState('');
    const [panicSuggestion, setPanicSuggestion] = useState('');
    const [isPanicLoading, setIsPanicLoading] = useState(false);

    // Traffic Light State
    const [trafficLight, setTrafficLight] = useState<'RED'|'YELLOW'|'GREEN'>('GREEN');

    // Poll State
    const [pollVotes, setPollVotes] = useState({ A: 0, B: 0, C: 0, D: 0 });

    // Hall Pass State
    const [hallPasses, setHallPasses] = useState<{id: string, name: string, time: number}[]>([]);
    const [passStudentId, setPassStudentId] = useState('');

    // Drawing State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#ef4444'); // Default Red
    const [penSize, setPenSize] = useState(3);
    const [isEraser, setIsEraser] = useState(false);

    // Initialization
    useEffect(() => {
        setLessonLinks(getLessonLinks());
        const savedUrl = localStorage.getItem('last_presentation_url');
        if (savedUrl) setInputUrl(savedUrl);

        const allNotes = JSON.parse(localStorage.getItem('class_lesson_notes') || '{}');
        const noteKey = Object.keys(allNotes).find(k => k.startsWith(currentClass));
        if (noteKey && allNotes[noteKey]) setClassNote(allNotes[noteKey]);
        else setClassNote('');
    }, [currentClass]);

    // Resize Canvas on Window Resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current && canvasRef.current) {
                // Save current drawing
                const currentData = canvasRef.current.toDataURL();
                
                canvasRef.current.width = containerRef.current.clientWidth;
                canvasRef.current.height = containerRef.current.clientHeight;
                
                // Restore
                const img = new Image();
                img.src = currentData;
                img.onload = () => {
                    canvasRef.current?.getContext('2d')?.drawImage(img, 0, 0);
                }
            }
        };
        window.addEventListener('resize', handleResize);
        // Initial sizing
        setTimeout(handleResize, 100); 
        return () => window.removeEventListener('resize', handleResize);
    }, [currentPageIndex]); // Re-run when page changes to ensure correct sizing

    // --- CANVAS LOGIC ---
    // Load drawing when page changes
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous
            const savedData = pages[currentPageIndex].drawingData;
            if (savedData) {
                const img = new Image();
                img.src = savedData;
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                };
            }
        }
    }, [currentPageIndex]); // Only when index changes

    const saveCanvasToState = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL();
            setPages(prev => {
                const newPages = [...prev];
                newPages[currentPageIndex] = { ...newPages[currentPageIndex], drawingData: dataUrl };
                return newPages;
            });
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (activeFloatingTool !== 'PEN') return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        setIsDrawing(true);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX) - rect.left;
        const y = ('touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY) - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : penColor; // Eraser uses destination-out
        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
        ctx.lineWidth = isEraser ? 20 : penSize;
        ctx.lineCap = 'round';
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || activeFloatingTool !== 'PEN') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        const x = ('touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX) - rect.left;
        const y = ('touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY) - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            saveCanvasToState(); // Save to state on stroke end
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            saveCanvasToState();
        }
    };

    // --- NAVIGATION & CONTENT LOGIC ---
    const updateCurrentPageContent = (type: SlidePage['type'], url: string) => {
        setPages(prev => {
            const newPages = [...prev];
            newPages[currentPageIndex] = { ...newPages[currentPageIndex], type, contentUrl: url };
            return newPages;
        });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            updateCurrentPageContent(file.type === 'application/pdf' ? 'PDF' : 'IMAGE', url);
        }
    };

    const processUrl = (rawUrl: string) => {
        let url = rawUrl.trim();
        if (url.includes('sharepoint.com') || url.includes('onedrive.live.com') || url.includes('1drv.ms') || url.includes('office.com')) {
             if (!url.includes('action=embedview')) {
                 url = url.replace(/action=[^&]+/, '');
                 url += url.includes('?') ? '&action=embedview' : '?action=embedview';
             }
        }
        if (url.includes('docs.google.com/presentation') && !url.includes('/embed')) {
            url = url.replace('/edit', '/embed').replace('/pub', '/embed');
        }
        return url;
    }

    const handleUrlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const url = processUrl(inputUrl);
        localStorage.setItem('last_presentation_url', url);
        updateCurrentPageContent('IFRAME', url);
    };

    const handleLessonSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const url = e.target.value;
        if (!url) return;
        const processed = processUrl(url);
        setInputUrl(processed);
        updateCurrentPageContent('IFRAME', processed);
    };

    // Page Management
    const addNewPage = () => {
        setPages(prev => [...prev, { id: Date.now().toString(), type: 'NONE', contentUrl: '' }]);
        setCurrentPageIndex(prev => prev + 1);
    };

    const deleteCurrentPage = () => {
        if (pages.length === 1) {
            updateCurrentPageContent('NONE', '');
            clearCanvas();
            return;
        }
        setPages(prev => prev.filter((_, i) => i !== currentPageIndex));
        if (currentPageIndex >= pages.length - 1) setCurrentPageIndex(pages.length - 2);
    };

    const handleNoteChange = (newNote: string) => {
        setClassNote(newNote);
        const allNotes = JSON.parse(localStorage.getItem('class_lesson_notes') || '{}');
        allNotes[currentClass] = newNote; 
        localStorage.setItem('class_lesson_notes', JSON.stringify(allNotes));
    };

    const spinExitQuestion = () => {
        const randomIdx = Math.floor(Math.random() * EXIT_QUESTIONS.length);
        setExitQuestion(EXIT_QUESTIONS[randomIdx]);
    };

    // AI Quiz Generation
    const handleGenerateQuiz = async () => {
        setIsQuizLoading(true);
        setQuizQuestions([]);
        
        let imageBase64 = undefined;
        // If current page is Image, try to use it
        if (pages[currentPageIndex].type === 'IMAGE' && pages[currentPageIndex].contentUrl) {
            try {
                // Fetch blob and convert to base64
                const response = await fetch(pages[currentPageIndex].contentUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                imageBase64 = await new Promise<string>((resolve) => {
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.error("Failed to process image for AI", e);
            }
        }

        const questions = await generateSlideQuestions(quizContext, imageBase64);
        setQuizQuestions(questions);
        setIsQuizLoading(false);
    };

    // Panic Button Handler
    const handlePanic = async () => {
        setIsPanicLoading(true);
        const result = await suggestQuickActivity(panicTopic, 'General'); // Use class grade if available in prop
        setPanicSuggestion(result);
        setIsPanicLoading(false);
    }

    // Hall Pass Handlers
    const issuePass = () => {
        const student = students.find(s => s.id === passStudentId);
        if (student) {
            setHallPasses(prev => [...prev, { id: Date.now().toString(), name: student.name, time: Date.now() }]);
            setPassStudentId('');
        }
    }

    // Poll Handlers
    const vote = (opt: 'A'|'B'|'C'|'D') => setPollVotes(prev => ({ ...prev, [opt]: prev[opt] + 1 }));
    const resetPoll = () => setPollVotes({ A: 0, B: 0, C: 0, D: 0 });

    const currentPage = pages[currentPageIndex];

    return (
        <div className="w-full h-full flex flex-col relative bg-slate-100 rounded-2xl overflow-hidden shadow-2xl">
            
            {/* LASER OVERLAY */}
            {laserMode && (
                <div 
                    className="fixed inset-0 z-[100] cursor-none"
                    onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                    onClick={() => setLaserMode(false)}
                >
                    <div 
                        className="fixed w-4 h-4 bg-red-600 rounded-full shadow-[0_0_15px_2px_rgba(255,0,0,0.8)] pointer-events-none transition-transform duration-75"
                        style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}
                    />
                </div>
            )}

            {/* MAIN STAGE */}
            <div className="flex-1 relative group" ref={containerRef}>
                
                {/* 1. Background Content Layer */}
                <div className="absolute inset-0 z-0 bg-white flex items-center justify-center">
                    {currentPage.type === 'NONE' && (
                        <div className="text-center p-8 animate-fade-in w-full h-full flex flex-col items-center justify-center bg-slate-50">
                            <div className="bg-white p-6 rounded-full inline-flex mb-6 shadow-sm border border-slate-200">
                                <Monitor size={48} className="text-indigo-400 opacity-80"/>
                            </div>
                            <h2 className="text-xl font-bold mb-6 text-slate-700">شاشة {currentPageIndex + 1} فارغة</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl w-full">
                                <div className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors shadow-sm">
                                    <h3 className="font-bold mb-3 flex items-center justify-center gap-2 text-slate-700 text-sm"><Upload size={16}/> رفع ملف (PDF/Image)</h3>
                                    <label className="block w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg cursor-pointer font-bold transition-colors text-center text-xs">
                                        استعراض...
                                        <input type="file" accept="application/pdf, image/*" className="hidden" onChange={handleFileUpload}/>
                                    </label>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors shadow-sm">
                                    <h3 className="font-bold mb-3 flex items-center justify-center gap-2 text-slate-700 text-sm"><Globe size={16}/> درس محفوظ / رابط</h3>
                                    <div className="space-y-2">
                                        {lessonLinks.length > 0 && (
                                            <select 
                                                onChange={handleLessonSelect} 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none cursor-pointer"
                                            >
                                                <option value="">-- اختر درس --</option>
                                                {lessonLinks.map(l => <option key={l.id} value={l.url}>{l.title}</option>)}
                                            </select>
                                        )}
                                        <form onSubmit={handleUrlSubmit} className="flex gap-1">
                                            <input 
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs outline-none dir-ltr text-left"
                                                placeholder="Link..."
                                                value={inputUrl}
                                                onChange={e => setInputUrl(e.target.value)}
                                            />
                                            <button className="bg-indigo-600 p-1.5 rounded text-white hover:bg-indigo-700"><CheckCircle size={14}/></button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {currentPage.type === 'PDF' && <iframe src={currentPage.contentUrl} className="w-full h-full border-none" title="PDF"></iframe>}
                    {currentPage.type === 'IFRAME' && <iframe src={currentPage.contentUrl} className="w-full h-full border-none" title="Web" allowFullScreen allow="autoplay"></iframe>}
                    {currentPage.type === 'IMAGE' && <img src={currentPage.contentUrl} className="w-full h-full object-contain" alt="Slide"/>}
                </div>

                {/* 2. Canvas Layer (Handwriting) */}
                <canvas 
                    ref={canvasRef}
                    className={`absolute inset-0 z-10 touch-none ${activeFloatingTool === 'PEN' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />

                {/* Clear Content Button (Top Right) */}
                {currentPage.type !== 'NONE' && (
                    <button 
                        onClick={() => { updateCurrentPageContent('NONE', ''); clearCanvas(); }}
                        className="absolute top-4 right-4 z-20 bg-red-600/80 hover:bg-red-700 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        title="مسح المحتوى"
                    >
                        <Trash2 size={16}/>
                    </button>
                )}
            </div>

            {/* BOTTOM NAVIGATION BAR */}
            <div className="h-16 bg-white border-t border-gray-200 flex items-center justify-between px-4 z-30">
                
                {/* Slide Controls */}
                <div className="flex items-center gap-2">
                    <button onClick={addNewPage} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700" title="صفحة جديدة"><Plus size={20}/></button>
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                        <button onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))} disabled={currentPageIndex === 0} className="p-1.5 hover:bg-white rounded disabled:opacity-30"><ChevronRight size={20}/></button>
                        <span className="px-3 font-bold font-mono text-gray-700">{currentPageIndex + 1} / {pages.length}</span>
                        <button onClick={() => setCurrentPageIndex(Math.min(pages.length - 1, currentPageIndex + 1))} disabled={currentPageIndex === pages.length - 1} className="p-1.5 hover:bg-white rounded disabled:opacity-30"><ChevronLeft size={20}/></button>
                    </div>
                    <button onClick={deleteCurrentPage} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="حذف الصفحة"><Trash2 size={20}/></button>
                </div>

                {/* Pen Controls (Visible when Pen Active) */}
                {activeFloatingTool === 'PEN' && (
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full animate-fade-in shadow-inner">
                        <button onClick={() => {setIsEraser(false); setPenColor('#000000')}} className={`w-6 h-6 rounded-full bg-black border-2 ${!isEraser && penColor==='#000000' ? 'border-indigo-500 scale-110' : 'border-white'}`}></button>
                        <button onClick={() => {setIsEraser(false); setPenColor('#ef4444')}} className={`w-6 h-6 rounded-full bg-red-500 border-2 ${!isEraser && penColor==='#ef4444' ? 'border-indigo-500 scale-110' : 'border-white'}`}></button>
                        <button onClick={() => {setIsEraser(false); setPenColor('#22c55e')}} className={`w-6 h-6 rounded-full bg-green-500 border-2 ${!isEraser && penColor==='#22c55e' ? 'border-indigo-500 scale-110' : 'border-white'}`}></button>
                        <button onClick={() => {setIsEraser(false); setPenColor('#3b82f6')}} className={`w-6 h-6 rounded-full bg-blue-500 border-2 ${!isEraser && penColor==='#3b82f6' ? 'border-indigo-500 scale-110' : 'border-white'}`}></button>
                        <div className="w-[1px] h-6 bg-gray-300 mx-1"></div>
                        <button onClick={() => setIsEraser(!isEraser)} className={`p-1.5 rounded ${isEraser ? 'bg-indigo-200 text-indigo-800' : 'text-gray-500 hover:bg-gray-200'}`} title="ممحاة"><Eraser size={18}/></button>
                        <button onClick={clearCanvas} className="p-1.5 text-red-500 hover:bg-red-100 rounded" title="مسح الرسم"><Trash2 size={18}/></button>
                    </div>
                )}

                {/* Main Toolbar */}
                <div className="flex items-center gap-2">
                    <div className="bg-slate-900 p-1.5 rounded-xl flex items-center gap-1 shadow-lg">
                        <ToolBtn icon={<PenTool size={20}/>} active={activeFloatingTool === 'PEN'} onClick={() => setActiveFloatingTool(activeFloatingTool === 'PEN' ? 'NONE' : 'PEN')} label="قلم" />
                        <div className="w-[1px] h-6 bg-white/20 mx-1"></div>
                        <ToolBtn icon={<Shuffle size={20}/>} active={activeFloatingTool === 'PICKER'} onClick={() => setActiveFloatingTool(activeFloatingTool === 'PICKER' ? 'NONE' : 'PICKER')} />
                        <ToolBtn icon={<Clock size={20}/>} active={activeFloatingTool === 'TIMER'} onClick={() => setActiveFloatingTool(activeFloatingTool === 'TIMER' ? 'NONE' : 'TIMER')} />
                        <ToolBtn icon={<Volume2 size={20}/>} active={activeFloatingTool === 'SOUNDS'} onClick={() => setActiveFloatingTool(activeFloatingTool === 'SOUNDS' ? 'NONE' : 'SOUNDS')} />
                        <ToolBtn icon={<DoorOpen size={20}/>} active={activeFloatingTool === 'HALL_PASS'} onClick={() => setActiveFloatingTool(activeFloatingTool === 'HALL_PASS' ? 'NONE' : 'HALL_PASS')} label="خروج" />
                        <ToolBtn icon={<AlertCircle size={20}/>} active={activeFloatingTool === 'TRAFFIC'} onClick={() => setActiveFloatingTool(activeFloatingTool === 'TRAFFIC' ? 'NONE' : 'TRAFFIC')} label="انتباه" />
                        <ToolBtn icon={<BarChart2 size={20}/>} active={activeFloatingTool === 'POLL'} onClick={() => setActiveFloatingTool(activeFloatingTool === 'POLL' ? 'NONE' : 'POLL')} label="تصويت" />
                        <div className="w-[1px] h-6 bg-white/20 mx-1"></div>
                        <ToolBtn icon={<Siren size={20}/>} active={activeFloatingTool === 'PANIC'} onClick={() => setActiveFloatingTool(activeFloatingTool === 'PANIC' ? 'NONE' : 'PANIC')} label="طوارئ" color="red" />
                        <ToolBtn icon={<BrainCircuit size={20}/>} active={activeFloatingTool === 'AI_QUIZ'} onClick={() => setActiveFloatingTool(activeFloatingTool === 'AI_QUIZ' ? 'NONE' : 'AI_QUIZ')} label="مسابقة AI" />
                        <ToolBtn icon={<MousePointer2 size={20}/>} active={laserMode} onClick={() => setLaserMode(!laserMode)} color="red" />
                        <ToolBtn icon={<StickyNote size={20}/>} active={activeFloatingTool === 'NOTE'} onClick={() => setActiveFloatingTool(activeFloatingTool === 'NOTE' ? 'NONE' : 'NOTE')} />
                    </div>
                </div>
            </div>

            {/* OVERLAY WIDGETS (Popups) */}
            {activeFloatingTool !== 'NONE' && activeFloatingTool !== 'PEN' && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
                    <div className="relative bg-slate-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden min-w-[320px] max-w-md">
                        <button onClick={() => setActiveFloatingTool('NONE')} className="absolute top-2 right-2 text-gray-400 hover:text-white z-10"><X size={16}/></button>

                        {/* --- WIDGETS --- */}
                        {activeFloatingTool === 'PICKER' && (
                            <div className="p-4">
                                <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2"><Shuffle size={16}/> الاختيار العشوائي</h4>
                                <div className="scale-75 origin-top"><RandomPicker students={students} total={total} /></div>
                            </div>
                        )}

                        {activeFloatingTool === 'TIMER' && (
                            <div className="p-4">
                                <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><Clock size={16}/> المؤقت</h4>
                                <div className="scale-75 origin-top"><ClassroomTimer /></div>
                            </div>
                        )}

                        {activeFloatingTool === 'TRAFFIC' && (
                            <div className="p-4">
                                <h4 className="text-white font-bold mb-3 flex items-center gap-2"><AlertCircle size={16}/> إشارة الانضباط</h4>
                                <div className="flex justify-center gap-4 bg-black/20 p-4 rounded-xl">
                                    <div onClick={() => setTrafficLight('RED')} className={`w-12 h-12 rounded-full border-2 cursor-pointer transition-all ${trafficLight === 'RED' ? 'bg-red-600 border-white scale-110 shadow-lg shadow-red-500/50' : 'bg-red-900/50 border-red-900'}`}></div>
                                    <div onClick={() => setTrafficLight('YELLOW')} className={`w-12 h-12 rounded-full border-2 cursor-pointer transition-all ${trafficLight === 'YELLOW' ? 'bg-yellow-400 border-white scale-110 shadow-lg shadow-yellow-500/50' : 'bg-yellow-900/50 border-yellow-900'}`}></div>
                                    <div onClick={() => setTrafficLight('GREEN')} className={`w-12 h-12 rounded-full border-2 cursor-pointer transition-all ${trafficLight === 'GREEN' ? 'bg-green-500 border-white scale-110 shadow-lg shadow-green-500/50' : 'bg-green-900/50 border-green-900'}`}></div>
                                </div>
                            </div>
                        )}

                        {activeFloatingTool === 'POLL' && (
                            <div className="p-4">
                                <h4 className="text-blue-300 font-bold mb-3 flex items-center gap-2"><BarChart2 size={16}/> تصويت سريع</h4>
                                <div className="flex gap-2 items-end h-32 mb-2">
                                    {['A', 'B', 'C', 'D'].map(opt => {
                                        const totalVotes = Object.values(pollVotes).reduce((a: number, b: number) => a + b, 0);
                                        const count = pollVotes[opt as keyof typeof pollVotes];
                                        const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                                        return (
                                            <div key={opt} className="flex-1 flex flex-col justify-end h-full gap-1">
                                                <div className="text-center text-xs text-gray-400 font-bold">{count}</div>
                                                <div 
                                                    className="w-full rounded-t bg-blue-500 transition-all duration-300" 
                                                    style={{ height: `${Math.max(5, pct)}%` }}
                                                ></div>
                                                <button onClick={() => vote(opt as any)} className="w-full py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-bold">{opt}</button>
                                            </div>
                                        )
                                    })}
                                </div>
                                <button onClick={resetPoll} className="w-full py-1 text-xs text-gray-400 hover:text-white">إعادة تعيين</button>
                            </div>
                        )}

                        {activeFloatingTool === 'HALL_PASS' && (
                            <div className="p-4 min-w-[300px]">
                                <h4 className="text-orange-400 font-bold mb-3 flex items-center gap-2"><DoorOpen size={16}/> تصريح خروج</h4>
                                <div className="flex gap-2 mb-3">
                                    <select 
                                        className="flex-1 bg-black/30 border border-white/20 rounded text-sm p-1.5 outline-none"
                                        value={passStudentId}
                                        onChange={e => setPassStudentId(e.target.value)}
                                    >
                                        <option value="">اختر الطالب...</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <button onClick={issuePass} disabled={!passStudentId} className="bg-orange-500 text-white px-3 py-1.5 rounded text-sm font-bold disabled:opacity-50">خروج</button>
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {hallPasses.length > 0 ? hallPasses.map(p => (
                                        <div key={p.id} className="bg-white/10 p-2 rounded flex justify-between items-center text-sm">
                                            <span>{p.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-400">{Math.floor((Date.now() - p.time) / 60000)} د</span>
                                                <button onClick={() => setHallPasses(prev => prev.filter(x => x.id !== p.id))} className="text-red-400 hover:text-red-300">عودة</button>
                                            </div>
                                        </div>
                                    )) : <div className="text-center text-gray-500 text-xs py-4">الجميع في الفصل</div>}
                                </div>
                            </div>
                        )}

                        {activeFloatingTool === 'PANIC' && (
                            <div className="p-6 bg-red-900/90 text-white min-w-[350px]">
                                <h4 className="text-red-200 font-bold mb-4 flex items-center gap-2">
                                    <Siren size={20} className="animate-pulse"/> نشاط سريع (Panic Button)
                                </h4>
                                <p className="text-xs text-red-100 mb-4 opacity-80">انتهى الدرس مبكراً؟ دع الذكاء الاصطناعي يقترح لعبة أو لغزاً فورياً.</p>
                                
                                {panicSuggestion ? (
                                    <div className="bg-black/30 p-4 rounded-xl border border-red-500/30 mb-4 text-sm leading-relaxed whitespace-pre-line animate-fade-in">
                                        {panicSuggestion}
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <input 
                                            className="w-full bg-black/30 border border-red-500/30 rounded p-2 text-sm text-white placeholder-red-300/50 outline-none focus:border-red-400"
                                            placeholder="موضوع الدرس (اختياري)..."
                                            value={panicTopic}
                                            onChange={e => setPanicTopic(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <button 
                                        onClick={handlePanic}
                                        disabled={isPanicLoading}
                                        className="flex-1 bg-white text-red-900 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        {isPanicLoading ? <Loader2 className="animate-spin"/> : <Zap size={18} fill="currentColor"/>}
                                        {isPanicLoading ? 'جاري البحث...' : 'اقترح نشاطاً فوراً'}
                                    </button>
                                    {panicSuggestion && (
                                        <button onClick={() => setPanicSuggestion('')} className="px-3 bg-red-800 hover:bg-red-700 rounded-xl text-white">
                                            جديد
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeFloatingTool === 'SOUNDS' && (
                            <div className="p-4">
                                <h4 className="text-pink-400 font-bold mb-4 flex items-center gap-2"><Volume2 size={16}/> المؤثرات</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'CLAP', label: '👏 تصفيق' }, 
                                        { id: 'CORRECT', label: '✅ صحيح' }, 
                                        { id: 'WRONG', label: '❌ خطأ' }, 
                                        { id: 'DRUM', label: '🥁 طبلة' }, 
                                        { id: 'QUIET', label: '🤫 هدوء' }, 
                                        { id: 'BELL', label: '🔔 جرس' }
                                    ].map((s) => (
                                        <button 
                                            key={s.id} 
                                            onClick={() => playSoundEffect(s.id as any)}
                                            className="bg-white/10 hover:bg-white/20 p-3 rounded text-xs font-bold text-white transition-colors border border-white/5 active:bg-white/30"
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* --- EXIT TICKET WIDGET --- */}
                        {activeFloatingTool === 'EXIT_TICKET' && (
                            <div className="p-6 bg-teal-900 text-white min-w-[350px]">
                                <h4 className="text-teal-400 font-bold mb-4 flex items-center gap-2">
                                    <DoorOpen size={18}/> بطاقة الخروج (Exit Ticket)
                                </h4>
                                
                                <div className="bg-white/10 p-4 rounded-xl border border-white/10 min-h-[120px] flex items-center justify-center text-center relative mb-4">
                                    <p className="text-xl font-bold leading-relaxed">{exitQuestion}</p>
                                    <HelpCircle className="absolute top-2 right-2 text-white/20" size={24}/>
                                </div>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={spinExitQuestion}
                                        className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Shuffle size={16}/> سؤال عشوائي
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const q = prompt("أدخل سؤال الخروج:");
                                            if(q) setExitQuestion(q);
                                        }}
                                        className="px-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                        title="كتابة سؤال"
                                    >
                                        <PenTool size={16}/>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* --- AI QUIZ WIDGET --- */}
                        {activeFloatingTool === 'AI_QUIZ' && (
                            <div className="p-6 bg-purple-900 text-white min-w-[380px] max-w-lg">
                                <h4 className="text-purple-300 font-bold mb-4 flex items-center gap-2">
                                    <BrainCircuit size={18}/> مسابقة من العرض (AI)
                                </h4>

                                {quizQuestions.length === 0 ? (
                                    <div className="space-y-4">
                                        {pages[currentPageIndex].type === 'IMAGE' ? (
                                            <div className="bg-white/10 p-3 rounded-lg border border-white/10 text-xs text-purple-200">
                                                سيتم تحليل الصورة الحالية في الشاشة لتوليد أسئلة.
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-300 mb-1">موضوع الأسئلة (أو اترك فارغاً لأسئلة عامة)</label>
                                                <input 
                                                    className="w-full p-2 rounded bg-black/30 border border-white/10 text-white text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                                                    placeholder="مثال: الجملة الاسمية، قانون نيوتن..."
                                                    value={quizContext}
                                                    onChange={e => setQuizContext(e.target.value)}
                                                />
                                            </div>
                                        )}
                                        
                                        <button 
                                            onClick={handleGenerateQuiz}
                                            disabled={isQuizLoading}
                                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {isQuizLoading ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>}
                                            {isQuizLoading ? 'جاري التحليل...' : 'توليد الأسئلة'}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="max-h-60 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                                            {quizQuestions.map((q, idx) => (
                                                <div key={idx} className="bg-white/10 p-4 rounded-xl border border-white/10 relative">
                                                    <div className="font-bold mb-3 text-sm">{idx + 1}. {q.question}</div>
                                                    <div className="space-y-1">
                                                        {q.options.map((opt, i) => (
                                                            <div 
                                                                key={i} 
                                                                className={`p-2 rounded text-xs flex justify-between items-center ${showAnswerFor === idx && opt === q.correctAnswer ? 'bg-green-600 text-white font-bold' : 'bg-black/20 text-gray-300'}`}
                                                            >
                                                                <span>{opt}</span>
                                                                {showAnswerFor === idx && opt === q.correctAnswer && <CheckCircle size={14}/>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <button 
                                                        onClick={() => setShowAnswerFor(showAnswerFor === idx ? null : idx)}
                                                        className="mt-3 text-xs text-purple-300 hover:text-white underline"
                                                    >
                                                        {showAnswerFor === idx ? 'إخفاء الإجابة' : 'عرض الإجابة'}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => setQuizQuestions([])}
                                            className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-sm"
                                        >
                                            إنشاء اختبار جديد
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeFloatingTool === 'NOTE' && (
                            <div className="p-4 bg-yellow-100 min-w-[300px]">
                                <h4 className="text-yellow-800 font-bold mb-2 flex items-center gap-2 justify-between">
                                    <span className="flex items-center gap-2"><StickyNote size={16}/> ملاحظات</span>
                                    <span className="text-[10px] bg-yellow-200 px-2 py-0.5 rounded text-yellow-900">حفظ تلقائي</span>
                                </h4>
                                <textarea
                                    className="w-full h-40 bg-yellow-50 border border-yellow-200 rounded p-2 text-gray-800 text-sm outline-none resize-none focus:ring-2 focus:ring-yellow-300"
                                    placeholder="اكتب ملاحظات الدرس هنا..."
                                    value={classNote}
                                    onChange={(e) => handleNoteChange(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ... existing code for ToolBtn ...
const ToolBtn = ({ icon, active, onClick, color, label }: any) => (
    <button 
        onClick={onClick}
        className={`p-2.5 rounded-lg transition-all flex flex-col items-center justify-center ${active ? (color === 'red' ? 'bg-red-600 text-white shadow-lg shadow-red-500/50' : 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/50') : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
        title={label}
    >
        {icon}
    </button>
);

// ... existing code for RandomPicker ...
const RandomPicker: React.FC<{ students: Student[], total: number }> = ({ students, total }) => {
    const [currentName, setCurrentName] = useState('???');
    const [isRolling, setIsRolling] = useState(false);
    const [winner, setWinner] = useState<Student | null>(null);
    const intervalRef = useRef<number | null>(null);

    const startRoll = () => {
        if (students.length === 0) return;
        setIsRolling(true);
        setWinner(null);
        
        // Rolling Animation
        intervalRef.current = window.setInterval(() => {
            const randomIdx = Math.floor(Math.random() * students.length);
            setCurrentName(students[randomIdx].name);
        }, 100);

        // Stop after 2 seconds
        setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            const finalIdx = Math.floor(Math.random() * students.length);
            setWinner(students[finalIdx]);
            setCurrentName(students[finalIdx].name);
            setIsRolling(false);
            playSoundEffect('CORRECT');
        }, 2000);
    };

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-3xl">
            {students.length < total && (
                <div className="bg-red-500/20 text-red-200 px-4 py-2 rounded-full mb-4 flex items-center gap-2 text-sm backdrop-blur-sm border border-red-500/30">
                    <AlertCircle size={16}/> تم استبعاد {total - students.length} طلاب غائبين
                </div>
            )}

            <div className={`
                relative w-full aspect-video md:aspect-[21/9] bg-white/10 rounded-3xl border-4 flex items-center justify-center transition-all duration-300 backdrop-blur-sm
                ${winner ? 'border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.3)] scale-105' : 'border-white/20'}
            `}>
                <h1 className={`font-black text-center transition-all duration-100 ${winner ? 'text-6xl md:text-8xl text-yellow-400 drop-shadow-lg' : 'text-5xl md:text-7xl text-white/80'}`}>
                    {students.length > 0 ? currentName : 'لا يوجد طلاب حاضرين'}
                </h1>
                
                {winner && !isRolling && (
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 animate-bounce">
                        <Trophy size={64} className="text-yellow-400 fill-yellow-400"/>
                    </div>
                )}
            </div>

            <button 
                onClick={startRoll}
                disabled={isRolling || students.length === 0}
                className="mt-12 px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-2xl rounded-full shadow-xl transform active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Shuffle size={32}/> {isRolling ? 'جاري الاختيار...' : 'اختر طالب'}
            </button>
        </div>
    );
};

// ... existing code for Timer ...
const ClassroomTimer = () => {
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes default
    const [isActive, setIsActive] = useState(false);
    const [initialTime, setInitialTime] = useState(300);

    useEffect(() => {
        let interval: number;
        if (isActive && timeLeft > 0) {
            interval = window.setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if(initialTime > 0) playSoundEffect('BELL');
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, initialTime]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const setTime = (mins: number) => {
        setIsActive(false);
        setInitialTime(mins * 60);
        setTimeLeft(mins * 60);
    };

    const progress = (timeLeft / initialTime) * 100;
    const color = timeLeft < 30 ? 'text-red-500' : timeLeft < 60 ? 'text-orange-400' : 'text-white';

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 md:w-96 md:h-96 flex items-center justify-center">
                {/* Circular Progress (SVG) */}
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                    <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="15" fill="transparent" className="text-white/10" />
                    <circle 
                        cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="15" fill="transparent" 
                        className={timeLeft < 30 ? 'text-red-500 transition-all duration-1000' : 'text-blue-500 transition-all duration-1000'}
                        strokeDasharray={2 * Math.PI * (0.45 * 300)} // Approx calculation, adjusted visually
                        strokeDashoffset={0} // Simplified for CSS based control usually, but here fixed
                        pathLength={100}
                        style={{ strokeDasharray: 100, strokeDashoffset: 100 - progress }}
                        strokeLinecap="round"
                    />
                </svg>
                <div className={`text-6xl md:text-8xl font-mono font-bold ${color}`}>
                    {formatTime(timeLeft)}
                </div>
            </div>

            <div className="flex gap-4 mt-8">
                <button onClick={() => setIsActive(!isActive)} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}`}>
                    {isActive ? <Pause size={32}/> : <Play size={32} className="ml-1"/>}
                </button>
                <button onClick={() => { setIsActive(false); setTimeLeft(initialTime); }} className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all">
                    <RefreshCw size={28}/>
                </button>
            </div>

            <div className="flex gap-2 mt-8">
                {[1, 5, 10, 15, 30].map(m => (
                    <button key={m} onClick={() => setTime(m)} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors">
                        {m} د
                    </button>
                ))}
            </div>
        </div>
    );
};

// ... existing code for GroupGenerator ...
const GroupGenerator: React.FC<{ students: Student[] }> = ({ students }) => {
    const [groupCount, setGroupCount] = useState(4);
    const [groups, setGroups] = useState<Student[][]>([]);

    const generateGroups = () => {
        if (students.length === 0) return;
        
        // Shuffle
        const shuffled = [...students].sort(() => 0.5 - Math.random());
        const newGroups: Student[][] = Array.from({ length: groupCount }, () => []);

        shuffled.forEach((student, index) => {
            newGroups[index % groupCount].push(student);
        });

        setGroups(newGroups);
        playSoundEffect('CORRECT');
    };

    return (
        <div className="w-full max-w-6xl flex flex-col h-full">
            <div className="flex justify-center items-center gap-4 mb-8">
                <span className="font-bold text-lg">عدد المجموعات:</span>
                <div className="flex items-center bg-white/10 rounded-lg p-1">
                    <button onClick={() => setGroupCount(Math.max(2, groupCount - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-md text-xl font-bold">-</button>
                    <span className="w-12 text-center font-bold text-2xl">{groupCount}</span>
                    <button onClick={() => setGroupCount(Math.min(10, groupCount + 1))} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-md text-xl font-bold">+</button>
                </div>
                <button onClick={generateGroups} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg flex items-center gap-2">
                    <Grid size={20}/> توزيع المجموعات
                </button>
            </div>

            {groups.length > 0 ? (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                        {groups.map((group, idx) => (
                            <div key={idx} className="bg-white/10 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm">
                                <div className="bg-white/10 p-3 text-center font-bold text-lg text-green-300">
                                    المجموعة {idx + 1}
                                </div>
                                <div className="p-4 space-y-2">
                                    {group.map(s => (
                                        <div key={s.id} className="flex items-center gap-2 text-sm">
                                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                                                {s.name.charAt(0)}
                                            </div>
                                            {s.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-white/30">
                    <Grid size={64} className="mb-4 opacity-50"/>
                    <p className="text-xl">
                        {students.length > 0 ? 'اضغط "توزيع المجموعات" للبدء' : 'لا يوجد طلاب حاضرين للتوزيع'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ClassroomScreen;
