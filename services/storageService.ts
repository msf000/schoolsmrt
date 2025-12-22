
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
    CUSTOM_TABLES: 'custom_tables'
};

// Fix: Define DB_MAP for cloud operations
export const DB_MAP = {
    STUDENTS: 'students',
    ATTENDANCE: 'attendance',
    PERFORMANCE: 'performance',
    TEACHERS: 'teachers',
    SCHOOLS: 'schools',
    SYSTEM_USERS: 'system_users',
    SUBJECTS: 'subjects',
    SCHEDULES: 'schedules',
    ASSIGNMENTS: 'assignments',
    ACADEMIC_TERMS: 'academic_terms',
    TASKS: 'tasks',
    BEHAVIOR: 'behavior_incidents',
    EXAMS: 'exams',
    EXAM_RESULTS: 'exam_results',
    MESSAGE_LOGS: 'messages',
    CUSTOM_TABLES: 'custom_tables',
    LESSON_LINKS: 'lesson_links',
    LESSON_PLANS: 'lesson_plans',
    WEEKLY_PLANS: 'weekly_plans',
    ENVIRONMENT: 'environment_records',
    TRACKING_SHEETS: 'tracking_sheets',
    REMEDIAL_PLANS: 'remedial_plans',
    CURRICULUM_UNITS: 'curriculum_units',
    CURRICULUM_LESSONS: 'curriculum_lessons',
    FORMS_RESULTS: 'forms_detailed_results',
    QUESTION_BANK: 'question_bank'
};

/**
 * Memory Cache System (Session Only)
 * يتم تخزين البيانات هنا أثناء تشغيل التطبيق فقط لضمان السرعة الفائقة
 */
const sessionCache: any = {
    students: [] as Student[],
    attendance: [] as AttendanceRecord[],
    performance: [] as PerformanceRecord[],
    subjects: [] as Subject[],
    schedules: [] as ScheduleItem[],
    assignments: [] as TeacherAssignment[],
    academicTerms: [] as AcademicTerm[],
    tasks: [] as Task[],
    behavior: [] as BehaviorIncident[],
    exams: [] as Exam[],
    examResults: [] as ExamResult[],
    messages: [] as MessageLog[],
    schools: [] as School[],
    teachers: [] as Teacher[],
    systemUsers: [] as SystemUser[],
    customTables: [] as CustomTable[],
    lessonLinks: [] as LessonLink[],
    lessonPlans: [] as StoredLessonPlan[],
    weeklyPlans: [] as WeeklyPlanItem[],
    curriculumUnits: [] as CurriculumUnit[],
    curriculumLessons: [] as CurriculumLesson[],
    environmentRecords: [] as EnvironmentRecord[],
    trackingSheets: [] as TrackingSheet[],
    formsDetailedResults: [] as FormsDetailedResult[],
    questionBank: [] as Question[]
};

// --- دوال الجلب السحابي (Populate Cache) ---

export const fetchStudents = async (): Promise<Student[]> => {
    const { data, error } = await supabase.from('students').select('*').order('name');
    if (error) throw error;
    sessionCache.students = data || [];
    return sessionCache.students;
};

export const getStudents = (): Student[] => sessionCache.students;

export const fetchAttendance = async (teacherId?: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    sessionCache.attendance = data || [];
    return sessionCache.attendance;
};

export const getAttendance = (teacherId?: string): AttendanceRecord[] => {
    return teacherId ? sessionCache.attendance.filter((a: any) => a.createdById === teacherId) : sessionCache.attendance;
};

