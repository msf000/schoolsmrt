
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
  schoolId?: string; // Link to School
  createdById?: string; // NEW: Strict link to the Teacher who added this student
  // Denormalized fields for easier display if class is deleted, or for imports
  gradeLevel?: string; 
  className?: string;
  
  email?: string;
  phone?: string;
  parentId?: string; // Link to Parent
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string; // New: Parent Email
  password?: string; // Added: Password for student portal
  
  // For Seating Plan
  seatIndex?: number; // 0 to N
}

export interface Teacher {
  id: string;
  name: string;
  nationalId?: string; // Added
  email?: string;
  phone?: string;
  password?: string; // Added: Password
  subjectSpecialty?: string;
  schoolId?: string;   // Link to School
  managerId?: string;  // Link to School Manager (Direct link via National ID search)
  subscriptionStatus?: 'FREE' | 'PRO' | 'ENTERPRISE'; // New
  subscriptionEndDate?: string; // New
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
  teacherId?: string; // NEW: Private subject for this teacher
}

// --- Schedule Types ---
export type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface ScheduleItem {
  id: string;
  classId: string;
  day: DayOfWeek;
  period: number; // 1 to 8 usually
  subjectName: string;
  teacherId?: string; // Linked Teacher ID
}

export interface WeeklyPlanItem {
  id: string;
  teacherId: string;
  classId: string;
  subjectName: string;
  day: DayOfWeek;
  period: number;
  weekStartDate: string; // YYYY-MM-DD of the Sunday of that week
  lessonTopic: string;
  homework: string;
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
  
  createdById?: string; // NEW: Link to the teacher who took attendance
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
    teacherId?: string; // NEW: Assignment belongs to teacher
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
  createdById?: string; // NEW: Link to the teacher who graded this
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
    ministryCode?: string; // NEW: Ministry Code
    educationAdministration?: string; // New: e.g., "Riyadh Education"
    type: 'PUBLIC' | 'PRIVATE' | 'INTERNATIONAL';
    managerName: string;
    managerNationalId?: string; // Link to Manager User
    phone: string;
    studentCount: number;
    // subscriptionStatus removed
    worksMasterUrl?: string; // New: Global Cloud Link for Works Tracking
}

export interface SystemUser {
    id: string;
    name: string;
    email: string;
    nationalId?: string; // Added for linking
    password?: string; // Added: Password
    // Updated Role to explicitly include PARENT
    role: 'SUPER_ADMIN' | 'SCHOOL_MANAGER' | 'TEACHER' | 'STUDENT' | 'PARENT'; 
    schoolId?: string; // If null, super admin. If Manager, lists owned schools logic handled elsewhere
    status: 'ACTIVE' | 'INACTIVE';
    isDemo?: boolean; // For demo accounts
    phone?: string; // For parents
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
    teacherId?: string; // NEW: Private table
}

export interface ReportHeaderConfig {
    schoolName: string;
    educationAdmin: string;
    teacherName: string;
    schoolManager: string; // New
    academicYear: string; // New: e.g., 1446
    term: string; // New: e.g., First Term
    logoBase64?: string; // New: To store image locally
    teacherId?: string; // NEW: Private config
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

// --- Lesson Planning Types ---
export interface LessonLink {
    id: string;
    title: string;
    url: string;
    teacherId?: string; // NEW: Link to the teacher who created it
    createdAt: string;
}

// --- Feedback Types (NEW) ---
export interface Feedback {
    id: string;
    teacherId: string;
    managerId: string;
    content: string;
    date: string;
    isRead: boolean;
}

// --- AI Settings (NEW) ---
export interface AISettings {
    modelId: string; // 'gemini-2.5-flash' | 'gemini-3-pro-preview'
    temperature: number; // 0.0 to 1.0
    enableReports: boolean;
    enableQuiz: boolean;
    enablePlanning: boolean;
    systemInstruction: string; // Custom persona
}

// --- UI Theme Settings (NEW) ---
export interface UserTheme {
    mode: 'LIGHT' | 'DARK';
    backgroundStyle: 'FLAT' | 'GRADIENT';
}

// --- Added Types for Missing References ---

export interface LessonBlock {
    id: string;
    type: 'OBJECTIVES' | 'INTRO' | 'STRATEGIES' | 'CONTENT' | 'ACTIVITY' | 'MEDIA' | 'ASSESSMENT' | 'HOMEWORK';
    title: string;
    content: string;
    mediaUrl?: string;
}

export interface StoredLessonPlan {
    id: string;
    teacherId: string;
    lessonId?: string;
    subject: string;
    topic: string;
    contentJson: string;
    resources: string[];
    createdAt: string;
}

export interface CurriculumUnit {
    id: string;
    teacherId?: string; // Optional if global
    subject: string;
    gradeLevel: string;
    title: string;
    orderIndex: number;
}

export interface CurriculumLesson {
    id: string;
    unitId: string;
    title: string;
    orderIndex: number;
    learningStandards: string[]; // Codes
    microConceptIds: string[];
}

export interface MicroConcept {
    id: string;
    teacherId?: string;
    subject?: string;
    name: string;
}

export interface Question {
    id: string;
    text: string;
    type: 'MCQ' | 'TRUE_FALSE';
    options: string[];
    correctAnswer: string;
    points: number;
    subject?: string;
    gradeLevel?: string;
    topic?: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    teacherId?: string;
}

export interface Exam {
    id: string;
    title: string;
    subject: string;
    gradeLevel: string;
    durationMinutes: number;
    questions: Question[];
    isActive: boolean;
    createdAt: string;
    teacherId?: string;
    date?: string; // Scheduled Date
}

export interface ExamResult {
    id: string;
    examId: string;
    studentId: string;
    studentName: string;
    score: number;
    totalScore: number;
    date: string;
    answers?: Record<string, string>; // questionId -> answer
}

export interface TrackingColumn {
    id: string;
    title: string;
    type: 'NUMBER' | 'TEXT' | 'CHECKBOX' | 'RATING';
    maxScore?: number;
}

export interface TrackingSheet {
    id: string;
    title: string;
    subject: string;
    className: string;
    teacherId: string;
    createdAt: string;
    columns: TrackingColumn[];
    scores: Record<string, Record<string, any>>; // studentId -> colId -> value
}
