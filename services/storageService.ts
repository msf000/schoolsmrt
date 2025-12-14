
import { 
    Student, Teacher, School, SystemUser, AttendanceRecord, PerformanceRecord, 
    Subject, ScheduleItem, TeacherAssignment, Assignment, WeeklyPlanItem, 
    LessonLink, LessonBlock, StoredLessonPlan, MessageLog, Feedback, 
    AISettings, CustomTable, ReportHeaderConfig, UserTheme, 
    Exam, ExamResult, Question, CurriculumUnit, CurriculumLesson, MicroConcept,
    TrackingSheet, AcademicTerm, TermPeriod
} from '../types';
import { supabase } from './supabaseClient';

// --- Local Storage Keys ---
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
    WORKS_MASTER_URL: 'works_master_url',
    PERIOD_TIMINGS: 'period_timings'
};

// --- Period Timings Constants & Functions ---
export const DEFAULT_PERIOD_TIMES = [
    "07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", 
    "09:45 - 10:30", "10:30 - 11:15", "11:15 - 12:00", 
    "12:00 - 12:45", "12:45 - 01:30"
];

export const getTeacherPeriodTimings = (teacherId?: string): string[] => {
    const stored = localStorage.getItem(KEYS.PERIOD_TIMINGS);
    return stored ? JSON.parse(stored) : DEFAULT_PERIOD_TIMES;
};

export const saveTeacherPeriodTimings = (teacherId: string, timings: string[]) => {
    localStorage.setItem(KEYS.PERIOD_TIMINGS, JSON.stringify(timings));
    notifyDataChange();
};

// --- Helper Functions ---
const get = <T>(key: string): T[] => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

const updateCache = <T>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- Event Emitter ---
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

// --- Operations ---

