
import { 
    Student, Teacher, School, SystemUser, AttendanceRecord, PerformanceRecord, 
    Assignment, ScheduleItem, TeacherAssignment, Subject, CustomTable, 
    LessonLink, MessageLog, Feedback, ReportHeaderConfig, AISettings, UserTheme, 
    PerformanceCategory, Exam, ExamResult, Question, StoredLessonPlan,
    CurriculumUnit, CurriculumLesson, MicroConcept, TrackingSheet, WeeklyPlanItem, AcademicTerm
} from '../types';
import { supabase } from './supabaseClient';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ONLINE' | 'OFFLINE' | 'ERROR';

// --- Database Mapping ---
export const DB_MAP: Record<string, string> = {
    students: 'students',
    teachers: 'teachers',
    schools: 'schools',
    systemUsers: 'system_users',
    attendance: 'attendance',
    performance: 'performance',
    assignments: 'assignments',
    schedules: 'schedules',
    teacherAssignments: 'teacher_assignments',
    subjects: 'subjects',
    weeklyPlans: 'weekly_plans',
    lessonLinks: 'lesson_links',
    lessonPlans: 'lesson_plans',
    customTables: 'custom_tables',
    messages: 'message_logs',
    feedback: 'feedback',
    exams: 'exams',
    examResults: 'exam_results',
    questions: 'questions',
    curriculumUnits: 'curriculum_units',
    curriculumLessons: 'curriculum_lessons',
    microConcepts: 'micro_concepts',
    trackingSheets: 'tracking_sheets',
    academicTerms: 'academic_terms'
};

export const getTableDisplayName = (key: string) => {
    const map: Record<string, string> = {
        students: 'الطلاب',
        teachers: 'المعلمين',
        schools: 'المدارس',
        attendance: 'الحضور',
        performance: 'الدرجات',
        assignments: 'التعيينات',
        schedules: 'الجدول الدراسي',
        teacherAssignments: 'توزيع الحصص',
        subjects: 'المواد',
        weeklyPlans: 'الخطط الأسبوعية',
        lessonLinks: 'روابط الدروس',
        lessonPlans: 'تحضير الدروس',
        customTables: 'جداول خاصة',
        messages: 'سجل الرسائل',
        feedback: 'التوجيهات',
        exams: 'الاختبارات',
        examResults: 'نتائج الاختبارات',
        questions: 'بنك الأسئلة',
        curriculumUnits: 'وحدات المنهج',
        curriculumLessons: 'دروس المنهج',
        microConcepts: 'المفاهيم الدقيقة',
        trackingSheets: 'سجلات المتابعة',
        academicTerms: 'التقويم الدراسي'
    };
    return map[key] || key;
};

// --- In-Memory Cache ---
const DEFAULT_AI_SETTINGS: AISettings = {
    modelId: 'gemini-2.5-flash',
    temperature: 0.7,
    enableReports: true,
    enableQuiz: true,
    enablePlanning: true,
    systemInstruction: ''
};

const DEFAULT_THEME: UserTheme = { mode: 'LIGHT', backgroundStyle: 'FLAT' };

const CACHE = {
    students: [] as Student[],
    teachers: [] as Teacher[],
    schools: [] as School[],
    systemUsers: [] as SystemUser[],
    attendance: [] as AttendanceRecord[],
    performance: [] as PerformanceRecord[],
    assignments: [] as Assignment[],
    schedules: [] as ScheduleItem[],
    teacherAssignments: [] as TeacherAssignment[],
    subjects: [] as Subject[],
    weeklyPlans: [] as WeeklyPlanItem[],
    lessonLinks: [] as LessonLink[],
    lessonPlans: [] as StoredLessonPlan[],
    customTables: [] as CustomTable[],
    messages: [] as MessageLog[],
    feedback: [] as Feedback[],
    exams: [] as Exam[],
    examResults: [] as ExamResult[],
    questions: [] as Question[],
    curriculumUnits: [] as CurriculumUnit[],
    curriculumLessons: [] as CurriculumLesson[],
    microConcepts: [] as MicroConcept[],
    trackingSheets: [] as TrackingSheet[],
    academicTerms: [] as AcademicTerm[],
    reportConfig: {} as ReportHeaderConfig,
    aiSettings: DEFAULT_AI_SETTINGS,
    userTheme: DEFAULT_THEME,
    worksMasterUrl: ''
};

// --- Local Storage Helpers ---
const loadFromLocal = <T>(key: string, defaultVal: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch {
        return defaultVal;
    }
};

