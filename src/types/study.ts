export type Grade =
  | 'Lớp 6'
  | 'Lớp 7'
  | 'Lớp 8'
  | 'Lớp 9'
  | 'Lớp 10'
  | 'Lớp 11'
  | 'Lớp 12';

export type Subject =
  | 'Toán'
  | 'Ngữ văn'
  | 'Tiếng Anh'
  | 'Vật lý'
  | 'Hóa học'
  | 'Sinh học'
  | 'Lịch sử'
  | 'Địa lý'
  | 'Tin học';

export type UserRole = 'student' | 'teacher' | 'admin';

export interface AppUser {
  id: string;
  username: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  grade: Grade;
  subject?: Subject;
  school?: string;
  createdAt: number;
}

export interface SubjectInfo {
  id: Subject;
  name: string;
  icon: string;
  color: string;
  bgLight: string;
  badgeColor: string;
  description: string;
}

export interface UploadedFileItem {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64 without prefix or raw data
  previewUrl?: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  subject?: Subject;
  grade?: Grade;
  files?: Array<{ name: string; mimeType: string }>;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string; // 'A', 'B', 'C', 'D'
  explanation: string;
  subtopic: string;
}

export interface QuizData {
  title: string;
  topic: string;
  grade?: Grade;
  subject?: Subject;
  questions: QuizQuestion[];
}

export interface QuizSubmissionResult {
  id: string;
  timestamp: number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: UserRole;
  subject: Subject;
  grade: Grade;
  topic: string;
  score: number; // e.g. 8.0/10
  correctCount: number;
  totalQuestions: number;
  userAnswers: Record<number, string>; // question id -> selected option letter
  weakSubtopics: string[];
  questions: QuizQuestion[];
  syncedToSheets?: boolean;
  syncedToFirestore?: boolean;
}

export interface WeakTopicItem {
  id: string;
  subject: Subject;
  topicName: string;
  wrongCount: number;
  totalTested: number;
  lastMissedDate: number;
  status: 'needs_practice' | 'reviewing' | 'mastered';
}

export interface UserProfile {
  id: string;
  username?: string;
  isGuest?: boolean;
  name: string;
  email: string;
  role: UserRole;
  avatarSeed: string;
  grade: Grade;
  favoriteSubject: Subject;
  school?: string;
  xp: number;
  streakDays: number;
  lastActiveDate: string; // YYYY-MM-DD
  stats: {
    questionsAsked: number;
    problemsSolved: number;
    reviewsCreated: number;
    quizzesCompleted: number;
    totalQuizScoreSum: number;
  };
}

export interface SavedBankQuiz {
  id: string;
  title: string;
  topic: string;
  grade: Grade;
  subject: Subject;
  creatorName: string;
  creatorRole: UserRole;
  createdAt: number;
  data: QuizData;
}

export type ActiveTab = 'chat' | 'solver' | 'review' | 'quiz' | 'progress' | 'admin';
