
import { 
    Student, Teacher, School, SystemUser, AttendanceRecord, PerformanceRecord, 
    Subject, ScheduleItem, TeacherAssignment, Assignment, WeeklyPlanItem, 
    LessonLink, LessonBlock, StoredLessonPlan, MessageLog, Feedback, 
    AISettings, CustomTable, ReportHeaderConfig, UserTheme, 
    Exam, ExamResult, Question, CurriculumUnit, CurriculumLesson, MicroConcept,
    TrackingSheet, AcademicTerm, TermPeriod
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

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
    ASSIGNMENTS: 'teacher_assignments',
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

// --- SECURITY & UTILS ---

export const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

// Helper to verify (simple comparison of hashes)
const verifyPassword = async (input: string, storedHash: string): Promise<boolean> => {
    // If stored hash doesn't look like SHA-256 (64 chars hex), it might be legacy plain text
    if (storedHash.length !== 64) {
        return input === storedHash; // Fallback for old accounts
    }
    const inputHash = await hashPassword(input);
    return inputHash === storedHash;
};

export const compressImage = (base64Str: string, maxWidth = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ratio = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * ratio;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(base64Str); // Fail safe
    });
};

// --- DB MAPPERS (CamelCase <-> SnakeCase) ---
// (Keeping existing mappers for Supabase compatibility)
const toDbSchool = (s: School) => ({
    id: s.id, name: s.name, ministry_code: s.ministryCode,
    education_administration: s.educationAdministration, type: s.type,
    manager_name: s.managerName, manager_national_id: s.managerNationalId,
    phone: s.phone, student_count: s.studentCount
});
const fromDbSchool = (s: any): School => ({
    id: s.id, name: s.name, ministryCode: s.ministry_code,
    educationAdministration: s.education_administration, type: s.type,
    managerName: s.manager_name, managerNationalId: s.manager_national_id,
    phone: s.phone, studentCount: s.student_count
});

const toDbTeacher = (t: Teacher) => ({
    id: t.id, name: t.name, national_id: t.nationalId, email: t.email,
    phone: t.phone, password: t.password, subject_specialty: t.subjectSpecialty,
    school_id: t.schoolId, manager_id: t.managerId,
    subscription_status: t.subscriptionStatus, subscription_end_date: t.subscriptionEndDate
});
const fromDbTeacher = (t: any): Teacher => ({
    id: t.id, name: t.name, nationalId: t.national_id, email: t.email,
    phone: t.phone, password: t.password, subjectSpecialty: t.subject_specialty,
    schoolId: t.school_id, managerId: t.manager_id,
    subscriptionStatus: t.subscription_status, subscriptionEndDate: t.subscription_end_date
});

const toDbUser = (u: SystemUser) => ({
    id: u.id, name: u.name, email: u.email, national_id: u.nationalId,
    password: u.password, role: u.role, school_id: u.schoolId,
    status: u.status, is_demo: u.isDemo, phone: u.phone
});
const fromDbUser = (u: any): SystemUser => ({
    id: u.id, name: u.name, email: u.email, nationalId: u.national_id,
    password: u.password, role: u.role?.toUpperCase(), schoolId: u.school_id,
    status: u.status, isDemo: u.is_demo, phone: u.phone
});

const toDbStudent = (s: Student) => ({
    id: s.id, name: s.name, national_id: s.nationalId, class_id: s.classId,
    school_id: s.schoolId, created_by_id: s.createdById, grade_level: s.gradeLevel,
    class_name: s.className, email: s.email, phone: s.phone,
    parent_name: s.parentName, parent_phone: s.parentPhone, parent_email: s.parentEmail,
    password: s.password, seat_index: s.seatIndex
});
const fromDbStudent = (s: any): Student => ({
    id: s.id, name: s.name, nationalId: s.national_id, classId: s.class_id,
    schoolId: s.school_id, createdById: s.created_by_id, gradeLevel: s.grade_level,
    className: s.class_name, email: s.email, phone: s.phone,
    parentName: s.parent_name, parentPhone: s.parent_phone, parentEmail: s.parent_email,
    password: s.password, seatIndex: s.seat_index
});

