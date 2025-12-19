
import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { SystemUser, Student, AttendanceRecord, PerformanceRecord } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, Settings, MonitorPlay, Table, 
    Award, Mail, Calendar, FileQuestion, Library, ScanLine, 
    PenTool, Printer, BrainCircuit, List, FolderOpen, Table2, 
    LogOut, Menu, X, FileText, CreditCard, Inbox, Sparkles, BookOpen, FileSpreadsheet, FlaskConical, Shield, ShieldCheck, Monitor
} from 'lucide-react';

import Dashboard from './Dashboard';
import Students from './Students';
import AttendanceComponent from './Attendance';
import PerformanceView from './Performance';
import WorksTracking from './WorksTracking';
import StudentFollowUp from './StudentFollowUp';
import ClassroomScreen from './ClassroomScreen';
import ClassroomManager from './ClassroomManager';
import CustomTablesView from './CustomTablesView';
import MessageCenter from './MessageCenter';
import AITools from './AITools';
import LessonPlanning from './LessonPlanning';
import ReportsCenter from './ReportsCenter'; 
import ExamsManager from './ExamsManager';
import QuestionBank from './QuestionBank';
import AutoGrading from './AutoGrading';
import CurriculumManager from './CurriculumManager';
import ResourcesView from './ResourcesView';
import ScheduleView from './ScheduleView';
import TeacherInbox from './TeacherInbox';
import BottomNavigation from './BottomNavigation';
import AIChatBot from './AIChatBot';
import { SchoolManagement as SchoolManagementComponent } from './SchoolManagement';
import FormsAnalyzer from './FormsAnalyzer';
import LearningLab from './LearningLab';
import AdminDashboard from './AdminDashboard';

interface TeacherPortalProps {
    currentUser: SystemUser;
    students: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    syncStatus: string;
    aiStatus: string;
    onLogout: () => void;
    addStudent: (s: Student) => void;
    updateStudent: (s: Student) => void;
    deleteStudent: (id: string) => void;
    saveAttendance: (recs: AttendanceRecord[]) => void;
    addPerformance: (p: PerformanceRecord | PerformanceRecord[]) => void;
    deletePerformance: (id: string) => void;
    importStudents: (data: Student[], key?: any, strategy?: any, fields?: any[]) => void;
    importAttendance: (recs: AttendanceRecord[]) => void;
    importPerformance: (recs: PerformanceRecord[]) => void;
    setTheme: (theme: any) => void;
}

