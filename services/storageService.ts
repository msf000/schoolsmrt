
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

// Fix: Added missing DB_MAP export for AdminDashboard cloud inspector
export const DB_MAP = {
    SCHOOLS: 'schools',
    TEACHERS: 'teachers',
    STUDENTS: 'students',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    SYSTEM_USERS: 'system_users',
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    ASSIGNMENTS: 'assignments',
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
    AI_SETTINGS: 'ai_settings',
    ENVIRONMENT: 'environment_records',
    REMEDIAL_PLANS: 'remedial_plans',
    FORMS_DETAILED: 'forms_detailed_results'
};

// Fix: Added missing getTableDisplayName export for AdminDashboard cloud inspector
export const getTableDisplayName = (table: string): string => {
    const names: Record<string, string> = {
        'schools': 'المدارس',
        'teachers': 'المعلمين',
        'students': 'الطلاب',
        'attendance': 'الحضور',
        'performance': 'الدرجات',
        'system_users': 'المستخدمين',
        'subjects': 'المواد',
        'schedules': 'الجداول',
        'assignments': 'المهام',
        'academic_terms': 'الفصول الدراسية',
        'weekly_plans': 'الخطط الأسبوعية',
        'lesson_links': 'روابط الدروس',
        'lesson_plans': 'تحضير الدروس',
        'exams': 'الاختبارات',
        'exam_results': 'نتائج الاختبارات',
        'question_bank': 'بنك الأسئلة',
        'curriculum_units': 'وحدات المنهج',
        'curriculum_lessons': 'دروس المنهج',
        'tracking_sheets': 'سجلات الرصد',
        'messages': 'الرسائل',
        'custom_tables': 'الجداول الخاصة',
        'ai_settings': 'إعدادات AI',
        'environment_records': 'بيئة الصف',
        'remedial_plans': 'خطط علاجية',
        'forms_detailed_results': 'تحليل Forms'
    };
    return names[table] || table;
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

// --- الطلاب ---
export const getStudents = (): Student[] => get<Student>(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const list = getStudents(); list.push(s); save(KEYS.STUDENTS, list); };
export const updateStudent = (s: Student) => { const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.STUDENTS, list); } };
export const deleteStudent = (id: string) => { save(KEYS.STUDENTS, getStudents().filter(s => s.id !== id)); };
export const deleteAllStudents = () => save(KEYS.STUDENTS, []);
export const bulkAddStudents = (data: Student[]) => { const list = getStudents(); save(KEYS.STUDENTS, [...list, ...data]); };
export const bulkUpsertStudents = (data: Student[], key: keyof Student = 'nationalId') => { 
    const list = getStudents(); 
    data.forEach(s => { 
        const idx = list.findIndex(x => x[key] === s[key]); 
        if (idx !== -1) list[idx] = { ...list[idx], ...s }; else list.push(s); 
    }); 
    save(KEYS.STUDENTS, list); 
};

// --- الحضور ---
export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);
export const saveAttendance = (records: AttendanceRecord[]) => { 
    const list = getAttendance(); 
    records.forEach(r => { 
        const idx = list.findIndex(x => x.id === r.id); 
        if (idx !== -1) list[idx] = r; else list.push(r); 
    }); 
    save(KEYS.ATTENDANCE, list);
};
export const bulkAddAttendance = (data: AttendanceRecord[]) => { const list = getAttendance(); save(KEYS.ATTENDANCE, [...list, ...data]); };

// --- الدرجات ---
export const getPerformance = (): PerformanceRecord[] => get<PerformanceRecord>(KEYS.PERFORMANCE);
export const addPerformance = (record: PerformanceRecord | PerformanceRecord[]) => { 
    const list = getPerformance(); 
    const records = Array.isArray(record) ? record : [record]; 
    records.forEach(rec => { 
        const idx = list.findIndex(r => r.id === rec.id); 
        if (idx !== -1) list[idx] = rec; else list.push(rec); 
    }); 
    save(KEYS.PERFORMANCE, list);
};
export const deletePerformance = (id: string) => { save(KEYS.PERFORMANCE, getPerformance().filter(p => p.id !== id)); };
export const bulkAddPerformance = (data: PerformanceRecord[]) => { const list = getPerformance(); save(KEYS.PERFORMANCE, [...list, ...data]); };

