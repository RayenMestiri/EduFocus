import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ElementRef, ViewChild, NgZone, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

interface Feature {
  icon: string;
  title: string;
  desc: string;
  color: string;
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

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('canvas3d', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  // ── Three.js internals ──────────────────────────────────────────────────
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particles!: THREE.Points;
  private linesMesh!: THREE.LineSegments;
  private mouse = { x: 0, y: 0 };
  private animId = 0;

  // ── Page data ───────────────────────────────────────────────────────────
  stats: Stat[] = [
    { end: 15000, suffix: '+', label: 'Étudiants actifs',    icon: 'groups',       current: 0 },
    { end: 4.9,   suffix: '/5', label: 'Note moyenne',        icon: 'star',         current: 0 },
    { end: 98,    suffix: '%',  label: 'Taux de réussite',    icon: 'emoji_events', current: 0 },
    { end: 340,   suffix: 'k+', label: 'Sessions planifiées', icon: 'event_note',   current: 0 },
  ];

  features: Feature[] = [
    {
      icon: 'auto_stories',
      title: 'Notes Intelligentes',
      desc: 'Créez, organisez et retrouvez vos notes en un instant. Éditeur riche, tags, et protection par mot de passe.',
      color: '#facc15',
      badge: 'Populaire',
    },
    {
      icon: 'event_note',
      title: 'Planificateur de Semaine',
      desc: 'Planifiez vos sessions d\'étude avec des blocs horaires colorés et des rappels intelligents.',
      color: '#6366f1',
    },
    {
      icon: 'dashboard',
      title: 'Dashboard Personnel',
      desc: 'Visualisez votre progression, vos matières et vos objectifs depuis un tableau de bord unifié.',
      color: '#22c55e',
    },
    {
      icon: 'psychology',
      title: 'Assistant IA',
      desc: 'Posez vos questions à notre IA intégrée et obtenez des explications claires sur n\'importe quel sujet.',
      color: '#ec4899',
      badge: 'Nouveau',
    },
    {
      icon: 'insights',
      title: 'Suivi de Progression',
      desc: 'Graphiques et statistiques détaillés pour comprendre vos habitudes d\'étude et vos points faibles.',
      color: '#06b6d4',
    },
    {
      icon: 'lock',
      title: 'Données Sécurisées',
      desc: 'Vos notes et données sont chiffrées et protégées. Votre vie privée est notre priorité absolue.',
      color: '#8b5cf6',
    },
  ];

  steps: Step[] = [
    { num: '01', icon: 'person_add', title: 'Créez votre compte', desc: 'Inscription gratuite en moins de 30 secondes. Aucune carte bancaire requise.' },
    { num: '02', icon: 'tune',        title: 'Configurez vos matières', desc: 'Ajoutez vos cours, définissez vos objectifs et personnalisez votre espace.' },
    { num: '03', icon: 'rocket_launch', title: 'Commencez à étudier', desc: 'Planifiez, prenez des notes et suivez vos progrès en temps réel.' },
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
      text: 'Le dashboard me montre exactement où j\'en suis. J\'adore voir mes progrès visuellement. C\'est motivant et bien pensé.',
    },
  ];

  starsArray(n: number): number[] { return Array.from({ length: n }); }

  formatStat(s: Stat): string {
    if (s.end >= 100 && s.suffix !== '/5') return Math.round(s.current).toLocaleString('fr-FR') + s.suffix;
    return s.current.toFixed(s.end < 10 ? 1 : 0) + s.suffix;
  }

  constructor(private zone: NgZone) {}

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

  // ════════════ THREE.JS — login/register palette network ════════════
  private _initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const W = window.innerWidth, H = window.innerHeight;

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
    this.camera.position.z = 80;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const COUNT = 180;
    const positions = new Float32Array(COUNT * 3);
    const sizes     = new Float32Array(COUNT);
    const colors    = new Float32Array(COUNT * 3);

    const palette = [
      new THREE.Color('#facc15'),
      new THREE.Color('#fde047'),
      new THREE.Color('#6366f1'),
      new THREE.Color('#8b5cf6'),
      new THREE.Color('#22c55e'),
    ];

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
      sizes[i] = Math.random() * 2.5 + 0.5;
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