export const fetchPerformance = async (teacherId?: string): Promise<PerformanceRecord[]> => {
    let query = supabase.from('performance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data, error } = await query.order('date', { ascending: false });
    if (error) throw error;
    sessionCache.performance = data || [];
    return sessionCache.performance;
};

export const getPerformance = (teacherId?: string): PerformanceRecord[] => {
    return teacherId ? sessionCache.performance.filter((p: any) => p.createdById === teacherId) : sessionCache.performance;
};

// --- دوال الحفظ المباشر ---

export const saveAttendance = async (records: AttendanceRecord[]) => {
    const { error } = await supabase.from('attendance').upsert(records, { onConflict: 'id' });
    if (error) throw error;
    records.forEach(newRec => {
        const idx = sessionCache.attendance.findIndex((a: any) => a.id === newRec.id);
        if (idx !== -1) sessionCache.attendance[idx] = newRec; else sessionCache.attendance.push(newRec);
    });
};

export const deleteAttendance = async (id: string) => {
    await supabase.from('attendance').delete().eq('id', id);
    sessionCache.attendance = sessionCache.attendance.filter((a: any) => a.id !== id);
};

export const addPerformance = async (records: PerformanceRecord | PerformanceRecord[]) => {
    const dataToSave = Array.isArray(records) ? records : [records];
    const { error } = await supabase.from('performance').upsert(dataToSave, { onConflict: 'id' });
    if (error) throw error;
    dataToSave.forEach(newRec => {
        const idx = sessionCache.performance.findIndex((p: any) => p.id === newRec.id);
        if (idx !== -1) sessionCache.performance[idx] = newRec; else sessionCache.performance.push(newRec);
    });
};

// Fix: Alias bulkAddPerformance for compatibility
export const bulkAddPerformance = addPerformance;

export const deletePerformance = async (id: string) => {
    await supabase.from('performance').delete().eq('id', id);
    sessionCache.performance = sessionCache.performance.filter((p: any) => p.id !== id);
};

// --- إدارة الطلاب (Cloud Direct) ---

export const addStudent = async (s: Student) => {
    await supabase.from('students').insert(s);
    sessionCache.students.push(s);
};

export const updateStudent = async (s: Student) => {
    await supabase.from('students').update(s).eq('id', s.id);
    sessionCache.students = sessionCache.students.map((item: any) => item.id === s.id ? s : item);
};

export const deleteStudent = async (id: string) => {
    await supabase.from('students').delete().eq('id', id);
    sessionCache.students = sessionCache.students.filter((s: any) => s.id !== id);
};

export const updateStudentLearningStyle = async (id: string, style: LearningStyle) => {
    await supabase.from('students').update({ learning_style: style }).eq('id', id);
    const s = sessionCache.students.find((std: any) => std.id === id);
    if (s) s.learningStyle = style;
};

// --- الجداول والمواد ---

export const fetchSubjects = async (tid: string): Promise<Subject[]> => {
    const { data } = await supabase.from('subjects').select('*').eq('teacher_id', tid);
    sessionCache.subjects = data || [];
    return sessionCache.subjects;
};

export const getSubjects = (tid?: string): Subject[] => {
    return tid ? sessionCache.subjects.filter((s: any) => s.teacher_id === tid) : sessionCache.subjects;
};

export const addSubject = async (s: Subject) => {
    await supabase.from('subjects').insert({ id: s.id, name: s.name, teacher_id: s.teacherId });
    sessionCache.subjects.push(s);
};

export const deleteSubject = async (id: string) => {
    await supabase.from('subjects').delete().eq('id', id);
    sessionCache.subjects = sessionCache.subjects.filter((s: any) => s.id !== id);
};

export const fetchSchedules = async (tid: string): Promise<ScheduleItem[]> => {
    const { data } = await supabase.from('schedules').select('*').eq('teacher_id', tid);
    sessionCache.schedules = data || [];
    return sessionCache.schedules;
};

export const getSchedules = (tid?: string): ScheduleItem[] => {
    return tid ? sessionCache.schedules.filter((s: any) => s.teacher_id === tid) : sessionCache.schedules;
};

export const saveScheduleItem = async (s: ScheduleItem) => {
    await supabase.from('schedules').upsert({
        id: s.id, class_id: s.classId, subject_name: s.subjectName, day: s.day, period: s.period, teacher_id: s.teacherId
    });
    const idx = sessionCache.schedules.findIndex((x: any) => x.id === s.id);
    if (idx !== -1) sessionCache.schedules[idx] = s; else sessionCache.schedules.push(s);
};

export const deleteScheduleItem = async (id: string) => {
    await supabase.from('schedules').delete().eq('id', id);
    sessionCache.schedules = sessionCache.schedules.filter((s: any) => s.id !== id);
};

export const fetchTeacherAssignments = async (tid: string): Promise<TeacherAssignment[]> => {
    const { data } = await supabase.from('teacher_class_map').select('*').eq('teacher_id', tid);
    sessionCache.assignments = (data || []).map((d: any) => ({
        id: d.id, classId: d.class_id, subjectName: d.subject_name, teacherId: d.teacher_id
    }));
    return sessionCache.assignments;
};

export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => {
    return tid ? sessionCache.assignments.filter((a: any) => a.teacherId === tid) : sessionCache.assignments;
};

export const addTeacherAssignment = async (a: TeacherAssignment) => {
    await supabase.from('teacher_class_map').insert({
        id: a.id, class_id: a.classId, subject_name: a.subjectName, teacher_id: a.teacherId
    });
    sessionCache.assignments.push(a);
};

export const deleteTeacherAssignment = async (id: string) => {
    await supabase.from('teacher_class_map').delete().eq('id', id);
    sessionCache.assignments = sessionCache.assignments.filter((a: any) => a.id !== id);
};

export const fetchAcademicTerms = async (tid: string): Promise<AcademicTerm[]> => {
    const { data } = await supabase.from('academic_terms').select('*').eq('teacher_id', tid);
    sessionCache.academicTerms = (data || []).map((d: any) => ({
        id: d.id, name: d.name, startDate: d.start_date, endDate: d.end_date, isCurrent: d.is_current, teacherId: d.teacher_id,
        periods: d.periods ? (typeof d.periods === 'string' ? JSON.parse(d.periods) : d.periods) : []
    }));
    return sessionCache.academicTerms;
};

export const getAcademicTerms = (tid?: string): AcademicTerm[] => {
    return tid ? sessionCache.academicTerms.filter((t: any) => t.teacherId === tid) : sessionCache.academicTerms;
};

export const saveAcademicTerm = async (t: AcademicTerm) => {
    await supabase.from('academic_terms').upsert({
        id: t.id, name: t.name, start_date: t.startDate, end_date: t.endDate, is_current: t.isCurrent, 
        teacher_id: t.teacherId, periods: JSON.stringify(t.periods || [])
    });
    const idx = sessionCache.academicTerms.findIndex((x: any) => x.id === t.id);
    if (idx !== -1) sessionCache.academicTerms[idx] = t; else sessionCache.academicTerms.push(t);
};

export const deleteAcademicTerm = async (id: string) => {
    await supabase.from('academic_terms').delete().eq('id', id);
    sessionCache.academicTerms = sessionCache.academicTerms.filter((t: any) => t.id !== id);
};

export const setCurrentTerm = async (id: string, tid: string) => {
    await supabase.from('academic_terms').update({ is_current: false }).eq('teacher_id', tid);
    await supabase.from('academic_terms').update({ is_current: true }).eq('id', id);
    sessionCache.academicTerms.forEach((t: any) => { if (t.teacherId === tid) t.isCurrent = t.id === id; });
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

export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    const { data } = await supabase.from('system_users').select('*');
    sessionCache.systemUsers = data || [];
    return sessionCache.systemUsers;
};

export const getSystemUsers = (): SystemUser[] => sessionCache.systemUsers;

export const addSystemUser = async (u: SystemUser) => {
    await supabase.from('system_users').insert(u);
    sessionCache.systemUsers.push(u);
};

// Fix: Add updateSystemUser
export const updateSystemUser = async (u: SystemUser) => {
    await supabase.from('system_users').update(u).eq('id', u.id);
    const idx = sessionCache.systemUsers.findIndex((x: any) => x.id === u.id);
    if (idx !== -1) sessionCache.systemUsers[idx] = u;
};

export const deleteSystemUser = async (id: string) => {
    await supabase.from('system_users').delete().eq('id', id);
    sessionCache.systemUsers = sessionCache.systemUsers.filter((u: any) => u.id !== id);
};

// --- إعدادات النظام (LocalStorage) ---

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

// --- CRUD المدارس والمعلمين ---

export const fetchSchools = async (): Promise<School[]> => {
    const { data } = await supabase.from('schools').select('*');
    sessionCache.schools = data || [];
    return sessionCache.schools;
};

export const getSchools = (): School[] => sessionCache.schools;

export const addSchool = async (s: School) => {
    await supabase.from('schools').insert(s);
    sessionCache.schools.push(s);
};

// Fix: Add updateSchool and deleteSchool
export const updateSchool = async (s: School) => {
    await supabase.from('schools').update(s).eq('id', s.id);
    const idx = sessionCache.schools.findIndex((x: any) => x.id === s.id);
    if (idx !== -1) sessionCache.schools[idx] = s;
};

export const deleteSchool = async (id: string) => {
    await supabase.from('schools').delete().eq('id', id);
    sessionCache.schools = sessionCache.schools.filter((s: any) => s.id !== id);
};

export const fetchTeachers = async (): Promise<Teacher[]> => {
    const { data } = await supabase.from('teachers').select('*');
    sessionCache.teachers = data || [];
    return sessionCache.teachers;
};

export const getTeachers = (): Teacher[] => sessionCache.teachers;

export const addTeacher = async (t: Teacher) => {
    await supabase.from('teachers').insert(t);
    sessionCache.teachers.push(t);
};

export const updateTeacher = async (t: Teacher) => {
    await supabase.from('teachers').update(t).eq('id', t.id);
    const idx = sessionCache.teachers.findIndex((x: any) => x.id === t.id);
    if (idx !== -1) sessionCache.teachers[idx] = t;
};

// --- المهام، السلوك، الرسائل ---

export const fetchTasks = async (tid: string): Promise<Task[]> => {
    const { data } = await supabase.from('tasks').select('*').eq('teacher_id', tid);
    sessionCache.tasks = data || [];
    return sessionCache.tasks;
};

export const getTasks = (tid?: string): Task[] => {
    return tid ? sessionCache.tasks.filter((t: any) => t.teacherId === tid) : sessionCache.tasks;
};

export const saveTask = async (t: Task) => {
    await supabase.from('tasks').upsert(t);
    const idx = sessionCache.tasks.findIndex((x: any) => x.id === t.id);
    if (idx !== -1) sessionCache.tasks[idx] = t; else sessionCache.tasks.push(t);
};

// Fix: Add submitTask
export const submitTask = async (taskId: string, studentId: string) => {
    const task = sessionCache.tasks.find((t: any) => t.id === taskId);
    if (task && !task.submissions.includes(studentId)) {
        task.submissions.push(studentId);
        await supabase.from('tasks').update({ submissions: task.submissions }).eq('id', taskId);
    }
};

export const fetchBehaviorIncidents = async (tid: string): Promise<BehaviorIncident[]> => {
    const { data } = await supabase.from('behavior_incidents').select('*').eq('teacher_id', tid);
    sessionCache.behavior = data || [];
    return sessionCache.behavior;
};

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => {
    return tid ? sessionCache.behavior.filter((b: any) => b.teacherId === tid) : sessionCache.behavior;
};

export const saveBehaviorIncident = async (i: BehaviorIncident) => {
    await supabase.from('behavior_incidents').insert(i);
    sessionCache.behavior.push(i);
};

export const fetchMessages = async (tid: string): Promise<MessageLog[]> => {
    const { data } = await supabase.from('messages').select('*').eq('teacher_id', tid);
    sessionCache.messages = data || [];
    return sessionCache.messages;
};

export const getMessages = (tid?: string): MessageLog[] => {
    return tid ? sessionCache.messages.filter((m: any) => m.teacherId === tid) : sessionCache.messages;
};

export const saveMessage = async (m: MessageLog) => {
    await supabase.from('messages').insert(m);
    sessionCache.messages.push(m);
};

// --- أدوات الرصد المتقدمة (Assignments) ---

export const fetchAssignments = async (tid: string): Promise<Assignment[]> => {
    const { data } = await supabase.from('assignments').select('*').eq('teacher_id', tid);
    sessionCache.assignments_perf = data || [];
    return sessionCache.assignments_perf;
};

export const getAssignments = (category: string = 'ALL', tid?: string, isManager: boolean = false): Assignment[] => {
    let list = isManager ? sessionCache.assignments_perf : sessionCache.assignments_perf.filter((a: any) => a.teacherId === tid);
    if (category !== 'ALL') list = list.filter((a: any) => a.category === category);
    return list;
};

export const saveAssignment = async (a: Assignment) => {
    await supabase.from('assignments').upsert(a);
    const idx = sessionCache.assignments_perf.findIndex((x: any) => x.id === a.id);
    if (idx !== -1) sessionCache.assignments_perf[idx] = a; else sessionCache.assignments_perf.push(a);
};

export const deleteAssignment = async (id: string) => {
    await supabase.from('assignments').delete().eq('id', id);
    sessionCache.assignments_perf = sessionCache.assignments_perf.filter((a: any) => a.id !== id);
};

// --- الجداول المخصصة ---

export const fetchCustomTables = async (tid: string): Promise<CustomTable[]> => {
    const { data } = await supabase.from('custom_tables').select('*').eq('teacher_id', tid);
    sessionCache.customTables = data || [];
    return sessionCache.customTables;
};

export const getCustomTables = (tid?: string): CustomTable[] => {
    return tid ? sessionCache.customTables.filter((t: any) => t.teacherId === tid) : sessionCache.customTables;
};

export const addCustomTable = async (t: CustomTable) => {
    await supabase.from('custom_tables').insert(t);
    sessionCache.customTables.push(t);
};

export const deleteCustomTable = async (id: string) => {
    await supabase.from('custom_tables').delete().eq('id', id);
    sessionCache.customTables = sessionCache.customTables.filter((t: any) => t.id !== id);
};

// --- المنهج والخطط ---

export const fetchCurriculumUnits = async (tid: string): Promise<CurriculumUnit[]> => {
    const { data } = await supabase.from('curriculum_units').select('*').eq('teacher_id', tid);
    sessionCache.curriculumUnits = data || [];
    return sessionCache.curriculumUnits;
};

export const getCurriculumUnits = (tid?: string): CurriculumUnit[] => {
    return tid ? sessionCache.curriculumUnits.filter((u: any) => u.teacher_id === tid) : sessionCache.curriculumUnits;
};

export const saveCurriculumUnit = async (u: CurriculumUnit) => {
    await supabase.from('curriculum_units').upsert(u);
    const idx = sessionCache.curriculumUnits.findIndex((x: any) => x.id === u.id);
    if (idx !== -1) sessionCache.curriculumUnits[idx] = u; else sessionCache.curriculumUnits.push(u);
};

// Fix: Add deleteCurriculumUnit
export const deleteCurriculumUnit = async (id: string) => {
    await supabase.from('curriculum_units').delete().eq('id', id);
    sessionCache.curriculumUnits = sessionCache.curriculumUnits.filter((u: any) => u.id !== id);
};

export const fetchCurriculumLessons = async (): Promise<CurriculumLesson[]> => {
    const { data } = await supabase.from('curriculum_lessons').select('*');
    sessionCache.curriculumLessons = data || [];
    return sessionCache.curriculumLessons;
};

export const getCurriculumLessons = (): CurriculumLesson[] => sessionCache.curriculumLessons;

// Fix: Add saveCurriculumLesson and deleteCurriculumLesson
export const saveCurriculumLesson = async (l: CurriculumLesson) => {
    await supabase.from('curriculum_lessons').upsert(l);
    const idx = sessionCache.curriculumLessons.findIndex((x: any) => x.id === l.id);
    if (idx !== -1) sessionCache.curriculumLessons[idx] = l; else sessionCache.curriculumLessons.push(l);
};

export const deleteCurriculumLesson = async (id: string) => {
    await supabase.from('curriculum_lessons').delete().eq('id', id);
    sessionCache.curriculumLessons = sessionCache.curriculumLessons.filter((l: any) => l.id !== id);
};

export const toggleCurriculumLesson = async (id: string, isCompleted: boolean) => {
    await supabase.from('curriculum_lessons').update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null }).eq('id', id);
    const lesson = sessionCache.curriculumLessons.find((l: any) => l.id === id);
    if (lesson) {
        lesson.isCompleted = isCompleted;
        lesson.completedAt = isCompleted ? new Date().toISOString() : null;
    }
};

