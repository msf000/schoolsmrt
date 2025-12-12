import React, { useState, useEffect, useRef } from 'react';
import { 
    Student, AttendanceRecord, PerformanceRecord, SystemUser, UserTheme 
} from './types';
import { 
    getStudents, getAttendance, getPerformance, 
    addStudent, updateStudent, deleteStudent, 
    saveAttendance, addPerformance, deletePerformance, 
    bulkAddStudents, bulkAddPerformance, bulkAddAttendance, 
    getUserTheme, bulkUpsertStudents,
    setSystemMode, subscribeToSyncStatus, subscribeToDataChanges, SyncStatus,
    forceRefreshData
} from './services/storageService';
import { checkAIConnection } from './services/geminiService';

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
import AdminDashboard from './components/AdminDashboard';
import CustomTablesView from './components/CustomTablesView';
import MessageCenter from './components/MessageCenter';
import AITools from './components/AITools';
import StudentPortal from './components/StudentPortal';
import TeacherSubscription from './components/TeacherSubscription';
import LessonPlanning from './components/LessonPlanning';
import MonthlyReport from './components/MonthlyReport';
import ExamsManager from './components/ExamsManager';
import QuestionBank from './components/QuestionBank';
import AutoGrading from './components/AutoGrading';
import CurriculumManager from './components/CurriculumManager';
import ResourcesView from './components/ResourcesView';
import ScheduleView from './components/ScheduleView';
import FlexibleTrackingSheet from './components/FlexibleTrackingSheet';
import ParentPortal from './components/ParentPortal';
import CertificatesCenter from './components/CertificatesCenter';

import { Menu, X, LogOut, LayoutGrid, Users, CheckSquare, BarChart, Settings, BookOpen, BrainCircuit, MonitorPlay, FileSpreadsheet, Mail, CreditCard, PenTool, Printer, Cloud, CloudOff, RefreshCw, AlertCircle, UploadCloud, Loader2, FileQuestion, Library, CheckCircle2, ScanLine, ListTree, Calendar, Table, Award, Baby, WifiOff, Activity, ClipboardList } from 'lucide-react';

