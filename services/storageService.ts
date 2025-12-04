
import { 
    Student, AttendanceRecord, PerformanceRecord, Teacher, Parent, 
    Subject, ScheduleItem, School, SystemUser, CustomTable, 
    Assignment, MessageLog, ReportHeaderConfig, PerformanceCategory, TeacherAssignment
} from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
    STUDENTS: 'app_students',
    ATTENDANCE: 'app_attendance',
    PERFORMANCE: 'app_performance',
    TEACHERS: 'app_teachers',
    PARENTS: 'app_parents',
    SUBJECTS: 'app_subjects',
    SCHEDULES: 'app_schedules',
    SCHOOLS: 'app_schools',
    USERS: 'app_users',
    CUSTOM_TABLES: 'app_custom_tables',
    ASSIGNMENTS: 'app_assignments',
    MESSAGES: 'app_messages',
    REPORT_CONFIG: 'app_report_config',
    WORKS_URL: 'app_works_master_url',
    TEACHER_ASSIGNMENTS: 'app_teacher_assignments'
};

export const DB_MAP: Record<string, string> = {
    students: 'students',
    attendance: 'attendance_records',
    performance: 'performance_records',
    teachers: 'teachers',
    parents: 'parents',
    subjects: 'subjects',
    schedules: 'weekly_schedules',
    schools: 'schools',
    users: 'system_users',
    assignments: 'assignments',
    messages: 'messages',
    teacher_assignments: 'teacher_assignments'
};

// --- In-Memory State ---
let _students: Student[] = [];
let _attendance: AttendanceRecord[] = [];
let _performance: PerformanceRecord[] = [];
let _teachers: Teacher[] = [];
let _parents: Parent[] = [];
let _subjects: Subject[] = [];
let _schedules: ScheduleItem[] = [];
let _schools: School[] = [];
let _users: SystemUser[] = [];
let _customTables: CustomTable[] = [];
let _assignments: Assignment[] = [];
let _messages: MessageLog[] = [];
let _teacherAssignments: TeacherAssignment[] = [];
let _reportConfig: ReportHeaderConfig = { 
    schoolName: '', educationAdmin: '', teacherName: '', 
    schoolManager: '', academicYear: '', term: '', logoBase64: '' 
};
let _worksMasterUrl: string = '';

// --- Helpers ---
const loadLocal = <T>(key: string, defaultVal: T): T => {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultVal;
    try {
        return JSON.parse(saved);
    } catch (e) {
        // Fallback: If parsing fails and we expect a string, assume it's a raw string
        if (typeof defaultVal === 'string') {
            return saved as unknown as T;
        }
        console.warn(`Failed to parse local storage key "${key}". Returning default value.`);
        return defaultVal;
    }
};

const saveLocal = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// Initial Load
const loadAll = () => {
    _students = loadLocal(STORAGE_KEYS.STUDENTS, []);
    _attendance = loadLocal(STORAGE_KEYS.ATTENDANCE, []);
    _performance = loadLocal(STORAGE_KEYS.PERFORMANCE, []);
    _teachers = loadLocal(STORAGE_KEYS.TEACHERS, []);
    _parents = loadLocal(STORAGE_KEYS.PARENTS, []);
    _subjects = loadLocal(STORAGE_KEYS.SUBJECTS, []);
    _schedules = loadLocal(STORAGE_KEYS.SCHEDULES, []);
    _schools = loadLocal(STORAGE_KEYS.SCHOOLS, []);
    _teacherAssignments = loadLocal(STORAGE_KEYS.TEACHER_ASSIGNMENTS, []);
    
    // Users Logic: Ensure Admin Exists ALWAYS
    _users = loadLocal(STORAGE_KEYS.USERS, []);
    const adminExists = _users.some(u => u.email === 'admin@school.com');
    if (!adminExists || _users.length === 0) {
        const defaultAdmin: SystemUser = {
            id: 'default_admin',
            name: 'المدير العام',
            email: 'admin@school.com',
            password: '123',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE'
        };
        _users = [defaultAdmin, ..._users.filter(u => u.email !== 'admin@school.com')];
        saveLocal(STORAGE_KEYS.USERS, _users);
    }

    _customTables = loadLocal(STORAGE_KEYS.CUSTOM_TABLES, []);
    _assignments = loadLocal(STORAGE_KEYS.ASSIGNMENTS, []);
    _messages = loadLocal(STORAGE_KEYS.MESSAGES, []);
    _reportConfig = loadLocal(STORAGE_KEYS.REPORT_CONFIG, _reportConfig);
    _worksMasterUrl = loadLocal(STORAGE_KEYS.WORKS_URL, '');
};

