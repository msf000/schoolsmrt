
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getSchools, fetchSchools, updateSchool, deleteSchool,
    getSystemUsers, fetchSystemUsers, updateSystemUser, deleteSystemUser,
    getTeachers, fetchTeachers, updateTeacher,
    fetchAttendance, fetchPerformance, fetchStudents,
    checkConnection, downloadFromSupabase, getDatabaseSchemaSQL
} from '../services/storageService';
import { AttendanceStatus, School, Teacher, SystemUser } from '../types';
import { 
    Shield, Building, Users, Settings, Database, 
    RefreshCw, Trash2, Edit, CheckCircle, Info, 
    AlertTriangle, CloudLightning, CreditCard, Search, UserCog, 
    Crown, Lock, Unlock, ArrowRight, Save, Copy, Wifi
} from 'lucide-react';

const AdminOverview = ({ stats, connectionSource, onLoad }: any) => (
    <div className="space-y-6 animate-fade-in">
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${connectionSource === 'VERCEL_ENV' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-3">
                {connectionSource === 'VERCEL_ENV' ? <CheckCircle className="text-green-600"/> : <AlertTriangle className="text-amber-600"/>}
                <div>
                    <p className="text-xs font-black text-gray-500 uppercase">مصدر الاتصال السحابي</p>
                    <h4 className="font-bold text-gray-800">
                        {connectionSource === 'VERCEL_ENV' ? 'متصل تلقائياً (Vercel Env)' : 'متصل يدوياً (Local Storage)'}
                    </h4>
                </div>
            </div>
            <button onClick={onLoad} className="p-2 bg-white rounded-xl shadow-sm border hover:bg-gray-50 transition-colors">
                <RefreshCw size={18} className="text-indigo-600"/>
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="المدارس المسجلة" value={stats.schools} icon={<Building size={24}/>} color="bg-blue-50 text-blue-600" />
            <StatCard label="المعلمون" value={stats.teachers} icon={<Users size={24}/>} color="bg-indigo-50 text-indigo-600" />
            <StatCard label="إجمالي المستخدمين" value={stats.users} icon={<UserCog size={24}/>} color="bg-purple-50 text-purple-600" />
            <StatCard label="الاشتراكات النشطة" value={stats.proTeachers} icon={<Crown size={24}/>} color="bg-yellow-50 text-yellow-600" />
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
            <div className="relative z-10">
                <h3 className="text-xl font-black mb-4 flex items-center gap-3"><Shield className="text-yellow-400"/> تنبيهات الإدارة العامة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <p className="text-sm opacity-90 leading-relaxed">
                            أنت في وضع **التحكم الشامل**. التغييرات التي تجريها هنا على المدارس أو حسابات المستخدمين يتم مزامنتها فورياً مع السحابة وتؤثر على دخول المستخدمين.
                        </p>
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                            <h4 className="font-bold text-yellow-400 mb-1">تنسيق البيانات:</h4>
                            <p className="text-xs">تأكد من صحة الرموز الوزارية للمدارس لضمان ربط المعلمين بشكل صحيح.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const StatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div><p className="text-gray-500 text-xs font-bold mb-1">{label}</p><h3 className="text-3xl font-black text-gray-800">{value}</h3></div>
        <div className={`p-3 ${color} rounded-full`}>{icon}</div>
    </div>
);

const SchoolsManager = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const data = await fetchSchools();
        setSchools(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if(confirm('سيتم حذف المدرسة وفك ارتباط جميع معلميها. هل أنت متأكد؟')) {
            await deleteSchool(id);
            load();
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse">جاري جلب قائمة المدارس...</div>;

    return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-black text-gray-800 flex items-center gap-2"><Building size={18}/> إدارة المدارس والمنشآت ({schools.length})</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                        <tr><th className="p-4">اسم المدرسة</th><th className="p-4">الرمز الوزاري</th><th className="p-4">المدير المسجل</th><th className="p-4 text-center">الطلاب</th><th className="p-4 text-center">الإجراءات</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {schools.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-indigo-700">{s.name}</td>
                                <td className="p-4 font-mono font-bold text-slate-500">{s.ministryCode}</td>
                                <td className="p-4 text-gray-600">{s.managerName}</td>
                                <td className="p-4 text-center"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{s.studentCount}</span></td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const UsersManager = () => {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const data = await fetchSystemUsers();
        setUsers(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if(confirm('حذف المستخدم نهائياً؟ لن يتمكن من تسجيل الدخول.')) {
            await deleteSystemUser(id);
            load();
        }
    };

    const filtered = users.filter(u => u.name.includes(search) || u.email.includes(search) || u.nationalId?.includes(search));

    if (loading) return <div className="p-10 text-center animate-pulse">جاري جلب المستخدمين...</div>;

    return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-fade-in flex flex-col h-full">
            <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-black text-gray-800 flex items-center gap-2"><UserCog size={18}/> إدارة كافة المستخدمين</h3>
                <div className="relative w-full md:w-64">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={16}/>
                    <input className="w-full pr-10 pl-4 py-2 border rounded-xl text-xs outline-none" placeholder="بحث باسم المستخدم أو الهوية..." value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                    <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0">
                        <tr><th className="p-4">المستخدم</th><th className="p-4">الهوية/البريد</th><th className="p-4">الدور</th><th className="p-4">الحالة</th><th className="p-4 text-center">تحكم</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800">{u.name}</td>
                                <td className="p-4 text-gray-500 font-mono">{u.nationalId || u.email}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        u.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' :
                                        u.role === 'TEACHER' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                                    }`}>{u.role}</span>
                                </td>
                                <td className="p-4">
                                    <span className={`flex items-center gap-1 font-bold ${u.status === 'ACTIVE' ? 'text-green-600' : 'text-red-500'}`}>
                                        <div className={`w-2 h-2 rounded-full ${u.status === 'ACTIVE' ? 'bg-green-600' : 'bg-red-500'}`}></div> {u.status}
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    <button onClick={() => handleDelete(u.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const SubscriptionsManager = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        const data = await fetchTeachers();
        setTeachers(data);
        setLoading(false);
    };

    const togglePro = async (t: Teacher) => {
        const newStatus = t.subscriptionStatus === 'PRO' ? 'FREE' : 'PRO';
        const newEndDate = newStatus === 'PRO' ? new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString() : undefined;
        await updateTeacher({ ...t, subscriptionStatus: newStatus as any, subscriptionEndDate: newEndDate });
        load();
    };

    return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-fade-in">
            <div className="p-6 border-b bg-indigo-50 flex justify-between items-center">
                <div>
                    <h3 className="font-black text-indigo-900 flex items-center gap-2 text-lg"><Crown className="text-yellow-500" size={24}/> تتبع اشتراكات المعلمين</h3>
                    <p className="text-xs text-indigo-600 font-bold mt-1">تحديد من يملك صلاحيات PRO والأدوات الذكية.</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-100 text-gray-600 font-bold">
                        <tr><th className="p-4">المعلم</th><th className="p-4">الباقة الحالية</th><th className="p-4">تاريخ الانتهاء</th><th className="p-4 text-center">إدارة الاشتراك</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {teachers.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800">{t.name}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 w-fit ${t.subscriptionStatus === 'PRO' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-gray-100 text-gray-600'}`}>
                                        {t.subscriptionStatus === 'PRO' ? <Crown size={12}/> : <CheckCircle size={12}/>} {t.subscriptionStatus || 'FREE'}
                                    </span>
                                </td>
                                <td className="p-4 font-mono text-xs text-gray-400">{t.subscriptionEndDate ? new Date(t.subscriptionEndDate).toLocaleDateString('ar-SA') : '--'}</td>
                                <td className="p-4 text-center">
                                    <button onClick={() => togglePro(t)} className={`text-xs font-black px-6 py-2 rounded-xl border transition-all ${t.subscriptionStatus === 'PRO' ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50 shadow-sm'}`}>
                                        {t.subscriptionStatus === 'PRO' ? 'إلغاء الترقية' : 'منح باقة PRO'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DatabaseSettings = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const handleForceSync = async () => {
        setIsSyncing(true);
        const res = await downloadFromSupabase();
        setIsSyncing(false);
        alert(res.success ? 'تم تحديث البيانات المحلية من السحابة بنجاح!' : 'فشل الاتصال بالسحابة.');
    };

    const handleTest = async () => {
        setIsTesting(true);
        const res = await checkConnection();
        setIsTesting(false);
        alert(res.success ? 'قاعدة البيانات السحابية متصلة وسليمة ✅' : 'فشل في الوصول لقاعدة البيانات ❌');
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
            <div className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg animate-pulse"><CloudLightning size={32}/></div>
                    <div>
                        <h3 className="text-xl font-black text-gray-800">مزامنة البيانات القسرية</h3>
                        <p className="text-sm text-gray-500 font-medium">استخدم هذا الخيار إذا لاحظت نقصاً في بيانات المدارس أو المستخدمين.</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handleTest} disabled={isTesting} className="flex-1 md:flex-none px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 shadow-sm transition-all">
                        {isTesting ? <RefreshCw className="animate-spin" size={18}/> : <Wifi size={18}/>} اختبار
                    </button>
                    <button onClick={handleForceSync} disabled={isSyncing} className="flex-[2] md:flex-none bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {isSyncing ? <RefreshCw className="animate-spin" size={20}/> : <RefreshCw size={20}/>} تحديث السحابة
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 text-white p-10 rounded-[3rem] relative overflow-hidden border-b-[8px] border-slate-950">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Database size={100}/></div>
                <h4 className="font-black text-2xl mb-4 flex items-center gap-3 text-indigo-400"><Database size={32}/> كود تهيئة الجداول (SQL)</h4>
                <p className="text-sm text-gray-400 mb-8 leading-relaxed max-w-2xl">
                    عند إنشاء مشروع Supabase جديد، انسخ هذا الكود وقم بتشغيله في "SQL Editor" لإنشاء البنية التحتية اللازمة للنظام (المدارس، المعلمين، المستخدمين...).
                </p>
                <button onClick={()=>{navigator.clipboard.writeText(getDatabaseSchemaSQL()); alert('تم نسخ كود SQL!');}} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl active:scale-95">
                    <Copy size={20}/> نسخ كود SQL الأساسي
                </button>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'SCHOOLS' | 'USERS' | 'SUBS' | 'DATABASE'>('OVERVIEW');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ schools: 0, teachers: 0, students: 0, users: 0, proTeachers: 0, attendanceToday: 0 });

    const connectionSource = useMemo(() => {
        if (import.meta.env.VITE_SUPABASE_URL) return 'VERCEL_ENV';
        if (localStorage.getItem('custom_supabase_url')) return 'MANUAL_LOCAL';
        return 'NOT_CONFIGURED';
    }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const [sch, tea, usr, att] = await Promise.all([
                fetchSchools(), fetchTeachers(), fetchSystemUsers(), fetchAttendance()
            ]);
            const today = new Date().toISOString().split('T')[0];
            const todaysAtt = att.filter(a => a.date === today);
            const attRate = todaysAtt.length > 0 ? Math.round((todaysAtt.filter(a => a.status === AttendanceStatus.PRESENT).length / todaysAtt.length) * 100) : 0;
            const proCount = tea.filter(t => t.subscriptionStatus === 'PRO').length;

            setStats({ 
                schools: sch.length, teachers: tea.length, students: 0, 
                users: usr.length, proTeachers: proCount, attendanceToday: attRate 
            });
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    useEffect(() => { loadStats(); }, []);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3"><Shield className="text-indigo-600" size={36}/> لوحة تحكم مدير النظام</h2>
                    <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">إدارة البنية التحتية والوصول الشامل</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <button onClick={() => setView('OVERVIEW')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${view === 'OVERVIEW' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>الإحصائيات</button>
                    <button onClick={() => setView('SCHOOLS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${view === 'SCHOOLS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Building size={14}/> المدارس</button>
                    <button onClick={() => setView('USERS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${view === 'USERS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><UserCog size={14}/> المستخدمين</button>
                    <button onClick={() => setView('SUBS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${view === 'SUBS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Crown size={14}/> الاشتراكات</button>
                    <button onClick={() => setView('DATABASE')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${view === 'DATABASE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Database size={14}/> قاعدة البيانات</button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {view === 'OVERVIEW' && <AdminOverview stats={stats} connectionSource={connectionSource} onLoad={loadStats} />}
                {view === 'SCHOOLS' && <SchoolsManager />}
                {view === 'USERS' && <UsersManager />}
                {view === 'SUBS' && <SubscriptionsManager />}
                {view === 'DATABASE' && <DatabaseSettings />}
            </div>
        </div>
    );
};

export default AdminDashboard;
