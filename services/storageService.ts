
import { 
    Student, Teacher, School, SystemUser, 
    AttendanceRecord, PerformanceRecord, 
    Assignment, ScheduleItem, WeeklyPlanItem, 
    LessonLink, Exam, Question, ExamResult,
    Feedback, CustomTable, MessageLog,
    AISettings, ReportHeaderConfig, UserTheme,
    Subject, AcademicTerm, CurriculumUnit, CurriculumLesson, MicroConcept,
    TrackingSheet, TeacherAssignment, StoredLessonPlan, TermPeriod
} from '../types';
import { supabase } from './supabaseClient';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ONLINE' | 'OFFLINE' | 'ERROR';

const KEYS = {
    STUDENTS: 'students',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    SYSTEM_USERS: 'system_users',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    WORKS_ASSIGNMENTS: 'works_assignments',
    SCHEDULES: 'schedules',
    WEEKLY_PLANS: 'weekly_plans',
    LESSON_LINKS: 'lesson_links',
    EXAMS: 'exams',
    EXAM_RESULTS: 'exam_results',
    FEEDBACK: 'feedback',
    CUSTOM_TABLES: 'custom_tables',
    MESSAGES: 'messages',
    AI_SETTINGS: 'ai_settings',
    REPORT_CONFIG: 'report_config',
    USER_THEME: 'user_theme',
    SUBJECTS: 'subjects',
    ACADEMIC_TERMS: 'academic_terms',
    CURRICULUM_UNITS: 'curriculum_units',
    CURRICULUM_LESSONS: 'curriculum_lessons',
    MICRO_CONCEPTS: 'micro_concepts',
    TRACKING_SHEETS: 'tracking_sheets',
    TEACHER_ASSIGNMENTS: 'teacher_assignments',
    LESSON_PLANS: 'lesson_plans',
    QUESTION_BANK: 'question_bank'
};

export const DB_MAP: Record<string, string> = {
    'schools': KEYS.SCHOOLS,
    'teachers': KEYS.TEACHERS,
    'students': KEYS.STUDENTS,
    'attendance': KEYS.ATTENDANCE,
    'performance': KEYS.PERFORMANCE
};

// --- GENERIC HELPERS ---
function get<T>(key: string): T[] {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch (e) {
        console.error(`Error getting key ${key}`, e);
        return [];
    }
}

function save<T>(key: string, data: T[]) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        notifyDataChange();
    } catch (e) {
        console.error(`Error saving key ${key}`, e);
    }
}

// --- SUBSCRIBERS ---
let syncStatusListeners: ((status: SyncStatus) => void)[] = [];
let dataChangeListeners: (() => void)[] = [];

export const subscribeToSyncStatus = (listener: (status: SyncStatus) => void) => {
    syncStatusListeners.push(listener);
    return () => { syncStatusListeners = syncStatusListeners.filter(l => l !== listener); };
};

export const subscribeToDataChanges = (listener: () => void) => {
    dataChangeListeners.push(listener);
    return () => { dataChangeListeners = dataChangeListeners.filter(l => l !== listener); };
};

const notifySyncStatus = (status: SyncStatus) => syncStatusListeners.forEach(l => l(status));
const notifyDataChange = () => dataChangeListeners.forEach(l => l());

// --- STUDENTS ---
export const getStudents = (): Student[] => get<Student>(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const all = getStudents(); all.push(s); save(KEYS.STUDENTS, all); };
export const updateStudent = (s: Student) => { const all = getStudents(); const idx = all.findIndex(x => x.id === s.id); if(idx >= 0) all[idx] = s; save(KEYS.STUDENTS, all); };
export const deleteStudent = (id: string) => { const all = getStudents(); save(KEYS.STUDENTS, all.filter(x => x.id !== id)); };
export const bulkAddStudents = (list: Student[]) => { const all = getStudents(); save(KEYS.STUDENTS, [...all, ...list]); };
export const bulkUpsertStudents = (list: Student[], key: keyof Student = 'nationalId') => {
    const all = getStudents();
    list.forEach(item => {
        const idx = all.findIndex(existing => existing[key] === item[key]);
        if(idx >= 0) all[idx] = { ...all[idx], ...item };
        else all.push(item);
    });
    save(KEYS.STUDENTS, all);
};
export const deleteAllStudents = () => save(KEYS.STUDENTS, []);

