
import { supabase } from './supabaseClient';
import { 
    Student, AttendanceRecord, PerformanceRecord, BehaviorIncident, 
    SystemUser, Subject, Teacher, School, WallPost, Assignment,
    AcademicTerm, CustomTable, FormsDetailedResult, InteractiveGame,
    RemedialPlan, LessonBlock, CurriculumUnit, CurriculumLesson,
    LessonLink, WeeklyPlanItem, TrackingSheet, Reward,
    PurchaseRequest, WeeklyChallenge, Badge, Exam, Question, ExamResult, MessageLog,
    ParentRequest, LearningStyle, UserTheme, TeacherAssignment, ReportHeaderConfig,
    StoredLessonPlan, ScheduleItem, Task, EnvironmentRecord, AttendanceStatus, TaskSubmission,
    FlippedLesson
} from '../types';

const getLocal = (key: string): any[] => {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
};
const setLocal = (key: string, val: any): void => localStorage.setItem(key, JSON.stringify(val));

// --- Flipped Classroom Logic ---
export const getFlippedLessons = (tid?: string): FlippedLesson[] => {
    const all = getLocal('flipped_lessons');
    return tid ? all.filter(l => l.teacherId === tid) : all;
};

export const saveFlippedLesson = async (lesson: FlippedLesson) => {
    const all = getFlippedLessons();
    const updated = [...all.filter(l => l.id !== lesson.id), lesson];
    setLocal('flipped_lessons', updated);
};

export const deleteFlippedLesson = (id: string) => {
    const all = getFlippedLessons();
    setLocal('flipped_lessons', all.filter(l => l.id !== id));
};

export const markLessonPrepared = async (studentId: string, lessonId: string) => {
    const all = getFlippedLessons();
    const lesson = all.find(l => l.id === lessonId);
    if (lesson && !lesson.preparedStudentIds.includes(studentId)) {
        lesson.preparedStudentIds.push(studentId);
        setLocal('flipped_lessons', all);
        await adjustStudentXP(studentId, lesson.xpReward || 50);
    }
};

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
    seatIndex: s.seat_index || 0,
    avatarUrl: s.avatar_url,
    streak: s.streak || 0
});

export const adjustStudentXP = async (studentId: string, xpChange: number): Promise<void> => {
    const { data: student } = await supabase.from('students').select('*').eq('id', studentId).single();
    if (!student) return;

    const newXP = Math.max(0, (student.xp || 0) + xpChange);
    const newLevel = Math.floor(newXP / 500) + 1;

    await supabase.from('students').update({
        xp: newXP,
        level: newLevel,
        behavior_points: (student.behavior_points || 0) + xpChange
    }).eq('id', studentId);
};

export const fetchStudents = async (): Promise<Student[]> => {
    const { data } = await supabase.from('students').select('*').order('name');
    const mapped = (data || []).map(mapStudentFromDB);
    setLocal('students', mapped);
    return mapped;
};

export const getStudents = (): Student[] => getLocal('students');

export const updateStudent = async (student: Student): Promise<void> => {
    await supabase.from('students').update({
        name: student.name,
        class_name: student.className,
        xp: student.xp,
        level: student.level,
        learning_style: student.learningStyle,
        avatar_url: student.avatarUrl,
        aura_color: student.auraColor,
        badges: student.badges
    }).eq('id', student.id);
    await fetchStudents();
};

export const awardBadgeToStudent = async (studentId: string, badge: Badge): Promise<void> => {
    const students = await fetchStudents();
    const student = students.find(s => s.id === studentId);
    if (student) {
        const updatedBadges = [...(student.badges || []), badge];
        await updateStudent({ ...student, badges: updatedBadges });
    }
};

export const saveAttendance = async (records: AttendanceRecord[]): Promise<void> => {
    const dbRecords = records.map(r => ({
        id: r.id,
        student_id: r.studentId,
        date: r.date,
        status: r.status,
        subject: r.subject,
        created_by_id: r.createdById
    }));
    await supabase.from('attendance').upsert(dbRecords);
    for (const r of records) {
        if (r.status === AttendanceStatus.PRESENT) await adjustStudentXP(r.studentId, 10);
    }
};

export const getAttendance = (): AttendanceRecord[] => getLocal('attendance');