// --- Exams ---

// Fix: Add Exam CRUD
export const getExams = (tid?: string): Exam[] => {
    return tid ? sessionCache.exams.filter((e: any) => e.teacherId === tid) : sessionCache.exams;
};

export const saveExam = async (e: Exam) => {
    await supabase.from('exams').upsert(e);
    const idx = sessionCache.exams.findIndex((x: any) => x.id === e.id);
    if (idx !== -1) sessionCache.exams[idx] = e; else sessionCache.exams.push(e);
};

export const deleteExam = async (id: string) => {
    await supabase.from('exams').delete().eq('id', id);
    sessionCache.exams = sessionCache.exams.filter((e: any) => e.id !== id);
};

export const getExamResults = (examId?: string): ExamResult[] => {
    return examId ? sessionCache.examResults.filter((r: any) => r.examId === examId) : sessionCache.examResults;
};

export const saveExamResult = async (r: ExamResult) => {
    await supabase.from('exam_results').upsert(r);
    sessionCache.examResults.push(r);
};

export const deleteExamResult = async (id: string) => {
    await supabase.from('exam_results').delete().eq('id', id);
    sessionCache.examResults = sessionCache.examResults.filter((r: any) => r.id !== id);
};

// --- Question Bank ---

// Fix: Add Question Bank CRUD
export const getQuestionBank = (tid?: string): Question[] => {
    return tid ? sessionCache.questionBank.filter((q: any) => q.teacherId === tid) : sessionCache.questionBank;
};