const saveToLocal = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
    notifyDataChanges();
};

// --- Initialization ---
// Load all data from local storage on module load
Object.keys(CACHE).forEach(key => {
    if (key === 'aiSettings') CACHE.aiSettings = loadFromLocal(key, DEFAULT_AI_SETTINGS);
    else if (key === 'userTheme') CACHE.userTheme = loadFromLocal(key, DEFAULT_THEME);
    else if (key === 'reportConfig') CACHE.reportConfig = loadFromLocal(key, {} as ReportHeaderConfig);
    else if (key === 'worksMasterUrl') CACHE.worksMasterUrl = loadFromLocal(key, '');
    else (CACHE as any)[key] = loadFromLocal(key, []);
});

// --- Sync Logic ---
const syncListeners: Set<(status: SyncStatus) => void> = new Set();
const dataListeners: Set<() => void> = new Set();

const notifySyncStatus = (status: SyncStatus) => syncListeners.forEach(l => l(status));
const notifyDataChanges = () => dataListeners.forEach(l => l());

export const subscribeToSyncStatus = (cb: (status: SyncStatus) => void) => {
    syncListeners.add(cb);
    return () => syncListeners.delete(cb);
};

export const subscribeToDataChanges = (cb: () => void) => {
    dataListeners.add(cb);
    return () => dataListeners.delete(cb);
};

// Simple push to cloud stub - in real app, this would use Supabase realtime or API
const pushToCloud = async (table: string, data: any, action: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT') => {
    // Basic implementation: Just rely on manual sync for now or implement queue
    // This is a placeholder for per-action sync
};

export const initAutoSync = async () => {
    notifySyncStatus('SYNCING');
    try {
        await downloadFromSupabase();
        // If we reach here without error, we assume online, but downloadFromSupabase handles individual table errors gracefully now
        notifySyncStatus('ONLINE');
    } catch (e) {
        console.error('Sync failed', e);
        notifySyncStatus('OFFLINE');
    }
};

