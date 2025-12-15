import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
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
    forceRefreshData, initRealtimeSync, stopRealtimeSync
} from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { checkAIConnection } from './services/geminiService';

// Corrected Imports relative to Root
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
import ReloadPrompt from './components/ReloadPrompt';
import { SchoolManagement as SchoolManagementComponent } from './components/SchoolManagement';

import { Menu, X, LogOut, LayoutGrid, Users, CheckSquare, Settings, MonitorPlay, Table, Award, Mail, Calendar, FileQuestion, Library, ScanLine, PenTool, Printer, BrainCircuit, ClipboardList, CreditCard, FileSpreadsheet, List } from 'lucide-react';

// --- CONTEXT ---
interface AppContextType {
    currentUser: SystemUser | null;
    students: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    theme: UserTheme;
    syncStatus: SyncStatus;
    aiStatus: string;
    refreshData: () => void;
    login: (user: SystemUser, remember: boolean) => void;
    logout: () => void;
    
    // Actions
    addStudent: (s: Student) => void;
    updateStudent: (s: Student) => void;
    deleteStudent: (id: string) => void;
    saveAttendance: (recs: AttendanceRecord[]) => void;
    addPerformance: (p: PerformanceRecord | PerformanceRecord[]) => void;
    deletePerformance: (id: string) => void;
    importStudents: (data: Student[], key?: any, strategy?: any, fields?: any[]) => void;
    importAttendance: (recs: AttendanceRecord[]) => void;
    importPerformance: (recs: PerformanceRecord[]) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useApp must be used within AppProvider");
    return context;
};

