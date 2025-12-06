
import { Student, AttendanceRecord, PerformanceRecord, School, SystemUser, Teacher, Parent, Subject, ScheduleItem, ReportHeaderConfig, CustomTable, Assignment, MessageLog, TeacherAssignment, LessonLink, AISettings, Feedback } from '../types';
import { supabase } from './supabaseClient';

const BASE_KEYS = {
  STUDENTS: 'students',
  ATTENDANCE: 'attendance',
  PERFORMANCE: 'performance',
  TEACHERS: 'teachers',
  PARENTS: 'parents',
  SUBJECTS: 'subjects',
  SCHEDULES: 'schedules',
  SCHOOLS: 'schools',
  SYSTEM_USERS: 'system_users',
  CONFIG: 'app_config',
  CUSTOM_TABLES: 'custom_tables',
  ASSIGNMENTS: 'assignments',
  MESSAGES: 'messages',
  TEACHER_ASSIGNMENTS: 'teacher_assignments',
  WORKS_MASTER_URL: 'works_master_url',
  LESSON_LINKS: 'lesson_links',
  AI_SETTINGS: 'ai_settings',
  FEEDBACK: 'feedback'
};

// Internal Cache
let _students: Student[] = [];
let _attendance: AttendanceRecord[] = [];
let _performance: PerformanceRecord[] = [];
let _teachers: Teacher[] = [];
let _parents: Parent[] = [];
let _subjects: Subject[] = [];
let _schedules: ScheduleItem[] = [];
let _schools: School[] = [];
let _systemUsers: SystemUser[] = [];
let _customTables: CustomTable[] = [];
let _assignments: Assignment[] = [];
let _messages: MessageLog[] = [];
let _teacherAssignments: TeacherAssignment[] = [];
let _lessonLinks: LessonLink[] = [];
let _feedback: Feedback[] = [];
let _reportConfig: ReportHeaderConfig = { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '1447هـ', term: '' };
let _worksMasterUrl: string = '';
let _aiSettings: AISettings = {
    modelId: 'gemini-2.5-flash',
    temperature: 0.7,
    enableReports: true,
    enableQuiz: true,
    enablePlanning: true,
    systemInstruction: 'أنت مساعد تعليمي خبير في المناهج السعودية (1447هـ). استخدم لغة عربية تربوية واضحة.'
};

let isDemoMode = false;

// Helpers
const saveLocal = (key: string, data: any) => {
  if (isDemoMode) return; // Don't save to LS in demo mode (optional, but good for separation)
  try {
      localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
      console.error("Error saving to localStorage (Quota might be exceeded):", e);
  }
};

const loadLocal = <T>(key: string, defaultVal: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return defaultVal;
  try {
      return JSON.parse(saved);
  } catch (e) {
      console.error(`Error parsing data for key ${key}:`, e);
      return defaultVal;
  }
};

// --- Cloud Sync (Supabase) ---
// Simple mapping of local keys to Supabase table names
export const DB_MAP: Record<string, string> = {
    [BASE_KEYS.STUDENTS]: 'students',
    [BASE_KEYS.ATTENDANCE]: 'attendance_records',
    [BASE_KEYS.PERFORMANCE]: 'performance_records',
    [BASE_KEYS.TEACHERS]: 'teachers',
    [BASE_KEYS.PARENTS]: 'parents',
    [BASE_KEYS.SUBJECTS]: 'subjects',
    [BASE_KEYS.SCHEDULES]: 'weekly_schedules',
    [BASE_KEYS.SCHOOLS]: 'schools',
    [BASE_KEYS.SYSTEM_USERS]: 'system_users',
    [BASE_KEYS.ASSIGNMENTS]: 'assignments',
    [BASE_KEYS.MESSAGES]: 'messages',
    [BASE_KEYS.TEACHER_ASSIGNMENTS]: 'teacher_assignments'
};

export const getTableDisplayName = (tableName: string) => tableName;

