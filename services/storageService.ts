
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

// الإعدادات فقط هي ما يتم حفظه محلياً لسرعة التحميل (Theme, UI state)
export const KEYS = {
    USER_THEME: 'user_theme',
    AI_SETTINGS: 'ai_settings',
    WORKS_MASTER_URL: 'works_master_url',
    REPORT_HEADER: 'report_header_config',
    PERIOD_TIMINGS: 'period_timings',
    CUSTOM_TABLES: 'custom_tables',
    STUDENTS: 'students_cache',
    ATTENDANCE: 'attendance_cache',
    PERFORMANCE: 'performance_cache',
    SCHEDULES: 'schedules_cache',
    SUBJECTS: 'subjects_cache',
    TEACHER_ASSIGNMENTS: 'teacher_assignments_cache',
    ACADEMIC_TERMS: 'academic_terms_cache',
    TASKS: 'tasks_cache',
    BEHAVIOR_INCIDENTS: 'behavior_incidents_cache',
    MESSAGE_LOG: 'message_log_cache',
    LESSON_LINKS: 'lesson_links_cache',
    LESSON_PLANS: 'lesson_plans_cache',
    EXAMS: 'exams_cache',
    EXAM_RESULTS: 'exam_results_cache',
    QUESTION_BANK: 'question_bank_cache',
    TRACKING_SHEETS: 'tracking_sheets_cache',
    REMEDIAL_PLANS: 'remedial_plans_cache',
    FORMS_RESULTS: 'forms_results_cache',
    ENVIRONMENT: 'environment_cache',
    CURRICULUM_UNITS: 'curriculum_units_cache',
    CURRICULUM_LESSONS: 'curriculum_lessons_cache',
    SYSTEM_USERS: 'system_users_cache',
    SCHOOLS: 'schools_cache',
    TEACHERS: 'teachers_cache'
};

// --- Helpers for Sync/Cache ---

const getLocal = <T>(key: string): T[] => {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : [];
};

const saveLocal = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- أساسيات الحفظ المباشر في السحاب (Domain Entities) ---

export const fetchStudents = async (): Promise<Student[]> => {
    const { data, error } = await supabase.from('students').select('*').order('name');
    if (error) throw error;
    saveLocal(KEYS.STUDENTS, data || []);
    return data || [];
};

// Fix: Add getStudents to provide synchronous access to cached data
export const getStudents = (): Student[] => getLocal<Student>(KEYS.STUDENTS);

export const fetchAttendance = async (teacherId?: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    saveLocal(KEYS.ATTENDANCE, data || []);
    return data || [];
};

// Fix: Add getAttendance to provide synchronous access to cached data
export const getAttendance = (teacherId?: string): AttendanceRecord[] => {
    const all = getLocal<AttendanceRecord>(KEYS.ATTENDANCE);
    return teacherId ? all.filter(a => a.createdById === teacherId) : all;
};

export const fetchPerformance = async (teacherId?: string): Promise<PerformanceRecord[]> => {
    let query = supabase.from('performance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    saveLocal(KEYS.PERFORMANCE, data || []);
    return data || [];
};

// Fix: Add getPerformance to provide synchronous access to cached data
export const getPerformance = (teacherId?: string): PerformanceRecord[] => {
    const all = getLocal<PerformanceRecord>(KEYS.PERFORMANCE);
    return teacherId ? all.filter(p => p.createdById === teacherId) : all;
};

// --- دوال الحفظ المباشر (Direct Write to Cloud) ---

export const saveAttendance = async (records: AttendanceRecord[]) => {
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'id' });
    if (error) throw error;
    // Update cache
    const current = getAttendance();
    const updated = [...current];
    records.forEach(r => {
        const idx = updated.findIndex(u => u.id === r.id);
        if (idx !== -1) updated[idx] = r; else updated.push(r);
    });
    saveLocal(KEYS.ATTENDANCE, updated);
};

export const deleteAttendance = async (id: string) => {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) throw error;
    saveLocal(KEYS.ATTENDANCE, getAttendance().filter(a => a.id !== id));
};

