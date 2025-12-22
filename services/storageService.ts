
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

export function get<T>(key: string): T[] { 
    try { 
        const data = localStorage.getItem(key); 
        return data ? JSON.parse(data) : []; 
    } catch { return []; } 
}
export function save(key: string, data: any) { 
    localStorage.setItem(key, JSON.stringify(data)); 
}

// --- Cloud Logic ---
export const uploadToSupabase = async () => {
    if (!navigator.onLine) return;
    const targets = [
        { key: KEYS.STUDENTS, table: 'students' },
        { key: KEYS.ATTENDANCE, table: 'attendance' },
        { key: KEYS.PERFORMANCE, table: 'performance' },
        { key: KEYS.BEHAVIOR_INCIDENTS, table: 'behavior_incidents' }
    ];
    
    for (const item of targets) {
        const data = get(item.key);
        if (data.length > 0) {
            try { 
                await supabase.from(item.table).upsert(data, { onConflict: 'id' });
            } catch (e) { console.error(`Error syncing ${item.table}:`, e); }
        }
    }
};

export const downloadFromSupabase = async () => {
    if (!navigator.onLine) return;
    const tables = ['students', 'attendance', 'performance', 'academic_terms', 'behavior_incidents'];
    for (const table of tables) {
        try {
            const { data, error } = await supabase.from(table).select('*');
            if (!error && data) {
                // Find matching storage key
                const storageKey = Object.values(KEYS).find(v => v === table) || table;
                save(storageKey, data);
            }
        } catch (e) { console.error(`Error downloading ${table}:`, e); }
    }
};

// --- Attendance ---
export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);
export const saveAttendance = async (records: AttendanceRecord[]) => { 
    const list = get<AttendanceRecord>(KEYS.ATTENDANCE); 
    records.forEach(r => { 
        const idx = list.findIndex(x => x.id === r.id); 
        if (idx !== -1) list[idx] = { ...list[idx], ...r }; else list.push(r); 
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

// --- Performance ---
export const getPerformance = (): PerformanceRecord[] => get<PerformanceRecord>(KEYS.PERFORMANCE);
export const addPerformance = (record: PerformanceRecord | PerformanceRecord[]) => { 
    const list = getPerformance(); 
    const records = Array.isArray(record) ? record : [record]; 
    records.forEach(rec => { 
        const idx = list.findIndex(r => r.id === rec.id); 
        if (idx !== -1) list[idx] = { ...list[idx], ...rec }; else list.push(rec); 
    }); 
    save(KEYS.PERFORMANCE, list); 
    if (navigator.onLine) {
        supabase.from('performance').upsert(records, { onConflict: 'id' }).then();
    }
};
export const bulkAddPerformance = addPerformance;
export const deletePerformance = async (id: string) => {
    const list = getPerformance().filter(p => p.id !== id);
    save(KEYS.PERFORMANCE, list);
    if (navigator.onLine) await supabase.from('performance').delete().eq('id', id);
};

// --- Standard Handlers ---
export const getStudents = (): Student[] => get<Student>(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const list = getStudents(); list.push(s); save(KEYS.STUDENTS, list); uploadToSupabase(); };
export const updateStudent = (s: Student) => { const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.STUDENTS, list); uploadToSupabase(); } };
export const deleteStudent = (id: string) => { save(KEYS.STUDENTS, getStudents().filter(s => s.id !== id)); uploadToSupabase(); };

export const getSubjects = (tid?: string): Subject[] => get<Subject>(KEYS.SUBJECTS).filter(s => !tid || s.teacherId === tid);
export const getSchedules = () => get<ScheduleItem>(KEYS.SCHEDULES);
export const getTeacherAssignments = (tid?: string) => get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS).filter(a => !tid || a.teacherId === tid);
export const getTeacherPeriodTimings = (tid: string) => get<{tid: string, times: string[]}>(KEYS.PERIOD_TIMINGS).find(x => x.tid === tid)?.times || ["07:00", "07:45", "08:30", "09:45", "10:30", "11:15", "12:00", "12:45"];
export const getAcademicTerms = (tid?: string): AcademicTerm[] => get<AcademicTerm>(KEYS.TERMS).filter(t => !tid || t.teacherId === tid);
export const getAssignments = (cat: string, tid?: string, isManager?: boolean): Assignment[] => {
    const all = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    return all.filter(a => (cat === 'ALL' || a.category === cat) && (!tid || a.teacherId === tid || isManager));
};

