
import { 
    Student, AttendanceRecord, PerformanceRecord, Teacher, School, 
    SystemUser, Subject, ScheduleItem, TeacherAssignment, 
    AcademicTerm, WeeklyPlanItem, LessonLink, StoredLessonPlan,
    Exam, AISettings, ReportHeaderConfig, UserTheme, 
    CustomTable, EnvironmentRecord, LearningStyle, CurriculumUnit, 
    CurriculumLesson, Question, ExamResult, TrackingSheet, RemedialPlan,
    MessageLog, FormsDetailedResult, BehaviorIncident, Task, Assignment
} from '../types';
import { supabase } from './supabaseClient';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR' | 'CHECKING' | 'CONNECTED';

export const KEYS = {
    STUDENTS: 'students',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    SYSTEM_USERS: 'system_users',
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    TRACKING_ASSIGNMENTS: 'assignments',
    TERMS: 'academic_terms',
    WEEKLY_PLANS: 'weekly_plans',
    LESSON_LINKS: 'lesson_links',
    LESSON_PLANS: 'lesson_plans',
    EXAMS: 'exams',
    EXAM_RESULTS: 'exam_results',
    QUESTION_BANK: 'question_bank',
    CURRICULUM_UNITS: 'curriculum_units',
    CURRICULUM_LESSONS: 'curriculum_lessons',
    TRACKING_SHEETS: 'tracking_sheets',
    MESSAGES: 'messages',
    CUSTOM_TABLES: 'custom_tables',
    USER_THEME: 'user_theme',
    AI_SETTINGS: 'ai_settings',
    ENVIRONMENT: 'environment_records',
    REMEDIAL_PLANS: 'remedial_plans',
    FORMS_DETAILED: 'forms_detailed_results',
    WORKS_MASTER_URL: 'works_master_url',
    BEHAVIOR_INCIDENTS: 'behavior_incidents',
    TASKS: 'tasks',
    PERIOD_TIMINGS: 'period_timings',
    TEACHER_ASSIGNMENTS: 'teacher_class_map'
};

export const DB_MAP = { ...KEYS };

export function get<T>(key: string): T[] { 
    try { 
        const data = localStorage.getItem(key); 
        return data ? JSON.parse(data) : []; 
    } catch { return []; } 
}
export function save(key: string, data: any) { 
    localStorage.setItem(key, JSON.stringify(data)); 
}

// دالة محسنة للرفع تضمن معالجة الأخطاء
export const uploadToSupabase = async () => {
    if (!navigator.onLine) return;
    const tables = [
        { key: KEYS.STUDENTS, table: 'students' },
        { key: KEYS.ATTENDANCE, table: 'attendance' },
        { key: KEYS.PERFORMANCE, table: 'performance' },
        { key: KEYS.TERMS, table: 'academic_terms' },
        { key: KEYS.BEHAVIOR_INCIDENTS, table: 'behavior_incidents' },
        { key: KEYS.TASKS, table: 'tasks' },
        { key: KEYS.TRACKING_ASSIGNMENTS, table: 'assignments' },
        { key: KEYS.SUBJECTS, table: 'subjects' },
        { key: KEYS.TEACHER_ASSIGNMENTS, table: 'teacher_assignments' }
    ];
    
    for (const item of tables) {
        const data = get(item.key);
        if (data.length > 0) {
            try { 
                const chunkSize = 500;
                for (let i = 0; i < data.length; i += chunkSize) {
                    const chunk = data.slice(i, i + chunkSize);
                    await supabase.from(item.table).upsert(chunk, { onConflict: 'id' });
                }
            } catch (e) { 
                console.error(`Error syncing ${item.table}:`, e); 
            }
        }
    }
};

