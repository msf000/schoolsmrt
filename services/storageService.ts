
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

// --- المصادقة ---
export const authenticateUser = async (id: string, p: string): Promise<SystemUser | null> => {
    try {
        const { data, error } = await supabase.from('system_users')
            .select('*')
            .or(`national_id.eq.${id},email.eq.${id}`)
            .eq('password', p)
            .maybeSingle();
        if (error || !data) return null;
        return {
            id: data.id, name: data.name, email: data.email, nationalId: data.national_id,
            role: data.role as any, schoolId: data.school_id, status: data.status as any, phone: data.phone
        };
    } catch { return null; }
};

export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => {
    try {
        const { data } = await supabase.from('students').select('*').eq('national_id', id).eq('password', p).maybeSingle();
        if (!data) return null;
        return {
            id: data.id, name: data.name, role: 'STUDENT', nationalId: data.national_id, 
            classId: data.class_id, className: data.class_name, grade_level: data.grade_level, schoolId: data.school_id,
            xp: data.xp || 0, level: data.level || 1, badges: data.badges || [], purchasedRewards: data.purchased_rewards || [],
            createdById: data.created_by_id
        } as Student;
    } catch { return null; }
};

// --- نتائج الاختبارات ---
export const saveExamResult = async (res: ExamResult) => {
    const current = getExamResults(res.examId);
    const updated = [...current.filter(x => x.id !== res.id), res];
    localStorage.setItem(`local_exam_results_${res.examId}`, JSON.stringify(updated));
    
    const student = (getStudents().find(s => s.id === res.studentId));
    if (student) {
        const earnedXp = Math.floor((res.score / res.totalScore) * 100);
        const updatedStudent = { ...student, xp: (student.xp || 0) + earnedXp };
        await updateStudent(updatedStudent);
    }
    return { success: true };
};

export const getExamResults = (eid?: string): ExamResult[] => {
    if (!eid) return [];
    const saved = localStorage.getItem(`local_exam_results_${eid}`);
    return saved ? JSON.parse(saved) : [];
};

// --- Fix: Added deleteExamResult
export const deleteExamResult = (id: string, eid: string) => {
    const current = getExamResults(eid);
    localStorage.setItem(`local_exam_results_${eid}`, JSON.stringify(current.filter(x => x.id !== id)));
};

// --- المدارس والمعلمين ---
export const fetchSchools = async (): Promise<School[]> => {
    const { data } = await supabase.from('schools').select('*').order('name');
    const schools = (data || []).map((d: any) => ({
        id: d.id, name: d.name, ministryCode: d.ministry_code, managerName: d.manager_name,
        managerNationalId: d.manager_national_id, type: d.type, phone: d.phone,
        studentCount: d.student_count || 0, educationAdministration: d.education_administration
    }));
    localStorage.setItem('local_schools', JSON.stringify(schools));
    return schools;
};

export const getSchools = (): School[] => JSON.parse(localStorage.getItem('local_schools') || '[]');

export const addSchool = async (s: School) => await supabase.from('schools').insert([{
    id: s.id, name: s.name, ministry_code: s.ministryCode, manager_name: s.managerName,
    manager_national_id: s.managerNationalId, type: s.type, phone: s.phone,
    student_count: s.studentCount, education_administration: s.educationAdministration
}]);

// --- Fix: Added updateSchool
export const updateSchool = async (s: School) => await supabase.from('schools').update({
    name: s.name, ministry_code: s.ministryCode, manager_name: s.managerName,
    manager_national_id: s.managerNationalId, type: s.type, phone: s.phone,
    student_count: s.studentCount, education_administration: s.educationAdministration
}).eq('id', s.id);

// --- Fix: Added deleteSchool
export const deleteSchool = async (id: string) => await supabase.from('schools').delete().eq('id', id);

// --- إدارة الجوائز ---
export const getRewards = (tid?: string): Reward[] => {
    const saved = localStorage.getItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [
        { id: 'r1', title: 'إعفاء من واجب', cost: 1000, icon: '📝', description: 'تجاوز عن حل واجب منزلي واحد.', category: 'PRIVILEGE' },
        { id: 'r2', title: 'قائد المجموعة', cost: 500, icon: '👑', description: 'كن قائداً لمجموعتك في النشاط القادم.', category: 'TITLE' }
    ];
};

