
import { 
    Student, Teacher, School, SystemUser, AttendanceRecord, PerformanceRecord, 
    Assignment, ScheduleItem, TeacherAssignment, Subject, CustomTable, 
    LessonLink, MessageLog, Feedback, ReportHeaderConfig, AISettings, UserTheme, 
    PerformanceCategory 
} from '../types';
import { supabase } from './supabaseClient';

// --- INITIAL DATA & CACHE ---
const INITIAL_DATA = {
    students: [] as Student[],
    teachers: [] as Teacher[],
    schools: [] as School[],
    system_users: [] as SystemUser[],
    attendance_records: [] as AttendanceRecord[],
    performance_records: [] as PerformanceRecord[],
    assignments: [] as Assignment[],
    schedules: [] as ScheduleItem[],
    teacher_assignments: [] as TeacherAssignment[],
    subjects: [] as Subject[],
    custom_tables: [] as CustomTable[],
    lesson_links: [] as LessonLink[],
    message_logs: [] as MessageLog[],
    feedbacks: [] as Feedback[],
    report_header_config: {} as ReportHeaderConfig,
    ai_settings: {} as AISettings,
    user_theme: {} as UserTheme,
    works_master_url: ''
};

let CACHE: typeof INITIAL_DATA = { ...INITIAL_DATA };
let IS_DEMO_MODE = false;

// --- HELPERS ---
const loadFromLocal = () => {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(INITIAL_DATA);
    keys.forEach(key => {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                CACHE[key as keyof typeof INITIAL_DATA] = JSON.parse(stored);
            } catch (e) { console.error(`Error loading ${key}`, e); }
        }
    });
};

const saveToLocal = (key: keyof typeof INITIAL_DATA, data: any) => {
    if (typeof window === 'undefined') return;
    CACHE[key] = data;
    localStorage.setItem(key, JSON.stringify(data));
};

// Initialize
loadFromLocal();

export const setSystemMode = (isDemo: boolean) => {
    IS_DEMO_MODE = isDemo;
    if (isDemo) {
        // Seed some demo data if empty
        if (CACHE.students.length === 0) {
            CACHE.students = [
                { id: '1', name: 'أحمد علي', nationalId: '1010101010', className: '1/A', gradeLevel: 'الصف الأول' },
                { id: '2', name: 'خالد محمد', nationalId: '1020202020', className: '1/A', gradeLevel: 'الصف الأول' }
            ];
        }
        if (CACHE.system_users.length === 0) {
            CACHE.system_users = [
                { id: 'demo_m', name: 'مدير تجريبي', email: 'manager@demo.com', role: 'SCHOOL_MANAGER', status: 'ACTIVE' },
                { id: 'demo_t', name: 'معلم تجريبي', email: 'teacher@demo.com', role: 'TEACHER', status: 'ACTIVE' }
            ];
        }
    } else {
        loadFromLocal(); // Reload real data
    }
};

export const getStorageStatistics = () => {
    return {
        students: CACHE.students.length,
        attendance: CACHE.attendance_records.length,
        performance: CACHE.performance_records.length
    };
};

export const generateEntityColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// --- CRUD OPERATIONS ---

// 1. STUDENTS
export const getStudents = (): Student[] => CACHE.students;
export const addStudent = (item: Student) => {
    const list = [...CACHE.students, item];
    saveToLocal('students', list);
};
export const updateStudent = (item: Student) => {
    const list = CACHE.students.map((s: Student) => s.id === item.id ? item : s);
    saveToLocal('students', list);
};
export const deleteStudent = (id: string) => {
    const list = CACHE.students.filter((s: Student) => s.id !== id);
    saveToLocal('students', list);
};
export const deleteAllStudents = () => saveToLocal('students', []);
export const bulkAddStudents = (items: Student[]) => {
    saveToLocal('students', [...CACHE.students, ...items]);
};
export const bulkUpsertStudents = (items: Student[], key: keyof Student = 'nationalId') => {
    let list = [...CACHE.students];
    items.forEach(newItem => {
        const idx = list.findIndex((s: Student) => s[key] && s[key] === newItem[key]);
        if (idx >= 0) list[idx] = { ...list[idx], ...newItem };
        else list.push(newItem);
    });
    saveToLocal('students', list);
};

