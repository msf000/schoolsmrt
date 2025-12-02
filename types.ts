
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
}

export interface Teacher {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  subjectSpecialty?: string;
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

export enum AttendanceStatus {
  PRESENT = 'حاضر',
  ABSENT = 'غائب',
  LATE = 'متأخر',
  EXCUSED = 'عذر مقبول'
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // ISO Date string YYYY-MM-DD
  status: AttendanceStatus;
}

export type PerformanceCategory = 'ACTIVITY' | 'PLATFORM_EXAM' | 'HOMEWORK' | 'YEAR_WORK' | 'OTHER';

export interface PerformanceRecord {
  id: string;
  studentId: string;
  subject: string;
  title: string; // e.g., "Midterm Exam", "Homework 1"
  category?: PerformanceCategory; // New field for classification
  score: number;
  maxScore: number;
  date: string;
  notes?: string; // Used to store Column Key (e.g., 'col_1') for Works Tracking
  url?: string; // New: Link extracted from the source cell (e.g., student proof)
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
    type: 'PUBLIC' | 'PRIVATE' | 'INTERNATIONAL';
    managerName: string;
    phone: string;
    studentCount: number;
    subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'TRIAL';
}

export interface SystemUser {
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'SCHOOL_MANAGER' | 'TEACHER';
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

export type ViewState = 'DASHBOARD' | 'STUDENTS' | 'ATTENDANCE' | 'PERFORMANCE' | 'WORKS_TRACKING' | 'AI_REPORTS' | 'DATA_IMPORT' | 'SCHOOL_MANAGEMENT' | 'ADMIN_DASHBOARD' | 'CUSTOM_TABLES';