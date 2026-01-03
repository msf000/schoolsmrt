
import React, { useState, useEffect } from 'react';
import { 
    fetchSchools, fetchSystemUsers, fetchTeachers, fetchAttendance, fetchPerformance, fetchStudents
} from '../services/storageService';
import { 
    Shield, Building, Users, Database, RefreshCw, CheckCircle, AlertTriangle, 
    Server, Loader2, Zap, Copy, CloudLightning, Activity, Table, ArrowRight,
    Globe, Lock, Layout, ShieldCheck
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
        <div className="space-y-8 page-enter font-tajawal">
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
                    <AdminTabBtn label="الجداول" active={view === 'HEALTH'} onClick={() => setView('HEALTH')} />
                    <AdminTabBtn label="SQL" active={view === 'DATABASE'} onClick={() => setView('DATABASE')} />
                </div>
            </div>
            
            {view === 'OVERVIEW' && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <AdminKpi label="المدارس النشطة" value={stats.schools} icon={Building} color="blue" />
                        <AdminKpi label="إجمالي المعلمين" value={stats.teachers} icon={Briefcase} color="emerald" />
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
                                <p className="text-slate-500 text-xs mt-1">نسخ السكريبت لتحديث جداول Supabase يدوياً.</p>
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
    const tables = [
        { name: 'students', label: 'الطلاب', columns: ['id', 'name', 'national_id', 'class_name', 'xp'] },
        { name: 'attendance', label: 'الحضور', columns: ['id', 'student_id', 'date', 'status', 'period'] },
        { name: 'performance', label: 'الدرجات', columns: ['id', 'student_id', 'score', 'max_score', 'category'] },
        { name: 'system_users', label: 'المستخدمين', columns: ['id', 'name', 'role', 'school_id'] }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {tables.map(table => (
                <div key={table.name} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:border-brand-500 transition-all">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl border border-brand-100"><Table size={20}/></div>
                            <h4 className="font-black text-lg text-slate-800">{table.label}</h4>
                        </div>
                        <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black border border-emerald-100">CLOUD_OK</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {table.columns.map(col => (
                            <span key={col} className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-100">{col}</span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const DATABASE_SCHEMA = `-- سكريبت تحديث قاعدة البيانات
-- 1. المدارس
CREATE TABLE schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ministry_code TEXT UNIQUE,
    manager_name TEXT,
    education_administration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. المعلمين والمستخدمين
CREATE TABLE system_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK (role IN ('SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER', 'STUDENT', 'PARENT')),
    school_id TEXT REFERENCES schools(id),
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

export default AdminDashboard;

const Briefcase = ({ size }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
