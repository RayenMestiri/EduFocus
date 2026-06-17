import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, NgZone, HostListener, ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
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

  @ViewChild('canvas3d', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // ── State ────────────────────────────────────────────────────────────────
  isScrolled = false;
  activeTab = 0;
  Math = Math;

  // ── Three.js ─────────────────────────────────────────────────────────────
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particles!: THREE.Points;
  private linesMesh!: THREE.LineSegments;
  private mouse = { x: 0, y: 0 };
  private animId = 0;

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
    this.zone.runOutsideAngular(() => {
      this._initThree();
      this._animate();
    });
    requestAnimationFrame(() => setTimeout(() => this._initGSAP(), 80));
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
    ScrollTrigger.getAll().forEach(t => t.kill());
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled = window.scrollY > 40;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }

  // ════════════ THREE.JS ════════════
  private _initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const W = window.innerWidth, H = window.innerHeight;

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    this.camera.position.z = 80;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const COUNT = 220;
    const positions = new Float32Array(COUNT * 3);
    const sizes     = new Float32Array(COUNT);
    const colors    = new Float32Array(COUNT * 3);

    const palette = [
      new THREE.Color('#6366f1'),
      new THREE.Color('#8b5cf6'),
      new THREE.Color('#a78bfa'),
      new THREE.Color('#4f46e5'),
      new THREE.Color('#06b6d4'),
      new THREE.Color('#ec4899'),
    ];

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 220;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 130;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 70;
      sizes[i] = Math.random() * 2.8 + 0.4;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    this.particles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.2, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true,
    }));
    this.scene.add(this.particles);

    // connecting lines
    const lp: number[] = [], lc: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const dx = positions[i*3]-positions[j*3];
        const dy = positions[i*3+1]-positions[j*3+1];
        const dz = positions[i*3+2]-positions[j*3+2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < 26) {
          lp.push(positions[i*3], positions[i*3+1], positions[i*3+2],
                  positions[j*3], positions[j*3+1], positions[j*3+2]);
          const a = (1 - dist / 26) * 0.45;
          lc.push(0.45*a, 0.38*a, 0.95*a, 0.45*a, 0.38*a, 0.95*a);
        }
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    lg.setAttribute('color',    new THREE.Float32BufferAttribute(lc, 3));
    this.linesMesh = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.22,
    }));
    this.scene.add(this.linesMesh);
  }

  private _animate(): void {
    this.animId = requestAnimationFrame(() => this._animate());
    const t = Date.now() * 0.0004;
    if (this.particles) {
      this.particles.rotation.y = t * 0.10 + this.mouse.x * 0.14;
      this.particles.rotation.x = t * 0.06 + this.mouse.y * 0.07;
      this.linesMesh.rotation.y = this.particles.rotation.y;
      this.linesMesh.rotation.x = this.particles.rotation.x;
    }
    this.renderer.render(this.scene, this.camera);
  }

  // ════════════ GSAP ════════════
  private _initGSAP(): void {
    // Pre-hide scroll-animated elements
    gsap.set('.stat-card, .feat-card, .how-card, .testi-card, .cta-inner > *', { autoAlpha: 0 });
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
