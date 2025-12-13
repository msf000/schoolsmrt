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
    WORKS_MASTER_URL: 'works_master_url',
    PERIOD_TIMINGS: 'period_timings' // NEW KEY
};

export const DEFAULT_PERIOD_TIMES = [
    "07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", 
    "09:15 - 10:00", "10:30 - 11:15", "11:15 - 12:00", 
    "12:00 - 12:45", "12:45 - 01:30"
];

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
};

// ... (Rest of existing imports and setup code remains unchanged)

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

// --- HELPER: Cascading Delete for Teacher Data ---
const cleanupTeacherData = async (teacherId: string) => {
    console.log(`Cleaning up data for teacher: ${teacherId}`);
    
    // 1. Cleanup Local Cache IMMEDIATELY (Optimistic)
    updateCache(KEYS.STUDENTS, getStudents().filter(s => s.createdById !== teacherId));
    updateCache(KEYS.ATTENDANCE, getAttendance().filter(a => a.createdById !== teacherId));
    updateCache(KEYS.PERFORMANCE, getPerformance().filter(p => p.createdById !== teacherId));
    updateCache(KEYS.WORKS_ASSIGNMENTS, get<Assignment>(KEYS.WORKS_ASSIGNMENTS).filter(a => a.teacherId !== teacherId));
    updateCache(KEYS.ASSIGNMENTS, getTeacherAssignments().filter(a => a.teacherId !== teacherId));
    updateCache(KEYS.SCHEDULES, getSchedules().filter(s => s.teacherId !== teacherId));
    updateCache(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(s => s.teacherId !== teacherId));
    updateCache(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.teacherId !== teacherId));
    updateCache(KEYS.LESSON_LINKS, getLessonLinks().filter(l => l.teacherId !== teacherId));
    updateCache(KEYS.EXAMS, getExams().filter(e => e.teacherId !== teacherId));
    updateCache(KEYS.QUESTION_BANK, getQuestionBank(teacherId).filter(q => q.teacherId !== teacherId));
    updateCache(KEYS.MESSAGES, getMessages().filter(m => m.teacherId !== teacherId));
    updateCache(KEYS.CUSTOM_TABLES, getCustomTables().filter(t => t.teacherId !== teacherId));
    updateCache(KEYS.TRACKING_SHEETS, getTrackingSheets().filter(t => t.teacherId !== teacherId));
    updateCache(KEYS.ACADEMIC_TERMS, getAcademicTerms().filter(t => t.teacherId !== teacherId));
    updateCache(KEYS.WEEKLY_PLANS, getWeeklyPlans().filter(p => p.teacherId !== teacherId));
    notifyDataChange();

    // 2. Delete from Cloud Tables (Parallel) in Background
    await Promise.all([
        supabase.from('students').delete().eq('createdById', teacherId),
        supabase.from('attendance').delete().eq('createdById', teacherId),
        supabase.from('performance').delete().eq('createdById', teacherId),
        supabase.from('assignments').delete().eq('teacherId', teacherId),
        supabase.from('teacher_assignments').delete().eq('teacherId', teacherId),
        supabase.from('schedules').delete().eq('teacherId', teacherId),
        supabase.from('subjects').delete().eq('teacherId', teacherId),
        supabase.from('lesson_plans').delete().eq('teacherId', teacherId),
        supabase.from('lesson_links').delete().eq('teacherId', teacherId),
        supabase.from('exams').delete().eq('teacherId', teacherId),
        supabase.from('questions').delete().eq('teacherId', teacherId),
        supabase.from('curriculum_units').delete().eq('teacherId', teacherId),
        supabase.from('micro_concepts').delete().eq('teacherId', teacherId),
        supabase.from('message_logs').delete().eq('teacherId', teacherId),
        supabase.from('custom_tables').delete().eq('teacherId', teacherId),
        supabase.from('tracking_sheets').delete().eq('teacherId', teacherId),
        supabase.from('academic_terms').delete().eq('teacherId', teacherId),
        supabase.from('weekly_plans').delete().eq('teacherId', teacherId),
        supabase.from('feedback').delete().eq('teacherId', teacherId)
    ]).catch(err => console.error("Cloud cleanup failed", err));
};

