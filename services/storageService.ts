
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

// المجموعات التي ما زالت تحتاج كاش بسيط جداً للإعدادات فقط (مثل الثيم)
export const KEYS = {
    USER_THEME: 'user_theme',
    AI_SETTINGS: 'ai_settings',
    WORKS_MASTER_URL: 'works_master_url',
    REPORT_HEADER: 'report_header_config',
    PERIOD_TIMINGS: 'period_timings',
    CUSTOM_TABLES: 'custom_tables',
    EXAMS: 'exams',
    EXAM_RESULTS: 'exam_results',
    CURRICULUM_UNITS: 'curr_units',
    CURRICULUM_LESSONS: 'curr_lessons',
    QUESTION_BANK: 'q_bank',
    LESSON_LINKS: 'lesson_links',
    WEEKLY_PLANS: 'weekly_plans',
    LESSON_PLANS: 'lesson_plans',
    TRACKING_SHEETS: 'tracking_sheets',
    REMEDIAL_PLANS: 'remedial_plans',
    FORMS_RESULTS: 'forms_detailed_results',
    ENV_RECORDS: 'env_records',
    MESSAGES: 'messages'
};

// Map of local keys to database table names for admin syncing
export const DB_MAP: Record<string, string> = {
    students: 'students',
    attendance: 'attendance',
    performance: 'performance',
    subjects: 'subjects',
    schedules: 'schedules',
    teacher_class_map: 'teacher_class_map',
    academic_terms: 'academic_terms',
    system_users: 'system_users',
    tasks: 'tasks',
    behavior_incidents: 'behavior_incidents'
};

// --- أساسيات الحفظ المباشر في السحاب ---

export const fetchStudents = async (): Promise<Student[]> => {
    const { data, error } = await supabase.from('students').select('*').order('name');
    if (error) throw error;
    const items = data || [];
    localStorage.setItem('students', JSON.stringify(items));
    return items;
};

// Alias for sync access (used by some components)
export const getStudents = (): Student[] => {
    const s = localStorage.getItem('students');
    return s ? JSON.parse(s) : [];
};

export const fetchAttendance = async (teacherId?: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    const items = data || [];
    localStorage.setItem('attendance', JSON.stringify(items));
    return items;
};

export const getAttendance = (): AttendanceRecord[] => {
    const s = localStorage.getItem('attendance');
    return s ? JSON.parse(s) : [];
};

export const fetchPerformance = async (teacherId?: string): Promise<PerformanceRecord[]> => {
    let query = supabase.from('performance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    const items = data || [];
    localStorage.setItem('performance', JSON.stringify(items));
    return items;
};

export const getPerformance = (): PerformanceRecord[] => {
    const s = localStorage.getItem('performance');
    return s ? JSON.parse(s) : [];
};

// --- دوال الحفظ المباشر (Direct Write) ---

export const saveAttendance = async (records: AttendanceRecord[]) => {
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'id' });
    if (error) throw error;
};

export const deleteAttendance = async (id: string) => {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) throw error;
};

export const addPerformance = async (records: PerformanceRecord | PerformanceRecord[]) => {
    const dataToSave = Array.isArray(records) ? records : [records];
    const { error } = await supabase.from('performance').upsert(dataToSave, { onConflict: 'id' });
    if (error) throw error;
};

export const bulkAddPerformance = addPerformance;

export const deletePerformance = async (id: string) => {
    const { error } = await supabase.from('performance').delete().eq('id', id);
    if (error) throw error;
};

// --- إدارة الطلاب ---

export const addStudent = async (s: Student) => {
    const { error } = await supabase.from('students').insert(s);
    if (error) throw error;
};

export const updateStudent = async (s: Student) => {
    const { error } = await supabase.from('students').update(s).eq('id', s.id);
    if (error) throw error;
};

export const deleteStudent = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
};

export const updateStudentLearningStyle = async (id: string, style: LearningStyle) => {
    const { error } = await supabase.from('students').update({ learning_style: style }).eq('id', id);
    if (error) throw error;
};

// --- جداول البيانات والجدول الدراسي ---

export const fetchSubjects = async (tid: string): Promise<Subject[]> => {
    const { data } = await supabase.from('subjects').select('*').eq('teacher_id', tid);
    return data || [];
};

export const getSubjects = (tid?: string): Subject[] => {
    const s = localStorage.getItem('subjects');
    const items: Subject[] = s ? JSON.parse(s) : [];
    return tid ? items.filter(i => i.teacherId === tid) : items;
};

