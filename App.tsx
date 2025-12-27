
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
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
import { fetchStudents, fetchAttendance, fetchPerformance } from './services/storageService';
import Login from './components/Login';
import ReloadPrompt from './components/ReloadPrompt';
import AIChatBot from './components/AIChatBot';

const App: React.FC = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState<SystemUser | Student | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('current_user');
        if (saved) setCurrentUser(JSON.parse(saved));
        loadData();
    }, []);

    const loadData = async () => {
        const stds = await fetchStudents();
        const att = await fetchAttendance();
        const perf = await fetchPerformance();
        setStudents(stds);
        setAttendance(att);
        setPerformance(perf);
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
                <Route path="/reports" element={<AIReports students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/followup" element={<StudentFollowUp students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/classroom" element={<ClassroomManager students={students} attendance={attendance} performance={performance} onLaunchScreen={() => navigate('/classroom-screen')} onNavigateToAttendance={() => navigate('/attendance')} onSaveAttendance={loadData} onImportAttendance={loadData} currentUser={currentUser as SystemUser} />} />
                <Route path="/exams" element={<ExamsManager currentUser={currentUser as SystemUser} />} />
                <Route path="/bank" element={<QuestionBank currentUser={currentUser as SystemUser} />} />
                <Route path="/games" element={<GamesBuilder currentUser={currentUser as SystemUser} />} />
                <Route path="/library" element={<SharedLibrary currentUser={currentUser as SystemUser} />} />
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
