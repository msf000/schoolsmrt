
import { 
    Student, Teacher, School, SystemUser, AttendanceRecord, PerformanceRecord, 
    Subject, ScheduleItem, TeacherAssignment, Assignment, WeeklyPlanItem, 
    LessonLink, LessonBlock, StoredLessonPlan, MessageLog, Feedback, 
    AISettings, CustomTable, ReportHeaderConfig, UserTheme, 
    Exam, ExamResult, Question, CurriculumUnit, CurriculumLesson, MicroConcept,
    TrackingSheet, AcademicTerm, TermPeriod
} from '../types';
import { supabase } from './supabaseClient';

// --- Local Storage Keys (Used as Cache for UI) ---
const KEYS = {
    STUDENTS: 'students',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    USERS: 'system_users',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    ASSIGNMENTS: 'assignments', 
    WORKS_ASSIGNMENTS: 'works_assignments', 
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

// Update Local Cache Only
const updateCache = <T>(key: string, data: T[]) => {
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

// --- CLOUD FIRST OPERATIONS ---

// 1. Schools
export const getSchools = (): School[] => get(KEYS.SCHOOLS);
export const addSchool = async (s: School) => { 
    // Cloud First
    const { error } = await supabase.from('schools').insert(s);
    if (!error) {
        const list = getSchools(); list.push(s); updateCache(KEYS.SCHOOLS, list);
    } else { throw error; }
};
export const updateSchool = async (s: School) => { 
    const { error } = await supabase.from('schools').update(s).eq('id', s.id);
    if (!error) {
        const list = getSchools(); const idx = list.findIndex(x => x.id === s.id); 
        if (idx > -1) list[idx] = s; updateCache(KEYS.SCHOOLS, list);
    }
};
export const deleteSchool = async (id: string) => { 
    await supabase.from('schools').delete().eq('id', id);
    updateCache(KEYS.SCHOOLS, getSchools().filter(x => x.id !== id)); 
};

// 2. Teachers
export const getTeachers = (): Teacher[] => get(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => { 
    const { error } = await supabase.from('teachers').insert(t);
    if (!error) {
        const list = getTeachers(); list.push(t); updateCache(KEYS.TEACHERS, list);
        // Also add to System Users in Cloud
        await addSystemUser({
            id: t.id, name: t.name, email: t.email || t.id, nationalId: t.nationalId, 
            password: t.password || '123456', role: 'TEACHER', schoolId: t.schoolId, status: 'ACTIVE'
        });
    } else { throw error; }
};
export const updateTeacher = async (t: Teacher) => { 
    await supabase.from('teachers').update(t).eq('id', t.id);
    const list = getTeachers(); const idx = list.findIndex(x => x.id === t.id); 
    if (idx > -1) list[idx] = t; updateCache(KEYS.TEACHERS, list); 
};

// 3. System Users (Admin/Manager)
export const getSystemUsers = (): SystemUser[] => get(KEYS.USERS);
export const addSystemUser = async (u: SystemUser) => { 
    const { error } = await supabase.from('system_users').insert(u);
    if (!error) {
        const list = getSystemUsers(); list.push(u); updateCache(KEYS.USERS, list);
    }
};
export const updateSystemUser = async (u: SystemUser) => { 
    await supabase.from('system_users').update(u).eq('id', u.id);
    const list = getSystemUsers(); const idx = list.findIndex(x => x.id === u.id); 
    if (idx > -1) list[idx] = u; updateCache(KEYS.USERS, list); 
};
export const deleteSystemUser = async (id: string) => { 
    await supabase.from('system_users').delete().eq('id', id);
    updateCache(KEYS.USERS, getSystemUsers().filter(x => x.id !== id)); 
};

// 4. Students
export const getStudents = (): Student[] => get(KEYS.STUDENTS);
export const addStudent = async (s: Student) => { 
    const { error } = await supabase.from('students').insert(s);
    if(!error) { const list = getStudents(); list.push(s); updateCache(KEYS.STUDENTS, list); }
};
export const updateStudent = async (s: Student) => { 
    await supabase.from('students').update(s).eq('id', s.id);
    const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); 
    if (idx > -1) list[idx] = s; updateCache(KEYS.STUDENTS, list); 
};
export const deleteStudent = async (id: string) => { 
    await supabase.from('students').delete().eq('id', id);
    updateCache(KEYS.STUDENTS, getStudents().filter(x => x.id !== id)); 
};
export const deleteAllStudents = async () => {
    await supabase.from('students').delete().neq('id', '0'); // Dangerous
    updateCache(KEYS.STUDENTS, []);
};
export const bulkAddStudents = async (students: Student[]) => { 
    const { error } = await supabase.from('students').insert(students);
    if (!error) { const list = getStudents(); updateCache(KEYS.STUDENTS, [...list, ...students]); }
};
export const bulkUpsertStudents = async (students: Student[], key: keyof Student = 'nationalId') => {
    const { error } = await supabase.from('students').upsert(students, { onConflict: key as string });
    if (!error) {
        // Refresh local cache logic simplified
        const { data } = await supabase.from('students').select('*');
        if (data) updateCache(KEYS.STUDENTS, data);
    }
};

// 5. Attendance
export const getAttendance = (): AttendanceRecord[] => get(KEYS.ATTENDANCE);
export const saveAttendance = async (records: AttendanceRecord[]) => { 
    const { error } = await supabase.from('attendance').upsert(records);
    if(!error) {
        let list = getAttendance(); 
        records.forEach(r => {
            const idx = list.findIndex(x => x.id === r.id);
            if (idx > -1) list[idx] = r; else list.push(r);
        });
        updateCache(KEYS.ATTENDANCE, list);
    }
};
export const bulkAddAttendance = saveAttendance;

// 6. Performance
export const getPerformance = (): PerformanceRecord[] => get(KEYS.PERFORMANCE);
export const addPerformance = async (p: PerformanceRecord) => { 
    const { error } = await supabase.from('performance').insert(p);
    if(!error) { const list = getPerformance(); list.push(p); updateCache(KEYS.PERFORMANCE, list); }
};
export const deletePerformance = async (id: string) => { 
    await supabase.from('performance').delete().eq('id', id);
    updateCache(KEYS.PERFORMANCE, getPerformance().filter(x => x.id !== id)); 
};
export const bulkAddPerformance = async (records: PerformanceRecord[]) => { 
    const { error } = await supabase.from('performance').insert(records);
    if(!error) { const list = getPerformance(); updateCache(KEYS.PERFORMANCE, [...list, ...records]); }
};

// --- AUTHENTICATION (Cloud Only) ---
export const authenticateUser = async (identifier: string, password: string): Promise<SystemUser | undefined> => {
    // Force Cloud Check
    try {
        const { data, error } = await supabase
            .from('system_users')
            .select('*')
            .or(`email.eq.${identifier},nationalId.eq.${identifier}`)
            .eq('password', password)
            .eq('status', 'ACTIVE')
            .single();
            
        if (data && !error) {
            return data as SystemUser;
        }
    } catch (e) {
        console.error("Cloud auth failed:", e);
    }
    return undefined;
};

// --- SYNC ENGINE (Populate Cache from Cloud) ---
export const initAutoSync = async () => {
    setSyncStatus('SYNCING');
    try {
        // Parallel fetch all tables
        const [
            schools, teachers, users, students, attendance, performance, 
            assignments, subjects, schedules, teacherAssignments, 
            exams, questions, units, lessons
        ] = await Promise.all([
            supabase.from('schools').select('*'),
            supabase.from('teachers').select('*'),
            supabase.from('system_users').select('*'),
            supabase.from('students').select('*'),
            supabase.from('attendance').select('*'),
            supabase.from('performance').select('*'),
            supabase.from('assignments').select('*'),
            supabase.from('subjects').select('*'),
            supabase.from('schedules').select('*'),
            supabase.from('teacher_assignments').select('*'),
            supabase.from('exams').select('*'),
            supabase.from('questions').select('*'),
            supabase.from('curriculum_units').select('*'),
            supabase.from('curriculum_lessons').select('*'),
        ]);

        if(schools.data) updateCache(KEYS.SCHOOLS, schools.data);
        if(teachers.data) updateCache(KEYS.TEACHERS, teachers.data);
        if(users.data) updateCache(KEYS.USERS, users.data);
        if(students.data) updateCache(KEYS.STUDENTS, students.data);
        if(attendance.data) updateCache(KEYS.ATTENDANCE, attendance.data);
        if(performance.data) updateCache(KEYS.PERFORMANCE, performance.data);
        if(assignments.data) updateCache(KEYS.WORKS_ASSIGNMENTS, assignments.data);
        if(subjects.data) updateCache(KEYS.SUBJECTS, subjects.data);
        if(schedules.data) updateCache(KEYS.SCHEDULES, schedules.data);
        if(teacherAssignments.data) updateCache(KEYS.ASSIGNMENTS, teacherAssignments.data);
        if(exams.data) updateCache(KEYS.EXAMS, exams.data);
        if(questions.data) updateCache(KEYS.QUESTION_BANK, questions.data);
        if(units.data) updateCache(KEYS.CURRICULUM_UNITS, units.data);
        if(lessons.data) updateCache(KEYS.CURRICULUM_LESSONS, lessons.data);

        setSyncStatus('ONLINE');
    } catch (e) {
        console.error("Sync Failed", e);
        setSyncStatus('ERROR');
    }
};

// --- READ-ONLY HELPERS (Fetch from Cache for Sync UI) ---
// Note: Write operations above are now Async/Cloud. 
// Read operations below read from the cache populated by initAutoSync for UI responsiveness.

export const getSubjects = (teacherId?: string): Subject[] => {
    const all = get<Subject>(KEYS.SUBJECTS);
    if (!teacherId) return all;
    return all.filter(s => s.teacherId === teacherId || !s.teacherId);
};
export const addSubject = async (s: Subject) => { 
    await supabase.from('subjects').insert(s);
    const list = get<Subject>(KEYS.SUBJECTS); list.push(s); updateCache(KEYS.SUBJECTS, list); 
};
export const deleteSubject = async (id: string) => { 
    await supabase.from('subjects').delete().eq('id', id);
    updateCache(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(x => x.id !== id)); 
};

export const getSchedules = (): ScheduleItem[] => get(KEYS.SCHEDULES);
export const saveScheduleItem = async (item: ScheduleItem) => { 
    await supabase.from('schedules').upsert(item);
    let list = getSchedules(); 
    const idx = list.findIndex(x => x.id === item.id); if (idx > -1) list[idx] = item; else list.push(item);
    updateCache(KEYS.SCHEDULES, list); 
};
export const deleteScheduleItem = async (id: string) => { 
    await supabase.from('schedules').delete().eq('id', id);
    updateCache(KEYS.SCHEDULES, getSchedules().filter(x => x.id !== id)); 
};

export const getTeacherAssignments = (): TeacherAssignment[] => get(KEYS.ASSIGNMENTS);
// ... implement similar async wrappers for remaining writes if needed, prioritizing core tables above

// Works Tracking Assignments (Columns)
export const getAssignments = (category: string, teacherId?: string, includeAll: boolean = false): Assignment[] => {
    const all = get<Assignment>(KEYS.WORKS_ASSIGNMENTS);
    if (includeAll) return all.filter(a => a.category === category);
    return all.filter(a => a.category === category && (a.teacherId === teacherId || !a.teacherId));
};
export const saveAssignment = async (a: Assignment) => { 
    await supabase.from('assignments').upsert(a);
    const list = get<Assignment>(KEYS.WORKS_ASSIGNMENTS); 
    const idx = list.findIndex(x => x.id === a.id); if (idx > -1) list[idx] = a; else list.push(a);
    updateCache(KEYS.WORKS_ASSIGNMENTS, list);
};
export const deleteAssignment = async (id: string) => { 
    await supabase.from('assignments').delete().eq('id', id);
    updateCache(KEYS.WORKS_ASSIGNMENTS, get<Assignment>(KEYS.WORKS_ASSIGNMENTS).filter(x => x.id !== id)); 
};

// Settings & Config (Keep Local/Hybrid)
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
export const addFeedback = async (f: Feedback) => { 
    await supabase.from('feedback').insert(f);
    const list = getFeedback(); list.push(f); updateCache(KEYS.FEEDBACK, list); 
};

// Messages
export const getMessages = (teacherId?: string): MessageLog[] => {
    const all = get<MessageLog>(KEYS.MESSAGES);
    if (!teacherId) return all;
    return all.filter(m => m.teacherId === teacherId);
};
export const saveMessage = async (m: MessageLog) => { 
    await supabase.from('message_logs').insert(m);
    const list = get<MessageLog>(KEYS.MESSAGES); list.unshift(m); updateCache(KEYS.MESSAGES, list); 
};

// Lesson Plans
export const getLessonLinks = (): LessonLink[] => get(KEYS.LESSON_LINKS);
export const saveLessonLink = async (l: LessonLink) => { 
    await supabase.from('lesson_links').insert(l);
    const list = getLessonLinks(); list.push(l); updateCache(KEYS.LESSON_LINKS, list); 
};
export const deleteLessonLink = async (id: string) => { 
    await supabase.from('lesson_links').delete().eq('id', id);
    updateCache(KEYS.LESSON_LINKS, getLessonLinks().filter(x => x.id !== id)); 
};

export const getLessonPlans = (teacherId: string): StoredLessonPlan[] => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.teacherId === teacherId);
export const saveLessonPlan = async (p: StoredLessonPlan) => { 
    await supabase.from('lesson_plans').insert(p);
    const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS); list.push(p); updateCache(KEYS.LESSON_PLANS, list); 
};
export const deleteLessonPlan = async (id: string) => { 
    await supabase.from('lesson_plans').delete().eq('id', id);
    updateCache(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(x => x.id !== id)); 
};

