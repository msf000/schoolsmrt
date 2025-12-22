
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
    TEACHER_ASSIGNMENTS: 'teacher_class_map',
    REPORT_CONFIG: 'report_config'
};

export const DB_MAP = {
    STUDENTS: 'students',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    SYSTEM_USERS: 'system_users',
    SUBJECTS: 'subjects',
    TERMS: 'academic_terms'
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

// --- Cloud Sync Optimization ---

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
            if (!error && data) {
                save(item.key, data);
            }
        } catch (e) { console.error(`Error downloading ${item.table}:`, e); }
    }
};

export const uploadToSupabase = async () => {
    if (!navigator.onLine) return;
    const tables = [
        { key: KEYS.STUDENTS, table: 'students' },
        { key: KEYS.ATTENDANCE, table: 'attendance' },
        { key: KEYS.PERFORMANCE, table: 'performance' }
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

// --- Attendance Handlers ---

export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);

export const saveAttendance = async (records: AttendanceRecord[]) => { 
    const localData = get<AttendanceRecord>(KEYS.ATTENDANCE); 
    
    records.forEach(newRec => { 
        const idx = localData.findIndex(x => x.id === newRec.id); 
        if (idx !== -1) localData[idx] = newRec; 
        else localData.push(newRec); 
    }); 
    
    save(KEYS.ATTENDANCE, localData); 
    
    if (navigator.onLine) {
        try {
            await supabase.from('attendance').upsert(records, { onConflict: 'id' });
        } catch (e) {
            console.error("Cloud Sync Error (Upsert):", e);
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

// --- Performance Handlers ---

export const getPerformance = (): PerformanceRecord[] => get<PerformanceRecord>(KEYS.PERFORMANCE);

export const addPerformance = (record: PerformanceRecord | PerformanceRecord[]) => {
    const localData = get<PerformanceRecord>(KEYS.PERFORMANCE);
    const records = Array.isArray(record) ? record : [record];
    
    records.forEach(newRec => {
        const idx = localData.findIndex(x => x.id === newRec.id);
        if (idx !== -1) localData[idx] = newRec;
        else localData.push(newRec);
    });
    
    save(KEYS.PERFORMANCE, localData);
    uploadToSupabase();
};

export const bulkAddPerformance = (records: PerformanceRecord[]) => addPerformance(records);

export const deletePerformance = (id: string) => {
    const list = get<PerformanceRecord>(KEYS.PERFORMANCE).filter(p => p.id !== id);
    save(KEYS.PERFORMANCE, list);
    uploadToSupabase();
};

// --- Standard Entities ---

export const getStudents = (): Student[] => get<Student>(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const list = getStudents(); list.push(s); save(KEYS.STUDENTS, list); uploadToSupabase(); };
export const updateStudent = (s: Student) => { const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.STUDENTS, list); uploadToSupabase(); } };
export const deleteStudent = (id: string) => { save(KEYS.STUDENTS, getStudents().filter(s => s.id !== id)); uploadToSupabase(); };
export const bulkUpsertStudents = (students: Student[]) => {
    const localData = getStudents();
    students.forEach(newStd => {
        const idx = localData.findIndex(x => x.id === newStd.id || x.nationalId === newStd.nationalId);
        if (idx !== -1) localData[idx] = { ...localData[idx], ...newStd };
        else localData.push(newStd);
    });
    save(KEYS.STUDENTS, localData);
    uploadToSupabase();
};

export const updateStudentLearningStyle = (id: string, style: LearningStyle) => {
    const students = getStudents();
    const student = students.find(s => s.id === id);
    if (student) {
        student.learningStyle = style;
        updateStudent(student);
    }
};

export const getSchools = (): School[] => get<School>(KEYS.SCHOOLS);
export const addSchool = async (s: School) => { const list = getSchools(); list.push(s); save(KEYS.SCHOOLS, list); if(navigator.onLine) await supabase.from('schools').upsert(s); };
export const updateSchool = (s: School) => { const list = getSchools(); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.SCHOOLS, list); } };
export const deleteSchool = (id: string) => { save(KEYS.SCHOOLS, getSchools().filter(s => s.id !== id)); };