    // connecting lines between close particles
    const lp: number[] = [], lc: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const dx = positions[i*3]-positions[j*3];
        const dy = positions[i*3+1]-positions[j*3+1];
        const dz = positions[i*3+2]-positions[j*3+2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < 28) {
          lp.push(positions[i*3], positions[i*3+1], positions[i*3+2],
                  positions[j*3], positions[j*3+1], positions[j*3+2]);
          const a = (1 - dist / 28) * 0.5;
          lc.push(0.96*a, 0.62*a, 0.14*a, 0.96*a, 0.62*a, 0.14*a);
        }
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    lg.setAttribute('color',    new THREE.Float32BufferAttribute(lc, 3));
    this.linesMesh = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.28,
    }));
    this.scene.add(this.linesMesh);
  }

  private _animate(): void {
    this.animId = requestAnimationFrame(() => this._animate());
    const t = Date.now() * 0.0004;
    if (this.particles) {
      this.particles.rotation.y = t * 0.12 + this.mouse.x * 0.15;
      this.particles.rotation.x = t * 0.07 + this.mouse.y * 0.08;
      this.linesMesh.rotation.y = this.particles.rotation.y;
      this.linesMesh.rotation.x = this.particles.rotation.x;
    }
    this.renderer.render(this.scene, this.camera);
  }

  // ════════════ GSAP ════════════
  private _initGSAP(): void {
    // pre-hide scroll-animated elements
    gsap.set(
      '.stat-card, .feat-card, .step-card, .testi-card, .cta-inner > *',
      { autoAlpha: 0 }
    );

    // ── Hero entrance ──────────────────────────────────────────────────────
    const tl = gsap.timeline({ delay: 0.1 });
    tl
      .from('.hero-eyebrow',  { y: 30, autoAlpha: 0, duration: 0.7, ease: 'power3.out' })
      .from('.hero-h1 .line', { y: 70, autoAlpha: 0, duration: 1.0, stagger: 0.18, ease: 'expo.out' }, '-=0.3')
      .from('.hero-sub',      { y: 30, autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, '-=0.35')
      .from('.hero-actions',  { y: 20, autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, '-=0.3')
      .from('.hero-trust',    { y: 20, autoAlpha: 0, duration: 0.5, ease: 'power2.out' }, '-=0.25')
      .from('.hero-visual',   { y: 50, autoAlpha: 0, scale: 0.94, duration: 1.1, ease: 'back.out(1.4)' }, '-=0.6')
      .from('.vis-pill',      { x: 40, autoAlpha: 0, duration: 0.7, stagger: 0.15, ease: 'back.out(2)' }, '-=0.5')
      .from('.vis-badge',     { scale: 0, autoAlpha: 0, duration: 0.5, stagger: 0.12, ease: 'back.out(3)' }, '-=0.3');

    // ── Section headers ────────────────────────────────────────────────────
    gsap.utils.toArray<Element>('.sec-header').forEach(el => {
      gsap.from(Array.from(el.children), {
        scrollTrigger: { trigger: el, start: 'top 88%' },
        y: 50, autoAlpha: 0, duration: 0.75, stagger: 0.13, ease: 'expo.out',
      });
    });

    // ── Stats counter cascade ──────────────────────────────────────────────
    ScrollTrigger.create({
      trigger: '.stats-row',
      start: 'top 80%',
      onEnter: () => {
        gsap.utils.toArray<HTMLElement>('.stat-card').forEach((card, i) => {
          gsap.fromTo(card,
            { y: 70, autoAlpha: 0, scale: 0.78 },
            { y: 0, autoAlpha: 1, scale: 1, duration: 0.75, delay: i * 0.13, ease: 'back.out(1.9)' }
          );
          const icon = card.querySelector('.stat-icon');
          if (icon) gsap.fromTo(icon,
            { rotate: -90, scale: 0 },
            { rotate: 0, scale: 1, duration: 0.6, delay: i * 0.13 + 0.12, ease: 'back.out(3)' }
          );
        });
        this.stats.forEach((s, i) => {
          gsap.to(s, {
            current: s.end, duration: 2.2, delay: i * 0.13, ease: 'power3.out',
            onUpdate: () => this.zone.run(() => {}),
          });
        });
      },
      once: true,
    });

    // ── Feature cards — 3D flip cascade ───────────────────────────────────
    ScrollTrigger.create({
      trigger: '.feat-grid',
      start: 'top 84%',
      onEnter: () => {
        gsap.utils.toArray<HTMLElement>('.feat-card').forEach((card, i) => {
          gsap.fromTo(card,
            { y: 110, autoAlpha: 0, rotateX: 28, scale: 0.9, transformPerspective: 900, transformOrigin: 'center bottom' },
            { y: 0, autoAlpha: 1, rotateX: 0, scale: 1, duration: 0.9, delay: i * 0.12, ease: 'expo.out', clearProps: 'rotateX,transformPerspective,transformOrigin' }
          );
        });
      },
      once: true,
    });

    // ── Steps — slide alternating ─────────────────────────────────────────
    ScrollTrigger.create({
      trigger: '.steps-row',
      start: 'top 84%',
      onEnter: () => {
        gsap.utils.toArray<HTMLElement>('.step-card').forEach((card, i) => {
          gsap.fromTo(card,
            { x: i % 2 === 0 ? -80 : 80, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: 0.85, delay: i * 0.16, ease: 'power3.out' }
          );
        });
      },
      once: true,
    });

    // ── Testimonials — depth blur reveal ─────────────────────────────────
    ScrollTrigger.create({
      trigger: '.testi-grid',
      start: 'top 88%',
      onEnter: () => {
        gsap.utils.toArray<HTMLElement>('.testi-card').forEach((card, i) => {
          gsap.fromTo(card,
            { y: 90, autoAlpha: 0, scale: 0.74, filter: 'blur(10px)' },
            { y: 0, autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.95, delay: i * 0.2, ease: 'back.out(1.7)', clearProps: 'filter' }
          );
        });
      },
      once: true,
    });

    // ── CTA section ───────────────────────────────────────────────────────
    gsap.fromTo('.cta-inner > *',
      { y: 45, autoAlpha: 0, scale: 0.94 },
      { y: 0, autoAlpha: 1, scale: 1, duration: 0.78, stagger: 0.14, ease: 'back.out(1.6)',
        scrollTrigger: { trigger: '.cta-section', start: 'top 84%' } }
    );
    gsap.to('.cta-blob-1', { scrollTrigger: { trigger: '.cta-section', scrub: 1.5 }, x: 60, y: -40, scale: 1.3 });
    gsap.to('.cta-blob-2', { scrollTrigger: { trigger: '.cta-section', scrub: 1.5 }, x: -50, y: 40, scale: 1.2 });

    ScrollTrigger.refresh();

    setTimeout(() => this._initTilt(), 600);
  }

  private _initTilt(): void {
    document.querySelectorAll<HTMLElement>('.feat-card, .testi-card').forEach(card => {
      card.addEventListener('mousemove', (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  - 0.5) * 18;
        const y = ((e.clientY - r.top)  / r.height - 0.5) * -18;
        gsap.to(card, { rotateX: y, rotateY: x, duration: 0.4, ease: 'power2.out', transformPerspective: 800 });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }
}
