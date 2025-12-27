
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
    fetchStudents, fetchAttendance, fetchPerformance, saveAttendance, 
    addPerformance, deletePerformance, getUserTheme,
    addStudent, updateStudent, deleteStudent, downloadFromSupabase,
    getTeachers, getLessonPlans, getBehaviorIncidents
} from './services/storageService';
import { SystemUser, Student, AttendanceRecord, PerformanceRecord, UserTheme, StoredLessonPlan } from './types';

// Components
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
import ResourcesView from './components/ResourcesView';
import AdminDashboard from './components/AdminDashboard';
import ReportsCenter from './components/ReportsCenter';
import BehaviorTracking from './components/BehaviorTracking';
import TasksManager from './components/TasksManager';
import TeacherInbox from './components/TeacherInbox';
import SmartBadges from './components/SmartBadges';
import ChallengesManager from './components/ChallengesManager';
import RewardsManager from './components/RewardsManager';
import NoorExporter from './components/NoorExporter';
import CurriculumManager from './components/CurriculumManager';
import QuestionBank from './components/QuestionBank';
import AutoGrading from './components/AutoGrading';
import FlexibleTrackingSheet from './components/FlexibleTrackingSheet';
import TeacherAIConfig from './components/TeacherAIConfig';
import ScheduleView from './components/ScheduleView';
import LessonPlanning from './components/LessonPlanning';
import PrincipalDashboard from './components/PrincipalDashboard';
import StudentAchievementTimeline from './components/StudentAchievementTimeline';
import SchoolWall from './components/SchoolWall';
import SharedLibrary from './components/SharedLibrary';
import CertificatesCenter from './components/CertificatesCenter';
import TeacherStats from './components/TeacherStats';
import StudentClubs from './components/StudentClubs';
import MeetingScheduler from './components/MeetingScheduler';
import InterventionLog from './components/InterventionLog';
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
    const [lessonPlans, setLessonPlans] = useState<StoredLessonPlan[]>([]);
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
            await downloadFromSupabase(role === 'SUPER_ADMIN' || role === 'SCHOOL_MANAGER' ? undefined : userId);
            setStudents(JSON.parse(localStorage.getItem('local_students') || '[]'));
            setAttendance(JSON.parse(localStorage.getItem('local_attendance') || '[]'));
            setPerformance(JSON.parse(localStorage.getItem('local_performance') || '[]'));
            setLessonPlans(getLessonPlans(userId));
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
                <Route path="/inbox" element={<TeacherInbox currentUser={currentUser as SystemUser} />} />
                <Route path="/schedule" element={<ScheduleView currentUser={currentUser as SystemUser} />} />
                <Route path="/wall" element={<SchoolWall currentUser={currentUser as SystemUser} students={students} />} />
                <Route path="/library" element={<SharedLibrary currentUser={currentUser as SystemUser} />} />
                <Route path="/portfolio" element={<TeacherStats students={students} attendance={attendance} performance={performance} plans={lessonPlans} />} />
                <Route path="/clubs" element={<StudentClubs students={students} currentUser={currentUser as SystemUser} />} />
                <Route path="/meetings" element={<MeetingScheduler currentUser={currentUser as SystemUser} isTeacherView={true} />} />
                <Route path="/interventions" element={<InterventionLog students={students} incidents={getBehaviorIncidents()} currentUser={currentUser as SystemUser} />} />
                <Route path="/students" element={<Students students={students} attendance={attendance} performance={performance} onAddStudent={async (s) => { await addStudent(s); refreshCloudData(); }} onUpdateStudent={async (s) => { await updateStudent(s); refreshCloudData(); }} onDeleteStudent={async (id) => { await deleteStudent(id); refreshCloudData(); }} onImportStudents={() => refreshCloudData()} currentUser={currentUser as SystemUser} />} />
                <Route path="/attendance" element={<Attendance students={students} attendanceHistory={attendance} onSaveAttendance={async (recs) => { await saveAttendance(recs); refreshCloudData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/behavior" element={<BehaviorTracking students={students} currentUser={currentUser as SystemUser} />} />
                <Route path="/messages" element={<MessageCenter students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/followup" element={<StudentFollowUp students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/works" element={<WorksTracking students={students} attendance={attendance} performance={performance} onAddPerformance={async (recs)=>{ await addPerformance(recs); refreshCloudData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/performance" element={<Performance students={students} performance={performance} attendance={attendance} onAddPerformance={async (recs: PerformanceRecord[]) => { await addPerformance(recs); refreshCloudData(); }} onDeletePerformance={async (id) => { await deletePerformance(id); refreshCloudData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/tasks" element={<TasksManager students={students} currentUser={currentUser as SystemUser} />} />
                <Route path="/exams" element={<ExamsManager currentUser={currentUser as SystemUser} />} />
                <Route path="/questions" element={<QuestionBank currentUser={currentUser as SystemUser} />} />
                <Route path="/auto-grading" element={<AutoGrading currentUser={currentUser as SystemUser} />} />
                <Route path="/flexible-tracking" element={<FlexibleTrackingSheet currentUser={currentUser as SystemUser} />} />
                <Route path="/classroom" element={<ClassroomManager students={students} attendance={attendance} performance={performance} onLaunchScreen={() => navigate('/screen')} onNavigateToAttendance={() => navigate('/attendance')} onSaveAttendance={async (recs) => { await saveAttendance(recs); refreshCloudData(); }} onImportAttendance={async (recs)=>{ await saveAttendance(recs); refreshCloudData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/forms" element={<FormsAnalyzer students={students} currentUserId={currentUser?.id || ''} />} />
                <Route path="/lab" element={<LearningLab students={students} currentUserId={currentUser?.id || ''} />} />
                <Route path="/curriculum" element={<CurriculumManager currentUser={currentUser as SystemUser} />} />
                <Route path="/planning" element={<LessonPlanning currentUser={currentUser as SystemUser} />} />
                <Route path="/badges" element={<SmartBadges students={students} />} />
                <Route path="/resources" element={<ResourcesView currentUser={currentUser as SystemUser} />} />
                <Route path="/certificates" element={<CertificatesCenter students={students} currentUser={currentUser as SystemUser} onSaveAttendance={async (recs) => { await saveAttendance(recs); refreshCloudData(); }} />} />
                <Route path="/leaderboard" element={<Leaderboard students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/challenges" element={<ChallengesManager currentUser={currentUser as SystemUser} />} />
                <Route path="/shop-admin" element={<RewardsManager currentUser={currentUser as SystemUser} />} />
                <Route path="/noor" element={<NoorExporter students={students} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/reports" element={<ReportsCenter students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/school-mgmt" element={<SchoolManagementComponent students={students} onImportStudents={()=>{}} onImportPerformance={()=>{}} onImportAttendance={()=>{}} currentUser={currentUser as SystemUser} onUpdateTheme={()=>{}}/>} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/principal" element={<PrincipalDashboard students={students} attendance={attendance} performance={performance} teachers={getTeachers()} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </TeacherPortal>
    );

    return (
        <div className={`min-h-screen ${theme.mode === 'DARK' ? 'dark bg-gray-900 text-white' : 'bg-gray-50'}`}>
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