// --- سجل الرصد والمواد ---
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
};
export const deleteAssignment = (id: string) => { save(KEYS.TRACKING_ASSIGNMENTS, get<Assignment>(KEYS.TRACKING_ASSIGNMENTS).filter(a => a.id !== id)); };

export const getSubjects = (teacherId?: string): Subject[] => { const all = get<Subject>(KEYS.SUBJECTS); return teacherId ? all.filter(s => s.teacherId === teacherId) : all; };
export const addSubject = (s: Subject) => { const list = get<Subject>(KEYS.SUBJECTS); list.push(s); save(KEYS.SUBJECTS, list); };
// Fix: Removed 'drama:' label typo
export const deleteSubject = (id: string) => { save(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id)); };

// --- المدارس والمعلمين ---
export const getSchools = (): School[] => get<School>(KEYS.SCHOOLS);
export const addSchool = async (s: School) => { const list = getSchools(); list.push(s); save(KEYS.SCHOOLS, list); };
export const updateSchool = (s: School) => { const list = getSchools(); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.SCHOOLS, list); } };
export const deleteSchool = (id: string) => { save(KEYS.SCHOOLS, getSchools().filter(s => s.id !== id)); };

export const getTeachers = (): Teacher[] => get<Teacher>(KEYS.TEACHERS);
export const updateTeacher = async (t: Teacher) => { const list = getTeachers(); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) { list[idx] = t; save(KEYS.TEACHERS, list); } };
export const addTeacher = async (t: Teacher) => { 
    const list = getTeachers(); 
    list.push(t); 
    save(KEYS.TEACHERS, list); 
    addSystemUser({ id: t.id, name: t.name, email: t.email || '', nationalId: t.nationalId, password: t.password || '123456', role: 'TEACHER', schoolId: t.schoolId, status: 'ACTIVE' });
};

// --- المستخدمين ---
export const getSystemUsers = (): SystemUser[] => get<SystemUser>(KEYS.SYSTEM_USERS);
export const addSystemUser = async (u: SystemUser) => { const list = getSystemUsers(); list.push(u); save(KEYS.SYSTEM_USERS, list); };
export const updateSystemUser = (u: SystemUser) => { const list = getSystemUsers(); const idx = list.findIndex(x => x.id === u.id); if (idx !== -1) { list[idx] = u; save(KEYS.SYSTEM_USERS, list); } };
export const deleteSystemUser = (id: string) => { save(KEYS.SYSTEM_USERS, getSystemUsers().filter(u => u.id !== id)); };

// --- الفصول والتقويم ---
export const getAcademicTerms = (teacherId?: string): AcademicTerm[] => { const all = get<AcademicTerm>(KEYS.TERMS); return teacherId ? all.filter(t => t.teacherId === teacherId) : all; };
export const saveAcademicTerm = (t: AcademicTerm) => { const list = get<AcademicTerm>(KEYS.TERMS); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) list[idx] = t; else list.push(t); save(KEYS.TERMS, list); };
export const deleteAcademicTerm = (id: string) => { save(KEYS.TERMS, get<AcademicTerm>(KEYS.TERMS).filter(t => t.id !== id)); };
export const setCurrentTerm = (id: string, teacherId: string) => {
    const all = get<AcademicTerm>(KEYS.TERMS);
    all.forEach(t => { if (t.teacherId === teacherId) t.isCurrent = (t.id === id); });
    save(KEYS.TERMS, all);
};

// --- المراسلات والأعطال ---
export const getMessages = (teacherId?: string): MessageLog[] => { const all = get<MessageLog>(KEYS.MESSAGES); return teacherId ? all.filter(m => m.teacherId === teacherId) : all; };
export const saveMessage = (m: MessageLog) => { const list = get<MessageLog>(KEYS.MESSAGES); list.push(m); save(KEYS.MESSAGES, list); };

