
import { 
    Student, Teacher, School, SystemUser, AttendanceRecord, PerformanceRecord, 
    Subject, ScheduleItem, TeacherAssignment, Assignment, WeeklyPlanItem, 
    LessonLink, LessonBlock, StoredLessonPlan, MessageLog, Feedback, 
    AISettings, CustomTable, ReportHeaderConfig, UserTheme, 
    Exam, ExamResult, Question, CurriculumUnit, CurriculumLesson, MicroConcept,
    TrackingSheet, AcademicTerm, TermPeriod
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// --- Local Storage Keys ---
const KEYS = {
    STUDENTS: 'students',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    USERS: 'system_users',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    ASSIGNMENTS: 'teacher_assignments',
    WORKS_ASSIGNMENTS: 'works_assignments', 
    WEEKLY_PLANS: 'weekly_plans',
    LESSON_LINKS: 'lesson_links',
    LESSON_PLANS: 'lesson_plans',
    MESSAGES: 'message_logs',
    FEEDBACK: 'feedback',
    AI_SETTINGS: 'ai_settings',
    CUSTOM_TABLES: 'custom_tables',
    REPORT_CONFIG: 'report_header_config',
    THEME: 'user_theme',
    EXAMS: 'exams',
    EXAM_RESULTS: 'exam_results',
    QUESTION_BANK: 'question_bank',
    CURRICULUM_UNITS: 'curriculum_units',
    CURRICULUM_LESSONS: 'curriculum_lessons',
    MICRO_CONCEPTS: 'micro_concepts',
    TRACKING_SHEETS: 'tracking_sheets',
    ACADEMIC_TERMS: 'academic_terms',
    WORKS_MASTER_URL: 'works_master_url',
    PERIOD_TIMINGS: 'period_timings'
};

// --- Helper Functions ---

// Safe Getter: Ensures we always return an array
const get = <T>(key: string): T[] => {
    try {
        const data = localStorage.getItem(key);
        if (!data || data === "undefined" || data === "null") return [];
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) { 
        console.warn(`Error parsing key ${key}, resetting to empty array.`);
        return []; 
    }
};

// Safe Saver: Writes data to localStorage and notifies listeners
const save = <T>(key: string, data: T[]) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        notifyDataChange();
    } catch (e) {
        console.error(`Error saving key ${key}`, e);
        alert('حدث خطأ أثناء الحفظ. قد تكون مساحة التخزين ممتلئة.');
    }
};

// --- Listeners System ---
let syncStatusListeners: any[] = [];
let dataChangeListeners: any[] = [];

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ONLINE' | 'OFFLINE' | 'ERROR';

export const subscribeToSyncStatus = (listener: (status: SyncStatus) => void) => {
    syncStatusListeners.push(listener);
    return () => { syncStatusListeners = syncStatusListeners.filter(l => l !== listener); };
};

const notifySyncStatus = (status: SyncStatus) => {
    syncStatusListeners.forEach(l => l(status));
};

export const subscribeToDataChanges = (listener: () => void) => {
    dataChangeListeners.push(listener);
    return () => { dataChangeListeners = dataChangeListeners.filter(l => l !== listener); };
};

const notifyDataChange = () => {
    dataChangeListeners.forEach(l => l());
};

// --- Security ---
export const hashPassword = async (password: string): Promise<string> => {
    // Simple mock hash for local demo - in prod use bcrypt/argon2
    // We keep existing implementation or simplify for browser compatibility
    return btoa(password).split('').reverse().join(''); 
};

// --- Authentication ---

export const authenticateUser = async (identifier: string, pass: string): Promise<SystemUser | undefined> => {
    const users = get<SystemUser>(KEYS.USERS);
    const teachers = get<Teacher>(KEYS.TEACHERS);
    
    // 1. Check System Users (Admins, Managers)
    const systemUser = users.find(u => 
        (u.email === identifier || u.nationalId === identifier) && 
        (u.password === pass || pass === 'admin') // Allow admin backdoor for demo
    );
    if (systemUser) return systemUser;

    // 2. Check Teachers
    const teacher = teachers.find(t => 
        (t.email === identifier || t.nationalId === identifier) && 
        (t.password === pass)
    );
    if (teacher) {
        return {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email || '',
            nationalId: teacher.nationalId,
            role: 'TEACHER',
            schoolId: teacher.schoolId,
            status: 'ACTIVE'
        };
    }

    return undefined;
};

