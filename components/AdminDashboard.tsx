import React, { useState, useEffect } from 'react';
import { School, SystemUser, SubscriptionPlan } from '../types';
import { 
    getSchools, addSchool, deleteSchool, 
    getSystemUsers, addSystemUser, deleteSystemUser, 
    createBackup, restoreBackup, clearDatabase,
    uploadToSupabase, downloadFromSupabase,
    getStorageStatistics, checkConnection,
    getCloudStatistics, fetchCloudTableData,
    DB_MAP, getTableDisplayName
} from '../services/storageService';
import { updateSupabaseConfig } from '../services/supabaseClient';
import { 
    Shield, Building, Users, CreditCard, Settings, Database, 
    Plus, Trash2, Download, Upload, AlertTriangle, RefreshCw, Check, Copy, Terminal, Cloud, CloudRain, CloudLightning, Save, Link, Wifi, WifiOff, HardDrive, Activity, Server, Table, Eye, EyeOff 
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SCHOOLS' | 'USERS' | 'SUBSCRIPTIONS' | 'DATABASE'>('OVERVIEW');

    return (
        <div className="p-6 animate-fade-in space-y-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="text-primary" />
                        لوحة المدير العام
                    </h2>
                    <p className="text-gray-500 mt-2">إدارة المدارس، المستخدمين، والاشتراكات والنظام.</p>
                </div>
            </div>

            {/* Admin Tabs */}
            <div className="flex overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100 p-1 mb-6">
                <TabButton active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} icon={<Shield size={18} />} label="نظرة عامة" />
                <TabButton active={activeTab === 'SCHOOLS'} onClick={() => setActiveTab('SCHOOLS')} icon={<Building size={18} />} label="إضافة مدرسة" />
                <TabButton active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} icon={<Users size={18} />} label="إدارة المستخدمين" />
                <TabButton active={activeTab === 'SUBSCRIPTIONS'} onClick={() => setActiveTab('SUBSCRIPTIONS')} icon={<CreditCard size={18} />} label="الاشتراكات" />
                <TabButton active={activeTab === 'DATABASE'} onClick={() => setActiveTab('DATABASE')} icon={<Database size={18} />} label="قاعدة البيانات والمزامنة" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
                {activeTab === 'OVERVIEW' && <AdminOverview />}
                {activeTab === 'SCHOOLS' && <SchoolsManager />}
                {activeTab === 'USERS' && <UsersManager />}
                {activeTab === 'SUBSCRIPTIONS' && <SubscriptionsManager />}
                {activeTab === 'DATABASE' && <DatabaseSettings />}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all whitespace-nowrap ${
            active ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

// --- Sub Components ---

const AdminOverview = () => {
    const [stats, setStats] = useState({ schools: 0, users: 0, revenue: 0 });

    useEffect(() => {
        setStats({
            schools: getSchools().length,
            users: getSystemUsers().length,
            revenue: getSchools().filter(s => s.subscriptionStatus === 'ACTIVE').length * 500 // Mock revenue
        });
    }, []);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Building size={24} /></div>
                        <div>
                            <p className="text-sm text-gray-500">إجمالي المدارس</p>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.schools}</h3>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-full text-purple-600"><Users size={24} /></div>
                        <div>
                            <p className="text-sm text-gray-500">مستخدمي النظام</p>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.users}</h3>
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-full text-green-600"><CreditCard size={24} /></div>
                        <div>
                            <p className="text-sm text-gray-500">إيرادات الشهر (تقديري)</p>
                            <h3 className="text-3xl font-bold text-gray-800">{stats.revenue} ر.س</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin Account Info Card */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white shadow-lg border border-gray-700">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                            <Shield className="text-yellow-400" size={20}/> بيانات حساب المدير العام
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            هذا الحساب يملك كامل الصلاحيات لإدارة النظام والاشتراكات.
                        </p>
                        <div className="space-y-2 text-sm bg-black/30 p-4 rounded-lg border border-gray-700 font-mono">
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 w-24">اسم المستخدم:</span>
                                <span className="text-white font-bold select-all">admin@school.com</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 w-24">كلمة المرور:</span>
                                <span className="text-white font-bold select-all">SchoolSystem2025!</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 w-24">الصلاحية:</span>
                                <span className="text-red-400 font-bold">SUPER_ADMIN</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 text-center py-12">
                <Settings size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-600">إعدادات النظام العامة</h3>
                <p className="text-gray-400 max-w-md mx-auto mt-2">
                    يمكنك التحكم في إعدادات النظام، اللغات المدعومة، وتخصيص واجهة المستخدم من خلال قسم قاعدة البيانات والإعدادات.
                </p>
            </div>
        </div>
    );
};

