
import { supabase } from './supabaseClient';
import { 
    Student, AttendanceRecord, PerformanceRecord, 
    SystemUser, Subject, ScheduleItem, BehaviorIncident,
    Exam, Assignment, AcademicTerm, TeacherAssignment,
    School, ReportHeaderConfig, UserTheme, CustomTable,
    InteractiveGame, MessageLog, EnvironmentRecord,
    StoredLessonPlan, ExamResult, Question, CurriculumUnit,
    CurriculumLesson, LessonLink, WeeklyPlanItem, TrackingSheet,
    Task, RemedialPlan, PurchaseRequest, Reward, WallPost,
    ParentRequest, WeeklyChallenge, Teacher
} from '../types';

const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocal = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));

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
    learningStyle: s.learning_style || 'UNKNOWN',
    auraColor: s.aura_color || 'indigo',
    activeTitle: s.active_title,
    schoolId: s.school_id,
    createdById: s.created_by_id
});

export const fetchStudents = async () => {
    try {
        const { data, error } = await supabase.from('students').select('*').order('name');
        if (error) throw error;
        const mapped = (data || []).map(mapStudentFromDB);
        setLocal('students', mapped);
        return mapped;
    } catch (e) {
        return getLocal('students');
    }
};

export const getStudents = (): Student[] => getLocal('students');

export const addStudent = async (student: Student) => {
    const { error } = await supabase.from('students').insert([{
        id: student.id,
        name: student.name,
        national_id: student.nationalId,
        class_id: student.classId,
        grade_level: student.gradeLevel,
        class_name: student.className,
        parent_phone: student.parentPhone,
        created_by_id: student.createdById
    }]);
    if (error) throw error;
    const local = getStudents();
    setLocal('students', [...local, student]);
};

export const updateStudent = async (student: Student) => {
    const { error } = await supabase.from('students').update({
        name: student.name,
        class_id: student.classId,
        grade_level: student.gradeLevel,
        class_name: student.className,
        parent_phone: student.parentPhone,
        behavior_points: student.behaviorPoints,
        xp: student.xp,
        level: student.level,
        learning_style: student.learningStyle,
        aura_color: student.auraColor,
        active_title: student.activeTitle
    }).eq('id', student.id);
    if (error) throw error;
    const local = getStudents();
    setLocal('students', local.map(s => s.id === student.id ? student : s));
};

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
    
    const { error } = await supabase.from('attendance').upsert(dbRecords);
    if (error) throw error;
    
    const local = getLocal('attendance');
    const filtered = local.filter((l: any) => !records.some(r => r.id === l.id));
    setLocal('attendance', [...filtered, ...records]);
};

export const fetchAttendance = async () => {
    try {
        const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false });
        if (error) throw error;
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
    } catch (e) {
        return getLocal('attendance');
    }
};

export const getAttendance = (): AttendanceRecord[] => getLocal('attendance');

export const deleteAttendance = async (id: string) => {
    await supabase.from('attendance').delete().eq('id', id);
    const local = getLocal('attendance').filter((a: any) => a.id !== id);
    setLocal('attendance', local);
};

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
    const { error } = await supabase.from('performance').upsert(dbRecords);
    if (error) throw error;
    const local = getLocal('performance');
    const filtered = local.filter((l: any) => !records.some(r => r.id === l.id));
    setLocal('performance', [...filtered, ...records]);
};

export const fetchPerformance = async (tid?: string) => {
    try {
        const query = supabase.from('performance').select('*').order('date', { ascending: false });
        if (tid) query.eq('created_by_id', tid);
        const { data, error } = await query;
        if (error) throw error;
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
    } catch (e) {
        return getLocal('performance');
    }
};

export const deletePerformance = async (id: string) => {
    await supabase.from('performance').delete().eq('id', id);
    const local = getLocal('performance').filter((p: any) => p.id !== id);
    setLocal('performance', local);
};

export const getSubjects = (tid: string): Subject[] => {
    return getLocal(`subjects_${tid}`) || [];
};

export const addSubject = (subject: Subject) => {
    const list = getSubjects(subject.teacherId);
    setLocal(`subjects_${subject.teacherId}`, [...list, subject]);
};

