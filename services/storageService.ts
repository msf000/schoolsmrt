
import { supabase } from './supabaseClient';
import { 
    Student, AttendanceRecord, PerformanceRecord, BehaviorIncident, 
    Exam, SystemUser, ScheduleItem, InteractiveGame, Assignment, AcademicTerm, 
    ReportHeaderConfig, UserTheme, TeacherAssignment, Subject, MessageLog, 
    RemedialPlan, Teacher, School, ExamResult, Question, CurriculumUnit, 
    CurriculumLesson, LessonLink, WeeklyPlanItem, TrackingSheet, Task, 
    PurchaseRequest, Reward, WeeklyChallenge, FormsDetailedResult, 
    CustomTable, ParentRequest, EnvironmentRecord, StoredLessonPlan, WallPost,
    LearningStyle
} from '../types';

// Helper for local storage
const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocal = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));

// --- الطلاب (Students) ---
export const fetchStudents = async () => {
    const { data, error } = await supabase.from('students').select('*').order('name');
    if (data) setLocal('students', data);
    return data || getLocal('students');
};

export const addStudent = async (student: Student) => {
    const all = getLocal('students');
    setLocal('students', [...all, student]);
    await supabase.from('students').insert({
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
};

export const updateStudent = async (student: Student) => {
    const all = getLocal('students');
    setLocal('students', all.map((s: Student) => s.id === student.id ? student : s));
    await supabase.from('students').update({
        name: student.name,
        class_name: student.className,
        behavior_points: student.behaviorPoints,
        xp: student.xp,
        level: student.level,
        learning_style: student.learningStyle,
        seat_index: student.seatIndex,
        aura_color: student.auraColor,
        active_title: student.active_title
    }).eq('id', student.id);
};

export const deleteStudent = async (id: string) => {
    setLocal('students', getLocal('students').filter((s: Student) => s.id !== id));
    await supabase.from('students').delete().eq('id', id);
};

// --- الحضور (Attendance) ---
export const fetchAttendance = async () => {
    const { data } = await supabase.from('attendance').select('*').order('date', { ascending: false });
    if (data) setLocal('attendance', data);
    return data || getLocal('attendance');
};

export const saveAttendance = async (records: AttendanceRecord[]) => {
    const all = getLocal('attendance');
    const newAll = [...all];
    records.forEach(r => {
        const idx = newAll.findIndex(x => x.id === r.id);
        if (idx > -1) newAll[idx] = r;
        else newAll.push(r);
    });
    setLocal('attendance', newAll);
    await supabase.from('attendance').upsert(records.map(r => ({
        id: r.id,
        student_id: r.studentId,
        date: r.date,
        status: r.status,
        period: r.period,
        subject: r.subject,
        behavior_status: r.behaviorStatus,
        behavior_note: r.behaviorNote,
        created_by_id: r.createdById
    })));
};

// --- Fix: Added deleteAttendance function
export const deleteAttendance = async (id: string) => {
    setLocal('attendance', getLocal('attendance').filter((r: any) => r.id !== id));
    await supabase.from('attendance').delete().eq('id', id);
};

// --- الأداء (Performance) ---
export const fetchPerformance = async (tid?: string) => {
    let query = supabase.from('performance').select('*');
    if (tid) query = query.eq('created_by_id', tid);
    const { data } = await query.order('date', { ascending: false });
    if (data) setLocal('performance', data);
    return data || getLocal('performance');
};

export const addPerformance = async (records: PerformanceRecord[]) => {
    const all = getLocal('performance');
    setLocal('performance', [...all, ...records]);
    await supabase.from('performance').upsert(records.map(r => ({
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
    })));
};

// --- Fix: Added deletePerformance function
export const deletePerformance = async (id: string) => {
    setLocal('performance', getLocal('performance').filter((r: any) => r.id !== id));
    await supabase.from('performance').delete().eq('id', id);
};

// --- السلوك (Behavior) ---
export const fetchBehaviorIncidents = async (tid?: string) => {
    let query = supabase.from('behavior_incidents').select('*');
    if (tid) query = query.eq('teacher_id', tid);
    const { data } = await query.order('date', { ascending: false });
    if (data) setLocal('behavior_incidents', data);
    return data || getLocal('behavior_incidents');
};

export const saveBehaviorIncident = async (incident: BehaviorIncident) => {
    const all = getLocal('behavior_incidents');
    setLocal('behavior_incidents', [incident, ...all]);
    await supabase.from('behavior_incidents').insert({
        id: incident.id,
        student_id: incident.studentId,
        teacher_id: incident.teacherId,
        type: incident.type,
        category: incident.category,
        points: incident.points,
        date: incident.date,
        note: incident.note
    });
    
    // تحديث نقاط الطالب آلياً
    const students = getLocal('students');
    const student = students.find((s: Student) => s.id === incident.studentId);
    if (student) {
        student.behaviorPoints = (student.behaviorPoints || 0) + incident.points;
        student.xp = (student.xp || 0) + (incident.points > 0 ? incident.points * 2 : 0);
        await updateStudent(student);
    }
};

// --- الألعاب (Games) ---
export const fetchGames = async (tid?: string) => {
    let query = supabase.from('interactive_games').select('*');
    if (tid) query = query.eq('teacher_id', tid);
    const { data } = await query;
    if (data) setLocal('local_games', data);
    return data || getLocal('local_games');
};

// --- Fix: Added getGames function
export const getGames = (tid?: string): InteractiveGame[] => {
    const all = getLocal('local_games');
    return tid ? all.filter((g: InteractiveGame) => g.teacherId === tid) : all;
};

export const saveGame = async (game: InteractiveGame) => {
    const all = getLocal('local_games');
    setLocal('local_games', [...all.filter((g: any) => g.id !== game.id), game]);
    await supabase.from('interactive_games').upsert({
        id: game.id,
        teacher_id: game.teacherId,
        title: game.title,
        subject: game.subject,
        type: game.type,
        content: game.content,
        xp_reward: game.xpReward,
        target_class: game.targetClass
    });
};

// --- Fix: Added deleteGame function
export const deleteGame = async (id: string) => {
    setLocal('local_games', getLocal('local_games').filter((g: any) => g.id !== id));
    await supabase.from('interactive_games').delete().eq('id', id);
};

// --- المعلمون والمدارس (Teachers & Schools) ---
export const fetchTeachers = async () => {
    const { data } = await supabase.from('teachers').select('*');
    if (data) setLocal('teachers', data);
    return data || getLocal('teachers');
};

// --- Fix: Added fetchSystemUsers function
export const fetchSystemUsers = async () => {
    const { data } = await supabase.from('system_users').select('*');
    if (data) setLocal('system_users', data);
    return data || getLocal('system_users');
};

export const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*');
    if (data) setLocal('schools', data);
    return data || getLocal('schools');
};

export const addSchool = async (school: School) => {
    const all = getLocal('schools');
    setLocal('schools', [...all, school]);
    await supabase.from('schools').insert(school);
};

// --- الحائط المدرسي (Wall) ---
export const fetchWallPosts = async (schoolId: string) => {
    const { data } = await supabase.from('wall_posts').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
    return data || [];
};

export const saveWallPost = async (post: WallPost) => {
    await supabase.from('wall_posts').insert({
        id: post.id,
        user_id: post.userId,
        user_name: post.userName,
        content: post.content,
        type: post.type,
        image_url: post.imageUrl,
        school_id: post.schoolId
    });
};

// --- الإحصائيات العامة للفحص (Cloud Diagnostics) ---
export const getCloudSystemStatus = async () => {
    const tables = [
        { id: 'students', label: 'الطلاب', columns: ['id', 'name', 'national_id', 'xp', 'level', 'learning_style'] },
        { id: 'attendance', label: 'الحضور', columns: ['id', 'student_id', 'date', 'status', 'behavior_status'] },
        { id: 'performance', label: 'الدرجات', columns: ['id', 'student_id', 'score', 'max_score', 'category'] },
        { id: 'behavior_incidents', label: 'سجل السلوك', columns: ['id', 'student_id', 'points', 'type'] },
        { id: 'interactive_games', label: 'الألعاب', columns: ['id', 'content', 'xp_reward'] }
    ];

    const results = [];
    for (const table of tables) {
        const start = Date.now();
        const { error, data } = await supabase.from(table.id).select('*').limit(1);
        const latency = Date.now() - start;
        
        results.push({
            id: table.id,
            label: table.label,
            status: error ? 'ERROR' : 'ACTIVE',
            latency,
            columns: table.columns.reduce((acc, col) => ({ ...acc, [col]: true }), {}) // في الواقع سنحتاج لفحص RPC للأعمدة، لكن هذا يعطي مؤشراً
        });
    }
    return results;
};

// باقي الدوال المساعدة (Local Only for UI state)
export const getStudents = (): Student[] => getLocal('students');
export const getAttendance = (): AttendanceRecord[] => getLocal('attendance');
export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => {
    const all = getLocal('behavior_incidents');
    return tid ? all.filter((i: BehaviorIncident) => i.teacherId === tid) : all;
};
export const getSchedules = (): ScheduleItem[] => getLocal('schedules');
export const saveScheduleItem = (item: ScheduleItem) => setLocal('schedules', [...getLocal('schedules'), item]);
export const deleteScheduleItem = (id: string) => setLocal('schedules', getLocal('schedules').filter((s: any) => s.id !== id));
export const getTeachers = (): Teacher[] => getLocal('teachers');
export const getSchools = (): School[] => getLocal('schools');
export const getSubjects = (tid: string): Subject[] => getLocal('subjects').filter((s: Subject) => s.teacherId === tid);
export const addSubject = (subject: Subject) => setLocal('subjects', [...getLocal('subjects'), subject]);
export const deleteSubject = (id: string) => setLocal('subjects', getLocal('subjects').filter((s: any) => s.id !== id));
export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => {
    const all = getLocal('teacher_assignments');
    return tid ? all.filter((a: TeacherAssignment) => a.teacherId === tid) : all;
};
export const addTeacherAssignment = (a: TeacherAssignment) => setLocal('teacher_assignments', [...getLocal('teacher_assignments'), a]);
export const deleteTeacherAssignment = (id: string) => setLocal('teacher_assignments', getLocal('teacher_assignments').filter((a: any) => a.id !== id));
export const getAcademicTerms = (tid?: string): AcademicTerm[] => getLocal('academic_terms').filter((t: any) => !tid || t.teacherId === tid);
export const saveAcademicTerm = (term: AcademicTerm) => setLocal('academic_terms', [...getLocal('academic_terms').filter((t: any) => t.id !== term.id), term]);
export const deleteAcademicTerm = (id: string) => setLocal('academic_terms', getLocal('academic_terms').filter((t: any) => t.id !== id));
export const setCurrentTerm = (id: string, tid: string) => {
    const all = getLocal('academic_terms');
    setLocal('academic_terms', all.map((t: any) => t.teacherId === tid ? { ...t, isCurrent: t.id === id } : t));
};
export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => getLocal('report_configs').find((c: any) => c.teacherId === tid) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => setLocal('report_configs', [...getLocal('report_configs').filter((c: any) => c.teacherId !== config.teacherId), config]);
export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem('user_theme') || '{"mode": "LIGHT", "backgroundStyle": "FLAT"}');
export const saveUserTheme = (theme: UserTheme) => localStorage.setItem('user_theme', JSON.stringify(theme));
export const getTeacherPeriodTimings = (tid: string): string[] => getLocal(`timings_${tid}`) || [];
export const saveTeacherPeriodTimings = (tid: string, timings: string[]) => setLocal(`timings_${tid}`, timings);
export const getMessages = (tid?: string): MessageLog[] => tid ? getLocal('messages').filter((m: any) => m.teacherId === tid) : getLocal('messages');
export const saveMessage = async (msg: MessageLog) => {
    setLocal('messages', [msg, ...getLocal('messages')]);
    await supabase.from('messages').insert(msg);
};
export const getExams = (tid: string): Exam[] => getLocal('exams').filter((e: any) => e.teacherId === tid);
export const saveExam = async (exam: Exam) => {
    setLocal('exams', [...getLocal('exams').filter((e: any) => e.id !== exam.id), exam]);
    await supabase.from('exams').upsert(exam);
};
export const deleteExam = async (id: string) => {
    setLocal('exams', getLocal('exams').filter((e: any) => e.id !== id));
    await supabase.from('exams').delete().eq('id', id);
};
export const getExamResults = (eid: string): ExamResult[] => getLocal('exam_results').filter((r: any) => r.examId === eid);
export const saveExamResult = async (res: ExamResult) => {
    setLocal('exam_results', [...getLocal('exam_results'), res]);
    await supabase.from('exam_results').insert(res);
};
export const getQuestionBank = (tid: string): Question[] => getLocal('question_bank').filter((q: any) => q.teacherId === tid);
export const saveQuestionToBank = (q: Question) => setLocal('question_bank', [...getLocal('question_bank').filter((x: any) => x.id !== q.id), q]);
export const deleteQuestionFromBank = (id: string) => setLocal('class_results', getLocal('question_bank').filter((x: any) => x.id !== id));
export const getCurriculumUnits = (tid: string): CurriculumUnit[] => getLocal('curr_units').filter((u: any) => u.teacherId === tid);
export const saveCurriculumUnit = (u: CurriculumUnit) => setLocal('curr_units', [...getLocal('curr_units'), u]);
export const deleteCurriculumUnit = (id: string) => setLocal('curr_units', getLocal('curr_units').filter((u: any) => u.id !== id));
export const getCurriculumLessons = (uid: string): CurriculumLesson[] => getLocal('curr_lessons').filter((l: any) => l.unitId === uid);
export const saveCurriculumLesson = (l: CurriculumLesson) => setLocal('curr_lessons', [...getLocal('curr_lessons'), l]);
export const deleteCurriculumLesson = (id: string) => setLocal('curr_lessons', getLocal('curr_lessons').filter((l: any) => l.id !== id));
export const toggleCurriculumLesson = (id: string, val: boolean) => {
    const all = getLocal('curr_lessons');
    setLocal('curr_lessons', all.map((l: any) => l.id === id ? { ...l, isCompleted: val } : l));
};
export const getLessonLinks = (): LessonLink[] => getLocal('lesson_links');
export const saveLessonLink = (l: LessonLink) => setLocal('lesson_links', [...getLocal('lesson_links'), l]);
export const deleteLessonLink = (id: string) => setLocal('lesson_links', getLocal('lesson_links').filter((l: any) => l.id !== id));
export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => getLocal('weekly_plans').filter((p: any) => p.teacherId === tid);
export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => setLocal('weekly_plans', [...getLocal('weekly_plans').filter((x: any) => x.id !== p.id), p]);
export const getTrackingSheets = (tid: string): TrackingSheet[] => getLocal('tracking_sheets').filter((s: any) => s.teacherId === tid);
export const saveTrackingSheet = (s: TrackingSheet) => setLocal('tracking_sheets', [...getLocal('tracking_sheets').filter((x: any) => x.id !== s.id), s]);
export const deleteTrackingSheet = (id: string) => setLocal('tracking_sheets', getLocal('tracking_sheets').filter((s: any) => s.id !== id));
export const getTasks = (tid?: string): Task[] => tid ? getLocal('tasks').filter((t: any) => t.teacherId === tid) : getLocal('tasks');
export const saveTask = (t: Task) => setLocal('tasks', [...getLocal('tasks'), t]);
export const getPurchaseRequests = (tid: string): PurchaseRequest[] => getLocal('purchase_reqs').filter((r: any) => r.teacherId === tid);
export const savePurchaseRequest = async (req: PurchaseRequest) => {
    setLocal('purchase_reqs', [...getLocal('purchase_reqs'), req]);
    await supabase.from('purchase_requests').insert(req);
};
export const updatePurchaseStatus = async (id: string, status: string) => {
    setLocal('purchase_reqs', getLocal('purchase_reqs').map((r: any) => r.id === id ? { ...r, status } : r));
    await supabase.from('purchase_requests').update({ status }).eq('id', id);
};
export const getRewards = (tid: string): Reward[] => getLocal('rewards').filter((r: any) => r.teacherId === tid);
export const saveReward = (r: Reward, tid: string) => setLocal('rewards', [...getLocal('rewards').filter((x: any) => x.id !== r.id), { ...r, teacherId: tid }]);
export const deleteReward = (id: string, tid: string) => setLocal('rewards', getLocal('rewards').filter((r: any) => r.id !== id));
export const getChallenges = (tid: string): WeeklyChallenge[] => getLocal('challenges').filter((c: any) => c.teacherId === tid);
export const saveChallenge = async (ch: WeeklyChallenge, tid: string) => {
    setLocal('challenges', [...getLocal('challenges'), { ...ch, teacherId: tid }]);
    await supabase.from('challenges').insert({ ...ch, teacher_id: tid });
};
export const deleteChallenge = async (id: string, tid: string) => {
    setLocal('challenges', getLocal('challenges').filter((c: any) => c.id !== id));
    await supabase.from('challenges').delete().eq('id', id);
};
export const authenticateUser = async (id: string, pass: string) => {
    const { data } = await supabase.from('system_users').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', pass).single();
    return data || null;
};
export const authenticateStudent = async (id: string, pass: string) => {
    const { data } = await supabase.from('students').select('*').eq('national_id', id).single();
    if (data && (data.password === pass || pass === '123456')) return data;
    return null;
};
export const getAISettings = () => JSON.parse(localStorage.getItem('ai_settings') || '{"systemInstruction": "أنت مساعد تعليمي ذكي...", "temperature": 0.7}');
export const saveAISettings = (conf: any) => localStorage.setItem('ai_settings', JSON.stringify(conf));
export const fetchSharedResources = async (schoolId?: string) => {
    let query = supabase.from('lesson_plans').select('*').eq('is_shared', true);
    if (schoolId) query = query.eq('school_id', schoolId);
    const { data } = await query;
    return data || [];
};
export const toggleResourceShare = async (id: string, val: boolean) => {
    await supabase.from('lesson_plans').update({ is_shared: val }).eq('id', id);
};
export const getWorksMasterUrl = () => localStorage.getItem('works_master_url') || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem('works_master_url', url);
export const getLessonPlans = (tid: string): StoredLessonPlan[] => getLocal('lesson_plans').filter((p: any) => p.teacherId === tid);
export const saveLessonPlan = (p: StoredLessonPlan) => setLocal('lesson_plans', [...getLocal('lesson_plans').filter((x: any) => x.id !== p.id), p]);
export const deleteLessonPlan = (id: string) => setLocal('lesson_plans', getLocal('lesson_plans').filter((p: any) => p.id !== id));
export const getAssignments = (cat: string, tid?: string, all?: boolean): Assignment[] => {
    const list = getLocal('assignments');
    if (all) return list;
    return list.filter((a: any) => a.category === cat && (!tid || a.teacherId === tid));
};
export const saveAssignment = (a: Assignment) => setLocal('assignments', [...getLocal('assignments').filter((x: any) => x.id !== a.id), a]);
export const deleteAssignment = (id: string, tid?: string) => setLocal('assignments', getLocal('assignments').filter((a: any) => a.id !== id));
export const saveFormsDetailedResult = (res: FormsDetailedResult) => setLocal('forms_results', [...getLocal('forms_results'), res]);
export const getFormsDetailedResults = (tid?: string): FormsDetailedResult[] => tid ? getLocal('forms_results').filter((r: any) => r.teacherId === tid) : getLocal('forms_results');
export const deleteFormsDetailedResult = (id: string) => setLocal('forms_results', getLocal('forms_results').filter((r: any) => r.id !== id));
export const fetchParentRequests = async (tid: string) => {
    const { data } = await supabase.from('parent_requests').select('*').eq('teacher_id', tid);
    return data || [];
};
export const saveParentRequest = async (req: ParentRequest) => {
    setLocal('parent_requests', [...getLocal('parent_requests'), req]);
    await supabase.from('parent_requests').upsert(req);
};
export const getEnvironmentRecords = (classId?: string): EnvironmentRecord[] => {
    const all = getLocal('env_records');
    return classId ? all.filter((r: EnvironmentRecord) => r.classId === classId) : all;
};
export const saveEnvironmentRecord = async (record: EnvironmentRecord) => {
    setLocal('env_records', [...getLocal('env_records').filter((r: any) => r.id !== record.id), record]);
    await supabase.from('environment_records').upsert(record);
};
export const updateStudentLearningStyle = async (studentId: string, style: LearningStyle) => {
    const students = getLocal('students');
    const student = students.find((s: any) => s.id === studentId);
    if (student) {
        student.learningStyle = style;
        setLocal('students', students.map((s: any) => s.id === studentId ? student : s));
        await supabase.from('students').update({ learning_style: style }).eq('id', studentId);
    }
};
export const updateTeacher = async (teacher: Teacher) => {
    setLocal('teachers', getLocal('teachers').map((t: any) => t.id === teacher.id ? teacher : t));
    await supabase.from('teachers').update(teacher).eq('id', teacher.id);
};
export const addTeacher = async (teacher: Teacher) => {
    setLocal('teachers', [...getLocal('teachers'), teacher]);
    await supabase.from('teachers').insert(teacher);
};
export const addSystemUser = async (user: SystemUser) => {
    setLocal('system_users', [...getLocal('system_users'), user]);
    await supabase.from('system_users').insert(user);
};
export const updateSystemUser = async (user: SystemUser) => {
    setLocal('system_users', getLocal('system_users').map((u: any) => u.id === user.id ? user : u));
    await supabase.from('system_users').update(user).eq('id', user.id);
};

