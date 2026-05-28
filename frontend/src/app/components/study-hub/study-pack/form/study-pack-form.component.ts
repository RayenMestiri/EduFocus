import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudyHubService } from '../../../../services/study-hub.service';
import { SubjectService } from '../../../../services/subject.service';
import { ThemeService } from '../../../../services/theme.service';
import { StudyPack } from '../../../../models/study-hub.model';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../../shared/language-switcher/language-switcher.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-study-pack-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './study-pack-form.component.html',
})
export class StudyPackFormComponent implements OnInit {
  studyHubService = inject(StudyHubService);
  subjectService = inject(SubjectService);
  themeService = inject(ThemeService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  isEditing = false;
  packId = '';

  form: Omit<StudyPack, 'id' | 'createdAt' | 'updatedAt'> = {
    title: '',
    subject: '',
    description: '',
    notes: [],
    flashcards: [],
    qcm: []
  };

  subjects: any[] = [];

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

  ngOnInit() {
    this.subjectService.getSubjects().subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          this.subjects = res.data;
        } else {
          this.subjects = [
            { name: 'Général' },
            { name: 'Mathématiques' },
            { name: 'Informatique' },
            { name: 'Langues' },
            { name: 'Sciences' }
          ];
        }
        if (this.subjects.length > 0) {
          this.form.subject = this.subjects[0].name;
        }
      },
      error: (err) => {
        console.error('Error loading subjects, using default ones', err);
        this.subjects = [
          { name: 'Général' },
          { name: 'Mathématiques' },
          { name: 'Informatique' },
          { name: 'Langues' },
          { name: 'Sciences' }
        ];
        if (this.subjects.length > 0) {
          this.form.subject = this.subjects[0].name;
        }
      }
    });

    // Check if editing
    this.packId = this.route.snapshot.paramMap.get('id') || '';
    if (this.packId && this.packId !== 'new') {
      this.isEditing = true;
      const pack = this.studyHubService.getPackById(this.packId);
      if (pack) {
        this.form = {
          title: pack.title,
          subject: pack.subject,
          description: pack.description || '',
          notes: pack.notes || [],
          flashcards: pack.flashcards || [],
          qcm: pack.qcm || []
        };
      } else {
        this.router.navigate(['/study-hub']);
      }
    }
  }

  save() {
    if (!this.form.title.trim() || !this.form.subject.trim()) return;

    if (this.isEditing) {
      this.studyHubService.updatePack(this.packId, this.form, () => {
        this.showToast('Pack d\'étude mis à jour !', 'success');
        this.router.navigate(['/study-hub']);
      });
    } else {
      this.studyHubService.addPack(this.form, () => {
        this.showToast('Pack d\'étude créé !', 'success');
        this.router.navigate(['/study-hub']);
      });
    }
  }
}