// --- إعدادات التقارير والواجهة ---
export const getReportHeaderConfig = (teacherId?: string): ReportHeaderConfig => { const all = get<ReportHeaderConfig & { teacherId: string }>('report_header_configs'); const found = all.find(c => c.teacherId === teacherId); return found || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' }; };
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => { const all = get<ReportHeaderConfig & { teacherId: string }>('report_header_configs'); const idx = all.findIndex(x => x.teacherId === c.teacherId); if (idx !== -1) all[idx] = c as any; else all.push(c as any); save('report_header_configs', all); };

export const getUserTheme = (): UserTheme => { const saved = localStorage.getItem(KEYS.USER_THEME); return saved ? JSON.parse(saved) : { mode: 'LIGHT', backgroundStyle: 'FLAT' }; };
export const saveUserTheme = (t: UserTheme) => { localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t)); };

// --- تحليل Forms ---
export const getFormsDetailedResults = (teacherId?: string): FormsDetailedResult[] => { const all = get<FormsDetailedResult>(KEYS.FORMS_DETAILED); return teacherId ? all.filter(r => r.teacherId === teacherId) : all; };
export const saveFormsDetailedResult = (result: FormsDetailedResult) => { const list = get<FormsDetailedResult>(KEYS.FORMS_DETAILED); const idx = list.findIndex(r => r.id === result.id); if (idx !== -1) list[idx] = result; else list.push(result); save(KEYS.FORMS_DETAILED, list); };
export const deleteFormsDetailedResult = (id: string) => { save(KEYS.FORMS_DETAILED, get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => r.id !== id)); };

// --- إعدادات AI ---
export const getAISettings = (): AISettings => { const list = get<AISettings>(KEYS.AI_SETTINGS); return list[0] || { modelId: 'gemini-3-flash-preview', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: "" }; };
export const saveAISettings = (s: AISettings) => { save(KEYS.AI_SETTINGS, [s]); };

// --- المزامنة و SQL ---
export const checkConnection = async () => { try { const { error } = await supabase.from('schools').select('id').limit(1); return { success: !error, message: error ? error.message : "متصل" }; } catch { return { success: false, message: "فشل الاتصال" }; } };
export const validateCloudSchema = async () => { const tables = ['schools', 'teachers', 'students', 'attendance', 'performance', 'system_users']; const missing = []; for (const t of tables) { const { error } = await supabase.from(t).select('id').limit(1); if (error && error.code === '42P01') missing.push(t); } return { missingTables: missing }; };
export const fetchCloudTableData = async (table: string) => { const { data, error } = await supabase.from(table).select('*'); if (error) throw error; return data; };
export const clearCloudTable = async (t: string) => { await supabase.from(t).delete().neq('id', '0'); };
export const resetCloudDatabase = async () => { };
export const backupCloudDatabase = async () => JSON.stringify({});
export const restoreCloudDatabase = async (json: string) => { };
export const getDatabaseSchemaSQL = () => `CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT, national_id TEXT, class_id TEXT, school_id TEXT, created_by_id TEXT, grade_level TEXT, class_name TEXT, parent_name TEXT, parent_phone TEXT);`;
export const getDatabaseUpdateSQL = () => `CREATE TABLE IF NOT EXISTS forms_detailed_results (id TEXT PRIMARY KEY, teacher_id TEXT, exam_title TEXT, class_name TEXT, date TEXT, questions JSONB, student_responses JSONB);`;

// --- أخرى ---
export const authenticateUser = async (id: string, pass: string): Promise<SystemUser | null> => { const users = getSystemUsers(); return users.find(u => (u.nationalId === id || u.email === id) && u.password === pass) || null; };
export const authenticateStudent = async (id: string, pass: string): Promise<Student | null> => { const students = getStudents(); return students.find(s => s.nationalId === id && (s.password || '123456') === pass) || null; };
export const initAutoSync = async () => { if (navigator.onLine) { await downloadFromSupabase(); setInterval(uploadToSupabase, 300000); } };
export const uploadToSupabase = async () => { };
export const downloadFromSupabase = async () => { };
export const initRealtimeSync = () => { };
export const stopRealtimeSync = () => { };
export const subscribeToSyncStatus = (f: (s: SyncStatus) => void) => { f('CONNECTED'); return () => {}; };
export const subscribeToDataChanges = (f: () => void) => { return () => {}; };
export const setSystemMode = (b: boolean) => { };
export const createBackup = () => JSON.stringify(localStorage);
export const restoreBackup = (json: string) => { try { const data = JSON.parse(json); Object.keys(data).forEach(key => localStorage.setItem(key, data[key])); return true; } catch { return false; } };
export const clearDatabase = () => { localStorage.clear(); };

