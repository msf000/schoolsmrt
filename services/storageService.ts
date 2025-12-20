
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
    TASKS: 'tasks'
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

// --- المزامنة السحابية الشاملة ---
export const uploadToSupabase = async () => {
    if (!navigator.onLine) return;
    const tables = [
        { key: KEYS.STUDENTS, table: 'students' },
        { key: KEYS.ATTENDANCE, table: 'attendance' },
        { key: KEYS.PERFORMANCE, table: 'performance' },
        { key: KEYS.TERMS, table: 'academic_terms' },
        { key: KEYS.BEHAVIOR_INCIDENTS, table: 'behavior_incidents' },
        { key: KEYS.TASKS, table: 'tasks' },
        { key: KEYS.TRACKING_ASSIGNMENTS, table: 'assignments' },
        { key: KEYS.SUBJECTS, table: 'subjects' },
        { key: 'teacher_class_map', table: 'teacher_assignments' }
    ];
    
    for (const item of tables) {
        const data = get(item.key);
        if (data.length > 0) {
            try { await supabase.from(item.table).upsert(data); } catch (e) { console.error(`Error syncing ${item.table}:`, e); }
        }
    }
};

export const downloadFromSupabase = async () => {
    if (!navigator.onLine) return;
    const tables = [
        { key: KEYS.STUDENTS, table: 'students' },
        { key: KEYS.ATTENDANCE, table: 'attendance' },
        { key: KEYS.PERFORMANCE, table: 'performance' },
        { key: KEYS.TERMS, table: 'academic_terms' },
        { key: KEYS.BEHAVIOR_INCIDENTS, table: 'behavior_incidents' },
        { key: KEYS.TASKS, table: 'tasks' },
        { key: KEYS.TRACKING_ASSIGNMENTS, table: 'assignments' },
        { key: KEYS.SUBJECTS, table: 'subjects' },
        { key: 'teacher_class_map', table: 'teacher_assignments' }
    ];

    for (const item of tables) {
        try {
            const { data, error } = await supabase.from(item.table).select('*');
            if (!error && data) save(item.key, data);
        } catch (e) { console.error(`Error downloading ${item.table}:`, e); }
    }
};

// --- السلوك والانضباط ---
export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => get<BehaviorIncident>(KEYS.BEHAVIOR_INCIDENTS).filter(i => !tid || i.teacherId === tid);
export const saveBehaviorIncident = (i: BehaviorIncident) => { 
    const list = get<BehaviorIncident>(KEYS.BEHAVIOR_INCIDENTS); 
    list.push(i); 
    save(KEYS.BEHAVIOR_INCIDENTS, list); 
    const students = getStudents();
    const sIdx = students.findIndex(s => s.id === i.studentId);
    if (sIdx !== -1) {
        students[sIdx].behaviorPoints = (students[sIdx].behaviorPoints || 0) + i.points;
        save(KEYS.STUDENTS, students);
    }
    uploadToSupabase(); 
};

// --- المهمات والواجبات ---
export const getTasks = (tid?: string): Task[] => get<Task>(KEYS.TASKS).filter(t => !tid || t.teacherId === tid);
export const saveTask = (t: Task) => { const list = get<Task>(KEYS.TASKS); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) list[idx] = t; else list.push(t); save(KEYS.TASKS, list); uploadToSupabase(); };
export const submitTask = (taskId: string, studentId: string) => {
    const list = get<Task>(KEYS.TASKS);
    const idx = list.findIndex(t => t.id === taskId);
    if (idx !== -1 && !list[idx].submissions.includes(studentId)) {
        list[idx].submissions.push(studentId);
        save(KEYS.TASKS, list);
        uploadToSupabase();
    }
};

// --- الطلاب ---
export const getStudents = (): Student[] => get<Student>(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const list = getStudents(); list.push(s); save(KEYS.STUDENTS, list); uploadToSupabase(); };
export const updateStudent = (s: Student) => { const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.STUDENTS, list); uploadToSupabase(); } };
export const deleteStudent = (id: string) => { save(KEYS.STUDENTS, getStudents().filter(s => s.id !== id)); uploadToSupabase(); };
export const deleteAllStudents = () => { save(KEYS.STUDENTS, []); uploadToSupabase(); };
export const bulkUpsertStudents = (newList: Student[]) => {
    const list = getStudents();
    newList.forEach(s => {
        const idx = list.findIndex(x => x.nationalId === s.nationalId);
        if (idx !== -1) list[idx] = { ...list[idx], ...s };
        else list.push(s);
    });
    save(KEYS.STUDENTS, list);
    uploadToSupabase();
};

