
import { supabase } from './supabaseClient';
import { 
    Student, AttendanceRecord, PerformanceRecord, BehaviorIncident, 
    Exam, SystemUser, ScheduleItem, InteractiveGame, Assignment, AcademicTerm, 
    ReportHeaderConfig, UserTheme, TeacherAssignment, Subject, MessageLog, 
    RemedialPlan, Teacher, School, ExamResult, Question, CurriculumUnit, 
    CurriculumLesson, LessonLink, WeeklyPlanItem, TrackingSheet, Task, 
    PurchaseRequest, Reward, WeeklyChallenge, FormsDetailedResult, 
    CustomTable, ParentRequest, EnvironmentRecord, StoredLessonPlan, WallPost
} from '../types';

// Helper for local storage
const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocal = (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val));

export const getGames = (tid?: string): InteractiveGame[] => {
    const all = getLocal('local_games');
    return tid ? all.filter((g: InteractiveGame) => g.teacherId === tid) : all;
};

export const saveGame = async (game: InteractiveGame) => {
    const all = getGames();
    setLocal('local_games', [...all.filter(g => g.id !== game.id), game]);
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

export const deleteGame = async (id: string) => {
    const all = getGames();
    setLocal('local_games', all.filter(g => g.id !== id));
    await supabase.from('interactive_games').delete().eq('id', id);
};

// Students
export const getStudents = (): Student[] => getLocal('students');
export const addStudent = async (student: Student) => {
    const all = getStudents();
    setLocal('students', [...all, student]);
    await supabase.from('students').insert(student);
};
export const updateStudent = async (student: Student) => {
    const all = getStudents();
    setLocal('students', all.map(s => s.id === student.id ? student : s));
    await supabase.from('students').update(student).eq('id', student.id);
};
export const deleteStudent = async (id: string) => {
    const all = getStudents();
    setLocal('students', all.filter(s => s.id !== id));
    await supabase.from('students').delete().eq('id', id);
};
export const fetchStudents = async () => {
    const { data } = await supabase.from('students').select('*');
    if (data) setLocal('students', data);
    return data || [];
};

// Attendance
export const getAttendance = (): AttendanceRecord[] => getLocal('attendance');
export const saveAttendance = async (records: AttendanceRecord[]) => {
    const all = getAttendance();
    const newAll = [...all];
    records.forEach(r => {
        const idx = newAll.findIndex(x => x.id === r.id);
        if (idx > -1) newAll[idx] = r;
        else newAll.push(r);
    });
    setLocal('attendance', newAll);
    await supabase.from('attendance').upsert(records);
};
export const deleteAttendance = async (id: string) => {
    const all = getAttendance();
    setLocal('attendance', all.filter(a => a.id !== id));
    await supabase.from('attendance').delete().eq('id', id);
};
export const fetchAttendance = async () => {
    const { data } = await supabase.from('attendance').select('*');
    if (data) setLocal('attendance', data);
    return data || [];
};

// Performance
export const fetchPerformance = async (tid?: string) => {
    let query = supabase.from('performance').select('*');
    if (tid) query = query.eq('created_by_id', tid);
    const { data } = await query;
    if (data) setLocal('performance', data);
    return data || [];
};
export const addPerformance = async (records: PerformanceRecord[]) => {
    const all = getLocal('performance');
    setLocal('performance', [...all, ...records]);
    await supabase.from('performance').upsert(records);
};
export const deletePerformance = async (id: string) => {
    const all = getLocal('performance');
    setLocal('performance', all.filter((p: any) => p.id !== id));
    await supabase.from('performance').delete().eq('id', id);
};

// Schedule
export const getSchedules = (): ScheduleItem[] => getLocal('schedules');
export const saveScheduleItem = (item: ScheduleItem) => {
    const all = getSchedules();
    setLocal('schedules', [...all, item]);
};
export const deleteScheduleItem = (id: string) => {
    const all = getSchedules();
    setLocal('schedules', all.filter(s => s.id !== id));
};

// Behavior
export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => {
    const all = getLocal('behavior_incidents');
    return tid ? all.filter((i: BehaviorIncident) => i.teacherId === tid) : all;
};
export const saveBehaviorIncident = async (incident: BehaviorIncident) => {
    const all = getLocal('behavior_incidents');
    setLocal('behavior_incidents', [...all, incident]);
    await supabase.from('behavior_incidents').insert(incident);
};

// Exams
export const getExams = (tid: string): Exam[] => getLocal('exams').filter((e: Exam) => e.teacherId === tid);
export const saveExam = async (exam: Exam) => {
    const all = getLocal('exams');
    setLocal('exams', [...all.filter((e: any) => e.id !== exam.id), exam]);
    await supabase.from('exams').upsert(exam);
};
export const deleteExam = async (id: string) => {
    const all = getLocal('exams');
    setLocal('exams', all.filter((e: any) => e.id !== id));
    await supabase.from('exams').delete().eq('id', id);
};

// Academic Terms
export const getAcademicTerms = (tid?: string): AcademicTerm[] => {
    const all = getLocal('academic_terms');
    return tid ? all.filter((t: AcademicTerm) => t.teacherId === tid) : all;
};
export const saveAcademicTerm = (term: AcademicTerm) => {
    const all = getAcademicTerms();
    setLocal('academic_terms', [...all.filter(t => t.id !== term.id), term]);
};
export const deleteAcademicTerm = (id: string) => {
    const all = getAcademicTerms();
    setLocal('academic_terms', all.filter(t => t.id !== id));
};
export const setCurrentTerm = (id: string, tid: string) => {
    const all = getAcademicTerms(tid);
    const updated = all.map(t => ({ ...t, isCurrent: t.id === id }));
    const others = getLocal('academic_terms').filter((t: AcademicTerm) => t.teacherId !== tid);
    setLocal('academic_terms', [...others, ...updated]);
};

// Custom Tables
export const addCustomTable = (table: CustomTable) => {
    const all = getCustomTables();
    setLocal('custom_tables', [...all, table]);
};
export const getCustomTables = (tid?: string): CustomTable[] => {
    const all = getLocal('custom_tables');
    return tid ? all.filter((t: CustomTable) => t.teacherId === tid) : all;
};
export const deleteCustomTable = (id: string) => {
    const all = getCustomTables();
    setLocal('custom_tables', all.filter(t => t.id !== id));
};

// Schools
export const getSchools = (): School[] => getLocal('schools');
export const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*');
    if (data) setLocal('schools', data);
    return data || [];
};
export const addSchool = async (school: School) => {
    const all = getLocal('schools');
    setLocal('schools', [...all, school]);
    await supabase.from('schools').insert(school);
};