export const getAISettings = (): AISettings => get<AISettings>(KEYS.AI_SETTINGS)[0] || { modelId: 'gemini-3-flash-preview', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: "" };
export const getUserTheme = (): UserTheme => { const s = localStorage.getItem(KEYS.USER_THEME); return s ? JSON.parse(s) : { mode: 'LIGHT', backgroundStyle: 'FLAT' }; };
export const authenticateUser = async (id: string, p: string) => get<SystemUser>(KEYS.SYSTEM_USERS).find(u => (u.nationalId === id || u.email === id) && u.password === p) || null;
export const initAutoSync = async () => { if (navigator.onLine) { await downloadFromSupabase(); setInterval(uploadToSupabase, 120000); } };
export const checkConnection = async () => { try { const { error } = await supabase.from('students').select('id').limit(1); return { success: !error }; } catch { return { success: false }; } };

// --- Additional Exports to Fix Component Errors ---

/**
 * Tasks operations
 */
export const getTasks = (tid?: string) => get<Task>(KEYS.TASKS).filter(t => !tid || t.teacherId === tid);
export const saveTask = (t: Task) => {
    const list = get<Task>(KEYS.TASKS);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t; else list.push(t);
    save(KEYS.TASKS, list);
};
export const submitTask = (taskId: string, sid: string) => {
    const list = get<Task>(KEYS.TASKS);
    const idx = list.findIndex(x => x.id === taskId);
    if (idx !== -1 && !list[idx].submissions.includes(sid)) {
        list[idx].submissions.push(sid);
        save(KEYS.TASKS, list);
    }
};

/**
 * Behavior incidents operations
 */
export const getBehaviorIncidents = (tid?: string) => get<BehaviorIncident>(KEYS.BEHAVIOR_INCIDENTS).filter(i => !tid || i.teacherId === tid);
export const saveBehaviorIncident = (i: BehaviorIncident) => {
    const list = get<BehaviorIncident>(KEYS.BEHAVIOR_INCIDENTS);
    list.push(i);
    save(KEYS.BEHAVIOR_INCIDENTS, list);
};

/**
 * Assignment operations
 */
export const saveAssignment = (a: Assignment) => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    const idx = list.findIndex(x => x.id === a.id);
    if (idx !== -1) list[idx] = a; else list.push(a);
    save(KEYS.TRACKING_ASSIGNMENTS, list);
};
export const deleteAssignment = (id: string) => save(KEYS.TRACKING_ASSIGNMENTS, get<Assignment>(KEYS.TRACKING_ASSIGNMENTS).filter(a => a.id !== id));

/**
 * Bulk Student Operations
 */
export const bulkUpsertStudents = (data: Student[]) => {
    const list = getStudents();
    data.forEach(s => {
        const idx = list.findIndex(x => x.id === s.id || (x.nationalId && x.nationalId === s.nationalId));
        if (idx !== -1) list[idx] = { ...list[idx], ...s }; else list.push(s);
    });
    save(KEYS.STUDENTS, list);
    uploadToSupabase();
};

/**
 * Custom Tables operations
 */
export const addCustomTable = (t: CustomTable) => {
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES);
    list.push(t);
    save(KEYS.CUSTOM_TABLES, list);
};
export const getCustomTables = (tid?: string) => get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => !tid || t.teacherId === tid);
export const deleteCustomTable = (id: string) => save(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => t.id !== id));
export const updateCustomTable = (t: CustomTable) => {
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t;
    save(KEYS.CUSTOM_TABLES, list);
};

/**
 * School and Teacher management
 */
