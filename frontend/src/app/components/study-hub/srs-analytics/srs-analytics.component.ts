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

  isLoading = signal(true);

  packBreakdown = computed(() =>
    this.studyHubService.studyPacks()
      .filter(p => (p.flashcards || []).length > 0)
      .map(p => {
        const cards = p.flashcards || [];
        const states = this.srsEngine.getStatsByState(cards);
        const due = this.srsEngine.getDueCount(cards);
        let lapses = 0, reviewed = 0;
        for (const c of cards) {
          if (c.lastReviewed) { reviewed++; lapses += (c.lapses || 0); }
        }
        const retention = reviewed > 0 ? Math.round(((reviewed - lapses) / reviewed) * 100) : null;
        return { pack: p, states, due, retention, total: cards.length };
      })
      .sort((a, b) => b.due - a.due)
  );

  computedStats = computed(() => {
    const packs = this.studyHubService.studyPacks();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
          totalReviewed++; lapses += (f.lapses || 0);
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
      ? Math.max(0, Math.min(100, Math.round(((totalReviewed - lapses) / totalReviewed) * 100))) : 0;
    return { totalPacks: packs.length, totalFlashcards, new: newCount, learning, review, mastered, dueToday, overdue, retentionRate, reviewsLast7Days, reviewsLast30Days, totalReviewed };
  });

  getMasteryPercentage = computed(() => {
    const s = this.computedStats();
    return s.totalFlashcards > 0 ? Math.round((s.mastered / s.totalFlashcards) * 100) : 0;
  });

  getLearningHealthScore = computed(() => {
    const s = this.computedStats();
    const overdueRatio = s.totalFlashcards > 0 ? Math.max(0, 1 - (s.overdue / s.totalFlashcards)) : 1;
    return Math.round((s.retentionRate * 0.5) + (this.getMasteryPercentage() * 0.3) + (overdueRatio * 100 * 0.2));
  });

  getWorkloadStatus = computed(() => {
    const { dueToday, overdue } = this.computedStats();
    if (dueToday === 0) return { label: 'A jour', icon: 'check_circle', color: '#22c55e', bg: 'rgba(34,197,94,.1)' };
    if (overdue > 0)   return { label: 'En retard', icon: 'schedule', color: '#ef4444', bg: 'rgba(239,68,68,.1)' };
    return { label: 'Prevues', icon: 'event', color: '#f59e0b', bg: 'rgba(245,158,11,.1)' };
  });

  getAiInsights = computed(() => {
    const s = this.computedStats();
    const mp = this.getMasteryPercentage();
    const health = this.getLearningHealthScore();
    const insights: { icon: string; color: string; bg: string; title: string; body: string; priority: string }[] = [];
    if (s.retentionRate >= 85) {
      insights.push({ icon: 'emoji_events', color: '#22c55e', bg: 'rgba(34,197,94,.08)', title: 'Retention excellente', body: `Votre taux de ${s.retentionRate}% est dans le top tier. Continuez votre rythme actuel.`, priority: 'low' });
    } else if (s.retentionRate >= 65) {
      insights.push({ icon: 'trending_up', color: '#6d5ef7', bg: 'rgba(109,94,247,.08)', title: 'Bonne progression', body: `Retention a ${s.retentionRate}%. Revisez vos cartes en retard pour atteindre 85%+.`, priority: 'medium' });
    } else if (s.totalReviewed > 0) {
      insights.push({ icon: 'warning_amber', color: '#f59e0b', bg: 'rgba(245,158,11,.08)', title: 'Retention a ameliorer', body: `${s.retentionRate}% de retention. Augmentez la frequence de revision.`, priority: 'high' });
    } else {
      insights.push({ icon: 'rocket_launch', color: '#5b8def', bg: 'rgba(91,141,239,.08)', title: 'Commencez a apprendre', body: 'Vous avez des flashcards pretes. Demarrez votre premiere session pour generer des statistiques.', priority: 'medium' });
    }
    if (s.overdue > 0) {
      insights.push({ icon: 'alarm', color: '#ef4444', bg: 'rgba(239,68,68,.08)', title: `${s.overdue} carte(s) en retard`, body: 'Des cartes depassent leur date. Chaque jour de retard reduit la retention a long terme.', priority: 'high' });
    } else if (s.dueToday > 0) {
      insights.push({ icon: 'today', color: '#f59e0b', bg: 'rgba(245,158,11,.08)', title: `${s.dueToday} revision(s) prevue(s)`, body: 'Vos cartes du jour vous attendent. Une session maintenant maximise votre courbe de retention.', priority: 'medium' });
    } else {
      insights.push({ icon: 'verified', color: '#22c55e', bg: 'rgba(34,197,94,.08)', title: 'File de revision vide', body: 'Toutes vos revisions sont a jour. Excellent rythme, revenez demain.', priority: 'low' });
    }
    if (mp >= 70) {
      insights.push({ icon: 'workspace_premium', color: '#a78bfa', bg: 'rgba(167,139,250,.08)', title: `${mp}% de maitrise`, body: `${s.mastered} cartes maitrisees sur ${s.totalFlashcards}. Vous approchez de la maitrise complete.`, priority: 'low' });
    } else if (s.new > 0 && s.new > s.mastered) {
      insights.push({ icon: 'school', color: '#5b8def', bg: 'rgba(91,141,239,.08)', title: `${s.new} carte(s) non commencee(s)`, body: 'Integrez 10 nouvelles cartes par jour pour progresser regulierement.', priority: 'medium' });
    } else {
      insights.push({ icon: 'auto_awesome', color: '#a78bfa', bg: 'rgba(167,139,250,.08)', title: `Score de sante : ${health}/100`, body: `Score composite : ${health}/100. ${health >= 70 ? 'Tres bonne performance !' : 'Progressez chaque jour pour l ameliorer.'}`, priority: health >= 70 ? 'low' : 'medium' });
    }
    return insights;
  });

  ngOnInit(): void {
    this.studyHubService.refreshPacks();
    const poll = setInterval(() => {
      if (!this.studyHubService.isLoading()) { clearInterval(poll); this.isLoading.set(false); }
    }, 50);
    setTimeout(() => { clearInterval(poll); this.isLoading.set(false); }, 5000);
  }

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
    return 'A ameliorer';
  }

  getMasteryClass(rate: number | null): string {
    if (rate === null) return 'badge-gray';
    if (rate >= 90)   return 'badge-emerald';
    if (rate >= 75)   return 'badge-blue';
    if (rate >= 50)   return 'badge-amber';
    return 'badge-rose';
  }
}
