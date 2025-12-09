
import React, { useState, useMemo, useRef } from 'react';
import { Student, SystemUser, School } from '../types';
import { getSchools } from '../services/storageService';
import { Award, Printer, CheckSquare, Search, Sparkles, Star, Medal, ThumbsUp, Calendar, LayoutTemplate, TrendingUp } from 'lucide-react';

interface CertificatesCenterProps {
    students: Student[];
    currentUser?: SystemUser | null;
}

const TEMPLATES = [
    { id: 'EXCELLENCE', label: 'تفوق وتميز', icon: Medal, color: 'text-yellow-600', border: 'border-yellow-600', bg: 'bg-yellow-50', title: 'شهادة شكر وتقدير' },
    { id: 'IMPROVEMENT', label: 'تحسن مستوى', icon: TrendingUp, color: 'text-blue-600', border: 'border-blue-600', bg: 'bg-blue-50', title: 'شهادة تحسن مستوى' },
    { id: 'BEHAVIOR', label: 'انضباط وسلوك', icon: Star, color: 'text-green-600', border: 'border-green-600', bg: 'bg-green-50', title: 'شهادة حسن سيرة وسلوك' },
    { id: 'THANKS', label: 'شكر عام', icon: ThumbsUp, color: 'text-purple-600', border: 'border-purple-600', bg: 'bg-purple-50', title: 'شهادة شكر وتقدير' },
];

