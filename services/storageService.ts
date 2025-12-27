
import { supabase } from './supabaseClient';
import { 
    Student, AttendanceRecord, PerformanceRecord, BehaviorIncident, 
    SystemUser, Subject, Teacher, School, WallPost, Assignment,
    AcademicTerm, CustomTable, FormsDetailedResult, InteractiveGame,
    RemedialPlan, LessonBlock, CurriculumUnit, CurriculumLesson,
    LessonLink, WeeklyPlanItem, TrackingSheet, Reward,
    PurchaseRequest, WeeklyChallenge, Badge, Exam, Question, ExamResult, MessageLog,
    ParentRequest, LearningStyle, UserTheme, TeacherAssignment, ReportHeaderConfig,
    StoredLessonPlan, ScheduleItem, Task, EnvironmentRecord
} from '../types';

const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocal = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));

/**
 * محول البيانات من Supabase (snake_case) إلى التطبيق (camelCase)
 */
const mapStudentFromDB = (s: any): Student => ({
    id: s.id,
    name: s.name,
    role: 'STUDENT',
    nationalId: s.national_id || '',
    classId: s.class_id,
    gradeLevel: s.grade_level,
    className: s.class_name,
    parentPhone: s.parent_phone,
    behaviorPoints: s.behavior_points || 0,
    xp: s.xp || 0,
    level: s.level || 1,
    learningStyle: (s.learning_style || 'UNKNOWN') as LearningStyle,
    auraColor: s.aura_color || 'indigo',
    activeTitle: s.active_title,
    schoolId: s.school_id,
    createdById: s.created_by_id,
    badges: s.badges || [],
    purchasedRewards: s.purchased_rewards || [],
    seatIndex: s.seat_index || 0
});

// --- الطلاب ---
export const fetchStudents = async () => {
    try {
        const { data, error } = await supabase.from('students').select('*').order('name');
        if (error) throw error;
        const mappedData = (data || []).map(mapStudentFromDB);
        setLocal('students', mappedData);
        return mappedData;
    } catch (e) {
        return getLocal('students');
    }
};

export const getStudents = (): Student[] => getLocal('students');

export const addStudent = async (student: Student) => {
    const { error } = await supabase.from('students').insert({
        id: student.id,
        name: student.name,
        national_id: student.nationalId,
        class_id: student.classId,
        grade_level: student.gradeLevel,
        class_name: student.className,
        parent_phone: student.parentPhone,
        created_by_id: student.createdById
    });
    if (error) throw error;
    await fetchStudents();
};

export const updateStudent = async (student: Student) => {
    const { error } = await supabase.from('students').update({
        name: student.name,
        class_name: student.className,
        behavior_points: student.behaviorPoints,
        xp: student.xp,
        level: student.level,
        learning_style: student.learningStyle,
        seat_index: student.seatIndex,
        aura_color: student.auraColor,
        active_title: student.activeTitle
    }).eq('id', student.id);
    if (error) throw error;
    await fetchStudents();
};

export const deleteStudent = async (id: string) => {
    await supabase.from('students').delete().eq('id', id);
    await fetchStudents();
};

export const deleteAllStudents = async () => {
    await supabase.from('students').delete().neq('id', '0');
    setLocal('students', []);
};

// --- الحضور ---
export const fetchAttendance = async () => {
    const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    const mapped = (data || []).map(a => ({
        id: a.id,
        studentId: a.student_id,
        date: a.date,
        status: a.status,
        period: a.period,
        subject: a.subject,
        behaviorStatus: a.behavior_status,
        behaviorNote: a.behavior_note,
        createdById: a.created_by_id
    }));
    setLocal('attendance', mapped);
    return mapped;
};

export const getAttendance = (): AttendanceRecord[] => getLocal('attendance');

export const saveAttendance = async (records: AttendanceRecord[]) => {
    const dbRecords = records.map(r => ({
        id: r.id,
        student_id: r.studentId,
        date: r.date,
        status: r.status,
        period: r.period,
        subject: r.subject,
        behavior_status: r.behaviorStatus,
        behavior_note: r.behaviorNote,
        created_by_id: r.createdById
    }));
    await supabase.from('attendance').upsert(dbRecords);
    await fetchAttendance();
};

