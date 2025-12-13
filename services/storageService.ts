
import {
    Student, Teacher, School, SystemUser, AttendanceRecord, PerformanceRecord,
    Subject, ScheduleItem, TeacherAssignment, Assignment, WeeklyPlanItem,
    LessonLink, LessonBlock, StoredLessonPlan, MessageLog, Feedback,
    AISettings, CustomTable, ReportHeaderConfig, UserTheme,
    Exam, ExamResult, Question, CurriculumUnit, CurriculumLesson, MicroConcept,
    TrackingSheet, AcademicTerm, TermPeriod
} from '../types';
import { supabase } from './supabaseClient';

// Constants
const KEYS = {
    STUDENTS: 'students',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    USERS: 'system_users',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    ASSIGNMENTS: 'assignments', 
    TEACHER_ASSIGNMENTS: 'teacher_assignments',
    WEEKLY_PLANS: 'weekly_plans',
    LESSON_LINKS: 'lesson_links',
    LESSON_PLANS: 'lesson_plans',
    MESSAGES: 'message_logs',
    FEEDBACK: 'feedback',
    AI_SETTINGS: 'ai_settings',
    CUSTOM_TABLES: 'custom_tables',
    REPORT_CONFIG: 'report_header_config',
    THEME: 'user_theme',
    EXAMS: 'exams',
    EXAM_RESULTS: 'exam_results',
    QUESTION_BANK: 'question_bank',
    CURRICULUM_UNITS: 'curriculum_units',
    CURRICULUM_LESSONS: 'curriculum_lessons',
    MICRO_CONCEPTS: 'micro_concepts',
    TRACKING_SHEETS: 'tracking_sheets',
    ACADEMIC_TERMS: 'academic_terms',
    WORKS_MASTER_URL: 'works_master_url',
    PERIOD_TIMINGS: 'period_timings'
};

export const DEFAULT_PERIOD_TIMES = [
    "07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15",
    "09:15 - 10:00", "10:30 - 11:15", "11:15 - 12:00",
    "12:00 - 12:45", "12:45 - 01:30"
];

export const DB_MAP: Record<string, string> = {
    SCHOOLS: 'schools',
    TEACHERS: 'teachers',
    USERS: 'system_users',
    STUDENTS: 'students',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    ASSIGNMENTS: 'assignments'
};

