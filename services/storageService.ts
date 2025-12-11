import { 
    Student, Teacher, School, SystemUser, AttendanceRecord, PerformanceRecord, 
    Subject, ScheduleItem, TeacherAssignment, Assignment, WeeklyPlanItem, 
    LessonLink, LessonBlock, StoredLessonPlan, MessageLog, Feedback, 
    AISettings, CustomTable, ReportHeaderConfig, UserTheme, 
    Exam, ExamResult, Question, CurriculumUnit, CurriculumLesson, MicroConcept,
    TrackingSheet, AcademicTerm, TermPeriod
} from '../types';
import { supabase } from './supabaseClient';

// --- KEYS & CACHE ---
const KEYS = {
    STUDENTS: 'students',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    USERS: 'system_users',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    ASSIGNMENTS: 'assignments', 
    TEACHER_ASSIGNMENTS: 'teacher_assignments',
    ASSIGNMENT_DEFS: 'assignment_definitions',
    WEEKLY_PLANS: 'weekly_plans',
    MESSAGES: 'messages',
    LESSON_LINKS: 'lesson_links',
    LESSON_PLANS: 'lesson_plans',
    EXAMS: 'exams',
    EXAM_RESULTS: 'exam_results',
    QUESTION_BANK: 'question_bank',
    CURRICULUM_UNITS: 'curriculum_units',
    CURRICULUM_LESSONS: 'curriculum_lessons',
    MICRO_CONCEPTS: 'micro_concepts',
    TRACKING_SHEETS: 'tracking_sheets',
    ACADEMIC_TERMS: 'academic_terms',
    CUSTOM_TABLES: 'custom_tables',
    AI_SETTINGS: 'ai_settings',
    REPORT_CONFIG: 'report_config',
    USER_THEME: 'user_theme',
    WORKS_MASTER_URL: 'works_master_url',
    FEEDBACK: 'feedback'
};

// ... Helper functions for local storage ...
const get = <T>(key: string): T[] => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
};

const save = <T>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
    notifyListeners();
};

const updateCache = <T>(key: string, data: T[]) => {
    save(key, data);
};

// ... Event Emitters ...
type Listener = () => void;
const listeners: Listener[] = [];
const notifyListeners = () => listeners.forEach(l => l());
export const subscribeToDataChanges = (listener: Listener) => {
    listeners.push(listener);
    return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
    };
};

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ONLINE' | 'OFFLINE' | 'ERROR';
let syncStatus: SyncStatus = 'IDLE';
const syncListeners: ((status: SyncStatus) => void)[] = [];
const notifySyncListeners = (status: SyncStatus) => {
    syncStatus = status;
    syncListeners.forEach(l => l(status));
};
export const subscribeToSyncStatus = (listener: (status: SyncStatus) => void) => {
    syncListeners.push(listener);
    return () => {
        const index = syncListeners.indexOf(listener);
        if (index > -1) syncListeners.splice(index, 1);
    };
};

// --- DATA ACCESSORS ---

// Students
export const getStudents = (): Student[] => get(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const list = getStudents(); list.push(s); updateCache(KEYS.STUDENTS, list); };
export const updateStudent = (s: Student) => { const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); if (idx > -1) { list[idx] = s; updateCache(KEYS.STUDENTS, list); } };
export const deleteStudent = (id: string) => { const list = getStudents(); updateCache(KEYS.STUDENTS, list.filter(x => x.id !== id)); };
export const deleteAllStudents = () => updateCache(KEYS.STUDENTS, []);
export const bulkAddStudents = (students: Student[]) => { const list = getStudents(); updateCache(KEYS.STUDENTS, [...list, ...students]); };
export const bulkUpsertStudents = (students: Student[], matchKey: keyof Student = 'nationalId') => {
    const list = getStudents();
    students.forEach(s => {
        const idx = list.findIndex(ex => ex[matchKey] === s[matchKey]);
        if (idx > -1) list[idx] = { ...list[idx], ...s };
        else list.push(s);
    });
    updateCache(KEYS.STUDENTS, list);
};

// Teachers
export const getTeachers = (): Teacher[] => get(KEYS.TEACHERS);
export const addTeacher = (t: Teacher) => { const list = getTeachers(); list.push(t); updateCache(KEYS.TEACHERS, list); };
export const updateTeacher = (t: Teacher) => { const list = getTeachers(); const idx = list.findIndex(x => x.id === t.id); if (idx > -1) { list[idx] = t; updateCache(KEYS.TEACHERS, list); } };