// Teachers
export const getTeachers = (): Teacher[] => getLocal('teachers');
export const fetchTeachers = async () => {
    const { data } = await supabase.from('teachers').select('*');
    if (data) setLocal('teachers', data);
    return data || [];
};
export const updateTeacher = async (teacher: Teacher) => {
    const all = getLocal('teachers');
    setLocal('teachers', all.map((t: any) => t.id === teacher.id ? teacher : t));
    await supabase.from('teachers').update(teacher).eq('id', teacher.id);
};
export const addTeacher = async (teacher: Teacher) => {
    const all = getLocal('teachers');
    setLocal('teachers', [...all, teacher]);
    await supabase.from('teachers').insert(teacher);
};

// Subjects
export const getSubjects = (tid: string): Subject[] => getLocal('subjects').filter((s: Subject) => s.teacherId === tid);
export const addSubject = (subject: Subject) => {
    const all = getLocal('subjects');
    setLocal('subjects', [...all, subject]);
};
export const deleteSubject = (id: string) => {
    const all = getLocal('subjects');
    setLocal('subjects', all.filter((s: any) => s.id !== id));
};

// Report Header Config
export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => {
    const all = getLocal('report_configs');
    return all.find((c: ReportHeaderConfig) => c.teacherId === tid) || {
        schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: ''
    };
};
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    const all = getLocal('report_configs');
    setLocal('report_configs', [...all.filter((c: any) => c.teacherId !== config.teacherId), config]);
};

