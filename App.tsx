
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
    getStudents, getAttendance, getPerformance, saveAttendance, 
    addPerformance, deletePerformance, bulkAddPerformance, 
    bulkUpsertStudents, getUserTheme,
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
import AIReports from './components/AIReports';
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
import AIChatBot from './components/AIChatBot';
import AdminDashboard from './components/AdminDashboard';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<SystemUser | Student | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
    const [theme, setTheme] = useState<UserTheme>(getUserTheme());
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const savedUser = localStorage.getItem('current_user');
        if (savedUser) {
            try {
                setCurrentUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }
        loadData();
    }, []);

    const loadData = () => {
        setStudents(getStudents());
        setAttendance(getAttendance());
        setPerformance(getPerformance());
    };

    const handleLoginSuccess = (user: any, rememberMe: boolean) => {
        setCurrentUser(user);
        if (rememberMe) {
            localStorage.setItem('current_user', JSON.stringify(user));
        }
        loadData();
        navigate('/');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('current_user');
        navigate('/login');
    };

    if (!currentUser && location.pathname !== '/login') {
        return <Navigate to="/login" replace />;
    }

    const teacherRoutes = (
        <TeacherPortal currentUser={currentUser as SystemUser} onLogout={handleLogout}>
            <Routes>
                <Route path="/" element={<Dashboard students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} onNavigate={(v) => navigate(v)} />} />
                <Route path="/students" element={<Students students={students} attendance={attendance} performance={performance} onAddStudent={(s) => { addStudent(s); loadData(); }} onUpdateStudent={(s) => { updateStudent(s); loadData(); }} onDeleteStudent={(id) => { deleteStudent(id); loadData(); }} onImportStudents={(data) => { bulkUpsertStudents(data); loadData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/attendance" element={<Attendance students={students} attendanceHistory={attendance} onSaveAttendance={(recs) => { saveAttendance(recs); loadData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/performance" element={<Performance students={students} performance={performance} attendance={attendance} onAddPerformance={(rec) => { addPerformance(rec); loadData(); }} onImportPerformance={(recs) => { bulkAddPerformance(recs); loadData(); }} onDeletePerformance={(id) => { deletePerformance(id); loadData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/reports" element={<AIReports students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/school-mgmt" element={<SchoolManagementComponent students={students} onImportStudents={()=>{}} onImportPerformance={()=>{}} onImportAttendance={()=>{}} currentUser={currentUser as SystemUser} onUpdateTheme={setTheme}/>} />
                <Route path="/followup" element={<StudentFollowUp students={students} performance={performance} attendance={attendance} currentUser={currentUser as SystemUser} onSaveAttendance={(recs) => { saveAttendance(recs); loadData(); }}/>} />
                <Route path="/leaderboard" element={<Leaderboard students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/exams" element={<ExamsManager currentUser={currentUser as SystemUser} />} />
                <Route path="/messages" element={<MessageCenter students={students} attendance={attendance} performance={performance} currentUser={currentUser as SystemUser} />} />
                <Route path="/classroom" element={<ClassroomManager students={students} attendance={attendance} performance={performance} onLaunchScreen={() => navigate('/screen')} onNavigateToAttendance={() => navigate('/attendance')} onSaveAttendance={(recs) => { saveAttendance(recs); loadData(); }} onImportAttendance={(recs)=>{ saveAttendance(recs); loadData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/works" element={<WorksTracking students={students} attendance={attendance} performance={performance} onAddPerformance={(recs)=>{ bulkAddPerformance(recs); loadData(); }} currentUser={currentUser as SystemUser} />} />
                <Route path="/forms" element={<FormsAnalyzer students={students} currentUserId={currentUser?.id || ''} />} />
                <Route path="/lab" element={<LearningLab students={students} currentUserId={currentUser?.id} />} />
                <Route path="/custom-tables" element={<CustomTablesView currentUser={currentUser as SystemUser} />} />
                <Route path="/resources" element={<ResourcesView currentUser={currentUser as SystemUser} />} />
                <Route path="/schedule" element={<ScheduleView currentUser={currentUser as SystemUser} onNavigateToAttendance={() => navigate('/attendance')} />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <AIChatBot students={students} attendance={attendance} performance={performance} />
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
                {/* الشاشة الخاصة بالفصل */}
                <Route path="/screen" element={<ClassroomScreen students={students} attendance={attendance} onSaveAttendance={(recs) => { saveAttendance(recs); loadData(); }} currentUser={currentUser as SystemUser} />} />
            </Routes>
        </div>
    );
};

export default App;
