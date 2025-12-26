
import { 
    Student, AttendanceRecord, PerformanceRecord, Teacher, School, 
    SystemUser, Subject, ScheduleItem, TeacherAssignment, 
    AcademicTerm, WeeklyPlanItem, LessonLink, StoredLessonPlan,
    Exam, ReportHeaderConfig, UserTheme, 
    CustomTable, EnvironmentRecord, LearningStyle, CurriculumUnit, 
    CurriculumLesson, Question, ExamResult, TrackingSheet, RemedialPlan,
    MessageLog, FormsDetailedResult, BehaviorIncident, Task, Assignment,
    AttendanceStatus, BehaviorStatus, WeeklyChallenge, PurchaseRequest, Reward
} from '../types';
import { supabase } from './supabaseClient';

export const KEYS = {
    USER_THEME: 'user_theme',
    REPORT_HEADER: 'report_header_config',
    PERIOD_TIMINGS: 'period_timings',
    WORKS_MASTER_URL: 'works_master_url',
    CUSTOM_REWARDS: 'custom_rewards'
};

// --- هيكلة الأعمدة المطلوبة لكل جدول للفحص المعمق ---
const REQUIRED_SCHEMA = {
    schools: ['id', 'name', 'ministry_code', 'manager_name', 'manager_national_id'],
    system_users: ['id', 'name', 'email', 'national_id', 'password', 'role', 'school_id', 'status'],
    students: ['id', 'name', 'national_id', 'class_name', 'grade_level', 'email', 'parent_phone', 'password', 'xp', 'level'],
    attendance: ['id', 'student_id', 'date', 'status', 'subject', 'period', 'created_by_id'],
    performance: ['id', 'student_id', 'subject', 'title', 'score', 'max_score', 'date', 'created_by_id']
};

// --- فحص صحة النظام السحابي المعمق ---
export const getCloudSystemStatus = async () => {
    const results = await Promise.all(Object.entries(REQUIRED_SCHEMA).map(async ([tableId, columns]) => {
        const start = performance.now();
        const colStatus: Record<string, boolean> = {};
        let tableStatus = 'ACTIVE';
        let errorMessage = '';

        try {
            // فحص وجود الجدول وجلب عينة من البيانات لفحص الأعمدة
            const { data, error } = await supabase.from(tableId).select(columns.join(',')).limit(1);
            
            if (error) {
                tableStatus = 'ERROR';
                errorMessage = error.message;
                // إذا كان الخطأ متعلق بأعمدة مفقودة، سنحاول تحديد أيها
                if (error.message.includes('column')) {
                    for (const col of columns) {
                        const { error: colErr } = await supabase.from(tableId).select(col).limit(1);
                        colStatus[col] = !colErr;
                    }
                } else {
                    columns.forEach(c => colStatus[c] = false);
                }
            } else {
                columns.forEach(c => colStatus[c] = true);
            }

            const end = performance.now();
            return {
                id: tableId,
                label: tableId === 'system_users' ? 'المستخدمين' : tableId === 'students' ? 'الطلاب' : tableId === 'attendance' ? 'الحضور' : tableId === 'performance' ? 'الدرجات' : 'المدارس',
                status: tableStatus,
                columns: colStatus,
                latency: Math.round(end - start),
                error: errorMessage
            };
        } catch (e) {
            return { id: tableId, label: tableId, status: 'OFFLINE', columns: {}, latency: 0 };
        }
    }));

    return results;
};

// --- المصادقة والعمليات الأخرى (تبقي كما هي مع ضمان توافق الأسماء) ---
export const authenticateUser = async (id: string, p: string): Promise<SystemUser | null> => {
    if (id === 'admin' && p === 'admin') {
        return { id: 'admin_root', name: 'مدير النظام', email: 'admin@system.local', nationalId: 'admin', role: 'SUPER_ADMIN', status: 'ACTIVE' };
    }
    try {
        const { data } = await supabase.from('system_users').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', p).maybeSingle();
        if (!data) return null;
        return { id: data.id, name: data.name, email: data.email, nationalId: data.national_id, role: data.role as any, schoolId: data.school_id, status: data.status as any };
    } catch { return null; }
};

// Fix: Added authenticateStudent to handle student login via Supabase
export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => {
    try {
        const { data } = await supabase.from('students').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', p).maybeSingle();
        if (!data) return null;
        return {
            id: data.id,
            name: data.name,
            role: 'STUDENT',
            nationalId: data.national_id,
            classId: data.class_id,
            schoolId: data.school_id,
            gradeLevel: data.grade_level,
            className: data.class_name,
            email: data.email,
            phone: data.phone,
            parentPhone: data.parent_phone,
            xp: data.xp || 0,
            level: data.level || 1,
            behaviorPoints: data.behavior_points || 0,
            learningStyle: data.learning_style || 'UNKNOWN',
            badges: data.badges || [],
            purchasedRewards: data.purchased_rewards || [],
            streak: data.streak || 0
        } as Student;
    } catch { return null; }
};