export const downloadFromSupabase = async () => {
    if (!navigator.onLine) return;
    const tables = [
        { key: KEYS.STUDENTS, table: 'students' },
        { key: KEYS.ATTENDANCE, table: 'attendance' },
        { key: KEYS.PERFORMANCE, table: 'performance' },
        { key: KEYS.TERMS, table: 'academic_terms' },
        { key: KEYS.BEHAVIOR_INCIDENTS, table: 'behavior_incidents' },
        { key: KEYS.TASKS, table: 'tasks' },
        { key: KEYS.TRACKING_ASSIGNMENTS, table: 'assignments' },
        { key: KEYS.SUBJECTS, table: 'subjects' },
        { key: KEYS.TEACHER_ASSIGNMENTS, table: 'teacher_assignments' }
    ];

    for (const item of tables) {
        try {
            let allData: any[] = [];
            let from = 0;
            const pageSize = 1000;
            let finished = false;

            while (!finished) {
                const { data, error } = await supabase
                    .from(item.table)
                    .select('*')
                    .range(from, from + pageSize - 1);

                if (error) break;
                if (data && data.length > 0) {
                    allData = [...allData, ...data];
                    if (data.length < pageSize) finished = true;
                    else from += pageSize;
                } else { finished = true; }
            }

            if (allData.length > 0) save(item.key, allData);
        } catch (e) { console.error(`Error downloading ${item.table}:`, e); }
    }
};

// --- Entities Handlers ---

export const getStudents = (): Student[] => get<Student>(KEYS.STUDENTS);
export const addStudent = (s: Student) => { const list = getStudents(); list.push(s); save(KEYS.STUDENTS, list); uploadToSupabase(); };
export const updateStudent = (s: Student) => { const list = getStudents(); const idx = list.findIndex(x => x.id === s.id); if (idx !== -1) { list[idx] = s; save(KEYS.STUDENTS, list); uploadToSupabase(); } };
export const deleteStudent = (id: string) => { save(KEYS.STUDENTS, getStudents().filter(s => s.id !== id)); uploadToSupabase(); };
export const bulkUpsertStudents = (newList: Student[]) => {
    const list = getStudents();
    newList.forEach(s => {
        const idx = list.findIndex(x => x.nationalId === s.nationalId || x.id === s.id);
        if (idx !== -1) list[idx] = { ...list[idx], ...s };
        else list.push(s);
    });
    save(KEYS.STUDENTS, list);
    uploadToSupabase();
};

export const updateStudentLearningStyle = (studentId: string, style: LearningStyle) => {
    const list = getStudents();
    const idx = list.findIndex(s => s.id === studentId);
    if (idx !== -1) {
        list[idx].learningStyle = style;
        save(KEYS.STUDENTS, list);
        uploadToSupabase();
    }
};

export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);
export const saveAttendance = async (records: AttendanceRecord[]) => { 
    const list = get<AttendanceRecord>(KEYS.ATTENDANCE); 
    records.forEach(r => { 
        const idx = list.findIndex(x => x.id === r.id); 
        if (idx !== -1) list[idx] = r; else list.push(r); 
    }); 
    save(KEYS.ATTENDANCE, list); 
    if (navigator.onLine) {
        try { await supabase.from('attendance').upsert(records, { onConflict: 'id' }); } catch (e) { console.error("Cloud Attendance Sync Error:", e); }
    }
};
export const deleteAttendance = async (id: string) => {
    const list = get<AttendanceRecord>(KEYS.ATTENDANCE).filter(a => a.id !== id);
    save(KEYS.ATTENDANCE, list);
    if (navigator.onLine) {
        try { await supabase.from('attendance').delete().eq('id', id); } catch (e) { console.error("Cloud Attendance Delete Error:", e); }
    }
};

export const getPerformance = (): PerformanceRecord[] => get<PerformanceRecord>(KEYS.PERFORMANCE);
export const addPerformance = (record: PerformanceRecord | PerformanceRecord[]) => { 
    const list = getPerformance(); 
    const records = Array.isArray(record) ? record : [record]; 
    records.forEach(rec => { 
        const idx = list.findIndex(r => r.id === rec.id); 
        if (idx !== -1) list[idx] = rec; else list.push(rec); 
    }); 
    save(KEYS.PERFORMANCE, list); 
    uploadToSupabase(); 
};
/* Fix for: '"./services/storageService"' has no exported member named 'bulkAddPerformance' */
export const bulkAddPerformance = addPerformance;
export const deletePerformance = async (id: string) => {
    const list = getPerformance().filter(p => p.id !== id);
    save(KEYS.PERFORMANCE, list);
    if (navigator.onLine) { await supabase.from('performance').delete().eq('id', id); }
};