export const downloadFromSupabase = async () => {
    const fetchTable = async (key: string) => {
        const table = DB_MAP[key];
        if (!table) return;
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) {
            saveLocal(key, data);
        }
    };

    const promises = Object.keys(DB_MAP).map(key => fetchTable(key));
    await Promise.all(promises);
    
    // Refresh memory after download
    _students = loadLocal(BASE_KEYS.STUDENTS, []);
    _attendance = loadLocal(BASE_KEYS.ATTENDANCE, []);
    _performance = loadLocal(BASE_KEYS.PERFORMANCE, []);
    _teachers = loadLocal(BASE_KEYS.TEACHERS, []);
    _parents = loadLocal(BASE_KEYS.PARENTS, []);
    _subjects = loadLocal(BASE_KEYS.SUBJECTS, []);
    _schedules = loadLocal(BASE_KEYS.SCHEDULES, []);
    _schools = loadLocal(BASE_KEYS.SCHOOLS, []);
    _systemUsers = loadLocal(BASE_KEYS.SYSTEM_USERS, []);
    _assignments = loadLocal(BASE_KEYS.ASSIGNMENTS, []);
    _messages = loadLocal(BASE_KEYS.MESSAGES, []);
    _teacherAssignments = loadLocal(BASE_KEYS.TEACHER_ASSIGNMENTS, []);
};

export const uploadToSupabase = async () => {
    const uploadTable = async (key: string, data: any[]) => {
        const table = DB_MAP[key];
        if (!table || data.length === 0) return;
        
        // 2. Upsert
        const { error } = await supabase.from(table).upsert(data);
        if (error) throw new Error(`Failed to upload ${table}: ${error.message}`);
    };

    await uploadTable(BASE_KEYS.STUDENTS, _students);
    await uploadTable(BASE_KEYS.ATTENDANCE, _attendance);
    await uploadTable(BASE_KEYS.PERFORMANCE, _performance);
    await uploadTable(BASE_KEYS.TEACHERS, _teachers);
    await uploadTable(BASE_KEYS.SYSTEM_USERS, _systemUsers);
    await uploadTable(BASE_KEYS.ASSIGNMENTS, _assignments);
    await uploadTable(BASE_KEYS.TEACHER_ASSIGNMENTS, _teacherAssignments);
    await uploadTable(BASE_KEYS.SCHEDULES, _schedules);
    await uploadTable(BASE_KEYS.PARENTS, _parents);
    await uploadTable(BASE_KEYS.SUBJECTS, _subjects);
    await uploadTable(BASE_KEYS.SCHOOLS, _schools);
    await uploadTable(BASE_KEYS.MESSAGES, _messages);
};

// --- NEW: Clear Cloud Data ---
export const clearCloudTable = async (tableName: string) => {
    // Delete all records where ID is not '00000' (effectively all, assuming IDs are real strings)
    const { error } = await supabase.from(tableName).delete().neq('id', '00000');
    if (error) throw new Error(`Failed to clear table ${tableName}: ${error.message}`);
};

export const resetCloudDatabase = async () => {
    const tables = Object.values(DB_MAP);
    for (const table of tables) {
        await clearCloudTable(table);
    }
};

