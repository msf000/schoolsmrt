
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
    fetchStudents, fetchAttendance, fetchPerformance, saveAttendance, 
    addPerformance, deletePerformance, getUserTheme,
    addStudent, updateStudent, deleteStudent
} from './services/storageService';
import { SystemUser, Student, AttendanceRecord, PerformanceRecord, UserTheme } from './types';
import Login from './components/Login';
import TeacherPortal from './components/TeacherPortal';
import StudentPortal from './components/StudentPortal';
import ParentPortal from './components/ParentPortal';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Attendance from './components/Attendance';
import Performance from './components/Performance';
import SchoolManagementComponent from './components/SchoolManagement';
import StudentFollowUp from './components/StudentFollowUp';
import Leaderboard from './components/Leaderboard';
import ExamsManager from './components/ExamsManager';
import MessageCenter from './components/MessageCenter';
import ClassroomManager from './components/ClassroomManager';
import ClassroomScreen from './components/ClassroomScreen';
import WorksTracking from './components/WorksTracking';
import FormsAnalyzer from './components/FormsAnalyzer';
import LearningLab from './components/LearningLab';
import CustomTablesView from './components/CustomTablesView';
import ResourcesView from './components/ResourcesView';
import ScheduleView from './components/ScheduleView';
import ReloadPrompt from './components/ReloadPrompt';
import AdminDashboard from './components/AdminDashboard';
import ReportsCenter from './components/ReportsCenter';
import BehaviorTracking from './components/BehaviorTracking';
import TasksManager from './components/TasksManager';
import TeacherInbox from './components/TeacherInbox';
import CertificatesCenter from './components/CertificatesCenter';
import SmartBadges from './components/SmartBadges';
import ChallengesManager from './components/ChallengesManager';
import RewardsManager from './components/RewardsManager';
import NoorExporter from './components/NoorExporter';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import TeacherSubscription from './components/TeacherSubscription';
import TeacherProfile from './components/TeacherProfile';
import ClassStrategy from './components/ClassStrategy';
import BehaviorAnalyzer from './components/BehaviorAnalyzer';
import HallOfFame from './components/HallOfFame';
import { RefreshCw } from 'lucide-react';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<SystemUser | Student | null>(() => {
        try {
            const savedUser = localStorage.getItem('current_user');
            return savedUser ? JSON.parse(savedUser) : null;
        } catch { return null; }
    });

    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [theme] = useState<UserTheme>(getUserTheme());
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();
    const location = useLocation();

    const refreshCloudData = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const userId = currentUser.id;
            const role = (currentUser as any).role;
            
            const [stds, atts, perfs] = await Promise.all([
                fetchStudents(),
                fetchAttendance(role === 'SUPER_ADMIN' ? undefined : userId),
                fetchPerformance(role === 'SUPER_ADMIN' ? undefined : userId)
            ]);

            setStudents(stds);
            setAttendance(atts);
            setPerformance(perfs);
            
            localStorage.setItem('local_students', JSON.stringify(stds));
            localStorage.setItem('local_attendance', JSON.stringify(atts));
            localStorage.setItem('local_performance', JSON.stringify(perfs));
            
        } catch (e) {
            console.error("Data fetch error:", e);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            refreshCloudData();
        }
    }, [currentUser, refreshCloudData]);

    const handleLoginSuccess = (user: any, rememberMe: boolean) => {
        setCurrentUser(user);
        if (rememberMe) localStorage.setItem('current_user', JSON.stringify(user));
        navigate('/');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('current_user');
        localStorage.clear();
        navigate('/login');
    };

    if (!currentUser && location.pathname !== '/login') return <Navigate to="/login" replace />;

    const teacherRoutes = (
        <TeacherPortal currentUser={currentUser as SystemUser} onLogout={handleLogout}>
            {isLoading && (
                <div className="fixed top-4 left-4 z-[200] bg-indigo-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 shadow-2xl animate-pulse">
                    <RefreshCw className="animate-spin" size={12}/> جاري المزامنة...
                </div>
            )}
            <Routes>
                <Route path="/" element={<Dashboard students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} onNavigate={(v: string) => navigate(v)} />} />
                <Route path="/students" element={<Students students={students} attendance={attendance} performance={performance} onAddStudent={async (s) => { await addStudent(s); refreshCloudData(); }} onUpdateStudent={async (s) => { await updateStudent(s); refreshCloudData(); }} onDeleteStudent={async (id) => { await deleteStudent(id); refreshCloudData(); }} onImportStudents={() => refreshCloudData()} currentUser={currentUser as SystemUser} />} />
                <Route path="/attendance" element={<Attendance students={students} attendanceHistory={attendance} onSaveAttendance={async (recs) => { await saveAttendance(recs); refreshCloudData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/performance" element={<Performance students={students} performance={performance} attendance={attendance} onAddPerformance={async (recs) => { await addPerformance(recs); refreshCloudData(); }} onImportPerformance={async (recs) => { await addPerformance(recs); refreshCloudData(); }} onDeletePerformance={async (id) => { await deletePerformance(id); refreshCloudData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/behavior" element={<BehaviorTracking students={students} currentUser={currentUser as SystemUser} />} />
                <Route path="/behavior-analysis" element={<BehaviorAnalyzer students={students} currentUser={currentUser as SystemUser} />} />
                <Route path="/tasks" element={<TasksManager students={students} currentUser={currentUser as SystemUser} />} />
                <Route path="/reports" element={<ReportsCenter students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/school-mgmt" element={<SchoolManagementComponent students={students} onImportStudents={()=>{}} onImportPerformance={()=>{}} onImportAttendance={()=>{}} currentUser={currentUser as SystemUser} onUpdateTheme={()=>{}}/>} />
                <Route path="/followup" element={<StudentFollowUp students={students} performance={performance} attendance={attendance} currentUser={currentUser as SystemUser} onSaveAttendance={async (recs) => { await saveAttendance(recs); refreshCloudData(); }}/>} />
                <Route path="/leaderboard" element={<Leaderboard students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/exams" element={<ExamsManager currentUser={currentUser as SystemUser} />} />
                <Route path="/messages" element={<MessageCenter students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/certificates" element={<CertificatesCenter students={students} currentUser={currentUser as SystemUser} onSaveAttendance={async (recs) => { await saveAttendance(recs); refreshCloudData(); }} />} />
                <Route path="/classroom" element={<ClassroomManager students={students} attendance={attendance} performance={performance} onLaunchScreen={() => navigate('/screen')} onNavigateToAttendance={() => navigate('/attendance')} onSaveAttendance={async (recs) => { await saveAttendance(recs); refreshCloudData(); }} onImportAttendance={async (recs)=>{ await saveAttendance(recs); refreshCloudData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/works" element={<WorksTracking students={students} attendance={attendance} performance={performance} onAddPerformance={async (recs)=>{ await addPerformance(recs); refreshCloudData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/badges" element={<SmartBadges students={students} />} />
                <Route path="/forms" element={<FormsAnalyzer students={students} currentUserId={currentUser?.id || ''} />} />
                <Route path="/lab" element={<LearningLab students={students} currentUserId={currentUser?.id} />} />
                <Route path="/custom-tables" element={<CustomTablesView currentUser={currentUser as SystemUser} />} />
                <Route path="/resources" element={<ResourcesView currentUser={currentUser as SystemUser} />} />
                <Route path="/schedule" element={<ScheduleView currentUser={currentUser as SystemUser} onNavigateToAttendance={() => navigate('/attendance')} />} />
                <Route path="/inbox" element={<TeacherInbox currentUser={currentUser as SystemUser} />} />
                <Route path="/challenges" element={<ChallengesManager currentUser={currentUser as SystemUser} />} />
                <Route path="/shop-admin" element={<RewardsManager currentUser={currentUser as SystemUser} />} />
                <Route path="/noor" element={<NoorExporter students={students} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/analytics" element={<AdvancedAnalytics students={students} attendance={attendance} performance={performance} />} />
                <Route path="/subscription" element={<TeacherSubscription currentUser={currentUser as SystemUser} />} />
                <Route path="/profile" element={<TeacherProfile currentUser={currentUser as SystemUser} />} />
                <Route path="/strategy" element={<ClassStrategy students={students} currentUserId={currentUser?.id} />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/hall-of-fame" element={<HallOfFame students={students} attendance={attendance} performance={performance} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </TeacherPortal>
    );

    return (
        <div className={`min-h-screen ${theme.mode === 'DARK' ? 'dark bg-gray-900 text-white' : 'bg-gray-50'}`}>
            <ReloadPrompt />
            <Routes>
                <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
                {currentUser?.role === 'STUDENT' ? (
                    <Route path="/*" element={<StudentPortal currentUser={currentUser as Student} attendance={attendance} performance={performance} onLogout={handleLogout} />} />
                ) : currentUser?.role === 'PARENT' ? (
                    <Route path="/*" element={<ParentPortal parentPhone={(currentUser as any).phone} allStudents={students} attendance={attendance} performance={performance} onLogout={handleLogout} />} />
                ) : (
                    <Route path="/*" element={teacherRoutes} />
                )}
                <Route path="/screen" element={<ClassroomScreen students={students} attendance={attendance} onSaveAttendance={async (recs) => { await saveAttendance(recs); refreshCloudData(); }} currentUser={currentUser as SystemUser} />} />
            </Routes>
        </div>
    );
};

export default App;