// --- LAYOUT ---
const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { currentUser, logout, syncStatus } = useApp();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    const isManager = currentUser?.role === 'SCHOOL_MANAGER' || currentUser?.role === 'SUPER_ADMIN';

    const NavItem = ({ path, label, icon: Icon }: any) => (
        <button 
            onClick={() => { navigate(path); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                location.pathname === path 
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' 
                    : 'text-gray-600 hover:bg-gray-50'
            }`}
        >
            <Icon size={20} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen overflow-hidden text-right font-sans" dir="rtl">
            <ReloadPrompt />
            
            <aside className={`fixed inset-y-0 right-0 w-64 bg-white border-l border-gray-200 shadow-xl z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-5 border-b bg-gradient-to-b from-gray-50 to-white flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-indigo-100">
                                {currentUser?.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-gray-800 truncate w-32">{currentUser?.name}</p>
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold inline-block mt-1">
                                    {currentUser?.role === 'TEACHER' ? 'معلم' : currentUser?.role === 'SCHOOL_MANAGER' ? 'مدير مدرسة' : 'مسؤول'}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-red-500"><X/></button>
                    </div>
                    <button onClick={logout} className="w-full flex items-center justify-center gap-2 text-red-600 bg-white border border-red-200 py-2 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm">
                        <LogOut size={16}/> تسجيل الخروج
                    </button>
                </div>
                
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar h-[calc(100vh-220px)]">
                    <NavItem path="/" label="لوحة القيادة" icon={LayoutGrid} />
                    
                    {currentUser?.role === 'SUPER_ADMIN' && <NavItem path="/admin" label="إدارة النظام" icon={Settings} />}
                    
                    {isManager && (
                        <>
                            <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2">الإدارة</label></div>
                            <NavItem path="/school-mgmt" label="إدارة المدرسة" icon={Settings} />
                            <NavItem path="/students" label="قائمة الطلاب" icon={Users} />
                            <NavItem path="/attendance" label="سجل الحضور" icon={Calendar} />
                            <NavItem path="/performance" label="سجل الدرجات" icon={CheckSquare} />
                            <NavItem path="/works" label="كشف الرصد" icon={Table} />
                            <NavItem path="/flexible-tracking" label="سجلات مرنة" icon={ClipboardList} />
                            <NavItem path="/reports" label="التقارير" icon={Printer} />
                        </>
                    )}

                    {currentUser?.role === 'TEACHER' && (
                        <>
                            <NavItem path="/students" label="الطلاب" icon={Users} />
                            <NavItem path="/attendance" label="الحضور" icon={CheckSquare} />
                            <NavItem path="/classroom" label="الإدارة الصفية" icon={MonitorPlay} />
                            <NavItem path="/works" label="سجل الرصد" icon={Table} />
                            <NavItem path="/flexible-tracking" label="سجلات مرنة" icon={ClipboardList} />
                            
                            <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2">التخطيط</label></div>
                            <NavItem path="/schedule" label="الجدول" icon={Calendar} />
                            <NavItem path="/planning" label="التحضير" icon={PenTool} />
                            <NavItem path="/curriculum" label="المنهج" icon={List} />
                            
                            <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2">التقييم</label></div>
                            <NavItem path="/exams" label="الاختبارات" icon={FileQuestion} />
                            <NavItem path="/questions" label="بنك الأسئلة" icon={Library} />
                            <NavItem path="/auto-grading" label="المصحح الآلي" icon={ScanLine} />
                            
                            <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2">أدوات</label></div>
                            <NavItem path="/ai-tools" label="أدوات AI" icon={BrainCircuit} />
                            <NavItem path="/certificates" label="الشهادات" icon={Award} />
                            <NavItem path="/messages" label="الرسائل" icon={Mail} />
                        </>
                    )}
                </nav>

                <div className="p-4 border-t bg-gray-50 space-y-2">
                     <div className="flex items-center justify-between text-xs px-3 py-2 rounded border bg-white">
                        <span className="text-gray-500 font-bold">Sync:</span>
                        <span className={`font-bold ${syncStatus === 'ONLINE' ? 'text-green-600' : 'text-gray-500'}`}>{syncStatus}</span>
                    </div>
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0 bg-gray-100 relative">
                <header className="bg-white border-b p-4 flex justify-between items-center md:hidden">
                    <h2 className="font-bold text-gray-800">نظام المدرس الذكي</h2>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-100 rounded-lg"><Menu/></button>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    {children}
                </div>
            </main>
        </div>
    );
};

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
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');
    const [aiStatus, setAiStatus] = useState('IDLE');
    
    const navigate = useNavigate();

    // Init Logic
    useEffect(() => {
        if (currentUser) {
            refreshData();
            if (isSupabaseConfigured()) {
                forceRefreshData().then(refreshData);
                initRealtimeSync();
            }
            checkAIConnection().then((res: { success: boolean; message: string }) => setAiStatus(res.success ? 'CONNECTED' : 'ERROR'));
            
            const unsubSync = subscribeToSyncStatus(setSyncStatus);
            const unsubData = subscribeToDataChanges(refreshData);
            return () => { unsubSync(); unsubData(); stopRealtimeSync(); };
        }
    }, [currentUser]);

    const refreshData = () => {
        let allStudents = getStudents();
        let allAttendance = getAttendance();
        let allPerformance = getPerformance();
        
        if (currentUser && currentUser.role !== 'SUPER_ADMIN') {
             // Basic filtering based on user role logic
             if (currentUser.role === 'TEACHER') {
                 allStudents = allStudents.filter(s => (currentUser.schoolId && s.schoolId === currentUser.schoolId) || s.createdById === currentUser.id || !s.createdById);
             }
             // ... more logic if needed
        }
        setStudents(allStudents);
        setAttendance(allAttendance);
        setPerformance(allPerformance);
        setTheme(getUserTheme());
    };

    const login = (user: SystemUser, remember: boolean) => {
        setCurrentUser(user);
        if (remember) localStorage.setItem('current_user', JSON.stringify(user));
        navigate('/');
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('current_user');
        setSystemMode(false);
        stopRealtimeSync();
        navigate('/');
    };

    // Actions
    const handleAddStudent = (s: Student) => { addStudent(s); refreshData(); };
    const handleUpdateStudent = (s: Student) => { updateStudent(s); refreshData(); };
    const handleDeleteStudent = (id: string) => { deleteStudent(id); refreshData(); };
    const handleSaveAttendance = (recs: AttendanceRecord[]) => { 
        const enriched = recs.map(r => ({ ...r, createdById: r.createdById || currentUser?.id }));
        saveAttendance(enriched); refreshData(); 
    };
    const handleAddPerformance = (p: PerformanceRecord | PerformanceRecord[]) => {
        if (Array.isArray(p)) bulkAddPerformance(p.map(x => ({...x, createdById: currentUser?.id})));
        else addPerformance({...p, createdById: currentUser?.id});
        refreshData();
    };
    const handleDeletePerformance = (id: string) => { deletePerformance(id); refreshData(); };
    
    const contextValue: AppContextType = {
        currentUser, students, attendance, performance, theme, syncStatus, aiStatus,
        refreshData, login, logout,
        addStudent: handleAddStudent,
        updateStudent: handleUpdateStudent,
        deleteStudent: handleDeleteStudent,
        saveAttendance: handleSaveAttendance,
        addPerformance: handleAddPerformance,
        deletePerformance: handleDeletePerformance,
        importStudents: (d, k, s, f) => { 
            const e = d.map(x => ({...x, createdById: currentUser?.id, schoolId: currentUser?.schoolId}));
            if (s === 'UPDATE') bulkUpsertStudents(e, k); else bulkAddStudents(e); 
            refreshData(); 
        },
        importAttendance: (r) => { bulkAddAttendance(r.map(x => ({...x, createdById: currentUser?.id}))); refreshData(); },
        importPerformance: (r) => { bulkAddPerformance(r.map(x => ({...x, createdById: currentUser?.id}))); refreshData(); }
    };

    if (!currentUser) {
        return <Login onLoginSuccess={login} />;
    }

    // Portal Checks
    if (currentUser.role === 'STUDENT') return <StudentPortal currentUser={currentUser as any} attendance={attendance} performance={performance} onLogout={logout} />;
    if (currentUser.role === 'PARENT') return <ParentPortal parentPhone={currentUser.email} allStudents={getStudents()} attendance={getAttendance()} performance={getPerformance()} onLogout={logout} />;

    return (
        <AppContext.Provider value={contextValue}>
            <AppLayout>
                <Routes>
                    <Route path="/" element={<Dashboard students={students} attendance={attendance} performance={performance} currentUser={currentUser} onNavigate={(v: string) => navigate(v === 'CLASSROOM_MANAGEMENT' ? '/classroom' : v === 'ATTENDANCE' ? '/attendance' : v === 'EXAMS_MANAGER' ? '/exams' : v === 'AUTO_GRADING' ? '/auto-grading' : v === 'STUDENT_FOLLOWUP' ? '/followup' : v === 'AI_REPORTS' ? '/reports' : '/')} />} />
                    <Route path="/students" element={<Students students={students} attendance={attendance} performance={performance} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} onImportStudents={contextValue.importStudents} currentUser={currentUser} />} />
                    <Route path="/attendance" element={<AttendanceComponent students={students} attendanceHistory={attendance} onSaveAttendance={handleSaveAttendance} onImportAttendance={contextValue.importAttendance} currentUser={currentUser} onNavigate={() => {}} />} />
                    <Route path="/classroom" element={<ClassroomManager students={students} attendance={attendance} performance={performance} onLaunchScreen={() => navigate('/screen')} onNavigateToAttendance={() => navigate('/attendance')} onSaveAttendance={handleSaveAttendance} onImportAttendance={contextValue.importAttendance} currentUser={currentUser} />} />
                    <Route path="/screen" element={<ClassroomScreen students={students} attendance={attendance} onSaveAttendance={handleSaveAttendance} currentUser={currentUser} />} />
                    <Route path="/works" element={<WorksTracking students={students} performance={performance} attendance={attendance} onAddPerformance={handleAddPerformance} currentUser={currentUser}/>} />
                    <Route path="/flexible-tracking" element={<FlexibleTrackingSheet currentUser={currentUser}/>} />
                    <Route path="/performance" element={<PerformanceView students={students} performance={performance} onAddPerformance={handleAddPerformance} onImportPerformance={contextValue.importPerformance} onDeletePerformance={handleDeletePerformance} currentUser={currentUser} attendance={attendance} />} />
                    <Route path="/schedule" element={<ScheduleView currentUser={currentUser} onNavigateToLesson={() => navigate('/planning')} onNavigateToAttendance={() => navigate('/attendance')} />} />
                    <Route path="/planning" element={<LessonPlanning />} />
                    <Route path="/curriculum" element={<CurriculumManager currentUser={currentUser} />} />
                    <Route path="/exams" element={<ExamsManager currentUser={currentUser} />} />
                    <Route path="/questions" element={<QuestionBank currentUser={currentUser} />} />
                    <Route path="/auto-grading" element={<AutoGrading currentUser={currentUser} />} />
                    <Route path="/ai-tools" element={<AITools students={students} performance={performance} />} />
                    <Route path="/reports" element={<AIReports students={students} attendance={attendance} performance={performance} currentUser={currentUser}/>} />
                    <Route path="/monthly-report" element={<MonthlyReport students={students} attendance={attendance} performance={performance} currentUser={currentUser}/>} />
                    <Route path="/messages" element={<MessageCenter students={students} attendance={attendance} performance={performance} currentUser={currentUser} />} />
                    <Route path="/certificates" element={<CertificatesCenter students={students} currentUser={currentUser} onSaveAttendance={handleSaveAttendance} />} />
                    <Route path="/resources" element={<ResourcesView currentUser={currentUser} />} />
                    <Route path="/custom-tables" element={<CustomTablesView currentUser={currentUser}/>} />
                    <Route path="/school-mgmt" element={<SchoolManagementComponent students={students} onImportStudents={contextValue.importStudents} onImportPerformance={contextValue.importPerformance} onImportAttendance={contextValue.importAttendance} currentUser={currentUser} onUpdateTheme={setTheme}/>} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/followup" element={<StudentFollowUp students={students} performance={performance} attendance={attendance} currentUser={currentUser} onSaveAttendance={handleSaveAttendance}/>} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </AppLayout>
        </AppContext.Provider>
    );
};

export default App;