export const addPerformance = async (records: PerformanceRecord | PerformanceRecord[]) => {
    const dataToSave = Array.isArray(records) ? records : [records];
    const { error } = await supabase.from('performance').upsert(dataToSave, { onConflict: 'id' });
    if (error) throw error;
    // Update cache
    const current = getPerformance();
    const updated = [...current];
    dataToSave.forEach(r => {
        const idx = updated.findIndex(u => u.id === r.id);
        if (idx !== -1) updated[idx] = r; else updated.push(r);
    });
    saveLocal(KEYS.PERFORMANCE, updated);
};

export const deletePerformance = async (id: string) => {
    const { error } = await supabase.from('performance').delete().eq('id', id);
    if (error) throw error;
    saveLocal(KEYS.PERFORMANCE, getPerformance().filter(p => p.id !== id));
};

// --- إدارة الطلاب ---

export const addStudent = async (s: Student) => {
    const { error } = await supabase.from('students').insert(s);
    if (error) throw error;
    saveLocal(KEYS.STUDENTS, [...getStudents(), s]);
};

export const updateStudent = async (s: Student) => {
    const { error } = await supabase.from('students').update(s).eq('id', s.id);
    if (error) throw error;
    saveLocal(KEYS.STUDENTS, getStudents().map(item => item.id === s.id ? s : item));
};

export const deleteStudent = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
    saveLocal(KEYS.STUDENTS, getStudents().filter(s => s.id !== id));
};

export const updateStudentLearningStyle = async (id: string, style: LearningStyle) => {
    const { error } = await supabase.from('students').update({ learning_style: style }).eq('id', id);
    if (error) throw error;
    const students = getStudents();
    const student = students.find(s => s.id === id);
    if (student) {
        student.learningStyle = style;
        saveLocal(KEYS.STUDENTS, students);
    }
};

// --- جداول البيانات والجدول الدراسي ---

export const fetchSubjects = async (tid: string): Promise<Subject[]> => {
    const { data } = await supabase.from('subjects').select('*').eq('teacher_id', tid);
    saveLocal(KEYS.SUBJECTS, data || []);
    return data || [];
};

// Fix: Add getSubjects for synchronous access
export const getSubjects = (tid?: string): Subject[] => {
    const all = getLocal<Subject>(KEYS.SUBJECTS);
    return tid ? all.filter(s => s.teacherId === tid) : all;
};

export const addSubject = async (s: Subject) => {
    await supabase.from('subjects').insert(s);
    saveLocal(KEYS.SUBJECTS, [...getSubjects(), s]);
};

export const deleteSubject = async (id: string) => {
    await supabase.from('subjects').delete().eq('id', id);
    saveLocal(KEYS.SUBJECTS, getSubjects().filter(s => s.id !== id));
};

export const fetchSchedules = async (tid: string): Promise<ScheduleItem[]> => {
    const { data } = await supabase.from('schedules').select('*').eq('teacher_id', tid);
    saveLocal(KEYS.SCHEDULES, data || []);
    return data || [];
};

// Fix: Add getSchedules for synchronous access
export const getSchedules = (tid?: string): ScheduleItem[] => {
    const all = getLocal<ScheduleItem>(KEYS.SCHEDULES);
    return tid ? all.filter(s => s.teacherId === tid) : all;
};

export const saveScheduleItem = async (s: ScheduleItem) => {
    await supabase.from('schedules').upsert(s);
    const current = getSchedules();
    const idx = current.findIndex(c => c.id === s.id);
    if (idx !== -1) current[idx] = s; else current.push(s);
    saveLocal(KEYS.SCHEDULES, current);
};

export const deleteScheduleItem = async (id: string) => {
    await supabase.from('schedules').delete().eq('id', id);
    saveLocal(KEYS.SCHEDULES, getSchedules().filter(s => s.id !== id));
};

export const fetchTeacherAssignments = async (tid: string): Promise<TeacherAssignment[]> => {
    const { data } = await supabase.from('teacher_class_map').select('*').eq('teacher_id', tid);
    const mapped = (data || []).map(d => ({
        id: d.id,
        classId: d.class_id,
        subjectName: d.subject_name,
        teacherId: d.teacher_id
    }));
    saveLocal(KEYS.TEACHER_ASSIGNMENTS, mapped);
    return mapped;
};

// Fix: Add getTeacherAssignments for synchronous access
export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => {
    const all = getLocal<TeacherAssignment>(KEYS.TEACHER_ASSIGNMENTS);
    return tid ? all.filter(a => a.teacherId === tid) : all;
};

