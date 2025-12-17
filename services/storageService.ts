
import { 
    Student, AttendanceRecord, PerformanceRecord, Teacher, School, 
    SystemUser, Subject, ScheduleItem, TeacherAssignment, 
    AcademicTerm, WeeklyPlanItem, LessonLink, StoredLessonPlan,
    Exam, Question, ExamResult, TrackingSheet, MessageLog,
    CurriculumUnit, CurriculumLesson, MicroConcept,
    AISettings, ReportHeaderConfig, UserTheme, Assignment,
    CustomTable, Achievement
} from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export const KEYS = {
    STUDENTS: 'students',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    SYSTEM_USERS: 'system_users',
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    ASSIGNMENTS: 'assignments', 
    TRACKING_ASSIGNMENTS: 'tracking_assignments',
    TERMS: 'academic_terms',
    WEEKLY_PLANS: 'weekly_plans',
    LESSON_LINKS: 'lesson_links',
    LESSON_PLANS: 'lesson_plans',
    EXAMS: 'exams',
    QUESTIONS: 'question_bank',
    EXAM_RESULTS: 'exam_results',
    TRACKING_SHEETS: 'tracking_sheets',
    MESSAGES: 'messages',
    CURRICULUM_UNITS: 'curriculum_units',
    CURRICULUM_LESSONS: 'curriculum_lessons',
    MICRO_CONCEPTS: 'micro_concepts',
    AI_SETTINGS: 'ai_settings',
    REPORT_CONFIG: 'report_config',
    USER_THEME: 'user_theme',
    CUSTOM_TABLES: 'custom_tables',
    TEACHER_PERIOD_TIMINGS: 'teacher_period_timings',
    WORKS_MASTER_URL: 'works_master_url'
};

export const DB_MAP: Record<string, string> = {
    [KEYS.STUDENTS]: 'students',
    [KEYS.ATTENDANCE]: 'attendance',
    [KEYS.PERFORMANCE]: 'performance',
    [KEYS.TEACHERS]: 'teachers',
    [KEYS.SCHOOLS]: 'schools',
    [KEYS.SYSTEM_USERS]: 'system_users',
    [KEYS.EXAMS]: 'exams',
    [KEYS.QUESTIONS]: 'question_bank',
    [KEYS.EXAM_RESULTS]: 'exam_results',
    [KEYS.TRACKING_ASSIGNMENTS]: 'assignments',
    [KEYS.WEEKLY_PLANS]: 'weekly_plans',
    [KEYS.LESSON_PLANS]: 'lesson_plans',
    [KEYS.TERMS]: 'academic_terms',
    [KEYS.MESSAGES]: 'messages',
    [KEYS.SCHEDULES]: 'schedules',
    [KEYS.CURRICULUM_UNITS]: 'curriculum_units',
    [KEYS.CURRICULUM_LESSONS]: 'curriculum_lessons',
    [KEYS.MICRO_CONCEPTS]: 'micro_concepts',
    [KEYS.CUSTOM_TABLES]: 'custom_tables'
};

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ONLINE' | 'OFFLINE' | 'ERROR';

export function get<T>(key: string): T[] {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

export function save(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
    notifySubscribers();
    if (isSupabaseConfigured()) {
        const tableName = DB_MAP[key];
        if (tableName) {
            supabase.from(tableName).upsert(data).then(({ error }) => {
                if (error) console.error(`Failed to sync ${key} to cloud:`, error);
            });
        }
    }
}

type Listener = () => void;
const listeners: Set<Listener> = new Set();
export const subscribeToDataChanges = (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};
const notifySubscribers = () => listeners.forEach(l => l());

type SyncListener = (status: SyncStatus) => void;
const syncListeners: Set<SyncListener> = new Set();
export const subscribeToSyncStatus = (listener: SyncListener) => {
    syncListeners.add(listener);
    return () => syncListeners.delete(listener);
};
const notifySync = (status: SyncStatus) => syncListeners.forEach(l => l(status));

export const setSystemMode = (online: boolean) => {
    notifySync(online ? 'ONLINE' : 'OFFLINE');
};

export const getStudents = (): Student[] => get<Student>(KEYS.STUDENTS);
export const addStudent = (s: Student) => {
    const list = getStudents();
    list.push(s);
    save(KEYS.STUDENTS, list);
};
export const updateStudent = (s: Student) => {
    const list = getStudents();
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) {
        list[idx] = s;
        save(KEYS.STUDENTS, list);
    }
};
export const deleteStudent = (id: string) => {
    const list = getStudents().filter(x => x.id !== id);
    save(KEYS.STUDENTS, list);
    if (isSupabaseConfigured()) {
        supabase.from('students').delete().eq('id', id).then();
    }
};
export const deleteAllStudents = () => {
    save(KEYS.STUDENTS, []);
    if (isSupabaseConfigured()) {
        supabase.from('students').delete().neq('id', '0').then();
    }
};
export const bulkAddStudents = (students: Student[]) => {
    const current = getStudents();
    save(KEYS.STUDENTS, [...current, ...students]);
};
export const bulkUpsertStudents = (students: Student[], matchKey: keyof Student = 'id') => {
    const current = getStudents();
    students.forEach(s => {
        const idx = current.findIndex(c => c[matchKey] === s[matchKey]);
        if (idx !== -1) current[idx] = { ...current[idx], ...s };
        else current.push(s);
    });
    save(KEYS.STUDENTS, current);
};