// --- Initialization ---
export const initAutoSync = async () => {
  _students = loadLocal(BASE_KEYS.STUDENTS, []);
  _attendance = loadLocal(BASE_KEYS.ATTENDANCE, []);
  _performance = loadLocal(BASE_KEYS.PERFORMANCE, []);
  _teachers = loadLocal(BASE_KEYS.TEACHERS, []);
  _parents = loadLocal(BASE_KEYS.PARENTS, []);
  _subjects = loadLocal(BASE_KEYS.SUBJECTS, []);
  _schedules = loadLocal(BASE_KEYS.SCHEDULES, []);
  _schools = loadLocal(BASE_KEYS.SCHOOLS, []);
  _systemUsers = loadLocal(BASE_KEYS.SYSTEM_USERS, []);
  _customTables = loadLocal(BASE_KEYS.CUSTOM_TABLES, []);
  _assignments = loadLocal(BASE_KEYS.ASSIGNMENTS, []);
  _messages = loadLocal(BASE_KEYS.MESSAGES, []);
  _teacherAssignments = loadLocal(BASE_KEYS.TEACHER_ASSIGNMENTS, []);
  _lessonLinks = loadLocal(BASE_KEYS.LESSON_LINKS, []);
  _feedback = loadLocal(BASE_KEYS.FEEDBACK, []);
  _reportConfig = loadLocal(BASE_KEYS.CONFIG, { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '1447هـ', term: '' });
  _worksMasterUrl = loadLocal(BASE_KEYS.WORKS_MASTER_URL, '');
  _aiSettings = loadLocal(BASE_KEYS.AI_SETTINGS, _aiSettings);
  
  // Try simple cloud pull if configured
  const hasCloudConfig = !isDemoMode && (localStorage.getItem('custom_supabase_url') || (process.env.SUPABASE_URL && process.env.SUPABASE_URL.length > 5));
  
  if (hasCloudConfig) {
      try {
          // Race download against a 2.5s timeout to ensure app loads fast
          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Sync Timeout')), 2500));
          await Promise.race([downloadFromSupabase(), timeout]);
      } catch (e) {
          console.warn('Initial cloud sync skipped (timeout or error), using local data');
      }
  }
};

export const setSystemMode = (isDemo: boolean) => {
    isDemoMode = isDemo;
    if (isDemo) {
        // Seed Fake Data with Hierarchy
        const managerId = 'manager_1';
        const teacherId = 'teacher_1';
        const schoolId = 'school_1';

        _schools = [{ 
            id: schoolId, 
            name: 'مدرسة المستقبل النموذجية', 
            ministryCode: '12345',
            managerName: 'أ. محمد المدير',
            managerNationalId: '1000000001',
            type: 'PRIVATE',
            phone: '0112223333',
            studentCount: 500,
            subscriptionStatus: 'ACTIVE'
        }];

        _systemUsers = [
            { id: managerId, name: 'أ. محمد المدير', email: 'manager@demo.com', nationalId: '1000000001', role: 'SCHOOL_MANAGER', status: 'ACTIVE', schoolId: schoolId },
            { id: teacherId, name: 'أ. خالد المعلم', email: 'teacher@demo.com', nationalId: '1000000002', role: 'TEACHER', status: 'ACTIVE', schoolId: schoolId }
        ];

        // Explicit Teacher Record linked to Manager
        _teachers = [{
            id: teacherId,
            name: 'أ. خالد المعلم',
            nationalId: '1000000002',
            password: '0002', // Last 4 digits logic demo
            email: 'teacher@demo.com',
            schoolId: schoolId,
            managerId: '1000000001' // Link to Manager NID
        }];

        // Feedback Demo
        _feedback = [{
            id: 'fb_1',
            teacherId: teacherId,
            managerId: managerId,
            content: 'شكراً لجهودك، نرجو التركيز على متابعة الغياب.',
            date: new Date().toISOString(),
            isRead: false
        }];

        _students = [
            { id: '1', name: 'أحمد محمد القحطاني', className: '3/طبيعي', gradeLevel: 'ثالث ثانوي', nationalId: '1010101010' },
            { id: '2', name: 'سارة علي الحربي', className: '3/طبيعي', gradeLevel: 'ثالث ثانوي', nationalId: '1020202020' },
            { id: '3', name: 'خالد عبدالله الشهري', className: '3/طبيعي', gradeLevel: 'ثالث ثانوي', nationalId: '1030303030' },
            { id: '4', name: 'نورة فهد السبيعي', className: '3/طبيعي', gradeLevel: 'ثالث ثانوي', nationalId: '1040404040' }
        ];
        _attendance = [];
        _performance = [];
        
        // Add Earth & Space Subject
        _subjects = [{ id: 'sub_earth_1', name: 'علوم الأرض والفضاء' }];
        
        const timestamp = Date.now();
        _assignments = [
            { id: `es_exam_1_${timestamp}`, title: 'اختبار: تطور الكون', category: 'PLATFORM_EXAM', maxScore: 20, isVisible: true, orderIndex: 1 },
            { id: `es_act_1_${timestamp}`, title: 'بحث: نشأة الكون', category: 'ACTIVITY', maxScore: 5, isVisible: true, orderIndex: 1 },
        ];

    } else {
        // Reload real data
        initAutoSync();
    }
};