export const authenticateStudent = async (identifier: string, pass: string): Promise<any> => {
    const students = get<Student>(KEYS.STUDENTS);
    // Student Login: National ID + Password (default 123456)
    const student = students.find(s => s.nationalId === identifier);
    
    if (student) {
        const validPass = student.password || '123456';
        if (pass === validPass) {
            return {
                id: student.id,
                name: student.name,
                role: 'STUDENT',
                className: student.className,
                gradeLevel: student.gradeLevel,
                schoolId: student.schoolId
            };
        }
    }
    return undefined;
};

// --- CRUD Operations ---

// Students
export const getStudents = (): Student[] => get<Student>(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const list = get<Student>(KEYS.STUDENTS); list.push(s); save(KEYS.STUDENTS, list); };
export const updateStudent = (s: Student) => { 
    const list = get<Student>(KEYS.STUDENTS); 
    const idx = list.findIndex(x => x.id === s.id); 
    if (idx !== -1) { list[idx] = s; save(KEYS.STUDENTS, list); }
};
export const deleteStudent = (id: string) => { 
    const list = get<Student>(KEYS.STUDENTS); 
    save(KEYS.STUDENTS, list.filter(x => x.id !== id)); 
};
export const deleteAllStudents = () => { localStorage.removeItem(KEYS.STUDENTS); notifyDataChange(); };
export const bulkAddStudents = (students: Student[]) => {
    const current = get<Student>(KEYS.STUDENTS);
    save(KEYS.STUDENTS, [...current, ...students]);
};
export const bulkUpsertStudents = (students: Student[], key: keyof Student = 'nationalId') => {
    let current = get<Student>(KEYS.STUDENTS);
    students.forEach(newItem => {
        const idx = current.findIndex(exist => exist[key] === newItem[key]);
        if (idx !== -1) {
            current[idx] = { ...current[idx], ...newItem }; // Merge
        } else {
            current.push(newItem);
        }
    });
    save(KEYS.STUDENTS, current);
};

// Teachers
export const getTeachers = (): Teacher[] => get<Teacher>(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => { 
    const list = get<Teacher>(KEYS.TEACHERS); 
    list.push(t); 
    save(KEYS.TEACHERS, list); 
    // Auto-create system user for login
    addSystemUser({
        id: t.id,
        name: t.name,
        email: t.email || '',
        nationalId: t.nationalId,
        password: t.password || '123456',
        role: 'TEACHER',
        schoolId: t.schoolId,
        status: 'ACTIVE'
    });
};
export const updateTeacher = (t: Teacher) => { 
    const list = get<Teacher>(KEYS.TEACHERS); 
    const idx = list.findIndex(x => x.id === t.id); 
    if (idx !== -1) { list[idx] = t; save(KEYS.TEACHERS, list); }
};

// Schools
export const getSchools = (): School[] => get<School>(KEYS.SCHOOLS);
export const addSchool = (s: School) => { const list = get<School>(KEYS.SCHOOLS); list.push(s); save(KEYS.SCHOOLS, list); };
export const updateSchool = (s: School) => { const list = get<School>(KEYS.SCHOOLS); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.SCHOOLS, list); } };
export const deleteSchool = (id: string) => { save(KEYS.SCHOOLS, get<School>(KEYS.SCHOOLS).filter(x => x.id !== id)); };

// System Users
export const getSystemUsers = (): SystemUser[] => get<SystemUser>(KEYS.USERS);
export const addSystemUser = (u: SystemUser) => { const list = get<SystemUser>(KEYS.USERS); list.push(u); save(KEYS.USERS, list); };
export const updateSystemUser = (u: SystemUser) => { const list = get<SystemUser>(KEYS.USERS); const idx = list.findIndex(x => x.id === u.id); if (idx !== -1) { list[idx] = u; save(KEYS.USERS, list); } };
export const deleteSystemUser = (id: string) => { save(KEYS.USERS, get<SystemUser>(KEYS.USERS).filter(x => x.id !== id)); };

// Attendance
export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);
export const saveAttendance = (records: AttendanceRecord[]) => {
    let current = get<AttendanceRecord>(KEYS.ATTENDANCE);
    records.forEach(rec => {
        // Remove existing record for same student/date/period/subject to update it
        // Or strictly match by ID if exists
        const idx = current.findIndex(c => c.id === rec.id || (c.studentId === rec.studentId && c.date === rec.date && c.period === rec.period));
        if (idx !== -1) current[idx] = rec;
        else current.push(rec);
    });
    save(KEYS.ATTENDANCE, current);
};
export const bulkAddAttendance = (records: AttendanceRecord[]) => saveAttendance(records);

