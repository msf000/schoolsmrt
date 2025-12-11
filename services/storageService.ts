
import { 
    Student, Teacher, School, SystemUser, AttendanceRecord, PerformanceRecord, 
    Subject, ScheduleItem, TeacherAssignment, Assignment, WeeklyPlanItem, 
    LessonLink, LessonBlock, StoredLessonPlan, MessageLog, Feedback, 
    AISettings, CustomTable, ReportHeaderConfig, UserTheme, 
    Exam, ExamResult, Question, CurriculumUnit, CurriculumLesson, MicroConcept,
    TrackingSheet, AcademicTerm, TermPeriod
} from '../types';
import { supabase } from './supabaseClient';

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
    ASSIGNMENTS: 'assignments', // TeacherAssignment (Class-Subject link)
    WORKS_ASSIGNMENTS: 'works_assignments', // Works Tracking Columns
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
    WORKS_MASTER_URL: 'works_master_url'
};

// --- Helper Functions ---
const get = <T>(key: string): T[] => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

const save = <T>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
    notifyDataChange();
};

// --- Event Emitter for Sync/Data ---
export type SyncStatus = 'IDLE' | 'SYNCING' | 'ONLINE' | 'OFFLINE' | 'ERROR';
type Listener = (status: SyncStatus) => void;
type DataListener = () => void;

let syncStatus: SyncStatus = 'IDLE';
const syncListeners: Set<Listener> = new Set();
const dataListeners: Set<DataListener> = new Set();

const setSyncStatus = (status: SyncStatus) => {
    syncStatus = status;
    syncListeners.forEach(l => l(status));
};

export const subscribeToSyncStatus = (listener: Listener) => {
    syncListeners.add(listener);
    return () => syncListeners.delete(listener);
};

export const subscribeToDataChanges = (listener: DataListener) => {
    dataListeners.add(listener);
    return () => dataListeners.delete(listener);
};

const notifyDataChange = () => {
    dataListeners.forEach(l => l());
};

// --- Basic CRUD ---

// Students
export const getStudents = (): Student[] => get(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const list = getStudents(); list.push(s); save(KEYS.STUDENTS, list); };
export const updateStudent = (s: Student) => { const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); if (idx > -1) list[idx] = s; save(KEYS.STUDENTS, list); };
export const deleteStudent = (id: string) => { const list = getStudents().filter(x => x.id !== id); save(KEYS.STUDENTS, list); };
export const deleteAllStudents = () => save(KEYS.STUDENTS, []);
export const bulkAddStudents = (students: Student[]) => { const list = getStudents(); save(KEYS.STUDENTS, [...list, ...students]); };
export const bulkUpsertStudents = (students: Student[], key: keyof Student = 'nationalId') => {
    let list = getStudents();
    students.forEach(s => {
        const idx = list.findIndex(existing => existing[key] === s[key]);
        if (idx > -1) list[idx] = { ...list[idx], ...s };
        else list.push(s);
    });
    save(KEYS.STUDENTS, list);
};

// Attendance
export const getAttendance = (): AttendanceRecord[] => get(KEYS.ATTENDANCE);
export const saveAttendance = (records: AttendanceRecord[]) => { 
    let list = getAttendance(); 
    // Upsert logic
    records.forEach(r => {
        const idx = list.findIndex(x => x.id === r.id);
        if (idx > -1) list[idx] = r;
        else list.push(r);
    });
    save(KEYS.ATTENDANCE, list);
};
export const bulkAddAttendance = (records: AttendanceRecord[]) => saveAttendance(records);

// Performance
export const getPerformance = (): PerformanceRecord[] => get(KEYS.PERFORMANCE);
export const addPerformance = (p: PerformanceRecord) => { const list = getPerformance(); list.push(p); save(KEYS.PERFORMANCE, list); };
export const deletePerformance = (id: string) => { const list = getPerformance().filter(x => x.id !== id); save(KEYS.PERFORMANCE, list); };
export const bulkAddPerformance = (records: PerformanceRecord[]) => { const list = getPerformance(); save(KEYS.PERFORMANCE, [...list, ...records]); };