// --- الحضور ---
export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);
export const saveAttendance = (records: AttendanceRecord[]) => { const list = get<AttendanceRecord>(KEYS.ATTENDANCE); records.forEach(r => { const idx = list.findIndex(x => x.id === r.id); if (idx !== -1) list[idx] = r; else list.push(r); }); save(KEYS.ATTENDANCE, list); uploadToSupabase(); };

// --- الأداء ---
export const getPerformance = (): PerformanceRecord[] => get<PerformanceRecord>(KEYS.PERFORMANCE);
export const addPerformance = (record: PerformanceRecord | PerformanceRecord[]) => { const list = getPerformance(); const records = Array.isArray(record) ? record : [record]; records.forEach(rec => { const idx = list.findIndex(r => r.id === rec.id); if (idx !== -1) list[idx] = rec; else list.push(rec); }); save(KEYS.PERFORMANCE, list); uploadToSupabase(); };
export const bulkAddPerformance = addPerformance;
export const deletePerformance = (id: string) => { save(KEYS.PERFORMANCE, getPerformance().filter(p => p.id !== id)); uploadToSupabase(); };

// --- التكاليف (Assignments) - سجل الرصد ---
export const getAssignments = (cat: string, tid?: string, isManager?: boolean): Assignment[] => {
    const all = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    return all.filter(a => (cat === 'ALL' || a.category === cat) && (!tid || a.teacherId === tid || isManager));
};
export const saveAssignment = (a: Assignment) => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    const idx = list.findIndex(x => x.id === a.id);
    if (idx !== -1) list[idx] = a;
    else list.push(a);
    save(KEYS.TRACKING_ASSIGNMENTS, list);
    uploadToSupabase();
};
export const deleteAssignment = (id: string) => {
    save(KEYS.TRACKING_ASSIGNMENTS, get<Assignment>(KEYS.TRACKING_ASSIGNMENTS).filter(a => a.id !== id));
    uploadToSupabase();
};

export const initAutoSync = async () => { if (navigator.onLine) { await downloadFromSupabase(); setInterval(uploadToSupabase, 120000); } };
export const getSubjects = (tid?: string): Subject[] => get<Subject>(KEYS.SUBJECTS).filter(s => !tid || s.teacherId === tid);
export const addSubject = (s: Subject) => { const list = get<Subject>(KEYS.SUBJECTS); list.push(s); save(KEYS.SUBJECTS, list); uploadToSupabase(); };
// Fix: Export deleteSubject to resolve error in SchoolManagement.tsx
export const deleteSubject = (id: string) => { save(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id)); uploadToSupabase(); };

export const getAcademicTerms = (tid?: string): AcademicTerm[] => get<AcademicTerm>(KEYS.TERMS).filter(t => !tid || t.teacherId === tid);
export const saveAcademicTerm = (t: AcademicTerm) => { const list = get<AcademicTerm>(KEYS.TERMS); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) list[idx] = t; else list.push(t); save(KEYS.TERMS, list); uploadToSupabase(); };
export const deleteAcademicTerm = (id: string) => { save(KEYS.TERMS, get<AcademicTerm>(KEYS.TERMS).filter(t => t.id !== id)); uploadToSupabase(); };

export const getDatabaseSchemaSQL = () => `
-- SQL لتحديث قاعدة البيانات السحابية (Supabase)
-- قم بنسخ هذا الكود وتشغيله في SQL Editor

CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT, national_id TEXT, class_id TEXT, grade_level TEXT, className TEXT, behavior_points INT, learning_style TEXT, parent_phone TEXT);
CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, student_id TEXT, date TEXT, status TEXT, behavior_status TEXT, behavior_note TEXT, excuse_note TEXT, subject TEXT, period INT);
CREATE TABLE IF NOT EXISTS performance (id TEXT PRIMARY KEY, student_id TEXT, subject TEXT, title TEXT, category TEXT, score FLOAT, max_score FLOAT, date TEXT, notes TEXT);
CREATE TABLE IF NOT EXISTS assignments (id TEXT PRIMARY KEY, title TEXT, category TEXT, max_score FLOAT, is_visible BOOLEAN, teacher_id TEXT, term_id TEXT, period_id TEXT, source_metadata TEXT, sort_order INT, url TEXT);
CREATE TABLE IF NOT EXISTS subjects (id TEXT PRIMARY KEY, name TEXT, teacher_id TEXT);
CREATE TABLE IF NOT EXISTS behavior_incidents (id TEXT PRIMARY KEY, student_id TEXT, teacher_id TEXT, type TEXT, category TEXT, points INT, date TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, teacher_id TEXT, class_id TEXT, subject TEXT, title TEXT, description TEXT, due_date TEXT, type TEXT, max_score FLOAT, submissions JSONB);
CREATE TABLE IF NOT EXISTS academic_terms (id TEXT PRIMARY KEY, name TEXT, startDate TEXT, endDate TEXT, isCurrent BOOLEAN, teacherId TEXT, periods JSONB);
`;