export const isSystemDemo = () => isDemoMode;

// --- Students ---
export const getStudents = () => _students;
export const addStudent = (s: Student) => { _students.push(s); saveLocal(BASE_KEYS.STUDENTS, _students); };
export const updateStudent = (s: Student) => { _students = _students.map(x => x.id === s.id ? s : x); saveLocal(BASE_KEYS.STUDENTS, _students); };
export const deleteStudent = (id: string) => { _students = _students.filter(x => x.id !== id); saveLocal(BASE_KEYS.STUDENTS, _students); };
export const deleteAllStudents = () => { _students = []; saveLocal(BASE_KEYS.STUDENTS, _students); };
export const bulkAddStudents = (list: Student[]) => { _students = [..._students, ...list]; saveLocal(BASE_KEYS.STUDENTS, _students); };
export const bulkUpsertStudents = (list: Student[], key: keyof Student, strategy: 'UPDATE' | 'SKIP' | 'NEW', updateFields: string[] = []) => {
    const existingMap = new Map(_students.map(s => [String(s[key]), s]));
    
    list.forEach(newItem => {
        const itemKey = String(newItem[key]);
        const existing = existingMap.get(itemKey);
        
        if (existing) {
            if (strategy === 'UPDATE') {
                const updated = { ...existing };
                updateFields.forEach(field => {
                    // @ts-ignore
                    if (newItem[field]) updated[field] = newItem[field];
                });
                existingMap.set(itemKey, updated);
            }
        } else {
            existingMap.set(itemKey, newItem);
        }
    });
    
    _students = Array.from(existingMap.values());
    saveLocal(BASE_KEYS.STUDENTS, _students);
};
export const bulkUpdateStudents = (list: Student[]) => {
    const updateMap = new Map(list.map(s => [s.id, s]));
    _students = _students.map(s => updateMap.get(s.id) || s);
    saveLocal(BASE_KEYS.STUDENTS, _students);
};

// --- Attendance ---
export const getAttendance = () => _attendance;
export const saveAttendance = (recs: AttendanceRecord[]) => {
    const newMap = new Map(recs.map(r => [r.id, r]));
    _attendance = _attendance.filter(a => !newMap.has(a.id)).concat(recs);
    saveLocal(BASE_KEYS.ATTENDANCE, _attendance);
};
export const bulkAddAttendance = (list: AttendanceRecord[]) => {
    saveAttendance(list);
};

// --- Performance ---
export const getPerformance = () => _performance;
export const addPerformance = (p: PerformanceRecord) => { _performance.push(p); saveLocal(BASE_KEYS.PERFORMANCE, _performance); };
export const bulkAddPerformance = (list: PerformanceRecord[]) => { _performance = [..._performance, ...list]; saveLocal(BASE_KEYS.PERFORMANCE, _performance); };

// --- Teachers ---
export const getTeachers = () => _teachers;
export const addTeacher = (t: Teacher) => { 
    // Ensure uniqueness by ID
    if (!_teachers.find(exist => exist.id === t.id)) {
        _teachers.push(t); 
        saveLocal(BASE_KEYS.TEACHERS, _teachers); 
    }
};
export const updateTeacher = (t: Teacher) => { _teachers = _teachers.map(x => x.id === t.id ? t : x); saveLocal(BASE_KEYS.TEACHERS, _teachers); };
export const deleteTeacher = (id: string) => { _teachers = _teachers.filter(x => x.id !== id); saveLocal(BASE_KEYS.TEACHERS, _teachers); };

