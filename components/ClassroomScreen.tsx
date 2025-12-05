
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student, AttendanceRecord, AttendanceStatus } from '../types';
import { Users, Shuffle, Clock, Grid, Play, Pause, RefreshCw, Trophy, Volume2, User, Maximize, AlertCircle, Monitor, X, Upload, Globe, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';

interface ClassroomScreenProps {
    students: Student[];
    attendance: AttendanceRecord[];
}

const ClassroomScreen: React.FC<ClassroomScreenProps> = ({ students, attendance }) => {
    const [selectedClass, setSelectedClass] = useState('');
    const [activeTool, setActiveTool] = useState<'PICKER' | 'TIMER' | 'GROUPS' | 'PRESENTATION'>('PRESENTATION');
    
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
        <div className="h-full flex flex-col bg-slate-900 text-white animate-fade-in relative overflow-hidden">
            {/* Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 z-0"></div>
            
            {/* Header / Controls */}
            <div className="relative z-20 p-4 flex flex-col md:flex-row justify-between items-center bg-white/5 backdrop-blur-md border-b border-white/10">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Maximize className="text-yellow-400"/> شاشة الفصل
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

                <div className="flex bg-black/30 p-1 rounded-xl overflow-x-auto max-w-full">
                    <button 
                        onClick={() => setActiveTool('PRESENTATION')}
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTool === 'PRESENTATION' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                    >
                        <Monitor size={18}/> العرض والسبورة
                    </button>
                    <button 
                        onClick={() => setActiveTool('PICKER')}
                        className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTool === 'PICKER' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
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
            </div>

            {/* Main Content Area */}
            <div className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden">
                {activeTool === 'PICKER' && <RandomPicker students={presentStudents} total={filteredStudents.length} />}
                {activeTool === 'TIMER' && <ClassroomTimer />}
                {activeTool === 'GROUPS' && <GroupGenerator students={presentStudents} />}
                {activeTool === 'PRESENTATION' && <PresentationBoard students={presentStudents} total={filteredStudents.length} />}
            </div>
        </div>
    );
};

