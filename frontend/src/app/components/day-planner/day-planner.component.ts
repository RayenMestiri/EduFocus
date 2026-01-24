import { Component, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth.service';
import { SubjectService } from '../../services/subject.service';
import { DayPlanService } from '../../services/day-plan.service';
import { TodoService } from '../../services/todo.service';
import { Subject, DayPlan, DayPlanSubject, Todo } from '../../models';

// FullCalendar Imports
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, DateSelectArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import frLocale from '@fullcalendar/core/locales/fr';

interface StudySession {
  id?: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  subjectIcon: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  completed: boolean;
}

@Component({
  selector: 'app-day-planner',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './day-planner.component.html',
  styleUrl: './day-planner.component.css',
  encapsulation: ViewEncapsulation.None
})
export class DayPlannerComponent implements OnInit {
  subjects = signal<Subject[]>([]);
  dayPlan = signal<DayPlan | null>(null);
  todos = signal<Todo[]>([]);
  sessions = signal<StudySession[]>([]);
  isLoading = signal(true);

  // Stats
  totalPlannedMinutes = computed(() => {
    const plan = this.dayPlan();
    if (!plan) return 0;
    // Sum all goalMinutes from today's plan
    return plan.subjects.reduce((sum, s) => sum + (s.goalMinutes || 0), 0);
  });

  totalStudiedMinutes = computed(() => {
    const plan = this.dayPlan();
    if (!plan) return 0;
    // Sum all studiedMinutes from today's plan
    return plan.subjects.reduce((sum, s) => sum + (s.studiedMinutes || 0), 0);
  });

  todayTasks = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.todos().filter(t => t.date?.startsWith(today));
  });

  completedTasks = computed(() => {
    return this.todayTasks().filter(t => t.done).length;
  });

  currentDate = signal<string>(new Date().toISOString().split('T')[0]);
  currentViewType = signal<string>('timeGridDay');
  currentDateRange = signal<{start: string, end: string}>({start: '', end: ''});

  // FullCalendar Configuration
  calendarOptions = signal<CalendarOptions>({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'timeGridDay',
    initialDate: new Date().toISOString().split('T')[0],
    locale: frLocale,
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridDay,timeGridWeek,dayGridMonth'
    },
    datesSet: this.handleDatesSet.bind(this),
    height: 'auto',
    slotMinTime: '06:00:00',
    slotMaxTime: '24:00:00',
    slotDuration: '00:30:00',
    allDaySlot: false,
    nowIndicator: true,
    editable: true,
    selectable: true,
    selectMirror: true,
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
    events: [],
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    slotLabelFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    buttonText: {
      today: "Aujourd'hui",
      day: 'Jour',
      week: 'Semaine',
      month: 'Mois'
    }
  });

  constructor(
    private authService: AuthService,
    private subjectService: SubjectService,
    private dayPlanService: DayPlanService,
    private todoService: TodoService,
    private router: Router
  ) {}

  ngOnInit() {
    // Load subjects first, then calendar will trigger handleDatesSet
    this.subjectService.getSubjects().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.subjects.set(response.data);
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  async loadData(date?: string) {
    this.isLoading.set(true);
    
    const targetDate = date || this.currentDate();
    
    // Load subjects first
    this.subjectService.getSubjects().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.subjects.set(response.data);
          
          // Load plan for target date after subjects are loaded
          this.dayPlanService.getDayPlan(targetDate).subscribe({
            next: (planResponse) => {
              if (planResponse.success && planResponse.data) {
                console.log('📅 Day plan loaded:', planResponse.data);
                console.log('📚 Subjects available:', this.subjects().length);
                console.log('🔍 Sessions in plan:', planResponse.data.subjects.map(s => ({
                  subjectId: s.subjectId,
                  sessionsCount: s.sessions?.length || 0
                })));
                this.dayPlan.set(planResponse.data);
                this.generateSessionsFromPlan(planResponse.data);
              }
              this.isLoading.set(false);
            },
            error: () => {
              this.isLoading.set(false);
            }
          });
        }
      },
      error: () => {
        this.isLoading.set(false);
      }
    });

    // Load todos
    this.todoService.getTodos(targetDate).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.todos.set(response.data);
        }
      },
      error: () => {
        // Silent error for todos
      }
    });
  }

  generateSessionsFromPlan(plan: DayPlan) {
    const sessions = this.generateSessionsFromSinglePlan(plan);
    this.sessions.set(sessions);
    console.log('🎯 Sessions generated:', sessions.length);
    this.updateCalendarEvents();
  }

  generateSessionsFromSinglePlan(plan: DayPlan): StudySession[] {
    if (!plan?.subjects || plan.subjects.length === 0) {
      console.log('⚠️ No subjects in plan');
      return [];
    }

    const newSessions: StudySession[] = [];

    // Parse the plan date (YYYY-MM-DD format)
    const [year, month, day] = plan.date.split('-').map(Number);

    plan.subjects.forEach((subjectPlan: DayPlanSubject) => {
      const subjectId = typeof subjectPlan.subjectId === 'string' ? subjectPlan.subjectId : subjectPlan.subjectId._id;
      const subject = this.subjects().find(s => s._id === subjectId);
      if (!subject || subjectPlan.goalMinutes === 0) return;

      // ONLY load existing sessions from the backend, don't generate automatic ones
      if (subjectPlan.sessions && subjectPlan.sessions.length > 0) {
        console.log(`📚 Loading ${subjectPlan.sessions.length} existing sessions for ${subject.name}`);
        // Load existing sessions with proper date
        subjectPlan.sessions.forEach(savedSession => {
          const [startHour, startMin] = savedSession.startTime.split(':').map(Number);
          const [endHour, endMin] = savedSession.endTime.split(':').map(Number);
          
          const sessionDate = new Date(year, month - 1, day, startHour, startMin);
          
          newSessions.push({
            subjectId: subject._id!,
            subjectName: subject.name,
            subjectColor: subject.color,
            subjectIcon: subject.icon,
            date: sessionDate,
            startTime: savedSession.startTime,
            endTime: savedSession.endTime,
            duration: savedSession.duration,
            completed: savedSession.completed
          });
        });
      } else {
        console.log(`ℹ️ No sessions for ${subject.name}, user can create them manually`);
      }
    });

    return newSessions;
  }

  updateCalendarEvents() {
    const events = this.sessions().map(session => {
      const startDateTime = new Date(session.date);
      const [startHours, startMinutes] = session.startTime.split(':');
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0);

      const endDateTime = new Date(session.date);
      const [endHours, endMinutes] = session.endTime.split(':');
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0);

      // Different styling for completed vs non-completed
      const isCompleted = session.completed;
      const backgroundColor = isCompleted ? '#10b981' : session.subjectColor; // Green for completed
      const borderColor = isCompleted ? '#059669' : session.subjectColor;
      const title = isCompleted 
        ? `✅ ${session.subjectIcon} ${session.subjectName}` 
        : `${session.subjectIcon} ${session.subjectName}`;

      return {
        id: session.id || `${session.subjectId}-${session.startTime}`,
        title: title,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        textColor: '#ffffff',
        classNames: isCompleted ? ['completed-session'] : ['pending-session'],
        extendedProps: {
          session: session,
          completed: isCompleted
        }
      };
    });

    console.log('📆 Calendar events updated:', events.length);

    this.calendarOptions.update(options => ({
      ...options,
      events
    }));
  }

  handleDateSelect(selectInfo: DateSelectArg) {
    const subjects = this.subjects();
    if (subjects.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Aucune matière',
        text: 'Ajoutez d\'abord des matières depuis le dashboard'
      });
      return;
    }

    Swal.fire({
      title: 'Nouvelle session d\'étude',
      html: `
        <select id="subject-select" class="swal2-input" style="width: 80%">
          <option value="">Sélectionnez une matière</option>
          ${subjects.map(s => `<option value="${s._id}">${s.icon} ${s.name}</option>`).join('')}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Créer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#ffd700',
      preConfirm: () => {
        const select = document.getElementById('subject-select') as HTMLSelectElement;
        if (!select.value) {
          Swal.showValidationMessage('Veuillez sélectionner une matière');
          return false;
        }
        return select.value;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const subjectId = result.value;
        const subject = subjects.find(s => s._id === subjectId);
        if (!subject) return;

        const duration = Math.round((selectInfo.end.getTime() - selectInfo.start.getTime()) / 60000);
        
        // Use the actual clicked date from the calendar
        const clickedDate = new Date(selectInfo.start);
        const year = clickedDate.getFullYear();
        const month = clickedDate.getMonth();
        const day = clickedDate.getDate();
        const sessionDate = new Date(year, month, day, clickedDate.getHours(), clickedDate.getMinutes());
        
        // Update current date if clicking on a different day
        const clickedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (clickedDateStr !== this.currentDate()) {
          this.currentDate.set(clickedDateStr);
        }
        
        const newSession: StudySession = {
          subjectId: subject._id!,
          subjectName: subject.name,
          subjectColor: subject.color,
          subjectIcon: subject.icon,
          date: sessionDate,
          startTime: selectInfo.start.toTimeString().slice(0, 5),
          endTime: selectInfo.end.toTimeString().slice(0, 5),
          duration: duration,
          completed: false
        };

        this.sessions.update(sessions => [...sessions, newSession]);
        this.updateCalendarEvents();
        this.saveSessionsToBackend();

        Swal.fire({
          icon: 'success',
          title: 'Session créée!',
          text: `Session de ${duration} minutes ajoutée`,
          timer: 2000,
          showConfirmButton: false
        });
      }

      selectInfo.view.calendar.unselect();
    });
  }

  handleEventClick(clickInfo: EventClickArg) {
    const session: StudySession = clickInfo.event.extendedProps['session'];

    Swal.fire({
      title: `${session.subjectIcon} ${session.subjectName}`,
      html: `
        <div style="text-align: left; padding: 1rem;">
          <p><strong>🕐 Horaire:</strong> ${session.startTime} - ${session.endTime}</p>
          <p><strong>⏱️ Durée:</strong> ${session.duration} minutes</p>
          <p><strong>✅ Statut:</strong> ${session.completed ? 'Complété' : 'À faire'}</p>
        </div>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: session.completed ? 'Marquer non complété' : 'Marquer complété',
      denyButtonText: 'Supprimer',
      cancelButtonText: 'Fermer',
      confirmButtonColor: '#10b981',
      denyButtonColor: '#ef4444'
    }).then((result) => {
      if (result.isConfirmed) {
        this.sessions.update(sessions => 
          sessions.map(s => 
            s === session ? { ...s, completed: !s.completed } : s
          )
        );
        this.updateCalendarEvents();
        this.saveSessionsToBackend();
      } else if (result.isDenied) {
        this.sessions.update(sessions => 
          sessions.filter(s => s !== session)
        );
        this.updateCalendarEvents();
        this.saveSessionsToBackend();
        Swal.fire({
          icon: 'success',
          title: 'Session supprimée',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }

  handleEventDrop(info: any) {
    const session: StudySession = info.event.extendedProps['session'];
    const newStart = info.event.start;
    const newEnd = info.event.end;

    this.sessions.update(sessions => 
      sessions.map(s => {
        if (s === session) {
          return {
            ...s,
            date: newStart,
            startTime: newStart.toTimeString().slice(0, 5),
            endTime: newEnd.toTimeString().slice(0, 5)
          };
        }
        return s;
      })
    );
    this.saveSessionsToBackend();

    Swal.fire({
      icon: 'success',
      title: 'Session déplacée',
      timer: 1500,
      showConfirmButton: false
    });
  }

  handleEventResize(info: any) {
    const session: StudySession = info.event.extendedProps['session'];
    const newEnd = info.event.end;
    const newDuration = Math.round((newEnd.getTime() - info.event.start.getTime()) / 60000);

    this.sessions.update(sessions => 
      sessions.map(s => {
        if (s === session) {
          return {
            ...s,
            endTime: newEnd.toTimeString().slice(0, 5),
            duration: newDuration
          };
        }
        return s;
      })
    );
    this.saveSessionsToBackend();

    Swal.fire({
      icon: 'success',
      title: 'Durée modifiée',
      text: `${newDuration} minutes`,
      timer: 1500,
      showConfirmButton: false
    });
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  handleDatesSet(dateInfo: any) {
    const viewType = dateInfo.view.type;
    
    // Get the visible date range
    let viewStart = new Date(dateInfo.start);
    let viewEnd = new Date(dateInfo.end);
    
    // For day view, expand to load the full week
    if (viewType === 'timeGridDay') {
      const dayOfWeek = viewStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get Monday of current week
      viewStart = new Date(viewStart);
      viewStart.setDate(viewStart.getDate() + mondayOffset);
      viewEnd = new Date(viewStart);
      viewEnd.setDate(viewEnd.getDate() + 6); // Sunday of current week
    }
    
    viewStart.setHours(12, 0, 0, 0);
    viewEnd.setHours(12, 0, 0, 0);
    
    const startStr = viewStart.toISOString().split('T')[0];
    const endStr = viewEnd.toISOString().split('T')[0];
    
    const previousRange = this.currentDateRange();
    const isInitialLoad = previousRange.start === '' && previousRange.end === '';
    
    this.currentViewType.set(viewType);
    this.currentDateRange.set({start: startStr, end: endStr});
    
    console.log(`📅 View: ${viewType}, Loading range: ${startStr} to ${endStr}, IsInitial: ${isInitialLoad}`);
    
    // On initial load, load the full week range
    if (isInitialLoad && this.subjects().length > 0) {
      this.loadDataRange(startStr, endStr);
    }
  }

  loadDataRange(startDate: string, endDate: string) {
    this.isLoading.set(true);
    
    console.log(`🔄 Loading data range from ${startDate} to ${endDate}`);
    
    // Load today's plan first for stats display
    const today = new Date().toISOString().split('T')[0];
    this.dayPlanService.getDayPlan(today).subscribe({
      next: (todayPlanResponse) => {
        if (todayPlanResponse.success && todayPlanResponse.data) {
          console.log('📅 Today\'s plan loaded for stats:', todayPlanResponse.data);
          this.dayPlan.set(todayPlanResponse.data);
        }
      },
      error: (error) => {
        console.warn('⚠️ Could not load today\'s plan:', error);
      }
    });
    
    // Load plans for date range (subjects should already be loaded)
    this.dayPlanService.getDayPlansRange(startDate, endDate).subscribe({
      next: (plansResponse) => {
        if (plansResponse.success && plansResponse.data) {
          console.log(`📅 Loaded ${plansResponse.data.length} day plans for range`);
          
          // Generate sessions from all plans
          const allSessions: StudySession[] = [];
          plansResponse.data.forEach(plan => {
            const planSessions = this.generateSessionsFromSinglePlan(plan);
            allSessions.push(...planSessions);
            console.log(`  📋 Plan ${plan.date}: ${planSessions.length} sessions`);
          });
          
          this.sessions.set(allSessions);
          console.log(`🎯 Total sessions loaded: ${allSessions.length}`);
          this.updateCalendarEvents();
        } else {
          console.warn('⚠️ No plans data in response');
          this.sessions.set([]);
          this.updateCalendarEvents();
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('❌ Error loading date range:', error);
        this.isLoading.set(false);
      }
    });
  }

  saveSessionsToBackend() {
    // Group sessions by date first
    const sessionsByDate = new Map<string, StudySession[]>();
    this.sessions().forEach(session => {
      const dateStr = `${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, '0')}-${String(session.date.getDate()).padStart(2, '0')}`;
      if (!sessionsByDate.has(dateStr)) {
        sessionsByDate.set(dateStr, []);
      }
      sessionsByDate.get(dateStr)!.push(session);
    });

    console.log('🔍 Sessions by date:', Array.from(sessionsByDate.entries()).map(([date, sessions]) => ({
      date,
      count: sessions.length
    })));

    // Get all unique dates from both current sessions and existing plan
    const allDates = new Set<string>();
    sessionsByDate.forEach((_, date) => allDates.add(date));
    
    // Also check if we need to update dates that no longer have sessions
    const currentRange = this.currentDateRange();
    if (currentRange.start && currentRange.end) {
      const start = new Date(currentRange.start);
      const end = new Date(currentRange.end);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        allDates.add(dateStr);
      }
    }

    // Save each date separately
    allDates.forEach(dateStr => {
      const dateSessions = sessionsByDate.get(dateStr) || [];
      this.saveDatePlan(dateStr, dateSessions);
    });
  }

  private saveDatePlan(dateStr: string, dateSessions: StudySession[]) {
    console.log(`💾 Saving ${dateSessions.length} sessions for ${dateStr}`);

    // Group sessions by subject for this date
    const sessionsBySubject = new Map<string, any[]>();
    
    dateSessions.forEach(session => {
      if (!sessionsBySubject.has(session.subjectId)) {
        sessionsBySubject.set(session.subjectId, []);
      }
      sessionsBySubject.get(session.subjectId)!.push({
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        completed: session.completed
      });
    });

    // Get existing plan for this date or create structure for new subjects
    const plan = this.dayPlan();
    const existingSubjectsMap = new Map();
    
    // If plan exists and is for the same date, use its subjects
    if (plan && plan.date === dateStr) {
      plan.subjects.forEach(s => {
        const id = typeof s.subjectId === 'string' ? s.subjectId : s.subjectId._id;
        existingSubjectsMap.set(id, s);
      });
    }

    // Build updated subjects array, including new subjects from sessions
    const updatedSubjects: any[] = [];
    
    // Add all subjects that have sessions
    sessionsBySubject.forEach((sessions, subjectId) => {
      const existingSubject = existingSubjectsMap.get(subjectId);
      const subject = this.subjects().find(s => s._id === subjectId);
      
      // Always recalculate goalMinutes based on current sessions
      const totalSessionMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
      
      if (existingSubject) {
        // Update existing subject - recalculate goalMinutes from sessions
        updatedSubjects.push({
          subjectId: subjectId,
          goalMinutes: Math.max(totalSessionMinutes, 5),
          studiedMinutes: existingSubject.studiedMinutes || 0,
          sessions: sessions,
          priority: existingSubject.priority || 'medium'
        });
      } else if (subject) {
        // Add new subject with calculated goal from sessions
        updatedSubjects.push({
          subjectId: subjectId,
          goalMinutes: Math.max(totalSessionMinutes, 5),
          studiedMinutes: 0,
          sessions: sessions,
          priority: 'medium'
        });
      }
    });

    // Add subjects without sessions that were in the original plan (only if same date)
    // These are subjects that had manual goals set but no sessions yet
    if (plan && plan.date === dateStr) {
      plan.subjects.forEach(subjectPlan => {
      const subjectId = typeof subjectPlan.subjectId === 'string' 
        ? subjectPlan.subjectId 
        : subjectPlan.subjectId?._id || '';
      
      // Only keep subjects without sessions if they have a manual goal AND studied time
      // This prevents keeping old planned time when all sessions are deleted
      if (subjectId && !sessionsBySubject.has(subjectId)) {
        // If subject has studied time, keep it with manual goal
        if (subjectPlan.studiedMinutes > 0) {
          updatedSubjects.push({
            subjectId: subjectId,
            goalMinutes: subjectPlan.goalMinutes || 0,
            studiedMinutes: subjectPlan.studiedMinutes || 0,
            sessions: [],
            priority: subjectPlan.priority || 'medium'
          });
        }
        // If no studied time and no sessions, don't include it (it means sessions were deleted)
      }
    });
    }

    console.log('📤 Request payload:', {
      date: dateStr,
      subjects: updatedSubjects,
      subjectsCount: updatedSubjects.length
    });

    // Allow saving even with 0 subjects (means all sessions were deleted)
    // This ensures the planned time is updated correctly when sessions are removed

    // Save to backend
    this.dayPlanService.saveDayPlan({
      date: dateStr,
      subjects: updatedSubjects
    }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          console.log(`✅ Sessions saved successfully for ${dateStr}:`, response.data);
          // Update local dayPlan only if it's the same date
          if (this.currentDate() === dateStr) {
            this.dayPlan.set(response.data);
          }
        }
      },
      error: (error) => {
        console.error(`❌ Error saving sessions for ${dateStr}:`, error);
        console.error('❌ Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message || error.message,
          backendError: error.error?.error,
          fullError: error
        });
        
        let errorMessage = 'Impossible de sauvegarder les sessions';
        if (error.error?.error) {
          errorMessage = error.error.error;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Erreur de sauvegarde',
          text: errorMessage,
          timer: 2000
        });
      }
    });
  }
}