// User Theme
export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem('user_theme') || '{"mode": "LIGHT", "backgroundStyle": "FLAT"}');
export const saveUserTheme = (theme: UserTheme) => setLocal('user_theme', theme);

// Teacher Timings
export const getTeacherPeriodTimings = (tid: string): string[] => getLocal(`timings_${tid}`) || [];
export const saveTeacherPeriodTimings = (tid: string, timings: string[]) => setLocal(`timings_${tid}`, timings);

// Teacher Assignments
export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => {
    const all = getLocal('teacher_assignments');
    return tid ? all.filter((a: TeacherAssignment) => a.teacherId === tid) : all;
};
export const addTeacherAssignment = (a: TeacherAssignment) => {
    const all = getTeacherAssignments();
    setLocal('teacher_assignments', [...all, a]);
};
export const deleteTeacherAssignment = (id: string) => {
    const all = getTeacherAssignments();
    setLocal('teacher_assignments', all.filter(a => a.id !== id));
};

// System Users
export const fetchSystemUsers = async () => {
    const { data } = await supabase.from('system_users').select('*');
    if (data) setLocal('system_users', data);
    return data || [];
};
export const addSystemUser = async (user: SystemUser) => {
    const all = getLocal('system_users');
    setLocal('system_users', [...all, user]);
    await supabase.from('system_users').insert(user);
};
export const updateSystemUser = async (user: SystemUser) => {
    const all = getLocal('system_users');
    setLocal('system_users', all.map((u: any) => u.id === user.id ? user : u));
    await supabase.from('system_users').update(user).eq('id', user.id);
};

// Messages
export const saveMessage = async (msg: MessageLog) => {
    const all = getLocal('messages');
    setLocal('messages', [msg, ...all]);
    await supabase.from('messages').insert(msg);
};
export const getMessages = (tid?: string): MessageLog[] => {
    const all = getLocal('messages');
    return tid ? all.filter((m: MessageLog) => m.teacherId === tid) : all;
};

// Remedial Plans
export const saveRemedialPlan = (plan: RemedialPlan) => {
    const all = getLocal('remedial_plans');
    setLocal('remedial_plans', [...all, plan]);
};
export const getRemedialPlans = (sid: string): RemedialPlan[] => getLocal('remedial_plans').filter((p: any) => p.studentId === sid);

// Exam Results
export const saveExamResult = async (res: ExamResult) => {
    const all = getLocal('exam_results');
    setLocal('exam_results', [...all, res]);
    await supabase.from('exam_results').insert(res);
};
export const getExamResults = (eid: string): ExamResult[] => getLocal('exam_results').filter((r: any) => r.examId === eid);

// Question Bank
export const getQuestionBank = (tid: string): Question[] => getLocal('question_bank').filter((q: any) => q.teacherId === tid);
export const saveQuestionToBank = (q: Question) => {
    const all = getLocal('question_bank');
    setLocal('question_bank', [...all.filter((x: any) => x.id !== q.id), q]);
};
export const deleteQuestionFromBank = (id: string) => {
    const all = getLocal('question_bank');
    setLocal('question_bank', all.filter((x: any) => x.id !== id));
};

// Curriculum
export const getCurriculumUnits = (tid: string): CurriculumUnit[] => getLocal('curr_units').filter((u: any) => u.teacherId === tid);
export const saveCurriculumUnit = (u: CurriculumUnit) => {
    const all = getLocal('curr_units');
    setLocal('curr_units', [...all, u]);
};
export const deleteCurriculumUnit = (id: string) => {
    const all = getLocal('curr_units');
    setLocal('curr_units', all.filter((u: any) => u.id !== id));
};
export const getCurriculumLessons = (uid: string): CurriculumLesson[] => getLocal('curr_lessons').filter((l: any) => l.unitId === uid);
export const saveCurriculumLesson = (l: CurriculumLesson) => {
    const all = getLocal('curr_lessons');
    setLocal('curr_lessons', [...all, l]);
};
export const deleteCurriculumLesson = (id: string) => {
    const all = getLocal('curr_lessons');
    setLocal('curr_lessons', all.filter((l: any) => l.id !== id));
};
export const toggleCurriculumLesson = (id: string, val: boolean) => {
    const all = getLocal('curr_lessons');
    setLocal('curr_lessons', all.map((l: any) => l.id === id ? { ...l, isCompleted: val } : l));
};

