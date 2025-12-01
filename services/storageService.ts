import { Student, AttendanceRecord, PerformanceRecord, AttendanceStatus, Teacher, Parent, ClassRoom, Subject, EducationalStage, GradeLevel, School, SystemUser, CustomTable } from '../types';
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
    // Custom tables are local-only for now or mapped differently
};

// --- Generic Helper ---
const getItems = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const saveItems = <T>(key: string, items: T[]): void => {
  localStorage.setItem(key, JSON.stringify(items));
};

// --- AUTO SYNC HELPERS ---

const toSnakeCase = (item: any) => {
    const newItem: any = {};
    Object.keys(item).forEach(k => {
        const snakeKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        newItem[snakeKey] = item[k];
    });
    // Sanitize undefined/null
    return JSON.parse(JSON.stringify(newItem));
};

// Fire-and-forget sync to cloud
const autoSyncUpsert = (storageKey: string, data: any | any[]) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // @ts-ignore
    const tableName = DB_MAP[storageKey];
    if (!tableName) return;

    const payload = Array.isArray(data) ? data.map(toSnakeCase) : [toSnakeCase(data)];

    // Non-blocking call
    supabase.from(tableName).upsert(payload, { onConflict: 'id' }).then(({ error }) => {
        if (error) console.warn(`Auto-sync failed for ${tableName}:`, error.message);
        else console.log(`Auto-synced to ${tableName}`);
    });
};

const autoSyncDelete = (storageKey: string, id: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // @ts-ignore
    const tableName = DB_MAP[storageKey];
    if (!tableName) return;

    // Non-blocking call
    supabase.from(tableName).delete().eq('id', id).then(({ error }) => {
        if (error) console.warn(`Auto-delete failed for ${tableName}:`, error.message);
    });
};


// --- Students ---
export const getStudents = (): Student[] => getItems<Student>(STORAGE_KEYS.STUDENTS);

export const addStudent = (student: Student): void => {
  if (!student.nationalId) {
      throw new Error("رقم الهوية إلزامي لإضافة الطالب.");
  }
  const students = getStudents();
  const exists = students.some(s => s.nationalId === student.nationalId);
  if (exists) throw new Error(`رقم الهوية ${student.nationalId} مسجل لطالب آخر بالفعل.`);
  
  students.push(student);
  saveItems(STORAGE_KEYS.STUDENTS, students);
  
  // Direct Cloud Upload
  autoSyncUpsert(STORAGE_KEYS.STUDENTS, student);
};

export const updateStudent = (updatedStudent: Student): void => {
  if (!updatedStudent.nationalId) {
      throw new Error("رقم الهوية لا يمكن أن يكون فارغاً.");
  }
  const students = getStudents();
  const index = students.findIndex(s => s.id === updatedStudent.id);
  if (index !== -1) {
     const collision = students.some(s => s.nationalId === updatedStudent.nationalId && s.id !== updatedStudent.id);
     if (collision) throw new Error(`رقم الهوية ${updatedStudent.nationalId} مسجل لطالب آخر بالفعل.`);
     
    students[index] = updatedStudent;
    saveItems(STORAGE_KEYS.STUDENTS, students);

    // Direct Cloud Upload
    autoSyncUpsert(STORAGE_KEYS.STUDENTS, updatedStudent);
  }
};

export const bulkAddStudents = (newStudents: Student[]): void => {
  bulkUpsertStudents(newStudents, 'nationalId', 'NEW');
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

    const changedRecords: Student[] = []; // Track what changed to upload

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
    
    // Bulk Cloud Upload
    if (changedRecords.length > 0) {
        autoSyncUpsert(STORAGE_KEYS.STUDENTS, changedRecords);
    }

    return { added, updated, skipped };
};

export const deleteStudent = (id: string): void => {
  const students = getStudents().filter(s => s.id !== id);
  saveItems(STORAGE_KEYS.STUDENTS, students);
  
  // Direct Cloud Delete
  autoSyncDelete(STORAGE_KEYS.STUDENTS, id);
};

export const deleteAllStudents = (): void => {
    saveItems(STORAGE_KEYS.STUDENTS, []);
    // Cloud wipe not auto-triggered for safety, user should use "Clear DB" in admin
};

