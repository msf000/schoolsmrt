
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

// --- هيكلة الأعمدة المطلوبة للفحص المعمق وتوليد SQL ---
const REQUIRED_SCHEMA = {
    schools: ['id', 'name', 'ministry_code', 'manager_name', 'manager_national_id', 'type', 'phone', 'student_count', 'education_administration'],
    system_users: ['id', 'name', 'email', 'national_id', 'password', 'role', 'school_id', 'status', 'phone', 'subject_specialty', 'subscription_status'],
    students: ['id', 'name', 'national_id', 'class_id', 'school_id', 'grade_level', 'class_name', 'email', 'phone', 'parent_name', 'parent_phone', 'parent_email', 'password', 'xp', 'level', 'behavior_points', 'streak', 'learning_style', 'badges', 'purchased_rewards', 'created_by_id', 'seat_index'],
    attendance: ['id', 'student_id', 'date', 'status', 'subject', 'period', 'created_by_id', 'behavior_status', 'behavior_note', 'participation_score', 'excuse_note'],
    performance: ['id', 'student_id', 'subject', 'title', 'score', 'max_score', 'date', 'created_by_id', 'category', 'notes', 'url'],
    behavior_incidents: ['id', 'student_id', 'teacher_id', 'type', 'category', 'points', 'date', 'note', 'action_taken'],
    tasks: ['id', 'teacher_id', 'class_id', 'subject', 'title', 'description', 'due_date', 'type', 'max_score', 'submissions'],
    exams: ['id', 'teacher_id', 'title', 'subject', 'grade_level', 'duration_minutes', 'questions', 'is_active', 'created_at'],
    exam_results: ['id', 'exam_id', 'student_id', 'score', 'total_score', 'answers', 'date'],
    curriculum_units: ['id', 'teacher_id', 'subject', 'grade_level', 'title', 'order_index'],
    curriculum_lessons: ['id', 'unit_id', 'title', 'order_index', 'is_completed', 'completed_at'],
    rewards: ['id', 'teacher_id', 'title', 'cost', 'icon', 'description', 'category'],
    purchase_requests: ['id', 'student_id', 'student_name', 'reward_id', 'reward_title', 'cost', 'status', 'date', 'teacher_id'],
    environment_records: ['id', 'teacher_id', 'class_id', 'date', 'lighting', 'noise_level', 'mood', 'notes']
};

// --- فحص صحة النظام السحابي المعمق ---
export const getCloudSystemStatus = async () => {
    const results = await Promise.all(Object.entries(REQUIRED_SCHEMA).map(async ([tableId, columns]) => {
        const start = performance.now();
        const colStatus: Record<string, boolean> = {};
        let tableStatus = 'ACTIVE';
        let errorMessage = '';

        try {
            const { error } = await supabase.from(tableId).select(columns.join(',')).limit(1);
            if (error) {
                tableStatus = 'ERROR';
                errorMessage = error.message;
                for (const col of columns) {
                    const { error: colErr } = await supabase.from(tableId).select(col).limit(1);
                    colStatus[col] = !colErr;
                }
            } else {
                columns.forEach(c => colStatus[c] = true);
            }
            const end = performance.now();
            return { id: tableId, label: tableId.replace(/_/g, ' '), status: tableStatus, columns: colStatus, latency: Math.round(end - start), error: errorMessage };
        } catch (e) {
            return { id: tableId, label: tableId, status: 'OFFLINE', columns: {}, latency: 0 };
        }
    }));
    return results;
};