export const checkConnection = async () => {
    try {
        const { data, error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
        return { success: !error };
    } catch {
        return { success: false };
    }
};

// --- CRUD Operations ---

// 1. Students
export const getStudents = () => CACHE.students;
export const addStudent = (student: Student) => {
    CACHE.students = [...CACHE.students, student];
    saveToLocal('students', CACHE.students);
    pushToCloud('students', student);
};
export const updateStudent = (student: Student) => {
    CACHE.students = CACHE.students.map(s => s.id === student.id ? student : s);
    saveToLocal('students', CACHE.students);
    pushToCloud('students', student, 'UPDATE');
};
export const deleteStudent = (id: string) => {
    CACHE.students = CACHE.students.filter(s => s.id !== id);
    saveToLocal('students', CACHE.students);
    pushToCloud('students', { id }, 'DELETE');
};
export const bulkAddStudents = (students: Student[]) => {
    CACHE.students = [...CACHE.students, ...students];
    saveToLocal('students', CACHE.students);
};
export const bulkUpsertStudents = (students: Student[], matchKey: keyof Student = 'nationalId') => {
    const newStudents = [...CACHE.students];
    students.forEach(inc => {
        const idx = newStudents.findIndex(ex => ex[matchKey] === inc[matchKey]);
        if (idx > -1) {
            newStudents[idx] = { ...newStudents[idx], ...inc };
        } else {
            newStudents.push(inc);
        }
    });
    CACHE.students = newStudents;
    saveToLocal('students', CACHE.students);
};
export const deleteAllStudents = () => {
    CACHE.students = [];
    saveToLocal('students', []);
}

// 2. Attendance
export const getAttendance = () => CACHE.attendance;
export const saveAttendance = (records: AttendanceRecord[]) => {
    // Upsert logic
    let list = [...CACHE.attendance];
    records.forEach(rec => {
        const idx = list.findIndex(r => r.id === rec.id);
        if (idx > -1) list[idx] = rec;
        else list.push(rec);
    });
    CACHE.attendance = list;
    saveToLocal('attendance', list);
    // records.forEach(r => pushToCloud('attendance', r)); // Optimize bulk
};
export const bulkAddAttendance = (records: AttendanceRecord[]) => saveAttendance(records);

// 3. Performance
export const getPerformance = () => CACHE.performance;
export const addPerformance = (p: PerformanceRecord) => {
    const idx = CACHE.performance.findIndex(x => x.id === p.id);
    let list;
    if (idx > -1) {
        list = [...CACHE.performance];
        list[idx] = p;
    } else {
        list = [...CACHE.performance, p];
    }
    CACHE.performance = list;
    saveToLocal('performance', list);
    pushToCloud('performance', p);
};
export const bulkAddPerformance = (records: PerformanceRecord[]) => {
    let list = [...CACHE.performance];
    records.forEach(newRec => {
        const idx = list.findIndex(r => r.id === newRec.id);
        if (idx > -1) list[idx] = newRec;
        else list.push(newRec);
    });
    CACHE.performance = list;
    saveToLocal('performance', list);
};
export const deletePerformance = (id: string) => {
    CACHE.performance = CACHE.performance.filter(x => x.id !== id);
    saveToLocal('performance', CACHE.performance);
    pushToCloud('performance', { id }, 'DELETE');
};

// 4. Teachers
export const getTeachers = () => CACHE.teachers;
export const addTeacher = (t: Teacher) => {
    CACHE.teachers = [...CACHE.teachers, t];
    saveToLocal('teachers', CACHE.teachers);
    // Also add to system users
    addSystemUser({
        id: t.id,
        name: t.name,
        email: t.email || '',
        role: 'TEACHER',
        status: 'ACTIVE',
        password: t.password,
        schoolId: t.schoolId,
        nationalId: t.nationalId
    });
};
export const updateTeacher = (t: Teacher) => {
    CACHE.teachers = CACHE.teachers.map(x => x.id === t.id ? t : x);
    saveToLocal('teachers', CACHE.teachers);
    // Sync system user if exists
    const sysUser = CACHE.systemUsers.find(u => u.id === t.id);
    if(sysUser) {
        updateSystemUser({ ...sysUser, name: t.name, email: t.email || sysUser.email, schoolId: t.schoolId });
    }
};

// 5. Schools
export const getSchools = () => CACHE.schools;
export const addSchool = (s: School) => {
    CACHE.schools = [...CACHE.schools, s];
    saveToLocal('schools', CACHE.schools);
};
export const updateSchool = (s: School) => {
    CACHE.schools = CACHE.schools.map(x => x.id === s.id ? s : x);
    saveToLocal('schools', CACHE.schools);
};
export const deleteSchool = (id: string) => {
    CACHE.schools = CACHE.schools.filter(x => x.id !== id);
    saveToLocal('schools', CACHE.schools);
};

// 6. System Users & Auth
export const getSystemUsers = () => CACHE.systemUsers;
export const addSystemUser = (u: SystemUser) => {
    CACHE.systemUsers = [...CACHE.systemUsers, u];
    saveToLocal('systemUsers', CACHE.systemUsers);
};
export const updateSystemUser = (u: SystemUser) => {
    CACHE.systemUsers = CACHE.systemUsers.map(x => x.id === u.id ? u : x);
    saveToLocal('systemUsers', CACHE.systemUsers);
};
export const deleteSystemUser = (id: string) => {
    CACHE.systemUsers = CACHE.systemUsers.filter(x => x.id !== id);
    saveToLocal('systemUsers', CACHE.systemUsers);
};

let isSystemMode = false;
export const setSystemMode = (mode: boolean) => { isSystemMode = mode; };

export const authenticateUser = async (identifier: string, password?: string): Promise<SystemUser | null> => {
    if (isSystemMode) {
        // Bypass for demo mode handled in UI mainly, but can return mock here if needed
    }
    const user = CACHE.systemUsers.find(u => 
        (u.email === identifier || u.nationalId === identifier) && 
        (u.password === password)
    );
    
    // Also check Teachers if not found in SystemUsers (legacy support)
    if (!user) {
        const teacher = CACHE.teachers.find(t => 
            (t.email === identifier || t.nationalId === identifier) && 
            (t.password === password)
        );
        if (teacher) {
            return {
                id: teacher.id,
                name: teacher.name,
                email: teacher.email || '',
                role: 'TEACHER',
                status: 'ACTIVE',
                schoolId: teacher.schoolId,
                nationalId: teacher.nationalId
            };
        }
    }
    
    // Also check Students
    if (!user) {
        const student = CACHE.students.find(s => 
            (s.email === identifier || s.nationalId === identifier) && 
            (s.password === password || password === '123456') // Allow default for students
        );
        if (student) {
            return {
                id: student.id,
                name: student.name,
                email: student.email || '',
                role: 'STUDENT',
                status: 'ACTIVE',
                schoolId: student.schoolId,
                nationalId: student.nationalId
            };
        }
    }

    return user || null;
};

// 7. Assignments & Works
export const getAssignments = (category?: PerformanceCategory, teacherId?: string) => {
    let list = CACHE.assignments;
    if (category) list = list.filter(a => a.category === category);
    if (teacherId) list = list.filter(a => a.teacherId === teacherId || !a.teacherId);
    return list;
};
export const saveAssignment = (a: Assignment) => {
    const idx = CACHE.assignments.findIndex(x => x.id === a.id);
    if (idx > -1) CACHE.assignments[idx] = a;
    else CACHE.assignments.push(a);
    saveToLocal('assignments', CACHE.assignments);
};
export const deleteAssignment = (id: string) => {
    CACHE.assignments = CACHE.assignments.filter(x => x.id !== id);
    saveToLocal('assignments', CACHE.assignments);
};
export const getWorksMasterUrl = () => CACHE.worksMasterUrl;
export const saveWorksMasterUrl = (url: string) => {
    CACHE.worksMasterUrl = url;
    saveToLocal('worksMasterUrl', url);
};

// 8. Schedules & Subjects
export const getSchedules = () => CACHE.schedules;
export const saveScheduleItem = (item: ScheduleItem) => {
    const idx = CACHE.schedules.findIndex(x => x.id === item.id);
    if (idx > -1) CACHE.schedules[idx] = item;
    else CACHE.schedules.push(item);
    saveToLocal('schedules', CACHE.schedules);
};
export const deleteScheduleItem = (id: string) => {
    CACHE.schedules = CACHE.schedules.filter(x => x.id !== id);
    saveToLocal('schedules', CACHE.schedules);
};

export const getSubjects = (teacherId?: string) => {
    if (teacherId) return CACHE.subjects.filter(s => s.teacherId === teacherId || !s.teacherId);
    return CACHE.subjects;
};
export const addSubject = (s: Subject) => {
    CACHE.subjects.push(s);
    saveToLocal('subjects', CACHE.subjects);
};
export const deleteSubject = (id: string) => {
    CACHE.subjects = CACHE.subjects.filter(s => s.id !== id);
    saveToLocal('subjects', CACHE.subjects);
};

export const getTeacherAssignments = () => CACHE.teacherAssignments;
export const saveTeacherAssignment = (ta: TeacherAssignment) => {
    const idx = CACHE.teacherAssignments.findIndex(x => x.id === ta.id);
    if (idx > -1) CACHE.teacherAssignments[idx] = ta;
    else CACHE.teacherAssignments.push(ta);
    saveToLocal('teacherAssignments', CACHE.teacherAssignments);
};
export const deleteTeacherAssignment = (id: string) => {
    CACHE.teacherAssignments = CACHE.teacherAssignments.filter(x => x.id !== id);
    saveToLocal('teacherAssignments', CACHE.teacherAssignments);
};

// 9. Config & Theme
export const getReportHeaderConfig = (teacherId?: string) => {
    return CACHE.reportConfig;
};
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    CACHE.reportConfig = config;
    saveToLocal('reportConfig', config);
};
export const getAISettings = () => CACHE.aiSettings;
export const saveAISettings = (settings: AISettings) => {
    CACHE.aiSettings = settings;
    saveToLocal('aiSettings', settings);
};
export const getUserTheme = () => CACHE.userTheme;
export const saveUserTheme = (theme: UserTheme) => {
    CACHE.userTheme = theme;
    saveToLocal('userTheme', theme);
    document.documentElement.className = theme.mode === 'DARK' ? 'dark' : '';
};

