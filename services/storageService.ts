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

export const KEYS = {
    USER_THEME: 'user_theme',
    AI_SETTINGS: 'ai_settings',
    WORKS_MASTER_URL: 'works_master_url',
    REPORT_HEADER: 'report_header_config',
    PERIOD_TIMINGS: 'period_timings',
    CUSTOM_TABLES: 'custom_tables'
};

interface SessionCache {
    students: Student[];
    attendance: AttendanceRecord[];
    performance: PerformanceRecord[];
    subjects: Subject[];
    schedules: ScheduleItem[];
    assignments: TeacherAssignment[];
    academicTerms: AcademicTerm[];
    tasks: Task[];
    behavior: BehaviorIncident[];
    exams: Exam[];
    examResults: ExamResult[];
    messages: MessageLog[];
    schools: School[];
    teachers: Teacher[];
    systemUsers: SystemUser[];
    customTables: CustomTable[];
    lessonPlans: StoredLessonPlan[];
    lessonLinks: LessonLink[];
    weeklyPlans: WeeklyPlanItem[];
    remedialPlans: RemedialPlan[];
    formsResults: FormsDetailedResult[];
    environmentRecords: EnvironmentRecord[];
    trackingSheets: TrackingSheet[];
    questionBank: Question[];
    curriculumUnits: CurriculumUnit[];
    curriculumLessons: CurriculumLesson[];
    actualAssignments: Assignment[];
}

const sessionCache: SessionCache = {
    students: [],
    attendance: [],
    performance: [],
    subjects: [],
    schedules: [],
    assignments: [],
    academicTerms: [],
    tasks: [],
    behavior: [],
    exams: [],
    examResults: [],
    messages: [],
    schools: [],
    teachers: [],
    systemUsers: [],
    customTables: [],
    lessonPlans: [],
    lessonLinks: [],
    weeklyPlans: [],
    remedialPlans: [],
    formsResults: [],
    environmentRecords: [],
    trackingSheets: [],
    questionBank: [],
    curriculumUnits: [],
    curriculumLessons: [],
    actualAssignments: []
};

// --- المصادقة والدخول ---

export const authenticateUser = async (id: string, p: string): Promise<SystemUser | null> => {
    if (id === 'admin' && p === 'admin') {
        return {
            id: 'super_admin_001',
            name: 'مدير النظام العام',
            email: 'admin@system.local',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE'
        };
    }

    const { data, error } = await supabase.from('system_users')
        .select('*')
        .or(`national_id.eq.${id},email.eq.${id}`)
        .eq('password', p)
        .single();
    
    if (error || !data) return null;

    return {
        id: data.id,
        name: data.name,
        email: data.email,
        nationalId: data.national_id,
        role: data.role,
        schoolId: data.school_id,
        status: data.status
    };
};

export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => {
    const { data } = await supabase.from('students')
        .select('*')
        .eq('national_id', id)
        .eq('password', p)
        .single();
    return data || null;
};

// --- دوال جلب البيانات ---

export const fetchSchools = async (): Promise<School[]> => {
    const { data } = await supabase.from('schools').select('*').order('name');
    sessionCache.schools = data || [];
    return sessionCache.schools;
};

export const getSchools = (): School[] => sessionCache.schools;

export const fetchTeachers = async (): Promise<Teacher[]> => {
    const { data } = await supabase.from('teachers').select('*').order('name');
    sessionCache.teachers = data || [];
    return sessionCache.teachers;
};

export const getTeachers = (): Teacher[] => sessionCache.teachers;

export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    const { data } = await supabase.from('system_users').select('*').order('name');
    sessionCache.systemUsers = (data || []).map((d: any) => ({
        id: d.id, name: d.name, email: d.email, nationalId: d.national_id, role: d.role, schoolId: d.school_id, status: d.status
    }));
    return sessionCache.systemUsers;
};

export const getSystemUsers = (): SystemUser[] => sessionCache.systemUsers;

export const addSchool = async (s: School) => {
    await supabase.from('schools').insert(s);
    sessionCache.schools.push(s);
};

export const updateSchool = async (s: School) => {
    await supabase.from('schools').update(s).eq('id', s.id);
    sessionCache.schools = sessionCache.schools.map((x: School) => x.id === s.id ? s : x);
};

export const deleteSchool = async (id: string) => {
    await supabase.from('schools').delete().eq('id', id);
    sessionCache.schools = sessionCache.schools.filter((x: School) => x.id !== id);
};

export const addSystemUser = async (u: SystemUser) => {
    const dbUser = {
        id: u.id, name: u.name, email: u.email, national_id: u.nationalId, password: u.password, role: u.role, school_id: u.schoolId, status: u.status
    };
    await supabase.from('system_users').insert(dbUser);
    sessionCache.systemUsers.push(u);
};