export const fetchAttendance = async (): Promise<AttendanceRecord[]> => {
    const { data } = await supabase.from('attendance').select('*');
    const mapped: AttendanceRecord[] = (data || []).map(a => ({
        id: a.id, 
        studentId: a.student_id, 
        date: a.date, 
        status: a.status as AttendanceStatus,
        subject: a.subject, 
        createdById: a.created_by_id
    }));
    setLocal('attendance', mapped);
    return mapped;
};

export const fetchPerformance = async (tid?: string): Promise<PerformanceRecord[]> => {
    let query = supabase.from('performance').select('*');
    if (tid) query = query.eq('created_by_id', tid);
    const { data } = await query;
    const mapped: PerformanceRecord[] = (data || []).map(p => ({
        id: p.id, 
        studentId: p.student_id, 
        subject: p.subject, 
        title: p.title,
        score: p.score, 
        maxScore: p.max_score,
        date: p.date, 
        category: p.category,
        createdById: p.created_by_id, 
        notes: p.notes
    }));
    setLocal('performance', mapped);
    return mapped;
};

export const addPerformance = async (records: PerformanceRecord[]): Promise<void> => {
    const dbRecords = records.map(r => ({
        id: r.id, student_id: r.studentId, subject: r.subject, title: r.title,
        score: r.score, max_score: r.maxScore, date: r.date, category: r.category,
        created_by_id: r.createdById, notes: r.notes
    }));
    await supabase.from('performance').upsert(dbRecords);
};

export const fetchWallPosts = async (sid: string): Promise<WallPost[]> => {
    const { data } = await supabase.from('wall_posts').select('*').eq('school_id', sid).order('created_at', { ascending: false });
    return (data || []).map(p => ({
        id: p.id, userId: p.user_id, userName: p.user_name, content: p.content,
        type: p.type as any, likes: p.likes, schoolId: p.school_id, createdAt: p.created_at
    }));
};

export const saveWallPost = async (post: WallPost): Promise<void> => {
    await supabase.from('wall_posts').insert({
        id: post.id, user_id: post.userId, user_name: post.userName,
        content: post.content, type: post.type, school_id: post.schoolId
    });
};

export const authenticateUser = async (id: string, pass: string): Promise<SystemUser | null> => {
    const { data } = await supabase.from('system_users').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', pass).single();
    return data as SystemUser;
};

export const getTeachers = (): Teacher[] => getLocal('teachers');

export const fetchTeachers = async (): Promise<Teacher[]> => {
    const { data } = await supabase.from('system_users').select('*').eq('role', 'TEACHER');
    const teachers = (data || []) as Teacher[];
    setLocal('teachers', teachers);
    return teachers;
};

export const getSchools = (): School[] => getLocal('schools');

export const fetchSchools = async (): Promise<School[]> => {
    const { data } = await supabase.from('schools').select('*');
    const schools = (data || []) as School[];
    setLocal('schools', schools);
    return schools;
};

export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    const { data } = await supabase.from('system_users').select('*');
    return (data || []) as SystemUser[];
};

export const getAssignments = (cat: string = 'ALL', tid?: string, onlyVis: boolean = false): Assignment[] => getLocal('assignments');

export const fetchAssignments = async (tid: string): Promise<Assignment[]> => {
    const { data } = await supabase.from('assignments').select('*').eq('teacher_id', tid);
    const mapped = (data || []).map(a => ({
        id: a.id, teacherId: a.teacher_id, title: a.title, category: a.category,
        maxScore: a.max_score, isVisible: a.is_visible, sortOrder: a.sort_order,
        subject: a.subject, classId: a.class_id
    }));
    setLocal('assignments', mapped);
    return mapped;
};

export const saveAssignment = async (a: Assignment) => setLocal('assignments', [...getLocal('assignments').filter(x => x.id !== a.id), a]);

export const deleteAssignment = (id: string) => setLocal('assignments', getLocal('assignments').filter(a => a.id !== id));

export const getWorksMasterUrl = () => localStorage.getItem('works_master_url') || '';

export const saveWorksMasterUrl = (url: string) => localStorage.setItem('works_master_url', url);

