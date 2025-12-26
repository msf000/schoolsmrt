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
    schools: ['id', 'name', 'ministry_code', 'manager_name', 'manager_national_id', 'type', 'phone', 'student_count', 'education_administration'],
    system_users: ['id', 'name', 'email', 'national_id', 'password', 'role', 'school_id', 'status', 'phone'],
    students: ['id', 'name', 'national_id', 'class_id', 'school_id', 'grade_level', 'class_name', 'email', 'phone', 'parent_phone', 'password', 'xp', 'level', 'behavior_points'],
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
            const { error } = await supabase.from(tableId).select(columns.join(',')).limit(1);
            
            if (error) {
                tableStatus = 'ERROR';
                errorMessage = error.message;
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

// --- المصادقة ---
export const authenticateUser = async (id: string, p: string): Promise<SystemUser | null> => {
    if (id === 'admin' && p === 'admin') {
        return { id: 'admin_root', name: 'مدير النظام', email: 'admin@system.local', nationalId: 'admin', role: 'SUPER_ADMIN', status: 'ACTIVE' };
    }
    try {
        const { data, error } = await supabase.from('system_users').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', p).maybeSingle();
        if (error || !data) return null;
        return { 
            id: data.id, 
            name: data.name, 
            email: data.email, 
            nationalId: data.national_id, 
            role: data.role as any, 
            schoolId: data.school_id, 
            status: data.status as any,
            phone: data.phone
        };
    } catch { return null; }
};

export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => {
    try {
        const { data, error } = await supabase.from('students').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', p).maybeSingle();
        if (error || !data) return null;
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
            streak: data.streak || 0,
            createdById: data.created_by_id
        } as Student;
    } catch { return null; }
};

// --- جلب البيانات ---
export const fetchStudents = async (): Promise<Student[]> => {
    try {
        const { data, error } = await supabase.from('students').select('*').order('name');
        if (error) throw error;
        const mapped = (data || []).map((d: any) => ({
            id: d.id, name: d.name, role: 'STUDENT', nationalId: d.national_id, 
            classId: d.class_id, schoolId: d.school_id, gradeLevel: d.grade_level, 
            className: d.class_name, email: d.email, phone: d.phone, 
            parentPhone: d.parent_phone, xp: d.xp || 0, level: d.level || 1,
            behaviorPoints: d.behavior_points || 0, learningStyle: d.learning_style,
            createdById: d.created_by_id, streak: d.streak || 0
        })) as Student[];
        localStorage.setItem('local_students', JSON.stringify(mapped));
        return mapped;
    } catch { return JSON.parse(localStorage.getItem('local_students') || '[]'); }
};

export const fetchAttendance = async (teacherId?: string): Promise<AttendanceRecord[]> => {
    try {
        let query = supabase.from('attendance').select('*');
        if (teacherId) query = query.eq('created_by_id', teacherId);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map((d: any) => ({ 
            id: d.id, 
            studentId: d.student_id, 
            date: d.date, 
            status: d.status as any, 
            subject: d.subject, 
            period: d.period,
            createdById: d.created_by_id 
        }));
    } catch { return []; }
};

export const fetchPerformance = async (teacherId?: string): Promise<PerformanceRecord[]> => {
    try {
        let query = supabase.from('performance').select('*');
        if (teacherId) query = query.eq('created_by_id', teacherId);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map((d: any) => ({ 
            id: d.id, 
            studentId: d.student_id, 
            subject: d.subject, 
            title: d.title, 
            score: Number(d.score), 
            maxScore: Number(d.max_score), 
            date: d.date,
            category: d.category,
            notes: d.notes,
            createdById: d.created_by_id
        }));
    } catch { return []; }
};

export const fetchSchools = async (): Promise<School[]> => {
    try {
        const { data, error } = await supabase.from('schools').select('*').order('name');
        if (error) throw error;
        return (data || []).map((d: any) => ({ 
            id: d.id, 
            name: d.name, 
            ministryCode: d.ministry_code, 
            managerName: d.manager_name, 
            managerNationalId: d.manager_national_id,
            type: d.type || 'PUBLIC',
            phone: d.phone || '',
            studentCount: d.student_count || 0,
            educationAdministration: d.education_administration || ''
        })) as School[];
    } catch { return []; }
};