export const addTeacherAssignment = async (a: TeacherAssignment) => {
    await supabase.from('teacher_class_map').insert({
        id: a.id,
        class_id: a.classId,
        subject_name: a.subjectName,
        teacher_id: a.teacherId
    });
    saveLocal(KEYS.TEACHER_ASSIGNMENTS, [...getTeacherAssignments(), a]);
};

export const deleteTeacherAssignment = async (id: string) => {
    await supabase.from('teacher_class_map').delete().eq('id', id);
    saveLocal(KEYS.TEACHER_ASSIGNMENTS, getTeacherAssignments().filter(a => a.id !== id));
};

export const fetchAcademicTerms = async (tid: string): Promise<AcademicTerm[]> => {
    const { data } = await supabase.from('academic_terms').select('*').eq('teacher_id', tid);
    const mapped = (data || []).map(d => ({
        id: d.id,
        name: d.name,
        startDate: d.start_date,
        endDate: d.end_date,
        isCurrent: d.is_current,
        teacherId: d.teacher_id,
        periods: d.periods ? (typeof d.periods === 'string' ? JSON.parse(d.periods) : d.periods) : []
    }));
    saveLocal(KEYS.ACADEMIC_TERMS, mapped);
    return mapped;
};

// Fix: Add getAcademicTerms for synchronous access
export const getAcademicTerms = (tid?: string): AcademicTerm[] => {
    const all = getLocal<AcademicTerm>(KEYS.ACADEMIC_TERMS);
    return tid ? all.filter(t => t.teacherId === tid) : all;
};

export const saveAcademicTerm = async (t: AcademicTerm) => {
    const { error } = await supabase.from('academic_terms').upsert({
        id: t.id,
        name: t.name,
        start_date: t.startDate,
        end_date: t.endDate,
        is_current: t.isCurrent,
        teacher_id: t.teacherId,
        periods: JSON.stringify(t.periods || [])
    }, { onConflict: 'id' });
    if (error) throw error;
    const current = getAcademicTerms();
    const idx = current.findIndex(c => c.id === t.id);
    if (idx !== -1) current[idx] = t; else current.push(t);
    saveLocal(KEYS.ACADEMIC_TERMS, current);
};

export const deleteAcademicTerm = async (id: string) => {
    await supabase.from('academic_terms').delete().eq('id', id);
    saveLocal(KEYS.ACADEMIC_TERMS, getAcademicTerms().filter(t => t.id !== id));
};

export const setCurrentTerm = async (id: string, tid: string) => {
    const terms = getAcademicTerms(tid);
    const updated = terms.map(t => ({ ...t, isCurrent: t.id === id }));
    for (const term of updated) {
        await saveAcademicTerm(term);
    }
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

// Fix: Add System Users management
export const getSystemUsers = (): SystemUser[] => getLocal<SystemUser>(KEYS.SYSTEM_USERS);
export const addSystemUser = async (u: SystemUser) => {
    await supabase.from('system_users').insert(u);
    saveLocal(KEYS.SYSTEM_USERS, [...getSystemUsers(), u]);
};
export const deleteSystemUser = async (id: string) => {
    await supabase.from('system_users').delete().eq('id', id);
    saveLocal(KEYS.SYSTEM_USERS, getSystemUsers().filter(u => u.id !== id));
};
export const updateSystemUser = async (u: SystemUser) => {
    await supabase.from('system_users').update(u).eq('id', u.id);
    saveLocal(KEYS.SYSTEM_USERS, getSystemUsers().map(item => item.id === u.id ? u : item));
};

// --- إعدادات النظام (LocalStorage acceptable here for UI persistence) ---

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

// --- CRUD For Schools & Teachers ---

export const getSchools = (): School[] => getLocal<School>(KEYS.SCHOOLS);

export const addSchool = async (s: School) => {
    const { error } = await supabase.from('schools').insert(s);
    if (error) throw error;
    saveLocal(KEYS.SCHOOLS, [...getSchools(), s]);
};

export const updateSchool = async (s: School) => {
    await supabase.from('schools').update(s).eq('id', s.id);
    saveLocal(KEYS.SCHOOLS, getSchools().map(item => item.id === s.id ? s : item));
};

export const deleteSchool = async (id: string) => {
    await supabase.from('schools').delete().eq('id', id);
    saveLocal(KEYS.SCHOOLS, getSchools().filter(s => s.id !== id));
};

export const getTeachers = (): Teacher[] => getLocal<Teacher>(KEYS.TEACHERS);

export const addTeacher = async (t: Teacher) => {
    const { error } = await supabase.from('teachers').insert(t);
    if (error) throw error;
    saveLocal(KEYS.TEACHERS, [...getTeachers(), t]);
};

export const updateTeacher = async (t: Teacher) => {
    const { error } = await supabase.from('teachers').update(t).eq('id', t.id);
    if (error) throw error;
    saveLocal(KEYS.TEACHERS, getTeachers().map(item => item.id === t.id ? t : item));
};

// --- Missing Specialized Features ---

export const getTasks = (tid?: string): Task[] => {
    const all = getLocal<Task>(KEYS.TASKS);
    return tid ? all.filter(t => t.teacherId === tid) : all;
};

export const saveTask = async (t: Task) => {
    await supabase.from('tasks').upsert(t);
    const current = getTasks();
    const idx = current.findIndex(c => c.id === t.id);
    if (idx !== -1) current[idx] = t; else current.push(t);
    saveLocal(KEYS.TASKS, current);
};

export const submitTask = async (taskId: string, studentId: string) => {
    const tasks = getTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.submissions.includes(studentId)) {
        task.submissions.push(studentId);
        await saveTask(task);
    }
};

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => {
    const all = getLocal<BehaviorIncident>(KEYS.BEHAVIOR_INCIDENTS);
    return tid ? all.filter(i => i.teacherId === tid) : all;
};

