
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

// --- IN-MEMORY CACHE (Single Source of Truth for UI) ---
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

// --- HELPER: DATA MAPPING (App <-> DB) ---
// Convert App (camelCase) to DB (snake_case)
const toDb = (item: any) => {
    const newItem: any = {};
    Object.keys(item).forEach(key => {
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newItem[dbKey] = item[key];
    });
    return newItem;
};

// Convert DB (snake_case) to App (camelCase)
const fromDb = (item: any) => {
    const newItem: any = {};
    Object.keys(item).forEach(key => {
        const appKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        newItem[appKey] = item[key];
    });
    return newItem;
};

// --- INITIALIZATION (Load all from Cloud) ---
export const initAutoSync = async () => {
    try {
        const tables = Object.keys(DB_MAP);
        await Promise.all(tables.map(async (key) => {
            const tableName = DB_MAP[key];
            const { data, error } = await supabase.from(tableName).select('*');
            if (!error && data) {
                // Determine cache key based on table name
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
        
        // Special case for mappings manual fix if needed
        // console.log("Cloud Data Loaded:", CACHE);
    } catch (e) {
        console.error("Failed to load cloud data", e);
    }
};

// --- GENERIC CRUD HELPERS ---
const addToCloud = async (table: string, item: any, cacheKey: string) => {
    // 1. Update Cache Optimistically
    CACHE[cacheKey] = [...(CACHE[cacheKey] || []), item];
    // 2. Send to Cloud
    const dbItem = toDb(item);
    await supabase.from(table).upsert(dbItem);
};

const updateInCloud = async (table: string, item: any, cacheKey: string) => {
    // 1. Update Cache
    const list = CACHE[cacheKey] || [];
    const idx = list.findIndex((x: any) => x.id === item.id);
    if (idx > -1) list[idx] = item;
    CACHE[cacheKey] = [...list];
    
    // 2. Send to Cloud
    const dbItem = toDb(item);
    await supabase.from(table).upsert(dbItem);
};

const deleteFromCloud = async (table: string, id: string, cacheKey: string) => {
    // 1. Update Cache
    CACHE[cacheKey] = (CACHE[cacheKey] || []).filter((x: any) => x.id !== id);
    // 2. Send to Cloud
    await supabase.from(table).delete().eq('id', id);
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
    // Update cache map
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

// ** IMPORTANT: Add Teacher also adds to System Users for Login **
export const addTeacher = async (t: Teacher) => {
    // 1. Add to Teachers Table
    await addToCloud('teachers', t, 'teachers');
    
    // 2. Add to System Users Table (For Login)
    const systemUser: SystemUser = {
        id: t.id,
        name: t.name,
        email: t.email || t.nationalId || '', // Fallback for email field
        nationalId: t.nationalId,
        password: t.password,
        role: 'TEACHER',
        schoolId: t.schoolId,
        status: 'ACTIVE'
    };
    
    // Check if user exists first to avoid duplicate key error if reusing ID
    const existingUser = CACHE.system_users.find((u: SystemUser) => u.id === t.id || u.nationalId === t.nationalId);
    if (!existingUser) {
        await addToCloud('system_users', systemUser, 'system_users');
    } else {
        await updateInCloud('system_users', { ...existingUser, ...systemUser }, 'system_users');
    }
};

export const updateTeacher = async (t: Teacher) => {
    await updateInCloud('teachers', t, 'teachers');
    // Sync update to system user if exists
    const user = CACHE.system_users.find((u: SystemUser) => u.id === t.id);
    if (user) {
        await updateInCloud('system_users', { ...user, name: t.name, email: t.email, nationalId: t.nationalId, password: t.password }, 'system_users');
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
    // Check if exists in cache to decide insert vs update logic if ID matches
    // But since we use upsert, simple add/update logic works
    // Maintain uniqueness in cache
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
export const addPerformance = async (p: PerformanceRecord) => await addToCloud('performance_records', p, 'performance_records'); // Note: Single add
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
    // Assuming single config row with ID '1' or similar strategy
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
    // Logic to save this specific string setting to DB if needed, or keep local for now as per legacy
    localStorage.setItem(KEYS.WORKS_MASTER_URL, url); 
};

// --- System Demo Mode ---
let isDemoMode = false;
export const isSystemDemo = () => isDemoMode;
export const setSystemMode = (isDemo: boolean) => { 
    isDemoMode = isDemo; 
    // In demo mode, we might seed local cache with fake data
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

// --- Sync Stubs (Now mostly redundant as we are Cloud-First, but kept for compatibility) ---
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
    // Real check
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

// --- Backup ---
export const createBackup = () => {
    return JSON.stringify(CACHE);
};

export const restoreBackup = (json: string) => {
    try {
        const backup = JSON.parse(json);
        Object.keys(backup).forEach(key => CACHE[key] = backup[key]);
        // TODO: Push restored data to Cloud
        alert('Data loaded to memory. Please implement full restore logic to push to cloud.');
    } catch (e) {
        alert('Invalid backup file');
    }
};

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
    // Resets memory cache only
    Object.keys(CACHE).forEach(k => {
        if (Array.isArray(CACHE[k])) CACHE[k] = [];
        else CACHE[k] = null;
    });
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

export const getTableDisplayName = (table: string) => {
    // Helper names
    return table;
};

// SQL Helpers maintained for AdminDashboard usage
export const getDatabaseSchemaSQL = () => `/* SQL Definition ... */`;
export const getDatabaseUpdateSQL = () => `/* SQL Updates ... */`;