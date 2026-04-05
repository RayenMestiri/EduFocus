import { Component, OnInit, OnDestroy, signal, computed, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NoteService } from '../../services/note.service';
import { SubjectService } from '../../services/subject.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { Note, NoteCategory, NoteFilter, Subject } from '../../models';
import Swal from 'sweetalert2';

interface CategoryItem {
  id: string;
  label: string;
  matIcon: string;
}

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.css'
})
export class NotesComponent implements OnInit, OnDestroy {
  // ── Data ──
  notes = signal<Note[]>([]);        // current filtered view
  allNotes = signal<Note[]>([]);     // always ALL notes (for accurate counts)
  subjects = signal<Subject[]>([]);
  allTags = signal<string[]>([]);
  loading = signal(true);

  // ── Filters ──
  activeCategory = signal<string>('all');
  activeSubjectFilter = signal<string>('');
  searchQuery = signal('');
  showArchived = signal(false);

  // ── Sidebar ──
  sidebarOpen = signal(true);

  // ── Editor modal ──
  showEditor = signal(false);
  editingNote = signal<Note | null>(null);
  editorTitle = signal('');
  editorCategory = signal<NoteCategory>('other');
  editorColor = signal('#6366f1');
  editorSubject = signal<string>('');
  editorTags = signal<string[]>([]);
  editorTagInput = signal('');
  editorHasPassword = signal(false);
  editorPassword = signal('');
  editorIsPinned = signal(false);

  // ── Password verification modal ──
  showPasswordModal = signal(false);
  passwordInput = signal('');
  pendingPasswordNote = signal<Note | null>(null);
  passwordError = signal('');

  // ── Color picker ──
  showColorPicker = signal(false);
  colorPickerNoteId = signal<string>('');

  // ── Subject picker ──
  showSubjectPicker = signal(false);

  // ── Category picker ──
  showCategoryPicker = signal(false);

  // Category accent colors
  categoryColors: Record<string, string> = {
    lecture:    '#6366f1',
    summary:    '#8b5cf6',
    formula:    '#ec4899',
    vocabulary: '#14b8a6',
    exercise:   '#f97316',
    mindmap:    '#06b6d4',
    question:   '#eab308',
    other:      '#64748b',
  };

  // ── Format tracking ──
  activeFormats = signal<Set<string>>(new Set());

  // ── Editor element ──
  @ViewChild('noteEditor') noteEditorRef!: ElementRef<HTMLDivElement>;
  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('pwdInput') pwdInputRef?: ElementRef<HTMLInputElement>;

  private selectionChangeHandler: (() => void) | null = null;

  // ── Categories ──
  categories: CategoryItem[] = [
    { id: 'all', label: 'Toutes', matIcon: 'folder_open' },
    { id: 'lecture', label: 'Cours', matIcon: 'auto_stories' },
    { id: 'summary', label: 'Résumés', matIcon: 'summarize' },
    { id: 'formula', label: 'Formules', matIcon: 'functions' },
    { id: 'vocabulary', label: 'Vocabulaire', matIcon: 'translate' },
    { id: 'exercise', label: 'Exercices', matIcon: 'edit_note' },
    { id: 'mindmap', label: 'Mind Maps', matIcon: 'hub' },
    { id: 'question', label: 'Questions', matIcon: 'help_outline' },
    { id: 'other', label: 'Autre', matIcon: 'sticky_note_2' }
  ];

