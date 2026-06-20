import { Component, inject, signal, computed, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OfflineStudyHubService } from '../../../../services/offline/offline-studyhub.service';
import { SrsEngineService } from '../../../../services/srs-engine.service';
import { ThemeService } from '../../../../services/theme.service';
import { StudyPack, Flashcard, SrsRating } from '../../../../models/study-hub.model';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-flashcards-study-mode',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './flashcards-study-mode.component.html',
  styleUrls: ['./flashcards-study-mode.component.css']
})
export class FlashcardsStudyModeComponent implements OnInit {
  studyHubService = inject(OfflineStudyHubService);
  srsEngine = inject(SrsEngineService);
  themeService = inject(ThemeService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  packId = signal<string | null>(null);
  pack = computed(() => {
    const id = this.packId();
    return id ? this.studyHubService.studyPacks().find(p => p.id === id) : undefined;
  });

  // ── Study Mode ────────────────────────────────────────────────────────────
  /** 'normal' = browse only (no SRS), 'exam' = full SRS rating */
  studyMode = signal<'normal' | 'exam'>('exam');

  // ── SRS Review Queue ──────────────────────────────────────────────────────
  reviewQueue = signal<Flashcard[]>([]);
  currentIndex = signal(0);
  isFlipped = signal(false);
  isFinished = signal(false);
  sessionStartTime = signal<Date>(new Date());

  // Track ratings this session for the summary
  sessionRatings = signal<{ cardId: string; rating: SrsRating }[]>([]);

  // ── Computed Stats ────────────────────────────────────────────────────────
  currentCard = computed(() => this.reviewQueue()[this.currentIndex()] ?? undefined);

  progressPercentage = computed(() => {
    const total = this.reviewQueue().length;
    if (!total) return 0;
    return Math.round((this.currentIndex() / total) * 100);
  });

  /** Preview intervals for the current card (what each button would do) */
  intervalPreview = computed(() => {
    const card = this.currentCard();
    if (!card) return { again: '', hard: '', good: '', easy: '' };
    return this.srsEngine.previewIntervals(card);
  });

  /** Stats by SRS state for all flashcards in the pack */
  stateStats = computed(() => {
    const cards = this.pack()?.flashcards ?? [];
    return this.srsEngine.getStatsByState(cards);
  });

  /** Cards due today */
  dueCount = computed(() => {
    const cards = this.pack()?.flashcards ?? [];
    return this.srsEngine.getDueCount(cards);
  });

  /** Estimated minutes remaining (avg 20 sec / card) */
  estimatedMinutes = computed(() => {
    const remaining = this.reviewQueue().length - this.currentIndex();
    return Math.max(1, Math.round((remaining * 20) / 60));
  });

  /** Session stats for the finish screen */
  sessionStats = computed(() => {
    const ratings = this.sessionRatings();
    return {
      total: ratings.length,
      again: ratings.filter(r => r.rating === 0).length,
      hard: ratings.filter(r => r.rating === 1).length,
      good: ratings.filter(r => r.rating === 2).length,
      easy: ratings.filter(r => r.rating === 3).length,
      durationMinutes: Math.round((Date.now() - this.sessionStartTime().getTime()) / 60000),
    };
  });

  /** SRS hint banner message */
  srsHint = computed(() => {
    const stats = this.stateStats();
    const due = this.dueCount();

    if (due > 0) {
      return `${due} carte${due > 1 ? 's' : ''} à réviser aujourd'hui 📚`;
    }
    if (stats.new > 0) {
      return `${stats.new} nouvelle${stats.new > 1 ? 's' : ''} carte${stats.new > 1 ? 's' : ''} à découvrir 🆕`;
    }
    if (stats.mastered === (stats.new + stats.learning + stats.review + stats.mastered)) {
      return 'Toutes les cartes sont maîtrisées ! Excellent travail ! 🎉';
    }
    return 'Pas de cartes à réviser pour le moment ✨';
  });

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
      customClass: { popup: 'study-hub-swal-toast font-sans' },
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
    Toast.fire({ icon, title });
  }

  private showCelebration(title: string, text: string, icon: 'success' | 'warning' | 'info' = 'success') {
    const isDark = this.themeService.isDark();
    Swal.fire({
      title, text, icon,
      background: isDark ? '#111827' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827',
      confirmButtonText: 'Voir le récapitulatif',
      confirmButtonColor: '#a855f7',
      customClass: { popup: 'study-hub-swal-modal font-sans' }
    });
  }

