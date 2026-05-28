import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudyHubService } from '../../../../services/study-hub.service';
import { SubjectService } from '../../../../services/subject.service';
import { ThemeService } from '../../../../services/theme.service';
import { StudyPack } from '../../../../models/study-hub.model';

@Component({
  selector: 'app-study-pack-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './study-pack-form.component.html',
})
export class StudyPackFormComponent {
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
        this.router.navigate(['/study-hub']);
      });
    } else {
      this.studyHubService.addPack(this.form, () => {
        this.router.navigate(['/study-hub']);
      });
    }
  }
}
