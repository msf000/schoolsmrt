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
    Key, GitMerge, CheckCircle, XCircle, BrainCircuit, Code, Activity, BarChart3, PieChart, TrendingUp, Star, Crown, Loader2, Server, Link2,
    // Added Info icon to fix line 147 error
    Info
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend } from 'recharts';

const AdminOverview = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ schools: 0, teachers: 0, students: 0, users: 0, attendanceToday: 0 });
    const [gradeDistribution, setGradeDistribution] = useState<{name: string, value: number}[]>([]);
    const [subscriptionStats, setSubscriptionStats] = useState<{name: string, value: number, fill: string}[]>([]);

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

                const grades: Record<string, number> = {};
                std.forEach(s => { const g = s.gradeLevel || 'غير محدد'; grades[g] = (grades[g] || 0) + 1; });
                setGradeDistribution(Object.keys(grades).map(k => ({ name: k, value: grades[k] })).sort((a,b)=>b.value-a.value).slice(0, 5));

                const subs = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
                tea.forEach(t => { const s = t.subscriptionStatus || 'FREE'; (subs as any)[s]++; });
                setSubscriptionStats([
                    { name: 'مجاني', value: subs.FREE, fill: '#94a3b8' },
                    { name: 'محترف', value: subs.PRO, fill: '#4f46e5' },
                    { name: 'مؤسسات', value: subs.ENTERPRISE, fill: '#7c3aed' }
                ]);
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
        };
        load();
    }, []);

    if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto mb-4" size={40}/><p className="font-bold text-gray-400">جاري جلب بيانات النظام...</p></div>;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="المدارس" value={stats.schools} icon={<Building size={24}/>} color="bg-blue-50 text-blue-600" />
                <StatCard label="المعلمون" value={stats.teachers} icon={<Users size={24}/>} color="bg-indigo-50 text-indigo-600" />
                <StatCard label="الطلاب" value={stats.students} icon={<CheckCircle size={24}/>} color="bg-green-50 text-green-600" />
                <StatCard label="حضور النظام" value={`${stats.attendanceToday}%`} icon={<Activity size={24}/>} color="bg-purple-50 text-purple-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> الطلاب حسب المرحلة</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={gradeDistribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 10}} />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><PieChart size={18} className="text-indigo-500"/> توزيع الاشتراكات</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie data={subscriptionStats} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {subscriptionStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" />
                            </RePieChart>
                        </ResponsiveContainer>
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
                <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-sm flex gap-3 items-start">
                        <Info className="shrink-0 mt-1"/>
                        <p>هذه الإعدادات ضرورية لربط جهازك بقاعدة البيانات المركزية. إذا كنت تستخدم التطبيق من جهاز جديد، أدخل بيانات مشروع Supabase الخاص بك هنا.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Supabase URL</label>
                        <input className="w-full p-3 border rounded-xl font-mono text-sm dir-ltr" placeholder="https://xyz.supabase.co" value={dbUrl} onChange={e=>setDbUrl(e.target.value)}/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Supabase API Key (Anon Key)</label>
                        <input className="w-full p-3 border rounded-xl font-mono text-sm dir-ltr" type="password" placeholder="eyJhbG..." value={dbKey} onChange={e=>setDbKey(e.target.value)}/>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={handleSaveConfig} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"><Save size={18}/> حفظ البيانات والربط</button>
                        <button onClick={handleTestConnection} disabled={isTesting} className="px-6 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50">
                            {isTesting ? <RefreshCw className="animate-spin" size={18}/> : <Wifi size={18}/>} اختبار الاتصال
                        </button>
                    </div>
                </div>
            </div>

            {/* Maintenance Tools */}
            <div className="bg-white p-8 rounded-2xl border shadow-sm space-y-8">
                <div className="flex items-center gap-3 border-b pb-4">
                    <Database size={28} className="text-blue-600"/>
                    <h3 className="font-black text-xl">صيانة قاعدة البيانات</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 border rounded-xl bg-gray-50 flex flex-col gap-4">
                        <h4 className="font-bold flex items-center gap-2 text-indigo-900"><CloudLightning className="text-indigo-600"/> نسخة احتياطية</h4>
                        <p className="text-xs text-gray-500">تحميل نسخة JSON كاملة من بيانات السحابة الحالية للاحتفاظ بها يدوياً.</p>
                        <button onClick={async () => { const j = await backupCloudDatabase(); const blob = new Blob([j], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`backup_${Date.now()}.json`; a.click(); }} className="bg-indigo-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"><Download size={18}/> تحميل النسخة</button>
                    </div>
                    <div className="p-6 border rounded-xl bg-red-50 flex flex-col gap-4 border-red-100">
                        <h4 className="font-bold text-red-700 flex items-center gap-2"><AlertTriangle/> تصفير النظام</h4>
                        <p className="text-xs text-red-500">تحذير: هذا الإجراء سيقوم بمسح كافة البيانات السحابية بالكامل. لا يمكن التراجع.</p>
                        <button onClick={async ()=>{if(prompt('اكتب RESET للتأكيد')==='RESET') {await resetCloudDatabase(); alert('تم التصفير'); window.location.reload();}}} className="bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-lg">تصفير السحابة بالكامل</button>
                    </div>
                </div>
                <div className="bg-gray-900 text-white p-6 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Code size={60}/></div>
                    <h4 className="font-bold mb-3 flex items-center gap-2"><Code size={18} className="text-indigo-400"/> كود تهيئة الجداول (SQL)</h4>
                    <p className="text-xs text-gray-400 mb-4">انسخ هذا الكود واستخدمه في محرر SQL في Supabase إذا كنت تريد إعادة بناء قاعدة البيانات من الصفر.</p>
                    <div className="flex gap-2">
                        <button onClick={()=>{navigator.clipboard.writeText(getDatabaseSchemaSQL()); alert('تم النسخ');}} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2 transition-all"><Copy size={14}/> نسخ كود الإنشاء</button>
                        <button onClick={()=>{navigator.clipboard.writeText(getDatabaseUpdateSQL()); alert('تم النسخ');}} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded font-bold text-xs flex items-center gap-2 transition-all"><GitMerge size={14}/> نسخ كود التحديث</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AISettingsView = () => {
    const [config, setConfig] = useState<AISettings>(getAISettings());
    return (
        <div className="bg-white p-8 rounded-2xl border shadow-sm max-w-3xl mx-auto space-y-6">
            <h3 className="font-bold text-xl flex items-center gap-2 border-b pb-4"><BrainCircuit className="text-purple-600"/> إعدادات المحرك الذكي (Gemini)</h3>
            <div className="space-y-4">
                <div><label className="block text-sm font-bold mb-1">موديل التوليد الافتراضي</label><select className="w-full p-2 border rounded" value={config.modelId} onChange={e=>setConfig({...config, modelId:e.target.value})}><option value="gemini-3-flash-preview">Gemini 3 Flash</option><option value="gemini-3-pro-preview">Gemini 3 Pro</option></select></div>
                <div><label className="block text-sm font-bold mb-1">درجة الحرارة (الإبداع)</label><input type="range" min="0" max="1" step="0.1" className="w-full accent-purple-600" value={config.temperature} onChange={e=>setConfig({...config, temperature: parseFloat(e.target.value)})}/></div>
                <button onClick={()=>{saveAISettings(config); alert('تم الحفظ');}} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"><Save size={18}/> حفظ الإعدادات</button>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const [view, setView] = useState<'OVERVIEW' | 'SCHOOLS' | 'USERS' | 'AI' | 'DATABASE'>('OVERVIEW');

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 animate-fade-in">
            <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Shield className="text-purple-600"/> لوحة التحكم العليا (Admin)</h2>
                <div className="flex bg-white p-1 rounded-xl border shadow-sm overflow-x-auto no-scrollbar max-w-full">
                    <button onClick={() => setView('OVERVIEW')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap ${view === 'OVERVIEW' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}><Activity size={16}/> نظرة عامة</button>
                    <button onClick={() => setView('SCHOOLS')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap ${view === 'SCHOOLS' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}><Building size={16}/> المدارس</button>
                    <button onClick={() => setView('USERS')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap ${view === 'USERS' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}><Users size={16}/> المستخدمين</button>
                    <button onClick={() => setView('AI')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap ${view === 'AI' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}><BrainCircuit size={16}/> إعدادات AI</button>
                    <button onClick={() => setView('DATABASE')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 whitespace-nowrap ${view === 'DATABASE' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-50'}`}><Database size={16}/> قاعدة البيانات</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {view === 'OVERVIEW' && <AdminOverview />}
                {view === 'SCHOOLS' && <SchoolsManager />}
                {view === 'USERS' && <UsersManager />}
                {view === 'AI' && <AISettingsView />}
                {view === 'DATABASE' && <DatabaseSettings />}
            </div>
        </div>
    );
};

const SchoolsManager = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState<Partial<School>>({});

    useEffect(() => { fetchSchools().then(setSchools); }, []);

    const handleSave = async () => {
        if (!formData.name || !formData.ministryCode) return alert('الاسم والكود مطلوبان');
        const data: School = {
            id: editingSchool?.id || `sch_${Date.now()}`,
            name: formData.name!,
            ministryCode: formData.ministryCode!,
            managerName: formData.managerName || '',
            managerNationalId: formData.managerNationalId || '',
            type: formData.type as any || 'PUBLIC',
            phone: formData.phone || '',
            studentCount: 0,
            educationAdministration: formData.educationAdministration || ''
        };
        editingSchool ? await updateSchool(data) : await addSchool(data);
        fetchSchools().then(setSchools); setIsModalOpen(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="relative w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={18}/><input className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm" placeholder="بحث عن مدرسة..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
                <button onClick={() => { setEditingSchool(null); setFormData({}); setIsModalOpen(true); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={18}/> مدرسة جديدة</button>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 font-bold border-b">
                        <tr><th className="p-4">المدرسة</th><th className="p-4">الرمز</th><th className="p-4">المدير</th><th className="p-4 text-center">إجراءات</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {schools.filter(s=>s.name.includes(searchTerm)).map(s => (
                            <tr key={s.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold">{s.name}</td>
                                <td className="p-4 font-mono text-xs">{s.ministryCode}</td>
                                <td className="p-4 text-gray-600">{s.managerName}</td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button onClick={()=>{setEditingSchool(s); setFormData(s); setIsModalOpen(true);}} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                    <button onClick={async ()=>{if(confirm('حذف؟')) {await deleteSchool(s.id); fetchSchools().then(setSchools);}}} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6"><h3 className="font-bold">بيانات المدرسة</h3><button onClick={()=>setIsModalOpen(false)}><X/></button></div>
                        <div className="space-y-4">
                            <input className="w-full p-2 border rounded" placeholder="اسم المدرسة" value={formData.name||''} onChange={e=>setFormData({...formData, name:e.target.value})}/>
                            <input className="w-full p-2 border rounded font-mono" placeholder="الرمز الوزاري" value={formData.ministryCode||''} onChange={e=>setFormData({...formData, ministryCode:e.target.value})}/>
                            <input className="w-full p-2 border rounded" placeholder="اسم المدير" value={formData.managerName||''} onChange={e=>setFormData({...formData, managerName:e.target.value})}/>
                            <input className="w-full p-2 border rounded" placeholder="هوية المدير" value={formData.managerNationalId||''} onChange={e=>setFormData({...formData, managerNationalId:e.target.value})}/>
                            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded font-bold">حفظ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const UsersManager = () => {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
    const [formData, setFormData] = useState<Partial<SystemUser>>({});

    useEffect(() => { fetchSystemUsers().then(setUsers); }, []);

    const handleSave = async () => {
        if (!formData.name || !formData.email || !formData.role) return alert('البيانات مطلوبة');
        const data: SystemUser = {
            id: editingUser?.id || `usr_${Date.now()}`,
            name: formData.name!,
            email: formData.email!,
            role: formData.role as any,
            status: formData.status as any || 'ACTIVE',
            nationalId: formData.nationalId,
            password: formData.password
        };
        editingUser ? await updateSystemUser(data) : await addSystemUser(data);
        fetchSystemUsers().then(setUsers); setIsModalOpen(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="relative w-64"><Search className="absolute right-3 top-2.5 text-gray-400" size={18}/><input className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm" placeholder="بحث عن مستخدم..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/></div>
                <button onClick={()=>{setEditingUser(null); setFormData({status:'ACTIVE', role:'TEACHER'}); setIsModalOpen(true);}} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"><Plus size={18}/> مستخدم جديد</button>
            </div>
            <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 font-bold border-b">
                        <tr><th className="p-4">الاسم</th><th className="p-4">الدور</th><th className="p-4">الحالة</th><th className="p-4 text-center">إجراءات</th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.filter(u=>u.name.includes(searchTerm)).map(u => (
                            <tr key={u.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold">{u.name}</td>
                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role==='SUPER_ADMIN'?'bg-black text-white':'bg-indigo-100 text-indigo-700'}`}>{u.role}</span></td>
                                <td className="p-4">{u.status === 'ACTIVE' ? <CheckCircle size={16} className="text-green-500"/> : <XCircle size={16} className="text-red-500"/>}</td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button onClick={()=>{setEditingUser(u); setFormData(u); setIsModalOpen(true);}} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                    <button onClick={async ()=>{if(confirm('حذف؟')) {await deleteSystemUser(u.id); fetchSystemUsers().then(setUsers);}}} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-6"><h3 className="font-bold">بيانات المستخدم</h3><button onClick={()=>setIsModalOpen(false)}><X/></button></div>
                        <div className="space-y-4">
                            <input className="w-full p-2 border rounded" placeholder="الاسم" value={formData.name||''} onChange={e=>setFormData({...formData, name:e.target.value})}/>
                            <input className="w-full p-2 border rounded" placeholder="البريد" value={formData.email||''} onChange={e=>setFormData({...formData, email:e.target.value})}/>
                            <input className="w-full p-2 border rounded" placeholder="كلمة المرور" type="password" value={formData.password||''} onChange={e=>setFormData({...formData, password:e.target.value})}/>
                            <select className="w-full p-2 border rounded bg-white" value={formData.role} onChange={e=>setFormData({...formData, role:e.target.value as any})}>
                                <option value="TEACHER">معلم</option>
                                <option value="SCHOOL_MANAGER">مدير مدرسة</option>
                                <option value="SUPER_ADMIN">مدير نظام عام</option>
                            </select>
                            <select className="w-full p-2 border rounded bg-white" value={formData.status} onChange={e=>setFormData({...formData, status:e.target.value as any})}>
                                <option value="ACTIVE">نشط</option>
                                <option value="INACTIVE">متوقف</option>
                            </select>
                            <button onClick={handleSave} className="w-full bg-purple-600 text-white py-2 rounded font-bold">حفظ</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;