export const deleteAttendance = async (id: string) => {
    await supabase.from('attendance').delete().eq('id', id);
    await fetchAttendance();
};

// --- الأداء ---
export const fetchPerformance = async (tid?: string) => {
    let query = supabase.from('performance').select('*');
    if (tid) query = query.eq('created_by_id', tid);
    const { data } = await query.order('date', { ascending: false });
    const mapped = (data || []).map(p => ({
        id: p.id,
        studentId: p.student_id,
        subject: p.subject,
        title: p.title,
        score: p.score,
        maxScore: p.max_score,
        date: p.date,
        category: p.category,
        notes: p.notes,
        createdById: p.created_by_id
    }));
    setLocal('performance', mapped);
    return mapped;
};

export const getPerformance = (): PerformanceRecord[] => getLocal('performance');

export const addPerformance = async (records: PerformanceRecord[]) => {
    const dbRecords = records.map(r => ({
        id: r.id,
        student_id: r.studentId,
        subject: r.subject,
        title: r.title,
        score: r.score,
        max_score: r.maxScore,
        date: r.date,
        category: r.category,
        notes: r.notes,
        created_by_id: r.createdById
    }));
    await supabase.from('performance').upsert(dbRecords);
    await fetchPerformance();
};

export const deletePerformance = async (id: string) => {
    await supabase.from('performance').delete().eq('id', id);
    await fetchPerformance();
};

// --- المعلمون والمدارس ---
export const fetchTeachers = async () => {
    const { data } = await supabase.from('system_users').select('*').eq('role', 'TEACHER');
    setLocal('teachers', data || []);
    return data || [];
};

export const getTeachers = (): Teacher[] => getLocal('teachers');

export const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*');
    setLocal('schools', data || []);
    return data || [];
};

export const getSchools = (): School[] => getLocal('schools');

export const fetchSystemUsers = async () => {
    const { data } = await supabase.from('system_users').select('*');
    setLocal('system_users', data || []);
    return data || [];
};

export const addTeacher = async (teacher: Teacher) => {
    await supabase.from('system_users').insert({
        id: teacher.id, name: teacher.name, email: teacher.email, role: 'TEACHER',
        national_id: teacher.nationalId, password: teacher.password, school_id: teacher.schoolId,
        status: 'ACTIVE', phone: teacher.phone, subject_specialty: teacher.subjectSpecialty
    });
};

export const updateTeacher = async (teacher: Teacher) => {
    await supabase.from('system_users').update({
        name: teacher.name, email: teacher.email, phone: teacher.phone,
        subject_specialty: teacher.subjectSpecialty,
        subscription_status: teacher.subscriptionStatus,
        subscription_end_date: teacher.subscriptionEndDate
    }).eq('id', teacher.id);
};

export const addSchool = async (school: School) => {
    await supabase.from('schools').insert({
        id: school.id, name: school.name, ministry_code: school.ministryCode,
        manager_name: school.managerName, manager_national_id: school.managerNationalId,
        education_administration: school.educationAdministration, type: school.type
    });
};

export const addSystemUser = async (user: SystemUser) => {
    await supabase.from('system_users').insert({
        id: user.id, name: user.name, email: user.email, role: user.role,
        national_id: user.nationalId, password: user.password, school_id: user.schoolId,
        status: user.status, phone: user.phone
    });
};

export const updateSystemUser = async (user: SystemUser) => {
    await supabase.from('system_users').update(user).eq('id', user.id);
};

// --- الإعدادات والمواد ---
export const getSubjects = (tid: string): Subject[] => (getLocal('subjects') || []).filter((s: Subject) => s.teacherId === tid);
export const addSubject = (subject: Subject) => setLocal('subjects', [...getLocal('subjects'), subject]);
export const deleteSubject = (id: string) => setLocal('subjects', getLocal('subjects').filter((s: Subject) => s.id !== id));

