
import React, { useState, useEffect } from 'react';
import { School, SystemUser, SubscriptionPlan, AISettings } from '../types';
import { 
    getSchools, addSchool, deleteSchool, updateSchool,
    getSystemUsers, addSystemUser, deleteSystemUser, updateSystemUser,
    createBackup, restoreBackup, clearDatabase,
    uploadToSupabase, downloadFromSupabase,
    getStorageStatistics, checkConnection,
    getCloudStatistics, fetchCloudTableData,
    DB_MAP, getTableDisplayName,
    getAISettings, saveAISettings,
    getDatabaseSchemaSQL,
    clearCloudTable, resetCloudDatabase
} from '../services/storageService';
import { updateSupabaseConfig } from '../services/supabaseClient';
import { 
    Shield, Building, Users, CreditCard, Settings, Database, 
    Trash2, Download, Upload, AlertTriangle, RefreshCw, Check, Copy, Terminal, Cloud, CloudRain, CloudLightning, Save, Link, Wifi, WifiOff, Activity, Server, Table, Eye, UserPlus, School as SchoolIcon, Lock, Edit, X, Wrench, BrainCircuit, Sliders, Sparkles, Building2, Code, Key
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SCHOOLS' | 'USERS' | 'SUBSCRIPTIONS' | 'DATABASE' | 'AI_SETTINGS'>('OVERVIEW');

    return (
        <div className="p-6 animate-fade-in space-y-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Server className="text-gray-800" />
                        لوحة مدير النظام (System Admin)
                    </h2>
                    <p className="text-gray-500 mt-2">التحكم المركزي في المدارس، المستخدمين، قاعدة البيانات، والذكاء الاصطناعي.</p>
                </div>
            </div>

            {/* Admin Tabs */}
            <div className="flex overflow-x-auto bg-gray-900 text-white rounded-xl shadow-lg border border-gray-700 p-1 mb-6">
                <TabButton active={activeTab === 'OVERVIEW'} onClick={() => setActiveTab('OVERVIEW')} icon={<Activity size={18} />} label="نظرة عامة" />
                <TabButton active={activeTab === 'SCHOOLS'} onClick={() => setActiveTab('SCHOOLS')} icon={<Building size={18} />} label="المدارس" />
                <TabButton active={activeTab === 'USERS'} onClick={() => setActiveTab('USERS')} icon={<Users size={18} />} label="المستخدمين" />
                <TabButton active={activeTab === 'SUBSCRIPTIONS'} onClick={() => setActiveTab('SUBSCRIPTIONS')} icon={<CreditCard size={18} />} label="الاشتراكات" />
                <TabButton active={activeTab === 'DATABASE'} onClick={() => setActiveTab('DATABASE')} icon={<Database size={18} />} label="قواعد البيانات" />
                <TabButton active={activeTab === 'AI_SETTINGS'} onClick={() => setActiveTab('AI_SETTINGS')} icon={<BrainCircuit size={18} />} label="الذكاء الاصطناعي" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[500px]">
                {activeTab === 'OVERVIEW' && <AdminOverview />}
                {activeTab === 'SCHOOLS' && <SchoolsManager />}
                {activeTab === 'USERS' && <UsersManager />}
                {activeTab === 'SUBSCRIPTIONS' && <SubscriptionsManager />}
                {activeTab === 'DATABASE' && <DatabaseSettings />}
                {activeTab === 'AI_SETTINGS' && <AISettingsManager />}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-bold transition-all whitespace-nowrap ${
            active ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
    >
        {icon}
        <span>{label}</span>
    </button>
);

// --- Admin Overview ---
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

            <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 text-white shadow-lg border border-gray-700">
                <div className="flex items-start justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                            <Shield className="text-yellow-400" size={20}/> حساب مدير النظام (Super Admin)
                        </h3>
                        <p className="text-gray-400 text-sm mb-4">
                            بصفتك مدير النظام، لديك الصلاحية الكاملة لإدارة جميع المدارس والمستخدمين وقواعد البيانات.
                        </p>
                        <div className="space-y-2 text-sm bg-black/30 p-4 rounded-lg border border-gray-700 font-mono">
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 w-24">اسم المستخدم:</span>
                                <span className="text-white font-bold select-all">admin@school.com</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 w-24">الصلاحية:</span>
                                <span className="text-red-400 font-bold">FULL ACCESS</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Schools Manager ---
const SchoolsManager = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [form, setForm] = useState({ 
        name: '', 
        ministryCode: '', 
        managerName: '', 
        managerNationalId: '',
        phone: '' 
    });
    
    // UI States for Modals
    const [viewingSchool, setViewingSchool] = useState<School | null>(null);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);

    useEffect(() => setSchools(getSchools()), []);

    const handleAdd = () => {
        if (!form.name || !form.ministryCode) {
            alert('اسم المدرسة والرمز الوزاري حقول إلزامية');
            return;
        }
        addSchool({
            id: Date.now().toString(),
            name: form.name,
            ministryCode: form.ministryCode,
            managerName: form.managerName,
            managerNationalId: form.managerNationalId,
            phone: form.phone,
            type: 'PRIVATE', // Default
            studentCount: 0,
            subscriptionStatus: 'ACTIVE'
        });
        setSchools(getSchools());
        setForm({ name: '', ministryCode: '', managerName: '', managerNationalId: '', phone: '' });
    };

    const handleUpdate = () => {
        if (!editingSchool) return;
        updateSchool(editingSchool);
        setSchools(getSchools());
        setEditingSchool(null); // Close modal
    };

    return (
        <div className="space-y-6">
            <h3 className="font-bold text-gray-800 text-lg border-b pb-2">إدارة المدارس وقواعد البيانات</h3>
            
            {/* Add School Form */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h4 className="text-sm font-bold text-gray-600 mb-3">إضافة مدرسة جديدة</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                    <input className="p-2 border rounded text-sm" placeholder="اسم المدرسة *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                    <input className="p-2 border rounded text-sm" placeholder="الرمز الوزاري *" value={form.ministryCode} onChange={e => setForm({...form, ministryCode: e.target.value})} />
                    <input className="p-2 border rounded text-sm" placeholder="رقم الهاتف" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                    <input className="p-2 border rounded text-sm" placeholder="اسم المدير" value={form.managerName} onChange={e => setForm({...form, managerName: e.target.value})} />
                    <input className="p-2 border rounded text-sm" placeholder="رقم هوية المدير (للربط)" value={form.managerNationalId} onChange={e => setForm({...form, managerNationalId: e.target.value})} />
                </div>
                <div className="flex justify-end">
                    <button onClick={handleAdd} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                        <PlusCircleIcon size={16}/> إضافة المدرسة
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="grid gap-3">
                {schools.map(s => (
                    <div key={s.id} className="flex justify-between items-center p-4 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                                <Building2 size={20}/>
                            </div>
                            <div>
                                <div className="font-bold text-gray-800 text-lg">{s.name}</div>
                                <div className="text-xs text-gray-500 flex gap-3">
                                    <span className="font-mono bg-gray-100 px-1 rounded">رمز: {s.ministryCode || 'غير محدد'}</span>
                                    <span>المدير: {s.managerName || 'غير مسجل'}</span>
                                    {s.managerNationalId && <span className="font-mono">({s.managerNationalId})</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${s.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {s.subscriptionStatus}
                            </span>
                            {/* Action Buttons */}
                            <button onClick={() => setViewingSchool(s)} className="text-gray-500 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg" title="عرض التفاصيل">
                                <Eye size={18}/>
                            </button>
                            <button onClick={() => setEditingSchool(s)} className="text-gray-500 hover:text-yellow-600 p-2 hover:bg-yellow-50 rounded-lg" title="تعديل">
                                <Edit size={18}/>
                            </button>
                            <button onClick={() => { if(confirm('حذف المدرسة؟')) { deleteSchool(s.id); setSchools(getSchools()); }}} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg" title="حذف">
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    </div>
                ))}
                {schools.length === 0 && (
                    <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-xl">
                        <Building2 size={48} className="mx-auto mb-2 opacity-20"/>
                        لا توجد مدارس مسجلة في النظام.
                    </div>
                )}
            </div>

            {/* --- View Modal --- */}
            {viewingSchool && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Building2 size={20}/> تفاصيل المدرسة</h3>
                            <button onClick={() => setViewingSchool(null)}><X size={20} className="text-gray-400 hover:text-red-500"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col items-center mb-4">
                                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2"><SchoolIcon size={32}/></div>
                                <h2 className="text-2xl font-bold text-gray-800">{viewingSchool.name}</h2>
                                <span className={`text-xs px-2 py-1 rounded font-bold mt-1 ${viewingSchool.subscriptionStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{viewingSchool.subscriptionStatus}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-gray-50 p-3 rounded border">
                                    <span className="block text-gray-500 text-xs font-bold">الرمز الوزاري</span>
                                    <span className="font-mono font-bold text-lg">{viewingSchool.ministryCode}</span>
                                </div>
                                <div className="bg-gray-50 p-3 rounded border">
                                    <span className="block text-gray-500 text-xs font-bold">الهاتف</span>
                                    <span className="font-mono font-bold dir-ltr">{viewingSchool.phone || '-'}</span>
                                </div>
                                <div className="col-span-2 bg-gray-50 p-3 rounded border">
                                    <span className="block text-gray-500 text-xs font-bold">المدير</span>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold">{viewingSchool.managerName}</span>
                                        <span className="font-mono text-xs bg-white px-2 rounded border">{viewingSchool.managerNationalId}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 text-center">
                            <button onClick={() => setViewingSchool(null)} className="px-6 py-2 bg-white border rounded-lg font-bold text-gray-600 hover:bg-gray-100">إغلاق</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Edit Modal --- */}
            {editingSchool && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Edit size={20}/> تعديل بيانات المدرسة</h3>
                            <button onClick={() => setEditingSchool(null)}><X size={20} className="text-gray-400 hover:text-red-500"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">اسم المدرسة</label>
                                <input className="w-full p-2 border rounded" value={editingSchool.name} onChange={e => setEditingSchool({...editingSchool, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">الرمز الوزاري</label>
                                <input className="w-full p-2 border rounded font-mono" value={editingSchool.ministryCode || ''} onChange={e => setEditingSchool({...editingSchool, ministryCode: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">رقم الهاتف</label>
                                <input className="w-full p-2 border rounded" value={editingSchool.phone || ''} onChange={e => setEditingSchool({...editingSchool, phone: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">اسم المدير</label>
                                    <input className="w-full p-2 border rounded" value={editingSchool.managerName || ''} onChange={e => setEditingSchool({...editingSchool, managerName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">هوية المدير (لربط الحساب)</label>
                                    <input className="w-full p-2 border rounded font-mono" value={editingSchool.managerNationalId || ''} onChange={e => setEditingSchool({...editingSchool, managerNationalId: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">حالة الاشتراك</label>
                                <select 
                                    className="w-full p-2 border rounded bg-white"
                                    value={editingSchool.subscriptionStatus}
                                    onChange={e => setEditingSchool({...editingSchool, subscriptionStatus: e.target.value as any})}
                                >
                                    <option value="ACTIVE">نشط (Active)</option>
                                    <option value="EXPIRED">منتهي (Expired)</option>
                                    <option value="TRIAL">تجريبي (Trial)</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                            <button onClick={() => setEditingSchool(null)} className="px-4 py-2 bg-white border rounded-lg font-bold text-gray-600 hover:bg-gray-100">إلغاء</button>
                            <button onClick={handleUpdate} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                                <Save size={18}/> حفظ التعديلات
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PlusCircleIcon = ({size}: {size:number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
)

// --- Users Manager ---
const UsersManager = () => {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'SCHOOL_MANAGER', password: '' });
    
    useEffect(() => setUsers(getSystemUsers()), []);

    const handleAddUser = () => {
        if(!newUser.email || !newUser.password) return;
        addSystemUser({
            id: Date.now().toString(),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role as any,
            password: newUser.password,
            status: 'ACTIVE'
        });
        setUsers(getSystemUsers());
        setNewUser({ name: '', email: '', role: 'SCHOOL_MANAGER', password: '' });
    };

    return (
        <div className="space-y-6">
            <h3 className="font-bold text-gray-800 text-lg border-b pb-2">إدارة مدراء المدارس ومسؤولي النظام</h3>
            
            <div className="bg-gray-50 p-4 rounded-xl border flex flex-col md:flex-row gap-2">
                <input className="p-2 border rounded text-sm flex-1" placeholder="الاسم" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                <input className="p-2 border rounded text-sm flex-1" placeholder="البريد / الهوية" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                <input className="p-2 border rounded text-sm flex-1" placeholder="كلمة المرور" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                <select className="p-2 border rounded text-sm" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                    <option value="SCHOOL_MANAGER">مدير مدرسة</option>
                    <option value="SUPER_ADMIN">مدير نظام</option>
                </select>
                <button onClick={handleAddUser} className="bg-gray-800 text-white px-4 py-2 rounded font-bold hover:bg-black">إضافة</button>
            </div>

            <div className="overflow-auto bg-white rounded-lg shadow-sm border">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-100 text-gray-600">
                        <tr>
                            <th className="p-3">الاسم</th>
                            <th className="p-3">البريد/الهوية</th>
                            <th className="p-3">الدور</th>
                            <th className="p-3">كلمة المرور</th>
                            <th className="p-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-bold">{u.name}</td>
                                <td className="p-3">{u.email}</td>
                                <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{u.role}</span></td>
                                <td className="p-3 font-mono text-gray-400">********</td>
                                <td className="p-3">
                                    <button onClick={() => { deleteSystemUser(u.id); setUsers(getSystemUsers()); }} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Subscriptions Manager ---
const SubscriptionsManager = () => {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed rounded-xl">
            <CreditCard size={48} className="mb-4 opacity-20"/>
            <p className="font-bold">نظام الاشتراكات قيد التطوير</p>
            <p className="text-sm">سيمكنك هنا تفعيل وإيقاف اشتراكات المدارس.</p>
        </div>
    );
};

// --- Database Settings (Refactored) ---
const DatabaseSettings = () => {
    const [dbTab, setDbTab] = useState<'CONFIG' | 'CLOUD' | 'MAINTENANCE'>('CONFIG');
    const [connectionStatus, setConnectionStatus] = useState<'CHECKING' | 'CONNECTED' | 'ERROR' | 'IDLE'>('IDLE');
    const [latency, setLatency] = useState(0);
    
    // Config State
    const [supaUrl, setSupaUrl] = useState('');
    const [supaKey, setSupaKey] = useState('');

    // Cloud Inspector State
    const [selectedTable, setSelectedTable] = useState('schools');
    const [cloudData, setCloudData] = useState<any[]>([]);
    const [cloudLoading, setCloudLoading] = useState(false);

    useEffect(() => {
        setSupaUrl(localStorage.getItem('custom_supabase_url') || '');
        setSupaKey(localStorage.getItem('custom_supabase_key') || '');
        handleCheckConnection();
    }, []);

    const handleCheckConnection = async () => {
        setConnectionStatus('CHECKING');
        const start = Date.now();
        const res = await checkConnection();
        const end = Date.now();
        
        if (res.success) {
            setConnectionStatus('CONNECTED');
            setLatency(end - start);
        } else {
            setConnectionStatus('ERROR');
        }
    };

    const handleSaveConfig = () => {
        if (!supaUrl || !supaKey) return;
        const success = updateSupabaseConfig(supaUrl, supaKey);
        if (success) {
            alert('تم حفظ الإعدادات بنجاح!');
            handleCheckConnection();
        } else {
            alert('رابط المشروع غير صالح.');
        }
    };

    const handleFetchCloud = async () => {
        setCloudLoading(true);
        try {
            const data = await fetchCloudTableData(selectedTable);
            setCloudData(data || []);
        } catch (e) {
            console.error(e);
            alert('فشل جلب البيانات.');
        } finally {
            setCloudLoading(false);
        }
    };

    const handleSync = async (direction: 'PUSH' | 'PULL') => {
        if (!confirm(direction === 'PUSH' ? 'سيتم رفع البيانات المحلية واستبدال/دمج مع السحابية. متابعة؟' : 'سيتم تنزيل البيانات السحابية واستبدال المحلية. متابعة؟')) return;
        
        setCloudLoading(true);
        try {
            if (direction === 'PUSH') await uploadToSupabase();
            else await downloadFromSupabase();
            alert('تمت العملية بنجاح!');
            window.location.reload();
        } catch (e: any) {
            alert('خطأ: ' + e.message);
        } finally {
            setCloudLoading(false);
        }
    };

    const handleCopySQL = () => {
        const sql = getDatabaseSchemaSQL();
        navigator.clipboard.writeText(sql);
        alert('تم نسخ كود SQL إلى الحافظة!');
    };

    const handleClearTable = async () => {
        if (!confirm(`تحذير خطير!\nسيتم حذف جميع البيانات من الجدول ${selectedTable} من قاعدة البيانات السحابية.\nهل أنت متأكد تماماً؟`)) return;
        if (!confirm(`تأكيد نهائي: هل قمت بأخذ نسخة احتياطية؟\nسيتم مسح بيانات ${selectedTable} فوراً.`)) return;

        setCloudLoading(true);
        try {
            await clearCloudTable(selectedTable);
            alert('تم حذف بيانات الجدول بنجاح.');
            setCloudData([]); // Clear local view
        } catch (e: any) {
            alert('خطأ أثناء الحذف: ' + e.message);
        } finally {
            setCloudLoading(false);
        }
    };

    const handleCloudReset = async () => {
        if (!confirm('تحذير شديد الخطورة!\nسيتم تصفير النظام السحابي بالكامل (حذف جميع الجداول).\nلا يمكن التراجع عن هذا الإجراء.\nهل تريد المتابعة؟')) return;
        
        const userInput = prompt('أدخل كلمة "RESET" لتأكيد حذف قاعدة البيانات السحابية بالكامل:');
        if (userInput !== 'RESET') {
            alert('لم يتم الحذف. كلمة التأكيد غير صحيحة.');
            return;
        }

        setCloudLoading(true);
        try {
            await resetCloudDatabase();
            alert('تم تصفير قاعدة البيانات السحابية بنجاح.');
            setCloudData([]);
        } catch (e: any) {
            alert('خطأ أثناء التصفير: ' + e.message);
        } finally {
            setCloudLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 border-b border-gray-200 pb-2">
                <button onClick={() => setDbTab('CONFIG')} className={`text-sm font-bold pb-2 ${dbTab === 'CONFIG' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>الإعدادات والاتصال</button>
                <button onClick={() => setDbTab('CLOUD')} className={`text-sm font-bold pb-2 ${dbTab === 'CLOUD' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>مستكشف البيانات (Cloud)</button>
                <button onClick={() => setDbTab('MAINTENANCE')} className={`text-sm font-bold pb-2 ${dbTab === 'MAINTENANCE' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>الصيانة والنسخ</button>
            </div>

            {/* CONFIG TAB */}
            {dbTab === 'CONFIG' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Status Card */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${connectionStatus === 'CONNECTED' ? 'bg-green-50 border-green-200' : connectionStatus === 'ERROR' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                {connectionStatus === 'CONNECTED' ? <Wifi size={20}/> : <WifiOff size={20}/>}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800">حالة الاتصال بالسحابة (Supabase)</h4>
                                <p className="text-xs text-gray-500">
                                    {connectionStatus === 'CONNECTED' ? `متصل بنجاح (${latency}ms)` : connectionStatus === 'CHECKING' ? 'جاري الفحص...' : 'غير متصل / خطأ في الإعدادات'}
                                </p>
                            </div>
                        </div>
                        <button onClick={handleCheckConnection} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"><RefreshCw size={14}/> فحص</button>
                    </div>

                    {/* Credentials Form */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Key size={18}/> بيانات الربط (Credentials)</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">رابط المشروع (Project URL)</label>
                                <input type="text" className="w-full p-2 border rounded font-mono text-sm dir-ltr" value={supaUrl} onChange={e => setSupaUrl(e.target.value)} placeholder="https://xyz.supabase.co" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">مفتاح API (Anon Key)</label>
                                <input type="password" className="w-full p-2 border rounded font-mono text-sm dir-ltr" value={supaKey} onChange={e => setSupaKey(e.target.value)} placeholder="eyJh..." />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button onClick={handleSaveConfig} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700">حفظ واختبار</button>
                            </div>
                        </div>
                        <p className="text-xs text-red-500 mt-3">* تنبيه: يتم حفظ المفاتيح محلياً في المتصفح. تأكد من استخدام جهاز آمن.</p>
                    </div>

                    {/* Sync Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-xl hover:bg-gray-50">
                            <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Upload size={16}/> رفع البيانات (Push)</h4>
                            <p className="text-xs text-gray-500 mb-3">إرسال جميع البيانات المحلية إلى السحابة.</p>
                            <button onClick={() => handleSync('PUSH')} disabled={cloudLoading} className="w-full py-2 bg-blue-600 text-white rounded font-bold text-sm">رفع الآن</button>
                        </div>
                        <div className="p-4 border rounded-xl hover:bg-gray-50">
                            <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Download size={16}/> جلب البيانات (Pull)</h4>
                            <p className="text-xs text-gray-500 mb-3">تنزيل البيانات من السحابة واستبدال المحلية.</p>
                            <button onClick={() => handleSync('PULL')} disabled={cloudLoading} className="w-full py-2 bg-green-600 text-white rounded font-bold text-sm">تنزيل الآن</button>
                        </div>
                    </div>
                </div>
            )}

            {/* CLOUD TAB */}
            {dbTab === 'CLOUD' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                        <select 
                            className="p-2 border rounded bg-white font-bold text-gray-700"
                            value={selectedTable}
                            onChange={e => setSelectedTable(e.target.value)}
                        >
                            {Object.keys(DB_MAP).map(key => <option key={key} value={DB_MAP[key]}>{getTableDisplayName(DB_MAP[key])}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <button onClick={handleFetchCloud} className="bg-gray-800 text-white px-4 py-2 rounded font-bold text-sm flex items-center gap-2">
                                {cloudLoading ? <RefreshCw className="animate-spin" size={14}/> : <Eye size={14}/>} عرض البيانات
                            </button>
                            <button onClick={handleClearTable} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded font-bold text-sm flex items-center gap-2 hover:bg-red-100">
                                <Trash2 size={14}/> حذف بيانات الجدول
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl overflow-hidden min-h-[300px]">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm dir-ltr">
                                <thead className="bg-gray-100 text-gray-600">
                                    <tr>
                                        {cloudData.length > 0 ? Object.keys(cloudData[0]).slice(0, 6).map(k => (
                                            <th key={k} className="p-3 border-b">{k}</th>
                                        )) : <th className="p-3 text-center">No Data</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {cloudData.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50 border-b last:border-0">
                                            {Object.values(row).slice(0, 6).map((val: any, j) => (
                                                <td key={j} className="p-3 whitespace-nowrap max-w-xs overflow-hidden text-ellipsis">
                                                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {cloudData.length === 0 && !cloudLoading && (
                                        <tr><td colSpan={6} className="p-10 text-center text-gray-400">لا توجد بيانات للعرض أو لم يتم الجلب بعد.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MAINTENANCE TAB */}
            {dbTab === 'MAINTENANCE' && (
                <div className="space-y-6 animate-fade-in">
                    
                    {/* SQL Generator */}
                    <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                        <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><Code size={20} className="text-yellow-400"/> إعداد قاعدة البيانات (SQL Setup)</h4>
                        <p className="text-gray-400 text-sm mb-4">انسخ الكود التالي ونفذه في "SQL Editor" في لوحة تحكم Supabase لإنشاء الجداول المطلوبة.</p>
                        
                        <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-green-400 overflow-x-auto h-32 mb-4 relative">
                            <pre>{getDatabaseSchemaSQL()}</pre>
                        </div>
                        <button onClick={handleCopySQL} className="bg-white text-gray-900 px-4 py-2 rounded font-bold text-sm hover:bg-gray-200 flex items-center gap-2">
                            <Copy size={16}/> نسخ الكود
                        </button>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                        <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><Save size={18}/> النسخ الاحتياطي المحلي</h4>
                        <button 
                            onClick={() => {
                                const data = createBackup();
                                const blob = new Blob([data], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `backup_${new Date().toISOString()}.json`;
                                a.click();
                            }} 
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Download size={18}/> تحميل نسخة كاملة
                        </button>
                    </div>

                    <div className="bg-red-50 p-6 rounded-xl border border-red-100">
                        <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2"><Trash2 size={18}/> إدارة البيانات المحلية (Local Storage)</h4>
                        <button 
                            onClick={() => { if(confirm('تحذير: سيتم حذف جميع البيانات المخزنة في هذا المتصفح فقط.\nهل تريد المتابعة؟')) { clearDatabase(); window.location.reload(); } }}
                            className="bg-white text-red-600 border border-red-200 px-6 py-2 rounded-lg font-bold hover:bg-red-50 flex items-center gap-2"
                        >
                            <AlertTriangle size={18}/> تصفير الذاكرة المحلية
                        </button>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-white">
                        <h4 className="font-bold mb-4 flex items-center gap-2 text-red-400"><CloudLightning size={18}/> إدارة البيانات السحابية (Cloud)</h4>
                        <p className="text-xs text-gray-400 mb-4">هذه الإجراءات تؤثر على قاعدة البيانات المركزية. يرجى الحذر.</p>
                        <button 
                            onClick={handleCloudReset}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2 shadow-lg"
                        >
                            <AlertTriangle size={18}/> تصفير قاعدة البيانات السحابية بالكامل
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- AI Settings Manager ---
const AISettingsManager = () => {
    const [settings, setSettings] = useState<AISettings>(getAISettings());
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        saveAISettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="font-bold text-gray-800 text-lg border-b pb-2 flex items-center gap-2">
                <BrainCircuit className="text-purple-600"/> إعدادات الذكاء الاصطناعي (AI Configuration)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Settings size={18}/> إعدادات النموذج (Model)</h4>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">موديل التوليد (Model ID)</label>
                            <select 
                                className="w-full p-2 border rounded-lg bg-gray-50"
                                value={settings.modelId}
                                onChange={e => setSettings({...settings, modelId: e.target.value})}
                            >
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (سريع - اقتصادي)</option>
                                <option value="gemini-3-pro-preview">Gemini 3 Pro Preview (ذكي جداً - للأمور المعقدة)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">درجة الإبداع (Temperature): {settings.temperature}</label>
                            <input 
                                type="range" 
                                min="0" max="1" step="0.1" 
                                className="w-full accent-purple-600"
                                value={settings.temperature}
                                onChange={e => setSettings({...settings, temperature: parseFloat(e.target.value)})}
                            />
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>دقيق (0.0)</span>
                                <span>متوازن (0.5)</span>
                                <span>مبدع (1.0)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><Sliders size={18}/> التحكم في الخصائص</h4>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                            <span className="text-sm font-bold text-gray-700">تفعيل التقارير الذكية</span>
                            <input type="checkbox" checked={settings.enableReports} onChange={e => setSettings({...settings, enableReports: e.target.checked})} className="w-5 h-5 accent-purple-600"/>
                        </label>
                        <label className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                            <span className="text-sm font-bold text-gray-700">تفعيل إنشاء الاختبارات</span>
                            <input type="checkbox" checked={settings.enableQuiz} onChange={e => setSettings({...settings, enableQuiz: e.target.checked})} className="w-5 h-5 accent-purple-600"/>
                        </label>
                        <label className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                            <span className="text-sm font-bold text-gray-700">تفعيل تخطيط الدروس</span>
                            <input type="checkbox" checked={settings.enablePlanning} onChange={e => setSettings({...settings, enablePlanning: e.target.checked})} className="w-5 h-5 accent-purple-600"/>
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><Sparkles size={18}/> شخصية المساعد (System Instruction)</h4>
                <p className="text-xs text-gray-500 mb-3">حدد كيف يتصرف الذكاء الاصطناعي، نبرة الصوت، والأسلوب التربوي.</p>
                <textarea 
                    className="w-full p-4 border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none h-32 text-sm"
                    value={settings.systemInstruction}
                    onChange={e => setSettings({...settings, systemInstruction: e.target.value})}
                    placeholder="مثال: أنت خبير تربوي سعودي، تستخدم اللهجة البيضاء والمصطلحات الرسمية لوزارة التعليم..."
                />
            </div>

            <div className="flex justify-end">
                <button 
                    onClick={handleSave} 
                    className={`px-8 py-3 rounded-xl font-bold text-white flex items-center gap-2 transition-all ${saved ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                    {saved ? <Check size={20}/> : <Save size={20}/>}
                    {saved ? 'تم الحفظ' : 'حفظ الإعدادات'}
                </button>
            </div>
        </div>
    );
};

export default AdminDashboard;