const CertificatesCenter: React.FC<CertificatesCenterProps> = ({ students, currentUser }) => {
    const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [filterClass, setFilterClass] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [customText, setCustomText] = useState('نظير جهوده المتميزة ومستواه الرائع خلال الفترة الماضية، متمنين له دوام التوفيق.');
    const [printMode, setPrintMode] = useState(false);

    const [schoolInfo, setSchoolInfo] = useState<School | undefined>(() => {
        const schools = getSchools();
        if (currentUser?.schoolId) return schools.find(s => s.id === currentUser.schoolId);
        return undefined;
    });

    const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.className).filter(Boolean))).sort(), [students]);

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

    const selectAll = () => {
        if (selectedStudents.size === filteredStudents.length) setSelectedStudents(new Set());
        else setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    };

    const handlePrint = () => {
        setPrintMode(true);
        setTimeout(() => {
            window.print();
            setPrintMode(false);
        }, 500);
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in overflow-hidden">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Award className="text-purple-600"/> مركز الشهادات والتقدير
                    </h2>
                    <p className="text-sm text-gray-500">إصدار شهادات جماعية للطلاب وتخصيصها.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrint} disabled={selectedStudents.size === 0} className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition-colors disabled:opacity-50 shadow-lg">
                        <Printer size={18}/> طباعة ({selectedStudents.size})
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden print:hidden">
                {/* Left: Controls & Selection */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    
                    {/* Templates */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><LayoutTemplate size={16}/> اختر القالب</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {TEMPLATES.map(t => (
                                <button 
                                    key={t.id}
                                    onClick={() => setSelectedTemplate(t)}
                                    className={`p-3 rounded-lg border text-xs font-bold flex flex-col items-center gap-2 transition-all ${selectedTemplate.id === t.id ? `bg-white border-${t.color.split('-')[1]}-500 ring-2 ring-${t.color.split('-')[1]}-200` : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
                                >
                                    <t.icon className={t.color} size={20}/>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Text */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-2 text-sm">عبارة التقدير</h3>
                        <textarea 
                            className="w-full p-3 border rounded-lg text-sm h-24 resize-none focus:ring-2 focus:ring-purple-500 outline-none"
                            value={customText}
                            onChange={e => setCustomText(e.target.value)}
                        />
                    </div>

                    {/* Student Selection */}
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col min-h-[300px]">
                        <div className="flex flex-col gap-3 mb-3">
                            <div className="flex gap-2">
                                <select className="flex-1 p-2 border rounded-lg text-sm bg-gray-50" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                                    <option value="">كل الفصول</option>
                                    {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button onClick={selectAll} className="text-xs text-blue-600 font-bold whitespace-nowrap hover:underline">تحديد الكل</button>
                            </div>
                            <div className="relative">
                                <Search size={14} className="absolute top-2.5 right-2 text-gray-400"/>
                                <input className="w-full pr-8 pl-2 py-2 border rounded-lg text-sm" placeholder="بحث بالاسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                            {filteredStudents.map(s => (
                                <div key={s.id} onClick={() => toggleStudent(s.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer text-sm ${selectedStudents.has(s.id) ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50 border border-transparent'}`}>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedStudents.has(s.id) ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-300'}`}>
                                        {selectedStudents.has(s.id) && <CheckSquare size={12}/>}
                                    </div>
                                    <span className="font-bold text-gray-700 truncate">{s.name}</span>
                                </div>
                            ))}
                            {filteredStudents.length === 0 && <div className="text-center text-gray-400 py-4 text-xs">لا يوجد طلاب</div>}
                        </div>
                        <div className="pt-2 border-t text-xs text-gray-500 font-bold">تم تحديد: {selectedStudents.size} طالب</div>
                    </div>
                </div>

                {/* Right: Preview */}
                <div className="flex-1 bg-gray-200 rounded-xl overflow-y-auto p-8 flex items-start justify-center custom-scrollbar">
                    {/* SINGLE CERTIFICATE PREVIEW (Scaled Down) */}
                    <div className="scale-[0.8] origin-top shadow-2xl">
                        <CertificateView 
                            student={{ name: 'اسم الطالب (مثال)', className: 'الفصل' } as Student} 
                            template={selectedTemplate} 
                            text={customText} 
                            teacherName={currentUser?.name || 'اسم المعلم'} 
                            schoolName={schoolInfo?.name || 'اسم المدرسة'}
                            managerName={schoolInfo?.managerName || 'مدير المدرسة'}
                        />
                    </div>
                </div>
            </div>

            {/* PRINT AREA (Hidden until print) */}
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
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const CertificateView = ({ student, template, text, teacherName, schoolName, managerName }: any) => {
    return (
        <div className={`w-[297mm] h-[210mm] bg-white relative flex flex-col items-center p-16 border-[16px] border-double ${template.border} shadow-sm print:shadow-none`}>
            {/* Decorative Background Pattern */}
            <div className={`absolute inset-0 opacity-5 pointer-events-none ${template.bg} pattern-grid-lg`}></div>
            
            {/* Corner Decorations */}
            <div className={`absolute top-0 left-0 w-32 h-32 border-t-8 border-l-8 ${template.border} rounded-tl-3xl opacity-50`}></div>
            <div className={`absolute top-0 right-0 w-32 h-32 border-t-8 border-r-8 ${template.border} rounded-tr-3xl opacity-50`}></div>
            <div className={`absolute bottom-0 left-0 w-32 h-32 border-b-8 border-l-8 ${template.border} rounded-bl-3xl opacity-50`}></div>
            <div className={`absolute bottom-0 right-0 w-32 h-32 border-b-8 border-r-8 ${template.border} rounded-br-3xl opacity-50`}></div>

            {/* Header */}
            <div className="w-full flex justify-between items-start opacity-70 mb-8 relative z-10">
                <div className="text-right text-sm font-bold">
                    <p>المملكة العربية السعودية</p>
                    <p>وزارة التعليم</p>
                    <p>{schoolName}</p>
                </div>
                <div className="text-left text-sm font-bold">
                    <p>التاريخ: {new Date().toLocaleDateString('ar-SA')}</p>
                </div>
            </div>

            {/* Icon */}
            <div className={`mb-6 p-4 rounded-full border-4 ${template.border} bg-white relative z-10`}>
                <template.icon size={64} className={template.color} />
            </div>

            {/* Title */}
            <h1 className={`text-6xl font-black ${template.color} mb-8 font-serif relative z-10 tracking-wide`}>
                {template.title}
            </h1>

            {/* Body */}
            <div className="flex-1 flex flex-col items-center justify-center w-3/4 text-center relative z-10">
                <p className="text-2xl text-gray-600 font-medium mb-4">تتشرف إدارة المدرسة بمنح الطالب:</p>
                <h2 className="text-5xl font-black text-gray-900 border-b-4 border-gray-300 pb-2 mb-8 w-full px-10">{student.name}</h2>
                <p className="text-2xl text-gray-700 leading-relaxed font-medium">
                    {text}
                </p>
            </div>

            {/* Signatures */}
            <div className="w-full flex justify-between px-32 mt-12 relative z-10">
                <div className="text-center">
                    <p className="font-bold text-gray-500 mb-6 text-xl">معلم المادة</p>
                    <p className="font-serif text-2xl text-gray-900">{teacherName}</p>
                </div>
                <div className="text-center">
                    <p className="font-bold text-gray-500 mb-6 text-xl">مدير المدرسة</p>
                    <p className="font-serif text-2xl text-gray-900">{managerName}</p>
                </div>
            </div>
        </div>
    );
}

export default CertificatesCenter;
