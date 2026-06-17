import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OfflineStudyHubService } from '../../../../services/offline/offline-studyhub.service';
import { ThemeService } from '../../../../services/theme.service';
import { StudyPack, QCM } from '../../../../models/study-hub.model';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-qcm-quiz-mode',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './qcm-quiz-mode.component.html',
  styleUrl: './qcm-quiz-mode.component.css'
})
export class QcmQuizModeComponent implements OnInit, OnDestroy {
  studyHubService = inject(OfflineStudyHubService);
  themeService = inject(ThemeService);
  route = inject(ActivatedRoute);
  router = inject(Router);
  pack: StudyPack | undefined;
  currentIndex = signal(0);
  isFinished = signal(false);
  shuffledQcms = signal<QCM[]>([]);

  private showToast(title: string, icon: 'success' | 'info' | 'error' = 'success') {
    const isDark = this.themeService.isDark();
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      background: isDark ? '#111827' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827',
      customClass: {
        popup: 'study-hub-swal-toast font-sans'
      },
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
    Toast.fire({
      icon,
      title
    });
  }

  private showCelebration(title: string, text: string, icon: 'success' | 'warning' | 'info' = 'success') {
    const isDark = this.themeService.isDark();
    Swal.fire({
      title,
      text,
      icon,
      background: isDark ? '#111827' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827',
      confirmButtonText: 'Voir les résultats',
      confirmButtonColor: '#10b981',
      customClass: {
        popup: 'study-hub-swal-modal font-sans'
      }
    });
  }

  // Filtering states
  selectedTopic = signal<string>('all');
  selectedMode = signal<'all' | 'wrong' | 'bookmarks'>('all');
  bookmarkedIds = signal<Set<string>>(new Set());

  // Registry of answered questions: { [qId]: { selected, hasAnswered, isCorrect } }
  userAnswers = signal<Record<string, { selected: string | number; hasAnswered: boolean; isCorrect: boolean } | undefined>>({});

  // Dynamic list of unique topics derived from pack
  topics = computed(() => {
    const list = this.pack?.qcm || [];
    const unique = new Set(list.map(q => q.topic?.trim() || 'General'));
    return Array.from(unique).filter(t => t.length > 0);
  });

  // Dynamic filtered question list based on topic & mode
  filteredQcms = computed(() => {
    let list = [...this.shuffledQcms()];

    // Filter by topic
    if (this.selectedTopic() !== 'all') {
      list = list.filter(q => (q.topic?.trim() || 'General') === this.selectedTopic());
    }

    // Filter by Mode (Toutes, Erreurs, Favoris)
    if (this.selectedMode() === 'wrong') {
      list = list.filter(q => {
        const state = this.userAnswers()[q.id];
        return state?.hasAnswered && !state.isCorrect;
      });
    } else if (this.selectedMode() === 'bookmarks') {
      list = list.filter(q => this.bookmarkedIds().has(q.id));
    }

    return list;
  });

  // Computed QCM points derived from filtered list
  score = computed(() => {
    let correctCount = 0;
    const answeredMap = this.userAnswers();
    this.filteredQcms().forEach(q => {
      if (answeredMap[q.id]?.isCorrect) {
        correctCount++;
      }
    });
    return correctCount;
  });

  wrongCount = computed(() => {
    let wrong = 0;
    const answeredMap = this.userAnswers();
    this.filteredQcms().forEach(q => {
      const state = answeredMap[q.id];
      if (state?.hasAnswered && !state.isCorrect) {
        wrong++;
      }
    });
    return wrong;
  });

  answeredCount = computed(() => {
    let count = 0;
    const answeredMap = this.userAnswers();
    this.filteredQcms().forEach(q => {
      if (answeredMap[q.id]?.hasAnswered) {
        count++;
      }
    });
    return count;
  });

  remainingCount = computed(() => {
    return this.filteredQcms().length - this.answeredCount();
  });

  successPercentage = computed(() => {
    const answered = this.answeredCount();
    if (answered === 0) return 0;
    return Math.round((this.score() / answered) * 100);
  });