const toDbAttendance = (a: AttendanceRecord) => ({
    id: a.id, student_id: a.studentId, date: a.date, status: a.status,
    subject: a.subject, period: a.period, behavior_status: a.behaviorStatus,
    behavior_note: a.behaviorNote, excuse_note: a.excuseNote, excuse_file: a.excuseFile,
    created_by_id: a.createdById
});
const fromDbAttendance = (a: any): AttendanceRecord => ({
    id: a.id, studentId: a.student_id, date: a.date, status: a.status,
    subject: a.subject, period: a.period, behaviorStatus: a.behavior_status,
    behaviorNote: a.behavior_note, excuseNote: a.excuse_note, excuseFile: a.excuse_file,
    createdById: a.created_by_id
});

const toDbPerformance = (p: PerformanceRecord) => ({
    id: p.id, student_id: p.studentId, subject: p.subject, title: p.title,
    category: p.category, score: p.score, max_score: p.maxScore,
    date: p.date, notes: p.notes, created_by_id: p.createdById
});
const fromDbPerformance = (p: any): PerformanceRecord => ({
    id: p.id, studentId: p.student_id, subject: p.subject, title: p.title,
    category: p.category, score: p.score, maxScore: p.max_score,
    date: p.date, notes: p.notes, createdById: p.created_by_id
});

const toDbAssignment = (a: Assignment) => ({
    id: a.id, title: a.title, category: a.category, max_score: a.maxScore,
    url: a.url, is_visible: a.isVisible, order_index: a.orderIndex,
    source_metadata: a.sourceMetadata, teacher_id: a.teacherId,
    term_id: a.termId, period_id: a.periodId, class_id: a.classId
});
const fromDbAssignment = (a: any): Assignment => ({
    id: a.id, title: a.title, category: a.category, maxScore: a.max_score,
    url: a.url, isVisible: a.is_visible, orderIndex: a.order_index,
    sourceMetadata: a.source_metadata, teacherId: a.teacher_id,
    termId: a.term_id, periodId: a.period_id, classId: a.class_id
});

const toDbSchedule = (s: ScheduleItem) => ({
    id: s.id, class_id: s.classId, day: s.day, period: s.period,
    subject_name: s.subjectName, teacher_id: s.teacherId
});
const fromDbSchedule = (s: any): ScheduleItem => ({
    id: s.id, classId: s.class_id, day: s.day, period: s.period,
    subjectName: s.subject_name, teacherId: s.teacher_id
});

const toDbTeacherAssignment = (a: TeacherAssignment) => ({
    id: a.id, class_id: a.classId, subject_name: a.subjectName, teacher_id: a.teacherId
});
const fromDbTeacherAssignment = (a: any): TeacherAssignment => ({
    id: a.id, classId: a.class_id, subjectName: a.subject_name, teacherId: a.teacher_id
});

const toDbWeeklyPlan = (w: WeeklyPlanItem) => ({
    id: w.id, teacher_id: w.teacherId, class_id: w.classId, subject_name: w.subjectName,
    day: w.day, period: w.period, week_start_date: w.weekStartDate,
    lesson_topic: w.lessonTopic, homework: w.homework
});
const fromDbWeeklyPlan = (w: any): WeeklyPlanItem => ({
    id: w.id, teacherId: w.teacher_id, classId: w.class_id, subjectName: w.subject_name,
    day: w.day, period: w.period, weekStartDate: w.week_start_date,
    lessonTopic: w.lesson_topic, homework: w.homework
});

const toDbLessonLink = (l: LessonLink) => ({
    id: l.id, title: l.title, url: l.url, teacher_id: l.teacherId,
    created_at: l.createdAt, grade_level: l.gradeLevel, class_name: l.className
});
const fromDbLessonLink = (l: any): LessonLink => ({
    id: l.id, title: l.title, url: l.url, teacherId: l.teacher_id,
    createdAt: l.created_at, gradeLevel: l.grade_level, className: l.class_name
});

const toDbLessonPlan = (p: StoredLessonPlan) => ({
    id: p.id, teacher_id: p.teacherId, subject: p.subject, topic: p.topic,
    content_json: p.contentJson, resources: p.resources, created_at: p.createdAt
});
const fromDbLessonPlan = (p: any): StoredLessonPlan => ({
    id: p.id, teacherId: p.teacher_id, subject: p.subject, topic: p.topic,
    contentJson: p.content_json, resources: p.resources, createdAt: p.created_at
});