// Helper Functions
const get = <T>(key: string): T[] => {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

const updateCache = <T>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- Event Emitter logic ---
export type SyncStatus = 'IDLE' | 'SYNCING' | 'ONLINE' | 'OFFLINE' | 'ERROR';
type Listener = (status: SyncStatus) => void;
type DataListener = () => void;

let syncStatus: SyncStatus = 'IDLE';
const syncListeners: Set<Listener> = new Set();
const dataListeners: Set<DataListener> = new Set();

const setSyncStatus = (status: SyncStatus) => {
    syncStatus = status;
    syncListeners.forEach(l => l(status));
};

export const subscribeToSyncStatus = (listener: Listener) => {
    syncListeners.add(listener);
    return () => syncListeners.delete(listener);
};

export const subscribeToDataChanges = (listener: DataListener) => {
    dataListeners.add(listener);
    return () => dataListeners.delete(listener);
};

const notifyDataChange = () => {
    dataListeners.forEach(l => l());
};

// Mode
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
export const setSystemMode = (online: boolean) => {
    isOnline = online;
    setSyncStatus(online ? 'ONLINE' : 'OFFLINE');
};

// --- DATA ACCESSORS & MUTATORS ---

// 1. Schools
export const getSchools = (): School[] => get(KEYS.SCHOOLS);
export const addSchool = (school: School) => {
    const data = getSchools();
    data.push(school);
    updateCache(KEYS.SCHOOLS, data);
    notifyDataChange();
};
export const updateSchool = (school: School) => {
    const data = getSchools().map(s => s.id === school.id ? school : s);
    updateCache(KEYS.SCHOOLS, data);
    notifyDataChange();
};
export const deleteSchool = (id: string) => {
    const data = getSchools().filter(s => s.id !== id);
    updateCache(KEYS.SCHOOLS, data);
    notifyDataChange();
};

// 2. Teachers
export const getTeachers = (): Teacher[] => get(KEYS.TEACHERS);
export const addTeacher = (teacher: Teacher) => {
    const data = getTeachers();
    data.push(teacher);
    updateCache(KEYS.TEACHERS, data);
    // Also add to system users if not exists
    const users = getSystemUsers();
    if (!users.find(u => u.nationalId === teacher.nationalId)) {
        const newUser: SystemUser = {
            id: teacher.id,
            name: teacher.name,
            email: teacher.email || '',
            nationalId: teacher.nationalId,
            password: teacher.password,
            role: 'TEACHER',
            schoolId: teacher.schoolId,
            status: 'ACTIVE'
        };
        addSystemUser(newUser);
    }
    notifyDataChange();
};
export const updateTeacher = (teacher: Teacher) => {
    const data = getTeachers().map(t => t.id === teacher.id ? teacher : t);
    updateCache(KEYS.TEACHERS, data);
    notifyDataChange();
};

// 3. System Users
export const getSystemUsers = (): SystemUser[] => get(KEYS.USERS);
export const addSystemUser = (user: SystemUser) => {
    const data = getSystemUsers();
    data.push(user);
    updateCache(KEYS.USERS, data);
    notifyDataChange();
};
export const updateSystemUser = (user: SystemUser) => {
    const data = getSystemUsers().map(u => u.id === user.id ? user : u);
    updateCache(KEYS.USERS, data);
    notifyDataChange();
};
export const deleteSystemUser = (id: string) => {
    const data = getSystemUsers().filter(u => u.id !== id);
    updateCache(KEYS.USERS, data);
    notifyDataChange();
};

// 4. Students
export const getStudents = (): Student[] => get(KEYS.STUDENTS);
export const addStudent = (student: Student) => {
    const data = getStudents();
    data.push(student);
    updateCache(KEYS.STUDENTS, data);
    notifyDataChange();
};
export const updateStudent = (student: Student) => {
    const data = getStudents().map(s => s.id === student.id ? student : s);
    updateCache(KEYS.STUDENTS, data);
    notifyDataChange();
};
export const deleteStudent = (id: string) => {
    const data = getStudents().filter(s => s.id !== id);
    updateCache(KEYS.STUDENTS, data);
    notifyDataChange();
};
export const deleteAllStudents = () => {
    updateCache(KEYS.STUDENTS, []);
    notifyDataChange();
};
export const bulkAddStudents = (students: Student[]) => {
    const current = getStudents();
    updateCache(KEYS.STUDENTS, [...current, ...students]);
    notifyDataChange();
};
export const bulkUpsertStudents = (students: Student[], key: keyof Student) => {
    const current = getStudents();
    const map = new Map(current.map(s => [String(s[key]), s]));
    students.forEach(s => {
        if (s[key]) map.set(String(s[key]), { ...map.get(String(s[key])), ...s });
        else map.set(s.id, s);
    });
    updateCache(KEYS.STUDENTS, Array.from(map.values()));
    notifyDataChange();
};

// 5. Attendance
export const getAttendance = (): AttendanceRecord[] => get(KEYS.ATTENDANCE);
export const saveAttendance = (records: AttendanceRecord[]) => {
    const current = getAttendance();
    const newRecords = [...current];
    records.forEach(rec => {
        const idx = newRecords.findIndex(r => r.id === rec.id || (r.studentId === rec.studentId && r.date === rec.date && r.period === rec.period && r.subject === rec.subject));
        if (idx >= 0) newRecords[idx] = rec;
        else newRecords.push(rec);
    });
    updateCache(KEYS.ATTENDANCE, newRecords);
    notifyDataChange();
};
export const bulkAddAttendance = (records: AttendanceRecord[]) => saveAttendance(records);

// 6. Performance
export const getPerformance = (): PerformanceRecord[] => get(KEYS.PERFORMANCE);
export const addPerformance = (record: PerformanceRecord) => {
    const data = getPerformance();
    data.push(record);
    updateCache(KEYS.PERFORMANCE, data);
    notifyDataChange();
};
export const bulkAddPerformance = (records: PerformanceRecord[]) => {
    const current = getPerformance();
    updateCache(KEYS.PERFORMANCE, [...current, ...records]);
    notifyDataChange();
};
export const deletePerformance = (id: string) => {
    const data = getPerformance().filter(p => p.id !== id);
    updateCache(KEYS.PERFORMANCE, data);
    notifyDataChange();
};

// 7. Assignments (Works Tracking Columns)
export const getAssignments = (category: string, teacherId?: string, includeAll: boolean = false): Assignment[] => {
    const all = get<Assignment>(KEYS.ASSIGNMENTS);
    let filtered = all;
    if (category !== 'ALL') filtered = filtered.filter(a => a.category === category);
    if (!includeAll && teacherId) filtered = filtered.filter(a => a.teacherId === teacherId || !a.teacherId);
    return filtered;
};
export const saveAssignment = (assignment: Assignment) => {
    const data = get<Assignment>(KEYS.ASSIGNMENTS);
    const idx = data.findIndex(a => a.id === assignment.id);
    if (idx >= 0) data[idx] = assignment;
    else data.push(assignment);
    updateCache(KEYS.ASSIGNMENTS, data);
    notifyDataChange();
};
export const deleteAssignment = (id: string) => {
    const data = get<Assignment>(KEYS.ASSIGNMENTS).filter(a => a.id !== id);
    updateCache(KEYS.ASSIGNMENTS, data);
    notifyDataChange();
};

// 8. Schedules
export const getSchedules = (): ScheduleItem[] => get(KEYS.SCHEDULES);
export const saveScheduleItem = (item: ScheduleItem) => {
    const data = getSchedules();
    const idx = data.findIndex(s => s.id === item.id);
    if (idx >= 0) data[idx] = item;
    else data.push(item);
    updateCache(KEYS.SCHEDULES, data);
    notifyDataChange();
};
export const deleteScheduleItem = (id: string) => {
    const data = getSchedules().filter(s => s.id !== id);
    updateCache(KEYS.SCHEDULES, data);
    notifyDataChange();
};

// 9. Teacher Assignments
export const getTeacherAssignments = (): TeacherAssignment[] => get(KEYS.TEACHER_ASSIGNMENTS);

// 10. Subjects
export const getSubjects = (teacherId?: string): Subject[] => {
    const all = get<Subject>(KEYS.SUBJECTS);
    if (!teacherId) return all;
    return all.filter(s => s.teacherId === teacherId || !s.teacherId);
};
export const addSubject = (subject: Subject) => {
    const data = get<Subject>(KEYS.SUBJECTS);
    data.push(subject);
    updateCache(KEYS.SUBJECTS, data);
    notifyDataChange();
};
export const deleteSubject = (id: string) => {
    const data = get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id);
    updateCache(KEYS.SUBJECTS, data);
    notifyDataChange();
};

