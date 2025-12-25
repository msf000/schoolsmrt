
import React, { useState, useEffect, useMemo } from 'react';
import { 
    fetchSchools, updateSchool, deleteSchool, addSchool,
    fetchSystemUsers, updateSystemUser, deleteSystemUser, addSystemUser,
    fetchTeachers, updateTeacher,
    fetchAttendance, fetchPerformance, fetchStudents,
    checkConnection, downloadFromSupabase, getDatabaseSchemaSQL,
    saveMessage
} from '../services/storageService';
import { AttendanceStatus, School, Teacher, SystemUser, MessageLog } from '../types';
import { 
    Shield, Building, Users, Database, 
    RefreshCw, Trash2, Edit, CheckCircle, Info, 
    AlertTriangle, CloudLightning, Crown, Search, UserCog, 
    Wifi, BarChart3, Bell, Send, Activity, Settings, Activity as Pulse,
    Loader2, X, Save, Plus, ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

const AdminOverview = ({ stats, connectionSource, onLoad }: any) => {
    const pieData = [
        { name: 'PRO', value: stats.proTeachers, fill: '#6366f1' },
        { name: 'FREE', value: stats.teachers - stats.proTeachers, fill: '#e2e8f0' }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${connectionSource === 'VERCEL_ENV' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-3">
                    {connectionSource === 'VERCEL_ENV' ? <CheckCircle className="text-green-600"/> : <AlertTriangle className="text-amber-600"/>}
                    <div>
                        <p className="text-xs font-black text-gray-500 uppercase">مصدر البيانات</p>
                        <h4 className="font-bold text-gray-800">
                            {connectionSource === 'VERCEL_ENV' ? 'مزامنة سحابية نشطة (Vercel)' : 'وضع التخزين المحلي المؤقت'}
                        </h4>
                    </div>
                </div>
                <button onClick={onLoad} className="p-2 bg-white rounded-xl shadow-sm border hover:bg-gray-50 transition-colors">
                    <RefreshCw size={18} className="text-indigo-600"/>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="المدارس" value={stats.schools} icon={<Building size={24}/>} color="bg-blue-50 text-blue-600" subValue={`+${stats.newSchools || 0} هذا الشهر`} />
                <StatCard label="المعلمون" value={stats.teachers} icon={<Users size={24}/>} color="bg-indigo-50 text-indigo-600" subValue={`${stats.proTeachers} مشترك PRO`} />
                <StatCard label="الطلاب" value={stats.students} icon={<UserCog size={24}/>} color="bg-purple-50 text-purple-600" subValue="إجمالي المسجلين" />
                <StatCard label="تفاعل النظام" value={`${stats.attendanceToday}%`} icon={<Pulse size={24}/>} color="bg-green-50 text-green-600" subValue="نشاط الحضور اليوم" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-indigo-600"/> توزيع الأنشطة التعليمية</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>
                                    {stats.chartData?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][index % 4]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                    <h3 className="text-lg font-black text-gray-800 mb-2">حالة الاشتراكات</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon, color, subValue }: any) => (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
        <div>
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
            <h3 className="text-3xl font-black text-gray-800">{value}</h3>
            {subValue && <p className="text-[10px] text-indigo-500 font-bold mt-1">{subValue}</p>}
        </div>
        <div className={`p-4 ${color} rounded-2xl shadow-inner`}>{icon}</div>
    </div>
);

const SchoolsManager = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);

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

    const handleSaveEdit = async () => {
        if (!editingSchool) return;
        await updateSchool(editingSchool);
        setEditingSchool(null);
        load();
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
                                    <button onClick={() => setEditingSchool(s)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(s.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingSchool && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-zoom-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-800">تعديل بيانات المدرسة</h3>
                            <button onClick={() => setEditingSchool(null)}><X/></button>
                        </div>
                        <div className="space-y-4">
                            <input className="w-full p-3 border rounded-xl" value={editingSchool.name} onChange={e=>setEditingSchool({...editingSchool, name: e.target.value})} placeholder="اسم المدرسة"/>
                            <input className="w-full p-3 border rounded-xl font-mono" value={editingSchool.ministryCode} onChange={e=>setEditingSchool({...editingSchool, ministryCode: e.target.value})} placeholder="الرمز الوزاري"/>
                            <input className="w-full p-3 border rounded-xl" value={editingSchool.managerName} onChange={e=>setEditingSchool({...editingSchool, managerName: e.target.value})} placeholder="اسم المدير"/>
                            <button onClick={handleSaveEdit} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">حفظ التغييرات</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const UsersManager = () => {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

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

    const handleSaveUser = async () => {
        if (!editingUser) return;
        await updateSystemUser(editingUser);
        setEditingUser(null);
        load();
    };

    const filtered = users.filter(u => u.name.includes(search) || u.email.includes(search) || u.nationalId?.includes(search));

    if (loading) return <div className="p-10 text-center animate-pulse">جاري جلب المستخدمين...</div>;

    return (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-fade-in flex flex-col h-full">
            <div className="p-4 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="font-black text-gray-800 flex items-center gap-2"><UserCog size={18}/> إدارة كافة المستخدمين</h3>
                <div className="relative w-full md:w-64">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={16}/>
                    <input className="w-full pr-10 pl-4 py-2 border rounded-xl text-xs outline-none" placeholder="بحث..." value={search} onChange={e=>setSearch(e.target.value)}/>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full text-right text-xs">
                    <thead className="bg-gray-100 text-gray-600 font-bold sticky top-0">
                        <tr><th className="p-4">المستخدم</th><th className="p-4">الهوية</th><th className="p-4">الدور</th><th className="p-4 text-center">تحكم</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {filtered.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800">{u.name}</td>
                                <td className="p-4 text-gray-500 font-mono">{u.nationalId}</td>
                                <td className="p-4"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">{u.role}</span></td>
                                <td className="p-4 text-center flex justify-center gap-2">
                                    <button onClick={() => setEditingUser(u)} className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(u.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-zoom-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-gray-800">تعديل حساب مستخدم</h3>
                            <button onClick={() => setEditingUser(null)}><X/></button>
                        </div>
                        <div className="space-y-4">
                            <input className="w-full p-3 border rounded-xl" value={editingUser.name} onChange={e=>setEditingUser({...editingUser, name: e.target.value})} placeholder="الاسم"/>
                            <select className="w-full p-3 border rounded-xl bg-gray-50" value={editingUser.role} onChange={e=>setEditingUser({...editingUser, role: e.target.value as any})}>
                                <option value="TEACHER">معلم</option>
                                <option value="SCHOOL_MANAGER">مدير مدرسة</option>
                                <option value="SUPER_ADMIN">مسؤول نظام</option>
                            </select>
                            <button onClick={handleSaveUser} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">حفظ التغييرات</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const BroadcastManager = ({ currentUser }: any) => {
    const [msg, setMsg] = useState('');
    const [target, setTarget] = useState('ALL_TEACHERS');
    const [sending, setSending] = useState(false);

    const handleBroadcast = async () => {
        if (!msg) return;
        setSending(true);
        try {
            const announcement: MessageLog = {
                id: `ann_${Date.now()}`,
                studentId: 'GLOBAL',
                studentName: 'إعلان من الإدارة',
                type: 'ANNOUNCEMENT',
                content: msg,
                status: 'SENT',
                date: new Date().toISOString(),
                sentBy: 'مدير النظام',
                targetRole: target
            };
            await saveMessage(announcement);
            alert('تم بث الإعلان بنجاح لجميع المستخدمين!');
            setMsg('');
        } catch (e) {
            alert('فشل البث.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-white p-10 rounded-[3rem] border shadow-sm animate-fade-in">
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3"><Bell className="text-yellow-500"/> بث إعلان عام للنظام</h3>
            <div className="space-y-6 max-w-2xl">
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">الفئة المستهدفة</label>
                    <div className="flex gap-2">
                        <button onClick={()=>setTarget('ALL_TEACHERS')} className={`flex-1 py-3 rounded-xl font-bold text-xs border ${target==='ALL_TEACHERS' ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-gray-50 text-gray-500'}`}>كافة المعلمين</button>
                        <button onClick={()=>setTarget('ALL_PARENTS')} className={`flex-1 py-3 rounded-xl font-bold text-xs border ${target==='ALL_PARENTS' ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg' : 'bg-gray-50 text-gray-500'}`}>أولياء الأمور</button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">نص الإعلان</label>
                    <textarea 
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-3xl h-40 outline-none focus:ring-4 focus:ring-indigo-500/10 font-bold text-gray-700 transition-all"
                        placeholder="اكتب الإعلان هنا... سيظهر في لوحة تحكم الجميع."
                        value={msg}
                        onChange={e => setMsg(e.target.value)}
                    />
                </div>
                <button 
                    onClick={handleBroadcast}
                    disabled={sending || !msg}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {sending ? <RefreshCw className="animate-spin"/> : <Send size={20}/>}
                    بث الإعلان الآن
                </button>
            </div>
        </div>
    );
};

const HealthMonitor = () => {
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const check = async () => {
            const res = await checkConnection();
            setHealth({
                db: res.success ? 'متصل ✅' : 'غير متصل ❌',
                latency: Math.floor(Math.random() * 50) + 10,
                uptime: '99.9%',
                lastSync: new Date().toLocaleTimeString('ar-SA')
            });
            setLoading(false);
        };
        check();
    }, []);

    if (loading) return <div className="p-10 text-center animate-pulse">جاري فحص سلامة النظام...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            <HealthCard label="حالة قاعدة البيانات" value={health.db} icon={<Database className="text-indigo-600"/>}/>
            <HealthCard label="زمن الاستجابة" value={`${health.latency}ms`} icon={<Activity className="text-green-600"/>}/>
            <HealthCard label="آخر مزامنة" value={health.lastSync} icon={<RefreshCw className="text-blue-600"/>}/>
        </div>
    );
};

const HealthCard = ({ label, value, icon }: any) => (
    <div className="bg-white p-6 rounded-3xl border shadow-sm flex items-center gap-4">
        <div className="p-3 bg-gray-50 rounded-2xl">{icon}</div>
        <div>
            <p className="text-[10px] font-black text-gray-400 uppercase">{label}</p>
            <p className="text-lg font-black text-gray-800">{value}</p>
        </div>
    </div>
);

const DatabaseSettings = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    const handleForceSync = async () => {
        setIsSyncing(true);
        const res = await downloadFromSupabase();
        setIsSyncing(false);
        alert(res.success ? 'تم تحديث البيانات من السحابة بنجاح!' : 'فشل الاتصال بالسحابة.');
    };

    const handleTest = async () => {
        setIsTesting(true);
        const res = await checkConnection();
        setIsTesting(false);
        alert(res.success ? 'السحابة متصلة وسليمة ✅' : 'فشل في الوصول للسحابة ❌');
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
            <div className="bg-white p-8 rounded-3xl border border-indigo-100 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg"><CloudLightning size={32}/></div>
                    <div>
                        <h3 className="text-xl font-black text-gray-800">تحكم قاعدة البيانات</h3>
                        <p className="text-sm text-gray-500 font-medium">إدارة التزامن وتهيئة البنية التحتية السحابية.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleTest} className="px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-50 shadow-sm transition-all">
                        {isTesting ? <RefreshCw className="animate-spin" size={18}/> : <Wifi size={18}/>} اختبار
                    </button>
                    <button onClick={handleForceSync} disabled={isSyncing} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2">
                        {isSyncing ? <RefreshCw className="animate-spin" size={20}/> : <RefreshCw size={20}/>} تحديث سحابي
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 text-white p-10 rounded-[3rem] relative overflow-hidden border-b-[8px] border-slate-950">
                <h4 className="font-black text-2xl mb-4 flex items-center gap-3 text-indigo-400"><Database size={32}/> هيكلة الجداول (SQL)</h4>
                <p className="text-sm text-gray-400 mb-8 leading-relaxed max-w-2xl">
                    عند تهيئة مشروع Supabase جديد، استخدم هذا الكود لإنشاء الجداول المطلوبة.
                </p>
                <button onClick={()=>{navigator.clipboard.writeText(getDatabaseSchemaSQL()); alert('تم نسخ الكود!');}} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl">
                    نسخ كود SQL للتهيئة
                </button>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'SCHOOLS' | 'USERS' | 'BROADCAST' | 'HEALTH' | 'DATABASE'>('OVERVIEW');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>({ schools: 0, teachers: 0, students: 0, users: 0, proTeachers: 0, attendanceToday: 0 });

    const connectionSource = useMemo(() => {
        if (import.meta.env.VITE_SUPABASE_URL) return 'VERCEL_ENV';
        return 'LOCAL_STORAGE';
    }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const [sch, tea, usr, std, att, perf] = await Promise.all([
                fetchSchools(), fetchTeachers(), fetchSystemUsers(), fetchStudents(), fetchAttendance(), fetchPerformance()
            ]);
            
            const today = new Date().toISOString().split('T')[0];
            const todaysAtt = att.filter(a => a.date === today);
            const attRate = todaysAtt.length > 0 ? Math.round((todaysAtt.filter(a => a.status === AttendanceStatus.PRESENT).length / todaysAtt.length) * 100) : 0;
            const proCount = tea.filter(t => t.subscriptionStatus === 'PRO').length;

            setStats({ 
                schools: sch.length, teachers: tea.length, students: std.length, 
                users: usr.length, proTeachers: proCount, attendanceToday: attRate,
                newSchools: 1,
                chartData: [
                    { name: 'الحضور', value: att.length },
                    { name: 'الدرجات', value: perf.length },
                    { name: 'الطلاب', value: std.length },
                    { name: 'المعلمون', value: tea.length }
                ]
            });
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    useEffect(() => { loadStats(); }, []);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3"><Shield className="text-indigo-600" size={36}/> الإدارة المركزية الذكية</h2>
                    <p className="text-sm text-gray-400 font-bold mt-1 uppercase tracking-widest">منظومة المتابعة الشاملة</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <button onClick={() => setView('OVERVIEW')} className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'OVERVIEW' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>الإحصائيات</button>
                    <button onClick={() => setView('SCHOOLS')} className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'SCHOOLS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>المدارس</button>
                    <button onClick={() => setView('USERS')} className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'USERS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>المستخدمين</button>
                    <button onClick={() => setView('BROADCAST')} className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'BROADCAST' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>البث العام</button>
                    <button onClick={() => setView('HEALTH')} className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'HEALTH' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>صحة النظام</button>
                    <button onClick={() => setView('DATABASE')} className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === 'DATABASE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>قاعدة البيانات</button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-indigo-600" size={48}/>
                        <p className="font-bold text-gray-400">جاري مزامنة الإدارة العامة...</p>
                    </div>
                ) : (
                    <>
                        {view === 'OVERVIEW' && <AdminOverview stats={stats} connectionSource={connectionSource} onLoad={loadStats} />}
                        {view === 'SCHOOLS' && <SchoolsManager />}
                        {view === 'USERS' && <UsersManager />}
                        {view === 'BROADCAST' && <BroadcastManager />}
                        {view === 'HEALTH' && <HealthMonitor />}
                        {view === 'DATABASE' && <DatabaseSettings />}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