loadAll();

// ================= EXPORTS =================

// --- Students ---
export const getStudents = (): Student[] => [..._students];
export const addStudent = (student: Student) => {
    if (!student.nationalId && !student.id) throw new Error("رقم الهوية إلزامي.");
    if (_students.some(s => s.nationalId === student.nationalId && s.id !== student.id)) throw new Error("رقم الهوية مسجل مسبقاً.");
    _students.push(student);
    saveLocal(STORAGE_KEYS.STUDENTS, _students);
};
export const updateStudent = (updatedStudent: Student) => {
    const index = _students.findIndex(s => s.id === updatedStudent.id);
    if (index !== -1) {
        _students[index] = updatedStudent;
        saveLocal(STORAGE_KEYS.STUDENTS, _students);
    }
};
export const bulkUpdateStudents = (updates: Student[]) => {
    const updateMap = new Map(updates.map(s => [s.id, s]));
    _students = _students.map(s => updateMap.has(s.id) ? { ...s, ...updateMap.get(s.id)! } : s);
    saveLocal(STORAGE_KEYS.STUDENTS, _students);
};
export const deleteStudent = (id: string) => {
    _students = _students.filter(s => s.id !== id);
    saveLocal(STORAGE_KEYS.STUDENTS, _students);
};
export const deleteAllStudents = () => {
    _students = [];
    saveLocal(STORAGE_KEYS.STUDENTS, _students);
};
export const bulkAddStudents = (newStudents: Student[]) => {
    // Avoid duplicates by ID
    const existingIds = new Set(_students.map(s => s.id));
    const toAdd = newStudents.filter(s => !existingIds.has(s.id));
    _students.push(...toAdd);
    saveLocal(STORAGE_KEYS.STUDENTS, _students);
};
export const bulkUpsertStudents = (
    list: Student[], 
    matchKey: keyof Student = 'nationalId', 
    strategy: 'UPDATE' | 'SKIP' | 'NEW' = 'UPDATE',
    updateFields: string[] = []
) => {
    list.forEach(incoming => {
        const existingIndex = _students.findIndex(s => s[matchKey] === incoming[matchKey]);
        
        if (existingIndex !== -1) {
            if (strategy === 'UPDATE') {
                const existing = _students[existingIndex];
                const updated = { ...existing };
                // Only update allowed fields
                updateFields.forEach(field => {
                    if ((incoming as any)[field] !== undefined) {
                        (updated as any)[field] = (incoming as any)[field];
                    }
                });
                _students[existingIndex] = updated;
            }
            // If SKIP, do nothing
        } else {
            // NEW
            _students.push(incoming);
        }
    });
    saveLocal(STORAGE_KEYS.STUDENTS, _students);
};

// --- Attendance ---
export const getAttendance = (): AttendanceRecord[] => [..._attendance];
export const saveAttendance = (records: AttendanceRecord[]) => {
    // Upsert logic
    records.forEach(record => {
        const index = _attendance.findIndex(a => a.id === record.id);
        if (index !== -1) _attendance[index] = record;
        else _attendance.push(record);
    });
    saveLocal(STORAGE_KEYS.ATTENDANCE, _attendance);
};
export const bulkAddAttendance = (list: AttendanceRecord[]) => {
    const existingMap = new Map(_attendance.map(a => [a.id, a]));
    list.forEach(a => existingMap.set(a.id, a));
    _attendance = Array.from(existingMap.values());
    saveLocal(STORAGE_KEYS.ATTENDANCE, _attendance);
};