// 11. Weekly Plans
export const getWeeklyPlans = (teacherId?: string): WeeklyPlanItem[] => {
    const all = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    if(teacherId) return all.filter(p => p.teacherId === teacherId);
    return all;
};
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => {
    const data = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = data.findIndex(p => p.id === item.id);
    if (idx >= 0) data[idx] = item;
    else data.push(item);
    updateCache(KEYS.WEEKLY_PLANS, data);
    notifyDataChange();
};

// 12. Lesson Links
export const getLessonLinks = (): LessonLink[] => get(KEYS.LESSON_LINKS);
export const saveLessonLink = (link: LessonLink) => {
    const data = getLessonLinks();
    const idx = data.findIndex(l => l.id === link.id);
    if (idx >= 0) data[idx] = link;
    else data.push(link);
    updateCache(KEYS.LESSON_LINKS, data);
    notifyDataChange();
};
export const deleteLessonLink = (id: string) => {
    const data = getLessonLinks().filter(l => l.id !== id);
    updateCache(KEYS.LESSON_LINKS, data);
    notifyDataChange();
};

// 13. Lesson Plans
export const getLessonPlans = (teacherId?: string): StoredLessonPlan[] => {
    const all = get<StoredLessonPlan>(KEYS.LESSON_PLANS);
    if (teacherId) return all.filter(p => p.teacherId === teacherId);
    return all;
};
export const saveLessonPlan = (plan: StoredLessonPlan) => {
    const data = get<StoredLessonPlan>(KEYS.LESSON_PLANS);
    const idx = data.findIndex(p => p.id === plan.id);
    if (idx >= 0) data[idx] = plan;
    else data.push(plan);
    updateCache(KEYS.LESSON_PLANS, data);
    notifyDataChange();
};
export const deleteLessonPlan = (id: string) => {
    const data = get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.id !== id);
    updateCache(KEYS.LESSON_PLANS, data);
    notifyDataChange();
};