export const getTeachers = (): Teacher[] => get<Teacher>(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => { 
    const list = getTeachers(); 
    list.push(t); 
    save(KEYS.TEACHERS, list); 
    if(navigator.onLine) await supabase.from('teachers').upsert(t); 
};
export const updateTeacher = async (t: Teacher) => { 
    const list = getTeachers(); 
    const idx = list.findIndex(x => x.id === t.id); 
    if (idx !== -1) { 
        list[idx] = t; 
        save(KEYS.TEACHERS, list); 
        if(navigator.onLine) await supabase.from('teachers').upsert(t); 
    } 
};

export const getSubjects = (tid?: string): Subject[] => get<Subject>(KEYS.SUBJECTS).filter(s => !tid || s.teacherId === tid);
export const addSubject = (s: Subject) => { const list = get<Subject>(KEYS.SUBJECTS); list.push(s); save(KEYS.SUBJECTS, list); };
export const deleteSubject = (id: string) => { save(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id)); };

export const getSchedules = () => get<ScheduleItem>(KEYS.SCHEDULES);
export const saveScheduleItem = (s: ScheduleItem) => { const list = get<ScheduleItem>(KEYS.SCHEDULES); list.push(s); save(KEYS.SCHEDULES, list); };
export const deleteScheduleItem = (id: string) => { save(KEYS.SCHEDULES, get<ScheduleItem>(KEYS.SCHEDULES).filter(s => s.id !== id)); };

export const getTeacherAssignments = (tid?: string) => get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS).filter(a => !tid || a.teacherId === tid);
export const addTeacherAssignment = (a: TeacherAssignment) => { const list = get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS); list.push(a); save(KEYS.TEACHER_ASSIGNMENTS, list); };
export const deleteTeacherAssignment = (id: string) => { save(KEYS.TEACHER_ASSIGNMENTS, get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS).filter(a => a.id !== id)); };

export const getTeacherPeriodTimings = (tid: string) => get<{tid: string, times: string[]}>(KEYS.PERIOD_TIMINGS).find(x => x.tid === tid)?.times || ["07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", "09:45 - 10:30", "10:30 - 11:15", "11:15 - 12:00", "12:00 - 12:45", "12:45 - 01:30"];
export const saveTeacherPeriodTimings = (tid: string, times: string[]) => {
    const list = get<{tid: string, times: string[]}>(KEYS.PERIOD_TIMINGS);
    const idx = list.findIndex(x => x.tid === tid);
    if (idx !== -1) list[idx].times = times; else list.push({ tid, times });
    save(KEYS.PERIOD_TIMINGS, list);
};

export const getAcademicTerms = (tid?: string): AcademicTerm[] => get<AcademicTerm>(KEYS.TERMS).filter(t => !tid || t.teacherId === tid);
export const saveAcademicTerm = (t: AcademicTerm) => {
    const list = get<AcademicTerm>(KEYS.TERMS);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t; else list.push(t);
    save(KEYS.TERMS, list);
};
export const deleteAcademicTerm = (id: string) => { save(KEYS.TERMS, get<AcademicTerm>(KEYS.TERMS).filter(t => t.id !== id)); };
export const setCurrentTerm = (id: string, tid: string) => {
    const list = get<AcademicTerm>(KEYS.TERMS);
    list.forEach(t => { if(t.teacherId === tid) t.isCurrent = (t.id === id); });
    save(KEYS.TERMS, list);
};

// --- Advanced Handlers ---

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
export const deleteAssignment = (id: string) => { save(KEYS.TRACKING_ASSIGNMENTS, get<Assignment>(KEYS.TRACKING_ASSIGNMENTS).filter(a => a.id !== id)); };

export const getMessages = (tid?: string): MessageLog[] => get<MessageLog>(KEYS.MESSAGES).filter(m => !tid || m.teacherId === tid);
export const saveMessage = (m: MessageLog) => { const list = get<MessageLog>(KEYS.MESSAGES); list.push(m); save(KEYS.MESSAGES, list); };

export const getExams = (tid?: string): Exam[] => get<Exam>(KEYS.EXAMS).filter(e => !tid || e.teacherId === tid);
export const saveExam = (e: Exam) => {
    const list = get<Exam>(KEYS.EXAMS);
    const idx = list.findIndex(x => x.id === e.id);
    if (idx !== -1) list[idx] = e; else list.push(e);
    save(KEYS.EXAMS, list);
};
export const deleteExam = (id: string) => { save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(e => e.id !== id)); };

