
export type Role = 'SUPER_ADMIN' | 'SCHOOL_MANAGER' | 'TEACHER' | 'STUDENT' | 'PARENT';

export enum AttendanceStatus {
    PRESENT = 'PRESENT',
    ABSENT = 'ABSENT',
    LATE = 'LATE',
    EXCUSED = 'EXCUSED'
}

// Added missing BehaviorStatus enum
export enum BehaviorStatus {
    POSITIVE = 'POSITIVE',
    NEGATIVE = 'NEGATIVE',
    NEUTRAL = 'NEUTRAL'
}

export interface FlippedComment {
    id: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: string;
}

export interface FlippedLesson {
    id: string;
    teacherId: string;
    title: string;
    subject: string;
    className: string;
    contentUrl?: string;
    contentBody: string;
    aiSummary?: string;
    questions?: Question[];
    preparedStudentIds: string[];
    comments?: FlippedComment[];
    quizResults?: Record<string, { score: number, wrongQuestionIds: string[] }>;
    createdAt: string;
    deadline?: string;
    xpReward: number;
}

export interface AppNotification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'SUCCESS' | 'WARNING' | 'INFO' | 'BADGE' | 'TASK';
    isRead: boolean;
    createdAt: string;
    link?: string;
}

export interface TaskSubmission {
    id: string;
    taskId: string;
    studentId: string;
    studentName: string;
    fileUrl: string;
    submittedAt: string;
    grade?: number;
    feedback?: string;
    status: 'PENDING' | 'GRADED';
}

export type LearningStyle = 'VISUAL' | 'AUDITORY' | 'READ_WRITE' | 'KINESTHETIC' | 'UNKNOWN';

export interface SystemUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    nationalId?: string;
    password?: string;
    schoolId?: string;
    status: 'ACTIVE' | 'INACTIVE';
    phone?: string;
}

export interface Teacher extends SystemUser {
    subjectSpecialty?: string;
    subscriptionStatus?: 'FREE' | 'PRO' | 'ENTERPRISE';
    subscriptionEndDate?: string;
    managerId?: string;
}

export interface Student {
    id: string;
    name: string;
    role: 'STUDENT';
    nationalId: string;
    classId?: string;
    className?: string;
    gradeLevel?: string;
    xp?: number;
    level?: number;
    createdById?: string;
    parentPhone?: string;
    badges?: Badge[];
    purchasedRewards?: string[];
    auraColor?: string;
    streak?: number;
    avatarUrl?: string;
    learningStyle?: LearningStyle;
    seatIndex?: number;
    behaviorPoints?: number;
}

export interface Badge {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    unlockedAt: string;
}

export interface PerformanceRecord {
    id: string;
    studentId: string;
    subject: string;
    title: string;
    score: number;
    maxScore: number;
    date: string;
    category?: PerformanceCategory;
    notes?: string;
    createdById?: string;
}

export type PerformanceCategory = 'ACTIVITY' | 'HOMEWORK' | 'PLATFORM_EXAM' | 'YEAR_WORK' | 'ALL' | 'OTHER';

export interface AttendanceRecord {
    id: string;
    studentId: string;
    date: string;
    status: AttendanceStatus;
    period?: number;
    subject?: string;
    createdById?: string;
    behaviorStatus?: BehaviorStatus;
    behaviorNote?: string;
    excuseNote?: string;
}

export interface Question {
    id: string;
    text: string;
    type: 'MCQ' | 'TRUE_FALSE';
    options: string[];
    correctAnswer: string;
    points: number;
    teacherId?: string;
    gradeLevel?: string;
    subject?: string;
}

// Added missing ExamType enum
export enum ExamType {
    DIAGNOSTIC = 'DIAGNOSTIC',
    PRE_TEST = 'PRE_TEST',
    POST_TEST = 'POST_TEST',
    QUIZ = 'QUIZ',
    PERIODIC = 'PERIODIC'
}

// Added missing AchievementMethod enum
export enum AchievementMethod {
    COMPLETION = 'COMPLETION',
    SCORE_THRESHOLD = 'SCORE_THRESHOLD'
}

export interface Exam {
    id: string;
    title: string;
    subject: string;
    questions: Question[];
    isActive: boolean;
    teacherId: string;
    createdAt: string;
    type: ExamType;
    gradeLevel?: string;
    durationMinutes: number;
    achievementMethod: AchievementMethod;
    passingScore?: number;
    startDate?: string;
    endDate?: string;
}

export interface ExamResult {
    id: string;
    examId: string;
    studentId: string;
    score: number;
    totalScore: number;
    date: string;
    isAchieved?: boolean;
    answers: { questionId: string; studentAnswer: string; isCorrect: boolean }[];
}

export interface Subject {
    id: string;
    name: string;
    teacherId: string;
}

export interface AcademicTerm {
    id: string;
    name: string;
    isCurrent: boolean;
    teacherId: string;
    startDate: string;
    endDate: string;
}

export interface Assignment {
    id: string;
    teacherId: string;
    title: string;
    category: PerformanceCategory;
    maxScore: number;
    isVisible: boolean;
    sortOrder: number;
    subject?: string;
}

export interface MessageLog {
    id: string;
    studentId: string;
    studentName: string;
    type: 'WHATSAPP' | 'EMAIL' | 'ANNOUNCEMENT';
    content: string;
    status: 'SENT' | 'FAILED';
    date: string;
    sentBy: string;
    teacherId?: string;
    parentPhone?: string;
}