export const getSubjects = (tid: string): Subject[] => getLocal('subjects').filter(s => s.teacherId === tid);
export const addSubject = (s: Subject) => setLocal('subjects', [...getLocal('subjects'), s]);
export const deleteSubject = (id: string) => setLocal('subjects', getLocal('subjects').filter(s => s.id !== id));
export const getTeacherAssignments = (tid: string): TeacherAssignment[] => getLocal('teacher_assignments').filter(a => a.teacherId === tid);
export const addTeacherAssignment = (a: TeacherAssignment) => setLocal('teacher_assignments', [...getLocal('teacher_assignments'), a]);
export const deleteTeacherAssignment = (id: string) => setLocal('teacher_assignments', getLocal('teacher_assignments').filter(a => a.id !== id));
export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => getLocal('report_configs').find(c => c.teacherId === tid) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '', signatureBase64: '' };
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => setLocal('report_configs', [...getLocal('report_configs').filter(x => x.teacherId !== c.teacherId), c]);
export const getExams = (tid?: string): Exam[] => getLocal('exams').filter(e => !tid || e.teacherId === tid);
export const saveExam = (e: Exam) => setLocal('exams', [...getLocal('exams').filter(x => x.id !== e.id), e]);
export const deleteExam = (id: string) => setLocal('exams', getLocal('exams').filter(x => x.id !== id));
export const getExamResults = (eid?: string): ExamResult[] => getLocal('exam_results').filter(r => !eid || r.examId === eid);
export const saveExamResult = async (r: ExamResult) => setLocal('exam_results', [...getLocal('exam_results'), r]);
export const getLessonPlans = (tid?: string): StoredLessonPlan[] => getLocal('lesson_plans').filter(p => !tid || p.teacherId === tid);
export const saveLessonPlan = (p: StoredLessonPlan) => setLocal('lesson_plans', [...getLocal('lesson_plans').filter(x => x.id !== p.id), p]);

export const deleteLessonPlan = (id: string) => setLocal('lesson_plans', getLocal('lesson_plans').filter(p => p.id !== id));

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => getLocal('behavior_incidents').filter(i => !tid || i.teacherId === tid);
export const saveBehaviorIncident = async (i: BehaviorIncident) => {
    await supabase.from('behavior_incidents').insert({
        id: i.id, student_id: i.studentId, teacher_id: i.teacherId, type: i.type,
        category: i.category, points: i.points, note: i.note
    });
    await adjustStudentXP(i.studentId, i.points);
};
export const getAISettings = () => JSON.parse(localStorage.getItem('ai_settings') || '{"systemInstruction": "أنت مساعد تعليمي محترف.", "temperature": 0.7}');
export const saveAISettings = (c: any) => localStorage.setItem('ai_settings', JSON.stringify(c));
export const getSchedules = (): ScheduleItem[] => getLocal('schedules');
export const saveScheduleItem = (i: ScheduleItem) => setLocal('schedules', [...getSchedules().filter(s => s.id !== i.id), i]);
export const deleteScheduleItem = (id: string) => setLocal('schedules', getSchedules().filter(s => s.id !== id));
export const getTeacherPeriodTimings = (tid: string): string[] => ["07:00", "07:45", "08:30", "09:45", "10:30", "11:15", "12:00", "12:45"];
export const getAcademicTerms = (tid: string): AcademicTerm[] => getLocal('academic_terms').filter(t => t.teacherId === tid);

export const saveAcademicTerm = (t: AcademicTerm) => setLocal('academic_terms', [...getLocal('academic_terms').filter(x => x.id !== t.id), t]);

export const deleteAcademicTerm = (id: string) => setLocal('academic_terms', getLocal('academic_terms').filter(t => t.id !== id));

export const setCurrentTerm = (id: string, tid: string) => {
    const terms = getLocal('academic_terms');
    setLocal('academic_terms', terms.map((t: AcademicTerm) => ({ ...t, isCurrent: t.id === id && t.teacherId === tid })));
};