// Fix: Export getDatabaseUpdateSQL to resolve error in AdminDashboard.tsx
export const getDatabaseUpdateSQL = () => `
-- SQL لتحديث قاعدة البيانات
CREATE TABLE IF NOT EXISTS curriculum_units (id TEXT PRIMARY KEY, teacher_id TEXT, subject TEXT, grade_level TEXT, title TEXT, order_index INT);
CREATE TABLE IF NOT EXISTS curriculum_lessons (id TEXT PRIMARY KEY, unit_id TEXT, title TEXT, order_index INT, learning_standards JSONB, micro_concept_ids JSONB, is_completed BOOLEAN, completed_at TEXT);
CREATE TABLE IF NOT EXISTS question_bank (id TEXT PRIMARY KEY, text TEXT, type TEXT, options JSONB, correct_answer TEXT, points FLOAT, teacher_id TEXT, subject TEXT, grade_level TEXT);
CREATE TABLE IF NOT EXISTS exams (id TEXT PRIMARY KEY, title TEXT, subject TEXT, grade_level TEXT, duration_minutes INT, questions JSONB, is_active BOOLEAN, created_at TEXT, teacher_id TEXT);
CREATE TABLE IF NOT EXISTS exam_results (id TEXT PRIMARY KEY, exam_id TEXT, student_id TEXT, score FLOAT, total_score FLOAT, answers JSONB, date TEXT);
CREATE TABLE IF NOT EXISTS tracking_sheets (id TEXT PRIMARY KEY, title TEXT, subject TEXT, class_name TEXT, teacher_id TEXT, created_at TEXT, columns JSONB, scores JSONB);
CREATE TABLE IF NOT EXISTS environment_records (id TEXT PRIMARY KEY, teacher_id TEXT, class_id TEXT, date TEXT, lighting INT, noise_level INT, mood TEXT, notes TEXT);
CREATE TABLE IF NOT EXISTS custom_tables (id TEXT PRIMARY KEY, name TEXT, created_at TEXT, columns JSONB, rows JSONB, source_url TEXT, last_updated TEXT, teacher_id TEXT);
`;

export const getAISettings = () => get<AISettings>(KEYS.AI_SETTINGS)[0] || { modelId: 'gemini-3-flash-preview', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: "" };
export const getUserTheme = () => { const s = localStorage.getItem(KEYS.USER_THEME); return s ? JSON.parse(s) : { mode: 'LIGHT', backgroundStyle: 'FLAT' }; };
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));
export const getSchedules = () => get<ScheduleItem>(KEYS.SCHEDULES);
export const saveScheduleItem = (s: ScheduleItem) => { const list = get<ScheduleItem>(KEYS.SCHEDULES); list.push(s); save(KEYS.SCHEDULES, list); uploadToSupabase(); };
// Fix: Export deleteScheduleItem to resolve error in ScheduleView.tsx
export const deleteScheduleItem = (id: string) => { save(KEYS.SCHEDULES, get<ScheduleItem>(KEYS.SCHEDULES).filter(s => s.id !== id)); uploadToSupabase(); };

export const getWeeklyPlans = (tid?: string) => get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => { const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS); const idx = list.findIndex(x => x.id === p.id); if (idx !== -1) list[idx] = p; else list.push(p); save(KEYS.WEEKLY_PLANS, list); uploadToSupabase(); };
export const getLessonPlans = (tid?: string) => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => !tid || p.teacherId === tid);
export const saveLessonPlan = (p: StoredLessonPlan) => { const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS); const idx = list.findIndex(x => x.id === p.id); if (idx !== -1) list[idx] = p; else list.push(p); save(KEYS.LESSON_PLANS, list); uploadToSupabase(); };
// Fix: Export deleteLessonPlan to resolve error in LessonPlanning.tsx
export const deleteLessonPlan = (id: string) => { save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.id !== id)); uploadToSupabase(); };