export const addSubject = async (s: Subject) => {
    await supabase.from('subjects').insert({ id: s.id, name: s.name, teacher_id: s.teacherId });
};

export const deleteSubject = async (id: string) => {
    await supabase.from('subjects').delete().eq('id', id);
};

export const fetchSchedules = async (tid: string): Promise<ScheduleItem[]> => {
    const { data } = await supabase.from('schedules').select('*').eq('teacher_id', tid);
    return data || [];
};

export const getSchedules = (): ScheduleItem[] => {
    const s = localStorage.getItem('schedules');
    return s ? JSON.parse(s) : [];
};

export const saveScheduleItem = async (s: ScheduleItem) => {
    await supabase.from('schedules').upsert({
        id: s.id,
        class_id: s.classId,
        subject_name: s.subjectName,
        day: s.day,
        period: s.period,
        teacher_id: s.teacherId
    });
};

export const deleteScheduleItem = async (id: string) => {
    await supabase.from('schedules').delete().eq('id', id);
};

export const fetchTeacherAssignments = async (tid: string): Promise<TeacherAssignment[]> => {
    const { data } = await supabase.from('teacher_class_map').select('*').eq('teacher_id', tid);
    return (data || []).map(d => ({
        id: d.id,
        classId: d.class_id,
        subjectName: d.subject_name,
        teacherId: d.teacher_id
    }));
};

export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => {
    const s = localStorage.getItem('teacher_assignments');
    const items: TeacherAssignment[] = s ? JSON.parse(s) : [];
    return tid ? items.filter(i => i.teacherId === tid) : items;
};

export const addTeacherAssignment = async (a: TeacherAssignment) => {
    await supabase.from('teacher_class_map').insert({
        id: a.id,
        class_id: a.classId,
        subject_name: a.subjectName,
        teacher_id: a.teacherId
    });
};

export const deleteTeacherAssignment = async (id: string) => {
    await supabase.from('teacher_class_map').delete().eq('id', id);
};

export const fetchAcademicTerms = async (tid: string): Promise<AcademicTerm[]> => {
    const { data } = await supabase.from('academic_terms').select('*').eq('teacher_id', tid);
    return (data || []).map(d => ({
        id: d.id,
        name: d.name,
        startDate: d.start_date,
        endDate: d.end_date,
        isCurrent: d.is_current,
        teacherId: d.teacher_id,
        periods: d.periods ? JSON.parse(d.periods) : []
    }));
};

export const getAcademicTerms = (tid?: string): AcademicTerm[] => {
    const s = localStorage.getItem('academic_terms');
    const items: AcademicTerm[] = s ? JSON.parse(s) : [];
    return tid ? items.filter(i => i.teacherId === tid) : items;
};

export const saveAcademicTerm = async (t: AcademicTerm) => {
    await supabase.from('academic_terms').upsert({
        id: t.id,
        name: t.name,
        start_date: t.startDate,
        end_date: t.endDate,
        is_current: t.isCurrent,
        teacher_id: t.teacherId,
        periods: JSON.stringify(t.periods || [])
    });
};

export const deleteAcademicTerm = async (id: string) => {
    await supabase.from('academic_terms').delete().eq('id', id);
};

export const setCurrentTerm = async (id: string, tid: string) => {
    await supabase.from('academic_terms').update({ is_current: false }).eq('teacher_id', tid);
    await supabase.from('academic_terms').update({ is_current: true }).eq('id', id);
};

// --- المستخدمون والتوثيق ---

export const authenticateUser = async (id: string, p: string): Promise<SystemUser | null> => {
    const { data } = await supabase.from('system_users')
        .select('*')
        .or(`national_id.eq.${id},email.eq.${id}`)
        .eq('password', p)
        .single();
    return data || null;
};

export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => {
    const { data } = await supabase.from('students').select('*').eq('national_id', id).eq('password', p).single();
    return data || null;
};

// --- إعدادات النظام المتبقية في LocalStorage ---

export const getAISettings = (): AISettings => {
    const s = localStorage.getItem(KEYS.AI_SETTINGS);
    return s ? JSON.parse(s) : { modelId: 'gemini-3-flash-preview', temperature: 0.7, enableReports: true, enableQuiz: true, enablePlanning: true, systemInstruction: "" };
};

export const saveAISettings = (s: AISettings) => localStorage.setItem(KEYS.AI_SETTINGS, JSON.stringify(s));