  get currentQuestion(): QCM | undefined {
    return this.filteredQcms()[this.currentIndex()];
  }

  currentQuestionAnswerState = computed(() => {
    const qId = this.currentQuestion?.id;
    return qId ? this.userAnswers()[qId] : undefined;
  });

  hasAnswered = computed(() => {
    return !!this.currentQuestionAnswerState()?.hasAnswered;
  });
  
  selectedAnswer = signal<string | number | null>(null);
  typedAnswer = signal<string>(''); // For fill-in-blanks
  
  timerInterval: any;
  timeLeft = signal(0);
  Math = Math;
  String = String;

  ngOnInit() {
    const packId = this.route.snapshot.paramMap.get('packId');
    if (packId) {
      this.pack = this.studyHubService.getPackById(packId);
      if (!this.pack || !this.pack.qcm || this.pack.qcm.length === 0) {
        this.router.navigate(['/study-hub', packId]);
      } else {
        this.shuffledQcms.set([...this.pack.qcm]);
        this.startTimer();
      }
    }
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (this.isFinished()) {
      if (event.key === 'r' || event.key === 'R') {
        this.resetQCM();
      }
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextQuestion();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prevQuestion();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.hasAnswered()) {
        this.nextQuestion();
      } else {
        this.submitAnswer();
      }
    } else if (event.key === 'b' || event.key === 'B') {
      event.preventDefault();
      if (this.currentQuestion) {
        this.toggleBookmark(this.currentQuestion.id);
      }
    } else if (!this.hasAnswered() && this.currentQuestion) {
      if (this.currentQuestion.type === 'multiple-choice') {
        if (['1', '2', '3', '4'].includes(event.key)) {
          const idx = parseInt(event.key) - 1;
          if (this.currentQuestion.options && idx < this.currentQuestion.options.length) {
            this.selectAnswer(idx);
          }
        }
      } else if (this.currentQuestion.type === 'true-false') {
        if (event.key === '1') {
          this.selectAnswer('True');
        } else if (event.key === '2') {
          this.selectAnswer('False');
        }
      }
    }
  }

  startTimer() {
    if (this.pack?.qcm) {
      this.timeLeft.set(this.pack.qcm.length * 60);
      this.timerInterval = setInterval(() => {
        if (this.timeLeft() > 0) {
          this.timeLeft.update(t => t - 1);
        } else {
          this.finishQuiz();
        }
      }, 1000);
    }
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  get formattedTime(): string {
    const min = Math.floor(this.timeLeft() / 60);
    const sec = this.timeLeft() % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }

  get progressPercentage(): number {
    const total = this.filteredQcms().length;
    if (!total) return 0;
    
    // Count how many of the filtered questions are answered
    let answeredCount = 0;
    const answeredMap = this.userAnswers();
    this.filteredQcms().forEach(q => {
      if (answeredMap[q.id]?.hasAnswered) {
        answeredCount++;
      }
    });
    return Math.round((answeredCount / total) * 100);
  }

  selectAnswer(answer: string | number) {
    if (this.hasAnswered()) return;
    this.selectedAnswer.set(answer);
  }

  submitAnswer() {
    if (!this.currentQuestion) return;

    let answerVal: string | number = '';
    let isCorrect = false;

    if (this.currentQuestion.type === 'fill-blanks') {
      if (!this.typedAnswer().trim()) return;
      answerVal = this.typedAnswer().trim();
      isCorrect = answerVal.toLowerCase() === String(this.currentQuestion.correctAnswer).trim().toLowerCase();
      this.selectedAnswer.set(answerVal);
    } else {
      if (this.selectedAnswer() === null) return;
      answerVal = this.selectedAnswer()!;
      isCorrect = String(answerVal).trim().toLowerCase() === String(this.currentQuestion.correctAnswer).trim().toLowerCase();
    }

    // Commit to registry
    this.userAnswers.update(ua => ({
      ...ua,
      [this.currentQuestion!.id]: {
        selected: answerVal,
        hasAnswered: true,
        isCorrect
      }
    }));
  }

  jumpToQuestion(index: number) {
    const list = this.filteredQcms();
    if (index < 0 || index >= list.length) return;

    this.currentIndex.set(index);
    const qId = this.currentQuestion?.id;
    const answeredState = qId ? this.userAnswers()[qId] : undefined;

    if (answeredState) {
      this.selectedAnswer.set(answeredState.selected);
      if (this.currentQuestion?.type === 'fill-blanks') {
        this.typedAnswer.set(String(answeredState.selected));
      }
    } else {
      this.selectedAnswer.set(null);
      this.typedAnswer.set('');
    }
  }

  nextQuestion() {
    const list = this.filteredQcms();
    if (this.currentIndex() < list.length - 1) {
      this.jumpToQuestion(this.currentIndex() + 1);
    } else if (list.length > 0) {
      this.finishQuiz();
    }
  }

  prevQuestion() {
    if (this.currentIndex() > 0) {
      this.jumpToQuestion(this.currentIndex() - 1);
    }
  }

  toggleBookmark(qId: string) {
    this.bookmarkedIds.update(set => {
      const next = new Set(set);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  }

  shuffleQ() {
    if (this.shuffledQcms().length === 0) return;
    
    // Shuffle array using Fisher-Yates
    const arr = [...this.shuffledQcms()];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    this.shuffledQcms.set(arr);
    this.jumpToQuestion(0);
  }

  resetQCM() {
    this.stopTimer();
    this.userAnswers.set({});
    this.bookmarkedIds.set(new Set());
    this.selectedTopic.set('all');
    this.selectedMode.set('all');
    
    if (this.pack?.qcm) {
      this.shuffledQcms.set([...this.pack.qcm]);
    }
    
    this.isFinished.set(false);
    this.jumpToQuestion(0);
    this.startTimer();
  }

  restart() {
    this.resetQCM();
  }

  setTopicFilter(topic: string) {
    this.selectedTopic.set(topic);
    this.jumpToQuestion(0);
  }

  setModeFilter(mode: 'all' | 'wrong' | 'bookmarks') {
    this.selectedMode.set(mode);
    this.jumpToQuestion(0);
  }

  finishQuiz() {
    this.stopTimer();
    this.isFinished.set(true);

    const total = this.filteredQcms().length;
    const scoreVal = this.score();
    const percentageVal = this.successPercentage();

    // Show themed SweetAlert celebration based on score
    if (percentageVal >= 80) {
      this.showCelebration(
        'Félicitations ! 🎉',
        `Score exceptionnel : ${scoreVal}/${total} (${percentageVal}%). Vous maîtrisez parfaitement ces notions !`,
        'success'
      );
    } else if (percentageVal >= 50) {
      this.showCelebration(
        'Pas mal ! ⚡',
        `Bon effort : ${scoreVal}/${total} (${percentageVal}%). Encore un peu de révision pour le score parfait !`,
        'info'
      );
    } else {
      this.showCelebration(
        'Entraînez-vous encore ! 📚',
        `Score : ${scoreVal}/${total} (${percentageVal}%). Prenez le temps de revoir les fiches mémo et réessayez !`,
        'warning'
      );
    }

    const answers = Object.entries(this.userAnswers())
      .filter(([_, ans]) => ans !== undefined)
      .map(([qId, ans]) => {
        const q = this.pack?.qcm.find(item => item.id === qId);
        return {
          questionId: qId,
          selectedAnswer: String(ans!.selected),
          isCorrect: ans!.isCorrect,
          topic: q?.topic || 'General'
        };
      });

    if (this.pack) {
      this.studyHubService.saveQuizAttempt(this.pack.id, {
        pack: this.pack.id,
        score: scoreVal,
        totalQuestions: total,
        percentage: percentageVal,
        answers: answers
      }).subscribe({
        next: (res) => {
          console.log('Quiz session attempt saved to backend:', res);
          // Refresh pack to show updated progress/streak immediately
          this.studyHubService.refreshPacks();
        },
        error: (err) => {
          console.error('Failed to save quiz session attempt:', err);
        }
      });
    }
  }
}

