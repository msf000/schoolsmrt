
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

// Map Local Storage Keys to Supabase Table Names
export const DB_MAP: Record<string, string> = {
    [KEYS.STUDENTS]: 'students',
    [KEYS.TEACHERS]: 'teachers',
    [KEYS.SCHOOLS]: 'schools',
    [KEYS.USERS]: 'system_users',
    [KEYS.ATTENDANCE]: 'attendance',
    [KEYS.PERFORMANCE]: 'performance',
    [KEYS.SUBJECTS]: 'subjects',
    [KEYS.SCHEDULES]: 'schedules',
    [KEYS.ASSIGNMENTS]: 'teacher_assignments',
    [KEYS.WORKS_ASSIGNMENTS]: 'works_assignments',
    [KEYS.WEEKLY_PLANS]: 'weekly_plans',
    [KEYS.LESSON_LINKS]: 'lesson_links',
    [KEYS.LESSON_PLANS]: 'lesson_plans',
    [KEYS.MESSAGES]: 'message_logs',
    [KEYS.EXAMS]: 'exams',
    [KEYS.EXAM_RESULTS]: 'exam_results',
    [KEYS.QUESTION_BANK]: 'question_bank',
    [KEYS.CURRICULUM_UNITS]: 'curriculum_units',
    [KEYS.CURRICULUM_LESSONS]: 'curriculum_lessons',
    [KEYS.MICRO_CONCEPTS]: 'micro_concepts',
    [KEYS.TRACKING_SHEETS]: 'tracking_sheets',
    [KEYS.ACADEMIC_TERMS]: 'academic_terms',
    [KEYS.CUSTOM_TABLES]: 'custom_tables'
};

export const getTableDisplayName = (t: string) => t.replace(/_/g, ' ').toUpperCase();

export const fetchCloudTableData = async (table: string) => {
    if (!isSupabaseConfigured()) throw new Error('Not configured');
    const { data, error } = await supabase.from(table).select('*').limit(50);
    if (error) throw error;
    return data;
};

export const validateCloudSchema = async () => {
    if (!isSupabaseConfigured()) return { missingTables: [] };
    const missing: string[] = [];
    const tables = Object.values(DB_MAP);
    
    for (const table of tables) {
        const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
        if (error && error.code === '42P01') { // Undefined Table code in Postgres
            missing.push(table);
        }
    }
    return { missingTables: missing };
};

export const clearCloudTable = async (table: string) => {
    if (!isSupabaseConfigured()) throw new Error('Not configured');
    const { error } = await supabase.from(table).delete().neq('id', '00000'); // Delete all (safe hack)
    if (error) throw error;
};

export const resetCloudDatabase = async () => {
    const tables = Object.values(DB_MAP);
    for (const table of tables) {
        await clearCloudTable(table);
    }
};

export const uploadToSupabase = async () => {
    if (!isSupabaseConfigured()) throw new Error('Not configured');
    notifySyncStatus('SYNCING');
    
    try {
        for (const [localKey, tableName] of Object.entries(DB_MAP)) {
            const localData = get<any>(localKey);
            if (localData.length > 0) {
                // Upsert in batches of 100 to prevent payload issues
                for (let i = 0; i < localData.length; i += 100) {
                    const chunk = localData.slice(i, i + 100);
                    // Ensure ID is present, if generic ID logic is needed
                    const { error } = await supabase.from(tableName).upsert(chunk);
                    if (error) console.error(`Error uploading ${tableName}:`, error);
                }
            }
        }
        notifySyncStatus('ONLINE');
    } catch (e) {
        console.error("Upload failed", e);
        notifySyncStatus('ERROR');
        throw e;
    }
};

export const downloadFromSupabase = async () => {
    if (!isSupabaseConfigured()) throw new Error('Not configured');
    notifySyncStatus('SYNCING');

    try {
        for (const [localKey, tableName] of Object.entries(DB_MAP)) {
            const { data, error } = await supabase.from(tableName).select('*');
            if (error) {
                console.error(`Error downloading ${tableName}:`, error);
                continue;
            }
            if (data) {
                localStorage.setItem(localKey, JSON.stringify(data));
            }
        }
        notifySyncStatus('ONLINE');
        notifyDataChange(); // Refresh UI
    } catch (e) {
        console.error("Download failed", e);
        notifySyncStatus('ERROR');
        throw e;
    }
};

// --- Backup Logic ---
export const createBackup = () => JSON.stringify(localStorage);
export const restoreBackup = (json: string) => { 
    try {
        const data = JSON.parse(json);
        Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
        window.location.reload();
    } catch(e) { alert('ملف النسخة الاحتياطية غير صالح'); }
};

export const backupCloudDatabase = async () => {
    if (!isSupabaseConfigured()) throw new Error('Not configured');
    const fullBackup: any = {};
    for (const table of Object.values(DB_MAP)) {
        const { data } = await supabase.from(table).select('*');
        fullBackup[table] = data || [];
    }
    return JSON.stringify(fullBackup, null, 2);
};

