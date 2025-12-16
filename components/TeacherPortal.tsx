
import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { SystemUser, Student, AttendanceRecord, PerformanceRecord } from '../types';
import { 
    LayoutGrid, Users, CheckSquare, Settings, MonitorPlay, Table, 
    Award, Mail, Calendar, FileQuestion, Library, ScanLine, 
    PenTool, Printer, BrainCircuit, List, FolderOpen, Table2, 
    LogOut, Menu, X, FileText, CreditCard 
} from 'lucide-react';

// Imports from existing components
import Dashboard from './Dashboard';
import Students from './Students';
import AttendanceComponent from './Attendance';
import PerformanceView from './Performance';
import WorksTracking from './WorksTracking';
import StudentFollowUp from './StudentFollowUp';
import AIReports from './AIReports';
import ClassroomScreen from './ClassroomScreen';
import ClassroomManager from './ClassroomManager';
import AdminDashboard from './AdminDashboard';
import CustomTablesView from './CustomTablesView';
import MessageCenter from './MessageCenter';
import AITools from './AITools';
import TeacherSubscription from './TeacherSubscription';
import LessonPlanning from './LessonPlanning';
import MonthlyReport from './MonthlyReport';
import ExamsManager from './ExamsManager';
import QuestionBank from './QuestionBank';
import AutoGrading from './AutoGrading';
import CurriculumManager from './CurriculumManager';
import ResourcesView from './ResourcesView';
import ScheduleView from './ScheduleView';
import FlexibleTrackingSheet from './FlexibleTrackingSheet';
import CertificatesCenter from './CertificatesCenter';
import { SchoolManagement as SchoolManagementComponent } from './SchoolManagement';

interface TeacherPortalProps {
    currentUser: SystemUser;
    students: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    syncStatus: string;
    aiStatus: string;
    onLogout: () => void;
    
    // Actions passed from App
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
    const { currentUser, onLogout, syncStatus } = props;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    const isManager = currentUser.role === 'SCHOOL_MANAGER' || currentUser.role === 'SUPER_ADMIN';

