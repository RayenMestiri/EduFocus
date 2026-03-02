content = r"""<!-- ════════════════════════════════════════════════════════════════
     NOTES  -  EduFocus Premium  (Dark: black/gold | Light: indigo/violet)
     ════════════════════════════════════════════════════════════════ -->

<div class="min-h-screen dark:bg-black dark:text-white light:bg-gradient-to-br light:from-indigo-50/60 light:via-white light:to-violet-50/60 light:text-slate-800 transition-colors duration-300">

  <!-- ═══════════ HEADER ═══════════ -->
  <header class="sticky top-0 z-50 dark:bg-black/85 light:bg-white/90 backdrop-blur-xl dark:border-b dark:border-yellow-500/20 light:border-b light:border-indigo-200/60 dark:shadow-2xl dark:shadow-yellow-500/10 light:shadow-lg light:shadow-indigo-500/8">
    <div class="px-4 py-3 sm:py-4">
      <div class="flex items-center justify-between gap-3">

        <!-- Left: back + logo -->
        <div class="flex items-center gap-3 shrink-0">
          <a routerLink="/dashboard"
             class="w-9 h-9 dark:bg-yellow-500/15 dark:hover:bg-yellow-500/30 dark:border-yellow-500/30 light:bg-indigo-50 light:hover:bg-indigo-100 light:border-indigo-200 border rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 dark:text-yellow-400 light:text-indigo-600 group" title="Dashboard">
            <span class="material-icons text-xl group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
          </a>
          <div class="w-9 h-9 dark:bg-gradient-to-br dark:from-yellow-400 dark:to-yellow-600 light:bg-gradient-to-br light:from-indigo-500 light:to-violet-600 rounded-xl flex items-center justify-center dark:shadow-lg dark:shadow-yellow-500/50 light:shadow-lg light:shadow-indigo-500/40">
            <span class="material-icons text-lg dark:text-black light:text-white">menu_book</span>
          </div>
          <div class="hidden sm:flex flex-col leading-none">
            <span class="text-lg font-black dark:bg-gradient-to-r dark:from-yellow-400 dark:via-yellow-500 dark:to-yellow-600 light:bg-gradient-to-r light:from-indigo-600 light:via-violet-600 light:to-purple-600 bg-clip-text text-transparent">Notes</span>
            <span class="text-[10px] font-semibold dark:text-yellow-500/50 light:text-indigo-400 uppercase tracking-wider">EduFocus Premium</span>
          </div>
          <span class="hidden sm:inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border dark:border-yellow-500/30 light:bg-indigo-100 light:text-indigo-600 light:border light:border-indigo-200 rounded-full text-[11px] font-black">{{ totalCount() }}</span>
        </div>

        <!-- Center: search -->
        <div class="flex-1 max-w-md mx-2 sm:mx-4">
          <div class="relative group">
            <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-[18px] dark:text-yellow-500/40 light:text-indigo-300 pointer-events-none transition-colors duration-200 group-focus-within:dark:text-yellow-500 group-focus-within:light:text-indigo-500">search</span>
            <input type="text" placeholder="Search notes, tags…"
                   [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)"
                   class="w-full pl-10 pr-9 py-2 dark:bg-white/5 dark:border-yellow-500/20 dark:text-white dark:placeholder-gray-600 light:bg-white light:border-indigo-200 light:text-slate-800 light:placeholder-slate-400 border rounded-xl text-sm outline-none transition-all duration-300 dark:focus:border-yellow-500/50 dark:focus:bg-white/8 light:focus:border-indigo-400 light:focus:shadow-md light:focus:shadow-indigo-500/10" />
            @if (searchQuery()) {
              <button class="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 dark:bg-gray-700 dark:text-gray-400 dark:hover:text-yellow-400 light:bg-slate-200 light:text-slate-400 light:hover:text-indigo-600 rounded-full flex items-center justify-center transition-all duration-200" (click)="searchQuery.set('')">
                <span class="material-icons" style="font-size:13px">close</span>
              </button>
            }
          </div>
        </div>

        <!-- Right: controls -->
        <div class="flex items-center gap-1.5 shrink-0">
          <!-- Grid / List toggle -->
          <div class="hidden sm:flex items-center dark:bg-white/5 dark:border-yellow-500/20 light:bg-slate-100 light:border-slate-200 border rounded-xl p-0.5 gap-0.5">
            <button (click)="viewMode.set('grid')" title="Grid view"
                    class="p-1.5 rounded-lg transition-all duration-200"
                    [class]="viewMode()==='grid' ? 'dark:bg-yellow-500 dark:text-black light:bg-white light:text-indigo-600 shadow-sm light:shadow-indigo-200/60' : 'dark:text-gray-500 dark:hover:text-yellow-400 light:text-slate-400 light:hover:text-indigo-500'">
              <span class="material-icons text-[17px]">grid_view</span>
            </button>
            <button (click)="viewMode.set('list')" title="List view"
                    class="p-1.5 rounded-lg transition-all duration-200"
                    [class]="viewMode()==='list' ? 'dark:bg-yellow-500 dark:text-black light:bg-white light:text-indigo-600 shadow-sm light:shadow-indigo-200/60' : 'dark:text-gray-500 dark:hover:text-yellow-400 light:text-slate-400 light:hover:text-indigo-500'">
              <span class="material-icons text-[17px]">view_list</span>
            </button>
          </div>
          <!-- Theme toggle -->
          <button (click)="themeService.toggleTheme()"
                  class="p-2 dark:bg-yellow-500/15 dark:hover:bg-yellow-500/30 dark:border-yellow-500/30 light:bg-indigo-50 light:hover:bg-indigo-100 light:border-indigo-200 border rounded-xl dark:text-yellow-400 light:text-indigo-600 transition-all duration-300 hover:scale-105 hover:rotate-12"
                  [title]="themeService.isDark() ? 'Light mode' : 'Dark mode'">
            <span class="material-icons text-[18px]">{{ themeService.isDark() ? 'light_mode' : 'dark_mode' }}</span>
          </button>
          <!-- Mobile sidebar -->
          <button (click)="toggleSidebar()" title="Toggle filters"
                  class="lg:hidden p-2 dark:bg-yellow-500/15 dark:border-yellow-500/30 light:bg-indigo-50 light:border-indigo-200 border rounded-xl dark:text-yellow-400 light:text-indigo-600 transition-all duration-300">
            <span class="material-icons text-[18px]">{{ sidebarOpen() ? 'close' : 'tune' }}</span>
          </button>
          <!-- New Note CTA -->
          <button (click)="openEditor()"
                  class="flex items-center gap-1.5 px-3 py-2 dark:bg-gradient-to-r dark:from-yellow-500 dark:to-yellow-600 light:bg-gradient-to-r light:from-indigo-600 light:to-violet-600 dark:text-black text-white rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 hover:brightness-110 shadow-lg dark:shadow-yellow-500/40 light:shadow-indigo-500/40">
            <span class="material-icons text-[18px]">add</span>
            <span class="hidden sm:inline">New Note</span>
          </button>
        </div>

      </div>
    </div>
  </header>

  <!-- ═══════════ LAYOUT ═══════════ -->
  <div class="flex" style="height: calc(100vh - 64px);">

    <!-- Mobile backdrop -->
    @if (sidebarOpen()) {
      <div class="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" (click)="toggleSidebar()"></div>
    }

    <!-- ═══ SIDEBAR ═══ -->
    <aside class="fixed lg:static inset-y-0 left-0 z-40 lg:z-auto w-68 lg:w-56 xl:w-64 transition-transform duration-300 ease-out lg:transform-none overflow-y-auto flex-shrink-0"
           [class.translate-x-0]="sidebarOpen()" [class.-translate-x-full]="!sidebarOpen()">
      <div class="h-full dark:bg-gradient-to-b dark:from-[#0d0d0d] dark:to-black light:bg-white/98 dark:border-r dark:border-yellow-500/15 light:border-r light:border-indigo-100/80 flex flex-col pt-[68px] lg:pt-0">

        <div class="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">

          <!-- Browse section -->
          <div class="px-2 pt-1 pb-2">
            <span class="text-[10px] font-black uppercase tracking-[0.12em] dark:text-yellow-500/40 light:text-indigo-400/70">Browse</span>
          </div>

          <button (click)="setCategory(''); showArchived.set(false); loadNotes()"
                  class="sidebar-item w-full"
                  [class.sidebar-item-active]="!showArchived() && !activeCategory()"
                  [class.sidebar-item-inactive]="showArchived() || !!activeCategory()">
            <span class="material-icons text-[20px] shrink-0">notes</span>
            <span class="flex-1 text-left leading-none">All Notes</span>
            <span class="sidebar-badge">{{ totalCount() }}</span>
          </button>

          <button (click)="toggleArchiveView()"
                  class="sidebar-item w-full"
                  [class.sidebar-item-active]="showArchived()"
                  [class.sidebar-item-inactive]="!showArchived()">
            <span class="material-icons text-[20px] shrink-0">inventory_2</span>
            <span class="flex-1 text-left leading-none">Archived</span>
            @if (archivedCount()) {
              <span class="sidebar-badge">{{ archivedCount() }}</span>
            }
          </button>

          <!-- Categories section -->
          <div class="px-2 pt-4 pb-2">
            <span class="text-[10px] font-black uppercase tracking-[0.12em] dark:text-yellow-500/40 light:text-indigo-400/70">Categories</span>
          </div>

          @for (cat of categories; track cat.id) {
            <button (click)="setCategory(cat.id); showArchived.set(false)"
                    class="sidebar-item w-full group"
                    [class.sidebar-item-active]="activeCategory()===cat.id"
                    [class.sidebar-item-inactive]="activeCategory()!==cat.id">
              <span class="material-icons text-[20px] shrink-0 transition-transform duration-200 group-hover:scale-110">{{ cat.matIcon }}</span>
              <span class="flex-1 text-left leading-none">{{ cat.label }}</span>
              @if (categoryCount()[cat.id]) {
                <span class="sidebar-badge">{{ categoryCount()[cat.id] }}</span>
              }
            </button>
          }

          <!-- Tags section -->
          @if (allTags().length) {
            <div class="px-2 pt-4 pb-2">
              <span class="text-[10px] font-black uppercase tracking-[0.12em] dark:text-yellow-500/40 light:text-indigo-400/70">Tags</span>
            </div>
            <div class="flex flex-wrap gap-1.5 px-1 pb-3">
              @for (tag of allTags(); track tag) {
                <button (click)="setTag(tag)"
                        class="flex items-center gap-0.5 text-xs px-2.5 py-1 rounded-full border font-medium transition-all duration-200"
                        [class]="activeTag()===tag
                          ? 'dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/40 light:bg-indigo-100 light:text-indigo-700 light:border-indigo-300'
                          : 'dark:bg-white/4 dark:text-gray-400 dark:border-white/8 dark:hover:border-yellow-500/30 dark:hover:text-yellow-400 light:bg-slate-50 light:text-slate-500 light:border-slate-200 light:hover:bg-indigo-50 light:hover:text-indigo-600 light:hover:border-indigo-200'">
                  <span class="material-icons" style="font-size:10px">tag</span>{{ tag }}
                </button>
              }
            </div>
          }

        </div>
      </div>
    </aside>

    <!-- ═══ MAIN CONTENT ═══ -->
    <main class="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 lg:p-5 xl:p-6">

      @if (loading()) {
        <div class="flex flex-col items-center justify-center h-full gap-4 opacity-70">
          <div class="relative w-14 h-14">
            <div class="w-14 h-14 rounded-full border-4 dark:border-yellow-500/10 light:border-indigo-100 border-t-transparent"></div>
            <div class="w-14 h-14 rounded-full border-4 border-transparent dark:border-t-yellow-500 light:border-t-indigo-600 animate-spin absolute inset-0"></div>
          </div>
          <p class="dark:text-gray-500 light:text-slate-400 text-sm font-medium tracking-wide">Loading notes…</p>
        </div>
      }

      @if (!loading()) {

        <!-- Pinned section -->
        @if (pinnedNotes().length && !showArchived()) {
          <div class="flex items-center gap-2 mb-3 mt-1">
            <span class="material-icons text-[15px] dark:text-yellow-500 light:text-indigo-500">push_pin</span>
            <span class="text-[10px] font-black uppercase tracking-[0.12em] dark:text-yellow-500/70 light:text-indigo-500">Pinned</span>
            <div class="flex-1 h-px dark:bg-yellow-500/15 light:bg-indigo-200/60"></div>
          </div>
          <div class="mb-5"
               [class]="viewMode()==='grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4' : 'space-y-2.5'">
            @for (note of pinnedNotes(); track note._id) {
              <ng-container *ngTemplateOutlet="noteCard; context: {note: note}"></ng-container>
            }
          </div>
        }

        <!-- Other notes -->
        @if (unpinnedNotes().length) {
          @if (pinnedNotes().length && !showArchived()) {
            <div class="flex items-center gap-2 mb-3">
              <span class="material-icons text-[15px] dark:text-gray-600 light:text-slate-300">notes</span>
              <span class="text-[10px] font-black uppercase tracking-[0.12em] dark:text-gray-600 light:text-slate-400">Other notes</span>
              <div class="flex-1 h-px dark:bg-white/5 light:bg-slate-200/70"></div>
            </div>
          }
          <div [class]="viewMode()==='grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4' : 'space-y-2.5'">
            @for (note of unpinnedNotes(); track note._id) {
              <ng-container *ngTemplateOutlet="noteCard; context: {note: note}"></ng-container>
            }
          </div>
        }

        <!-- Empty state -->
        @if (!filteredNotes().length) {
          <div class="flex flex-col items-center justify-center min-h-[62vh] gap-5 text-center px-4">
            <div class="relative">
              <div class="w-24 h-24 rounded-3xl dark:bg-gradient-to-br dark:from-yellow-500/10 dark:to-transparent dark:border dark:border-yellow-500/20 light:bg-gradient-to-br light:from-indigo-100 light:to-violet-50 light:border light:border-indigo-200 flex items-center justify-center">
                <span class="material-icons text-5xl dark:text-yellow-500/50 light:text-indigo-400">
                  {{ showArchived() ? 'inventory_2' : searchQuery() ? 'search_off' : 'edit_note' }}
                </span>
              </div>
            </div>
            <div class="space-y-2">
              <h3 class="text-2xl font-black dark:text-white light:text-slate-800">
                {{ showArchived() ? 'No archived notes' : searchQuery() ? 'No results found' : 'Your notes await' }}
              </h3>
              <p class="dark:text-gray-500 light:text-slate-500 text-sm max-w-xs leading-relaxed">
                {{ showArchived() ? 'Archived notes appear here.' : searchQuery() ? 'Try different keywords or clear the search.' : 'Capture ideas, summaries, formulas and more — all in one place.' }}
              </p>
            </div>
            @if (!showArchived() && !searchQuery()) {
              <button (click)="openEditor()"
                      class="flex items-center gap-2 px-6 py-3 dark:bg-gradient-to-r dark:from-yellow-500 dark:to-yellow-600 light:bg-gradient-to-r light:from-indigo-600 light:to-violet-600 dark:text-black text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:brightness-110 shadow-xl dark:shadow-yellow-500/40 light:shadow-indigo-500/40">
                <span class="material-icons">add</span>Create your first note
              </button>
            }
          </div>
        }

      }
    </main>
  </div>

  <!-- FAB — mobile only -->
  <button (click)="openEditor()" title="New note"
          class="fixed bottom-6 right-6 z-30 w-14 h-14 dark:bg-gradient-to-br dark:from-yellow-500 dark:to-yellow-600 light:bg-gradient-to-br light:from-indigo-600 light:to-violet-600 dark:text-black text-white rounded-2xl shadow-2xl dark:shadow-yellow-500/60 light:shadow-indigo-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 hover:brightness-110 active:scale-95 lg:hidden">
    <span class="material-icons text-2xl">add</span>
  </button>

</div>


<!-- ════════════════════════════════════════════════════════════════
     NOTE CARD TEMPLATE
     ════════════════════════════════════════════════════════════════ -->
<ng-template #noteCard let-note="note">
  <div (click)="openNote(note)"
       class="note-card group relative rounded-2xl border overflow-visible cursor-pointer transition-all duration-300"
       [class]="viewMode()==='list'
         ? 'flex items-stretch dark:bg-gray-900/60 dark:border-yellow-500/10 dark:hover:border-yellow-500/40 light:bg-white light:border-indigo-100 light:hover:border-indigo-300 light:hover:shadow-md light:shadow-indigo-100/60'
         : 'dark:bg-gradient-to-br dark:from-gray-900/80 dark:to-black dark:border-yellow-500/10 dark:hover:border-yellow-500/35 dark:hover:shadow-xl dark:hover:shadow-yellow-500/5 light:bg-white light:border-indigo-100 light:hover:border-indigo-200 light:hover:shadow-lg light:hover:shadow-indigo-100/60 hover:-translate-y-0.5'">

    <!-- Accent bar -->
    <div [style.background]="note.color" class="shrink-0 rounded-l-2xl"
         [class]="viewMode()==='list' ? 'w-1' : 'h-1 w-full rounded-t-2xl rounded-b-none'"></div>

    <div class="flex-1 min-w-0 p-4" [class]="viewMode()==='list' ? 'flex items-center gap-3' : ''">

      <!-- Header -->
      <div class="flex items-start justify-between gap-2" [class]="viewMode()==='list' ? '' : 'mb-2.5'">

        <!-- Category badge + indicators -->
        <div class="flex items-center gap-1.5 flex-wrap min-w-0" [class]="viewMode()==='list' ? 'w-36 shrink-0' : ''">
          <span class="category-badge inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold border"
                [style.background]="note.color + '18'"
                [style.color]="note.color"
                [style.border-color]="note.color + '30'">
            <span class="material-icons" style="font-size:12px">{{ getCategoryInfo(note.category).matIcon }}</span>
            <span class="hidden sm:inline">{{ getCategoryInfo(note.category).label }}</span>
          </span>
          @if (note.isPinned) {
            <span class="material-icons dark:text-yellow-500 light:text-amber-500" style="font-size:13px" title="Pinned">push_pin</span>
          }
          @if (note.hasPassword) {
            <span class="material-icons dark:text-gray-500 light:text-slate-400" style="font-size:13px" title="Protected">lock</span>
          }
        </div>

        <!-- Hover actions -->
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0"
             (click)="$event.stopPropagation()">
          <button (click)="togglePin(note, $event)"
                  class="card-action-btn"
                  [class]="note.isPinned ? 'dark:bg-yellow-500/20 dark:text-yellow-400 light:bg-amber-100 light:text-amber-600' : 'dark:text-gray-600 dark:hover:text-yellow-400 dark:hover:bg-yellow-500/15 light:text-slate-400 light:hover:text-amber-500 light:hover:bg-amber-50'"
                  title="Pin">
            <span class="material-icons" style="font-size:15px">push_pin</span>
          </button>
          <button (click)="toggleColorPicker(note._id, $event)"
                  class="card-action-btn dark:text-gray-600 dark:hover:text-yellow-400 dark:hover:bg-yellow-500/15 light:text-slate-400 light:hover:text-indigo-500 light:hover:bg-indigo-50"
                  title="Change color">
            <span class="material-icons" style="font-size:15px">palette</span>
          </button>
          <button (click)="toggleArchiveNote(note, $event)"
                  class="card-action-btn dark:text-gray-600 dark:hover:text-yellow-400 dark:hover:bg-yellow-500/15 light:text-slate-400 light:hover:text-indigo-500 light:hover:bg-indigo-50"
                  [title]="note.isArchived ? 'Unarchive' : 'Archive'">
            <span class="material-icons" style="font-size:15px">{{ note.isArchived ? 'unarchive' : 'archive' }}</span>
          </button>
          <button (click)="deleteNote(note, $event)"
                  class="card-action-btn dark:text-gray-600 dark:hover:text-red-400 dark:hover:bg-red-500/15 light:text-slate-400 light:hover:text-red-500 light:hover:bg-red-50"
                  title="Delete">
            <span class="material-icons" style="font-size:15px">delete_outline</span>
          </button>
        </div>
      </div>

      <!-- Color picker popup -->
      @if (showColorPicker() === note._id) {
        <div class="absolute top-10 right-2 z-50 dark:bg-[#111] dark:border-yellow-500/20 light:bg-white light:border-slate-200 border rounded-2xl p-3 shadow-2xl dark:shadow-black/60 light:shadow-slate-300/60 note-popup min-w-[160px]"
             (click)="$event.stopPropagation()">
          <p class="text-[10px] dark:text-gray-500 light:text-slate-400 font-black uppercase tracking-wider mb-2.5 px-1">Color</p>
          <div class="grid grid-cols-5 gap-2.5">
            @for (col of noteColors; track col) {
              <button (click)="pickColor(note, col, $event)"
                      class="w-7 h-7 rounded-full transition-all duration-200 hover:scale-125 hover:ring-2 hover:ring-offset-1 flex items-center justify-center shrink-0 ring-offset-transparent"
                      [style.background]="col"
                      [style.ring-color]="col">
                @if (note.color === col) {
                  <span class="material-icons text-white drop-shadow-md" style="font-size:13px;text-shadow:0 1px 3px rgba(0,0,0,0.5)">check</span>
                }
              </button>
            }
          </div>
        </div>
      }

      <!-- Title -->
      <h3 class="font-bold text-[15px] dark:text-white light:text-slate-800 leading-snug"
          [class]="viewMode()==='list' ? 'flex-1 min-w-0 line-clamp-1' : 'line-clamp-2 mb-2'">
        {{ note.title }}
      </h3>

      <!-- Preview (grid) -->
      @if (viewMode() !== 'list') {
        @if (!note.hasPassword) {
          <p class="text-[13px] dark:text-gray-500 light:text-slate-500 line-clamp-3 mb-3 leading-relaxed">{{ truncateHtml(note.content) }}</p>
        } @else {
          <p class="text-[13px] dark:text-yellow-600/60 light:text-indigo-400/70 italic mb-3 flex items-center gap-1">
            <span class="material-icons" style="font-size:13px">lock</span> Password protected
          </p>
        }

        <!-- Tags -->
        @if (note.tags.length) {
          <div class="flex flex-wrap gap-1 mb-3">
            @for (tag of note.tags.slice(0,3); track tag) {
              <span class="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 dark:bg-white/5 dark:text-gray-500 dark:border dark:border-white/8 light:bg-slate-100 light:text-slate-500 light:border light:border-slate-200 rounded-full">
                <span class="material-icons" style="font-size:9px">tag</span>{{ tag }}
              </span>
            }
            @if (note.tags.length > 3) {
              <span class="text-[11px] px-2 py-0.5 dark:bg-yellow-500/10 dark:text-yellow-500/60 light:bg-indigo-100 light:text-indigo-400 rounded-full font-bold">+{{ note.tags.length - 3 }}</span>
            }
          </div>
        }
      }

      <!-- Footer: subject + date -->
      <div class="flex items-center gap-2 mt-auto" [class]="viewMode()==='list' ? 'shrink-0 ml-2' : 'pt-1 border-t dark:border-white/5 light:border-slate-100'">
        @if (note.subject) {
          <span class="w-2 h-2 rounded-full shrink-0" [style.background]="note.subject.color"></span>
          <span class="text-[11px] dark:text-gray-600 light:text-slate-400 font-medium truncate max-w-[80px]">{{ note.subject.name }}</span>
        }
        <span class="ml-auto text-[11px] dark:text-gray-700 light:text-slate-400">{{ formatDate(note.updatedAt) }}</span>
      </div>
    </div>
  </div>
</ng-template>


<!-- ════════════════════════════════════════════════════════════════
     EDITOR MODAL
     ════════════════════════════════════════════════════════════════ -->
@if (showEditor()) {
  <div class="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 modal-overlay"
       (click)="closeEditor()">
    <div class="w-full sm:max-w-3xl max-h-[100dvh] sm:max-h-[92vh] dark:bg-[#0c0c0c] light:bg-white dark:border-yellow-500/15 light:border-indigo-200/80 border rounded-t-3xl sm:rounded-3xl shadow-2xl dark:shadow-yellow-500/8 light:shadow-2xl light:shadow-indigo-500/10 flex flex-col overflow-hidden modal-slide-up"
         (click)="$event.stopPropagation()">

      <!-- Color accent top -->
      <div class="h-[3px] shrink-0" [style.background]="'linear-gradient(90deg,' + editorColor + ',' + editorColor + '88)'"></div>

      <!-- Title row -->
      <div class="flex items-start gap-3 px-5 pt-4 pb-2 shrink-0">
        <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1" [style.background]="editorColor + '25'" [style.border]="'1px solid ' + editorColor + '40'">
          <span class="material-icons text-[16px]" [style.color]="editorColor">{{ getCategoryInfo(editorCategory).matIcon }}</span>
        </div>
        <input #titleRef type="text" placeholder="Note title…" [(ngModel)]="editorTitle" maxlength="300"
               class="flex-1 bg-transparent dark:text-white light:text-slate-800 dark:placeholder-gray-700 light:placeholder-slate-400 text-xl font-black outline-none pt-1" />
        <button (click)="closeEditor()"
                class="p-1.5 dark:bg-white/5 dark:hover:bg-white/10 dark:text-gray-500 dark:hover:text-white light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-400 light:hover:text-slate-700 rounded-xl transition-all duration-200 shrink-0 mt-0.5">
          <span class="material-icons text-[20px]">close</span>
        </button>
      </div>

      <!-- ═══ FORMATTING TOOLBAR ═══ -->
      <!-- (mousedown) preventDefault keeps contenteditable focused when clicking toolbar -->
      <div class="flex items-center flex-wrap gap-0.5 px-3 py-2 dark:border-y dark:border-yellow-500/8 light:border-y light:border-slate-200 dark:bg-black/50 light:bg-slate-50 shrink-0 select-none"
           (mousedown)="$event.preventDefault()">

        <!-- Headings -->
        <button (click)="insertHeading('h1')" class="toolbar-btn" title="Heading 1"
                [class.toolbar-btn-active]="isFormatActive('h1')">
          <span class="text-[10px] font-black tracking-tight">H1</span>
        </button>
        <button (click)="insertHeading('h2')" class="toolbar-btn" title="Heading 2"
                [class.toolbar-btn-active]="isFormatActive('h2')">
          <span class="text-[10px] font-black tracking-tight">H2</span>
        </button>
        <button (click)="insertHeading('p')" class="toolbar-btn" title="Normal text">
          <span class="material-icons" style="font-size:16px">segment</span>
        </button>
        <div class="toolbar-sep"></div>

        <!-- Text styles -->
        <button (click)="format('bold')" class="toolbar-btn" title="Bold (Ctrl+B)"
                [class.toolbar-btn-active]="isFormatActive('bold')">
          <span class="material-icons" style="font-size:17px">format_bold</span>
        </button>
        <button (click)="format('italic')" class="toolbar-btn" title="Italic (Ctrl+I)"
                [class.toolbar-btn-active]="isFormatActive('italic')">
          <span class="material-icons" style="font-size:17px">format_italic</span>
        </button>
        <button (click)="format('underline')" class="toolbar-btn" title="Underline (Ctrl+U)"
                [class.toolbar-btn-active]="isFormatActive('underline')">
          <span class="material-icons" style="font-size:17px">format_underlined</span>
        </button>
        <button (click)="format('strikeThrough')" class="toolbar-btn" title="Strikethrough"
                [class.toolbar-btn-active]="isFormatActive('strikeThrough')">
          <span class="material-icons" style="font-size:17px">format_strikethrough</span>
        </button>
        <div class="toolbar-sep"></div>

        <!-- Lists & blocks -->
        <button (click)="format('insertUnorderedList')" class="toolbar-btn" title="Bullet list"
                [class.toolbar-btn-active]="isFormatActive('insertUnorderedList')">
          <span class="material-icons" style="font-size:17px">format_list_bulleted</span>
        </button>
        <button (click)="format('insertOrderedList')" class="toolbar-btn" title="Numbered list"
                [class.toolbar-btn-active]="isFormatActive('insertOrderedList')">
          <span class="material-icons" style="font-size:17px">format_list_numbered</span>
        </button>
        <button (click)="format('formatBlock', 'blockquote')" class="toolbar-btn" title="Blockquote"
                [class.toolbar-btn-active]="isFormatActive('blockquote')">
          <span class="material-icons" style="font-size:17px">format_quote</span>
        </button>
        <button (click)="format('formatBlock', 'pre')" class="toolbar-btn" title="Code block"
                [class.toolbar-btn-active]="isFormatActive('pre')">
          <span class="material-icons" style="font-size:17px">code</span>
        </button>
        <div class="toolbar-sep"></div>

        <!-- Alignment -->
        <button (click)="format('justifyLeft')" class="toolbar-btn" title="Left"
                [class.toolbar-btn-active]="isFormatActive('justifyLeft')">
          <span class="material-icons" style="font-size:17px">format_align_left</span>
        </button>
        <button (click)="format('justifyCenter')" class="toolbar-btn" title="Center"
                [class.toolbar-btn-active]="isFormatActive('justifyCenter')">
          <span class="material-icons" style="font-size:17px">format_align_center</span>
        </button>
        <button (click)="format('justifyRight')" class="toolbar-btn" title="Right"
                [class.toolbar-btn-active]="isFormatActive('justifyRight')">
          <span class="material-icons" style="font-size:17px">format_align_right</span>
        </button>
        <div class="toolbar-sep"></div>

        <button (click)="format('removeFormat')" class="toolbar-btn" title="Clear formatting">
          <span class="material-icons" style="font-size:17px">format_clear</span>
        </button>

        <div class="flex-1"></div>
        <button (click)="format('undo')" class="toolbar-btn" title="Undo (Ctrl+Z)">
          <span class="material-icons" style="font-size:17px">undo</span>
        </button>
        <button (click)="format('redo')" class="toolbar-btn" title="Redo (Ctrl+Y)">
          <span class="material-icons" style="font-size:17px">redo</span>
        </button>
      </div>

      <!-- Editable area -->
      <div #editorRef
           class="notes-editor flex-1 min-h-[160px] max-h-[36vh] overflow-y-auto px-6 py-4 dark:text-gray-200 light:text-slate-700 text-[14px] leading-relaxed outline-none"
           contenteditable="true"
           [attr.data-placeholder]="'Start writing your note…'"
           spellcheck="true">
      </div>

      <!-- ═══ META PANEL ═══ -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3.5 dark:border-t dark:border-yellow-500/8 light:border-t light:border-slate-200 dark:bg-black/30 light:bg-slate-50/80 shrink-0">

        <!-- Category -->
        <div class="flex flex-col gap-1.5">
          <label class="meta-label"><span class="material-icons" style="font-size:11px">category</span>Category</label>
          <select [(ngModel)]="editorCategory"
                  class="text-[13px] dark:bg-gray-900/80 dark:border-yellow-500/20 dark:text-gray-300 light:bg-white light:border-indigo-200 light:text-slate-700 border rounded-lg px-2.5 py-1.5 outline-none transition-all dark:focus:border-yellow-500/50 light:focus:border-indigo-400 cursor-pointer">
            @for (cat of categories; track cat.id) {
              <option [value]="cat.id">{{ cat.label }}</option>
            }
          </select>
        </div>

        <!-- Color -->
        <div class="flex flex-col gap-1.5">
          <label class="meta-label"><span class="material-icons" style="font-size:11px">palette</span>Color</label>
          <div class="flex flex-wrap gap-1.5 items-center pt-0.5">
            @for (col of noteColors; track col) {
              <button (click)="editorColor = col"
                      class="flex-shrink-0 transition-all duration-150 hover:scale-125 flex items-center justify-center"
                      [style.background]="col"
                      [class]="editorColor === col ? 'w-5 h-5 rounded-full ring-2 ring-offset-1 dark:ring-offset-black light:ring-offset-white' : 'w-4 h-4 rounded-full'"
                      [style.ring-color]="col">
                @if (editorColor === col) {
                  <span class="material-icons text-white" style="font-size:10px;text-shadow:0 1px 2px rgba(0,0,0,0.5)">check</span>
                }
              </button>
            }
          </div>
        </div>

        <!-- Tags -->
        <div class="flex flex-col gap-1.5 col-span-2 sm:col-span-2">
          <label class="meta-label"><span class="material-icons" style="font-size:11px">tag</span>Tags</label>
          <div class="flex flex-wrap items-center gap-1 p-1.5 dark:bg-black/50 dark:border-yellow-500/15 light:bg-white light:border-indigo-200 border rounded-lg min-h-[34px] transition-all dark:focus-within:border-yellow-500/40 light:focus-within:border-indigo-300">
            @for (tag of editorTags; track tag) {
              <span class="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border dark:border-yellow-500/30 light:bg-indigo-100 light:text-indigo-700 light:border light:border-indigo-200 rounded-full font-semibold">
                {{ tag }}
                <button (click)="removeEditorTag(tag)" class="ml-0.5 opacity-60 hover:opacity-100 dark:hover:text-red-400 light:hover:text-red-500 transition-opacity">
                  <span class="material-icons" style="font-size:10px">close</span>
                </button>
              </span>
            }
            <input type="text" placeholder="Add tag…" [(ngModel)]="editorTagInput"
                   (keydown)="handleTagKeydown($event)" (blur)="addEditorTag()" maxlength="30"
                   class="flex-1 min-w-[60px] bg-transparent dark:text-gray-400 light:text-slate-700 dark:placeholder-gray-700 light:placeholder-slate-400 text-[12px] outline-none" />
          </div>
        </div>

      </div>

      <!-- Password row -->
      <div class="flex items-center gap-4 px-5 py-2.5 dark:border-t dark:border-yellow-500/8 light:border-t light:border-slate-200 dark:bg-black/20 light:bg-slate-50/40 shrink-0">
        <label class="meta-label"><span class="material-icons" style="font-size:11px">lock</span>Password protection</label>
        <label class="flex items-center gap-2 cursor-pointer select-none ml-auto">
          <div class="relative">
            <input type="checkbox" [(ngModel)]="editorHasPassword" class="sr-only peer" />
            <div class="w-9 h-5 rounded-full transition-colors duration-200 peer-checked:dark:bg-yellow-500 peer-checked:light:bg-indigo-600 dark:bg-gray-700/80 light:bg-slate-300"></div>
            <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 peer-checked:translate-x-4"></div>
          </div>
          <span class="text-[12px] dark:text-gray-500 light:text-slate-500">{{ editorHasPassword ? 'Enabled' : 'Disabled' }}</span>
        </label>
        @if (editorHasPassword) {
          <input type="password" placeholder="Set password…" [(ngModel)]="editorPassword" maxlength="128"
                 class="text-[12px] dark:bg-gray-900 dark:border-yellow-500/20 dark:text-gray-300 dark:placeholder-gray-700 light:bg-white light:border-indigo-200 light:text-slate-700 light:placeholder-slate-400 border rounded-lg px-3 py-1.5 outline-none w-40 dark:focus:border-yellow-500/50 light:focus:border-indigo-400" />
        }
      </div>

      <!-- Footer actions -->
      <div class="flex items-center justify-between px-5 py-3.5 shrink-0">
        <span class="text-[11px] dark:text-gray-700 light:text-slate-400">
          @if (editingNote()) { <span>Editing note</span> } @else { <span>New note</span> }
        </span>
        <div class="flex items-center gap-2.5">
          <button (click)="closeEditor()"
                  class="px-4 py-2 rounded-xl dark:bg-white/5 dark:hover:bg-white/8 dark:text-gray-500 dark:hover:text-white light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-500 light:hover:text-slate-700 text-sm font-semibold transition-all duration-200">
            Cancel
          </button>
          <button (click)="saveNote()" [disabled]="editorIsSaving"
                  class="flex items-center gap-2 px-6 py-2 dark:bg-gradient-to-r dark:from-yellow-500 dark:to-yellow-600 light:bg-gradient-to-r light:from-indigo-600 light:to-violet-600 dark:text-black text-white rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 hover:brightness-110 shadow-lg dark:shadow-yellow-500/40 light:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:brightness-100">
            @if (editorIsSaving) {
              <div class="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
              Saving…
            } @else {
              <span class="material-icons text-[16px]">{{ editingNote() ? 'save' : 'add_circle' }}</span>
              {{ editingNote() ? 'Save Changes' : 'Create Note' }}
            }
          </button>
        </div>
      </div>

    </div>
  </div>
}


<!-- ════════════════════════════════════════════════════════════════
     PASSWORD MODAL
     ════════════════════════════════════════════════════════════════ -->
@if (showPasswordModal()) {
  <div class="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-center justify-center p-4 modal-overlay"
       (click)="cancelPasswordModal()">
    <div class="w-full max-w-xs dark:bg-gradient-to-b dark:from-gray-900 dark:to-[#0c0c0c] dark:border-yellow-500/20 light:bg-white light:border-indigo-200 border rounded-3xl shadow-2xl dark:shadow-yellow-500/10 light:shadow-indigo-200/60 p-6 flex flex-col items-center gap-4 modal-slide-up"
         (click)="$event.stopPropagation()">

      <div class="w-16 h-16 dark:bg-yellow-500/10 dark:border-yellow-500/25 light:bg-indigo-50 light:border-indigo-200 border-2 rounded-2xl flex items-center justify-center">
        <span class="material-icons text-4xl dark:text-yellow-400 light:text-indigo-500">lock</span>
      </div>

      <div class="text-center">
        <h3 class="text-lg font-black dark:text-white light:text-slate-800">Protected Note</h3>
        <p class="text-[13px] dark:text-gray-500 light:text-slate-500 mt-1 leading-relaxed">
          Enter the password for<br>
          <span class="dark:text-yellow-400 light:text-indigo-600 font-bold">{{ pendingNote()?.title }}</span>
        </p>
      </div>

      <input type="password" placeholder="Enter password…" [(ngModel)]="passwordInput"
             (keydown.enter)="verifyPassword()" autofocus
             class="w-full px-4 py-2.5 dark:bg-white/5 dark:border-yellow-500/20 dark:text-white dark:placeholder-gray-600 light:bg-slate-50 light:border-indigo-200 light:text-slate-800 light:placeholder-slate-400 border rounded-xl text-sm outline-none transition-all duration-300 dark:focus:border-yellow-500/50 dark:focus:bg-white/8 light:focus:border-indigo-400" />

      @if (passwordError) {
        <div class="w-full flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-xl dark:text-red-400 light:text-red-500 text-[13px] font-medium">
          <span class="material-icons text-[16px] shrink-0">error_outline</span>{{ passwordError }}
        </div>
      }

      <div class="flex gap-2.5 w-full">
        <button (click)="cancelPasswordModal()"
                class="flex-1 py-2.5 rounded-xl dark:bg-white/5 dark:hover:bg-white/8 dark:text-gray-500 dark:hover:text-white light:bg-slate-100 light:hover:bg-slate-200 light:text-slate-500 font-semibold text-sm transition-all duration-200">
          Cancel
        </button>
        <button (click)="verifyPassword()" [disabled]="passwordVerifying || !passwordInput"
                class="flex-[2] flex items-center justify-center gap-2 py-2.5 dark:bg-gradient-to-r dark:from-yellow-500 dark:to-yellow-600 light:bg-gradient-to-r light:from-indigo-600 light:to-violet-600 dark:text-black text-white rounded-xl font-bold text-sm transition-all duration-300 hover:scale-105 hover:brightness-110 shadow-lg dark:shadow-yellow-500/30 light:shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
          @if (passwordVerifying) {
            <div class="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
          } @else {
            <span class="material-icons text-[17px]">lock_open</span>
          }
          Unlock
        </button>
      </div>

    </div>
  </div>
}
"""

with open(r'd:\chaine YOUTUBE\EduFocus\frontend\src\app\components\notes\notes.component.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done:", len(content), "chars")
