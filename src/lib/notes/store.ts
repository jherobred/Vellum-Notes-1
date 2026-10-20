import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSeed } from "@/lib/notes/seed";
import {
  defaultSettings,
  sanitizeSettings,
  uid,
  type MobilePane,
  type Note,
  type NoteColor,
  type Notebook,
  type NotebookIcon,
  type Settings,
} from "@/lib/notes/types";
import { playCue, setSoundEnabled, setSoundVolume, type Cue } from "@/lib/sound";

export type LibraryFile = {
  version: number;
  exportedAt: number;
  notebooks: Notebook[];
  notes: Note[];
  settings?: Partial<Settings>;
};

type NotesState = {
  notebooks: Notebook[];
  notes: Note[];
  activeNotebookId: string;
  activeTag: string | null;
  activeNoteId: string | null;
  query: string;
  settings: Settings;
  mobilePane: MobilePane;
  paletteOpen: boolean;
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  findOpen: boolean;
  status: string;
  setQuery: (query: string) => void;
  setCollection: (id: string) => void;
  setTag: (tag: string | null) => void;
  setActiveNote: (id: string | null, opts?: { silent?: boolean }) => void;
  setMobilePane: (pane: MobilePane) => void;
  setPaletteOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setFindOpen: (open: boolean) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  createNote: (partial?: Partial<Pick<Note, "title" | "body" | "notebookId" | "tags">>) => string;
  updateNote: (id: string, patch: Partial<Pick<Note, "title" | "body" | "tags" | "pinned" | "color" | "notebookId">>) => void;
  togglePin: (id: string) => void;
  setColor: (id: string, color: NoteColor) => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;
  trashNote: (id: string) => void;
  restoreNote: (id: string) => void;
  deleteForever: (id: string) => void;
  emptyTrash: () => void;
  duplicateNote: (id: string) => string | null;
  createNotebook: (name?: string) => string | null;
  renameNotebook: (id: string, name: string) => void;
  deleteNotebook: (id: string) => void;
  openToday: () => string;
  importLibrary: (file: LibraryFile, mode: "merge" | "replace") => boolean;
  flash: (message: string) => void;
};

let statusTimer: ReturnType<typeof setTimeout> | undefined;

function cue(settings: Settings, name: Cue) {
  if (typeof window === "undefined") return;
  if (!settings.sound) return;
  playCue(name);
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, " ").slice(0, 24);
}

