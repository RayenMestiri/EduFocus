import {
  Component, OnInit, OnDestroy, signal, computed,
  ViewChild, ElementRef, AfterViewChecked, HostListener
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Subject as RxSubject, forkJoin, of } from "rxjs";
import { map, catchError, takeUntil } from "rxjs/operators";
import { AiAssistantService } from "../../services/ai-assistant.service";
import { SubjectService } from "../../services/subject.service";
import { DayPlanService } from "../../services/day-plan.service";
import { TodoService } from "../../services/todo.service";
import { ThemeService } from "../../services/theme.service";
import { Subject } from "../../models";

export interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string; timestamp: Date;
  isThinking?: boolean; isStreaming?: boolean;
  source?: "gemini" | "fallback" | "smart"; analysisCard?: AnalysisCard;
}
export interface AnalysisCard {
  score: number; scoreLabel: string; trend: string;
  strengths: Insight[]; problems: Insight[]; actionPlan: ActionItem[]; timeDistribution: TimeSlice[];
}
export interface Insight { type: "positive" | "warning" | "critical" | "info"; title: string; detail: string; }
export interface ActionItem { label: string; detail?: string; priority: "high" | "medium" | "low"; }
export interface TimeSlice { label: string; minutes: number; share: number; color: string; }
export interface Session { id: string; title: string; preview: string; createdAt: Date; messageCount: number; manuallyRenamed?: boolean; }
export interface QuickStat { label: string; value: string; icon: string; color: string; trend?: string; }

const MAX_SESSIONS = 20;
const THINKING_STAGES = [
  "Analyse de votre activité d'aujourd'hui...",
  "Lecture de vos habitudes d'étude...",
  "Comparaison avec les performances passées...",
  "Détection des patterns de productivité...",
  "Génération de recommandations personnalisées...",
];