export const deleteSubject = (id: string) => {
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
    if (!currentUser.id) return;
    const list = getSubjects(currentUser.id);
    setLocal(`subjects_${currentUser.id}`, list.filter(s => s.id !== id));
};

export const getSchedules = (): ScheduleItem[] => getLocal('schedules');
export const saveScheduleItem = (item: ScheduleItem) => {
    const list = getSchedules();
    setLocal('schedules', [...list.filter(i => i.id !== item.id), item]);
};

export const deleteScheduleItem = (id: string) => {
    setLocal('schedules', getSchedules().filter(i => i.id !== id));
};

export const getTeacherPeriodTimings = (tid: string): string[] => 
    getLocal(`period_timings_${tid}`) || ["07:00", "07:45", "08:30", "09:45", "10:30", "11:15", "12:00", "12:45"];

export const saveTeacherPeriodTimings = (tid: string, timings: string[]) => {
    setLocal(`period_timings_${tid}`, timings);
};

export const saveBehaviorIncident = async (incident: BehaviorIncident) => {
    const { error } = await supabase.from('behavior_incidents').insert([{
        id: incident.id,
        student_id: incident.studentId,
        teacher_id: incident.teacherId,
        type: incident.type,
        category: incident.category,
        points: incident.points,
        date: incident.date,
        note: incident.note,
        action_taken: incident.actionTaken
    }]);
    if (error) throw error;
    const local = getLocal('behavior_incidents');
    setLocal('behavior_incidents', [...local, incident]);
};

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => {
    const all = getLocal('behavior_incidents');
    return tid ? all.filter((i: BehaviorIncident) => i.teacherId === tid) : all;
};

export const getExams = (tid: string): Exam[] => {
    const all = getLocal('exams');
    return all.filter((e: Exam) => e.teacherId === tid);
};

export const saveExam = (exam: Exam) => {
    const all = getLocal('exams');
    setLocal('exams', [...all.filter((e: Exam) => e.id !== exam.id), exam]);
};

export const deleteExam = (id: string) => {
    const all = getLocal('exams');
    setLocal('exams', all.filter((e: Exam) => e.id !== id));
};

export const getAssignments = (category: string = 'ALL', tid?: string, onlyVisible: boolean = false): Assignment[] => {
    let all = getLocal('assignments');
    if (tid) all = all.filter((a: Assignment) => a.teacherId === tid);
    if (category !== 'ALL') all = all.filter((a: Assignment) => a.category === category);
    if (onlyVisible) all = all.filter((a: Assignment) => a.isVisible);
    return all;
};

export const saveAssignment = (assignment: Assignment) => {
    const all = getLocal('assignments');
    setLocal('assignments', [...all.filter((a: Assignment) => a.id !== assignment.id), assignment]);
};

export const deleteAssignment = (id: string) => {
    const all = getLocal('assignments');
    setLocal('assignments', all.filter((a: Assignment) => a.id !== id));
};

export const getTeacherAssignments = (tid: string): TeacherAssignment[] => {
    const all = getLocal('teacher_assignments');
    return all.filter((a: TeacherAssignment) => a.teacherId === tid);
};

export const addTeacherAssignment = (assignment: TeacherAssignment) => {
    const all = getLocal('teacher_assignments');
    setLocal('teacher_assignments', [...all, assignment]);
};

export const deleteTeacherAssignment = (id: string) => {
    const all = getLocal('teacher_assignments');
    setLocal('teacher_assignments', all.filter((a: TeacherAssignment) => a.id !== id));
};

export const getAcademicTerms = (tid?: string): AcademicTerm[] => {
    const all = getLocal('academic_terms');
    return tid ? all.filter((t: AcademicTerm) => t.teacherId === tid) : all;
};

export const saveAcademicTerm = (term: AcademicTerm) => {
    const all = getLocal('academic_terms');
    setLocal('academic_terms', [...all.filter((t: AcademicTerm) => t.id !== term.id), term]);
};

export const deleteAcademicTerm = (id: string) => {
    const all = getLocal('academic_terms');
    setLocal('academic_terms', all.filter((t: AcademicTerm) => t.id !== id));
};

