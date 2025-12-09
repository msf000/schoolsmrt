

import { 
    Student, Teacher, School, SystemUser, AttendanceRecord, PerformanceRecord, 
    Assignment, ScheduleItem, TeacherAssignment, Subject, CustomTable, 
    LessonLink, MessageLog, Feedback, ReportHeaderConfig, AISettings, UserTheme, 
    PerformanceCategory, Exam, ExamResult, Question, StoredLessonPlan,
    CurriculumUnit, CurriculumLesson, MicroConcept, TrackingSheet, WeeklyPlanItem
} from '../types';
import { supabase } from './supabaseClient';

// --- CONSTANTS & TYPES ---

export const DB_MAP: Record<string, string> = {
    schools: 'schools',
    teachers: 'teachers',
    students: 'students',
    system_users: 'system_users',
    attendance: 'attendance_records',
    performance: 'performance_records',
    assignments: 'assignments', 
    schedules: 'schedules',
    teacher_assignments: 'teacher_assignments',
    subjects: 'subjects',
    custom_tables: 'custom_tables',
    lesson_links: 'lesson_links',
    message_logs: 'message_logs',
    feedbacks: 'feedbacks',
    lesson_plans: 'lesson_plans',
    curriculum_units: 'curriculum_units',
    curriculum_lessons: 'curriculum_lessons',
    micro_concepts: 'micro_concepts',
    question_bank: 'question_bank',
    exams: 'exams',
    exam_results: 'exam_results',
    tracking_sheets: 'tracking_sheets',
    weekly_plans: 'weekly_plans'
};

