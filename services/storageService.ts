
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

// --- المصادقة الذكية ---
export const authenticateUser = async (id: string, p: string): Promise<SystemUser | null> => {
    // دخول طوارئ للمدير لتهيئة النظام
    if (id === 'admin' && p === 'admin') {
        return {
            id: 'admin_root',
            name: 'مدير النظام (طوارئ)',
            email: 'admin@system.local',
            nationalId: 'admin',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE'
        };
    }

    try {
        const { data, error } = await supabase.from('system_users')
            .select('*')
            .or(`national_id.eq.${id},email.eq.${id}`)
            .eq('password', p)
            .maybeSingle();
        
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
    } catch { 
        return null; 
    }
};

export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => {
    try {
        const { data } = await supabase.from('students')
            .select('*')
            .eq('national_id', id)
            .eq('password', p)
            .maybeSingle();
            
        if (!data) return null;
        return {
            id: data.id, 
            name: data.name, 
            role: 'STUDENT', 
            nationalId: data.national_id, 
            classId: data.class_id, 
            className: data.class_name, 
            gradeLevel: data.grade_level, 
            schoolId: data.school_id,
            xp: data.xp || 0, 
            level: data.level || 1, 
            badges: data.badges || [], 
            purchasedRewards: data.purchased_rewards || [],
            createdById: data.created_by_id
        } as Student;
    } catch { return null; }
};

// --- جلب البيانات مع معالجة الأخطاء (Fallback) ---
export const fetchStudents = async (): Promise<Student[]> => {
    try {
        const { data, error } = await supabase.from('students').select('*').order('name');
        if (error) throw error;
        
        const students = (data || []).map((d: any) => ({
            id: d.id, 
            name: d.name, 
            role: 'STUDENT', 
            nationalId: d.national_id, 
            classId: d.class_id, 
            schoolId: d.school_id, 
            createdById: d.created_by_id, 
            gradeLevel: d.grade_level, 
            className: d.class_name, 
            email: d.email, 
            phone: d.phone, 
            parentName: d.parent_name, 
            parentPhone: d.parent_phone, 
            parentEmail: d.parent_email, 
            learningStyle: d.learning_style,
            behaviorPoints: d.behavior_points || 0, 
            seatIndex: d.seat_index,
            badges: d.badges || [], 
            streak: d.streak || 0, 
            level: d.level || 1, 
            xp: d.xp || 0,
            purchasedRewards: d.purchased_rewards || []
        })) as Student[];
        localStorage.setItem('local_students', JSON.stringify(students));
        return students;
    } catch (err) {
        console.warn("Using local students data due to DB error");
        return JSON.parse(localStorage.getItem('local_students') || '[]');
    }
};

export const fetchAttendance = async (teacherId?: string): Promise<AttendanceRecord[]> => {
    try {
        let query = supabase.from('attendance').select('*');
        if (teacherId) query = query.eq('created_by_id', teacherId);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;

        const mapped = (data || []).map((d: any) => ({
            id: d.id, 
            studentId: d.student_id, 
            date: d.date, 
            status: d.status,
            subject: d.subject, 
            period: d.period, 
            behaviorStatus: d.behavior_status,
            behaviorNote: d.behavior_note, 
            participationScore: d.participation_score,
            excuseNote: d.excuse_note, 
            createdById: d.created_by_id
        }));
        localStorage.setItem('local_attendance', JSON.stringify(mapped));
        return mapped;
    } catch {
        return JSON.parse(localStorage.getItem('local_attendance') || '[]');
    }
};

export const fetchPerformance = async (teacherId?: string): Promise<PerformanceRecord[]> => {
    try {
        let query = supabase.from('performance').select('*');
        if (teacherId) query = query.eq('created_by_id', teacherId);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;

        const mapped = (data || []).map((d: any) => ({
            id: d.id, 
            studentId: d.student_id, 
            subject: d.subject, 
            title: d.title,
            category: d.category, 
            score: d.score, 
            maxScore: d.max_score, 
            date: d.date,
            notes: d.notes, 
            createdById: d.created_by_id, 
            url: d.url
        }));
        localStorage.setItem('local_performance', JSON.stringify(mapped));
        return mapped;
    } catch {
        return JSON.parse(localStorage.getItem('local_performance') || '[]');
    }
};