// Teachers
export const getTeachers = (): Teacher[] => get(KEYS.TEACHERS);
export const addTeacher = (t: Teacher) => { 
    const list = getTeachers(); 
    list.push(t); 
    save(KEYS.TEACHERS, list);
    // Also add to System Users
    addSystemUser({
        id: t.id, name: t.name, email: t.email || t.id, nationalId: t.nationalId, 
        password: t.password || '123456', role: 'TEACHER', schoolId: t.schoolId, status: 'ACTIVE'
    });
};
export const updateTeacher = (t: Teacher) => { 
    const list = getTeachers(); 
    const idx = list.findIndex(x => x.id === t.id); 
    if (idx > -1) list[idx] = t; 
    save(KEYS.TEACHERS, list); 
};

// Schools
export const getSchools = (): School[] => get(KEYS.SCHOOLS);
export const addSchool = (s: School) => { const list = getSchools(); list.push(s); save(KEYS.SCHOOLS, list); };
export const updateSchool = (s: School) => { const list = getSchools(); const idx = list.findIndex(x => x.id === s.id); if (idx > -1) list[idx] = s; save(KEYS.SCHOOLS, list); };
export const deleteSchool = (id: string) => { save(KEYS.SCHOOLS, getSchools().filter(x => x.id !== id)); };

// System Users
export const getSystemUsers = (): SystemUser[] => get(KEYS.USERS);
export const addSystemUser = (u: SystemUser) => { const list = getSystemUsers(); list.push(u); save(KEYS.USERS, list); };
export const updateSystemUser = (u: SystemUser) => { const list = getSystemUsers(); const idx = list.findIndex(x => x.id === u.id); if (idx > -1) list[idx] = u; save(KEYS.USERS, list); };
export const deleteSystemUser = (id: string) => { save(KEYS.USERS, getSystemUsers().filter(x => x.id !== id)); };

// --- UPDATED AUTHENTICATION: Local -> Cloud Fallback ---
export const authenticateUser = async (identifier: string, password: string): Promise<SystemUser | undefined> => {
    // 1. Try Local Storage first
    const users = getSystemUsers();
    const localUser = users.find(u => (u.email === identifier || u.nationalId === identifier) && u.password === password && u.status === 'ACTIVE');
    
    if (localUser) return localUser;

    // 2. Try Supabase Cloud Fallback
    try {
        console.log("Local auth failed, trying cloud...");
        const { data, error } = await supabase
            .from('system_users')
            .select('*')
            .or(`email.eq.${identifier},nationalId.eq.${identifier}`)
            .eq('password', password)
            .eq('status', 'ACTIVE')
            .single();
            
        if (data && !error) {
            // Cache locally for next time to ensure offline capability
            addSystemUser(data);
            return data as SystemUser;
        }
    } catch (e) {
        console.error("Cloud auth failed:", e);
    }

    return undefined;
};

// Subjects
export const getSubjects = (teacherId?: string): Subject[] => {
    const all = get<Subject>(KEYS.SUBJECTS);
    if (!teacherId) return all;
    return all.filter(s => s.teacherId === teacherId || !s.teacherId);
};
export const addSubject = (s: Subject) => { const list = get<Subject>(KEYS.SUBJECTS); list.push(s); save(KEYS.SUBJECTS, list); };
export const deleteSubject = (id: string) => { save(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(x => x.id !== id)); };

// Schedule
export const getSchedules = (): ScheduleItem[] => get(KEYS.SCHEDULES);
export const saveScheduleItem = (item: ScheduleItem) => { 
    const list = getSchedules(); 
    // Check if replacing
    const idx = list.findIndex(x => x.classId === item.classId && x.day === item.day && x.period === item.period);
    if (idx > -1) list[idx] = item;
    else list.push(item);
    save(KEYS.SCHEDULES, list); 
};
export const deleteScheduleItem = (id: string) => { save(KEYS.SCHEDULES, getSchedules().filter(x => x.id !== id)); };

// Teacher Assignments
export const getTeacherAssignments = (): TeacherAssignment[] => get(KEYS.ASSIGNMENTS);
export const saveTeacherAssignment = (item: TeacherAssignment) => { const list = getTeacherAssignments(); list.push(item); save(KEYS.ASSIGNMENTS, list); };
export const deleteTeacherAssignment = (id: string) => { save(KEYS.ASSIGNMENTS, getTeacherAssignments().filter(x => x.id !== id)); };