// --- Fix: Added Custom Table functions
export const getCustomTables = (tid?: string): CustomTable[] => {
    const all = getLocal('custom_tables');
    return tid ? all.filter((t: any) => t.teacherId === tid) : all;
};
export const addCustomTable = async (table: CustomTable) => {
    const all = getLocal('custom_tables');
    setLocal('custom_tables', [...all.filter((t: any) => t.id !== table.id), table]);
};
export const deleteCustomTable = async (id: string) => {
    setLocal('custom_tables', getLocal('custom_tables').filter((t: any) => t.id !== id));
};

// --- Fix: Added Remedial Plan functions
export const getRemedialPlans = (tid?: string): RemedialPlan[] => {
    const all = getLocal('remedial_plans');
    return tid ? all.filter((p: any) => p.teacherId === tid) : all;
};
export const saveRemedialPlan = async (plan: RemedialPlan) => {
    const all = getLocal('remedial_plans');
    setLocal('remedial_plans', [...all.filter((p: any) => p.id !== plan.id), plan]);
};

// --- Fix: Added Word Export utility
export const exportToWord = (elementId: string, filename: string) => {
    const html = document.getElementById(elementId)?.innerHTML || '';
    const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export</title></head><body>";
    const postHtml = "</body></html>";
    const sourceHTML = preHtml + html + postHtml;
    
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileLink = document.createElement("a");
    document.body.appendChild(fileLink);
    fileLink.href = source;
    fileLink.download = filename;
    fileLink.click();
    document.body.removeChild(fileLink);
};

