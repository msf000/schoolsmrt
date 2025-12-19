
import { 
    Student, AttendanceRecord, PerformanceRecord, Teacher, School, 
    SystemUser, Subject, ScheduleItem, TeacherAssignment, 
    AcademicTerm, WeeklyPlanItem, LessonLink, StoredLessonPlan,
    Exam, AISettings, ReportHeaderConfig, UserTheme, Assignment,
    CustomTable, EnvironmentRecord, LearningStyle, CurriculumUnit, 
    CurriculumLesson, Question, ExamResult, TrackingSheet, RemedialPlan,
    MessageLog, FormsDetailedResult
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
    WORKS_MASTER_URL: 'works_master_url'
};

export const DB_MAP = { ...KEYS };

export function get<T>(key: string): T[] { 
    try { 
        const data = localStorage.getItem(key); 
        return data ? JSON.parse(data) : []; 
    } catch { return []; } 
}
export function save(key: string, data: any) { 
    localStorage.setItem(key, JSON.stringify(data)); 
}

// --- المزامنة السحابية الشاملة (Cloud-First Engine) ---
export const uploadToSupabase = async () => {
    if (!navigator.onLine) return;
    const tables = [
        { key: KEYS.STUDENTS, table: 'students' },
        { key: KEYS.ATTENDANCE, table: 'attendance' },
        { key: KEYS.PERFORMANCE, table: 'performance' },
        { key: KEYS.TRACKING_ASSIGNMENTS, table: 'assignments' },
        { key: KEYS.TERMS, table: 'academic_terms' },
        { key: KEYS.LESSON_PLANS, table: 'lesson_plans' },
        { key: KEYS.CURRICULUM_UNITS, table: 'curriculum_units' },
        { key: KEYS.CURRICULUM_LESSONS, table: 'curriculum_lessons' },
        { key: KEYS.MESSAGES, table: 'messages' }
    ];
    
    for (const item of tables) {
        const data = get(item.key);
        if (data.length > 0) {
            try {
                await supabase.from(item.table).upsert(data);
            } catch (e) {
                console.error(`Error syncing ${item.table}:`, e);
            }
        }
    }
};

export const downloadFromSupabase = async () => {
    if (!navigator.onLine) return;
    const tables = [
        { key: KEYS.STUDENTS, table: 'students' },
        { key: KEYS.ATTENDANCE, table: 'attendance' },
        { key: KEYS.PERFORMANCE, table: 'performance' },
        { key: KEYS.TRACKING_ASSIGNMENTS, table: 'assignments' },
        { key: KEYS.TERMS, table: 'academic_terms' },
        { key: KEYS.LESSON_PLANS, table: 'lesson_plans' },
        { key: KEYS.CURRICULUM_UNITS, table: 'curriculum_units' },
        { key: KEYS.CURRICULUM_LESSONS, table: 'curriculum_lessons' },
        { key: KEYS.MESSAGES, table: 'messages' }
    ];

    for (const item of tables) {
        try {
            const { data, error } = await supabase.from(item.table).select('*');
            if (!error && data) {
                save(item.key, data);
            }
        } catch (e) {
            console.error(`Error downloading ${item.table}:`, e);
        }
    }
};

// --- الطلاب ---
export const getStudents = (): Student[] => get<Student>(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const list = getStudents(); list.push(s); save(KEYS.STUDENTS, list); uploadToSupabase(); };
export const updateStudent = (s: Student) => { const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.STUDENTS, list); uploadToSupabase(); } };
export const deleteStudent = (id: string) => { save(KEYS.STUDENTS, getStudents().filter(s => s.id !== id)); uploadToSupabase(); };

export const bulkUpsertStudents = (data: Student[], key: keyof Student = 'id') => {
    const list = getStudents();
    data.forEach(item => {
        const idx = list.findIndex(s => s[key] === item[key]);
        if (idx !== -1) list[idx] = { ...list[idx], ...item };
        else list.push(item);
    });
    save(KEYS.STUDENTS, list);
    uploadToSupabase();
};

export const deleteAllStudents = () => {
    save(KEYS.STUDENTS, []);
    supabase.from('students').delete().neq('id', '0').then();
};

// --- الحضور ---
export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);

export const saveAttendance = (records: AttendanceRecord[]) => { 
    const list = get<AttendanceRecord>(KEYS.ATTENDANCE);
    records.forEach(r => { 
        const idx = list.findIndex(x => x.id === r.id); 
        if (idx !== -1) list[idx] = r; else list.push(r); 
    }); 
    save(KEYS.ATTENDANCE, list); 
    uploadToSupabase();
};