// --- TEACHERS ---
export const getTeachers = (): Teacher[] => get<Teacher>(KEYS.TEACHERS);
export const addTeacher = (t: Teacher) => { 
    const all = getTeachers(); 
    all.push(t); 
    save(KEYS.TEACHERS, all);
    // Also add to System Users
    const sysUsers = getSystemUsers();
    if (!sysUsers.find(u => u.nationalId === t.nationalId)) {
        addSystemUser({
            id: t.id,
            name: t.name,
            email: t.email || '',
            nationalId: t.nationalId,
            password: t.password,
            role: 'TEACHER',
            schoolId: t.schoolId,
            status: 'ACTIVE'
        });
    }
};
export const updateTeacher = (t: Teacher) => { const all = getTeachers(); const idx = all.findIndex(x => x.id === t.id); if(idx >= 0) all[idx] = t; save(KEYS.TEACHERS, all); };

// --- SCHOOLS ---
export const getSchools = (): School[] => get<School>(KEYS.SCHOOLS);
export const addSchool = (s: School) => { const all = getSchools(); all.push(s); save(KEYS.SCHOOLS, all); };
export const updateSchool = (s: School) => { const all = getSchools(); const idx = all.findIndex(x => x.id === s.id); if(idx >= 0) all[idx] = s; save(KEYS.SCHOOLS, all); };
export const deleteSchool = (id: string) => { save(KEYS.SCHOOLS, getSchools().filter(x => x.id !== id)); };

// --- SYSTEM USERS ---
export const getSystemUsers = (): SystemUser[] => get<SystemUser>(KEYS.SYSTEM_USERS);
export const addSystemUser = (u: SystemUser) => { const all = getSystemUsers(); all.push(u); save(KEYS.SYSTEM_USERS, all); };
export const updateSystemUser = (u: SystemUser) => { const all = getSystemUsers(); const idx = all.findIndex(x => x.id === u.id); if(idx >= 0) all[idx] = u; save(KEYS.SYSTEM_USERS, all); };
export const deleteSystemUser = (id: string) => { save(KEYS.SYSTEM_USERS, getSystemUsers().filter(x => x.id !== id)); };

export const authenticateUser = async (identifier: string, pass: string): Promise<SystemUser | null> => {
    // Check locally first
    const users = getSystemUsers();
    const user = users.find(u => (u.email === identifier || u.nationalId === identifier) && u.password === pass);
    if (user) return user;
    // Mock Async Check (simulate cloud)
    return null; 
};

export const authenticateStudent = async (nationalId: string, pass: string): Promise<Student | null> => {
    const students = getStudents();
    const student = students.find(s => s.nationalId === nationalId);
    if (!student) return null;
    
    // Default password logic if not set
    const validPass = student.password || (student.nationalId ? student.nationalId.slice(-4) : '1234');
    
    if (pass === validPass) return student;
    return null;
};

// --- ATTENDANCE ---
export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);
export const saveAttendance = (records: AttendanceRecord[]) => {
    const all = getAttendance();
    records.forEach(rec => {
        const idx = all.findIndex(a => a.id === rec.id);
        if(idx >= 0) all[idx] = rec;
        else all.push(rec);
    });
    save(KEYS.ATTENDANCE, all);
};
export const bulkAddAttendance = (list: AttendanceRecord[]) => {
    const all = getAttendance();
    save(KEYS.ATTENDANCE, [...all, ...list]);
};