export const getUserTheme = (): UserTheme => {
    const s = localStorage.getItem(KEYS.USER_THEME);
    return s ? JSON.parse(s) : { mode: 'LIGHT', backgroundStyle: 'FLAT' };
};

export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));

export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => {
    const s = localStorage.getItem(KEYS.REPORT_HEADER);
    return s ? JSON.parse(s) : { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
};

export const saveReportHeaderConfig = (c: ReportHeaderConfig) => localStorage.setItem(KEYS.REPORT_HEADER, JSON.stringify(c));

export const getTeacherPeriodTimings = (tid?: string): string[] => {
    const s = localStorage.getItem(KEYS.PERIOD_TIMINGS);
    return s ? JSON.parse(s) : ["07:00 - 07:45", "07:45 - 08:30", "08:30 - 09:15", "09:45 - 10:30", "10:30 - 11:15", "11:15 - 12:00", "12:00 - 12:45", "12:45 - 01:30"];
};

export const saveTeacherPeriodTimings = (tid: string, t: string[]) => localStorage.setItem(KEYS.PERIOD_TIMINGS, JSON.stringify(t));

// --- CRUD For Schools, Teachers, Users ---

export const getSchools = (): School[] => {
    const s = localStorage.getItem('schools');
    return s ? JSON.parse(s) : [];
};

export const addSchool = async (s: School) => {
    const { error } = await supabase.from('schools').insert(s);
    if (error) throw error;
};

export const deleteSchool = async (id: string) => {
    await supabase.from('schools').delete().eq('id', id);
};

export const updateSchool = async (s: School) => {
    await supabase.from('schools').update(s).eq('id', s.id);
};

export const getTeachers = (): Teacher[] => {
    const s = localStorage.getItem('teachers');
    return s ? JSON.parse(s) : [];
};

export const addTeacher = async (t: Teacher) => {
    const { error } = await supabase.from('teachers').insert(t);
    if (error) throw error;
};

export const updateTeacher = async (t: Teacher) => {
    await supabase.from('teachers').update(t).eq('id', t.id);
};

export const getSystemUsers = (): SystemUser[] => {
    const s = localStorage.getItem('system_users');
    return s ? JSON.parse(s) : [];
};

export const addSystemUser = async (u: SystemUser) => {
    await supabase.from('system_users').insert(u);
};

export const updateSystemUser = async (u: SystemUser) => {
    await supabase.from('system_users').update(u).eq('id', u.id);
};

export const deleteSystemUser = async (id: string) => {
    await supabase.from('system_users').delete().eq('id', id);
};

// --- Sync & Maintenance ---

export const createBackup = () => {
    const data: any = {};
    Object.values(KEYS).forEach(k => {
        data[k] = localStorage.getItem(k);
    });
    return JSON.stringify(data);
};

export const restoreBackup = (json: string) => {
    const data = JSON.parse(json);
    Object.entries(data).forEach(([k, v]) => {
        if (v) localStorage.setItem(k, v as string);
    });
};

export const clearDatabase = () => localStorage.clear();

export const uploadToSupabase = async () => {
    // Basic push implementation for essential tables
    const tables = ['students', 'attendance', 'performance'];
    for (const t of tables) {
        const data = localStorage.getItem(t);
        if (data) {
            const items = JSON.parse(data);
            await supabase.from(t).upsert(items);
        }
    }
};

export const downloadFromSupabase = async () => {
    const tables = Object.keys(DB_MAP);
    for (const t of tables) {
        const { data } = await supabase.from(t).select('*');
        if (data) localStorage.setItem(t, JSON.stringify(data));
    }
};

export const checkConnection = async () => {
    const { data, error } = await supabase.from('system_users').select('count', { count: 'exact', head: true });
    return { success: !error };
};

export const fetchCloudTableData = async (table: string) => {
    const { data } = await supabase.from(table).select('*').limit(100);
    return data;
};

export const getTableDisplayName = (table: string) => table;

export const getDatabaseSchemaSQL = () => `-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT, national_id TEXT, grade_level TEXT, class_name TEXT, role TEXT, school_id TEXT, created_by_id TEXT, learning_style TEXT, behavior_points INTEGER);`;

export const getDatabaseUpdateSQL = () => `-- Updates
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone TEXT;`;

export const clearCloudTable = async (table: string) => {
    await supabase.from(table).delete().neq('id', '0');
};

export const resetCloudDatabase = async () => {
    // Dangerous operation
};

export const backupCloudDatabase = async () => {
    const backup: any = {};
    for (const t of Object.keys(DB_MAP)) {
        const { data } = await supabase.from(t).select('*');
        backup[t] = data;
    }
    return JSON.stringify(backup);
};

export const restoreCloudDatabase = async (json: string) => {
    const data = JSON.parse(json);
    for (const [t, items] of Object.entries(data)) {
        await supabase.from(t).upsert(items);
    }
};

export const validateCloudSchema = async () => {
    return { missingTables: [] };
};

// --- Additional entities ---

export const getAssignments = (cat: string, tid?: string, isManager?: boolean): Assignment[] => {
    const s = localStorage.getItem('assignments');
    let items: Assignment[] = s ? JSON.parse(s) : [];
    if (tid && !isManager) items = items.filter(i => i.teacherId === tid);
    if (cat !== 'ALL') items = items.filter(i => i.category === cat);
    return items;
};

export const saveAssignment = async (a: Assignment) => {
    const items = getAssignments('ALL');
    const idx = items.findIndex(i => i.id === a.id);
    if (idx > -1) items[idx] = a; else items.push(a);
    localStorage.setItem('assignments', JSON.stringify(items));
};

export const deleteAssignment = (id: string) => {
    const items = getAssignments('ALL').filter(i => i.id !== id);
    localStorage.setItem('assignments', JSON.stringify(items));
};

export const fetchTasks = async (tid: string): Promise<Task[]> => {
    const { data } = await supabase.from('tasks').select('*').eq('teacher_id', tid);
    return data || [];
};

export const getTasks = (tid?: string): Task[] => {
    const s = localStorage.getItem('tasks');
    const items: Task[] = s ? JSON.parse(s) : [];
    return tid ? items.filter(i => i.teacherId === tid) : items;
};

export const saveTask = async (t: Task) => {
    await supabase.from('tasks').upsert(t);
};

export const fetchBehaviorIncidents = async (tid: string): Promise<BehaviorIncident[]> => {
    const { data } = await supabase.from('behavior_incidents').select('*').eq('teacher_id', tid);
    return data || [];
};

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => {
    const s = localStorage.getItem('behavior_incidents');
    const items: BehaviorIncident[] = s ? JSON.parse(s) : [];
    return tid ? items.filter(i => i.teacherId === tid) : items;
};

export const saveBehaviorIncident = async (incident: BehaviorIncident) => {
    await supabase.from('behavior_incidents').insert(incident);
};

export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

export const getExams = (tid?: string): Exam[] => {
    const s = localStorage.getItem(KEYS.EXAMS);
    const items: Exam[] = s ? JSON.parse(s) : [];
    return tid ? items.filter(i => i.teacherId === tid) : items;
};

export const saveExam = (e: Exam) => {
    const items = getExams();
    const idx = items.findIndex(i => i.id === e.id);
    if (idx > -1) items[idx] = e; else items.push(e);
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(items));
};

