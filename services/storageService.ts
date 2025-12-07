
// ... existing imports ...
import { 
    Student, Teacher, School, SystemUser, AttendanceRecord, PerformanceRecord, 
    Assignment, ScheduleItem, TeacherAssignment, Subject, CustomTable, 
    LessonLink, MessageLog, Feedback, ReportHeaderConfig, AISettings, UserTheme, 
    PerformanceCategory 
} from '../types';
import { supabase } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

// --- INITIAL DATA & CACHE ---
const INITIAL_DATA = {
    students: [] as Student[],
    teachers: [] as Teacher[],
    schools: [] as School[],
    system_users: [] as SystemUser[],
    attendance_records: [] as AttendanceRecord[],
    performance_records: [] as PerformanceRecord[],
    assignments: [] as Assignment[],
    schedules: [] as ScheduleItem[],
    teacher_assignments: [] as TeacherAssignment[],
    subjects: [] as Subject[],
    custom_tables: [] as CustomTable[],
    lesson_links: [] as LessonLink[],
    message_logs: [] as MessageLog[],
    feedbacks: [] as Feedback[],
    report_header_config: {} as ReportHeaderConfig,
    ai_settings: {} as AISettings,
    user_theme: {} as UserTheme,
    works_master_url: ''
};

// Mapping for Supabase tables
const TABLE_MAPPING: Record<string, string> = {
    students: 'students',
    teachers: 'teachers',
    schools: 'schools',
    system_users: 'system_users',
    attendance_records: 'attendance_records',
    performance_records: 'performance_records',
    assignments: 'assignments',
    schedules: 'schedules',
    teacher_assignments: 'teacher_assignments',
    subjects: 'subjects',
    custom_tables: 'custom_tables',
    lesson_links: 'lesson_links',
    message_logs: 'message_logs',
    feedbacks: 'feedbacks'
};

let CACHE: typeof INITIAL_DATA = { ...INITIAL_DATA };
let IS_DEMO_MODE = false;
let realtimeChannel: RealtimeChannel | null = null;

// --- DATA NORMALIZATION HELPER ---
// Fixes issue where Supabase/Postgres returns lowercase keys (e.g. nationalid) 
// but App expects camelCase (e.g. nationalId)
const normalizeRecord = (record: any) => {
    if (!record || typeof record !== 'object') return record;
    const normalized: any = { ...record };

    const mappings: Record<string, string> = {
        'nationalid': 'nationalId',
        'ministrycode': 'ministryCode',
        'managername': 'managerName',
        'managernationalid': 'managerNationalId',
        'educationadministration': 'educationAdministration',
        'studentcount': 'studentCount',
        'worksmasterurl': 'worksMasterUrl',
        'schoolid': 'schoolId',
        'createdbyid': 'createdById',
        'gradelevel': 'gradeLevel',
        'classname': 'className',
        'parentname': 'parentName',
        'parentphone': 'parentPhone',
        'parentemail': 'parentEmail',
        'seatindex': 'seatIndex',
        'subjectspecialty': 'subjectSpecialty',
        'managerid': 'managerId',
        'subscriptionstatus': 'subscriptionStatus',
        'subscriptionenddate': 'subscriptionEndDate',
        'behaviorstatus': 'behaviorStatus',
        'behaviornote': 'behaviorNote',
        'excusenote': 'excuseNote',
        'excusefile': 'excuseFile',
        'maxscore': 'maxScore',
        'sourcemetadata': 'sourceMetadata',
        'teacherid': 'teacherId',
        'subjectname': 'subjectName',
        'sourceurl': 'sourceUrl',
        'lastupdated': 'lastUpdated',
        'parentid': 'parentId'
    };

    Object.keys(record).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (mappings[lowerKey]) {
            // If the camelCase key doesn't exist but the lowercase one does, map it
            if (normalized[mappings[lowerKey]] === undefined && record[key] !== undefined) {
                normalized[mappings[lowerKey]] = record[key];
            }
        }
    });

    return normalized;
};

// --- SYNC STATUS MANAGEMENT ---
export type SyncStatus = 'IDLE' | 'SYNCING' | 'ONLINE' | 'OFFLINE' | 'ERROR';
let currentSyncStatus: SyncStatus = 'IDLE';
const syncListeners: ((status: SyncStatus) => void)[] = [];
const dataChangeListeners: (() => void)[] = [];

// --- OFFLINE SYNC QUEUE ---
interface SyncTask {
    id: string;
    table: string;
    data: any;
    action: 'UPSERT' | 'DELETE';
    timestamp: number;
}
let SYNC_QUEUE: SyncTask[] = [];

const loadQueue = () => {
    if (typeof window === 'undefined') return;
    const q = localStorage.getItem('sync_queue');
    if (q) {
        try {
            SYNC_QUEUE = JSON.parse(q);
        } catch(e) { SYNC_QUEUE = []; }
    }
}