// --- PERFORMANCE ---
export const getPerformance = (): PerformanceRecord[] => get<PerformanceRecord>(KEYS.PERFORMANCE);
export const addPerformance = (p: PerformanceRecord) => { const all = getPerformance(); all.push(p); save(KEYS.PERFORMANCE, all); };
export const deletePerformance = (id: string) => { save(KEYS.PERFORMANCE, getPerformance().filter(x => x.id !== id)); };
export const bulkAddPerformance = (list: PerformanceRecord[]) => { save(KEYS.PERFORMANCE, [...getPerformance(), ...list]); };

// --- WORKS TRACKING (ASSIGNMENTS) ---
export const getAssignments = (category: string, teacherId?: string, includeAll: boolean = false, ignoreTeacher: boolean = false): Assignment[] => {
    const all = get<Assignment>(KEYS.WORKS_ASSIGNMENTS);
    let filtered = category === 'ALL' ? all : all.filter(a => a.category === category);
    if (!includeAll && !ignoreTeacher && teacherId) {
        filtered = filtered.filter(a => a.teacherId === teacherId || !a.teacherId);
    }
    return filtered;
};
// Add/Update Assignment
export const saveAssignment = (a: Assignment) => {
    const all = get<Assignment>(KEYS.WORKS_ASSIGNMENTS);
    const idx = all.findIndex(x => x.id === a.id);
    if (idx >= 0) all[idx] = a;
    else all.push(a);
    save(KEYS.WORKS_ASSIGNMENTS, all);
};
export const deleteAssignment = (id: string) => save(KEYS.WORKS_ASSIGNMENTS, get<Assignment>(KEYS.WORKS_ASSIGNMENTS).filter(x => x.id !== id));

// --- SCHEDULES & PLANS ---
export const getSchedules = (): ScheduleItem[] => get<ScheduleItem>(KEYS.SCHEDULES);
export const saveScheduleItem = (item: ScheduleItem) => {
    const all = getSchedules();
    const idx = all.findIndex(x => x.id === item.id);
    if(idx >= 0) all[idx] = item; else all.push(item);
    save(KEYS.SCHEDULES, all);
};
export const deleteScheduleItem = (id: string) => save(KEYS.SCHEDULES, getSchedules().filter(x => x.id !== id));

export const getWeeklyPlans = (teacherId?: string): WeeklyPlanItem[] => {
    const all = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    return teacherId ? all.filter(p => p.teacherId === teacherId) : all;
};
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => {
    const all = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = all.findIndex(x => x.id === item.id);
    if(idx >= 0) all[idx] = item; else all.push(item);
    save(KEYS.WEEKLY_PLANS, all);
};

export const getLessonLinks = (): LessonLink[] => get<LessonLink>(KEYS.LESSON_LINKS);
export const saveLessonLink = (l: LessonLink) => { const all = getLessonLinks(); all.push(l); save(KEYS.LESSON_LINKS, all); };
export const deleteLessonLink = (id: string) => save(KEYS.LESSON_LINKS, getLessonLinks().filter(x => x.id !== id));

export const getLessonPlans = (teacherId: string): StoredLessonPlan[] => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.teacherId === teacherId);
export const saveLessonPlan = (p: StoredLessonPlan) => { const all = get<StoredLessonPlan>(KEYS.LESSON_PLANS); all.push(p); save(KEYS.LESSON_PLANS, all); };
export const deleteLessonPlan = (id: string) => save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(x => x.id !== id));

// --- EXAMS & QUESTIONS ---
export const getExams = (teacherId?: string): Exam[] => {
    const all = get<Exam>(KEYS.EXAMS);
    return teacherId ? all.filter(e => e.teacherId === teacherId) : all;
};
export const saveExam = (e: Exam) => { const all = get<Exam>(KEYS.EXAMS); const idx = all.findIndex(x => x.id === e.id); if(idx>=0) all[idx]=e; else all.push(e); save(KEYS.EXAMS, all); };
export const deleteExam = (id: string) => save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(x => x.id !== id));

export const getExamResults = (): ExamResult[] => get<ExamResult>(KEYS.EXAM_RESULTS);
export const saveExamResult = (r: ExamResult) => { const all = getExamResults(); all.push(r); save(KEYS.EXAM_RESULTS, all); };

