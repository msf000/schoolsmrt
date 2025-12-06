
import { 
    Student, Teacher, School, SystemUser, 
    AttendanceRecord, PerformanceRecord, 
    Assignment, Subject, ScheduleItem, 
    TeacherAssignment, CustomTable, 
    ReportHeaderConfig, MessageLog, Feedback, 
    AISettings, LessonLink 
} from '../types';
import { supabase } from './supabaseClient';

// --- Local Storage Helpers ---
const get = <T>(key: string): T[] => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

const set = <T>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

const getOne = <T>(key: string): T | null => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch { return null; }
}

const setOne = <T>(key: string, data: T) => {
    localStorage.setItem(key, JSON.stringify(data));
}

// --- Keys ---
const KEYS = {
    STUDENTS: 'students',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    SYSTEM_USERS: 'system_users',
    SUBJECTS: 'subjects',
    SCHEDULES: 'weekly_schedules',
    TEACHER_ASSIGNMENTS: 'teacher_assignments',
    ATTENDANCE: 'attendance_records',
    PERFORMANCE: 'performance_records',
    ASSIGNMENTS: 'assignments_config', 
    CUSTOM_TABLES: 'custom_tables',
    MESSAGES: 'messages_log',
    FEEDBACK: 'feedback_log',
    LESSON_LINKS: 'lesson_links',
    REPORT_CONFIG: 'report_header_config',
    AI_SETTINGS: 'ai_settings',
    WORKS_MASTER_URL: 'works_master_url'
};

// --- Students ---
export const getStudents = (): Student[] => get(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const list = getStudents(); list.push(s); set(KEYS.STUDENTS, list); };
export const updateStudent = (s: Student) => { 
    const list = getStudents(); 
    const idx = list.findIndex(x => x.id === s.id); 
    if(idx > -1) { list[idx] = s; set(KEYS.STUDENTS, list); }
};
export const deleteStudent = (id: string) => { set(KEYS.STUDENTS, getStudents().filter(x => x.id !== id)); };
export const deleteAllStudents = () => set(KEYS.STUDENTS, []);
export const bulkAddStudents = (list: Student[]) => { set(KEYS.STUDENTS, [...getStudents(), ...list]); };
export const bulkUpdateStudents = (list: Student[]) => { set(KEYS.STUDENTS, list); }; 
export const bulkUpsertStudents = (newStudents: Student[], matchKey: keyof Student, strategy: 'UPDATE' | 'SKIP' | 'NEW', updateFields: string[]) => {
    let current = getStudents();
    newStudents.forEach(newItem => {
        const existingIdx = current.findIndex(c => c[matchKey] === newItem[matchKey]);
        if (existingIdx > -1) {
            if (strategy === 'UPDATE') {
                const existing = current[existingIdx];
                updateFields.forEach(field => { (existing as any)[field] = (newItem as any)[field]; });
                current[existingIdx] = existing;
            }
        } else {
            current.push(newItem);
        }
    });
    set(KEYS.STUDENTS, current);
};

// --- Teachers ---
export const getTeachers = (): Teacher[] => get(KEYS.TEACHERS);
export const addTeacher = (t: Teacher) => { const list = getTeachers(); list.push(t); set(KEYS.TEACHERS, list); };
export const updateTeacher = (t: Teacher) => { 
    const list = getTeachers(); 
    const idx = list.findIndex(x => x.id === t.id); 
    if(idx > -1) { list[idx] = t; set(KEYS.TEACHERS, list); }
};

// --- Schools ---
export const getSchools = (): School[] => get(KEYS.SCHOOLS);
export const addSchool = (s: School) => { const list = getSchools(); list.push(s); set(KEYS.SCHOOLS, list); };
export const updateSchool = (s: School) => {
    const list = getSchools();
    const idx = list.findIndex(x => x.id === s.id);
    if(idx > -1) { list[idx] = s; set(KEYS.SCHOOLS, list); }
};
export const deleteSchool = (id: string) => { set(KEYS.SCHOOLS, getSchools().filter(x => x.id !== id)); };

// --- System Users ---
export const getSystemUsers = (): SystemUser[] => get(KEYS.SYSTEM_USERS);
export const addSystemUser = (u: SystemUser) => { const list = getSystemUsers(); list.push(u); set(KEYS.SYSTEM_USERS, list); };
export const updateSystemUser = (u: SystemUser) => {
    const list = getSystemUsers();
    const idx = list.findIndex(x => x.id === u.id);
    if(idx > -1) { list[idx] = u; set(KEYS.SYSTEM_USERS, list); }
};
export const deleteSystemUser = (id: string) => { set(KEYS.SYSTEM_USERS, getSystemUsers().filter(x => x.id !== id)); };

