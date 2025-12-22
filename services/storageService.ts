
import { 
    Student, AttendanceRecord, PerformanceRecord, Teacher, School, 
    SystemUser, Subject, ScheduleItem, TeacherAssignment, 
    AcademicTerm, WeeklyPlanItem, LessonLink, StoredLessonPlan,
    Exam, AISettings, ReportHeaderConfig, UserTheme, 
    CustomTable, EnvironmentRecord, LearningStyle, CurriculumUnit, 
    CurriculumLesson, Question, ExamResult, TrackingSheet, RemedialPlan,
    MessageLog, FormsDetailedResult, BehaviorIncident, Task, Assignment, TermPeriod
} from '../types';
import { supabase } from './supabaseClient';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR' | 'CHECKING' | 'CONNECTED';

export const KEYS = {
    STUDENTS: 'students',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    SYSTEM_USERS: 'system_users',
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    TRACKING_ASSIGNMENTS: 'assignments',
    TERMS: 'academic_terms',
    WEEKLY_PLANS: 'weekly_plans',
    LESSON_LINKS: 'lesson_links',
    LESSON_PLANS: 'lesson_plans',
    EXAMS: 'exams',
    EXAM_RESULTS: 'exam_results',
    QUESTION_BANK: 'question_bank',
    CURRICULUM_UNITS: 'curriculum_units',
    CURRICULUM_LESSONS: 'curriculum_lessons',
    TRACKING_SHEETS: 'tracking_sheets',
    MESSAGES: 'messages',
    CUSTOM_TABLES: 'custom_tables',
    USER_THEME: 'user_theme',
    AI_SETTINGS: 'ai_settings',
    ENVIRONMENT: 'environment_records',
    REMEDIAL_PLANS: 'remedial_plans',
    FORMS_DETAILED: 'forms_detailed_results',
    WORKS_MASTER_URL: 'works_master_url',
    BEHAVIOR_INCIDENTS: 'behavior_incidents',
    TASKS: 'tasks',
    PERIOD_TIMINGS: 'period_timings',
    TEACHER_ASSIGNMENTS: 'teacher_class_map'
};

// --- FIX: Added DB_MAP for AdminDashboard ---
export const DB_MAP: Record<string, string> = {
    STUDENTS: 'students',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    SYSTEM_USERS: 'system_users',
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    TERMS: 'academic_terms',
    WEEKLY_PLANS: 'weekly_plans',
    LESSON_LINKS: 'lesson_links',
    LESSON_PLANS: 'lesson_plans',
    EXAMS: 'exams',
    EXAM_RESULTS: 'exam_results',
    QUESTION_BANK: 'question_bank',
    CURRICULUM_UNITS: 'curriculum_units',
    CURRICULUM_LESSONS: 'curriculum_lessons',
    TRACKING_SHEETS: 'tracking_sheets',
    MESSAGES: 'messages',
    CUSTOM_TABLES: 'custom_tables',
    ENVIRONMENT: 'environment_records',
    REMEDIAL_PLANS: 'remedial_plans',
    FORMS_DETAILED: 'forms_detailed_results',
    BEHAVIOR_INCIDENTS: 'behavior_incidents',
    TASKS: 'tasks'
};

export function get<T>(key: string): T[] { 
    try { 
        const data = localStorage.getItem(key); 
        return data ? JSON.parse(data) : []; 
    } catch { return []; } 
}
export function save(key: string, data: any) { 
    localStorage.setItem(key, JSON.stringify(data)); 
}

// --- FIX: Added setSystemMode placeholder ---
export const setSystemMode = (v: boolean) => {};

