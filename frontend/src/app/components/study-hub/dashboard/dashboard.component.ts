import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudyHubService } from '../../../services/study-hub.service';
import { ThemeService } from '../../../services/theme.service';
import { FormsModule } from '@angular/forms';

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
      this.importError = 'Please paste your JSON data first.';
      return;
    }
    const success = this.studyHubService.importPacksFromJson(this.importJsonData);
    if (success) {
      this.closeImportModal();
    } else {
      this.importError = 'Invalid JSON format. Must be an array of Study Pack objects.';
    }
  }

  exportAll() {
    this.studyHubService.downloadJson();
  }
}
