
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
    lesson_plans: ['id', 'teacher_id', 'lesson_id', 'subject', 'topic', 'content_json', 'resources', 'created_at'],
    subjects: ['id', 'name', 'teacher_id'],
    schedules: ['id', 'class_id', 'subject_name', 'day', 'period', 'teacher_id'],
    custom_tables: ['id', 'name', 'columns', 'rows', 'source_url', 'last_updated', 'teacher_id', 'created_at'],
    environment_records: ['id', 'teacher_id', 'class_id', 'date', 'lighting', 'noise_level', 'mood', 'notes'],
    academic_terms: ['id', 'name', 'start_date', 'end_date', 'is_current', 'teacher_id', 'periods'],
    assignments: ['id', 'title', 'category', 'max_score', 'is_visible', 'teacher_id', 'term_id', 'period_id', 'sort_order', 'url'],
    tracking_sheets: ['id', 'title', 'subject', 'class_name', 'teacher_id', 'created_at', 'columns', 'scores'],
    weekly_plans: ['id', 'teacher_id', 'class_id', 'subject_name', 'day', 'period', 'week_start_date', 'lesson_topic', 'homework', 'grade_level'],
    lesson_links: ['id', 'title', 'url', 'teacher_id', 'created_at', 'grade_level', 'class_name'],
    weekly_challenges: ['id', 'title', 'description', 'reward_xp', 'start_date', 'end_date', 'target_class', 'is_active', 'type'],
    messages: ['id', 'student_id', 'student_name', 'parent_phone', 'type', 'content', 'status', 'date', 'sent_by', 'teacher_id']
};

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

export const getDatabaseSchemaSQL = () => `
-- السكربت الشامل لإعداد قاعدة بيانات نظام المتابع الذكي v2.5
-- اذهب إلى SQL Editor في Supabase والصق الكود بالكامل ثم Run

-- 1. الجداول الأساسية (Core)
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
    role TEXT NOT NULL, -- 'SUPER_ADMIN', 'SCHOOL_MANAGER', 'TEACHER', 'PARENT'
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
    grade_level TEXT,
    class_name TEXT,
    email TEXT,
    phone TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    password TEXT DEFAULT '123456',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    behavior_points INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    learning_style TEXT,
    badges JSONB DEFAULT '[]',
    purchased_rewards JSONB DEFAULT '[]',
    created_by_id TEXT REFERENCES system_users(id) ON DELETE SET NULL,
    seat_index INTEGER
);

-- 2. جداول المتابعة (Tracking)
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- 'PRESENT', 'ABSENT', 'LATE', 'EXCUSED'
    subject TEXT,
    period INTEGER,
    created_by_id TEXT REFERENCES system_users(id),
    behavior_status TEXT,
    behavior_note TEXT,
    participation_score INTEGER DEFAULT 0,
    excuse_note TEXT
);

CREATE TABLE IF NOT EXISTS performance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    subject TEXT,
    title TEXT,
    score NUMERIC,
    max_score NUMERIC,
    date DATE,
    created_by_id TEXT REFERENCES system_users(id),
    category TEXT, -- 'HOMEWORK', 'ACTIVITY', 'EXAM'
    notes TEXT,
    url TEXT
);

CREATE TABLE IF NOT EXISTS behavior_incidents (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    teacher_id TEXT REFERENCES system_users(id),
    type TEXT, -- 'POSITIVE', 'NEGATIVE'
    category TEXT,
    points INTEGER,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    note TEXT,
    action_taken TEXT
);

-- 3. جداول التخطيط والمحتوى (Planning & Content)
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    teacher_id TEXT REFERENCES system_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    class_id TEXT,
    subject_name TEXT,
    day TEXT, -- 'Sunday', 'Monday', etc.
    period INTEGER,
    teacher_id TEXT REFERENCES system_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS academic_terms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    teacher_id TEXT REFERENCES system_users(id),
    periods JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS lesson_plans (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id),
    lesson_id TEXT,
    subject TEXT,
    topic TEXT,
    content_json JSONB,
    resources JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculum_units (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id),
    subject TEXT,
    grade_level TEXT,
    title TEXT NOT NULL,
    order_index INTEGER
);

CREATE TABLE IF NOT EXISTS curriculum_lessons (
    id TEXT PRIMARY KEY,
    unit_id TEXT REFERENCES curriculum_units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4. جداول الاختبارات والمهام (Assessment)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id),
    class_id TEXT,
    subject TEXT,
    title TEXT,
    description TEXT,
    due_date DATE,
    type TEXT,
    max_score NUMERIC,
    submissions JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT,
    max_score NUMERIC DEFAULT 10,
    is_visible BOOLEAN DEFAULT TRUE,
    teacher_id TEXT REFERENCES system_users(id),
    term_id TEXT REFERENCES academic_terms(id) ON DELETE SET NULL,
    period_id TEXT,
    sort_order INTEGER DEFAULT 0,
    url TEXT
);

CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id),
    title TEXT NOT NULL,
    subject TEXT,
    grade_level TEXT,
    duration_minutes INTEGER DEFAULT 30,
    questions JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_results (
    id TEXT PRIMARY KEY,
    exam_id TEXT REFERENCES exams(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
    score NUMERIC,
    total_score NUMERIC,
    answers JSONB DEFAULT '[]',
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. جداول التفاعل والمتجر (Engagement)
CREATE TABLE IF NOT EXISTS rewards (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id),
    title TEXT NOT NULL,
    cost INTEGER NOT NULL,
    icon TEXT,
    description TEXT,
    category TEXT -- 'ITEM', 'PRIVILEGE'
);

CREATE TABLE IF NOT EXISTS purchase_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id),
    student_name TEXT,
    reward_id TEXT REFERENCES rewards(id),
    reward_title TEXT,
    cost INTEGER,
    status TEXT DEFAULT 'PENDING',
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    teacher_id TEXT REFERENCES system_users(id)
);

CREATE TABLE IF NOT EXISTS weekly_challenges (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    reward_xp INTEGER DEFAULT 100,
    start_date DATE,
    end_date DATE,
    target_class TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    type TEXT
);

-- 6. جداول البيانات والتواصل (Data & Messaging)
CREATE TABLE IF NOT EXISTS custom_tables (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    columns JSONB DEFAULT '[]',
    rows JSONB DEFAULT '[]',
    source_url TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    teacher_id TEXT REFERENCES system_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracking_sheets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT,
    class_name TEXT,
    teacher_id TEXT REFERENCES system_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    columns JSONB DEFAULT '[]',
    scores JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id),
    student_name TEXT,
    parent_phone TEXT,
    type TEXT,
    content TEXT,
    status TEXT DEFAULT 'SENT',
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_by TEXT,
    teacher_id TEXT REFERENCES system_users(id)
);

CREATE TABLE IF NOT EXISTS environment_records (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id),
    class_id TEXT,
    date DATE DEFAULT CURRENT_DATE,
    lighting INTEGER,
    noise_level INTEGER,
    mood TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS lesson_links (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    teacher_id TEXT REFERENCES system_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    grade_level TEXT,
    class_name TEXT
);

CREATE TABLE IF NOT EXISTS weekly_plans (
    id TEXT PRIMARY KEY,
    teacher_id TEXT REFERENCES system_users(id),
    class_id TEXT,
    subject_name TEXT,
    day TEXT,
    period INTEGER,
    week_start_date DATE,
    lesson_topic TEXT,
    homework TEXT,
    grade_level TEXT
);

-- 7. ترقيات الأعمدة (لضمان عمل التحديثات الجديدة)
ALTER TABLE students ADD COLUMN IF NOT EXISTS seat_index INTEGER;
ALTER TABLE students ADD COLUMN IF NOT EXISTS learning_style TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';
ALTER TABLE students ADD COLUMN IF NOT EXISTS purchased_rewards JSONB DEFAULT '[]';

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS behavior_status TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS behavior_note TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS participation_score INTEGER DEFAULT 0;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS excuse_note TEXT;

ALTER TABLE lesson_links ADD COLUMN IF NOT EXISTS grade_level TEXT;
ALTER TABLE lesson_links ADD COLUMN IF NOT EXISTS class_name TEXT;

ALTER TABLE system_users ADD COLUMN IF NOT EXISTS subject_specialty TEXT;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'FREE';

ALTER TABLE weekly_plans ADD COLUMN IF NOT EXISTS grade_level TEXT;
`;

