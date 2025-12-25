
import { 
    Student, AttendanceRecord, PerformanceRecord, Teacher, School, 
    SystemUser, Subject, ScheduleItem, TeacherAssignment, 
    AcademicTerm, WeeklyPlanItem, LessonLink, StoredLessonPlan,
    Exam, ReportHeaderConfig, UserTheme, 
    CustomTable, EnvironmentRecord, LearningStyle, CurriculumUnit, 
    CurriculumLesson, Question, ExamResult, TrackingSheet, RemedialPlan,
    MessageLog, FormsDetailedResult, BehaviorIncident, Task, Assignment,
    AttendanceStatus
} from '../types';
import { supabase } from './supabaseClient';

// مفاتيح الإعدادات المحلية فقط (الثيم والخيارات البصرية)
export const KEYS = {
    USER_THEME: 'user_theme',
    REPORT_HEADER: 'report_header_config',
    PERIOD_TIMINGS: 'period_timings',
    WORKS_MASTER_URL: 'works_master_url'
};

// --- المصادقة ---

export const authenticateUser = async (id: string, p: string): Promise<SystemUser | null> => {
    try {
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
            role: data.role as any,
            schoolId: data.school_id,
            status: data.status as any,
            phone: data.phone
        };
    } catch (e) {
        return null;
    }
};

export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => {
    try {
        const { data } = await supabase.from('students').select('*').eq('national_id', id).eq('password', p).single();
        if (!data) return null;
        return {
            id: data.id, 
            name: data.name, 
            role: 'STUDENT', 
            nationalId: data.national_id, 
            classId: data.class_id, 
            className: data.class_name, 
            gradeLevel: data.grade_level, 
            schoolId: data.school_id
        } as Student;
    } catch { return null; }
};

// --- جلب البيانات السحابية مباشرة ---

export const fetchSchools = async (): Promise<School[]> => {
    const { data } = await supabase.from('schools').select('*').order('name');
    return (data || []).map((d: any) => ({
        id: d.id, 
        name: d.name, 
        ministryCode: d.ministry_code, 
        managerName: d.manager_name,
        managerNationalId: d.manager_national_id, 
        type: d.type, 
        phone: d.phone,
        studentCount: d.student_count || 0, 
        educationAdministration: d.education_administration
    }));
};

export const fetchTeachers = async (): Promise<Teacher[]> => {
    const { data } = await supabase.from('teachers').select('*').order('name');
    return (data || []).map((d: any) => ({
        id: d.id, 
        name: d.name, 
        nationalId: d.national_id, 
        email: d.email, 
        phone: d.phone,
        subjectSpecialty: d.subject_specialty, 
        schoolId: d.school_id, 
        managerId: d.manager_id,
        subscriptionStatus: d.subscription_status, 
        subscriptionEndDate: d.subscription_end_date
    }));
};

export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    const { data } = await supabase.from('system_users').select('*').order('role');
    return (data || []).map((d: any) => ({
        id: d.id, 
        name: d.name, 
        email: d.email, 
        nationalId: d.national_id, 
        role: d.role, 
        schoolId: d.school_id, 
        status: d.status,
        phone: d.phone
    }));
};

export const fetchStudents = async (): Promise<Student[]> => {
    const { data } = await supabase.from('students').select('*').order('name');
    return (data || []).map((d: any) => ({
        id: d.id, 
        name: d.name, 
        role: 'STUDENT' as const, 
        nationalId: d.national_id, 
        classId: d.class_id,
        schoolId: d.school_id, 
        createdById: d.created_by_id, 
        gradeLevel: d.grade_level,
        className: d.class_name, 
        email: d.email, 
        phone: d.phone, 
        parentName: d.parent_name,
        parentPhone: d.parent_phone, 
        parentEmail: d.parent_email, 
        learningStyle: d.learning_style,
        behaviorPoints: d.behavior_points || 0, 
        seatIndex: d.seat_index
    })) as Student[];
};

export const fetchAttendance = async (teacherId?: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data } = await query.order('date', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, 
        studentId: d.student_id, 
        date: d.date, 
        status: d.status,
        subject: d.subject, 
        period: d.period, 
        behaviorStatus: d.behavior_status,
        behaviorNote: d.behavior_note, 
        participationScore: d.participation_score,
        excuseNote: d.excuse_note, 
        createdById: d.created_by_id
    }));
};

export const fetchPerformance = async (teacherId?: string): Promise<PerformanceRecord[]> => {
    let query = supabase.from('performance').select('*');
    if (teacherId) query = query.eq('created_by_id', teacherId);
    const { data } = await query.order('date', { ascending: false });
    return (data || []).map((d: any) => ({
        id: d.id, 
        studentId: d.student_id, 
        subject: d.subject, 
        title: d.title,
        category: d.category, 
        score: d.score, 
        maxScore: d.max_score, 
        date: d.date,
        notes: d.notes, 
        createdById: d.created_by_id, 
        url: d.url
    }));
};

