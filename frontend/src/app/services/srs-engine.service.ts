import { Injectable } from '@angular/core';
import { Flashcard, CardState, SrsRating } from '../models/study-hub.model';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  SRS Engine — SM-2 Based Spaced Repetition Scheduler
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  Rating scale (Anki-style):
 *    0 = Again  → card reset / lapse
 *    1 = Hard   → interval shrinks slightly
 *    2 = Good   → standard SM-2 progression
 *    3 = Easy   → boosted interval
 *
 *  State machine:
 *    NEW → LEARNING → REVIEW → MASTERED
 *         ↑────────────────────↓ (on lapse)
 *
 *  Mastered threshold: interval ≥ 21 days + ease ≥ 2.5
 * ═══════════════════════════════════════════════════════════════════════════════
 */
@Injectable({ providedIn: 'root' })
export class SrsEngineService {

  // ── SM-2 Constants ──────────────────────────────────────────────────────────
  private readonly MIN_EASE = 1.3;
  private readonly DEFAULT_EASE = 2.5;
  private readonly MASTERY_INTERVAL = 21;   // days to consider "mastered"
  private readonly MASTERY_EASE = 2.5;
  private readonly EASY_BONUS = 1.3;
  private readonly HARD_FACTOR = 1.2;

  // ── Learning steps (in minutes) — like Anki ─────────────────────────────────
  private readonly LEARNING_STEPS = [1, 10]; // 1 min, then 10 min

  /**
   * Initialize a brand-new flashcard with SRS defaults.
   * Call this when creating new flashcards to ensure all SRS fields exist.
   */
  initializeCard(card: Partial<Flashcard>): Flashcard {
    return {
      ...card,
      state: card.state ?? 'new',
      repetitions: card.repetitions ?? 0,
      interval: card.interval ?? 0,
      easeFactor: card.easeFactor ?? this.DEFAULT_EASE,
      dueDate: card.dueDate ?? undefined,
      lastReviewed: card.lastReviewed ?? undefined,
      lapses: card.lapses ?? 0,
    } as Flashcard;
  }

  /**
   * Ensure all cards in a pack have SRS metadata (backwards-compat migration).
   */
  migrateCards(cards: Flashcard[]): Flashcard[] {
    return cards.map(c => this.initializeCard(c));
  }