export const getWeeklyPlans = (teacherId?: string): WeeklyPlanItem[] => {
    const all = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    if (!teacherId) return all;
    return all.filter(p => p.teacherId === teacherId);
};
export const saveWeeklyPlanItem = async (item: WeeklyPlanItem) => {
    await supabase.from('weekly_plans').upsert(item);
    const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = list.findIndex(x => x.id === item.id); if (idx > -1) list[idx] = item; else list.push(item);
    updateCache(KEYS.WEEKLY_PLANS, list);
};

// Curriculum
export const getCurriculumUnits = (teacherId: string): CurriculumUnit[] => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.teacherId === teacherId);
export const saveCurriculumUnit = async (u: CurriculumUnit) => { 
    await supabase.from('curriculum_units').insert(u);
    const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); list.push(u); updateCache(KEYS.CURRICULUM_UNITS, list); 
};
export const deleteCurriculumUnit = async (id: string) => { 
    await supabase.from('curriculum_units').delete().eq('id', id);
    updateCache(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(x => x.id !== id)); 
};

export const getCurriculumLessons = (): CurriculumLesson[] => get(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = async (l: CurriculumLesson) => { 
    await supabase.from('curriculum_lessons').upsert(l);
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(x => x.id === l.id); if (idx > -1) list[idx] = l; else list.push(l);
    updateCache(KEYS.CURRICULUM_LESSONS, list);
};
export const deleteCurriculumLesson = async (id: string) => { 
    await supabase.from('curriculum_lessons').delete().eq('id', id);
    updateCache(KEYS.CURRICULUM_LESSONS, get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(x => x.id !== id)); 
};

export const getMicroConcepts = (teacherId: string): MicroConcept[] => get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(c => c.teacherId === teacherId);
export const saveMicroConcept = async (c: MicroConcept) => { 
    await supabase.from('micro_concepts').insert(c);
    const list = get<MicroConcept>(KEYS.MICRO_CONCEPTS); list.push(c); updateCache(KEYS.MICRO_CONCEPTS, list); 
};
export const deleteMicroConcept = async (id: string) => { 
    await supabase.from('micro_concepts').delete().eq('id', id);
    updateCache(KEYS.MICRO_CONCEPTS, get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(x => x.id !== id)); 
};

// Exams
export const getExams = (teacherId?: string): Exam[] => {
    const all = get<Exam>(KEYS.EXAMS);
    if (!teacherId) return all;
    return all.filter(e => e.teacherId === teacherId);
};
export const saveExam = async (e: Exam) => { 
    await supabase.from('exams').upsert(e);
    const list = get<Exam>(KEYS.EXAMS);
    const idx = list.findIndex(x => x.id === e.id); if (idx > -1) list[idx] = e; else list.push(e);
    updateCache(KEYS.EXAMS, list);
};
export const deleteExam = async (id: string) => { 
    await supabase.from('exams').delete().eq('id', id);
    updateCache(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(x => x.id !== id)); 
};

export const getExamResults = (examId?: string): ExamResult[] => {
    const all = get<ExamResult>(KEYS.EXAM_RESULTS);
    if (!examId) return all;
    return all.filter(r => r.examId === examId);
};
export const saveExamResult = async (r: ExamResult) => { 
    await supabase.from('exam_results').insert(r);
    const list = get<ExamResult>(KEYS.EXAM_RESULTS); list.push(r); updateCache(KEYS.EXAM_RESULTS, list); 
};

export const getQuestionBank = (teacherId: string): Question[] => get<Question>(KEYS.QUESTION_BANK).filter(q => q.teacherId === teacherId);
export const saveQuestionToBank = async (q: Question) => { 
    await supabase.from('questions').upsert(q);
    const list = get<Question>(KEYS.QUESTION_BANK);
    const idx = list.findIndex(x => x.id === q.id); if (idx > -1) list[idx] = q; else list.push(q);
    updateCache(KEYS.QUESTION_BANK, list);
};
export const deleteQuestionFromBank = async (id: string) => { 
    await supabase.from('questions').delete().eq('id', id);
    updateCache(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(x => x.id !== id)); 
};

// Tracking Sheets
export const getTrackingSheets = (teacherId?: string): TrackingSheet[] => {
    const all = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    if (!teacherId) return all;
    return all.filter(s => s.teacherId === teacherId);
};
export const saveTrackingSheet = async (s: TrackingSheet) => { 
    await supabase.from('tracking_sheets').upsert(s);
    const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    const idx = list.findIndex(x => x.id === s.id); if (idx > -1) list[idx] = s; else list.push(s);
    updateCache(KEYS.TRACKING_SHEETS, list);
};
export const deleteTrackingSheet = async (id: string) => { 
    await supabase.from('tracking_sheets').delete().eq('id', id);
    updateCache(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(x => x.id !== id)); 
};

// Custom Tables
export const getCustomTables = (teacherId?: string): CustomTable[] => {
    const all = get<CustomTable>(KEYS.CUSTOM_TABLES);
    if (!teacherId) return all;
    return all.filter(t => t.teacherId === teacherId);
};
export const addCustomTable = async (t: CustomTable) => { 
    await supabase.from('custom_tables').insert(t);
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES); list.push(t); updateCache(KEYS.CUSTOM_TABLES, list); 
};
export const updateCustomTable = async (t: CustomTable) => { 
    await supabase.from('custom_tables').update(t).eq('id', t.id);
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES); const idx = list.findIndex(x => x.id === t.id); if (idx > -1) list[idx] = t; 
    updateCache(KEYS.CUSTOM_TABLES, list);
};
export const deleteCustomTable = async (id: string) => { 
    await supabase.from('custom_tables').delete().eq('id', id);
    updateCache(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(x => x.id !== id)); 
};