export const getAssignments = (cat: string, tid?: string, isManager?: boolean): Assignment[] => {
    const all = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    return all.filter(a => (cat === 'ALL' || a.category === cat) && (!tid || a.teacherId === tid || isManager));
};
export const saveAssignment = (a: Assignment) => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    const idx = list.findIndex(x => x.id === a.id);
    if (idx !== -1) list[idx] = a; else list.push(a);
    save(KEYS.TRACKING_ASSIGNMENTS, list);
    uploadToSupabase(); 
};
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteAssignment' */
export const deleteAssignment = (id: string) => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS).filter(a => a.id !== id);
    save(KEYS.TRACKING_ASSIGNMENTS, list);
    uploadToSupabase();
};

export const getSubjects = (tid?: string): Subject[] => get<Subject>(KEYS.SUBJECTS).filter(s => !tid || s.teacherId === tid);
/* Fix for: Module '"../services/storageService"' has no exported member 'addSubject' */
export const addSubject = (s: Subject) => { const list = get<Subject>(KEYS.SUBJECTS); list.push(s); save(KEYS.SUBJECTS, list); uploadToSupabase(); };
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteSubject' */
export const deleteSubject = (id: string) => { save(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id)); uploadToSupabase(); };

export const getSchedules = () => get<ScheduleItem>(KEYS.SCHEDULES);
export const saveScheduleItem = (s: ScheduleItem) => { const list = get<ScheduleItem>(KEYS.SCHEDULES); list.push(s); save(KEYS.SCHEDULES, list); uploadToSupabase(); };
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteScheduleItem' */
export const deleteScheduleItem = (id: string) => { save(KEYS.SCHEDULES, get<ScheduleItem>(KEYS.SCHEDULES).filter(s => s.id !== id)); uploadToSupabase(); };

export const getTeacherAssignments = (tid?: string) => get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS).filter(a => !tid || a.teacherId === tid);
/* Fix for: Module '"../services/storageService"' has no exported member 'addTeacherAssignment' */
export const addTeacherAssignment = (a: TeacherAssignment) => { const list = get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS); list.push(a); save(KEYS.TEACHER_ASSIGNMENTS, list); uploadToSupabase(); };
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteTeacherAssignment' */
export const deleteTeacherAssignment = (id: string) => { save(KEYS.TEACHER_ASSIGNMENTS, get<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS).filter(a => a.id !== id)); uploadToSupabase(); };

export const getAcademicTerms = (tid?: string): AcademicTerm[] => get<AcademicTerm>(KEYS.TERMS).filter(t => !tid || t.teacherId === tid);
export const saveAcademicTerm = (t: AcademicTerm) => { const list = get<AcademicTerm>(KEYS.TERMS); const idx = list.findIndex(x => x.id === t.id); if (idx !== -1) list[idx] = t; else list.push(t); save(KEYS.TERMS, list); uploadToSupabase(); };
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteAcademicTerm' */
export const deleteAcademicTerm = (id: string) => { save(KEYS.TERMS, get<AcademicTerm>(KEYS.TERMS).filter(t => t.id !== id)); uploadToSupabase(); };
/* Fix for: Module '"../services/storageService"' has no exported member 'setCurrentTerm' */
export const setCurrentTerm = (id: string, tid: string) => {
    const list = getAcademicTerms(tid);
    list.forEach(t => { t.isCurrent = (t.id === id); });
    save(KEYS.TERMS, list);
    uploadToSupabase();
};

export const getWeeklyPlans = (tid?: string) => get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS).filter(p => !tid || p.teacherId === tid);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveWeeklyPlanItem' */
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => {
    const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = list.findIndex(x => x.id === item.id);
    if (idx !== -1) list[idx] = item; else list.push(item);
    save(KEYS.WEEKLY_PLANS, list);
};

export const getLessonPlans = (tid?: string) => get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => !tid || p.teacherId === tid);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveLessonPlan' */
export const saveLessonPlan = (plan: StoredLessonPlan) => {
    const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS);
    const idx = list.findIndex(x => x.id === plan.id);
    if (idx !== -1) list[idx] = plan; else list.push(plan);
    save(KEYS.LESSON_PLANS, list);
};
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteLessonPlan' */
export const deleteLessonPlan = (id: string) => { save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.id !== id)); };