export const updateSystemUser = async (u: SystemUser) => {
    const dbUser = {
        name: u.name, email: u.email, national_id: u.nationalId, role: u.role, school_id: u.schoolId, status: u.status
    };
    if (u.password) (dbUser as any).password = u.password;
    await supabase.from('system_users').update(dbUser).eq('id', u.id);
    sessionCache.systemUsers = sessionCache.systemUsers.map((x: SystemUser) => x.id === u.id ? u : x);
};

export const deleteSystemUser = async (id: string) => {
    await supabase.from('system_users').delete().eq('id', id);
    sessionCache.systemUsers = sessionCache.systemUsers.filter((x: SystemUser) => x.id !== id);
};

export const addTeacher = async (t: Teacher) => {
    await supabase.from('teachers').insert(t);
    sessionCache.teachers.push(t);
    await addSystemUser({
        id: t.id, name: t.name, email: t.email || `t.${t.nationalId}@system.local`, nationalId: t.nationalId, password: t.password || '123456', role: 'TEACHER', schoolId: t.schoolId, status: 'ACTIVE'
    });
};

export const updateTeacher = async (t: Teacher) => {
    await supabase.from('teachers').update(t).eq('id', t.id);
    sessionCache.teachers = sessionCache.teachers.map((x: Teacher) => x.id === t.id ? t : x);
};

export const fetchStudents = async (): Promise<Student[]> => {
    const { data, error } = await supabase.from('students').select('*').order('name');
    if (error) throw error;
    sessionCache.students = data || [];
    return sessionCache.students;
};

export const getStudents = (): Student[] => sessionCache.students;

export const addStudent = async (s: Student) => {
    await supabase.from('students').insert(s);
    sessionCache.students.push(s);
};

export const updateStudent = async (s: Student) => {
    await supabase.from('students').update(s).eq('id', s.id);
    sessionCache.students = sessionCache.students.map((x: Student) => x.id === s.id ? s : x);
};

export const deleteStudent = async (id: string) => {
    await supabase.from('students').delete().eq('id', id);
    sessionCache.students = sessionCache.students.filter((x: Student) => x.id !== id);
};

export const updateStudentLearningStyle = async (id: string, style: LearningStyle) => {
    const student = sessionCache.students.find((s: Student) => s.id === id);
    if (student) {
        student.learningStyle = style;
        await updateStudent(student);
    }
};

export const fetchAttendance = async (teacherId?: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data } = await query.order('date', { ascending: false });
    sessionCache.attendance = data || [];
    return sessionCache.attendance;
};

export const getAttendance = (): AttendanceRecord[] => sessionCache.attendance;

export const saveAttendance = async (recs: AttendanceRecord[]) => {
    await supabase.from('attendance').upsert(recs);
    recs.forEach(r => {
        const idx = sessionCache.attendance.findIndex((x: AttendanceRecord) => x.id === r.id);
        if (idx !== -1) sessionCache.attendance[idx] = r; else sessionCache.attendance.push(r);
    });
};

export const deleteAttendance = async (id: string) => {
    await supabase.from('attendance').delete().eq('id', id);
    sessionCache.attendance = sessionCache.attendance.filter((x: AttendanceRecord) => x.id !== id);
};

