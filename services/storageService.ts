
import { 
    Student, AttendanceRecord, PerformanceRecord, Teacher, School, 
    SystemUser, Subject, ScheduleItem, TeacherAssignment, 
    AcademicTerm, WeeklyPlanItem, LessonLink, StoredLessonPlan,
    Exam, Question, ExamResult, TrackingSheet, MessageLog,
    CurriculumUnit, CurriculumLesson, MicroConcept,
    AISettings, ReportHeaderConfig, UserTheme, Assignment,
    CustomTable
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

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
    QUESTIONS: 'question_bank',
    EXAM_RESULTS: 'exam_results',
    MESSAGES: 'messages',
    CUSTOM_TABLES: 'custom_tables',
    USER_THEME: 'user_theme',
    AI_SETTINGS: 'ai_settings',
    TRACKING_SHEETS: 'tracking_sheets'
};

export const DB_MAP = {
    STUDENTS: 'students',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    SYSTEM_USERS: 'system_users',
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    ASSIGNMENTS: 'assignments',
    TERMS: 'academic_terms',
    WEEKLY_PLANS: 'weekly_plans',
    LESSON_LINKS: 'lesson_links',
    LESSON_PLANS: 'lesson_plans',
    EXAMS: 'exams',
    QUESTIONS: 'question_bank',
    EXAM_RESULTS: 'exam_results',
    MESSAGES: 'messages',
    CUSTOM_TABLES: 'custom_tables',
    TRACKING_SHEETS: 'tracking_sheets'
};

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ONLINE' | 'OFFLINE' | 'ERROR';

// --- Core Helper Functions ---
export function get<T>(key: string): T[] {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

export function save(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
}

// --- Student Management ---
export const getStudents = (): Student[] => get<Student>(KEYS.STUDENTS);
export const addStudent = (s: Student) => {
    const list = getStudents();
    list.push(s);
    save(KEYS.STUDENTS, list);
};
export const bulkAddStudents = (students: Student[]) => {
    const list = getStudents();
    save(KEYS.STUDENTS, [...list, ...students]);
};
export const bulkUpsertStudents = (students: Student[], key: keyof Student = 'nationalId') => {
    const list = getStudents();
    students.forEach(s => {
        const idx = list.findIndex(x => x[key] === s[key]);
        if (idx !== -1) list[idx] = { ...list[idx], ...s };
        else list.push(s);
    });
    save(KEYS.STUDENTS, list);
};
export const updateStudent = (s: Student) => {
    const list = getStudents();
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) {
        list[idx] = s;
        save(KEYS.STUDENTS, list);
    }
};
export const deleteStudent = (id: string) => {
    const list = getStudents().filter(x => x.id !== id);
    save(KEYS.STUDENTS, list);
};
export const deleteAllStudents = () => {
    save(KEYS.STUDENTS, []);
};

// --- Attendance & Behavior ---
export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);
export const saveAttendance = (records: AttendanceRecord[]) => {
    const list = getAttendance();
    records.forEach(r => {
        const idx = list.findIndex(x => x.id === r.id);
        if (idx !== -1) list[idx] = r;
        else list.push(r);
    });
    save(KEYS.ATTENDANCE, list);
};
export const bulkAddAttendance = (records: AttendanceRecord[]) => saveAttendance(records);

// --- Performance ---
export const getPerformance = (): PerformanceRecord[] => get<PerformanceRecord>(KEYS.PERFORMANCE);
export const addPerformance = (record: PerformanceRecord | PerformanceRecord[]) => {
    const list = getPerformance();
    const records = Array.isArray(record) ? record : [record];
    records.forEach(rec => {
        const idx = list.findIndex(r => r.id === rec.id);
        if (idx !== -1) list[idx] = rec;
        else list.push(rec);
    });
    save(KEYS.PERFORMANCE, list);
};
export const bulkAddPerformance = (records: PerformanceRecord[]) => addPerformance(records);
export const deletePerformance = (id: string) => {
    const list = getPerformance().filter(p => p.id !== id);
    save(KEYS.PERFORMANCE, list);
};