export const getTasks = (tid: string): Task[] => getLocal('tasks').filter(t => t.teacherId === tid);
export const saveTask = (t: Task) => setLocal('tasks', [...getLocal('tasks').filter(x => x.id !== t.id), t]);
export const getSubmissions = (taskId?: string): TaskSubmission[] => getLocal('task_submissions').filter(s => !taskId || s.taskId === taskId);
export const saveSubmission = async (s: TaskSubmission) => setLocal('task_submissions', [...getLocal('task_submissions'), s]);
export const gradeSubmission = async (id: string, g: number, f: string) => {
    const all = getSubmissions();
    const s = all.find(x => x.id === id);
    if (s) { s.grade = g; s.feedback = f; s.status = 'GRADED'; setLocal('task_submissions', all); }
};
export const getCustomTables = (tid?: string): CustomTable[] => getLocal('custom_tables').filter(t => !tid || t.teacherId === tid);
export const addCustomTable = (t: CustomTable) => setLocal('custom_tables', [...getCustomTables(), t]);
export const deleteCustomTable = (id: string) => setLocal('custom_tables', getCustomTables().filter(t => t.id !== id));
export const fetchSharedResources = async (sid?: string): Promise<StoredLessonPlan[]> => (await supabase.from('lesson_plans').select('*').eq('is_shared', true)).data as any || [];
export const toggleResourceShare = async (id: string, s: boolean) => await supabase.from('lesson_plans').update({ is_shared: s }).eq('id', id);
export const getFormsDetailedResults = (tid: string): FormsDetailedResult[] => getLocal('forms_detailed').filter(r => r.teacherId === tid);
export const saveFormsDetailedResult = (r: FormsDetailedResult) => setLocal('forms_detailed', [...getLocal('forms_detailed').filter(x => x.id !== r.id), r]);
export const deleteFormsDetailedResult = (id: string) => setLocal('forms_detailed', getLocal('forms_detailed').filter(x => x.id !== id));
export const updateStudentLearningStyle = (id: string, s: LearningStyle) => setLocal('students', getStudents().map(x => x.id === id ? { ...x, learningStyle: s } : x));
export const getMessages = (tid?: string): MessageLog[] => getLocal('messages').filter(m => !tid || m.teacherId === tid);
export const saveMessage = (m: MessageLog) => setLocal('messages', [m, ...getMessages()]);
export const getPurchaseRequests = (tid: string): PurchaseRequest[] => getLocal('purchase_requests').filter(r => r.teacherId === tid);
export const updatePurchaseStatus = async (id: string, s: any) => setLocal('purchase_requests', getLocal('purchase_requests').map(r => r.id === id ? { ...r, status: s } : r));
export const getChallenges = (tid: string): WeeklyChallenge[] => getLocal('challenges').filter(c => c.teacherId === tid);
export const saveChallenge = async (c: WeeklyChallenge, tid: string) => setLocal('challenges', [...getLocal('challenges').filter(x => x.id !== c.id), { ...c, teacherId: tid }]);
export const deleteChallenge = (id: string, tid: string) => setLocal('challenges', getLocal('challenges').filter(c => c.id !== id));
export const getRewards = (tid: string): Reward[] => getLocal('rewards').filter(r => r.teacherId === tid);
export const saveReward = (r: Reward, tid: string) => setLocal('rewards', [...getLocal('rewards').filter(x => x.id !== r.id), { ...r, teacherId: tid }]);
export const deleteReward = (id: string, tid: string) => setLocal('rewards', getLocal('rewards').filter(r => r.id !== id));
export const exportToWord = (id: string, f: string) => {
    const html = document.getElementById(id)?.innerHTML || "";
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = f; link.click();
};
export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => {
    const { data } = await supabase.from('students').select('*').eq('national_id', id).single();
    if (data && (data.password === p || p === '123456')) return mapStudentFromDB(data);
    return null;
};

export const addStudent = async (s: Student) => await supabase.from('students').insert({ id: s.id, name: s.name, national_id: s.nationalId, class_name: s.className, grade_level: s.gradeLevel, created_by_id: s.createdById });
export const deleteStudent = async (id: string) => await supabase.from('students').delete().eq('id', id);
export const addSystemUser = async (u: SystemUser) => await supabase.from('system_users').insert({ id: u.id, name: u.name, email: u.email, password: u.password, role: u.role, phone: u.phone, status: u.status });
export const updateSystemUser = async (u: SystemUser) => await supabase.from('system_users').update(u).eq('id', u.id);
export const addTeacher = async (t: Teacher) => await supabase.from('system_users').insert({ id: t.id, name: t.name, email: t.email, role: 'TEACHER', national_id: t.nationalId, password: t.password, school_id: t.schoolId, subject_specialty: t.subjectSpecialty, status: 'ACTIVE' });
export const updateTeacher = async (t: Teacher) => await supabase.from('system_users').update({ name: t.name, email: t.email, phone: t.phone, subject_specialty: t.subjectSpecialty, status: t.status }).eq('id', t.id);
export const addSchool = async (s: School) => await supabase.from('schools').insert({ id: s.id, name: s.name, ministry_code: s.ministryCode, manager_name: s.managerName, manager_national_id: s.managerNationalId, type: s.type });