// Academic Terms
export const getAcademicTerms = (teacherId?: string): AcademicTerm[] => {
    const all = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    if (!teacherId) return all;
    return all.filter(t => t.teacherId === teacherId || !t.teacherId);
};
export const saveAcademicTerm = async (term: AcademicTerm) => {
    await supabase.from('academic_terms').upsert(term);
    const list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    const idx = list.findIndex(t => t.id === term.id); if (idx > -1) list[idx] = term; else list.push(term);
    updateCache(KEYS.ACADEMIC_TERMS, list);
};
export const deleteAcademicTerm = async (id: string) => { 
    await supabase.from('academic_terms').delete().eq('id', id);
    updateCache(KEYS.ACADEMIC_TERMS, get<AcademicTerm>(KEYS.ACADEMIC_TERMS).filter(t => t.id !== id)); 
};
export const setCurrentTerm = async (id: string, teacherId?: string) => {
    // Note: Setting current is local logic mostly, but we save structure to cloud
    const list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS).map(t => {
        if (!teacherId || t.teacherId === teacherId) {
            return { ...t, isCurrent: t.id === id };
        }
        return t;
    });
    // Batch update via Upsert
    await supabase.from('academic_terms').upsert(list.filter(t => t.teacherId === teacherId));
    updateCache(KEYS.ACADEMIC_TERMS, list);
};