// Schools
export const getSchools = (): School[] => get(KEYS.SCHOOLS);
export const addSchool = (s: School) => { const list = getSchools(); list.push(s); updateCache(KEYS.SCHOOLS, list); };
export const updateSchool = (s: School) => { const list = getSchools(); const idx = list.findIndex(x => x.id === s.id); if (idx > -1) { list[idx] = s; updateCache(KEYS.SCHOOLS, list); } };
export const deleteSchool = (id: string) => { const list = getSchools(); updateCache(KEYS.SCHOOLS, list.filter(x => x.id !== id)); };

// System Users
export const getSystemUsers = (): SystemUser[] => get(KEYS.USERS);
export const addSystemUser = (u: SystemUser) => { const list = getSystemUsers(); list.push(u); updateCache(KEYS.USERS, list); };
export const updateSystemUser = (u: SystemUser) => { const list = getSystemUsers(); const idx = list.findIndex(x => x.id === u.id); if (idx > -1) { list[idx] = u; updateCache(KEYS.USERS, list); } };
export const deleteSystemUser = (id: string) => { const list = getSystemUsers(); updateCache(KEYS.USERS, list.filter(x => x.id !== id)); };

// Attendance
export const getAttendance = (): AttendanceRecord[] => get(KEYS.ATTENDANCE);
export const saveAttendance = (records: AttendanceRecord[]) => { 
    const list = getAttendance();
    records.forEach(r => {
        const idx = list.findIndex(x => x.id === r.id);
        if (idx > -1) list[idx] = r;
        else list.push(r);
    });
    updateCache(KEYS.ATTENDANCE, list);
};
export const bulkAddAttendance = (records: AttendanceRecord[]) => saveAttendance(records);

// Performance
export const getPerformance = (): PerformanceRecord[] => get(KEYS.PERFORMANCE);
export const addPerformance = (p: PerformanceRecord) => { 
    const list = getPerformance(); 
    const idx = list.findIndex(x => x.id === p.id);
    if (idx > -1) list[idx] = p;
    else list.push(p);
    updateCache(KEYS.PERFORMANCE, list);
};
export const bulkAddPerformance = (records: PerformanceRecord[]) => {
    const list = getPerformance();
    records.forEach(r => {
        const idx = list.findIndex(x => x.id === r.id);
        if (idx > -1) list[idx] = r;
        else list.push(r);
    });
    updateCache(KEYS.PERFORMANCE, list);
};
export const deletePerformance = (id: string) => { const list = getPerformance(); updateCache(KEYS.PERFORMANCE, list.filter(x => x.id !== id)); };

// Subjects
export const getSubjects = (teacherId?: string): Subject[] => {
    const all = get<Subject>(KEYS.SUBJECTS);
    if (!teacherId) return all;
    return all.filter(s => s.teacherId === teacherId || !s.teacherId);
};
export const addSubject = (s: Subject) => { const list = get<Subject>(KEYS.SUBJECTS); list.push(s); updateCache(KEYS.SUBJECTS, list); };
export const deleteSubject = (id: string) => { const list = get<Subject>(KEYS.SUBJECTS); updateCache(KEYS.SUBJECTS, list.filter(x => x.id !== id)); };

// Schedules
export const getSchedules = (): ScheduleItem[] => get(KEYS.SCHEDULES);
export const saveScheduleItem = (s: ScheduleItem) => { const list = getSchedules(); list.push(s); updateCache(KEYS.SCHEDULES, list); };
export const deleteScheduleItem = (id: string) => { const list = getSchedules(); updateCache(KEYS.SCHEDULES, list.filter(x => x.id !== id)); };

// Teacher Assignments (Class-Subject map)
export const getTeacherAssignments = (): TeacherAssignment[] => get(KEYS.TEACHER_ASSIGNMENTS);