// 14. Messages
export const getMessages = (teacherId?: string): MessageLog[] => {
    const all = get<MessageLog>(KEYS.MESSAGES);
    if (teacherId) return all.filter(m => m.teacherId === teacherId || !m.teacherId);
    return all;
};
export const saveMessage = (msg: MessageLog) => {
    const data = get<MessageLog>(KEYS.MESSAGES);
    data.push(msg);
    updateCache(KEYS.MESSAGES, data);
    notifyDataChange();
};

// 15. Feedback
export const getFeedback = (): Feedback[] => get(KEYS.FEEDBACK);

// 16. AI Settings
export const getAISettings = (): AISettings => {
    const saved = localStorage.getItem(KEYS.AI_SETTINGS);
    return saved ? JSON.parse(saved) : { modelId: 'gemini-2.5-flash', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' };
};
export const saveAISettings = (settings: AISettings) => {
    localStorage.setItem(KEYS.AI_SETTINGS, JSON.stringify(settings));
};

// 17. Custom Tables
export const getCustomTables = (teacherId?: string): CustomTable[] => {
    const all = get<CustomTable>(KEYS.CUSTOM_TABLES);
    if (teacherId) return all.filter(t => t.teacherId === teacherId);
    return all;
};
export const addCustomTable = (table: CustomTable) => {
    const data = get<CustomTable>(KEYS.CUSTOM_TABLES);
    data.push(table);
    updateCache(KEYS.CUSTOM_TABLES, data);
    notifyDataChange();
};
export const updateCustomTable = (table: CustomTable) => {
    const data = get<CustomTable>(KEYS.CUSTOM_TABLES).map(t => t.id === table.id ? table : t);
    updateCache(KEYS.CUSTOM_TABLES, data);
    notifyDataChange();
};
export const deleteCustomTable = (id: string) => {
    const data = get<CustomTable>(KEYS.CUSTOM_TABLES).filter(t => t.id !== id);
    updateCache(KEYS.CUSTOM_TABLES, data);
    notifyDataChange();
};

// 18. Report Config
export const getReportHeaderConfig = (teacherId?: string): ReportHeaderConfig => {
    const saved = localStorage.getItem(KEYS.REPORT_CONFIG);
    return saved ? JSON.parse(saved) : { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    localStorage.setItem(KEYS.REPORT_CONFIG, JSON.stringify(config));
};

// 19. Theme
export const getUserTheme = (): UserTheme => {
    const saved = localStorage.getItem(KEYS.THEME);
    return saved ? JSON.parse(saved) : { mode: 'LIGHT', backgroundStyle: 'FLAT' };
};
export const saveUserTheme = (theme: UserTheme) => {
    localStorage.setItem(KEYS.THEME, JSON.stringify(theme));
};

// 20. Exams
export const getExams = (teacherId?: string): Exam[] => {
    const all = get<Exam>(KEYS.EXAMS);
    if (teacherId) return all.filter(e => e.teacherId === teacherId);
    return all;
};
export const saveExam = (exam: Exam) => {
    const data = get<Exam>(KEYS.EXAMS);
    const idx = data.findIndex(e => e.id === exam.id);
    if (idx >= 0) data[idx] = exam;
    else data.push(exam);
    updateCache(KEYS.EXAMS, data);
    notifyDataChange();
};
export const deleteExam = (id: string) => {
    const data = get<Exam>(KEYS.EXAMS).filter(e => e.id !== id);
    updateCache(KEYS.EXAMS, data);
    notifyDataChange();
};

// 21. Exam Results
export const saveExamResult = (result: ExamResult) => {
    const data = get<ExamResult>(KEYS.EXAM_RESULTS);
    data.push(result);
    updateCache(KEYS.EXAM_RESULTS, data);
    notifyDataChange();
};

// 22. Question Bank
export const getQuestionBank = (teacherId?: string): Question[] => {
    const all = get<Question>(KEYS.QUESTION_BANK);
    if (teacherId) return all.filter(q => q.teacherId === teacherId);
    return all;
};
export const saveQuestionToBank = (question: Question) => {
    const data = get<Question>(KEYS.QUESTION_BANK);
    const idx = data.findIndex(q => q.id === question.id);
    if (idx >= 0) data[idx] = question;
    else data.push(question);
    updateCache(KEYS.QUESTION_BANK, data);
    notifyDataChange();
};
export const deleteQuestionFromBank = (id: string) => {
    const data = get<Question>(KEYS.QUESTION_BANK).filter(q => q.id !== id);
    updateCache(KEYS.QUESTION_BANK, data);
    notifyDataChange();
};

// 23. Curriculum
export const getCurriculumUnits = (teacherId?: string): CurriculumUnit[] => {
    const all = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS);
    if (teacherId) return all.filter(u => u.teacherId === teacherId);
    return all;
};
export const saveCurriculumUnit = (unit: CurriculumUnit) => {
    const data = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS);
    const idx = data.findIndex(u => u.id === unit.id);
    if (idx >= 0) data[idx] = unit;
    else data.push(unit);
    updateCache(KEYS.CURRICULUM_UNITS, data);
    notifyDataChange();
};
export const deleteCurriculumUnit = (id: string) => {
    const data = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS).filter(u => u.id !== id);
    updateCache(KEYS.CURRICULUM_UNITS, data);
    notifyDataChange();
};