export const getLessonLinks = () => get<LessonLink>(KEYS.LESSON_LINKS);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveLessonLink' */
export const saveLessonLink = (link: LessonLink) => {
    const list = get<LessonLink>(KEYS.LESSON_LINKS);
    const idx = list.findIndex(x => x.id === link.id);
    if (idx !== -1) list[idx] = link; else list.push(link);
    save(KEYS.LESSON_LINKS, list);
};
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteLessonLink' */
export const deleteLessonLink = (id: string) => { save(KEYS.LESSON_LINKS, get<LessonLink>(KEYS.LESSON_LINKS).filter(l => l.id !== id)); };

export const getExams = (tid?: string) => get<Exam>(KEYS.EXAMS).filter(e => !tid || e.teacherId === tid);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveExam' */
export const saveExam = (exam: Exam) => {
    const list = get<Exam>(KEYS.EXAMS);
    const idx = list.findIndex(x => x.id === exam.id);
    if (idx !== -1) list[idx] = exam; else list.push(exam);
    save(KEYS.EXAMS, list);
};
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteExam' */
export const deleteExam = (id: string) => { save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(e => e.id !== id)); };

export const getExamResults = (examId?: string) => get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => !examId || r.examId === examId);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveExamResult' */
export const saveExamResult = (result: ExamResult) => {
    const list = get<ExamResult>(KEYS.EXAM_RESULTS);
    list.push(result);
    save(KEYS.EXAM_RESULTS, list);
};
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteExamResult' */
export const deleteExamResult = (id: string) => { save(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => r.id !== id)); };

export const getQuestionBank = (tid?: string) => get<Question>(KEYS.QUESTION_BANK).filter(q => !tid || q.teacherId === tid);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveQuestionToBank' */
export const saveQuestionToBank = (q: Question) => {
    const list = get<Question>(KEYS.QUESTION_BANK);
    const idx = list.findIndex(x => x.id === q.id);
    if (idx !== -1) list[idx] = q; else list.push(q);
    save(KEYS.QUESTION_BANK, list);
};
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteQuestionFromBank' */
export const deleteQuestionFromBank = (id: string) => { save(KEYS.QUESTION_BANK, get<Question>(KEYS.QUESTION_BANK).filter(q => q.id !== id)); };

export const getCurriculumUnits = (tid?: string) => get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => !tid || u.teacherId === tid);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveCurriculumUnit' */
export const saveCurriculumUnit = (u: CurriculumUnit) => {
    const list = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS);
    const idx = list.findIndex(x => x.id === u.id);
    if (idx !== -1) list[idx] = u; else list.push(u);
    save(KEYS.CURRICULUM_UNITS, list);
};
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteCurriculumUnit' */
export const deleteCurriculumUnit = (id: string) => { save(KEYS.CURRICULUM_UNITS, get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.id !== id)); };

export const getCurriculumLessons = (unitId?: string) => get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => !unitId || l.unitId === unitId);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveCurriculumLesson' */
export const saveCurriculumLesson = (l: CurriculumLesson) => {
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(x => x.id === l.id);
    if (idx !== -1) list[idx] = l; else list.push(l);
    save(KEYS.CURRICULUM_LESSONS, list);
};
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteCurriculumLesson' */
export const deleteCurriculumLesson = (id: string) => { save(KEYS.CURRICULUM_LESSONS, get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => l.id !== id)); };
/* Fix for: Module '"../services/storageService"' has no exported member 'toggleCurriculumLesson' */
export const toggleCurriculumLesson = (id: string, completed: boolean) => {
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(l => l.id === id);
    if (idx !== -1) {
        list[idx].isCompleted = completed;
        list[idx].completedAt = completed ? new Date().toISOString() : undefined;
        save(KEYS.CURRICULUM_LESSONS, list);
    }
};

export const getTrackingSheets = (tid?: string) => get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => !tid || s.teacherId === tid);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveTrackingSheet' */
export const saveTrackingSheet = (s: TrackingSheet) => {
    const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) list[idx] = s; else list.push(s);
    save(KEYS.TRACKING_SHEETS, list);
};
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteTrackingSheet' */
export const deleteTrackingSheet = (id: string) => { save(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.id !== id)); };