export const getQuestionBank = (teacherId: string): Question[] => get<Question>(KEYS.QUESTION_BANK).filter(q => q.teacherId === teacherId);
export const saveQuestionToBank = (q: Question) => { const all = get<Question>(KEYS.QUESTION_BANK); const idx = all.findIndex(x => x.id === q.id); if(idx>=0) all[idx]=q; else all.push(q); save(KEYS.QUESTION_BANK, all); };
export const deleteQuestionFromBank = (id: string) => save(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(x => x.id !== id));

// --- SUBJECTS & CURRICULUM ---
export const getSubjects = (teacherId?: string): Subject[] => {
    const all = get<Subject>(KEYS.SUBJECTS);
    return teacherId ? all.filter(s => s.teacherId === teacherId) : all;
};
export const addSubject = (s: Subject) => { const all = get<Subject>(KEYS.SUBJECTS); all.push(s); save(KEYS.SUBJECTS, all); };
export const deleteSubject = (id: string) => save(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id));

export const getCurriculumUnits = (teacherId: string): CurriculumUnit[] => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.teacherId === teacherId);
export const saveCurriculumUnit = (u: CurriculumUnit) => { const all = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); const idx = all.findIndex(x => x.id === u.id); if(idx>=0) all[idx]=u; else all.push(u); save(KEYS.CURRICULUM_UNITS, all); };
export const deleteCurriculumUnit = (id: string) => save(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(x => x.id !== id));

export const getCurriculumLessons = (): CurriculumLesson[] => get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = (l: CurriculumLesson) => { const all = getCurriculumLessons(); const idx = all.findIndex(x => x.id === l.id); if(idx>=0) all[idx]=l; else all.push(l); save(KEYS.CURRICULUM_LESSONS, all); };
export const deleteCurriculumLesson = (id: string) => save(KEYS.CURRICULUM_LESSONS, getCurriculumLessons().filter(x => x.id !== id));

export const getMicroConcepts = (teacherId: string): MicroConcept[] => get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(c => c.teacherId === teacherId);
export const saveMicroConcept = (c: MicroConcept) => { const all = get<MicroConcept>(KEYS.MICRO_CONCEPTS); all.push(c); save(KEYS.MICRO_CONCEPTS, all); };
export const deleteMicroConcept = (id: string) => save(KEYS.MICRO_CONCEPTS, get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(x => x.id !== id));

// --- ACADEMIC TERMS ---
export const getAcademicTerms = (teacherId?: string): AcademicTerm[] => {
    // Terms might be global or per teacher. Let's assume per teacher for flexibility or global if teacherId null
    const all = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    return teacherId ? all.filter(t => t.teacherId === teacherId || !t.teacherId) : all;
};
export const saveAcademicTerm = (term: AcademicTerm) => {
    const all = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    const idx = all.findIndex(t => t.id === term.id);
    if(idx >= 0) all[idx] = term; else all.push(term);
    save(KEYS.ACADEMIC_TERMS, all);
};
export const deleteAcademicTerm = (id: string) => save(KEYS.ACADEMIC_TERMS, get<AcademicTerm>(KEYS.ACADEMIC_TERMS).filter(t => t.id !== id));
export const setCurrentTerm = (id: string, teacherId?: string) => {
    const all = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    const updated = all.map(t => ({ ...t, isCurrent: t.id === id }));
    save(KEYS.ACADEMIC_TERMS, updated);
};

// --- SETTINGS & CONFIG ---
export const getReportHeaderConfig = (teacherId?: string): ReportHeaderConfig => {
    const configs = get<ReportHeaderConfig>(KEYS.REPORT_CONFIG);
    return configs.find(c => c.teacherId === teacherId) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    const all = get<ReportHeaderConfig>(KEYS.REPORT_CONFIG);
    const idx = all.findIndex(c => c.teacherId === config.teacherId);
    if(idx >= 0) all[idx] = config; else all.push(config);
    save(KEYS.REPORT_CONFIG, all);
};