export const saveQuestionToBank = async (q: Question) => {
    await supabase.from('question_bank').upsert(q);
    const idx = sessionCache.questionBank.findIndex((x: any) => x.id === q.id);
    if (idx !== -1) sessionCache.questionBank[idx] = q; else sessionCache.questionBank.push(q);
};

export const deleteQuestionFromBank = async (id: string) => {
    await supabase.from('question_bank').delete().eq('id', id);
    sessionCache.questionBank = sessionCache.questionBank.filter((q: any) => q.id !== id);
};

// --- Lesson Links & Plans ---

// Fix: Add LessonLink and StoredLessonPlan CRUD
export const getLessonLinks = (): LessonLink[] => sessionCache.lessonLinks;

export const saveLessonLink = async (l: LessonLink) => {
    await supabase.from('lesson_links').upsert(l);
    sessionCache.lessonLinks.push(l);
};

export const deleteLessonLink = async (id: string) => {
    await supabase.from('lesson_links').delete().eq('id', id);
    sessionCache.lessonLinks = sessionCache.lessonLinks.filter((l: any) => l.id !== id);
};

export const getLessonPlans = (tid?: string): StoredLessonPlan[] => {
    return tid ? sessionCache.lessonPlans.filter((p: any) => p.teacherId === tid) : sessionCache.lessonPlans;
};