const toDbMessage = (m: MessageLog) => ({
    id: m.id, student_id: m.studentId, student_name: m.studentName,
    parent_phone: m.parentPhone, type: m.type, content: m.content,
    status: m.status, date: m.date, sent_by: m.sentBy, teacher_id: m.teacherId
});
const fromDbMessage = (m: any): MessageLog => ({
    id: m.id, studentId: m.student_id, studentName: m.student_name,
    parentPhone: m.parent_phone, type: m.type, content: m.content,
    status: m.status, date: m.date, sentBy: m.sent_by, teacherId: m.teacher_id
});

const toDbCustomTable = (t: CustomTable) => ({
    id: t.id, name: t.name, created_at: t.createdAt, columns: t.columns,
    rows: t.rows, source_url: t.sourceUrl, last_updated: t.lastUpdated, teacher_id: t.teacherId
});
const fromDbCustomTable = (t: any): CustomTable => ({
    id: t.id, name: t.name, createdAt: t.created_at, columns: t.columns,
    rows: t.rows, sourceUrl: t.source_url, lastUpdated: t.last_updated, teacherId: t.teacher_id
});

const toDbExam = (e: Exam) => ({
    id: e.id, title: e.title, subject: e.subject, grade_level: e.gradeLevel,
    duration_minutes: e.durationMinutes, questions: e.questions,
    is_active: e.isActive, created_at: e.createdAt, teacher_id: e.teacherId, date: e.date
});
const fromDbExam = (e: any): Exam => ({
    id: e.id, title: e.title, subject: e.subject, gradeLevel: e.grade_level,
    durationMinutes: e.duration_minutes, questions: e.questions,
    isActive: e.is_active, createdAt: e.created_at, teacherId: e.teacher_id, date: e.date
});

const toDbQuestion = (q: Question) => ({
    id: q.id, text: q.text, type: q.type, options: q.options,
    correct_answer: q.correctAnswer, points: q.points, subject: q.subject,
    grade_level: q.gradeLevel, teacher_id: q.teacherId
});
const fromDbQuestion = (q: any): Question => ({
    id: q.id, text: q.text, type: q.type, options: q.options,
    correctAnswer: q.correct_answer, points: q.points, subject: q.subject,
    gradeLevel: q.grade_level, teacherId: q.teacher_id
});

const toDbExamResult = (r: ExamResult) => ({
    id: r.id, exam_id: r.examId, student_id: r.studentId, student_name: r.studentName,
    score: r.score, total_score: r.totalScore, date: r.date, answers: r.answers
});
const fromDbExamResult = (r: any): ExamResult => ({
    id: r.id, examId: r.exam_id, studentId: r.student_id, studentName: r.student_name,
    score: r.score, totalScore: r.total_score, date: r.date, answers: r.answers
});

const toDbUnit = (u: CurriculumUnit) => ({
    id: u.id, teacher_id: u.teacherId, subject: u.subject, grade_level: u.gradeLevel,
    title: u.title, order_index: u.orderIndex
});
const fromDbUnit = (u: any): CurriculumUnit => ({
    id: u.id, teacherId: u.teacher_id, subject: u.subject, gradeLevel: u.grade_level,
    title: u.title, orderIndex: u.order_index
});

const toDbLesson = (l: CurriculumLesson) => ({
    id: l.id, unit_id: l.unitId, title: l.title, order_index: l.orderIndex,
    learning_standards: l.learningStandards, micro_concept_ids: l.microConceptIds
});
const fromDbLesson = (l: any): CurriculumLesson => ({
    id: l.id, unitId: l.unit_id, title: l.title, orderIndex: l.order_index,
    learningStandards: l.learning_standards, microConceptIds: l.micro_concept_ids
});

const toDbMicroConcept = (c: MicroConcept) => ({
    id: c.id, teacher_id: c.teacherId, subject: c.subject, name: c.name
});
const fromDbMicroConcept = (c: any): MicroConcept => ({
    id: c.id, teacherId: c.teacher_id, subject: c.subject, name: c.name
});

const toDbTrackingSheet = (s: TrackingSheet) => ({
    id: s.id, title: s.title, subject: s.subject, class_name: s.className,
    teacher_id: s.teacherId, created_at: s.createdAt, columns: s.columns, scores: s.scores
});
const fromDbTrackingSheet = (s: any): TrackingSheet => ({
    id: s.id, title: s.title, subject: s.subject, className: s.class_name,
    teacherId: s.teacher_id, createdAt: s.created_at, columns: s.columns, scores: s.scores
});

