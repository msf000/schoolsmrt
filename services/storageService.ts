import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, Teacher, Parent, ClassRoom, Subject, EducationalStage, GradeLevel, School, SystemUser, CustomTable, WorksColumnConfig, PerformanceCategory, ScheduleItem, ReportHeaderConfig } from '../types';
import { getSupabaseClient } from './supabaseClient';

// --- IN-MEMORY DATA STORE (No LocalStorage) ---
let _students: Student[] = [];
let _attendance: AttendanceRecord[] = [];
let _performance: PerformanceRecord[] = [];
let _teachers: Teacher[] = [];
let _parents: Parent[] = [];
let _stages: EducationalStage[] = [];
let _grades: GradeLevel[] = [];
let _classes: ClassRoom[] = [];
let _subjects: Subject[] = [];
let _schools: School[] = [];
let _users: SystemUser[] = [];
let _schedules: ScheduleItem[] = []; // New: Schedules
let _customTables: CustomTable[] = [];
let _worksConfig: Record<string, WorksColumnConfig[]> = {};
let _worksMasterUrl: string = '';

// --- CONFIGURATION KEYS (Keep only config in local storage) ---
const CONFIG_KEYS = {
  WORKS_CONFIG: 'app_works_config', // UI Config preferences can stay local or move to DB if preferred
  WORKS_MASTER_URL: 'app_works_master_url',
  REPORT_HEADER: 'app_report_header'
};

// --- DB MAPPING ---
export const DB_MAP = {
    'students': 'students',
    'attendance_records': 'attendance_records',
    'performance_records': 'performance_records',
    'teachers': 'teachers',
    'parents': 'parents',
    'educational_stages': 'educational_stages',
    'grade_levels': 'grade_levels',
    'classes': 'classes',
    'subjects': 'subjects',
    'schools': 'schools',
    'system_users': 'system_users',
    'weekly_schedules': 'weekly_schedules'
};

// --- HELPER: DATA TRANSFORMATION ---
const toSnakeCase = (item: any) => {
    if (!item || typeof item !== 'object') return item;
    const newItem: any = {};
    Object.keys(item).forEach(k => {
        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newItem[snakeKey] = item[k];
    });
    return newItem;
};

const toCamelCase = (item: any) => {
    if (!item || typeof item !== 'object') return item;
    const newItem: any = {};
    Object.keys(item).forEach(k => {
        const camelKey = k.replace(/_([a-z])/g, (g: any) => g[1].toUpperCase());
        newItem[camelKey] = item[k];
    });
    return newItem;
};

// --- INITIALIZATION (FETCH FROM CLOUD) ---
export const initAutoSync = async (): Promise<boolean> => {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
        console.log("☁️ Fetching data from Supabase...");
        
        // Fetch all tables in parallel
        const results = await Promise.all([
            supabase.from('schools').select('*'),
            supabase.from('educational_stages').select('*'),
            supabase.from('grade_levels').select('*'),
            supabase.from('classes').select('*'),
            supabase.from('subjects').select('*'),
            supabase.from('teachers').select('*'),
            supabase.from('parents').select('*'),
            supabase.from('students').select('*'),
            supabase.from('system_users').select('*'),
            supabase.from('attendance_records').select('*'),
            supabase.from('performance_records').select('*'),
            supabase.from('weekly_schedules').select('*')
        ]);

        // Helper to extract data
        const load = (index: number) => results[index].data ? results[index].data!.map(toCamelCase) : [];

        _schools = load(0);
        _stages = load(1);
        _grades = load(2);
        _classes = load(3);
        _subjects = load(4);
        _teachers = load(5);
        _parents = load(6);
        _students = load(7);
        _users = load(8);
        _attendance = load(9);
        _performance = load(10);
        _schedules = load(11);

        // Load local configs
        const savedConfig = localStorage.getItem(CONFIG_KEYS.WORKS_CONFIG);
        if (savedConfig) _worksConfig = JSON.parse(savedConfig);
        
        // Try to get master URL from School first, else Local
        if (_schools.length > 0 && _schools[0].worksMasterUrl) {
            _worksMasterUrl = _schools[0].worksMasterUrl || '';
        } else {
            _worksMasterUrl = localStorage.getItem(CONFIG_KEYS.WORKS_MASTER_URL) || '';
        }

        console.log("✅ Data loaded successfully.");
        return true;
    } catch (error) {
        console.error("❌ Failed to load data from cloud:", error);
        return false;
    }
};

// --- CRUD OPERATIONS (Direct to Memory + Async Cloud Write) ---