// --- Sub-Component: Presentation Board with Floating Tools ---
const PresentationBoard: React.FC<{ students: Student[], total: number }> = ({ students, total }) => {
    const [sourceType, setSourceType] = useState<'NONE' | 'IFRAME' | 'IMAGE' | 'PDF'>('NONE');
    const [sourceUrl, setSourceUrl] = useState<string>('');
    const [inputUrl, setInputUrl] = useState('');
    const [activeFloatingTool, setActiveFloatingTool] = useState<'NONE' | 'TIMER' | 'PICKER' | 'SOUNDS'>('NONE');

    // Handle File Upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setSourceUrl(url);
            if (file.type === 'application/pdf') setSourceType('PDF');
            else if (file.type.startsWith('image/')) setSourceType('IMAGE');
            else alert('يرجى اختيار ملف PDF أو صورة');
        }
    };

    const handleUrlSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simple logic to detect if it needs embed processing
        let url = inputUrl.trim();
        
        // Handle SharePoint / Office Online links (Naive check)
        if (url.includes('sharepoint.com') || url.includes('onedrive.live.com')) {
             // Try to append embed params if missing (often users copy the edit link)
             // This is a best-effort guess. Often 'action=embedview' works for PPT online.
             if (!url.includes('action=')) {
                 url += url.includes('?') ? '&action=embedview' : '?action=embedview';
             }
        }
        // Handle Google Slides
        if (url.includes('docs.google.com/presentation') && !url.includes('/embed')) {
            url = url.replace('/edit', '/embed').replace('/pub', '/embed');
        }

        setSourceUrl(url);
        setSourceType('IFRAME');
    };

    return (
        <div className="w-full h-full flex flex-col relative">
            
            {/* Main Stage (The Presentation) */}
            <div className="flex-1 bg-black/20 rounded-2xl border border-white/10 overflow-hidden relative shadow-2xl flex items-center justify-center">
                {sourceType === 'NONE' ? (
                    <div className="text-center p-8 animate-fade-in">
                        <div className="bg-white/10 p-6 rounded-full inline-flex mb-6">
                            <Monitor size={64} className="text-indigo-400 opacity-80"/>
                        </div>
                        <h2 className="text-2xl font-bold mb-6">وضع العرض التقديمي (Smart Board)</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                            <div className="bg-white/5 p-6 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                                <h3 className="font-bold mb-4 flex items-center justify-center gap-2"><Upload/> رفع ملف (PDF/Image)</h3>
                                <p className="text-xs text-gray-400 mb-4">ارفع الدرس بصيغة PDF أو صور (Export PowerPoint to PDF)</p>
                                <label className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer font-bold transition-colors">
                                    اختيار ملف
                                    <input type="file" accept="application/pdf, image/*" className="hidden" onChange={handleFileUpload}/>
                                </label>
                            </div>

                            <div className="bg-white/5 p-6 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                                <h3 className="font-bold mb-4 flex items-center justify-center gap-2"><Globe/> رابط سحابي</h3>
                                <p className="text-xs text-gray-400 mb-4">رابط Google Slides أو OneDrive أو أي موقع</p>
                                <form onSubmit={handleUrlSubmit} className="flex gap-2">
                                    <input 
                                        className="w-full bg-black/30 border border-white/20 rounded-lg px-3 text-sm outline-none focus:border-indigo-500 dir-ltr text-left"
                                        placeholder="https://..."
                                        value={inputUrl}
                                        onChange={e => setInputUrl(e.target.value)}
                                    />
                                    <button className="bg-indigo-600 p-2 rounded-lg hover:bg-indigo-700"><Monitor size={18}/></button>
                                </form>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full relative group bg-white">
                        {/* Clear Button */}
                        <button 
                            onClick={() => { setSourceType('NONE'); setSourceUrl(''); }}
                            className="absolute top-4 right-4 z-50 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="إغلاق العرض"
                        >
                            <X size={20}/>
                        </button>

                        {/* Content */}
                        {sourceType === 'PDF' && <iframe src={sourceUrl} className="w-full h-full" title="PDF Viewer"></iframe>}
                        {sourceType === 'IFRAME' && <iframe src={sourceUrl} className="w-full h-full" title="Web Viewer" allowFullScreen></iframe>}
                        {sourceType === 'IMAGE' && <img src={sourceUrl} className="w-full h-full object-contain bg-black" alt="Presentation Slide"/>}
                    </div>
                )}
            </div>

            {/* FLOATING TOOLBAR */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-2 z-40 transition-all hover:bg-slate-800">
                <button 
                    onClick={() => setActiveFloatingTool(activeFloatingTool === 'PICKER' ? 'NONE' : 'PICKER')}
                    className={`p-3 rounded-xl transition-all ${activeFloatingTool === 'PICKER' ? 'bg-yellow-500 text-black shadow-lg scale-110' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                    title="قرعة سريعة"
                >
                    <Shuffle size={24}/>
                </button>
                <div className="w-[1px] h-8 bg-white/20"></div>
                <button 
                    onClick={() => setActiveFloatingTool(activeFloatingTool === 'TIMER' ? 'NONE' : 'TIMER')}
                    className={`p-3 rounded-xl transition-all ${activeFloatingTool === 'TIMER' ? 'bg-blue-500 text-white shadow-lg scale-110' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                    title="مؤقت سريع"
                >
                    <Clock size={24}/>
                </button>
                <div className="w-[1px] h-8 bg-white/20"></div>
                <button 
                    onClick={() => setActiveFloatingTool(activeFloatingTool === 'SOUNDS' ? 'NONE' : 'SOUNDS')}
                    className={`p-3 rounded-xl transition-all ${activeFloatingTool === 'SOUNDS' ? 'bg-pink-500 text-white shadow-lg scale-110' : 'text-gray-300 hover:text-white hover:bg-white/10'}`}
                    title="أصوات"
                >
                    <Volume2 size={24}/>
                </button>
            </div>

            {/* OVERLAY WIDGETS */}
            {activeFloatingTool !== 'NONE' && (
                <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
                    <div className="relative bg-slate-900 border border-white/20 rounded-2xl shadow-2xl overflow-hidden min-w-[320px] max-w-md">
                        {/* Close Handler for Widget */}
                        <button 
                            onClick={() => setActiveFloatingTool('NONE')}
                            className="absolute top-2 right-2 text-gray-400 hover:text-white z-10"
                        >
                            <X size={16}/>
                        </button>

                        {activeFloatingTool === 'PICKER' && (
                            <div className="p-4">
                                <h4 className="text-yellow-400 font-bold mb-2 flex items-center gap-2"><Shuffle size={16}/> الاختيار العشوائي</h4>
                                <div className="scale-75 origin-top">
                                    <RandomPicker students={students} total={total} />
                                </div>
                            </div>
                        )}

                        {activeFloatingTool === 'TIMER' && (
                            <div className="p-4">
                                <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><Clock size={16}/> المؤقت</h4>
                                <div className="scale-75 origin-top">
                                    <ClassroomTimer />
                                </div>
                            </div>
                        )}

                        {activeFloatingTool === 'SOUNDS' && (
                            <div className="p-4">
                                <h4 className="text-pink-400 font-bold mb-4 flex items-center gap-2"><Volume2 size={16}/> المؤثرات</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {['👏 تصفيق', '✅ صحيح', '❌ خطأ', '🥁 طبلة', '🤫 هدوء', '🔔 جرس'].map((s, i) => (
                                        <button key={i} className="bg-white/10 hover:bg-white/20 p-3 rounded text-xs font-bold text-white transition-colors border border-white/5">
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-Component: Random Picker ---
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

// --- Sub-Component: Timer ---
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
            // Optional: Play sound
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

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

// --- Sub-Component: Group Generator ---
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