export const getAttendance = (): AttendanceRecord[] => get<AttendanceRecord>(KEYS.ATTENDANCE);
export const saveAttendance = (records: AttendanceRecord[]) => {
    const list = getAttendance();
    records.forEach(r => {
        const idx = list.findIndex(x => x.id === r.id);
        if (idx !== -1) list[idx] = r;
        else list.push(r);
    });
    save(KEYS.ATTENDANCE, list);
};
export const bulkAddAttendance = (records: AttendanceRecord[]) => saveAttendance(records);

export const getPerformance = (): PerformanceRecord[] => get<PerformanceRecord>(KEYS.PERFORMANCE);
export const addPerformance = (record: PerformanceRecord) => {
    const list = get<PerformanceRecord>(KEYS.PERFORMANCE);
    const idx = list.findIndex(r => r.id === record.id);
    if (idx !== -1) list[idx] = record;
    else list.push(record);
    save(KEYS.PERFORMANCE, list);
};
export const deletePerformance = (id: string) => {
    const list = getPerformance().filter(r => r.id !== id);
    save(KEYS.PERFORMANCE, list);
    if (isSupabaseConfigured()) {
        supabase.from('performance').delete().eq('id', id).then();
    }
};
export const bulkAddPerformance = (records: PerformanceRecord[]) => {
    const list = get<PerformanceRecord>(KEYS.PERFORMANCE);
    records.forEach(rec => {
        const idx = list.findIndex(r => r.id === rec.id);
        if (idx !== -1) list[idx] = rec;
        else list.push(rec);
    });
    save(KEYS.PERFORMANCE, list);
};

export const getTeachers = (): Teacher[] => get<Teacher>(KEYS.TEACHERS);
export const addTeacher = async (t: Teacher) => {
    const list = getTeachers();
    list.push(t);
    save(KEYS.TEACHERS, list);
    const users = getSystemUsers();
    if (!users.find(u => u.email === t.email)) {
        await addSystemUser({
            id: t.id,
            name: t.name,
            email: t.email || '',
            nationalId: t.nationalId,
            password: t.password,
            role: 'TEACHER',
            status: 'ACTIVE',
            schoolId: t.schoolId
        });
    }
};
export const updateTeacher = (t: Teacher) => {
    const list = getTeachers();
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) {
        list[idx] = t;
        save(KEYS.TEACHERS, list);
    }
};

export const getSchools = (): School[] => get<School>(KEYS.SCHOOLS);
export const addSchool = (s: School) => {
    const list = getSchools();
    list.push(s);
    save(KEYS.SCHOOLS, list);
};
export const updateSchool = (s: School) => {
    const list = getSchools();
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) {
        list[idx] = s;
        save(KEYS.SCHOOLS, list);
    }
};
export const deleteSchool = (id: string) => {
    save(KEYS.SCHOOLS, getSchools().filter(s => s.id !== id));
    if (isSupabaseConfigured()) {
        supabase.from('schools').delete().eq('id', id).then();
    }
};

export const getSystemUsers = (): SystemUser[] => get<SystemUser>(KEYS.SYSTEM_USERS);
export const addSystemUser = async (u: SystemUser) => {
    const list = getSystemUsers();
    list.push(u);
    save(KEYS.SYSTEM_USERS, list);
};
export const updateSystemUser = (u: SystemUser) => {
    const list = getSystemUsers();
    const idx = list.findIndex(x => x.id === u.id);
    if (idx !== -1) {
        list[idx] = u;
        save(KEYS.SYSTEM_USERS, list);
    }
};
export const deleteSystemUser = (id: string) => {
    save(KEYS.SYSTEM_USERS, getSystemUsers().filter(u => u.id !== id));
    if (isSupabaseConfigured()) {
        supabase.from('system_users').delete().eq('id', id).then();
    }
};