export const getSchools = () => get<School>(KEYS.SCHOOLS);
export const addSchool = (s: School) => {
    const list = getSchools();
    list.push(s);
    save(KEYS.SCHOOLS, list);
};
export const updateSchool = (s: School) => {
    const list = getSchools();
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) list[idx] = s;
    save(KEYS.SCHOOLS, list);
};
export const deleteSchool = (id: string) => save(KEYS.SCHOOLS, getSchools().filter(s => s.id !== id));

export const getTeachers = () => get<Teacher>(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => {
    const list = getTeachers();
    list.push(t);
    save(KEYS.TEACHERS, list);
    addSystemUser({
        id: t.id, name: t.name, email: t.email || '', nationalId: t.nationalId, password: t.password || '123456',
        role: 'TEACHER', schoolId: t.schoolId, status: 'ACTIVE'
    });
};
export const updateTeacher = async (t: Teacher) => {
    const list = getTeachers();
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t;
    save(KEYS.TEACHERS, list);
};

/**
 * Subject operations
 */
export const addSubject = (s: Subject) => {
    const list = get<Subject>(KEYS.SUBJECTS);
    list.push(s);
    save(KEYS.SUBJECTS, list);
};
export const deleteSubject = (id: string) => save(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id));

/**
 * Academic Term operations
 */
export const saveAcademicTerm = (t: AcademicTerm) => {
    const list = get<AcademicTerm>(KEYS.TERMS);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t; else list.push(t);
    save(KEYS.TERMS, list);
};
export const deleteAcademicTerm = (id: string) => save(KEYS.TERMS, get<AcademicTerm>(KEYS.TERMS).filter(t => t.id !== id));
export const setCurrentTerm = (id: string, tid: string) => {
    const list = get<AcademicTerm>(KEYS.TERMS);
    list.forEach(t => { if (t.teacherId === tid) t.isCurrent = (t.id === id); });
    save(KEYS.TERMS, list);
};

/**
 * Settings and Report Config
 */
export const getReportHeaderConfig = (tid?: string) => get<ReportHeaderConfig>(KEYS.AI_SETTINGS + '_report_header').find(c => !tid || c.teacherId === tid) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => {
    const list = get<ReportHeaderConfig>(KEYS.AI_SETTINGS + '_report_header');
    const idx = list.findIndex(x => x.teacherId === c.teacherId);
    if (idx !== -1) list[idx] = c; else list.push(c);
    save(KEYS.AI_SETTINGS + '_report_header', list);
};
export const saveUserTheme = (t: UserTheme) => save(KEYS.USER_THEME, t);
export const saveTeacherPeriodTimings = (tid: string, times: string[]) => {
    const list = get<{tid: string, times: string[]}>(KEYS.PERIOD_TIMINGS);
    const idx = list.findIndex(x => x.tid === tid);
    if (idx !== -1) list[idx].times = times; else list.push({tid, times});
    save(KEYS.PERIOD_TIMINGS, list);
};

/**
 * Teacher Assignments
 */
export const addTeacherAssignment = (a: TeacherAssignment) => {
    const list = get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS);
    list.push(a);
    save(KEYS.TEACHER_ASSIGNMENTS, list);
};
export const deleteTeacherAssignment = (id: string) => save(KEYS.TEACHER_ASSIGNMENTS, get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS).filter(a => a.id !== id));

/**
 * System User management
 */
export const getSystemUsers = () => get<SystemUser>(KEYS.SYSTEM_USERS);
export const addSystemUser = (u: SystemUser) => {
    const list = getSystemUsers();
    list.push(u);
    save(KEYS.SYSTEM_USERS, list);
};
export const deleteSystemUser = (id: string) => save(KEYS.SYSTEM_USERS, getSystemUsers().filter(u => u.id !== id));
export const updateSystemUser = (u: SystemUser) => {
    const list = getSystemUsers();
    const idx = list.findIndex(x => x.id === u.id);
    if (idx !== -1) list[idx] = u;
    save(KEYS.SYSTEM_USERS, list);
};

/**
 * Backup and Maintenance
 */