// Works Tracking Assignments (Columns)
export const getAssignments = (category: string, teacherId?: string): Assignment[] => {
    const all = get<Assignment>(KEYS.WORKS_ASSIGNMENTS);
    return all.filter(a => a.category === category && (a.teacherId === teacherId || !a.teacherId));
};
export const saveAssignment = (a: Assignment) => { 
    const list = get<Assignment>(KEYS.WORKS_ASSIGNMENTS); 
    const idx = list.findIndex(x => x.id === a.id);
    if (idx > -1) list[idx] = a;
    else list.push(a);
    save(KEYS.WORKS_ASSIGNMENTS, list);
};
export const deleteAssignment = (id: string) => { save(KEYS.WORKS_ASSIGNMENTS, get<Assignment>(KEYS.WORKS_ASSIGNMENTS).filter(x => x.id !== id)); };

// Settings
export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);
export const getAISettings = (): AISettings => {
    const s = localStorage.getItem(KEYS.AI_SETTINGS);
    return s ? JSON.parse(s) : { modelId: 'gemini-2.5-flash', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' };
};
export const saveAISettings = (s: AISettings) => localStorage.setItem(KEYS.AI_SETTINGS, JSON.stringify(s));
export const getUserTheme = (): UserTheme => {
    const t = localStorage.getItem(KEYS.THEME);
    return t ? JSON.parse(t) : { mode: 'LIGHT', backgroundStyle: 'FLAT' };
};
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.THEME, JSON.stringify(t));
export const setSystemMode = (isOnline: boolean) => setSyncStatus(isOnline ? 'ONLINE' : 'OFFLINE');

// Feedback
export const getFeedback = (): Feedback[] => get(KEYS.FEEDBACK);
export const addFeedback = (f: Feedback) => { const list = getFeedback(); list.push(f); save(KEYS.FEEDBACK, list); };

// Messages
export const getMessages = (teacherId?: string): MessageLog[] => {
    const all = get<MessageLog>(KEYS.MESSAGES);
    if (!teacherId) return all;
    return all.filter(m => m.teacherId === teacherId);
};
export const saveMessage = (m: MessageLog) => { const list = get<MessageLog>(KEYS.MESSAGES); list.unshift(m); save(KEYS.MESSAGES, list); };

// Lesson Plans & Links
export const getLessonLinks = (): LessonLink[] => get(KEYS.LESSON_LINKS);
export const saveLessonLink = (l: LessonLink) => { const list = getLessonLinks(); list.push(l); save(KEYS.LESSON_LINKS, list); };
export const deleteLessonLink = (id: string) => { save(KEYS.LESSON_LINKS, getLessonLinks().filter(x => x.id !== id)); };

export const getLessonPlans = (teacherId: string): StoredLessonPlan[] => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.teacherId === teacherId);
export const saveLessonPlan = (p: StoredLessonPlan) => { const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS); list.push(p); save(KEYS.LESSON_PLANS, list); };
export const deleteLessonPlan = (id: string) => { save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(x => x.id !== id)); };

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
    save(KEYS.WEEKLY_PLANS, list);
};

// Curriculum
export const getCurriculumUnits = (teacherId: string): CurriculumUnit[] => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.teacherId === teacherId);
export const saveCurriculumUnit = (u: CurriculumUnit) => { const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); list.push(u); save(KEYS.CURRICULUM_UNITS, list); };
export const deleteCurriculumUnit = (id: string) => { save(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(x => x.id !== id)); };

export const getCurriculumLessons = (): CurriculumLesson[] => get(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = (l: CurriculumLesson) => { 
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(x => x.id === l.id);
    if (idx > -1) list[idx] = l;
    else list.push(l);
    save(KEYS.CURRICULUM_LESSONS, list);
};
export const deleteCurriculumLesson = (id: string) => { save(KEYS.CURRICULUM_LESSONS, get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(x => x.id !== id)); };

export const getMicroConcepts = (teacherId: string): MicroConcept[] => get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(c => c.teacherId === teacherId);
export const saveMicroConcept = (c: MicroConcept) => { const list = get<MicroConcept>(KEYS.MICRO_CONCEPTS); list.push(c); save(KEYS.MICRO_CONCEPTS, list); };
export const deleteMicroConcept = (id: string) => { save(KEYS.MICRO_CONCEPTS, get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(x => x.id !== id)); };

// Exams
export const getExams = (teacherId?: string): Exam[] => {
    const all = get<Exam>(KEYS.EXAMS);
    if (!teacherId) return all;
    return all.filter(e => e.teacherId === teacherId);
};
export const saveExam = (e: Exam) => { 
    const list = get<Exam>(KEYS.EXAMS);
    const idx = list.findIndex(x => x.id === e.id);
    if (idx > -1) list[idx] = e;
    else list.push(e);
    save(KEYS.EXAMS, list);
};
export const deleteExam = (id: string) => { save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(x => x.id !== id)); };

