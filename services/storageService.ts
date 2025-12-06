
// ... existing imports ...
import { 
    Student, Teacher, School, SystemUser, 
    AttendanceRecord, PerformanceRecord, 
    Assignment, Subject, ScheduleItem, 
    TeacherAssignment, CustomTable, 
    ReportHeaderConfig, MessageLog, Feedback, 
    AISettings, LessonLink 
} from '../types';
import { supabase } from './supabaseClient';

const KEYS = {
    WORKS_MASTER_URL: 'works_master_url'
};

// ... existing CACHE definition and helpers ...
const CACHE: any = {
    students: [],
    teachers: [],
    schools: [],
    system_users: [],
    subjects: [],
    weekly_schedules: [],
    teacher_assignments: [],
    attendance_records: [],
    performance_records: [],
    assignments: [],
    custom_tables: [],
    messages: [],
    feedback: [],
    lesson_links: [],
    report_header_config: null,
    ai_settings: null,
    works_master_url: localStorage.getItem(KEYS.WORKS_MASTER_URL) || '' 
};

// --- COLOR GENERATOR UTILITY ---
export const generateEntityColor = (str: string) => {
    if (!str) return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
    
    const colors = [
        { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
        { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
        { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
        { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
        { bg: 'bg-lime-100', text: 'text-lime-800', border: 'border-lime-200' },
        { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
        { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
        { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200' },
        { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
        { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-200' },
        { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
        { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200' },
        { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200' },
        { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
        { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-200' },
        { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
        { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200' },
    ];

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};

const toDb = (item: any) => {
    const newItem: any = {};
    Object.keys(item).forEach(key => {
        if (item[key] === undefined) return;
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newItem[dbKey] = item[key];
    });
    return newItem;
};

// ... (Rest of the file remains exactly the same, this is just injecting the helper at the top level exports)
const fromDb = (item: any) => {
    const newItem: any = {};
    Object.keys(item).forEach(key => {
        const appKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newItem[appKey] = item[key];
    });
    return newItem;
};

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
    MESSAGES: 'messages',
    CUSTOM_TABLES: 'custom_tables',
    FEEDBACK: 'feedback',
    LESSON_LINKS: 'lesson_links',
    REPORT_CONFIG: 'report_header_config',
    AI_SETTINGS: 'ai_settings'
};

export const initAutoSync = async () => {
    try {
        const tables = Object.keys(DB_MAP);
        await Promise.all(tables.map(async (key) => {
            const tableName = DB_MAP[key];
            const { data, error } = await supabase.from(tableName).select('*');
            if (!error && data) {
                const cacheKey = Object.keys(CACHE).find(k => k === tableName || (k === 'assignments' && tableName === 'assignments')); 
                if (cacheKey) {
                    if (cacheKey === 'report_header_config' || cacheKey === 'ai_settings') {
                        CACHE[cacheKey] = data.length > 0 ? fromDb(data[0]) : null;
                    } else {
                        CACHE[cacheKey] = data.map(fromDb);
                    }
                }
            }
        }));
        console.log("Cloud Data Loaded Successfully");
    } catch (e) {
        console.error("Failed to load cloud data", e);
    }
};

// ... GENERIC CRUD HELPERS ...
const addToCloud = async (table: string, item: any, cacheKey: string) => {
    if (Array.isArray(CACHE[cacheKey])) {
        CACHE[cacheKey] = [...CACHE[cacheKey], item];
    } else {
        CACHE[cacheKey] = item;
    }
    
    const dbItem = toDb(item);
    const { error } = await supabase.from(table).upsert(dbItem);
    if (error) {
        console.error(`Error adding to ${table}:`, JSON.stringify(error, null, 2));
        if (error.code === 'PGRST204' && error.message.includes('column')) {
             throw new Error(`خطأ في قاعدة البيانات: يوجد عمود مفقود (${error.message}). الرجاء تحديث قاعدة البيانات.`);
        }
        throw new Error(`Cloud Error (${table}): ${error.message || JSON.stringify(error)}`);
    }
};

const updateInCloud = async (table: string, item: any, cacheKey: string) => {
    const list = CACHE[cacheKey];
    if (Array.isArray(list)) {
        const idx = list.findIndex((x: any) => x.id === item.id);
        if (idx > -1) list[idx] = item;
        CACHE[cacheKey] = [...list];
    } else {
        CACHE[cacheKey] = item;
    }
    
    const dbItem = toDb(item);
    const { error } = await supabase.from(table).upsert(dbItem);
    if (error) {
        console.error(`Error updating ${table}:`, JSON.stringify(error, null, 2));
        if (error.code === 'PGRST204' && error.message.includes('column')) {
             throw new Error(`خطأ في قاعدة البيانات: يوجد عمود مفقود (${error.message}). الرجاء تحديث قاعدة البيانات.`);
        }
        throw new Error(`Cloud Update Error: ${error.message}`);
    }
};

const deleteFromCloud = async (table: string, id: string, cacheKey: string) => {
    if (Array.isArray(CACHE[cacheKey])) {
        CACHE[cacheKey] = CACHE[cacheKey].filter((x: any) => x.id !== id);
    }
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
        console.error(`Error deleting from ${table}:`, JSON.stringify(error, null, 2));
        throw new Error(`Cloud Delete Error: ${error.message}`);
    }
};

// --- Students ---
export const getStudents = (): Student[] => CACHE.students;
export const addStudent = async (s: Student) => await addToCloud('students', s, 'students');
export const updateStudent = async (s: Student) => await updateInCloud('students', s, 'students');
export const deleteStudent = async (id: string) => await deleteFromCloud('students', id, 'students');
export const deleteAllStudents = async () => {
    CACHE.students = [];
    await supabase.from('students').delete().neq('id', '0');
};
export const bulkAddStudents = async (list: Student[]) => {
    CACHE.students = [...CACHE.students, ...list];
    const dbList = list.map(toDb);
    await supabase.from('students').upsert(dbList);
};
export const bulkUpdateStudents = async (list: Student[]) => {
    const map = new Map(CACHE.students.map((s: Student) => [s.id, s]));
    list.forEach(s => map.set(s.id, s));
    CACHE.students = Array.from(map.values());
    const dbList = list.map(toDb);
    await supabase.from('students').upsert(dbList);
};
export const bulkUpsertStudents = async (newStudents: Student[], matchKey: keyof Student, strategy: 'UPDATE' | 'SKIP' | 'NEW', updateFields: string[]) => {
    let current = [...CACHE.students];
    const updates: any[] = [];
    const inserts: any[] = [];

    newStudents.forEach(newItem => {
        const existingIdx = current.findIndex(c => c[matchKey] === newItem[matchKey]);
        if (existingIdx > -1) {
            if (strategy === 'UPDATE') {
                const existing = { ...current[existingIdx] };
                updateFields.forEach(field => { (existing as any)[field] = (newItem as any)[field]; });
                current[existingIdx] = existing;
                updates.push(existing);
            }
        } else {
            current.push(newItem);
            inserts.push(newItem);
        }
    });
    CACHE.students = current;
    
    if (inserts.length) await supabase.from('students').insert(inserts.map(toDb));
    if (updates.length) await supabase.from('students').upsert(updates.map(toDb));
};

// --- Teachers & System Users ---
export const getTeachers = (): Teacher[] => CACHE.teachers;
export const addTeacher = async (t: Teacher) => {
    await addToCloud('teachers', t, 'teachers');
    const systemUser: SystemUser = {
        id: t.id,
        name: t.name,
        email: t.email || t.nationalId || `t${t.id}@school.com`,
        nationalId: t.nationalId,
        password: t.password,
        role: 'TEACHER',
        schoolId: t.schoolId,
        status: 'ACTIVE'
    };
    await addToCloud('system_users', systemUser, 'system_users');
};

export const updateTeacher = async (t: Teacher) => {
    await updateInCloud('teachers', t, 'teachers');
    const user = CACHE.system_users.find((u: SystemUser) => u.id === t.id);
    if (user) {
        await updateInCloud('system_users', { 
            ...user, 
            name: t.name, 
            email: t.email, 
            nationalId: t.nationalId, 
            password: t.password,
            schoolId: t.schoolId
        }, 'system_users');
    }
};

// --- Schools ---
export const getSchools = (): School[] => CACHE.schools;
export const addSchool = async (s: School) => await addToCloud('schools', s, 'schools');
export const updateSchool = async (s: School) => await updateInCloud('schools', s, 'schools');
export const deleteSchool = async (id: string) => await deleteFromCloud('schools', id, 'schools');

// --- System Users ---
export const getSystemUsers = (): SystemUser[] => CACHE.system_users;
export const addSystemUser = async (u: SystemUser) => await addToCloud('system_users', u, 'system_users');
export const updateSystemUser = async (u: SystemUser) => await updateInCloud('system_users', u, 'system_users');
export const deleteSystemUser = async (id: string) => await deleteFromCloud('system_users', id, 'system_users');

// --- Subjects ---
export const getSubjects = (): Subject[] => CACHE.subjects;
export const addSubject = async (s: Subject) => await addToCloud('subjects', s, 'subjects');
export const deleteSubject = async (id: string) => await deleteFromCloud('subjects', id, 'subjects');

// --- Schedules ---
export const getSchedules = (): ScheduleItem[] => CACHE.weekly_schedules;
export const saveScheduleItem = async (item: ScheduleItem) => {
    const list = CACHE.weekly_schedules;
    const idx = list.findIndex((x: any) => x.id === item.id);
    if (idx > -1) list[idx] = item; else list.push(item);
    CACHE.weekly_schedules = [...list];
    await supabase.from('weekly_schedules').upsert(toDb(item));
};
export const deleteScheduleItem = async (id: string) => await deleteFromCloud('weekly_schedules', id, 'weekly_schedules');

// --- Teacher Assignments ---
export const getTeacherAssignments = (): TeacherAssignment[] => CACHE.teacher_assignments;
export const saveTeacherAssignment = async (item: TeacherAssignment) => {
    const list = CACHE.teacher_assignments;
    const idx = list.findIndex((x: any) => x.classId === item.classId && x.subjectName === item.subjectName);
    if (idx > -1) list[idx] = item; else list.push(item);
    CACHE.teacher_assignments = [...list];
    await supabase.from('teacher_assignments').upsert(toDb(item));
};

// --- Attendance ---
export const getAttendance = (): AttendanceRecord[] => CACHE.attendance_records;
export const saveAttendance = async (records: AttendanceRecord[]) => {
    const list = CACHE.attendance_records;
    records.forEach(r => {
        const idx = list.findIndex((x: any) => x.id === r.id);
        if(idx > -1) list[idx] = r; else list.push(r);
    });
    CACHE.attendance_records = [...list];
    await supabase.from('attendance_records').upsert(records.map(toDb));
};
export const bulkAddAttendance = async (list: AttendanceRecord[]) => {
    CACHE.attendance_records = [...CACHE.attendance_records, ...list];
    await supabase.from('attendance_records').upsert(list.map(toDb));
};

// --- Performance ---
export const getPerformance = (): PerformanceRecord[] => CACHE.performance_records;
export const addPerformance = async (p: PerformanceRecord) => await addToCloud('performance_records', p, 'performance_records'); 
export const bulkAddPerformance = async (list: PerformanceRecord[]) => {
    CACHE.performance_records = [...CACHE.performance_records, ...list];
    await supabase.from('performance_records').upsert(list.map(toDb));
};

// --- Assignments ---
export const getAssignments = (category?: string): Assignment[] => {
    const all = CACHE.assignments || [];
    if(category) return all.filter((a: any) => a.category === category);
    return all;
};
export const saveAssignment = async (a: Assignment) => await updateInCloud('assignments', a, 'assignments');
export const deleteAssignment = async (id: string) => await deleteFromCloud('assignments', id, 'assignments');
export const bulkSaveAssignments = async (list: Assignment[]) => {
    CACHE.assignments = list;
    await supabase.from('assignments').upsert(list.map(toDb));
};

// --- Custom Tables ---
export const getCustomTables = (): CustomTable[] => CACHE.custom_tables;
export const addCustomTable = async (t: CustomTable) => await addToCloud('custom_tables', t, 'custom_tables');
export const updateCustomTable = async (t: CustomTable) => await updateInCloud('custom_tables', t, 'custom_tables');
export const deleteCustomTable = async (id: string) => await deleteFromCloud('custom_tables', id, 'custom_tables');

// --- Messages ---
export const getMessages = (): MessageLog[] => CACHE.messages;
export const saveMessage = async (m: MessageLog) => await addToCloud('messages', m, 'messages');

// --- Feedback ---
export const getFeedback = (): Feedback[] => CACHE.feedback;
export const addFeedback = async (f: Feedback) => await addToCloud('feedback', f, 'feedback');

// --- Lesson Links ---
export const getLessonLinks = (): LessonLink[] => CACHE.lesson_links;
export const saveLessonLink = async (l: LessonLink) => await addToCloud('lesson_links', l, 'lesson_links');
export const deleteLessonLink = async (id: string) => await deleteFromCloud('lesson_links', id, 'lesson_links');

// --- Configs ---
export const getReportHeaderConfig = (): ReportHeaderConfig => {
    return CACHE.report_header_config || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};
export const saveReportHeaderConfig = async (c: ReportHeaderConfig) => {
    CACHE.report_header_config = c;
    await supabase.from('report_header_config').upsert({ id: '1', ...toDb(c) });
};

export const getAISettings = (): AISettings => {
    return CACHE.ai_settings || { modelId: 'gemini-2.5-flash', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' };
};
export const saveAISettings = async (s: AISettings) => {
    CACHE.ai_settings = s;
    await supabase.from('ai_settings').upsert({ id: '1', ...toDb(s) });
};

export const getWorksMasterUrl = (): string => CACHE.works_master_url || '';
export const saveWorksMasterUrl = (url: string) => {
    CACHE.works_master_url = url;
    localStorage.setItem(KEYS.WORKS_MASTER_URL, url); 
};

// ... System Demo & Sync Stubs ...
let isDemoMode = false;
export const isSystemDemo = () => isDemoMode;
export const setSystemMode = (isDemo: boolean) => { 
    isDemoMode = isDemo; 
    if(isDemo) {
        if(!CACHE.system_users.find((u:any) => u.email === 'manager@demo.com')) {
            CACHE.system_users.push({ id: 'demo_manager', name: 'مدير تجريبي', email: 'manager@demo.com', role: 'SCHOOL_MANAGER', status: 'ACTIVE' });
        }
        if(!CACHE.system_users.find((u:any) => u.email === 'teacher@demo.com')) {
            CACHE.system_users.push({ id: 'demo_teacher', name: 'معلم تجريبي', email: 'teacher@demo.com', role: 'TEACHER', status: 'ACTIVE' });
        }
        if(!CACHE.students.find((s:any) => s.nationalId === '1010101010')) {
            CACHE.students.push({ id: 'demo_student', name: 'طالب تجريبي', nationalId: '1010101010', gradeLevel: 'الأول', className: '1/أ' });
        }
    }
};

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
        return { success: !error };
    } catch { return { success: false }; }
};

export const uploadToSupabase = async () => { return true; };
export const downloadFromSupabase = async () => { await initAutoSync(); return true; };

export const getStorageStatistics = () => {
    return {
        students: CACHE.students.length,
        attendance: CACHE.attendance_records.length,
        performance: CACHE.performance_records.length
    };
};

export const getCloudStatistics = async () => {
    const { count: s } = await supabase.from('schools').select('*', { count: 'exact', head: true });
    const { count: u } = await supabase.from('system_users').select('*', { count: 'exact', head: true });
    return { schools: s || 0, users: u || 0 };
};

export const fetchCloudTableData = async (table: string) => {
    const { data, error } = await supabase.from(table).select('*').limit(100);
    if(error) throw error;
    return data;
};

export const clearCloudTable = async (table: string) => {
    await supabase.from(table).delete().neq('id', '0');
};

export const resetCloudDatabase = async () => {
    for(const table of Object.values(DB_MAP)) {
        await clearCloudTable(table);
    }
};

export const createBackup = () => JSON.stringify(CACHE);
export const restoreBackup = (json: string) => {
    try {
        const backup = JSON.parse(json);
        Object.keys(backup).forEach(key => CACHE[key] = backup[key]);
        alert('Data loaded to memory. To persist, please use the Cloud Sync/Restore features.');
    } catch (e) {
        alert('Invalid backup file');
    }
};

export const backupCloudDatabase = async (): Promise<string> => {
    const backup: Record<string, any[]> = {};
    for (const table of Object.values(DB_MAP)) {
        const { data, error } = await supabase.from(table).select('*');
        if(!error && data) backup[table] = data;
    }
    return JSON.stringify(backup);
};

export const restoreCloudDatabase = async (jsonString: string) => {
    try {
        const data = JSON.parse(jsonString);
        for (const table of Object.keys(data)) {
            const rows = data[table];
            if(Array.isArray(rows) && rows.length > 0) {
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
        throw new Error('Restore failed');
    }
};

export const clearDatabase = () => {
    Object.keys(CACHE).forEach(k => {
        if (Array.isArray(CACHE[k])) CACHE[k] = [];
        else CACHE[k] = null;
    });
};

export const getTableDisplayName = (table: string) => table;

// ... SQL SCHEMAS ...
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
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT,
    password TEXT,
    email TEXT,
    phone TEXT,
    subject_specialty TEXT,
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    manager_id TEXT, 
    subscription_status TEXT DEFAULT 'FREE',
    subscription_end_date TEXT,
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

-- 6. Assignments
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

-- 7. Performance Records
CREATE TABLE IF NOT EXISTS performance_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
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
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
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
    teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Teacher Assignments
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id TEXT PRIMARY KEY,
    class_id TEXT,
    subject_name TEXT,
    teacher_id TEXT REFERENCES teachers(id) ON DELETE SET NULL,
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
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    student_name TEXT,
    parent_phone TEXT,
    type TEXT,
    content TEXT,
    status TEXT,
    sent_by TEXT,
    date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Configs
CREATE TABLE IF NOT EXISTS report_header_config (
    id TEXT PRIMARY KEY,
    school_name TEXT,
    education_admin TEXT,
    teacher_name TEXT,
    school_manager TEXT,
    academic_year TEXT,
    term TEXT,
    logo_base64 TEXT
);

CREATE TABLE IF NOT EXISTS ai_settings (
    id TEXT PRIMARY KEY,
    model_id TEXT,
    temperature NUMERIC,
    enable_reports BOOLEAN,
    enable_quiz BOOLEAN,
    enable_planning BOOLEAN,
    system_instruction TEXT
);

CREATE TABLE IF NOT EXISTS lesson_links (
    id TEXT PRIMARY KEY,
    title TEXT,
    url TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    manager_id TEXT,
    content TEXT,
    date TEXT,
    is_read BOOLEAN
);

CREATE TABLE IF NOT EXISTS custom_tables (
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at TEXT,
    columns TEXT[], 
    rows JSONB,
    source_url TEXT,
    last_updated TEXT
);
`;
};

export const getDatabaseUpdateSQL = () => {
    return `
-- Fix for Schools Table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS manager_national_id TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS education_administration TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS ministry_code TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS works_master_url TEXT;

-- Fix for System Users
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS national_id TEXT;

-- Fix for Teachers
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'FREE';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subscription_end_date TEXT;

-- Reload Schema Cache (Important for PostgREST)
NOTIFY pgrst, 'reload config';
`;
};