export const exportToWord = (elementId: string, filename: string = 'report.doc') => {
    const html = document.getElementById(elementId)?.innerHTML;
    if (!html) return;
    const blob = new Blob(['\ufeff', `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40' dir='rtl'>
        <head><meta charset='utf-8'><title>Export</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid black; padding: 8px; text-align: center; }
            .font-black { font-weight: bold; }
        </style>
        </head><body>${html}</body></html>
    `], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
};

export const authenticateUser = async (id: string, p: string): Promise<SystemUser | null> => {
    if (id === 'admin' && p === 'admin') return { id: 'admin_root', name: 'مدير النظام', email: 'admin@system.local', nationalId: 'admin', role: 'SUPER_ADMIN', status: 'ACTIVE' };
    const { data } = await supabase.from('system_users').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', p).maybeSingle();
    return data ? { ...data, nationalId: data.national_id, schoolId: data.school_id } as SystemUser : null;
};

export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => {
    const { data } = await supabase.from('students').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', p).maybeSingle();
    return data ? { ...data, nationalId: data.national_id, schoolId: data.school_id, classId: data.class_id, gradeLevel: data.grade_level, className: data.class_name } as Student : null;
};

export const fetchStudents = async (): Promise<Student[]> => {
    const { data } = await supabase.from('students').select('*').order('name');
    const mapped = (data || []).map((d: any) => ({ ...d, nationalId: d.national_id, classId: d.class_id, schoolId: d.school_id, gradeLevel: d.grade_level, className: d.class_name })) as Student[];
    localStorage.setItem('local_students', JSON.stringify(mapped));
    return mapped;
};

export const getStudents = (): Student[] => JSON.parse(localStorage.getItem('local_students') || '[]');

export const addStudent = async (s: Student) => await supabase.from('students').upsert({ ...s, national_id: s.nationalId, class_id: s.classId, school_id: s.schoolId, grade_level: s.gradeLevel, class_name: s.className });

export const updateStudent = async (s: Student) => await addStudent(s);

export const updateStudentLearningStyle = async (id: string, style: LearningStyle) => {
    await supabase.from('students').update({ learning_style: style }).eq('id', id);
};

export const deleteStudent = async (id: string) => await supabase.from('students').delete().eq('id', id);

export const fetchAttendance = async (tid?: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance').select('*');
    if (tid) query = query.eq('created_by_id', tid);
    const { data } = await query.order('date', { ascending: false });
    const mapped = (data || []).map((d: any) => ({ ...d, studentId: d.student_id, createdById: d.created_by_id })) as AttendanceRecord[];
    localStorage.setItem('local_attendance', JSON.stringify(mapped));
    return mapped;
};

export const getAttendance = (): AttendanceRecord[] => JSON.parse(localStorage.getItem('local_attendance') || '[]');

export const saveAttendance = async (recs: AttendanceRecord[]) => await supabase.from('attendance').upsert(recs.map(r => ({ ...r, student_id: r.studentId, created_by_id: r.createdById })));

export const deleteAttendance = async (id: string) => await supabase.from('attendance').delete().eq('id', id);

export const fetchPerformance = async (tid?: string): Promise<PerformanceRecord[]> => {
    let query = supabase.from('performance').select('*');
    if (tid) query = query.eq('created_by_id', tid);
    const { data } = await query.order('date', { ascending: false });
    const mapped = (data || []).map((d: any) => ({ ...d, studentId: d.student_id, maxScore: d.max_score, createdById: d.created_by_id })) as PerformanceRecord[];
    localStorage.setItem('local_performance', JSON.stringify(mapped));
    return mapped;
};

export const addPerformance = async (recs: PerformanceRecord[]) => await supabase.from('performance').upsert(recs.map(r => ({ ...r, student_id: r.studentId, max_score: r.maxScore, created_by_id: r.createdById })));

export const deletePerformance = async (id: string) => await supabase.from('performance').delete().eq('id', id);

export const fetchSchools = async (): Promise<School[]> => {
    const { data } = await supabase.from('schools').select('*');
    const mapped = (data || []).map((d: any) => ({ ...d, ministryCode: d.ministry_code, managerName: d.manager_name, managerNationalId: d.manager_national_id, educationAdministration: d.education_administration, studentCount: d.student_count })) as School[];
    localStorage.setItem('local_schools', JSON.stringify(mapped));
    return mapped;
};

export const getSchools = (): School[] => JSON.parse(localStorage.getItem('local_schools') || '[]');

export const addSchool = async (s: School) => await supabase.from('schools').upsert({ ...s, ministry_code: s.ministryCode, manager_name: s.managerName, manager_national_id: s.managerNationalId, education_administration: s.educationAdministration, student_count: s.studentCount });

export const fetchTeachers = async (): Promise<Teacher[]> => {
    const { data } = await supabase.from('system_users').select('*').eq('role', 'TEACHER');
    const mapped = (data || []).map((d: any) => ({ ...d, nationalId: d.national_id, subjectSpecialty: d.subject_specialty, schoolId: d.school_id, subscriptionStatus: d.subscription_status })) as Teacher[];
    localStorage.setItem('local_teachers', JSON.stringify(mapped));
    return mapped;
};

export const getTeachers = (): Teacher[] => JSON.parse(localStorage.getItem('local_teachers') || '[]');

export const addTeacher = async (t: Teacher) => await addSystemUser(t);

export const updateTeacher = async (t: Teacher) => await addSystemUser(t);

export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    const { data } = await supabase.from('system_users').select('*');
    return (data || []).map((d: any) => ({ ...d, nationalId: d.national_id, schoolId: d.school_id })) as SystemUser[];
};