  // ── Colors ──
  noteColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
    '#64748b', '#1e1e1e'
  ];

  // ── Computed ──
  filteredNotes = computed(() => {
    let result = this.notes();
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.contentText.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  });

  pinnedNotes = computed(() => this.filteredNotes().filter(n => n.isPinned));
  unpinnedNotes = computed(() => this.filteredNotes().filter(n => !n.isPinned));

  // ── Subject object for editor ──
  editorSubjectObj = computed(() =>
    this.subjects().find(s => s._id === this.editorSubject()) ?? null
  );

  // counts always based on allNotes — never affected by active filter
  noteCounts = computed(() => {
    const all = this.allNotes();
    const counts: Record<string, number> = { all: all.length };
    this.categories.forEach(c => {
      if (c.id !== 'all') counts[c.id] = all.filter(n => n.category === c.id).length;
    });
    return counts;
  });

  constructor(
    private noteService: NoteService,
    private subjectService: SubjectService,
    private authService: AuthService,
    public themeService: ThemeService,
    private router: Router,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.loadNotes();
    this.loadAllNotes();
    this.loadSubjects();
    this.loadTags();
    this.setupSelectionListener();
  }

  ngOnDestroy() {
    if (this.selectionChangeHandler) {
      document.removeEventListener('selectionchange', this.selectionChangeHandler);
    }
  }

  // ── Data Loading ──
  loadNotes() {
    this.loading.set(true);
    const filters: NoteFilter = {};
    if (this.activeCategory() !== 'all') filters.category = this.activeCategory();
    if (this.activeSubjectFilter()) filters.subject = this.activeSubjectFilter();
    if (this.showArchived()) filters.isArchived = 'true';
    else filters.isArchived = 'false';

    this.noteService.getNotes(filters).subscribe({
      next: (res) => {
        this.notes.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // Load ALL notes (no category/subject filter) — only for accurate sidebar counts
  loadAllNotes() {
    const filters: NoteFilter = {};
    if (this.showArchived()) filters.isArchived = 'true';
    else filters.isArchived = 'false';
    this.noteService.getNotes(filters).subscribe({
      next: (res) => this.allNotes.set(res.data || [])
    });
  }

  loadSubjects() {
    this.subjectService.getSubjects().subscribe({
      next: (res: any) => this.subjects.set(res.data || [])
    });
  }

  loadTags() {
    this.noteService.getTags().subscribe({
      next: (res) => this.allTags.set(res.data || [])
    });
  }

  // ── Filter Actions ──
  setCategory(id: string) {
    this.activeCategory.set(id);
    this.loadNotes();
  }

  setSubjectFilter(id?: string) {
    const target = id || '';
    this.activeSubjectFilter.set(target === this.activeSubjectFilter() ? '' : target);
    this.loadNotes();
  }

  toggleArchived() {
    this.showArchived.set(!this.showArchived());
    this.loadNotes();
    this.loadAllNotes();
  }

  onSearchChange(value: string) {
    const activeElement = document.activeElement;
    if (activeElement !== this.searchInputRef?.nativeElement) return;
    if (this.showPasswordModal()) return;
    this.searchQuery.set(value);
  }

  toggleSidebar() {
    this.sidebarOpen.set(!this.sidebarOpen());
  }

  // ── Editor ──
  openNewNote() {
    this.editingNote.set(null);
    this.editorTitle.set('');
    this.editorCategory.set('other');
    this.editorColor.set('#6366f1');
    this.editorSubject.set('');
    this.editorTags.set([]);
    this.editorTagInput.set('');
    this.editorHasPassword.set(false);
    this.editorPassword.set('');
    this.editorIsPinned.set(false);
    this.showSubjectPicker.set(false);
    this.showCategoryPicker.set(false);
    this.showEditor.set(true);
    setTimeout(() => {
      if (this.noteEditorRef?.nativeElement) {
        this.noteEditorRef.nativeElement.innerHTML = '';
        this.noteEditorRef.nativeElement.focus();
      }
    }, 100);
  }

  openEditNote(note: Note) {
    if (note.hasPassword) {
      this.pendingPasswordNote.set(note);
      this.passwordInput.set('');
      this.passwordError.set('');
      this.showPasswordModal.set(true);
      setTimeout(() => this.pwdInputRef?.nativeElement.focus(), 60);
      return;
    }
    this.loadNoteIntoEditor(note);
  }

  loadNoteIntoEditor(note: Note) {
    this.editingNote.set(note);
    this.editorTitle.set(note.title);
    this.editorCategory.set(note.category);
    this.editorColor.set(note.color);
    this.editorSubject.set(note.subject?._id || '');
    this.editorTags.set([...note.tags]);
    this.editorTagInput.set('');
    this.editorHasPassword.set(note.hasPassword);
    this.editorPassword.set('');
    this.editorIsPinned.set(note.isPinned);
    this.showSubjectPicker.set(false);
    this.showCategoryPicker.set(false);
    this.showEditor.set(true);
    setTimeout(() => {
      if (this.noteEditorRef?.nativeElement) {
        this.noteEditorRef.nativeElement.innerHTML = note.content || '';
        this.noteEditorRef.nativeElement.focus();
      }
    }, 100);
  }

  closeEditor() {
    this.showEditor.set(false);
    this.editingNote.set(null);
    this.showSubjectPicker.set(false);
    this.showCategoryPicker.set(false);
  }

  toggleSubjectPicker() {
    this.showCategoryPicker.set(false);
    this.showSubjectPicker.update(v => !v);
  }

  selectSubject(id: string) {
    this.editorSubject.set(id);
    this.showSubjectPicker.set(false);
  }

  toggleCategoryPicker() {
    this.showSubjectPicker.set(false);
    this.showCategoryPicker.update(v => !v);
  }

  selectCategory(id: string) {
    this.editorCategory.set(id as any);
    this.showCategoryPicker.set(false);
  }

  getCategoryColor(id: string): string {
    return this.categoryColors[id] || '#64748b';
  }

  saveNote() {
    const el = this.noteEditorRef?.nativeElement;
    const content = el ? el.innerHTML : '';
    const contentText = el ? (el.innerText || el.textContent || '') : '';
    const normalizedTitle = this.editorTitle().trim() || 'Sans titre';

    const payload: any = {
      title: normalizedTitle,
      content,
      contentText,
      color: this.editorColor(),
      category: this.editorCategory(),
      subject: this.editorSubject() || null,
      tags: this.editorTags(),
      isPinned: this.editorIsPinned(),
      hasPassword: this.editorHasPassword()
    };

    if (this.editorHasPassword() && this.editorPassword()) {
      payload.password = this.editorPassword();
    }
    if (!this.editorHasPassword()) {
      payload.hasPassword = false;
    }

    const editing = this.editingNote();
    if (editing) {
      this.noteService.updateNote(editing._id, payload).subscribe({
        next: (res) => {
          if (res.data) {
            this.notes.update(notes => notes.map(n => n._id === editing._id ? res.data! : n));
          }
          this.closeEditor();
          this.loadAllNotes();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Erreur de sauvegarde',
            text: err?.error?.message || err?.error?.error || 'Impossible de mettre à jour la note.'
          });
        }
      });
    } else {
      this.noteService.createNote(payload).subscribe({
        next: (res) => {
          if (res.data) {
            this.notes.update(notes => [res.data!, ...notes]);
          }
          this.closeEditor();
          this.loadTags();
          this.loadAllNotes();
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Erreur de création',
            text: err?.error?.message || err?.error?.error || 'Impossible de créer la note.'
          });
        }
      });
    }
  }

  // ── Password ──
  verifyPassword() {
    const note = this.pendingPasswordNote();
    if (!note) return;
    this.noteService.verifyPassword(note._id, this.passwordInput()).subscribe({
      next: (res) => {
        if (res.success) {
          this.showPasswordModal.set(false);
          this.loadNoteIntoEditor(note);
        }
      },
      error: () => {
        this.passwordError.set('Mot de passe incorrect');
      }
    });
  }

  closePasswordModal() {
    this.showPasswordModal.set(false);
    this.pendingPasswordNote.set(null);
    this.passwordInput.set('');
    this.passwordError.set('');
  }

  // ── CRUD Actions ──
  togglePin(note: Note, event: Event) {
    event.stopPropagation();
    this.noteService.togglePin(note._id).subscribe({
      next: (res) => {
        if (res.data) this.notes.update(notes => notes.map(n => n._id === note._id ? res.data! : n));
      }
    });
  }

  toggleArchive(note: Note, event: Event) {
    event.stopPropagation();
    this.noteService.toggleArchive(note._id).subscribe({
      next: () => { this.loadNotes(); this.loadAllNotes(); }
    });
  }

  deleteNote(note: Note, event: Event) {
    event.stopPropagation();
    Swal.fire({
      title: 'Supprimer cette note ?',
      text: 'Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: this.themeService.isDark() ? '#eab308' : '#6366f1',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      background: this.themeService.isDark() ? '#111' : '#fff',
      color: this.themeService.isDark() ? '#fff' : '#1e293b'
    }).then((result) => {
      if (result.isConfirmed) {
        this.noteService.deleteNote(note._id).subscribe({
          next: () => {
            this.notes.update(notes => notes.filter(n => n._id !== note._id));            this.loadAllNotes();          }
        });
      }
    });
  }

  openColorPicker(noteId: string, event: Event) {
    event.stopPropagation();
    this.colorPickerNoteId.set(noteId);
    this.showColorPicker.set(true);
  }

  pickColor(color: string) {
    const id = this.colorPickerNoteId();
    if (id) {
      this.noteService.changeColor(id, color).subscribe({
        next: (res) => {
          if (res.data) this.notes.update(notes => notes.map(n => n._id === id ? res.data! : n));
        }
      });
    }
    this.showColorPicker.set(false);
  }

  // ── Tags ──
  addTag() {
    const tag = this.editorTagInput().trim();
    if (tag && !this.editorTags().includes(tag)) {
      this.editorTags.update(tags => [...tags, tag]);
    }
    this.editorTagInput.set('');
  }

  removeTag(tag: string) {
    this.editorTags.update(tags => tags.filter(t => t !== tag));
  }

  onTagKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
    }
  }

  // ── Rich Text Formatting ──
  execCommand(command: string, value?: string) {
    document.execCommand(command, false, value || '');
    this.refreshActiveFormats();
  }

  formatBlock(tag: string) {
    document.execCommand('formatBlock', false, tag);
    this.refreshActiveFormats();
  }

  isFormatActive(command: string): boolean {
    return this.activeFormats().has(command);
  }

  refreshActiveFormats() {
    const formats = new Set<string>();
    const commands = ['bold', 'italic', 'underline', 'strikeThrough', 'insertUnorderedList', 'insertOrderedList', 'justifyLeft', 'justifyCenter', 'justifyRight'];
    commands.forEach(cmd => {
      try {
        if (document.queryCommandState(cmd)) formats.add(cmd);
      } catch (_) {}
    });
    // Check block formats
    try {
      const val = document.queryCommandValue('formatBlock');
      if (val) formats.add('formatBlock:' + val.toLowerCase());
    } catch (_) {}
    this.activeFormats.set(formats);
  }

  private setupSelectionListener() {
    this.selectionChangeHandler = () => {
      this.ngZone.run(() => this.refreshActiveFormats());
    };
    document.addEventListener('selectionchange', this.selectionChangeHandler);
  }

  // ── Navigation ──
  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  goToPlanner() {
    this.router.navigate(['/planner']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ── Helpers ──
  getCategoryIcon(cat: string): string {
    return this.categories.find(c => c.id === cat)?.matIcon || 'sticky_note_2';
  }

  getCategoryLabel(cat: string): string {
    return this.categories.find(c => c.id === cat)?.label || 'Autre';
  }

  getTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `Il y a ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `Il y a ${diffD}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  trackByNoteId(_: number, note: Note): string {
    return note._id;
  }

  preventBlur(event: MouseEvent) {
    event.preventDefault();
  }
}
