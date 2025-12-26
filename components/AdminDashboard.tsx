
import React, { useState, useEffect, useMemo } from 'react';
import { 
    fetchSchools, updateSchool, deleteSchool, addSchool,
    fetchSystemUsers, updateSystemUser, deleteSystemUser, addSystemUser,
    fetchTeachers, updateTeacher,
    fetchAttendance, fetchPerformance, fetchStudents,
    checkConnection, downloadFromSupabase, getDatabaseSchemaSQL,
    saveMessage, getCloudSystemStatus
} from '../services/storageService';
import { AttendanceStatus, School, Teacher, SystemUser, MessageLog } from '../types';
import { 
    Shield, Building, Users, Database, 
    RefreshCw, Trash2, Edit, CheckCircle, Info, 
    AlertTriangle, CloudLightning, Crown, Search, UserCog, 
    Wifi, BarChart3, Bell, Send, Activity, Settings, Activity as Pulse,
    Loader2, X, Save, Plus, ChevronRight, FileSpreadsheet, Zap, Server, Globe
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import * as XLSX from 'xlsx';

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'SCHOOLS' | 'USERS' | 'BROADCAST' | 'HEALTH' | 'DATABASE'>('OVERVIEW');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<any>({ schools: 0, teachers: 0, students: 0, users: 0, proTeachers: 0, attendanceToday: 0 });

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

            setStats({ schools: sch.length, teachers: tea.length, students: std.length, users: usr.length, proTeachers: proCount, attendanceToday: attRate, chartData: [{ name: 'الحضور', value: att.length }, { name: 'الدرجات', value: perf.length }, { name: 'الطلاب', value: std.length }, { name: 'المعلمون', value: tea.length }] });
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const handleExportFullSystem = async () => {
        setIsLoading(true);
        const [stds, att, perf, tea, sch] = await Promise.all([fetchStudents(), fetchAttendance(), fetchPerformance(), fetchTeachers(), fetchSchools()]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stds), "الطلاب");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(att), "الحضور");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perf), "الدرجات");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tea), "المعلمون");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sch), "المدارس");
        XLSX.writeFile(wb, `System_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
        setIsLoading(false);
    };

    useEffect(() => { loadStats(); }, []);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4">
                <div><h2 className="text-3xl font-black text-gray-800 flex items-center gap-3"><Shield className="text-indigo-600" size={36}/> الإدارة المركزية</h2></div>
                <div className="flex gap-2">
                    <button onClick={handleExportFullSystem} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-emerald-700 transition-all"><FileSpreadsheet size={18}/> تصدير السجل الشامل</button>
                    <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
                        {['OVERVIEW', 'SCHOOLS', 'USERS', 'BROADCAST', 'HEALTH', 'DATABASE'].map(v => (
                            <button key={v} onClick={() => setView(v as any)} className={`px-6 py-3 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${view === v ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                                {v === 'OVERVIEW' ? 'الإحصائيات' : v === 'SCHOOLS' ? 'المدارس' : v === 'USERS' ? 'المستخدمين' : v === 'BROADCAST' ? 'البث' : v === 'HEALTH' ? 'فحص السحابة' : 'البيانات'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isLoading && view !== 'HEALTH' ? <div className="h-full flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin text-indigo-600" size={48}/><p className="font-bold text-gray-400">جاري مزامنة السحابة...</p></div> : (
                    <>
                        {view === 'OVERVIEW' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <StatCard label="المدارس" value={stats.schools} icon={<Building size={24}/>} color="bg-blue-50 text-blue-600" />
                                    <StatCard label="المعلمون" value={stats.teachers} icon={<Users size={24}/>} color="bg-indigo-50 text-indigo-600" />
                                    <StatCard label="الطلاب" value={stats.students} icon={<UserCog size={24}/>} color="bg-purple-50 text-purple-600" />
                                    <StatCard label="الحضور اليوم" value={`${stats.attendanceToday}%`} icon={<Pulse size={24}/>} color="bg-green-50 text-green-600" />
                                </div>
                                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm h-96">
                                    <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><BarChart3 size={20} className="text-indigo-600"/> التفاعل العام</h3>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                                            <YAxis hide /><Tooltip cursor={{fill: '#f8fafc'}} /><Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={40}>{stats.chartData?.map((_:any, i:number) => <Cell key={i} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444'][i % 4]} />)}</Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                        {view === 'HEALTH' && <CloudDiagnostics />}
                        {view === 'DATABASE' && (
                            <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-10">
                                <div className="bg-slate-900 text-white p-10 rounded-[3rem] border-b-[8px] border-slate-950">
                                    <h4 className="font-black text-2xl mb-4 flex items-center gap-3 text-indigo-400"><Database size={32}/> هيكلة السحابة (SQL)</h4>
                                    <p className="text-sm text-gray-400 mb-8 leading-relaxed">استخدم هذا الكود لتهيئة جداول Supabase في مشروعك الجديد.</p>
                                    <button onClick={()=>{navigator.clipboard.writeText(getDatabaseSchemaSQL()); alert('تم النسخ!');}} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl">نسخ كود SQL</button>
                                </div>
                            </div>
                        )}
                        {view === 'BROADCAST' && <BroadcastManager />}
                    </>
                )}
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
        <div><p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p><h3 className="text-3xl font-black text-gray-800">{value}</h3></div>
        <div className={`p-4 ${color} rounded-2xl shadow-inner`}>{icon}</div>
    </div>
);

const CloudDiagnostics = () => {
    const [diagnostics, setDiagnostics] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const runCheck = async () => {
        setLoading(true);
        const res = await getCloudSystemStatus();
        setDiagnostics(res);
        setLoading(false);
    };

    useEffect(() => { runCheck(); }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-10">
            <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Server className="text-indigo-600"/> فحص سلامة قاعدة البيانات السحابية</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">التحقق من وجود الجداول واستقرار الاتصال بـ Supabase</p>
                    </div>
                    <button onClick={runCheck} disabled={loading} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all">
                        {loading ? <Loader2 className="animate-spin"/> : <RefreshCw/>}
                    </button>
                </div>

                <div className="space-y-4">
                    {diagnostics.map(t => (
                        <div key={t.id} className={`p-6 rounded-[2rem] border-2 transition-all flex items-center justify-between ${t.status === 'ACTIVE' ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-4 rounded-2xl ${t.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                    {t.status === 'ACTIVE' ? <CheckCircle/> : <AlertTriangle/>}
                                </div>
                                <div>
                                    <h4 className="font-black text-slate-800">{t.label} (Table: {t.id})</h4>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                        الحالة: {t.status === 'ACTIVE' ? 'يعمل بكفاءة' : 'جدول مفقود أو خطأ بالصلاحيات'}
                                    </p>
                                    {t.error && <p className="text-[9px] text-red-400 font-mono mt-1">{t.error}</p>}
                                </div>
                            </div>
                            <div className="text-left">
                                <div className="text-2xl font-black text-slate-800">{t.count}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase">سجل مخزن</div>
                                <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-indigo-400">
                                    <Zap size={10}/> {t.latency}ms
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {diagnostics.some(t => t.status !== 'ACTIVE') && (
                    <div className="mt-8 p-6 bg-indigo-900 text-white rounded-3xl shadow-xl flex items-center gap-6">
                        <div className="p-4 bg-white/10 rounded-2xl"><Info size={32}/></div>
                        <div className="flex-1">
                            <h4 className="font-black mb-1">تم اكتشاف جداول مفقودة!</h4>
                            <p className="text-xs text-indigo-200 font-medium">يرجى الذهاب إلى تبويب "البيانات" ونسخ كود SQL وتشغيله في Supabase SQL Editor لإنشاء الجداول المطلوبة.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const BroadcastManager = () => {
    const [msg, setMsg] = useState('');
    const handleBroadcast = async () => {
        if (!msg) return;
        const log: MessageLog = { id: `ann_${Date.now()}`, studentId: 'GLOBAL', studentName: 'إعلان عام', type: 'ANNOUNCEMENT', content: msg, status: 'SENT', date: new Date().toISOString(), sentBy: 'النظام المركز', targetRole: 'ALL' };
        saveMessage(log);
        alert('تم بث الإعلان!');
        setMsg('');
    };
    return (
        <div className="bg-white p-10 rounded-[3rem] border shadow-sm max-w-2xl mx-auto">
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3"><Bell className="text-yellow-500"/> بث رسالة للنظام</h3>
            <textarea className="w-full p-4 bg-gray-50 border rounded-3xl h-40 outline-none font-bold text-gray-700 mb-6" placeholder="اكتب الإعلان هنا..." value={msg} onChange={e => setMsg(e.target.value)} />
            <button onClick={handleBroadcast} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-2"><Send size={20}/> بث الإعلان</button>
        </div>
    );
};

export default AdminDashboard;
