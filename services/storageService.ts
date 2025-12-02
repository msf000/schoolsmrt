import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, Teacher, Parent, ClassRoom, Subject, EducationalStage, GradeLevel, School, SystemUser, CustomTable, WorksColumnConfig, PerformanceCategory } from '../types';
import { getSupabaseClient } from './supabaseClient';

const STORAGE_KEYS = {
  STUDENTS: 'app_students',
  ATTENDANCE: 'app_attendance',
  PERFORMANCE: 'app_performance',
  TEACHERS: 'app_teachers',
  PARENTS: 'app_parents',
  STAGES: 'app_stages',
  GRADES: 'app_grades',
  CLASSES: 'app_classes',
  SUBJECTS: 'app_subjects',
  // System Admin Keys
  SCHOOLS: 'app_schools',
  SYSTEM_USERS: 'app_system_users',
  // Custom Import
  CUSTOM_TABLES: 'app_custom_tables',
  // Works Tracking Config
  WORKS_CONFIG: 'app_works_config',
  WORKS_MASTER_URL: 'app_works_master_url', // New Key
  // SYNC QUEUE
  SYNC_QUEUE: 'app_sync_queue'
};

// --- Map local keys to Supabase tables ---
export const DB_MAP = {
    [STORAGE_KEYS.STUDENTS]: 'students',
    [STORAGE_KEYS.ATTENDANCE]: 'attendance_records',
    [STORAGE_KEYS.PERFORMANCE]: 'performance_records',
    [STORAGE_KEYS.TEACHERS]: 'teachers',
    [STORAGE_KEYS.PARENTS]: 'parents',
    [STORAGE_KEYS.STAGES]: 'educational_stages',
    [STORAGE_KEYS.GRADES]: 'grade_levels',
    [STORAGE_KEYS.CLASSES]: 'classes',
    [STORAGE_KEYS.SUBJECTS]: 'subjects',
    [STORAGE_KEYS.SCHOOLS]: 'schools',
    [STORAGE_KEYS.SYSTEM_USERS]: 'system_users'
};

interface SyncOperation {
    id: string; // Unique op ID
    storageKey: string;
    tableName: string;
    type: 'UPSERT' | 'DELETE';
    data: any; // payload for upsert, or ID for delete
    timestamp: number;
    retryCount: number;
}

// --- Generic Helper ---
const getItems = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveItems = <T>(key: string, items: T[]): void => {
  localStorage.setItem(key, JSON.stringify(items));
};

// --- ROBUST SYNC QUEUE LOGIC ---

const getSyncQueue = (): SyncOperation[] => {
    return getItems<SyncOperation>(STORAGE_KEYS.SYNC_QUEUE);
};

const saveSyncQueue = (queue: SyncOperation[]) => {
    saveItems(STORAGE_KEYS.SYNC_QUEUE, queue);
};

const toSnakeCase = (item: any) => {
    if (!item || typeof item !== 'object') return item;
    const newItem: any = {};
    Object.keys(item).forEach(k => {
        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newItem[snakeKey] = item[k];
    });
    return JSON.parse(JSON.stringify(newItem));
};

// Global sync flag to prevent race conditions
let isSyncing = false;

export const processSyncQueue = async () => {
    if (isSyncing) return;
    if (!navigator.onLine) return; // Don't try if offline

    const supabase = getSupabaseClient();
    if (!supabase) return;

    isSyncing = true;
    const queue = getSyncQueue();
    
    if (queue.length === 0) {
        isSyncing = false;
        return;
    }

    console.log(`🔄 Processing Sync Queue: ${queue.length} operations pending...`);

    const newQueue: SyncOperation[] = [];
    
    // Process one by one to ensure order integrity
    for (const op of queue) {
        try {
            if (op.type === 'UPSERT') {
                const payload = Array.isArray(op.data) ? op.data.map(toSnakeCase) : toSnakeCase(op.data);
                const { error } = await supabase.from(op.tableName).upsert(payload, { onConflict: 'id' });
                if (error) throw error;
            } else if (op.type === 'DELETE') {
                const { error } = await supabase.from(op.tableName).delete().eq('id', op.data);
                if (error) throw error;
            }
            // If success, do not add back to queue (it's removed)
        } catch (error: any) {
            console.error(`❌ Sync failed for op ${op.id}:`, error.message);
            // Increment retry, keep in queue if not fatal
            op.retryCount++;
            if (op.retryCount < 50) { // Keep trying for a long time
                newQueue.push(op);
            }
        }
    }

    saveSyncQueue(newQueue);
    isSyncing = false;

    // If items remain, try again shortly
    if (newQueue.length > 0 && newQueue.length < queue.length) {
        setTimeout(processSyncQueue, 2000);
    }
};