export const restoreCloudDatabase = async (jsonString: string) => {
    if (!isSupabaseConfigured()) throw new Error('Not configured');
    try {
        const data = JSON.parse(jsonString);
        for (const [table, rows] of Object.entries(data)) {
            if (Array.isArray(rows) && rows.length > 0) {
                await clearCloudTable(table);
                // Batch insert
                for (let i = 0; i < rows.length; i += 100) {
                    await supabase.from(table).insert(rows.slice(i, i + 100));
                }
            }
        }
    } catch (e) {
        throw new Error('Invalid Backup File');
    }
};

// --- SQL Generator ---
export const getDatabaseSchemaSQL = () => {
    const schemas: Record<string, string> = {
        'schools': `id text PRIMARY KEY, name text, ministry_code text, manager_name text, manager_national_id text, education_administration text, type text, phone text, student_count numeric, works_master_url text`,
        'system_users': `id text PRIMARY KEY, name text, email text, national_id text, password text, role text, school_id text, status text, phone text, is_demo boolean`,
        'students': `id text PRIMARY KEY, name text, national_id text, class_id text, school_id text, created_by_id text, grade_level text, class_name text, email text, phone text, parent_id text, parent_name text, parent_phone text, parent_email text, password text, seat_index numeric`,
        'teachers': `id text PRIMARY KEY, name text, national_id text, email text, phone text, password text, subject_specialty text, school_id text, manager_id text, subscription_status text, subscription_end_date text`,
        'attendance': `id text PRIMARY KEY, student_id text, date text, status text, subject text, period numeric, behavior_status text, behavior_note text, excuse_note text, excuse_file text, created_by_id text`,
        'performance': `id text PRIMARY KEY, student_id text, subject text, title text, category text, score numeric, max_score numeric, date text, notes text, created_by_id text`,
        'subjects': `id text PRIMARY KEY, name text, teacher_id text`,
        'schedules': `id text PRIMARY KEY, class_id text, day text, period numeric, subject_name text, teacher_id text`,
        'teacher_assignments': `id text PRIMARY KEY, class_id text, subject_name text, teacher_id text`,
        'works_assignments': `id text PRIMARY KEY, title text, category text, max_score numeric, is_visible boolean, order_index numeric, source_metadata text, teacher_id text, term_id text, period_id text, class_id text`,
        'weekly_plans': `id text PRIMARY KEY, teacher_id text, class_id text, subject_name text, day text, period numeric, week_start_date text, lesson_topic text, homework text`,
        'lesson_links': `id text PRIMARY KEY, title text, url text, teacher_id text, created_at text, grade_level text, class_name text`,
        'lesson_plans': `id text PRIMARY KEY, teacher_id text, lesson_id text, subject text, topic text, content_json text, resources jsonb, created_at text`,
        'message_logs': `id text PRIMARY KEY, student_id text, student_name text, parent_phone text, type text, content text, status text, date text, sent_by text, teacher_id text`,
        'exams': `id text PRIMARY KEY, title text, subject text, grade_level text, duration_minutes numeric, questions jsonb, is_active boolean, created_at text, teacher_id text, date text`,
        'exam_results': `id text PRIMARY KEY, exam_id text, student_id text, student_name text, score numeric, total_score numeric, date text, answers jsonb`,
        'question_bank': `id text PRIMARY KEY, text text, type text, options jsonb, correct_answer text, points numeric, subject text, grade_level text, topic text, difficulty text, teacher_id text`,
        'curriculum_units': `id text PRIMARY KEY, teacher_id text, subject text, grade_level text, title text, order_index numeric`,
        'curriculum_lessons': `id text PRIMARY KEY, unit_id text, title text, order_index numeric, learning_standards jsonb, micro_concept_ids jsonb`,
        'micro_concepts': `id text PRIMARY KEY, teacher_id text, subject text, name text`,
        'tracking_sheets': `id text PRIMARY KEY, title text, subject text, class_name text, teacher_id text, created_at text, columns jsonb, scores jsonb`,
        'custom_tables': `id text PRIMARY KEY, name text, created_at text, columns jsonb, rows jsonb, source_url text, last_updated text, teacher_id text`,
        'academic_terms': `id text PRIMARY KEY, name text, start_date text, end_date text, is_current boolean, teacher_id text, periods jsonb`
    };

    return Object.entries(schemas).map(([table, cols]) => 
        `CREATE TABLE IF NOT EXISTS ${table} (${cols});`
    ).join('\n');
};

export const getDatabaseUpdateSQL = () => {
    return `-- Run this to update existing tables if you added new features recently
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS password text;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subscription_status text;
ALTER TABLE performance ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS works_master_url text;
`;
};

// --- Sync Functions ---
export const setSystemMode = (online: boolean) => {}; 

let realtimeSubscription: any = null;

export const initRealtimeSync = () => {
    if (!isSupabaseConfigured()) return;
    if (realtimeSubscription) return;
    console.log('Realtime sync initialized (Polling mode not active to save quota)');
};

export const stopRealtimeSync = () => {
    if (realtimeSubscription) {
        realtimeSubscription = null;
    }
};

export const initAutoSync = async () => {
    if (!isSupabaseConfigured()) return false;
    try {
        await downloadFromSupabase();
        return true;
    } catch (e) {
        return false;
    }
};

export const forceRefreshData = async () => {
    if (!isSupabaseConfigured()) return false;
    try {
        await downloadFromSupabase();
        return true;
    } catch (e) {
        return false;
    }
};
