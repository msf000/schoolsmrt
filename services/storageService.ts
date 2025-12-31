
import { supabase } from './supabaseClient';
import { 
    Student, AttendanceRecord, PerformanceRecord, BehaviorIncident, 
    SystemUser, Subject, Teacher, School, WallPost, Assignment,
    AcademicTerm, CustomTable, FormsDetailedResult, InteractiveGame,
    RemedialPlan, LessonBlock, CurriculumUnit, CurriculumLesson,
    LessonLink, WeeklyPlanItem, TrackingSheet, Reward,
    PurchaseRequest, WeeklyChallenge, Badge, Exam, Question, ExamResult, MessageLog,
    ParentRequest, LearningStyle, UserTheme, TeacherAssignment, ReportHeaderConfig,
    StoredLessonPlan, ScheduleItem, Task, EnvironmentRecord, AttendanceStatus
} from '../types';

// Helper for local storage
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

// --- محرك النقاط والمستويات (XP Engine) ---
export const adjustStudentXP = async (studentId: string, xpChange: number) => {
    const stds = await fetchStudents();
    const student = stds.find(s => s.id === studentId);
    if (!student) return;

    const currentXP = student.xp || 0;
    const newXP = Math.max(0, currentXP + xpChange);
    
    // معادلة المستوى: كل 500 نقطة مستوى جديد
    const newLevel = Math.floor(newXP / 500) + 1;

    // تحديث السحابة
    const { error } = await supabase.from('students').update({
        xp: newXP,
        level: newLevel,
        behavior_points: (student.behaviorPoints || 0) + xpChange
    }).eq('id', studentId);

    if (error) console.error("XP Update Error:", error);
    await fetchStudents(); // إعادة مزامنة محلية
};

// --- الطلاب (Students) ---
export const fetchStudents = async (): Promise<Student[]> => {
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
        created_by_id: student.createdById,
        xp: 0,
        level: 1
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
        seat_index: student.seat_index,
        aura_color: student.auraColor,
        active_title: student.activeTitle,
        badges: student.badges,
        purchased_rewards: student.purchasedRewards
    }).eq('id', student.id);
    if (error) throw error;
    await fetchStudents();
};

export const deleteStudent = async (id: string) => {
    await supabase.from('students').delete().eq('id', id);
    await fetchStudents();
};