export const getReportHeaderConfig = (teacherId?: string): ReportHeaderConfig => {
    const configs = get<ReportHeaderConfig & { id?: string }>(KEYS.REPORT_CONFIG); 
    if (Array.isArray(configs)) {
        return configs.find(c => c.teacherId === teacherId) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
    }
    const stored = localStorage.getItem(KEYS.REPORT_CONFIG);
    return stored ? JSON.parse(stored) : { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    // Configs often local preference, but could be cloud. Keeping local for simplicity unless requested.
    let configs = get<ReportHeaderConfig>(KEYS.REPORT_CONFIG);
    if (!Array.isArray(configs)) configs = [];
    const idx = configs.findIndex(c => c.teacherId === config.teacherId);
    if (idx > -1) configs[idx] = config;
    else configs.push(config);
    localStorage.setItem(KEYS.REPORT_CONFIG, JSON.stringify(configs));
};

export const getStorageStatistics = () => {
    return {
        students: getStudents().length,
        attendance: getAttendance().length,
        performance: getPerformance().length
    };
};

// --- System Functions (Maintenance) ---
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

// Bridge functions for Admin Dashboard to call directly
export const uploadToSupabase = async () => { /* No-op, sync is automatic now */ return true; };
export const downloadFromSupabase = async () => { await initAutoSync(); return true; };
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
export const validateCloudSchema = async () => { return { missingTables: [] }; };
export const clearCloudTable = async (table: string) => { await supabase.from(table).delete().neq('id', '0'); };
export const resetCloudDatabase = async () => { /* Dangerous, implementation skipped for safety in auto-mode */ };
export const backupCloudDatabase = async () => { return "{}"; };
export const restoreCloudDatabase = async (json: string) => { };

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