// 10. Messaging & Feedback
export const getMessages = () => CACHE.messages;
export const saveMessage = (msg: MessageLog) => {
    CACHE.messages = [msg, ...CACHE.messages];
    saveToLocal('messages', CACHE.messages);
};
export const getFeedback = () => CACHE.feedback;
export const addFeedback = (f: Feedback) => {
    CACHE.feedback = [f, ...CACHE.feedback];
    saveToLocal('feedback', CACHE.feedback);
};

// 11. Lesson Planning & Resources
export const getLessonPlans = (teacherId?: string) => {
    if (teacherId) return CACHE.lessonPlans.filter(p => p.teacherId === teacherId);
    return CACHE.lessonPlans;
};
export const saveLessonPlan = (plan: StoredLessonPlan) => {
    const idx = CACHE.lessonPlans.findIndex(x => x.id === plan.id);
    if (idx > -1) CACHE.lessonPlans[idx] = plan;
    else CACHE.lessonPlans.push(plan);
    saveToLocal('lessonPlans', CACHE.lessonPlans);
};
export const deleteLessonPlan = (id: string) => {
    CACHE.lessonPlans = CACHE.lessonPlans.filter(x => x.id !== id);
    saveToLocal('lessonPlans', CACHE.lessonPlans);
};

export const getLessonLinks = () => CACHE.lessonLinks;
export const saveLessonLink = (link: LessonLink) => {
    const idx = CACHE.lessonLinks.findIndex(x => x.id === link.id);
    if (idx > -1) CACHE.lessonLinks[idx] = link;
    else CACHE.lessonLinks.push(link);
    saveToLocal('lessonLinks', CACHE.lessonLinks);
};
export const deleteLessonLink = (id: string) => {
    CACHE.lessonLinks = CACHE.lessonLinks.filter(x => x.id !== id);
    saveToLocal('lessonLinks', CACHE.lessonLinks);
};