export const setCurrentTerm = (id: string, tid: string) => {
    const terms = getAcademicTerms(tid);
    const updated = terms.map(t => ({ ...t, isCurrent: t.id === id }));
    const others = getLocal('academic_terms').filter((t: AcademicTerm) => t.teacherId !== tid);
    setLocal('academic_terms', [...others, ...updated]);
};

export const fetchTeachers = async () => {
    const { data } = await supabase.from('system_users').select('*').eq('role', 'TEACHER');
    setLocal('teachers', data || []);
    return data || [];
};

export const getTeachers = (): Teacher[] => getLocal('teachers');

export const updateTeacher = async (teacher: Teacher) => {
    const { error } = await supabase.from('system_users').update({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        subject_specialty: teacher.subjectSpecialty,
        subscription_status: teacher.subscriptionStatus,
        subscription_end_date: teacher.subscriptionEndDate
    }).eq('id', teacher.id);
    if (error) throw error;
    const local = getTeachers();
    setLocal('teachers', local.map(t => t.id === teacher.id ? teacher : t));
};

export const fetchSystemUsers = async () => {
    const { data } = await supabase.from('system_users').select('*');
    setLocal('system_users', data || []);
    return data || [];
};

export const addSystemUser = async (user: SystemUser) => {
    const { error } = await supabase.from('system_users').insert([{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        national_id: user.nationalId,
        password: user.password,
        school_id: user.schoolId,
        status: user.status,
        phone: user.phone
    }]);
    if (error) throw error;
    const local = getLocal('system_users');
    setLocal('system_users', [...local, user]);
};

export const updateSystemUser = async (user: SystemUser) => {
    const { error } = await supabase.from('system_users').update({
        name: user.name,
        email: user.email,
        phone: user.phone
    }).eq('id', user.id);
    if (error) throw error;
};

export const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*');
    setLocal('schools', data || []);
    return data || [];
};

export const getSchools = (): School[] => getLocal('schools');

export const addSchool = async (school: School) => {
    const { error } = await supabase.from('schools').insert([{
        id: school.id,
        name: school.name,
        ministry_code: school.ministryCode,
        manager_name: school.managerName,
        manager_national_id: school.managerNationalId,
        education_administration: school.educationAdministration,
        type: school.type,
        phone: school.phone
    }]);
    if (error) throw error;
    const local = getSchools();
    setLocal('schools', [...local, school]);
};

export const addCustomTable = async (table: CustomTable) => {
    const local = getLocal('custom_tables');
    setLocal('custom_tables', [...local, table]);
};

export const getCustomTables = (tid?: string): CustomTable[] => {
    const all = getLocal('custom_tables');
    return tid ? all.filter((t: CustomTable) => t.teacherId === tid) : all;
};

export const deleteCustomTable = async (id: string) => {
    const local = getLocal('custom_tables');
    setLocal('custom_tables', local.filter((t: CustomTable) => t.id !== id));
};

export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => {
    const configs = getLocal('report_configs');
    return configs.find((c: ReportHeaderConfig) => c.teacherId === tid) || {
        schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '', signatureBase64: ''
    };
};

export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    const configs = getLocal('report_configs');
    setLocal('report_configs', [...configs.filter((c: ReportHeaderConfig) => c.teacherId !== config.teacherId), config]);
};

export const getUserTheme = (): UserTheme => getLocal('user_theme')[0] || { mode: 'LIGHT', backgroundStyle: 'FLAT' };
export const saveUserTheme = (theme: UserTheme) => setLocal('user_theme', [theme]);

export const authenticateUser = async (idOrEmail: string, pass: string): Promise<SystemUser | null> => {
    const { data, error } = await supabase.from('system_users')
        .select('*')
        .or(`national_id.eq.${idOrEmail},email.eq.${idOrEmail}`)
        .eq('password', pass)
        .single();
    
    if (error || !data) return null;
    return {
        id: data.id, name: data.name, email: data.email, role: data.role, nationalId: data.national_id, 
        password: data.password, schoolId: data.school_id, status: data.status, phone: data.phone
    };
};