// --- Performance ---
export const getPerformance = (): PerformanceRecord[] => [..._performance];
export const addPerformance = (record: PerformanceRecord) => {
    _performance.push(record);
    saveLocal(STORAGE_KEYS.PERFORMANCE, _performance);
};
export const bulkAddPerformance = (list: PerformanceRecord[]) => {
    // Usually append for performance unless ID matches
    const existingMap = new Map(_performance.map(p => [p.id, p]));
    list.forEach(p => existingMap.set(p.id, p));
    _performance = Array.from(existingMap.values());
    saveLocal(STORAGE_KEYS.PERFORMANCE, _performance);
};

// --- Teachers ---
export const getTeachers = (): Teacher[] => [..._teachers];
export const addTeacher = (t: Teacher) => {
    _teachers.push(t);
    saveLocal(STORAGE_KEYS.TEACHERS, _teachers);
};
export const deleteTeacher = (id: string) => {
    _teachers = _teachers.filter(t => t.id !== id);
    saveLocal(STORAGE_KEYS.TEACHERS, _teachers);
};

// --- Teacher Assignments ---
export const getTeacherAssignments = (): TeacherAssignment[] => [..._teacherAssignments];
export const saveTeacherAssignment = (assignment: TeacherAssignment) => {
    // Remove existing if class+subject matches, then add
    const existsIndex = _teacherAssignments.findIndex(ta => ta.classId === assignment.classId && ta.subjectName === assignment.subjectName);
    if (existsIndex !== -1) {
        _teacherAssignments[existsIndex] = assignment; // Update
    } else {
        _teacherAssignments.push(assignment); // Add
    }
    saveLocal(STORAGE_KEYS.TEACHER_ASSIGNMENTS, _teacherAssignments);
};
export const deleteTeacherAssignment = (id: string) => {
    _teacherAssignments = _teacherAssignments.filter(ta => ta.id !== id);
    saveLocal(STORAGE_KEYS.TEACHER_ASSIGNMENTS, _teacherAssignments);
};

// --- Parents ---
export const getParents = (): Parent[] => [..._parents];
export const addParent = (p: Parent) => {
    _parents.push(p);
    saveLocal(STORAGE_KEYS.PARENTS, _parents);
};
export const deleteParent = (id: string) => {
    _parents = _parents.filter(p => p.id !== id);
    saveLocal(STORAGE_KEYS.PARENTS, _parents);
};

// --- Subjects ---
export const getSubjects = (): Subject[] => [..._subjects];
export const addSubject = (s: Subject) => {
    _subjects.push(s);
    saveLocal(STORAGE_KEYS.SUBJECTS, _subjects);
};
export const deleteSubject = (id: string) => {
    _subjects = _subjects.filter(s => s.id !== id);
    saveLocal(STORAGE_KEYS.SUBJECTS, _subjects);
};

// --- Schedules ---
export const getSchedules = (): ScheduleItem[] => [..._schedules];
export const saveScheduleItem = (item: ScheduleItem) => {
    const idx = _schedules.findIndex(s => s.id === item.id);
    if (idx !== -1) _schedules[idx] = item;
    else _schedules.push(item);
    saveLocal(STORAGE_KEYS.SCHEDULES, _schedules);
};
export const deleteScheduleItem = (id: string) => {
    _schedules = _schedules.filter(s => s.id !== id);
    saveLocal(STORAGE_KEYS.SCHEDULES, _schedules);
};

// --- Schools ---
export const getSchools = (): School[] => [..._schools];
export const addSchool = (s: School) => {
    _schools.push(s);
    saveLocal(STORAGE_KEYS.SCHOOLS, _schools);
};
export const deleteSchool = (id: string) => {
    _schools = _schools.filter(s => s.id !== id);
    saveLocal(STORAGE_KEYS.SCHOOLS, _schools);
};