export const getCurriculumLessons = (): CurriculumLesson[] => get(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = (lesson: CurriculumLesson) => {
    const data = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = data.findIndex(l => l.id === lesson.id);
    if (idx >= 0) data[idx] = lesson;
    else data.push(lesson);
    updateCache(KEYS.CURRICULUM_LESSONS, data);
    notifyDataChange();
};
export const deleteCurriculumLesson = (id: string) => {
    const data = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS).filter(l => l.id !== id);
    updateCache(KEYS.CURRICULUM_LESSONS, data);
    notifyDataChange();
};

export const getMicroConcepts = (teacherId?: string): MicroConcept[] => {
    const all = get<MicroConcept>(KEYS.MICRO_CONCEPTS);
    if(teacherId) return all.filter(m => m.teacherId === teacherId || !m.teacherId);
    return all;
};
export const saveMicroConcept = (concept: MicroConcept) => {
    const data = get<MicroConcept>(KEYS.MICRO_CONCEPTS);
    data.push(concept);
    updateCache(KEYS.MICRO_CONCEPTS, data);
    notifyDataChange();
};
export const deleteMicroConcept = (id: string) => {
    const data = get<MicroConcept>(KEYS.MICRO_CONCEPTS).filter(m => m.id !== id);
    updateCache(KEYS.MICRO_CONCEPTS, data);
    notifyDataChange();
};

// 24. Tracking Sheets
export const getTrackingSheets = (teacherId?: string): TrackingSheet[] => {
    const all = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    if(teacherId) return all.filter(t => t.teacherId === teacherId);
    return all;
};
export const saveTrackingSheet = (sheet: TrackingSheet) => {
    const data = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    const idx = data.findIndex(s => s.id === sheet.id);
    if (idx >= 0) data[idx] = sheet;
    else data.push(sheet);
    updateCache(KEYS.TRACKING_SHEETS, data);
    notifyDataChange();
};
export const deleteTrackingSheet = (id: string) => {
    const data = get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.id !== id);
    updateCache(KEYS.TRACKING_SHEETS, data);
    notifyDataChange();
};