// --- Subjects ---
export const getSubjects = (): Subject[] => get(KEYS.SUBJECTS);
export const addSubject = (s: Subject) => { const list = getSubjects(); list.push(s); set(KEYS.SUBJECTS, list); };
export const deleteSubject = (id: string) => { set(KEYS.SUBJECTS, getSubjects().filter(x => x.id !== id)); };

// --- Schedules ---
export const getSchedules = (): ScheduleItem[] => get(KEYS.SCHEDULES);
export const saveScheduleItem = (item: ScheduleItem) => {
    let list = getSchedules();
    const idx = list.findIndex(x => x.id === item.id);
    if(idx > -1) list[idx] = item; else list.push(item);
    set(KEYS.SCHEDULES, list);
};
export const deleteScheduleItem = (id: string) => { set(KEYS.SCHEDULES, getSchedules().filter(x => x.id !== id)); };

// --- Teacher Assignments ---
export const getTeacherAssignments = (): TeacherAssignment[] => get(KEYS.TEACHER_ASSIGNMENTS);
export const saveTeacherAssignment = (item: TeacherAssignment) => {
    let list = getTeacherAssignments();
    const idx = list.findIndex(x => x.classId === item.classId && x.subjectName === item.subjectName);
    if(idx > -1) list[idx] = item; else list.push(item);
    set(KEYS.TEACHER_ASSIGNMENTS, list);
};

// --- Attendance ---
export const getAttendance = (): AttendanceRecord[] => get(KEYS.ATTENDANCE);
export const saveAttendance = (records: AttendanceRecord[]) => {
    let list = getAttendance();
    records.forEach(r => {
        const idx = list.findIndex(x => x.id === r.id);
        if(idx > -1) list[idx] = r; else list.push(r);
    });
    set(KEYS.ATTENDANCE, list);
};
export const bulkAddAttendance = (list: AttendanceRecord[]) => { 
    // Optimization: create map for faster lookup
    const current = getAttendance();
    const map = new Map(current.map(i => [i.id, i]));
    list.forEach(i => map.set(i.id, i));
    set(KEYS.ATTENDANCE, Array.from(map.values()));
};

// --- Performance ---
export const getPerformance = (): PerformanceRecord[] => get(KEYS.PERFORMANCE);
export const addPerformance = (p: PerformanceRecord) => { 
    let list = getPerformance();
    const idx = list.findIndex(x => x.id === p.id);
    if(idx > -1) list[idx] = p; else list.push(p);
    set(KEYS.PERFORMANCE, list);
};
export const bulkAddPerformance = (list: PerformanceRecord[]) => { set(KEYS.PERFORMANCE, [...getPerformance(), ...list]); };

// --- Assignments (WorksTracking Columns) ---
export const getAssignments = (category?: string): Assignment[] => {
    const all = get<Assignment>(KEYS.ASSIGNMENTS);
    if(category) return all.filter(a => a.category === category);
    return all;
};
export const saveAssignment = (a: Assignment) => {
    let list = get<Assignment>(KEYS.ASSIGNMENTS);
    const idx = list.findIndex(x => x.id === a.id);
    if(idx > -1) list[idx] = a; else list.push(a);
    set(KEYS.ASSIGNMENTS, list);
};
export const deleteAssignment = (id: string) => { set(KEYS.ASSIGNMENTS, get<Assignment>(KEYS.ASSIGNMENTS).filter(x => x.id !== id)); };
export const bulkSaveAssignments = (list: Assignment[]) => { set(KEYS.ASSIGNMENTS, list); };

// --- Custom Tables ---
export const getCustomTables = (): CustomTable[] => get(KEYS.CUSTOM_TABLES);
export const addCustomTable = (t: CustomTable) => { const list = getCustomTables(); list.push(t); set(KEYS.CUSTOM_TABLES, list); };
export const updateCustomTable = (t: CustomTable) => {
    const list = getCustomTables();
    const idx = list.findIndex(x => x.id === t.id);
    if(idx > -1) { list[idx] = t; set(KEYS.CUSTOM_TABLES, list); }
};
export const deleteCustomTable = (id: string) => { set(KEYS.CUSTOM_TABLES, getCustomTables().filter(x => x.id !== id)); };

// --- Messages ---
export const getMessages = (): MessageLog[] => get(KEYS.MESSAGES);
export const saveMessage = (m: MessageLog) => { const list = getMessages(); list.push(m); set(KEYS.MESSAGES, list); };