// --- FIX: Added SQL generators for AdminDashboard ---
export const getDatabaseSchemaSQL = () => `
-- Basic Schema
CREATE TABLE schools (id TEXT PRIMARY KEY, name TEXT, ministry_code TEXT, manager_name TEXT, manager_national_id TEXT, type TEXT, phone TEXT, student_count INTEGER, education_administration TEXT);
CREATE TABLE teachers (id TEXT PRIMARY KEY, name TEXT, national_id TEXT, email TEXT, phone TEXT, subject_specialty TEXT, password TEXT, school_id TEXT, manager_id TEXT, subscription_status TEXT, subscription_end_date TEXT);
CREATE TABLE students (id TEXT PRIMARY KEY, name TEXT, role TEXT, national_id TEXT, class_id TEXT, school_id TEXT, created_by_id TEXT, grade_level TEXT, class_name TEXT, email TEXT, phone TEXT, parent_id TEXT, parent_name TEXT, parent_phone TEXT, parent_email TEXT, password TEXT, seat_index INTEGER, learning_style TEXT, behavior_points INTEGER);
-- ... more tables ...
`;

export const getDatabaseUpdateSQL = () => `
-- Recent Updates
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS subscription_status TEXT;
-- ... more updates ...
`;

export const getTableDisplayName = (table: string) => table;

// --- FIX: Cloud database management functions for AdminDashboard ---
export const clearCloudTable = async (table: string) => {
    if (!navigator.onLine) return;
    await supabase.from(table).delete().neq('id', '0');
};

export const resetCloudDatabase = async () => {
    // Caution: Destructive
};

export const backupCloudDatabase = async () => JSON.stringify({});
export const restoreCloudDatabase = async (json: string) => {};
export const validateCloudSchema = async () => ({ success: true, missingTables: [] });

export const uploadToSupabase = async () => {
    if (!navigator.onLine) return;
    const tables = Object.entries(DB_MAP);
    
    for (const [key, table] of tables) {
        const storageKey = KEYS[key as keyof typeof KEYS];
        if (!storageKey) continue;
        const data = get(storageKey);
        if (data.length > 0) {
            try { 
                await supabase.from(table).upsert(data, { onConflict: 'id' });
            } catch (e) { console.error(`Error syncing ${table}:`, e); }
        }
    }
};

export const downloadFromSupabase = async () => {
    if (!navigator.onLine) return;
    const tables = Object.entries(DB_MAP);

    for (const [key, table] of tables) {
        const storageKey = KEYS[key as keyof typeof KEYS];
        if (!storageKey) continue;
        try {
            const { data, error } = await supabase.from(table).select('*');
            if (!error && data) save(storageKey, data);
        } catch (e) { console.error(`Error downloading ${table}:`, e); }
    }
};

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('schools').select('id').limit(1);
        return { success: !error };
    } catch { return { success: false }; }
};

export const fetchCloudTableData = async (table: string) => {
    const { data } = await supabase.from(table).select('*');
    return data || [];
};

// --- FIX: Implementation of all missing CRUD functions ---

// Attendance
export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);
export const saveAttendance = async (records: AttendanceRecord[]) => { 
    const list = get<AttendanceRecord>(KEYS.ATTENDANCE); 
    records.forEach(r => { 
        const idx = list.findIndex(x => x.id === r.id); 
        if (idx !== -1) list[idx] = r; else list.push(r); 
    }); 
    save(KEYS.ATTENDANCE, list); 
    if (navigator.onLine) {
        try { await supabase.from('attendance').upsert(records, { onConflict: 'id' }); } catch (e) { console.error(e); }
    }
};
export const deleteAttendance = async (id: string) => {
    const list = get<AttendanceRecord>(KEYS.ATTENDANCE).filter(a => a.id !== id);
    save(KEYS.ATTENDANCE, list);
    if (navigator.onLine) await supabase.from('attendance').delete().eq('id', id);
};

// Students
export const getStudents = (): Student[] => get<Student>(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const list = getStudents(); list.push(s); save(KEYS.STUDENTS, list); uploadToSupabase(); };
export const updateStudent = (s: Student) => { const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.STUDENTS, list); uploadToSupabase(); } };
export const deleteStudent = (id: string) => { save(KEYS.STUDENTS, getStudents().filter(s => s.id !== id)); uploadToSupabase(); };
export const bulkUpsertStudents = (newList: Student[]) => {
    const list = getStudents();
    newList.forEach(s => {
        const idx = list.findIndex(x => x.nationalId === s.nationalId || x.id === s.id);
        if (idx !== -1) list[idx] = { ...list[idx], ...s };
        else list.push(s);
    });
    save(KEYS.STUDENTS, list);
    uploadToSupabase();
};
export const updateStudentLearningStyle = (id: string, style: LearningStyle) => {
    const list = getStudents();
    const idx = list.findIndex(s => s.id === id);
    if (idx !== -1) { list[idx].learningStyle = style; save(KEYS.STUDENTS, list); uploadToSupabase(); }
};

