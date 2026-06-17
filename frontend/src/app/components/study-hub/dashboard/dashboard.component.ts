import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OfflineStudyHubService } from '../../../services/offline/offline-studyhub.service';
import { ThemeService } from '../../../services/theme.service';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-study-hub-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class StudyHubDashboardComponent implements OnInit {
  studyHubService = inject(OfflineStudyHubService);
  themeService = inject(ThemeService);

  // Import modal state
  showImportModal = false;
  importJsonData = '';
  importError = '';

  // ── Selection mode ──────────────────────────────────────────────────────────
  isSelectionMode = signal(false);
  selectedPackIds = signal<Set<string>>(new Set());

  selectedCount = computed(() => this.selectedPackIds().size);
  allSelected = computed(() => {
    const packs = this.studyHubService.studyPacks();
    return packs.length > 0 && this.selectedPackIds().size === packs.length;
  });

  toggleSelectionMode() {
    this.isSelectionMode.update(v => !v);
    this.selectedPackIds.set(new Set()); // reset selection on toggle
  }

  exitSelectionMode() {
    this.isSelectionMode.set(false);
    this.selectedPackIds.set(new Set());
  }

  togglePackSelection(id: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.selectedPackIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  isPackSelected(id: string): boolean {
    return this.selectedPackIds().has(id);
  }

  selectAll() {
    const ids = this.studyHubService.studyPacks().map(p => p.id);
    this.selectedPackIds.set(new Set(ids));
  }

  deselectAll() {
    this.selectedPackIds.set(new Set());
  }

  async deleteSelectedPacks() {
    const count = this.selectedCount();
    if (count === 0) return;

    const isDark = this.themeService.isDark();
    const result = await Swal.fire({
      title: `Supprimer ${count} pack${count > 1 ? 's' : ''} ?`,
      text: 'Cette action est irréversible. Toutes les notes, flashcards et quiz seront perdus.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Supprimer (${count})`,
      cancelButtonText: 'Annuler',
      background: isDark ? '#111827' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: isDark ? '#4b5563' : '#9ca3af',
      reverseButtons: true,
      customClass: { popup: 'study-hub-swal-modal font-sans' }
    });

    if (!result.isConfirmed) return;

    const ids = Array.from(this.selectedPackIds());
    this.exitSelectionMode();
    this.studyHubService.bulkDeletePacks(ids, () => {
      this.showToast(`${ids.length} pack${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''} !`, 'success');
    });
  }

  // ── Toast / Alert helpers ───────────────────────────────────────────────────
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

  private showAlert(title: string, text: string, icon: 'success' | 'error' | 'info' = 'info') {
    const isDark = this.themeService.isDark();
    Swal.fire({
      title, text, icon,
      background: isDark ? '#111827' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827',
      confirmButtonColor: '#4f46e5',
      customClass: { popup: 'study-hub-swal-modal font-sans' }
    });
  }

  ngOnInit(): void {
    this.studyHubService.refreshPacks();
  }

  // ── Import / Export ─────────────────────────────────────────────────────────
  openImportModal() {
    this.importJsonData = '';
    this.importError = '';
    this.showImportModal = true;
  }

  closeImportModal() {
    this.showImportModal = false;
    this.importError = '';
  }

  confirmImport() {
    if (!this.importJsonData.trim()) {
      this.showAlert('Données vides', 'Veuillez coller vos données JSON d\'abord.', 'error');
      return;
    }
    const success = this.studyHubService.importPacksFromJson(this.importJsonData);
    if (success) {
      this.closeImportModal();
      this.showToast('Packs d\'étude importés avec succès !', 'success');
    } else {
      this.showAlert('Format de JSON Invalide', 'Le format JSON est incorrect. Il doit s\'agir d\'un tableau d\'objets Study Pack.', 'error');
    }
  }

  exportAll() {
    this.studyHubService.downloadJson();
    this.showToast('Exportation réussie !', 'success');
  }
}