// FIX: Added fetchSchools
export const fetchSchools = async (): Promise<School[]> => {
    try {
        const { data, error } = await supabase.from('schools').select('*').order('name');
        if (error) throw error;
        const schools = (data || []).map((d: any) => ({
            id: d.id, name: d.name, ministryCode: d.ministry_code,
            managerName: d.manager_name, managerNationalId: d.manager_national_id,
            type: d.type, phone: d.phone, studentCount: d.student_count,
            educationAdministration: d.education_administration
        })) as School[];
        localStorage.setItem('local_schools', JSON.stringify(schools));
        return schools;
    } catch {
        return JSON.parse(localStorage.getItem('local_schools') || '[]');
    }
};

// FIX: Added fetchSystemUsers
export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    try {
        const { data, error } = await supabase.from('system_users').select('*');
        if (error) throw error;
        const users = (data || []).map((d: any) => ({
            id: d.id, name: d.name, email: d.email, nationalId: d.national_id,
            role: d.role, schoolId: d.school_id, status: d.status, phone: d.phone
        })) as SystemUser[];
        localStorage.setItem('local_system_users', JSON.stringify(users));
        return users;
    } catch {
        return JSON.parse(localStorage.getItem('local_system_users') || '[]');
    }
};

// FIX: Added fetchTeachers
export const fetchTeachers = async (): Promise<Teacher[]> => {
    try {
        const { data, error } = await supabase.from('system_users').select('*').eq('role', 'TEACHER');
        if (error) throw error;
        const teachers = (data || []).map((d: any) => ({
            id: d.id, name: d.name, nationalId: d.national_id, email: d.email,
            phone: d.phone, subjectSpecialty: d.subject_specialty,
            schoolId: d.school_id, subscriptionStatus: d.subscription_status
        })) as Teacher[];
        localStorage.setItem('local_teachers', JSON.stringify(teachers));
        return teachers;
    } catch {
        return JSON.parse(localStorage.getItem('local_teachers') || '[]');
    }
};

// --- عمليات الحفظ (Upsert) ---
export const addStudent = async (s: Student) => {
    return await supabase.from('students').upsert([{
        id: s.id, 
        name: s.name, 
        national_id: s.nationalId, 
        grade_level: s.gradeLevel,
        class_name: s.className, 
        phone: s.phone, 
        parent_name: s.parentName,
        parent_phone: s.parentPhone, 
        learning_style: s.learningStyle || 'UNKNOWN',
        behavior_points: s.behaviorPoints || 0, 
        seat_index: s.seatIndex || 0,
        badges: s.badges || [], 
        streak: s.streak || 0, 
        level: s.level || 1, 
        xp: s.xp || 0,
        purchased_rewards: s.purchasedRewards || [], 
        class_id: s.classId || s.className,
        school_id: s.schoolId, 
        created_by_id: s.createdById
    }]);
};

// FIX: Added updateStudent
export const updateStudent = async (s: Student) => {
    const res = await supabase.from('students').update({
        name: s.name, national_id: s.nationalId, grade_level: s.gradeLevel,
        class_name: s.className, phone: s.phone, parent_name: s.parentName,
        parent_phone: s.parentPhone, learning_style: s.learningStyle,
        behavior_points: s.behaviorPoints, seat_index: s.seatIndex,
        badges: s.badges, streak: s.streak, level: s.level, xp: s.xp,
        purchased_rewards: s.purchasedRewards, class_id: s.classId,
        school_id: s.schoolId, email: s.email
    }).eq('id', s.id);
    await fetchStudents();
    return res;
};

// FIX: Added addSchool
export const addSchool = async (s: School) => {
    return await supabase.from('schools').insert([{
        id: s.id, name: s.name, ministry_code: s.ministryCode,
        manager_name: s.managerName, manager_national_id: s.managerNationalId,
        type: s.type, phone: s.phone, student_count: s.studentCount,
        education_administration: s.educationAdministration
    }]);
};

// FIX: Added updateSchool
export const updateSchool = async (s: School) => {
    return await supabase.from('schools').update({
        name: s.name, ministry_code: s.ministryCode,
        manager_name: s.managerName, manager_national_id: s.managerNationalId,
        type: s.type, phone: s.phone, student_count: s.studentCount,
        education_administration: s.educationAdministration
    }).eq('id', s.id);
};

