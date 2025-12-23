
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getSchools, addSchool, deleteSchool, updateSchool, fetchSchools,
    getSystemUsers, addSystemUser, deleteSystemUser, updateSystemUser, fetchSystemUsers,
    getTeachers, updateTeacher, fetchTeachers,
    getStudents, fetchStudents,
    getAttendance, fetchAttendance,
    getPerformance, fetchPerformance,
    getAISettings, saveAISettings,
    checkConnection, validateCloudSchema,
    DB_MAP, getTableDisplayName, fetchCloudTableData, clearCloudTable, resetCloudDatabase, 
    getDatabaseSchemaSQL, getDatabaseUpdateSQL, createBackup, restoreBackup, backupCloudDatabase, restoreCloudDatabase
} from '../services/storageService';
import { updateSupabaseConfig, isSupabaseConfigured } from '../services/supabaseClient';
import { checkAIConnection } from '../services/geminiService';
import { School, SystemUser, AISettings, Teacher, AttendanceStatus } from '../types';
import { 
    Shield, Building, Users, CreditCard, Settings, Database, 
    Trash2, Download, Upload, AlertTriangle, RefreshCw, Check, Copy, 
    CloudLightning, Save, Wifi, WifiOff, Eye, Search, Plus, X, Edit, 
    Key, GitMerge, CheckCircle, XCircle, BrainCircuit, Code, Activity, BarChart3, PieChart, TrendingUp, Star, Crown, Loader2, Server, Link2, Info, Globe, HardDrive
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';

const AdminOverview = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ schools: 0, teachers: 0, students: 0, users: 0, attendanceToday: 0 });
    
    const connectionSource = useMemo(() => {
        if (import.meta.env.VITE_SUPABASE_URL) return 'VERCEL_ENV';
        if (localStorage.getItem('custom_supabase_url')) return 'MANUAL_LOCAL';
        return 'NOT_CONFIGURED';
    }, []);

    useEffect(() => {
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
        load();
    }, []);

    if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto mb-4" size={40}/><p className="font-bold text-gray-400">جاري جلب بيانات النظام...</p></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Connection Status Header */}
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
                {connectionSource !== 'VERCEL_ENV' && (
                    <div className="text-[10px] bg-amber-200 text-amber-900 px-3 py-1 rounded-full font-black">
                        ينصح بضبط المتغيرات في Vercel للعمل على كافة الأجهزة
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="المدارس" value={stats.schools} icon={<Building size={24}/>} color="bg-blue-50 text-blue-600" />
                <StatCard label="المعلمون" value={stats.teachers} icon={<Users size={24}/>} color="bg-indigo-50 text-indigo-600" />
                <StatCard label="الطلاب" value={stats.students} icon={<CheckCircle size={24}/>} color="bg-green-50 text-green-600" />
                <StatCard label="حضور النظام" value={`${stats.attendanceToday}%`} icon={<Activity size={24}/>} color="bg-purple-50 text-purple-600" />
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

    const handleTestConnection = async () => {
        setIsTesting(true);
        const res = await checkConnection();
        setIsTesting(false);
        alert(res.success ? 'الاتصال بالسحابة سليم ✅' : 'فشل الاتصال بالسحابة ❌');
    };

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
            {/* Cloud Connection Setup */}
            <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b pb-4">
                    <Server size={28} className="text-indigo-600"/>
                    <h3 className="font-black text-xl">إعدادات الاتصال السحابي</h3>
                </div>
                
                {isEnvConfigured && (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-green-800 text-sm flex gap-3 items-center">
                        <CheckCircle className="shrink-0" size={20}/>
                        <p className="font-bold">النظام مهيأ حالياً عبر Vercel. القيم اليدوية أدناه ستستخدم فقط إذا فشل اتصال Vercel.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm flex gap-3 items-start">
                        <Info className="shrink-0 mt-1"/>
                        <p>إذا كنت ترى هذه الرسالة من جهاز جديد ولم يعمل النظام تلقائياً، قم بإدخال البيانات يدوياً هنا لمرة واحدة.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Supabase URL</label>
                        <input className="w-full p-3 border rounded-xl font-mono text-sm dir-ltr" placeholder="https://xyz.supabase.co" value={dbUrl} onChange={e=>setDbUrl(e.target.value)}/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Supabase API Key</label>
                        <input className="w-full p-3 border rounded-xl font-mono text-sm dir-ltr" type="password" placeholder="eyJhbG..." value={dbKey} onChange={e=>setDbKey(e.target.value)}/>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSaveConfig} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"><Save size={18}/> حفظ للعمل على هذا الجهاز</button>
                        <button onClick={handleTestConnection} disabled={isTesting} className="px-6 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50">
                            {isTesting ? <RefreshCw className="animate-spin" size={18}/> : <Wifi size={18}/>} اختبار الاتصال
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 text-white p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Code size={80}/></div>
                <h4 className="font-bold mb-3 flex items-center gap-2 text-indigo-400"><Code size={20}/> كود إنشاء الجداول (SQL)</h4>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                    إذا قمت بإنشاء مشروع جديد في Supabase، يجب عليك نسخ الكود أدناه ولصقه في "SQL Editor" داخل لوحة تحكم Supabase والضغط على "Run" ليعمل النظام.
                </p>
                <button onClick={()=>{navigator.clipboard.writeText(getDatabaseSchemaSQL()); alert('تم نسخ كود SQL بنجاح');}} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black flex items-center gap-3 transition-all shadow-lg">
                    <Copy size={18}/> نسخ كود SQL لتهيئة الجداول
                </button>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'DATABASE'>('OVERVIEW');

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Shield className="text-purple-600"/> لوحة المدير العام</h2>
                <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                    <button onClick={() => setView('OVERVIEW')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${view === 'OVERVIEW' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}><Activity size={16}/> إحصائيات النظام</button>
                    <button onClick={() => setView('DATABASE')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 ${view === 'DATABASE' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}><Database size={16}/> قاعدة البيانات</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {view === 'OVERVIEW' && <AdminOverview />}
                {view === 'DATABASE' && <DatabaseSettings />}
            </div>
        </div>
    );
};

export default AdminDashboard;
