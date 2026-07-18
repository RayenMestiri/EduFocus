import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, NgZone, HostListener, ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ThemeService } from '../../services/theme.service';

gsap.registerPlugin(ScrollTrigger);

interface Feature {
  icon: string;
  title: string;
  desc: string;
  color: string;
  colorRgb: string;
  badge?: string;
}

interface Stat {
  end: number;
  suffix: string;
  label: string;
  icon: string;
  current: number;
}

interface Step {
  num: string;
  icon: string;
  title: string;
  desc: string;
}

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  text: string;
  stars: number;
}

interface ShowcaseTab {
  label: string;
  icon: string;
  color: string;
  title: string;
  desc: string;
  route: string;
}

interface HeroSubject {
  label: string;
  pct: number;
  color: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('heroSection', { static: true }) heroRef!: ElementRef<HTMLElement>;

  // ── State ────────────────────────────────────────────────────────────────
  isScrolled = false;
  activeTab = 0;
  Math = Math;

  // ── Study Hub live preview — Pomodoro ─────────────────────────────────────
  pomoRemaining = 18 * 60 + 42;   // départ « pré-rempli » pour un anneau vivant
  pomoRunning   = false;
  pomoIsBreak   = false;
  pomoCycle     = 3;
  private pomoTimer: any = null;
  private readonly POMO_CIRC = 565.48;   // 2πr, r = 90
  waveBars = [42, 68, 55, 88, 46, 74, 60, 84, 50, 66, 40, 78];

  // ── Study Hub live preview — Flashcard SM-2 ───────────────────────────────
  flashFlipped    = false;
  flashStates     = ['NEW', 'LEARNING', 'REVIEW', 'MASTERED'];
  flashStateIndex = 1;            // LEARNING

  get pomoTotal(): number { return this.pomoIsBreak ? 5 * 60 : 25 * 60; }
  get pomoProgress(): number { return 1 - this.pomoRemaining / this.pomoTotal; }
  get pomoDashoffset(): number { return this.POMO_CIRC * (1 - this.pomoProgress); }

