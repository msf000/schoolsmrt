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
    getTeachers, updateTeacher,
    validateCloudSchema,
    getStudents, getAttendance,
    getSubjects, addSubject, deleteSubject,
    getAcademicTerms, saveAcademicTerm, deleteAcademicTerm, setCurrentTerm,
    getReportHeaderConfig, saveReportHeaderConfig,
    getUserTheme, saveUserTheme
} from '../services/storageService';
import { updateSupabaseConfig } from '../services/supabaseClient';
import { checkAIConnection } from '../services/geminiService';
import { 
    School, SystemUser, AISettings, Teacher, Student, AttendanceRecord, AttendanceStatus, UserTheme,
    Subject, AcademicTerm, ReportHeaderConfig, TermPeriod
} from '../types';
import { 
    Shield, Building, Users, CreditCard, Settings, Database, 
    Trash2, Download, Upload, AlertTriangle, RefreshCw, Check, Copy, 
    CloudLightning, Save, Wifi, WifiOff, Eye, Search, Plus, X, Edit, 
    Key, GitMerge, CheckCircle, XCircle, BrainCircuit, Code, Server, FileJson, Crown, Star,
    Zap, ZapOff, AlertCircle, Activity, BarChart3, PieChart, TrendingUp,
    LayoutGrid, BookOpen, CalendarDays, Building2, ChevronDown, ChevronRight, ListTree, FileText, Sparkles, PenTool, User
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RePieChart, Pie, Legend, AreaChart, Area } from 'recharts';

interface SchoolManagementProps {
    students: any[]; 
    onImportStudents: any;
    onImportPerformance: any;
    onImportAttendance: any;
    currentUser?: SystemUser | null;
    onUpdateTheme?: (theme: UserTheme) => void;
}

