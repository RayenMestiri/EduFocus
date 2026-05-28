import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudyHubService } from '../../../services/study-hub.service';
import { ThemeService } from '../../../services/theme.service';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-study-hub-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class StudyHubDashboardComponent implements OnInit {
  studyHubService = inject(StudyHubService);
  themeService = inject(ThemeService);

  // Use plain string, NOT a Signal — ngModel two-way binding doesn't work with Signals
  showImportModal = false;
  importJsonData = '';
  importError = '';

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

  private showAlert(title: string, text: string, icon: 'success' | 'error' | 'info' = 'info') {
    const isDark = this.themeService.isDark();
    Swal.fire({
      title,
      text,
      icon,
      background: isDark ? '#111827' : '#ffffff',
      color: isDark ? '#f9fafb' : '#111827',
      confirmButtonColor: '#4f46e5',
      customClass: {
        popup: 'study-hub-swal-modal font-sans'
      }
    });
  }

  ngOnInit(): void {
    this.studyHubService.refreshPacks();
  }

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
