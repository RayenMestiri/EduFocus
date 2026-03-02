content = r"""/* ================================================================
   Notes Component – Premium CSS
   (Tailwind utility-first, minimal custom classes)
   ================================================================ */

/* ── Sidebar navigation items ── */
.sidebar-item {
  @apply flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold
         transition-all duration-200 w-full;
}
.sidebar-item-active {
  @apply dark:bg-yellow-500/18 dark:text-yellow-400 dark:border dark:border-yellow-500/30
         light:bg-indigo-50 light:text-indigo-700 light:border light:border-indigo-200;
}
.sidebar-item-inactive {
  @apply dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-200
         light:text-slate-600 light:hover:bg-indigo-50/60 light:hover:text-indigo-700
         border border-transparent;
}
.sidebar-badge {
  @apply ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-black
         dark:bg-yellow-500/12 dark:text-yellow-500/80
         light:bg-indigo-100/80 light:text-indigo-500;
}

/* ── Card action buttons ── */
.card-action-btn {
  @apply p-1.5 rounded-lg transition-all duration-150 cursor-pointer select-none;
}

/* ── Toolbar buttons ── */
.toolbar-btn {
  @apply h-[30px] min-w-[28px] px-1.5 rounded-lg flex items-center justify-center
         font-semibold transition-all duration-150 select-none cursor-pointer
         dark:text-gray-500 dark:hover:bg-white/8 dark:hover:text-gray-200
         light:text-slate-500 light:hover:bg-slate-200 light:hover:text-slate-800
         active:scale-90;
}
.toolbar-btn-active {
  @apply dark:bg-yellow-500/22 dark:text-yellow-400 dark:ring-1 dark:ring-yellow-500/40
         light:bg-indigo-100 light:text-indigo-700 light:ring-1 light:ring-indigo-300/60;
}

/* ── Toolbar separator ── */
.toolbar-sep {
  @apply w-px h-5 mx-1 shrink-0
         dark:bg-white/10 light:bg-slate-300;
}

/* ── Meta panel labels ── */
.meta-label {
  @apply text-[10px] font-black uppercase tracking-wider
         dark:text-yellow-500/50 light:text-indigo-500/80
         flex items-center gap-1;
}

/* ── Contenteditable editor ── */
.notes-editor {
  caret-color: theme('colors.yellow.500');
}
.notes-editor:empty::before {
  content: attr(data-placeholder);
  color: theme('colors.gray.600');
  pointer-events: none;
}

/* Rich content */
.notes-editor h1 {
  @apply text-2xl font-extrabold dark:text-yellow-300 light:text-indigo-700 mb-2 mt-3 leading-tight;
}
.notes-editor h2 {
  @apply text-xl font-bold dark:text-yellow-400 light:text-indigo-600 mb-1.5 mt-2.5;
}
.notes-editor p { @apply mb-1.5; }
.notes-editor strong { @apply dark:text-white light:text-slate-900 font-bold; }
.notes-editor em { @apply italic dark:text-gray-300 light:text-slate-600; }
.notes-editor blockquote {
  @apply border-l-4 dark:border-yellow-500/60 light:border-indigo-400
         dark:bg-yellow-500/5 light:bg-indigo-50/50
         px-4 py-2.5 rounded-r-xl italic dark:text-gray-400 light:text-slate-600 my-2;
}
.notes-editor pre {
  @apply dark:bg-[#111] light:bg-slate-100 dark:text-yellow-300 light:text-slate-800
         rounded-xl px-4 py-3 text-xs font-mono overflow-x-auto my-2
         dark:border dark:border-yellow-500/15 light:border light:border-slate-200;
}
.notes-editor ul { @apply list-disc pl-5 dark:text-gray-300 light:text-slate-700 space-y-0.5; }
.notes-editor ol { @apply list-decimal pl-5 dark:text-gray-300 light:text-slate-700 space-y-0.5; }
.notes-editor a { @apply dark:text-yellow-400 light:text-indigo-600 underline underline-offset-2 hover:opacity-80; }

/* ── Scrollbars ── */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  @apply dark:bg-yellow-500/20 light:bg-indigo-200 rounded-full;
}
::-webkit-scrollbar-thumb:hover {
  @apply dark:bg-yellow-500/40 light:bg-indigo-400;
}

/* ── Note card ── */
.note-card { will-change: transform; }

/* ── Animations ── */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(48px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.7); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-overlay  { animation: fadeIn  0.2s ease; }
.modal-slide-up { animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.note-popup     { animation: scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
"""

with open(r'd:\chaine YOUTUBE\EduFocus\frontend\src\app\components\notes\notes.component.css', 'w', encoding='utf-8') as f:
    f.write(content)
print("CSS done:", len(content), "chars")