const addToSyncQueue = (storageKey: string, type: 'UPSERT' | 'DELETE', data: any) => {
    // @ts-ignore
    const tableName = DB_MAP[storageKey];
    if (!tableName) return;

    const queue = getSyncQueue();
    queue.push({
        id: Date.now().toString() + Math.random(),
        storageKey,
        tableName,
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0
    });
    saveSyncQueue(queue);
    
    // Trigger sync attempt immediately (fire and forget)
    processSyncQueue();
};


// --- INITIALIZATION ---
export const initAutoSync = () => {
    // Listen for online status
    window.addEventListener('online', () => {
        console.log("🌐 Connection restored. Flushing sync queue...");
        processSyncQueue();
    });

    // Also verify periodically
    setInterval(() => {
        if (navigator.onLine && getSyncQueue().length > 0) {
            processSyncQueue();
        }
    }, 10000); // Check every 10 seconds

    // Initial check
    processSyncQueue();
};


// --- CRUD Operations (Wrapped with Offline Sync) ---

// --- Students ---
export const getStudents = (): Student[] => getItems<Student>(STORAGE_KEYS.STUDENTS);

export const addStudent = (student: Student): void => {
  if (!student.nationalId) throw new Error("رقم الهوية إلزامي.");
  const students = getStudents();
  if (students.some(s => s.nationalId === student.nationalId)) throw new Error("رقم الهوية مسجل مسبقاً.");
  
  students.push(student);
  saveItems(STORAGE_KEYS.STUDENTS, students);
  addToSyncQueue(STORAGE_KEYS.STUDENTS, 'UPSERT', student);
};

export const updateStudent = (updatedStudent: Student): void => {
  const students = getStudents();
  const index = students.findIndex(s => s.id === updatedStudent.id);
  if (index !== -1) {
    students[index] = updatedStudent;
    saveItems(STORAGE_KEYS.STUDENTS, students);
    addToSyncQueue(STORAGE_KEYS.STUDENTS, 'UPSERT', updatedStudent);
  }
};

export const bulkUpsertStudents = (
    incomingStudents: Student[], 
    matchKey: keyof Student = 'nationalId', 
    strategy: 'UPDATE' | 'SKIP' | 'NEW',
    allowedUpdateFields?: string[] 
): { added: number, updated: number, skipped: number } => {
    const currentStudents = getStudents();
    let added = 0;
    let updated = 0;
    let skipped = 0;

    const changedRecords: Student[] = []; 

    const nationalIdMap = new Map<string, number>();
    currentStudents.forEach((s, index) => {
        if (s.nationalId) nationalIdMap.set(String(s.nationalId).trim(), index);
    });

    incomingStudents.forEach(incoming => {
        const incomingNid = incoming.nationalId ? String(incoming.nationalId).trim() : null;
        if (!incomingNid) return; 

        if (nationalIdMap.has(incomingNid)) {
            const targetIndex = nationalIdMap.get(incomingNid)!;
            if (strategy === 'UPDATE') {
                const existingRecord = currentStudents[targetIndex];
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

                currentStudents[targetIndex] = mergedRecord;
                changedRecords.push(mergedRecord);
                updated++;
            } else {
                skipped++;
            }
        } else {
            currentStudents.push(incoming);
            nationalIdMap.set(incomingNid, currentStudents.length - 1);
            changedRecords.push(incoming);
            added++;
        }
    });

    saveItems(STORAGE_KEYS.STUDENTS, currentStudents);
    
    // Bulk Queue
    if (changedRecords.length > 0) {
        addToSyncQueue(STORAGE_KEYS.STUDENTS, 'UPSERT', changedRecords);
    }

    return { added, updated, skipped };
};

export const bulkAddStudents = (newStudents: Student[]): void => {
  bulkUpsertStudents(newStudents, 'nationalId', 'NEW');
};

export const deleteStudent = (id: string): void => {
  const students = getStudents().filter(s => s.id !== id);
  saveItems(STORAGE_KEYS.STUDENTS, students);
  addToSyncQueue(STORAGE_KEYS.STUDENTS, 'DELETE', id);
};

