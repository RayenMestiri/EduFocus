import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { OfflineStudyHubService } from '../../../services/offline/offline-studyhub.service';
import { SrsEngineService } from '../../../services/srs-engine.service';
import { ThemeService } from '../../../services/theme.service';
import { environment } from '../../../../environments/environment';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';

@Component({
  selector: 'app-srs-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './srs-analytics.component.html',
  styleUrls: ['./srs-analytics.component.css']
})
export class SrsAnalyticsComponent implements OnInit {
  private http = inject(HttpClient);
  studyHubService = inject(OfflineStudyHubService);
  srsEngine = inject(SrsEngineService);
  themeService = inject(ThemeService);

  private readonly apiUrl = `${environment.apiUrl}/api/study-packs/srs-stats`;

  // ── State ───────────────────────────────────────────────────────────────────
  isLoading = signal(true);

  // ── Per-pack breakdown — fully reactive, recomputes whenever packs change ──
  packBreakdown = computed(() =>
    this.studyHubService.studyPacks()
      .filter(p => (p.flashcards || []).length > 0)
      .map(p => {
        const cards = p.flashcards || [];
        const states = this.srsEngine.getStatsByState(cards);
        const due = this.srsEngine.getDueCount(cards);

        let lapses = 0;
        let reviewed = 0;
        for (const c of cards) {
          if (c.lastReviewed) {
            reviewed++;
            lapses += (c.lapses || 0);
          }
        }
        const retention = reviewed > 0
          ? Math.round(((reviewed - lapses) / reviewed) * 100)
          : null;

        return { pack: p, states, due, retention, total: cards.length };
      })
      .sort((a, b) => b.due - a.due)
  );

  // ── Aggregated stats — computed live from the service signal ───────────────
  computedStats = computed(() => {
    const packs = this.studyHubService.studyPacks();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Build the daily queue across all packs using buildReviewQueue to get exact counts
    const dailyQueue = packs.flatMap(p => this.srsEngine.buildReviewQueue(p.flashcards || []));

    let newCount = 0, learning = 0, review = 0, mastered = 0;
    let totalReviewed = 0, lapses = 0;
    let reviewsLast7Days = 0, reviewsLast30Days = 0, totalFlashcards = 0;

    for (const p of packs) {
      for (const f of (p.flashcards || [])) {
        totalFlashcards++;
        const state = f.state || 'new';

        if (state === 'new') newCount++;
        else if (state === 'learning') learning++;
        else if (state === 'review') review++;
        else if (state === 'mastered') mastered++;

        if (f.lastReviewed) {
          totalReviewed++;
          lapses += (f.lapses || 0);
          const lr = new Date(f.lastReviewed);
          if (lr >= sevenDaysAgo) reviewsLast7Days++;
          if (lr >= thirtyDaysAgo) reviewsLast30Days++;
        }
      }
    }

    const dueToday = dailyQueue.length;
    const overdue = dailyQueue.filter(c =>
      (c.state === 'review' || c.state === 'mastered') && c.dueDate && new Date(c.dueDate) < startOfToday
    ).length;

    const retentionRate = totalReviewed > 0
      ? Math.max(0, Math.min(100, Math.round(((totalReviewed - lapses) / totalReviewed) * 100)))
      : 0;

    return {
      totalPacks: packs.length,
      totalFlashcards,
      new: newCount,
      learning,
      review,
      mastered,
      dueToday,
      overdue,
      retentionRate,
      reviewsLast7Days,
      reviewsLast30Days,
      totalReviewed,
    };
  });

  ngOnInit(): void {
    // Fetch fresh data from server — the packs signal updates reactively
    this.studyHubService.refreshPacks();

    // Wait for loading to complete, then show content
    const poll = setInterval(() => {
      if (!this.studyHubService.isLoading()) {
        clearInterval(poll);
        this.isLoading.set(false);
      }
    }, 50);

    // Safety timeout — always show content after 5 seconds even if loading hangs
    setTimeout(() => {
      clearInterval(poll);
      this.isLoading.set(false);
    }, 5000);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  getDistributionWidth(count: number): string {
    const total = this.computedStats().totalFlashcards || 1;
    return `${Math.max(0, (count / total) * 100)}%`;
  }

  pct(count: number): string {
    const total = this.computedStats().totalFlashcards;
    if (!total) return '0%';
    return `${Math.round((count / total) * 100)}%`;
  }

  getMasteryLabel(rate: number | null): string {
    if (rate === null) return 'Nouveau';
    if (rate >= 90) return 'Excellent';
    if (rate >= 75) return 'Bien';
    if (rate >= 50) return 'Moyen';
    return 'À améliorer';
  }

  getMasteryClass(rate: number | null): string {
    if (rate === null) return 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    if (rate >= 90) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800';
    if (rate >= 75) return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
    if (rate >= 50) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800';
  }
}