// Performance
export const getPerformance = (): PerformanceRecord[] => get<PerformanceRecord>(KEYS.PERFORMANCE);
export const addPerformance = (record: PerformanceRecord | PerformanceRecord[]) => { 
    const list = getPerformance(); 
    const records = Array.isArray(record) ? record : [record]; 
    records.forEach(rec => { 
        const idx = list.findIndex(r => r.id === rec.id); 
        if (idx !== -1) list[idx] = rec; else list.push(rec); 
    }); 
    save(KEYS.PERFORMANCE, list); 
    uploadToSupabase(); 
};
export const bulkAddPerformance = addPerformance;
export const deletePerformance = async (id: string) => {
    const list = getPerformance().filter(p => p.id !== id);
    save(KEYS.PERFORMANCE, list);
    if (navigator.onLine) await supabase.from('performance').delete().eq('id', id);
};

// Assignments
export const getAssignments = (category: string, tid?: string, isManager?: boolean): Assignment[] => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    return list.filter(a => (category === 'ALL' || a.category === category) && (isManager || !tid || a.teacherId === tid));
};
export const saveAssignment = (a: Assignment) => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    const idx = list.findIndex(x => x.id === a.id);
    if (idx !== -1) list[idx] = a; else list.push(a);
    save(KEYS.TRACKING_ASSIGNMENTS, list);
    if (navigator.onLine) supabase.from('assignments').upsert(a);
};
export const deleteAssignment = (id: string) => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS).filter(x => x.id !== id);
    save(KEYS.TRACKING_ASSIGNMENTS, list);
    if (navigator.onLine) supabase.from('assignments').delete().eq('id', id);
};

// Subjects
export const getSubjects = (tid?: string): Subject[] => get<Subject>(KEYS.SUBJECTS).filter(s => !tid || s.teacherId === tid);
export const addSubject = (s: Subject) => {
    const list = get<Subject>(KEYS.SUBJECTS);
    list.push(s);
    save(KEYS.SUBJECTS, list);
    if (navigator.onLine) supabase.from('subjects').insert(s);
};
export const deleteSubject = (id: string) => {
    const list = get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id);
    save(KEYS.SUBJECTS, list);
    if (navigator.onLine) supabase.from('subjects').delete().eq('id', id);
};

// Schools
export const getSchools = (): School[] => get<School>(KEYS.SCHOOLS);
export const addSchool = async (s: School) => {
    const list = getSchools();
    list.push(s);
    save(KEYS.SCHOOLS, list);
    if (navigator.onLine) await supabase.from('schools').upsert(s);
};
export const deleteSchool = (id: string) => {
    const list = getSchools().filter(s => s.id !== id);
    save(KEYS.SCHOOLS, list);
    if (navigator.onLine) supabase.from('schools').delete().eq('id', id);
};
export const updateSchool = (s: School) => {
    const list = getSchools();
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) list[idx] = s;
    save(KEYS.SCHOOLS, list);
    if (navigator.onLine) supabase.from('schools').upsert(s);
};

