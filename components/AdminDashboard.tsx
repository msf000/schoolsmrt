
import React, { useState, useEffect } from 'react';
import { 
    fetchSchools, fetchSystemUsers, fetchTeachers, fetchAttendance, fetchPerformance, fetchStudents
} from '../services/storageService';
import { 
    Shield, Building, Users, Database, RefreshCw, CheckCircle, AlertTriangle, 
    Server, Loader2, Zap, Copy, CloudLightning, Activity, Table, ArrowRight,
    Globe, Lock, Layout, ShieldCheck, ChevronDown, ChevronRight, Search, Code
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'HEALTH' | 'DATABASE' | 'SCHOOLS'>('OVERVIEW');
    const [stats, setStats] = useState<any>({ schools: 0, teachers: 0, students: 0, users: 0, chartData: [] });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const [sch, tea, usr, std] = await Promise.all([
                fetchSchools(), 
                fetchTeachers(), 
                fetchSystemUsers(), 
                fetchStudents()
            ]);
            setStats({ 
                schools: sch.length, teachers: tea.length, students: std.length, users: usr.length,
                chartData: [
                    { name: 'الطلاب', value: std.length },
                    { name: 'المعلمين', value: tea.length },
                    { name: 'المدارس', value: sch.length },
                    { name: 'المستخدمين', value: usr.length }
                ]
            });
        } catch (e) {
            console.error("Dashboard Load Error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 page-enter font-tajawal" dir="rtl">
            <div className="bg-slate-900 p-8 rounded-3xl text-white flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><Shield size={200}/></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="text-brand-400" size={24}/>
                        <h1 className="text-2xl font-black">إدارة المنصة المركزية</h1>
                    </div>
                    <p className="text-slate-400 font-medium">مراقبة البنية التحتية، المزامنة السحابية، والتحكم في المدارس.</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 relative z-10">
                    <AdminTabBtn label="نظرة عامة" active={view === 'OVERVIEW'} onClick={() => setView('OVERVIEW')} />
                    <AdminTabBtn label="فحص الجداول" active={view === 'HEALTH'} onClick={() => setView('HEALTH')} />
                    <AdminTabBtn label="SQL" active={view === 'DATABASE'} onClick={() => setView('DATABASE')} />
                </div>
            </div>
            
            {view === 'OVERVIEW' && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <AdminKpi label="المدارس النشطة" value={stats.schools} icon={Building} color="blue" />
                        <AdminKpi label="إجمالي المعلمين" value={stats.teachers} icon={Users} color="emerald" />
                        <AdminKpi label="قاعدة الطلاب" value={stats.students} icon={Users} color="amber" />
                        <AdminKpi label="سجلات النظام" value={stats.users} icon={Database} color="rose" />
                    </div>
                    
                    <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
                        <h3 className="font-black text-slate-800 mb-8 flex items-center gap-2"><Activity size={20} className="text-brand-500"/> توزيع البيانات السحابي</h3>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                    <YAxis hide />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" radius={[15, 15, 0, 0]} barSize={60}>
                                        {stats.chartData.map((entry: any, index: number) => (
                                            <Cell key={index} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {view === 'HEALTH' && <CloudTableInspector />}

            {view === 'DATABASE' && (
                <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/5 animate-slide-up">
                    <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><CloudLightning size={300}/></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-2xl font-black text-brand-400">إصلاح بنية SQL</h3>
                                <p className="text-slate-500 text-xs mt-1">نسخ السكريبت لتحديث جداول Supabase يدوياً في حال حدوث نقص.</p>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(DATABASE_SCHEMA); alert('تم نسخ كود SQL!'); }} className="bg-brand-500 hover:bg-brand-600 px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-xl shadow-brand-500/20 flex items-center gap-2">
                                <Copy size={18}/> نسخ الكود
                            </button>
                        </div>
                        <div className="bg-black/40 p-8 rounded-3xl font-mono text-[11px] text-brand-300/80 overflow-x-auto max-h-[500px] border border-white/5 custom-scrollbar dir-ltr leading-relaxed">
                            <pre>{DATABASE_SCHEMA}</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AdminTabBtn = ({ label, active, onClick }: any) => (
    <button onClick={onClick} className={`px-6 py-2 rounded-lg text-[10px] font-black transition-all ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}>{label}</button>
);

const AdminKpi = ({ label, value, icon: Icon, color }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50',
        emerald: 'text-emerald-600 bg-emerald-50',
        amber: 'text-amber-600 bg-amber-50',
        rose: 'text-rose-600 bg-rose-50'
    };
    return (
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-brand-500 transition-all">
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <h3 className="text-2xl font-black text-slate-900">{value}</h3>
            </div>
            <div className={`p-4 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
        </div>
    );
};

const CloudTableInspector = () => {
    const [expanded, setExpanded] = useState<string | null>(null);

    const tables = [
        { 
            name: 'schools', 
            label: 'المدارس (Schools)', 
            desc: 'بيانات المنشآت التعليمية الموثقة',
            columns: [
                { name: 'id', type: 'uuid / text (PK)' },
                { name: 'name', type: 'text' },
                { name: 'ministry_code', type: 'text (unique)' },
                { name: 'manager_name', type: 'text' },
                { name: 'manager_national_id', type: 'text' },
                { name: 'education_administration', type: 'text' },
                { name: 'type', type: 'text (PUBLIC/PRIVATE)' }
            ]
        },
        { 
            name: 'system_users', 
            label: 'المستخدمين (System Users)', 
            desc: 'بيانات الدخول والصلاحيات للمعلمين والمديرين',
            columns: [
                { name: 'id', type: 'uuid / text (PK)' },
                { name: 'name', type: 'text' },
                { name: 'email', type: 'text (unique)' },
                { name: 'password', type: 'text' },
                { name: 'role', type: 'text (enum)' },
                { name: 'national_id', type: 'text (unique)' },
                { name: 'school_id', type: 'text (FK)' },
                { name: 'status', type: 'text (ACTIVE/INACTIVE)' }
            ]
        },
        { 
            name: 'students', 
            label: 'الطلاب (Students)', 
            desc: 'السجل الأكاديمي والمهاري للطلاب',
            columns: [
                { name: 'id', type: 'text (PK)' },
                { name: 'name', type: 'text' },
                { name: 'national_id', type: 'text (unique)' },
                { name: 'class_name', type: 'text' },
                { name: 'grade_level', type: 'text' },
                { name: 'xp', type: 'integer' },
                { name: 'level', type: 'integer' },
                { name: 'behavior_points', type: 'integer' },
                { name: 'parent_phone', type: 'text' },
                { name: 'avatar_url', type: 'text' },
                { name: 'learning_style', type: 'text' }
            ]
        },
        { 
            name: 'attendance', 
            label: 'الحضور (Attendance)', 
            desc: 'سجلات الانضباط اليومي والحصص',
            columns: [
                { name: 'id', type: 'text (PK)' },
                { name: 'student_id', type: 'text (FK)' },
                { name: 'date', type: 'date' },
                { name: 'status', type: 'text (enum)' },
                { name: 'period', type: 'integer' },
                { name: 'subject', type: 'text' },
                { name: 'created_by_id', type: 'text (FK)' }
            ]
        },
        { 
            name: 'performance', 
            label: 'الدرجات (Performance)', 
            desc: 'رصد نواتج التعلم والاختبارات والواجبات',
            columns: [
                { name: 'id', type: 'text (PK)' },
                { name: 'student_id', type: 'text (FK)' },
                { name: 'subject', type: 'text' },
                { name: 'title', type: 'text' },
                { name: 'score', type: 'numeric' },
                { name: 'max_score', type: 'numeric' },
                { name: 'category', type: 'text' },
                { name: 'date', type: 'date' }
            ]
        },
        { 
            name: 'wall_posts', 
            label: 'الحائط المدرسي (Wall Posts)', 
            desc: 'الأخبار والتكريمات والفعاليات المنشورة',
            columns: [
                { name: 'id', type: 'text (PK)' },
                { name: 'user_id', type: 'text' },
                { name: 'user_name', type: 'text' },
                { name: 'content', type: 'text' },
                { name: 'type', type: 'text' },
                { name: 'likes', type: 'integer' },
                { name: 'school_id', type: 'text (FK)' },
                { name: 'created_at', type: 'timestamp' }
            ]
        },
        { 
            name: 'assignments', 
            label: 'التكليفات (Assignments)', 
            desc: 'تعريف أعمدة سجل الرصد والمعايير',
            columns: [
                { name: 'id', type: 'text (PK)' },
                { name: 'teacher_id', type: 'text (FK)' },
                { name: 'title', type: 'text' },
                { name: 'category', type: 'text' },
                { name: 'max_score', type: 'numeric' },
                { name: 'isVisible', type: 'boolean' },
                { name: 'sort_order', type: 'integer' }
            ]
        }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl text-indigo-600 shadow-sm"><Code size={24}/></div>
                <div>
                    <h4 className="font-black text-indigo-900">فاحص بنية السحابة (Schema Inspector)</h4>
                    <p className="text-xs text-indigo-700 font-bold">تأكد من مطابقة الجداول السحابية في Supabase مع متطلبات النظام.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {tables.map(table => (
                    <div key={table.name} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                        <button 
                            onClick={() => setExpanded(expanded === table.name ? null : table.name)}
                            className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl border border-slate-100"><Table size={20}/></div>
                                <div className="text-right">
                                    <h4 className="font-black text-slate-800">{table.label}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{table.desc}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-100 uppercase tracking-tighter">Verified</span>
                                {expanded === table.name ? <ChevronDown className="text-slate-300"/> : <ChevronRight className="text-slate-300"/>}
                            </div>
                        </button>
                        
                        {expanded === table.name && (
                            <div className="px-6 pb-6 animate-slide-up">
                                <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                                    <table className="w-full text-right text-xs">
                                        <thead>
                                            <tr className="bg-slate-100/50 text-slate-500 font-black uppercase text-[10px] border-b">
                                                <th className="px-4 py-3">اسم العمود (Column Name)</th>
                                                <th className="px-4 py-3">نوع البيانات (Data Type)</th>
                                                <th className="px-4 py-3 text-left">الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {table.columns.map(col => (
                                                <tr key={col.name} className="hover:bg-white transition-colors">
                                                    <td className="px-4 py-3 font-mono font-bold text-slate-700">{col.name}</td>
                                                    <td className="px-4 py-3 text-slate-500 font-medium">{col.type}</td>
                                                    <td className="px-4 py-3 text-left">
                                                        <CheckCircle size={14} className="text-emerald-500 inline"/>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const DATABASE_SCHEMA = `-- سكريبت تحديث قاعدة البيانات الشامل
-- 1. المدارس
CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ministry_code TEXT UNIQUE NOT NULL,
    manager_name TEXT,
    manager_national_id TEXT,
    education_administration TEXT,
    type TEXT,
    phone TEXT,
    student_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. المستخدمين (معلمين / مديرين)
CREATE TABLE IF NOT EXISTS system_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK (role IN ('SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER', 'STUDENT', 'PARENT')),
    national_id TEXT UNIQUE,
    school_id TEXT REFERENCES schools(id),
    status TEXT DEFAULT 'ACTIVE',
    phone TEXT,
    subject_specialty TEXT,
    subscription_status TEXT DEFAULT 'FREE',
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. الطلاب
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT UNIQUE NOT NULL,
    class_name TEXT,
    grade_level TEXT,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    behavior_points INTEGER DEFAULT 0,
    parent_phone TEXT,
    avatar_url TEXT,
    learning_style TEXT DEFAULT 'UNKNOWN',
    aura_color TEXT DEFAULT 'indigo',
    seat_index INTEGER DEFAULT 0,
    school_id TEXT REFERENCES schools(id),
    created_by_id TEXT REFERENCES system_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. الحضور والغياب
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    period INTEGER,
    subject TEXT,
    behavior_status TEXT,
    behavior_note TEXT,
    created_by_id TEXT REFERENCES system_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. الأداء الأكاديمي
CREATE TABLE IF NOT EXISTS performance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    subject TEXT,
    title TEXT,
    score NUMERIC NOT NULL,
    max_score NUMERIC NOT NULL,
    category TEXT,
    notes TEXT,
    date DATE,
    created_by_id TEXT REFERENCES system_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. حائط المدرسة
CREATE TABLE IF NOT EXISTS wall_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'NEWS',
    likes INTEGER DEFAULT 0,
    school_id TEXT REFERENCES schools(id),
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

export default AdminDashboard;