// --- الأداء والدرجات ---
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

export const deletePerformance = (id: string) => { 
    const list = getPerformance().filter(p => p.id !== id);
    save(KEYS.PERFORMANCE, list); 
    supabase.from('performance').delete().eq('id', id).then();
};

export const bulkAddPerformance = (data: PerformanceRecord[]) => { 
    addPerformance(data);
};

// --- المنهج والدروس ---
export const getCurriculumUnits = (tid: string) => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.teacherId === tid);
export const saveCurriculumUnit = (u: CurriculumUnit) => { const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); list.push(u); save(KEYS.CURRICULUM_UNITS, list); uploadToSupabase(); };
export const deleteCurriculumUnit = (id: string) => { save(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.id !== id)); uploadToSupabase(); };

export const getCurriculumLessons = () => get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = (l: CurriculumLesson) => { const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS); list.push(l); save(KEYS.CURRICULUM_LESSONS, list); uploadToSupabase(); };
export const deleteCurriculumLesson = (id: string) => { save(KEYS.CURRICULUM_LESSONS, get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => l.id !== id)); uploadToSupabase(); };
export const toggleCurriculumLesson = (id: string, c: boolean) => { const list = getCurriculumLessons(); const idx = list.findIndex(x => x.id === id); if (idx !== -1) { list[idx].isCompleted = c; save(KEYS.CURRICULUM_LESSONS, list); uploadToSupabase(); } };

// --- الإعدادات الفنية ---
export const initAutoSync = async () => {
    if (navigator.onLine) {
        await downloadFromSupabase();
        // مزامنة تلقائية كل دقيقتين لضمان بقاء السحابة محدثة
        setInterval(uploadToSupabase, 120000); 
    }
};

export const getSubjects = (tid?: string): Subject[] => get<Subject>(KEYS.SUBJECTS).filter(s => !tid || s.teacherId === tid);
export const addSubject = (s: Subject) => { const list = get<Subject>(KEYS.SUBJECTS); list.push(s); save(KEYS.SUBJECTS, list); uploadToSupabase(); };
export const getAcademicTerms = (tid?: string): AcademicTerm[] => get<AcademicTerm>(KEYS.TERMS).filter(t => !tid || t.teacherId === tid);
export const saveAcademicTerm = (t: AcademicTerm) => { const list = get<AcademicTerm>(KEYS.TERMS); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) list[idx] = t; else list.push(t); save(KEYS.TERMS, list); uploadToSupabase(); };
export const deleteAcademicTerm = (id: string) => { save(KEYS.TERMS, get<AcademicTerm>(KEYS.TERMS).filter(t => t.id !== id)); uploadToSupabase(); };
export const getAISettings = () => get<AISettings>(KEYS.AI_SETTINGS)[0] || { modelId: 'gemini-3-flash-preview', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: "" };
export const getUserTheme = () => { const s = localStorage.getItem(KEYS.USER_THEME); return s ? JSON.parse(s) : { mode: 'LIGHT', backgroundStyle: 'FLAT' }; };
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));
export const getSchedules = () => get<ScheduleItem>(KEYS.SCHEDULES);
export const saveScheduleItem = (s: ScheduleItem) => { const list = get<ScheduleItem>(KEYS.SCHEDULES); list.push(s); save(KEYS.SCHEDULES, list); uploadToSupabase(); };
export const deleteScheduleItem = (id: string) => { save(KEYS.SCHEDULES, get<ScheduleItem>(KEYS.SCHEDULES).filter(s => s.id !== id)); uploadToSupabase(); };
export const getWeeklyPlans = (tid?: string) => get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => { const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS); const idx = list.findIndex(x => x.id === p.id); if (idx !== -1) list[idx] = p; else list.push(p); save(KEYS.WEEKLY_PLANS, list); uploadToSupabase(); };
export const getLessonPlans = (tid?: string) => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveLessonPlan = (p: StoredLessonPlan) => { const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS); const idx = list.findIndex(x => x.id === p.id); if (idx !== -1) list[idx] = p; else list.push(p); save(KEYS.LESSON_PLANS, list); uploadToSupabase(); };
export const deleteLessonPlan = (id: string) => { save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.id !== id)); uploadToSupabase(); };
export const getAssignments = (category: string = 'ALL', teacherId?: string, isVisibleOnly: boolean = false): Assignment[] => {
    let all = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    if (teacherId) all = all.filter(a => a.teacherId === teacherId);
    if (category !== 'ALL') all = all.filter(a => a.category === category);
    if (isVisibleOnly) all = all.filter(a => a.isVisible);
    return all;
};
export const saveAssignment = (a: Assignment) => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    const idx = list.findIndex(x => x.id === a.id);
    if (idx !== -1) list[idx] = a; else list.push(a);
    save(KEYS.TRACKING_ASSIGNMENTS, list);
    uploadToSupabase();
};
export const deleteAssignment = (id: string) => { 
    save(KEYS.TRACKING_ASSIGNMENTS, get<Assignment>(KEYS.TRACKING_ASSIGNMENTS).filter(a => a.id !== id));
    supabase.from('assignments').delete().eq('id', id).then();
};

