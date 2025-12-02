import React, { useState, useEffect } from 'react';
import { Teacher, Parent, ClassRoom, Subject, EducationalStage, GradeLevel, Student, School } from '../types';
import { 
    getTeachers, addTeacher, deleteTeacher, 
    getParents, addParent, deleteParent, 
    getClasses, addClass, deleteClass, 
    getSubjects, addSubject, deleteSubject,
    getStages, addStage, deleteStage,
    getGrades, addGrade, deleteGrade,
    getSchools, addSchool
} from '../services/storageService';
import { Trash2, Plus, Book, GraduationCap, Users, User, Phone, Mail, Building2, ChevronRight, Layers, Layout, Database, Save, Link as LinkIcon } from 'lucide-react';
import DataImport from './DataImport';

interface SchoolManagementProps {
    students: Student[];
    onImportStudents: (students: Student[]) => void;
    onImportPerformance: (records: any[]) => void;
    onImportAttendance: (records: any[]) => void;
}

const SchoolManagement: React.FC<SchoolManagementProps> = ({ 
    students, 
    onImportStudents, 
    onImportPerformance, 
    onImportAttendance 
}) => {
  const [activeTab, setActiveTab] = useState<'STRUCTURE' | 'TEACHERS' | 'PARENTS' | 'SUBJECTS' | 'IMPORT' | 'SETTINGS'>('STRUCTURE');
  
  return (
    <div className="p-6 animate-fade-in space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="text-primary" />
            إدارة المدرسة
        </h2>
        <p className="text-gray-500 mt-2">إعداد الهيكل الأكاديمي، المعلمين، والبيانات الأساسية.</p>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6">
          <TabButton active={activeTab === 'STRUCTURE'} onClick={() => setActiveTab('STRUCTURE')} icon={<Layout size={18} />} label="الهيكل الأكاديمي" />
          <TabButton active={activeTab === 'TEACHERS'} onClick={() => setActiveTab('TEACHERS')} icon={<User size={18} />} label="المعلمين" />
          <TabButton active={activeTab === 'PARENTS'} onClick={() => setActiveTab('PARENTS')} icon={<Users size={18} />} label="أولياء الأمور" />
          <TabButton active={activeTab === 'SUBJECTS'} onClick={() => setActiveTab('SUBJECTS')} icon={<Book size={18} />} label="المواد الدراسية" />
          <TabButton active={activeTab === 'IMPORT'} onClick={() => setActiveTab('IMPORT')} icon={<Database size={18} />} label="استيراد بيانات" />
          <TabButton active={activeTab === 'SETTINGS'} onClick={() => setActiveTab('SETTINGS')} icon={<Save size={18} />} label="إعدادات عامة" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
          {activeTab === 'STRUCTURE' && <StructureManager />}
          {activeTab === 'TEACHERS' && <TeachersManager />}
          {activeTab === 'PARENTS' && <ParentsManager />}
          {activeTab === 'SUBJECTS' && <SubjectsManager />}
          {activeTab === 'IMPORT' && (
              <DataImport 
                  existingStudents={students}
                  onImportStudents={onImportStudents}
                  onImportPerformance={onImportPerformance}
                  onImportAttendance={onImportAttendance}
              />
          )}
          {activeTab === 'SETTINGS' && <SchoolSettings />}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all whitespace-nowrap ${
            active ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

// --- Settings Manager (For Cloud Link) ---
const SchoolSettings = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [masterUrl, setMasterUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const s = getSchools();
        setSchools(s);
        if (s.length > 0 && s[0].worksMasterUrl) {
            setMasterUrl(s[0].worksMasterUrl);
        }
    }, []);

    const handleSave = () => {
        if (schools.length === 0) {
            setMsg('❌ لا توجد مدرسة مسجلة. يرجى إضافة مدرسة من لوحة المدير العام أولاً.');
            return;
        }
        
        setIsSaving(true);
        // Update the first school found
        const updatedSchool = { ...schools[0], worksMasterUrl: masterUrl };
        addSchool(updatedSchool); // upsert/add logic handles update if ID exists
        
        setTimeout(() => {
            setIsSaving(false);
            setMsg('✅ تم حفظ الرابط بنجاح! سيتم تعميمه على جميع الأجهزة بعد المزامنة.');
            setTimeout(() => setMsg(''), 3000);
        }, 1000);
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <LinkIcon className="text-blue-600"/>
                إعدادات الربط السحابي
            </h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">رابط ملف الأعمال الرئيسي (Google Drive / Excel)</label>
                <p className="text-xs text-gray-500 mb-4">هذا الرابط سيتم استخدامه في صفحة "متابعة الأعمال" لجلب البيانات تلقائياً لجميع المستخدمين.</p>
                
                <div className="flex gap-2">
                    <input 
                        type="url" 
                        value={masterUrl} 
                        onChange={e => setMasterUrl(e.target.value)}
                        className="flex-1 p-3 border rounded-lg dir-ltr text-left"
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                    />
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? 'جاري الحفظ...' : 'حفظ وتعميم'}
                    </button>
                </div>
                {msg && <div className="mt-3 text-sm font-bold text-center">{msg}</div>}
            </div>

            <div className="text-sm text-gray-400 text-center">
                تأكد من أن الرابط صالح ومتاح للمشاركة (Anyone with link) لضمان عمله لدى جميع المعلمين.
            </div>
        </div>
    );
};