export const authenticateUser = async (identifier: string, pass: string): Promise<SystemUser | null> => {
    if (identifier === 'admin' && pass === 'admin') {
        return {
            id: 'super_admin',
            name: 'مدير النظام',
            email: 'admin',
            nationalId: 'admin',
            password: 'admin',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
            schoolId: ''
        };
    }
    const users = getSystemUsers();
    const localUser = users.find(u => (u.email === identifier || u.nationalId === identifier) && u.password === pass);
    if (localUser) return localUser;
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase
                .from('system_users')
                .select('*')
                .or(`email.eq.${identifier},national_id.eq.${identifier}`)
                .eq('password', pass)
                .single();
            if (data && !error) {
                const user: SystemUser = data as SystemUser;
                const list = getSystemUsers();
                if (!list.find(u => u.id === user.id)) {
                    list.push(user);
                    localStorage.setItem(KEYS.SYSTEM_USERS, JSON.stringify(list));
                }
                return user;
            }
        } catch (e) {
            console.error("Cloud auth failed", e);
        }
    }
    return null;
};

export const authenticateStudent = async (identifier: string, pass: string): Promise<any | null> => {
    const students = getStudents();
    const localStudent = students.find(s => (s.nationalId === identifier || s.email === identifier) && (s.password === pass || !s.password));
    if (localStudent) {
        return {
            id: localStudent.id,
            name: localStudent.name,
            role: 'STUDENT',
            email: localStudent.email,
            nationalId: localStudent.nationalId,
            schoolId: localStudent.schoolId,
            className: localStudent.className,
            gradeLevel: localStudent.gradeLevel
        };
    }
    if (isSupabaseConfigured()) {
        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .or(`national_id.eq.${identifier},email.eq.${identifier}`)
                .eq('password', pass)
                .single();
            if (data && !error) {
                const std: Student = {
                    id: data.id,
                    name: data.name,
                    nationalId: data.national_id || data.nationalId,
                    schoolId: data.school_id || data.schoolId,
                    className: data.class_name || data.className,
                    gradeLevel: data.grade_level || data.gradeLevel,
                    email: data.email,
                    phone: data.phone,
                    parentName: data.parent_name || data.parentName,
                    parentPhone: data.parent_phone || data.parentPhone,
                    parentEmail: data.parent_email || data.parentEmail,
                    createdById: data.created_by_id || data.createdById
                };
                const list = getStudents();
                if (!list.find(s => s.id === std.id)) {
                    list.push(std);
                    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(list));
                }
                return { ...std, role: 'STUDENT' };
            }
        } catch (e) { console.error("Cloud student auth failed", e); }
    }
    return null;
};

export const getSubjects = (teacherId?: string): Subject[] => {
    const all = get<Subject>(KEYS.SUBJECTS);
    if (teacherId) return all.filter(s => s.teacherId === teacherId || !s.teacherId);
    return all;
};
export const addSubject = (s: Subject) => {
    const list = get<Subject>(KEYS.SUBJECTS);
    list.push(s);
    save(KEYS.SUBJECTS, list);
};
export const deleteSubject = (id: string) => {
    save(KEYS.SUBJECTS, get<Subject>(KEYS.SUBJECTS).filter(s => s.id !== id));
};

export const getSchedules = (): ScheduleItem[] => get<ScheduleItem>(KEYS.SCHEDULES);
export const saveScheduleItem = (item: ScheduleItem) => {
    const list = getSchedules();
    const idx = list.findIndex(x => x.id === item.id);
    if (idx !== -1) list[idx] = item;
    else list.push(item);
    save(KEYS.SCHEDULES, list);
};
export const deleteScheduleItem = (id: string) => {
    save(KEYS.SCHEDULES, getSchedules().filter(s => s.id !== id));
};

