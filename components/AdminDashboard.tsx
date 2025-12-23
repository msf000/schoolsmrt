import React, { useState, useEffect, useMemo } from 'react';
import { 
    getSchools, fetchSchools,
    getSystemUsers, fetchSystemUsers,
    getTeachers, fetchTeachers,
    getStudents, fetchStudents,
    fetchAttendance, fetchPerformance,
    checkConnection,
    getDatabaseSchemaSQL, downloadFromSupabase
} from '../services/storageService';
import { updateSupabaseConfig } from '../services/supabaseClient';
import { AttendanceStatus } from '../types';
import { 
    Shield, Building, Users, Settings, Database, 
    RefreshCw, Save, Wifi, Globe, HardDrive, Code, Copy, CheckCircle, Info, AlertTriangle, CloudLightning
} from 'lucide-react';

const AdminOverview = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ schools: 0, teachers: 0, students: 0, users: 0, attendanceToday: 0 });
    
    const connectionSource = useMemo(() => {
        if (import.meta.env.VITE_SUPABASE_URL) return 'VERCEL_ENV';
        if (localStorage.getItem('custom_supabase_url')) return 'MANUAL_LOCAL';
        return 'NOT_CONFIGURED';
    }, []);

    const load = async () => {
        setIsLoading(true);
        try {
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
        load();
    }, []);

    if (isLoading) return <div className="p-20 text-center"><RefreshCw className="animate-spin mx-auto mb-4 text-indigo-600" size={40}/><p className="font-bold text-gray-400">جاري جلب بيانات النظام...</p></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${connectionSource === 'VERCEL_ENV' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center gap-3">
                    {connectionSource === 'VERCEL_ENV' ? <Globe className="text-green-600"/> : <HardDrive className="text-amber-600"/>}
                    <div>
                        <p className="text-xs font-black text-gray-500 uppercase">مصدر الاتصال السحابي</p>
                        <h4 className="font-bold text-gray-800">
                            {connectionSource === 'VERCEL_ENV' ? 'متصل تلقائياً عبر Vercel Environment' : 'متصل يدوياً عبر هذا المتصفح فقط'}
                        </h4>
                    </div>
                </div>
                <button onClick={load} className="p-2 bg-white rounded-xl shadow-sm border hover:bg-gray-50 transition-colors">
                    <RefreshCw size={18} className="text-indigo-600"/>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="المدارس" value={stats.schools} icon={<Building size={24}/>} color="bg-blue-50 text-blue-600" />
                <StatCard label="المعلمون" value={stats.teachers} icon={<Users size={24}/>} color="bg-indigo-50 text-indigo-600" />
                <StatCard label="الطلاب" value={stats.students} icon={<CheckCircle size={24}/>} color="bg-green-50 text-green-600" />
                <StatCard label="حضور النظام" value={`${stats.attendanceToday}%`} icon={<RefreshCw size={24}/>} color="bg-purple-50 text-purple-600" />
            </div>

            <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-black mb-4 flex items-center gap-3"><Info className="text-yellow-400"/> لماذا لا تظهر البيانات على الأجهزة الأخرى؟</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <p className="text-sm opacity-90 leading-relaxed">
                                السبب هو أن المتصفح يحفظ إعدادات الربط في ذاكرته المحلية (**Local Storage**). إذا دخلت من جهاز جديد، ستكون هذه الذاكرة فارغة ولن يتمكن النظام من الوصول للسحابة.
                            </p>
                            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-yellow-400 mb-1">الحل الدائم:</h4>
                                <p className="text-xs">يجب إضافة `VITE_SUPABASE_URL` و `VITE_SUPABASE_KEY` في إعدادات **Vercel Project Settings** تحت بند Environment Variables.</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                             <p className="text-sm opacity-90 leading-relaxed">
                                **تنبيه:** إذا كانت الجداول غير موجودة أو فارغة في السحابة، لن تظهر أي بيانات حتى لو كان الربط سليماً. تأكد من تشغيل كود الـ SQL المرفق في الأسفل.
                            </p>
                            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                                <h4 className="font-bold text-indigo-300 mb-1">المزامنة اليدوية:</h4>
                                <p className="text-xs">استخدم زر "تحديث الآن" أدناه لإجبار النظام على إعادة جلب كل البيانات من السحابة في حال حدوث تعارض.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div><p className="text-gray-500 text-xs font-bold mb-1">{label}</p><h3 className="text-3xl font-black text-gray-800">{value}</h3></div>
        <div className={`p-3 ${color} rounded-full`}>{icon}</div>
    </div>
);