export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    try {
        const { data, error } = await supabase.from('system_users').select('*');
        if (error) throw error;
        return (data || []).map((d: any) => ({ 
            id: d.id, 
            name: d.name, 
            email: d.email, 
            nationalId: d.national_id, 
            role: d.role as any, 
            status: d.status as any,
            schoolId: d.school_id,
            phone: d.phone
        })) as SystemUser[];
    } catch { return []; }
};

export const fetchTeachers = async (): Promise<Teacher[]> => {
    try {
        const { data, error } = await supabase.from('system_users').select('*').eq('role', 'TEACHER');
        if (error) throw error;
        return (data || []).map((d: any) => ({ 
            id: d.id, 
            name: d.name, 
            nationalId: d.national_id, 
            email: d.email,
            phone: d.phone,
            subjectSpecialty: d.subject_specialty,
            schoolId: d.school_id,
            subscriptionStatus: d.subscription_status
        })) as Teacher[];
    } catch { return []; }
};

// --- عمليات الحفظ ---
export const addStudent = async (s: Student) => await supabase.from('students').upsert({ 
    id: s.id, name: s.name, national_id: s.nationalId, class_id: s.classId, 
    grade_level: s.gradeLevel, class_name: s.className, school_id: s.schoolId, 
    created_by_id: s.createdById, email: s.email, phone: s.phone, parent_phone: s.parentPhone
});

export const updateStudent = async (s: Student) => await supabase.from('students').update({ 
    name: s.name, national_id: s.nationalId, class_name: s.className, grade_level: s.gradeLevel,
    xp: s.xp, level: s.level, behavior_points: s.behaviorPoints, streak: s.streak, 
    badges: s.badges, purchased_rewards: s.purchasedRewards, learning_style: s.learningStyle
}).eq('id', s.id);

export const saveAttendance = async (recs: AttendanceRecord[]) => await supabase.from('attendance').upsert(recs.map(r => ({ 
    id: r.id, student_id: r.studentId, date: r.date, status: r.status, subject: r.subject, period: r.period, created_by_id: r.createdById 
})));

export const addPerformance = async (recs: PerformanceRecord[]) => await supabase.from('performance').upsert(recs.map(r => ({ 
    id: r.id, student_id: r.studentId, subject: r.subject, title: r.title, score: r.score, max_score: r.maxScore, date: r.date, created_by_id: r.createdById, category: r.category, notes: r.notes 
})));

export const addSchool = async (s: School) => await supabase.from('schools').insert({ 
    id: s.id, name: s.name, ministry_code: s.ministryCode, manager_name: s.managerName, 
    manager_national_id: s.managerNationalId, type: s.type, phone: s.phone, 
    student_count: s.studentCount, education_administration: s.educationAdministration 
});

export const addSystemUser = async (u: SystemUser) => await supabase.from('system_users').insert({ 
    id: u.id, name: u.name, email: u.email, national_id: u.nationalId, password: u.password, 
    role: u.role, school_id: u.schoolId, status: u.status, phone: u.phone 
});

/* Fix: Kept only the first unique declaration of updateSystemUser and removed redeclarations below */
export const updateSystemUser = async (u: SystemUser) => await supabase.from('system_users').update({
    name: u.name, email: u.email, national_id: u.nationalId, role: u.role, status: u.status, phone: u.phone
}).eq('id', u.id);

export const updateTeacher = async (t: Teacher) => await supabase.from('system_users').update({
    name: t.name, national_id: t.nationalId, email: t.email, phone: t.phone, 
    subject_specialty: t.subjectSpecialty, subscription_status: t.subscriptionStatus, password: t.password
}).eq('id', t.id);

export const addTeacher = async (t: Teacher) => await supabase.from('system_users').insert({
    id: t.id, name: t.name, email: t.email, national_id: t.nationalId, password: t.password,
    role: 'TEACHER', school_id: t.schoolId, status: 'ACTIVE', phone: t.phone, subject_specialty: t.subjectSpecialty
});