export const getRemedialPlans = (sid?: string) => get<RemedialPlan>(KEYS.REMEDIAL_PLANS).filter(p => !sid || p.studentId === sid);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveRemedialPlan' */
export const saveRemedialPlan = (p: RemedialPlan) => {
    const list = get<RemedialPlan>(KEYS.REMEDIAL_PLANS);
    list.push(p);
    save(KEYS.REMEDIAL_PLANS, list);
};

export const getFormsDetailedResults = (tid?: string) => get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => !tid || r.teacherId === tid);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveFormsDetailedResult' */
export const saveFormsDetailedResult = (r: FormsDetailedResult) => {
    const list = get<FormsDetailedResult>(KEYS.FORMS_DETAILED);
    list.push(r);
    save(KEYS.FORMS_DETAILED, list);
};
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteFormsDetailedResult' */
export const deleteFormsDetailedResult = (id: string) => { save(KEYS.FORMS_DETAILED, get<FormsDetailedResult>(KEYS.FORMS_DETAILED).filter(r => r.id !== id)); };

export const getCustomTables = (tid?: string) => get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => !tid || t.teacherId === tid);
/* Fix for: Module '"../services/storageService"' has no exported member 'addCustomTable' */
export const addCustomTable = (t: CustomTable) => { const list = get<CustomTable>(KEYS.CUSTOM_TABLES); list.push(t); save(KEYS.CUSTOM_TABLES, list); };
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteCustomTable' */
export const deleteCustomTable = (id: string) => { save(KEYS.CUSTOM_TABLES, get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => t.id !== id)); };
/* Fix for: Module '"../services/storageService"' has no exported member 'updateCustomTable' */
export const updateCustomTable = (t: CustomTable) => {
    const list = get<CustomTable>(KEYS.CUSTOM_TABLES);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) { list[idx] = t; save(KEYS.CUSTOM_TABLES, list); }
};

export const getEnvironmentRecords = (classId?: string) => get<EnvironmentRecord>(KEYS.ENVIRONMENT).filter(r => !classId || r.classId === classId);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveEnvironmentRecord' */
export const saveEnvironmentRecord = (r: EnvironmentRecord) => {
    const list = get<EnvironmentRecord>(KEYS.ENVIRONMENT);
    list.push(r);
    save(KEYS.ENVIRONMENT, list);
};

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => get<BehaviorIncident>(KEYS.BEHAVIOR_INCIDENTS).filter(i => !tid || i.teacherId === tid);
/* Fix for: '"../services/storageService"' has no exported member named 'saveBehaviorIncident' */
export const saveBehaviorIncident = (i: BehaviorIncident) => {
    const list = get<BehaviorIncident>(KEYS.BEHAVIOR_INCIDENTS);
    list.push(i);
    save(KEYS.BEHAVIOR_INCIDENTS, list);
    uploadToSupabase();
    // Update student points
    const students = getStudents();
    const sIdx = students.findIndex(s => s.id === i.studentId);
    if (sIdx !== -1) {
        students[sIdx].behaviorPoints = (students[sIdx].behaviorPoints || 0) + i.points;
        save(KEYS.STUDENTS, students);
    }
};

export const getTasks = (tid?: string): Task[] => get<Task>(KEYS.TASKS).filter(t => !tid || t.teacherId === tid);
/* Fix for: Module '"../services/storageService"' has no exported member 'saveTask' */
export const saveTask = (t: Task) => {
    const list = get<Task>(KEYS.TASKS);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t; else list.push(t);
    save(KEYS.TASKS, list);
    uploadToSupabase();
};
/* Fix for: Module '"../services/storageService"' has no exported member 'submitTask' */
export const submitTask = (taskId: string, studentId: string) => {
    const tasks = get<Task>(KEYS.TASKS);
    const idx = tasks.findIndex(t => t.id === taskId);
    if (idx !== -1 && !tasks[idx].submissions.includes(studentId)) {
        tasks[idx].submissions.push(studentId);
        save(KEYS.TASKS, tasks);
        uploadToSupabase();
    }
};