export const getAISettings = (): AISettings => {
    const saved = localStorage.getItem(KEYS.AI_SETTINGS);
    return saved ? JSON.parse(saved) : { modelId: 'gemini-2.5-flash', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' };
};
export const saveAISettings = (s: AISettings) => localStorage.setItem(KEYS.AI_SETTINGS, JSON.stringify(s));

export const getUserTheme = (): UserTheme => {
    const saved = localStorage.getItem(KEYS.USER_THEME);
    return saved ? JSON.parse(saved) : { mode: 'LIGHT', backgroundStyle: 'FLAT' };
};
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));

// --- MISC ---
export const getCustomTables = (teacherId?: string): CustomTable[] => {
    const all = get<CustomTable>(KEYS.CUSTOM_TABLES);
    return teacherId ? all.filter(t => t.teacherId === teacherId) : all;
};
export const addCustomTable = (t: CustomTable) => { const all = get<CustomTable>(KEYS.CUSTOM_TABLES); all.push(t); save(KEYS.CUSTOM_TABLES, all); };
export const updateCustomTable = (t: CustomTable) => { const all = get<CustomTable>(KEYS.CUSTOM_TABLES); const idx = all.findIndex(x => x.id === t.id); if(idx >= 0) all[idx] = t; save(KEYS.CUSTOM_TABLES, all); };
export const deleteCustomTable = (id: string) => save(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => t.id !== id));

export const getMessages = (teacherId?: string): MessageLog[] => {
    const all = get<MessageLog>(KEYS.MESSAGES);
    return teacherId ? all.filter(m => m.teacherId === teacherId) : all;
};
export const saveMessage = (m: MessageLog) => { const all = getMessages(); all.unshift(m); save(KEYS.MESSAGES, all); };

export const getFeedback = (): Feedback[] => get<Feedback>(KEYS.FEEDBACK);

export const getTrackingSheets = (teacherId?: string): TrackingSheet[] => {
    const all = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    return teacherId ? all.filter(s => s.teacherId === teacherId) : all;
};
export const saveTrackingSheet = (s: TrackingSheet) => { const all = get<TrackingSheet>(KEYS.TRACKING_SHEETS); const idx = all.findIndex(x => x.id === s.id); if(idx>=0) all[idx]=s; else all.push(s); save(KEYS.TRACKING_SHEETS, all); };
export const deleteTrackingSheet = (id: string) => save(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(x => x.id !== id));

export const getTeacherAssignments = (): TeacherAssignment[] => get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS);

// --- SYNC & CLOUD ---
export const initAutoSync = async () => {
    notifySyncStatus('SYNCING');
    try {
        const { error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
        if (error) throw error;
        notifySyncStatus('ONLINE');
    } catch (e) {
        notifySyncStatus('OFFLINE');
    }
};

export const setSystemMode = (online: boolean) => notifySyncStatus(online ? 'ONLINE' : 'OFFLINE');

export const uploadToSupabase = async () => {
    notifySyncStatus('SYNCING');
    try {
        // Example: Sync Students
        const students = getStudents();
        const { error } = await supabase.from('students').upsert(students);
        if(error) throw error;
        notifySyncStatus('ONLINE');
    } catch (e) {
        console.error(e);
        notifySyncStatus('ERROR');
        throw e;
    }
};

export const downloadFromSupabase = async () => {
    notifySyncStatus('SYNCING');
    try {
        // Example: Fetch Schools
        const { data: schools, error: err1 } = await supabase.from('schools').select('*');
        if(err1) throw err1;
        if(schools) save(KEYS.SCHOOLS, schools);
        
        // Fetch Students
        const { data: students, error: err2 } = await supabase.from('students').select('*');
        if(err2) throw err2;
        if(students) save(KEYS.STUDENTS, students);

        notifySyncStatus('ONLINE');
    } catch (e) {
        console.error(e);
        notifySyncStatus('ERROR');
        throw e;
    }
};

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('schools').select('id').limit(1);
        return { success: !error };
    } catch (e) { return { success: false }; }
};