export const deleteAllStudents = (): void => {
    saveItems(STORAGE_KEYS.STUDENTS, []);
    // Note: DeleteAll is dangerous to sync blindly. 
    // Usually admin should clear DB explicitly.
};

// --- Teachers ---
export const getTeachers = (): Teacher[] => getItems<Teacher>(STORAGE_KEYS.TEACHERS);
export const addTeacher = (item: Teacher) => {
    const list = getTeachers();
    list.push(item);
    saveItems(STORAGE_KEYS.TEACHERS, list);
    addToSyncQueue(STORAGE_KEYS.TEACHERS, 'UPSERT', item);
};
export const deleteTeacher = (id: string) => {
    saveItems(STORAGE_KEYS.TEACHERS, getTeachers().filter(i => i.id !== id));
    addToSyncQueue(STORAGE_KEYS.TEACHERS, 'DELETE', id);
};

// --- Parents ---
export const getParents = (): Parent[] => getItems<Parent>(STORAGE_KEYS.PARENTS);
export const addParent = (item: Parent) => {
    const list = getParents();
    list.push(item);
    saveItems(STORAGE_KEYS.PARENTS, list);
    addToSyncQueue(STORAGE_KEYS.PARENTS, 'UPSERT', item);
};
export const deleteParent = (id: string) => {
    saveItems(STORAGE_KEYS.PARENTS, getParents().filter(i => i.id !== id));
    addToSyncQueue(STORAGE_KEYS.PARENTS, 'DELETE', id);
};

// --- Hierarchy ---
export const getStages = (): EducationalStage[] => getItems<EducationalStage>(STORAGE_KEYS.STAGES);
export const addStage = (item: EducationalStage) => {
    const list = getStages();
    list.push(item);
    saveItems(STORAGE_KEYS.STAGES, list);
    addToSyncQueue(STORAGE_KEYS.STAGES, 'UPSERT', item);
};
export const deleteStage = (id: string) => {
    saveItems(STORAGE_KEYS.STAGES, getStages().filter(i => i.id !== id));
    addToSyncQueue(STORAGE_KEYS.STAGES, 'DELETE', id);
};

export const getGrades = (): GradeLevel[] => getItems<GradeLevel>(STORAGE_KEYS.GRADES);
export const addGrade = (item: GradeLevel) => {
    const list = getGrades();
    list.push(item);
    saveItems(STORAGE_KEYS.GRADES, list);
    addToSyncQueue(STORAGE_KEYS.GRADES, 'UPSERT', item);
};
export const deleteGrade = (id: string) => {
    saveItems(STORAGE_KEYS.GRADES, getGrades().filter(i => i.id !== id));
    addToSyncQueue(STORAGE_KEYS.GRADES, 'DELETE', id);
};

export const getClasses = (): ClassRoom[] => getItems<ClassRoom>(STORAGE_KEYS.CLASSES);
export const addClass = (item: ClassRoom) => {
    const list = getClasses();
    list.push(item);
    saveItems(STORAGE_KEYS.CLASSES, list);
    addToSyncQueue(STORAGE_KEYS.CLASSES, 'UPSERT', item);
};
export const deleteClass = (id: string) => {
    saveItems(STORAGE_KEYS.CLASSES, getClasses().filter(i => i.id !== id));
    addToSyncQueue(STORAGE_KEYS.CLASSES, 'DELETE', id);
};

export const getSubjects = (): Subject[] => getItems<Subject>(STORAGE_KEYS.SUBJECTS);
export const addSubject = (item: Subject) => {
    const list = getSubjects();
    list.push(item);
    saveItems(STORAGE_KEYS.SUBJECTS, list);
    addToSyncQueue(STORAGE_KEYS.SUBJECTS, 'UPSERT', item);
};
export const deleteSubject = (id: string) => {
    saveItems(STORAGE_KEYS.SUBJECTS, getSubjects().filter(i => i.id !== id));
    addToSyncQueue(STORAGE_KEYS.SUBJECTS, 'DELETE', id);
};