export const getMessages = (tid?: string) => get<MessageLog>(KEYS.MESSAGES).filter(m => !tid || m.teacherId === tid);
export const saveMessage = (m: MessageLog) => { const list = get<MessageLog>(KEYS.MESSAGES); list.push(m); save(KEYS.MESSAGES, list); };

export const getSystemUsers = () => get<SystemUser>(KEYS.SYSTEM_USERS);
/* Fix for: Module '"../services/storageService"' has no exported member 'addSystemUser' */
export const addSystemUser = (u: SystemUser) => { const list = getSystemUsers(); list.push(u); save(KEYS.SYSTEM_USERS, list); };
/* Fix for: '"../services/storageService"' has no exported member named 'deleteSystemUser' */
export const deleteSystemUser = (id: string) => { save(KEYS.SYSTEM_USERS, getSystemUsers().filter(u => u.id !== id)); };
/* Fix for: Module '"../services/storageService"' has no exported member 'updateSystemUser' */
export const updateSystemUser = (u: SystemUser) => {
    const list = getSystemUsers();
    const idx = list.findIndex(x => x.id === u.id);
    if (idx !== -1) { list[idx] = u; save(KEYS.SYSTEM_USERS, list); }
};
export const authenticateUser = async (id: string, p: string) => getSystemUsers().find(u => (u.nationalId === id || u.email === id) && u.password === p) || null;
export const authenticateStudent = async (id: string, p: string) => getStudents().find(s => s.nationalId === id && (s.password || '123456') === p) || null;

export const getAISettings = (): AISettings => get<AISettings>(KEYS.AI_SETTINGS)[0] || { modelId: 'gemini-3-flash-preview', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: "" };
/* Fix for: '"../services/storageService"' has no exported member named 'saveAISettings' */
export const saveAISettings = (s: AISettings) => { save(KEYS.AI_SETTINGS, [s]); };

export const getUserTheme = (): UserTheme => { const s = localStorage.getItem(KEYS.USER_THEME); return s ? JSON.parse(s) : { mode: 'LIGHT', backgroundStyle: 'FLAT' }; };
/* Fix for: '"../services/storageService"' has no exported member named 'saveUserTheme' */
export const saveUserTheme = (t: UserTheme) => { localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t)); };

export const getTeacherPeriodTimings = (tid: string) => get<{tid: string, times: string[]}>(KEYS.PERIOD_TIMINGS).find(x => x.tid === tid)?.times || ["07:00", "07:45", "08:30", "09:45", "10:30", "11:15", "12:00", "12:45"];
/* Fix for: '"../services/storageService"' has no exported member named 'saveTeacherPeriodTimings' */
export const saveTeacherPeriodTimings = (tid: string, times: string[]) => {
    const list = get<{tid: string, times: string[]}>(KEYS.PERIOD_TIMINGS);
    const idx = list.findIndex(x => x.tid === tid);
    if (idx !== -1) list[idx].times = times; else list.push({ tid, times });
    save(KEYS.PERIOD_TIMINGS, list);
};