export const addSystemUser = async (u: SystemUser) => await supabase.from('system_users').upsert({ ...u, national_id: u.nationalId, school_id: u.schoolId, subject_specialty: (u as any).subjectSpecialty, subscription_status: (u as any).subscriptionStatus });

export const updateSystemUser = async (u: SystemUser) => await addSystemUser(u);

export const getSubjects = (tid?: string): Subject[] => JSON.parse(localStorage.getItem(`local_subjects_${tid || 'global'}`) || '[]');

export const addSubject = (s: Subject) => { const cur = getSubjects(s.teacherId); localStorage.setItem(`local_subjects_${s.teacherId || 'global'}`, JSON.stringify([...cur, s])); };

export const deleteSubject = (id: string) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_subjects_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((s: Subject) => s.id !== id))); }); };

export const getAcademicTerms = (tid?: string): AcademicTerm[] => JSON.parse(localStorage.getItem(`local_terms_${tid || 'global'}`) || '[]');

export const fetchAcademicTerms = async (tid?: string): Promise<AcademicTerm[]> => {
    try {
        let query = supabase.from('academic_terms').select('*');
        if (tid) query = query.eq('teacher_id', tid);
        const { data } = await query;
        const mapped = (data || []).map((d: any) => ({ ...d, startDate: d.start_date, endDate: d.end_date, isCurrent: d.is_current, teacherId: d.teacher_id })) as AcademicTerm[];
        localStorage.setItem(`local_terms_${tid || 'global'}`, JSON.stringify(mapped));
        return mapped;
    } catch { return getAcademicTerms(tid); }
};

