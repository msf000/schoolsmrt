
import { 
    Student, AttendanceRecord, PerformanceRecord, Teacher, School, 
    SystemUser, Subject, ScheduleItem, TeacherAssignment, 
    AcademicTerm, WeeklyPlanItem, LessonLink, StoredLessonPlan,
    Exam, AISettings, ReportHeaderConfig, UserTheme, 
    CustomTable, EnvironmentRecord, LearningStyle, CurriculumUnit, 
    CurriculumLesson, Question, ExamResult, TrackingSheet, RemedialPlan,
    MessageLog, FormsDetailedResult, BehaviorIncident, Task, Assignment
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

export const uploadToSupabase = async () => {
    if (!navigator.onLine) return;
    const tables = [
        { key: KEYS.STUDENTS, table: 'students' },
        { key: KEYS.ATTENDANCE, table: 'attendance' },
        { key: KEYS.PERFORMANCE, table: 'performance' },
        { key: KEYS.TERMS, table: 'academic_terms' }
    ];
    
    for (const item of tables) {
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
    const tables = [
        { key: KEYS.STUDENTS, table: 'students' },
        { key: KEYS.ATTENDANCE, table: 'attendance' },
        { key: KEYS.PERFORMANCE, table: 'performance' },
        { key: KEYS.TERMS, table: 'academic_terms' }
    ];

    for (const item of tables) {
        try {
            const { data, error } = await supabase.from(item.table).select('*');
            if (!error && data) save(item.key, data);
        } catch (e) { console.error(`Error downloading ${item.table}:`, e); }
    }
};

export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);

export const saveAttendance = async (records: AttendanceRecord[]) => { 
    const list = get<AttendanceRecord>(KEYS.ATTENDANCE); 
    records.forEach(r => { 
        const idx = list.findIndex(x => x.id === r.id); 
        if (idx !== -1) list[idx] = r; else list.push(r); 
    }); 
    save(KEYS.ATTENDANCE, list); 
    
    if (navigator.onLine) {
        try {
            await supabase.from('attendance').upsert(records, { onConflict: 'id' });
        } catch (e) {
            console.error("Cloud Sync Error:", e);
        }
    }
};

export const deleteAttendance = async (id: string) => {
    const list = get<AttendanceRecord>(KEYS.ATTENDANCE).filter(a => a.id !== id);
    save(KEYS.ATTENDANCE, list);
    
    if (navigator.onLine) {
        try {
            await supabase.from('attendance').delete().eq('id', id);
        } catch (e) {
            console.error("Cloud Delete Error:", e);
        }
    }
};

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

export const initAutoSync = async () => { if (navigator.onLine) { await downloadFromSupabase(); setInterval(uploadToSupabase, 120000); } };
export const getSubjects = (tid?: string): Subject[] => get<Subject>(KEYS.SUBJECTS).filter(s => !tid || s.teacherId === tid);
export const getSchedules = () => get<ScheduleItem>(KEYS.SCHEDULES);
export const getTeacherAssignments = (tid?: string) => get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS).filter(a => !tid || a.teacherId === tid);
export const getTeacherPeriodTimings = (tid: string) => get<{tid: string, times: string[]}>(KEYS.PERIOD_TIMINGS).find(x => x.tid === tid)?.times || ["07:00", "07:45", "08:30", "09:45", "10:30", "11:15", "12:00", "12:45"];
export const getAcademicTerms = (tid?: string): AcademicTerm[] => get<AcademicTerm>(KEYS.TERMS).filter(t => !tid || t.teacherId === tid);
export const saveAcademicTerm = (t: AcademicTerm) => { const list = get<AcademicTerm>(KEYS.TERMS); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) list[idx] = t; else list.push(t); save(KEYS.TERMS, list); uploadToSupabase(); };
export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => { const all = get<ReportHeaderConfig & {teacherId: string}>('report_header_configs'); return all.find(c => c.teacherId === tid) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' }; };
export const getUserTheme = (): UserTheme => { const s = localStorage.getItem(KEYS.USER_THEME); return s ? JSON.parse(s) : { mode: 'LIGHT', backgroundStyle: 'FLAT' }; };
export const saveUserTheme = (t: UserTheme) => { localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t)); };
export const getAISettings = (): AISettings => get<AISettings>(KEYS.AI_SETTINGS)[0] || { modelId: 'gemini-3-flash-preview', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: "" };
export const authenticateUser = async (id: string, p: string) => get<SystemUser>(KEYS.SYSTEM_USERS).find(u => (u.nationalId === id || u.email === id) && u.password === p) || null;
export const authenticateStudent = async (id: string, p: string) => getStudents().find(s => s.nationalId === id && (s.password || '123456') === p) || null;