// --- Users ---
export const getSystemUsers = (): SystemUser[] => [..._users];
export const addSystemUser = (u: SystemUser) => {
    _users.push(u);
    saveLocal(STORAGE_KEYS.USERS, _users);
};
export const updateSystemUser = (u: SystemUser) => {
    const idx = _users.findIndex(user => user.id === u.id);
    if (idx !== -1) {
        _users[idx] = u;
        saveLocal(STORAGE_KEYS.USERS, _users);
    }
};
export const deleteSystemUser = (id: string) => {
    _users = _users.filter(u => u.id !== id);
    saveLocal(STORAGE_KEYS.USERS, _users);
};

// --- Custom Tables ---
export const getCustomTables = (): CustomTable[] => [..._customTables];
export const addCustomTable = (t: CustomTable) => {
    _customTables.push(t);
    saveLocal(STORAGE_KEYS.CUSTOM_TABLES, _customTables);
};
export const updateCustomTable = (t: CustomTable) => {
    const idx = _customTables.findIndex(ct => ct.id === t.id);
    if (idx !== -1) {
        _customTables[idx] = t;
        saveLocal(STORAGE_KEYS.CUSTOM_TABLES, _customTables);
    }
};
export const deleteCustomTable = (id: string) => {
    _customTables = _customTables.filter(t => t.id !== id);
    saveLocal(STORAGE_KEYS.CUSTOM_TABLES, _customTables);
};

// --- Assignments ---
export const getAssignments = (category?: PerformanceCategory): Assignment[] => {
    if (category) return _assignments.filter(a => a.category === category);
    return [..._assignments];
};
export const saveAssignment = (a: Assignment) => {
    const idx = _assignments.findIndex(exist => exist.id === a.id);
    if (idx !== -1) _assignments[idx] = a;
    else _assignments.push(a);
    saveLocal(STORAGE_KEYS.ASSIGNMENTS, _assignments);
};
export const bulkSaveAssignments = (list: Assignment[]) => {
    const map = new Map(_assignments.map(a => [a.id, a]));
    list.forEach(a => map.set(a.id, a));
    _assignments = Array.from(map.values());
    saveLocal(STORAGE_KEYS.ASSIGNMENTS, _assignments);
};
export const deleteAssignment = (id: string) => {
    _assignments = _assignments.filter(a => a.id !== id);
    saveLocal(STORAGE_KEYS.ASSIGNMENTS, _assignments);
};

// --- Messages ---
export const getMessages = (): MessageLog[] => [..._messages];
export const saveMessage = (m: MessageLog) => {
    _messages.unshift(m); // Add to beginning
    saveLocal(STORAGE_KEYS.MESSAGES, _messages);
};

// --- Config ---
export const getReportHeaderConfig = (): ReportHeaderConfig => ({..._reportConfig});
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    _reportConfig = config;
    saveLocal(STORAGE_KEYS.REPORT_CONFIG, _reportConfig);
};

export const getWorksMasterUrl = (): string => _worksMasterUrl;
export const saveWorksMasterUrl = (url: string) => {
    _worksMasterUrl = url;
    saveLocal(STORAGE_KEYS.WORKS_URL, url);
};

// --- Sync & Backup ---
export const initAutoSync = async () => {
    // Check if connected and maybe pull latest if needed
    // Implementation placeholder
    return Promise.resolve();
};

export const createBackup = () => {
    const backup = {
        students: _students,
        attendance: _attendance,
        performance: _performance,
        teachers: _teachers,
        parents: _parents,
        subjects: _subjects,
        schedules: _schedules,
        schools: _schools,
        users: _users,
        customTables: _customTables,
        assignments: _assignments,
        messages: _messages,
        reportConfig: _reportConfig,
        worksUrl: _worksMasterUrl,
        teacherAssignments: _teacherAssignments,
        timestamp: new Date().toISOString()
    };
    return JSON.stringify(backup);
};