export const saveBehaviorIncident = async (i: BehaviorIncident) => {
    await supabase.from('behavior_incidents').upsert(i);
    const current = getBehaviorIncidents();
    current.push(i);
    saveLocal(KEYS.BEHAVIOR_INCIDENTS, current);
};

export const getAssignments = (category: string = 'ALL', tid?: string, isManager: boolean = false): Assignment[] => {
    const all = getLocal<Assignment>('assignments_cache');
    let filtered = tid ? all.filter(a => a.teacherId === tid) : all;
    if (category !== 'ALL') filtered = filtered.filter(a => a.category === category);
    return filtered;
};

export const saveAssignment = async (a: Assignment) => {
    await supabase.from('assignments').upsert(a);
    const current = getLocal<Assignment>('assignments_cache');
    const idx = current.findIndex(c => c.id === a.id);
    if (idx !== -1) current[idx] = a; else current.push(a);
    saveLocal('assignments_cache', current);
};

export const deleteAssignment = async (id: string) => {
    await supabase.from('assignments').delete().eq('id', id);
    const current = getLocal<Assignment>('assignments_cache');
    saveLocal('assignments_cache', current.filter(a => a.id !== id));
};

export const getCustomTables = (tid?: string): CustomTable[] => {
    const all = getLocal<CustomTable>(KEYS.CUSTOM_TABLES);
    return tid ? all.filter(t => t.teacherId === tid) : all;
};

export const addCustomTable = (t: CustomTable) => {
    saveLocal(KEYS.CUSTOM_TABLES, [...getCustomTables(), t]);
};

export const updateCustomTable = (t: CustomTable) => {
    saveLocal(KEYS.CUSTOM_TABLES, getCustomTables().map(item => item.id === t.id ? t : item));
};

export const deleteCustomTable = (id: string) => {
    saveLocal(KEYS.CUSTOM_TABLES, getCustomTables().filter(t => t.id !== id));
};

export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

export const getMessages = (tid?: string): MessageLog[] => {
    const all = getLocal<MessageLog>(KEYS.MESSAGE_LOG);
    return tid ? all.filter(m => m.teacherId === tid) : all;
};

export const saveMessage = async (m: MessageLog) => {
    await supabase.from('messages').upsert(m);
    saveLocal(KEYS.MESSAGE_LOG, [...getMessages(), m]);
};