const INITIAL_DATA = {
    schools: [] as School[],
    teachers: [] as Teacher[],
    students: [] as Student[],
    system_users: [] as SystemUser[],
    attendance: [] as AttendanceRecord[],
    performance: [] as PerformanceRecord[],
    assignments: [] as Assignment[], 
    schedules: [] as ScheduleItem[],
    teacher_assignments: [] as TeacherAssignment[],
    subjects: [] as Subject[],
    custom_tables: [] as CustomTable[],
    lesson_links: [] as LessonLink[],
    message_logs: [] as MessageLog[],
    feedbacks: [] as Feedback[],
    lesson_plans: [] as StoredLessonPlan[],
    curriculum_units: [] as CurriculumUnit[],
    curriculum_lessons: [] as CurriculumLesson[],
    micro_concepts: [] as MicroConcept[],
    question_bank: [] as Question[],
    exams: [] as Exam[],
    exam_results: [] as ExamResult[],
    tracking_sheets: [] as TrackingSheet[],
    weekly_plans: [] as WeeklyPlanItem[],
    report_header_config: { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' } as ReportHeaderConfig,
    ai_settings: { modelId: 'gemini-2.5-flash', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' } as AISettings,
    user_theme: { mode: 'LIGHT', backgroundStyle: 'FLAT' } as UserTheme,
    works_master_url: ''
};

// --- STATE ---

// In-memory cache
let CACHE = { ...INITIAL_DATA };

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ONLINE' | 'OFFLINE' | 'ERROR';
type SyncListener = (status: SyncStatus) => void;
type DataListener = () => void;

let syncStatus: SyncStatus = 'IDLE';
const syncListeners: Set<SyncListener> = new Set();
const dataListeners: Set<DataListener> = new Set();

// --- HELPERS ---

const notifySyncStatus = (status: SyncStatus) => {
    syncStatus = status;
    syncListeners.forEach(l => l(status));
};

const notifyDataChange = () => {
    dataListeners.forEach(l => l());
};

export const subscribeToSyncStatus = (listener: SyncListener) => {
    syncListeners.add(listener);
    listener(syncStatus); // initial
    return () => syncListeners.delete(listener);
};

export const subscribeToDataChanges = (listener: DataListener) => {
    dataListeners.add(listener);
    return () => dataListeners.delete(listener);
};

const saveToLocal = (key: keyof typeof INITIAL_DATA, data: any) => {
    // Update Cache
    (CACHE as any)[key] = data;
    // Persist
    localStorage.setItem(`app_${key}`, JSON.stringify(data));
    notifyDataChange();
};

const loadFromLocal = () => {
    Object.keys(INITIAL_DATA).forEach(key => {
        const saved = localStorage.getItem(`app_${key}`);
        if (saved) {
            try {
                (CACHE as any)[key] = JSON.parse(saved);
            } catch (e) {
                console.error(`Failed to parse ${key}`, e);
            }
        }
    });
};

// Initialize on load
loadFromLocal();

// --- CLOUD SYNC IMPLEMENTATION ---

const pushToCloud = async (tableKey: string, record: any, action: 'UPSERT' | 'DELETE' = 'UPSERT') => {
    const tableName = DB_MAP[tableKey];
    if (!tableName) return;

    try {
        notifySyncStatus('SYNCING');
        if (action === 'UPSERT') {
            await supabase.from(tableName).upsert(record);
        } else {
            await supabase.from(tableName).delete().eq('id', record.id);
        }
        notifySyncStatus('ONLINE');
    } catch (e) {
        console.error(`Sync error ${tableKey}`, e);
        notifySyncStatus('ERROR');
    }
};

export const uploadToSupabase = async () => {
    notifySyncStatus('SYNCING');
    for (const key of Object.keys(DB_MAP)) {
        const table = DB_MAP[key];
        const data = (CACHE as any)[key];
        if (Array.isArray(data) && data.length > 0) {
            // Batch upsert
            const { error } = await supabase.from(table).upsert(data);
            if (error) console.error(`Failed to upload ${key}`, error);
        }
    }
    notifySyncStatus('ONLINE');
};

export const downloadFromSupabase = async () => {
    notifySyncStatus('SYNCING');
    for (const key of Object.keys(DB_MAP)) {
        const table = DB_MAP[key];
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) {
            saveToLocal(key as any, data);
        }
    }
    notifySyncStatus('ONLINE');
};

export const initAutoSync = async () => {
    await downloadFromSupabase();
};

export const checkConnection = async () => {
    try {
        const { count, error } = await supabase.from('schools').select('*', { count: 'exact', head: true });
        if (error) throw error;
        return { success: true };
    } catch (e) {
        return { success: false };
    }
};

export const fetchCloudTableData = async (table: string) => {
    const { data } = await supabase.from(table).select('*').limit(50);
    return data;
};

export const clearCloudTable = async (table: string) => {
    await supabase.from(table).delete().neq('id', '0'); // Delete all rows
};

export const resetCloudDatabase = async () => {
    for (const table of Object.values(DB_MAP)) {
        await clearCloudTable(table);
    }
};

export const backupCloudDatabase = async () => {
    const backup: any = {};
    for (const key of Object.keys(DB_MAP)) {
        const table = DB_MAP[key];
        const { data } = await supabase.from(table).select('*');
        backup[table] = data;
    }
    return JSON.stringify(backup);
};

export const restoreCloudDatabase = async (json: string) => {
    const backup = JSON.parse(json);
    for (const table of Object.keys(backup)) {
        if (backup[table] && Array.isArray(backup[table])) {
            await supabase.from(table).upsert(backup[table]);
        }
    }
};

export const getTableDisplayName = (name: string) => {
    const reverseMap = Object.entries(DB_MAP).find(([k, v]) => v === name);
    return reverseMap ? reverseMap[0] : name;
};

// --- CRUD OPERATIONS ---

// 1. Students
export const getStudents = () => CACHE.students;
export const addStudent = (s: Student) => {
    const list = [...CACHE.students, s];
    saveToLocal('students', list);
    pushToCloud('students', s);
};
export const updateStudent = (s: Student) => {
    const list = CACHE.students.map(x => x.id === s.id ? s : x);
    saveToLocal('students', list);
    pushToCloud('students', s);
};
export const deleteStudent = (id: string) => {
    const list = CACHE.students.filter(x => x.id !== id);
    saveToLocal('students', list);
    pushToCloud('students', { id }, 'DELETE');
};
export const bulkAddStudents = (students: Student[]) => {
    const list = [...CACHE.students, ...students];
    saveToLocal('students', list);
};
export const deleteAllStudents = () => {
    saveToLocal('students', []);
    // Note: Cloud delete logic would be needed here for full consistency
};
export const bulkUpsertStudents = (students: Student[], matchKey: keyof Student = 'nationalId') => {
    let list = [...CACHE.students];
    students.forEach(newS => {
        const idx = list.findIndex(s => s[matchKey] === newS[matchKey]);
        if (idx > -1) {
            list[idx] = { ...list[idx], ...newS };
        } else {
            list.push(newS);
        }
    });
    saveToLocal('students', list);
};

// 2. Attendance
export const getAttendance = () => CACHE.attendance;
export const saveAttendance = (records: AttendanceRecord[]) => {
    let list = [...CACHE.attendance];
    records.forEach(r => {
        const idx = list.findIndex(ex => ex.id === r.id);
        if (idx > -1) list[idx] = r;
        else list.push(r);
        pushToCloud('attendance', r);
    });
    saveToLocal('attendance', list);
};
export const bulkAddAttendance = (records: AttendanceRecord[]) => {
    const list = [...CACHE.attendance, ...records];
    saveToLocal('attendance', list);
};

// 3. Performance
export const getPerformance = () => CACHE.performance;
export const addPerformance = (p: PerformanceRecord) => {
    const list = [...CACHE.performance, p];
    saveToLocal('performance', list);
    pushToCloud('performance', p);
};
export const bulkAddPerformance = (records: PerformanceRecord[]) => {
    const list = [...CACHE.performance, ...records];
    saveToLocal('performance', list);
};
export const deletePerformance = (id: string) => {
    const list = CACHE.performance.filter(x => x.id !== id);
    saveToLocal('performance', list);
    pushToCloud('performance', { id }, 'DELETE');
};

// 4. Assignments (Works Tracking)
export const getAssignments = (cat?: PerformanceCategory, teacherId?: string) => {
    let res = CACHE.assignments;
    if (cat) res = res.filter(a => a.category === cat);
    if (teacherId) res = res.filter(a => a.teacherId === teacherId || !a.teacherId);
    return res;
};
export const saveAssignment = (a: Assignment) => {
    const list = [...CACHE.assignments];
    const idx = list.findIndex(x => x.id === a.id);
    if (idx > -1) list[idx] = a; else list.push(a);
    saveToLocal('assignments', list);
    pushToCloud('assignments', a);
};
export const deleteAssignment = (id: string) => {
    const list = CACHE.assignments.filter(x => x.id !== id);
    saveToLocal('assignments', list);
    pushToCloud('assignments', { id }, 'DELETE');
};

// 5. Teachers & System Users
export const getTeachers = () => CACHE.teachers;
export const addTeacher = async (t: Teacher) => {
    const list = [...CACHE.teachers, t];
    saveToLocal('teachers', list);
    await pushToCloud('teachers', t);
    
    // Also add to System Users
    const sysUser: SystemUser = {
        id: t.id,
        name: t.name,
        email: t.email || t.nationalId || '',
        nationalId: t.nationalId,
        password: t.password,
        role: 'TEACHER',
        schoolId: t.schoolId,
        status: 'ACTIVE'
    };
    addSystemUser(sysUser);
};
export const updateTeacher = async (t: Teacher) => {
    const list = CACHE.teachers.map(x => x.id === t.id ? t : x);
    saveToLocal('teachers', list);
    await pushToCloud('teachers', t);
};

export const getSystemUsers = () => CACHE.system_users;
export const addSystemUser = (u: SystemUser) => {
    const list = [...CACHE.system_users, u];
    saveToLocal('system_users', list);
    pushToCloud('system_users', u);
};
export const updateSystemUser = (u: SystemUser) => {
    const list = CACHE.system_users.map(x => x.id === u.id ? u : x);
    saveToLocal('system_users', list);
    pushToCloud('system_users', u);
};
export const deleteSystemUser = (id: string) => {
    const list = CACHE.system_users.filter(x => x.id !== id);
    saveToLocal('system_users', list);
    pushToCloud('system_users', { id }, 'DELETE');
};

export const authenticateUser = async (identifier: string, password?: string): Promise<SystemUser | null> => {
    // 1. Check local
    const users = getSystemUsers();
    let user = users.find(u => (u.email === identifier || u.nationalId === identifier));
    
    // 2. If not found locally, try students (simple login)
    if (!user) {
        const students = getStudents();
        const student = students.find(s => s.nationalId === identifier); // Students login with ID
        if (student) {
            return {
                id: student.id,
                name: student.name,
                email: student.nationalId || '',
                role: 'STUDENT',
                schoolId: student.schoolId,
                status: 'ACTIVE',
                password: student.password
            };
        }
    }

    // In a real app, password check would happen here or via API
    if (user && password && user.password && user.password !== password) {
        return null;
    }

    return user || null;
};

// 6. Schools
export const getSchools = () => CACHE.schools;
export const addSchool = async (s: School) => {
    const list = [...CACHE.schools, s];
    saveToLocal('schools', list);
    await pushToCloud('schools', s);
};
export const updateSchool = (s: School) => {
    const list = CACHE.schools.map(x => x.id === s.id ? s : x);
    saveToLocal('schools', list);
    pushToCloud('schools', s);
};
export const deleteSchool = (id: string) => {
    const list = CACHE.schools.filter(x => x.id !== id);
    saveToLocal('schools', list);
    pushToCloud('schools', { id }, 'DELETE');
};

// 7. Schedule
export const getSchedules = () => CACHE.schedules;
export const saveScheduleItem = (s: ScheduleItem) => {
    const list = [...CACHE.schedules];
    const idx = list.findIndex(x => x.id === s.id);
    if (idx > -1) list[idx] = s; else list.push(s);
    saveToLocal('schedules', list);
    pushToCloud('schedules', s);
};
export const deleteScheduleItem = (id: string) => {
    const list = CACHE.schedules.filter(x => x.id !== id);
    saveToLocal('schedules', list);
    pushToCloud('schedules', { id }, 'DELETE');
};

// 8. Subjects
export const getSubjects = (teacherId?: string) => {
    if (!teacherId) return CACHE.subjects;
    return CACHE.subjects.filter(s => s.teacherId === teacherId || !s.teacherId);
};
export const addSubject = (s: Subject) => {
    saveToLocal('subjects', [...CACHE.subjects, s]);
    pushToCloud('subjects', s);
};
export const deleteSubject = (id: string) => {
    saveToLocal('subjects', CACHE.subjects.filter(x => x.id !== id));
    pushToCloud('subjects', { id }, 'DELETE');
};

// 9. Teacher Assignments
export const getTeacherAssignments = () => CACHE.teacher_assignments;
export const saveTeacherAssignment = (a: TeacherAssignment) => {
    saveToLocal('teacher_assignments', [...CACHE.teacher_assignments, a]);
    pushToCloud('teacher_assignments', a);
};
// Renamed to avoid conflict with 'deleteAssignment'
export const deleteTeacherAssignment = (id: string) => {
    saveToLocal('teacher_assignments', CACHE.teacher_assignments.filter(x => x.id !== id));
    pushToCloud('teacher_assignments', { id }, 'DELETE');
};

// 10. Configs
export const getReportHeaderConfig = (teacherId?: string) => CACHE.report_header_config;
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => saveToLocal('report_header_config', c);

export const getAISettings = () => CACHE.ai_settings || INITIAL_DATA.ai_settings;
export const saveAISettings = (s: AISettings) => saveToLocal('ai_settings', s);

export const getUserTheme = () => CACHE.user_theme || INITIAL_DATA.user_theme;
export const saveUserTheme = (t: UserTheme) => saveToLocal('user_theme', t);

export const getWorksMasterUrl = () => CACHE.works_master_url;
export const saveWorksMasterUrl = (u: string) => saveToLocal('works_master_url', u);

// 11. Misc
export const getCustomTables = (teacherId?: string) => {
    if (!teacherId) return CACHE.custom_tables;
    return CACHE.custom_tables.filter(t => t.teacherId === teacherId || !t.teacherId);
};
export const addCustomTable = (t: CustomTable) => {
    saveToLocal('custom_tables', [...CACHE.custom_tables, t]);
    pushToCloud('custom_tables', t);
};
export const updateCustomTable = (t: CustomTable) => {
    saveToLocal('custom_tables', CACHE.custom_tables.map(x => x.id === t.id ? t : x));
    pushToCloud('custom_tables', t);
};
export const deleteCustomTable = (id: string) => {
    saveToLocal('custom_tables', CACHE.custom_tables.filter(x => x.id !== id));
    pushToCloud('custom_tables', { id }, 'DELETE');
};

export const getLessonLinks = () => CACHE.lesson_links;
export const saveLessonLink = (l: LessonLink) => {
    saveToLocal('lesson_links', [...CACHE.lesson_links, l]);
    pushToCloud('lesson_links', l);
};
export const deleteLessonLink = (id: string) => {
    saveToLocal('lesson_links', CACHE.lesson_links.filter(x => x.id !== id));
    pushToCloud('lesson_links', { id }, 'DELETE');
};

export const getMessages = () => CACHE.message_logs;
export const saveMessage = (m: MessageLog) => {
    saveToLocal('message_logs', [m, ...CACHE.message_logs]);
    pushToCloud('message_logs', m);
};

export const getFeedback = () => CACHE.feedbacks;
export const addFeedback = (f: Feedback) => {
    saveToLocal('feedbacks', [f, ...CACHE.feedbacks]);
    pushToCloud('feedbacks', f);
};

// 12. New Features (Lesson Plan, Curriculum, Exams)

// Lesson Plans
export const getLessonPlans = (teacherId?: string) => {
    if (!teacherId) return CACHE.lesson_plans;
    return CACHE.lesson_plans.filter(p => p.teacherId === teacherId);
};
export const saveLessonPlan = (plan: StoredLessonPlan) => {
    const list = [...CACHE.lesson_plans];
    const idx = list.findIndex(p => p.id === plan.id);
    if (idx > -1) list[idx] = plan; else list.push(plan);
    saveToLocal('lesson_plans', list);
    pushToCloud('lesson_plans', plan);
};
export const deleteLessonPlan = (id: string) => {
    saveToLocal('lesson_plans', CACHE.lesson_plans.filter(p => p.id !== id));
    pushToCloud('lesson_plans', { id }, 'DELETE');
};

// Curriculum
export const getCurriculumUnits = (teacherId?: string) => {
    // Units might be global or per teacher
    if (!teacherId) return CACHE.curriculum_units;
    return CACHE.curriculum_units.filter(u => u.teacherId === teacherId || !u.teacherId);
};
export const saveCurriculumUnit = (unit: CurriculumUnit) => {
    const list = [...CACHE.curriculum_units];
    const idx = list.findIndex(u => u.id === unit.id);
    if (idx > -1) list[idx] = unit; else list.push(unit);
    saveToLocal('curriculum_units', list);
    pushToCloud('curriculum_units', unit);
};
export const deleteCurriculumUnit = (id: string) => {
    saveToLocal('curriculum_units', CACHE.curriculum_units.filter(u => u.id !== id));
    pushToCloud('curriculum_units', { id }, 'DELETE');
};

export const getCurriculumLessons = () => CACHE.curriculum_lessons;
export const saveCurriculumLesson = (lesson: CurriculumLesson) => {
    const list = [...CACHE.curriculum_lessons];
    const idx = list.findIndex(l => l.id === lesson.id);
    if (idx > -1) list[idx] = lesson; else list.push(lesson);
    saveToLocal('curriculum_lessons', list);
    pushToCloud('curriculum_lessons', lesson);
};
export const deleteCurriculumLesson = (id: string) => {
    saveToLocal('curriculum_lessons', CACHE.curriculum_lessons.filter(l => l.id !== id));
    pushToCloud('curriculum_lessons', { id }, 'DELETE');
};

export const getMicroConcepts = (teacherId?: string) => {
    if (!teacherId) return CACHE.micro_concepts;
    return CACHE.micro_concepts.filter(c => c.teacherId === teacherId || !c.teacherId);
};
export const saveMicroConcept = (concept: MicroConcept) => {
    const list = [...CACHE.micro_concepts];
    const idx = list.findIndex(c => c.id === concept.id);
    if (idx > -1) list[idx] = concept; else list.push(concept);
    saveToLocal('micro_concepts', list);
    pushToCloud('micro_concepts', concept);
};
export const deleteMicroConcept = (id: string) => {
    saveToLocal('micro_concepts', CACHE.micro_concepts.filter(c => c.id !== id));
    pushToCloud('micro_concepts', { id }, 'DELETE');
};

// Exams & Questions
export const getQuestionBank = (teacherId?: string) => {
    if (!teacherId) return CACHE.question_bank;
    return CACHE.question_bank.filter(q => q.teacherId === teacherId || !q.teacherId);
};
export const saveQuestionToBank = (q: Question) => {
    const list = [...CACHE.question_bank];
    const idx = list.findIndex(x => x.id === q.id);
    if (idx > -1) list[idx] = q; else list.push(q);
    saveToLocal('question_bank', list);
    pushToCloud('question_bank', q);
};
export const deleteQuestionFromBank = (id: string) => {
    saveToLocal('question_bank', CACHE.question_bank.filter(q => q.id !== id));
    pushToCloud('question_bank', { id }, 'DELETE');
};

export const getExams = (teacherId?: string) => {
    if (!teacherId) return CACHE.exams;
    return CACHE.exams.filter(e => e.teacherId === teacherId);
};
export const saveExam = (exam: Exam) => {
    const list = [...CACHE.exams];
    const idx = list.findIndex(e => e.id === exam.id);
    if (idx > -1) list[idx] = exam; else list.push(exam);
    saveToLocal('exams', list);
    pushToCloud('exams', exam);
};
export const deleteExam = (id: string) => {
    saveToLocal('exams', CACHE.exams.filter(e => e.id !== id));
    pushToCloud('exams', { id }, 'DELETE');
};

export const getExamResults = (examId?: string) => {
    if (!examId) return CACHE.exam_results;
    return CACHE.exam_results.filter(r => r.examId === examId);
};
export const saveExamResult = (result: ExamResult) => {
    const list = [...CACHE.exam_results];
    const idx = list.findIndex(r => r.id === result.id);
    if (idx > -1) list[idx] = result; else list.push(result);
    saveToLocal('exam_results', list);
    pushToCloud('exam_results', result);
};

// Tracking Sheets
export const getTrackingSheets = (teacherId?: string) => {
    if (!teacherId) return CACHE.tracking_sheets;
    return CACHE.tracking_sheets.filter(s => s.teacherId === teacherId);
};
export const saveTrackingSheet = (sheet: TrackingSheet) => {
    const list = [...CACHE.tracking_sheets];
    const idx = list.findIndex(s => s.id === sheet.id);
    if (idx > -1) list[idx] = sheet; else list.push(sheet);
    saveToLocal('tracking_sheets', list);
    pushToCloud('tracking_sheets', sheet);
};
export const deleteTrackingSheet = (id: string) => {
    saveToLocal('tracking_sheets', CACHE.tracking_sheets.filter(s => s.id !== id));
    pushToCloud('tracking_sheets', { id }, 'DELETE');
};

// Weekly Plans
export const getWeeklyPlans = (teacherId?: string) => {
    if (!teacherId) return CACHE.weekly_plans;
    return CACHE.weekly_plans.filter(p => p.teacherId === teacherId);
};
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => {
    const list = [...CACHE.weekly_plans];
    const idx = list.findIndex(p => p.id === item.id);
    if (idx > -1) list[idx] = item; else list.push(item);
    saveToLocal('weekly_plans', list);
    pushToCloud('weekly_plans', item);
};
export const deleteWeeklyPlanItem = (id: string) => {
    saveToLocal('weekly_plans', CACHE.weekly_plans.filter(p => p.id !== id));
    pushToCloud('weekly_plans', { id }, 'DELETE');
};

// --- SYSTEM UTILS ---

export const getStorageStatistics = () => {
    return {
        students: CACHE.students.length,
        attendance: CACHE.attendance.length,
        performance: CACHE.performance.length
    };
};

export const createBackup = () => JSON.stringify(CACHE);
export const restoreBackup = (json: string) => {
    try {
        const data = JSON.parse(json);
        CACHE = { ...INITIAL_DATA, ...data };
        Object.keys(CACHE).forEach(k => saveToLocal(k as any, (CACHE as any)[k]));
        return true;
    } catch (e) {
        return false;
    }
};
export const clearDatabase = () => {
    localStorage.clear();
    CACHE = { ...INITIAL_DATA };
    loadFromLocal();
    notifyDataChange();
};

export const setSystemMode = (isDemo: boolean) => {
    if (isDemo && CACHE.students.length === 0) {
        const demoTeacher: SystemUser = { id: 't1', name: 'المعلم التجريبي', role: 'TEACHER', email: 'teacher@demo.com', status: 'ACTIVE' };
        addSystemUser(demoTeacher);
    }
};

export const getDatabaseSchemaSQL = () => `
-- SQL Schema for Supabase
create table if not exists schools (id text primary key, name text, ministryCode text, managerName text, managerNationalId text, type text, phone text, studentCount numeric, educationAdministration text, worksMasterUrl text);
create table if not exists teachers (id text primary key, name text, nationalId text, email text, phone text, password text, subjectSpecialty text, schoolId text, managerId text, subscriptionStatus text, subscriptionEndDate text);
create table if not exists students (id text primary key, name text, nationalId text, classId text, schoolId text, createdById text, gradeLevel text, className text, email text, phone text, parentId text, parentName text, parentPhone text, parentEmail text, password text, seatIndex numeric);
create table if not exists system_users (id text primary key, name text, email text, nationalId text, password text, role text, schoolId text, status text);
create table if not exists attendance_records (id text primary key, studentId text, date text, status text, subject text, period numeric, behaviorStatus text, behaviorNote text, excuseNote text, excuseFile text, createdById text);
create table if not exists performance_records (id text primary key, studentId text, subject text, title text, category text, score numeric, maxScore numeric, date text, notes text, url text, createdById text);
create table if not exists assignments (id text primary key, title text, category text, maxScore numeric, url text, isVisible boolean, orderIndex numeric, sourceMetadata text, teacherId text);
create table if not exists schedules (id text primary key, classId text, day text, period numeric, subjectName text, teacherId text);
create table if not exists teacher_assignments (id text primary key, classId text, subjectName text, teacherId text);
create table if not exists subjects (id text primary key, name text, teacherId text);
create table if not exists custom_tables (id text primary key, name text, createdAt text, columns jsonb, rows jsonb, sourceUrl text, lastUpdated text, teacherId text);
create table if not exists lesson_links (id text primary key, title text, url text, teacherId text, createdAt text);
create table if not exists message_logs (id text primary key, studentId text, studentName text, parentPhone text, type text, content text, status text, date text, sentBy text);
create table if not exists feedbacks (id text primary key, teacherId text, managerId text, content text, date text, isRead boolean);
create table if not exists lesson_plans (id text primary key, teacherId text, lessonId text, subject text, topic text, contentJson text, resources jsonb, createdAt text);
create table if not exists curriculum_units (id text primary key, teacherId text, subject text, gradeLevel text, title text, orderIndex numeric);
create table if not exists curriculum_lessons (id text primary key, unitId text, title text, orderIndex numeric, learningStandards jsonb, microConceptIds jsonb);
create table if not exists micro_concepts (id text primary key, teacherId text, subject text, name text);
create table if not exists question_bank (id text primary key, text text, type text, options jsonb, correctAnswer text, points numeric, subject text, gradeLevel text, topic text, difficulty text, teacherId text);
create table if not exists exams (id text primary key, title text, subject text, gradeLevel text, durationMinutes numeric, questions jsonb, isActive boolean, createdAt text, teacherId text, date text);
create table if not exists exam_results (id text primary key, examId text, studentId text, studentName text, score numeric, totalScore numeric, date text, answers jsonb);
create table if not exists tracking_sheets (id text primary key, title text, subject text, className text, teacherId text, createdAt text, columns jsonb, scores jsonb);
create table if not exists weekly_plans (id text primary key, teacherId text, classId text, subjectName text, day text, period numeric, weekStartDate text, lessonTopic text, homework text);
`;

export const getDatabaseUpdateSQL = () => `
-- Updates
create table if not exists weekly_plans (id text primary key, teacherId text, classId text, subjectName text, day text, period numeric, weekStartDate text, lessonTopic text, homework text);
`;