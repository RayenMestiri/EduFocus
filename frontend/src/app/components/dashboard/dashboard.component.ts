import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SubjectService } from '../../services/subject.service';
import { DayPlanService } from '../../services/day-plan.service';
import { TodoService } from '../../services/todo.service';
import { Subject, DayPlan, Todo } from '../../models';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  // Signals
  subjects = signal<Subject[]>([]);
  dayPlan = signal<DayPlan | null>(null);
  todos = signal<Todo[]>([]);
  
  // Timer state
  initialTimerMinutes = signal<number>(25); // User can adjust this
  timerMinutes = signal<number>(25);
  timerSeconds = signal<number>(0);
  isTimerRunning = signal<boolean>(false);
  selectedSubjectForTimer = signal<Subject | null>(null);
  private timerInterval: any = null;
  
  // UI state
  showSubjectModal = signal<boolean>(false);
  showTodoModal = signal<boolean>(false);
  showPlanModal = signal<boolean>(false);
  showStatsModal = signal<boolean>(false);
  editingSubject = signal<Subject | null>(null);
  editingTodo = signal<Todo | null>(null);
  studyStreak = signal<number>(0);
  weekStats = signal<any[]>([]);
  
  // Forms
  subjectForm = {
    name: '',
    color: '#ffd700',
    icon: '📚'
  };
  
  todoForm = {
    title: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    subjectId: ''
  };

  planForm: { [key: string]: number } = {};
  
  // Date
  today = new Date().toISOString().split('T')[0];
  
  // Computed values
  totalGoalMinutes = computed(() => {
    const plan = this.dayPlan();
    return plan?.totalGoalMinutes || 0;
  });
  
  totalStudiedMinutes = computed(() => {
    const plan = this.dayPlan();
    return plan?.totalStudiedMinutes || 0;
  });
  
  progressPercentage = computed(() => {
    const goal = this.totalGoalMinutes();
    const studied = this.totalStudiedMinutes();
    return goal > 0 ? Math.round((studied / goal) * 100) : 0;
  });
  
  completedTodos = computed(() => {
    return this.todos().filter(t => t.done).length;
  });
  
  totalTodos = computed(() => {
    return this.todos().length;
  });

  icons = ['📚', '🧮', '⚗️', '💻', '🌍', '📖', '✏️', '🎨', '🎵', '⚽', '🔬', '📐'];
  colors = ['#ffd700', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

  constructor(
    private authService: AuthService,
    private subjectService: SubjectService,
    private dayPlanService: DayPlanService,
    private todoService: TodoService,
    private router: Router
  ) {}

  currentUser = computed(() => this.authService.currentUser());

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loadSubjects();
    this.loadDayPlan();
    this.loadTodos();
    this.loadWeekStats();
    this.calculateStreak();
  }

  loadWeekStats() {
    // Get last 7 days statistics
    const stats: { date: string; day: string; minutes: number; }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      this.dayPlanService.getDayPlan(dateStr).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const totalStudied = res.data.subjects.reduce((sum, s) => sum + s.studiedMinutes, 0);
            stats.push({
              date: dateStr,
              day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
              minutes: totalStudied
            });
            this.weekStats.set([...stats].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
          }
        }
      });
    }
  }

  calculateStreak() {
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      this.dayPlanService.getDayPlan(dateStr).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const totalStudied = res.data.subjects.reduce((sum, s) => sum + s.studiedMinutes, 0);
            if (totalStudied > 0) {
              streak++;
            } else {
              this.studyStreak.set(streak);
            }
          }
        }
      });
    }
  }

  loadSubjects() {
    this.subjectService.getSubjects().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.subjects.set(res.data);
        }
      },
      error: (err) => console.error('Error loading subjects:', err)
    });
  }

  loadDayPlan() {
    this.dayPlanService.getDayPlan(this.today).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.dayPlan.set(res.data);
        }
      },
      error: (err) => console.error('Error loading day plan:', err)
    });
  }

  loadTodos() {
    this.todoService.getTodos(this.today).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.todos.set(res.data);
        }
      },
      error: (err) => console.error('Error loading todos:', err)
    });
  }

  // Subject Management
  openSubjectModal(subject?: Subject) {
    if (subject) {
      this.editingSubject.set(subject);
      this.subjectForm = {
        name: subject.name,
        color: subject.color,
        icon: subject.icon
      };
    } else {
      this.editingSubject.set(null);
      this.subjectForm = { name: '', color: '#ffd700', icon: '📚' };
    }
    this.showSubjectModal.set(true);
  }

  saveSubject() {
    if (!this.subjectForm.name.trim()) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Le nom est requis', background: '#1a1a1a', color: '#ffd700', confirmButtonColor: '#ffd700' });
      return;
    }

    const subject = this.subjectForm;
    const request = this.editingSubject()
      ? this.subjectService.updateSubject(this.editingSubject()!._id!, subject)
      : this.subjectService.createSubject(subject);

    request.subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Succès', text: 'Matière enregistrée', background: '#1a1a1a', color: '#ffd700', confirmButtonColor: '#ffd700', timer: 1500, showConfirmButton: false });
        this.showSubjectModal.set(false);
        this.loadSubjects();
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Erreur', text: err.error?.message || 'Erreur', background: '#1a1a1a', color: '#ffd700', confirmButtonColor: '#ffd700' });
      }
    });
  }

  openPlanModal() {
    // Initialize planForm with current day plan
    this.planForm = {};
    const plan = this.dayPlan();
    if (plan) {
      plan.subjects.forEach(s => {
        const subjectId = typeof s.subjectId === 'string' ? s.subjectId : s.subjectId._id;
        if (subjectId) {
          this.planForm[subjectId] = s.goalMinutes;
        }
      });
    }
    // Add all subjects with 0 if not in plan
    this.subjects().forEach(s => {
      if (s._id && !this.planForm[s._id]) {
        this.planForm[s._id] = 0;
      }
    });
    this.showPlanModal.set(true);
  }

  saveDayPlan() {
    const existingPlan = this.dayPlan();
    const subjects = Object.keys(this.planForm)
      .filter(subjectId => this.planForm[subjectId] > 0)
      .map(subjectId => {
        // Find existing studied minutes for this subject
        let studiedMinutes = 0;
        if (existingPlan) {
          const existingSubject = existingPlan.subjects.find(s => {
            const sid = typeof s.subjectId === 'string' ? s.subjectId : s.subjectId._id;
            return sid === subjectId;
          });
          studiedMinutes = existingSubject?.studiedMinutes || 0;
        }
        
        return {
          subjectId,
          goalMinutes: this.planForm[subjectId],
          studiedMinutes, // Preserve existing studied minutes
          sessions: [],
          priority: 'medium' as const
        };
      });

    if (subjects.length === 0) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Ajoutez au moins une matière', background: '#1a1a1a', color: '#ffd700', confirmButtonColor: '#ffd700' });
      return;
    }

    this.dayPlanService.saveDayPlan({ date: this.today, subjects }).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Plan enregistré', timer: 1500, showConfirmButton: false, background: '#1a1a1a', color: '#ffd700' });
        this.showPlanModal.set(false);
        this.loadDayPlan();
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Erreur', text: err.error?.message, background: '#1a1a1a', color: '#ffd700', confirmButtonColor: '#ffd700' });
      }
    });
  }

  deleteSubject(subject: Subject) {
    Swal.fire({
      title: 'Supprimer?',
      text: `Supprimer "${subject.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
      background: '#1a1a1a',
      color: '#ffd700'
    }).then((result) => {
      if (result.isConfirmed) {
        this.subjectService.deleteSubject(subject._id!).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Supprimé', timer: 1500, showConfirmButton: false, background: '#1a1a1a', color: '#ffd700' });
            this.loadSubjects();
          },
          error: (err) => {
            Swal.fire({ icon: 'error', title: 'Erreur', text: err.error?.message, background: '#1a1a1a', color: '#ffd700', confirmButtonColor: '#ffd700' });
          }
        });
      }
    });
  }

  // Timer
  adjustTimer(amount: number) {
    if (this.isTimerRunning()) return; // Don't adjust while running
    const currentValue = this.initialTimerMinutes();
    const newValue = currentValue + amount;
    console.log(`Adjusting timer: ${currentValue} + ${amount} = ${newValue}`);
    if (newValue >= 1 && newValue <= 60) {
      this.initialTimerMinutes.set(newValue);
      this.timerMinutes.set(newValue);
      console.log(`Timer updated to ${newValue} minutes`);
    } else {
      console.log(`Invalid timer value: ${newValue} (must be between 1 and 60)`);
    }
  }

  startTimer(subject: Subject) {
    this.selectedSubjectForTimer.set(subject);
    const initialMinutes = this.initialTimerMinutes();
    this.timerMinutes.set(initialMinutes);
    this.timerSeconds.set(0);
    this.isTimerRunning.set(true);
    
    this.timerInterval = setInterval(() => {
      let seconds = this.timerSeconds();
      let minutes = this.timerMinutes();
      
      if (seconds === 0) {
        if (minutes === 0) {
          this.stopTimer();
          Swal.fire({ icon: 'success', title: 'Terminé!', text: `${initialMinutes} minutes complétées`, background: '#1a1a1a', color: '#ffd700', confirmButtonColor: '#ffd700' });
          return;
        }
        minutes--;
        seconds = 59;
      } else {
        seconds--;
      }
      
      this.timerMinutes.set(minutes);
      this.timerSeconds.set(seconds);
    }, 1000);
  }

  pauseTimer() {
    this.isTimerRunning.set(false);
    clearInterval(this.timerInterval);
  }

  stopTimer() {
    this.isTimerRunning.set(false);
    clearInterval(this.timerInterval);
    
    // Calculate studied time
    const minutesStudied = this.initialTimerMinutes() - this.timerMinutes();
    console.log(`Timer stopped: ${minutesStudied} minutes studied`);
    
    if (minutesStudied > 0 && this.selectedSubjectForTimer()) {
      this.updateStudiedTime(this.selectedSubjectForTimer()!._id!, minutesStudied);
      
      // Award points for completing timer session
      const pointsEarned = minutesStudied * 2; // 2 points per minute studied
      console.log(`Awarding ${pointsEarned} points`);
      
      this.authService.awardPoints(pointsEarned).subscribe({
        next: (res) => {
          console.log('Points awarded successfully:', res);
          if (res.success) {
            Swal.fire({
              icon: 'success',
              title: `+${pointsEarned} Points! 🏆`,
              text: `Total: ${res.totalPoints} points`,
              timer: 2000,
              showConfirmButton: false,
              background: '#1a1a1a',
              color: '#ffd700'
            });
          }
        },
        error: (err) => {
          console.error('Error awarding points:', err);
          // Still show completion message even if points fail
          Swal.fire({
            icon: 'info',
            title: 'Session terminée!',
            text: `${minutesStudied} minutes complétées`,
            timer: 2000,
            showConfirmButton: false,
            background: '#1a1a1a',
            color: '#ffd700'
          });
        }
      });
    }
    
    this.timerMinutes.set(this.initialTimerMinutes());
    this.timerSeconds.set(0);
    this.selectedSubjectForTimer.set(null);
  }

  updateStudiedTime(subjectId: string, additionalMinutes: number) {
    const plan = this.dayPlan();
    if (!plan) {
      console.log('No day plan found, cannot update studied time');
      return;
    }
    
    // Handle both string and object subjectId
    const subjectPlan = plan.subjects.find(s => {
      const sid = typeof s.subjectId === 'string' ? s.subjectId : s.subjectId._id;
      return sid === subjectId;
    });
    
    if (!subjectPlan) {
      console.log('Subject not found in day plan');
      return;
    }
    
    const currentMinutes = subjectPlan.studiedMinutes || 0;
    const newStudiedMinutes = currentMinutes + additionalMinutes;
    const goalMinutes = subjectPlan.goalMinutes || 0;
    
    console.log(`Updating studied time for subject ${subjectId}: ${currentMinutes} + ${additionalMinutes} = ${newStudiedMinutes} minutes (goal: ${goalMinutes})`);
    
    // Check if goal was just reached or surpassed
    const wasNotComplete = currentMinutes < goalMinutes;
    const isNowComplete = newStudiedMinutes >= goalMinutes;
    
    this.dayPlanService.updateStudiedTime(this.today, subjectId, newStudiedMinutes).subscribe({
      next: () => {
        console.log('Studied time updated successfully');
        this.loadDayPlan();
        
        // Celebrate if goal just reached!
        if (wasNotComplete && isNowComplete && goalMinutes > 0) {
          const subjectInfo = this.getSubjectById(subjectId);
          const subjectName = subjectInfo ? subjectInfo.name : 'cette matière';
          const bonusPoints = 50; // Bonus points for completing a subject goal
          
          // Award bonus points
          this.authService.awardPoints(bonusPoints).subscribe({
            next: (res) => {
              Swal.fire({
                icon: 'success',
                title: `🎉 Objectif atteint! 🎉`,
                html: `<div style="font-size: 1.2em;">
                  <p style="margin-bottom: 1rem;">Félicitations! Vous avez complété <strong style="color: #ffd700;">${subjectName}</strong>!</p>
                  <p style="font-size: 2em; margin: 1rem 0;">⭐ +${bonusPoints} Points Bonus! ⭐</p>
                  <p style="color: #10b981;">Total: ${res.totalPoints} points</p>
                </div>`,
                background: '#1a1a1a',
                color: '#ffd700',
                confirmButtonColor: '#ffd700',
                confirmButtonText: 'Super! 🚀',
                timer: 5000,
                timerProgressBar: true
              });
            },
            error: (err) => {
              console.error('Error awarding bonus points:', err);
              // Still show celebration even if points fail
              Swal.fire({
                icon: 'success',
                title: `🎉 Objectif atteint! 🎉`,
                html: `<div style="font-size: 1.2em;">
                  <p>Félicitations! Vous avez complété <strong style="color: #ffd700;">${subjectName}</strong>!</p>
                </div>`,
                background: '#1a1a1a',
                color: '#ffd700',
                confirmButtonColor: '#ffd700',
                timer: 3000
              });
            }
          });
        }
      },
      error: (err) => console.error('Error updating studied time:', err)
    });
  }

  // Todo Management
  openTodoModal() {
    this.editingTodo.set(null);
    this.todoForm = { title: '', priority: 'medium', subjectId: '' };
    this.showTodoModal.set(true);
  }

  editTodo(todo: Todo) {
    this.editingTodo.set(todo);
    this.todoForm = {
      title: todo.title,
      priority: todo.priority,
      subjectId: todo.subjectId || ''
    };
    this.showTodoModal.set(true);
  }

  saveTodo() {
    if (!this.todoForm.title.trim()) {
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Le titre est requis', background: '#1a1a1a', color: '#ffd700', confirmButtonColor: '#ffd700' });
      return;
    }

    const editingTodo = this.editingTodo();
    
    if (editingTodo) {
      // Update existing todo
      const updatedTodo: any = {
        title: this.todoForm.title.trim(),
        priority: this.todoForm.priority || 'medium',
        category: 'other',
        done: editingTodo.done
      };
      
      if (this.todoForm.subjectId && this.todoForm.subjectId.trim()) {
        updatedTodo.subjectId = this.todoForm.subjectId.trim();
      }
      
      console.log('Updating todo:', editingTodo._id, updatedTodo);
      
      this.todoService.updateTodo(editingTodo._id!, updatedTodo).subscribe({
        next: (response) => {
          console.log('Todo updated successfully:', response);
          Swal.fire({ icon: 'success', title: 'Tâche modifiée', timer: 1500, showConfirmButton: false, background: '#1a1a1a', color: '#ffd700' });
          this.showTodoModal.set(false);
          this.editingTodo.set(null);
          this.loadTodos();
        },
        error: (err) => {
          console.error('Error updating todo:', err);
          const errorMsg = err.error?.error || err.error?.message || err.message || 'Erreur lors de la modification de la tâche';
          Swal.fire({ icon: 'error', title: 'Erreur', text: errorMsg, background: '#1a1a1a', color: '#ffd700', confirmButtonColor: '#ffd700' });
        }
      });
    } else {
      // Create new todo
      const todo: any = {
        title: this.todoForm.title.trim(),
        priority: this.todoForm.priority || 'medium',
        date: this.today,
        category: 'other',
        done: false
      };
      
      if (this.todoForm.subjectId && this.todoForm.subjectId.trim()) {
        todo.subjectId = this.todoForm.subjectId.trim();
      }
      
      console.log('Creating todo with data:', JSON.stringify(todo, null, 2));
      
      this.todoService.createTodo(todo).subscribe({
        next: (response) => {
          console.log('Todo created successfully:', response);
          Swal.fire({ icon: 'success', title: 'Tâche ajoutée', timer: 1500, showConfirmButton: false, background: '#1a1a1a', color: '#ffd700' });
          this.showTodoModal.set(false);
          this.loadTodos();
        },
        error: (err) => {
          console.error('Error creating todo:', err);
          console.error('Error status:', err.status);
          console.error('Error body:', err.error);
          const errorMsg = err.error?.error || err.error?.message || err.message || 'Erreur lors de la création de la tâche';
          Swal.fire({ icon: 'error', title: 'Erreur', text: errorMsg, background: '#1a1a1a', color: '#ffd700', confirmButtonColor: '#ffd700' });
        }
      });
    }
  }

  toggleTodo(todo: Todo) {
    this.todoService.toggleTodo(todo._id!).subscribe({
      next: () => {
        // Award points if marking as done (was not done before)
        if (!todo.done) {
          this.authService.awardPoints(10).subscribe({
            next: (res) => {
              if (res.success) {
                Swal.fire({
                  icon: 'success',
                  title: '+10 Points! 🏆',
                  text: `Total: ${res.totalPoints} points`,
                  timer: 2000,
                  showConfirmButton: false,
                  background: '#1a1a1a',
                  color: '#ffd700'
                });
              }
            },
            error: (err) => console.error('Error awarding points:', err)
          });
        }
        this.loadTodos();
      },
      error: (err) => console.error('Error toggling todo:', err)
    });
  }

  deleteTodo(todo: Todo) {
    this.todoService.deleteTodo(todo._id!).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Supprimé', timer: 1500, showConfirmButton: false, background: '#1a1a1a', color: '#ffd700' });
        this.loadTodos();
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Erreur', text: err.error?.message, background: '#1a1a1a', color: '#ffd700', confirmButtonColor: '#ffd700' });
      }
    });
  }

  getPriorityColor(priority: string): string {
    const colors: any = { high: 'red', medium: 'yellow', low: 'green' };
    return colors[priority] || 'gray';
  }

  formatTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  getMaxWeekMinutes(): number {
    const stats = this.weekStats();
    return stats.length > 0 ? Math.max(...stats.map(s => s.minutes)) : 100;
  }

  getSubjectById(id: string): Subject | undefined {
    return this.subjects().find(s => s._id === id);
  }

  getSubjectIdString(subjectId: string | Subject): string {
    return typeof subjectId === 'string' ? subjectId : subjectId._id || '';
  }

  getTotalPlanMinutes(): number {
    return Object.values(this.planForm).reduce((sum, val) => sum + (val || 0), 0);
  }

  decrementPlan(subjectId: string) {
    this.planForm[subjectId] = Math.max(0, (this.planForm[subjectId] || 0) - 15);
  }

  incrementPlan(subjectId: string) {
    this.planForm[subjectId] = (this.planForm[subjectId] || 0) + 15;
  }

  getSubjectProgress(studiedMinutes: number, goalMinutes: number): number {
    return goalMinutes > 0 ? Math.round((studiedMinutes / goalMinutes) * 100) : 0;
  }

  openStatsModal() {
    this.loadWeekStats();
    this.showStatsModal.set(true);
  }

  goToPlanner() {
    this.router.navigate(['/planner']);
  }

  logout() {
    Swal.fire({
      title: 'Se déconnecter?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#ffd700',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui',
      cancelButtonText: 'Non',
      background: '#1a1a1a',
      color: '#ffd700'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
        this.router.navigate(['/login']);
      }
    });
  }
}
