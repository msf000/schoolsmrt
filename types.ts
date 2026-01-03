
export type Role = 'SUPER_ADMIN' | 'SCHOOL_MANAGER' | 'TEACHER' | 'STUDENT' | 'PARENT';

export enum AttendanceStatus {
    PRESENT = 'PRESENT',
    ABSENT = 'ABSENT',
    LATE = 'LATE',
    EXCUSED = 'EXCUSED'
}

export enum BehaviorStatus {
    POSITIVE = 'POSITIVE',
    NEGATIVE = 'NEGATIVE',
    NEUTRAL = 'NEUTRAL'
}

export enum ExamType {
    DIAGNOSTIC = 'DIAGNOSTIC',
    PRE_TEST = 'PRE_TEST',
    POST_TEST = 'POST_TEST',
    QUIZ = 'QUIZ',
    PERIODIC = 'PERIODIC'
}

export enum AchievementMethod {
    COMPLETION = 'COMPLETION',
    SCORE_THRESHOLD = 'SCORE_THRESHOLD'
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
    seatIndex?: number;
    learningStyle?: LearningStyle;
    behaviorPoints?: number;
    activeTitle?: string;
    schoolId?: string;
    streak?: number;
    avatarUrl?: string;
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
    behaviorStatus?: BehaviorStatus;
    behaviorNote?: string;
    excuseNote?: string;
    createdById?: string;
}

export interface BehaviorIncident {
    id: string;
    studentId: string;
    teacherId: string;
    type: 'POSITIVE' | 'NEGATIVE';
    category: string;
    points: number;
    date: string;
    note?: string;
    actionTaken?: string;
}

export interface Question {
    id: string;
    text: string;
    type: 'MCQ' | 'TRUE_FALSE';
    options: string[];
    correctAnswer: string;
    points: number;
    teacherId?: string;
    subject?: string;
    gradeLevel?: string;
}

export interface Exam {
    id: string;
    title: string;
    subject: string;
    gradeLevel: string;
    type: ExamType;
    achievementMethod: AchievementMethod;
    passingScore?: number;
    durationMinutes: number;
    questions: Question[];
    isActive: boolean;
    createdAt: string;
    teacherId: string;
    startDate?: string;
    endDate?: string;
    isLive?: boolean;
    streamUrl?: string;
}

export interface ExamResult {
    id: string;
    examId: string;
    studentId: string;
    score: number;
    totalScore: number;
    isAchieved: boolean;
    answers: {
        questionId: string;
        studentAnswer: string;
        isCorrect: boolean;
    }[];
    date: string;
}

export interface Subject {
    id: string;
    name: string;
    teacherId: string;
}

export interface AcademicTerm {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    teacherId: string;
}

export interface Assignment {
    id: string;
    teacherId: string;
    title: string;
    category: PerformanceCategory;
    maxScore: number;
    isVisible: boolean;
    sortOrder: number;
    classId?: string;
    subject?: string;
    periodTag?: 'P1' | 'P2' | 'ALL';
    link?: string;
}

export interface WallPost {
    id: string;
    userId: string;
    userName: string;
    content: string;
    type: 'ACHIEVEMENTS' | 'NEWS';
    schoolId: string;
    createdAt: string;
    likes: number;
    imageUrl?: string;
}

export interface ParentRequest {
    id: string;
    parentId: string;
    studentId: string;
    teacherId: string;
    type: 'MEETING' | 'QUERY';
    content: string;
    status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED';
    date: string;
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
    className: string;
    date: string;
    teacherId: string;
    questions: {
        id: string;
        text: string;
        learningOutcome: string;
        successRate: number;
        difficulty: 'EASY' | 'MEDIUM' | 'HARD';
        commonErrors: string[];
    }[];
    studentResponses: Record<string, {
        score: number;
        total: number;
        answers: Record<string, string>;
    }>;
}

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
    createdAt: string;
}

export interface RemedialPlan {
    id: string;
    studentId: string;
    teacherId: string;
    subject: string;
    topic: string;
    content: string;
    date: string;
}

export interface LessonBlock {
    id: string;
    type: 'CONTENT' | 'ACTIVITY' | 'MEDIA';
    title: string;
    content: string;
}

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

export interface LessonLink {
    id: string;
    title: string;
    url: string;
    teacherId: string;
    gradeLevel?: string;
    className?: string;
    createdAt: string;
}

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

export interface TrackingColumn {
    id: string;
    title: string;
    type: 'TEXT' | 'RATING' | 'CHECKBOX';
}

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

export interface Reward {
    id: string;
    title: string;
    cost: number;
    icon: string;
    description: string;
    category: 'PRIVILEGE' | 'TITLE' | 'ITEM';
}

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

export interface WeeklyChallenge {
    id: string;
    title: string;
    description: string;
    rewardXp: number;
    startDate: string;
    endDate: string;
    targetClass: string;
    isActive: boolean;
    type: 'ATTENDANCE' | 'ACADEMIC' | 'BEHAVIOR';
    teacherId?: string;
}

export interface MessageLog {
    id: string;
    studentId: string;
    studentName: string;
    parentPhone?: string;
    type: 'WHATSAPP' | 'EMAIL' | 'ANNOUNCEMENT';
    content: string;
    status: 'SENT' | 'FAILED';
    date: string;
    sentBy: string;
    teacherId?: string;
}

export interface UserTheme {
    mode: 'LIGHT' | 'DARK';
    backgroundStyle: 'FLAT' | 'GRADIENT' | 'TEXTURED';
}

export interface TeacherAssignment {
    id: string;
    classId: string;
    subjectName: string;
    teacherId: string;
}

export interface StoredLessonPlan {
    id: string;
    teacherId: string;
    subject: string;
    topic: string;
    contentJson: string;
    resources: string[];
    createdAt: string;
    isShared?: boolean;
    schoolId?: string;
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
    subject: string;
    title: string;
    description: string;
    dueDate: string;
    type: 'HOMEWORK' | 'PROJECT' | 'RESEARCH';
    maxScore: number;
    submissions: string[];
}

export interface EnvironmentRecord {
    id: string;
    classId: string;
    date: string;
    noiseLevel: number;
    mood: string;
    temperature?: number;
    humidity?: number;
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
    deadline: string;
    status: 'ACTIVE' | 'ACHIEVED' | 'FAILED';
    createdAt: string;
}
