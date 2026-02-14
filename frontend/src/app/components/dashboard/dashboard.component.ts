import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SubjectService } from '../../services/subject.service';
import { DayPlanService } from '../../services/day-plan.service';
import { TodoService } from '../../services/todo.service';
import { ThemeService } from '../../services/theme.service';
import { Subject, DayPlan, Todo } from '../../models';
import Swal from 'sweetalert2';
import { LottieComponent, AnimationOptions } from 'ngx-lottie';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, LottieComponent],
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
  
  // Advanced Timer Settings
  showTimerSettings = signal<boolean>(false);
  timerMode = signal<'focus' | 'break'>('focus'); // Current mode
  sessionsCompleted = signal<number>(0); // Sessions completed today
  currentSessionGoal = signal<number>(4); // Target sessions per day
  
  timerSettings = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    autoStartBreaks: true,
    autoStartFocus: false,
    relaxationAudioUrl: '',
    soundEnabled: true,
    notificationsEnabled: true
  };
  
  // YouTube Player
  youtubePlayer: any = null;
  youtubePlayerReady = signal<boolean>(false);
  private dateCheckInterval: any = null;
  private lastKnownDate: string = this.formatLocalDate(new Date());
  
  // UI state
  showSubjectModal = signal<boolean>(false);
  showTodoModal = signal<boolean>(false);
  showPlanModal = signal<boolean>(false);
  showStatsModal = signal<boolean>(false);
  showRelaxationModal = signal<boolean>(false);
  editingSubject = signal<Subject | null>(null);
  editingTodo = signal<Todo | null>(null);
  studyStreak = signal<number>(0);
  weekStats = signal<any[]>([]);
  
  // Lottie Animation Configuration
  lottieOptions: AnimationOptions = {
    path: 'assets/animations/CalmZen.json',
    loop: true,
    autoplay: true
  };
  
  // Forms
  subjectForm = {
    name: '',
    color: '#ffd700',
    icon: 'menu_book'
  };
  
  todoForm = {
    title: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    subjectId: ''
  };

  planForm: { [key: string]: number } = {};
  
  // Date - Always get current date dynamically
  get today() {
    return this.formatLocalDate(new Date());
  }
  
  // Computed values
  totalGoalMinutes = computed(() => {
    const plan = this.dayPlan();
    if (!plan || !plan.subjects) return 0;
    // Calculate from subjects array to ensure accuracy
    return plan.subjects.reduce((sum, s) => sum + (s.goalMinutes || 0), 0);
  });
  
  totalStudiedMinutes = computed(() => {
    const plan = this.dayPlan();
    if (!plan || !plan.subjects) return 0;
    // Calculate from subjects array to ensure accuracy
    return plan.subjects.reduce((sum, s) => sum + (s.studiedMinutes || 0), 0);
  });
  
  progressPercentage = computed(() => {
    const goal = this.totalGoalMinutes();
    const studied = this.totalStudiedMinutes();
    return goal > 0 ? Math.round((studied / goal) * 100) : 0;
  });
  
  hasAnySessions = computed(() => {
    const plan = this.dayPlan();
    if (!plan) return false;
    return plan.subjects.some(s => s.sessions && s.sessions.length > 0);
  });
  
  completedTodos = computed(() => {
    return this.todos().filter(t => t.done).length;
  });
  
  totalTodos = computed(() => {
    return this.todos().length;
  });

  // Material Icons for subjects
  icons = [
    'menu_book', 'calculate', 'science', 'computer', 'public', 
    'book', 'edit', 'palette', 'music_note', 'sports_soccer', 
    'biotech', 'straighten', 'psychology', 'language', 'history_edu',
    'category', 'architecture', 'functions', 'auto_stories', 'school'
  ];
  colors = ['#ffd700', '#2563eb', '#7c3aed', '#db2777', '#059669', '#ea580c', '#dc2626', '#0891b2', '#16a34a', '#c026d3', '#0284c7', '#ca8a04'];

  constructor(
    private authService: AuthService,
    private subjectService: SubjectService,
    private dayPlanService: DayPlanService,
    private todoService: TodoService,
    private router: Router,
    public themeService: ThemeService
  ) {}

  currentUser = computed(() => this.authService.currentUser());

  ngOnInit() {
    this.loadData();
    this.loadYouTubeAPI();
    this.startDateCheck();
  }

  loadData() {
    this.loadSubjects();
    this.loadDayPlan();
    this.loadTodos();
    this.loadWeekStats();
    this.calculateStreak();
    this.loadTimerSettings();
    this.lastKnownDate = this.formatLocalDate(new Date());
  }

  // Check if date has changed and reload data
  startDateCheck() {
    this.dateCheckInterval = setInterval(() => {
      const currentDate = this.formatLocalDate(new Date());
      if (currentDate !== this.lastKnownDate) {
        console.log('🗓️ Nouveau jour détecté, rechargement des données...');
        this.loadData();
        this.lastKnownDate = currentDate;
      }
    }, 60000); // Check every minute
    this.loadSessionsCompleted();
  }

  private formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  loadWeekStats() {
    // Get last 7 days statistics using range query
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    
    const startStr = this.formatLocalDate(startDate);
    const endStr = this.formatLocalDate(endDate);
    
    this.dayPlanService.getDayPlansRange(startStr, endStr).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const stats: { date: string; day: string; minutes: number; }[] = [];
          
          // Create stat entry for each day in range
          for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - 6 + i);
            const dateStr = this.formatLocalDate(date);
            
            // Find plan for this date
            const plan = res.data.find(p => p.date === dateStr);
            const totalStudied = plan ? plan.subjects.reduce((sum, s) => sum + s.studiedMinutes, 0) : 0;
            
            stats.push({
              date: dateStr,
              day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
              minutes: totalStudied
            });
          }
          
          this.weekStats.set(stats);
          console.log('📊 Week stats loaded:', stats);
        } else {
          // No data, fill with zeros
          const stats: { date: string; day: string; minutes: number; }[] = [];
          for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - 6 + i);
            stats.push({
              date: this.formatLocalDate(date),
              day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
              minutes: 0
            });
          }
          this.weekStats.set(stats);
        }
      },
      error: (error) => {
        console.error('❌ Error loading week stats:', error);
        // Fill with zeros on error
        const stats: { date: string; day: string; minutes: number; }[] = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() - 6 + i);
          stats.push({
            date: this.formatLocalDate(date),
            day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
            minutes: 0
          });
        }
        this.weekStats.set(stats);
      }
    });
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
    const currentDate = this.formatLocalDate(new Date());
    this.dayPlanService.getDayPlan(currentDate).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.dayPlan.set(res.data);
        }
      },
      error: (err) => console.error('Error loading day plan:', err)
    });
  }

  loadTodos() {
    const currentDate = this.formatLocalDate(new Date());
    this.todoService.getTodos(currentDate).subscribe({
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
      Swal.fire({ 
        icon: 'error', 
        title: 'Erreur', 
        text: 'Le nom est requis'
      });
      return;
    }

    const subject = this.subjectForm;
    const request = this.editingSubject()
      ? this.subjectService.updateSubject(this.editingSubject()!._id!, subject)
      : this.subjectService.createSubject(subject);

    request.subscribe({
      next: () => {
        Swal.fire({ 
          icon: 'success', 
          title: 'Succès', 
          text: 'Matière enregistrée avec succès', 
          timer: 1500, 
          showConfirmButton: false 
        });
        this.showSubjectModal.set(false);
        this.loadSubjects();
        this.loadDayPlan(); // Reload current day plan to show updated data
      },
      error: (err) => {
        Swal.fire({ 
          icon: 'error', 
          title: 'Erreur', 
          text: err.error?.message || 'Une erreur est survenue'
        });
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
          // Always use the goalMinutes from the plan
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
    
    // Always show modal directly - no warnings
    this.showPlanModal.set(true);
  }

  saveDayPlan() {
    const existingPlan = this.dayPlan();
    // Always preserve sessions - never overwrite them
    this.proceedSaveDayPlan(existingPlan, false);
  }

  private proceedSaveDayPlan(existingPlan: any, overwriteSessions: boolean) {
    const subjects = Object.keys(this.planForm)
      .map(subjectId => {
        // Find existing data for this subject
        let studiedMinutes = 0;
        let existingSessions: any[] = [];
        let priority: 'low' | 'medium' | 'high' = 'medium';
        
        if (existingPlan) {
          const existingSubject = existingPlan.subjects.find((s: any) => {
            const sid = typeof s.subjectId === 'string' ? s.subjectId : s.subjectId._id;
            return sid === subjectId;
          });
          
          if (existingSubject) {
            studiedMinutes = existingSubject.studiedMinutes || 0;
            priority = existingSubject.priority || 'medium';
            
            // Si goalMinutes = 0, supprimer toutes les sessions
            if (this.planForm[subjectId] === 0) {
              existingSessions = [];
              console.log(`🗑️ Toutes les sessions supprimées (goalMinutes = 0)`);
            }
            // If sessions exist, adjust them to match new goalMinutes
            else if (existingSubject.sessions && existingSubject.sessions.length > 0) {
              existingSessions = [...existingSubject.sessions];
              
              // Calculate current total session time
              const currentSessionTotal = existingSessions.reduce((sum: number, sess: any) => sum + sess.duration, 0);
              const newGoalMinutes = this.planForm[subjectId];
              
              // If goalMinutes changed, adjust sessions intelligently
              if (currentSessionTotal !== newGoalMinutes) {
                const difference = newGoalMinutes - currentSessionTotal;
                
                if (difference > 0) {
                  // AUGMENTATION : Ajouter à la dernière session
                  const lastIdx = existingSessions.length - 1;
                  const lastSession = existingSessions[lastIdx];
                  const newDuration = lastSession.duration + difference;
                  
                  const startTime = new Date(`2000-01-01T${lastSession.startTime}`);
                  const endTime = new Date(startTime.getTime() + newDuration * 60000);
                  
                  existingSessions[lastIdx] = {
                    ...lastSession,
                    duration: newDuration,
                    endTime: endTime.toTimeString().slice(0, 5)
                  };
                  
                  console.log(`➕ Augmentation: +${difference}min ajouté à la dernière session (${lastSession.duration}min → ${newDuration}min)`);
                  
                } else {
                  // DIMINUTION : Retirer des sessions en partant de la fin
                  let remainingToRemove = Math.abs(difference);
                  
                  // Parcourir les sessions de la fin vers le début
                  for (let i = existingSessions.length - 1; i >= 0 && remainingToRemove > 0; i--) {
                    const session = existingSessions[i];
                    
                    if (session.duration <= remainingToRemove) {
                      // Supprimer complètement cette session
                      console.log(`🗑️ Session ${i + 1} supprimée (${session.duration}min)`);
                      remainingToRemove -= session.duration;
                      existingSessions.splice(i, 1);
                    } else {
                      // Réduire cette session
                      const newDuration = session.duration - remainingToRemove;
                      
                      // Garder seulement si >= 15min, sinon supprimer
                      if (newDuration >= 15) {
                        const startTime = new Date(`2000-01-01T${session.startTime}`);
                        const endTime = new Date(startTime.getTime() + newDuration * 60000);
                        
                        existingSessions[i] = {
                          ...session,
                          duration: newDuration,
                          endTime: endTime.toTimeString().slice(0, 5)
                        };
                        
                        console.log(`➖ Session ${i + 1} réduite: ${session.duration}min → ${newDuration}min`);
                        remainingToRemove = 0;
                      } else {
                        // Session < 15min, la supprimer complètement
                        console.log(`🗑️ Session ${i + 1} supprimée (< 15min: ${newDuration}min)`);
                        remainingToRemove -= session.duration;
                        existingSessions.splice(i, 1);
                      }
                    }
                  }
                  
                  console.log(`✅ Diminution terminée. ${existingSessions.length} session(s) restante(s)`);
                }
              }
            }
          }
        }
        
        return {
          subjectId,
          goalMinutes: this.planForm[subjectId],
          studiedMinutes,
          sessions: existingSessions,
          priority
        };
      })
      .filter(subject => {
        // Garder si goalMinutes > 0 OU si on a des sessions/studiedMinutes (pour les supprimer/conserver)
        return subject.goalMinutes > 0 || subject.sessions.length > 0 || subject.studiedMinutes > 0;
      });

    // Also include subjects with sessions but no new goalMinutes (to preserve them)
    if (existingPlan) {
      existingPlan.subjects.forEach((existingSubject: any) => {
        const sid = typeof existingSubject.subjectId === 'string' 
          ? existingSubject.subjectId 
          : existingSubject.subjectId._id;
        
        // If subject has sessions but wasn't in planForm, preserve it
        if ((existingSubject.sessions && existingSubject.sessions.length > 0) && !this.planForm.hasOwnProperty(sid)) {
          subjects.push({
            subjectId: sid,
            goalMinutes: existingSubject.goalMinutes || 0,
            studiedMinutes: existingSubject.studiedMinutes || 0,
            sessions: existingSubject.sessions,
            priority: existingSubject.priority || 'medium'
          });
        }
      });
    }

    if (subjects.length === 0) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Erreur', 
        text: 'Ajoutez au moins une matière avec un objectif'
      });
      return;
    }

    this.dayPlanService.saveDayPlan({ date: this.today, subjects }).subscribe({
      next: () => {
        Swal.fire({ 
          icon: 'success', 
          title: '✅ Plan mis à jour', 
          text: 'Sessions ajustées automatiquement',
          timer: 2000, 
          showConfirmButton: false
        });
        this.showPlanModal.set(false);
        this.loadDayPlan();
      },
      error: (err) => {
        Swal.fire({ 
          icon: 'error', 
          title: 'Erreur', 
          text: err.error?.message
        });
      }
    });
  }

  deleteSubject(subject: Subject) {
    Swal.fire({
      title: 'Supprimer?',
      text: `Supprimer "${subject.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.subjectService.deleteSubject(subject._id!).subscribe({
          next: () => {
            Swal.fire({ icon: 'success', title: 'Supprimé', timer: 1500, showConfirmButton: false });
            this.loadSubjects();
          },
          error: (err) => {
            Swal.fire({ icon: 'error', title: 'Erreur', text: err.error?.message });
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

  startTimer(subject: Subject, isBreak: boolean = false, isLongBreak: boolean = false) {
    if (!isBreak) {
      this.selectedSubjectForTimer.set(subject);
      this.timerMode.set('focus');
    } else {
      this.timerMode.set('break');
      // Store if this is a long break for later reference
      if (isLongBreak) {
        localStorage.setItem('currentBreakIsLong', 'true');
      } else {
        localStorage.removeItem('currentBreakIsLong');
      }
    }
    
    const initialMinutes = this.initialTimerMinutes();
    this.timerMinutes.set(initialMinutes);
    this.timerSeconds.set(0);
    this.isTimerRunning.set(true);
    
    this.timerInterval = setInterval(() => {
      let seconds = this.timerSeconds();
      let minutes = this.timerMinutes();
      
      if (seconds === 0) {
        if (minutes === 0) {
          this.handleTimerComplete(initialMinutes);
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

  async handleTimerComplete(minutes: number) {
    this.pauseTimer();
    
    const mode = this.timerMode();
    
    if (mode === 'focus') {
      // Focus session completed
      const newSessionCount = this.sessionsCompleted() + 1;
      this.sessionsCompleted.set(newSessionCount);
      this.saveSessionsCompleted(); // 💾 Save to localStorage
      console.log(`✅ Session ${newSessionCount} complétée et sauvegardée`);
      
      // Update studied time and award points
      if (this.selectedSubjectForTimer()) {
        console.log(`🔍 handleTimerComplete: calling updateStudiedTime with ${minutes} minutes`);
        this.updateStudiedTime(this.selectedSubjectForTimer()!._id!, minutes);
        
        const pointsEarned = minutes * 2;
        this.authService.awardPoints(pointsEarned).subscribe({
          next: (res) => {
            console.log(`✅ +${pointsEarned} points awarded`);
          },
          error: (err) => console.error('Error awarding points:', err)
        });
      }
      
      // Show completion celebration
      await this.showFocusCompletionCelebration(minutes, newSessionCount);
      
      // Determine break type
      const needsLongBreak = newSessionCount % this.timerSettings.sessionsBeforeLongBreak === 0;
      const breakDuration = needsLongBreak ? this.timerSettings.longBreakDuration : this.timerSettings.shortBreakDuration;
      const breakType = needsLongBreak ? 'longue pause' : 'courte pause';
      
      // Offer break
      const result = await Swal.fire({
        title: `☕ Temps de pause!`,
        html: `
          <div class="text-center">
            <p class="text-lg mb-4">Vous avez complété <strong class="text-yellow-400">${newSessionCount}</strong> session(s) aujourd'hui!</p>
            <p class="text-gray-400 mb-2">Prenez une <strong>${breakType}</strong> de <strong class="text-green-400">${breakDuration} minutes</strong></p>
            <div class="mt-4 flex justify-center gap-4">
              <div class="text-center p-4 bg-blue-500/10 rounded-lg">
                <div class="text-3xl mb-2">🎯</div>
                <div class="text-sm text-gray-400">Session ${newSessionCount}/${this.currentSessionGoal()}</div>
              </div>
              ${needsLongBreak ? '<div class="text-center p-4 bg-purple-500/10 rounded-lg"><div class="text-3xl mb-2">🌟</div><div class="text-sm text-gray-400">Pause longue!</div></div>' : ''}
            </div>
          </div>
        `,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: `🧘 Commencer la pause (${breakDuration}min)`,
        cancelButtonText: '⏭️ Passer la pause',
        background: '#1a1a1a',
        color: '#ffd700',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280'
      });
      
      if (result.isConfirmed) {
        this.showRelaxationModal.set(true);
        this.playYouTubeAudio(); // Play audio during break
        this.initialTimerMinutes.set(breakDuration);
        this.startTimer(this.selectedSubjectForTimer()!, true, needsLongBreak);
      } else {
        // Si on passe la pause, ne PAS réinitialiser les sessions
        // On garde le compteur actuel
        this.resetTimer();
      }
    } else {
      // Break completed
      const wasLongBreak = localStorage.getItem('currentBreakIsLong') === 'true';
      
      Swal.fire({
        title: '💪 Pause terminée!',
        text: wasLongBreak ? 'Nouveau cycle! Sessions réinitialisées 🔄' : 'Prêt à reprendre le travail?',
        icon: 'info',
        confirmButtonText: '🔥 Continuer!',
        background: '#1a1a1a',
        color: '#ffd700',
        confirmButtonColor: '#ffd700'
      });
      
      // Si c'était une pause longue, réinitialiser les sessions
      if (wasLongBreak) {
        this.sessionsCompleted.set(0);
        this.saveSessionsCompleted();
        localStorage.removeItem('currentBreakIsLong');
        console.log('🔄 Sessions réinitialisées après pause longue complétée');
      }
      
      this.showRelaxationModal.set(false);
      this.stopYouTubeAudio(); // Stop audio when break ends
      this.resetTimer();
      
      if (this.timerSettings.autoStartFocus && this.selectedSubjectForTimer()) {
        this.initialTimerMinutes.set(this.timerSettings.focusDuration);
        this.startTimer(this.selectedSubjectForTimer()!);
      }
    }
  }

  async showFocusCompletionCelebration(minutes: number, sessionCount: number) {
    const messages = [
      { title: '🎉 Excellent travail!', text: 'Vous restez concentré!' },
      { title: '⭐ Superbe!', text: 'Continuez comme ça!' },
      { title: '🔥 En feu!', text: 'Rien ne peut vous arrêter!' },
      { title: '💎 Brillant!', text: 'Votre focus est impressionnant!' },
      { title: '🚀 Incroyable!', text: 'Vous êtes une machine!' }
    ];
    
    const message = messages[Math.min(sessionCount - 1, messages.length - 1)];
    
    await Swal.fire({
      title: message.title,
      html: `
        <div class="text-center">
          <div class="text-6xl mb-4 animate-bounce">🏆</div>
          <p class="text-xl mb-2">${message.text}</p>
          <p class="text-gray-400"><strong class="text-yellow-400">${minutes} minutes</strong> de focus complet</p>
          <div class="mt-4 text-sm text-gray-500">+${minutes * 2} points 💰</div>
        </div>
      `,
      timer: 2500,
      timerProgressBar: true,
      showConfirmButton: false,
      background: '#1a1a1a',
      color: '#ffd700'
    });
  }

  resetTimer() {
    this.isTimerRunning.set(false);
    clearInterval(this.timerInterval);
    this.timerMinutes.set(this.timerSettings.focusDuration);
    this.timerSeconds.set(0);
    this.initialTimerMinutes.set(this.timerSettings.focusDuration);
    this.selectedSubjectForTimer.set(null);
    this.timerMode.set('focus');
    this.showRelaxationModal.set(false); // Fermer le modal de relaxation
    this.stopYouTubeAudio(); // Stop audio if playing
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
    console.log(`🔍 stopTimer: initialMinutes=${this.initialTimerMinutes()}, remainingMinutes=${this.timerMinutes()}, studied=${minutesStudied}`);
    
    if (minutesStudied > 0 && this.selectedSubjectForTimer() && this.timerMode() === 'focus') {
      this.updateStudiedTime(this.selectedSubjectForTimer()!._id!, minutesStudied);
      
      // Award points for partial session
      const pointsEarned = minutesStudied * 2;
      console.log(`Awarding ${pointsEarned} points for partial session`);
      
      this.authService.awardPoints(pointsEarned).subscribe({
        next: (res) => {
          if (res.success) {
            Swal.fire({
              icon: 'info',
              title: 'Session interrompue',
              html: `
                <p>${minutesStudied} minutes complétées</p>
                <p class="text-sm text-yellow-400">+${pointsEarned} points</p>
              `,
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
    
    this.resetTimer();
  }

  openTimerSettings() {
    this.showTimerSettings.set(true);
  }

  saveTimerSettings() {
    // Validate settings
    if (this.timerSettings.focusDuration < 1 || this.timerSettings.focusDuration > 60) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'La durée de focus doit être entre 1 et 60 minutes',
        background: '#1a1a1a',
        color: '#ffd700',
        confirmButtonColor: '#ffd700'
      });
      return;
    }
    
    // Update initial timer with new settings
    this.initialTimerMinutes.set(this.timerSettings.focusDuration);
    this.timerMinutes.set(this.timerSettings.focusDuration);
    
    // Save to localStorage immediately
    localStorage.setItem('timerSettings', JSON.stringify(this.timerSettings));
    localStorage.setItem('currentSessionGoal', this.currentSessionGoal().toString());
    
    // Prepare ALL settings for database
    const allSettings = {
      pomodoroLength: this.timerSettings.focusDuration,
      shortBreak: this.timerSettings.shortBreakDuration,
      longBreak: this.timerSettings.longBreakDuration,
      sessionsBeforeLongBreak: this.timerSettings.sessionsBeforeLongBreak,
      autoStartBreaks: this.timerSettings.autoStartBreaks,
      autoStartFocus: this.timerSettings.autoStartFocus,
      dailySessionsGoal: this.currentSessionGoal(),
      relaxationAudioUrl: this.timerSettings.relaxationAudioUrl
    };
    
    // Save ALL settings to database
    this.authService.updateTimerSettings(allSettings).subscribe({
      next: (response) => {
        console.log('✅ Tous les paramètres sauvegardés dans la base:', response.settings);
        Swal.fire({
          icon: 'success',
          title: 'Paramètres sauvegardés!',
          text: 'Synchronisés sur tous vos appareils',
          timer: 1500,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: '#ffd700'
        });
      },
      error: (error) => {
        console.error('❌ Erreur sauvegarde base de données:', error);
        Swal.fire({
          icon: 'warning',
          title: 'Paramètres sauvegardés localement',
          text: 'Synchronisation avec le serveur échouée',
          timer: 2000,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: '#ffd700'
        });
      }
    });
    
    this.showTimerSettings.set(false);
  }

  loadTimerSettings() {
    // Load from localStorage as fallback
    const saved = localStorage.getItem('timerSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.timerSettings = { ...this.timerSettings, ...settings };
        this.initialTimerMinutes.set(this.timerSettings.focusDuration);
        this.timerMinutes.set(this.timerSettings.focusDuration);
      } catch (e) {
        console.error('Error loading timer settings:', e);
      }
    }
    
    const savedGoal = localStorage.getItem('currentSessionGoal');
    if (savedGoal) {
      this.currentSessionGoal.set(parseInt(savedGoal, 10));
    }
    
    // Load ALL settings from database (priority)
    this.authService.getTimerSettings().subscribe({
      next: (response) => {
        if (response.success && response.settings) {
          const s = response.settings;
          
          // Map backend fields to frontend
          this.timerSettings = {
            focusDuration: s.pomodoroLength || 25,
            shortBreakDuration: s.shortBreak || 5,
            longBreakDuration: s.longBreak || 15,
            sessionsBeforeLongBreak: s.sessionsBeforeLongBreak || 4,
            autoStartBreaks: s.autoStartBreaks !== undefined ? s.autoStartBreaks : true,
            autoStartFocus: s.autoStartFocus !== undefined ? s.autoStartFocus : false,
            relaxationAudioUrl: s.relaxationAudioUrl || '',
            soundEnabled: true,
            notificationsEnabled: true
          };
          
          this.currentSessionGoal.set(s.dailySessionsGoal || 4);
          
          // Update localStorage with fresh data
          localStorage.setItem('timerSettings', JSON.stringify(this.timerSettings));
          localStorage.setItem('currentSessionGoal', this.currentSessionGoal().toString());
          
          this.initialTimerMinutes.set(this.timerSettings.focusDuration);
          this.timerMinutes.set(this.timerSettings.focusDuration);
          
          console.log('✅ Tous les paramètres chargés depuis la base de données');
        }
      },
      error: (error) => {
        console.warn('⚠️ Impossible de charger depuis la base, utilisation localStorage');
      }
    });
  }

  loadSessionsCompleted() {
    const savedSessions = localStorage.getItem('sessionsCompleted');
    const savedDate = localStorage.getItem('sessionsDate');
    const today = this.formatLocalDate(new Date());
    
    if (savedSessions && savedDate === today) {
      // Same day, restore session count
      try {
        const sessions = parseInt(savedSessions, 10);
        this.sessionsCompleted.set(sessions);
        console.log(`✅ Sessions restaurées: ${sessions}`);
      } catch (e) {
        console.error('Error loading sessions:', e);
        this.sessionsCompleted.set(0);
      }
    } else {
      // New day, reset sessions
      this.sessionsCompleted.set(0);
      this.saveSessionsCompleted();
      console.log('🆕 Nouveau jour - Sessions réinitialisées');
    }
  }

  saveSessionsCompleted() {
    const today = this.formatLocalDate(new Date());
    localStorage.setItem('sessionsCompleted', this.sessionsCompleted().toString());
    localStorage.setItem('sessionsDate', today);
  }

  updateStudiedTime(subjectId: string, additionalMinutes: number) {
    const plan = this.dayPlan();
    if (!plan) {
      console.log('No day plan found, cannot update studied time');
      return;
    }
    
    // DEBUG: Log the received additionalMinutes
    console.log(`🔍 updateStudiedTime called with additionalMinutes: ${additionalMinutes} (type: ${typeof additionalMinutes})`);
    
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
    
    console.log(`📊 Updating studied time: current=${currentMinutes}min + additional=${additionalMinutes}min = new=${newStudiedMinutes}min (goal: ${goalMinutes}min)`);
    
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
          const subjectIcon = subjectInfo ? subjectInfo.icon : '📚';
          const subjectColor = subjectInfo ? subjectInfo.color : '#ffd700';
          const bonusPoints = 100; // Bonus points for completing a subject goal
          
          // Get next incomplete subject
          const nextSubject = this.getNextIncompleteSubject(subjectId);
          
          // Award bonus points
          this.authService.awardPoints(bonusPoints).subscribe({
            next: (res) => {
              Swal.fire({
                title: `
                  <div style="margin-bottom: 1rem;">
                    <div style="font-size: 5em; animation: bounce 1s ease-in-out infinite;">${subjectIcon}</div>
                  </div>
                  <div style="font-size: 2em; font-weight: bold; background: linear-gradient(135deg, #ffd700, #ffed4e, #ffd700); -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shine 2s linear infinite;">
                    Objectif Atteint! 🎉
                  </div>
                `,
                html: `
                  <style>
                    @keyframes bounce {
                      0%, 100% { transform: translateY(0) scale(1); }
                      50% { transform: translateY(-20px) scale(1.1); }
                    }
                    @keyframes shine {
                      0% { background-position: -200% center; }
                      100% { background-position: 200% center; }
                    }
                    @keyframes pulse-glow {
                      0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
                      50% { box-shadow: 0 0 40px rgba(255, 215, 0, 0.8); }
                    }
                    .celebration-card {
                      animation: pulse-glow 2s ease-in-out infinite;
                    }
                  </style>
                  
                  <div style="padding: 1.5rem;">
                    <div style="background: linear-gradient(135deg, ${subjectColor}20, ${subjectColor}10); border: 2px solid ${subjectColor}; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; animation: pulse-glow 2s ease-in-out infinite;">
                      <div style="font-size: 1.5em; color: ${subjectColor}; font-weight: bold; margin-bottom: 0.5rem;">
                        ✅ ${subjectName}
                      </div>
                      <div style="font-size: 1.2em; color: #10b981;">
                        🎯 Objectif complété!
                      </div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #ffd70030, #ffed4e30); border: 3px solid #ffd700; border-radius: 1.5rem; padding: 2rem; margin: 1.5rem 0; position: relative; overflow: hidden;">
                      <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%); animation: shine 3s linear infinite;"></div>
                      <div style="position: relative; z-index: 1;">
                        <div style="font-size: 1.2em; color: #a0a0a0; margin-bottom: 0.5rem;">🎁 Récompense</div>
                        <div style="font-size: 4em; font-weight: bold; color: #ffd700; text-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4);">
                          +${bonusPoints}
                        </div>
                        <div style="font-size: 1.5em; color: #ffd700; font-weight: bold;">Points! 🏆</div>
                        <div style="font-size: 0.9em; color: #a0a0a0; margin-top: 0.5rem;">
                          Total: <span style="color: #ffd700; font-weight: bold;">${res.totalPoints}</span> points
                        </div>
                      </div>
                    </div>
                    
                    ${nextSubject ? `
                      <div style="background: linear-gradient(135deg, #3b82f620, #60a5fa20); border: 2px solid #3b82f6; border-radius: 1rem; padding: 1.5rem; margin-top: 1.5rem;">
                        <div style="font-size: 1.3em; color: #60a5fa; font-weight: bold; margin-bottom: 1rem;">
                          🚀 Prêt pour la suite?
                        </div>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; background: ${nextSubject.color}20; padding: 1rem; border-radius: 0.75rem; border: 2px solid ${nextSubject.color}40;">
                          <span style="font-size: 3em;">${nextSubject.icon}</span>
                          <div style="text-align: left;">
                            <div style="font-size: 1.2em; color: ${nextSubject.color}; font-weight: bold;">${nextSubject.name}</div>
                            <div style="font-size: 0.9em; color: #9ca3af;">Prochaine matière</div>
                          </div>
                        </div>
                        <div style="margin-top: 1rem; font-size: 1.1em; color: #60a5fa;">
                          💪 Continue sur cette lancée!
                        </div>
                      </div>
                    ` : `
                      <div style="background: linear-gradient(135deg, #10b98120, #34d39920); border: 2px solid #10b981; border-radius: 1rem; padding: 1.5rem; margin-top: 1.5rem;">
                        <div style="font-size: 2em; margin-bottom: 0.5rem;">🎊</div>
                        <div style="font-size: 1.3em; color: #10b981; font-weight: bold;">
                          Toutes les matières complétées!
                        </div>
                        <div style="font-size: 1em; color: #9ca3af; margin-top: 0.5rem;">
                          Incroyable travail! 🌟
                        </div>
                      </div>
                    `}
                    
                    <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 0.75rem; border: 1px solid rgba(59, 130, 246, 0.3);">
                      <div style="font-size: 1em; color: #60a5fa;">
                        ⚡ Tu es une machine! Continue comme ça!
                      </div>
                    </div>
                  </div>
                `,
                confirmButtonText: nextSubject ? `🔥 Commencer ${nextSubject.name}!` : '🎉 Parfait!',
                background: '#0a0a0a',
                color: '#ffffff',
                confirmButtonColor: nextSubject ? nextSubject.color : '#ffd700',
                width: '90vw',
                customClass: {
                  popup: 'celebration-popup responsive-modal',
                  confirmButton: 'celebration-button'
                },
                showClass: {
                  popup: 'animate__animated animate__bounceIn'
                },
                hideClass: {
                  popup: 'animate__animated animate__zoomOut animate__faster'
                }
              }).then((result) => {
                // If user clicks to start next subject and next subject exists
                if (result.isConfirmed && nextSubject) {
                  // Start timer for next subject
                  this.startTimer(nextSubject);
                }
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
      Swal.fire({ icon: 'error', title: 'Erreur', text: 'Le titre est requis' });
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
          Swal.fire({ icon: 'success', title: 'Tâche modifiée', timer: 1500, showConfirmButton: false });
          this.showTodoModal.set(false);
          this.editingTodo.set(null);
          this.loadTodos();
        },
        error: (err) => {
          console.error('Error updating todo:', err);
          const errorMsg = err.error?.error || err.error?.message || err.message || 'Erreur lors de la modification de la tâche';
          Swal.fire({ icon: 'error', title: 'Erreur', text: errorMsg });
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
          Swal.fire({ icon: 'success', title: 'Tâche ajoutée', timer: 1500, showConfirmButton: false });
          this.showTodoModal.set(false);
          this.loadTodos();
        },
        error: (err) => {
          console.error('Error creating todo:', err);
          console.error('Error status:', err.status);
          console.error('Error body:', err.error);
          const errorMsg = err.error?.error || err.error?.message || err.message || 'Erreur lors de la création de la tâche';
          Swal.fire({ icon: 'error', title: 'Erreur', text: errorMsg });
        }
      });
    }
  }

  async toggleTodo(todo: Todo, newDone: boolean) {
    const wasDone = todo.done;
    const isCompleting = newDone && !wasDone;
    
    // Only ask for study time if completing and has a subject
    if (isCompleting && todo.subjectId) {
      const subject = this.subjects().find(s => s._id === todo.subjectId);
      const isLight = this.themeService.isLight();
      
      // Premium theme-aware colors (indigo for light mode)
      const textColor = isLight ? '#334155' : '#d1d5db';
      const panelBg = isLight ? '#eef2ff' : '#1f2937';
      const buttonBg = isLight ? '#ffffff' : '#4b5563';
      const buttonHoverBg = isLight ? '#f1f5f9' : '#374151';
      const numberColor = isLight ? '#6366f1' : '#fbbf24';
      const labelColor = isLight ? '#64748b' : '#9ca3af';
      const subjectColor = isLight ? '#64748b' : '#9ca3af';
      const borderColor = isLight ? '#c7d2fe' : '#374151';
      
      const result = await Swal.fire({
        title: '⏱️ Temps d\'étude',
        html: `
          <div style="text-align: left;">
            <p style="margin-bottom: 1rem; color: ${textColor}; font-size: 0.95rem;">Combien de temps avez-vous passé sur cette tâche?</p>
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-bottom: 1rem;">
              <button id="minus-btn" style="width: 2.75rem; height: 2.75rem; background: ${buttonBg}; border: 1.5px solid ${borderColor}; border-radius: 0.625rem; color: ${textColor}; font-size: 1.25rem; cursor: pointer; transition: all 0.2s; font-weight: 600;">−</button>
              <div style="padding: 0.75rem 1.5rem; background: ${panelBg}; border: 1.5px solid ${borderColor}; border-radius: 0.75rem;">
                <span id="time-display" style="font-size: 1.75rem; font-weight: 700; color: ${numberColor};">15</span>
                <span style="color: ${labelColor}; margin-left: 0.5rem; font-size: 0.9rem;">min</span>
              </div>
              <button id="plus-btn" style="width: 2.75rem; height: 2.75rem; background: ${buttonBg}; border: 1.5px solid ${borderColor}; border-radius: 0.625rem; color: ${textColor}; font-size: 1.25rem; cursor: pointer; transition: all 0.2s; font-weight: 600;">+</button>
            </div>
            ${subject ? `<p style="text-align: center; font-size: 0.875rem; color: ${subjectColor};">Matière: ${subject.icon} ${subject.name}</p>` : ''}
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: '✅ Valider',
        cancelButtonText: 'Annuler',
        didOpen: () => {
          let minutes = 15;
          const display = document.getElementById('time-display');
          const minusBtn = document.getElementById('minus-btn') as HTMLButtonElement;
          const plusBtn = document.getElementById('plus-btn') as HTMLButtonElement;
          
          // Hover effects
          minusBtn?.addEventListener('mouseenter', () => minusBtn.style.background = buttonHoverBg);
          minusBtn?.addEventListener('mouseleave', () => minusBtn.style.background = buttonBg);
          plusBtn?.addEventListener('mouseenter', () => plusBtn.style.background = buttonHoverBg);
          plusBtn?.addEventListener('mouseleave', () => plusBtn.style.background = buttonBg);
          
          minusBtn?.addEventListener('click', () => {
            if (minutes > 5) {
              minutes -= 5;
              display!.textContent = minutes.toString();
              display?.setAttribute('data-minutes', minutes.toString());
            }
          });
          
          plusBtn?.addEventListener('click', () => {
            if (minutes < 300) {
              minutes += 5;
              display!.textContent = minutes.toString();
              display?.setAttribute('data-minutes', minutes.toString());
            }
          });
          
          display?.setAttribute('data-minutes', minutes.toString());
        },
        preConfirm: () => {
          const display = document.getElementById('time-display');
          return parseInt(display?.getAttribute('data-minutes') || display?.textContent || '15');
        }
      });

      if (result.isConfirmed && result.value) {
        const studyMinutes = result.value;
        todo.done = newDone;
        
        // Update studied time for this subject
        this.dayPlanService.updateStudiedTime(this.today, todo.subjectId, studyMinutes).subscribe({
          next: () => {
            console.log(`✅ ${studyMinutes} minutes ajoutées à ${subject?.name}`);
            this.loadDayPlan();
            
            // Then toggle the todo
            this.proceedToggleTodo(todo, studyMinutes, wasDone);
          },
          error: (err) => {
            console.error('Error updating studied time:', err);
            // Still toggle the todo even if time update fails
            this.proceedToggleTodo(todo, studyMinutes, wasDone);
          }
        });
      } else {
        // If canceled, revert the checkbox back to previous state
        todo.done = wasDone;
      }
      return;
    }
    
    // For uncompleting or no subject, just toggle without asking
    todo.done = newDone;
    this.proceedToggleTodo(todo, 0, wasDone);
  }

  private proceedToggleTodo(todo: Todo, studyMinutes: number, wasDone: boolean) {
    this.todoService.toggleTodo(todo._id!).subscribe({
      next: () => {
        // Award points if marking as done (was not done before)
        if (!wasDone && todo.done) {
          const basePoints = 10;
          const timeBonus = Math.floor(studyMinutes / 15) * 5; // 5 points per 15 min
          const totalPoints = basePoints + timeBonus;
          
          // Get subject info for personalized message
          const subject = todo.subjectId ? this.subjects().find(s => s._id === todo.subjectId) : null;
          
          // Array of encouraging messages
          const encouragingMessages = [
            "Excellent travail! Continue comme ça! 🌟",
            "Bravo! Tu es sur la bonne voie! 🚀",
            "Fantastique! Chaque tâche complétée te rapproche de ton objectif! 💪",
            "Super! Tu es un champion de la productivité! 🏆",
            "Incroyable! Continue à avancer! ⭐",
            "Magnifique! Tu es en feu! 🔥",
            "Impressionnant! Rien ne peut t'arrêter! 💎",
            "Génial! Tu es une machine à réussir! ⚡"
          ];
          
          const randomMessage = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
          
          this.authService.awardPoints(totalPoints).subscribe({
            next: (res) => {
              if (res.success) {
                Swal.fire({
                  title: `<div style="font-size: 2.5em; margin-bottom: 0.5rem;">🎉✨🎊</div>
                          <div style="font-size: 1.8em; font-weight: bold; background: linear-gradient(135deg, #ffd700, #ffed4e); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                            Tâche Complétée!
                          </div>`,
                  html: `
                    <div style="padding: 1rem;">
                      ${subject ? `
                        <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 1.2em;">
                          <span style="font-size: 2em;">${subject.icon}</span>
                          <span style="color: ${subject.color}; font-weight: bold;">${subject.name}</span>
                        </div>
                      ` : ''}
                      
                      <div style="background: linear-gradient(135deg, #1a1a1a, #2d2d2d); border-radius: 1rem; padding: 1.5rem; margin: 1rem 0; border: 2px solid #ffd700;">
                        <div style="font-size: 1.5em; color: #10b981; margin-bottom: 0.5rem;">
                          ${randomMessage}
                        </div>
                      </div>
                      
                      <div style="display: flex; justify-content: space-around; margin: 1.5rem 0; gap: 1rem;">
                        <div style="background: rgba(255, 215, 0, 0.1); padding: 1rem; border-radius: 0.75rem; flex: 1; border: 1px solid rgba(255, 215, 0, 0.3);">
                          <div style="font-size: 0.9em; color: #9ca3af; margin-bottom: 0.25rem;">Tâche</div>
                          <div style="font-size: 1.5em; color: #ffd700; font-weight: bold;">+${basePoints} 🏆</div>
                        </div>
                        ${studyMinutes > 0 ? `
                          <div style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: 0.75rem; flex: 1; border: 1px solid rgba(16, 185, 129, 0.3);">
                            <div style="font-size: 0.9em; color: #9ca3af; margin-bottom: 0.25rem;">Étude (${studyMinutes}min)</div>
                            <div style="font-size: 1.5em; color: #10b981; font-weight: bold;">+${timeBonus} ⏱️</div>
                          </div>
                        ` : ''}
                      </div>
                      
                      <div style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 237, 78, 0.2)); padding: 1.5rem; border-radius: 1rem; margin-top: 1rem; border: 2px solid #ffd700;">
                        <div style="font-size: 3em; font-weight: bold; color: #ffd700; text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);">
                          +${totalPoints} Points
                        </div>
                        <div style="font-size: 1.1em; color: #a0a0a0; margin-top: 0.5rem;">
                          Total: <span style="color: #ffd700; font-weight: bold;">${res.totalPoints}</span> points
                        </div>
                      </div>
                      
                      <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(59, 130, 246, 0.1); border-radius: 0.75rem; border: 1px solid rgba(59, 130, 246, 0.3);">
                        <div style="font-size: 1.1em; color: #60a5fa;">
                          💡 Continue sur cette lancée! La prochaine tâche t'attend! 
                        </div>
                      </div>
                    </div>
                  `,
                  confirmButtonText: '🚀 Continuer!',
                  background: '#0a0a0a',
                  color: '#ffffff',
                  confirmButtonColor: '#ffd700',
                  width: '40vw',
                  customClass: {
                    popup: 'celebration-popup responsive-modal',
                    confirmButton: 'celebration-button'
                  },
                  showClass: {
                    popup: 'animate__animated animate__bounceIn animate__faster'
                  },
                  hideClass: {
                    popup: 'animate__animated animate__zoomOut animate__faster'
                  }
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
        Swal.fire({ icon: 'success', title: 'Supprimé', timer: 1500, showConfirmButton: false });
        this.loadTodos();
      },
      error: (err) => {
        Swal.fire({ icon: 'error', title: 'Erreur', text: err.error?.message });
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

  getNextIncompleteSubject(currentSubjectId: string): Subject | undefined {
    const plan = this.dayPlan();
    if (!plan) return undefined;

    // Get all subjects with their completion status
    const subjectsWithStatus = this.subjects().map(subject => {
      const subjectPlan = plan.subjects.find(s => {
        const sid = typeof s.subjectId === 'string' ? s.subjectId : s.subjectId._id;
        return sid === subject._id;
      });

      return {
        subject,
        studiedMinutes: subjectPlan?.studiedMinutes || 0,
        goalMinutes: subjectPlan?.goalMinutes || 0,
        isComplete: subjectPlan ? subjectPlan.studiedMinutes >= subjectPlan.goalMinutes : false
      };
    });

    // Find incomplete subjects (that have goals)
    const incompleteSubjects = subjectsWithStatus.filter(s => 
      !s.isComplete && s.goalMinutes > 0 && s.subject._id !== currentSubjectId
    );

    // Return the first incomplete subject, or undefined if all complete
    return incompleteSubjects.length > 0 ? incompleteSubjects[0].subject : undefined;
  }

  getSubjectIdString(subjectId: string | Subject): string {
    return typeof subjectId === 'string' ? subjectId : subjectId._id || '';
  }

  getTotalPlanMinutes(): number {
    return Object.values(this.planForm).reduce((sum, val) => sum + (val || 0), 0);
  }

  decrementPlan(subjectId: string) {
    // Always allow decreasing (removing sessions)
    this.planForm[subjectId] = Math.max(0, (this.planForm[subjectId] || 0) - 15);
  }

  incrementPlan(subjectId: string) {
    // If subject has existing sessions, allow increasing
    if (this.hasSubjectSessions(subjectId)) {
      this.planForm[subjectId] = (this.planForm[subjectId] || 0) + 15;
      return;
    }
    
    // If no sessions, redirect to calendar to create them
    Swal.fire({
      title: '📅 Utilisez le Calendrier',
      html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 15px;">Pour ajouter du temps d'étude à cette matière, vous devez créer des sessions dans le <strong style="color: #ffd700;">Calendrier</strong>.</p>
          <p style="color: #10b981; margin-bottom: 10px;">✅ Avantages du calendrier:</p>
          <ul style="list-style: none; padding-left: 0; color: #ffd700;">
            <li>📍 Planifiez l'heure exacte de chaque session</li>
            <li>⏱️ Définissez la durée précise</li>
            <li>📊 Visualisez votre emploi du temps</li>
            <li>✏️ Modifiez facilement par glisser-déposer</li>
          </ul>
        </div>
      `,
      icon: 'info',
      confirmButtonText: '📅 Aller au Calendrier',
      showCancelButton: true,
      cancelButtonText: 'Plus tard',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      background: '#1a1a1a',
      color: '#ffd700',
      customClass: {
        popup: 'swal-wide'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.showPlanModal.set(false);
        this.goToPlanner();
      }
    });
  }

  canIncrementSubject(subjectId: string): boolean {
    // Can increment if subject has existing sessions OR return true always for UI
    // The logic is handled in incrementPlan()
    return true;
  }

  canDecrementSubject(subjectId: string): boolean {
    return (this.planForm[subjectId] || 0) > 0;
  }

  getSubjectProgress(studiedMinutes: number, goalMinutes: number): number {
    return goalMinutes > 0 ? Math.round((studiedMinutes / goalMinutes) * 100) : 0;
  }

  hasSubjectSessions(subjectId: string): boolean {
    const plan = this.dayPlan();
    if (!plan) return false;
    
    const subject = plan.subjects.find(s => {
      const sid = typeof s.subjectId === 'string' ? s.subjectId : s.subjectId._id;
      return sid === subjectId;
    });
    
    return !!(subject && subject.sessions && subject.sessions.length > 0);
  }

  getSubjectSessionCount(subjectId: string): number {
    const plan = this.dayPlan();
    if (!plan) return 0;
    
    const subject = plan.subjects.find(s => {
      const sid = typeof s.subjectId === 'string' ? s.subjectId : s.subjectId._id;
      return sid === subjectId;
    });
    
    return subject?.sessions?.length || 0;
  }

  openStatsModal() {
    this.loadWeekStats();
    this.showStatsModal.set(true);
  }

  goToPlanner() {
    this.router.navigate(['/planner']);
  }

  // Lottie Animation Callback
  onAnimationCreated(animationItem: any): void {
    console.log('🧘 Animation de relaxation chargée');
    // L'animation est gérée automatiquement par ngx-lottie
  }

  // YouTube API Methods
  loadYouTubeAPI() {
    // Check if API is already loaded
    if ((window as any).YT) {
      this.youtubePlayerReady.set(true);
      return;
    }

    // Load YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);

    // API ready callback
    (window as any).onYouTubeIframeAPIReady = () => {
      this.youtubePlayerReady.set(true);
      console.log('✅ YouTube API loaded');
    };
  }

  extractYouTubeVideoId(url: string): string | null {
    if (!url) return null;
    
    // Support various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  playYouTubeAudio() {
    if (!this.timerSettings.relaxationAudioUrl || !this.youtubePlayerReady()) {
      return;
    }

    const videoId = this.extractYouTubeVideoId(this.timerSettings.relaxationAudioUrl);
    
    if (!videoId) {
      console.warn('⚠️ Invalid YouTube URL');
      return;
    }

    // Destroy existing player if any
    if (this.youtubePlayer) {
      this.youtubePlayer.destroy();
    }

    // Create hidden player container if it doesn't exist
    let playerContainer = document.getElementById('youtube-audio-player');
    if (!playerContainer) {
      playerContainer = document.createElement('div');
      playerContainer.id = 'youtube-audio-player';
      playerContainer.style.display = 'none';
      document.body.appendChild(playerContainer);
    }

    // Create YouTube player
    this.youtubePlayer = new (window as any).YT.Player('youtube-audio-player', {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1
      },
      events: {
        onReady: (event: any) => {
          event.target.setVolume(50);
          event.target.playVideo();
          console.log('🎵 YouTube audio playing');
        },
        onError: (event: any) => {
          console.error('❌ YouTube player error:', event.data);
          Swal.fire({
            icon: 'error',
            title: 'Erreur Audio',
            text: 'Impossible de lire la vidéo YouTube. Vérifiez le lien.',
            background: '#1a1a1a',
            color: '#ffd700',
            timer: 3000
          });
        }
      }
    });
  }

  stopYouTubeAudio() {
    if (this.youtubePlayer) {
      this.youtubePlayer.stopVideo();
      this.youtubePlayer.destroy();
      this.youtubePlayer = null;
      console.log('⏸️ YouTube audio stopped');
    }
  }

  testYouTubeUrl() {
    const videoId = this.extractYouTubeVideoId(this.timerSettings.relaxationAudioUrl);
    
    if (!videoId) {
      Swal.fire({
        icon: 'error',
        title: 'URL Invalide',
        text: 'Le lien YouTube n\'est pas valide',
        background: '#1a1a1a',
        color: '#ffd700'
      });
      return;
    }

    // Check if video exists
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      .then(response => {
        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: 'URL Valide!',
            text: 'La vidéo YouTube existe et sera jouée pendant les pauses',
            background: '#1a1a1a',
            color: '#ffd700',
            timer: 2000
          });
        } else {
          throw new Error('Video not found');
        }
      })
      .catch(() => {
        Swal.fire({
          icon: 'error',
          title: 'Vidéo Introuvable',
          text: 'Cette vidéo YouTube n\'existe pas ou est privée',
          background: '#1a1a1a',
          color: '#ffd700'
        });
      });
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.dateCheckInterval) {
      clearInterval(this.dateCheckInterval);
    }
    this.stopYouTubeAudio();
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