export function visibleNotes(state: {
  notes: Note[];
  notebooks: Notebook[];
  activeNotebookId: string;
  activeTag: string | null;
  query: string;
  settings: Settings;
}): Note[] {
  const q = state.query.trim().toLowerCase();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = start.getTime();
  let notes = state.notes.filter((note) => {
    if (state.activeNotebookId === "trash") return note.trashed;
    if (note.trashed) return false;
    if (state.activeNotebookId === "pinned" && !note.pinned) return false;
    if (state.activeNotebookId === "today" && note.updatedAt < today) return false;
    if (
      state.activeNotebookId !== "all" &&
      state.activeNotebookId !== "pinned" &&
      state.activeNotebookId !== "today" &&
      note.notebookId !== state.activeNotebookId
    ) {
      return false;
    }
    if (state.activeTag && !note.tags.some((tag) => tag.toLowerCase() === state.activeTag?.toLowerCase())) {
      return false;
    }
    return true;
  });
  if (q) {
    notes = notes.filter((note) => {
      const hay = `${note.title}\n${note.body}\n${note.tags.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }
  const sort = state.settings.sort;
  notes.sort((a, b) => {
    if (state.activeNotebookId !== "trash" && a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sort === "title") return a.title.localeCompare(b.title) || b.updatedAt - a.updatedAt;
    if (sort === "created") return b.createdAt - a.createdAt;
    return b.updatedAt - a.updatedAt;
  });
  return notes;
}

export function allTags(notes: Note[]): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const note of notes) {
    if (note.trashed) continue;
    for (const tag of note.tags) map.set(tag, (map.get(tag) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));
}

const ICONS: NotebookIcon[] = ["desk", "journal", "spark", "book"];

export const useNotes = create<NotesState>()(
  persist(
    (set, get) => {
      const flash = (message: string) => {
        if (statusTimer) clearTimeout(statusTimer);
        set({ status: message });
        statusTimer = setTimeout(() => set({ status: "" }), 2600);
      };

      const syncAudio = (settings: Settings) => {
        setSoundEnabled(settings.sound);
        setSoundVolume(settings.volume);
        if (typeof document !== "undefined") {
          document.documentElement.dataset.theme = settings.theme;
        }
      };

      return {
        notebooks: [],
        notes: [],
        activeNotebookId: "all",
        activeTag: null,
        activeNoteId: null,
        query: "",
        settings: defaultSettings,
        mobilePane: "browse",
        paletteOpen: false,
        settingsOpen: false,
        shortcutsOpen: false,
        findOpen: false,
        status: "",
        flash,
        setQuery: (query) => set({ query }),
        setCollection: (id) => set({ activeNotebookId: id, activeTag: null, mobilePane: "browse" }),
        setTag: (tag) =>
          set({
            activeTag: tag && get().activeTag === tag ? null : tag,
            activeNotebookId: "all",
            mobilePane: "browse",
          }),
        setActiveNote: (id, opts) => {
          const current = get().activeNoteId;
          set({ activeNoteId: id, mobilePane: id ? "write" : get().mobilePane });
          if (id && id !== current && !opts?.silent) cue(get().settings, "select");
        },
        setMobilePane: (pane) => set({ mobilePane: pane }),
        setPaletteOpen: (open) => {
          set({ paletteOpen: open, settingsOpen: open ? false : get().settingsOpen });
          if (open) cue(get().settings, "open");
        },
        setSettingsOpen: (open) => set({ settingsOpen: open, paletteOpen: open ? false : get().paletteOpen }),
        setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
        setFindOpen: (open) => set({ findOpen: open }),
        updateSettings: (patch) => {
          const prev = get().settings;
          const settings = sanitizeSettings({ ...prev, ...patch });
          set({ settings });
          if (typeof document !== "undefined") {
            document.documentElement.dataset.theme = settings.theme;
          }
          setSoundVolume(settings.volume);
          if (patch.sound !== undefined && patch.sound !== prev.sound) {
            if (settings.sound) {
              setSoundEnabled(true);
              playCue("on");
            } else {
              playCue("off");
              setSoundEnabled(false);
            }
          } else {
            setSoundEnabled(settings.sound);
            if (patch.focus !== undefined && patch.focus !== prev.focus && settings.sound) {
              playCue("focus");
            }
          }
        },
        createNote: (partial) => {
          const state = get();
          const notebookId =
            partial?.notebookId ||
            (state.notebooks.some((nb) => nb.id === state.activeNotebookId)
              ? state.activeNotebookId
              : state.notebooks[0]?.id);
          if (!notebookId) return "";
          const now = Date.now();
          const note: Note = {
            id: uid("note"),
            notebookId,
            title: partial?.title?.trim() ?? "",
            body: partial?.body ?? "",
            tags: partial?.tags ?? [],
            pinned: false,
            color: "none",
            trashed: false,
            createdAt: now,
            updatedAt: now,
          };
          set({
            notes: [note, ...state.notes],
            activeNoteId: note.id,
            mobilePane: "write",
            activeNotebookId:
              state.activeNotebookId === "trash" ? "all" : state.activeNotebookId,
          });
          cue(get().settings, "create");
          return note.id;
        },
        updateNote: (id, patch) => {
          set({
            notes: get().notes.map((note) =>
              note.id === id ? { ...note, ...patch, updatedAt: Date.now() } : note,
            ),
          });
        },
        togglePin: (id) => {
          const note = get().notes.find((item) => item.id === id);
          if (!note) return;
          get().updateNote(id, { pinned: !note.pinned });
          cue(get().settings, "select");
        },
        setColor: (id, color) => {
          get().updateNote(id, { color });
          cue(get().settings, "select");
        },
        addTag: (id, raw) => {
          const tag = normalizeTag(raw);
          if (!tag) return;
          const note = get().notes.find((item) => item.id === id);
          if (!note) return;
          if (note.tags.some((item) => item.toLowerCase() === tag.toLowerCase())) return;
          get().updateNote(id, { tags: [...note.tags, tag] });
        },
        removeTag: (id, tag) => {
          const note = get().notes.find((item) => item.id === id);
          if (!note) return;
          get().updateNote(id, {
            tags: note.tags.filter((item) => item.toLowerCase() !== tag.toLowerCase()),
          });
        },
        trashNote: (id) => {
          const state = get();
          const notes = state.notes.map((note) =>
            note.id === id ? { ...note, trashed: true, pinned: false } : note,
          );
          const remaining = visibleNotes({ ...state, notes, activeNotebookId: state.activeNotebookId === "trash" ? "all" : state.activeNotebookId });
          const next = state.activeNoteId === id ? (remaining[0]?.id ?? null) : state.activeNoteId;
          set({ notes, activeNoteId: next });
          cue(state.settings, "trash");
          flash("Moved to trash");
        },
        restoreNote: (id) => {
          set({
            notes: get().notes.map((note) => (note.id === id ? { ...note, trashed: false } : note)),
          });
          cue(get().settings, "restore");
          flash("Restored");
        },
        deleteForever: (id) => {
          const notes = get().notes.filter((note) => note.id !== id);
          set({
            notes,
            activeNoteId: get().activeNoteId === id ? null : get().activeNoteId,
          });
          cue(get().settings, "trash");
          flash("Deleted");
        },
        emptyTrash: () => {
          const count = get().notes.filter((note) => note.trashed).length;
          if (count === 0) return;
          set({
            notes: get().notes.filter((note) => !note.trashed),
            activeNoteId: get().notes.find((note) => note.id === get().activeNoteId && note.trashed)
              ? null
              : get().activeNoteId,
          });
          cue(get().settings, "trash");
          flash(count === 1 ? "Emptied 1 note" : `Emptied ${count} notes`);
        },
        duplicateNote: (id) => {
          const note = get().notes.find((item) => item.id === id);
          if (!note) return null;
          const now = Date.now();
          const copy: Note = {
            ...note,
            id: uid("note"),
            title: note.title.trim() ? `${note.title} copy` : "Untitled copy",
            pinned: false,
            trashed: false,
            createdAt: now,
            updatedAt: now,
          };
          set({ notes: [copy, ...get().notes], activeNoteId: copy.id, mobilePane: "write" });
          cue(get().settings, "create");
          flash("Duplicated");
          return copy.id;
        },
        createNotebook: (name) => {
          const label = (name ?? "New notebook").trim().slice(0, 40);
          if (!label) return null;
          const notebook: Notebook = {
            id: uid("nb"),
            name: label,
            icon: ICONS[get().notebooks.length % ICONS.length] ?? "book",
            createdAt: Date.now(),
          };
          set({ notebooks: [...get().notebooks, notebook], activeNotebookId: notebook.id, activeTag: null });
          cue(get().settings, "create");
          flash(`Created ${label}`);
          return notebook.id;
        },
        renameNotebook: (id, name) => {
          const label = name.trim().slice(0, 40);
          if (!label) return;
          set({
            notebooks: get().notebooks.map((notebook) =>
              notebook.id === id ? { ...notebook, name: label } : notebook,
            ),
          });
        },
        deleteNotebook: (id) => {
          const { notebooks, notes, settings } = get();
          if (notebooks.length <= 1) {
            cue(settings, "error");
            flash("Keep at least one notebook");
            return;
          }
          const fallback = notebooks.find((notebook) => notebook.id !== id);
          if (!fallback) return;
          set({
            notebooks: notebooks.filter((notebook) => notebook.id !== id),
            notes: notes.map((note) =>
              note.notebookId === id ? { ...note, notebookId: fallback.id } : note,
            ),
            activeNotebookId: get().activeNotebookId === id ? fallback.id : get().activeNotebookId,
          });
          cue(settings, "trash");
          flash("Notes moved to " + fallback.name);
        },
        openToday: () => {
          const journal = get().notebooks.find((notebook) => notebook.icon === "journal") ?? get().notebooks[0];
          if (!journal) return "";
          const title = new Intl.DateTimeFormat("en", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }).format(new Date());
          const existing = get().notes.find(
            (note) => !note.trashed && note.notebookId === journal.id && note.title === title,
          );
          if (existing) {
            get().setActiveNote(existing.id);
            return existing.id;
          }
          return get().createNote({
            notebookId: journal.id,
            title,
            body: `# ${title}\n\n`,
            tags: ["journal"],
          });
        },
        importLibrary: (file, mode) => {
          if (!file.notebooks?.length) {
            cue(get().settings, "error");
            flash("That file has no notebooks");
            return false;
          }
          const notebooks = file.notebooks.filter((notebook) => notebook.id && notebook.name);
          const known = new Set(notebooks.map((notebook) => notebook.id));
          const fallback = notebooks[0]?.id;
          if (!fallback) return false;
          const notes = (file.notes ?? []).filter((note) => note.id && typeof note.body === "string").map((note) => ({
            ...note,
            notebookId: known.has(note.notebookId) ? note.notebookId : fallback,
            tags: Array.isArray(note.tags) ? note.tags.map((tag) => normalizeTag(String(tag))).filter(Boolean) : [],
            pinned: note.pinned === true,
            trashed: note.trashed === true,
            color: note.color === "wax" || note.color === "brass" || note.color === "moss" ? note.color : "none",
            title: String(note.title ?? ""),
            body: String(note.body ?? ""),
            createdAt: Number(note.createdAt) || Date.now(),
            updatedAt: Number(note.updatedAt) || Date.now(),
          })) satisfies Note[];
          if (mode === "replace") {
            const settings = sanitizeSettings({ ...get().settings, ...file.settings, focus: false });
            set({
              notebooks,
              notes,
              settings,
              activeNotebookId: "all",
              activeTag: null,
              activeNoteId: notes.find((note) => !note.trashed)?.id ?? null,
            });
            syncAudio(settings);
          } else {
            const notebookMap = new Map(get().notebooks.map((notebook) => [notebook.id, notebook]));
            for (const notebook of notebooks) notebookMap.set(notebook.id, notebook);
            const noteMap = new Map(get().notes.map((note) => [note.id, note]));
            for (const note of notes) noteMap.set(note.id, note);
            set({
              notebooks: [...notebookMap.values()],
              notes: [...noteMap.values()],
            });
          }
          cue(get().settings, "restore");
          flash(mode === "replace" ? "Library replaced" : "Library merged");
          return true;
        },
      };
    },
    {
      name: "vellum-studio",
      skipHydration: true,
      partialize: (state) => ({
        notebooks: state.notebooks,
        notes: state.notes,
        activeNotebookId: state.activeNotebookId,
        activeTag: state.activeTag,
        activeNoteId: state.activeNoteId,
        settings: state.settings,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<NotesState>;
        return {
          ...current,
          ...saved,
          settings: sanitizeSettings(saved.settings),
          query: "",
          mobilePane: "browse",
          paletteOpen: false,
          settingsOpen: false,
          shortcutsOpen: false,
          findOpen: false,
          status: "",
        };
      },
    },
  ),
);

export async function bootNotes() {
  try {
    await useNotes.persist.rehydrate();
  } catch {
    // Keep the empty desk and seed below.
  }
  const state = useNotes.getState();
  if (state.notebooks.length === 0) {
    const seed = createSeed();
    useNotes.setState({
      notebooks: seed.notebooks,
      notes: seed.notes,
      activeNotebookId: "all",
      activeNoteId: seed.notes[0]?.id ?? null,
    });
  }
  const next = useNotes.getState();
  setSoundEnabled(next.settings.sound);
  setSoundVolume(next.settings.volume);
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = next.settings.theme;
  }
}
