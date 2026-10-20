import { formatDistanceToNow } from "date-fns";
import { useState, type ReactNode } from "react";
import { Pin, Plus, Search } from "lucide-react";
import { ConfirmDialog, useModMac } from "@/components/vellum/overlays";
import { Button, NotebookGlyph } from "@/components/vellum/ui";
import { cn } from "@/lib/cn";
import { useNotes, visibleNotes } from "@/lib/notes/store";
import { noteTitle, snippet } from "@/lib/notes/text";
import type { NoteColor, SortMode } from "@/lib/notes/types";

const SORTS: { id: SortMode; label: string }[] = [
  { id: "updated", label: "Recent" },
  { id: "created", label: "Created" },
  { id: "title", label: "A–Z" },
];

const DOT: Record<NoteColor, string> = {
  none: "bg-transparent",
  wax: "bg-wax",
  brass: "bg-brass",
  moss: "bg-moss",
};

export function NoteList({ wide }: { wide: boolean }) {
  const notebooks = useNotes((s) => s.notebooks);
  const notes = useNotes((s) => s.notes);
  const activeNotebookId = useNotes((s) => s.activeNotebookId);
  const activeTag = useNotes((s) => s.activeTag);
  const activeNoteId = useNotes((s) => s.activeNoteId);
  const query = useNotes((s) => s.query);
  const settings = useNotes((s) => s.settings);
  const setQuery = useNotes((s) => s.setQuery);
  const setCollection = useNotes((s) => s.setCollection);
  const setTag = useNotes((s) => s.setTag);
  const setActiveNote = useNotes((s) => s.setActiveNote);
  const createNote = useNotes((s) => s.createNote);
  const openToday = useNotes((s) => s.openToday);
  const updateSettings = useNotes((s) => s.updateSettings);
  const emptyTrash = useNotes((s) => s.emptyTrash);
  const togglePin = useNotes((s) => s.togglePin);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const mac = useModMac();
  const setPaletteOpen = useNotes((s) => s.setPaletteOpen);

  const list = visibleNotes({ notes, notebooks, activeNotebookId, activeTag, query, settings });
  const notebookName =
    notebooks.find((notebook) => notebook.id === activeNotebookId)?.name ??
    (activeNotebookId === "pinned"
      ? "Pinned"
      : activeNotebookId === "today"
        ? "Touched today"
        : activeNotebookId === "trash"
          ? "Trash"
          : "All notes");
  const heading = activeTag ? `#${activeTag}` : notebookName;
  const trashCount = notes.filter((note) => note.trashed).length;

  return (
    <section className="glass-pane flex min-h-0 min-w-0 flex-col text-ink">
      <div className="flex items-center gap-2 px-3 pt-4">
        <form className="relative min-w-0 flex-1" onSubmit={(event) => event.preventDefault()} role="search">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
            className="h-12 w-full bg-transparent pr-16 pl-10 text-base text-ink outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="absolute top-1/2 right-2 hidden h-7 -translate-y-1/2 items-center rounded-md bg-paper-2 px-2 text-xs text-muted lg:inline-flex"
          >
            {mac ? "⌘K" : "Ctrl K"}
          </button>
        </form>
        <Button variant="solid" size="icon" aria-label="New note" onClick={() => createNote()}>
          <Plus className="size-4" />
        </Button>
      </div>
      {!wide && (
        <div className="scroll-thin mt-3 flex gap-2 overflow-x-auto px-3">
          {[
            ["all", "All"],
            ["pinned", "Pinned"],
            ["today", "Today"],
            ["trash", "Trash"],
          ].map(([id, label]) => (
            <Chip
              key={id}
              active={activeNotebookId === id && !activeTag}
              onClick={() => setCollection(id ?? "all")}
            >
              {label}
            </Chip>
          ))}
          {notebooks.map((notebook) => (
            <Chip
              key={notebook.id}
              active={activeNotebookId === notebook.id && !activeTag}
              onClick={() => setCollection(notebook.id)}
            >
              <NotebookGlyph icon={notebook.icon} />
              {notebook.name}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
        <h1 className="min-w-0 truncate text-sm font-medium text-ink">{heading}</h1>
        <p className="shrink-0 text-xs text-muted">
          {list.length} {list.length === 1 ? "note" : "notes"}
        </p>
      </div>
      <div className="flex items-center gap-1 px-3 py-1" role="group" aria-label="Sort notes">
        <button
          type="button"
          onClick={() => openToday()}
          className="h-11 shrink-0 px-2 text-sm text-wax"
        >
          Today
        </button>
        {SORTS.map((sort) => (
          <button
            key={sort.id}
            type="button"
            onClick={() => updateSettings({ sort: sort.id })}
            className={cn(
              "h-11 rounded-md px-3 text-sm",
              settings.sort === sort.id ? "bg-paper-2 text-ink" : "text-muted hover:text-ink",
            )}
          >
            {sort.label}
          </button>
        ))}
        {activeNotebookId === "trash" && trashCount > 0 && (
          <button type="button" className="ml-auto h-11 px-3 text-sm text-wax" onClick={() => setConfirmEmpty(true)}>
            Empty
          </button>
        )}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {list.length === 0 ? (
          <div className="px-2 py-10 text-sm text-muted">
            {query.trim()
              ? "Nothing matches that search."
              : activeNotebookId === "trash"
                ? "Trash is empty."
                : "No notes here yet."}
          </div>
        ) : (
          <ul className="flex flex-col gap-1">
            {list.map((note) => {
              const active = note.id === activeNoteId;
              const when = formatDistanceToNow(note.updatedAt, { addSuffix: true });
              return (
                <li key={note.id} className="row-in">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveNote(note.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveNote(note.id);
                      }
                    }}
                    className={cn(
                      "relative w-full rounded-lg px-3 py-2 text-left transition-colors",
                      active ? "bg-paper-2" : "hover:bg-paper-2/70",
                    )}
                  >
                    <span className="flex items-start gap-2">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[note.color])} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-medium text-ink">{noteTitle(note)}</span>
                          {note.pinned && <Pin className="size-3 shrink-0 text-wax" aria-label="Pinned" />}
                        </span>
                        <span className="mt-1 block truncate text-sm text-muted">
                          {snippet(note.body) || "No words yet"}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-xs text-muted">
                          <span>{when}</span>
                          {note.tags.slice(0, 2).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              className="text-wax"
                              onClick={(event) => {
                                event.stopPropagation();
                                setTag(tag);
                              }}
                            >
                              #{tag}
                            </button>
                          ))}
                        </span>
                      </span>
                      <button
                        type="button"
                        aria-label={note.pinned ? "Unpin note" : "Pin note"}
                        className="size-11 shrink-0 text-muted hover:text-ink"
                        onClick={(event) => {
                          event.stopPropagation();
                          togglePin(note.id);
                        }}
                      >
                        <Pin className={cn("mx-auto size-4", note.pinned && "text-wax")} />
                      </button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <ConfirmDialog
        open={confirmEmpty}
        title="Empty the trash?"
        body="Every note in the trash will be deleted forever."
        confirmLabel="Empty trash"
        onOpenChange={setConfirmEmpty}
        onConfirm={() => {
          emptyTrash();
          setConfirmEmpty(false);
        }}
      />
    </section>
  );
}

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-3 text-sm active:scale-[0.98]",
        active ? "bg-wax text-on-wax" : "bg-paper-2 text-ink",
      )}
    >
      {children}
    </button>
  );
}
