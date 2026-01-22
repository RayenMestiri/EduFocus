// User Models
export interface UserPreferences {
  theme: 'dark' | 'light' | 'auto';
  language: 'en' | 'fr' | 'es' | 'ar';
  notifications: {
    email: boolean;
    push: boolean;
    studyReminders: boolean;
  };
  studySettings: {
    pomodoroLength: number;
    shortBreak: number;
    longBreak: number;
    dailyGoal: number;
  };
}

export interface UserStats {
  totalStudyMinutes: number;
  totalSessions: number;
  totalTasks: number;
  completedTasks: number;
  streak: number;
  longestStreak: number;
  lastStudyDate?: Date;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'premium' | 'admin';
  preferences: UserPreferences;
  stats: UserStats;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Subject Models
export interface SubjectGoals {
  weeklyMinutes: number;
  dailyMinutes: number;
}

export interface SubjectStats {
  totalStudyMinutes: number;
  totalSessions: number;
  lastStudied?: Date;
  averageSessionLength: number;
}

export interface SubjectResource {
  title: string;
  url?: string;
  type: 'video' | 'article' | 'book' | 'course' | 'other';
}

export interface Subject {
  _id?: string;
  user?: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  category: 'science' | 'math' | 'language' | 'art' | 'technology' | 'social' | 'other';
  difficulty: 'easy' | 'medium' | 'hard';
  goals: SubjectGoals;
  stats: SubjectStats;
  resources: SubjectResource[];
  isArchived: boolean;
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Todo Models
export interface Subtask {
  _id?: string;
  title: string;
  done: boolean;
  order: number;
}

export interface TodoReminder {
  enabled: boolean;
  time?: Date;
  sent: boolean;
}

export interface Todo {
  _id?: string;
  user?: string;
  title: string;
  description?: string;
  done: boolean;
  date: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subjectId?: string;
  category: 'homework' | 'exam' | 'project' | 'reading' | 'practice' | 'review' | 'other';
  tags: string[];
  estimatedMinutes: number;
  actualMinutes: number;
  subtasks: Subtask[];
  reminder: TodoReminder;
  notes?: string;
  completedAt?: Date;
  isRecurring: boolean;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  order: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Day Plan Models
export interface DayPlanSession {
  _id?: string;
  startTime: string;
  endTime: string;
  duration: number;
  completed: boolean;
  note?: string;
  completedAt?: Date;
}

export interface DayPlanSubject {
  subjectId: string | Subject;
  goalMinutes: number;
  studiedMinutes: number;
  sessions: DayPlanSession[];
  priority: 'low' | 'medium' | 'high';
}

export interface DayPlan {
  _id?: string;
  user?: string;
  date: string;
  subjects: DayPlanSubject[];
  totalGoalMinutes: number;
  totalStudiedMinutes: number;
  notes?: string;
  mood?: 'excellent' | 'good' | 'neutral' | 'bad' | 'terrible';
  productivity?: number;
  achievements: string[];
  isCompleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Study Session Models
export interface SessionAchievement {
  type: 'focus_master' | 'speed_learner' | 'consistency_king' | 'marathon_runner';
  earnedAt: Date;
}

export interface StudySession {
  _id?: string;
  user?: string;
  subjectId: string | Subject;
  date: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  type: 'pomodoro' | 'regular' | 'break' | 'review';
  focusLevel?: number;
  completed: boolean;
  notes?: string;
  tags: string[];
  todoRefs: string[];
  interruptions: number;
  achievements: SessionAchievement[];
  createdAt?: Date;
}

// Stats Models
export interface DashboardStats {
  user: {
    stats: UserStats;
    streak: number;
    longestStreak: number;
    dailyGoal: number;
  };
  today: {
    date: string;
    plannedMinutes: number;
    studiedMinutes: number;
    totalTasks: number;
    completedTasks: number;
    sessions: number;
    mood?: string;
    productivity?: number;
  };
  week: {
    totalMinutes: number;
    totalSessions: number;
    averagePerDay: number;
    mostStudiedDay: {
      date: string;
      minutes: number;
    };
  };
  subjects: Array<{
    id: string;
    name: string;
    color: string;
    icon: string;
    totalMinutes: number;
    totalSessions: number;
    lastStudied?: Date;
  }>;
}

export interface WeeklyStats {
  [date: string]: {
    date: string;
    dayName: string;
    studiedMinutes: number;
    sessions: number;
    goalMinutes: number;
    mood?: string;
    productivity?: number;
  };
}

export interface MonthlyStats {
  period: string;
  totalMinutes: number;
  totalGoalMinutes: number;
  totalSessions: number;
  studyDays: number;
  averagePerDay: number;
  subjects: Array<{
    subject: Subject;
    minutes: number;
    sessions: number;
  }>;
  dailyData: any;
}

export interface SubjectAnalytics {
  subject: {
    id: string;
    name: string;
    color: string;
    icon: string;
    category: string;
    difficulty: string;
  };
  stats: SubjectStats;
  analytics: {
    totalMinutes: number;
    totalSessions: number;
    averageFocusLevel: number;
    averageSessionLength: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
  recentSessions: StudySession[];
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
