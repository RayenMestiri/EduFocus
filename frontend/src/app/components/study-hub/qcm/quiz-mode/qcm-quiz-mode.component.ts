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
import { firstValueFrom } from 'rxjs';

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

  // ── Toast & celebration helpers ───────────────────────────────────────────
  private showToast(title: string, icon: 'success' | 'info' | 'error' = 'success') {
    const isDark = this.themeService.isDark();
    Swal.mixin({
      toast: true, position: 'top-end', showConfirmButton: false,
      timer: 2500, timerProgressBar: true,
      background: isDark ? '#111827' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827',
      customClass: { popup: 'study-hub-swal-toast font-sans' },
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    }).fire({ icon, title });
  }

  private showCelebration(title: string, text: string, icon: 'success' | 'warning' | 'info' = 'success') {
    const isDark = this.themeService.isDark();
    Swal.fire({
      title, text, icon,
      background: isDark ? '#111827' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827',
      confirmButtonText: 'Voir les résultats',
      confirmButtonColor: '#10b981',
      customClass: { popup: 'study-hub-swal-modal font-sans' }
    });
  }

  // ── Filtering states ──────────────────────────────────────────────────────
  selectedTopic = signal<string>('all');
  selectedMode = signal<'all' | 'wrong' | 'bookmarks'>('all');
  bookmarkedIds = signal<Set<string>>(new Set());

  // Registry of answered questions
  userAnswers = signal<Record<string, { selected: string | number; hasAnswered: boolean; isCorrect: boolean } | undefined>>({});

  // ── LocalStorage keys ─────────────────────────────────────────────────────
  private get storageKey(): string { return `edufocus_qcm_${this.pack?.id ?? 'default'}`; }
  private get bookmarkKey(): string { return `edufocus_qcm_bm_${this.pack?.id ?? 'default'}`; }
  private get finishedKey(): string { return `edufocus_qcm_finished_${this.pack?.id ?? 'default'}`; }
  private get indexKey(): string { return `edufocus_qcm_idx_${this.pack?.id ?? 'default'}`; }

  /** Set to true once attempt is saved to backend — prevents double-prompt */
  private _savedToBackend = false;

  // ── Storage helpers ───────────────────────────────────────────────────────
  private saveAnswersToStorage(): void {
    try { localStorage.setItem(this.storageKey, JSON.stringify(this.userAnswers())); } catch (_) {}
  }
  private loadAnswersFromStorage(): void {
    try { const r = localStorage.getItem(this.storageKey); if (r) this.userAnswers.set(JSON.parse(r)); } catch (_) {}
  }
  private saveBookmarksToStorage(): void {
    try { localStorage.setItem(this.bookmarkKey, JSON.stringify([...this.bookmarkedIds()])); } catch (_) {}
  }
  private loadBookmarksFromStorage(): void {
    try { const r = localStorage.getItem(this.bookmarkKey); if (r) this.bookmarkedIds.set(new Set(JSON.parse(r) as string[])); } catch (_) {}
  }
  private saveSessionMeta(): void {
    try {
      localStorage.setItem(this.finishedKey, String(this.isFinished()));
      localStorage.setItem(this.indexKey, String(this.currentIndex()));
    } catch (_) {}
  }
  private clearAllStorage(): void {
    try {
      [this.storageKey, this.bookmarkKey, this.finishedKey, this.indexKey].forEach(k => localStorage.removeItem(k));
    } catch (_) {}
  }

  // ── Computed signals ──────────────────────────────────────────────────────
  topics = computed(() => {
    const list = this.pack?.qcm || [];
    const unique = new Set(list.map(q => q.topic?.trim() || 'Général'));
    return Array.from(unique).filter(t => t.length > 0);
  });

  filteredQcms = computed(() => {
    let list = [...this.shuffledQcms()];
    if (this.selectedTopic() !== 'all') {
      list = list.filter(q => (q.topic?.trim() || 'Général') === this.selectedTopic());
    }
    if (this.selectedMode() === 'wrong') {
      list = list.filter(q => { const s = this.userAnswers()[q.id]; return s?.hasAnswered && !s.isCorrect; });
    } else if (this.selectedMode() === 'bookmarks') {
      list = list.filter(q => this.bookmarkedIds().has(q.id));
    }
    return list;
  });

  score = computed(() => {
    const answeredMap = this.userAnswers();
    return this.filteredQcms().filter(q => answeredMap[q.id]?.isCorrect).length;
  });

  wrongCount = computed(() => {
    const answeredMap = this.userAnswers();
    return this.filteredQcms().filter(q => { const s = answeredMap[q.id]; return s?.hasAnswered && !s.isCorrect; }).length;
  });

  answeredCount = computed(() => {
    const answeredMap = this.userAnswers();
    return this.filteredQcms().filter(q => answeredMap[q.id]?.hasAnswered).length;
  });

  remainingCount = computed(() => this.filteredQcms().length - this.answeredCount());

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

  hasAnswered = computed(() => !!this.currentQuestionAnswerState()?.hasAnswered);

  selectedAnswer = signal<string | number | null>(null);
  typedAnswer = signal<string>('');

  timerInterval: any = null;
  timeLeft = signal(0);
  Math = Math;
  String = String;

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    const packId = this.route.snapshot.paramMap.get('packId');
    if (!packId) return;

    this.pack = this.studyHubService.getPackById(packId);
    if (!this.pack || !this.pack.qcm || this.pack.qcm.length === 0) {
      this.router.navigate(['/study-hub', packId]);
      return;
    }

    this.shuffledQcms.set([...this.pack.qcm]);

    // Restore all persisted session state
    this.loadAnswersFromStorage();
    this.loadBookmarksFromStorage();

    // Restore isFinished — if finished, just show results without starting timer
    try {
      if (localStorage.getItem(this.finishedKey) === 'true') {
        this.isFinished.set(true);
        this._savedToBackend = true; // Already saved when they finished before, no need to re-prompt
        return;
      }
    } catch (_) {}

    // Restore last position
    try {
      const savedIdx = localStorage.getItem(this.indexKey);
      if (savedIdx !== null) {
        const idx = parseInt(savedIdx, 10);
        if (!isNaN(idx) && idx >= 0 && idx < this.shuffledQcms().length) {
          this.currentIndex.set(idx);
        }
      }
    } catch (_) {}

    // Restore selected answer for the restored current question
    this._restoreAnswerForCurrentQ();

    // Start timer
    this.startTimer();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  private _restoreAnswerForCurrentQ(): void {
    const curQ = this.filteredQcms()[this.currentIndex()];
    if (curQ) {
      const state = this.userAnswers()[curQ.id];
      if (state) {
        this.selectedAnswer.set(state.selected);
        if (curQ.type === 'fill-blanks') this.typedAnswer.set(String(state.selected));
      } else {
        this.selectedAnswer.set(null);
        this.typedAnswer.set('');
      }
    }
  }

  // ── canDeactivate — called by Angular Router guard before leaving ──────────
  async canDeactivate(): Promise<boolean> {
    // Allow freely if: session is done, already saved, or no answers yet
    if (this.isFinished() || this._savedToBackend || this.answeredCount() === 0) {
      return true;
    }
    if (!this.pack) return true;

    this.stopTimer(); // Pause while user decides

    const isDark = this.themeService.isDark();
    const result = await Swal.fire({
      title: '💾 Sauvegarder avant de partir ?',
      html: `
        <div style="text-align:center;padding:4px 0">
          <p style="font-size:15px;font-weight:600;margin-bottom:6px">
            Vous avez répondu à <strong style="color:#6366f1">${this.answeredCount()}/${this.filteredQcms().length}</strong> questions
          </p>
          <p style="font-size:13px;color:#6b7280;margin:0">
            Sauvegarder maintenant pour conserver votre historique
          </p>
        </div>
      `,
      icon: 'question',
      background: isDark ? '#111827' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '💾 Sauvegarder et quitter',
      denyButtonText: '🚪 Quitter sans sauver',
      cancelButtonText: '↩ Rester sur le quiz',
      confirmButtonColor: '#6366f1',
      denyButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      customClass: { popup: 'study-hub-swal-modal font-sans' }
    });

    if (result.isConfirmed) {
      await this._saveToBackend();
      return true;
    } else if (result.isDenied) {
      return true; // Leave without saving
    } else {
      // Cancel — resume timer and stay
      this.startTimer();
      return false;
    }
  }

  /** Warn on browser tab close / page reload (native browser dialog) */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.answeredCount() > 0 && !this.isFinished() && !this._savedToBackend) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  /** Save current answers to backend (partial or full) */
  private async _saveToBackend(): Promise<void> {
    if (!this.pack) return;
    const answers = Object.entries(this.userAnswers())
      .filter(([_, ans]) => ans !== undefined)
      .map(([qId, ans]) => {
        const q = this.pack!.qcm.find(item => item.id === qId);
        return {
          questionId: qId,
          selectedAnswer: String(ans!.selected),
          isCorrect: ans!.isCorrect,
          topic: q?.topic || 'Général'
        };
      });

    if (answers.length === 0) return;

    const total = this.filteredQcms().length;
    const scoreVal = this.score();
    const pct = Math.round((scoreVal / Math.max(answers.length, 1)) * 100);

    try {
      await firstValueFrom(this.studyHubService.saveQuizAttempt(this.pack.id, {
        pack: this.pack.id,
        score: scoreVal,
        totalQuestions: total,
        percentage: pct,
        answers
      }));
      this._savedToBackend = true;
      this.studyHubService.refreshPacks();
      this.showToast('✅ Progression sauvegardée dans votre historique !', 'success');
    } catch {
      this.showToast('❌ Erreur lors de la sauvegarde', 'error');
    }
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (this.isFinished()) {
      if (event.key === 'r' || event.key === 'R') this.resetQCM();
      return;
    }

    if (event.key === 'ArrowRight') { event.preventDefault(); this.nextQuestion(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); this.prevQuestion(); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.hasAnswered()) this.nextQuestion(); else this.submitAnswer();
    } else if (event.key === 'b' || event.key === 'B') {
      event.preventDefault();
      if (this.currentQuestion) this.toggleBookmark(this.currentQuestion.id);
    } else if (!this.hasAnswered() && this.currentQuestion) {
      if (this.currentQuestion.type === 'multiple-choice') {
        if (['1', '2', '3', '4'].includes(event.key)) {
          const idx = parseInt(event.key) - 1;
          if (this.currentQuestion.options && idx < this.currentQuestion.options.length) this.selectAnswer(idx);
        }
      } else if (this.currentQuestion.type === 'true-false') {
        if (event.key === '1') this.selectAnswer('True');
        else if (event.key === '2') this.selectAnswer('False');
      }
    }
  }

  // ── Timer ─────────────────────────────────────────────────────────────────
  startTimer() {
    if (this.pack?.qcm) {
      // Only reset time on a fresh session (no saved time)
      if (this.timeLeft() === 0) {
        this.timeLeft.set(this.pack.qcm.length * 60);
      }
      this.stopTimer(); // Clear any existing interval first
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
      this.timerInterval = null;
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
    const answeredMap = this.userAnswers();
    const answeredCount = this.filteredQcms().filter(q => answeredMap[q.id]?.hasAnswered).length;
    return Math.round((answeredCount / total) * 100);
  }

  // ── Answer handling ───────────────────────────────────────────────────────
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

    // Record answer
    this.userAnswers.update(ua => ({
      ...ua,
      [this.currentQuestion!.id]: { selected: answerVal, hasAnswered: true, isCorrect }
    }));

    // Persist immediately to localStorage
    this.saveAnswersToStorage();
  }

  jumpToQuestion(index: number) {
    const list = this.filteredQcms();
    if (index < 0 || index >= list.length) return;
    this.currentIndex.set(index);
    this._restoreAnswerForCurrentQ();
    this.saveSessionMeta();
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
    if (this.currentIndex() > 0) this.jumpToQuestion(this.currentIndex() - 1);
  }

  toggleBookmark(qId: string) {
    this.bookmarkedIds.update(set => {
      const next = new Set(set);
      if (next.has(qId)) next.delete(qId); else next.add(qId);
      return next;
    });
    this.saveBookmarksToStorage();
  }

  shuffleQ() {
    if (this.shuffledQcms().length === 0) return;
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
    this._savedToBackend = false;
    this.clearAllStorage();
    if (this.pack?.qcm) this.shuffledQcms.set([...this.pack.qcm]);
    this.isFinished.set(false);
    this.timeLeft.set(0); // Reset so startTimer re-initialises it
    this.currentIndex.set(0);
    this._restoreAnswerForCurrentQ();
    this.startTimer();
  }

  restart() { this.resetQCM(); }

  setTopicFilter(topic: string) { this.selectedTopic.set(topic); this.jumpToQuestion(0); }
  setModeFilter(mode: 'all' | 'wrong' | 'bookmarks') { this.selectedMode.set(mode); this.jumpToQuestion(0); }

  // ── Finish Quiz ───────────────────────────────────────────────────────────
  finishQuiz() {
    this.stopTimer();
    this.isFinished.set(true);
    this.saveSessionMeta(); // Persist finished state to localStorage

    const total = this.filteredQcms().length;
    const scoreVal = this.score();
    const percentageVal = this.successPercentage();

    // Celebration dialog
    if (percentageVal >= 80) {
      this.showCelebration('🎉 Félicitations !', `Score exceptionnel : ${scoreVal}/${total} (${percentageVal}%). Vous maîtrisez parfaitement ces notions !`, 'success');
    } else if (percentageVal >= 50) {
      this.showCelebration('⚡ Pas mal !', `Bon effort : ${scoreVal}/${total} (${percentageVal}%). Encore un peu de révision pour le score parfait !`, 'info');
    } else {
      this.showCelebration('📚 Entraînez-vous encore !', `Score : ${scoreVal}/${total} (${percentageVal}%). Prenez le temps de revoir les fiches mémo et réessayez !`, 'warning');
    }

    // Save completed attempt to backend
    if (this.pack && !this._savedToBackend) {
      const answers = Object.entries(this.userAnswers())
        .filter(([_, ans]) => ans !== undefined)
        .map(([qId, ans]) => {
          const q = this.pack?.qcm.find(item => item.id === qId);
          return { questionId: qId, selectedAnswer: String(ans!.selected), isCorrect: ans!.isCorrect, topic: q?.topic || 'Général' };
        });

      this.studyHubService.saveQuizAttempt(this.pack.id, {
        pack: this.pack.id, score: scoreVal, totalQuestions: total, percentage: percentageVal, answers
      }).subscribe({
        next: () => {
          this._savedToBackend = true; // Prevent canDeactivate from re-prompting
          this.studyHubService.refreshPacks();
          this.showToast('✅ Résultats sauvegardés dans l\'historique !', 'success');
        },
        error: () => this.showToast('❌ Erreur lors de la sauvegarde', 'error')
      });
    }
  }
}