  formatPomo(): string {
    const m = Math.floor(this.pomoRemaining / 60);
    const s = this.pomoRemaining % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  togglePomo(): void {
    this.pomoRunning = !this.pomoRunning;
    this.pomoRunning ? this._startPomo() : this._stopPomo();
  }

  resetPomo(): void {
    this._stopPomo();
    this.pomoRunning = false;
    this.pomoIsBreak = false;
    this.pomoCycle = 3;
    this.pomoRemaining = 18 * 60 + 42;
  }

  private _startPomo(): void {
    this._stopPomo();
    this.pomoTimer = setInterval(() => this.zone.run(() => {
      if (this.pomoRemaining > 0) {
        this.pomoRemaining--;
      } else {
        this.pomoIsBreak = !this.pomoIsBreak;
        this.pomoRemaining = this.pomoTotal;
        if (!this.pomoIsBreak) this.pomoCycle = (this.pomoCycle % 4) + 1;
      }
    }), 1000);
  }

  private _stopPomo(): void {
    if (this.pomoTimer) { clearInterval(this.pomoTimer); this.pomoTimer = null; }
  }

  flipCard(): void { this.flashFlipped = !this.flashFlipped; }

  /** SM-2 : 0 Again · 1 Hard · 2 Good · 3 Easy → fait avancer la machine à états. */
  rateCard(grade: number): void {
    if (grade === 0)      this.flashStateIndex = Math.max(1, this.flashStateIndex - 1);
    else if (grade >= 2)  this.flashStateIndex = Math.min(3, this.flashStateIndex + 1);
    this.flashFlipped = false;   // carte suivante : on repart sur le recto
  }

  // ── Page data ─────────────────────────────────────────────────────────────
  heroSubjects: HeroSubject[] = [
    { label: 'Mathématiques', pct: 82, color: '#8b5cf6' },
    { label: 'Physique',      pct: 67, color: '#6366f1' },
    { label: 'Informatique',  pct: 91, color: '#22c55e' },
  ];

  stats: Stat[] = [
    { end: 15000, suffix: '+',  label: 'Étudiants actifs',    icon: 'groups',       current: 0 },
    { end: 4.9,   suffix: '/5', label: 'Note moyenne',         icon: 'star',         current: 0 },
    { end: 98,    suffix: '%',  label: 'Taux de réussite',     icon: 'emoji_events', current: 0 },
    { end: 340,   suffix: 'k+', label: 'Sessions planifiées',  icon: 'event_note',   current: 0 },
  ];

  features: Feature[] = [
    {
      icon: 'auto_stories',
      title: 'Notes Intelligentes',
      desc: 'Créez, organisez et retrouvez vos notes en un instant. Éditeur riche, tags, et protection par mot de passe.',
      color: '#facc15',
      colorRgb: '250,204,21',
      badge: 'Populaire',
    },
    {
      icon: 'event_note',
      title: 'Planificateur de Semaine',
      desc: 'Planifiez vos sessions d\'étude avec des blocs horaires colorés, rappels intelligents et vue hebdomadaire.',
      color: '#6366f1',
      colorRgb: '99,102,241',
    },
    {
      icon: 'dashboard',
      title: 'Dashboard Personnel',
      desc: 'Visualisez votre progression, vos matières et vos objectifs depuis un tableau de bord unifié.',
      color: '#22c55e',
      colorRgb: '34,197,94',
    },
    {
      icon: 'style',
      title: 'Flashcards Interactives',
      desc: 'Créez des flashcards avec la méthode Leitner. Révisez intelligemment grâce à la répétition espacée.',
      color: '#f97316',
      colorRgb: '249,115,22',
      badge: 'Nouveau',
    },
    {
      icon: 'quiz',
      title: 'QCM Adaptatifs',
      desc: 'Des quiz intelligents qui s\'adaptent à votre niveau. Créez vos propres QCM ou utilisez la banque de questions.',
      color: '#06b6d4',
      colorRgb: '6,182,212',
    },
    {
      icon: 'psychology',
      title: 'Assistant IA',
      desc: 'Posez vos questions à notre IA intégrée et obtenez des explications claires sur n\'importe quel sujet.',
      color: '#ec4899',
      colorRgb: '236,72,153',
      badge: 'IA',
    },
  ];

  showcaseTabs: ShowcaseTab[] = [
    {
      label: 'Notes',
      icon: 'auto_stories',
      color: '#facc15',
      title: 'Notes Intelligentes',
      desc: 'Un éditeur riche avec formatage Markdown, tags colorés, protection par mot de passe et recherche instantanée.',
      route: 'notes'
    },
    {
      label: 'Planning',
      icon: 'event_note',
      color: '#6366f1',
      title: 'Planificateur Hebdomadaire',
      desc: 'Visualisez votre semaine en un coup d\'œil. Drag & drop, sessions récurrentes et rappels automatiques.',
      route: 'planner'
    },
    {
      label: 'Dashboard',
      icon: 'dashboard',
      color: '#22c55e',
      title: 'Dashboard Analytique',
      desc: 'Graphiques de progression, statistiques par matière et suivi de vos objectifs en temps réel.',
      route: 'dashboard'
    },
    {
      label: 'Flashcards',
      icon: 'style',
      color: '#f97316',
      title: 'Flashcards par Répétition',
      desc: 'La méthode Leitner scientifiquement prouvée. Mémorisez plus avec moins de temps de révision.',
      route: 'study-hub/flashcards'
    },
    {
      label: 'QCM',
      icon: 'quiz',
      color: '#06b6d4',
      title: 'QCM Adaptatifs',
      desc: 'Des quiz qui s\'adaptent à votre niveau. Créez des packs de questions ou utilisez nos modèles.',
      route: 'study-hub/qcm'
    },
    {
      label: 'IA',
      icon: 'psychology',
      color: '#ec4899',
      title: 'Assistant IA Intégré',
      desc: 'Un assistant IA disponible 24h/24 pour répondre à vos questions, expliquer des concepts et vous aider.',
      route: 'chat'
    },
  ];

  steps: Step[] = [
    {
      num: '01',
      icon: 'person_add',
      title: 'Créez votre compte',
      desc: 'Inscription gratuite en moins de 30 secondes. Aucune carte bancaire requise.'
    },
    {
      num: '02',
      icon: 'tune',
      title: 'Configurez vos matières',
      desc: 'Ajoutez vos cours, définissez vos objectifs et personnalisez votre espace de travail.'
    },
    {
      num: '03',
      icon: 'rocket_launch',
      title: 'Commencez à étudier',
      desc: 'Planifiez, prenez des notes, révisez avec des flashcards et suivez vos progrès en temps réel.'
    },
  ];

  testimonials: Testimonial[] = [
    {
      name: 'Yasmine Saadi',
      role: 'Étudiante en Médecine, Alger',
      avatar: 'YS',
      stars: 5,
      text: 'EduFocus a complètement transformé ma façon de réviser. Les notes organisées et le planificateur m\'ont aidé à décrocher mon concours.',
    },
    {
      name: 'Rayan Benali',
      role: 'Prépa CPGE, Constantine',
      avatar: 'RB',
      stars: 5,
      text: 'L\'assistant IA est incroyable. Je peux poser mes questions à 2h du matin et obtenir des réponses claires. Vraiment un game changer.',
    },
    {
      name: 'Lina Chérif',
      role: 'Licence Informatique, Oran',
      avatar: 'LC',
      stars: 5,
      text: 'Le dashboard me montre exactement où j\'en suis. J\'adore voir mes progrès visuellement. C\'est motivant et très bien pensé.',
    },
  ];

  starsArray(n: number): number[] { return Array.from({ length: n }); }

  formatStat(s: Stat): string {
    if (s.end >= 100 && s.suffix !== '/5') return Math.round(s.current).toLocaleString('fr-FR') + s.suffix;
    return s.current.toFixed(s.end < 10 ? 1 : 0) + s.suffix;
  }

  setTab(i: number): void {
    this.activeTab = i;
  }

  constructor(private zone: NgZone, public themeService: ThemeService) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    requestAnimationFrame(() => setTimeout(() => this._initGSAP(), 80));
  }

