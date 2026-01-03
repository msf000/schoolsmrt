
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

export type LearningStyle = 'VISUAL' | 'AUDITORY' | 'READ_WRITE' | 'KINESTHETIC' | 'UNKNOWN';

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
    managerId?: string;
    subscriptionStatus?: 'FREE' | 'PRO' | 'ENTERPRISE';
    subscriptionEndDate?: string;
}

export interface Student {
    id: string;
    name: string;
    role: 'STUDENT';
    nationalId: string;
    classId?: string;
    gradeLevel?: string;
    className?: string;
    email?: string;
    phone?: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    password?: string;
    schoolId?: string;
    createdById?: string;
    behaviorPoints?: number;
    xp?: number;
    level?: number;
    streak?: number;
    purchasedRewards?: string[];
    auraColor?: string;
    activeTitle?: string;
    seatIndex?: number;
    learningStyle?: LearningStyle;
    badges?: Badge[];
}

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

export interface PerformanceRecord {
    id: string;
    studentId: string;
    subject: string;
    title: string;
    score: number;
    maxScore: number;
    date: string;
    category?: string;
    notes?: string;
    createdById?: string;
}

export interface ScheduleItem {
    id: string;
    classId: string;
    subjectName: string;
    day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    period: number;
    teacherId: string;
}

export interface Subject {
    id: string;
    name: string;
    teacherId: string;
}

export interface Badge {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    unlockedAt: string;
}

export interface CustomTable {
    id: string;
    name: string;
    createdAt: string;
    columns: string[];
    rows: any[];
    sourceUrl?: string;
    lastUpdated?: string;
    teacherId?: string;
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

export interface Exam {
    id: string;
    title: string;
    subject: string;
    gradeLevel: string;
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

export interface Assignment {
    id: string;
    title: string;
    category: PerformanceCategory;
    maxScore: number;
    isVisible: boolean;
    teacherId: string;
    sortOrder?: number;
    classId?: string;
    subject?: string;
    periodTag?: 'P1' | 'P2' | 'ALL';
    link?: string;
}

export type PerformanceCategory = 'ACTIVITY' | 'HOMEWORK' | 'PLATFORM_EXAM' | 'YEAR_WORK' | 'OTHER' | 'ALL';

export interface AcademicTerm {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    teacherId: string;
    periods?: TermPeriod[];
}

export interface TermPeriod {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
}

export interface TeacherAssignment {
    id: string;
    classId: string;
    subjectName: string;
    teacherId: string;
}

export interface School {
    id: string;
    name: string;
    ministryCode: string;
    managerName: string;
    managerNationalId: string;
    educationAdministration?: string;
    type: 'PUBLIC' | 'PRIVATE';
    phone?: string;
    studentCount?: number;
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
    logoBase64?: string;
}

export interface UserTheme {
    mode: 'LIGHT' | 'DARK';
    backgroundStyle: 'FLAT' | 'GRADIENT';
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
        difficulty: string;
        commonErrors: string[];
    }[];
    studentResponses: Record<string, {
        score: number;
        total: number;
        answers: Record<string, string>;
    }>;
}

export interface MessageLog {
    id: string;
    studentId: string;
    studentName: string;
    parentPhone?: string;
    type: 'WHATSAPP' | 'EMAIL' | 'SMS' | 'PORTAL' | 'ANNOUNCEMENT';
    content: string;
    status: 'SENT' | 'FAILED';
    date: string;
    sentBy: string;
    teacherId?: string;
}

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

export type GameType = 'MATCHING' | 'SORTING';

export interface EnvironmentRecord {
    id: string;
    teacherId: string;
    classId: string;
    date: string;
    lighting: number;
    noiseLevel: number;
    mood: 'HAPPY' | 'TIRED' | 'FOCUSED' | 'BORED';
}

export interface LessonBlock {
    id: string;
    type: 'CONTENT' | 'MEDIA' | 'ACTIVITY';
    title: string;
    content: string;
}

export interface StoredLessonPlan {
    id: string;
    teacherId: string;
    subject: string;
    topic: string;
    contentJson: string;
    resources: any[];
    createdAt: string;
    isShared?: boolean;
    schoolId?: string;
}

export interface ExamResult {
    id: string;
    examId: string;
    studentId: string;
    score: number;
    totalScore: number;
    answers: {
        questionId: string;
        studentAnswer: string;
        isCorrect: boolean;
    }[];
    date: string;
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
    day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    period: number;
    weekStartDate: string;
    lessonTopic: string;
    homework: string;
    gradeLevel?: string;
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

export interface TrackingColumn {
    id: string;
    title: string;
    type: 'TEXT' | 'RATING' | 'CHECKBOX';
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

export interface RemedialPlan {
    id: string;
    studentId: string;
    teacherId: string;
    subject: string;
    topic: string;
    content: string;
    date: string;
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

export interface Reward {
    id: string;
    title: string;
    cost: number;
    icon: string;
    description: string;
    category: 'PRIVILEGE' | 'TITLE' | 'ITEM';
}

export interface WallPost {
    id: string;
    userId: string;
    userName: string;
    content: string;
    type: 'NEWS' | 'ACHIEVEMENTS';
    imageUrl?: string;
    likes: number;
    schoolId: string;
    createdAt: string;
}

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

export interface WeeklyChallenge {
    id: string;
    title: string;
    description: string;
    rewardXp: number;
    startDate: string;
    endDate: string;
    targetClass: string;
    isActive: boolean;
    type: 'ATTENDANCE' | 'PERFORMANCE' | 'BEHAVIOR';
}