export const saveLessonPlan = async (p: StoredLessonPlan) => {
    await supabase.from('lesson_plans').upsert(p);
    const idx = sessionCache.lessonPlans.findIndex((x: any) => x.id === p.id);
    if (idx !== -1) sessionCache.lessonPlans[idx] = p; else sessionCache.lessonPlans.push(p);
};

export const deleteLessonPlan = async (id: string) => {
    await supabase.from('lesson_plans').delete().eq('id', id);
    sessionCache.lessonPlans = sessionCache.lessonPlans.filter((p: any) => p.id !== id);
};

// --- Weekly Plans ---

// Fix: Add WeeklyPlanItem CRUD
export const getWeeklyPlans = (tid?: string): WeeklyPlanItem[] => {
    return tid ? sessionCache.weeklyPlans.filter((p: any) => p.teacherId === tid) : sessionCache.weeklyPlans;
};

export const saveWeeklyPlanItem = async (p: WeeklyPlanItem) => {
    await supabase.from('weekly_plans').upsert(p);
    const idx = sessionCache.weeklyPlans.findIndex((x: any) => x.id === p.id);
    if (idx !== -1) sessionCache.weeklyPlans[idx] = p; else sessionCache.weeklyPlans.push(p);
};

// --- Environment Records ---

// Fix: Add EnvironmentRecord CRUD
export const getEnvironmentRecords = (classId?: string): EnvironmentRecord[] => {
    return classId ? sessionCache.environmentRecords.filter((e: any) => e.classId === classId) : sessionCache.environmentRecords;
};

