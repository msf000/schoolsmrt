
import React, { useState, useEffect } from 'react';
import { 
    fetchSchools, fetchSystemUsers, fetchTeachers, fetchAttendance, fetchPerformance, fetchStudents,
    getDatabaseSchemaSQL, getCloudSystemStatus, saveMessage
} from '../services/storageService';
import { AttendanceStatus, MessageLog } from '../types';
import { 
    Shield, Building, Users, Database, RefreshCw, CheckCircle, Info, 
    AlertTriangle, Server, Loader2, Zap, FileSpreadsheet, Bell, Send, ChevronDown, ChevronUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as XLSX from 'xlsx';

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'HEALTH' | 'DATABASE' | 'BROADCAST'>('OVERVIEW');
    const [isLoading, setIsLoading] = useState(true);
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

    useEffect(() => { loadStats(); }, []);

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in font-tajawal overflow-hidden">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4">
                <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3"><Shield className="text-indigo-600" size={36}/> الإدارة المركزية</h2>
                <div className="flex bg-white p-1 rounded-2xl border shadow-sm">
                    {['OVERVIEW', 'HEALTH', 'DATABASE', 'BROADCAST'].map(v => (
                        <button key={v} onClick={() => setView(v as any)} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${view === v ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                            {v === 'OVERVIEW' ? 'الإحصائيات' : v === 'HEALTH' ? 'فحص الربط' : v === 'DATABASE' ? 'كود SQL' : 'البث'}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {view === 'OVERVIEW' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <StatCard label="المدارس" value={stats.schools} icon={<Building/>} color="text-blue-600" />
                            <StatCard label="المعلمون" value={stats.teachers} icon={<Users/>} color="text-indigo-600" />
                            <StatCard label="الطلاب" value={stats.students} icon={<Users/>} color="text-purple-600" />
                            <StatCard label="المستخدمين" value={stats.users} icon={<Shield/>} color="text-emerald-600" />
                        </div>
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold'}} />
                                    <YAxis hide />
                                    <Tooltip />
                                    <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={50}>
                                        {stats.chartData?.map((_:any, i:number) => <Cell key={i} fill={['#4f46e5', '#10b981', '#f59e0b'][i % 3]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {view === 'HEALTH' && <CloudDeepDiagnostic />}

                {view === 'DATABASE' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl">
                            <h3 className="text-2xl font-black mb-4 text-indigo-400 flex items-center gap-3"><Database/> كود تهيئة القاعدة (SQL)</h3>
                            <p className="text-sm text-gray-400 mb-8 leading-relaxed">انسخ هذا الكود والصقه في SQL Editor في Supabase لإصلاح كافة الجداول والأعمدة الناقصة وضمان الربط الصحيح.</p>
                            <button onClick={() => { navigator.clipboard.writeText(getDatabaseSchemaSQL()); alert('تم نسخ الكود!'); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl">نسخ كود SQL للإصلاح</button>
                        </div>
                    </div>
                )}

                {view === 'BROADCAST' && <BroadcastManager />}
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
        <div><p className="text-gray-400 text-[10px] font-black uppercase mb-1">{label}</p><h3 className="text-2xl font-black text-gray-800">{value}</h3></div>
        <div className={`p-4 bg-gray-50 ${color} rounded-2xl`}>{icon}</div>
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
            <div className="bg-white p-8 rounded-[3rem] border shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Server className="text-indigo-600"/> فحص الربط المعمق (Deep Probe)</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">التحقق من وجود الحقول الحيوية (الهوية، الإيميل، الفصول)</p>
                    </div>
                    <button onClick={runCheck} disabled={loading} className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100">
                        {loading ? <Loader2 className="animate-spin"/> : <RefreshCw/>}
                    </button>
                </div>

                <div className="space-y-4">
                    {diagnostics.map(t => (
                        <div key={t.id} className="border-2 rounded-[2rem] overflow-hidden transition-all border-slate-100">
                            <div 
                                onClick={() => setExpandedTable(expandedTable === t.id ? null : t.id)}
                                className={`p-6 cursor-pointer flex items-center justify-between ${t.status === 'ACTIVE' ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${t.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                        {t.status === 'ACTIVE' ? <CheckCircle size={20}/> : <AlertTriangle size={20}/>}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800">جدول {t.label} ({t.id})</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">الحالة: {t.status === 'ACTIVE' ? 'مستقر' : 'يوجد نقص في البيانات'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-left"><span className="text-xs font-mono text-indigo-400">{t.latency}ms</span></div>
                                    {expandedTable === t.id ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                </div>
                            </div>

                            {expandedTable === t.id && (
                                <div className="p-6 bg-white border-t border-slate-100 animate-slide-up">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">فحص حالة الأعمدة (Columns Integrity)</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {Object.entries(t.columns).map(([col, exists]: any) => (
                                            <div key={col} className={`p-3 rounded-xl border flex items-center justify-between ${exists ? 'bg-white border-slate-100' : 'bg-red-50 border-red-200 shadow-inner'}`}>
                                                <span className={`text-xs font-bold ${exists ? 'text-slate-600' : 'text-red-600'}`}>{col}</span>
                                                {exists ? <CheckCircle size={14} className="text-emerald-500"/> : <XCircle size={14} className="text-red-500"/>}
                                            </div>
                                        ))}
                                    </div>
                                    {t.error && <div className="mt-4 p-3 bg-red-50 text-red-700 text-[10px] font-mono rounded-lg border border-red-100 overflow-x-auto">{t.error}</div>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {diagnostics.some(t => t.status !== 'ACTIVE' || Object.values(t.columns).some(v => v === false)) && (
                    <div className="mt-8 p-6 bg-indigo-900 text-white rounded-3xl shadow-xl flex items-center gap-6">
                        <div className="p-4 bg-white/10 rounded-2xl"><Info size={32}/></div>
                        <div className="flex-1">
                            <h4 className="font-black mb-1">تم اكتشاف نقص في هيكلة البيانات!</h4>
                            <p className="text-xs text-indigo-200 font-medium leading-relaxed">تم اكتشاف أعمدة مفقودة قد تعطل تسجيل الحضور أو الدخول. يرجى الذهاب لتبويب "كود SQL" ونسخ الكود وتشغيله في Supabase لإصلاح الجداول تلقائياً.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const XCircle = ({ size, className }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
);

const BroadcastManager = () => {
    const [msg, setMsg] = useState('');
    const handleBroadcast = () => {
        if (!msg) return;
        saveMessage({ id: `ann_${Date.now()}`, studentId: 'GLOBAL', studentName: 'عام', content: msg, status: 'SENT', date: new Date().toISOString(), sentBy: 'النظام', type: 'ANNOUNCEMENT' });
        alert('تم البث!');
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