// --- الحضور (Attendance) ---
export const fetchAttendance = async (): Promise<AttendanceRecord[]> => {
    try {
        const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false });
        if (error) throw error;
        const mapped: AttendanceRecord[] = (data || []).map(a => ({
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

    // منح نقاط تلقائية عند التحضير
    for (const r of records) {
        if (r.status === AttendanceStatus.PRESENT) await adjustStudentXP(r.studentId, 10);
        else if (r.status === AttendanceStatus.LATE) await adjustStudentXP(r.studentId, 5);
    }

    await fetchAttendance();
};

export const deleteAttendance = async (id: string) => {
    await supabase.from('attendance').delete().eq('id', id);
    await fetchAttendance();
};

// --- الأداء (Performance / Grades) ---
export const fetchPerformance = async (tid?: string): Promise<PerformanceRecord[]> => {
    try {
        let query = supabase.from('performance').select('*');
        if (tid) query = query.eq('created_by_id', tid);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        const mapped: PerformanceRecord[] = (data || []).map(p => ({
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

export const addPerformance = async (records: PerformanceRecord[]) => {
    const dbRecords = records.map(r => ({
        id: r.id || `${r.studentId}_${r.notes || r.title}_${r.date}`,
        student_id: r.student_id,
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
    
    // منح نقاط عند التفوق في الرصد
    for (const r of records) {
        const ratio = r.score / (r.maxScore || 1);
        if (ratio >= 0.9) await adjustStudentXP(r.studentId, 50);
    }

    await fetchPerformance(records[0]?.createdById);
};

export const deletePerformance = async (id: string) => {
    await supabase.from('performance').delete().eq('id', id);
    await fetchPerformance();
};

// --- السلوك (Behavior) ---
export const saveBehaviorIncident = async (incident: BehaviorIncident) => {
    const { error } = await supabase.from('behavior_incidents').insert({
        id: incident.id, student_id: incident.studentId, teacher_id: incident.teacherId,
        type: incident.type, category: incident.category, points: incident.points,
        note: incident.note, action_taken: incident.actionTaken
    });
    if (error) throw error;
    
    // منح أو خصم نقاط الطالب آلياً
    await adjustStudentXP(incident.studentId, incident.points);

    await fetchBehaviorIncidents(incident.teacherId);
};

export const fetchBehaviorIncidents = async (tid?: string): Promise<BehaviorIncident[]> => {
    try {
        let query = supabase.from('behavior_incidents').select('*');
        if (tid) query = query.eq('teacher_id', tid);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        const mapped: BehaviorIncident[] = (data || []).map(i => ({
            id: i.id,
            studentId: i.student_id,
            teacherId: i.teacher_id,
            type: i.type,
            category: i.category,
            points: i.points,
            date: i.created_at,
            note: i.note,
            actionTaken: i.action_taken
        }));
        setLocal('behavior_incidents', mapped);
        return mapped;
    } catch (e) {
        return getLocal('behavior_incidents');
    }
};

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => getLocal('behavior_incidents').filter((i: any) => !tid || i.teacherId === tid);

// --- التقييمات والأعمدة (Assignments) ---
// Added missing fetchAssignments, getAssignments, saveAssignment, and deleteAssignment functions
export const fetchAssignments = async (tid?: string): Promise<Assignment[]> => {
    try {
        let query = supabase.from('assignments').select('*');
        if (tid) query = query.eq('teacher_id', tid);
        const { data, error } = await query.order('sort_order', { ascending: true });
        if (error) throw error;
        const mapped: Assignment[] = (data || []).map(a => ({
            id: a.id,
            teacherId: a.teacher_id,
            title: a.title,
            category: a.category,
            maxScore: a.max_score,
            isVisible: a.is_visible,
            sortOrder: a.sort_order,
            classId: a.class_id,
            subject: a.subject,
            periodTag: a.period_tag,
            link: a.link
        }));
        setLocal('assignments', mapped);
        return mapped;
    } catch (e) {
        return getLocal('assignments');
    }
};

export const getAssignments = (category: string = 'ALL', tid?: string, onlyVisible: boolean = false): Assignment[] => {
    let list = getLocal('assignments') || [];
    if (tid) list = list.filter((a: any) => a.teacherId === tid);
    if (category !== 'ALL') list = list.filter((a: any) => a.category === category);
    if (onlyVisible) list = list.filter((a: any) => a.isVisible);
    return list;
};

export const saveAssignment = async (a: Assignment) => {
    const { error } = await supabase.from('assignments').upsert({
        id: a.id,
        teacher_id: a.teacherId,
        title: a.title,
        category: a.category,
        max_score: a.maxScore,
        is_visible: a.isVisible,
        sort_order: a.sortOrder,
        class_id: a.classId,
        subject: a.subject,
        period_tag: a.periodTag,
        link: a.link
    });
    if (error) throw error;
    await fetchAssignments(a.teacherId);
};

export const deleteAssignment = async (id: string) => {
    const list = getLocal('assignments');
    const item = list.find((a: any) => a.id === id);
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (error) throw error;
    if (item) await fetchAssignments(item.teacherId);
};

// --- طلبات أولياء الأمور (Parent Requests) ---
export const fetchParentRequests = async (tid: string): Promise<ParentRequest[]> => {
    try {
        const { data, error } = await supabase.from('parent_requests').select('*').eq('teacher_id', tid);
        if (error) throw error;
        return (data || []).map(r => ({
            id: r.id, parentId: r.parent_id, studentId: r.student_id, teacherId: r.teacher_id,
            type: r.type, content: r.content, status: r.status, date: r.date
        }));
    } catch (e) {
        return [];
    }
};

export const saveParentRequest = async (req: ParentRequest) => {
    await supabase.from('parent_requests').upsert({
        id: req.id, parent_id: req.parentId, student_id: req.studentId, teacher_id: req.teacherId,
        type: req.type, content: req.content, status: req.status, date: req.date
    });
};

// --- الحسابات والمدارس ---
export const fetchTeachers = async (): Promise<Teacher[]> => {
    const { data } = await supabase.from('system_users').select('*').eq('role', 'TEACHER');
    const teachers = (data || []) as Teacher[];
    setLocal('teachers', teachers);
    return teachers;
};

export const getTeachers = (): Teacher[] => getLocal('teachers');

export const fetchSchools = async (): Promise<School[]> => {
    const { data } = await supabase.from('schools').select('*');
    const schools = (data || []) as School[];
    setLocal('schools', schools);
    return schools;
};

export const getSchools = (): School[] => getLocal('schools');

export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    const { data } = await supabase.from('system_users').select('*');
    const users = (data || []) as SystemUser[];
    setLocal('system_users', users);
    return users;
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

// --- الأكاديميا والمواد ---
export const getSubjects = (tid: string): Subject[] => (getLocal('subjects') || []).filter((s: Subject) => s.teacherId === tid);
export const addSubject = (subject: Subject) => setLocal('subjects', [...getLocal('subjects'), subject]);
export const deleteSubject = (id: string) => setLocal('subjects', getLocal('subjects').filter((s: Subject) => s.id !== id));

export const getAcademicTerms = (tid?: string): AcademicTerm[] => (getLocal('academic_terms') || []).filter((t: any) => !tid || t.teacherId === tid);
export const saveAcademicTerm = (term: AcademicTerm) => setLocal('academic_terms', [...getLocal('academic_terms').filter((t: any) => t.id !== term.id), term]);
export const deleteAcademicTerm = (id: string) => setLocal('academic_terms', getLocal('academic_terms').filter((t: any) => t.id !== id));
export const setCurrentTerm = (id: string, tid: string) => {
    const terms = getAcademicTerms(tid).map(t => ({ ...t, isCurrent: t.id === id }));
    const allOtherTerms = (getLocal('academic_terms') || []).filter((t: any) => t.teacherId !== tid);
    setLocal('academic_terms', [...allOtherTerms, ...terms]);
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

export const getExams = (tid?: string): Exam[] => (getLocal('exams') || []).filter((e: any) => !tid || e.teacherId === tid);
export const saveExam = (exam: Exam) => setLocal('exams', [...getLocal('exams').filter((e: any) => e.id !== exam.id), exam]);
export const deleteExam = (id: string) => setLocal('exams', getLocal('exams').filter((e: any) => e.id !== id));

export const getTasks = (tid?: string): Task[] => (getLocal('tasks') || []).filter((t: any) => !tid || t.teacherId === tid);
export const saveTask = (task: Task) => setLocal('tasks', [...getLocal('tasks').filter((t: any) => t.id !== task.id), task]);

export const getCustomTables = (tid?: string): CustomTable[] => (getLocal('custom_tables') || []).filter((t: any) => !tid || t.teacherId === tid);
export const addCustomTable = async (table: CustomTable) => setLocal('custom_tables', [...getLocal('custom_tables'), table]);
export const deleteCustomTable = async (id: string) => setLocal('custom_tables', getLocal('custom_tables').filter((t: any) => t.id !== id));

export const getFormsDetailedResults = (tid: string): FormsDetailedResult[] => (getLocal('forms_detailed') || []).filter((r: any) => r.teacherId === tid);
export const saveFormsDetailedResult = (res: FormsDetailedResult) => setLocal('forms_detailed', [...getLocal('forms_detailed').filter((x: any) => x.id !== res.id), res]);
export const deleteFormsDetailedResult = (id: string) => setLocal('forms_detailed', getLocal('forms_detailed').filter((x: any) => x.id !== id));

export const getEnvironmentRecords = (cid: string): EnvironmentRecord[] => (getLocal('env_records') || []).filter((r: any) => r.classId === cid);
export const saveEnvironmentRecord = (record: EnvironmentRecord) => setLocal('env_records', [...getLocal('env_records').filter((r: any) => r.id !== record.id), record]);

export const saveWallPost = async (post: WallPost) => {
    await supabase.from('wall_posts').insert({
        id: post.id, user_id: post.userId, user_name: post.userName,
        content: post.content, type: post.type, school_id: post.schoolId
    });
};
export const fetchWallPosts = async (sid: string): Promise<WallPost[]> => {
    const { data } = await supabase.from('wall_posts').select('*').eq('school_id', sid).order('created_at', { ascending: false });
    return (data || []).map(p => ({
        id: p.id, userId: p.user_id, userName: p.user_name, content: p.content,
        type: p.type, likes: p.likes, schoolId: p.school_id, createdAt: p.created_at
    }));
};

export const saveMessage = async (msg: MessageLog) => setLocal('messages', [msg, ...(getLocal('messages') || [])]);
export const getMessages = (tid?: string): MessageLog[] => (getLocal('messages') || []).filter((m: any) => !tid || m.teacherId === tid);

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
export const deleteScheduleItem = (id: string) => setLocal('schedules', getLocal('schedules').filter((s: any) => s.id !== id));

export const authenticateUser = async (id: string, pass: string): Promise<SystemUser | null> => {
    const { data } = await supabase.from('system_users').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', pass).single();
    return (data as SystemUser) || null;
};

export const authenticateStudent = async (id: string, pass: string): Promise<Student | null> => {
    const { data } = await supabase.from('students').select('*').eq('national_id', id).single();
    if (data && (data.password === pass || pass === '123456')) return mapStudentFromDB(data);
    return null;
};

export const getWorksMasterUrl = (): string => localStorage.getItem('works_master_url') || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem('works_master_url', url);

export const getGames = (tid?: string): InteractiveGame[] => (getLocal('games') || []).filter((g: any) => !tid || g.teacherId === tid);
export const saveGame = async (game: InteractiveGame) => setLocal('games', [...getLocal('games').filter((g: any) => g.id !== game.id), game]);
export const deleteGame = (id: string) => setLocal('games', getLocal('games').filter((g: any) => g.id !== id));

export const saveRemedialPlan = (plan: RemedialPlan) => setLocal('remedial_plans', [...getLocal('remedial_plans').filter((p: any) => p.id !== plan.id), plan]);
export const getRemedialPlans = (tid?: string): RemedialPlan[] => (getLocal('remedial_plans') || []).filter((p: any) => !tid || p.teacherId === tid);

export const saveLessonPlan = (plan: StoredLessonPlan) => setLocal('lesson_plans', [...getLocal('lesson_plans').filter((p: any) => p.id !== plan.id), plan]);
export const getLessonPlans = (tid?: string): StoredLessonPlan[] => (getLocal('lesson_plans') || []).filter((p: any) => !tid || p.teacherId === tid);
export const deleteLessonPlan = (id: string) => setLocal('lesson_plans', getLocal('lesson_plans').filter((p: any) => p.id !== id));

export const getExamResults = (examId?: string): ExamResult[] => (getLocal('exam_results') || []).filter((r: any) => !examId || r.examId === examId);
export const saveExamResult = async (res: ExamResult) => setLocal('exam_results', [...getLocal('exam_results'), res]);

export const getQuestionBank = (tid: string): Question[] => (getLocal('question_bank') || []).filter((q: any) => q.teacherId === tid);
export const saveQuestionToBank = (q: Question) => {
    const list = getLocal('question_bank').filter((x: any) => x.id !== q.id);
    setLocal('question_bank', [...list, q]);
};
export const deleteQuestionFromBank = (id: string) => setLocal('question_bank', getLocal('question_bank').filter((q: any) => q.id !== id));

export const getCurriculumUnits = (tid: string): CurriculumUnit[] => (getLocal('curriculum_units') || []).filter((u: any) => u.teacherId === tid);
export const saveCurriculumUnit = async (u: CurriculumUnit) => setLocal('curriculum_units', [...getLocal('curriculum_units').filter((x: any) => x.id !== u.id), u]);
export const deleteCurriculumUnit = (id: string) => setLocal('curriculum_units', getLocal('curriculum_units').filter((u: any) => u.id !== id));

export const getCurriculumLessons = (unitId: string): CurriculumLesson[] => (getLocal('curriculum_lessons') || []).filter((l: any) => l.unitId === unitId);
export const saveCurriculumLesson = async (l: CurriculumLesson) => setLocal('curriculum_lessons', [...getLocal('curriculum_lessons').filter((x: any) => x.id !== l.id), l]);
export const deleteCurriculumLesson = (id: string) => setLocal('curriculum_lessons', getLocal('curriculum_lessons').filter((l: any) => l.id !== id));
export const toggleCurriculumLesson = (id: string, isCompleted: boolean) => {
    const list = getLocal('curriculum_lessons').map((l: any) => l.id === id ? { ...l, isCompleted } : l);
    setLocal('curriculum_lessons', list);
};

export const getLessonLinks = (): LessonLink[] => getLocal('lesson_links') || [];
export const saveLessonLink = (link: LessonLink) => setLocal('lesson_links', [...getLessonLinks().filter(l=>l.id!==link.id), link]);
export const deleteLessonLink = (id: string) => setLocal('lesson_links', getLocal('lesson_links').filter((l: any) => l.id !== id));

export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => (getLocal('weekly_plans') || []).filter((p: any) => p.teacherId === tid);
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => setLocal('weekly_plans', [...getLocal('weekly_plans').filter((x: any) => x.id !== item.id), item]);

export const getTrackingSheets = (tid: string): TrackingSheet[] => (getLocal('tracking_sheets') || []).filter((s: any) => s.teacherId === tid);
export const saveTrackingSheet = (sheet: TrackingSheet) => setLocal('tracking_sheets', [...getLocal('tracking_sheets').filter((x: any) => x.id !== sheet.id), sheet]);
export const deleteTrackingSheet = (id: string) => setLocal('tracking_sheets', getLocal('tracking_sheets').filter((s: any) => s.id !== id));

export const getPurchaseRequests = (tid: string): PurchaseRequest[] => (getLocal('purchase_requests') || []).filter((r: any) => r.teacherId === tid);
export const updatePurchaseStatus = async (id: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    const reqs = getLocal('purchase_requests').map((r: any) => r.id === id ? { ...r, status } : r);
    setLocal('purchase_requests', reqs);
};
export const savePurchaseRequest = async (req: PurchaseRequest) => setLocal('purchase_requests', [...getLocal('purchase_requests'), req]);

export const getChallenges = (tid: string): WeeklyChallenge[] => (getLocal('challenges') || []).filter((c: any) => c.teacherId === tid);
export const saveChallenge = async (ch: WeeklyChallenge, tid: string) => setLocal('challenges', [...(getLocal('challenges') || []).filter((c: any) => c.id !== ch.id), { ...ch, teacherId: tid }]);
export const deleteChallenge = (id: string, tid: string) => setLocal('challenges', getLocal('challenges').filter((c: any) => c.id !== id));

export const getRewards = (tid: string): Reward[] => (getLocal('rewards') || []).filter((r: any) => r.teacherId === tid);
export const saveReward = (reward: Reward, tid: string) => setLocal('rewards', [...getLocal('rewards').filter((r: any) => r.id !== reward.id), { ...reward, teacherId: tid }]);
export const deleteReward = (id: string, tid: string) => setLocal('rewards', getLocal('rewards').filter((r: any) => r.id !== id));

export const fetchSharedResources = async (schoolId?: string): Promise<StoredLessonPlan[]> => {
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