// Assignments (Work/Tasks definitions)
export const getAssignments = (category?: string, teacherId?: string, isManager = false): Assignment[] => {
    let all = get<Assignment>(KEYS.ASSIGNMENT_DEFS);
    if (category) all = all.filter(a => a.category === category);
    if (teacherId && !isManager) all = all.filter(a => a.teacherId === teacherId || !a.teacherId);
    return all;
};
export const saveAssignment = (a: Assignment) => { 
    const list = get<Assignment>(KEYS.ASSIGNMENT_DEFS);
    const idx = list.findIndex(x => x.id === a.id);
    if (idx > -1) list[idx] = a;
    else list.push(a);
    updateCache(KEYS.ASSIGNMENT_DEFS, list);
};
export const deleteAssignment = (id: string) => { 
    const list = get<Assignment>(KEYS.ASSIGNMENT_DEFS);
    updateCache(KEYS.ASSIGNMENT_DEFS, list.filter(x => x.id !== id));
};

// Weekly Plans
export const getWeeklyPlans = (teacherId?: string): WeeklyPlanItem[] => {
    const all = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    if (!teacherId) return all;
    return all.filter(p => p.teacherId === teacherId);
};
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => {
    const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = list.findIndex(x => x.id === item.id);
    if (idx > -1) list[idx] = item;
    else list.push(item);
    updateCache(KEYS.WEEKLY_PLANS, list);
};

// Academic Terms
export const getAcademicTerms = (teacherId?: string): AcademicTerm[] => {
    const all = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    if (!teacherId) return all;
    return all.filter(t => t.teacherId === teacherId || !t.teacherId); // Include global terms if any
};
export const saveAcademicTerm = (term: AcademicTerm) => {
    const list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    const idx = list.findIndex(x => x.id === term.id);
    if (idx > -1) list[idx] = term;
    else list.push(term);
    updateCache(KEYS.ACADEMIC_TERMS, list);
};
export const deleteAcademicTerm = (id: string) => {
    const list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    updateCache(KEYS.ACADEMIC_TERMS, list.filter(x => x.id !== id));
};
export const setCurrentTerm = (id: string, teacherId?: string) => {
    const list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    list.forEach(t => {
        if (t.teacherId === teacherId || !teacherId) {
            t.isCurrent = t.id === id;
        }
    });
    updateCache(KEYS.ACADEMIC_TERMS, list);
};

// Custom Tables
export const getCustomTables = (teacherId?: string): CustomTable[] => {
    const all = get<CustomTable>(KEYS.CUSTOM_TABLES);
    if (!teacherId) return all;
    return all.filter(t => t.teacherId === teacherId);
};
export const addCustomTable = (t: CustomTable) => { const list = getCustomTables(); list.push(t); updateCache(KEYS.CUSTOM_TABLES, list); };
export const updateCustomTable = (t: CustomTable) => { const list = getCustomTables(); const idx = list.findIndex(x => x.id === t.id); if(idx > -1) { list[idx] = t; updateCache(KEYS.CUSTOM_TABLES, list); } };
export const deleteCustomTable = (id: string) => { const list = getCustomTables(); updateCache(KEYS.CUSTOM_TABLES, list.filter(x => x.id !== id)); };

// Messages
export const getMessages = (teacherId?: string): MessageLog[] => {
    const all = get<MessageLog>(KEYS.MESSAGES);
    if (!teacherId) return all;
    return all.filter(m => m.teacherId === teacherId);
};
export const saveMessage = (msg: MessageLog) => { const list = get<MessageLog>(KEYS.MESSAGES); list.push(msg); updateCache(KEYS.MESSAGES, list); };

// Feedback
export const getFeedback = (): Feedback[] => get(KEYS.FEEDBACK);

// Lesson Links
export const getLessonLinks = (): LessonLink[] => get(KEYS.LESSON_LINKS);
export const saveLessonLink = (l: LessonLink) => { const list = getLessonLinks(); list.push(l); updateCache(KEYS.LESSON_LINKS, list); };
export const deleteLessonLink = (id: string) => { const list = getLessonLinks(); updateCache(KEYS.LESSON_LINKS, list.filter(x => x.id !== id)); };

// Lesson Plans
export const getLessonPlans = (teacherId: string): StoredLessonPlan[] => {
    const all = get<StoredLessonPlan>(KEYS.LESSON_PLANS);
    return all.filter(p => p.teacherId === teacherId);
};
export const saveLessonPlan = (plan: StoredLessonPlan) => { const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS); list.push(plan); updateCache(KEYS.LESSON_PLANS, list); };
export const deleteLessonPlan = (id: string) => { const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS); updateCache(KEYS.LESSON_PLANS, list.filter(x => x.id !== id)); };