export const restoreBackup = (jsonContent: string) => {
    try {
        const data = JSON.parse(jsonContent);
        if (data.students) saveLocal(STORAGE_KEYS.STUDENTS, (_students = data.students));
        if (data.attendance) saveLocal(STORAGE_KEYS.ATTENDANCE, (_attendance = data.attendance));
        if (data.performance) saveLocal(STORAGE_KEYS.PERFORMANCE, (_performance = data.performance));
        if (data.teachers) saveLocal(STORAGE_KEYS.TEACHERS, (_teachers = data.teachers));
        if (data.parents) saveLocal(STORAGE_KEYS.PARENTS, (_parents = data.parents));
        if (data.subjects) saveLocal(STORAGE_KEYS.SUBJECTS, (_subjects = data.subjects));
        if (data.schedules) saveLocal(STORAGE_KEYS.SCHEDULES, (_schedules = data.schedules));
        if (data.schools) saveLocal(STORAGE_KEYS.SCHOOLS, (_schools = data.schools));
        if (data.users) saveLocal(STORAGE_KEYS.USERS, (_users = data.users));
        if (data.customTables) saveLocal(STORAGE_KEYS.CUSTOM_TABLES, (_customTables = data.customTables));
        if (data.assignments) saveLocal(STORAGE_KEYS.ASSIGNMENTS, (_assignments = data.assignments));
        if (data.messages) saveLocal(STORAGE_KEYS.MESSAGES, (_messages = data.messages));
        if (data.reportConfig) saveLocal(STORAGE_KEYS.REPORT_CONFIG, (_reportConfig = data.reportConfig));
        if (data.worksUrl) saveLocal(STORAGE_KEYS.WORKS_URL, (_worksMasterUrl = data.worksUrl));
        if (data.teacherAssignments) saveLocal(STORAGE_KEYS.TEACHER_ASSIGNMENTS, (_teacherAssignments = data.teacherAssignments));
        return true;
    } catch (e) {
        console.error("Backup restore failed", e);
        return false;
    }
};

export const clearDatabase = () => {
    localStorage.clear();
    loadAll();
};