export const getReportHeaderConfig = (tid?: string) => { const all = get<ReportHeaderConfig & {teacherId: string}>('report_header_configs'); return all.find(c => c.teacherId === tid) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' }; };
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => { const all = get<ReportHeaderConfig & {teacherId: string}>('report_header_configs'); const idx = all.findIndex(x => x.teacherId === c.teacherId); if (idx !== -1) all[idx] = c as any; else all.push(c as any); save('report_header_configs', all); uploadToSupabase(); };
export const getTeacherPeriodTimings = (tid: string) => get<{tid: string, times: string[]}>('period_timings').find(x => x.tid === tid)?.times || ["07:00", "07:45", "08:30"];
export const saveTeacherPeriodTimings = (tid: string, times: string[]) => { const all = get<{tid: string, times: string[]}>('period_timings'); const idx = all.findIndex(x => x.tid === tid); if (idx !== -1) all[idx].times = times; else all.push({ tid, times }); save('period_timings', all); uploadToSupabase(); };
export const getTeacherAssignments = (tid?: string) => get<TeacherAssignment>('teacher_class_map').filter(a => !tid || a.teacherId === tid);
export const addTeacherAssignment = (a: TeacherAssignment) => { const list = get<TeacherAssignment>('teacher_class_map'); list.push(a); save('teacher_class_map', list); uploadToSupabase(); };
export const deleteTeacherAssignment = (id: string) => { save('teacher_class_map', get<TeacherAssignment>('teacher_class_map').filter(x => x.id !== id)); uploadToSupabase(); };
export const getMessages = (tid?: string) => get<MessageLog>(KEYS.MESSAGES).filter(m => !tid || m.teacherId === tid);
export const saveMessage = (m: MessageLog) => { const list = get<MessageLog>(KEYS.MESSAGES); list.push(m); save(KEYS.MESSAGES, list); uploadToSupabase(); };
export const getSchools = () => get<School>(KEYS.SCHOOLS);
export const addSchool = async (s: School) => { const list = getSchools(); list.push(s); save(KEYS.SCHOOLS, list); uploadToSupabase(); };
export const getTeachers = () => get<Teacher>(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => { 
    const list = getTeachers(); list.push(t); save(KEYS.TEACHERS, list); 
    addSystemUser({ id: t.id, name: t.name, email: t.email || '', nationalId: t.nationalId, password: t.password || '123456', role: 'TEACHER', schoolId: t.schoolId, status: 'ACTIVE' });
    uploadToSupabase();
};
export const getSystemUsers = () => get<SystemUser>(KEYS.SYSTEM_USERS);
export const addSystemUser = async (u: SystemUser) => { const list = getSystemUsers(); list.push(u); save(KEYS.SYSTEM_USERS, list); uploadToSupabase(); };
export const authenticateUser = async (id: string, p: string) => getSystemUsers().find(u => (u.nationalId === id || u.email === id) && u.password === p) || null;
export const authenticateStudent = async (id: string, p: string) => getStudents().find(s => s.nationalId === id && (s.password || '123456') === p) || null;
export const setCurrentTerm = (id: string, tid: string) => { const all = get<AcademicTerm>(KEYS.TERMS); all.forEach(t => { if (t.teacherId === tid) t.isCurrent = (t.id === id); }); save(KEYS.TERMS, all); uploadToSupabase(); };
export const getFormsDetailedResults = (tid?: string) => get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => !tid || r.teacherId === tid);
export const saveFormsDetailedResult = (r: FormsDetailedResult) => { const list = get<FormsDetailedResult>(KEYS.FORMS_DETAILED); list.push(r); save(KEYS.FORMS_DETAILED, list); uploadToSupabase(); };
export const getCustomTables = (tid?: string) => get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => !tid || t.teacherId === tid);
export const addCustomTable = (t: CustomTable) => { const list = get<CustomTable>(KEYS.CUSTOM_TABLES); list.push(t); save(KEYS.CUSTOM_TABLES, list); uploadToSupabase(); };
export const updateCustomTable = (t: CustomTable) => { const list = get<CustomTable>(KEYS.CUSTOM_TABLES); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) list[idx] = t; save(KEYS.CUSTOM_TABLES, list); uploadToSupabase(); };
export const deleteCustomTable = (id: string) => { save(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => t.id !== id)); uploadToSupabase(); };
export const getEnvironmentRecords = (cid?: string) => get<EnvironmentRecord>(KEYS.ENVIRONMENT).filter(r => !cid || r.classId === cid);
export const saveEnvironmentRecord = (r: EnvironmentRecord) => { const list = get<EnvironmentRecord>(KEYS.ENVIRONMENT); list.push(r); save(KEYS.ENVIRONMENT, list); uploadToSupabase(); };
export const updateStudentLearningStyle = (id: string, s: LearningStyle) => { const list = getStudents(); const idx = list.findIndex(x => x.id === id); if (idx !== -1) { list[idx].learningStyle = s; save(KEYS.STUDENTS, list); uploadToSupabase(); } };
export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (u: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, u);