const saveQueue = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sync_queue', JSON.stringify(SYNC_QUEUE));
}

const addToQueue = (table: string, data: any, action: 'UPSERT' | 'DELETE') => {
    SYNC_QUEUE.push({
        id: Date.now().toString() + Math.random(),
        table,
        data,
        action,
        timestamp: Date.now()
    });
    saveQueue();
};

const processSyncQueue = async () => {
    if (SYNC_QUEUE.length === 0) return;
    if (!navigator.onLine) {
        setSyncStatus('OFFLINE');
        return;
    }

    setSyncStatus('SYNCING');
    console.log(`Processing ${SYNC_QUEUE.length} queued items...`);
    
    // Process copy of queue
    const queueSnapshot = [...SYNC_QUEUE];
    let processedCount = 0;
    
    for (const task of queueSnapshot) {
        try {
            if (task.action === 'UPSERT') {
                await supabase.from(task.table).upsert(task.data, { onConflict: 'id' });
            } else {
                await supabase.from(task.table).delete().eq('id', task.data);
            }
            processedCount++;
        } catch (e) {
            console.error("Queue processing failed at task", task, e);
            break; 
        }
    }

    if (processedCount > 0) {
        SYNC_QUEUE.splice(0, processedCount);
        saveQueue();
    }

    if (SYNC_QUEUE.length === 0) setSyncStatus('ONLINE');
    else setSyncStatus('ERROR');
};

const setSyncStatus = (status: SyncStatus) => {
    currentSyncStatus = status;
    syncListeners.forEach(l => l(status));
};

export const subscribeToSyncStatus = (listener: (status: SyncStatus) => void) => {
    syncListeners.push(listener);
    listener(currentSyncStatus); // Initial state
    return () => {
        const idx = syncListeners.indexOf(listener);
        if (idx > -1) syncListeners.splice(idx, 1);
    };
};

export const subscribeToDataChanges = (listener: () => void) => {
    dataChangeListeners.push(listener);
    return () => {
        const idx = dataChangeListeners.indexOf(listener);
        if (idx > -1) dataChangeListeners.splice(idx, 1);
    };
};

const notifyDataChange = () => {
    dataChangeListeners.forEach(l => l());
};

// --- HELPERS ---
const loadFromLocal = () => {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(INITIAL_DATA);
    keys.forEach(key => {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                CACHE[key as keyof typeof INITIAL_DATA] = JSON.parse(stored);
            } catch (e) { console.error(`Error loading ${key}`, e); }
        }
    });
    loadQueue();
};

const saveToLocal = (key: keyof typeof INITIAL_DATA, data: any) => {
    if (typeof window === 'undefined') return;
    CACHE[key] = data;
    localStorage.setItem(key, JSON.stringify(data));
};

// Initialize
loadFromLocal();

export const setSystemMode = (isDemo: boolean) => {
    IS_DEMO_MODE = isDemo;
    if (isDemo) {
        // Seed some demo data if empty
        if (CACHE.students.length === 0) {
            CACHE.students = [
                { id: '1', name: 'أحمد علي', nationalId: '1010101010', className: '1/A', gradeLevel: 'الصف الأول' },
                { id: '2', name: 'خالد محمد', nationalId: '1020202020', className: '1/A', gradeLevel: 'الصف الأول' }
            ];
        }
        if (CACHE.system_users.length === 0) {
            CACHE.system_users = [
                { id: 'demo_m', name: 'مدير تجريبي', email: 'manager@demo.com', role: 'SCHOOL_MANAGER', status: 'ACTIVE' },
                { id: 'demo_t', name: 'معلم تجريبي', email: 'teacher@demo.com', role: 'TEACHER', status: 'ACTIVE' }
            ];
        }
    } else {
        loadFromLocal(); // Reload real data
    }
    notifyDataChange();
};

export const getStorageStatistics = () => {
    return {
        students: CACHE.students.length,
        attendance: CACHE.attendance_records.length,
        performance: CACHE.performance_records.length
    };
};

// --- CRUD OPERATIONS WITH CLOUD SYNC ---
const pushToCloud = async (table: string, data: any, action: 'UPSERT' | 'DELETE' = 'UPSERT') => {
    if (IS_DEMO_MODE) return;
    
    // 1. If offline, Queue immediately
    if (!navigator.onLine) {
        addToQueue(table, data, action);
        setSyncStatus('OFFLINE');
        return;
    }

    setSyncStatus('SYNCING');
    try {
        if (action === 'UPSERT') {
            await supabase.from(table).upsert(data, { onConflict: 'id' });
        } else {
            await supabase.from(table).delete().eq('id', data);
        }
        setSyncStatus('ONLINE');
    } catch (e) {
        console.warn('Cloud sync failed, queueing...', e);
        addToQueue(table, data, action);
        setSyncStatus('ERROR');
    }
};

