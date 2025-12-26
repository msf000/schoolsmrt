
import { 
    Student, AttendanceRecord, PerformanceRecord, Teacher, School, 
    SystemUser, Subject, ScheduleItem, TeacherAssignment, 
    AcademicTerm, WeeklyPlanItem, LessonLink, StoredLessonPlan,
    Exam, ReportHeaderConfig, UserTheme, 
    CustomTable, EnvironmentRecord, LearningStyle, CurriculumUnit, 
    CurriculumLesson, Question, ExamResult, TrackingSheet, RemedialPlan,
    MessageLog, FormsDetailedResult, BehaviorIncident, Task, Assignment,
    AttendanceStatus, BehaviorStatus, WeeklyChallenge, PurchaseRequest, Reward
} from '../types';
import { supabase } from './supabaseClient';

export const KEYS = {
    USER_THEME: 'user_theme',
    REPORT_HEADER: 'report_header_config',
    PERIOD_TIMINGS: 'period_timings',
    WORKS_MASTER_URL: 'works_master_url',
    CUSTOM_REWARDS: 'custom_rewards'
};

const REQUIRED_SCHEMA = {
    schools: ['id', 'name', 'ministry_code', 'manager_name', 'manager_national_id', 'type', 'phone', 'student_count', 'education_administration'],
    system_users: ['id', 'name', 'email', 'national_id', 'password', 'role', 'school_id', 'status', 'phone', 'subject_specialty', 'subscription_status'],
    students: ['id', 'name', 'national_id', 'class_id', 'school_id', 'grade_level', 'class_name', 'email', 'phone', 'parent_name', 'parent_phone', 'parent_email', 'password', 'xp', 'level', 'behavior_points', 'streak', 'learning_style', 'badges', 'purchased_rewards', 'created_by_id', 'seat_index'],
    attendance: ['id', 'student_id', 'date', 'status', 'subject', 'period', 'created_by_id', 'behavior_status', 'behavior_note', 'participation_score', 'excuse_note'],
    performance: ['id', 'student_id', 'subject', 'title', 'score', 'max_score', 'date', 'created_by_id', 'category', 'notes', 'url'],
    behavior_incidents: ['id', 'student_id', 'teacher_id', 'type', 'category', 'points', 'date', 'note', 'action_taken'],
    tasks: ['id', 'teacher_id', 'class_id', 'subject', 'title', 'description', 'due_date', 'type', 'max_score', 'submissions'],
    exams: ['id', 'teacher_id', 'title', 'subject', 'grade_level', 'duration_minutes', 'questions', 'is_active', 'created_at'],
    exam_results: ['id', 'exam_id', 'student_id', 'score', 'total_score', 'answers', 'date'],
    curriculum_units: ['id', 'teacher_id', 'subject', 'grade_level', 'title', 'order_index'],
    curriculum_lessons: ['id', 'unit_id', 'title', 'order_index', 'is_completed', 'completed_at'],
    rewards: ['id', 'teacher_id', 'title', 'cost', 'icon', 'description', 'category'],
    purchase_requests: ['id', 'student_id', 'student_name', 'reward_id', 'reward_title', 'cost', 'status', 'date', 'teacher_id'],
    lesson_plans: ['id', 'teacher_id', 'lesson_id', 'subject', 'topic', 'content_json', 'resources', 'created_at'],
    subjects: ['id', 'name', 'teacher_id'],
    schedules: ['id', 'class_id', 'subject_name', 'day', 'period', 'teacher_id'],
    custom_tables: ['id', 'name', 'columns', 'rows', 'source_url', 'last_updated', 'teacher_id', 'created_at'],
    environment_records: ['id', 'teacher_id', 'class_id', 'date', 'lighting', 'noise_level', 'mood', 'notes']
};

export const getCloudSystemStatus = async () => {
    const results = await Promise.all(Object.entries(REQUIRED_SCHEMA).map(async ([tableId, columns]) => {
        const start = performance.now();
        const colStatus: Record<string, boolean> = {};
        let tableStatus = 'ACTIVE';
        let errorMessage = '';
        try {
            const { error } = await supabase.from(tableId).select(columns.join(',')).limit(1);
            if (error) {
                tableStatus = 'ERROR';
                errorMessage = error.message;
                for (const col of columns) {
                    const { error: colErr } = await supabase.from(tableId).select(col).limit(1);
                    colStatus[col] = !colErr;
                }
            } else {
                columns.forEach(c => colStatus[c] = true);
            }
            const end = performance.now();
            return { id: tableId, label: tableId.replace(/_/g, ' '), status: tableStatus, columns: colStatus, latency: Math.round(end - start), error: errorMessage };
        } catch (e) {
            return { id: tableId, label: tableId, status: 'OFFLINE', columns: {}, latency: 0 };
        }
    }));
    return results;
};