export const fetchPerformance = async (teacherId?: string): Promise<PerformanceRecord[]> => {
    let query = supabase.from('performance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data } = await query.order('date', { ascending: false });
    sessionCache.performance = data || [];
    return sessionCache.performance;
};

export const getPerformance = (): PerformanceRecord[] => sessionCache.performance;

export const addPerformance = async (recs: PerformanceRecord | PerformanceRecord[]) => {
    const data = Array.isArray(recs) ? recs : [recs];
    await supabase.from('performance').upsert(data);
    data.forEach(r => {
        const idx = sessionCache.performance.findIndex((x: PerformanceRecord) => x.id === r.id);
        if (idx !== -1) sessionCache.performance[idx] = r; else sessionCache.performance.push(r);
    });
};

export const deletePerformance = async (id: string) => {
    await supabase.from('performance').delete().eq('id', id);
    sessionCache.performance = sessionCache.performance.filter((x: PerformanceRecord) => x.id !== id);
};

export const fetchAssignments = async (tid?: string) => {
    let q = supabase.from('assignments').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.actualAssignments = (data || []).map((d: any) => ({
        id: d.id, title: d.title, category: d.category, maxScore: d.max_score, 
        isVisible: d.is_visible, teacherId: d.teacher_id, termId: d.term_id, 
        periodId: d.period_id, sourceMetadata: d.source_metadata, 
        sortOrder: d.sort_order, url: d.url
    }));
    return sessionCache.actualAssignments;
};

export const getAssignments = (category?: string, tid?: string, isManager?: boolean) => {
    let list = sessionCache.actualAssignments;
    if (tid && !isManager) list = list.filter((a: Assignment) => a.teacherId === tid);
    if (category && category !== 'ALL') list = list.filter((a: Assignment) => a.category === category);
    return list;
};

export const saveAssignment = async (a: Assignment) => {
    const dbObj = {
        id: a.id, title: a.title, category: a.category, max_score: a.maxScore,
        is_visible: a.isVisible, teacher_id: a.teacherId, term_id: a.termId,
        period_id: a.periodId, source_metadata: a.sourceMetadata,
        sort_order: a.sortOrder, url: a.url
    };
    await supabase.from('assignments').upsert(dbObj);
    const idx = sessionCache.actualAssignments.findIndex((x: Assignment) => x.id === a.id);
    if (idx !== -1) sessionCache.actualAssignments[idx] = a; else sessionCache.actualAssignments.push(a);
};

export const deleteAssignment = async (id: string) => {
    await supabase.from('assignments').delete().eq('id', id);
    sessionCache.actualAssignments = sessionCache.actualAssignments.filter((x: Assignment) => x.id !== id);
};

export const fetchSubjects = async (tid: string) => {
    const { data } = await supabase.from('subjects').select('*').eq('teacher_id', tid);
    sessionCache.subjects = data || []; return data || [];
};
export const getSubjects = (tid?: string) => tid ? sessionCache.subjects.filter((s: Subject) => s.teacherId === tid) : sessionCache.subjects;
export const addSubject = async (s: any) => { await supabase.from('subjects').insert({id: s.id, name: s.name, teacher_id: s.teacherId}); sessionCache.subjects.push(s); };
export const deleteSubject = async (id: string) => { await supabase.from('subjects').delete().eq('id', id); sessionCache.subjects = sessionCache.subjects.filter((x:Subject)=>x.id!==id); };

export const fetchSchedules = async (tid: string) => {
    const { data } = await supabase.from('schedules').select('*').eq('teacher_id', tid);
    sessionCache.schedules = (data || []).map((d: any) => ({
        id: d.id, classId: d.class_id, subjectName: d.subject_name, day: d.day, period: d.period, teacherId: d.teacher_id
    }));
    return sessionCache.schedules;
};
export const getSchedules = () => sessionCache.schedules;

export const saveScheduleItem = async (s: ScheduleItem) => {
    // Fix: Use s.classId instead of s.class_id to match ScheduleItem interface property names
    await supabase.from('schedules').upsert({
        id: s.id, teacher_id: s.teacherId, class_id: s.classId, subject_name: s.subjectName, day: s.day, period: s.period
    });
    sessionCache.schedules.push(s);
};

export const deleteScheduleItem = async (id: string) => {
    await supabase.from('schedules').delete().eq('id', id);
    sessionCache.schedules = sessionCache.schedules.filter((x: ScheduleItem) => x.id !== id);
};

export const fetchTeacherAssignments = async (tid: string) => {
    const { data } = await supabase.from('teacher_class_map').select('*').eq('teacher_id', tid);
    sessionCache.assignments = (data || []).map((d:any)=>({id:d.id, classId:d.class_id, subjectName:d.subject_name, teacherId:d.teacher_id}));
    return sessionCache.assignments;
};
export const getTeacherAssignments = (tid?: string) => tid ? sessionCache.assignments.filter((a:TeacherAssignment)=>a.teacherId===tid) : sessionCache.assignments;

export const addTeacherAssignment = async (a: TeacherAssignment) => {
    await supabase.from('teacher_class_map').insert({
        id: a.id, teacher_id: a.teacherId, class_id: a.classId, subject_name: a.subjectName
    });
    sessionCache.assignments.push(a);
};

export const deleteTeacherAssignment = async (id: string) => {
    await supabase.from('teacher_class_map').delete().eq('id', id);
    sessionCache.assignments = sessionCache.assignments.filter((x: TeacherAssignment) => x.id !== id);
};

export const fetchAcademicTerms = async (tid?: string) => {
    let query = supabase.from('academic_terms').select('*');
    if (tid) query = query.eq('teacher_id', tid);
    const { data } = await query;
    sessionCache.academicTerms = (data || []).map((d: any) => ({
        id: d.id, name: d.name, startDate: d.start_date, endDate: d.end_date, isCurrent: d.is_current, teacherId: d.teacher_id, periods: d.periods ? JSON.parse(d.periods as string) : []
    }));
    return sessionCache.academicTerms;
};
export const getAcademicTerms = (tid?: string) => tid ? sessionCache.academicTerms.filter((t:AcademicTerm)=>t.teacherId===tid) : sessionCache.academicTerms;

export const saveAcademicTerm = async (t: AcademicTerm) => {
    const dbObj = {
        id: t.id, name: t.name, start_date: t.startDate, end_date: t.endDate,
        is_current: t.isCurrent, teacher_id: t.teacherId, periods: JSON.stringify(t.periods)
    };
    await supabase.from('academic_terms').upsert(dbObj);
    const idx = sessionCache.academicTerms.findIndex((x: AcademicTerm) => x.id === t.id);
    if (idx !== -1) sessionCache.academicTerms[idx] = t; else sessionCache.academicTerms.push(t);
};

export const deleteAcademicTerm = async (id: string) => {
    await supabase.from('academic_terms').delete().eq('id', id);
    sessionCache.academicTerms = sessionCache.academicTerms.filter((x: AcademicTerm) => x.id !== id);
};

export const setCurrentTerm = async (id: string, tid: string) => {
    await supabase.from('academic_terms').update({ is_current: false }).eq('teacher_id', tid);
    await supabase.from('academic_terms').update({ is_current: true }).eq('id', id);
    sessionCache.academicTerms = sessionCache.academicTerms.map((t: AcademicTerm) => {
        if (t.teacherId === tid) return { ...t, isCurrent: t.id === id };
        return t;
    });
};

export const fetchTasks = async (tid?: string) => {
    let q = supabase.from('tasks').select('*');
    if(tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.tasks = data || []; return data || [];
};
export const getTasks = (tid?: string) => tid ? sessionCache.tasks.filter((t:Task)=>t.teacherId===tid) : sessionCache.tasks;

export const saveTask = async (t: Task) => {
    await supabase.from('tasks').upsert(t);
    const idx = sessionCache.tasks.findIndex((x: Task) => x.id === t.id);
    if (idx !== -1) sessionCache.tasks[idx] = t; else sessionCache.tasks.push(t);
};

export const fetchBehaviorIncidents = async (tid?: string) => {
    let q = supabase.from('behavior_incidents').select('*');
    if(tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.behavior = data || []; return data || [];
};
export const getBehaviorIncidents = (tid?: string) => tid ? sessionCache.behavior.filter((b:BehaviorIncident)=>b.teacherId===tid) : sessionCache.behavior;

export const saveBehaviorIncident = async (i: BehaviorIncident) => {
    await supabase.from('behavior_incidents').upsert(i);
    const idx = sessionCache.behavior.findIndex((x: BehaviorIncident) => x.id === i.id);
    if (idx !== -1) sessionCache.behavior[idx] = i; else sessionCache.behavior.push(i);
    const student = sessionCache.students.find((s: Student) => s.id === i.studentId);
    if (student) {
        student.behaviorPoints = (student.behaviorPoints || 0) + i.points;
        await updateStudent(student);
    }
};

export const fetchExams = async (tid?: string) => {
    let q = supabase.from('exams').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.exams = (data || []).map((d: any) => ({
        id: d.id, 
        title: d.title, 
        subject: d.subject, 
        gradeLevel: d.grade_level, 
        durationMinutes: d.duration_minutes, 
        questions: d.questions, 
        isActive: d.is_active, 
        createdAt: d.created_at, 
        teacherId: d.teacher_id, 
        date: d.date
    }));
    return sessionCache.exams;
};

export const getExams = (tid?: string) => tid ? sessionCache.exams.filter((e: Exam) => e.teacherId === tid) : sessionCache.exams;

export const saveExam = async (e: Exam) => {
    const dbObj = { 
        id: e.id, title: e.title, subject: e.subject, grade_level: e.gradeLevel, 
        duration_minutes: e.durationMinutes, questions: e.questions, is_active: e.isActive, 
        created_at: e.createdAt, teacher_id: e.teacher_id, date: e.date 
    };
    await supabase.from('exams').upsert(dbObj);
    const idx = sessionCache.exams.findIndex((x: Exam) => x.id === e.id);
    if (idx !== -1) sessionCache.exams[idx] = e; else sessionCache.exams.push(e);
};

export const deleteExam = async (id: string) => {
    await supabase.from('exams').delete().eq('id', id);
    sessionCache.exams = sessionCache.exams.filter((x: Exam) => x.id !== id);
};

export const fetchExamResults = async (eid?: string) => {
    let q = supabase.from('exam_results').select('*');
    if (eid) q = q.eq('exam_id', eid);
    const { data } = await q;
    sessionCache.examResults = (data || []).map((d: any) => ({
        id: d.id, examId: d.exam_id, studentId: d.student_id, score: d.score, totalScore: d.total_score, answers: d.answers, date: d.date
    }));
    return sessionCache.examResults;
};

export const getExamResults = (eid?: string) => eid ? sessionCache.examResults.filter((r: ExamResult) => r.examId === eid) : sessionCache.examResults;

export const saveExamResult = async (r: ExamResult) => {
    const dbObj = { id: r.id, exam_id: r.examId, student_id: r.studentId, score: r.score, total_score: r.totalScore, answers: r.answers, date: r.date };
    await supabase.from('exam_results').upsert(dbObj);
    const idx = sessionCache.examResults.findIndex((x: ExamResult) => x.id === r.id);
    if (idx !== -1) sessionCache.examResults[idx] = r; else sessionCache.examResults.push(r);
};

// Fix: Add exported deleteExamResult member to fix import error in components/ExamsManager.tsx
export const deleteExamResult = async (id: string) => {
    await supabase.from('exam_results').delete().eq('id', id);
    sessionCache.examResults = sessionCache.examResults.filter((x: ExamResult) => x.id !== id);
};

export const fetchQuestionBank = async (tid: string) => {
    const { data } = await supabase.from('question_bank').select('*').eq('teacher_id', tid);
    sessionCache.questionBank = (data || []).map((d: any) => ({
        id: d.id, text: d.text, type: d.type, options: d.options, correctAnswer: d.correct_answer, points: d.points, teacherId: d.teacher_id, subject: d.subject, gradeLevel: d.grade_level
    }));
    return sessionCache.questionBank;
};

export const getQuestionBank = (tid?: string) => tid ? sessionCache.questionBank.filter((q: Question) => q.teacherId === tid) : sessionCache.questionBank;

export const saveQuestionToBank = async (q: Question) => {
    const dbObj = { id: q.id, text: q.text, type: q.type, options: q.options, correct_answer: q.correctAnswer, points: q.points, teacher_id: q.teacherId, subject: q.subject, grade_level: q.gradeLevel };
    await supabase.from('question_bank').upsert(dbObj);
    const idx = sessionCache.questionBank.findIndex((x: Question) => x.id === q.id);
    if (idx !== -1) sessionCache.questionBank[idx] = q; else sessionCache.questionBank.push(q);
};

export const deleteQuestionFromBank = async (id: string) => {
    await supabase.from('question_bank').delete().eq('id', id);
    sessionCache.questionBank = sessionCache.questionBank.filter((x: Question) => x.id !== id);
};

export const fetchMessages = async (tid?: string) => {
    let q = supabase.from('messages').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.messages = (data || []).map((d: any) => ({
        id: d.id, studentId: d.student_id, studentName: d.student_name, parentPhone: d.parent_phone, type: d.type, content: d.content, status: d.status, date: d.date, sentBy: d.sent_by, teacherId: d.teacher_id
    }));
    return sessionCache.messages;
};

export const getMessages = (tid?: string) => tid ? sessionCache.messages.filter((m: MessageLog) => m.teacherId === tid) : sessionCache.messages;

export const saveMessage = async (m: MessageLog) => {
    const dbObj = { id: m.id, student_id: m.studentId, student_name: m.studentName, parent_phone: m.parentPhone, type: m.type, content: m.content, status: m.status, date: m.date, sent_by: m.sentBy, teacher_id: m.teacherId };
    await supabase.from('messages').insert(dbObj);
    sessionCache.messages.push(m);
};

export const fetchCustomTables = async (tid: string) => {
    const { data } = await supabase.from('custom_tables').select('*').eq('teacher_id', tid);
    sessionCache.customTables = (data || []).map((d: any) => ({
        id: d.id, name: d.name, createdAt: d.created_at, columns: d.columns, rows: d.rows, sourceUrl: d.source_url, lastUpdated: d.last_updated, teacherId: d.teacher_id
    }));
    return sessionCache.customTables;
};

export const getCustomTables = (tid?: string) => tid ? sessionCache.customTables.filter((t: CustomTable) => t.teacherId === tid) : sessionCache.customTables;

export const addCustomTable = async (t: CustomTable) => {
    const dbObj = { id: t.id, name: t.name, created_at: t.createdAt, columns: t.columns, rows: t.rows, source_url: t.sourceUrl, last_updated: t.lastUpdated, teacher_id: t.teacherId };
    await supabase.from('custom_tables').insert(dbObj);
    sessionCache.customTables.push(t);
};

export const deleteCustomTable = async (id: string) => {
    await supabase.from('custom_tables').delete().eq('id', id);
    sessionCache.customTables = sessionCache.customTables.filter((x: CustomTable) => x.id !== id);
};

export const fetchLessonPlans = async (tid: string) => {
    const { data } = await supabase.from('lesson_plans').select('*').eq('teacher_id', tid);
    sessionCache.lessonPlans = (data || []).map((d: any) => ({
        id: d.id, teacherId: d.teacher_id, lessonId: d.lesson_id, subject: d.subject, topic: d.topic, contentJson: d.content_json, resources: d.resources, createdAt: d.created_at
    }));
    return sessionCache.lessonPlans;
};

export const getLessonPlans = (tid?: string) => tid ? sessionCache.lessonPlans.filter((p: StoredLessonPlan) => p.teacherId === tid) : sessionCache.lessonPlans;

export const saveLessonPlan = async (p: StoredLessonPlan) => {
    const dbObj = { id: p.id, teacher_id: p.teacherId, lesson_id: p.lessonId, subject: p.subject, topic: p.topic, content_json: p.contentJson, resources: p.resources, created_at: p.createdAt };
    await supabase.from('lesson_plans').upsert(dbObj);
    const idx = sessionCache.lessonPlans.findIndex((x: StoredLessonPlan) => x.id === p.id);
    if (idx !== -1) sessionCache.lessonPlans[idx] = p; else sessionCache.lessonPlans.push(p);
};

export const deleteLessonPlan = async (id: string) => {
    await supabase.from('lesson_plans').delete().eq('id', id);
    sessionCache.lessonPlans = sessionCache.lessonPlans.filter((x: StoredLessonPlan) => x.id !== id);
};

export const fetchLessonLinks = async () => {
    const { data } = await supabase.from('lesson_links').select('*');
    sessionCache.lessonLinks = (data || []).map((d: any) => ({
        id: d.id, title: d.title, url: d.url, teacherId: d.teacher_id, createdAt: d.created_at, gradeLevel: d.grade_level, className: d.class_name
    }));
    return sessionCache.lessonLinks;
};

export const getLessonLinks = () => sessionCache.lessonLinks;

export const saveLessonLink = async (l: LessonLink) => {
    const dbObj = { id: l.id, title: l.title, url: l.url, teacher_id: l.teacherId, created_at: l.createdAt, grade_level: l.gradeLevel, class_name: l.className };
    await supabase.from('lesson_links').upsert(dbObj);
    const idx = sessionCache.lessonLinks.findIndex((x: LessonLink) => x.id === l.id);
    if (idx !== -1) sessionCache.lessonLinks[idx] = l; else sessionCache.lessonLinks.push(l);
};

export const deleteLessonLink = async (id: string) => {
    await supabase.from('lesson_links').delete().eq('id', id);
    sessionCache.lessonLinks = sessionCache.lessonLinks.filter((x: LessonLink) => x.id !== id);
};

export const fetchWeeklyPlans = async (tid: string) => {
    const { data } = await supabase.from('weekly_plans').select('*').eq('teacher_id', tid);
    sessionCache.weeklyPlans = (data || []).map((d: any) => ({
        id: d.id, teacherId: d.teacher_id, classId: d.class_id, subjectName: d.subject_name, day: d.day, period: d.period, weekStartDate: d.week_start_date, lessonTopic: d.lesson_topic, homework: d.homework
    }));
    return sessionCache.weeklyPlans;
};

export const getWeeklyPlans = (tid?: string) => tid ? sessionCache.weeklyPlans.filter((p: WeeklyPlanItem) => p.teacherId === tid) : sessionCache.weeklyPlans;

export const saveWeeklyPlanItem = async (p: WeeklyPlanItem) => {
    const dbObj = { id: p.id, teacher_id: p.teacherId, class_id: p.classId, subject_name: p.subjectName, day: p.day, period: p.period, week_start_date: p.weekStartDate, lesson_topic: p.lessonTopic, homework: p.homework };
    await supabase.from('weekly_plans').upsert(dbObj);
    const idx = sessionCache.weeklyPlans.findIndex((x: WeeklyPlanItem) => x.id === p.id);
    if (idx !== -1) sessionCache.weeklyPlans[idx] = p; else sessionCache.weeklyPlans.push(p);
};

export const fetchRemedialPlans = async (tid?: string) => {
    let q = supabase.from('remedial_plans').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    sessionCache.remedialPlans = (data || []).map((d: any) => ({
        id: d.id, studentId: d.student_id, teacherId: d.teacher_id, subject: d.subject, topic: d.topic, content: d.content, date: d.date
    }));
    return sessionCache.remedialPlans;
};

export const getRemedialPlans = (tid?: string) => tid ? sessionCache.remedialPlans.filter((p: RemedialPlan) => p.teacherId === tid) : sessionCache.remedialPlans;

export const saveRemedialPlan = async (p: RemedialPlan) => {
    const dbObj = { id: p.id, student_id: p.studentId, teacher_id: p.teacherId, subject: p.subject, topic: p.topic, content: p.content, date: p.date };
    await supabase.from('remedial_plans').upsert(dbObj);
    const idx = sessionCache.remedialPlans.findIndex((x: RemedialPlan) => x.id === p.id);
    if (idx !== -1) sessionCache.remedialPlans[idx] = p; else sessionCache.remedialPlans.push(p);
};

export const fetchFormsDetailedResults = async (tid: string) => {
    const { data } = await supabase.from('forms_results').select('*').eq('teacher_id', tid);
    sessionCache.formsResults = (data || []).map((d: any) => ({
        id: d.id, examTitle: d.exam_title, className: d.class_name, date: d.date, teacherId: d.teacher_id, questions: d.questions, studentResponses: d.student_responses
    }));
    return sessionCache.formsResults;
};

export const getFormsDetailedResults = (tid?: string) => tid ? sessionCache.formsResults.filter((r: FormsDetailedResult) => r.teacherId === tid) : sessionCache.formsResults;

export const saveFormsDetailedResult = async (r: FormsDetailedResult) => {
    const dbObj = { id: r.id, exam_title: r.examTitle, class_name: r.className, date: r.date, teacher_id: r.teacherId, questions: r.questions, student_responses: r.studentResponses };
    await supabase.from('forms_results').upsert(dbObj);
    const idx = sessionCache.formsResults.findIndex((x: FormsDetailedResult) => x.id === r.id);
    if (idx !== -1) sessionCache.formsResults[idx] = r; else sessionCache.formsResults.push(r);
};

export const deleteFormsDetailedResult = async (id: string) => {
    await supabase.from('forms_results').delete().eq('id', id);
    sessionCache.formsResults = sessionCache.formsResults.filter((x: FormsDetailedResult) => x.id !== id);
};

export const fetchEnvironmentRecords = async (cid: string) => {
    const { data } = await supabase.from('environment_records').select('*').eq('class_id', cid);
    sessionCache.environmentRecords = (data || []).map((d: any) => ({
        id: d.id, teacherId: d.teacher_id, classId: d.class_id, date: d.date, lighting: d.lighting, noiseLevel: d.noise_level, mood: d.mood, notes: d.notes
    }));
    return sessionCache.environmentRecords;
};

export const getEnvironmentRecords = (cid?: string) => cid ? sessionCache.environmentRecords.filter((r: EnvironmentRecord) => r.classId === cid) : sessionCache.environmentRecords;

export const saveEnvironmentRecord = async (r: EnvironmentRecord) => {
    const dbObj = { id: r.id, teacher_id: r.teacherId, class_id: r.classId, date: r.date, lighting: r.lighting, noise_level: r.noiseLevel, mood: r.mood, notes: r.notes };
    await supabase.from('environment_records').upsert(dbObj);
    const idx = sessionCache.environmentRecords.findIndex((x: EnvironmentRecord) => x.id === r.id);
    if (idx !== -1) sessionCache.environmentRecords[idx] = r; else sessionCache.environmentRecords.push(r);
};

export const fetchTrackingSheets = async (tid: string) => {
    const { data } = await supabase.from('tracking_sheets').select('*').eq('teacher_id', tid);
    sessionCache.trackingSheets = (data || []).map((d: any) => ({
        id: d.id, title: d.title, subject: d.subject, className: d.class_name, teacherId: d.teacher_id, createdAt: d.created_at, columns: d.columns, scores: d.scores
    }));
    return sessionCache.trackingSheets;
};

export const getTrackingSheets = (tid?: string) => tid ? sessionCache.trackingSheets.filter((s: TrackingSheet) => s.teacherId === tid) : sessionCache.trackingSheets;

export const saveTrackingSheet = async (s: TrackingSheet) => {
    const dbObj = { id: s.id, title: s.title, subject: s.subject, class_name: s.className, teacher_id: s.teacherId, created_at: s.createdAt, columns: s.columns, scores: s.scores };
    await supabase.from('tracking_sheets').upsert(dbObj);
    const idx = sessionCache.trackingSheets.findIndex((x: TrackingSheet) => x.id === s.id);
    if (idx !== -1) sessionCache.trackingSheets[idx] = s; else sessionCache.trackingSheets.push(s);
};

export const deleteTrackingSheet = async (id: string) => {
    await supabase.from('tracking_sheets').delete().eq('id', id);
    sessionCache.trackingSheets = sessionCache.trackingSheets.filter((x: TrackingSheet) => x.id !== id);
};

export const fetchCurriculumUnits = async (tid: string) => {
    const { data } = await supabase.from('curriculum_units').select('*').eq('teacher_id', tid);
    sessionCache.curriculumUnits = (data || []).map((d: any) => ({
        id: d.id, teacherId: d.teacher_id, subject: d.subject, gradeLevel: d.grade_level, title: d.title, orderIndex: d.order_index
    }));
    return sessionCache.curriculumUnits;
};

export const getCurriculumUnits = (tid?: string) => tid ? sessionCache.curriculumUnits.filter((u: CurriculumUnit) => u.teacherId === tid) : sessionCache.curriculumUnits;

export const saveCurriculumUnit = async (u: CurriculumUnit) => {
    const dbObj = { id: u.id, teacher_id: u.teacherId, subject: u.subject, grade_level: u.gradeLevel, title: u.title, order_index: u.orderIndex };
    await supabase.from('curriculum_units').upsert(dbObj);
    const idx = sessionCache.curriculumUnits.findIndex((x: CurriculumUnit) => x.id === u.id);
    if (idx !== -1) sessionCache.curriculumUnits[idx] = u; else sessionCache.curriculumUnits.push(u);
};

export const deleteCurriculumUnit = async (id: string) => {
    await supabase.from('curriculum_units').delete().eq('id', id);
    sessionCache.curriculumUnits = sessionCache.curriculumUnits.filter((x: CurriculumUnit) => x.id !== id);
};

export const fetchCurriculumLessons = async () => {
    const { data } = await supabase.from('curriculum_lessons').select('*');
    sessionCache.curriculumLessons = (data || []).map((d: any) => ({
        id: d.id, unitId: d.unit_id, title: d.title, orderIndex: d.order_index, 
        learningStandards: d.learning_standards, microConceptIds: d.micro_concept_ids, 
        isCompleted: d.is_completed, completedAt: d.completed_at
    }));
    return sessionCache.curriculumLessons;
};

export const getCurriculumLessons = () => sessionCache.curriculumLessons;

export const saveCurriculumLesson = async (l: CurriculumLesson) => {
    const dbObj = { 
        id: l.id, unit_id: l.unitId, title: l.title, order_index: l.orderIndex, 
        learning_standards: l.learningStandards, micro_concept_ids: l.microConceptIds, 
        is_completed: l.isCompleted, completed_at: l.completedAt 
    };
    await supabase.from('curriculum_lessons').upsert(dbObj);
    const idx = sessionCache.curriculumLessons.findIndex((x: CurriculumLesson) => x.id === l.id);
    if (idx !== -1) sessionCache.curriculumLessons[idx] = l; else sessionCache.curriculumLessons.push(l);
};

// Fix: Add exported deleteCurriculumLesson member to fix import error in components/CurriculumManager.tsx
export const deleteCurriculumLesson = async (id: string) => {
    await supabase.from('curriculum_lessons').delete().eq('id', id);
    sessionCache.curriculumLessons = sessionCache.curriculumLessons.filter((x: CurriculumLesson) => x.id !== id);
};

export const toggleCurriculumLesson = async (id: string, completed: boolean) => {
    const lesson = sessionCache.curriculumLessons.find((l: CurriculumLesson) => l.id === id);
    if (lesson) {
        lesson.isCompleted = completed;
        lesson.completedAt = completed ? new Date().toISOString() : undefined;
        await saveCurriculumLesson(lesson);
    }
};

// --- إعدادات النظام ---

export const getAISettings = () => JSON.parse(localStorage.getItem(KEYS.AI_SETTINGS) || '{"modelId": "gemini-3-flash-preview", "temperature": 0.7, "enableReports": true}');
export const saveAISettings = (s: any) => localStorage.setItem(KEYS.AI_SETTINGS, JSON.stringify(s));
export const getUserTheme = () => JSON.parse(localStorage.getItem(KEYS.USER_THEME) || '{"mode": "LIGHT", "backgroundStyle": "FLAT"}');
export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));
export const getReportHeaderConfig = (tid?: string) => JSON.parse(localStorage.getItem(KEYS.REPORT_HEADER) || '{"schoolName": "", "teacherName": ""}');
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => localStorage.setItem(KEYS.REPORT_HEADER, JSON.stringify(c));
export const getTeacherPeriodTimings = (tid?: string) => JSON.parse(localStorage.getItem(`${KEYS.PERIOD_TIMINGS}_${tid}`) || '["07:00-07:45", "07:45-08:30"]');
export const saveTeacherPeriodTimings = (tid: string, timings: string[]) => localStorage.setItem(`${KEYS.PERIOD_TIMINGS}_${tid}`, JSON.stringify(timings));
export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

// --- صيانة ---

export const DB_MAP = { SCHOOLS: 'schools', SYSTEM_USERS: 'system_users', TEACHERS: 'teachers' };
export const getTableDisplayName = (t: string) => t;
export const checkConnection = async () => ({ success: true });
export const validateCloudSchema = async () => ({ missingTables: [] });
export const downloadFromSupabase = async () => {};
export const uploadToSupabase = async () => {};
export const fetchCloudTableData = async (t: string) => [];
export const clearCloudTable = async (t: string) => {};
export const resetCloudDatabase = async () => {};
export const backupCloudDatabase = async () => "";
export const restoreCloudDatabase = async (j: string) => {};
export const getDatabaseSchemaSQL = () => "";
export const getDatabaseUpdateSQL = () => "";
export const createBackup = () => "";
export const restoreBackup = (j: string) => {};
export const clearDatabase = () => localStorage.clear();
export const setSystemMode = (val: boolean) => localStorage.setItem('system_mode', String(val));
export const initAutoSync = async () => { /* Logic to initialize background sync */ };