export const getExamResults = (examId?: string): ExamResult[] => {
    const all = get<ExamResult>(KEYS.EXAM_RESULTS);
    if (!examId) return all;
    return all.filter(r => r.examId === examId);
};
export const saveExamResult = (r: ExamResult) => { const list = get<ExamResult>(KEYS.EXAM_RESULTS); list.push(r); save(KEYS.EXAM_RESULTS, list); };

export const getQuestionBank = (teacherId: string): Question[] => get<Question>(KEYS.QUESTION_BANK).filter(q => q.teacherId === teacherId);
export const saveQuestionToBank = (q: Question) => { 
    const list = get<Question>(KEYS.QUESTION_BANK);
    const idx = list.findIndex(x => x.id === q.id);
    if (idx > -1) list[idx] = q;
    else list.push(q);
    save(KEYS.QUESTION_BANK, list);
};
export const deleteQuestionFromBank = (id: string) => { save(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(x => x.id !== id)); };

// Tracking Sheets (Flexible)
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
    save(KEYS.TRACKING_SHEETS, list);
};
export const deleteTrackingSheet = (id: string) => { save(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(x => x.id !== id)); };

// Custom Tables
export const getCustomTables = (teacherId?: string): CustomTable[] => {
    const all = get<CustomTable>(KEYS.CUSTOM_TABLES);
    if (!teacherId) return all;
    return all.filter(t => t.teacherId === teacherId);
};
export const addCustomTable = (t: CustomTable) => { const list = get<CustomTable>(KEYS.CUSTOM_TABLES); list.push(t); save(KEYS.CUSTOM_TABLES, list); };
export const updateCustomTable = (t: CustomTable) => { 
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx > -1) list[idx] = t;
    save(KEYS.CUSTOM_TABLES, list);
};
export const deleteCustomTable = (id: string) => { save(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(x => x.id !== id)); };

// Academic Terms
export const getAcademicTerms = (teacherId?: string): AcademicTerm[] => {
    const all = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    if (!teacherId) return all;
    return all.filter(t => t.teacherId === teacherId || !t.teacherId);
};
export const saveAcademicTerm = (term: AcademicTerm) => {
    const list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    const idx = list.findIndex(t => t.id === term.id);
    if (idx > -1) list[idx] = term;
    else list.push(term);
    save(KEYS.ACADEMIC_TERMS, list);
};
export const deleteAcademicTerm = (id: string) => { save(KEYS.ACADEMIC_TERMS, get<AcademicTerm>(KEYS.ACADEMIC_TERMS).filter(t => t.id !== id)); };
export const setCurrentTerm = (id: string, teacherId?: string) => {
    const list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS).map(t => {
        if (!teacherId || t.teacherId === teacherId) {
            return { ...t, isCurrent: t.id === id };
        }
        return t;
    });
    save(KEYS.ACADEMIC_TERMS, list);
};

// Report Config
export const getReportHeaderConfig = (teacherId?: string): ReportHeaderConfig => {
    const configs = get<ReportHeaderConfig & { id?: string }>(KEYS.REPORT_CONFIG); 
    if (Array.isArray(configs)) {
        return configs.find(c => c.teacherId === teacherId) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
    }
    const stored = localStorage.getItem(KEYS.REPORT_CONFIG);
    return stored ? JSON.parse(stored) : { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    let configs = get<ReportHeaderConfig>(KEYS.REPORT_CONFIG);
    if (!Array.isArray(configs)) configs = [];
    const idx = configs.findIndex(c => c.teacherId === config.teacherId);
    if (idx > -1) configs[idx] = config;
    else configs.push(config);
    save(KEYS.REPORT_CONFIG, configs);
};

export const getStorageStatistics = () => {
    return {
        students: getStudents().length,
        attendance: getAttendance().length,
        performance: getPerformance().length
    };
};

// --- System Functions ---
export const clearDatabase = () => {
    localStorage.clear();
    window.location.reload();
};

export const createBackup = () => {
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
        alert('تمت استعادة النسخة الاحتياطية بنجاح!');
        window.location.reload();
    } catch {
        alert('ملف النسخة الاحتياطية غير صالح.');
    }
};