const pushToCloud = async (tableName: string, data: any, type: 'UPSERT' | 'DELETE') => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    try {
        if (type === 'UPSERT') {
            const payload = Array.isArray(data) ? data.map(toSnakeCase) : toSnakeCase(data);
            const { error } = await supabase.from(tableName).upsert(payload);
            if (error) throw error;
        } else {
            const { error } = await supabase.from(tableName).delete().eq('id', data);
            if (error) throw error;
        }
    } catch (err: any) {
        console.error(`Error syncing to ${tableName}:`, err.message || JSON.stringify(err));
        // Note: In a production app, we would add a toast notification here
    }
};

// --- Students ---
export const getStudents = (): Student[] => [..._students];
export const addStudent = (student: Student) => {
    if (!student.nationalId) throw new Error("رقم الهوية إلزامي.");
    if (_students.some(s => s.nationalId === student.nationalId)) throw new Error("رقم الهوية مسجل مسبقاً.");
    _students.push(student);
    pushToCloud('students', student, 'UPSERT');
};
export const updateStudent = (updatedStudent: Student) => {
    const index = _students.findIndex(s => s.id === updatedStudent.id);
    if (index !== -1) {
        _students[index] = updatedStudent;
        pushToCloud('students', updatedStudent, 'UPSERT');
    }
};
export const deleteStudent = (id: string) => {
    _students = _students.filter(s => s.id !== id);
    pushToCloud('students', id, 'DELETE');
};
export const bulkAddStudents = (newStudents: Student[]) => {
    _students.push(...newStudents);
    pushToCloud('students', newStudents, 'UPSERT');
};
export const bulkUpsertStudents = (
    incomingStudents: Student[], 
    matchKey: keyof Student = 'nationalId', 
    strategy: 'UPDATE' | 'SKIP' | 'NEW',
    allowedUpdateFields?: string[] 
) => {
    const nationalIdMap = new Map<string, number>();
    _students.forEach((s, index) => {
        if (s.nationalId) nationalIdMap.set(String(s.nationalId).trim(), index);
    });

    const toUpsert: Student[] = [];

    incomingStudents.forEach(incoming => {
        const incomingNid = incoming.nationalId ? String(incoming.nationalId).trim() : null;
        if (!incomingNid) return; 

        if (nationalIdMap.has(incomingNid)) {
            const targetIndex = nationalIdMap.get(incomingNid)!;
            if (strategy === 'UPDATE') {
                const existingRecord = _students[targetIndex];
                let mergedRecord = { ...existingRecord };
                if (allowedUpdateFields && allowedUpdateFields.length > 0) {
                    allowedUpdateFields.forEach(field => {
                        // @ts-ignore
                        const incomingValue = incoming[field];
                        if (incomingValue !== undefined && incomingValue !== null && incomingValue !== '') {
                            // @ts-ignore
                            mergedRecord[field] = incomingValue;
                        }
                    });
                } else {
                    mergedRecord = { ...mergedRecord, ...incoming, id: existingRecord.id };
                }
                _students[targetIndex] = mergedRecord;
                toUpsert.push(mergedRecord);
            }
        } else {
            _students.push(incoming);
            nationalIdMap.set(incomingNid, _students.length - 1);
            toUpsert.push(incoming);
        }
    });

    if (toUpsert.length > 0) {
        pushToCloud('students', toUpsert, 'UPSERT');
    }
    return { added: toUpsert.length, updated: 0, skipped: 0 }; 
};
export const deleteAllStudents = () => {
    _students = [];
    // Warning: This doesn't delete from Cloud automatically for safety. 
    // To clear cloud, manual SQL is safer.
};

// --- Attendance ---
export const getAttendance = (): AttendanceRecord[] => [..._attendance];
export const saveAttendance = (records: AttendanceRecord[]) => {
    // Merge logic based on ID (which contains date+subject+period if used)
    const newRecordsMap = new Map(records.map(r => [r.id, r]));
    
    // Remove existing records that match the ID of incoming ones (Update)
    _attendance = _attendance.filter(r => !newRecordsMap.has(r.id));
    
    _attendance.push(...records);
    pushToCloud('attendance_records', records, 'UPSERT');
};
export const bulkAddAttendance = (records: AttendanceRecord[]) => saveAttendance(records);

// --- Performance ---
export const getPerformance = (): PerformanceRecord[] => [..._performance];
export const addPerformance = (record: PerformanceRecord) => {
    _performance.push(record);
    pushToCloud('performance_records', record, 'UPSERT');
};
export const bulkAddPerformance = (records: PerformanceRecord[]) => {
    // UPDATED: UPSERT LOGIC
    // Create a set of IDs being added/updated
    const incomingIds = new Set(records.map(r => r.id));
    
    // Filter out existing records that have the SAME id, effectively replacing them
    _performance = _performance.filter(p => !incomingIds.has(p.id));
    
    // Add the new/updated records
    _performance.push(...records);
    
    pushToCloud('performance_records', records, 'UPSERT');
};