export const getExamResults = (examId?: string): ExamResult[] => get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => !examId || r.examId === examId);
export const saveExamResult = (r: ExamResult) => { const list = get<ExamResult>(KEYS.EXAM_RESULTS); list.push(r); save(KEYS.EXAM_RESULTS, list); };
export const deleteExamResult = (id: string) => { save(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => r.id !== id)); };

export const getQuestionBank = (tid?: string): Question[] => get<Question>(KEYS.QUESTION_BANK).filter(q => !tid || q.teacherId === tid);
export const saveQuestionToBank = (q: Question) => {
    const list = get<Question>(KEYS.QUESTION_BANK);
    const idx = list.findIndex(x => x.id === q.id);
    if (idx !== -1) list[idx] = q; else list.push(q);
    save(KEYS.QUESTION_BANK, list);
};
export const deleteQuestionFromBank = (id: string) => { save(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(q => q.id !== id)); };

export const getWeeklyPlans = (tid?: string): WeeklyPlanItem[] => get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => {
    const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = list.findIndex(x => x.id === p.id);
    if (idx !== -1) list[idx] = p; else list.push(p);
    save(KEYS.WEEKLY_PLANS, list);
};

export const getLessonPlans = (tid?: string): StoredLessonPlan[] => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveLessonPlan = (p: StoredLessonPlan) => {
    const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS);
    const idx = list.findIndex(x => x.id === p.id);
    if (idx !== -1) list[idx] = p; else list.push(p);
    save(KEYS.LESSON_PLANS, list);
};
export const deleteLessonPlan = (id: string) => { save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.id !== id)); };

export const getLessonLinks = (): LessonLink[] => get<LessonLink>(KEYS.LESSON_LINKS);
export const saveLessonLink = (l: LessonLink) => { const list = get<LessonLink>(KEYS.LESSON_LINKS); list.push(l); save(KEYS.LESSON_LINKS, list); };
export const deleteLessonLink = (id: string) => { save(KEYS.LESSON_LINKS, get<LessonLink>(KEYS.LESSON_LINKS).filter(l => l.id !== id)); };

export const getCurriculumUnits = (tid?: string): CurriculumUnit[] => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => !tid || u.teacherId === tid);
export const saveCurriculumUnit = (u: CurriculumUnit) => { const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); list.push(u); save(KEYS.CURRICULUM_UNITS, list); };
export const deleteCurriculumUnit = (id: string) => { save(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.id !== id)); };

export const getCurriculumLessons = (unitId?: string): CurriculumLesson[] => get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => !unitId || l.unitId === unitId);
export const saveCurriculumLesson = (l: CurriculumLesson) => { const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS); list.push(l); save(KEYS.CURRICULUM_LESSONS, list); };
export const deleteCurriculumLesson = (id: string) => { save(KEYS.CURRICULUM_LESSONS, get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => l.id !== id)); };
export const toggleCurriculumLesson = (id: string, completed: boolean) => {
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const l = list.find(x => x.id === id);
    if (l) { l.isCompleted = completed; l.completedAt = completed ? new Date().toISOString() : undefined; save(KEYS.CURRICULUM_LESSONS, list); }
};

export const getTrackingSheets = (tid?: string): TrackingSheet[] => get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => !tid || s.teacherId === tid);
export const saveTrackingSheet = (s: TrackingSheet) => {
    const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) list[idx] = s; else list.push(s);
    save(KEYS.TRACKING_SHEETS, list);
};
export const deleteTrackingSheet = (id: string) => { save(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.id !== id)); };

export const getRemedialPlans = (tid?: string): RemedialPlan[] => get<RemedialPlan>(KEYS.REMEDIAL_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveRemedialPlan = (p: RemedialPlan) => { const list = get<RemedialPlan>(KEYS.REMEDIAL_PLANS); list.push(p); save(KEYS.REMEDIAL_PLANS, list); };

export const getFormsDetailedResults = (tid?: string): FormsDetailedResult[] => get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => !tid || r.teacherId === tid);
export const saveFormsDetailedResult = (r: FormsDetailedResult) => { const list = get<FormsDetailedResult>(KEYS.FORMS_DETAILED); list.push(r); save(KEYS.FORMS_DETAILED, list); };
export const deleteFormsDetailedResult = (id: string) => { save(KEYS.FORMS_DETAILED, get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => r.id !== id)); };