// 2. ATTENDANCE
export const getAttendance = (): AttendanceRecord[] => CACHE.attendance_records;
export const saveAttendance = (items: AttendanceRecord[]) => {
    // Upsert logic based on ID
    let list = [...CACHE.attendance_records];
    items.forEach(newItem => {
        const idx = list.findIndex((r: AttendanceRecord) => r.id === newItem.id);
        if (idx >= 0) list[idx] = newItem;
        else list.push(newItem);
    });
    saveToLocal('attendance_records', list);
};
export const bulkAddAttendance = (items: AttendanceRecord[]) => saveAttendance(items);

// 3. PERFORMANCE
export const getPerformance = (): PerformanceRecord[] => CACHE.performance_records;
export const addPerformance = (item: PerformanceRecord) => {
    saveToLocal('performance_records', [...CACHE.performance_records, item]);
};
export const deletePerformance = (id: string) => {
    const list = CACHE.performance_records.filter((p: PerformanceRecord) => p.id !== id);
    saveToLocal('performance_records', list);
};
export const bulkAddPerformance = (items: PerformanceRecord[]) => {
    saveToLocal('performance_records', [...CACHE.performance_records, ...items]);
};

// 4. SCHOOLS
export const getSchools = (): School[] => CACHE.schools;
export const addSchool = (item: School) => {
    saveToLocal('schools', [...CACHE.schools, item]);
};
export const updateSchool = (item: School) => {
    const list = CACHE.schools.map((s: School) => s.id === item.id ? item : s);
    saveToLocal('schools', list);
};
export const deleteSchool = (id: string) => {
    const list = CACHE.schools.filter((s: School) => s.id !== id);
    saveToLocal('schools', list);
};

// 5. SYSTEM USERS
export const getSystemUsers = (): SystemUser[] => CACHE.system_users;
export const addSystemUser = (item: SystemUser) => {
    saveToLocal('system_users', [...CACHE.system_users, item]);
};
export const updateSystemUser = (item: SystemUser) => {
    const list = CACHE.system_users.map((u: SystemUser) => u.id === item.id ? item : u);
    saveToLocal('system_users', list);
};
export const deleteSystemUser = (id: string) => {
    const list = CACHE.system_users.filter((u: SystemUser) => u.id !== id);
    saveToLocal('system_users', list);
};

// 6. TEACHERS
export const getTeachers = (): Teacher[] => CACHE.teachers;
export const addTeacher = (item: Teacher) => {
    saveToLocal('teachers', [...CACHE.teachers, item]);
    // Also add to system users for login if not exists
    const users = getSystemUsers();
    if (!users.find(u => u.email === item.email)) {
        addSystemUser({
            id: item.id,
            name: item.name,
            email: item.email || item.nationalId || '',
            role: 'TEACHER',
            schoolId: item.schoolId,
            status: 'ACTIVE',
            password: item.password
        });
    }
};
export const updateTeacher = (item: Teacher) => {
    const list = CACHE.teachers.map((t: Teacher) => t.id === item.id ? item : t);
    saveToLocal('teachers', list);
};