// Fix: Added missing exported members required by components

export const getTasks = (tid?: string): Task[] => get<Task>(KEYS.TASKS).filter(t => !tid || t.teacherId === tid);
export const saveTask = (t: Task) => {
    const list = get<Task>(KEYS.TASKS);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t; else list.push(t);
    save(KEYS.TASKS, list);
};
export const submitTask = (taskId: string, studentId: string) => {
    const list = get<Task>(KEYS.TASKS);
    const task = list.find(t => t.id === taskId);
    if (task && !task.submissions.includes(studentId)) {
        task.submissions.push(studentId);
        save(KEYS.TASKS, list);
    }
};

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => get<BehaviorIncident>(KEYS.BEHAVIOR_INCIDENTS).filter(i => !tid || i.teacherId === tid);
export const saveBehaviorIncident = (incident: BehaviorIncident) => {
    const list = get<BehaviorIncident>(KEYS.BEHAVIOR_INCIDENTS);
    list.push(incident);
    save(KEYS.BEHAVIOR_INCIDENTS, list);
    
    const students = getStudents();
    const student = students.find(s => s.id === incident.studentId);
    if (student) {
        student.behaviorPoints = (student.behaviorPoints || 0) + incident.points;
        updateStudent(student);
    }
};

export const getAssignments = (cat: string = 'ALL', tid?: string, isManager: boolean = false): Assignment[] => {
    let list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    if (!isManager && tid) list = list.filter(a => a.teacherId === tid);
    if (cat !== 'ALL') list = list.filter(a => a.category === cat);
    return list;
};
export const saveAssignment = (a: Assignment) => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    const idx = list.findIndex(x => x.id === a.id);
    if (idx !== -1) list[idx] = a; else list.push(a);
    save(KEYS.TRACKING_ASSIGNMENTS, list);
};
export const deleteAssignment = (id: string) => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS).filter(a => a.id !== id);
    save(KEYS.TRACKING_ASSIGNMENTS, list);
};

export const getCustomTables = (tid?: string): CustomTable[] => get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => !tid || t.teacherId === tid);
export const addCustomTable = (t: CustomTable) => {
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES);
    list.push(t);
    save(KEYS.CUSTOM_TABLES, list);
};
export const updateCustomTable = (t: CustomTable) => {
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) {
        list[idx] = t;
        save(KEYS.CUSTOM_TABLES, list);
    }
};
export const deleteCustomTable = (id: string) => {
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => t.id !== id);
    save(KEYS.CUSTOM_TABLES, list);
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
    const list = getSchools().filter(s => s.id !== id);
    save(KEYS.SCHOOLS, list);
};

export const getTeachers = (): Teacher[] => get<Teacher>(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => {
    const list = getTeachers();
    list.push(t);
    save(KEYS.TEACHERS, list);
    
    const user: SystemUser = {
        id: t.id,
        name: t.name,
        email: t.email || '',
        nationalId: t.nationalId,
        password: t.password || '123456',
        role: 'TEACHER',
        schoolId: t.schoolId,
        status: 'ACTIVE'
    };
    await addSystemUser(user);
};
export const updateTeacher = async (t: Teacher) => {
    const list = getTeachers();
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) {
        list[idx] = t;
        save(KEYS.TEACHERS, list);
    }
};

export const getSystemUsers = (): SystemUser[] => get<SystemUser>(KEYS.SYSTEM_USERS);
export const addSystemUser = async (u: SystemUser) => {
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
    const list = getSystemUsers().filter(u => u.id !== id);
    save(KEYS.SYSTEM_USERS, list);
};