export const saveAcademicTerm = async (t: AcademicTerm) => {
    const cur = getAcademicTerms(t.teacherId);
    localStorage.setItem(`local_terms_${t.teacherId || 'global'}`, JSON.stringify([...cur.filter(x=>x.id!==t.id), t]));
    await supabase.from('academic_terms').upsert({ id: t.id, name: t.name, start_date: t.startDate, end_date: t.endDate, is_current: t.isCurrent, teacher_id: t.teacherId, periods: t.periods || [] });
};

export const deleteAcademicTerm = async (id: string) => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('local_terms_'));
    keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((t: AcademicTerm) => t.id !== id))); });
    await supabase.from('academic_terms').delete().eq('id', id);
};

export const setCurrentTerm = async (id: string, tid: string) => {
    const cur = getAcademicTerms(tid);
    const updated = cur.map(t => ({ ...t, isCurrent: t.id === id }));
    localStorage.setItem(`local_terms_${tid}`, JSON.stringify(updated));
    await supabase.from('academic_terms').update({ is_current: false }).eq('teacher_id', tid);
    await supabase.from('academic_terms').update({ is_current: true }).eq('id', id);
};

export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => JSON.parse(localStorage.getItem(`report_header_${tid || 'global'}`) || '{"schoolName":"","educationAdmin":"","teacherName":"","schoolManager":"","academicYear":"","term":""}');

export const saveReportHeaderConfig = (c: ReportHeaderConfig) => localStorage.setItem(`report_header_${c.teacherId || 'global'}`, JSON.stringify(c));

export const getSchedules = (): ScheduleItem[] => JSON.parse(localStorage.getItem('local_schedules') || '[]');

export const fetchSchedules = async (tid?: string): Promise<ScheduleItem[]> => {
    try {
        let query = supabase.from('schedules').select('*');
        if (tid) query = query.eq('teacher_id', tid);
        const { data } = await query;
        const mapped = (data || []).map((d: any) => ({ ...d, classId: d.class_id, subjectName: d.subject_name, teacherId: d.teacher_id })) as ScheduleItem[];
        localStorage.setItem('local_schedules', JSON.stringify(mapped));
        return mapped;
    } catch { return getSchedules(); }
};

export const saveScheduleItem = async (s: ScheduleItem) => {
    const cur = getSchedules();
    localStorage.setItem('local_schedules', JSON.stringify([...cur.filter(x => x.id !== s.id), s]));
    await supabase.from('schedules').upsert({ id: s.id, class_id: s.classId, subject_name: s.subjectName, day: s.day, period: s.period, teacher_id: s.teacherId });
};

export const deleteScheduleItem = async (id: string) => {
    const cur = getSchedules();
    localStorage.setItem('local_schedules', JSON.stringify(cur.filter(s => s.id !== id)));
    await supabase.from('schedules').delete().eq('id', id);
};

export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => JSON.parse(localStorage.getItem(`local_assignments_map_${tid || 'global'}`) || '[]');

export const addTeacherAssignment = (a: TeacherAssignment) => { const cur = getTeacherAssignments(a.teacherId); localStorage.setItem(`local_assignments_map_${a.teacherId || 'global'}`, JSON.stringify([...cur, a])); };

export const deleteTeacherAssignment = (id: string) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_assignments_map_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((a: TeacherAssignment) => a.id !== id))); }); };

export const getTeacherPeriodTimings = (tid: string): string[] => JSON.parse(localStorage.getItem(`${KEYS.PERIOD_TIMINGS}_${tid}`) || '["07:00-07:45", "07:45-08:30"]');

export const saveTeacherPeriodTimings = (tid: string, t: string[]) => localStorage.setItem(`${KEYS.PERIOD_TIMINGS}_${tid}`, JSON.stringify(t));

export const getAISettings = () => ({ modelId: 'gemini-3-flash-preview', temperature: 0.7, systemInstruction: 'أنت مساعد تعليمي.' });

export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem(KEYS.USER_THEME) || '{"mode":"LIGHT","backgroundStyle":"FLAT"}');

export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));

export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';

export const saveWorksMasterUrl = (u: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, u);

export const getTasks = (tid?: string): Task[] => JSON.parse(localStorage.getItem(`local_tasks_${tid || 'global'}`) || '[]');

export const saveTask = async (t: Task) => { const cur = getTasks(t.teacherId); localStorage.setItem(`local_tasks_${t.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==t.id), t])); await supabase.from('tasks').upsert({ ...t, teacher_id: t.teacherId, class_id: t.classId, due_date: t.dueDate, max_score: t.maxScore }); };

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => JSON.parse(localStorage.getItem(`local_behavior_${tid || 'global'}`) || '[]');

export const saveBehaviorIncident = async (i: BehaviorIncident) => {
    const cur = getBehaviorIncidents(i.teacherId);
    localStorage.setItem(`local_behavior_${i.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==i.id), i]));
    await supabase.from('behavior_incidents').upsert({ ...i, student_id: i.studentId, teacher_id: i.teacherId, action_taken: i.actionTaken });
};