// --- Exams ---
export const getExams = (teacherId?: string): Exam[] => {
    const all = get<Exam>(KEYS.EXAMS);
    return teacherId ? all.filter(e => e.teacherId === teacherId) : all;
};
export const saveExam = (e: Exam) => {
    const list = get<Exam>(KEYS.EXAMS);
    const idx = list.findIndex(x => x.id === e.id);
    if (idx !== -1) list[idx] = e;
    else list.push(e);
    save(KEYS.EXAMS, list);
};
export const deleteExam = (id: string) => {
    save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(e => e.id !== id));
};

// --- Exam Results ---
export const getExamResults = (examId?: string): ExamResult[] => {
    const all = get<ExamResult>(KEYS.EXAM_RESULTS);
    return examId ? all.filter(r => r.examId === examId) : all;
};
export const saveExamResult = (r: ExamResult) => {
    const list = get<ExamResult>(KEYS.EXAM_RESULTS);
    list.push(r);
    save(KEYS.EXAM_RESULTS, list);
};
export const deleteExamResult = (id: string) => {
    save(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => r.id !== id));
};

// --- Assignments ---
export const getAssignments = (type: 'ALL' | 'VISIBLE' = 'ALL', teacherId?: string, forceRefresh = false): Assignment[] => {
    const all = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    let filtered = teacherId ? all.filter(a => a.teacherId === teacherId) : all;
    if (type === 'VISIBLE') filtered = filtered.filter(a => a.isVisible);
    return filtered;
};
export const saveAssignment = (a: Assignment) => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    const idx = list.findIndex(x => x.id === a.id);
    if (idx !== -1) list[idx] = a;
    else list.push(a);
    save(KEYS.TRACKING_ASSIGNMENTS, list);
};
export const deleteAssignment = (id: string) => {
    save(KEYS.TRACKING_ASSIGNMENTS, get<Assignment>(KEYS.TRACKING_ASSIGNMENTS).filter(a => a.id !== id));
};

// --- General & System ---
export const getAcademicTerms = (teacherId?: string): AcademicTerm[] => {
    const all = get<AcademicTerm>(KEYS.TERMS);
    return teacherId ? all.filter(t => t.teacherId === teacherId) : all;
};
export const saveAcademicTerm = (t: AcademicTerm) => {
    const list = get<AcademicTerm>(KEYS.TERMS);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t;
    else list.push(t);
    save(KEYS.TERMS, list);
};
export const deleteAcademicTerm = (id: string) => {
    save(KEYS.TERMS, get<AcademicTerm>(KEYS.TERMS).filter(t => t.id !== id));
};
export const setCurrentTerm = (id: string, teacherId: string) => {
    const all = getAcademicTerms(teacherId);
    all.forEach(t => t.isCurrent = t.id === id);
    save(KEYS.TERMS, all);
};

export const getMessages = (teacherId?: string): MessageLog[] => {
    const all = get<MessageLog>(KEYS.MESSAGES);
    return teacherId ? all.filter(m => m.teacherId === teacherId) : all;
};
export const saveMessage = (m: MessageLog) => {
    const list = getMessages();
    list.push(m);
    save(KEYS.MESSAGES, list);
};

export const getLessonLinks = (): LessonLink[] => get<LessonLink>(KEYS.LESSON_LINKS);
export const saveLessonLink = (l: LessonLink) => {
    const list = getLessonLinks();
    list.push(l);
    save(KEYS.LESSON_LINKS, list);
};
export const deleteLessonLink = (id: string) => {
    save(KEYS.LESSON_LINKS, getLessonLinks().filter(l => l.id !== id));
};

