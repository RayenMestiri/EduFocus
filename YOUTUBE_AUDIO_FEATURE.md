# 🎵 Fonctionnalité Audio de Relaxation YouTube

## 📋 Vue d'ensemble
Les utilisateurs peuvent maintenant ajouter un lien YouTube qui sera joué en audio de fond pendant les pauses de relaxation du timer Pomodoro.

## ✨ Fonctionnalités

### 1. **Configuration de l'Audio**
- Champ dans les paramètres du timer pour entrer un lien YouTube
- Validation du lien avec bouton "🔍 Tester"
- Vérification si la vidéo existe avant de sauvegarder
- Sauvegarde dans localStorage + base de données MongoDB

### 2. **Lecture Automatique**
- L'audio démarre automatiquement quand la pause de relaxation commence
- Lecture en arrière-plan (player invisible)
- Volume réglé à 50% par défaut
- Arrêt automatique quand la pause se termine

### 3. **Formats de Liens Supportés**
```
✅ https://www.youtube.com/watch?v=VIDEO_ID
✅ https://youtu.be/VIDEO_ID
✅ https://www.youtube.com/embed/VIDEO_ID
✅ VIDEO_ID (ID directe de 11 caractères)
```

### 4. **Validation Intelligente**
- Extraction automatique de l'ID vidéo depuis différents formats
- Vérification via l'API YouTube oEmbed
- Messages d'erreur clairs si le lien est invalide ou la vidéo n'existe pas

## 🔧 Implémentation Technique

### Backend

#### Modèle User (`backend/models/User.js`)
```javascript
studySettings: {
  // ... autres champs
  relaxationAudioUrl: { type: String, default: '' }
}
```

#### Routes API (`backend/routes/auth.js`)
- **GET** `/api/auth/timer-settings` - Récupère tous les paramètres (inclut relaxationAudioUrl)
- **PUT** `/api/auth/timer-settings` - Met à jour les paramètres (inclut relaxationAudioUrl)

### Frontend

#### Composant Dashboard
**Nouvelles propriétés:**
```typescript
timerSettings = {
  // ... autres champs
  relaxationAudioUrl: ''
}

youtubePlayer: any = null
youtubePlayerReady = signal<boolean>(false)
```

**Méthodes principales:**

1. `loadYouTubeAPI()` - Charge l'API YouTube IFrame Player
   - Injecte le script YouTube
   - Configure le callback `onYouTubeIframeAPIReady`

2. `extractYouTubeVideoId(url: string)` - Extrait l'ID vidéo
   - Support de multiples formats d'URL
   - Patterns regex pour validation

3. `playYouTubeAudio()` - Joue l'audio
   - Crée un player invisible
   - Démarre la lecture automatiquement
   - Gestion des erreurs

4. `stopYouTubeAudio()` - Arrête l'audio
   - Détruit le player
   - Nettoie les ressources

5. `testYouTubeUrl()` - Teste la validité du lien
   - Utilise YouTube oEmbed API
   - Affiche un message de confirmation/erreur

#### UI Components

**Champ dans les paramètres:**
```html
<!-- Input avec validation -->
<input 
  type="text" 
  [(ngModel)]="timerSettings.relaxationAudioUrl"
  placeholder="https://youtube.com/watch?v=..."
/>
<button (click)="testYouTubeUrl()">🔍 Tester</button>
```

**Indicateur dans la modal de relaxation:**
```html
@if (timerSettings.relaxationAudioUrl) {
  <div class="animate-pulse">
    🎵 Audio de relaxation en cours...
  </div>
}
```

## 🎯 Flux d'utilisation

### Configuration
1. Ouvrir les paramètres du timer
2. Entrer un lien YouTube dans le champ "Audio de Relaxation YouTube"
3. Cliquer sur "🔍 Tester" pour vérifier
4. Sauvegarder les paramètres (localStorage + base de données)

### Pendant l'utilisation
1. Compléter une session focus
2. La pause de relaxation commence
3. ✅ **L'audio YouTube démarre automatiquement**
4. La modal de relaxation affiche "🎵 Audio de relaxation en cours..."
5. L'audio continue pendant toute la pause
6. ✅ **L'audio s'arrête automatiquement** à la fin de la pause

## 🛡️ Gestion des erreurs

### Erreurs possibles et solutions

1. **Lien invalide**
   ```
   Erreur: "URL Invalide - Le lien YouTube n'est pas valide"
   Solution: Vérifier le format du lien
   ```

2. **Vidéo introuvable**
   ```
   Erreur: "Vidéo Introuvable - Cette vidéo n'existe pas ou est privée"
   Solution: Utiliser une vidéo publique accessible
   ```

3. **Erreur de lecture**
   ```
   Erreur: "Erreur Audio - Impossible de lire la vidéo YouTube"
   Solution: La vidéo peut avoir des restrictions (âge, région, etc.)
   ```

## 💾 Persistence des données

### localStorage (Instantané)
```javascript
timerSettings: {
  relaxationAudioUrl: "https://youtube.com/watch?v=..."
}
```

### MongoDB (Synchronisation)
```javascript
user.preferences.studySettings.relaxationAudioUrl: String
```

**Stratégie:**
- Chargement: Base de données → localStorage
- Sauvegarde: localStorage (immédiat) + Base de données (async)
- Offline: Utilise localStorage comme fallback

## 🎨 Recommandations de contenu

**Types de vidéos idéales:**
- 🧘 Musiques de méditation
- 🌊 Sons de la nature (pluie, océan, forêt)
- 🎵 Musique lo-fi
- 🎹 Musique instrumentale calme
- 📻 Ambient music

**Exemples populaires:**
- Lofi hip hop radio
- Calm meditation music
- Nature sounds (rain, ocean waves)
- Peaceful piano music

## 🚀 Améliorations futures possibles

1. **Volume control** - Slider pour ajuster le volume
2. **Playlist support** - Support de playlists YouTube
3. **Local audio** - Support de fichiers audio locaux
4. **Spotify integration** - Intégration avec Spotify
5. **Audio presets** - Bibliothèque de sons pré-configurés
6. **Fade in/out** - Transitions douces au début/fin

## 🔒 Sécurité et Performance

- ✅ Player invisible (pas de vidéo affichée)
- ✅ Gestion mémoire (destruction du player)
- ✅ Validation côté client et serveur
- ✅ Pas de téléchargement (streaming uniquement)
- ✅ Utilisation de l'API officielle YouTube

## 📱 Compatibilité

- ✅ Chrome, Firefox, Safari, Edge
- ✅ Desktop et Mobile
- ✅ Fonctionne avec la modal de relaxation
- ⚠️ Nécessite connexion internet pour streaming

## 🐛 Debugging

**Logs console:**
```javascript
✅ YouTube API loaded
🎵 YouTube audio playing
⏸️ YouTube audio stopped
⚠️ Invalid YouTube URL
❌ YouTube player error: [code]
```

**Vérifier:**
1. API YouTube chargée: `console.log((window as any).YT)`
2. Player créé: Vérifier `youtubePlayer` dans le composant
3. Lien valide: Tester dans le navigateur
4. Console erreurs: F12 → Console

---

**Professionnel, élégant et fonctionnel!** 🎯