// --- NEW: Admin Overview Component ---
const AdminOverview = () => {
    const [stats, setStats] = useState({
        schools: 0,
        teachers: 0,
        students: 0,
        users: 0,
        attendanceToday: 0
    });
    
    const [gradeDistribution, setGradeDistribution] = useState<{name: string, value: number}[]>([]);
    const [subscriptionStats, setSubscriptionStats] = useState<{name: string, value: number, fill: string}[]>([]);
    const [attendanceTrend, setAttendanceTrend] = useState<{date: string, rate: number}[]>([]);

    useEffect(() => {
        const schools = getSchools();
        const teachers = getTeachers();
        const students = getStudents();
        const users = getSystemUsers();
        const attendance = getAttendance();

        // 1. Basic Counts
        const today = new Date().toISOString().split('T')[0];
        const todaysAttendance = attendance.filter(a => a.date === today);
        const presentCount = todaysAttendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
        const attendanceRate = todaysAttendance.length > 0 ? Math.round((presentCount / todaysAttendance.length) * 100) : 0;

        setStats({
            schools: schools.length,
            teachers: teachers.length,
            students: students.length,
            users: users.length,
            attendanceToday: attendanceRate
        });

        // 2. Grade Distribution
        const grades: Record<string, number> = {};
        students.forEach(s => {
            const g = s.gradeLevel || 'غير محدد';
            grades[g] = (grades[g] || 0) + 1;
        });
        const gradeData = Object.keys(grades)
            .map(k => ({ name: k, value: grades[k] }))
            .sort((a,b) => b.value - a.value)
            .slice(0, 7); 
        setGradeDistribution(gradeData);

        // 3. Subscription Stats
        const subs = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
        teachers.forEach(t => {
            const s = t.subscriptionStatus || 'FREE';
            if (subs[s as keyof typeof subs] !== undefined) subs[s as keyof typeof subs]++;
        });
        setSubscriptionStats([
            { name: 'مجاني', value: subs.FREE, fill: '#94a3b8' },
            { name: 'محترف (Pro)', value: subs.PRO, fill: '#4f46e5' },
            { name: 'مؤسسات', value: subs.ENTERPRISE, fill: '#7c3aed' }
        ]);

        // 4. Attendance Trend (Last 7 Days)
        const trend = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            const dayRecords = attendance.filter(a => a.date === dateStr);
            const present = dayRecords.filter(a => a.status === AttendanceStatus.PRESENT).length;
            const rate = dayRecords.length > 0 ? Math.round((present / dayRecords.length) * 100) : 0;
            
            trend.push({ date: dateStr.slice(5), rate }); // "MM-DD"
        }
        setAttendanceTrend(trend);

    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold mb-1">إجمالي المدارس</p>
                        <h3 className="text-3xl font-black text-gray-800">{stats.schools}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Building size={24}/></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold mb-1">المعلمون المسجلون</p>
                        <h3 className="text-3xl font-black text-gray-800">{stats.teachers}</h3>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full"><Users size={24}/></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold mb-1">الطلاب في النظام</p>
                        <h3 className="text-3xl font-black text-gray-800">{stats.students}</h3>
                    </div>
                    <div className="p-3 bg-green-50 text-green-600 rounded-full"><CheckCircle size={24}/></div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-xs font-bold mb-1">حضور النظام (اليوم)</p>
                        <h3 className="text-3xl font-black text-purple-600">{stats.attendanceToday}%</h3>
                    </div>
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-full"><Activity size={24}/></div>
                </div>
            </div>

            {/* Attendance Trend Chart (New) */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <TrendingUp size={18} className="text-green-500"/> اتجاه الحضور (آخر 7 أيام)
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={attendanceTrend}>
                            <defs>
                                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" tick={{fontSize: 12}} />
                            <YAxis domain={[0, 100]} />
                            <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Area type="monotone" dataKey="rate" stroke="#10b981" fillOpacity={1} fill="url(#colorRate)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Grade Distribution Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <BarChart3 size={18} className="text-blue-500"/> توزيع الطلاب حسب المراحل
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={gradeDistribution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
                                <YAxis allowDecimals={false} />
                                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Subscriptions Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <PieChart size={18} className="text-indigo-500"/> توزيع اشتراكات المعلمين
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={subscriptionStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {subscriptionStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

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

const AISettingsView = () => {
    const [aiConfig, setAiConfig] = useState<AISettings>({ modelId: 'gemini-2.5-flash', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' });
    const [connectionStatus, setConnectionStatus] = useState<{status: 'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR', msg: string}>({status: 'IDLE', msg: ''});

    useEffect(() => {
        setAiConfig(getAISettings());
    }, []);

    const handleSaveAI = () => {
        saveAISettings(aiConfig);
        alert('تم حفظ إعدادات الذكاء الاصطناعي.');
    };

    const handleTestConnection = async () => {
        setConnectionStatus({ status: 'TESTING', msg: 'جاري فحص الاتصال...' });
        const res = await checkAIConnection();
        if (res.success) {
            setConnectionStatus({ status: 'SUCCESS', msg: res.message });
        } else {
            setConnectionStatus({ status: 'ERROR', msg: res.message });
        }
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

            {/* Connection Test Section */}
            <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${connectionStatus.status === 'SUCCESS' ? 'bg-green-100 text-green-600' : connectionStatus.status === 'ERROR' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                        {connectionStatus.status === 'SUCCESS' ? <Zap size={20}/> : connectionStatus.status === 'ERROR' ? <ZapOff size={20}/> : <BrainCircuit size={20}/>}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800">فحص الاتصال (API Check)</h4>
                        <p className={`text-xs ${connectionStatus.status === 'SUCCESS' ? 'text-green-600 font-bold' : connectionStatus.status === 'ERROR' ? 'text-red-600' : 'text-gray-500'}`}>
                            {connectionStatus.msg || 'لم يتم الفحص بعد'}
                        </p>
                    </div>
                </div>
                <button 
                    onClick={handleTestConnection} 
                    disabled={connectionStatus.status === 'TESTING'}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                    {connectionStatus.status === 'TESTING' ? 'جاري الفحص...' : 'فحص الاتصال'}
                </button>
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

const DatabaseSettings = () => {
    const [dbTab, setDbTab] = useState<'CONFIG' | 'CLOUD' | 'MAINTENANCE'>('CONFIG');
    const [connectionStatus, setConnectionStatus] = useState<'CHECKING' | 'CONNECTED' | 'ERROR' | 'IDLE'>('IDLE');
    const [latency, setLatency] = useState(0);
    const [missingTables, setMissingTables] = useState<string[]>([]);
    
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
            // After connection, check schema validity
            const validation = await validateCloudSchema();
            setMissingTables(validation.missingTables);
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

    const handleResetConfig = () => {
        if(confirm('سيتم حذف إعدادات Supabase والعودة للافتراضي. متابعة؟')) {
            localStorage.removeItem('custom_supabase_url');
            localStorage.removeItem('custom_supabase_key');
            window.location.reload();
        }
    }

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
                        <div className="flex gap-2">
                            {connectionStatus === 'ERROR' && (
                                <button onClick={handleResetConfig} className="text-sm font-bold text-red-600 hover:bg-red-50 px-3 py-1 rounded">إعادة ضبط</button>
                            )}
                            <button onClick={handleCheckConnection} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"><RefreshCw size={14}/> فحص</button>
                        </div>
                    </div>

                    {/* --- NEW: Missing Tables Warning --- */}
                    {missingTables.length > 0 && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-md animate-pulse">
                            <div className="flex items-start gap-3">
                                <AlertCircle size={24} className="text-red-500 mt-1"/>
                                <div className="flex-1">
                                    <h4 className="font-bold text-red-800 text-lg mb-1">تنبيه: قاعدة البيانات غير مكتملة!</h4>
                                    <p className="text-sm text-red-700 mb-2">تم اكتشاف أن الجداول التالية مفقودة في Supabase: <b>{missingTables.join(', ')}</b>.</p>
                                    <p className="text-xs text-red-600 mb-4">هذا سيسبب أخطاء في المزامنة (42P01). يرجى نسخ كود الإنشاء أدناه وتشغيله في SQL Editor في Supabase.</p>
                                    
                                    <div className="bg-white border border-red-200 rounded p-2 mb-3 max-h-32 overflow-y-auto">
                                        <pre className="text-[10px] font-mono text-gray-700">{getDatabaseSchemaSQL()}</pre>
                                    </div>
                                    <button onClick={handleCopySQL} className="bg-red-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-red-700 flex items-center gap-2 w-fit">
                                        <Copy size={16}/> نسخ الكود الكامل للإصلاح
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

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

export const SchoolManagement: React.FC<SchoolManagementProps> = ({ currentUser, students, onUpdateTheme }) => {
  const isSchoolManager = currentUser?.role === 'SCHOOL_MANAGER';
  const isManager = isSchoolManager || currentUser?.role === 'SUPER_ADMIN';
  
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TEACHERS' | 'SUBJECTS' | 'CALENDAR' | 'SETTINGS'>(() => {
      return localStorage.getItem('school_mgmt_active_tab') as any || 'DASHBOARD';
  });

  useEffect(() => {
      localStorage.setItem('school_mgmt_active_tab', activeTab);
  }, [activeTab]);
  
  // --- Data States ---
  const [mySchool, setMySchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicTerms, setAcademicTerms] = useState<AcademicTerm[]>([]);
  const [reportConfig, setReportConfig] = useState<ReportHeaderConfig>({
      schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '', signatureBase64: ''
  });
  const [userTheme, setUserTheme] = useState<UserTheme>({ mode: 'LIGHT', backgroundStyle: 'FLAT' });

  // UI States
  const [newSubject, setNewSubject] = useState('');
  
  // Term/Period Modal States
  const [newTermName, setNewTermName] = useState('');
  const [newTermStart, setNewTermStart] = useState('');
  const [newTermEnd, setNewTermEnd] = useState('');

  const [expandedTermId, setExpandedTermId] = useState<string | null>(null);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('');
  const [newPeriodEnd, setNewPeriodEnd] = useState('');
  
  const [teacherProfile, setTeacherProfile] = useState<Teacher | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
      if (currentUser) {
          setSubjects(getSubjects(currentUser.id));
          setReportConfig(getReportHeaderConfig(currentUser.id));
          setAcademicTerms(getAcademicTerms(currentUser.id));
      }
      setUserTheme(getUserTheme());
      const allTeachers = getTeachers();
      setTeachers(allTeachers);
      
      if (isManager) {
          const allSchools = getSchools();
          let school = allSchools.find(s => s.managerNationalId === currentUser?.nationalId || s.managerName === currentUser?.name);
          if (!school && currentUser?.role === 'SUPER_ADMIN' && allSchools.length > 0) school = allSchools[0];
          setMySchool(school || null);
      } else {
          let me: Teacher | undefined;
          if (currentUser?.id) me = allTeachers.find(t => t.id === currentUser.id);
          if (!me) me = allTeachers.find(t => (currentUser?.nationalId && t.nationalId === currentUser.nationalId) || (currentUser?.email && t.email === currentUser.email));
          if (me) {
              setTeacherProfile(me);
              if (me.schoolId) {
                  const schools = getSchools();
                  const school = schools.find(s => s.id === me.schoolId);
                  setMySchool(school || null);
              } else { setMySchool(null); }
          }
      }
  }, [currentUser, isManager, activeTab]); 

  // Helpers
  const handleAddSubject = () => { 
      if (newSubject.trim() && currentUser) { 
          addSubject({ id: Date.now().toString(), name: newSubject.trim(), teacherId: currentUser.id }); 
          setSubjects(getSubjects(currentUser.id)); 
          setNewSubject(''); 
      } 
  };
  
  const handleDeleteSubject = (id: string) => { 
      if (confirm('حذف المادة؟') && currentUser) { 
          deleteSubject(id); 
          setSubjects(getSubjects(currentUser.id)); 
      } 
  };
  
  // Terms Handlers
  const handleAddTerm = () => { 
      if (!newTermName || !newTermStart || !newTermEnd || !currentUser) return alert('بيانات ناقصة'); 
      const term: AcademicTerm = { 
          id: Date.now().toString(), 
          name: newTermName, 
          startDate: newTermStart, 
          endDate: newTermEnd, 
          isCurrent: academicTerms.length === 0, 
          teacherId: currentUser.id, 
          periods: [] 
      }; 
      saveAcademicTerm(term); 
      setAcademicTerms(getAcademicTerms(currentUser.id)); 
      setNewTermName(''); setNewTermStart(''); setNewTermEnd(''); 
  };

  const handleDeleteTerm = (id: string) => { 
      if (confirm('حذف الفصل الدراسي؟')) { 
          deleteAcademicTerm(id); 
          setAcademicTerms(getAcademicTerms(currentUser?.id)); 
      } 
  };

  const handleSetCurrentTerm = (id: string) => { 
      if (currentUser) { 
          setCurrentTerm(id, currentUser.id); 
          setAcademicTerms(getAcademicTerms(currentUser.id)); 
      } 
  };

  const handleAddPeriod = (term: AcademicTerm) => { 
      if (!newPeriodName || !newPeriodStart || !newPeriodEnd) return alert('بيانات ناقصة'); 
      const period: TermPeriod = { 
          id: Date.now().toString() + '_p', 
          name: newPeriodName, 
          startDate: newPeriodStart, 
          endDate: newPeriodEnd 
      }; 
      const updatedTerm = { ...term, periods: [...(term.periods || []), period] }; 
      saveAcademicTerm(updatedTerm); 
      setAcademicTerms(getAcademicTerms(currentUser?.id)); 
      setNewPeriodName(''); setNewPeriodStart(''); setNewPeriodEnd(''); 
  };

  const handleDeletePeriod = (term: AcademicTerm, periodId: string) => { 
      if(confirm('حذف الفترة؟')) { 
          const updatedPeriods = term.periods?.filter(p => p.id !== periodId) || []; 
          saveAcademicTerm({ ...term, periods: updatedPeriods }); 
          setAcademicTerms(getAcademicTerms(currentUser?.id)); 
      } 
  };

  // Settings Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; 
      if (file) { 
          const reader = new FileReader(); 
          reader.onloadend = () => { setReportConfig(prev => ({ ...prev, logoBase64: reader.result as string })); }; 
          reader.readAsDataURL(file); 
      } 
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => { 
      const file = e.target.files?.[0]; 
      if (file) { 
          const reader = new FileReader(); 
          reader.onloadend = () => { setReportConfig(prev => ({ ...prev, signatureBase64: reader.result as string })); }; 
          reader.readAsDataURL(file); 
      } 
  };

  const handleAutoFillHeader = () => { 
      const newConfig = { ...reportConfig }; 
      if (!newConfig.logoBase64) { newConfig.logoBase64 = "https://upload.wikimedia.org/wikipedia/ar/9/98/MoE_Logo.svg"; } 
      if (currentUser) { 
          const tName = teacherProfile?.name || currentUser.name; 
          if (tName) newConfig.teacherName = tName; 
          if (mySchool) { 
              newConfig.schoolName = mySchool.name; 
              newConfig.schoolManager = mySchool.managerName; 
              if (mySchool.educationAdministration) newConfig.educationAdmin = mySchool.educationAdministration; 
          } 
      } 
      if (!newConfig.academicYear) newConfig.academicYear = '1447هـ'; 
      if (!newConfig.term) newConfig.term = 'الفصل الدراسي الأول'; 
      setReportConfig(newConfig); 
      alert('تم التعبئة التلقائية.'); 
  };

  const handleSaveSettings = () => { 
      if (currentUser) { 
          const configWithId = { ...reportConfig, teacherId: currentUser.id }; 
          saveReportHeaderConfig(configWithId); 
          saveUserTheme(userTheme); 
          if(onUpdateTheme) onUpdateTheme(userTheme); 
          alert('تم الحفظ بنجاح'); 
      } 
  };

  const handleTeacherSaveProfile = async () => { 
      if (!teacherProfile) return; 
      setIsSavingProfile(true); 
      try { 
          await updateTeacher(teacherProfile); 
          alert('تم الحفظ'); 
      } catch (e) { 
          alert('خطأ'); 
      } finally { 
          setIsSavingProfile(false); 
      } 
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50 overflow-hidden">
        {/* Tabs */}
        <div className="mb-6 flex overflow-x-auto gap-4 border-b border-gray-200 pb-2 bg-white p-2 rounded-xl shadow-sm">
            <button onClick={() => setActiveTab('DASHBOARD')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'DASHBOARD' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><LayoutGrid size={16} className="inline mr-2"/> لوحة التحكم</button>
            {isManager && <button onClick={() => setActiveTab('TEACHERS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'TEACHERS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><Users size={16} className="inline mr-2"/> المعلمين</button>}
            <button onClick={() => setActiveTab('SUBJECTS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'SUBJECTS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><BookOpen size={16} className="inline mr-2"/> {isManager ? 'قائمة المواد' : 'موادي وفصولي'}</button>
            <button onClick={() => setActiveTab('CALENDAR')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'CALENDAR' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><CalendarDays size={16} className="inline mr-2"/> التقويم الدراسي</button>
            <button onClick={() => setActiveTab('SETTINGS')} className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${activeTab === 'SETTINGS' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}><Settings size={16} className="inline mr-2"/> {isManager ? 'إعدادات المدرسة' : 'الإعدادات الشخصية'}</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* DASHBOARD TAB */}
            {activeTab === 'DASHBOARD' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-xs font-bold mb-1">الطلاب</p>
                            <h3 className="text-3xl font-black text-gray-800">{students.length}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Users size={24}/></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-xs font-bold mb-1">المواد الدراسية</p>
                            <h3 className="text-3xl font-black text-gray-800">{subjects.length}</h3>
                        </div>
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-full"><BookOpen size={24}/></div>
                    </div>
                    {mySchool && (
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                            <div>
                                <p className="text-gray-500 text-xs font-bold mb-1">المدرسة</p>
                                <h3 className="text-lg font-bold text-gray-800 line-clamp-1">{mySchool.name}</h3>
                                <p className="text-xs text-gray-400">كود: {mySchool.ministryCode}</p>
                            </div>
                            <div className="p-3 bg-green-50 text-green-600 rounded-full"><Building2 size={24}/></div>
                        </div>
                    )}
                </div>
            )}

            {/* TEACHERS TAB */}
            {activeTab === 'TEACHERS' && isManager && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-gray-50 text-gray-700 font-bold border-b">
                            <tr>
                                <th className="p-4">الاسم</th>
                                <th className="p-4">التخصص</th>
                                <th className="p-4">البريد</th>
                                <th className="p-4 text-center">الاشتراك</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {teachers.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="p-4 font-bold text-gray-800">{t.name}</td>
                                    <td className="p-4 text-gray-600">{t.subjectSpecialty}</td>
                                    <td className="p-4 text-gray-600 font-mono text-xs">{t.email}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.subscriptionStatus === 'PRO' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {t.subscriptionStatus || 'FREE'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SUBJECTS TAB */}
            {activeTab === 'SUBJECTS' && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-4xl mx-auto">
                    <div className="flex gap-2 mb-6">
                        <input className="flex-1 p-2 border rounded-lg" placeholder="اسم المادة الجديدة..." value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                        <button onClick={handleAddSubject} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700">إضافة</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {subjects.map(s => (
                            <div key={s.id} className="p-3 bg-gray-50 border rounded-lg flex justify-between items-center group hover:border-indigo-200 transition-colors">
                                <span className="font-bold text-gray-700">{s.name}</span>
                                <button onClick={() => handleDeleteSubject(s.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CALENDAR TAB */}
            {activeTab === 'CALENDAR' && (
                <div className="space-y-6">
                    {/* Add Term */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1">اسم الفصل الدراسي</label>
                            <input className="w-full p-2 border rounded text-sm" placeholder="الفصل الدراسي الأول 1446" value={newTermName} onChange={e => setNewTermName(e.target.value)}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">البداية</label>
                            <input type="date" className="w-full p-2 border rounded text-sm" value={newTermStart} onChange={e => setNewTermStart(e.target.value)}/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">النهاية</label>
                            <input type="date" className="w-full p-2 border rounded text-sm" value={newTermEnd} onChange={e => setNewTermEnd(e.target.value)}/>
                        </div>
                        <button onClick={handleAddTerm} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-purple-700 flex items-center gap-2">
                            <Plus size={16}/> إضافة فصل
                        </button>
                    </div>

                    {/* Terms List */}
                    <div className="space-y-4">
                        {academicTerms.map(term => (
                            <div key={term.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${term.isCurrent ? 'border-green-400 shadow-md ring-1 ring-green-100' : 'border-gray-200'}`}>
                                <div className="p-4 flex justify-between items-center bg-gray-50 cursor-pointer" onClick={() => setExpandedTermId(expandedTermId === term.id ? null : term.id)}>
                                    <div className="flex items-center gap-3">
                                        <button onClick={(e) => {e.stopPropagation(); handleSetCurrentTerm(term.id)}} className={`w-5 h-5 rounded-full border flex items-center justify-center ${term.isCurrent ? 'bg-green-500 border-green-600 text-white' : 'bg-white border-gray-300 hover:border-green-400'}`}>
                                            {term.isCurrent && <CheckCircle size={12}/>}
                                        </button>
                                        <div>
                                            <h4 className="font-bold text-gray-800">{term.name}</h4>
                                            <p className="text-xs text-gray-500">{term.startDate} - {term.endDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {expandedTermId === term.id ? <ChevronDown size={18} className="text-gray-400"/> : <ChevronRight size={18} className="text-gray-400"/>}
                                        <button onClick={(e) => {e.stopPropagation(); handleDeleteTerm(term.id)}} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                
                                {expandedTermId === term.id && (
                                    <div className="p-4 border-t bg-white animate-slide-up">
                                        <h5 className="font-bold text-xs text-gray-500 mb-3 flex items-center gap-1"><ListTree size={14}/> الفترات (Periods)</h5>
                                        <div className="space-y-2 mb-4">
                                            {/* SORTED PERIODS FOR DISPLAY: Chronologically or Name based */}
                                            {term.periods?.sort((a,b) => {
                                                if (a.startDate && b.startDate && a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
                                                return a.name.localeCompare(b.name, 'ar');
                                            }).map(p => (
                                                <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 text-sm">
                                                    <span className="font-medium text-gray-700">{p.name} ({p.startDate} - {p.endDate})</span>
                                                    <button onClick={() => handleDeletePeriod(term, p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                                </div>
                                            ))}
                                            {!term.periods?.length && <p className="text-xs text-gray-400 italic">لا توجد فترات مضافة.</p>}
                                        </div>
                                        
                                        <div className="flex gap-2 items-end border-t pt-3">
                                            <div className="flex-1">
                                                <input className="w-full p-1.5 border rounded text-xs" placeholder="اسم الفترة (الأولى...)" value={newPeriodName} onChange={e => setNewPeriodName(e.target.value)}/>
                                            </div>
                                            <div>
                                                <input type="date" className="w-full p-1.5 border rounded text-xs" value={newPeriodStart} onChange={e => setNewPeriodStart(e.target.value)}/>
                                            </div>
                                            <div>
                                                <input type="date" className="w-full p-1.5 border rounded text-xs" value={newPeriodEnd} onChange={e => setNewPeriodEnd(e.target.value)}/>
                                            </div>
                                            <button onClick={() => handleAddPeriod(term)} className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-100 border border-indigo-200">
                                                إضافة فترة
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'SETTINGS' && (
                <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b pb-2 text-gray-800">
                            <FileText className="text-indigo-600"/> إعدادات الترويسة والتقارير
                        </h3>
                        
                        <button 
                            onClick={handleAutoFillHeader}
                            className="mb-6 w-full py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
                        >
                            <Sparkles size={18}/> تعبئة تلقائية (بياناتي + الشعار الرسمي)
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">اسم المدرسة</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.schoolName} onChange={e => setReportConfig({...reportConfig, schoolName: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">إدارة التعليم</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.educationAdmin} onChange={e => setReportConfig({...reportConfig, educationAdmin: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">اسم المعلم</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.teacherName} onChange={e => setReportConfig({...reportConfig, teacherName: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">مدير المدرسة</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.schoolManager} onChange={e => setReportConfig({...reportConfig, schoolManager: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">العام الدراسي</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.academicYear} onChange={e => setReportConfig({...reportConfig, academicYear: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-gray-700 mb-1">الفصل الدراسي</label><input className="w-full p-2 border rounded bg-gray-50 focus:bg-white" value={reportConfig.term} onChange={e => setReportConfig({...reportConfig, term: e.target.value})} /></div>
                        </div>

                        <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">شعار المدرسة</label>
                                <div className="flex items-center gap-4">
                                    {reportConfig.logoBase64 && <img src={reportConfig.logoBase64} alt="Logo" className="h-16 w-16 object-contain border rounded p-1 bg-white" />}
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm text-gray-500 w-full" />
                                </div>
                            </div>
                            
                            {/* Signature Upload */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1"><PenTool size={14}/> التوقيع الرقمي (للاعتماد)</label>
                                <div className="flex items-center gap-4">
                                    {reportConfig.signatureBase64 ? (
                                        <div className="relative group">
                                            <img src={reportConfig.signatureBase64} alt="Signature" className="h-12 object-contain border border-dashed rounded p-1 bg-white" />
                                            <button onClick={() => setReportConfig({...reportConfig, signatureBase64: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={10}/></button>
                                        </div>
                                    ) : <div className="h-12 w-20 border border-dashed rounded flex items-center justify-center text-xs text-gray-400">لا يوجد</div>}
                                    <input type="file" accept="image/*" onChange={handleSignatureUpload} className="text-sm text-gray-500 w-full" />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">سيظهر هذا التوقيع تلقائياً في الشهادات والتقارير.</p>
                            </div>
                        </div>
                    </div>

                    {/* Teacher Profile Section */}
                    {!isManager && teacherProfile && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 border-b pb-2 text-gray-800">
                                <User className="text-indigo-600"/> البيانات الشخصية
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">الاسم</label><input className="w-full p-2 border rounded bg-gray-50" value={teacherProfile.name} onChange={e => setTeacherProfile({...teacherProfile, name: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">رقم الهوية</label><input className="w-full p-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed" value={teacherProfile.nationalId} readOnly /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">رقم الجوال</label><input className="w-full p-2 border rounded bg-gray-50" value={teacherProfile.phone || ''} onChange={e => setTeacherProfile({...teacherProfile, phone: e.target.value})} /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1">التخصص</label><input className="w-full p-2 border rounded bg-gray-50" value={teacherProfile.subjectSpecialty || ''} onChange={e => setTeacherProfile({...teacherProfile, subjectSpecialty: e.target.value})} /></div>
                            </div>
                            <button onClick={handleTeacherSaveProfile} disabled={isSavingProfile} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">
                                {isSavingProfile ? 'جاري الحفظ...' : 'حفظ البيانات'}
                            </button>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button onClick={handleSaveSettings} className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg flex items-center gap-2">
                            <Save size={20}/> حفظ الإعدادات
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchoolManagement;