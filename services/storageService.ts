
import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, Teacher, Parent, ClassRoom, Subject, EducationalStage, GradeLevel, School, SystemUser, CustomTable, WorksColumnConfig, PerformanceCategory, ScheduleItem, ReportHeaderConfig } from '../types';
import { getSupabaseClient } from './supabaseClient';

// --- STORAGE KEYS ---
const STORAGE_KEYS = {
    STUDENTS: 'sys_students',
    ATTENDANCE: 'sys_attendance',
    PERFORMANCE: 'sys_performance',
    TEACHERS: 'sys_teachers',
    PARENTS: 'sys_parents',
    STAGES: 'sys_stages',
    GRADES: 'sys_grades',
    CLASSES: 'sys_classes',
    SUBJECTS: 'sys_subjects',
    SCHOOLS: 'sys_schools',
    USERS: 'sys_users',
    SCHEDULES: 'sys_schedules',
    CUSTOM_TABLES: 'sys_custom_tables'
};

const CONFIG_KEYS = {
  WORKS_CONFIG: 'app_works_config',
  WORKS_MASTER_URL: 'app_works_master_url',
  REPORT_HEADER: 'app_report_header'
};

// --- HELPER: LOCAL STORAGE ---
const loadLocal = <T>(key: string, defaultVal: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch { return defaultVal; }
};

const saveLocal = (key: string, data: any) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
};

// --- IN-MEMORY DATA STORE (Initialized from LocalStorage) ---
let _students: Student[] = loadLocal(STORAGE_KEYS.STUDENTS, []);
let _attendance: AttendanceRecord[] = loadLocal(STORAGE_KEYS.ATTENDANCE, []);
let _performance: PerformanceRecord[] = loadLocal(STORAGE_KEYS.PERFORMANCE, []);
let _teachers: Teacher[] = loadLocal(STORAGE_KEYS.TEACHERS, []);
let _parents: Parent[] = loadLocal(STORAGE_KEYS.PARENTS, []);
let _stages: EducationalStage[] = loadLocal(STORAGE_KEYS.STAGES, []);
let _grades: GradeLevel[] = loadLocal(STORAGE_KEYS.GRADES, []);
let _classes: ClassRoom[] = loadLocal(STORAGE_KEYS.CLASSES, []);
let _subjects: Subject[] = loadLocal(STORAGE_KEYS.SUBJECTS, []);
let _schools: School[] = loadLocal(STORAGE_KEYS.SCHOOLS, []);
let _users: SystemUser[] = loadLocal(STORAGE_KEYS.USERS, []);
let _schedules: ScheduleItem[] = loadLocal(STORAGE_KEYS.SCHEDULES, []);
let _customTables: CustomTable[] = loadLocal(STORAGE_KEYS.CUSTOM_TABLES, []);
let _worksConfig: Record<string, WorksColumnConfig[]> = {};
let _worksMasterUrl: string = '';

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

// --- INITIALIZATION (FETCH FROM CLOUD + SYNC LOCAL) ---
export const initAutoSync = async (): Promise<boolean> => {
    const supabase = getSupabaseClient();
    
    // Load config from local initially
    const savedConfig = localStorage.getItem(CONFIG_KEYS.WORKS_CONFIG);
    if (savedConfig) _worksConfig = JSON.parse(savedConfig);
    
    // Try to get master URL from School first (if loaded), else Local
    _worksMasterUrl = localStorage.getItem(CONFIG_KEYS.WORKS_MASTER_URL) || '';

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

        // Load to Memory AND Save to LocalStorage
        _schools = load(0); saveLocal(STORAGE_KEYS.SCHOOLS, _schools);
        _stages = load(1); saveLocal(STORAGE_KEYS.STAGES, _stages);
        _grades = load(2); saveLocal(STORAGE_KEYS.GRADES, _grades);
        _classes = load(3); saveLocal(STORAGE_KEYS.CLASSES, _classes);
        _subjects = load(4); saveLocal(STORAGE_KEYS.SUBJECTS, _subjects);
        _teachers = load(5); saveLocal(STORAGE_KEYS.TEACHERS, _teachers);
        _parents = load(6); saveLocal(STORAGE_KEYS.PARENTS, _parents);
        _students = load(7); saveLocal(STORAGE_KEYS.STUDENTS, _students);
        _users = load(8); saveLocal(STORAGE_KEYS.USERS, _users);
        _attendance = load(9); saveLocal(STORAGE_KEYS.ATTENDANCE, _attendance);
        _performance = load(10); saveLocal(STORAGE_KEYS.PERFORMANCE, _performance);
        _schedules = load(11); saveLocal(STORAGE_KEYS.SCHEDULES, _schedules);

        // --- NEW: EXTRACT & SYNC CONFIG FROM HIDDEN RECORDS ---
        // We look for performance records with studentId = 'SYSTEM_CONFIG'
        const systemConfigs = _performance.filter(p => p.studentId === 'SYSTEM_CONFIG');
        if (systemConfigs.length > 0) {
            console.log("⚙️ Syncing System Configuration from Cloud...");
            systemConfigs.forEach(rec => {
                try {
                    // ID format: CONFIG_ACTIVITY, CONFIG_HOMEWORK
                    const parts = rec.id.split('_');
                    if (parts.length > 1) {
                        const cat = parts[1] as PerformanceCategory;
                        if (rec.notes) {
                            _worksConfig[cat] = JSON.parse(rec.notes);
                        }
                    }
                } catch (e) { console.warn("Failed to parse system config", e); }
            });
            // Update local storage with cloud config
            localStorage.setItem(CONFIG_KEYS.WORKS_CONFIG, JSON.stringify(_worksConfig));
        }

        // Update works master url from schools if available
        if (_schools.length > 0 && _schools[0].worksMasterUrl) {
            _worksMasterUrl = _schools[0].worksMasterUrl || '';
            localStorage.setItem(CONFIG_KEYS.WORKS_MASTER_URL, _worksMasterUrl);
        }

        console.log("✅ Data loaded and synced locally.");
        return true;
    } catch (error) {
        console.error("❌ Failed to load data from cloud (using local):", error);
        return false;
    }
};

// --- CRUD OPERATIONS (Update Memory -> Local -> Cloud) ---

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
    }
};

// --- Students ---
export const getStudents = (): Student[] => [..._students];
export const addStudent = (student: Student) => {
    if (!student.nationalId) throw new Error("رقم الهوية إلزامي.");
    if (_students.some(s => s.nationalId === student.nationalId)) throw new Error("رقم الهوية مسجل مسبقاً.");
    _students.push(student);
    saveLocal(STORAGE_KEYS.STUDENTS, _students);
    pushToCloud('students', student, 'UPSERT');
};
export const updateStudent = (updatedStudent: Student) => {
    const index = _students.findIndex(s => s.id === updatedStudent.id);
    if (index !== -1) {
        _students[index] = updatedStudent;
        saveLocal(STORAGE_KEYS.STUDENTS, _students);
        pushToCloud('students', updatedStudent, 'UPSERT');
    }
};
export const deleteStudent = (id: string) => {
    _students = _students.filter(s => s.id !== id);
    saveLocal(STORAGE_KEYS.STUDENTS, _students);
    pushToCloud('students', id, 'DELETE');
};
export const bulkAddStudents = (newStudents: Student[]) => {
    _students.push(...newStudents);
    saveLocal(STORAGE_KEYS.STUDENTS, _students);
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
        saveLocal(STORAGE_KEYS.STUDENTS, _students);
        pushToCloud('students', toUpsert, 'UPSERT');
    }
    return { added: toUpsert.length, updated: 0, skipped: 0 }; 
};
export const deleteAllStudents = () => {
    _students = [];
    saveLocal(STORAGE_KEYS.STUDENTS, []);
    // Note: Manual Cloud Clear needed for safety
};

// --- Attendance ---
export const getAttendance = (): AttendanceRecord[] => [..._attendance];
export const saveAttendance = (records: AttendanceRecord[]) => {
    const newRecordsMap = new Map(records.map(r => [r.id, r]));
    _attendance = _attendance.filter(r => !newRecordsMap.has(r.id));
    _attendance.push(...records);
    saveLocal(STORAGE_KEYS.ATTENDANCE, _attendance);
    pushToCloud('attendance_records', records, 'UPSERT');
};
export const bulkAddAttendance = (records: AttendanceRecord[]) => saveAttendance(records);

// --- Performance ---
// Filter out SYSTEM_CONFIG records so they don't appear in the UI tables
export const getPerformance = (): PerformanceRecord[] => _performance.filter(p => p.studentId !== 'SYSTEM_CONFIG');

export const addPerformance = (record: PerformanceRecord) => {
    // If updating config record, we might need to replace
    if (record.studentId === 'SYSTEM_CONFIG') {
        const idx = _performance.findIndex(p => p.id === record.id);
        if (idx >= 0) _performance[idx] = record;
        else _performance.push(record);
    } else {
        _performance.push(record);
    }
    saveLocal(STORAGE_KEYS.PERFORMANCE, _performance);
    pushToCloud('performance_records', record, 'UPSERT');
};
export const bulkAddPerformance = (records: PerformanceRecord[]) => {
    const incomingIds = new Set(records.map(r => r.id));
    _performance = _performance.filter(p => !incomingIds.has(p.id));
    _performance.push(...records);
    saveLocal(STORAGE_KEYS.PERFORMANCE, _performance);
    pushToCloud('performance_records', records, 'UPSERT');
};

// --- Teachers ---
export const getTeachers = (): Teacher[] => [..._teachers];
export const addTeacher = (item: Teacher) => {
    _teachers.push(item);
    saveLocal(STORAGE_KEYS.TEACHERS, _teachers);
    pushToCloud('teachers', item, 'UPSERT');
};
export const deleteTeacher = (id: string) => {
    _teachers = _teachers.filter(t => t.id !== id);
    saveLocal(STORAGE_KEYS.TEACHERS, _teachers);
    pushToCloud('teachers', id, 'DELETE');
};

// --- Parents ---
export const getParents = (): Parent[] => [..._parents];
export const addParent = (item: Parent) => {
    _parents.push(item);
    saveLocal(STORAGE_KEYS.PARENTS, _parents);
    pushToCloud('parents', item, 'UPSERT');
};
export const deleteParent = (id: string) => {
    _parents = _parents.filter(p => p.id !== id);
    saveLocal(STORAGE_KEYS.PARENTS, _parents);
    pushToCloud('parents', id, 'DELETE');
};

// --- Hierarchy ---
export const getStages = () => [..._stages];
export const addStage = (item: EducationalStage) => { _stages.push(item); saveLocal(STORAGE_KEYS.STAGES, _stages); pushToCloud('educational_stages', item, 'UPSERT'); };
export const deleteStage = (id: string) => { _stages = _stages.filter(i => i.id !== id); saveLocal(STORAGE_KEYS.STAGES, _stages); pushToCloud('educational_stages', id, 'DELETE'); };

export const getGrades = () => [..._grades];
export const addGrade = (item: GradeLevel) => { _grades.push(item); saveLocal(STORAGE_KEYS.GRADES, _grades); pushToCloud('grade_levels', item, 'UPSERT'); };
export const deleteGrade = (id: string) => { _grades = _grades.filter(i => i.id !== id); saveLocal(STORAGE_KEYS.GRADES, _grades); pushToCloud('grade_levels', id, 'DELETE'); };

export const getClasses = () => [..._classes];
export const addClass = (item: ClassRoom) => { _classes.push(item); saveLocal(STORAGE_KEYS.CLASSES, _classes); pushToCloud('classes', item, 'UPSERT'); };
export const deleteClass = (id: string) => { _classes = _classes.filter(i => i.id !== id); saveLocal(STORAGE_KEYS.CLASSES, _classes); pushToCloud('classes', id, 'DELETE'); };