// Lesson Links
export const getLessonLinks = (): LessonLink[] => getLocal('lesson_links');
export const saveLessonLink = (l: LessonLink) => {
    const all = getLocal('lesson_links');
    setLocal('lesson_links', [...all, l]);
};
export const deleteLessonLink = (id: string) => {
    const all = getLocal('lesson_links');
    setLocal('lesson_links', all.filter((l: any) => l.id !== id));
};

// Weekly Plans
export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => getLocal('weekly_plans').filter((p: any) => p.teacherId === tid);
export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => {
    const all = getLocal('weekly_plans');
    setLocal('weekly_plans', [...all.filter((x: any) => x.id !== p.id), p]);
};

// Tracking Sheets
export const getTrackingSheets = (tid: string): TrackingSheet[] => getLocal('tracking_sheets').filter((s: any) => s.teacherId === tid);
export const saveTrackingSheet = (s: TrackingSheet) => {
    const all = getLocal('tracking_sheets');
    setLocal('tracking_sheets', [...all.filter((x: any) => x.id !== s.id), s]);
};
export const deleteTrackingSheet = (id: string) => {
    const all = getLocal('tracking_sheets');
    setLocal('tracking_sheets', all.filter((s: any) => s.id !== id));
};

// Tasks
export const getTasks = (tid?: string): Task[] => {
    const all = getLocal('tasks');
    return tid ? all.filter((t: Task) => t.teacherId === tid) : all;
};
export const saveTask = (t: Task) => {
    const all = getLocal('tasks');
    setLocal('tasks', [...all, t]);
};

// Purchase Requests
export const getPurchaseRequests = (tid: string): PurchaseRequest[] => getLocal('purchase_reqs').filter((r: any) => r.teacherId === tid);
export const savePurchaseRequest = async (req: PurchaseRequest) => {
    const all = getLocal('purchase_reqs');
    setLocal('purchase_reqs', [...all, req]);
    await supabase.from('purchase_requests').insert(req);
};
export const updatePurchaseStatus = async (id: string, status: string) => {
    const all = getLocal('purchase_reqs');
    setLocal('purchase_reqs', all.map((r: any) => r.id === id ? { ...r, status } : r));
    await supabase.from('purchase_requests').update({ status }).eq('id', id);
};

// Rewards
export const getRewards = (tid: string): Reward[] => getLocal('rewards').filter((r: any) => r.teacherId === tid);
export const saveReward = (r: Reward, tid: string) => {
    const all = getLocal('rewards');
    setLocal('rewards', [...all.filter((x: any) => x.id !== r.id), { ...r, teacherId: tid }]);
};
export const deleteReward = (id: string, tid: string) => {
    const all = getLocal('rewards');
    setLocal('rewards', all.filter((r: any) => r.id !== id));
};

// Challenges
export const getChallenges = (tid: string): WeeklyChallenge[] => getLocal('challenges').filter((c: any) => c.teacherId === tid);
export const saveChallenge = async (ch: WeeklyChallenge, tid: string) => {
    const all = getLocal('challenges');
    setLocal('challenges', [...all, { ...ch, teacherId: tid }]);
    await supabase.from('challenges').insert({ ...ch, teacher_id: tid });
};
export const deleteChallenge = async (id: string, tid: string) => {
    const all = getLocal('challenges');
    setLocal('challenges', all.filter((c: any) => c.id !== id));
    await supabase.from('challenges').delete().eq('id', id);
};

// Authentication
export const authenticateUser = async (id: string, pass: string) => {
    const users = getLocal('system_users');
    const user = users.find((u: any) => (u.nationalId === id || u.email === id) && u.password === pass);
    return user || null;
};
export const authenticateStudent = async (id: string, pass: string) => {
    const students = getLocal('students');
    const student = students.find((s: any) => (s.nationalId === id) && (s.password === pass || pass === '123456'));
    return student || null;
};