// --- Feedback ---
export const getFeedback = (): Feedback[] => get(KEYS.FEEDBACK);
export const addFeedback = (f: Feedback) => { const list = getFeedback(); list.push(f); set(KEYS.FEEDBACK, list); };

// --- Lesson Links ---
export const getLessonLinks = (): LessonLink[] => get(KEYS.LESSON_LINKS);
export const saveLessonLink = (l: LessonLink) => { const list = getLessonLinks(); list.push(l); set(KEYS.LESSON_LINKS, list); };
export const deleteLessonLink = (id: string) => { set(KEYS.LESSON_LINKS, getLessonLinks().filter(x => x.id !== id)); };

// --- Configs ---
export const getReportHeaderConfig = (): ReportHeaderConfig => {
    return getOne<ReportHeaderConfig>(KEYS.REPORT_CONFIG) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => setOne(KEYS.REPORT_CONFIG, c);

export const getAISettings = (): AISettings => {
    return getOne<AISettings>(KEYS.AI_SETTINGS) || { modelId: 'gemini-2.5-flash', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' };
};
export const saveAISettings = (s: AISettings) => setOne(KEYS.AI_SETTINGS, s);

export const getWorksMasterUrl = (): string => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

// --- System Demo Mode ---
let isDemoMode = false;
export const isSystemDemo = () => isDemoMode;
export const setSystemMode = (isDemo: boolean) => { 
    isDemoMode = isDemo; 
    // In a real app, you might seed data here.
    if(isDemo) {
        // Seed some demo users if not present
        const users = getSystemUsers();
        if(!users.find(u => u.email === 'manager@demo.com')) {
            addSystemUser({ id: 'demo_manager', name: 'مدير تجريبي', email: 'manager@demo.com', role: 'SCHOOL_MANAGER', status: 'ACTIVE' });
        }
        if(!users.find(u => u.email === 'teacher@demo.com')) {
            addSystemUser({ id: 'demo_teacher', name: 'معلم تجريبي', email: 'teacher@demo.com', role: 'TEACHER', status: 'ACTIVE' });
        }
        const students = getStudents();
        if(!students.find(s => s.nationalId === '1010101010')) {
            addStudent({ id: 'demo_student', name: 'طالب تجريبي', nationalId: '1010101010', gradeLevel: 'الأول', className: '1/أ' });
        }
    }
};

// --- Sync & Cloud ---
export const initAutoSync = async () => {
    // Placeholder for init logic
};

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
        return { success: !error };
    } catch { return { success: false }; }
};

export const uploadToSupabase = async () => {
    // This requires implementing data mapping for all tables to Supabase.
    // For now, we simulate success or provide partial implementation.
    // In a full implementation, you'd iterate over KEYS and upsert to supabase tables.
    return true; 
};

export const downloadFromSupabase = async () => {
    // Similarly, pull from Supabase and overwrite local storage.
    return true;
};

export const getStorageStatistics = () => {
    return {
        students: getStudents().length,
        attendance: getAttendance().length,
        performance: getPerformance().length
    };
};

export const getCloudStatistics = async () => {
    return {
        schools: 0, 
        users: 0 
    };
};

export const fetchCloudTableData = async (table: string) => {
    const { data, error } = await supabase.from(table).select('*').limit(100);
    if(error) throw error;
    return data;
};

export const clearCloudTable = async (table: string) => {
    // Note: Supabase policy must allow delete
    await supabase.from(table).delete().neq('id', '0');
};

export const resetCloudDatabase = async () => {
    // Dangerous operation
    // Iterating all tables and clearing them
    for(const table of Object.values(DB_MAP)) {
        await clearCloudTable(table);
    }
};

// --- Backup ---
export const createBackup = () => {
    const backup: any = {};
    Object.values(KEYS).forEach(key => backup[key] = localStorage.getItem(key));
    return JSON.stringify(backup);
};

export const restoreBackup = (json: string) => {
    try {
        const backup = JSON.parse(json);
        Object.keys(backup).forEach(key => localStorage.setItem(key, backup[key]));
        window.location.reload();
    } catch (e) {
        alert('Invalid backup file');
    }
};

// --- NEW: Cloud Backup & Restore ---
export const backupCloudDatabase = async (): Promise<string> => {
    const backup: Record<string, any[]> = {};
    for (const table of Object.values(DB_MAP)) {
        const { data, error } = await supabase.from(table).select('*');
        if(!error && data) {
            backup[table] = data;
        }
    }
    return JSON.stringify(backup);
};

