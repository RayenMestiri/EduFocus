import { Component, OnInit, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth.service';
import { SubjectService } from '../../services/subject.service';
import { DayPlanService } from '../../services/day-plan.service';
import { TodoService } from '../../services/todo.service';
import { ThemeService } from '../../services/theme.service';
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

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    const today = formatLocalDate(new Date());
    return this.todos().filter(t => t.date?.startsWith(today));
  });

  completedTasks = computed(() => {
    return this.todayTasks().filter(t => t.done).length;
  });

  currentDate = signal<string>(formatLocalDate(new Date()));
  currentViewType = signal<string>('timeGridDay');
  currentDateRange = signal<{start: string, end: string}>({start: '', end: ''});
  private pendingRange: {start: string, end: string} | null = null;
  private hasLoadedOnce = false;

  // FullCalendar Configuration
  calendarOptions = signal<CalendarOptions>({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
    initialView: 'timeGridDay',
    initialDate: formatLocalDate(new Date()),
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
    },
    eventContent: this.renderEventContent.bind(this)
  });

  // Custom render function for FullCalendar events with Material Icons
  renderEventContent(arg: any) {
    const icon = arg.event.extendedProps.icon || arg.event._def.extendedProps.icon;
    const isCompleted = arg.event.extendedProps.isCompleted || arg.event._def.extendedProps.isCompleted;
    
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '4px';
    container.style.padding = '2px 4px';
    container.style.overflow = 'hidden';
    container.style.whiteSpace = 'nowrap';
    container.style.textOverflow = 'ellipsis';

    // Add completion checkmark if completed
    if (isCompleted) {
      const checkIcon = document.createElement('span');
      checkIcon.className = 'material-icons';
      checkIcon.textContent = 'check_circle';
      checkIcon.style.fontSize = '16px';
      checkIcon.style.color = '#ffffff';
      container.appendChild(checkIcon);
    }

    // Add subject icon
    if (icon) {
      const iconSpan = document.createElement('span');
      iconSpan.className = 'material-icons';
      iconSpan.textContent = icon;
      iconSpan.style.fontSize = '18px';
      iconSpan.style.color = '#ffffff';
      container.appendChild(iconSpan);
    }

    // Add time
    const timeSpan = document.createElement('span');
    timeSpan.style.fontSize = '12px';
    timeSpan.style.fontWeight = '600';
    timeSpan.style.color = '#ffffff';
    timeSpan.textContent = arg.timeText;
    container.appendChild(timeSpan);

    // Add title
    const titleSpan = document.createElement('span');
    titleSpan.style.fontSize = '13px';
    titleSpan.style.fontWeight = '600';
    titleSpan.style.color = '#ffffff';
    titleSpan.style.marginLeft = '4px';
    titleSpan.style.overflow = 'hidden';
    titleSpan.style.textOverflow = 'ellipsis';
    titleSpan.textContent = arg.event.title;
    container.appendChild(titleSpan);

    return { domNodes: [container] };
  }

  constructor(
    private authService: AuthService,
    private subjectService: SubjectService,
    private dayPlanService: DayPlanService,
    private todoService: TodoService,
    private router: Router,
    public themeService: ThemeService
  ) {}

  ngOnInit() {
    // Load subjects first, then calendar will trigger handleDatesSet
    this.subjectService.getSubjects().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.subjects.set(response.data);
          const range = this.pendingRange || this.currentDateRange();
          if (range.start && range.end) {
            this.loadDataRange(range.start, range.end);
            this.pendingRange = null;
          } else {
            this.isLoading.set(false);
          }
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
      const title = session.subjectName; // Just the name, icon will be rendered separately

      return {
        id: session.id || `${session.subjectId}-${session.startTime}`,
        title: title,
        // Store icon and completion status for custom rendering
        icon: session.subjectIcon,
        isCompleted: isCompleted,
        start: startDateTime,
        end: endDateTime,
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
        <select id="subject-select" class="swal2-input" style="width: 90%; padding: 14px 16px; font-size: 16px; height: auto; min-height: 48px; margin: 20px auto; display: block; border: 2px solid #3b82f6; border-radius: 8px; background-color: white; color: #1f2937;">
          <option value="" style="padding: 10px; font-size: 16px;">Sélectionnez une matière</option>
          ${subjects.map(s => `<option value="${s._id}" style="padding: 10px; font-size: 16px;">${s.name}</option>`).join('')}
        </select>
      `,
      showCancelButton: true,
      confirmButtonText: 'Créer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#3b82f6',
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
        const affectedDate = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`;
        this.saveSessionsToBackend(affectedDate);

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
      title: session.subjectName,
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
        const affectedDate = `${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, '0')}-${String(session.date.getDate()).padStart(2, '0')}`;
        this.saveSessionsToBackend(affectedDate);
        this.syncStudiedMinutesFromSessions(affectedDate, session.subjectId);
      } else if (result.isDenied) {
        const affectedDate = `${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, '0')}-${String(session.date.getDate()).padStart(2, '0')}`;
        this.sessions.update(sessions => 
          sessions.filter(s => s !== session)
        );
        this.updateCalendarEvents();
        this.saveSessionsToBackend(affectedDate);
        Swal.fire({
          icon: 'success',
          title: 'Session supprimée',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }

  private syncStudiedMinutesFromSessions(dateStr: string, subjectId: string) {
    const completedMinutes = this.sessions()
      .filter(s => formatLocalDate(s.date) === dateStr && s.subjectId === subjectId && s.completed)
      .reduce((sum, s) => sum + s.duration, 0);

    this.dayPlanService.updateStudiedTime(dateStr, subjectId, completedMinutes).subscribe({
      next: () => {
        const today = formatLocalDate(new Date());
        if (dateStr === today) {
          this.dayPlanService.getDayPlan(dateStr).subscribe({
            next: (res) => {
              if (res.success && res.data) {
                this.dayPlan.set(res.data);
              }
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ Error syncing studied minutes:', error);
      }
    });
  }

  handleEventDrop(info: any) {
    const session: StudySession = info.event.extendedProps['session'];
    const newStart = info.event.start;
    const newEnd = info.event.end;

    const affectedDate = `${newStart.getFullYear()}-${String(newStart.getMonth() + 1).padStart(2, '0')}-${String(newStart.getDate()).padStart(2, '0')}`;
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
    this.saveSessionsToBackend(affectedDate);

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

    const affectedDate = `${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, '0')}-${String(session.date.getDate()).padStart(2, '0')}`;
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
    this.saveSessionsToBackend(affectedDate);

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
      viewEnd.setDate(viewEnd.getDate() + 7); // Exclusive end (next Monday)
    }
    
    viewStart.setHours(12, 0, 0, 0);
    viewEnd.setHours(12, 0, 0, 0);
    // FullCalendar provides an exclusive end date; make it inclusive
    const viewEndInclusive = new Date(viewEnd);
    viewEndInclusive.setDate(viewEndInclusive.getDate() - 1);
    
    const startStr = formatLocalDate(viewStart);
    const endStr = formatLocalDate(viewEndInclusive);
    
    const previousRange = this.currentDateRange();
    const previousViewType = this.currentViewType();
    const isInitialLoad = previousRange.start === '' && previousRange.end === '';
    const rangeChanged = previousRange.start !== startStr || previousRange.end !== endStr;
    const viewChanged = previousViewType !== viewType;
    
    this.currentViewType.set(viewType);
    this.currentDateRange.set({start: startStr, end: endStr});
    console.log(`📅 View: ${viewType}, Range: ${startStr} to ${endStr}, IsInitial: ${isInitialLoad}, RangeChanged: ${rangeChanged}, ViewChanged: ${viewChanged}`);
    if (isInitialLoad || rangeChanged || viewChanged) {
      if (this.subjects().length > 0) {
        this.loadDataRange(startStr, endStr);
      } else {
        this.pendingRange = {start: startStr, end: endStr};
      }
    }
  }

  loadDataRange(startDate: string, endDate: string) {
    if (!this.hasLoadedOnce) {
      this.isLoading.set(true);
    }
    
    console.log(`🔄 Loading data range from ${startDate} to ${endDate}`);
    
    // Load today's plan first for stats display
    const today = formatLocalDate(new Date());
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
        this.hasLoadedOnce = true;
      },
      error: (error) => {
        console.error('❌ Error loading date range:', error);
        this.isLoading.set(false);
        this.hasLoadedOnce = true;
      }
    });
  }

  saveSessionsToBackend(affectedDate?: string) {
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

    // If affectedDate is provided, only save that specific date
    if (affectedDate) {
      const dateSessions = sessionsByDate.get(affectedDate) || [];
      this.saveDatePlan(affectedDate, dateSessions);
      return;
    }

    // Otherwise, get all unique dates from current sessions only (don't save all range)
    const allDates = new Set<string>();
    sessionsByDate.forEach((_, date) => allDates.add(date));

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