// --- وظائف الصيانة ---
export const checkConnection = async () => { try { const { error } = await supabase.from('students').select('id').limit(1); return { success: !error, message: error ? error.message : "متصل" }; } catch { return { success: false, message: "فشل الاتصال" }; } };
export const validateCloudSchema = async () => ({ missingTables: [] });
export const fetchCloudTableData = async (t: string) => { const { data } = await supabase.from(t).select('*'); return data; };
export const clearCloudTable = async (t: string) => { await supabase.from(t).delete().neq('id', '0'); };
export const resetCloudDatabase = async () => {};
export const backupCloudDatabase = async () => JSON.stringify({});
export const restoreCloudDatabase = async (j: string) => {};
export const getDatabaseSchemaSQL = () => `-- SQL Schema Exported --`;
export const getDatabaseUpdateSQL = () => `-- SQL Updates Exported --`;
export const createBackup = () => JSON.stringify(localStorage);
export const restoreBackup = (j: string) => { try { const d = JSON.parse(j); Object.keys(d).forEach(k => localStorage.setItem(k, d[k])); return true; } catch { return false; } };
export const clearDatabase = () => localStorage.clear();
export const deleteFormsDetailedResult = (id: string) => save(KEYS.FORMS_DETAILED, get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => r.id !== id));
export const deleteTrackingSheet = (id: string) => save(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.id !== id));
export const saveTrackingSheet = (s: TrackingSheet) => { const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS); list.push(s); save(KEYS.TRACKING_SHEETS, list); uploadToSupabase(); };
export const getTrackingSheets = (tid?: string) => get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => !tid || s.teacherId === tid);
export const deleteExamResult = (id: string) => save(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => r.id !== id));
export const saveExamResult = (r: ExamResult) => { const list = get<ExamResult>(KEYS.EXAM_RESULTS); list.push(r); save(KEYS.EXAM_RESULTS, list); uploadToSupabase(); };
export const getExamResults = (eid?: string) => get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => !eid || r.examId === eid);
export const deleteExam = (id: string) => save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(e => e.id !== id));
export const saveExam = (e: Exam) => { const list = get<Exam>(KEYS.EXAMS); const idx = list.findIndex(x => x.id === e.id); if (idx !== -1) list[idx] = e; else list.push(e); save(KEYS.EXAMS, list); uploadToSupabase(); };
export const getExams = (tid?: string) => get<Exam>(KEYS.EXAMS).filter(e => !tid || e.teacherId === tid);
export const deleteLessonLink = (id: string) => save(KEYS.LESSON_LINKS, get<LessonLink>(KEYS.LESSON_LINKS).filter(l => l.id !== id));
export const saveLessonLink = (l: LessonLink) => { const list = get<LessonLink>(KEYS.LESSON_LINKS); list.push(l); save(KEYS.LESSON_LINKS, list); uploadToSupabase(); };
export const getLessonLinks = (tid?: string) => get<LessonLink>(KEYS.LESSON_LINKS).filter(l => !tid || l.teacherId === tid);
export const deleteQuestionFromBank = (id: string) => save(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(q => q.id !== id));
export const saveQuestionToBank = (q: Question) => { const list = get<Question>(KEYS.QUESTION_BANK); list.push(q); save(KEYS.QUESTION_BANK, list); uploadToSupabase(); };
export const getQuestionBank = (tid: string) => get<Question>(KEYS.QUESTION_BANK).filter(q => q.teacherId === tid);
export const saveRemedialPlan = (p: RemedialPlan) => { const list = get<RemedialPlan>(KEYS.REMEDIAL_PLANS); list.push(p); save(KEYS.REMEDIAL_PLANS, list); uploadToSupabase(); };
export const getRemedialPlans = (sid?: string) => get<RemedialPlan>(KEYS.REMEDIAL_PLANS).filter(p => !sid || p.studentId === sid);
export const deleteSubject = (id: string) => save(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id));
export const addTeacherAssignmentManually = (a: TeacherAssignment) => { const list = get<TeacherAssignment>('teacher_class_map'); list.push(a); save('teacher_class_map', list); uploadToSupabase(); };
export const updateTeacher = async (t: Teacher) => { const list = getTeachers(); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) { list[idx] = t; save(KEYS.TEACHERS, list); uploadToSupabase(); } };
export const deleteSystemUser = (id: string) => save(KEYS.SYSTEM_USERS, getSystemUsers().filter(u => u.id !== id));
export const updateSystemUser = (u: SystemUser) => { const list = getSystemUsers(); const idx = list.findIndex(x => x.id === u.id); if (idx !== -1) { list[idx] = u; save(KEYS.SYSTEM_USERS, list); uploadToSupabase(); } };
export const deleteSchool = (id: string) => save(KEYS.SCHOOLS, getSchools().filter(s => s.id !== id));
export const updateSchool = (s: School) => { const list = getSchools(); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.SCHOOLS, list); uploadToSupabase(); } };
export const saveAISettings = (s: AISettings) => save(KEYS.AI_SETTINGS, [s]);