// --- حفظ البيانات السحابية ---

export const saveAttendance = async (recs: AttendanceRecord[]) => {
    const dbObjs = recs.map(r => ({
        id: r.id, 
        student_id: r.studentId, 
        date: r.date, 
        status: r.status,
        subject: r.subject, 
        period: r.period, 
        behavior_status: r.behaviorStatus,
        behavior_note: r.behaviorNote, 
        participation_score: r.participationScore,
        excuse_note: r.excuseNote, 
        created_by_id: r.createdById
    }));
    return await supabase.from('attendance').upsert(dbObjs);
};

export const addPerformance = async (recs: PerformanceRecord | PerformanceRecord[]) => {
    const items = Array.isArray(recs) ? recs : [recs];
    const dbObjs = items.map(r => ({
        id: r.id, 
        student_id: r.studentId, 
        subject: r.subject, 
        title: r.title,
        category: r.category, 
        score: r.score, 
        max_score: r.maxScore, 
        date: r.date,
        notes: r.notes, 
        created_by_id: r.createdById, 
        url: r.url
    }));
    return await supabase.from('performance').upsert(dbObjs);
};

// --- دوال حذف البيانات ---
export const deleteStudent = async (id: string) => await supabase.from('students').delete().eq('id', id);
export const deleteAttendance = async (id: string) => await supabase.from('attendance').delete().eq('id', id);
export const deletePerformance = async (id: string) => await supabase.from('performance').delete().eq('id', id);

// --- إدارة الفصول والمواد ---

export const addStudent = async (s: Student) => {
    return await supabase.from('students').insert({
        id: s.id, name: s.name, national_id: s.nationalId, class_id: s.classId,
        school_id: s.schoolId, created_by_id: s.createdById, grade_level: s.gradeLevel,
        class_name: s.className, email: s.email, phone: s.phone,
        parent_name: s.parentName, parent_phone: s.parentPhone, parent_email: s.parentEmail,
        password: s.password || '123456', seat_index: s.seatIndex, 
        learning_style: s.learningStyle, behavior_points: s.behaviorPoints
    });
};

export const updateStudent = async (s: Student) => {
    return await supabase.from('students').update({
        name: s.name, national_id: s.nationalId, grade_level: s.gradeLevel,
        class_name: s.className, phone: s.phone, parent_name: s.parentName,
        parent_phone: s.parentPhone, learning_style: s.learningStyle,
        behavior_points: s.behaviorPoints, seat_index: s.seatIndex
    }).eq('id', s.id);
};

export const fetchSchedules = async (tid: string): Promise<ScheduleItem[]> => {
    const { data } = await supabase.from('schedules').select('*').eq('teacher_id', tid);
    return (data || []).map((d: any) => ({
        id: d.id, 
        classId: d.class_id, 
        subjectName: d.subject_name, 
        day: d.day as any,
        period: d.period, 
        teacherId: d.teacher_id
    }));
};

export const fetchTeacherAssignments = async (tid: string): Promise<TeacherAssignment[]> => {
    const { data } = await supabase.from('teacher_class_map').select('*').eq('teacher_id', tid);
    return (data || []).map((d: any) => ({
        id: d.id, 
        classId: d.class_id, 
        subjectName: d.subject_name, 
        teacherId: d.teacher_id
    }));
};

export const fetchAcademicTerms = async (tid?: string): Promise<AcademicTerm[]> => {
    let query = supabase.from('academic_terms').select('*');
    if (tid) query = query.eq('teacher_id', tid);
    const { data } = await query;
    return (data || []).map((d: any) => ({
        id: d.id, 
        name: d.name, 
        startDate: d.start_date, 
        endDate: d.end_date,
        isCurrent: d.is_current, 
        teacherId: d.teacher_id,
        periods: d.periods ? (typeof d.periods === 'string' ? JSON.parse(d.periods) : d.periods) : []
    }));
};

export const fetchSubjects = async (tid: string): Promise<Subject[]> => {
    const { data } = await supabase.from('subjects').select('*').eq('teacher_id', tid);
    return (data || []).map((d: any) => ({ 
        id: d.id, 
        name: d.name, 
        teacherId: d.teacher_id 
    }));
};