export const authenticateStudent = async (nationalId: string, pass: string): Promise<Student | null> => {
    const { data, error } = await supabase.from('students')
        .select('*')
        .eq('national_id', nationalId)
        .eq('password', pass)
        .single();
    
    if (error || !data) return null;
    return mapStudentFromDB(data);
};

export const getGames = (tid?: string): InteractiveGame[] => {
    const all = getLocal('interactive_games');
    return tid ? all.filter((g: InteractiveGame) => g.teacherId === tid) : all;
};

export const saveGame = async (game: InteractiveGame) => {
    const { error } = await supabase.from('interactive_games').upsert([{
        id: game.id,
        teacher_id: game.teacherId,
        title: game.title,
        subject: game.subject,
        type: game.type,
        content: game.content,
        xp_reward: game.xpReward,
        target_class: game.targetClass
    }]);
    if (error) throw error;
    const local = getLocal('interactive_games');
    setLocal('interactive_games', [...local.filter((g: any) => g.id !== game.id), game]);
};

export const deleteGame = async (id: string) => {
    await supabase.from('interactive_games').delete().eq('id', id);
    const local = getLocal('interactive_games');
    setLocal('interactive_games', local.filter((g: any) => g.id !== id));
};

export const saveMessage = async (msg: MessageLog) => {
    const local = getLocal('messages');
    setLocal('messages', [msg, ...local]);
};

export const getMessages = (tid?: string): MessageLog[] => {
    const all = getLocal('messages');
    return tid ? all.filter((m: MessageLog) => m.teacherId === tid) : all;
};

export const saveRemedialPlan = (plan: RemedialPlan) => {
    const all = getLocal('remedial_plans');
    setLocal('remedial_plans', [...all, plan]);
};

export const getRemedialPlans = (sid: string): RemedialPlan[] => {
    const all = getLocal('remedial_plans');
    return all.filter((p: RemedialPlan) => p.studentId === sid);
};

export const getEnvironmentRecords = (classId: string): EnvironmentRecord[] => {
    const all = getLocal('environment_records');
    return all.filter((e: EnvironmentRecord) => e.classId === classId);
};

export const saveEnvironmentRecord = (record: EnvironmentRecord) => {
    const all = getLocal('environment_records');
    setLocal('environment_records', [...all, record]);
};

export const saveLessonPlan = async (plan: StoredLessonPlan) => {
    const local = getLocal('lesson_plans');
    setLocal('lesson_plans', [...local.filter((p: any) => p.id !== plan.id), plan]);
};

export const getLessonPlans = (tid: string): StoredLessonPlan[] => {
    const all = getLocal('lesson_plans');
    return all.filter((p: StoredLessonPlan) => p.teacherId === tid);
};

export const deleteLessonPlan = (id: string) => {
    const all = getLocal('lesson_plans');
    setLocal('lesson_plans', all.filter((p: StoredLessonPlan) => p.id !== id));
};

export const getWorksMasterUrl = (): string => localStorage.getItem('works_master_url') || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem('works_master_url', url);

export const getFormsDetailedResults = (tid: string): FormsDetailedResult[] => {
    const all = getLocal('forms_detailed_results');
    return all.filter((r: FormsDetailedResult) => r.teacherId === tid);
};

export const saveFormsDetailedResult = (record: FormsDetailedResult) => {
    const all = getLocal('forms_detailed_results');
    setLocal('forms_detailed_results', [...all, record]);
};

export const deleteFormsDetailedResult = (id: string) => {
    const all = getLocal('forms_detailed_results');
    setLocal('forms_detailed_results', all.filter((r: FormsDetailedResult) => r.id !== id));
};

export const updateStudentLearningStyle = (sid: string, style: LearningStyle) => {
    const students = getStudents();
    const updated = students.map(s => s.id === sid ? { ...s, learningStyle: style } : s);
    setLocal('students', updated);
};

export const getChallenges = (tid: string): WeeklyChallenge[] => {
    const all = getLocal('weekly_challenges');
    return all.filter((c: WeeklyChallenge) => (c as any).teacherId === tid);
};