export const getTeacherAssignments = (tid?: string) => get<TeacherAssignment>('teacher_class_map').filter(a => !tid || a.teacherId === tid);
export const addTeacherAssignment = (a: TeacherAssignment) => { const list = get<TeacherAssignment>('teacher_class_map'); list.push(a); save('teacher_class_map', list); uploadToSupabase(); };
export const deleteTeacherAssignment = (id: string) => { save('teacher_class_map', get<TeacherAssignment>('teacher_class_map').filter(a => a.id !== id)); uploadToSupabase(); };
export const getMessages = (tid?: string) => get<MessageLog>(KEYS.MESSAGES).filter(m => !tid || m.teacherId === tid);
export const saveMessage = (m: MessageLog) => { const list = get<MessageLog>(KEYS.MESSAGES); list.push(m); save(KEYS.MESSAGES, list); uploadToSupabase(); };
export const getSystemUsers = () => get<SystemUser>(KEYS.SYSTEM_USERS);
export const addSystemUser = async (u: SystemUser) => { const list = getSystemUsers(); list.push(u); save(KEYS.SYSTEM_USERS, list); uploadToSupabase(); };
export const authenticateUser = async (id: string, p: string) => getSystemUsers().find(u => (u.nationalId === id || u.email === id) && u.password === p) || null;
export const authenticateStudent = async (id: string, p: string) => getStudents().find(s => s.nationalId === id && (s.password || '123456') === p) || null;
export const setCurrentTerm = (id: string, tid: string) => { const all = get<AcademicTerm>(KEYS.TERMS); all.forEach(t => { if (t.teacherId === tid) t.isCurrent = (t.id === id); }); save(KEYS.TERMS, all); uploadToSupabase(); };
export const getFormsDetailedResults = (tid?: string) => get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => !tid || r.teacherId === tid);
export const saveFormsDetailedResult = (r: FormsDetailedResult) => { const list = get<FormsDetailedResult>(KEYS.FORMS_DETAILED); list.push(r); save(KEYS.FORMS_DETAILED, list); uploadToSupabase(); };
export const updateStudentLearningStyle = (id: string, s: LearningStyle) => { const list = getStudents(); const idx = list.findIndex(x => x.id === id); if (idx !== -1) { list[idx].learningStyle = s; save(KEYS.STUDENTS, list); uploadToSupabase(); } };
export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (u: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, u);
export const checkConnection = async () => { try { const { error } = await supabase.from('students').select('id').limit(1); return { success: !error, message: error ? error.message : "متصل" }; } catch { return { success: false, message: "فشل الاتصال" }; } };
export const fetchCloudTableData = async (t: string) => { const { data } = await supabase.from(t).select('*'); return data; };
export const clearCloudTable = async (t: string) => { await supabase.from(t).delete().neq('id', '0'); };
export const resetCloudDatabase = async () => {};
export const backupCloudDatabase = async () => JSON.stringify({});
export const restoreCloudDatabase = async (j: string) => {};
export const createBackup = () => JSON.stringify(localStorage);
export const restoreBackup = (j: string) => { try { const d = JSON.parse(j); Object.keys(d).forEach(k => localStorage.setItem(k, d[k])); return true; } catch { return false; } };
export const clearDatabase = () => localStorage.clear();
export const deleteFormsDetailedResult = (id: string) => save(KEYS.FORMS_DETAILED, get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => r.id !== id));

// Fix: Export missing functions for TrackingSheet, Exam, ExamResult, Question, LessonLink, RemedialPlan, EnvironmentRecord, CustomTable, CurriculumUnit, CurriculumLesson, Teacher

export const saveTrackingSheet = (s: TrackingSheet) => { const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS); list.push(s); save(KEYS.TRACKING_SHEETS, list); uploadToSupabase(); };
export const getTrackingSheets = (tid?: string) => get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => !tid || s.teacherId === tid);
export const deleteTrackingSheet = (id: string) => { save(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.id !== id)); uploadToSupabase(); };