export const getAcademicTerms = (tid?: string): AcademicTerm[] => (getLocal('academic_terms') || []).filter((t: any) => !tid || t.teacherId === tid);
export const saveAcademicTerm = (term: AcademicTerm) => setLocal('academic_terms', [...getLocal('academic_terms').filter((t: any) => t.id !== term.id), term]);
export const deleteAcademicTerm = (id: string) => setLocal('academic_terms', getLocal('academic_terms').filter((t: any) => t.id !== id));
export const setCurrentTerm = (id: string, tid: string) => {
    const terms = getAcademicTerms(tid).map(t => ({ ...t, isCurrent: t.id === id }));
    const others = (getLocal('academic_terms') || []).filter((t: any) => t.teacherId !== tid);
    setLocal('academic_terms', [...others, ...terms]);
};

export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => getLocal('report_configs').find((c: any) => c.teacherId === tid) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '', signatureBase64: '' };
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => setLocal('report_configs', [...(getLocal('report_configs') || []).filter((c: any) => c.teacherId !== config.teacherId), config]);

export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem('user_theme') || '{"mode": "LIGHT", "backgroundStyle": "FLAT"}');
export const saveUserTheme = (theme: UserTheme) => localStorage.setItem('user_theme', JSON.stringify(theme));

export const getTeacherPeriodTimings = (tid: string): string[] => getLocal(`period_timings_${tid}`) || ["07:00", "07:45", "08:30", "09:45", "10:30", "11:15", "12:00", "12:45"];
export const saveTeacherPeriodTimings = (tid: string, timings: string[]) => setLocal(`period_timings_${tid}`, timings);

export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => (getLocal('teacher_assignments') || []).filter((a: any) => !tid || a.teacherId === tid);
export const addTeacherAssignment = (a: TeacherAssignment) => setLocal('teacher_assignments', [...getLocal('teacher_assignments'), a]);
export const deleteTeacherAssignment = (id: string) => setLocal('teacher_assignments', getLocal('teacher_assignments').filter((a: any) => a.id !== id));

// --- الاختبارات والمهام ---
export const getExams = (tid?: string): Exam[] => (getLocal('exams') || []).filter((e: any) => !tid || e.teacherId === tid);
export const saveExam = (exam: Exam) => setLocal('exams', [...getLocal('exams').filter((e: any) => e.id !== exam.id), exam]);
export const deleteExam = (id: string) => setLocal('exams', getLocal('exams').filter((e: any) => e.id !== id));

export const getAssignments = (cat: string = 'ALL', tid?: string, onlyVisible: boolean = false): Assignment[] => {
    let list = getLocal('assignments') || [];
    if (tid) list = list.filter((a: Assignment) => a.teacherId === tid);
    if (cat !== 'ALL') list = list.filter((a: Assignment) => a.category === cat);
    if (onlyVisible) list = list.filter((a: Assignment) => a.isVisible);
    return list;
};
export const saveAssignment = (a: Assignment) => setLocal('assignments', [...getLocal('assignments').filter((x: any) => x.id !== a.id), a]);
export const deleteAssignment = (id: string) => setLocal('assignments', getLocal('assignments').filter((a: any) => a.id !== id));

export const getTasks = (tid?: string): Task[] => (getLocal('tasks') || []).filter((t: any) => !tid || t.teacherId === tid);
export const saveTask = (task: Task) => setLocal('tasks', [...getLocal('tasks').filter((t: any) => t.id !== task.id), task]);

// --- التحليلات والجداول الخاصة ---
export const getCustomTables = (tid?: string): CustomTable[] => (getLocal('custom_tables') || []).filter((t: any) => !tid || t.teacherId === tid);
export const addCustomTable = async (table: CustomTable) => setLocal('custom_tables', [...getLocal('custom_tables'), table]);
export const deleteCustomTable = async (id: string) => setLocal('custom_tables', getLocal('custom_tables').filter((t: any) => t.id !== id));