const DatabaseSettings = () => {
    const [dbUrl, setDbUrl] = useState(localStorage.getItem('custom_supabase_url') || '');
    const [dbKey, setDbKey] = useState(localStorage.getItem('custom_supabase_key') || '');
    const [isTesting, setIsTesting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const isEnvConfigured = !!import.meta.env.VITE_SUPABASE_URL;

    const handleSaveConfig = () => {
        if (!dbUrl || !dbKey) return alert('يرجى إدخال جميع الحقول');
        const success = updateSupabaseConfig(dbUrl, dbKey);
        if (success) {
            alert('تم حفظ إعدادات السحابة بنجاح! سيتم إعادة تحميل النظام.');
            window.location.reload();
        } else {
            alert('رابط السحابة غير صالح.');
        }
    };

    const handleForceSync = async () => {
        setIsSyncing(true);
        try {
            const res = await downloadFromSupabase();
            if (res.success) alert('تمت المزامنة وتحديث قاعدة البيانات المحلية بنجاح!');
            else alert('فشل الاتصال بالسحابة. تأكد من إعدادات الربط أو وجود الجداول.');
        } catch (e) {
            alert('حدث خطأ تقني أثناء المزامنة.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        const res = await checkConnection();
        setIsTesting(false);
        alert(res.success ? 'الاتصال بالسحابة سليم ✅' : 'فشل الاتصال بالسحابة ❌ (تأكد من الرابط والمفتاح)');
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
            <div className="bg-white p-8 rounded-2xl border border-indigo-100 shadow-lg shadow-indigo-50 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-lg animate-pulse">
                        <CloudLightning size={32}/>
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-800">تحديث قاعدة البيانات</h3>
                        <p className="text-sm text-gray-500 font-medium">قم بمزامنة البيانات يدوياً من السحابة لإصلاح مشاكل الأجهزة المتعددة.</p>
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
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                        <Database size={28} className="text-gray-600"/>
                        <h3 className="font-black text-xl">إعدادات الربط السحابي</h3>
                    </div>
                    {isEnvConfigured && (
                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black border border-green-200">
                            مفعل عبر Vercel Env
                        </div>
                    )}
                </div>
                
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm flex gap-3 items-start">
                    <AlertTriangle className="shrink-0 mt-1" size={20}/>
                    <p className="font-medium text-xs">
                        تحذير: القيم المدخلة هنا تحفظ في متصفحك الحالي فقط. إذا لم تعمل المزامنة، تأكد من أن حسابك في Supabase مفعل ولم يتجاوز حدود الاستخدام المجاني.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">Supabase URL</label>
                        <input className="w-full p-3 bg-gray-50 border rounded-xl font-mono text-sm dir-ltr focus:ring-2 focus:ring-indigo-500" placeholder="https://xyz.supabase.co" value={dbUrl} onChange={e=>setDbUrl(e.target.value)}/>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 mb-1 uppercase">Anon API Key</label>
                        <input className="w-full p-3 bg-gray-50 border rounded-xl font-mono text-sm dir-ltr focus:ring-2 focus:ring-indigo-500" type="password" placeholder="eyJhbG..." value={dbKey} onChange={e=>setDbKey(e.target.value)}/>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSaveConfig} className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-black shadow-lg hover:bg-black transition-all">حفظ محلي (لهذا الجهاز)</button>
                        <button onClick={handleTestConnection} disabled={isTesting} className="px-6 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50">
                            {isTesting ? <RefreshCw className="animate-spin" size={18}/> : <Wifi size={18}/>} اختبار الاتصال
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden border-b-[8px] border-slate-950">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Code size={80}/></div>
                <h4 className="font-black text-xl mb-3 flex items-center gap-2 text-indigo-400"><Code size={24}/> كود تهيئة الجداول</h4>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                    إذا كان الاتصال ناجحاً ولكن لا تظهر بيانات، انسخ هذا الكود وقم بتشغيله في "SQL Editor" داخل موقع Supabase لإنشاء الجداول اللازمة.
                </p>
                <button onClick={()=>{navigator.clipboard.writeText(getDatabaseSchemaSQL()); alert('تم نسخ كود SQL بنجاح');}} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl">
                    <Copy size={18}/> نسخ كود SQL للإصلاح
                </button>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'DATABASE'>('OVERVIEW');

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3"><Shield className="text-indigo-600" size={32}/> لوحة تحكم الإدارة</h2>
                <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
                    <button onClick={() => setView('OVERVIEW')} className={`px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${view === 'OVERVIEW' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>الإحصائيات</button>
                    <button onClick={() => setView('DATABASE')} className={`px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${view === 'DATABASE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>قاعدة البيانات</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {view === 'OVERVIEW' && <AdminOverview />}
                {view === 'DATABASE' && <DatabaseSettings />}
            </div>
        </div>
    );
};

export default AdminDashboard;