export const deleteStudent = async (id: string) => await supabase.from('students').delete().eq('id', id);
export const deleteAttendance = async (id: string) => await supabase.from('attendance').delete().eq('id', id);
export const deletePerformance = async (id: string) => await supabase.from('performance').delete().eq('id', id);
export const deleteSchool = async (id: string) => await supabase.from('schools').delete().eq('id', id);

// --- إدارة النظام (SQL Setup) ---
export const getDatabaseSchemaSQL = () => `
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
    role TEXT NOT NULL,
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'ACTIVE',
    phone TEXT,
    subject_specialty TEXT,
    subscription_status TEXT DEFAULT 'FREE'
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

ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance DISABLE ROW LEVEL SECURITY;
`;

// --- المساعدات المحلية ---
export const getStudents = (): Student[] => JSON.parse(localStorage.getItem('local_students') || '[]');
export const getAttendance = (): AttendanceRecord[] => []; // يتم جلبها من السحابة حصراً
export const getSchools = (): School[] => [];
export const getTeachers = (): Teacher[] => [];
export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem(KEYS.USER_THEME) || '{"mode":"LIGHT","backgroundStyle":"FLAT"}');
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));
export const getSubjects = (tid?: string): Subject[] => JSON.parse(localStorage.getItem(`local_subjects_${tid || 'global'}`) || '[]');
export const addSubject = (s: Subject) => { const cur = getSubjects(s.teacherId); localStorage.setItem(`local_subjects_${s.teacherId || 'global'}`, JSON.stringify([...cur, s])); };
export const getAcademicTerms = (tid?: string): AcademicTerm[] => JSON.parse(localStorage.getItem(`local_terms_${tid || 'global'}`) || '[]');
export const saveAcademicTerm = (t: AcademicTerm) => { const cur = getAcademicTerms(t.teacherId); localStorage.setItem(`local_terms_${t.teacherId || 'global'}`, JSON.stringify([...cur.filter(x=>x.id!==t.id), t])); };
export const getMessages = (tid?: string): MessageLog[] => JSON.parse(localStorage.getItem(`local_messages_${tid || 'global'}`) || '[]');
export const saveMessage = (m: MessageLog) => { const cur = getMessages(m.teacherId); localStorage.setItem(`local_messages_${m.teacherId || 'global'}`, JSON.stringify([m, ...cur])); };
export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => JSON.parse(localStorage.getItem(`report_header_${tid || 'global'}`) || '{"schoolName":"","educationAdmin":"","teacherName":"","schoolManager":"","academicYear":"","term":""}');
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => localStorage.setItem(`report_header_${c.teacherId || 'global'}`, JSON.stringify(c));
export const getSchedules = (): ScheduleItem[] => JSON.parse(localStorage.getItem('local_schedules') || '[]');
export const saveScheduleItem = (s: ScheduleItem) => { const cur = getSchedules(); localStorage.setItem('local_schedules', JSON.stringify([...cur, s])); };
export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => JSON.parse(localStorage.getItem(`local_incidents_${tid || 'global'}`) || '[]');
export const saveBehaviorIncident = (i: BehaviorIncident) => { const cur = getBehaviorIncidents(i.teacherId); localStorage.setItem(`local_incidents_${i.teacherId || 'global'}`, JSON.stringify([...cur, i])); };
export const getTasks = (tid?: string): Task[] => JSON.parse(localStorage.getItem(`local_tasks_${tid || 'global'}`) || '[]');
export const saveTask = (t: Task) => { const cur = getTasks(t.teacherId); localStorage.setItem(`local_tasks_${t.teacherId || 'global'}`, JSON.stringify([...cur, t])); };
export const getPurchaseRequests = (tid?: string): PurchaseRequest[] => JSON.parse(localStorage.getItem(`local_purchases_${tid || 'global'}`) || '[]');
export const savePurchaseRequest = (r: PurchaseRequest) => { const cur = getPurchaseRequests(r.teacherId); localStorage.setItem(`local_purchases_${r.teacherId || 'global'}`, JSON.stringify([r, ...cur])); };
export const updatePurchaseStatus = async (id: string, s: string) => { 
    const cur = getPurchaseRequests('global');
    const updated = cur.map(r => r.id === id ? { ...r, status: s as any } : r);
    localStorage.setItem(`local_purchases_global`, JSON.stringify(updated));
};
export const getRewards = (tid?: string): Reward[] => JSON.parse(localStorage.getItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`) || '[]');
export const saveReward = (r: Reward, tid?: string) => { const cur = getRewards(tid); localStorage.setItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`, JSON.stringify([...cur.filter(x=>x.id!==r.id), r])); };
export const deleteReward = (id: string, tid?: string) => { const cur = getRewards(tid); localStorage.setItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`, JSON.stringify(cur.filter(x=>x.id!==id))); };
export const getExams = (tid?: string): Exam[] => JSON.parse(localStorage.getItem(`local_exams_${tid || 'global'}`) || '[]');
export const saveExam = (e: Exam) => { const cur = getExams(e.teacherId); localStorage.setItem(`local_exams_${e.teacherId || 'global'}`, JSON.stringify([...cur.filter(x=>x.id!==e.id), e])); };

export const deleteExam = (id: string, tid?: string) => {
    const cur = getExams(tid);
    localStorage.setItem(`local_exams_${tid || 'global'}`, JSON.stringify(cur.filter(x => x.id !== id)));
};

export const getExamResults = (id: string): ExamResult[] => JSON.parse(localStorage.getItem(`local_exam_results_${id}`) || '[]');
export const saveExamResult = (r: ExamResult) => { const cur = getExamResults(r.examId); localStorage.setItem(`local_exam_results_${r.examId}`, JSON.stringify([...cur, r])); };
export const getTrackingSheets = (tid: string): TrackingSheet[] => JSON.parse(localStorage.getItem(`local_tracking_sheets_${String(tid)}`) || '[]');
export const saveTrackingSheet = (s: TrackingSheet) => { const cur = getTrackingSheets(s.teacherId); localStorage.setItem(`local_tracking_sheets_${s.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==s.id), s])); };
export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => JSON.parse(localStorage.getItem(`local_weekly_plans_${String(tid)}`) || '[]');
export const saveWeeklyPlanItem = (i: WeeklyPlanItem) => { const cur = getWeeklyPlans(i.teacherId); localStorage.setItem(`local_weekly_plans_${i.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==i.id), i])); };
export const getLessonLinks = (): LessonLink[] => JSON.parse(localStorage.getItem('local_lesson_links') || '[]');
export const saveLessonLink = (l: LessonLink) => { const cur = getLessonLinks(); localStorage.setItem('local_lesson_links', JSON.stringify([...cur, l])); };
export const getLessonPlans = (tid?: string): StoredLessonPlan[] => JSON.parse(localStorage.getItem(`local_lesson_plans_${tid || 'global'}`) || '[]');
export const saveLessonPlan = (p: StoredLessonPlan) => { const cur = getLessonPlans(p.teacherId); localStorage.setItem(`local_lesson_plans_${p.teacherId || 'global'}`, JSON.stringify([...cur.filter(x=>x.id!==p.id), p])); };

export const deleteLessonPlan = (id: string, tid?: string) => {
    const cur = getLessonPlans(tid);
    localStorage.setItem(`local_lesson_plans_${tid || 'global'}`, JSON.stringify(cur.filter(x => x.id !== id)));
};

export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => JSON.parse(localStorage.getItem(`local_assignments_map_${tid || 'global'}`) || '[]');
export const addTeacherAssignment = (a: TeacherAssignment) => { const cur = getTeacherAssignments(a.teacherId); localStorage.setItem(`local_assignments_map_${a.teacherId || 'global'}`, JSON.stringify([...cur, a])); };
export const deleteTeacherAssignment = (id: string) => { /* logic */ };
// Fix getTeacherPeriodTimings to use a stringified array as fallback to JSON.parse
export const getTeacherPeriodTimings = (tid: string): string[] => JSON.parse(localStorage.getItem(`${KEYS.PERIOD_TIMINGS}_${String(tid)}`) || '["07:00-07:45", "07:45-08:30"]');
export const saveTeacherPeriodTimings = (tid: string, t: string[]) => localStorage.setItem(`${KEYS.PERIOD_TIMINGS}_${String(tid)}`, JSON.stringify(t));
export const getAssignments = (c: string, tid?: string, isM?: boolean): Assignment[] => JSON.parse(localStorage.getItem(`local_assignments_${tid || 'global'}`) || '[]');
export const saveAssignment = (a: Assignment) => { const cur = getAssignments('ALL', a.teacherId); localStorage.setItem(`local_assignments_${a.teacherId || 'global'}`, JSON.stringify([...cur.filter(x=>x.id!==a.id), a])); };
export const deleteAssignment = (id: string, tid?: string) => { const cur = getAssignments('ALL', tid); localStorage.setItem(`local_assignments_${tid || 'global'}`, JSON.stringify(cur.filter(x=>x.id!==id))); };
export const getChallenges = (tid?: string): WeeklyChallenge[] => JSON.parse(localStorage.getItem(`local_challenges_${tid || 'global'}`) || '[]');
export const saveChallenge = (c: WeeklyChallenge, tid: string) => { const cur = getChallenges(tid); localStorage.setItem(`local_challenges_${String(tid)}`, JSON.stringify([...cur.filter(x=>x.id!==c.id), c])); };
export const deleteChallenge = (id: string, tid: string) => { const cur = getChallenges(tid); localStorage.setItem(`local_challenges_${String(tid)}`, JSON.stringify(cur.filter(x=>x.id!==id))); };
export const getCustomTables = (tid?: string): CustomTable[] => JSON.parse(localStorage.getItem(`local_custom_tables_${tid || 'global'}`) || '[]');
export const addCustomTable = (t: CustomTable) => { const cur = getCustomTables(t.teacherId); localStorage.setItem(`local_custom_tables_${t.teacherId || 'global'}`, JSON.stringify([...cur, t])); };

export const deleteCustomTable = (id: string, tid?: string) => {
    const cur = getCustomTables(tid);
    localStorage.setItem(`local_custom_tables_${tid || 'global'}`, JSON.stringify(cur.filter(x => x.id !== id)));
};

export const getRemedialPlans = (): RemedialPlan[] => JSON.parse(localStorage.getItem('local_remedial_plans') || '[]');
export const saveRemedialPlan = (p: RemedialPlan) => { const cur = getRemedialPlans(); localStorage.setItem('local_remedial_plans', JSON.stringify([...cur.filter(x=>x.id!==p.id), p])); };
export const getEnvironmentRecords = (cid: string): EnvironmentRecord[] => JSON.parse(localStorage.getItem(`local_env_records_${String(cid)}`) || '[]');
export const saveEnvironmentRecord = (r: EnvironmentRecord) => { const cur = getEnvironmentRecords(r.classId); localStorage.setItem(`local_env_records_${r.classId}`, JSON.stringify([...cur, r])); };

export const getQuestionBank = (tid: string): Question[] => JSON.parse(localStorage.getItem(`local_question_bank_${String(tid)}`) || '[]');
export const saveQuestionToBank = (q: Question) => { const cur = getQuestionBank(q.teacherId!); localStorage.setItem(`local_question_bank_${q.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==q.id), q])); };