export const getLessonPlans = (teacherId: string): StoredLessonPlan[] => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.teacherId === teacherId);
export const saveLessonPlan = (p: StoredLessonPlan) => {
    const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS);
    const idx = list.findIndex(x => x.id === p.id);
    if (idx !== -1) list[idx] = p;
    else list.push(p);
    save(KEYS.LESSON_PLANS, list);
};
export const deleteLessonPlan = (id: string) => {
    save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.id !== id));
};

export const getTeacherAssignments = (teacherId?: string): TeacherAssignment[] => {
    const all = get<TeacherAssignment>('teacher_class_map');
    return teacherId ? all.filter(a => a.teacherId === teacherId) : all;
};
export const addTeacherAssignment = (a: TeacherAssignment) => {
    const list = get<TeacherAssignment>('teacher_class_map');
    list.push(a);
    save('teacher_class_map', list);
};
export const deleteTeacherAssignment = (id: string) => {
    save('teacher_class_map', get<TeacherAssignment>('teacher_class_map').filter(a => a.id !== id));
};

export const getSchedules = (): ScheduleItem[] => get<ScheduleItem>(KEYS.SCHEDULES);
export const saveScheduleItem = (s: ScheduleItem) => {
    const list = getSchedules();
    list.push(s);
    save(KEYS.SCHEDULES, list);
};
export const deleteScheduleItem = (id: string) => {
    save(KEYS.SCHEDULES, getSchedules().filter(s => s.id !== id));
};

export const getWeeklyPlans = (teacherId?: string): WeeklyPlanItem[] => {
    const all = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    return teacherId ? all.filter(p => p.teacherId === teacherId) : all;
};
export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => {
    const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = list.findIndex(x => x.id === p.id);
    if (idx !== -1) list[idx] = p;
    else list.push(p);
    save(KEYS.WEEKLY_PLANS, list);
};

export const getSubjects = (teacherId?: string): Subject[] => {
    const all = get<Subject>(KEYS.SUBJECTS);
    return teacherId ? all.filter(s => s.teacherId === teacherId) : all;
};
export const addSubject = (s: Subject) => {
    const list = get<Subject>(KEYS.SUBJECTS);
    list.push(s);
    save(KEYS.SUBJECTS, list);
};
export const deleteSubject = (id: string) => {
    save(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id));
};

export const getUserTheme = (): UserTheme => {
    const saved = localStorage.getItem(KEYS.USER_THEME);
    return saved ? JSON.parse(saved) : { mode: 'LIGHT', backgroundStyle: 'FLAT' };
};
export const saveUserTheme = (t: UserTheme) => save(KEYS.USER_THEME, t);