  ngOnInit() {
    const packId = this.route.snapshot.paramMap.get('packId');
    if (packId) {
      this.packId.set(packId);
      this.studyHubService.refreshPacks();

      const checkInterval = setInterval(() => {
        if (!this.studyHubService.isLoading()) {
          clearInterval(checkInterval);
          const currentPack = this.pack();
          if (!currentPack?.flashcards?.length) {
            this.router.navigate(['/study-hub', packId]);
            return;
          }
          // Build the SRS review queue
          this.startSession();
        }
      }, 50);
    }
  }

  /** Build review queue and start session */
  startSession() {
    const cards = this.pack()?.flashcards ?? [];

    if (this.studyMode() === 'normal') {
      // Normal mode: show ALL cards in order
      this.reviewQueue.set(this.srsEngine.migrateCards(cards));
    } else {
      // Exam/SRS mode: only due cards (or all if none due)
      const queue = this.srsEngine.buildReviewQueue(cards);
      this.reviewQueue.set(queue.length === 0 ? this.srsEngine.migrateCards(cards) : queue);
    }

    this.currentIndex.set(0);
    this.isFlipped.set(false);
    this.isFinished.set(false);
    this.sessionRatings.set([]);
    this.sessionStartTime.set(new Date());
  }

  /** Switch study mode and restart */
  setMode(mode: 'normal' | 'exam') {
    if (this.studyMode() === mode) return;
    this.studyMode.set(mode);
    this.startSession();
  }

  /** Normal mode: just advance to next card without SRS rating */
  nextNormal() {
    this.nextCard();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (this.isFinished()) {
      if (event.key === 'r' || event.key === 'R') this.restart();
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (this.studyMode() === 'normal' && this.isFlipped()) {
        this.nextNormal();
      } else {
        this.flipCard();
      }
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prevCard();
    } else if (event.key === 'ArrowRight' && this.studyMode() === 'normal' && this.isFlipped()) {
      event.preventDefault();
      this.nextNormal();
    } else if (this.isFlipped() && this.studyMode() === 'exam') {
      // Anki-style keyboard shortcuts (exam mode only)
      if (event.key === '1') this.rateCurrent(0); // Again
      if (event.key === '2') this.rateCurrent(1); // Hard
      if (event.key === '3') this.rateCurrent(2); // Good
      if (event.key === '4') this.rateCurrent(3); // Easy
    }
  }

  flipCard() {
    this.isFlipped.update(v => !v);
  }

  /**
   * Rate the current card using SM-2 and advance.
   */
  rateCurrent(rating: SrsRating) {
    const currentPack = this.pack();
    const card = this.currentCard();
    if (!currentPack || !card) return;

    // Run SM-2 algorithm
    const updatedCard = this.srsEngine.rateCard(card, rating);

    // Update the pack's flashcards array
    const updatedCards = currentPack.flashcards.map(c =>
      c.id === updatedCard.id ? updatedCard : c
    );

    // Persist to backend — also update lastStudied so the dashboard reflects activity
    this.studyHubService.updatePack(currentPack.id, {
      flashcards: updatedCards,
      lastStudied: new Date()
    });

    // Update local queue with the rated card
    this.reviewQueue.update(q => q.map((c, i) =>
      i === this.currentIndex() ? updatedCard : c
    ));

    // Track rating for session summary
    this.sessionRatings.update(r => [...r, { cardId: card.id, rating }]);

    // Advance
    this.nextCard();
  }

  nextCard() {
    const queue = this.reviewQueue();
    if (this.currentIndex() < queue.length - 1) {
      this.isFlipped.set(false);
      setTimeout(() => this.currentIndex.update(i => i + 1), 150);
    } else {
      this.isFinished.set(true);
      const stats = this.sessionStats();
      this.showCelebration(
        'Session terminée ! 🎯',
        `${stats.total} cartes révisées en ${stats.durationMinutes || '<1'} min`,
        'success'
      );
    }
  }

  prevCard() {
    if (this.currentIndex() > 0) {
      this.isFlipped.set(false);
      setTimeout(() => {
        this.currentIndex.update(i => i - 1);
        this.isFinished.set(false);
      }, 150);
    }
  }

  skipCard() {
    this.nextCard();
  }

  restart() {
    this.startSession();
  }

  /** Get state label for badge */
  getStateLabel(state: string): string {
    switch (state) {
      case 'new': return 'Nouvelle';
      case 'learning': return 'Apprentissage';
      case 'review': return 'Révision';
      case 'mastered': return 'Maîtrisée';
      default: return '';
    }
  }

  /** Get CSS class for state badge */
  getStateBadgeClass(state: string): string {
    switch (state) {
      case 'new': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'learning': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'review': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'mastered': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default: return '';
    }
  }
}