export const fetchCloudTableData = async (table: string) => {
    const { data, error } = await supabase.from(table).select('*').limit(50);
    if(error) throw error;
    return data;
};

export const getTableDisplayName = (key: string) => {
    if(key === KEYS.STUDENTS) return 'الطلاب';
    if(key === KEYS.TEACHERS) return 'المعلمين';
    if(key === KEYS.SCHOOLS) return 'المدارس';
    if(key === KEYS.ATTENDANCE) return 'الحضور';
    if(key === KEYS.PERFORMANCE) return 'الدرجات';
    return key;
};

export const validateCloudSchema = async () => {
    // Check if required tables exist
    const requiredTables = ['schools', 'students', 'teachers', 'system_users'];
    const missing = [];
    for(const table of requiredTables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if(error && error.code === '42P01') missing.push(table);
    }
    return { valid: missing.length === 0, missingTables: missing };
};

export const getDatabaseSchemaSQL = () => {
    return `
    -- Enable UUID extension
    create extension if not exists "uuid-ossp";

    -- Schools Table
    create table if not exists schools (
        id text primary key,
        name text not null,
        ministry_code text,
        manager_name text,
        manager_national_id text,
        type text,
        phone text,
        student_count int,
        education_administration text
    );

    -- Students Table
    create table if not exists students (
        id text primary key,
        name text not null,
        national_id text,
        class_id text,
        grade_level text,
        class_name text,
        school_id text references schools(id),
        email text,
        phone text,
        parent_name text,
        parent_phone text,
        parent_email text,
        password text,
        created_by_id text
    );

    -- Teachers Table
    create table if not exists teachers (
        id text primary key,
        name text not null,
        national_id text,
        email text,
        phone text,
        subject_specialty text,
        school_id text references schools(id),
        manager_id text,
        subscription_status text,
        subscription_end_date text,
        password text
    );

    -- Attendance Table
    create table if not exists attendance (
        id text primary key,
        student_id text references students(id),
        date text not null,
        status text not null,
        subject text,
        period int,
        behavior_status text,
        behavior_note text,
        excuse_note text,
        created_by_id text
    );

    -- Performance Table
    create table if not exists performance (
        id text primary key,
        student_id text references students(id),
        subject text,
        title text,
        category text,
        score float,
        max_score float,
        date text,
        notes text,
        created_by_id text
    );
    `;
};

export const getDatabaseUpdateSQL = () => {
    return `-- Update SQL for missing columns or tables
    alter table students add column if not exists password text;
    `;
};

export const clearCloudTable = async (table: string) => {
    const { error } = await supabase.from(table).delete().neq('id', '0'); // Delete all
    if(error) throw error;
};

export const resetCloudDatabase = async () => {
    // Dangerous operation - implementation depends on needs, maybe just clear tables
    await clearCloudTable('performance');
    await clearCloudTable('attendance');
    await clearCloudTable('students');
};

export const backupCloudDatabase = async () => {
    // Fetch all data
    const { data: schools } = await supabase.from('schools').select('*');
    const { data: students } = await supabase.from('students').select('*');
    return JSON.stringify({ schools, students }, null, 2);
};

export const restoreCloudDatabase = async (json: string) => {
    const data = JSON.parse(json);
    if(data.schools) await supabase.from('schools').upsert(data.schools);
    if(data.students) await supabase.from('students').upsert(data.students);
};

// --- MISC UTILS ---
export const createBackup = () => JSON.stringify(localStorage);
export const restoreBackup = (json: string) => {
    const data = JSON.parse(json);
    Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
    notifyDataChange();
};
export const clearDatabase = () => { localStorage.clear(); notifyDataChange(); };
export const getStorageStatistics = () => ({ used: JSON.stringify(localStorage).length, items: localStorage.length });
export const getWorksMasterUrl = () => ""; // Placeholder