export const getReportHeaderConfig = (teacherId?: string): ReportHeaderConfig => {
    const all = get<ReportHeaderConfig & { teacherId: string }>('report_header_configs');
    const found = all.find(c => c.teacherId === teacherId);
    return found || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => {
    const all = get<ReportHeaderConfig & { teacherId: string }>('report_header_configs');
    const idx = all.findIndex(x => x.teacherId === c.teacherId);
    if (idx !== -1) all[idx] = c as any;
    else all.push(c as any);
    save('report_header_configs', all);
};

export const getTeacherPeriodTimings = (teacherId: string): string[] => {
    const all = get<{ teacherId: string, timings: string[] }>('period_timings');
    const found = all.find(t => t.teacherId === teacherId);
    return found ? found.timings : ["07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", "09:45 - 10:30", "10:30 - 11:15", "11:15 - 12:00", "12:00 - 12:45", "12:45 - 01:30"];
};
export const saveTeacherPeriodTimings = (teacherId: string, timings: string[]) => {
    const all = get<{ teacherId: string, timings: string[] }>('period_timings');
    const idx = all.findIndex(t => t.teacherId === teacherId);
    if (idx !== -1) all[idx].timings = timings;
    else all.push({ teacherId, timings });
    save('period_timings', all);
};

export const getAISettings = (): AISettings => {
    const saved = localStorage.getItem(KEYS.AI_SETTINGS);
    return saved ? JSON.parse(saved) : { modelId: 'gemini-3-flash-preview', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' };
};
export const saveAISettings = (s: AISettings) => save(KEYS.AI_SETTINGS, s);

export const getCustomTables = (teacherId?: string): CustomTable[] => {
    const all = get<CustomTable>(KEYS.CUSTOM_TABLES);
    return teacherId ? all.filter(t => t.teacherId === teacherId) : all;
};
export const addCustomTable = (t: CustomTable) => {
    const list = getCustomTables();
    list.push(t);
    save(KEYS.CUSTOM_TABLES, list);
};
export const updateCustomTable = (t: CustomTable) => {
    const list = getCustomTables();
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) {
        list[idx] = t;
        save(KEYS.CUSTOM_TABLES, list);
    }
};
export const deleteCustomTable = (id: string) => {
    save(KEYS.CUSTOM_TABLES, getCustomTables().filter(t => t.id !== id));
};

export const getSchools = (): School[] => get<School>(KEYS.SCHOOLS);
export const addSchool = (s: School) => {
    const list = getSchools();
    list.push(s);
    save(KEYS.SCHOOLS, list);
};
export const updateSchool = (s: School) => {
    const list = getSchools();
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) {
        list[idx] = s;
        save(KEYS.SCHOOLS, list);
    }
};
export const deleteSchool = (id: string) => {
    save(KEYS.SCHOOLS, getSchools().filter(s => s.id !== id));
};

export const getTeachers = (): Teacher[] => get<Teacher>(KEYS.TEACHERS);
export const addTeacher = (t: Teacher) => {
    const list = getTeachers();
    list.push(t);
    save(KEYS.TEACHERS, list);
    // Also add to system users
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
};
export const updateTeacher = (t: Teacher) => {
    const list = getTeachers();
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) {
        list[idx] = t;
        save(KEYS.TEACHERS, list);
    }
};

export const getSystemUsers = (): SystemUser[] => get<SystemUser>(KEYS.SYSTEM_USERS);
export const addSystemUser = (u: SystemUser) => {
    const list = getSystemUsers();
    list.push(u);
    save(KEYS.SYSTEM_USERS, list);
};
export const updateSystemUser = (u: SystemUser) => {
    const list = getSystemUsers();
    const idx = list.findIndex(x => x.id === u.id);
    if (idx !== -1) {
        list[idx] = u;
        save(KEYS.SYSTEM_USERS, list);
    }
};
export const deleteSystemUser = (id: string) => {
    save(KEYS.SYSTEM_USERS, getSystemUsers().filter(u => u.id !== id));
};

export const getQuestionBank = (teacherId: string): Question[] => get<Question>(KEYS.QUESTIONS).filter(q => q.teacherId === teacherId);
export const saveQuestionToBank = (q: Question) => {
    const list = get<Question>(KEYS.QUESTIONS);
    const idx = list.findIndex(x => x.id === q.id);
    if (idx !== -1) list[idx] = q;
    else list.push(q);
    save(KEYS.QUESTIONS, list);
};
export const deleteQuestionFromBank = (id: string) => {
    save(KEYS.QUESTIONS, get<Question>(KEYS.QUESTIONS).filter(q => q.id !== id));
};

export const getCurriculumUnits = (teacherId: string): CurriculumUnit[] => get<CurriculumUnit>('curriculum_units').filter(u => u.teacherId === teacherId);
export const saveCurriculumUnit = (u: CurriculumUnit) => {
    const list = get<CurriculumUnit>('curriculum_units');
    const idx = list.findIndex(x => x.id === u.id);
    if (idx !== -1) list[idx] = u;
    else list.push(u);
    save('curriculum_units', list);
};
export const deleteCurriculumUnit = (id: string) => {
    save('curriculum_units', get<CurriculumUnit>('curriculum_units').filter(u => u.id !== id));
};