export const deleteExam = (id: string) => {
    const items = getExams().filter(i => i.id !== id);
    localStorage.setItem(KEYS.EXAMS, JSON.stringify(items));
};

export const getQuestionBank = (tid: string): Question[] => {
    const s = localStorage.getItem(KEYS.QUESTION_BANK);
    const items: Question[] = s ? JSON.parse(s) : [];
    return items.filter(i => i.teacherId === tid);
};

export const saveQuestionToBank = (q: Question) => {
    const items = JSON.parse(localStorage.getItem(KEYS.QUESTION_BANK) || '[]');
    items.push(q);
    localStorage.setItem(KEYS.QUESTION_BANK, JSON.stringify(items));
};

export const deleteQuestionFromBank = (id: string) => {
    const items = JSON.parse(localStorage.getItem(KEYS.QUESTION_BANK) || '[]').filter((i: any) => i.id !== id);
    localStorage.setItem(KEYS.QUESTION_BANK, JSON.stringify(items));
};

export const getExamResults = (examId: string): ExamResult[] => {
    const s = localStorage.getItem(KEYS.EXAM_RESULTS);
    const items: ExamResult[] = s ? JSON.parse(s) : [];
    return items.filter(i => i.examId === examId);
};

export const saveExamResult = (r: ExamResult) => {
    const items = JSON.parse(localStorage.getItem(KEYS.EXAM_RESULTS) || '[]');
    items.push(r);
    localStorage.setItem(KEYS.EXAM_RESULTS, JSON.stringify(items));
};

