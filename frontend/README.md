# 🌐 EduFocus Frontend — Client Web Premium (Angular 18)

EduFocus Frontend est le client web de la plateforme de productivité et d'apprentissage pour étudiants, conçu avec **Angular 18**. Il s'appuie sur une interface utilisateur moderne et hautement interactive, tirant parti d'animations fluides, d'effets visuels 3D, de la réactivité des signaux (Signals), et de l'intégration de services IA.

---

## ✨ Fonctionnalités Clés

### 1. Landing Page Marketing de Premier Plan 🚀
* **Héros interactif** : Rendu de particules 3D dynamiques animé avec **Three.js**.
* **Transitions fluides** : Révélations de sections et effets au défilement alimentés par **GSAP** (GreenSock) et *ScrollTrigger*.
* **Aperçu produit** : Présentation interactive du fonctionnement et des bénéfices de l'écosystème EduFocus.

### 2. Espace d'Authentification Sécurisé 🔑
* Double-thème (sombre/clair) persistant pour la connexion et l'inscription.
* Contrôle de force du mot de passe en temps réel et validation stricte côté client.
* Flux complet de récupération de mot de passe par boîte de dialogue interactive.

### 3. Tableau de Bord Personnel (Dashboard) 📊
* **Gestion des matières** : Création, coloration et suivi statistique.
* **Gestion de tâches (TodoList)** : Système de gestion de tâches haut de gamme avec alertes contextuelles via **SweetAlert2**.
* **Minuteur Pomodoro** :
  * Cycles alternés d'étude et de pause entièrement configurables.
  * Persistance des réglages locaux et synchronisation avec le serveur.
  * Musique d'ambiance intégrée en option (lecteur YouTube relaxant).

### 4. Assistant d'Études IA 🤖
* Conseils d'apprentissage sur-mesure basés sur votre progression, le niveau d'urgence des devoirs et les objectifs fixés.
* Intégration de l'assistant IA (Gemini API) pour guider l'étudiant pas-à-pas.

### 5. Agenda d'Études Interactif (Day Planner) 📅
* Planification calendaire performante s'appuyant sur **FullCalendar**.
* Glisser-déposer de sessions d'étude par matière pour chaque journée.

### 6. Module de Notes Avancé 📝
* Catégorisation, tags, épinglage, archivage et palettes de couleurs par note.
* Option de chiffrement/verrouillage par mot de passe pour les notes confidentielles.

---

## 🛠️ Stack Technique

* **Framework principal** : Angular 18.2 s'appuyant sur les **Standalone Components** et la gestion d'état réactive via les **Angular Signals**.
* **Moteur d'animation** : GSAP (GreenSock) pour les mouvements complexes.
* **Rendu 3D** : Three.js pour le fond de particules dynamique de la landing page.
* **Calendrier** : FullCalendar pour l'affichage de l'agenda hebdomadaire et mensuel.
* **Alertes UI** : SweetAlert2 configuré avec des thèmes harmonieux.
* **Design & CSS** : Tailwind CSS pour un rendu épuré et entièrement responsive.

---

## 🏗️ Structure du Projet

```
src/
├── app/
│   ├── app.routes.ts         # Définition des routes et lazy loading
│   ├── components/           # Composants partagés (Navbar, Sidebar, Modals...)
│   ├── interceptors/         # Functional authInterceptor (injection du token JWT Bearer)
│   ├── guards/               # AuthGuard pour protéger l'accès au tableau de bord
│   ├── services/             # Services d'accès à l'API backend et stockage local
│   └── views/                # Pages principales (Home, Login, Dashboard, Planner, Notes...)
├── assets/                   # Fichiers statiques et images
└── environments/             # Fichiers de configuration (Dev vs Prod)
```

---

## 💻 Installation et Lancement en Développement

### 1. Prérequis
Assurez-vous d'avoir installé **Node.js** (v18+) et **npm**.

### 2. Installer les dépendances
```bash
npm install
```

### 3. Lancer le serveur de développement
```bash
npm start
```
L'application sera accessible par défaut sur : [http://localhost:4200](http://localhost:4200).

### 4. Build de production
Pour générer les fichiers compilés optimisés dans le répertoire `dist/` :
```bash
npm run build
```

---

## ⚙️ Configuration de l'API

L'adresse de l'API backend appelée par Angular est configurée dans le fichier d'environnement correspondant :
* **Développement** (`src/environments/environment.ts`) : pointe par défaut sur `http://localhost:5002` (ou le serveur local).
* **Production** (`src/environments/environment.prod.ts`) : pointe sur l'instance Render déployée (`https://edufocus-cpbo.onrender.com`).