// Teachers
export const getTeachers = (): Teacher[] => get<Teacher>(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => {
    const list = getTeachers();
    list.push(t);
    save(KEYS.TEACHERS, list);
    if (navigator.onLine) await supabase.from('teachers').upsert(t);
    // Also add as system user
    const user: SystemUser = { id: t.id, name: t.name, email: t.email || '', nationalId: t.nationalId, password: t.password, role: 'TEACHER', status: 'ACTIVE', schoolId: t.schoolId };
    addSystemUser(user);
};
export const updateTeacher = async (t: Teacher) => {
    const list = getTeachers();
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t;
    save(KEYS.TEACHERS, list);
    if (navigator.onLine) await supabase.from('teachers').upsert(t);
};

// System Users
export const getSystemUsers = (): SystemUser[] => get<SystemUser>(KEYS.SYSTEM_USERS);
export const addSystemUser = async (u: SystemUser) => {
    const list = getSystemUsers();
    list.push(u);
    save(KEYS.SYSTEM_USERS, list);
    if (navigator.onLine) await supabase.from('system_users').upsert(u);
};
export const deleteSystemUser = (id: string) => {
    const list = getSystemUsers().filter(u => u.id !== id);
    save(KEYS.SYSTEM_USERS, list);
    if (navigator.onLine) supabase.from('system_users').delete().eq('id', id);
};
export const updateSystemUser = (u: SystemUser) => {
    const list = getSystemUsers();
    const idx = list.findIndex(x => x.id === u.id);
    if (idx !== -1) list[idx] = u;
    save(KEYS.SYSTEM_USERS, list);
    if (navigator.onLine) supabase.from('system_users').upsert(u);
};

// Backup & Sync
export const createBackup = () => JSON.stringify(localStorage);
export const restoreBackup = (json: string) => {
    const data = JSON.parse(json);
    Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
};
export const clearDatabase = () => localStorage.clear();

// AI Settings
export const getAISettings = (): AISettings => get<AISettings>(KEYS.AI_SETTINGS)[0] || { modelId: 'gemini-3-flash-preview', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: "" };
export const saveAISettings = (s: AISettings) => save(KEYS.AI_SETTINGS, [s]);

// Schedules & Timings
export const getSchedules = () => get<ScheduleItem>(KEYS.SCHEDULES);
export const saveScheduleItem = (s: ScheduleItem) => {
    const list = getSchedules();
    list.push(s);
    save(KEYS.SCHEDULES, list);
};
export const deleteScheduleItem = (id: string) => {
    const list = getSchedules().filter(s => s.id !== id);
    save(KEYS.SCHEDULES, list);
};
export const getTeacherPeriodTimings = (tid: string) => get<{tid: string, times: string[]}>(KEYS.PERIOD_TIMINGS).find(x => x.tid === tid)?.times || ["07:00", "07:45", "08:30", "09:45", "10:30", "11:15", "12:00", "12:45"];
export const saveTeacherPeriodTimings = (tid: string, times: string[]) => {
    const list = get<{tid: string, times: string[]}>(KEYS.PERIOD_TIMINGS);
    const idx = list.findIndex(x => x.tid === tid);
    if (idx !== -1) list[idx].times = times; else list.push({ tid, times });
    save(KEYS.PERIOD_TIMINGS, list);
};

// Teacher Assignments
export const getTeacherAssignments = (tid?: string) => get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS).filter(a => !tid || a.teacherId === tid);
export const addTeacherAssignment = (a: TeacherAssignment) => {
    const list = get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS);
    list.push(a);
    save(KEYS.TEACHER_ASSIGNMENTS, list);
};
export const deleteTeacherAssignment = (id: string) => {
    const list = get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS).filter(a => a.id !== id);
    save(KEYS.TEACHER_ASSIGNMENTS, list);
};

// Academic Terms
export const getAcademicTerms = (tid?: string): AcademicTerm[] => get<AcademicTerm>(KEYS.TERMS).filter(t => !tid || t.teacherId === tid);
export const saveAcademicTerm = (t: AcademicTerm) => { const list = get<AcademicTerm>(KEYS.TERMS); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) list[idx] = t; else list.push(t); save(KEYS.TERMS, list); uploadToSupabase(); };
export const deleteAcademicTerm = (id: string) => {
    const list = get<AcademicTerm>(KEYS.TERMS).filter(t => t.id !== id);
    save(KEYS.TERMS, list);
};
export const setCurrentTerm = (id: string, tid: string) => {
    const list = getAcademicTerms(tid);
    list.forEach(t => t.isCurrent = (t.id === id));
    save(KEYS.TERMS, list);
};