export const deleteExamResult = (id: string) => {
    const items = JSON.parse(localStorage.getItem(KEYS.EXAM_RESULTS) || '[]').filter((i: any) => i.id !== id);
    localStorage.setItem(KEYS.EXAM_RESULTS, JSON.stringify(items));
};

export const getCurriculumUnits = (tid: string): CurriculumUnit[] => {
    const s = localStorage.getItem(KEYS.CURRICULUM_UNITS);
    const items: CurriculumUnit[] = s ? JSON.parse(s) : [];
    return items.filter(i => i.teacherId === tid);
};

export const saveCurriculumUnit = (u: CurriculumUnit) => {
    const items = JSON.parse(localStorage.getItem(KEYS.CURRICULUM_UNITS) || '[]');
    items.push(u);
    localStorage.setItem(KEYS.CURRICULUM_UNITS, JSON.stringify(items));
};

export const deleteCurriculumUnit = (id: string) => {
    const items = JSON.parse(localStorage.getItem(KEYS.CURRICULUM_UNITS) || '[]').filter((i: any) => i.id !== id);
    localStorage.setItem(KEYS.CURRICULUM_UNITS, JSON.stringify(items));
};

export const getCurriculumLessons = (): CurriculumLesson[] => {
    const s = localStorage.getItem(KEYS.CURRICULUM_LESSONS);
    return s ? JSON.parse(s) : [];
};

export const saveCurriculumLesson = (l: CurriculumLesson) => {
    const items = getCurriculumLessons();
    items.push(l);
    localStorage.setItem(KEYS.CURRICULUM_LESSONS, JSON.stringify(items));
};

export const deleteCurriculumLesson = (id: string) => {
    const items = getCurriculumLessons().filter(i => i.id !== id);
    localStorage.setItem(KEYS.CURRICULUM_LESSONS, JSON.stringify(items));
};

export const toggleCurriculumLesson = (id: string, completed: boolean) => {
    const items = getCurriculumLessons();
    const idx = items.findIndex(i => i.id === id);
    if (idx > -1) items[idx].isCompleted = completed;
    localStorage.setItem(KEYS.CURRICULUM_LESSONS, JSON.stringify(items));
};

export const getLessonLinks = (): LessonLink[] => {
    const s = localStorage.getItem(KEYS.LESSON_LINKS);
    return s ? JSON.parse(s) : [];
};

export const saveLessonLink = (l: LessonLink) => {
    const items = getLessonLinks();
    items.push(l);
    localStorage.setItem(KEYS.LESSON_LINKS, JSON.stringify(items));
};

export const deleteLessonLink = (id: string) => {
    const items = getLessonLinks().filter(i => i.id !== id);
    localStorage.setItem(KEYS.LESSON_LINKS, JSON.stringify(items));
};

export const getWeeklyPlans = (tid: string): WeeklyPlanItem[] => {
    const s = localStorage.getItem(KEYS.WEEKLY_PLANS);
    const items: WeeklyPlanItem[] = s ? JSON.parse(s) : [];
    return items.filter(i => i.teacherId === tid);
};

export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => {
    const items = JSON.parse(localStorage.getItem(KEYS.WEEKLY_PLANS) || '[]');
    const idx = items.findIndex((i: any) => i.id === p.id);
    if (idx > -1) items[idx] = p; else items.push(p);
    localStorage.setItem(KEYS.WEEKLY_PLANS, JSON.stringify(items));
};

export const getLessonPlans = (tid: string): StoredLessonPlan[] => {
    const s = localStorage.getItem(KEYS.LESSON_PLANS);
    const items: StoredLessonPlan[] = s ? JSON.parse(s) : [];
    return items.filter(i => i.teacherId === tid);
};

export const saveLessonPlan = (p: StoredLessonPlan) => {
    const items = JSON.parse(localStorage.getItem(KEYS.LESSON_PLANS) || '[]');
    items.push(p);
    localStorage.setItem(KEYS.LESSON_PLANS, JSON.stringify(items));
};

export const deleteLessonPlan = (id: string) => {
    const items = JSON.parse(localStorage.getItem(KEYS.LESSON_PLANS) || '[]').filter((i: any) => i.id !== id);
    localStorage.setItem(KEYS.LESSON_PLANS, JSON.stringify(items));
};