  /**
   * Core SM-2 scheduling: rate a card → return an updated copy with new SRS state.
   */
  rateCard(card: Flashcard, rating: SrsRating): Flashcard {
    const now = new Date();
    let { repetitions, interval, easeFactor, lapses, state } = card;

    // Ensure defaults
    repetitions = repetitions ?? 0;
    interval = interval ?? 0;
    easeFactor = easeFactor ?? this.DEFAULT_EASE;
    lapses = lapses ?? 0;
    state = state ?? 'new';

    // ── AGAIN (0) — lapse / reset ────────────────────────────────────────────
    if (rating === 0) {
      if (state === 'review' || state === 'mastered') {
        lapses++;
      }
      repetitions = 0;
      interval = 0;
      easeFactor = Math.max(this.MIN_EASE, easeFactor - 0.2);
      state = 'learning';

      return {
        ...card,
        state,
        repetitions,
        interval,
        easeFactor,
        lapses,
        lastReviewed: now,
        dueDate: this.addMinutes(now, this.LEARNING_STEPS[0]),
        difficulty: 'hard',
      };
    }

    // ── HARD (1) ──────────────────────────────────────────────────────────────
    if (rating === 1) {
      easeFactor = Math.max(this.MIN_EASE, easeFactor - 0.15);

      if (state === 'new' || state === 'learning') {
        // Stay in learning, repeat same step
        return {
          ...card,
          state: 'learning',
          repetitions,
          interval: 0,
          easeFactor,
          lapses,
          lastReviewed: now,
          dueDate: this.addMinutes(now, this.LEARNING_STEPS[0]),
          difficulty: 'hard',
        };
      }

      // Review / Mastered → shrink interval slightly
      interval = Math.max(1, Math.round(interval * this.HARD_FACTOR));
      repetitions++;
      state = 'review';

      return {
        ...card,
        state,
        repetitions,
        interval,
        easeFactor,
        lapses,
        lastReviewed: now,
        dueDate: this.addDays(now, interval),
        difficulty: 'medium',
      };
    }

    // ── GOOD (2) — standard SM-2 ────────────────────────────────────────────
    if (rating === 2) {
      if (state === 'new' || state === 'learning') {
        // Graduate from learning → first review interval
        repetitions = 1;
        interval = 1; // 1 day
        state = 'review';

        return {
          ...card,
          state,
          repetitions,
          interval,
          easeFactor,
          lapses,
          lastReviewed: now,
          dueDate: this.addDays(now, 1),
          difficulty: 'medium',
        };
      }

      // Standard SM-2 interval calculation
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions++;
      state = this.checkMastery(interval, easeFactor) ? 'mastered' : 'review';

      return {
        ...card,
        state,
        repetitions,
        interval,
        easeFactor,
        lapses,
        lastReviewed: now,
        dueDate: this.addDays(now, interval),
        difficulty: state === 'mastered' ? 'easy' : 'medium',
      };
    }

    // ── EASY (3) — boosted ──────────────────────────────────────────────────
    easeFactor = easeFactor + 0.15;

    if (state === 'new' || state === 'learning') {
      // Instantly graduate with a 4-day interval
      repetitions = 1;
      interval = 4;
      state = 'review';

      return {
        ...card,
        state,
        repetitions,
        interval,
        easeFactor,
        lapses,
        lastReviewed: now,
        dueDate: this.addDays(now, 4),
        difficulty: 'easy',
      };
    }

    // Review / Mastered
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor * this.EASY_BONUS);
    }
    repetitions++;
    state = this.checkMastery(interval, easeFactor) ? 'mastered' : 'review';

    return {
      ...card,
      state,
      repetitions,
      interval,
      easeFactor,
      lapses,
      lastReviewed: now,
      dueDate: this.addDays(now, interval),
      difficulty: 'easy',
    };
  }

  // ── Review Queue Builder ────────────────────────────────────────────────────

  /**
   * Build the daily review queue from all flashcards in a pack.
   * Returns cards that are due today (or overdue), sorted by priority:
   *   1. Overdue cards (oldest first)
   *   2. Due-today cards
   *   3. New cards (up to `newCardsPerDay` limit)
   */
  buildReviewQueue(cards: Flashcard[], newCardsPerDay: number = 20): Flashcard[] {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const overdue: Flashcard[] = [];
    const dueToday: Flashcard[] = [];
    const newCards: Flashcard[] = [];
    const learning: Flashcard[] = [];

    for (const card of this.migrateCards(cards)) {
      if (card.state === 'new') {
        newCards.push(card);
      } else if (card.state === 'learning') {
        learning.push(card);
      } else if (card.dueDate) {
        const due = new Date(card.dueDate);
        if (due < startOfDay) {
          overdue.push(card);
        } else if (due <= now) {
          dueToday.push(card);
        }
        // Future cards are not included in queue
      }
    }

    // Sort overdue by due date ascending (most overdue first)
    overdue.sort((a, b) =>
      new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
    );

    // Learning cards first (they're actively being studied)
    learning.sort((a, b) =>
      new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime()
    );

    // Limit new cards
    const limitedNew = newCards.slice(0, newCardsPerDay);

    return [...learning, ...overdue, ...dueToday, ...limitedNew];
  }

  // ── Statistics Helpers ──────────────────────────────────────────────────────

  /** Count cards by state */
  getStatsByState(cards: Flashcard[]): Record<CardState, number> {
    const migrated = this.migrateCards(cards);
    return {
      new: migrated.filter(c => c.state === 'new').length,
      learning: migrated.filter(c => c.state === 'learning').length,
      review: migrated.filter(c => c.state === 'review').length,
      mastered: migrated.filter(c => c.state === 'mastered').length,
    };
  }

  /** Count cards due today */
  getDueCount(cards: Flashcard[]): number {
    return this.buildReviewQueue(cards).length;
  }

  /** Check if a single card is due today */
  isCardDue(card: Flashcard | undefined): boolean {
    if (!card) return false;
    if (card.state === 'new' || card.state === 'learning') return true;
    if (!card.dueDate) return true;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(card.dueDate);
    return due <= now || due < startOfDay;
  }

  /** Get next review label for a card */
  getNextReviewLabel(card: Flashcard | undefined): string {
    if (!card || !card.dueDate) return 'Nouvelle';
    const now = new Date();
    const due = new Date(card.dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)}j en retard`;
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return 'Demain';
    if (diffDays < 30) return `Dans ${diffDays}j`;
    if (diffDays < 365) return `Dans ${Math.round(diffDays / 30)} mois`;
    return `Dans ${Math.round(diffDays / 365)} an(s)`;
  }

  /** Preview what interval each rating would produce (for button labels) */
  previewIntervals(card: Flashcard | undefined): { again: string; hard: string; good: string; easy: string } {
    if (!card) return { again: '', hard: '', good: '', easy: '' };
    return {
      again: this.formatInterval(this.rateCard(card, 0)),
      hard:  this.formatInterval(this.rateCard(card, 1)),
      good:  this.formatInterval(this.rateCard(card, 2)),
      easy:  this.formatInterval(this.rateCard(card, 3)),
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private formatInterval(card: Flashcard): string {
    if (card.interval === 0) {
      // Learning step — show in minutes
      const mins = card.dueDate
        ? Math.round((new Date(card.dueDate).getTime() - Date.now()) / 60000)
        : 1;
      return mins <= 0 ? '<1min' : `${Math.max(1, mins)}min`;
    }
    if (card.interval === 1) return '1j';
    if (card.interval < 30) return `${card.interval}j`;
    if (card.interval < 365) return `${Math.round(card.interval / 30)}mo`;
    return `${(card.interval / 365).toFixed(1)}a`;
  }

  private checkMastery(interval: number, ease: number): boolean {
    return interval >= this.MASTERY_INTERVAL && ease >= this.MASTERY_EASE;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000);
  }
}
