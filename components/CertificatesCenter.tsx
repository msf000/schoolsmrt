
import React, { useState, useMemo, useEffect } from 'react';
import { Student, SystemUser, School, AttendanceRecord, AttendanceStatus, BehaviorStatus, ReportHeaderConfig, AcademicTerm, TeacherAssignment } from '../types';
import { getSchools, getAcademicTerms, getReportHeaderConfig, getTeacherAssignments } from '../services/storageService';
import { Award, Printer, CheckSquare, Search, LayoutTemplate, TrendingUp, Medal, Star, ThumbsUp, Send, Share2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface CertificatesCenterProps {
    students: Student[];
    currentUser?: SystemUser | null;
    onSaveAttendance?: (records: AttendanceRecord[]) => void;
}

const TEMPLATES = [
    { id: 'EXCELLENCE', label: 'تفوق وتميز', icon: Medal, color: 'text-yellow-600', border: 'border-yellow-600', bg: 'bg-yellow-50', title: 'شهادة شكر وتقدير' },
    { id: 'IMPROVEMENT', label: 'تحسن مستوى', icon: TrendingUp, color: 'text-blue-600', border: 'border-blue-600', bg: 'bg-blue-50', title: 'شهادة تحسن مستوى' },
    { id: 'BEHAVIOR', label: 'انضباط وسلوك', icon: Star, color: 'text-green-600', border: 'border-green-600', bg: 'bg-green-50', title: 'شهادة حسن سيرة وسلوك' },
    { id: 'THANKS', label: 'شكر عام', icon: ThumbsUp, color: 'text-purple-600', border: 'border-purple-600', bg: 'bg-purple-50', title: 'شهادة شكر وتقدير' },
];

const CertificatesCenter: React.FC<CertificatesCenterProps> = ({ students, currentUser, onSaveAttendance }) => {
    const location = useLocation();
    
    const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [filterClass, setFilterClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [customText, setCustomText] = useState('نظير جهوده المتميزة ومستواه الرائع خلال الفترة الماضية، متمنين له دوام التوفيق.');
    const [logToHistory, setLogToHistory] = useState(true);
    const [headerConfig, setHeaderConfig] = useState<ReportHeaderConfig | null>(null);

    const [schoolInfo, setSchoolInfo] = useState<School | undefined>(() => {
        const schools = getSchools();
        if (currentUser?.schoolId) return schools.find((s: School) => s.id === currentUser.schoolId);
        return undefined;
    });

    useEffect(() => {
        const terms = getAcademicTerms(currentUser?.id);
        const currentTerm = terms.find((t: AcademicTerm) => t.isCurrent);
        if (currentTerm) {
            setCustomText(`نظير جهوده المتميزة ومستواه الرائع خلال ${currentTerm.name}، متمنين له دوام التوفيق.`);
        }
        setHeaderConfig(getReportHeaderConfig(currentUser?.id));
        
        if (location.state && (location.state as any).studentIds) {
            const ids = (location.state as any).studentIds as string[];
            if (ids && ids.length > 0) {
                setSelectedStudents(new Set(ids));
                const firstStudent = students.find((s: Student) => s.id === ids[0]);
                if(firstStudent && firstStudent.className) setFilterClass(firstStudent.className);
            }
        }
    }, [currentUser, location.state, students]);

    const uniqueClasses = useMemo(() => {
        const classes = new Set<string>();
        students.forEach(s => { if (s.className) classes.add(s.className); });
        const manualClasses = getTeacherAssignments(currentUser?.id).map((a: TeacherAssignment) => a.classId);
        manualClasses.forEach((c: string) => classes.add(c));
        return Array.from(classes).sort();
    }, [students, currentUser]);

    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            if (filterClass && s.className !== filterClass) return false;
            if (searchTerm && !s.name.includes(searchTerm)) return false;
            return true;
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [students, filterClass, searchTerm]);

    const toggleStudent = (id: string) => {
        const newSet = new Set(selectedStudents);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedStudents(newSet);
    };

    const handleWhatsAppShare = (student: Student) => {
        if (!student.parentPhone) return alert('لا يوجد رقم واتساب مسجل لهذا الطالب.');
        const message = `السلام عليكم، يسر مدرسة ${schoolInfo?.name || 'مدرستنا'} تهنئتكم بحصول الابن ${student.name} على "${selectedTemplate.title}". يمكنكم استلام النسخة الرقمية عبر بوابتكم في نظام المتابع الذكي. شكراً لاهتمامكم.`;
        const phone = student.parentPhone.replace(/\D/g, '');
        const formattedPhone = phone.startsWith('966') ? phone : `966${phone.startsWith('0') ? phone.slice(1) : phone}`;
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handlePrint = () => {
        if (logToHistory && onSaveAttendance) {
            const records: AttendanceRecord[] = [];
            const today = new Date().toISOString().split('T')[0];
            selectedStudents.forEach(id => {
                records.push({
                    id: `${id}-cert-${Date.now()}`,
                    studentId: id,
                    date: today,
                    status: AttendanceStatus.PRESENT, 
                    behaviorStatus: BehaviorStatus.POSITIVE,
                    behaviorNote: `منح شهادة: ${selectedTemplate.title}`,
                    createdById: currentUser?.id
                });
            });
            if (records.length > 0) onSaveAttendance(records);
        }
        setTimeout(() => window.print(), 500);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden font-tajawal">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 print:hidden gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        <Award className="text-purple-600"/> مركز التكريم والشهادات
                    </h2>
                    <p className="text-xs text-gray-400 font-bold uppercase mt-1">توليد ومشاركة الشهادات المتميزة</p>
                </div>
                <div className="flex gap-4 items-center">
                    <button onClick={handlePrint} disabled={selectedStudents.size === 0} className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50 shadow-xl">
                        <Printer size={20}/> طباعة المجموعة ({selectedStudents.size})
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden print:hidden">
                <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm">
                        <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-sm"><LayoutTemplate size={18} className="text-indigo-600"/> قالب التكريم</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {TEMPLATES.map(t => (
                                <button 
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t)}
                                    className={`p-4 rounded-2xl border-2 text-xs font-black flex flex-col items-center gap-2 transition-all ${selectedTemplate.id === t.id ? `bg-white border-indigo-600 shadow-xl scale-105` : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                                >
                                    <t.icon className={t.color} size={24}/>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex-1 flex flex-col min-h-[300px]">
                        <div className="flex flex-col gap-3 mb-3">
                            <select className="p-3 border rounded-2xl text-xs font-black bg-gray-50 outline-none" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                                <option value="">كل فصولي المتاحة</option>
                                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <div className="relative">
                                <Search size={16} className="absolute top-3 right-3 text-gray-300"/>
                                <input className="w-full pr-10 pl-3 py-3 border rounded-2xl text-xs font-bold" placeholder="ابحث بالاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                            {filteredStudents.map(s => (
                                <div key={s.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${selectedStudents.has(s.id) ? 'bg-indigo-50 border-indigo-200' : 'bg-white hover:bg-gray-50 border-transparent shadow-sm'}`}>
                                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleStudent(s.id)}>
                                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${selectedStudents.has(s.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-gray-50 border-gray-200'}`}>
                                            {selectedStudents.has(s.id) && <CheckSquare size={14}/>}
                                        </div>
                                        <span className="font-black text-slate-700 text-xs truncate max-w-[150px]">{s.name}</span>
                                    </div>
                                    <button onClick={() => handleWhatsAppShare(s)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="إرسال عبر واتساب">
                                        <Send size={16}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-slate-200 rounded-[3rem] overflow-y-auto p-12 flex items-start justify-center custom-scrollbar shadow-inner">
                    <div className="scale-[0.7] origin-top shadow-2xl transition-transform duration-500">
                        <CertificateView 
                            student={{ name: 'اسم الطالب المكرم', className: 'الفصل الدراسي' } as Student} 
                            template={selectedTemplate} 
                            text={customText} 
                            teacherName={currentUser?.name || 'اسم المعلم'} 
                            schoolName={schoolInfo?.name || 'المدرسة النموذجية'}
                            managerName={schoolInfo?.managerName || 'مدير المدرسة'}
                            signature={headerConfig?.signatureBase64}
                        />
                    </div>
                </div>
            </div>

            <div className="hidden print:block">
                {students.filter(s => selectedStudents.has(s.id)).map(student => (
                    <div key={student.id} className="break-after-page w-full h-screen flex items-center justify-center">
                        <CertificateView 
                            student={student} 
                            template={selectedTemplate} 
                            text={customText} 
                            teacherName={currentUser?.name || '...................'} 
                            schoolName={schoolInfo?.name || '...................'}
                            managerName={schoolInfo?.managerName || '...................'}
                            signature={headerConfig?.signatureBase64}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const CertificateView = ({ student, template, text, teacherName, schoolName, managerName, signature }: any) => {
    return (
        <div className={`w-[297mm] h-[210mm] bg-white relative flex flex-col items-center p-20 border-[20px] border-double ${template.border} shadow-sm print:shadow-none font-tajawal`}>
            <div className={`absolute inset-0 opacity-10 pointer-events-none ${template.bg} pattern-grid-lg`}></div>
            <div className={`absolute top-0 left-0 w-40 h-40 border-t-[12px] border-l-[12px] ${template.border} rounded-tl-[4rem] opacity-40`}></div>
            <div className={`absolute top-0 right-0 w-40 h-40 border-t-[12px] border-r-[12px] ${template.border} rounded-tr-[4rem] opacity-40`}></div>
            <div className={`absolute bottom-0 left-0 w-40 h-40 border-b-[12px] border-l-[12px] ${template.border} rounded-bl-[4rem] opacity-40`}></div>
            <div className={`absolute bottom-0 right-0 w-40 h-40 border-b-[12px] border-r-[12px] ${template.border} rounded-br-[4rem] opacity-40`}></div>
            
            <div className="w-full flex justify-between items-start mb-12 relative z-10">
                <div className="text-right text-sm font-black space-y-1">
                    <p>المملكة العربية السعودية</p>
                    <p>وزارة التعليم</p>
                    <p>{schoolName}</p>
                </div>
                <div className="text-center">
                    <img src="https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg" className="h-20 mb-2 opacity-80" alt="Moe" />
                </div>
                <div className="text-left text-sm font-black space-y-1">
                    <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                </div>
            </div>

            <div className={`mb-8 p-6 rounded-full border-8 ${template.border} bg-white relative z-10 shadow-2xl`}>
                <template.icon size={80} className={template.color} />
            </div>

            <h1 className={`text-7xl font-black ${template.color} mb-10 relative z-10 tracking-tight`}>
                {template.title}
            </h1>

            <div className="flex-1 flex flex-col items-center justify-center w-full text-center relative z-10">
                <p className="text-2xl text-gray-500 font-bold mb-6">تتشرف إدارة المدرسة بمنح الطالب:</p>
                <h2 className="text-6xl font-black text-gray-900 border-b-[6px] border-indigo-100 pb-4 mb-10 w-full px-20">{student.name}</h2>
                <p className="text-3xl text-gray-700 leading-relaxed font-bold max-w-4xl">
                    {text}
                </p>
            </div>

            <div className="w-full flex justify-between px-32 mt-16 relative z-10 items-end">
                <div className="text-center flex flex-col items-center">
                    <p className="font-black text-gray-400 mb-4 text-xl uppercase tracking-widest">معلم المادة</p>
                    {signature ? <img src={signature} alt="Sig" className="h-20 object-contain mb-2 mix-blend-multiply"/> : <div className="h-20"></div>}
                    <p className="text-3xl font-black text-indigo-900">{teacherName}</p>
                </div>
                <div className="text-center">
                    <p className="font-black text-gray-400 mb-8 text-xl uppercase tracking-widest">مدير المدرسة</p>
                    <p className="text-3xl font-black text-gray-900">{managerName}</p>
                </div>
            </div>
        </div>
    );
}

export default CertificatesCenter;
