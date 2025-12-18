
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Student, AttendanceRecord, PerformanceRecord, SystemUser, UserTheme } from './types';
import { 
    getStudents, getAttendance, getPerformance, 
    addStudent, updateStudent, deleteStudent, 
    saveAttendance, addPerformance, deletePerformance, 
    bulkAddStudents, bulkAddPerformance, bulkAddAttendance, 
    getUserTheme, bulkUpsertStudents,
    setSystemMode, subscribeToSyncStatus, subscribeToDataChanges, SyncStatus,
    initRealtimeSync, stopRealtimeSync, initAutoSync
} from './services/storageService';
import { isSupabaseConfigured } from './services/supabaseClient';
import { checkAIConnection } from './services/geminiService';
import { WifiOff, Loader2, Sparkles } from 'lucide-react';

import Login from './components/Login';
import StudentPortal from './components/StudentPortal';
import ParentPortal from './components/ParentPortal';
import TeacherPortal from './components/TeacherPortal';
import ReloadPrompt from './components/ReloadPrompt';

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
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [theme, setTheme] = useState<UserTheme>({ mode: 'LIGHT', backgroundStyle: 'FLAT' });
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');
    const [aiStatus, setAiStatus] = useState('IDLE');
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const navigate = useNavigate();

    const refreshData = () => {
        try {
            const userJson = localStorage.getItem('current_user');
            const activeUser = userJson ? JSON.parse(userJson) : currentUser;
            
            let allStudents = getStudents();
            let allAttendance = getAttendance();
            let allPerformance = getPerformance();
            
            // Apply STRICT Role Filtering
            if (activeUser) {
                if (activeUser.role === 'TEACHER') {
                    // المعلم يرى فقط الطلاب التابعين لمدرسته أو الذين قام بإنشائهم
                    allStudents = allStudents.filter(s => 
                        (activeUser.schoolId && s.schoolId === activeUser.schoolId) || 
                        s.createdById === activeUser.id || !s.createdById
                    );
                } else if (activeUser.role === 'SCHOOL_MANAGER') {
                    // مدير المدرسة يرى فقط طلاب مدرسته
                    allStudents = allStudents.filter(s => s.schoolId === activeUser.schoolId);
                }
                // SUPER_ADMIN sees everything (no filter)
            }

            setStudents(allStudents);
            setAttendance(allAttendance);
            setPerformance(allPerformance);
            setTheme(getUserTheme());
        } catch (err) {
            console.error("Critical error refreshing data", err);
        }
    };

    useEffect(() => {
        const bootApp = async () => {
            setIsAppLoading(true);
            try {
                const saved = localStorage.getItem('current_user');
                if (saved && saved !== "undefined") {
                    const parsed = JSON.parse(saved);
                    if (parsed && parsed.id) setCurrentUser(parsed);
                }

                if (isSupabaseConfigured()) {
                    await initAutoSync();
                    initRealtimeSync();
                }

                refreshData();
                checkAIConnection().then(res => setAiStatus(res.success ? 'CONNECTED' : 'ERROR')).catch(() => {});
            } catch (err) {
                console.error("App boot sequence failed", err);
            } finally {
                setTimeout(() => setIsAppLoading(false), 800);
            }
        };

        bootApp();

        const unsubSync = subscribeToSyncStatus(setSyncStatus);
        const unsubData = subscribeToDataChanges(refreshData);
        
        const handleOnline = () => { setIsOnline(true); setSystemMode(true); };
        const handleOffline = () => { setIsOnline(false); setSystemMode(false); };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            unsubSync(); unsubData(); stopRealtimeSync();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const login = (user: SystemUser, remember: boolean) => {
        setCurrentUser(user);
        if (remember) localStorage.setItem('current_user', JSON.stringify(user));
        refreshData();
        navigate('/');
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('current_user');
        stopRealtimeSync();
        navigate('/');
    };

    if (isAppLoading) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 text-indigo-600">
                <div className="relative mb-6">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl animate-bounce">
                        <Sparkles size={40} className="animate-pulse" />
                    </div>
                </div>
                <Loader2 size={32} className="animate-spin mb-4" />
                <h2 className="text-xl font-bold text-gray-800 animate-pulse">جاري التحقق من الصلاحيات...</h2>
                <p className="text-sm text-gray-400 mt-2 font-medium">Smart School Engine v2.5</p>
            </div>
        );
    }

    const contextValue: AppContextType = {
        currentUser, students, attendance, performance, theme, syncStatus, aiStatus,
        refreshData, login, logout,
        addStudent: (s) => { addStudent(s); refreshData(); },
        updateStudent: (s) => { updateStudent(s); refreshData(); },
        deleteStudent: (id) => { deleteStudent(id); refreshData(); },
        saveAttendance: (recs) => { saveAttendance(recs); refreshData(); },
        addPerformance: (p) => { if (Array.isArray(p)) bulkAddPerformance(p); else addPerformance(p); refreshData(); },
        deletePerformance: (id) => { deletePerformance(id); refreshData(); },
        importStudents: (d, k, s, f) => { if (s === 'UPDATE') bulkUpsertStudents(d, k); else bulkAddStudents(d); refreshData(); },
        importAttendance: (r) => { bulkAddAttendance(r); refreshData(); },
        importPerformance: (r) => { bulkAddPerformance(r); refreshData(); }
    };

    return (
        <AppContext.Provider value={contextValue}>
            <div className="h-full flex flex-col font-sans">
                <ReloadPrompt />
                {!isOnline && (
                    <div className="bg-red-600 text-white text-[10px] font-bold text-center py-1 z-[9999] flex items-center justify-center gap-2">
                        <WifiOff size={12} /> وضع عدم الاتصال: التغييرات تحفظ محلياً
                    </div>
                )}
                {!currentUser ? (
                    <Login onLoginSuccess={login} />
                ) : currentUser.role === 'STUDENT' ? (
                    <StudentPortal currentUser={currentUser as any} attendance={attendance} performance={performance} onLogout={logout} />
                ) : currentUser.role === 'PARENT' ? (
                    <ParentPortal parentPhone={currentUser.email} allStudents={students} attendance={attendance} performance={performance} onLogout={logout} />
                ) : (
                    <TeacherPortal 
                        currentUser={currentUser} students={students} attendance={attendance} performance={performance}
                        syncStatus={syncStatus} aiStatus={aiStatus} onLogout={logout}
                        addStudent={contextValue.addStudent} updateStudent={contextValue.updateStudent} deleteStudent={contextValue.deleteStudent}
                        saveAttendance={contextValue.saveAttendance} addPerformance={contextValue.addPerformance} deletePerformance={contextValue.deletePerformance}
                        importStudents={contextValue.importStudents} importAttendance={contextValue.importAttendance} importPerformance={contextValue.importPerformance}
                        setTheme={setTheme}
                    />
                )}
            </div>
        </AppContext.Provider>
    );
};

export default App;