export const getDatabaseSchemaSQL = () => `
CREATE TABLE IF NOT EXISTS curriculum_units (
    id TEXT PRIMARY KEY,
    teacher_id TEXT,
    subject TEXT,
    grade_level TEXT,
    title TEXT NOT NULL,
    order_index INTEGER
);

CREATE TABLE IF NOT EXISTS curriculum_lessons (
    id TEXT PRIMARY KEY,
    unit_id TEXT REFERENCES curriculum_units(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE curriculum_lessons ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE curriculum_lessons ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS seat_index INTEGER DEFAULT 0;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS subject_specialty TEXT;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'FREE';
`;

export const exportToWord = (elementId: string, filename: string = 'report.doc') => {
    const html = document.getElementById(elementId)?.innerHTML;
    if (!html) return;
    const blob = new Blob(['\ufeff', `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40' dir='rtl'>
        <head><meta charset='utf-8'><title>Export</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid black; padding: 8px; text-align: center; }
            .font-black { font-weight: bold; }
        </style>
        </head><body>${html}</body></html>
    `], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
};

export const authenticateUser = async (id: string, p: string): Promise<SystemUser | null> => {
    if (id === 'admin' && p === 'admin') return { id: 'admin_root', name: 'مدير النظام', email: 'admin@system.local', nationalId: 'admin', role: 'SUPER_ADMIN', status: 'ACTIVE' };
    const { data } = await supabase.from('system_users').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', p).maybeSingle();
    return data ? { ...data, nationalId: data.national_id, schoolId: data.school_id } as SystemUser : null;
};

export const authenticateStudent = async (id: string, p: string): Promise<Student | null> => {
    const { data } = await supabase.from('students').select('*').or(`national_id.eq.${id},email.eq.${id}`).eq('password', p).maybeSingle();
    return data ? { ...data, nationalId: data.national_id, schoolId: data.school_id, classId: data.class_id, gradeLevel: data.grade_level, className: data.class_name } as Student : null;
};

export const fetchStudents = async (): Promise<Student[]> => {
    const { data } = await supabase.from('students').select('*').order('name');
    const mapped = (data || []).map((d: any) => ({ ...d, nationalId: d.national_id, classId: d.class_id, schoolId: d.school_id, gradeLevel: d.grade_level, className: d.class_name })) as Student[];
    localStorage.setItem('local_students', JSON.stringify(mapped));
    return mapped;
};

export const getStudents = (): Student[] => JSON.parse(localStorage.getItem('local_students') || '[]');

export const addStudent = async (s: Student) => await supabase.from('students').upsert({ ...s, national_id: s.nationalId, class_id: s.classId, school_id: s.schoolId, grade_level: s.gradeLevel, class_name: s.className });

export const updateStudent = async (s: Student) => await addStudent(s);

export const updateStudentLearningStyle = async (id: string, style: LearningStyle) => {
    await supabase.from('students').update({ learning_style: style }).eq('id', id);
};

export const deleteStudent = async (id: string) => await supabase.from('students').delete().eq('id', id);

export const fetchAttendance = async (tid?: string): Promise<AttendanceRecord[]> => {
    let query = supabase.from('attendance').select('*');
    if (tid) query = query.eq('created_by_id', tid);
    const { data } = await query.order('date', { ascending: false });
    return (data || []).map((d: any) => ({ ...d, studentId: d.student_id, createdById: d.created_by_id })) as AttendanceRecord[];
};

export const getAttendance = (): AttendanceRecord[] => JSON.parse(localStorage.getItem('local_attendance') || '[]');

export const saveAttendance = async (recs: AttendanceRecord[]) => await supabase.from('attendance').upsert(recs.map(r => ({ ...r, student_id: r.studentId, created_by_id: r.createdById })));

export const deleteAttendance = async (id: string) => await supabase.from('attendance').delete().eq('id', id);

export const fetchPerformance = async (tid?: string): Promise<PerformanceRecord[]> => {
    let query = supabase.from('performance').select('*');
    if (tid) query = query.eq('created_by_id', tid);
    const { data } = await query.order('date', { ascending: false });
    return (data || []).map((d: any) => ({ ...d, studentId: d.student_id, maxScore: d.max_score, createdById: d.created_by_id })) as PerformanceRecord[];
};

export const addPerformance = async (recs: PerformanceRecord[]) => await supabase.from('performance').upsert(recs.map(r => ({ ...r, student_id: r.studentId, max_score: r.maxScore, created_by_id: r.createdById })));

export const deletePerformance = async (id: string) => await supabase.from('performance').delete().eq('id', id);

export const fetchSchools = async (): Promise<School[]> => {
    const { data } = await supabase.from('schools').select('*');
    return (data || []).map((d: any) => ({ ...d, ministryCode: d.ministry_code, managerName: d.manager_name, managerNationalId: d.manager_national_id, educationAdministration: d.education_administration, studentCount: d.student_count })) as School[];
};

export const getSchools = (): School[] => JSON.parse(localStorage.getItem('local_schools') || '[]');

export const addSchool = async (s: School) => await supabase.from('schools').upsert({ ...s, ministry_code: s.ministryCode, manager_name: s.managerName, manager_national_id: s.managerNationalId, education_administration: s.educationAdministration, student_count: s.studentCount });

export const fetchTeachers = async (): Promise<Teacher[]> => {
    const { data } = await supabase.from('system_users').select('*').eq('role', 'TEACHER');
    return (data || []).map((d: any) => ({ ...d, nationalId: d.national_id, subjectSpecialty: d.subject_specialty, schoolId: d.school_id, subscriptionStatus: d.subscription_status })) as Teacher[];
};

export const getTeachers = (): Teacher[] => JSON.parse(localStorage.getItem('local_teachers') || '[]');

export const addTeacher = async (t: Teacher) => await addSystemUser(t);

export const updateTeacher = async (t: Teacher) => await addSystemUser(t);

export const fetchSystemUsers = async (): Promise<SystemUser[]> => {
    const { data } = await supabase.from('system_users').select('*');
    return (data || []).map((d: any) => ({ ...d, nationalId: d.national_id, schoolId: d.school_id })) as SystemUser[];
};

export const addSystemUser = async (u: SystemUser) => await supabase.from('system_users').upsert({ ...u, national_id: u.nationalId, school_id: u.schoolId, subject_specialty: (u as any).subjectSpecialty, subscription_status: (u as any).subscriptionStatus });

export const updateSystemUser = async (u: SystemUser) => await addSystemUser(u);

export const getSubjects = (tid?: string): Subject[] => JSON.parse(localStorage.getItem(`local_subjects_${tid || 'global'}`) || '[]');

export const addSubject = (s: Subject) => { const cur = getSubjects(s.teacherId); localStorage.setItem(`local_subjects_${s.teacherId || 'global'}`, JSON.stringify([...cur, s])); };

export const deleteSubject = (id: string) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_subjects_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((s: Subject) => s.id !== id))); }); };