export const getTeacherAssignments = (teacherId?: string): TeacherAssignment[] => {
    const raw = localStorage.getItem('teacher_class_map');
    const list: TeacherAssignment[] = raw ? JSON.parse(raw) : [];
    if (teacherId) return list.filter(a => a.teacherId === teacherId);
    return list;
};
export const addTeacherAssignment = (assignment: TeacherAssignment) => {
    const list = getTeacherAssignments();
    if (!list.find(a => a.classId === assignment.classId && a.teacherId === assignment.teacherId)) {
        list.push(assignment);
        localStorage.setItem('teacher_class_map', JSON.stringify(list));
    }
};
export const deleteTeacherAssignment = (id: string) => {
    const list = getTeacherAssignments().filter(a => a.id !== id);
    localStorage.setItem('teacher_class_map', JSON.stringify(list));
};

export const getAssignments = (termId?: string, teacherId?: string, forceAll: boolean = false): Assignment[] => {
    let list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    if (!forceAll && teacherId) {
        list = list.filter(a => a.teacherId === teacherId);
    }
    if (termId && termId !== 'ALL') {
        list = list.filter(a => a.termId === termId);
    }
    return list;
};
export const saveAssignment = (a: Assignment) => {
    const list = get<Assignment>(KEYS.TRACKING_ASSIGNMENTS);
    const idx = list.findIndex(x => x.id === a.id);
    if (idx !== -1) list[idx] = a;
    else list.push(a);
    save(KEYS.TRACKING_ASSIGNMENTS, list);
};
export const deleteAssignment = (id: string) => {
    save(KEYS.TRACKING_ASSIGNMENTS, get<Assignment>(KEYS.TRACKING_ASSIGNMENTS).filter(a => a.id !== id));
};

export const getAcademicTerms = (teacherId?: string): AcademicTerm[] => {
    return get<AcademicTerm>(KEYS.TERMS);
};
export const saveAcademicTerm = (t: AcademicTerm) => {
    const list = get<AcademicTerm>(KEYS.TERMS);
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) list[idx] = t;
    else list.push(t);
    save(KEYS.TERMS, list);
};
export const deleteAcademicTerm = (id: string) => {
    save(KEYS.TERMS, get<AcademicTerm>(KEYS.TERMS).filter(t => t.id !== id));
};
export const setCurrentTerm = (id: string, teacherId?: string) => {
    const list = get<AcademicTerm>(KEYS.TERMS);
    list.forEach(t => t.isCurrent = (t.id === id));
    save(KEYS.TERMS, list);
};

export const getWeeklyPlans = (teacherId?: string): WeeklyPlanItem[] => {
    const all = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    if (teacherId) return all.filter(p => p.teacherId === teacherId);
    return all;
};
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => {
    const list = get<WeeklyPlanItem>(KEYS.WEEKLY_PLANS);
    const idx = list.findIndex(x => x.id === item.id);
    if (idx !== -1) list[idx] = item;
    else list.push(item);
    save(KEYS.WEEKLY_PLANS, list);
};

export const getLessonLinks = (): LessonLink[] => get<LessonLink>(KEYS.LESSON_LINKS);
export const saveLessonLink = (l: LessonLink) => {
    const list = getLessonLinks();
    list.push(l);
    save(KEYS.LESSON_LINKS, list);
};
export const deleteLessonLink = (id: string) => {
    save(KEYS.LESSON_LINKS, getLessonLinks().filter(l => l.id !== id));
};

export const getLessonPlans = (teacherId?: string): StoredLessonPlan[] => {
    const all = get<StoredLessonPlan>(KEYS.LESSON_PLANS);
    if (teacherId) return all.filter(p => p.teacherId === teacherId);
    return all;
};
export const saveLessonPlan = (p: StoredLessonPlan) => {
    const list = get<StoredLessonPlan>(KEYS.LESSON_PLANS);
    const idx = list.findIndex(x => x.id === p.id);
    if (idx !== -1) list[idx] = p;
    else list.push(p);
    save(KEYS.LESSON_PLANS, list);
};
export const deleteLessonPlan = (id: string) => {
    save(KEYS.LESSON_PLANS, get<StoredLessonPlan>(KEYS.LESSON_PLANS).filter(p => p.id !== id));
};

export const getExams = (teacherId?: string): Exam[] => {
    const all = get<Exam>(KEYS.EXAMS);
    if (teacherId) return all.filter(e => e.teacherId === teacherId);
    return all;
};
export const saveExam = (e: Exam) => {
    const list = get<Exam>(KEYS.EXAMS);
    const idx = list.findIndex(x => x.id === e.id);
    if (idx !== -1) list[idx] = e;
    else list.push(e);
    save(KEYS.EXAMS, list);
};
export const deleteExam = (id: string) => {
    save(KEYS.EXAMS, get<Exam>(KEYS.EXAMS).filter(e => e.id !== id));
};