// 25. Academic Terms
export const getAcademicTerms = (teacherId?: string): AcademicTerm[] => {
    return get(KEYS.ACADEMIC_TERMS);
};
export const saveAcademicTerm = (term: AcademicTerm) => {
    const data = get<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    const idx = data.findIndex(t => t.id === term.id);
    if (idx >= 0) data[idx] = term;
    else data.push(term);
    updateCache(KEYS.ACADEMIC_TERMS, data);
    notifyDataChange();
};
export const deleteAcademicTerm = (id: string) => {
    const data = get<AcademicTerm>(KEYS.ACADEMIC_TERMS).filter(t => t.id !== id);
    updateCache(KEYS.ACADEMIC_TERMS, data);
    notifyDataChange();
};
export const setCurrentTerm = (id: string, teacherId?: string) => {
    const data = get<AcademicTerm>(KEYS.ACADEMIC_TERMS).map(t => ({...t, isCurrent: t.id === id}));
    updateCache(KEYS.ACADEMIC_TERMS, data);
    notifyDataChange();
};

// 26. Period Timings
export const getTeacherPeriodTimings = (teacherId?: string): string[] => {
    const saved = localStorage.getItem(KEYS.PERIOD_TIMINGS);
    return saved ? JSON.parse(saved) : DEFAULT_PERIOD_TIMES;
};
export const saveTeacherPeriodTimings = (teacherId: string, timings: string[]) => {
    localStorage.setItem(KEYS.PERIOD_TIMINGS, JSON.stringify(timings));
};

// 27. Works Master URL
export const getWorksMasterUrl = (): string => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

// --- Auth ---
export const authenticateUser = async (emailOrId: string, pass: string): Promise<SystemUser | null> => {
    const users = getSystemUsers();
    let user = users.find(u => (u.email === emailOrId || u.nationalId === emailOrId) && u.password === pass);
    
    if (!user) {
        const teachers = getTeachers();
        const teacher = teachers.find(t => (t.email === emailOrId || t.nationalId === emailOrId) && t.password === pass);
        if (teacher) {
            user = {
                id: teacher.id,
                name: teacher.name,
                email: teacher.email || '',
                nationalId: teacher.nationalId,
                role: 'TEACHER',
                schoolId: teacher.schoolId,
                status: 'ACTIVE',
                password: teacher.password 
            };
        }
    }
    return user || null;
};

export const authenticateStudent = async (id: string, pass: string): Promise<Student | null> => {
    const students = getStudents();
    const student = students.find(s => s.nationalId === id);
    if (!student) return null;
    
    const validPass = student.password || student.nationalId?.slice(-4);
    if (pass === validPass) return student;
    
    return null;
};

// --- Backup & Restore ---
export const createBackup = () => {
    const backup: any = {};
    Object.values(KEYS).forEach(key => {
        const val = localStorage.getItem(key);
        if (val) backup[key] = JSON.parse(val);
    });
    return JSON.stringify(backup);
};

export const restoreBackup = (json: string) => {
    try {
        const data = JSON.parse(json);
        Object.keys(data).forEach(key => {
            localStorage.setItem(key, JSON.stringify(data[key]));
        });
        notifyDataChange();
        return true;
    } catch { return false; }
};

export const clearDatabase = () => {
    localStorage.clear();
    notifyDataChange();
};

// --- Cloud Sync ---
export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
        return { success: !error };
    } catch { return { success: false }; }
};

export const uploadToSupabase = async () => {
    const schools = getSchools();
    const teachers = getTeachers();
    const students = getStudents();
    const attendance = getAttendance();
    const performance = getPerformance();
    const exams = getExams();
    const questions = getQuestionBank();
    const users = getSystemUsers();
    
    if (schools.length > 0) await supabase.from('schools').upsert(schools);
    if (teachers.length > 0) await supabase.from('teachers').upsert(teachers);
    if (students.length > 0) await supabase.from('students').upsert(students);
    if (attendance.length > 0) await supabase.from('attendance').upsert(attendance);
    if (performance.length > 0) await supabase.from('performance').upsert(performance);
    if (exams.length > 0) await supabase.from('exams').upsert(exams);
    if (questions.length > 0) await supabase.from('questions').upsert(questions);
    if (users.length > 0) await supabase.from('system_users').upsert(users);
};