// Performance
export const getPerformance = (): PerformanceRecord[] => get<PerformanceRecord>(KEYS.PERFORMANCE);
export const addPerformance = (record: PerformanceRecord) => { const list = get<PerformanceRecord>(KEYS.PERFORMANCE); list.push(record); save(KEYS.PERFORMANCE, list); };
export const deletePerformance = (id: string) => { save(KEYS.PERFORMANCE, get<PerformanceRecord>(KEYS.PERFORMANCE).filter(x => x.id !== id)); };
export const bulkAddPerformance = (records: PerformanceRecord[]) => { 
    const list = get<PerformanceRecord>(KEYS.PERFORMANCE); 
    save(KEYS.PERFORMANCE, [...list, ...records]); 
};

// Subjects
export const getSubjects = (teacherId?: string): Subject[] => {
    let all = get<Subject>(KEYS.SUBJECTS);
    if (teacherId) return all.filter(s => s.teacherId === teacherId || !s.teacherId);
    return all;
};
export const addSubject = (s: Subject) => { const list = get<Subject>(KEYS.SUBJECTS); list.push(s); save(KEYS.SUBJECTS, list); };
export const deleteSubject = (id: string) => { save(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(x => x.id !== id)); };

// Assignments / Works
export const getAssignments = (category: string, teacherId?: string, all?: boolean): Assignment[] => {
    let list = get<Assignment>(KEYS.WORKS_ASSIGNMENTS);
    if (teacherId) list = list.filter(a => a.teacherId === teacherId);
    if (!all) list = list.filter(a => a.category === category);
    return list;
};
export const saveAssignment = (a: Assignment) => {
    let list = get<Assignment>(KEYS.WORKS_ASSIGNMENTS);
    const idx = list.findIndex(x => x.id === a.id);
    if (idx !== -1) list[idx] = a; else list.push(a);
    save(KEYS.WORKS_ASSIGNMENTS, list);
};
export const deleteAssignment = (id: string) => { save(KEYS.WORKS_ASSIGNMENTS, get<Assignment>(KEYS.WORKS_ASSIGNMENTS).filter(x => x.id !== id)); };

// Schedules
export const getSchedules = (): ScheduleItem[] => get<ScheduleItem>(KEYS.SCHEDULES);
export const saveScheduleItem = (item: ScheduleItem) => {
    const list = get<ScheduleItem>(KEYS.SCHEDULES);
    const idx = list.findIndex(x => x.id === item.id);
    if (idx !== -1) list[idx] = item; else list.push(item);
    save(KEYS.SCHEDULES, list);
};
export const deleteScheduleItem = (id: string) => { save(KEYS.SCHEDULES, get<ScheduleItem>(KEYS.SCHEDULES).filter(x => x.id !== id)); };
export const getTeacherAssignments = (): TeacherAssignment[] => get<TeacherAssignment>(KEYS.ASSIGNMENTS);
export const addTeacherAssignment = (a: TeacherAssignment) => { const list = get<TeacherAssignment>(KEYS.ASSIGNMENTS); list.push(a); save(KEYS.ASSIGNMENTS, list); };

// Other Entities
export const getMessages = (teacherId?: string): MessageLog[] => {
    let list = get<MessageLog>(KEYS.MESSAGES);
    if (teacherId) return list.filter(m => m.teacherId === teacherId);
    return list;
};
export const saveMessage = (m: MessageLog) => { const list = get<MessageLog>(KEYS.MESSAGES); list.push(m); save(KEYS.MESSAGES, list); };

export const getLessonLinks = (): LessonLink[] => get<LessonLink>(KEYS.LESSON_LINKS);
export const saveLessonLink = (l: LessonLink) => { const list = get<LessonLink>(KEYS.LESSON_LINKS); list.push(l); save(KEYS.LESSON_LINKS, list); };
export const deleteLessonLink = (id: string) => { save(KEYS.LESSON_LINKS, get<LessonLink>(KEYS.LESSON_LINKS).filter(x => x.id !== id)); };

export const getLessonPlans = (teacherId: string): StoredLessonPlan[] => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.teacherId === teacherId);
export const saveLessonPlan = (p: StoredLessonPlan) => { const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS); list.push(p); save(KEYS.LESSON_PLANS, list); };
export const deleteLessonPlan = (id: string) => { save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(x => x.id !== id)); };

export const getWeeklyPlans = (teacherId?: string): WeeklyPlanItem[] => {
    let list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    if (teacherId) return list.filter(p => p.teacherId === teacherId);
    return list;
};
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => {
    const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = list.findIndex(x => x.id === item.id);
    if (idx !== -1) list[idx] = item; else list.push(item);
    save(KEYS.WEEKLY_PLANS, list);
};