export const deleteAcademicTerm = (id: string) => {
    const list = get<AcademicTerm>(KEYS.TERMS).filter(t => t.id !== id);
    save(KEYS.TERMS, list);
};
export const setCurrentTerm = (id: string, tid: string) => {
    const list = get<AcademicTerm>(KEYS.TERMS);
    list.forEach(t => {
        if (t.teacherId === tid) t.isCurrent = (t.id === id);
    });
    save(KEYS.TERMS, list);
};

export const addSubject = (s: Subject) => {
    const list = get<Subject>(KEYS.SUBJECTS);
    list.push(s);
    save(KEYS.SUBJECTS, list);
};
export const deleteSubject = (id: string) => {
    const list = get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id);
    save(KEYS.SUBJECTS, list);
};

export const saveReportHeaderConfig = (c: ReportHeaderConfig & {teacherId: string}) => {
    const all = get<ReportHeaderConfig & {teacherId: string}>('report_header_configs');
    const idx = all.findIndex(x => x.teacherId === c.teacherId);
    if (idx !== -1) all[idx] = c; else all.push(c);
    save('report_header_configs', all);
};

export const saveTeacherPeriodTimings = (tid: string, times: string[]) => {
    const list = get<{tid: string, times: string[]}>(KEYS.PERIOD_TIMINGS);
    const idx = list.findIndex(x => x.tid === tid);
    if (idx !== -1) list[idx].times = times; else list.push({ tid, times });
    save(KEYS.PERIOD_TIMINGS, list);
};

export const addTeacherAssignment = (a: TeacherAssignment) => {
    const list = get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS);
    list.push(a);
    save(KEYS.TEACHER_ASSIGNMENTS, list);
};
export const deleteTeacherAssignment = (id: string) => {
    const list = get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS).filter(a => a.id !== id);
    save(KEYS.TEACHER_ASSIGNMENTS, list);
};

export const createBackup = () => {
    const data: any = {};
    Object.values(KEYS).forEach(key => {
        data[key] = localStorage.getItem(key);
    });
    return JSON.stringify(data);
};
export const restoreBackup = (json: string) => {
    const data = JSON.parse(json);
    Object.keys(data).forEach(key => {
        if (data[key]) localStorage.setItem(key, data[key]);
    });
};
export const clearDatabase = () => {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
};

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('schools').select('id').limit(1);
        return { success: !error };
    } catch { return { success: false }; }
};
export const fetchCloudTableData = async (tableName: string) => {
    const { data } = await supabase.from(tableName).select('*').limit(100);
    return data || [];
};
export const DB_MAP = {
    SCHOOLS: 'schools',
    TEACHERS: 'teachers',
    STUDENTS: 'students',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    SYSTEM_USERS: 'system_users',
    SUBJECTS: 'subjects',
    TERMS: 'academic_terms'
};
export const getTableDisplayName = (tableName: string) => {
    return tableName.charAt(0).toUpperCase() + tableName.slice(1);
};
export const getDatabaseSchemaSQL = () => {
    return `
CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY, name TEXT, ministry_code TEXT, manager_name TEXT, manager_national_id TEXT, type TEXT, phone TEXT, student_count INTEGER, education_administration TEXT);
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT, national_id TEXT, class_id TEXT, school_id TEXT, created_by_id TEXT, grade_level TEXT, class_name TEXT, email TEXT, phone TEXT, parent_id TEXT, parent_name TEXT, parent_phone TEXT, parent_email TEXT, password TEXT, seat_index INTEGER, learning_style TEXT, behavior_points INTEGER);
CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, student_id TEXT, date TEXT, status TEXT, subject TEXT, period INTEGER, behavior_status TEXT, behavior_note TEXT, participation_score INTEGER, excuse_note TEXT, excuse_file TEXT, created_by_id TEXT, term_id TEXT);
CREATE TABLE IF NOT EXISTS performance (id TEXT PRIMARY KEY, student_id TEXT, subject TEXT, title TEXT, category TEXT, score REAL, max_score REAL, date TEXT, notes TEXT, url TEXT, created_by_id TEXT);
CREATE TABLE IF NOT EXISTS academic_terms (id TEXT PRIMARY KEY, name TEXT, start_date TEXT, end_date TEXT, is_current BOOLEAN, teacher_id TEXT, periods JSONB);
CREATE TABLE IF NOT EXISTS system_users (id TEXT PRIMARY KEY, name TEXT, email TEXT, national_id TEXT, password TEXT, role TEXT, school_id TEXT, status TEXT, is_demo BOOLEAN, phone TEXT);
    `;
};
export const getDatabaseUpdateSQL = () => {
    return `-- Update Script\nALTER TABLE students ADD COLUMN IF NOT EXISTS learning_style TEXT;`;
};
export const clearCloudTable = async (tableName: string) => {
    await supabase.from(tableName).delete().neq('id', 'placeholder');
};
export const resetCloudDatabase = async () => {
    for (const table of Object.values(DB_MAP)) {
        await clearCloudTable(table);
    }
};
export const backupCloudDatabase = async () => {
    const backup: any = {};
    for (const table of Object.values(DB_MAP)) {
        const { data } = await supabase.from(table).select('*');
        backup[table] = data;
    }
    return JSON.stringify(backup);
};
export const restoreCloudDatabase = async (json: string) => {
    const data = JSON.parse(json);
    for (const table of Object.keys(data)) {
        if (data[table] && data[table].length > 0) {
            await supabase.from(table).upsert(data[table]);
        }
    }
};
export const validateCloudSchema = async () => {
    return { missingTables: [] }; 
};