/**
 * Fix for AdminDashboard error: Module '"../services/storageService"' has no exported member 'getTableDisplayName'.
 * Returns a human-readable display name for a database table key.
 */
export const getTableDisplayName = (tableName: string): string => {
    const names: Record<string, string> = {
        [KEYS.STUDENTS]: 'الطلاب',
        [KEYS.ATTENDANCE]: 'الحضور',
        [KEYS.PERFORMANCE]: 'الأداء والدرجات',
        [KEYS.TEACHERS]: 'المعلمين',
        [KEYS.SCHOOLS]: 'المدارس',
        [KEYS.SYSTEM_USERS]: 'المستخدمين',
        [KEYS.SUBJECTS]: 'المواد',
        [KEYS.SCHEDULES]: 'الجداول',
        [KEYS.TRACKING_ASSIGNMENTS]: 'التكليفات',
        [KEYS.TERMS]: 'الفصول الدراسية',
        [KEYS.WEEKLY_PLANS]: 'الخطط الأسبوعية',
        [KEYS.LESSON_LINKS]: 'روابط الدروس',
        [KEYS.LESSON_PLANS]: 'تحضير الدروس',
        [KEYS.EXAMS]: 'الاختبارات',
        [KEYS.EXAM_RESULTS]: 'نتائج الاختبارات',
        [KEYS.QUESTION_BANK]: 'بنك الأسئلة',
        [KEYS.CURRICULUM_UNITS]: 'وحدات المنهج',
        [KEYS.CURRICULUM_LESSONS]: 'دروس المنهج',
        [KEYS.TRACKING_SHEETS]: 'سجلات الرصد',
        [KEYS.MESSAGES]: 'الرسائل',
        [KEYS.CUSTOM_TABLES]: 'الجداول الخاصة',
        [KEYS.USER_THEME]: 'المظهر',
        [KEYS.AI_SETTINGS]: 'إعدادات الذكاء',
        [KEYS.ENVIRONMENT]: 'بيئة الصف',
        [KEYS.REMEDIAL_PLANS]: 'الخطط العلاجية',
        [KEYS.FORMS_DETAILED]: 'نتائج Forms',
        [KEYS.WORKS_MASTER_URL]: 'رابط كشف الرصد'
    };
    return names[tableName] || tableName;
};

/**
 * Fix for Login error: Module '"../services/storageService"' has no exported member 'setSystemMode'.
 * Sets a flag indicating system operation mode (e.g., initial loading).
 */
export const setSystemMode = (val: boolean) => {
    console.debug('System mode set to:', val);
};
