
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getSchools, addSchool, deleteSchool, updateSchool,
    getSystemUsers, addSystemUser, deleteSystemUser, updateSystemUser,
    createBackup, restoreBackup, clearDatabase,
    uploadToSupabase, downloadFromSupabase,
    checkConnection, fetchCloudTableData,
    DB_MAP, getTableDisplayName,
    getDatabaseSchemaSQL, getDatabaseUpdateSQL,
    clearCloudTable, resetCloudDatabase,
    getAISettings, saveAISettings,
    backupCloudDatabase, restoreCloudDatabase,
    getTeachers, updateTeacher
} from '../services/storageService';
import { updateSupabaseConfig } from '../services/supabaseClient';
import { School, SystemUser, AISettings, Teacher } from '../types';
import { 
    Shield, Building, Users, CreditCard, Settings, Database, 
    Trash2, Download, Upload, AlertTriangle, RefreshCw, Check, Copy, 
    CloudLightning, Save, Wifi, WifiOff, Eye, Search, Plus, X, Edit, 
    Key, GitMerge, CheckCircle, XCircle, BrainCircuit, Code, Server, FileJson, Crown, Star
} from 'lucide-react';

// ==========================================
// 1. SCHOOLS MANAGER COMPONENT
// ==========================================
const SchoolsManager = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<School>>({});

    useEffect(() => {
        setSchools(getSchools());
    }, []);

    const filteredSchools = useMemo(() => 
        schools.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.ministryCode?.includes(searchTerm)),
    [schools, searchTerm]);

    const handleOpenModal = (school?: School) => {
        if (school) {
            setEditingSchool(school);
            setFormData(school);
        } else {
            setEditingSchool(null);
            setFormData({ type: 'PUBLIC', studentCount: 0 });
        }
        setIsModalOpen(true);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await downloadFromSupabase();
        setSchools(getSchools());
        setIsRefreshing(false);
    };

    const handleSave = () => {
        if (!formData.name || !formData.ministryCode) return alert('الاسم والرمز الوزاري مطلوبان');
        
        const schoolData: School = {
            id: editingSchool ? editingSchool.id : Date.now().toString() + '_sch',
            name: formData.name!,
            ministryCode: formData.ministryCode!,
            managerName: formData.managerName || '',
            managerNationalId: formData.managerNationalId || '',
            type: formData.type as any || 'PUBLIC',
            phone: formData.phone || '',
            studentCount: Number(formData.studentCount) || 0,
            educationAdministration: formData.educationAdministration || ''
        };

        if (editingSchool) {
            updateSchool(schoolData);
        } else {
            addSchool(schoolData);
        }
        setSchools(getSchools());
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذه المدرسة؟ سيتم فقدان البيانات المرتبطة.')) {
            deleteSchool(id);
            setSchools(getSchools());
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <div className="relative w-64">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
                    <input 
                        className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        placeholder="بحث عن مدرسة..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={handleRefresh} className="bg-white border text-gray-600 px-3 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 flex items-center gap-2">
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''}/>
                    </button>
                    <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-blue-700">
                        <Plus size={18}/> إضافة مدرسة
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                        <tr>
                            <th className="p-4">اسم المدرسة</th>
                            <th className="p-4">الرمز الوزاري</th>
                            <th className="p-4">المدير</th>
                            <th className="p-4">النوع</th>
                            <th className="p-4 text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredSchools.map(school => (
                            <tr key={school.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800">{school.name}</td>
                                <td className="p-4 font-mono text-gray-600">{school.ministryCode}</td>
                                <td className="p-4 text-gray-600">{school.managerName}</td>
                                <td className="p-4">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                                        {school.type === 'PRIVATE' ? 'أهلي' : school.type === 'INTERNATIONAL' ? 'دولي' : 'حكومي'}
                                    </span>
                                </td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button onClick={() => handleOpenModal(school)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                    <button onClick={() => handleDelete(school.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredSchools.length === 0 && <div className="p-8 text-center text-gray-400">لا توجد مدارس مطابقة</div>}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">{editingSchool ? 'تعديل بيانات المدرسة' : 'إضافة مدرسة جديدة'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">اسم المدرسة</label>
                                <input className="w-full p-2 border rounded" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">الرمز الوزاري</label>
                                    <input className="w-full p-2 border rounded font-mono" value={formData.ministryCode || ''} onChange={e => setFormData({...formData, ministryCode: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">الإدارة التعليمية</label>
                                    <input className="w-full p-2 border rounded" value={formData.educationAdministration || ''} onChange={e => setFormData({...formData, educationAdministration: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">اسم المدير</label>
                                    <input className="w-full p-2 border rounded" value={formData.managerName || ''} onChange={e => setFormData({...formData, managerName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">هوية المدير (للربط)</label>
                                    <input className="w-full p-2 border rounded font-mono" value={formData.managerNationalId || ''} onChange={e => setFormData({...formData, managerNationalId: e.target.value})} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">نوع المدرسة</label>
                                    <select className="w-full p-2 border rounded bg-white" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                        <option value="PUBLIC">حكومي</option>
                                        <option value="PRIVATE">أهلي</option>
                                        <option value="INTERNATIONAL">دولي</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleSave} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 mt-2">حفظ البيانات</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// 2. USERS MANAGER COMPONENT
// ==========================================
const UsersManager = () => {
    const [users, setUsers] = useState<SystemUser[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [formData, setFormData] = useState<Partial<SystemUser>>({});
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        setUsers(getSystemUsers());
        setSchools(getSchools());
    }, []);

    const filteredUsers = useMemo(() => 
        users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()) || u.nationalId?.includes(searchTerm)),
    [users, searchTerm]);

    const handleOpenModal = (user?: SystemUser) => {
        if (user) {
            setEditingUser(user);
            setFormData(user);
        } else {
            setEditingUser(null);
            setFormData({ status: 'ACTIVE', role: 'SCHOOL_MANAGER' });
        }
        setIsModalOpen(true);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await downloadFromSupabase();
        setUsers(getSystemUsers());
        setIsRefreshing(false);
    };

    const handleSave = () => {
        if (!formData.name || !formData.email || !formData.role) return alert('البيانات الأساسية مطلوبة');
        
        const userData: SystemUser = {
            id: editingUser ? editingUser.id : Date.now().toString(),
            name: formData.name!,
            email: formData.email!,
            nationalId: formData.nationalId,
            password: formData.password || (editingUser ? editingUser.password : '123456'),
            role: formData.role!,
            schoolId: formData.schoolId,
            status: formData.status!
        };

        if (editingUser) updateSystemUser(userData);
        else addSystemUser(userData);
        
        setUsers(getSystemUsers());
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('حذف المستخدم؟')) {
            deleteSystemUser(id);
            setUsers(getSystemUsers());
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <div className="relative w-64">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
                    <input className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm" placeholder="بحث عن مستخدم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <button onClick={handleRefresh} className="bg-white border text-gray-600 px-3 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 flex items-center gap-2">
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''}/>
                    </button>
                    <button onClick={() => handleOpenModal()} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-purple-700">
                        <Plus size={18}/> إضافة مستخدم
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                        <tr>
                            <th className="p-4">الاسم</th>
                            <th className="p-4">البريد الإلكتروني</th>
                            <th className="p-4">رقم الهوية</th>
                            <th className="p-4">الدور</th>
                            <th className="p-4">المدرسة التابعة</th>
                            <th className="p-4">الحالة</th>
                            <th className="p-4 text-center">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredUsers.map(user => {
                            const userSchool = schools.find(s => s.id === user.schoolId);
                            return (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-bold text-gray-800">{user.name}</td>
                                    <td className="p-4 font-mono text-gray-600 text-xs">
                                        {user.email}
                                    </td>
                                    <td className="p-4 font-mono text-gray-600 text-xs">
                                        {user.nationalId || '-'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            user.role === 'SUPER_ADMIN' ? 'bg-black text-white' : 
                                            user.role === 'SCHOOL_MANAGER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {user.role === 'SUPER_ADMIN' ? 'مدير نظام' : user.role === 'SCHOOL_MANAGER' ? 'مدير مدرسة' : user.role === 'TEACHER' ? 'معلم' : 'طالب'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600 text-xs">
                                        {userSchool ? userSchool.name : (user.role === 'SUPER_ADMIN' ? 'الكل' : '-')}
                                    </td>
                                    <td className="p-4">
                                        {user.status === 'ACTIVE' ? <CheckCircle size={16} className="text-green-500"/> : <XCircle size={16} className="text-red-500"/>}
                                    </td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button onClick={() => handleOpenModal(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                                        <button onClick={() => handleDelete(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">{editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold mb-1">الاسم الكامل</label>
                                <input className="w-full p-2 border rounded" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">رقم الهوية (مهم للربط)</label>
                                <input className="w-full p-2 border rounded font-mono text-sm" value={formData.nationalId || ''} onChange={e => setFormData({...formData, nationalId: e.target.value})} placeholder="10xxxxxxxx" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-1">البريد الإلكتروني</label>
                                    <input className="w-full p-2 border rounded dir-ltr" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-1">كلمة المرور</label>
                                    <input className="w-full p-2 border rounded dir-ltr" type="password" placeholder={editingUser ? 'ترك فارغاً للإبقاء' : ''} value={formData.password || ''} onChange={e => setFormData({...formData, password: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1">الدور (الصلاحية)</label>
                                <select className="w-full p-2 border rounded bg-white" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as any})}>
                                    <option value="SCHOOL_MANAGER">مدير مدرسة</option>
                                    <option value="TEACHER">معلم</option>
                                    <option value="SUPER_ADMIN">مدير نظام (Super Admin)</option>
                                </select>
                            </div>
                            {formData.role !== 'SUPER_ADMIN' && (
                                <div>
                                    <label className="block text-sm font-bold mb-1">المدرسة التابعة</label>
                                    <select className="w-full p-2 border rounded bg-white" value={formData.schoolId || ''} onChange={e => setFormData({...formData, schoolId: e.target.value})}>
                                        <option value="">-- اختر المدرسة --</option>
                                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-bold mb-1">حالة الحساب</label>
                                <select className="w-full p-2 border rounded bg-white" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                    <option value="ACTIVE">نشط</option>
                                    <option value="INACTIVE">متوقف</option>
                                </select>
                            </div>
                            <button onClick={handleSave} className="w-full bg-purple-600 text-white py-2 rounded font-bold hover:bg-purple-700 mt-2">حفظ المستخدم</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==========================================
// 3. SUBSCRIPTIONS MANAGER
// ==========================================
const SubscriptionsManager = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setTeachers(getTeachers());
    }, []);

    const filteredTeachers = useMemo(() => 
        teachers.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.email?.toLowerCase().includes(searchTerm.toLowerCase()) || t.nationalId?.includes(searchTerm)),
    [teachers, searchTerm]);

    const handleUpdateSubscription = (teacher: Teacher, newStatus: 'FREE' | 'PRO' | 'ENTERPRISE') => {
        if (confirm(`هل أنت متأكد من تغيير باقة المعلم ${teacher.name} إلى ${newStatus}؟`)) {
            const updatedTeacher = { 
                ...teacher, 
                subscriptionStatus: newStatus,
                subscriptionEndDate: newStatus === 'FREE' ? undefined : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
            };
            updateTeacher(updatedTeacher);
            setTeachers(getTeachers());
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
                <div className="flex items-center gap-2">
                    <CreditCard className="text-teal-600"/>
                    <h3 className="font-bold text-gray-800">إدارة اشتراكات المعلمين</h3>
                </div>
                <div className="relative w-64">
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={18}/>
                    <input 
                        className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm" 
                        placeholder="بحث عن معلم..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-right text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                        <tr>
                            <th className="p-4">اسم المعلم</th>
                            <th className="p-4">الهوية / البريد</th>
                            <th className="p-4">الباقة الحالية</th>
                            <th className="p-4">تاريخ الانتهاء</th>
                            <th className="p-4 text-center">ترقية / تغيير</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredTeachers.map(teacher => {
                            const sub = teacher.subscriptionStatus || 'FREE';
                            return (
                                <tr key={teacher.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-bold text-gray-800">{teacher.name}</td>
                                    <td className="p-4 font-mono text-gray-600 text-xs">{teacher.nationalId} <br/> {teacher.email}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit ${
                                            sub === 'PRO' ? 'bg-indigo-100 text-indigo-700' : 
                                            sub === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {sub === 'PRO' ? <Crown size={12}/> : sub === 'ENTERPRISE' ? <Building size={12}/> : <Star size={12}/>}
                                            {sub}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600 text-xs">
                                        {teacher.subscriptionEndDate ? new Date(teacher.subscriptionEndDate).toLocaleDateString('ar-SA') : 'غير محدود'}
                                    </td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button onClick={() => handleUpdateSubscription(teacher, 'FREE')} className={`px-3 py-1 rounded text-xs border ${sub === 'FREE' ? 'bg-gray-800 text-white' : 'bg-white hover:bg-gray-50'}`}>Basic</button>
                                        <button onClick={() => handleUpdateSubscription(teacher, 'PRO')} className={`px-3 py-1 rounded text-xs border ${sub === 'PRO' ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-200'}`}>Pro</button>
                                        <button onClick={() => handleUpdateSubscription(teacher, 'ENTERPRISE')} className={`px-3 py-1 rounded text-xs border ${sub === 'ENTERPRISE' ? 'bg-purple-600 text-white' : 'bg-white hover:bg-purple-50 text-purple-600 border-purple-200'}`}>Ent</button>
                                    </td>
                                </tr>
                            )
                        })}
                        {filteredTeachers.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">لا يوجد معلمين</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ==========================================
// 4. AI SETTINGS COMPONENT
// ==========================================
const AISettingsView = () => {
    const [aiConfig, setAiConfig] = useState<AISettings>({ modelId: 'gemini-2.5-flash', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' });

    useEffect(() => {
        setAiConfig(getAISettings());
    }, []);

    const handleSaveAI = () => {
        saveAISettings(aiConfig);
        alert('تم حفظ إعدادات الذكاء الاصطناعي.');
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-fade-in max-w-4xl mx-auto">
            <div className="flex items-center gap-3 border-b pb-4 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><BrainCircuit size={24}/></div>
                <div>
                    <h3 className="font-bold text-gray-800">إعدادات الذكاء الاصطناعي (Gemini)</h3>
                    <p className="text-xs text-gray-500">التحكم في نماذج التوليد والمميزات الذكية</p>
                </div>
            </div>

            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">موديل التوليد (Model)</label>
                    <select 
                        className="w-full p-2 border rounded bg-gray-50" 
                        value={aiConfig.modelId} 
                        onChange={e => setAiConfig({...aiConfig, modelId: e.target.value})}
                    >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (سريع واقتصادي)</option>
                        <option value="gemini-3-pro-preview">Gemini 3 Pro (ذكاء أعلى)</option>
                    </select>
                </div>

                <div>
                    <div className="flex justify-between mb-1">
                        <label className="block text-sm font-bold text-gray-700">درجة الإبداع (Temperature)</label>
                        <span className="text-xs font-mono bg-gray-100 px-2 rounded">{aiConfig.temperature}</span>
                    </div>
                    <input 
                        type="range" min="0" max="1" step="0.1" 
                        className="w-full accent-purple-600"
                        value={aiConfig.temperature}
                        onChange={e => setAiConfig({...aiConfig, temperature: parseFloat(e.target.value)})}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">0.0 (دقيق ورسمي) - 1.0 (مبدع ومتنوع)</p>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">تعليمات النظام (System Persona)</label>
                    <textarea 
                        className="w-full p-2 border rounded bg-gray-50 text-sm h-20" 
                        placeholder="مثال: أنت خبير تربوي سعودي..."
                        value={aiConfig.systemInstruction}
                        onChange={e => setAiConfig({...aiConfig, systemInstruction: e.target.value})}
                    />
                </div>

                <div className="space-y-2 pt-2 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={aiConfig.enableReports} onChange={e => setAiConfig({...aiConfig, enableReports: e.target.checked})} className="w-4 h-4 text-purple-600"/>
                        <span className="text-sm">تفعيل التقارير التحليلية</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={aiConfig.enableQuiz} onChange={e => setAiConfig({...aiConfig, enableQuiz: e.target.checked})} className="w-4 h-4 text-purple-600"/>
                        <span className="text-sm">تفعيل منشئ الاختبارات</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={aiConfig.enablePlanning} onChange={e => setAiConfig({...aiConfig, enablePlanning: e.target.checked})} className="w-4 h-4 text-purple-600"/>
                        <span className="text-sm">تفعيل تحضير الدروس والخطط</span>
                    </label>
                </div>

                <button onClick={handleSaveAI} className="w-full py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700 flex justify-center items-center gap-2">
                    <Save size={16}/> حفظ إعدادات AI
                </button>
            </div>
        </div>
    );
};

// ==========================================
// 5. DATABASE SETTINGS
// ==========================================
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
        alert('تم نسخ كود إنشاء الجداول (Schema) إلى الحافظة!');
    };

    const handleCopyUpdateSQL = () => {
        const sql = getDatabaseUpdateSQL();
        navigator.clipboard.writeText(sql);
        alert('تم نسخ كود التحديثات (Updates) إلى الحافظة!');
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

    const handleCloudBackup = async () => {
        setCloudLoading(true);
        try {
            const json = await backupCloudDatabase();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cloud_backup_${new Date().toISOString()}.json`;
            a.click();
        } catch(e:any) {
            alert(e.message);
        } finally {
            setCloudLoading(false);
        }
    };

    const handleCloudRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if(!file) return;
        if(!confirm('تحذير: سيتم استعادة البيانات إلى السحابة ودمجها. تأكد من الملف.')) return;

        setCloudLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = event.target?.result as string;
                await restoreCloudDatabase(json);
                alert('تمت استعادة النسخة السحابية بنجاح!');
            } catch(e:any) {
                alert(e.message);
            } finally {
                setCloudLoading(false);
            }
        };
        reader.readAsText(file);
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
                    
                    {/* SQL Update Section */}
                    <div className="bg-teal-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-teal-400"></div>
                        <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><GitMerge size={20} className="text-teal-400"/> تحديثات القاعدة (Curriculum & Exams)</h4>
                        <p className="text-teal-100 text-sm mb-4">
                            هام: إذا أضفت ميزات جديدة (توزيع المنهج، بنك الأسئلة، الخطط) مؤخراً، يجب تشغيل هذا الكود لإنشاء الجداول الجديدة في قاعدة البيانات.
                        </p>
                        
                        <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-teal-300 overflow-x-auto h-32 mb-4 relative border border-teal-800">
                            <pre>{getDatabaseUpdateSQL()}</pre>
                        </div>
                        <button onClick={handleCopyUpdateSQL} className="bg-white text-teal-900 px-4 py-2 rounded font-bold text-sm hover:bg-teal-50 flex items-center gap-2 transition-colors">
                            <Copy size={16}/> نسخ كود التحديث
                        </button>
                    </div>

                    {/* SQL Generator */}
                    <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
                        <h4 className="font-bold text-lg mb-2 flex items-center gap-2"><Code size={20} className="text-yellow-400"/> إعداد قاعدة البيانات بالكامل (Full Schema)</h4>
                        <p className="text-gray-400 text-sm mb-4">
                            استخدم هذا الكود عند إعداد قاعدة بيانات <b>جديدة وفارغة</b> لأول مرة.
                            <br/>
                            <span className="text-yellow-300 font-bold">* تنبيه: لا يمكن تنفيذ أوامر "إنشاء الجداول" مباشرة من هنا لأسباب أمنية. انسخ الكود ونفذه في لوحة تحكم Supabase.</span>
                        </p>
                        
                        <div className="bg-black/50 p-4 rounded-lg font-mono text-xs text-green-400 overflow-x-auto h-32 mb-4 relative border border-gray-700">
                            <pre>{getDatabaseSchemaSQL()}</pre>
                        </div>
                        <button onClick={handleCopySQL} className="bg-white text-gray-900 px-4 py-2 rounded font-bold text-sm hover:bg-gray-200 flex items-center gap-2">
                            <Copy size={16}/> نسخ الكود الكامل
                        </button>
                    </div>

                    {/* Cloud Backup/Restore */}
                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                        <h4 className="font-bold text-indigo-800 mb-4 flex items-center gap-2"><CloudLightning size={18}/> النسخ الاحتياطي السحابي</h4>
                        <p className="text-xs text-indigo-600 mb-4">تحميل نسخة كاملة من بيانات السحابة (JSON) أو استعادتها.</p>
                        <div className="flex gap-4">
                            <button 
                                onClick={handleCloudBackup} 
                                disabled={cloudLoading}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                            >
                                <Download size={18}/> {cloudLoading ? 'جاري التحميل...' : 'تحميل نسخة سحابية'}
                            </button>
                            <label className="bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg font-bold hover:bg-indigo-50 flex items-center gap-2 cursor-pointer">
                                <Upload size={18}/> استعادة نسخة سحابية
                                <input type="file" className="hidden" accept=".json" onChange={handleCloudRestore} disabled={cloudLoading} />
                            </label>
                        </div>
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
                            <FileJson size={18}/> تحميل نسخة محلية
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

// ==========================================
// 6. MAIN ADMIN DASHBOARD WRAPPER
// ==========================================
const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState<'SCHOOLS' | 'USERS' | 'SUBSCRIPTIONS' | 'AI' | 'DATABASE'>('SCHOOLS');

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 overflow-hidden">
            <div className="mb-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Shield size={24} className="text-gray-900"/> لوحة تحكم النظام (Super Admin)
                </h1>
                <div className="flex bg-white p-1 rounded-lg border shadow-sm overflow-x-auto">
                    <button onClick={() => setActiveTab('SCHOOLS')} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap ${activeTab === 'SCHOOLS' ? 'bg-blue-50 text-blue-700' : 'text-gray-500'}`}>المدارس</button>
                    <button onClick={() => setActiveTab('USERS')} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap ${activeTab === 'USERS' ? 'bg-purple-50 text-purple-700' : 'text-gray-500'}`}>المستخدمين</button>
                    <button onClick={() => setActiveTab('SUBSCRIPTIONS')} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap ${activeTab === 'SUBSCRIPTIONS' ? 'bg-green-50 text-green-700' : 'text-gray-500'}`}>الاشتراكات</button>
                    <button onClick={() => setActiveTab('AI')} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap ${activeTab === 'AI' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500'}`}>AI</button>
                    <button onClick={() => setActiveTab('DATABASE')} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap ${activeTab === 'DATABASE' ? 'bg-red-50 text-red-700' : 'text-gray-500'}`}>قاعدة البيانات</button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'SCHOOLS' && <SchoolsManager />}
                {activeTab === 'USERS' && <UsersManager />}
                {activeTab === 'SUBSCRIPTIONS' && <SubscriptionsManager />}
                {activeTab === 'AI' && <AISettingsView />}
                {activeTab === 'DATABASE' && <DatabaseSettings />}
            </div>
        </div>
    );
};

export default AdminDashboard;