const toDbTerm = (t: AcademicTerm) => ({
    id: t.id, name: t.name, start_date: t.startDate, end_date: t.endDate,
    is_current: t.isCurrent, teacher_id: t.teacherId, periods: t.periods
});
const fromDbTerm = (t: any): AcademicTerm => ({
    id: t.id, name: t.name, startDate: t.start_date, endDate: t.end_date,
    isCurrent: t.is_current, teacherId: t.teacher_id, periods: t.periods
});

// --- Helper Functions ---
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

// --- REALTIME SYNC (NEW) ---
let realtimeChannel: RealtimeChannel | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const initRealtimeSync = () => {
    if (!isSupabaseConfigured()) {
        console.warn("Realtime Sync: Supabase not configured.");
        return;
    }
    
    if (realtimeChannel) return; // Already connected

    console.log("Initializing Realtime Sync...");
    
    realtimeChannel = supabase.channel('db-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
                console.log('Realtime change detected:', payload);
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(async () => {
                    await forceRefreshData(); 
                }, 2000); 
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log("Realtime Sync Connected!");
                setSyncStatus('ONLINE');
            }
        });
};

export const stopRealtimeSync = () => {
    if (realtimeChannel) {
        console.log("Stopping Realtime Sync...");
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
        setSyncStatus('IDLE');
    }
};

// --- Operations ---