export const getWeeklyPlans = (teacherId?: string) => {
    if (teacherId) return CACHE.weeklyPlans.filter(p => p.teacherId === teacherId);
    return CACHE.weeklyPlans;
};
export const saveWeeklyPlanItem = (item: WeeklyPlanItem) => {
    const idx = CACHE.weeklyPlans.findIndex(x => x.id === item.id);
    if (idx > -1) CACHE.weeklyPlans[idx] = item;
    else CACHE.weeklyPlans.push(item);
    saveToLocal('weeklyPlans', CACHE.weeklyPlans);
};

// 12. Curriculum & Questions
export const getCurriculumUnits = (teacherId?: string) => {
    if (teacherId) return CACHE.curriculumUnits.filter(u => u.teacherId === teacherId || !u.teacherId);
    return CACHE.curriculumUnits;
};
export const saveCurriculumUnit = (unit: CurriculumUnit) => {
    const idx = CACHE.curriculumUnits.findIndex(x => x.id === unit.id);
    if (idx > -1) CACHE.curriculumUnits[idx] = unit;
    else CACHE.curriculumUnits.push(unit);
    saveToLocal('curriculumUnits', CACHE.curriculumUnits);
};
export const deleteCurriculumUnit = (id: string) => {
    CACHE.curriculumUnits = CACHE.curriculumUnits.filter(x => x.id !== id);
    saveToLocal('curriculumUnits', CACHE.curriculumUnits);
};

export const getCurriculumLessons = () => CACHE.curriculumLessons;
export const saveCurriculumLesson = (lesson: CurriculumLesson) => {
    const idx = CACHE.curriculumLessons.findIndex(x => x.id === lesson.id);
    if (idx > -1) CACHE.curriculumLessons[idx] = lesson;
    else CACHE.curriculumLessons.push(lesson);
    saveToLocal('curriculumLessons', CACHE.curriculumLessons);
};
export const deleteCurriculumLesson = (id: string) => {
    CACHE.curriculumLessons = CACHE.curriculumLessons.filter(x => x.id !== id);
    saveToLocal('curriculumLessons', CACHE.curriculumLessons);
};

export const getMicroConcepts = (teacherId?: string) => {
    if(teacherId) return CACHE.microConcepts.filter(c => c.teacherId === teacherId || !c.teacherId);
    return CACHE.microConcepts;
}
export const saveMicroConcept = (concept: MicroConcept) => {
    const idx = CACHE.microConcepts.findIndex(x => x.id === concept.id);
    if (idx > -1) CACHE.microConcepts[idx] = concept;
    else CACHE.microConcepts.push(concept);
    saveToLocal('microConcepts', CACHE.microConcepts);
}
export const deleteMicroConcept = (id: string) => {
    CACHE.microConcepts = CACHE.microConcepts.filter(c => c.id !== id);
    saveToLocal('microConcepts', CACHE.microConcepts);
}

export const getQuestionBank = (teacherId?: string) => {
    if(teacherId) return CACHE.questions.filter(q => q.teacherId === teacherId || !q.teacherId);
    return CACHE.questions;
};
export const saveQuestionToBank = (q: Question) => {
    const idx = CACHE.questions.findIndex(x => x.id === q.id);
    if (idx > -1) CACHE.questions[idx] = q;
    else CACHE.questions.push(q);
    saveToLocal('questions', CACHE.questions);
};
export const deleteQuestionFromBank = (id: string) => {
    CACHE.questions = CACHE.questions.filter(x => x.id !== id);
    saveToLocal('questions', CACHE.questions);
};