@Component({
  selector: "app-ai-coach",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./ai-coach.component.html",
  styleUrl: "./ai-coach.component.css"
})
export class AiCoachComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild("chatScroll") private chatScrollEl!: ElementRef<HTMLElement>;
  @ViewChild("inputRef")   private inputRef!: ElementRef<HTMLTextAreaElement>;

  sidebarOpen    = signal(window.innerWidth >= 1100);
  rightPanelOpen = signal(window.innerWidth >= 1200);
  inputText      = signal("");
  isLoading      = signal(false);
  thinkingStage  = signal(0);
  shouldScrollToBottom = false;
  copiedMsgId    = signal<string | null>(null);
  editingSessionId = signal<string | null>(null);
  renameTitleText  = signal<string>("");

  sessions        = signal<Session[]>([]);
  activeSessionId = signal<string | null>(null);
  messages        = signal<ChatMessage[]>([]);

  quickStats   = signal<QuickStat[]>([]);
  currentScore = signal<number | null>(null);
  weeklyData   = signal<number[]>([0, 0, 0, 0, 0, 0, 0]);
  weekDayLabels = ["D", "L", "M", "M", "J", "V", "S"];
  followUpSuggestions = signal<string[]>([]);

  readonly groupedSessions = computed<{ label: string; items: Session[] }[]>(() => {
    const today     = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const all = this.sessions();
    const todays = all.filter(s => new Date(s.createdAt) >= today);
    const ydays  = all.filter(s => { const d = new Date(s.createdAt); return d >= yesterday && d < today; });
    const older  = all.filter(s => new Date(s.createdAt) < yesterday);
    const g: { label: string; items: Session[] }[] = [];
    if (todays.length) g.push({ label: "Aujourd'hui", items: todays });
    if (ydays.length)  g.push({ label: "Hier", items: ydays });
    if (older.length)  g.push({ label: "Plus tôt", items: older });
    return g;
  });

  readonly sparklineMax  = computed(() => Math.max(...this.weeklyData(), 1));
  readonly hasMessages   = computed(() => this.messages().some(m => m.role === "user"));

  readonly suggestions = [
    { icon: "auto_graph",           text: "Analyse ma journée",             desc: "Score + plan personnalisé" },
    { icon: "psychology",           text: "Que réviser en priorité ?",      desc: "Basé sur tes matières" },
    { icon: "event_note",           text: "Crée mon plan pour demain",      desc: "Emploi du temps optimal" },
    { icon: "local_fire_department",text: "Comment va ma régularité ?",     desc: "Streak et tendances" },
    { icon: "bar_chart",            text: "Analyse mes stats de la semaine",desc: "Performance hebdo" },
    { icon: "tips_and_updates",     text: "Donne-moi des conseils de focus",desc: "Techniques Pomodoro" },
  ];

  private subjects: Subject[] = [];
  private dayPlan: any = null;
  private todos: any[] = [];
  private weekStats: any[] = [];
  private streamTimer:   ReturnType<typeof setTimeout>  | null = null;
  private thinkingTimer: ReturnType<typeof setInterval> | null = null;
  private readonly destroy$ = new RxSubject<void>();

  constructor(
    private router: Router,
    private aiService: AiAssistantService,
    private subjectService: SubjectService,
    private dayPlanService: DayPlanService,
    private todoService: TodoService,
    public  themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    this.newSession();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopStream();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToEnd();
      this.shouldScrollToBottom = false;
    }
  }

  @HostListener("window:resize")
  onResize(): void {
    if (window.innerWidth < 1100) this.sidebarOpen.set(false);
    if (window.innerWidth < 1200) this.rightPanelOpen.set(false);
  }

  loadData(): void {
    const today = this.formatDate(new Date());
    forkJoin({
      subjects: this.subjectService.getSubjects().pipe(map((r: any) => r?.data || r || []), catchError(() => of([]))),
      plan:     this.dayPlanService.getDayPlan(today).pipe(map((r: any) => r?.data || r || null), catchError(() => of(null))),
      todos:    this.todoService.getTodosWithFilters({}).pipe(map((r: any) => r?.data || r || []), catchError(() => of([]))),
    }).pipe(takeUntil(this.destroy$)).subscribe(({ subjects, plan, todos }) => {
      this.subjects = subjects; this.dayPlan = plan; this.todos = todos;
      this.buildQuickStats();
    });
    this.loadWeekStats();
  }

  loadWeekStats(): void {
    const today = new Date();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      days.push(this.formatDate(d));
    }
    this.dayPlanService.getDayPlansRange(days[0], days[6]).pipe(
      map((res: any) => res?.data || res || []),
      catchError(() => of([])),
      takeUntil(this.destroy$)
    ).subscribe((plans: any[]) => {
      this.weeklyData.set(days.map(day => {
        const p = plans.find((pl: any) => pl.date === day);
        return p?.subjects?.reduce((s: number, sub: any) => s + (sub.studiedMinutes || 0), 0) || 0;
      }));
      this.weekStats = plans;
      this.buildQuickStats();
    });
  }

  private computeScore(plan: any, todos: any[], streak: number): number {
    const totalGoal    = plan?.subjects?.reduce((s: number, sub: any) => s + (sub.goalMinutes    || 0), 0) || 0;
    const totalStudied = plan?.subjects?.reduce((s: number, sub: any) => s + (sub.studiedMinutes || 0), 0) || 0;
    const completedTodos = todos.filter((t: any) => t.done).length;
    const totalTodos     = todos.length;
    let score = 0;
    if (totalGoal > 0) score += 40 * Math.min(totalStudied / totalGoal, 1);
    else if (totalStudied > 0) score += Math.min(totalStudied / 60 * 20, 30);
    if (totalTodos > 0) score += 25 * (completedTodos / totalTodos);
    score += Math.min(streak / 7, 1) * 15;
    return Math.round(score);
  }

  buildQuickStats(): void {
    const plan   = this.dayPlan; const todos = this.todos; const streak = this.computeStreak();
    const score  = this.computeScore(plan, todos, streak);
    const totalGoal    = plan?.subjects?.reduce((s: number, sub: any) => s + (sub.goalMinutes    || 0), 0) || 0;
    const totalStudied = plan?.subjects?.reduce((s: number, sub: any) => s + (sub.studiedMinutes || 0), 0) || 0;
    const progress     = totalGoal > 0 ? Math.round((totalStudied / totalGoal) * 100) : 0;
    const completedTodos = todos.filter((t: any) => t.done).length;
    this.currentScore.set(score);
    this.quickStats.set([
      { label: "Objectif du jour", value: `${progress}%`, icon: "track_changes",
        color: progress >= 100 ? "#34d399" : progress >= 50 ? "#fbbf24" : "#f87171",
        trend: `${this.formatMins(totalStudied)} / ${this.formatMins(totalGoal)}` },
      { label: "Tâches", value: `${completedTodos}/${todos.length}`, icon: "task_alt",
        color: "#60a5fa", trend: `${todos.length - completedTodos} restantes` },
      { label: "Série", value: `${streak}j`, icon: "local_fire_department",
        color: streak >= 3 ? "#f97316" : "#9898c0",
        trend: streak > 0 ? "Continuez !" : "Commencez aujourd'hui" },
      { label: "Matières", value: `${this.subjects.length}`, icon: "menu_book",
        color: "#a78bfa", trend: this.subjects.length > 0 ? "Actives" : "Aucune" }
    ]);
  }

  loadSessions(): void {
    try {
      const raw = localStorage.getItem("ai_sessions");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.sessions.set(
            parsed.slice(0, MAX_SESSIONS).map((s: any) => ({ ...s, createdAt: new Date(s.createdAt) }))
          );
        }
      }
    } catch {}
  }

  saveSessions(): void {
    try { localStorage.setItem("ai_sessions", JSON.stringify(this.sessions().slice(0, MAX_SESSIONS))); } catch {}
  }

  newSession(): void {
    const id = `sess_${Date.now()}`;
    const session: Session = { id, title: "Nouvelle conversation", preview: "", createdAt: new Date(), messageCount: 0 };
    this.sessions.update(s => [session, ...s].slice(0, MAX_SESSIONS));
    this.activeSessionId.set(id);
    this.messages.set([]);
    this.followUpSuggestions.set([]);
    this.stopStream();
    this.saveSessions();
    this.shouldScrollToBottom = true;
  }

  selectSession(session: Session): void {
    try {
      const raw = localStorage.getItem(`ai_msgs_${session.id}`);
      const parsed = raw ? JSON.parse(raw) : [];
      this.messages.set(Array.isArray(parsed) ? parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : []);
    } catch { this.messages.set([]); }
    this.activeSessionId.set(session.id);
    this.followUpSuggestions.set([]);
    this.stopStream();
    if (window.innerWidth < 1100) this.sidebarOpen.set(false);
    this.shouldScrollToBottom = true;
  }

  deleteSession(id: string, event: Event): void {
    event.stopPropagation();
    this.sessions.update(s => s.filter(sess => sess.id !== id));
    try { localStorage.removeItem(`ai_msgs_${id}`); } catch {}
    if (this.activeSessionId() === id) {
      const rem = this.sessions();
      if (rem.length > 0) this.selectSession(rem[0]); else this.newSession();
    }
    this.saveSessions();
  }

  startRename(session: Session, event: Event): void {
    event.stopPropagation();
    this.editingSessionId.set(session.id);
    this.renameTitleText.set(session.title);
    
    // Auto-focus the input
    setTimeout(() => {
      const el = document.querySelector('.ai-session-tile__rename-input') as HTMLInputElement;
      if (el) {
        el.focus();
        el.select();
      }
    }, 50);
  }

  saveRename(session: Session): void {
    if (!this.editingSessionId()) return;
    const newTitle = this.renameTitleText().trim();
    if (newTitle && newTitle !== session.title) {
      this.sessions.update(sessions => sessions.map(s => s.id === session.id ? { ...s, title: newTitle, manuallyRenamed: true } : s));
      this.saveSessions();
    }
    this.editingSessionId.set(null);
  }

  cancelRename(): void {
    this.editingSessionId.set(null);
  }

  saveMessages(): void {
    const sid = this.activeSessionId(); if (!sid) return;
    const msgs = this.messages();
    try { localStorage.setItem(`ai_msgs_${sid}`, JSON.stringify(msgs)); } catch {}
    const lastUser = [...msgs].reverse().find(m => m.role === "user");
    this.sessions.update(sessions => sessions.map(s => s.id === sid
      ? { ...s, title: (s.messageCount === 0 && !s.manuallyRenamed) ? (lastUser?.content.slice(0, 40) || "Conversation") : s.title,
          preview: lastUser?.content.slice(0, 60) || "", messageCount: msgs.length }
      : s));
    this.saveSessions();
  }

  send(): void {
    const text = this.inputText().trim();
    if (!text || this.isLoading()) return;
    this.inputText.set("");
    this.addUserMessage(text);
    this.askAI(text);
    if (this.inputRef?.nativeElement) this.inputRef.nativeElement.style.height = "auto";
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); this.send(); }
  }

  onInput(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
    this.inputText.set(el.value);
  }

  useSuggestion(text: string): void { this.inputText.set(text); this.send(); }

  addUserMessage(text: string): void {
    this.messages.update(m => [...m, { id: `msg_${Date.now()}`, role: "user", content: text, timestamp: new Date() }]);
    this.shouldScrollToBottom = true;
  }

  askAI(question: string): void {
    this.isLoading.set(true);
    this.followUpSuggestions.set([]);
    const thinkingId = `think_${Date.now()}`;
    this.messages.update(m => [...m, { id: thinkingId, role: "assistant", content: "", timestamp: new Date(), isThinking: true }]);
    this.shouldScrollToBottom = true;
    this.thinkingStage.set(0);
    let stageIdx = 0;
    if (this.thinkingTimer) clearInterval(this.thinkingTimer);
    this.thinkingTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, THINKING_STAGES.length - 1);
      this.thinkingStage.set(stageIdx);
    }, 1400);

    const context = this.buildContext();
    const history = this.messages()
      .filter(m => !m.isThinking && !m.isStreaming).slice(0, -1)
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    this.aiService.getStudyAdvice({ context, question, history }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.clearThinking(thinkingId);
        const text = (res.success && res.advice) ? res.advice : this.generateSmartResponse(context, question);
        this.startStream(text, (res.success && res.source === "gemini") ? "gemini" : "smart", question);
      },
      error: () => {
        this.clearThinking(thinkingId);
        this.startStream(this.generateSmartResponse(context, question), "smart", question);
      }
    });
  }

  private clearThinking(id: string): void {
    if (this.thinkingTimer) { clearInterval(this.thinkingTimer); this.thinkingTimer = null; }
    this.messages.update(m => m.filter(msg => msg.id !== id));
    this.isLoading.set(false);
  }

  startStream(fullText: string, source: string, question: string): void {
    this.stopStream();
    const msgId   = `msg_${Date.now()}`;
    const isAnalysis = /analy|journ.e/i.test(question);
    this.messages.update(m => [...m, {
      id: msgId, role: "assistant", content: "", timestamp: new Date(),
      isStreaming: true, source: source as any,
      analysisCard: isAnalysis ? this.buildAnalysisCard() : undefined
    }]);
    this.shouldScrollToBottom = true;
    const chars = fullText.split(""); let idx = 0;
    const charDelay = () => {
      const ch = chars[idx - 1];
      if (ch === "." || ch === "!" || ch === "?") return 80;
      if (ch === ",") return 35; if (ch === "\n") return 50; return 10;
    };
    const tick = () => {
      if (idx >= chars.length) {
        this.messages.update(msgs => msgs.map(m => m.id === msgId ? { ...m, isStreaming: false } : m));
        this.saveMessages(); this.setFollowUpSuggestions(question); return;
      }
      const batch = Math.min(3, chars.length - idx);
      const chunk = chars.slice(idx, idx + batch).join(""); idx += batch;
      this.messages.update(msgs => msgs.map(m => m.id === msgId ? { ...m, content: m.content + chunk } : m));
      if (idx % 50 === 0) this.shouldScrollToBottom = true;
      this.streamTimer = setTimeout(tick, charDelay());
    };
    this.streamTimer = setTimeout(tick, 150);
  }

  stopStream(): void {
    if (this.streamTimer)   { clearTimeout(this.streamTimer);   this.streamTimer = null; }
    if (this.thinkingTimer) { clearInterval(this.thinkingTimer); this.thinkingTimer = null; }
    this.isLoading.set(false);
    this.messages.update(msgs => msgs.filter(m => !m.isThinking).map(m => m.isStreaming ? { ...m, isStreaming: false } : m));
  }

  regenerateLastResponse(): void {
    const msgs = this.messages();
    const revIdx = [...msgs].reverse().findIndex(m => m.role === "user");
    if (revIdx === -1) return;
    const lastUser = [...msgs].reverse()[revIdx];
    this.messages.update(m => m.slice(0, msgs.length - 1 - revIdx + 1));
    this.followUpSuggestions.set([]);
    this.askAI(lastUser.content);
  }

  setFollowUpSuggestions(question: string): void {
    const q = question.toLowerCase();
    if (/analy|journ/.test(q))        this.followUpSuggestions.set(["Que réviser en priorité ?", "Crée mon plan pour demain", "Comment améliorer mon score ?"]);
    else if (/plan|demain/.test(q))   this.followUpSuggestions.set(["Analyse ma journée", "Comment va ma régularité ?", "Conseils de focus"]);
    else if (/serie|streak/.test(q))  this.followUpSuggestions.set(["Analyse ma journée", "Que réviser en priorité ?"]);
    else                               this.followUpSuggestions.set(["Analyse ma journée", "Que réviser en priorité ?"]);
  }

  copyMessage(content: string, msgId: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.copiedMsgId.set(msgId);
      setTimeout(() => this.copiedMsgId.set(null), 2000);
    }).catch(() => {});
  }

  buildAnalysisCard(): AnalysisCard {
    const plan = this.dayPlan; const todos = this.todos; const subjects = this.subjects;
    const streak = this.computeStreak(); const finalScore = this.computeScore(plan, todos, streak);
    const totalGoal    = plan?.subjects?.reduce((s: number, sub: any) => s + (sub.goalMinutes    || 0), 0) || 0;
    const totalStudied = plan?.subjects?.reduce((s: number, sub: any) => s + (sub.studiedMinutes || 0), 0) || 0;
    const progress     = totalGoal > 0 ? Math.min(totalStudied / totalGoal, 1) : 0;
    const completedTodos = todos.filter((t: any) => t.done).length; const totalTodos = todos.length;
    const scoreLabel = finalScore >= 85 ? "Excellente journée" : finalScore >= 65 ? "Bonne dynamique" : finalScore >= 40 ? "Journée correcte" : "À lancer";
    const trend = totalGoal > 0 ? (progress >= 1 ? "Objectif atteint" : `${Math.round(progress * 100)}% accompli`) : "Aucun planning défini";
    const strengths: Insight[] = []; const problems: Insight[] = [];
    if (streak >= 3)  strengths.push({ type: "positive", title: `Série de ${streak} jours`, detail: "La constance est le meilleur prédicteur de rétention." });
    if (progress >= 1) strengths.push({ type: "positive", title: "Objectif du jour atteint", detail: "100% du temps planifié réalisé." });
    else if (progress >= 0.5) strengths.push({ type: "info", title: `${Math.round(progress * 100)}% accompli`, detail: "Continuez pour maximiser votre score." });
    if (completedTodos === totalTodos && totalTodos > 0) strengths.push({ type: "positive", title: "Toutes les tâches terminées", detail: "Liste du jour entièrement cochée." });
    if (totalTodos > 0 && completedTodos < totalTodos) problems.push({ type: "warning", title: `${totalTodos - completedTodos} tâche(s) en attente`, detail: "Complétez-les pour un score optimal." });
    if (streak === 0) problems.push({ type: "info", title: "Aucune série active", detail: "Une session aujourd'hui relance le compteur." });
    if (totalGoal === 0) problems.push({ type: "warning", title: "Planning non défini", detail: "Créez un planning journalier pour suivre votre objectif." });
    const actionPlan: ActionItem[] = [];
    if (progress < 1 && totalGoal > 0) actionPlan.push({ label: `Étudier encore ${this.formatMins(Math.round(totalGoal - totalStudied))}`, priority: "high" });
    if (completedTodos < totalTodos)   actionPlan.push({ label: `Compléter ${totalTodos - completedTodos} tâche(s)`, priority: "medium" });
    if (actionPlan.length === 0)       actionPlan.push({ label: "Préparez demain pendant que tout est frais", priority: "low" });
    const planSubs = plan?.subjects || [];
    const totalMin = Math.max(planSubs.reduce((s: number, sub: any) => s + (sub.studiedMinutes || 0), 0), 1);
    const timeDistribution: TimeSlice[] = planSubs.filter((sub: any) => (sub.studiedMinutes || 0) > 0).map((sub: any) => {
      const found = subjects.find(s => s._id === (typeof sub.subjectId === "object" ? sub.subjectId?._id : sub.subjectId));
      return { label: found?.name || "Matière", minutes: sub.studiedMinutes || 0, share: (sub.studiedMinutes || 0) / totalMin, color: found?.color || "#8b5cf6" };
    });
    return { score: finalScore, scoreLabel, trend, strengths, problems, actionPlan, timeDistribution };
  }

  generateSmartResponse(ctx: any, question: string): string {
    const q = question.toLowerCase(); const score = this.currentScore() ?? 0;
    const streak = this.computeStreak(); const hour = new Date().getHours();
    const progress = ctx.progressPercentage ?? 0; const subs = this.subjects; const pending = ctx.pendingTodos ?? 0;
    const timeCtx = hour < 12 ? "Ce matin" : hour < 17 ? "Cet après-midi" : hour < 21 ? "Ce soir" : "Cette nuit";
    if (/analy|journ/.test(q)) {
      const emoji = score >= 65 ? "Bonne dynamique aujourd'hui !" : score >= 40 ? "Journée correcte — du potentiel encore exploitable." : "La journée reste à lancer — une session de 25 min peut tout changer.";
      return `**Analyse de votre journée — Score ${score}/100**\n\n${emoji}\n\n**${timeCtx}** · Progression : **${progress}%** de votre objectif journalier.\n\n` +
        (streak > 0 ? `**Série active** : ${streak} jour${streak > 1 ? "s" : ""} consécutifs.\n\n` : "") +
        (pending > 0 ? `**${pending} tâche${pending > 1 ? "s" : ""} en attente** à compléter.\n\n` : "") +
        `**Prochaine action** : ${progress < 100 && ctx.todayGoalMinutes > 0 ? `Complétez vos **${this.formatMins(ctx.todayGoalMinutes - ctx.todayStudiedMinutes)}** restantes.` : subs.length > 0 ? `Révisez **${subs[0].name}** pour consolider.` : "Préparez votre plan pour demain."}`;
    }
    if (/revis|priorit/.test(q)) {
      if (subs.length === 0) return "**Révisions prioritaires**\n\nAucune matière configurée. Créez vos matières dans l'onglet Subjects & Todo pour recevoir des recommandations personnalisées.";
      const top3 = subs.slice(0, 3).map((s, i) => `${i + 1}. **${s.name}**`).join("\n");
      return `**Révisions prioritaires — ${timeCtx}**\n\n${top3}\n\n` +
        (hour < 12 ? "Commencez par les concepts difficiles (pic de concentration matinal). Sessions de 45 min avec 10 min de pause."
         : hour < 17 ? "Alternez exercices pratiques et révisions. Sessions de 25 min (Pomodoro)."
         : "Privilégiez la révision légère sur la mémorisation active. Évitez les nouveaux concepts complexes le soir.") +
        "\n\nLa règle 80/20 : concentrez 80% de votre temps sur vos 2 matières prioritaires.";
    }
    if (/plan|demain/.test(q)) {
      const main = subs.length > 0 ? subs[0].name : "votre matière principale";
      return `**Plan optimal pour demain**\n\nMatin (6h-12h) — Pic de concentration\n• Ouvrez votre session avec **${main}**\n• Blocs de 45 min + 15 min de pause\n\nAprès-midi (13h-17h) — Consolidation\n• Exercices et applications pratiques\n• Revoyez les notes de la matinée\n\nSoir (18h-21h) — Révision légère\n• Flashcards et récapitulatif rapide\n• Préparez votre liste de tâches pour après-demain\n\n${streak > 0 ? `Continuez votre série de **${streak} jour${streak > 1 ? "s" : ""}** !` : "Demain est l'occasion parfaite de démarrer une série de régularité."}`;
    }
    if (/regular|streak|serie/.test(q)) {
      const msg = streak >= 14 ? `Série exceptionnelle de **${streak} jours** ! Vous êtes dans le top des apprenants réguliers.`
        : streak >= 7 ? `Série impressionnante de **${streak} jours** ! Une semaine complète de régularité.`
        : streak >= 3 ? `Bonne série de **${streak} jours** en cours.`
        : streak > 0  ? `Série de **${streak} jour${streak > 1 ? "s" : ""}** — continuez !`
        : "Aucune série active. Une session aujourd'hui relance le compteur à 1 !";
      return `**Votre régularité — ${msg}**\n\nLa science montre que **21 jours consécutifs** créent une habitude durable.\n\n` +
        `Cette semaine :\n${this.weeklyData().map((v, i) => `${this.weekDayLabels[i]} : ${v > 0 ? `${this.formatMins(v)}` : "aucune session"}`).join(" | ")}\n\n` +
        (streak < 7 ? "**Objectif** : atteindre **7 jours consécutifs** pour ancrer l'habitude." : "**Objectif suivant** : maintenir **30 jours** pour une mémoire à long terme optimale.");
    }
    if (/focus|pomodoro|concentr/.test(q)) {
      return `**Techniques de focus — ${timeCtx}**\n\nPomodoro adaptatif\n• 25 min focus -> 5 min pause (débutant)\n• 45 min focus -> 15 min pause (avancé)\n\nEnvironnement optimal\n• Téléphone hors de portée\n• Bruit blanc ou musique instrumentale\n• Lumière naturelle si possible\n\nHack de productivité\nCommencez par la tâche la plus difficile. Une fois accomplie, le reste paraît simple.\n\n${ctx.todayStudiedMinutes > 0 ? `Vous avez déjà étudié **${this.formatMins(ctx.todayStudiedMinutes)}** aujourd'hui — bravo !` : "Commencez par un bloc de **25 minutes** maintenant."}`;
    }
    if (/stat|semaine|performance|hebdo/.test(q)) {
      const total = this.weeklyData().reduce((a, b) => a + b, 0);
      const active = this.weeklyData().filter(v => v > 0).length;
      return `**Performance de la semaine**\n\nTotal étudié : ${this.formatMins(total)}\nJours actifs : ${active}/7\nMoyenne : ${this.formatMins(Math.round(total / 7))} / jour\n\n${total > 120 ? "Excellente semaine !" : total > 30 ? "Bonne base — augmentez progressivement." : "Commencez petit : 20 min/jour suffit pour démarrer."}`;
    }
    return `Basé sur vos données actuelles — **${progress}%** de l'objectif, **${streak}j** de série — concentrez-vous sur **${subs.length > 0 ? subs[0].name : "votre matière prioritaire"}** et complétez au moins un bloc de **25 minutes** ${timeCtx.toLowerCase()}.\n\n${pending > 0 ? `N'oubliez pas vos **${pending} tâche${pending > 1 ? "s" : ""}** en attente.` : "Votre liste de tâches est à jour — excellent !"}`;
  }

  buildContext(): any {
    const plan = this.dayPlan; const todos = this.todos;
    const totalGoal    = plan?.subjects?.reduce((s: number, sub: any) => s + (sub.goalMinutes    || 0), 0) || 0;
    const totalStudied = plan?.subjects?.reduce((s: number, sub: any) => s + (sub.studiedMinutes || 0), 0) || 0;
    const completedTodos = todos.filter((t: any) => t.done).length;
    const streak = this.computeStreak(); const score = this.computeScore(plan, todos, streak);
    return { date: this.formatDate(new Date()), nowHour: new Date().getHours(),
      todayGoalMinutes: totalGoal, todayStudiedMinutes: totalStudied,
      progressPercentage: totalGoal > 0 ? Math.round((totalStudied / totalGoal) * 100) : 0,
      totalTodos: todos.length, completedTodos, pendingTodos: todos.length - completedTodos,
      studyStreak: streak, currentScore: score, subjectCount: this.subjects.length,
      subjects: this.subjects.map(s => ({ name: s.name })),
      weeklyTotal: this.weeklyData().reduce((a, b) => a + b, 0),
      weeklyActiveDays: this.weeklyData().filter(v => v > 0).length,
    };
  }

  computeStreak(): number {
    if (!this.weekStats?.length) return 0;
    let streak = 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 0; i <= 29; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const plan = this.weekStats.find((p: any) => p.date === this.formatDate(d));
      const mins = plan?.subjects?.reduce((s: number, sub: any) => s + (sub.studiedMinutes || 0), 0) || 0;
      if (mins > 0) streak++; else if (i > 0) break;
    }
    return streak;
  }

  formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  formatMins(m: number): string {
    if (!m || m <= 0) return "0 min"; if (m < 60) return `${Math.round(m)} min`;
    const h = Math.floor(m / 60); const min = Math.round(m % 60);
    return min > 0 ? `${h}h${min}min` : `${h}h`;
  }

  formatTime(d: Date): string { return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }

  scoreColor(score: number): string {
    if (score >= 75) return "#34d399"; if (score >= 50) return "#fbbf24"; return "#f87171";
  }

  scoreGradient(score: number): string {
    const color = this.scoreColor(score); const deg = score * 3.6;
    return `conic-gradient(${color} 0deg, ${color} ${deg}deg, rgba(255,255,255,0.07) ${deg}deg)`;
  }

  sparklineHeight(val: number): number { return Math.round((val / this.sparklineMax()) * 100); }

  formatContent(content: string): string {
    return content
      .replace(/^#{1,3} (.+)$/gm, "<h4>$1</h4>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }

  scrollToEnd(): void {
    const el = this.chatScrollEl?.nativeElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }

  getThinkingStageText(): string { return THINKING_STAGES[this.thinkingStage()]; }

  navigateToDashboard(): void { this.router.navigate(["/dashboard"]); }

  isLastAssistantMessage(msgId: string): boolean {
    const assistantMsgs = this.messages().filter(m => m.role === "assistant" && !m.isThinking && !m.isStreaming);
    return assistantMsgs.length > 0 && assistantMsgs[assistantMsgs.length - 1].id === msgId;
  }
}