export const getTrackingSheets = (tid: string): TrackingSheet[] => {
    const s = localStorage.getItem(KEYS.TRACKING_SHEETS);
    const items: TrackingSheet[] = s ? JSON.parse(s) : [];
    return items.filter(i => i.teacherId === tid);
};

export const saveTrackingSheet = (sh: TrackingSheet) => {
    const items = JSON.parse(localStorage.getItem(KEYS.TRACKING_SHEETS) || '[]');
    const idx = items.findIndex((i: any) => i.id === sh.id);
    if (idx > -1) items[idx] = sh; else items.push(sh);
    localStorage.setItem(KEYS.TRACKING_SHEETS, JSON.stringify(items));
};

export const deleteTrackingSheet = (id: string) => {
    const items = JSON.parse(localStorage.getItem(KEYS.TRACKING_SHEETS) || '[]').filter((i: any) => i.id !== id);
    localStorage.setItem(KEYS.TRACKING_SHEETS, JSON.stringify(items));
};

export const getRemedialPlans = (): RemedialPlan[] => {
    const s = localStorage.getItem(KEYS.REMEDIAL_PLANS);
    return s ? JSON.parse(s) : [];
};

export const saveRemedialPlan = (p: RemedialPlan) => {
    const items = getRemedialPlans();
    items.push(p);
    localStorage.setItem(KEYS.REMEDIAL_PLANS, JSON.stringify(items));
};

export const saveFormsDetailedResult = (r: FormsDetailedResult) => {
    const items = getFormsDetailedResults(r.teacherId);
    items.push(r);
    localStorage.setItem(KEYS.FORMS_RESULTS, JSON.stringify(items));
};

export const getFormsDetailedResults = (tid: string): FormsDetailedResult[] => {
    const s = localStorage.getItem(KEYS.FORMS_RESULTS);
    const items: FormsDetailedResult[] = s ? JSON.parse(s) : [];
    return items.filter(i => i.teacherId === tid);
};

export const deleteFormsDetailedResult = (id: string) => {
    const items = JSON.parse(localStorage.getItem(KEYS.FORMS_RESULTS) || '[]').filter((i: any) => i.id !== id);
    localStorage.setItem(KEYS.FORMS_RESULTS, JSON.stringify(items));
};

export const saveEnvironmentRecord = (r: EnvironmentRecord) => {
    const items = getEnvironmentRecords(r.classId);
    items.push(r);
    localStorage.setItem(KEYS.ENV_RECORDS, JSON.stringify(items));
};

export const getEnvironmentRecords = (cid: string): EnvironmentRecord[] => {
    const s = localStorage.getItem(KEYS.ENV_RECORDS);
    const items: EnvironmentRecord[] = s ? JSON.parse(s) : [];
    return items.filter(i => i.classId === cid);
};

export const getMessages = (tid?: string): MessageLog[] => {
    const s = localStorage.getItem(KEYS.MESSAGES);
    const items: MessageLog[] = s ? JSON.parse(s) : [];
    return tid ? items.filter(i => i.teacherId === tid) : items;
};

export const saveMessage = (m: MessageLog) => {
    const items = getMessages();
    items.push(m);
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(items));
};

export const addCustomTable = (t: CustomTable) => {
    const items = getCustomTables();
    items.push(t);
    localStorage.setItem(KEYS.CUSTOM_TABLES, JSON.stringify(items));
};

export const getCustomTables = (tid?: string): CustomTable[] => {
    const s = localStorage.getItem(KEYS.CUSTOM_TABLES);
    const items: CustomTable[] = s ? JSON.parse(s) : [];
    return tid ? items.filter(i => i.teacherId === tid) : items;
};

export const deleteCustomTable = (id: string) => {
    const items = getCustomTables().filter(i => i.id !== id);
    localStorage.setItem(KEYS.CUSTOM_TABLES, JSON.stringify(items));
};

export const updateCustomTable = (t: CustomTable) => {
    const items = getCustomTables();
    const idx = items.findIndex(i => i.id === t.id);
    if (idx > -1) items[idx] = t;
    localStorage.setItem(KEYS.CUSTOM_TABLES, JSON.stringify(items));
};

export const submitTask = async (tid: string, sid: string) => {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === tid);
    if (task && !task.submissions.includes(sid)) {
        task.submissions.push(sid);
        await saveTask(task);
    }
};

export const initAutoSync = async () => {
    await downloadFromSupabase();
};

export const setSystemMode = (m: boolean) => {};
export const fetchTeacherPeriodTimings = async (tid: string) => getTeacherPeriodTimings(tid);
