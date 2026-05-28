import { Component, inject, signal, computed, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { StudyHubService } from '../../../../services/study-hub.service';
import { ThemeService } from '../../../../services/theme.service';
import { StudyPack, Flashcard } from '../../../../models/study-hub.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-flashcards-study-mode',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './flashcards-study-mode.component.html',
  styleUrls: ['./flashcards-study-mode.component.css']
})
export class FlashcardsStudyModeComponent implements OnInit {
  studyHubService = inject(StudyHubService);
  themeService = inject(ThemeService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  pack: StudyPack | undefined;
  currentIndex = signal(0);
  isFlipped = signal(false);
  isFinished = signal(false);

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
      confirmButtonText: 'Voir le récapitulatif',
      confirmButtonColor: '#a855f7',
      customClass: {
        popup: 'study-hub-swal-modal font-sans'
      }
    });
  }

  masteredCount = computed(() => {
    return this.pack?.flashcards?.filter(c => c.difficulty === 'easy').length || 0;
  });

  mediumCount = computed(() => {
    return this.pack?.flashcards?.filter(c => c.difficulty === 'medium').length || 0;
  });

  reviewCount = computed(() => {
    return this.pack?.flashcards?.filter(c => c.difficulty === 'hard').length || 0;
  });
  
  spacedRepetitionHint = computed(() => {
    const hard = this.reviewCount();
    const medium = this.mediumCount();
    const newCards = this.pack?.flashcards?.filter(c => !c.difficulty).length || 0;
    
    if (hard > 0) {
      return `${hard} carte${hard > 1 ? 's' : ''} difficile${hard > 1 ? 's' : ''} à réviser d'urgence 🚨`;
    } else if (medium > 0) {
      return `${medium} carte${medium > 1 ? 's' : ''} moyenne${medium > 1 ? 's' : ''} à consolider ⚡`;
    } else if (newCards > 0) {
      return `${newCards} nouvelle${newCards > 1 ? 's' : ''} carte${newCards > 1 ? 's' : ''} à découvrir 🆕`;
    } else {
      return 'Toutes les cartes sont parfaitement maîtrisées ! Excellent travail ! 🎉';
    }
  });

  ngOnInit() {
    const packId = this.route.snapshot.paramMap.get('packId');
    if (packId) {
      this.pack = this.studyHubService.getPackById(packId);
      if (!this.pack || !this.pack.flashcards || this.pack.flashcards.length === 0) {
        // No flashcards, go back
        this.router.navigate(['/study-hub', packId]);
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    if (this.isFinished()) {
      if (event.key === 'r' || event.key === 'R') {
        this.restart();
      }
      return;
    }

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.flipCard();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.skipCard();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prevCard();
    } else if (this.isFlipped()) {
      if (event.key === '1') {
        this.markDifficulty('hard');
      } else if (event.key === '2') {
        this.markDifficulty('medium');
      } else if (event.key === '3') {
        this.markDifficulty('easy');
      }
    }
  }

  get currentCard(): Flashcard | undefined {
    return this.pack?.flashcards?.[this.currentIndex()];
  }

  get progressPercentage(): number {
    if (!this.pack?.flashcards?.length) return 0;
    return Math.round((this.currentIndex() / this.pack.flashcards.length) * 100);
  }

  flipCard() {
    this.isFlipped.update(v => !v);
  }

  markDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
    if (!this.pack || !this.currentCard) return;
    
    const updatedCards = [...this.pack.flashcards];
    updatedCards[this.currentIndex()] = {
      ...this.currentCard,
      difficulty,
      lastReviewed: new Date()
    };
    
    this.studyHubService.updatePack(this.pack.id, { flashcards: updatedCards });

    this.nextCard();
  }

  nextCard() {
    if (!this.pack?.flashcards) return;
    
    if (this.currentIndex() < this.pack.flashcards.length - 1) {
      this.isFlipped.set(false);
      setTimeout(() => {
        this.currentIndex.update(i => i + 1);
      }, 150); // slight delay to allow flip back animation
    } else {
      this.isFinished.set(true);
      this.showCelebration(
        'Excellent travail ! 📑',
        `Vous avez révisé avec succès l'intégralité des ${this.pack.flashcards.length} flashcards de ce pack !`,
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
    this.currentIndex.set(0);
    this.isFlipped.set(false);
    this.isFinished.set(false);
  }
}
