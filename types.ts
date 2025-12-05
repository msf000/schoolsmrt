
export interface EducationalStage {
  id: string;
  name: string; // e.g., "المرحلة الابتدائية"
}

export interface GradeLevel {
  id: string;
  stageId: string; // Link to EducationalStage
  name: string; // e.g., "الصف الخامس"
}

export interface ClassRoom {
  id: string;
  gradeLevelId: string; // Link to GradeLevel
  name: string; // e.g., "5-A"
}

export interface Student {
  id: string;
  name: string;
  nationalId?: string; // New: National ID / Identity Number
  password?: string; // New: Student Login Password
  classId?: string; // Link to ClassRoom
  // Denormalized fields for easier display if class is deleted, or for imports
  gradeLevel?: string; 
  className?: string;
  
  email?: string;
  phone?: string;
  parentId?: string; // Link to Parent
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string; // New: Parent Email
  
  // For Seating Plan
  seatIndex?: number; // 0 to N
}

export interface Teacher {
  id: string;
  name: string;
  nationalId?: string; // Added
  password?: string;   // Added
  email?: string;
  phone?: string;
  subjectSpecialty?: string;
}

export interface TeacherAssignment {
  id: string;
  classId: string;      // The Class Name (e.g., "1/A")
  subjectName: string;  // The Subject (e.g., "Math")
  teacherId: string;    // The Teacher ID
}

export interface Parent {
  id: string;
  name: string;
  email?: string;
  phone: string;
  childrenIds: string[]; // List of Student IDs
}

export interface Subject {
  id: string;
  name: string;
}

// --- Schedule Types ---
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface ScheduleItem {
  id: string;
  classId: string;
  day: DayOfWeek;
  period: number; // 1 to 8 usually
  subjectName: string;
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED'
}

export enum BehaviorStatus {
  POSITIVE = 'POSITIVE', // Good behavior
  NEGATIVE = 'NEGATIVE', // Disruptive/Bad
  NEUTRAL = 'NEUTRAL'    // Normal
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // ISO Date string YYYY-MM-DD
  status: AttendanceStatus;
  subject?: string; // Subject name
  period?: number; // Added: Period number (1, 2, 3...)
  
  // New Behavior Fields
  behaviorStatus?: BehaviorStatus; 
  behaviorNote?: string;

  // New Excuse Fields
  excuseNote?: string; // Student's written excuse
  excuseFile?: string; // Base64 string of the image/pdf
}

export type PerformanceCategory = 'ACTIVITY' | 'PLATFORM_EXAM' | 'HOMEWORK' | 'YEAR_WORK' | 'OTHER';

// NEW: Dedicated Assignment Table
export interface Assignment {
    id: string; // Unique ID (used as key in WorksTracking)
    title: string;
    category: PerformanceCategory;
    maxScore: number;
    url?: string;
    isVisible: boolean;
    orderIndex?: number;
    sourceMetadata?: string; // JSON string for excel source info
}

export interface PerformanceRecord {
  id: string;
  studentId: string;
  subject: string;
  title: string; // e.g., "Midterm Exam", "Homework 1"
  category?: PerformanceCategory; // New field for classification
  score: number;
  maxScore: number;
  date: string;
  notes?: string; // Used to store Column Key / Assignment ID for linking
  url?: string; // Legacy: kept for compatibility, but Assignment.url is preferred
}

export interface ExternalSource {
    id: string;
    name: string;
    url: string;
    lastSynced?: string;
}

export interface DataSourceConfig {
    sourceId: string; // Reference to ExternalSource
    sheet: string;
    sourceHeader: string; // The column name in the Excel file
}

export interface WorksColumnConfig {
    key: string; // e.g., 'col_1'
    label: string; // e.g., 'Activity 1'
    isVisible: boolean;
    maxScore: number;
    url?: string; // Static Display Link (legacy/info)
    dataSource?: DataSourceConfig; // New: Live Connection Config
}

// --- System Admin Types ---
export interface School {
    id: string;
    name: string;
    educationAdministration?: string; // New: e.g., "Riyadh Education"
    type: 'PUBLIC' | 'PRIVATE' | 'INTERNATIONAL';
    managerName: string;
    phone: string;
    studentCount: number;
    subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'TRIAL';
    worksMasterUrl?: string; // New: Global Cloud Link for Works Tracking
}

export interface SystemUser {
    id: string;
    name: string;
    email: string; // OR National ID for Students
    password?: string; // New: Password field
    role: 'SUPER_ADMIN' | 'SCHOOL_MANAGER' | 'TEACHER' | 'STUDENT';
    schoolId?: string; // If null, super admin
    status: 'ACTIVE' | 'INACTIVE';
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    features: string[];
}

export interface CustomTable {
    id: string;
    name: string;
    createdAt: string;
    columns: string[];
    rows: any[];
    sourceUrl?: string; // Link to refresh data from
    lastUpdated?: string; // Timestamp of last refresh
}

export interface ReportHeaderConfig {
    schoolName: string;
    educationAdmin: string;
    teacherName: string;
    schoolManager: string; // New
    academicYear: string; // New: e.g., 1446
    term: string; // New: e.g., First Term
    logoBase64?: string; // New: To store image locally
}

// --- Message Center Types ---
export interface MessageLog {
    id: string;
    studentId: string;
    studentName: string;
    parentPhone?: string;
    type: 'WHATSAPP' | 'SMS' | 'EMAIL';
    content: string;
    status: 'SENT' | 'FAILED';
    date: string;
    sentBy: string;
}

export type ViewState = 'DASHBOARD' | 'STUDENTS' | 'ATTENDANCE' | 'PERFORMANCE' | 'WORKS_TRACKING' | 'STUDENT_FOLLOWUP' | 'AI_REPORTS' | 'AI_TOOLS' | 'CLASSROOM_SCREEN' | 'CLASSROOM_MANAGEMENT' | 'DATA_IMPORT' | 'SCHOOL_MANAGEMENT' | 'ADMIN_DASHBOARD' | 'CUSTOM_TABLES' | 'MONTHLY_REPORT' | 'MESSAGE_CENTER';