export const initAutoSync = async () => {
    setSyncStatus('SYNCING');
    setTimeout(() => setSyncStatus('ONLINE'), 2000);
};

// --- Cloud (Supabase) Mock/Bridge ---
export const uploadToSupabase = async () => {
    console.log("Uploading to Supabase...");
    return true;
};

export const downloadFromSupabase = async () => {
    console.log("Downloading from Supabase...");
    return true;
};

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
        return { success: !error };
    } catch { return { success: false }; }
};

export const fetchCloudTableData = async (table: string) => {
    const { data } = await supabase.from(table).select('*').limit(50);
    return data;
};

export const validateCloudSchema = async () => {
    return { missingTables: [] }; 
};

export const clearCloudTable = async (table: string) => {
    await supabase.from(table).delete().neq('id', '0');
};

export const resetCloudDatabase = async () => {
};

export const backupCloudDatabase = async () => {
    return "{}";
};

export const restoreCloudDatabase = async (json: string) => {
};

// SQL Generators
export const getDatabaseSchemaSQL = () => {
    return `
-- 1. Schools
CREATE TABLE IF NOT EXISTS "schools" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "ministryCode" TEXT,
  "managerName" TEXT,
  "managerNationalId" TEXT,
  "type" TEXT,
  "phone" TEXT,
  "studentCount" INTEGER,
  "educationAdministration" TEXT,
  "worksMasterUrl" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "schools" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "schools" FOR ALL USING (true) WITH CHECK (true);

-- 2. Teachers
CREATE TABLE IF NOT EXISTS "teachers" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "nationalId" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "password" TEXT,
  "subjectSpecialty" TEXT,
  "schoolId" TEXT,
  "managerId" TEXT,
  "subscriptionStatus" TEXT,
  "subscriptionEndDate" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "teachers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "teachers" FOR ALL USING (true) WITH CHECK (true);

-- 3. System Users
CREATE TABLE IF NOT EXISTS "system_users" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "email" TEXT,
  "nationalId" TEXT,
  "password" TEXT,
  "role" TEXT,
  "schoolId" TEXT,
  "status" TEXT,
  "isDemo" BOOLEAN,
  "phone" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "system_users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "system_users" FOR ALL USING (true) WITH CHECK (true);

-- 4. Students
CREATE TABLE IF NOT EXISTS "students" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "nationalId" TEXT,
  "gradeLevel" TEXT,
  "className" TEXT,
  "schoolId" TEXT,
  "parentId" TEXT,
  "parentName" TEXT,
  "parentPhone" TEXT,
  "parentEmail" TEXT,
  "password" TEXT,
  "seatIndex" INTEGER,
  "createdById" TEXT,
  "classId" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "students" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "students" FOR ALL USING (true) WITH CHECK (true);

-- 5. Attendance
CREATE TABLE IF NOT EXISTS "attendance" (
  "id" TEXT PRIMARY KEY,
  "studentId" TEXT,
  "date" TEXT,
  "status" TEXT,
  "subject" TEXT,
  "period" INTEGER,
  "behaviorStatus" TEXT,
  "behaviorNote" TEXT,
  "excuseNote" TEXT,
  "excuseFile" TEXT,
  "createdById" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "attendance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "attendance" FOR ALL USING (true) WITH CHECK (true);

-- 6. Performance (Grades)
CREATE TABLE IF NOT EXISTS "performance" (
  "id" TEXT PRIMARY KEY,
  "studentId" TEXT,
  "subject" TEXT,
  "title" TEXT,
  "category" TEXT,
  "score" NUMERIC,
  "maxScore" NUMERIC,
  "date" TEXT,
  "notes" TEXT,
  "url" TEXT,
  "createdById" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "performance" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "performance" FOR ALL USING (true) WITH CHECK (true);

-- 7. Assignments (Columns)
CREATE TABLE IF NOT EXISTS "assignments" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT,
  "category" TEXT,
  "maxScore" NUMERIC,
  "url" TEXT,
  "isVisible" BOOLEAN,
  "orderIndex" INTEGER,
  "sourceMetadata" TEXT,
  "teacherId" TEXT,
  "termId" TEXT,
  "periodId" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "assignments" FOR ALL USING (true) WITH CHECK (true);

-- 8. Schedules
CREATE TABLE IF NOT EXISTS "schedules" (
  "id" TEXT PRIMARY KEY,
  "classId" TEXT,
  "day" TEXT,
  "period" INTEGER,
  "subjectName" TEXT,
  "teacherId" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "schedules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "schedules" FOR ALL USING (true) WITH CHECK (true);

-- 9. Teacher Assignments (Class-Subject Links)
CREATE TABLE IF NOT EXISTS "teacher_assignments" (
  "id" TEXT PRIMARY KEY,
  "classId" TEXT,
  "subjectName" TEXT,
  "teacherId" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "teacher_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "teacher_assignments" FOR ALL USING (true) WITH CHECK (true);

-- 10. Subjects
CREATE TABLE IF NOT EXISTS "subjects" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "teacherId" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "subjects" FOR ALL USING (true) WITH CHECK (true);

-- 11. Weekly Plans
CREATE TABLE IF NOT EXISTS "weekly_plans" (
  "id" TEXT PRIMARY KEY,
  "teacherId" TEXT,
  "classId" TEXT,
  "subjectName" TEXT,
  "day" TEXT,
  "period" INTEGER,
  "weekStartDate" TEXT,
  "lessonTopic" TEXT,
  "homework" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "weekly_plans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "weekly_plans" FOR ALL USING (true) WITH CHECK (true);

-- 12. Lesson Links
CREATE TABLE IF NOT EXISTS "lesson_links" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT,
  "url" TEXT,
  "teacherId" TEXT,
  "createdAt" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "lesson_links" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "lesson_links" FOR ALL USING (true) WITH CHECK (true);

-- 13. Lesson Plans (Detailed)
CREATE TABLE IF NOT EXISTS "lesson_plans" (
  "id" TEXT PRIMARY KEY,
  "teacherId" TEXT,
  "lessonId" TEXT,
  "subject" TEXT,
  "topic" TEXT,
  "contentJson" TEXT,
  "resources" JSONB,
  "createdAt" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "lesson_plans" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "lesson_plans" FOR ALL USING (true) WITH CHECK (true);

-- 14. Custom Tables
CREATE TABLE IF NOT EXISTS "custom_tables" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "createdAt" TEXT,
  "columns" JSONB,
  "rows" JSONB,
  "sourceUrl" TEXT,
  "lastUpdated" TEXT,
  "teacherId" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "custom_tables" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "custom_tables" FOR ALL USING (true) WITH CHECK (true);

-- 15. Message Logs (UPDATED with teacherId)
CREATE TABLE IF NOT EXISTS "message_logs" (
  "id" TEXT PRIMARY KEY,
  "studentId" TEXT,
  "studentName" TEXT,
  "parentPhone" TEXT,
  "type" TEXT,
  "content" TEXT,
  "status" TEXT,
  "date" TEXT,
  "sentBy" TEXT,
  "teacherId" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "message_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "message_logs" FOR ALL USING (true) WITH CHECK (true);

-- 16. Feedback
CREATE TABLE IF NOT EXISTS "feedback" (
  "id" TEXT PRIMARY KEY,
  "teacherId" TEXT,
  "managerId" TEXT,
  "content" TEXT,
  "date" TEXT,
  "isRead" BOOLEAN,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "feedback" FOR ALL USING (true) WITH CHECK (true);

-- 17. Exams
CREATE TABLE IF NOT EXISTS "exams" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT,
  "subject" TEXT,
  "gradeLevel" TEXT,
  "durationMinutes" INTEGER,
  "questions" JSONB,
  "isActive" BOOLEAN,
  "createdAt" TEXT,
  "teacherId" TEXT,
  "date" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "exams" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "exams" FOR ALL USING (true) WITH CHECK (true);

-- 18. Exam Results
CREATE TABLE IF NOT EXISTS "exam_results" (
  "id" TEXT PRIMARY KEY,
  "examId" TEXT,
  "studentId" TEXT,
  "studentName" TEXT,
  "score" NUMERIC,
  "totalScore" NUMERIC,
  "date" TEXT,
  "answers" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "exam_results" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "exam_results" FOR ALL USING (true) WITH CHECK (true);

-- 19. Questions Bank
CREATE TABLE IF NOT EXISTS "questions" (
  "id" TEXT PRIMARY KEY,
  "text" TEXT,
  "type" TEXT,
  "options" JSONB,
  "correctAnswer" TEXT,
  "points" INTEGER,
  "subject" TEXT,
  "gradeLevel" TEXT,
  "topic" TEXT,
  "difficulty" TEXT,
  "teacherId" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "questions" FOR ALL USING (true) WITH CHECK (true);

-- 20. Curriculum Units
CREATE TABLE IF NOT EXISTS "curriculum_units" (
  "id" TEXT PRIMARY KEY,
  "teacherId" TEXT,
  "subject" TEXT,
  "gradeLevel" TEXT,
  "title" TEXT,
  "orderIndex" INTEGER,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "curriculum_units" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "curriculum_units" FOR ALL USING (true) WITH CHECK (true);

-- 21. Curriculum Lessons
CREATE TABLE IF NOT EXISTS "curriculum_lessons" (
  "id" TEXT PRIMARY KEY,
  "unitId" TEXT,
  "title" TEXT,
  "orderIndex" INTEGER,
  "learningStandards" JSONB,
  "microConceptIds" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "curriculum_lessons" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "curriculum_lessons" FOR ALL USING (true) WITH CHECK (true);

-- 22. Micro Concepts
CREATE TABLE IF NOT EXISTS "micro_concepts" (
  "id" TEXT PRIMARY KEY,
  "teacherId" TEXT,
  "subject" TEXT,
  "name" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "micro_concepts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "micro_concepts" FOR ALL USING (true) WITH CHECK (true);

-- 23. Tracking Sheets
CREATE TABLE IF NOT EXISTS "tracking_sheets" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT,
  "subject" TEXT,
  "className" TEXT,
  "teacherId" TEXT,
  "createdAt" TEXT,
  "columns" JSONB,
  "scores" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "tracking_sheets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "tracking_sheets" FOR ALL USING (true) WITH CHECK (true);

-- 24. Academic Terms
CREATE TABLE IF NOT EXISTS "academic_terms" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "startDate" TEXT,
  "endDate" TEXT,
  "isCurrent" BOOLEAN,
  "teacherId" TEXT,
  "periods" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE "academic_terms" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Access" ON "academic_terms" FOR ALL USING (true) WITH CHECK (true);
`;
};