  ngOnDestroy(): void {
    this._stopPomo();
    ScrollTrigger.getAll().forEach(t => t.kill());
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 40;
  }

  // Parallaxe douce du fond hero (aurora) suivant la souris — sans 3D.
  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    const el = this.heroRef?.nativeElement;
    if (!el) return;
    const px = (e.clientX / window.innerWidth) * 2 - 1;   // -1 → 1
    const py = (e.clientY / window.innerHeight) * 2 - 1;
    el.style.setProperty('--par-x', (px * 22).toFixed(1));
    el.style.setProperty('--par-y', (py * 22).toFixed(1));
  }

  // ════════════ GSAP ════════════
  private _initGSAP(): void {
    // Pre-hide scroll-animated elements
    gsap.set('.stat-card, .feat-card, .how-card, .testi-card, .cta-inner > *, .shp-card', { autoAlpha: 0 });
    gsap.set('.showcase', { autoAlpha: 0, y: 60 });

    // ── Hero entrance ───────────────────────────────────────────────────────
    const tl = gsap.timeline({ delay: 0.15 });
    tl
      .from('.hero__badge',     { y: 30, autoAlpha: 0, duration: 0.7, ease: 'power3.out' })
      .from('.js-hero-line',    { y: 80, autoAlpha: 0, duration: 1.1, stagger: 0.18, ease: 'expo.out' }, '-=0.3')
      .from('.hero__sub',       { y: 30, autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, '-=0.4')
      .from('.hero__actions',   { y: 20, autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3')
      .from('.hero__trust',     { y: 20, autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, '-=0.25')
      .from('.hero__visual',    { y: 60, autoAlpha: 0, scale: 0.92, duration: 1.2, ease: 'back.out(1.4)' }, '-=0.7')
      .from('.js-hv-pill',      { x: 50, autoAlpha: 0, duration: 0.7, stagger: 0.15, ease: 'back.out(2)' }, '-=0.6')
      .from('.js-hv-badge',     { scale: 0, autoAlpha: 0, duration: 0.5, stagger: 0.12, ease: 'back.out(3.5)' }, '-=0.4');

    // ── Section headers ─────────────────────────────────────────────────────
    gsap.utils.toArray<Element>('.section-header').forEach(el => {
      gsap.from(Array.from(el.children), {
        scrollTrigger: { trigger: el, start: 'top 88%' },
        y: 50, autoAlpha: 0, duration: 0.8, stagger: 0.12, ease: 'expo.out',
      });
    });

    // ── Stats counter ───────────────────────────────────────────────────────
    ScrollTrigger.create({
      trigger: '.stats-row',
      start: 'top 82%',
      onEnter: () => {
        gsap.utils.toArray<HTMLElement>('.stat-card').forEach((card, i) => {
          gsap.fromTo(card,
            { y: 80, autoAlpha: 0, scale: 0.75 },
            { y: 0, autoAlpha: 1, scale: 1, duration: 0.8, delay: i * 0.12, ease: 'back.out(2)' }
          );
        });
        this.stats.forEach((s, i) => {
          gsap.to(s, {
            current: s.end, duration: 2.4, delay: i * 0.12, ease: 'power3.out',
            onUpdate: () => this.zone.run(() => {}),
          });
        });
      },
      once: true,
    });

    // ── Feature cards ───────────────────────────────────────────────────────
    ScrollTrigger.create({
      trigger: '.feat-grid',
      start: 'top 85%',
      onEnter: () => {
        gsap.utils.toArray<HTMLElement>('.feat-card').forEach((card, i) => {
          gsap.fromTo(card,
            { y: 120, autoAlpha: 0, rotateX: 30, scale: 0.88, transformPerspective: 1000, transformOrigin: 'center bottom' },
            { y: 0, autoAlpha: 1, rotateX: 0, scale: 1, duration: 1.0, delay: i * 0.1, ease: 'expo.out', clearProps: 'rotateX,transformPerspective,transformOrigin' }
          );
        });
      },
      once: true,
    });

    // ── Study Hub live preview ──────────────────────────────────────────────
    ScrollTrigger.create({
      trigger: '.shp-grid',
      start: 'top 85%',
      onEnter: () => {
        gsap.utils.toArray<HTMLElement>('.shp-card').forEach((card, i) => {
          gsap.fromTo(card,
            { y: 90, autoAlpha: 0, rotateX: 24, scale: 0.9, transformPerspective: 1000, transformOrigin: 'center bottom' },
            { y: 0, autoAlpha: 1, rotateX: 0, scale: 1, duration: 1.0, delay: i * 0.14, ease: 'expo.out', clearProps: 'rotateX,transformPerspective,transformOrigin' }
          );
        });
      },
      once: true,
    });

    // ── Showcase ────────────────────────────────────────────────────────────
    gsap.fromTo('.showcase',
      { y: 60, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 1.0, ease: 'expo.out',
        scrollTrigger: { trigger: '.showcase', start: 'top 85%' } }
    );

    // ── How it works ────────────────────────────────────────────────────────
    ScrollTrigger.create({
      trigger: '.how-row',
      start: 'top 85%',
      onEnter: () => {
        gsap.utils.toArray<HTMLElement>('.how-card').forEach((card, i) => {
          gsap.fromTo(card,
            { x: i % 2 === 0 ? -100 : 100, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.9, delay: i * 0.18, ease: 'power3.out' }
          );
        });
      },
      once: true,
    });

    // ── Testimonials ────────────────────────────────────────────────────────
    ScrollTrigger.create({
      trigger: '.testi-grid',
      start: 'top 88%',
      onEnter: () => {
        gsap.utils.toArray<HTMLElement>('.testi-card').forEach((card, i) => {
          gsap.fromTo(card,
            { y: 90, autoAlpha: 0, scale: 0.72, filter: 'blur(12px)' },
            { y: 0, autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 1.0, delay: i * 0.18, ease: 'back.out(1.8)', clearProps: 'filter' }
          );
        });
      },
      once: true,
    });

    // ── CTA ────────────────────────────────────────────────────────────────
    gsap.fromTo('.cta-inner > *',
      { y: 50, autoAlpha: 0, scale: 0.92 },
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.85, stagger: 0.13, ease: 'back.out(1.8)',
        scrollTrigger: { trigger: '.cta-section', start: 'top 85%' } }
    );

    ScrollTrigger.refresh();

    setTimeout(() => this._initTilt(), 700);
  }

  private _initTilt(): void {
    document.querySelectorAll<HTMLElement>('.feat-card, .testi-card, .how-card').forEach(card => {
      card.addEventListener('mousemove', (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - 0.5) * 16;
        const y = ((e.clientY - r.top)  / r.height - 0.5) * -16;
        gsap.to(card, { rotateX: y, rotateY: x, duration: 0.35, ease: 'power2.out', transformPerspective: 900 });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }
}
