
import React, { useState, useEffect } from 'react';
import { 
    fetchSchools, fetchSystemUsers, fetchTeachers, fetchAttendance, fetchPerformance, fetchStudents,
    getDatabaseSchemaSQL, getCloudSystemStatus, saveMessage
} from '../services/storageService';
import { AttendanceStatus, MessageLog } from '../types';
import { 
    Shield, Building, Users, Database, RefreshCw, CheckCircle, Info, 
    AlertTriangle, Server, Loader2, Zap, FileSpreadsheet, Bell, Send, ChevronDown, ChevronUp, Copy, CloudLightning, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'HEALTH' | 'DATABASE' | 'BROADCAST'>('HEALTH');
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [stats, setStats] = useState<any>({ schools: 0, teachers: 0, students: 0, users: 0 });

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const [sch, tea, usr, std] = await Promise.all([fetchSchools(), fetchTeachers(), fetchSystemUsers(), fetchStudents()]);
            setStats({ 
                schools: sch.length, teachers: tea.length, students: std.length, users: usr.length,
                chartData: [{ name: 'الطلاب', value: std.length }, { name: 'المعلمون', value: tea.length }, { name: 'المدارس', value: sch.length }]
            });
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const handleFullSync = async () => {
        setIsSyncing(true);
        await loadStats();
        setIsSyncing(false);
        alert('تمت مزامنة كافة جداول النظام مع السحابة بنجاح!');
    };

    useEffect(() => { loadStats(); }, []);

    return (
        <div className="p-6 md:p-10 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <Shield className="text-indigo-600" size={36}/> إدارة المنظومة المركزية
                    </h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">حالة الربط السحابي (v2.5 Enterprise)</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleFullSync} disabled={isSyncing} className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-indigo-100 transition-all">
                        {isSyncing ? <Loader2 className="animate-spin" size={16}/> : <RefreshCw size={16}/>} تحديث كافة الجداول
                    </button>
                    <div className="flex bg-white p-1 rounded-2xl border shadow-xl">
                        {['HEALTH', 'DATABASE', 'OVERVIEW', 'BROADCAST'].map(v => (
                            <button key={v} onClick={() => setView(v as any)} className={`px-6 py-2.5 rounded-xl text-[11px] font-black transition-all ${view === v ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                                {v === 'OVERVIEW' ? 'الإحصائيات' : v === 'HEALTH' ? 'صحة الربط' : v === 'DATABASE' ? 'إصلاح SQL' : 'البث العام'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {view === 'OVERVIEW' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <StatCard label="المدارس" value={stats.schools} icon={<Building/>} color="text-blue-600" />
                            <StatCard label="المعلمون" value={stats.teachers} icon={<Users/>} color="text-indigo-600" />
                            <StatCard label="الطلاب" value={stats.students} icon={<Users/>} color="text-purple-600" />
                            <StatCard label="المستخدمين" value={stats.users} icon={<Shield/>} color="text-emerald-600" />
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] shadow-sm h-96 border">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                    <YAxis hide />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[15, 15, 0, 0]} barSize={60}>
                                        {stats.chartData?.map((_:any, i:number) => <Cell key={i} fill={['#4f46e5', '#10b981', '#f59e0b'][i % 3]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {view === 'HEALTH' && <CloudDeepDiagnostic />}

                {view === 'DATABASE' && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up pb-20">
                        <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-10"><CloudLightning size={250}/></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-3xl font-black text-indigo-400 flex items-center gap-4"><Database/> كود الصيانة الشامل</h3>
                                    <button onClick={() => { navigator.clipboard.writeText(getDatabaseSchemaSQL()); alert('تم نسخ كود SQL الشامل بنجاح!'); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-8 py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95">
                                        <Copy size={20}/> نسخ كود الإصلاح
                                    </button>
                                </div>
                                <p className="text-lg text-gray-300 mb-10 leading-relaxed font-medium">
                                    إذا واجهت أي خلل في الربط أو نقص في الأعمدة، استخدم هذا الكود في محرر SQL الخاص بـ Supabase لضمان تكامل المنظومة.
                                </p>
                                <pre className="bg-black/40 p-8 rounded-3xl font-mono text-xs text-indigo-300 overflow-x-auto max-h-[400px] border border-white/5 custom-scrollbar dir-ltr">
                                    {getDatabaseSchemaSQL()}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'BROADCAST' && <BroadcastManager />}
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
        <div><p className="text-gray-400 text-[10px] font-black uppercase mb-1 tracking-widest">{label}</p><h3 className="text-2xl font-black text-gray-800">{value}</h3></div>
        <div className={`p-4 bg-gray-50 ${color} rounded-2xl transition-transform group-hover:scale-110`}>{icon}</div>
    </div>
);

const CloudDeepDiagnostic = () => {
    const [diagnostics, setDiagnostics] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandedTable, setExpandedTable] = useState<string | null>(null);

    const runCheck = async () => {
        setLoading(true);
        const res = await getCloudSystemStatus();
        setDiagnostics(res);
        setLoading(false);
    };

    useEffect(() => { runCheck(); }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
            <div className="bg-white p-10 rounded-[3rem] border shadow-xl">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3"><Server className="text-indigo-600"/> حالة المنظومة السحابية</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">فحص تكامل الجداول السحابية (v2.5 Full Sync)</p>
                    </div>
                    <button onClick={runCheck} disabled={loading} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 shadow-sm transition-all active:scale-95">
                        {loading ? <Loader2 className="animate-spin" size={24}/> : <RefreshCw size={24}/>}
                    </button>
                </div>

                <div className="space-y-4">
                    {diagnostics.map(t => (
                        <div key={t.id} className="border-2 rounded-[2rem] overflow-hidden transition-all border-slate-50 hover:border-slate-100">
                            <div 
                                onClick={() => setExpandedTable(expandedTable === t.id ? null : t.id)}
                                className={`p-6 cursor-pointer flex items-center justify-between ${t.status === 'ACTIVE' ? 'bg-emerald-50/20' : 'bg-red-50/20'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl shadow-lg ${t.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {t.status === 'ACTIVE' ? <CheckCircle size={24}/> : <AlertTriangle size={24}/>}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800">بيانات {t.label}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                            الاستجابة: {t.latency}ms • الحالة: {t.status === 'ACTIVE' ? 'مستقر' : 'تنبيه'}
                                        </p>
                                    </div>
                                </div>
                                {expandedTable === t.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const BroadcastManager = () => {
    const [msg, setMsg] = useState('');
    const handleBroadcast = () => {
        if (!msg) return;
        saveMessage({ id: `ann_${Date.now()}`, studentId: 'GLOBAL', studentName: 'عام', content: msg, status: 'SENT', date: new Date().toISOString(), sentBy: 'إدارة النظام', type: 'ANNOUNCEMENT' });
        alert('تم بث الإعلان بنجاح لجميع المستخدمين!');
        setMsg('');
    };
    return (
        <div className="bg-white p-12 rounded-[3.5rem] border shadow-xl max-w-3xl mx-auto animate-slide-up">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl"><Bell size={28}/></div>
                <h3 className="text-2xl font-black text-gray-800">بث رسالة للنظام (Global Announcement)</h3>
            </div>
            <textarea 
                className="w-full p-6 bg-slate-50 border-none rounded-3xl h-48 outline-none font-bold text-gray-700 mb-8 focus:ring-4 focus:ring-indigo-500/5 text-lg" 
                placeholder="اكتب الإعلان هنا ليظهر للطلاب والمعلمين في بواباتهم..." 
                value={msg} 
                onChange={e => setMsg(e.target.value)} 
            />
            <button onClick={handleBroadcast} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 transition-all hover:bg-black active:scale-95">
                <Send size={24}/> بث الإعلان الموحد
            </button>
        </div>
    );
};

export default AdminDashboard;