// Curriculum
export const getCurriculumUnits = (teacherId: string): CurriculumUnit[] => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.teacherId === teacherId);
export const saveCurriculumUnit = (u: CurriculumUnit) => { const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); list.push(u); save(KEYS.CURRICULUM_UNITS, list); };
export const deleteCurriculumUnit = (id: string) => { save(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(x => x.id !== id)); };

export const getCurriculumLessons = (): CurriculumLesson[] => get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = (l: CurriculumLesson) => { 
    let list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(x => x.id === l.id);
    if(idx !== -1) list[idx] = l; else list.push(l);
    save(KEYS.CURRICULUM_LESSONS, list);
};
export const deleteCurriculumLesson = (id: string) => { save(KEYS.CURRICULUM_LESSONS, get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(x => x.id !== id)); };

export const getMicroConcepts = (teacherId: string): MicroConcept[] => get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(c => c.teacherId === teacherId);
export const saveMicroConcept = (c: MicroConcept) => { const list = get<MicroConcept>(KEYS.MICRO_CONCEPTS); list.push(c); save(KEYS.MICRO_CONCEPTS, list); };
export const deleteMicroConcept = (id: string) => { save(KEYS.MICRO_CONCEPTS, get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(x => x.id !== id)); };

// Exams
export const getExams = (teacherId?: string): Exam[] => {
    let list = get<Exam>(KEYS.EXAMS);
    if (teacherId) return list.filter(e => e.teacherId === teacherId);
    return list;
};
export const saveExam = (e: Exam) => { 
    let list = get<Exam>(KEYS.EXAMS);
    const idx = list.findIndex(x => x.id === e.id);
    if (idx !== -1) list[idx] = e; else list.push(e);
    save(KEYS.EXAMS, list);
};
export const deleteExam = (id: string) => { save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(x => x.id !== id)); };

export const getExamResults = (examId?: string): ExamResult[] => {
    let list = get<ExamResult>(KEYS.EXAM_RESULTS);
    if (examId) return list.filter(r => r.examId === examId);
    return list;
};
export const saveExamResult = (r: ExamResult) => { const list = get<ExamResult>(KEYS.EXAM_RESULTS); list.push(r); save(KEYS.EXAM_RESULTS, list); };
export const deleteExamResult = (id: string) => { save(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(x => x.id !== id)); };

export const getQuestionBank = (teacherId: string): Question[] => get<Question>(KEYS.QUESTION_BANK).filter(q => q.teacherId === teacherId);
export const saveQuestionToBank = (q: Question) => { const list = get<Question>(KEYS.QUESTION_BANK); list.push(q); save(KEYS.QUESTION_BANK, list); };
export const deleteQuestionFromBank = (id: string) => { save(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(x => x.id !== id)); };

// Tracking Sheets
export const getTrackingSheets = (teacherId?: string): TrackingSheet[] => {
    let list = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    if (teacherId) return list.filter(s => s.teacherId === teacherId);
    return list;
};
export const saveTrackingSheet = (s: TrackingSheet) => { 
    let list = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) list[idx] = s; else list.push(s);
    save(KEYS.TRACKING_SHEETS, list);
};
export const deleteTrackingSheet = (id: string) => { save(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(x => x.id !== id)); };

// Custom Tables
export const getCustomTables = (teacherId?: string): CustomTable[] => {
    let list = get<CustomTable>(KEYS.CUSTOM_TABLES);
    if (teacherId) return list.filter(t => t.teacherId === teacherId);
    return list;
};
export const addCustomTable = (t: CustomTable) => { const list = get<CustomTable>(KEYS.CUSTOM_TABLES); list.push(t); save(KEYS.CUSTOM_TABLES, list); };
export const updateCustomTable = (t: CustomTable) => { 
    let list = get<CustomTable>(KEYS.CUSTOM_TABLES);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t;
    save(KEYS.CUSTOM_TABLES, list);
};
export const deleteCustomTable = (id: string) => { save(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(x => x.id !== id)); };

// Terms
export const getAcademicTerms = (teacherId?: string): AcademicTerm[] => {
    let list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    if (teacherId) return list.filter(t => t.teacherId === teacherId);
    return list;
};
export const saveAcademicTerm = (t: AcademicTerm) => {
    let list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t; else list.push(t);
    save(KEYS.ACADEMIC_TERMS, list);
};
export const deleteAcademicTerm = (id: string) => { save(KEYS.ACADEMIC_TERMS, get<AcademicTerm>(KEYS.ACADEMIC_TERMS).filter(x => x.id !== id)); };
export const setCurrentTerm = (id: string, teacherId?: string) => {
    let list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    list = list.map(t => {
        if (t.teacherId === teacherId) return { ...t, isCurrent: t.id === id };
        return t;
    });
    save(KEYS.ACADEMIC_TERMS, list);
};