export const downloadFromSupabase = async () => {
    const { data: schools } = await supabase.from('schools').select('*');
    if (schools) updateCache(KEYS.SCHOOLS, schools);
    
    const { data: teachers } = await supabase.from('teachers').select('*');
    if (teachers) updateCache(KEYS.TEACHERS, teachers);
    
    const { data: students } = await supabase.from('students').select('*');
    if (students) updateCache(KEYS.STUDENTS, students);

    const { data: att } = await supabase.from('attendance').select('*');
    if (att) updateCache(KEYS.ATTENDANCE, att);

    const { data: perf } = await supabase.from('performance').select('*');
    if (perf) updateCache(KEYS.PERFORMANCE, perf);

    const { data: users } = await supabase.from('system_users').select('*');
    if (users) updateCache(KEYS.USERS, users);

    notifyDataChange();
};

export const forceRefreshData = async () => {
    await downloadFromSupabase();
};

export const fetchCloudTableData = async (tableName: string) => {
    const { data } = await supabase.from(tableName).select('*').limit(100);
    return data;
};

export const clearCloudTable = async (tableName: string) => {
    await supabase.from(tableName).delete().neq('id', '0');
};

export const resetCloudDatabase = async () => {
    for (const key of Object.values(DB_MAP)) {
        await clearCloudTable(key);
    }
};

export const backupCloudDatabase = async () => {
    const backup: any = {};
    for (const key of Object.values(DB_MAP)) {
        const { data } = await supabase.from(key).select('*');
        backup[key] = data;
    }
    return JSON.stringify(backup);
};

export const restoreCloudDatabase = async (json: string) => {
    const backup = JSON.parse(json);
    for (const key of Object.keys(backup)) {
        const rows = backup[key];
        if (rows && rows.length > 0) {
            await supabase.from(key).upsert(rows);
        }
    }
};

export const validateCloudSchema = async () => {
    const missing: string[] = [];
    for (const table of Object.values(DB_MAP)) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code === '42P01') missing.push(table);
    }
    return { missingTables: missing };
};

export const getTableDisplayName = (table: string) => {
    switch(table) {
        case 'schools': return 'المدارس';
        case 'teachers': return 'المعلمين';
        case 'students': return 'الطلاب';
        default: return table;
    }
};

export const getDatabaseSchemaSQL = () => {
    return `
    create table if not exists schools (id text primary key, name text, ministry_code text, manager_name text, manager_national_id text, type text, phone text, student_count int, education_administration text);
    create table if not exists teachers (id text primary key, name text, national_id text, email text, phone text, password text, subject_specialty text, school_id text, manager_id text, subscription_status text, subscription_end_date text);
    create table if not exists students (id text primary key, name text, national_id text, class_name text, grade_level text, phone text, email text, parent_name text, parent_phone text, parent_email text, school_id text, created_by_id text, password text, seat_index int);
    create table if not exists system_users (id text primary key, name text, email text, national_id text, password text, role text, school_id text, status text);
    create table if not exists attendance (id text primary key, student_id text, date text, status text, subject text, period int, behavior_status text, behavior_note text, excuse_note text, created_by_id text);
    create table if not exists performance (id text primary key, student_id text, subject text, title text, category text, score float, max_score float, date text, notes text, created_by_id text);
    create table if not exists assignments (id text primary key, title text, category text, max_score float, url text, is_visible boolean, teacher_id text, term_id text, period_id text, class_id text);
    create table if not exists schedules (id text primary key, class_id text, day text, period int, subject_name text, teacher_id text);
    create table if not exists weekly_plans (id text primary key, teacher_id text, class_id text, subject_name text, day text, period int, week_start_date text, lesson_topic text, homework text);
    create table if not exists exams (id text primary key, title text, subject text, grade_level text, duration_minutes int, questions jsonb, is_active boolean, created_at text, teacher_id text, date text);
    create table if not exists curriculum_units (id text primary key, teacher_id text, subject text, grade_level text, title text, order_index int);
    create table if not exists curriculum_lessons (id text primary key, unit_id text, title text, order_index int, learning_standards jsonb, micro_concept_ids jsonb);
    create table if not exists questions (id text primary key, text text, type text, options jsonb, correct_answer text, points int, subject text, grade_level text, topic text, difficulty text, teacher_id text);
    `;
};

export const getDatabaseUpdateSQL = () => `
alter table assignments add column if not exists class_id text;
`;