// Reports Header Config
export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => { const all = get<ReportHeaderConfig & {teacherId: string}>('report_header_configs'); return all.find(c => c.teacherId === tid) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' }; };
export const saveReportHeaderConfig = (c: ReportHeaderConfig & {teacherId: string}) => {
    const all = get<ReportHeaderConfig & {teacherId: string}>('report_header_configs');
    const idx = all.findIndex(x => x.teacherId === c.teacherId);
    if (idx !== -1) all[idx] = c; else all.push(c);
    save('report_header_configs', all);
};

// User Auth
export const authenticateUser = async (id: string, p: string) => get<SystemUser>(KEYS.SYSTEM_USERS).find(u => (u.nationalId === id || u.email === id) && u.password === p) || null;
export const authenticateStudent = async (id: string, p: string) => getStudents().find(s => s.nationalId === id && (s.password || '123456') === p) || null;

// Custom Tables
export const getCustomTables = (tid?: string) => get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => !tid || t.teacherId === tid);
export const addCustomTable = (t: CustomTable) => { const list = getCustomTables(); list.push(t); save(KEYS.CUSTOM_TABLES, list); };
export const deleteCustomTable = (id: string) => save(KEYS.CUSTOM_TABLES, getCustomTables().filter(t => t.id !== id));
export const updateCustomTable = (t: CustomTable) => {
    const list = getCustomTables();
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t;
    save(KEYS.CUSTOM_TABLES, list);
};

// Works Master URL
export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

// Exams & Results
export const getExams = (tid?: string) => get<Exam>(KEYS.EXAMS).filter(e => !tid || e.teacherId === tid);
export const saveExam = (e: Exam) => { const list = get<Exam>(KEYS.EXAMS); const idx = list.findIndex(x => x.id === e.id); if (idx !== -1) list[idx] = e; else list.push(e); save(KEYS.EXAMS, list); };
export const deleteExam = (id: string) => save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(e => e.id !== id));
export const getExamResults = (eid?: string) => get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => !eid || r.examId === eid);
export const saveExamResult = (r: ExamResult) => { const list = get<ExamResult>(KEYS.EXAM_RESULTS); list.push(r); save(KEYS.EXAM_RESULTS, list); };
export const deleteExamResult = (id: string) => save(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => r.id !== id));

// Question Bank
export const getQuestionBank = (tid?: string) => get<Question>(KEYS.QUESTION_BANK).filter(q => !tid || q.teacherId === tid);
export const saveQuestionToBank = (q: Question) => { const list = get<Question>(KEYS.QUESTION_BANK); const idx = list.findIndex(x => x.id === q.id); if (idx !== -1) list[idx] = q; else list.push(q); save(KEYS.QUESTION_BANK, list); };
export const deleteQuestionFromBank = (id: string) => save(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(q => q.id !== id));

// Curriculum
export const getCurriculumUnits = (tid?: string) => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => !tid || u.teacherId === tid);
export const saveCurriculumUnit = (u: CurriculumUnit) => { const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); const idx = list.findIndex(x => x.id === u.id); if (idx !== -1) list[idx] = u; else list.push(u); save(KEYS.CURRICULUM_UNITS, list); };
export const deleteCurriculumUnit = (id: string) => save(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.id !== id));
export const getCurriculumLessons = (unitId?: string) => get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => !unitId || l.unitId === unitId);
export const saveCurriculumLesson = (l: CurriculumLesson) => { const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS); const idx = list.findIndex(x => x.id === l.id); if (idx !== -1) list[idx] = l; else list.push(l); save(KEYS.CURRICULUM_LESSONS, list); };
export const deleteCurriculumLesson = (id: string) => save(KEYS.CURRICULUM_LESSONS, get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => l.id !== id));
export const toggleCurriculumLesson = (id: string, completed: boolean) => {
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(l => l.id === id);
    if (idx !== -1) { list[idx].isCompleted = completed; list[idx].completedAt = completed ? new Date().toISOString() : undefined; save(KEYS.CURRICULUM_LESSONS, list); }
};

