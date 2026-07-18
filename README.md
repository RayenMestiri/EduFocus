# EduFocus — Plateforme de Productivité et d'Études Premium

EduFocus est une application Web full-stack ultra-moderne conçue pour aider les étudiants à structurer leurs révisions, à maximiser leurs résultats et à organiser leur quotidien. Le système s'articule autour d'un frontend Angular performant et d'un backend Express connecté à MongoDB.

---

## ⚡ Stack Technique

### Frontend
- **Framework Core** : Angular 18 (Standalone Components, Signals réactifs, Routage modulaire)
- **Design & UI** : Tailwind CSS (Glassmorphism, animations fluides), SweetAlert2 (Modaux et toasts premium)
- **Visualisation & Plannings** : GSAP (ScrollTrigger pour la Landing Page), FullCalendar (Day Planner interactif)
- **Internationalisation** : Module ngx-translate (support multilingue Français/Anglais)

### Backend
- **Serveur API** : Node.js + Express
- **Base de données** : MongoDB via Mongoose ODM
- **Sécurité & Auth** : Authentification par jeton JWT Bearer, hachage des mots de passe avec bcrypt

---

## 🚀 Détails des Fonctionnalités du Système

Le système est découpé en plusieurs modules fonctionnels, chacun gérant une partie spécifique du parcours de l'étudiant.

### 1. 🔐 Authentification & Sécurité Globale
L'application utilise un système d'authentification robuste basé sur les tokens JWT (JSON Web Tokens).
- **Inscription Interactive** : Le formulaire d'inscription intègre un validateur de mot de passe en temps réel. Il vérifie la présence de majuscules, chiffres, caractères spéciaux et la longueur minimale, affichant des indicateurs visuels (vert/gris) pour guider l'utilisateur.
- **Gestion des Sessions** : Une fois connecté, un token JWT est stocké de manière sécurisée. L'application utilise un **HTTP Interceptor** dans Angular pour attacher automatiquement ce token (via l'en-tête `Authorization: Bearer <token>`) à chaque requête sortante vers l'API.
- **Protection des Routes (AuthGuard)** : Les pages privées (Dashboard, Notes, Study Hub) sont protégées par des Guards Angular qui redirigent vers la page de connexion si le token est invalide ou absent.

### 2. 📊 Espace de Travail Central (Dashboard & Suivi)
Le tableau de bord est le centre névralgique de l'application, utilisant les **Signals Angular** pour des mises à jour d'état réactives.
- **Moteur de Statistiques** : Le backend calcule les points d'expérience (XP) et le "Streak" (jours consécutifs d'étude) en analysant les journaux de session (`StudySession`). Ces données sont affichées dynamiquement sur le frontend.
- **Gestionnaire de Matières (Subjects)** : Les étudiants peuvent créer des matières avec des objectifs temporels spécifiques. L'interface utilise des barres de progression circulaires (SVG animés) pour illustrer l'avancement.
- **Pomodoro Intelligent & Ambiance** : Un minuteur Pomodoro personnalisable gère les cycles de concentration (ex: 25min travail / 5min pause). Un lecteur audio intégré lit des sons d'ambiance (lo-fi, pluie) via des API externes pour favoriser l'immersion.
- **Coach IA (Intégration Gemini)** : Un module envoie les données de performance de l'utilisateur (temps étudié, scores aux quiz) à l'API Gemini de Google, qui génère en retour des conseils personnalisés pour optimiser les révisions.

### 3. 📝 Gestionnaire de Notes Avancé
Un système de prise de notes structuré conçu pour la révision rapide.
- **Système de Tags & Filtres** : Chaque note peut recevoir de multiples étiquettes. Le frontend implémente un système de filtrage en temps réel basé sur ces tags sans avoir besoin de recharger la page.
- **Épinglage et Archivage** : Les notes peuvent changer d'état, modifiant instantanément leur positionnement sur l'interface via des animations fluides   CSS.

### 4. 🎓 Study Hub : Outils d'Apprentissage Actif
Le module le plus complexe, structuré autour du concept de "Study Packs" (modules de révision).