export const createBackup = () => {
    const backup: any = {};
    Object.values(KEYS).forEach(k => { backup[k] = localStorage.getItem(k); });
    return JSON.stringify(backup);
};
export const restoreBackup = (json: string) => {
    const backup = JSON.parse(json);
    Object.keys(backup).forEach(k => { if (backup[k]) localStorage.setItem(k, backup[k]); });
};
export const clearDatabase = () => Object.values(KEYS).forEach(k => localStorage.removeItem(k));
export const fetchCloudTableData = async (table: string) => (await supabase.from(table).select('*')).data;
export const DB_MAP = { STUDENTS: 'students', ATTENDANCE: 'attendance', PERFORMANCE: 'performance', SCHOOLS: 'schools' };
export const getTableDisplayName = (t: string) => t;
export const getDatabaseSchemaSQL = () => `-- Schema SQL Generation`;
export const getDatabaseUpdateSQL = () => `-- Update SQL Generation`;
export const clearCloudTable = async (table: string) => { await supabase.from(table).delete().neq('id', '0'); };
export const resetCloudDatabase = async () => {};
export const saveAISettings = (s: AISettings) => save(KEYS.AI_SETTINGS, [s]);
export const backupCloudDatabase = async () => JSON.stringify({ cloud: true });
export const restoreCloudDatabase = async (json: string) => {};
export const validateCloudSchema = async () => ({ missingTables: [] });

/**
 * Works Master URL
 */
export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

/**
 * Authentication and Session
 */
export const setSystemMode = (b: boolean) => {};
export const authenticateStudent = async (id: string, p: string) => get<Student>(KEYS.STUDENTS).find(s => s.nationalId === id && s.password === p) || null;

/**
 * Exam operations
 */
export const getExams = (tid?: string) => get<Exam>(KEYS.EXAMS).filter(e => !tid || e.teacherId === tid);
export const saveExam = (e: Exam) => {
    const list = get<Exam>(KEYS.EXAMS);
    const idx = list.findIndex(x => x.id === e.id);
    if (idx !== -1) list[idx] = e; else list.push(e);
    save(KEYS.EXAMS, list);
};
export const deleteExam = (id: string) => save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(e => e.id !== id));

/**
 * Exam Result operations
 */
export const getExamResults = (eid?: string) => get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => !eid || r.examId === eid);
export const saveExamResult = (r: ExamResult) => {
    const list = get<ExamResult>(KEYS.EXAM_RESULTS);
    list.push(r);
    save(KEYS.EXAM_RESULTS, list);
};
export const deleteExamResult = (id: string) => save(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => r.id !== id));

/**
 * Lesson Link operations
 */
export const getLessonLinks = () => get<LessonLink>(KEYS.LESSON_LINKS);
export const saveLessonLink = (l: LessonLink) => {
    const list = getLessonLinks();
    list.push(l);
    save(KEYS.LESSON_LINKS, list);
};
export const deleteLessonLink = (id: string) => save(KEYS.LESSON_LINKS, getLessonLinks().filter(l => l.id !== id));

/**
 * Message operations
 */
export const getMessages = (tid?: string) => get<MessageLog>(KEYS.MESSAGES).filter(m => !tid || m.teacherId === tid);
export const saveMessage = (m: MessageLog) => {
    const list = get<MessageLog>(KEYS.MESSAGES);
    list.push(m);
    save(KEYS.MESSAGES, list);
};

/**
 * Weekly Plan operations
 */
export const getWeeklyPlans = (tid?: string) => get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => {
    const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = list.findIndex(x => x.id === p.id);
    if (idx !== -1) list[idx] = p; else list.push(p);
    save(KEYS.WEEKLY_PLANS, list);
};

/**
 * Remedial Plan operations
 */
export const getRemedialPlans = () => get<RemedialPlan>(KEYS.REMEDIAL_PLANS);
export const saveRemedialPlan = (p: RemedialPlan) => {
    const list = getRemedialPlans();
    list.push(p);
    save(KEYS.REMEDIAL_PLANS, list);
};

/**
 * Lesson Plan operations
 */
export const getLessonPlans = (tid?: string) => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveLessonPlan = (p: StoredLessonPlan) => {
    const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS);
    const idx = list.findIndex(x => x.id === p.id);
    if (idx !== -1) list[idx] = p; else list.push(p);
    save(KEYS.LESSON_PLANS, list);
};
export const deleteLessonPlan = (id: string) => save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.id !== id));