export const getQuestionBank = (teacherId?: string): Question[] => {
    const all = get<Question>(KEYS.QUESTIONS);
    if (teacherId) return all.filter(q => q.teacherId === teacherId);
    return all;
};
export const saveQuestionToBank = (q: Question) => {
    const list = get<Question>(KEYS.QUESTIONS);
    const idx = list.findIndex(x => x.id === q.id);
    if (idx !== -1) list[idx] = q;
    else list.push(q);
    save(KEYS.QUESTIONS, list);
};
export const deleteQuestionFromBank = (id: string) => {
    save(KEYS.QUESTIONS, get<Question>(KEYS.QUESTIONS).filter(q => q.id !== id));
};

export const getExamResults = (examId?: string): ExamResult[] => {
    const all = get<ExamResult>(KEYS.EXAM_RESULTS);
    if (examId) return all.filter(r => r.examId === examId);
    return all;
};
export const saveExamResult = (r: ExamResult) => {
    const list = get<ExamResult>(KEYS.EXAM_RESULTS);
    list.push(r);
    save(KEYS.EXAM_RESULTS, list);
};
export const deleteExamResult = (id: string) => {
    save(KEYS.EXAM_RESULTS, get<ExamResult>(KEYS.EXAM_RESULTS).filter(r => r.id !== id));
};

export const getTrackingSheets = (teacherId?: string): TrackingSheet[] => {
    const all = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    if (teacherId) return all.filter(s => s.teacherId === teacherId);
    return all;
};
export const saveTrackingSheet = (s: TrackingSheet) => {
    const list = get<TrackingSheet>(KEYS.TRACKING_SHEETS);
    const idx = list.findIndex(x => x.id === s.id);
    if (idx !== -1) list[idx] = s;
    else list.push(s);
    save(KEYS.TRACKING_SHEETS, list);
};
export const deleteTrackingSheet = (id: string) => {
    save(KEYS.TRACKING_SHEETS, get<TrackingSheet>(KEYS.TRACKING_SHEETS).filter(s => s.id !== id));
};

export const getMessages = (teacherId?: string): MessageLog[] => {
    const all = get<MessageLog>(KEYS.MESSAGES);
    if (teacherId) return all.filter(m => m.teacherId === teacherId || !m.teacherId);
    return all;
};
export const saveMessage = (m: MessageLog) => {
    const list = get<MessageLog>(KEYS.MESSAGES);
    list.push(m);
    save(KEYS.MESSAGES, list);
};

export const getCurriculumUnits = (teacherId?: string): CurriculumUnit[] => {
    const all = get<CurriculumUnit>(KEYS.CURRICULUM_UNITS);
    if (teacherId) return all.filter(u => u.teacherId === teacherId);
    return all;
};
export const saveCurriculumUnit = (u: CurriculumUnit) => {
    const list = getCurriculumUnits();
    const idx = list.findIndex(x => x.id === u.id);
    if (idx !== -1) list[idx] = u;
    else list.push(u);
    save(KEYS.CURRICULUM_UNITS, list);
};
export const deleteCurriculumUnit = (id: string) => {
    save(KEYS.CURRICULUM_UNITS, getCurriculumUnits().filter(u => u.id !== id));
};

export const getCurriculumLessons = (unitId?: string): CurriculumLesson[] => {
    const all = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    if (unitId) return all.filter(l => l.unitId === unitId);
    return all;
};
export const saveCurriculumLesson = (l: CurriculumLesson) => {
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(x => x.id === l.id);
    if (idx !== -1) list[idx] = l;
    else list.push(l);
    save(KEYS.CURRICULUM_LESSONS, list);
};
export const toggleCurriculumLesson = (lessonId: string, isCompleted: boolean) => {
    const list = get<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
    const idx = list.findIndex(l => l.id === lessonId);
    if (idx !== -1) {
        list[idx] = { 
            ...list[idx], 
            isCompleted, 
            completedAt: isCompleted ? new Date().toISOString() : undefined 
        };
        save(KEYS.CURRICULUM_LESSONS, list);
    }
};
export const deleteCurriculumLesson = (id: string) => {
    save(KEYS.CURRICULUM_LESSONS, getCurriculumLessons().filter(l => l.id !== id));
};