export const getAcademicTerms = (tid?: string): AcademicTerm[] => JSON.parse(localStorage.getItem(`local_terms_${tid || 'global'}`) || '[]');

export const saveAcademicTerm = (t: AcademicTerm) => { const cur = getAcademicTerms(t.teacherId); localStorage.setItem(`local_terms_${t.teacherId || 'global'}`, JSON.stringify([...cur.filter(x=>x.id!==t.id), t])); };

export const deleteAcademicTerm = (id: string) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_terms_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((t: AcademicTerm) => t.id !== id))); }); };

export const setCurrentTerm = (id: string, tid: string) => { const cur = getAcademicTerms(tid); const updated = cur.map(t => ({ ...t, isCurrent: t.id === id })); localStorage.setItem(`local_terms_${tid}`, JSON.stringify(updated)); };

export const getReportHeaderConfig = (tid?: string): ReportHeaderConfig => JSON.parse(localStorage.getItem(`report_header_${tid || 'global'}`) || '{"schoolName":"","educationAdmin":"","teacherName":"","schoolManager":"","academicYear":"","term":""}');

export const saveReportHeaderConfig = (c: ReportHeaderConfig) => localStorage.setItem(`report_header_${c.teacherId || 'global'}`, JSON.stringify(c));

export const getSchedules = (): ScheduleItem[] => JSON.parse(localStorage.getItem('local_schedules') || '[]');

export const saveScheduleItem = (s: ScheduleItem) => { const cur = getSchedules(); localStorage.setItem('local_schedules', JSON.stringify([...cur, s])); };