export const getCurriculumLessons = (): CurriculumLesson[] => get<CurriculumLesson>('curriculum_lessons');
export const saveCurriculumLesson = (l: CurriculumLesson) => {
    const list = getCurriculumLessons();
    const idx = list.findIndex(x => x.id === l.id);
    if (idx !== -1) list[idx] = l;
    else list.push(l);
    save('curriculum_lessons', list);
};
export const deleteCurriculumLesson = (id: string) => {
    save('curriculum_lessons', getCurriculumLessons().filter(l => l.id !== id));
};
export const toggleCurriculumLesson = (id: string, status: boolean) => {
    const list = getCurriculumLessons();
    const idx = list.findIndex(x => x.id === id);
    if (idx !== -1) {
        list[idx].isCompleted = status;
        list[idx].completedAt = status ? new Date().toISOString() : undefined;
        save('curriculum_lessons', list);
    }
};

export const getMicroConcepts = (teacherId: string): MicroConcept[] => get<MicroConcept>('micro_concepts').filter(c => c.teacherId === teacherId);
export const saveMicroConcept = (c: MicroConcept) => {
    const list = get<MicroConcept>('micro_concepts');
    list.push(c);
    save('micro_concepts', list);
};
export const deleteMicroConcept = (id: string) => {
    save('micro_concepts', get<MicroConcept>('micro_concepts').filter(c => c.id !== id));
};

export const getTrackingSheets = (teacherId: string): TrackingSheet[] => get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.teacherId === teacherId);
export const saveTrackingSheet = (s: TrackingSheet) => {
    const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) list[idx] = s;
    else list.push(s);
    save(KEYS.TRACKING_SHEETS, list);
};
export const deleteTrackingSheet = (id: string) => {
    save(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.id !== id));
};

export const getWorksMasterUrl = () => localStorage.getItem('works_master_url') || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem('works_master_url', url);

export const authenticateUser = async (id: string, pass: string): Promise<SystemUser | null> => {
    const users = getSystemUsers();
    const found = users.find(u => (u.nationalId === id || u.email === id) && u.password === pass);
    return found || null;
};
export const authenticateStudent = async (id: string, pass: string): Promise<SystemUser | null> => {
    const students = getStudents();
    const found = students.find(s => s.nationalId === id && (s.password === pass || (!s.password && pass === '123456')));
    if (found) {
        return {
            id: found.id,
            name: found.name,
            email: found.email || '',
            nationalId: found.nationalId,
            role: 'STUDENT',
            status: 'ACTIVE',
            schoolId: found.schoolId
        };
    }
    return null;
};

// --- Mock Cloud Functions ---
export const setSystemMode = (online: boolean) => console.log(`System mode: ${online ? 'ONLINE' : 'OFFLINE'}`);
export const subscribeToSyncStatus = (cb: (s: SyncStatus) => void) => { cb('IDLE'); return () => {}; };
export const subscribeToDataChanges = (cb: () => void) => { return () => {}; };
export const initRealtimeSync = () => {};
export const stopRealtimeSync = () => {};
export const initAutoSync = async () => {};
export const uploadToSupabase = async () => {};
export const downloadFromSupabase = async () => {};
export const checkConnection = async () => ({ success: true });
export const fetchCloudTableData = async (t: string) => [];
export const clearCloudTable = async (t: string) => {};
export const resetCloudDatabase = async () => {};
export const backupCloudDatabase = async () => JSON.stringify({});
export const restoreCloudDatabase = async (j: string) => {};
export const validateCloudSchema = async () => ({ missingTables: [] });
export const createBackup = () => JSON.stringify(localStorage);
export const restoreBackup = (j: string) => {};
export const clearDatabase = () => localStorage.clear();
export const uploadFile = async (f: File) => '';

export const getTableDisplayName = (t: string) => t;
export const getDatabaseSchemaSQL = () => '-- Schema SQL Placeholder';
export const getDatabaseUpdateSQL = () => '-- Update SQL Placeholder';