// --- Attendance ---
export const getAttendance = (): AttendanceRecord[] => getItems<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);
export const saveAttendance = (records: AttendanceRecord[]): void => {
  const current = getAttendance();
  const newRecordsMap = new Map(records.map(r => [`${r.studentId}-${r.date}`, r]));
  const updated = current.filter(r => !newRecordsMap.has(`${r.studentId}-${r.date}`));
  updated.push(...records);
  saveItems(STORAGE_KEYS.ATTENDANCE, updated);
  
  addToSyncQueue(STORAGE_KEYS.ATTENDANCE, 'UPSERT', records);
};
export const bulkAddAttendance = (records: AttendanceRecord[]): void => saveAttendance(records);

// --- Performance ---
export const getPerformance = (): PerformanceRecord[] => getItems<PerformanceRecord>(STORAGE_KEYS.PERFORMANCE);
export const addPerformance = (record: PerformanceRecord): void => {
  const current = getPerformance();
  current.push(record);
  saveItems(STORAGE_KEYS.PERFORMANCE, current);
  addToSyncQueue(STORAGE_KEYS.PERFORMANCE, 'UPSERT', record);
};

export const bulkAddPerformance = (records: PerformanceRecord[]): void => {
    let current = getPerformance();
    const newMap = new Map(records.map(r => [r.id, r]));
    current = current.map(r => newMap.has(r.id) ? newMap.get(r.id)! : r);
    const currentIds = new Set(current.map(r => r.id));
    records.forEach(r => { if (!currentIds.has(r.id)) current.push(r); });

    saveItems(STORAGE_KEYS.PERFORMANCE, current);
    addToSyncQueue(STORAGE_KEYS.PERFORMANCE, 'UPSERT', records);
};

// --- Works Configuration ---
export const getWorksConfig = (category: PerformanceCategory): WorksColumnConfig[] => {
    const allConfigs = getItems<Record<string, WorksColumnConfig[]>>(STORAGE_KEYS.WORKS_CONFIG);
    // @ts-ignore
    return allConfigs[category] || [];
};
export const saveWorksConfig = (category: PerformanceCategory, config: WorksColumnConfig[]) => {
    const allConfigs = getItems<Record<string, WorksColumnConfig[]>>(STORAGE_KEYS.WORKS_CONFIG) || {};
    // @ts-ignore
    allConfigs[category] = config;
    localStorage.setItem(STORAGE_KEYS.WORKS_CONFIG, JSON.stringify(allConfigs));
};

export const saveWorksMasterUrl = (url: string) => {
    localStorage.setItem(STORAGE_KEYS.WORKS_MASTER_URL, url);
};

export const getWorksMasterUrl = (): string => {
    return localStorage.getItem(STORAGE_KEYS.WORKS_MASTER_URL) || '';
};

// --- System Admin ---
export const getSchools = (): School[] => getItems<School>(STORAGE_KEYS.SCHOOLS);
export const addSchool = (school: School) => {
    const list = getSchools();
    list.push(school);
    saveItems(STORAGE_KEYS.SCHOOLS, list);
    addToSyncQueue(STORAGE_KEYS.SCHOOLS, 'UPSERT', school);
};
export const deleteSchool = (id: string) => {
    saveItems(STORAGE_KEYS.SCHOOLS, getSchools().filter(s => s.id !== id));
    addToSyncQueue(STORAGE_KEYS.SCHOOLS, 'DELETE', id);
};

export const getSystemUsers = (): SystemUser[] => getItems<SystemUser>(STORAGE_KEYS.SYSTEM_USERS);
export const addSystemUser = (user: SystemUser) => {
    const list = getSystemUsers();
    list.push(user);
    saveItems(STORAGE_KEYS.SYSTEM_USERS, list);
    addToSyncQueue(STORAGE_KEYS.SYSTEM_USERS, 'UPSERT', user);
};
export const deleteSystemUser = (id: string) => {
    saveItems(STORAGE_KEYS.SYSTEM_USERS, getSystemUsers().filter(u => u.id !== id));
    addToSyncQueue(STORAGE_KEYS.SYSTEM_USERS, 'DELETE', id);
};

// --- Custom Tables (Local Only) ---
export const getCustomTables = (): CustomTable[] => getItems<CustomTable>(STORAGE_KEYS.CUSTOM_TABLES);
export const addCustomTable = (table: CustomTable) => {
    const list = getCustomTables();
    list.push(table);
    saveItems(STORAGE_KEYS.CUSTOM_TABLES, list);
};
export const updateCustomTable = (table: CustomTable) => {
    const list = getCustomTables();
    const index = list.findIndex(t => t.id === table.id);
    if (index !== -1) {
        list[index] = table;
        saveItems(STORAGE_KEYS.CUSTOM_TABLES, list);
    }
};
export const deleteCustomTable = (id: string) => {
    saveItems(STORAGE_KEYS.CUSTOM_TABLES, getCustomTables().filter(t => t.id !== id));
};