export const deleteScheduleItem = (id: string) => { const cur = getSchedules(); localStorage.setItem('local_schedules', JSON.stringify(cur.filter(s => s.id !== id))); };

export const getTeacherAssignments = (tid?: string): TeacherAssignment[] => JSON.parse(localStorage.getItem(`local_assignments_map_${tid || 'global'}`) || '[]');

export const addTeacherAssignment = (a: TeacherAssignment) => { const cur = getTeacherAssignments(a.teacherId); localStorage.setItem(`local_assignments_map_${a.teacherId || 'global'}`, JSON.stringify([...cur, a])); };

export const deleteTeacherAssignment = (id: string) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_assignments_map_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((a: TeacherAssignment) => a.id !== id))); }); };

export const getTeacherPeriodTimings = (tid: string): string[] => JSON.parse(localStorage.getItem(`${KEYS.PERIOD_TIMINGS}_${tid}`) || '["07:00-07:45", "07:45-08:30"]');

export const saveTeacherPeriodTimings = (tid: string, t: string[]) => localStorage.setItem(`${KEYS.PERIOD_TIMINGS}_${tid}`, JSON.stringify(t));

export const getAISettings = () => ({ modelId: 'gemini-3-flash-preview', temperature: 0.7, systemInstruction: 'أنت مساعد تعليمي.' });

export const getUserTheme = (): UserTheme => JSON.parse(localStorage.getItem(KEYS.USER_THEME) || '{"mode":"LIGHT","backgroundStyle":"FLAT"}');

export const saveUserTheme = (t: UserTheme) => localStorage.setItem(KEYS.USER_THEME, JSON.stringify(t));

export const getWorksMasterUrl = () => localStorage.getItem(KEYS.WORKS_MASTER_URL) || '';

export const saveWorksMasterUrl = (u: string) => localStorage.setItem(KEYS.WORKS_MASTER_URL, u);

export const getTasks = (tid?: string): Task[] => JSON.parse(localStorage.getItem(`local_tasks_${tid || 'global'}`) || '[]');

export const saveTask = async (t: Task) => { const cur = getTasks(t.teacherId); localStorage.setItem(`local_tasks_${t.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==t.id), t])); };

export const getBehaviorIncidents = (tid?: string): BehaviorIncident[] => JSON.parse(localStorage.getItem(`local_behavior_${tid || 'global'}`) || '[]');

export const saveBehaviorIncident = async (i: BehaviorIncident) => { const cur = getBehaviorIncidents(i.teacherId); localStorage.setItem(`local_behavior_${i.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==i.id), i])); };

export const getChallenges = (tid?: string): WeeklyChallenge[] => JSON.parse(localStorage.getItem(`local_challenges_${tid || 'global'}`) || '[]');

export const saveChallenge = async (c: WeeklyChallenge, tid: string) => { const cur = getChallenges(tid); localStorage.setItem(`local_challenges_${tid}`, JSON.stringify([...cur.filter(x=>x.id!==c.id), c])); };

export const deleteChallenge = async (id: string, tid: string) => { const cur = getChallenges(tid); localStorage.setItem(`local_challenges_${tid}`, JSON.stringify(cur.filter(c => c.id !== id))); };

export const getPurchaseRequests = (tid?: string): PurchaseRequest[] => JSON.parse(localStorage.getItem(`local_purchase_reqs_${tid || 'global'}`) || '[]');

export const savePurchaseRequest = async (r: PurchaseRequest) => { const cur = getPurchaseRequests(r.teacherId); localStorage.setItem(`local_purchase_reqs_${r.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==r.id), r])); };

export const updatePurchaseStatus = async (id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED') => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_purchase_reqs_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); const updated = cur.map((r: PurchaseRequest) => r.id === id ? { ...r, status } : r); localStorage.setItem(k, JSON.stringify(updated)); }); };

export const getMessages = (tid?: string): MessageLog[] => JSON.parse(localStorage.getItem(`local_messages_${tid || 'global'}`) || '[]');

export const saveMessage = async (m: MessageLog) => { const cur = getMessages(m.teacherId); localStorage.setItem(`local_messages_${m.teacherId || 'global'}`, JSON.stringify([...cur.filter(x=>x.id!==m.id), m])); };

export const getAssignments = (cat: string, tid?: string, isManager?: boolean): Assignment[] => { const all = JSON.parse(localStorage.getItem(`local_assignments_${tid || 'global'}`) || '[]'); if (cat === 'ALL') return all; return all.filter((a: Assignment) => a.category === cat); };

export const saveAssignment = (a: Assignment) => { const cur = getAssignments('ALL', a.teacherId); localStorage.setItem(`local_assignments_${a.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==a.id), a])); };