// --- Cloud Functions ---
export const checkConnection = async () => {
    const start = Date.now();
    try {
        const { error } = await supabase.from('schools').select('id').limit(1);
        if (error) throw error;
        return { success: true, latency: Date.now() - start };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const getStorageStatistics = () => ({
    students: _students.length,
    attendance: _attendance.length,
    performance: _performance.length,
    teachers: _teachers.length,
    users: _users.length,
    assignments: _assignments.length,
    schools: _schools.length
});

export const getCloudStatistics = async () => {
    const getCount = async (table: string) => {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        return error ? -1 : count;
    };
    return {
        students: await getCount('students'),
        attendance_records: await getCount('attendance_records'),
        performance_records: await getCount('performance_records'),
        teachers: await getCount('teachers'),
        system_users: await getCount('system_users'),
        assignments: await getCount('assignments'),
        schools: await getCount('schools'),
    };
};

export const fetchCloudTableData = async (table: string) => {
    const { data, error } = await supabase.from(table).select('*').limit(50);
    if (error) throw error;
    return data;
};

// --- DATA MAPPERS (CamelCase <-> SnakeCase) ---

const mapStudentToDB = (s: Student) => ({
    id: s.id,
    name: s.name,
    national_id: s.nationalId,
    grade_level: s.gradeLevel,
    class_name: s.className,
    class_id: s.classId,
    phone: s.phone,
    email: s.email,
    parent_name: s.parentName,
    parent_phone: s.parentPhone,
    parent_email: s.parentEmail,
    seat_index: s.seatIndex,
    password: s.password
});

const mapStudentFromDB = (s: any): Student => ({
    id: s.id,
    name: s.name,
    nationalId: s.national_id,
    gradeLevel: s.grade_level,
    className: s.class_name,
    classId: s.class_id,
    phone: s.phone,
    email: s.email,
    parentName: s.parent_name,
    parentPhone: s.parent_phone,
    parentEmail: s.parent_email,
    seatIndex: s.seat_index,
    password: s.password
});

const mapAttendanceToDB = (a: AttendanceRecord) => ({
    id: a.id,
    student_id: a.studentId,
    date: a.date,
    status: a.status,
    subject: a.subject,
    period: a.period,
    behavior_status: a.behaviorStatus,
    behavior_note: a.behaviorNote,
    excuse_note: a.excuseNote,
    excuse_file: a.excuseFile
});

const mapAttendanceFromDB = (a: any): AttendanceRecord => ({
    id: a.id,
    studentId: a.student_id,
    date: a.date,
    status: a.status,
    subject: a.subject,
    // Ensure period is always a number or undefined, never string "1"
    period: (a.period !== undefined && a.period !== null) ? Number(a.period) : undefined,
    behaviorStatus: a.behavior_status,
    behaviorNote: a.behavior_note,
    excuseNote: a.excuse_note,
    excuseFile: a.excuse_file
});

const mapPerformanceToDB = (p: PerformanceRecord) => ({
    id: p.id,
    student_id: p.studentId,
    subject: p.subject,
    title: p.title,
    score: p.score,
    max_score: p.maxScore,
    date: p.date,
    notes: p.notes,
    category: p.category,
    url: p.url
});

const mapPerformanceFromDB = (p: any): PerformanceRecord => ({
    id: p.id,
    studentId: p.student_id,
    subject: p.subject,
    title: p.title,
    score: p.score,
    maxScore: p.max_score,
    date: p.date,
    notes: p.notes,
    category: p.category,
    url: p.url
});

export const uploadToSupabase = async () => {
    const upsert = async (table: string, data: any[]) => {
        if (data.length === 0) return;
        const { error } = await supabase.from(table).upsert(data);
        if (error) throw new Error(`Error uploading ${table}: ${error.message}`);
    };

    await upsert('schools', _schools.map(s => ({
        ...s,
        education_administration: s.educationAdministration,
        manager_name: s.managerName,
        student_count: s.studentCount,
        subscription_status: s.subscriptionStatus,
        works_master_url: s.worksMasterUrl
    })));
    await upsert('teachers', _teachers.map(t => ({...t, subject_specialty: t.subjectSpecialty})));
    await upsert('parents', _parents);
    await upsert('subjects', _subjects);
    await upsert('system_users', _users.map(u => ({...u, school_id: u.schoolId})));
    await upsert('assignments', _assignments.map(a => ({...a, max_score: a.maxScore, is_visible: a.isVisible, order_index: a.orderIndex, source_metadata: a.sourceMetadata})));
    
    // Map Students
    const mappedStudents = _students.map(mapStudentToDB);
    await upsert('students', mappedStudents);
    
    // Map Teacher Assignments
    const mappedAssigns = _teacherAssignments.map(ta => ({
        id: ta.id,
        class_id: ta.classId,
        subject_name: ta.subjectName,
        teacher_id: ta.teacherId
    }));
    await upsert('teacher_assignments', mappedAssigns);

    // Chunk large tables & Map
    const chunk = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    
    const mappedAtt = _attendance.map(mapAttendanceToDB);
    for (const batch of chunk(mappedAtt, 500)) await upsert('attendance_records', batch);
    
    const mappedPerf = _performance.map(mapPerformanceToDB);
    for (const batch of chunk(mappedPerf, 500)) await upsert('performance_records', batch);
    
    const mappedSched = _schedules.map(s => ({...s, class_id: s.classId, subject_name: s.subjectName}));
    for (const batch of chunk(mappedSched, 500)) await upsert('weekly_schedules', batch);
    
    const mappedMsg = _messages.map(m => ({...m, student_id: m.studentId, student_name: m.studentName, parent_phone: m.parentPhone, sent_by: m.sentBy}));
    for (const batch of chunk(mappedMsg, 500)) await upsert('messages', batch);
};

export const downloadFromSupabase = async () => {
    const fetchTable = async (table: string) => {
        const { data, error } = await supabase.from(table).select('*');
        if (error) throw error;
        return data;
    };

    const schools = await fetchTable('schools');
    if (schools) { 
        _schools = schools.map((s: any) => ({
            ...s,
            educationAdministration: s.education_administration,
            managerName: s.manager_name,
            studentCount: s.student_count,
            subscriptionStatus: s.subscription_status,
            worksMasterUrl: s.works_master_url
        })); 
        saveLocal(STORAGE_KEYS.SCHOOLS, _schools); 
    }

    const students = await fetchTable('students');
    if (students) { 
        _students = students.map(mapStudentFromDB); 
        saveLocal(STORAGE_KEYS.STUDENTS, _students); 
    }

    const attendance = await fetchTable('attendance_records');
    if (attendance) { 
        _attendance = attendance.map(mapAttendanceFromDB); 
        saveLocal(STORAGE_KEYS.ATTENDANCE, _attendance); 
    }

    const performance = await fetchTable('performance_records');
    if (performance) { 
        _performance = performance.map(mapPerformanceFromDB); 
        saveLocal(STORAGE_KEYS.PERFORMANCE, _performance); 
    }

    const teachers = await fetchTable('teachers');
    if (teachers) { 
        _teachers = teachers.map((t: any) => ({...t, subjectSpecialty: t.subject_specialty})); 
        saveLocal(STORAGE_KEYS.TEACHERS, _teachers); 
    }

    const parents = await fetchTable('parents');
    if (parents) { _parents = parents; saveLocal(STORAGE_KEYS.PARENTS, _parents); }

    const subjects = await fetchTable('subjects');
    if (subjects) { _subjects = subjects; saveLocal(STORAGE_KEYS.SUBJECTS, _subjects); }

    const teacherAssigns = await fetchTable('teacher_assignments');
    if (teacherAssigns) {
        _teacherAssignments = teacherAssigns.map((ta: any) => ({
            id: ta.id,
            classId: ta.class_id,
            subjectName: ta.subject_name,
            teacherId: ta.teacher_id
        }));
        saveLocal(STORAGE_KEYS.TEACHER_ASSIGNMENTS, _teacherAssignments);
    }

    const schedules = await fetchTable('weekly_schedules');
    if (schedules) { 
        _schedules = schedules.map((s: any) => ({...s, classId: s.class_id, subjectName: s.subject_name})); 
        saveLocal(STORAGE_KEYS.SCHEDULES, _schedules); 
    }

    const users = await fetchTable('system_users');
    if (users) { 
        _users = users.map((u: any) => ({...u, schoolId: u.school_id})); 
        saveLocal(STORAGE_KEYS.USERS, _users); 
    }

    const assignments = await fetchTable('assignments');
    if (assignments) { 
        _assignments = assignments.map((a: any) => ({...a, maxScore: a.max_score, isVisible: a.is_visible, orderIndex: a.order_index, sourceMetadata: a.source_metadata})); 
        saveLocal(STORAGE_KEYS.ASSIGNMENTS, _assignments); 
    }

    const messages = await fetchTable('messages');
    if (messages) { 
        _messages = messages.map((m: any) => ({...m, studentId: m.student_id, studentName: m.student_name, parentPhone: m.parent_phone, sentBy: m.sent_by})); 
        saveLocal(STORAGE_KEYS.MESSAGES, _messages); 
    }
};

export const getTableDisplayName = (table: string) => {
    switch (table) {
        case 'students': return 'الطلاب';
        case 'attendance_records': return 'الحضور';
        case 'performance_records': return 'الأداء';
        case 'teachers': return 'المعلمين';
        case 'parents': return 'أولياء الأمور';
        case 'subjects': return 'المواد';
        case 'weekly_schedules': return 'الجدول';
        case 'schools': return 'المدارس';
        case 'system_users': return 'المستخدمين';
        case 'assignments': return 'الواجبات/الروابط';
        case 'messages': return 'الرسائل';
        case 'teacher_assignments': return 'توزيع المعلمين';
        default: return table;
    }
};