// 1. STUDENTS
export const getStudents = (): Student[] => CACHE.students || [];
export const addStudent = async (item: Student) => {
    const list = [...(CACHE.students || []), item];
    saveToLocal('students', list);
    notifyDataChange();
    pushToCloud('students', item);
};
export const updateStudent = async (item: Student) => {
    const list = (CACHE.students || []).map((s: Student) => s.id === item.id ? item : s);
    saveToLocal('students', list);
    notifyDataChange();
    pushToCloud('students', item);
};
export const deleteStudent = async (id: string) => {
    const list = (CACHE.students || []).filter((s: Student) => s.id !== id);
    saveToLocal('students', list);
    notifyDataChange();
    pushToCloud('students', id, 'DELETE');
};
export const deleteAllStudents = async () => {
    saveToLocal('students', []);
    notifyDataChange();
};
export const bulkAddStudents = async (items: Student[]) => {
    saveToLocal('students', [...(CACHE.students || []), ...items]);
    notifyDataChange();
    pushToCloud('students', items);
};
export const bulkUpsertStudents = async (items: Student[], key: keyof Student = 'nationalId') => {
    let list = [...(CACHE.students || [])];
    items.forEach(newItem => {
        const idx = list.findIndex((s: Student) => s[key] && s[key] === newItem[key]);
        if (idx >= 0) list[idx] = { ...list[idx], ...newItem };
        else list.push(newItem);
    });
    saveToLocal('students', list);
    notifyDataChange();
    pushToCloud('students', items);
};

// 2. ATTENDANCE
export const getAttendance = (): AttendanceRecord[] => CACHE.attendance_records || [];
export const saveAttendance = async (items: AttendanceRecord[]) => {
    let list = [...(CACHE.attendance_records || [])];
    items.forEach(newItem => {
        const idx = list.findIndex((r: AttendanceRecord) => r.id === newItem.id);
        if (idx >= 0) list[idx] = newItem;
        else list.push(newItem);
    });
    saveToLocal('attendance_records', list);
    notifyDataChange();
    pushToCloud('attendance_records', items);
};
export const bulkAddAttendance = (items: AttendanceRecord[]) => saveAttendance(items);

// 3. PERFORMANCE
export const getPerformance = (): PerformanceRecord[] => CACHE.performance_records || [];
export const addPerformance = async (item: PerformanceRecord) => {
    saveToLocal('performance_records', [...(CACHE.performance_records || []), item]);
    notifyDataChange();
    pushToCloud('performance_records', item);
};
export const deletePerformance = async (id: string) => {
    const list = (CACHE.performance_records || []).filter((p: PerformanceRecord) => p.id !== id);
    saveToLocal('performance_records', list);
    notifyDataChange();
    pushToCloud('performance_records', id, 'DELETE');
};
export const bulkAddPerformance = async (items: PerformanceRecord[]) => {
    saveToLocal('performance_records', [...(CACHE.performance_records || []), ...items]);
    notifyDataChange();
    pushToCloud('performance_records', items);
};

// 4. SCHOOLS
export const getSchools = (): School[] => CACHE.schools || [];
export const addSchool = async (item: School) => {
    saveToLocal('schools', [...(CACHE.schools || []), item]);
    notifyDataChange();
    pushToCloud('schools', item);
};
export const updateSchool = async (item: School) => {
    const list = (CACHE.schools || []).map((s: School) => s.id === item.id ? item : s);
    saveToLocal('schools', list);
    notifyDataChange();
    pushToCloud('schools', item);
};
export const deleteSchool = async (id: string) => {
    const list = (CACHE.schools || []).filter((s: School) => s.id !== id);
    saveToLocal('schools', list);
    notifyDataChange();
    pushToCloud('schools', id, 'DELETE');
};

// 5. SYSTEM USERS
export const getSystemUsers = (): SystemUser[] => CACHE.system_users || [];
export const addSystemUser = async (item: SystemUser) => {
    saveToLocal('system_users', [...(CACHE.system_users || []), item]);
    notifyDataChange();
    pushToCloud('system_users', item);
};
export const updateSystemUser = async (item: SystemUser) => {
    const list = (CACHE.system_users || []).map((u: SystemUser) => u.id === item.id ? item : u);
    saveToLocal('system_users', list);
    notifyDataChange();
    pushToCloud('system_users', item);
};
export const deleteSystemUser = async (id: string) => {
    const list = (CACHE.system_users || []).filter((u: SystemUser) => u.id !== id);
    saveToLocal('system_users', list);
    notifyDataChange();
    pushToCloud('system_users', id, 'DELETE');
};

