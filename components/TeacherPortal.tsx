
import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { SystemUser, Student, AttendanceRecord, PerformanceRecord } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, Settings, MonitorPlay, Table, 
    Award, Mail, Calendar, FileQuestion, Library, ScanLine, 
    PenTool, Printer, BrainCircuit, List, FolderOpen, Table2, 
    LogOut, Menu, X, FileText, CreditCard, Inbox, Sparkles, BookOpen
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
import { SchoolManagement as SchoolManagementComponent } from './SchoolManagement';

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

    const NavItem = ({ path, label, icon: Icon, color = 'text-gray-600' }: any) => (
        <button 
            onClick={() => { navigate(path); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                location.pathname === path 
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' 
                    : `${color} hover:bg-gray-50`
            }`}
        >
            <Icon size={20} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen overflow-hidden text-right font-sans bg-gray-100" dir="rtl">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 right-0 w-64 bg-white border-l border-gray-200 shadow-xl z-[60] transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-5 border-b bg-gradient-to-b from-gray-50 to-white flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-indigo-100">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-gray-800 truncate w-32">{currentUser.name}</p>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-red-500 p-1"><X/></button>
                    </div>
                </div>
                
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar h-[calc(100vh-100px)]">
                    <NavItem path="/" label="الرئيسية" icon={LayoutGrid} />
                    <NavItem path="/inbox" label="بريد الطلبات" icon={Inbox} />
                    
                    <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2 text-right">إدارة الفصل</label></div>
                    <NavItem path="/students" label="سجل الطلاب" icon={Users} />
                    <NavItem path="/attendance" label="تحضير الطلاب" icon={CheckSquare} />
                    <NavItem path="/classroom" label="إدارة الحصة" icon={MonitorPlay} />
                    <NavItem path="/works" label="سجل الرصد" icon={Table} />
                    <NavItem path="/curriculum" label="توزيع المنهج" icon={List} />

                    <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2 text-right">التقييم والاختبارات</label></div>
                    <NavItem path="/exams" label="الاختبارات" icon={FileQuestion} />
                    <NavItem path="/question-bank" label="بنك الأسئلة" icon={Library} />
                    <NavItem path="/auto-grading" label="التصحيح الآلي" icon={ScanLine} />

                    <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2 text-right">أدوات إبداعية</label></div>
                    <NavItem path="/schedule" label="الجدول والخطة" icon={Calendar} />
                    <NavItem path="/planning" label="تحضير الدروس" icon={PenTool} />
                    <NavItem path="/ai-tools" label="مساعد الذكاء AI" icon={BrainCircuit} color="text-purple-600" />
                    <NavItem path="/reports" label="التقارير" icon={Printer} />
                    <NavItem path="/school-mgmt" label="الإعدادات" icon={Settings} />

                    <button onClick={props.onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 mt-4 font-bold"><LogOut size={20}/> تسجيل خروج</button>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-gray-100 relative overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 md:pb-0">
                    <Routes>
                        <Route path="/" element={<Dashboard students={props.students} attendance={props.attendance} performance={props.performance} currentUser={currentUser} onNavigate={()=>{}} />} />
                        <Route path="/inbox" element={<TeacherInbox currentUser={currentUser} />} />
                        <Route path="/students" element={<Students students={props.students} attendance={props.attendance} performance={props.performance} onAddStudent={props.addStudent} onUpdateStudent={props.updateStudent} onDeleteStudent={props.deleteStudent} onImportStudents={props.importStudents} currentUser={currentUser} />} />
                        <Route path="/attendance" element={<AttendanceComponent students={props.students} attendanceHistory={props.attendance} onSaveAttendance={props.saveAttendance} currentUser={currentUser} />} />
                        <Route path="/classroom" element={<ClassroomManager students={props.students} attendance={props.attendance} performance={props.performance} onLaunchScreen={() => navigate('/screen')} onNavigateToAttendance={() => navigate('/attendance')} onSaveAttendance={props.saveAttendance} onImportAttendance={props.importAttendance} currentUser={currentUser} />} />
                        <Route path="/works" element={<WorksTracking students={props.students} performance={props.performance} attendance={props.attendance} onAddPerformance={props.addPerformance} currentUser={currentUser}/>} />
                        <Route path="/curriculum" element={<CurriculumManager currentUser={currentUser} />} />
                        <Route path="/exams" element={<ExamsManager currentUser={currentUser} />} />
                        <Route path="/question-bank" element={<QuestionBank currentUser={currentUser} />} />
                        <Route path="/auto-grading" element={<AutoGrading currentUser={currentUser} />} />
                        <Route path="/schedule" element={<ScheduleView currentUser={currentUser} onNavigateToLesson={() => navigate('/planning')} onNavigateToAttendance={() => navigate('/attendance')} />} />
                        <Route path="/planning" element={<LessonPlanning currentUser={currentUser} />} />
                        <Route path="/ai-tools" element={<AITools students={props.students} performance={props.performance} />} />
                        <Route path="/reports" element={<ReportsCenter students={props.students} attendance={props.attendance} performance={props.performance} currentUser={currentUser}/>} />
                        <Route path="/school-mgmt" element={<SchoolManagementComponent students={props.students} onImportStudents={props.importStudents} onImportPerformance={props.importPerformance} onImportAttendance={props.importAttendance} currentUser={currentUser} onUpdateTheme={props.setTheme}/>} />
                        <Route path="/followup" element={<StudentFollowUp students={props.students} performance={props.performance} attendance={props.attendance} currentUser={currentUser} onSaveAttendance={props.saveAttendance}/>} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
                
                {/* Mobile Bottom Nav */}
                <BottomNavigation role={currentUser.role as any} onMenuClick={() => setIsSidebarOpen(true)} />
            </main>
        </div>
    );
};

export default TeacherPortal;