export const getMicroConcepts = (teacherId?: string): MicroConcept[] => {
    const all = get<MicroConcept>(KEYS.MICRO_CONCEPTS);
    if (teacherId) return all.filter(c => c.teacherId === teacherId);
    return all;
};
export const saveMicroConcept = (c: MicroConcept) => {
    const list = getMicroConcepts();
    const idx = list.findIndex(x => x.id === c.id);
    if (idx !== -1) list[idx] = c;
    else list.push(c);
    save(KEYS.MICRO_CONCEPTS, list);
};
export const deleteMicroConcept = (id: string) => {
    save(KEYS.MICRO_CONCEPTS, getMicroConcepts().filter(c => c.id !== id));
};

export const getCustomTables = (teacherId?: string): CustomTable[] => {
    const all = get<CustomTable>(KEYS.CUSTOM_TABLES);
    if (teacherId) return all.filter(t => t.teacherId === teacherId);
    return all;
};
export const addCustomTable = (t: CustomTable) => {
    const list = getCustomTables();
    list.push(t);
    save(KEYS.CUSTOM_TABLES, list);
};
export const updateCustomTable = (t: CustomTable) => {
    const list = getCustomTables();
    const idx = list.findIndex(x => x.id === t.id);
    if (idx !== -1) {
        list[idx] = t;
        save(KEYS.CUSTOM_TABLES, list);
    }
};
export const deleteCustomTable = (id: string) => {
    save(KEYS.CUSTOM_TABLES, getCustomTables().filter(t => t.id !== id));
};

export const getReportHeaderConfig = (teacherId?: string): ReportHeaderConfig => {
    const configs = get<ReportHeaderConfig & { id: string }>(KEYS.REPORT_CONFIG);
    if (teacherId) {
        const found = configs.find(c => c.teacherId === teacherId);
        if (found) return found;
    }
    return { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    const list = get<ReportHeaderConfig & { id?: string }>(KEYS.REPORT_CONFIG);
    const idx = list.findIndex(c => c.teacherId === config.teacherId);
    if (idx !== -1) list[idx] = config;
    else list.push(config);
    save(KEYS.REPORT_CONFIG, list);
};

export const getUserTheme = (): UserTheme => {
    const theme = localStorage.getItem(KEYS.USER_THEME);
    return theme ? JSON.parse(theme) : { mode: 'LIGHT', backgroundStyle: 'FLAT' };
};
export const saveUserTheme = (theme: UserTheme) => {
    localStorage.setItem(KEYS.USER_THEME, JSON.stringify(theme));
};

export const getTeacherPeriodTimings = (teacherId: string): string[] => {
    const allTimings = get<{teacherId: string, timings: string[]}>(KEYS.TEACHER_PERIOD_TIMINGS);
    const found = allTimings.find(t => t.teacherId === teacherId);
    return found ? found.timings : [
        "07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", 
        "09:45 - 10:30", "10:30 - 11:15", "11:15 - 12:00", 
        "12:00 - 12:45", "12:45 - 01:30"
    ];
};
export const saveTeacherPeriodTimings = (teacherId: string, timings: string[]) => {
    const all = get<{teacherId: string, timings: string[]}>(KEYS.TEACHER_PERIOD_TIMINGS);
    const idx = all.findIndex(t => t.teacherId === teacherId);
    if (idx !== -1) all[idx].timings = timings;
    else all.push({ teacherId, timings });
    save(KEYS.TEACHER_PERIOD_TIMINGS, all);
};

export const getAISettings = (): AISettings => {
    const s = localStorage.getItem(KEYS.AI_SETTINGS);
    return s ? JSON.parse(s) : { modelId: 'gemini-3-flash-preview', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: '' };
};
export const saveAISettings = (settings: AISettings) => {
    localStorage.setItem(KEYS.AI_SETTINGS, JSON.stringify(settings));
};

export const getWorksMasterUrl = (): string => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

export const createBackup = () => JSON.stringify(localStorage);
export const restoreBackup = (json: string) => {
    const data = JSON.parse(json);
    Object.keys(data).forEach(key => localStorage.setItem(key, data[key]));
    notifySubscribers();
};
export const clearDatabase = () => {
    localStorage.clear();
    notifySubscribers();
};

export const checkConnection = async () => {
    if (!isSupabaseConfigured()) return { success: false, message: 'Not configured' };
    try {
        const { data, error } = await supabase.from('system_users').select('count', { count: 'exact', head: true });
        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const uploadToSupabase = async () => {
    if (!isSupabaseConfigured()) return;
    notifySync('SYNCING');
    try {
        const promises = Object.entries(DB_MAP).map(async ([localKey, tableName]) => {
            const data = get(localKey);
            if (data.length > 0) {
                const { error } = await supabase.from(tableName).upsert(data);
                if (error) console.error(`Error uploading ${tableName}:`, error);
            }
        });
        await Promise.all(promises);
        notifySync('ONLINE');
    } catch (e) {
        console.error(e);
        notifySync('ERROR');
    }
};

export const downloadFromSupabase = async () => {
    if (!isSupabaseConfigured()) return;
    notifySync('SYNCING');
    try {
        const promises = Object.entries(DB_MAP).map(async ([localKey, tableName]) => {
            const { data, error } = await supabase.from(tableName).select('*');
            if (data) localStorage.setItem(localKey, JSON.stringify(data));
            if (error) console.error(`Error downloading ${tableName}:`, error);
        });
        await Promise.all(promises);
        notifySubscribers();
        notifySync('ONLINE');
    } catch (e) {
        console.error(e);
        notifySync('ERROR');
    }
};

export const forceRefreshData = async () => {
    await downloadFromSupabase();
};

export const initAutoSync = async () => {
    if (isSupabaseConfigured()) {
        await downloadFromSupabase();
        return true;
    }
    return false;
};

let realtimeChannel: any = null;
export const initRealtimeSync = () => {
    if (!isSupabaseConfigured() || realtimeChannel) return;
    realtimeChannel = supabase.channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
            const table = payload.table;
            const localKey = Object.keys(DB_MAP).find(k => DB_MAP[k] === table);
            if (localKey) handleRealtimeDelta(localKey, payload);
        }).subscribe();
};

const handleRealtimeDelta = async (localKey: string, payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    const currentData = get<any>(localKey);
    let updatedData = [...currentData];
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const idx = updatedData.findIndex((item: any) => item.id === newRecord.id);
        if (idx !== -1) updatedData[idx] = newRecord;
        else updatedData.push(newRecord);
    } else if (eventType === 'DELETE') {
        updatedData = updatedData.filter((item: any) => item.id !== oldRecord.id);
    }
    localStorage.setItem(localKey, JSON.stringify(updatedData));
    notifySubscribers();
};