export const getLessonLinks = (): LessonLink[] => getLocal<LessonLink>(KEYS.LESSON_LINKS);
export const saveLessonLink = async (l: LessonLink) => {
    await supabase.from('lesson_links').upsert(l);
    saveLocal(KEYS.LESSON_LINKS, [...getLessonLinks(), l]);
};
export const deleteLessonLink = async (id: string) => {
    await supabase.from('lesson_links').delete().eq('id', id);
    saveLocal(KEYS.LESSON_LINKS, getLessonLinks().filter(l => l.id !== id));
};

export const getLessonPlans = (tid?: string): StoredLessonPlan[] => {
    const all = getLocal<StoredLessonPlan>(KEYS.LESSON_PLANS);
    return tid ? all.filter(p => p.teacherId === tid) : all;
};
export const saveLessonPlan = async (p: StoredLessonPlan) => {
    await supabase.from('lesson_plans').upsert(p);
    const current = getLessonPlans();
    const idx = current.findIndex(c => c.id === p.id);
    if (idx !== -1) current[idx] = p; else current.push(p);
    saveLocal(KEYS.LESSON_PLANS, current);
};
export const deleteLessonPlan = async (id: string) => {
    await supabase.from('lesson_plans').delete().eq('id', id);
    saveLocal(KEYS.LESSON_PLANS, getLessonPlans().filter(p => p.id !== id));
};

export const getExams = (tid?: string): Exam[] => {
    const all = getLocal<Exam>(KEYS.EXAMS);
    return tid ? all.filter(e => e.teacherId === tid) : all;
};
export const saveExam = async (e: Exam) => {
    await supabase.from('exams').upsert(e);
    const current = getExams();
    const idx = current.findIndex(c => c.id === e.id);
    if (idx !== -1) current[idx] = e; else current.push(e);
    saveLocal(KEYS.EXAMS, current);
};
export const deleteExam = async (id: string) => {
    await supabase.from('exams').delete().eq('id', id);
    saveLocal(KEYS.EXAMS, getExams().filter(e => e.id !== id));
};

export const getExamResults = (examId?: string): ExamResult[] => {
    const all = getLocal<ExamResult>(KEYS.EXAM_RESULTS);
    return examId ? all.filter(r => r.examId === examId) : all;
};
export const saveExamResult = async (r: ExamResult) => {
    await supabase.from('exam_results').upsert(r);
    saveLocal(KEYS.EXAM_RESULTS, [...getExamResults(), r]);
};
export const deleteExamResult = async (id: string) => {
    await supabase.from('exam_results').delete().eq('id', id);
    saveLocal(KEYS.EXAM_RESULTS, getExamResults().filter(r => r.id !== id));
};

export const getQuestionBank = (tid?: string): Question[] => {
    const all = getLocal<Question>(KEYS.QUESTION_BANK);
    return tid ? all.filter(q => q.teacherId === tid) : all;
};
export const saveQuestionToBank = async (q: Question) => {
    await supabase.from('question_bank').upsert(q);
    const current = getQuestionBank();
    const idx = current.findIndex(c => c.id === q.id);
    if (idx !== -1) current[idx] = q; else current.push(q);
    saveLocal(KEYS.QUESTION_BANK, current);
};
export const deleteQuestionFromBank = async (id: string) => {
    await supabase.from('question_bank').delete().eq('id', id);
    saveLocal(KEYS.QUESTION_BANK, getQuestionBank().filter(q => q.id !== id));
};

export const getFormsDetailedResults = (tid?: string): FormsDetailedResult[] => {
    const all = getLocal<FormsDetailedResult>(KEYS.FORMS_RESULTS);
    return tid ? all.filter(r => r.teacherId === tid) : all;
};
export const saveFormsDetailedResult = async (r: FormsDetailedResult) => {
    await supabase.from('forms_detailed_results').upsert(r);
    saveLocal(KEYS.FORMS_RESULTS, [...getFormsDetailedResults(), r]);
};
export const deleteFormsDetailedResult = async (id: string) => {
    await supabase.from('forms_detailed_results').delete().eq('id', id);
    saveLocal(KEYS.FORMS_RESULTS, getFormsDetailedResults().filter(r => r.id !== id));
};

export const saveEnvironmentRecord = async (e: EnvironmentRecord) => {
    await supabase.from('environment_records').upsert(e);
    saveLocal(KEYS.ENVIRONMENT, [...getLocal<EnvironmentRecord>(KEYS.ENVIRONMENT), e]);
};
export const getEnvironmentRecords = (classId?: string): EnvironmentRecord[] => {
    const all = getLocal<EnvironmentRecord>(KEYS.ENVIRONMENT);
    return classId ? all.filter(e => e.classId === classId) : all;
};