export const fetchBehaviorIncidents = async (tid?: string): Promise<BehaviorIncident[]> => {
    try {
        let query = supabase.from('behavior_incidents').select('*');
        if (tid) query = query.eq('teacher_id', tid);
        const { data } = await query;
        const mapped = (data || []).map((d: any) => ({ ...d, studentId: d.student_id, teacherId: d.teacher_id, actionTaken: d.action_taken })) as BehaviorIncident[];
        localStorage.setItem(`local_behavior_${tid || 'global'}`, JSON.stringify(mapped));
        return mapped;
    } catch { return getBehaviorIncidents(tid); }
};

export const getChallenges = (tid?: string): WeeklyChallenge[] => JSON.parse(localStorage.getItem(`local_challenges_${tid || 'global'}`) || '[]');

export const saveChallenge = async (c: WeeklyChallenge, tid: string) => {
    const cur = getChallenges(tid);
    localStorage.setItem(`local_challenges_${tid}`, JSON.stringify([...cur.filter(x=>x.id!==c.id), c]));
    await supabase.from('weekly_challenges').upsert({ ...c, reward_xp: c.rewardXp, start_date: c.startDate, end_date: c.endDate, target_class: c.targetClass, is_active: c.isActive });
};

export const fetchChallenges = async (tid?: string): Promise<WeeklyChallenge[]> => {
    try {
        const { data } = await supabase.from('weekly_challenges').select('*');
        const mapped = (data || []).map((d: any) => ({ ...d, rewardXp: d.reward_xp, startDate: d.start_date, endDate: d.end_date, targetClass: d.target_class, isActive: d.is_active })) as WeeklyChallenge[];
        localStorage.setItem(`local_challenges_${tid || 'global'}`, JSON.stringify(mapped));
        return mapped;
    } catch { return getChallenges(tid); }
};

export const deleteChallenge = async (id: string, tid: string) => {
    const cur = getChallenges(tid);
    localStorage.setItem(`local_challenges_${tid}`, JSON.stringify(cur.filter(c => c.id !== id)));
    await supabase.from('weekly_challenges').delete().eq('id', id);
};

export const getPurchaseRequests = (tid?: string): PurchaseRequest[] => JSON.parse(localStorage.getItem(`local_purchase_reqs_${tid || 'global'}`) || '[]');

export const savePurchaseRequest = async (r: PurchaseRequest) => { const cur = getPurchaseRequests(r.teacherId); localStorage.setItem(`local_purchase_reqs_${r.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==r.id), r])); await supabase.from('purchase_requests').upsert({ ...r, student_id: r.studentId, student_name: r.studentName, reward_id: r.rewardId, reward_title: r.rewardTitle, teacher_id: r.teacherId }); };

export const updatePurchaseStatus = async (id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_purchase_reqs_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); const updated = cur.map((r: PurchaseRequest) => r.id === id ? { ...r, status } : r); localStorage.setItem(k, JSON.stringify(updated)); }); await supabase.from('purchase_requests').update({ status }).eq('id', id); };

export const getMessages = (tid?: string): MessageLog[] => JSON.parse(localStorage.getItem(`local_messages_${tid || 'global'}`) || '[]');

export const saveMessage = async (m: MessageLog) => {
    const cur = getMessages(m.teacherId);
    localStorage.setItem(`local_messages_${m.teacherId || 'global'}`, JSON.stringify([...cur.filter(x=>x.id!==m.id), m]));
    await supabase.from('messages').upsert({ ...m, student_id: m.studentId, student_name: m.studentName, parent_phone: m.parentPhone, teacher_id: m.teacherId, sent_by: m.sentBy });
};

export const fetchMessages = async (tid?: string): Promise<MessageLog[]> => {
    try {
        let query = supabase.from('messages').select('*');
        if (tid) query = query.eq('teacher_id', tid);
        const { data } = await query;
        const mapped = (data || []).map((d: any) => ({ ...d, studentId: d.student_id, studentName: d.student_name, parentPhone: d.parent_phone, teacherId: d.teacher_id, sentBy: d.sent_by })) as MessageLog[];
        localStorage.setItem(`local_messages_${tid || 'global'}`, JSON.stringify(mapped));
        return mapped;
    } catch { return getMessages(tid); }
};

export const getAssignments = (cat: string, tid?: string, isManager?: boolean): Assignment[] => {
    const all = JSON.parse(localStorage.getItem(`local_assignments_${tid || 'global'}`) || '[]');
    if (cat === 'ALL') return all;
    return all.filter((a: Assignment) => a.category === cat);
};

export const fetchAssignments = async (tid?: string): Promise<Assignment[]> => {
    try {
        let query = supabase.from('assignments').select('*');
        if (tid) query = query.eq('teacher_id', tid);
        const { data } = await query;
        const mapped = (data || []).map((d: any) => ({ ...d, maxScore: d.max_score, isVisible: d.is_visible, teacherId: d.teacher_id, termId: d.term_id, periodId: d.period_id, sortOrder: d.sort_order })) as Assignment[];
        localStorage.setItem(`local_assignments_${tid || 'global'}`, JSON.stringify(mapped));
        return mapped;
    } catch { return getAssignments('ALL', tid); }
};

export const saveAssignment = async (a: Assignment) => {
    const cur = getAssignments('ALL', a.teacherId);
    localStorage.setItem(`local_assignments_${a.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==a.id), a]));
    await supabase.from('assignments').upsert({ id: a.id, title: a.title, category: a.category, max_score: a.maxScore, is_visible: a.isVisible, teacher_id: a.teacherId, term_id: a.termId, period_id: a.periodId, sort_order: a.sortOrder, url: a.url });
};

