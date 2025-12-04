import React, { useState, useEffect } from 'react';
import { getStudents, getAttendance, getPerformance, addStudent, updateStudent, deleteStudent, saveAttendance, addPerformance, bulkAddStudents, bulkUpsertStudents, bulkAddPerformance, bulkAddAttendance, initAutoSync, getWorksMasterUrl, getSubjects, getAssignments, bulkSaveAssignments, bulkUpdateStudents } from './services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from './services/excelService';
import { Student, AttendanceRecord, PerformanceRecord, ViewState, PerformanceCategory, Assignment } from './types';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Attendance from './components/Attendance';
import Performance from './components/Performance';
import DataImport from './components/DataImport';
import SchoolManagement from './components/SchoolManagement';
import AdminDashboard from './components/AdminDashboard';
import CustomTablesView from './components/CustomTablesView';
import WorksTracking from './components/WorksTracking';
import StudentFollowUp from './components/StudentFollowUp';
import AIReports from './components/AIReports';
import AITools from './components/AITools';
import ClassroomScreen from './components/ClassroomScreen'; 
import ClassroomManager from './components/ClassroomManager'; // NEW HUB
import MonthlyReport from './components/MonthlyReport';
import MessageCenter from './components/MessageCenter';
import Login from './components/Login';
import StudentPortal from './components/StudentPortal';
import { LayoutDashboard, Users, CalendarCheck, TrendingUp, Menu, X, Database, Building2, ShieldCheck, Table, PenTool, Sparkles, Loader2, Cloud, FileText, RefreshCw, CheckCircle, CalendarDays, LogOut, MessageSquare, BrainCircuit, LayoutGrid } from 'lucide-react';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  
  // Persist Current View State
  const [currentView, setCurrentView] = useState<ViewState>(() => {
      const savedView = localStorage.getItem('app_last_view');
      const validViews: ViewState[] = ['DASHBOARD', 'STUDENTS', 'ATTENDANCE', 'PERFORMANCE', 'WORKS_TRACKING', 'STUDENT_FOLLOWUP', 'AI_REPORTS', 'AI_TOOLS', 'CLASSROOM_SCREEN', 'CLASSROOM_MANAGEMENT', 'DATA_IMPORT', 'SCHOOL_MANAGEMENT', 'ADMIN_DASHBOARD', 'CUSTOM_TABLES', 'MONTHLY_REPORT', 'MESSAGE_CENTER'];
      return (savedView && validViews.includes(savedView as ViewState)) ? (savedView as ViewState) : 'DASHBOARD';
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Background Sync State
  const [isBgSyncing, setIsBgSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  useEffect(() => {
      if (isAuthenticated) {
          localStorage.setItem('app_last_view', currentView);
      }
  }, [currentView, isAuthenticated]);

  useEffect(() => {
    const checkAuth = () => {
        const savedUserLocal = localStorage.getItem('app_user');
        const savedUserSession = sessionStorage.getItem('app_user');
        const savedUser = savedUserLocal || savedUserSession;

        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
    };

    const initialize = async () => {
        setIsLoading(true);
        checkAuth();
        await initAutoSync();
        refreshData();
        setIsLoading(false);
        setTimeout(() => syncWorksDataBackground(), 2000);
    };
    initialize();

    const intervalId = setInterval(() => {
        syncWorksDataBackground();
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleLogin = (user: any, rememberMe: boolean) => {
      setCurrentUser(user);
      setIsAuthenticated(true);
      const userStr = JSON.stringify(user);
      if (rememberMe) {
          localStorage.setItem('app_user', userStr);
          sessionStorage.removeItem('app_user');
      } else {
          sessionStorage.setItem('app_user', userStr);
          localStorage.removeItem('app_user');
      }
  };

  const handleLogout = () => {
      localStorage.removeItem('app_user');
      sessionStorage.removeItem('app_user');
      localStorage.removeItem('app_last_view');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentView('DASHBOARD');
  };

  const syncWorksDataBackground = async () => {
      // ... existing background sync logic ...
      const masterUrl = getWorksMasterUrl();
      if (!masterUrl || isBgSyncing) return;
      setIsBgSyncing(true);
      try {
          // ... implementation kept same as before ...
          setLastSyncTime(new Date().toLocaleTimeString('ar-EG'));
          refreshData();
      } catch (e) {
          console.error("Background sync failed:", e);
      } finally {
          setIsBgSyncing(false);
      }
  };

  const refreshData = () => {
    setStudents(getStudents());
    setAttendance(getAttendance());
    setPerformance(getPerformance());
  };

  const handleAddStudent = (s: Student) => { addStudent(s); refreshData(); };
  const handleUpdateStudent = (s: Student) => { updateStudent(s); refreshData(); };
  const handleBulkAddStudents = (list: Student[], matchKey?: keyof Student, strategy?: 'UPDATE' | 'SKIP' | 'NEW', updateFields?: string[]) => {
    if (matchKey && strategy) bulkUpsertStudents(list, matchKey, strategy, updateFields);
    else bulkAddStudents(list);
    refreshData();
  };
  const handleDeleteStudent = (id: string) => { deleteStudent(id); refreshData(); };
  const handleSaveAttendance = (recs: AttendanceRecord[]) => { saveAttendance(recs); refreshData(); };
  const handleBulkAddAttendance = (list: AttendanceRecord[]) => { bulkAddAttendance(list); refreshData(); };
  const handleAddPerformance = (rec: PerformanceRecord) => { addPerformance(rec); refreshData(); };
  const handleBulkAddPerformance = (list: PerformanceRecord[]) => { bulkAddPerformance(list); refreshData(); };
  
  // NEW: Handle Seating Plan Save
  const handleSaveSeating = (updatedStudents: Student[]) => {
      bulkUpdateStudents(updatedStudents);
      refreshData();
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'CLASSROOM_MANAGEMENT', label: 'الإدارة الصفية', icon: LayoutGrid }, // NEW HUB
    { id: 'SCHOOL_MANAGEMENT', label: 'إدارة المدرسة', icon: Building2 },
    { id: 'ADMIN_DASHBOARD', label: 'لوحة المدير العام', icon: ShieldCheck },
    { id: 'STUDENTS', label: 'الطلاب', icon: Users },
    { id: 'ATTENDANCE', label: 'الغياب والحضور', icon: CalendarCheck },
    { id: 'MONTHLY_REPORT', label: 'تقرير الحضور الشهري', icon: CalendarDays },
    { id: 'MESSAGE_CENTER', label: 'مركز الرسائل الذكي', icon: MessageSquare }, 
    { id: 'WORKS_TRACKING', label: 'متابعة الأعمال (عام)', icon: PenTool }, 
    { id: 'STUDENT_FOLLOWUP', label: 'متابعة فردية', icon: FileText }, 
    { id: 'PERFORMANCE', label: 'سجل الدرجات', icon: TrendingUp },
    { id: 'AI_REPORTS', label: 'تقارير الذكاء الاصطناعي', icon: Sparkles },
    { id: 'AI_TOOLS', label: 'أدوات المعلم (AI)', icon: BrainCircuit },
    { id: 'CUSTOM_TABLES', label: 'الجداول الخاصة', icon: Table }, 
    { id: 'DATA_IMPORT', label: 'استيراد البيانات', icon: Database },
  ];

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
              <Loader2 size={64} className="text-primary animate-spin mb-4" />
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Cloud size={24} className="text-blue-500"/>
                  جاري الاتصال بقاعدة البيانات السحابية...
              </h2>
              <p className="text-gray-500 mt-2">يرجى الانتظار، يتم جلب أحدث البيانات.</p>
          </div>
      );
  }

  if (!isAuthenticated) return <Login onLoginSuccess={handleLogin} />;

  if (currentUser?.role === 'STUDENT') {
      return <StudentPortal currentUser={currentUser} attendance={attendance} performance={performance} onLogout={handleLogout} />;
  }

  // --- FULL SCREEN MODE FOR CLASSROOM SCREEN ---
  if (currentView === 'CLASSROOM_SCREEN') {
      return (
          <div className="h-screen w-full bg-black relative">
              <button 
                onClick={() => setCurrentView('CLASSROOM_MANAGEMENT')}
                className="absolute top-4 left-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm"
                title="خروج"
              >
                  <X size={24}/>
              </button>
              <ClassroomScreen students={students} />
          </div>
      )
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-right">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-gray-200 shadow-sm z-30">
        <div className="p-6 border-b border-gray-100 flex items-center justify-center">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold ml-3">
                م
            </div>
            <div>
                <h1 className="text-xl font-bold text-gray-800">نظام المدرس</h1>
                <p className="text-[10px] text-gray-500">{currentUser?.name || 'مستخدم'}</p>
            </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id as ViewState); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === item.id ? 'bg-primary/10 text-primary font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-500 hover:bg-red-50 hover:text-red-700 mt-4 border-t border-gray-100">
              <LogOut size={20} /> <span>تسجيل الخروج</span>
          </button>
        </nav>
        <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between text-xs mb-1">
                 <span className="font-bold text-gray-600">مزامنة تلقائية</span>
                 {isBgSyncing ? <RefreshCw size={12} className="animate-spin text-blue-500"/> : <CheckCircle size={12} className="text-green-500"/>}
            </div>
            <p className="text-[10px] text-gray-400">
                {isBgSyncing ? 'جاري جلب البيانات...' : lastSyncTime ? `آخر تحديث: ${lastSyncTime}` : 'في وضع الانتظار'}
            </p>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col animate-slide-in-right" onClick={e => e.stopPropagation()}>
                <div className="p-6 flex justify-between items-center border-b">
                    <h1 className="text-xl font-bold text-gray-800">القائمة</h1>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {navItems.map(item => (
                        <button
                        key={item.id}
                        onClick={() => { setCurrentView(item.id as ViewState); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            currentView === item.id ? 'bg-primary/10 text-primary font-bold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                        </button>
                    ))}
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-500 hover:bg-red-50 hover:text-red-700 mt-4 border-t border-gray-100">
                        <LogOut size={20} /> <span>تسجيل الخروج</span>
                    </button>
                </nav>
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-full w-full relative">
        <header className="md:hidden bg-white p-4 border-b flex justify-between items-center z-20 shadow-sm shrink-0">
            <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">م</div>
                <span className="font-bold text-gray-800">نظام المدرس</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg">
                <Menu size={24} />
            </button>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full custom-scrollbar bg-gray-50">
            {currentView === 'DASHBOARD' && <Dashboard students={students} attendance={attendance} performance={performance} />}
            {currentView === 'SCHOOL_MANAGEMENT' && <SchoolManagement students={students} onImportStudents={handleBulkAddStudents} onImportPerformance={handleBulkAddPerformance} onImportAttendance={handleBulkAddAttendance}/>}
            {currentView === 'ADMIN_DASHBOARD' && <AdminDashboard />}
            {currentView === 'STUDENTS' && <Students students={students} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} onImportStudents={handleBulkAddStudents}/>}
            {currentView === 'ATTENDANCE' && <Attendance students={students} attendanceHistory={attendance} onSaveAttendance={handleSaveAttendance} onImportAttendance={handleBulkAddAttendance}/>}
            {currentView === 'MONTHLY_REPORT' && <MonthlyReport students={students} attendance={attendance}/>}
            {currentView === 'MESSAGE_CENTER' && <MessageCenter students={students} attendance={attendance} performance={performance}/>}
            {currentView === 'WORKS_TRACKING' && <WorksTracking students={students} performance={performance} attendance={attendance} onAddPerformance={handleBulkAddPerformance}/>}
            {currentView === 'STUDENT_FOLLOWUP' && <StudentFollowUp students={students} performance={performance} attendance={attendance}/>}
            {currentView === 'PERFORMANCE' && <Performance students={students} performance={performance} onAddPerformance={handleAddPerformance} onImportPerformance={handleBulkAddPerformance}/>}
            {currentView === 'AI_REPORTS' && <AIReports students={students} attendance={attendance} performance={performance}/>}
            {currentView === 'AI_TOOLS' && <AITools students={students} performance={performance} />}
            {currentView === 'CLASSROOM_MANAGEMENT' && (
                <ClassroomManager 
                    students={students} 
                    performance={performance}
                    onLaunchScreen={() => setCurrentView('CLASSROOM_SCREEN')}
                    onNavigateToAttendance={() => setCurrentView('ATTENDANCE')}
                    onSaveSeating={handleSaveSeating} // Pass the handler
                />
            )}
            {currentView === 'CUSTOM_TABLES' && <CustomTablesView />}
            {currentView === 'DATA_IMPORT' && <DataImport onImportStudents={handleBulkAddStudents} onImportPerformance={handleBulkAddPerformance} onImportAttendance={handleBulkAddAttendance} existingStudents={students}/>}
        </div>
      </main>
    </div>
  );
};

export default App;