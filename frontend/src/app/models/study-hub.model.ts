export interface StudyPack {
  id: string;
  title: string;
  subject: string;
  description: string;
  notes: Note[];
  flashcards: Flashcard[];
  qcm: QCM[];
  cheatsheets?: CheatSheet[];
  exercises?: CodingExercise[];
  progress?: number;
  streak?: number;
  isPublic?: boolean;
  lastStudied?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string; // HTML or Markdown content
  tags: string[];
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  code?: string; // Optional code block for the back of the card!
  difficulty?: 'easy' | 'medium' | 'hard';
  nextReviewDate?: Date; // For spaced repetition
  lastReviewed?: Date;
  createdAt: Date;
}

export interface QCM {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blanks';
  options?: string[]; // Used for multiple-choice
  correctAnswer: string | number;
  explanation?: string;
  trapNote?: string; // Highlighting typical traps/mistakes for exams!
  topic?: string; // Grouping category (e.g. 'Index', 'Vues')
  createdAt: Date;
}

export interface CheatSheet {
  id: string;
  title: string;
  category: string;
  items: { key: string; value: string }[];
  codeSample?: string;
  createdAt: Date;
}

export interface CodingExercise {
  id: string;
  title: string;
  description: string;
  schemaContext?: string;
  task: string;
  correctSolution: string;
  solutionNote?: string;
  createdAt: Date;
}

export interface QuizAttempt {
  id?: string;
  pack: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: {
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    topic?: string;
  }[];
  completedAt?: Date;
}