export const getSubjects = () => [..._subjects];
export const addSubject = (item: Subject) => { _subjects.push(item); saveLocal(STORAGE_KEYS.SUBJECTS, _subjects); pushToCloud('subjects', item, 'UPSERT'); };
export const deleteSubject = (id: string) => { _subjects = _subjects.filter(i => i.id !== id); saveLocal(STORAGE_KEYS.SUBJECTS, _subjects); pushToCloud('subjects', id, 'DELETE'); };

// --- Schedules ---
export const getSchedules = () => [..._schedules];
export const saveScheduleItem = (item: ScheduleItem) => {
    const existingIndex = _schedules.findIndex(s => s.classId === item.classId && s.day === item.day && s.period === item.period);
    if (existingIndex !== -1) {
        _schedules[existingIndex] = item;
    } else {
        _schedules.push(item);
    }
    saveLocal(STORAGE_KEYS.SCHEDULES, _schedules);
    pushToCloud('weekly_schedules', item, 'UPSERT');
};
export const deleteScheduleItem = (id: string) => {
    _schedules = _schedules.filter(s => s.id !== id);
    saveLocal(STORAGE_KEYS.SCHEDULES, _schedules);
    pushToCloud('weekly_schedules', id, 'DELETE');
}

// --- School & Users ---
export const getSchools = () => [..._schools];
export const addSchool = (item: School) => { 
    const existingIdx = _schools.findIndex(s => s.id === item.id);
    if (existingIdx >= 0) _schools[existingIdx] = item;
    else _schools.push(item);
    saveLocal(STORAGE_KEYS.SCHOOLS, _schools);
    pushToCloud('schools', item, 'UPSERT'); 
};
export const deleteSchool = (id: string) => { _schools = _schools.filter(i => i.id !== id); saveLocal(STORAGE_KEYS.SCHOOLS, _schools); pushToCloud('schools', id, 'DELETE'); };

export const getSystemUsers = () => [..._users];
export const addSystemUser = (item: SystemUser) => { _users.push(item); saveLocal(STORAGE_KEYS.USERS, _users); pushToCloud('system_users', item, 'UPSERT'); };
export const updateSystemUser = (item: SystemUser) => {
    const index = _users.findIndex(u => u.id === item.id);
    if (index !== -1) {
        _users[index] = item;
        saveLocal(STORAGE_KEYS.USERS, _users);
        pushToCloud('system_users', item, 'UPSERT');
    }
};
export const deleteSystemUser = (id: string) => { _users = _users.filter(i => i.id !== id); saveLocal(STORAGE_KEYS.USERS, _users); pushToCloud('system_users', id, 'DELETE'); };

// --- Works Config ---
export const getWorksConfig = (category: PerformanceCategory) => _worksConfig[category] || [];

export const saveWorksConfig = (category: PerformanceCategory, config: WorksColumnConfig[]) => {
    // 1. Save Config Locally
    _worksConfig[category] = config;
    localStorage.setItem(CONFIG_KEYS.WORKS_CONFIG, JSON.stringify(_worksConfig));

    // 2. Sync to Cloud (Store as a hidden Performance Record)
    // This allows students to download the config without needing a new DB table
    const configRecord: PerformanceRecord = {
        id: `CONFIG_${category}`,
        studentId: 'SYSTEM_CONFIG', // Special ID to hide from normal views
        subject: 'SYSTEM',
        title: category,
        category: 'OTHER',
        score: 0,
        maxScore: 0,
        date: new Date().toISOString().split('T')[0],
        notes: JSON.stringify(config), // Store config JSON here
        url: ''
    };
    // Use addPerformance to handle cloud push
    addPerformance(configRecord);
};