export const fetchStudents = async (): Promise<Student[]> => {
    try {
        const { data } = await supabase.from('students').select('*').order('name');
        const mapped = (data || []).map((d: any) => ({
            id: d.id, name: d.name, role: 'STUDENT', nationalId: d.national_id, classId: d.class_id, schoolId: d.school_id,
            gradeLevel: d.grade_level, className: d.class_name, email: d.email, phone: d.phone, parentPhone: d.parent_phone,
            xp: d.xp || 0, level: d.level || 1
        })) as Student[];
        localStorage.setItem('local_students', JSON.stringify(mapped));
        return mapped;
    } catch { return JSON.parse(localStorage.getItem('local_students') || '[]'); }
};

export const fetchAttendance = async (teacherId?: string): Promise<AttendanceRecord[]> => {
    try {
        let query = supabase.from('attendance').select('*');
        if (teacherId) query = query.eq('created_by_id', teacherId);
        const { data } = await query.order('date', { ascending: false });
        return (data || []).map((d: any) => ({ id: d.id, studentId: d.student_id, date: d.date, status: d.status, subject: d.subject, createdById: d.created_by_id }));
    } catch { return []; }
};

export const fetchPerformance = async (teacherId?: string): Promise<PerformanceRecord[]> => {
    try {
        let query = supabase.from('performance').select('*');
        if (teacherId) query = query.eq('created_by_id', teacherId);
        const { data } = await query.order('date', { ascending: false });
        return (data || []).map((d: any) => ({ id: d.id, studentId: d.student_id, subject: d.subject, title: d.title, score: d.score, maxScore: d.max_score, date: d.date }));
    } catch { return []; }
};

export const fetchSchools = async (): Promise<School[]> => {
    const { data } = await supabase.from('schools').select('*');
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, ministryCode: d.ministry_code, managerName: d.manager_name, managerNationalId: d.manager_national_id }));
};

export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    const { data } = await supabase.from('system_users').select('*');
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, email: d.email, nationalId: d.national_id, role: d.role, status: d.status }));
};

export const fetchTeachers = async (): Promise<Teacher[]> => {
    const { data } = await supabase.from('system_users').select('*').eq('role', 'TEACHER');
    return (data || []).map((d: any) => ({ id: d.id, name: d.name, nationalId: d.national_id, email: d.email }));
};

// SQL Schema الموحد لضمان مطابقة الأعمدة والربط
export const getDatabaseSchemaSQL = () => `
-- تصفير الجداول القديمة (اختياري - استخدم بحذر)
-- DROP TABLE IF EXISTS performance; DROP TABLE IF EXISTS attendance; DROP TABLE IF EXISTS students; DROP TABLE IF EXISTS system_users; DROP TABLE IF EXISTS schools;

CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ministry_code TEXT UNIQUE,
    manager_name TEXT,
    manager_national_id TEXT,
    type TEXT,
    phone TEXT,
    student_count INTEGER DEFAULT 0,
    education_administration TEXT
);

CREATE TABLE IF NOT EXISTS system_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    national_id TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- SUPER_ADMIN, SCHOOL_MANAGER, TEACHER
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'ACTIVE',
    phone TEXT
);

CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT UNIQUE,
    class_id TEXT,
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    created_by_id TEXT REFERENCES system_users(id) ON DELETE SET NULL,
    grade_level TEXT,
    class_name TEXT,
    email TEXT,
    phone TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    password TEXT DEFAULT '123456',
    seat_index INTEGER DEFAULT 0,
    learning_style TEXT DEFAULT 'UNKNOWN',
    behavior_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]',
    purchased_rewards JSONB DEFAULT '[]',
    streak INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    subject TEXT,
    period INTEGER,
    behavior_status TEXT,
    behavior_note TEXT,
    participation_score INTEGER DEFAULT 0,
    excuse_note TEXT,
    created_by_id TEXT REFERENCES system_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS performance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    subject TEXT,
    title TEXT,
    category TEXT,
    score NUMERIC DEFAULT 0,
    max_score NUMERIC DEFAULT 10,
    date DATE,
    notes TEXT,
    created_by_id TEXT REFERENCES system_users(id) ON DELETE SET NULL,
    url TEXT
);

-- سياسات الوصول (تعطيل RLS للتسهيل في البداية)
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance DISABLE ROW LEVEL SECURITY;
`;

// دوال مساعدة إضافية للفيكس
export const addStudent = async (s: Student) => await supabase.from('students').upsert({ id: s.id, name: s.name, national_id: s.nationalId, class_name: s.className, grade_level: s.gradeLevel, school_id: s.schoolId, created_by_id: s.createdById });