// --- Utils ---
export const createBackup = (): string => {
    const backup: Record<string, any> = {};
    Object.values(STORAGE_KEYS).forEach(key => {
        backup[key] = localStorage.getItem(key);
    });
    return JSON.stringify(backup);
};

export const restoreBackup = (jsonString: string): boolean => {
    try {
        const backup = JSON.parse(jsonString);
        Object.keys(backup).forEach(key => {
            if (backup[key]) localStorage.setItem(key, backup[key]);
        });
        return true;
    } catch (e) {
        return false;
    }
};

export const clearDatabase = () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
};

export const getStorageStatistics = () => {
    return {
        students: getItems(STORAGE_KEYS.STUDENTS).length,
        attendance: getItems(STORAGE_KEYS.ATTENDANCE).length,
        performance: getItems(STORAGE_KEYS.PERFORMANCE).length,
        teachers: getItems(STORAGE_KEYS.TEACHERS).length,
        parents: getItems(STORAGE_KEYS.PARENTS).length,
        classes: getItems(STORAGE_KEYS.CLASSES).length,
        schools: getItems(STORAGE_KEYS.SCHOOLS).length,
        users: getItems(STORAGE_KEYS.SYSTEM_USERS).length,
    };
};

export const checkConnection = async (): Promise<{ success: boolean; latency?: number; message?: string }> => {
    const supabase = getSupabaseClient();
    if (!supabase) return { success: false, message: 'Client not initialized' };

    const start = performance.now();
    try {
        const { error } = await supabase.from('schools').select('*', { count: 'exact', head: true });
        const end = performance.now();
        if (error) throw error;
        return { success: true, latency: Math.round(end - start) };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const getTableDisplayName = (tableName: string) => {
    switch(tableName) {
        case 'students': return 'الطلاب';
        case 'attendance_records': return 'سجل الحضور';
        case 'performance_records': return 'سجل الأداء';
        case 'teachers': return 'المعلمين';
        case 'parents': return 'أولياء الأمور';
        case 'educational_stages': return 'المراحل';
        case 'grade_levels': return 'الصفوف';
        case 'classes': return 'الفصول';
        case 'subjects': return 'المواد';
        case 'schools': return 'المدارس';
        case 'system_users': return 'المستخدمين';
        default: return tableName;
    }
};

export const uploadToSupabase = async () => {
    // Manual full sync
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase client not initialized.");
    const uploadOrder = [
        STORAGE_KEYS.SCHOOLS, STORAGE_KEYS.STAGES, STORAGE_KEYS.GRADES, 
        STORAGE_KEYS.CLASSES, STORAGE_KEYS.SUBJECTS, STORAGE_KEYS.TEACHERS, 
        STORAGE_KEYS.PARENTS, STORAGE_KEYS.STUDENTS, STORAGE_KEYS.SYSTEM_USERS, 
        STORAGE_KEYS.ATTENDANCE, STORAGE_KEYS.PERFORMANCE
    ];

    for (const key of uploadOrder) {
        const localData = getItems(key);
        // @ts-ignore
        const tableName = DB_MAP[key];
        if (localData.length > 0) {
            const transformedData = localData.map(toSnakeCase);
            const { error } = await supabase.from(tableName).upsert(transformedData, { onConflict: 'id' });
            if (error) throw new Error(`فشل رفع ${tableName}: ${error.message}`);
        }
    }
};

export const downloadFromSupabase = async () => {
    // Manual full download
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase client not initialized.");

    const downloadOrder = Object.keys(DB_MAP); 
    for (const key of downloadOrder) {
        // @ts-ignore
        const tableName = DB_MAP[key];
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw new Error(`فشل تحميل ${tableName}: ${error.message}`);
        if (data) {
             const transformedData = data.map((item: any) => {
                const newItem: any = {};
                Object.keys(item).forEach(k => {
                    const camelKey = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                    newItem[camelKey] = item[k];
                });
                return newItem;
            });
            saveItems(key, transformedData);
        }
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

export const seedData = () => {};