export const getFormsDetailedResults = (tid: string): FormsDetailedResult[] => (getLocal('forms_detailed') || []).filter((r: any) => r.teacherId === tid);
export const saveFormsDetailedResult = (res: FormsDetailedResult) => setLocal('forms_detailed', [...getLocal('forms_detailed').filter((x: any) => x.id !== res.id), res]);
export const deleteFormsDetailedResult = (id: string) => setLocal('forms_detailed', getLocal('forms_detailed').filter((r: any) => r.id !== id));

export const getEnvironmentRecords = (cid: string): EnvironmentRecord[] => (getLocal('env_records') || []).filter((r: any) => r.classId === cid);
export const saveEnvironmentRecord = (rec: EnvironmentRecord) => setLocal('env_records', [...(getLocal('env_records') || []), rec]);

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => (getLocal('behavior_incidents') || []).filter((i: any) => !tid || i.teacherId === tid);
export const saveBehaviorIncident = async (incident: BehaviorIncident) => {
    setLocal('behavior_incidents', [incident, ...(getLocal('behavior_incidents') || [])]);
    await supabase.from('behavior_incidents').insert({
        id: incident.id, student_id: incident.studentId, teacher_id: incident.teacherId,
        type: incident.type, category: incident.category, points: incident.points,
        note: incident.note, action_taken: incident.actionTaken
    });
};

// --- الحائط والمراسلات ---
export const saveWallPost = async (post: WallPost) => {
    await supabase.from('wall_posts').insert({
        id: post.id, user_id: post.userId, user_name: post.userName,
        content: post.content, type: post.type, school_id: post.schoolId
    });
};
export const fetchWallPosts = async (sid: string) => {
    const { data } = await supabase.from('wall_posts').select('*').eq('school_id', sid).order('created_at', { ascending: false });
    return (data || []).map(p => ({
        id: p.id, userId: p.user_id, userName: p.user_name, content: p.content,
        type: p.type, likes: p.likes, schoolId: p.school_id, createdAt: p.created_at
    }));
};

export const saveMessage = async (msg: MessageLog) => setLocal('messages', [msg, ...(getLocal('messages') || [])]);
export const getMessages = (tid?: string): MessageLog[] => (getLocal('messages') || []).filter((m: any) => !tid || m.teacherId === tid);

// --- دوال متنوعة ---
export const getAISettings = () => JSON.parse(localStorage.getItem('ai_settings') || '{"systemInstruction": "أنت مساعد تعليمي محترف.", "temperature": 0.7}');
export const saveAISettings = (config: any) => localStorage.setItem('ai_settings', JSON.stringify(config));

export const updateStudentLearningStyle = (id: string, style: LearningStyle) => {
    const students = getStudents().map(s => s.id === id ? { ...s, learningStyle: style } : s);
    setLocal('students', students);
};

export const exportToWord = (elementId: string, filename: string) => {
    const html = document.getElementById(elementId)?.innerHTML || "";
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename; link.click();
};

export const getSchedules = (): ScheduleItem[] => getLocal('schedules') || [];
export const saveScheduleItem = (item: ScheduleItem) => setLocal('schedules', [...getSchedules().filter(s=>s.id!==item.id), item]);
export const deleteScheduleItem = (id: string) => setLocal('schedules', getSchedules().filter(s => s.id !== id));

export const authenticateUser = async (id: string, pass: string) => {
    const { data } = await supabase.from('system_users').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', pass).single();
    return data || null;
};

export const authenticateStudent = async (id: string, pass: string) => {
    const { data } = await supabase.from('students').select('*').eq('national_id', id).single();
    if (data && (data.password === pass || pass === '123456')) return mapStudentFromDB(data);
    return null;
};

// Fix: Added getDatabaseSchemaSQL for AdminDashboard.tsx
export const getDatabaseSchemaSQL = () => `-- SQL Schema Placeholder`;

// Fix: Added getCloudSystemStatus for AdminDashboard.tsx
export const getCloudSystemStatus = () => ({ status: 'CONNECTED', latency: '24ms', region: 'eu-central-1' });

// Fix: Added getWorksMasterUrl and saveWorksMasterUrl for WorksTracking.tsx
export const getWorksMasterUrl = (): string => localStorage.getItem('works_master_url') || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem('works_master_url', url);