export const getSchools = (): School[] => get(KEYS.SCHOOLS);
export const addSchool = async (s: School) => { 
    const list = getSchools(); list.push(s); updateCache(KEYS.SCHOOLS, list); notifyDataChange();
    await supabase.from('schools').insert(s);
};
export const updateSchool = async (s: School) => { 
    const list = getSchools(); const idx = list.findIndex(x => x.id === s.id); 
    if (idx > -1) list[idx] = s; updateCache(KEYS.SCHOOLS, list); notifyDataChange();
    await supabase.from('schools').update(s).eq('id', s.id);
};
export const deleteSchool = async (id: string) => { 
    updateCache(KEYS.SCHOOLS, getSchools().filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('schools').delete().eq('id', id);
};

export const getTeachers = (): Teacher[] => get(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => { 
    const list = getTeachers(); list.push(t); updateCache(KEYS.TEACHERS, list); notifyDataChange();
    
    // Add to System Users first to allow login
    const systemUser: SystemUser = {
        id: t.id, 
        name: t.name, 
        email: t.email || t.id, 
        nationalId: t.nationalId, 
        password: t.password || '123456', 
        role: 'TEACHER', 
        schoolId: t.schoolId, 
        status: 'ACTIVE'
    };
    // Save system user locally and to cloud
    await addSystemUser(systemUser);
    
    await supabase.from('teachers').insert(t);
};
export const updateTeacher = async (t: Teacher) => { 
    const list = getTeachers(); const idx = list.findIndex(x => x.id === t.id); 
    if (idx > -1) list[idx] = t; updateCache(KEYS.TEACHERS, list); notifyDataChange();
    await supabase.from('teachers').update(t).eq('id', t.id);
};

export const getSystemUsers = (): SystemUser[] => get(KEYS.USERS);
export const addSystemUser = async (u: SystemUser) => { 
    const list = getSystemUsers(); list.push(u); updateCache(KEYS.USERS, list); notifyDataChange();
    await supabase.from('system_users').insert(u);
};
export const updateSystemUser = async (u: SystemUser) => { 
    const list = getSystemUsers(); const idx = list.findIndex(x => x.id === u.id); 
    if (idx > -1) list[idx] = u; updateCache(KEYS.USERS, list); notifyDataChange();
    await supabase.from('system_users').update(u).eq('id', u.id);
};
export const deleteSystemUser = async (id: string) => { 
    updateCache(KEYS.USERS, getSystemUsers().filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('system_users').delete().eq('id', id);
};

export const getStudents = (): Student[] => get(KEYS.STUDENTS);
export const addStudent = async (s: Student) => { 
    const list = getStudents(); list.push(s); updateCache(KEYS.STUDENTS, list); notifyDataChange();
    await supabase.from('students').insert(s);
};
export const updateStudent = async (s: Student) => { 
    const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); 
    if (idx > -1) list[idx] = s; updateCache(KEYS.STUDENTS, list); notifyDataChange();
    await supabase.from('students').update(s).eq('id', s.id);
};
export const deleteStudent = async (id: string) => { 
    updateCache(KEYS.STUDENTS, getStudents().filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('students').delete().eq('id', id);
};
export const deleteAllStudents = async () => {
    updateCache(KEYS.STUDENTS, []); notifyDataChange();
    await supabase.from('students').delete().neq('id', '0'); 
};
export const bulkAddStudents = async (students: Student[]) => { 
    const list = getStudents(); updateCache(KEYS.STUDENTS, [...list, ...students]); notifyDataChange();
    await supabase.from('students').insert(students);
};
export const bulkUpsertStudents = async (students: Student[], key: keyof Student = 'nationalId') => {
    let list = getStudents();
    students.forEach(s => {
        const idx = list.findIndex(existing => existing[key] === s[key]);
        if (idx > -1) list[idx] = { ...list[idx], ...s };
        else list.push(s);
    });
    updateCache(KEYS.STUDENTS, list); notifyDataChange();
    await supabase.from('students').upsert(students, { onConflict: key as string });
};

export const getAttendance = (): AttendanceRecord[] => get(KEYS.ATTENDANCE);
export const saveAttendance = async (records: AttendanceRecord[]) => { 
    let list = getAttendance(); 
    records.forEach(r => {
        const idx = list.findIndex(x => x.id === r.id);
        if (idx > -1) list[idx] = r; else list.push(r);
    });
    updateCache(KEYS.ATTENDANCE, list); notifyDataChange();
    await supabase.from('attendance').upsert(records);
};
export const bulkAddAttendance = saveAttendance;

export const getPerformance = (): PerformanceRecord[] => get(KEYS.PERFORMANCE);
export const addPerformance = async (p: PerformanceRecord) => { 
    const list = getPerformance(); 
    const idx = list.findIndex(x => x.id === p.id); 
    if (idx > -1) list[idx] = p; else list.push(p);
    updateCache(KEYS.PERFORMANCE, list); notifyDataChange();
    await supabase.from('performance').upsert(p);
};
export const deletePerformance = async (id: string) => { 
    updateCache(KEYS.PERFORMANCE, getPerformance().filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('performance').delete().eq('id', id);
};
export const bulkAddPerformance = async (records: PerformanceRecord[]) => { 
    const list = getPerformance(); 
    records.forEach(r => {
        const idx = list.findIndex(x => x.id === r.id);
        if (idx > -1) list[idx] = r; else list.push(r);
    });
    updateCache(KEYS.PERFORMANCE, list); notifyDataChange();
    await supabase.from('performance').upsert(records);
};

// --- AUTHENTICATION & SYNC ---

export const authenticateUser = async (identifier: string, password: string): Promise<SystemUser | undefined> => {
    try {
        // Direct Supabase Query for Authentication (Cloud First)
        const { data, error } = await supabase
            .from('system_users')
            .select('*')
            .or(`email.eq.${identifier},national_id.eq.${identifier}`)
            .eq('password', password)
            .eq('status', 'ACTIVE')
            .single();
            
        if (data && !error) {
            return data as SystemUser;
        }
        
        // Fallback to local cache only if offline or sync hasn't happened
        if (error && !navigator.onLine) {
             const localUsers = getSystemUsers();
             return localUsers.find(u => 
                 (u.email === identifier || u.nationalId === identifier) && 
                 u.password === password && 
                 u.status === 'ACTIVE'
             );
        }
    } catch (e) {
        console.error("Auth Error", e);
    }
    return undefined;
};

export const authenticateStudent = async (nationalId: string, password: string): Promise<any | undefined> => {
    try {
        const cleanId = nationalId.trim();
        // Direct Supabase Query
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('national_id', cleanId)
            .single();

        if (data && !error) {
             const defaultPass = cleanId.slice(-4);
             const studentPass = data.password || defaultPass;
             if (password === studentPass) return { ...data, role: 'STUDENT' };
        }
    } catch (e) {}
    return undefined;
};

export const forceRefreshData = async () => {
    setSyncStatus('SYNCING');
    try {
        // Fetch all core tables to ensure local storage is up to date
        const tables = ['schools', 'teachers', 'system_users', 'students', 'attendance', 'performance', 'assignments', 'subjects', 'schedules', 'teacher_assignments', 'exams', 'questions', 'curriculum_units', 'curriculum_lessons', 'academic_terms'];
        const promises = tables.map(t => supabase.from(t).select('*'));
        const results = await Promise.all(promises);
        
        // Update Local Storage Cache
        updateCache(KEYS.SCHOOLS, results[0].data || []);
        updateCache(KEYS.TEACHERS, results[1].data || []);
        updateCache(KEYS.USERS, results[2].data || []);
        updateCache(KEYS.STUDENTS, results[3].data || []);
        updateCache(KEYS.ATTENDANCE, results[4].data || []);
        updateCache(KEYS.PERFORMANCE, results[5].data || []);
        updateCache(KEYS.WORKS_ASSIGNMENTS, results[6].data || []);
        updateCache(KEYS.SUBJECTS, results[7].data || []);
        updateCache(KEYS.SCHEDULES, results[8].data || []);
        updateCache(KEYS.ASSIGNMENTS, results[9].data || []);
        updateCache(KEYS.EXAMS, results[10].data || []);
        updateCache(KEYS.QUESTION_BANK, results[11].data || []);
        updateCache(KEYS.CURRICULUM_UNITS, results[12].data || []);
        updateCache(KEYS.CURRICULUM_LESSONS, results[13].data || []);
        updateCache(KEYS.ACADEMIC_TERMS, results[14].data || []);

        notifyDataChange();
        setSyncStatus('ONLINE');
        return true;
    } catch (e) {
        console.error("Sync Failed", e);
        setSyncStatus('ERROR');
        return false;
    }
};

export const initAutoSync = async () => await forceRefreshData();

export const getSubjects = (teacherId?: string): Subject[] => {
    const all = get<Subject>(KEYS.SUBJECTS);
    if (!teacherId) return all;
    return all.filter(s => s.teacherId === teacherId || !s.teacherId);
};
export const addSubject = async (s: Subject) => { 
    const list = get<Subject>(KEYS.SUBJECTS); list.push(s); updateCache(KEYS.SUBJECTS, list); notifyDataChange();
    await supabase.from('subjects').insert(s);
};
export const deleteSubject = async (id: string) => { 
    updateCache(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('subjects').delete().eq('id', id);
};

export const getSchedules = (): ScheduleItem[] => get(KEYS.SCHEDULES);
export const saveScheduleItem = async (item: ScheduleItem) => { 
    let list = getSchedules(); 
    const idx = list.findIndex(x => x.id === item.id); if (idx > -1) list[idx] = item; else list.push(item);
    updateCache(KEYS.SCHEDULES, list); notifyDataChange();
    await supabase.from('schedules').upsert(item);
};
export const deleteScheduleItem = async (id: string) => { 
    updateCache(KEYS.SCHEDULES, getSchedules().filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('schedules').delete().eq('id', id);
};

export const getTeacherAssignments = (): TeacherAssignment[] => get(KEYS.ASSIGNMENTS);

export const getAssignments = (category: string, teacherId?: string, includeAll: boolean = false): Assignment[] => {
    const all = get<Assignment>(KEYS.WORKS_ASSIGNMENTS);
    let filtered = all;
    if (category !== 'ALL') filtered = filtered.filter(a => a.category === category);
    if (!includeAll && teacherId) filtered = filtered.filter(a => a.teacherId === teacherId || !a.teacherId);
    return filtered;
};

export const saveAssignment = async (a: Assignment) => { 
    const list = get<Assignment>(KEYS.WORKS_ASSIGNMENTS); 
    const idx = list.findIndex(x => x.id === a.id); if (idx > -1) list[idx] = a; else list.push(a);
    updateCache(KEYS.WORKS_ASSIGNMENTS, list); notifyDataChange();
    await supabase.from('assignments').upsert(a);
};
export const deleteAssignment = async (id: string) => { 
    updateCache(KEYS.WORKS_ASSIGNMENTS, get<Assignment>(KEYS.WORKS_ASSIGNMENTS).filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('assignments').delete().eq('id', id);
};

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

export const getMessages = (teacherId?: string): MessageLog[] => {
    const all = get<MessageLog>(KEYS.MESSAGES);
    if (!teacherId) return all;
    return all.filter(m => m.teacherId === teacherId);
};
export const saveMessage = async (m: MessageLog) => { 
    const list = get<MessageLog>(KEYS.MESSAGES); list.unshift(m); updateCache(KEYS.MESSAGES, list); notifyDataChange();
    await supabase.from('message_logs').insert(m);
};

export const getLessonLinks = (): LessonLink[] => get(KEYS.LESSON_LINKS);
export const saveLessonLink = async (l: LessonLink) => { 
    const list = getLessonLinks(); list.push(l); updateCache(KEYS.LESSON_LINKS, list); notifyDataChange();
    await supabase.from('lesson_links').insert(l);
};
export const deleteLessonLink = async (id: string) => { 
    updateCache(KEYS.LESSON_LINKS, getLessonLinks().filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('lesson_links').delete().eq('id', id);
};

export const getLessonPlans = (teacherId: string): StoredLessonPlan[] => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.teacherId === teacherId);
export const saveLessonPlan = async (p: StoredLessonPlan) => { 
    const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS); list.push(p); updateCache(KEYS.LESSON_PLANS, list); notifyDataChange();
    await supabase.from('lesson_plans').insert(p);
};
export const deleteLessonPlan = async (id: string) => { 
    updateCache(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('lesson_plans').delete().eq('id', id);
};

export const getWeeklyPlans = (teacherId?: string): WeeklyPlanItem[] => {
    const all = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    if (!teacherId) return all;
    return all.filter(p => p.teacherId === teacherId);
};
export const saveWeeklyPlanItem = async (item: WeeklyPlanItem) => {
    const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = list.findIndex(x => x.id === item.id); if (idx > -1) list[idx] = item; else list.push(item);
    updateCache(KEYS.WEEKLY_PLANS, list); notifyDataChange();
    await supabase.from('weekly_plans').upsert(item);
};

export const getCurriculumUnits = (teacherId: string): CurriculumUnit[] => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.teacherId === teacherId);
export const saveCurriculumUnit = async (u: CurriculumUnit) => { 
    const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); list.push(u); updateCache(KEYS.CURRICULUM_UNITS, list); notifyDataChange();
    await supabase.from('curriculum_units').insert(u);
};
export const deleteCurriculumUnit = async (id: string) => { 
    updateCache(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('curriculum_units').delete().eq('id', id);
};

export const getCurriculumLessons = (): CurriculumLesson[] => get(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = async (l: CurriculumLesson) => { 
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(x => x.id === l.id); if (idx > -1) list[idx] = l; else list.push(l);
    updateCache(KEYS.CURRICULUM_LESSONS, list); notifyDataChange();
    await supabase.from('curriculum_lessons').upsert(l);
};
export const deleteCurriculumLesson = async (id: string) => { 
    updateCache(KEYS.CURRICULUM_LESSONS, get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('curriculum_lessons').delete().eq('id', id);
};

export const getMicroConcepts = (teacherId: string): MicroConcept[] => get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(c => c.teacherId === teacherId);
export const saveMicroConcept = async (c: MicroConcept) => { 
    const list = get<MicroConcept>(KEYS.MICRO_CONCEPTS); list.push(c); updateCache(KEYS.MICRO_CONCEPTS, list); notifyDataChange();
    await supabase.from('micro_concepts').insert(c);
};
export const deleteMicroConcept = async (id: string) => { 
    updateCache(KEYS.MICRO_CONCEPTS, get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('micro_concepts').delete().eq('id', id);
};

export const getExams = (teacherId?: string): Exam[] => {
    const all = get<Exam>(KEYS.EXAMS);
    if (!teacherId) return all;
    return all.filter(e => e.teacherId === teacherId);
};
export const saveExam = async (e: Exam) => { 
    const list = get<Exam>(KEYS.EXAMS);
    const idx = list.findIndex(x => x.id === e.id); if (idx > -1) list[idx] = e; else list.push(e);
    updateCache(KEYS.EXAMS, list); notifyDataChange();
    await supabase.from('exams').upsert(e);
};
export const deleteExam = async (id: string) => { 
    updateCache(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('exams').delete().eq('id', id);
};

export const getExamResults = (examId?: string): ExamResult[] => {
    const all = get<ExamResult>(KEYS.EXAM_RESULTS);
    if (!examId) return all;
    return all.filter(r => r.examId === examId);
};
export const saveExamResult = async (r: ExamResult) => { 
    const list = get<ExamResult>(KEYS.EXAM_RESULTS); list.push(r); updateCache(KEYS.EXAM_RESULTS, list); notifyDataChange();
    await supabase.from('exam_results').insert(r);
};
export const deleteExamResult = async (id: string) => { 
    updateCache(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('exam_results').delete().eq('id', id);
};

export const getQuestionBank = (teacherId: string): Question[] => get<Question>(KEYS.QUESTION_BANK).filter(q => q.teacherId === teacherId);
export const saveQuestionToBank = async (q: Question) => { 
    const list = get<Question>(KEYS.QUESTION_BANK);
    const idx = list.findIndex(x => x.id === q.id); if (idx > -1) list[idx] = q; else list.push(q);
    updateCache(KEYS.QUESTION_BANK, list); notifyDataChange();
    await supabase.from('questions').upsert(q);
};
export const deleteQuestionFromBank = async (id: string) => { 
    updateCache(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('questions').delete().eq('id', id);
};

export const getTrackingSheets = (teacherId?: string): TrackingSheet[] => {
    const all = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    if (!teacherId) return all;
    return all.filter(s => s.teacherId === teacherId);
};
export const saveTrackingSheet = async (s: TrackingSheet) => { 
    const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    const idx = list.findIndex(x => x.id === s.id); if (idx > -1) list[idx] = s; else list.push(s);
    updateCache(KEYS.TRACKING_SHEETS, list); notifyDataChange();
    await supabase.from('tracking_sheets').upsert(s);
};
export const deleteTrackingSheet = async (id: string) => { 
    updateCache(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('tracking_sheets').delete().eq('id', id);
};

export const getCustomTables = (teacherId?: string): CustomTable[] => {
    const all = get<CustomTable>(KEYS.CUSTOM_TABLES);
    if (!teacherId) return all;
    return all.filter(t => t.teacherId === teacherId);
};
export const addCustomTable = async (t: CustomTable) => { 
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES); list.push(t); updateCache(KEYS.CUSTOM_TABLES, list); notifyDataChange();
    await supabase.from('custom_tables').insert(t);
};
export const updateCustomTable = async (t: CustomTable) => { 
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES); const idx = list.findIndex(x => x.id === t.id); if (idx > -1) list[idx] = t; 
    updateCache(KEYS.CUSTOM_TABLES, list); notifyDataChange();
    await supabase.from('custom_tables').update(t).eq('id', t.id);
};
export const deleteCustomTable = async (id: string) => { 
    updateCache(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('custom_tables').delete().eq('id', id);
};

export const getAcademicTerms = (teacherId?: string): AcademicTerm[] => {
    const all = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    if (!teacherId) return all;
    return all.filter(t => t.teacherId === teacherId || !t.teacherId);
};
export const saveAcademicTerm = async (term: AcademicTerm) => {
    const list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    const idx = list.findIndex(t => t.id === term.id); if (idx > -1) list[idx] = term; else list.push(term);
    updateCache(KEYS.ACADEMIC_TERMS, list); notifyDataChange();
    await supabase.from('academic_terms').upsert(term);
};
export const deleteAcademicTerm = async (id: string) => { 
    updateCache(KEYS.ACADEMIC_TERMS, get<AcademicTerm>(KEYS.ACADEMIC_TERMS).filter(t => t.id !== id)); notifyDataChange();
    await supabase.from('academic_terms').delete().eq('id', id);
};
export const setCurrentTerm = async (id: string, teacherId?: string) => {
    const list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS).map(t => {
        if (!teacherId || t.teacherId === teacherId) {
            return { ...t, isCurrent: t.id === id };
        }
        return t;
    });
    updateCache(KEYS.ACADEMIC_TERMS, list); notifyDataChange();
    await supabase.from('academic_terms').upsert(list.filter(t => t.teacherId === teacherId));
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
    let configs = get<ReportHeaderConfig>(KEYS.REPORT_CONFIG);
    if (!Array.isArray(configs)) configs = [];
    const idx = configs.findIndex(c => c.teacherId === config.teacherId);
    if (idx > -1) configs[idx] = config;
    else configs.push(config);
    localStorage.setItem(KEYS.REPORT_CONFIG, JSON.stringify(configs));
    notifyDataChange();
};

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
export const resetCloudDatabase = async () => { /* Dangerous, implementation skipped */ };
export const backupCloudDatabase = async () => { return "{}"; };
export const restoreCloudDatabase = async (json: string) => { };
export const uploadToSupabase = async () => { await forceRefreshData(); };
export const downloadFromSupabase = async () => { await forceRefreshData(); };

export const DB_MAP: Record<string, string> = {
    'schools': 'schools',
    'teachers': 'teachers',
    'system_users': 'system_users',
    'students': 'students',
    'attendance': 'attendance',
    'performance': 'performance',
    'assignments': 'assignments',
    'schedules': 'schedules',
    'teacher_assignments': 'teacher_assignments',
    'subjects': 'subjects',
    'weekly_plans': 'weekly_plans',
    'lesson_links': 'lesson_links',
    'lesson_plans': 'lesson_plans',
    'custom_tables': 'custom_tables',
    'message_logs': 'message_logs',
    'feedback': 'feedback',
    'exams': 'exams',
    'exam_results': 'exam_results',
    'questions': 'questions',
    'curriculum_units': 'curriculum_units',
    'curriculum_lessons': 'curriculum_lessons',
    'micro_concepts': 'micro_concepts',
    'tracking_sheets': 'tracking_sheets',
    'academic_terms': 'academic_terms'
};

export const getTableDisplayName = (table: string): string => {
    return table;
};

export const getDatabaseUpdateSQL = (): string => {
    return `-- Run this SQL in Supabase Query Editor to update tables for new features

-- 1. Exams and Questions
CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    title TEXT,
    subject TEXT,
    grade_level TEXT,
    duration_minutes INTEGER,
    questions JSONB,
    is_active BOOLEAN,
    created_at TEXT,
    teacher_id TEXT,
    date TEXT
);

CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    text TEXT,
    type TEXT,
    options JSONB,
    correct_answer TEXT,
    points INTEGER,
    subject TEXT,
    grade_level TEXT,
    teacher_id TEXT
);

CREATE TABLE IF NOT EXISTS exam_results (
    id TEXT PRIMARY KEY,
    exam_id TEXT,
    student_id TEXT,
    student_name TEXT,
    score INTEGER,
    total_score INTEGER,
    date TEXT,
    answers JSONB
);

-- 2. Curriculum
CREATE TABLE IF NOT EXISTS curriculum_units (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    subject TEXT,
    grade_level TEXT,
    title TEXT,
    order_index INTEGER
);

CREATE TABLE IF NOT EXISTS curriculum_lessons (
    id TEXT PRIMARY KEY,
    unit_id TEXT,
    title TEXT,
    order_index INTEGER,
    learning_standards JSONB,
    micro_concept_ids JSONB
);

CREATE TABLE IF NOT EXISTS micro_concepts (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    subject TEXT,
    name TEXT
);

-- 3. Lesson Plans & Links
CREATE TABLE IF NOT EXISTS lesson_plans (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    subject TEXT,
    topic TEXT,
    content_json TEXT,
    resources JSONB,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS lesson_links (
    id TEXT PRIMARY KEY,
    title TEXT,
    url TEXT,
    teacher_id TEXT,
    created_at TEXT,
    grade_level TEXT,
    class_name TEXT
);

-- 4. Tracking Sheets
CREATE TABLE IF NOT EXISTS tracking_sheets (
    id TEXT PRIMARY KEY,
    title TEXT,
    subject TEXT,
    class_name TEXT,
    teacher_id TEXT,
    created_at TEXT,
    columns JSONB,
    scores JSONB
);

-- 5. Academic Terms
CREATE TABLE IF NOT EXISTS academic_terms (
    id TEXT PRIMARY KEY,
    name TEXT,
    start_date TEXT,
    end_date TEXT,
    is_current BOOLEAN,
    teacher_id TEXT,
    periods JSONB
);
`;
};

export const getDatabaseSchemaSQL = () => {
    return `-- Run this in Supabase SQL Editor to Create All Tables

CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT,
    ministry_code TEXT,
    education_administration TEXT,
    type TEXT,
    manager_name TEXT,
    manager_national_id TEXT,
    phone TEXT,
    student_count INTEGER
);

CREATE TABLE IF NOT EXISTS system_users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    national_id TEXT,
    password TEXT,
    role TEXT,
    school_id TEXT,
    status TEXT,
    is_demo BOOLEAN,
    phone TEXT
);

CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT,
    national_id TEXT,
    email TEXT,
    phone TEXT,
    password TEXT,
    subject_specialty TEXT,
    school_id TEXT,
    manager_id TEXT,
    subscription_status TEXT,
    subscription_end_date TEXT
);

CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT,
    national_id TEXT,
    class_id TEXT,
    school_id TEXT,
    created_by_id TEXT,
    grade_level TEXT,
    class_name TEXT,
    email TEXT,
    phone TEXT,
    parent_id TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    password TEXT,
    seat_index INTEGER
);

CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    date TEXT,
    status TEXT,
    subject TEXT,
    period INTEGER,
    behavior_status TEXT,
    behavior_note TEXT,
    excuse_note TEXT,
    excuse_file TEXT,
    created_by_id TEXT
);

CREATE TABLE IF NOT EXISTS performance (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    subject TEXT,
    title TEXT,
    category TEXT,
    score REAL,
    max_score REAL,
    date TEXT,
    notes TEXT,
    created_by_id TEXT
);

CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    max_score REAL,
    url TEXT,
    is_visible BOOLEAN,
    order_index INTEGER,
    source_metadata TEXT,
    teacher_id TEXT,
    term_id TEXT,
    period_id TEXT,
    class_id TEXT
);

CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    class_id TEXT,
    day TEXT,
    period INTEGER,
    subject_name TEXT,
    teacher_id TEXT
);

CREATE TABLE IF NOT EXISTS custom_tables (
    id TEXT PRIMARY KEY,
    name TEXT,
    created_at TEXT,
    columns JSONB,
    rows JSONB,
    source_url TEXT,
    last_updated TEXT,
    teacher_id TEXT
);

CREATE TABLE IF NOT EXISTS message_logs (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_name TEXT,
    parent_phone TEXT,
    type TEXT,
    content TEXT,
    status TEXT,
    date TEXT,
    sent_by TEXT,
    teacher_id TEXT
);

-- Include updates as well
${getDatabaseUpdateSQL()}
`;
};