import { SchoolManagement as SchoolManagementComponent } from './components/SchoolManagement';

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

    // UI State - Persist Current View
    const [currentView, setCurrentView] = useState(() => {
        return localStorage.getItem('app_last_view') || 'DASHBOARD';
    });

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showClassroomScreen, setShowClassroomScreen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Sync State
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');
    const bgSyncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    // AI Status State
    const [aiStatus, setAiStatus] = useState<'IDLE' | 'CHECKING' | 'CONNECTED' | 'ERROR'>('IDLE');

    // Save View on Change
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('app_last_view', currentView);
        }
    }, [currentView, currentUser]);

    useEffect(() => {
        if (currentUser) {
            const startUp = async () => {
                if (getStudents().length === 0) setIsLoading(true);
                loadData(); 
                try {
                    await forceRefreshData();
                } catch (e) {
                    console.error("Initialization Sync Failed:", e);
                } finally {
                    loadData(); 
                    setIsLoading(false);
                }
            };
            startUp();
            
            const checkAI = async () => {
                if (currentUser.role !== 'STUDENT' && currentUser.role !== 'PARENT') {
                    setAiStatus('CHECKING');
                    const res = await checkAIConnection();
                    setAiStatus(res.success ? 'CONNECTED' : 'ERROR');
                }
            };
            checkAI();
            
            const unsubSync = subscribeToSyncStatus((status) => setSyncStatus(status));
            const unsubData = subscribeToDataChanges(() => {
                loadData();
            });

            // --- BACKGROUND SYNC (Every 2 Minutes) ---
            bgSyncTimerRef.current = setInterval(() => {
                console.log("Running background sync...");
                forceRefreshData().catch(e => console.error("BG Sync Failed", e));
            }, 2 * 60 * 1000);

            return () => {
                unsubSync();
                unsubData();
                if (bgSyncTimerRef.current) clearInterval(bgSyncTimerRef.current);
            };
        }
    }, [currentUser]);

    const loadData = () => {
        let allStudents = getStudents();
        let allAttendance = getAttendance();
        let allPerformance = getPerformance();
        
        // --- DATA ISOLATION ---
        if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
             if (currentUser.role === 'STUDENT') {
                 allStudents = allStudents.filter(s => s.id === currentUser.id);
                 allAttendance = allAttendance.filter(a => a.studentId === currentUser.id);
                 allPerformance = allPerformance.filter(p => p.studentId === currentUser.id);
             } else if (currentUser.role === 'PARENT') {
                 // Parents see linked children (logic in ParentPortal handles aggregation)
             } else if (currentUser.role === 'SCHOOL_MANAGER') {
                 if (currentUser.schoolId) {
                     allStudents = allStudents.filter(s => s.schoolId === currentUser.schoolId);
                 }
             } else if (currentUser.role === 'TEACHER') {
                 allStudents = allStudents.filter(s => 
                     (currentUser.schoolId && s.schoolId === currentUser.schoolId) || 
                     s.createdById === currentUser.id || 
                     !s.createdById
                 );
             }
             
             if (currentUser.role !== 'PARENT') {
                 const visibleStudentIds = new Set(allStudents.map(s => s.id));
                 allAttendance = allAttendance.filter(a => visibleStudentIds.has(a.studentId));
                 allPerformance = allPerformance.filter(p => visibleStudentIds.has(p.studentId));
             }
        }

        setStudents(allStudents);
        setAttendance(allAttendance);
        setPerformance(allPerformance);
        setTheme(getUserTheme());
    };

    const handleLoginSuccess = (user: any, remember: boolean) => {
        setCurrentUser(user);
        if (remember) localStorage.setItem('current_user', JSON.stringify(user));
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('current_user');
        localStorage.removeItem('app_last_view'); // Clear view on logout
        setSystemMode(false);
        setShowClassroomScreen(false);
        setCurrentView('DASHBOARD');
        if (bgSyncTimerRef.current) clearInterval(bgSyncTimerRef.current);
    };

    const handleManualSync = async () => {
        setIsLoading(true);
        await forceRefreshData();
        setIsLoading(false);
    };

    const handleCheckAI = async () => {
        setAiStatus('CHECKING');
        const res = await checkAIConnection();
        setAiStatus(res.success ? 'CONNECTED' : 'ERROR');
    };

    // --- CRUD WRAPPERS ---
    const handleAddStudent = (s: Student) => { addStudent(s); loadData(); };
    const handleUpdateStudent = (s: Student) => { updateStudent(s); loadData(); };
    const handleDeleteStudent = (id: string) => { deleteStudent(id); loadData(); };
    
    // ATTENDANCE: Manually saving attendance should attach teacher ID if not present
    const handleSaveAttendance = (recs: AttendanceRecord[]) => { 
        const enrichedRecs = recs.map(r => ({ ...r, createdById: r.createdById || currentUser?.id }));
        saveAttendance(enrichedRecs); 
        loadData(); 
    };
    
    const handleAddPerformance = (rec: PerformanceRecord | PerformanceRecord[]) => { 
        if (Array.isArray(rec)) {
            handleBulkAddPerformance(rec);
        } else {
            addPerformance({ ...rec, createdById: currentUser?.id });
        }
        loadData(); 
    };
    
    const handleBulkAddPerformance = (recs: PerformanceRecord[]) => { 
        const enrichedRecs = recs.map(r => ({ ...r, createdById: currentUser?.id }));
        bulkAddPerformance(enrichedRecs); 
        loadData(); 
    };

    const handleDeletePerformance = (id: string) => { deletePerformance(id); loadData(); };
    
    const handleImportStudents = (data: Student[], key?: keyof Student, strategy?: any, fields?: any[]) => {
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

    // --- PARENT PORTAL ---
    if (currentUser && currentUser.role === 'PARENT') {
        const allStds = getStudents(); 
        const allAtt = getAttendance();
        const allPerf = getPerformance();
        
        return (
            <ParentPortal 
                parentPhone={currentUser.email} 
                allStudents={allStds}
                attendance={allAtt}
                performance={allPerf}
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
                <ClassroomScreen 
                    students={students} 
                    attendance={attendance} 
                    onSaveAttendance={handleSaveAttendance} 
                    currentUser={currentUser}
                />
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

    const isManager = currentUser.role === 'SCHOOL_MANAGER';

    return (
        <div className={`flex h-screen overflow-hidden text-right font-sans ${theme.mode === 'DARK' ? 'dark' : ''}`} dir="rtl">
            
            {/* Global Loading Overlay (Initial Sync) */}
            {isLoading && (
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-fade-in">
                    <Loader2 size={48} className="text-indigo-600 animate-spin mb-4"/>
                    <h3 className="text-xl font-bold text-gray-800">جاري تحميل البيانات...</h3>
                    <p className="text-gray-500">يرجى الانتظار قليلاً للمزامنة</p>
                </div>
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 right-0 w-64 bg-white border-l border-gray-200 shadow-xl z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* TOP: User Profile & Logout */}
                <div className="p-5 border-b bg-gradient-to-b from-gray-50 to-white flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-indigo-100">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-gray-800 truncate w-32">{currentUser.name}</p>
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold inline-block mt-1">
                                    {currentUser.role === 'TEACHER' ? 'معلم' : currentUser.role === 'SCHOOL_MANAGER' ? 'مدير مدرسة' : 'مسؤول'}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-red-500"><X/></button>
                    </div>

                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-600 bg-white border border-red-200 py-2 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm">
                        <LogOut size={16}/> تسجيل الخروج
                    </button>
                </div>
                
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar h-[calc(100vh-220px)]">
                    <div className="text-xs font-bold text-gray-400 px-4 mb-2 mt-2">القائمة الرئيسية</div>
                    <NavItem view="DASHBOARD" label="لوحة القيادة" icon={LayoutGrid} />
                    
                    {currentUser.role === 'SUPER_ADMIN' && <NavItem view="ADMIN_DASHBOARD" label="إدارة النظام" icon={Settings} />}
                    
                    {/* MANAGER SPECIFIC SIDEBAR (MONITORING ONLY) */}
                    {isManager && (
                        <>
                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <label className="px-4 text-xs font-bold text-gray-400 block mb-2">الإدارة والمتابعة</label>
                                <NavItem view="SCHOOL_MANAGEMENT" label="إدارة المدرسة" icon={Settings} />
                                <NavItem view="STUDENTS" label="قائمة الطلاب" icon={Users} />
                                <NavItem view="ATTENDANCE" label="سجل الحضور" icon={Calendar} />
                                <NavItem view="PERFORMANCE" label="سجل الدرجات" icon={CheckSquare} />
                                <NavItem view="WORKS_TRACKING" label="كشف الرصد (الشبكة)" icon={Table} />
                            </div>

                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <label className="px-4 text-xs font-bold text-gray-400 block mb-2">التقارير والتواصل</label>
                                <NavItem view="MONTHLY_REPORT" label="التقرير الشامل" icon={Printer} />
                                <NavItem view="STUDENT_FOLLOWUP" label="بطاقة الطالب" icon={ClipboardList} />
                                <NavItem view="AI_REPORTS" label="تحليل الذكاء (AI)" icon={BrainCircuit} />
                                <NavItem view="MESSAGE_CENTER" label="مركز الرسائل" icon={Mail} />
                            </div>
                        </>
                    )}

                    {/* TEACHER SPECIFIC SIDEBAR (FULL TOOLS) */}
                    {currentUser.role === 'TEACHER' && (
                        <>
                            <NavItem view="STUDENTS" label="الطلاب" icon={Users} />
                            <NavItem view="ATTENDANCE" label="الحضور والغياب" icon={CheckSquare} />
                            <NavItem view="CLASSROOM_MANAGEMENT" label="الإدارة الصفية" icon={MonitorPlay} />
                            <NavItem view="WORKS_TRACKING" label="سجل الرصد (الإلكتروني)" icon={Table} />
                            
                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <label className="px-4 text-xs font-bold text-gray-400 block mb-2">التخطيط والمناهج</label>
                                <NavItem view="SCHEDULE_VIEW" label="الجدول الدراسي" icon={Calendar} />
                                <NavItem view="LESSON_PLANNING" label="تحضير الدروس" icon={PenTool} />
                                <NavItem view="CURRICULUM_MAP" label="توزيع المنهج" icon={ListTree} />
                                <NavItem view="RESOURCES_VIEW" label="مكتبة المصادر" icon={BookOpen} />
                            </div>

                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <label className="px-4 text-xs font-bold text-gray-400 block mb-2">الاختبارات والتقييم</label>
                                <NavItem view="QUESTION_BANK" label="بنك الأسئلة" icon={Library} />
                                <NavItem view="EXAMS_MANAGER" label="الاختبارات" icon={FileQuestion} />
                                <NavItem view="AUTO_GRADING" label="التصحيح الآلي" icon={ScanLine} />
                                <NavItem view="FLEXIBLE_TRACKING" label="سجلات خاصة" icon={FileSpreadsheet} />
                            </div>

                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <label className="px-4 text-xs font-bold text-gray-400 block mb-2">الأدوات والتقارير</label>
                                <NavItem view="STUDENT_FOLLOWUP" label="تقارير الطلاب" icon={BookOpen} />
                                <NavItem view="CERTIFICATES" label="مركز الشهادات" icon={Award} />
                                <NavItem view="MONTHLY_REPORT" label="التقرير الشامل" icon={Printer} />
                                <NavItem view="MESSAGE_CENTER" label="مركز الرسائل" icon={Mail} />
                                <NavItem view="AI_TOOLS" label="أدوات المعلم AI" icon={BrainCircuit} />
                            </div>
                            
                            <div className="pt-4 mt-4 border-t border-gray-100">
                                <label className="px-4 text-xs font-bold text-gray-400 block mb-2">إضافات</label>
                                <NavItem view="AI_REPORTS" label="تحليل AI" icon={BrainCircuit} />
                                <NavItem view="CUSTOM_TABLES" label="جداول مخصصة" icon={FileSpreadsheet} />
                                <NavItem view="SCHOOL_MANAGEMENT" label="الإعدادات" icon={Settings} />
                                <NavItem view="SUBSCRIPTION" label="الاشتراك" icon={CreditCard} />
                            </div>
                        </>
                    )}
                </nav>

                {/* BOTTOM: Sync Status & AI Status */}
                <div className="p-4 border-t bg-gray-50 space-y-2">
                    <button 
                        onClick={handleManualSync}
                        disabled={syncStatus === 'SYNCING'}
                        className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded border transition-colors cursor-pointer ${
                            syncStatus === 'SYNCING' ? 'bg-blue-50 border-blue-200' :
                            syncStatus === 'ONLINE' ? 'bg-green-50 border-green-200' :
                            syncStatus === 'OFFLINE' ? 'bg-gray-100 border-gray-300' :
                            syncStatus === 'ERROR' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                        }`}
                        title="اضغط لتحديث البيانات فوراً"
                    >
                        <span className="text-gray-500 font-bold">حالة المزامنة:</span>
                        <div className="flex items-center gap-1">
                            {syncStatus === 'SYNCING' && <RefreshCw size={14} className="text-blue-500 animate-spin"/>}
                            {syncStatus === 'ONLINE' && <Cloud size={14} className="text-green-500"/>}
                            {syncStatus === 'OFFLINE' && <WifiOff size={14} className="text-gray-500"/>}
                            {syncStatus === 'ERROR' && <AlertCircle size={14} className="text-red-500"/>}
                            {syncStatus === 'IDLE' && <Cloud size={14} className="text-gray-400"/>}
                            
                            <span className={`font-bold ${
                                syncStatus === 'SYNCING' ? 'text-blue-600' :
                                syncStatus === 'ONLINE' ? 'text-green-600' :
                                syncStatus === 'OFFLINE' ? 'text-gray-600' :
                                syncStatus === 'ERROR' ? 'text-red-600' : 'text-gray-500'
                            }`}>
                                {syncStatus === 'SYNCING' ? 'جاري التحديث...' :
                                 syncStatus === 'ONLINE' ? 'متصل (Online)' :
                                 syncStatus === 'OFFLINE' ? 'وضع غير متصل' :
                                 syncStatus === 'ERROR' ? 'خطأ الاتصال' : 'جاهز'}
                            </span>
                        </div>
                    </button>

                    {/* AI STATUS BUTTON */}
                    <button 
                        onClick={handleCheckAI}
                        disabled={aiStatus === 'CHECKING'}
                        className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded border transition-colors ${
                            aiStatus === 'ERROR' ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'
                        } ${
                            aiStatus === 'CHECKING' ? 'bg-purple-50 border-purple-200' :
                            aiStatus === 'CONNECTED' ? 'bg-green-50 border-green-200' :
                            aiStatus === 'ERROR' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                        }`}
                        title={aiStatus === 'ERROR' ? 'اضغط لإعادة الفحص' : ''}
                    >
                        <span className="text-gray-500 font-bold">حالة الذكاء (AI):</span>
                        <div className="flex items-center gap-1">
                            {aiStatus === 'CHECKING' && <Loader2 size={14} className="text-purple-500 animate-spin"/>}
                            {aiStatus === 'CONNECTED' && <BrainCircuit size={14} className="text-green-500"/>}
                            {aiStatus === 'ERROR' && <AlertCircle size={14} className="text-red-500"/>}
                            
                            <span className={`font-bold ${
                                aiStatus === 'CHECKING' ? 'text-purple-600' :
                                aiStatus === 'CONNECTED' ? 'text-green-600' :
                                aiStatus === 'ERROR' ? 'text-red-600' : 'text-gray-500'
                            }`}>
                                {aiStatus === 'CHECKING' ? 'جاري الفحص...' :
                                 aiStatus === 'CONNECTED' ? 'متصل' :
                                 aiStatus === 'ERROR' ? 'خطأ' : 'غير معروف'}
                            </span>
                        </div>
                    </button>

                    <div className="text-center mt-2 text-[10px] text-gray-300">
                        نظام المدرس الذكي v1.2.1
                    </div>
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
                    {currentView === 'STUDENTS' && <Students students={students} attendance={attendance} performance={performance} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} onImportStudents={handleImportStudents} currentUser={currentUser} />}
                    {currentView === 'ATTENDANCE' && <AttendanceComponent students={students} attendanceHistory={attendance} onSaveAttendance={handleSaveAttendance} onImportAttendance={handleImportAttendance} currentUser={currentUser} onNavigate={setCurrentView} />}
                    {currentView === 'PERFORMANCE' && <PerformanceView students={students} performance={performance} onAddPerformance={handleAddPerformance} onImportPerformance={handleBulkAddPerformance} onDeletePerformance={handleDeletePerformance} currentUser={currentUser} />}
                    {currentView === 'WORKS_TRACKING' && <WorksTracking students={students} performance={performance} attendance={attendance} onAddPerformance={handleBulkAddPerformance} currentUser={currentUser}/>}
                    {currentView === 'STUDENT_FOLLOWUP' && <StudentFollowUp students={students} performance={performance} attendance={attendance} currentUser={currentUser} onSaveAttendance={handleSaveAttendance}/>}
                    {currentView === 'MONTHLY_REPORT' && <MonthlyReport students={students} attendance={attendance} performance={performance} currentUser={currentUser}/>}
                    {currentView === 'AI_REPORTS' && <AIReports students={students} attendance={attendance} performance={performance} currentUser={currentUser}/>}
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
                    {currentView === 'SCHOOL_MANAGEMENT' && <SchoolManagementComponent students={students} onImportStudents={handleImportStudents} onImportPerformance={handleBulkAddPerformance} onImportAttendance={handleImportAttendance} currentUser={currentUser} onUpdateTheme={setTheme}/>}
                    {currentView === 'CUSTOM_TABLES' && <CustomTablesView currentUser={currentUser}/>}
                    {currentView === 'MESSAGE_CENTER' && <MessageCenter students={students} attendance={attendance} performance={performance} currentUser={currentUser} />}
                    {currentView === 'AI_TOOLS' && <AITools students={students} performance={performance} />}
                    {currentView === 'LESSON_PLANNING' && <LessonPlanning />}
                    {currentView === 'EXAMS_MANAGER' && <ExamsManager currentUser={currentUser} />}
                    {currentView === 'QUESTION_BANK' && <QuestionBank currentUser={currentUser} />}
                    {currentView === 'AUTO_GRADING' && <AutoGrading />}
                    {currentView === 'SUBSCRIPTION' && <TeacherSubscription currentUser={currentUser} />}
                    
                    {currentView === 'CURRICULUM_MAP' && <CurriculumManager currentUser={currentUser} />}
                    {currentView === 'SCHEDULE_VIEW' && (
                        <ScheduleView 
                            currentUser={currentUser}
                            onNavigateToLesson={() => setCurrentView('LESSON_PLANNING')}
                            onNavigateToAttendance={() => setCurrentView('ATTENDANCE')}
                        />
                    )}
                    {currentView === 'RESOURCES_VIEW' && <ResourcesView currentUser={currentUser} />}
                    {currentView === 'FLEXIBLE_TRACKING' && <FlexibleTrackingSheet currentUser={currentUser} />}
                    {currentView === 'CERTIFICATES' && <CertificatesCenter students={students} currentUser={currentUser} onSaveAttendance={handleSaveAttendance} />}
                </div>
            </main>
        </div>
    );
};

export default App;