// --- Teachers ---
export const getTeachers = (): Teacher[] => [..._teachers];
export const addTeacher = (item: Teacher) => {
    _teachers.push(item);
    pushToCloud('teachers', item, 'UPSERT');
};
export const deleteTeacher = (id: string) => {
    _teachers = _teachers.filter(t => t.id !== id);
    pushToCloud('teachers', id, 'DELETE');
};

// --- Parents ---
export const getParents = (): Parent[] => [..._parents];
export const addParent = (item: Parent) => {
    _parents.push(item);
    pushToCloud('parents', item, 'UPSERT');
};
export const deleteParent = (id: string) => {
    _parents = _parents.filter(p => p.id !== id);
    pushToCloud('parents', id, 'DELETE');
};

// --- Hierarchy (Stages, Grades, Classes, Subjects) ---
export const getStages = () => [..._stages];
export const addStage = (item: EducationalStage) => { _stages.push(item); pushToCloud('educational_stages', item, 'UPSERT'); };
export const deleteStage = (id: string) => { _stages = _stages.filter(i => i.id !== id); pushToCloud('educational_stages', id, 'DELETE'); };

export const getGrades = () => [..._grades];
export const addGrade = (item: GradeLevel) => { _grades.push(item); pushToCloud('grade_levels', item, 'UPSERT'); };
export const deleteGrade = (id: string) => { _grades = _grades.filter(i => i.id !== id); pushToCloud('grade_levels', id, 'DELETE'); };

export const getClasses = () => [..._classes];
export const addClass = (item: ClassRoom) => { _classes.push(item); pushToCloud('classes', item, 'UPSERT'); };
export const deleteClass = (id: string) => { _classes = _classes.filter(i => i.id !== id); pushToCloud('classes', id, 'DELETE'); };

export const getSubjects = () => [..._subjects];
export const addSubject = (item: Subject) => { _subjects.push(item); pushToCloud('subjects', item, 'UPSERT'); };
export const deleteSubject = (id: string) => { _subjects = _subjects.filter(i => i.id !== id); pushToCloud('subjects', id, 'DELETE'); };

// --- Schedules ---
export const getSchedules = () => [..._schedules];
export const saveScheduleItem = (item: ScheduleItem) => {
    // Remove existing for same class/day/period if exists
    const existingIndex = _schedules.findIndex(s => s.classId === item.classId && s.day === item.day && s.period === item.period);
    if (existingIndex !== -1) {
        _schedules[existingIndex] = item;
    } else {
        _schedules.push(item);
    }
    pushToCloud('weekly_schedules', item, 'UPSERT');
};
export const deleteScheduleItem = (id: string) => {
    _schedules = _schedules.filter(s => s.id !== id);
    pushToCloud('weekly_schedules', id, 'DELETE');
}

// --- School & Users ---
export const getSchools = () => [..._schools];
export const addSchool = (item: School) => { 
    // Handle update in memory
    const existingIdx = _schools.findIndex(s => s.id === item.id);
    if (existingIdx >= 0) _schools[existingIdx] = item;
    else _schools.push(item);
    
    pushToCloud('schools', item, 'UPSERT'); 
};
export const deleteSchool = (id: string) => { _schools = _schools.filter(i => i.id !== id); pushToCloud('schools', id, 'DELETE'); };

export const getSystemUsers = () => [..._users];
export const addSystemUser = (item: SystemUser) => { _users.push(item); pushToCloud('system_users', item, 'UPSERT'); };
export const deleteSystemUser = (id: string) => { _users = _users.filter(i => i.id !== id); pushToCloud('system_users', id, 'DELETE'); };

// --- Works Config ---
export const getWorksConfig = (category: PerformanceCategory) => _worksConfig[category] || [];
export const saveWorksConfig = (category: PerformanceCategory, config: WorksColumnConfig[]) => {
    _worksConfig[category] = config;
    localStorage.setItem(CONFIG_KEYS.WORKS_CONFIG, JSON.stringify(_worksConfig));
};

export const getWorksMasterUrl = () => _worksMasterUrl;
export const saveWorksMasterUrl = (url: string) => {
    _worksMasterUrl = url;
    localStorage.setItem(CONFIG_KEYS.WORKS_MASTER_URL, url);
    // Also try to update school record if exists
    if (_schools.length > 0) {
        const school = { ..._schools[0], worksMasterUrl: url };
        addSchool(school);
    }
};