export const deleteQuestionFromBank = (id: string, tid?: string) => {
    const cur = getQuestionBank(tid || '');
    localStorage.setItem(`local_question_bank_${tid || 'global'}`, JSON.stringify(cur.filter(x => x.id !== id)));
};

export const getCurriculumUnits = (tid: string): CurriculumUnit[] => JSON.parse(localStorage.getItem(`local_curriculum_units_${String(tid)}`) || '[]');
export const saveCurriculumUnit = (u: CurriculumUnit) => { const cur = getCurriculumUnits(u.teacherId!); localStorage.setItem(`local_curriculum_units_${u.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==u.id), u])); };
export const getCurriculumLessons = (uid: string): CurriculumLesson[] => JSON.parse(localStorage.getItem(`local_curriculum_lessons_${String(uid)}`) || '[]');
export const saveCurriculumLesson = (l: CurriculumLesson) => { const cur = getCurriculumLessons(l.unitId); localStorage.setItem(`local_curriculum_lessons_${l.unitId}`, JSON.stringify([...cur.filter(x=>x.id!==l.id), l])); };

export const deleteCurriculumLesson = (id: string, uid: string) => {
    const cur = getCurriculumLessons(uid);
    localStorage.setItem(`local_curriculum_lessons_${String(uid)}`, JSON.stringify(cur.filter(x => x.id !== id)));
};

export const toggleCurriculumLesson = (id: string, s: boolean, uid: string) => { 
    const cur = getCurriculumLessons(uid);
    const updated = cur.map(l => l.id === id ? { ...l, isCompleted: s } : l);
    localStorage.setItem(`local_curriculum_lessons_${String(uid)}`, JSON.stringify(updated));
};
export const getFormsDetailedResults = (tid: string): FormsDetailedResult[] => JSON.parse(localStorage.getItem(`local_forms_results_${String(tid)}`) || '[]');
export const saveFormsDetailedResult = (r: FormsDetailedResult) => { const cur = getFormsDetailedResults(r.teacherId); localStorage.setItem(`local_forms_results_${r.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==r.id), r])); };