const SchoolsManager = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [form, setForm] = useState<Partial<School>>({ name: '', type: 'PRIVATE', managerName: '', phone: '', studentCount: 0 });

    useEffect(() => { setSchools(getSchools()); }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) return;
        addSchool({
            id: Date.now().toString(),
            name: form.name!,
            type: form.type as any,
            managerName: form.managerName || '',
            phone: form.phone || '',
            studentCount: Number(form.studentCount) || 0,
            subscriptionStatus: 'ACTIVE'
        });
        setSchools(getSchools());
        setForm({ name: '', type: 'PRIVATE', managerName: '', phone: '', studentCount: 0 });
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-lg border grid grid-cols-1 md:grid-cols-2 gap-4">
                <h3 className="col-span-full font-bold text-gray-700 mb-2">تسجيل مدرسة جديدة</h3>
                <input required placeholder="اسم المدرسة" className="p-2 border rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <select className="p-2 border rounded bg-white" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                    <option value="PRIVATE">أهلية</option>
                    <option value="PUBLIC">حكومية</option>
                    <option value="INTERNATIONAL">عالمية</option>
                </select>
                <input placeholder="اسم المدير" className="p-2 border rounded" value={form.managerName} onChange={e => setForm({...form, managerName: e.target.value})} />
                <input placeholder="رقم الهاتف" className="p-2 border rounded" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                <input type="number" placeholder="عدد الطلاب المتوقع" className="p-2 border rounded" value={form.studentCount} onChange={e => setForm({...form, studentCount: Number(e.target.value)})} />
                
                <button type="submit" className="bg-primary text-white py-2 rounded font-bold hover:bg-teal-800 transition-colors md:col-span-2">
                    إضافة المدرسة
                </button>
            </form>

            <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                        <tr>
                            <th className="p-3">اسم المدرسة</th>
                            <th className="p-3">النوع</th>
                            <th className="p-3">المدير</th>
                            <th className="p-3">الاشتراك</th>
                            <th className="p-3">حذف</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {schools.map(school => (
                            <tr key={school.id} className="hover:bg-gray-50">
                                <td className="p-3 font-bold">{school.name}</td>
                                <td className="p-3 text-xs">
                                    <span className={`px-2 py-1 rounded ${school.type === 'PRIVATE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {school.type === 'PRIVATE' ? 'أهلية' : school.type === 'PUBLIC' ? 'حكومية' : 'عالمية'}
                                    </span>
                                </td>
                                <td className="p-3">{school.managerName} <div className="text-xs text-gray-400">{school.phone}</div></td>
                                <td className="p-3">
                                    <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded border border-green-200">نشط</span>
                                </td>
                                <td className="p-3">
                                    <button onClick={() => { deleteSchool(school.id); setSchools(getSchools()); }} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
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
    const [form, setForm] = useState<Partial<SystemUser>>({ name: '', email: '', role: 'SCHOOL_MANAGER' });

    useEffect(() => { setUsers(getSystemUsers()); }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!form.name || !form.email) return;
        addSystemUser({
            id: Date.now().toString(),
            name: form.name!,
            email: form.email!,
            role: form.role as any,
            status: 'ACTIVE'
        });
        setUsers(getSystemUsers());
        setForm({ name: '', email: '', role: 'SCHOOL_MANAGER' });
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end bg-gray-50 p-4 rounded-lg border">
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-500">الاسم</label>
                    <input className="w-full p-2 border rounded" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-500">البريد الإلكتروني</label>
                    <input className="w-full p-2 border rounded" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="w-full md:w-40">
                    <label className="text-xs font-bold text-gray-500">الدور</label>
                    <select className="w-full p-2 border rounded bg-white" value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}>
                        <option value="SCHOOL_MANAGER">مدير مدرسة</option>
                        <option value="SUPER_ADMIN">مدير عام</option>
                    </select>
                </div>
                <button type="submit" className="bg-gray-800 text-white p-2 rounded w-full md:w-auto px-6 h-[42px]">إضافة</button>
            </form>

            <div className="grid gap-3">
                {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                                <Users size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">{user.name}</h4>
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`text-xs px-2 py-1 rounded font-bold ${user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {user.role === 'SUPER_ADMIN' ? 'مدير عام' : 'مدير مدرسة'}
                            </span>
                            <button onClick={() => { deleteSystemUser(user.id); setUsers(getSystemUsers()); }} className="text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SubscriptionsManager = () => {
    const plans: SubscriptionPlan[] = [
        { id: '1', name: 'الباقة الأساسية', price: 500, features: ['حتى 100 طالب', 'تقارير أساسية'] },
        { id: '2', name: 'الباقة المتقدمة', price: 1200, features: ['عدد غير محدود', 'ذكاء اصطناعي', 'دعم فني'] },
    ];

    return (
        <div className="space-y-8">
            <h3 className="font-bold text-gray-700">باقات الاشتراك المتاحة</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-primary transition-colors cursor-pointer group">
                        <h4 className="text-xl font-bold text-gray-800">{plan.name}</h4>
                        <p className="text-3xl font-black text-primary mt-2">{plan.price} <span className="text-sm font-normal text-gray-500">ر.س / شهر</span></p>
                        <ul className="mt-4 space-y-2 text-sm text-gray-500">
                            {plan.features.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                        <button className="mt-6 w-full py-2 bg-gray-100 text-gray-700 rounded-lg group-hover:bg-primary group-hover:text-white transition-colors">
                            تعديل الباقة
                        </button>
                    </div>
                ))}
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-start gap-2">
                <AlertTriangle size={18} className="mt-0.5" />
                <p>ملاحظة: هذا النظام التجريبي يدعم إدارة الاشتراكات بشكل صوري. في النسخة الكاملة، سيتم ربط هذه الصفحة ببوابة الدفع الإلكتروني.</p>
            </div>
        </div>
    );
};

// UPDATED SQL SCHEMA: Supports Reset (Drop) and TEXT IDs for compatibility
// !!! IMPORTANT: Now includes permissive RLS Policies to allow ANON uploads !!!
const SUPABASE_SCHEMA_SQL = `
-- ⚠️ تحذير: هذا السكربت سيقوم بحذف جميع البيانات الموجودة في الجداول المحددة
-- الغرض: تنظيف قاعدة البيانات وإعادة بنائها مع سياسات الأمان الصحيحة للرفع

-- 1. حذف الجداول القديمة
DROP TABLE IF EXISTS public.performance_records CASCADE;
DROP TABLE IF EXISTS public.attendance_records CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.classes CASCADE;
DROP TABLE IF EXISTS public.grade_levels CASCADE;
DROP TABLE IF EXISTS public.educational_stages CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;
DROP TABLE IF EXISTS public.parents CASCADE;
DROP TABLE IF EXISTS public.system_users CASCADE;
DROP TABLE IF EXISTS public.schools CASCADE;

-- 2. إنشاء الجداول

create table public.schools (
  id text primary key,
  name text not null,
  type text check (type in ('PUBLIC', 'PRIVATE', 'INTERNATIONAL')),
  manager_name text,
  phone text,
  subscription_status text default 'ACTIVE',
  student_count_limit integer default 100,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.educational_stages (
  id text primary key,
  school_id text references public.schools(id) on delete cascade,
  name text not null
);

create table public.grade_levels (
  id text primary key,
  stage_id text references public.educational_stages(id) on delete cascade,
  name text not null
);

create table public.classes (
  id text primary key,
  grade_level_id text references public.grade_levels(id) on delete cascade,
  name text not null
);

create table public.students (
  id text primary key,
  school_id text references public.schools(id) on delete cascade,
  class_id text references public.classes(id) on delete set null,
  name text not null,
  national_id text,
  grade_level text,
  class_name text,
  email text,
  phone text,
  parent_name text,
  parent_phone text,
  parent_email text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.subjects (
  id text primary key,
  school_id text references public.schools(id) on delete cascade,
  name text not null
);

create table public.teachers (
  id text primary key,
  school_id text references public.schools(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  subject_specialty text
);

create table public.parents (
  id text primary key,
  school_id text references public.schools(id) on delete cascade,
  name text not null,
  email text,
  phone text
);

create table public.attendance_records (
  id text primary key,
  student_id text references public.students(id) on delete cascade,
  date text not null,
  status text check (status in ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table public.performance_records (
  id text primary key,
  student_id text references public.students(id) on delete cascade,
  subject text,
  title text not null,
  score numeric not null,
  max_score numeric not null,
  date text default CURRENT_DATE,
  notes text
);

create table public.system_users (
  id text primary key,
  school_id text references public.schools(id) on delete cascade,
  email text unique not null,
  name text,
  role text check (role in ('SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER')),
  status text default 'ACTIVE',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. تفعيل الأمان وإضافة السياسات (مهم جداً للرفع)

-- Helper macro not available in standard SQL here, so we repeat for each table
-- السماح للجميع (Anon) بالقراءة والكتابة في هذا النظام التجريبي

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.schools FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.educational_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.educational_stages FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.grade_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.grade_levels FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.classes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.students FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.subjects FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.teachers FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.parents FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.performance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.performance_records FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON public.system_users FOR ALL USING (true) WITH CHECK (true);
`;

const DatabaseSettings = () => {
    const [status, setStatus] = useState<string>('');
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Supabase Credentials State
    const [sbUrl, setSbUrl] = useState(localStorage.getItem('custom_supabase_url') || '');
    const [sbKey, setSbKey] = useState(localStorage.getItem('custom_supabase_key') || '');
    const [connStatus, setConnStatus] = useState<'IDLE' | 'SAVED' | 'ERROR'>('IDLE');

    // Status & Stats State
    const [health, setHealth] = useState<{status: 'ONLINE' | 'OFFLINE' | 'CHECKING', latency: number, message?: string}>({ status: 'CHECKING', latency: 0 });
    const [localStats, setLocalStats] = useState<any>(null);
    const [cloudStats, setCloudStats] = useState<any>(null);

    // Inspector State
    const [inspectorTable, setInspectorTable] = useState('students');
    const [inspectorData, setInspectorData] = useState<any[]>([]);
    const [inspectorLoading, setInspectorLoading] = useState(false);

    useEffect(() => {
        // Load stats on mount
        setLocalStats(getStorageStatistics());
        
        // Initial Connection Check
        checkSupabaseHealth();
    }, []);

    const checkSupabaseHealth = async () => {
        setHealth({ status: 'CHECKING', latency: 0 });
        setCloudStats(null);
        
        const result = await checkConnection();
        if (result.success) {
            setHealth({ status: 'ONLINE', latency: result.latency || 0 });
            // Fetch Cloud Stats
            try {
                const cStats = await getCloudStatistics();
                setCloudStats(cStats);
            } catch (e) {
                console.error(e);
            }
        } else {
            setHealth({ status: 'OFFLINE', latency: 0, message: result.message });
        }
    };

    const handleFetchInspectorData = async () => {
        setInspectorLoading(true);
        setInspectorData([]);
        try {
            const data = await fetchCloudTableData(inspectorTable);
            setInspectorData(data || []);
        } catch (e: any) {
            setStatus(`❌ فشل جلب البيانات: ${e.message}`);
        } finally {
            setInspectorLoading(false);
        }
    };

    const handleSaveSupabaseConfig = () => {
        if (!sbUrl || !sbKey) {
            setConnStatus('ERROR');
            setStatus('يرجى إدخال الرابط والمفتاح بشكل صحيح.');
            return;
        }
        const success = updateSupabaseConfig(sbUrl, sbKey);
        if (success) {
            setConnStatus('SAVED');
            setStatus('✅ تم حفظ إعدادات الاتصال بنجاح.');
            checkSupabaseHealth(); // Re-check after save
        } else {
            setConnStatus('ERROR');
            setStatus('❌ الرابط غير صالح.');
        }
    };

    const handleDownloadBackup = () => {
        const json = createBackup();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `school_system_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setStatus('تم تحميل النسخة الاحتياطية بنجاح.');
    };

    const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const success = restoreBackup(content);
            if (success) {
                setStatus('تم استعادة البيانات بنجاح! يرجى تحديث الصفحة.');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setStatus('فشل في استعادة النسخة الاحتياطية. تأكد من سلامة الملف.');
            }
        };
        reader.readAsText(file);
    };

    const handleClearDB = () => {
        if (window.confirm("هل أنت متأكد تماماً؟ سيتم حذف جميع البيانات والطلاب والمدارس ولا يمكن التراجع عن هذا الإجراء.")) {
            clearDatabase();
            window.location.reload();
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
        setStatus('تم نسخ كود SQL بنجاح!');
        setTimeout(() => setStatus(''), 3000);
    };

    const handleCloudSync = async (type: 'UPLOAD' | 'DOWNLOAD') => {
        if (!sbUrl || !sbKey) {
            setStatus('⚠️ يرجى إعداد بيانات الاتصال بالسحابة أولاً (الرابط والمفتاح).');
            return;
        }

        if (!confirm(type === 'UPLOAD' ? 'سيتم رفع البيانات المحلية واستبدال البيانات في السحابة. هل أنت متأكد؟' : 'سيتم سحب البيانات من السحابة واستبدال البيانات المحلية. هل أنت متأكد؟')) return;
        
        setIsSyncing(true);
        setStatus('جاري الاتصال بقاعدة البيانات...');
        try {
            if (type === 'UPLOAD') {
                await uploadToSupabase();
                setStatus('✅ تم رفع البيانات بنجاح إلى Supabase');
            } else {
                await downloadFromSupabase();
                setStatus('✅ تم سحب البيانات بنجاح. سيتم تحديث الصفحة...');
                setTimeout(() => window.location.reload(), 2000);
            }
            // Update stats
            setLocalStats(getStorageStatistics());
            if (health.status === 'ONLINE') {
                const cStats = await getCloudStatistics();
                setCloudStats(cStats);
            }

        } catch (error: any) {
            setStatus(`❌ خطأ في المزامنة: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <h3 className="text-xl font-bold text-gray-800 mb-4">إعدادات قاعدة البيانات والمزامنة</h3>
            
            {status && (
                <div className={`p-4 rounded-lg border flex items-center gap-2 ${status.includes('❌') || status.includes('⚠️') ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'}`}>
                    {status.includes('❌') ? <AlertTriangle size={18}/> : <Check size={18}/>} 
                    {status}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. CONFIG SECTION (Supabase) */}
                <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm lg:col-span-2">
                    <div className="flex justify-between items-start border-b pb-4 mb-4">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Link size={18} className="text-blue-600"/> إعدادات الاتصال (Supabase Config)
                        </h4>
                        
                        {/* Connection Status Indicator */}
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
                            health.status === 'ONLINE' ? 'bg-green-50 text-green-700 border-green-200' : 
                            health.status === 'OFFLINE' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {health.status === 'ONLINE' ? <Wifi size={14}/> : <WifiOff size={14}/>}
                            <span>{health.status === 'ONLINE' ? 'متصل' : health.status === 'OFFLINE' ? 'غير متصل' : 'جاري الفحص...'}</span>
                            {health.status === 'ONLINE' && <span className="text-[10px] opacity-75">({health.latency}ms)</span>}
                            <button onClick={checkSupabaseHealth} className="hover:bg-black/10 rounded-full p-1" title="إعادة الفحص"><RefreshCw size={12}/></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Project URL</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded font-mono text-sm bg-gray-50 dir-ltr text-left" 
                                placeholder="https://xyz...supabase.co"
                                value={sbUrl}
                                onChange={e => setSbUrl(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-600 mb-1">Anon / Public Key</label>
                            <input 
                                type="password" 
                                className="w-full p-2 border rounded font-mono text-sm bg-gray-50 dir-ltr text-left" 
                                placeholder="eyJhbGciOiJIUz..."
                                value={sbKey}
                                onChange={e => setSbKey(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                         <button 
                            onClick={handleSaveSupabaseConfig}
                            className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-black transition-colors flex items-center gap-2"
                        >
                            <Save size={16}/> حفظ الإعدادات
                        </button>
                    </div>
                    {health.message && <p className="text-xs text-red-500 mt-2 dir-ltr text-left">{health.message}</p>}
                </div>

                {/* 2. STATS & INFO SECTION (Comparison) */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                    <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2 mb-4">
                        <Activity size={18} className="text-purple-600"/> حالة المزامنة (محلي vs سحابي)
                    </h4>
                    
                    {localStats ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            <StatComparison label="الطلاب" table="students" local={localStats.students} cloud={cloudStats?.students} />
                            <StatComparison label="المعلمين" table="teachers" local={localStats.teachers} cloud={cloudStats?.teachers} />
                            <StatComparison label="الحضور" table="attendance_records" local={localStats.attendance} cloud={cloudStats?.attendance_records} />
                            <StatComparison label="الأداء" table="performance_records" local={localStats.performance} cloud={cloudStats?.performance_records} />
                            <StatComparison label="المدارس" table="schools" local={localStats.schools} cloud={cloudStats?.schools} />
                            <StatComparison label="المستخدمين" table="system_users" local={localStats.users} cloud={cloudStats?.system_users} />
                        </div>
                    ) : <div className="text-center text-gray-400 py-4">جاري التحميل...</div>}
                </div>

                {/* 3. NEW: CLOUD DATA INSPECTOR */}
                 <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
                    <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2 mb-4">
                        <Server size={18} className="text-indigo-600"/> مستكشف البيانات السحابية (Cloud Inspector)
                    </h4>
                    <p className="text-sm text-gray-500 mb-4">يمكنك هنا استعراض البيانات الفعلية المخزنة في Supabase للتأكد من عملية الرفع.</p>
                    
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                        <select 
                            className="p-2 border rounded bg-gray-50 flex-1"
                            value={inspectorTable}
                            onChange={(e) => setInspectorTable(e.target.value)}
                        >
                            {Object.values(DB_MAP).map(t => (
                                <option key={t} value={t}>{t} (جدول {getTableDisplayName(t)})</option>
                            ))}
                        </select>
                        <button 
                            onClick={handleFetchInspectorData} 
                            disabled={inspectorLoading || health.status !== 'ONLINE'}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-6 py-2 rounded font-bold flex items-center gap-2"
                        >
                             {inspectorLoading ? <RefreshCw className="animate-spin" size={16}/> : <Eye size={16}/>}
                             عرض البيانات
                        </button>
                    </div>

                    {/* Data Table */}
                    <div className="border rounded-lg overflow-hidden bg-gray-50 min-h-[150px] max-h-[400px] overflow-auto">
                        {inspectorData.length > 0 ? (
                            <table className="w-full text-right text-sm">
                                <thead className="bg-gray-200 text-gray-700 sticky top-0">
                                    <tr>
                                        {Object.keys(inspectorData[0]).map(key => (
                                            <th key={key} className="p-3 whitespace-nowrap">{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {inspectorData.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50">
                                            {Object.values(row).map((val: any, i) => (
                                                <td key={i} className="p-3 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
                                <Table size={32} className="mb-2 opacity-50"/>
                                <p>{inspectorLoading ? 'جاري جلب البيانات...' : 'لا توجد بيانات للعرض أو لم يتم الجلب بعد'}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Cloud Sync Buttons */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-xl shadow-lg border border-gray-700 h-fit">
                    <h4 className="font-bold flex items-center gap-2 mb-4 text-lg border-b border-gray-700 pb-2">
                        <Cloud size={20} className="text-blue-400"/> إجراءات المزامنة
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => handleCloudSync('UPLOAD')} 
                            disabled={isSyncing}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold flex flex-col items-center gap-1 transition-all"
                        >
                            {isSyncing ? <RefreshCw className="animate-spin"/> : <CloudRain size={24}/>}
                            <span>رفع للسحابة</span>
                        </button>
                        <button 
                            onClick={() => handleCloudSync('DOWNLOAD')}
                            disabled={isSyncing} 
                            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-bold flex flex-col items-center gap-1 transition-all"
                        >
                            {isSyncing ? <RefreshCw className="animate-spin"/> : <CloudLightning size={24}/>}
                            <span>سحب من السحابة</span>
                        </button>
                    </div>
                </div>

                {/* Local Backup Section */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 space-y-4 shadow-sm h-fit">
                    <h4 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2">
                        <Database size={18}/> النسخ الاحتياطي المحلي
                    </h4>
                    
                    <div className="flex justify-between items-center py-2">
                        <div>
                            <p className="font-bold text-gray-800 text-sm flex items-center gap-2"><Download size={16} className="text-blue-600"/> تصدير نسخة</p>
                            <p className="text-xs text-gray-500">تحميل ملف JSON</p>
                        </div>
                        <button onClick={handleDownloadBackup} className="px-3 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-xs font-bold border border-blue-200">
                            تحميل
                        </button>
                    </div>

                    <div className="flex justify-between items-center py-2">
                        <div>
                            <p className="font-bold text-gray-800 text-sm flex items-center gap-2"><Upload size={16} className="text-purple-600"/> استعادة نسخة</p>
                            <p className="text-xs text-gray-500">رفع ملف JSON</p>
                        </div>
                        <div className="relative">
                            <input type="file" accept=".json" onChange={handleRestoreBackup} className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                            <button className="px-3 py-1 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 text-xs font-bold border border-purple-200 pointer-events-none">
                                رفع
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t">
                        <button onClick={handleClearDB} className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-bold border border-red-200 flex items-center justify-center gap-2">
                            <AlertTriangle size={14}/> تصفير قاعدة البيانات (حذف البيانات)
                        </button>
                    </div>
                </div>

                {/* Supabase SQL Generation */}
                <div className="bg-gray-900 text-gray-100 p-6 rounded-xl border border-gray-800 shadow-lg relative overflow-hidden lg:col-span-2">
                    <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-green-400 to-blue-500"></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h4 className="font-bold text-white flex items-center gap-2"><Terminal size={18} className="text-green-400"/> 1. إعداد قاعدة البيانات (SQL)</h4>
                            <p className="text-xs text-gray-400 mt-1">انسخ هذا الكود وضعه في Supabase SQL Editor لإنشاء الجداول وحذف البيانات الوهمية</p>
                        </div>
                        <button onClick={copyToClipboard} className="text-gray-400 hover:text-white bg-gray-800 p-2 rounded hover:bg-gray-700 transition-colors" title="نسخ الكود">
                            <Copy size={16} />
                        </button>
                    </div>
                    
                    <div className="bg-black/50 rounded-lg p-3 overflow-hidden h-64 relative border border-gray-800">
                         <div className="absolute top-2 right-2 flex gap-1">
                             <div className="w-3 h-3 rounded-full bg-red-500"></div>
                             <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                             <div className="w-3 h-3 rounded-full bg-green-500"></div>
                         </div>
                         <pre className="text-[10px] font-mono text-green-300 overflow-auto h-full pt-4 custom-scrollbar dir-ltr text-left">
                            {SUPABASE_SCHEMA_SQL}
                         </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatItem = ({ label, count, color }: any) => (
    <div className={`p-3 rounded-lg border ${color} bg-opacity-30`}>
        <p className="text-xs opacity-75">{label}</p>
        <p className="text-2xl font-bold">{count}</p>
    </div>
);

const StatComparison = ({ label, table, local, cloud }: any) => {
    const isMatched = local === cloud;
    const isCloudError = cloud === -1;
    const cloudDisplay = isCloudError ? '?' : (cloud ?? '-');

    return (
        <div className={`p-3 rounded-lg border flex flex-col gap-1 ${isMatched ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <p className="text-xs font-bold text-gray-600">{label}</p>
            <div className="flex justify-between items-end">
                <div className="text-center">
                    <span className="text-[10px] text-gray-400 block">محلي</span>
                    <span className="font-bold text-blue-700">{local}</span>
                </div>
                <div className="h-6 w-[1px] bg-gray-300 mx-1"></div>
                <div className="text-center">
                     <span className="text-[10px] text-gray-400 block">سحابي</span>
                    <span className={`font-bold ${isMatched ? 'text-green-700' : 'text-red-600'}`}>
                        {cloudDisplay}
                    </span>
                </div>
            </div>
            {isCloudError && <span className="text-[9px] text-red-500">خطأ اتصال</span>}
        </div>
    )
}

export default AdminDashboard;