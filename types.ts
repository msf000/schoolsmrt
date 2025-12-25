
export type LearningStyle = 'VISUAL' | 'AUDITORY' | 'READ_WRITE' | 'KINESTHETIC' | 'UNKNOWN';

export type PerformanceCategory = 'HOMEWORK' | 'ACTIVITY' | 'PLATFORM_EXAM' | 'YEAR_WORK' | 'OTHER';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  unlockedAt: string;
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
}

export interface Student {
  id: string;
  name: string;
  role: 'STUDENT';
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
  behaviorPoints?: number;
  level?: number;
  xp?: number;
  badges?: Badge[];
  purchasedRewards?: string[];
  streak?: number;
}

export interface Teacher {
  id: string;
  name: string;
  nationalId: string;
  email?: string;
  phone?: string;
  subjectSpecialty?: string;
  password?: string;
  schoolId?: string;
  managerId?: string;
  subscriptionStatus?: 'FREE' | 'PRO' | 'ENTERPRISE';
  subscriptionEndDate?: string;
}

export interface Subject {
  id: string;
  name: string;
  teacherId?: string;
}

export interface ScheduleItem {
  id: string;
  classId: string;
  subjectName: string;
  day: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  period: number;
  teacherId?: string;
}

export interface TeacherAssignment {
  id: string;
  classId: string;
  subjectName: string;
  teacherId: string;
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
}

export interface LessonBlock {
  id: string;
  type: 'CONTENT' | 'ACTIVITY' | 'ASSESSMENT' | 'MEDIA';
  title: string;
  content: string;
}

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

export enum AttendanceStatus { PRESENT = 'PRESENT', ABSENT = 'ABSENT', LATE = 'LATE', EXCUSED = 'EXCUSED' }
export enum BehaviorStatus { POSITIVE = 'POSITIVE', NEGATIVE = 'NEGATIVE', NEUTRAL = 'NEUTRAL' }

export interface AttendanceRecord { 
  id: string; 
  studentId: string; 
  date: string; 
  status: AttendanceStatus; 
  subject?: string; 
  period?: number; 
  behaviorStatus?: BehaviorStatus; 
  behaviorNote?: string; 
  participationScore?: number; 
  excuseNote?: string; 
  excuseFile?: string; 
  createdById?: string; 
  termId?: string; 
}

export interface AcademicTerm { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean; teacherId?: string; periods?: TermPeriod[]; }
export interface TermPeriod { id: string; name: string; startDate: string; endDate: string; }

export interface PerformanceRecord { id: string; studentId: string; subject: string; title: string; category?: PerformanceCategory; score: number; maxScore: number; date: string; notes?: string; url?: string; createdById?: string; }

export interface Assignment {
  id: string;
  title: string;
  category: PerformanceCategory;
  maxScore: number;
  isVisible: boolean;
  teacherId?: string;
  termId?: string;
  periodId?: string;
  sourceMetadata?: string;
  sortOrder?: number;
  url?: string;
}

export interface SystemUser { 
  id: string; 
  name: string; 
  email: string; 
  nationalId?: string; 
  password?: string; 
  role: 'SUPER_ADMIN' | 'SCHOOL_MANAGER' | 'TEACHER' | 'STUDENT' | 'PARENT'; 
  schoolId?: string; 
  status: 'ACTIVE' | 'INACTIVE'; 
  isDemo?: boolean; 
  phone?: string; 
}

export interface CustomTable { id: string; name: string; createdAt: string; columns: string[]; rows: any[]; sourceUrl?: string; lastUpdated?: string; teacherId?: string; }
export interface ReportHeaderConfig { schoolName: string; educationAdmin: string; teacherName: string; schoolManager: string; academicYear: string; term: string; logoBase64?: string; signatureBase64?: string; teacherId?: string; }
export interface MessageLog { id: string; studentId: string; studentName: string; parentPhone?: string; type: 'WHATSAPP' | 'SMS' | 'EMAIL' | 'ANNOUNCEMENT'; content: string; status: 'SENT' | 'FAILED'; date: string; sentBy: string; teacherId?: string; targetRole?: string; }
export interface LessonLink { id: string; title: string; url: string; teacherId?: string; createdAt: string; gradeLevel?: string; className?: string; }
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
export interface EnvironmentRecord { id: string; teacherId: string; classId: string; date: string; lighting: number; noiseLevel: number; mood: 'HAPPY' | 'TIRED' | 'FOCUSED' | 'BORED'; notes?: string; }
export interface School { id: string; name: string; ministryCode: string; managerName: string; managerNationalId: string; type: 'PUBLIC' | 'PRIVATE' | 'INTERNATIONAL'; phone: string; studentCount: number; educationAdministration: string; }

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