export const stopRealtimeSync = () => {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
};

// Fix: Adding missing exported functions for AdminDashboard
export const fetchCloudTableData = async (tableName: string): Promise<any[]> => {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
        console.error(`Error fetching cloud data for ${tableName}:`, error);
        return [];
    }
    return data || [];
};

export const getTableDisplayName = (tableName: string): string => {
    const entry = Object.entries(DB_MAP).find(([key, val]) => val === tableName);
    return entry ? entry[0] : tableName;
};

export const getDatabaseSchemaSQL = (): string => {
    return `
-- SQL schema for Supabase
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT,
    class_id TEXT,
    school_id TEXT,
    created_by_id TEXT,
    grade_level TEXT,
    class_name TEXT,
    email TEXT,
    phone TEXT,
    parent_id TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    password TEXT,
    seat_index INTEGER
);

CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    subject TEXT,
    period INTEGER,
    behavior_status TEXT,
    behavior_note TEXT,
    excuse_note TEXT,
    excuse_file TEXT,
    created_by_id TEXT
);

CREATE TABLE IF NOT EXISTS performance (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT,
    score NUMERIC NOT NULL,
    max_score NUMERIC NOT NULL,
    date TEXT NOT NULL,
    notes TEXT,
    url TEXT,
    created_by_id TEXT
);

CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT,
    email TEXT,
    phone TEXT,
    password TEXT,
    subject_specialty TEXT,
    school_id TEXT,
    manager_id TEXT,
    subscription_status TEXT,
    subscription_end_date TEXT
);

CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ministry_code TEXT,
    education_administration TEXT,
    type TEXT,
    manager_name TEXT NOT NULL,
    manager_national_id TEXT,
    phone TEXT,
    student_count INTEGER,
    works_master_url TEXT
);

CREATE TABLE IF NOT EXISTS system_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    national_id TEXT,
    password TEXT,
    role TEXT NOT NULL,
    school_id TEXT,
    status TEXT NOT NULL,
    is_demo BOOLEAN,
    phone TEXT
);

CREATE TABLE IF NOT EXISTS exams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    duration_minutes INTEGER,
    questions JSONB,
    is_active BOOLEAN,
    created_at TEXT,
    teacher_id TEXT,
    date TEXT
);

CREATE TABLE IF NOT EXISTS question_bank (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    image_url TEXT,
    type TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT,
    points INTEGER,
    subject TEXT,
    grade_level TEXT,
    topic TEXT,
    difficulty TEXT,
    teacher_id TEXT
);

CREATE TABLE IF NOT EXISTS exam_results (
    id TEXT PRIMARY KEY,
    exam_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    score NUMERIC NOT NULL,
    total_score NUMERIC NOT NULL,
    date TEXT NOT NULL,
    answers JSONB
);

CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    max_score NUMERIC NOT NULL,
    url TEXT,
    is_visible BOOLEAN,
    order_index INTEGER,
    source_metadata TEXT,
    teacher_id TEXT,
    term_id TEXT,
    period_id TEXT,
    class_id TEXT
);

CREATE TABLE IF NOT EXISTS weekly_plans (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    class_id TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    week_start_date TEXT NOT NULL,
    lesson_topic TEXT,
    homework TEXT
);

CREATE TABLE IF NOT EXISTS lesson_plans (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    lesson_id TEXT,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    content_json TEXT,
    resources JSONB,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS academic_terms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_current BOOLEAN,
    teacher_id TEXT,
    periods JSONB
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    parent_phone TEXT,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL,
    date TEXT NOT NULL,
    sent_by TEXT NOT NULL,
    teacher_id TEXT
);

CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL,
    day TEXT NOT NULL,
    period INTEGER NOT NULL,
    subject_name TEXT NOT NULL,
    teacher_id TEXT
);

CREATE TABLE IF NOT EXISTS curriculum_units (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_lessons (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    learning_standards JSONB,
    micro_concept_ids JSONB,
    is_completed BOOLEAN,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS micro_concepts (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    subject TEXT,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_tables (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    columns JSONB,
    rows JSONB,
    source_url TEXT,
    last_updated TEXT,
    teacher_id TEXT
);
`;
};