// 13. Exams & Results
export const getExams = (teacherId?: string) => {
    if(teacherId) return CACHE.exams.filter(e => e.teacherId === teacherId || !e.teacherId);
    return CACHE.exams;
};
export const saveExam = (exam: Exam) => {
    const idx = CACHE.exams.findIndex(x => x.id === exam.id);
    if (idx > -1) CACHE.exams[idx] = exam;
    else CACHE.exams.push(exam);
    saveToLocal('exams', CACHE.exams);
};
export const deleteExam = (id: string) => {
    CACHE.exams = CACHE.exams.filter(x => x.id !== id);
    saveToLocal('exams', CACHE.exams);
};

export const getExamResults = (examId?: string) => {
    if(examId) return CACHE.examResults.filter(r => r.examId === examId);
    return CACHE.examResults;
};
export const saveExamResult = (res: ExamResult) => {
    CACHE.examResults.push(res);
    saveToLocal('examResults', CACHE.examResults);
};

// 14. Custom Tables & Flexible Tracking
export const getCustomTables = (teacherId?: string) => {
    if(teacherId) return CACHE.customTables.filter(t => t.teacherId === teacherId || !t.teacherId);
    return CACHE.customTables;
}
export const addCustomTable = (t: CustomTable) => {
    CACHE.customTables.push(t);
    saveToLocal('customTables', CACHE.customTables);
}
export const updateCustomTable = (t: CustomTable) => {
    CACHE.customTables = CACHE.customTables.map(x => x.id === t.id ? t : x);
    saveToLocal('customTables', CACHE.customTables);
}
export const deleteCustomTable = (id: string) => {
    CACHE.customTables = CACHE.customTables.filter(x => x.id !== id);
    saveToLocal('customTables', CACHE.customTables);
}

export const getTrackingSheets = (teacherId?: string) => {
    if(teacherId) return CACHE.trackingSheets.filter(s => s.teacherId === teacherId || !s.teacherId);
    return CACHE.trackingSheets;
}
export const saveTrackingSheet = (sheet: TrackingSheet) => {
    const idx = CACHE.trackingSheets.findIndex(x => x.id === sheet.id);
    if (idx > -1) CACHE.trackingSheets[idx] = sheet;
    else CACHE.trackingSheets.push(sheet);
    saveToLocal('trackingSheets', CACHE.trackingSheets);
}
export const deleteTrackingSheet = (id: string) => {
    CACHE.trackingSheets = CACHE.trackingSheets.filter(x => x.id !== id);
    saveToLocal('trackingSheets', CACHE.trackingSheets);
}

// 15. Academic Terms
export const getAcademicTerms = (teacherId?: string) => {
    if(teacherId) return CACHE.academicTerms.filter(t => t.teacherId === teacherId || !t.teacherId);
    return CACHE.academicTerms;
}
export const saveAcademicTerm = (term: AcademicTerm) => {
    const idx = CACHE.academicTerms.findIndex(t => t.id === term.id);
    if (idx > -1) CACHE.academicTerms[idx] = term;
    else CACHE.academicTerms.push(term);
    saveToLocal('academicTerms', CACHE.academicTerms);
}
export const deleteAcademicTerm = (id: string) => {
    CACHE.academicTerms = CACHE.academicTerms.filter(t => t.id !== id);
    saveToLocal('academicTerms', CACHE.academicTerms);
}
export const setCurrentTerm = (id: string, teacherId?: string) => {
    const terms = getAcademicTerms(teacherId);
    const updated = terms.map(t => ({ ...t, isCurrent: t.id === id }));
    CACHE.academicTerms = updated; // Update memory
    saveToLocal('academicTerms', updated); // Persist
}

export const getStorageStatistics = () => {
    return Object.keys(CACHE).reduce((acc, key) => {
        const val = (CACHE as any)[key];
        acc[key] = Array.isArray(val) ? val.length : 1;
        return acc;
    }, {} as Record<string, number>);
};

// --- Cloud Sync (Graceful) ---

export const downloadFromSupabase = async () => {
    notifySyncStatus('SYNCING');
    try {
        const keys = Object.keys(DB_MAP);
        await Promise.all(keys.map(async (key) => {
            const tableName = DB_MAP[key];
            const { data, error } = await supabase.from(tableName).select('*');
            
            // Graceful handling of errors (like 404 or missing table)
            if (error) {
                console.warn(`Could not sync table ${tableName}: ${error.message}`);
                // Do NOT throw error, allow other tables or local data to persist
                return;
            }
            
            if (data) {
                (CACHE as any)[key] = data;
                localStorage.setItem(key, JSON.stringify(data));
            }
        }));
        notifyDataChanges();
        notifySyncStatus('ONLINE');
    } catch (e) {
        console.error('General Sync failed', e);
        notifySyncStatus('OFFLINE');
        // Do not throw, allow app to continue offline
    }
};

