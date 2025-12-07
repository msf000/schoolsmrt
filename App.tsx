
import React, { useState, useEffect } from 'react';
import { 
    Student, AttendanceRecord, PerformanceRecord, SystemUser, UserTheme 
} from './types';
import { 
    getStudents, getAttendance, getPerformance, 
    addStudent, updateStudent, deleteStudent, 
    saveAttendance, addPerformance, deletePerformance, 
    bulkAddStudents, bulkAddPerformance, bulkAddAttendance, 
    initAutoSync, getWorksMasterUrl, getUserTheme, 
    getTeacherAssignments, bulkUpsertStudents,
    setSystemMode, subscribeToSyncStatus, subscribeToDataChanges, SyncStatus
} from './services/storageService';

import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import AttendanceComponent from './components/Attendance';
import PerformanceView from './components/Performance';
import WorksTracking from './components/WorksTracking';
import StudentFollowUp from './components/StudentFollowUp';
import AIReports from './components/AIReports';
import ClassroomScreen from './components/ClassroomScreen';
import ClassroomManager from './components/ClassroomManager';
import DataImport from './components/DataImport';
import SchoolManagement from './components/SchoolManagement';
import AdminDashboard from './components/AdminDashboard';
import CustomTablesView from './components/CustomTablesView';
import MessageCenter from './components/MessageCenter';
import AITools from './components/AITools';
import StudentPortal from './components/StudentPortal';
import TeacherSubscription from './components/TeacherSubscription';
import LessonPlanning from './components/LessonPlanning';
import MonthlyReport from './components/MonthlyReport';

import { Menu, X, LogOut, LayoutGrid, Users, CheckSquare, BarChart, Settings, BookOpen, BrainCircuit, MonitorPlay, FileSpreadsheet, Mail, CreditCard, PenTool, Printer, Cloud, CloudOff, RefreshCw, AlertCircle, UploadCloud } from 'lucide-react';