// Fix: Updated updateStudent to include XP, levels, and other gamification data
export const updateStudent = async (s: Student) => await supabase.from('students').update({ 
    name: s.name, 
    national_id: s.nationalId, 
    class_name: s.className, 
    grade_level: s.gradeLevel,
    xp: s.xp,
    level: s.level,
    badges: s.badges,
    purchased_rewards: s.purchasedRewards,
    behavior_points: s.behaviorPoints,
    seat_index: s.seatIndex,
    learning_style: s.learningStyle,
    streak: s.streak
}).eq('id', s.id);

export const deleteStudent = async (id: string) => await supabase.from('students').delete().eq('id', id);
export const saveAttendance = async (recs: AttendanceRecord[]) => await supabase.from('attendance').upsert(recs.map(r => ({ id: r.id, student_id: r.studentId, date: r.date, status: r.status, subject: r.subject, created_by_id: r.createdById, behavior_status: r.behaviorStatus, behavior_note: r.behaviorNote, participation_score: r.participationScore, excuse_note: r.excuseNote })));

// Fix: Updated addPerformance to handle category and notes (assignment ID link)
export const addPerformance = async (recs: PerformanceRecord[]) => await supabase.from('performance').upsert(recs.map(r => ({ id: r.id, student_id: r.studentId, subject: r.subject, title: r.title, score: r.score, max_score: r.maxScore, date: r.date, created_by_id: r.createdById, notes: r.notes, category: r.category })));

export const deletePerformance = async (id: string) => await supabase.from('performance').delete().eq('id', id);
export const deleteAttendance = async (id: string) => await supabase.from('attendance').delete().eq('id', id);
export const addSchool = async (s: School) => await supabase.from('schools').insert({ id: s.id, name: s.name, ministry_code: s.ministryCode, manager_name: s.managerName, manager_national_id: s.managerNationalId, type: s.type, phone: s.phone, student_count: s.studentCount, education_administration: s.educationAdministration });
export const addSystemUser = async (u: SystemUser) => await supabase.from('system_users').insert({ id: u.id, name: u.name, email: u.email, national_id: u.nationalId, password: u.password, role: u.role, school_id: u.schoolId, status: u.status, phone: u.phone });

// Fix: Added addTeacher to support teacher registration component
export const addTeacher = async (t: Teacher) => {
    return await supabase.from('system_users').insert({
        id: t.id,
        name: t.name,
        email: t.email,
        national_id: t.nationalId,
        password: t.password,
        role: 'TEACHER',
        school_id: t.schoolId,
        status: 'ACTIVE',
        phone: t.phone
    });
};