// 7. ASSIGNMENTS
export const getAssignments = (category?: PerformanceCategory, teacherId?: string): Assignment[] => {
    let list = CACHE.assignments;
    if (category) list = list.filter((a: Assignment) => a.category === category);
    if (teacherId) list = list.filter((a: Assignment) => a.teacherId === teacherId);
    return list;
};
export const saveAssignment = (item: Assignment) => {
    let list = [...CACHE.assignments];
    const idx = list.findIndex((a: Assignment) => a.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    saveToLocal('assignments', list);
};
export const deleteAssignment = (id: string) => {
    const list = CACHE.assignments.filter((a: Assignment) => a.id !== id);
    saveToLocal('assignments', list);
};

// 8. SCHEDULES
export const getSchedules = (): ScheduleItem[] => CACHE.schedules;
export const saveScheduleItem = (item: ScheduleItem) => {
    let list = [...CACHE.schedules];
    const idx = list.findIndex((s: ScheduleItem) => s.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    saveToLocal('schedules', list);
};
export const deleteScheduleItem = (id: string) => {
    const list = CACHE.schedules.filter((s: ScheduleItem) => s.id !== id);
    saveToLocal('schedules', list);
};

// 9. TEACHER ASSIGNMENTS
export const getTeacherAssignments = (): TeacherAssignment[] => CACHE.teacher_assignments;
export const saveTeacherAssignment = (item: TeacherAssignment) => {
    let list = [...CACHE.teacher_assignments];
    const idx = list.findIndex((a: TeacherAssignment) => a.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    saveToLocal('teacher_assignments', list);
};

// 10. SUBJECTS
export const getSubjects = (teacherId?: string): Subject[] => {
    if (teacherId) return CACHE.subjects.filter((s: Subject) => s.teacherId === teacherId);
    return CACHE.subjects;
};
export const addSubject = (item: Subject) => {
    saveToLocal('subjects', [...CACHE.subjects, item]);
};
export const deleteSubject = (id: string) => {
    const list = CACHE.subjects.filter((s: Subject) => s.id !== id);
    saveToLocal('subjects', list);
};

// 11. CUSTOM TABLES
export const getCustomTables = (teacherId?: string): CustomTable[] => {
    if (teacherId) return CACHE.custom_tables.filter((t: CustomTable) => t.teacherId === teacherId);
    return CACHE.custom_tables;
};
export const addCustomTable = (item: CustomTable) => {
    saveToLocal('custom_tables', [...CACHE.custom_tables, item]);
};
export const updateCustomTable = (item: CustomTable) => {
    const list = CACHE.custom_tables.map((t: CustomTable) => t.id === item.id ? item : t);
    saveToLocal('custom_tables', list);
};
export const deleteCustomTable = (id: string) => {
    const list = CACHE.custom_tables.filter((t: CustomTable) => t.id !== id);
    saveToLocal('custom_tables', list);
};

// 12. LESSON LINKS
export const getLessonLinks = (): LessonLink[] => CACHE.lesson_links;
export const saveLessonLink = (item: LessonLink) => {
    saveToLocal('lesson_links', [...CACHE.lesson_links, item]);
};
export const deleteLessonLink = (id: string) => {
    const list = CACHE.lesson_links.filter((l: LessonLink) => l.id !== id);
    saveToLocal('lesson_links', list);
};

// 13. MESSAGES
export const getMessages = (): MessageLog[] => CACHE.message_logs;
export const saveMessage = (item: MessageLog) => {
    saveToLocal('message_logs', [item, ...CACHE.message_logs]);
};

// 14. FEEDBACK
export const getFeedback = (): Feedback[] => CACHE.feedbacks;
export const addFeedback = (item: Feedback) => {
    saveToLocal('feedbacks', [...CACHE.feedbacks, item]);
};

// 15. SETTINGS & CONFIG
export const getReportHeaderConfig = (teacherId?: string): ReportHeaderConfig => {
    return CACHE.report_header_config || {
        schoolName: '',
        educationAdmin: '',
        teacherName: '',
        schoolManager: '',
        academicYear: '',
        term: ''
    };
};
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    saveToLocal('report_header_config', config);
};

export const getAISettings = (): AISettings => CACHE.ai_settings || {
    modelId: 'gemini-2.5-flash',
    temperature: 0.7,
    enableReports: true,
    enableQuiz: true,
    enablePlanning: true,
    systemInstruction: ''
};
export const saveAISettings = (settings: AISettings) => saveToLocal('ai_settings', settings);

export const getUserTheme = (): UserTheme => CACHE.user_theme || { mode: 'LIGHT', backgroundStyle: 'FLAT' };
export const saveUserTheme = (theme: UserTheme) => saveToLocal('user_theme', theme);

export const getWorksMasterUrl = (): string => CACHE.works_master_url || '';
export const saveWorksMasterUrl = (url: string) => saveToLocal('works_master_url', url);

// --- UTILS ---
export const createBackup = () => JSON.stringify(CACHE);
export const restoreBackup = (json: string) => {
    try {
        const data = JSON.parse(json);
        Object.keys(data).forEach(key => {
            if (key in CACHE) saveToLocal(key as any, data[key]);
        });
        window.location.reload();
    } catch (e) { alert('Invalid backup file'); }
};
export const clearDatabase = () => {
    localStorage.clear();
    window.location.reload();
};

export const initAutoSync = () => {
    // Placeholder for auto-sync logic
    console.log("Auto sync initialized");
};

// --- MOCK SUPABASE / CLOUD FUNCTIONS ---
export const checkConnection = async () => ({ success: true });
export const uploadToSupabase = async () => { console.log('Upload simulated'); };
export const downloadFromSupabase = async () => { console.log('Download simulated'); };
export const fetchCloudTableData = async (table: string) => [];
export const DB_MAP: Record<string, string> = { schools: 'schools', users: 'system_users' };
export const getTableDisplayName = (name: string) => name;
export const getDatabaseSchemaSQL = () => "-- SQL Schema";
export const getDatabaseUpdateSQL = () => "-- SQL Update";
export const clearCloudTable = async (table: string) => {};
export const resetCloudDatabase = async () => {};
export const backupCloudDatabase = async () => JSON.stringify(CACHE);
export const restoreCloudDatabase = async (json: string) => restoreBackup(json);