    const NavItem = ({ path, label, icon: Icon }: any) => (
        <button 
            onClick={() => { navigate(path); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                location.pathname === path 
                    ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100' 
                    : 'text-gray-600 hover:bg-gray-50'
            }`}
        >
            <Icon size={20} />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="flex h-screen overflow-hidden text-right font-sans bg-gray-100" dir="rtl">
            
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 right-0 w-64 bg-white border-l border-gray-200 shadow-xl z-40 transform transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-5 border-b bg-gradient-to-b from-gray-50 to-white flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md border-2 border-indigo-100">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-bold text-gray-800 truncate w-32">{currentUser.name}</p>
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold inline-block mt-1">
                                    {currentUser.role === 'TEACHER' ? 'معلم' : currentUser.role === 'SCHOOL_MANAGER' ? 'مدير مدرسة' : 'مسؤول'}
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-red-500"><X/></button>
                    </div>
                    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-600 bg-white border border-red-200 py-2 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm">
                        <LogOut size={16}/> تسجيل الخروج
                    </button>
                </div>
                
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar h-[calc(100vh-220px)]">
                    <NavItem path="/" label="لوحة القيادة" icon={LayoutGrid} />
                    
                    {currentUser.role === 'SUPER_ADMIN' && <NavItem path="/admin" label="إدارة النظام" icon={Settings} />}
                    
                    {isManager && (
                        <>
                            <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2">الإدارة</label></div>
                            <NavItem path="/school-mgmt" label="إدارة المدرسة" icon={Settings} />
                            <NavItem path="/students" label="قائمة الطلاب" icon={Users} />
                            <NavItem path="/attendance" label="سجل الحضور" icon={Calendar} />
                            <NavItem path="/performance" label="سجل الدرجات" icon={CheckSquare} />
                            <NavItem path="/works" label="كشف الرصد" icon={Table} />
                            <NavItem path="/reports" label="التقارير" icon={Printer} />
                        </>
                    )}

                    {currentUser.role === 'TEACHER' && (
                        <>
                            <NavItem path="/students" label="الطلاب" icon={Users} />
                            <NavItem path="/attendance" label="الحضور" icon={CheckSquare} />
                            <NavItem path="/classroom" label="الإدارة الصفية" icon={MonitorPlay} />
                            <NavItem path="/works" label="سجل الرصد" icon={Table} />
                            
                            <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2">التخطيط</label></div>
                            <NavItem path="/schedule" label="الجدول" icon={Calendar} />
                            <NavItem path="/planning" label="التحضير" icon={PenTool} />
                            <NavItem path="/curriculum" label="المنهج" icon={List} />
                            <NavItem path="/resources" label="المصادر" icon={FolderOpen} />
                            
                            <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2">التقييم</label></div>
                            <NavItem path="/exams" label="الاختبارات" icon={FileQuestion} />
                            <NavItem path="/questions" label="بنك الأسئلة" icon={Library} />
                            <NavItem path="/auto-grading" label="المصحح الآلي" icon={ScanLine} />
                            
                            <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2">سجلات خاصة</label></div>
                            <NavItem path="/flexible-sheets" label="سجلات مرنة" icon={FileText} />
                            <NavItem path="/custom-tables" label="جداول مخصصة" icon={Table2} />

                            <div className="pt-4 mt-4 border-t border-gray-100"><label className="px-4 text-xs font-bold text-gray-400 block mb-2">أدوات</label></div>
                            <NavItem path="/ai-tools" label="أدوات AI" icon={BrainCircuit} />
                            <NavItem path="/certificates" label="الشهادات" icon={Award} />
                            <NavItem path="/messages" label="الرسائل" icon={Mail} />

                            <div className="pt-4 mt-4 border-t border-gray-100"></div>
                            <NavItem path="/subscription" label="اشتراكي" icon={CreditCard} />
                            <NavItem path="/school-mgmt" label="الإعدادات" icon={Settings} />
                        </>
                    )}
                </nav>

                <div className="p-4 border-t bg-gray-50 space-y-2">
                     <div className="flex items-center justify-between text-xs px-3 py-2 rounded border bg-white">
                        <span className="text-gray-500 font-bold">المزامنة:</span>
                        <span className={`font-bold ${syncStatus === 'ONLINE' ? 'text-green-600' : 'text-gray-500'}`}>{syncStatus}</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-gray-100 relative">
                <header className="bg-white border-b p-4 flex justify-between items-center md:hidden">
                    <h2 className="font-bold text-gray-800">نظام المدرس الذكي</h2>
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-gray-100 rounded-lg"><Menu/></button>
                </header>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    <Routes>
                        <Route path="/" element={<Dashboard students={props.students} attendance={props.attendance} performance={props.performance} currentUser={currentUser} onNavigate={(v: string) => navigate(v === 'CLASSROOM_MANAGEMENT' ? '/classroom' : v === 'ATTENDANCE' ? '/attendance' : v === 'EXAMS_MANAGER' ? '/exams' : v === 'AUTO_GRADING' ? '/auto-grading' : v === 'STUDENT_FOLLOWUP' ? '/followup' : v === 'AI_REPORTS' ? '/reports' : '/')} />} />
                        <Route path="/students" element={<Students students={props.students} attendance={props.attendance} performance={props.performance} onAddStudent={props.addStudent} onUpdateStudent={props.updateStudent} onDeleteStudent={props.deleteStudent} onImportStudents={props.importStudents} currentUser={currentUser} />} />
                        <Route path="/attendance" element={<AttendanceComponent students={props.students} attendanceHistory={props.attendance} onSaveAttendance={props.saveAttendance} onImportAttendance={props.importAttendance} currentUser={currentUser} onNavigate={() => {}} />} />
                        <Route path="/classroom" element={<ClassroomManager students={props.students} attendance={props.attendance} performance={props.performance} onLaunchScreen={() => navigate('/screen')} onNavigateToAttendance={() => navigate('/attendance')} onSaveAttendance={props.saveAttendance} onImportAttendance={props.importAttendance} currentUser={currentUser} />} />
                        <Route path="/screen" element={<ClassroomScreen students={props.students} attendance={props.attendance} onSaveAttendance={props.saveAttendance} currentUser={currentUser} />} />
                        <Route path="/works" element={<WorksTracking students={props.students} performance={props.performance} attendance={props.attendance} onAddPerformance={props.addPerformance} currentUser={currentUser}/>} />
                        <Route path="/performance" element={<PerformanceView students={props.students} performance={props.performance} onAddPerformance={props.addPerformance} onImportPerformance={props.importPerformance} onDeletePerformance={props.deletePerformance} currentUser={currentUser} attendance={props.attendance} />} />
                        <Route path="/schedule" element={<ScheduleView currentUser={currentUser} onNavigateToLesson={() => navigate('/planning')} onNavigateToAttendance={() => navigate('/attendance')} />} />
                        <Route path="/planning" element={<LessonPlanning currentUser={currentUser} />} />
                        <Route path="/curriculum" element={<CurriculumManager currentUser={currentUser} />} />
                        <Route path="/exams" element={<ExamsManager currentUser={currentUser} />} />
                        <Route path="/questions" element={<QuestionBank currentUser={currentUser} />} />
                        <Route path="/auto-grading" element={<AutoGrading currentUser={currentUser} />} />
                        <Route path="/ai-tools" element={<AITools students={props.students} performance={props.performance} />} />
                        <Route path="/reports" element={<AIReports students={props.students} attendance={props.attendance} performance={props.performance} currentUser={currentUser}/>} />
                        <Route path="/monthly-report" element={<MonthlyReport students={props.students} attendance={props.attendance} performance={props.performance} currentUser={currentUser}/>} />
                        <Route path="/messages" element={<MessageCenter students={props.students} attendance={props.attendance} performance={props.performance} currentUser={currentUser} />} />
                        <Route path="/certificates" element={<CertificatesCenter students={props.students} currentUser={currentUser} onSaveAttendance={props.saveAttendance} />} />
                        <Route path="/resources" element={<ResourcesView currentUser={currentUser!} />} />
                        <Route path="/custom-tables" element={<CustomTablesView currentUser={currentUser}/>} />
                        <Route path="/flexible-sheets" element={<FlexibleTrackingSheet currentUser={currentUser!} />} />
                        <Route path="/school-mgmt" element={<SchoolManagementComponent students={props.students} onImportStudents={props.importStudents} onImportPerformance={props.importPerformance} onImportAttendance={props.importAttendance} currentUser={currentUser} onUpdateTheme={props.setTheme}/>} />
                        <Route path="/subscription" element={<TeacherSubscription currentUser={currentUser} />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/followup" element={<StudentFollowUp students={props.students} performance={props.performance} attendance={props.attendance} currentUser={currentUser} onSaveAttendance={props.saveAttendance}/>} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </main>
        </div>
    );
};

export default TeacherPortal;