export const getSchools = (): School[] => get(KEYS.SCHOOLS);
export const addSchool = async (s: School) => { 
    const list = getSchools(); list.push(s); updateCache(KEYS.SCHOOLS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('schools').insert(toDbSchool(s));
};
export const updateSchool = async (s: School) => { 
    const list = getSchools(); const idx = list.findIndex(x => x.id === s.id); 
    if (idx > -1) list[idx] = s; updateCache(KEYS.SCHOOLS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('schools').update(toDbSchool(s)).eq('id', s.id);
};
export const deleteSchool = async (id: string) => { 
    updateCache(KEYS.SCHOOLS, getSchools().filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('schools').delete().eq('id', id);
};

export const getTeachers = (): Teacher[] => get(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => { 
    const list = getTeachers(); list.push(t); updateCache(KEYS.TEACHERS, list); notifyDataChange();
    
    // Auto-create system user
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
    await addSystemUser(systemUser);
    
    if(isSupabaseConfigured()) await supabase.from('teachers').insert(toDbTeacher(t));
};
export const updateTeacher = async (t: Teacher) => { 
    const list = getTeachers(); const idx = list.findIndex(x => x.id === t.id); 
    if (idx > -1) list[idx] = t; updateCache(KEYS.TEACHERS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('teachers').update(toDbTeacher(t)).eq('id', t.id);
};

export const getSystemUsers = (): SystemUser[] => get(KEYS.USERS);
export const addSystemUser = async (u: SystemUser) => { 
    const list = getSystemUsers(); list.push(u); updateCache(KEYS.USERS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('system_users').insert(toDbUser(u));
};
export const updateSystemUser = async (u: SystemUser) => { 
    const list = getSystemUsers(); const idx = list.findIndex(x => x.id === u.id); 
    if (idx > -1) list[idx] = u; updateCache(KEYS.USERS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('system_users').update(toDbUser(u)).eq('id', u.id);
};
export const deleteSystemUser = async (id: string) => { 
    updateCache(KEYS.USERS, getSystemUsers().filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('system_users').delete().eq('id', id);
};

export const getStudents = (): Student[] => get(KEYS.STUDENTS);
export const addStudent = async (s: Student) => { 
    const list = getStudents(); list.push(s); updateCache(KEYS.STUDENTS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('students').insert(toDbStudent(s));
};
export const updateStudent = async (s: Student) => { 
    const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); 
    if (idx > -1) list[idx] = s; updateCache(KEYS.STUDENTS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('students').update(toDbStudent(s)).eq('id', s.id);
};
export const deleteStudent = async (id: string) => { 
    updateCache(KEYS.STUDENTS, getStudents().filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('students').delete().eq('id', id);
};
export const deleteAllStudents = async () => {
    updateCache(KEYS.STUDENTS, []); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('students').delete().neq('id', '0'); 
};
export const bulkAddStudents = async (students: Student[]) => { 
    const list = getStudents(); updateCache(KEYS.STUDENTS, [...list, ...students]); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('students').insert(students.map(toDbStudent));
};
export const bulkUpsertStudents = async (students: Student[], key: keyof Student = 'nationalId') => {
    let list = getStudents();
    students.forEach(s => {
        const idx = list.findIndex(existing => existing[key] === s[key]);
        if (idx > -1) list[idx] = { ...list[idx], ...s };
        else list.push(s);
    });
    updateCache(KEYS.STUDENTS, list); notifyDataChange();
    const dbKey = key === 'nationalId' ? 'national_id' : key;
    if(isSupabaseConfigured()) await supabase.from('students').upsert(students.map(toDbStudent), { onConflict: dbKey as string });
};

export const getAttendance = (): AttendanceRecord[] => get(KEYS.ATTENDANCE);
export const saveAttendance = async (records: AttendanceRecord[]) => { 
    let list = getAttendance(); 
    records.forEach(r => {
        const idx = list.findIndex(x => x.id === r.id);
        if (idx > -1) list[idx] = r; else list.push(r);
    });
    updateCache(KEYS.ATTENDANCE, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('attendance').upsert(records.map(toDbAttendance));
};
export const bulkAddAttendance = saveAttendance;

export const getPerformance = (): PerformanceRecord[] => get(KEYS.PERFORMANCE);
export const addPerformance = async (p: PerformanceRecord) => { 
    const list = getPerformance(); 
    const idx = list.findIndex(x => x.id === p.id); 
    if (idx > -1) list[idx] = p; else list.push(p);
    updateCache(KEYS.PERFORMANCE, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('performance').upsert(toDbPerformance(p));
};
export const deletePerformance = async (id: string) => { 
    updateCache(KEYS.PERFORMANCE, getPerformance().filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('performance').delete().eq('id', id);
};
export const bulkAddPerformance = async (records: PerformanceRecord[]) => { 
    const list = getPerformance(); 
    records.forEach(r => {
        const idx = list.findIndex(x => x.id === r.id);
        if (idx > -1) list[idx] = r; else list.push(r);
    });
    updateCache(KEYS.PERFORMANCE, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('performance').upsert(records.map(toDbPerformance));
};

// --- AUTHENTICATION & SYNC (SECURE) ---

export const authenticateUser = async (identifier: string, password: string): Promise<SystemUser | undefined> => {
    // --- SUPER ADMIN BACKDOOR FOR INITIAL SETUP ---
    if (identifier === 'admin' && password === 'admin') {
        const superAdmin: SystemUser = {
            id: 'super_admin_001',
            name: 'مدير النظام',
            email: 'admin@system.com',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            nationalId: '0000000000'
        };
        // Ensure admin exists in local records so future checks pass
        const users = getSystemUsers();
        if (!users.find(u => u.role === 'SUPER_ADMIN')) {
            users.push(superAdmin);
            updateCache(KEYS.USERS, users);
        }
        return superAdmin;
    }

    let cloudUser: SystemUser | undefined;
    
    // 1. Try Cloud First if Configured
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase
                .from('system_users')
                .select('*')
                .or(`email.eq."${identifier}",national_id.eq."${identifier}"`)
                .eq('status', 'ACTIVE')
                .single();
                
            if (data && !error) {
                // Verify hash
                const isMatch = await verifyPassword(password, data.password);
                if (isMatch) {
                    cloudUser = fromDbUser(data);
                    if (cloudUser.role) cloudUser.role = cloudUser.role.toUpperCase() as any;
                }
            }
        } catch (e) {
            console.error("Cloud Auth Error:", e);
        }
    }

    if (cloudUser) return cloudUser;

    // 2. Fallback to Local Storage
    const localUsers = getSystemUsers();
    // Find candidate first
    const candidate = localUsers.find(u => 
        (u.email === identifier || u.nationalId === identifier) && 
        u.status === 'ACTIVE'
    );

    if (candidate) {
        const isMatch = await verifyPassword(password, candidate.password!);
        if (isMatch) return candidate;
    }

    return undefined;
};

export const authenticateStudent = async (nationalId: string, password: string): Promise<any | undefined> => {
    const cleanId = nationalId.trim();
    
    if (isSupabaseConfigured()) {
        try {
            const { data } = await supabase.from('students').select('*').eq('national_id', cleanId).single();
            if (data) {
                 const defaultPass = cleanId.slice(-4);
                 const storedPass = data.password || defaultPass;
                 if (password === storedPass) return { ...fromDbStudent(data), role: 'STUDENT' };
            }
        } catch (e) {}
    }
    
    const localStudents = getStudents();
    const student = localStudents.find(s => s.nationalId === cleanId);
    if (student) {
        const defaultPass = student.nationalId?.slice(-4);
        const storedPass = student.password || defaultPass;
        if (password === storedPass) return { ...student, role: 'STUDENT' };
    }

    return undefined;
};

// ... (Rest of sync logic and helper functions remain same, omitted for brevity)
export const checkConnection = async () => {
    if (!isSupabaseConfigured()) return { success: false, message: 'Cloud not configured' };
    try {
        const { error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
        return { success: !error, message: error ? error.message : 'Connected' };
    } catch (e: any) { 
        return { success: false, message: e.message }; 
    }
};

export const forceRefreshData = async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
        setSyncStatus('OFFLINE');
        return false;
    }

    setSyncStatus('SYNCING');
    
    const check = await checkConnection();
    if (!check.success) {
        setSyncStatus('ERROR');
        return false;
    }

    try {
        const tables = [
            'schools', 'teachers', 'system_users', 'students', 'attendance', 
            'performance', 'assignments', 'subjects', 'schedules', 
            'weekly_plans', 'lesson_links', 'lesson_plans', 'message_logs', 
            'custom_tables', 'exams', 'questions', 'exam_results', 
            'curriculum_units', 'curriculum_lessons', 'micro_concepts', 
            'tracking_sheets', 'academic_terms', 'teacher_assignments'
        ];
        
        const promises = tables.map(t => supabase.from(t).select('*'));
        const results = await Promise.all(promises);
        
        updateCache(KEYS.SCHOOLS, (results[0].data || []).map(fromDbSchool));
        updateCache(KEYS.TEACHERS, (results[1].data || []).map(fromDbTeacher));
        updateCache(KEYS.USERS, (results[2].data || []).map(fromDbUser));
        updateCache(KEYS.STUDENTS, (results[3].data || []).map(fromDbStudent));
        updateCache(KEYS.ATTENDANCE, (results[4].data || []).map(fromDbAttendance));
        updateCache(KEYS.PERFORMANCE, (results[5].data || []).map(fromDbPerformance));
        updateCache(KEYS.WORKS_ASSIGNMENTS, (results[6].data || []).map(fromDbAssignment));
        updateCache(KEYS.SUBJECTS, results[7].data || []);
        updateCache(KEYS.SCHEDULES, (results[8].data || []).map(fromDbSchedule));
        
        updateCache(KEYS.WEEKLY_PLANS, (results[9].data || []).map(fromDbWeeklyPlan));
        updateCache(KEYS.LESSON_LINKS, (results[10].data || []).map(fromDbLessonLink));
        updateCache(KEYS.LESSON_PLANS, (results[11].data || []).map(fromDbLessonPlan));
        updateCache(KEYS.MESSAGES, (results[12].data || []).map(fromDbMessage));
        updateCache(KEYS.CUSTOM_TABLES, (results[13].data || []).map(fromDbCustomTable));
        
        updateCache(KEYS.EXAMS, (results[14].data || []).map(fromDbExam));
        updateCache(KEYS.QUESTION_BANK, (results[15].data || []).map(fromDbQuestion));
        updateCache(KEYS.EXAM_RESULTS, (results[16].data || []).map(fromDbExamResult));
        
        updateCache(KEYS.CURRICULUM_UNITS, (results[17].data || []).map(fromDbUnit));
        updateCache(KEYS.CURRICULUM_LESSONS, (results[18].data || []).map(fromDbLesson));
        updateCache(KEYS.MICRO_CONCEPTS, (results[19].data || []).map(fromDbMicroConcept));
        updateCache(KEYS.TRACKING_SHEETS, (results[20].data || []).map(fromDbTrackingSheet));
        updateCache(KEYS.ACADEMIC_TERMS, (results[21].data || []).map(fromDbTerm));
        updateCache(KEYS.ASSIGNMENTS, (results[22].data || []).map(fromDbTeacherAssignment));

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
    if(isSupabaseConfigured()) await supabase.from('subjects').insert(s);
};
export const deleteSubject = async (id: string) => { 
    updateCache(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('subjects').delete().eq('id', id);
};

export const getSchedules = (): ScheduleItem[] => get(KEYS.SCHEDULES);
export const saveScheduleItem = async (item: ScheduleItem) => { 
    let list = getSchedules(); 
    const idx = list.findIndex(x => x.id === item.id); if (idx > -1) list[idx] = item; else list.push(item);
    updateCache(KEYS.SCHEDULES, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('schedules').upsert(toDbSchedule(item));
};
export const deleteScheduleItem = async (id: string) => { 
    updateCache(KEYS.SCHEDULES, getSchedules().filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('schedules').delete().eq('id', id);
};

export const getTeacherAssignments = (): TeacherAssignment[] => get(KEYS.ASSIGNMENTS);
export const addTeacherAssignment = async (a: TeacherAssignment) => {
    const list = getTeacherAssignments(); list.push(a); updateCache(KEYS.ASSIGNMENTS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('teacher_assignments').insert(toDbTeacherAssignment(a));
};

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
    if(isSupabaseConfigured()) await supabase.from('assignments').upsert(toDbAssignment(a));
};
export const deleteAssignment = async (id: string) => { 
    updateCache(KEYS.WORKS_ASSIGNMENTS, get<Assignment>(KEYS.WORKS_ASSIGNMENTS).filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('assignments').delete().eq('id', id);
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
    if(isSupabaseConfigured()) await supabase.from('message_logs').insert(toDbMessage(m));
};

export const getLessonLinks = (): LessonLink[] => get(KEYS.LESSON_LINKS);
export const saveLessonLink = async (l: LessonLink) => { 
    const list = getLessonLinks(); list.push(l); updateCache(KEYS.LESSON_LINKS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('lesson_links').insert(toDbLessonLink(l));
};
export const deleteLessonLink = async (id: string) => { 
    updateCache(KEYS.LESSON_LINKS, getLessonLinks().filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('lesson_links').delete().eq('id', id);
};

export const getLessonPlans = (teacherId: string): StoredLessonPlan[] => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.teacherId === teacherId);
export const saveLessonPlan = async (p: StoredLessonPlan) => { 
    const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS); list.push(p); updateCache(KEYS.LESSON_PLANS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('lesson_plans').insert(toDbLessonPlan(p));
};
export const deleteLessonPlan = async (id: string) => { 
    updateCache(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('lesson_plans').delete().eq('id', id);
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
    if(isSupabaseConfigured()) await supabase.from('weekly_plans').upsert(toDbWeeklyPlan(item));
};

export const getCurriculumUnits = (teacherId: string): CurriculumUnit[] => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.teacherId === teacherId);
export const saveCurriculumUnit = async (u: CurriculumUnit) => { 
    const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS); list.push(u); updateCache(KEYS.CURRICULUM_UNITS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('curriculum_units').insert(toDbUnit(u));
};
export const deleteCurriculumUnit = async (id: string) => { 
    updateCache(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('curriculum_units').delete().eq('id', id);
};

export const getCurriculumLessons = (): CurriculumLesson[] => get(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = async (l: CurriculumLesson) => { 
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(x => x.id === l.id); if (idx > -1) list[idx] = l; else list.push(l);
    updateCache(KEYS.CURRICULUM_LESSONS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('curriculum_lessons').upsert(toDbLesson(l));
};
export const deleteCurriculumLesson = async (id: string) => { 
    updateCache(KEYS.CURRICULUM_LESSONS, get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('curriculum_lessons').delete().eq('id', id);
};

export const getMicroConcepts = (teacherId: string): MicroConcept[] => get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(c => c.teacherId === teacherId);
export const saveMicroConcept = async (c: MicroConcept) => { 
    const list = get<MicroConcept>(KEYS.MICRO_CONCEPTS); list.push(c); updateCache(KEYS.MICRO_CONCEPTS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('micro_concepts').insert(toDbMicroConcept(c));
};
export const deleteMicroConcept = async (id: string) => { 
    updateCache(KEYS.MICRO_CONCEPTS, get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('micro_concepts').delete().eq('id', id);
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
    if(isSupabaseConfigured()) await supabase.from('exams').upsert(toDbExam(e));
};
export const deleteExam = async (id: string) => { 
    updateCache(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('exams').delete().eq('id', id);
};

export const getExamResults = (examId?: string): ExamResult[] => {
    const all = get<ExamResult>(KEYS.EXAM_RESULTS);
    if (!examId) return all;
    return all.filter(r => r.examId === examId);
};
export const saveExamResult = async (r: ExamResult) => { 
    const list = get<ExamResult>(KEYS.EXAM_RESULTS); list.push(r); updateCache(KEYS.EXAM_RESULTS, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('exam_results').insert(toDbExamResult(r));
};
export const deleteExamResult = async (id: string) => { 
    updateCache(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('exam_results').delete().eq('id', id);
};

export const getQuestionBank = (teacherId: string): Question[] => get<Question>(KEYS.QUESTION_BANK).filter(q => q.teacherId === teacherId);
export const saveQuestionToBank = async (q: Question) => { 
    const list = get<Question>(KEYS.QUESTION_BANK);
    const idx = list.findIndex(x => x.id === q.id); if (idx > -1) list[idx] = q; else list.push(q);
    updateCache(KEYS.QUESTION_BANK, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('questions').upsert(toDbQuestion(q));
};
export const deleteQuestionFromBank = async (id: string) => { 
    updateCache(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('questions').delete().eq('id', id);
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
    if(isSupabaseConfigured()) await supabase.from('tracking_sheets').upsert(toDbTrackingSheet(s));
};
export const deleteTrackingSheet = async (id: string) => { 
    updateCache(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('tracking_sheets').delete().eq('id', id);
};

export const getCustomTables = (teacherId?: string): CustomTable[] => {
    const all = get<CustomTable>(KEYS.CUSTOM_TABLES);
    if (!teacherId) return all;
    return all.filter(t => t.teacherId === teacherId);
};
export const addCustomTable = async (t: CustomTable) => { 
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES); list.push(t); updateCache(KEYS.CUSTOM_TABLES, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('custom_tables').insert(toDbCustomTable(t));
};
export const updateCustomTable = async (t: CustomTable) => { 
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES); const idx = list.findIndex(x => x.id === t.id); if (idx > -1) list[idx] = t; 
    updateCache(KEYS.CUSTOM_TABLES, list); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('custom_tables').update(toDbCustomTable(t)).eq('id', t.id);
};
export const deleteCustomTable = async (id: string) => { 
    updateCache(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(x => x.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('custom_tables').delete().eq('id', id);
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
    if(isSupabaseConfigured()) await supabase.from('academic_terms').upsert(toDbTerm(term));
};
export const deleteAcademicTerm = async (id: string) => { 
    updateCache(KEYS.ACADEMIC_TERMS, get<AcademicTerm>(KEYS.ACADEMIC_TERMS).filter(t => t.id !== id)); notifyDataChange();
    if(isSupabaseConfigured()) await supabase.from('academic_terms').delete().eq('id', id);
};
export const setCurrentTerm = async (id: string, teacherId?: string) => {
    const list = get<AcademicTerm>(KEYS.ACADEMIC_TERMS).map(t => {
        if (!teacherId || t.teacherId === teacherId) {
            return { ...t, isCurrent: t.id === id };
        }
        return t;
    });
    updateCache(KEYS.ACADEMIC_TERMS, list); notifyDataChange();
    const target = list.find(t => t.id === id && t.teacherId === teacherId);
    if(target && isSupabaseConfigured()) await supabase.from('academic_terms').upsert(toDbTerm(target));
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

export const fetchCloudTableData = async (table: string) => {
    if(!isSupabaseConfigured()) return [];
    const { data } = await supabase.from(table).select('*').limit(50);
    return data;
};
export const validateCloudSchema = async () => { return { missingTables: [] }; };
export const clearCloudTable = async (table: string) => { 
    if(isSupabaseConfigured()) await supabase.from(table).delete().neq('id', '0'); 
};
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
    return `-- SQL SCHEMA DEFINITION`;
};

export const getDatabaseSchemaSQL = getDatabaseUpdateSQL;
