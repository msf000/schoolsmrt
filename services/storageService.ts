
import { 
    Student, AttendanceRecord, PerformanceRecord, Teacher, School, 
    SystemUser, Subject, ScheduleItem, TeacherAssignment, 
    AcademicTerm, WeeklyPlanItem, LessonLink, StoredLessonPlan,
    Exam, AISettings, ReportHeaderConfig, UserTheme, 
    CustomTable, EnvironmentRecord, LearningStyle, CurriculumUnit, 
    CurriculumLesson, Question, ExamResult, TrackingSheet, RemedialPlan,
    MessageLog, FormsDetailedResult, BehaviorIncident, Task, Assignment
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export const KEYS = {
    USER_THEME: 'user_theme',
    AI_SETTINGS: 'ai_settings',
    WORKS_MASTER_URL: 'works_master_url',
    REPORT_HEADER: 'report_header_config',
    PERIOD_TIMINGS: 'period_timings',
    CUSTOM_TABLES: 'custom_tables',
    SYSTEM_MODE: 'system_mode'
};

interface SessionCache {
    students: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    subjects: Subject[];
    schedules: ScheduleItem[];
    assignments: TeacherAssignment[];
    academicTerms: AcademicTerm[];
    tasks: Task[];
    behavior: BehaviorIncident[];
    exams: Exam[];
    examResults: ExamResult[];
    messages: MessageLog[];
    schools: School[];
    teachers: Teacher[];
    systemUsers: SystemUser[];
    customTables: CustomTable[];
    lessonPlans: StoredLessonPlan[];
    lessonLinks: LessonLink[];
    weeklyPlans: WeeklyPlanItem[];
    remedialPlans: RemedialPlan[];
    formsResults: FormsDetailedResult[];
    environmentRecords: EnvironmentRecord[];
    trackingSheets: TrackingSheet[];
    questionBank: Question[];
    curriculumUnits: CurriculumUnit[];
    curriculumLessons: CurriculumLesson[];
    actualAssignments: Assignment[];
}

const sessionCache: SessionCache = {
    students: [], attendance: [], performance: [], subjects: [], schedules: [], assignments: [],
    academicTerms: [], tasks: [], behavior: [], exams: [], examResults: [], messages: [],
    schools: [], teachers: [], systemUsers: [], customTables: [], lessonPlans: [],
    lessonLinks: [], weeklyPlans: [], remedialPlans: [], formsResults: [],
    environmentRecords: [], trackingSheets: [], questionBank: [], curriculumUnits: [],
    curriculumLessons: [], actualAssignments: []
};

// --- المصادقة والدخول ---

export const authenticateUser = async (id: string, p: string): Promise<SystemUser | null> => {
    // تجاوز فوري لبيانات المسؤول التجريبي لضمان الدخول دائماً
    if (id.trim().toLowerCase() === 'admin' && p === 'admin') {
        return { 
            id: 'super_admin_001', 
            name: 'مدير النظام (تجريبي)', 
            email: 'admin@system.local', 
            role: 'SUPER_ADMIN', 
            status: 'ACTIVE',
            isDemo: true 
        };
    }

    if (!isSupabaseConfigured()) {
        throw new Error("يرجى ربط قاعدة البيانات أو استخدام admin/admin.");
    }

    try {
        const { data, error } = await supabase.from('system_users')
            .select('*')
            .or(`national_id.eq.${id},email.eq.${id}`)
            .eq('password', p)
            .single();
        
        if (error || !data) return null;

        return {
            id: data.id,
            name: data.name,
            email: data.email,
            nationalId: data.national_id,
            role: data.role as any,
            schoolId: data.school_id,
            status: data.status as any
        };
    } catch (e) {
        return null;
    }
};

export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => {
    if (!isSupabaseConfigured()) return null;
    try {
        const { data } = await supabase.from('students').select('*').eq('national_id', id).eq('password', p).single();
        if (!data) return null;
        return {
            id: data.id, name: data.name, role: 'STUDENT', nationalId: data.national_id, 
            classId: data.class_id, className: data.class_name, gradeLevel: data.grade_level, schoolId: data.school_id
        };
    } catch { return null; }
};

// --- المزامنة والبيانات ---

export const fetchSchools = async () => {
    if (!isSupabaseConfigured()) return sessionCache.schools;
    const { data } = await supabase.from('schools').select('*').order('name');
    sessionCache.schools = (data || []).map((d: any) => ({
        id: d.id, name: d.name, ministryCode: d.ministry_code, managerName: d.manager_name,
        managerNationalId: d.manager_national_id, type: d.type, phone: d.phone,
        studentCount: d.student_count, educationAdministration: d.education_administration
    }));
    return sessionCache.schools;
};

export const fetchTeachers = async () => {
    if (!isSupabaseConfigured()) return sessionCache.teachers;
    const { data } = await supabase.from('teachers').select('*').order('name');
    sessionCache.teachers = (data || []).map((d: any) => ({
        id: d.id, name: d.name, nationalId: d.national_id, email: d.email, phone: d.phone,
        subjectSpecialty: d.subject_specialty, schoolId: d.school_id, managerId: d.manager_id,
        subscriptionStatus: d.subscription_status, subscriptionEndDate: d.subscription_end_date
    }));
    return sessionCache.teachers;
};

export const fetchSystemUsers = async () => {
    if (!isSupabaseConfigured()) return sessionCache.systemUsers;
    const { data } = await supabase.from('system_users').select('*').order('role');
    sessionCache.systemUsers = (data || []).map((d: any) => ({
        id: d.id, name: d.name, email: d.email, nationalId: d.national_id, role: d.role, schoolId: d.school_id, status: d.status
    }));
    return sessionCache.systemUsers;
};

export const fetchStudents = async () => {
    if (!isSupabaseConfigured()) return sessionCache.students;
    const { data } = await supabase.from('students').select('*').order('name');
    sessionCache.students = (data || []).map((d: any) => ({
        id: d.id, name: d.name, role: 'STUDENT', nationalId: d.national_id, classId: d.class_id,
        schoolId: d.school_id, createdById: d.created_by_id, gradeLevel: d.grade_level,
        className: d.class_name, email: d.email, phone: d.phone, parentName: d.parent_name,
        parentPhone: d.parent_phone, parentEmail: d.parent_email, learningStyle: d.learning_style,
        behaviorPoints: d.behavior_points, seatIndex: d.seat_index
    }));
    return sessionCache.students;
};

export const downloadFromSupabase = async () => {
    if (!isSupabaseConfigured()) return { success: false };
    try {
        await Promise.all([fetchSchools(), fetchTeachers(), fetchSystemUsers(), fetchStudents()]);
        return { success: true };
    } catch (e) {
        return { success: false };
    }
};

export const getStudents = () => sessionCache.students;
export const getSchools = () => sessionCache.schools;
export const getTeachers = () => sessionCache.teachers;
export const getSystemUsers = () => sessionCache.systemUsers;
export const getAttendance = () => sessionCache.attendance;
export const getSchedules = () => sessionCache.schedules;
export const getTasks = (tid?: string) => tid ? sessionCache.tasks.filter(t => t.teacherId === tid) : sessionCache.tasks;
export const getExams = (tid?: string) => tid ? sessionCache.exams.filter(e => e.teacherId === tid) : sessionCache.exams;
export const getExamResults = (eid?: string) => eid ? sessionCache.examResults.filter(r => r.examId === eid) : sessionCache.examResults;

export const deleteExamResult = async (id: string) => {
    await supabase.from('exam_results').delete().eq('id', id);
    sessionCache.examResults = sessionCache.examResults.filter(r => r.id !== id);
};

export const getQuestionBank = (tid?: string) => tid ? sessionCache.questionBank.filter(q => q.teacherId === tid) : sessionCache.questionBank;

export const deleteQuestionFromBank = async (id: string) => {
    await supabase.from('question_bank').delete().eq('id', id);
    sessionCache.questionBank = sessionCache.questionBank.filter(q => q.id !== id);
};

export const getCustomTables = (tid?: string) => tid ? sessionCache.customTables.filter(t => t.teacherId === tid) : sessionCache.customTables;

export const deleteCustomTable = async (id: string) => {
    await supabase.from('custom_tables').delete().eq('id', id);
    sessionCache.customTables = sessionCache.customTables.filter(t => t.id !== id);
};

export const getLessonLinks = () => sessionCache.lessonLinks;

export const deleteLessonLink = async (id: string) => {
    await supabase.from('lesson_links').delete().eq('id', id);
    sessionCache.lessonLinks = sessionCache.lessonLinks.filter(l => l.id !== id);
};

export const getWeeklyPlans = (tid?: string) => tid ? sessionCache.weeklyPlans.filter(p => p.teacherId === tid) : sessionCache.weeklyPlans;
export const getEnvironmentRecords = (classId?: string) => classId ? sessionCache.environmentRecords.filter(e => e.classId === classId) : sessionCache.environmentRecords;

export const deleteLessonPlan = async (id: string) => {
    await supabase.from('lesson_plans').delete().eq('id', id);
    sessionCache.lessonPlans = sessionCache.lessonPlans.filter(p => p.id !== id);
};

export const getTrackingSheets = (tid?: string) => tid ? sessionCache.trackingSheets.filter(s => s.teacherId === tid) : sessionCache.trackingSheets;

export const deleteTrackingSheet = async (id: string) => {
    await supabase.from('tracking_sheets').delete().eq('id', id);
    sessionCache.trackingSheets = sessionCache.trackingSheets.filter(s => s.id !== id);
};

export const getFormsDetailedResults = (tid?: string) => tid ? sessionCache.formsResults.filter(r => r.teacherId === tid) : sessionCache.formsResults;

export const deleteFormsDetailedResult = async (id: string) => {
    await supabase.from('forms_results').delete().eq('id', id);
    sessionCache.formsResults = sessionCache.formsResults.filter(r => r.id !== id);
};

export const updateStudentLearningStyle = async (id: string, style: LearningStyle) => {
    await supabase.from('students').update({ learning_style: style }).eq('id', id);
    const idx = sessionCache.students.findIndex(s => s.id === id);
    if (idx !== -1) sessionCache.students[idx].learningStyle = style;
};

export const saveEnvironmentRecord = async (r: EnvironmentRecord) => {
    await supabase.from('environment_records').upsert({
        id: r.id, teacher_id: r.teacherId, class_id: r.classId, date: r.date,
        lighting: r.lighting, noise_level: r.noiseLevel, mood: r.mood, notes: r.notes
    });
    sessionCache.environmentRecords = [r, ...sessionCache.environmentRecords.filter(e => e.id !== r.id)];
};

export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

export const deleteAssignment = async (id: string) => {
    await supabase.from('assignments').delete().eq('id', id);
    sessionCache.actualAssignments = sessionCache.actualAssignments.filter(a => a.id !== id);
};

export const setSystemMode = (mode: boolean) => localStorage.setItem(KEYS.SYSTEM_MODE, JSON.stringify(mode));
export const saveUserTheme = (theme: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(theme));

export const getCurriculumUnits = (tid?: string) => tid ? sessionCache.curriculumUnits.filter(u => u.teacherId === tid) : sessionCache.curriculumUnits;

export const saveCurriculumUnit = async (u: CurriculumUnit) => {
    await supabase.from('curriculum_units').upsert({
        id: u.id, teacher_id: u.teacherId, subject: u.subject, grade_level: u.gradeLevel, title: u.title, order_index: u.orderIndex
    });
    sessionCache.curriculumUnits = [...sessionCache.curriculumUnits.filter(item => item.id !== u.id), u];
};

export const deleteCurriculumUnit = async (id: string) => {
    await supabase.from('curriculum_units').delete().eq('id', id);
    sessionCache.curriculumUnits = sessionCache.curriculumUnits.filter(u => u.id !== id);
};

export const getCurriculumLessons = () => sessionCache.curriculumLessons;

export const saveCurriculumLesson = async (l: CurriculumLesson) => {
    await supabase.from('curriculum_lessons').upsert({
        id: l.id, unit_id: l.unitId, title: l.title, order_index: l.orderIndex,
        learning_standards: JSON.stringify(l.learningStandards), micro_concept_ids: JSON.stringify(l.microConceptIds),
        is_completed: l.isCompleted, completed_at: l.completedAt
    });
    sessionCache.curriculumLessons = [...sessionCache.curriculumLessons.filter(item => item.id !== l.id), l];
};

export const deleteCurriculumLesson = async (id: string) => {
    await supabase.from('curriculum_lessons').delete().eq('id', id);
    sessionCache.curriculumLessons = sessionCache.curriculumLessons.filter(l => l.id !== id);
};

export const toggleCurriculumLesson = async (id: string, completed: boolean) => {
    const completedAt = completed ? new Date().toISOString() : null;
    await supabase.from('curriculum_lessons').update({ is_completed: completed, completed_at: completedAt }).eq('id', id);
    const idx = sessionCache.curriculumLessons.findIndex(l => l.id === id);
    if (idx !== -1) {
        sessionCache.curriculumLessons[idx].isCompleted = completed;
        sessionCache.curriculumLessons[idx].completedAt = completedAt || undefined;
    }
};

export const fetchCurriculumUnits = async (tid?: string) => {
    if (!isSupabaseConfigured()) return sessionCache.curriculumUnits;
    let q = supabase.from('curriculum_units').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q.order('order_index');
    sessionCache.curriculumUnits = (data || []).map((d: any) => ({
        id: d.id, teacherId: d.teacher_id, subject: d.subject, gradeLevel: d.grade_level, title: d.title, orderIndex: d.order_index
    }));
    return sessionCache.curriculumUnits;
};

export const fetchCurriculumLessons = async (unitId?: string) => {
    if (!isSupabaseConfigured()) return sessionCache.curriculumLessons;
    let q = supabase.from('curriculum_lessons').select('*');
    if (unitId) q = q.eq('unit_id', unitId);
    const { data } = await q.order('order_index');
    sessionCache.curriculumLessons = (data || []).map((d: any) => ({
        id: d.id, unitId: d.unit_id, title: d.title, orderIndex: d.order_index, 
        learningStandards: typeof d.learning_standards === 'string' ? JSON.parse(d.learning_standards) : d.learning_standards,
        microConceptIds: typeof d.micro_concept_ids === 'string' ? JSON.parse(d.micro_concept_ids) : d.micro_concept_ids,
        isCompleted: d.is_completed, completedAt: d.completed_at
    }));
    return sessionCache.curriculumLessons;
};

export const fetchAttendance = async (teacherId?: string): Promise<AttendanceRecord[]> => {
    if (!isSupabaseConfigured()) return sessionCache.attendance;
    let query = supabase.from('attendance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data } = await query.order('date', { ascending: false });
    sessionCache.attendance = (data || []).map((d: any) => ({
        id: d.id, studentId: d.student_id, date: d.date, status: d.status,
        subject: d.subject, period: d.period, behaviorStatus: d.behavior_status,
        behaviorNote: d.behavior_note, participationScore: d.participation_score,
        excuseNote: d.excuse_note, createdById: d.created_by_id
    }));
    return sessionCache.attendance;
};

export const saveAttendance = async (recs: AttendanceRecord[]) => {
    const dbObjs = recs.map(r => ({
        id: r.id, student_id: r.studentId, date: r.date, status: r.status,
        subject: r.subject, period: r.period, behavior_status: r.behaviorStatus,
        behavior_note: r.behaviorNote, participation_score: r.participationScore,
        excuse_note: r.excuseNote, created_by_id: r.createdById
    }));
    await supabase.from('attendance').upsert(dbObjs);
};

export const deleteAttendance = async (id: string) => {
    await supabase.from('attendance').delete().eq('id', id);
};

export const fetchPerformance = async (teacherId?: string): Promise<PerformanceRecord[]> => {
    if (!isSupabaseConfigured()) return sessionCache.performance;
    let query = supabase.from('performance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data } = await query.order('date', { ascending: false });
    sessionCache.performance = (data || []).map((d: any) => ({
        id: d.id, studentId: d.student_id, subject: d.subject, title: d.title,
        category: d.category, score: d.score, maxScore: d.max_score, date: d.date,
        notes: d.notes, createdById: d.created_by_id, url: d.url
    }));
    return sessionCache.performance;
};

export const addPerformance = async (recs: PerformanceRecord | PerformanceRecord[]) => {
    const items = Array.isArray(recs) ? recs : [recs];
    const dbObjs = items.map(r => ({
        id: r.id, student_id: r.studentId, subject: r.subject, title: r.title,
        category: r.category, score: r.score, max_score: r.maxScore, date: r.date,
        notes: r.notes, created_by_id: r.createdById, url: r.url
    }));
    await supabase.from('performance').upsert(dbObjs);
};

export const deletePerformance = async (id: string) => {
    await supabase.from('performance').delete().eq('id', id);
};

export const updateSystemUser = async (u: SystemUser) => {
    await supabase.from('system_users').update({
        name: u.name, email: u.email, national_id: u.nationalId,
        role: u.role, school_id: u.schoolId, status: u.status
    }).eq('id', u.id);
};

export const deleteSystemUser = async (id: string) => {
    await supabase.from('system_users').delete().eq('id', id);
};

export const addSystemUser = async (u: SystemUser) => {
    await supabase.from('system_users').insert({
        id: u.id, name: u.name, email: u.email, national_id: u.nationalId,
        password: u.password, role: u.role, school_id: u.schoolId, status: u.status
    });
};

export const updateSchool = async (s: School) => {
    await supabase.from('schools').update({
        name: s.name, ministry_code: s.ministryCode, manager_name: s.managerName,
        manager_national_id: s.managerNationalId, education_administration: s.educationAdministration
    }).eq('id', s.id);
};

export const deleteSchool = async (id: string) => {
    await supabase.from('schools').delete().eq('id', id);
};

export const addSchool = async (s: School) => {
    await supabase.from('schools').insert({
        id: s.id, name: s.name, ministry_code: s.ministryCode, manager_name: s.managerName,
        manager_national_id: s.managerNationalId, type: s.type, phone: s.phone,
        education_administration: s.educationAdministration, student_count: s.studentCount
    });
};

export const updateTeacher = async (t: Teacher) => {
    await supabase.from('teachers').update({
        name: t.name, phone: t.phone, subject_specialty: t.subjectSpecialty,
        school_id: t.schoolId, 
        manager_id: t.managerId,
        subscription_status: t.subscriptionStatus,
        subscription_end_date: t.subscriptionEndDate
    }).eq('id', t.id);
};

export const addTeacher = async (t: Teacher) => {
    await supabase.from('teachers').insert({
        id: t.id, name: t.name, national_id: t.nationalId, email: t.email,
        phone: t.phone, subject_specialty: t.subjectSpecialty, password: t.password,
        school_id: t.schoolId, manager_id: t.managerId, subscription_status: t.subscriptionStatus
    });
    await addSystemUser({
        id: t.id, name: t.name, email: t.email || `t.${t.nationalId}@system.local`,
        nationalId: t.nationalId, password: t.password || '123456', role: 'TEACHER',
        schoolId: t.schoolId, status: 'ACTIVE'
    });
};

export const fetchTasks = async (tid?: string) => {
    if (!isSupabaseConfigured()) return sessionCache.tasks;
    let q = supabase.from('tasks').select('*');
    if(tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.tasks = (data || []).map((d: any) => ({
        id: d.id, teacherId: d.teacher_id, classId: d.class_id, subject: d.subject,
        title: d.title, description: d.description, due_date: d.due_date,
        type: d.type, max_score: d.max_score, submissions: d.submissions || []
    }));
    return sessionCache.tasks;
};

export const saveTask = async (t: Task) => {
    await supabase.from('tasks').upsert({
        id: t.id, teacher_id: t.teacherId, class_id: t.classId, subject: t.subject,
        title: t.title, description: t.description, due_date: t.dueDate,
        type: t.type, max_score: t.maxScore, submissions: t.submissions
    });
};

export const fetchAssignments = async (tid?: string) => {
    if (!isSupabaseConfigured()) return sessionCache.actualAssignments;
    let q = supabase.from('assignments').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.actualAssignments = (data || []).map((d: any) => ({
        id: d.id, title: d.title, category: d.category, maxScore: d.max_score, 
        isVisible: d.is_visible, teacherId: d.teacher_id, termId: d.term_id, 
        periodId: d.period_id, sourceMetadata: d.source_metadata, 
        sortOrder: d.sort_order, url: d.url
    }));
    return sessionCache.actualAssignments;
};

export const getAssignments = (category?: string, tid?: string, isManager?: boolean) => {
    let list = sessionCache.actualAssignments;
    if (tid && !isManager) list = list.filter((a: Assignment) => a.teacherId === tid);
    if (category && category !== 'ALL') list = list.filter((a: Assignment) => a.category === category);
    return list;
};

export const saveAssignment = async (a: Assignment) => {
    await supabase.from('assignments').upsert({
        id: a.id, title: a.title, category: a.category, max_score: a.maxScore,
        is_visible: a.isVisible, teacher_id: a.teacherId, term_id: a.termId,
        period_id: a.periodId, source_metadata: a.sourceMetadata,
        sort_order: a.sortOrder, url: a.url
    });
};

export const getAISettings = () => JSON.parse(localStorage.getItem(KEYS.AI_SETTINGS) || '{"modelId": "gemini-3-flash-preview", "temperature": 0.7, "enableReports": true}');
export const getUserTheme = () => JSON.parse(localStorage.getItem(KEYS.USER_THEME) || '{"mode": "LIGHT", "backgroundStyle": "FLAT"}');
export const getReportHeaderConfig = (tid?: string) => JSON.parse(localStorage.getItem(KEYS.REPORT_HEADER) || '{"schoolName": "", "teacherName": ""}');
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => localStorage.setItem(KEYS.REPORT_HEADER, JSON.stringify(c));
export const getTeacherPeriodTimings = (tid?: string) => JSON.parse(localStorage.getItem(`${KEYS.PERIOD_TIMINGS}_${tid}`) || '["07:00-07:45", "07:45-08:30"]');
export const saveTeacherPeriodTimings = (tid: string, timings: string[]) => localStorage.setItem(`${KEYS.PERIOD_TIMINGS}_${tid}`, JSON.stringify(timings));

export const initAutoSync = async () => {
    if (isSupabaseConfigured()) await downloadFromSupabase();
};

export const deleteStudent = async (id: string) => {
    await supabase.from('students').delete().eq('id', id);
};

export const addStudent = async (s: Student) => {
    await supabase.from('students').insert({
        id: s.id, name: s.name, national_id: s.nationalId, class_id: s.classId,
        school_id: s.schoolId, created_by_id: s.createdById, grade_level: s.gradeLevel,
        class_name: s.className, email: s.email, phone: s.phone,
        parent_name: s.parentName, parent_phone: s.parentPhone, parent_email: s.parentEmail,
        password: s.password || '123456', seat_index: s.seatIndex, 
        learning_style: s.learningStyle, behavior_points: s.behaviorPoints
    });
};

export const updateStudent = async (s: Student) => {
    await supabase.from('students').update({
        name: s.name, national_id: s.nationalId, grade_level: s.gradeLevel,
        class_name: s.className, phone: s.phone, parent_name: s.parentName,
        parent_phone: s.parentPhone, learning_style: s.learningStyle,
        behavior_points: s.behaviorPoints, seat_index: s.seatIndex
    }).eq('id', s.id);
};

export const fetchSchedules = async (tid: string) => {
    if (!isSupabaseConfigured()) return sessionCache.schedules;
    const { data } = await supabase.from('schedules').select('*').eq('teacher_id', tid);
    sessionCache.schedules = (data || []).map((d: any) => ({
        id: d.id, classId: d.class_id, subjectName: d.subject_name, day: d.day as any,
        period: d.period, teacherId: d.teacher_id
    }));
    return sessionCache.schedules;
};

export const saveScheduleItem = async (s: ScheduleItem) => {
    await supabase.from('schedules').upsert({
        id: s.id, teacher_id: s.teacherId, class_id: s.classId,
        subject_name: s.subjectName, day: s.day, period: s.period
    });
};

export const deleteScheduleItem = async (id: string) => {
    await supabase.from('schedules').delete().eq('id', id);
};

export const fetchTeacherAssignments = async (tid: string) => {
    if (!isSupabaseConfigured()) return sessionCache.assignments;
    const { data } = await supabase.from('teacher_class_map').select('*').eq('teacher_id', tid);
    sessionCache.assignments = (data || []).map((d: any) => ({
        id: d.id, classId: d.class_id, subjectName: d.subject_name, teacherId: d.teacher_id
    }));
    return sessionCache.assignments;
};

export const getTeacherAssignments = (tid?: string) => tid ? sessionCache.assignments.filter(a => a.teacherId === tid) : sessionCache.assignments;

export const addTeacherAssignment = async (a: TeacherAssignment) => {
    await supabase.from('teacher_class_map').insert({
        id: a.id, teacher_id: a.teacherId, class_id: a.classId, subject_name: a.subjectName
    });
};

export const deleteTeacherAssignment = async (id: string) => {
    await supabase.from('teacher_class_map').delete().eq('id', id);
};

export const fetchAcademicTerms = async (tid?: string) => {
    if (!isSupabaseConfigured()) return sessionCache.academicTerms;
    let query = supabase.from('academic_terms').select('*');
    if (tid) query = query.eq('teacher_id', tid);
    const { data } = await query;
    sessionCache.academicTerms = (data || []).map((d: any) => ({
        id: d.id, name: d.name, startDate: d.start_date, endDate: d.end_date,
        isCurrent: d.is_current, teacherId: d.teacher_id,
        periods: d.periods ? (typeof d.periods === 'string' ? JSON.parse(d.periods) : d.periods) : []
    }));
    return sessionCache.academicTerms;
};

export const getAcademicTerms = (tid?: string) => tid ? sessionCache.academicTerms.filter(t => t.teacherId === tid) : sessionCache.academicTerms;

export const saveAcademicTerm = async (t: AcademicTerm) => {
    await supabase.from('academic_terms').upsert({
        id: t.id, name: t.name, start_date: t.startDate, end_date: t.endDate,
        is_current: t.isCurrent, teacher_id: t.teacherId, periods: JSON.stringify(t.periods)
    });
};

export const deleteAcademicTerm = async (id: string) => {
    await supabase.from('academic_terms').delete().eq('id', id);
};

export const setCurrentTerm = async (id: string, teacherId: string) => {
    await supabase.from('academic_terms').update({ is_current: false }).eq('teacher_id', teacherId);
    await supabase.from('academic_terms').update({ is_current: true }).eq('id', id);
};

export const fetchSubjects = async (tid: string) => {
    if (!isSupabaseConfigured()) return sessionCache.subjects;
    const { data } = await supabase.from('subjects').select('*').eq('teacher_id', tid);
    sessionCache.subjects = (data || []).map((d: any) => ({ id: d.id, name: d.name, teacherId: d.teacher_id }));
    return sessionCache.subjects;
};

export const getSubjects = (tid?: string) => tid ? sessionCache.subjects.filter(s => s.teacherId === tid) : sessionCache.subjects;

export const addSubject = async (s: Subject) => {
    await supabase.from('subjects').insert({ id: s.id, name: s.name, teacher_id: s.teacherId });
};

export const deleteSubject = async (id: string) => {
    await supabase.from('subjects').delete().eq('id', id);
};

export const fetchBehaviorIncidents = async (tid?: string) => {
    if (!isSupabaseConfigured()) return sessionCache.behavior;
    let q = supabase.from('behavior_incidents').select('*');
    if(tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.behavior = (data || []).map((d: any) => ({
        id: d.id, studentId: d.student_id, teacherId: d.teacher_id, type: d.type,
        category: d.category, points: d.points, date: d.date, note: d.note, actionTaken: d.action_taken
    }));
    return sessionCache.behavior;
};

export const getBehaviorIncidents = (tid?: string) => tid ? sessionCache.behavior.filter(i => i.teacherId === tid) : sessionCache.behavior;

export const saveBehaviorIncident = async (i: BehaviorIncident) => {
    await supabase.from('behavior_incidents').upsert({
        id: i.id, student_id: i.studentId, teacher_id: i.teacherId, type: i.type,
        category: i.category, points: i.points, date: i.date, note: i.note, action_taken: i.actionTaken
    });
};

export const fetchExams = async (tid?: string) => {
    if (!isSupabaseConfigured()) return sessionCache.exams;
    let q = supabase.from('exams').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.exams = (data || []).map((d: any) => ({
        id: d.id, title: d.title, subject: d.subject, gradeLevel: d.grade_level,
        durationMinutes: d.duration_minutes, questions: typeof d.questions === 'string' ? JSON.parse(d.questions) : d.questions, 
        isActive: d.is_active, createdAt: d.created_at, teacherId: d.teacher_id, date: d.date
    }));
    return sessionCache.exams;
};

export const saveExam = async (e: Exam) => {
    await supabase.from('exams').upsert({
        id: e.id, title: e.title, subject: e.subject, grade_level: e.gradeLevel,
        duration_minutes: e.durationMinutes, questions: JSON.stringify(e.questions),
        is_active: e.isActive, created_at: e.createdAt, teacher_id: e.teacherId, date: e.date
    });
};

export const deleteExam = async (id: string) => {
    await supabase.from('exams').delete().eq('id', id);
};

export const fetchExamResults = async (eid?: string) => {
    if (!isSupabaseConfigured()) return sessionCache.examResults;
    let q = supabase.from('exam_results').select('*');
    if (eid) q = q.eq('exam_id', eid);
    const { data } = await q;
    sessionCache.examResults = (data || []).map((d: any) => ({
        id: d.id, examId: d.exam_id, studentId: d.student_id, score: d.score,
        totalScore: d.total_score, answers: typeof d.answers === 'string' ? JSON.parse(d.answers) : d.answers, 
        date: d.date
    }));
    return sessionCache.examResults;
};

export const fetchMessages = async (tid?: string) => {
    if (!isSupabaseConfigured()) return sessionCache.messages;
    let q = supabase.from('messages').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.messages = (data || []).map((d: any) => ({
        id: d.id, studentId: d.student_id, studentName: d.student_name,
        parentPhone: d.parent_phone, type: d.type, content: d.content,
        status: d.status, date: d.date, sentBy: d.sent_by, teacherId: d.teacher_id
    }));
    return sessionCache.messages;
};

export const getMessages = (tid?: string) => tid ? sessionCache.messages.filter(m => m.teacherId === tid) : sessionCache.messages;

export const saveMessage = async (m: MessageLog) => {
    await supabase.from('messages').insert({
        id: m.id, student_id: m.studentId, student_name: m.studentName,
        parent_phone: m.parentPhone, type: m.type, content: m.content,
        status: m.status, date: m.date, sent_by: m.sentBy, teacher_id: m.teacherId,
        target_role: m.targetRole
    });
};

export const fetchCustomTables = async (tid: string) => {
    if (!isSupabaseConfigured()) return sessionCache.customTables;
    const { data } = await supabase.from('custom_tables').select('*').eq('teacher_id', tid);
    sessionCache.customTables = (data || []).map((d: any) => ({
        id: d.id, name: d.name, createdAt: d.created_at, columns: typeof d.columns === 'string' ? JSON.parse(d.columns) : d.columns, 
        rows: typeof d.rows === 'string' ? JSON.parse(d.rows) : d.rows,
        sourceUrl: d.source_url, lastUpdated: d.last_updated, teacherId: d.teacher_id
    }));
    return sessionCache.customTables;
};

export const addCustomTable = async (t: CustomTable) => {
    await supabase.from('custom_tables').insert({
        id: t.id, name: t.name, created_at: t.createdAt, columns: JSON.stringify(t.columns), rows: JSON.stringify(t.rows),
        source_url: t.sourceUrl, last_updated: t.lastUpdated, teacher_id: t.teacherId
    });
};

export const fetchQuestionBank = async (tid?: string) => {
    if (!isSupabaseConfigured()) return sessionCache.questionBank;
    let q = supabase.from('question_bank').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.questionBank = (data || []).map((d: any) => ({
        id: d.id, text: d.text, type: d.type as any, options: typeof d.options === 'string' ? JSON.parse(d.options) : d.options, 
        correctAnswer: d.correct_answer, points: d.points, 
        teacherId: d.teacher_id, subject: d.subject, gradeLevel: d.grade_level
    }));
    return sessionCache.questionBank;
};

export const saveQuestionToBank = async (q: Question) => {
    await supabase.from('question_bank').upsert({
        id: q.id, text: q.text, type: q.type, options: JSON.stringify(q.options),
        correct_answer: q.correctAnswer, points: q.points, 
        teacher_id: q.teacherId, subject: q.subject, grade_level: q.gradeLevel
    });
};

export const fetchFormsDetailedResults = async (tid?: string) => {
    if (!isSupabaseConfigured()) return sessionCache.formsResults;
    let q = supabase.from('forms_results').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.formsResults = (data || []).map((d: any) => ({
        id: d.id, examTitle: d.exam_title, className: d.class_name, 
        date: d.date, teacherId: d.teacher_id, 
        questions: typeof d.questions === 'string' ? JSON.parse(d.questions) : d.questions,
        studentResponses: typeof d.student_responses === 'string' ? JSON.parse(d.student_responses) : d.student_responses
    }));
    return sessionCache.formsResults;
};

export const saveFormsDetailedResult = async (r: FormsDetailedResult) => {
    await supabase.from('forms_results').upsert({
        id: r.id, exam_title: r.examTitle, class_name: r.className,
        date: r.date, teacher_id: r.teacherId, 
        questions: JSON.stringify(r.questions), student_responses: JSON.stringify(r.studentResponses)
    });
};

export const saveRemedialPlan = async (p: RemedialPlan) => {
    await supabase.from('remedial_plans').upsert({
        id: p.id, student_id: p.studentId, teacher_id: p.teacherId,
        subject: p.subject, topic: p.topic, content: p.content, date: p.date
    });
};

export const getRemedialPlans = () => sessionCache.remedialPlans;

export const saveLessonLink = async (l: LessonLink) => {
    await supabase.from('lesson_links').upsert({
        id: l.id, title: l.title, url: l.url, teacher_id: l.teacherId,
        created_at: l.createdAt, grade_level: l.gradeLevel, class_name: l.className
    });
};

export const saveLessonPlan = async (p: StoredLessonPlan) => {
    await supabase.from('lesson_plans').upsert({
        id: p.id, teacher_id: p.teacherId, lesson_id: p.lessonId,
        subject: p.subject, topic: p.topic, content_json: p.contentJson,
        resources: JSON.stringify(p.resources), created_at: p.createdAt
    });
};

export const getLessonPlans = (tid?: string) => tid ? sessionCache.lessonPlans.filter(p => p.teacherId === tid) : sessionCache.lessonPlans;

export const saveWeeklyPlanItem = async (p: WeeklyPlanItem) => {
    await supabase.from('weekly_plans').upsert({
        id: p.id, teacher_id: p.teacherId, class_id: p.classId, subject_name: p.subjectName,
        day: p.day, period: p.period, week_start_date: p.weekStartDate,
        lesson_topic: p.lessonTopic, homework: p.homework
    });
};

export const saveTrackingSheet = async (s: TrackingSheet) => {
    await supabase.from('tracking_sheets').upsert({
        id: s.id, title: s.title, subject: s.subject, class_name: s.className,
        teacher_id: s.teacherId, created_at: s.createdAt, 
        columns: JSON.stringify(s.columns), scores: JSON.stringify(s.scores)
    });
};

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
        return { success: !error };
    } catch { return { success: false }; }
};

export const getDatabaseSchemaSQL = () => `
-- SQL Schema for Smart Teacher System
CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY, name TEXT, ministry_code TEXT, manager_name TEXT, manager_national_id TEXT, type TEXT, phone TEXT, student_count INTEGER, education_administration TEXT);
CREATE TABLE IF NOT EXISTS teachers (id TEXT PRIMARY KEY, name TEXT, national_id TEXT, email TEXT, phone TEXT, subject_specialty TEXT, password TEXT, school_id TEXT, manager_id TEXT, subscription_status TEXT, subscription_end_date TEXT);
CREATE TABLE IF NOT EXISTS system_users (id TEXT PRIMARY KEY, name TEXT, email TEXT, national_id TEXT, password TEXT, role TEXT, school_id TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT, national_id TEXT, class_id TEXT, school_id TEXT, created_by_id TEXT, grade_level TEXT, class_name TEXT, email TEXT, phone TEXT, parent_name TEXT, parent_phone TEXT, parent_email TEXT, password TEXT, seat_index INTEGER, learning_style TEXT, behavior_points INTEGER);
CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, student_id TEXT, date TEXT, status TEXT, subject TEXT, period INTEGER, behavior_status TEXT, behavior_note TEXT, participation_score INTEGER, excuse_note TEXT, excuse_file TEXT, created_by_id TEXT, term_id TEXT);
CREATE TABLE IF NOT EXISTS performance (id TEXT PRIMARY KEY, student_id TEXT, subject TEXT, title TEXT, category TEXT, score REAL, max_score REAL, date TEXT, notes TEXT, url TEXT, created_by_id TEXT);
CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, teacher_id TEXT, class_id TEXT, subject TEXT, title TEXT, description TEXT, due_date TEXT, type TEXT, max_score REAL, submissions JSONB);
CREATE TABLE IF NOT EXISTS behavior_incidents (id TEXT PRIMARY KEY, student_id TEXT, teacher_id TEXT, type TEXT, category TEXT, points INTEGER, date TEXT, note TEXT, action_taken TEXT);
CREATE TABLE IF NOT EXISTS exams (id TEXT PRIMARY KEY, title TEXT, subject TEXT, grade_level TEXT, duration_minutes INTEGER, questions JSONB, is_active BOOLEAN, created_at TEXT, teacher_id TEXT, date TEXT);
CREATE TABLE IF NOT EXISTS exam_results (id TEXT PRIMARY KEY, exam_id TEXT, student_id TEXT, score REAL, total_score REAL, answers JSONB, date TEXT);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, student_id TEXT, student_name TEXT, parent_phone TEXT, type TEXT, content TEXT, status TEXT, date TEXT, sent_by TEXT, teacher_id TEXT, target_role TEXT);
CREATE TABLE IF NOT EXISTS custom_tables (id TEXT PRIMARY KEY, name TEXT, created_at TEXT, columns JSONB, rows JSONB, source_url TEXT, last_updated TEXT, teacher_id TEXT);
CREATE TABLE IF NOT EXISTS lesson_plans (id TEXT PRIMARY KEY, teacher_id TEXT, lesson_id TEXT, subject TEXT, topic TEXT, content_json TEXT, resources JSONB, created_at TEXT);
CREATE TABLE IF NOT EXISTS lesson_links (id TEXT PRIMARY KEY, title TEXT, url TEXT, teacher_id TEXT, created_at TEXT, grade_level TEXT, class_name TEXT);
CREATE TABLE IF NOT EXISTS weekly_plans (id TEXT PRIMARY KEY, teacher_id TEXT, class_id TEXT, subject_name TEXT, day TEXT, period INTEGER, week_start_date TEXT, lesson_topic TEXT, homework TEXT);
CREATE TABLE IF NOT EXISTS remedial_plans (id TEXT PRIMARY KEY, student_id TEXT, teacher_id TEXT, subject TEXT, topic TEXT, content TEXT, date TEXT);
CREATE TABLE IF NOT EXISTS forms_results (id TEXT PRIMARY KEY, exam_title TEXT, class_name TEXT, date TEXT, teacher_id TEXT, questions JSONB, student_responses JSONB);
CREATE TABLE IF NOT EXISTS environment_records (id TEXT PRIMARY KEY, teacher_id TEXT, class_id TEXT, date TEXT, lighting INTEGER, noise_level INTEGER, mood TEXT, notes TEXT);
CREATE TABLE IF NOT EXISTS tracking_sheets (id TEXT PRIMARY KEY, title TEXT, subject TEXT, class_name TEXT, teacher_id TEXT, created_at TEXT, columns JSONB, scores JSONB);
CREATE TABLE IF NOT EXISTS question_bank (id TEXT PRIMARY KEY, text TEXT, type TEXT, options JSONB, correct_answer TEXT, points REAL, teacher_id TEXT, subject TEXT, grade_level TEXT);
CREATE TABLE IF NOT EXISTS curriculum_units (id TEXT PRIMARY KEY, teacher_id TEXT, subject TEXT, grade_level TEXT, title TEXT, order_index INTEGER);
CREATE TABLE IF NOT EXISTS curriculum_lessons (id TEXT PRIMARY KEY, unit_id TEXT, title TEXT, order_index INTEGER, learning_standards JSONB, micro_concept_ids JSONB, is_completed BOOLEAN, completed_at TEXT);
CREATE TABLE IF NOT EXISTS assignments (id TEXT PRIMARY KEY, title TEXT, category TEXT, max_score REAL, is_visible BOOLEAN, teacher_id TEXT, term_id TEXT, period_id TEXT, source_metadata TEXT, sort_order INTEGER, url TEXT);
CREATE TABLE IF NOT EXISTS schedules (id TEXT PRIMARY KEY, teacher_id TEXT, class_id TEXT, subject_name TEXT, day TEXT, period INTEGER);
CREATE TABLE IF NOT EXISTS teacher_class_map (id TEXT PRIMARY KEY, teacher_id TEXT, class_id TEXT, subject_name TEXT);
CREATE TABLE IF NOT EXISTS academic_terms (id TEXT PRIMARY KEY, name TEXT, start_date TEXT, end_date TEXT, is_current BOOLEAN, teacher_id TEXT, periods JSONB);
`;
