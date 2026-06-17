import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OfflineStudyHubService } from '../../../../services/offline/offline-studyhub.service';
import { AuthService } from '../../../../services/auth.service';
import { ThemeService } from '../../../../services/theme.service';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-study-pack-share',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex flex-col items-center justify-between">
      
      <!-- Top Navigation Header -->
      <header class="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm transition-all duration-300">
        <div class="max-w-[1800px] w-[98%] lg:w-[94%] mx-auto px-4 py-3 flex items-center justify-between">
          
          <!-- Logo -->
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
              <span class="material-icons text-white text-lg">school</span>
            </div>
            <div>
              <span class="font-extrabold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">EduFocus</span>
              <span class="ml-2 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Study Hub</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <a *ngIf="authService.isAuthenticated()" routerLink="/study-hub" class="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200/50 dark:border-gray-700 text-xs font-semibold flex items-center gap-1.5 transition-all">
              <span class="material-icons text-sm">grid_view</span>
              <span>Bibliothèque</span>
            </a>
            
            <a *ngIf="!authService.isAuthenticated()" routerLink="/login" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-semibold flex items-center gap-1.5 transition-all">
              <span class="material-icons text-sm">login</span>
              <span>Connexion</span>
            </a>

            <span class="h-5 w-[1px] bg-gray-200 dark:bg-gray-700 mx-1"></span>
            <app-language-switcher></app-language-switcher>

            <button 
              (click)="themeService.toggleTheme()"
              class="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200/50 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm"
            >
              <span class="material-icons text-sm">{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</span>
            </button>
          </div>

        </div>
      </header>

      <!-- Main Landing Content -->
      <main class="w-full max-w-2xl px-6 py-12 flex-1 flex flex-col justify-center">
        
        <!-- Loading State -->
        <div *ngIf="loading()" class="text-center space-y-4">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
          <p class="text-gray-500 dark:text-gray-400 font-semibold text-sm">Chargement du pack partagé...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="error()" class="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 text-center space-y-6 animate__animated animate__fadeIn">
          <div class="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <span class="material-icons text-3xl">error_outline</span>
          </div>
          <div class="space-y-2">
            <h2 class="text-2xl font-black text-gray-900 dark:text-white">Pack introuvable</h2>
            <p class="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">Ce pack d'étude n'existe pas ou l'auteur a décidé de désactiver le partage public.</p>
          </div>
          <a routerLink="/" class="inline-flex px-6 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white font-bold rounded-xl text-sm transition-all shadow-md">
            Retour à l'accueil
          </a>
        </div>

        <!-- Preview Pack State -->
        <div *ngIf="!loading() && !error() && pack() as p" class="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden animate__animated animate__fadeIn">
          
          <!-- Banner / Header -->
          <div class="px-8 py-10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-b border-gray-100 dark:border-gray-700 flex flex-col gap-3 relative">
            <div class="absolute top-6 right-6">
              <span class="inline-flex items-center rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                {{ p.subject }}
              </span>
            </div>

            <div class="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none mb-2">
              <span class="material-icons text-2xl">folder_shared</span>
            </div>

            <h2 class="text-2xl font-black text-gray-900 dark:text-white">{{ p.title }}</h2>
            <p class="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-md">{{ p.description || 'Aucune description fournie.' }}</p>
          </div>

          <!-- Pack Content details -->
          <div class="p-8 space-y-6">
            <h3 class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Ce pack contient :</h3>
            
            <div class="grid grid-cols-2 gap-4">
              
              <!-- Notes Count -->
              <div class="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                  <span class="material-icons text-xl">sticky_note_2</span>
                </div>
                <div>
                  <div class="text-lg font-black text-gray-900 dark:text-white">{{ p.notes?.length || 0 }}</div>
                  <div class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Fiches de cours</div>
                </div>
              </div>

              <!-- Flashcards Count -->
              <div class="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center gap-3">
                <div class="w-10 h-10 bg-purple-50 dark:bg-purple-950/40 text-purple-500 rounded-xl flex items-center justify-center shrink-0">
                  <span class="material-icons text-xl">style</span>
                </div>
                <div>
                  <div class="text-lg font-black text-gray-900 dark:text-white">{{ p.flashcards?.length || 0 }}</div>
                  <div class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Flashcards</div>
                </div>
              </div>

              <!-- QCM Count -->
              <div class="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center gap-3">
                <div class="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                  <span class="material-icons text-xl">quiz</span>
                </div>
                <div>
                  <div class="text-lg font-black text-gray-900 dark:text-white">{{ p.qcm?.length || 0 }}</div>
                  <div class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Questions QCM</div>
                </div>
              </div>

              <!-- Cheatsheets Count -->
              <div class="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-2xl flex items-center gap-3">
                <div class="w-10 h-10 bg-amber-50 dark:bg-amber-950/40 text-amber-500 rounded-xl flex items-center justify-center shrink-0">
                  <span class="material-icons text-xl">assignment</span>
                </div>
                <div>
                  <div class="text-lg font-black text-gray-900 dark:text-white">{{ p.cheatsheets?.length || 0 }}</div>
                  <div class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Mémos</div>
                </div>
              </div>

            </div>

            <!-- Import actions -->
            <div class="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
              <button 
                [disabled]="importing()"
                (click)="importPack()"
                class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-none transition-all disabled:opacity-50"
              >
                <span class="material-icons" *ngIf="!importing()">download</span>
                <span class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" *ngIf="importing()"></span>
                <span>{{ authService.isAuthenticated() ? 'Ajouter à ma bibliothèque' : 'Se connecter pour importer' }}</span>
              </button>
              
              <p class="text-center text-xs text-gray-400 dark:text-gray-500">
                Vous recevrez une copie de ce pack que vous pourrez personnaliser et étudier à votre rythme.
              </p>
            </div>

          </div>

        </div>

      </main>

      <!-- Footer -->
      <footer class="w-full py-6 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-200/30 dark:border-gray-800/30">
        EduFocus &copy; 2026 &mdash; Partagé avec amour par un membre de la communauté.
      </footer>

    </div>
  `,
  styles: []
})
export class StudyPackShareComponent implements OnInit {
  route = inject(ActivatedRoute);
  router = inject(Router);
  studyHubService = inject(OfflineStudyHubService);
  authService = inject(AuthService);
  themeService = inject(ThemeService);

  pack = signal<any | null>(null);
  loading = signal(true);
  error = signal(false);
  importing = signal(false);

  private showToast(title: string, icon: 'success' | 'info' | 'error' = 'success') {
    const isDark = this.themeService.isDark();
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      background: isDark ? '#111827' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827'
    });
    Toast.fire({
      icon,
      title
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.studyHubService.getPublicPackById(id).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res && res.success) {
            this.pack.set(res.data);
          } else {
            this.error.set(true);
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(true);
          console.error('Error fetching public pack:', err);
        }
      });
    } else {
      this.loading.set(false);
      this.error.set(true);
    }
  }

  importPack() {
    if (!this.authService.isAuthenticated()) {
      // Prompt log in
      Swal.fire({
        title: 'Connexion requise',
        text: 'Veuillez vous connecter pour importer ce pack dans votre bibliothèque d\'étude.',
        icon: 'info',
        background: this.themeService.isDark() ? '#111827' : '#ffffff',
        color: this.themeService.isDark() ? '#f9fafb' : '#111827',
        showCancelButton: true,
        confirmButtonText: 'Se connecter',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#4f46e5',
        customClass: {
          popup: 'study-hub-swal-modal font-sans'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          const packId = this.route.snapshot.paramMap.get('id');
          this.router.navigate(['/login'], { queryParams: { redirect: `/study-hub/share/${packId}` } });
        }
      });
      return;
    }

    const packId = this.pack()?.id || this.pack()?._id;
    if (!packId) return;

    this.importing.set(true);
    this.studyHubService.clonePack(packId).subscribe({
      next: (res) => {
        this.importing.set(false);
        if (res && res.success && res.data) {
          this.studyHubService.refreshPacks();
          Swal.fire({
            title: 'Pack importé ! 🎉',
            text: `Le pack "${res.data.title}" a été ajouté à votre bibliothèque. Bonne révision !`,
            icon: 'success',
            background: this.themeService.isDark() ? '#111827' : '#ffffff',
            color: this.themeService.isDark() ? '#f9fafb' : '#111827',
            confirmButtonText: 'Voir le pack',
            confirmButtonColor: '#10b981',
            customClass: {
              popup: 'study-hub-swal-modal font-sans'
            }
          }).then((result) => {
            const clonedId = res.data._id || res.data.id;
            this.router.navigate(['/study-hub', clonedId]);
          });
        } else {
          this.showToast('Une erreur est survenue lors de l\'import.', 'error');
        }
      },
      error: (err) => {
        this.importing.set(false);
        this.showToast('Erreur lors de l\'import.', 'error');
        console.error('Cloning pack failed:', err);
      }
    });
  }
}