export interface CustomTable {
    id: string;
    name: string;
    createdAt: string;
    columns: string[];
    rows: any[];
    teacherId?: string;
    sourceUrl?: string;
    lastUpdated?: string;
}

export interface FormsDetailedResult {
    id: string;
    examTitle: string;
    teacherId: string;
    date: string;
    className?: string;
    questions: { id: string; text: string; learningOutcome: string; successRate: number; difficulty: string; commonErrors: string[] }[];
    studentResponses: Record<string, { score: number, total: number, answers: Record<string, string> }>;
}

// Added missing GameType type
export type GameType = 'MATCHING' | 'SORTING';

export interface InteractiveGame {
    id: string;
    teacherId: string;
    title: string;
    subject: string;
    type: GameType;
    content: any;
    xpReward: number;
    targetClass: string;
    createdAt?: string;
}

export interface StoredLessonPlan {
    id: string;
    teacherId: string;
    subject: string;
    topic: string;
    contentJson: string;
    createdAt: string;
    isShared?: boolean;
    resources?: string[];
}

export interface ScheduleItem {
    id: string;
    teacherId: string;
    classId: string;
    subjectName: string;
    day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';
    period: number;
}

export interface Task {
    id: string;
    teacherId: string;
    classId: string;
    title: string;
    description: string;
    dueDate: string;
    type: 'HOMEWORK' | 'PROJECT' | 'RESEARCH';
    maxScore: number;
    submissions: string[];
    subject?: string;
}

export interface ReportHeaderConfig {
    teacherId?: string;
    schoolName: string;
    educationAdmin: string;
    teacherName: string;
    schoolManager: string;
    academicYear: string;
    term: string;
    signatureBase64: string;
}

export interface StudentGoal {
    id: string;
    studentId: string;
    title: string;
    targetValue: number;
    category: 'GRADE' | 'ATTENDANCE' | 'XP';
    status: 'ACTIVE' | 'ACHIEVED';
    createdAt: string;
    deadline?: string;
}

// Added missing School interface
export interface School {
    id: string;
    name: string;
    ministryCode: string;
    managerName?: string;
    managerNationalId?: string;
    educationAdministration?: string;
    type?: 'PUBLIC' | 'PRIVATE';
    phone?: string;
    studentCount?: number;
}

// Added missing PurchaseRequest interface
export interface PurchaseRequest {
    id: string;
    studentId: string;
    studentName: string;
    rewardId: string;
    rewardTitle: string;
    cost: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    date: string;
    teacherId: string;
}

// Added missing Reward interface
export interface Reward {
    id: string;
    title: string;
    cost: number;
    icon: string;
    description: string;
    category: 'PRIVILEGE' | 'TITLE' | 'ITEM';
}

// Added missing WeeklyChallenge interface
export interface WeeklyChallenge {
    id: string;
    title: string;
    description: string;
    rewardXp: number;
    startDate: string;
    endDate: string;
    targetClass: string;
    isActive: boolean;
    type: 'ATTENDANCE' | 'PERFORMANCE' | 'ACTIVITY';
}

// Added missing ParentRequest interface
export interface ParentRequest {
    id: string;
    parentId: string;
    studentId: string;
    teacherId: string;
    type: 'MEETING' | 'QUERY';
    content: string;
    status: 'PENDING' | 'ACCEPTED' | 'COMPLETED';
    date: string;
}

// Added missing BehaviorIncident interface
export interface BehaviorIncident {
    id: string;
    studentId: string;
    teacherId: string;
    type: 'POSITIVE' | 'NEGATIVE';
    category: string;
    points: number;
    date: string;
    note: string;
    actionTaken?: string;
}

// Added missing Curriculum types
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
    unitId: string;
    title: string;
    orderIndex: number;
    isCompleted?: boolean;
}

// Added missing LessonLink interface
export interface LessonLink {
    id: string;
    title: string;
    url: string;
    teacherId: string;
    gradeLevel?: string;
    className?: string;
    createdAt: string;
}

// Added missing Tracking types
export interface TrackingSheet {
    id: string;
    title: string;
    subject: string;
    className: string;
    teacherId: string;
    createdAt: string;
    columns: TrackingColumn[];
    scores: Record<string, Record<string, any>>;
}

export interface TrackingColumn {
    id: string;
    title: string;
    type: 'TEXT' | 'RATING' | 'CHECKBOX';
}

// Added missing WeeklyPlanItem interface
export interface WeeklyPlanItem {
    id: string;
    teacherId: string;
    classId: string;
    subjectName: string;
    day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';
    period: number;
    weekStartDate: string;
    lessonTopic: string;
    homework: string;
    gradeLevel?: string;
}

// Added missing EnvironmentRecord interface
export interface EnvironmentRecord {
    id: string;
    date: string;
    temp?: number;
    noise?: number;
    light?: number;
    mood?: string;
}

// Added missing LessonBlock interface
export interface LessonBlock {
    id: string;
    type: 'CONTENT' | 'ACTIVITY' | 'MEDIA';
    title: string;
    content: string;
}

// Added missing TeacherAssignment interface
export interface TeacherAssignment {
    id: string;
    classId: string;
    subjectName: string;
    teacherId: string;
}