export const saveAISettings = (settings: AISettings) => {
    save(KEYS.AI_SETTINGS, [settings]);
};

export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

export const setSystemMode = (isTeacher: boolean) => localStorage.setItem('is_teacher_mode', String(isTeacher));

export const getExams = (tid?: string): Exam[] => get<Exam>(KEYS.EXAMS).filter(e => !tid || e.teacherId === tid);
export const saveExam = (e: Exam) => {
    const list = get<Exam>(KEYS.EXAMS);
    const idx = list.findIndex(x => x.id === e.id);
    if (idx !== -1) list[idx] = e; else list.push(e);
    save(KEYS.EXAMS, list);
};
export const deleteExam = (id: string) => {
    const list = get<Exam>(KEYS.EXAMS).filter(e => e.id !== id);
    save(KEYS.EXAMS, list);
};

export const getExamResults = (examId?: string): ExamResult[] => get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => !examId || r.examId === examId);
export const saveExamResult = (r: ExamResult) => {
    const list = get<ExamResult>(KEYS.EXAM_RESULTS);
    list.push(r);
    save(KEYS.EXAM_RESULTS, list);
};
export const deleteExamResult = (id: string) => {
    const list = get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => r.id !== id);
    save(KEYS.EXAM_RESULTS, list);
};

export const getLessonLinks = (): LessonLink[] => get<LessonLink>(KEYS.LESSON_LINKS);
export const saveLessonLink = (l: LessonLink) => {
    const list = get<LessonLink>(KEYS.LESSON_LINKS);
    list.push(l);
    save(KEYS.LESSON_LINKS, list);
};
export const deleteLessonLink = (id: string) => {
    const list = get<LessonLink>(KEYS.LESSON_LINKS).filter(l => l.id !== id);
    save(KEYS.LESSON_LINKS, list);
};

export const getMessages = (tid?: string): MessageLog[] => get<MessageLog>(KEYS.MESSAGES).filter(m => !tid || m.teacherId === tid);
export const saveMessage = (m: MessageLog) => {
    const list = get<MessageLog>(KEYS.MESSAGES);
    list.push(m);
    save(KEYS.MESSAGES, list);
};

export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS).filter(p => p.teacherId === tid);
export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => {
    const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = list.findIndex(x => x.id === p.id);
    if (idx !== -1) list[idx] = p; else list.push(p);
    save(KEYS.WEEKLY_PLANS, list);
};

export const getLessonPlans = (tid: string): StoredLessonPlan[] => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.teacherId === tid);
export const saveLessonPlan = (p: StoredLessonPlan) => {
    const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS);
    const idx = list.findIndex(x => x.id === p.id);
    if (idx !== -1) list[idx] = p; else list.push(p);
    save(KEYS.LESSON_PLANS, list);
};
export const deleteLessonPlan = (id: string) => {
    const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.id !== id);
    save(KEYS.LESSON_PLANS, list);
};

