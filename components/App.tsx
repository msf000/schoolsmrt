
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { SystemUser, Student, AttendanceRecord, PerformanceRecord } from '../types';
import StaffPortal from './StaffPortal';
import StudentPortal from './StudentPortal';
import ParentPortal from './ParentPortal';
import Dashboard from './Dashboard';
import Students from './Students';
import Attendance from './Attendance';
import Performance from './Performance';
import AIReports from './AIReports';
import GradebookMaster from './GradebookMaster';
import TeacherManagement from './TeacherManagement';
import StudentFollowUp from './StudentFollowUp';
import ClassroomManager from './ClassroomManager';
import ClassroomScreen from './ClassroomScreen';
import ExamsManager from './ExamsManager';
import BehaviorTracking from './BehaviorTracking';
import LearningLab from './LearningLab';
import LessonPlanning from './LessonPlanning';
import SchoolManagement from './SchoolManagement';
import TeacherProfile from './TeacherProfile';
import AdminDashboard from './AdminDashboard';
import PrincipalDashboard from './PrincipalDashboard';
import HallOfFame from './HallOfFame';
import TeacherTaskGrader from './TeacherTaskGrader';
import SmartBadges from './SmartBadges';
import SchoolWall from './SchoolWall';
import MeetingScheduler from './MeetingScheduler';
import ScheduleView from './ScheduleView';
import CurriculumManager from './CurriculumManager';
import ResourcesView from './ResourcesView';
import StudentClubs from './StudentClubs';
import { fetchStudents, fetchAttendance, fetchPerformance, fetchTeachers } from '../services/storageService';
import Login from './Login';
import ReloadPrompt from './ReloadPrompt';
import AIChatBot from './AIChatBot';
import PredictiveAnalytics from './PredictiveAnalytics';
import AdvancedAnalytics from './AdvancedAnalytics';
import CertificatesCenter from './CertificatesCenter';
import NoorExporter from './NoorExporter';

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
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [stds, att, perf, tchs] = await Promise.all([
                fetchStudents(),
                fetchAttendance(),
                fetchPerformance(),
                fetchTeachers()
            ]);
            setStudents(stds || []);
            setAttendance(att || []);
            setPerformance(perf || []);
            setTeachers(tchs || []);
        } catch (e) {
            console.error("Critical Sync Error:", e);
        }
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

    const getStaffDashboard = () => {
        if (currentUser.role === 'SUPER_ADMIN') return <AdminDashboard />;
        if (currentUser.role === 'SCHOOL_MANAGER') return <PrincipalDashboard students={students} attendance={attendance} performance={performance} teachers={teachers} />;
        return <Dashboard students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />;
    };

    const staffRoutes = (
        <StaffPortal currentUser={currentUser as SystemUser} onLogout={handleLogout}>
            <Routes>
                <Route path="/" element={getStaffDashboard()} />
                <Route path="/hall-of-fame" element={<HallOfFame students={students} performance={performance} attendance={attendance} />} />
                <Route path="/wall" element={<SchoolWall currentUser={currentUser as SystemUser} students={students} />} />
                
                {/* مسارات المعلم */}
                {currentUser.role === 'TEACHER' && (
                    <>
                        <Route path="/students" element={<Students students={students} attendance={attendance} performance={performance} onAddStudent={loadInitialData} onUpdateStudent={loadInitialData} onDeleteStudent={loadInitialData} onImportStudents={loadInitialData} currentUser={currentUser as SystemUser} />} />
                        <Route path="/attendance" element={<Attendance students={students} attendanceHistory={attendance} onSaveAttendance={loadInitialData} currentUser={currentUser as SystemUser} />} />
                        <Route path="/gradebook" element={<GradebookMaster students={students} performance={performance} currentUser={currentUser as SystemUser} />} />
                        <Route path="/exams" element={<ExamsManager currentUser={currentUser as SystemUser} />} />
                        <Route path="/grading" element={<TeacherTaskGrader currentUser={currentUser as SystemUser} />} />
                        <Route path="/schedule" element={<ScheduleView currentUser={currentUser as SystemUser} />} />
                        <Route path="/curriculum" element={<CurriculumManager currentUser={currentUser as SystemUser} />} />
                        <Route path="/meetings" element={<MeetingScheduler currentUser={currentUser as SystemUser} isTeacherView={true} />} />
                        <Route path="/resources" element={<ResourcesView currentUser={currentUser as SystemUser} />} />
                        <Route path="/clubs" element={<StudentClubs students={students} currentUser={currentUser as SystemUser} />} />
                        <Route path="/analytics" element={<PredictiveAnalytics students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                        <Route path="/deep-dive" element={<AdvancedAnalytics students={students} attendance={attendance} performance={performance} />} />
                        <Route path="/classroom" element={<ClassroomManager students={students} attendance={attendance} performance={performance} onLaunchScreen={() => navigate('/classroom-screen')} currentUser={currentUser as SystemUser} />} />
                        <Route path="/planning" element={<LessonPlanning currentUser={currentUser as SystemUser} />} />
                        <Route path="/behavior" element={<BehaviorTracking students={students} currentUser={currentUser as SystemUser} />} />
                        <Route path="/lab" element={<LearningLab students={students} currentUserId={(currentUser as SystemUser).id} />} />
                        <Route path="/badges" element={<SmartBadges students={students} />} />
                        <Route path="/certificates" element={<CertificatesCenter students={students} currentUser={currentUser as SystemUser} onSaveAttendance={loadInitialData} />} />
                        <Route path="/noor-export" element={<NoorExporter students={students} performance={performance} currentUser={currentUser as SystemUser} />} />
                    </>
                )}

                {/* مسارات مدير المدرسة */}
                {currentUser.role === 'SCHOOL_MANAGER' && (
                    <>
                        <Route path="/school-analytics" element={<PrincipalDashboard students={students} attendance={attendance} performance={performance} teachers={teachers} />} />
                        <Route path="/teachers-mgmt" element={<TeacherManagement currentUser={currentUser as SystemUser} />} />
                        <Route path="/all-students" element={<Students students={students} attendance={attendance} performance={performance} onAddStudent={loadInitialData} onUpdateStudent={loadInitialData} onDeleteStudent={loadInitialData} onImportStudents={loadInitialData} currentUser={currentUser as SystemUser} />} />
                    </>
                )}

                <Route path="/reports" element={<AIReports students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/followup" element={<StudentFollowUp students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/school-mgmt" element={<SchoolManagement students={students} onImportStudents={loadInitialData} onImportPerformance={loadInitialData} onImportAttendance={loadInitialData} currentUser={currentUser as SystemUser} />} />
                <Route path="/profile" element={<TeacherProfile currentUser={currentUser as SystemUser} />} />
                
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </StaffPortal>
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
                    staffRoutes
                } />
            </Routes>
            <AIChatBot students={students} attendance={attendance} performance={performance} />
        </>
    );
};

export default App;