export const deleteAssignment = async (id: string, tid?: string) => {
    const cur = getAssignments('ALL', tid);
    localStorage.setItem(`local_assignments_${tid || 'global'}`, JSON.stringify(cur.filter((a: Assignment) => a.id !== id)));
    await supabase.from('assignments').delete().eq('id', id);
};

export const getTrackingSheets = (tid?: string): TrackingSheet[] => JSON.parse(localStorage.getItem(`local_tracking_${tid || 'global'}`) || '[]');

export const fetchTrackingSheets = async (tid?: string): Promise<TrackingSheet[]> => {
    try {
        let query = supabase.from('tracking_sheets').select('*');
        if (tid) query = query.eq('teacher_id', tid);
        const { data } = await query;
        const mapped = (data || []).map((d: any) => ({ ...d, className: d.class_name, teacherId: d.teacher_id, createdAt: d.created_at })) as TrackingSheet[];
        localStorage.setItem(`local_tracking_${tid || 'global'}`, JSON.stringify(mapped));
        return mapped;
    } catch { return getTrackingSheets(tid); }
};

export const saveTrackingSheet = async (s: TrackingSheet) => {
    const cur = getTrackingSheets(s.teacherId);
    localStorage.setItem(`local_tracking_${s.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==s.id), s]));
    await supabase.from('tracking_sheets').upsert({ id: s.id, title: s.title, subject: s.subject, class_name: s.className, teacher_id: s.teacherId, columns: s.columns, scores: s.scores });
};

export const deleteTrackingSheet = async (id: string) => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('local_tracking_'));
    keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((s: TrackingSheet) => s.id !== id))); });
    await supabase.from('tracking_sheets').delete().eq('id', id);
};

export const getWeeklyPlans = (tid?: string): WeeklyPlanItem[] => JSON.parse(localStorage.getItem(`local_weekly_plans_${tid || 'global'}`) || '[]');

export const fetchWeeklyPlans = async (tid?: string): Promise<WeeklyPlanItem[]> => {
    try {
        let query = supabase.from('weekly_plans').select('*');
        if (tid) query = query.eq('teacher_id', tid);
        const { data } = await query;
        const mapped = (data || []).map((d: any) => ({ ...d, teacherId: d.teacher_id, classId: d.class_id, subjectName: d.subject_name, weekStartDate: d.week_start_date, lessonTopic: d.lesson_topic, gradeLevel: d.grade_level })) as WeeklyPlanItem[];
        localStorage.setItem(`local_weekly_plans_${tid || 'global'}`, JSON.stringify(mapped));
        return mapped;
    } catch { return getWeeklyPlans(tid); }
};

export const saveWeeklyPlanItem = async (p: WeeklyPlanItem) => {
    const cur = getWeeklyPlans(p.teacherId);
    localStorage.setItem(`local_weekly_plans_${p.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==p.id), p]));
    await supabase.from('weekly_plans').upsert({ id: p.id, teacher_id: p.teacherId, class_id: p.classId, subject_name: p.subjectName, day: p.day, period: p.period, week_start_date: p.weekStartDate, lesson_topic: p.lessonTopic, homework: p.homework, grade_level: p.gradeLevel });
};

export const getLessonLinks = (): LessonLink[] => JSON.parse(localStorage.getItem('local_lesson_links') || '[]');

export const fetchLessonLinks = async (tid?: string): Promise<LessonLink[]> => {
    try {
        let query = supabase.from('lesson_links').select('*');
        if (tid) query = query.eq('teacher_id', tid);
        const { data } = await query;
        const mapped = (data || []).map((d: any) => ({ ...d, teacherId: d.teacher_id, createdAt: d.created_at, gradeLevel: d.grade_level, className: d.class_name })) as LessonLink[];
        localStorage.setItem('local_lesson_links', JSON.stringify(mapped));
        return mapped;
    } catch { return getLessonLinks(); }
};

export const saveLessonLink = async (l: LessonLink) => {
    const all = getLessonLinks();
    localStorage.setItem('local_lesson_links', JSON.stringify([...all.filter(x=>x.id!==l.id), l]));
    await supabase.from('lesson_links').upsert({ id: l.id, title: l.title, url: l.url, teacher_id: l.teacherId, grade_level: l.gradeLevel, class_name: l.className });
};

export const deleteLessonLink = async (id: string) => {
    const all = getLessonLinks();
    localStorage.setItem('local_lesson_links', JSON.stringify(all.filter(l => l.id !== id)));
    await supabase.from('lesson_links').delete().eq('id', id);
};