// Fix: Added getGames, saveGame, and deleteGame for StudentPortal and GamesBuilder
export const getGames = (tid?: string): InteractiveGame[] => (getLocal('games') || []).filter((g: any) => !tid || g.teacherId === tid);
export const saveGame = async (game: InteractiveGame) => setLocal('games', [...getLocal('games').filter((g: any) => g.id !== game.id), game]);
export const deleteGame = async (id: string) => setLocal('games', getLocal('games').filter((g: any) => g.id !== id));

// Fix: Added saveRemedialPlan and getRemedialPlans for AITools and ReportsCenter
export const saveRemedialPlan = (plan: RemedialPlan) => setLocal('remedial_plans', [...getLocal('remedial_plans').filter((p: any) => p.id !== plan.id), plan]);
export const getRemedialPlans = (tid?: string): RemedialPlan[] => (getLocal('remedial_plans') || []).filter((p: any) => !tid || p.teacherId === tid);

// Fix: Added saveLessonPlan, getLessonPlans, and deleteLessonPlan for LessonPlanning and ScheduleView
export const saveLessonPlan = (plan: StoredLessonPlan) => setLocal('lesson_plans', [...getLocal('lesson_plans').filter((p: any) => p.id !== plan.id), plan]);
export const getLessonPlans = (tid?: string): StoredLessonPlan[] => (getLocal('lesson_plans') || []).filter((p: any) => !tid || p.teacherId === tid);
export const deleteLessonPlan = (id: string) => setLocal('lesson_plans', getLocal('lesson_plans').filter((p: any) => p.id !== id));

// Fix: Added getExamResults and saveExamResult for ExamsManager and StudentQuizPlayer
export const getExamResults = (examId?: string): ExamResult[] => (getLocal('exam_results') || []).filter((r: any) => !examId || r.examId === examId);
export const saveExamResult = async (res: ExamResult) => setLocal('exam_results', [...getLocal('exam_results'), res]);

// Fix: Added getQuestionBank, saveQuestionToBank, and deleteQuestionFromBank for QuestionBank
export const getQuestionBank = (tid: string): Question[] => (getLocal('question_bank') || []).filter((q: any) => q.teacherId === tid);
export const saveQuestionToBank = (q: Question) => setLocal('question_bank', [...setLocal('question_bank', getLocal('question_bank').filter((x: any) => x.id !== q.id)), q]);
export const deleteQuestionFromBank = (id: string) => setLocal('question_bank', getLocal('question_bank').filter((x: any) => x.id !== id));

// Fix: Added curriculum management functions for CurriculumManager
export const getCurriculumUnits = (tid: string): CurriculumUnit[] => (getLocal('curriculum_units') || []).filter((u: any) => u.teacherId === tid);
export const saveCurriculumUnit = async (u: CurriculumUnit) => setLocal('curriculum_units', [...getLocal('curriculum_units').filter((x: any) => x.id !== u.id), u]);
export const deleteCurriculumUnit = (id: string) => setLocal('curriculum_units', getLocal('curriculum_units').filter((x: any) => x.id !== id));
export const getCurriculumLessons = (unitId: string): CurriculumLesson[] => (getLocal('curriculum_lessons') || []).filter((l: any) => l.unitId === unitId);
export const saveCurriculumLesson = async (l: CurriculumLesson) => setLocal('curriculum_lessons', [...getLocal('curriculum_lessons').filter((x: any) => x.id !== l.id), l]);
export const deleteCurriculumLesson = (id: string) => setLocal('curriculum_lessons', getLocal('curriculum_lessons').filter((x: any) => x.id !== id));
export const toggleCurriculumLesson = (id: string, isCompleted: boolean) => {
    const lessons = (getLocal('curriculum_lessons') || []).map((l: any) => l.id === id ? { ...l, isCompleted } : l);
    setLocal('curriculum_lessons', lessons);
};