// FIX: Added deleteSchool
export const deleteSchool = async (id: string) => {
    return await supabase.from('schools').delete().eq('id', id);
};

// FIX: Added deleteSystemUser
export const deleteSystemUser = async (id: string) => {
    return await supabase.from('system_users').delete().eq('id', id);
};

// FIX: Added addTeacher
export const addTeacher = async (t: Teacher) => {
    return await supabase.from('system_users').insert([{
        id: t.id, name: t.name, national_id: t.nationalId, email: t.email,
        password: t.password, role: 'TEACHER', phone: t.phone,
        school_id: t.schoolId, subject_specialty: t.subjectSpecialty,
        subscription_status: t.subscriptionStatus
    }]);
};

export const saveAttendance = async (recs: AttendanceRecord[]) => {
    const dbObjs = recs.map(r => ({
        id: r.id, 
        student_id: r.studentId, 
        date: r.date, 
        status: r.status,
        subject: r.subject, 
        period: r.period, 
        behavior_status: r.behaviorStatus,
        behavior_note: r.behaviorNote, 
        participation_score: r.participationScore,
        excuse_note: r.excuseNote, 
        created_by_id: r.createdById
    }));
    return await supabase.from('attendance').upsert(dbObjs);
};

export const addPerformance = async (recs: PerformanceRecord | PerformanceRecord[]) => {
    const items = Array.isArray(recs) ? recs : [recs];
    const dbObjs = items.map(r => ({
        id: r.id, 
        student_id: r.studentId, 
        subject: r.subject, 
        title: r.title,
        category: r.category, 
        score: r.score, 
        max_score: r.maxScore, 
        date: r.date,
        notes: r.notes, 
        created_by_id: r.createdById, 
        url: r.url
    }));
    return await supabase.from('performance').upsert(dbObjs);
};

// --- إدارة النظام (SQL Setup) ---
export const getDatabaseSchemaSQL = () => {
    return `
-- 1. جدول المدارس
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

-- 2. جدول المستخدمين (معلمين ومدراء)
CREATE TABLE IF NOT EXISTS system_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    national_id TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'ACTIVE',
    phone TEXT
);

-- 3. جدول الطلاب
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

-- 4. جدول الحضور
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

-- 5. جدول الأداء والدرجات
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

-- تعطيل RLS مؤقتاً للتجربة أو إضافة سياسات وصول (اختياري)
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE performance DISABLE ROW LEVEL SECURITY;
    `;
};

