const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'components', 'study-hub', 'study-pack', 'detail', 'study-pack-detail.component.html');
let content = fs.readFileSync(filePath, 'utf8');

// The mangled block we want to find
const searchStr = `      <!-- MCQ Options List -->
      <div *ngIf="q.type === 'multiple-choice' && q.options" class="space-y-3">
        <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest        <div *ngFor="let opt of q.options; let optIdx = index" 
             class="px-4 py-3 rounded-xl border flex items-center justify-between font-semibold text-sm shadow-sm"
             [ngClass]="{
               'border-green-500 bg-green-50/40 dark:bg-green-950/20 text-green-800 dark:text-green-300': String(optIdx) === String(q.correctAnswer),
               'border-gray-250 dark:border-gray-700 text-gray-700 dark:text-gray-400': String(optIdx) !== String(q.correctAnswer)
             }"
        >
          <div class="flex items-center gap-3">
            <span class="w-6.5 h-6.5 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-black font-mono text-gray-550 dark:text-gray-400 shadow-sm border border-gray-250/20"
                  [ngClass]="{
                    'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-300 border border-green-500/20': String(optIdx) === String(q.correctAnswer)
                  }">
              {{ String.fromCharCode(65 + optIdx) }}
            </span>
            <span [innerHTML]="opt"></span>
          </div>
          <span *ngIf="String(optIdx) === String(q.correctAnswer)" class="px-2 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-extrabold uppercase tracking-wider border border-green-500/30">o" Correct</span>
        </div>
      </div>

      <!-- True / False Correct Answer -->
      <div *ngIf="q.type === 'true-false'" class="space-y-3">
        <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Correct Value</span>
        <div class="px-4 py-3 rounded-xl border border-green-500 bg-green-50/40 dark:bg-green-950/20 text-green-800 dark:text-green-300 flex items-center justify-between font-semibold text-sm shadow-sm">
          <div class="flex items-center gap-3">
            <span class="material-icons text-green-500 text-lg">check_circle</span>
            <span>{{ String(q.correctAnswer).toLowerCase() === 'true' ? 'Vrai (True)' : 'Faux (False)' }}</span>
          </div>
          <span class="px-2 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-extrabold uppercase tracking-wider border border-green-500/30">o" Correct</span>
        </div>
      </div>" Correct</span>
        </div>
      </div>`;

const replacementStr = `      <!-- MCQ Options List -->
      <div *ngIf="q.type === 'multiple-choice' && q.options" class="space-y-3">
        <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Options de reponse</span>
        <div *ngFor="let opt of q.options; let optIdx = index" 
             class="px-4 py-3 rounded-xl border flex items-center justify-between font-semibold text-sm shadow-sm"
             [ngClass]="{
               'border-green-500 bg-green-50/40 dark:bg-green-950/20 text-green-800 dark:text-green-300': String(optIdx) === String(q.correctAnswer),
               'border-gray-250 dark:border-gray-700 text-gray-700 dark:text-gray-400': String(optIdx) !== String(q.correctAnswer)
             }"
        >
          <div class="flex items-center gap-3">
            <span class="w-6.5 h-6.5 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-black font-mono text-gray-550 dark:text-gray-400 shadow-sm border border-gray-250/20"
                  [ngClass]="{
                    'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-300 border border-green-500/20': String(optIdx) === String(q.correctAnswer)
                  }">
              {{ String.fromCharCode(65 + optIdx) }}
            </span>
            <span [innerHTML]="opt"></span>
          </div>
          <span *ngIf="String(optIdx) === String(q.correctAnswer)" class="px-2 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-extrabold uppercase tracking-wider border border-green-500/30">Correct</span>
        </div>
      </div>

      <!-- True / False Correct Answer -->
      <div *ngIf="q.type === 'true-false'" class="space-y-3">
        <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Correct Value</span>
        <div class="px-4 py-3 rounded-xl border border-green-500 bg-green-50/40 dark:bg-green-950/20 text-green-800 dark:text-green-300 flex items-center justify-between font-semibold text-sm shadow-sm">
          <div class="flex items-center gap-3">
            <span class="material-icons text-green-500 text-lg">check_circle</span>
            <span>{{ String(q.correctAnswer).toLowerCase() === 'true' ? 'Vrai (True)' : 'Faux (False)' }}</span>
          </div>
          <span class="px-2 py-0.5 rounded bg-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-extrabold uppercase tracking-wider border border-green-500/30">Correct</span>
        </div>
      </div>`;

// We also want to replace "o" Correct" in other places or check if it matches literally
// Wait, we'll do a simple substring replacement
const index = content.indexOf('      <!-- MCQ Options List -->');
if (index === -1) {
  console.log('Could not find MCQ section, trying fuzzy search...');
  // We can do a search based on keywords
} else {
  // Let's replace the block dynamically
  const start = index;
  const end = content.indexOf('      <!-- Fill Blanks Correct Answer -->');
  if (end !== -1) {
    const originalBlock = content.substring(start, end);
    content = content.substring(0, start) + replacementStr + '\n\n' + content.substring(end);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated HTML file!');
  } else {
    console.log('Could not find Fill Blanks section');
  }
}