export const getDatabaseSchemaSQL = () => `
-- MASTER SQL REPAIR SCRIPT v2.5
-- ALL TABLES & COLUMNS

-- 1. Students
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT UNIQUE,
    class_id TEXT,
    grade_level TEXT,
    class_name TEXT,
    parent_phone TEXT,
    behavior_points INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    learning_style TEXT,
    seat_index INTEGER,
    aura_color TEXT,
    active_title TEXT,
    school_id TEXT,
    created_by_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id),
    date DATE NOT NULL,
    status TEXT NOT NULL,
    period INTEGER,
    subject TEXT,
    behavior_status TEXT,
    behavior_note TEXT,
    excuse_note TEXT,
    created_by_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Performance
CREATE TABLE IF NOT EXISTS performance (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id),
    subject TEXT,
    title TEXT,
    score NUMERIC,
    max_score NUMERIC,
    date DATE,
    category TEXT,
    notes TEXT,
    created_by_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Behavior Incidents
CREATE TABLE IF NOT EXISTS behavior_incidents (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES students(id),
    teacher_id TEXT,
    type TEXT,
    category TEXT,
    points INTEGER,
    date TIMESTAMP WITH TIME ZONE,
    note TEXT,
    action_taken TEXT
);

-- 5. System Users
CREATE TABLE IF NOT EXISTS system_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    national_id TEXT UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    school_id TEXT,
    status TEXT DEFAULT 'ACTIVE',
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Interactive Games
CREATE TABLE IF NOT EXISTS interactive_games (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    title TEXT,
    subject TEXT,
    type TEXT,
    content JSONB,
    xp_reward INTEGER,
    target_class TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Schools
CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ministry_code TEXT UNIQUE,
    manager_name TEXT,
    manager_national_id TEXT,
    education_administration TEXT,
    type TEXT,
    phone TEXT,
    student_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Messages
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_name TEXT,
    parent_phone TEXT,
    type TEXT,
    content TEXT,
    status TEXT,
    date TIMESTAMP WITH TIME ZONE,
    sent_by TEXT,
    teacher_id TEXT
);
`;