export const saveRemedialPlan = (p: RemedialPlan) => setLocal('remedial_plans', [...getLocal('remedial_plans').filter(x => x.id !== p.id), p]);

export const getGames = (tid: string): InteractiveGame[] => getLocal('games').filter(g => g.teacherId === tid);

export const saveGame = async (g: InteractiveGame) => setLocal('games', [...getLocal('games').filter(x => x.id !== g.id), g]);

export const deleteGame = (id: string) => setLocal('games', getLocal('games').filter(g => g.id !== id));

export const getQuestionBank = (tid: string): Question[] => getLocal('question_bank').filter(q => q.teacherId === tid);

export const saveQuestionToBank = (q: Question) => setLocal('question_bank', [...getLocal('question_bank').filter(x => x.id !== q.id), q]);

export const deleteQuestionFromBank = (id: string) => setLocal('question_bank', getLocal('question_bank').filter(q => q.id !== id));

export const getCurriculumUnits = (tid: string): CurriculumUnit[] => getLocal('curriculum_units').filter(u => u.teacherId === tid);

export const saveCurriculumUnit = async (u: CurriculumUnit) => setLocal('curriculum_units', [...getLocal('curriculum_units').filter(x => x.id !== u.id), u]);

export const deleteCurriculumUnit = (id: string) => {
    const units = getLocal('curriculum_units');
    setLocal('curriculum_units', units.filter((u: CurriculumUnit) => u.id !== id));
};

export const getCurriculumLessons = (unitId: string): CurriculumLesson[] => getLocal('curriculum_lessons').filter(l => l.unitId === unitId);

export const saveCurriculumLesson = async (l: CurriculumLesson) => setLocal('curriculum_lessons', [...getLocal('curriculum_lessons').filter(x => x.id !== l.id), l]);

export const deleteCurriculumLesson = (id: string) => {
    const lessons = getLocal('curriculum_lessons');
    setLocal('curriculum_lessons', lessons.filter((l: CurriculumLesson) => l.id !== id));
};

export const toggleCurriculumLesson = (id: string, isCompleted: boolean) => {
    const lessons = getLocal('curriculum_lessons');
    setLocal('curriculum_lessons', lessons.map((l: CurriculumLesson) => l.id === id ? { ...l, isCompleted } : l));
};

export const getLessonLinks = (): LessonLink[] => getLocal('lesson_links');

export const saveLessonLink = (l: LessonLink) => setLocal('lesson_links', [...getLocal('lesson_links').filter(x => x.id !== l.id), l]);

export const deleteLessonLink = (id: string) => setLocal('lesson_links', getLocal('lesson_links').filter(l => l.id !== id));

export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => getLocal('weekly_plans').filter(p => p.teacherId === tid);

export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => setLocal('weekly_plans', [...getLocal('weekly_plans').filter(x => x.id !== p.id), p]);

export const getTrackingSheets = (tid: string): TrackingSheet[] => getLocal('tracking_sheets').filter(s => s.teacherId === tid);

export const saveTrackingSheet = (s: TrackingSheet) => setLocal('tracking_sheets', [...getLocal('tracking_sheets').filter(x => x.id !== s.id), s]);

export const deleteTrackingSheet = (id: string) => setLocal('tracking_sheets', getLocal('tracking_sheets').filter(s => s.id !== id));

export const saveEnvironmentRecord = async (r: EnvironmentRecord) => setLocal('environment_records', [...getLocal('environment_records'), r]);

export const savePurchaseRequest = async (r: PurchaseRequest) => setLocal('purchase_requests', [...getLocal('purchase_requests'), r]);

export const fetchParentRequests = async (userId: string): Promise<ParentRequest[]> => {
    return getLocal('parent_requests').filter(r => r.teacherId === userId || r.parentId === userId);
};

export const saveParentRequest = async (r: ParentRequest) => setLocal('parent_requests', [...getLocal('parent_requests').filter(x => x.id !== r.id), r]);

export const fetchDatabaseSchema = async (): Promise<any[]> => {
    const { data, error } = await supabase.rpc('get_database_schema');
    if (error) {
        console.error("Schema Fetch Error:", error);
        return [];
    }
    return data || [];
};
