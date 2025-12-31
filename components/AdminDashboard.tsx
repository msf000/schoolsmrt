
import React, { useState, useEffect } from 'react';
import { 
    fetchSchools, fetchSystemUsers, fetchTeachers, fetchAttendance, fetchPerformance, fetchStudents
} from '../services/storageService';
import { 
    Shield, Building, Users, Database, RefreshCw, CheckCircle, AlertTriangle, 
    Server, Loader2, Zap, Copy, CloudLightning, Activity, Table, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'HEALTH' | 'DATABASE'>('OVERVIEW');
    const [stats, setStats] = useState<any>({ schools: 0, teachers: 0, students: 0, users: 0, chartData: [] });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setIsLoading(true);
        const [sch, tea, usr, std] = await Promise.all([fetchSchools(), fetchTeachers(), fetchSystemUsers(), fetchStudents()]);
        setStats({ 
            schools: sch.length, teachers: tea.length, students: std.length, users: usr.length,
            chartData: [
                { name: 'الطلاب', value: std.length },
                { name: 'المعلمين', value: tea.length },
                { name: 'المدارس', value: sch.length },
                { name: 'المستخدمين', value: usr.length }
            ]
        });
        setIsLoading(false);
    };

    return (
        <div className="p-6 md:p-10 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <Shield className="text-indigo-600" size={36}/> لوحة تحكم النظام المركزية
                    </h2>
                    <p className="text-gray-400 font-bold mt-1">مراقبة البنية التحتية السحابية وقواعد البيانات</p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border shadow-xl">
                    <button onClick={() => setView('OVERVIEW')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${view === 'OVERVIEW' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>الإحصائيات</button>
                    <button onClick={() => setView('HEALTH')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${view === 'HEALTH' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>فحص الجداول</button>
                    <button onClick={() => setView('DATABASE')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${view === 'DATABASE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>إصلاح SQL</button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {view === 'OVERVIEW' && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <AdminStatCard label="المدارس" value={stats.schools} icon={<Building/>} color="text-blue-600" />
                            <AdminStatCard label="المعلمون" value={stats.teachers} icon={<Users/>} color="text-indigo-600" />
                            <AdminStatCard label="الطلاب" value={stats.students} icon={<Users/>} color="text-purple-600" />
                            <AdminStatCard label="المستخدمين" value={stats.users} icon={<Database/>} color="text-emerald-600" />
                        </div>
                        
                        <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                    <YAxis hide />
                                    <Tooltip cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" radius={[15, 15, 0, 0]} barSize={60}>
                                        {stats.chartData.map((entry: any, index: number) => (
                                            <Cell key={index} fill={['#3b82f6', '#4f46e5', '#a855f7', '#10b981'][index % 4]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {view === 'HEALTH' && <CloudTableInspector />}

                {view === 'DATABASE' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up pb-20">
                        <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-10"><CloudLightning size={250}/></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-3xl font-black text-indigo-400 flex items-center gap-4"><Database/> بنية الجداول السحابية (SQL)</h3>
                                    <button onClick={() => { navigator.clipboard.writeText(DATABASE_SCHEMA); alert('تم نسخ كود الإصلاح!'); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-2xl font-black text-sm shadow-xl transition-all">
                                        <Copy size={20}/> نسخ كود SQL
                                    </button>
                                </div>
                                <div className="bg-black/40 p-8 rounded-3xl font-mono text-xs text-indigo-300 overflow-x-auto max-h-[500px] border border-white/5 custom-scrollbar dir-ltr">
                                    <pre>{DATABASE_SCHEMA}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminStatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
        <div>
            <p className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">{label}</p>
            <h3 className="text-2xl font-black text-gray-800">{value}</h3>
        </div>
        <div className={`p-4 bg-gray-50 ${color} rounded-2xl group-hover:scale-110 transition-transform`}>{icon}</div>
    </div>
);

const CloudTableInspector = () => {
    const tables = [
        { name: 'students', label: 'الطلاب', columns: ['id', 'name', 'national_id', 'class_name', 'xp', 'seat_index'] },
        { name: 'attendance', label: 'الحضور', columns: ['id', 'student_id', 'date', 'status', 'period', 'subject'] },
        { name: 'performance', label: 'الدرجات', columns: ['id', 'student_id', 'score', 'max_score', 'category', 'notes'] },
        { name: 'assignments', label: 'الأعمدة', columns: ['id', 'teacher_id', 'title', 'category', 'subject', 'period_tag'] },
        { name: 'behavior_incidents', label: 'السلوك', columns: ['id', 'student_id', 'teacher_id', 'points', 'category'] },
        { name: 'parent_requests', label: 'اللقاءات', columns: ['id', 'parent_id', 'student_id', 'teacher_id', 'status'] },
        { name: 'system_users', label: 'المستخدمين', columns: ['id', 'name', 'role', 'email', 'school_id'] }
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tables.map(table => (
                    <div key={table.name} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-300 transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Table size={20}/></div>
                                <h4 className="font-black text-lg text-slate-800">جدول {table.label}</h4>
                            </div>
                            <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-100 uppercase">متصل</span>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">الأعمدة المكتشفة سحابياً:</p>
                            <div className="flex flex-wrap gap-2">
                                {table.columns.map(col => (
                                    <span key={col} className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-100">{col}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DATABASE_SCHEMA = `
-- SQL Script for Cloud Database Repair
-- 1. Students
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT UNIQUE,
    class_id TEXT,
    grade_level TEXT,
    class_name TEXT,
    parent_phone TEXT,
    behavior_points INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    learning_style TEXT DEFAULT 'UNKNOWN',
    seat_index INTEGER DEFAULT 0,
    aura_color TEXT DEFAULT 'indigo',
    active_title TEXT,
    school_id TEXT,
    created_by_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    period INTEGER,
    subject TEXT,
    behavior_status TEXT,
    behavior_note TEXT,
    created_by_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Performance
CREATE TABLE IF NOT EXISTS performance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    subject TEXT,
    title TEXT,
    score NUMERIC,
    max_score NUMERIC,
    date DATE,
    category TEXT,
    notes TEXT,
    created_by_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Assignments (Columns)
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    title TEXT NOT NULL,
    category TEXT,
    max_score NUMERIC DEFAULT 10,
    is_visible BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    class_id TEXT,
    subject TEXT,
    period_tag TEXT,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Behavior Incidents
CREATE TABLE IF NOT EXISTS behavior_incidents (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    teacher_id TEXT,
    type TEXT,
    category TEXT,
    points INTEGER,
    note TEXT,
    action_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Parent Requests
CREATE TABLE IF NOT EXISTS parent_requests (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    teacher_id TEXT,
    type TEXT,
    content TEXT,
    status TEXT,
    date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

export default AdminDashboard;