export const getEnvironmentRecords = (classId: string): EnvironmentRecord[] => get<EnvironmentRecord>(KEYS.ENVIRONMENT).filter(r => r.classId === classId);
export const saveEnvironmentRecord = (r: EnvironmentRecord) => {
    const list = get<EnvironmentRecord>(KEYS.ENVIRONMENT);
    list.push(r);
    save(KEYS.ENVIRONMENT, list);
};

export const getQuestionBank = (tid: string): Question[] => get<Question>(KEYS.QUESTION_BANK).filter(q => q.teacherId === tid);
export const saveQuestionToBank = (q: Question) => {
    const list = get<Question>(KEYS.QUESTION_BANK);
    const idx = list.findIndex(x => x.id === q.id);
    if (idx !== -1) list[idx] = q; else list.push(q);
    save(KEYS.QUESTION_BANK, list);
};
export const deleteQuestionFromBank = (id: string) => {
    const list = get<Question>(KEYS.QUESTION_BANK).filter(q => q.id !== id);
    save(KEYS.QUESTION_BANK, list);
};

export const getCurriculumUnits = (tid: string): CurriculumUnit[] => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.teacherId === tid);
export const saveCurriculumUnit = (u: CurriculumUnit) => {
    const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS);
    const idx = list.findIndex(x => x.id === u.id);
    if (idx !== -1) list[idx] = u; else list.push(u);
    save(KEYS.CURRICULUM_UNITS, list);
};
export const deleteCurriculumUnit = (id: string) => {
    const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.id !== id);
    save(KEYS.CURRICULUM_UNITS, list);
    const lessons = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => l.unitId !== id);
    save(KEYS.CURRICULUM_LESSONS, lessons);
};
export const getCurriculumLessons = (): CurriculumLesson[] => get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = (l: CurriculumLesson) => {
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(x => x.id === l.id);
    if (idx !== -1) list[idx] = l; else list.push(l);
    save(KEYS.CURRICULUM_LESSONS, list);
};
export const deleteCurriculumLesson = (id: string) => {
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => l.id !== id);
    save(KEYS.CURRICULUM_LESSONS, list);
};
export const toggleCurriculumLesson = (id: string, completed: boolean) => {
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(x => x.id === id);
    if (idx !== -1) {
        list[idx].isCompleted = completed;
        if (completed) list[idx].completedAt = new Date().toISOString();
        save(KEYS.CURRICULUM_LESSONS, list);
    }
};

export const getTrackingSheets = (tid: string): TrackingSheet[] => get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.teacherId === tid);
export const saveTrackingSheet = (s: TrackingSheet) => {
    const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) list[idx] = s; else list.push(s);
    save(KEYS.TRACKING_SHEETS, list);
};
export const deleteTrackingSheet = (id: string) => {
    const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.id !== id);
    save(KEYS.TRACKING_SHEETS, list);
};

export const saveRemedialPlan = (p: RemedialPlan) => {
    const list = get<RemedialPlan>(KEYS.REMEDIAL_PLANS);
    list.push(p);
    save(KEYS.REMEDIAL_PLANS, list);
};
export const getRemedialPlans = (): RemedialPlan[] => get<RemedialPlan>(KEYS.REMEDIAL_PLANS);

export const saveFormsDetailedResult = (r: FormsDetailedResult) => {
    const list = get<FormsDetailedResult>(KEYS.FORMS_DETAILED);
    list.push(r);
    save(KEYS.FORMS_DETAILED, list);
};
export const getFormsDetailedResults = (tid: string): FormsDetailedResult[] => get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => r.teacherId === tid);
export const deleteFormsDetailedResult = (id: string) => {
    const list = get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => r.id !== id);
    save(KEYS.FORMS_DETAILED, list);
};

export const updateStudentLearningStyle = (sid: string, style: LearningStyle) => {
    const list = getStudents();
    const idx = list.findIndex(s => s.id === sid);
    if (idx !== -1) {
        list[idx].learningStyle = style;
        save(KEYS.STUDENTS, list);
    }
};

export const saveScheduleItem = (item: ScheduleItem) => {
    const list = get<ScheduleItem>(KEYS.SCHEDULES);
    list.push(item);
    save(KEYS.SCHEDULES, list);
};
export const deleteScheduleItem = (id: string) => {
    const list = get<ScheduleItem>(KEYS.SCHEDULES).filter(s => s.id !== id);
    save(KEYS.SCHEDULES, list);
};