export const getDatabaseUpdateSQL = () => {
    return `
-- Enable RLS and Public Access for all tables (Safe to run multiple times)
do $$
declare
  tables text[] := array[
    'schools', 'teachers', 'system_users', 'students', 'attendance', 'performance', 
    'assignments', 'schedules', 'teacher_assignments', 'subjects', 'weekly_plans', 
    'lesson_links', 'lesson_plans', 'custom_tables', 'message_logs', 'feedback', 
    'exams', 'exam_results', 'questions', 'curriculum_units', 'curriculum_lessons', 
    'micro_concepts', 'tracking_sheets', 'academic_terms'
  ];
  t text;
begin
  foreach t in array tables loop
    -- 1. Create table if missing (Generic structure, mostly relies on schema update)
    -- This block is just a placeholder, rely on full schema for creation.
    
    -- 2. Enable RLS
    execute format('ALTER TABLE IF EXISTS "%I" ENABLE ROW LEVEL SECURITY;', t);
    
    -- 3. Create Policy (Drop first to avoid error)
    execute format('DROP POLICY IF EXISTS "Public Access" ON "%I";', t);
    execute format('CREATE POLICY "Public Access" ON "%I" FOR ALL USING (true) WITH CHECK (true);', t);
  end loop;
end $$;
`;
};

export const DB_MAP: Record<string, string> = {
    'schools': 'schools',
    'teachers': 'teachers',
    'students': 'students'
};

export const getTableDisplayName = (table: string) => table;