export const getTeacherPeriodTimings = (teacherId: string): string[] => { const all = get<{tid: string, times: string[]}>('period_timings'); const found = all.find(x => x.tid === teacherId); return found ? found.times : ["07:00", "07:45", "08:30", "09:45", "10:30", "11:15", "12:00", "12:45"]; };
export const saveTeacherPeriodTimings = (teacherId: string, times: string[]) => { const all = get<{tid: string, times: string[]}>('period_timings'); const idx = all.findIndex(x => x.tid === teacherId); if (idx !== -1) all[idx].times = times; else all.push({ tid: teacherId, times }); save('period_timings', all); };
export const getTeacherAssignments = (teacherId?: string): TeacherAssignment[] => { const all = get<TeacherAssignment>('teacher_class_map'); return teacherId ? all.filter(a => a.teacherId === teacherId) : all; };
export const addTeacherAssignment = (a: TeacherAssignment) => { const list = get<TeacherAssignment>('teacher_class_map'); list.push(a); save('teacher_class_map', list); };
export const deleteTeacherAssignment = (id: string) => { save('teacher_class_map', get<TeacherAssignment>('teacher_class_map').filter(x => x.id !== id)); };

export const getLessonPlans = (teacherId?: string): StoredLessonPlan[] => { const all = get<StoredLessonPlan>(KEYS.LESSON_PLANS); return teacherId ? all.filter(p => p.teacherId === teacherId) : all; };
export const saveLessonPlan = (p: StoredLessonPlan) => { const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS); const idx = list.findIndex(x => x.id === p.id); if (idx !== -1) list[idx] = p; else list.push(p); save(KEYS.LESSON_PLANS, list); };
export const deleteLessonPlan = (id: string) => { save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.id !== id)); };
export const getLessonLinks = (teacherId?: string): LessonLink[] => { const all = get<LessonLink>(KEYS.LESSON_LINKS); return teacherId ? all.filter(l => l.teacherId === teacherId) : all; };
export const saveLessonLink = (l: LessonLink) => { const list = get<LessonLink>(KEYS.LESSON_LINKS); const idx = list.findIndex(x => x.id === l.id); if (idx !== -1) list[idx] = l; else list.push(l); save(KEYS.LESSON_LINKS, list); };
export const deleteLessonLink = (id: string) => { save(KEYS.LESSON_LINKS, get<LessonLink>(KEYS.LESSON_LINKS).filter(l => l.id !== id)); };
export const getSchedules = (): ScheduleItem[] => get<ScheduleItem>(KEYS.SCHEDULES);
export const saveScheduleItem = (s: ScheduleItem) => { const list = getSchedules(); list.push(s); save(KEYS.SCHEDULES, list); };
export const deleteScheduleItem = (id: string) => { save(KEYS.SCHEDULES, get<ScheduleItem>(KEYS.SCHEDULES).filter(s => s.id !== id)); };
export const getWeeklyPlans = (teacherId?: string): WeeklyPlanItem[] => { const all = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS); return teacherId ? all.filter(p => p.teacherId === teacherId) : all; };
export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => { const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS); const idx = list.findIndex(x => x.id === p.id); if (idx !== -1) list[idx] = p; else list.push(p); save(KEYS.WEEKLY_PLANS, list); };
export const getRemedialPlans = (studentId?: string): RemedialPlan[] => { const all = get<RemedialPlan>(KEYS.REMEDIAL_PLANS); return studentId ? all.filter(p => p.studentId === studentId) : all; };
export const saveRemedialPlan = (p: RemedialPlan) => { const list = get<RemedialPlan>(KEYS.REMEDIAL_PLANS); list.push(p); save(KEYS.REMEDIAL_PLANS, list); };
export const getQuestionBank = (teacherId: string): Question[] => get<Question>(KEYS.QUESTION_BANK).filter(q => q.teacherId === teacherId);
export const saveQuestionToBank = (q: Question) => { const list = get<Question>(KEYS.QUESTION_BANK); const idx = list.findIndex(x => x.id === q.id); if (idx !== -1) list[idx] = q; else list.push(q); save(KEYS.QUESTION_BANK, list); };
export const deleteQuestionFromBank = (id: string) => { save(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(q => q.id !== id)); };
export const getExams = (teacherId?: string): Exam[] => { const all = get<Exam>(KEYS.EXAMS); return teacherId ? all.filter(e => e.teacherId === teacherId) : all; };
export const saveExam = (e: Exam) => { const list = get<Exam>(KEYS.EXAMS); const idx = list.findIndex(x => x.id === e.id); if (idx !== -1) list[idx] = e; else list.push(e); save(KEYS.EXAMS, list); };
export const deleteExam = (id: string) => { save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(e => e.id !== id)); };
export const getExamResults = (examId?: string): ExamResult[] => { const all = get<ExamResult>(KEYS.EXAM_RESULTS); return examId ? all.filter(r => r.examId === examId) : all; };
export const saveExamResult = (r: ExamResult) => { const list = get<ExamResult>(KEYS.EXAM_RESULTS); list.push(r); save(KEYS.EXAM_RESULTS, list); };
export const deleteExamResult = (id: string) => { save(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => r.id !== id)); };
export const getTrackingSheets = (teacherId?: string): TrackingSheet[] => { const all = get<TrackingSheet>(KEYS.TRACKING_SHEETS); return teacherId ? all.filter(s => s.teacherId === teacherId) : all; };
export const saveTrackingSheet = (s: TrackingSheet) => { const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) list[idx] = s; else list.push(s); save(KEYS.TRACKING_SHEETS, list); };
export const deleteTrackingSheet = (id: string) => { save(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.id !== id)); };
export const getCustomTables = (teacherId?: string): CustomTable[] => { const all = get<CustomTable>(KEYS.CUSTOM_TABLES); return teacherId ? all.filter(t => t.teacherId === teacherId) : all; };
export const addCustomTable = (t: CustomTable) => { const list = get<CustomTable>(KEYS.CUSTOM_TABLES); list.push(t); save(KEYS.CUSTOM_TABLES, list); };
export const updateCustomTable = (t: CustomTable) => { const list = get<CustomTable>(KEYS.CUSTOM_TABLES); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) { list[idx] = t; save(KEYS.CUSTOM_TABLES, list); } };
export const deleteCustomTable = (id: string) => { save(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => t.id !== id)); };
export const updateStudentLearningStyle = (studentId: string, style: LearningStyle) => { const list = getStudents(); const idx = list.findIndex(s => s.id === studentId); if (idx !== -1) { list[idx].learningStyle = style; save(KEYS.STUDENTS, list); } };
export const saveEnvironmentRecord = (r: EnvironmentRecord) => { const list = get<EnvironmentRecord>(KEYS.ENVIRONMENT); list.push(r); save(KEYS.ENVIRONMENT, list); };
export const getEnvironmentRecords = (classId?: string): EnvironmentRecord[] => { const all = get<EnvironmentRecord>(KEYS.ENVIRONMENT); return classId ? all.filter(r => r.classId === classId) : all; };
export const getCurriculumUnits = (teacherId: string): CurriculumUnit[] => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.teacherId === teacherId);
export const saveCurriculumUnit = (u: CurriculumUnit) => { const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); const idx = list.findIndex(x => x.id === u.id); if (idx !== -1) list[idx] = u; else list.push(u); save(KEYS.CURRICULUM_UNITS, list); };
export const deleteCurriculumUnit = (id: string) => { save(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.id !== id)); };
export const getCurriculumLessons = (): CurriculumLesson[] => get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = (l: CurriculumLesson) => { const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS); const idx = list.findIndex(x => x.id === l.id); if (idx !== -1) list[idx] = l; else list.push(l); save(KEYS.CURRICULUM_LESSONS, list); };
export const deleteCurriculumLesson = (id: string) => { save(KEYS.CURRICULUM_LESSONS, get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => l.id !== id)); };
export const toggleCurriculumLesson = (id: string, completed: boolean) => { const list = getCurriculumLessons(); const idx = list.findIndex(x => x.id === id); if (idx !== -1) { list[idx].isCompleted = completed; list[idx].completedAt = completed ? new Date().toISOString() : undefined; save(KEYS.CURRICULUM_LESSONS, list); } };
export const getWorksMasterUrl = (): string => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);
