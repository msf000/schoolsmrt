
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
    email: string; // OR National ID for Students/Managers
    nationalId?: string; // Added for linking
    password?: string; // New: Password field
    role: 'SUPER_ADMIN' | 'SCHOOL_MANAGER' | 'TEACHER' | 'STUDENT';
    schoolId?: string; // If null, super admin. If Manager, lists owned schools logic handled elsewhere
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
    mode: 'LIGHT' | 'DARK' | 'NATURE' | 'OCEAN' | 'SUNSET';
    backgroundStyle: 'FLAT' | 'GRADIENT' | 'MESH';
}

// --- EXAM SYSTEM TYPES (NEW) ---
export interface Question {
    id: string;
    text: string;
    type: 'MCQ' | 'TRUE_FALSE';
    options: string[]; // For MCQ (e.g. 3-4 options), For TF (True, False)
    correctAnswer: string;
    points: number;
    // New fields for Question Bank
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
    gradeLevel: string; // Target grade
    durationMinutes: number;
    questions: Question[];
    isActive: boolean; // Published to students?
    createdAt: string;
    teacherId?: string; // Creator
}

export interface ExamResult {
    id: string;
    examId: string;
    studentId: string;
    studentName: string;
    score: number;
    totalScore: number;
    date: string;
    answers: Record<string, string>; // questionId -> selectedAnswer
}

// --- CURRICULUM & INTELLIGENCE TYPES (NEW) ---

export interface CurriculumUnit {
    id: string;
    teacherId: string;
    subject: string;
    gradeLevel: string;
    title: string;
    orderIndex: number;
}

export interface CurriculumLesson {
    id: string;
    unitId: string; // Link to CurriculumUnit
    title: string;
    orderIndex: number;
    learningStandards: string[]; // e.g. ["MATH.5.2", "SCI.1.1"] - Ministerial Codes
    microConceptIds?: string[]; // Link to MicroConcepts
}

export interface MicroConcept {
    id: string;
    name: string; // e.g., "Adding fractions with different denominators"
    parentConcept?: string; // e.g., "Fractions"
    subject?: string;
    teacherId: string;
}

export interface StoredLessonPlan {
    id: string;
    teacherId: string;
    lessonId?: string; // Optional Link to CurriculumLesson
    subject: string;
    topic: string; // Lesson Title
    contentJson: string; // Full JSON content of the plan
    resources: string[]; // Links
    createdAt: string;
}

// --- NEW STUDIO TYPES ---
export type LessonBlockType = 'OBJECTIVES' | 'INTRO' | 'STRATEGIES' | 'CONTENT' | 'ACTIVITY' | 'MEDIA' | 'ASSESSMENT' | 'HOMEWORK';

export interface LessonBlock {
    id: string;
    type: LessonBlockType;
    title: string;
    content: string;
    mediaUrl?: string; // Optional for images/videos
    duration?: number; // Optional duration in minutes
}

export type ViewState = 'DASHBOARD' | 'STUDENTS' | 'ATTENDANCE' | 'PERFORMANCE' | 'WORKS_TRACKING' | 'STUDENT_FOLLOWUP' | 'AI_REPORTS' | 'AI_TOOLS' | 'CLASSROOM_SCREEN' | 'CLASSROOM_MANAGEMENT' | 'DATA_IMPORT' | 'SCHOOL_MANAGEMENT' | 'ADMIN_DASHBOARD' | 'CUSTOM_TABLES' | 'MONTHLY_REPORT' | 'MESSAGE_CENTER' | 'AI_DATA_IMPORT' | 'LESSON_PLANNING' | 'SUBSCRIPTION' | 'EXAMS_MANAGER' | 'QUESTION_BANK' | 'AUTO_GRADING' | 'CURRICULUM_MAP' | 'RESOURCES_VIEW' | 'SCHEDULE_VIEW';