// --- Teacher Assignments ---
export const getTeacherAssignments = () => _teacherAssignments;
export const saveTeacherAssignment = (ta: TeacherAssignment) => {
    const idx = _teacherAssignments.findIndex(x => x.id === ta.id);
    if (idx >= 0) _teacherAssignments[idx] = ta;
    else _teacherAssignments.push(ta);
    saveLocal(BASE_KEYS.TEACHER_ASSIGNMENTS, _teacherAssignments);
};
export const deleteTeacherAssignment = (id: string) => {
    _teacherAssignments = _teacherAssignments.filter(x => x.id !== id);
    saveLocal(BASE_KEYS.TEACHER_ASSIGNMENTS, _teacherAssignments);
};

// --- Parents ---
export const getParents = () => _parents;
export const addParent = (p: Parent) => { _parents.push(p); saveLocal(BASE_KEYS.PARENTS, _parents); };
export const updateParent = (p: Parent) => { _parents = _parents.map(x => x.id === p.id ? p : x); saveLocal(BASE_KEYS.PARENTS, _parents); };
export const deleteParent = (id: string) => { _parents = _parents.filter(x => x.id !== id); saveLocal(BASE_KEYS.PARENTS, _parents); };

// --- Subjects ---
export const getSubjects = () => _subjects;
export const addSubject = (s: Subject) => { _subjects.push(s); saveLocal(BASE_KEYS.SUBJECTS, _subjects); };
export const updateSubject = (s: Subject) => { _subjects = _subjects.map(x => x.id === s.id ? s : x); saveLocal(BASE_KEYS.SUBJECTS, _subjects); };
export const deleteSubject = (id: string) => { _subjects = _subjects.filter(x => x.id !== id); saveLocal(BASE_KEYS.SUBJECTS, _subjects); };

// --- Schedules ---
export const getSchedules = () => _schedules;
export const saveScheduleItem = (s: ScheduleItem) => {
    _schedules = _schedules.filter(x => x.id !== s.id);
    _schedules.push(s);
    saveLocal(BASE_KEYS.SCHEDULES, _schedules);
};
export const deleteScheduleItem = (id: string) => { _schedules = _schedules.filter(x => x.id !== id); saveLocal(BASE_KEYS.SCHEDULES, _schedules); };

// --- Schools ---
export const getSchools = () => _schools;
export const addSchool = (s: School) => { _schools.push(s); saveLocal(BASE_KEYS.SCHOOLS, _schools); };
export const updateSchool = (s: School) => { _schools = _schools.map(x => x.id === s.id ? s : x); saveLocal(BASE_KEYS.SCHOOLS, _schools); };
export const deleteSchool = (id: string) => { _schools = _schools.filter(x => x.id !== id); saveLocal(BASE_KEYS.SCHOOLS, _schools); };

// --- System Users ---
export const getSystemUsers = () => _systemUsers;
export const addSystemUser = (u: SystemUser) => { _systemUsers.push(u); saveLocal(BASE_KEYS.SYSTEM_USERS, _systemUsers); };
export const updateSystemUser = (u: SystemUser) => { _systemUsers = _systemUsers.map(x => x.id === u.id ? u : x); saveLocal(BASE_KEYS.SYSTEM_USERS, _systemUsers); };
export const deleteSystemUser = (id: string) => { _systemUsers = _systemUsers.filter(x => x.id !== id); saveLocal(BASE_KEYS.SYSTEM_USERS, _systemUsers); };