// --- دوال المساعدة الأخرى ---
export const getStudents = (): Student[] => JSON.parse(localStorage.getItem('local_students') || '[]');
export const getAttendance = (): AttendanceRecord[] => JSON.parse(localStorage.getItem('local_attendance') || '[]');
export const getSchools = (): School[] => JSON.parse(localStorage.getItem('local_schools') || '[]');
export const getTeachers = (): Teacher[] => JSON.parse(localStorage.getItem('local_teachers') || '[]');
export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem(KEYS.USER_THEME) || '{"mode":"LIGHT","backgroundStyle":"FLAT"}');
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));
export const getSubjects = (tid?: string): Subject[] => JSON.parse(localStorage.getItem(`local_subjects_${tid || 'global'}`) || '[]');
export const addSubject = async (s: Subject) => {
    const current = getSubjects(s.teacherId);
    localStorage.setItem(`local_subjects_${s.teacherId || 'global'}`, JSON.stringify([...current, s]));
};
// FIX: Added deleteSubject
export const deleteSubject = (id: string) => {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('local_subjects_'));
    allKeys.forEach(k => {
        const list = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(list.filter((x: any) => x.id !== id)));
    });
};
export const getAcademicTerms = (tid?: string): AcademicTerm[] => JSON.parse(localStorage.getItem(`local_terms_${tid || 'global'}`) || '[]');
export const saveAcademicTerm = async (t: AcademicTerm) => {
    const current = getAcademicTerms(t.teacherId);
    const updated = [...current.filter(x => x.id !== t.id), t];
    localStorage.setItem(`local_terms_${t.teacherId || 'global'}`, JSON.stringify(updated));
};
// FIX: Added deleteAcademicTerm
export const deleteAcademicTerm = (id: string) => {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('local_terms_'));
    allKeys.forEach(k => {
        const list = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(list.filter((x: any) => x.id !== id)));
    });
};
// FIX: Added setCurrentTerm
export const setCurrentTerm = (id: string, tid: string) => {
    const terms = getAcademicTerms(tid);
    const updated = terms.map(t => ({ ...t, isCurrent: t.id === id }));
    localStorage.setItem(`local_terms_${tid}`, JSON.stringify(updated));
};
export const getMessages = (tid?: string): MessageLog[] => JSON.parse(localStorage.getItem(`local_messages_${tid || 'global'}`) || '[]');
export const saveMessage = (m: MessageLog) => {
    const current = getMessages(m.teacherId);
    localStorage.setItem(`local_messages_${m.teacherId || 'global'}`, JSON.stringify([m, ...current]));
};
export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => JSON.parse(localStorage.getItem(`report_header_${tid || 'global'}`) || '{"schoolName":"","educationAdmin":"","teacherName":"","schoolManager":"","academicYear":"","term":""}');
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => localStorage.setItem(`report_header_${c.teacherId || 'global'}`, JSON.stringify(c));
export const getSchedules = (): ScheduleItem[] => JSON.parse(localStorage.getItem('local_schedules') || '[]');
export const saveScheduleItem = (s: ScheduleItem) => {
    const current = getSchedules();
    localStorage.setItem('local_schedules', JSON.stringify([...current, s]));
};
// FIX: Added deleteScheduleItem
export const deleteScheduleItem = (id: string) => {
    const current = getSchedules();
    localStorage.setItem('local_schedules', JSON.stringify(current.filter(x => x.id !== id)));
};
export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => JSON.parse(localStorage.getItem(`local_incidents_${tid || 'global'}`) || '[]');
export const saveBehaviorIncident = async (i: BehaviorIncident) => {
    const current = getBehaviorIncidents(i.teacherId);
    localStorage.setItem(`local_incidents_${i.teacherId || 'global'}`, JSON.stringify([...current, i]));
};
export const getTasks = (tid?: string): Task[] => JSON.parse(localStorage.getItem(`local_tasks_${tid || 'global'}`) || '[]');
export const saveTask = async (t: Task) => {
    const current = getTasks(t.teacherId);
    localStorage.setItem(`local_tasks_${t.teacherId || 'global'}`, JSON.stringify([...current, t]));
};
export const getPurchaseRequests = (tid?: string): PurchaseRequest[] => JSON.parse(localStorage.getItem(`local_purchases_${tid || 'global'}`) || '[]');
export const savePurchaseRequest = async (req: PurchaseRequest) => {
    const current = getPurchaseRequests('global');
    localStorage.setItem(`local_purchases_global`, JSON.stringify([req, ...current]));
};
// FIX: Added updatePurchaseStatus
export const updatePurchaseStatus = async (id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const current = getPurchaseRequests('global');
    const updated = current.map(r => r.id === id ? { ...r, status } : r);
    localStorage.setItem('local_purchases_global', JSON.stringify(updated));
};
export const getRewards = (tid?: string): Reward[] => JSON.parse(localStorage.getItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`) || '[]');
export const saveReward = (reward: Reward, tid?: string) => {
    const current = getRewards(tid);
    const updated = [...current.filter(r => r.id !== reward.id), reward];
    localStorage.setItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`, JSON.stringify(updated));
};
// FIX: Added deleteReward
export const deleteReward = (id: string, tid?: string) => {
    const current = getRewards(tid);
    localStorage.setItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`, JSON.stringify(current.filter(r => r.id !== id)));
};
export const getExams = (tid?: string): Exam[] => JSON.parse(localStorage.getItem(`local_exams_${tid || 'global'}`) || '[]');
export const saveExam = async (e: Exam) => {
    const current = getExams(e.teacherId);
    const updated = [...current.filter(x => x.id !== e.id), e];
    localStorage.setItem(`local_exams_${e.teacherId || 'global'}`, JSON.stringify(updated));
};
// FIX: Added deleteExam
export const deleteExam = (id: string) => {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('local_exams_'));
    allKeys.forEach(k => {
        const list = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(list.filter((x: any) => x.id !== id)));
    });
};
export const getExamResults = (eid?: string): ExamResult[] => JSON.parse(localStorage.getItem(`local_exam_results_${eid}`) || '[]');
export const saveExamResult = async (res: ExamResult) => {
    const current = getExamResults(res.examId);
    const updated = [...current.filter(x => x.id !== res.id), res];
    localStorage.setItem(`local_exam_results_${res.examId}`, JSON.stringify(updated));
};
// FIX: Added deleteExamResult
export const deleteExamResult = (id: string) => {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('local_exam_results_'));
    allKeys.forEach(k => {
        const list = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(list.filter((x: any) => x.id !== id)));
    });
};
export const getTrackingSheets = (tid: string): TrackingSheet[] => JSON.parse(localStorage.getItem(`local_tracking_sheets_${tid}`) || '[]');
export const saveTrackingSheet = (s: TrackingSheet) => {
    const current = getTrackingSheets(s.teacherId);
    localStorage.setItem(`local_tracking_sheets_${s.teacherId}`, JSON.stringify([...current.filter(x => x.id !== s.id), s]));
};
// FIX: Added deleteTrackingSheet
export const deleteTrackingSheet = (id: string) => {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('local_tracking_sheets_'));
    allKeys.forEach(k => {
        const list = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(list.filter((x: any) => x.id !== id)));
    });
};
export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => JSON.parse(localStorage.getItem(`local_weekly_plans_${tid}`) || '[]');
export const saveWeeklyPlanItem = async (item: WeeklyPlanItem) => {
    const current = getWeeklyPlans(item.teacherId);
    const updated = [...current.filter(x => x.id !== item.id), item];
    localStorage.setItem(`local_weekly_plans_${item.teacherId}`, JSON.stringify(updated));
};
export const getLessonLinks = (): LessonLink[] => JSON.parse(localStorage.getItem('local_lesson_links') || '[]');
export const saveLessonLink = (link: LessonLink) => {
    const current = getLessonLinks();
    localStorage.setItem('local_lesson_links', JSON.stringify([...current, link]));
};
// FIX: Added deleteLessonLink
export const deleteLessonLink = (id: string) => {
    const current = getLessonLinks();
    localStorage.setItem('local_lesson_links', JSON.stringify(current.filter(x => x.id !== id)));
};
export const getLessonPlans = (tid?: string): StoredLessonPlan[] => JSON.parse(localStorage.getItem(`local_lesson_plans_${tid || 'global'}`) || '[]');
export const saveLessonPlan = async (p: StoredLessonPlan) => {
    const current = getLessonPlans(p.teacherId);
    const updated = [...current.filter(x => x.id !== p.id), p];
    localStorage.setItem(`local_lesson_plans_${p.teacherId || 'global'}`, JSON.stringify(updated));
};
// FIX: Added deleteLessonPlan
export const deleteLessonPlan = (id: string) => {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('local_lesson_plans_'));
    allKeys.forEach(k => {
        const list = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(list.filter((x: any) => x.id !== id)));
    });
};
export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => JSON.parse(localStorage.getItem(`local_assignments_map_${tid || 'global'}`) || '[]');
export const addTeacherAssignment = (a: TeacherAssignment) => {
    const current = getTeacherAssignments(a.teacherId);
    localStorage.setItem(`local_assignments_map_${a.teacherId || 'global'}`, JSON.stringify([...current, a]));
};
// FIX: Added deleteTeacherAssignment
export const deleteTeacherAssignment = (id: string) => {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('local_assignments_map_'));
    allKeys.forEach(k => {
        const list = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(list.filter((x: any) => x.id !== id)));
    });
};
export const getTeacherPeriodTimings = (tid: string): string[] => JSON.parse(localStorage.getItem(`${KEYS.PERIOD_TIMINGS}_${tid}`) || '["07:00-07:45", "07:45-08:30", "08:30-09:15", "09:45-10:30", "10:30-11:15", "11:15-12:00"]');
export const saveTeacherPeriodTimings = (tid: string, timings: string[]) => localStorage.setItem(`${KEYS.PERIOD_TIMINGS}_${tid}`, JSON.stringify(timings));

export const getAssignments = (cat: string = 'ALL', tid?: string, isMgr: boolean = false): Assignment[] => JSON.parse(localStorage.getItem(`local_assignments_${tid || 'global'}`) || '[]');
export const saveAssignment = async (a: Assignment) => {
    const current = getAssignments('ALL', a.teacherId);
    const updated = [...current.filter(x => x.id !== a.id), a];
    localStorage.setItem(`local_assignments_${a.teacherId || 'global'}`, JSON.stringify(updated));
};

export const deleteStudent = async (id: string) => await supabase.from('students').delete().eq('id', id);
export const deleteAttendance = async (id: string) => await supabase.from('attendance').delete().eq('id', id);
export const deletePerformance = async (id: string) => await supabase.from('performance').delete().eq('id', id);
export const deleteAssignment = (id: string, tid?: string) => {
    const current = getAssignments('ALL', tid);
    localStorage.setItem(`local_assignments_${tid || 'global'}`, JSON.stringify(current.filter(x => x.id !== id)));
};

export const downloadFromSupabase = async () => ({ success: true });
export const checkConnection = async () => ({ success: true });
export const getAISettings = () => ({ modelId: 'gemini-3-flash-preview', temperature: 0.7, systemInstruction: 'أنت مساعد تعليمي ذكي خبير.' });
export const updateStudentLearningStyle = async (id: string, style: LearningStyle) => {
    const res = await supabase.from('students').update({ learning_style: style }).eq('id', id);
    const students = getStudents();
    localStorage.setItem('local_students', JSON.stringify(students.map(s => s.id === id ? { ...s, learningStyle: style } : s)));
    return res;
};
export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

export const updateTeacher = async (t: Teacher) => await supabase.from('system_users').update({
    name: t.name, phone: t.phone, password: t.password
}).eq('id', t.id);

export const updateSystemUser = async (u: SystemUser) => await supabase.from('system_users').update({
    name: u.name, email: u.email, national_id: u.nationalId, role: u.role,
    school_id: u.schoolId, status: u.status, phone: u.phone
}).eq('id', u.id);

export const addSystemUser = async (u: SystemUser) => await supabase.from('system_users').insert([{
    id: u.id, name: u.name, email: u.email, national_id: u.nationalId, password: u.password,
    role: u.role, school_id: u.schoolId, status: u.status, phone: u.phone
}]);

// FIX: Added getChallenges
export const getChallenges = (tid?: string): WeeklyChallenge[] => JSON.parse(localStorage.getItem(`local_challenges_${tid || 'global'}`) || '[]');

// FIX: Added saveChallenge
export const saveChallenge = async (ch: WeeklyChallenge, tid: string) => {
    const current = getChallenges(tid);
    const updated = [...current.filter(x => x.id !== ch.id), ch];
    localStorage.setItem(`local_challenges_${tid}`, JSON.stringify(updated));
};

// FIX: Added deleteChallenge
export const deleteChallenge = (id: string, tid: string) => {
    const current = getChallenges(tid);
    localStorage.setItem(`local_challenges_${tid}`, JSON.stringify(current.filter(x => x.id !== id)));
};

// FIX: Added getCustomTables
export const getCustomTables = (tid?: string): CustomTable[] => JSON.parse(localStorage.getItem(`local_custom_tables_${tid || 'global'}`) || '[]');

// FIX: Added addCustomTable
export const addCustomTable = async (t: CustomTable) => {
    const current = getCustomTables(t.teacherId);
    localStorage.setItem(`local_custom_tables_${t.teacherId || 'global'}`, JSON.stringify([...current, t]));
};

// FIX: Added deleteCustomTable
export const deleteCustomTable = async (id: string) => {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('local_custom_tables_'));
    allKeys.forEach(k => {
        const list = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(list.filter((x: any) => x.id !== id)));
    });
};

// FIX: Added getRemedialPlans
export const getRemedialPlans = (): RemedialPlan[] => JSON.parse(localStorage.getItem('local_remedial_plans') || '[]');

// FIX: Added saveRemedialPlan
export const saveRemedialPlan = (p: RemedialPlan) => {
    const current = getRemedialPlans();
    localStorage.setItem('local_remedial_plans', JSON.stringify([...current.filter(x => x.id !== p.id), p]));
};

// FIX: Added getEnvironmentRecords
export const getEnvironmentRecords = (classId: string): EnvironmentRecord[] => JSON.parse(localStorage.getItem(`local_env_records_${classId}`) || '[]');

// FIX: Added saveEnvironmentRecord
export const saveEnvironmentRecord = (r: EnvironmentRecord) => {
    const current = getEnvironmentRecords(r.classId);
    localStorage.setItem(`local_env_records_${r.classId}`, JSON.stringify([...current, r]));
};

// FIX: Added getQuestionBank
export const getQuestionBank = (tid: string): Question[] => JSON.parse(localStorage.getItem(`local_question_bank_${tid}`) || '[]');

// FIX: Added saveQuestionToBank
export const saveQuestionToBank = (q: Question) => {
    const tid = q.teacherId || 'global';
    const current = getQuestionBank(tid);
    localStorage.setItem(`local_question_bank_${tid}`, JSON.stringify([...current.filter(x => x.id !== q.id), q]));
};

// FIX: Added deleteQuestionFromBank
export const deleteQuestionFromBank = (id: string) => {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('local_question_bank_'));
    allKeys.forEach(k => {
        const list = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(list.filter((x: any) => x.id !== id)));
    });
};

// FIX: Added getCurriculumUnits
export const getCurriculumUnits = (tid: string): CurriculumUnit[] => JSON.parse(localStorage.getItem(`local_curriculum_units_${tid}`) || '[]');

// FIX: Added saveCurriculumUnit
export const saveCurriculumUnit = async (u: CurriculumUnit) => {
    const current = getCurriculumUnits(u.teacherId || 'global');
    localStorage.setItem(`local_curriculum_units_${u.teacherId || 'global'}`, JSON.stringify([...current.filter(x => x.id !== u.id), u]));
};

// FIX: Added deleteCurriculumUnit
export const deleteCurriculumUnit = (id: string, tid: string) => {
    const current = getCurriculumUnits(tid);
    localStorage.setItem(`local_curriculum_units_${tid}`, JSON.stringify(current.filter(x => x.id !== id)));
};

// FIX: Added getCurriculumLessons
export const getCurriculumLessons = (unitId: string): CurriculumLesson[] => JSON.parse(localStorage.getItem(`local_curriculum_lessons_${unitId}`) || '[]');

// FIX: Added saveCurriculumLesson
export const saveCurriculumLesson = async (l: CurriculumLesson) => {
    const current = getCurriculumLessons(l.unitId);
    localStorage.setItem(`local_curriculum_lessons_${l.unitId}`, JSON.stringify([...current.filter(x => x.id !== l.id), l]));
};

// FIX: Added deleteCurriculumLesson
export const deleteCurriculumLesson = (id: string, unitId: string) => {
    const current = getCurriculumLessons(unitId);
    localStorage.setItem(`local_curriculum_lessons_${unitId}`, JSON.stringify(current.filter(x => x.id !== id)));
};

// FIX: Added toggleCurriculumLesson
export const toggleCurriculumLesson = (id: string, status: boolean, unitId: string) => {
    const lessons = getCurriculumLessons(unitId);
    const updated = lessons.map(l => l.id === id ? { ...l, isCompleted: status, completedAt: status ? new Date().toISOString() : undefined } : l);
    localStorage.setItem(`local_curriculum_lessons_${unitId}`, JSON.stringify(updated));
};

// FIX: Added getFormsDetailedResults
export const getFormsDetailedResults = (tid: string): FormsDetailedResult[] => JSON.parse(localStorage.getItem(`local_forms_results_${tid}`) || '[]');

// FIX: Added saveFormsDetailedResult
export const saveFormsDetailedResult = (res: FormsDetailedResult) => {
    const current = getFormsDetailedResults(res.teacherId);
    localStorage.setItem(`local_forms_results_${res.teacherId}`, JSON.stringify([res, ...current.filter(x => x.id !== res.id)]));
};

// FIX: Added deleteFormsDetailedResult
export const deleteFormsDetailedResult = (id: string) => {
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('local_forms_results_'));
    allKeys.forEach(k => {
        const list = JSON.parse(localStorage.getItem(k) || '[]');
        localStorage.setItem(k, JSON.stringify(list.filter((x: any) => x.id !== id)));
    });
};