export const getTrackingSheets = (tid?: string): TrackingSheet[] => {
    const all = getLocal<TrackingSheet>(KEYS.TRACKING_SHEETS);
    return tid ? all.filter(s => s.teacherId === tid) : all;
};
export const saveTrackingSheet = async (s: TrackingSheet) => {
    await supabase.from('tracking_sheets').upsert(s);
    const current = getTrackingSheets();
    const idx = current.findIndex(c => c.id === s.id);
    if (idx !== -1) current[idx] = s; else current.push(s);
    saveLocal(KEYS.TRACKING_SHEETS, current);
};
export const deleteTrackingSheet = async (id: string) => {
    await supabase.from('tracking_sheets').delete().eq('id', id);
    saveLocal(KEYS.TRACKING_SHEETS, getTrackingSheets().filter(s => s.id !== id));
};

export const getCurriculumUnits = (tid?: string): CurriculumUnit[] => {
    const all = getLocal<CurriculumUnit>(KEYS.CURRICULUM_UNITS);
    return tid ? all.filter(u => u.teacherId === tid) : all;
};
export const saveCurriculumUnit = async (u: CurriculumUnit) => {
    await supabase.from('curriculum_units').upsert(u);
    saveLocal(KEYS.CURRICULUM_UNITS, [...getCurriculumUnits(), u]);
};
export const deleteCurriculumUnit = async (id: string) => {
    await supabase.from('curriculum_units').delete().eq('id', id);
    saveLocal(KEYS.CURRICULUM_UNITS, getCurriculumUnits().filter(u => u.id !== id));
};

export const getCurriculumLessons = (): CurriculumLesson[] => getLocal<CurriculumLesson>(KEYS.CURRICULUM_LESSONS);
export const saveCurriculumLesson = async (l: CurriculumLesson) => {
    await supabase.from('curriculum_lessons').upsert(l);
    const current = getCurriculumLessons();
    const idx = current.findIndex(c => c.id === l.id);
    if (idx !== -1) current[idx] = l; else current.push(l);
    saveLocal(KEYS.CURRICULUM_LESSONS, current);
};
export const deleteCurriculumLesson = async (id: string) => {
    await supabase.from('curriculum_lessons').delete().eq('id', id);
    saveLocal(KEYS.CURRICULUM_LESSONS, getCurriculumLessons().filter(l => l.id !== id));
};
export const toggleCurriculumLesson = async (id: string, completed: boolean) => {
    const lessons = getCurriculumLessons();
    const l = lessons.find(x => x.id === id);
    if (l) {
        l.isCompleted = completed;
        l.completedAt = completed ? new Date().toISOString() : undefined;
        await saveCurriculumLesson(l);
    }
};

export const getRemedialPlans = (tid?: string): RemedialPlan[] => {
    const all = getLocal<RemedialPlan>(KEYS.REMEDIAL_PLANS);
    return tid ? all.filter(p => p.teacherId === tid) : all;
};
export const saveRemedialPlan = async (p: RemedialPlan) => {
    await supabase.from('remedial_plans').upsert(p);
    saveLocal(KEYS.REMEDIAL_PLANS, [...getRemedialPlans(), p]);
};

export const getWeeklyPlans = (tid?: string): WeeklyPlanItem[] => {
    const all = getLocal<WeeklyPlanItem>(KEYS.WEEKLY_PLAN_ITEM || 'weekly_plans_cache');
    return tid ? all.filter(p => p.teacherId === tid) : all;
};
export const saveWeeklyPlanItem = async (p: WeeklyPlanItem) => {
    await supabase.from('weekly_plans').upsert(p);
    const current = getWeeklyPlans();
    const idx = current.findIndex(c => c.id === p.id);
    if (idx !== -1) current[idx] = p; else current.push(p);
    saveLocal(KEYS.WEEKLY_PLAN_ITEM || 'weekly_plans_cache', current);
};

// --- Maintenance & Admin ---