export const saveChallenge = async (ch: WeeklyChallenge, tid: string) => {
    const all = getLocal('weekly_challenges');
    setLocal('weekly_challenges', [...all.filter((c: any) => c.id !== ch.id), { ...ch, teacherId: tid }]);
};

export const deleteChallenge = (id: string, tid: string) => {
    const all = getLocal('weekly_challenges');
    setLocal('weekly_challenges', all.filter((c: any) => c.id !== id));
};

export const getRewards = (tid: string): Reward[] => {
    const all = getLocal('rewards');
    return all.filter((r: any) => r.teacherId === tid);
};

export const saveReward = (reward: Reward, tid: string) => {
    const all = getLocal('rewards');
    setLocal('rewards', [...all.filter((r: any) => r.id !== reward.id), { ...reward, teacherId: tid }]);
};

export const deleteReward = (id: string, tid: string) => {
    const all = getLocal('rewards');
    setLocal('rewards', all.filter((r: any) => r.id !== id));
};

export const saveExamResult = async (res: ExamResult) => {
    const all = getLocal('exam_results');
    setLocal('exam_results', [...all, res]);
};

export const getExamResults = (examId: string): ExamResult[] => {
    const all = getLocal('exam_results');
    return all.filter((r: ExamResult) => r.examId === examId);
};

export const savePurchaseRequest = async (req: PurchaseRequest) => {
    const all = getLocal('purchase_requests');
    setLocal('purchase_requests', [...all, req]);
};

export const getPurchaseRequests = (tid: string): PurchaseRequest[] => {
    const all = getLocal('purchase_requests');
    return all.filter((r: PurchaseRequest) => r.teacherId === tid);
};

export const updatePurchaseStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const all = getLocal('purchase_requests');
    setLocal('purchase_requests', all.map((r: PurchaseRequest) => r.id === id ? { ...r, status } : r));
};

export const fetchWallPosts = async (schoolId: string) => {
    const { data } = await supabase.from('wall_posts').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
    return (data || []).map(p => ({
        id: p.id, userId: p.user_id, userName: p.user_name, content: p.content, type: p.type, 
        imageUrl: p.image_url, likes: p.likes, schoolId: p.school_id, createdAt: p.created_at
    })) as WallPost[];
};

export const saveWallPost = async (post: WallPost) => {
    await supabase.from('wall_posts').insert([{
        id: post.id, user_id: post.userId, user_name: post.userName, content: post.content, 
        type: post.type, image_url: post.imageUrl, school_id: post.schoolId
    }]);
};

export const fetchSharedResources = async (schoolId?: string) => {
    let query = supabase.from('lesson_plans').select('*').eq('is_shared', true);
    if (schoolId) query = query.eq('school_id', schoolId);
    const { data } = await query;
    return (data || []).map(p => ({
        id: p.id, teacherId: p.teacher_id, subject: p.subject, topic: p.topic, 
        contentJson: p.content_json, resources: p.resources, createdAt: p.created_at, 
        isShared: p.is_shared, schoolId: p.school_id
    })) as StoredLessonPlan[];
};

export const toggleResourceShare = async (id: string, shared: boolean) => {
    await supabase.from('lesson_plans').update({ is_shared: shared }).eq('id', id);
};

export const fetchParentRequests = async (tid: string) => {
    const { data } = await supabase.from('parent_requests').select('*').eq('teacher_id', tid);
    return (data || []).map(r => ({
        id: r.id, parentId: r.parent_id, studentId: r.student_id, teacherId: r.teacher_id, 
        type: r.type, content: r.content, status: r.status, date: r.date
    })) as ParentRequest[];
};

export const saveParentRequest = async (req: ParentRequest) => {
    await supabase.from('parent_requests').upsert([{
        id: req.id, parent_id: req.parentId, student_id: req.studentId, teacher_id: req.teacherId, 
        type: req.type, content: req.content, status: req.status, date: req.date
    }]);
};

export const getQuestionBank = (tid: string): Question[] => {
    const all = getLocal('question_bank');
    return all.filter((q: Question) => q.teacherId === tid);
};

export const saveQuestionToBank = (q: Question) => {
    const all = getLocal('question_bank');
    setLocal('question_bank', [...all.filter((item: Question) => item.id !== q.id), q]);
};