// 6. TEACHERS
export const getTeachers = (): Teacher[] => CACHE.teachers || [];
export const addTeacher = async (item: Teacher) => {
    const updatedTeachers = [...(CACHE.teachers || []), item];
    saveToLocal('teachers', updatedTeachers);
    
    // Auto-create system user locally
    const users = getSystemUsers();
    if (!users.find(u => u.email === item.email)) {
        const newUser: SystemUser = {
            id: item.id,
            name: item.name,
            email: item.email || item.nationalId || '',
            nationalId: item.nationalId, // Explicitly save nationalId
            role: 'TEACHER',
            schoolId: item.schoolId,
            status: 'ACTIVE',
            password: item.password
        };
        addSystemUser(newUser); 
    }
    notifyDataChange();
    pushToCloud('teachers', item);
};
export const updateTeacher = async (item: Teacher) => {
    const list = (CACHE.teachers || []).map((t: Teacher) => t.id === item.id ? item : t);
    saveToLocal('teachers', list);
    notifyDataChange();
    pushToCloud('teachers', item);
};

// 7. ASSIGNMENTS
export const getAssignments = (category?: PerformanceCategory, teacherId?: string): Assignment[] => {
    let list = CACHE.assignments || [];
    if (category) list = list.filter((a: Assignment) => a.category === category);
    // Fix: Allow assignments without teacherId (legacy or global)
    if (teacherId) list = list.filter((a: Assignment) => a.teacherId === teacherId || !a.teacherId);
    return list;
};
export const saveAssignment = async (item: Assignment) => {
    let list = [...(CACHE.assignments || [])];
    const idx = list.findIndex((a: Assignment) => a.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    saveToLocal('assignments', list);
    notifyDataChange();
    pushToCloud('assignments', item);
};
export const deleteAssignment = async (id: string) => {
    const list = (CACHE.assignments || []).filter((a: Assignment) => a.id !== id);
    saveToLocal('assignments', list);
    notifyDataChange();
    pushToCloud('assignments', id, 'DELETE');
};

// 8. SCHEDULES
export const getSchedules = (): ScheduleItem[] => CACHE.schedules || [];
export const saveScheduleItem = async (item: ScheduleItem) => {
    let list = [...(CACHE.schedules || [])];
    const idx = list.findIndex((s: ScheduleItem) => s.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    saveToLocal('schedules', list);
    notifyDataChange();
    pushToCloud('schedules', item);
};
export const deleteScheduleItem = async (id: string) => {
    const list = (CACHE.schedules || []).filter((s: ScheduleItem) => s.id !== id);
    saveToLocal('schedules', list);
    notifyDataChange();
    pushToCloud('schedules', id, 'DELETE');
};

// 9. TEACHER ASSIGNMENTS
export const getTeacherAssignments = (): TeacherAssignment[] => CACHE.teacher_assignments || [];
export const saveTeacherAssignment = async (item: TeacherAssignment) => {
    let list = [...(CACHE.teacher_assignments || [])];
    const idx = list.findIndex((a: TeacherAssignment) => a.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    saveToLocal('teacher_assignments', list);
    notifyDataChange();
    pushToCloud('teacher_assignments', item);
};

// 10. SUBJECTS
export const getSubjects = (teacherId?: string): Subject[] => {
    const allSubjects = CACHE.subjects || [];
    // Fix: Allow subjects without teacherId (legacy or global)
    if (teacherId) return allSubjects.filter((s: Subject) => s.teacherId === teacherId || !s.teacherId);
    return allSubjects;
};
export const addSubject = async (item: Subject) => {
    saveToLocal('subjects', [...(CACHE.subjects || []), item]);
    notifyDataChange();
    pushToCloud('subjects', item);
};
export const deleteSubject = async (id: string) => {
    const list = (CACHE.subjects || []).filter((s: Subject) => s.id !== id);
    saveToLocal('subjects', list);
    notifyDataChange();
    pushToCloud('subjects', id, 'DELETE');
};

// 11. CUSTOM TABLES
export const getCustomTables = (teacherId?: string): CustomTable[] => {
    const allTables = CACHE.custom_tables || [];
    // Fix: Allow tables without teacherId (legacy or global)
    if (teacherId) return allTables.filter((t: CustomTable) => t.teacherId === teacherId || !t.teacherId);
    return allTables;
};
export const addCustomTable = async (item: CustomTable) => {
    saveToLocal('custom_tables', [...(CACHE.custom_tables || []), item]);
    notifyDataChange();
    pushToCloud('custom_tables', item);
};
export const updateCustomTable = async (item: CustomTable) => {
    const list = (CACHE.custom_tables || []).map((t: CustomTable) => t.id === item.id ? item : t);
    saveToLocal('custom_tables', list);
    notifyDataChange();
    pushToCloud('custom_tables', item);
};
export const deleteCustomTable = async (id: string) => {
    const list = (CACHE.custom_tables || []).filter((t: CustomTable) => t.id !== id);
    saveToLocal('custom_tables', list);
    notifyDataChange();
    pushToCloud('custom_tables', id, 'DELETE');
};

// 12. LESSON LINKS
export const getLessonLinks = (): LessonLink[] => CACHE.lesson_links || [];
export const saveLessonLink = async (item: LessonLink) => {
    saveToLocal('lesson_links', [...(CACHE.lesson_links || []), item]);
    notifyDataChange();
    pushToCloud('lesson_links', item);
};
export const deleteLessonLink = async (id: string) => {
    const list = (CACHE.lesson_links || []).filter((l: LessonLink) => l.id !== id);
    saveToLocal('lesson_links', list);
    notifyDataChange();
    pushToCloud('lesson_links', id, 'DELETE');
};

// 13. MESSAGES
export const getMessages = (): MessageLog[] => CACHE.message_logs || [];
export const saveMessage = async (item: MessageLog) => {
    saveToLocal('message_logs', [item, ...(CACHE.message_logs || [])]);
    notifyDataChange();
    pushToCloud('message_logs', item);
};

// 14. FEEDBACK
export const getFeedback = (): Feedback[] => CACHE.feedbacks || [];
export const addFeedback = async (item: Feedback) => {
    saveToLocal('feedbacks', [...(CACHE.feedbacks || []), item]);
    notifyDataChange();
    pushToCloud('feedbacks', item);
};

// 15. SETTINGS & CONFIG
export const getReportHeaderConfig = (teacherId?: string): ReportHeaderConfig => {
    return CACHE.report_header_config || {
        schoolName: '',
        educationAdmin: '',
        teacherName: '',
        schoolManager: '',
        academicYear: '',
        term: ''
    };
};
export const saveReportHeaderConfig = (config: ReportHeaderConfig) => {
    saveToLocal('report_header_config', config);
};

export const getAISettings = (): AISettings => CACHE.ai_settings || {
    modelId: 'gemini-2.5-flash',
    temperature: 0.7,
    enableReports: true,
    enableQuiz: true,
    enablePlanning: true,
    systemInstruction: ''
};
export const saveAISettings = (settings: AISettings) => saveToLocal('ai_settings', settings);

export const getUserTheme = (): UserTheme => CACHE.user_theme || { mode: 'LIGHT', backgroundStyle: 'FLAT' };
export const saveUserTheme = (theme: UserTheme) => saveToLocal('user_theme', theme);

export const getWorksMasterUrl = (): string => CACHE.works_master_url || '';
export const saveWorksMasterUrl = (url: string) => saveToLocal('works_master_url', url);

// --- HYBRID AUTHENTICATION ---
export const authenticateUser = async (identifier: string, password: string): Promise<SystemUser | null> => {
    let user = (CACHE.system_users || []).find(u => u.email === identifier || u.nationalId === identifier);
    if (user && user.password === password) return user;

    let teacher = (CACHE.teachers || []).find(t => t.email === identifier || t.nationalId === identifier);
    if (teacher && teacher.password === password) return { ...teacher, role: 'TEACHER', email: teacher.email || teacher.nationalId || '' } as SystemUser;

    let student = (CACHE.students || []).find(s => s.nationalId === identifier);
    if (student && (student.password === password || student.nationalId?.slice(-4) === password)) {
         return { ...student, role: 'STUDENT', email: student.nationalId || '' } as unknown as SystemUser;
    }

    setSyncStatus('SYNCING');
    try {
        const { data: cloudUsers } = await supabase.from('system_users').select('*').or(`email.eq.${identifier},nationalId.eq.${identifier}`).limit(1);
        if (cloudUsers && cloudUsers.length > 0) {
            const u = normalizeRecord(cloudUsers[0]);
            if (u.password === password) {
                saveToLocal('system_users', [...(CACHE.system_users || []).filter(x => x.id !== u.id), u]); 
                setSyncStatus('ONLINE');
                return u;
            }
        }

        const { data: cloudTeachers } = await supabase.from('teachers').select('*').or(`email.eq.${identifier},nationalId.eq.${identifier}`).limit(1);
        if (cloudTeachers && cloudTeachers.length > 0) {
            const t = normalizeRecord(cloudTeachers[0]);
            if (t.password === password) {
                const list = (CACHE.teachers || []).filter(x => x.id !== t.id);
                list.push(t);
                saveToLocal('teachers', list);
                const sysUser: SystemUser = { id: t.id, name: t.name, email: t.email || t.nationalId || '', role: 'TEACHER', schoolId: t.schoolId, status: 'ACTIVE', password: t.password, nationalId: t.nationalId };
                saveToLocal('system_users', [...(CACHE.system_users || []).filter(x => x.id !== t.id), sysUser]);
                setSyncStatus('ONLINE');
                return sysUser;
            }
        }

        // --- NEW: Student Cloud Auth ---
        const { data: cloudStudents } = await supabase.from('students').select('*').eq('nationalId', identifier).limit(1);
        if (cloudStudents && cloudStudents.length > 0) {
            const s = normalizeRecord(cloudStudents[0]);
            // Check password (simple check or default to last 4 digits of ID)
            if (s.password === password || s.nationalId.slice(-4) === password) {
                 const studentUser = { ...s, role: 'STUDENT', email: s.nationalId || '' };
                 // Cache student for future use
                 saveToLocal('students', [...(CACHE.students || []).filter(x => x.id !== s.id), s]);
                 setSyncStatus('ONLINE');
                 return studentUser as unknown as SystemUser;
            }
        }

        setSyncStatus('ONLINE');
    } catch (e) {
        setSyncStatus('OFFLINE');
    }
    return null;
}

// --- REALTIME & SYNC UTILS ---
const setupRealtimeSubscription = () => {
    if (realtimeChannel) return;
    realtimeChannel = supabase.channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => handleRealtimeEvent(payload))
        .subscribe();
};

const handleRealtimeEvent = (payload: any) => {
    const { table, eventType, new: newRecord, old: oldRecord } = payload;
    const localKey = Object.keys(TABLE_MAPPING).find(key => TABLE_MAPPING[key] === table);
    if (!localKey) return;

    const currentList = CACHE[localKey as keyof typeof INITIAL_DATA] as any[];
    if (!Array.isArray(currentList)) return;

    const normalizedNew = normalizeRecord(newRecord);

    let updatedList = [...currentList];
    if (eventType === 'INSERT') {
        if (!updatedList.find(item => item.id === normalizedNew.id)) updatedList.push(normalizedNew);
    } else if (eventType === 'UPDATE') {
        updatedList = updatedList.map(item => item.id === normalizedNew.id ? normalizedNew : item);
    } else if (eventType === 'DELETE') {
        updatedList = updatedList.filter(item => item.id !== oldRecord.id);
    }
    saveToLocal(localKey as any, updatedList);
    notifyDataChange();
};

export const createBackup = () => JSON.stringify(CACHE);
export const restoreBackup = (json: string) => {
    try {
        const data = JSON.parse(json);
        Object.keys(data).forEach(key => {
            if (key in CACHE) saveToLocal(key as any, data[key]);
        });
        window.location.reload();
    } catch (e) { alert('Invalid backup file'); }
};
export const clearDatabase = () => {
    localStorage.clear();
    window.location.reload();
};

// --- SCOPED SYNC (Smart Download) ---
export const downloadFromSupabase = async () => {
    let user: SystemUser | null = null;
    try {
        const stored = localStorage.getItem('current_user');
        if (stored) user = JSON.parse(stored);
    } catch (e) {}

    // If no user, generally we don't sync personalized data, but maybe basic config.
    if (!user) return; 

    // Helper to fetch and save
    const fetchAndSave = async (table: string, localKey: string, query?: any) => {
        let builder = supabase.from(table).select('*');
        if (query) builder = query(builder);
        const { data, error } = await builder;
        if (!error && data) {
             const normalizedData = data.map(normalizeRecord); // APPLY NORMALIZATION HERE
             saveToLocal(localKey as any, normalizedData);
        }
    };

    if (user.role === 'SUPER_ADMIN') {
        // Full Sync for Super Admin
        await Promise.all(Object.entries(TABLE_MAPPING).map(([k, t]) => fetchAndSave(t, k)));
    } else if (user.role === 'STUDENT') {
        // --- NEW: Student Specific Sync ---
        await Promise.all([
            fetchAndSave('students', 'students', (q: any) => q.eq('id', user!.id)),
            fetchAndSave('attendance_records', 'attendance_records', (q: any) => q.eq('studentId', user!.id)),
            fetchAndSave('performance_records', 'performance_records', (q: any) => q.eq('studentId', user!.id)),
            // Optional: Fetch school info if linked
            user!.schoolId ? fetchAndSave('schools', 'schools', (q: any) => q.eq('id', user!.schoolId)) : Promise.resolve(),
            fetchAndSave('message_logs', 'message_logs', (q: any) => q.eq('studentId', user!.id)),
        ]);
    } else if (user.schoolId) {
        // Scoped Sync for Manager/Teacher belonging to a school
        // 1. Core Data (School, Students, Teachers, Subjects)
        await Promise.all([
            fetchAndSave('schools', 'schools', (q: any) => q.eq('id', user!.schoolId)),
            fetchAndSave('students', 'students', (q: any) => q.eq('schoolId', user!.schoolId)),
            fetchAndSave('teachers', 'teachers', (q: any) => q.eq('schoolId', user!.schoolId)),
            fetchAndSave('subjects', 'subjects', (q: any) => q.or(`teacherId.eq.${user!.id},teacherId.is.null`)), // Subjects can be global or teacher specific
        ]);

        // 2. Data Dependent on Students (Attendance, Performance)
        const studentIds = (CACHE.students || []).map(s => s.id);
        
        if (studentIds.length > 0) {
            await Promise.all([
                fetchAndSave('attendance_records', 'attendance_records', (q: any) => q.in('studentId', studentIds)),
                fetchAndSave('performance_records', 'performance_records', (q: any) => q.in('studentId', studentIds)),
                fetchAndSave('message_logs', 'message_logs', (q: any) => q.in('studentId', studentIds)),
            ]);
        }

        // 3. User Specific
        await Promise.all([
            fetchAndSave('assignments', 'assignments', (q: any) => q.eq('teacherId', user!.id)),
            fetchAndSave('schedules', 'schedules', (q: any) => q.eq('teacherId', user!.id)),
            fetchAndSave('teacher_assignments', 'teacher_assignments', (q: any) => q.eq('teacherId', user!.id)),
            fetchAndSave('custom_tables', 'custom_tables', (q: any) => q.eq('teacherId', user!.id)),
            fetchAndSave('lesson_links', 'lesson_links', (q: any) => q.eq('teacherId', user!.id)),
        ]);
        
    } else {
        // Independent Teacher (No School ID) - Sync only own data
        await Promise.all([
            fetchAndSave('assignments', 'assignments', (q: any) => q.eq('teacherId', user!.id)),
            fetchAndSave('custom_tables', 'custom_tables', (q: any) => q.eq('teacherId', user!.id)),
            fetchAndSave('lesson_links', 'lesson_links', (q: any) => q.eq('teacherId', user!.id)),
            fetchAndSave('students', 'students', (q: any) => q.eq('createdById', user!.id)),
        ]);
        
        const myStudents = (CACHE.students || []).map(s => s.id);
        if (myStudents.length > 0) {
             await Promise.all([
                fetchAndSave('attendance_records', 'attendance_records', (q: any) => q.in('studentId', myStudents)),
                fetchAndSave('performance_records', 'performance_records', (q: any) => q.in('studentId', myStudents)),
            ]);
        }
    }
};

export const initAutoSync = async () => {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => {
        setSyncStatus('SYNCING');
        processSyncQueue().then(() => downloadFromSupabase()); 
    });
    window.addEventListener('offline', () => setSyncStatus('OFFLINE'));

    if (!navigator.onLine) {
        setSyncStatus('OFFLINE');
        return;
    }

    setSyncStatus('SYNCING');
    try {
        console.log("Starting Scoped Auto-Sync...");
        // Ensure queue is processed first
        await processSyncQueue();
        // Then download fresh data based on scope
        await downloadFromSupabase();
        setupRealtimeSubscription(); 
        setSyncStatus('ONLINE');
        notifyDataChange();
    } catch (e) {
        console.error("Auto Sync Failed:", e);
        setSyncStatus('ERROR');
    }
};

// ... existing Supabase/Cloud functions ...
export const checkConnection = async () => {
    try {
        const { error } = await supabase.from('system_users').select('count', { count: 'exact', head: true });
        if (error && error.code !== 'PGRST116') return { success: false, message: error.message };
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
};

export const uploadToSupabase = async () => {
    const promises = Object.entries(TABLE_MAPPING).map(async ([localKey, tableName]) => {
        const data = CACHE[localKey as keyof typeof INITIAL_DATA];
        if (Array.isArray(data) && data.length > 0) {
            const { error } = await supabase.from(tableName).upsert(data, { onConflict: 'id' });
            if (error) throw new Error(`فشل رفع جدول ${tableName}: ${error.message}`);
        }
    });
    await Promise.all(promises);
};

export const fetchCloudTableData = async (table: string) => {
    const { data, error } = await supabase.from(table).select('*').limit(100);
    if (error) throw error;
    // Apply normalization to view correct keys in Admin Dashboard
    return data.map(normalizeRecord); 
};

export const DB_MAP: Record<string, string> = TABLE_MAPPING;

export const getTableDisplayName = (name: string) => {
    const display: Record<string, string> = {
        students: 'الطلاب', teachers: 'المعلمين', schools: 'المدارس', system_users: 'المستخدمين',
        attendance_records: 'سجل الحضور', performance_records: 'سجل الدرجات', assignments: 'التعيينات',
        schedules: 'الجداول', teacher_assignments: 'توزيع المعلمين', subjects: 'المواد',
        custom_tables: 'جداول خاصة', lesson_links: 'مكتبة الدروس', message_logs: 'سجل الرسائل', feedbacks: 'التغذية الراجعة'
    };
    return display[name] || name;
};

export const getDatabaseSchemaSQL = () => {
    return `
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Schools
create table if not exists schools (
  "id" text primary key, "name" text, "ministryCode" text, "educationAdministration" text,
  "type" text, "managerName" text, "managerNationalId" text, "phone" text, "studentCount" numeric, "worksMasterUrl" text
);

-- 2. System Users
create table if not exists system_users (
  "id" text primary key, "name" text, "email" text, "nationalId" text, "password" text, "role" text, "schoolId" text, "status" text
);

-- 3. Teachers
create table if not exists teachers (
  "id" text primary key, "name" text, "nationalId" text, "password" text, "email" text, "phone" text, "subjectSpecialty" text,
  "schoolId" text, "managerId" text, "subscriptionStatus" text, "subscriptionEndDate" text
);

-- 4. Students
create table if not exists students (
  "id" text primary key, "name" text, "nationalId" text, "password" text, "classId" text, "schoolId" text, "createdById" text,
  "gradeLevel" text, "className" text, "email" text, "phone" text, "parentId" text, "parentName" text, "parentPhone" text, "parentEmail" text, "seatIndex" numeric
);

-- 5. Attendance
create table if not exists attendance_records (
  "id" text primary key, "studentId" text, "date" text, "status" text, "subject" text, "period" numeric,
  "behaviorStatus" text, "behaviorNote" text, "excuseNote" text, "excuseFile" text, "createdById" text
);

-- 6. Performance
create table if not exists performance_records (
  "id" text primary key, "studentId" text, "subject" text, "title" text, "category" text, "score" numeric, "maxScore" numeric,
  "date" text, "notes" text, "url" text, "createdById" text
);

-- 7. Assignments
create table if not exists assignments (
  "id" text primary key, "title" text, "category" text, "maxScore" numeric, "url" text, "isVisible" boolean,
  "orderIndex" numeric, "sourceMetadata" text, "teacherId" text
);

-- 8. Schedules
create table if not exists schedules (
  "id" text primary key, "classId" text, "day" text, "period" numeric, "subjectName" text, "teacherId" text
);

-- 9. Teacher Assignments
create table if not exists teacher_assignments (
  "id" text primary key, "classId" text, "subjectName" text, "teacherId" text
);

-- 10. Subjects
create table if not exists subjects (
  "id" text primary key, "name" text, "teacherId" text
);

-- 11. Custom Tables
create table if not exists custom_tables (
  "id" text primary key, "name" text, "createdAt" text, "columns" jsonb, "rows" jsonb, "sourceUrl" text, "lastUpdated" text, "teacherId" text
);

-- 12. Lesson Links
create table if not exists lesson_links (
  "id" text primary key, "title" text, "url" text, "teacherId" text, "createdAt" text
);

-- 13. Message Logs
create table if not exists message_logs (
  "id" text primary key, "studentId" text, "studentName" text, "parentPhone" text, "type" text, "content" text, "status" text, "date" text, "sentBy" text
);

-- 14. Feedbacks
create table if not exists feedbacks (
  "id" text primary key, "teacherId" text, "managerId" text, "content" text, "date" text, "isRead" boolean
);

-- Note: RLS Policies should be applied in Supabase dashboard to enforce schoolId isolation on the server side.
-- Example: create policy "School Isolation" on students using (schoolId = auth.jwt() -> 'schoolId');
`;
};

export const getDatabaseUpdateSQL = () => {
    return `
-- Add missing columns if they don't exist
alter table if exists students add column if not exists "createdById" text;
alter table if exists teachers add column if not exists "subscriptionStatus" text;
alter table if exists teachers add column if not exists "subscriptionEndDate" text;
alter table if exists schools add column if not exists "educationAdministration" text;
alter table if exists schools add column if not exists "ministryCode" text;
alter table if exists schools add column if not exists "managerNationalId" text;
alter table if exists system_users add column if not exists "nationalId" text;
    `;
};

export const clearCloudTable = async (table: string) => {
    const { error } = await supabase.from(table).delete().neq('id', '000000');
    if (error) throw error;
};

export const resetCloudDatabase = async () => {
    const promises = Object.values(TABLE_MAPPING).map(table => clearCloudTable(table));
    await Promise.all(promises);
};

export const backupCloudDatabase = async () => {
    const backup: any = {};
    for (const [key, table] of Object.entries(TABLE_MAPPING)) {
        const { data } = await supabase.from(table).select('*');
        if (data) backup[key] = data;
    }
    return JSON.stringify(backup);
};

export const restoreCloudDatabase = async (json: string) => {
    const data = JSON.parse(json);
    for (const [key, records] of Object.entries(data)) {
        const table = TABLE_MAPPING[key];
        if (table && Array.isArray(records) && records.length > 0) {
            await supabase.from(table).upsert(records);
        }
    }
    restoreBackup(json);
};
