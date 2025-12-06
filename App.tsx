
import React, { useState, useEffect } from 'react';
import { getStudents, getAttendance, getPerformance, addStudent, updateStudent, deleteStudent, saveAttendance, addPerformance, bulkAddStudents, bulkUpsertStudents, bulkAddPerformance, bulkAddAttendance, initAutoSync, getWorksMasterUrl, getSubjects, getAssignments, bulkSaveAssignments, bulkUpdateStudents, downloadFromSupabase, uploadToSupabase, isSystemDemo } from './services/storageService';
import { fetchWorkbookStructureUrl, getSheetHeadersAndData } from './services/excelService';
import { Student, AttendanceRecord, PerformanceRecord, ViewState, PerformanceCategory, Assignment } from './types';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Attendance from './components/Attendance';
import Performance from './components/Performance';
import DataImport from './components/DataImport';
import AIDataImport from './components/AIDataImport';
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
import LessonPlanning from './components/LessonPlanning'; // New Component
import Login from './components/Login';
import StudentPortal from './components/StudentPortal';
import { LayoutDashboard, Users, CalendarCheck, TrendingUp, Menu, X, Database, Building2, ShieldCheck, Table, PenTool, Sparkles, Loader2, Cloud, FileText, RefreshCw, CheckCircle, CalendarDays, LogOut, MessageSquare, BrainCircuit, LayoutGrid, Wifi, Beaker, Settings, Server, BookOpen } from 'lucide-react';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Global Date State for Synchronization
  const [globalDate, setGlobalDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  
  // Persist Current View State
  const [currentView, setCurrentView] = useState<ViewState>(() => {
      const savedView = localStorage.getItem('app_last_view');
      const validViews: ViewState[] = ['DASHBOARD', 'STUDENTS', 'ATTENDANCE', 'PERFORMANCE', 'WORKS_TRACKING', 'STUDENT_FOLLOWUP', 'AI_REPORTS', 'AI_TOOLS', 'CLASSROOM_SCREEN', 'CLASSROOM_MANAGEMENT', 'DATA_IMPORT', 'SCHOOL_MANAGEMENT', 'ADMIN_DASHBOARD', 'CUSTOM_TABLES', 'MONTHLY_REPORT', 'MESSAGE_CENTER', 'AI_DATA_IMPORT', 'LESSON_PLANNING'];
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
        // FORCE CLOUD SYNC FIRST
        await initAutoSync();
        checkAuth();
        refreshData();
        setIsLoading(false);
    };
    initialize();

    // --- NEW: Cloud Sync Polling Interval (Every 5 minutes) ---
    // Only if NOT in demo mode
    const cloudInterval = setInterval(async () => {
        if(isSystemDemo()) return;
        if(!isBgSyncing) {
             handleForceSync(true); // Silent sync
        }
    }, 300000); // 5 minutes

    return () => {
        clearInterval(cloudInterval);
    };
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
      refreshData(); // Refresh data on login (important for switching modes)
  };

  const handleLogout = () => {
      localStorage.removeItem('app_user');
      sessionStorage.removeItem('app_user');
      localStorage.removeItem('app_last_view');
      setIsAuthenticated(false);
      setCurrentUser(null);
      setCurrentView('DASHBOARD');
  };

  // --- MANUAL / FORCE SYNC HANDLER ---
  const handleForceSync = async (silent = false) => {
      if (isSystemDemo()) {
          if (!silent) alert('المزامنة غير متاحة في الوضع التجريبي.');
          return;
      }
      if (isBgSyncing) return;
      
      setIsBgSyncing(true);
      try {
          // Re-fetch all data from cloud to ensure UI is fresh
          await initAutoSync();
          refreshData();
          setLastSyncTime(new Date().toLocaleTimeString('ar-EG'));
          if (!silent) alert('✅ تم تحديث البيانات من السحابة بنجاح!');
      } catch (e: any) {
          console.error("Sync failed:", e);
          if (!silent) alert(`❌ فشل التحديث: ${e.message || 'خطأ غير معروف'}`);
      } finally {
          setIsBgSyncing(false);
      }
  };

  const refreshData = () => {
    setStudents(getStudents());
    setAttendance(getAttendance());
    setPerformance(getPerformance());
  };

  const handleAddStudent = async (s: Student) => { await addStudent(s); refreshData(); };
  const handleUpdateStudent = async (s: Student) => { await updateStudent(s); refreshData(); };
  const handleBulkAddStudents = async (list: Student[], matchKey?: keyof Student, strategy?: 'UPDATE' | 'SKIP' | 'NEW', updateFields?: string[]) => {
    if (matchKey && strategy) await bulkUpsertStudents(list, matchKey, strategy, updateFields || []);
    else await bulkAddStudents(list);
    refreshData();
  };
  const handleDeleteStudent = async (id: string) => { await deleteStudent(id); refreshData(); };
  const handleSaveAttendance = async (recs: AttendanceRecord[]) => { await saveAttendance(recs); refreshData(); };
  const handleBulkAddAttendance = async (list: AttendanceRecord[]) => { await bulkAddAttendance(list); refreshData(); };
  const handleAddPerformance = async (rec: PerformanceRecord) => { await addPerformance(rec); refreshData(); };
  const handleBulkAddPerformance = async (list: PerformanceRecord[]) => { await bulkAddPerformance(list); refreshData(); };
  
  // NEW: Handle Seating Plan Save
  const handleSaveSeating = async (updatedStudents: Student[]) => {
      await bulkUpdateStudents(updatedStudents);
      refreshData();
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'لوحة التحكم', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] },
    
    // System Manager ONLY
    { id: 'ADMIN_DASHBOARD', label: 'إدارة النظام (System)', icon: Server, roles: ['SUPER_ADMIN'] },
    
    // School Manager & TEACHER (for Profile)
    { id: 'SCHOOL_MANAGEMENT', label: 'الإعدادات / الملف', icon: Settings, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] },
    
    // Teachers & School Managers
    { id: 'CLASSROOM_MANAGEMENT', label: 'الإدارة الصفية', icon: LayoutGrid, roles: ['SCHOOL_MANAGER', 'TEACHER'] }, 
    { id: 'LESSON_PLANNING', label: 'إعداد الدروس', icon: BookOpen, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] },
    { id: 'STUDENTS', label: 'الطلاب', icon: Users, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] },
    { id: 'ATTENDANCE', label: 'الغياب والحضور', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] },
    { id: 'MONTHLY_REPORT', label: 'تقرير الحضور الشهري', icon: CalendarDays, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] },
    { id: 'MESSAGE_CENTER', label: 'مركز الرسائل الذكي', icon: MessageSquare, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] }, 
    { id: 'WORKS_TRACKING', label: 'متابعة الأعمال (عام)', icon: PenTool, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] }, 
    { id: 'STUDENT_FOLLOWUP', label: 'متابعة فردية', icon: FileText, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] }, 
    { id: 'PERFORMANCE', label: 'سجل الدرجات', icon: TrendingUp, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] },
    { id: 'AI_REPORTS', label: 'تقارير الذكاء الاصطناعي', icon: Sparkles, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] },
    { id: 'AI_TOOLS', label: 'أدوات المعلم (AI)', icon: BrainCircuit, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER'] },
    { id: 'CUSTOM_TABLES', label: 'الجداول الخاصة', icon: Table, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER'] }, 
    { id: 'DATA_IMPORT', label: 'استيراد (Excel)', icon: Database, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER'] },
    { id: 'AI_DATA_IMPORT', label: 'استيراد ذكي (AI)', icon: Sparkles, roles: ['SUPER_ADMIN', 'SCHOOL_MANAGER'] },
  ];

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
              <Loader2 size={64} className="text-primary animate-spin mb-4" />
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Cloud size={24} className="text-blue-500"/>
                  جاري الاتصال بالسحابة وجلب البيانات...
              </h2>
              <p className="text-gray-500 mt-2">يعتمد النظام الآن بالكامل على التخزين السحابي.</p>
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
              <ClassroomScreen students={students} attendance={attendance} />
          </div>
      )
  }

  // --- Filter Nav Items based on Role ---
  const userRole = currentUser?.role || 'TEACHER'; 
  const isDemo = isSystemDemo();
  
  // Filter Nav Items:
  const filteredNavItems = navItems.filter(item => {
      // 1. Check Role Access
      const roleMatch = item.roles.includes(userRole);
      
      // 2. Strict Separation Check
      // If I am SCHOOL_MANAGER, I must NOT see ADMIN_DASHBOARD even if logic somehow allows.
      if (userRole === 'SCHOOL_MANAGER' && item.id === 'ADMIN_DASHBOARD') return false;

      return roleMatch;
  });

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-right">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-gray-200 shadow-sm z-30">
        <div className="p-6 border-b border-gray-100 flex items-center justify-center bg-gray-50/50">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ml-3 shadow-lg ${userRole === 'SUPER_ADMIN' ? 'bg-gray-800' : 'bg-primary'}`}>
                {userRole === 'SUPER_ADMIN' ? <ShieldCheck size={24}/> : <Building2 size={24}/>}
            </div>
            <div>
                <h1 className="text-lg font-bold text-gray-800">نظام المدرس</h1>
                <p className="text-[10px] text-gray-500">{currentUser?.name || 'مستخدم'}</p>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded inline-block mt-1 ${userRole === 'SUPER_ADMIN' ? 'bg-gray-200 text-gray-800' : 'bg-teal-100 text-teal-800'}`}>
                    {userRole === 'SUPER_ADMIN' ? 'مدير النظام' : userRole === 'SCHOOL_MANAGER' ? 'مدير المدرسة' : 'معلم'}
                </div>
            </div>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {filteredNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setCurrentView(item.id as ViewState); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === item.id ? 'bg-primary/10 text-primary font-bold shadow-sm border border-primary/10' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-500 hover:bg-red-50 hover:text-red-700">
                <LogOut size={20} /> <span>تسجيل الخروج</span>
            </button>
          </div>
        </nav>
        <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between text-xs mb-2">
                 <span className="font-bold text-gray-600 flex items-center gap-1"><Cloud size={10}/> السحابة</span>
                 {isBgSyncing ? <RefreshCw size={12} className="animate-spin text-blue-500"/> : (isDemo ? <span className="text-orange-500 font-bold">تجريبي</span> : <CheckCircle size={12} className="text-green-500"/>)}
            </div>
            
            {!isDemo && (
                <button 
                    onClick={() => handleForceSync(false)} 
                    disabled={isBgSyncing}
                    className="w-full bg-white border border-gray-300 rounded-lg py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 hover:text-primary flex items-center justify-center gap-2 transition-colors mb-2 shadow-sm"
                >
                    <RefreshCw size={12} className={isBgSyncing ? "animate-spin" : ""}/> 
                    {isBgSyncing ? 'جاري التحديث...' : 'تحديث البيانات'}
                </button>
            )}

            <p className="text-[10px] text-gray-400 text-center">
                {lastSyncTime ? `آخر تحديث: ${lastSyncTime}` : 'متصل بالسحابة'}
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
                    {filteredNavItems.map(item => (
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
                    
                    <div className="my-4 border-t pt-4">
                        {!isDemo && (
                            <button 
                                onClick={() => { handleForceSync(false); setIsMobileMenuOpen(false); }} 
                                disabled={isBgSyncing}
                                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2 transition-colors mb-2"
                            >
                                <RefreshCw size={16} className={isBgSyncing ? "animate-spin" : ""}/> 
                                {isBgSyncing ? 'جاري التحديث...' : 'تحديث البيانات'}
                            </button>
                        )}
                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-red-500 hover:bg-red-50 hover:text-red-700">
                            <LogOut size={20} /> <span>تسجيل الخروج</span>
                        </button>
                    </div>
                </nav>
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-full w-full relative">
        {/* Demo Banner */}
        {isDemo && (
            <div className="bg-orange-500 text-white text-xs font-bold text-center py-1 z-50 flex items-center justify-center gap-2">
                <Beaker size={14} className="fill-white/20"/>
                أنت في وضع التجربة (Demo Mode) - البيانات وهمية وغير محفوظة.
            </div>
        )}

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
            {currentView === 'DASHBOARD' && (
                <Dashboard 
                    students={students} 
                    attendance={attendance} 
                    performance={performance}
                    selectedDate={globalDate} // Pass Global Date
                    currentUser={currentUser} // Pass User for context
                />
            )}
            {/* School Management is for School Manager AND Teacher Profile */}
            {currentView === 'SCHOOL_MANAGEMENT' && <SchoolManagement students={students} onImportStudents={handleBulkAddStudents} onImportPerformance={handleBulkAddPerformance} onImportAttendance={handleBulkAddAttendance} currentUser={currentUser}/>}
            
            {/* Admin Dashboard is strictly for System Manager */}
            {currentView === 'ADMIN_DASHBOARD' && <AdminDashboard />}
            
            {currentView === 'STUDENTS' && <Students students={students} onAddStudent={handleAddStudent} onUpdateStudent={handleUpdateStudent} onDeleteStudent={handleDeleteStudent} onImportStudents={handleBulkAddStudents}/>}
            {currentView === 'ATTENDANCE' && (
                <Attendance 
                    students={students} 
                    attendanceHistory={attendance} 
                    onSaveAttendance={handleSaveAttendance} 
                    onImportAttendance={handleBulkAddAttendance}
                    selectedDate={globalDate} // Use Global Date
                    onDateChange={setGlobalDate} // Update Global Date
                />
            )}
            {currentView === 'MONTHLY_REPORT' && <MonthlyReport students={students} attendance={attendance}/>}
            {currentView === 'MESSAGE_CENTER' && <MessageCenter students={students} attendance={attendance} performance={performance}/>}
            {currentView === 'WORKS_TRACKING' && <WorksTracking students={students} performance={performance} attendance={attendance} onAddPerformance={handleBulkAddPerformance}/>}
            {currentView === 'STUDENT_FOLLOWUP' && <StudentFollowUp students={students} performance={performance} attendance={attendance}/>}
            {currentView === 'PERFORMANCE' && <Performance students={students} performance={performance} onAddPerformance={handleAddPerformance} onImportPerformance={handleBulkAddPerformance}/>}
            {currentView === 'AI_REPORTS' && <AIReports students={students} attendance={attendance} performance={performance}/>}
            {currentView === 'AI_TOOLS' && <AITools students={students} performance={performance} />}
            {currentView === 'LESSON_PLANNING' && <LessonPlanning />}
            {currentView === 'CLASSROOM_MANAGEMENT' && (
                <ClassroomManager 
                    students={students} 
                    attendance={attendance}
                    performance={performance}
                    onLaunchScreen={() => setCurrentView('CLASSROOM_SCREEN')}
                    onNavigateToAttendance={() => setCurrentView('ATTENDANCE')}
                    onSaveSeating={handleSaveSeating} // Pass the handler
                    onSaveAttendance={handleSaveAttendance} // Need this for embedded attendance
                    onImportAttendance={handleBulkAddAttendance} // And this
                    selectedDate={globalDate} // Global Date
                    onDateChange={setGlobalDate} // Global Date Setter
                    currentUser={currentUser} // Pass Current User for Teacher Schedule
                />
            )}
            {currentView === 'CUSTOM_TABLES' && <CustomTablesView />}
            {currentView === 'DATA_IMPORT' && <DataImport onImportStudents={handleBulkAddStudents} onImportPerformance={handleBulkAddPerformance} onImportAttendance={handleBulkAddAttendance} existingStudents={students}/>}
            {currentView === 'AI_DATA_IMPORT' && <AIDataImport onImportStudents={handleBulkAddStudents} onImportPerformance={handleBulkAddPerformance} onImportAttendance={handleBulkAddAttendance} />}
        </div>
      </main>
    </div>
  );
};

export default App;
