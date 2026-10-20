import { Pencil, Pin, Plus, Search, Settings, Trash2, Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { Button, NotebookGlyph, Seal } from "@/components/vellum/ui";
import { cn } from "@/lib/cn";
import { allTags, useNotes } from "@/lib/notes/store";
import { ConfirmDialog } from "@/components/vellum/overlays";

const COLLECTIONS = [
  { id: "all", label: "All notes" },
  { id: "pinned", label: "Pinned" },
  { id: "today", label: "Touched today" },
  { id: "trash", label: "Trash" },
] as const;

export function Sidebar() {
  const notebooks = useNotes((s) => s.notebooks);
  const notes = useNotes((s) => s.notes);
  const activeId = useNotes((s) => s.activeNotebookId);
  const activeTag = useNotes((s) => s.activeTag);
  const sound = useNotes((s) => s.settings.sound);
  const setCollection = useNotes((s) => s.setCollection);
  const setTag = useNotes((s) => s.setTag);
  const createNotebook = useNotes((s) => s.createNotebook);
  const renameNotebook = useNotes((s) => s.renameNotebook);
  const deleteNotebook = useNotes((s) => s.deleteNotebook);
  const updateSettings = useNotes((s) => s.updateSettings);
  const setSettingsOpen = useNotes((s) => s.setSettingsOpen);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const tags = allTags(notes);
  const kept = notes.filter((note) => !note.trashed).length;
  const pending = notebooks.find((notebook) => notebook.id === pendingDelete);

  return (
    <aside className="glass-pane flex min-h-0 flex-col text-ink">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Seal />
        <p className="text-sm font-medium tracking-tight">Vellum</p>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <nav className="flex flex-col gap-1" aria-label="Collections">
          {COLLECTIONS.map((item) => (
            <RailButton
              key={item.id}
              active={activeId === item.id && !activeTag}
              label={item.label}
              icon={item.id === "pinned" ? "pin" : item.id === "trash" ? "trash" : "search"}
              onClick={() => setCollection(item.id)}
            />
          ))}
        </nav>
        <div className="mt-6 mb-2 flex items-center justify-between px-2">
          <p className="text-xs font-medium text-muted">Notebooks</p>
          <Button
            variant="rail"
            size="icon"
            className="size-11"
            aria-label="New notebook"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        {adding && (
          <form
            className="mb-2 px-1"
            onSubmit={(event) => {
              event.preventDefault();
              const id = createNotebook(draft || "New notebook");
              if (id) {
                setDraft("");
                setAdding(false);
              }
            }}
          >
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => {
                if (!draft.trim()) setAdding(false);
              }}
              placeholder="Notebook name"
              className="h-11 w-full rounded-lg bg-paper/80 px-3 text-sm text-ink outline-none ring-1 ring-line placeholder:text-muted"
            />
          </form>
        )}
        <div className="flex flex-col gap-1">
          {notebooks.map((notebook) => {
            const count = notes.filter((note) => !note.trashed && note.notebookId === notebook.id).length;
            const active = activeId === notebook.id && !activeTag;
            const editing = editingId === notebook.id;
            return (
              <div key={notebook.id}>
                {editing ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      renameNotebook(notebook.id, editingName);
                      setEditingId(null);
                    }}
                  >
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      onBlur={() => {
                        renameNotebook(notebook.id, editingName);
                        setEditingId(null);
                      }}
                      aria-label={`Rename ${notebook.name}`}
                      className="h-11 w-full rounded-lg bg-paper/80 px-3 text-sm text-ink ring-1 ring-line"
                    />
                  </form>
                ) : (
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => setCollection(notebook.id)}
                      className={cn(
                        "flex h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors active:scale-[0.98]",
                        active ? "bg-paper-2 text-ink" : "text-muted hover:bg-paper-2/80 hover:text-ink",
                      )}
                    >
                      <NotebookGlyph icon={notebook.icon} className={active ? "text-wax" : undefined} />
                      <span className="min-w-0 flex-1 truncate">{notebook.name}</span>
                      {!active && <span className="text-xs text-muted">{count}</span>}
                    </button>
                    {active && (
                      <>
                        <button
                          type="button"
                          aria-label={`Rename ${notebook.name}`}
                          className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
                          onClick={() => {
                            setEditingId(notebook.id);
                            setEditingName(notebook.name);
                          }}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${notebook.name}`}
                          className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
                          onClick={() => setPendingDelete(notebook.id)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {tags.length > 0 && (
          <>
            <p className="mt-6 mb-2 px-2 text-xs font-medium text-muted">Tags</p>
            <div className="flex flex-col gap-1">
              {tags.map((tag) => (
                <button
                  key={tag.tag}
                  type="button"
                  onClick={() => setTag(tag.tag)}
                  className={cn(
                    "flex h-11 items-center justify-between rounded-lg px-3 text-sm active:scale-[0.98]",
                    activeTag === tag.tag ? "bg-paper-2 text-ink" : "text-muted hover:bg-paper-2/80 hover:text-ink",
                  )}
                >
                  <span className="truncate">#{tag.tag}</span>
                  <span className="text-xs text-muted">{tag.count}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="safe-bottom flex items-center justify-between gap-2 border-t border-line px-3 pt-3">
        <p className="px-2 text-xs text-muted">{kept} {kept === 1 ? "note" : "notes"}</p>
        <div className="flex">
          <Button
            variant="rail"
            size="icon"
            aria-label={sound ? "Mute sounds" : "Play sounds"}
            onClick={() => updateSettings({ sound: !sound })}
          >
            {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </Button>
          <Button variant="rail" size="icon" aria-label="Settings" onClick={() => setSettingsOpen(true)}>
            <Settings className="size-4" />
          </Button>
        </div>
      </div>
      <ConfirmDialog
        open={pending !== undefined && pendingDelete !== null}
        title={pending ? `Remove ${pending.name}?` : "Remove notebook?"}
        body="Notes inside move to another notebook. Nothing is deleted."
        confirmLabel="Remove"
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        onConfirm={() => {
          if (pendingDelete) deleteNotebook(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </aside>
  );
}

function RailButton({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: "pin" | "trash" | "search";
}) {
  const Icon = icon === "pin" ? Pin : icon === "trash" ? Trash2 : Search;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors active:scale-[0.98]",
        active ? "bg-paper-2 text-ink" : "text-muted hover:bg-paper-2/80 hover:text-ink",
      )}
    >
      <Icon className={cn("size-4", active && "text-wax")} strokeWidth={1.75} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