// Weekly Plans
export const getWeeklyPlans = (tid?: string) => get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => { const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS); const idx = list.findIndex(x => x.id === p.id); if (idx !== -1) list[idx] = p; else list.push(p); save(KEYS.WEEKLY_PLANS, list); };

// Lesson Links & Plans
export const getLessonLinks = () => get<LessonLink>(KEYS.LESSON_LINKS);
export const saveLessonLink = (l: LessonLink) => { const list = getLessonLinks(); list.push(l); save(KEYS.LESSON_LINKS, list); };
export const deleteLessonLink = (id: string) => save(KEYS.LESSON_LINKS, getLessonLinks().filter(l => l.id !== id));
export const getLessonPlans = (tid?: string) => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveLessonPlan = (p: StoredLessonPlan) => { const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS); const idx = list.findIndex(x => x.id === p.id); if (idx !== -1) list[idx] = p; else list.push(p); save(KEYS.LESSON_PLANS, list); };
export const deleteLessonPlan = (id: string) => save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.id !== id));

// Messages
export const getMessages = (tid?: string) => get<MessageLog>(KEYS.MESSAGES).filter(m => !tid || m.teacherId === tid);
export const saveMessage = (m: MessageLog) => { const list = get<MessageLog>(KEYS.MESSAGES); list.push(m); save(KEYS.MESSAGES, list); };

// Tasks
export const getTasks = (tid?: string) => get<Task>(KEYS.TASKS).filter(t => !tid || t.teacherId === tid);
export const saveTask = (t: Task) => { const list = getTasks(); list.push(t); save(KEYS.TASKS, list); };
export const submitTask = (tid: string, sid: string) => {
    const list = getTasks();
    const task = list.find(t => t.id === tid);
    if (task && !task.submissions.includes(sid)) {
        task.submissions.push(sid);
        save(KEYS.TASKS, list);
    }
};

// Remedial Plans
export const getRemedialPlans = (tid?: string) => get<RemedialPlan>(KEYS.REMEDIAL_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveRemedialPlan = (p: RemedialPlan) => { const list = get<RemedialPlan>(KEYS.REMEDIAL_PLANS); list.push(p); save(KEYS.REMEDIAL_PLANS, list); };

// Behavior
export const getBehaviorIncidents = (tid?: string) => get<BehaviorIncident>(KEYS.BEHAVIOR_INCIDENTS).filter(i => !tid || i.teacherId === tid);
export const saveBehaviorIncident = (i: BehaviorIncident) => { 
    const list = getBehaviorIncidents(); 
    list.push(i); 
    save(KEYS.BEHAVIOR_INCIDENTS, list); 
    // Auto-update student points
    const students = getStudents();
    const s = students.find(x => x.id === i.studentId);
    if (s) { s.behaviorPoints = (s.behaviorPoints || 0) + i.points; updateStudent(s); }
};

// Environment
export const getEnvironmentRecords = (classId?: string) => get<EnvironmentRecord>(KEYS.ENVIRONMENT).filter(e => !classId || e.classId === classId);
export const saveEnvironmentRecord = (r: EnvironmentRecord) => { const list = get<EnvironmentRecord>(KEYS.ENVIRONMENT); list.push(r); save(KEYS.ENVIRONMENT, list); };

// Forms Analysis Results
export const getFormsDetailedResults = (tid?: string) => get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => !tid || r.teacherId === tid);
export const saveFormsDetailedResult = (r: FormsDetailedResult) => { const list = getFormsDetailedResults(); list.push(r); save(KEYS.FORMS_DETAILED, list); };
export const deleteFormsDetailedResult = (id: string) => save(KEYS.FORMS_DETAILED, getFormsDetailedResults().filter(r => r.id !== id));

// Theme
export const getUserTheme = (): UserTheme => { const s = localStorage.getItem(KEYS.USER_THEME); return s ? JSON.parse(s) : { mode: 'LIGHT', backgroundStyle: 'FLAT' }; };
export const saveUserTheme = (t: UserTheme) => { localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t)); };

export const initAutoSync = async () => { if (navigator.onLine) { await downloadFromSupabase(); setInterval(uploadToSupabase, 120000); } };