export const getWorksMasterUrl = () => _worksMasterUrl;
export const saveWorksMasterUrl = (url: string) => {
    _worksMasterUrl = url;
    localStorage.setItem(CONFIG_KEYS.WORKS_MASTER_URL, url);
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

// --- Custom Tables ---
export const getCustomTables = () => [..._customTables];
export const addCustomTable = (t: CustomTable) => { _customTables.push(t); saveLocal(STORAGE_KEYS.CUSTOM_TABLES, _customTables); };
export const updateCustomTable = (t: CustomTable) => {
    const idx = _customTables.findIndex(tbl => tbl.id === t.id);
    if(idx !== -1) { _customTables[idx] = t; saveLocal(STORAGE_KEYS.CUSTOM_TABLES, _customTables); }
}
export const deleteCustomTable = (id: string) => { 
    _customTables = _customTables.filter(t => t.id !== id); 
    saveLocal(STORAGE_KEYS.CUSTOM_TABLES, _customTables); 
};


// --- UTILS ---
export const seedData = () => {}; 
export const clearDatabase = () => {
    _students = [];
    _attendance = [];
    _performance = [];
    _teachers = [];
    _parents = [];
    _stages = [];
    _grades = [];
    _classes = [];
    _subjects = [];
    _schedules = [];
    _customTables = [];
    
    // Clear All Keys
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
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
        
        if (Array.isArray(data.students)) { _students = data.students; saveLocal(STORAGE_KEYS.STUDENTS, _students); }
        if (Array.isArray(data.attendance)) { _attendance = data.attendance; saveLocal(STORAGE_KEYS.ATTENDANCE, _attendance); }
        if (Array.isArray(data.performance)) { _performance = data.performance; saveLocal(STORAGE_KEYS.PERFORMANCE, _performance); }
        if (Array.isArray(data.teachers)) { _teachers = data.teachers; saveLocal(STORAGE_KEYS.TEACHERS, _teachers); }
        if (Array.isArray(data.parents)) { _parents = data.parents; saveLocal(STORAGE_KEYS.PARENTS, _parents); }
        if (Array.isArray(data.stages)) { _stages = data.stages; saveLocal(STORAGE_KEYS.STAGES, _stages); }
        if (Array.isArray(data.grades)) { _grades = data.grades; saveLocal(STORAGE_KEYS.GRADES, _grades); }
        if (Array.isArray(data.classes)) { _classes = data.classes; saveLocal(STORAGE_KEYS.CLASSES, _classes); }
        if (Array.isArray(data.subjects)) { _subjects = data.subjects; saveLocal(STORAGE_KEYS.SUBJECTS, _subjects); }
        if (Array.isArray(data.schools)) { _schools = data.schools; saveLocal(STORAGE_KEYS.SCHOOLS, _schools); }
        if (Array.isArray(data.users)) { _users = data.users; saveLocal(STORAGE_KEYS.USERS, _users); }
        if (Array.isArray(data.customTables)) { _customTables = data.customTables; saveLocal(STORAGE_KEYS.CUSTOM_TABLES, _customTables); }
        if (Array.isArray(data.schedules)) { _schedules = data.schedules; saveLocal(STORAGE_KEYS.SCHEDULES, _schedules); }
        if (data.worksConfig) { _worksConfig = data.worksConfig; localStorage.setItem(CONFIG_KEYS.WORKS_CONFIG, JSON.stringify(_worksConfig)); }
        
        return true;
    } catch (e) {
        console.error("Backup restore failed", e);
        return false;
    }
};

export const uploadToSupabase = async () => {
    // Basic implementation: clear cloud then push local (could be dangerous, better use UPSERT logic in real apps)
    // For now, we assume implicit sync via usage. 
    // This explicit function could loop all local data and upsert.
    const tables = [
        { name: 'schools', data: _schools },
        { name: 'educational_stages', data: _stages },
        { name: 'grade_levels', data: _grades },
        { name: 'classes', data: _classes },
        { name: 'subjects', data: _subjects },
        { name: 'teachers', data: _teachers },
        { name: 'parents', data: _parents },
        { name: 'students', data: _students },
        { name: 'system_users', data: _users },
        { name: 'attendance_records', data: _attendance },
        { name: 'performance_records', data: _performance },
        { name: 'weekly_schedules', data: _schedules }
    ];

    for (const t of tables) {
        if(t.data.length > 0) {
            await pushToCloud(t.name, t.data, 'UPSERT');
        }
    }
};
export const downloadFromSupabase = async () => { await initAutoSync(); };
export const getTableDisplayName = (t: string) => t;
export const processSyncQueue = async () => {};
