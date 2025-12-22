
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, AttendanceRecord, AttendanceStatus, BehaviorStatus, SystemUser, ScheduleItem, AcademicTerm } from '../types';
import { 
    CheckCircle, XCircle, Clock, Users, ChevronRight, ChevronLeft, 
    Search, CheckSquare, Sparkles, Star, ThumbsDown, BookOpen, 
    LayoutGrid, List, FilterX, Eye, CalendarDays, History, 
    Hash, Calendar as CalendarIcon, Info, AlertCircle, Save, 
    MoreHorizontal, UserCheck, UserCheck as Check, UserX, Book, Database, Mic, MicOff, Loader2, Zap, X, Bot, Key, Lightbulb
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSchedules, getAcademicTerms, getTeacherAssignments, getTeacherPeriodTimings, getWeeklyPlans } from '../services/storageService';
import { processVoiceAttendance, generateEngagementQuestion, generateLessonSuccessKeys } from '../services/geminiService';

interface AttendanceProps {
  students: Student[];
  attendanceHistory: AttendanceRecord[];
  onSaveAttendance: (records: AttendanceRecord[]) => void;
  currentUser?: SystemUser | null;
}

const QUICK_BEHAVIORS = [
    { label: 'مشاركة ممتازة', status: BehaviorStatus.POSITIVE, icon: <Sparkles size={14}/>, color: 'text-yellow-600 bg-yellow-50 border-yellow-100' },
    { label: 'سلوك منضبط', status: BehaviorStatus.POSITIVE, icon: <Star size={14}/>, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { label: 'مشاغبة', status: BehaviorStatus.NEGATIVE, icon: <ThumbsDown size={14}/>, color: 'text-red-600 bg-red-50 border-red-100' },
];

const Attendance: React.FC<AttendanceProps> = ({ students, attendanceHistory, onSaveAttendance, currentUser }) => {
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState(() => localStorage.getItem('att_selected_date') || new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem('att_selected_class') || '');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(() => Number(localStorage.getItem('att_selected_period')) || 1);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>(() => (localStorage.getItem('att_view_mode') as any) || 'GRID');
  
  // Engagement & Lesson Context
  const [engagementQuestion, setEngagementQuestion] = useState<string>('');
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [activeQuestionStudent, setActiveQuestionStudent] = useState<Student | null>(null);
  const [lessonKeys, setLessonKeys] = useState<string[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<any[]>([]);

  useEffect(() => {
    if (currentUser) {
        setSchedules(getSchedules().filter(s => s.teacherId === currentUser.id));
        setWeeklyPlans(getWeeklyPlans(currentUser.id));
        autoDetectPeriod();
    }
  }, [currentUser]);

  useEffect(() => {
      localStorage.setItem('att_selected_date', selectedDate);
      localStorage.setItem('att_selected_class', selectedClass);
      localStorage.setItem('att_selected_period', selectedPeriod.toString());
      localStorage.setItem('att_view_mode', viewMode);
      
      // Fetch Lesson Keys when class/period changes
      if (selectedClass && selectedPeriod) {
          loadLessonContext();
      }
  }, [selectedDate, selectedClass, selectedPeriod, viewMode]);

  const autoDetectPeriod = () => {
      if (!currentUser) return;
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
      const timings = getTeacherPeriodTimings(currentUser.id);
      
      const currentIdx = timings.findIndex(t => {
          const [start, end] = t.split(' - ');
          return currentTime >= start && currentTime <= end;
      });

      if (currentIdx !== -1) {
          setSelectedPeriod(currentIdx + 1);
          // Also try to detect class from schedule
          const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          const slot = schedules.find(s => s.day === dayName && s.period === (currentIdx + 1));
          if (slot) setSelectedClass(slot.classId);
      }
  };

  const loadLessonContext = async () => {
      const plan = weeklyPlans.find(p => p.classId === selectedClass && p.period === selectedPeriod);
      if (plan?.lessonTopic) {
          setIsLoadingKeys(true);
          const res = await generateLessonSuccessKeys(plan.lessonTopic, 'عام');
          setLessonKeys(res.keys || []);
          setIsLoadingKeys(false);
      } else {
          setLessonKeys([]);
      }
  };

  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.className).filter(Boolean));
    if (currentUser?.id) getTeacherAssignments(currentUser.id).forEach(a => classes.add(a.classId));
    return Array.from(classes).sort();
  }, [students, currentUser]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = !selectedClass || s.className === selectedClass;
      const matchesSearch = !searchTerm || s.name.includes(searchTerm);
      return matchesClass && matchesSearch;
    }).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [students, selectedClass, searchTerm]);

  const currentPeriodRecords = useMemo(() => {
    return attendanceHistory.filter(a => a.date === selectedDate && a.period === selectedPeriod);
  }, [attendanceHistory, selectedDate, selectedPeriod]);

  const handleUpdate = (studentId: string, status: AttendanceStatus, bStatus?: BehaviorStatus, bNote?: string, pScore?: number) => {
    const existing = attendanceHistory.find(a => 
      a.studentId === studentId && 
      a.date === selectedDate && 
      a.period === selectedPeriod
    );

    const record: AttendanceRecord = {
      id: existing?.id || `${studentId}-${selectedDate}-${selectedPeriod}-${Date.now()}`,
      studentId,
      date: selectedDate,
      period: selectedPeriod,
      status,
      behaviorStatus: bStatus || existing?.behaviorStatus || BehaviorStatus.NEUTRAL,
      behaviorNote: bNote || existing?.behaviorNote || '',
      participationScore: pScore !== undefined ? pScore : existing?.participationScore,
      createdById: currentUser?.id
    };
    onSaveAttendance([record]);
  };

  const markAllPresent = () => {
      const records: AttendanceRecord[] = filteredStudents.map(s => {
          const existing = currentPeriodRecords.find(a => a.studentId === s.id);
          return {
            id: existing?.id || `${s.id}-${selectedDate}-${selectedPeriod}-${Date.now()}`,
            studentId: s.id,
            date: selectedDate,
            period: selectedPeriod,
            status: AttendanceStatus.PRESENT,
            createdById: currentUser?.id
          };
      });
      onSaveAttendance(records);
  };

  const handleEngagementTrigger = async (student: Student) => {
      setActiveQuestionStudent(student);
      setIsGeneratingQuestion(true);
      const plan = weeklyPlans.find(p => p.classId === student.className);
      const topic = plan?.lessonTopic || 'مراجعة المكتسبات السابقة';
      const question = await generateEngagementQuestion(student, topic);
      setEngagementQuestion(question);
      setIsGeneratingQuestion(false);
  };

  // Voice Attendance Logic
  const startVoiceRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
              audioChunksRef.current.push(event.data);
          };

          mediaRecorder.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/pcm' });
              const reader = new FileReader();
              reader.readAsDataURL(audioBlob);
              reader.onloadend = async () => {
                  const base64Audio = (reader.result as string).split(',')[1];
                  setIsProcessingVoice(true);
                  const names = filteredStudents.map(s => s.name);
                  const result = await processVoiceAttendance(base64Audio, names);
                  
                  if (result.updates) {
                      const records: AttendanceRecord[] = [];
                      result.updates.forEach((update: any) => {
                          const student = filteredStudents.find(s => s.name.includes(update.name));
                          if (student) {
                              records.push({
                                  id: `${student.id}-${selectedDate}-${selectedPeriod}-${Date.now()}`,
                                  studentId: student.id,
                                  date: selectedDate,
                                  period: selectedPeriod,
                                  status: update.status as AttendanceStatus,
                                  createdById: currentUser?.id
                              });
                          }
                      });
                      if (records.length > 0) onSaveAttendance(records);
                  }
                  setIsProcessingVoice(false);
              };
          };

          mediaRecorder.start();
          setIsListening(true);
      } catch (err) { alert('تعذر الوصول للميكروفون'); }
  };

  const stopVoiceRecording = () => {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
  };

  const currentPlan = weeklyPlans.find(p => p.classId === selectedClass && p.period === selectedPeriod);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-[#F8FAFC] animate-fade-in pb-24 font-tajawal">
      {/* Lesson Context Bar (NEW) */}
      {selectedClass && currentPlan && (
          <div className="mb-6 bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-[2.5rem] p-6 text-white shadow-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden border border-indigo-700 animate-slide-up">
              <div className="absolute top-0 right-0 p-8 opacity-10"><BookOpen size={100}/></div>
              <div className="flex items-center gap-4 relative z-10 shrink-0">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-yellow-400 shadow-inner">
                      <Lightbulb size={32}/>
                  </div>
                  <div>
                      <p className="text-[10px] font-black uppercase text-indigo-300 tracking-widest">موضوع الحصة الحالية</p>
                      <h3 className="text-xl font-black">{currentPlan.lessonTopic}</h3>
                  </div>
              </div>
              <div className="flex-1 flex flex-wrap gap-2 relative z-10">
                  {isLoadingKeys ? (
                      <div className="flex items-center gap-2 text-indigo-300 animate-pulse text-xs font-bold"><Loader2 className="animate-spin" size={14}/> جاري استخراج مفاتيح النجاح...</div>
                  ) : lessonKeys.map((key, i) => (
                      <div key={i} className="bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all cursor-default">
                          <Key size={12} className="text-yellow-400"/> {key}
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Header Panel */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100 mb-6 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto">
                <div className="flex items-center gap-2 bg-indigo-50/50 p-2 rounded-2xl border border-indigo-100 w-full md:w-auto">
                    <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><ChevronRight size={18}/></button>
                    <div className="flex-1 flex items-center justify-center gap-2 font-black text-xs px-2 min-w-[140px]">
                        <CalendarIcon size={16} className="text-indigo-600"/>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent outline-none cursor-pointer" />
                    </div>
                    <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2.5 bg-white rounded-xl shadow-sm text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><ChevronLeft size={18}/></button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 w-full md:w-auto">
                    <Users size={18} className="text-slate-500 mr-2"/>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-transparent font-black text-xs outline-none min-w-[120px] cursor-pointer">
                        <option value="">اختر الفصل...</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="w-px h-6 bg-slate-200 mx-2"></div>
                    <select value={selectedPeriod} onChange={e => setSelectedPeriod(Number(e.target.value))} className="bg-transparent font-black text-xs outline-none cursor-pointer text-indigo-600">
                        {[1,2,3,4,5,6,7,8].map(p => <option key={p} value={p}>الحصة {p}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <button onClick={markAllPresent} disabled={!selectedClass} className="flex-1 lg:flex-none p-3.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-black text-xs hover:bg-emerald-600 hover:text-white transition-all shadow-sm">الكل حاضر</button>
                <button 
                    onClick={isListening ? stopVoiceRecording : startVoiceRecording} 
                    className={`flex-1 lg:flex-none p-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-xs transition-all shadow-lg ${isListening ? 'bg-red-500 text-white animate-pulse' : isProcessingVoice ? 'bg-indigo-100 text-indigo-400' : 'bg-indigo-600 text-white hover:scale-105'}`}
                    disabled={isProcessingVoice}
                >
                    {isProcessingVoice ? <Loader2 className="animate-spin" size={20}/> : isListening ? <MicOff size={20}/> : <Mic size={20}/>}
                    <span className="hidden sm:inline">{isListening ? 'جاري الاستماع...' : isProcessingVoice ? 'جاري التحليل...' : 'التحضير الصوتي (AI)'}</span>
                </button>
                <button onClick={() => setViewMode(viewMode === 'GRID' ? 'LIST' : 'GRID')} className="p-3.5 bg-white border-2 border-slate-50 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all">
                    {viewMode === 'GRID' ? <List size={22}/> : <LayoutGrid size={22}/>}
                </button>
            </div>
        </div>

        <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
            <input className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-300" placeholder="بحث سريع عن طالب..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
        </div>
      </div>

      {/* Engagement Question Display */}
      {engagementQuestion && (
          <div className="mb-6 animate-slide-up">
              <div className="bg-indigo-900 text-white p-6 rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 border border-indigo-700">
                  <div className="p-4 bg-white/20 rounded-2xl shrink-0"><Bot size={32}/></div>
                  <div className="flex-1 text-center md:text-right">
                      <p className="text-[10px] font-black uppercase text-indigo-300 mb-1">سؤال تفاعلي لـ: {activeQuestionStudent?.name}</p>
                      <h4 className="text-lg font-black leading-relaxed">"{engagementQuestion}"</h4>
                  </div>
                  <button onClick={() => setEngagementQuestion('')} className="p-2 hover:bg-white/10 rounded-full"><X/></button>
              </div>
          </div>
      )}

      {/* Students List Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
            {filteredStudents.map(student => {
              const record = currentPeriodRecords.find(a => a.studentId === student.id);
              const isAbsent = record?.status === AttendanceStatus.ABSENT;
              const isPresent = record?.status === AttendanceStatus.PRESENT || record?.status === AttendanceStatus.LATE;
              const pScore = record?.participationScore || 0;

              return (
                <div key={student.id} className={`p-5 rounded-[2.5rem] border-2 transition-all flex flex-col justify-between h-52 shadow-sm relative overflow-hidden ${isAbsent ? 'bg-red-50 border-red-200' : isPresent ? 'bg-white border-indigo-200 shadow-indigo-50' : 'bg-white border-transparent hover:border-indigo-100'}`}>
                    <div className="flex justify-between items-start relative z-10">
                        <div onClick={() => handleUpdate(student.id, isAbsent ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT)} className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg cursor-pointer transition-transform active:scale-90 ${isAbsent ? 'bg-red-600' : 'bg-indigo-600'}`}>
                            {student.name.charAt(0)}
                        </div>
                        <div className="flex flex-col gap-1">
                            <button 
                                onClick={() => handleEngagementTrigger(student)}
                                className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm group"
                                title="سؤال تفاعلي"
                            >
                                <Bot size={14}/>
                            </button>
                            {QUICK_BEHAVIORS.map(b => (
                                <button key={b.label} onClick={() => handleUpdate(student.id, record?.status || AttendanceStatus.PRESENT, b.status, b.label)} className={`p-1.5 rounded-lg border shadow-sm transition-transform active:scale-90 ${b.color}`} title={b.label}>{b.icon}</button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-2">
                        <h4 className="text-xs font-black text-slate-800 truncate">{student.name}</h4>
                        <div className="flex items-center gap-1 mt-3">
                            <span className="text-[9px] font-black text-slate-400 ml-2">تفاعل الحصة:</span>
                            {[1, 2, 3, 4, 5].map(star => (
                                <button 
                                    key={star} 
                                    onClick={() => handleUpdate(student.id, record?.status || AttendanceStatus.PRESENT, record?.behaviorStatus, record?.behaviorNote, star)}
                                    className={`transition-all ${star <= pScore ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
                                >
                                    <Star size={16} fill={star <= pScore ? 'currentColor' : 'none'}/>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isAbsent ? 'text-red-600 bg-red-50' : isPresent ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300'}`}>
                            {isAbsent ? 'غائب' : isPresent ? 'حاضر' : 'لم يتم التحضير'}
                        </span>
                        <div className="flex gap-1">
                            <button onClick={() => navigate('/followup', {state: {studentId: student.id}})} className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors"><Eye size={16}/></button>
                        </div>
                    </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