// --- Feedback (NEW) ---
export const getFeedback = () => _feedback;
export const addFeedback = (f: Feedback) => { _feedback.push(f); saveLocal(BASE_KEYS.FEEDBACK, _feedback); };
export const markFeedbackRead = (id: string) => { 
    _feedback = _feedback.map(f => f.id === id ? { ...f, isRead: true } : f); 
    saveLocal(BASE_KEYS.FEEDBACK, _feedback); 
};

// --- Config ---
export const getReportHeaderConfig = () => _reportConfig;
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => { _reportConfig = c; saveLocal(BASE_KEYS.CONFIG, _reportConfig); };

export const getWorksMasterUrl = () => _worksMasterUrl;
export const saveWorksMasterUrl = (url: string) => { _worksMasterUrl = url; saveLocal(BASE_KEYS.WORKS_MASTER_URL, _worksMasterUrl); };

// --- AI Settings (NEW) ---
export const getAISettings = () => _aiSettings;
export const saveAISettings = (settings: AISettings) => { _aiSettings = settings; saveLocal(BASE_KEYS.AI_SETTINGS, _aiSettings); };

// --- Custom Tables ---
export const getCustomTables = () => _customTables;
export const addCustomTable = (t: CustomTable) => { _customTables.push(t); saveLocal(BASE_KEYS.CUSTOM_TABLES, _customTables); };
export const updateCustomTable = (t: CustomTable) => { _customTables = _customTables.map(x => x.id === t.id ? t : x); saveLocal(BASE_KEYS.CUSTOM_TABLES, _customTables); };
export const deleteCustomTable = (id: string) => { _customTables = _customTables.filter(x => x.id !== id); saveLocal(BASE_KEYS.CUSTOM_TABLES, _customTables); };

// --- Assignments ---
export const getAssignments = (category?: string) => category ? _assignments.filter(a => a.category === category) : _assignments;
export const saveAssignment = (a: Assignment) => {
    const idx = _assignments.findIndex(x => x.id === a.id);
    if (idx >= 0) _assignments[idx] = a;
    else _assignments.push(a);
    saveLocal(BASE_KEYS.ASSIGNMENTS, _assignments);
};
export const deleteAssignment = (id: string) => { _assignments = _assignments.filter(x => x.id !== id); saveLocal(BASE_KEYS.ASSIGNMENTS, _assignments); };
export const bulkSaveAssignments = (list: Assignment[]) => {
    const newMap = new Map(list.map(a => [a.id, a]));
    _assignments = _assignments.filter(a => !newMap.has(a.id)).concat(list);
    saveLocal(BASE_KEYS.ASSIGNMENTS, _assignments);
};

// --- Messages ---
export const getMessages = () => _messages;
export const saveMessage = (m: MessageLog) => { _messages.push(m); saveLocal(BASE_KEYS.MESSAGES, _messages); };

// --- Lesson Links (NEW) ---
export const getLessonLinks = () => _lessonLinks.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
export const saveLessonLink = (l: LessonLink) => {
    const idx = _lessonLinks.findIndex(x => x.id === l.id);
    if (idx >= 0) _lessonLinks[idx] = l;
    else _lessonLinks.push(l);
    saveLocal(BASE_KEYS.LESSON_LINKS, _lessonLinks);
};
export const deleteLessonLink = (id: string) => { _lessonLinks = _lessonLinks.filter(x => x.id !== id); saveLocal(BASE_KEYS.LESSON_LINKS, _lessonLinks); };

// --- Backup / Restore / Clear ---
export const createBackup = () => {
    const backup = {
        timestamp: new Date().toISOString(),
        students: _students,
        attendance: _attendance,
        performance: _performance,
        teachers: _teachers,
        assignments: _assignments,
        teacherAssignments: _teacherAssignments,
        lessonLinks: _lessonLinks,
        aiSettings: _aiSettings,
        // ... include other stores
    };
    return JSON.stringify(backup);
};