export const uploadToSupabase = async () => {
    notifySyncStatus('SYNCING');
    try {
        const keys = Object.keys(DB_MAP);
        await Promise.all(keys.map(async (key) => {
            const tableName = DB_MAP[key];
            const localData = (CACHE as any)[key];
            if (Array.isArray(localData) && localData.length > 0) {
                // Upsert in chunks to avoid payload limits
                const chunkSize = 100;
                for (let i = 0; i < localData.length; i += chunkSize) {
                    const chunk = localData.slice(i, i + chunkSize);
                    const { error } = await supabase.from(tableName).upsert(chunk);
                    if (error) console.warn(`Upload warning for ${tableName}:`, error.message);
                }
            }
        }));
        notifySyncStatus('ONLINE');
    } catch (e) {
        notifySyncStatus('ERROR');
        console.error('Upload failed', e);
        // Alert user if needed, but don't crash
    }
};

// --- Admin Tools ---

export const createBackup = () => JSON.stringify(CACHE);

export const restoreBackup = (json: string) => {
    try {
        const data = JSON.parse(json);
        Object.keys(data).forEach(key => {
            if ((CACHE as any)[key] !== undefined) {
                (CACHE as any)[key] = data[key];
                saveToLocal(key, data[key]);
            }
        });
        notifyDataChanges();
    } catch (e) {
        console.error("Restore failed", e);
    }
};

export const clearDatabase = () => {
    localStorage.clear();
    Object.keys(CACHE).forEach(key => {
        if(Array.isArray((CACHE as any)[key])) (CACHE as any)[key] = [];
    });
    window.location.reload();
};

export const fetchCloudTableData = async (tableName: string) => {
    const { data } = await supabase.from(tableName).select('*').limit(100);
    return data;
};

export const clearCloudTable = async (tableName: string) => {
    await supabase.from(tableName).delete().neq('id', '0'); // Delete all
};

export const resetCloudDatabase = async () => {
    for (const key of Object.keys(DB_MAP)) {
        await clearCloudTable(DB_MAP[key]);
    }
};

export const backupCloudDatabase = async () => {
    const backup: any = {};
    for (const key of Object.keys(DB_MAP)) {
        const { data } = await supabase.from(DB_MAP[key]).select('*');
        backup[key] = data;
    }
    return JSON.stringify(backup);
};

export const restoreCloudDatabase = async (json: string) => {
    const data = JSON.parse(json);
    for (const key of Object.keys(data)) {
        const tableName = DB_MAP[key];
        if (tableName && Array.isArray(data[key])) {
            await supabase.from(tableName).upsert(data[key]);
        }
    }
};