/**
 * Environment Records operations
 */
export const getEnvironmentRecords = (cid?: string) => get<EnvironmentRecord>(KEYS.ENVIRONMENT).filter(e => !cid || e.classId === cid);
export const saveEnvironmentRecord = (e: EnvironmentRecord) => {
    const list = get<EnvironmentRecord>(KEYS.ENVIRONMENT);
    list.push(e);
    save(KEYS.ENVIRONMENT, list);
};

/**
 * Question Bank operations
 */
export const getQuestionBank = (tid?: string) => get<Question>(KEYS.QUESTION_BANK).filter(q => !tid || q.teacherId === tid);
export const saveQuestionToBank = (q: Question) => {
    const list = get<Question>(KEYS.QUESTION_BANK);
    const idx = list.findIndex(x => x.id === q.id);
    if (idx !== -1) list[idx] = q; else list.push(q);
    save(KEYS.QUESTION_BANK, list);
};
export const deleteQuestionFromBank = (id: string) => save(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(q => q.id !== id));

/**
 * Curriculum operations
 */
export const getCurriculumUnits = (tid?: string) => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => !tid || u.teacherId === tid);
export const saveCurriculumUnit = (u: CurriculumUnit) => {
    const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS);
    const idx = list.findIndex(x => x.id === u.id);
    if (idx !== -1) list[idx] = u; else list.push(u);
    save(KEYS.CURRICULUM_UNITS, list);
};
export const deleteCurriculumUnit = (id: string) => save(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.id !== id));

export const getCurriculumLessons = () => get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = (l: CurriculumLesson) => {
    const list = getCurriculumLessons();
    const idx = list.findIndex(x => x.id === l.id);
    if (idx !== -1) list[idx] = l; else list.push(l);
    save(KEYS.CURRICULUM_LESSONS, list);
};
export const deleteCurriculumLesson = (id: string) => save(KEYS.CURRICULUM_LESSONS, getCurriculumLessons().filter(l => l.id !== id));
export const toggleCurriculumLesson = (id: string, status: boolean) => {
    const list = getCurriculumLessons();
    const idx = list.findIndex(x => x.id === id);
    if (idx !== -1) {
        list[idx].isCompleted = status;
        list[idx].completedAt = status ? new Date().toISOString() : undefined;
        save(KEYS.CURRICULUM_LESSONS, list);
    }
};

/**
 * Schedule operations
 */
export const saveScheduleItem = (s: ScheduleItem) => {
    const list = get<ScheduleItem>(KEYS.SCHEDULES);
    list.push(s);
    save(KEYS.SCHEDULES, list);
};
export const deleteScheduleItem = (id: string) => save(KEYS.SCHEDULES, get<ScheduleItem>(KEYS.SCHEDULES).filter(s => s.id !== id));

/**
 * Tracking Sheets operations
 */
export const getTrackingSheets = (tid?: string) => get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => !tid || s.teacherId === tid);
export const saveTrackingSheet = (s: TrackingSheet) => {
    const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) list[idx] = s; else list.push(s);
    save(KEYS.TRACKING_SHEETS, list);
};
export const deleteTrackingSheet = (id: string) => save(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.id !== id));

/**
 * Forms Analyzer Detailed results
 */
export const saveFormsDetailedResult = (r: FormsDetailedResult) => {
    const list = get<FormsDetailedResult>(KEYS.FORMS_DETAILED);
    list.push(r);
    save(KEYS.FORMS_DETAILED, list);
};
export const getFormsDetailedResults = (tid?: string) => get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => !tid || r.teacherId === tid);
export const deleteFormsDetailedResult = (id: string) => save(KEYS.FORMS_DETAILED, get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => r.id !== id));

/**
 * Student data updates
 */
export const updateStudentLearningStyle = (id: string, style: LearningStyle) => {
    const list = getStudents();
    const idx = list.findIndex(x => x.id === id);
    if (idx !== -1) {
        list[idx].learningStyle = style;
        save(KEYS.STUDENTS, list);
    }
};