// Exams & Questions
export const getExams = (teacherId?: string): Exam[] => {
    const all = get<Exam>(KEYS.EXAMS);
    if (!teacherId) return all;
    return all.filter(e => e.teacherId === teacherId);
};
export const saveExam = (exam: Exam) => { 
    const list = get<Exam>(KEYS.EXAMS);
    const idx = list.findIndex(x => x.id === exam.id);
    if (idx > -1) list[idx] = exam;
    else list.push(exam);
    updateCache(KEYS.EXAMS, list);
};
export const deleteExam = (id: string) => { const list = get<Exam>(KEYS.EXAMS); updateCache(KEYS.EXAMS, list.filter(x => x.id !== id)); };

export const getQuestionBank = (teacherId: string): Question[] => {
    const all = get<Question>(KEYS.QUESTION_BANK);
    return all.filter(q => q.teacherId === teacherId);
};
export const saveQuestionToBank = (q: Question) => { 
    const list = get<Question>(KEYS.QUESTION_BANK);
    const idx = list.findIndex(x => x.id === q.id);
    if (idx > -1) list[idx] = q;
    else list.push(q);
    updateCache(KEYS.QUESTION_BANK, list);
};
export const deleteQuestionFromBank = (id: string) => { const list = get<Question>(KEYS.QUESTION_BANK); updateCache(KEYS.QUESTION_BANK, list.filter(x => x.id !== id)); };

export const getExamResults = (): ExamResult[] => get(KEYS.EXAM_RESULTS);
export const saveExamResult = (r: ExamResult) => { const list = getExamResults(); list.push(r); updateCache(KEYS.EXAM_RESULTS, list); };

// Curriculum
export const getCurriculumUnits = (teacherId: string): CurriculumUnit[] => {
    const all = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS);
    return all.filter(u => u.teacherId === teacherId);
};
export const saveCurriculumUnit = (u: CurriculumUnit) => { const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); list.push(u); updateCache(KEYS.CURRICULUM_UNITS, list); };
export const deleteCurriculumUnit = (id: string) => { const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); updateCache(KEYS.CURRICULUM_UNITS, list.filter(x => x.id !== id)); };

export const getCurriculumLessons = (): CurriculumLesson[] => get(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = (l: CurriculumLesson) => { const list = getCurriculumLessons(); list.push(l); updateCache(KEYS.CURRICULUM_LESSONS, list); };
export const deleteCurriculumLesson = (id: string) => { const list = getCurriculumLessons(); updateCache(KEYS.CURRICULUM_LESSONS, list.filter(x => x.id !== id)); };

export const getMicroConcepts = (teacherId: string): MicroConcept[] => {
    const all = get<MicroConcept>(KEYS.MICRO_CONCEPTS);
    return all.filter(c => c.teacherId === teacherId);
};
export const saveMicroConcept = (c: MicroConcept) => { const list = get<MicroConcept>(KEYS.MICRO_CONCEPTS); list.push(c); updateCache(KEYS.MICRO_CONCEPTS, list); };
export const deleteMicroConcept = (id: string) => { const list = get<MicroConcept>(KEYS.MICRO_CONCEPTS); updateCache(KEYS.MICRO_CONCEPTS, list.filter(x => x.id !== id)); };

// Tracking Sheets
export const getTrackingSheets = (teacherId?: string): TrackingSheet[] => {
    const all = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    if (!teacherId) return all;
    return all.filter(s => s.teacherId === teacherId);
};
export const saveTrackingSheet = (s: TrackingSheet) => { 
    const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    const idx = list.findIndex(x => x.id === s.id);
    if (idx > -1) list[idx] = s;
    else list.push(s);
    updateCache(KEYS.TRACKING_SHEETS, list);
};
export const deleteTrackingSheet = (id: string) => { const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS); updateCache(KEYS.TRACKING_SHEETS, list.filter(x => x.id !== id)); };

// Configs
export const getReportHeaderConfig = (teacherId?: string): ReportHeaderConfig => {
    const configs = get<ReportHeaderConfig>(KEYS.REPORT_CONFIG);
    return configs.find(c => c.teacherId === teacherId) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    const list = get<ReportHeaderConfig>(KEYS.REPORT_CONFIG);
    const idx = list.findIndex(x => x.teacherId === config.teacherId);
    if (idx > -1) list[idx] = config;
    else list.push(config);
    updateCache(KEYS.REPORT_CONFIG, list);
};