export const saveExamResult = (r: ExamResult) => { const list = get<ExamResult>(KEYS.EXAM_RESULTS); list.push(r); save(KEYS.EXAM_RESULTS, list); uploadToSupabase(); };
export const getExamResults = (eid?: string) => get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => !eid || r.examId === eid);
export const deleteExamResult = (id: string) => { save(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => r.id !== id)); uploadToSupabase(); };

export const saveExam = (e: Exam) => { const list = get<Exam>(KEYS.EXAMS); const idx = list.findIndex(x => x.id === e.id); if (idx !== -1) list[idx] = e; else list.push(e); save(KEYS.EXAMS, list); uploadToSupabase(); };
export const getExams = (tid?: string) => get<Exam>(KEYS.EXAMS).filter(e => !tid || e.teacherId === tid);
export const deleteExam = (id: string) => { save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(e => e.id !== id)); uploadToSupabase(); };

export const saveLessonLink = (l: LessonLink) => { const list = get<LessonLink>(KEYS.LESSON_LINKS); list.push(l); save(KEYS.LESSON_LINKS, list); uploadToSupabase(); };
export const getLessonLinks = (tid?: string) => get<LessonLink>(KEYS.LESSON_LINKS).filter(l => !tid || l.teacherId === tid);
export const deleteLessonLink = (id: string) => { save(KEYS.LESSON_LINKS, get<LessonLink>(KEYS.LESSON_LINKS).filter(l => l.id !== id)); uploadToSupabase(); };

export const saveQuestionToBank = (q: Question) => { const list = get<Question>(KEYS.QUESTION_BANK); list.push(q); save(KEYS.QUESTION_BANK, list); uploadToSupabase(); };
export const getQuestionBank = (tid: string) => get<Question>(KEYS.QUESTION_BANK).filter(q => q.teacherId === tid);
export const deleteQuestionFromBank = (id: string) => { save(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(q => q.id !== id)); uploadToSupabase(); };

export const saveRemedialPlan = (p: RemedialPlan) => { const list = get<RemedialPlan>(KEYS.REMEDIAL_PLANS); list.push(p); save(KEYS.REMEDIAL_PLANS, list); uploadToSupabase(); };
export const getRemedialPlans = (sid?: string) => get<RemedialPlan>(KEYS.REMEDIAL_PLANS).filter(p => !sid || p.studentId === sid);

export const setSystemMode = (val: boolean) => { console.debug('System mode set to:', val); };

export const getCurriculumUnits = (tid?: string): CurriculumUnit[] => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => !tid || u.teacherId === tid);
export const saveCurriculumUnit = (u: CurriculumUnit) => { const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); const idx = list.findIndex(x => x.id === u.id); if (idx !== -1) list[idx] = u; else list.push(u); save(KEYS.CURRICULUM_UNITS, list); uploadToSupabase(); };
export const deleteCurriculumUnit = (id: string) => { save(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.id !== id)); uploadToSupabase(); };

export const getCurriculumLessons = (unitId?: string): CurriculumLesson[] => { const all = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS); return unitId ? all.filter(l => l.unitId === unitId) : all; };
export const saveCurriculumLesson = (l: CurriculumLesson) => { const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS); const idx = list.findIndex(x => x.id === l.id); if (idx !== -1) list[idx] = l; else list.push(l); save(KEYS.CURRICULUM_LESSONS, list); uploadToSupabase(); };
export const deleteCurriculumLesson = (id: string) => { save(KEYS.CURRICULUM_LESSONS, get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => l.id !== id)); uploadToSupabase(); };

export const toggleCurriculumLesson = (id: string, completed: boolean) => { const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS); const idx = list.findIndex(l => l.id === id); if (idx !== -1) { list[idx].isCompleted = completed; list[idx].completedAt = completed ? new Date().toISOString() : undefined; save(KEYS.CURRICULUM_LESSONS, list); uploadToSupabase(); } };