// ... (Rest of sync logic and CRUD operations) ...

export const forceRefreshData = async () => {
    setSyncStatus('SYNCING');
    try {
        console.log("Forcing data refresh from cloud...");
        const [
            schools, teachers, users, students, attendance, performance, 
            assignments, subjects, schedules, teacherAssignments, 
            exams, questions, units, lessons, terms
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
            supabase.from('academic_terms').select('*'),
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
        if(terms.data) updateCache(KEYS.ACADEMIC_TERMS, terms.data);

        notifyDataChange();
        setSyncStatus('ONLINE');
        return true;
    } catch (e) {
        console.error("Force Refresh Failed", e);
        setSyncStatus('ERROR');
        return false;
    }
};

// ... (Existing CRUD functions) ...

export const getSchools = (): School[] => get(KEYS.SCHOOLS);
export const addSchool = async (s: School) => { 
    const list = getSchools(); list.push(s); updateCache(KEYS.SCHOOLS, list); notifyDataChange();
    const { error } = await supabase.from('schools').insert(s);
    if(error) console.error("Cloud Error:", error);
};
export const updateSchool = async (s: School) => { 
    const list = getSchools(); const idx = list.findIndex(x => x.id === s.id); 
    if (idx > -1) list[idx] = s; updateCache(KEYS.SCHOOLS, list); notifyDataChange();
    const { error } = await supabase.from('schools').update(s).eq('id', s.id);
    if(error) console.error("Cloud Error:", error);
};
export const deleteSchool = async (id: string) => { 
    updateCache(KEYS.SCHOOLS, getSchools().filter(x => x.id !== id)); notifyDataChange();
    await supabase.from('schools').delete().eq('id', id);
};

export const getTeachers = (): Teacher[] => get(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => { 
    const list = getTeachers(); list.push(t); updateCache(KEYS.TEACHERS, list); notifyDataChange();
    await addSystemUser({
        id: t.id, name: t.name, email: t.email || t.id, nationalId: t.nationalId, 
        password: t.password || '123456', role: 'TEACHER', schoolId: t.schoolId, status: 'ACTIVE'
    });
    const { error } = await supabase.from('teachers').insert(t);
    if(error) console.error("Cloud Error:", error);
};
export const updateTeacher = async (t: Teacher) => { 
    const list = getTeachers(); const idx = list.findIndex(x => x.id === t.id); 
    if (idx > -1) list[idx] = t; updateCache(KEYS.TEACHERS, list); notifyDataChange();
    const { error } = await supabase.from('teachers').update(t).eq('id', t.id);
    if(error) console.error("Cloud Error:", error);
};

// ... (System User, Student, Attendance, Performance CRUD) ...
export const getSystemUsers = (): SystemUser[] => get(KEYS.USERS);
export const addSystemUser = async (u: SystemUser) => { 
    const list = getSystemUsers(); list.push(u); updateCache(KEYS.USERS, list); notifyDataChange();
    const { error } = await supabase.from('system_users').insert(u);
    if(error) console.error("Cloud Error:", error);
};
export const updateSystemUser = async (u: SystemUser) => { 
    const list = getSystemUsers(); const idx = list.findIndex(x => x.id === u.id); 
    if (idx > -1) list[idx] = u; updateCache(KEYS.USERS, list); notifyDataChange();
    const { error } = await supabase.from('system_users').update(u).eq('id', u.id);
    if(error) console.error("Cloud Error:", error);
};
export const deleteTeacher = async (id: string) => { 
    await cleanupTeacherData(id);
    updateCache(KEYS.TEACHERS, getTeachers().filter(x => x.id !== id)); 
    updateCache(KEYS.USERS, getSystemUsers().filter(x => x.id !== id));
    notifyDataChange();

    await Promise.all([
        supabase.from('teachers').delete().eq('id', id),
        supabase.from('system_users').delete().eq('id', id)
    ]);
};
export const deleteSystemUser = async (id: string) => { 
    const user = getSystemUsers().find(u => u.id === id);
    if (user && user.role === 'TEACHER') {
        await cleanupTeacherData(id);
        updateCache(KEYS.TEACHERS, getTeachers().filter(x => x.id !== id)); 
        supabase.from('teachers').delete().eq('id', id); 
    }
    updateCache(KEYS.USERS, getSystemUsers().filter(x => x.id !== id)); 
    notifyDataChange();
    await supabase.from('system_users').delete().eq('id', id);
};
export const getStudents = (): Student[] => get(KEYS.STUDENTS);
export const addStudent = async (s: Student) => { 
    const list = getStudents(); list.push(s); updateCache(KEYS.STUDENTS, list); notifyDataChange();
    const { error } = await supabase.from('students').insert(s);
    if(error) console.error("Cloud Error:", error);
};
export const updateStudent = async (s: Student) => { 
    const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); 
    if (idx > -1) list[idx] = s; updateCache(KEYS.STUDENTS, list); notifyDataChange();
    const { error } = await supabase.from('students').update(s).eq('id', s.id);
    if(error) console.error("Cloud Error:", error);
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
    const { error } = await supabase.from('students').insert(students);
    if(error) console.error("Cloud Error:", error);
};
export const bulkUpsertStudents = async (students: Student[], key: keyof Student = 'nationalId') => {
    let list = getStudents();
    students.forEach(s => {
        const idx = list.findIndex(existing => existing[key] === s[key]);
        if (idx > -1) list[idx] = { ...list[idx], ...s };
        else list.push(s);
    });
    updateCache(KEYS.STUDENTS, list); notifyDataChange();
    const { error } = await supabase.from('students').upsert(students, { onConflict: key as string });
    if (error) console.error("Cloud Error:", error);
};
export const getAttendance = (): AttendanceRecord[] => get(KEYS.ATTENDANCE);
export const saveAttendance = async (records: AttendanceRecord[]) => { 
    let list = getAttendance(); 
    records.forEach(r => {
        const idx = list.findIndex(x => x.id === r.id);
        if (idx > -1) list[idx] = r; else list.push(r);
    });
    updateCache(KEYS.ATTENDANCE, list); notifyDataChange();
    const { error } = await supabase.from('attendance').upsert(records);
    if(error) console.error("Cloud Error:", error);
};
export const bulkAddAttendance = saveAttendance;
export const getPerformance = (): PerformanceRecord[] => get(KEYS.PERFORMANCE);
export const addPerformance = async (p: PerformanceRecord) => { 
    const list = getPerformance(); 
    const idx = list.findIndex(x => x.id === p.id); 
    if (idx > -1) list[idx] = p; else list.push(p);
    updateCache(KEYS.PERFORMANCE, list); notifyDataChange();
    const { error } = await supabase.from('performance').upsert(p);
    if(error) console.error("Cloud Error:", error);
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
    const { error } = await supabase.from('performance').upsert(records);
    if(error) console.error("Cloud Error:", error);
};

// ... (Authentication) ...
export const authenticateUser = async (identifier: string, password: string): Promise<SystemUser | undefined> => {
    try {
        const { data, error } = await supabase
            .from('system_users')
            .select('*')
            .or(`email.eq.${identifier},nationalId.eq.${identifier}`)
            .eq('password', password)
            .eq('status', 'ACTIVE')
            .single();
        if (data && !error) return data as SystemUser;
    } catch (e) { console.error("Cloud auth failed:", e); }
    return undefined;
};
export const authenticateStudent = async (nationalId: string, password: string): Promise<any | undefined> => {
    try {
        const cleanId = nationalId.trim();
        const defaultPass = cleanId.slice(-4);
        
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('nationalId', cleanId)
            .single();
            
        if (data && !error) {
             const studentPass = data.password || defaultPass;
             if (password === studentPass) {
                 return {
                     id: data.id,
                     name: data.name,
                     role: 'STUDENT',
                     nationalId: data.nationalId,
                     schoolId: data.schoolId,
                     className: data.className,
                     gradeLevel: data.gradeLevel
                 };
             }
        }
    } catch (e) { console.error("Student auth failed:", e); }
    return undefined;
};

export const initAutoSync = async () => { return await forceRefreshData(); };

// ... (Other entity functions) ...
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
export const getFeedback = (): Feedback[] => get(KEYS.FEEDBACK);
export const addFeedback = async (f: Feedback) => { 
    const list = getFeedback(); list.push(f); updateCache(KEYS.FEEDBACK, list); notifyDataChange();
    await supabase.from('feedback').insert(f);
};
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

// --- NEW PERIOD TIMINGS LOGIC ---
export const getTeacherPeriodTimings = (teacherId: string): string[] => {
    const allSettings = get<any>(KEYS.PERIOD_TIMINGS);
    // Find settings for this teacher, or return default
    if (Array.isArray(allSettings)) {
        const teacherSetting = allSettings.find(s => s.teacherId === teacherId);
        if (teacherSetting && Array.isArray(teacherSetting.timings)) {
            return teacherSetting.timings;
        }
    }
    return DEFAULT_PERIOD_TIMES;
};

export const saveTeacherPeriodTimings = (teacherId: string, timings: string[]) => {
    let allSettings = get<any>(KEYS.PERIOD_TIMINGS);
    if (!Array.isArray(allSettings)) allSettings = [];
    
    const idx = allSettings.findIndex(s => s.teacherId === teacherId);
    if (idx > -1) {
        allSettings[idx] = { teacherId, timings };
    } else {
        allSettings.push({ teacherId, timings });
    }
    
    updateCache(KEYS.PERIOD_TIMINGS, allSettings);
    notifyDataChange();
};

// ... (Rest of file: statistics, backup/restore, cloud bridge functions) ...
export const getStorageStatistics = () => {
    return {
        students: getStudents().length,
        attendance: getAttendance().length,
        performance: getPerformance().length
    };
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
export const uploadToSupabase = async () => { return true; };
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
export const resetCloudDatabase = async () => { };
export const backupCloudDatabase = async () => { return "{}"; };
export const restoreCloudDatabase = async (json: string) => { };
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
    const map: Record<string, string> = {
        'schools': 'المدارس',
        'teachers': 'المعلمين',
        'system_users': 'مستخدمي النظام',
        'students': 'الطلاب',
        'attendance': 'الحضور',
        'performance': 'الأداء (الدرجات)',
        'assignments': 'التعيينات',
        'schedules': 'الجداول',
        'teacher_assignments': 'توزيع المعلمين',
        'subjects': 'المواد',
        'weekly_plans': 'الخطط الأسبوعية',
        'lesson_links': 'روابط الدروس',
        'lesson_plans': 'خطط الدروس',
        'custom_tables': 'الجداول المخصصة',
        'message_logs': 'سجل الرسائل',
        'feedback': 'الملاحظات',
        'exams': 'الاختبارات',
        'exam_results': 'نتائج الاختبارات',
        'questions': 'بنك الأسئلة',
        'curriculum_units': 'وحدات المنهج',
        'curriculum_lessons': 'دروس المنهج',
        'micro_concepts': 'المفاهيم الدقيقة',
        'tracking_sheets': 'سجلات الرصد',
        'academic_terms': 'الفصول الدراسية'
    };
    return map[table] || table;
};

// --- SQL Generation for Admin Dashboard ---
export const getDatabaseSchemaSQL = () => {
    return `
-- 1. Schools
create table if not exists schools (
  id text primary key,
  name text not null,
  ministry_code text,
  manager_name text,
  manager_national_id text,
  education_administration text,
  type text,
  phone text,
  student_count int,
  works_master_url text
);

-- 2. Teachers
create table if not exists teachers (
  id text primary key,
  name text not null,
  national_id text,
  email text,
  phone text,
  password text,
  subject_specialty text,
  school_id text references schools(id),
  manager_id text,
  subscription_status text,
  subscription_end_date text
);

-- 3. System Users
create table if not exists system_users (
  id text primary key,
  name text not null,
  email text,
  national_id text,
  password text,
  role text,
  school_id text,
  status text,
  phone text,
  is_demo boolean
);

-- 4. Students
create table if not exists students (
  id text primary key,
  name text not null,
  national_id text,
  class_name text,
  grade_level text,
  phone text,
  email text,
  parent_name text,
  parent_phone text,
  parent_email text,
  school_id text,
  created_by_id text,
  password text,
  seat_index int
);

-- 5. Attendance
create table if not exists attendance (
  id text primary key,
  student_id text references students(id),
  date text,
  status text,
  subject text,
  period int,
  behavior_status text,
  behavior_note text,
  excuse_note text,
  excuse_file text,
  created_by_id text
);

-- 6. Performance
create table if not exists performance (
  id text primary key,
  student_id text references students(id),
  subject text,
  title text,
  category text,
  score float,
  max_score float,
  date text,
  notes text,
  created_by_id text
);

-- 7. Assignments
create table if not exists assignments (
  id text primary key,
  title text,
  category text,
  max_score float,
  url text,
  is_visible boolean,
  order_index int,
  source_metadata text,
  teacher_id text,
  term_id text,
  period_id text
);

-- 8. Schedules
create table if not exists schedules (
  id text primary key,
  class_id text,
  day text,
  period int,
  subject_name text,
  teacher_id text
);

-- 9. Teacher Assignments (Mapping)
create table if not exists teacher_assignments (
  id text primary key,
  class_id text,
  subject_name text,
  teacher_id text
);

-- 10. Subjects
create table if not exists subjects (
  id text primary key,
  name text,
  teacher_id text
);

-- 11. Weekly Plans
create table if not exists weekly_plans (
  id text primary key,
  teacher_id text,
  class_id text,
  subject_name text,
  day text,
  period int,
  week_start_date text,
  lesson_topic text,
  homework text
);

-- 12. Lesson Links
create table if not exists lesson_links (
  id text primary key,
  title text,
  url text,
  teacher_id text,
  created_at text,
  grade_level text,
  class_name text
);

-- 13. Lesson Plans
create table if not exists lesson_plans (
  id text primary key,
  teacher_id text,
  lesson_id text,
  subject text,
  topic text,
  content_json text,
  resources jsonb,
  created_at text
);

-- 14. Message Logs
create table if not exists message_logs (
  id text primary key,
  student_id text,
  student_name text,
  parent_phone text,
  type text,
  content text,
  status text,
  date text,
  sent_by text,
  teacher_id text
);

-- 15. Feedback
create table if not exists feedback (
  id text primary key,
  teacher_id text,
  manager_id text,
  content text,
  date text,
  is_read boolean
);

-- 16. Exams
create table if not exists exams (
  id text primary key,
  title text,
  subject text,
  grade_level text,
  duration_minutes int,
  questions jsonb,
  is_active boolean,
  created_at text,
  teacher_id text,
  date text
);

-- 17. Exam Results
create table if not exists exam_results (
  id text primary key,
  exam_id text,
  student_id text,
  student_name text,
  score float,
  total_score float,
  date text,
  answers jsonb
);

-- 18. Questions Bank
create table if not exists questions (
  id text primary key,
  text text,
  type text,
  options jsonb,
  correct_answer text,
  points int,
  subject text,
  grade_level text,
  topic text,
  difficulty text,
  teacher_id text
);

-- 19. Curriculum Units
create table if not exists curriculum_units (
  id text primary key,
  teacher_id text,
  subject text,
  grade_level text,
  title text,
  order_index int
);

-- 20. Curriculum Lessons
create table if not exists curriculum_lessons (
  id text primary key,
  unit_id text,
  title text,
  order_index int,
  learning_standards jsonb,
  micro_concept_ids jsonb
);

-- 21. Micro Concepts
create table if not exists micro_concepts (
  id text primary key,
  teacher_id text,
  subject text,
  name text
);

-- 22. Tracking Sheets
create table if not exists tracking_sheets (
  id text primary key,
  title text,
  subject text,
  class_name text,
  teacher_id text,
  created_at text,
  columns jsonb,
  scores jsonb
);

-- 23. Custom Tables
create table if not exists custom_tables (
  id text primary key,
  name text,
  created_at text,
  columns jsonb,
  rows jsonb,
  source_url text,
  last_updated text,
  teacher_id text
);

-- 24. Academic Terms
create table if not exists academic_terms (
  id text primary key,
  name text,
  start_date text,
  end_date text,
  is_current boolean,
  teacher_id text,
  periods jsonb
);
    `;
};

export const getDatabaseUpdateSQL = (): string => { 
    return `
-- Add Period Timings if supported (Future Feature)
-- Currently stored in LocalStorage only, but prepared for future schema update.
-- This section is reserved for schema migrations.
    `; 
};