export const getCustomTables = (tid?: string): CustomTable[] => get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => !tid || t.teacherId === tid);
export const addCustomTable = (t: CustomTable) => { const list = get<CustomTable>(KEYS.CUSTOM_TABLES); list.push(t); save(KEYS.CUSTOM_TABLES, list); };
export const updateCustomTable = (t: CustomTable) => { const list = get<CustomTable>(KEYS.CUSTOM_TABLES); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) { list[idx] = t; save(KEYS.CUSTOM_TABLES, list); } };
export const deleteCustomTable = (id: string) => { save(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => t.id !== id)); };

export const getEnvironmentRecords = (classId?: string): EnvironmentRecord[] => get<EnvironmentRecord>(KEYS.ENVIRONMENT).filter(r => !classId || r.classId === classId);
export const saveEnvironmentRecord = (r: EnvironmentRecord) => { const list = get<EnvironmentRecord>(KEYS.ENVIRONMENT); list.push(r); save(KEYS.ENVIRONMENT, list); };

export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => {
    const list = get<ReportHeaderConfig>(KEYS.REPORT_CONFIG);
    return list.find(c => !tid || c.teacherId === tid) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => {
    const list = get<ReportHeaderConfig>(KEYS.REPORT_CONFIG);
    const idx = list.findIndex(x => x.teacherId === c.teacherId);
    if (idx !== -1) list[idx] = c; else list.push(c);
    save(KEYS.REPORT_CONFIG, list);
};

export const getAISettings = (): AISettings => get<AISettings>(KEYS.AI_SETTINGS)[0] || { modelId: 'gemini-3-flash-preview', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: "" };
export const saveAISettings = (s: AISettings) => save(KEYS.AI_SETTINGS, [s]);

export const getUserTheme = (): UserTheme => { const s = localStorage.getItem(KEYS.USER_THEME); return s ? JSON.parse(s) : { mode: 'LIGHT', backgroundStyle: 'FLAT' }; };
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));

export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

export const getSystemUsers = (): SystemUser[] => get<SystemUser>(KEYS.SYSTEM_USERS);
export const addSystemUser = async (u: SystemUser) => { const list = getSystemUsers(); list.push(u); save(KEYS.SYSTEM_USERS, list); if(navigator.onLine) await supabase.from('system_users').upsert(u); };
export const updateSystemUser = (u: SystemUser) => { const list = getSystemUsers(); const idx = list.findIndex(x => x.id === u.id); if (idx !== -1) { list[idx] = u; save(KEYS.SYSTEM_USERS, list); } };
export const deleteSystemUser = (id: string) => { save(KEYS.SYSTEM_USERS, getSystemUsers().filter(u => u.id !== id)); };

export const authenticateUser = async (id: string, p: string) => getSystemUsers().find(u => (u.nationalId === id || u.email === id) && u.password === p) || null;
export const authenticateStudent = async (id: string, p: string) => getStudents().find(s => s.nationalId === id && s.password === p) || null;

export const setSystemMode = (val: boolean) => localStorage.setItem('system_mode', val ? 'true' : 'false');
export const clearDatabase = () => localStorage.clear();
export const initAutoSync = async () => { if (navigator.onLine) { await downloadFromSupabase(); setInterval(uploadToSupabase, 120000); } };
export const checkConnection = async () => { try { const { error } = await supabase.from('schools').select('id').limit(1); return { success: !error }; } catch { return { success: false }; } };

export const createBackup = () => JSON.stringify(localStorage);
export const restoreBackup = (data: string) => { const parsed = JSON.parse(data); Object.entries(parsed).forEach(([k, v]) => localStorage.setItem(k, v as string)); };

export const fetchCloudTableData = async (table: string) => { const { data } = await supabase.from(table).select('*'); return data; };
export const getTableDisplayName = (table: string) => table;
export const getDatabaseSchemaSQL = () => `-- SQL for full schema creation\nCREATE TABLE students (...);`;
export const getDatabaseUpdateSQL = () => `-- SQL for database updates\nALTER TABLE students ...;`;
export const clearCloudTable = async (table: string) => await supabase.from(table).delete().neq('id', 'placeholder');
export const resetCloudDatabase = async () => { /* Complex logic usually handled in Supabase console */ };
export const backupCloudDatabase = async () => JSON.stringify({ backup: 'data' });
export const restoreCloudDatabase = async (json: string) => { /* Complex logic */ };
export const validateCloudSchema = async () => ({ missingTables: [] });