- **Seeding & Génération de Contenu** : L'API est capable d'injecter des données pré-construites (ex: packs de révision T-SQL avec quiz, flashcards et exercices) lors de l'initialisation pour fournir un environnement d'apprentissage prêt à l'emploi.
- **🎴 Moteur de Flashcards & Algorithme SRS (Spaced Repetition System)** :
  - **Interface 3D** : Les cartes utilisent la perspective CSS (`transform-style: preserve-3d`) pour une animation de retournement réaliste.
  - **Algorithme d'Apprentissage SM-2 (SuperMemo)** : Planificateur intelligent basé sur l'algorithme d'Anki pour maximiser la mémorisation à long terme. L'utilisateur note sa rétention à l'aide de 4 choix :
    - `0 = À revoir (Again)` : Réinitialise l'intervalle à 0, repasse la carte en état `learning` (1 min), diminue la facilité de `0.2` et incrémente le compteur d'oublis (`lapses`).
    - `1 = Difficile (Hard)` : Réduit la facilité de `0.15` et multiplie l'intervalle par `1.2` en révision.
    - `2 = Bien (Good)` : Progression classique SM-2 (multiplie l'intervalle par la facilité).
    - `3 = Facile (Easy)` : Augmente la facilité de `0.15` et applique un bonus d'intervalle de `1.3` supplémentaire.
  - **Machine à États Récursive** :
    $$\text{NEW} \rightarrow \text{LEARNING} \rightarrow \text{REVIEW} \rightarrow \text{MASTERED}$$
    Si l'utilisateur oublie une carte (bouton `0`), elle quitte son état actuel pour retourner en apprentissage court terme (`LEARNING`).
  - **Critères de Maîtrise (MASTERED)** : Une carte atteint cet état si son intervalle de révision calcule $\ge 21\text{ jours}$ et que son facteur de facilité est $\ge 2.5$.
- **❓ Système de Quizzes Dynamiques** :
  - Support multi-formats : Choix multiples, Vrai/Faux, saisie libre.
  - **Moteur d'évaluation** : Le backend ou le composant (selon la configuration) évalue les réponses instantanément, affiche des alertes (via SweetAlert2) pour les erreurs fréquentes et fournit des explications détaillées de la bonne réponse.
- **📜 Cheat Sheets Responsives** :
  - Des fiches de triche (Cheat Sheets) techniques sont affichées dans une grille CSS (`grid-template-columns`). Sur mobile, des "Media Queries" spécifiques réorganisent les cartes en pile verticale (`flex-direction: column`) pour assurer la lisibilité du code.
- **💻 Sandboxes (Exercices Interactifs)** :
  - Le système propose des environnements simulés avec des questions de code, un éditeur de texte intégré et un bouton pour vérifier la syntaxe ou afficher la solution du tuteur.

---

## 📂 Détails de l'Architecture (Frontend & Backend)

EduFocus suit une architecture découplée (Séparation des préoccupations).

### Architecture Frontend (Angular 18)
L'application client utilise les paradigmes modernes d'Angular :
- **Standalone Components** : L'application n'utilise pas de `NgModule`. Chaque composant (ex: `LoginComponent`, `StudyPackDetailComponent`) déclare lui-même ses dépendances (directives, pipes, autres composants), ce qui améliore le Tree-Shaking et réduit la taille du bundle.
- **Gestion d'État Réactive (Signals)** : Au lieu de RxJS complexes pour des états simples, le projet utilise les `Signals` d'Angular (`signal`, `computed`, `effect`) pour rendre la donnée réactive de manière synchrone. Par exemple, quand l'utilisateur met à jour un thème ou termine un pomodoro, le signal se propage instantanément dans toute l'interface.
- **Services Centralisés** : Les appels API sont isolés dans des services injectables (ex: `AuthService`, `StudyHubService`). Ils gèrent les requêtes `HttpClient` et formatent les réponses pour les composants.
- **Routage et Lazy Loading** : Les routes sont définies dans `app.routes.ts`. Certaines parties (comme l'interface d'administration si présente) peuvent être chargées paresseusement pour optimiser le temps de chargement initial.

### Architecture Backend (Express & MongoDB)
Le serveur Node.js est conçu selon le modèle classique MVC (Model-View-Controller) adapté pour les API REST :
- **Couche Modèles (Mongoose)** : Dans le dossier `models/`, des schémas stricts sont définis. Par exemple, le modèle `User` contient des "hooks" pré-sauvegarde (`pre('save')`) pour hacher automatiquement le mot de passe avec `bcrypt` avant l'insertion en base.
- **Couche Contrôleurs / Routes** : Le dossier `routes/` agit comme des contrôleurs. Chaque fichier (ex: `auth.routes.js`, `study-hub.routes.js`) exporte un routeur Express qui gère des endpoints spécifiques (GET, POST, PUT, DELETE). Les contrôleurs extraient les données de `req.body`, interagissent avec la base de données via Mongoose, et renvoient les données au format JSON.
- **Couche Middlewares** :
  - **Auth Middleware** : Intercepte les requêtes nécessitant une authentification, extrait le token du header `Authorization`, le vérifie avec `jsonwebtoken` et la clé secrète (`JWT_SECRET`), et injecte les informations de l'utilisateur dans l'objet de requête (`req.user`) pour les contrôleurs suivants.
  - **Error Handling** : Gestion centralisée des erreurs (try/catch dans des blocs async) pour renvoyer des codes HTTP cohérents (400, 401, 404, 500).
- **Communication Base de Données** : La connexion à MongoDB Atlas est initialisée dans `server.js` via `mongoose.connect()`.

---

## 🛠️ Démarrage Local

### Configuration des variables d'environnement (.env)
Créez un fichier `backend/.env` avec les valeurs suivantes :
```env
MONGODB_URI=mongodb+srv://<USER>:<PASSWORD>@cluster.mongodb.net/edufocus
JWT_SECRET=votre_cle_secrete_super_securisee
JWT_EXPIRE=30d
PORT=5000
FRONTEND_URL=http://localhost:4200

# Optionnel : Clé d'accès à l'API IA (Gemini)
GEMINI_API_KEY=votre_cle_gemini
```

### Lancement
1. **Démarrer l'API** :
   ```bash
   cd backend
   npm install
   npm start
   ```
   *L'API tourne par défaut sur* : `http://localhost:5000`

2. **Démarrer le client Web** :
   ```bash
   cd frontend
   npm install
   npm start
   ```
   *L'application est accessible sur* : `http://localhost:4200`
