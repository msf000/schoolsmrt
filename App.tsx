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
    forceRefreshData, initRealtimeSync, stopRealtimeSync, initAutoSync
} from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { checkAIConnection } from './services/geminiService';
import { WifiOff } from 'lucide-react';

// Imports
import Login from './components/Login';
import StudentPortal from './components/StudentPortal';
import ParentPortal from './components/ParentPortal';
import TeacherPortal from './components/TeacherPortal';
import ReloadPrompt from './components/ReloadPrompt';

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

const App: React.FC = () => {
    // Auth State with Safe Initialization
    const [currentUser, setCurrentUser] = useState<SystemUser | null>(() => {
        try {
            const saved = localStorage.getItem('current_user');
            if (!saved || saved === "undefined" || saved === "null") return null;
            const parsed = JSON.parse(saved);
            // Validate essential fields to prevent crash
            if (!parsed || !parsed.id || !parsed.role || !parsed.name) return null;
            return parsed;
        } catch (e) {
            console.error("Failed to parse user", e);
            localStorage.removeItem('current_user');
            return null;
        }
    });

    // Data State
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [theme, setTheme] = useState<UserTheme>({ mode: 'LIGHT', backgroundStyle: 'FLAT' });
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');
    const [aiStatus, setAiStatus] = useState('IDLE');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    const navigate = useNavigate();

    // Network Status Listener
    useEffect(() => {
        const handleOnline = () => { setIsOnline(true); setSystemMode(true); };
        const handleOffline = () => { setIsOnline(false); setSystemMode(false); };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Theme Application Effect
    useEffect(() => {
        const root = document.documentElement;
        if (theme.mode === 'DARK') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        
        if (theme.backgroundStyle === 'GRADIENT') {
             document.body.style.background = theme.mode === 'DARK' 
                ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' 
                : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
             document.body.style.backgroundAttachment = 'fixed';
        } else {
             document.body.style.background = '';
             document.body.style.backgroundColor = theme.mode === 'DARK' ? '#111827' : '#f9fafb';
        }
    }, [theme]);

    // Init Logic
    useEffect(() => {
        // ALWAYS try to sync on app load, even if not logged in (for parent portal data etc)
        if (isSupabaseConfigured()) {
            initAutoSync().then(refreshData);
            if (currentUser) initRealtimeSync();
        }

        if (currentUser) {
            refreshData();
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
        
        if (currentUser && currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'PARENT') {
             if (currentUser.role === 'TEACHER') {
                 allStudents = allStudents.filter(s => (currentUser.schoolId && s.schoolId === currentUser.schoolId) || s.createdById === currentUser.id || !s.createdById);
             }
        }
        setStudents(allStudents);
        setAttendance(allAttendance);
        setPerformance(allPerformance);
        setTheme(getUserTheme());
    };

    const login = (user: SystemUser, remember: boolean) => {
        if (!user || !user.id || !user.role) {
            alert('بيانات المستخدم غير صالحة');
            return;
        }
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
    const handleImportStudents = (d: Student[], k: any, s: any, f?: any[]) => { 
        const e = d.map(x => ({...x, createdById: currentUser?.id, schoolId: currentUser?.schoolId}));
        if (s === 'UPDATE') bulkUpsertStudents(e, k); else bulkAddStudents(e); 
        refreshData(); 
    };
    const handleImportAttendance = (r: AttendanceRecord[]) => { bulkAddAttendance(r.map(x => ({...x, createdById: currentUser?.id}))); refreshData(); };
    const handleImportPerformance = (r: PerformanceRecord[]) => { bulkAddPerformance(r.map(x => ({...x, createdById: currentUser?.id}))); refreshData(); };

    const contextValue: AppContextType = {
        currentUser, students, attendance, performance, theme, syncStatus, aiStatus,
        refreshData, login, logout,
        addStudent: handleAddStudent,
        updateStudent: handleUpdateStudent,
        deleteStudent: handleDeleteStudent,
        saveAttendance: handleSaveAttendance,
        addPerformance: handleAddPerformance,
        deletePerformance: handleDeletePerformance,
        importStudents: handleImportStudents,
        importAttendance: handleImportAttendance,
        importPerformance: handleImportPerformance
    };

    return (
        <div className="h-full flex flex-col">
            <ReloadPrompt />
            
            {!isOnline && (
                <div className="bg-red-600 text-white text-xs font-bold text-center py-1 z-[9999] shadow-md flex items-center justify-center gap-2">
                    <WifiOff size={14} />
                    وضع عدم الاتصال: يتم حفظ البيانات محلياً وسيتم المزامنة عند عودة الإنترنت
                </div>
            )}

            {!currentUser || !currentUser.id ? (
                <Login onLoginSuccess={login} />
            ) : currentUser.role === 'STUDENT' ? (
                <StudentPortal 
                    currentUser={currentUser as any} 
                    attendance={attendance} 
                    performance={performance} 
                    onLogout={logout} 
                />
            ) : currentUser.role === 'PARENT' ? (
                <ParentPortal 
                    parentPhone={currentUser.email} 
                    allStudents={getStudents()} 
                    attendance={getAttendance()} 
                    performance={getPerformance()} 
                    onLogout={logout} 
                />
            ) : (
                <AppContext.Provider value={contextValue}>
                    <TeacherPortal 
                        currentUser={currentUser}
                        students={students}
                        attendance={attendance}
                        performance={performance}
                        syncStatus={syncStatus}
                        aiStatus={aiStatus}
                        onLogout={logout}
                        addStudent={handleAddStudent}
                        updateStudent={handleUpdateStudent}
                        deleteStudent={handleDeleteStudent}
                        saveAttendance={handleSaveAttendance}
                        addPerformance={handleAddPerformance}
                        deletePerformance={handleDeletePerformance}
                        importStudents={handleImportStudents}
                        importAttendance={handleImportAttendance}
                        importPerformance={handleImportPerformance}
                        setTheme={setTheme}
                    />
                </AppContext.Provider>
            )}
        </div>
    );
};

export default App;