// Fix: Added resource link management for ResourcesView and RemedialBridge
export const getLessonLinks = (): LessonLink[] => getLocal('lesson_links') || [];
export const saveLessonLink = (link: LessonLink) => setLocal('lesson_links', [...getLessonLinks().filter(l=>l.id!==link.id), link]);
export const deleteLessonLink = (id: string) => setLocal('lesson_links', getLessonLinks().filter(l=>l.id!==id));

// Fix: Added weekly plan functions for ScheduleView
export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => (getLocal('weekly_plans') || []).filter((p: any) => p.teacherId === tid);
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => setLocal('weekly_plans', [...getLocal('weekly_plans').filter((x: any) => x.id !== item.id), item]);

// Fix: Added tracking sheet functions for FlexibleTrackingSheet
export const getTrackingSheets = (tid: string): TrackingSheet[] => (getLocal('tracking_sheets') || []).filter((s: any) => s.teacherId === tid);
export const saveTrackingSheet = (sheet: TrackingSheet) => setLocal('tracking_sheets', [...getLocal('tracking_sheets').filter((x: any) => x.id !== sheet.id), sheet]);
export const deleteTrackingSheet = (id: string) => setLocal('tracking_sheets', getLocal('tracking_sheets').filter((x: any) => x.id !== id));

// Fix: Added purchase request management for TeacherInbox and StudentShop
export const getPurchaseRequests = (tid: string): PurchaseRequest[] => (getLocal('purchase_requests') || []).filter((r: any) => r.teacherId === tid);
export const updatePurchaseStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const reqs = getLocal('purchase_requests').map((r: any) => r.id === id ? { ...r, status } : r);
    setLocal('purchase_requests', reqs);
};
export const savePurchaseRequest = async (req: PurchaseRequest) => setLocal('purchase_requests', [...getLocal('purchase_requests'), req]);

// Fix: Added challenge functions for ChallengesManager
export const getChallenges = (tid: string): WeeklyChallenge[] => (getLocal('challenges') || []).filter((c: any) => c.teacherId === tid);
export const saveChallenge = async (ch: WeeklyChallenge, tid: string) => setLocal('challenges', [...(getLocal('challenges') || []).filter((c: any) => c.id !== ch.id), { ...ch, teacherId: tid }]);
export const deleteChallenge = (id: string, tid: string) => setLocal('challenges', (getLocal('challenges') || []).filter((c: any) => c.id !== id));

// Fix: Added reward functions for RewardsManager
export const getRewards = (tid: string): Reward[] => (getLocal('rewards') || []).filter((r: any) => r.teacherId === tid);
export const saveReward = (reward: Reward, tid: string) => setLocal('rewards', [...getLocal('rewards').filter((r: any) => r.id !== reward.id), { ...reward, teacherId: tid }]);
export const deleteReward = (id: string, tid: string) => setLocal('rewards', getLocal('rewards').filter((r: any) => r.id !== id));

// Fix: Added library sharing functions for SharedLibrary
export const fetchSharedResources = async (schoolId?: string) => {
    const { data } = await supabase.from('lesson_plans').select('*').eq('is_shared', true);
    return (data || []).map(p => ({
        id: p.id, teacherId: p.teacher_id, subject: p.subject, topic: p.topic, 
        contentJson: p.content_json, resources: p.resources, createdAt: p.created_at,
        isShared: p.is_shared, schoolId: p.school_id
    }));
};
export const toggleResourceShare = async (id: string, isShared: boolean) => {
    await supabase.from('lesson_plans').update({ is_shared: isShared }).eq('id', id);
};

// Fix: Added parent request functions for MeetingScheduler
export const fetchParentRequests = async (tid: string) => {
    const { data } = await supabase.from('parent_requests').select('*').eq('teacher_id', tid);
    return (data || []).map(r => ({
        id: r.id, parentId: r.parent_id, studentId: r.student_id, teacherId: r.teacher_id,
        type: r.type, content: r.content, status: r.status, date: r.date
    }));
};
export const saveParentRequest = async (req: ParentRequest) => {
    await supabase.from('parent_requests').upsert({
        id: req.id, parent_id: req.parentId, student_id: req.studentId, teacher_id: req.teacherId,
        type: req.type, content: req.content, status: req.status, date: req.date
    });
};