// SQL Generators
export const getDatabaseSchemaSQL = () => {
    return `
-- 1. Schools
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT,
  ministryCode TEXT,
  managerName TEXT,
  managerNationalId TEXT,
  type TEXT,
  phone TEXT,
  studentCount INTEGER,
  educationAdministration TEXT,
  worksMasterUrl TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Teachers
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  name TEXT,
  nationalId TEXT,
  email TEXT,
  phone TEXT,
  password TEXT,
  subjectSpecialty TEXT,
  schoolId TEXT,
  managerId TEXT,
  subscriptionStatus TEXT,
  subscriptionEndDate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. System Users
CREATE TABLE IF NOT EXISTS system_users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  nationalId TEXT,
  password TEXT,
  role TEXT,
  schoolId TEXT,
  status TEXT,
  isDemo BOOLEAN,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Students
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT,
  nationalId TEXT,
  gradeLevel TEXT,
  className TEXT,
  schoolId TEXT,
  parentId TEXT,
  parentName TEXT,
  parentPhone TEXT,
  parentEmail TEXT,
  password TEXT,
  seatIndex INTEGER,
  createdById TEXT,
  classId TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  studentId TEXT,
  date TEXT,
  status TEXT,
  subject TEXT,
  period INTEGER,
  behaviorStatus TEXT,
  behaviorNote TEXT,
  excuseNote TEXT,
  excuseFile TEXT,
  createdById TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Performance (Grades)
CREATE TABLE IF NOT EXISTS performance (
  id TEXT PRIMARY KEY,
  studentId TEXT,
  subject TEXT,
  title TEXT,
  category TEXT,
  score NUMERIC,
  maxScore NUMERIC,
  date TEXT,
  notes TEXT,
  url TEXT,
  createdById TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Assignments (Columns)
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  title TEXT,
  category TEXT,
  maxScore NUMERIC,
  url TEXT,
  isVisible BOOLEAN,
  orderIndex INTEGER,
  sourceMetadata TEXT,
  teacherId TEXT,
  termId TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY,
  classId TEXT,
  day TEXT,
  period INTEGER,
  subjectName TEXT,
  teacherId TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Teacher Assignments (Class-Subject Links)
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id TEXT PRIMARY KEY,
  classId TEXT,
  subjectName TEXT,
  teacherId TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT,
  teacherId TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Weekly Plans
CREATE TABLE IF NOT EXISTS weekly_plans (
  id TEXT PRIMARY KEY,
  teacherId TEXT,
  classId TEXT,
  subjectName TEXT,
  day TEXT,
  period INTEGER,
  weekStartDate TEXT,
  lessonTopic TEXT,
  homework TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Lesson Links
CREATE TABLE IF NOT EXISTS lesson_links (
  id TEXT PRIMARY KEY,
  title TEXT,
  url TEXT,
  teacherId TEXT,
  createdAt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Lesson Plans (Detailed)
CREATE TABLE IF NOT EXISTS lesson_plans (
  id TEXT PRIMARY KEY,
  teacherId TEXT,
  lessonId TEXT,
  subject TEXT,
  topic TEXT,
  contentJson TEXT,
  resources JSONB,
  createdAt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Custom Tables
CREATE TABLE IF NOT EXISTS custom_tables (
  id TEXT PRIMARY KEY,
  name TEXT,
  createdAt TEXT,
  columns JSONB,
  rows JSONB,
  sourceUrl TEXT,
  lastUpdated TEXT,
  teacherId TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Message Logs
CREATE TABLE IF NOT EXISTS message_logs (
  id TEXT PRIMARY KEY,
  studentId TEXT,
  studentName TEXT,
  parentPhone TEXT,
  type TEXT,
  content TEXT,
  status TEXT,
  date TEXT,
  sentBy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  teacherId TEXT,
  managerId TEXT,
  content TEXT,
  date TEXT,
  isRead BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Exams
CREATE TABLE IF NOT EXISTS exams (
  id TEXT PRIMARY KEY,
  title TEXT,
  subject TEXT,
  gradeLevel TEXT,
  durationMinutes INTEGER,
  questions JSONB,
  isActive BOOLEAN,
  createdAt TEXT,
  teacherId TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Exam Results
CREATE TABLE IF NOT EXISTS exam_results (
  id TEXT PRIMARY KEY,
  examId TEXT,
  studentId TEXT,
  studentName TEXT,
  score NUMERIC,
  totalScore NUMERIC,
  date TEXT,
  answers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Questions Bank
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  text TEXT,
  type TEXT,
  options JSONB,
  correctAnswer TEXT,
  points INTEGER,
  subject TEXT,
  gradeLevel TEXT,
  topic TEXT,
  difficulty TEXT,
  teacherId TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Curriculum Units
CREATE TABLE IF NOT EXISTS curriculum_units (
  id TEXT PRIMARY KEY,
  teacherId TEXT,
  subject TEXT,
  gradeLevel TEXT,
  title TEXT,
  orderIndex INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21. Curriculum Lessons
CREATE TABLE IF NOT EXISTS curriculum_lessons (
  id TEXT PRIMARY KEY,
  unitId TEXT,
  title TEXT,
  orderIndex INTEGER,
  learningStandards JSONB,
  microConceptIds JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 22. Micro Concepts
CREATE TABLE IF NOT EXISTS micro_concepts (
  id TEXT PRIMARY KEY,
  teacherId TEXT,
  subject TEXT,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 23. Tracking Sheets
CREATE TABLE IF NOT EXISTS tracking_sheets (
  id TEXT PRIMARY KEY,
  title TEXT,
  subject TEXT,
  className TEXT,
  teacherId TEXT,
  createdAt TEXT,
  columns JSONB,
  scores JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 24. Academic Terms
CREATE TABLE IF NOT EXISTS academic_terms (
  id TEXT PRIMARY KEY,
  name TEXT,
  startDate TEXT,
  endDate TEXT,
  isCurrent BOOLEAN,
  teacherId TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;
};

export const getDatabaseUpdateSQL = () => {
    return `
-- Use this block only if you are updating an existing database to add new features
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS termId TEXT;

CREATE TABLE IF NOT EXISTS academic_terms (
  id TEXT PRIMARY KEY,
  name TEXT,
  startDate TEXT,
  endDate TEXT,
  isCurrent BOOLEAN,
  teacherId TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;
};