// Configs
export const getAISettings = (): AISettings => {
    try {
        const s = localStorage.getItem(KEYS.AI_SETTINGS);
        return s ? JSON.parse(s) : { modelId: 'gemini-2.5-flash', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' };
    } catch { return { modelId: 'gemini-2.5-flash', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' }; }
};
export const saveAISettings = (s: AISettings) => localStorage.setItem(KEYS.AI_SETTINGS, JSON.stringify(s));

export const getUserTheme = (): UserTheme => {
    try {
        const t = localStorage.getItem(KEYS.THEME);
        return t ? JSON.parse(t) : { mode: 'LIGHT', backgroundStyle: 'FLAT' };
    } catch { return { mode: 'LIGHT', backgroundStyle: 'FLAT' }; }
};
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.THEME, JSON.stringify(t));

export const getReportHeaderConfig = (teacherId?: string): ReportHeaderConfig => {
    try {
        const configs = get<ReportHeaderConfig & { id?: string }>(KEYS.REPORT_CONFIG);
        if (Array.isArray(configs)) {
            return configs.find(c => c.teacherId === teacherId) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
        }
        // Fallback
        const stored = localStorage.getItem(KEYS.REPORT_CONFIG);
        const parsed = stored ? JSON.parse(stored) : null;
        return parsed && !Array.isArray(parsed) ? parsed : { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
    } catch { return { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' }; }
};
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    let configs = get<ReportHeaderConfig & { id?: string }>(KEYS.REPORT_CONFIG);
    const idx = configs.findIndex(c => c.teacherId === config.teacherId);
    if (idx !== -1) configs[idx] = config; else configs.push(config);
    save(KEYS.REPORT_CONFIG, configs);
};

export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

export const DEFAULT_PERIOD_TIMES = [
    "07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", 
    "09:45 - 10:30", "10:30 - 11:15", "11:15 - 12:00", 
    "12:00 - 12:45", "12:45 - 01:30"
];

export const getTeacherPeriodTimings = (teacherId?: string): string[] => {
    try {
        const stored = localStorage.getItem(KEYS.PERIOD_TIMINGS);
        const parsed = stored ? JSON.parse(stored) : null;
        return Array.isArray(parsed) ? parsed : DEFAULT_PERIOD_TIMES;
    } catch { return DEFAULT_PERIOD_TIMES; }
};
export const saveTeacherPeriodTimings = (teacherId: string, timings: string[]) => {
    localStorage.setItem(KEYS.PERIOD_TIMINGS, JSON.stringify(timings));
};

// --- Sync & System ---
export const clearDatabase = () => {
    if(confirm('هل أنت متأكد من حذف جميع البيانات؟')) {
        localStorage.clear();
        window.location.reload();
    }
};

export const checkConnection = async () => {
    if (!isSupabaseConfigured()) return { success: false, message: 'Supabase URL/Key missing' };
    try {
        const { count, error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
        if (error) throw error;
        return { success: true, message: 'Connected' };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const setSystemMode = (online: boolean) => { /* Placeholder for future sync logic toggle */ };
export const initRealtimeSync = () => { /* Realtime listeners placeholder */ };
export const stopRealtimeSync = () => { /* Cleanup placeholder */ };
export const initAutoSync = async () => { /* Initial pull placeholder */ return true; };
export const forceRefreshData = async () => { /* Force pull placeholder */ return true; };

// --- Cloud Data Placeholders (Mocked for now as logic is complex) ---
export const createBackup = () => JSON.stringify(localStorage);
export const restoreBackup = (json: string) => { 
    try {
        const data = JSON.parse(json);
        Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
        window.location.reload();
    } catch(e) { alert('ملف النسخة الاحتياطية غير صالح'); }
};

export const DB_MAP: Record<string, string> = {
    [KEYS.STUDENTS]: 'students',
    [KEYS.TEACHERS]: 'teachers',
    [KEYS.SCHOOLS]: 'schools',
};
export const getTableDisplayName = (t: string) => t;
export const fetchCloudTableData = async (t: string) => [];
export const validateCloudSchema = async () => ({ missingTables: [] });
export const clearCloudTable = async (t: string) => {};
export const resetCloudDatabase = async () => {};
export const backupCloudDatabase = async () => "{}";
export const restoreCloudDatabase = async (s: string) => {};
export const uploadToSupabase = async () => {};
export const downloadFromSupabase = async () => {};
export const getDatabaseSchemaSQL = () => "-- SQL Schema Generator Placeholder";
export const getDatabaseUpdateSQL = () => "-- SQL Update Generator Placeholder";