// --- Teachers ---
export const getTeachers = (): Teacher[] => getItems<Teacher>(STORAGE_KEYS.TEACHERS);
export const addTeacher = (item: Teacher) => {
    const list = getTeachers();
    list.push(item);
    saveItems(STORAGE_KEYS.TEACHERS, list);
    autoSyncUpsert(STORAGE_KEYS.TEACHERS, item);
};
export const deleteTeacher = (id: string) => {
    saveItems(STORAGE_KEYS.TEACHERS, getTeachers().filter(i => i.id !== id));
    autoSyncDelete(STORAGE_KEYS.TEACHERS, id);
};

// --- Parents ---
export const getParents = (): Parent[] => getItems<Parent>(STORAGE_KEYS.PARENTS);
export const addParent = (item: Parent) => {
    const list = getParents();
    list.push(item);
    saveItems(STORAGE_KEYS.PARENTS, list);
    autoSyncUpsert(STORAGE_KEYS.PARENTS, item);
};
export const deleteParent = (id: string) => {
    saveItems(STORAGE_KEYS.PARENTS, getParents().filter(i => i.id !== id));
    autoSyncDelete(STORAGE_KEYS.PARENTS, id);
};

// --- Hierarchy: Stages ---
export const getStages = (): EducationalStage[] => getItems<EducationalStage>(STORAGE_KEYS.STAGES);
export const addStage = (item: EducationalStage) => {
    const list = getStages();
    list.push(item);
    saveItems(STORAGE_KEYS.STAGES, list);
    autoSyncUpsert(STORAGE_KEYS.STAGES, item);
};
export const deleteStage = (id: string) => {
    saveItems(STORAGE_KEYS.STAGES, getStages().filter(i => i.id !== id));
    autoSyncDelete(STORAGE_KEYS.STAGES, id);
};

// --- Hierarchy: Grades ---
export const getGrades = (): GradeLevel[] => getItems<GradeLevel>(STORAGE_KEYS.GRADES);
export const addGrade = (item: GradeLevel) => {
    const list = getGrades();
    list.push(item);
    saveItems(STORAGE_KEYS.GRADES, list);
    autoSyncUpsert(STORAGE_KEYS.GRADES, item);
};
export const deleteGrade = (id: string) => {
    saveItems(STORAGE_KEYS.GRADES, getGrades().filter(i => i.id !== id));
    autoSyncDelete(STORAGE_KEYS.GRADES, id);
};

// --- Hierarchy: Classes ---
export const getClasses = (): ClassRoom[] => getItems<ClassRoom>(STORAGE_KEYS.CLASSES);
export const addClass = (item: ClassRoom) => {
    const list = getClasses();
    list.push(item);
    saveItems(STORAGE_KEYS.CLASSES, list);
    autoSyncUpsert(STORAGE_KEYS.CLASSES, item);
};
export const deleteClass = (id: string) => {
    saveItems(STORAGE_KEYS.CLASSES, getClasses().filter(i => i.id !== id));
    autoSyncDelete(STORAGE_KEYS.CLASSES, id);
};

// --- Subjects ---
export const getSubjects = (): Subject[] => getItems<Subject>(STORAGE_KEYS.SUBJECTS);
export const addSubject = (item: Subject) => {
    const list = getSubjects();
    list.push(item);
    saveItems(STORAGE_KEYS.SUBJECTS, list);
    autoSyncUpsert(STORAGE_KEYS.SUBJECTS, item);
};
export const deleteSubject = (id: string) => {
    saveItems(STORAGE_KEYS.SUBJECTS, getSubjects().filter(i => i.id !== id));
    autoSyncDelete(STORAGE_KEYS.SUBJECTS, id);
};


// --- Attendance ---
export const getAttendance = (): AttendanceRecord[] => getItems<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE);

export const saveAttendance = (records: AttendanceRecord[]): void => {
  const current = getAttendance();
  const newRecordsMap = new Map(records.map(r => [`${r.studentId}-${r.date}`, r]));
  const updated = current.filter(r => !newRecordsMap.has(`${r.studentId}-${r.date}`));
  updated.push(...records);
  saveItems(STORAGE_KEYS.ATTENDANCE, updated);

  // Auto Sync (This handles both updates and new inserts for the day)
  autoSyncUpsert(STORAGE_KEYS.ATTENDANCE, records);
};

export const bulkAddAttendance = (records: AttendanceRecord[]): void => {
    saveAttendance(records);
};

// --- Performance ---
export const getPerformance = (): PerformanceRecord[] => getItems<PerformanceRecord>(STORAGE_KEYS.PERFORMANCE);