export const getCustomTables = (tid?: string): CustomTable[] => JSON.parse(localStorage.getItem(`local_custom_tables_${tid || 'global'}`) || '[]');
export const addCustomTable = async (t: CustomTable) => {
    const cur = getCustomTables(t.teacherId);
    localStorage.setItem(`local_custom_tables_${t.teacherId || 'global'}`, JSON.stringify([...cur.filter((x: CustomTable) => x.id !== t.id), t]));
    await supabase.from('custom_tables').upsert({ ...t, teacher_id: t.teacherId, created_at: t.createdAt, last_updated: t.lastUpdated });
};
export const deleteCustomTable = async (id: string) => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('local_custom_tables_'));
    keys.forEach(k => {
        const cur: CustomTable[] = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(cur.filter((t: CustomTable) => t.id !== id)));
    });
    await supabase.from('custom_tables').delete().eq('id', id);
};

export const getRewards = (tid?: string): Reward[] => JSON.parse(localStorage.getItem(`local_rewards_${tid || 'global'}`) || '[]');
export const saveReward = async (r: Reward, tid: string) => {
    const cur = getRewards(tid);
    localStorage.setItem(`local_rewards_${tid}`, JSON.stringify([...cur.filter((x: Reward) => x.id !== r.id), r]));
    await supabase.from('rewards').upsert({ ...r, teacher_id: tid });
};
export const deleteReward = async (id: string, tid: string) => {
    const cur = getRewards(tid);
    localStorage.setItem(`local_rewards_${tid}`, JSON.stringify(cur.filter((r: Reward) => r.id !== id)));
    await supabase.from('rewards').delete().eq('id', id);
};

export const getExams = (tid?: string): Exam[] => JSON.parse(localStorage.getItem(`local_exams_${tid || 'global'}`) || '[]');
export const saveExam = async (e: Exam) => {
    const cur = getExams(e.teacherId);
    localStorage.setItem(`local_exams_${e.teacherId || 'global'}`, JSON.stringify([...cur.filter((x: Exam) => x.id !== e.id), e]));
    await supabase.from('exams').upsert({ ...e, teacher_id: e.teacherId, created_at: e.createdAt, is_active: e.isActive, duration_minutes: e.durationMinutes });
};
export const deleteExam = async (id: string) => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('local_exams_'));
    keys.forEach(k => {
        const cur: Exam[] = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(cur.filter((e: Exam) => e.id !== id)));
    });
    await supabase.from('exams').delete().eq('id', id);
};

export const getQuestionBank = (tid?: string): Question[] => JSON.parse(localStorage.getItem(`local_questions_${tid || 'global'}`) || '[]');
export const saveQuestionToBank = async (q: Question) => {
    const cur = getQuestionBank(q.teacherId);
    localStorage.setItem(`local_questions_${q.teacherId || 'global'}`, JSON.stringify([...cur.filter((x: Question) => x.id !== q.id), q]));
};
export const deleteQuestionFromBank = async (id: string) => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('local_questions_'));
    keys.forEach(k => {
        const cur: Question[] = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(cur.filter((q: Question) => q.id !== id)));
    });
};

export const getExamResults = (examId?: string): ExamResult[] => {
    const all: ExamResult[] = JSON.parse(localStorage.getItem('local_exam_results') || '[]');
    return examId ? all.filter((r: ExamResult) => r.examId === examId) : all;
};
export const saveExamResult = async (r: ExamResult) => {
    const all = getExamResults();
    localStorage.setItem('local_exam_results', JSON.stringify([...all.filter((x: ExamResult) => x.id !== r.id), r]));
    await supabase.from('exam_results').upsert({ ...r, exam_id: r.examId, student_id: r.studentId, total_score: r.totalScore });
};
export const deleteExamResult = async (id: string) => {
    const all = getExamResults();
    localStorage.setItem('local_exam_results', JSON.stringify(all.filter((r: ExamResult) => r.id !== id)));
    await supabase.from('exam_results').delete().eq('id', id);
};

export const getRemedialPlans = (tid?: string): RemedialPlan[] => JSON.parse(localStorage.getItem(`local_remedial_${tid || 'global'}`) || '[]');
export const saveRemedialPlan = async (p: RemedialPlan) => {
    const cur = getRemedialPlans(p.teacherId);
    localStorage.setItem(`local_remedial_${p.teacherId || 'global'}`, JSON.stringify([...cur.filter((x: RemedialPlan) => x.id !== p.id), p]));
    await supabase.from('remedial_plans').upsert({ ...p, student_id: p.studentId, teacher_id: p.teacherId });
};

export const getEnvironmentRecords = (classId: string): EnvironmentRecord[] => {
    const all: EnvironmentRecord[] = JSON.parse(localStorage.getItem('local_environment') || '[]');
    return all.filter((r: EnvironmentRecord) => r.classId === classId);
};
export const saveEnvironmentRecord = async (r: EnvironmentRecord) => {
    const all: EnvironmentRecord[] = JSON.parse(localStorage.getItem('local_environment') || '[]');
    localStorage.setItem('local_environment', JSON.stringify([...all.filter((x: EnvironmentRecord) => x.id !== r.id), r]));
    await supabase.from('environment_records').upsert({ ...r, teacher_id: r.teacherId, class_id: r.classId, noise_level: r.noiseLevel });
};