// --- Report Header Config ---
export const getReportHeaderConfig = (): ReportHeaderConfig => {
    const saved = localStorage.getItem(CONFIG_KEYS.REPORT_HEADER);
    const defaults = {
        schoolName: _schools.length > 0 ? _schools[0].name : '',
        educationAdmin: _schools.length > 0 ? (_schools[0].educationAdministration || '') : '',
        teacherName: '',
        schoolManager: _schools.length > 0 ? (_schools[0].managerName || '') : '',
        academicYear: '1447',
        term: 'الفصل الدراسي الأول',
        logoBase64: ''
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
};

export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    localStorage.setItem(CONFIG_KEYS.REPORT_HEADER, JSON.stringify(config));
    // Also try to update first school record if possible
    if (_schools.length > 0) {
        const updatedSchool = { 
            ..._schools[0], 
            name: config.schoolName,
            educationAdministration: config.educationAdmin,
            managerName: config.schoolManager
        };
        addSchool(updatedSchool);
    }
};

// --- Custom Tables (Keep Local for now or remove if strictly no local) ---
// For now, keeping them in-memory only for session
export const getCustomTables = () => [..._customTables];
export const addCustomTable = (t: CustomTable) => _customTables.push(t);
export const updateCustomTable = (t: CustomTable) => {
    const idx = _customTables.findIndex(tbl => tbl.id === t.id);
    if(idx !== -1) _customTables[idx] = t;
}
export const deleteCustomTable = (id: string) => { _customTables = _customTables.filter(t => t.id !== id); };


// --- UTILS ---
export const seedData = () => {}; // Disabled
export const clearDatabase = () => {
    _students = []; _attendance = []; _performance = [];
    _teachers = []; _parents = []; _stages = []; _grades = []; _classes = []; _subjects = []; _schedules = [];
    // Don't auto delete from cloud to prevent accidents
};

export const getStorageStatistics = () => {
    return {
        students: _students.length,
        attendance: _attendance.length,
        performance: _performance.length,
        teachers: _teachers.length,
        parents: _parents.length,
        classes: _classes.length,
        schools: _schools.length,
        users: _users.length,
    };
};

export const checkConnection = async () => {
     const supabase = getSupabaseClient();
     if (!supabase) return { success: false, message: 'Client missing' };
     const start = performance.now();
     try {
         const { error } = await supabase.from('schools').select('id').limit(1);
         const end = performance.now();
         if (error) throw error;
         return { success: true, latency: Math.round(end - start) };
     } catch (e: any) {
         return { success: false, message: e.message };
     }
};

// Re-export specific cloud functions for AdminDashboard if needed
export const getCloudStatistics = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase client not initialized.");
    const stats: Record<string, number> = {};
    const tables = Object.values(DB_MAP);
    await Promise.all(tables.map(async (table) => {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error) stats[table] = count || 0;
        else stats[table] = -1;
    }));
    return stats;
};

export const fetchCloudTableData = async (tableName: string, limit: number = 20) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase client not initialized.");
    const { data, error } = await supabase.from(tableName).select('*').limit(limit).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

// Legacy stubs to prevent errors
export const createBackup = () => {
    return JSON.stringify({
        students: _students,
        attendance: _attendance,
        performance: _performance,
        teachers: _teachers,
        parents: _parents,
        stages: _stages,
        grades: _grades,
        classes: _classes,
        subjects: _subjects,
        schools: _schools,
        users: _users,
        customTables: _customTables,
        worksConfig: _worksConfig,
        schedules: _schedules
    });
};

export const restoreBackup = (json: string): boolean => {
    try {
        const data = JSON.parse(json);
        if(!data) return false;
        
        if (Array.isArray(data.students)) _students = data.students;
        if (Array.isArray(data.attendance)) _attendance = data.attendance;
        if (Array.isArray(data.performance)) _performance = data.performance;
        if (Array.isArray(data.teachers)) _teachers = data.teachers;
        if (Array.isArray(data.parents)) _parents = data.parents;
        if (Array.isArray(data.stages)) _stages = data.stages;
        if (Array.isArray(data.grades)) _grades = data.grades;
        if (Array.isArray(data.classes)) _classes = data.classes;
        if (Array.isArray(data.subjects)) _subjects = data.subjects;
        if (Array.isArray(data.schools)) _schools = data.schools;
        if (Array.isArray(data.users)) _users = data.users;
        if (Array.isArray(data.customTables)) _customTables = data.customTables;
        if (Array.isArray(data.schedules)) _schedules = data.schedules;
        if (data.worksConfig) _worksConfig = data.worksConfig;
        
        return true;
    } catch (e) {
        console.error("Backup restore failed", e);
        return false;
    }
};

export const uploadToSupabase = async () => {};
export const downloadFromSupabase = async () => { await initAutoSync(); };
export const getTableDisplayName = (t: string) => t;
export const processSyncQueue = async () => {};