export const DB_MAP = {
    STUDENTS: 'students',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    SCHEDULES: 'schedules',
    SUBJECTS: 'subjects',
    TEACHER_CLASS_MAP: 'teacher_class_map',
    ACADEMIC_TERMS: 'academic_terms',
    SYSTEM_USERS: 'system_users',
    SCHOOLS: 'schools',
    TEACHERS: 'teachers'
};

export const getTableDisplayName = (table: string) => table.replace(/_/g, ' ').toUpperCase();

export const fetchCloudTableData = async (table: string) => {
    const { data } = await supabase.from(table).select('*').limit(100);
    return data;
};

export const clearCloudTable = async (table: string) => {
    const { error } = await supabase.from(table).delete().neq('id', '0');
    if (error) throw error;
};

export const resetCloudDatabase = async () => {
    for (const table of Object.values(DB_MAP)) {
        await clearCloudTable(table);
    }
};

export const getDatabaseSchemaSQL = () => `
-- Core Schema SQL
CREATE TABLE IF NOT EXISTS system_users (id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE, national_id TEXT UNIQUE, password TEXT, role TEXT, school_id TEXT, status TEXT, phone TEXT);
CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY, name TEXT, ministry_code TEXT UNIQUE, manager_name TEXT, manager_national_id TEXT, type TEXT, phone TEXT, student_count INTEGER, education_administration TEXT);
CREATE TABLE IF NOT EXISTS teachers (id TEXT PRIMARY KEY, name TEXT, national_id TEXT UNIQUE, email TEXT, phone TEXT, subject_specialty TEXT, password TEXT, school_id TEXT, manager_id TEXT, subscription_status TEXT, subscription_end_date TEXT);
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT, role TEXT DEFAULT 'STUDENT', national_id TEXT UNIQUE, class_id TEXT, school_id TEXT, created_by_id TEXT, grade_level TEXT, class_name TEXT, email TEXT, phone TEXT, parent_id TEXT, parent_name TEXT, parent_phone TEXT, parent_email TEXT, password TEXT, seat_index INTEGER, learning_style TEXT, behavior_points INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, student_id TEXT, date TEXT, status TEXT, subject TEXT, period INTEGER, behavior_status TEXT, behavior_note TEXT, participation_score INTEGER, excuse_note TEXT, excuse_file TEXT, created_by_id TEXT, term_id TEXT);
CREATE TABLE IF NOT EXISTS performance (id TEXT PRIMARY KEY, student_id TEXT, subject TEXT, title TEXT, category TEXT, score NUMERIC, max_score NUMERIC, date TEXT, notes TEXT, url TEXT, created_by_id TEXT);
`;

export const getDatabaseUpdateSQL = () => `-- Update existing schema commands here`;

export const validateCloudSchema = async () => {
    const missingTables = [];
    for (const table of Object.values(DB_MAP)) {
        const { error } = await supabase.from(table).select('count').limit(1);
        if (error && error.code === '42P01') missingTables.push(table);
    }
    return { missingTables };
};

export const backupCloudDatabase = async () => {
    const backup: any = {};
    for (const table of Object.values(DB_MAP)) {
        const { data } = await supabase.from(table).select('*');
        backup[table] = data;
    }
    return JSON.stringify(backup);
};

export const restoreCloudDatabase = async (json: string) => {
    const backup = JSON.parse(json);
    for (const [table, data] of Object.entries(backup)) {
        if (Array.isArray(data) && data.length > 0) {
            await supabase.from(table).upsert(data);
        }
    }
};

export const createBackup = () => {
    const data: any = {};
    Object.keys(localStorage).forEach(k => {
        data[k] = localStorage.getItem(k);
    });
    return JSON.stringify(data);
};

export const restoreBackup = (json: string) => {
    const data = JSON.parse(json);
    Object.entries(data).forEach(([k, v]) => {
        localStorage.setItem(k, v as string);
    });
};

export const clearDatabase = () => {
    localStorage.clear();
};

export const setSystemMode = (val: boolean) => localStorage.setItem('system_mode', val ? 'CLOUD' : 'LOCAL');

// --- Sync Placeholder ---
export const initAutoSync = async () => { /* Redundant as we use direct cloud calls + local cache */ };
export const downloadFromSupabase = async () => { /* Redundant */ };
export const uploadToSupabase = async () => { /* Redundant */ };
export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('system_users').select('id').limit(1);
        return { success: !error };
    } catch { return { success: false }; }
};