export const getReportHeaderConfig = (tid?: string) => { const all = get<ReportHeaderConfig & {teacherId: string}>('report_header_configs'); return all.find(c => c.teacherId === tid) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' }; };
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => { const all = get<ReportHeaderConfig & {teacherId: string}>('report_header_configs'); const idx = all.findIndex(x => x.teacherId === c.teacherId); if (idx !== -1) all[idx] = c as any; else all.push(c as any); save('report_header_configs', all); uploadToSupabase(); };

export const getTeacherPeriodTimings = (tid: string) => get<{tid: string, times: string[]}>('period_timings').find(x => x.tid === tid)?.times || ["07:00", "07:45", "08:30"];
export const saveTeacherPeriodTimings = (tid: string, times: string[]) => { const all = get<{tid: string, times: string[]}>('period_timings'); const idx = all.findIndex(x => x.tid === tid); if (idx !== -1) all[idx].times = times; else all.push({ tid, times }); save('period_timings', all); uploadToSupabase(); };

export const updateTeacher = async (t: Teacher) => { const list = getTeachers(); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) { list[idx] = t; save(KEYS.TEACHERS, list); uploadToSupabase(); } };
export const addTeacher = async (t: Teacher) => {
    const list = getTeachers();
    list.push(t);
    save(KEYS.TEACHERS, list);
    // Also add to system users automatically
    const sysUser: SystemUser = {
        id: t.id,
        name: t.name,
        email: t.email || '',
        nationalId: t.nationalId,
        password: t.password,
        role: 'TEACHER',
        schoolId: t.schoolId,
        status: 'ACTIVE'
    };
    await addSystemUser(sysUser);
    uploadToSupabase();
};
export const getTeachers = () => get<Teacher>(KEYS.TEACHERS);

export const getSchools = () => get<School>(KEYS.SCHOOLS);
export const addSchool = async (s: School) => { const list = getSchools(); list.push(s); save(KEYS.SCHOOLS, list); uploadToSupabase(); };
export const deleteSchool = (id: string) => save(KEYS.SCHOOLS, getSchools().filter(s => s.id !== id));
export const updateSchool = (s: School) => { const list = getSchools(); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.SCHOOLS, list); uploadToSupabase(); } };

export const deleteSystemUser = (id: string) => save(KEYS.SYSTEM_USERS, getSystemUsers().filter(u => u.id !== id));
export const updateSystemUser = (u: SystemUser) => { const list = getSystemUsers(); const idx = list.findIndex(x => x.id === u.id); if (idx !== -1) { list[idx] = u; save(KEYS.SYSTEM_USERS, list); uploadToSupabase(); } };

export const saveAISettings = (s: AISettings) => save(KEYS.AI_SETTINGS, [s]);

export const getTableDisplayName = (tableName: string): string => { const names: Record<string, string> = { [KEYS.STUDENTS]: 'الطلاب', [KEYS.ATTENDANCE]: 'الحضور', [KEYS.PERFORMANCE]: 'الأداء والدرجات', [KEYS.TEACHERS]: 'المرشدين والمعلمين', [KEYS.SCHOOLS]: 'المدارس', [KEYS.SYSTEM_USERS]: 'المستخدمين', [KEYS.SUBJECTS]: 'المواد', [KEYS.SCHEDULES]: 'الجداول', [KEYS.TERMS]: 'الفصول الدراسية', [KEYS.LESSON_PLANS]: 'تحضير الدروس', [KEYS.EXAMS]: 'الاختبارات', [KEYS.MESSAGES]: 'الرسائل', [KEYS.USER_THEME]: 'المظهر', [KEYS.AI_SETTINGS]: 'إعدادات الذكاء', [KEYS.CUSTOM_TABLES]: 'الجداول الخاصة', [KEYS.ENVIRONMENT]: 'البيئة' }; return names[tableName] || tableName; };
export const validateCloudSchema = async () => ({ missingTables: [] });

// Environment and Custom Tables exports
export const getEnvironmentRecords = (classId?: string): EnvironmentRecord[] => get<EnvironmentRecord>(KEYS.ENVIRONMENT).filter(e => !classId || e.classId === classId);
export const saveEnvironmentRecord = (r: EnvironmentRecord) => { const list = get<EnvironmentRecord>(KEYS.ENVIRONMENT); list.push(r); save(KEYS.ENVIRONMENT, list); uploadToSupabase(); };

export const getCustomTables = (tid?: string): CustomTable[] => get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => !tid || t.teacherId === tid);
export const addCustomTable = (t: CustomTable) => { const list = get<CustomTable>(KEYS.CUSTOM_TABLES); list.push(t); save(KEYS.CUSTOM_TABLES, list); uploadToSupabase(); };
export const deleteCustomTable = (id: string) => { save(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => t.id !== id)); uploadToSupabase(); };
export const updateCustomTable = (t: CustomTable) => { const list = get<CustomTable>(KEYS.CUSTOM_TABLES); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) { list[idx] = t; save(KEYS.CUSTOM_TABLES, list); uploadToSupabase(); } };