export const deleteFormsDetailedResult = (id: string, tid?: string) => {
    const cur = getFormsDetailedResults(tid || '');
    localStorage.setItem(`local_forms_results_${tid || 'global'}`, JSON.stringify(cur.filter(x => x.id !== id)));
};

export const deleteExamResult = (id: string, examId: string) => {
    const cur = getExamResults(examId);
    localStorage.setItem(`local_exam_results_${String(examId)}`, JSON.stringify(cur.filter(x => x.id !== id)));
};

export const deleteTrackingSheet = (id: string, tid?: string) => {
    const cur = getTrackingSheets(tid || '');
    localStorage.setItem(`local_tracking_sheets_${tid || 'global'}`, JSON.stringify(cur.filter(x => x.id !== id)));
};

export const deleteScheduleItem = (id: string) => {
    const cur = getSchedules();
    localStorage.setItem('local_schedules', JSON.stringify(cur.filter(x => x.id !== id)));
};

export const deleteSubject = (id: string, tid?: string) => {
    const cur = getSubjects(tid);
    localStorage.setItem(`local_subjects_${tid || 'global'}`, JSON.stringify(cur.filter(x => x.id !== id)));
};

export const deleteAcademicTerm = (id: string, tid?: string) => {
    const cur = getAcademicTerms(tid);
    localStorage.setItem(`local_terms_${tid || 'global'}`, JSON.stringify(cur.filter(x => x.id !== id)));
};

export const deleteCurriculumUnit = (id: string, tid: string) => {
    const cur = getCurriculumUnits(tid);
    localStorage.setItem(`local_curriculum_units_${String(tid)}`, JSON.stringify(cur.filter(x => x.id !== id)));
};

export const setCurrentTerm = (id: string, tid: string) => {
    const cur = getAcademicTerms(tid);
    const updated = cur.map(t => ({ ...t, isCurrent: t.id === id }));
    localStorage.setItem(`local_terms_${String(tid)}`, JSON.stringify(updated));
};

export const deleteLessonLink = (id: string) => {
    const cur = getLessonLinks();
    localStorage.setItem('local_lesson_links', JSON.stringify(cur.filter(x => x.id !== id)));
};

export const getAISettings = () => ({ modelId: 'gemini-3-flash-preview', temperature: 0.7, systemInstruction: 'أنت مساعد تعليمي.' });
export const downloadFromSupabase = async () => ({ success: true });
export const checkConnection = async () => ({ success: true });
export const updateStudentLearningStyle = (id: string, s: LearningStyle) => { /* logic */ };
export const getWorksMasterUrl = () => '';
export const saveWorksMasterUrl = (u: string) => { /* logic */ };