export const saveEnvironmentRecord = async (e: EnvironmentRecord) => {
    await supabase.from('environment_records').insert(e);
    sessionCache.environmentRecords.push(e);
};

// --- Tracking Sheets ---

// Fix: Add TrackingSheet CRUD
export const getTrackingSheets = (tid?: string): TrackingSheet[] => {
    return tid ? sessionCache.trackingSheets.filter((s: any) => s.teacherId === tid) : sessionCache.trackingSheets;
};

export const saveTrackingSheet = async (s: TrackingSheet) => {
    await supabase.from('tracking_sheets').upsert(s);
    const idx = sessionCache.trackingSheets.findIndex((x: any) => x.id === s.id);
    if (idx !== -1) sessionCache.trackingSheets[idx] = s; else sessionCache.trackingSheets.push(s);
};

export const deleteTrackingSheet = async (id: string) => {
    await supabase.from('tracking_sheets').delete().eq('id', id);
    sessionCache.trackingSheets = sessionCache.trackingSheets.filter((s: any) => s.id !== id);
};

// --- Forms Detailed Results ---

// Fix: Add FormsDetailedResult CRUD
export const getFormsDetailedResults = (tid?: string): FormsDetailedResult[] => {
    return tid ? sessionCache.formsDetailedResults.filter((r: any) => r.teacherId === tid) : sessionCache.formsDetailedResults;
};

