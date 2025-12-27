
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { SystemUser, Student, AttendanceRecord, PerformanceRecord } from './types';
import TeacherPortal from './components/TeacherPortal';
import StudentPortal from './components/StudentPortal';
import ParentPortal from './components/ParentPortal';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Attendance from './components/Attendance';
import Performance from './components/Performance';
import AIReports from './components/AIReports';
import WorksTracking from './components/WorksTracking';
import StudentFollowUp from './components/StudentFollowUp';
import ClassroomManager from './components/ClassroomManager';
import ClassroomScreen from './components/ClassroomScreen';
import ExamsManager from './components/ExamsManager';
import QuestionBank from './components/QuestionBank';
import GamesBuilder from './components/GamesBuilder';
import SharedLibrary from './components/SharedLibrary';
import BehaviorTracking from './components/BehaviorTracking';
import LearningLab from './components/LearningLab';
import ReportsCenter from './components/ReportsCenter';
import TeacherInbox from './components/TeacherInbox';
import LessonPlanning from './components/LessonPlanning';
import CertificatesCenter from './components/CertificatesCenter';
import SmartBadges from './components/SmartBadges';
import InterventionLog from './components/InterventionLog';
import ScheduleView from './components/ScheduleView';
import HallOfFame from './components/HallOfFame';
import AdminDashboard from './components/AdminDashboard';
import SchoolManagement from './components/SchoolManagement';
import PrincipalDashboard from './components/PrincipalDashboard';
import TeacherProfile from './components/TeacherProfile';
import TeacherAIConfig from './components/TeacherAIConfig';
import TeacherSubscription from './components/TeacherSubscription';
import { fetchStudents, fetchAttendance, fetchPerformance, getBehaviorIncidents, fetchTeachers } from './services/storageService';
import Login from './components/Login';
import ReloadPrompt from './components/ReloadPrompt';
import AIChatBot from './components/AIChatBot';

const App: React.FC = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<SystemUser | Student | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('current_user');
        if (saved) setCurrentUser(JSON.parse(saved));
        loadData();
    }, []);

    const loadData = async () => {
        const stds = await fetchStudents();
        const att = await fetchAttendance();
        const perf = await fetchPerformance();
        const tchs = await fetchTeachers();
        setStudents(stds);
        setAttendance(att);
        setPerformance(perf);
        setTeachers(tchs);
    };

    const handleLoginSuccess = (user: any) => {
        setCurrentUser(user);
        localStorage.setItem('current_user', JSON.stringify(user));
        navigate('/');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('current_user');
        navigate('/login');
    };

    if (!currentUser) return <Login onLoginSuccess={handleLoginSuccess} />;

    const teacherRoutes = (
        <TeacherPortal currentUser={currentUser as SystemUser} onLogout={handleLogout}>
            <Routes>
                <Route path="/" element={<Dashboard students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} onNavigate={(path) => navigate(path)} />} />
                <Route path="/students" element={<Students students={students} attendance={attendance} performance={performance} onAddStudent={loadData} onUpdateStudent={loadData} onDeleteStudent={loadData} onImportStudents={loadData} currentUser={currentUser as SystemUser} />} />
                <Route path="/attendance" element={<Attendance students={students} attendanceHistory={attendance} onSaveAttendance={loadData} currentUser={currentUser as SystemUser} />} />
                <Route path="/performance" element={<Performance students={students} performance={performance} attendance={attendance} onAddPerformance={loadData} onDeletePerformance={loadData} currentUser={currentUser as SystemUser} />} />
                <Route path="/works" element={<WorksTracking students={students} performance={performance} attendance={attendance} onAddPerformance={loadData} currentUser={currentUser as SystemUser} />} />
                <Route path="/followup" element={<StudentFollowUp students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/classroom" element={<ClassroomManager students={students} attendance={attendance} performance={performance} onLaunchScreen={() => navigate('/classroom-screen')} onNavigateToAttendance={() => navigate('/attendance')} onSaveAttendance={loadData} onImportAttendance={loadData} currentUser={currentUser as SystemUser} />} />
                <Route path="/exams" element={<ExamsManager currentUser={currentUser as SystemUser} />} />
                <Route path="/bank" element={<QuestionBank currentUser={currentUser as SystemUser} />} />
                <Route path="/games" element={<GamesBuilder currentUser={currentUser as SystemUser} />} />
                <Route path="/library" element={<SharedLibrary currentUser={currentUser as SystemUser} />} />
                <Route path="/behavior" element={<BehaviorTracking students={students} currentUser={currentUser as SystemUser} />} />
                <Route path="/lab" element={<LearningLab students={students} currentUserId={(currentUser as SystemUser).id} />} />
                <Route path="/reports" element={<ReportsCenter students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/inbox" element={<TeacherInbox currentUser={currentUser as SystemUser} />} />
                <Route path="/planning" element={<LessonPlanning currentUser={currentUser as SystemUser} />} />
                <Route path="/certificates" element={<CertificatesCenter students={students} currentUser={currentUser as SystemUser} onSaveAttendance={loadData} />} />
                <Route path="/badges" element={<SmartBadges students={students} />} />
                <Route path="/interventions" element={<InterventionLog students={students} incidents={getBehaviorIncidents()} currentUser={currentUser as SystemUser} />} />
                <Route path="/schedule" element={<ScheduleView currentUser={currentUser as SystemUser} />} />
                <Route path="/hall-of-fame" element={<HallOfFame students={students} performance={performance} attendance={attendance} />} />
                
                {/* Advanced Routes */}
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/school-mgmt" element={<SchoolManagement students={students} onImportStudents={loadData} onImportPerformance={loadData} onImportAttendance={loadData} currentUser={currentUser as SystemUser} />} />
                <Route path="/principal" element={<PrincipalDashboard students={students} attendance={attendance} performance={performance} teachers={teachers} />} />
                <Route path="/profile" element={<TeacherProfile currentUser={currentUser as SystemUser} />} />
                <Route path="/ai-config" element={<TeacherAIConfig currentUser={currentUser as SystemUser} />} />
                <Route path="/subscription" element={<TeacherSubscription currentUser={currentUser as SystemUser} />} />
            </Routes>
        </TeacherPortal>
    );

    return (
        <>
            <ReloadPrompt />
            <Routes>
                <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
                <Route path="/classroom-screen" element={<ClassroomScreen students={students} attendance={attendance} currentUser={currentUser as SystemUser} />} />
                <Route path="/*" element={
                    currentUser.role === 'STUDENT' ? <StudentPortal currentUser={currentUser as Student} onLogout={handleLogout} /> :
                    currentUser.role === 'PARENT' ? <ParentPortal parentPhone={(currentUser as SystemUser).phone || ''} allStudents={students} attendance={attendance} performance={performance} onLogout={handleLogout} /> :
                    teacherRoutes
                } />
            </Routes>
            <AIChatBot students={students} attendance={attendance} performance={performance} />
        </>
    );
};

export default App;