export const getUserTheme = (): UserTheme => {
    const theme = localStorage.getItem(KEYS.USER_THEME);
    return theme ? JSON.parse(theme) : { mode: 'LIGHT', backgroundStyle: 'FLAT' };
};
export const saveUserTheme = (theme: UserTheme) => {
    localStorage.setItem(KEYS.USER_THEME, JSON.stringify(theme));
};

export const getAISettings = (): AISettings => {
    const settings = localStorage.getItem(KEYS.AI_SETTINGS);
    return settings ? JSON.parse(settings) : { modelId: 'gemini-2.5-flash', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' };
};
export const saveAISettings = (settings: AISettings) => {
    localStorage.setItem(KEYS.AI_SETTINGS, JSON.stringify(settings));
};

export const getWorksMasterUrl = (): string => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

// --- AUTHENTICATION ---
export const authenticateUser = async (identifier: string, password: string): Promise<SystemUser | undefined> => {
    // Check local users first (for offline support or simple login)
    const localUsers = getSystemUsers();
    const localUser = localUsers.find(u => 
        (u.email === identifier || u.nationalId === identifier) && u.password === password
    );
    if (localUser) return localUser;

    // Simulate Cloud Check (In real scenario, check Supabase)
    // For now, we rely on local sync being up to date
    return undefined;
};

export const authenticateStudent = async (identifier: string, password: string): Promise<Student | undefined> => {
    const students = getStudents();
    const student = students.find(s => s.nationalId === identifier);
    
    if (student) {
        // Default password check: Last 4 digits of National ID if password not set
        const defaultPass = student.nationalId?.slice(-4);
        const validPass = student.password || defaultPass;
        
        if (password === validPass) {
            // Return as a SystemUser-like object for session, but it is a Student
            return student; 
        }
    }
    return undefined;
};

// --- SYNC & CLOUD ---
export const initAutoSync = async () => {
    // Mock implementation for auto-sync init
    console.log("Auto sync initialized");
    notifySyncListeners('ONLINE');
};

export const setSystemMode = (online: boolean) => {
    notifySyncListeners(online ? 'ONLINE' : 'OFFLINE');
};

export const checkConnection = async () => {
    // Mock connection check
    return { success: true, message: 'Connected' };
};

export const uploadToSupabase = async () => {
    // Mock upload
    console.log("Uploading data...");
};

export const downloadFromSupabase = async () => {
    // Mock download
    console.log("Downloading data...");
};

export const createBackup = (): string => {
    const backup: any = {};
    Object.values(KEYS).forEach(key => {
        backup[key] = localStorage.getItem(key);
    });
    return JSON.stringify(backup);
};

export const restoreBackup = (json: string) => {
    try {
        const data = JSON.parse(json);
        Object.keys(data).forEach(key => {
            if (data[key]) localStorage.setItem(key, data[key]);
        });
        window.location.reload();
    } catch (e) {
        alert("ملف النسخة الاحتياطية غير صالح");
    }
};

export const clearDatabase = () => {
    localStorage.clear();
};

export const DB_MAP: Record<string, string> = {
    'students': 'students',
    'teachers': 'teachers',
    // ... map other keys if needed for cloud
};

export const getTableDisplayName = (table: string) => table;

export const fetchCloudTableData = async (table: string) => {
    // Mock fetch
    return [];
};

export const clearCloudTable = async (table: string) => {
    // Mock clear
};

export const resetCloudDatabase = async () => {
    // Mock reset
};

export const backupCloudDatabase = async () => {
    // Mock cloud backup
    return "{}";
};

export const restoreCloudDatabase = async (json: string) => {
    // Mock cloud restore
};

export const getDatabaseSchemaSQL = () => "CREATE TABLE ..."; // Placeholder
export const getDatabaseUpdateSQL = () => "ALTER TABLE ..."; // Placeholder

export const validateCloudSchema = async () => {
    return { missingTables: [] };
};

export const getStorageStatistics = () => {
    return {
        students: getStudents().length,
        teachers: getTeachers().length,
        // ... other stats
    };
};
