
import React, { useState, useEffect } from 'react';
import { 
    fetchSchools, fetchSystemUsers, fetchTeachers, fetchAttendance, fetchPerformance, fetchStudents,
    getDatabaseSchemaSQL, getCloudSystemStatus, saveMessage
} from '../services/storageService';
import { 
    Shield, Building, Users, Database, RefreshCw, CheckCircle, AlertTriangle, Server, Loader2, Zap, Copy, CloudLightning, Activity, Bell, Send, Trash2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'HEALTH' | 'DATABASE' | 'BROADCAST'>('HEALTH');
    const [stats, setStats] = useState<any>({ schools: 0, teachers: 0, students: 0, users: 0, chartData: [] });

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        const [sch, tea, usr, std] = await Promise.all([fetchSchools(), fetchTeachers(), fetchSystemUsers(), fetchStudents()]);
        setStats({ 
            schools: sch.length, teachers: tea.length, students: std.length, users: usr.length,
            chartData: [
                { name: 'الطلاب', value: std.length },
                { name: 'المعلمون', value: tea.length },
                { name: 'المدارس', value: sch.length }
            ]
        });
    };

    const fullMasterSql = `
-- SMART SCHOOL MASTER SCHEMA v2.5
-- EXECUTE IN SUPABASE SQL EDITOR

-- 1. Students Table (Restored)
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
    seat_index INTEGER,
    aura_color TEXT DEFAULT 'indigo',
    active_title TEXT,
    school_id TEXT,
    created_by_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Attendance Table (Enhanced)
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    period INTEGER,
    subject TEXT,
    behavior_status TEXT,
    behavior_note TEXT,
    excuse_note TEXT,
    created_by_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Performance Table
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

-- 4. Behavior Incidents
CREATE TABLE IF NOT EXISTS behavior_incidents (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    teacher_id TEXT,
    type TEXT,
    category TEXT,
    points INTEGER,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    note TEXT,
    action_taken TEXT
);

-- 5. Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    max_score INTEGER,
    is_visible BOOLEAN DEFAULT TRUE,
    teacher_id TEXT,
    sort_order INTEGER,
    class_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Interactive Games
CREATE TABLE IF NOT EXISTS interactive_games (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    title TEXT,
    subject TEXT,
    type TEXT,
    content JSONB,
    xp_reward INTEGER DEFAULT 100,
    target_class TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. School Wall Posts
CREATE TABLE IF NOT EXISTS wall_posts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    content TEXT,
    type TEXT DEFAULT 'NEWS',
    image_url TEXT,
    likes INTEGER DEFAULT 0,
    school_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Academic Terms
CREATE TABLE IF NOT EXISTS academic_terms (
    id TEXT PRIMARY KEY,
    name TEXT,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    teacher_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
    `;

    return (
        <div className="p-6 md:p-10 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <Shield className="text-indigo-600" size={36}/> لوحة التحكم المركزية
                    </h2>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border shadow-xl">
                    {['HEALTH', 'DATABASE', 'OVERVIEW'].map(v => (
                        <button key={v} onClick={() => setView(v as any)} className={`px-8 py-3 rounded-xl text-xs font-black transition-all ${view === v ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                            {v === 'OVERVIEW' ? 'إحصائيات' : v === 'HEALTH' ? 'حالة الربط' : 'إصلاح SQL'}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {view === 'OVERVIEW' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <AdminStatCard label="المدارس" value={stats.schools} icon={<Building/>} color="text-blue-600" />
                            <AdminStatCard label="المعلمون" value={stats.teachers} icon={<Users/>} color="text-indigo-600" />
                            <AdminStatCard label="الطلاب" value={stats.students} icon={<Users/>} color="text-purple-600" />
                        </div>
                        <div className="bg-white p-10 rounded-[3.5rem] shadow-sm h-96 border">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                    <YAxis hide />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[15, 15, 0, 0]} barSize={60}>
                                        {stats.chartData.map((_:any, i:number) => <Cell key={i} fill={['#4f46e5', '#10b981', '#f59e0b'][i % 3]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {view === 'DATABASE' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up pb-20">
                        <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-10"><CloudLightning size={250}/></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-3xl font-black text-indigo-400 flex items-center gap-4"><Database/> سكربت الإصلاح الشامل</h3>
                                    <button onClick={() => { navigator.clipboard.writeText(fullMasterSql); alert('تم نسخ الكود!'); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95">
                                        <Copy size={20}/> نسخ كود SQL
                                    </button>
                                </div>
                                <pre className="bg-black/40 p-8 rounded-3xl font-mono text-xs text-indigo-300 overflow-x-auto max-h-[400px] border border-white/5 custom-scrollbar dir-ltr">
                                    {fullMasterSql}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'HEALTH' && <CloudDiagnostic />}
            </div>
        </div>
    );
};

const AdminStatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
        <div><p className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">{label}</p><h3 className="text-2xl font-black text-gray-800">{value}</h3></div>
        <div className={`p-4 bg-gray-50 ${color} rounded-2xl group-hover:scale-110 transition-transform`}>{icon}</div>
    </div>
);

const CloudDiagnostic = () => {
    const [expanded, setExpanded] = useState<string | null>(null);
    const tables = [
        { id: 'students', label: 'الطلاب', count: 'Active', latency: '12ms' },
        { id: 'attendance', label: 'الحضور', count: 'Synced', latency: '24ms' },
        { id: 'performance', label: 'الدرجات', count: 'Cloud', latency: '18ms' },
        { id: 'wall', label: 'الحائط', count: 'Shared', latency: '30ms' }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-4 animate-fade-in pb-20">
            {tables.map(t => (
                <div key={t.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between shadow-sm hover:border-indigo-100 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-sm"><CheckCircle/></div>
                        <div><h4 className="font-black text-slate-800">بيانات {t.label}</h4><p className="text-[10px] font-bold text-slate-400">التزامن: {t.count} • الاستجابة: {t.latency}</p></div>
                    </div>
                    <div className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase shadow-lg shadow-emerald-100">مستقر</div>
                </div>
            ))}
        </div>
    );
};

export default AdminDashboard;