export const deleteQuestionFromBank = (id: string) => {
    const all = getLocal('question_bank');
    setLocal('question_bank', all.filter((q: Question) => q.id !== id));
};

export const getCurriculumUnits = (tid: string): CurriculumUnit[] => {
    const all = getLocal('curriculum_units');
    return all.filter((u: CurriculumUnit) => u.teacherId === tid);
};

export const saveCurriculumUnit = (u: CurriculumUnit) => {
    const all = getLocal('curriculum_units');
    setLocal('curriculum_units', [...all.filter((item: CurriculumUnit) => item.id !== u.id), u]);
};

export const deleteCurriculumUnit = (id: string) => {
    const all = getLocal('curriculum_units');
    setLocal('curriculum_units', all.filter((u: CurriculumUnit) => u.id !== id));
};

export const getCurriculumLessons = (unitId: string): CurriculumLesson[] => {
    const all = getLocal('curriculum_lessons');
    return all.filter((l: CurriculumLesson) => l.unitId === unitId);
};

export const saveCurriculumLesson = (l: CurriculumLesson) => {
    const all = getLocal('curriculum_lessons');
    setLocal('curriculum_lessons', [...all.filter((item: CurriculumLesson) => item.id !== l.id), l]);
};

export const deleteCurriculumLesson = (id: string) => {
    const all = getLocal('curriculum_lessons');
    setLocal('curriculum_lessons', all.filter((l: CurriculumLesson) => l.id !== id));
};

export const toggleCurriculumLesson = (id: string, completed: boolean) => {
    const all = getLocal('curriculum_lessons');
    setLocal('curriculum_lessons', all.map((l: CurriculumLesson) => l.id === id ? { ...l, isCompleted: completed } : l));
};

export const getLessonLinks = (): LessonLink[] => getLocal('lesson_links');

export const saveLessonLink = (link: LessonLink) => {
    const all = getLocal('lesson_links');
    setLocal('lesson_links', [...all, link]);
};

export const deleteLessonLink = (id: string) => {
    const all = getLocal('lesson_links');
    setLocal('lesson_links', all.filter((l: LessonLink) => l.id !== id));
};

export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => {
    const all = getLocal('weekly_plans');
    return all.filter((p: WeeklyPlanItem) => p.teacherId === tid);
};

export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => {
    const all = getLocal('weekly_plans');
    setLocal('weekly_plans', [...all.filter((p: WeeklyPlanItem) => p.id !== item.id), item]);
};

export const getTrackingSheets = (tid: string): TrackingSheet[] => {
    const all = getLocal('tracking_sheets');
    return all.filter((s: TrackingSheet) => s.teacherId === tid);
};

export const saveTrackingSheet = (sheet: TrackingSheet) => {
    const all = getLocal('tracking_sheets');
    setLocal('tracking_sheets', [...all.filter((s: TrackingSheet) => s.id !== sheet.id), sheet]);
};

export const deleteTrackingSheet = (id: string) => {
    const all = getLocal('tracking_sheets');
    setLocal('tracking_sheets', all.filter((s: TrackingSheet) => s.id !== id));
};

export const getTasks = (tid?: string): Task[] => {
    const all = getLocal('tasks');
    return tid ? all.filter((t: Task) => t.teacherId === tid) : all;
};

export const saveTask = (task: Task) => {
    const all = getLocal('tasks');
    setLocal('tasks', [...all.filter((t: Task) => t.id !== task.id), task]);
};

export const getAISettings = () => {
    return JSON.parse(localStorage.getItem('ai_settings') || '{"temperature": 0.7, "systemInstruction": "أنت مساعد تعليمي ذكي."}');
};

export const saveAISettings = (config: any) => {
    localStorage.setItem('ai_settings', JSON.stringify(config));
};

export const getDatabaseSchemaSQL = () => `-- SMART SCHOOL MASTER SCHEMA v2.5
-- SQL Script generated for Admin repair.`;

export const getCloudSystemStatus = () => ({ status: 'STABLE', latency: '18ms' });

export const exportToWord = (elementId: string, filename: string) => {
    const content = document.getElementById(elementId)?.innerHTML || '';
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
};