const TeacherPortal: React.FC<TeacherPortalProps> = (props) => {
    const { currentUser } = props;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'SCHOOL_MANAGER';
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

    const NavItem = ({ path, label, icon: Icon, color = 'text-gray-600', badge }: any) => (
        <button 
            onClick={() => { navigate(path); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all font-medium ${
                location.pathname === path 
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-sm' 
                    : `${color} hover:bg-gray-50`
            }`}
        >
            <div className="flex items-center gap-3">
                <Icon size={20} className={location.pathname === path ? 'text-indigo-600' : ''} />
                <span className="text-sm">{label}</span>
            </div>
            {badge && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{badge}</span>}
        </button>
    );

    return (
        <div className="flex h-screen overflow-hidden text-right font-sans bg-gray-100" dir="rtl">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 right-0 w-64 bg-white border-l border-gray-200 shadow-xl z-[60] transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-5 border-b bg-gradient-to-b from-gray-50 to-white flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-md border-2 ${isSuperAdmin ? 'bg-red-600 border-red-100' : 'bg-indigo-600 border-indigo-100'} text-white`}>
                                {isSuperAdmin ? <ShieldCheck size={24}/> : currentUser.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-gray-800 truncate w-32">{currentUser.name}</p>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${isSuperAdmin ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {isSuperAdmin ? 'مدير النظام' : currentUser.role === 'SCHOOL_MANAGER' ? 'مدير مدرسة' : 'معلم'}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-red-500 p-1"><X/></button>
                    </div>
                </div>
                
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar h-[calc(100vh-100px)]">
                    {isSuperAdmin && (
                        <div className="mb-4">
                            <label className="px-4 text-[10px] font-black text-red-500 block mb-2 uppercase tracking-widest">إدارة النظام</label>
                            <NavItem path="/admin" label="لوحة التحكم العليا" icon={Shield} color="text-red-600" />
                            <div className="h-px bg-gray-100 my-4 mx-2"></div>
                        </div>
                    )}

                    <NavItem path="/" label="الرئيسية" icon={LayoutGrid} />
                    
                    <div className="pt-4 mt-2">
                        <label className="px-4 text-[10px] font-black text-gray-400 block mb-2 uppercase tracking-widest">المتابعة والتحضير</label>
                        <NavItem path="/students" label="سجل الطلاب" icon={Users} />
                        <NavItem path="/attendance" label="التحضير اليومي" icon={CheckSquare} />
                        <NavItem path="/classroom" label="الإدارة الصفية" icon={Monitor} color="text-indigo-600" />
                        <NavItem path="/works" label="سجل الرصد (كشف)" icon={Table} />
                        <NavItem path="/forms-analysis" label="محلل نتائج Forms" icon={FileSpreadsheet} color="text-green-600" />
                    </div>

                    <div className="pt-4 mt-2 border-t border-gray-100">
                        <label className="px-4 text-[10px] font-black text-gray-400 block mb-2 uppercase tracking-widest">الاختبارات والمناهج</label>
                        <NavItem path="/curriculum" label="توزيع المنهج" icon={List} />
                        <NavItem path="/exams" label="إدارة الاختبارات" icon={FileQuestion} />
                        <NavItem path="/planning" label="التحضير الذكي" icon={PenTool} />
                    </div>

                    <div className="pt-4 mt-2 border-t border-gray-100">
                        <label className="px-4 text-[10px] font-black text-gray-400 block mb-2 uppercase tracking-widest">مختبر الذكاء الاصطناعي</label>
                        <NavItem path="/learning-lab" label="أنماط التعلم" icon={FlaskConical} color="text-purple-600" />
                        <NavItem path="/ai-tools" label="مساعد المعلم AI" icon={BrainCircuit} color="text-purple-600" />
                    </div>

                    <div className="pt-4 mt-2 border-t border-gray-100">
                        <NavItem path="/reports" label="التقارير والشهادات" icon={Printer} />
                        <NavItem path="/school-mgmt" label="الإعدادات" icon={Settings} />
                    </div>

                    <button onClick={props.onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 mt-6 font-bold transition-colors">
                        <LogOut size={20}/> تسجيل خروج
                    </button>
                </nav>
            </aside>

            {/* Main View */}
            <main className="flex-1 flex flex-col min-w-0 bg-gray-100 relative overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-0">
                    <Routes>
                        <Route path="/" element={
                            isSuperAdmin 
                                ? <AdminDashboard /> 
                                : <Dashboard students={props.students} attendance={props.attendance} performance={props.performance} currentUser={currentUser} onNavigate={()=>{}} />
                        } />
                        
                        <Route path="/admin" element={isSuperAdmin ? <AdminDashboard /> : <Navigate to="/" />} />
                        <Route path="/forms-analysis" element={<FormsAnalyzer students={props.students} currentUserId={currentUser.id} />} />
                        <Route path="/learning-lab" element={<LearningLab students={props.students} currentUserId={currentUser.id} />} />
                        <Route path="/students" element={<Students students={props.students} attendance={props.attendance} performance={props.performance} onAddStudent={props.addStudent} onUpdateStudent={props.updateStudent} onDeleteStudent={props.deleteStudent} onImportStudents={props.importStudents} currentUser={currentUser} />} />
                        <Route path="/attendance" element={<AttendanceComponent students={props.students} attendanceHistory={props.attendance} onSaveAttendance={props.saveAttendance} currentUser={currentUser} />} />
                        <Route path="/classroom" element={<ClassroomManager students={props.students} attendance={props.attendance} performance={props.performance} onLaunchScreen={() => navigate('/screen')} onNavigateToAttendance={() => navigate('/attendance')} onSaveAttendance={props.saveAttendance} onImportAttendance={props.importAttendance} currentUser={currentUser} />} />
                        <Route path="/works" element={<WorksTracking students={props.students} performance={props.performance} attendance={props.attendance} onAddPerformance={props.addPerformance} currentUser={currentUser}/>} />
                        <Route path="/planning" element={<LessonPlanning currentUser={currentUser} />} />
                        <Route path="/ai-tools" element={<AITools students={props.students} performance={props.performance} />} />
                        <Route path="/reports" element={<ReportsCenter students={props.students} attendance={props.attendance} performance={props.performance} currentUser={currentUser}/>} />
                        <Route path="/school-mgmt" element={<SchoolManagementComponent students={props.students} onImportStudents={props.importStudents} onImportPerformance={props.importPerformance} onImportAttendance={props.importAttendance} currentUser={currentUser} onUpdateTheme={props.setTheme}/>} />
                        <Route path="/followup" element={<StudentFollowUp students={props.students} performance={props.performance} attendance={props.attendance} currentUser={currentUser} onSaveAttendance={props.saveAttendance}/>} />
                        <Route path="/exams" element={<ExamsManager currentUser={currentUser} />} />
                        <Route path="/curriculum" element={<CurriculumManager currentUser={currentUser} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
                
                <AIChatBot students={props.students} attendance={props.attendance} performance={props.performance} />
                <BottomNavigation role={currentUser.role as any} onMenuClick={() => setIsSidebarOpen(true)} />
            </main>
        </div>
    );
};

export default TeacherPortal;
