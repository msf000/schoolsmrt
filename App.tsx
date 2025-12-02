import React, { useState, useEffect } from 'react';
import { seedData, getStudents, getAttendance, getPerformance, addStudent, updateStudent, deleteStudent, saveAttendance, addPerformance, bulkAddStudents, bulkUpsertStudents, bulkAddPerformance, bulkAddAttendance } from './services/storageService';
import { Student, AttendanceRecord, PerformanceRecord, ViewState } from './types';
import Dashboard from './components/Dashboard';
import Students from './components/Students';
import Attendance from './components/Attendance';
import Performance from './components/Performance';
import DataImport from './components/DataImport';
import SchoolManagement from './components/SchoolManagement';
import AdminDashboard from './components/AdminDashboard';
import CustomTablesView from './components/CustomTablesView';
import WorksTracking from './components/WorksTracking';
import AIReports from './components/AIReports';
import { LayoutDashboard, Users, CalendarCheck, TrendingUp, Menu, X, Database, Building2, ShieldCheck, Table, PenTool, Sparkles } from 'lucide-react';

const App: React.FC = () => {
  // Initialize data
  useEffect(() => {
    // seedData(); // Disabled seeding to start clean
    refreshData();
  }, []);

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [performance, setPerformance] = useState<PerformanceRecord[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const refreshData = () => {
    setStudents(getStudents());
    setAttendance(getAttendance());
    setPerformance(getPerformance());
  };

  const handleAddStudent = (s: Student) => {
    addStudent(s);
    refreshData();
  };

  const handleUpdateStudent = (s: Student) => {
    updateStudent(s);
    refreshData();
  };

  // Modified to accept strategies
  const handleBulkAddStudents = (list: Student[], matchKey?: keyof Student, strategy?: 'UPDATE' | 'SKIP' | 'NEW', updateFields?: string[]) => {
    if (matchKey && strategy) {
        // Use Upsert Logic with optional selective update fields
        bulkUpsertStudents(list, matchKey, strategy, updateFields);
    } else {
        // Fallback to simple add
        bulkAddStudents(list);
    }
    refreshData();
  };

  const handleDeleteStudent = (id: string) => {
    deleteStudent(id);
    refreshData();
  };

  const handleSaveAttendance = (recs: AttendanceRecord[]) => {
    saveAttendance(recs);
    refreshData();
  };

  const handleBulkAddAttendance = (list: AttendanceRecord[]) => {
      bulkAddAttendance(list);
      refreshData();
  };

  const handleAddPerformance = (rec: PerformanceRecord) => {
    addPerformance(rec);
    refreshData();
  };

  const handleBulkAddPerformance = (list: PerformanceRecord[]) => {
      bulkAddPerformance(list);
      refreshData();
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'SCHOOL_MANAGEMENT', label: 'إدارة المدرسة', icon: Building2 },
    { id: 'ADMIN_DASHBOARD', label: 'لوحة المدير العام', icon: ShieldCheck },
    { id: 'STUDENTS', label: 'الطلاب', icon: Users },
    { id: 'ATTENDANCE', label: 'الغياب والحضور', icon: CalendarCheck },
    { id: 'WORKS_TRACKING', label: 'متابعة الأعمال', icon: PenTool }, 
    { id: 'PERFORMANCE', label: 'سجل الدرجات', icon: TrendingUp },
    { id: 'AI_REPORTS', label: 'تقارير الذكاء الاصطناعي', icon: Sparkles },
    { id: 'CUSTOM_TABLES', label: 'الجداول الخاصة', icon: Table }, 
    { id: 'DATA_IMPORT', label: 'استيراد البيانات', icon: Database },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-right">
      
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-l border-gray-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-center">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold ml-3">
                م
            </div>
            <h1 className="text-xl font-bold text-gray-800">نظام المدرس</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewState)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === item.id 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
             الإصدار 1.6.1
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 flex justify-between items-center border-b">
                    <h1 className="text-xl font-bold text-gray-800">القائمة</h1>
                    <button onClick={() => setIsMobileMenuOpen(false)}><X size={24} /></button>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map(item => (
                        <button
                        key={item.id}
                        onClick={() => {
                            setCurrentView(item.id as ViewState);
                            setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                            currentView === item.id 
                            ? 'bg-primary/10 text-primary font-bold' 
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                    م
                </div>
                <span className="font-bold text-gray-800">نظام المدرس</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600">
                <Menu size={24} />
            </button>
        </header>

        <div className="flex-1 overflow-y-auto">
            {currentView === 'DASHBOARD' && (
                <Dashboard 
                    students={students} 
                    attendance={attendance} 
                    performance={performance} 
                />
            )}
             {currentView === 'SCHOOL_MANAGEMENT' && (
                <SchoolManagement 
                    students={students}
                    onImportStudents={handleBulkAddStudents}
                    onImportPerformance={handleBulkAddPerformance}
                    onImportAttendance={handleBulkAddAttendance}
                />
            )}
             {currentView === 'ADMIN_DASHBOARD' && (
                <AdminDashboard />
            )}
            {currentView === 'STUDENTS' && (
                <Students 
                    students={students} 
                    onAddStudent={handleAddStudent} 
                    onUpdateStudent={handleUpdateStudent}
                    onDeleteStudent={handleDeleteStudent} 
                    onImportStudents={handleBulkAddStudents}
                />
            )}
            {currentView === 'ATTENDANCE' && (
                <Attendance 
                    students={students} 
                    attendanceHistory={attendance} 
                    onSaveAttendance={handleSaveAttendance} 
                    onImportAttendance={handleBulkAddAttendance}
                />
            )}
            {currentView === 'WORKS_TRACKING' && (
                <WorksTracking 
                    students={students}
                    performance={performance}
                    onAddPerformance={handleBulkAddPerformance}
                />
            )}
            {currentView === 'PERFORMANCE' && (
                <Performance 
                    students={students} 
                    performance={performance} 
                    onAddPerformance={handleAddPerformance} 
                    onImportPerformance={handleBulkAddPerformance}
                />
            )}
            {currentView === 'AI_REPORTS' && (
                <AIReports 
                    students={students} 
                    attendance={attendance} 
                    performance={performance} 
                />
            )}
            {currentView === 'CUSTOM_TABLES' && (
                <CustomTablesView />
            )}
            {currentView === 'DATA_IMPORT' && (
                <DataImport 
                    onImportStudents={handleBulkAddStudents}
                    onImportPerformance={handleBulkAddPerformance}
                    onImportAttendance={handleBulkAddAttendance}
                    existingStudents={students}
                />
            )}
        </div>
      </main>
    </div>
  );
};

export default App;