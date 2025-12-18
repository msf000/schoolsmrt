
export type LearningStyle = 'VISUAL' | 'AUDITORY' | 'READ_WRITE' | 'KINESTHETIC' | 'UNKNOWN';

export interface Student {
  id: string;
  name: string;
  nationalId?: string;
  classId?: string;
  schoolId?: string;
  createdById?: string;
  gradeLevel?: string; 
  className?: string;
  email?: string;
  phone?: string;
  parentId?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  password?: string;
  seatIndex?: number;
  learningStyle?: LearningStyle;
}

// واجهة تحليل اختبار Forms التفصيلي
export interface FormsQuestionAnalysis {
    id: string;
    text: string;
    learningOutcome: string; // ناتج التعلم المرتبط بالسؤال
    successRate: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface FormsDetailedResult {
    id: string;
    examTitle: string;
    className: string;
    date: string;
    teacherId: string;
    questions: FormsQuestionAnalysis[];
    studentResponses: Record<string, { // studentId
        score: number;
        total: number;
        answers: Record<string, string>; // questionText -> answer
    }>;
}

export interface EnvironmentRecord {
    id: string;
    teacherId: string;
    classId: string;
    date: string;
    lighting: number; 
    noiseLevel: number; 
    mood: 'HAPPY' | 'TIRED' | 'FOCUSED' | 'BORED';
    notes?: string;
}

export interface School {
  id: string;
  name: string;
  ministryCode: string;
  managerName: string;
  managerNationalId: string;
  type: 'PUBLIC' | 'PRIVATE' | 'INTERNATIONAL';
  phone: string;
  studentCount: number;
  educationAdministration: string;
}

export interface EducationalStage { id: string; name: string; }
export interface GradeLevel { id: string; stageId: string; name: string; }
export interface ClassRoom { id: string; gradeLevelId: string; name: string; }
export interface Teacher { id: string; name: string; nationalId?: string; email?: string; phone?: string; password?: string; subjectSpecialty?: string; schoolId?: string; managerId?: string; subscriptionStatus?: 'FREE' | 'PRO' | 'ENTERPRISE'; subscriptionEndDate?: string; }
export interface TeacherAssignment { id: string; classId: string; subjectName: string; teacherId: string; }
export interface Subject { id: string; name: string; teacherId?: string; }
export interface ScheduleItem { id: string; classId: string; day: string; period: number; subjectName: string; teacherId?: string; }
export interface WeeklyPlanItem { id: string; teacherId: string; classId: string; subjectName: string; day: string; period: number; weekStartDate: string; lessonTopic: string; homework: string; }
export enum AttendanceStatus { PRESENT = 'PRESENT', ABSENT = 'ABSENT', LATE = 'LATE', EXCUSED = 'EXCUSED' }
export enum BehaviorStatus { POSITIVE = 'POSITIVE', NEGATIVE = 'NEGATIVE', NEUTRAL = 'NEUTRAL' }
export interface AttendanceRecord { id: string; studentId: string; date: string; status: AttendanceStatus; subject?: string; period?: number; behaviorStatus?: BehaviorStatus; behaviorNote?: string; excuseNote?: string; excuseFile?: string; createdById?: string; }

// Fix: Added TermPeriod interface which was missing and causing compilation errors in SchoolManagement.tsx
export interface TermPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

// Fix: Updated AcademicTerm to use TermPeriod[] instead of any[] for better type safety
export interface AcademicTerm { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean; teacherId?: string; periods?: TermPeriod[]; }
export type PerformanceCategory = 'HOMEWORK' | 'ACTIVITY' | 'PLATFORM_EXAM' | 'YEAR_WORK' | 'OTHER';
export interface Assignment { id: string; title: string; category: PerformanceCategory; maxScore: number; url?: string; isVisible: boolean; orderIndex?: number; sourceMetadata?: string; teacherId?: string; termId?: string; periodId?: string; classId?: string; }
export interface PerformanceRecord { id: string; studentId: string; subject: string; title: string; category?: string; score: number; maxScore: number; date: string; notes?: string; url?: string; createdById?: string; }
export interface SystemUser { id: string; name: string; email: string; nationalId?: string; password?: string; role: 'SUPER_ADMIN' | 'SCHOOL_MANAGER' | 'TEACHER' | 'STUDENT' | 'PARENT'; schoolId?: string; status: 'ACTIVE' | 'INACTIVE'; isDemo?: boolean; phone?: string; }
export interface CustomTable { id: string; name: string; createdAt: string; columns: string[]; rows: any[]; sourceUrl?: string; lastUpdated?: string; teacherId?: string; }
export interface ReportHeaderConfig { schoolName: string; educationAdmin: string; teacherName: string; schoolManager: string; academicYear: string; term: string; logoBase64?: string; signatureBase64?: string; teacherId?: string; }
export interface MessageLog { id: string; studentId: string; studentName: string; parentPhone?: string; type: 'WHATSAPP' | 'SMS' | 'EMAIL'; content: string; status: 'SENT' | 'FAILED'; date: string; sentBy: string; teacherId?: string; }
export interface LessonLink { id: string; title: string; url: string; teacherId?: string; createdAt: string; gradeLevel?: string; className?: string; }
export interface LessonBlock { id: string; type: 'OBJECTIVES' | 'INTRO' | 'STRATEGIES' | 'CONTENT' | 'ACTIVITY' | 'MEDIA' | 'ASSESSMENT' | 'HOMEWORK'; title: string; content: string; mediaUrl?: string; }
export interface StoredLessonPlan { id: string; teacherId: string; lessonId?: string; subject: string; topic: string; contentJson: string; resources: string[]; createdAt: string; }
export interface CurriculumUnit { id: string; teacherId?: string; subject: string; gradeLevel: string; title: string; orderIndex: number; }
export interface CurriculumLesson { id: string; unitId: string; title: string; orderIndex: number; learningStandards: string[]; microConceptIds: string[]; isCompleted?: boolean; completedAt?: string; }

export interface Question { id: string; text: string; type: 'MCQ' | 'TF'; options: string[]; correctAnswer: string; points: number; teacherId?: string; subject?: string; gradeLevel?: string; }
export interface Exam { id: string; title: string; subject: string; gradeLevel: string; durationMinutes: number; questions: Question[]; isActive: boolean; createdAt: string; teacherId?: string; date?: string; }
export interface ExamResult { id: string; examId: string; studentId: string; score: number; totalScore: number; answers: any[]; date: string; }
export interface TrackingColumn { id: string; title: string; type: 'RATING' | 'TEXT' | 'CHECKBOX'; }
export interface TrackingSheet { id: string; title: string; subject: string; className: string; teacherId: string; createdAt: string; columns: TrackingColumn[]; scores: Record<string, Record<string, any>>; }
export interface RemedialPlan { id: string; studentId: string; teacherId: string; subject: string; topic: string; content: string; date: string; }
export interface AISettings { modelId: string; temperature: number; enableReports: boolean; enableQuiz: boolean; enablePlanning: boolean; systemInstruction: string; }
export interface UserTheme { mode: 'LIGHT' | 'DARK'; backgroundStyle: 'FLAT' | 'GRADIENT'; }