export const saveReward = (reward: Reward, tid?: string) => {
    const current = getRewards(tid);
    const updated = [...current.filter(r => r.id !== reward.id), reward];
    localStorage.setItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`, JSON.stringify(updated));
};

// --- Fix: Added deleteReward
export const deleteReward = (id: string, tid?: string) => {
    const current = getRewards(tid);
    localStorage.setItem(`${KEYS.CUSTOM_REWARDS}_${tid || 'global'}`, JSON.stringify(current.filter(r => r.id !== id)));
};

// --- الطلاب والعمليات السحابية ---
export const fetchStudents = async (): Promise<Student[]> => {
    const { data } = await supabase.from('students').select('*').order('name');
    const students = (data || []).map((d: any) => ({
        id: d.id, name: d.name, role: 'STUDENT', nationalId: d.national_id, 
        classId: d.class_id, schoolId: d.school_id, createdById: d.created_by_id, 
        gradeLevel: d.grade_level, className: d.class_name, email: d.email, 
        phone: d.phone, parentName: d.parent_name, parentPhone: d.parent_phone, 
        parentEmail: d.parent_email, learningStyle: d.learning_style,
        behaviorPoints: d.behavior_points || 0, seatIndex: d.seat_index,
        badges: d.badges || [], streak: d.streak || 0, level: d.level || 1, xp: d.xp || 0,
        purchasedRewards: d.purchased_rewards || []
    })) as Student[];
    localStorage.setItem('local_students', JSON.stringify(students));
    return students;
};

export const getStudents = (): Student[] => JSON.parse(localStorage.getItem('local_students') || '[]');

export const addStudent = async (s: Student) => {
    const res = await supabase.from('students').insert([{
        id: s.id, name: s.name, national_id: s.nationalId, grade_level: s.gradeLevel,
        class_name: s.className, phone: s.phone, parent_name: s.parentName,
        parent_phone: s.parentPhone, learning_style: s.learningStyle,
        behavior_points: s.behaviorPoints, seat_index: s.seatIndex,
        badges: s.badges, streak: s.streak, level: s.level, xp: s.xp,
        purchased_rewards: s.purchasedRewards, class_id: s.classId,
        school_id: s.schoolId, created_by_id: s.createdById
    }]);
    return res;
};

export const updateStudent = async (s: Student) => {
    const res = await supabase.from('students').update({
        name: s.name, national_id: s.nationalId, grade_level: s.gradeLevel,
        class_name: s.className, phone: s.phone, parent_name: s.parentName,
        parent_phone: s.parentPhone, learning_style: s.learningStyle,
        behavior_points: s.behaviorPoints, seat_index: s.seatIndex,
        badges: s.badges, streak: s.streak, level: s.level, xp: s.xp,
        purchased_rewards: s.purchasedRewards
    }).eq('id', s.id);
    const current = getStudents();
    localStorage.setItem('local_students', JSON.stringify(current.map(x => x.id === s.id ? s : x)));
    return res;
};

export const updateStudentLearningStyle = async (id: string, style: LearningStyle) => {
    return await supabase.from('students').update({ learning_style: style }).eq('id', id);
};

// --- الحضور والدرجات ---
export const saveAttendance = async (recs: AttendanceRecord[]) => {
    const dbObjs = recs.map(r => ({
        id: r.id, student_id: r.studentId, date: r.date, status: r.status,
        subject: r.subject, period: r.period, behavior_status: r.behaviorStatus,
        behavior_note: r.behaviorNote, participation_score: r.participationScore,
        excuse_note: r.excuseNote, created_by_id: r.createdById
    }));
    return await supabase.from('attendance').upsert(dbObjs);
};

export const fetchAttendance = async (teacherId?: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data } = await query.order('date', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, studentId: d.student_id, date: d.date, status: d.status,
        subject: d.subject, period: d.period, behaviorStatus: d.behavior_status,
        behaviorNote: d.behavior_note, participation_score: d.participation_score,
        excuse_note: d.excuse_note, createdById: d.created_by_id
    }));
};

export const getAttendance = (): AttendanceRecord[] => JSON.parse(localStorage.getItem('local_attendance') || '[]');

export const fetchPerformance = async (teacherId?: string): Promise<PerformanceRecord[]> => {
    let query = supabase.from('performance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data } = await query.order('date', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, studentId: d.student_id, subject: d.subject, title: d.title,
        category: d.category, score: d.score, maxScore: d.max_score, date: d.date,
        notes: d.notes, created_by_id: d.created_by_id, url: d.url
    }));
};

export const addPerformance = async (recs: PerformanceRecord | PerformanceRecord[]) => {
    const items = Array.isArray(recs) ? recs : [recs];
    const dbObjs = items.map(r => ({
        id: r.id, student_id: r.studentId, subject: r.subject, title: r.title,
        category: r.category, score: r.score, max_score: r.maxScore, date: r.date,
        notes: r.notes, created_by_id: r.createdById, url: r.url
    }));
    return await supabase.from('performance').upsert(dbObjs);
};

// --- الإدارة المدرسية والجدول ---
export const getAcademicTerms = (tid?: string): AcademicTerm[] => {
    const saved = localStorage.getItem(`local_terms_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveAcademicTerm = async (t: AcademicTerm) => {
    const current = getAcademicTerms(t.teacherId);
    const updated = [...current.filter(x => x.id !== t.id), t];
    localStorage.setItem(`local_terms_${t.teacherId || 'global'}`, JSON.stringify(updated));
    return { success: true };
};

// --- Fix: Added deleteAcademicTerm
export const deleteAcademicTerm = (id: string) => {
    const saved = localStorage.getItem(`local_terms_global`) || '[]';
    localStorage.setItem(`local_terms_global`, JSON.stringify(JSON.parse(saved).filter((x: any) => x.id !== id)));
};

// --- Fix: Added setCurrentTerm
export const setCurrentTerm = (id: string, tid: string) => {
    const current = getAcademicTerms(tid);
    const updated = current.map(t => ({ ...t, isCurrent: t.id === id }));
    localStorage.setItem(`local_terms_${tid}`, JSON.stringify(updated));
};

export const getSubjects = (tid?: string): Subject[] => {
    const saved = localStorage.getItem(`local_subjects_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const addSubject = async (s: Subject) => {
    const current = getSubjects(s.teacherId);
    localStorage.setItem(`local_subjects_${s.teacherId || 'global'}`, JSON.stringify([...current, s]));
};

// --- Fix: Added deleteSubject
export const deleteSubject = (id: string) => {
    const saved = localStorage.getItem(`local_subjects_global`) || '[]';
    localStorage.setItem(`local_subjects_global`, JSON.stringify(JSON.parse(saved).filter((x: any) => x.id !== id)));
};

export const getSchedules = (): ScheduleItem[] => JSON.parse(localStorage.getItem('local_schedules') || '[]');

export const saveScheduleItem = (s: ScheduleItem) => {
    const current = getSchedules();
    localStorage.setItem('local_schedules', JSON.stringify([...current, s]));
};

// --- Fix: Added deleteScheduleItem
export const deleteScheduleItem = (id: string) => {
    const current = getSchedules();
    localStorage.setItem('local_schedules', JSON.stringify(current.filter(x => x.id !== id)));
};

export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => {
    const saved = localStorage.getItem(`local_assignments_map_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const addTeacherAssignment = (a: TeacherAssignment) => {
    const current = getTeacherAssignments(a.teacherId);
    localStorage.setItem(`local_assignments_map_${a.teacherId || 'global'}`, JSON.stringify([...current, a]));
};

// --- Fix: Added deleteTeacherAssignment
export const deleteTeacherAssignment = (id: string) => {
    const saved = localStorage.getItem(`local_assignments_map_global`) || '[]';
    localStorage.setItem(`local_assignments_map_global`, JSON.stringify(JSON.parse(saved).filter((x: any) => x.id !== id)));
};

// --- الرسائل والتنبيهات ---
export const getMessages = (tid?: string): MessageLog[] => {
    const saved = localStorage.getItem(`local_messages_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveMessage = (m: MessageLog) => {
    const current = getMessages(m.teacherId);
    localStorage.setItem(`local_messages_${m.teacherId || 'global'}`, JSON.stringify([m, ...current]));
};

// --- الإعدادات والسمات ---
export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => {
    const saved = localStorage.getItem(`report_header_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};

export const saveReportHeaderConfig = (c: ReportHeaderConfig) => {
    localStorage.setItem(`report_header_${c.teacherId || 'global'}`, JSON.stringify(c));
};

export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem(KEYS.USER_THEME) || '{"mode":"LIGHT","backgroundStyle":"FLAT"}');
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));

export const getTeacherPeriodTimings = (tid: string): string[] => {
    const saved = localStorage.getItem(`${KEYS.PERIOD_TIMINGS}_${tid}`);
    return saved ? JSON.parse(saved) : ["07:00-07:45", "07:45-08:30", "08:30-09:15", "09:45-10:30", "10:30-11:15", "11:15-12:00"];
};

// --- Fix: Added saveTeacherPeriodTimings
export const saveTeacherPeriodTimings = (tid: string, timings: string[]) => {
    localStorage.setItem(`${KEYS.PERIOD_TIMINGS}_${tid}`, JSON.stringify(timings));
};

// --- المهام والسلوك ---
export const getTasks = (tid?: string): Task[] => JSON.parse(localStorage.getItem(`local_tasks_${tid || 'global'}`) || '[]');
export const saveTask = async (t: Task) => {
    const current = getTasks(t.teacherId);
    localStorage.setItem(`local_tasks_${t.teacherId || 'global'}`, JSON.stringify([...current, t]));
};

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => JSON.parse(localStorage.getItem(`local_incidents_${tid || 'global'}`) || '[]');
export const saveBehaviorIncident = async (i: BehaviorIncident) => {
    const current = getBehaviorIncidents(i.teacherId);
    localStorage.setItem(`local_incidents_${i.teacherId || 'global'}`, JSON.stringify([...current, i]));
};

// --- الجداول والتحصيلي ---
export const getAssignments = (category: string = 'ALL', tid?: string, isManager: boolean = false): Assignment[] => {
    const saved = localStorage.getItem(`local_assignments_${tid || 'global'}`);
    let list: Assignment[] = saved ? JSON.parse(saved) : [];
    if (category !== 'ALL') list = list.filter(a => a.category === category);
    return list;
};

export const saveAssignment = async (a: Assignment) => {
    const current = getAssignments('ALL', a.teacherId, true);
    const updated = [...current.filter(x => x.id !== a.id), a];
    localStorage.setItem(`local_assignments_${a.teacherId || 'global'}`, JSON.stringify(updated));
};

// --- Fix: Added deleteAssignment
export const deleteAssignment = (id: string, tid?: string) => {
    const current = getAssignments('ALL', tid, true);
    localStorage.setItem(`local_assignments_${tid || 'global'}`, JSON.stringify(current.filter(x => x.id !== id)));
};

export const getCustomTables = (tid?: string): CustomTable[] => JSON.parse(localStorage.getItem(`local_custom_tables_${tid || 'global'}`) || '[]');
export const addCustomTable = async (t: CustomTable) => {
    const current = getCustomTables(t.teacherId);
    localStorage.setItem(`local_custom_tables_${t.teacherId || 'global'}`, JSON.stringify([...current, t]));
};

// --- Fix: Added deleteCustomTable
export const deleteCustomTable = (id: string) => {
    const saved = localStorage.getItem(`local_custom_tables_global`) || '[]';
    localStorage.setItem(`local_custom_tables_global`, JSON.stringify(JSON.parse(saved).filter((x: any) => x.id !== id)));
};

// --- البيئة والخطط ---
export const getRemedialPlans = (): RemedialPlan[] => JSON.parse(localStorage.getItem('local_remedial_plans') || '[]');
export const saveRemedialPlan = async (p: RemedialPlan) => {
    const current = getRemedialPlans();
    localStorage.setItem('local_remedial_plans', JSON.stringify([...current, p]));
};

export const getEnvironmentRecords = (cid?: string): EnvironmentRecord[] => JSON.parse(localStorage.getItem(`local_env_${cid || 'global'}`) || '[]');
export const saveEnvironmentRecord = async (r: EnvironmentRecord) => {
    const current = getEnvironmentRecords(r.classId);
    localStorage.setItem(`local_env_${r.classId || 'global'}`, JSON.stringify([...current, r]));
};

export const getLessonPlans = (tid?: string): StoredLessonPlan[] => JSON.parse(localStorage.getItem(`local_lesson_plans_${tid || 'global'}`) || '[]');
export const saveLessonPlan = async (p: StoredLessonPlan) => {
    const current = getLessonPlans(p.teacherId);
    const updated = [...current.filter(x => x.id !== p.id), p];
    localStorage.setItem(`local_lesson_plans_${p.teacherId || 'global'}`, JSON.stringify(updated));
};

// --- Fix: Added deleteLessonPlan
export const deleteLessonPlan = (id: string, tid?: string) => {
    const current = getLessonPlans(tid);
    localStorage.setItem(`local_lesson_plans_${tid || 'global'}`, JSON.stringify(current.filter(x => x.id !== id)));
};

export const getExams = (tid?: string): Exam[] => JSON.parse(localStorage.getItem(`local_exams_${tid || 'global'}`) || '[]');
export const saveExam = async (e: Exam) => {
    const current = getExams(e.teacherId);
    const updated = [...current.filter(x => x.id !== e.id), e];
    localStorage.setItem(`local_exams_${e.teacherId || 'global'}`, JSON.stringify(updated));
};

// --- Fix: Added deleteExam
export const deleteExam = (id: string) => {
    const saved = localStorage.getItem(`local_exams_global`) || '[]';
    localStorage.setItem(`local_exams_global`, JSON.stringify(JSON.parse(saved).filter((x: any) => x.id !== id)));
};

// --- طلبات المتجر والتحديات ---
export const getChallenges = (tid?: string): WeeklyChallenge[] => JSON.parse(localStorage.getItem(`local_challenges_${tid || 'global'}`) || '[]');
export const saveChallenge = async (c: WeeklyChallenge, tid?: string) => {
    const current = getChallenges(tid);
    localStorage.setItem(`local_challenges_${tid || 'global'}`, JSON.stringify([...current.filter(x => x.id !== c.id), c]));
    return { success: true };
};

// --- Fix: Added deleteChallenge
export const deleteChallenge = (id: string, tid?: string) => {
    const current = getChallenges(tid);
    localStorage.setItem(`local_challenges_${tid || 'global'}`, JSON.stringify(current.filter(x => x.id !== id)));
};

export const getPurchaseRequests = (tid?: string): PurchaseRequest[] => JSON.parse(localStorage.getItem(`local_purchases_${tid || 'global'}`) || '[]');
export const savePurchaseRequest = async (req: PurchaseRequest) => {
    const current = getPurchaseRequests('global');
    localStorage.setItem(`local_purchases_global`, JSON.stringify([req, ...current]));
    return { success: true };
};

export const updatePurchaseStatus = async (id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => {
    const all = getPurchaseRequests('global');
    localStorage.setItem(`local_purchases_global`, JSON.stringify(all.map(r => r.id === id ? { ...r, status } : r)));
};

// --- النظام العام ---
export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    const { data } = await supabase.from('system_users').select('*');
    return (data || []).map((d: any) => ({
        id: d.id, name: d.name, email: d.email, nationalId: d.national_id,
        role: d.role as any, schoolId: d.school_id, status: d.status as any, phone: d.phone
    }));
};

export const addSystemUser = async (u: SystemUser) => await supabase.from('system_users').insert([{
    id: u.id, name: u.name, email: u.email, national_id: u.nationalId, password: u.password,
    role: u.role, school_id: u.schoolId, status: u.status, phone: u.phone
}]);

// --- Fix: Added updateSystemUser
export const updateSystemUser = async (u: SystemUser) => await supabase.from('system_users').update({
    name: u.name, email: u.email, national_id: u.nationalId, role: u.role,
    school_id: u.schoolId, status: u.status, phone: u.phone
}).eq('id', u.id);

// --- Fix: Added deleteSystemUser
export const deleteSystemUser = async (id: string) => await supabase.from('system_users').delete().eq('id', id);

export const fetchTeachers = async (): Promise<Teacher[]> => {
    const { data } = await supabase.from('teachers').select('*');
    return (data || []).map((d: any) => ({
        id: d.id, name: d.name, nationalId: d.national_id, email: d.email, phone: d.phone,
        subjectSpecialty: d.subject_specialty, password: d.password, schoolId: d.school_id,
        managerId: d.manager_id, subscriptionStatus: d.subscription_status as any,
        subscriptionEndDate: d.subscription_end_date
    }));
};

export const getTeachers = (): Teacher[] => JSON.parse(localStorage.getItem('local_teachers') || '[]');

// --- Fix: Added addTeacher
export const addTeacher = async (t: Teacher) => await supabase.from('teachers').insert([{
    id: t.id, name: t.name, national_id: t.nationalId, email: t.email, phone: t.phone,
    subject_specialty: t.subjectSpecialty, password: t.password, school_id: t.schoolId,
    manager_id: t.managerId, subscription_status: t.subscriptionStatus,
    subscription_end_date: t.subscriptionEndDate
}]);

export const updateTeacher = async (t: Teacher) => await supabase.from('teachers').update({
    name: t.name, national_id: t.nationalId, email: t.email, phone: t.phone,
    subject_specialty: t.subjectSpecialty, password: t.password, school_id: t.schoolId,
    manager_id: t.managerId, subscription_status: t.subscriptionStatus,
    subscription_end_date: t.subscriptionEndDate
}).eq('id', t.id);

// --- Fix: Added getWeeklyPlans
export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => {
    const saved = localStorage.getItem(`local_weekly_plans_${tid}`);
    return saved ? JSON.parse(saved) : [];
};

// --- Fix: Added saveWeeklyPlanItem
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => {
    const current = getWeeklyPlans(item.teacherId);
    localStorage.setItem(`local_weekly_plans_${item.teacherId}`, JSON.stringify([...current.filter(x => x.id !== item.id), item]));
};

// --- Fix: Added getLessonLinks
export const getLessonLinks = (): LessonLink[] => JSON.parse(localStorage.getItem('local_lesson_links') || '[]');

// --- Fix: Added saveLessonLink
export const saveLessonLink = (link: LessonLink) => {
    const current = getLessonLinks();
    localStorage.setItem('local_lesson_links', JSON.stringify([...current, link]));
};

// --- Fix: Added deleteLessonLink
export const deleteLessonLink = (id: string) => {
    const current = getLessonLinks();
    localStorage.setItem('local_lesson_links', JSON.stringify(current.filter(x => x.id !== id)));
};

// --- Fix: Added getQuestionBank
export const getQuestionBank = (tid: string): Question[] => {
    const saved = localStorage.getItem(`local_question_bank_${tid}`);
    return saved ? JSON.parse(saved) : [];
};

// --- Fix: Added saveQuestionToBank
export const saveQuestionToBank = (q: Question) => {
    const current = getQuestionBank(q.teacherId!);
    localStorage.setItem(`local_question_bank_${q.teacherId}`, JSON.stringify([...current.filter(x => x.id !== q.id), q]));
};

// --- Fix: Added deleteQuestionFromBank
export const deleteQuestionFromBank = (id: string) => {
    const saved = localStorage.getItem(`local_question_bank_global`) || '[]';
    localStorage.setItem(`local_question_bank_global`, JSON.stringify(JSON.parse(saved).filter((x: any) => x.id !== id)));
};

// --- Fix: Added getCurriculumUnits, saveCurriculumUnit, deleteCurriculumUnit
export const getCurriculumUnits = (tid: string): CurriculumUnit[] => {
    const saved = localStorage.getItem(`local_units_${tid}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveCurriculumUnit = (u: CurriculumUnit) => {
    const current = getCurriculumUnits(u.teacherId!);
    localStorage.setItem(`local_units_${u.teacherId}`, JSON.stringify([...current.filter(x => x.id !== u.id), u]));
};

export const deleteCurriculumUnit = (id: string, tid: string) => {
    const current = getCurriculumUnits(tid);
    localStorage.setItem(`local_units_${tid}`, JSON.stringify(current.filter(x => x.id !== id)));
};

// --- Fix: Added getCurriculumLessons, saveCurriculumLesson, deleteCurriculumLesson, toggleCurriculumLesson
export const getCurriculumLessons = (uid: string): CurriculumLesson[] => {
    const saved = localStorage.getItem(`local_lessons_${uid}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveCurriculumLesson = (l: CurriculumLesson) => {
    const current = getCurriculumLessons(l.unitId);
    localStorage.setItem(`local_lessons_${l.unitId}`, JSON.stringify([...current.filter(x => x.id !== l.id), l]));
};

export const deleteCurriculumLesson = (id: string, uid: string) => {
    const current = getCurriculumLessons(uid);
    localStorage.setItem(`local_lessons_${uid}`, JSON.stringify(current.filter(x => x.id !== id)));
};

export const toggleCurriculumLesson = (id: string, completed: boolean, uid: string) => {
    const current = getCurriculumLessons(uid);
    localStorage.setItem(`local_lessons_${uid}`, JSON.stringify(current.map(l => l.id === id ? { ...l, isCompleted: completed } : l)));
};

// --- Fix: Added getTrackingSheets, saveTrackingSheet, deleteTrackingSheet
export const getTrackingSheets = (tid: string): TrackingSheet[] => {
    const saved = localStorage.getItem(`local_tracking_sheets_${tid}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveTrackingSheet = (s: TrackingSheet) => {
    const current = getTrackingSheets(s.teacherId);
    localStorage.setItem(`local_tracking_sheets_${s.teacherId}`, JSON.stringify([...current.filter(x => x.id !== s.id), s]));
};

export const deleteTrackingSheet = (id: string) => {
    const saved = localStorage.getItem(`local_tracking_sheets_global`) || '[]';
    localStorage.setItem(`local_tracking_sheets_global`, JSON.stringify(JSON.parse(saved).filter((x: any) => x.id !== id)));
};

// --- Fix: Added saveFormsDetailedResult, getFormsDetailedResults, deleteFormsDetailedResult
export const saveFormsDetailedResult = (res: FormsDetailedResult) => {
    const current = getFormsDetailedResults(res.teacherId);
    localStorage.setItem(`local_forms_results_${res.teacherId}`, JSON.stringify([...current.filter(x => x.id !== res.id), res]));
};

export const getFormsDetailedResults = (tid: string): FormsDetailedResult[] => {
    const saved = localStorage.getItem(`local_forms_results_${tid}`);
    return saved ? JSON.parse(saved) : [];
};

export const deleteFormsDetailedResult = (id: string) => {
    const saved = localStorage.getItem(`local_forms_results_global`) || '[]';
    localStorage.setItem(`local_forms_results_global`, JSON.stringify(JSON.parse(saved).filter((x: any) => x.id !== id)));
};

// --- Fix: Added getDatabaseSchemaSQL
export const getDatabaseSchemaSQL = () => {
    return `
CREATE TABLE schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ministry_code TEXT,
    manager_name TEXT,
    manager_national_id TEXT,
    type TEXT,
    phone TEXT,
    student_count INTEGER,
    education_administration TEXT
);

CREATE TABLE system_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    national_id TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    school_id TEXT REFERENCES schools(id),
    status TEXT DEFAULT 'ACTIVE',
    phone TEXT
);

CREATE TABLE teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT NOT NULL UNIQUE,
    email TEXT,
    phone TEXT,
    subject_specialty TEXT,
    password TEXT,
    school_id TEXT REFERENCES schools(id),
    manager_id TEXT,
    subscription_status TEXT DEFAULT 'FREE',
    subscription_end_date TIMESTAMP
);

CREATE TABLE students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT UNIQUE,
    class_id TEXT,
    school_id TEXT REFERENCES schools(id),
    created_by_id TEXT,
    grade_level TEXT,
    class_name TEXT,
    email TEXT,
    phone TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    password TEXT DEFAULT '123456',
    seat_index INTEGER,
    learning_style TEXT DEFAULT 'UNKNOWN',
    behavior_points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]',
    purchased_rewards JSONB DEFAULT '[]',
    streak INTEGER DEFAULT 0
);

CREATE TABLE attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id),
    date DATE NOT NULL,
    status TEXT NOT NULL,
    subject TEXT,
    period INTEGER,
    behavior_status TEXT,
    behavior_note TEXT,
    participation_score INTEGER,
    excuse_note TEXT,
    created_by_id TEXT
);

CREATE TABLE performance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id),
    subject TEXT,
    title TEXT,
    category TEXT,
    score NUMERIC,
    max_score NUMERIC,
    date DATE,
    notes TEXT,
    created_by_id TEXT,
    url TEXT
);
    `;
};

export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

export const downloadFromSupabase = async () => ({ success: true });
export const checkConnection = async () => ({ success: true });
export const getAISettings = () => ({ modelId: 'gemini-3-flash-preview', temperature: 0.7, systemInstruction: 'أنت مساعد تعليمي ذكي خبير.' });
export const deleteStudent = async (id: string) => await supabase.from('students').delete().eq('id', id);
export const deleteAttendance = async (id: string) => await supabase.from('attendance').delete().eq('id', id);
export const deletePerformance = async (id: string) => await supabase.from('performance').delete().eq('id', id);