export const addPerformance = (record: PerformanceRecord): void => {
  const current = getPerformance();
  current.push(record);
  saveItems(STORAGE_KEYS.PERFORMANCE, current);
  autoSyncUpsert(STORAGE_KEYS.PERFORMANCE, record);
};

export const bulkAddPerformance = (records: PerformanceRecord[]): void => {
    const current = getPerformance();
    current.push(...records);
    saveItems(STORAGE_KEYS.PERFORMANCE, current);
    autoSyncUpsert(STORAGE_KEYS.PERFORMANCE, records);
};

// --- System Admin: Schools ---
export const getSchools = (): School[] => getItems<School>(STORAGE_KEYS.SCHOOLS);
export const addSchool = (school: School) => {
    const list = getSchools();
    list.push(school);
    saveItems(STORAGE_KEYS.SCHOOLS, list);
    autoSyncUpsert(STORAGE_KEYS.SCHOOLS, school);
};
export const deleteSchool = (id: string) => {
    saveItems(STORAGE_KEYS.SCHOOLS, getSchools().filter(s => s.id !== id));
    autoSyncDelete(STORAGE_KEYS.SCHOOLS, id);
};

// --- System Admin: Users ---
export const getSystemUsers = (): SystemUser[] => getItems<SystemUser>(STORAGE_KEYS.SYSTEM_USERS);
export const addSystemUser = (user: SystemUser) => {
    const list = getSystemUsers();
    list.push(user);
    saveItems(STORAGE_KEYS.SYSTEM_USERS, list);
    autoSyncUpsert(STORAGE_KEYS.SYSTEM_USERS, user);
};
export const deleteSystemUser = (id: string) => {
    saveItems(STORAGE_KEYS.SYSTEM_USERS, getSystemUsers().filter(u => u.id !== id));
    autoSyncDelete(STORAGE_KEYS.SYSTEM_USERS, id);
};

// --- Custom Tables ---
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

// --- System Admin: Backup/Restore ---
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
            if (backup[key]) {
                localStorage.setItem(key, backup[key]);
            }
        });
        return true;
    } catch (e) {
        console.error("Backup Restore Failed", e);
        return false;
    }
};

export const clearDatabase = () => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
};

// --- Data Statistics Helper ---
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
        // Try to fetch 1 row from schools table just to check connection
        // We use count option to be lightweight, head:true means don't return data
        const { count, error } = await supabase.from('schools').select('*', { count: 'exact', head: true });
        
        const end = performance.now();
        if (error) throw error;
        
        return { success: true, latency: Math.round(end - start) };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

// Helper for reverse lookup (Table Name -> Local Key)
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
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase client not initialized.");

    const uploadOrder = [
        STORAGE_KEYS.SCHOOLS,
        STORAGE_KEYS.STAGES,
        STORAGE_KEYS.GRADES,
        STORAGE_KEYS.CLASSES,
        STORAGE_KEYS.SUBJECTS,
        STORAGE_KEYS.TEACHERS,
        STORAGE_KEYS.PARENTS,
        STORAGE_KEYS.STUDENTS,
        STORAGE_KEYS.SYSTEM_USERS,
        STORAGE_KEYS.ATTENDANCE,
        STORAGE_KEYS.PERFORMANCE
    ];

    for (const key of uploadOrder) {
        const localData = getItems(key);
        // @ts-ignore
        const tableName = DB_MAP[key];

        if (localData.length > 0) {
            const transformedData = localData.map(toSnakeCase);

            const { error } = await supabase.from(tableName).upsert(transformedData, { onConflict: 'id' });
            if (error) {
                console.error(`Error uploading ${tableName}:`, error);
                throw new Error(`فشل رفع ${tableName}: ${error.message}`);
            }
        }
    }
};

export const downloadFromSupabase = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase client not initialized.");

    const downloadOrder = Object.keys(DB_MAP); 

    for (const key of downloadOrder) {
        // @ts-ignore
        const tableName = DB_MAP[key];
        const { data, error } = await supabase.from(tableName).select('*');
        
        if (error) {
             console.error(`Error downloading ${tableName}:`, error);
             throw new Error(`فشل تحميل ${tableName}: ${error.message}`);
        }

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
        if (!error) {
            stats[table] = count || 0;
        } else {
            stats[table] = -1; // Indicate error
        }
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

export const seedData = () => {
    // Disabled
};