export const deleteAssignment = (id: string, tid?: string) => { const cur = getAssignments('ALL', tid); localStorage.setItem(`local_assignments_${tid || 'global'}`, JSON.stringify(cur.filter((a: Assignment) => a.id !== id))); };

export const getCustomTables = (tid?: string): CustomTable[] => JSON.parse(localStorage.getItem(`local_custom_tables_${tid || 'global'}`) || '[]');

export const addCustomTable = async (t: CustomTable) => { const cur = getCustomTables(t.teacherId); localStorage.setItem(`local_custom_tables_${t.teacherId || 'global'}`, JSON.stringify([...cur.filter(x=>x.id!==t.id), t])); };

export const deleteCustomTable = async (id: string) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_custom_tables_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((t: CustomTable) => t.id !== id))); }); };

export const getRewards = (tid?: string): Reward[] => JSON.parse(localStorage.getItem(`local_rewards_${tid || 'global'}`) || '[]');

export const saveReward = (r: Reward, tid: string) => { const cur = getRewards(tid); localStorage.setItem(`local_rewards_${tid}`, JSON.stringify([...cur.filter(x=>x.id!==r.id), r])); };

export const deleteReward = (id: string, tid: string) => { const cur = getRewards(tid); localStorage.setItem(`local_rewards_${tid}`, JSON.stringify(cur.filter(r => r.id !== id))); };

export const getExams = (tid?: string): Exam[] => JSON.parse(localStorage.getItem(`local_exams_${tid || 'global'}`) || '[]');

export const saveExam = async (e: Exam) => { const cur = getExams(e.teacherId); localStorage.setItem(`local_exams_${e.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==e.id), e])); };

export const deleteExam = async (id: string) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_exams_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((e: Exam) => e.id !== id))); }); };

export const getExamResults = (examId?: string): ExamResult[] => { const all = JSON.parse(localStorage.getItem('local_exam_results') || '[]'); if (!examId) return all; return all.filter((r: ExamResult) => r.examId === examId); };

export const saveExamResult = async (r: ExamResult) => { const all = getExamResults(); localStorage.setItem('local_exam_results', JSON.stringify([...all.filter(x=>x.id!==r.id), r])); };

export const deleteExamResult = async (id: string) => { const all = getExamResults(); localStorage.setItem('local_exam_results', JSON.stringify(all.filter(r => r.id !== id))); };

export const getRemedialPlans = (tid?: string): RemedialPlan[] => JSON.parse(localStorage.getItem(`local_remedial_${tid || 'global'}`) || '[]');

export const saveRemedialPlan = (p: RemedialPlan) => { const cur = getRemedialPlans(p.teacherId); localStorage.setItem(`local_remedial_${p.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==p.id), p])); };

export const getEnvironmentRecords = (cid: string): EnvironmentRecord[] => { const all = JSON.parse(localStorage.getItem('local_env_records') || '[]'); return all.filter((r: EnvironmentRecord) => r.classId === cid); };

export const saveEnvironmentRecord = async (r: EnvironmentRecord) => { const all = JSON.parse(localStorage.getItem('local_env_records') || '[]'); localStorage.setItem('local_env_records', JSON.stringify([...all.filter((x: any)=>x.id!==r.id), r])); };

export const getLessonPlans = (tid?: string): StoredLessonPlan[] => JSON.parse(localStorage.getItem(`local_lesson_plans_${tid || 'global'}`) || '[]');