export const restoreBackup = (json: string) => {
    try {
        const data = JSON.parse(json);
        if (data.students) { _students = data.students; saveLocal(BASE_KEYS.STUDENTS, _students); }
        if (data.attendance) { _attendance = data.attendance; saveLocal(BASE_KEYS.ATTENDANCE, _attendance); }
        if (data.lessonLinks) { _lessonLinks = data.lessonLinks; saveLocal(BASE_KEYS.LESSON_LINKS, _lessonLinks); }
        if (data.aiSettings) { _aiSettings = data.aiSettings; saveLocal(BASE_KEYS.AI_SETTINGS, _aiSettings); }
        // ... restore others
        initAutoSync();
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const clearDatabase = () => {
    localStorage.clear();
};

export const checkConnection = async () => {
    try {
        const { data, error } = await supabase.from('schools').select('count', { count: 'exact', head: true });
        if (error) throw error;
        return { success: true, latency: 100 }; // Mock latency
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const getStorageStatistics = () => {
    return {
        students: _students.length,
        attendance: _attendance.length,
        performance: _performance.length,
        teachers: _teachers.length,
        users: _systemUsers.length,
        schools: _schools.length,
        assignments: _assignments.length
    };
};

export const getCloudStatistics = async () => {
    // Fetch counts from supabase
    const counts: any = {};
    for (const key of Object.keys(DB_MAP)) {
        const table = DB_MAP[key];
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        counts[table] = count || 0;
    }
    return counts;
};

export const fetchCloudTableData = async (table: string) => {
    const { data, error } = await supabase.from(table).select('*').limit(50);
    if(error) throw error;
    return data;
};

// --- SQL Schema Helper for Admin ---
export const getDatabaseSchemaSQL = () => {
    return `
-- 1. Schools Table
CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ministry_code TEXT,
    manager_name TEXT,
    manager_national_id TEXT,
    type TEXT,
    phone TEXT,
    student_count NUMERIC,
    subscription_status TEXT,
    works_master_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. System Users Table
CREATE TABLE IF NOT EXISTS system_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    national_id TEXT,
    password TEXT,
    role TEXT NOT NULL,
    school_id TEXT REFERENCES schools(id),
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Teachers Table (Expanded details)
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT,
    password TEXT,
    email TEXT,
    phone TEXT,
    subject_specialty TEXT,
    school_id TEXT REFERENCES schools(id),
    manager_id TEXT, -- Link to Manager NID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Students Table
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    national_id TEXT,
    grade_level TEXT,
    class_name TEXT,
    email TEXT,
    phone TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    parent_email TEXT,
    seat_index NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Assignments (Columns Config)
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    max_score NUMERIC,
    url TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    order_index NUMERIC,
    source_metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Performance Records (Grades)
CREATE TABLE IF NOT EXISTS performance_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    subject TEXT,
    title TEXT,
    category TEXT,
    score NUMERIC,
    max_score NUMERIC,
    date TEXT, -- YYYY-MM-DD
    notes TEXT,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id),
    date TEXT, -- YYYY-MM-DD
    status TEXT, -- PRESENT, ABSENT, etc.
    subject TEXT,
    period NUMERIC,
    behavior_status TEXT,
    behavior_note TEXT,
    excuse_note TEXT,
    excuse_file TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Weekly Schedules
CREATE TABLE IF NOT EXISTS weekly_schedules (
    id TEXT PRIMARY KEY,
    class_id TEXT,
    day TEXT,
    period NUMERIC,
    subject_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Teacher Assignments (Mapping Class/Subject to Teacher)
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id TEXT PRIMARY KEY,
    class_id TEXT,
    subject_name TEXT,
    teacher_id TEXT REFERENCES teachers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Parents Table
CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    children_ids TEXT[], -- Array of Student IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Messages Log
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    student_name TEXT,
    parent_phone TEXT,
    type TEXT,
    content TEXT,
    status TEXT,
    sent_by TEXT,
    date TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE RLS (Row Level Security) - Optional but recommended
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
-- Add policies as needed...
`;
};
