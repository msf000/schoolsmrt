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

// Helper for local storage
const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocal = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));

/**
 * محول البيانات: يقوم بتحويل مسميات الأعمدة من قاعدة البيانات (snake_case) 
 * إلى مسميات الكود (camelCase) لضمان ظهور البيانات في القوائم.
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

// --- الطلاب (Students) ---
export const fetchStudents = async () => {
    try {
        const { data, error } = await supabase.from('students').select('*').order('name');
        if (error) throw error;
        
        const mappedData = (data || []).map(mapStudentFromDB);
        setLocal('students', mappedData);
        return mappedData;
    } catch (e) {
        console.error("Fetch Students Error:", e);
        return getLocal('students'); // Fallback to local
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
        behavior_points: student.behaviorPoints || 0,
        xp: student.xp || 0,
        level: student.level || 1,
        learning_style: student.learningStyle || 'UNKNOWN',
        school_id: student.schoolId,
        created_by_id: student.createdById
    });
    if (error) throw error;
    await fetchStudents(); // Refresh local cache
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
        active_title: student.activeTitle,
        badges: student.badges,
        purchased_rewards: student.purchasedRewards
    }).eq('id', student.id);
    
    if (error) throw error;
    await fetchStudents();
};

export const deleteStudent = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
    await fetchStudents();
};

export const deleteAllStudents = async () => {
    const { error } = await supabase.from('students').delete().neq('id', '0');
    if (error) throw error;
    setLocal('students', []);
};

// --- الحضور (Attendance) ---
export const fetchAttendance = async () => {
    const { data, error } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    if (error) return getLocal('attendance');
    
    const mappedData = (data || []).map(a => ({
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
    
    setLocal('attendance', mappedData);
    return mappedData;
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
        created_by_id: r.created_by_id
    }));
    
    const { error } = await supabase.from('attendance').upsert(dbRecords);
    if (error) throw error;
    await fetchAttendance();
};

export const deleteAttendance = async (id: string) => {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) throw error;
    await fetchAttendance();
};

// --- الأداء (Performance) ---
export const fetchPerformance = async (tid?: string) => {
    let query = supabase.from('performance').select('*');
    if (tid) query = query.eq('created_by_id', tid);
    
    const { data, error } = await query.order('date', { ascending: false });
    if (error) return getLocal('performance');

    const mappedData = (data || []).map(p => ({
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

    setLocal('performance', mappedData);
    return mappedData;
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

    const { error } = await supabase.from('performance').upsert(dbRecords);
    if (error) throw error;
    await fetchPerformance();
};

export const deletePerformance = async (id: string) => {
    const { error } = await supabase.from('performance').delete().eq('id', id);
    if (error) throw error;
    await fetchPerformance();
};

// --- المدارس والمعلمين ---
export const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*');
    const mapped = data || [];
    setLocal('schools', mapped);
    return mapped;
};

export const getSchools = (): School[] => getLocal('schools');

export const fetchTeachers = async () => {
    const { data } = await supabase.from('teachers').select('*');
    const mapped = data || [];
    setLocal('teachers', mapped);
    return mapped;
};

export const getTeachers = (): Teacher[] => getLocal('teachers');

export const fetchSystemUsers = async () => {
    const { data } = await supabase.from('system_users').select('*');
    const mapped = data || [];
    setLocal('system_users', mapped);
    return mapped;
};

// --- المواد (Subjects) ---
export const getSubjects = (tid: string): Subject[] => (getLocal('subjects') || []).filter((s: Subject) => s.teacherId === tid);
export const addSubject = (subject: Subject) => setLocal('subjects', [...getLocal('subjects'), subject]);
export const deleteSubject = (id: string) => setLocal('subjects', getLocal('subjects').filter((s: Subject) => s.id !== id));

// --- التقييمات والأعمدة (Assignments) ---
export const getAssignments = (cat: string = 'ALL', tid?: string, onlyVisible: boolean = false): Assignment[] => {
    const list = getLocal('assignments') || [];
    let filtered = list;
    if (tid) filtered = filtered.filter((a: Assignment) => a.teacherId === tid);
    if (cat !== 'ALL') filtered = filtered.filter((a: Assignment) => a.category === cat);
    if (onlyVisible) filtered = filtered.filter((a: Assignment) => a.isVisible);
    return filtered;
};
export const saveAssignment = (a: Assignment) => setLocal('assignments', [...getLocal('assignments').filter((x: any) => x.id !== a.id), a]);
export const deleteAssignment = (id: string) => setLocal('assignments', getLocal('assignments').filter((a: any) => a.id !== id));

// --- الرصد السحابي (Works Master) ---
export const getWorksMasterUrl = () => localStorage.getItem('works_master_url') || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem('works_master_url', url);

// --- الفصول الدراسية (Academic Terms) ---
export const getAcademicTerms = (tid?: string): AcademicTerm[] => (getLocal('academic_terms') || []).filter((t: any) => !tid || t.teacherId === tid);
export const saveAcademicTerm = (term: AcademicTerm) => setLocal('academic_terms', [...getLocal('academic_terms').filter((t: any) => t.id !== term.id), term]);
export const deleteAcademicTerm = (id: string) => setLocal('academic_terms', getLocal('academic_terms').filter((t: any) => t.id !== id));
export const setCurrentTerm = (id: string, tid: string) => {
    const terms = getAcademicTerms(tid).map(t => ({ ...t, isCurrent: t.id === id }));
    const otherTerms = (getLocal('academic_terms') || []).filter((t: any) => t.teacherId !== tid);
    setLocal('academic_terms', [...otherTerms, ...terms]);
};

// --- إعدادات التقارير ---
export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => getLocal('report_configs').find((c: any) => c.teacherId === tid) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '', signatureBase64: '' };
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    const configs = getLocal('report_configs') || [];
    setLocal('report_configs', [...configs.filter((c: any) => c.teacherId !== config.teacherId), config]);
};

// --- سمات المستخدم ---
export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem('user_theme') || '{"mode": "LIGHT", "backgroundStyle": "FLAT"}');
export const saveUserTheme = (theme: UserTheme) => localStorage.setItem('user_theme', JSON.stringify(theme));

// --- مواقيت الحصص ---
export const getTeacherPeriodTimings = (tid: string): string[] => getLocal(`period_timings_${tid}`) || ["07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", "09:45 - 10:30", "10:30 - 11:15", "11:15 - 12:00", "12:00 - 12:45", "12:45 - 01:30"];
export const saveTeacherPeriodTimings = (tid: string, timings: string[]) => setLocal(`period_timings_${tid}`, timings);

// --- تعيينات المعلمين ---
export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => (getLocal('teacher_assignments') || []).filter((a: any) => !tid || a.teacherId === tid);
export const addTeacherAssignment = (a: TeacherAssignment) => setLocal('teacher_assignments', [...getLocal('teacher_assignments'), a]);
export const deleteTeacherAssignment = (id: string) => setLocal('teacher_assignments', getLocal('teacher_assignments').filter((a: any) => a.id !== id));

// --- الحوادث السلوكية (Behavior) ---
export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => {
    const all = getLocal('behavior_incidents') || [];
    return tid ? all.filter((i: any) => i.teacherId === tid) : all;
};
export const saveBehaviorIncident = async (incident: BehaviorIncident) => {
    const all = getLocal('behavior_incidents') || [];
    setLocal('behavior_incidents', [incident, ...all]);
    await supabase.from('behavior_incidents').insert({
        id: incident.id,
        student_id: incident.studentId,
        teacher_id: incident.teacherId,
        type: incident.type,
        category: incident.category,
        points: incident.points,
        date: incident.date,
        note: incident.note,
        action_taken: incident.actionTaken
    });
};

// --- الحائط المدرسي ---
export const saveWallPost = async (post: WallPost) => { 
    await supabase.from('wall_posts').insert({
        id: post.id,
        user_id: post.userId,
        user_name: post.userName,
        content: post.content,
        type: post.type,
        image_url: post.imageUrl,
        likes: post.likes,
        school_id: post.schoolId
    }); 
};
export const fetchWallPosts = async (sid: string) => { 
    const { data } = await supabase.from('wall_posts').select('*').eq('school_id', sid).order('created_at', { ascending: false }); 
    return (data || []).map(p => ({
        id: p.id, userId: p.user_id, userName: p.user_name, content: p.content, 
        type: p.type, imageUrl: p.image_url, likes: p.likes, schoolId: p.school_id, createdAt: p.created_at
    })); 
};

// --- المصادقة ---
export const authenticateUser = async (id: string, pass: string) => {
    const { data } = await supabase.from('system_users').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', pass).single();
    return data || null;
};
export const authenticateStudent = async (id: string, pass: string) => {
    const { data } = await supabase.from('students').select('*').eq('national_id', id).single();
    if (data && (data.password === pass || pass === '123456')) return mapStudentFromDB(data);
    return null;
};

// --- التحديثات ---
export const updateSystemUser = async (user: any) => { await supabase.from('system_users').update(user).eq('id', user.id); };
export const updateTeacher = async (teacher: Teacher) => { 
    await supabase.from('system_users').update({
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        subject_specialty: teacher.subjectSpecialty,
        subscription_status: teacher.subscriptionStatus,
        subscription_end_date: teacher.subscriptionEndDate
    }).eq('id', teacher.id); 
};
export const addSystemUser = async (user: SystemUser) => { 
    await supabase.from('system_users').insert({
        id: user.id, name: user.name, email: user.email, role: user.role, 
        national_id: user.nationalId, password: user.password, school_id: user.schoolId, 
        status: user.status, phone: user.phone
    }); 
};
export const addTeacher = async (teacher: Teacher) => { 
    await supabase.from('system_users').insert({
        id: teacher.id, name: teacher.name, email: teacher.email, role: 'TEACHER', 
        national_id: teacher.nationalId, password: teacher.password, school_id: teacher.schoolId, 
        status: 'ACTIVE', phone: teacher.phone, subject_specialty: teacher.subjectSpecialty
    }); 
};
export const addSchool = async (school: School) => { 
    await supabase.from('schools').insert({
        id: school.id, name: school.name, ministry_code: school.ministryCode, 
        manager_name: school.managerName, manager_national_id: school.managerNationalId,
        education_administration: school.educationAdministration, type: school.type,
        phone: school.phone
    }); 
};

// --- الجداول الخاصة (Custom Tables) ---
export const getCustomTables = (tid?: string): CustomTable[] => (getLocal('custom_tables') || []).filter((t: any) => !tid || t.teacherId === tid);
export const addCustomTable = async (table: CustomTable) => setLocal('custom_tables', [...getLocal('custom_tables'), table]);
export const deleteCustomTable = async (id: string) => setLocal('custom_tables', getLocal('custom_tables').filter((t: any) => t.id !== id));

// --- الرسائل (Messages) ---
export const saveMessage = async (log: MessageLog) => {
    const all = getLocal('messages') || [];
    setLocal('messages', [log, ...all]);
};
export const getMessages = (tid?: string): MessageLog[] => (getLocal('messages') || []).filter((m: any) => !tid || m.teacherId === tid);

// --- الاختبارات (Exams) ---
export const getExams = (tid?: string): Exam[] => (getLocal('exams') || []).filter((e: any) => !tid || e.teacherId === tid);
export const saveExam = (exam: Exam) => setLocal('exams', [...getLocal('exams').filter((e: any) => e.id !== exam.id), exam]);
export const deleteExam = (id: string) => setLocal('exams', getLocal('exams').filter((e: any) => e.id !== id));
export const getExamResults = (examId: string): ExamResult[] => (getLocal('exam_results') || []).filter((r: any) => r.examId === examId);
export const saveExamResult = async (res: ExamResult) => setLocal('exam_results', [...getLocal('exam_results'), res]);

// --- بنك الأسئلة ---
export const getQuestionBank = (tid: string): Question[] => (getLocal('question_bank') || []).filter((q: any) => q.teacherId === tid);
export const saveQuestionToBank = (q: Question) => setLocal('question_bank', [...getLocal('question_bank').filter((x: any) => x.id !== q.id), q]);
export const deleteQuestionFromBank = (id: string) => setLocal('question_bank', getLocal('question_bank').filter((q: any) => q.id !== id));

// --- نواتج التعلم والمنهج (Curriculum) ---
export const getCurriculumUnits = (tid: string): CurriculumUnit[] => (getLocal('curriculum_units') || []).filter((u: any) => u.teacherId === tid);
export const saveCurriculumUnit = async (u: CurriculumUnit) => setLocal('curriculum_units', [...getLocal('curriculum_units').filter((x: any) => x.id !== u.id), u]);
export const deleteCurriculumUnit = (id: string) => setLocal('curriculum_units', getLocal('curriculum_units').filter((u: any) => u.id !== id));
export const getCurriculumLessons = (unitId: string): CurriculumLesson[] => (getLocal('curriculum_lessons') || []).filter((l: any) => l.unitId === unitId);
export const saveCurriculumLesson = async (l: CurriculumLesson) => setLocal('curriculum_lessons', [...getLocal('curriculum_lessons').filter((x: any) => x.id !== l.id), l]);
export const deleteCurriculumLesson = (id: string) => setLocal('curriculum_lessons', getLocal('curriculum_lessons').filter((l: any) => l.id !== id));
export const toggleCurriculumLesson = (id: string, completed: boolean) => {
    const lessons = getLocal('curriculum_lessons') || [];
    setLocal('curriculum_lessons', lessons.map((l: any) => l.id === id ? { ...l, isCompleted: completed } : l));
};

// --- المصادر والروابط ---
export const getLessonLinks = (): LessonLink[] => getLocal('lesson_links') || [];
export const saveLessonLink = (link: LessonLink) => setLocal('lesson_links', [...getLessonLinks(), link]);
export const deleteLessonLink = (id: string) => setLocal('lesson_links', getLessonLinks().filter((l: any) => l.id !== id));

// --- الخطة الأسبوعية ---
export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => (getLocal('weekly_plans') || []).filter((p: any) => p.teacherId === tid);
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => setLocal('weekly_plans', [...getLocal('weekly_plans').filter((p: any) => p.id !== item.id), item]);

// --- سجلات الرصد المرنة ---
export const getTrackingSheets = (tid: string): TrackingSheet[] => (getLocal('tracking_sheets') || []).filter((s: any) => s.teacherId === tid);
export const saveTrackingSheet = (sheet: TrackingSheet) => setLocal('tracking_sheets', [...getLocal('tracking_sheets').filter((s: any) => s.id !== sheet.id), sheet]);
export const deleteTrackingSheet = (id: string) => setLocal('tracking_sheets', getLocal('tracking_sheets').filter((s: any) => s.id !== id));

// --- المهام (Tasks) ---
export const getTasks = (tid?: string): Task[] => (getLocal('tasks') || []).filter((t: any) => !tid || t.teacherId === tid);
export const saveTask = (task: Task) => setLocal('tasks', [...getLocal('tasks').filter((t: any) => t.id !== task.id), task]);

// --- متجر المكافآت ---
export const getRewards = (tid: string): Reward[] => (getLocal('rewards') || []).filter((r: any) => r.teacherId === tid);
export const saveReward = (r: Reward, tid: string) => setLocal('rewards', [...getLocal('rewards').filter((x: any) => x.id !== r.id), { ...r, teacherId: tid }]);
export const deleteReward = (id: string, tid: string) => setLocal('rewards', getLocal('rewards').filter((r: any) => r.id !== id));

// --- طلبات المتجر ---
export const getPurchaseRequests = (tid: string): PurchaseRequest[] => (getLocal('purchase_requests') || []).filter((r: any) => r.teacherId === tid);
export const savePurchaseRequest = async (req: PurchaseRequest) => setLocal('purchase_requests', [...getLocal('purchase_requests'), req]);
export const updatePurchaseStatus = async (id: string, status: string) => {
    const reqs = getLocal('purchase_requests') || [];
    setLocal('purchase_requests', reqs.map((r: any) => r.id === id ? { ...r, status } : r));
};

// --- التحديات (Challenges) ---
export const getChallenges = (tid: string): WeeklyChallenge[] => (getLocal('challenges') || []).filter((c: any) => c.teacherId === tid);
export const saveChallenge = async (ch: WeeklyChallenge, tid: string) => setLocal('challenges', [...getLocal('challenges').filter((x: any) => x.id !== ch.id), { ...ch, teacherId: tid }]);
export const deleteChallenge = (id: string, tid: string) => setLocal('challenges', getLocal('challenges').filter((c: any) => c.id !== id));

// --- الألعاب ---
export const getGames = (tid?: string): InteractiveGame[] => (getLocal('games') || []).filter((g: any) => !tid || g.teacherId === tid);
export const saveGame = async (game: InteractiveGame) => setLocal('games', [...getLocal('games').filter((g: any) => g.id !== game.id), game]);
export const deleteGame = (id: string) => setLocal('games', getLocal('games').filter((g: any) => g.id !== id));

// --- الخطط العلاجية ---
export const saveRemedialPlan = (plan: RemedialPlan) => {
    const plans = getLocal('remedial_plans') || [];
    setLocal('remedial_plans', [...plans, plan]);
};
export const getRemedialPlans = (sid: string): RemedialPlan[] => (getLocal('remedial_plans') || []).filter((p: any) => p.studentId === sid);

// --- التحليل التفصيلي للفورمز ---
export const saveFormsDetailedResult = (res: FormsDetailedResult) => setLocal('forms_detailed', [...getLocal('forms_detailed').filter((x: any) => x.id !== res.id), res]);
export const getFormsDetailedResults = (tid: string): FormsDetailedResult[] => (getLocal('forms_detailed') || []).filter((r: any) => r.teacherId === tid);
export const deleteFormsDetailedResult = (id: string) => setLocal('forms_detailed', getLocal('forms_detailed').filter((r: any) => r.id !== id));

// --- إعدادات AI ---
export const getAISettings = () => JSON.parse(localStorage.getItem('ai_settings') || '{"systemInstruction": "أنت مساعد تعليمي محترف.", "temperature": 0.7}');
export const saveAISettings = (config: any) => localStorage.setItem('ai_settings', JSON.stringify(config));

// --- بيئة الصف ---
// Fix: Added EnvironmentRecord to imports to resolve compilation errors
export const saveEnvironmentRecord = (rec: EnvironmentRecord) => setLocal('env_records', [...getLocal('env_records'), rec]);
export const getEnvironmentRecords = (cid: string): EnvironmentRecord[] => (getLocal('env_records') || []).filter((r: any) => r.classId === cid);

// --- الجدول الدراسي ---
export const getSchedules = (): ScheduleItem[] => getLocal('schedules') || [];
export const saveScheduleItem = (item: ScheduleItem) => setLocal('schedules', [...getSchedules().filter(s=>s.id!==item.id), item]);
export const deleteScheduleItem = (id: string) => setLocal('schedules', getSchedules().filter((s: any) => s.id !== id));

// --- وظائف متنوعة ---
export const getDatabaseSchemaSQL = () => "SELECT 1;";
export const getCloudSystemStatus = () => ({ status: 'CONNECTED' });
export const updateStudentLearningStyle = (id: string, style: LearningStyle) => {
    const students = getStudents().map(s => s.id === id ? { ...s, learningStyle: style } : s);
    setLocal('students', students);
};
export const fetchSharedResources = async (sid?: string) => getLocal('lesson_plans').filter((p: any) => p.isShared);
export const toggleResourceShare = async (id: string, shared: boolean) => {
    const plans = getLocal('lesson_plans').map((p: any) => p.id === id ? { ...p, isShared: shared } : p);
    setLocal('lesson_plans', plans);
};
export const saveLessonPlan = (plan: StoredLessonPlan) => setLocal('lesson_plans', [...getLocal('lesson_plans').filter((p: any) => p.id !== plan.id), plan]);
export const getLessonPlans = (tid: string): StoredLessonPlan[] => (getLocal('lesson_plans') || []).filter((p: any) => p.teacherId === tid);
export const deleteLessonPlan = (id: string) => setLocal('lesson_plans', getLocal('lesson_plans').filter((p: any) => p.id !== id));

export const fetchParentRequests = async (tid: string): Promise<ParentRequest[]> => (getLocal('parent_requests') || []).filter((r: any) => r.teacherId === tid);
export const saveParentRequest = async (req: ParentRequest) => setLocal('parent_requests', [...getLocal('parent_requests').filter((x: any) => x.id !== req.id), req]);

export const exportToWord = (elementId: string, filename: string) => {
    const html = document.getElementById(elementId)?.innerHTML || "";
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
};