export const fetchTasks = async (tid?: string): Promise<Task[]> => {
    let q = supabase.from('tasks').select('*');
    if(tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    return (data || []).map((d: any) => ({
        id: d.id, 
        teacherId: d.teacher_id, 
        classId: d.class_id, 
        subject: d.subject,
        title: d.title, 
        description: d.description, 
        dueDate: d.due_date,
        type: d.type, 
        maxScore: d.max_score, 
        submissions: d.submissions || []
    }));
};

export const fetchBehaviorIncidents = async (tid?: string): Promise<BehaviorIncident[]> => {
    let q = supabase.from('behavior_incidents').select('*');
    if(tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    return (data || []).map((d: any) => ({
        id: d.id, 
        studentId: d.student_id, 
        teacherId: d.teacher_id, 
        type: d.type,
        category: d.category, 
        points: d.points, 
        date: d.date, 
        note: d.note, 
        actionTaken: d.action_taken
    }));
};

export const fetchMessages = async (tid?: string): Promise<MessageLog[]> => {
    let q = supabase.from('messages').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    return (data || []).map((d: any) => ({
        id: d.id, 
        studentId: d.student_id, 
        studentName: d.student_name,
        parentPhone: d.parent_phone, 
        type: d.type, 
        content: d.content,
        status: d.status, 
        date: d.date, 
        sentBy: d.sent_by, 
        teacherId: d.teacher_id
    }));
};

export const fetchCustomTables = async (tid: string): Promise<CustomTable[]> => {
    const { data } = await supabase.from('custom_tables').select('*').eq('teacher_id', tid);
    return (data || []).map((d: any) => ({
        id: d.id, 
        name: d.name, 
        createdAt: d.created_at, 
        columns: typeof d.columns === 'string' ? JSON.parse(d.columns) : d.columns, 
        rows: typeof d.rows === 'string' ? JSON.parse(d.rows) : d.rows,
        sourceUrl: d.source_url, 
        lastUpdated: d.last_updated, 
        teacherId: d.teacher_id
    }));
};

export const fetchCurriculumUnits = async (tid?: string): Promise<CurriculumUnit[]> => {
    let q = supabase.from('curriculum_units').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q.order('order_index');
    return (data || []).map((d: any) => ({
        id: d.id, 
        teacherId: d.teacher_id, 
        subject: d.subject, 
        gradeLevel: d.grade_level, 
        title: d.title, 
        orderIndex: d.order_index
    }));
};

export const fetchCurriculumLessons = async (unitId?: string): Promise<CurriculumLesson[]> => {
    let q = supabase.from('curriculum_lessons').select('*');
    if (unitId) q = q.eq('unit_id', unitId);
    const { data } = await q.order('order_index');
    return (data || []).map((d: any) => ({
        id: d.id, 
        unitId: d.unit_id, 
        title: d.title, 
        orderIndex: d.order_index, 
        learningStandards: typeof d.learning_standards === 'string' ? JSON.parse(d.learning_standards) : d.learning_standards,
        microConceptIds: typeof d.micro_concept_ids === 'string' ? JSON.parse(d.micro_concept_ids) : d.micro_concept_ids,
        isCompleted: d.is_completed, 
        completedAt: d.completed_at
    }));
};

export const fetchExams = async (tid?: string): Promise<Exam[]> => {
    let q = supabase.from('exams').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    return (data || []).map((d: any) => ({
        id: d.id, 
        title: d.title, 
        subject: d.subject, 
        gradeLevel: d.grade_level,
        durationMinutes: d.duration_minutes, 
        questions: typeof d.questions === 'string' ? JSON.parse(d.questions) : d.questions, 
        isActive: d.is_active, 
        createdAt: d.created_at, 
        teacherId: d.teacher_id, 
        date: d.date
    }));
};

export const fetchQuestionBank = async (tid?: string): Promise<Question[]> => {
    let q = supabase.from('question_bank').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    return (data || []).map((d: any) => ({
        id: d.id, 
        text: d.text, 
        type: d.type as any, 
        options: typeof d.options === 'string' ? JSON.parse(d.options) : d.options, 
        correctAnswer: d.correct_answer, 
        points: d.points, 
        teacherId: d.teacher_id, 
        subject: d.subject, 
        gradeLevel: d.grade_level
    }));
};

export const fetchFormsDetailedResults = async (tid?: string): Promise<FormsDetailedResult[]> => {
    let q = supabase.from('forms_results').select('*');
    if (tid) q = q.eq('teacher_id', tid);
    const { data } = await q;
    return (data || []).map((d: any) => ({
        id: d.id, 
        examTitle: d.exam_title, 
        className: d.class_name, 
        date: d.date, 
        teacherId: d.teacher_id, 
        questions: typeof d.questions === 'string' ? JSON.parse(d.questions) : d.questions,
        studentResponses: typeof d.student_responses === 'string' ? JSON.parse(d.student_responses) : d.student_responses
    }));
};

export const fetchAssignments = async (cat?: string, tid?: string): Promise<Assignment[]> => {
    let query = supabase.from('assignments').select('*');
    if (cat && cat !== 'ALL') query = query.eq('category', cat);
    if (tid) query = query.eq('teacher_id', tid);
    const { data } = await query;
    return (data || []).map((d: any) => ({
        id: d.id, 
        title: d.title, 
        category: d.category, 
        maxScore: d.max_score, 
        isVisible: d.is_visible,
        teacherId: d.teacher_id, 
        termId: d.term_id, 
        periodId: d.period_id, 
        sourceMetadata: d.source_metadata,
        sortOrder: d.sort_order, 
        url: d.url
    }));
};

// --- وظائف مساعدة للإعدادات المحلية ---
export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem(KEYS.USER_THEME) || '{"mode": "LIGHT", "backgroundStyle": "FLAT"}');
export const saveUserTheme = (theme: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(theme));

export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => {
    const key = tid ? `${KEYS.REPORT_HEADER}_${tid}` : KEYS.REPORT_HEADER;
    return JSON.parse(localStorage.getItem(key) || localStorage.getItem(KEYS.REPORT_HEADER) || '{"schoolName": "", "educationAdmin": "", "teacherName": "", "schoolManager": "", "academicYear": "", "term": ""}');
};

export const getTeacherPeriodTimings = (tid: string): string[] => JSON.parse(localStorage.getItem(`${KEYS.PERIOD_TIMINGS}_${tid}`) || '["07:00-07:45", "07:45-08:30", "08:30-09:15", "09:45-10:30", "10:30-11:15", "11:15-12:00"]');

// التوافق مع الكود القديم
export const setSystemMode = (mode: boolean) => {};
export const getStudents = (): Student[] => {
    const saved = localStorage.getItem('local_students');
    return saved ? JSON.parse(saved) : [];
};
export const downloadFromSupabase = async () => ({ success: true });
export const initAutoSync = async () => {};

export const getAssignments = (cat?: string, tid?: string, isManager?: boolean): Assignment[] => {
    const saved = localStorage.getItem(`local_assignments_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveAssignment = async (a: Assignment) => {
    const key = `local_assignments_${a.teacherId || 'global'}`;
    const current = getAssignments('ALL', a.teacherId);
    const updated = current.filter(x => x.id !== a.id);
    updated.push(a);
    localStorage.setItem(key, JSON.stringify(updated));
    return await supabase.from('assignments').upsert({
        id: a.id, 
        title: a.title, 
        category: a.category, 
        max_score: a.maxScore, 
        is_visible: a.isVisible,
        teacher_id: a.teacherId, 
        term_id: a.termId, 
        period_id: a.periodId, 
        source_metadata: a.sourceMetadata,
        sort_order: a.sortOrder, 
        url: a.url
    });
};

export const deleteAssignment = async (id: string) => await supabase.from('assignments').delete().eq('id', id);

export const getMessages = (tid?: string): MessageLog[] => {
    const saved = localStorage.getItem(`local_messages_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveMessage = async (m: MessageLog) => {
    const key = `local_messages_${m.teacherId || 'global'}`;
    const current = getMessages(m.teacherId);
    current.push(m);
    localStorage.setItem(key, JSON.stringify(current));
    return await supabase.from('messages').insert({
        id: m.id, 
        student_id: m.studentId, 
        student_name: m.studentName,
        parent_phone: m.parentPhone, 
        type: m.type, 
        content: m.content,
        status: m.status, 
        date: m.date, 
        sent_by: m.sentBy, 
        teacher_id: m.teacherId
    });
};

export const getSubjects = (tid?: string): Subject[] => {
    const saved = localStorage.getItem(`local_subjects_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const addSubject = async (s: Subject) => {
    const key = `local_subjects_${s.teacherId || 'global'}`;
    const current = getSubjects(s.teacherId);
    current.push(s);
    localStorage.setItem(key, JSON.stringify(current));
    return await supabase.from('subjects').insert({ id: s.id, name: s.name, teacher_id: s.teacherId });
};

export const deleteSubject = async (id: string) => await supabase.from('subjects').delete().eq('id', id);

export const getAcademicTerms = (tid?: string): AcademicTerm[] => {
    const saved = localStorage.getItem(`local_terms_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveAcademicTerm = async (t: AcademicTerm) => {
    const key = `local_terms_${t.teacherId || 'global'}`;
    const current = getAcademicTerms(t.teacherId);
    const updated = current.filter((x: any) => x.id !== t.id);
    updated.push(t);
    localStorage.setItem(key, JSON.stringify(updated));
    return await supabase.from('academic_terms').upsert({
        id: t.id, 
        name: t.name, 
        start_date: t.startDate, 
        end_date: t.endDate,
        is_current: t.isCurrent, 
        teacher_id: t.teacherId,
        periods: JSON.stringify(t.periods || [])
    });
};

export const deleteAcademicTerm = async (id: string) => await supabase.from('academic_terms').delete().eq('id', id);

export const setCurrentTerm = async (id: string, tid: string) => {
    await supabase.from('academic_terms').update({ is_current: false }).eq('teacher_id', tid);
    return await supabase.from('academic_terms').update({ is_current: true }).eq('id', id);
};

export const getSchedules = (tid?: string): ScheduleItem[] => {
    const saved = localStorage.getItem(`local_schedules_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveScheduleItem = async (s: ScheduleItem) => {
    const key = `local_schedules_${s.teacherId || 'global'}`;
    const current = getSchedules(s.teacherId);
    current.push(s);
    localStorage.setItem(key, JSON.stringify(current));
    return await supabase.from('schedules').upsert({
        id: s.id, 
        class_id: s.classId, 
        subject_name: s.subjectName, 
        day: s.day,
        period: s.period, 
        teacher_id: s.teacherId
    });
};

export const deleteScheduleItem = async (id: string) => await supabase.from('schedules').delete().eq('id', id);

export const getTasks = (tid?: string): Task[] => {
    const saved = localStorage.getItem(`local_tasks_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveTask = async (t: Task) => {
    const key = `local_tasks_${t.teacherId || 'global'}`;
    const current = getTasks(t.teacherId);
    current.push(t);
    localStorage.setItem(key, JSON.stringify(current));
    return await supabase.from('tasks').upsert({
        id: t.id, 
        teacher_id: t.teacherId, 
        class_id: t.classId, 
        subject: t.subject,
        title: t.title, 
        description: t.description, 
        due_date: t.dueDate,
        type: t.type, 
        max_score: t.maxScore, 
        submissions: t.submissions || []
    });
};

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => {
    const saved = localStorage.getItem(`local_behavior_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveBehaviorIncident = async (i: BehaviorIncident) => {
    const key = `local_behavior_${i.teacherId || 'global'}`;
    const current = getBehaviorIncidents(i.teacherId);
    current.push(i);
    localStorage.setItem(key, JSON.stringify(current));
    return await supabase.from('behavior_incidents').insert({
        id: i.id, 
        student_id: i.studentId, 
        teacher_id: i.teacherId, 
        type: i.type,
        category: i.category, 
        points: i.points, 
        date: i.date, 
        note: i.note, 
        action_taken: i.actionTaken
    });
};

export const getExams = (tid?: string): Exam[] => {
    const saved = localStorage.getItem(`local_exams_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveExam = async (e: Exam) => {
    const key = `local_exams_${e.teacherId || 'global'}`;
    const current = getExams(e.teacherId);
    const updated = current.filter((x: any) => x.id !== e.id);
    updated.push(e);
    localStorage.setItem(key, JSON.stringify(updated));
    return await supabase.from('exams').upsert({
        id: e.id, 
        title: e.title, 
        subject: e.subject, 
        grade_level: e.gradeLevel,
        duration_minutes: e.durationMinutes, 
        questions: JSON.stringify(e.questions), 
        is_active: e.isActive, 
        teacher_id: e.teacherId, 
        date: e.date
    });
};

export const deleteExam = async (id: string) => await supabase.from('exams').delete().eq('id', id);

export const getExamResults = (eid?: string): ExamResult[] => {
    const saved = localStorage.getItem('local_exam_results');
    const results = saved ? JSON.parse(saved) : [];
    if (eid) return results.filter((r: any) => r.examId === eid);
    return results;
};

export const deleteExamResult = async (id: string) => await supabase.from('exam_results').delete().eq('id', id);

export const getCustomTables = (tid?: string): CustomTable[] => {
    const saved = localStorage.getItem(`local_custom_tables_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const addCustomTable = async (t: CustomTable) => {
    const key = `local_custom_tables_${t.teacherId || 'global'}`;
    const current = getCustomTables(t.teacherId);
    current.push(t);
    localStorage.setItem(key, JSON.stringify(current));
    return await supabase.from('custom_tables').insert({
        id: t.id, 
        name: t.name, 
        columns: JSON.stringify(t.columns), 
        rows: JSON.stringify(t.rows),
        source_url: t.sourceUrl, 
        last_updated: t.lastUpdated, 
        teacher_id: t.teacherId
    });
};

export const deleteCustomTable = async (id: string) => await supabase.from('custom_tables').delete().eq('id', id);

export const getQuestionBank = (tid?: string): Question[] => {
    const saved = localStorage.getItem(`local_qbank_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveQuestionToBank = async (q: Question) => {
    const key = `local_qbank_${q.teacherId || 'global'}`;
    const current = getQuestionBank(q.teacherId);
    current.push(q);
    localStorage.setItem(key, JSON.stringify(current));
    return await supabase.from('question_bank').insert({
        id: q.id, 
        text: q.text, 
        type: q.type, 
        options: JSON.stringify(q.options), 
        correct_answer: q.correctAnswer, 
        points: q.points, 
        teacher_id: q.teacherId, 
        subject: q.subject, 
        grade_level: q.gradeLevel
    });
};

export const deleteQuestionFromBank = async (id: string) => await supabase.from('question_bank').delete().eq('id', id);

export const getLessonPlans = (tid?: string): StoredLessonPlan[] => {
    const saved = localStorage.getItem(`local_lesson_plans_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveLessonPlan = async (p: StoredLessonPlan) => {
    const key = `local_lesson_plans_${p.teacherId || 'global'}`;
    const current = getLessonPlans(p.teacherId);
    current.push(p);
    localStorage.setItem(key, JSON.stringify(current));
    return await supabase.from('lesson_plans').upsert({
        id: p.id, 
        teacher_id: p.teacherId, 
        subject: p.subject, 
        topic: p.topic, 
        content_json: p.contentJson, 
        resources: JSON.stringify(p.resources), 
        created_at: p.createdAt
    });
};

export const deleteLessonPlan = async (id: string) => await supabase.from('lesson_plans').delete().eq('id', id);

export const getLessonLinks = (): LessonLink[] => {
    const saved = localStorage.getItem('local_lesson_links');
    return saved ? JSON.parse(saved) : [];
};

export const saveLessonLink = async (l: LessonLink) => {
    const current = getLessonLinks();
    current.push(l);
    localStorage.setItem('local_lesson_links', JSON.stringify(current));
    return await supabase.from('lesson_links').insert({
        id: l.id, 
        title: l.title, 
        url: l.url, 
        teacher_id: l.teacherId,
        grade_level: l.gradeLevel, 
        class_name: l.className
    });
};

export const deleteLessonLink = async (id: string) => await supabase.from('lesson_links').delete().eq('id', id);

export const getWeeklyPlans = (tid?: string): WeeklyPlanItem[] => {
    const saved = localStorage.getItem(`local_weekly_plans_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveWeeklyPlanItem = async (p: WeeklyPlanItem) => {
    const key = `local_weekly_plans_${p.teacherId || 'global'}`;
    const current = getWeeklyPlans(p.teacherId);
    const updated = current.filter((x: any) => x.id !== p.id);
    updated.push(p);
    localStorage.setItem(key, JSON.stringify(updated));
    return await supabase.from('weekly_plans').upsert({
        id: p.id, 
        teacher_id: p.teacherId, 
        class_id: p.classId, 
        subject_name: p.subjectName,
        day: p.day, 
        period: p.period, 
        week_start_date: p.weekStartDate,
        lesson_topic: p.lessonTopic, 
        homework: p.homework
    });
};

export const getEnvironmentRecords = (cid?: string): EnvironmentRecord[] => {
    const saved = localStorage.getItem('local_env_records');
    const records = saved ? JSON.parse(saved) : [];
    if (cid) return records.filter((r: any) => r.classId === cid);
    return records;
};

export const saveEnvironmentRecord = async (r: EnvironmentRecord) => {
    const current = getEnvironmentRecords();
    current.push(r);
    localStorage.setItem('local_env_records', JSON.stringify(current));
    return await supabase.from('environment_records').insert({
        id: r.id, 
        teacher_id: r.teacherId, 
        class_id: r.classId, 
        date: r.date,
        lighting: r.lighting, 
        noise_level: r.noiseLevel, 
        mood: r.mood, 
        notes: r.notes
    });
};

export const getTrackingSheets = (tid?: string): TrackingSheet[] => {
    const saved = localStorage.getItem(`local_tracking_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveTrackingSheet = async (s: TrackingSheet) => {
    const key = `local_tracking_${s.teacherId || 'global'}`;
    const current = getTrackingSheets(s.teacherId);
    const updated = current.filter((x: any) => x.id !== s.id);
    updated.push(s);
    localStorage.setItem(key, JSON.stringify(updated));
    return await supabase.from('tracking_sheets').upsert({
        id: s.id, 
        title: s.title, 
        subject: s.subject, 
        class_name: s.className,
        teacher_id: s.teacherId, 
        created_at: s.createdAt,
        columns: JSON.stringify(s.columns), 
        scores: JSON.stringify(s.scores)
    });
};

export const deleteTrackingSheet = async (id: string) => await supabase.from('tracking_sheets').delete().eq('id', id);

export const getRemedialPlans = (): RemedialPlan[] => {
    const saved = localStorage.getItem('local_remedial_plans');
    return saved ? JSON.parse(saved) : [];
};

export const saveRemedialPlan = async (p: RemedialPlan) => {
    const current = getRemedialPlans();
    current.push(p);
    localStorage.setItem('local_remedial_plans', JSON.stringify(current));
    return await supabase.from('remedial_plans').insert({
        id: p.id, 
        student_id: p.studentId, 
        teacher_id: p.teacherId,
        subject: p.subject, 
        topic: p.topic, 
        content: p.content, 
        date: p.date
    });
};

export const getFormsDetailedResults = (tid?: string): FormsDetailedResult[] => {
    const saved = localStorage.getItem(`local_forms_results_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveFormsDetailedResult = async (r: FormsDetailedResult) => {
    const key = `local_forms_results_${r.teacherId || 'global'}`;
    const current = getFormsDetailedResults(r.teacherId);
    current.push(r);
    localStorage.setItem(key, JSON.stringify(current));
    return await supabase.from('forms_results').insert({
        id: r.id, 
        exam_title: r.examTitle, 
        class_name: r.className, 
        date: r.date,
        teacher_id: r.teacherId, 
        questions: JSON.stringify(r.questions),
        student_responses: JSON.stringify(r.studentResponses)
    });
};

export const deleteFormsDetailedResult = async (id: string) => await supabase.from('forms_results').delete().eq('id', id);

export const getAISettings = () => ({
    modelId: 'gemini-3-flash-preview', 
    temperature: 0.7, 
    enableReports: true,
    systemInstruction: "أنت مساعد تعليمي ذكي خبير في علم النفس التربوي ونموذج VARK. مهمتك تحليل استجابات الطلاب بدقة وتطوير خطط دعم تعليمي."
});

export const getSchools = (): School[] => {
    const saved = localStorage.getItem('local_schools');
    return saved ? JSON.parse(saved) : [];
};

export const addSchool = async (s: School) => {
    const current = getSchools();
    current.push(s);
    localStorage.setItem('local_schools', JSON.stringify(current));
    return await supabase.from('schools').insert({
        id: s.id, 
        name: s.name, 
        ministry_code: s.ministryCode, 
        manager_name: s.managerName,
        manager_national_id: s.managerNationalId, 
        type: s.type, 
        phone: s.phone,
        student_count: s.studentCount, 
        education_administration: s.educationAdministration
    });
};

export const updateSchool = async (s: School) => {
    return await supabase.from('schools').update({
        name: s.name, 
        ministry_code: s.ministryCode, 
        manager_name: s.managerName,
        manager_national_id: s.managerNationalId, 
        type: s.type, 
        phone: s.phone,
        student_count: s.studentCount, 
        education_administration: s.educationAdministration
    }).eq('id', s.id);
};

export const deleteSchool = async (id: string) => await supabase.from('schools').delete().eq('id', id);

export const getTeachers = (): Teacher[] => {
    const saved = localStorage.getItem('local_teachers');
    return saved ? JSON.parse(saved) : [];
};

export const addTeacher = async (t: Teacher) => {
    const current = getTeachers();
    current.push(t);
    localStorage.setItem('local_teachers', JSON.stringify(current));
    return await supabase.from('teachers').insert({
        id: t.id, 
        name: t.name, 
        national_id: t.nationalId, 
        email: t.email, 
        phone: t.phone,
        subject_specialty: t.subjectSpecialty, 
        password: t.password, 
        school_id: t.schoolId, 
        manager_id: t.managerId, 
        subscription_status: t.subscriptionStatus, 
        subscription_end_date: t.subscriptionEndDate
    });
};

export const updateTeacher = async (t: Teacher) => {
    return await supabase.from('teachers').update({
        name: t.name, 
        national_id: t.nationalId, 
        email: t.email, 
        phone: t.phone,
        subject_specialty: t.subjectSpecialty, 
        password: t.password, 
        school_id: t.schoolId,
        manager_id: t.managerId, 
        subscription_status: t.subscriptionStatus,
        subscription_end_date: t.subscriptionEndDate
    }).eq('id', t.id);
};

export const addSystemUser = async (u: SystemUser) => {
    return await supabase.from('system_users').insert({
        id: u.id, 
        name: u.name, 
        email: u.email, 
        national_id: u.nationalId, 
        password: u.password, 
        role: u.role, 
        school_id: u.schoolId, 
        status: u.status
    });
};

export const updateSystemUser = async (u: SystemUser) => {
    return await supabase.from('system_users').update({
        name: u.name, 
        email: u.email, 
        national_id: u.nationalId, 
        password: u.password, 
        role: u.role, 
        school_id: u.schoolId, 
        status: u.status
    }).eq('id', u.id);
};

export const deleteSystemUser = async (id: string) => await supabase.from('system_users').delete().eq('id', id);

export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => {
    const saved = localStorage.getItem(`local_assignments_map_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const addTeacherAssignment = async (a: TeacherAssignment) => {
    const key = `local_assignments_map_${a.teacherId || 'global'}`;
    const current = getTeacherAssignments(a.teacherId);
    current.push(a);
    localStorage.setItem(key, JSON.stringify(current));
    return await supabase.from('teacher_class_map').insert({
        id: a.id, 
        class_id: a.classId, 
        subject_name: a.subjectName, 
        teacher_id: a.teacherId
    });
};

export const deleteTeacherAssignment = async (id: string) => await supabase.from('teacher_class_map').delete().eq('id', id);

export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';
export const saveWorksMasterUrl = (url: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, url);

export const getAttendance = (tid?: string): AttendanceRecord[] => {
    const saved = localStorage.getItem(`local_attendance_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const getCurriculumUnits = (tid?: string): CurriculumUnit[] => {
    const saved = localStorage.getItem(`local_curriculum_units_${tid || 'global'}`);
    return saved ? JSON.parse(saved) : [];
};

export const saveCurriculumUnit = async (u: CurriculumUnit) => {
    const key = `local_curriculum_units_${u.teacherId || 'global'}`;
    const current = getCurriculumUnits(u.teacherId);
    current.push(u);
    localStorage.setItem(key, JSON.stringify(current));
    return await supabase.from('curriculum_units').upsert({
        id: u.id, 
        teacher_id: u.teacherId, 
        subject: u.subject, 
        grade_level: u.gradeLevel, 
        title: u.title, 
        order_index: u.orderIndex
    });
};

export const deleteCurriculumUnit = async (id: string) => await supabase.from('curriculum_units').delete().eq('id', id);

export const getCurriculumLessons = (uid?: string): CurriculumLesson[] => {
    const saved = localStorage.getItem('local_curriculum_lessons');
    const lessons = saved ? JSON.parse(saved) : [];
    if (uid) return lessons.filter((l: any) => l.unitId === uid);
    return lessons;
};

export const saveCurriculumLesson = async (l: CurriculumLesson) => {
    const current = getCurriculumLessons();
    current.push(l);
    localStorage.setItem('local_curriculum_lessons', JSON.stringify(current));
    return await supabase.from('curriculum_lessons').upsert({
        id: l.id, 
        unit_id: l.unitId, 
        title: l.title, 
        order_index: l.orderIndex,
        learning_standards: JSON.stringify(l.learningStandards),
        micro_concept_ids: JSON.stringify(l.microConceptIds),
        is_completed: l.isCompleted, 
        completed_at: l.completedAt
    });
};

export const deleteCurriculumLesson = async (id: string) => await supabase.from('curriculum_lessons').delete().eq('id', id);

export const toggleCurriculumLesson = async (id: string, completed: boolean) => {
    return await supabase.from('curriculum_lessons').update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null
    }).eq('id', id);
};

export const updateStudentLearningStyle = async (id: string, style: LearningStyle) => {
    return await supabase.from('students').update({ learning_style: style }).eq('id', id);
};

export const saveReportHeaderConfig = (c: ReportHeaderConfig) => {
    const key = c.teacherId ? `${KEYS.REPORT_HEADER}_${c.teacherId}` : KEYS.REPORT_HEADER;
    localStorage.setItem(key, JSON.stringify(c));
};

export const saveTeacherPeriodTimings = (tid: string, timings: string[]) => localStorage.setItem(`${KEYS.PERIOD_TIMINGS}_${tid}`, JSON.stringify(timings));

export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
        return { success: !error };
    } catch { return { success: false }; }
};

export const getDatabaseSchemaSQL = () => `
-- SQL لتأسيس الجداول في Supabase
CREATE TABLE IF NOT EXISTS schools (id TEXT PRIMARY KEY, name TEXT, ministry_code TEXT, manager_name TEXT, manager_national_id TEXT, type TEXT, phone TEXT, student_count INTEGER, education_administration TEXT);
CREATE TABLE IF NOT EXISTS teachers (id TEXT PRIMARY KEY, name TEXT, national_id TEXT, email TEXT, phone TEXT, subject_specialty TEXT, password TEXT, school_id TEXT, manager_id TEXT, subscription_status TEXT, subscription_end_date TEXT);
CREATE TABLE IF NOT EXISTS system_users (id TEXT PRIMARY KEY, name TEXT, email TEXT, national_id TEXT, password TEXT, role TEXT, school_id TEXT, status TEXT, phone TEXT);
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, name TEXT, national_id TEXT, class_id TEXT, school_id TEXT, created_by_id TEXT, grade_level TEXT, class_name TEXT, email TEXT, phone TEXT, parent_name TEXT, parent_phone TEXT, parent_email TEXT, password TEXT, seat_index INTEGER, learning_style TEXT, behavior_points INTEGER);
CREATE TABLE IF NOT EXISTS attendance (id TEXT PRIMARY KEY, student_id TEXT, date TEXT, status TEXT, subject TEXT, period INTEGER, behavior_status TEXT, behavior_note TEXT, participation_score INTEGER, excuse_note TEXT, created_by_id TEXT);
CREATE TABLE IF NOT EXISTS performance (id TEXT PRIMARY KEY, student_id TEXT, subject TEXT, title TEXT, category TEXT, score REAL, max_score REAL, date TEXT, notes TEXT, created_by_id TEXT, url TEXT);
`;