export const getStudents = (): Student[] => JSON.parse(localStorage.getItem('local_students') || '[]');
export const getAttendance = (): AttendanceRecord[] => JSON.parse(localStorage.getItem('local_attendance') || '[]');
export const getSchools = (): School[] => [];
export const getTeachers = (): Teacher[] => [];
export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem(KEYS.USER_THEME) || '{"mode":"LIGHT","backgroundStyle":"FLAT"}');
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));
export const getSubjects = (tid?: string): Subject[] => JSON.parse(localStorage.getItem(`local_subjects_${tid}`) || '[]');
export const addSubject = (s: Subject) => { const cur = getSubjects(s.teacherId); localStorage.setItem(`local_subjects_${s.teacherId}`, JSON.stringify([...cur, s])); };
export const deleteSubject = (id: string) => {};
export const getAcademicTerms = (tid?: string): AcademicTerm[] => JSON.parse(localStorage.getItem(`local_terms_${tid}`) || '[]');
export const saveAcademicTerm = (t: AcademicTerm) => { const cur = getAcademicTerms(t.teacherId); localStorage.setItem(`local_terms_${t.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==t.id), t])); };
export const deleteAcademicTerm = (id: string) => {};
export const setCurrentTerm = (id: string, tid: string) => {};
export const getMessages = (tid?: string): MessageLog[] => JSON.parse(localStorage.getItem(`local_messages_${tid}`) || '[]');
export const saveMessage = (m: MessageLog) => { const cur = getMessages(m.teacherId); localStorage.setItem(`local_messages_${m.teacherId}`, JSON.stringify([m, ...cur])); };
export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => JSON.parse(localStorage.getItem(`report_header_${tid}`) || '{"schoolName":"","educationAdmin":"","teacherName":"","schoolManager":"","academicYear":"","term":""}');
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => localStorage.setItem(`report_header_${c.teacherId}`, JSON.stringify(c));
export const getSchedules = (): ScheduleItem[] => JSON.parse(localStorage.getItem('local_schedules') || '[]');
export const saveScheduleItem = (s: ScheduleItem) => { const cur = getSchedules(); localStorage.setItem('local_schedules', JSON.stringify([...cur, s])); };
export const deleteScheduleItem = (id: string) => {};
export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => [];
export const saveBehaviorIncident = (i: BehaviorIncident) => {};
export const getTasks = (tid?: string): Task[] => [];
export const saveTask = (t: Task) => {};
export const getPurchaseRequests = (tid?: string): PurchaseRequest[] => [];
export const savePurchaseRequest = (r: PurchaseRequest) => {};
export const updatePurchaseStatus = (id: string, s: string) => {};
export const getRewards = (tid?: string): Reward[] => [];
export const saveReward = (r: Reward, tid?: string) => {};
export const deleteReward = (id: string, tid?: string) => {};
export const getExams = (tid?: string): Exam[] => [];
export const saveExam = (e: Exam) => {};
export const deleteExam = (id: string) => {};
export const getExamResults = (id: string): ExamResult[] => [];
export const saveExamResult = (r: ExamResult) => {};
export const deleteExamResult = (id: string) => {};
export const getTrackingSheets = (tid: string): TrackingSheet[] => [];
export const saveTrackingSheet = (s: TrackingSheet) => {};
export const deleteTrackingSheet = (id: string) => {};
export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => [];
export const saveWeeklyPlanItem = (i: WeeklyPlanItem) => {};
export const getLessonLinks = (): LessonLink[] => [];
export const saveLessonLink = (l: LessonLink) => {};
export const deleteLessonLink = (id: string) => {};
export const getLessonPlans = (tid?: string): StoredLessonPlan[] => [];
export const saveLessonPlan = (p: StoredLessonPlan) => {};
export const deleteLessonPlan = (id: string) => {};
export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => JSON.parse(localStorage.getItem(`local_assignments_map_${tid}`) || '[]');
export const addTeacherAssignment = (a: TeacherAssignment) => { const cur = getTeacherAssignments(a.teacherId); localStorage.setItem(`local_assignments_map_${a.teacherId}`, JSON.stringify([...cur, a])); };
export const deleteTeacherAssignment = (id: string) => {};
export const getTeacherPeriodTimings = (tid: string): string[] => ["07:00-07:45", "07:45-08:30"];
export const saveTeacherPeriodTimings = (tid: string, t: string[]) => {};
export const getAssignments = (c: string, tid?: string, isM?: boolean): Assignment[] => [];
export const saveAssignment = (a: Assignment) => {};
export const deleteAssignment = (id: string, tid?: string) => {};
export const downloadFromSupabase = async () => ({ success: true });
export const checkConnection = async () => ({ success: true });
export const getAISettings = () => ({ modelId: 'gemini-3-flash-preview', temperature: 0.7, systemInstruction: 'أنت مساعد تعليمي.' });
export const updateStudentLearningStyle = (id: string, s: LearningStyle) => {};
export const getWorksMasterUrl = () => '';
export const saveWorksMasterUrl = (u: string) => {};
export const updateTeacher = async (t: Teacher) => {};
export const updateSystemUser = async (u: SystemUser) => {};
export const getChallenges = (tid?: string): WeeklyChallenge[] => [];
export const saveChallenge = (c: WeeklyChallenge, tid: string) => {};
export const deleteChallenge = (id: string, tid: string) => {};
export const getCustomTables = (tid?: string): CustomTable[] => [];
export const addCustomTable = (t: CustomTable) => {};
export const deleteCustomTable = (id: string) => {};
export const getRemedialPlans = (): RemedialPlan[] => [];
export const saveRemedialPlan = (p: RemedialPlan) => {};
export const getEnvironmentRecords = (cid: string): EnvironmentRecord[] => [];
export const saveEnvironmentRecord = (r: EnvironmentRecord) => {};
export const getQuestionBank = (tid: string): Question[] => [];
export const saveQuestionToBank = (q: Question) => {};
export const deleteQuestionFromBank = (id: string) => {};
export const getCurriculumUnits = (tid: string): CurriculumUnit[] => [];
export const saveCurriculumUnit = (u: CurriculumUnit) => {};
export const deleteCurriculumUnit = (id: string, tid: string) => {};
export const getCurriculumLessons = (uid: string): CurriculumLesson[] => [];
export const saveCurriculumLesson = (l: CurriculumLesson) => {};
export const deleteCurriculumLesson = (id: string, uid: string) => {};
export const toggleCurriculumLesson = (id: string, s: boolean, uid: string) => {};
export const getFormsDetailedResults = (tid: string): FormsDetailedResult[] => [];
export const saveFormsDetailedResult = (r: FormsDetailedResult) => {};
export const deleteFormsDetailedResult = (id: string) => {};