export const getLessonPlans = (tid?: string): StoredLessonPlan[] => JSON.parse(localStorage.getItem(`local_lesson_plans_${tid || 'global'}`) || '[]');
export const saveLessonPlan = async (p: StoredLessonPlan) => {
    const cur = getLessonPlans(p.teacherId);
    localStorage.setItem(`local_lesson_plans_${p.teacherId || 'global'}`, JSON.stringify([...cur.filter((x: StoredLessonPlan) => x.id !== p.id), p]));
    await supabase.from('lesson_plans').upsert({ ...p, teacher_id: p.teacherId, content_json: p.contentJson, created_at: p.createdAt });
};

export const deleteLessonPlan = async (id: string) => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('local_lesson_plans_'));
    keys.forEach(k => {
        const cur: StoredLessonPlan[] = JSON.parse(localStorage.getItem(k) || '[]');
        // Fix: Use localStorage.setItem instead of non-existent setLocalStorage and avoid double prefixing
        localStorage.setItem(k, JSON.stringify(cur.filter((p: StoredLessonPlan) => p.id !== id)));
    });
    await supabase.from('lesson_plans').delete().eq('id', id);
};

export const getCurriculumUnits = (tid?: string): CurriculumUnit[] => JSON.parse(localStorage.getItem(`local_curriculum_units_${tid || 'global'}`) || '[]');
export const saveCurriculumUnit = async (u: CurriculumUnit) => {
    const cur = getCurriculumUnits(u.teacherId);
    localStorage.setItem(`local_curriculum_units_${u.teacherId || 'global'}`, JSON.stringify([...cur.filter((x: CurriculumUnit) => x.id !== u.id), u]));
    await supabase.from('curriculum_units').upsert({ ...u, teacher_id: u.teacherId, grade_level: u.gradeLevel, order_index: u.orderIndex });
};
export const deleteCurriculumUnit = async (id: string) => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('local_curriculum_units_'));
    keys.forEach(k => {
        const cur: CurriculumUnit[] = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(cur.filter((u: CurriculumUnit) => u.id !== id)));
    });
    await supabase.from('curriculum_units').delete().eq('id', id);
};

export const getCurriculumLessons = (unitId: string): CurriculumLesson[] => {
    const all: CurriculumLesson[] = JSON.parse(localStorage.getItem('local_curriculum_lessons') || '[]');
    return all.filter((l: CurriculumLesson) => l.unitId === unitId);
};
export const saveCurriculumLesson = async (l: CurriculumLesson) => {
    const all: CurriculumLesson[] = JSON.parse(localStorage.getItem('local_curriculum_lessons') || '[]');
    localStorage.setItem('local_curriculum_lessons', JSON.stringify([...all.filter((x: CurriculumLesson) => x.id !== l.id), l]));
    await supabase.from('curriculum_lessons').upsert({ ...l, unit_id: l.unitId, order_index: l.orderIndex, is_completed: l.isCompleted, completed_at: l.completedAt });
};
export const deleteCurriculumLesson = async (id: string) => {
    const all = JSON.parse(localStorage.getItem('local_curriculum_lessons') || '[]');
    localStorage.setItem('local_curriculum_lessons', JSON.stringify(all.filter((l: CurriculumLesson) => l.id !== id)));
    await supabase.from('curriculum_lessons').delete().eq('id', id);
};
export const toggleCurriculumLesson = async (id: string, completed: boolean) => {
    const all: CurriculumLesson[] = JSON.parse(localStorage.getItem('local_curriculum_lessons') || '[]');
    const updated = all.map((l: CurriculumLesson) => l.id === id ? { ...l, isCompleted: completed, completedAt: completed ? new Date().toISOString() : null } : l);
    localStorage.setItem('local_curriculum_lessons', JSON.stringify(updated));
    await supabase.from('curriculum_lessons').update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null }).eq('id', id);
};

export const getFormsDetailedResults = (tid?: string): FormsDetailedResult[] => JSON.parse(localStorage.getItem(`local_forms_results_${tid || 'global'}`) || '[]');
export const saveFormsDetailedResult = async (r: FormsDetailedResult) => {
    const cur = getFormsDetailedResults(r.teacherId);
    localStorage.setItem(`local_forms_results_${r.teacherId || 'global'}`, JSON.stringify([...cur.filter((x: FormsDetailedResult) => x.id !== r.id), r]));
};
export const deleteFormsDetailedResult = async (id: string) => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('local_forms_results_'));
    keys.forEach(k => {
        const cur = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(cur.filter((r: FormsDetailedResult) => r.id !== id)));
    });
};

export const downloadFromSupabase = async (tid?: string) => { 
    await Promise.all([
        fetchStudents(), fetchAttendance(tid), fetchPerformance(tid), fetchSchools(), fetchSystemUsers(), fetchTeachers(),
        fetchAcademicTerms(tid), fetchAssignments(tid), fetchTrackingSheets(tid), fetchWeeklyPlans(tid),
        fetchLessonLinks(tid), fetchChallenges(tid), fetchMessages(tid), fetchBehaviorIncidents(tid),
        fetchSchedules(tid)
    ]); 
};