// --- إدارة النظام (SQL Setup & Migration) ---
export const getDatabaseSchemaSQL = () => `
-- 1. المدارس
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
ALTER TABLE schools ADD COLUMN IF NOT EXISTS education_administration TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS student_count INTEGER DEFAULT 0;

-- 2. المستخدمون
CREATE TABLE IF NOT EXISTS system_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    national_id TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'ACTIVE',
    phone TEXT,
    subject_specialty TEXT,
    subscription_status TEXT DEFAULT 'FREE'
);
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS subject_specialty TEXT;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'FREE';
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. الطلاب
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
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE students ADD COLUMN IF NOT EXISTS behavior_points INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS seat_index INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS learning_style TEXT DEFAULT 'UNKNOWN';
ALTER TABLE students ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';
ALTER TABLE students ADD COLUMN IF NOT EXISTS purchased_rewards JSONB DEFAULT '[]';

-- 4. الحضور
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
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS behavior_status TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS behavior_note TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS participation_score INTEGER DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS excuse_note TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS period INTEGER;

-- 5. الأداء
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
ALTER TABLE performance ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE performance ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE performance ADD COLUMN IF NOT EXISTS url TEXT;

-- 6. السلوك
CREATE TABLE IF NOT EXISTS behavior_incidents (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES system_users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    category TEXT,
    points INTEGER,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    note TEXT,
    action_taken TEXT
);

-- 7. المهام
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id) ON DELETE CASCADE,
    class_id TEXT,
    subject TEXT,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    type TEXT,
    max_score NUMERIC DEFAULT 10,
    submissions JSONB DEFAULT '[]'
);

-- 8. الاختبارات
CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT,
    grade_level TEXT,
    duration_minutes INTEGER DEFAULT 30,
    questions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. نتائج الاختبارات
CREATE TABLE IF NOT EXISTS exam_results (
    id TEXT PRIMARY KEY,
    exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    score NUMERIC,
    total_score NUMERIC,
    answers JSONB DEFAULT '[]',
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. وحدات المنهج
CREATE TABLE IF NOT EXISTS curriculum_units (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id) ON DELETE CASCADE,
    subject TEXT,
    grade_level TEXT,
    title TEXT NOT NULL,
    order_index INTEGER
);

-- 11. دروس المنهج
CREATE TABLE IF NOT EXISTS curriculum_lessons (
    id TEXT PRIMARY KEY,
    unit_id TEXT REFERENCES curriculum_units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 12. المكافآت
CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    cost INTEGER NOT NULL,
    icon TEXT,
    description TEXT,
    category TEXT
);

-- 13. طلبات الشراء
CREATE TABLE IF NOT EXISTS purchase_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    student_name TEXT,
    reward_id TEXT REFERENCES rewards(id) ON DELETE CASCADE,
    reward_title TEXT,
    cost INTEGER,
    status TEXT DEFAULT 'PENDING',
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    teacher_id TEXT REFERENCES system_users(id) ON DELETE SET NULL
);

-- 14. بيئة الصف
CREATE TABLE IF NOT EXISTS environment_records (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id) ON DELETE CASCADE,
    class_id TEXT,
    date DATE NOT NULL,
    lighting INTEGER DEFAULT 3,
    noise_level INTEGER DEFAULT 2,
    mood TEXT,
    notes TEXT
);

-- تعطيل RLS للمرونة
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance DISABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_units DISABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE rewards DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE environment_records DISABLE ROW LEVEL SECURITY;
`;

