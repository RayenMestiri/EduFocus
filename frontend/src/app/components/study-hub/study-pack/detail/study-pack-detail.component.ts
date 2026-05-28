import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudyHubService } from '../../../../services/study-hub.service';
import { ThemeService } from '../../../../services/theme.service';
import { StudyPack, Note, Flashcard, QCM, QuizAttempt } from '../../../../models/study-hub.model';

@Component({
  selector: 'app-study-pack-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './study-pack-detail.component.html',
})
export class StudyPackDetailComponent implements OnInit {
  studyHubService = inject(StudyHubService);
  themeService = inject(ThemeService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  // Reactive state using Signals
  packId = signal<string>('');
  pack = computed(() => {
    const id = this.packId();
    return id ? this.studyHubService.studyPacks().find(p => p.id === id) : undefined;
  });

  activeTab = signal<'notes' | 'flashcards' | 'quiz' | 'cheatsheets' | 'exercises'>('notes');

  // Interactive details readers
  viewingNote = signal<Note | null>(null);
  viewingQuiz = signal<QCM | null>(null);

  // Template copy copy-toast signal
  templateCopied = signal<'notes' | 'flashcards' | 'quiz' | 'cheatsheets' | 'exercises' | null>(null);

  // Notes Modals and Forms
  showNoteModal = signal(false);
  isEditingNote = signal(false);
  noteForm = {
    id: '',
    title: '',
    content: '',
    tagsString: '',
    isPinned: false
  };
  showNoteImportModal = signal(false);
  noteImportData = '';

  // Flashcards Modals and Forms
  showFlashcardModal = signal(false);
  isEditingFlashcard = signal(false);
  flashcardForm = {
    id: '',
    front: '',
    back: '',
    code: ''
  };
  showFlashcardImportModal = signal(false);
  flashcardImportData = '';

  // Quizzes (QCM) Modals and Forms
  showQuizModal = signal(false);
  isEditingQuiz = signal(false);
  quizForm = {
    id: '',
    question: '',
    type: 'multiple-choice' as 'multiple-choice' | 'true-false' | 'fill-blanks',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correctAnswerMc: 0,
    correctAnswerTf: 'True',
    correctAnswerFb: '',
    explanation: '',
    trapNote: '',
    topic: ''
  };
  showQuizImportModal = signal(false);
  quizImportData = '';

  // Cheat Sheets Modals and Forms
  showCheatSheetModal = signal(false);
  isEditingCheatSheet = signal(false);
  cheatSheetForm = {
    id: '',
    title: '',
    category: '',
    itemsString: '',
    codeSample: ''
  };
  showCheatSheetImportModal = signal(false);
  cheatSheetImportData = '';

  // Coding Exercises Modals and Forms
  showExerciseModal = signal(false);
  isEditingExercise = signal(false);
  exerciseForm = {
    id: '',
    title: '',
    description: '',
    schemaContext: '',
    task: '',
    correctSolution: '',
    solutionNote: ''
  };
  showExerciseImportModal = signal(false);
  exerciseImportData = '';
  
  exerciseSolutionVisible = signal<Record<string, boolean>>({});
  exerciseInputs = signal<Record<string, string>>({});
  hoveredIndex = signal<number | null>(null);
  hoveredCopyIndex = signal<number | null>(null);
  quizAttempts = signal<QuizAttempt[]>([]);
  String = String;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.packId.set(id);
      
      // Ensure study packs are freshly sync'd from the backend on detail load
      this.studyHubService.refreshPacks();

      // Robust async polling: only check presence once loading has completed
      const checkInterval = setInterval(() => {
        if (!this.studyHubService.isLoading()) {
          clearInterval(checkInterval);
          
          const currentPack = this.pack();
          if (!currentPack) {
            this.router.navigate(['/study-hub']);
            return;
          }

          // Detect SQL/T-SQL subjects to automatically seed premium reference data if tabs are completely empty
          const isSqlPack = currentPack.title?.toLowerCase().includes('sql') || currentPack.subject?.toLowerCase().includes('sql');
          if (isSqlPack) {
            if (!currentPack.cheatsheets || currentPack.cheatsheets.length === 0) {
              this.seedDefaultSqlCheatSheets(currentPack);
            }
            if (!currentPack.exercises || currentPack.exercises.length === 0) {
              this.seedDefaultSqlExercises(currentPack);
            }
          }
          
          if (this.activeTab() === 'quiz') {
            this.loadQuizAttempts();
          }
        }
      }, 50);
    }
  }

  seedDefaultSqlCheatSheets(pack: StudyPack) {
    const defaultSheets = [
      {
        id: crypto.randomUUID(),
        category: 'Index',
        title: 'Index — Limites & Seuils',
        items: [
          { key: 'Clustered', value: '1 seul par table (données triées)' },
          { key: 'Non-Clustered', value: 'Jusqu\'à 999 par table' },
          { key: 'Fillfactor < 30%', value: 'REORGANIZE (Online, léger)' },
          { key: 'Fillfactor > 30%', value: 'REBUILD (Offline, lourd)' },
          { key: 'Seek vs Scan', value: 'Seek = ciblé (rapide), Scan = complet (lent)' },
          { key: 'Complexité B-Tree', value: 'O(log n)' }
        ],
        codeSample: 'CREATE UNIQUE CLUSTERED INDEX idx_emp_id ON Employes(id);\nCREATE NONCLUSTERED INDEX idx_emp_dept ON Employes(dept) INCLUDE(nom, salaire);',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        category: 'Vues',
        title: 'Vues — Règles de modification (DML)',
        items: [
          { key: 'Vue simple', value: 'DML possible (1 seule table)' },
          { key: 'Vue complexe', value: 'DML impossible (jointures, agrégats)' },
          { key: 'WITH CHECK OPTION', value: 'Bloque les INSERT violant le WHERE' },
          { key: 'WITH SCHEMABINDING', value: 'Lie la vue aux tables physiques' },
          { key: 'Vue indexée', value: 'WITH SCHEMABINDING + Index unique clustered' },
          { key: 'Vue indexée interdits', value: 'Pas de DISTINCT, GROUP BY ou UNION' }
        ],
        codeSample: 'CREATE VIEW vw_IT_Emp WITH SCHEMABINDING AS\n  SELECT id, nom, dept FROM dbo.Employes WHERE dept = \'IT\';\nGO\nCREATE UNIQUE CLUSTERED INDEX idx_vw_it ON vw_IT_Emp(id);',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        category: 'Triggers',
        title: 'Triggers — Tables Virtuelles & Actions',
        items: [
          { key: 'AFTER (FOR)', value: 'S\'exécute après la validation DML' },
          { key: 'INSTEAD OF', value: 'Remplace l\'opération DML d\'origine' },
          { key: 'INSERTED table', value: 'Nouvelles valeurs (INSERT/UPDATE)' },
          { key: 'DELETED table', value: 'Anciennes valeurs (UPDATE/DELETE)' },
          { key: 'Sévérité RAISERROR >= 19', value: 'Déclenche un ROLLBACK automatique' },
          { key: 'Trigger DDL', value: 'ON DATABASE / ON ALL SERVER (CREATE/DROP)' }
        ],
        codeSample: 'CREATE TRIGGER tr_AuditEmp ON Employes AFTER INSERT\nAS BEGIN\n  INSERT INTO Log(msg) SELECT CONCAT(\'New: \', nom) FROM inserted;\nEND;',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        category: 'Transactions',
        title: 'Transactions — Propriétés ACID & Verrous',
        items: [
          { key: 'Atomicité', value: 'Tout ou rien (COMMIT / ROLLBACK)' },
          { key: 'Cohérence', value: 'Respect permanent des contraintes' },
          { key: 'Isolation', value: 'Transactions indépendantes (Niveaux de verrous)' },
          { key: 'Durabilité', value: 'Sauvegarde persistante après panne' },
          { key: 'SET XACT_ABORT ON', value: 'Rollback total immédiat sur erreur' },
          { key: 'Deadlock victim error', value: 'Erreur 1205 (SQL Server choisit la moins chère)' }
        ],
        codeSample: 'SET XACT_ABORT ON;\nBEGIN TRANSACTION;\n  UPDATE Comptes SET solde = solde - 100 WHERE id = 1;\n  UPDATE Comptes SET solde = solde + 100 WHERE id = 2;\nCOMMIT;',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        category: 'Statistiques',
        title: 'Statistiques — Seuils & Optimisation',
        items: [
          { key: 'Seuil MAJ auto', value: '20% de lignes modifiées' },
          { key: 'Seuil Full scan', value: '> 50% de la table cible' },
          { key: 'FULLSCAN vs SAMPLE', value: 'FULLSCAN = lit 100%, SAMPLE = lit N%' },
          { key: 'Stats obsolètes', value: 'Recherches lentes malgré index' },
          { key: 'DBCC SHOW_STATISTICS', value: 'Affiche les stats de l\'index' },
          { key: 'WITH RECOMPILE', value: 'Force le recalcul du plan d\'exécution' }
        ],
        codeSample: 'UPDATE STATISTICS Employes idx_emp_dept WITH FULLSCAN;\nEXEC sp_updatestats;',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        category: 'T-SQL',
        title: 'T-SQL — Syntaxes Fondamentales',
        items: [
          { key: 'Déclarer variable', value: 'DECLARE @nom TYPE' },
          { key: 'Assigner variable', value: 'SET @nom = val ou SELECT @nom = col' },
          { key: 'Afficher variable', value: 'PRINT @nom ou SELECT @nom' },
          { key: 'Batch separator', value: 'GO (Sépare les variables locales)' },
          { key: 'Curseur exit status', value: '@@FETCH_STATUS = 0 (Boucle WHILE)' },
          { key: 'Répéter Batch N fois', value: 'GO N (Répète le batch N fois)' }
        ],
        codeSample: 'DECLARE @salaire DECIMAL(10,2);\nSELECT @salaire = AVG(salaire) FROM Employes;\nPRINT CONCAT(\'Moyenne: \', @salaire);\nGO 5',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        category: 'Raiserror',
        title: 'Gestion d\'Erreurs & Sévérités',
        items: [
          { key: 'Sévérité < 10', value: 'Messages d\'information' },
          { key: 'Sévérité 11-18', value: 'Erreurs utilisateur courantes' },
          { key: 'Sévérité 19-25', value: 'Erreurs système fatales (Rollback)' },
          { key: 'THROW vs RAISERROR', value: 'THROW s\'exécute plus rapidement (sévérité 16)' },
          { key: '@@ERROR status', value: '0 = Succès, sinon code d\'erreur' },
          { key: 'TRY...CATCH block', value: 'Capture les erreurs fatales en T-SQL' }
        ],
        codeSample: 'BEGIN TRY\n  INSERT INTO Employes(id) VALUES(1);\nEND TRY\nBEGIN CATCH\n  THROW 50000, \'Erreur d\'\'insertion fatale\', 1;\nEND CATCH;',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        category: 'Ordre',
        title: 'Ordre d\'exécution Logique SQL',
        items: [
          { key: 'Étape 1 & 2', value: 'FROM, puis JOIN + ON' },
          { key: 'Étape 3 & 4', value: 'WHERE, puis GROUP BY' },
          { key: 'Étape 5 & 6', value: 'HAVING, puis SELECT' },
          { key: 'Étape 7', value: 'DISTINCT' },
          { key: 'Étape 8 & 9', value: 'ORDER BY, puis TOP' },
          { key: 'Note importante', value: 'FROM s\'exécute toujours en premier !' }
        ],
        codeSample: 'SELECT TOP 10 dept, SUM(salaire) AS total\nFROM Employes\nWHERE active = 1\nGROUP BY dept\nHAVING SUM(salaire) > 50000\nORDER BY total DESC;',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        category: 'Types',
        title: 'Types de données T-SQL',
        items: [
          { key: 'INT', value: 'Entier 32 bits (-2 milliards à +2 milliards)' },
          { key: 'DECIMAL(p,s)', value: 'Précision de p chiffres, s après la virgule' },
          { key: 'VARCHAR(n)', value: 'Non-Unicode, 1 octet/caractère (ASCII)' },
          { key: 'NVARCHAR(n)', value: 'Unicode (N-Varchar), 2 octets/caractère' },
          { key: 'BIT', value: '0, 1, ou NULL (Faux, Vrai, Inconnu)' },
          { key: 'DATETIME', value: 'Date et heure précises (8 octets)' }
        ],
        codeSample: 'DECLARE @nom NVARCHAR(100) = N\'Rayen Mestiri\';\nDECLARE @active BIT = 1;\nDECLARE @note DECIMAL(4,2) = 17.50;',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        category: 'Blocs',
        title: 'Blocs & Modularité',
        items: [
          { key: 'BEGIN...END block', value: 'Groupe plusieurs requêtes en une' },
          { key: 'Procédures stockées', value: 'Prend des entrées, fait des DML, retourne OUTPUT' },
          { key: 'Fonctions utilisateurs', value: 'Fonctions scalaires / table-valued (Pas de DML)' },
          { key: 'Fonctions Inline', value: 'RETURNS TABLE, plus rapide (pas de BEGIN/END)' },
          { key: 'Fonctions Multi-Statement', value: 'RETURNS @t TABLE, contient BEGIN/END' },
          { key: 'GO separator', value: 'Sépare physiquement les batches SQL' }
        ],
        codeSample: 'CREATE FUNCTION dbo.fn_CalculTVA (@prixHT DECIMAL(10,2))\nRETURNS DECIMAL(10,2)\nAS BEGIN\n  RETURN @prixHT * 1.19;\nEND;',
        createdAt: new Date()
      }
    ];
    this.studyHubService.updatePack(pack.id, { cheatsheets: defaultSheets });
  }

  seedDefaultSqlExercises(pack: StudyPack) {
    const defaultExercises = [
      {
        id: crypto.randomUUID(),
        title: 'Calculer et afficher une mention',
        description: 'Déclare une variable @note à 14.5. Utilise un bloc IF/ELSE pour afficher la mention correspondante.',
        schemaContext: 'Table: Etudiants(id INT, nom NVARCHAR(50), note DECIMAL(5,2))',
        task: 'Écrire le bloc T-SQL complet avec DECLARE, SET, et IF/ELSE/IF.',
        correctSolution: 'DECLARE @note DECIMAL(5,2);\nSET @note = 14.5;\n\nIF @note >= 14\n    PRINT \'Mention Bien\';\nELSE IF @note >= 12\n    PRINT \'Mention Assez Bien\';\nELSE\n    PRINT \'Ajourné\';',
        solutionNote: 'Les blocs IF sans BEGIN...END n\'exécutent qu\'une seule instruction. Pour plusieurs instructions, utilise BEGIN...END.',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        title: 'Curseur sur les employés IT',
        description: 'Crée un curseur qui parcourt tous les employés du département "IT" et affiche leur nom + salaire.',
        schemaContext: 'Table: Employes(id INT, nom NVARCHAR(100), salaire DECIMAL(10,2), dept NVARCHAR(50))',
        task: 'Écrire le code complet : DECLARE CURSOR, OPEN, FETCH, boucle WHILE, CLOSE, DEALLOCATE.',
        correctSolution: 'DECLARE @nom NVARCHAR(100), @salaire DECIMAL(10,2);\n\nDECLARE emp_cur CURSOR FOR\n    SELECT nom, salaire FROM Employes WHERE dept = \'IT\';\n\nOPEN emp_cur;\nFETCH NEXT FROM emp_cur INTO @nom, @salaire;\n\nWHILE @@FETCH_STATUS = 0\nBEGIN\n    PRINT CONCAT(@nom, \' - Salaire: \', CAST(@salaire AS NVARCHAR(20)));\n    FETCH NEXT FROM emp_cur INTO @nom, @salaire;\nEND\n\nCLOSE emp_cur;\nDEALLOCATE emp_cur;',
        solutionNote: 'Toujours faire un FETCH avant la boucle WHILE (premier FETCH), puis un FETCH à la fin de chaque itération. Sans ça, boucle infinie.',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        title: 'Fonction de calcul de TVA',
        description: 'Crée une fonction scalaire dbo.fn_CalculTVA qui prend un prix HT (DECIMAL) et retourne le prix TTC avec une TVA de 19%.',
        schemaContext: 'Pas de table requise — fonction pure',
        task: 'Écrire CREATE FUNCTION avec les bons types de retour et l\'appel SELECT.',
        correctSolution: 'CREATE FUNCTION dbo.fn_CalculTVA (@prixHT DECIMAL(10,2))\nRETURNS DECIMAL(10,2)\nAS\nBEGIN\n    RETURN @prixHT * 1.19;\nEND;\nGO\n\n-- Appel\nSELECT dbo.fn_CalculTVA(100.00) AS PrixTTC;',
        solutionNote: 'Rappel important : les fonctions ne peuvent pas modifier les données (pas d\'INSERT/UPDATE/DELETE). Toujours préciser dbo. lors de l\'appel.',
        createdAt: new Date()
      },
      {
        id: crypto.randomUUID(),
        title: 'Procédure de transfert de stock',
        description: 'Crée une procédure sp_TransfererStock qui transfère une quantité d\'un dépôt à un autre. Elle doit vérifier que la quantité disponible est suffisante, et retourner un code de statut (0=succès, 1=erreur).',
        schemaContext: 'Table: Stock(produitID INT, quantite INT, depot NVARCHAR(50))',
        task: 'Écrire CREATE PROCEDURE avec paramètres INPUT, vérification, transaction, et RETURN.',
        correctSolution: 'CREATE PROCEDURE dbo.sp_TransfererStock\n    @produitID INT,\n    @depotSource NVARCHAR(50),\n    @depotDest NVARCHAR(50),\n    @quantite INT\nAS\nBEGIN\n    DECLARE @dispo INT;\n\n    SELECT @dispo = quantite FROM Stock\n    WHERE produitID = @produitID AND depot = @depotSource;\n\n    IF @dispo IS NULL OR @dispo < @quantite\n    BEGIN\n        RAISERROR(\'Stock insuffisant\', 16, 1);\n        RETURN 1;\n    END\n\n    BEGIN TRANSACTION;\n        UPDATE Stock SET quantite = quantite - @quantite\n        WHERE produitID = @produitID AND depot = @depotSource;\n\n        UPDATE Stock SET quantite = quantite + @quantite\n        WHERE produitID = @produitID AND depot = @depotDest;\n    COMMIT;\n\n    RETURN 0;\nEND;\nGO',
        solutionNote: 'Une procédure avec transaction doit gérer les erreurs. En production, utilise TRY/CATCH avec ROLLBACK dans le CATCH.',
        createdAt: new Date()
      }
    ];
    this.studyHubService.updatePack(pack.id, { exercises: defaultExercises });
  }

  deletePack() {
    const currentPack = this.pack();
    if (currentPack && confirm('Are you sure you want to delete this Study Pack?')) {
      this.studyHubService.deletePack(currentPack.id);
      this.router.navigate(['/study-hub']);
    }
  }

  loadQuizAttempts() {
    const currentPack = this.pack();
    if (currentPack) {
      this.studyHubService.getQuizAttempts(currentPack.id).subscribe({
        next: (res) => {
          if (res && res.success) {
            this.quizAttempts.set(res.data);
          }
        },
        error: (err) => {
          console.error('Failed to load quiz attempts:', err);
        }
      });
    }
  }

  selectTab(tab: 'notes' | 'flashcards' | 'quiz' | 'cheatsheets' | 'exercises') {
    this.activeTab.set(tab);
    if (tab === 'quiz') {
      this.loadQuizAttempts();
    }
  }

  // ==========================================
  // NOTES WORKSPACE LOGIC
  // ==========================================

  openAddNoteModal() {
    this.isEditingNote.set(false);
    this.noteForm = {
      id: '',
      title: '',
      content: '',
      tagsString: '',
      isPinned: false
    };
    this.showNoteModal.set(true);
  }

  openEditNoteModal(note: Note, event?: Event) {
    if (event) event.stopPropagation();
    this.isEditingNote.set(true);
    this.noteForm = {
      id: note.id,
      title: note.title,
      content: note.content,
      tagsString: note.tags ? note.tags.join(', ') : '',
      isPinned: note.isPinned || false
    };
    this.showNoteModal.set(true);
  }

  saveNote() {
    const currentPack = this.pack();
    if (!currentPack) return;

    const tags = this.noteForm.tagsString
      ? this.noteForm.tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0)
      : [];

    let updatedNotes = currentPack.notes ? [...currentPack.notes] : [];

    if (this.isEditingNote()) {
      updatedNotes = updatedNotes.map(n =>
        n.id === this.noteForm.id
          ? {
              ...n,
              title: this.noteForm.title,
              content: this.noteForm.content,
              tags,
              isPinned: this.noteForm.isPinned,
              updatedAt: new Date()
            }
          : n
      );
    } else {
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: this.noteForm.title || 'Untitled Note',
        content: this.noteForm.content,
        tags,
        isPinned: this.noteForm.isPinned,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      updatedNotes.push(newNote);
    }

    this.studyHubService.updatePack(currentPack.id, { notes: updatedNotes });
    this.showNoteModal.set(false);
  }

  deleteNote(noteId: string, event: Event) {
    event.stopPropagation();
    const currentPack = this.pack();
    if (!currentPack || !confirm('Are you sure you want to delete this note?')) return;

    const updatedNotes = currentPack.notes.filter(n => n.id !== noteId);
    this.studyHubService.updatePack(currentPack.id, { notes: updatedNotes });
  }

  togglePinNote(note: Note, event: Event) {
    event.stopPropagation();
    const currentPack = this.pack();
    if (!currentPack) return;

    const updatedNotes = currentPack.notes.map(n =>
      n.id === note.id ? { ...n, isPinned: !n.isPinned } : n
    );
    this.studyHubService.updatePack(currentPack.id, { notes: updatedNotes });
  }

  openNoteReader(note: Note) {
    this.viewingNote.set(note);
  }

  closeNoteReader() {
    this.viewingNote.set(null);
  }

  openNoteImportModal() {
    this.noteImportData = '';
    this.showNoteImportModal.set(true);
  }

  importNotesFromJson() {
    const currentPack = this.pack();
    if (!currentPack) return;

    try {
      const parsed = JSON.parse(this.noteImportData);
      if (Array.isArray(parsed)) {
        const validatedNotes: Note[] = parsed.map(n => ({
          id: n.id || crypto.randomUUID(),
          title: n.title || 'Imported Note',
          content: n.content || '',
          tags: Array.isArray(n.tags) ? n.tags : [],
          isPinned: !!n.isPinned,
          createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
          updatedAt: new Date()
        }));

        const updatedNotes = [...(currentPack.notes || []), ...validatedNotes];
        this.studyHubService.updatePack(currentPack.id, { notes: updatedNotes });
        this.showNoteImportModal.set(false);
      } else {
        alert('JSON must be an array of notes');
      }
    } catch (e) {
      alert('Invalid JSON structure. Please check and try again.');
    }
  }

  // ==========================================
  // FLASHCARDS WORKSPACE LOGIC
  // ==========================================

  openAddFlashcardModal() {
    this.isEditingFlashcard.set(false);
    this.flashcardForm = {
      id: '',
      front: '',
      back: '',
      code: ''
    };
    this.showFlashcardModal.set(true);
  }

  openEditFlashcardModal(card: Flashcard) {
    this.isEditingFlashcard.set(true);
    this.flashcardForm = {
      id: card.id,
      front: card.front,
      back: card.back,
      code: card.code || ''
    };
    this.showFlashcardModal.set(true);
  }

  saveFlashcard() {
    const currentPack = this.pack();
    if (!currentPack) return;

    let updatedCards = currentPack.flashcards ? [...currentPack.flashcards] : [];

    if (this.isEditingFlashcard()) {
      updatedCards = updatedCards.map(c =>
        c.id === this.flashcardForm.id
          ? {
              ...c,
              front: this.flashcardForm.front,
              back: this.flashcardForm.back,
              code: this.flashcardForm.code ? this.flashcardForm.code.trim() : undefined
            }
          : c
      );
    } else {
      const newCard: Flashcard = {
        id: crypto.randomUUID(),
        front: this.flashcardForm.front,
        back: this.flashcardForm.back,
        code: this.flashcardForm.code ? this.flashcardForm.code.trim() : undefined,
        createdAt: new Date()
      };
      updatedCards.push(newCard);
    }

    this.studyHubService.updatePack(currentPack.id, { flashcards: updatedCards });
    this.showFlashcardModal.set(false);
  }

  deleteFlashcard(cardId: string) {
    const currentPack = this.pack();
    if (!currentPack || !confirm('Are you sure you want to delete this flashcard?')) return;

    const updatedCards = currentPack.flashcards.filter(c => c.id !== cardId);
    this.studyHubService.updatePack(currentPack.id, { flashcards: updatedCards });
  }

  openFlashcardImportModal() {
    this.flashcardImportData = '';
    this.showFlashcardImportModal.set(true);
  }

  importFlashcardsFromJson() {
    const currentPack = this.pack();
    if (!currentPack) return;

    try {
      const parsed = JSON.parse(this.flashcardImportData);
      if (Array.isArray(parsed)) {
        const validatedCards: Flashcard[] = parsed.map(c => ({
          id: c.id || crypto.randomUUID(),
          front: c.front || 'Question?',
          back: c.back || 'Answer',
          code: c.code || undefined,
          difficulty: c.difficulty,
          createdAt: new Date()
        }));

        const updatedCards = [...(currentPack.flashcards || []), ...validatedCards];
        this.studyHubService.updatePack(currentPack.id, { flashcards: updatedCards });
        this.showFlashcardImportModal.set(false);
      } else {
        alert('Format error: JSON must be an array of flashcards');
      }
    } catch (e) {
      alert('Invalid JSON structure. Please check and try again.');
    }
  }

  // ==========================================
  // QUIZZES (QCM) WORKSPACE LOGIC
  // ==========================================

  openAddQuizModal() {
    this.isEditingQuiz.set(false);
    this.quizForm = {
      id: '',
      question: '',
      type: 'multiple-choice',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correctAnswerMc: 0,
      correctAnswerTf: 'True',
      correctAnswerFb: '',
      explanation: '',
      trapNote: '',
      topic: ''
    };
    this.showQuizModal.set(true);
  }

  openEditQuizModal(q: QCM) {
    this.isEditingQuiz.set(true);
    
    // De-construct options
    let opt1 = '', opt2 = '', opt3 = '', opt4 = '';
    if (q.type === 'multiple-choice' && q.options) {
      opt1 = q.options[0] || '';
      opt2 = q.options[1] || '';
      opt3 = q.options[2] || '';
      opt4 = q.options[3] || '';
    }

    this.quizForm = {
      id: q.id,
      question: q.question,
      type: q.type,
      option1: opt1,
      option2: opt2,
      option3: opt3,
      option4: opt4,
      correctAnswerMc: q.type === 'multiple-choice' ? Number(q.correctAnswer) : 0,
      correctAnswerTf: q.type === 'true-false' ? String(q.correctAnswer) : 'True',
      correctAnswerFb: q.type === 'fill-blanks' ? String(q.correctAnswer) : '',
      explanation: q.explanation || '',
      trapNote: q.trapNote || '',
      topic: q.topic || ''
    };
    this.showQuizModal.set(true);
  }

  saveQuiz() {
    const currentPack = this.pack();
    if (!currentPack) return;

    let options: string[] | undefined = undefined;
    let correctAnswer: string | number = '';

    if (this.quizForm.type === 'multiple-choice') {
      options = [
        this.quizForm.option1.trim(),
        this.quizForm.option2.trim(),
        this.quizForm.option3.trim(),
        this.quizForm.option4.trim()
      ].filter(o => o.length > 0);
      
      correctAnswer = Number(this.quizForm.correctAnswerMc);
    } else if (this.quizForm.type === 'true-false') {
      options = ['True', 'False'];
      correctAnswer = this.quizForm.correctAnswerTf;
    } else if (this.quizForm.type === 'fill-blanks') {
      options = [];
      correctAnswer = this.quizForm.correctAnswerFb.trim();
    }

    let updatedQcms = currentPack.qcm ? [...currentPack.qcm] : [];

    if (this.isEditingQuiz()) {
      updatedQcms = updatedQcms.map(q =>
        q.id === this.quizForm.id
          ? {
              ...q,
              question: this.quizForm.question,
              type: this.quizForm.type,
              options,
              correctAnswer,
              explanation: this.quizForm.explanation || undefined,
              trapNote: this.quizForm.trapNote || undefined,
              topic: this.quizForm.topic ? this.quizForm.topic.trim() : undefined
            }
          : q
      );
    } else {
      const newQcm: QCM = {
        id: crypto.randomUUID(),
        question: this.quizForm.question,
        type: this.quizForm.type,
        options,
        correctAnswer,
        explanation: this.quizForm.explanation || undefined,
        trapNote: this.quizForm.trapNote || undefined,
        topic: this.quizForm.topic ? this.quizForm.topic.trim() : undefined,
        createdAt: new Date()
      };
      updatedQcms.push(newQcm);
    }

    this.studyHubService.updatePack(currentPack.id, { qcm: updatedQcms });
    this.showQuizModal.set(false);
  }

  deleteQuiz(quizId: string) {
    const currentPack = this.pack();
    if (!currentPack || !confirm('Are you sure you want to delete this question?')) return;

    const updatedQcms = currentPack.qcm.filter(q => q.id !== quizId);
    this.studyHubService.updatePack(currentPack.id, { qcm: updatedQcms });
  }

  openQuizImportModal() {
    this.quizImportData = '';
    this.showQuizImportModal.set(true);
  }

  importQuizzesFromJson() {
    const currentPack = this.pack();
    if (!currentPack) return;

    try {
      const parsed = JSON.parse(this.quizImportData);
      if (Array.isArray(parsed)) {
        const validatedQcms: QCM[] = parsed.map(q => ({
          id: q.id || crypto.randomUUID(),
          question: q.question || 'New Question?',
          type: q.type || 'multiple-choice',
          options: Array.isArray(q.options) ? q.options : undefined,
          correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : '',
          explanation: q.explanation || undefined,
          trapNote: q.trapNote || undefined,
          topic: q.topic || undefined,
          createdAt: new Date()
        }));

        const updatedQcms = [...(currentPack.qcm || []), ...validatedQcms];
        this.studyHubService.updatePack(currentPack.id, { qcm: updatedQcms });
        this.showQuizImportModal.set(false);
      } else {
        alert('Le format doit être un tableau JSON de questions.');
      }
    } catch (e) {
      alert('Structure JSON incorrecte. Veuillez vérifier le fichier.');
    }
  }

  // ==========================================
  // CHEAT SHEETS WORKSPACE LOGIC
  // ==========================================

  openAddCheatSheetModal() {
    this.isEditingCheatSheet.set(false);
    this.cheatSheetForm = {
      id: '',
      title: '',
      category: '',
      itemsString: '',
      codeSample: ''
    };
    this.showCheatSheetModal.set(true);
  }

  openEditCheatSheetModal(cs: any, event?: Event) {
    if (event) event.stopPropagation();
    this.isEditingCheatSheet.set(true);
    
    const itemsStr = cs.items ? cs.items.map((i: any) => `${i.key} : ${i.value}`).join('\n') : '';

    this.cheatSheetForm = {
      id: cs.id,
      title: cs.title,
      category: cs.category,
      itemsString: itemsStr,
      codeSample: cs.codeSample || ''
    };
    this.showCheatSheetModal.set(true);
  }

  saveCheatSheet() {
    const currentPack = this.pack();
    if (!currentPack) return;

    const items = this.cheatSheetForm.itemsString
      ? this.cheatSheetForm.itemsString
          .split('\n')
          .map(line => {
            const idx = line.indexOf(':');
            if (idx === -1) return null;
            return {
              key: line.substring(0, idx).trim(),
              value: line.substring(idx + 1).trim()
            };
          })
          .filter((it): it is { key: string; value: string } => it !== null && it.key.length > 0)
      : [];

    let updatedCS = currentPack.cheatsheets ? [...currentPack.cheatsheets] : [];

    if (this.isEditingCheatSheet()) {
      updatedCS = updatedCS.map(c =>
        c.id === this.cheatSheetForm.id
          ? {
              ...c,
              title: this.cheatSheetForm.title,
              category: this.cheatSheetForm.category,
              items,
              codeSample: this.cheatSheetForm.codeSample || undefined
            }
          : c
      );
    } else {
      const newCS = {
        id: crypto.randomUUID(),
        title: this.cheatSheetForm.title || 'Untitled Reference',
        category: this.cheatSheetForm.category || 'General',
        items,
        codeSample: this.cheatSheetForm.codeSample || undefined,
        createdAt: new Date()
      };
      updatedCS.push(newCS);
    }

    this.studyHubService.updatePack(currentPack.id, { cheatsheets: updatedCS });
    this.showCheatSheetModal.set(false);
  }

  deleteCheatSheet(csId: string, event: Event) {
    event.stopPropagation();
    const currentPack = this.pack();
    if (!currentPack || !confirm('Are you sure you want to delete this cheat sheet?')) return;

    const updatedCS = (currentPack.cheatsheets || []).filter(c => c.id !== csId);
    this.studyHubService.updatePack(currentPack.id, { cheatsheets: updatedCS });
  }

  copyCheatSheetToClipboard(cs: any, event: Event) {
    event.stopPropagation();
    const itemsText = cs.items ? cs.items.map((i: any) => `${i.key}: ${i.value}`).join('\n') : '';
    const fullText = `${cs.title}\n=====================\n${itemsText}\n\n${cs.codeSample || ''}`;
    
    navigator.clipboard.writeText(fullText.trim()).then(() => {
      alert('✓ Fiche copiée avec succès !');
    });
  }

  // ==========================================
  // CODING EXERCISES WORKSPACE LOGIC
  // ==========================================

  openAddExerciseModal() {
    this.isEditingExercise.set(false);
    this.exerciseForm = {
      id: '',
      title: '',
      description: '',
      schemaContext: '',
      task: '',
      correctSolution: '',
      solutionNote: ''
    };
    this.showExerciseModal.set(true);
  }

  openEditExerciseModal(ex: any, event?: Event) {
    if (event) event.stopPropagation();
    this.isEditingExercise.set(true);
    this.exerciseForm = {
      id: ex.id,
      title: ex.title,
      description: ex.description,
      schemaContext: ex.schemaContext || '',
      task: ex.task,
      correctSolution: ex.correctSolution,
      solutionNote: ex.solutionNote || ''
    };
    this.showExerciseModal.set(true);
  }

  saveExercise() {
    const currentPack = this.pack();
    if (!currentPack) return;

    let updatedEx = currentPack.exercises ? [...currentPack.exercises] : [];

    if (this.isEditingExercise()) {
      updatedEx = updatedEx.map(e =>
        e.id === this.exerciseForm.id
          ? {
              ...e,
              title: this.exerciseForm.title,
              description: this.exerciseForm.description,
              schemaContext: this.exerciseForm.schemaContext || undefined,
              task: this.exerciseForm.task,
              correctSolution: this.exerciseForm.correctSolution,
              solutionNote: this.exerciseForm.solutionNote || undefined
            }
          : e
      );
    } else {
      const newEx = {
        id: crypto.randomUUID(),
        title: this.exerciseForm.title || 'Exercice de code',
        description: this.exerciseForm.description,
        schemaContext: this.exerciseForm.schemaContext || undefined,
        task: this.exerciseForm.task,
        correctSolution: this.exerciseForm.correctSolution,
        solutionNote: this.exerciseForm.solutionNote || undefined,
        createdAt: new Date()
      };
      updatedEx.push(newEx);
    }

    this.studyHubService.updatePack(currentPack.id, { exercises: updatedEx });
    this.showExerciseModal.set(false);
  }

  deleteExercise(exId: string, event: Event) {
    event.stopPropagation();
    const currentPack = this.pack();
    if (!currentPack || !confirm('Are you sure you want to delete this exercise?')) return;

    const updatedEx = (currentPack.exercises || []).filter(e => e.id !== exId);
    this.studyHubService.updatePack(currentPack.id, { exercises: updatedEx });
  }

  toggleSolutionVisibility(exId: string) {
    this.exerciseSolutionVisible.update(prev => ({
      ...prev,
      [exId]: !prev[exId]
    }));
  }

  // ==========================================
  // DATA EXPORT WORKSPACE LOGIC
  // ==========================================

  private downloadJson(filename: string, data: any) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportNotesAsJson() {
    const currentPack = this.pack();
    if (!currentPack || !currentPack.notes || currentPack.notes.length === 0) return;
    const data = currentPack.notes.map(n => ({
      title: n.title,
      content: n.content,
      tags: n.tags,
      isPinned: n.isPinned
    }));
    this.downloadJson(`${currentPack.title.toLowerCase().replace(/\s+/g, '_')}_notes.json`, data);
  }

  exportFlashcardsAsJson() {
    const currentPack = this.pack();
    if (!currentPack || !currentPack.flashcards || currentPack.flashcards.length === 0) return;
    const data = currentPack.flashcards.map(c => ({
      front: c.front,
      back: c.back,
      code: c.code || ''
    }));
    this.downloadJson(`${currentPack.title.toLowerCase().replace(/\s+/g, '_')}_flashcards.json`, data);
  }

  exportQcmsAsJson() {
    const currentPack = this.pack();
    if (!currentPack || !currentPack.qcm || currentPack.qcm.length === 0) return;
    const data = currentPack.qcm.map(q => ({
      question: q.question,
      type: q.type,
      options: q.options || [],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      trapNote: q.trapNote || '',
      topic: q.topic || ''
    }));
    this.downloadJson(`${currentPack.title.toLowerCase().replace(/\s+/g, '_')}_qcm.json`, data);
  }

  // Interactive Quiz reader modal
  openQuizReader(q: QCM) {
    this.viewingQuiz.set(q);
  }

  closeQuizReader() {
    this.viewingQuiz.set(null);
  }

  // Copy templates to clipboard
  copyNotesTemplateToClipboard() {
    const template = `[
  {
    "title": "Inheritance Overview",
    "content": "Inheritance allows a subclass to inherit fields and methods from a superclass...",
    "tags": ["oop", "java"],
    "isPinned": false
  }
]`;
    navigator.clipboard.writeText(template).then(() => {
      this.templateCopied.set('notes');
      setTimeout(() => this.templateCopied.set(null), 2000);
    });
  }

  copyFlashcardsTemplateToClipboard() {
    const template = `[
  {
    "front": "What is polymorphism?",
    "back": "The ability of an object to take multiple forms in object-oriented programming.",
    "code": "Animal myDog = new Dog();\\nmyDog.makeSound(); // polymorphism"
  }
]`;
    navigator.clipboard.writeText(template).then(() => {
      this.templateCopied.set('flashcards');
      setTimeout(() => this.templateCopied.set(null), 2000);
    });
  }

  copyQuizzesTemplateToClipboard() {
    const template = `[
  {
    "question": "Which join returns all rows from the left table and matched rows from the right table?",
    "type": "multiple-choice",
    "options": ["INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN"],
    "correctAnswer": 1,
    "explanation": "A LEFT JOIN returns all records from the left table (table1), and the matched records from the right table (table2).",
    "trapNote": "Be careful! The order of tables in the FROM clause determines which is left and right.",
    "topic": "JOINs"
  },
  {
    "question": "Indexes always speed up write operations (INSERT, UPDATE).",
    "type": "true-false",
    "correctAnswer": "False",
    "explanation": "No, indexes slow down write operations because the index must also be updated.",
    "topic": "Indexes"
  }
]`;
    navigator.clipboard.writeText(template).then(() => {
      this.templateCopied.set('quiz');
      setTimeout(() => this.templateCopied.set(null), 2000);
    });
  }

  copyCheatsheetsTemplateToClipboard() {
    const template = `[
  {
    "title": "Standard Joins Reference",
    "category": "JOIN Syntax",
    "items": [
      { "key": "INNER JOIN", "value": "Matches keys in both tables" },
      { "key": "LEFT JOIN", "value": "Returns all rows from left table" }
    ],
    "codeSample": "SELECT * FROM Users u INNER JOIN Orders o ON u.id = o.user_id;"
  }
]`;
    navigator.clipboard.writeText(template).then(() => {
      this.templateCopied.set('cheatsheets');
      setTimeout(() => this.templateCopied.set(null), 2000);
    });
  }

  copyExercisesTemplateToClipboard() {
    const template = `[
  {
    "title": "Basic Select query",
    "description": "Practice writing a simple select statement.",
    "schemaContext": "Table: Users (id INT, name VARCHAR, email VARCHAR)",
    "task": "Select all columns for users with id = 1.",
    "correctSolution": "SELECT * FROM Users WHERE id = 1;",
    "solutionNote": "Always filter by primary key to ensure single row retrieves."
  }
]`;
    navigator.clipboard.writeText(template).then(() => {
      this.templateCopied.set('exercises');
      setTimeout(() => this.templateCopied.set(null), 2000);
    });
  }

  importCheatsheetsFromJson() {
    const currentPack = this.pack();
    if (!currentPack) return;

    try {
      const parsed = JSON.parse(this.cheatSheetImportData);
      if (Array.isArray(parsed)) {
        const validated = parsed.map(c => ({
          id: c.id || crypto.randomUUID(),
          title: c.title || 'Imported Reference',
          category: c.category || 'General',
          items: Array.isArray(c.items) ? c.items : [],
          codeSample: c.codeSample || undefined,
          createdAt: new Date()
        }));

        const updated = [...(currentPack.cheatsheets || []), ...validated];
        this.studyHubService.updatePack(currentPack.id, { cheatsheets: updated });
        this.showCheatSheetImportModal.set(false);
      } else {
        alert('Format error: JSON must be an array');
      }
    } catch (e) {
      alert('Invalid JSON structure. Please check and try again.');
    }
  }

  importExercisesFromJson() {
    const currentPack = this.pack();
    if (!currentPack) return;

    try {
      const parsed = JSON.parse(this.exerciseImportData);
      if (Array.isArray(parsed)) {
        const validated = parsed.map(e => ({
          id: e.id || crypto.randomUUID(),
          title: e.title || 'Coding Exercise',
          description: e.description || '',
          schemaContext: e.schemaContext || undefined,
          task: e.task || '',
          correctSolution: e.correctSolution || '',
          solutionNote: e.solutionNote || undefined,
          createdAt: new Date()
        }));

        const updated = [...(currentPack.exercises || []), ...validated];
        this.studyHubService.updatePack(currentPack.id, { exercises: updated });
        this.showExerciseImportModal.set(false);
      } else {
        alert('Format error: JSON must be an array');
      }
    } catch (e) {
      alert('Invalid JSON structure. Please check and try again.');
    }
  }

  exportCheatsheetsAsJson() {
    const currentPack = this.pack();
    if (!currentPack || !currentPack.cheatsheets || currentPack.cheatsheets.length === 0) return;
    const data = currentPack.cheatsheets.map(c => ({
      title: c.title,
      category: c.category,
      items: c.items,
      codeSample: c.codeSample || ''
    }));
    this.downloadJson(`${currentPack.title.toLowerCase().replace(/\s+/g, '_')}_cheatsheets.json`, data);
  }

  exportExercisesAsJson() {
    const currentPack = this.pack();
    if (!currentPack || !currentPack.exercises || currentPack.exercises.length === 0) return;
    const data = currentPack.exercises.map(e => ({
      title: e.title,
      description: e.description,
      schemaContext: e.schemaContext || '',
      task: e.task,
      correctSolution: e.correctSolution,
      solutionNote: e.solutionNote || ''
    }));
    this.downloadJson(`${currentPack.title.toLowerCase().replace(/\s+/g, '_')}_exercises.json`, data);
  }

  highlightSQL(code: string): string {
    if (!code) return '';
    
    // Escape HTML to prevent safety injections
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    // Common SQL keywords for rich high-contrast layout matching tsql_revision_exam.html
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'INSERT', 'UPDATE', 'DELETE',
      'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN', 'JOIN', 'ON', 'GROUP BY',
      'ORDER BY', 'HAVING', 'LIMIT', 'CREATE', 'TABLE', 'INDEX', 'TRIGGER', 'PROCEDURE',
      'VIEW', 'BEGIN', 'TRANSACTION', 'COMMIT', 'ROLLBACK', 'INTO', 'VALUES', 'SET',
      'ALTER', 'DROP', 'ADD', 'CONSTRAINT', 'FOREIGN KEY', 'PRIMARY KEY', 'REFERENCES',
      'RETURNS', 'AS', 'RETURNS TABLE', 'RETURNS INT', 'IF', 'ELSE', 'DECLARE', 'SET NOCOUNT',
      'GO', 'INT', 'VARCHAR', 'CHAR', 'DATE', 'DATETIME', 'BOOLEAN', 'FLOAT', 'DECIMAL', 'COUNT', 'SUM', 'AVG'
    ];
    
    // Sort keywords by length descending to match composite keywords first
    keywords.sort((a, b) => b.length - a.length);
    
    // Highlight strings (single quotes)
    escaped = escaped.replace(/('[^']*')/g, '<span class="text-emerald-600 font-extrabold dark:text-emerald-400">$1</span>');
    
    // Highlight comments (double dash)
    escaped = escaped.replace(/(--.*)/g, '<span class="text-slate-500 dark:text-zinc-500 italic">$1</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="text-slate-500 dark:text-zinc-500 italic">$1</span>');
    
    // Highlight numbers
    escaped = escaped.replace(/\b(\d+)\b/g, '<span class="text-amber-600 font-extrabold dark:text-amber-400">$1</span>');
    
    // Highlight keywords
    for (const kw of keywords) {
      const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
      // Use premium neon colors: Sky Blue for query commands, etc.
      escaped = escaped.replace(regex, '<span class="text-sky-600 dark:text-sky-400 font-black">$1</span>');
    }
    
    return escaped;
  }

  getCheatSheetTheme(index: number) {
    const themes = [
      { color: '#10b981', rgba: 'rgba(16, 185, 129, 0.12)', rgbaLight: 'rgba(16, 185, 129, 0.04)', icon: '⚡' },
      { color: '#3b82f6', rgba: 'rgba(59, 130, 246, 0.12)', rgbaLight: 'rgba(59, 130, 246, 0.04)', icon: '👁️' },
      { color: '#f59e0b', rgba: 'rgba(245, 158, 11, 0.12)', rgbaLight: 'rgba(245, 158, 11, 0.04)', icon: '🔒' },
      { color: '#a855f7', rgba: 'rgba(168, 85, 247, 0.12)', rgbaLight: 'rgba(168, 85, 247, 0.04)', icon: '⚡' },
      { color: '#ec4899', rgba: 'rgba(236, 72, 153, 0.12)', rgbaLight: 'rgba(236, 72, 153, 0.04)', icon: '📊' },
      { color: '#06b6d4', rgba: 'rgba(6, 182, 212, 0.12)', rgbaLight: 'rgba(6, 182, 212, 0.04)', icon: '💻' },
      { color: '#ef4444', rgba: 'rgba(239, 68, 68, 0.12)', rgbaLight: 'rgba(239, 68, 68, 0.04)', icon: '🚨' },
      { color: '#14b8a6', rgba: 'rgba(20, 184, 166, 0.12)', rgbaLight: 'rgba(20, 184, 166, 0.04)', icon: '🔢' },
      { color: '#f97316', rgba: 'rgba(249, 115, 22, 0.12)', rgbaLight: 'rgba(249, 115, 22, 0.04)', icon: '🔠' },
      { color: '#6366f1', rgba: 'rgba(99, 102, 241, 0.12)', rgbaLight: 'rgba(99, 102, 241, 0.04)', icon: '📦' }
    ];
    return themes[index % themes.length];
  }
}