// AI Settings
export const getAISettings = () => JSON.parse(localStorage.getItem('ai_settings') || '{"systemInstruction": "أنت مساعد تعليمي ذكي...", "temperature": 0.7}');
export const saveAISettings = (conf: any) => setLocal('ai_settings', conf);

// Wall
export const fetchWallPosts = async (schoolId: string) => {
    const { data } = await supabase.from('wall_posts').select('*').eq('school_id', schoolId);
    return data || [];
};
export const saveWallPost = async (post: WallPost) => {
    await supabase.from('wall_posts').insert(post);
};

// Shared
export const fetchSharedResources = async (schoolId?: string) => {
    let query = supabase.from('shared_resources').select('*');
    if (schoolId) query = query.eq('school_id', schoolId);
    const { data } = await query;
    return data || [];
};
export const toggleResourceShare = async (id: string, val: boolean) => {
    await supabase.from('lesson_plans').update({ is_shared: val }).eq('id', id);
};

// Misc
export const getWorksMasterUrl = () => localStorage.getItem('works_master_url') || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem('works_master_url', url);
export const getLessonPlans = (tid: string): StoredLessonPlan[] => getLocal('lesson_plans').filter((p: any) => p.teacherId === tid);
export const saveLessonPlan = (p: StoredLessonPlan) => {
    const all = getLocal('lesson_plans');
    setLocal('lesson_plans', [...all.filter((x: any) => x.id !== p.id), p]);
};
export const deleteLessonPlan = (id: string) => {
    const all = getLocal('lesson_plans');
    setLocal('lesson_plans', all.filter((p: any) => p.id !== id));
};
export const exportToWord = (id: string, name: string) => {
    const content = document.getElementById(id)?.innerText || '';
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
};

export const getCloudSystemStatus = async () => {
    // Simulated check
    return [
        { id: 'students', label: 'الطلاب', status: 'ACTIVE', latency: 45, columns: { id: true, name: true, national_id: true } },
        { id: 'attendance', label: 'الحضور', status: 'ACTIVE', latency: 32, columns: { id: true, date: true, status: true } }
    ];
};

export const getDatabaseSchemaSQL = () => `
-- Auto-generated Repair Script
ALTER TABLE students ADD COLUMN IF NOT EXISTS learning_style TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS behavior_status TEXT;
`;

export const getAssignments = (cat: string, tid?: string, all?: boolean): Assignment[] => {
    const list = getLocal('assignments');
    if (all) return list;
    return list.filter((a: any) => a.category === cat && (!tid || a.teacherId === tid));
};
export const saveAssignment = (a: Assignment) => {
    const all = getLocal('assignments');
    setLocal('assignments', [...all.filter((x: any) => x.id !== a.id), a]);
};
export const deleteAssignment = (id: string, tid?: string) => {
    const all = getLocal('assignments');
    setLocal('assignments', all.filter((a: any) => a.id !== id));
};

export const saveFormsDetailedResult = (res: FormsDetailedResult) => {
    const all = getLocal('forms_results');
    setLocal('forms_results', [...all, res]);
};
export const getFormsDetailedResults = (tid?: string): FormsDetailedResult[] => {
    const all = getLocal('forms_results');
    return tid ? all.filter((r: FormsDetailedResult) => r.teacherId === tid) : all;
};
export const deleteFormsDetailedResult = (id: string) => {
    const all = getLocal('forms_results');
    setLocal('forms_results', all.filter((r: any) => r.id !== id));
};

export const saveParentRequest = async (req: ParentRequest) => {
    const all = getLocal('parent_requests');
    setLocal('parent_requests', [...all, req]);
    await supabase.from('parent_requests').upsert(req);
};
export const fetchParentRequests = async (tid: string) => {
    const { data } = await supabase.from('parent_requests').select('*').eq('teacher_id', tid);
    return data || [];
};