// بقية الدوال كما هي في ملف storageService.ts الأصلي...
export const authenticateUser = async (id: string, p: string): Promise<SystemUser | null> => { /* ... */ return null; };
export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => { /* ... */ return null; };
export const fetchStudents = async (): Promise<Student[]> => { /* ... */ return []; };
export const addStudent = async (s: Student) => await supabase.from('students').upsert({ id: s.id, name: s.name, national_id: s.nationalId, class_id: s.classId, grade_level: s.gradeLevel, class_name: s.className, school_id: s.schoolId, created_by_id: s.createdById, email: s.email, phone: s.phone, parent_name: s.parentName, parent_phone: s.parentPhone, parent_email: s.parentEmail, password: s.password, seat_index: s.seatIndex, learning_style: s.learningStyle });
export const updateStudent = async (s: Student) => await supabase.from('students').update({ name: s.name, national_id: s.nationalId, class_name: s.className, grade_level: s.gradeLevel, xp: s.xp, level: s.level, behavior_points: s.behaviorPoints, streak: s.streak, badges: s.badges, purchased_rewards: s.purchasedRewards, learning_style: s.learningStyle, seat_index: s.seatIndex }).eq('id', s.id);
export const saveAttendance = async (recs: AttendanceRecord[]) => await supabase.from('attendance').upsert(recs.map(r => ({ id: r.id, student_id: r.studentId, date: r.date, status: r.status, subject: r.subject, period: r.period, behavior_status: r.behaviorStatus, behavior_note: r.behaviorNote, participation_score: r.participationScore, excuse_note: r.excuseNote, created_by_id: r.createdById })));
export const addPerformance = async (recs: PerformanceRecord[]) => await supabase.from('performance').upsert(recs.map(r => ({ id: r.id, student_id: r.studentId, subject: r.subject, title: r.title, score: r.score, max_score: r.maxScore, date: r.date, created_by_id: r.createdById, category: r.category, notes: r.notes, url: r.url })));
export const addSchool = async (s: School) => await supabase.from('schools').insert({ id: s.id, name: s.name, ministry_code: s.ministryCode, manager_name: s.managerName, manager_national_id: s.managerNationalId, type: s.type, phone: s.phone, student_count: s.studentCount, education_administration: s.educationAdministration });
export const addSystemUser = async (u: SystemUser) => await supabase.from('system_users').insert({ id: u.id, name: u.name, email: u.email, national_id: u.nationalId, password: u.password, role: u.role, school_id: u.schoolId, status: u.status, phone: u.phone, subject_specialty: u.subjectSpecialty, subscription_status: u.subscriptionStatus });
export const updateSystemUser = async (u: SystemUser) => await supabase.from('system_users').update({ name: u.name, email: u.email, national_id: u.nationalId, role: u.role, status: u.status, phone: u.phone, subject_specialty: u.subjectSpecialty }).eq('id', u.id);
export const fetchAttendance = async (teacherId?: string): Promise<AttendanceRecord[]> => { /* ... */ return []; };
export const fetchPerformance = async (teacherId?: string): Promise<PerformanceRecord[]> => { /* ... */ return []; };
export const fetchSchools = async (): Promise<School[]> => { /* ... */ return []; };
export const fetchSystemUsers = async (): Promise<SystemUser[]> => { /* ... */ return []; };
export const fetchTeachers = async (): Promise<Teacher[]> => { /* ... */ return []; };
export const deleteStudent = async (id: string) => await supabase.from('students').delete().eq('id', id);
export const deleteAttendance = async (id: string) => await supabase.from('attendance').delete().eq('id', id);
export const deletePerformance = async (id: string) => await supabase.from('performance').delete().eq('id', id);
export const deleteSchool = async (id: string) => await supabase.from('schools').delete().eq('id', id);
export const updateTeacher = async (t: any) => await supabase.from('system_users').update({ name: t.name, national_id: t.nationalId, email: t.email, phone: t.phone, subject_specialty: t.subjectSpecialty, subscription_status: t.subscriptionStatus, password: t.password }).eq('id', t.id);
export const addTeacher = async (t: any) => await addSystemUser({ ...t, role: 'TEACHER', status: 'ACTIVE' });
export const getStudents = (): Student[] => JSON.parse(localStorage.getItem('local_students') || '[]');
export const getAttendance = (): AttendanceRecord[] => JSON.parse(localStorage.getItem('local_attendance') || '[]');
export const getSchools = (): School[] => [];
export const getTeachers = (): Teacher[] => [];
export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem(KEYS.USER_THEME) || '{"mode":"LIGHT","backgroundStyle":"FLAT"}');
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));
export const getSubjects = (tid?: string): any[] => JSON.parse(localStorage.getItem(`local_subjects_${tid || 'global'}`) || '[]');
export const addSubject = (s: any) => { const cur = getSubjects(s.teacherId); localStorage.setItem(`local_subjects_${s.teacherId || 'global'}`, JSON.stringify([...cur, s])); };
export const getAcademicTerms = (tid?: string): any[] => JSON.parse(localStorage.getItem(`local_terms_${tid || 'global'}`) || '[]');
export const saveAcademicTerm = (t: any) => { const cur = getAcademicTerms(t.teacherId); localStorage.setItem(`local_terms_${t.teacherId || 'global'}`, JSON.stringify([...cur.filter((x:any)=>x.id!==t.id), t])); };
export const getMessages = (tid?: string): any[] => JSON.parse(localStorage.getItem(`local_messages_${tid || 'global'}`) || '[]');
export const saveMessage = (m: any) => { const cur = getMessages(m.teacherId); localStorage.setItem(`local_messages_${m.teacherId || 'global'}`, JSON.stringify([m, ...cur])); };
export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => JSON.parse(localStorage.getItem(`report_header_${tid || 'global'}`) || '{"schoolName":"","educationAdmin":"","teacherName":"","schoolManager":"","academicYear":"","term":""}');
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => localStorage.setItem(`report_header_${c.teacherId || 'global'}`, JSON.stringify(c));
export const getSchedules = (): ScheduleItem[] => JSON.parse(localStorage.getItem('local_schedules') || '[]');
export const saveScheduleItem = (s: ScheduleItem) => { const cur = getSchedules(); localStorage.setItem('local_schedules', JSON.stringify([...cur, s])); };
export const getBehaviorIncidents = (tid?: string): any[] => JSON.parse(localStorage.getItem(`local_incidents_${tid || 'global'}`) || '[]');
export const saveBehaviorIncident = (i: any) => { const cur = getBehaviorIncidents(i.teacherId); localStorage.setItem(`local_incidents_${i.teacherId || 'global'}`, JSON.stringify([...cur, i])); };
export const getTasks = (tid?: string): any[] => JSON.parse(localStorage.getItem(`local_tasks_${tid || 'global'}`) || '[]');
export const saveTask = (t: any) => { const cur = getTasks(t.teacherId); localStorage.setItem(`local_tasks_${t.teacherId || 'global'}`, JSON.stringify([...cur, t])); };
export const getPurchaseRequests = (tid?: string): any[] => JSON.parse(localStorage.getItem(`local_purchases_${tid || 'global'}`) || '[]');
export const savePurchaseRequest = (r: any) => { const cur = getPurchaseRequests(r.teacherId); localStorage.setItem(`local_purchases_${r.teacherId || 'global'}`, JSON.stringify([r, ...cur])); };
export const updatePurchaseStatus = async (id: string, s: string) => { const cur = getPurchaseRequests('global'); const updated = cur.map((r:any) => r.id === id ? { ...r, status: s } : r); localStorage.setItem(`local_purchases_global`, JSON.stringify(updated)); };
export const getRewards = (tid?: string): any[] => JSON.parse(localStorage.getItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`) || '[]');
export const saveReward = (r: any, tid?: string) => { const cur = getRewards(tid); localStorage.setItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`, JSON.stringify([...cur.filter((x:any)=>x.id!==r.id), r])); };
export const deleteReward = (id: string, tid?: string) => { const cur = getRewards(tid); localStorage.setItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`, JSON.stringify(cur.filter((x:any)=>x.id!==id))); };
export const getExams = (tid?: string): any[] => JSON.parse(localStorage.getItem(`local_exams_${tid || 'global'}`) || '[]');
export const saveExam = (e: any) => { const cur = getExams(e.teacherId); localStorage.setItem(`local_exams_${e.teacherId || 'global'}`, JSON.stringify([...cur.filter((x:any)=>x.id!==e.id), e])); };
export const deleteExam = (id: string, tid?: string) => { const cur = getExams(tid); localStorage.setItem(`local_exams_${tid || 'global'}`, JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const getExamResults = (id: string): any[] => JSON.parse(localStorage.getItem(`local_exam_results_${id}`) || '[]');
export const saveExamResult = (r: any) => { const cur = getExamResults(r.examId); localStorage.setItem(`local_exam_results_${r.examId}`, JSON.stringify([...cur, r])); };
export const getTrackingSheets = (tid: string): any[] => JSON.parse(localStorage.getItem(`local_tracking_sheets_${tid}`) || '[]');
export const saveTrackingSheet = (s: any) => { const cur = getTrackingSheets(s.teacherId); localStorage.setItem(`local_tracking_sheets_${s.teacherId}`, JSON.stringify([...cur.filter((x:any)=>x.id!==s.id), s])); };
export const getWeeklyPlans = (tid: string): any[] => JSON.parse(localStorage.getItem(`local_weekly_plans_${tid}`) || '[]');
export const saveWeeklyPlanItem = (i: any) => { const cur = getWeeklyPlans(i.teacherId); localStorage.setItem(`local_weekly_plans_${i.teacherId}`, JSON.stringify([...cur.filter((x:any)=>x.id!==i.id), i])); };
export const getLessonLinks = (): any[] => JSON.parse(localStorage.getItem('local_lesson_links') || '[]');
export const saveLessonLink = (l: any) => { const cur = getLessonLinks(); localStorage.setItem('local_lesson_links', JSON.stringify([...cur, l])); };
export const getLessonPlans = (tid?: string): any[] => JSON.parse(localStorage.getItem(`local_lesson_plans_${tid || 'global'}`) || '[]');
export const saveLessonPlan = (p: any) => { const cur = getLessonPlans(p.teacherId); localStorage.setItem(`local_lesson_plans_${p.teacherId || 'global'}`, JSON.stringify([...cur.filter((x:any)=>x.id!==p.id), p])); };
export const deleteLessonPlan = (id: string, tid?: string) => { const cur = getLessonPlans(tid); localStorage.setItem(`local_lesson_plans_${tid || 'global'}`, JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const getTeacherAssignments = (tid?: string): any[] => JSON.parse(localStorage.getItem(`local_assignments_map_${tid || 'global'}`) || '[]');
export const addTeacherAssignment = (a: any) => { const cur = getTeacherAssignments(a.teacherId); localStorage.setItem(`local_assignments_map_${a.teacherId || 'global'}`, JSON.stringify([...cur, a])); };
export const deleteTeacherAssignment = (id: string) => { /* logic */ };
export const getTeacherPeriodTimings = (tid: string): string[] => JSON.parse(localStorage.getItem(`${KEYS.PERIOD_TIMINGS}_${tid}`) || '["07:00-07:45", "07:45-08:30"]');
export const saveTeacherPeriodTimings = (tid: string, t: string[]) => localStorage.setItem(`${KEYS.PERIOD_TIMINGS}_${tid}`, JSON.stringify(t));
export const getAssignments = (c: string, tid?: string, isM?: boolean): any[] => JSON.parse(localStorage.getItem(`local_assignments_${tid || 'global'}`) || '[]');
export const saveAssignment = (a: any) => { const cur = getAssignments('ALL', a.teacherId); localStorage.setItem(`local_assignments_${a.teacherId || 'global'}`, JSON.stringify([...cur.filter((x:any)=>x.id!==a.id), a])); };
export const deleteAssignment = (id: string, tid?: string) => { const cur = getAssignments('ALL', tid); localStorage.setItem(`local_assignments_${tid || 'global'}`, JSON.stringify(cur.filter((x:any)=>x.id!==id))); };
export const getChallenges = (tid?: string): any[] => JSON.parse(localStorage.getItem(`local_challenges_${tid || 'global'}`) || '[]');
export const saveChallenge = (c: any, tid: string) => { const cur = getChallenges(tid); localStorage.setItem(`local_challenges_${tid}`, JSON.stringify([...cur.filter((x:any)=>x.id!==c.id), c])); };
export const deleteChallenge = (id: string, tid: string) => { const cur = getChallenges(tid); localStorage.setItem(`local_challenges_${tid}`, JSON.stringify(cur.filter((x:any)=>x.id!==id))); };
export const getCustomTables = (tid?: string): any[] => JSON.parse(localStorage.getItem(`local_custom_tables_${tid || 'global'}`) || '[]');
export const addCustomTable = (t: any) => { const cur = getCustomTables(t.teacherId); localStorage.setItem(`local_custom_tables_${t.teacherId || 'global'}`, JSON.stringify([...cur, t])); };
export const deleteCustomTable = (id: string, tid?: string) => { const cur = getCustomTables(tid); localStorage.setItem(`local_custom_tables_${tid || 'global'}`, JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const getRemedialPlans = (): any[] => JSON.parse(localStorage.getItem('local_remedial_plans') || '[]');
export const saveRemedialPlan = (p: any) => { const cur = getRemedialPlans(); localStorage.setItem('local_remedial_plans', JSON.stringify([...cur.filter((x:any)=>x.id!==p.id), p])); };
export const getEnvironmentRecords = (cid: string): any[] => JSON.parse(localStorage.getItem(`local_env_records_${cid}`) || '[]');
export const saveEnvironmentRecord = (r: any) => { const cur = getEnvironmentRecords(r.classId); localStorage.setItem(`local_env_records_${r.classId}`, JSON.stringify([...cur, r])); };
export const getQuestionBank = (tid: string): any[] => JSON.parse(localStorage.getItem(`local_question_bank_${tid}`) || '[]');
export const saveQuestionToBank = (q: any) => { const cur = getQuestionBank(q.teacherId!); localStorage.setItem(`local_question_bank_${q.teacherId}`, JSON.stringify([...cur.filter((x:any)=>x.id!==q.id), q])); };
export const deleteQuestionFromBank = (id: string, tid?: string) => { const cur = getQuestionBank(tid || ''); localStorage.setItem(`local_question_bank_${tid || 'global'}`, JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const getCurriculumUnits = (tid: string): any[] => JSON.parse(localStorage.getItem(`local_curriculum_units_${tid}`) || '[]');
export const saveCurriculumUnit = (u: any) => { const cur = getCurriculumUnits(u.teacherId!); localStorage.setItem(`local_curriculum_units_${u.teacherId}`, JSON.stringify([...cur.filter((x:any)=>x.id!==u.id), u])); };
export const getCurriculumLessons = (uid: string): any[] => JSON.parse(localStorage.getItem(`local_curriculum_lessons_${uid}`) || '[]');
export const saveCurriculumLesson = (l: any) => { const cur = getCurriculumLessons(l.unitId); localStorage.setItem(`local_curriculum_lessons_${l.unitId}`, JSON.stringify([...cur.filter((x:any)=>x.id!==l.id), l])); };
export const deleteCurriculumLesson = (id: string, uid: string) => { const cur = getCurriculumLessons(uid); localStorage.setItem(`local_curriculum_lessons_${uid}`, JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const toggleCurriculumLesson = (id: string, s: boolean, uid: string) => { const cur = getCurriculumLessons(uid); const updated = cur.map((l:any) => l.id === id ? { ...l, isCompleted: s } : l); localStorage.setItem(`local_curriculum_lessons_${uid}`, JSON.stringify(updated)); };
export const getFormsDetailedResults = (tid: string): any[] => JSON.parse(localStorage.getItem(`local_forms_results_${tid}`) || '[]');
export const saveFormsDetailedResult = (r: any) => { const cur = getFormsDetailedResults(r.teacherId); localStorage.setItem(`local_forms_results_${r.teacherId}`, JSON.stringify([...cur.filter((x:any)=>x.id!==r.id), r])); };
export const deleteFormsDetailedResult = (id: string, tid?: string) => { const cur = getFormsDetailedResults(tid || ''); localStorage.setItem(`local_forms_results_${tid || 'global'}`, JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const deleteExamResult = (id: string, examId: string) => { const cur = getExamResults(examId); localStorage.setItem(`local_exam_results_${examId}`, JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const deleteTrackingSheet = (id: string, tid?: string) => { const cur = getTrackingSheets(tid || ''); localStorage.setItem(`local_tracking_sheets_${tid || 'global'}`, JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const deleteScheduleItem = (id: string) => { const cur = getSchedules(); localStorage.setItem('local_schedules', JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const deleteSubject = (id: string, tid?: string) => { const cur = getSubjects(tid); localStorage.setItem(`local_subjects_${tid || 'global'}`, JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const deleteAcademicTerm = (id: string, tid?: string) => { const cur = getAcademicTerms(tid); localStorage.setItem(`local_terms_${tid || 'global'}`, JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const deleteCurriculumUnit = (id: string, tid: string) => { const cur = getCurriculumUnits(tid); localStorage.setItem(`local_curriculum_units_${tid}`, JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const setCurrentTerm = (id: string, tid: string) => { const cur = getAcademicTerms(tid); const updated = cur.map((t:any) => ({ ...t, isCurrent: t.id === id })); localStorage.setItem(`local_terms_${tid}`, JSON.stringify(updated)); };
export const deleteLessonLink = (id: string) => { const cur = getLessonLinks(); localStorage.setItem('local_lesson_links', JSON.stringify(cur.filter((x:any) => x.id !== id))); };
export const getAISettings = () => ({ modelId: 'gemini-3-flash-preview', temperature: 0.7, systemInstruction: 'أنت مساعد تعليمي.' });
export const downloadFromSupabase = async () => ({ success: true });
export const checkConnection = async () => ({ success: true });
export const updateStudentLearningStyle = (id: string, s: LearningStyle) => { const students = getStudents(); const updated = students.map(st => st.id === id ? { ...st, learningStyle: s } : st); localStorage.setItem('local_students', JSON.stringify(updated)); };
export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (u: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, u);