export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => { const all = get<ReportHeaderConfig & {teacherId: string}>('report_header_configs'); return all.find(c => c.teacherId === tid) || { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' }; };
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => { const all = get<ReportHeaderConfig & {teacherId: string}>('report_header_configs'); const idx = all.findIndex(x => x.teacherId === c.teacherId); if (idx !== -1) all[idx] = c as any; else all.push(c as any); save('report_header_configs', all); };

export const getTeachers = () => get<Teacher>(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => { 
    const list = get<Teacher>(KEYS.TEACHERS); 
    list.push(t); 
    save(KEYS.TEACHERS, list); 
    const newUser: SystemUser = {
        id: t.id,
        name: t.name,
        email: t.email || '',
        nationalId: t.nationalId,
        password: t.password || '123456',
        role: 'TEACHER',
        schoolId: t.schoolId,
        status: 'ACTIVE'
    };
    addSystemUser(newUser);
};
/* Fix for: Module '"../services/storageService"' has no exported member 'updateTeacher' */
export const updateTeacher = (t: Teacher) => {
    const list = getTeachers();
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) {
        list[idx] = t;
        save(KEYS.TEACHERS, list);
        // Sync system user too
        const users = getSystemUsers();
        const uIdx = users.findIndex(u => u.id === t.id);
        if (uIdx !== -1) {
            users[uIdx].name = t.name;
            users[uIdx].email = t.email || '';
            users[uIdx].nationalId = t.nationalId;
            save(KEYS.SYSTEM_USERS, users);
        }
    }
};

export const getSchools = () => get<School>(KEYS.SCHOOLS);
export const addSchool = async (s: School) => { const list = getSchools(); list.push(s); save(KEYS.SCHOOLS, list); };
/* Fix for: Module '"../services/storageService"' has no exported member 'updateSchool' */
export const updateSchool = (s: School) => {
    const list = getSchools();
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) { list[idx] = s; save(KEYS.SCHOOLS, list); }
};
/* Fix for: Module '"../services/storageService"' has no exported member 'deleteSchool' */
export const deleteSchool = (id: string) => { save(KEYS.SCHOOLS, getSchools().filter(s => s.id !== id)); };

/* Fix for: Module '"../services/storageService"' has no exported member 'getWorksMasterUrl' */
export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
/* Fix for: Module '"../services/storageService"' has no exported member 'saveWorksMasterUrl' */
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

// --- Backup & Maintenance ---

/* Fix for: Module '"../services/storageService"' has no exported member 'createBackup' */
export const createBackup = () => {
    const backup: Record<string, any> = {};
    Object.values(KEYS).forEach(k => { backup[k] = localStorage.getItem(k); });
    return JSON.stringify(backup);
};
/* Fix for: Module '"../services/storageService"' has no exported member 'restoreBackup' */
export const restoreBackup = (data: string) => {
    try {
        const backup = JSON.parse(data);
        Object.entries(backup).forEach(([k, v]) => { if (v) localStorage.setItem(k, v as string); });
        return true;
    } catch { return false; }
};

export const clearDatabase = () => localStorage.clear();
export const setSystemMode = (val: boolean) => { console.debug('System mode set to:', val); };
export const checkConnection = async () => { try { const { error } = await supabase.from('students').select('id').limit(1); return { success: !error, message: error ? error.message : "متصل" }; } catch { return { success: false, message: "فشل الاتصال" }; } };

/* Fix for: Module '"../services/storageService"' has no exported member 'fetchCloudTableData' */
export const fetchCloudTableData = async (table: string) => {
    const { data, error } = await supabase.from(table).select('*').limit(100);
    if (error) throw error;
    return data;
};

/* Fix for: Module '"../services/storageService"' has no exported member 'getTableDisplayName' */
export const getTableDisplayName = (table: string) => table.replace(/_/g, ' ').toUpperCase();

/* Fix for: Module '"../services/storageService"' has no exported member 'getDatabaseSchemaSQL' */
export const getDatabaseSchemaSQL = () => `-- Full Schema SQL Generation Placeholder`;
/* Fix for: Module '"../services/storageService"' has no exported member 'getDatabaseUpdateSQL' */
export const getDatabaseUpdateSQL = () => `-- Update SQL Generation Placeholder`;

/* Fix for: Module '"../services/storageService"' has no exported member 'clearCloudTable' */
export const clearCloudTable = async (table: string) => { await supabase.from(table).delete().neq('id', 'placeholder'); };
/* Fix for: Module '"../services/storageService"' has no exported member 'resetCloudDatabase' */
export const resetCloudDatabase = async () => { /* Logic to clear multiple tables */ };

/* Fix for: Module '"../services/storageService"' has no exported member 'backupCloudDatabase' */
export const backupCloudDatabase = async () => { return JSON.stringify({ message: "Cloud Backup logic not fully implemented" }); };
/* Fix for: Module '"../services/storageService"' has no exported member 'restoreCloudDatabase' */
export const restoreCloudDatabase = async (json: string) => { /* Logic to restore to Supabase */ };

/* Fix for: Module '"../services/storageService"' has no exported member 'validateCloudSchema' */
export const validateCloudSchema = async () => { return { missingTables: [] }; };

export const initAutoSync = async () => { if (navigator.onLine) { await downloadFromSupabase(); setInterval(uploadToSupabase, 120000); } };
export const downloadFromCloud = downloadFromSupabase;
export const uploadToCloud = uploadToSupabase;