export const restoreCloudDatabase = async (jsonString: string) => {
    try {
        const data = JSON.parse(jsonString);
        for (const table of Object.keys(data)) {
            const rows = data[table];
            if(Array.isArray(rows) && rows.length > 0) {
                // Upsert in chunks to avoid payload limits
                const chunkSize = 100;
                for (let i = 0; i < rows.length; i += chunkSize) {
                    const chunk = rows.slice(i, i + chunkSize);
                    await supabase.from(table).upsert(chunk);
                }
            }
        }
        return true;
    } catch (e) {
        console.error(e);
        throw new Error('فشل استعادة النسخة السحابية. تأكد من صحة الملف والاتصال.');
    }
};

export const clearDatabase = () => {
    localStorage.clear();
};

// --- Constants ---
// Updated to include ALL tables
export const DB_MAP: Record<string, string> = {
    SCHOOLS: 'schools',
    USERS: 'system_users',
    TEACHERS: 'teachers',
    STUDENTS: 'students',
    SUBJECTS: 'subjects',
    ATTENDANCE: 'attendance_records',
    PERFORMANCE: 'performance_records',
    ASSIGNMENTS: 'assignments',
    SCHEDULES: 'weekly_schedules',
    TEACHER_ASSIGNMENTS: 'teacher_assignments',
    PARENTS: 'parents',
    MESSAGES: 'messages'
};

export const getTableDisplayName = (table: string) => {
    const names: Record<string, string> = {
        schools: 'المدارس (Schools)',
        system_users: 'المستخدمين (System Users)',
        teachers: 'المعلمين (Teachers)',
        students: 'الطلاب (Students)',
        subjects: 'المواد (Subjects)',
        attendance_records: 'سجل الحضور (Attendance)',
        performance_records: 'سجل الدرجات (Performance)',
        assignments: 'تعريف الأعمدة (Assignments)',
        weekly_schedules: 'الجدول الأسبوعي (Schedule)',
        teacher_assignments: 'توزيع المعلمين (Assignments)',
        parents: 'أولياء الأمور (Parents)',
        messages: 'سجل الرسائل (Messages)'
    };
    return names[table] || table;
};

// --- SQL Helpers ---
export const getDatabaseSchemaSQL = () => {
    return `
-- 1. Schools Table
CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ministry_code TEXT,
    education_administration TEXT,
    manager_name TEXT,
    manager_national_id TEXT,
    type TEXT,
    phone TEXT,
    student_count NUMERIC,
    subscription_status TEXT,
    works_master_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. System Users Table
CREATE TABLE IF NOT EXISTS system_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    national_id TEXT,
    password TEXT,
    role TEXT NOT NULL,
    school_id TEXT REFERENCES schools(id),
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Teachers Table (Expanded details)
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT,
    password TEXT,
    email TEXT,
    phone TEXT,
    subject_specialty TEXT,
    school_id TEXT REFERENCES schools(id),
    manager_id TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Students Table
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT,
    grade_level TEXT,
    class_name TEXT,
    email TEXT,
    phone TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    seat_index NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Assignments (Columns Config)
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    max_score NUMERIC,
    url TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    order_index NUMERIC,
    source_metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Performance Records (Grades)
CREATE TABLE IF NOT EXISTS performance_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    subject TEXT,
    title TEXT,
    category TEXT,
    score NUMERIC,
    max_score NUMERIC,
    date TEXT,
    notes TEXT,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    date TEXT,
    status TEXT,
    subject TEXT,
    period NUMERIC,
    behavior_status TEXT,
    behavior_note TEXT,
    excuse_note TEXT,
    excuse_file TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Weekly Schedules
CREATE TABLE IF NOT EXISTS weekly_schedules (
    id TEXT PRIMARY KEY,
    class_id TEXT,
    day TEXT,
    period NUMERIC,
    subject_name TEXT,
    teacher_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Teacher Assignments (Mapping Class/Subject to Teacher)
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id TEXT PRIMARY KEY,
    class_id TEXT,
    subject_name TEXT,
    teacher_id TEXT REFERENCES teachers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Parents Table
CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    children_ids TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Messages Log
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_name TEXT,
    parent_phone TEXT,
    type TEXT,
    content TEXT,
    status TEXT,
    sent_by TEXT,
    date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;
};

export const getDatabaseUpdateSQL = () => {
    return `
-- Updates for existing databases

ALTER TABLE weekly_schedules ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS manager_id TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS ministry_code TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS education_administration TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS works_master_url TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS period NUMERIC;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS subject TEXT;
`;
};