// --- Structure Manager (Hierarchy) ---
const StructureManager = () => {
    const [stages, setStages] = useState<EducationalStage[]>([]);
    const [grades, setGrades] = useState<GradeLevel[]>([]);
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);

    // Inputs
    const [newStage, setNewStage] = useState('');
    const [newGrade, setNewGrade] = useState('');
    const [newClass, setNewClass] = useState('');

    useEffect(() => {
        setStages(getStages());
        setGrades(getGrades());
        setClasses(getClasses());
    }, []);

    // Handlers
    const handleAddStage = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newStage) return;
        addStage({ id: Date.now().toString(), name: newStage });
        setStages(getStages());
        setNewStage('');
    };

    const handleAddGrade = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newGrade || !selectedStageId) return;
        addGrade({ id: Date.now().toString(), stageId: selectedStageId, name: newGrade });
        setGrades(getGrades());
        setNewGrade('');
    };

    const handleAddClass = (e: React.FormEvent) => {
        e.preventDefault();
        if(!newClass || !selectedGradeId) return;
        addClass({ id: Date.now().toString(), gradeLevelId: selectedGradeId, name: newClass });
        setClasses(getClasses());
        setNewClass('');
    };

    // Filtered lists
    const currentGrades = grades.filter(g => g.stageId === selectedStageId);
    const currentClasses = classes.filter(c => c.gradeLevelId === selectedGradeId);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
            {/* Column 1: Stages */}
            <div className="bg-gray-50 rounded-lg p-4 border flex flex-col h-96">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Layers size={18}/> المراحل الدراسية</h3>
                <form onSubmit={handleAddStage} className="flex gap-2 mb-4">
                    <input className="flex-1 p-2 border rounded text-sm" placeholder="مثال: الابتدائية" value={newStage} onChange={e=>setNewStage(e.target.value)} />
                    <button type="submit" className="bg-primary text-white p-2 rounded"><Plus size={16}/></button>
                </form>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {stages.map(stage => (
                        <div 
                            key={stage.id} 
                            onClick={() => { setSelectedStageId(stage.id); setSelectedGradeId(null); }}
                            className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-colors ${selectedStageId === stage.id ? 'bg-primary text-white shadow' : 'bg-white hover:bg-gray-100 border'}`}
                        >
                            <span>{stage.name}</span>
                            <div className="flex items-center gap-1">
                                {selectedStageId === stage.id && <ChevronRight size={16} />}
                                <button onClick={(e) => { e.stopPropagation(); deleteStage(stage.id); setStages(getStages()); }} className="p-1 hover:bg-red-500/20 rounded"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Column 2: Grades */}
            <div className={`bg-gray-50 rounded-lg p-4 border flex flex-col h-96 transition-opacity ${!selectedStageId ? 'opacity-50 pointer-events-none' : ''}`}>
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><GraduationCap size={18}/> الصفوف الدراسية</h3>
                <form onSubmit={handleAddGrade} className="flex gap-2 mb-4">
                    <input className="flex-1 p-2 border rounded text-sm" placeholder="مثال: الصف الأول" value={newGrade} onChange={e=>setNewGrade(e.target.value)} />
                    <button type="submit" className="bg-primary text-white p-2 rounded"><Plus size={16}/></button>
                </form>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {selectedStageId ? currentGrades.map(grade => (
                        <div 
                            key={grade.id} 
                            onClick={() => setSelectedGradeId(grade.id)}
                            className={`p-3 rounded-lg cursor-pointer flex justify-between items-center transition-colors ${selectedGradeId === grade.id ? 'bg-primary text-white shadow' : 'bg-white hover:bg-gray-100 border'}`}
                        >
                            <span>{grade.name}</span>
                             <div className="flex items-center gap-1">
                                {selectedGradeId === grade.id && <ChevronRight size={16} />}
                                <button onClick={(e) => { e.stopPropagation(); deleteGrade(grade.id); setGrades(getGrades()); }} className="p-1 hover:bg-red-500/20 rounded"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    )) : <p className="text-gray-400 text-sm text-center mt-10">اختر مرحلة أولاً</p>}
                </div>
            </div>

            {/* Column 3: Classes */}
            <div className={`bg-gray-50 rounded-lg p-4 border flex flex-col h-96 transition-opacity ${!selectedGradeId ? 'opacity-50 pointer-events-none' : ''}`}>
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Layout size={18}/> الفصول</h3>
                <form onSubmit={handleAddClass} className="flex gap-2 mb-4">
                    <input className="flex-1 p-2 border rounded text-sm" placeholder="مثال: 1/أ" value={newClass} onChange={e=>setNewClass(e.target.value)} />
                    <button type="submit" className="bg-primary text-white p-2 rounded"><Plus size={16}/></button>
                </form>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {selectedGradeId ? currentClasses.map(cls => (
                        <div 
                            key={cls.id} 
                            className="p-3 rounded-lg flex justify-between items-center bg-white border"
                        >
                            <span>{cls.name}</span>
                            <button onClick={() => { deleteClass(cls.id); setClasses(getClasses()); }} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                        </div>
                    )) : <p className="text-gray-400 text-sm text-center mt-10">اختر صفاً أولاً</p>}
                </div>
            </div>
        </div>
    );
};

// --- Other Managers ---

const TeachersManager = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [form, setForm] = useState({ name: '', email: '', phone: '', specialty: '' });

    useEffect(() => { setTeachers(getTeachers()); }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addTeacher({ id: Date.now().toString(), name: form.name, email: form.email, phone: form.phone, subjectSpecialty: form.specialty });
        setTeachers(getTeachers());
        setForm({ name: '', email: '', phone: '', specialty: '' });
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">اسم المعلم</label>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">التخصص</label>
                    <input value={form.specialty} onChange={e => setForm({...form, specialty: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">رقم الجوال</label>
                    <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md h-[42px] flex items-center justify-center gap-2 hover:bg-teal-800"><Plus size={18} /> إضافة</button>
            </form>
            <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                    <thead>
                        <tr className="border-b bg-gray-50 text-sm text-gray-600">
                            <th className="p-3">الاسم</th>
                            <th className="p-3">التخصص</th>
                            <th className="p-3">تواصل</th>
                            <th className="p-3">حذف</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teachers.map(t => (
                            <tr key={t.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{t.name}</td>
                                <td className="p-3 text-gray-600">{t.subjectSpecialty}</td>
                                <td className="p-3 text-sm text-gray-500">
                                    <div className="flex flex-col gap-1">
                                        {t.phone && <span className="flex items-center gap-1"><Phone size={12}/> {t.phone}</span>}
                                        {t.email && <span className="flex items-center gap-1"><Mail size={12}/> {t.email}</span>}
                                    </div>
                                </td>
                                <td className="p-3"><button onClick={() => { deleteTeacher(t.id); setTeachers(getTeachers()); }} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ParentsManager = () => {
    const [parents, setParents] = useState<Parent[]>([]);
    const [form, setForm] = useState({ name: '', phone: '', email: '' });

    useEffect(() => { setParents(getParents()); }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addParent({ id: Date.now().toString(), name: form.name, phone: form.phone, email: form.email, childrenIds: [] });
        setParents(getParents());
        setForm({ name: '', phone: '', email: '' });
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                 <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">اسم ولي الأمر</label>
                    <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">رقم الجوال</label>
                    <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">البريد الإلكتروني</label>
                    <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full p-2 border rounded-md" />
                </div>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md h-[42px] flex items-center justify-center gap-2 hover:bg-teal-800"><Plus size={18} /> إضافة</button>
            </form>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parents.map(p => (
                    <div key={p.id} className="border p-4 rounded-lg flex justify-between items-start hover:shadow-md transition-shadow">
                        <div>
                            <h4 className="font-bold text-gray-800 flex items-center gap-2"><User size={16} /> {p.name}</h4>
                            <div className="mt-2 text-sm text-gray-500 space-y-1">
                                <p className="flex items-center gap-2"><Phone size={14} className="text-green-600"/> {p.phone}</p>
                                {p.email && <p className="flex items-center gap-2"><Mail size={14} className="text-blue-600"/> {p.email}</p>}
                            </div>
                        </div>
                        <button onClick={() => { deleteParent(p.id); setParents(getParents()); }} className="text-red-500 bg-red-50 p-2 rounded-full hover:bg-red-100"><Trash2 size={16} /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SubjectsManager = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [name, setName] = useState('');

    useEffect(() => { setSubjects(getSubjects()); }, []);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        addSubject({ id: Date.now().toString(), name });
        setSubjects(getSubjects());
        setName('');
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <form onSubmit={handleAdd} className="flex gap-4 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-600 mb-1">اسم المادة (مثال: رياضيات)</label>
                    <input required value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-md" />
                </div>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md h-[42px] flex items-center gap-2 hover:bg-teal-800"><Plus size={18} /> إضافة</button>
            </form>
            <ul className="divide-y border rounded-lg overflow-hidden">
                {subjects.map(s => (
                    <li key={s.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <span className="font-medium flex items-center gap-2"><Book size={16} className="text-secondary"/> {s.name}</span>
                        <button onClick={() => { deleteSubject(s.id); setSubjects(getSubjects()); }} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 size={16} /></button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SchoolManagement;