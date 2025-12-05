import { Student, AttendanceRecord, PerformanceRecord, School, SystemUser, Teacher, Parent, Subject, ScheduleItem, ReportHeaderConfig, CustomTable, Assignment, MessageLog, TeacherAssignment } from '../types';
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
  WORKS_MASTER_URL: 'works_master_url'
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
let _reportConfig: ReportHeaderConfig = { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' };
let _worksMasterUrl: string = '';

let isDemoMode = false;

// Helpers
const saveLocal = (key: string, data: any) => {
  if (isDemoMode) return; // Don't save to LS in demo mode (optional, but good for separation)
  localStorage.setItem(key, JSON.stringify(data));
};

const loadLocal = <T>(key: string, defaultVal: T): T => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultVal;
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

    await fetchTable(BASE_KEYS.STUDENTS);
    await fetchTable(BASE_KEYS.ATTENDANCE);
    await fetchTable(BASE_KEYS.PERFORMANCE);
    await fetchTable(BASE_KEYS.TEACHERS);
    await fetchTable(BASE_KEYS.PARENTS);
    await fetchTable(BASE_KEYS.SUBJECTS);
    await fetchTable(BASE_KEYS.SCHEDULES);
    await fetchTable(BASE_KEYS.SCHOOLS);
    await fetchTable(BASE_KEYS.SYSTEM_USERS);
    await fetchTable(BASE_KEYS.ASSIGNMENTS);
    await fetchTable(BASE_KEYS.MESSAGES);
    await fetchTable(BASE_KEYS.TEACHER_ASSIGNMENTS);
    
    // Refresh memory
    await initAutoSync();
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
  _reportConfig = loadLocal(BASE_KEYS.CONFIG, { schoolName: '', educationAdmin: '', teacherName: '', schoolManager: '', academicYear: '', term: '' });
  _worksMasterUrl = loadLocal(BASE_KEYS.WORKS_MASTER_URL, '');
  
  // Try simple cloud pull if configured
  if (!isDemoMode && (localStorage.getItem('custom_supabase_url') || process.env.SUPABASE_URL)) {
      try {
          await downloadFromSupabase();
      } catch (e) {
          console.warn('Initial cloud sync failed, using local data');
      }
  }
};

export const setSystemMode = (isDemo: boolean) => {
    isDemoMode = isDemo;
    if (isDemo) {
        // Seed Fake Data
        _students = [
            { id: '1', name: 'أحمد محمد', className: '1/A', gradeLevel: 'First Grade', nationalId: '1010101010' },
            { id: '2', name: 'سارة علي', className: '1/A', gradeLevel: 'First Grade', nationalId: '1020202020' }
        ];
        _attendance = [];
        _performance = [];
        _systemUsers = [
            { id: 'd1', name: 'Manager Demo', email: 'manager@demo.com', role: 'SCHOOL_MANAGER', status: 'ACTIVE' },
            { id: 'd2', name: 'Teacher Demo', email: 'teacher@demo.com', role: 'TEACHER', status: 'ACTIVE' }
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
export const addTeacher = (t: Teacher) => { _teachers.push(t); saveLocal(BASE_KEYS.TEACHERS, _teachers); };
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
export const deleteSchool = (id: string) => { _schools = _schools.filter(x => x.id !== id); saveLocal(BASE_KEYS.SCHOOLS, _schools); };

// --- System Users ---
export const getSystemUsers = () => _systemUsers;
export const addSystemUser = (u: SystemUser) => { _systemUsers.push(u); saveLocal(BASE_KEYS.SYSTEM_USERS, _systemUsers); };
export const updateSystemUser = (u: SystemUser) => { _systemUsers = _systemUsers.map(x => x.id === u.id ? u : x); saveLocal(BASE_KEYS.SYSTEM_USERS, _systemUsers); };
export const deleteSystemUser = (id: string) => { _systemUsers = _systemUsers.filter(x => x.id !== id); saveLocal(BASE_KEYS.SYSTEM_USERS, _systemUsers); };

// --- Config ---
export const getReportHeaderConfig = () => _reportConfig;
export const saveReportHeaderConfig = (c: ReportHeaderConfig) => { _reportConfig = c; saveLocal(BASE_KEYS.CONFIG, _reportConfig); };

export const getWorksMasterUrl = () => _worksMasterUrl;
export const saveWorksMasterUrl = (url: string) => { _worksMasterUrl = url; saveLocal(BASE_KEYS.WORKS_MASTER_URL, _worksMasterUrl); };

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
        // ... include other stores
    };
    return JSON.stringify(backup);
};

export const restoreBackup = (json: string) => {
    try {
        const data = JSON.parse(json);
        if (data.students) { _students = data.students; saveLocal(BASE_KEYS.STUDENTS, _students); }
        if (data.attendance) { _attendance = data.attendance; saveLocal(BASE_KEYS.ATTENDANCE, _attendance); }
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