export const saveFormsDetailedResult = async (r: FormsDetailedResult) => {
    await supabase.from('forms_detailed_results').upsert(r);
    sessionCache.formsDetailedResults.push(r);
};

export const deleteFormsDetailedResult = async (id: string) => {
    await supabase.from('forms_detailed_results').delete().eq('id', id);
    sessionCache.formsDetailedResults = sessionCache.formsDetailedResults.filter((r: any) => r.id !== id);
};

// --- Cloud Utils ---

// Fix: Add cloud management functions for Admin Dashboard
export const fetchCloudTableData = async (table: string): Promise<any[]> => {
    const { data } = await supabase.from(table).select('*').limit(100);
    return data || [];
};

export const clearCloudTable = async (table: string) => {
    await supabase.from(table).delete().neq('id', '0');
};

export const resetCloudDatabase = async () => {
    // This typically requires admin permissions or specialized API.
    // We simulate by clearing known tables.
    for (const table of Object.values(DB_MAP)) {
        await clearCloudTable(table);
    }
};

export const backupCloudDatabase = async (): Promise<string> => {
    const backup: any = {};
    for (const [key, table] of Object.entries(DB_MAP)) {
        const { data } = await supabase.from(table).select('*');
        backup[key] = data;
    }
    return JSON.stringify(backup);
};

export const restoreCloudDatabase = async (json: string) => {
    const backup = JSON.parse(json);
    for (const [key, data] of Object.entries(backup)) {
        const table = (DB_MAP as any)[key];
        if (table && Array.isArray(data)) {
            await supabase.from(table).upsert(data);
        }
    }
};

export const validateCloudSchema = async () => {
    const missingTables = [];
    for (const table of Object.values(DB_MAP)) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error && error.code === '42P01') missingTables.push(table);
    }
    return { missingTables };
};

export const uploadToSupabase = async () => {
    // Placeholder for pushing sessionCache to Supabase
};

export const downloadFromSupabase = async () => {
    // Placeholder for fetching all tables and updating sessionCache
};

export const getDatabaseSchemaSQL = () => `-- Supabase Schema SQL...`;
export const getDatabaseUpdateSQL = () => `-- Supabase Update SQL...`;

export const createBackup = () => JSON.stringify(sessionCache);
export const restoreBackup = (json: string) => { /* Logic */ };

export const setSystemMode = (isCloud: boolean) => { /* Logic */ };
export const initAutoSync = async () => { /* Logic */ };

// --- التفرير الإحصائي المحلي ---

export const getRemedialPlans = (): RemedialPlan[] => {
    const s = localStorage.getItem('remedial_plans');
    return s ? JSON.parse(s) : [];
};

export const saveRemedialPlan = (p: RemedialPlan) => {
    const plans = getRemedialPlans();
    plans.push(p);
    localStorage.setItem('remedial_plans', JSON.stringify(plans));
};

export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

export const clearDatabase = () => {
    localStorage.clear();
    Object.keys(sessionCache).forEach(k => sessionCache[k] = []);
};

export const getTableDisplayName = (table: string) => table;

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('system_users').select('id').limit(1);
        return { success: !error };
    } catch { return { success: false }; }
};