const App: React.FC = () => {
    // Auth State
    const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
        const saved = localStorage.getItem('current_user');
        return saved ? JSON.parse(saved) : null;
    });

    // Data State
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [theme, setTheme] = useState<UserTheme>({ mode: 'LIGHT', backgroundStyle: 'FLAT' });

    // UI State
    const [currentView, setCurrentView] = useState('DASHBOARD');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showClassroomScreen, setShowClassroomScreen] = useState(false);
    
    // Sync State
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');

    useEffect(() => {
        if (currentUser) {
            loadData();
            initAutoSync(); // Trigger auto sync on load
            
            // Listen for sync status changes
            const unsubSync = subscribeToSyncStatus((status) => setSyncStatus(status));
            // Listen for data changes (from other tabs or cloud sync)
            const unsubData = subscribeToDataChanges(() => loadData());

            return () => {
                unsubSync();
                unsubData();
            };
        }
    }, [currentUser]);

    const loadData = () => {
        let allStudents = getStudents();
        let allAttendance = getAttendance();
        let allPerformance = getPerformance();
        
        // --- DATA ISOLATION (Security) ---
        // If user is part of a school (and not Super Admin), filter data to show ONLY that school's records.
        if (currentUser && currentUser.role !== 'SUPER_ADMIN' && currentUser.schoolId) {
             // 1. Filter Students by School ID
             allStudents = allStudents.filter(s => s.schoolId === currentUser.schoolId);
             
             // 2. Filter records based on visible students (to ensure consistency)
             const visibleStudentIds = new Set(allStudents.map(s => s.id));
             allAttendance = allAttendance.filter(a => visibleStudentIds.has(a.studentId));
             allPerformance = allPerformance.filter(p => visibleStudentIds.has(p.studentId));
        }

        setStudents(allStudents);
        setAttendance(allAttendance);
        setPerformance(allPerformance);
        setTheme(getUserTheme());
    };

    const handleLoginSuccess = (user: any, remember: boolean) => {
        setCurrentUser(user);
        if (remember) localStorage.setItem('current_user', JSON.stringify(user));
        loadData();
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('current_user');
        setSystemMode(false); // Reset demo mode if active
        setShowClassroomScreen(false);
        setCurrentView('DASHBOARD');
    };

    const handleManualSync = () => {
        if (syncStatus === 'OFFLINE' || syncStatus === 'ERROR') {
            initAutoSync();
        }
    };

    // --- CRUD WRAPPERS ---
    const handleAddStudent = (s: Student) => { addStudent(s); loadData(); };
    const handleUpdateStudent = (s: Student) => { updateStudent(s); loadData(); };
    const handleDeleteStudent = (id: string) => { deleteStudent(id); loadData(); };
    const handleSaveAttendance = (recs: AttendanceRecord[]) => { saveAttendance(recs); loadData(); };
    const handleAddPerformance = (rec: PerformanceRecord) => { addPerformance(rec); loadData(); };
    const handleBulkAddPerformance = (recs: PerformanceRecord[]) => { bulkAddPerformance(recs); loadData(); };
    const handleDeletePerformance = (id: string) => { deletePerformance(id); loadData(); };
    
    const handleImportStudents = (data: Student[], key?: keyof Student, strategy?: any, fields?: any[]) => {
        // Enforce school ID on imported students
        const enrichedData = data.map(s => ({
            ...s,
            schoolId: currentUser?.schoolId || s.schoolId,
            createdById: currentUser?.id
        }));

        if (strategy === 'UPDATE' || strategy === 'SKIP') {
            bulkUpsertStudents(enrichedData, key || 'nationalId');
        } else {
            bulkAddStudents(enrichedData);
        }
        loadData();
    };

    const handleImportAttendance = (recs: AttendanceRecord[]) => { 
        const enrichedRecs = recs.map(r => ({ ...r, createdById: currentUser?.id }));
        bulkAddAttendance(enrichedRecs); 
        loadData(); 
    };

    // --- STUDENT PORTAL ---
    if (currentUser && currentUser.role === 'STUDENT') {
        return (
            <StudentPortal 
                currentUser={currentUser as any}
                attendance={attendance} 
                performance={performance} 
                onLogout={handleLogout} 
            />
        );
    }

    // --- LOGIN SCREEN ---
    if (!currentUser) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    // --- CLASSROOM SCREEN MODE ---
    if (showClassroomScreen) {
        return (
            <div className="relative w-screen h-screen">
                <button 
                    onClick={() => setShowClassroomScreen(false)} 
                    className="absolute top-4 right-4 z-50 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700"
                    title="إغلاق الشاشة"
                >
                    <X size={24}/>
                </button>
                <ClassroomScreen students={students} attendance={attendance} />
            </div>
        );
    }

    // --- MAIN APP ---
    const NavItem = ({ view, label, icon: Icon }: any) => (
        <button 
            onClick={() => { setCurrentView(view); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                currentView === view 
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' 
                    : 'text-gray-600 hover:bg-gray-50'
            }`}
        >
            <Icon size={20} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className={`flex h-screen overflow-hidden text-right font-sans ${theme.mode === 'DARK' ? 'dark' : ''}`} dir="rtl">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 right-0 w-64 bg-white border-l border-gray-200 shadow-xl z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <h1 className="font-black text-xl text-gray-800">نظام المدرس الذكي</h1>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500"><X/></button>
                </div>
                
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar h-[calc(100vh-140px)]">
                    <NavItem view="DASHBOARD" label="لوحة القيادة" icon={LayoutGrid} />
                    
                    {currentUser.role === 'SUPER_ADMIN' && <NavItem view="ADMIN_DASHBOARD" label="إدارة النظام" icon={Settings} />}
                    
                    {(currentUser.role === 'SCHOOL_MANAGER' || currentUser.role === 'TEACHER') && (
                        <>
                            <NavItem view="STUDENTS" label="الطلاب" icon={Users} />
                            <NavItem view="ATTENDANCE" label="الحضور والغياب" icon={CheckSquare} />
                            <NavItem view="CLASSROOM_MANAGEMENT" label="الإدارة الصفية" icon={MonitorPlay} />
                            <NavItem view="PERFORMANCE" label="رصد الدرجات" icon={BarChart} />
                            <NavItem view="WORKS_TRACKING" label="سجل المتابعة" icon={FileSpreadsheet} />
                            <NavItem view="STUDENT_FOLLOWUP" label="تقارير الطلاب" icon={BookOpen} />
                            <NavItem view="MONTHLY_REPORT" label="التقرير الشامل" icon={Printer} />
                            <NavItem view="MESSAGE_CENTER" label="مركز الرسائل" icon={Mail} />
                            <NavItem view="AI_TOOLS" label="أدوات المعلم AI" icon={BrainCircuit} />
                            <NavItem view="LESSON_PLANNING" label="التخطيط والإعداد" icon={PenTool} />
                            
                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <label className="px-4 text-xs font-bold text-gray-400">إضافات</label>
                                <NavItem view="AI_REPORTS" label="تحليل AI" icon={BrainCircuit} />
                                <NavItem view="CUSTOM_TABLES" label="جداول خاصة" icon={FileSpreadsheet} />
                                <NavItem view="SCHOOL_MANAGEMENT" label="الإعدادات" icon={Settings} />
                                <NavItem view="SUBSCRIPTION" label="الاشتراك" icon={CreditCard} />
                            </div>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t bg-gray-50">
                    {/* Sync Indicator Button */}
                    <button 
                        onClick={handleManualSync}
                        disabled={syncStatus === 'SYNCING' || syncStatus === 'ONLINE'}
                        className={`mb-3 w-full flex items-center justify-between text-xs px-3 py-2 rounded border transition-colors ${
                            syncStatus === 'ERROR' || syncStatus === 'OFFLINE' ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'
                        } ${
                            syncStatus === 'SYNCING' ? 'bg-blue-50 border-blue-200' :
                            syncStatus === 'ONLINE' ? 'bg-green-50 border-green-200' :
                            syncStatus === 'ERROR' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                        }`}
                        title={syncStatus === 'ERROR' || syncStatus === 'OFFLINE' ? 'اضغط لإعادة المحاولة' : ''}
                    >
                        <span className="text-gray-500 font-bold">حالة المزامنة:</span>
                        <div className="flex items-center gap-1">
                            {syncStatus === 'SYNCING' && <RefreshCw size={14} className="text-blue-500 animate-spin"/>}
                            {syncStatus === 'ONLINE' && <Cloud size={14} className="text-green-500"/>}
                            {syncStatus === 'OFFLINE' && <CloudOff size={14} className="text-gray-400"/>}
                            {syncStatus === 'ERROR' && <AlertCircle size={14} className="text-red-500"/>}
                            
                            <span className={`font-bold ${
                                syncStatus === 'SYNCING' ? 'text-blue-600' :
                                syncStatus === 'ONLINE' ? 'text-green-600' :
                                syncStatus === 'ERROR' ? 'text-red-600' : 'text-gray-500'
                            }`}>
                                {syncStatus === 'SYNCING' ? 'جاري التحديث...' :
                                 syncStatus === 'ONLINE' ? 'متصل' :
                                 syncStatus === 'ERROR' ? 'خطأ (اضغط)' : 'غير متصل'}
                            </span>
                        </div>
                    </button>

                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {currentUser.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{currentUser.name}</p>
                            <p className="text-xs text-gray-500 truncate">{currentUser.role === 'TEACHER' ? 'معلم' : currentUser.role === 'SCHOOL_MANAGER' ? 'مدير مدرسة' : 'مسؤول'}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-600 bg-white border border-red-100 py-2 rounded-lg text-sm font-bold hover:bg-red-50">
                        <LogOut size={16}/> تسجيل الخروج
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-gray-100 relative">
                <header className="bg-white border-b p-4 flex justify-between items-center md:hidden">
                    <h2 className="font-bold text-gray-800">
                        {currentView === 'DASHBOARD' ? 'لوحة القيادة' : '...'}
                    </h2>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-100 rounded-lg"><Menu/></button>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {currentView === 'DASHBOARD' && <Dashboard students={students} attendance={attendance} performance={performance} currentUser={currentUser} onNavigate={setCurrentView} />}
                    {currentView === 'ADMIN_DASHBOARD' && <AdminDashboard />}
                    {currentView === 'STUDENTS' && <Students students={students} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} onImportStudents={handleImportStudents} currentUser={currentUser} />}
                    {currentView === 'ATTENDANCE' && <AttendanceComponent students={students} attendanceHistory={attendance} onSaveAttendance={handleSaveAttendance} onImportAttendance={handleImportAttendance} currentUser={currentUser} />}
                    {currentView === 'PERFORMANCE' && <PerformanceView students={students} performance={performance} onAddPerformance={handleAddPerformance} onImportPerformance={handleBulkAddPerformance} onDeletePerformance={handleDeletePerformance} currentUser={currentUser} />}
                    {currentView === 'WORKS_TRACKING' && <WorksTracking students={students} performance={performance} attendance={attendance} onAddPerformance={handleBulkAddPerformance} currentUser={currentUser}/>}
                    {currentView === 'STUDENT_FOLLOWUP' && <StudentFollowUp students={students} performance={performance} attendance={attendance}/>}
                    {currentView === 'MONTHLY_REPORT' && <MonthlyReport students={students} attendance={attendance}/>}
                    {currentView === 'AI_REPORTS' && <AIReports students={students} attendance={attendance} performance={performance}/>}
                    {currentView === 'CLASSROOM_MANAGEMENT' && (
                        <ClassroomManager 
                            students={students} 
                            attendance={attendance}
                            performance={performance}
                            onLaunchScreen={() => setShowClassroomScreen(true)}
                            onNavigateToAttendance={() => setCurrentView('ATTENDANCE')}
                            onSaveAttendance={handleSaveAttendance}
                            onImportAttendance={handleImportAttendance}
                            currentUser={currentUser}
                        />
                    )}
                    {currentView === 'SCHOOL_MANAGEMENT' && <SchoolManagement students={students} onImportStudents={handleImportStudents} onImportPerformance={handleBulkAddPerformance} onImportAttendance={handleImportAttendance} currentUser={currentUser} onUpdateTheme={setTheme}/>}
                    {currentView === 'CUSTOM_TABLES' && <CustomTablesView currentUser={currentUser}/>}
                    {currentView === 'MESSAGE_CENTER' && <MessageCenter students={students} attendance={attendance} performance={performance} />}
                    {currentView === 'AI_TOOLS' && <AITools students={students} performance={performance} />}
                    {currentView === 'LESSON_PLANNING' && <LessonPlanning />}
                    {currentView === 'SUBSCRIPTION' && <TeacherSubscription currentUser={currentUser} />}
                </div>
            </main>
        </div>
    );
};

export default App;