export const saveLessonPlan = (p: StoredLessonPlan) => { const cur = getLessonPlans(p.teacherId); localStorage.setItem(`local_lesson_plans_${p.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==p.id), p])); };

export const deleteLessonPlan = (id: string) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_lesson_plans_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((p: StoredLessonPlan) => p.id !== id))); }); };

export const getQuestionBank = (tid?: string): Question[] => JSON.parse(localStorage.getItem(`local_qbank_${tid || 'global'}`) || '[]');

export const saveQuestionToBank = (q: Question) => { const tid = q.teacherId || 'global'; const cur = getQuestionBank(tid); localStorage.setItem(`local_qbank_${tid}`, JSON.stringify([...cur.filter(x=>x.id!==q.id), q])); };

export const deleteQuestionFromBank = (id: string) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_qbank_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((q: Question) => q.id !== id))); }); };

export const getCurriculumUnits = (tid?: string): CurriculumUnit[] => JSON.parse(localStorage.getItem(`local_curr_units_${tid || 'global'}`) || '[]');

export const saveCurriculumUnit = async (u: CurriculumUnit) => { 
    const tid = u.teacherId || 'global';
    const cur = getCurriculumUnits(tid);
    localStorage.setItem(`local_curr_units_${tid}`, JSON.stringify([...cur.filter(x=>x.id!==u.id), u]));
};

export const deleteCurriculumUnit = async (id: string, tid?: string) => { 
    const targetTid = tid || 'global';
    const cur = getCurriculumUnits(targetTid);
    localStorage.setItem(`local_curr_units_${targetTid}`, JSON.stringify(cur.filter(u => u.id !== id)));
};

export const getCurriculumLessons = (uid: string): CurriculumLesson[] => { const all = JSON.parse(localStorage.getItem('local_curr_lessons') || '[]'); return all.filter((l: CurriculumLesson) => l.unitId === uid); };

export const saveCurriculumLesson = async (l: CurriculumLesson) => { 
    const all = JSON.parse(localStorage.getItem('local_curr_lessons') || '[]');
    localStorage.setItem('local_curr_lessons', JSON.stringify([...all.filter((x: any)=>x.id!==l.id), l]));
};

export const deleteCurriculumLesson = async (id: string) => { 
    const all = JSON.parse(localStorage.getItem('local_curr_lessons') || '[]');
    localStorage.setItem('local_curr_lessons', JSON.stringify(all.filter((l: any) => l.id !== id)));
};

export const toggleCurriculumLesson = async (id: string, status: boolean) => {
    const all = JSON.parse(localStorage.getItem('local_curr_lessons') || '[]');
    const updated = all.map((l: CurriculumLesson) => l.id === id ? { ...l, isCompleted: status, completedAt: status ? new Date().toISOString() : undefined } : l);
    localStorage.setItem('local_curr_lessons', JSON.stringify(updated));
};

export const getLessonLinks = (): LessonLink[] => JSON.parse(localStorage.getItem('local_lesson_links') || '[]');

export const saveLessonLink = (l: LessonLink) => { const all = getLessonLinks(); localStorage.setItem('local_lesson_links', JSON.stringify([...all.filter(x=>x.id!==l.id), l])); };

export const deleteLessonLink = (id: string) => { const all = getLessonLinks(); localStorage.setItem('local_lesson_links', JSON.stringify(all.filter(l => l.id !== id))); };

export const getWeeklyPlans = (tid?: string): WeeklyPlanItem[] => JSON.parse(localStorage.getItem(`local_weekly_plans_${tid || 'global'}`) || '[]');

export const saveWeeklyPlanItem = (p: WeeklyPlanItem) => { const cur = getWeeklyPlans(p.teacherId); localStorage.setItem(`local_weekly_plans_${p.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==p.id), p])); };

export const getTrackingSheets = (tid?: string): TrackingSheet[] => JSON.parse(localStorage.getItem(`local_tracking_${tid || 'global'}`) || '[]');

export const saveTrackingSheet = (s: TrackingSheet) => { const cur = getTrackingSheets(s.teacherId); localStorage.setItem(`local_tracking_${s.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==s.id), s])); };

export const deleteTrackingSheet = (id: string) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_tracking_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((s: TrackingSheet) => s.id !== id))); }); };

export const getFormsDetailedResults = (tid?: string): FormsDetailedResult[] => JSON.parse(localStorage.getItem(`local_forms_results_${tid || 'global'}`) || '[]');

export const saveFormsDetailedResult = (r: FormsDetailedResult) => { const cur = getFormsDetailedResults(r.teacherId); localStorage.setItem(`local_forms_results_${r.teacherId}`, JSON.stringify([...cur.filter(x=>x.id!==r.id), r])); };

export const deleteFormsDetailedResult = (id: string) => { const keys = Object.keys(localStorage).filter(k => k.startsWith('local_forms_results_')); keys.forEach(k => { const cur = JSON.parse(localStorage.getItem(k) || '[]'); localStorage.setItem(k, JSON.stringify(cur.filter((r: FormsDetailedResult) => r.id !== id))); }); };

export const downloadFromSupabase = async () => { await Promise.all([fetchStudents(), fetchAttendance(), fetchPerformance(), fetchSchools(), fetchSystemUsers(), fetchTeachers()]); };
