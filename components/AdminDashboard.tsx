
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getSchools, fetchSchools, updateSchool, deleteSchool,
    getSystemUsers, fetchSystemUsers, updateSystemUser, deleteSystemUser,
    getTeachers, fetchTeachers, updateTeacher,
    // Add fetchStudents to the import to fix the "Cannot find name 'fetchStudents'" error on line 276
    fetchStudents,
    fetchAttendance, fetchPerformance,
    checkConnection, downloadFromSupabase
} from '../services/storageService';
import { AttendanceStatus, School, Teacher, SystemUser } from '../types';
import { 
    Shield, Building, Users, Settings, Database, 
    RefreshCw, Trash2, Edit, CheckCircle, Info, 
    AlertTriangle, CloudLightning, CreditCard, Search, ExternalLink, UserCog
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
            <StatCard label="المدارس" value={stats.schools} icon={<Building size={24}/>} color="bg-blue-50 text-blue-600" />
            <StatCard label="المعلمون" value={stats.teachers} icon={<Users size={24}/>} color="bg-indigo-50 text-indigo-600" />
            <StatCard label="المستخدمين" value={stats.users} icon={<UserCog size={24}/>} color="bg-purple-50 text-purple-600" />
            <StatCard label="حضور النظام" value={`${stats.attendanceToday}%`} icon={<RefreshCw size={24}/>} color="bg-green-50 text-green-600" />
        </div>

        <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
            <div className="relative z-10">
                <h3 className="text-xl font-black mb-4 flex items-center gap-3"><Info className="text-yellow-400"/> تنبيهات الإدارة العامة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <p className="text-sm opacity-90 leading-relaxed">
                            النظام يعمل الآن بنمط **المزامنة السحابية المباشرة**. أي تعديل تجريه هنا على المدارس أو حسابات المعلمين سينعكس فوراً على قاعدة بيانات Supabase.
                        </p>
                        <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                            <h4 className="font-bold text-yellow-400 mb-1">تنسيق الجداول:</h4>
                            <p className="text-xs">يجب التأكد من مطابقة أسماء الجداول في Supabase للكود (`snake_case`).</p>
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

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        const data = await fetchSchools();
        setSchools(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if(confirm('هل أنت متأكد من حذف هذه المدرسة؟ سيتم قطع ارتباط جميع معلميها.')) {
            await deleteSchool(id);
            load();
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse">جاري جلب قائمة المدارس...</div>;

    return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-black text-gray-800 flex items-center gap-2"><Building size={18}/> إدارة المدارس ({schools.length})</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                        <tr>
                            <th className="p-4">اسم المدرسة</th>
                            <th className="p-4">الرمز الوزاري</th>
                            <th className="p-4">المدير</th>
                            <th className="p-4">الطلاب</th>
                            <th className="p-4 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {schools.map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-indigo-700">{s.name}</td>
                                <td className="p-4 font-mono">{s.ministryCode}</td>
                                <td className="p-4 text-gray-600">{s.managerName}</td>
                                <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{s.studentCount}</span></td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                        {schools.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-gray-400">لا توجد مدارس مسجلة حالياً</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const TeachersManager = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        const data = await fetchTeachers();
        setTeachers(data);
        setLoading(false);
    };

    const toggleSubscription = async (t: Teacher) => {
        const newStatus = t.subscriptionStatus === 'PRO' ? 'FREE' : 'PRO';
        await updateTeacher({ ...t, subscriptionStatus: newStatus as any });
        load();
    };

    if (loading) return <div className="p-10 text-center animate-pulse">جاري جلب قائمة المعلمين...</div>;

    return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <h3 className="font-black text-gray-800 flex items-center gap-2"><Users size={18}/> المعلمون والاشتراكات ({teachers.length})</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                        <tr>
                            <th className="p-4">المعلم</th>
                            <th className="p-4">التخصص</th>
                            <th className="p-4">المدرسة</th>
                            <th className="p-4">حالة الاشتراك</th>
                            <th className="p-4 text-center">تحكم</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {teachers.map(t => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="p-4">
                                    <p className="font-bold text-gray-800">{t.name}</p>
                                    <p className="text-[10px] text-gray-400 font-mono">{t.nationalId}</p>
                                </td>
                                <td className="p-4 text-gray-600">{t.subjectSpecialty}</td>
                                <td className="p-4 text-xs text-gray-500">{t.schoolId || 'غير مرتبط'}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 w-fit ${t.subscriptionStatus === 'PRO' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                        <CreditCard size={12}/> {t.subscriptionStatus || 'FREE'}
                                    </span>
                                </td>
                                <td className="p-4 text-center">
                                    <button onClick={() => toggleSubscription(t)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${t.subscriptionStatus === 'PRO' ? 'text-orange-600 border-orange-200 hover:bg-orange-50' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'}`}>
                                        {t.subscriptionStatus === 'PRO' ? 'إلغاء PRO' : 'ترقية لـ PRO'}
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
    const [dbUrl, setDbUrl] = useState(localStorage.getItem('custom_supabase_url') || '');
    const [dbKey, setDbKey] = useState(localStorage.getItem('custom_supabase_key') || '');
    const [isTesting, setIsTesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSaveConfig = () => {
        if (!dbUrl || !dbKey) return alert('يرجى إدخال جميع الحقول');
        localStorage.setItem('custom_supabase_url', dbUrl);
        localStorage.setItem('custom_supabase_key', dbKey);
        alert('تم الحفظ يدوياً في المتصفح بنجاح.');
        window.location.reload();
    };

    const handleForceSync = async () => {
        setIsSyncing(true);
        const res = await downloadFromSupabase();
        setIsSyncing(false);
        if (res.success) alert('تمت المزامنة وتحديث قاعدة البيانات المحلية بنجاح!');
        else alert('فشل الاتصال بالسحابة.');
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
            <div className="bg-white p-8 rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-50 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg animate-pulse">
                        <CloudLightning size={32}/>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-800">تحديث ومزامنة البيانات</h3>
                        <p className="text-sm text-gray-500 font-medium">سحب أحدث نسخة من الجداول السحابية وتثبيتها محلياً.</p>
                    </div>
                </div>
                <button 
                    onClick={handleForceSync} 
                    disabled={isSyncing}
                    className="w-full md:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isSyncing ? <RefreshCw className="animate-spin"/> : <RefreshCw/>}
                    {isSyncing ? 'جاري التحديث...' : 'تحديث الآن'}
                </button>
            </div>

            <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b pb-4">
                    <Database size={28} className="text-gray-600"/>
                    <h3 className="font-black text-xl">إعدادات الربط اليدوي</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">Supabase URL</label>
                        <input className="w-full p-3 bg-gray-50 border rounded-xl font-mono text-sm dir-ltr focus:ring-2 focus:ring-indigo-500 shadow-inner" placeholder="https://xyz.supabase.co" value={dbUrl} onChange={e=>setDbUrl(e.target.value)}/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">Anon API Key</label>
                        <input className="w-full p-3 bg-gray-50 border rounded-xl font-mono text-sm dir-ltr focus:ring-2 focus:ring-indigo-500 shadow-inner" type="password" placeholder="eyJhbG..." value={dbKey} onChange={e=>setDbKey(e.target.value)}/>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSaveConfig} className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-black shadow-lg hover:bg-black transition-all">حفظ لهذا الجهاز فقط</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'SCHOOLS' | 'TEACHERS' | 'DATABASE'>('OVERVIEW');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ schools: 0, teachers: 0, students: 0, users: 0, attendanceToday: 0 });

    const connectionSource = useMemo(() => {
        if (import.meta.env.VITE_SUPABASE_URL) return 'VERCEL_ENV';
        if (localStorage.getItem('custom_supabase_url')) return 'MANUAL_LOCAL';
        return 'NOT_CONFIGURED';
    }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            // Fix: Added fetchStudents to the imported functions from storageService to solve line 276 error
            const [sch, tea, std, usr, att] = await Promise.all([
                fetchSchools(), fetchTeachers(), fetchStudents(), fetchSystemUsers(), fetchAttendance()
            ]);
            const today = new Date().toISOString().split('T')[0];
            const todaysAtt = att.filter(a => a.date === today);
            const attRate = todaysAtt.length > 0 ? Math.round((todaysAtt.filter(a => a.status === AttendanceStatus.PRESENT).length / todaysAtt.length) * 100) : 0;
            setStats({ schools: sch.length, teachers: tea.length, students: std.length, users: usr.length, attendanceToday: attRate });
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    useEffect(() => {
        loadStats();
    }, []);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3"><Shield className="text-indigo-600" size={32}/> إدارة النظام الشاملة</h2>
                <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <button onClick={() => setView('OVERVIEW')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${view === 'OVERVIEW' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>الإحصائيات</button>
                    <button onClick={() => setView('SCHOOLS')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${view === 'SCHOOLS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Building size={14}/> المدارس</button>
                    <button onClick={() => setView('TEACHERS')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${view === 'TEACHERS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Users size={14}/> المعلمون</button>
                    <button onClick={() => setView('DATABASE')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${view === 'DATABASE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}><Database size={14}/> قاعدة البيانات</button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {view === 'OVERVIEW' && <AdminOverview stats={stats} connectionSource={connectionSource} onLoad={loadStats} />}
                {view === 'SCHOOLS' && <SchoolsManager />}
                {view === 'TEACHERS' && <TeachersManager />}
                {view === 'DATABASE' && <DatabaseSettings />}
            </div>
        </div>
    );
};

export default AdminDashboard;