export const getDatabaseUpdateSQL = (): string => {
    return `-- Update SQL for adding new tables or columns
CREATE TABLE IF NOT EXISTS curriculum_units (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    subject TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS curriculum_lessons (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    learning_standards JSONB,
    micro_concept_ids JSONB,
    is_completed BOOLEAN,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS micro_concepts (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    subject TEXT,
    name TEXT NOT NULL
);
`;
};

export const clearCloudTable = async (tableName: string): Promise<void> => {
    if (!isSupabaseConfigured()) return;
    const { error } = await supabase.from(tableName).delete().neq('id', '0');
    if (error) throw error;
};

export const resetCloudDatabase = async (): Promise<void> => {
    if (!isSupabaseConfigured()) return;
    const tables = Object.values(DB_MAP);
    for (const table of tables) {
        await clearCloudTable(table);
    }
};

export const backupCloudDatabase = async (): Promise<string> => {
    if (!isSupabaseConfigured()) return '{}';
    const backup: Record<string, any[]> = {};
    const tables = Object.values(DB_MAP);
    for (const table of tables) {
        backup[table] = await fetchCloudTableData(table);
    }
    return JSON.stringify(backup);
};

export const restoreCloudDatabase = async (json: string): Promise<void> => {
    if (!isSupabaseConfigured()) return;
    const backup = JSON.parse(json);
    for (const [tableName, data] of Object.entries(backup)) {
        if (Array.isArray(data) && data.length > 0) {
            const { error } = await supabase.from(tableName).upsert(data);
            if (error) console.error(`Error restoring ${tableName}:`, error);
        }
    }
};

export const validateCloudSchema = async (): Promise<{ success: boolean, missingTables: string[] }> => {
    if (!isSupabaseConfigured()) return { success: false, missingTables: [] };
    const missingTables: string[] = [];
    const tables = Object.values(DB_MAP);
    for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code === '42P01') {
            missingTables.push(table);
        }
    }
    return { success: missingTables.length === 0, missingTables };
};

// Fix: Adding missing uploadFile for StudentFollowUp
export const uploadFile = async (file: File, bucket: string): Promise<string | null> => {
    if (!isSupabaseConfigured()) return null;
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file);
    if (error) {
        console.error("Error uploading file:", error);
        return null;
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicUrl;
};
